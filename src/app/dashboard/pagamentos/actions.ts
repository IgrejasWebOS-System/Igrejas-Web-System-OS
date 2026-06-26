"use server";

import { createClient } from "@/utils/supabase/server";
import { getAuthContext, assertLevel } from "@/utils/supabase/auth-context";

export async function listarGatewaysAction() {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const sb = await createClient();
  const { data, error } = await sb.from("payment_gateways").select("id, provider, ativo, test_mode, config, created_at").eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function configurarGatewayAction(formData: FormData) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const sb = await createClient();

  const provider = formData.get("provider") as string;
  const api_key  = formData.get("api_key") as string;
  // TODO: criptografar api_key antes de salvar
  // const enc = await encryptSecret(api_key);

  const { error } = await sb.from("payment_gateways").upsert({
    ministry_id: ctx.ministry_id,
    provider,
    api_key_enc: api_key ? `TODO_ENCRYPT:${api_key.slice(0, 8)}...` : null,
    test_mode:   formData.get("test_mode") === "on",
    ativo:       false,  // ativa somente após validar
    config: { webhook_url: formData.get("webhook_url") },
  }, { onConflict: "ministry_id,provider" });
  if (error) throw new Error(error.message);
}

export async function listarPedidosAction() {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const sb = await createClient();
  const { data, error } = await sb
    .from("payment_orders")
    .select("*, parties:party_id(full_name)")
    .eq("ministry_id", ctx.ministry_id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ── Scaffold Pagar.me ────────────────────────────────────────
// TODO: Integração real com credenciais do ministério
export async function criarPedidoPagarme(_params: {
  party_id: string;
  valor: number;
  descricao: string;
  referencia_tipo: "EVENTO" | "CURSO" | "DOACAO";
  referencia_id?: string;
}): Promise<{ order_id: string; checkout_url: string }> {
  // SCAFFOLDED — precisará de API key real da Pagar.me
  // const ctx = await getAuthContext();
  // const gateway = await getGatewayConfig(ctx.ministry_id, "PAGARME");
  // const response = await fetch("https://api.pagar.me/core/v5/orders", {
  //   method: "POST",
  //   headers: { Authorization: "Basic " + btoa(gateway.api_key + ":"), "Content-Type": "application/json" },
  //   body: JSON.stringify({ ... }),
  // });
  throw new Error("Integração com Pagar.me ainda não configurada. Adicione as credenciais em Configurações > Gateway.");
}
