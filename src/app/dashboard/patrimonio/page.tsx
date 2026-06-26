import { listarPatrimonioAction, dashboardPatrimonioAction } from "./actions";
import { createClient } from "@/utils/supabase/server";
import { getAuthContext } from "@/utils/supabase/auth-context";
import PatrimonioClient from "./PatrimonioClient";

export const dynamic = "force-dynamic";

export default async function PatrimonioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;

  const filter = {
    categoria: params.categoria as any,
    status:    params.status as any,
    unit_id:   params.unit_id,
    search:    params.search,
  };

  const ctx = await getAuthContext().catch(() => null);
  const supabase = await createClient();

  const [itens, dashData, unidades] = await Promise.all([
    listarPatrimonioAction(filter).catch(() => []),
    dashboardPatrimonioAction().catch(() => null),
    ctx
      ? supabase.from("units").select("id, name, unit_type").eq("ministry_id", ctx.ministry_id).eq("is_active", true).order("name").then((r) => r.data ?? [])
      : [],
  ]);

  return (
    <PatrimonioClient
      itens={itens}
      dashData={dashData}
      unidades={unidades as any}
      filter={filter}
    />
  );
}
