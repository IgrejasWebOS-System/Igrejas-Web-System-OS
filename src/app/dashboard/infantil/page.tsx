import { listarCriancasAction, listarTurmasAction, listarCheckinsHojeAction } from "./actions";
import { createClient } from "@/utils/supabase/server";
import { requireAuthContext } from "@/utils/supabase/auth-context";
import InfantilClient from "./InfantilClient";

export const dynamic = "force-dynamic";

export default async function InfantilPage() {
  const ctx = await requireAuthContext();
  const sb  = await createClient();

  const [criancas, turmas, checkinsHoje, membrosRes] = await Promise.all([
    listarCriancasAction().catch(() => []),
    listarTurmasAction().catch(() => []),
    listarCheckinsHojeAction().catch(() => []),
    sb.from("parties").select("id, full_name").eq("ministry_id", ctx.ministry_id).is("deleted_at", null).order("full_name").limit(100),
  ]);

  return <InfantilClient criancas={criancas} turmas={turmas} checkinsHoje={checkinsHoje} membros={membrosRes.data ?? []} />;
}
