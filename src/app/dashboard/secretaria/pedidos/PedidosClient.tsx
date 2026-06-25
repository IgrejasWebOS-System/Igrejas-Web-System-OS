"use client";

import { useState } from "react";
import type { MaterialOrderListItem, OrderSituacao } from "@/types";
import { ORDER_SITUACAO_LABELS, ORDER_SITUACAO_COLORS } from "@/types";
import { mudarSituacaoPedidoAction } from "./actions";
import { useTransition } from "react";

type Props = {
  pedidos:  MaterialOrderListItem[];
  units:    { id: string; nome: string }[];
  isAdmin:  boolean;
};

const SITUACOES: OrderSituacao[] = [
  "PENDENTE","CONFIRMADO","PARCIALMENTE_PAGO","PAGO","CANCELADO",
];

const inputStyle: React.CSSProperties = {
  width: "100%", border: "1px solid var(--color-border)", borderRadius: 8,
  padding: "8px 12px", fontSize: 13, color: "var(--color-text-primary)",
  background: "var(--color-surface)", outline: "none", boxSizing: "border-box",
};

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type Confirm = { pedido: MaterialOrderListItem; nova: OrderSituacao };

export default function PedidosClient({ pedidos: init, units, isAdmin }: Props) {
  const [pedidos, setPedidos] = useState(init);
  const [filtroSit, setFiltroSit]   = useState<OrderSituacao | "">("");
  const [filtroUnit, setFiltroUnit] = useState("");
  const [confirm, setConfirm]       = useState<Confirm | null>(null);
  const [pending, startTransition]  = useTransition();

  const filtrados = pedidos.filter(p => {
    if (filtroSit  && p.situacao !== filtroSit)  return false;
    if (filtroUnit && p.unit_id  !== filtroUnit) return false;
    return true;
  });

  const totaisSit = SITUACOES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = pedidos.filter(p => p.situacao === s).length;
    return acc;
  }, {});

  function handleConfirm() {
    if (!confirm) return;
    const { pedido, nova } = confirm;
    startTransition(async () => {
      try {
        await mudarSituacaoPedidoAction(pedido.id, nova);
        setPedidos(prev => prev.map(p => p.id === pedido.id ? { ...p, situacao: nova } : p));
        setConfirm(null);
      } catch (e: unknown) { alert(e instanceof Error ? e.message : "Erro"); }
    });
  }

  return (
    <>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12 }}>
        {SITUACOES.map(s => {
          const sc = ORDER_SITUACAO_COLORS[s];
          return (
            <div key={s} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, padding: "12px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 4 }}>
                {ORDER_SITUACAO_LABELS[s]}
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: sc.color }}>{totaisSit[s] ?? 0}</div>
            </div>
          );
        })}
      </div>

      {/* Filtros + botão */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <select value={filtroSit} onChange={e => setFiltroSit(e.target.value as OrderSituacao | "")} style={{ ...inputStyle, maxWidth: 200 }}>
          <option value="">Todas situações</option>
          {SITUACOES.map(s => <option key={s} value={s}>{ORDER_SITUACAO_LABELS[s]}</option>)}
        </select>
        {units.length > 0 && (
          <select value={filtroUnit} onChange={e => setFiltroUnit(e.target.value)} style={{ ...inputStyle, maxWidth: 200 }}>
            <option value="">Todas unidades</option>
            {units.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        )}
        <div style={{ flex: 1 }} />
        <a href="/dashboard/secretaria/pedidos/novo" style={{
          padding: "9px 18px", borderRadius: 8, border: "none",
          background: "var(--color-primary)", color: "#fff",
          fontSize: 13, fontWeight: 700, cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: 6,
          textDecoration: "none",
        }}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Novo Pedido
        </a>
      </div>

      {/* Tabela */}
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, overflow: "hidden" }}>
        {filtrados.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--color-text-muted)" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
            <div style={{ fontWeight: 700 }}>Nenhum pedido encontrado</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F7FAFD", borderBottom: "1px solid var(--color-border)" }}>
                {["Data","Unidade","Itens","Total","Situação","Solicitante",""].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 800, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: ".04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p, i) => {
                const sc = ORDER_SITUACAO_COLORS[p.situacao];
                return (
                  <tr key={p.id} style={{ borderBottom: i < filtrados.length - 1 ? "1px solid var(--color-border)" : "none" }}>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--color-text-muted)" }}>
                      {new Date(p.data_pedido + "T12:00").toLocaleDateString("pt-BR")}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 13 }}>{p.unit_nome ?? "—"}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700 }}>{p.qtd_itens}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700 }}>{fmt(p.total)}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>
                        {ORDER_SITUACAO_LABELS[p.situacao]}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--color-text-muted)" }}>
                      {p.criado_por_nome ?? "—"}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <a href={`/dashboard/secretaria/pedidos/${p.id}`} style={{
                          background: "var(--color-primary-light)", color: "var(--color-primary)",
                          border: "none", borderRadius: 6, padding: "5px 12px",
                          fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "none",
                        }}>Ver</a>
                        {isAdmin && p.situacao !== "CANCELADO" && p.situacao !== "PAGO" && (
                          <>
                            {p.situacao === "PENDENTE" && (
                              <button onClick={() => setConfirm({ pedido: p, nova: "CONFIRMADO" })}
                                style={{ background: "#dbeafe", color: "#1e40af", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                Confirmar
                              </button>
                            )}
                            {(p.situacao === "CONFIRMADO" || p.situacao === "PARCIALMENTE_PAGO") && (
                              <button onClick={() => setConfirm({ pedido: p, nova: "PAGO" })}
                                style={{ background: "#dcfce7", color: "#166534", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                Marcar Pago
                              </button>
                            )}
                            <button onClick={() => setConfirm({ pedido: p, nova: "CANCELADO" })}
                              style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                              Cancelar
                            </button>
                          </>
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

      {/* Modal confirmação */}
      {confirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "var(--color-surface)", borderRadius: 14, padding: "24px 24px 20px", width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
            <h2 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 900 }}>
              Mover para "{ORDER_SITUACAO_LABELS[confirm.nova]}"?
            </h2>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "0 0 18px" }}>
              Pedido de <strong>{confirm.pedido.unit_nome ?? "—"}</strong> · {fmt(confirm.pedido.total)}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirm(null)} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--color-text-muted)" }}>
                Cancelar
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
