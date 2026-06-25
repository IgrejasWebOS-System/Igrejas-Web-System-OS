"use client";

import { useState, useTransition } from "react";
import type { TabelaKey } from "./tabelas.config";
import type { LookupItem } from "./actions";
import { criarItemAction, editarItemAction, toggleItemAction } from "./actions";

type Props = {
  tabela:   TabelaKey;
  label:    string;
  items:    LookupItem[];
  temOrdem: boolean;
  temSigla: boolean;
};

export default function TabelaClient({ tabela, label, items: initialItems, temOrdem, temSigla }: Props) {
  const [items, setItems] = useState<LookupItem[]>(initialItems);
  const [modal, setModal] = useState<"criar" | "editar" | null>(null);
  const [editando, setEditando] = useState<LookupItem | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [sigla, setSigla] = useState("");
  const [ordem, setOrdem] = useState("");

  function abrirCriar() {
    setNome(""); setSigla(""); setOrdem("");
    setError(null); setModal("criar");
  }

  function abrirEditar(item: LookupItem) {
    setEditando(item);
    setNome(item.nome); setSigla(item.sigla ?? ""); setOrdem(item.ordem?.toString() ?? "");
    setError(null); setModal("editar");
  }

  function fechar() { setModal(null); setEditando(null); setError(null); }

  function handleSubmit() {
    setError(null);
    const fd = new FormData();
    fd.set("nome", nome);
    if (temSigla) fd.set("sigla", sigla);
    if (temOrdem) fd.set("ordem", ordem);

    startTransition(async () => {
      try {
        if (modal === "criar") {
          await criarItemAction(tabela, fd);
          const novoItem: LookupItem = {
            id: crypto.randomUUID(), nome, sigla: sigla || null,
            ordem: temOrdem ? Number(ordem) : null, is_active: true,
          };
          setItems(prev => [...prev, novoItem].sort((a, b) =>
            temOrdem ? (a.ordem ?? 0) - (b.ordem ?? 0) : a.nome.localeCompare(b.nome, "pt-BR")
          ));
        } else if (modal === "editar" && editando) {
          await editarItemAction(tabela, editando.id, fd);
          setItems(prev => prev.map(i => i.id === editando.id
            ? { ...i, nome, sigla: sigla || null, ordem: temOrdem ? Number(ordem) : null }
            : i
          ));
        }
        fechar();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Erro desconhecido");
      }
    });
  }

  function handleToggle(item: LookupItem) {
    startTransition(async () => {
      try {
        await toggleItemAction(tabela, item.id, !item.is_active);
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_active: !item.is_active } : i));
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : "Erro");
      }
    });
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", border: "1px solid var(--color-border)", borderRadius: 8,
    padding: "8px 12px", fontSize: 13, color: "var(--color-text-primary)",
    background: "var(--color-surface)", outline: "none", boxSizing: "border-box",
  };

  const ativos   = items.filter(i => i.is_active).length;
  const inativos = items.filter(i => !i.is_active).length;

  return (
    <>
      {/* Stats + botão */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { label: "Total",    value: items.length, color: "#4A7DB5" },
            { label: "Ativos",   value: ativos,       color: "#16a34a" },
            { label: "Inativos", value: inativos,     color: "#94a3b8" },
          ].map(s => (
            <div key={s.label} style={{
              padding: "8px 14px", borderRadius: 9,
              background: "var(--color-surface)", border: "1px solid var(--color-border)",
              textAlign: "center", minWidth: 70,
            }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "var(--color-text-muted)", marginTop: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <button
          onClick={abrirCriar}
          style={{
            marginLeft: "auto", padding: "9px 18px", borderRadius: 8, border: "none",
            background: "var(--color-primary)", color: "#fff",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Novo {label.replace(/s$/, "")}
        </button>
      </div>

      {/* Tabela */}
      <div style={{
        background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: 12, overflow: "hidden",
        opacity: pending ? 0.7 : 1, transition: "opacity .15s",
      }}>
        {items.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--color-text-muted)" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
            <div style={{ fontWeight: 700 }}>Nenhum item cadastrado</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F7FAFD", borderBottom: "1px solid var(--color-border)" }}>
                {temOrdem  && <th style={thStyle}>Ordem</th>}
                <th style={thStyle}>Nome</th>
                {temSigla  && <th style={thStyle}>Sigla</th>}
                <th style={thStyle}>Situação</th>
                <th style={{ ...thStyle, width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id} style={{ borderBottom: i < items.length - 1 ? "1px solid var(--color-border)" : "none" }}>
                  {temOrdem && (
                    <td style={{ ...tdStyle, width: 70 }}>
                      <span style={{ fontFamily: "monospace", fontSize: 13, color: "var(--color-text-muted)" }}>
                        {item.ordem ?? "—"}
                      </span>
                    </td>
                  )}
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: item.is_active ? "var(--color-text-primary)" : "var(--color-text-muted)" }}>
                      {item.nome}
                    </span>
                  </td>
                  {temSigla && (
                    <td style={tdStyle}>
                      {item.sigla
                        ? <code style={{ fontSize: 11, background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>{item.sigla}</code>
                        : <span style={{ color: "#cbd5e1" }}>—</span>
                      }
                    </td>
                  )}
                  <td style={tdStyle}>
                    <button
                      onClick={() => handleToggle(item)}
                      disabled={pending}
                      style={{
                        padding: "3px 10px", borderRadius: 99, border: "none", cursor: "pointer",
                        fontSize: 11, fontWeight: 700,
                        background: item.is_active ? "#dcfce7" : "#f1f5f9",
                        color: item.is_active ? "#16a34a" : "#64748b",
                      }}
                    >
                      {item.is_active ? "Ativo" : "Inativo"}
                    </button>
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    <button
                      onClick={() => abrirEditar(item)}
                      style={{
                        background: "var(--color-primary-light)", color: "var(--color-primary)",
                        border: "none", borderRadius: 6, padding: "5px 12px",
                        fontSize: 12, fontWeight: 700, cursor: "pointer",
                      }}
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        }}>
          <div style={{
            background: "var(--color-surface)", borderRadius: 14, padding: "24px 24px 20px",
            width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,.2)",
          }}>
            <h2 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 900, color: "var(--color-text-primary)" }}>
              {modal === "criar" ? `Novo ${label.replace(/s$/, "")}` : `Editar: ${editando?.nome}`}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={labelStyle}>Nome *</label>
                <input value={nome} onChange={e => setNome(e.target.value)} style={inputStyle} placeholder="Digite o nome..." autoFocus />
              </div>
              {temSigla && (
                <div>
                  <label style={labelStyle}>Sigla (opcional)</label>
                  <input value={sigla} onChange={e => setSigla(e.target.value)} style={inputStyle} placeholder="Ex: ADJ, MH..." />
                </div>
              )}
              {temOrdem && (
                <div>
                  <label style={labelStyle}>Ordem de exibição</label>
                  <input type="number" value={ordem} onChange={e => setOrdem(e.target.value)} style={inputStyle} placeholder="0" min={0} />
                </div>
              )}
            </div>

            {error && (
              <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 8, background: "#fef2f2", color: "#dc2626", fontSize: 13 }}>
                ⚠ {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button onClick={fechar} style={{
                padding: "9px 18px", borderRadius: 8,
                border: "1px solid var(--color-border)", background: "transparent",
                fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--color-text-muted)",
              }}>
                Cancelar
              </button>
              <button onClick={handleSubmit} disabled={pending || !nome.trim()} style={{
                padding: "9px 18px", borderRadius: 8, border: "none",
                background: "var(--color-primary)", color: "#fff",
                fontSize: 13, fontWeight: 700, cursor: "pointer",
                opacity: pending || !nome.trim() ? 0.6 : 1,
              }}>
                {pending ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const thStyle: React.CSSProperties = {
  padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 800,
  color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: ".04em",
};
const tdStyle: React.CSSProperties = { padding: "12px 14px", fontSize: 13, verticalAlign: "middle" };
const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 700, color: "var(--color-text-muted)", marginBottom: 4 };
