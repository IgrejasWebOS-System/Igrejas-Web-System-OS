"use server";

import { createClient } from "@/utils/supabase/server";
import { getAuthContext, assertLevel } from "@/utils/supabase/auth-context";

export async function buscarFinanceiroMensalAction(meses: number = 12) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const sb = await createClient();
  const desde = new Date();
  desde.setMonth(desde.getMonth() - meses);
  const { data, error } = await sb
    .from("mv_financeiro_mensal")
    .select("*")
    .eq("ministry_id", ctx.ministry_id)
    .gte("mes", desde.toISOString())
    .order("mes");
  if (error) {
    // View may not exist yet — fallback to raw query
    const { data: raw, error: e2 } = await sb
      .from("fin_transactions")
      .select("data, tipo, valor, status")
      .eq("ministry_id", ctx.ministry_id)
      .eq("status", "APROVADO")
      .gte("data", desde.toISOString().slice(0, 10));
    if (e2) throw new Error(e2.message);
    return aggregateMensal(raw ?? []);
  }
  return data ?? [];
}

function aggregateMensal(rows: { data: string; tipo: string; valor: number }[]) {
  const map: Record<string, { mes: string; total_receitas: number; total_despesas: number; saldo_liquido: number; total_lancamentos: number }> = {};
  for (const r of rows) {
    const mes = r.data.slice(0, 7);
    if (!map[mes]) map[mes] = { mes: mes + "-01", total_receitas: 0, total_despesas: 0, saldo_liquido: 0, total_lancamentos: 0 };
    map[mes].total_lancamentos++;
    if (r.tipo === "RECEITA") map[mes].total_receitas += Number(r.valor);
    else                       map[mes].total_despesas += Number(r.valor);
    map[mes].saldo_liquido = map[mes].total_receitas - map[mes].total_despesas;
  }
  return Object.values(map).sort((a, b) => a.mes.localeCompare(b.mes));
}

export async function buscarMembrosMensalAction(meses: number = 12) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const sb = await createClient();
  const desde = new Date();
  desde.setMonth(desde.getMonth() - meses);
  const { data, error } = await sb
    .from("mv_membros_mensal")
    .select("*")
    .eq("ministry_id", ctx.ministry_id)
    .gte("mes", desde.toISOString())
    .order("mes");
  if (error) {
    // Fallback via party_roles
    const { data: raw } = await sb.from("party_roles").select("started_at, status").eq("ministry_id", ctx.ministry_id).eq("role_type", "MEMBRO").gte("started_at", desde.toISOString());
    const map: Record<string, { mes: string; novos_membros: number; ativos_novos: number }> = {};
    for (const r of (raw ?? [])) {
      const mes = (r.started_at ?? "").slice(0, 7);
      if (!mes) continue;
      if (!map[mes]) map[mes] = { mes: mes + "-01", novos_membros: 0, ativos_novos: 0 };
      map[mes].novos_membros++;
      if (r.status === "ACTIVE") map[mes].ativos_novos++;
    }
    return Object.values(map).sort((a, b) => a.mes.localeCompare(b.mes));
  }
  return data ?? [];
}

export async function buscarKpisAction() {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const sb = await createClient();

  const [membresRes, finRes, eventosRes, patrimonioRes] = await Promise.all([
    sb.from("party_roles").select("id, status", { count: "exact" }).eq("ministry_id", ctx.ministry_id).eq("role_type", "MEMBRO"),
    sb.from("fin_transactions").select("tipo, valor, status").eq("ministry_id", ctx.ministry_id).eq("status", "APROVADO").gte("data", new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10)),
    sb.from("events").select("id", { count: "exact" }).eq("ministry_id", ctx.ministry_id).gte("data_inicio", new Date().toISOString().slice(0, 10)),
    sb.from("patrimony_items").select("valor_aquisicao").eq("ministry_id", ctx.ministry_id).eq("status", "ATIVO"),
  ]);

  const totalMembros  = membresRes.count ?? 0;
  const membrosAtivos = (membresRes.data ?? []).filter(m => m.status === "ACTIVE").length;
  const receitas = (finRes.data ?? []).filter(t => t.tipo === "RECEITA").reduce((s, t) => s + Number(t.valor), 0);
  const despesas = (finRes.data ?? []).filter(t => t.tipo === "DESPESA").reduce((s, t) => s + Number(t.valor), 0);
  const totalPatrimonio = (patrimonioRes.data ?? []).reduce((s, t) => s + Number(t.valor_aquisicao), 0);

  return {
    totalMembros, membrosAtivos,
    receitas, despesas, saldo: receitas - despesas,
    eventosProximos: eventosRes.count ?? 0,
    totalPatrimonio,
  };
}
