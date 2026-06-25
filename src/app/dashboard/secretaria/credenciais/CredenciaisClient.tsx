"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CredentialRequestListItem, CredentialSituacao, CredentialModel, CredentialRequestType } from "@/types";
import { CREDENTIAL_SITUACAO_LABELS, CREDENTIAL_SITUACAO_COLORS } from "@/types";
import { mudarSituacaoAction } from "./actions";

type Props = {
  credenciais:  CredentialRequestListItem[];
  total:        number;
  modelos:      CredentialModel[];
  tipos:        CredentialRequestType[];
  page:         number;
  per_page:     number;
  busca:        string;
  situacao:     CredentialSituacao | "";
  model_id:     string;
  request_type_id: string;
  isAdmin:      boolean;  // level <= 2
};

const SITUACOES: (CredentialSituacao | "")[] = ["", "PENDENTE", "LIBERADA", "CONFIRMADA", "DIGITAL", "CANCELADA"];

export default function CredenciaisClient({
  credenciais, total, modelos, tipos,
  page, per_page, busca, situacao, model_id, request_type_id, isAdmin,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmModal, setConfirmModal] = useState<{ id: string; next: CredentialSituacao; nome: string } | null>(null);

  function push(params: Record<string, string>) {
    const sp = new URLSearchParams({
      busca, situacao, model_id, request_type_id,
      page: String(page), per_page: String(per_page),
      ...params,
    });
    router.push(`/dashboard/secretaria/credenciais?${sp}`);
  }

  function handleSituacao(id: string, next: CredentialSituacao, nome: string) {
    setConfirmModal({ id, next, nome });
  }

  function confirmarMudanca() {
    if (!confirmModal) return;
    startTransition(async () => {
      await mudarSituacaoAction(confirmModal.id, confirmModal.next);
      setConfirmModal(null);
      router.refresh();
    });
  }

  const totalPages = Math.ceil(total / per_page);

  return (
    <>
      {/* Filtros */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center",
        background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: 12, padding: "12px 14px",
      }}>
        {/* Busca */}
        <input
          defaultValue={busca}
          placeholder="Buscar membro..."
          onChange={e => push({ busca: e.target.value, page: "1" })}
          style={inputStyle}
        />
        {/* Situação */}
        <select defaultValue={situacao} onChange={e => push({ situacao: e.target.value, page: "1" })} style={selectStyle}>
          <option value="">Todas as situações</option>
          {SITUACOES.filter(Boolean).map(s => (
            <option key={s} value={s}>{CREDENTIAL_SITUACAO_LABELS[s as CredentialSituacao]}</option>
          ))}
        </select>
        {/* Modelo */}
        <select defaultValue={model_id} onChange={e => push({ model_id: e.target.value, page: "1" })} style={selectStyle}>
          <option value="">Todos os modelos</option>
          {modelos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
        </select>
        {/* Tipo */}
        <select defaultValue={request_type_id} onChange={e => push({ request_type_id: e.target.value, page: "1" })} style={selectStyle}>
          <option value="">Todos os tipos</option>
          {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
        {/* Nova credencial */}
        <a href="/dashboard/secretaria/credenciais/nova" style={{
          marginLeft: "auto", padding: "8px 16px", borderRadius: 8,
          background: "var(--color-primary)", color: "#fff",
          fontSize: 13, fontWeight: 700, textDecoration: "none",
          display: "inline-flex", alignItems: "center", gap: 6,
          whiteSpace: "nowrap",
        }}>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nova Credencial
        </a>
      </div>

      {/* Tabela */}
      <div style={{
        background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: 12, overflow: "hidden",
        opacity: pending ? 0.7 : 1, transition: "opacity .15s",
      }}>
        {credenciais.length === 0 ? (
          <div style={{ padding: "56px 24px", textAlign: "center", color: "var(--color-text-muted)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🪪</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Nenhuma credencial encontrada</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Crie a primeira clicando em "Nova Credencial".</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F7FAFD", borderBottom: "1px solid var(--color-border)" }}>
                {["Membro", "Modelo / Cargo", "Tipo", "Situação", "Validade", ""].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {credenciais.map((c, i) => {
                const colors = CREDENTIAL_SITUACAO_COLORS[c.situacao];
                return (
                  <tr key={c.id} style={{ borderBottom: i < credenciais.length - 1 ? "1px solid var(--color-border)" : "none" }}>
                    {/* Membro */}
                    <td style={tdStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {c.membro_foto ? (
                          <img src={c.membro_foto} alt="" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", border: "1.5px solid var(--color-border)" }} />
                        ) : (
                          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--color-primary-light)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, color: "var(--color-primary)" }}>
                            {c.membro_nome.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{c.membro_nome}</div>
                          <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                            {c.membro_matricula ?? "—"} · {c.unit_nome ?? "—"}
                          </div>
                        </div>
                      </div>
                    </td>
                    {/* Modelo */}
                    <td style={tdStyle}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{c.model_nome}</div>
                      {c.cargo_nome && <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{c.cargo_nome}</div>}
                    </td>
                    {/* Tipo */}
                    <td style={{ ...tdStyle, fontSize: 12, color: "var(--color-text-muted)" }}>
                      {c.request_type_nome ?? "—"}
                    </td>
                    {/* Situação */}
                    <td style={tdStyle}>
                      <span style={{
                        padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                        background: colors.bg, color: colors.color,
                      }}>
                        {CREDENTIAL_SITUACAO_LABELS[c.situacao]}
                      </span>
                    </td>
                    {/* Validade */}
                    <td style={{ ...tdStyle, fontSize: 12, color: "var(--color-text-muted)" }}>
                      {c.data_validade
                        ? new Date(c.data_validade + "T12:00:00").toLocaleDateString("pt-BR")
                        : "—"}
                    </td>
                    {/* Ações */}
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        {/* Ver PDF */}
                        <a
                          href={`/api/credenciais/${c.id}/pdf`}
                          target="_blank"
                          style={{
                            padding: "4px 10px", borderRadius: 6, border: "1px solid var(--color-border)",
                            fontSize: 11, fontWeight: 700, textDecoration: "none",
                            color: "var(--color-text-muted)", background: "transparent",
                          }}
                        >
                          PDF
                        </a>
                        {/* Ações de fluxo (N2+) */}
                        {isAdmin && c.situacao === "PENDENTE" && (
                          <button onClick={() => handleSituacao(c.id, "LIBERADA", c.membro_nome)} style={actionBtnStyle("#dbeafe", "#1e40af")}>
                            Liberar
                          </button>
                        )}
                        {isAdmin && c.situacao === "LIBERADA" && (
                          <button onClick={() => handleSituacao(c.id, "CONFIRMADA", c.membro_nome)} style={actionBtnStyle("#dcfce7", "#166534")}>
                            Confirmar
                          </button>
                        )}
                        {isAdmin && (c.situacao === "PENDENTE" || c.situacao === "LIBERADA") && (
                          <button onClick={() => handleSituacao(c.id, "CANCELADA", c.membro_nome)} style={actionBtnStyle("#fee2e2", "#991b1b")}>
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
            width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,.2)",
          }}>
            <h2 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 900 }}>Confirmar mudança</h2>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 20 }}>
              Mudar situação de <strong>{confirmModal.nome}</strong> para{" "}
              <strong>{CREDENTIAL_SITUACAO_LABELS[confirmModal.next]}</strong>?
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmModal(null)} style={{
                padding: "9px 18px", borderRadius: 8,
                border: "1px solid var(--color-border)", background: "transparent",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>
                Cancelar
              </button>
              <button onClick={confirmarMudanca} disabled={pending} style={{
                padding: "9px 18px", borderRadius: 8, border: "none",
                background: "var(--color-primary)", color: "#fff",
                fontSize: 13, fontWeight: 700, cursor: "pointer",
                opacity: pending ? 0.6 : 1,
              }}>
                {pending ? "Salvando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function actionBtnStyle(bg: string, color: string): React.CSSProperties {
  return {
    padding: "4px 10px", borderRadius: 6, border: "none",
    background: bg, color, fontSize: 11, fontWeight: 700, cursor: "pointer",
  };
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
