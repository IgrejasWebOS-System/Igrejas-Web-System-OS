import { listarTiposAction } from "../actions";
import NovoRequerimentoClient from "./NovoRequerimentoClient";
import { createClient } from "@/utils/supabase/server";
import { getAuthContext } from "@/utils/supabase/auth-context";

export const metadata = { title: "Novo Requerimento — IgrejasWeb" };

export default async function NovoRequerimentoPage() {
  const ctx = await getAuthContext();
  const tipos = await listarTiposAction().catch(() => []);

  // Carregar unidades disponíveis como destino (exceto a própria)
  let unidades: { id: string; nome: string }[] = [];
  if (ctx) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("units")
      .select("id, nome")
      .eq("ministry_id", ctx.ministry_id)
      .neq("id", ctx.unit_id ?? "")
      .eq("is_active", true)
      .order("nome");
    unidades = (data ?? []) as { id: string; nome: string }[];
  }

  return <NovoRequerimentoClient tipos={tipos} unidades={unidades} />;
}
