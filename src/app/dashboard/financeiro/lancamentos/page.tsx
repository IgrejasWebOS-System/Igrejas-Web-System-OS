import { listarLancamentosAction, listarContasAction, listarCategoriasPlanaAction } from "../actions";
import type { LancamentosFilter } from "../actions";
import LancamentosClient from "./LancamentosClient";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LancamentosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;

  const filter: LancamentosFilter = {
    tipo:       ((sp.tipo || "") as "ENTRADA" | "SAIDA" | ""),
    account_id: sp.account_id || "",
    category_id: sp.category_id || "",
    status:     sp.status || "",
    data_de:    sp.data_de || "",
    data_ate:   sp.data_ate || "",
    limit:      50,
    offset:     parseInt(sp.offset || "0"),
  };

  const [{ data: lancamentos, total }, contas, categorias] = await Promise.all([
    listarLancamentosAction(filter).catch(() => ({ data: [], total: 0 })),
    listarContasAction().catch(() => []),
    listarCategoriasPlanaAction().catch(() => []),
  ]);

  return (
    <LancamentosClient
      lancamentos={lancamentos}
      total={total}
      contas={contas}
      categorias={categorias}
      filter={filter}
    />
  );
}
