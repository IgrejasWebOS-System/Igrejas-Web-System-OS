"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SchoolSemesterWithStats } from "@/types";
import {
  criarSemestreAction,
  editarSemestreAction,
  toggleSemestreAction,
} from "./actions";

type Props = { semestres: SchoolSemesterWithStats[] };

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

export default function EscolaClient({ semestres: inicial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [semestres, setSemestres] = useState(inicial);
  const [modal, setModal] = useState<"criar" | "editar" | null>(null);
  const [editando, setEditando] = useState<SchoolSemesterWithStats | null>(null);
  const [erro, setErro] = useState("");

  function abrirCriar() {
    setEditando(null);
    setErro("");
    setModal("criar");
  }
  function abrirEditar(s: SchoolSemesterWithStats) {
    setEditando(s);
    setErro("");
    setModal("editar");
  }
  function fechar() { setModal(null); setEditando(null); setErro(""); }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErro("");
    startTransition(async () => {
      try {
        if (modal === "criar") {
          await criarSemestreAction(fd);
        } else if (editando) {
          await editarSemestreAction(editando.id, fd);
        }
        fechar();
        router.refresh();
      } catch (err: any) {
        setErro(err.message ?? "Erro ao salvar");
      }
    });
  }

  function toggle(s: SchoolSemesterWithStats) {
    startTransition(async () => {
      await toggleSemestreAction(s.id, !s.is_active);
      setSemestres((prev) =>
        prev.map((x) => x.id === s.id ? { ...x, is_active: !x.is_active } : x)
      );
    });
  }

  const ativos   = semestres.filter((s) => s.is_active);
  const inativos = semestres.filter((s) => !s.is_active);

  return (
    <div style={{ padding: "32px 28px", maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1C2833", margin: 0 }}>
            Escola Teológica
          </h1>
          <p style={{ color: "#5D6D7E", fontSize: 13, marginTop: 4 }}>
            Semestres, disciplinas, matrículas e notas
          </p>
        </div>
        <button onClick={abrirCriar} style={btnStyle("#4A7DB5")}>
          + Novo Semestre
        </button>
      </div>

      {/* Semestres ativos */}
      {ativos.length === 0 && inativos.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#5D6D7E" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎓</div>
          <p style={{ fontWeight: 600 }}>Nenhum semestre cadastrado</p>
          <p style={{ fontSize: 13 }}>Clique em "+ Novo Semestre" para começar.</p>
        </div>
      )}

      {ativos.length > 0 && (
        <>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: "#4A7DB5", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
            Semestres Ativos
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginBottom: 32 }}>
            {ativos.map((s) => <SemestreCard key={s.id} s={s} onVer={() => router.push(`/dashboard/escola/${s.id}`)} onEditar={() => abrirEditar(s)} onToggle={() => toggle(s)} />)}
          </div>
        </>
      )}

      {inativos.length > 0 && (
        <>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
            Encerrados
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {inativos.map((s) => <SemestreCard key={s.id} s={s} onVer={() => router.push(`/dashboard/escola/${s.id}`)} onEditar={() => abrirEditar(s)} onToggle={() => toggle(s)} />)}
          </div>
        </>
      )}

      {/* Modal */}
      {modal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: "#1C2833" }}>
              {modal === "criar" ? "Novo Semestre" : "Editar Semestre"}
            </h2>
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label style={labelStyle}>
                Nome do semestre *
                <input name="nome" required defaultValue={editando?.nome ?? ""} style={inputStyle} placeholder="Ex: 1º Semestre 2026" />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={labelStyle}>
                  Data início *
                  <input name="data_inicio" type="date" required defaultValue={editando?.data_inicio?.slice(0, 10) ?? ""} style={inputStyle} />
                </label>
                <label style={labelStyle}>
                  Data fim *
                  <input name="data_fim" type="date" required defaultValue={editando?.data_fim?.slice(0, 10) ?? ""} style={inputStyle} />
                </label>
              </div>
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

function SemestreCard({ s, onVer, onEditar, onToggle }: {
  s: SchoolSemesterWithStats;
  onVer: () => void;
  onEditar: () => void;
  onToggle: () => void;
}) {
  return (
    <div style={{
      background: "#fff",
      border: `1.5px solid ${s.is_active ? "#C8D6E5" : "#e2e8f0"}`,
      borderRadius: 12,
      padding: "18px 20px",
      opacity: s.is_active ? 1 : 0.7,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: "#1C2833" }}>{s.nome}</span>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
          background: s.is_active ? "#dcfce7" : "#f1f5f9",
          color: s.is_active ? "#166534" : "#475569",
        }}>
          {s.is_active ? "Ativo" : "Encerrado"}
        </span>
      </div>
      <p style={{ fontSize: 12, color: "#5D6D7E", marginBottom: 12 }}>
        {new Date(s.data_inicio + "T00:00:00").toLocaleDateString("pt-BR")} → {new Date(s.data_fim + "T00:00:00").toLocaleDateString("pt-BR")}
      </p>
      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <Stat label="Disciplinas" value={s.total_disciplinas} />
        <Stat label="Alunos" value={s.total_alunos} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onVer} style={{ ...btnSmall("#4A7DB5"), flex: 1 }}>Ver disciplinas</button>
        <button onClick={onEditar} style={btnSmall("#64748b")}>Editar</button>
        <button onClick={onToggle} style={btnSmall(s.is_active ? "#dc2626" : "#16a34a")}>
          {s.is_active ? "Encerrar" : "Reativar"}
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

const overlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.4)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999,
};
const modalStyle: React.CSSProperties = {
  background: "#fff", borderRadius: 16, padding: "28px 28px 24px",
  width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,.2)",
};
const labelStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 5,
  fontSize: 13, fontWeight: 600, color: "#374151",
};
const inputStyle: React.CSSProperties = {
  border: "1.5px solid #C8D6E5", borderRadius: 8, padding: "9px 12px",
  fontSize: 14, outline: "none", fontFamily: "inherit",
};
function btnStyle(bg: string): React.CSSProperties {
  return {
    background: bg, color: "#fff", border: "none", borderRadius: 8,
    padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
  };
}
function btnSmall(bg: string): React.CSSProperties {
  return {
    background: bg, color: "#fff", border: "none", borderRadius: 6,
    padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
  };
}
