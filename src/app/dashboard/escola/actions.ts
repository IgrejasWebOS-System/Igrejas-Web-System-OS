"use server";

import { createClient } from "@/utils/supabase/server";
import { getAuthContext, assertLevel } from "@/utils/supabase/auth-context";
import type {
  SchoolSemester,
  SchoolSemesterWithStats,
  SchoolDiscipline,
  SchoolDisciplineWithStats,
  SchoolLesson,
  SchoolEnrollment,
  SchoolGrade,
  SchoolAttendance,
  EnrollmentListItem,
  StudentBoletim,
  GradeTipo,
  EnrollmentSituacao,
} from "@/types";

// ── SEMESTRES ─────────────────────────────────────────────────────────────────

export async function listarSemestresAction(): Promise<SchoolSemesterWithStats[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const { data: sems, error } = await supabase
    .from("school_semesters")
    .select("*")
    .eq("ministry_id", ctx.ministry_id)
    .order("data_inicio", { ascending: false });
  if (error) throw new Error(error.message);

  if (!sems?.length) return [];

  // Contar disciplinas e alunos por semestre
  const ids = sems.map((s) => s.id);
  const { data: discs } = await supabase
    .from("school_disciplines")
    .select("id, semester_id")
    .eq("ministry_id", ctx.ministry_id)
    .in("semester_id", ids);

  const discIds = (discs ?? []).map((d) => d.id);
  const { data: enrs } = discIds.length
    ? await supabase
        .from("school_enrollments")
        .select("id, discipline_id")
        .eq("ministry_id", ctx.ministry_id)
        .in("discipline_id", discIds)
    : { data: [] };

  return sems.map((s) => {
    const semDiscs = (discs ?? []).filter((d) => d.semester_id === s.id);
    const semDiscIds = semDiscs.map((d) => d.id);
    const alunos = new Set(
      (enrs ?? [])
        .filter((e) => semDiscIds.includes(e.discipline_id))
        .map((e) => (e as any).party_id)
    ).size;
    return {
      ...s,
      total_disciplinas: semDiscs.length,
      total_alunos: alunos,
    } as SchoolSemesterWithStats;
  });
}

export async function buscarSemestreAction(id: string): Promise<SchoolSemester> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("school_semesters")
    .select("*")
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id)
    .single();
  if (error) throw new Error(error.message);
  return data as SchoolSemester;
}

export async function criarSemestreAction(formData: FormData): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const supabase = await createClient();

  const { error } = await supabase.from("school_semesters").insert({
    ministry_id: ctx.ministry_id,
    nome:        (formData.get("nome") as string).trim(),
    data_inicio: formData.get("data_inicio") as string,
    data_fim:    formData.get("data_fim") as string,
    is_active:   true,
  });
  if (error) throw new Error(error.message);
}

export async function editarSemestreAction(id: string, formData: FormData): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const supabase = await createClient();

  const { error } = await supabase
    .from("school_semesters")
    .update({
      nome:        (formData.get("nome") as string).trim(),
      data_inicio: formData.get("data_inicio") as string,
      data_fim:    formData.get("data_fim") as string,
    })
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
}

export async function toggleSemestreAction(id: string, is_active: boolean): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const supabase = await createClient();

  const { error } = await supabase
    .from("school_semesters")
    .update({ is_active })
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
}

// ── DISCIPLINAS ───────────────────────────────────────────────────────────────

