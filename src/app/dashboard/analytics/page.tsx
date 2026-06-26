import { buscarFinanceiroMensalAction, buscarMembrosMensalAction, buscarKpisAction } from "./actions";
import AnalyticsClient from "./AnalyticsClient";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [kpis, financeiro, membros] = await Promise.all([
    buscarKpisAction().catch(() => ({ totalMembros: 0, membrosAtivos: 0, receitas: 0, despesas: 0, saldo: 0, eventosProximos: 0, totalPatrimonio: 0 })),
    buscarFinanceiroMensalAction(12).catch(() => []),
    buscarMembrosMensalAction(12).catch(() => []),
  ]);
  return <AnalyticsClient kpis={kpis} financeiro={financeiro} membros={membros} />;
}
