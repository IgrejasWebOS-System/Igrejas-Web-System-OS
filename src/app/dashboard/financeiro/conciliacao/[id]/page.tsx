import { notFound } from "next/navigation";
import { listarLinhasAction } from "../actions";
import { createClient } from "@/utils/supabase/server";
import { getAuthContext } from "@/utils/supabase/auth-context";
import ConciliacaoDetalheClient from "./ConciliacaoDetalheClient";

export const dynamic = "force-dynamic";

export default async function ConciliacaoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAuthContext();
  const sb  = await createClient();

  const [linhas, impRes, contasRes, catsRes] = await Promise.all([
    listarLinhasAction(id).catch(() => []),
    sb.from("fin_bank_imports").select("*, fin_accounts:account_id(nome)").eq("id", id).eq("ministry_id", ctx.ministry_id).single(),
    sb.from("fin_accounts").select("id, nome").eq("ministry_id", ctx.ministry_id).eq("is_active", true).order("nome"),
    sb.from("fin_categories").select("id, nome, tipo").eq("ministry_id", ctx.ministry_id).order("nome"),
  ]);

  if (impRes.error || !impRes.data) notFound();

  return <ConciliacaoDetalheClient importacao={impRes.data} linhas={linhas} contas={contasRes.data ?? []} categorias={catsRes.data ?? []} />;
}
