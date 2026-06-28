"use server";

import { createClient } from "@/utils/supabase/server";
import { getAuthContext, assertLevel } from "@/utils/supabase/auth-context";
import type {
  Course,
  CourseWithStats,
  CourseLesson,
  CourseEnrollment,
  CourseEnrollmentListItem,
  CourseAttendance,
  CourseStatus,
} from "@/types";

// ── CURSOS ────────────────────────────────────────────────────

export async function listarCursosAction(): Promise<CourseWithStats[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const { data: cursos, error } = await supabase
    .from("courses")
    .select("*")
    .eq("ministry_id", ctx.ministry_id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  if (!cursos?.length) return [];

  const ids = cursos.map((c) => c.id);

  // Instrutores
  const profIds = cursos.map((c) => c.instrutor_party_id).filter(Boolean) as string[];
  const { data: instrutores } = profIds.length
    ? await supabase.from("parties").select("id, full_name").in("id", profIds)
    : { data: [] };
  const instMap = Object.fromEntries((instrutores ?? []).map((p: any) => [p.id, p.full_name]));

  // Inscrições
  const { data: enrs } = await supabase
    .from("course_enrollments")
    .select("id, course_id, status")
    .eq("ministry_id", ctx.ministry_id)
    .in("course_id", ids);

  // Aulas
  const { data: lessons } = await supabase
    .from("course_lessons")
    .select("id, course_id")
    .eq("ministry_id", ctx.ministry_id)
    .in("course_id", ids);

  return cursos.map((c) => {
    const courseEnrs = (enrs ?? []).filter((e) => e.course_id === c.id);
    const inscritos  = courseEnrs.length;
    const concluidos = courseEnrs.filter((e) => e.status === "CONCLUIDO").length;
    const totalAulas = (lessons ?? []).filter((l) => l.course_id === c.id).length;
    const vagas_disponiveis = c.vagas !== null ? c.vagas - inscritos : null;

    return {
      ...c,
      instrutor_nome:    instMap[c.instrutor_party_id] ?? null,
      total_inscritos:   inscritos,
      total_concluidos:  concluidos,
      total_aulas:       totalAulas,
      vagas_disponiveis,
    } as CourseWithStats;
  });
}

export async function buscarCursoAction(id: string): Promise<CourseWithStats> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id)
    .single();
  if (error) throw new Error(error.message);

  let instrutor_nome: string | null = null;
  if (data.instrutor_party_id) {
    const { data: inst } = await supabase
      .from("parties")
      .select("full_name")
      .eq("id", data.instrutor_party_id)
      .single();
    instrutor_nome = inst?.full_name ?? null;
  }

  const { count: total_inscritos } = await supabase
    .from("course_enrollments")
    .select("id", { count: "exact", head: true })
    .eq("course_id", id)
    .eq("ministry_id", ctx.ministry_id);

  const { count: total_concluidos } = await supabase
    .from("course_enrollments")
    .select("id", { count: "exact", head: true })
    .eq("course_id", id)
    .eq("ministry_id", ctx.ministry_id)
    .eq("status", "CONCLUIDO");

  const { count: total_aulas } = await supabase
    .from("course_lessons")
    .select("id", { count: "exact", head: true })
    .eq("course_id", id)
    .eq("ministry_id", ctx.ministry_id);

  const vagas_disponiveis = data.vagas !== null
    ? data.vagas - (total_inscritos ?? 0)
    : null;

  return {
    ...data,
    instrutor_nome,
    total_inscritos:  total_inscritos ?? 0,
    total_concluidos: total_concluidos ?? 0,
    total_aulas:      total_aulas ?? 0,
    vagas_disponiveis,
  } as CourseWithStats;
}

export async function criarCursoAction(formData: FormData): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const supabase = await createClient();

  const { error } = await supabase.from("courses").insert({
    ministry_id:        ctx.ministry_id,
    titulo:             (formData.get("titulo") as string).trim(),
    descricao:          (formData.get("descricao") as string)?.trim() || null,
    categoria:          (formData.get("categoria") as string) || "GERAL",
    carga_horaria:      parseInt(formData.get("carga_horaria") as string) || 20,
    data_inicio:        (formData.get("data_inicio") as string) || null,
    data_fim:           (formData.get("data_fim") as string) || null,
    vagas:              parseInt(formData.get("vagas") as string) || null,
    publico_alvo:       (formData.get("publico_alvo") as string)?.trim() || null,
    instrutor_party_id: (formData.get("instrutor_party_id") as string) || null,
    frequencia_minima:  parseFloat(formData.get("frequencia_minima") as string) || 75,
  });
  if (error) throw new Error(error.message);
}

