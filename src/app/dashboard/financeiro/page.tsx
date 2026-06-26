import { buscarDashboardFinanceiroAction } from "./actions";
import Link from "next/link";
import { FIN_TX_STATUS_COLORS, FIN_TX_STATUS_LABELS } from "@/types";

export const dynamic = "force-dynamic";

function fmtBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

export default async function FinanceiroDashboardPage() {
  const dash = await buscarDashboardFinanceiroAction().catch(() => null);

  if (!dash) {
    return (
      <div style={{ padding: "32px 28px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1C2833" }}>Financeiro</h1>
        <p style={{ color: "#dc2626", marginTop: 12 }}>
          Erro ao carregar dados. Verifique se a migration 021 foi executada no Supabase.
        </p>
      </div>
    );
  }

  const saldoColor = dash.saldo_total >= 0 ? "#166534" : "#991b1b";

  return (
    <div style={{ padding: "28px 28px", maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1C2833", margin: 0 }}>Financeiro</h1>
          <p style={{ color: "#5D6D7E", fontSize: 13, marginTop: 4 }}>
            Tesouraria — visão geral do mês atual
          </p>
        </div>
        <Link href="/dashboard/financeiro/lancamentos/novo" style={btnLink("#4A7DB5")}>
          + Novo Lançamento
        </Link>
      </div>

      {/* Cards de resumo */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
        <SummaryCard label="Saldo Total" value={fmtBRL(dash.saldo_total)} color={saldoColor} />
        <SummaryCard label="Receitas do Mês" value={fmtBRL(dash.receitas_mes)} color="#166534" />
        <SummaryCard label="Despesas do Mês" value={fmtBRL(dash.despesas_mes)} color="#991b1b" />
        <SummaryCard label="Pendentes Aprovação" value={String(dash.pendentes)} color={dash.pendentes > 0 ? "#92400e" : "#475569"} isCount />
      </div>

      {/* Contas */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 28 }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={sectionTitle}>Contas Bancárias / Caixas</h2>
            <Link href="/dashboard/financeiro/contas" style={linkStyle}>Ver todas →</Link>
          </div>
          {dash.contas.length === 0 ? (
            <EmptyState msg="Nenhuma conta cadastrada" sub="Crie uma conta em Configurações → Contas" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {dash.contas.slice(0, 6).map((c) => (
                <div key={c.id} style={cardRow}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 13, color: "#1C2833" }}>{c.nome}</span>
                    <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 8 }}>{c.tipo}</span>
                  </div>
                  <span style={{
                    fontWeight: 700, fontSize: 14,
                    color: c.saldo_atual >= 0 ? "#166534" : "#dc2626",
                  }}>
                    {fmtBRL(c.saldo_atual)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Links rápidos */}
        <div>
          <h2 style={sectionTitle}>Acesso Rápido</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { href: "/dashboard/financeiro/lancamentos", label: "📋 Lançamentos", color: "#eff6ff" },
              { href: "/dashboard/financeiro/lancamentos/novo", label: "➕ Novo Lançamento", color: "#f0fdf4" },
              { href: "/dashboard/financeiro/transferencias", label: "↔️ Transferências", color: "#fdf4ff" },
              { href: "/dashboard/financeiro/caixas", label: "📅 Caixas Mensais", color: "#fffbeb" },
              { href: "/dashboard/financeiro/contas", label: "🏦 Contas", color: "#f8fafc" },
              { href: "/dashboard/financeiro/plano", label: "📊 Plano de Contas", color: "#f8fafc" },
            ].map((item) => (
              <Link key={item.href} href={item.href} style={{
                display: "flex", alignItems: "center", padding: "14px 16px",
                background: item.color, border: "1.5px solid #e2e8f0",
                borderRadius: 10, fontWeight: 600, fontSize: 13, color: "#1C2833",
                textDecoration: "none",
              }}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Últimos lançamentos */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={sectionTitle}>Últimos Lançamentos</h2>
          <Link href="/dashboard/financeiro/lancamentos" style={linkStyle}>Ver todos →</Link>
        </div>

        {dash.ultimos_lancamentos.length === 0 ? (
          <EmptyState msg="Nenhum lançamento registrado" sub='Clique em "+ Novo Lançamento" para começar' />
        ) : (
          <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Data", "Descrição", "Categoria", "Conta", "Valor", "Status"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dash.ultimos_lancamentos.map((t) => {
                  const colors = FIN_TX_STATUS_COLORS[t.status];
                  return (
                    <tr key={t.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 14px", fontSize: 12, color: "#5D6D7E" }}>{fmtDate(t.data)}</td>
                      <td style={{ padding: "10px 14px", fontSize: 13, color: "#1C2833", maxWidth: 200 }}>
                        {t.descricao || t.category_nome}
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 12, color: "#5D6D7E" }}>
                        {t.category_codigo} — {t.category_nome}
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 12, color: "#5D6D7E" }}>{t.account_nome}</td>
                      <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, color: t.tipo === "ENTRADA" ? "#166534" : "#dc2626" }}>
                        {t.tipo === "ENTRADA" ? "+" : "-"}{fmtBRL(t.valor)}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: colors.bg, color: colors.color }}>
                          {FIN_TX_STATUS_LABELS[t.status]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color, isCount }: { label: string; value: string; color: string; isCount?: boolean }) {
  return (
    <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: "16px 20px" }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: isCount ? 28 : 20, fontWeight: 800, color }}>{value}</p>
    </div>
  );
}

function EmptyState({ msg, sub }: { msg: string; sub?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "32px 0", color: "#5D6D7E", background: "#f8fafc", borderRadius: 10 }}>
      <p style={{ fontWeight: 600 }}>{msg}</p>
      {sub && <p style={{ fontSize: 12, marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

const sectionTitle: React.CSSProperties = {
  fontSize: 13, fontWeight: 700, color: "#475569",
  textTransform: "uppercase", letterSpacing: "0.07em", margin: 0,
};
const cardRow: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 8,
  padding: "10px 14px",
};
const linkStyle: React.CSSProperties = {
  fontSize: 12, color: "#4A7DB5", fontWeight: 600, textDecoration: "none",
};
function btnLink(bg: string): React.CSSProperties {
  return {
    display: "inline-block", background: bg, color: "#fff",
    padding: "9px 18px", borderRadius: 8, fontWeight: 600,
    fontSize: 13, textDecoration: "none",
  };
}
