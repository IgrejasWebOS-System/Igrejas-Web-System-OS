"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  PreRegistrationListItem, PreRegistrationCampaign,
  PreRegSituacao, CampanhaTipo,
} from "@/types";
import {
  PRE_REG_SITUACAO_LABELS, PRE_REG_SITUACAO_COLORS,
  CAMPANHA_TIPO_LABELS,
} from "@/types";
import { aprovarPreCadastroAction, cancelarPreCadastroAction } from "./actions";

type Props = {
  registros:  PreRegistrationListItem[];
  total:      number;
  campanhas:  PreRegistrationCampaign[];
  page:       number;
  per_page:   number;
  busca:      string;
  situacao:   PreRegSituacao | "";
  campaign_id:string;
  isAdmin:    boolean;
};

const SITUACOES: (PreRegSituacao | "")[] = ["", "PENDENTE", "FINALIZADO", "CANCELADO"];

export default function PreCadastrosClient({
  registros, total, campanhas, page, per_page,
  busca, situacao, campaign_id, isAdmin,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmModal, setConfirmModal] = useState<{ id: string; acao: "aprovar" | "cancelar"; nome: string } | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");
  const [error, setError] = useState<string | null>(null);

  function push(params: Record<string, string>) {
    const sp = new URLSearchParams({
      busca, situacao, campaign_id,
      page: String(page), per_page: String(per_page),
      ...params,
    });
    router.push(`/dashboard/secretaria/pre-cadastros?${sp}`);
  }

  function confirmar() {
    if (!confirmModal) return;
    setError(null);
    startTransition(async () => {
      const result = confirmModal.acao === "aprovar"
        ? await aprovarPreCadastroAction(confirmModal.id)
        : await cancelarPreCadastroAction(confirmModal.id, motivoCancelamento);

      if (result.error) { setError(result.error); return; }
      setConfirmModal(null);
      setMotivoCancelamento("");
      router.refresh();
    });
  }

  const totalPages = Math.ceil(total / per_page);

  const tipoColors: Record<CampanhaTipo, string> = {
    NOVO_MEMBRO:           "#dbeafe",
    ATUALIZACAO_CADASTRAL: "#fef9c3",
    BATISMO:               "#ede9fe",
    EVENTO:                "#dcfce7",
  };
  const tipoTextColors: Record<CampanhaTipo, string> = {
    NOVO_MEMBRO:           "#1e40af",
    ATUALIZACAO_CADASTRAL: "#854d0e",
    BATISMO:               "#5b21b6",
    EVENTO:                "#166534",
  };

  return (
    <>
      {/* Filtros */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center",
        background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: 12, padding: "12px 14px",
      }}>
        <input
          defaultValue={busca}
          placeholder="Buscar nome..."
          onChange={e => push({ busca: e.target.value, page: "1" })}
          style={inputStyle}
        />
        <select defaultValue={situacao} onChange={e => push({ situacao: e.target.value, page: "1" })} style={selectStyle}>
          <option value="">Todas as situações</option>
          {SITUACOES.filter(Boolean).map(s => (
            <option key={s} value={s}>{PRE_REG_SITUACAO_LABELS[s as PreRegSituacao]}</option>
          ))}
        </select>
        <select defaultValue={campaign_id} onChange={e => push({ campaign_id: e.target.value, page: "1" })} style={selectStyle}>
          <option value="">Todas as campanhas</option>
          {campanhas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <a href="/dashboard/secretaria/pre-cadastros/campanhas" style={{
            padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-border)",
            fontSize: 13, fontWeight: 700, textDecoration: "none", color: "var(--color-text-muted)",
            whiteSpace: "nowrap",
          }}>
            Campanhas
          </a>
          <a href="/dashboard/secretaria/pre-cadastros/novo" style={{
            padding: "8px 16px", borderRadius: 8, border: "none",
            background: "var(--color-primary)", color: "#fff",
            fontSize: 13, fontWeight: 700, textDecoration: "none",
            display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
          }}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Novo Pré-Cadastro
          </a>
        </div>
      </div>

      {/* Lista */}
      <div style={{
        background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: 12, overflow: "hidden",
        opacity: pending ? 0.7 : 1, transition: "opacity .15s",
      }}>
        {registros.length === 0 ? (
          <div style={{ padding: "56px 24px", textAlign: "center", color: "var(--color-text-muted)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Nenhum pré-cadastro encontrado</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F7FAFD", borderBottom: "1px solid var(--color-border)" }}>
                {["Nome", "Campanha", "Contato", "Situação", "Data", ""].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {registros.map((r, i) => {
                const colors = PRE_REG_SITUACAO_COLORS[r.situacao];
                return (
                  <tr key={r.id} style={{ borderBottom: i < registros.length - 1 ? "1px solid var(--color-border)" : "none" }}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{r.nome}</div>
                      {r.email && <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{r.email}</div>}
                    </td>
                    <td style={tdStyle}>
                      {r.campaign_nome ? (
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{r.campaign_nome}</div>
                          {r.campaign_tipo && (
                            <span style={{
                              display: "inline-block", marginTop: 2,
                              padding: "1px 7px", borderRadius: 99, fontSize: 10, fontWeight: 700,
                              background: tipoColors[r.campaign_tipo],
                              color: tipoTextColors[r.campaign_tipo],
                            }}>
                              {CAMPANHA_TIPO_LABELS[r.campaign_tipo]}
                            </span>
                          )}
                        </div>
                      ) : <span style={{ fontSize: 12, color: "#cbd5e1" }}>—</span>}
                    </td>
                    <td style={{ ...tdStyle, fontSize: 12, color: "var(--color-text-muted)" }}>
                      {r.telefone ?? "—"}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                        background: colors.bg, color: colors.color,
                      }}>
                        {PRE_REG_SITUACAO_LABELS[r.situacao]}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, fontSize: 12, color: "var(--color-text-muted)" }}>
                      {new Date(r.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <a href={`/dashboard/secretaria/pre-cadastros/${r.id}`} style={{
                          padding: "4px 10px", borderRadius: 6, border: "1px solid var(--color-border)",
                          fontSize: 11, fontWeight: 700, textDecoration: "none",
                          color: "var(--color-text-muted)", background: "transparent",
                        }}>
                          Ver
                        </a>
                        {isAdmin && r.situacao === "PENDENTE" && (
                          <>
                            <button
                              onClick={() => setConfirmModal({ id: r.id, acao: "aprovar", nome: r.nome })}
                              style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: "#dcfce7", color: "#166534", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                            >
                              Aprovar
                            </button>
                            <button
                              onClick={() => setConfirmModal({ id: r.id, acao: "cancelar", nome: r.nome })}
                              style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: "#fee2e2", color: "#991b1b", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                            >
                              Cancelar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => push({ page: String(p) })} style={{
              width: 32, height: 32, borderRadius: 8, border: "1px solid var(--color-border)",
              background: p === page ? "var(--color-primary)" : "transparent",
              color: p === page ? "#fff" : "var(--color-text-muted)",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Modal de confirmação */}
      {confirmModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        }}>
          <div style={{
            background: "var(--color-surface)", borderRadius: 14, padding: "24px 24px 20px",
            width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,.2)",
          }}>
            <h2 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 900 }}>
              {confirmModal.acao === "aprovar" ? "Aprovar pré-cadastro" : "Cancelar pré-cadastro"}
            </h2>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 16 }}>
              {confirmModal.acao === "aprovar"
                ? <>Isso criará um membro ativo para <strong>{confirmModal.nome}</strong>. Esta ação não pode ser desfeita.</>
                : <>Confirmar cancelamento de <strong>{confirmModal.nome}</strong>?</>
              }
            </p>
            {confirmModal.acao === "cancelar" && (
              <textarea
                value={motivoCancelamento}
                onChange={e => setMotivoCancelamento(e.target.value)}
                rows={2}
                placeholder="Motivo (opcional)"
                style={{
                  width: "100%", border: "1px solid var(--color-border)", borderRadius: 8,
                  padding: "8px 10px", fontSize: 13, outline: "none",
                  background: "var(--color-bg)", marginBottom: 12, boxSizing: "border-box",
                }}
              />
            )}
            {error && <div style={{ marginBottom: 12, padding: "8px 12px", borderRadius: 8, background: "#fef2f2", color: "#dc2626", fontSize: 13 }}>⚠ {error}</div>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => { setConfirmModal(null); setError(null); }} style={{
                padding: "9px 18px", borderRadius: 8, border: "1px solid var(--color-border)",
                background: "transparent", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>
                Voltar
              </button>
              <button onClick={confirmar} disabled={pending} style={{
                padding: "9px 18px", borderRadius: 8, border: "none",
                background: confirmModal.acao === "aprovar" ? "#16a34a" : "#dc2626",
                color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
                opacity: pending ? 0.6 : 1,
              }}>
                {pending ? "Aguarde…" : confirmModal.acao === "aprovar" ? "Confirmar Aprovação" : "Confirmar Cancelamento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "7px 10px", borderRadius: 8, border: "1px solid var(--color-border)",
  fontSize: 13, background: "var(--color-bg)", color: "var(--color-text-primary)",
  outline: "none", minWidth: 180,
};
const selectStyle: React.CSSProperties = {
  padding: "7px 10px", borderRadius: 8, border: "1px solid var(--color-border)",
  fontSize: 13, background: "var(--color-bg)", color: "var(--color-text-primary)",
  outline: "none",
};
const thStyle: React.CSSProperties = {
  padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 800,
  color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: ".04em",
};
const tdStyle: React.CSSProperties = { padding: "12px 14px", verticalAlign: "middle" };
