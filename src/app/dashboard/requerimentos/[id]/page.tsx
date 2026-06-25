import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { SessionContext } from "@/types";
import { buscarRequisicaoAction } from "../actions";
import RequisicaoDetail from "./RequisicaoDetail";

export const metadata = { title: "Requerimento — IgrejasWeb" };

export default async function RequisicaoPage({ params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const raw = cookieStore.get("iw_context")?.value;
  if (!raw) redirect("/contexto");
  const ctx: SessionContext = JSON.parse(raw);

  const { id } = await params;
  const req = await buscarRequisicaoAction(id).catch(() => null);
  if (!req) notFound();

  return <RequisicaoDetail requisicao={req} ctx={ctx} />;
}
