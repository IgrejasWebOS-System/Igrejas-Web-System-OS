import { createClient } from "@/utils/supabase/server";
import { requireAuthContext } from "@/utils/supabase/auth-context";
import AlunosClient from "./AlunosClient";

export const dynamic = "force-dynamic";

export default async function AlunosPage() {
  const ctx = await requireAuthContext();
  const supabase = await createClient();

  // Busca todas as parties com role ALUNO no ministério
  const { data: roles } = await supabase
    .from("party_roles")
    .select("party_id")
    .eq("ministry_id", ctx.ministry_id)
    .eq("role_type", "ALUNO")
    .eq("status", "ACTIVE");

  const partyIds = [...new Set((roles ?? []).map((r: any) => r.party_id))];

  const { data: partiesData } = partyIds.length
    ? await supabase.from("parties").select("id, full_name").in("id", partyIds)
    : { data: [] };

  const { data: pmData } = partyIds.length
    ? await supabase.from("party_members").select("party_id, matricula").in("party_id", partyIds).eq("ministry_id", ctx.ministry_id)
    : { data: [] };

  const matriculaMap = Object.fromEntries((pmData ?? []).map((pm: any) => [pm.party_id, pm.matricula ?? ""]));

  const alunos = (partiesData ?? []).map((p: any) => ({
    id: p.id,
    nome_completo: p.full_name ?? "",
    matricula: matriculaMap[p.id] ?? "",
  }));

  return <AlunosClient alunos={alunos} />;
}
