"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function disconnectInstagram(): Promise<{ ok: boolean }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  await supabase
    .from("instagram_accounts")
    .delete()
    .eq("user_id", user.id);

  revalidatePath("/settings");
  return { ok: true };
}
