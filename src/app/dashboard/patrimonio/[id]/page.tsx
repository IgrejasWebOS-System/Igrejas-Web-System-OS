import { buscarPatrimonyItemAction, listarMovimentosAction, listarDepreciacoesAction } from "../actions";
import { createClient } from "@/utils/supabase/server";
import { requireAuthContext } from "@/utils/supabase/auth-context";
import PatrimonyItemClient from "./PatrimonyItemClient";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PatrimonyItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const ctx = await requireAuthContext().catch(() => null);
  const supabase = await createClient();

  try {
    const [item, movimentos, depreciacoes, unidades] = await Promise.all([
      buscarPatrimonyItemAction(id),
      listarMovimentosAction(id).catch(() => []),
      listarDepreciacoesAction(id).catch(() => []),
      ctx
        ? supabase.from("units").select("id, name, unit_type").eq("ministry_id", ctx.ministry_id).eq("is_active", true).order("name").then((r) => r.data ?? [])
        : [],
    ]);

    return (
      <PatrimonyItemClient
        item={item}
        movimentos={movimentos}
        depreciacoes={depreciacoes}
        unidades={unidades as any}
      />
    );
  } catch {
    notFound();
  }
}
