"use server";

import { createClient } from "@/utils/supabase/server";
import { getAuthContext, assertLevel } from "@/utils/supabase/auth-context";
import type {
  FinAccount,
  FinAccountWithSaldo,
  FinCategory,
  FinCategoryWithChildren,
  FinPaymentMethod,
  FinCostCenter,
  FinTitheJustification,
  FinDocumentType,
  FinPeriod,
  FinTransaction,
  FinTransactionListItem,
  FinTransfer,
  FinTransferListItem,
} from "@/types";

// ── CONTAS ────────────────────────────────────────────────────

export async function listarContasAction(): Promise<FinAccountWithSaldo[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("fin_accounts")
    .select("*")
    .eq("ministry_id", ctx.ministry_id)
    .is("deleted_at", null)
    .order("nome");
  if (error) throw new Error(error.message);
  if (!data?.length) return [];

  // Buscar unidades para nomes
  const unitIds = [...new Set(data.map((a) => a.unit_id).filter(Boolean))] as string[];
  const { data: units } = unitIds.length
    ? await supabase.from("units").select("id, name").in("id", unitIds)
    : { data: [] };
  const unitMap = Object.fromEntries((units ?? []).map((u: any) => [u.id, u.name]));

  // Calcular saldos via RPC
  const saldos = await Promise.all(
    data.map((a) =>
      supabase.rpc("calcular_saldo_conta", { p_account_id: a.id }).then((r) => ({
        id: a.id,
        saldo: r.data ?? 0,
      }))
    )
  );
  const saldoMap = Object.fromEntries(saldos.map((s) => [s.id, s.saldo]));

  return data.map((a) => ({
    ...(a as FinAccount),
    saldo_atual: saldoMap[a.id] ?? 0,
    unit_nome:   a.unit_id ? (unitMap[a.unit_id] ?? null) : null,
  }));
}

export async function criarContaAction(formData: FormData): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const supabase = await createClient();

  const { error } = await supabase.from("fin_accounts").insert({
    ministry_id:   ctx.ministry_id,
    unit_id:       (formData.get("unit_id") as string) || null,
    nome:          (formData.get("nome") as string).trim(),
    tipo:          (formData.get("tipo") as string) || "CAIXA",
    banco:         (formData.get("banco") as string)?.trim() || null,
    agencia:       (formData.get("agencia") as string)?.trim() || null,
    conta:         (formData.get("conta") as string)?.trim() || null,
    digito:        (formData.get("digito") as string)?.trim() || null,
    chave_pix:     (formData.get("chave_pix") as string)?.trim() || null,
    saldo_inicial: parseFloat((formData.get("saldo_inicial") as string) || "0") || 0,
  });
  if (error) throw new Error(error.message);
}

export async function editarContaAction(id: string, formData: FormData): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const supabase = await createClient();

  const { error } = await supabase
    .from("fin_accounts")
    .update({
      nome:      (formData.get("nome") as string).trim(),
      tipo:      (formData.get("tipo") as string) || "CAIXA",
      banco:     (formData.get("banco") as string)?.trim() || null,
      agencia:   (formData.get("agencia") as string)?.trim() || null,
      conta:     (formData.get("conta") as string)?.trim() || null,
      digito:    (formData.get("digito") as string)?.trim() || null,
      chave_pix: (formData.get("chave_pix") as string)?.trim() || null,
    })
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
}

// ── PLANO DE CONTAS ───────────────────────────────────────────

export async function listarCategoriasAction(): Promise<FinCategoryWithChildren[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("fin_categories")
    .select("*")
    .eq("ministry_id", ctx.ministry_id)
    .order("codigo");
  if (error) throw new Error(error.message);

  const all = (data ?? []) as FinCategory[];
  const roots = all.filter((c) => !c.parent_id);
  return roots.map((r) => ({
    ...r,
    children: all.filter((c) => c.parent_id === r.id).map((c2) => ({
      ...c2,
      children: all.filter((c3) => c3.parent_id === c2.id),
    })) as FinCategory[],
  }));
}

export async function listarCategoriasPlanaAction(): Promise<FinCategory[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("fin_categories")
    .select("*")
    .eq("ministry_id", ctx.ministry_id)
    .eq("is_active", true)
    .order("codigo");
  if (error) throw new Error(error.message);
  return (data ?? []) as FinCategory[];
}

export async function criarCategoriaAction(formData: FormData): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const supabase = await createClient();

  const { error } = await supabase.from("fin_categories").insert({
    ministry_id:    ctx.ministry_id,
    parent_id:      (formData.get("parent_id") as string) || null,
    codigo:         (formData.get("codigo") as string).trim(),
    nome:           (formData.get("nome") as string).trim(),
    tipo:           (formData.get("tipo") as string) || "RECEITA",
    fundo:          (formData.get("fundo") as string) || "OUTRO",
    codigo_contabil:(formData.get("codigo_contabil") as string)?.trim() || null,
    ordem:          parseInt(formData.get("ordem") as string) || 0,
  });
  if (error) throw new Error(error.message);
}

// ── TABELAS LOOKUP ────────────────────────────────────────────

