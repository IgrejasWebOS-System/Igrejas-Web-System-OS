"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { CourseWithStats, CourseCategoria } from "@/types";
import { COURSE_CATEGORIA_LABELS } from "@/types";
import {
  criarCursoAction,
  editarCursoAction,
  toggleCursoAction,
  buscarMembrosParaCursoAction,
} from "./actions";

type Props = { cursos: CourseWithStats[] };

type SearchResult = { id: string; nome_completo: string; matricula: string };

const CATEGORIAS: CourseCategoria[] = [
  "GERAL", "BIBLICO", "DISCIPULADO", "LIDERANCA", "MUSICA", "INFANTIL", "JOVENS", "OUTROS",
];

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

export default function CursosClient({ cursos: init }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [cursos, setCursos] = useState(init);
  const [modal, setModal] = useState<"criar" | "editar" | null>(null);
  const [editando, setEditando] = useState<CourseWithStats | null>(null);
  const [erro, setErro] = useState("");

  // Busca de instrutor
  const [searchQ, setSearchQ]       = useState("");
  const [searchRes, setSearchRes]   = useState<SearchResult[]>([]);
  const [instrutorId, setInstrutorId] = useState("");
  const [instrutorNome, setInstrutorNome] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => { setCursos(init); }, [init]);

  function buscarInstrutor(q: string) {
    setSearchQ(q);
    setInstrutorId("");
    clearTimeout(debounceRef.current);
    if (!q.trim()) { setSearchRes([]); return; }
    debounceRef.current = setTimeout(async () => {
      const res = await buscarMembrosParaCursoAction(q).catch(() => []);
      setSearchRes(res);
    }, 300);
  }
  function selecionarInstrutor(r: SearchResult) {
    setInstrutorId(r.id);
    setInstrutorNome(r.nome_completo);
    setSearchQ(r.nome_completo);
    setSearchRes([]);
  }

  function abrirCriar() {
    setEditando(null); setErro("");
    setInstrutorId(""); setInstrutorNome(""); setSearchQ(""); setSearchRes([]);
    setModal("criar");
  }
  function abrirEditar(c: CourseWithStats) {
    setEditando(c); setErro("");
    setInstrutorId(c.instrutor_party_id ?? "");
    setInstrutorNome(c.instrutor_nome ?? "");
    setSearchQ(c.instrutor_nome ?? ""); setSearchRes([]);
    setModal("editar");
  }
  function fechar() { setModal(null); setEditando(null); setErro(""); }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (instrutorId) fd.set("instrutor_party_id", instrutorId);
    setErro("");
    startTransition(async () => {
      try {
        if (modal === "criar") await criarCursoAction(fd);
        else if (editando) await editarCursoAction(editando.id, fd);
        fechar();
        router.refresh();
      } catch (err: any) {
        setErro(err.message ?? "Erro ao salvar");
      }
    });
  }

  function toggle(c: CourseWithStats) {
    startTransition(async () => {
      await toggleCursoAction(c.id, !c.is_active);
      setCursos((prev) => prev.map((x) => x.id === c.id ? { ...x, is_active: !x.is_active } : x));
    });
  }

  const ativos   = cursos.filter((c) => c.is_active);
  const inativos = cursos.filter((c) => !c.is_active);

  return (
    <div style={{ padding: "32px 28px", maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1C2833", margin: 0 }}>Cursos Livres</h1>
          <p style={{ color: "#5D6D7E", fontSize: 13, marginTop: 4 }}>
            Catálogo de cursos, inscrições, frequência e certificados
          </p>
        </div>
        <button onClick={abrirCriar} style={btnStyle("#4A7DB5")}>+ Novo Curso</button>
      </div>

      {/* Vazio */}
      {cursos.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#5D6D7E" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📚</div>
          <p style={{ fontWeight: 600 }}>Nenhum curso cadastrado</p>
          <p style={{ fontSize: 13 }}>Clique em "+ Novo Curso" para criar o primeiro.</p>
        </div>
      )}

      {ativos.length > 0 && (
        <>
          <h2 style={sectionTitle("#4A7DB5")}>Cursos Ativos</h2>
          <div style={gridStyle}>
            {ativos.map((c) => (
              <CursoCard
                key={c.id} c={c}
                onVer={() => router.push(`/dashboard/cursos/${c.id}`)}
                onEditar={() => abrirEditar(c)}
                onToggle={() => toggle(c)}
              />
            ))}
          </div>
        </>
      )}

      {inativos.length > 0 && (
        <>
          <h2 style={sectionTitle("#94a3b8")}>Encerrados</h2>
          <div style={gridStyle}>
            {inativos.map((c) => (
              <CursoCard
                key={c.id} c={c}
                onVer={() => router.push(`/dashboard/cursos/${c.id}`)}
                onEditar={() => abrirEditar(c)}
                onToggle={() => toggle(c)}
              />
            ))}
          </div>
        </>
      )}

      {/* Modal */}
      {modal && (
        <div style={overlayStyle}>
          <div style={{ ...modalStyle, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: "#1C2833" }}>
              {modal === "criar" ? "Novo Curso" : "Editar Curso"}
            </h2>
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label style={labelStyle}>
                Título *
                <input name="titulo" required defaultValue={editando?.titulo ?? ""} style={inputStyle} placeholder="Ex: Liderança Cristã" />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={labelStyle}>
                  Categoria *
                  <select name="categoria" defaultValue={editando?.categoria ?? "GERAL"} style={inputStyle}>
                    {CATEGORIAS.map((c) => <option key={c} value={c}>{COURSE_CATEGORIA_LABELS[c]}</option>)}
                  </select>
                </label>
                <label style={labelStyle}>
                  Carga horária (h) *
                  <input name="carga_horaria" type="number" min={1} defaultValue={editando?.carga_horaria ?? 20} style={inputStyle} />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={labelStyle}>
                  Data início
                  <input name="data_inicio" type="date" defaultValue={editando?.data_inicio?.slice(0, 10) ?? ""} style={inputStyle} />
                </label>
                <label style={labelStyle}>
                  Data fim
                  <input name="data_fim" type="date" defaultValue={editando?.data_fim?.slice(0, 10) ?? ""} style={inputStyle} />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={labelStyle}>
                  Vagas (vazio = ilimitado)
                  <input name="vagas" type="number" min={1} defaultValue={editando?.vagas ?? ""} style={inputStyle} placeholder="∞" />
                </label>
                <label style={labelStyle}>
                  Frequência mínima (%)
                  <input name="frequencia_minima" type="number" min={1} max={100} step={0.01} defaultValue={editando?.frequencia_minima ?? 75} style={inputStyle} />
                </label>
              </div>

              <label style={labelStyle}>
                Público alvo
                <input name="publico_alvo" defaultValue={editando?.publico_alvo ?? ""} style={inputStyle} placeholder="Ex: Membros e pré-membros" />
              </label>

              {/* Busca de instrutor */}
              <label style={labelStyle}>
                Instrutor
                <div style={{ position: "relative" }}>
                  <input
                    value={searchQ}
                    onChange={(e) => buscarInstrutor(e.target.value)}
                    style={inputStyle}
                    placeholder="Digite para buscar membro..."
                    autoComplete="off"
                  />
                  {searchRes.length > 0 && (
                    <div style={{
                      position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20,
                      background: "#fff", border: "1px solid #C8D6E5", borderRadius: 8,
                      boxShadow: "0 4px 16px rgba(0,0,0,.12)", overflow: "hidden",
                    }}>
                      {searchRes.map((r) => (
                        <div
                          key={r.id}
                          onClick={() => selecionarInstrutor(r)}
                          style={{
                            padding: "10px 14px", cursor: "pointer", fontSize: 13,
                            borderBottom: "1px solid #f1f5f9",
                          }}
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
                {instrutorNome && (
                  <p style={{ fontSize: 11, color: "#16a34a", marginTop: 4 }}>
                    ✓ {instrutorNome} selecionado
                  </p>
                )}
              </label>

              <label style={labelStyle}>
                Descrição
                <textarea name="descricao" defaultValue={editando?.descricao ?? ""} style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} placeholder="Detalhes sobre o curso..." />
              </label>

              {erro && <p style={{ color: "#dc2626", fontSize: 13 }}>{erro}</p>}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                <button type="button" onClick={fechar} style={btnStyle("#94a3b8")}>Cancelar</button>
                <button type="submit" disabled={isPending} style={btnStyle("#4A7DB5")}>
                  {isPending ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CursoCard({ c, onVer, onEditar, onToggle }: {
  c: CourseWithStats; onVer: () => void; onEditar: () => void; onToggle: () => void;
}) {
  const vagasMsg = c.vagas === null
    ? "Ilimitado"
    : `${c.vagas_disponiveis ?? 0} / ${c.vagas} vagas`;

  return (
    <div style={{
      background: "#fff",
      border: `1.5px solid ${c.is_active ? "#C8D6E5" : "#e2e8f0"}`,
      borderRadius: 12, padding: "18px 20px",
      opacity: c.is_active ? 1 : 0.7,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: "#1C2833" }}>{c.titulo}</span>
          <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: "#eff6ff", color: "#1d4ed8" }}>
            {COURSE_CATEGORIA_LABELS[c.categoria]}
          </span>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
          background: c.is_active ? "#dcfce7" : "#f1f5f9",
          color: c.is_active ? "#166534" : "#475569",
        }}>
          {c.is_active ? "Ativo" : "Encerrado"}
        </span>
      </div>

      {c.instrutor_nome && (
        <p style={{ fontSize: 12, color: "#5D6D7E", marginBottom: 4 }}>👤 {c.instrutor_nome}</p>
      )}
      <p style={{ fontSize: 12, color: "#5D6D7E", marginBottom: 10 }}>
        {c.carga_horaria}h • {vagasMsg}
        {c.data_inicio && ` • ${new Date(c.data_inicio + "T00:00:00").toLocaleDateString("pt-BR")}`}
      </p>

      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <Stat label="Inscritos"  value={c.total_inscritos} />
        <Stat label="Concluídos" value={c.total_concluidos} />
        <Stat label="Aulas"      value={c.total_aulas} />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onVer} style={{ ...btnSmall("#4A7DB5"), flex: 1 }}>Gerenciar</button>
        <button onClick={onEditar} style={btnSmall("#64748b")}>Editar</button>
        <button onClick={onToggle} style={btnSmall(c.is_active ? "#dc2626" : "#16a34a")}>
          {c.is_active ? "Encerrar" : "Reativar"}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 800, color: "#1C2833" }}>{value}</div>
      <div style={{ fontSize: 11, color: "#5D6D7E" }}>{label}</div>
    </div>
  );
}

const gridStyle: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
  gap: 16, marginBottom: 32,
};
function sectionTitle(color: string): React.CSSProperties {
  return { fontSize: 13, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 };
}
const overlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.4)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999,
};
const modalStyle: React.CSSProperties = {
  background: "#fff", borderRadius: 14, padding: "28px 28px 24px",
  width: "100%", maxWidth: 520, boxShadow: "0 8px 40px rgba(0,0,0,.18)",
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
function btnStyle(bg: string): React.CSSProperties {
  return {
    background: bg, color: "#fff", border: "none", borderRadius: 8,
    padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer",
  };
}
function btnSmall(bg: string): React.CSSProperties {
  return {
    background: bg, color: "#fff", border: "none", borderRadius: 6,
    padding: "6px 12px", fontWeight: 600, fontSize: 12, cursor: "pointer",
  };
}
