"use client";

import { useState, useTransition } from "react";
import type {
  EventItem, EventRegistration, EventCheckin,
  EventStatus, EventRegistrationStatus,
} from "@/types";
import {
  EVENT_TIPO_LABELS, EVENT_TIPO_ICON,
  EVENT_STATUS_LABELS, EVENT_STATUS_COLOR,
  EVENT_REG_STATUS_LABELS, EVENT_REG_STATUS_COLOR,
} from "@/types";
import {
  atualizarEventoAction, mudarStatusEventoAction,
  inscreverAction, atualizarStatusInscricaoAction, fazerCheckinAction,
} from "../actions";

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
const TIPOS = Object.keys(EVENT_TIPO_LABELS) as (keyof typeof EVENT_TIPO_LABELS)[];

type Tab = "geral" | "inscritos" | "checkin";

export default function EventoDetalheClient({
  evento: ev0, inscricoes: inscricoes0, checkins: checkins0,
}: {
  evento: EventItem;
  inscricoes: EventRegistration[];
  checkins: EventCheckin[];
}) {
  const [ev, setEv] = useState(ev0);
  const [inscricoes, setInscricoes] = useState(inscricoes0);
  const [checkins, setCheckins] = useState(checkins0);
  const [tab, setTab] = useState<Tab>("geral");
  const [editMode, setEditMode] = useState(false);
  const [showInscModal, setShowInscModal] = useState(false);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState("");

  const statusColor = EVENT_STATUS_COLOR[ev.status];
  const confirmados = inscricoes.filter(i => i.status === "CONFIRMADO").length;
  const pendentes   = inscricoes.filter(i => i.status === "PENDENTE").length;
  const pct = ev.capacidade ? Math.min(100, Math.round((confirmados / ev.capacidade) * 100)) : null;

  // ── Editar evento ────────────────────────────────────────────
  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await atualizarEventoAction(ev.id, fd);
        setEv(prev => ({
          ...prev,
          titulo:    fd.get("titulo") as string,
          descricao: fd.get("descricao") as string | null,
          tipo:      fd.get("tipo") as EventItem["tipo"],
          status:    fd.get("status") as EventStatus,
          data_inicio: fd.get("data_inicio") as string,
          data_fim:    fd.get("data_fim") as string | null,
          local_nome:  fd.get("local_nome") as string | null,
          local_endereco: fd.get("local_endereco") as string | null,
          capacidade:  fd.get("capacidade") ? parseInt(fd.get("capacidade") as string) : null,
          inscricao_aberta: fd.get("inscricao_aberta") === "true",
          inscricao_requer_aprovacao: fd.get("inscricao_requer_aprovacao") === "true",
        }));
        setEditMode(false);
      } catch (err: unknown) { setErro((err as Error).message); }
    });
  }

  // ── Mudar status do evento ───────────────────────────────────
  async function handleStatus(status: EventStatus) {
    startTransition(async () => {
      await mudarStatusEventoAction(ev.id, status);
      setEv(prev => ({ ...prev, status }));
    });
  }

  // ── Inscrever participante ───────────────────────────────────
  async function handleInscrever(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    const fd = new FormData(e.currentTarget);
    fd.set("event_id", ev.id);
    startTransition(async () => {
      try {
        await inscreverAction(fd);
        window.location.reload();
      } catch (err: unknown) { setErro((err as Error).message); }
    });
  }

  // ── Atualizar status de inscrição ────────────────────────────
  async function handleRegStatus(id: string, status: EventRegistrationStatus) {
    startTransition(async () => {
      await atualizarStatusInscricaoAction(id, status);
      setInscricoes(prev => prev.map(i => i.id === id ? { ...i, status } : i));
    });
  }

  // ── Check-in ────────────────────────────────────────────────
  async function handleCheckin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    const fd = new FormData(e.currentTarget);
    fd.set("event_id", ev.id);
    startTransition(async () => {
      try {
        await fazerCheckinAction(fd);
        window.location.reload();
      } catch (err: unknown) { setErro((err as Error).message); }
    });
  }

  // ── Check-in rápido de inscrito ──────────────────────────────
  async function handleCheckinRapido(reg: EventRegistration) {
    const fd = new FormData();
    fd.set("event_id", ev.id);
    fd.set("registration_id", reg.id);
    if (reg.party_id) fd.set("party_id", reg.party_id);
    startTransition(async () => {
      try {
        await fazerCheckinAction(fd);
        setCheckins(prev => [...prev, {
          id: crypto.randomUUID(), ministry_id: ev.ministry_id,
          event_id: ev.id, registration_id: reg.id, party_id: reg.party_id,
          nome_avulso: null, checkin_at: new Date().toISOString(), checkin_by: null,
          party_nome: reg.party_nome,
        }]);
      } catch { /* já fez check-in */ }
    });
  }

  const jaFezCheckin = (reg: EventRegistration) =>
    checkins.some(c => c.registration_id === reg.id || (reg.party_id && c.party_id === reg.party_id));

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 16 }}>
        <a href="/dashboard/eventos" style={{ color: "var(--color-primary)", textDecoration: "none" }}>Eventos</a>
        {" / "}{ev.titulo}
      </div>

      {/* Header */}
      <div style={{
        background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: 14, padding: "20px 24px", marginBottom: 24,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 22 }}>{EVENT_TIPO_ICON[ev.tipo]}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                {EVENT_TIPO_LABELS[ev.tipo]}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20,
                background: statusColor + "18", color: statusColor,
              }}>
                {EVENT_STATUS_LABELS[ev.status]}
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{ev.titulo}</h1>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>
              📆 {new Date(ev.data_inicio).toLocaleString("pt-BR", {
                weekday: "long", day: "2-digit", month: "long", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
              {ev.data_fim && ` → ${new Date(ev.data_fim).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`}
            </p>
            {ev.local_nome && <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>📍 {ev.local_nome}{ev.local_endereco && ` — ${ev.local_endereco}`}</p>}
          </div>

          {/* Stats rápidos */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <Stat label="Inscritos" value={`${confirmados}${ev.capacidade ? `/${ev.capacidade}` : ""}`} color="#16a34a" />
            {pendentes > 0 && <Stat label="Pendentes" value={String(pendentes)} color="#d97706" />}
            <Stat label="Check-ins" value={String(checkins.length)} color="#2563eb" />
          </div>
        </div>

        {/* Barra de vagas */}
        {ev.capacidade && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--color-text-muted)", marginBottom: 4 }}>
              <span>{pct}% preenchido</span>
              <span>{ev.capacidade - confirmados} vaga{ev.capacidade - confirmados !== 1 ? "s" : ""} restante{ev.capacidade - confirmados !== 1 ? "s" : ""}</span>
            </div>
            <div style={{ height: 8, background: "var(--color-border)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 99, width: `${pct ?? 0}%`,
                background: (pct ?? 0) >= 90 ? "#dc2626" : (pct ?? 0) >= 70 ? "#d97706" : "#16a34a",
              }} />
            </div>
          </div>
        )}

        {/* Ações de status */}
        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          {ev.status === "RASCUNHO" && (
            <button onClick={() => handleStatus("PUBLICADO")}
              style={{ padding: "7px 14px", borderRadius: 7, background: "#16a34a", color: "#fff", border: "none", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
              Publicar Evento
            </button>
          )}
          {ev.status === "PUBLICADO" && (
            <button onClick={() => handleStatus("ENCERRADO")}
              style={{ padding: "7px 14px", borderRadius: 7, background: "#2563eb", color: "#fff", border: "none", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
              Encerrar Evento
            </button>
          )}
          {["RASCUNHO", "PUBLICADO"].includes(ev.status) && (
            <button onClick={() => handleStatus("CANCELADO")}
              style={{ padding: "7px 14px", borderRadius: 7, background: "#dc262618", color: "#dc2626", border: "1px solid #dc262630", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
              Cancelar Evento
            </button>
          )}
          <button onClick={() => setEditMode(true)}
            style={{ padding: "7px 14px", borderRadius: 7, background: "var(--color-bg)", border: "1px solid var(--color-border)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
            ✏️ Editar
          </button>
          <a href={`/api/eventos/${ev.id}/pdf`} target="_blank"
            style={{ padding: "7px 14px", borderRadius: 7, background: "var(--color-bg)", border: "1px solid var(--color-border)", fontWeight: 600, fontSize: 12, textDecoration: "none", color: "var(--color-text-primary)" }}>
            📄 Relatório PDF
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 20, borderBottom: "2px solid var(--color-border)" }}>
        {(["geral","inscritos","checkin"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "9px 20px", border: "none", borderRadius: "8px 8px 0 0",
            fontWeight: 600, fontSize: 13, cursor: "pointer",
            background: tab === t ? "var(--color-primary)" : "transparent",
            color: tab === t ? "#fff" : "var(--color-text-muted)",
            borderBottom: tab === t ? "2px solid var(--color-primary)" : "none",
          }}>
            {t === "geral" ? "📋 Visão Geral" : t === "inscritos" ? `👥 Inscritos (${inscricoes.length})` : `✅ Check-in (${checkins.length})`}
          </button>
        ))}
      </div>

      {erro && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#dc2626", fontSize: 13 }}>
          {erro}
        </div>
      )}

      {/* Tab: Visão Geral */}
      {tab === "geral" && (
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: "20px 24px" }}>
          {ev.descricao && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Descrição</h3>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-line" }}>{ev.descricao}</p>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
            <Info label="Tipo" value={`${EVENT_TIPO_ICON[ev.tipo]} ${EVENT_TIPO_LABELS[ev.tipo]}`} />
            <Info label="Status" value={EVENT_STATUS_LABELS[ev.status]} />
            <Info label="Inscrições abertas" value={ev.inscricao_aberta ? "Sim" : "Não"} />
            <Info label="Requer aprovação" value={ev.inscricao_requer_aprovacao ? "Sim" : "Não"} />
            {ev.capacidade && <Info label="Capacidade" value={`${ev.capacidade} vagas`} />}
            {ev.responsavel_nome && <Info label="Responsável" value={ev.responsavel_nome} />}
            {ev.unit_nome && <Info label="Unidade" value={ev.unit_nome} />}
          </div>
        </div>
      )}

      {/* Tab: Inscritos */}
      {tab === "inscritos" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
            <button onClick={() => setShowInscModal(true)}
              style={{ padding: "8px 16px", borderRadius: 8, background: "var(--color-primary)", color: "#fff", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              + Inscrever Participante
            </button>
          </div>

          {inscricoes.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--color-text-muted)" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
              <p>Nenhum inscrito ainda.</p>
            </div>
          ) : (
            <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--color-bg)" }}>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, color: "var(--color-text-muted)", fontSize: 11, textTransform: "uppercase" }}>Nome</th>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, color: "var(--color-text-muted)", fontSize: 11, textTransform: "uppercase" }}>Status</th>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, color: "var(--color-text-muted)", fontSize: 11, textTransform: "uppercase" }}>Inscrição</th>
                    <th style={{ padding: "10px 16px", textAlign: "center", fontWeight: 700, color: "var(--color-text-muted)", fontSize: 11, textTransform: "uppercase" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {inscricoes.map((ins, i) => {
                    const sc = EVENT_REG_STATUS_COLOR[ins.status];
                    return (
                      <tr key={ins.id} style={{ borderTop: i > 0 ? "1px solid var(--color-border)" : undefined }}>
                        <td style={{ padding: "10px 16px", fontWeight: 600 }}>
                          {ins.party_nome ?? ins.nome_externo ?? "—"}
                          {ins.nome_externo && <span style={{ fontSize: 11, color: "var(--color-text-muted)", marginLeft: 6 }}>(externo)</span>}
                        </td>
                        <td style={{ padding: "10px 16px" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: sc + "18", color: sc }}>
                            {EVENT_REG_STATUS_LABELS[ins.status]}
                          </span>
                        </td>
                        <td style={{ padding: "10px 16px", color: "var(--color-text-muted)", fontSize: 12 }}>
                          {new Date(ins.created_at).toLocaleDateString("pt-BR")}
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "center" }}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                            {ins.status === "PENDENTE" && (
                              <button onClick={() => handleRegStatus(ins.id, "CONFIRMADO")}
                                style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, border: "1px solid #16a34a", color: "#16a34a", background: "none", cursor: "pointer" }}>
                                Confirmar
                              </button>
                            )}
                            {ins.status !== "CANCELADO" && (
                              <button onClick={() => handleRegStatus(ins.id, "CANCELADO")}
                                style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, border: "1px solid #dc2626", color: "#dc2626", background: "none", cursor: "pointer" }}>
                                Cancelar
                              </button>
                            )}
                          </div>
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

      {/* Tab: Check-in */}
      {tab === "checkin" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
              {checkins.length} de {inscricoes.filter(i => i.status === "CONFIRMADO").length} confirmado{checkins.length !== 1 ? "s" : ""} realizou check-in
            </div>
            <button onClick={() => setShowCheckinModal(true)}
              style={{ padding: "8px 16px", borderRadius: 8, background: "var(--color-primary)", color: "#fff", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              + Check-in Avulso
            </button>
          </div>

          {/* Check-in rápido de inscritos */}
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-border)", fontWeight: 700, fontSize: 13 }}>
              Check-in por lista de inscritos
            </div>
            {inscricoes.filter(i => i.status === "CONFIRMADO").length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--color-text-muted)", fontSize: 13 }}>
                Nenhum inscrito confirmado ainda.
              </div>
            ) : (
              <div>
                {inscricoes.filter(i => i.status === "CONFIRMADO").map((ins, idx) => {
                  const done = jaFezCheckin(ins);
                  return (
                    <div key={ins.id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 16px",
                      borderTop: idx > 0 ? "1px solid var(--color-border)" : undefined,
                      background: done ? "#f0fdf4" : undefined,
                    }}>
                      <span style={{ fontWeight: done ? 700 : 400, color: done ? "#16a34a" : "var(--color-text-primary)", fontSize: 13 }}>
                        {done ? "✅ " : ""}{ins.party_nome ?? ins.nome_externo ?? "—"}
                      </span>
                      {!done ? (
                        <button onClick={() => handleCheckinRapido(ins)} disabled={isPending}
                          style={{ padding: "5px 14px", borderRadius: 7, background: "#16a34a", color: "#fff", border: "none", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                          Fazer Check-in
                        </button>
                      ) : (
                        <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}>Presente</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Lista de check-ins realizados */}
          {checkins.length > 0 && (
            <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-border)", fontWeight: 700, fontSize: 13 }}>
                Histórico de check-ins ({checkins.length})
              </div>
              {checkins.map((ci, idx) => (
                <div key={ci.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 16px",
                  borderTop: idx > 0 ? "1px solid var(--color-border)" : undefined,
                  fontSize: 13,
                }}>
                  <span style={{ fontWeight: 600 }}>{ci.party_nome ?? ci.nome_avulso ?? "—"}</span>
                  <span style={{ color: "var(--color-text-muted)", fontSize: 12 }}>
                    {new Date(ci.checkin_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Editar */}
      {editMode && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "var(--color-surface)", borderRadius: 14, padding: 28, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,.18)" }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 20px", fontSize: 17, fontWeight: 800 }}>Editar Evento</h2>
            {erro && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#dc2626", fontSize: 13 }}>{erro}</div>}
            <form onSubmit={handleEdit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label style={labelStyle}>Título *<input name="titulo" required defaultValue={ev.titulo} style={inputStyle} /></label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={labelStyle}>
                  Tipo *
                  <select name="tipo" defaultValue={ev.tipo} style={inputStyle}>
                    {TIPOS.map(t => <option key={t} value={t}>{EVENT_TIPO_ICON[t]} {EVENT_TIPO_LABELS[t]}</option>)}
                  </select>
                </label>
                <label style={labelStyle}>
                  Status
                  <select name="status" defaultValue={ev.status} style={inputStyle}>
                    <option value="RASCUNHO">Rascunho</option>
                    <option value="PUBLICADO">Publicado</option>
                    <option value="ENCERRADO">Encerrado</option>
                    <option value="CANCELADO">Cancelado</option>
                  </select>
                </label>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={labelStyle}>Data/hora início *<input name="data_inicio" type="datetime-local" required defaultValue={ev.data_inicio?.slice(0,16)} style={inputStyle} /></label>
                <label style={labelStyle}>Data/hora fim<input name="data_fim" type="datetime-local" defaultValue={ev.data_fim?.slice(0,16) ?? ""} style={inputStyle} /></label>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={labelStyle}>Local<input name="local_nome" defaultValue={ev.local_nome ?? ""} style={inputStyle} /></label>
                <label style={labelStyle}>Capacidade<input name="capacidade" type="number" min={1} defaultValue={ev.capacidade ?? ""} style={inputStyle} /></label>
              </div>
              <label style={labelStyle}>Endereço<input name="local_endereco" defaultValue={ev.local_endereco ?? ""} style={inputStyle} /></label>
              <label style={labelStyle}>Descrição<textarea name="descricao" rows={3} defaultValue={ev.descricao ?? ""} style={{ ...inputStyle, resize: "vertical" }} /></label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ ...labelStyle, flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <input type="hidden" name="inscricao_aberta" value="false" />
                  <input type="checkbox" name="inscricao_aberta" value="true" defaultChecked={ev.inscricao_aberta} />
                  Inscrições abertas
                </label>
                <label style={{ ...labelStyle, flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <input type="hidden" name="inscricao_requer_aprovacao" value="false" />
                  <input type="checkbox" name="inscricao_requer_aprovacao" value="true" defaultChecked={ev.inscricao_requer_aprovacao} />
                  Requer aprovação
                </label>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                <button type="button" onClick={() => setEditMode(false)}
                  style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", cursor: "pointer", fontSize: 13 }}>
                  Cancelar
                </button>
                <button type="submit" disabled={isPending}
                  style={{ padding: "9px 18px", borderRadius: 8, background: "var(--color-primary)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                  {isPending ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Inscrever */}
      {showInscModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={() => setShowInscModal(false)}>
          <div style={{ background: "var(--color-surface)", borderRadius: 14, padding: 28, width: "100%", maxWidth: 460, boxShadow: "0 8px 40px rgba(0,0,0,.18)" }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 20px", fontSize: 17, fontWeight: 800 }}>Inscrever Participante</h2>
            {erro && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#dc2626", fontSize: 13 }}>{erro}</div>}
            <form onSubmit={handleInscrever} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label style={labelStyle}>
                Nome (participante externo)
                <input name="nome_externo" style={inputStyle} placeholder="Nome completo" />
              </label>
              <label style={labelStyle}>
                Telefone (opcional)
                <input name="telefone_externo" style={inputStyle} placeholder="(11) 99999-9999" />
              </label>
              <label style={labelStyle}>Observação<textarea name="observacao" rows={2} style={{ ...inputStyle, resize: "none" }} /></label>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowInscModal(false)}
                  style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", cursor: "pointer", fontSize: 13 }}>
                  Cancelar
                </button>
                <button type="submit" disabled={isPending}
                  style={{ padding: "9px 18px", borderRadius: 8, background: "var(--color-primary)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                  {isPending ? "Inscrevendo..." : "Inscrever"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Check-in Avulso */}
      {showCheckinModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={() => setShowCheckinModal(false)}>
          <div style={{ background: "var(--color-surface)", borderRadius: 14, padding: 28, width: "100%", maxWidth: 420, boxShadow: "0 8px 40px rgba(0,0,0,.18)" }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 20px", fontSize: 17, fontWeight: 800 }}>Check-in Avulso</h2>
            <form onSubmit={handleCheckin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label style={labelStyle}>
                Nome do participante *
                <input name="nome_avulso" required style={inputStyle} placeholder="Nome completo" />
              </label>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowCheckinModal(false)}
                  style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", cursor: "pointer", fontSize: 13 }}>
                  Cancelar
                </button>
                <button type="submit" disabled={isPending}
                  style={{ padding: "9px 18px", borderRadius: 8, background: "#16a34a", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                  {isPending ? "Registrando..." : "Registrar Check-in"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: "center", minWidth: 70 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 600 }}>{label}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{value}</div>
    </div>
  );
}
