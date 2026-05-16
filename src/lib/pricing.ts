/**
 * AI 모델별 단가표 (2026-05 기준)
 *
 * 토큰 모델: USD per 1M tokens
 * 이미지 모델: USD per image (1024x1024 기준)
 */

export const TEXT_MODEL_PRICING = {
  "claude-opus-4-7": {
    label: "Claude Opus 4.7",
    inputPerMillion: 15.0,
    outputPerMillion: 75.0,
    cachedInputPerMillion: 1.5,
  },
  "claude-sonnet-4-6": {
    label: "Claude Sonnet 4.6",
    inputPerMillion: 3.0,
    outputPerMillion: 15.0,
    cachedInputPerMillion: 0.3,
  },
  "claude-haiku-4-5": {
    label: "Claude Haiku 4.5",
    inputPerMillion: 1.0,
    outputPerMillion: 5.0,
    cachedInputPerMillion: 0.1,
  },
} as const;

export type TextModelId = keyof typeof TEXT_MODEL_PRICING;

export const IMAGE_MODEL_PRICING = {
  "nano-banana-pro": {
    label: "Nano Banana Pro",
    perImage: 0.039,
    qualities: { default: 0.039 },
  },
  "gpt-image-2": {
    label: "GPT Image 2",
    perImage: 0.053,
    qualities: {
      low: 0.006,
      medium: 0.053,
      high: 0.211,
    },
  },
} as const;

export type ImageModelId = keyof typeof IMAGE_MODEL_PRICING;
export type ImageQuality = "low" | "medium" | "high" | "default";

export function calculateTextCost(
  model: TextModelId,
  inputTokens: number,
  outputTokens: number,
  cachedInputTokens = 0
): number {
  const p = TEXT_MODEL_PRICING[model];
  const regularInput = Math.max(0, inputTokens - cachedInputTokens);
  return (
    (regularInput * p.inputPerMillion) / 1_000_000 +
    (cachedInputTokens * p.cachedInputPerMillion) / 1_000_000 +
    (outputTokens * p.outputPerMillion) / 1_000_000
  );
}

export function calculateImageCost(
  model: ImageModelId,
  quality: ImageQuality = "default",
  count = 1
): number {
  const p = IMAGE_MODEL_PRICING[model];
  const unit =
    quality in p.qualities
      ? (p.qualities as Record<string, number>)[quality]
      : p.perImage;
  return unit * count;
}

export function formatUSD(amount: number): string {
  if (amount < 0.01) return `$${amount.toFixed(4)}`;
  if (amount < 1) return `$${amount.toFixed(3)}`;
  return `$${amount.toFixed(2)}`;
}
