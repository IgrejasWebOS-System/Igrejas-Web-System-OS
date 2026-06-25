"use server";

import { revalidatePath }              from "next/cache";
import { createClient }                from "@/utils/supabase/server";
import { getAuthContext, assertLevel } from "@/utils/supabase/auth-context";
import type {
  CredentialRequest,
  CredentialRequestListItem,
  CredentialModel,
  CredentialRequestType,
  CredentialSituacao,
} from "@/types";

// ── Helpers ──────────────────────────────────────────────────────────────────
async function getCtx(minLevel = 3) {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Sessão não encontrada.");
  assertLevel(ctx, minLevel, "Sem permissão.");
  return ctx;
}

// ── Listagem ─────────────────────────────────────────────────────────────────
export type ListarCredenciaisParams = {
  page?:            number;
  per_page?:        number;
  busca?:           string;
  situacao?:        CredentialSituacao | "";
  model_id?:        string;
  request_type_id?: string;
  unit_id?:         string;
};

export async function listarCredenciaisAction(params: ListarCredenciaisParams = {}): Promise<{
  data: CredentialRequestListItem[];
  total: number;
  error?: string;
}> {
  const ctx = await getCtx(3);
  const supabase = await createClient();

  const page     = params.page     ?? 1;
  const per_page = params.per_page ?? 25;
  const offset   = (page - 1) * per_page;

  let query = supabase
    .from("credential_requests")
    .select(`
      *,
      parties!party_id (
        id, full_name, cpf,
        party_members!party_id ( matricula, foto_url, unit_id,
          units!unit_id ( name )
        )
      ),
      credential_models!model_id ( nome, cargo_id,
        member_cargos!cargo_id ( nome )
      ),
      credential_request_types!request_type_id ( nome )
    `, { count: "exact" })
    .eq("ministry_id", ctx.ministry_id)
    .order("created_at", { ascending: false })
    .range(offset, offset + per_page - 1);

  if (params.situacao)        query = query.eq("situacao",        params.situacao);
  if (params.model_id)        query = query.eq("model_id",        params.model_id);
  if (params.request_type_id) query = query.eq("request_type_id", params.request_type_id);

  const { data, count, error } = await query;
  if (error) return { data: [], total: 0, error: error.message };

  // Filtro de busca por nome e filtro de unidade em JS (joined data)
  let rows = (data ?? []) as any[];

  if (params.busca?.trim()) {
    const q = params.busca.trim().toLowerCase();
    rows = rows.filter(r => r.parties?.full_name?.toLowerCase().includes(q));
  }

  if (params.unit_id) {
    rows = rows.filter(r => {
      const pm = r.parties?.party_members?.[0];
      return pm?.unit_id === params.unit_id;
    });
  }

  const mapped: CredentialRequestListItem[] = rows.map(r => {
    const pm       = r.parties?.party_members?.[0] ?? null;
    const model    = r.credential_models ?? null;
    const reqType  = r.credential_request_types ?? null;
    const cargo    = model?.member_cargos ?? null;
    const unit     = pm?.units ?? null;
    return {
      id:               r.id,
      ministry_id:      r.ministry_id,
      party_id:         r.party_id,
      model_id:         r.model_id,
      request_type_id:  r.request_type_id,
      situacao:         r.situacao,
      arquivo_url:      r.arquivo_url,
      data_validade:    r.data_validade,
      observacoes:      r.observacoes,
      criado_por:       r.criado_por,
      aprovado_por:     r.aprovado_por,
      data_aprovacao:   r.data_aprovacao,
      created_at:       r.created_at,
      updated_at:       r.updated_at,
      membro_nome:      r.parties?.full_name  ?? "—",
      membro_matricula: pm?.matricula         ?? null,
      membro_foto:      pm?.foto_url          ?? null,
      model_nome:       model?.nome           ?? "—",
      request_type_nome:reqType?.nome         ?? null,
      cargo_nome:       cargo?.nome           ?? null,
      unit_nome:        unit?.name            ?? null,
    };
  });

  return { data: mapped, total: count ?? mapped.length };
}

