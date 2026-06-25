"use server";

import { redirect }                    from "next/navigation";
import { revalidatePath }              from "next/cache";
import { createClient }                from "@/utils/supabase/server";
import { getAuthContext, assertLevel } from "@/utils/supabase/auth-context";
import type {
  MemberLookups,
  MemberListItem,
  MemberFull,
  MemberSituacao,
  ScopeType,
} from "@/types";

// ── Guard básico ─────────────────────────────────────────────
async function getCtx() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/contexto");
  return ctx;
}

// ── Gerar código provisório ──────────────────────────────────
function gerarCodigoProvisorio(): string {
  const ano = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `P${ano}${rand}`;
}

// ============================================================
// buscarLookups
// Carrega todas as tabelas de lookup para preencher formulários.
// ============================================================
export async function buscarLookups(): Promise<{ data: MemberLookups | null; error?: string }> {
  const ctx = await getCtx();
  const supabase = await createClient();

  const [
    cargos,
    genders,
    civilStatuses,
    schoolings,
    professions,
    financialStatuses,
    departments,
    funcoesLookup,
    units,
  ] = await Promise.all([
    supabase.from("member_cargos").select("*").eq("ministry_id", ctx.ministry_id).eq("is_active", true).order("ordem"),
    supabase.from("member_genders").select("*").eq("ministry_id", ctx.ministry_id).eq("is_active", true),
    supabase.from("member_civil_status").select("*").eq("ministry_id", ctx.ministry_id).eq("is_active", true),
    supabase.from("member_schooling").select("*").eq("ministry_id", ctx.ministry_id).eq("is_active", true).order("ordem"),
    supabase.from("member_professions").select("*").eq("ministry_id", ctx.ministry_id).eq("is_active", true).order("nome"),
    supabase.from("member_financial_status").select("*").eq("ministry_id", ctx.ministry_id).eq("is_active", true),
    supabase.from("departments").select("*").eq("ministry_id", ctx.ministry_id).eq("is_active", true).order("nome"),
    supabase.from("member_funcoes_lookup").select("*").eq("ministry_id", ctx.ministry_id).eq("is_active", true).order("nome"),
    supabase.from("units").select("*").eq("ministry_id", ctx.ministry_id).eq("is_active", true).order("name"),
  ]);

  if (cargos.error) return { data: null, error: cargos.error.message };

  return {
    data: {
      cargos: cargos.data ?? [],
      genders: genders.data ?? [],
      civil_statuses: civilStatuses.data ?? [],
      schoolings: schoolings.data ?? [],
      professions: professions.data ?? [],
      financial_statuses: financialStatuses.data ?? [],
      departments: departments.data ?? [],
      funcoes_lookup: funcoesLookup.data ?? [],
      units: units.data ?? [],
    },
  };
}

// ============================================================
// listarMembros
// Lista membros com busca e filtros. JOIN parties + party_members
// + lookups de cargo e unidade.
// ============================================================
export type ListarMembrosParams = {
  busca?: string;
  situacao?: MemberSituacao | "";
  cargo_id?: string;
  unit_id?: string;
  gender_id?: string;
  civil_status_id?: string;
  page?: number;
  per_page?: number;
};

