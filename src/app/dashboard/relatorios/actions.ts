"use server";

import { createClient } from "@/utils/supabase/server";
import { getAuthContext, assertLevel } from "@/utils/supabase/auth-context";

// ── DRE — Demonstração do Resultado do Exercício ──────────────
export type DRELinha = {
  categoria_id:   string;
  categoria_nome: string;
  categoria_cod:  string;
  tipo:           "RECEITA" | "DESPESA";
  total:          number;
};

export type DREResult = {
  periodo:          { de: string; ate: string };
  receitas:         DRELinha[];
  despesas:         DRELinha[];
  total_receitas:   number;
  total_despesas:   number;
  resultado:        number; // positivo = superávit, negativo = déficit
};

export async function dreAction(de: string, ate: string): Promise<DREResult> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();

  const { data, error } = await sb
    .from("fin_transactions")
    .select("tipo, valor, category_id, fin_categories:category_id(nome, codigo)")
    .eq("ministry_id", ctx.ministry_id)
    .eq("status", "APROVADO")
    .is("deleted_at", null)
    .gte("data", de)
    .lte("data", ate);

  if (error) throw new Error(error.message);

  // Agregar por categoria
  const mapa = new Map<string, DRELinha>();
  for (const t of data ?? []) {
    const cat = t.fin_categories as unknown as { nome: string; codigo: string } | null;
    if (!cat) continue;
    const key = t.category_id as string;
    if (!mapa.has(key)) {
      mapa.set(key, {
        categoria_id:   key,
        categoria_nome: cat.nome,
        categoria_cod:  cat.codigo ?? "",
        tipo:           t.tipo as "RECEITA" | "DESPESA",
        total:          0,
      });
    }
    mapa.get(key)!.total += Number(t.valor);
  }

  const linhas    = Array.from(mapa.values()).sort((a, b) => a.categoria_cod.localeCompare(b.categoria_cod));
  const receitas  = linhas.filter(l => l.tipo === "RECEITA");
  const despesas  = linhas.filter(l => l.tipo === "DESPESA");
  const totR      = receitas.reduce((s, l) => s + l.total, 0);
  const totD      = despesas.reduce((s, l) => s + l.total, 0);

  return { periodo: { de, ate }, receitas, despesas, total_receitas: totR, total_despesas: totD, resultado: totR - totD };
}

// ── BALANCETE — Saldo por conta no período ───────────────────
export type BalanceteLinha = {
  account_id:   string;
  account_nome: string;
  saldo_ini:    number;
  entradas:     number;
  saidas:       number;
  saldo_fin:    number;
};

export type BalanceteResult = {
  periodo:      { de: string; ate: string };
  linhas:       BalanceteLinha[];
  total_entradas: number;
  total_saidas:   number;
};

export async function balanceteAction(de: string, ate: string): Promise<BalanceteResult> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();

  // Buscar contas
  const { data: contas } = await sb
    .from("fin_accounts")
    .select("id, nome")
    .eq("ministry_id", ctx.ministry_id)
    .eq("is_active", true)
    .order("nome");

  // Transações aprovadas no período
  const { data: txs, error } = await sb
    .from("fin_transactions")
    .select("tipo, valor, account_id")
    .eq("ministry_id", ctx.ministry_id)
    .eq("status", "APROVADO")
    .is("deleted_at", null)
    .gte("data", de)
    .lte("data", ate);

  if (error) throw new Error(error.message);

  // Saldo acumulado antes do período (para saldo inicial)
  const { data: txsAntes } = await sb
    .from("fin_transactions")
    .select("tipo, valor, account_id")
    .eq("ministry_id", ctx.ministry_id)
    .eq("status", "APROVADO")
    .is("deleted_at", null)
    .lt("data", de);

  const calcSaldo = (txList: typeof txs, accountId: string) => {
    let s = 0;
    for (const t of txList ?? []) {
      if ((t.account_id as string) !== accountId) continue;
      s += t.tipo === "RECEITA" ? Number(t.valor) : -Number(t.valor);
    }
    return s;
  };

  const linhas: BalanceteLinha[] = (contas ?? []).map(c => {
    const saldo_ini = calcSaldo(txsAntes ?? [], c.id);
    const entradas  = (txs ?? []).filter(t => t.account_id === c.id && t.tipo === "RECEITA").reduce((s, t) => s + Number(t.valor), 0);
    const saidas    = (txs ?? []).filter(t => t.account_id === c.id && t.tipo === "DESPESA").reduce((s, t) => s + Number(t.valor), 0);
    return { account_id: c.id, account_nome: c.nome, saldo_ini, entradas, saidas, saldo_fin: saldo_ini + entradas - saidas };
  }).filter(l => l.saldo_ini !== 0 || l.entradas !== 0 || l.saidas !== 0);

  return {
    periodo: { de, ate },
    linhas,
    total_entradas: linhas.reduce((s, l) => s + l.entradas, 0),
    total_saidas:   linhas.reduce((s, l) => s + l.saidas,   0),
  };
}

// ── INVENTÁRIO PATRIMONIAL ────────────────────────────────────
export type InventarioLinha = {
  id:              string;
  numero_tombamento: string;
  nome:            string;
  categoria:       string;
  data_aquisicao:  string;
  valor_aquisicao: number;
  valor_contabil:  number;
  taxa_depreciacao_anual: number | null;
  status:          string;
  localizacao:     string | null;
};

export type InventarioResult = {
  data_ref:          string;
  itens:             InventarioLinha[];
  total_aquisicao:   number;
  total_contabil:    number;
  depreciacao_total: number;
};

