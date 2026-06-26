"use client";

type KPIs = { totalMembros: number; membrosAtivos: number; receitas: number; despesas: number; saldo: number; eventosProximos: number; totalPatrimonio: number };
type FinRow = { mes: string; total_receitas: number; total_despesas: number; saldo_liquido: number };
type MembRow = { mes: string; novos_membros: number; ativos_novos: number };

const BRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const mesLabel = (m: string) => { const d = new Date(m + "T00:00:00"); return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }); };

function KpiCard({ label, value, sub, color = "#7c3aed" }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: "20px 22px", borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 900, color: "var(--color-text-primary)" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Gráfico de barras SVG puro ──────────────────────────────────────────────
function BarChartSVG({ data, bars, height = 260 }: {
  data: Record<string, number | string>[];
  bars: { key: string; label: string; color: string }[];
  height?: number;
}) {
  const W = 800; const H = height; const PL = 56; const PR = 16; const PT = 12; const PB = 36;
  const chartW = W - PL - PR; const chartH = H - PT - PB;
  const n = data.length;
  if (n === 0) return null;

  const maxVal = Math.max(...data.flatMap(d => bars.map(b => Number(d[b.key]) || 0)), 1);
  const tickCount = 4;
  const groupW = chartW / n;
  const barW = Math.min(groupW / bars.length - 4, 28);

  const yTick = (i: number) => { const v = (maxVal * i) / tickCount; return v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v.toFixed(0)}`; };
  const yPos = (v: number) => PT + chartH - (v / maxVal) * chartH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height }} aria-hidden="true">
      {/* grid */}
      {Array.from({ length: tickCount + 1 }, (_, i) => {
        const y = PT + chartH - (chartH * i) / tickCount;
        return <g key={i}>
          <line x1={PL} x2={W - PR} y1={y} y2={y} stroke="var(--color-border)" strokeDasharray="3 3" />
          <text x={PL - 6} y={y + 4} fontSize={10} textAnchor="end" fill="var(--color-text-muted)">{yTick(i)}</text>
        </g>;
      })}
      {/* bars */}
      {data.map((d, i) => {
        const cx = PL + i * groupW + groupW / 2;
        const totalBarW = bars.length * barW + (bars.length - 1) * 3;
        return (
          <g key={i}>
            {bars.map((b, bi) => {
              const v = Number(d[b.key]) || 0;
              const x = cx - totalBarW / 2 + bi * (barW + 3);
              const h = (v / maxVal) * chartH;
              return <rect key={b.key} x={x} y={yPos(v)} width={barW} height={h} fill={b.color} rx={3} opacity={0.88} />;
            })}
            <text x={cx} y={H - 8} fontSize={10} textAnchor="middle" fill="var(--color-text-muted)">{mesLabel(String(d.mes))}</text>
          </g>
        );
      })}
      {/* axes */}
      <line x1={PL} x2={PL} y1={PT} y2={PT + chartH} stroke="var(--color-border)" />
      <line x1={PL} x2={W - PR} y1={PT + chartH} y2={PT + chartH} stroke="var(--color-border)" />
    </svg>
  );
}

// ── Gráfico de linhas SVG puro ──────────────────────────────────────────────
function LineChartSVG({ data, lines, height = 240 }: {
  data: Record<string, number | string>[];
  lines: { key: string; label: string; color: string }[];
  height?: number;
}) {
  const W = 800; const H = height; const PL = 40; const PR = 16; const PT = 12; const PB = 36;
  const chartW = W - PL - PR; const chartH = H - PT - PB;
  const n = data.length;
  if (n === 0) return null;

  const maxVal = Math.max(...data.flatMap(d => lines.map(l => Number(d[l.key]) || 0)), 1);
  const tickCount = 4;
  const xPos = (i: number) => PL + (i / Math.max(n - 1, 1)) * chartW;
  const yPos = (v: number) => PT + chartH - (v / maxVal) * chartH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height }} aria-hidden="true">
      {Array.from({ length: tickCount + 1 }, (_, i) => {
        const y = PT + chartH - (chartH * i) / tickCount;
        const v = Math.round((maxVal * i) / tickCount);
        return <g key={i}>
          <line x1={PL} x2={W - PR} y1={y} y2={y} stroke="var(--color-border)" strokeDasharray="3 3" />
          <text x={PL - 6} y={y + 4} fontSize={10} textAnchor="end" fill="var(--color-text-muted)">{v}</text>
        </g>;
      })}
      {lines.map(l => {
        const pts = data.map((d, i) => `${xPos(i)},${yPos(Number(d[l.key]) || 0)}`).join(" ");
        return <polyline key={l.key} points={pts} fill="none" stroke={l.color} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />;
      })}
      {data.map((d, i) => (
        <text key={i} x={xPos(i)} y={H - 8} fontSize={10} textAnchor="middle" fill="var(--color-text-muted)">{mesLabel(String(d.mes))}</text>
      ))}
      <line x1={PL} x2={PL} y1={PT} y2={PT + chartH} stroke="var(--color-border)" />
      <line x1={PL} x2={W - PR} y1={PT + chartH} y2={PT + chartH} stroke="var(--color-border)" />
    </svg>
  );
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 12 }}>
      {items.map(it => (
        <span key={it.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-text-muted)" }}>
          <span style={{ width: 12, height: 12, borderRadius: 2, background: it.color, display: "inline-block" }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

export default function AnalyticsClient({ kpis, financeiro, membros }: { kpis: KPIs; financeiro: FinRow[]; membros: MembRow[] }) {
  const finData = financeiro.map(r => ({ ...r, total_receitas: Number(r.total_receitas), total_despesas: Number(r.total_despesas) }));
  const memData = membros.map(r => ({ ...r, novos_membros: Number(r.novos_membros), ativos_novos: Number(r.ativos_novos) }));

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>📊 Analytics & BI</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>Visão consolidada · Ano corrente</p>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 14, marginBottom: 32 }}>
        <KpiCard label="Membros" value={kpis.totalMembros.toString()} sub={`${kpis.membrosAtivos} ativos`} color="#2563eb" />
        <KpiCard label="Receitas (ano)" value={BRL(kpis.receitas)} color="#059669" />
        <KpiCard label="Despesas (ano)" value={BRL(kpis.despesas)} color="#dc2626" />
        <KpiCard label="Saldo (ano)" value={BRL(kpis.saldo)} color={kpis.saldo >= 0 ? "#059669" : "#dc2626"} />
        <KpiCard label="Eventos Próximos" value={kpis.eventosProximos.toString()} color="#7c3aed" />
        <KpiCard label="Patrimônio" value={BRL(kpis.totalPatrimonio)} color="#d97706" />
      </div>

      {/* Gráfico Financeiro */}
      {finData.length > 0 && (
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 10px" }}>Receitas × Despesas — últimos 12 meses</h2>
          <Legend items={[{ label: "Receitas", color: "#059669" }, { label: "Despesas", color: "#dc2626" }]} />
          <BarChartSVG data={finData} bars={[{ key: "total_receitas", label: "Receitas", color: "#059669" }, { key: "total_despesas", label: "Despesas", color: "#dc2626" }]} />
        </div>
      )}

      {/* Gráfico Membros */}
      {memData.length > 0 && (
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, padding: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 10px" }}>Crescimento de membros — últimos 12 meses</h2>
          <Legend items={[{ label: "Novos membros", color: "#2563eb" }, { label: "Novos ativos", color: "#059669" }]} />
          <LineChartSVG data={memData} lines={[{ key: "novos_membros", label: "Novos membros", color: "#2563eb" }, { key: "ativos_novos", label: "Novos ativos", color: "#059669" }]} />
        </div>
      )}

      {finData.length === 0 && memData.length === 0 && (
        <div style={{ textAlign: "center", padding: 80, color: "var(--color-text-muted)" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
          <p>Dados insuficientes. Adicione transações e membros para visualizar os analytics.</p>
        </div>
      )}
    </div>
  );
}
