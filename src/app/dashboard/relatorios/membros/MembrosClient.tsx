"use client";

import { useState, useTransition } from "react";
import { membrosRelatorioAction, type MembrosRelatorioResult } from "../actions";

export default function MembrosClient() {
  const [resultado, setResultado] = useState<MembrosRelatorioResult | null>(null);
  const [busca, setBusca]         = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [erro, setErro]           = useState("");
  const [isPending, start]        = useTransition();

  function gerar() {
    setErro("");
    start(async () => {
      try { setResultado(await membrosRelatorioAction(filtroStatus ? { status: filtroStatus } : {})); }
      catch (e: unknown) { setErro((e as Error).message); }
    });
  }

  const membros = (resultado?.membros ?? []).filter(m =>
    !busca ||
    m.full_name.toLowerCase().includes(busca.toLowerCase()) ||
    (m.email ?? "").toLowerCase().includes(busca.toLowerCase()) ||
    (m.telefone ?? "").includes(busca)
  );

  const inputStyle: React.CSSProperties = {
    padding: "9px 12px", borderRadius: 8,
    border: "1px solid var(--color-border)", fontSize: 13,
    background: "var(--color-bg)", color: "var(--color-text-primary)",
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <a href="/dashboard/relatorios" style={{ color: "var(--color-text-muted)", fontSize: 13 }}>← Relatórios</a>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>👥 Relatório de Membros</h1>
      </div>

      {/* Filtros */}
      <div style={{
        background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: 12, padding: "18px 20px", marginBottom: 24,
        display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end",
      }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)" }}>
          Status
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ ...inputStyle, minWidth: 160 }}>
            <option value="">Todos</option>
            <option value="ATIVO">Ativo</option>
            <option value="INATIVO">Inativo</option>
            <option value="VISITANTE">Visitante</option>
            <option value="TRANSFERIDO">Transferido</option>
            <option value="DESLIGADO">Desligado</option>
          </select>
        </label>
        <button onClick={gerar} disabled={isPending} style={{
          padding: "10px 22px", background: "#d97706", color: "#fff",
          border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer",
        }}>
          {isPending ? "Gerando..." : "Gerar Relatório"}
        </button>
        {resultado && (
          <a href={`/api/relatorios/membros/pdf${filtroStatus ? `?status=${filtroStatus}` : ""}`} target="_blank" rel="noreferrer"
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
              { label: "Total de Membros", valor: resultado.total,    cor: "#d97706" },
              { label: "Ativos",           valor: resultado.ativos,   cor: "#059669" },
              { label: "Inativos/Outros",  valor: resultado.inativos, cor: "#6b7280" },
            ].map(c => (
              <div key={c.label} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: "18px 20px", borderTop: `4px solid ${c.cor}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-muted)", marginBottom: 6 }}>{c.label}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: c.cor }}>{c.valor}</div>
              </div>
            ))}
          </div>

          {/* Busca */}
          <div style={{ marginBottom: 16 }}>
            <input value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por nome, e-mail ou telefone..."
              style={{ ...inputStyle, width: "100%", maxWidth: 360, boxSizing: "border-box" }} />
          </div>

          {/* Tabela */}
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--color-bg)" }}>
                  {["Nome", "Gênero", "Estado Civil", "Telefone", "E-mail", "Congregação", "Membro desde", "Status"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "var(--color-text-muted)", fontSize: 11, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {membros.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: "32px 20px", textAlign: "center", color: "var(--color-text-muted)" }}>Nenhum membro encontrado</td></tr>
                ) : membros.map(m => (
                  <tr key={m.id} style={{ borderTop: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "10px 14px", fontWeight: 600 }}>{m.full_name}</td>
                    <td style={{ padding: "10px 14px", color: "var(--color-text-muted)" }}>{m.gender ?? "—"}</td>
                    <td style={{ padding: "10px 14px", color: "var(--color-text-muted)" }}>{m.civil_status ?? "—"}</td>
                    <td style={{ padding: "10px 14px", color: "var(--color-text-muted)" }}>{m.telefone ?? "—"}</td>
                    <td style={{ padding: "10px 14px", color: "var(--color-text-muted)" }}>{m.email ?? "—"}</td>
                    <td style={{ padding: "10px 14px", color: "var(--color-text-muted)" }}>{m.unit_nome ?? "—"}</td>
                    <td style={{ padding: "10px 14px", color: "var(--color-text-muted)" }}>
                      {m.data_membro ? new Date(m.data_membro).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                        background: m.status === "ATIVO" ? "#d1fae5" : "#f3f4f6",
                        color:      m.status === "ATIVO" ? "#059669"  : "#6b7280",
                      }}>{m.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {membros.length > 0 && (
              <div style={{ padding: "10px 14px", borderTop: "1px solid var(--color-border)", color: "var(--color-text-muted)", fontSize: 12 }}>
                {membros.length} membro{membros.length !== 1 ? "s" : ""} exibido{membros.length !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