export async function listarLookupFinAction(): Promise<{
  paymentMethods:      FinPaymentMethod[];
  costCenters:         FinCostCenter[];
  titheJustifications: FinTitheJustification[];
  documentTypes:       FinDocumentType[];
}> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const [pm, cc, tj, dt] = await Promise.all([
    supabase.from("fin_payment_methods").select("*").eq("ministry_id", ctx.ministry_id).eq("is_active", true).order("nome"),
    supabase.from("fin_cost_centers").select("*").eq("ministry_id", ctx.ministry_id).eq("is_active", true).order("nome"),
    supabase.from("fin_tithe_justifications").select("*").eq("ministry_id", ctx.ministry_id).eq("is_active", true).order("nome"),
    supabase.from("fin_document_types").select("*").eq("ministry_id", ctx.ministry_id).eq("is_active", true).order("nome"),
  ]);

  return {
    paymentMethods:      (pm.data ?? []) as FinPaymentMethod[],
    costCenters:         (cc.data ?? []) as FinCostCenter[],
    titheJustifications: (tj.data ?? []) as FinTitheJustification[],
    documentTypes:       (dt.data ?? []) as FinDocumentType[],
  };
}

// ── PERÍODOS (CAIXAS MENSAIS) ─────────────────────────────────

export async function listarPeriodosAction(): Promise<FinPeriod[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("fin_periods")
    .select("*")
    .eq("ministry_id", ctx.ministry_id)
    .order("ano", { ascending: false })
    .order("mes", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as FinPeriod[];
}

export async function abrirPeriodoAction(mes: number, ano: number, unit_id: string | null): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const supabase = await createClient();

  // Buscar saldo_final do período anterior para usar como saldo_inicial
  const mesPrev = mes === 1 ? 12 : mes - 1;
  const anoPrev = mes === 1 ? ano - 1 : ano;
  const { data: prev } = await supabase
    .from("fin_periods")
    .select("saldo_final")
    .eq("ministry_id", ctx.ministry_id)
    .eq("mes", mesPrev)
    .eq("ano", anoPrev)
    .eq("unit_id", unit_id ?? null)
    .maybeSingle();

  const { error } = await supabase.from("fin_periods").upsert({
    ministry_id:   ctx.ministry_id,
    unit_id:       unit_id ?? null,
    mes, ano,
    status:        "ABERTO",
    saldo_inicial: prev?.saldo_final ?? 0,
  }, { onConflict: "ministry_id,unit_id,mes,ano" });
  if (error) throw new Error(error.message);
}

export async function fecharPeriodoAction(period_id: string): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const supabase = await createClient();

  // Calcular saldo final de todas as contas do ministério
  const { data: period } = await supabase
    .from("fin_periods")
    .select("mes, ano, unit_id")
    .eq("id", period_id)
    .single();
  if (!period) throw new Error("Período não encontrado");

  const dataFim = new Date(period.ano, period.mes, 0).toISOString().slice(0, 10);

  const { data: accounts } = await supabase
    .from("fin_accounts")
    .select("id")
    .eq("ministry_id", ctx.ministry_id)
    .is("deleted_at", null);

  let saldoTotal = 0;
  if (accounts?.length) {
    const saldos = await Promise.all(
      accounts.map((a) =>
        supabase.rpc("calcular_saldo_conta", { p_account_id: a.id, p_ate_data: dataFim })
          .then((r) => r.data ?? 0)
      )
    );
    saldoTotal = saldos.reduce((acc, s) => acc + s, 0);
  }

  const { error } = await supabase
    .from("fin_periods")
    .update({
      status:          "FECHADO",
      saldo_final:     saldoTotal,
      data_fechamento: new Date().toISOString(),
    })
    .eq("id", period_id)
    .eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
}

// ── LANÇAMENTOS ───────────────────────────────────────────────

export type LancamentosFilter = {
  tipo?:       "ENTRADA" | "SAIDA" | "";
  account_id?: string;
  category_id?: string;
  status?:     string;
  data_de?:    string;
  data_ate?:   string;
  limit?:      number;
  offset?:     number;
  mostrar_excluidos?: boolean;
};

export async function listarLancamentosAction(
  filter: LancamentosFilter = {}
): Promise<{ data: FinTransactionListItem[]; total: number }> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  let q = supabase
    .from("fin_transactions")
    .select("*", { count: "exact" })
    .eq("ministry_id", ctx.ministry_id);

  if (!filter.mostrar_excluidos) q = q.is("deleted_at", null);
  if (filter.tipo)        q = q.eq("tipo", filter.tipo);
  if (filter.account_id)  q = q.eq("account_id", filter.account_id);
  if (filter.category_id) q = q.eq("category_id", filter.category_id);
  if (filter.status)      q = q.eq("status", filter.status);
  if (filter.data_de)     q = q.gte("data", filter.data_de);
  if (filter.data_ate)    q = q.lte("data", filter.data_ate);

  q = q.order("data", { ascending: false })
       .order("created_at", { ascending: false });

  const lim = filter.limit ?? 50;
  const off = filter.offset ?? 0;
  q = q.range(off, off + lim - 1);

  const { data, error, count } = await q;
  if (error) throw new Error(error.message);
  if (!data?.length) return { data: [], total: count ?? 0 };

  // Enriquecer com nomes
  const accountIds  = [...new Set(data.map((t) => t.account_id))];
  const categoryIds = [...new Set(data.map((t) => t.category_id))];
  const partyIds    = [...new Set(data.map((t) => t.party_id).filter(Boolean))] as string[];
  const pmIds       = [...new Set(data.map((t) => t.payment_method_id).filter(Boolean))] as string[];
  const ccIds       = [...new Set(data.map((t) => t.cost_center_id).filter(Boolean))] as string[];

  const [accs, cats, parties, pms, ccs] = await Promise.all([
    supabase.from("fin_accounts").select("id, nome").in("id", accountIds),
    supabase.from("fin_categories").select("id, nome, codigo").in("id", categoryIds),
    partyIds.length ? supabase.from("parties").select("id, full_name").in("id", partyIds) : { data: [] },
    pmIds.length ? supabase.from("fin_payment_methods").select("id, nome").in("id", pmIds) : { data: [] },
    ccIds.length ? supabase.from("fin_cost_centers").select("id, nome").in("id", ccIds) : { data: [] },
  ]);

  const accMap   = Object.fromEntries((accs.data ?? []).map((a: any) => [a.id, a.nome]));
  const catMap   = Object.fromEntries((cats.data ?? []).map((c: any) => [c.id, { nome: c.nome, codigo: c.codigo }]));
  const partyMap = Object.fromEntries((parties.data ?? []).map((p: any) => [p.id, p.full_name]));
  const pmMap    = Object.fromEntries((pms.data ?? []).map((p: any) => [p.id, p.nome]));
  const ccMap    = Object.fromEntries((ccs.data ?? []).map((c: any) => [c.id, c.nome]));

  return {
    data: data.map((t) => ({
      ...(t as FinTransaction),
      account_nome:        accMap[t.account_id] ?? "",
      category_nome:       catMap[t.category_id]?.nome ?? "",
      category_codigo:     catMap[t.category_id]?.codigo ?? "",
      party_nome:          t.party_id ? (partyMap[t.party_id] ?? null) : null,
      payment_method_nome: t.payment_method_id ? (pmMap[t.payment_method_id] ?? null) : null,
      cost_center_nome:    t.cost_center_id ? (ccMap[t.cost_center_id] ?? null) : null,
    })),
    total: count ?? 0,
  };
}

