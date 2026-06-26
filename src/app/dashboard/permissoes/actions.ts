"use server";

import { createClient } from "@/utils/supabase/server";
import { getAuthContext, assertLevel } from "@/utils/supabase/auth-context";

import { MODULOS } from "./constants";

export async function listarPerfisAction() {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const sb = await createClient();
  const { data, error } = await sb.from("permission_profiles").select("*").eq("ministry_id", ctx.ministry_id).eq("ativo", true).order("nivel_base");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function criarPerfilAction(formData: FormData) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const sb = await createClient();

  const permissoes: Record<string, Record<string, boolean>> = {};
  for (const mod of MODULOS) {
    permissoes[mod] = {
      ler:     formData.get(`${mod}_ler`) === "on",
      criar:   formData.get(`${mod}_criar`) === "on",
      editar:  formData.get(`${mod}_editar`) === "on",
      excluir: formData.get(`${mod}_excluir`) === "on",
    };
  }

  const { error } = await sb.from("permission_profiles").insert({
    ministry_id: ctx.ministry_id,
    nome:        formData.get("nome") as string,
    descricao:   (formData.get("descricao") as string) || null,
    nivel_base:  parseInt(formData.get("nivel_base") as string) || 4,
    permissoes,
  });
  if (error) throw new Error(error.message);
}

export async function atualizarPerfilAction(id: string, formData: FormData) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const sb = await createClient();

  const permissoes: Record<string, Record<string, boolean>> = {};
  for (const mod of MODULOS) {
    permissoes[mod] = {
      ler:     formData.get(`${mod}_ler`) === "on",
      criar:   formData.get(`${mod}_criar`) === "on",
      editar:  formData.get(`${mod}_editar`) === "on",
      excluir: formData.get(`${mod}_excluir`) === "on",
    };
  }

  const { error } = await sb.from("permission_profiles").update({ nome: formData.get("nome"), descricao: formData.get("descricao"), nivel_base: parseInt(formData.get("nivel_base") as string), permissoes }).eq("id", id).eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
}

export async function listarGrantsAction() {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const sb = await createClient();
  const { data, error } = await sb.from("permission_grants").select("*, permission_profiles:profile_id(nome)").eq("ministry_id", ctx.ministry_id).eq("ativo", true);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function concederPermissaoAction(formData: FormData) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const { error } = await sb.from("permission_grants").upsert({
    ministry_id: ctx.ministry_id,
    user_id:     formData.get("user_id") as string,
    profile_id:  (formData.get("profile_id") as string) || null,
    valido_ate:  (formData.get("valido_ate") as string) || null,
    granted_by:  user?.id,
    ativo:       true,
  }, { onConflict: "ministry_id,user_id" });
  if (error) throw new Error(error.message);
}

export async function revogarGrantAction(id: string) {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const sb = await createClient();
  const { error } = await sb.from("permission_grants").update({ ativo: false }).eq("id", id).eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
}
