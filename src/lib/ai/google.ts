import { GoogleGenAI } from "@google/genai";
import { requireUserApiKey } from "@/lib/ai/keys";
import { logImageUsage } from "@/lib/usage";
import type { AiOperation, Json } from "@/types/supabase";

/**
 * Nano Banana Pro (Gemini 2.5 Flash Image Pro) 호출.
 *
 * 참고:
 *   - 모델명은 향후 변경 가능성 있음. 환경변수로 오버라이드 가능하게 둠.
 *   - 응답: base64 인코딩된 PNG 데이터.
 */

const DEFAULT_MODEL =
  process.env.GOOGLE_IMAGE_MODEL ?? "gemini-2.5-flash-image";

export interface NanoBananaCallParams {
  userId: string;
  projectId?: string;
  prompt: string;
  operation: AiOperation;
  referenceImages?: Array<{ mimeType: string; data: string }>;
  metadata?: Json;
}

export interface NanoBananaResult {
  imageBase64: string;
  mimeType: string;
}

export async function generateImageWithNanoBanana(
  params: NanoBananaCallParams
): Promise<NanoBananaResult> {
  const apiKey = await requireUserApiKey(params.userId, "google");
  const client = new GoogleGenAI({ apiKey });

  const parts: Array<
    { text: string } | { inlineData: { mimeType: string; data: string } }
  > = [{ text: params.prompt }];

  for (const ref of params.referenceImages ?? []) {
    parts.push({ inlineData: { mimeType: ref.mimeType, data: ref.data } });
  }

  const response = await client.models.generateContent({
    model: DEFAULT_MODEL,
    contents: [{ role: "user", parts }],
    config: {
      responseModalities: ["IMAGE"],
    },
  });

  const candidate = response.candidates?.[0];
  const imagePart = candidate?.content?.parts?.find(
    (p): p is { inlineData: { mimeType: string; data: string } } =>
      "inlineData" in p && !!p.inlineData
  );

  if (!imagePart) {
    const firstText = candidate?.content?.parts?.find(
      (p): p is { text: string } => "text" in p && typeof p.text === "string"
    );
    const detail = firstText?.text
      ? ` (모델 응답: ${firstText.text.slice(0, 200)})`
      : ` (finishReason: ${candidate?.finishReason ?? "unknown"})`;
    throw new Error(
      `Nano Banana Pro 응답에서 이미지 데이터를 찾을 수 없습니다.${detail}`
    );
  }

  await logImageUsage({
    userId: params.userId,
    projectId: params.projectId,
    model: "nano-banana-pro",
    operation: params.operation,
    imageCount: 1,
    quality: "default",
    metadata: params.metadata,
  });

  return {
    imageBase64: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType,
  };
}
