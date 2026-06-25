"use client";

import { useState, useTransition } from "react";
import type { Unit } from "@/types";

type TransferTipo = "INTRA" | "INTER" | "RETORNO";

const TIPO_CONFIG: Record<TransferTipo, { label: string; desc: string; color: string }> = {
  INTRA: {
    label: "Transferência Interna",
    desc: "Entre igrejas do mesmo campo",
    color: "#2563eb",
  },
  INTER: {
    label: "Transferência Externa",
    desc: "Para outro campo/ministério",
    color: "#7c3aed",
  },
  RETORNO: {
    label: "Retorno",
    desc: "Retorno após desligamento",
    color: "#16a34a",
  },
};

type Props = {
  partyId: string;
  currentUnitId: string | null;
  units: Unit[];
  onClose: () => void;
  transferAction: (partyId: string, payload: {
    unit_destino_id: string;
    tipo: "INTRA" | "INTER" | "DESLIGAMENTO" | "RETORNO";
    data_transferencia?: string;
    obs?: string;
  }) => Promise<{ error?: string }>;
};

export default function TransferenciaModal({
  partyId, currentUnitId, units, onClose, transferAction,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [tipo, setTipo] = useState<TransferTipo>("INTRA");
  const [unitDestinoId, setUnitDestinoId] = useState("");
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [obs, setObs] = useState("");

  const destinos = units.filter(
    u =>
      u.id !== currentUnitId &&
      ["IGREJA", "SUB_CONGREGACAO", "PONTO_PREGACAO"].includes(u.unit_type)
  );

  function handleSubmit() {
    if (!unitDestinoId) { setError("Selecione a unidade de destino."); return; }
    setError(null);
    startTransition(async () => {
      const result = await transferAction(partyId, {
        unit_destino_id: unitDestinoId,
        tipo,
        data_transferencia: data,
        obs: obs || undefined,
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
        <h2 style={{ fontSize: 16, fontWeight: 900, margin: "0 0 6px", color: "var(--color-text-primary)" }}>
          Transferir Membro
        </h2>
        <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: "0 0 20px" }}>
          Registra a transferência e atualiza a unidade do membro
        </p>

        <div style={{ display: "grid", gap: 14 }}>
          {/* Tipo de transferência */}
          <div>
            <label style={labelS}>Tipo de Transferência *</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {(Object.entries(TIPO_CONFIG) as [TransferTipo, typeof TIPO_CONFIG[TransferTipo]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTipo(key)}
                  style={{
                    padding: "10px 8px", borderRadius: 9, cursor: "pointer",
                    border: `2px solid ${tipo === key ? cfg.color : "var(--color-border)"}`,
                    background: tipo === key ? `${cfg.color}14` : "var(--color-surface)",
                    textAlign: "center", transition: "all .15s",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 800, color: tipo === key ? cfg.color : "var(--color-text-primary)" }}>
                    {cfg.label}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--color-text-muted)", marginTop: 2 }}>
                    {cfg.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Unidade destino */}
          <div>
            <label style={labelS}>Unidade de Destino *</label>
            <select value={unitDestinoId} onChange={e => setUnitDestinoId(e.target.value)} style={{ ...inputS, cursor: "pointer" }}>
              <option value="">Selecione a unidade</option>
              {destinos.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          {/* Data */}
          <div>
            <label style={labelS}>Data da Transferência</label>
            <input type="date" value={data} onChange={e => setData(e.target.value)} style={inputS} />
          </div>

          {/* Observação */}
          <div>
            <label style={labelS}>Motivo / Observações</label>
            <textarea
              value={obs}
              onChange={e => setObs(e.target.value)}
              rows={2}
              placeholder="Motivo da transferência (opcional)..."
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
            disabled={pending || !unitDestinoId}
            style={{
              padding: "9px 18px", borderRadius: 8,
              background: TIPO_CONFIG[tipo].color, color: "#fff",
              border: "none", fontSize: 13, fontWeight: 700,
              cursor: pending || !unitDestinoId ? "not-allowed" : "pointer",
              opacity: pending || !unitDestinoId ? 0.6 : 1,
            }}
          >
            {pending ? "Registrando..." : "Confirmar Transferência"}
          </button>
        </div>
      </div>
    </div>
  );
}
