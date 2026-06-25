"use server";

import { createClient }                  from "@/utils/supabase/server";
import { createAdminClient }             from "@/utils/supabase/admin";
import { getAuthContext, assertLevel }   from "@/utils/supabase/auth-context";
import { revalidatePath }                from "next/cache";
import type { AdminLevel } from "@/types";

async function getCtx() {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Sessão não encontrada.");
  return ctx;
}

function assertCanManage(ctx: Awaited<ReturnType<typeof getCtx>>) {
  assertLevel(ctx, 1, "Sem permissão para gerenciar usuários.");
}

// ── TIPO retornado pela listagem ──────────────────────────────────────────────
export type UsuarioComRole = {
  role_id:    string;
  user_id:    string;
  email:      string;
  level:      AdminLevel;
  unit_id:    string | null;
  unit_name:  string | null;
  is_active:  boolean;
  created_at: string;
};

// ── LISTAR ────────────────────────────────────────────────────────────────────
export async function listarUsuariosAction(): Promise<UsuarioComRole[]> {
  const ctx = await getCtx();

  const supabase      = await createClient();
  const adminClient   = createAdminClient();

  // 1. Busca admin_roles do ministério (inclui unit name)
  const { data: roles, error } = await supabase
    .from("admin_roles")
    .select("id, user_id, level, unit_id, is_active, created_at, units(name)")
    .eq("ministry_id", ctx.ministry_id)
    .order("level", { ascending: true });

  if (error) throw new Error(error.message);
  if (!roles || roles.length === 0) return [];

  // 2. Busca e-mails via admin API (service_role)
  const { data: authData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const userMap = new Map(authData?.users?.map(u => [u.id, u.email ?? "—"]) ?? []);

  return roles.map(r => ({
    role_id:   r.id,
    user_id:   r.user_id,
    email:     userMap.get(r.user_id) ?? "—",
    level:     r.level as AdminLevel,
    unit_id:   r.unit_id,
    unit_name: (r.units as { name: string } | null)?.name ?? null,
    is_active: r.is_active,
    created_at: r.created_at,
  }));
}

// ── CONVIDAR ──────────────────────────────────────────────────────────────────
export async function convidarUsuarioAction(formData: FormData) {
  const ctx = await getCtx();
  assertCanManage(ctx);

  const email   = (formData.get("email") as string)?.trim().toLowerCase();
  const level   = parseInt(formData.get("level") as string, 10) as AdminLevel;
  const unit_id = formData.get("unit_id") as string | null;

  if (!email)          throw new Error("E-mail é obrigatório.");
  if (isNaN(level) || level < 1 || level > 4)
                       throw new Error("Nível de acesso inválido.");
  // N0 só pode existir direto no banco — não via convite
  if (ctx.level >= level)
                       throw new Error(`Você (N${ctx.level}) não pode criar usuário N${level}.`);

  const adminClient = createAdminClient();
  const supabase    = await createClient();

  // 1. Verifica se e-mail já tem usuário
  const { data: existingUsers } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email);

  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
    // Verifica se já tem role neste ministério
    const { data: existingRole } = await supabase
      .from("admin_roles")
      .select("id, is_active")
      .eq("user_id", userId)
      .eq("ministry_id", ctx.ministry_id)
      .maybeSingle();

    if (existingRole) {
      if (existingRole.is_active) throw new Error("Este usuário já tem acesso a este ministério.");
      // Reativa se estava inativo
      await supabase.from("admin_roles")
        .update({ level, unit_id: unit_id || null, is_active: true })
        .eq("id", existingRole.id);
      revalidatePath("/dashboard/admin/usuarios");
      return;
    }
  } else {
    // Envia convite por e-mail
    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/contexto`,
    });
    if (error) throw new Error(error.message);
    userId = data.user.id;
  }

  // 2. Cria admin_role
  const { error: roleError } = await supabase.from("admin_roles").insert({
    user_id:     userId,
    ministry_id: ctx.ministry_id,
    unit_id:     unit_id || null,
    level,
    invited_by:  (await (await createClient()).auth.getUser()).data.user?.id,
  });

  if (roleError) throw new Error(roleError.message);
  revalidatePath("/dashboard/admin/usuarios");
}

// ── ATUALIZAR ─────────────────────────────────────────────────────────────────
export async function atualizarUsuarioAction(roleId: string, formData: FormData) {
  const ctx = await getCtx();
  assertCanManage(ctx);

  const level   = parseInt(formData.get("level") as string, 10) as AdminLevel;
  const unit_id = formData.get("unit_id") as string | null;

  if (isNaN(level) || level < 1 || level > 4)
    throw new Error("Nível de acesso inválido.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("admin_roles")
    .update({ level, unit_id: unit_id || null })
    .eq("id", roleId)
    .eq("ministry_id", ctx.ministry_id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/admin/usuarios");
}

// ── REVOGAR ───────────────────────────────────────────────────────────────────
export async function revogarAcessoAction(roleId: string) {
  const ctx = await getCtx();
  assertCanManage(ctx);

  const supabase = await createClient();
  const { error } = await supabase
    .from("admin_roles")
    .update({ is_active: false })
    .eq("id", roleId)
    .eq("ministry_id", ctx.ministry_id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/admin/usuarios");
}

// ── REATIVAR ─────────────────────────────────────────────────────────────────
export async function reativarAcessoAction(roleId: string) {
  const ctx = await getCtx();
  assertCanManage(ctx);

  const supabase = await createClient();
  const { error } = await supabase
    .from("admin_roles")
    .update({ is_active: true })
    .eq("id", roleId)
    .eq("ministry_id", ctx.ministry_id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/admin/usuarios");
}
