import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { requireUserApiKey } from "@/lib/ai/keys";
import { logTextUsage } from "@/lib/usage";
import { extractJson } from "@/lib/ai/_utils";
import type { Research } from "@/lib/ai/research";
import type { TextModelId } from "@/lib/pricing";

const PLANNING_ALLOWED: TextModelId[] = ["claude-opus-4-7", "claude-sonnet-4-6"];

function resolvePlanningModel(model?: TextModelId): TextModelId {
  return model && PLANNING_ALLOWED.includes(model) ? model : "claude-opus-4-7";
}

export const cardRoleEnum = z.enum([
  "hook",
  "problem",
  "solution",
  "proof",
  "cta",
  "detail",
  "cover",
]);

export const planSchema = z.object({
  target_persona: z.string().min(5),
  key_message: z.string().min(5),
  card_outline: z
    .array(
      z.object({
        order: z.number().int().min(1),
        role: cardRoleEnum,
        summary: z.string().min(5),
      })
    )
    .min(5)
    .max(8),
});

export type Plan = z.infer<typeof planSchema>;

const SYSTEM_PROMPT = `당신은 한국 콘텐츠 마케팅 에이전시의 시니어 기획자입니다.
주어진 토픽·톤·리서치를 바탕으로 인스타그램 카드뉴스 N장의 구성을 설계합니다.

원칙:
1. 첫 카드는 강한 후킹 — 호기심을 자극하거나 문제를 직격하는 hook 또는 cover
2. 중간 카드는 problem → solution → proof 흐름을 권장
3. 마지막 카드(role=cta)는 시리즈 전체의 핵심 메시지를 한 줄로 압축해 시리즈를 완결시킨다.
   다음 콘텐츠 예고, 저장·좋아요·팔로우·링크 클릭 유도 같은 외부 액션 유도는 절대 금지.
   카드뉴스 한 세트가 그 안에서 자체 완결되도록 마무리한다.
4. card_count 가 6 이상이면 detail 카드를 1~2장 삽입하여 깊이 추가 가능
5. 각 카드는 한 가지 명확한 메시지에 집중

응답: 마지막에 단일 JSON 객체만 출력 (마크다운/설명 없이).

{
  "target_persona": "타겟 페르소나 (1~2문장, 구체적)",
  "key_message": "전체 시리즈의 한 줄 핵심 메시지",
  "card_outline": [
    { "order": 1, "role": "hook", "summary": "이 카드에서 무엇을 전달할지 (1~2문장)" },
    ...
  ]
}

card_outline 의 길이는 정확히 card_count 와 같아야 하며, order 는 1부터 시작합니다.`;

export interface RunPlanningParams {
  userId: string;
  projectId: string;
  topic: string;
  tone: string;
  cardCount: number;
  research: Research;
  model?: TextModelId;
}

export async function runPlanning(params: RunPlanningParams): Promise<Plan> {
  const apiKey = await requireUserApiKey(params.userId, "anthropic");
  const client = new Anthropic({ apiKey });
  const model = resolvePlanningModel(params.model);

  const factsBlock = params.research.facts
    .map((f, i) => `${i + 1}. ${f.text}`)
    .join("\n");

  const userPrompt = `토픽: ${params.topic}
톤: ${params.tone}
카드 수: ${params.cardCount}

리서치 요약:
${params.research.summary}

핵심 사실:
${factsBlock}

위 정보로 카드뉴스 ${params.cardCount}장 기획안을 JSON 으로 출력해주세요.`;

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  await logTextUsage({
    userId: params.userId,
    projectId: params.projectId,
    model,
    operation: "plan",
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cachedInputTokens: response.usage.cache_read_input_tokens ?? 0,
  });

  const textBlocks = response.content.filter(
    (b): b is Anthropic.Messages.TextBlock => b.type === "text"
  );
  if (textBlocks.length === 0) {
    throw new Error("기획 응답에 텍스트가 없습니다.");
  }
  const lastText = textBlocks[textBlocks.length - 1].text;

  const json = extractJson(lastText);
  const parsed = planSchema.safeParse(json);
  if (!parsed.success) {
    console.error("[planning] 스키마 검증 실패", parsed.error.issues);
    throw new Error(
      "기획 결과 형식이 올바르지 않습니다. 다시 시도해주세요."
    );
  }

  // 카드 수 일치 + order 검증
  if (parsed.data.card_outline.length !== params.cardCount) {
    throw new Error(
      `카드 수가 일치하지 않습니다. (요청 ${params.cardCount}, 응답 ${parsed.data.card_outline.length})`
    );
  }
  const sorted = [...parsed.data.card_outline].sort((a, b) => a.order - b.order);
  return { ...parsed.data, card_outline: sorted };
}

/**
 * 특정 카드 1장의 outline 만 다시 생성.
 * 전체 흐름을 컨텍스트로 전달하여 자연스러운 대체안 생성.
 */
const singleOutlineSchema = z.object({
  card: z.object({
    order: z.number().int().min(1),
    role: cardRoleEnum,
    summary: z.string().min(5),
  }),
});

export interface RegenerateOneOutlineParams {
  userId: string;
  projectId: string;
  topic: string;
  tone: string;
  research: Research;
  plan: Plan;
  targetOrder: number;
  model?: TextModelId;
}

export async function runRegenerateCardOutline(
  params: RegenerateOneOutlineParams
): Promise<Plan["card_outline"][number]> {
  const apiKey = await requireUserApiKey(params.userId, "anthropic");
  const client = new Anthropic({ apiKey });
  const model = resolvePlanningModel(params.model);

  const outlineBlock = params.plan.card_outline
    .map(
      (c) =>
        `[${c.order}] role=${c.role}${
          c.order === params.targetOrder ? " (← 다시 작성할 카드)" : ""
        }\n   summary=${c.summary}`
    )
    .join("\n");

  const userPrompt = `토픽: ${params.topic}
톤: ${params.tone}

타겟 페르소나: ${params.plan.target_persona}
핵심 메시지: ${params.plan.key_message}

리서치 요약:
${params.research.summary}

전체 카드 구성:
${outlineBlock}

위 시리즈에서 ${params.targetOrder}번 카드만 다른 각도로 다시 작성하세요.
- 전체 흐름 유지
- 다른 카드와 메시지 중복 회피
- 같은 role/order 유지

응답: JSON 만.
{ "card": { "order": ${params.targetOrder}, "role": "...", "summary": "..." } }`;

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  await logTextUsage({
    userId: params.userId,
    projectId: params.projectId,
    model,
    operation: "plan",
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cachedInputTokens: response.usage.cache_read_input_tokens ?? 0,
    metadata: { regenerate_order: params.targetOrder },
  });

  const textBlocks = response.content.filter(
    (b): b is Anthropic.Messages.TextBlock => b.type === "text"
  );
  if (textBlocks.length === 0) {
    throw new Error("기획 응답에 텍스트가 없습니다.");
  }
  const lastText = textBlocks[textBlocks.length - 1].text;
  const json = extractJson(lastText);
  const parsed = singleOutlineSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("카드 outline 응답 형식이 올바르지 않습니다.");
  }
  if (parsed.data.card.order !== params.targetOrder) {
    // 모델이 order 를 잘못 응답한 경우 강제 보정
    return { ...parsed.data.card, order: params.targetOrder };
  }
  return parsed.data.card;
}