export async function criarLancamentoAction(formData: FormData): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const tipo  = formData.get("tipo") as string;
  const valor = parseFloat(formData.get("valor") as string);
  if (!valor || valor <= 0) throw new Error("Valor deve ser maior que zero");

  const { error } = await supabase.from("fin_transactions").insert({
    ministry_id:             ctx.ministry_id,
    unit_id:                 (formData.get("unit_id") as string) || null,
    account_id:              formData.get("account_id") as string,
    category_id:             formData.get("category_id") as string,
    party_id:                (formData.get("party_id") as string) || null,
    payment_method_id:       (formData.get("payment_method_id") as string) || null,
    cost_center_id:          (formData.get("cost_center_id") as string) || null,
    document_type_id:        (formData.get("document_type_id") as string) || null,
    justificativa_dizimo_id: (formData.get("justificativa_dizimo_id") as string) || null,
    tipo,
    valor,
    data:                    formData.get("data") as string,
    numero_documento:        (formData.get("numero_documento") as string)?.trim() || null,
    descricao:               (formData.get("descricao") as string)?.trim() || null,
    status:                  "PENDENTE",
    criado_por:              user?.id ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function aprovarLancamentoAction(id: string): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Verificar que não está aprovado/estornado
  const { data: tx } = await supabase.from("fin_transactions").select("status").eq("id", id).single();
  if (!tx || tx.status !== "PENDENTE") throw new Error("Lançamento não está pendente");

  const { error } = await supabase
    .from("fin_transactions")
    .update({ status: "APROVADO", aprovado_por: user?.id ?? null })
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
}

export async function rejeitarLancamentoAction(id: string): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const supabase = await createClient();

  const { data: tx } = await supabase.from("fin_transactions").select("status").eq("id", id).single();
  if (!tx || tx.status !== "PENDENTE") throw new Error("Lançamento não está pendente");

  const { error } = await supabase
    .from("fin_transactions")
    .update({ status: "REJEITADO" })
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
}

export async function estornarLancamentoAction(id: string): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: tx } = await supabase
    .from("fin_transactions")
    .select("*")
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id)
    .single();
  if (!tx || tx.status !== "APROVADO") throw new Error("Apenas lançamentos APROVADOS podem ser estornados");

  // Criar lançamento de estorno (tipo invertido, mesmo valor)
  const tipoEstorno = tx.tipo === "ENTRADA" ? "SAIDA" : "ENTRADA";
  const { error: eErr } = await supabase.from("fin_transactions").insert({
    ministry_id:   ctx.ministry_id,
    unit_id:       tx.unit_id,
    account_id:    tx.account_id,
    category_id:   tx.category_id,
    tipo:          tipoEstorno,
    valor:         tx.valor,
    data:          new Date().toISOString().slice(0, 10),
    descricao:     `Estorno: ${tx.descricao ?? ""}`,
    estorno_de_id: id,
    status:        "APROVADO",
    criado_por:    user?.id ?? null,
    aprovado_por:  user?.id ?? null,
  });
  if (eErr) throw new Error(eErr.message);

  // Marcar original como ESTORNADO
  await supabase
    .from("fin_transactions")
    .update({ status: "ESTORNADO" })
    .eq("id", id);
}

export async function softDeleteLancamentoAction(id: string): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const supabase = await createClient();

  const { error } = await supabase
    .from("fin_transactions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id)
    .neq("status", "APROVADO"); // Aprovado só pode ser estornado
  if (error) throw new Error(error.message);
}

// ── TRANSFERÊNCIAS ────────────────────────────────────────────

