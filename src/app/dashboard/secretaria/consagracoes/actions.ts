"use server";

import { createClient } from "@/utils/supabase/server";
import { getAuthContext, assertLevel } from "@/utils/supabase/auth-context";
import type { ConsecrationListItem } from "@/types";

export type ConsecrationLookup = {
  types:      { id: string; nome: string }[];
  situations: { id: string; nome: string; cor: string }[];
  cargos:     { id: string; nome: string }[];
  units:      { id: string; nome: string }[];
};

export async function listarConsagracoesAction(params?: {
  busca?: string;
  situacao_id?: string;
  type_id?: string;
}): Promise<ConsecrationListItem[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("consecration_processes")
    .select(`
      *,
      parties!consecration_processes_party_id_fkey(nome_completo, matricula),
      units(nome),
      consecration_types(nome),
      consecration_situations(nome, cor),
      member_cargos(nome)
    `)
    .eq("ministry_id", ctx.ministry_id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  let items: ConsecrationListItem[] = (data ?? []).map((r: Record<string, unknown>) => {
    const party    = r.parties as Record<string, string> | null;
    const unit     = r.units as Record<string, string> | null;
    const type     = r.consecration_types as Record<string, string> | null;
    const sit      = r.consecration_situations as Record<string, string> | null;
    const cargo    = r.member_cargos as Record<string, string> | null;
    return {
      ...r,
      membro_nome:       party?.nome_completo ?? "—",
      membro_matricula:  party?.matricula ?? null,
      unit_nome:         unit?.nome ?? null,
      type_nome:         type?.nome ?? null,
      situation_nome:    sit?.nome ?? null,
      situation_cor:     sit?.cor ?? null,
      cargo_nome:        cargo?.nome ?? null,
    } as ConsecrationListItem;
  });

  if (params?.situacao_id) {
    items = items.filter(i => i.situation_id === params.situacao_id);
  }
  if (params?.type_id) {
    items = items.filter(i => i.type_id === params.type_id);
  }
  if (params?.busca) {
    const q = params.busca.toLowerCase();
    items = items.filter(i =>
      i.membro_nome.toLowerCase().includes(q) ||
      (i.membro_matricula ?? "").toLowerCase().includes(q)
    );
  }

  return items;
}

export async function carregarLookupsConsagracao(): Promise<ConsecrationLookup> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const supabase = await createClient();

  const [typesRes, sitRes, cargosRes, unitsRes] = await Promise.all([
    supabase.from("consecration_types").select("id, nome").eq("ministry_id", ctx.ministry_id).eq("is_active", true).order("ordem"),
    supabase.from("consecration_situations").select("id, nome, cor").eq("ministry_id", ctx.ministry_id).eq("is_active", true).order("ordem"),
    supabase.from("member_cargos").select("id, nome").eq("ministry_id", ctx.ministry_id).eq("is_active", true).order("ordem"),
    supabase.from("units").select("id, nome").eq("ministry_id", ctx.ministry_id).order("nome"),
  ]);

  return {
    types:      typesRes.data ?? [],
    situations: sitRes.data ?? [],
    cargos:     cargosRes.data ?? [],
    units:      unitsRes.data ?? [],
  };
}

export async function criarConsagracaoAction(formData: FormData): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const supabase = await createClient();

  const payload: Record<string, unknown> = {
    ministry_id:      ctx.ministry_id,
    party_id:         formData.get("party_id") as string,
    data_solicitacao: (formData.get("data_solicitacao") as string) || new Date().toISOString().slice(0, 10),
    criado_por:       ctx.user_id,
  };

  const typeId    = formData.get("type_id")            as string | null;
  const sitId     = formData.get("situation_id")       as string | null;
  const cargoId   = formData.get("cargo_pleiteado_id") as string | null;
  const unitId    = formData.get("unit_id")            as string | null;
  const obs       = formData.get("observacoes")        as string | null;

  if (typeId)   payload.type_id            = typeId;
  if (sitId)    payload.situation_id       = sitId;
  if (cargoId)  payload.cargo_pleiteado_id = cargoId;
  if (unitId)   payload.unit_id            = unitId;
  if (obs?.trim()) payload.observacoes     = obs.trim();

  const { error } = await supabase.from("consecration_processes").insert(payload);
  if (error) throw new Error(error.message);
}

export async function atualizarSituacaoConsagracaoAction(
  id: string,
  situacao_id: string,
  data_consagracao?: string
): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const supabase = await createClient();

  const payload: Record<string, unknown> = {
    situation_id: situacao_id,
    aprovado_por:  ctx.user_id,
  };
  if (data_consagracao) payload.data_consagracao = data_consagracao;

  const { error } = await supabase
    .from("consecration_processes")
    .update(payload)
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
}

export async function aprovarConsagracaoAction(id: string, data_consagracao: string): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const supabase = await createClient();

  // Buscar processo para pegar cargo_pleiteado_id e party_id
  const { data: proc, error: procErr } = await supabase
    .from("consecration_processes")
    .select("party_id, cargo_pleiteado_id, situation_id")
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id)
    .single();
  if (procErr || !proc) throw new Error(procErr?.message ?? "Processo não encontrado");

  // Buscar situação "Aprovado"
  const { data: sitAprov } = await supabase
    .from("consecration_situations")
    .select("id")
    .eq("ministry_id", ctx.ministry_id)
    .ilike("nome", "aprovado")
    .maybeSingle();

  // Atualizar situação do processo
  const { error: updErr } = await supabase
    .from("consecration_processes")
    .update({
      situation_id:    sitAprov?.id ?? proc.situation_id,
      aprovado_por:    ctx.user_id,
      data_consagracao,
    })
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);
  if (updErr) throw new Error(updErr.message);

  // Se há cargo_pleiteado_id, atualizar em party_members
  if (proc.cargo_pleiteado_id) {
    await supabase
      .from("party_members")
      .update({ cargo_id: proc.cargo_pleiteado_id })
      .eq("party_id", proc.party_id)
      .eq("ministry_id", ctx.ministry_id);

    // Registrar em member_history
    await supabase.from("member_history").insert({
      ministry_id:   ctx.ministry_id,
      party_id:      proc.party_id,
      tipo:          "CARGO",
      descricao:     "Cargo atualizado via processo de consagração",
      novo_valor_id: proc.cargo_pleiteado_id,
      criado_por:    ctx.user_id,
      data_evento:   data_consagracao,
    }).select();
  }
}

export async function editarConsagracaoAction(id: string, formData: FormData): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const supabase = await createClient();

  const payload: Record<string, unknown> = {};
  const fields = ["type_id","situation_id","cargo_pleiteado_id","unit_id","data_solicitacao","data_consagracao","observacoes"] as const;
  for (const f of fields) {
    const v = formData.get(f) as string | null;
    if (v !== null) payload[f] = v || null;
  }

  const { error } = await supabase
    .from("consecration_processes")
    .update(payload)
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
}
