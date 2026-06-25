import { listarGruposAction } from "./actions";
import PastoralGroupsClient from "./PastoralGroupsClient";

export const metadata = { title: "Pastoreio — IgrejasWeb" };

export default async function PastoralPage() {
  const grupos = await listarGruposAction().catch(() => []);
  return <PastoralGroupsClient grupos={grupos} />;
}
