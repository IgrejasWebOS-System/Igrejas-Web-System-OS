import { notFound, redirect } from "next/navigation";
import { getAuthContext }       from "@/utils/supabase/auth-context";
import { buscarTurma, listarAlunosDaTurma, criarChamadaAction } from "../../../actions";
import ChamadaForm from "./ChamadaForm";

export default async function ChamadaPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const { id } = await params;

  const [turmaRes, alunosRes] = await Promise.all([
    buscarTurma(id),
    listarAlunosDaTurma(id),
  ]);

  if (!turmaRes.data) notFound();

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", paddingBottom: 40 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 4 }}>
          EBD › {turmaRes.data.nome} › Chamada
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--color-text-primary)", margin: 0 }}>
          Registrar Chamada
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>
          Marque a presença dos alunos de <strong>{turmaRes.data.nome}</strong>.
        </p>
      </div>

      <ChamadaForm
        turma={turmaRes.data}
        alunos={alunosRes.data}
        criarChamadaAction={criarChamadaAction}
      />
    </div>
  );
}
