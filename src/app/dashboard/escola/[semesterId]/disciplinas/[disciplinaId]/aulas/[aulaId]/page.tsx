import { createClient } from "@/utils/supabase/server";
import { getAuthContext } from "@/utils/supabase/auth-context";
import ChamadaClient from "./ChamadaClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ semesterId: string; disciplinaId: string; aulaId: string }> };

export default async function ChamadaPage({ params }: Props) {
  const { semesterId, disciplinaId, aulaId } = await params;
  const ctx = await getAuthContext();
  const supabase = await createClient();

  const { data: aula } = await supabase
    .from("school_lessons")
    .select("*")
    .eq("id", aulaId)
    .eq("ministry_id", ctx.ministry_id)
    .single();

  // Busca presença + enrollment (sem FK join de parties para evitar erro de coluna)
  const { data: attRaw } = await supabase
    .from("school_attendance")
    .select("*, enrollment:school_enrollments!school_attendance_enrollment_id_fkey(id, party_id)")
    .eq("lesson_id", aulaId)
    .eq("ministry_id", ctx.ministry_id)
    .order("created_at");

  const partyIds = (attRaw ?? []).map((a: any) => a.enrollment?.party_id).filter(Boolean);

  const { data: partiesData } = partyIds.length
    ? await supabase.from("parties").select("id, full_name").in("id", partyIds)
    : { data: [] };

  const { data: pmData } = partyIds.length
    ? await supabase.from("party_members").select("party_id, matricula").in("party_id", partyIds).eq("ministry_id", ctx.ministry_id)
    : { data: [] };

  const partyMap = Object.fromEntries((partiesData ?? []).map((p: any) => [p.id, p.full_name ?? ""]));
  const matriculaMap = Object.fromEntries((pmData ?? []).map((pm: any) => [pm.party_id, pm.matricula ?? ""]));

  // Monta attendance com party aninhado no formato esperado pelo ChamadaClient
  const attendance = (attRaw ?? []).map((a: any) => ({
    ...a,
    enrollment: {
      ...a.enrollment,
      party: {
        nome_completo: partyMap[a.enrollment?.party_id] ?? "",
        matricula: matriculaMap[a.enrollment?.party_id] ?? "",
      },
    },
  }));

  return (
    <ChamadaClient
      semesterId={semesterId}
      disciplinaId={disciplinaId}
      aula={aula}
      attendance={attendance}
    />
  );
}
