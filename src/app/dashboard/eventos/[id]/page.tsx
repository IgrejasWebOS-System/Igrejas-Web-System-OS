import { notFound } from "next/navigation";
import { buscarEventoAction, listarInscricoesAction, listarCheckinsAction } from "../actions";
import EventoDetalheClient from "./EventoDetalheClient";

export const dynamic = "force-dynamic";

export default async function EventoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [evento, inscricoes, checkins] = await Promise.all([
    buscarEventoAction(id).catch(() => null),
    listarInscricoesAction(id).catch(() => []),
    listarCheckinsAction(id).catch(() => []),
  ]);

  if (!evento) notFound();

  return <EventoDetalheClient evento={evento} inscricoes={inscricoes} checkins={checkins} />;
}
