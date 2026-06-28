"use server";

import { createClient } from "@/utils/supabase/server";
import { getAuthContext, assertLevel } from "@/utils/supabase/auth-context";

import { SEGMENTOS } from "./constants";

// ── Templates ─────────────────────────────────────────────────
export async function listarTemplatesAction() {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();
  const { data, error } = await sb.from("comm_templates").select("*").eq("ministry_id", ctx.ministry_id).eq("ativo", true).order("nome");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function criarTemplateAction(formData: FormData) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const { error } = await sb.from("comm_templates").insert({
    ministry_id: ctx.ministry_id,
    nome:    formData.get("nome") as string,
    canal:   formData.get("canal") as string,
    assunto: (formData.get("assunto") as string) || null,
    corpo:   formData.get("corpo") as string,
    variaveis: ((formData.get("variaveis") as string) || "").split(",").map(s => s.trim()).filter(Boolean),
    created_by: user?.id,
  });
  if (error) throw new Error(error.message);
}

export async function atualizarTemplateAction(id: string, formData: FormData) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();
  const { error } = await sb.from("comm_templates").update({
    nome:     formData.get("nome") as string,
    canal:    formData.get("canal") as string,
    assunto:  (formData.get("assunto") as string) || null,
    corpo:    formData.get("corpo") as string,
    variaveis: ((formData.get("variaveis") as string) || "").split(",").map(s => s.trim()).filter(Boolean),
  }).eq("id", id).eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
}

// ── Campanhas ─────────────────────────────────────────────────
export async function listarCampanhasAction() {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();
  const { data, error } = await sb
    .from("comm_campaigns")
    .select("*, comm_templates:template_id(nome, canal)")
    .eq("ministry_id", ctx.ministry_id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function criarCampanhaAction(formData: FormData) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const segmento    = formData.get("segmento") as string;
  const agendado    = formData.get("agendado_para") as string;
  const { data: camp, error } = await sb.from("comm_campaigns").insert({
    ministry_id:  ctx.ministry_id,
    template_id:  (formData.get("template_id") as string) || null,
    nome:         formData.get("nome") as string,
    destinatarios: { segmento },
    agendado_para: agendado || null,
    created_by:   user?.id,
  }).select("id").single();
  if (error) throw new Error(error.message);
  return camp!.id;
}

export async function enviarCampanhaAction(campaign_id: string) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();

  // Buscar campanha e template
  const { data: camp } = await sb.from("comm_campaigns").select("*, comm_templates:template_id(canal, corpo, assunto, variaveis)").eq("id", campaign_id).eq("ministry_id", ctx.ministry_id).single();
  if (!camp) throw new Error("Campanha não encontrada");

  // Buscar destinatários
  const seg    = (camp.destinatarios as { segmento?: string })?.segmento ?? "ATIVOS";
  let q = sb.from("parties").select("id, full_name, email, telefone, data_nascimento").eq("ministry_id", ctx.ministry_id).eq("type", "MEMBRO").is("deleted_at", null);
  if (seg === "ATIVOS")  q = q.eq("status", "ATIVO");
  if (seg === "VISITANTES") q = q.eq("status", "VISITANTE");
  if (seg === "ANIVERSARIANTES_MES") {
    const mes = new Date().getMonth() + 1;
    q = q.filter("data_nascimento", "like", `%-${String(mes).padStart(2, "0")}-%`);
  }
  const { data: parties } = await q.limit(500);

  // Marcar como enviando
  await sb.from("comm_campaigns").update({ status: "ENVIANDO", iniciado_em: new Date().toISOString() }).eq("id", campaign_id);

  const canal  = (camp.comm_templates as unknown as { canal?: string } | null)?.canal ?? "EMAIL";
  let enviados = 0, erros = 0;

  for (const party of (parties ?? [])) {
    const dest = canal === "EMAIL" ? party.email : party.telefone;
    if (!dest) { erros++; continue; }

    // TODO: integrar SendGrid / Twilio / WhatsApp Business API
    // Simulação: registra log como ENVIADO
    await sb.from("comm_logs").insert({
      ministry_id:  ctx.ministry_id,
      campaign_id,
      template_id:  camp.template_id,
      party_id:     party.id,
      canal,
      destinatario: dest,
      status:       "ENVIADO",
    });
    enviados++;
  }

  await sb.from("comm_campaigns").update({
    status: "CONCLUIDA", total_enviados: enviados, total_erros: erros, concluido_em: new Date().toISOString(),
  }).eq("id", campaign_id);

  return { enviados, erros };
}

// ── Logs ──────────────────────────────────────────────────────
export async function listarLogsAction(campaign_id?: string) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const sb = await createClient();
  let q = sb.from("comm_logs").select("*, parties:party_id(full_name)").eq("ministry_id", ctx.ministry_id).order("enviado_em", { ascending: false }).limit(100);
  if (campaign_id) q = q.eq("campaign_id", campaign_id);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}
