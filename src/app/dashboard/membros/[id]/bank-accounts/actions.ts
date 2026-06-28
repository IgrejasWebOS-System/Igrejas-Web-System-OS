"use server";

import { createClient } from "@/utils/supabase/server";
import { getAuthContext, assertLevel } from "@/utils/supabase/auth-context";
import type { MemberBankAccount } from "@/types";

export async function listarContasAction(party_id: string): Promise<MemberBankAccount[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("member_bank_accounts")
    .select("*")
    .eq("party_id", party_id)
    .eq("ministry_id", ctx.ministry_id)
    .order("is_principal", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as MemberBankAccount[];
}

export async function criarContaAction(party_id: string, formData: FormData): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const supabase = await createClient();

  const isPrincipal = formData.get("is_principal") === "true";

  // Se vai ser principal, remover flag das outras
  if (isPrincipal) {
    await supabase
      .from("member_bank_accounts")
      .update({ is_principal: false })
      .eq("party_id", party_id)
      .eq("ministry_id", ctx.ministry_id);
  }

  const { error } = await supabase.from("member_bank_accounts").insert({
    ministry_id:  ctx.ministry_id,
    party_id,
    banco:        formData.get("banco") as string,
    agencia:      (formData.get("agencia") as string) || null,
    conta:        (formData.get("conta")   as string) || null,
    tipo:         (formData.get("tipo")    as string) || "CORRENTE",
    chave_pix:    (formData.get("chave_pix") as string) || null,
    is_principal: isPrincipal,
  });
  if (error) throw new Error(error.message);
}

export async function editarContaAction(id: string, party_id: string, formData: FormData): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const supabase = await createClient();

  const isPrincipal = formData.get("is_principal") === "true";

  if (isPrincipal) {
    await supabase
      .from("member_bank_accounts")
      .update({ is_principal: false })
      .eq("party_id", party_id)
      .eq("ministry_id", ctx.ministry_id)
      .neq("id", id);
  }

  const { error } = await supabase
    .from("member_bank_accounts")
    .update({
      banco:        formData.get("banco") as string,
      agencia:      (formData.get("agencia")   as string) || null,
      conta:        (formData.get("conta")     as string) || null,
      tipo:         (formData.get("tipo")      as string) || "CORRENTE",
      chave_pix:    (formData.get("chave_pix") as string) || null,
      is_principal: isPrincipal,
    })
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
}

export async function excluirContaAction(id: string): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const supabase = await createClient();

  const { error } = await supabase
    .from("member_bank_accounts")
    .delete()
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
}
