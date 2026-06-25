"use server";

import { revalidatePath }              from "next/cache";
import { createClient }                from "@/utils/supabase/server";
import { getAuthContext, assertLevel } from "@/utils/supabase/auth-context";
import type {
  PreRegistrationCampaign,
  PreRegistrationListItem,
  PreRegistration,
  PreRegSituacao,
} from "@/types";

async function getCtx(minLevel = 3) {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Sessão não encontrada.");
  assertLevel(ctx, minLevel, "Sem permissão.");
  return ctx;
}

// ── Campanhas ─────────────────────────────────────────────────────────────────
export async function listarCampanhasAction(): Promise<PreRegistrationCampaign[]> {
  const ctx = await getCtx(2);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pre_registration_campaigns")
    .select("*")
    .eq("ministry_id", ctx.ministry_id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PreRegistrationCampaign[];
}

export async function criarCampanhaAction(formData: FormData) {
  const ctx = await getCtx(2);
  const supabase = await createClient();

  const nome        = (formData.get("nome") as string)?.trim();
  const descricao   = (formData.get("descricao") as string)?.trim() || null;
  const tipo        = (formData.get("tipo") as string) || "NOVO_MEMBRO";
  const data_inicio = (formData.get("data_inicio") as string) || null;
  const data_fim    = (formData.get("data_fim") as string) || null;

  if (!nome) throw new Error("Nome é obrigatório.");

  const { error } = await supabase.from("pre_registration_campaigns").insert({
    ministry_id: ctx.ministry_id, nome, descricao, tipo, data_inicio, data_fim,
    is_active: true, criado_por: ctx.user_id ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/secretaria/pre-cadastros");
}

export async function editarCampanhaAction(id: string, formData: FormData) {
  const ctx = await getCtx(2);
  const supabase = await createClient();

  const nome        = (formData.get("nome") as string)?.trim();
  const descricao   = (formData.get("descricao") as string)?.trim() || null;
  const tipo        = formData.get("tipo") as string;
  const data_inicio = (formData.get("data_inicio") as string) || null;
  const data_fim    = (formData.get("data_fim") as string) || null;

  if (!nome) throw new Error("Nome é obrigatório.");

  const { error } = await supabase
    .from("pre_registration_campaigns")
    .update({ nome, descricao, tipo, data_inicio, data_fim })
    .eq("id", id).eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/secretaria/pre-cadastros");
}

export async function toggleCampanhaAction(id: string, is_active: boolean) {
  const ctx = await getCtx(2);
  const supabase = await createClient();
  const { error } = await supabase
    .from("pre_registration_campaigns")
    .update({ is_active })
    .eq("id", id).eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/secretaria/pre-cadastros");
}

// ── Pré-cadastros ─────────────────────────────────────────────────────────────
export type ListarPreCadastrosParams = {
  page?:       number;
  per_page?:   number;
  busca?:      string;
  situacao?:   PreRegSituacao | "";
  campaign_id?: string;
};

export async function listarPreCadastrosAction(params: ListarPreCadastrosParams = {}): Promise<{
  data: PreRegistrationListItem[];
  total: number;
  error?: string;
}> {
  const ctx = await getCtx(3);
  const supabase = await createClient();

  const page     = params.page     ?? 1;
  const per_page = params.per_page ?? 25;
  const offset   = (page - 1) * per_page;

  let query = supabase
    .from("pre_registrations")
    .select(`
      *,
      pre_registration_campaigns!campaign_id ( nome, tipo ),
      parties!party_id ( full_name, email,
        party_phones!party_id ( phone, is_primary )
      )
    `, { count: "exact" })
    .eq("ministry_id", ctx.ministry_id)
    .order("created_at", { ascending: false })
    .range(offset, offset + per_page - 1);

  if (params.situacao)    query = query.eq("situacao",    params.situacao);
  if (params.campaign_id) query = query.eq("campaign_id", params.campaign_id);

  const { data, count, error } = await query;
  if (error) return { data: [], total: 0, error: error.message };

  let rows = (data ?? []) as any[];

  if (params.busca?.trim()) {
    const q = params.busca.trim().toLowerCase();
    rows = rows.filter(r => {
      const nome = (r.parties?.full_name ?? r.dados_json?.nome ?? "").toString().toLowerCase();
      return nome.includes(q);
    });
  }

  const mapped: PreRegistrationListItem[] = rows.map(r => {
    const phones     = (r.parties?.party_phones ?? []) as any[];
    const primary    = phones.find((p: any) => p.is_primary) ?? phones[0] ?? null;
    const nome       = r.parties?.full_name ?? (r.dados_json as any)?.nome ?? "—";
    const camp       = r.pre_registration_campaigns;
    return {
      id:             r.id,
      ministry_id:    r.ministry_id,
      campaign_id:    r.campaign_id,
      party_id:       r.party_id,
      situacao:       r.situacao,
      dados_json:     r.dados_json,
      observacoes:    r.observacoes,
      aprovado_por:   r.aprovado_por,
      data_aprovacao: r.data_aprovacao,
      criado_por:     r.criado_por,
      created_at:     r.created_at,
      nome,
      telefone:       primary?.phone ?? null,
      email:          r.parties?.email ?? (r.dados_json as any)?.email ?? null,
      campaign_nome:  camp?.nome  ?? null,
      campaign_tipo:  camp?.tipo  ?? null,
    };
  });

  return { data: mapped, total: count ?? mapped.length };
}

export async function criarPreCadastroAction(formData: FormData): Promise<{ id?: string; error?: string }> {
  const ctx = await getCtx(3);
  const supabase = await createClient();

  const campaign_id = (formData.get("campaign_id") as string) || null;
  const observacoes = (formData.get("observacoes") as string)?.trim() || null;

  // Dados pessoais do pré-cadastro
  const dadosRaw = formData.get("dados_json") as string;
  const dados_json: Record<string, unknown> = dadosRaw ? JSON.parse(dadosRaw) : {};

  // Cria um party PROVISÓRIO se tiver nome
  let party_id: string | null = null;
  const nomeCompleto = (dados_json.nome as string)?.trim();
  if (nomeCompleto) {
    const { data: party, error: partyErr } = await supabase
      .from("parties")
      .insert({
        ministry_id:    ctx.ministry_id,
        full_name:      nomeCompleto,
        email:          (dados_json.email as string) || null,
        party_type:     "PERSON",
        party_subtype:  "MEMBRO_PROVISORIO",
      })
      .select("id")
      .single();
    if (partyErr) return { error: partyErr.message };
    party_id = party.id;
  }

  const { data, error } = await supabase
    .from("pre_registrations")
    .insert({
      ministry_id: ctx.ministry_id,
      campaign_id,
      party_id,
      dados_json,
      observacoes,
      situacao:   "PENDENTE",
      criado_por: ctx.user_id ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/dashboard/secretaria/pre-cadastros");
  return { id: data.id };
}

export async function aprovarPreCadastroAction(id: string): Promise<{ error?: string }> {
  const ctx = await getCtx(2);
  const supabase = await createClient();

  // Busca o pré-cadastro
  const { data: pr, error: fetchErr } = await supabase
    .from("pre_registrations")
    .select("*, parties!party_id(*)")
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id)
    .single();

  if (fetchErr || !pr) return { error: "Pré-cadastro não encontrado." };
  if (pr.situacao !== "PENDENTE") return { error: "Apenas pré-cadastros PENDENTES podem ser aprovados." };

  const dados = (pr.dados_json ?? {}) as Record<string, unknown>;

  // Se ainda não tem party, cria agora
  let party_id = pr.party_id as string | null;
  if (!party_id) {
    const nome = (dados.nome as string)?.trim() ?? "Sem nome";
    const { data: p, error: pErr } = await supabase
      .from("parties")
      .insert({
        ministry_id:   ctx.ministry_id,
        full_name:     nome,
        email:         (dados.email as string) || null,
        party_type:    "PERSON",
        party_subtype: "MEMBRO",
      })
      .select("id").single();
    if (pErr) return { error: pErr.message };
    party_id = p.id;
  } else {
    // Promove o party de PROVISÓRIO para MEMBRO
    await supabase.from("parties").update({ party_subtype: "MEMBRO" }).eq("id", party_id);
  }

  // Determina unit_id — usa o do contexto se não vier nos dados
  const unit_id = (dados.unit_id as string) ?? ctx.unit_id ?? null;

  // Cria party_members definitivo
  const { error: pmErr } = await supabase.from("party_members").insert({
    ministry_id:   ctx.ministry_id,
    party_id,
    unit_id,
    situacao:      "ATIVO",
    data_entrada:  new Date().toISOString().slice(0, 10),
    data_nascimento:     (dados.data_nascimento as string) || null,
    nome_mae:            (dados.nome_mae as string) || null,
    nome_pai:            (dados.nome_pai as string) || null,
    estado_civil_id:     (dados.estado_civil_id as string) || null,
    escolaridade_id:     (dados.escolaridade_id as string) || null,
    profissao:           (dados.profissao as string) || null,
  });

  if (pmErr) {
    // Se já existe (unique constraint), apenas atualiza a situação
    if (!pmErr.message.includes("duplicate")) return { error: pmErr.message };
  }

  // Marca pré-cadastro como FINALIZADO
  const { error: updErr } = await supabase
    .from("pre_registrations")
    .update({
      situacao:       "FINALIZADO",
      party_id,
      aprovado_por:   ctx.user_id ?? null,
      data_aprovacao: new Date().toISOString(),
    })
    .eq("id", id).eq("ministry_id", ctx.ministry_id);

  if (updErr) return { error: updErr.message };
  revalidatePath("/dashboard/secretaria/pre-cadastros");
  return {};
}

export async function cancelarPreCadastroAction(id: string, motivo?: string): Promise<{ error?: string }> {
  const ctx = await getCtx(2);
  const supabase = await createClient();

  const { error } = await supabase
    .from("pre_registrations")
    .update({ situacao: "CANCELADO", observacoes: motivo ?? null })
    .eq("id", id).eq("ministry_id", ctx.ministry_id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/secretaria/pre-cadastros");
  return {};
}

export async function buscarPreCadastroAction(id: string): Promise<{ data?: PreRegistration; error?: string }> {
  const ctx = await getCtx(3);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pre_registrations")
    .select(`*, pre_registration_campaigns!campaign_id(nome, tipo), parties!party_id(*)`)
    .eq("id", id).eq("ministry_id", ctx.ministry_id).single();

  if (error || !data) return { error: error?.message ?? "Não encontrado." };
  return { data: data as unknown as PreRegistration };
}
