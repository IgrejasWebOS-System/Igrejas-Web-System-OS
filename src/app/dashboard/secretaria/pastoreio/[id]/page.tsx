import { notFound } from "next/navigation";
import { buscarGrupoAction } from "../actions";
import PastoralGroupDetail from "./PastoralGroupDetail";

export const metadata = { title: "Grupo de Pastoreio — IgrejasWeb" };

export default async function PastoralGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const grupo = await buscarGrupoAction(id).catch(() => null);
  if (!grupo) notFound();
  return <PastoralGroupDetail grupo={grupo} />;
}
