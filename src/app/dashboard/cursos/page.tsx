import { listarCursosAction } from "./actions";
import CursosClient from "./CursosClient";

export const dynamic = "force-dynamic";

export default async function CursosPage() {
  const cursos = await listarCursosAction().catch(() => []);
  return <CursosClient cursos={cursos} />;
}
