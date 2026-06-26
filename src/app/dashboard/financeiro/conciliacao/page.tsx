import { listarImportacoesAction } from "./actions";
import ConciliacaoClient from "./ConciliacaoClient";
import { createClient } from "@/utils/supabase/server";
import { getAuthContext } from "@/utils/supabase/auth-context";

export const dynamic = "force-dynamic";

export default async function ConciliacaoPage() {
  const ctx = await getAuthContext();
  const sb  = await createClient();

  const [importacoes, contasRes] = await Promise.all([
    listarImportacoesAction().catch(() => []),
    sb.from("fin_accounts").select("id, nome").eq("ministry_id", ctx.ministry_id).eq("is_active", true).order("nome"),
  ]);

  return <ConciliacaoClient importacoes={importacoes} contas={contasRes.data ?? []} />;
}
