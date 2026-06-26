"use client";

import { useState, useTransition } from "react";
import { configurarGatewayAction } from "./actions";

type Gateway = { id: string; provider: string; ativo: boolean; test_mode: boolean };
type Pedido  = { id: string; referencia_tipo: string; valor: number; status: string; created_at: string; parties: { full_name: string } | null };

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  PENDENTE:    { bg: "#fef9c3", color: "#92400e" },
  PAGO:        { bg: "#d1fae5", color: "#065f46" },
  CANCELADO:   { bg: "#f3f4f6", color: "#6b7280" },
  FALHOU:      { bg: "#fee2e2", color: "#dc2626" },
  REEMBOLSADO: { bg: "#eff6ff", color: "#2563eb" },
};
const BRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const TABS = ["Pedidos", "Gateways"] as const;
const inp: React.CSSProperties = { padding: "9px 12px", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 13, background: "var(--color-bg)", color: "var(--color-text-primary)", width: "100%", boxSizing: "border-box" };
const lbl: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)" };

export default function PagamentosClient({ gateways, pedidos }: { gateways: Gateway[]; pedidos: Pedido[] }) {
  const [tab, setTab]       = useState<typeof TABS[number]>("Pedidos");
  const [showModal, setShowModal] = useState(false);
  const [erro, setErro]     = useState("");
  const [msg, setMsg]       = useState("");
  const [isPending, start]  = useTransition();

  async function handleGateway(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErro(""); setMsg("");
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try { await configurarGatewayAction(fd); setShowModal(false); setMsg("✅ Gateway configurado"); window.location.reload(); }
      catch (ex: unknown) { setErro((ex as Error).message); }
    });
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>💳 Pagamentos</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>Pagar.me · Stripe · Mercado Pago</p>
        </div>
        {tab === "Gateways" && <button onClick={() => { setErro(""); setShowModal(true); }} style={{ padding: "10px 18px", background: "var(--color-primary)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ Configurar Gateway</button>}
      </div>

      {msg  && <div style={{ background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#065f46" }}>{msg}</div>}
      {erro && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#dc2626" }}>{erro}</div>}

      <div style={{ background: "#fffbeb", border: "1px solid #fbbf24", borderRadius: 10, padding: "12px 16px", marginBottom: 24, fontSize: 13, color: "#92400e" }}>
        ⚠️ <strong>Scaffold</strong> — Integração com gateway de pagamento requer configuração de credenciais reais. Consulte a documentação de cada provedor.
      </div>

      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid var(--color-border)", marginBottom: 24 }}>
        {TABS.map(t => <button key={t} onClick={() => setTab(t)} style={{ padding: "10px 20px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 700, color: tab === t ? "var(--color-primary)" : "var(--color-text-muted)", borderBottom: tab === t ? "2px solid var(--color-primary)" : "2px solid transparent", marginBottom: -2 }}>{t}</button>)}
      </div>

      {tab === "Pedidos" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {pedidos.length === 0 ? <p style={{ textAlign: "center", padding: 60, color: "var(--color-text-muted)" }}>Nenhum pedido registrado</p> :
            pedidos.map(p => {
              const ss = STATUS_STYLE[p.status] ?? STATUS_STYLE.PENDENTE;
              return (
                <div key={p.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{(p.parties as { full_name?: string } | null)?.full_name ?? "—"} · {p.referencia_tipo}</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>{new Date(p.created_at).toLocaleDateString("pt-BR")}</div>
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <span style={{ fontWeight: 800, fontSize: 14 }}>{BRL(p.valor)}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: ss.bg, color: ss.color }}>{p.status}</span>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {tab === "Gateways" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
          {["PAGARME","STRIPE","MERCADOPAGO"].map(prov => {
            const gw = gateways.find(g => g.provider === prov);
            return (
              <div key={prov} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: "20px 20px" }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 8 }}>{prov === "PAGARME" ? "Pagar.me" : prov === "STRIPE" ? "Stripe" : "Mercado Pago"}</div>
                {gw ? (
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: gw.ativo ? "#d1fae5" : "#fee2e2", color: gw.ativo ? "#065f46" : "#dc2626" }}>{gw.ativo ? "Ativo" : "Inativo"}</span>
                    {gw.test_mode && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, background: "#fef9c3", color: "#92400e", padding: "2px 8px", borderRadius: 10 }}>Sandbox</span>}
                  </div>
                ) : (
                  <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Não configurado</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: "var(--color-surface)", borderRadius: 14, padding: 28, width: "100%", maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleGateway} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800 }}>Configurar Gateway</h2>
              {erro && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", color: "#dc2626", fontSize: 13 }}>{erro}</div>}
              <label style={lbl}>Provedor<select name="provider" defaultValue="PAGARME" style={inp}><option value="PAGARME">Pagar.me</option><option value="STRIPE">Stripe</option><option value="MERCADOPAGO">Mercado Pago</option></select></label>
              <label style={lbl}>API Key (secreta)<input name="api_key" type="password" style={inp} placeholder="sk_... ou ak_..." /></label>
              <label style={lbl}>Webhook URL (receber notificações)<input name="webhook_url" type="url" style={inp} placeholder="https://..." /></label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" name="test_mode" id="test_mode" defaultChecked /><label htmlFor="test_mode" style={{ fontSize: 13 }}>Modo sandbox/teste</label></div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><button type="button" onClick={() => setShowModal(false)} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", cursor: "pointer", fontSize: 13 }}>Cancelar</button><button type="submit" disabled={isPending} style={{ padding: "9px 18px", borderRadius: 8, background: "var(--color-primary)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{isPending ? "Salvando..." : "Salvar"}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
