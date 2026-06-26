import { listarVoluntariosAction, listarTimesAction, listarEscalasAction } from "./actions";
import VoluntariosClient from "./VoluntariosClient";
import { createClient } from "@/utils/supabase/server";
import { getAuthContext } from "@/utils/supabase/auth-context";

export const dynamic = "force-dynamic";

export default async function VoluntariosPage() {
  const ctx = await getAuthContext();
  const sb  = await createClient();

  const [voluntarios, times, escalas, membrosRes] = await Promise.all([
    listarVoluntariosAction().catch(() => []),
    listarTimesAction().catch(() => []),
    listarEscalasAction().catch(() => []),
    sb.from("parties").select("id, full_name").eq("ministry_id", ctx.ministry_id).eq("type", "MEMBRO").is("deleted_at", null).order("full_name").limit(200),
  ]);

  return <VoluntariosClient voluntarios={voluntarios} times={times} escalas={escalas} membros={membrosRes.data ?? []} />;
}