export async function listarDisciplinasAction(
  semester_id: string
): Promise<SchoolDisciplineWithStats[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const { data: discs, error } = await supabase
    .from("school_disciplines")
    .select("*")
    .eq("ministry_id", ctx.ministry_id)
    .eq("semester_id", semester_id)
    .order("nome");
  if (error) throw new Error(error.message);
  if (!discs?.length) return [];

  const ids = discs.map((d) => d.id);

  // Buscar nomes dos professores separadamente
  const profIds = discs
    .map((d) => d.professor_party_id)
    .filter(Boolean) as string[];

  const { data: profs } = profIds.length
    ? await supabase
        .from("parties")
        .select("id, nome_completo")
        .in("id", profIds)
    : { data: [] };

  const { data: enrs } = await supabase
    .from("school_enrollments")
    .select("id, discipline_id")
    .eq("ministry_id", ctx.ministry_id)
    .in("discipline_id", ids);

  const { data: lessons } = await supabase
    .from("school_lessons")
    .select("id, discipline_id")
    .eq("ministry_id", ctx.ministry_id)
    .in("discipline_id", ids);

  return discs.map((d) => ({
    ...d,
    professor_nome:  (profs ?? []).find((p) => p.id === d.professor_party_id)?.nome_completo ?? null,
    total_alunos:    (enrs ?? []).filter((e) => e.discipline_id === d.id).length,
    total_aulas:     (lessons ?? []).filter((l) => l.discipline_id === d.id).length,
  })) as SchoolDisciplineWithStats[];
}

export async function buscarDisciplinaAction(id: string): Promise<SchoolDisciplineWithStats> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("school_disciplines")
    .select("*")
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id)
    .single();
  if (error) throw new Error(error.message);

  // Buscar nome do professor separadamente
  let professorNome: string | null = null;
  if (data.professor_party_id) {
    const { data: prof } = await supabase
      .from("parties")
      .select("nome_completo")
      .eq("id", data.professor_party_id)
      .single();
    professorNome = prof?.nome_completo ?? null;
  }

  const { count: totalAlunos } = await supabase
    .from("school_enrollments")
    .select("id", { count: "exact", head: true })
    .eq("discipline_id", id)
    .eq("ministry_id", ctx.ministry_id);

  const { count: totalAulas } = await supabase
    .from("school_lessons")
    .select("id", { count: "exact", head: true })
    .eq("discipline_id", id)
    .eq("ministry_id", ctx.ministry_id);

  return {
    ...data,
    professor_nome: professorNome,
    total_alunos:   totalAlunos ?? 0,
    total_aulas:    totalAulas ?? 0,
  } as SchoolDisciplineWithStats;
}

export async function criarDisciplinaAction(
  semester_id: string,
  formData: FormData
): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const supabase = await createClient();

  const { error } = await supabase.from("school_disciplines").insert({
    ministry_id:        ctx.ministry_id,
    semester_id,
    nome:               (formData.get("nome") as string).trim(),
    carga_horaria:      parseInt(formData.get("carga_horaria") as string) || 40,
    professor_party_id: (formData.get("professor_party_id") as string) || null,
    nota_minima:        parseFloat(formData.get("nota_minima") as string) || 6.0,
    frequencia_minima:  parseFloat(formData.get("frequencia_minima") as string) || 75.0,
  });
  if (error) throw new Error(error.message);
}

export async function editarDisciplinaAction(id: string, formData: FormData): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const supabase = await createClient();

  const { error } = await supabase
    .from("school_disciplines")
    .update({
      nome:               (formData.get("nome") as string).trim(),
      carga_horaria:      parseInt(formData.get("carga_horaria") as string) || 40,
      professor_party_id: (formData.get("professor_party_id") as string) || null,
      nota_minima:        parseFloat(formData.get("nota_minima") as string) || 6.0,
      frequencia_minima:  parseFloat(formData.get("frequencia_minima") as string) || 75.0,
    })
    .eq("id", id)
    .eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
}

// ── AULAS ─────────────────────────────────────────────────────────────────────

export async function listarAulasAction(discipline_id: string): Promise<SchoolLesson[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("school_lessons")
    .select("*")
    .eq("discipline_id", discipline_id)
    .eq("ministry_id", ctx.ministry_id)
    .order("numero");
  if (error) throw new Error(error.message);
  return (data ?? []) as SchoolLesson[];
}

