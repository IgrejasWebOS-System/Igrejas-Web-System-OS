import { listarTemplatesAction, listarCampanhasAction } from "./actions";
import ComunicacaoClient from "./ComunicacaoClient";

export const dynamic = "force-dynamic";

export default async function ComunicacaoPage() {
  const [templates, campanhas] = await Promise.all([
    listarTemplatesAction().catch(() => []),
    listarCampanhasAction().catch(() => []),
  ]);
  return <ComunicacaoClient templates={templates} campanhas={campanhas} />;
}