export async function listarMembros(params: ListarMembrosParams = {}): Promise<{
  data: MemberListItem[];
  total: number;
  error?: string;
}> {
  const ctx = await getCtx();
  const supabase = await createClient();

  const { busca = "", situacao = "", cargo_id = "", unit_id = "", gender_id = "", civil_status_id = "", page = 1, per_page = 25 } = params;

  const offset = (page - 1) * per_page;

  // Query base: JOIN de parties + party_members + cargo + unidade
  let query = supabase
    .from("party_members")
    .select(
      `
      id,
      matricula,
      codigo_provisorio,
      situacao,
      party_subtype,
      data_ingresso,
      cargo_id,
      unit_id,
      member_cargos ( nome ),
      units ( name ),
      member_genders ( nome ),
      parties!inner (
        id,
        full_name,
        cpf,
        email,
        photo_url
      )
    `,
      { count: "exact" },
    )
    .eq("ministry_id", ctx.ministry_id)
    .eq("is_active", true);

  // Filtro por situação
  if (situacao) query = query.eq("situacao", situacao);

  // Filtro por cargo
  if (cargo_id) query = query.eq("cargo_id", cargo_id);

  // Filtro por unidade
  if (unit_id) query = query.eq("unit_id", unit_id);

  // Filtro por gênero
  if (gender_id) query = query.eq("gender_id", gender_id);

  // Filtro por estado civil
  if (civil_status_id) query = query.eq("civil_status_id", civil_status_id);

  // Busca textual: matrícula exata OU código provisório OU nome/CPF via JOIN
  if (busca.trim()) {
    const term = busca.trim();
    // Matrícula e código provisório são buscados exato ou por ilike
    query = query.or(
      `matricula.ilike.%${term}%,codigo_provisorio.ilike.%${term}%,matricula_legado.ilike.%${term}%`,
    );
    // Nota: busca por nome/CPF requer filtro separado via join
    // Para simplificar nesta versão, filtraremos também no client
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + per_page - 1);

  if (error) return { data: [], total: 0, error: error.message };

  // Busca adicional por nome/CPF quando há termo (filtragem complementar)
  let rows = (data ?? []) as any[];

  if (busca.trim()) {
    const term = busca.trim().toLowerCase();
    rows = rows.filter((r: any) => {
      const nome = (r.parties?.full_name ?? "").toLowerCase();
      const cpf = (r.parties?.cpf ?? "").replace(/\D/g, "");
      const mat = (r.matricula ?? "").toLowerCase();
      const cod = (r.codigo_provisorio ?? "").toLowerCase();
      const leg = (r.matricula_legado ?? "").toLowerCase();
      const termClean = term.replace(/\D/g, "");
      return (
        nome.includes(term) ||
        (termClean && cpf.includes(termClean)) ||
        mat.includes(term) ||
        cod.includes(term) ||
        leg.includes(term)
      );
    });
  }

  const items: MemberListItem[] = rows.map((r: any) => ({
    party_id: r.parties?.id ?? "",
    full_name: r.parties?.full_name ?? "",
    cpf: r.parties?.cpf ?? null,
    email: r.parties?.email ?? null,
    photo_url: r.parties?.photo_url ?? null,
    pm_id: r.id,
    matricula: r.matricula,
    codigo_provisorio: r.codigo_provisorio,
    situacao: r.situacao,
    party_subtype: r.party_subtype,
    data_ingresso: r.data_ingresso,
    cargo_nome: r.member_cargos?.nome ?? null,
    unit_name: r.units?.name ?? null,
    gender_nome: r.member_genders?.nome ?? null,
  }));

  return { data: items, total: count ?? items.length };
}

