"use server";

import { createClient } from "@/utils/supabase/server";
import { getAuthContext, assertLevel } from "@/utils/supabase/auth-context";
import type { BaptismListItem, BaptismSituacao } from "@/types";

export type BaptismLookup = {
  types: { id: string; nome: string }[];
  units: { id: string; nome: string }[];
};

export async function listarBatismosAction(params?: {
  busca?: string;
  situacao?: BaptismSituacao;
  type_id?: string;
}): Promise<BaptismListItem[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  let query = supabase
    .from("baptism_processes")
    .select(`
      *,
      parties!baptism_processes_party_id_fkey(nome_completo, matricula),
      units(nome),
      baptism_types(nome),
      pastores:parties!baptism_processes_pastor_party_id_fkey(nome_completo)
    `)
    .eq("ministry_id", ctx.ministry_id)
    .order("created_at", { ascending: false });

  if (params?.situacao) query = query.eq("situacao", params.situacao);
  if (params?.type_id)  query = query.eq("type_id", params.type_id);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let items: BaptismListItem[] = (data ?? []).map((r: Record<string, unknown>) => {
    const party   = r.parties as Record<string, string> | null;
    const unit    = r.units as Record<string, string> | null;
    const type    = r.baptism_types as Record<string, string> | null;
    const pastor  = r.pastores as Record<string, string> | null;
    return {
      ...r,
      membro_nome:       party?.nome_completo ?? "—",
      membro_matricula:  party?.matricula ?? null,
      unit_nome:         unit?.nome ?? null,
      type_nome:         type?.nome ?? null,
      pastor_nome:       pastor?.nome_completo ?? null,
    } as BaptismListItem;
  });

  if (params?.busca) {
    const q = params.busca.toLowerCase();
    items = items.filter(i =>
      i.membro_nome.toLowerCase().includes(q) ||
      (i.membro_matricula ?? "").toLowerCase().includes(q)
    );
  }

  return items;
}

export async function carregarLookupsBatismo(): Promise<BaptismLookup> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const [typesRes, unitsRes] = await Promise.all([
    supabase.from("baptism_types").select("id, nome").eq("ministry_id", ctx.ministry_id).eq("is_active", true).order("nome"),
    supabase.from("units").select("id, nome").eq("ministry_id", ctx.ministry_id).order("nome"),
  ]);

  return {
    types: typesRes.data ?? [],
    units: unitsRes.data ?? [],
  };
}

export async function criarBatismoAction(formData: FormData): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const payload: Record<string, unknown> = {
    ministry_id: ctx.ministry_id,
    party_id:    formData.get("party_id") as string,
    situacao:    "PENDENTE",
    criado_por:  ctx.user_id,
  };

  const fields = ["type_id","unit_id","pastor_party_id","data_prevista","observacoes"] as const;
  for (const f of fields) {
    const v = formData.get(f) as string | null;
    if (v?.trim()) payload[f] = v.trim();
  }

  const { error } = await supabase.from("baptism_processes").insert(payload);
  if (error) throw new Error(error.message);
}

export async function confirmarBatismoAction(id: string, data_realizada: string): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const supabase = await createClient();

  // Buscar processo
  const { data: proc, error: procErr } = await supabase
    .from("baptism_processes")
    .select("party_id, type_id")
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id)
    .single();
  if (procErr || !proc) throw new Error(procErr?.message ?? "Processo não encontrado");

  // Atualizar processo
  const { error: updErr } = await supabase
    .from("baptism_processes")
    .update({ situacao: "BATIZADO", data_realizada })
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);
  if (updErr) throw new Error(updErr.message);

  // Descobrir tipo para saber qual campo atualizar
  if (proc.type_id) {
    const { data: tipo } = await supabase
      .from("baptism_types")
      .select("nome")
      .eq("id", proc.type_id)
      .maybeSingle();

    const nomeUp = (tipo?.nome ?? "").toLowerCase();
    const campo = nomeUp.includes("espirito") || nomeUp.includes("espírito")
      ? "data_batismo_espirito"
      : "data_batismo_aguas";

    await supabase
      .from("party_members")
      .update({ [campo]: data_realizada })
      .eq("party_id", proc.party_id)
      .eq("ministry_id", ctx.ministry_id);
  }
}

export async function mudarSituacaoBatismoAction(id: string, situacao: BaptismSituacao): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const supabase = await createClient();

  const { error } = await supabase
    .from("baptism_processes")
    .update({ situacao })
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
}

export async function editarBatismoAction(id: string, formData: FormData): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const supabase = await createClient();

  const payload: Record<string, unknown> = {};
  const fields = ["type_id","unit_id","pastor_party_id","data_prevista","data_realizada","observacoes","situacao"] as const;
  for (const f of fields) {
    const v = formData.get(f) as string | null;
    if (v !== null) payload[f] = v || null;
  }

  const { error } = await supabase
    .from("baptism_processes")
    .update(payload)
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
}
