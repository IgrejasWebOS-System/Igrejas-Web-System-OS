import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireAuthContext }       from "@/utils/supabase/auth-context";
import { buscarTurma, listarAlunosDaTurma, listarChamadas, buscarMembroParaEbd, adicionarAlunoAction, removerAlunoAction } from "../../actions";
import TurmaDetail from "./TurmaDetail";
import { EBD_FAIXA_LABELS, DIA_SEMANA_LABELS } from "@/types";

export default async function TurmaPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAuthContext();

  const { id } = await params;

  const [turmaRes, alunosRes, chamadasRes] = await Promise.all([
    buscarTurma(id),
    listarAlunosDaTurma(id),
    listarChamadas(id),
  ]);

  if (!turmaRes.data) notFound();

  const turma = turmaRes.data;

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Cabeçalho */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 4 }}>
            <Link href="/dashboard/ebd" style={{ color: "var(--color-primary)", textDecoration: "none" }}>EBD</Link>
            {" › "}{turma.nome}
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--color-text-primary)", margin: 0 }}>
            {turma.nome}
          </h1>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
            {EBD_FAIXA_LABELS[turma.faixa_etaria]} ·{" "}
            {DIA_SEMANA_LABELS[turma.dia_semana]} às {turma.horario.slice(0, 5)}
          </div>
        </div>
        <Link
          href={`/dashboard/ebd/turmas/${id}/chamada`}
          style={{
            background: "var(--color-primary)", color: "#fff",
            padding: "9px 18px", borderRadius: 8, fontSize: 13,
            fontWeight: 600, textDecoration: "none",
          }}
        >
          📋 Nova Chamada
        </Link>
      </div>

      {/* Detalhe com abas */}
      <TurmaDetail
        turma={turma}
        alunos={alunosRes.data}
        chamadas={chamadasRes.data}
        adicionarAlunoAction={adicionarAlunoAction}
        removerAlunoAction={removerAlunoAction}
        buscarMembroAction={buscarMembroParaEbd}
      />
    </div>
  );
}
