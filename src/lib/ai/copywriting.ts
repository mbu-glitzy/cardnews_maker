import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { requireUserApiKey } from "@/lib/ai/keys";
import { logTextUsage } from "@/lib/usage";
import { extractJson } from "@/lib/ai/_utils";
import type { Plan } from "@/lib/ai/planning";

export const cardCopySchema = z.object({
  order: z.number().int().min(1),
  headline: z.string().min(1).max(50),
  body: z.string().min(1).max(200),
  cta: z.string().max(40).nullable().optional(),
});

export const copyBatchSchema = z.object({
  cards: z.array(cardCopySchema).min(1),
});

export type CardCopy = z.infer<typeof cardCopySchema>;

const SYSTEM_PROMPT = `당신은 한국 인스타그램 카드뉴스 카피라이터입니다.
브랜드 인스타 계정 운영을 위한 정보성·브랜딩 콘텐츠를 작성합니다 (광고/판매 유도 X).

원칙:
1. headline: 12~24자 권장. 강한 후킹, 구체적 숫자/단어 활용.
2. body: 60~140자. 2~3문장. 짧고 명료하게.
3. 톤(tone)을 일관되게 유지하며, 톤마다 어휘·문장 호흡·시점이 다르게 와야 한다.
4. 중간 카드 사이는 자연스러운 흐름을 만든다 (다음 카드에 대한 호기심).
5. 마지막 카드(role=cta)는 시리즈 전체의 핵심 메시지를 한 줄로 압축해 자체 완결시킨다.
   금지: "더 알아보기", "다음 편 기대해주세요", "저장해두세요", "팔로우/좋아요", "링크 클릭",
   "프로필을 확인하세요" 같은 외부 액션 유도 일체. 그 다음에 뭘 하라고 시키지 말 것.
   허용: 핵심 인사이트 재강조, 본문에서 다룬 메시지의 결론, 독자에게 남는 한 줄 통찰.
6. cta 필드는 항상 null (사용 안 함).

[톤별 스타일 가이드]
- informative (정보형): 비즈니스 톤. 숫자·근거 중심. 단정형 문장. 이모지 금지.
- issue (이슈/시사): 보도체에 가까운 객관 어조. "~로 나타났다", "~로 분석된다" 같은 보도 문장.
   감정 단어보다 사실 단어. 마지막 카드는 시사점·통찰 한 줄.
- emotional (감성형): 1인칭·2인칭 시점 자유롭게. 짧은 호흡의 서사. 공감 어휘 사용 가능.
   해법 제시보다 위로·연대·여운 중심. headline 도 질문형/도치형 허용.
- humorous (유머): 입말체, 살짝 비꼬는 톤도 OK. 다만 자조·조롱 금지.
   마지막 카드는 웃음 뒤 한 줄 통찰로 마무리.
- sophisticated (세련): 미니멀. 단어 수 줄임. 권위 있는 인용·관점 제시.
   감탄사·과한 후킹 금지.

응답: 단일 JSON. 마크다운/설명 금지.

{
  "cards": [
    { "order": 1, "headline": "...", "body": "...", "cta": null },
    ...
    { "order": N, "headline": "...", "body": "...", "cta": null }
  ]
}`;

export interface RunCopywritingParams {
  userId: string;
  projectId: string;
  topic: string;
  tone: string;
  plan: Plan;
  /**
   * 특정 order 만 재생성하려는 경우 지정. 비우면 전체 일괄 생성.
   */
  onlyOrders?: number[];
  /**
   * 다른 카드의 이미 작성된 카피 (재생성 시 컨텍스트로 전달).
   */
  existing?: CardCopy[];
}

export async function runCopywriting(
  params: RunCopywritingParams
): Promise<CardCopy[]> {
  const apiKey = await requireUserApiKey(params.userId, "anthropic");
  const client = new Anthropic({ apiKey });

  const outlineBlock = params.plan.card_outline
    .map(
      (c) =>
        `[${c.order}] role=${c.role} | summary=${c.summary}`
    )
    .join("\n");

  const existingBlock = (params.existing ?? [])
    .map(
      (c) =>
        `[${c.order}] headline="${c.headline}" / body="${c.body}"${
          c.cta ? ` / cta="${c.cta}"` : ""
        }`
    )
    .join("\n");

  const targetBlock = params.onlyOrders
    ? `다시 작성할 카드 번호: ${params.onlyOrders.join(", ")}`
    : `전체 카드(${params.plan.card_outline.length}장)를 작성하세요.`;

  const userPrompt = `토픽: ${params.topic}
톤: ${params.tone}
타겟: ${params.plan.target_persona}
핵심 메시지: ${params.plan.key_message}

카드 구성:
${outlineBlock}
${
  existingBlock
    ? `\n현재 작성된 카피 (재작성 시 톤·흐름 참고):\n${existingBlock}\n`
    : ""
}
${targetBlock}

JSON 으로 출력하세요. cards 배열의 각 항목은 위 카드 구성의 order 와 일치해야 합니다.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  await logTextUsage({
    userId: params.userId,
    projectId: params.projectId,
    model: "claude-sonnet-4-6",
    operation: "copy",
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cachedInputTokens: response.usage.cache_read_input_tokens ?? 0,
  });

  const textBlocks = response.content.filter(
    (b): b is Anthropic.Messages.TextBlock => b.type === "text"
  );
  if (textBlocks.length === 0) {
    throw new Error("카피 응답에 텍스트가 없습니다.");
  }
  const lastText = textBlocks[textBlocks.length - 1].text;

  const json = extractJson(lastText);
  const parsed = copyBatchSchema.safeParse(json);
  if (!parsed.success) {
    console.error("[copy] 스키마 검증 실패", parsed.error.issues);
    throw new Error("카피 결과 형식이 올바르지 않습니다. 다시 시도해주세요.");
  }

  return parsed.data.cards;
}
