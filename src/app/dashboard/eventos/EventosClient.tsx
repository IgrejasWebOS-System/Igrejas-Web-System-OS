"use client";

import { useState, useTransition } from "react";
import type { EventItem, EventTipo, EventStatus } from "@/types";
import {
  EVENT_TIPO_LABELS, EVENT_TIPO_ICON,
  EVENT_STATUS_LABELS, EVENT_STATUS_COLOR,
} from "@/types";
import { criarEventoAction, mudarStatusEventoAction, excluirEventoAction } from "./actions";

const TIPOS = Object.keys(EVENT_TIPO_LABELS) as EventTipo[];
const STATUSES = Object.keys(EVENT_STATUS_LABELS) as EventStatus[];

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

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export default function EventosClient({ eventos: initial }: { eventos: EventItem[] }) {
  const [eventos, setEventos] = useState<EventItem[]>(initial);
  const [filtroStatus, setFiltroStatus] = useState<EventStatus | "">("");
  const [filtroTipo, setFiltroTipo] = useState<EventTipo | "">("");
  const [busca, setBusca] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState("");

  const filtered = eventos.filter(e => {
    if (filtroStatus && e.status !== filtroStatus) return false;
    if (filtroTipo && e.tipo !== filtroTipo) return false;
    if (busca && !e.titulo.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  // Agrupar por status para exibição visual
  const publicados  = filtered.filter(e => e.status === "PUBLICADO");
  const rascunhos   = filtered.filter(e => e.status === "RASCUNHO");
  const encerrados  = filtered.filter(e => e.status === "ENCERRADO" || e.status === "CANCELADO");

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const { id } = await criarEventoAction(fd);
        window.location.href = `/dashboard/eventos/${id}`;
      } catch (err: unknown) {
        setErro((err as Error).message);
      }
    });
  }

  async function handleMudarStatus(id: string, status: EventStatus) {
    startTransition(async () => {
      await mudarStatusEventoAction(id, status);
      setEventos(prev => prev.map(e => e.id === id ? { ...e, status } : e));
    });
  }

  async function handleExcluir(id: string) {
    if (!confirm("Excluir este evento permanentemente?")) return;
    startTransition(async () => {
      await excluirEventoAction(id);
      setEventos(prev => prev.filter(e => e.id !== id));
    });
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: 0 }}>
            📅 Eventos
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>
            {eventos.length} evento{eventos.length !== 1 ? "s" : ""} cadastrado{eventos.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            background: "var(--color-primary)", color: "#fff",
            border: "none", borderRadius: 8, padding: "10px 18px",
            fontWeight: 700, fontSize: 13, cursor: "pointer",
          }}
        >
          + Novo Evento
        </button>
      </div>

      {/* Filtros */}
      <div style={{
        display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24,
        background: "var(--color-surface)", padding: "14px 16px",
        borderRadius: 10, border: "1px solid var(--color-border)",
      }}>
        <input
          value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar evento..."
          style={{ ...inputStyle, maxWidth: 260 }}
        />
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as EventStatus | "")}
          style={{ ...inputStyle, maxWidth: 160 }}>
          <option value="">Todos os status</option>
          {STATUSES.map(s => <option key={s} value={s}>{EVENT_STATUS_LABELS[s]}</option>)}
        </select>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value as EventTipo | "")}
          style={{ ...inputStyle, maxWidth: 180 }}>
          <option value="">Todos os tipos</option>
          {TIPOS.map(t => <option key={t} value={t}>{EVENT_TIPO_ICON[t]} {EVENT_TIPO_LABELS[t]}</option>)}
        </select>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--color-text-muted)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
          <p>Nenhum evento encontrado.</p>
          <p style={{ fontSize: 12 }}>Crie o primeiro evento clicando em "+ Novo Evento".</p>
        </div>
      ) : (
        <>
          {[
            { label: "🟢 Publicados", list: publicados },
            { label: "📝 Rascunhos", list: rascunhos },
            { label: "🔒 Encerrados / Cancelados", list: encerrados },
          ].map(({ label, list }) => list.length > 0 && (
            <div key={label} style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {label} ({list.length})
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
                {list.map(ev => <EventCard key={ev.id} ev={ev} onStatus={handleMudarStatus} onExcluir={handleExcluir} />)}
              </div>
            </div>
          ))}
        </>
      )}

      {/* Modal novo evento */}
      {showModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }} onClick={() => setShowModal(false)}>
          <div style={{
            background: "var(--color-surface)", borderRadius: 14, padding: 28,
            width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto",
            boxShadow: "0 8px 40px rgba(0,0,0,.18)",
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 20px", fontSize: 17, fontWeight: 800 }}>Novo Evento</h2>
            {erro && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#dc2626", fontSize: 13 }}>
                {erro}
              </div>
            )}
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label style={labelStyle}>
                Título *
                <input name="titulo" required style={inputStyle} placeholder="Ex: Culto de Aniversário" />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={labelStyle}>
                  Tipo *
                  <select name="tipo" required defaultValue="CULTO" style={inputStyle}>
                    {TIPOS.map(t => <option key={t} value={t}>{EVENT_TIPO_ICON[t]} {EVENT_TIPO_LABELS[t]}</option>)}
                  </select>
                </label>
                <label style={labelStyle}>
                  Status inicial
                  <select name="status" defaultValue="RASCUNHO" style={inputStyle}>
                    <option value="RASCUNHO">Rascunho</option>
                    <option value="PUBLICADO">Publicado</option>
                  </select>
                </label>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={labelStyle}>
                  Data/hora início *
                  <input name="data_inicio" type="datetime-local" required style={inputStyle} />
                </label>
                <label style={labelStyle}>
                  Data/hora fim
                  <input name="data_fim" type="datetime-local" style={inputStyle} />
                </label>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={labelStyle}>
                  Local
                  <input name="local_nome" style={inputStyle} placeholder="Nome do local" />
                </label>
                <label style={labelStyle}>
                  Capacidade (vagas)
                  <input name="capacidade" type="number" min={1} style={inputStyle} placeholder="Deixe em branco = ilimitado" />
                </label>
              </div>
              <label style={labelStyle}>
                Endereço
                <input name="local_endereco" style={inputStyle} placeholder="Endereço completo" />
              </label>
              <label style={labelStyle}>
                Descrição
                <textarea name="descricao" rows={3} style={{ ...inputStyle, resize: "vertical" }} placeholder="Detalhes do evento..." />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ ...labelStyle, flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <input type="hidden" name="inscricao_aberta" value="false" />
                  <input type="checkbox" name="inscricao_aberta" value="true" defaultChecked
                    onChange={e => {
                      const hidden = e.currentTarget.form?.elements.namedItem("inscricao_aberta") as HTMLInputElement;
                      if (hidden) hidden.value = e.currentTarget.checked ? "true" : "false";
                    }}
                  />
                  Inscrições abertas
                </label>
                <label style={{ ...labelStyle, flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <input type="hidden" name="inscricao_requer_aprovacao" value="false" />
                  <input type="checkbox" name="inscricao_requer_aprovacao" value="true"
                    onChange={e => {
                      const hidden = e.currentTarget.form?.elements.namedItem("inscricao_requer_aprovacao") as HTMLInputElement;
                      if (hidden) hidden.value = e.currentTarget.checked ? "true" : "false";
                    }}
                  />
                  Requer aprovação
                </label>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                <button type="button" onClick={() => setShowModal(false)}
                  style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", cursor: "pointer", fontSize: 13 }}>
                  Cancelar
                </button>
                <button type="submit" disabled={isPending}
                  style={{ padding: "9px 18px", borderRadius: 8, background: "var(--color-primary)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                  {isPending ? "Criando..." : "Criar Evento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Card de evento ────────────────────────────────────────────
function EventCard({
  ev,
  onStatus,
  onExcluir,
}: {
  ev: EventItem;
  onStatus: (id: string, s: EventStatus) => void;
  onExcluir: (id: string) => void;
}) {
  const pct = ev.capacidade && ev.inscritos_count != null
    ? Math.min(100, Math.round((ev.inscritos_count / ev.capacidade) * 100))
    : null;

  const statusColor = EVENT_STATUS_COLOR[ev.status];

  return (
    <div style={{
      background: "var(--color-surface)", border: "1px solid var(--color-border)",
      borderRadius: 12, overflow: "hidden",
      boxShadow: "0 1px 4px rgba(44,82,130,.06)",
      transition: "box-shadow .15s",
    }}>
      {/* Topo colorido com tipo */}
      <div style={{
        padding: "14px 16px 10px",
        borderBottom: "1px solid var(--color-border)",
        display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8,
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 18 }}>{EVENT_TIPO_ICON[ev.tipo]}</span>
            <span style={{
              fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
              color: "var(--color-text-muted)",
            }}>{EVENT_TIPO_LABELS[ev.tipo]}</span>
          </div>
          <a href={`/dashboard/eventos/${ev.id}`} style={{
            fontWeight: 700, fontSize: 14, color: "var(--color-text-primary)",
            textDecoration: "none", lineHeight: 1.3,
          }}>
            {ev.titulo}
          </a>
        </div>
        <span style={{
          flexShrink: 0, fontSize: 11, fontWeight: 700, padding: "3px 8px",
          borderRadius: 20, background: statusColor + "18", color: statusColor,
        }}>
          {EVENT_STATUS_LABELS[ev.status]}
        </span>
      </div>

      {/* Corpo */}
      <div style={{ padding: "12px 16px" }}>
        <div style={{ fontSize: 12, color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 5 }}>
          <span>📆 {new Date(ev.data_inicio).toLocaleString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
          {ev.local_nome && <span>📍 {ev.local_nome}</span>}
          {ev.responsavel_nome && <span>👤 {ev.responsavel_nome}</span>}
        </div>

        {/* Barra de vagas */}
        {ev.capacidade && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--color-text-muted)", marginBottom: 4 }}>
              <span>{ev.inscritos_count ?? 0} inscrito{(ev.inscritos_count ?? 0) !== 1 ? "s" : ""}</span>
              <span>{ev.capacidade} vagas</span>
            </div>
            <div style={{ height: 6, background: "var(--color-border)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 99,
                width: `${pct ?? 0}%`,
                background: (pct ?? 0) >= 90 ? "#dc2626" : (pct ?? 0) >= 70 ? "#d97706" : "#16a34a",
                transition: "width .3s",
              }} />
            </div>
          </div>
        )}

        {/* Check-in count */}
        {ev.checkins_count != null && ev.checkins_count > 0 && (
          <div style={{ marginTop: 8, fontSize: 11, color: "var(--color-text-muted)" }}>
            ✅ {ev.checkins_count} check-in{ev.checkins_count !== 1 ? "s" : ""} registrado{ev.checkins_count !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Ações */}
      <div style={{
        borderTop: "1px solid var(--color-border)", padding: "10px 16px",
        display: "flex", gap: 8, flexWrap: "wrap",
      }}>
        <a href={`/dashboard/eventos/${ev.id}`}
          style={{ fontSize: 12, fontWeight: 600, color: "var(--color-primary)", textDecoration: "none" }}>
          Ver detalhes →
        </a>
        <span style={{ color: "var(--color-border)" }}>|</span>
        {ev.status === "RASCUNHO" && (
          <button onClick={() => onStatus(ev.id, "PUBLICADO")}
            style={{ fontSize: 12, fontWeight: 600, color: "#16a34a", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            Publicar
          </button>
        )}
        {ev.status === "PUBLICADO" && (
          <button onClick={() => onStatus(ev.id, "ENCERRADO")}
            style={{ fontSize: 12, fontWeight: 600, color: "#2563eb", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            Encerrar
          </button>
        )}
        {["RASCUNHO", "CANCELADO"].includes(ev.status) && (
          <button onClick={() => onExcluir(ev.id)}
            style={{ fontSize: 12, fontWeight: 600, color: "#dc2626", background: "none", border: "none", cursor: "pointer", padding: 0, marginLeft: "auto" }}>
            Excluir
          </button>
        )}
      </div>
    </div>
  );
}
