"use server";

import { createClient } from "@/utils/supabase/server";
import { getAuthContext, assertLevel } from "@/utils/supabase/auth-context";
import type {
  PastoralGroupListItem,
  PastoralGroupDetail,
  PastoralGroupMember,
} from "@/types";

// ── Grupos ────────────────────────────────────────────────────────────────────

export async function listarGruposAction(): Promise<PastoralGroupListItem[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const { data: groups, error } = await supabase
    .from("pastoral_groups")
    .select(`*, parties!pastoral_groups_pastor_party_id_fkey(nome_completo), units(nome)`)
    .eq("ministry_id", ctx.ministry_id)
    .order("nome");

  if (error) throw new Error(error.message);

  // Contar membros e somar VPD por grupo
  const ids = (groups ?? []).map((g: Record<string, unknown>) => g.id as string);
  const { data: members } = await supabase
    .from("pastoral_group_members")
    .select("group_id, vpd")
    .in("group_id", ids);

  const stats: Record<string, { qtd: number; vpd: number }> = {};
  for (const m of members ?? []) {
    if (!stats[m.group_id]) stats[m.group_id] = { qtd: 0, vpd: 0 };
    stats[m.group_id].qtd++;
    stats[m.group_id].vpd += m.vpd ?? 0;
  }

  return (groups ?? []).map((g: Record<string, unknown>) => {
    const pastor = g.parties as Record<string, string> | null;
    const unit   = g.units   as Record<string, string> | null;
    const s = stats[g.id as string] ?? { qtd: 0, vpd: 0 };
    return {
      ...g,
      pastor_nome: pastor?.nome_completo ?? null,
      unit_nome:   unit?.nome ?? null,
      qtd_membros: s.qtd,
      vpd_total:   s.vpd,
    } as PastoralGroupListItem;
  });
}

export async function buscarGrupoAction(id: string): Promise<PastoralGroupDetail> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const { data: group, error } = await supabase
    .from("pastoral_groups")
    .select(`*, parties!pastoral_groups_pastor_party_id_fkey(nome_completo), units(nome)`)
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id)
    .single();
  if (error || !group) throw new Error(error?.message ?? "Grupo não encontrado");

  const { data: rawMembers } = await supabase
    .from("pastoral_group_members")
    .select(`
      *,
      party:parties!pastoral_group_members_party_id_fkey(
        nome_completo, matricula,
        party_members(cargo:member_cargos(nome))
      )
    `)
    .eq("group_id", id)
    .order("created_at");

  const pastor = (group.parties as Record<string, string> | null);
  const unit   = (group.units   as Record<string, string> | null);

  const membros = (rawMembers ?? []).map((m: Record<string, unknown>) => {
    const p = m.party as Record<string, unknown> | null;
    const pm = (p?.party_members as Record<string, unknown>[] | null)?.[0];
    const cargo = (pm?.cargo as Record<string, string> | null)?.nome ?? null;
    return {
      ...m,
      membro_nome:      (p?.nome_completo as string) ?? "—",
      membro_matricula: (p?.matricula     as string | null) ?? null,
      cargo_nome:       cargo,
    } as PastoralGroupMember & { membro_nome: string; membro_matricula: string | null; cargo_nome: string | null };
  });

  return {
    ...group,
    pastor_nome: pastor?.nome_completo ?? null,
    unit_nome:   unit?.nome ?? null,
    membros,
  } as PastoralGroupDetail;
}

export async function criarGrupoAction(formData: FormData): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const supabase = await createClient();

  const payload: Record<string, unknown> = {
    ministry_id: ctx.ministry_id,
    nome:        (formData.get("nome") as string).trim(),
  };
  const desc     = formData.get("descricao")       as string | null;
  const pastorId = formData.get("pastor_party_id") as string | null;
  const unitId   = formData.get("unit_id")         as string | null;
  if (desc?.trim())  payload.descricao        = desc.trim();
  if (pastorId)      payload.pastor_party_id  = pastorId;
  if (unitId)        payload.unit_id          = unitId;

  const { error } = await supabase.from("pastoral_groups").insert(payload);
  if (error) throw new Error(error.message);
}

export async function editarGrupoAction(id: string, formData: FormData): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const supabase = await createClient();

  const payload: Record<string, unknown> = {
    nome: (formData.get("nome") as string).trim(),
  };
  const desc     = formData.get("descricao")       as string | null;
  const pastorId = formData.get("pastor_party_id") as string | null;
  const unitId   = formData.get("unit_id")         as string | null;
  payload.descricao        = desc?.trim()  || null;
  payload.pastor_party_id  = pastorId      || null;
  payload.unit_id          = unitId        || null;

  const { error } = await supabase
    .from("pastoral_groups")
    .update(payload)
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
}

export async function toggleGrupoAction(id: string, is_active: boolean): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const supabase = await createClient();

  const { error } = await supabase
    .from("pastoral_groups")
    .update({ is_active })
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
}

// ── Membros do grupo ──────────────────────────────────────────────────────────

export async function adicionarMembroGrupoAction(
  group_id: string,
  party_id: string,
  vpd?: number | null,
  observacoes?: string | null
): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const supabase = await createClient();

  const { error } = await supabase.from("pastoral_group_members").insert({
    group_id,
    party_id,
    ministry_id: ctx.ministry_id,
    vpd:         vpd ?? null,
    observacoes: observacoes ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function removerMembroGrupoAction(id: string): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const supabase = await createClient();

  const { error } = await supabase
    .from("pastoral_group_members")
    .delete()
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
}

export async function atualizarVpdAction(id: string, vpd: number | null): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const supabase = await createClient();

  const { error } = await supabase
    .from("pastoral_group_members")
    .update({ vpd })
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
}
