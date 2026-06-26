import { listarRecorrentesAction, listarContasAction, listarCategoriasAction } from "../actions";
import ProgramacoesClient from "./ProgramacoesClient";

export const dynamic = "force-dynamic";

export default async function ProgramacoesPage() {
  const [recorrentes, contas, categorias] = await Promise.all([
    listarRecorrentesAction().catch(() => []),
    listarContasAction().catch(() => []),
    listarCategoriasAction().catch(() => []),
  ]);
  return <ProgramacoesClient recorrentes={recorrentes} contas={contas} categorias={categorias} />;
}
