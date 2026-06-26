import { listarGatewaysAction, listarPedidosAction } from "./actions";
import PagamentosClient from "./PagamentosClient";

export const dynamic = "force-dynamic";

export default async function PagamentosPage() {
  const [gateways, pedidos] = await Promise.all([
    listarGatewaysAction().catch(() => []),
    listarPedidosAction().catch(() => []),
  ]);
  return <PagamentosClient gateways={gateways} pedidos={pedidos} />;
}
