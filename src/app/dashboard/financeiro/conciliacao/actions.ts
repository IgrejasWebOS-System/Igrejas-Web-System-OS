"use server";

import { createClient } from "@/utils/supabase/server";
import { getAuthContext, assertLevel } from "@/utils/supabase/auth-context";
import { parseOFX } from "@/utils/ofx-parser";

// ── Importar arquivo OFX ─────────────────────────────────────
export async function importarOFXAction(formData: FormData) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();

  const account_id = formData.get("account_id") as string;
  const file = formData.get("arquivo") as File;
  if (!file || file.size === 0) throw new Error("Arquivo não selecionado");

  const raw = await file.text();
  const parsed = parseOFX(raw);

  if (parsed.transacoes.length === 0) throw new Error("Nenhuma transação encontrada no arquivo");

  // Criar importação
  const { data: imp, error: impErr } = await sb
    .from("fin_bank_imports")
    .insert({
      ministry_id:  ctx.ministry_id,
      account_id,
      nome_arquivo: file.name,
      banco:        parsed.banco,
      agencia:      parsed.agencia,
      conta:        parsed.conta,
      data_inicio:  parsed.data_inicio,
      data_fim:     parsed.data_fim,
      total_linhas: parsed.transacoes.length,
      status:       "PENDENTE",
      created_by:   user?.id,
    })
    .select("id")
    .single();

  if (impErr) throw new Error(impErr.message);

  // Verificar FITIDs já importados (deduplicação)
  const fitids = parsed.transacoes.map(t => t.fitid);
  const { data: existentes } = await sb
    .from("fin_bank_import_lines")
    .select("fitid")
    .eq("ministry_id", ctx.ministry_id)
    .in("fitid", fitids);

  const fitidsExistentes = new Set((existentes ?? []).map((e: { fitid: string }) => e.fitid));

  const linhas = parsed.transacoes
    .filter(t => !fitidsExistentes.has(t.fitid))
    .map(t => ({
      ministry_id: ctx.ministry_id,
      import_id:   imp!.id,
      fitid:       t.fitid,
      data:        t.data,
      valor:       t.valor,
      descricao:   t.descricao,
      memo:        t.memo,
      tipo:        t.tipo,
      status:      "PENDENTE",
    }));

  if (linhas.length > 0) {
    const { error: linErr } = await sb.from("fin_bank_import_lines").insert(linhas);
    if (linErr) throw new Error(linErr.message);
  }

  const duplicadas = parsed.transacoes.length - linhas.length;
  return { import_id: imp!.id, total: parsed.transacoes.length, novas: linhas.length, duplicadas };
}

// ── Listar importações ────────────────────────────────────────
export async function listarImportacoesAction() {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();

  const { data, error } = await sb
    .from("fin_bank_imports")
    .select("*, fin_accounts:account_id(nome)")
    .eq("ministry_id", ctx.ministry_id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

// ── Linhas de uma importação ──────────────────────────────────
export async function listarLinhasAction(import_id: string) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();

  const { data, error } = await sb
    .from("fin_bank_import_lines")
    .select("*, fin_transactions:transaction_id(descricao, valor)")
    .eq("ministry_id", ctx.ministry_id)
    .eq("import_id", import_id)
    .order("data")
    .order("created_at");

  if (error) throw new Error(error.message);
  return data ?? [];
}

// ── Conciliar linha com lançamento existente ──────────────────
export async function conciliarLinhaAction(line_id: string, transaction_id: string) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();

  const { error } = await sb
    .from("fin_bank_import_lines")
    .update({ status: "CONCILIADA", transaction_id })
    .eq("id", line_id)
    .eq("ministry_id", ctx.ministry_id);

  if (error) throw new Error(error.message);
  await _atualizarContadores(sb, ctx.ministry_id, line_id);
}

// ── Ignorar linha ─────────────────────────────────────────────
export async function ignorarLinhaAction(line_id: string) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();

  const { error } = await sb
    .from("fin_bank_import_lines")
    .update({ status: "IGNORADA" })
    .eq("id", line_id)
    .eq("ministry_id", ctx.ministry_id);

  if (error) throw new Error(error.message);
  await _atualizarContadores(sb, ctx.ministry_id, line_id);
}

// ── Criar lançamento a partir da linha ───────────────────────
export async function criarLancamentoDaLinhaAction(line_id: string, formData: FormData) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();

  const { data: linha } = await sb
    .from("fin_bank_import_lines")
    .select("*")
    .eq("id", line_id)
    .eq("ministry_id", ctx.ministry_id)
    .single();

  if (!linha) throw new Error("Linha não encontrada");

  const { data: tx, error } = await sb.from("fin_transactions").insert({
    ministry_id:  ctx.ministry_id,
    account_id:   formData.get("account_id") as string,
    category_id:  formData.get("category_id") as string,
    tipo:         linha.valor > 0 ? "RECEITA" : "DESPESA",
    valor:        Math.abs(linha.valor),
    data:         linha.data,
    descricao:    (formData.get("descricao") as string) || linha.descricao,
    status:       "APROVADO",
    created_by:   user?.id,
  }).select("id").single();

  if (error) throw new Error(error.message);

  await sb.from("fin_bank_import_lines")
    .update({ status: "CRIADA", transaction_id: tx!.id })
    .eq("id", line_id);

  await _atualizarContadores(sb, ctx.ministry_id, line_id);
  return tx!.id;
}

// ── Helper interno ────────────────────────────────────────────
async function _atualizarContadores(sb: Awaited<ReturnType<typeof import("@/utils/supabase/server").createClient>>, ministry_id: string, line_id: string) {
  const { data: linha } = await sb.from("fin_bank_import_lines").select("import_id").eq("id", line_id).single();
  if (!linha) return;
  const { count } = await sb.from("fin_bank_import_lines")
    .select("*", { count: "exact", head: true })
    .eq("import_id", linha.import_id)
    .in("status", ["CONCILIADA", "IGNORADA", "CRIADA"]);
  await sb.from("fin_bank_imports").update({ conciliadas: count ?? 0 }).eq("id", linha.import_id);
}

// ── Buscar lançamentos candidatos para matching ───────────────
export async function buscarCandidatosAction(data: string, valor: number) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();

  const tipo = valor > 0 ? "RECEITA" : "DESPESA";
  const abs  = Math.abs(valor);

  // ±3 dias, ±1% de valor
  const { data: txs } = await sb
    .from("fin_transactions")
    .select("id, descricao, valor, data, fin_categories:category_id(nome)")
    .eq("ministry_id", ctx.ministry_id)
    .eq("tipo", tipo)
    .eq("status", "APROVADO")
    .gte("data", new Date(new Date(data).getTime() - 3 * 86400000).toISOString().slice(0, 10))
    .lte("data", new Date(new Date(data).getTime() + 3 * 86400000).toISOString().slice(0, 10))
    .gte("valor", abs * 0.99)
    .lte("valor", abs * 1.01)
    .order("data")
    .limit(10);

  return txs ?? [];
}
