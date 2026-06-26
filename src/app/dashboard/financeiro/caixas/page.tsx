import { listarPeriodosAction } from "../actions";
import CaixasClient from "./CaixasClient";

export const dynamic = "force-dynamic";

export default async function CaixasPage() {
  const periodos = await listarPeriodosAction().catch(() => []);
  return <CaixasClient periodos={periodos} />;
}