// ============================================================
// buscarMembro
// Busca ficha completa de um membro por party_id.
// ============================================================
export async function buscarMembro(partyId: string): Promise<{
  data: MemberFull | null;
  error?: string;
}> {
  const ctx = await getCtx();
  const supabase = await createClient();

  const { data: party, error: partyError } = await supabase
    .from("parties")
    .select("*")
    .eq("id", partyId)
    .eq("ministry_id", ctx.ministry_id)
    .maybeSingle();

  if (partyError) return { data: null, error: partyError.message };
  if (!party) return { data: null, error: "Membro não encontrado" };

  const [pm, addresses, funcoes, dependents, history] = await Promise.all([
    supabase
      .from("party_members")
      .select(`*, member_cargos(*), member_civil_status(*), member_genders(*), member_schooling(*), member_professions(*), member_financial_status(*), units(*)`)
      .eq("party_id", partyId)
      .eq("ministry_id", ctx.ministry_id)
      .maybeSingle(),
    supabase
      .from("party_addresses")
      .select("*")
      .eq("party_id", partyId)
      .eq("ministry_id", ctx.ministry_id),
    supabase
      .from("party_funcoes")
      .select(`*, departments(nome, sigla), member_funcoes_lookup(nome), units(name)`)
      .eq("party_id", partyId)
      .eq("ministry_id", ctx.ministry_id)
      .order("is_ativo", { ascending: false }),
    supabase
      .from("party_dependents")
      .select(`*, parties!party_dependents_party_id_fkey(full_name, birth_date)`)
      .eq("responsible_party_id", partyId)
      .eq("ministry_id", ctx.ministry_id),
    supabase
      .from("member_history")
      .select("*")
      .eq("party_id", partyId)
      .eq("ministry_id", ctx.ministry_id)
      .order("criado_em", { ascending: false }),
  ]);

  if (!pm.data) return { data: null, error: "Dados eclesiásticos não encontrados" };

  return {
    data: {
      ...party,
      party_members: pm.data,
      party_addresses: addresses.data ?? [],
      party_funcoes: funcoes.data ?? [],
      party_dependents: dependents.data ?? [],
      member_history: history.data ?? [],
    } as MemberFull,
  };
}

// ============================================================
// criarMembroAction
// Cria a Party + PartyMember + endereço + registro inicial em
// member_history. Tudo em sequência (sem transação real no
// Supabase — usamos rollback manual em caso de erro).
// ============================================================
export async function criarMembroAction(fd: FormData): Promise<{ error?: string; party_id?: string }> {
  const ctx = await getCtx();
  const supabase = await createClient();

  // 1. Criar Party
  const { data: party, error: partyErr } = await supabase
    .from("parties")
    .insert({
      ministry_id: ctx.ministry_id,
      party_type: "PESSOA_FISICA",
      full_name: fd.get("full_name") as string,
      cpf: (fd.get("cpf") as string)?.replace(/\D/g, "") || null,
      email: (fd.get("email") as string) || null,
      phone: (fd.get("phone") as string) || null,
      birth_date: (fd.get("birth_date") as string) || null,
      rg: (fd.get("rg") as string) || null,
      mother_name: (fd.get("mother_name") as string) || null,
      father_name: (fd.get("father_name") as string) || null,
    })
    .select("id")
    .single();

  if (partyErr) return { error: `Erro ao criar party: ${partyErr.message}` };

  const partyId = party.id;
  const subtype = (fd.get("party_subtype") as string) || "MEMBRO_PROVISORIO";

  // 2. Criar PartyMember
  const { error: pmErr } = await supabase.from("party_members").insert({
    party_id: partyId,
    ministry_id: ctx.ministry_id,
    unit_id: (fd.get("unit_id") as string) || null,
    party_subtype: subtype,
    codigo_provisorio: gerarCodigoProvisorio(),
    matricula_legado: (fd.get("matricula_legado") as string) || null,
    cargo_id: (fd.get("cargo_id") as string) || null,
    situacao: "EM_OBSERVACAO",
    data_ingresso: (fd.get("data_ingresso") as string) || null,
    data_batismo_aguas: (fd.get("data_batismo_aguas") as string) || null,
    data_batismo_espirito: (fd.get("data_batismo_espirito") as string) || null,
    gender_id: (fd.get("gender_id") as string) || null,
    civil_status_id: (fd.get("civil_status_id") as string) || null,
    schooling_id: (fd.get("schooling_id") as string) || null,
    profession_id: (fd.get("profession_id") as string) || null,
    financial_status_id: (fd.get("financial_status_id") as string) || null,
    whatsapp: (fd.get("whatsapp") as string) || null,
    celular: (fd.get("celular") as string) || null,
    observacoes: (fd.get("observacoes") as string) || null,
    igreja_origem: (fd.get("igreja_origem") as string) || null,
  });

  if (pmErr) {
    // Rollback manual: remover party criada
    await supabase.from("parties").delete().eq("id", partyId);
    return { error: `Erro ao criar ficha: ${pmErr.message}` };
  }

  // 3. Endereço (opcional)
  const cep = (fd.get("cep") as string) || null;
  if (cep) {
    await supabase.from("party_addresses").insert({
      party_id: partyId,
      ministry_id: ctx.ministry_id,
      tipo: "RESIDENCIAL",
      cep: cep.replace(/\D/g, ""),
      logradouro: (fd.get("logradouro") as string) || null,
      numero: (fd.get("numero") as string) || null,
      complemento: (fd.get("complemento") as string) || null,
      bairro: (fd.get("bairro") as string) || null,
      cidade: (fd.get("cidade") as string) || null,
      estado: (fd.get("estado") as string) || null,
      is_principal: true,
    });
  }

  // 4. Registro inicial em member_history
  await supabase.from("member_history").insert({
    party_id: partyId,
    ministry_id: ctx.ministry_id,
    situacao_anterior: null,
    situacao_nova: "EM_OBSERVACAO",
    motivo: "Cadastro inicial",
    alterado_por: null, // auth.uid() não disponível em server actions sem getUser()
  });

  revalidatePath("/dashboard/membros");
  return { party_id: partyId };
}