export async function inventarioAction(data_ref?: string): Promise<InventarioResult> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const sb = await createClient();

  const ref = data_ref ?? new Date().toISOString().slice(0, 10);

  const { data, error } = await sb
    .from("patrimony_items")
    .select("id, numero_tombamento, nome, categoria, data_aquisicao, valor_aquisicao, taxa_depreciacao_anual, valor_residual, status, units:localizacao_unit_id(name)")
    .eq("ministry_id", ctx.ministry_id)
    .is("deleted_at", null)
    .order("numero_tombamento");

  if (error) throw new Error(error.message);

  // Buscar depreciações acumuladas por item
  const { data: deps } = await sb
    .from("patrimony_depreciations")
    .select("item_id, valor_depreciacao, ano, mes")
    .eq("ministry_id", ctx.ministry_id);

  const depPorItem = new Map<string, number>();
  for (const d of deps ?? []) {
    const dataD = new Date(d.ano, d.mes - 1);
    const dataR = new Date(ref);
    if (dataD <= dataR) {
      depPorItem.set(d.item_id, (depPorItem.get(d.item_id) ?? 0) + Number(d.valor_depreciacao));
    }
  }

  const itens: InventarioLinha[] = (data ?? []).map(item => {
    const dep_acum   = depPorItem.get(item.id) ?? 0;
    const val_cont   = Math.max(Number(item.valor_residual ?? 0), Number(item.valor_aquisicao) - dep_acum);
    return {
      id:                    item.id,
      numero_tombamento:     item.numero_tombamento,
      nome:                  item.nome,
      categoria:             item.categoria,
      data_aquisicao:        item.data_aquisicao,
      valor_aquisicao:       Number(item.valor_aquisicao),
      valor_contabil:        val_cont,
      taxa_depreciacao_anual: item.taxa_depreciacao_anual ? Number(item.taxa_depreciacao_anual) : null,
      status:                item.status,
      localizacao:           (item.units as unknown as { name?: string } | null)?.name ?? null,
    };
  });

  return {
    data_ref: ref,
    itens,
    total_aquisicao:   itens.reduce((s, i) => s + i.valor_aquisicao, 0),
    total_contabil:    itens.reduce((s, i) => s + i.valor_contabil, 0),
    depreciacao_total: itens.reduce((s, i) => s + (i.valor_aquisicao - i.valor_contabil), 0),
  };
}

// ── RELATÓRIO DE MEMBROS ──────────────────────────────────────
export type MembroResumo = {
  id:            string;
  full_name:     string;
  cpf:           string | null;
  data_nascimento: string | null;
  telefone:      string | null;
  email:         string | null;
  civil_status:  string | null;
  gender:        string | null;
  data_membro:   string | null;
  unit_nome:     string | null;
  status:        string;
};

export type MembrosRelatorioResult = {
  total:    number;
  ativos:   number;
  inativos: number;
  membros:  MembroResumo[];
};

export async function membrosRelatorioAction(filtros?: {
  unit_id?: string;
  status?: string;
  gender_id?: string;
}): Promise<MembrosRelatorioResult> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();

  let q = sb
    .from("parties")
    .select("id, full_name, cpf, data_nascimento, telefone, email, data_membro, status, unit_id, gender_id, civil_status_id")
    .eq("ministry_id", ctx.ministry_id)
    .eq("type", "MEMBRO")
    .is("deleted_at", null)
    .order("full_name");

  if (filtros?.unit_id)   q = q.eq("unit_id", filtros.unit_id);
  if (filtros?.status)    q = q.eq("status", filtros.status);
  if (filtros?.gender_id) q = q.eq("gender_id", filtros.gender_id);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const rows = data ?? [];

  // Lookups separados (padrão do codebase)
  const unitIds  = [...new Set(rows.map((p: Record<string, unknown>) => p.unit_id as string).filter(Boolean))];
  const genIds   = [...new Set(rows.map((p: Record<string, unknown>) => p.gender_id as string).filter(Boolean))];
  const civIds   = [...new Set(rows.map((p: Record<string, unknown>) => p.civil_status_id as string).filter(Boolean))];

  const [unitsRes, gensRes, civsRes] = await Promise.all([
    unitIds.length ? sb.from("units").select("id, name").in("id", unitIds) : { data: [] },
    genIds.length  ? sb.from("genders").select("id, nome").in("id", genIds) : { data: [] },
    civIds.length  ? sb.from("civil_statuses").select("id, nome").in("id", civIds) : { data: [] },
  ]);

  const unitMap = Object.fromEntries(((unitsRes.data ?? []) as { id: string; name: string }[]).map(u => [u.id, u.name]));
  const genMap  = Object.fromEntries(((gensRes.data  ?? []) as { id: string; nome: string }[]).map(g => [g.id, g.nome]));
  const civMap  = Object.fromEntries(((civsRes.data  ?? []) as { id: string; nome: string }[]).map(c => [c.id, c.nome]));

  const membros: MembroResumo[] = rows.map((p: Record<string, unknown>) => ({
    id:              p.id as string,
    full_name:       p.full_name as string,
    cpf:             p.cpf as string | null,
    data_nascimento: p.data_nascimento as string | null,
    telefone:        p.telefone as string | null,
    email:           p.email as string | null,
    civil_status:    p.civil_status_id ? (civMap[p.civil_status_id as string] ?? null) : null,
    gender:          p.gender_id ? (genMap[p.gender_id as string] ?? null) : null,
    data_membro:     p.data_membro as string | null,
    unit_nome:       p.unit_id ? (unitMap[p.unit_id as string] ?? null) : null,
    status:          p.status as string,
  }));

  return {
    total:    membros.length,
    ativos:   membros.filter(m => m.status === "ATIVO").length,
    inativos: membros.filter(m => m.status !== "ATIVO").length,
    membros,
  };
}
