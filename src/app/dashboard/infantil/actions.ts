"use server";

import { createClient } from "@/utils/supabase/server";
import { getAuthContext, assertLevel } from "@/utils/supabase/auth-context";

import { PARENTESCO_LABELS } from "./constants";

export async function listarCriancasAction() {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const sb = await createClient();
  const { data, error } = await sb
    .from("child_profiles")
    .select("*, child_responsibles(id, nome, parentesco, principal, pode_buscar)")
    .eq("ministry_id", ctx.ministry_id)
    .eq("ativo", true)
    .order("nome");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function cadastrarCriancaAction(formData: FormData) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const sb = await createClient();
  const { data: child, error } = await sb.from("child_profiles").insert({
    ministry_id: ctx.ministry_id,
    nome: formData.get("nome") as string,
    data_nascimento: (formData.get("data_nascimento") as string) || null,
    alergias: (formData.get("alergias") as string) || null,
    observacoes: (formData.get("observacoes") as string) || null,
  }).select("id").single();
  if (error) throw new Error(error.message);
  return child!.id;
}

export async function adicionarResponsavelAction(child_id: string, formData: FormData) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const sb = await createClient();
  const { error } = await sb.from("child_responsibles").insert({
    ministry_id: ctx.ministry_id,
    child_id,
    nome: formData.get("nome") as string,
    telefone: (formData.get("telefone") as string) || null,
    parentesco: formData.get("parentesco") as string,
    pode_buscar: formData.get("pode_buscar") === "true",
    principal: formData.get("principal") === "true",
  });
  if (error) throw new Error(error.message);
}

export async function listarTurmasAction() {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const sb = await createClient();
  const { data, error } = await sb
    .from("child_classes")
    .select("*, parties:professor_party_id(full_name)")
    .eq("ministry_id", ctx.ministry_id)
    .eq("ativo", true)
    .order("faixa_etaria_min");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function criarTurmaAction(formData: FormData) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const sb = await createClient();
  const { error } = await sb.from("child_classes").insert({
    ministry_id: ctx.ministry_id,
    nome: formData.get("nome") as string,
    faixa_etaria_min: parseInt(formData.get("faixa_min") as string) || null,
    faixa_etaria_max: parseInt(formData.get("faixa_max") as string) || null,
    sala: (formData.get("sala") as string) || null,
    professor_party_id: (formData.get("professor_party_id") as string) || null,
  });
  if (error) throw new Error(error.message);
}

export async function checkinAction(qr_token: string, class_id?: string) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();

  const { data: child } = await sb.from("child_profiles").select("id, nome").eq("qr_token", qr_token).eq("ministry_id", ctx.ministry_id).single();
  if (!child) throw new Error("Criança não encontrada — QR inválido");

  // Verificar se já fez check-in hoje
  const hoje = new Date().toISOString().slice(0, 10);
  const { data: existing } = await sb.from("child_checkins").select("id, checkout_em").eq("child_id", child.id).eq("data", hoje).maybeSingle();

  if (existing && !existing.checkout_em) {
    // Fazer checkout
    await sb.from("child_checkins").update({ checkout_em: new Date().toISOString(), checkout_por: user?.id }).eq("id", existing.id);
    return { acao: "CHECKOUT", nome: child.nome };
  }

  // Check-in
  const { data: ci } = await sb.from("child_checkins").insert({
    ministry_id: ctx.ministry_id,
    child_id: child.id,
    class_id: class_id || null,
    data: hoje,
    checkin_por: user?.id,
  }).select("etiqueta_codigo").single();

  return { acao: "CHECKIN", nome: child.nome, etiqueta: ci?.etiqueta_codigo };
}

export async function listarCheckinsHojeAction() {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const sb = await createClient();
  const hoje = new Date().toISOString().slice(0, 10);
  const { data, error } = await sb
    .from("child_checkins")
    .select("*, child_profiles:child_id(nome, foto_url), child_classes:class_id(nome)")
    .eq("ministry_id", ctx.ministry_id)
    .eq("data", hoje)
    .order("checkin_em", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
