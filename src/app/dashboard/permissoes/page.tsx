import { listarPerfisAction, listarGrantsAction } from "./actions";
import PermissoesClient from "./PermissoesClient";

export const dynamic = "force-dynamic";

export default async function PermissoesPage() {
  const [perfis, grants] = await Promise.all([
    listarPerfisAction().catch(() => []),
    listarGrantsAction().catch(() => []),
  ]);
  return <PermissoesClient perfis={perfis} grants={grants} />;
}
