import { listarProjetosAction } from "../actions";
import ProjetosClient from "./ProjetosClient";

export const dynamic = "force-dynamic";

export default async function ProjetosPage() {
  const projetos = await listarProjetosAction().catch(() => []);
  return <ProjetosClient projetos={projetos} />;
}
