"use server";

import { createClient } from "@/utils/supabase/server";
import { getAuthContext, assertLevel } from "@/utils/supabase/auth-context";
import type {
  PatrimonyItem,
  PatrimonyItemListItem,
  PatrimonyMovement,
  PatrimonyMovementListItem,
  PatrimonyDepreciation,
  PatrimonyCategoria,
  PatrimonyStatus,
  PatrimonyDepreciationRule,
  PatrimonyAquisicaoTipo,
  TaxaDepreciacaoSugerida,
} from "@/types";

// ── LISTAGEM ──────────────────────────────────────────────────

export type PatrimonyFilter = {
  categoria?: PatrimonyCategoria;
  status?: PatrimonyStatus;
  unit_id?: string;
  search?: string;
};

export async function listarPatrimonioAction(
  filter: PatrimonyFilter = {}
): Promise<PatrimonyItemListItem[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  let q = supabase
    .from("patrimony_items")
    .select("*")
    .eq("ministry_id", ctx.ministry_id)
    .is("deleted_at", null)
    .order("numero_tombamento");

  if (filter.categoria) q = q.eq("categoria", filter.categoria);
  if (filter.status)    q = q.eq("status", filter.status);
  if (filter.unit_id)   q = q.eq("unit_id", filter.unit_id);
  if (filter.search)    q = q.ilike("nome", `%${filter.search.trim()}%`);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const items = (data ?? []) as PatrimonyItem[];
  if (!items.length) return [];

  const unitIds = [...new Set([
    ...items.map((i) => i.unit_id).filter(Boolean) as string[],
    ...items.map((i) => i.localizacao_unit_id).filter(Boolean) as string[],
  ])];
  const partyIds = [...new Set(items.map((i) => i.responsavel_party_id).filter(Boolean) as string[])];
  const itemIds  = items.map((i) => i.id);

  const [unitsRes, partiesRes, deprRes] = await Promise.all([
    unitIds.length  ? supabase.from("units").select("id, name").in("id", unitIds) : { data: [] },
    partyIds.length ? supabase.from("parties").select("id, full_name").in("id", partyIds) : { data: [] },
    // Valor contábil via RPC para cada item seria N+1; usamos depreciações acumuladas em batch
    supabase
      .from("patrimony_depreciations")
      .select("item_id, valor_depreciacao")
      .in("item_id", itemIds),
  ]);

  const unitMap  = Object.fromEntries((unitsRes.data  ?? []).map((u: any) => [u.id, u.name]));
  const partyMap = Object.fromEntries((partiesRes.data ?? []).map((p: any) => [p.id, p.full_name]));

  // Depreciação acumulada por item
  const deprMap: Record<string, number> = {};
  for (const d of (deprRes.data ?? []) as any[]) {
    deprMap[d.item_id] = (deprMap[d.item_id] ?? 0) + d.valor_depreciacao;
  }

  return items.map((item) => ({
    ...item,
    unit_nome:            item.unit_id ? (unitMap[item.unit_id] ?? null) : null,
    localizacao_nome:     item.localizacao_unit_id ? (unitMap[item.localizacao_unit_id] ?? null) : null,
    responsavel_nome:     item.responsavel_party_id ? (partyMap[item.responsavel_party_id] ?? null) : null,
    valor_contabil_atual: Math.max(
      item.valor_residual ?? 0,
      item.valor_aquisicao - (deprMap[item.id] ?? 0)
    ),
  }));
}

// ── BUSCAR ITEM INDIVIDUAL ─────────────────────────────────────

