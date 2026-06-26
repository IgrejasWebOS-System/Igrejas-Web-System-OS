import { listarOcorrenciasAction } from "./actions";
import OcorrenciasClient from "./OcorrenciasClient";

export const dynamic = "force-dynamic";

export default async function OcorrenciasPage() {
  const ocorrencias = await listarOcorrenciasAction().catch(() => []);
  return <OcorrenciasClient ocorrencias={ocorrencias} />;
}
