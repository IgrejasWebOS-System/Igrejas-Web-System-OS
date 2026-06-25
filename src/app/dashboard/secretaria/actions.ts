"use server";

import { revalidatePath } from "next/cache";
import { createClient }   from "@/utils/supabase/server";
import { getAuthContext } from "@/utils/supabase/auth-context";
import type { DocumentType, DocumentListItem } from "@/types";

// ── Listar tipos de documento do ministério ──────────────────
export async function listarTiposDocumento(): Promise<{
  data: DocumentType[];
  error?: string;
}> {
  const ctx = await getAuthContext();
  if (!ctx) return { data: [], error: "Sem contexto de sessão" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_types")
    .select("*")
    .eq("ministry_id", ctx.ministry_id)
    .eq("is_active", true)
    .order("nome");

  if (error) return { data: [], error: error.message };
  return { data: (data as DocumentType[]) ?? [] };
}

// ── Listar documentos emitidos ───────────────────────────────
export async function listarDocumentos(filtros?: {
  party_id?: string;
  type_id?: string;
  data_inicio?: string;
  data_fim?: string;
  page?: number;
}): Promise<{ data: DocumentListItem[]; total: number; error?: string }> {
  const ctx = await getAuthContext();
  if (!ctx) return { data: [], total: 0, error: "Sem contexto de sessão" };

  const supabase = await createClient();
  const page = filtros?.page ?? 1;
  const pageSize = 25;
  const from = (page - 1) * pageSize;

  let query = supabase
    .from("documents")
    .select(
      `
      id, ministry_id, party_id, unit_id, type_id,
      data_emissao, numero_protocolo, observacoes, is_active, created_at,
      document_types!inner ( nome, slug ),
      parties!inner ( full_name ),
      party_members ( matricula ),
      units ( name )
    `,
      { count: "exact" }
    )
    .eq("ministry_id", ctx.ministry_id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (filtros?.party_id) query = query.eq("party_id", filtros.party_id);
  if (filtros?.type_id)  query = query.eq("type_id", filtros.type_id);
  if (filtros?.data_inicio) query = query.gte("data_emissao", filtros.data_inicio);
  if (filtros?.data_fim)    query = query.lte("data_emissao", filtros.data_fim);

  const { data, error, count } = await query;
  if (error) return { data: [], total: 0, error: error.message };

  const items: DocumentListItem[] = (data ?? []).map((row: any) => ({
    id:               row.id,
    ministry_id:      row.ministry_id,
    party_id:         row.party_id,
    unit_id:          row.unit_id,
    type_id:          row.type_id,
    emitido_por:      row.emitido_por ?? null,
    data_emissao:     row.data_emissao,
    numero_protocolo: row.numero_protocolo,
    conteudo_html:    null,
    arquivo_url:      row.arquivo_url ?? null,
    observacoes:      row.observacoes ?? null,
    is_active:        row.is_active,
    created_at:       row.created_at,
    tipo_nome:        row.document_types?.nome ?? "",
    tipo_slug:        row.document_types?.slug ?? "",
    membro_nome:      row.parties?.full_name ?? "",
    membro_matricula: row.party_members?.[0]?.matricula ?? null,
    unidade_nome:     row.units?.name ?? null,
  }));

  return { data: items, total: count ?? 0 };
}

// ── Listar documentos de um membro específico ────────────────
export async function listarDocumentosMembro(partyId: string): Promise<{
  data: DocumentListItem[];
  error?: string;
}> {
  const result = await listarDocumentos({ party_id: partyId, page: 1 });
  return { data: result.data, error: result.error };
}

// ── Buscar tipo de documento com template ────────────────────
export async function buscarTipoDocumento(typeId: string): Promise<{
  data: DocumentType | null;
  error?: string;
}> {
  const ctx = await getAuthContext();
  if (!ctx) return { data: null, error: "Sem contexto de sessão" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_types")
    .select("*")
    .eq("id", typeId)
    .eq("ministry_id", ctx.ministry_id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as DocumentType };
}

// ── Emitir documento ─────────────────────────────────────────
export async function emitirDocumentoAction(payload: {
  party_id: string;
  type_id: string;
  observacoes?: string;
}): Promise<{ data?: { id: string; numero_protocolo: string }; error?: string }> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Sem contexto de sessão" };
  if (ctx.level > 4) return { error: "Acesso negado" };

  const supabase = await createClient();

  // 1. Busca dados do membro
  const { data: memberData, error: memberErr } = await supabase
    .from("party_members")
    .select(`
      id, unit_id, matricula, cargo_id, situacao,
      data_ingresso, data_batismo_aguas, data_batismo_espirito,
      member_cargos ( nome ),
      units ( id, name )
    `)
    .eq("party_id", payload.party_id)
    .eq("ministry_id", ctx.ministry_id)
    .single();

  if (memberErr || !memberData) return { error: "Membro não encontrado" };

  const { data: partyData, error: partyErr } = await supabase
    .from("parties")
    .select("full_name, cpf, email")
    .eq("id", payload.party_id)
    .single();

  if (partyErr || !partyData) return { error: "Dados da pessoa não encontrados" };

  // 2. Busca template
  const { data: typeData, error: typeErr } = await supabase
    .from("document_types")
    .select("template_html, nome")
    .eq("id", payload.type_id)
    .eq("ministry_id", ctx.ministry_id)
    .single();

  if (typeErr || !typeData) return { error: "Tipo de documento não encontrado" };

  // 3. Busca ministério
  const { data: ministryData } = await supabase
    .from("ministries")
    .select("name")
    .eq("id", ctx.ministry_id)
    .single();

  // 4. Gera número de protocolo
  const { data: protocolData, error: protocolErr } = await supabase
    .rpc("gerar_numero_protocolo", { p_ministry_id: ctx.ministry_id });

  if (protocolErr) return { error: "Erro ao gerar protocolo: " + protocolErr.message };
  const numeroProtocolo = protocolData as string;

  // 5. Preenche variáveis do template
  const hoje = new Date();
  const dataEmissao = hoje.toLocaleDateString("pt-BR");
  const dataEmissaoExtenso = hoje.toLocaleDateString("pt-BR", {
    day: "numeric", month: "long", year: "numeric",
  });

  const formatDate = (d: string | null) =>
    d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—";

  const m = memberData as any;
  const p = partyData as any;
  const min = ministryData as any;

  let html = typeData.template_html;
  const vars: Record<string, string> = {
    nome:                   p.full_name ?? "",
    cpf:                    p.cpf ?? "—",
    matricula:              m.matricula ?? m.id.slice(0, 8).toUpperCase(),
    cargo:                  m.member_cargos?.nome ?? "Membro",
    situacao:               m.situacao ?? "",
    unidade:                m.units?.name ?? ctx.ministry_name,
    ministerio:             min?.name ?? ctx.ministry_name,
    data_emissao:           dataEmissao,
    data_emissao_extenso:   dataEmissaoExtenso,
    numero_protocolo:       numeroProtocolo,
    data_batismo_aguas:     formatDate(m.data_batismo_aguas),
    data_batismo_espirito:  formatDate(m.data_batismo_espirito),
    data_ingresso:          formatDate(m.data_ingresso),
    cnpj_ministerio:        "—",
    endereco_ministerio:    "—",
  };

  for (const [key, value] of Object.entries(vars)) {
    html = html.replaceAll(`{{${key}}}`, value);
  }

  // 6. Insere documento (SEC-3: emitido_por = user_id autenticado para auditoria)
  const { data: docData, error: docErr } = await supabase
    .from("documents")
    .insert({
      ministry_id:      ctx.ministry_id,
      party_id:         payload.party_id,
      unit_id:          m.unit_id,
      type_id:          payload.type_id,
      emitido_por:      ctx.user_id,       // ← auditoria: quem emitiu
      data_emissao:     hoje.toISOString().slice(0, 10),
      numero_protocolo: numeroProtocolo,
      conteudo_html:    html,
      observacoes:      payload.observacoes ?? null,
      is_active:        true,
    })
    .select("id, numero_protocolo")
    .single();

  if (docErr) return { error: "Erro ao salvar documento: " + docErr.message };

  revalidatePath("/dashboard/secretaria");
  return { data: docData as { id: string; numero_protocolo: string } };
}

// ── Cancelar documento (soft delete) ─────────────────────────
export async function cancelarDocumentoAction(
  documentId: string
): Promise<{ error?: string }> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Sem contexto de sessão" };
  if (ctx.level > 1) return { error: "Apenas N0/N1 podem cancelar documentos" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("documents")
    .update({ is_active: false })
    .eq("id", documentId)
    .eq("ministry_id", ctx.ministry_id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/secretaria");
  return {};
}

// ── Buscar membros para autocomplete ────────────────────────
export async function buscarMembrosParaDocumento(termo: string): Promise<{
  data: { party_id: string; nome: string; matricula: string | null; unidade: string | null }[];
  error?: string;
}> {
  const ctx = await getAuthContext();
  if (!ctx) return { data: [], error: "Sem contexto de sessão" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("party_members")
    .select(`
      party_id,
      matricula,
      units ( name ),
      parties!inner ( full_name, cpf )
    `)
    .eq("ministry_id", ctx.ministry_id)
    .eq("situacao", "ATIVO")
    .or(`full_name.ilike.%${termo}%,cpf.ilike.%${termo}%`, { referencedTable: "parties" })
    .order("full_name", { referencedTable: "parties" })
    .limit(10);

  if (error) return { data: [], error: error.message };

  const items = (data ?? []).map((row: any) => ({
    party_id:  row.party_id,
    nome:      row.parties?.full_name ?? "",
    matricula: row.matricula ?? null,
    unidade:   row.units?.name ?? null,
  }));

  return { data: items };
}
