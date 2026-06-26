"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SchoolSemester, SchoolDisciplineWithStats } from "@/types";
import { criarDisciplinaAction, editarDisciplinaAction } from "../actions";

type Props = {
  semestre: SchoolSemester;
  disciplinas: SchoolDisciplineWithStats[];
};

export default function SemestreDetail({ semestre, disciplinas: inicial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modal, setModal] = useState<"criar" | "editar" | null>(null);
  const [editando, setEditando] = useState<SchoolDisciplineWithStats | null>(null);
  const [erro, setErro] = useState("");

  function fechar() { setModal(null); setEditando(null); setErro(""); }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErro("");
    startTransition(async () => {
      try {
        if (modal === "criar") {
          await criarDisciplinaAction(semestre.id, fd);
        } else if (editando) {
          await editarDisciplinaAction(editando.id, fd);
        }
        fechar();
        router.refresh();
      } catch (err: any) {
        setErro(err.message ?? "Erro ao salvar");
      }
    });
  }

  return (
    <div style={{ padding: "32px 28px", maxWidth: 960 }}>
      {/* Breadcrumb */}
      <button onClick={() => router.push("/dashboard/escola")}
        style={{ background: "none", border: "none", color: "#4A7DB5", fontWeight: 600, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 16 }}>
        ← Escola Teológica
      </button>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1C2833", margin: 0 }}>{semestre.nome}</h1>
          <p style={{ color: "#5D6D7E", fontSize: 13, marginTop: 4 }}>
            {new Date(semestre.data_inicio + "T00:00:00").toLocaleDateString("pt-BR")} →{" "}
            {new Date(semestre.data_fim + "T00:00:00").toLocaleDateString("pt-BR")}
            &nbsp;·&nbsp;
            <span style={{ color: semestre.is_active ? "#16a34a" : "#94a3b8", fontWeight: 600 }}>
              {semestre.is_active ? "Ativo" : "Encerrado"}
            </span>
          </p>
        </div>
        <button onClick={() => { setEditando(null); setModal("criar"); }}
          style={btnStyle("#4A7DB5")}>
          + Nova Disciplina
        </button>
      </div>

      {/* Grid de disciplinas */}
      {inicial.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#5D6D7E" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📚</div>
          <p style={{ fontWeight: 600 }}>Nenhuma disciplina neste semestre</p>
          <p style={{ fontSize: 13 }}>Clique em "+ Nova Disciplina" para adicionar.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 16 }}>
          {inicial.map((d) => (
            <div key={d.id} style={{ background: "#fff", border: "1.5px solid #C8D6E5", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: "#1C2833", lineHeight: 1.3 }}>{d.nome}</span>
                <span style={{ fontSize: 11, background: "#EBF2F8", color: "#4A7DB5", fontWeight: 600, padding: "2px 8px", borderRadius: 99, whiteSpace: "nowrap" }}>
                  {d.carga_horaria}h
                </span>
              </div>
              {d.professor_nome && (
                <p style={{ fontSize: 12, color: "#5D6D7E", marginBottom: 4 }}>
                  👨‍🏫 {d.professor_nome}
                </p>
              )}
              <p style={{ fontSize: 12, color: "#5D6D7E", marginBottom: 12 }}>
                Mín. nota: {d.nota_minima} &nbsp;·&nbsp; Freq. mín.: {d.frequencia_minima}%
              </p>
              <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
                <Stat label="Alunos" value={d.total_alunos} />
                <Stat label="Aulas" value={d.total_aulas} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => router.push(`/dashboard/escola/${semestre.id}/disciplinas/${d.id}`)}
                  style={{ ...btnSmall("#4A7DB5"), flex: 1 }}>
                  Abrir
                </button>
                <button onClick={() => { setEditando(d); setModal("editar"); }}
                  style={btnSmall("#64748b")}>
                  Editar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal disciplina */}
      {modal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: "#1C2833" }}>
              {modal === "criar" ? "Nova Disciplina" : "Editar Disciplina"}
            </h2>
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              <label style={labelStyle}>
                Nome *
                <input name="nome" required defaultValue={editando?.nome ?? ""} style={inputStyle} placeholder="Ex: Hermenêutica Bíblica" />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={labelStyle}>
                  Carga horária (h)
                  <input name="carga_horaria" type="number" min={1} defaultValue={editando?.carga_horaria ?? 40} style={inputStyle} />
                </label>
                <label style={labelStyle}>
                  Nota mínima
                  <input name="nota_minima" type="number" step="0.1" min={0} max={10} defaultValue={editando?.nota_minima ?? 6} style={inputStyle} />
                </label>
              </div>
              <label style={labelStyle}>
                Frequência mínima (%)
                <input name="frequencia_minima" type="number" step="0.1" min={0} max={100} defaultValue={editando?.frequencia_minima ?? 75} style={inputStyle} />
              </label>
              <label style={labelStyle}>
                ID do professor (party_id — opcional)
                <input name="professor_party_id" defaultValue={editando?.professor_party_id ?? ""} style={inputStyle} placeholder="UUID do membro professor" />
              </label>
              {erro && <p style={{ color: "#dc2626", fontSize: 13 }}>{erro}</p>}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, color: "#1C2833" }}>{value}</div>
      <div style={{ fontSize: 11, color: "#5D6D7E" }}>{label}</div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.4)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999,
};
const modalStyle: React.CSSProperties = {
  background: "#fff", borderRadius: 16, padding: "28px 28px 24px",
  width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,.2)",
};
const labelStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 5, fontSize: 13, fontWeight: 600, color: "#374151",
};
const inputStyle: React.CSSProperties = {
  border: "1.5px solid #C8D6E5", borderRadius: 8, padding: "9px 12px",
  fontSize: 14, outline: "none", fontFamily: "inherit",
};
function btnStyle(bg: string): React.CSSProperties {
  return { background: bg, color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" };
}
function btnSmall(bg: string): React.CSSProperties {
  return { background: bg, color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" };
}
