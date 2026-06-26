import {
  buscarDisciplinaAction,
  listarAlunosAction,
  listarAulasAction,
} from "../../../actions";
import DisciplinaDetail from "./DisciplinaDetail";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ semesterId: string; disciplinaId: string }> };

export default async function DisciplinaPage({ params }: Props) {
  const { semesterId, disciplinaId } = await params;
  const [disciplina, alunos, aulas] = await Promise.all([
    buscarDisciplinaAction(disciplinaId),
    listarAlunosAction(disciplinaId).catch(() => []),
    listarAulasAction(disciplinaId).catch(() => []),
  ]);
  return (
    <DisciplinaDetail
      semesterId={semesterId}
      disciplina={disciplina}
      alunos={alunos}
      aulas={aulas}
    />
  );
}
