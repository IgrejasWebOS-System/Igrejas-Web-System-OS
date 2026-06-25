"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import type { EbdClass, EbdEnrollmentWithMember, EbdRollCall } from "@/types";

type MembroResult = { party_id: string; nome: string; matricula: string | null };

type Props = {
  turma: EbdClass;
  alunos: EbdEnrollmentWithMember[];
  chamadas: EbdRollCall[];
  adicionarAlunoAction: (classId: string, partyId: string) => Promise<{ error?: string }>;
  removerAlunoAction: (enrollmentId: string, classId: string) => Promise<{ error?: string }>;
  buscarMembroAction: (termo: string) => Promise<{ data: MembroResult[] }>;
};

type Aba = "alunos" | "chamadas" | "pastoral";

export default function TurmaDetail({
  turma, alunos: alunosIniciais, chamadas,
  adicionarAlunoAction, removerAlunoAction, buscarMembroAction,
}: Props) {
  const [aba, setAba] = useState<Aba>("alunos");
  const [alunos, setAlunos] = useState(alunosIniciais);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState("");

  // Busca de membro para adicionar
  const [termoBusca, setTermoBusca] = useState("");
  const [sugestoes, setSugestoes] = useState<MembroResult[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (termoBusca.length < 2) { setSugestoes([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const res = await buscarMembroAction(termoBusca);
      // Filtrar quem já está na turma
      const ids = new Set(alunos.map(a => a.party_id));
      setSugestoes(res.data.filter(m => !ids.has(m.party_id)));
    }, 300);
  }, [termoBusca, alunos, buscarMembroAction]);

  function handleAdicionarAluno(membro: MembroResult) {
    setErro("");
    startTransition(async () => {
      const res = await adicionarAlunoAction(turma.id, membro.party_id);
      if (res.error) { setErro(res.error); return; }
      setAlunos(prev => [...prev, {
        id: crypto.randomUUID(), ministry_id: turma.ministry_id,
        class_id: turma.id, party_id: membro.party_id,
        data_entrada: new Date().toISOString().slice(0, 10),
        data_saida: null, is_active: true, created_at: new Date().toISOString(),
        full_name: membro.nome, matricula: membro.matricula,
        data_nascimento: null, faltas_consecutivas: 0,
      }]);
      setTermoBusca("");
      setSugestoes([]);
    });
  }

  function handleRemoverAluno(enrollmentId: string, partyId: string) {
    startTransition(async () => {
      const res = await removerAlunoAction(enrollmentId, turma.id);
      if (res.error) { setErro(res.error); return; }
      setAlunos(prev => prev.filter(a => a.id !== enrollmentId));
    });
  }

  const alunosAlerta = alunos.filter(a => a.faltas_consecutivas >= 2);

  const tabStyle = (t: Aba): React.CSSProperties => ({
    padding: "8px 16px", fontSize: 13, fontWeight: 600,
    border: "none", cursor: "pointer", borderRadius: "8px 8px 0 0",
    background: aba === t ? "#fff" : "transparent",
    color: aba === t ? "var(--color-primary)" : "var(--color-text-muted)",
    borderBottom: aba === t ? "2px solid var(--color-primary)" : "2px solid transparent",
  });

  return (
    <div>
      {/* Abas */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--color-border)", marginBottom: 20 }}>
        <button style={tabStyle("alunos")} onClick={() => setAba("alunos")}>
          👥 Alunos ({alunos.length})
        </button>
        <button style={tabStyle("chamadas")} onClick={() => setAba("chamadas")}>
          📋 Chamadas ({chamadas.length})
        </button>
        <button style={tabStyle("pastoral")} onClick={() => setAba("pastoral")}>
          ⚠️ Atenção Pastoral {alunosAlerta.length > 0 && `(${alunosAlerta.length})`}
        </button>
      </div>

      {/* ABA ALUNOS */}
      {aba === "alunos" && (
        <div>
          {/* Adicionar aluno */}
          <div style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 8 }}>
              Adicionar aluno à turma
            </div>
            <div style={{ position: "relative" }}>
              <input
                value={termoBusca}
                onChange={e => setTermoBusca(e.target.value)}
                placeholder="Buscar membro ativo por nome…"
                style={{ width: "100%", border: "1px solid var(--color-border)", borderRadius: 8,
                  padding: "8px 12px", fontSize: 13, outline: "none" }}
              />
              {sugestoes.length > 0 && (
                <div style={{ position: "absolute", zIndex: 10, top: "100%", marginTop: 2, width: "100%",
                  background: "#fff", border: "1px solid var(--color-border)", borderRadius: 8,
                  boxShadow: "0 4px 12px rgba(0,0,0,.1)" }}>
                  {sugestoes.map(m => (
                    <button key={m.party_id} type="button"
                      onClick={() => handleAdicionarAluno(m)}
                      style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px",
                        background: "none", border: "none", cursor: "pointer", fontSize: 13,
                        borderBottom: "1px solid #f1f5f9" }}>
                      <span style={{ fontWeight: 600 }}>{m.nome}</span>
                      {m.matricula && <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 8 }}>#{m.matricula}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {erro && <div style={{ marginTop: 8, fontSize: 12, color: "#b91c1c" }}>{erro}</div>}
          </div>

          {/* Lista */}
          {alunos.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "var(--color-text-muted)", fontSize: 13 }}>
              Nenhum aluno matriculado. Adicione o primeiro aluno acima.
            </div>
          ) : (
            <div style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--color-border)" }}>
                    {["Nome", "Matrícula", "Faltas Consec.", "Desde", ""].map(h => (
                      <th key={h} style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700,
                        color: "var(--color-text-muted)", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {alunos.map(a => (
                    <tr key={a.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600 }}>{a.full_name}</td>
                      <td style={{ padding: "10px 14px", fontSize: 12, fontFamily: "monospace", color: "#64748b" }}>
                        {a.matricula ?? "—"}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        {a.faltas_consecutivas >= 2 ? (
                          <span style={{ background: "#fef2f2", color: "#b91c1c", fontSize: 11,
                            fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>
                            {a.faltas_consecutivas} faltas
                          </span>
                        ) : (
                          <span style={{ color: "#22c55e", fontSize: 12 }}>✓</span>
                        )}
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--color-text-muted)" }}>
                        {new Date(a.data_entrada + "T00:00:00").toLocaleDateString("pt-BR")}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <button
                          onClick={() => handleRemoverAluno(a.id, a.party_id)}
                          disabled={isPending}
                          style={{ fontSize: 11, color: "#94a3b8", background: "none", border: "none", cursor: "pointer" }}
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ABA CHAMADAS */}
      {aba === "chamadas" && (
        <div>
          {chamadas.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "var(--color-text-muted)", fontSize: 13 }}>
              Nenhuma chamada registrada ainda.{" "}
              <Link href={`/dashboard/ebd/turmas/${turma.id}/chamada`} style={{ color: "var(--color-primary)" }}>
                Fazer a primeira chamada
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {chamadas.map(c => (
                <div key={c.id} style={{ background: "#fff", border: "1px solid var(--color-border)",
                  borderRadius: 12, padding: "14px 18px",
                  display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      {new Date(c.data + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
                      {c.total_presentes} presente{c.total_presentes !== 1 ? "s" : ""}
                      {c.visitantes > 0 && ` · ${c.visitantes} visitante${c.visitantes !== 1 ? "s" : ""}`}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--color-primary)" }}>
                      {alunos.length > 0 ? Math.round((c.total_presentes / alunos.length) * 100) : "—"}%
                    </div>
                    <div style={{ fontSize: 10, color: "var(--color-text-muted)" }}>frequência</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA PASTORAL */}
      {aba === "pastoral" && (
        <div>
          {alunosAlerta.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#22c55e", fontSize: 14 }}>
              ✅ Todos os alunos com frequência regular!
            </div>
          ) : (
            <div>
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8,
                padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#b91c1c" }}>
                ⚠️ {alunosAlerta.length} aluno{alunosAlerta.length > 1 ? "s" : ""} com 2 ou mais faltas consecutivas.
                Recomenda-se contato pastoral.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {alunosAlerta.map(a => (
                  <div key={a.id} style={{ background: "#fff", border: "1px solid #fecaca",
                    borderRadius: 10, padding: "12px 16px",
                    display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{a.full_name}</div>
                      {a.matricula && <div style={{ fontSize: 11, color: "#94a3b8" }}>#{a.matricula}</div>}
                    </div>
                    <span style={{ background: "#fef2f2", color: "#b91c1c", fontSize: 12,
                      fontWeight: 700, padding: "4px 10px", borderRadius: 99 }}>
                      {a.faltas_consecutivas} faltas consecutivas
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
