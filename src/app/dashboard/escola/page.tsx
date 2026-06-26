import { listarSemestresAction } from "./actions";
import EscolaClient from "./EscolaClient";

export const dynamic = "force-dynamic";

export default async function EscolaPage() {
  const semestres = await listarSemestresAction().catch(() => []);
  return <EscolaClient semestres={semestres} />;
}
