import { listarTransferenciasAction, listarContasAction } from "../actions";
import TransferenciasClient from "./TransferenciasClient";

export const dynamic = "force-dynamic";

export default async function TransferenciasPage() {
  const [transferencias, contas] = await Promise.all([
    listarTransferenciasAction().catch(() => []),
    listarContasAction().catch(() => []),
  ]);
  return <TransferenciasClient transferencias={transferencias} contas={contas} />;
}
