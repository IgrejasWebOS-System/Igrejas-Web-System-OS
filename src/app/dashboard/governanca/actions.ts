"use server";

import { createClient } from "@/utils/supabase/server";
import { getAuthContext, assertLevel } from "@/utils/supabase/auth-context";

// ── Reuniões ───────────────────────────────────────────────────
export async function listarReunioesAction() {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();
  const { data, error } = await sb.from("governance_meetings").select("*").eq("ministry_id", ctx.ministry_id).order("data", { ascending: false }).limit(50);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function criarReuniaoAction(formData: FormData) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const { error } = await sb.from("governance_meetings").insert({
    ministry_id:   ctx.ministry_id,
    tipo:          formData.get("tipo") as string,
    titulo:        formData.get("titulo") as string,
    data:          formData.get("data") as string,
    hora_inicio:   (formData.get("hora_inicio") as string) || null,
    local:         (formData.get("local") as string) || null,
    pauta:         (formData.get("pauta") as string) || null,
    created_by:    user?.id,
  });
  if (error) throw new Error(error.message);
}

// ── Atas ─────────────────────────────────────────────────────
export async function listarAtasAction(meeting_id?: string) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();
  let q = sb.from("governance_minutes").select("*, governance_meetings:meeting_id(titulo, data)").eq("ministry_id", ctx.ministry_id).order("created_at", { ascending: false });
  if (meeting_id) q = q.eq("meeting_id", meeting_id);
  const { data, error } = await q.limit(50);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function criarAtaAction(formData: FormData) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const { error } = await sb.from("governance_minutes").insert({
    ministry_id:  ctx.ministry_id,
    meeting_id:   formData.get("meeting_id") as string,
    numero_ata:   (formData.get("numero_ata") as string) || null,
    conteudo:     formData.get("conteudo") as string,
    presentes:    parseInt(formData.get("presentes") as string) || null,
    deliberacoes: [],
    created_by:   user?.id,
  });
  if (error) throw new Error(error.message);
}

export async function aprovarAtaAction(id: string) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 1);  // Somente Presidente+
  const sb = await createClient();
  const { error } = await sb.from("governance_minutes").update({ aprovada: true, aprovada_em: new Date().toISOString() }).eq("id", id).eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
}

// ── Mandatos ────────────────────────────────────────────────
export async function listarMandatosAction() {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();
  const { data, error } = await sb.from("governance_mandates").select("*, parties:party_id(full_name)").eq("ministry_id", ctx.ministry_id).order("inicio", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function criarMandatoAction(formData: FormData) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();
  const { error } = await sb.from("governance_mandates").insert({
    ministry_id: ctx.ministry_id,
    party_id:    formData.get("party_id") as string,
    cargo:       formData.get("cargo") as string,
    inicio:      formData.get("inicio") as string,
    fim:         (formData.get("fim") as string) || null,
    referencia:  (formData.get("referencia") as string) || null,
  });
  if (error) throw new Error(error.message);
}

// ── LGPD ───────────────────────────────────────────────────
export async function listarConsentimentosAction() {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();
  const { data, error } = await sb.from("lgpd_consents").select("*, parties:party_id(full_name)").eq("ministry_id", ctx.ministry_id).order("created_at", { ascending: false }).limit(200);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function revogarConsentimentoAction(id: string) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();
  const { error } = await sb.from("lgpd_consents").update({ consentiu: false, revogado_em: new Date().toISOString() }).eq("id", id).eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
}

// ── Audit Trail ─────────────────────────────────────────────
export async function listarAuditLogsAction(filtros?: { tabela?: string; limite?: number }) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();
  let q = sb.from("audit_logs").select("*").eq("ministry_id", ctx.ministry_id).order("created_at", { ascending: false });
  if (filtros?.tabela) q = q.eq("tabela", filtros.tabela);
  const { data, error } = await q.limit(filtros?.limite ?? 100);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function registrarAuditLogAction(acao: string, tabela?: string, registro_id?: string, detalhes?: Record<string, unknown>) {
  const ctx = await getAuthContext();
  if (!ctx) return;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  await sb.from("audit_logs").insert({
    ministry_id: ctx.ministry_id,
    user_id:     user?.id,
    acao, tabela, registro_id, detalhes,
  });
}
