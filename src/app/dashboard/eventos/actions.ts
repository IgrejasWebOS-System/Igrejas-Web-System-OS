"use server";

import { createClient } from "@/utils/supabase/server";
import { getAuthContext, assertLevel } from "@/utils/supabase/auth-context";
import type {
  EventItem,
  EventRegistration,
  EventCheckin,
  EventStatus,
  EventRegistrationStatus,
} from "@/types";

// ── Listar eventos ────────────────────────────────────────────
export async function listarEventosAction(filtros?: {
  status?: EventStatus;
  tipo?: string;
  data_inicio?: string;
  data_fim?: string;
}): Promise<EventItem[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const sb = createClient();

  let q = (await sb)
    .from("events")
    .select(`
      *,
      units:unit_id ( name ),
      parties:responsavel_party_id ( full_name )
    `)
    .eq("ministry_id", ctx.ministry_id)
    .is("deleted_at", null)
    .order("data_inicio", { ascending: false });

  if (filtros?.status) q = q.eq("status", filtros.status);
  if (filtros?.tipo)   q = q.eq("tipo", filtros.tipo);
  if (filtros?.data_inicio) q = q.gte("data_inicio", filtros.data_inicio);
  if (filtros?.data_fim)    q = q.lte("data_inicio", filtros.data_fim);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  return (data ?? []).map((r: Record<string, unknown>) => ({
    ...r,
    unit_nome:          (r.units as { name?: string } | null)?.name ?? null,
    responsavel_nome:   (r.parties as { full_name?: string } | null)?.full_name ?? null,
  })) as EventItem[];
}

// ── Buscar evento por ID ──────────────────────────────────────
export async function buscarEventoAction(id: string): Promise<EventItem | null> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const sb = await createClient();

  const { data, error } = await sb
    .from("events")
    .select(`*, units:unit_id ( name ), parties:responsavel_party_id ( full_name )`)
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id)
    .is("deleted_at", null)
    .single();

  if (error) return null;
  return {
    ...data,
    unit_nome:        data.units?.name ?? null,
    responsavel_nome: data.parties?.full_name ?? null,
  } as EventItem;
}

// ── Criar evento ──────────────────────────────────────────────
export async function criarEventoAction(formData: FormData): Promise<{ id: string }> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();

  const capacidade = formData.get("capacidade") as string;

  const { data, error } = await sb
    .from("events")
    .insert({
      ministry_id:                ctx.ministry_id,
      unit_id:                    formData.get("unit_id") || null,
      titulo:                     formData.get("titulo") as string,
      descricao:                  formData.get("descricao") || null,
      tipo:                       formData.get("tipo") as string,
      status:                     formData.get("status") as string,
      data_inicio:                formData.get("data_inicio") as string,
      data_fim:                   formData.get("data_fim") || null,
      local_nome:                 formData.get("local_nome") || null,
      local_endereco:             formData.get("local_endereco") || null,
      capacidade:                 capacidade ? parseInt(capacidade) : null,
      inscricao_aberta:           formData.get("inscricao_aberta") === "true",
      inscricao_requer_aprovacao: formData.get("inscricao_requer_aprovacao") === "true",
      responsavel_party_id:       formData.get("responsavel_party_id") || null,
      created_by:                 ctx.user_id,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return { id: data.id };
}

// ── Atualizar evento ──────────────────────────────────────────
export async function atualizarEventoAction(id: string, formData: FormData): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();

  const capacidade = formData.get("capacidade") as string;

  const { error } = await sb
    .from("events")
    .update({
      unit_id:                    formData.get("unit_id") || null,
      titulo:                     formData.get("titulo") as string,
      descricao:                  formData.get("descricao") || null,
      tipo:                       formData.get("tipo") as string,
      status:                     formData.get("status") as string,
      data_inicio:                formData.get("data_inicio") as string,
      data_fim:                   formData.get("data_fim") || null,
      local_nome:                 formData.get("local_nome") || null,
      local_endereco:             formData.get("local_endereco") || null,
      capacidade:                 capacidade ? parseInt(capacidade) : null,
      inscricao_aberta:           formData.get("inscricao_aberta") === "true",
      inscricao_requer_aprovacao: formData.get("inscricao_requer_aprovacao") === "true",
      responsavel_party_id:       formData.get("responsavel_party_id") || null,
    })
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);

  if (error) throw new Error(error.message);
}

