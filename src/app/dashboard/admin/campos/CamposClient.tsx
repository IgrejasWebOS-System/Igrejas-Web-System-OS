"use client";

import { useState, useTransition } from "react";
import type { NovoCampoInput } from "./actions";
import NovoCampoModal from "./NovoCampoModal";

interface Ministry {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  ministry_branding: {
    nome_display: string;
    sigla: string;
    cor_primaria: string;
    logo_url: string | null;
    cidade: string | null;
    estado: string | null;
  } | null;
  ministry_modules: { module: string; is_active: boolean }[];
  provisioning_jobs: { status: string; started_at: string; finished_at: string | null; log: string | null }[];
}

interface Props {
  campos: Ministry[];
  onCriar: (input: NovoCampoInput) => Promise<{ ministry_id?: string; error?: string }>;
  onToggleAtivo: (id: string, ativo: boolean) => Promise<{ error?: string }>;
}

const STATUS_COLOR: Record<string, string> = {
  DONE: "#16a34a",
  RUNNING: "#d97706",
  ERROR: "#dc2626",
  PENDING: "#6b7280",
};

export default function CamposClient({ campos, onCriar, onToggleAtivo }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [filtroAtivo, setFiltroAtivo] = useState<"todos" | "ativos" | "inativos">("todos");

  const filtered = campos.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.slug.includes(q) || (c.ministry_branding?.cidade ?? "").toLowerCase().includes(q);
    const matchFiltro =
      filtroAtivo === "todos" ? true :
      filtroAtivo === "ativos" ? c.is_active :
      !c.is_active;
    return matchSearch && matchFiltro;
  });

  const ativos = campos.filter(c => c.is_active).length;

  function handleToggle(id: string, atual: boolean) {
    startTransition(async () => {
      const res = await onToggleAtivo(id, !atual);
      if (res.error) alert(res.error);
    });
  }

  const thStyle: React.CSSProperties = {
    padding: "8px 12px",
    textAlign: "left",
    fontSize: 11,
    fontWeight: 700,
    color: "var(--color-text-muted, #6b7280)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: "1px solid var(--color-border, #e5e7eb)",
    background: "var(--color-bg-subtle, #f9fafb)",
    whiteSpace: "nowrap",
  };

  const tdStyle: React.CSSProperties = {
    padding: "12px 12px",
    fontSize: 13,
    color: "var(--color-text-primary, #111827)",
    borderBottom: "1px solid var(--color-border, #f3f4f6)",
    verticalAlign: "middle",
  };

  return (
    <div>
      {/* ── Estatísticas ─────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total de campos", value: campos.length, color: "#6D28D9" },
          { label: "Ativos", value: ativos, color: "#16a34a" },
          { label: "Inativos", value: campos.length - ativos, color: "#dc2626" },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, background: "var(--color-bg-card, #fff)",
            border: "1px solid var(--color-border, #e5e7eb)",
            borderRadius: 10, padding: "14px 16px",
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "var(--color-text-muted, #6b7280)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Barra de ferramentas ─────────────────────────────────── */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <input
          style={{
            flex: 1, padding: "8px 12px", borderRadius: 8,
            border: "1px solid var(--color-border, #d1d5db)",
            fontSize: 13, background: "var(--color-bg-input, #f9fafb)",
          }}
          placeholder="Buscar por nome, slug ou cidade..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div style={{ display: "flex", gap: 4 }}>
          {(["todos","ativos","inativos"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltroAtivo(f)}
              style={{
                padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                cursor: "pointer", border: "none",
                background: filtroAtivo === f ? "#6D28D9" : "var(--color-bg-card, #fff)",
                color: filtroAtivo === f ? "#fff" : "var(--color-text-muted, #6b7280)",
                boxShadow: filtroAtivo !== f ? "0 0 0 1px var(--color-border, #e5e7eb)" : "none",
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: "8px 16px", borderRadius: 8,
            background: "#6D28D9", color: "#fff",
            border: "none", cursor: "pointer",
            fontWeight: 700, fontSize: 13,
            display: "flex", alignItems: "center", gap: 6,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ fontSize: 16 }}>+</span> Novo Campo
        </button>
      </div>

      {/* ── Tabela ───────────────────────────────────────────────── */}
      <div style={{
        background: "var(--color-bg-card, #fff)",
        border: "1px solid var(--color-border, #e5e7eb)",
        borderRadius: 12, overflow: "hidden",
      }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>
            {campos.length === 0 ? (
              <div>
                <div style={{ fontSize: 40, marginBottom: 12 }}>⛪</div>
                <p style={{ fontSize: 14, fontWeight: 600 }}>Nenhum campo cadastrado ainda</p>
                <p style={{ fontSize: 12 }}>Clique em "Novo Campo" para provisionar o primeiro campo.</p>
              </div>
            ) : (
              <p>Nenhum campo encontrado com esses filtros.</p>
            )}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Campo</th>
                  <th style={thStyle}>Localização</th>
                  <th style={thStyle}>Módulos</th>
                  <th style={thStyle}>Provisionamento</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const b = c.ministry_branding;
                  const job = c.provisioning_jobs?.[0];
                  const modulosAtivos = c.ministry_modules.filter(m => m.is_active).length;

                  return (
                    <tr key={c.id}>
                      {/* Campo */}
                      <td style={tdStyle}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 8,
                            background: b?.cor_primaria ?? "#6D28D9",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 16, flexShrink: 0,
                          }}>
                            {b?.logo_url
                              ? <img src={b.logo_url} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover" }} />
                              : "⛪"
                            }
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{b?.nome_display ?? c.name}</div>
                            <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                              {b?.sigla && <span style={{
                                background: b.cor_primaria + "22", color: b.cor_primaria,
                                padding: "1px 6px", borderRadius: 4, fontWeight: 700,
                                marginRight: 6,
                              }}>{b.sigla}</span>}
                              /{c.slug}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Localização */}
                      <td style={tdStyle}>
                        {b?.cidade ? (
                          <span style={{ fontSize: 13 }}>{b.cidade}, {b.estado}</span>
                        ) : (
                          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>—</span>
                        )}
                      </td>

                      {/* Módulos */}
                      <td style={tdStyle}>
                        <div style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          background: modulosAtivos >= 7 ? "#f0fdf4" : "#fffbeb",
                          border: `1px solid ${modulosAtivos >= 7 ? "#bbf7d0" : "#fde68a"}`,
                          borderRadius: 6, padding: "2px 8px",
                          fontSize: 12, fontWeight: 600,
                          color: modulosAtivos >= 7 ? "#166534" : "#92400e",
                        }}>
                          {modulosAtivos}/{c.ministry_modules.length} ativos
                        </div>
                      </td>

                      {/* Provisionamento */}
                      <td style={tdStyle}>
                        {job ? (
                          <span style={{
                            fontSize: 11, fontWeight: 600,
                            color: STATUS_COLOR[job.status] ?? "#6b7280",
                            background: STATUS_COLOR[job.status] + "18",
                            padding: "2px 8px", borderRadius: 4,
                          }}>
                            {job.status}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={tdStyle}>
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          color: c.is_active ? "#16a34a" : "#dc2626",
                          background: c.is_active ? "#f0fdf4" : "#fef2f2",
                          border: `1px solid ${c.is_active ? "#bbf7d0" : "#fecaca"}`,
                          padding: "2px 8px", borderRadius: 4,
                        }}>
                          {c.is_active ? "Ativo" : "Inativo"}
                        </span>
                      </td>

                      {/* Ações */}
                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => handleToggle(c.id, c.is_active)}
                            style={{
                              padding: "4px 10px", borderRadius: 6, border: "none",
                              fontSize: 11, fontWeight: 600, cursor: "pointer",
                              background: c.is_active ? "#fef2f2" : "#f0fdf4",
                              color: c.is_active ? "#dc2626" : "#16a34a",
                            }}
                          >
                            {c.is_active ? "Desativar" : "Ativar"}
                          </button>
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

      {/* ── Modal Novo Campo ──────────────────────────────────────── */}
      {showModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16,
        }}>
          <div style={{
            background: "var(--color-bg-card, #fff)",
            borderRadius: 16,
            width: "100%", maxWidth: 560,
            maxHeight: "90vh",
            overflowY: "auto",
            padding: 28,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
                ⛪ Novo Campo
              </h2>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--color-text-muted)" }}
              >
                ×
              </button>
            </div>

            <NovoCampoModal
              onCriar={onCriar}
              onClose={() => setShowModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
