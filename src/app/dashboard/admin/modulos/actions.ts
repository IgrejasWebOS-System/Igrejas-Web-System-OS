"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { SessionContext } from "@/types";

function assertCanManage(ctx: SessionContext) {
  if (ctx.level > 1) redirect("/dashboard");
}

export async function toggleModuloAction(
  module: string,
  is_active: boolean,
): Promise<{ error?: string }> {
  const cookieStore = await cookies();
  const raw = cookieStore.get("iw_context")?.value;
  if (!raw) redirect("/contexto");

  const ctx: SessionContext = JSON.parse(raw);
  assertCanManage(ctx);

  const supabase = await createClient();

  const { error } = await supabase
    .from("ministry_modules")
    .upsert(
      { ministry_id: ctx.ministry_id, module, is_active },
      { onConflict: "ministry_id,module" },
    );

  if (error) return { error: error.message };

  revalidatePath("/dashboard/admin/modulos");
  revalidatePath("/dashboard");
  return {};
}