export async function criarAulaAction(discipline_id: string, formData: FormData): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  // próximo número de aula
  const { count } = await supabase
    .from("school_lessons")
    .select("id", { count: "exact", head: true })
    .eq("discipline_id", discipline_id)
    .eq("ministry_id", ctx.ministry_id);

  const { error } = await supabase.from("school_lessons").insert({
    ministry_id:   ctx.ministry_id,
    discipline_id,
    numero:        (count ?? 0) + 1,
    data_aula:     formData.get("data_aula") as string,
    conteudo:      (formData.get("conteudo") as string)?.trim() || null,
  });
  if (error) throw new Error(error.message);

  // Criar registros de presença para todos os alunos matriculados
  const { data: enrs } = await supabase
    .from("school_enrollments")
    .select("id")
    .eq("discipline_id", discipline_id)
    .eq("ministry_id", ctx.ministry_id);

  if (enrs?.length) {
    // Buscar id da aula recém criada
    const { data: aulaData } = await supabase
      .from("school_lessons")
      .select("id")
      .eq("discipline_id", discipline_id)
      .eq("ministry_id", ctx.ministry_id)
      .order("numero", { ascending: false })
      .limit(1)
      .single();

    if (aulaData) {
      const attendances = enrs.map((e) => ({
        lesson_id:     aulaData.id,
        enrollment_id: e.id,
        ministry_id:   ctx.ministry_id,
        presente:      false,
      }));
      await supabase.from("school_attendance").insert(attendances);
    }
  }
}

// ── BUSCA DE MEMBROS PARA MATRÍCULA ──────────────────────────────────────────

export async function buscarMembrosAction(
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
    id:           p.id,
    nome_completo: p.full_name ?? "",
    matricula:    matriculaMap[p.id] ?? "",
  }));
}

// ── MATRÍCULAS ────────────────────────────────────────────────────────────────

export async function listarAlunosAction(discipline_id: string): Promise<EnrollmentListItem[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const { data: enrs, error } = await supabase
    .from("school_enrollments")
    .select("*")
    .eq("discipline_id", discipline_id)
    .eq("ministry_id", ctx.ministry_id)
    .order("created_at");
  if (error) throw new Error(error.message);
  if (!enrs?.length) return [];

  const enrIds = enrs.map((e) => e.id);
  const partyIds = enrs.map((e) => e.party_id);

  // Buscar nome das parties (coluna full_name)
  const { data: partiesData } = await supabase
    .from("parties")
    .select("id, full_name")
    .in("id", partyIds);

  // Buscar matrícula de party_members
  const { data: pmData } = await supabase
    .from("party_members")
    .select("party_id, matricula")
    .in("party_id", partyIds)
    .eq("ministry_id", ctx.ministry_id);

  const partyMap = Object.fromEntries(
    (partiesData ?? []).map((p) => [p.id, p.full_name ?? ""])
  );
  const matriculaMap = Object.fromEntries(
    (pmData ?? []).map((pm) => [pm.party_id, pm.matricula ?? ""])
  );

  const { data: grades } = await supabase
    .from("school_grades")
    .select("*")
    .in("enrollment_id", enrIds);

  const { data: attendance } = await supabase
    .from("school_attendance")
    .select("enrollment_id, presente")
    .in("enrollment_id", enrIds);

  const { data: lessons } = await supabase
    .from("school_lessons")
    .select("id")
    .eq("discipline_id", discipline_id)
    .eq("ministry_id", ctx.ministry_id);

  const totalAulas = lessons?.length ?? 0;

  return enrs.map((e: any) => {
    const eGrades = (grades ?? []).filter((g) => g.enrollment_id === e.id);
    const getGrade = (tipo: GradeTipo) =>
      eGrades.find((g) => g.tipo === tipo)?.nota ?? null;

    const ap1  = getGrade("AP1");
    const ap2  = getGrade("AP2");
    const fin  = getGrade("FINAL");
    const rec  = getGrade("RECUPERACAO");

    let media: number | null = null;
    if (ap1 !== null && ap2 !== null) {
      media = (ap1 + ap2) / 2;
      if (fin !== null) media = (media + fin) / 2;
      if (rec !== null) media = (media + rec) / 2;
      media = Math.round(media * 100) / 100;
    }

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
      ap1,
      ap2,
      final:           fin,
      recuperacao:     rec,
      media,
      presencas,
      total_aulas:     totalAulas,
      frequencia_pct:  freqPct,
    } as EnrollmentListItem;
  });
}