export async function buscarPatrimonyItemAction(id: string): Promise<PatrimonyItemListItem> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("patrimony_items")
    .select("*")
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id)
    .single();
  if (error) throw new Error(error.message);

  const item = data as PatrimonyItem;

  const [unitRes, locRes, partyRes, deprRes] = await Promise.all([
    item.unit_id ? supabase.from("units").select("name").eq("id", item.unit_id).single() : null,
    item.localizacao_unit_id ? supabase.from("units").select("name").eq("id", item.localizacao_unit_id).single() : null,
    item.responsavel_party_id ? supabase.from("parties").select("full_name").eq("id", item.responsavel_party_id).single() : null,
    supabase.from("patrimony_depreciations").select("valor_depreciacao").eq("item_id", id),
  ]);

  const totalDepr = ((deprRes?.data ?? []) as any[]).reduce((a: number, d: any) => a + d.valor_depreciacao, 0);

  return {
    ...item,
    unit_nome:            (unitRes  as any)?.data?.name ?? null,
    localizacao_nome:     (locRes   as any)?.data?.name ?? null,
    responsavel_nome:     (partyRes as any)?.data?.full_name ?? null,
    valor_contabil_atual: Math.max(item.valor_residual ?? 0, item.valor_aquisicao - totalDepr),
  };
}

// ── CRIAR BEM ─────────────────────────────────────────────────

export async function criarPatrimonyItemAction(formData: FormData): Promise<string> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const supabase = await createClient();

  // Gerar número de tombamento
  const { data: tombamento, error: tombErr } = await supabase.rpc("gerar_numero_tombamento", {
    p_ministry_id: ctx.ministry_id,
  });
  if (tombErr) throw new Error(tombErr.message);

  const valor_aquisicao = parseFloat(formData.get("valor_aquisicao") as string);
  if (!valor_aquisicao || valor_aquisicao < 0) throw new Error("Valor de aquisição inválido");

  const { data: item, error } = await supabase
    .from("patrimony_items")
    .insert({
      ministry_id:            ctx.ministry_id,
      unit_id:                (formData.get("unit_id") as string) || null,
      numero_tombamento:      tombamento as string,
      nome:                   (formData.get("nome") as string).trim(),
      descricao:              (formData.get("descricao") as string)?.trim() || null,
      categoria:              formData.get("categoria") as string,
      tipo_aquisicao:         (formData.get("tipo_aquisicao") as string) || "COMPRA",
      valor_aquisicao,
      valor_avaliacao:        formData.get("valor_avaliacao") ? parseFloat(formData.get("valor_avaliacao") as string) : null,
      laudo_avaliacao:        (formData.get("laudo_avaliacao") as string)?.trim() || null,
      data_aquisicao:         formData.get("data_aquisicao") as string,
      fornecedor:             (formData.get("fornecedor") as string)?.trim() || null,
      nota_fiscal:            (formData.get("nota_fiscal") as string)?.trim() || null,
      vida_util_anos:         formData.get("vida_util_anos") ? parseInt(formData.get("vida_util_anos") as string) : null,
      taxa_depreciacao_anual: formData.get("taxa_depreciacao_anual") ? parseFloat(formData.get("taxa_depreciacao_anual") as string) : null,
      valor_residual:         formData.get("valor_residual") ? parseFloat(formData.get("valor_residual") as string) : 0,
      localizacao_unit_id:    (formData.get("unit_id") as string) || null,
      responsavel_party_id:   (formData.get("responsavel_party_id") as string) || null,
      chart_account_id:       (formData.get("chart_account_id") as string) || null,
      status:                 "ATIVO",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  // Registrar movimento de aquisição
  await supabase.from("patrimony_movements").insert({
    ministry_id:         ctx.ministry_id,
    item_id:             item.id,
    tipo:                "AQUISICAO",
    data:                formData.get("data_aquisicao") as string,
    unit_to_id:          (formData.get("unit_id") as string) || null,
    descricao:           `Aquisição — ${(formData.get("nome") as string).trim()}`,
    responsavel_party_id: (formData.get("responsavel_party_id") as string) || null,
    valor:               valor_aquisicao,
  });

  return item.id;
}

// ── ATUALIZAR BEM ─────────────────────────────────────────────

export async function atualizarPatrimonyItemAction(id: string, formData: FormData): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const supabase = await createClient();

  const valor_aquisicao = parseFloat(formData.get("valor_aquisicao") as string);

  const { error } = await supabase
    .from("patrimony_items")
    .update({
      nome:                   (formData.get("nome") as string).trim(),
      descricao:              (formData.get("descricao") as string)?.trim() || null,
      categoria:              formData.get("categoria") as string,
      valor_aquisicao,
      data_aquisicao:         formData.get("data_aquisicao") as string,
      fornecedor:             (formData.get("fornecedor") as string)?.trim() || null,
      nota_fiscal:            (formData.get("nota_fiscal") as string)?.trim() || null,
      vida_util_anos:         formData.get("vida_util_anos") ? parseInt(formData.get("vida_util_anos") as string) : null,
      taxa_depreciacao_anual: formData.get("taxa_depreciacao_anual") ? parseFloat(formData.get("taxa_depreciacao_anual") as string) : null,
      valor_residual:         formData.get("valor_residual") ? parseFloat(formData.get("valor_residual") as string) : 0,
      responsavel_party_id:   (formData.get("responsavel_party_id") as string) || null,
      chart_account_id:       (formData.get("chart_account_id") as string) || null,
    })
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
}

