"use client";

import { useState, useTransition } from "react";
import type { Unit, UnitType } from "@/types";

const UNIT_TYPES: { value: UnitType; label: string }[] = [
  { value: "CAMPO",           label: "Campo" },
  { value: "SEDE",            label: "Sede" },
  { value: "SETOR",           label: "Setor" },
  { value: "IGREJA",          label: "Igreja" },
  { value: "SUB_CONGREGACAO", label: "Sub-Congregação" },
  { value: "PONTO_PREGACAO",  label: "Ponto de Pregação" },
  { value: "CELULA",          label: "Célula" },
];

// Quais tipos podem ser pai de cada tipo
// Hierarquia: CAMPO → SEDE → SETOR → IGREJA → SUB_CONGREGACAO / PONTO_PREGACAO / CELULA
// Evolução pastoral: PONTO_PREGACAO → SUB_CONGREGACAO → IGREJA (troca apenas o unit_type)
const VALID_PARENT_TYPES: Record<UnitType, UnitType[]> = {
  CAMPO:           [],
  SEDE:            ["CAMPO"],
  SETOR:           ["CAMPO", "SEDE"],
  IGREJA:          ["SETOR", "SEDE", "CAMPO"],
  SUB_CONGREGACAO: ["IGREJA"],
  PONTO_PREGACAO:  ["IGREJA", "SUB_CONGREGACAO"],
  CELULA:          ["IGREJA", "SUB_CONGREGACAO", "PONTO_PREGACAO"],
};

type Props = {
  units: Unit[];
  editUnit?: Unit | null;
  onClose: () => void;
  createAction: (fd: FormData) => Promise<void>;
  updateAction: (id: string, fd: FormData) => Promise<void>;
};

export default function UnitFormModal({ units, editUnit, onClose, createAction, updateAction }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [unitType, setUnitType] = useState<UnitType>(editUnit?.unit_type ?? "IGREJA");

  const validParents = units.filter(u =>
    VALID_PARENT_TYPES[unitType]?.includes(u.unit_type) && u.is_active
  ).sort((a, b) => a.name.localeCompare(b.name));

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        if (editUnit) {
          await updateAction(editUnit.id, fd);
        } else {
          await createAction(fd);
        }
        onClose();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erro ao salvar.");
      }
    });
  }

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
        width: "100%", maxWidth: 520,
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
              {editUnit ? "Editar Unidade" : "Nova Unidade"}
            </h2>
            <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: "2px 0 0" }}>
              {editUnit ? `Editando: ${editUnit.name}` : "Preencha os dados da nova unidade"}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--color-text-muted)", padding: 6, borderRadius: 8,
            display: "flex", alignItems: "center",
          }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Nome */}
          <div>
            <label style={labelStyle}>Nome da Unidade *</label>
            <input
              name="name"
              defaultValue={editUnit?.name ?? ""}
              placeholder="Ex.: Igreja Sede, Setor Norte..."
              required
              style={inputStyle}
            />
          </div>

          {/* Tipo */}
          <div>
            <label style={labelStyle}>Tipo *</label>
            <select
              name="unit_type"
              value={unitType}
              onChange={e => setUnitType(e.target.value as UnitType)}
              required
              style={inputStyle}
            >
              {UNIT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Unidade pai */}
          <div>
            <label style={labelStyle}>Unidade Pai</label>
            <select
              name="parent_id"
              defaultValue={editUnit?.parent_id ?? ""}
              style={inputStyle}
              disabled={validParents.length === 0}
            >
              <option value="">
                {validParents.length === 0
                  ? "— sem unidades pai disponíveis para este tipo —"
                  : "— nenhuma (raiz) —"}
              </option>
              {validParents.map(u => (
                <option key={u.id} value={u.id}>
                  [{u.unit_type}] {u.name}
                </option>
              ))}
            </select>
            {VALID_PARENT_TYPES[unitType]?.length === 0 && (
              <p style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4 }}>
                CAMPO é sempre raiz — não tem unidade pai.
              </p>
            )}
          </div>

          {/* Ordem */}
          <div>
            <label style={labelStyle}>Ordem de Exibição</label>
            <input
              name="order_index"
              type="number"
              min={0}
              defaultValue={editUnit?.order_index ?? 0}
              style={{ ...inputStyle, width: 100 }}
            />
          </div>

          {/* Checkboxes */}
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "var(--color-text-primary)" }}>
              <input
                name="is_headquarters"
                type="checkbox"
                defaultChecked={editUnit?.is_headquarters ?? false}
                style={{ width: 16, height: 16, cursor: "pointer" }}
              />
              É sede (Headquarters)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "var(--color-text-primary)" }}>
              <input
                name="is_sector_mother"
                type="checkbox"
                defaultChecked={editUnit?.is_sector_mother ?? false}
                style={{ width: 16, height: 16, cursor: "pointer" }}
              />
              É igreja-mãe do setor
            </label>
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
              {pending ? "Salvando..." : editUnit ? "Salvar Alterações" : "Criar Unidade"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Estilos ──────────────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  color: "var(--color-text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  fontSize: 14,
  color: "var(--color-text-primary)",
  background: "var(--color-surface)",
  outline: "none",
  fontFamily: "inherit",
};

const btnSecStyle: React.CSSProperties = {
  padding: "9px 18px",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  background: "var(--color-surface)",
  color: "var(--color-text-muted)",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

const btnPriStyle: React.CSSProperties = {
  padding: "9px 20px",
  border: "none",
  borderRadius: 8,
  background: "var(--color-primary)",
  color: "#fff",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};