export async function editarCursoAction(id: string, formData: FormData): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const supabase = await createClient();

  const { error } = await supabase
    .from("courses")
    .update({
      titulo:             (formData.get("titulo") as string).trim(),
      descricao:          (formData.get("descricao") as string)?.trim() || null,
      categoria:          (formData.get("categoria") as string) || "GERAL",
      carga_horaria:      parseInt(formData.get("carga_horaria") as string) || 20,
      data_inicio:        (formData.get("data_inicio") as string) || null,
      data_fim:           (formData.get("data_fim") as string) || null,
      vagas:              parseInt(formData.get("vagas") as string) || null,
      publico_alvo:       (formData.get("publico_alvo") as string)?.trim() || null,
      instrutor_party_id: (formData.get("instrutor_party_id") as string) || null,
      frequencia_minima:  parseFloat(formData.get("frequencia_minima") as string) || 75,
    })
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
}

export async function toggleCursoAction(id: string, is_active: boolean): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const supabase = await createClient();

  const { error } = await supabase
    .from("courses")
    .update({ is_active })
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
}

// ── AULAS ─────────────────────────────────────────────────────

export async function listarAulasCursoAction(course_id: string): Promise<CourseLesson[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("course_lessons")
    .select("*")
    .eq("course_id", course_id)
    .eq("ministry_id", ctx.ministry_id)
    .order("numero");
  if (error) throw new Error(error.message);
  return (data ?? []) as CourseLesson[];
}

export async function criarAulaCursoAction(course_id: string, formData: FormData): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const { count } = await supabase
    .from("course_lessons")
    .select("id", { count: "exact", head: true })
    .eq("course_id", course_id)
    .eq("ministry_id", ctx.ministry_id);

  const { error } = await supabase.from("course_lessons").insert({
    ministry_id: ctx.ministry_id,
    course_id,
    numero:    (count ?? 0) + 1,
    data_aula: formData.get("data_aula") as string,
    conteudo:  (formData.get("conteudo") as string)?.trim() || null,
  });
  if (error) throw new Error(error.message);

  // Criar registros de presença para todos os inscritos
  const { data: enrs } = await supabase
    .from("course_enrollments")
    .select("id")
    .eq("course_id", course_id)
    .eq("ministry_id", ctx.ministry_id)
    .neq("status", "DESISTENCIA");

  if (enrs?.length) {
    const { data: aulaData } = await supabase
      .from("course_lessons")
      .select("id")
      .eq("course_id", course_id)
      .eq("ministry_id", ctx.ministry_id)
      .order("numero", { ascending: false })
      .limit(1)
      .single();

    if (aulaData) {
      await supabase.from("course_attendance").insert(
        enrs.map((e) => ({
          lesson_id:     aulaData.id,
          enrollment_id: e.id,
          ministry_id:   ctx.ministry_id,
          presente:      false,
        }))
      );
    }
  }
}

// ── INSCRIÇÕES ────────────────────────────────────────────────

