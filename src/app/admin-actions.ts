"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { redirect } from "next/navigation";

/**
 * Cria um novo ministério (campo) a partir do console N0.
 * Apenas Super-Master (level = 0, sem ministry_id) pode executar.
 */
export async function createMinisterioAction(formData: FormData) {
  // ── Verificação de segurança ───────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const meta  = (user.app_metadata ?? {}) as Record<string, unknown>;
  const level = meta.iw_level as number | undefined;
  if (level !== 0 || meta.iw_ministry_id) {
    throw new Error("Acesso negado: apenas Super-Master pode criar ministérios.");
  }

  // ── Campos do formulário ───────────────────────────────────────────────
  const name = (formData.get("name") as string)?.trim();
  if (!name || name.length < 3) {
    return { error: "Nome do campo deve ter ao menos 3 caracteres." };
  }

  // Auto-gerar slug: lowercase, sem acentos, espaços → hifens
  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")   // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

  const description = (formData.get("description") as string)?.trim() || null;
  const sigla = (formData.get("sigla") as string)?.trim().slice(0, 6).toUpperCase() || null;

  // ── Inserção no banco ──────────────────────────────────────────────────
  const admin = createAdminClient();

  // Verificar se slug já existe
  const { data: existing } = await admin
    .from("ministries")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    return { error: `Slug "${slug}" já está em uso. Escolha outro nome.` };
  }

  const { data: newMinistry, error: insertError } = await admin
    .from("ministries")
    .insert({
      name,
      slug,
      description,
      is_active: true,
    })
    .select("id")
    .single();

  if (insertError || !newMinistry) {
    return { error: "Erro ao criar ministério: " + (insertError?.message ?? "desconhecido") };
  }

  // Criar branding inicial se tiver sigla
  if (sigla) {
    await admin.from("ministry_branding").insert({
      ministry_id: newMinistry.id,
      sigla,
      cor_primaria: "#4A7DB5",
      cor_secundaria: "#6D28D9",
    }).select().maybeSingle().then(() => {});
  }

  redirect(`/dashboard/admin/campos/${newMinistry.id}`);
}
