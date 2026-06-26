import { listarContasAction } from "../actions";
import ContasClient from "./ContasClient";

export const dynamic = "force-dynamic";

export default async function ContasPage() {
  const contas = await listarContasAction().catch(() => []);
  return <ContasClient contas={contas} />;
}
