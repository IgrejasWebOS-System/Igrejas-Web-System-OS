"use client";

import { useRouter } from "next/navigation";

type Aluno = { id: string; nome_completo: string; matricula: string };
type Props = { alunos: Aluno[] };

export default function AlunosClient({ alunos }: Props) {
  const router = useRouter();

  return (
    <div style={{ padding: "32px 28px", maxWidth: 760 }}>
      <button onClick={() => router.push("/dashboard/escola")}
        style={{ background: "none", border: "none", color: "#4A7DB5", fontWeight: 600, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 16 }}>
        ← Escola Teológica
      </button>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1C2833", margin: 0 }}>Alunos Matriculados</h1>
        <p style={{ color: "#5D6D7E", fontSize: 13, marginTop: 4 }}>{alunos.length} aluno(s) com role ALUNO ativo</p>
      </div>

      {alunos.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#5D6D7E" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🎓</div>
          <p style={{ fontWeight: 600 }}>Nenhum aluno matriculado ainda.</p>
          <p style={{ fontSize: 13 }}>Matricule membros em uma disciplina para que apareçam aqui.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {alunos.map((a) => (
            <div key={a.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "#fff", border: "1.5px solid #C8D6E5", borderRadius: 10, padding: "14px 18px",
            }}>
              <div>
                <span style={{ fontWeight: 700, color: "#1C2833" }}>{a.nome_completo}</span>
                <span style={{ color: "#5D6D7E", fontSize: 12, marginLeft: 10 }}>#{a.matricula}</span>
              </div>
              <button onClick={() => router.push(`/dashboard/escola/alunos/${a.id}`)}
                style={{ background: "#4A7DB5", color: "#fff", border: "none", borderRadius: 7, padding: "7px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                Ver Boletim
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
