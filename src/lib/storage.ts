import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function uploadBase64ToBucket(params: {
  bucket: "card-images" | "rendered-cards" | "brand-logos";
  path: string;
  base64: string;
  contentType: string;
}): Promise<string> {
  const admin = createSupabaseAdminClient();
  const buffer = Buffer.from(params.base64, "base64");
  // Buffer 를 그대로 업로드하면 content-type 이 application/octet-stream 으로
  // 박힐 수 있어 외부 (Instagram 등) 가 이미지 형식 인식 못 함.
  // Blob 으로 감싸 MIME 타입을 명시적으로 지정.
  const blob = new Blob([buffer], { type: params.contentType });

  const { error } = await admin.storage
    .from(params.bucket)
    .upload(params.path, blob, {
      contentType: params.contentType,
      upsert: true,
    });
  if (error) {
    throw new Error(`Storage 업로드 실패 (${params.bucket}): ${error.message}`);
  }

  const { data } = admin.storage.from(params.bucket).getPublicUrl(params.path);
  return data.publicUrl;
}
