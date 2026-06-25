"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { EbdClass, EbdEnrollmentWithMember, EbdRollCall } from "@/types";

type Props = {
  turma: EbdClass;
  alunos: EbdEnrollmentWithMember[];
  criarChamadaAction: (payload: {
    class_id: string;
    data: string;
    visitantes: number;
    observacoes?: string;
    presencas: { party_id: string; presente: boolean; justificativa?: string }[];
  }) => Promise<{ data?: EbdRollCall; error?: string }>;
};

export default function ChamadaForm({ turma, alunos, criarChamadaAction }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const hoje = new Date().toISOString().slice(0, 10);
  const [data, setData]         = useState(hoje);
  const [visitantes, setVisitantes] = useState(0);
  const [observacoes, setObservacoes] = useState("");
  const [erro, setErro]         = useState("");

  // Presença: mapa party_id → boolean (default: true = presente)
  const [presencas, setPresencas] = useState<Record<string, boolean>>(
    Object.fromEntries(alunos.map(a => [a.party_id, true]))
  );

  const totalPresentes = Object.values(presencas).filter(Boolean).length;
  const totalAlunos = alunos.length;

  function togglePresenca(partyId: string) {
    setPresencas(prev => ({ ...prev, [partyId]: !prev[partyId] }));
  }

  function marcarTodos(presente: boolean) {
    setPresencas(Object.fromEntries(alunos.map(a => [a.party_id, presente])));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!data) { setErro("Informe a data da chamada."); return; }
    setErro("");

    startTransition(async () => {
      const result = await criarChamadaAction({
        class_id:   turma.id,
        data,
        visitantes,
        observacoes: observacoes || undefined,
        presencas: alunos.map(a => ({
          party_id: a.party_id,
          presente: presencas[a.party_id] ?? false,
        })),
      });

      if (result.error) { setErro(result.error); return; }
      router.push(`/dashboard/ebd/turmas/${turma.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Data e Visitantes */}
      <div style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 12, padding: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600,
              color: "var(--color-text-muted)", marginBottom: 6 }}>
              Data da Chamada *
            </label>
            <input type="date" required value={data} onChange={e => setData(e.target.value)}
              style={{ width: "100%", border: "1px solid var(--color-border)", borderRadius: 8,
                padding: "8px 12px", fontSize: 13 }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600,
              color: "var(--color-text-muted)", marginBottom: 6 }}>
              Visitantes Avulsos
            </label>
            <input type="number" min={0} value={visitantes} onChange={e => setVisitantes(Number(e.target.value))}
              style={{ width: "100%", border: "1px solid var(--color-border)", borderRadius: 8,
                padding: "8px 12px", fontSize: 13 }} />
          </div>
        </div>
      </div>

      {/* Lista de alunos */}
      <div style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 12, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--color-border)",
          display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Presença dos Alunos</span>
            <span style={{ fontSize: 12, color: "var(--color-text-muted)", marginLeft: 10 }}>
              {totalPresentes}/{totalAlunos} presentes
              {visitantes > 0 && ` + ${visitantes} visitante${visitantes > 1 ? "s" : ""}`}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => marcarTodos(true)}
              style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6,
                border: "1px solid var(--color-border)", background: "#f0fdf4",
                color: "#166534", cursor: "pointer", fontWeight: 600 }}>
              Todos presentes
            </button>
            <button type="button" onClick={() => marcarTodos(false)}
              style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6,
                border: "1px solid var(--color-border)", background: "#fef2f2",
                color: "#b91c1c", cursor: "pointer", fontWeight: 600 }}>
              Todos ausentes
            </button>
          </div>
        </div>

        {alunos.length === 0 ? (
          <div style={{ padding: "24px", textAlign: "center", color: "var(--color-text-muted)", fontSize: 13 }}>
            Nenhum aluno matriculado nesta turma.
          </div>
        ) : (
          <div>
            {alunos.map((aluno, idx) => {
              const presente = presencas[aluno.party_id] ?? false;
              return (
                <div
                  key={aluno.party_id}
                  onClick={() => togglePresenca(aluno.party_id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "12px 18px", cursor: "pointer",
                    borderBottom: idx < alunos.length - 1 ? "1px solid var(--color-border)" : "none",
                    background: presente ? "#f0fdf4" : "#fef2f2",
                    transition: "background .1s",
                    userSelect: "none",
                  }}
                >
                  {/* Toggle */}
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: presente ? "#22c55e" : "#ef4444",
                    color: "#fff", fontSize: 16, fontWeight: 700,
                  }}>
                    {presente ? "✓" : "✗"}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
                      {aluno.full_name}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                      {aluno.matricula ? `#${aluno.matricula}` : "Sem matrícula"}
                      {aluno.faltas_consecutivas >= 2 && (
                        <span style={{ marginLeft: 8, color: "#b91c1c", fontWeight: 700 }}>
                          ⚠ {aluno.faltas_consecutivas} faltas
                        </span>
                      )}
                    </div>
                  </div>

                  <span style={{ fontSize: 12, fontWeight: 700,
                    color: presente ? "#166534" : "#b91c1c" }}>
                    {presente ? "PRESENTE" : "AUSENTE"}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Resumo */}
        <div style={{ padding: "12px 18px", background: "#f8fafc",
          borderTop: "1px solid var(--color-border)", display: "flex", gap: 16 }}>
          <span style={{ fontSize: 12, color: "#166534", fontWeight: 600 }}>
            ✓ {totalPresentes} presentes
          </span>
          <span style={{ fontSize: 12, color: "#b91c1c", fontWeight: 600 }}>
            ✗ {totalAlunos - totalPresentes} ausentes
          </span>
          {visitantes > 0 && (
            <span style={{ fontSize: 12, color: "#7c3aed", fontWeight: 600 }}>
              + {visitantes} visitante{visitantes > 1 ? "s" : ""}
            </span>
          )}
          {totalAlunos > 0 && (
            <span style={{ fontSize: 12, color: "var(--color-text-muted)", marginLeft: "auto" }}>
              {Math.round((totalPresentes / totalAlunos) * 100)}% de frequência
            </span>
          )}
        </div>
      </div>

      {/* Observações */}
      <div style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 12, padding: 18 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600,
          color: "var(--color-text-muted)", marginBottom: 8 }}>
          Observações (opcional)
        </label>
        <textarea rows={2} value={observacoes} onChange={e => setObservacoes(e.target.value)}
          placeholder="Anotações sobre a aula, eventos especiais, etc."
          style={{ width: "100%", border: "1px solid var(--color-border)", borderRadius: 8,
            padding: "8px 12px", fontSize: 13, resize: "none" }} />
      </div>

      {erro && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8,
          padding: "10px 14px", fontSize: 13, color: "#b91c1c" }}>
          {erro}
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button type="button" onClick={() => router.back()}
          style={{ flex: 1, padding: "10px", border: "1px solid var(--color-border)",
            borderRadius: 8, fontSize: 13, background: "#fff", cursor: "pointer",
            color: "var(--color-text-muted)" }}>
          Cancelar
        </button>
        <button type="submit" disabled={isPending || alunos.length === 0}
          style={{ flex: 2, padding: "10px", background: "var(--color-primary)",
            color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? .6 : 1 }}>
          {isPending ? "Registrando…" : `Confirmar Chamada (${totalPresentes} presentes)`}
        </button>
      </div>
    </form>
  );
}