export async function matricularAlunoAction(
  discipline_id: string,
  party_id: string
): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  // Inserir matrícula
  const { data: enr, error } = await supabase
    .from("school_enrollments")
    .insert({ ministry_id: ctx.ministry_id, discipline_id, party_id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  // Garantir role ALUNO em party_roles (ignora se ja existir)
  await supabase.from("party_roles").upsert({
    party_id,
    ministry_id: ctx.ministry_id,
    role_type:   "ALUNO",
    status:      "ACTIVE",
  }, { onConflict: "party_id,ministry_id,role_type,unit_id", ignoreDuplicates: true });

  // Criar registros de presença para todas as aulas já existentes
  const { data: lessons } = await supabase
    .from("school_lessons")
    .select("id")
    .eq("discipline_id", discipline_id)
    .eq("ministry_id", ctx.ministry_id);

  if (lessons?.length && enr) {
    const attendances = lessons.map((l) => ({
      lesson_id:     l.id,
      enrollment_id: enr.id,
      ministry_id:   ctx.ministry_id,
      presente:      false,
    }));
    await supabase.from("school_attendance").upsert(attendances, {
      onConflict: "lesson_id,enrollment_id",
    });
  }
}

export async function cancelarMatriculaAction(enrollment_id: string): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 3);
  const supabase = await createClient();

  const { error } = await supabase
    .from("school_enrollments")
    .update({ situacao: "TRANCADO" as EnrollmentSituacao })
    .eq("id", enrollment_id)
    .eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
}

// ── NOTAS ─────────────────────────────────────────────────────────────────────

export async function lancarNotaAction(
  enrollment_id: string,
  tipo: GradeTipo,
  nota: number
): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  // Buscar ministry_id da matrícula
  const { data: enr } = await supabase
    .from("school_enrollments")
    .select("ministry_id")
    .eq("id", enrollment_id)
    .single();
  if (!enr) throw new Error("Matricula nao encontrada");

  const { error } = await supabase.from("school_grades").upsert({
    enrollment_id,
    ministry_id: ctx.ministry_id,
    tipo,
    nota,
  }, { onConflict: "enrollment_id,tipo" });
  if (error) throw new Error(error.message);

  // Recalcular situação via RPC
  await recalcularSituacaoAction(enrollment_id);
}

export async function recalcularSituacaoAction(enrollment_id: string): Promise<void> {
  const supabase = await createClient();
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);

  const { data: situacao } = await supabase.rpc("calcular_situacao_matricula", {
    p_enrollment_id: enrollment_id,
  });

  if (situacao) {
    await supabase
      .from("school_enrollments")
      .update({ situacao: situacao as EnrollmentSituacao })
      .eq("id", enrollment_id)
      .eq("ministry_id", ctx.ministry_id);
  }
}

// ── PRESENÇA ──────────────────────────────────────────────────────────────────

export async function buscarPresencaAulaAction(
  lesson_id: string
): Promise<SchoolAttendance[]> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("school_attendance")
    .select("*")
    .eq("lesson_id", lesson_id)
    .eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);
  return (data ?? []) as SchoolAttendance[];
}

export async function salvarPresencaAction(
  attendance_id: string,
  presente: boolean
): Promise<void> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const { data: att } = await supabase
    .from("school_attendance")
    .select("enrollment_id")
    .eq("id", attendance_id)
    .single();

  const { error } = await supabase
    .from("school_attendance")
    .update({ presente })
    .eq("id", attendance_id)
    .eq("ministry_id", ctx.ministry_id);
  if (error) throw new Error(error.message);

  // Recalcular situação
  if (att?.enrollment_id) {
    await recalcularSituacaoAction(att.enrollment_id);
  }
}

// ── BOLETIM ───────────────────────────────────────────────────────────────────

