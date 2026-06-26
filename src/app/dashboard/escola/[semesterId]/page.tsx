import { redirect } from "next/navigation";
import { buscarSemestreAction, listarDisciplinasAction } from "../actions";
import SemestreDetail from "./SemestreDetail";

export const dynamic = "force-dynamic";

// Segmentos estáticos que não devem cair nesta rota dinâmica
const STATIC_SEGMENTS = ["alunos", "disciplinas", "aulas"];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Props = { params: Promise<{ semesterId: string }> };

export default async function SemestrePage({ params }: Props) {
  const { semesterId } = await params;

  // Redireciona se o segmento não for um UUID válido
  if (STATIC_SEGMENTS.includes(semesterId) || !UUID_RE.test(semesterId)) {
    redirect("/dashboard/escola");
  }

  const [semestre, disciplinas] = await Promise.all([
    buscarSemestreAction(semesterId),
    listarDisciplinasAction(semesterId).catch(() => []),
  ]);
  return <SemestreDetail semestre={semestre} disciplinas={disciplinas} />;
}
