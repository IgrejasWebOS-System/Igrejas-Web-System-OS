import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getAuthContext } from "@/utils/supabase/auth-context";
import ChamadaCursoClient from "./ChamadaCursoClient";

export const dynamic = "force-dynamic";

export default async function ChamadaCursoPage({
  params,
}: {
  params: Promise<{ cursoId: string; aulaId: string }>;
}) {
  const { cursoId, aulaId } = await params;

  const ctx      = await getAuthContext();
  const supabase = await createClient();

  // Buscar aula
  const { data: aula } = await supabase
    .from("course_lessons")
    .select("*")
    .eq("id", aulaId)
    .eq("course_id", cursoId)
    .eq("ministry_id", ctx.ministry_id)
    .single();
  if (!aula) notFound();

  // Buscar curso (para nome)
  const { data: curso } = await supabase
    .from("courses")
    .select("titulo")
    .eq("id", cursoId)
    .eq("ministry_id", ctx.ministry_id)
    .single();

  // Buscar presenças com enrollment → party_id
  const { data: attRaw } = await supabase
    .from("course_attendance")
    .select("*, enrollment:course_enrollments!course_attendance_enrollment_id_fkey(id, party_id)")
    .eq("lesson_id", aulaId)
    .eq("ministry_id", ctx.ministry_id);

  const partyIds = (attRaw ?? [])
    .map((a: any) => a.enrollment?.party_id)
    .filter(Boolean) as string[];

  const { data: partiesData } = partyIds.length
    ? await supabase.from("parties").select("id, full_name").in("id", partyIds)
    : { data: [] };

  const { data: pmData } = partyIds.length
    ? await supabase.from("party_members").select("party_id, matricula").in("party_id", partyIds).eq("ministry_id", ctx.ministry_id)
    : { data: [] };

  const partyMap    = Object.fromEntries((partiesData ?? []).map((p: any) => [p.id, p.full_name ?? ""]));
  const matriculaMap = Object.fromEntries((pmData ?? []).map((pm: any) => [pm.party_id, pm.matricula ?? ""]));

  const attendances = (attRaw ?? []).map((a: any) => ({
    id:            a.id,
    lesson_id:     a.lesson_id,
    enrollment_id: a.enrollment_id,
    ministry_id:   a.ministry_id,
    presente:      a.presente,
    created_at:    a.created_at,
    party: {
      id:            a.enrollment?.party_id ?? "",
      nome_completo: partyMap[a.enrollment?.party_id ?? ""] ?? "—",
      matricula:     matriculaMap[a.enrollment?.party_id ?? ""] ?? "",
    },
  }));

  return (
    <ChamadaCursoClient
      cursoId={cursoId}
      cursoTitulo={curso?.titulo ?? ""}
      aula={aula}
      initAttendances={attendances}
    />
  );
}