// ============================================================
// atualizarMembroAction
// Atualiza dados de party + party_members + endereço.
// ============================================================
export async function atualizarMembroAction(
  partyId: string,
  fd: FormData,
): Promise<{ error?: string }> {
  const ctx = await getCtx();
  const supabase = await createClient();

  // Atualiza party
  const { error: partyErr } = await supabase
    .from("parties")
    .update({
      full_name: fd.get("full_name") as string,
      cpf: (fd.get("cpf") as string)?.replace(/\D/g, "") || null,
      email: (fd.get("email") as string) || null,
      phone: (fd.get("phone") as string) || null,
      birth_date: (fd.get("birth_date") as string) || null,
      rg: (fd.get("rg") as string) || null,
      mother_name: (fd.get("mother_name") as string) || null,
      father_name: (fd.get("father_name") as string) || null,
    })
    .eq("id", partyId)
    .eq("ministry_id", ctx.ministry_id);

  if (partyErr) return { error: partyErr.message };

  // Atualiza party_members
  const { error: pmErr } = await supabase
    .from("party_members")
    .update({
      unit_id: (fd.get("unit_id") as string) || null,
      cargo_id: (fd.get("cargo_id") as string) || null,
      data_ingresso: (fd.get("data_ingresso") as string) || null,
      data_batismo_aguas: (fd.get("data_batismo_aguas") as string) || null,
      data_batismo_espirito: (fd.get("data_batismo_espirito") as string) || null,
      gender_id: (fd.get("gender_id") as string) || null,
      civil_status_id: (fd.get("civil_status_id") as string) || null,
      schooling_id: (fd.get("schooling_id") as string) || null,
      profession_id: (fd.get("profession_id") as string) || null,
      financial_status_id: (fd.get("financial_status_id") as string) || null,
      whatsapp: (fd.get("whatsapp") as string) || null,
      celular: (fd.get("celular") as string) || null,
      observacoes: (fd.get("observacoes") as string) || null,
      igreja_origem: (fd.get("igreja_origem") as string) || null,
      matricula_legado: (fd.get("matricula_legado") as string) || null,
    })
    .eq("party_id", partyId)
    .eq("ministry_id", ctx.ministry_id);

  if (pmErr) return { error: pmErr.message };

  // Atualiza ou cria endereço principal
  const cep = (fd.get("cep") as string) || null;
  if (cep) {
    await supabase.from("party_addresses").upsert(
      {
        party_id: partyId,
        ministry_id: ctx.ministry_id,
        tipo: "RESIDENCIAL",
        cep: cep.replace(/\D/g, ""),
        logradouro: (fd.get("logradouro") as string) || null,
        numero: (fd.get("numero") as string) || null,
        complemento: (fd.get("complemento") as string) || null,
        bairro: (fd.get("bairro") as string) || null,
        cidade: (fd.get("cidade") as string) || null,
        estado: (fd.get("estado") as string) || null,
        is_principal: true,
      },
      { onConflict: "party_id,ministry_id,tipo" },
    );
  }

  revalidatePath(`/dashboard/membros/${partyId}`);
  revalidatePath("/dashboard/membros");
  return {};
}

