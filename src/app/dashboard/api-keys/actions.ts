"use server";

import { createHash, randomBytes } from "crypto";
import { createClient } from "@/utils/supabase/server";
import { getAuthContext, assertLevel } from "@/utils/supabase/auth-context";

import { ESCOPOS_DISPONIVEIS } from "./constants";

export async function listarClientesAction() {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const sb = await createClient();
  const { data, error } = await sb.from("api_clients").select("*, api_keys(id, nome, key_prefix, escopos, expira_em, ultimo_uso, ativo)").eq("ministry_id", ctx.ministry_id).eq("ativo", true).order("created_at");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function criarClienteAction(formData: FormData) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const { data: client, error } = await sb.from("api_clients").insert({
    ministry_id: ctx.ministry_id,
    nome:        formData.get("nome") as string,
    descricao:   (formData.get("descricao") as string) || null,
    created_by:  user?.id,
  }).select("id").single();
  if (error) throw new Error(error.message);
  return client!.id;
}

export async function gerarApiKeyAction(client_id: string, formData: FormData): Promise<{ key: string; prefix: string }> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const sb = await createClient();

  const raw    = "igsk_" + randomBytes(32).toString("hex");
  const hash   = createHash("sha256").update(raw).digest("hex");
  const prefix = raw.slice(0, 12);

  const escopos = formData.getAll("escopos") as string[];
  const { error } = await sb.from("api_keys").insert({
    ministry_id: ctx.ministry_id,
    client_id,
    nome:        formData.get("nome") as string,
    key_hash:    hash,
    key_prefix:  prefix,
    escopos:     escopos.length ? escopos : ["membros:read"],
    expira_em:   (formData.get("expira_em") as string) || null,
  });
  if (error) throw new Error(error.message);

  return { key: raw, prefix };
}

export async function revogarKeyAction(id: string) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const sb = await createClient();
  const { error } = await sb.from("api_keys").update({ ativo: false }).eq("id", id).eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
}

export async function listarWebhooksAction() {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const sb = await createClient();
  const { data, error } = await sb.from("webhook_endpoints").select("*").eq("ministry_id", ctx.ministry_id).order("created_at");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function criarWebhookAction(formData: FormData) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const sb = await createClient();
  const eventos = formData.getAll("eventos") as string[];
  const secret  = "whsec_" + randomBytes(24).toString("hex");
  const { error } = await sb.from("webhook_endpoints").insert({
    ministry_id: ctx.ministry_id,
    url:         formData.get("url") as string,
    eventos:     eventos.length ? eventos : ["*"],
    secret,
  });
  if (error) throw new Error(error.message);
  return secret;
}