// ── REGISTRAR MOVIMENTAÇÃO ────────────────────────────────────

export async function registrarMovimentoAction(itemId: string, formData: FormData): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const supabase = await createClient();

  const tipo = formData.get("tipo") as string;

  const { error } = await supabase.from("patrimony_movements").insert({
    ministry_id:         ctx.ministry_id,
    item_id:             itemId,
    tipo,
    data:                formData.get("data") as string,
    unit_from_id:        (formData.get("unit_from_id") as string) || null,
    unit_to_id:          (formData.get("unit_to_id") as string) || null,
    descricao:           (formData.get("descricao") as string).trim(),
    responsavel_party_id: (formData.get("responsavel_party_id") as string) || null,
    valor:               formData.get("valor") ? parseFloat(formData.get("valor") as string) : null,
  });
  if (error) throw new Error(error.message);
  // O trigger patrimony_movement_trigger atualiza status e localização automaticamente
}

// ── LISTAR MOVIMENTAÇÕES ─────────────────────────────────────

export async function listarMovimentosAction(itemId: string): Promise<PatrimonyMovementListItem[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("patrimony_movements")
    .select("*")
    .eq("item_id", itemId)
    .eq("ministry_id", ctx.ministry_id)
    .order("data", { ascending: false });
  if (error) throw new Error(error.message);

  const movs = (data ?? []) as PatrimonyMovement[];
  if (!movs.length) return [];

  const unitIds  = [...new Set([
    ...movs.map((m) => m.unit_from_id).filter(Boolean) as string[],
    ...movs.map((m) => m.unit_to_id).filter(Boolean) as string[],
  ])];
  const partyIds = [...new Set(movs.map((m) => m.responsavel_party_id).filter(Boolean) as string[])];

  const [unitsRes, partiesRes] = await Promise.all([
    unitIds.length  ? supabase.from("units").select("id, name").in("id", unitIds) : { data: [] },
    partyIds.length ? supabase.from("parties").select("id, full_name").in("id", partyIds) : { data: [] },
  ]);

  const unitMap  = Object.fromEntries((unitsRes.data  ?? []).map((u: any) => [u.id, u.name]));
  const partyMap = Object.fromEntries((partiesRes.data ?? []).map((p: any) => [p.id, p.full_name]));

  return movs.map((m) => ({
    ...m,
    unit_from_nome:    m.unit_from_id ? (unitMap[m.unit_from_id] ?? null) : null,
    unit_to_nome:      m.unit_to_id   ? (unitMap[m.unit_to_id]   ?? null) : null,
    responsavel_nome:  m.responsavel_party_id ? (partyMap[m.responsavel_party_id] ?? null) : null,
  }));
}

// ── REGISTRAR DEPRECIAÇÃO MENSAL ──────────────────────────────