// ============================================================
// alterarSituacaoAction
// Muda situação eclesial + registra em member_history + ativa
// matrícula definitiva se situacao_nova === 'ATIVO'.
// ============================================================
export async function alterarSituacaoAction(
  partyId: string,
  situacao_nova: MemberSituacao,
  motivo: string,
): Promise<{ error?: string }> {
  const ctx = await getCtx();
  const supabase = await createClient();

  // Busca situação atual
  const { data: pm, error: pmFetchErr } = await supabase
    .from("party_members")
    .select("situacao, matricula, ministry_id")
    .eq("party_id", partyId)
    .eq("ministry_id", ctx.ministry_id)
    .maybeSingle();

  if (pmFetchErr || !pm) return { error: "Membro não encontrado" };

  // Campos a atualizar
  const updateData: Record<string, unknown> = {
    situacao: situacao_nova,
    party_subtype: situacao_nova === "ATIVO" ? "MEMBRO_ATIVO" : "MEMBRO_PROVISORIO",
  };

  // Gera matrícula definitiva ao ativar (apenas se ainda não tem)
  if (situacao_nova === "ATIVO" && !pm.matricula) {
    // Busca o próximo número de matrícula via função no banco
    const { data: mat } = await supabase.rpc("gerar_matricula", {
      p_ministry_id: ctx.ministry_id,
    });
    if (mat) updateData.matricula = mat;
  }

  // Registra desligamento
  if (situacao_nova === "DESLIGADO") {
    updateData.data_desligamento = new Date().toISOString().split("T")[0];
  }

  const { error: updateErr } = await supabase
    .from("party_members")
    .update(updateData)
    .eq("party_id", partyId)
    .eq("ministry_id", ctx.ministry_id);

  if (updateErr) return { error: updateErr.message };

  // Registra no histórico
  const { error: histErr } = await supabase.from("member_history").insert({
    party_id: partyId,
    ministry_id: ctx.ministry_id,
    situacao_anterior: pm.situacao as MemberSituacao,
    situacao_nova,
    motivo: motivo || null,
    alterado_por: null,
  });

  if (histErr) return { error: histErr.message };

  revalidatePath(`/dashboard/membros/${partyId}`);
  revalidatePath("/dashboard/membros");
  return {};
}

// ============================================================
// criarFuncaoAction
// Atribui função departamental a um membro.
// ============================================================
export async function criarFuncaoAction(
  partyId: string,
  payload: {
    department_id: string;
    funcao_id?: string;
    scope_type: ScopeType;
    unit_id?: string;
    data_inicio?: string;
    observacoes?: string;
  },
): Promise<{ error?: string }> {
  const ctx = await getCtx();
  const supabase = await createClient();

  const { error } = await supabase.from("party_funcoes").insert({
    party_id: partyId,
    ministry_id: ctx.ministry_id,
    department_id: payload.department_id,
    funcao_id: payload.funcao_id || null,
    scope_type: payload.scope_type,
    unit_id: payload.unit_id || null,
    data_inicio: payload.data_inicio || new Date().toISOString().split("T")[0],
    is_ativo: true,
    observacoes: payload.observacoes || null,
  });

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/membros/${partyId}`);
  return {};
}

// ============================================================
// encerrarFuncaoAction
// Encerra uma função departamental ativa.
// ============================================================
export async function encerrarFuncaoAction(
  partyId: string,
  funcaoId: string,
): Promise<{ error?: string }> {
  const ctx = await getCtx();
  const supabase = await createClient();

  const { error } = await supabase
    .from("party_funcoes")
    .update({ is_ativo: false, data_fim: new Date().toISOString().split("T")[0] })
    .eq("id", funcaoId)
    .eq("party_id", partyId)
    .eq("ministry_id", ctx.ministry_id);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/membros/${partyId}`);
  return {};
}