// ── Criar credencial ──────────────────────────────────────────────────────────
export async function criarCredencialAction(formData: FormData): Promise<{ id?: string; error?: string }> {
  const ctx = await getCtx(3);
  const supabase = await createClient();

  const party_id        = formData.get("party_id") as string;
  const model_id        = formData.get("model_id") as string;
  const request_type_id = formData.get("request_type_id") as string || null;
  const observacoes     = (formData.get("observacoes") as string)?.trim() || null;

  if (!party_id || !model_id) return { error: "Membro e modelo são obrigatórios." };

  const { data, error } = await supabase
    .from("credential_requests")
    .insert({
      ministry_id: ctx.ministry_id,
      party_id,
      model_id,
      request_type_id,
      observacoes,
      situacao: "PENDENTE",
      criado_por: ctx.user_id ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/dashboard/secretaria/credenciais");
  return { id: data.id };
}

// ── Mudar situação ────────────────────────────────────────────────────────────
export async function mudarSituacaoAction(
  id: string,
  situacao: CredentialSituacao,
  arquivo_url?: string
): Promise<{ error?: string }> {
  const ctx = await getCtx(2); // aprovar = N2+
  const supabase = await createClient();

  const patch: Record<string, unknown> = { situacao };
  if (situacao === "LIBERADA" || situacao === "CONFIRMADA") {
    patch.aprovado_por   = ctx.user_id ?? null;
    patch.data_aprovacao = new Date().toISOString();

    // Calcular data_validade a partir do modelo
    const { data: req } = await supabase
      .from("credential_requests")
      .select("model_id, credential_models!model_id(validade_anos)")
      .eq("id", id)
      .single();

    const anos = (req as any)?.credential_models?.validade_anos ?? 2;
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + anos);
    patch.data_validade = expiry.toISOString().slice(0, 10);
  }
  if (arquivo_url) patch.arquivo_url = arquivo_url;

  const { error } = await supabase
    .from("credential_requests")
    .update(patch)
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/secretaria/credenciais");
  return {};
}

// ── Dados auxiliares para selects ────────────────────────────────────────────
export async function listarModelosAtivosAction(): Promise<CredentialModel[]> {
  const ctx = await getCtx(3);
  const supabase = await createClient();
  const { data } = await supabase
    .from("credential_models")
    .select("*")
    .eq("ministry_id", ctx.ministry_id)
    .eq("is_active", true)
    .order("nome");
  return (data ?? []) as CredentialModel[];
}

export async function listarTiposAtivosAction(): Promise<CredentialRequestType[]> {
  const ctx = await getCtx(3);
  const supabase = await createClient();
  const { data } = await supabase
    .from("credential_request_types")
    .select("*")
    .eq("ministry_id", ctx.ministry_id)
    .eq("is_active", true)
    .order("nome");
  return (data ?? []) as CredentialRequestType[];
}

// ── Buscar credencial pelo ID (para o PDF) ────────────────────────────────────
export async function buscarCredencialAction(id: string): Promise<{
  data?: CredentialRequest & {
    model: CredentialModel;
    membro_nome: string;
    membro_matricula: string | null;
    membro_foto: string | null;
    membro_cpf: string | null;
    cargo_nome: string | null;
    unit_nome: string | null;
    ministry_name: string;
  };
  error?: string;
}> {
  const ctx = await getCtx(3);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("credential_requests")
    .select(`
      *,
      credential_models!model_id ( *, member_cargos!cargo_id ( nome ) ),
      parties!party_id (
        full_name, cpf,
        party_members!party_id ( matricula, foto_url, units!unit_id ( name ) )
      ),
      ministries!ministry_id ( name )
    `)
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id)
    .single();

  if (error || !data) return { error: error?.message ?? "Não encontrada." };

  const r    = data as any;
  const pm   = r.parties?.party_members?.[0] ?? null;
  const model = r.credential_models as CredentialModel & { member_cargos: { nome: string } | null };

  return {
    data: {
      ...r,
      model,
      membro_nome:      r.parties?.full_name  ?? "—",
      membro_matricula: pm?.matricula         ?? null,
      membro_foto:      pm?.foto_url          ?? null,
      membro_cpf:       r.parties?.cpf        ?? null,
      cargo_nome:       model?.member_cargos?.nome ?? null,
      unit_nome:        pm?.units?.name       ?? null,
      ministry_name:    r.ministries?.name    ?? "",
    },
  };
}
