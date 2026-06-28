"use server";

import { createClient } from "@/utils/supabase/server";
import { getAuthContext, assertLevel } from "@/utils/supabase/auth-context";
import type {
  ReqType,
  RequisitionListItem,
  RequisitionDetail,
  RequisitionSituacao,
} from "@/types";

// ── Tipos de Requerimento ─────────────────────────────────────────────────────

export async function listarTiposAction(): Promise<ReqType[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("req_types")
    .select("*")
    .eq("ministry_id", ctx.ministry_id)
    .order("nome");

  if (error) throw new Error(error.message);
  return (data ?? []) as ReqType[];
}

export async function criarTipoAction(formData: FormData): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const supabase = await createClient();

  const { error } = await supabase.from("req_types").insert({
    ministry_id:   ctx.ministry_id,
    nome:          (formData.get("nome") as string).trim(),
    descricao:     (formData.get("descricao") as string | null)?.trim() || null,
    requer_membro: formData.get("requer_membro") === "true",
  });
  if (error) throw new Error(error.message);
}

export async function editarTipoAction(id: string, formData: FormData): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const supabase = await createClient();

  const { error } = await supabase
    .from("req_types")
    .update({
      nome:          (formData.get("nome") as string).trim(),
      descricao:     (formData.get("descricao") as string | null)?.trim() || null,
      requer_membro: formData.get("requer_membro") === "true",
    })
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
}

export async function toggleTipoAction(id: string, is_active: boolean): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const supabase = await createClient();

  const { error } = await supabase
    .from("req_types")
    .update({ is_active })
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
}

// ── Requerimentos ─────────────────────────────────────────────────────────────

const JOIN_COLS = `
  *,
  req_types(nome),
  unit_from:units!requisitions_unit_from_id_fkey(nome),
  unit_to:units!requisitions_unit_to_id_fkey(nome),
  party:parties!requisitions_party_id_fkey(nome_completo, matricula)
`;

function mapRow(r: Record<string, unknown>): RequisitionListItem {
  const type    = r.req_types   as Record<string, string> | null;
  const ufrom   = r.unit_from   as Record<string, string> | null;
  const uto     = r.unit_to     as Record<string, string> | null;
  const party   = r.party       as Record<string, string> | null;
  return {
    ...(r as unknown as RequisitionListItem),
    type_nome:      type?.nome      ?? "—",
    unit_from_nome: ufrom?.nome     ?? "—",
    unit_to_nome:   uto?.nome       ?? "—",
    membro_nome:    party?.nome_completo ?? null,
  };
}

type ListParams = {
  situacao?:    RequisitionSituacao;
  type_id?:     string;
  party_q?:     string;
  numero_min?:  number;
  numero_max?:  number;
  per_page?:    number;
  page?:        number;
};

export async function listarMeusAction(params: ListParams = {}): Promise<RequisitionListItem[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  if (!ctx.unit_id) throw new Error("Unidade não definida no contexto");
  const supabase = await createClient();

  let q = supabase
    .from("requisitions")
    .select(JOIN_COLS)
    .eq("ministry_id", ctx.ministry_id)
    .eq("unit_from_id", ctx.unit_id)
    .order("created_at", { ascending: false });

  if (params.situacao)   q = q.eq("situacao", params.situacao);
  if (params.type_id)    q = q.eq("type_id",  params.type_id);
  if (params.numero_min) q = q.gte("numero",  params.numero_min);
  if (params.numero_max) q = q.lte("numero",  params.numero_max);

  const limit  = params.per_page ?? 50;
  const offset = ((params.page ?? 1) - 1) * limit;
  q = q.range(offset, offset + limit - 1);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map(r => mapRow(r as Record<string, unknown>));
}

export async function listarRecebidosAction(params: ListParams = {}): Promise<RequisitionListItem[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  if (!ctx.unit_id) throw new Error("Unidade não definida no contexto");
  const supabase = await createClient();

  let q = supabase
    .from("requisitions")
    .select(JOIN_COLS)
    .eq("ministry_id", ctx.ministry_id)
    .eq("unit_to_id", ctx.unit_id)
    .order("created_at", { ascending: false });

  if (params.situacao)   q = q.eq("situacao", params.situacao);
  if (params.type_id)    q = q.eq("type_id",  params.type_id);
  if (params.numero_min) q = q.gte("numero",  params.numero_min);
  if (params.numero_max) q = q.lte("numero",  params.numero_max);

  const limit  = params.per_page ?? 50;
  const offset = ((params.page ?? 1) - 1) * limit;
  q = q.range(offset, offset + limit - 1);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map(r => mapRow(r as Record<string, unknown>));
}

export async function buscarRequisicaoAction(id: string): Promise<RequisitionDetail> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("requisitions")
    .select(JOIN_COLS)
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id)
    .single();

  if (error || !data) throw new Error(error?.message ?? "Requerimento não encontrado");

  const r     = data as Record<string, unknown>;
  const party = r.party as Record<string, string> | null;
  const base  = mapRow(r);

  // Se ainda PENDENTE e a unidade destino está abrindo → mudar para EM_ANALISE
  if (base.situacao === "PENDENTE" && base.unit_to_id === ctx.unit_id) {
    await supabase
      .from("requisitions")
      .update({ situacao: "EM_ANALISE" })
      .eq("id", id)
      .eq("ministry_id", ctx.ministry_id);
    base.situacao = "EM_ANALISE";
  }

  return {
    ...base,
    membro_matricula: party?.matricula ?? null,
  } as RequisitionDetail;
}

export async function criarRequisicaoAction(formData: FormData): Promise<string> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  if (!ctx.unit_id) throw new Error("Unidade não definida no contexto");
  const supabase = await createClient();

  // Gerar número sequencial
  const { data: numData } = await supabase.rpc("gerar_numero_req", {
    p_ministry_id: ctx.ministry_id,
  });
  const numero = (numData as number) ?? 1;

  const unit_to_id = formData.get("unit_to_id") as string;
  const type_id    = formData.get("type_id")    as string;
  const descricao  = (formData.get("descricao") as string).trim();
  const party_id   = (formData.get("party_id")  as string | null) || null;

  const { data, error } = await supabase
    .from("requisitions")
    .insert({
      ministry_id:  ctx.ministry_id,
      numero,
      unit_from_id: ctx.unit_id,
      unit_to_id,
      type_id,
      party_id,
      descricao,
      situacao:     "PENDENTE",
      data_envio:   new Date().toISOString(),
      criado_por:   ctx.user_id,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Erro ao criar requerimento");
  return (data as { id: string }).id;
}

export async function responderRequisicaoAction(
  id: string,
  situacao: "APROVADO" | "REJEITADO",
  resposta: string
): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  if (!ctx.unit_id) throw new Error("Unidade não definida no contexto");
  const supabase = await createClient();

  const { error } = await supabase
    .from("requisitions")
    .update({
      situacao,
      resposta: resposta.trim(),
      data_resposta:  new Date().toISOString(),
      respondido_por: ctx.user_id,
    })
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id)
    .eq("unit_to_id", ctx.unit_id);

  if (error) throw new Error(error.message);
}

export async function arquivarRequisicaoAction(id: string): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  if (!ctx.unit_id) throw new Error("Unidade não definida no contexto");
  const supabase = await createClient();

  const { error } = await supabase
    .from("requisitions")
    .update({ situacao: "ARQUIVADO" })
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id)
    .eq("unit_from_id", ctx.unit_id);

  if (error) throw new Error(error.message);
}
