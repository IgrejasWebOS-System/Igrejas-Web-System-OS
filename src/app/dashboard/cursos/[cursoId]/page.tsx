import { notFound } from "next/navigation";
import { buscarCursoAction, listarAulasCursoAction, listarInscritosAction } from "../actions";
import CursoDetalheClient from "./CursoDetalheClient";

export const dynamic = "force-dynamic";

export default async function CursoDetalhePage({
  params,
}: {
  params: Promise<{ cursoId: string }>;
}) {
  const { cursoId } = await params;

  const [curso, aulas, inscritos] = await Promise.all([
    buscarCursoAction(cursoId).catch(() => null),
    listarAulasCursoAction(cursoId).catch(() => []),
    listarInscritosAction(cursoId).catch(() => []),
  ]);

  if (!curso) notFound();

  return (
    <CursoDetalheClient
      curso={curso}
      initAulas={aulas}
      initInscritos={inscritos}
    />
  );
}
