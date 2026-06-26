"use client";

import { useState, useTransition } from "react";
import type { Occurrence, OccurrenceTipo, OccurrenceStatus } from "@/types";
import {
  OCCURRENCE_TIPO_LABELS, OCCURRENCE_TIPO_ICON, OCCURRENCE_TIPO_COLOR,
  OCCURRENCE_STATUS_LABELS, OCCURRENCE_STATUS_COLOR,
} from "@/types";
import { criarOcorrenciaAction } from "./actions";

const TIPOS  = Object.keys(OCCURRENCE_TIPO_LABELS) as OccurrenceTipo[];
const STATUS = Object.keys(OCCURRENCE_STATUS_LABELS) as OccurrenceStatus[];

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: "1px solid var(--color-border)", fontSize: 13,
  background: "var(--color-bg)", color: "var(--color-text-primary)",
  boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 5,
  fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)",
};

export default function OcorrenciasClient({ ocorrencias: initial }: { ocorrencias: Occurrence[] }) {
  const [ocorrencias, setOcorrencias] = useState(initial);
  const [filtroStatus, setFiltroStatus]   = useState<OccurrenceStatus | "">("");
  const [filtroTipo, setFiltroTipo]       = useState<OccurrenceTipo | "">("");
  const [busca, setBusca]                 = useState("");
  const [showModal, setShowModal]         = useState(false);
  const [erro, setErro]                   = useState("");
  const [isPending, startTransition]      = useTransition();

  const filtered = ocorrencias.filter(o => {
    if (filtroStatus && o.status !== filtroStatus) return false;
    if (filtroTipo   && o.tipo   !== filtroTipo)   return false;
    if (busca && !o.titulo.toLowerCase().includes(busca.toLowerCase()) &&
        !(o.party_nome ?? "").toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  const abertas   = filtered.filter(o => o.status === "ABERTA");
  const acomp     = filtered.filter(o => o.status === "EM_ACOMPANHAMENTO");
  const fechadas  = filtered.filter(o => o.status === "RESOLVIDA" || o.status === "ARQUIVADA");

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const id = await criarOcorrenciaAction(fd);
        window.location.href = `/dashboard/ocorrencias/${id}`;
      } catch (err: unknown) { setErro((err as Error).message); }
    });
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>⚠️ Ocorrências</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>
            Registro pastoral sigiloso · {ocorrencias.length} ocorrência{ocorrencias.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={() => setShowModal(true)} style={{
          background: "var(--color-primary)", color: "#fff",
          border: "none", borderRadius: 8, padding: "10px 18px",
          fontWeight: 700, fontSize: 13, cursor: "pointer",
        }}>
          + Nova Ocorrência
        </button>
      </div>

      {/* Alerta de sigilo */}
      <div style={{
        background: "#fef9c3", border: "1px solid #fde047", borderRadius: 10,
        padding: "10px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10, fontSize: 13,
      }}>
        <span style={{ fontSize: 18 }}>🔒</span>
        <span><strong>Confidencial:</strong> As informações desta seção são restritas e não devem ser compartilhadas sem autorização do liderança responsável.</span>
      </div>

      {/* Filtros */}
      <div style={{
        display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24,
        background: "var(--color-surface)", padding: "14px 16px",
        borderRadius: 10, border: "1px solid var(--color-border)",
      }}>
        <input value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por título ou membro..."
          style={{ ...inputStyle, maxWidth: 280 }} />
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as OccurrenceStatus | "")}
          style={{ ...inputStyle, maxWidth: 180 }}>
          <option value="">Todos os status</option>
          {STATUS.map(s => <option key={s} value={s}>{OCCURRENCE_STATUS_LABELS[s]}</option>)}
        </select>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value as OccurrenceTipo | "")}
          style={{ ...inputStyle, maxWidth: 170 }}>
          <option value="">Todos os tipos</option>
          {TIPOS.map(t => <option key={t} value={t}>{OCCURRENCE_TIPO_ICON[t]} {OCCURRENCE_TIPO_LABELS[t]}</option>)}
        </select>
      </div>

      {/* Listas */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--color-text-muted)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <p>Nenhuma ocorrência encontrada.</p>
        </div>
      ) : (
        <>
          {[
            { label: "🔴 Abertas", list: abertas },
            { label: "🟡 Em Acompanhamento", list: acomp },
            { label: "✅ Resolvidas / Arquivadas", list: fechadas },
          ].map(({ label, list }) => list.length > 0 && (
            <div key={label} style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {label} ({list.length})
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {list.map(o => <OcorrenciaRow key={o.id} o={o} />)}
              </div>
            </div>
          ))}
        </>
      )}

      {/* Modal Nova Ocorrência */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={() => setShowModal(false)}>
          <div style={{ background: "var(--color-surface)", borderRadius: 14, padding: 28, width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,.18)" }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 20px", fontSize: 17, fontWeight: 800 }}>Nova Ocorrência</h2>
            {erro && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#dc2626", fontSize: 13 }}>
                {erro}
              </div>
            )}
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label style={labelStyle}>
                Título *
                <input name="titulo" required style={inputStyle} placeholder="Descrição breve da ocorrência" />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={labelStyle}>
                  Tipo *
                  <select name="tipo" required defaultValue="PASTORAL" style={inputStyle}>
                    {TIPOS.map(t => <option key={t} value={t}>{OCCURRENCE_TIPO_ICON[t]} {OCCURRENCE_TIPO_LABELS[t]}</option>)}
                  </select>
                </label>
                <label style={labelStyle}>
                  Data da ocorrência *
                  <input name="data_ocorrencia" type="date" required
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    style={inputStyle} />
                </label>
              </div>
              <label style={labelStyle}>
                Descrição
                <textarea name="descricao" rows={4} style={{ ...inputStyle, resize: "vertical" }}
                  placeholder="Descreva os detalhes da ocorrência..." />
              </label>
              <label style={labelStyle}>
                Nível de Sigilo
                <select name="nivel_sigilo" defaultValue="RESTRITO" style={inputStyle}>
                  <option value="RESTRITO">🔒 Restrito (apenas N0/N1/N2)</option>
                  <option value="NORMAL">👁 Normal (N3 em diante)</option>
                </select>
              </label>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                <button type="button" onClick={() => setShowModal(false)}
                  style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", cursor: "pointer", fontSize: 13 }}>
                  Cancelar
                </button>
                <button type="submit" disabled={isPending}
                  style={{ padding: "9px 18px", borderRadius: 8, background: "var(--color-primary)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                  {isPending ? "Criando..." : "Criar Ocorrência"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function OcorrenciaRow({ o }: { o: Occurrence }) {
  const tc = OCCURRENCE_TIPO_COLOR[o.tipo];
  const sc = OCCURRENCE_STATUS_COLOR[o.status];
  return (
    <a href={`/dashboard/ocorrencias/${o.id}`} style={{ textDecoration: "none" }}>
      <div style={{
        background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: 10, padding: "14px 18px",
        display: "flex", alignItems: "center", gap: 16,
        borderLeft: `4px solid ${tc}`,
        transition: "box-shadow .15s",
      }}
        onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,.1)")}
        onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
      >
        {/* Ícone tipo */}
        <div style={{ fontSize: 22, flexShrink: 0 }}>{OCCURRENCE_TIPO_ICON[o.tipo]}</div>

        {/* Info principal */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: "var(--color-text-primary)" }}>{o.titulo}</span>
            {o.nivel_sigilo === "RESTRITO" && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 20, background: "#fef9c3", color: "#92400e" }}>🔒 RESTRITO</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", display: "flex", gap: 14, flexWrap: "wrap" }}>
            {o.party_nome && <span>👤 {o.party_nome}</span>}
            <span>📅 {new Date(o.data_ocorrencia).toLocaleDateString("pt-BR")}</span>
            {o.responsavel_nome && <span>🙏 {o.responsavel_nome}</span>}
          </div>
        </div>

        {/* Status */}
        <span style={{
          flexShrink: 0, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20,
          background: sc + "18", color: sc,
        }}>
          {OCCURRENCE_STATUS_LABELS[o.status]}
        </span>
        <span style={{ color: "var(--color-text-muted)", fontSize: 16 }}>›</span>
      </div>
    </a>
  );
}
