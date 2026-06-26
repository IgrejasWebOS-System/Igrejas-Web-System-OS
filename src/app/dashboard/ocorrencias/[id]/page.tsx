import { notFound } from "next/navigation";
import { buscarOcorrenciaAction, listarFollowupsAction } from "../actions";
import OcorrenciaDetalheClient from "./OcorrenciaDetalheClient";

export const dynamic = "force-dynamic";

export default async function OcorrenciaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [ocorrencia, followups] = await Promise.all([
    buscarOcorrenciaAction(id).catch(() => null),
    listarFollowupsAction(id).catch(() => []),
  ]);

  if (!ocorrencia) notFound();

  return <OcorrenciaDetalheClient ocorrencia={ocorrencia} followups={followups} />;
}
