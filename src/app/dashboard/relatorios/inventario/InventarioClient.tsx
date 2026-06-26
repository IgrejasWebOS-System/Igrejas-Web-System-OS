"use client";

import { useState, useTransition } from "react";
import { inventarioAction, type InventarioResult } from "../actions";

const fmt  = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtP = (v: number | null) => v != null ? `${v.toFixed(2)}%` : "—";

const STATUS_COLOR: Record<string, string> = {
  ATIVO: "#059669", INATIVO: "#6b7280", EM_MANUTENCAO: "#d97706", DESCARTADO: "#dc2626",
};

export default function InventarioClient() {
  const [dataRef, setDataRef]     = useState(new Date().toISOString().slice(0, 10));
  const [resultado, setResultado] = useState<InventarioResult | null>(null);
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroStatus, setFiltroStatus]       = useState("");
  const [busca, setBusca]                     = useState("");
  const [erro, setErro]                       = useState("");
  const [isPending, start]                    = useTransition();

  function gerar() {
    setErro("");
    start(async () => {
      try { setResultado(await inventarioAction(dataRef)); }
      catch (e: unknown) { setErro((e as Error).message); }
    });
  }

  const categorias = resultado ? [...new Set(resultado.itens.map(i => i.categoria))].sort() : [];
  const statuses   = resultado ? [...new Set(resultado.itens.map(i => i.status))].sort() : [];

  const itens = (resultado?.itens ?? []).filter(i => {
    if (filtroCategoria && i.categoria !== filtroCategoria) return false;
    if (filtroStatus    && i.status    !== filtroStatus)    return false;
    if (busca && !i.nome.toLowerCase().includes(busca.toLowerCase()) &&
        !i.numero_tombamento.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  const inputStyle: React.CSSProperties = {
    padding: "9px 12px", borderRadius: 8,
    border: "1px solid var(--color-border)", fontSize: 13,
    background: "var(--color-bg)", color: "var(--color-text-primary)",
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <a href="/dashboard/relatorios" style={{ color: "var(--color-text-muted)", fontSize: 13 }}>← Relatórios</a>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>🏛️ Inventário Patrimonial</h1>
      </div>

      {/* Filtros */}
      <div style={{
        background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: 12, padding: "18px 20px", marginBottom: 24,
        display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end",
      }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)" }}>
          Data de Referência
          <input type="date" value={dataRef} onChange={e => setDataRef(e.target.value)} style={inputStyle} />
        </label>
        <button onClick={gerar} disabled={isPending} style={{
          padding: "10px 22px", background: "#7c3aed", color: "#fff",
          border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer",
        }}>
          {isPending ? "Gerando..." : "Gerar Inventário"}
        </button>
        {resultado && (
          <a href={`/api/relatorios/inventario/pdf?data_ref=${dataRef}`} target="_blank" rel="noreferrer"
            style={{ padding: "10px 18px", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none", color: "var(--color-text-primary)" }}>
            📄 Exportar PDF
          </a>
        )}
      </div>

      {erro && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#dc2626", fontSize: 13 }}>{erro}</div>
      )}

      {resultado && (
        <>
          {/* Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
            {[
              { label: "Total de Bens",        valor: `${resultado.itens.length} itens`, cor: "#7c3aed" },
              { label: "Valor de Aquisição",   valor: fmt(resultado.total_aquisicao),    cor: "#2563eb" },
              { label: "Valor Contábil Atual", valor: fmt(resultado.total_contabil),     cor: "#059669" },
            ].map(c => (
              <div key={c.label} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: "18px 20px", borderTop: `4px solid ${c.cor}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-muted)", marginBottom: 6 }}>{c.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: c.cor }}>{c.valor}</div>
              </div>
            ))}
          </div>

          {/* Sub-filtros */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome ou tombamento..."
              style={{ ...inputStyle, maxWidth: 260 }} />
            <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} style={{ ...inputStyle, maxWidth: 180 }}>
              <option value="">Todas as categorias</option>
              {categorias.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ ...inputStyle, maxWidth: 180 }}>
              <option value="">Todos os status</option>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Tabela */}
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--color-bg)" }}>
                  {["Tombamento", "Nome", "Categoria", "Aquisição", "Vl. Aquisição", "Taxa Dep.", "Vl. Contábil", "Status", "Local"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: h === "Tombamento" || h === "Nome" || h === "Categoria" || h === "Local" ? "left" : "right", fontWeight: 600, color: "var(--color-text-muted)", fontSize: 11, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {itens.length === 0 ? (
                  <tr><td colSpan={9} style={{ padding: "32px 20px", textAlign: "center", color: "var(--color-text-muted)" }}>Nenhum item encontrado</td></tr>
                ) : itens.map(i => (
                  <tr key={i.id} style={{ borderTop: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "10px 14px", fontFamily: "monospace", color: "var(--color-text-muted)" }}>{i.numero_tombamento}</td>
                    <td style={{ padding: "10px 14px", fontWeight: 600, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.nome}</td>
                    <td style={{ padding: "10px 14px", color: "var(--color-text-muted)" }}>{i.categoria}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", color: "var(--color-text-muted)" }}>{new Date(i.data_aquisicao).toLocaleDateString("pt-BR")}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right" }}>{fmt(i.valor_aquisicao)}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", color: "var(--color-text-muted)" }}>{fmtP(i.taxa_depreciacao_anual)}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: "#7c3aed" }}>{fmt(i.valor_contabil)}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                        background: (STATUS_COLOR[i.status] ?? "#6b7280") + "18",
                        color: STATUS_COLOR[i.status] ?? "#6b7280",
                      }}>{i.status}</span>
                    </td>
                    <td style={{ padding: "10px 14px", color: "var(--color-text-muted)" }}>{i.localizacao ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
