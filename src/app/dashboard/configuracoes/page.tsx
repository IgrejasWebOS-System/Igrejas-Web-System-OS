import { listarConfigsAction, listarComunicadosAction, listarAutomacoesAction } from "./actions";
import ConfiguracoesClient from "./ConfiguracoesClient";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const [configs, comunicados, automacoes] = await Promise.all([
    listarConfigsAction().catch(() => []),
    listarComunicadosAction().catch(() => []),
    listarAutomacoesAction().catch(() => []),
  ]);
  return <ConfiguracoesClient configs={configs} comunicados={comunicados} automacoes={automacoes} />;
}
