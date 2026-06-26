import { listarRegrasDepreciacaoAction } from "@/app/dashboard/patrimonio/actions";
import RegrasCRUDClient from "./RegrasCRUDClient";

export const dynamic = "force-dynamic";

export default async function PatrimonioRegrasPage() {
  const regras = await listarRegrasDepreciacaoAction().catch(() => []);
  return <RegrasCRUDClient regras={regras} />;
}
