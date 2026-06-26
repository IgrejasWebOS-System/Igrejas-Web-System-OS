"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext, assertLevel } from "@/utils/supabase/auth-context";
import { createAdminClient } from "@/utils/supabase/admin";

// ── Listar todos os campos (N0 only) ─────────────────────────────────────────

export async function listarCamposAction() {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Não autenticado");
  assertLevel(ctx, 0, "Apenas Super Master pode gerenciar campos");

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("ministries")
    .select(`
      id, name, slug, is_active, created_at,
      ministry_branding ( nome_display, sigla, cor_primaria, logo_url, cidade, estado ),
      ministry_modules ( module, is_active ),
      provisioning_jobs ( status, started_at, finished_at, log )
    `)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message, data: null };
  return { data, error: null };
}

// ── Criar novo campo (dispara a função PL/pgSQL) ──────────────────────────────

export interface NovoCampoInput {
  nome: string;
  slug: string;
  nome_display: string;
  sigla: string;
  cor_primaria?: string;
  cor_secundaria?: string;
  cnpj?: string;
  cidade?: string;
  estado?: string;
  email_contato?: string;
}

export async function criarCampoAction(input: NovoCampoInput): Promise<{ ministry_id?: string; error?: string }> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Não autenticado" };
  assertLevel(ctx, 0, "Apenas Super Master pode criar campos");

  // Validações básicas
  if (!input.nome?.trim()) return { error: "Nome do campo é obrigatório" };
  if (!input.slug?.trim()) return { error: "Slug é obrigatório" };
  if (!/^[a-z0-9-]+$/.test(input.slug)) return { error: "Slug deve conter apenas letras minúsculas, números e hífens" };
  if (!input.nome_display?.trim()) return { error: "Nome de exibição é obrigatório" };

  const admin = createAdminClient();

  // Verificar slug único
  const { data: existing } = await admin
    .from("ministries")
    .select("id")
    .eq("slug", input.slug)
    .maybeSingle();

  if (existing) return { error: `Já existe um campo com o slug "${input.slug}"` };

  // Chamar função de provisionamento via RPC (roda como SECURITY DEFINER)
  const { data, error } = await admin.rpc("provisionar_novo_campo", {
    p_nome:          input.nome.trim(),
    p_slug:          input.slug.trim(),
    p_nome_display:  input.nome_display.trim(),
    p_sigla:         input.sigla?.trim() ?? "",
    p_cor_primaria:  input.cor_primaria  ?? "#6D28D9",
    p_cor_secundaria: input.cor_secundaria ?? "#4A7DB5",
    p_cnpj:          input.cnpj          ?? null,
    p_cidade:        input.cidade         ?? null,
    p_estado:        input.estado         ?? null,
    p_email_contato: input.email_contato  ?? null,
    p_iniciado_por:  ctx.user_id,
  });

  if (error) return { error: `Erro ao provisionar campo: ${error.message}` };

  revalidatePath("/dashboard/admin/campos");
  return { ministry_id: data as string };
}

// ── Atualizar branding de um campo ───────────────────────────────────────────

export interface BrandingInput {
  ministry_id: string;
  nome_display?: string;
  sigla?: string;
  cor_primaria?: string;
  cor_secundaria?: string;
  cor_acento?: string;
  fonte_principal?: string;
  logo_url?: string;
  favicon_url?: string;
  site_url?: string;
  email_contato?: string;
  whatsapp?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  cnpj?: string;
}

export async function atualizarBrandingAction(input: BrandingInput): Promise<{ error?: string }> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Não autenticado" };

  // N0 pode alterar qualquer campo; N1 só pode alterar o seu próprio campo
  if (ctx.level > 1) return { error: "Permissão insuficiente" };
  if (ctx.level === 1 && ctx.ministry_id !== input.ministry_id) {
    return { error: "Você só pode editar o branding do seu próprio campo" };
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("ministry_branding")
    .upsert({ ...input }, { onConflict: "ministry_id" });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/admin/campos");
  revalidatePath("/dashboard/admin/campos/" + input.ministry_id);
  return {};
}

// ── Ativar / desativar campo ──────────────────────────────────────────────────

export async function toggleCampoAtivoAction(
  ministry_id: string,
  is_active: boolean,
): Promise<{ error?: string }> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Não autenticado" };
  assertLevel(ctx, 0, "Apenas Super Master pode ativar/desativar campos");

  const admin = createAdminClient();

  const { error } = await admin
    .from("ministries")
    .update({ is_active })
    .eq("id", ministry_id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/admin/campos");
  return {};
}

// ── Buscar detalhes de um campo específico ────────────────────────────────────

export async function buscarCampoAction(ministry_id: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Não autenticado", data: null };
  if (ctx.level > 1 && ctx.ministry_id !== ministry_id) {
    return { error: "Permissão insuficiente", data: null };
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("ministries")
    .select(`
      id, name, slug, is_active, created_at,
      ministry_branding (*),
      ministry_modules ( module, is_active ),
      provisioning_jobs ( status, started_at, finished_at, log )
    `)
    .eq("id", ministry_id)
    .single();

  if (error) return { error: error.message, data: null };
  return { data, error: null };
}
