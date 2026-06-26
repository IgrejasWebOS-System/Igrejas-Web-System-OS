"use client";

import { useState, useTransition } from "react";
import type {
  Occurrence, OccurrenceFollowup, OccurrenceStatus, OccurrenceTipo,
} from "@/types";
import {
  OCCURRENCE_TIPO_LABELS, OCCURRENCE_TIPO_ICON, OCCURRENCE_TIPO_COLOR,
  OCCURRENCE_STATUS_LABELS, OCCURRENCE_STATUS_COLOR,
  FOLLOWUP_CONTATO_LABELS,
} from "@/types";
import {
  atualizarOcorrenciaAction, mudarStatusOcorrenciaAction,
  arquivarOcorrenciaAction, registrarFollowupAction,
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

const TIPOS = Object.keys(OCCURRENCE_TIPO_LABELS) as OccurrenceTipo[];
const CONTATOS = Object.keys(FOLLOWUP_CONTATO_LABELS) as (keyof typeof FOLLOWUP_CONTATO_LABELS)[];

export default function OcorrenciaDetalheClient({
  ocorrencia: oc0, followups: followups0,
}: {
  ocorrencia: Occurrence;
  followups: OccurrenceFollowup[];
}) {
  const [oc, setOc]             = useState(oc0);
  const [followups, setFollowups] = useState(followups0);
  const [editMode, setEditMode]   = useState(false);
  const [showFollowup, setShowFollowup] = useState(false);
  const [showResolucao, setShowResolucao] = useState(false);
  const [resolucaoText, setResolucaoText] = useState(oc0.resolucao ?? "");
  const [erro, setErro]           = useState("");
  const [isPending, startTransition] = useTransition();

  const tc = OCCURRENCE_TIPO_COLOR[oc.tipo];
  const sc = OCCURRENCE_STATUS_COLOR[oc.status];

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await atualizarOcorrenciaAction(oc.id, fd);
        setOc(prev => ({
          ...prev,
          tipo:            fd.get("tipo") as OccurrenceTipo,
          titulo:          fd.get("titulo") as string,
          descricao:       fd.get("descricao") as string | null,
          data_ocorrencia: fd.get("data_ocorrencia") as string,
          nivel_sigilo:    fd.get("nivel_sigilo") as "NORMAL" | "RESTRITO",
        }));
        setEditMode(false);
      } catch (err: unknown) { setErro((err as Error).message); }
    });
  }

  async function handleStatus(status: OccurrenceStatus, resolucao?: string) {
    startTransition(async () => {
      await mudarStatusOcorrenciaAction(oc.id, status, resolucao);
      setOc(prev => ({ ...prev, status, resolucao: resolucao ?? prev.resolucao }));
      setShowResolucao(false);
    });
  }

  async function handleFollowup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    const fd = new FormData(e.currentTarget);
    fd.set("occurrence_id", oc.id);
    startTransition(async () => {
      try {
        await registrarFollowupAction(fd);
        const novo: OccurrenceFollowup = {
          id: crypto.randomUUID(),
          ministry_id:   oc.ministry_id,
          occurrence_id: oc.id,
          data:          fd.get("data") as string,
          tipo_contato:  fd.get("tipo_contato") as OccurrenceFollowup["tipo_contato"],
          descricao:     fd.get("descricao") as string,
          proxima_acao:  fd.get("proxima_acao") as string | null,
          created_by:    null,
          created_at:    new Date().toISOString(),
        };
        setFollowups(prev => [novo, ...prev]);
        if (oc.status === "ABERTA") setOc(prev => ({ ...prev, status: "EM_ACOMPANHAMENTO" }));
        setShowFollowup(false);
        (e.target as HTMLFormElement).reset();
      } catch (err: unknown) { setErro((err as Error).message); }
    });
  }

  async function handleArquivar() {
    if (!confirm("Arquivar esta ocorrência? Ela ficará oculta da lista principal.")) return;
    startTransition(async () => {
      await arquivarOcorrenciaAction(oc.id);
      window.location.href = "/dashboard/ocorrencias";
    });
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 900, margin: "0 auto" }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 16 }}>
        <a href="/dashboard/ocorrencias" style={{ color: "var(--color-primary)", textDecoration: "none" }}>Ocorrências</a>
        {" / "}{oc.titulo}
      </div>

      {/* Card principal */}
      <div style={{
        background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: 14, overflow: "hidden", marginBottom: 24,
        borderTop: `4px solid ${tc}`,
      }}>
        <div style={{ padding: "20px 24px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 22 }}>{OCCURRENCE_TIPO_ICON[oc.tipo]}</span>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: tc }}>
                  {OCCURRENCE_TIPO_LABELS[oc.tipo]}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20,
                  background: sc + "18", color: sc,
                }}>
                  {OCCURRENCE_STATUS_LABELS[oc.status]}
                </span>
                {oc.nivel_sigilo === "RESTRITO" && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#fef9c3", color: "#92400e" }}>
                    🔒 RESTRITO
                  </span>
                )}
              </div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{oc.titulo}</h1>
            </div>

            {/* Ações */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => setEditMode(true)}
                style={{ padding: "7px 14px", borderRadius: 7, background: "var(--color-bg)", border: "1px solid var(--color-border)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                ✏️ Editar
              </button>
              {oc.status !== "RESOLVIDA" && oc.status !== "ARQUIVADA" && (
                <button onClick={() => setShowResolucao(true)}
                  style={{ padding: "7px 14px", borderRadius: 7, background: "#16a34a", color: "#fff", border: "none", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                  ✅ Marcar Resolvida
                </button>
              )}
              {oc.status !== "ARQUIVADA" && (
                <button onClick={handleArquivar}
                  style={{ padding: "7px 14px", borderRadius: 7, background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                  Arquivar
                </button>
              )}
            </div>
          </div>

          {/* Meta */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: 14, marginBottom: 16 }}>
            <MetaItem label="Membro" value={oc.party_nome ?? "—"} />
            <MetaItem label="Data" value={new Date(oc.data_ocorrencia).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })} />
            {oc.responsavel_nome && <MetaItem label="Responsável" value={oc.responsavel_nome} />}
            {oc.unit_nome && <MetaItem label="Unidade" value={oc.unit_nome} />}
            <MetaItem label="Registrada em" value={new Date(oc.created_at).toLocaleDateString("pt-BR")} />
          </div>

          {/* Descrição */}
          {oc.descricao && (
            <div style={{ background: "var(--color-bg)", borderRadius: 8, padding: "14px 16px", marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", marginBottom: 6 }}>Descrição</div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-line" }}>{oc.descricao}</p>
            </div>
          )}

          {/* Resolução */}
          {oc.resolucao && (
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", marginBottom: 6 }}>✅ Resolução</div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-line" }}>{oc.resolucao}</p>
            </div>
          )}
        </div>
      </div>

      {/* Acompanhamentos */}
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{
          padding: "14px 20px", borderBottom: "1px solid var(--color-border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
            📝 Acompanhamentos ({followups.length})
          </h2>
          <button onClick={() => setShowFollowup(true)}
            style={{ padding: "7px 14px", borderRadius: 7, background: "var(--color-primary)", color: "#fff", border: "none", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
            + Registrar
          </button>
        </div>

        {followups.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--color-text-muted)", fontSize: 13 }}>
            Nenhum acompanhamento registrado ainda.
          </div>
        ) : (
          <div>
            {followups.map((f, idx) => (
              <div key={f.id} style={{
                padding: "16px 20px",
                borderTop: idx > 0 ? "1px solid var(--color-border)" : undefined,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, background: "var(--color-primary-light)", color: "var(--color-primary)", padding: "2px 8px", borderRadius: 20 }}>
                    {FOLLOWUP_CONTATO_LABELS[f.tipo_contato]}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                    {new Date(f.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-line" }}>{f.descricao}</p>
                {f.proxima_acao && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#d97706", fontWeight: 600 }}>
                    ➡️ Próxima ação: {f.proxima_acao}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {erro && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginTop: 16, color: "#dc2626", fontSize: 13 }}>
          {erro}
        </div>
      )}

      {/* Modal Editar */}
      {editMode && (
        <Modal title="Editar Ocorrência" onClose={() => setEditMode(false)}>
          <form onSubmit={handleEdit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label style={labelStyle}>Título *<input name="titulo" required defaultValue={oc.titulo} style={inputStyle} /></label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={labelStyle}>
                Tipo *
                <select name="tipo" defaultValue={oc.tipo} style={inputStyle}>
                  {TIPOS.map(t => <option key={t} value={t}>{OCCURRENCE_TIPO_ICON[t]} {OCCURRENCE_TIPO_LABELS[t]}</option>)}
                </select>
              </label>
              <label style={labelStyle}>
                Data *
                <input name="data_ocorrencia" type="date" required defaultValue={oc.data_ocorrencia} style={inputStyle} />
              </label>
            </div>
            <label style={labelStyle}>
              Descrição
              <textarea name="descricao" rows={4} defaultValue={oc.descricao ?? ""} style={{ ...inputStyle, resize: "vertical" }} />
            </label>
            <label style={labelStyle}>
              Nível de Sigilo
              <select name="nivel_sigilo" defaultValue={oc.nivel_sigilo} style={inputStyle}>
                <option value="RESTRITO">🔒 Restrito (N0/N1/N2)</option>
                <option value="NORMAL">👁 Normal (N3+)</option>
              </select>
            </label>
            <ModalFooter onCancel={() => setEditMode(false)} isPending={isPending} label="Salvar" />
          </form>
        </Modal>
      )}

      {/* Modal Registrar Acompanhamento */}
      {showFollowup && (
        <Modal title="Registrar Acompanhamento" onClose={() => setShowFollowup(false)}>
          <form onSubmit={handleFollowup} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={labelStyle}>
                Tipo de contato *
                <select name="tipo_contato" defaultValue="VISITA" style={inputStyle}>
                  {CONTATOS.map(c => <option key={c} value={c}>{FOLLOWUP_CONTATO_LABELS[c]}</option>)}
                </select>
              </label>
              <label style={labelStyle}>
                Data *
                <input name="data" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} style={inputStyle} />
              </label>
            </div>
            <label style={labelStyle}>
              Relato *
              <textarea name="descricao" required rows={4} style={{ ...inputStyle, resize: "vertical" }} placeholder="Descreva o que ocorreu neste contato..." />
            </label>
            <label style={labelStyle}>
              Próxima ação (opcional)
              <input name="proxima_acao" style={inputStyle} placeholder="Ex: Agendar nova visita em 15 dias" />
            </label>
            <ModalFooter onCancel={() => setShowFollowup(false)} isPending={isPending} label="Registrar" />
          </form>
        </Modal>
      )}

      {/* Modal Resolução */}
      {showResolucao && (
        <Modal title="Marcar como Resolvida" onClose={() => setShowResolucao(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label style={labelStyle}>
              Descrição da resolução (opcional)
              <textarea rows={4} value={resolucaoText} onChange={e => setResolucaoText(e.target.value)}
                style={{ ...inputStyle, resize: "vertical" }} placeholder="Descreva como a ocorrência foi resolvida..." />
            </label>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowResolucao(false)}
                style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", cursor: "pointer", fontSize: 13 }}>
                Cancelar
              </button>
              <button onClick={() => handleStatus("RESOLVIDA", resolucaoText || undefined)} disabled={isPending}
                style={{ padding: "9px 18px", borderRadius: 8, background: "#16a34a", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                {isPending ? "Salvando..." : "Confirmar Resolução"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
      onClick={onClose}>
      <div style={{ background: "var(--color-surface)", borderRadius: 14, padding: 28, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,.18)" }}
        onClick={e => e.stopPropagation()}>
        <h2 style={{ margin: "0 0 20px", fontSize: 17, fontWeight: 800 }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

function ModalFooter({ onCancel, isPending, label }: { onCancel: () => void; isPending: boolean; label: string }) {
  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
      <button type="button" onClick={onCancel}
        style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", cursor: "pointer", fontSize: 13 }}>
        Cancelar
      </button>
      <button type="submit" disabled={isPending}
        style={{ padding: "9px 18px", borderRadius: 8, background: "var(--color-primary)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
        {isPending ? "Salvando..." : label}
      </button>
    </div>
  );
}