export async function listarInscritosAction(course_id: string): Promise<CourseEnrollmentListItem[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const { data: enrs, error } = await supabase
    .from("course_enrollments")
    .select("*")
    .eq("course_id", course_id)
    .eq("ministry_id", ctx.ministry_id)
    .order("created_at");
  if (error) throw new Error(error.message);
  if (!enrs?.length) return [];

  const partyIds   = enrs.map((e) => e.party_id);
  const enrIds     = enrs.map((e) => e.id);

  const { data: partiesData } = await supabase
    .from("parties")
    .select("id, full_name")
    .in("id", partyIds);

  const { data: pmData } = await supabase
    .from("party_members")
    .select("party_id, matricula")
    .in("party_id", partyIds)
    .eq("ministry_id", ctx.ministry_id);

  const { data: attendance } = await supabase
    .from("course_attendance")
    .select("enrollment_id, presente")
    .in("enrollment_id", enrIds);

  const { data: lessons } = await supabase
    .from("course_lessons")
    .select("id")
    .eq("course_id", course_id)
    .eq("ministry_id", ctx.ministry_id);

  const { data: certs } = await supabase
    .from("course_certificates")
    .select("id, enrollment_id")
    .in("enrollment_id", enrIds);

  const partyMap    = Object.fromEntries((partiesData ?? []).map((p: any) => [p.id, p.full_name ?? ""]));
  const matriculaMap = Object.fromEntries((pmData ?? []).map((pm: any) => [pm.party_id, pm.matricula ?? ""]));
  const certMap     = Object.fromEntries((certs ?? []).map((c: any) => [c.enrollment_id, c.id]));
  const totalAulas  = lessons?.length ?? 0;

  return enrs.map((e) => {
    const presencas = (attendance ?? []).filter(
      (a) => a.enrollment_id === e.id && a.presente
    ).length;
    const freqPct = totalAulas > 0
      ? Math.round((presencas / totalAulas) * 10000) / 100
      : 100;

    return {
      ...e,
      party_nome:      partyMap[e.party_id] ?? "",
      party_matricula: matriculaMap[e.party_id] ?? "",
      presencas,
      total_aulas:     totalAulas,
      frequencia_pct:  freqPct,
      certificado_id:  certMap[e.id] ?? null,
    } as CourseEnrollmentListItem;
  });
}

export async function inscreverParticipanteAction(
  course_id: string,
  party_id: string
): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const { data: enr, error } = await supabase
    .from("course_enrollments")
    .insert({ ministry_id: ctx.ministry_id, course_id, party_id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  // Criar presença para aulas já existentes
  const { data: lessons } = await supabase
    .from("course_lessons")
    .select("id")
    .eq("course_id", course_id)
    .eq("ministry_id", ctx.ministry_id);

  if (lessons?.length && enr) {
    await supabase.from("course_attendance").upsert(
      lessons.map((l) => ({
        lesson_id:     l.id,
        enrollment_id: enr.id,
        ministry_id:   ctx.ministry_id,
        presente:      false,
      })),
      { onConflict: "lesson_id,enrollment_id" }
    );
  }
}

export async function cancelarInscricaoAction(enrollment_id: string): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const supabase = await createClient();

  const { error } = await supabase
    .from("course_enrollments")
    .update({ status: "DESISTENCIA" as CourseStatus })
    .eq("id", enrollment_id)
    .eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
}

// ── BUSCA DE MEMBROS (reutilizado da escola) ──────────────────

export async function buscarMembrosParaCursoAction(
  q: string
): Promise<{ id: string; nome_completo: string; matricula: string }[]> {
  if (!q.trim()) return [];
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const { data: parties } = await supabase
    .from("parties")
    .select("id, full_name")
    .eq("ministry_id", ctx.ministry_id)
    .eq("is_active", true)
    .ilike("full_name", `%${q.trim()}%`)
    .order("full_name")
    .limit(8);

  if (!parties?.length) return [];

  const partyIds = parties.map((p) => p.id);
  const { data: pmList } = await supabase
    .from("party_members")
    .select("party_id, matricula")
    .in("party_id", partyIds)
    .eq("ministry_id", ctx.ministry_id);

  const matriculaMap = Object.fromEntries(
    (pmList ?? []).map((pm: any) => [pm.party_id, pm.matricula ?? ""])
  );

  return parties.map((p: any) => ({
    id:            p.id,
    nome_completo: p.full_name ?? "",
    matricula:     matriculaMap[p.id] ?? "",
  }));
}

// ── PRESENÇA ──────────────────────────────────────────────────

export async function buscarPresencaCursoAction(
  lesson_id: string
): Promise<CourseAttendance[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("course_attendance")
    .select("*")
    .eq("lesson_id", lesson_id)
    .eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
  return (data ?? []) as CourseAttendance[];
}

export async function salvarPresencaCursoAction(
  attendance_id: string,
  presente: boolean
): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  // Buscar enrollment_id para recalcular conclusão
  const { data: att } = await supabase
    .from("course_attendance")
    .select("enrollment_id")
    .eq("id", attendance_id)
    .single();

  const { error } = await supabase
    .from("course_attendance")
    .update({ presente })
    .eq("id", attendance_id)
    .eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);

  // Verificar se aluno concluiu o curso
  if (att?.enrollment_id) {
    await supabase.rpc("verificar_conclusao_curso", {
      p_enrollment_id: att.enrollment_id,
    });
  }
}
