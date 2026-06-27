import { listarRepassesAction, listarContasAction } from "../actions";
import RepassesClient from "./RepassesClient";
import { createClient } from "@/utils/supabase/server";
import { requireAuthContext } from "@/utils/supabase/auth-context";

export const dynamic = "force-dynamic";

export default async function RepassesPage() {
  const ctx = await requireAuthContext().catch(() => null);
  const supabase = await createClient();

  const [repasses, contas] = await Promise.all([
    listarRepassesAction().catch(() => []),
    listarContasAction().catch(() => []),
  ]);

  // Buscar unidades para os selects
  let unidades: { id: string; name: string; unit_type: string }[] = [];
  if (ctx) {
    const { data } = await supabase
      .from("units")
      .select("id, name, unit_type")
      .eq("ministry_id", ctx.ministry_id)
      .eq("is_active", true)
      .order("name");
    unidades = data ?? [];
  }

  return <RepassesClient repasses={repasses} contas={contas} unidades={unidades} />;
}
