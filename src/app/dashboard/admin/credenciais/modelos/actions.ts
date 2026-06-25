"use server";

import { revalidatePath }              from "next/cache";
import { createClient }                from "@/utils/supabase/server";
import { getAuthContext, assertLevel } from "@/utils/supabase/auth-context";
import type { CredentialModel }        from "@/types";

async function getCtx() {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Sessão não encontrada.");
  assertLevel(ctx, 2, "Sem permissão para gerenciar modelos de credencial.");
  return ctx;
}

export async function listarModelosCredencialAction(): Promise<CredentialModel[]> {
  const ctx = await getCtx();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("credential_models")
    .select("*")
    .eq("ministry_id", ctx.ministry_id)
    .order("nome");
  if (error) throw new Error(error.message);
  return (data ?? []) as CredentialModel[];
}

export async function criarModeloCredencialAction(formData: FormData) {
  const ctx = await getCtx();
  const supabase = await createClient();

  const nome          = (formData.get("nome") as string)?.trim();
  const slug          = (formData.get("slug") as string)?.trim();
  const template_html = (formData.get("template_html") as string) || null;
  const cargo_id      = (formData.get("cargo_id") as string) || null;
  const validade_anos = Number(formData.get("validade_anos")) || 2;

  if (!nome) throw new Error("Nome é obrigatório.");

  const { error } = await supabase.from("credential_models").insert({
    ministry_id: ctx.ministry_id,
    nome, slug, template_html, cargo_id, validade_anos, is_active: true,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/admin/credenciais/modelos");
}

export async function editarModeloCredencialAction(id: string, formData: FormData) {
  const ctx = await getCtx();
  const supabase = await createClient();

  const nome          = (formData.get("nome") as string)?.trim();
  const slug          = (formData.get("slug") as string)?.trim();
  const template_html = (formData.get("template_html") as string) || null;
  const cargo_id      = (formData.get("cargo_id") as string) || null;
  const validade_anos = Number(formData.get("validade_anos")) || 2;

  if (!nome) throw new Error("Nome é obrigatório.");

  const { error } = await supabase
    .from("credential_models")
    .update({ nome, slug, template_html, cargo_id, validade_anos })
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/admin/credenciais/modelos");
}

export async function toggleModeloCredencialAction(id: string, is_active: boolean) {
  const ctx = await getCtx();
  const supabase = await createClient();

  const { error } = await supabase
    .from("credential_models")
    .update({ is_active })
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/admin/credenciais/modelos");
}

// Cargos para o select de cargo_id
export async function listarCargosAction() {
  const ctx = await getCtx();
  const supabase = await createClient();
  const { data } = await supabase
    .from("member_cargos")
    .select("id, nome")
    .eq("ministry_id", ctx.ministry_id)
    .eq("is_active", true)
    .order("ordem", { ascending: true }).order("nome");
  return (data ?? []) as { id: string; nome: string }[];
}
