import OpenAI from "openai";
import { requireUserApiKey } from "@/lib/ai/keys";
import { logImageUsage } from "@/lib/usage";
import type { ImageQuality } from "@/lib/pricing";
import type { AiOperation, Json } from "@/types/supabase";

/**
 * GPT Image 2 호출 (옵션 엔진).
 */

export interface GptImageCallParams {
  userId: string;
  projectId?: string;
  prompt: string;
  operation: AiOperation;
  quality?: Exclude<ImageQuality, "default">;
  size?: "1024x1024" | "1024x1536" | "1536x1024" | "auto";
  metadata?: Json;
}

export interface GptImageResult {
  imageBase64: string;
  mimeType: string;
}

export async function generateImageWithGptImage(
  params: GptImageCallParams
): Promise<GptImageResult> {
  const apiKey = await requireUserApiKey(params.userId, "openai");
  const client = new OpenAI({ apiKey });

  const quality = params.quality ?? "medium";

  const response = await client.images.generate({
    model: "gpt-image-2",
    prompt: params.prompt,
    n: 1,
    size: params.size ?? "1024x1024",
    quality,
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("GPT Image 2 응답에서 이미지 데이터를 찾을 수 없습니다.");
  }

  await logImageUsage({
    userId: params.userId,
    projectId: params.projectId,
    model: "gpt-image-2",
    operation: params.operation,
    imageCount: 1,
    quality,
    metadata: params.metadata,
  });

  return { imageBase64: b64, mimeType: "image/png" };
}
