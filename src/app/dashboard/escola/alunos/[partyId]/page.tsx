import { buscarBoletimAction, listarSemestresAction } from "../../actions";
import BoletimClient from "./BoletimClient";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ partyId: string }>;
  searchParams: Promise<{ semestre?: string }>;
};

export default async function BoletimPage({ params, searchParams }: Props) {
  const { partyId } = await params;
  const { semestre } = await searchParams;

  const semestres = await listarSemestresAction().catch(() => []);
  const semesterId = semestre ?? semestres[0]?.id ?? null;

  const boletim = semesterId
    ? await buscarBoletimAction(partyId, semesterId).catch(() => null)
    : null;

  return (
    <BoletimClient
      partyId={partyId}
      semestres={semestres}
      semesterId={semesterId}
      boletim={boletim}
    />
  );
}
