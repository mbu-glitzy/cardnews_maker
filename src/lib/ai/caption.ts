import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { requireUserApiKey } from "@/lib/ai/keys";
import { logTextUsage } from "@/lib/usage";
import { extractJson } from "@/lib/ai/_utils";

export const captionSchema = z.object({
  caption: z.string().min(10).max(2000),
  hashtags: z.array(z.string().min(1).max(30)).min(5).max(30),
});

export type CaptionResult = z.infer<typeof captionSchema>;

const SYSTEM_PROMPT = `당신은 한국 인스타그램 콘텐츠 카피라이터입니다.
카드뉴스 시리즈에 어울리는 인스타 포스트 본문과 해시태그를 작성합니다.

caption 작성 규칙:
- 첫 줄: 강한 후킹 (질문, 통계, 도발)
- 본문: 4~6줄, 짧고 명료. 줄바꿈으로 가독성 확보
- 마지막: CTA + 저장 유도
- 한글 위주, 이모지 0~2개만

hashtags 규칙:
- 한글 5~10개 + 영어 5~10개
- 토픽 관련 + 브랜드 카테고리 + 트렌드성 키워드 혼합
- # 기호 제외하고 단어만

응답: JSON만.
{
  "caption": "...",
  "hashtags": ["키워드1", "키워드2", ...]
}`;

export interface RunCaptionParams {
  userId: string;
  projectId: string;
  topic: string;
  tone: string;
  keyMessage: string;
  cards: Array<{ headline: string; body: string }>;
}

export async function runCaption(
  params: RunCaptionParams
): Promise<CaptionResult> {
  const apiKey = await requireUserApiKey(params.userId, "anthropic");
  const client = new Anthropic({ apiKey });

  const cardsBlock = params.cards
    .map((c, i) => `[${i + 1}] ${c.headline}\n${c.body}`)
    .join("\n\n");

  const userPrompt = `토픽: ${params.topic}
톤: ${params.tone}
핵심 메시지: ${params.keyMessage}

카드 내용:
${cardsBlock}

위 시리즈로 인스타 캡션과 해시태그를 작성하세요.`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  await logTextUsage({
    userId: params.userId,
    projectId: params.projectId,
    model: "claude-haiku-4-5",
    operation: "metadata",
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cachedInputTokens: response.usage.cache_read_input_tokens ?? 0,
  });

  const textBlocks = response.content.filter(
    (b): b is Anthropic.Messages.TextBlock => b.type === "text"
  );
  if (textBlocks.length === 0) {
    throw new Error("캡션 응답에 텍스트가 없습니다.");
  }
  const lastText = textBlocks[textBlocks.length - 1].text;

  const json = extractJson(lastText);
  const parsed = captionSchema.safeParse(json);
  if (!parsed.success) {
    console.error("[caption] 검증 실패", parsed.error.issues);
    throw new Error("캡션 형식이 올바르지 않습니다.");
  }
  return parsed.data;
}
