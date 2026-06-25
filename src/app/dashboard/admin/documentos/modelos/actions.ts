"use server";

import { revalidatePath }              from "next/cache";
import { createClient }                from "@/utils/supabase/server";
import { getAuthContext, assertLevel } from "@/utils/supabase/auth-context";
import type { DocumentType } from "@/types";

async function getCtx() {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Sessão não encontrada.");
  assertLevel(ctx, 2, "Sem permissão para gerenciar modelos de documentos.");
  return ctx;
}

export async function listarModelosAction(): Promise<DocumentType[]> {
  const ctx = await getCtx();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("document_types")
    .select("*")
    .eq("ministry_id", ctx.ministry_id)
    .order("nome");

  if (error) throw new Error(error.message);
  return (data as DocumentType[]) ?? [];
}

export async function criarModeloAction(formData: FormData) {
  const ctx = await getCtx();
  const supabase = await createClient();

  const nome          = (formData.get("nome") as string)?.trim();
  const slug          = (formData.get("slug") as string)?.trim().toLowerCase().replace(/\s+/g, "-");
  const template_html = (formData.get("template_html") as string) ?? "";

  if (!nome) throw new Error("Nome é obrigatório.");
  if (!slug) throw new Error("Slug é obrigatório.");

  const { error } = await supabase.from("document_types").insert({
    ministry_id:   ctx.ministry_id,
    nome,
    slug,
    template_html,
    is_active:     true,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/admin/documentos/modelos");
}

export async function editarModeloAction(id: string, formData: FormData) {
  const ctx = await getCtx();
  const supabase = await createClient();

  const nome          = (formData.get("nome") as string)?.trim();
  const slug          = (formData.get("slug") as string)?.trim().toLowerCase().replace(/\s+/g, "-");
  const template_html = (formData.get("template_html") as string) ?? "";

  if (!nome) throw new Error("Nome é obrigatório.");
  if (!slug) throw new Error("Slug é obrigatório.");

  const { error } = await supabase
    .from("document_types")
    .update({ nome, slug, template_html })
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/admin/documentos/modelos");
}

export async function toggleAtivoModeloAction(id: string, is_active: boolean) {
  const ctx = await getCtx();
  const supabase = await createClient();

  const { error } = await supabase
    .from("document_types")
    .update({ is_active })
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/admin/documentos/modelos");
}