export async function buscarBoletimAction(
  party_id: string,
  semester_id: string
): Promise<StudentBoletim> {
  const ctx = await getAuthContext();
  assertLevel(ctx, 4);
  const supabase = await createClient();

  const { data: party } = await supabase
    .from("parties")
    .select("id, full_name")
    .eq("id", party_id)
    .single();

  const { data: pm } = await supabase
    .from("party_members")
    .select("matricula")
    .eq("party_id", party_id)
    .eq("ministry_id", ctx.ministry_id)
    .maybeSingle();

  const { data: semester } = await supabase
    .from("school_semesters")
    .select("nome")
    .eq("id", semester_id)
    .single();

  const { data: enrs } = await supabase
    .from("school_enrollments")
    .select("*")
    .eq("party_id", party_id)
    .eq("ministry_id", ctx.ministry_id);

  // Buscar disciplinas do semestre e filtrar
  const { data: semDiscs } = await supabase
    .from("school_disciplines")
    .select("id, nome, carga_horaria, nota_minima, frequencia_minima, professor_party_id")
    .eq("semester_id", semester_id)
    .eq("ministry_id", ctx.ministry_id);

  const semDiscIds = new Set((semDiscs ?? []).map((d) => d.id));
  const filtered = (enrs ?? []).filter((e: any) => semDiscIds.has(e.discipline_id));

  // Buscar nomes dos professores
  const profIds = (semDiscs ?? []).map((d) => d.professor_party_id).filter(Boolean) as string[];
  const { data: profsData } = profIds.length
    ? await supabase.from("parties").select("id, full_name").in("id", profIds)
    : { data: [] };
  const profMap = Object.fromEntries((profsData ?? []).map((p: any) => [p.id, p.full_name ?? ""]));
  const discMap = Object.fromEntries((semDiscs ?? []).map((d) => [d.id, d]));

  const enrIds = filtered.map((e) => e.id);
  const { data: grades } = await supabase
    .from("school_grades")
    .select("*")
    .in("enrollment_id", enrIds);

  const { data: attendance } = await supabase
    .from("school_attendance")
    .select("enrollment_id, presente")
    .in("enrollment_id", enrIds);

  const { data: lessons } = await supabase
    .from("school_lessons")
    .select("id, discipline_id")
    .in("discipline_id", Array.from(semDiscIds))
    .eq("ministry_id", ctx.ministry_id);

  const disciplinas = await Promise.all(
    filtered.map(async (e: any) => {
      const disc = discMap[e.discipline_id] ?? {};
      const eGrades = (grades ?? []).filter((g) => g.enrollment_id === e.id);
      const getG = (t: GradeTipo) => eGrades.find((g) => g.tipo === t)?.nota ?? null;

      const ap1 = getG("AP1"), ap2 = getG("AP2");
      const fin = getG("FINAL"), rec = getG("RECUPERACAO");
      let media: number | null = null;
      if (ap1 !== null && ap2 !== null) {
        media = (ap1 + ap2) / 2;
        if (fin !== null) media = (media + fin) / 2;
        if (rec !== null) media = (media + rec) / 2;
        media = Math.round(media * 100) / 100;
      }

      const discLessons = (lessons ?? []).filter((l) => l.discipline_id === e.discipline_id);
      const totalAulas = discLessons.length;
      const presencas = (attendance ?? []).filter(
        (a) => a.enrollment_id === e.id && a.presente
      ).length;
      const freqPct = totalAulas > 0
        ? Math.round((presencas / totalAulas) * 10000) / 100
        : 100;

      return {
        discipline_nome:  disc.nome ?? "",
        professor_nome:   disc.professor_party_id ? (profMap[disc.professor_party_id] ?? null) : null,
        carga_horaria:    disc.carga_horaria ?? 40,
        nota_minima:      disc.nota_minima ?? 6,
        frequencia_min:   disc.frequencia_minima ?? 75,
        ap1, ap2, final: fin, recuperacao: rec, media,
        presencas, total_aulas: totalAulas, frequencia_pct: freqPct,
        situacao: e.situacao as EnrollmentSituacao,
      };
    })
  );

  return {
    party_id,
    party_nome:      party?.full_name ?? "",
    party_matricula: pm?.matricula ?? "",
    semester_nome:   semester?.nome ?? "",
    disciplinas,
  };
}
