import { listarRecebidosAction, listarTiposAction } from "../actions";
import RequisicoesList from "../RequisicoesList";

export const metadata = { title: "Requerimentos Recebidos — IgrejasWeb" };

export default async function RecebidosPage() {
  const [reqs, tipos] = await Promise.all([
    listarRecebidosAction().catch(() => []),
    listarTiposAction().catch(() => []),
  ]);

  return (
    <RequisicoesList
      mode="recebidos"
      requerimentos={reqs}
      tipos={tipos}
      title="Requerimentos Recebidos"
    />
  );
}
