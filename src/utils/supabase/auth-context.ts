/**
 * auth-context.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Fonte de verdade para autorização no servidor.
 *
 * ARQUITETURA DE SEGURANÇA:
 *   • level, ministry_id, unit_id  → lidos de user.app_metadata (gravado via
 *     service_role key, assinado pelo Supabase — NÃO manipulável pelo cliente)
 *   • ministry_name, slug, modules → lidos do cookie iw_context (apenas para
 *     apresentação; nunca usados em decisões de autorização)
 *
 * NUNCA usar o campo `level` do cookie iw_context para autorização.
 * SEMPRE usar AuthContext.level retornado por esta função.
 */

import { createClient } from "@/utils/supabase/server";
import { cookies }      from "next/headers";
import { redirect }     from "next/navigation";
import type { AdminLevel, ModuleKey, SessionContext } from "@/types";

// ── Tipo retornado por getAuthContext() ───────────────────────────────────────
export type AuthContext = {
  // ── Dados de autorização (origem: app_metadata — confiável) ──
  user_id:     string;
  ministry_id: string;
  unit_id:     string | null;
  level:       AdminLevel;
  // ── Sub-papel descritivo (origem: admin_roles) — apenas visual ──
  role_title:  string | null;
  // ── Dados de apresentação (origem: cookie — apenas UI) ────────
  ministry_name: string;
  ministry_slug: string;
  modules:       ModuleKey[];
};

// ── Função principal ──────────────────────────────────────────────────────────
export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient();

  // getUser() verifica o JWT no servidor (não usa cache local)
  // app_metadata é gravado apenas via service_role key → confiável
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const meta       = (user.app_metadata ?? {}) as Record<string, unknown>;
  const level      = meta.iw_level      as AdminLevel | undefined;
  const ministryId = meta.iw_ministry_id as string    | undefined;
  const unitId     = (meta.iw_unit_id   as string | null | undefined) ?? null;

  // Se o app_metadata ainda não foi populado (primeiro login sem contexto),
  // recusa a autenticação — usuário precisa selecionar contexto.
  if (level === undefined || !ministryId) return null;

  // Dados de apresentação do cookie (harmless — não controlam autorização)
  const cookieStore = await cookies();
  const raw = cookieStore.get("iw_context")?.value;
  const ctx: Partial<SessionContext> = raw ? (JSON.parse(raw) as SessionContext) : {};

  // role_title — sub-papel descritivo (secretario, tesoureiro, etc.)
  // Lido do banco para garantir dado fresco; falha silenciosa → null
  let roleTitle: string | null = null;
  try {
    const { data: roleRow } = await supabase
      .from("admin_roles")
      .select("role_title")
      .eq("user_id", user.id)
      .eq("ministry_id", ministryId)
      .eq("is_active", true)
      .maybeSingle();
    roleTitle = (roleRow as { role_title?: string | null } | null)?.role_title ?? null;
  } catch { /* silencioso */ }

  return {
    user_id:       user.id,
    ministry_id:   ministryId,
    unit_id:       unitId,
    level,
    role_title:    roleTitle,
    ministry_name: ctx.ministry_name ?? "",
    ministry_slug: ctx.ministry_slug ?? "",
    modules:       ctx.modules       ?? [],
  };
}

// ── Versão que redireciona para /login se não autenticado ────────────────────
// Use em Server Components (pages/layouts) em vez de getAuthContext() + guard manual
export async function requireAuthContext(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  return ctx;
}

// ── Guard de nível — lança se null ou insuficiente ───────────────────────────
export function assertLevel(
  ctx: AuthContext | null,
  maxLevel: AdminLevel,
  msg?: string,
): asserts ctx is AuthContext {
  if (!ctx) throw new Error("Sessão não encontrada. Faça login novamente.");
  if (ctx.level > maxLevel) {
    throw new Error(msg ?? `Nível insuficiente: requer ≤ N${maxLevel}, você é N${ctx.level}.`);
  }
}
