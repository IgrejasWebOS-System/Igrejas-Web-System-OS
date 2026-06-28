"use client";

import { useState, useTransition } from "react";
import { createMinisterioAction } from "./admin-actions";

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: "1px solid var(--color-border)",
  fontSize: 13, color: "var(--color-text-primary)",
  background: "var(--color-bg)",
  outline: "none", boxSizing: "border-box",
};

const label: React.CSSProperties = {
  display: "block", fontSize: 10, fontWeight: 700,
  color: "var(--color-text-muted)",
  textTransform: "uppercase", letterSpacing: "0.06em",
  marginBottom: 4,
};

export default function CriarMinisterioInline() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createMinisterioAction(fd);
      if (result?.error) setError(result.error);
      // Se não houver erro, o action redireciona automaticamente
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          width: "100%", padding: "9px", borderRadius: 8,
          border: "1px dashed var(--color-primary-muted)",
          color: "var(--color-primary)", fontSize: 12, fontWeight: 600,
          cursor: "pointer", background: "rgba(74, 125, 181, 0.07)",
        }}
      >
        + Provisionar novo campo
      </button>
    );
  }

  return (
    <div style={{
      border: "1px solid var(--color-primary)",
      borderRadius: 10, padding: "14px 16px",
      background: "rgba(74, 125, 181, 0.04)",
      marginTop: 4,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-primary)" }}>
          ⛪ Novo Campo / Ministério
        </div>
        <button
          type="button" onClick={() => { setOpen(false); setError(""); }}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: 16, lineHeight: 1 }}
        >
          ×
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

          <div>
            <label style={label}>Nome do campo *</label>
            <input
              name="name" type="text" required
              placeholder="Ex: Campo Piracicaba"
              style={inp}
              autoFocus
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <label style={label}>Sigla (até 6 letras)</label>
              <input
                name="sigla" type="text"
                placeholder="Ex: CPIR"
                maxLength={6}
                style={inp}
              />
            </div>
            <div>
              <label style={label}>Descrição</label>
              <input
                name="description" type="text"
                placeholder="Opcional"
                style={inp}
              />
            </div>
          </div>

          {error && (
            <div style={{
              background: "var(--color-danger-bg)", border: "1px solid #F1948A",
              borderRadius: 8, padding: "8px 12px",
              fontSize: 12, color: "var(--color-danger)", fontWeight: 600,
            }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="submit" disabled={isPending}
              style={{
                flex: 1, padding: "9px", borderRadius: 8,
                background: isPending ? "var(--color-primary-muted)" : "var(--color-primary)",
                color: "#fff", border: "none", fontSize: 13, fontWeight: 700,
                cursor: isPending ? "not-allowed" : "pointer",
              }}
            >
              {isPending ? "Criando..." : "Criar campo →"}
            </button>
            <button
              type="button" onClick={() => { setOpen(false); setError(""); }}
              style={{
                padding: "9px 16px", borderRadius: 8,
                background: "var(--color-bg)", border: "1px solid var(--color-border)",
                fontSize: 12, color: "var(--color-text-muted)", cursor: "pointer",
              }}
            >
              Cancelar
            </button>
          </div>

          <p style={{ fontSize: 10, color: "var(--color-text-muted)", margin: 0 }}>
            O slug será gerado automaticamente a partir do nome.
            Acesse o campo criado para configurar módulos, branding e administradores.
          </p>
        </div>
      </form>
    </div>
  );
}
