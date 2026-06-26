"use client";

import { useState, useTransition } from "react";
import { balanceteAction, type BalanceteResult } from "../actions";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const today       = new Date();
const firstOfYear = `${today.getFullYear()}-01-01`;
const todayStr    = today.toISOString().slice(0, 10);

export default function BalanceteClient() {
  const [de,  setDe]  = useState(firstOfYear);
  const [ate, setAte] = useState(todayStr);
  const [resultado, setResultado] = useState<BalanceteResult | null>(null);
  const [erro, setErro]           = useState("");
  const [isPending, start]        = useTransition();

  function gerar() {
    setErro("");
    start(async () => {
      try { setResultado(await balanceteAction(de, ate)); }
      catch (e: unknown) { setErro((e as Error).message); }
    });
  }

  const inputStyle: React.CSSProperties = {
    padding: "9px 12px", borderRadius: 8,
    border: "1px solid var(--color-border)", fontSize: 13,
    background: "var(--color-bg)", color: "var(--color-text-primary)",
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 960, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <a href="/dashboard/relatorios" style={{ color: "var(--color-text-muted)", fontSize: 13 }}>← Relatórios</a>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>⚖️ Balancete por Período</h1>
      </div>

      {/* Filtros */}
      <div style={{
        background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: 12, padding: "18px 20px", marginBottom: 24,
        display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end",
      }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)" }}>
          De
          <input type="date" value={de} onChange={e => setDe(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)" }}>
          Até
          <input type="date" value={ate} onChange={e => setAte(e.target.value)} style={inputStyle} />
        </label>
        <button onClick={gerar} disabled={isPending} style={{
          padding: "10px 22px", background: "#059669", color: "#fff",
          border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer",
        }}>
          {isPending ? "Gerando..." : "Gerar Balancete"}
        </button>
        {resultado && (
          <a href={`/api/relatorios/balancete/pdf?de=${de}&ate=${ate}`} target="_blank" rel="noreferrer"
            style={{ padding: "10px 18px", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none", color: "var(--color-text-primary)" }}>
            📄 Exportar PDF
          </a>
        )}
      </div>

      {erro && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#dc2626", fontSize: 13 }}>
          {erro}
        </div>
      )}

      {resultado && (
        <>
          {/* Resumo */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, marginBottom: 24 }}>
            <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: "18px 20px", borderTop: "4px solid #059669" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-muted)", marginBottom: 6 }}>Total Entradas</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#059669" }}>{fmt(resultado.total_entradas)}</div>
            </div>
            <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: "18px 20px", borderTop: "4px solid #dc2626" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-muted)", marginBottom: 6 }}>Total Saídas</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#dc2626" }}>{fmt(resultado.total_saidas)}</div>
            </div>
          </div>

          {/* Tabela */}
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--color-border)" }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Saldo por Conta</h3>
            </div>
            {resultado.linhas.length === 0 ? (
              <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--color-text-muted)", fontSize: 13 }}>
                Nenhuma movimentação no período
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--color-bg)" }}>
                    {["Conta", "Saldo Inicial", "Entradas", "Saídas", "Saldo Final"].map(h => (
                      <th key={h} style={{ padding: "10px 20px", textAlign: h === "Conta" ? "left" : "right", fontWeight: 600, color: "var(--color-text-muted)", fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resultado.linhas.map(l => (
                    <tr key={l.account_id} style={{ borderTop: "1px solid var(--color-border)" }}>
                      <td style={{ padding: "11px 20px", fontWeight: 600 }}>{l.account_nome}</td>
                      <td style={{ padding: "11px 20px", textAlign: "right", color: "var(--color-text-muted)" }}>{fmt(l.saldo_ini)}</td>
                      <td style={{ padding: "11px 20px", textAlign: "right", color: "#059669", fontWeight: 700 }}>{fmt(l.entradas)}</td>
                      <td style={{ padding: "11px 20px", textAlign: "right", color: "#dc2626", fontWeight: 700 }}>{fmt(l.saidas)}</td>
                      <td style={{ padding: "11px 20px", textAlign: "right", fontWeight: 800, color: l.saldo_fin >= 0 ? "#059669" : "#dc2626" }}>
                        {fmt(l.saldo_fin)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: "2px solid var(--color-border)", background: "var(--color-bg)" }}>
                    <td style={{ padding: "12px 20px", fontWeight: 800 }}>Total</td>
                    <td style={{ padding: "12px 20px", textAlign: "right", color: "var(--color-text-muted)", fontWeight: 700 }}>—</td>
                    <td style={{ padding: "12px 20px", textAlign: "right", color: "#059669", fontWeight: 800 }}>{fmt(resultado.total_entradas)}</td>
                    <td style={{ padding: "12px 20px", textAlign: "right", color: "#dc2626", fontWeight: 800 }}>{fmt(resultado.total_saidas)}</td>
                    <td style={{ padding: "12px 20px", textAlign: "right", fontWeight: 800, color: (resultado.total_entradas - resultado.total_saidas) >= 0 ? "#059669" : "#dc2626" }}>
                      {fmt(resultado.total_entradas - resultado.total_saidas)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
