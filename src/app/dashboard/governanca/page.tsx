import { listarReunioesAction, listarAtasAction, listarMandatosAction, listarConsentimentosAction, listarAuditLogsAction } from "./actions";
import { createClient } from "@/utils/supabase/server";
import { requireAuthContext } from "@/utils/supabase/auth-context";
import GovernancaClient from "./GovernancaClient";

export const dynamic = "force-dynamic";

export default async function GovernancaPage() {
  const ctx = await requireAuthContext();
  const sb  = await createClient();

  const [reunioes, atas, mandatos, consentimentos, auditLogs, membrosRes] = await Promise.all([
    listarReunioesAction().catch(() => []),
    listarAtasAction().catch(() => []),
    listarMandatosAction().catch(() => []),
    listarConsentimentosAction().catch(() => []),
    listarAuditLogsAction({ limite: 50 }).catch(() => []),
    sb.from("parties").select("id, full_name").eq("ministry_id", ctx.ministry_id).is("deleted_at", null).order("full_name").limit(100),
  ]);

  return (
    <GovernancaClient
      reunioes={reunioes}
      atas={atas}
      mandatos={mandatos}
      consentimentos={consentimentos}
      auditLogs={auditLogs}
      membros={membrosRes.data ?? []}
    />
  );
}
