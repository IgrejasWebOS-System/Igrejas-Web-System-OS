"use server";

import { createClient }      from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { cookies }           from "next/headers";
import { redirect }          from "next/navigation";
import type { SessionContext, ModuleKey, AdminLevel } from "@/types";

export async function selecionarContextoAction(ministryId: string) {
  const supabase     = await createClient();
  const cookieStore  = await cookies();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Busca o admin_role do usuário neste ministério (ou role de Super-Master global)
  type RoleResult = { level: number; unit_id: string | null; ministries: { id: string; name: string; slug: string } | null };
  let resolvedRole: RoleResult | null = null;

  // 1. Tenta role específico deste ministério
  const { data: specificRole } = await supabase
    .from("admin_roles")
    .select("level, unit_id, ministries(id, name, slug)")
    .eq("user_id", user.id)
    .eq("ministry_id", ministryId)
    .eq("is_active", true)
    .maybeSingle();

  if (specificRole) {
    resolvedRole = specificRole as unknown as RoleResult;
  } else {
    // 2. Tenta Super-Master (ministry_id IS NULL)
    const { data: superRole } = await supabase
      .from("admin_roles")
      .select("level, unit_id")
      .eq("user_id", user.id)
      .is("ministry_id", null)
      .eq("level", 0)
      .eq("is_active", true)
      .maybeSingle();

    if (superRole) {
      const { data: ministryData } = await supabase
        .from("ministries")
        .select("id, name, slug")
        .eq("id", ministryId)
        .single();

      resolvedRole = { level: 0, unit_id: null, ministries: ministryData ?? null };
    }
  }

  if (!resolvedRole) redirect("/contexto");

  // Busca os módulos ativos do ministério
  const { data: modulesData } = await supabase
    .from("ministry_modules")
    .select("module")
    .eq("ministry_id", ministryId)
    .eq("is_active", true);

  const modules = (modulesData ?? []).map(m => m.module as ModuleKey);

  const ministry = resolvedRole!.ministries;

  const contexto: SessionContext = {
    ministry_id:   ministryId,
    ministry_name: ministry?.name ?? "",
    ministry_slug: ministry?.slug ?? "",
    unit_id:       resolvedRole!.unit_id ?? null,
    level:         resolvedRole!.level as 0 | 1 | 2 | 3 | 4,
    modules,
  };

  // ── SEC-1: Gravar claims de autorização em app_metadata via service_role ──
  // app_metadata é assinado pelo Supabase — NÃO pode ser falsificado pelo cliente.
  // Estes campos tornam-se a fonte de verdade para autorização em todos os Server Actions.
  const adminClient = createAdminClient();
  await adminClient.auth.admin.updateUserById(user.id, {
    app_metadata: {
      iw_level:       resolvedRole!.level as AdminLevel,
      iw_ministry_id: ministryId,
      iw_unit_id:     resolvedRole!.unit_id ?? null,
    },
  });

  // Força refresh do JWT para que o novo app_metadata seja incluído no token
  // imediatamente. Sem isso, getAuthContext() leria o token antigo (sem iw_level)
  // e retornaria null em todos os Server Actions até o token expirar naturalmente.
  await supabase.auth.refreshSession();

  // Cookie iw_context: apenas dados de APRESENTAÇÃO (nome, slug, módulos).
  // level/ministry_id/unit_id do cookie são ignorados em decisões de autorização.
  cookieStore.set("iw_context", JSON.stringify(contexto), {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    maxAge:   60 * 60 * 24 * 30,
    path:     "/",
    sameSite: "lax",
  });

  redirect("/dashboard");
}
