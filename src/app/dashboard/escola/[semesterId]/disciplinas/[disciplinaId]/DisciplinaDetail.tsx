"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type {
  SchoolDisciplineWithStats,
  SchoolLesson,
  EnrollmentListItem,
  GradeTipo,
  EnrollmentSituacao,
} from "@/types";
import { ENROLLMENT_SITUACAO_LABELS, ENROLLMENT_SITUACAO_COLORS } from "@/types";
import {
  matricularAlunoAction,
  cancelarMatriculaAction,
  lancarNotaAction,
  criarAulaAction,
  salvarPresencaAction,
  buscarMembrosAction,
} from "../../../actions";

type Props = {
  semesterId: string;
  disciplina: SchoolDisciplineWithStats;
  alunos: EnrollmentListItem[];
  aulas: SchoolLesson[];
};

type Tab = "notas" | "aulas";

export default function DisciplinaDetail({ semesterId, disciplina, alunos: init, aulas: initAulas }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>("notas");
  const [alunos, setAlunos] = useState(init);
  const [aulas, setAulas] = useState(initAulas);
  const [erro, setErro] = useState("");

  // Sincroniza estado local quando o Server Component re-renderiza após router.refresh()
  useEffect(() => { setAlunos(init); }, [init]);
  useEffect(() => { setAulas(initAulas); }, [initAulas]);

  // Matrícula
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; nome_completo: string; matricula: string }[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  function buscarMembro(q: string) {
    setSearchQ(q);
    clearTimeout(debounceRef.current);
    if (!q.trim()) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await buscarMembrosAction(q);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      }
    }, 300);
  }

  function matricular(party: { id: string; nome_completo: string; matricula: string }) {
    startTransition(async () => {
      try {
        await matricularAlunoAction(disciplina.id, party.id);
        setSearchQ(""); setSearchResults([]);
        router.refresh();
      } catch (e: any) { setErro(e.message ?? "Erro ao matricular"); }
    });
  }

  // Nota inline
  const [editingNota, setEditingNota] = useState<{ enrId: string; tipo: GradeTipo } | null>(null);
  const [notaVal, setNotaVal] = useState("");

  function iniciarEditNota(enrId: string, tipo: GradeTipo, atual: number | null) {
    setEditingNota({ enrId, tipo });
    setNotaVal(atual !== null ? String(atual) : "");
  }
  function salvarNota() {
    if (!editingNota) return;
    const nota = parseFloat(notaVal);
    if (isNaN(nota) || nota < 0 || nota > 10) { setErro("Nota deve ser entre 0 e 10"); return; }
    startTransition(async () => {
      try {
        await lancarNotaAction(editingNota.enrId, editingNota.tipo, nota);
        setEditingNota(null); setErro("");
        router.refresh();
      } catch (e: any) { setErro(e.message ?? "Erro ao salvar nota"); }
    });
  }

  // Nova aula
  const [modalAula, setModalAula] = useState(false);
  const [aulaData, setAulaData] = useState("");
  const [aulaConteudo, setAulaConteudo] = useState("");

  function criarAula() {
    if (!aulaData) { setErro("Informe a data da aula"); return; }
    const fd = new FormData();
    fd.set("data_aula", aulaData);
    fd.set("conteudo", aulaConteudo);
    startTransition(async () => {
      try {
        await criarAulaAction(disciplina.id, fd);
        setModalAula(false); setAulaData(""); setAulaConteudo(""); setErro("");
        router.refresh();
      } catch (e: any) { setErro(e.message ?? "Erro ao criar aula"); }
    });
  }

  return (
    <div style={{ padding: "32px 28px", maxWidth: 1100 }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, fontSize: 13, color: "#5D6D7E" }}>
        <button onClick={() => router.push("/dashboard/escola")} style={linkBtn}>Escola</button>
        <span>/</span>
        <button onClick={() => router.push(`/dashboard/escola/${semesterId}`)} style={linkBtn}>Semestre</button>
        <span>/</span>
        <span style={{ color: "#1C2833", fontWeight: 600 }}>{disciplina.nome}</span>
      </div>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1C2833", margin: 0 }}>{disciplina.nome}</h1>
          <p style={{ color: "#5D6D7E", fontSize: 13, marginTop: 4 }}>
            {disciplina.carga_horaria}h
            {disciplina.professor_nome && ` · Prof. ${disciplina.professor_nome}`}
            {` · Nota mín. ${disciplina.nota_minima} · Freq. mín. ${disciplina.frequencia_minima}%`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setModalAula(true)} style={btnStyle("#0f766e")}>+ Aula</button>
        </div>
      </div>

      {erro && (
        <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
          {erro}
          <button onClick={() => setErro("")} style={{ float: "right", background: "none", border: "none", cursor: "pointer", color: "#991b1b" }}>✕</button>
        </div>
      )}

      {/* Busca de membro para matrícula */}
      <div style={{ background: "#EBF2F8", borderRadius: 10, padding: "14px 16px", marginBottom: 24, position: "relative" }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#4A7DB5", marginBottom: 8 }}>MATRICULAR ALUNO</p>
        <input
          value={searchQ}
          onChange={(e) => buscarMembro(e.target.value)}
          placeholder="Buscar membro por nome ou matrícula..."
          style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
        />
        {searchResults.length > 0 && (
          <div style={{ position: "absolute", left: 16, right: 16, top: "100%", marginTop: -4, background: "#fff", border: "1.5px solid #C8D6E5", borderRadius: 8, zIndex: 50, boxShadow: "0 8px 24px rgba(0,0,0,.1)" }}>
            {searchResults.map((m) => (
              <button key={m.id} onClick={() => matricular(m)}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 13, borderBottom: "1px solid #f1f5f9" }}>
                <strong>{m.nome_completo}</strong>
                <span style={{ color: "#5D6D7E", marginLeft: 8 }}>#{m.matricula}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #e2e8f0", marginBottom: 20 }}>
        {(["notas", "aulas"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            border: "none", background: "none", padding: "10px 20px", cursor: "pointer",
            fontWeight: 700, fontSize: 13,
            color: tab === t ? "#4A7DB5" : "#94a3b8",
            borderBottom: tab === t ? "2px solid #4A7DB5" : "2px solid transparent",
            marginBottom: -2,
          }}>
            {t === "notas" ? `Notas (${alunos.length})` : `Aulas (${aulas.length})`}
          </button>
        ))}
      </div>

      {/* Tab Notas */}
      {tab === "notas" && (
        <div style={{ overflowX: "auto" }}>
          {alunos.length === 0 ? (
            <p style={{ color: "#5D6D7E", textAlign: "center", padding: "40px 0" }}>Nenhum aluno matriculado.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#F4F8FC" }}>
                  <th style={th}>Aluno</th>
                  <th style={th}>Matr.</th>
                  {(["AP1","AP2","FINAL","RECUPERACAO"] as GradeTipo[]).map((t) => (
                    <th key={t} style={th}>{t === "RECUPERACAO" ? "REC" : t}</th>
                  ))}
                  <th style={th}>Média</th>
                  <th style={th}>Freq.</th>
                  <th style={th}>Situação</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {alunos.map((a) => {
                  const colors = ENROLLMENT_SITUACAO_COLORS[a.situacao];
                  return (
                    <tr key={a.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={td}><strong>{a.party_nome}</strong></td>
                      <td style={{ ...td, color: "#5D6D7E" }}>#{a.party_matricula}</td>
                      {(["AP1","AP2","FINAL","RECUPERACAO"] as GradeTipo[]).map((tipo) => {
                        const tipoLower = tipo.toLowerCase() === "final" ? "final" : tipo.toLowerCase() === "recuperacao" ? "recuperacao" : tipo.toLowerCase() as any;
                        const val = a[tipoLower as keyof EnrollmentListItem] as number | null;
                        const isEditing = editingNota?.enrId === a.id && editingNota.tipo === tipo;
                        return (
                          <td key={tipo} style={td} onClick={() => !isEditing && iniciarEditNota(a.id, tipo, val)}>
                            {isEditing ? (
                              <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                <input
                                  autoFocus
                                  type="number" step="0.1" min={0} max={10}
                                  value={notaVal}
                                  onChange={(e) => setNotaVal(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter") salvarNota(); if (e.key === "Escape") setEditingNota(null); }}
                                  style={{ width: 56, padding: "3px 6px", border: "1.5px solid #4A7DB5", borderRadius: 5, fontSize: 13 }}
                                />
                                <button onClick={salvarNota} style={{ background: "#4A7DB5", color: "#fff", border: "none", borderRadius: 4, padding: "3px 7px", cursor: "pointer", fontSize: 11 }}>✓</button>
                                <button onClick={() => setEditingNota(null)} style={{ background: "#94a3b8", color: "#fff", border: "none", borderRadius: 4, padding: "3px 7px", cursor: "pointer", fontSize: 11 }}>✕</button>
                              </span>
                            ) : (
                              <span style={{ cursor: "pointer", color: val !== null ? "#1C2833" : "#cbd5e1", padding: "2px 6px", borderRadius: 4 }}>
                                {val !== null ? val.toFixed(1) : "—"}
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td style={{ ...td, fontWeight: 700, color: a.media !== null && a.media >= disciplina.nota_minima ? "#166534" : a.media !== null ? "#991b1b" : "#94a3b8" }}>
                        {a.media !== null ? a.media.toFixed(1) : "—"}
                      </td>
                      <td style={{ ...td, color: a.frequencia_pct >= disciplina.frequencia_minima ? "#166534" : "#991b1b" }}>
                        {a.frequencia_pct.toFixed(1)}%
                        <span style={{ color: "#94a3b8", fontSize: 11 }}> ({a.presencas}/{a.total_aulas})</span>
                      </td>
                      <td style={td}>
                        <span style={{ padding: "3px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: colors.bg, color: colors.color }}>
                          {ENROLLMENT_SITUACAO_LABELS[a.situacao]}
                        </span>
                      </td>
                      <td style={td}>
                        <button onClick={() => router.push(`/dashboard/escola/alunos/${a.party_id}?semestre=${semesterId}`)}
                          style={{ background: "none", border: "1px solid #C8D6E5", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer", color: "#4A7DB5" }}>
                          Boletim
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab Aulas */}
      {tab === "aulas" && (
        <div>
          {aulas.length === 0 ? (
            <p style={{ color: "#5D6D7E", textAlign: "center", padding: "40px 0" }}>
              Nenhuma aula registrada. Clique em "+ Aula" para adicionar.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {aulas.map((aula) => (
                <div key={aula.id} style={{ background: "#fff", border: "1.5px solid #C8D6E5", borderRadius: 10, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontWeight: 700, color: "#1C2833" }}>Aula {aula.numero}</span>
                    <span style={{ color: "#5D6D7E", fontSize: 13, marginLeft: 12 }}>
                      {new Date(aula.data_aula + "T00:00:00").toLocaleDateString("pt-BR")}
                    </span>
                    {aula.conteudo && <p style={{ fontSize: 12, color: "#5D6D7E", marginTop: 4 }}>{aula.conteudo}</p>}
                  </div>
                  <button onClick={() => router.push(`/dashboard/escola/${semesterId}/disciplinas/${disciplina.id}/aulas/${aula.id}`)}
                    style={btnSmall("#4A7DB5")}>
                    Chamada
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal nova aula */}
      {modalAula && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 18, color: "#1C2833" }}>Nova Aula</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              <label style={labelStyle}>
                Data da aula *
                <input type="date" value={aulaData} onChange={(e) => setAulaData(e.target.value)} style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Conteúdo (opcional)
                <textarea value={aulaConteudo} onChange={(e) => setAulaConteudo(e.target.value)}
                  rows={3} style={{ ...inputStyle, resize: "vertical" }} placeholder="Assunto tratado na aula..." />
              </label>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
                <button onClick={() => { setModalAula(false); setErro(""); }} style={btnStyle("#94a3b8")}>Cancelar</button>
                <button onClick={criarAula} disabled={isPending} style={btnStyle("#0f766e")}>
                  {isPending ? "Salvando..." : "Criar Aula"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = { padding: "10px 12px", textAlign: "left", fontWeight: 700, fontSize: 12, color: "#5D6D7E", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "10px 12px", verticalAlign: "middle" };
const linkBtn: React.CSSProperties = { background: "none", border: "none", color: "#4A7DB5", cursor: "pointer", fontSize: 13, fontWeight: 600, padding: 0 };
const inputStyle: React.CSSProperties = { border: "1.5px solid #C8D6E5", borderRadius: 8, padding: "9px 12px", fontSize: 14, outline: "none", fontFamily: "inherit" };
const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 5, fontSize: 13, fontWeight: 600, color: "#374151" };
const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 };
const modalStyle: React.CSSProperties = { background: "#fff", borderRadius: 16, padding: "28px 28px 24px", width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,.2)" };
function btnStyle(bg: string): React.CSSProperties {
  return { background: bg, color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" };
}
function btnSmall(bg: string): React.CSSProperties {
  return { background: bg, color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" };
}
