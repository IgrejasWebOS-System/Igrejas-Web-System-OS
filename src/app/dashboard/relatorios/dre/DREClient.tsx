"use client";

import { useState, useTransition } from "react";
import { dreAction, type DREResult } from "../actions";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const today      = new Date();
const firstOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
const todayStr   = today.toISOString().slice(0, 10);

export default function DREClient() {
  const [de,  setDe]  = useState(firstOfMonth);
  const [ate, setAte] = useState(todayStr);
  const [resultado, setResultado] = useState<DREResult | null>(null);
  const [erro, setErro]           = useState("");
  const [isPending, start]        = useTransition();

  function gerar() {
    setErro("");
    start(async () => {
      try {
        const r = await dreAction(de, ate);
        setResultado(r);
      } catch (e: unknown) { setErro((e as Error).message); }
    });
  }

  const inputStyle: React.CSSProperties = {
    padding: "9px 12px", borderRadius: 8,
    border: "1px solid var(--color-border)", fontSize: 13,
    background: "var(--color-bg)", color: "var(--color-text-primary)",
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <a href="/dashboard/relatorios" style={{ color: "var(--color-text-muted)", fontSize: 13 }}>← Relatórios</a>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>📊 DRE — Demonstração do Resultado</h1>
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
          padding: "10px 22px", background: "#2563eb", color: "#fff",
          border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer",
        }}>
          {isPending ? "Gerando..." : "Gerar DRE"}
        </button>
        {resultado && (
          <a href={`/api/relatorios/dre/pdf?de=${de}&ate=${ate}`} target="_blank" rel="noreferrer"
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
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Cards resumo */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {[
              { label: "Total Receitas", valor: resultado.total_receitas, cor: "#059669" },
              { label: "Total Despesas", valor: resultado.total_despesas, cor: "#dc2626" },
              { label: resultado.resultado >= 0 ? "Superávit" : "Déficit", valor: Math.abs(resultado.resultado), cor: resultado.resultado >= 0 ? "#059669" : "#dc2626" },
            ].map(c => (
              <div key={c.label} style={{
                background: "var(--color-surface)", border: "1px solid var(--color-border)",
                borderRadius: 12, padding: "18px 20px", borderTop: `4px solid ${c.cor}`,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-muted)", marginBottom: 6 }}>{c.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: c.cor }}>{fmt(c.valor)}</div>
              </div>
            ))}
          </div>

          {/* Receitas */}
          <Section titulo="Receitas" linhas={resultado.receitas} cor="#059669" />

          {/* Despesas */}
          <Section titulo="Despesas" linhas={resultado.despesas} cor="#dc2626" />
        </div>
      )}
    </div>
  );
}

function Section({ titulo, linhas, cor }: { titulo: string; linhas: { categoria_cod: string; categoria_nome: string; total: number }[]; cor: string }) {
  const total = linhas.reduce((s, l) => s + l.total, 0);
  return (
    <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>{titulo}</h3>
        <span style={{ fontSize: 14, fontWeight: 800, color: cor }}>{total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
      </div>
      {linhas.length === 0 ? (
        <div style={{ padding: "24px 20px", color: "var(--color-text-muted)", fontSize: 13, textAlign: "center" }}>Nenhum lançamento no período</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--color-bg)" }}>
              <th style={{ padding: "10px 20px", textAlign: "left", fontWeight: 600, color: "var(--color-text-muted)", fontSize: 11 }}>Código</th>
              <th style={{ padding: "10px 20px", textAlign: "left", fontWeight: 600, color: "var(--color-text-muted)", fontSize: 11 }}>Categoria</th>
              <th style={{ padding: "10px 20px", textAlign: "right", fontWeight: 600, color: "var(--color-text-muted)", fontSize: 11 }}>Total</th>
              <th style={{ padding: "10px 20px", textAlign: "right", fontWeight: 600, color: "var(--color-text-muted)", fontSize: 11 }}>%</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map(l => (
              <tr key={l.categoria_cod} style={{ borderTop: "1px solid var(--color-border)" }}>
                <td style={{ padding: "11px 20px", color: "var(--color-text-muted)" }}>{l.categoria_cod}</td>
                <td style={{ padding: "11px 20px", fontWeight: 600 }}>{l.categoria_nome}</td>
                <td style={{ padding: "11px 20px", textAlign: "right", fontWeight: 700, color: cor }}>{l.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                <td style={{ padding: "11px 20px", textAlign: "right", color: "var(--color-text-muted)" }}>
                  {total > 0 ? ((l.total / total) * 100).toFixed(1) : "0.0"}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
