"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const email    = (formData.get("email")    as string)?.trim();
  const password = (formData.get("password") as string);

  if (!email || !password) {
    return { error: "E-mail e senha são obrigatórios." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "E-mail ou senha incorretos." };
  }

  // Verificar se é Super-Master (N0) para redirecionar ao console
  const { data: { user } } = await supabase.auth.getUser();
  const meta  = (user?.app_metadata ?? {}) as Record<string, unknown>;
  const level = meta.iw_level as number | undefined;

  // N0 sem ministry_id (Super-Master) → console da plataforma
  if (level === 0 && !meta.iw_ministry_id) {
    redirect("/");
  }

  redirect("/contexto");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
