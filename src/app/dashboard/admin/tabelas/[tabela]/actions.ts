"use server";

import { revalidatePath }              from "next/cache";
import { createClient }                from "@/utils/supabase/server";
import { getAuthContext, assertLevel } from "@/utils/supabase/auth-context";
import { TABELAS_CONFIG, type TabelaKey } from "./tabelas.config";

export type LookupItem = {
  id:        string;
  nome:      string;
  sigla:     string | null;
  ordem:     number | null;
  is_active: boolean;
};

async function getCtx() {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Sessão não encontrada.");
  assertLevel(ctx, 2, "Sem permissão para gerenciar tabelas.");
  return ctx;
}

export async function listarItensAction(tabela: TabelaKey): Promise<LookupItem[]> {
  const ctx = await getCtx();
  const cfg = TABELAS_CONFIG[tabela];
  const supabase = await createClient();

  const query = supabase
    .from(cfg.dbTable)
    .select("id, nome, is_active" + (cfg.temSigla ? ", sigla" : "") + (cfg.temOrdem ? ", ordem" : ""))
    .eq("ministry_id", ctx.ministry_id);

  const { data, error } = cfg.temOrdem
    ? await query.order("ordem", { ascending: true }).order("nome")
    : await query.order("nome");

  if (error) throw new Error(error.message);

  return (data ?? []).map((r: any) => ({
    id:        r.id,
    nome:      r.nome,
    sigla:     r.sigla ?? null,
    ordem:     r.ordem ?? null,
    is_active: r.is_active,
  }));
}

export async function criarItemAction(tabela: TabelaKey, formData: FormData) {
  const ctx = await getCtx();
  const cfg = TABELAS_CONFIG[tabela];
  const supabase = await createClient();

  const nome  = (formData.get("nome") as string)?.trim();
  const sigla = (formData.get("sigla") as string)?.trim() || null;
  const ordem = formData.get("ordem") ? Number(formData.get("ordem")) : null;

  if (!nome) throw new Error("Nome é obrigatório.");

  const payload: Record<string, unknown> = { ministry_id: ctx.ministry_id, nome, is_active: true };
  if (cfg.temSigla) payload.sigla = sigla;
  if (cfg.temOrdem) payload.ordem = ordem ?? 0;

  const { error } = await supabase.from(cfg.dbTable).insert(payload);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/admin/tabelas/${tabela}`);
}

export async function editarItemAction(tabela: TabelaKey, id: string, formData: FormData) {
  const ctx = await getCtx();
  const cfg = TABELAS_CONFIG[tabela];
  const supabase = await createClient();

  const nome  = (formData.get("nome") as string)?.trim();
  const sigla = (formData.get("sigla") as string)?.trim() || null;
  const ordem = formData.get("ordem") ? Number(formData.get("ordem")) : null;

  if (!nome) throw new Error("Nome é obrigatório.");

  const payload: Record<string, unknown> = { nome };
  if (cfg.temSigla) payload.sigla = sigla;
  if (cfg.temOrdem && ordem !== null) payload.ordem = ordem;

  const { error } = await supabase
    .from(cfg.dbTable)
    .update(payload)
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);

  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/admin/tabelas/${tabela}`);
}

export async function toggleItemAction(tabela: TabelaKey, id: string, is_active: boolean) {
  const ctx = await getCtx();
  const cfg = TABELAS_CONFIG[tabela];
  const supabase = await createClient();

  const { error } = await supabase
    .from(cfg.dbTable)
    .update({ is_active })
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);

  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/admin/tabelas/${tabela}`);
}
