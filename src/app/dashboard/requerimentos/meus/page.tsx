import { listarMeusAction, listarTiposAction } from "../actions";
import RequisicoesList from "../RequisicoesList";

export const metadata = { title: "Meus Requerimentos — IgrejasWeb" };

export default async function MeusRequerimentosPage() {
  const [reqs, tipos] = await Promise.all([
    listarMeusAction().catch(() => []),
    listarTiposAction().catch(() => []),
  ]);

  return (
    <RequisicoesList
      mode="meus"
      requerimentos={reqs}
      tipos={tipos}
      title="Meus Requerimentos"
    />
  );
}
