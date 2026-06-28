"use server";

import { revalidatePath }              from "next/cache";
import { createClient }                from "@/utils/supabase/server";
import { getAuthContext, assertLevel } from "@/utils/supabase/auth-context";
import type {
  EbdClass,
  EbdClassListItem,
  EbdEnrollmentWithMember,
  EbdRollCall,
  EbdRollCallFull,
  EbdFaixaEtaria,
} from "@/types";

// ── Turmas ────────────────────────────────────────────────────

export async function listarTurmas(): Promise<{ data: EbdClassListItem[]; error?: string }> {
  const ctx = await getAuthContext();
  if (!ctx) return { data: [], error: "Sessão não encontrada." };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ebd_classes")
    .select(`
      *,
      units ( name ),
      parties!ebd_classes_professor_party_id_fkey ( full_name )
    `)
    .eq("ministry_id", ctx.ministry_id)
    .eq("is_active", true)
    .order("nome");

  if (error) return { data: [], error: error.message };

  // Buscar contagem de alunos e última chamada por turma
  const classIds = (data ?? []).map((c: any) => c.id);

  const [enrollCounts, lastCalls] = await Promise.all([
    classIds.length
      ? supabase
          .from("ebd_enrollments")
          .select("class_id")
          .in("class_id", classIds)
          .eq("is_active", true)
      : Promise.resolve({ data: [] }),
    classIds.length
      ? supabase
          .from("ebd_roll_calls")
          .select("class_id, data")
          .in("class_id", classIds)
          .order("data", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const countMap: Record<string, number> = {};
  for (const e of enrollCounts.data ?? []) {
    countMap[(e as any).class_id] = (countMap[(e as any).class_id] ?? 0) + 1;
  }

  const lastCallMap: Record<string, string> = {};
  for (const rc of lastCalls.data ?? []) {
    if (!((rc as any).class_id in lastCallMap)) {
      lastCallMap[(rc as any).class_id] = (rc as any).data;
    }
  }

  const result: EbdClassListItem[] = (data ?? []).map((c: any) => ({
    ...c,
    unit_name:        c.units?.name ?? "—",
    professor_nome:   c.parties?.full_name ?? null,
    total_alunos:     countMap[c.id] ?? 0,
    ultima_chamada:   lastCallMap[c.id] ?? null,
    media_frequencia: null, // calculado sob demanda na página da turma
  }));

  return { data: result };
}

export async function buscarTurma(classId: string): Promise<{ data: EbdClass | null; error?: string }> {
  const ctx = await getAuthContext();
  if (!ctx) return { data: null, error: "Sessão não encontrada." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ebd_classes")
    .select("*")
    .eq("id", classId)
    .eq("ministry_id", ctx.ministry_id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data };
}

export async function criarTurmaAction(payload: {
  unit_id: string;
  nome: string;
  faixa_etaria: EbdFaixaEtaria;
  professor_party_id?: string;
  dia_semana: number;
  horario: string;
  descricao?: string;
}): Promise<{ data?: EbdClass; error?: string }> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Sessão não encontrada." };
  try { assertLevel(ctx, 4, "Apenas N0–N4 podem criar turmas."); }
  catch (e: any) { return { error: e.message }; }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ebd_classes")
    .insert({
      ministry_id:        ctx.ministry_id,
      unit_id:            payload.unit_id,
      nome:               payload.nome.trim(),
      faixa_etaria:       payload.faixa_etaria,
      professor_party_id: payload.professor_party_id || null,
      dia_semana:         payload.dia_semana,
      horario:            payload.horario,
      descricao:          payload.descricao?.trim() || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/dashboard/ebd");
  return { data };
}

export async function atualizarTurmaAction(
  classId: string,
  payload: Partial<{
    nome: string;
    faixa_etaria: EbdFaixaEtaria;
    professor_party_id: string | null;
    dia_semana: number;
    horario: string;
    descricao: string;
    is_active: boolean;
  }>
): Promise<{ error?: string }> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Sessão não encontrada." };
  try { assertLevel(ctx, 4); } catch (e: any) { return { error: e.message }; }

  const supabase = await createClient();
  const { error } = await supabase
    .from("ebd_classes")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", classId)
    .eq("ministry_id", ctx.ministry_id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/ebd");
  revalidatePath(`/dashboard/ebd/turmas/${classId}`);
  return {};
}

// ── Alunos (Matrículas) ───────────────────────────────────────

export async function listarAlunosDaTurma(
  classId: string
): Promise<{ data: EbdEnrollmentWithMember[]; error?: string }> {
  const ctx = await getAuthContext();
  if (!ctx) return { data: [], error: "Sessão não encontrada." };

  const supabase = await createClient();

  // Busca matrículas ativas com dados da party
  const { data: enrollments, error } = await supabase
    .from("ebd_enrollments")
    .select(`*, parties ( full_name, data_nascimento )`)
    .eq("class_id", classId)
    .eq("ministry_id", ctx.ministry_id)
    .eq("is_active", true)
    .order("created_at");

  if (error) return { data: [], error: error.message };

  // Buscar matrículas dos membros separadamente (sem FK direta para party_members)
  const partyIds = (enrollments ?? []).map((e: any) => e.party_id);
  const matriculaMap: Record<string, string | null> = {};
  if (partyIds.length > 0) {
    const { data: mems } = await supabase
      .from("party_members")
      .select("party_id, matricula")
      .eq("ministry_id", ctx.ministry_id)
      .in("party_id", partyIds);
    for (const m of mems ?? []) {
      matriculaMap[(m as any).party_id] = (m as any).matricula ?? null;
    }
  }

  // Calcular faltas consecutivas por aluno
  const { data: recentCalls } = await supabase
    .from("ebd_roll_calls")
    .select("id")
    .eq("class_id", classId)
    .order("data", { ascending: false })
    .limit(5);

  const recentCallIds = (recentCalls ?? []).map((r: any) => r.id);

  const { data: recentAttendances } = recentCallIds.length
    ? await supabase
        .from("ebd_attendances")
        .select("party_id, presente, roll_call_id")
        .in("roll_call_id", recentCallIds)
    : { data: [] };

  // Calcular faltas consecutivas por party_id
  const faltasMap: Record<string, number> = {};
  if (recentCallIds.length && recentAttendances) {
    const byParty: Record<string, Record<string, boolean>> = {};
    for (const a of recentAttendances as any[]) {
      if (!byParty[a.party_id]) byParty[a.party_id] = {};
      byParty[a.party_id][a.roll_call_id] = a.presente;
    }
    for (const [partyId, callMap] of Object.entries(byParty)) {
      let consecutive = 0;
      for (const callId of recentCallIds) {
        if (callMap[callId] === false) consecutive++;
        else break;
      }
      faltasMap[partyId] = consecutive;
    }
  }

  const result: EbdEnrollmentWithMember[] = (enrollments ?? []).map((e: any) => ({
    id:                  e.id,
    ministry_id:         e.ministry_id,
    class_id:            e.class_id,
    party_id:            e.party_id,
    data_entrada:        e.data_entrada,
    data_saida:          e.data_saida,
    is_active:           e.is_active,
    created_at:          e.created_at,
    full_name:           e.parties?.full_name ?? "—",
    matricula:           matriculaMap[e.party_id] ?? null,
    data_nascimento:     e.parties?.data_nascimento ?? null,
    faltas_consecutivas: faltasMap[e.party_id] ?? 0,
  }));

  return { data: result };
}

export async function adicionarAlunoAction(
  classId: string,
  partyId: string
): Promise<{ error?: string }> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Sessão não encontrada." };
  try { assertLevel(ctx, 4); } catch (e: any) { return { error: e.message }; }

  const supabase = await createClient();
  const { error } = await supabase
    .from("ebd_enrollments")
    .upsert({
      ministry_id:  ctx.ministry_id,
      class_id:     classId,
      party_id:     partyId,
      is_active:    true,
      data_entrada: new Date().toISOString().slice(0, 10),
      data_saida:   null,
    }, { onConflict: "class_id,party_id" });

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/ebd/turmas/${classId}`);
  return {};
}

export async function removerAlunoAction(
  enrollmentId: string,
  classId: string
): Promise<{ error?: string }> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Sessão não encontrada." };
  try { assertLevel(ctx, 4); } catch (e: any) { return { error: e.message }; }

  const supabase = await createClient();
  const { error } = await supabase
    .from("ebd_enrollments")
    .update({ is_active: false, data_saida: new Date().toISOString().slice(0, 10) })
    .eq("id", enrollmentId)
    .eq("ministry_id", ctx.ministry_id);

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/ebd/turmas/${classId}`);
  return {};
}

export async function buscarMembroParaEbd(
  termo: string
): Promise<{ data: { party_id: string; nome: string; matricula: string | null }[]; error?: string }> {
  const ctx = await getAuthContext();
  if (!ctx) return { data: [] };

  const supabase = await createClient();

  // Passo 1: buscar membros ativos do ministério (party_id + matricula)
  const { data: membros } = await supabase
    .from("party_members")
    .select("party_id, matricula")
    .eq("ministry_id", ctx.ministry_id)
    .eq("situacao", "ATIVO");

  if (!membros || membros.length === 0) return { data: [] };

  const partyIds = membros.map((m: any) => m.party_id);
  const matriculaMap: Record<string, string | null> = Object.fromEntries(
    membros.map((m: any) => [m.party_id, m.matricula ?? null])
  );

  // Passo 2: filtrar por nome dentro desses party_ids
  const { data: parties } = await supabase
    .from("parties")
    .select("id, full_name")
    .in("id", partyIds)
    .ilike("full_name", `%${termo}%`)
    .order("full_name")
    .limit(8);

  return {
    data: (parties ?? []).map((p: any) => ({
      party_id: p.id,
      nome:     p.full_name,
      matricula: matriculaMap[p.id] ?? null,
    })),
  };
}

// ── Chamadas ──────────────────────────────────────────────────

export async function listarChamadas(
  classId: string
): Promise<{ data: EbdRollCall[]; error?: string }> {
  const ctx = await getAuthContext();
  if (!ctx) return { data: [] };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ebd_roll_calls")
    .select("*")
    .eq("class_id", classId)
    .eq("ministry_id", ctx.ministry_id)
    .order("data", { ascending: false })
    .limit(20);

  if (error) return { data: [], error: error.message };
  return { data: data ?? [] };
}

export async function buscarChamada(
  rollCallId: string
): Promise<{ data: EbdRollCallFull | null; error?: string }> {
  const ctx = await getAuthContext();
  if (!ctx) return { data: null };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ebd_roll_calls")
    .select(`*, ebd_attendances ( party_id, presente, justificativa, parties ( full_name ) )`)
    .eq("id", rollCallId)
    .eq("ministry_id", ctx.ministry_id)
    .single();

  if (error || !data) return { data: null, error: error?.message };

  const full: EbdRollCallFull = {
    ...(data as any),
    attendances: ((data as any).ebd_attendances ?? []).map((a: any) => ({
      party_id:     a.party_id,
      full_name:    a.parties?.full_name ?? "—",
      presente:     a.presente,
      justificativa: a.justificativa,
    })),
  };
  return { data: full };
}

export async function criarChamadaAction(payload: {
  class_id: string;
  data: string;
  visitantes: number;
  observacoes?: string;
  presencas: { party_id: string; presente: boolean; justificativa?: string }[];
}): Promise<{ data?: EbdRollCall; error?: string }> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Sessão não encontrada." };

  const supabase = await createClient();

  // Inserir chamada
  const { data: rollCall, error: rcErr } = await supabase
    .from("ebd_roll_calls")
    .insert({
      ministry_id: ctx.ministry_id,
      class_id:    payload.class_id,
      data:        payload.data,
      visitantes:  payload.visitantes,
      observacoes: payload.observacoes?.trim() || null,
      criado_por:  ctx.user_id,
    })
    .select()
    .single();

  if (rcErr) return { error: rcErr.message };

  // Inserir presenças individuais em lote
  if (payload.presencas.length > 0) {
    const attendances = payload.presencas.map(p => ({
      ministry_id:  ctx.ministry_id,
      roll_call_id: (rollCall as any).id,
      party_id:     p.party_id,
      presente:     p.presente,
      justificativa: p.justificativa?.trim() || null,
    }));

    const { error: attErr } = await supabase
      .from("ebd_attendances")
      .insert(attendances);

    if (attErr) return { error: attErr.message };
  }

  revalidatePath(`/dashboard/ebd/turmas/${payload.class_id}`);
  revalidatePath("/dashboard/ebd");
  return { data: rollCall as any };
}

// ── Stats para o dashboard ────────────────────────────────────

export async function buscarStatsEbd(): Promise<{
  total_turmas: number;
  total_alunos: number;
  media_frequencia: number | null;
  turmas_com_alerta: number;
}> {
  const ctx = await getAuthContext();
  if (!ctx) return { total_turmas: 0, total_alunos: 0, media_frequencia: null, turmas_com_alerta: 0 };

  const supabase = await createClient();

  const [turmas, alunos, rollCalls30d] = await Promise.all([
    supabase.from("ebd_classes").select("id", { count: "exact", head: true })
      .eq("ministry_id", ctx.ministry_id).eq("is_active", true),
    supabase.from("ebd_enrollments").select("id", { count: "exact", head: true })
      .eq("ministry_id", ctx.ministry_id).eq("is_active", true),
    supabase.from("ebd_roll_calls").select("total_presentes, ebd_classes!inner(ministry_id)")
      .eq("ebd_classes.ministry_id", ctx.ministry_id)
      .gte("data", new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10))
      .limit(50),
  ]);

  const calls = rollCalls30d.data ?? [];
  const media = calls.length
    ? Math.round(calls.reduce((s: number, c: any) => s + (c.total_presentes ?? 0), 0) / calls.length)
    : null;

  return {
    total_turmas:     turmas.count ?? 0,
    total_alunos:     alunos.count ?? 0,
    media_frequencia: media,
    turmas_com_alerta: 0, // simplificado — calculado no detalhe da turma
  };
}
