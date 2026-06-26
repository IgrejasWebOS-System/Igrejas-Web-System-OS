"use server";

import { createClient } from "@/utils/supabase/server";
import { getAuthContext, assertLevel } from "@/utils/supabase/auth-context";

import { AREAS } from "./constants";

// ── Voluntários ───────────────────────────────────────────────
export async function listarVoluntariosAction() {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();
  const { data, error } = await sb
    .from("volunteer_profiles")
    .select("*, parties:party_id(full_name, telefone, foto_url)")
    .eq("ministry_id", ctx.ministry_id)
    .eq("ativo", true)
    .order("created_at");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function cadastrarVoluntarioAction(party_id: string, areas: string[], disponibilidade: string, observacoes: string) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();
  const { error } = await sb.from("volunteer_profiles").upsert({
    ministry_id: ctx.ministry_id, party_id, areas, disponibilidade, observacoes, ativo: true,
  }, { onConflict: "ministry_id,party_id" });
  if (error) throw new Error(error.message);
}

export async function desativarVoluntarioAction(id: string) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();
  const { error } = await sb.from("volunteer_profiles").update({ ativo: false }).eq("id", id).eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
}

// ── Times ─────────────────────────────────────────────────────
export async function listarTimesAction() {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();
  const { data, error } = await sb
    .from("ministry_teams")
    .select("*, parties:lider_party_id(full_name)")
    .eq("ministry_id", ctx.ministry_id)
    .order("nome");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function criarTimeAction(formData: FormData) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();
  const { error } = await sb.from("ministry_teams").insert({
    ministry_id: ctx.ministry_id,
    nome: formData.get("nome") as string,
    area: formData.get("area") as string,
    descricao: formData.get("descricao") as string || null,
    lider_party_id: (formData.get("lider_party_id") as string) || null,
  });
  if (error) throw new Error(error.message);
}

// ── Escalas ───────────────────────────────────────────────────
export async function listarEscalasAction(team_id?: string) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();
  let q = sb
    .from("service_schedules")
    .select("*, ministry_teams:team_id(nome, area), schedule_confirmations(id, status, volunteer_id)")
    .eq("ministry_id", ctx.ministry_id)
    .gte("data", new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10))
    .order("data");
  if (team_id) q = q.eq("team_id", team_id);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function criarEscalaAction(formData: FormData) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const { data: esc, error } = await sb.from("service_schedules").insert({
    ministry_id: ctx.ministry_id,
    team_id: formData.get("team_id") as string,
    data: formData.get("data") as string,
    turno: formData.get("turno") as string,
    descricao: formData.get("descricao") as string || null,
    created_by: user?.id,
  }).select("id").single();
  if (error) throw new Error(error.message);

  // Convocar voluntários
  const vol_ids = (formData.getAll("volunteer_ids") as string[]).filter(Boolean);
  if (vol_ids.length > 0) {
    const confs = vol_ids.map(vid => ({ ministry_id: ctx.ministry_id, schedule_id: esc!.id, volunteer_id: vid, status: "CONVOCADO" }));
    await sb.from("schedule_confirmations").insert(confs);
  }
  return esc!.id;
}

export async function responderEscalaAction(confirmation_id: string, status: "CONFIRMADO" | "RECUSADO", motivo?: string) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const sb = await createClient();
  const { error } = await sb.from("schedule_confirmations")
    .update({ status, motivo_recusa: motivo ?? null, updated_at: new Date().toISOString() })
    .eq("id", confirmation_id)
    .eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
}
