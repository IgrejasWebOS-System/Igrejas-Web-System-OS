import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import type { SessionContext } from "@/types";
import {
  buscarMembro, buscarLookups,
  atualizarMembroAction, alterarSituacaoAction,
  criarFuncaoAction, encerrarFuncaoAction,
  criarDependenteAction, transferirMembroAction,
} from "../actions";
import MemberDetail from "./MemberDetail";
import { listarContasAction } from "./bank-accounts/actions";

export const metadata = { title: "Ficha do Membro — IgrejasWeb" };

export default async function MembroPage({ params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const raw = cookieStore.get("iw_context")?.value;
  if (!raw) redirect("/contexto");
  const ctx: SessionContext = JSON.parse(raw);

  const { id } = await params;

  const [membroResult, lookupsResult, contasBancarias] = await Promise.all([
    buscarMembro(id),
    buscarLookups(),
    listarContasAction(id).catch(() => []),
  ]);

  if (!membroResult.data) notFound();

  return (
    <MemberDetail
      member={membroResult.data}
      lookups={lookupsResult.data}
      ctx={ctx}
      contasBancarias={contasBancarias}
      updateAction={atualizarMembroAction}
      alterarSituacaoAction={alterarSituacaoAction}
      criarFuncaoAction={criarFuncaoAction}
      encerrarFuncaoAction={encerrarFuncaoAction}
      criarDependenteAction={criarDependenteAction}
      transferirMembroAction={transferirMembroAction}
    />
  );
}
