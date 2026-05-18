import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { requireUserApiKey } from "@/lib/ai/keys";
import { logTextUsage } from "@/lib/usage";
import { extractJson } from "@/lib/ai/_utils";
import type { TextModelId } from "@/lib/pricing";

const RESEARCH_ALLOWED: TextModelId[] = ["claude-opus-4-7", "claude-sonnet-4-6"];

/**
 * 리서치 결과 JSON 스키마.
 * Claude 가 반환하는 구조화된 출력.
 */
export const researchSchema = z.object({
  summary: z.string(),
  facts: z
    .array(
      z.object({
        text: z.string(),
        source_ids: z.array(z.number().int()),
      })
    )
    .min(3),
  sources: z
    .array(
      z.object({
        id: z.number().int(),
        title: z.string(),
        url: z.string(),
        credibility: z.enum(["official", "news", "research", "blog", "etc"]),
      })
    )
    .min(2),
});

export type Research = z.infer<typeof researchSchema>;

const SYSTEM_PROMPT = `당신은 한국 콘텐츠 마케팅 에이전시의 시니어 리서처입니다.
주어진 토픽에 대해 웹에서 신뢰할 수 있는 정보를 찾아 카드뉴스 제작에 쓸 수 있는 형태로 정리합니다.

지침:
1. web_search 도구를 적극 활용하여 최신·공신력 있는 자료를 찾습니다.
2. 가능한 한 공식 기관(official), 주요 언론(news), 학술·리서치 보고서(research) 출처를 우선합니다.
3. 한국어 시장 컨텍스트가 토픽에 관련 있다면 우선 고려합니다.
4. 각 사실(fact)은 반드시 1개 이상의 출처(source)에 연결되어야 합니다.
5. 출처는 5~10개 사이로 최대한 다양하게.

응답 형식:
반드시 마지막에 다음 형태의 단일 JSON 객체만 출력합니다 (마크다운, 설명 등 추가 텍스트 없이):

{
  "summary": "토픽 전체 핵심 정리 (3~5문장)",
  "facts": [
    { "text": "구체적 사실 또는 통계 (한 문장)", "source_ids": [1, 2] },
    ...최소 5개
  ],
  "sources": [
    { "id": 1, "title": "출처 제목", "url": "https://...", "credibility": "official" },
    ...
  ]
}

facts 는 5~10개, sources 는 5~10개. JSON 외 어떠한 텍스트도 포함하지 마세요.`;

const WEB_SEARCH_TOOL: Anthropic.Messages.WebSearchTool20250305 = {
  type: "web_search_20250305",
  name: "web_search",
  max_uses: 6,
};

export interface RunResearchParams {
  userId: string;
  projectId: string;
  topic: string;
  tone: string;
  model?: TextModelId;
}

export async function runResearch(
  params: RunResearchParams
): Promise<Research> {
  const apiKey = await requireUserApiKey(params.userId, "anthropic");
  const client = new Anthropic({ apiKey });

  const model: TextModelId =
    params.model && RESEARCH_ALLOWED.includes(params.model)
      ? params.model
      : "claude-opus-4-7";

  const response = await client.messages.create({
    model,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    tools: [WEB_SEARCH_TOOL],
    messages: [
      {
        role: "user",
        content: `토픽: ${params.topic}\n톤: ${params.tone}\n\n위 토픽으로 카드뉴스에 쓸 리서치를 진행하고 JSON 형태로만 출력해주세요.`,
      },
    ],
  });

  // 사용량 로깅
  await logTextUsage({
    userId: params.userId,
    projectId: params.projectId,
    model,
    operation: "research",
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cachedInputTokens: response.usage.cache_read_input_tokens ?? 0,
    metadata: { topic: params.topic },
  });

  // 마지막 text 블록에서 JSON 추출
  const textBlocks = response.content.filter(
    (b): b is Anthropic.Messages.TextBlock => b.type === "text"
  );
  if (textBlocks.length === 0) {
    throw new Error("리서치 응답에 텍스트가 없습니다.");
  }
  const lastText = textBlocks[textBlocks.length - 1].text;

  const json = extractJson(lastText);
  const parsed = researchSchema.safeParse(json);
  if (!parsed.success) {
    console.error("[research] 스키마 검증 실패", parsed.error.issues);
    throw new Error(
      "리서치 결과 형식이 올바르지 않습니다. 다시 시도해주세요."
    );
  }
  return parsed.data;
}
