"use server";

import { createClient } from "@/utils/supabase/server";
import { getAuthContext, assertLevel } from "@/utils/supabase/auth-context";
import type {
  Occurrence,
  OccurrenceFollowup,
  OccurrenceStatus,
} from "@/types";

// ── Listar ocorrências ────────────────────────────────────────
export async function listarOcorrenciasAction(filtros?: {
  status?: OccurrenceStatus;
  tipo?: string;
  party_id?: string;
}): Promise<Occurrence[]> {
  const ctx = await getAuthContext();
  // N3 pode ver NORMAL; N2+ pode ver RESTRITO também (filtro no app)
  assertLevel(ctx, 3);
  const sb = await createClient();

  let q = sb
    .from("occurrences")
    .select(`
      *,
      parties:party_id ( full_name, foto_url ),
      responsavel:responsavel_party_id ( full_name ),
      units:unit_id ( name )
    `)
    .eq("ministry_id", ctx.ministry_id)
    .is("deleted_at", null)
    .order("data_ocorrencia", { ascending: false });

  // N3 só vê nível NORMAL
  if (ctx.level >= 3) q = q.eq("nivel_sigilo", "NORMAL");

  if (filtros?.status)   q = q.eq("status", filtros.status);
  if (filtros?.tipo)     q = q.eq("tipo", filtros.tipo);
  if (filtros?.party_id) q = q.eq("party_id", filtros.party_id);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  return (data ?? []).map((r: Record<string, unknown>) => ({
    ...r,
    party_nome:       (r.parties as { full_name?: string } | null)?.full_name ?? null,
    party_foto:       (r.parties as { foto_url?: string } | null)?.foto_url ?? null,
    responsavel_nome: (r.responsavel as { full_name?: string } | null)?.full_name ?? null,
    unit_nome:        (r.units as { name?: string } | null)?.name ?? null,
  })) as Occurrence[];
}

// ── Buscar ocorrência por ID ──────────────────────────────────
export async function buscarOcorrenciaAction(id: string): Promise<Occurrence | null> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();

  const { data, error } = await sb
    .from("occurrences")
    .select(`
      *,
      parties:party_id ( full_name, foto_url ),
      responsavel:responsavel_party_id ( full_name ),
      units:unit_id ( name )
    `)
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id)
    .is("deleted_at", null)
    .single();

  if (error || !data) return null;

  // Bloquear acesso a RESTRITO para N3+
  if (ctx.level >= 3 && data.nivel_sigilo === "RESTRITO") return null;

  return {
    ...data,
    party_nome:       data.parties?.full_name ?? null,
    party_foto:       data.parties?.foto_url ?? null,
    responsavel_nome: data.responsavel?.full_name ?? null,
    unit_nome:        data.units?.name ?? null,
  } as Occurrence;
}

// ── Criar ocorrência ──────────────────────────────────────────
export async function criarOcorrenciaAction(formData: FormData): Promise<string> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();

  const nivel_sigilo = formData.get("nivel_sigilo") as string;
  // N3 só pode criar NORMAL
  if (ctx.level >= 3 && nivel_sigilo === "RESTRITO") {
    throw new Error("Nível de acesso insuficiente para criar ocorrência restrita.");
  }

  const { data, error } = await sb
    .from("occurrences")
    .insert({
      ministry_id:          ctx.ministry_id,
      unit_id:              formData.get("unit_id") || null,
      party_id:             formData.get("party_id") || null,
      tipo:                 formData.get("tipo") as string,
      titulo:               formData.get("titulo") as string,
      descricao:            formData.get("descricao") || null,
      data_ocorrencia:      formData.get("data_ocorrencia") as string,
      status:               "ABERTA",
      nivel_sigilo,
      responsavel_party_id: formData.get("responsavel_party_id") || null,
      created_by:           ctx.user_id,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

// ── Atualizar ocorrência ──────────────────────────────────────
export async function atualizarOcorrenciaAction(id: string, formData: FormData): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();

  const { error } = await sb
    .from("occurrences")
    .update({
      tipo:                 formData.get("tipo") as string,
      titulo:               formData.get("titulo") as string,
      descricao:            formData.get("descricao") || null,
      data_ocorrencia:      formData.get("data_ocorrencia") as string,
      nivel_sigilo:         formData.get("nivel_sigilo") as string,
      responsavel_party_id: formData.get("responsavel_party_id") || null,
    })
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);

  if (error) throw new Error(error.message);
}

// ── Mudar status ──────────────────────────────────────────────
export async function mudarStatusOcorrenciaAction(
  id: string,
  status: OccurrenceStatus,
  resolucao?: string
): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();

  const { error } = await sb
    .from("occurrences")
    .update({ status, resolucao: resolucao ?? null })
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);

  if (error) throw new Error(error.message);
}

// ── Arquivar / soft delete ────────────────────────────────────
export async function arquivarOcorrenciaAction(id: string): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const sb = await createClient();

  const { error } = await sb
    .from("occurrences")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);

  if (error) throw new Error(error.message);
}

// ── Listar acompanhamentos ────────────────────────────────────
export async function listarFollowupsAction(occurrence_id: string): Promise<OccurrenceFollowup[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();

  const { data, error } = await sb
    .from("occurrence_followups")
    .select("*")
    .eq("occurrence_id", occurrence_id)
    .eq("ministry_id", ctx.ministry_id)
    .order("data", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as OccurrenceFollowup[];
}

// ── Registrar acompanhamento ──────────────────────────────────
export async function registrarFollowupAction(formData: FormData): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();

  const occurrence_id = formData.get("occurrence_id") as string;

  const { error } = await sb
    .from("occurrence_followups")
    .insert({
      ministry_id:   ctx.ministry_id,
      occurrence_id,
      data:          formData.get("data") as string,
      tipo_contato:  formData.get("tipo_contato") as string,
      descricao:     formData.get("descricao") as string,
      proxima_acao:  formData.get("proxima_acao") || null,
      created_by:    ctx.user_id,
    });

  if (error) throw new Error(error.message);

  // Atualizar status para EM_ACOMPANHAMENTO se ainda estiver ABERTA
  await sb
    .from("occurrences")
    .update({ status: "EM_ACOMPANHAMENTO" })
    .eq("id", occurrence_id)
    .eq("ministry_id", ctx.ministry_id)
    .eq("status", "ABERTA");
}
