"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { CourseWithStats, CourseLesson, CourseEnrollmentListItem } from "@/types";
import { COURSE_STATUS_COLORS, COURSE_STATUS_LABELS, COURSE_CATEGORIA_LABELS } from "@/types";
import {
  criarAulaCursoAction,
  inscreverParticipanteAction,
  cancelarInscricaoAction,
  buscarMembrosParaCursoAction,
} from "../actions";

type Props = {
  curso: CourseWithStats;
  initAulas: CourseLesson[];
  initInscritos: CourseEnrollmentListItem[];
};

type SearchResult = { id: string; nome_completo: string; matricula: string };

export default function CursoDetalheClient({ curso, initAulas, initInscritos }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [aulas, setAulas]         = useState(initAulas);
  const [inscritos, setInscritos] = useState(initInscritos);
  const [aba, setAba]             = useState<"inscritos" | "aulas">("inscritos");
  const [modalAula, setModalAula] = useState(false);
  const [erro, setErro]           = useState("");

  // Matrícula de participante
  const [searchQ, setSearchQ]     = useState("");
  const [searchRes, setSearchRes] = useState<SearchResult[]>([]);
  const [partido, setPartido]     = useState<SearchResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => { setAulas(initAulas); }, [initAulas]);
  useEffect(() => { setInscritos(initInscritos); }, [initInscritos]);

  function buscarMembro(q: string) {
    setSearchQ(q); setPartido(null);
    clearTimeout(debounceRef.current);
    if (!q.trim()) { setSearchRes([]); return; }
    debounceRef.current = setTimeout(async () => {
      const res = await buscarMembrosParaCursoAction(q).catch(() => []);
      setSearchRes(res);
    }, 300);
  }
  function selecionar(r: SearchResult) {
    setPartido(r); setSearchQ(r.nome_completo); setSearchRes([]);
  }

  function inscrever() {
    if (!partido) return;
    startTransition(async () => {
      try {
        await inscreverParticipanteAction(curso.id, partido.id);
        setPartido(null); setSearchQ(""); setSearchRes([]);
        router.refresh();
      } catch (err: any) {
        setErro(err.message ?? "Erro ao inscrever");
      }
    });
  }

  function cancelar(enrollment_id: string) {
    if (!confirm("Cancelar inscrição deste participante?")) return;
    startTransition(async () => {
      await cancelarInscricaoAction(enrollment_id);
      router.refresh();
    });
  }

  function submitAula(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await criarAulaCursoAction(curso.id, fd);
        setModalAula(false); setErro("");
        router.refresh();
      } catch (err: any) {
        setErro(err.message ?? "Erro ao criar aula");
      }
    });
  }

  const freqMedia = inscritos.length
    ? Math.round(inscritos.reduce((acc, i) => acc + i.frequencia_pct, 0) / inscritos.length)
    : 0;

  return (
    <div style={{ padding: "28px 28px", maxWidth: 960 }}>
      {/* Breadcrumb */}
      <button
        onClick={() => router.push("/dashboard/cursos")}
        style={{ background: "none", border: "none", color: "#4A7DB5", cursor: "pointer", fontWeight: 600, fontSize: 13, padding: 0, marginBottom: 16 }}
      >
        ← Voltar ao catálogo
      </button>

      {/* Header do curso */}
      <div style={{ background: "#fff", border: "1.5px solid #C8D6E5", borderRadius: 14, padding: "22px 24px", marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1C2833", margin: 0 }}>{curso.titulo}</h1>
              <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 99, background: "#eff6ff", color: "#1d4ed8" }}>
                {COURSE_CATEGORIA_LABELS[curso.categoria]}
              </span>
            </div>
            {curso.instrutor_nome && <p style={{ fontSize: 13, color: "#5D6D7E", margin: 0 }}>👤 Instrutor: {curso.instrutor_nome}</p>}
            {curso.descricao && <p style={{ fontSize: 13, color: "#5D6D7E", marginTop: 6 }}>{curso.descricao}</p>}
          </div>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
            background: curso.is_active ? "#dcfce7" : "#f1f5f9",
            color: curso.is_active ? "#166534" : "#475569",
          }}>
            {curso.is_active ? "Ativo" : "Encerrado"}
          </span>
        </div>

        <div style={{ display: "flex", gap: 28, marginTop: 16, flexWrap: "wrap" }}>
          <Info label="Carga horária" value={`${curso.carga_horaria}h`} />
          <Info label="Frequência mínima" value={`${curso.frequencia_minima}%`} />
          <Info label="Vagas" value={curso.vagas ? `${curso.vagas_disponiveis} restantes / ${curso.vagas}` : "Ilimitado"} />
          <Info label="Aulas" value={`${curso.total_aulas}`} />
          <Info label="Inscritos" value={`${curso.total_inscritos}`} />
          <Info label="Concluídos" value={`${curso.total_concluidos}`} />
          <Info label="Freq. média" value={`${freqMedia}%`} />
        </div>
      </div>

      {/* Abas */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "2px solid #e2e8f0", paddingBottom: 0 }}>
        {(["inscritos", "aulas"] as const).map((a) => (
          <button
            key={a} onClick={() => setAba(a)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "10px 20px", fontWeight: 700, fontSize: 13,
              color: aba === a ? "#4A7DB5" : "#64748b",
              borderBottom: aba === a ? "3px solid #4A7DB5" : "3px solid transparent",
              marginBottom: -2,
            }}
          >
            {a === "inscritos" ? `Participantes (${inscritos.length})` : `Aulas (${aulas.length})`}
          </button>
        ))}
      </div>

      {/* ABA: INSCRITOS */}
      {aba === "inscritos" && (
        <div>
          {/* Campo de inscrição */}
          <div style={{ background: "#f8fafc", border: "1.5px dashed #C8D6E5", borderRadius: 10, padding: "16px 18px", marginBottom: 20 }}>
            <p style={{ fontWeight: 700, fontSize: 13, color: "#1C2833", marginBottom: 10 }}>INSCREVER PARTICIPANTE</p>
            <div style={{ display: "flex", gap: 10, position: "relative" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <input
                  value={searchQ}
                  onChange={(e) => buscarMembro(e.target.value)}
                  placeholder="Digite nome do membro..."
                  style={inputStyle}
                  autoComplete="off"
                />
                {searchRes.length > 0 && (
                  <div style={dropdownStyle}>
                    {searchRes.map((r) => (
                      <div key={r.id} onClick={() => selecionar(r)} style={dropItemStyle}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f7ff")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <strong>{r.nome_completo}</strong>
                        {r.matricula && <span style={{ color: "#5D6D7E", marginLeft: 8 }}>#{r.matricula}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={inscrever}
                disabled={!partido || isPending}
                style={btnStyle(partido ? "#4A7DB5" : "#cbd5e1")}
              >
                {isPending ? "..." : "Inscrever"}
              </button>
            </div>
            {partido && (
              <p style={{ fontSize: 11, color: "#16a34a", marginTop: 6 }}>✓ {partido.nome_completo} selecionado</p>
            )}
            {erro && <p style={{ color: "#dc2626", fontSize: 12, marginTop: 6 }}>{erro}</p>}
          </div>

          {inscritos.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#5D6D7E" }}>
              <p style={{ fontWeight: 600 }}>Nenhum participante inscrito</p>
            </div>
          ) : (
            <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Participante", "Matrícula", "Frequência", "Status", "Certificado", ""].map((h) => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inscritos.map((i) => {
                    const colors = COURSE_STATUS_COLORS[i.status];
                    return (
                      <tr key={i.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "#1C2833" }}>{i.party_nome}</td>
                        <td style={{ padding: "10px 14px", fontSize: 12, color: "#5D6D7E" }}>{i.party_matricula || "—"}</td>
                        <td style={{ padding: "10px 14px", fontSize: 12 }}>
                          <span style={{
                            fontWeight: 700,
                            color: i.frequencia_pct >= (curso.frequencia_minima ?? 75) ? "#16a34a" : "#dc2626",
                          }}>
                            {i.presencas}/{i.total_aulas} ({i.frequencia_pct.toFixed(0)}%)
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: colors.bg, color: colors.color }}>
                            {COURSE_STATUS_LABELS[i.status]}
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px", fontSize: 12 }}>
                          {i.certificado_id ? (
                            <a
                              href={`/api/cursos/${curso.id}/certificado/${i.id}`}
                              target="_blank"
                              style={{ color: "#4A7DB5", fontWeight: 600, textDecoration: "none" }}
                            >
                              📄 Ver
                            </a>
                          ) : "—"}
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          {i.status !== "DESISTENCIA" && (
                            <button onClick={() => cancelar(i.id)} style={btnSmall("#dc2626")}>Cancelar</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ABA: AULAS */}
      {aba === "aulas" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <button onClick={() => { setModalAula(true); setErro(""); }} style={btnStyle("#4A7DB5")}>
              + Nova Aula
            </button>
          </div>

          {aulas.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#5D6D7E" }}>
              <p style={{ fontWeight: 600 }}>Nenhuma aula cadastrada</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {aulas.map((a) => (
                <div
                  key={a.id}
                  style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "#1C2833" }}>Aula {a.numero}</span>
                    <span style={{ color: "#5D6D7E", fontSize: 12, marginLeft: 12 }}>
                      {new Date(a.data_aula + "T00:00:00").toLocaleDateString("pt-BR")}
                    </span>
                    {a.conteudo && (
                      <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{a.conteudo}</p>
                    )}
                  </div>
                  <button
                    onClick={() => router.push(`/dashboard/cursos/${curso.id}/aulas/${a.id}`)}
                    style={btnSmall("#4A7DB5")}
                  >
                    Chamada
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Modal nova aula */}
          {modalAula && (
            <div style={overlayStyle}>
              <div style={modalStyle}>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: "#1C2833" }}>Nova Aula</h2>
                <form onSubmit={submitAula} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <label style={labelStyle}>
                    Data da aula *
                    <input name="data_aula" type="date" required style={inputStyle} />
                  </label>
                  <label style={labelStyle}>
                    Conteúdo / Tema
                    <textarea name="conteudo" style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} placeholder="Ex: Introdução à Liderança Bíblica" />
                  </label>
                  {erro && <p style={{ color: "#dc2626", fontSize: 13 }}>{erro}</p>}
                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                    <button type="button" onClick={() => setModalAula(false)} style={btnStyle("#94a3b8")}>Cancelar</button>
                    <button type="submit" disabled={isPending} style={btnStyle("#4A7DB5")}>
                      {isPending ? "Salvando..." : "Criar Aula"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#1C2833" }}>{value}</div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.4)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999,
};
const modalStyle: React.CSSProperties = {
  background: "#fff", borderRadius: 14, padding: "28px 28px 24px",
  width: "100%", maxWidth: 460, boxShadow: "0 8px 40px rgba(0,0,0,.18)",
};
const labelStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 5,
  fontSize: 12, fontWeight: 600, color: "#475569",
};
const inputStyle: React.CSSProperties = {
  border: "1.5px solid #C8D6E5", borderRadius: 8, padding: "9px 12px",
  fontSize: 13, outline: "none", fontFamily: "inherit",
  background: "#fff", color: "#1C2833",
};
const dropdownStyle: React.CSSProperties = {
  position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20,
  background: "#fff", border: "1px solid #C8D6E5", borderRadius: 8,
  boxShadow: "0 4px 16px rgba(0,0,0,.12)", overflow: "hidden",
};
const dropItemStyle: React.CSSProperties = {
  padding: "10px 14px", cursor: "pointer", fontSize: 13,
  borderBottom: "1px solid #f1f5f9",
};
function btnStyle(bg: string): React.CSSProperties {
  return {
    background: bg, color: "#fff", border: "none", borderRadius: 8,
    padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer",
    whiteSpace: "nowrap",
  };
}
function btnSmall(bg: string): React.CSSProperties {
  return {
    background: bg, color: "#fff", border: "none", borderRadius: 6,
    padding: "6px 12px", fontWeight: 600, fontSize: 12, cursor: "pointer",
  };
}
