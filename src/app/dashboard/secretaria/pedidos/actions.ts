"use server";

import { createClient } from "@/utils/supabase/server";
import { getAuthContext, assertLevel } from "@/utils/supabase/auth-context";
import type {
  Material,
  MaterialOrderListItem,
  MaterialOrderDetail,
  MaterialOrderItem,
  OrderSituacao,
} from "@/types";

// ── Catálogo ──────────────────────────────────────────────────────────────────

export async function listarMateriaisAction(): Promise<Material[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("materials")
    .select("*")
    .eq("ministry_id", ctx.ministry_id)
    .order("nome");

  if (error) throw new Error(error.message);
  return (data ?? []) as Material[];
}

export async function listarMateriaisAtivosAction(): Promise<Material[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("materials")
    .select("*")
    .eq("ministry_id", ctx.ministry_id)
    .eq("is_active", true)
    .order("nome");

  if (error) throw new Error(error.message);
  return (data ?? []) as Material[];
}

export async function criarMaterialAction(formData: FormData): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const supabase = await createClient();

  const { error } = await supabase.from("materials").insert({
    ministry_id:    ctx.ministry_id,
    nome:           formData.get("nome") as string,
    descricao:      (formData.get("descricao") as string) || null,
    unidade:        (formData.get("unidade") as string) || "unid",
    valor_unitario: parseFloat((formData.get("valor_unitario") as string) || "0"),
  });
  if (error) throw new Error(error.message);
}

export async function editarMaterialAction(id: string, formData: FormData): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const supabase = await createClient();

  const { error } = await supabase
    .from("materials")
    .update({
      nome:           formData.get("nome") as string,
      descricao:      (formData.get("descricao") as string) || null,
      unidade:        (formData.get("unidade") as string) || "unid",
      valor_unitario: parseFloat((formData.get("valor_unitario") as string) || "0"),
    })
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
}

export async function toggleMaterialAction(id: string, is_active: boolean): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const supabase = await createClient();

  const { error } = await supabase
    .from("materials")
    .update({ is_active })
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
}

// ── Pedidos ───────────────────────────────────────────────────────────────────

export async function listarPedidosAction(params?: {
  situacao?: OrderSituacao;
  unit_id?: string;
}): Promise<MaterialOrderListItem[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const supabase = await createClient();

  // Usar a view material_orders_with_total
  let query = supabase
    .from("material_orders_with_total")
    .select("*")
    .eq("ministry_id", ctx.ministry_id)
    .order("created_at", { ascending: false });

  if (params?.situacao) query = query.eq("situacao", params.situacao);
  if (params?.unit_id)  query = query.eq("unit_id",  params.unit_id);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as MaterialOrderListItem[];
}

export async function buscarPedidoAction(id: string): Promise<MaterialOrderDetail> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const supabase = await createClient();

  const [orderRes, itemsRes] = await Promise.all([
    supabase
      .from("material_orders_with_total")
      .select("*")
      .eq("id", id)
      .eq("ministry_id", ctx.ministry_id)
      .single(),
    supabase
      .from("material_order_items")
      .select("*")
      .eq("order_id", id)
      .order("created_at"),
  ]);

  if (orderRes.error) throw new Error(orderRes.error.message);
  return {
    ...orderRes.data,
    items: (itemsRes.data ?? []) as MaterialOrderItem[],
  } as MaterialOrderDetail;
}

export type NovoPedidoItem = {
  material_id:    string;
  nome_snapshot:  string;
  quantidade:     number;
  valor_unitario: number;
};

export async function criarPedidoAction(
  unit_id: string | null,
  observacoes: string | null,
  items: NovoPedidoItem[]
): Promise<string> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const supabase = await createClient();

  if (!items.length) throw new Error("O pedido deve ter ao menos um item");

  // Criar pedido
  const { data: order, error: ordErr } = await supabase
    .from("material_orders")
    .insert({
      ministry_id:     ctx.ministry_id,
      unit_id:         unit_id || null,
      observacoes:     observacoes || null,
      criado_por:      ctx.user_id,
      criado_por_nome: null,
    })
    .select("id")
    .single();
  if (ordErr || !order) throw new Error(ordErr?.message ?? "Erro ao criar pedido");

  // Inserir itens
  const { error: itemsErr } = await supabase
    .from("material_order_items")
    .insert(
      items.map(i => ({
        order_id:       order.id,
        material_id:    i.material_id,
        nome_snapshot:  i.nome_snapshot,
        quantidade:     i.quantidade,
        valor_unitario: i.valor_unitario,
      }))
    );
  if (itemsErr) throw new Error(itemsErr.message);

  return order.id;
}

export async function mudarSituacaoPedidoAction(
  id: string,
  situacao: OrderSituacao
): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 2);
  const supabase = await createClient();

  const { error } = await supabase
    .from("material_orders")
    .update({ situacao })
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
}

export async function listarUnidadesAction(): Promise<{ id: string; nome: string }[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("units")
    .select("id, nome")
    .eq("ministry_id", ctx.ministry_id)
    .order("nome");
  if (error) throw new Error(error.message);
  return data ?? [];
}
