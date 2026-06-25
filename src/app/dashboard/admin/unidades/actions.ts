"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import type { SessionContext, UnitType } from "@/types";

async function getCtx(): Promise<SessionContext> {
  const cookieStore = await cookies();
  const raw = cookieStore.get("iw_context")?.value;
  if (!raw) throw new Error("Sessão não encontrada.");
  return JSON.parse(raw);
}

function assertCanManage(ctx: SessionContext) {
  if (ctx.level > 1) throw new Error("Sem permissão para gerenciar unidades.");
}

// ── CREATE ────────────────────────────────────────────────────────────────────
export async function criarUnidadeAction(formData: FormData) {
  const ctx = await getCtx();
  assertCanManage(ctx);

  const supabase = await createClient();

  const name           = formData.get("name") as string;
  const unit_type      = formData.get("unit_type") as UnitType;
  const parent_id      = formData.get("parent_id") as string | null;
  const is_headquarters = formData.get("is_headquarters") === "on";
  const is_sector_mother = formData.get("is_sector_mother") === "on";
  const order_index    = parseInt(formData.get("order_index") as string || "0", 10);

  if (!name?.trim()) throw new Error("Nome é obrigatório.");
  if (!unit_type)     throw new Error("Tipo é obrigatório.");

  const { error } = await supabase.from("units").insert({
    ministry_id:      ctx.ministry_id,
    name:             name.trim(),
    unit_type,
    parent_id:        parent_id || null,
    is_headquarters,
    is_sector_mother,
    order_index,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/admin/unidades");
}

// ── UPDATE ────────────────────────────────────────────────────────────────────
export async function atualizarUnidadeAction(id: string, formData: FormData) {
  const ctx = await getCtx();
  assertCanManage(ctx);

  const supabase = await createClient();

  const name             = formData.get("name") as string;
  const unit_type        = formData.get("unit_type") as UnitType;
  const parent_id        = formData.get("parent_id") as string | null;
  const is_headquarters  = formData.get("is_headquarters") === "on";
  const is_sector_mother = formData.get("is_sector_mother") === "on";
  const order_index      = parseInt(formData.get("order_index") as string || "0", 10);

  if (!name?.trim()) throw new Error("Nome é obrigatório.");

  const { error } = await supabase.from("units")
    .update({
      name: name.trim(),
      unit_type,
      parent_id: parent_id || null,
      is_headquarters,
      is_sector_mother,
      order_index,
    })
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/admin/unidades");
}

// ── TOGGLE ATIVO ──────────────────────────────────────────────────────────────
export async function toggleUnidadeAtivaAction(id: string, is_active: boolean) {
  const ctx = await getCtx();
  assertCanManage(ctx);

  const supabase = await createClient();

  const { error } = await supabase.from("units")
    .update({ is_active })
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/admin/unidades");
}
