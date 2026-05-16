"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function deleteProject(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/projects");
  revalidatePath("/");
  redirect("/projects");
}
