import { listarChartOfAccountsAction } from "../actions";
import PlanoContasClient from "./PlanoContasClient";

export const dynamic = "force-dynamic";

export default async function PlanoContasPage() {
  const tree = await listarChartOfAccountsAction().catch(() => []);
  return <PlanoContasClient tree={tree} />;
}
