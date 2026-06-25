"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OrderSituacao } from "@/types";
import { ORDER_SITUACAO_LABELS } from "@/types";
import { mudarSituacaoPedidoAction } from "../actions";

type Props = {
  pedidoId:      string;
  situacaoAtual: OrderSituacao;
};

const FLUXO: Record<OrderSituacao, OrderSituacao[]> = {
  PENDENTE:          ["CONFIRMADO", "CANCELADO"],
  CONFIRMADO:        ["PARCIALMENTE_PAGO", "PAGO", "CANCELADO"],
  PARCIALMENTE_PAGO: ["PAGO", "CANCELADO"],
  PAGO:              [],
  CANCELADO:         [],
};

export default function AtualizarSituacaoBtn({ pedidoId, situacaoAtual }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<OrderSituacao | null>(null);

  const proximas = FLUXO[situacaoAtual] ?? [];
  if (!proximas.length) return null;

  function handleConfirm() {
    if (!confirm) return;
    startTransition(async () => {
      try {
        await mudarSituacaoPedidoAction(pedidoId, confirm);
        router.refresh();
        setConfirm(null);
      } catch (e: unknown) { alert(e instanceof Error ? e.message : "Erro"); }
    });
  }

  const btnColors: Record<OrderSituacao, { bg: string; color: string }> = {
    PENDENTE:          { bg: "#fef9c3", color: "#854d0e" },
    CONFIRMADO:        { bg: "#dbeafe", color: "#1e40af" },
    PARCIALMENTE_PAGO: { bg: "#ede9fe", color: "#5b21b6" },
    PAGO:              { bg: "#dcfce7", color: "#166534" },
    CANCELADO:         { bg: "#fee2e2", color: "#dc2626" },
  };

  return (
    <>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {proximas.map(s => {
          const c = btnColors[s];
          return (
            <button key={s} onClick={() => setConfirm(s)} style={{
              padding: "10px 20px", borderRadius: 8, border: `1px solid ${c.color}44`,
              background: c.bg, color: c.color,
              fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>
              {s === "CANCELADO" ? "Cancelar pedido" : `Mover para ${ORDER_SITUACAO_LABELS[s]}`}
            </button>
          );
        })}
      </div>

      {confirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "var(--color-surface)", borderRadius: 14, padding: "24px 24px 20px", width: "100%", maxWidth: 380, boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
            <h2 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 900 }}>
              Confirmar: {ORDER_SITUACAO_LABELS[confirm]}?
            </h2>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "0 0 18px" }}>
              Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirm(null)} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--color-text-muted)" }}>
                Voltar
              </button>
              <button onClick={handleConfirm} disabled={pending} style={{
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
