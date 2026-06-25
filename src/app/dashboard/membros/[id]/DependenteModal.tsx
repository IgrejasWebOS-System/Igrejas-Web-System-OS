"use client";

import { useState, useTransition } from "react";

type Props = {
  partyId: string;
  onClose: () => void;
  createAction: (responsiblePartyId: string, payload: {
    full_name: string;
    birth_date?: string;
    relationship: "FILHO" | "TUTELADO";
    data_apresentacao?: string;
    observacoes?: string;
  }) => Promise<{ error?: string }>;
};

export default function DependenteModal({ partyId, onClose, createAction }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [relationship, setRelationship] = useState<"FILHO" | "TUTELADO">("FILHO");
  const [dataApresentacao, setDataApresentacao] = useState("");
  const [observacoes, setObservacoes] = useState("");

  function handleSubmit() {
    if (!fullName.trim()) { setError("Informe o nome do dependente."); return; }
    setError(null);
    startTransition(async () => {
      const result = await createAction(partyId, {
        full_name: fullName.trim(),
        birth_date: birthDate || undefined,
        relationship,
        data_apresentacao: dataApresentacao || undefined,
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
        padding: "28px 28px 24px", width: "min(460px, 92vw)",
        boxShadow: "0 20px 60px rgba(0,0,0,.2)",
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 900, margin: "0 0 6px", color: "var(--color-text-primary)" }}>
          Cadastrar Dependente
        </h2>
        <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: "0 0 20px" }}>
          Filho ou tutelado vinculado ao responsável
        </p>

        <div style={{ display: "grid", gap: 14 }}>
          {/* Nome */}
          <div>
            <label style={labelS}>Nome Completo *</label>
            <input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Nome do dependente"
              style={inputS}
            />
          </div>

          {/* Vínculo */}
          <div>
            <label style={labelS}>Tipo de Vínculo *</label>
            <div style={{ display: "flex", gap: 10 }}>
              {(["FILHO", "TUTELADO"] as const).map(r => (
                <label key={r} style={{
                  flex: 1, display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 14px", borderRadius: 8, cursor: "pointer",
                  border: `2px solid ${relationship === r ? "var(--color-primary)" : "var(--color-border)"}`,
                  background: relationship === r ? "var(--color-primary-light)" : "var(--color-surface)",
                  transition: "all .15s",
                }}>
                  <input
                    type="radio" name="relationship" value={r}
                    checked={relationship === r}
                    onChange={() => setRelationship(r)}
                    style={{ accentColor: "var(--color-primary)" }}
                  />
                  <span style={{ fontSize: 13, fontWeight: relationship === r ? 700 : 500 }}>
                    {r === "FILHO" ? "👶 Filho(a)" : "🤝 Tutelado(a)"}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Data de nascimento e apresentação */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelS}>Data de Nascimento</label>
              <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} style={inputS} />
            </div>
            <div>
              <label style={labelS}>Data de Apresentação</label>
              <input type="date" value={dataApresentacao} onChange={e => setDataApresentacao(e.target.value)} style={inputS} />
              <span style={{ fontSize: 10, color: "var(--color-text-muted)", marginTop: 3, display: "block" }}>
                Data em que foi apresentado à congregação
              </span>
            </div>
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
            disabled={pending || !fullName.trim()}
            style={{
              padding: "9px 18px", borderRadius: 8,
              background: "var(--color-primary)", color: "#fff",
              border: "none", fontSize: 13, fontWeight: 700,
              cursor: pending || !fullName.trim() ? "not-allowed" : "pointer",
              opacity: pending || !fullName.trim() ? 0.6 : 1,
            }}
          >
            {pending ? "Salvando..." : "Cadastrar Dependente"}
          </button>
        </div>
      </div>
    </div>
  );
}
