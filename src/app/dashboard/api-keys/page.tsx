import { listarClientesAction, listarWebhooksAction } from "./actions";
import ApiKeysClient from "./ApiKeysClient";

export const dynamic = "force-dynamic";

export default async function ApiKeysPage() {
  const [clientes, webhooks] = await Promise.all([
    listarClientesAction().catch(() => []),
    listarWebhooksAction().catch(() => []),
  ]);
  return <ApiKeysClient clientes={clientes} webhooks={webhooks} />;
}
