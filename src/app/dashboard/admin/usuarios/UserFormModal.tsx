"use client";

import { useState, useTransition } from "react";
import type { Unit, AdminLevel } from "@/types";
import type { UsuarioComRole } from "./actions";

const LEVELS: { value: AdminLevel; label: string; desc: string; color: string }[] = [
  { value: 1, label: "N1 — Admin Campo",  desc: "Controla tudo do campo",          color: "#f97316" },
  { value: 2, label: "N2 — Admin Sede",   desc: "Controla sede e setores",          color: "#4A7DB5" },
  { value: 3, label: "N3 — Admin Setor",  desc: "Controla igrejas do seu setor",    color: "#22c55e" },
  { value: 4, label: "N4 — Usuário Local",desc: "Controla apenas sua congregação",  color: "#8b5cf6" },
];

type Props = {
  units: Unit[];
  editUser?: UsuarioComRole | null;
  onClose: () => void;
  convidarAction: (fd: FormData) => Promise<void>;
  atualizarAction: (id: string, fd: FormData) => Promise<void>;
};

export default function UserFormModal({ units, editUser, onClose, convidarAction, atualizarAction }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState<AdminLevel>(editUser?.level ?? 4);

  // Filtra unidades relevantes para o nível selecionado
  const unitOptions = units.filter(u => {
    if (!u.is_active) return false;
    if (level === 1) return u.unit_type === "CAMPO";
    if (level === 2) return u.unit_type === "SEDE";
    if (level === 3) return u.unit_type === "SETOR";
    if (level === 4) return ["IGREJA", "CELULA"].includes(u.unit_type);
    return true;
  }).sort((a, b) => a.name.localeCompare(b.name));

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        if (editUser) {
          await atualizarAction(editUser.role_id, fd);
        } else {
          await convidarAction(fd);
        }
        onClose();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erro ao salvar.");
      }
    });
  }

  const selectedLevel = LEVELS.find(l => l.value === level);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "var(--color-surface)",
        borderRadius: 16,
        width: "100%", maxWidth: 500,
        boxShadow: "0 24px 60px rgba(0,0,0,.2)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px",
          borderBottom: "1px solid var(--color-border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--color-text-primary)", margin: 0 }}>
              {editUser ? "Editar Acesso" : "Convidar Usuário"}
            </h2>
            <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: "2px 0 0" }}>
              {editUser
                ? `Editando: ${editUser.email}`
                : "Um e-mail de convite será enviado automaticamente"}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", padding: 6, borderRadius: 8, display: "flex" }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* E-mail (apenas no convite) */}
          {!editUser && (
            <div>
              <label style={labelStyle}>E-mail *</label>
              <input
                name="email"
                type="email"
                placeholder="email@exemplo.com"
                required
                style={inputStyle}
              />
            </div>
          )}

          {/* Nível de acesso */}
          <div>
            <label style={labelStyle}>Nível de Acesso *</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {LEVELS.map(l => (
                <label key={l.value} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 14px",
                  border: `1px solid ${level === l.value ? l.color : "var(--color-border)"}`,
                  borderRadius: 8,
                  cursor: "pointer",
                  background: level === l.value ? `${l.color}08` : "transparent",
                  transition: "all .12s",
                }}>
                  <input
                    type="radio"
                    name="level"
                    value={l.value}
                    checked={level === l.value}
                    onChange={() => setLevel(l.value)}
                    style={{ accentColor: l.color }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: level === l.value ? l.color : "var(--color-text-primary)" }}>
                      {l.label}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{l.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Unidade */}
          <div>
            <label style={labelStyle}>
              Unidade Vinculada
              {selectedLevel && <span style={{ color: "var(--color-text-muted)", fontWeight: 400, marginLeft: 6 }}>
                ({["CAMPO","SEDE","SETOR","IGREJA/CÉLULA"][level - 1]})
              </span>}
            </label>
            <select
              name="unit_id"
              defaultValue={editUser?.unit_id ?? ""}
              style={inputStyle}
              disabled={unitOptions.length === 0}
            >
              <option value="">— nenhuma —</option>
              {unitOptions.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            {unitOptions.length === 0 && (
              <p style={{ fontSize: 11, color: "#d97706", marginTop: 4 }}>
                Nenhuma unidade do tipo compatível cadastrada. Crie primeiro em Gestão de Unidades.
              </p>
            )}
          </div>

          {/* Erro */}
          {error && (
            <div style={{
              background: "#fef2f2", border: "1px solid #fecaca",
              borderRadius: 8, padding: "10px 14px",
              color: "#dc2626", fontSize: 13,
            }}>
              {error}
            </div>
          )}

          {/* Botões */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" onClick={onClose} style={btnSecStyle} disabled={pending}>
              Cancelar
            </button>
            <button type="submit" style={btnPriStyle} disabled={pending}>
              {pending
                ? "Salvando..."
                : editUser ? "Salvar Alterações" : "Enviar Convite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 700,
  color: "var(--color-text-muted)", textTransform: "uppercase",
  letterSpacing: "0.05em", marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px",
  border: "1px solid var(--color-border)", borderRadius: 8,
  fontSize: 14, color: "var(--color-text-primary)",
  background: "var(--color-surface)", outline: "none", fontFamily: "inherit",
};
const btnSecStyle: React.CSSProperties = {
  padding: "9px 18px", border: "1px solid var(--color-border)",
  borderRadius: 8, background: "var(--color-surface)",
  color: "var(--color-text-muted)", fontSize: 13, fontWeight: 600,
  cursor: "pointer", fontFamily: "inherit",
};
const btnPriStyle: React.CSSProperties = {
  padding: "9px 20px", border: "none", borderRadius: 8,
  background: "var(--color-primary)", color: "#fff",
  fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
};