export async function listarTransferenciasAction(): Promise<FinTransferListItem[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("fin_transfers")
    .select("*")
    .eq("ministry_id", ctx.ministry_id)
    .is("deleted_at", null)
    .order("data", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  if (!data?.length) return [];

  const accountIds = [...new Set([
    ...data.map((t) => t.account_from_id),
    ...data.map((t) => t.account_to_id),
  ])];
  const { data: accs } = await supabase.from("fin_accounts").select("id, nome").in("id", accountIds);
  const accMap = Object.fromEntries((accs ?? []).map((a: any) => [a.id, a.nome]));

  return data.map((t) => ({
    ...(t as FinTransfer),
    account_from_nome: accMap[t.account_from_id] ?? "",
    account_to_nome:   accMap[t.account_to_id] ?? "",
  }));
}

export async function criarTransferenciaAction(formData: FormData): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const valor = parseFloat(formData.get("valor") as string);
  if (!valor || valor <= 0) throw new Error("Valor deve ser maior que zero");

  const { error } = await supabase.rpc("executar_transferencia", {
    p_ministry_id:     ctx.ministry_id,
    p_unit_id:         (formData.get("unit_id") as string) || null,
    p_account_from_id: formData.get("account_from_id") as string,
    p_account_to_id:   formData.get("account_to_id") as string,
    p_valor:           valor,
    p_data:            formData.get("data") as string,
    p_descricao:       (formData.get("descricao") as string)?.trim() || null,
    p_criado_por:      user?.id ?? null,
  });
  if (error) throw new Error(error.message);
}

// ── PLANO DE CONTAS PROFISSIONAL (chart_of_accounts) ─────────

import type {
  ChartOfAccount,
  ChartOfAccountWithChildren,
  ChartAccountType,
} from "@/types";

export async function listarChartOfAccountsAction(): Promise<ChartOfAccountWithChildren[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chart_of_accounts")
    .select("*")
    .eq("ministry_id", ctx.ministry_id)
    .eq("is_active", true)
    .order("code");
  if (error) throw new Error(error.message);

  const all = (data ?? []) as ChartOfAccount[];

  function buildTree(parentId: string | null): ChartOfAccountWithChildren[] {
    return all
      .filter((c) => c.parent_id === parentId)
      .map((c) => ({ ...c, children: buildTree(c.id) }));
  }
  return buildTree(null);
}

export async function listarChartOfAccountsPlanaAction(
  type?: ChartAccountType
): Promise<ChartOfAccount[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  let q = supabase
    .from("chart_of_accounts")
    .select("*")
    .eq("ministry_id", ctx.ministry_id)
    .eq("is_active", true)
    .eq("is_analytical", true); // apenas analíticas para dropdowns
  if (type) q = q.eq("type", type);
  q = q.order("code");

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as ChartOfAccount[];
}

export async function criarChartAccountAction(formData: FormData): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const supabase = await createClient();

  const parent_id = (formData.get("parent_id") as string) || null;
  let account_level = 1;
  if (parent_id) {
    const { data: parent } = await supabase
      .from("chart_of_accounts")
      .select("account_level")
      .eq("id", parent_id)
      .single();
    account_level = (parent?.account_level ?? 0) + 1;
    if (account_level > 5) throw new Error("Profundidade máxima de 5 níveis atingida");
  }

  const is_analytical = account_level === 5;

  const { error } = await supabase.from("chart_of_accounts").insert({
    ministry_id:   ctx.ministry_id,
    parent_id,
    code:          (formData.get("code") as string).trim(),
    name:          (formData.get("name") as string).trim(),
    type:          formData.get("type") as string,
    nature:        formData.get("nature") as string,
    account_level,
    is_analytical,
  });
  if (error) throw new Error(error.message);
}

export async function toggleChartAccountAction(id: string, is_active: boolean): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const supabase = await createClient();

  const { error } = await supabase
    .from("chart_of_accounts")
    .update({ is_active })
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
}

// ── BUSCA DE MEMBROS / PESSOAS ────────────────────────────────

export async function buscarMembrosParaLancamentoAction(
  q: string
): Promise<{ id: string; nome_completo: string; matricula: string }[]> {
  if (!q.trim()) return [];
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const supabase = await createClient();

  const { data: parties } = await supabase
    .from("parties")
    .select("id, full_name")
    .eq("ministry_id", ctx.ministry_id)
    .eq("is_active", true)
    .ilike("full_name", `%${q.trim()}%`)
    .order("full_name")
    .limit(8);

  if (!parties?.length) return [];
  const partyIds = parties.map((p) => p.id);

  const { data: pmList } = await supabase
    .from("party_members")
    .select("party_id, matricula")
    .in("party_id", partyIds)
    .eq("ministry_id", ctx.ministry_id);

  const matriculaMap = Object.fromEntries(
    (pmList ?? []).map((pm: any) => [pm.party_id, pm.matricula ?? ""])
  );

  return parties.map((p: any) => ({
    id:            p.id,
    nome_completo: p.full_name ?? "",
    matricula:     matriculaMap[p.id] ?? "",
  }));
}

// ── DASHBOARD FINANCEIRO ──────────────────────────────────────

export type FinDashboardData = {
  saldo_total:       number;
  receitas_mes:      number;
  despesas_mes:      number;
  pendentes:         number;
  contas:            FinAccountWithSaldo[];
  ultimos_lancamentos: FinTransactionListItem[];
};

