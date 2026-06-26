import Link from "next/link";

export const dynamic = "force-dynamic";

const RELATORIOS = [
  {
    href:  "/dashboard/relatorios/dre",
    icon:  "📊",
    title: "DRE — Demonstração do Resultado",
    desc:  "Receitas vs Despesas por categoria em um período",
    color: "#2563eb",
    nivel: "N2+",
  },
  {
    href:  "/dashboard/relatorios/balancete",
    icon:  "⚖️",
    title: "Balancete por Período",
    desc:  "Saldo inicial, entradas, saídas e saldo final por conta",
    color: "#059669",
    nivel: "N2+",
  },
  {
    href:  "/dashboard/relatorios/inventario",
    icon:  "🏛️",
    title: "Inventário Patrimonial",
    desc:  "Bens cadastrados com valor de aquisição e valor contábil",
    color: "#7c3aed",
    nivel: "N3+",
  },
  {
    href:  "/dashboard/relatorios/membros",
    icon:  "👥",
    title: "Relatório de Membros",
    desc:  "Lista consolidada com filtros por congregação, status e gênero",
    color: "#d97706",
    nivel: "N2+",
  },
];

export default function RelatoriosPage() {
  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>📋 Relatórios</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>
          Relatórios gerenciais · clique para gerar e exportar em PDF
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18 }}>
        {RELATORIOS.map(r => (
          <Link key={r.href} href={r.href} style={{ textDecoration: "none" }}>
            <div style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 14,
              padding: "22px 24px",
              borderTop: `4px solid ${r.color}`,
              cursor: "pointer",
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{r.icon}</div>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: "var(--color-text-primary)", lineHeight: 1.3 }}>{r.title}</h2>
                <span style={{
                  flexShrink: 0, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                  background: r.color + "18", color: r.color,
                }}>{r.nivel}</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>{r.desc}</p>
              <div style={{ marginTop: 16, fontSize: 12, fontWeight: 600, color: r.color }}>
                Gerar relatório →
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
