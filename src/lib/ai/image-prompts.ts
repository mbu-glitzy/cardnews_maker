import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { requireUserApiKey } from "@/lib/ai/keys";
import { logTextUsage } from "@/lib/usage";
import { extractJson } from "@/lib/ai/_utils";

export const imagePromptBatchSchema = z.object({
  prompts: z
    .array(
      z.object({
        order: z.number().int().min(1),
        prompt: z.string().min(20).max(600),
      })
    )
    .min(1),
});

export type ImagePromptItem = z.infer<
  typeof imagePromptBatchSchema
>["prompts"][number];

const SYSTEM_PROMPT = `You are an art director designing background imagery for an Instagram cardnews series.
Generate ONE image prompt per card, used by an AI image generator (Nano Banana Pro).

CRITICAL RULES:
1. Prompts MUST be in English.
2. NEVER include any text, letters, words, or typography in the image. Text will be composited on top by code.
3. Each prompt = 50~100 words. Specific visuals (composition, palette, mood, style).
4. Maintain visual consistency across the series: same illustration style, same palette family, same lighting.
5. Aspect ratio: 1:1 square (1080x1080).
6. Avoid people's faces (unsafe identities). Use abstract shapes, objects, gradients, or stylized illustrations.
7. Reflect the card's role (hook, problem, solution, etc.) through visual mood — but keep coherent series style.
8. Background should leave clear space for headline+body to be readable when overlaid.

Output: single JSON only, no markdown.

{
  "prompts": [
    { "order": 1, "prompt": "..." },
    ...
  ]
}`;

export interface RunImagePromptsParams {
  userId: string;
  projectId: string;
  topic: string;
  tone: string;
  brandPrimary: string;
  brandSecondary: string;
  cards: Array<{
    order: number;
    role: string;
    headline: string;
    body: string;
  }>;
}

export async function runImagePrompts(
  params: RunImagePromptsParams
): Promise<ImagePromptItem[]> {
  const apiKey = await requireUserApiKey(params.userId, "anthropic");
  const client = new Anthropic({ apiKey });

  const cardsBlock = params.cards
    .map(
      (c) =>
        `[${c.order}] role=${c.role}\n   headline="${c.headline}"\n   body="${c.body}"`
    )
    .join("\n");

  const userPrompt = `Topic: ${params.topic}
Tone: ${params.tone}
Brand colors: primary=${params.brandPrimary}, secondary=${params.brandSecondary}

Cards:
${cardsBlock}

Generate ${params.cards.length} background image prompts, maintaining a consistent visual style across the series.`;

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
    operation: "image",
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cachedInputTokens: response.usage.cache_read_input_tokens ?? 0,
    metadata: { phase: "prompts" },
  });

  const textBlocks = response.content.filter(
    (b): b is Anthropic.Messages.TextBlock => b.type === "text"
  );
  if (textBlocks.length === 0) {
    throw new Error("이미지 프롬프트 응답에 텍스트가 없습니다.");
  }
  const lastText = textBlocks[textBlocks.length - 1].text;

  const json = extractJson(lastText);
  const parsed = imagePromptBatchSchema.safeParse(json);
  if (!parsed.success) {
    console.error("[image-prompts] 검증 실패", parsed.error.issues);
    throw new Error("이미지 프롬프트 형식이 올바르지 않습니다.");
  }

  return parsed.data.prompts.sort((a, b) => a.order - b.order);
}
