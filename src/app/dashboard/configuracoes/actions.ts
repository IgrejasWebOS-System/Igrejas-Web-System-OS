"use server";

import { createClient } from "@/utils/supabase/server";
import { getAuthContext, assertLevel } from "@/utils/supabase/auth-context";

import { DEFAULT_CONFIGS } from "./constants";

export async function listarConfigsAction() {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const sb = await createClient();
  const { data, error } = await sb.from("system_configs").select("*").eq("ministry_id", ctx.ministry_id).order("chave");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function salvarConfigAction(chave: string, valor: unknown) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const { error } = await sb.from("system_configs").upsert({
    ministry_id: ctx.ministry_id,
    chave, valor, updated_by: user?.id, updated_at: new Date().toISOString(),
  }, { onConflict: "ministry_id,chave" });
  if (error) throw new Error(error.message);
}

export async function salvarConfigsLoteAction(configs: Record<string, unknown>) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const rows = Object.entries(configs).map(([chave, valor]) => ({
    ministry_id: ctx.ministry_id, chave, valor, updated_by: user?.id, updated_at: new Date().toISOString(),
  }));
  const { error } = await sb.from("system_configs").upsert(rows, { onConflict: "ministry_id,chave" });
  if (error) throw new Error(error.message);
}

// ── Comunicados ──────────────────────────────────────────────
export async function listarComunicadosAction() {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const sb = await createClient();
  const { data, error } = await sb.from("ministry_announcements").select("*").eq("ministry_id", ctx.ministry_id).eq("ativo", true).order("fixado", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function criarComunicadoAction(formData: FormData) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const { error } = await sb.from("ministry_announcements").insert({
    ministry_id: ctx.ministry_id,
    titulo:     formData.get("titulo") as string,
    conteudo:   formData.get("conteudo") as string,
    tipo:       formData.get("tipo") as string,
    expira_em:  (formData.get("expira_em") as string) || null,
    fixado:     formData.get("fixado") === "on",
    created_by: user?.id,
  });
  if (error) throw new Error(error.message);
}

// ── Automações ──────────────────────────────────────────────
export async function listarAutomacoesAction() {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const sb = await createClient();
  const { data, error } = await sb.from("automations").select("*").eq("ministry_id", ctx.ministry_id).order("nome");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function criarAutomacaoAction(formData: FormData) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const sb = await createClient();
  const { error } = await sb.from("automations").insert({
    ministry_id: ctx.ministry_id,
    nome:        formData.get("nome") as string,
    gatilho:     formData.get("gatilho") as string,
    config: {
      template_id:       formData.get("template_id") || null,
      canal:             formData.get("canal") || "EMAIL",
      dias_antecedencia: parseInt(formData.get("dias_ante") as string) || 0,
    },
  });
  if (error) throw new Error(error.message);
}

export async function toggleAutomacaoAction(id: string, ativo: boolean) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const sb = await createClient();
  const { error } = await sb.from("automations").update({ ativo }).eq("id", id).eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
}
