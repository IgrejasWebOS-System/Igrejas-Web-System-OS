import { redirect } from "next/navigation";
import { requireAuthContext } from "@/utils/supabase/auth-context";

export default async function TesourariaDashboardPage() {
  const ctx = await requireAuthContext();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Banner de módulo pendente */}
      <div style={{
        background: "linear-gradient(135deg, #fffbeb, #fef3c7)",
        border: "1.5px solid #fde68a",
        borderRadius: 14,
        padding: "28px 32px",
        display: "flex",
        gap: 20,
        alignItems: "flex-start",
      }}>
        <div style={{ fontSize: 36 }}>🏗️</div>
        <div>
          <p style={{ fontSize: 16, fontWeight: 800, color: "#92400e", margin: "0 0 6px" }}>
            Dashboard de Tesouraria — Fase 7
          </p>
          <p style={{ fontSize: 13, color: "#78350f", margin: "0 0 12px", lineHeight: 1.6 }}>
            Este painel será implementado junto com o <strong>Módulo Financeiro (Fase 7)</strong>,
            que inclui contas bancárias, lançamentos de receita e despesa, orçamento vs. realizado
            e relatórios por unidade.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["fin_accounts", "fin_transactions", "fin_categories", "fin_budgets", "fin_transfers"].map(t => (
              <span key={t} style={{
                fontSize: 11, fontWeight: 700, fontFamily: "monospace",
                background: "#fef3c7", color: "#92400e",
                border: "1px solid #fde68a", borderRadius: 6, padding: "3px 8px",
              }}>{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Preview dos cards que virão */}
      <p style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em",
        color: "var(--color-text-muted)", margin: 0 }}>
        Pré-visualização — Disponível na Fase 7
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14, opacity: .45, pointerEvents: "none" }}>
        {[
          { label: "Entradas do Mês",    value: "R$ —",   icon: "⬆️", color: "#16a34a" },
          { label: "Saídas do Mês",      value: "R$ —",   icon: "⬇️", color: "#dc2626" },
          { label: "Saldo Atual",        value: "R$ —",   icon: "💰", color: "#4A7DB5" },
          { label: "Contas Ativas",      value: "—",      icon: "🏦", color: "#7c3aed" },
        ].map(c => (
          <div key={c.label} style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 14,
            padding: "20px 22px",
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", margin: "0 0 8px" }}>
              {c.icon} {c.label}
            </p>
            <p style={{ fontSize: 28, fontWeight: 900, color: c.color, margin: 0 }}>{c.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, opacity: .35, pointerEvents: "none" }}>
        {["Saldo das Contas por Banco/Caixa", "Gráfico — Resultado Mensal (Receita vs Despesa)"].map(t => (
          <div key={t} style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 14,
            padding: 20, height: 160,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <p style={{ fontSize: 12, color: "var(--color-text-muted)", textAlign: "center" }}>{t}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