// ============================================================
// criarDependenteAction
// Cadastra dependente (filho/tutelado) vinculado ao membro.
// Cria party básica para o dependente automaticamente.
// ============================================================
export async function criarDependenteAction(
  responsiblePartyId: string,
  payload: {
    full_name: string;
    birth_date?: string;
    relationship: "FILHO" | "TUTELADO";
    data_apresentacao?: string;
    observacoes?: string;
  },
): Promise<{ error?: string }> {
  const ctx = await getCtx();
  const supabase = await createClient();

  const { data: depParty, error: partyErr } = await supabase
    .from("parties")
    .insert({
      ministry_id: ctx.ministry_id,
      party_type: "PESSOA_FISICA",
      full_name: payload.full_name,
      birth_date: payload.birth_date || null,
    })
    .select("id")
    .single();

  if (partyErr) return { error: partyErr.message };

  const { error: depErr } = await supabase.from("party_dependents").insert({
    party_id: depParty.id,
    responsible_party_id: responsiblePartyId,
    ministry_id: ctx.ministry_id,
    relationship: payload.relationship,
    data_apresentacao: payload.data_apresentacao || null,
    observacoes: payload.observacoes || null,
  });

  if (depErr) {
    await supabase.from("parties").delete().eq("id", depParty.id);
    return { error: depErr.message };
  }

  revalidatePath(`/dashboard/membros/${responsiblePartyId}`);
  return {};
}

// ============================================================
// transferirMembroAction
// Registra transferência de unidade e atualiza party_members.
// ============================================================
export async function transferirMembroAction(
  partyId: string,
  payload: {
    unit_destino_id: string;
    tipo: "INTRA" | "INTER" | "DESLIGAMENTO" | "RETORNO";
    data_transferencia?: string;
    obs?: string;
  },
): Promise<{ error?: string }> {
  const ctx = await getCtx();
  const supabase = await createClient();

  const { data: pm } = await supabase
    .from("party_members")
    .select("unit_id, situacao")
    .eq("party_id", partyId)
    .eq("ministry_id", ctx.ministry_id)
    .maybeSingle();

  const { error: transferErr } = await supabase.from("member_transfers").insert({
    ministry_id: ctx.ministry_id,
    party_id: partyId,
    unit_origem_id: pm?.unit_id ?? null,
    unit_destino_id: payload.unit_destino_id,
    tipo: payload.tipo,
    data_transferencia:
      payload.data_transferencia || new Date().toISOString().split("T")[0],
    aprovado_por: null,
    obs: payload.obs || null,
  });

  if (transferErr) return { error: transferErr.message };

  const updatePm: Record<string, unknown> = { unit_id: payload.unit_destino_id };

  if (payload.tipo === "DESLIGAMENTO") {
    updatePm.situacao = "DESLIGADO";
    updatePm.data_desligamento =
      payload.data_transferencia || new Date().toISOString().split("T")[0];

    await supabase.from("member_history").insert({
      party_id: partyId,
      ministry_id: ctx.ministry_id,
      situacao_anterior: pm?.situacao ?? "ATIVO",
      situacao_nova: "DESLIGADO",
      motivo: payload.obs || "Desligamento por transferência",
      alterado_por: null,
    });
  }

  const { error: updateErr } = await supabase
    .from("party_members")
    .update(updatePm)
    .eq("party_id", partyId)
    .eq("ministry_id", ctx.ministry_id);

  if (updateErr) return { error: updateErr.message };

  revalidatePath(`/dashboard/membros/${partyId}`);
  revalidatePath("/dashboard/membros");
  return {};
}