export async function registrarDepreciacaoAction(itemId: string, ano: number, mes: number): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const supabase = await createClient();

  // Buscar item
  const { data: item, error: itemErr } = await supabase
    .from("patrimony_items")
    .select("*")
    .eq("id", itemId)
    .eq("ministry_id", ctx.ministry_id)
    .single();
  if (itemErr || !item) throw new Error("Item não encontrado");
  if (!item.taxa_depreciacao_anual) throw new Error("Item não possui taxa de depreciação configurada");

  // Calcular depreciação mensal
  const { data: deprMensal } = await supabase.rpc("calcular_depreciacao_mensal", { p_item_id: itemId });
  if (!deprMensal || deprMensal <= 0) throw new Error("Depreciação calculada é zero");

  // Calcular valor contábil atual
  const { data: valorContabil } = await supabase.rpc("calcular_valor_contabil", {
    p_item_id: itemId,
    p_ate_data: `${ano}-${String(mes).padStart(2, "0")}-28`,
  });

  const { error } = await supabase.from("patrimony_depreciations").insert({
    ministry_id:       ctx.ministry_id,
    item_id:           itemId,
    ano,
    mes,
    valor_depreciacao: deprMensal,
    valor_contabil:    Math.max(item.valor_residual ?? 0, (valorContabil ?? 0) - deprMensal),
  });
  if (error) {
    if (error.code === "23505") throw new Error(`Depreciação de ${mes}/${ano} já registrada`);
    throw new Error(error.message);
  }
}

// ── LISTAR DEPRECIAÇÕES DE UM ITEM ────────────────────────────

export async function listarDepreciacoesAction(itemId: string): Promise<PatrimonyDepreciation[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("patrimony_depreciations")
    .select("*")
    .eq("item_id", itemId)
    .eq("ministry_id", ctx.ministry_id)
    .order("ano", { ascending: false })
    .order("mes", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PatrimonyDepreciation[];
}

// ── SOFT-DELETE ───────────────────────────────────────────────

export async function softDeletePatrimonyItemAction(id: string): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const supabase = await createClient();

  const { error } = await supabase
    .from("patrimony_items")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
}

// ── ESTATÍSTICAS PARA DASHBOARD ───────────────────────────────

export type PatrimonoDashboardData = {
  total_itens:         number;
  total_valor_aquisicao: number;
  total_valor_contabil:  number;
  por_categoria: { categoria: string; qtd: number; valor: number }[];
  por_status:    { status: string; qtd: number }[];
};

export async function dashboardPatrimonioAction(): Promise<PatrimonoDashboardData> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("patrimony_items")
    .select("id, categoria, status, valor_aquisicao, valor_residual")
    .eq("ministry_id", ctx.ministry_id)
    .is("deleted_at", null)
    .eq("status", "ATIVO");  // só ativos no dashboard
  if (error) throw new Error(error.message);

  const items = (data ?? []) as any[];
  const itemIds = items.map((i: any) => i.id);

  // Depreciações acumuladas
  const { data: deprs } = await supabase
    .from("patrimony_depreciations")
    .select("item_id, valor_depreciacao")
    .in("item_id", itemIds);

  const deprMap: Record<string, number> = {};
  for (const d of (deprs ?? []) as any[]) {
    deprMap[d.item_id] = (deprMap[d.item_id] ?? 0) + d.valor_depreciacao;
  }

  const catMap: Record<string, { qtd: number; valor: number }> = {};
  const stMap:  Record<string, number> = {};

  let totalValorAquisicao = 0;
  let totalValorContabil  = 0;

  for (const item of items) {
    const deprAcum = deprMap[item.id] ?? 0;
    const vc = Math.max(item.valor_residual ?? 0, item.valor_aquisicao - deprAcum);

    totalValorAquisicao += item.valor_aquisicao;
    totalValorContabil  += vc;

    if (!catMap[item.categoria]) catMap[item.categoria] = { qtd: 0, valor: 0 };
    catMap[item.categoria].qtd++;
    catMap[item.categoria].valor += vc;

    stMap[item.status] = (stMap[item.status] ?? 0) + 1;
  }

  return {
    total_itens:           items.length,
    total_valor_aquisicao: totalValorAquisicao,
    total_valor_contabil:  totalValorContabil,
    por_categoria: Object.entries(catMap).map(([categoria, v]) => ({ categoria, ...v })),
    por_status:    Object.entries(stMap).map(([status, qtd]) => ({ status, qtd })),
  };
}

