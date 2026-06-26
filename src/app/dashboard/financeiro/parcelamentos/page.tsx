import { listarParcelamentosAction } from "../actions";
import { listarContasAction } from "../actions";
import { listarCategoriasAction } from "../actions";
import ParcelamentosClient from "./ParcelamentosClient";

export const dynamic = "force-dynamic";

export default async function ParcelamentosPage() {
  const [planos, contas, categorias] = await Promise.all([
    listarParcelamentosAction().catch(() => []),
    listarContasAction().catch(() => []),
    listarCategoriasAction().catch(() => []),
  ]);
  return <ParcelamentosClient planos={planos} contas={contas} categorias={categorias} />;
}