// ── Mudar status ──────────────────────────────────────────────
export async function mudarStatusEventoAction(id: string, status: EventStatus): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();

  const { error } = await sb
    .from("events")
    .update({ status })
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);

  if (error) throw new Error(error.message);
}

// ── Excluir evento (soft delete) ──────────────────────────────
export async function excluirEventoAction(id: string): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const sb = await createClient();

  const { error } = await sb
    .from("events")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);

  if (error) throw new Error(error.message);
}

// ── Listar inscrições de um evento ───────────────────────────
export async function listarInscricoesAction(event_id: string): Promise<EventRegistration[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();

  const { data, error } = await sb
    .from("event_registrations")
    .select(`*, parties:party_id ( full_name, foto_url )`)
    .eq("event_id", event_id)
    .eq("ministry_id", ctx.ministry_id)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((r: Record<string, unknown>) => ({
    ...r,
    party_nome: (r.parties as { full_name?: string } | null)?.full_name ?? null,
    party_foto: (r.parties as { foto_url?: string } | null)?.foto_url ?? null,
  })) as EventRegistration[];
}

// ── Inscrever no evento ───────────────────────────────────────
export async function inscreverAction(formData: FormData): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();

  const event_id = formData.get("event_id") as string;

  // Verificar vagas disponíveis
  const { data: evt } = await sb
    .from("events")
    .select("capacidade, inscricao_aberta, inscricao_requer_aprovacao")
    .eq("id", event_id)
    .single();

  if (!evt?.inscricao_aberta) throw new Error("Inscrições encerradas para este evento.");

  if (evt.capacidade) {
    const { count } = await sb
      .from("event_registrations")
      .select("*", { count: "exact", head: true })
      .eq("event_id", event_id)
      .in("status", ["CONFIRMADO", "PENDENTE"]);

    if ((count ?? 0) >= evt.capacidade) throw new Error("Evento sem vagas disponíveis.");
  }

  const status: EventRegistrationStatus = evt.inscricao_requer_aprovacao ? "PENDENTE" : "CONFIRMADO";

  const { error } = await sb
    .from("event_registrations")
    .insert({
      ministry_id:      ctx.ministry_id,
      event_id,
      party_id:         formData.get("party_id") || null,
      nome_externo:     formData.get("nome_externo") || null,
      telefone_externo: formData.get("telefone_externo") || null,
      status,
      inscrito_por:     ctx.user_id,
      observacao:       formData.get("observacao") || null,
    });

  if (error) throw new Error(error.message);
}

// ── Atualizar status de inscrição ─────────────────────────────
export async function atualizarStatusInscricaoAction(
  id: string,
  status: EventRegistrationStatus
): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();

  const { error } = await sb
    .from("event_registrations")
    .update({ status })
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);

  if (error) throw new Error(error.message);
}

// ── Listar check-ins ──────────────────────────────────────────
export async function listarCheckinsAction(event_id: string): Promise<EventCheckin[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();

  const { data, error } = await sb
    .from("event_checkins")
    .select(`*, parties:party_id ( full_name )`)
    .eq("event_id", event_id)
    .eq("ministry_id", ctx.ministry_id)
    .order("checkin_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((r: Record<string, unknown>) => ({
    ...r,
    party_nome: (r.parties as { full_name?: string } | null)?.full_name ?? null,
  })) as EventCheckin[];
}

// ── Fazer check-in ────────────────────────────────────────────
export async function fazerCheckinAction(formData: FormData): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();

  const { error } = await sb
    .from("event_checkins")
    .insert({
      ministry_id:     ctx.ministry_id,
      event_id:        formData.get("event_id") as string,
      registration_id: formData.get("registration_id") || null,
      party_id:        formData.get("party_id") || null,
      nome_avulso:     formData.get("nome_avulso") || null,
      checkin_by:      ctx.user_id,
    });

  if (error) throw new Error(error.message);
}
