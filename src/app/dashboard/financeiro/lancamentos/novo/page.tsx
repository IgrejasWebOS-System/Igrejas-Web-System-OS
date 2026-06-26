import { listarContasAction, listarCategoriasPlanaAction, listarLookupFinAction } from "../../actions";
import NovoLancamentoClient from "./NovoLancamentoClient";

export const dynamic = "force-dynamic";

export default async function NovoLancamentoPage() {
  const [contas, categorias, lookup] = await Promise.all([
    listarContasAction().catch(() => []),
    listarCategoriasPlanaAction().catch(() => []),
    listarLookupFinAction().catch(() => ({
      paymentMethods: [], costCenters: [], titheJustifications: [], documentTypes: [],
    })),
  ]);

  return (
    <NovoLancamentoClient
      contas={contas}
      categorias={categorias}
      paymentMethods={lookup.paymentMethods}
      costCenters={lookup.costCenters}
      titheJustifications={lookup.titheJustifications}
      documentTypes={lookup.documentTypes}
    />
  );
}