// ── REGRAS DE DEPRECIAÇÃO ─────────────────────────────────────

/** Lista todas as regras vigentes (globais + do ministério do usuário) */
export async function listarRegrasDepreciacaoAction(): Promise<PatrimonyDepreciationRule[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("patrimony_depreciation_rules")
    .select("*")
    .eq("is_active", true)
    .order("categoria")
    .order("tipo_aquisicao");

  if (error) throw new Error(error.message);
  return (data ?? []) as PatrimonyDepreciationRule[];
}

/** Busca taxa sugerida para uma combinação categoria + tipo_aquisicao */
export async function buscarTaxaSugeridaAction(
  categoria: string,
  tipo_aquisicao: string,
): Promise<TaxaDepreciacaoSugerida | null> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("buscar_taxa_depreciacao", {
    p_ministry_id: ctx.ministry_id,
    p_categoria:   categoria,
    p_tipo_aquis:  tipo_aquisicao,
    p_data:        new Date().toISOString().slice(0, 10),
  });

  if (error) return null;
  return (data?.[0] ?? null) as TaxaDepreciacaoSugerida | null;
}

/** Cria uma nova regra de depreciação específica para o ministério */
export async function criarRegraDepreciacaoAction(formData: FormData): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const supabase = await createClient();

  const { error } = await supabase.from("patrimony_depreciation_rules").insert({
    ministry_id:      ctx.ministryId,
    categoria:        formData.get("categoria") as string,
    tipo_aquisicao:   formData.get("tipo_aquisicao") as string,
    taxa_anual:       parseFloat(formData.get("taxa_anual") as string),
    vida_util_anos:   formData.get("vida_util_anos") ? parseInt(formData.get("vida_util_anos") as string) : null,
    metodo:           (formData.get("metodo") as string) || "LINEAR",
    norma_referencia: formData.get("norma_referencia") as string,
    notas:            (formData.get("notas") as string) || null,
    vigente_desde:    (formData.get("vigente_desde") as string) || new Date().toISOString().slice(0, 10),
    vigente_ate:      (formData.get("vigente_ate") as string) || null,
    is_active:        true,
  });

  if (error) throw new Error(error.message);
}

/** Atualiza uma regra (só do próprio ministério — regras globais: só super master) */
export async function atualizarRegraDepreciacaoAction(
  id: string,
  formData: FormData,
): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const supabase = await createClient();

  const { error } = await supabase
    .from("patrimony_depreciation_rules")
    .update({
      taxa_anual:       parseFloat(formData.get("taxa_anual") as string),
      vida_util_anos:   formData.get("vida_util_anos") ? parseInt(formData.get("vida_util_anos") as string) : null,
      metodo:           formData.get("metodo") as string,
      norma_referencia: formData.get("norma_referencia") as string,
      notas:            (formData.get("notas") as string) || null,
      vigente_ate:      (formData.get("vigente_ate") as string) || null,
      is_active:        formData.get("is_active") === "true",
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

/** Desativa uma regra (soft delete — mantém histórico) */
export async function desativarRegraDepreciacaoAction(id: string): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const supabase = await createClient();

  const { error } = await supabase
    .from("patrimony_depreciation_rules")
    .update({ is_active: false, vigente_ate: new Date().toISOString().slice(0, 10) })
    .eq("id", id);

  if (error) throw new Error(error.message);
}
