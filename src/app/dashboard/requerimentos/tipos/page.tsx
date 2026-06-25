import { listarTiposAction } from "../actions";
import TiposReqClient from "./TiposReqClient";

export const metadata = { title: "Tipos de Requerimento — IgrejasWeb" };

export default async function TiposReqPage() {
  const tipos = await listarTiposAction().catch(() => []);
  return <TiposReqClient tipos={tipos} />;
}