export async function buscarDashboardFinanceiroAction(): Promise<FinDashboardData> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);

  const [contas, { data: lancamentos }] = await Promise.all([
    listarContasAction(),
    listarLancamentosAction({ limit: 10 }),
  ]);

  const agora = new Date();
  const inicio_mes = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-01`;

  const supabase = await createClient();

  const [{ data: rec }, { data: desp }, { count: pendentes }] = await Promise.all([
    supabase
      .from("fin_transactions")
      .select("valor")
      .eq("ministry_id", ctx.ministry_id)
      .eq("tipo", "ENTRADA")
      .eq("status", "APROVADO")
      .gte("data", inicio_mes)
      .is("deleted_at", null),
    supabase
      .from("fin_transactions")
      .select("valor")
      .eq("ministry_id", ctx.ministry_id)
      .eq("tipo", "SAIDA")
      .eq("status", "APROVADO")
      .gte("data", inicio_mes)
      .is("deleted_at", null),
    supabase
      .from("fin_transactions")
      .select("id", { count: "exact", head: true })
      .eq("ministry_id", ctx.ministry_id)
      .eq("status", "PENDENTE")
      .is("deleted_at", null),
  ]);

  const receitas_mes = (rec ?? []).reduce((acc, t) => acc + (t.valor ?? 0), 0);
  const despesas_mes = (desp ?? []).reduce((acc, t) => acc + (t.valor ?? 0), 0);
  const saldo_total  = contas.reduce((acc, c) => acc + c.saldo_atual, 0);

  return {
    saldo_total,
    receitas_mes,
    despesas_mes,
    pendentes: pendentes ?? 0,
    contas,
    ultimos_lancamentos: lancamentos,
  };
}

// ═══════════════════════════════════════════════════════════════
// FASE 7B — PROJETOS FINANCEIROS
// ═══════════════════════════════════════════════════════════════

import type {
  FinProject,
  FinProjectWithStats,
  FinInstallmentPlan,
  FinInstallmentPlanListItem,
  FinInstallment,
  FinRecurring,
  FinRecurringListItem,
  FinUnitRepasse,
  FinUnitRepasseListItem,
  FinRepasseRule,
} from "@/types";

export async function listarProjetosAction(): Promise<FinProjectWithStats[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("fin_projects")
    .select("*")
    .eq("ministry_id", ctx.ministry_id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const projects = (data ?? []) as FinProject[];
  if (!projects.length) return [];

  const projectIds = projects.map((p) => p.id);

  // Buscar totais de lançamentos por projeto
  const { data: txList } = await supabase
    .from("fin_transactions")
    .select("project_id, tipo, valor")
    .in("project_id", projectIds)
    .eq("ministry_id", ctx.ministry_id)
    .eq("status", "APROVADO")
    .is("deleted_at", null);

  const statsMap: Record<string, { total_receitas: number; total_despesas: number }> = {};
  for (const tx of txList ?? []) {
    if (!statsMap[tx.project_id]) statsMap[tx.project_id] = { total_receitas: 0, total_despesas: 0 };
    if (tx.tipo === "ENTRADA") statsMap[tx.project_id].total_receitas += tx.valor;
    else statsMap[tx.project_id].total_despesas += tx.valor;
  }

  // Buscar nomes de responsáveis (parties) e unidades
  const partyIds = [...new Set(projects.map((p) => p.responsavel_party_id).filter(Boolean) as string[])];
  const unitIds  = [...new Set(projects.map((p) => p.unit_id).filter(Boolean) as string[])];

  const [partiesRes, unitsRes] = await Promise.all([
    partyIds.length ? supabase.from("parties").select("id, full_name").in("id", partyIds) : { data: [] },
    unitIds.length  ? supabase.from("units").select("id, name").in("id", unitIds) : { data: [] },
  ]);

  const partyMap = Object.fromEntries((partiesRes.data ?? []).map((p: any) => [p.id, p.full_name]));
  const unitMap  = Object.fromEntries((unitsRes.data  ?? []).map((u: any) => [u.id, u.name]));

  return projects.map((p) => {
    const s = statsMap[p.id] ?? { total_receitas: 0, total_despesas: 0 };
    return {
      ...p,
      responsavel_nome: p.responsavel_party_id ? (partyMap[p.responsavel_party_id] ?? null) : null,
      unit_nome:        p.unit_id ? (unitMap[p.unit_id] ?? null) : null,
      total_receitas:   s.total_receitas,
      total_despesas:   s.total_despesas,
      saldo:            s.total_receitas - s.total_despesas,
    };
  });
}

export async function buscarProjetoAction(id: string): Promise<FinProjectWithStats> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("fin_projects")
    .select("*")
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id)
    .single();
  if (error) throw new Error(error.message);

  const p = data as FinProject;

  const [txRes, partyRes, unitRes] = await Promise.all([
    supabase.from("fin_transactions").select("tipo, valor").eq("project_id", id).eq("status", "APROVADO").is("deleted_at", null),
    p.responsavel_party_id ? supabase.from("parties").select("full_name").eq("id", p.responsavel_party_id).single() : null,
    p.unit_id ? supabase.from("units").select("name").eq("id", p.unit_id).single() : null,
  ]);

  const txs = txRes.data ?? [];
  const total_receitas = txs.filter((t: any) => t.tipo === "ENTRADA").reduce((a: number, t: any) => a + t.valor, 0);
  const total_despesas = txs.filter((t: any) => t.tipo === "SAIDA").reduce((a: number, t: any) => a + t.valor, 0);

  return {
    ...p,
    responsavel_nome: (partyRes as any)?.data?.full_name ?? null,
    unit_nome:        (unitRes  as any)?.data?.name ?? null,
    total_receitas,
    total_despesas,
    saldo: total_receitas - total_despesas,
  };
}

export async function criarProjetoAction(formData: FormData): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const supabase = await createClient();

  const orcamento = formData.get("orcamento_total") ? parseFloat(formData.get("orcamento_total") as string) : null;

  const { error } = await supabase.from("fin_projects").insert({
    ministry_id:          ctx.ministry_id,
    unit_id:              (formData.get("unit_id") as string) || null,
    nome:                 (formData.get("nome") as string).trim(),
    descricao:            (formData.get("descricao") as string)?.trim() || null,
    tipo:                 formData.get("tipo") as string,
    status:               (formData.get("status") as string) || "ATIVO",
    orcamento_total:      orcamento,
    data_inicio:          (formData.get("data_inicio") as string) || null,
    data_fim_prevista:    (formData.get("data_fim_prevista") as string) || null,
    responsavel_party_id: (formData.get("responsavel_party_id") as string) || null,
  });
  if (error) throw new Error(error.message);
}

export async function atualizarStatusProjetoAction(id: string, status: string): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const supabase = await createClient();

  const update: Record<string, any> = { status };
  if (status === "CONCLUIDO") update.data_conclusao = new Date().toISOString().slice(0, 10);

  const { error } = await supabase
    .from("fin_projects")
    .update(update)
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
}

// ═══════════════════════════════════════════════════════════════
// FASE 7B — PARCELAMENTOS
// ═══════════════════════════════════════════════════════════════

export async function listarParcelamentosAction(): Promise<FinInstallmentPlanListItem[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("fin_installment_plans")
    .select("*")
    .eq("ministry_id", ctx.ministry_id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const plans = (data ?? []) as FinInstallmentPlan[];
  if (!plans.length) return [];

  const planIds    = plans.map((p) => p.id);
  const accIds     = [...new Set(plans.map((p) => p.account_id))];
  const catIds     = [...new Set(plans.map((p) => p.category_id))];
  const partyIds   = [...new Set(plans.map((p) => p.party_id).filter(Boolean) as string[])];

  const [accsRes, catsRes, partiesRes, installsRes] = await Promise.all([
    supabase.from("fin_accounts").select("id, nome").in("id", accIds),
    supabase.from("fin_categories").select("id, nome").in("id", catIds),
    partyIds.length ? supabase.from("parties").select("id, full_name").in("id", partyIds) : { data: [] },
    supabase.from("fin_installments").select("plan_id, status, valor").in("plan_id", planIds),
  ]);

  const accMap   = Object.fromEntries((accsRes.data ?? []).map((a: any) => [a.id, a.nome]));
  const catMap   = Object.fromEntries((catsRes.data ?? []).map((c: any) => [c.id, c.nome]));
  const partyMap = Object.fromEntries((partiesRes.data ?? []).map((p: any) => [p.id, p.full_name]));

  const statsPerPlan: Record<string, { pagas: number; atrasadas: number; valor_pago: number }> = {};
  for (const inst of (installsRes.data ?? []) as any[]) {
    if (!statsPerPlan[inst.plan_id]) statsPerPlan[inst.plan_id] = { pagas: 0, atrasadas: 0, valor_pago: 0 };
    if (inst.status === "PAGO") { statsPerPlan[inst.plan_id].pagas++; statsPerPlan[inst.plan_id].valor_pago += inst.valor; }
    if (inst.status === "ATRASADO") statsPerPlan[inst.plan_id].atrasadas++;
  }

  return plans.map((p) => ({
    ...p,
    account_nome:  accMap[p.account_id] ?? "",
    category_nome: catMap[p.category_id] ?? "",
    party_nome:    p.party_id ? (partyMap[p.party_id] ?? null) : null,
    ...(statsPerPlan[p.id] ?? { pagas: 0, atrasadas: 0, valor_pago: 0 }),
  }));
}

export async function buscarParcelasAction(plan_id: string): Promise<FinInstallment[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("fin_installments")
    .select("*")
    .eq("plan_id", plan_id)
    .order("numero");
  if (error) throw new Error(error.message);
  return (data ?? []) as FinInstallment[];
}

export async function criarParcelamentoAction(formData: FormData): Promise<string> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const num_parcelas  = parseInt(formData.get("num_parcelas") as string);
  const valor_total   = parseFloat(formData.get("valor_total") as string);
  const valor_parcela = Math.round((valor_total / num_parcelas) * 100) / 100;

  if (!num_parcelas || num_parcelas < 1) throw new Error("Número de parcelas inválido");
  if (!valor_total || valor_total <= 0) throw new Error("Valor total inválido");

  const { data, error } = await supabase
    .from("fin_installment_plans")
    .insert({
      ministry_id:           ctx.ministry_id,
      unit_id:               (formData.get("unit_id") as string) || null,
      descricao:             (formData.get("descricao") as string).trim(),
      tipo:                  formData.get("tipo") as string,
      account_id:            formData.get("account_id") as string,
      category_id:           formData.get("category_id") as string,
      party_id:              (formData.get("party_id") as string) || null,
      project_id:            (formData.get("project_id") as string) || null,
      valor_total,
      num_parcelas,
      valor_parcela,
      periodicidade:         formData.get("periodicidade") as string,
      data_primeira_parcela: formData.get("data_primeira_parcela") as string,
      observacoes:           (formData.get("observacoes") as string)?.trim() || null,
      criado_por:            user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  // Gerar parcelas via função do banco
  const { error: fnErr } = await supabase.rpc("gerar_parcelas", { p_plan_id: data.id });
  if (fnErr) throw new Error(fnErr.message);

  return data.id;
}

export async function pagarParcelaAction(installmentId: string, formData: FormData): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Buscar dados da parcela e do plano
  const { data: inst, error: instErr } = await supabase
    .from("fin_installments")
    .select("*, fin_installment_plans(*)")
    .eq("id", installmentId)
    .single();
  if (instErr || !inst) throw new Error("Parcela não encontrada");

  const plan = (inst as any).fin_installment_plans as FinInstallmentPlan;

  // Criar lançamento financeiro
  const { data: tx, error: txErr } = await supabase.from("fin_transactions").insert({
    ministry_id:  ctx.ministry_id,
    account_id:   plan.account_id,
    category_id:  plan.category_id,
    party_id:     plan.party_id,
    project_id:   plan.project_id,
    tipo:         plan.tipo,
    valor:        inst.valor,
    data:         (formData.get("data_pagamento") as string) || new Date().toISOString().slice(0, 10),
    descricao:    `${plan.descricao} — Parcela ${inst.numero}/${plan.num_parcelas}`,
    status:       "APROVADO",
    criado_por:   user?.id ?? null,
    installment_id: installmentId,
  }).select("id").single();
  if (txErr) throw new Error(txErr.message);

  // Atualizar parcela
  await supabase
    .from("fin_installments")
    .update({ status: "PAGO", transaction_id: tx.id, data_pagamento: (formData.get("data_pagamento") as string) || new Date().toISOString().slice(0, 10) })
    .eq("id", installmentId);

  // Verificar se todas estão pagas → fechar plano
  const { data: pendentes } = await supabase
    .from("fin_installments")
    .select("id")
    .eq("plan_id", plan.id)
    .in("status", ["PENDENTE", "ATRASADO"]);

  if (!pendentes?.length) {
    await supabase.from("fin_installment_plans").update({ status: "QUITADO" }).eq("id", plan.id);
  }
}

// ═══════════════════════════════════════════════════════════════
// FASE 7B — PROGRAMAÇÕES RECORRENTES
// ═══════════════════════════════════════════════════════════════

export async function listarRecorrentesAction(): Promise<FinRecurringListItem[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("fin_recurring_transactions")
    .select("*")
    .eq("ministry_id", ctx.ministry_id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const recurrings = (data ?? []) as FinRecurring[];
  if (!recurrings.length) return [];

  const accIds   = [...new Set(recurrings.map((r) => r.account_id))];
  const catIds   = [...new Set(recurrings.map((r) => r.category_id))];
  const partyIds = [...new Set(recurrings.map((r) => r.party_id).filter(Boolean) as string[])];

  const [accsRes, catsRes, partiesRes] = await Promise.all([
    supabase.from("fin_accounts").select("id, nome").in("id", accIds),
    supabase.from("fin_categories").select("id, nome").in("id", catIds),
    partyIds.length ? supabase.from("parties").select("id, full_name").in("id", partyIds) : { data: [] },
  ]);

  const accMap   = Object.fromEntries((accsRes.data ?? []).map((a: any) => [a.id, a.nome]));
  const catMap   = Object.fromEntries((catsRes.data ?? []).map((c: any) => [c.id, c.nome]));
  const partyMap = Object.fromEntries((partiesRes.data ?? []).map((p: any) => [p.id, p.full_name]));

  return recurrings.map((r) => ({
    ...r,
    account_nome:  accMap[r.account_id] ?? "",
    category_nome: catMap[r.category_id] ?? "",
    party_nome:    r.party_id ? (partyMap[r.party_id] ?? null) : null,
  }));
}

export async function criarRecorrenteAction(formData: FormData): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const valor = parseFloat(formData.get("valor") as string);
  if (!valor || valor <= 0) throw new Error("Valor inválido");

  const data_inicio = formData.get("data_inicio") as string;

  const { error } = await supabase.from("fin_recurring_transactions").insert({
    ministry_id:    ctx.ministry_id,
    unit_id:        (formData.get("unit_id") as string) || null,
    descricao:      (formData.get("descricao") as string).trim(),
    tipo:           formData.get("tipo") as string,
    account_id:     formData.get("account_id") as string,
    category_id:    formData.get("category_id") as string,
    party_id:       (formData.get("party_id") as string) || null,
    project_id:     (formData.get("project_id") as string) || null,
    valor,
    periodicidade:  formData.get("periodicidade") as string,
    dia_vencimento: formData.get("dia_vencimento") ? parseInt(formData.get("dia_vencimento") as string) : null,
    data_inicio,
    data_fim:       (formData.get("data_fim") as string) || null,
    status:         "ATIVO",
    proxima_geracao: data_inicio,
    criado_por:     user?.id ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function gerarLancamentoRecorrenteAction(recurringId: string): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: rec, error: recErr } = await supabase
    .from("fin_recurring_transactions")
    .select("*")
    .eq("id", recurringId)
    .eq("ministry_id", ctx.ministry_id)
    .single();
  if (recErr || !rec) throw new Error("Programação não encontrada");

  const hoje = new Date().toISOString().slice(0, 10);

  const { error: txErr } = await supabase.from("fin_transactions").insert({
    ministry_id:  ctx.ministry_id,
    account_id:   rec.account_id,
    category_id:  rec.category_id,
    party_id:     rec.party_id,
    project_id:   rec.project_id,
    tipo:         rec.tipo,
    valor:        rec.valor,
    data:         rec.proxima_geracao ?? hoje,
    descricao:    `${rec.descricao} (automático)`,
    status:       "PENDENTE",
    criado_por:   user?.id ?? null,
    recurring_id: recurringId,
  });
  if (txErr) throw new Error(txErr.message);

  // Calcular próxima geração
  const { data: nextDate } = await supabase.rpc("calcular_proxima_geracao", {
    p_ultima:         rec.proxima_geracao ?? hoje,
    p_periodicidade:  rec.periodicidade,
    p_dia_vencimento: rec.dia_vencimento,
  });

  await supabase.from("fin_recurring_transactions").update({
    ultima_geracao:  rec.proxima_geracao ?? hoje,
    proxima_geracao: nextDate,
    total_gerado:    (rec.total_gerado ?? 0) + 1,
  }).eq("id", recurringId);
}

export async function toggleRecorrenteAction(id: string, status: "ATIVO" | "PAUSADO" | "ENCERRADO"): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const supabase = await createClient();

  const { error } = await supabase
    .from("fin_recurring_transactions")
    .update({ status })
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
}

// ═══════════════════════════════════════════════════════════════
// FASE 7B — REPASSES ENTRE UNIDADES
// ═══════════════════════════════════════════════════════════════

export async function listarRepassesAction(): Promise<FinUnitRepasseListItem[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("fin_unit_repasses")
    .select("*")
    .eq("ministry_id", ctx.ministry_id)
    .order("data", { ascending: false });
  if (error) throw new Error(error.message);

  const repasses = (data ?? []) as FinUnitRepasse[];
  if (!repasses.length) return [];

  const unitIds = [...new Set([
    ...repasses.map((r) => r.unit_from_id),
    ...repasses.map((r) => r.unit_to_id),
  ])];
  const accIds = [...new Set([
    ...repasses.map((r) => r.account_from_id).filter(Boolean) as string[],
    ...repasses.map((r) => r.account_to_id).filter(Boolean) as string[],
  ])];

  const [unitsRes, accsRes] = await Promise.all([
    supabase.from("units").select("id, name").in("id", unitIds),
    accIds.length ? supabase.from("fin_accounts").select("id, nome").in("id", accIds) : { data: [] },
  ]);

  const unitMap = Object.fromEntries((unitsRes.data ?? []).map((u: any) => [u.id, u.name]));
  const accMap  = Object.fromEntries((accsRes.data  ?? []).map((a: any) => [a.id, a.nome]));

  return repasses.map((r) => ({
    ...r,
    unit_from_nome:    unitMap[r.unit_from_id] ?? "",
    unit_to_nome:      unitMap[r.unit_to_id]   ?? "",
    account_from_nome: r.account_from_id ? (accMap[r.account_from_id] ?? null) : null,
    account_to_nome:   r.account_to_id   ? (accMap[r.account_to_id]   ?? null) : null,
  }));
}

export async function criarRepasseAction(formData: FormData): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const valor = parseFloat(formData.get("valor") as string);
  if (!valor || valor <= 0) throw new Error("Valor inválido");

  const unit_from_id = formData.get("unit_from_id") as string;
  const unit_to_id   = formData.get("unit_to_id") as string;
  if (unit_from_id === unit_to_id) throw new Error("Unidade de origem e destino não podem ser iguais");

  const { error } = await supabase.from("fin_unit_repasses").insert({
    ministry_id:     ctx.ministry_id,
    unit_from_id,
    unit_to_id,
    account_from_id: (formData.get("account_from_id") as string) || null,
    account_to_id:   (formData.get("account_to_id") as string) || null,
    descricao:       (formData.get("descricao") as string).trim(),
    valor,
    percentual:      formData.get("percentual") ? parseFloat(formData.get("percentual") as string) : null,
    data:            formData.get("data") as string,
    competencia_mes: formData.get("competencia_mes") ? parseInt(formData.get("competencia_mes") as string) : null,
    competencia_ano: formData.get("competencia_ano") ? parseInt(formData.get("competencia_ano") as string) : null,
    status:          "PENDENTE",
    criado_por:      user?.id ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function executarRepasseAction(repasseId: string): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: repasse, error: rErr } = await supabase
    .from("fin_unit_repasses")
    .select("*")
    .eq("id", repasseId)
    .eq("ministry_id", ctx.ministry_id)
    .single();
  if (rErr || !repasse) throw new Error("Repasse não encontrado");
  if (repasse.status !== "PENDENTE") throw new Error("Repasse já executado ou cancelado");

  // Criar lançamentos emparelhados usando a RPC de transferência se tiver contas
  if (repasse.account_from_id && repasse.account_to_id) {
    const { error: txErr } = await supabase.rpc("executar_transferencia", {
      p_ministry_id:    ctx.ministry_id,
      p_account_from:   repasse.account_from_id,
      p_account_to:     repasse.account_to_id,
      p_valor:          repasse.valor,
      p_data:           repasse.data,
      p_descricao:      repasse.descricao,
      p_criado_por:     user?.id,
    });
    if (txErr) throw new Error(txErr.message);
  }

  await supabase.from("fin_unit_repasses").update({
    status:      "EXECUTADO",
    aprovado_por: user?.id ?? null,
  }).eq("id", repasseId);
}

export async function listarRegrasRepasseAction(): Promise<FinRepasseRule[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("fin_repasse_rules")
    .select("*")
    .eq("ministry_id", ctx.ministry_id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as FinRepasseRule[];
}

export async function criarRegraRepasseAction(formData: FormData): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const supabase = await createClient();

  const unit_from_id = formData.get("unit_from_id") as string;
  const unit_to_id   = formData.get("unit_to_id") as string;
  if (unit_from_id === unit_to_id) throw new Error("Unidade de origem e destino não podem ser iguais");

  const { error } = await supabase.from("fin_repasse_rules").insert({
    ministry_id:   ctx.ministry_id,
    unit_from_id,
    unit_to_id,
    descricao:     (formData.get("descricao") as string).trim(),
    percentual:    parseFloat(formData.get("percentual") as string),
    base_calculo:  formData.get("base_calculo") as string,
    valor_fixo:    formData.get("valor_fixo") ? parseFloat(formData.get("valor_fixo") as string) : null,
    periodicidade: formData.get("periodicidade") as string,
  });
  if (error) throw new Error(error.message);
}
