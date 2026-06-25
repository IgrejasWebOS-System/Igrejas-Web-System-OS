"use client";

import { useState, useTransition } from "react";
import type { MemberLookups, ScopeType } from "@/types";

const SCOPE_OPTIONS: { value: ScopeType; label: string }[] = [
  { value: "CAMPO",           label: "Campo (nível nacional/regional)" },
  { value: "SETOR",           label: "Setor" },
  { value: "IGREJA",          label: "Igreja" },
  { value: "SUB_CONGREGACAO", label: "Sub-Congregação" },
  { value: "PONTO_PREGACAO",  label: "Ponto de Pregação" },
  { value: "CELULA",          label: "Célula" },
];

const UNIT_TYPES_FOR_SCOPE: Record<ScopeType, string[]> = {
  CAMPO:           [],
  SETOR:           ["SETOR"],
  IGREJA:          ["IGREJA"],
  SUB_CONGREGACAO: ["SUB_CONGREGACAO"],
  PONTO_PREGACAO:  ["PONTO_PREGACAO"],
  CELULA:          ["CELULA"],
};

type Props = {
  partyId: string;
  lookups: MemberLookups | null;
  onClose: () => void;
  createAction: (partyId: string, payload: {
    department_id: string; funcao_id?: string; scope_type: ScopeType;
    unit_id?: string; data_inicio?: string; observacoes?: string;
  }) => Promise<{ error?: string }>;
};

export default function FuncaoModal({ partyId, lookups, onClose, createAction }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [departmentId, setDepartmentId] = useState("");
  const [funcaoId, setFuncaoId] = useState("");
  const [scopeType, setScopeType] = useState<ScopeType>("IGREJA");
  const [unitId, setUnitId] = useState("");
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split("T")[0]);
  const [observacoes, setObservacoes] = useState("");

  const needsUnit = scopeType !== "CAMPO";
  const unitsForScope = (lookups?.units ?? []).filter(u =>
    (UNIT_TYPES_FOR_SCOPE[scopeType] ?? []).includes(u.unit_type)
  );

  function handleSubmit() {
    if (!departmentId) { setError("Selecione o departamento."); return; }
    setError(null);
    startTransition(async () => {
      const result = await createAction(partyId, {
        department_id: departmentId,
        funcao_id: funcaoId || undefined,
        scope_type: scopeType,
        unit_id: unitId || undefined,
        data_inicio: dataInicio || undefined,
        observacoes: observacoes || undefined,
      });
      if (result.error) { setError(result.error); return; }
      onClose();
    });
  }

  const inputS: React.CSSProperties = {
    width: "100%", padding: "9px 12px",
    border: "1px solid var(--color-border)", borderRadius: 8,
    fontSize: 13, color: "var(--color-text-primary)",
    background: "var(--color-surface)", boxSizing: "border-box",
  };

  const labelS: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 700,
    color: "var(--color-text-muted)", marginBottom: 5,
    textTransform: "uppercase", letterSpacing: ".04em",
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,.45)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000,
    }}>
      <div style={{
        background: "var(--color-surface)", borderRadius: 14,
        padding: "28px 28px 24px", width: "min(500px, 92vw)",
        boxShadow: "0 20px 60px rgba(0,0,0,.2)",
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 900, margin: "0 0 20px", color: "var(--color-text-primary)" }}>
          Atribuir Função Departamental
        </h2>

        <div style={{ display: "grid", gap: 14 }}>
          {/* Departamento */}
          <div>
            <label style={labelS}>Departamento *</label>
            <select value={departmentId} onChange={e => setDepartmentId(e.target.value)} style={{ ...inputS, cursor: "pointer" }}>
              <option value="">Selecione o departamento</option>
              {(lookups?.departments ?? []).map(d => (
                <option key={d.id} value={d.id}>{d.nome}{d.sigla ? ` (${d.sigla})` : ""}</option>
              ))}
            </select>
          </div>

          {/* Cargo/Função dentro do departamento */}
          <div>
            <label style={labelS}>Cargo/Função no Departamento</label>
            <select value={funcaoId} onChange={e => setFuncaoId(e.target.value)} style={{ ...inputS, cursor: "pointer" }}>
              <option value="">Membro do departamento</option>
              {(lookups?.funcoes_lookup ?? []).map(f => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>
          </div>

          {/* Escopo */}
          <div>
            <label style={labelS}>Escopo de Atuação *</label>
            <select
              value={scopeType}
              onChange={e => { setScopeType(e.target.value as ScopeType); setUnitId(""); }}
              style={{ ...inputS, cursor: "pointer" }}
            >
              {SCOPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Unidade (condicional ao scope) */}
          {needsUnit && (
            <div>
              <label style={labelS}>
                Unidade ({SCOPE_OPTIONS.find(o => o.value === scopeType)?.label})
              </label>
              <select value={unitId} onChange={e => setUnitId(e.target.value)} style={{ ...inputS, cursor: "pointer" }}>
                <option value="">Selecione</option>
                {unitsForScope.length > 0
                  ? unitsForScope.map(u => <option key={u.id} value={u.id}>{u.name}</option>)
                  : (lookups?.units ?? []).map(u => <option key={u.id} value={u.id}>{u.name}</option>)
                }
              </select>
            </div>
          )}

          {/* Data início */}
          <div>
            <label style={labelS}>Data de Início</label>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} style={inputS} />
          </div>

          {/* Observações */}
          <div>
            <label style={labelS}>Observações</label>
            <textarea
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              rows={2}
              placeholder="Observações opcionais..."
              style={{ ...inputS, resize: "vertical" }}
            />
          </div>
        </div>

        {error && (
          <div style={{
            marginTop: 14, padding: "8px 12px",
            background: "#fff5f5", border: "1px solid #fed7d7",
            borderRadius: 8, fontSize: 12, color: "#c53030",
          }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
          <button onClick={onClose} disabled={pending} style={{
            padding: "9px 18px", borderRadius: 8,
            border: "1px solid var(--color-border)", background: "var(--color-surface)",
            fontSize: 13, cursor: "pointer", color: "var(--color-text-muted)",
          }}>
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={pending || !departmentId}
            style={{
              padding: "9px 18px", borderRadius: 8,
              background: "var(--color-primary)", color: "#fff",
              border: "none", fontSize: 13, fontWeight: 700,
              cursor: pending || !departmentId ? "not-allowed" : "pointer",
              opacity: pending || !departmentId ? 0.6 : 1,
            }}
          >
            {pending ? "Salvando..." : "Atribuir Função"}
          </button>
        </div>
      </div>
    </div>
  );
}
