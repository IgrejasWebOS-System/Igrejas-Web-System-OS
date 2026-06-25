import { redirect }              from "next/navigation";
import { getAuthContext }         from "@/utils/supabase/auth-context";
import { buscarStatsSecretaria, buscarAniversariantesDia } from "../actions";
import type { StatsSecretaria, Aniversariante } from "../actions";

// ─── helpers ────────────────────────────────────────────────

const MES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function pct(v: number, total: number) {
  return total === 0 ? 0 : Math.round((v / total) * 100);
}

// ─── sub-components (pure Server Component) ─────────────────

function StatBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      background: "var(--color-surface)",
      border: `1px solid ${color}40`,
      borderRadius: 10,
      padding: "14px 18px",
      textAlign: "center",
      flex: "1 1 130px",
    }}>
      <p style={{ fontSize: 26, fontWeight: 900, color, margin: 0, lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 11, color: "var(--color-text-muted)", margin: "4px 0 0", fontWeight: 600 }}>{label}</p>
    </div>
  );
}

function HorizBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const p = pct(value, total);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)" }}>{label}</span>
        <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{value} <span style={{ opacity: .6 }}>({p}%)</span></span>
      </div>
      <div style={{ height: 8, background: "var(--color-border)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${p}%`, background: color, borderRadius: 99, transition: "width .4s" }} />
      </div>
    </div>
  );
}

function BarChart({ data, label, color }: {
  data: number[];
  label: (i: number) => string;
  color: string;
}) {
  const max = Math.max(...data, 1);
  const W = 100 / data.length;
  return (
    <svg viewBox={`0 0 ${data.length * 40} 120`} width="100%" height={120} style={{ display: "block" }}>
      {data.map((v, i) => {
        const barH = Math.max((v / max) * 90, v > 0 ? 4 : 0);
        const x = i * 40 + 4;
        const y = 100 - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={32} height={barH} rx={4} fill={color} opacity={0.85} />
            {v > 0 && (
              <text x={x + 16} y={y - 4} textAnchor="middle" fontSize={9} fill="var(--color-text-muted)">{v}</text>
            )}
            <text x={x + 16} y={115} textAnchor="middle" fontSize={9} fill="var(--color-text-muted)">{label(i)}</text>
          </g>
        );
      })}
    </svg>
  );
}

function LineChart({ data, color }: { data: number[]; color: string }) {
  if (data.length === 0) return <div style={{ padding: 20, textAlign: "center", color: "var(--color-text-muted)", fontSize: 12 }}>Sem dados</div>;
  const max = Math.max(...data, 1);
  const W   = 40;
  const H   = 90;
  const pts = data.map((v, i) => {
    const x = i * W + 20;
    const y = H - Math.max((v / max) * H, 0);
    return `${x},${y}`;
  }).join(" ");
  const totalW = (data.length - 1) * W + 40;

  return (
    <svg viewBox={`0 0 ${totalW} 120`} width="100%" height={120} style={{ display: "block" }}>
      {/* Area fill */}
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`20,${H} ${pts} ${(data.length - 1) * W + 20},${H}`}
        fill="url(#lineGrad)"
      />
      {/* Line */}
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {/* Dots + labels */}
      {data.map((v, i) => {
        const x = i * W + 20;
        const y = H - Math.max((v / max) * H, 0);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={3.5} fill={color} />
            {v > 0 && <text x={x} y={y - 7} textAnchor="middle" fontSize={9} fill="var(--color-text-muted)">{v}</text>}
            <text x={x} y={115} textAnchor="middle" fontSize={9} fill="var(--color-text-muted)">{MES[i]}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Card({ title, children, extra }: { title: string; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div style={{
      background: "var(--color-surface)",
      border: "1px solid var(--color-border)",
      borderRadius: 14,
      overflow: "hidden",
      boxShadow: "var(--shadow-sm)",
    }}>
      <div style={{
        padding: "14px 18px",
        borderBottom: "1px solid var(--color-border)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>{title}</p>
        {extra}
      </div>
      <div style={{ padding: "16px 18px" }}>{children}</div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────

export default async function SecretariaDashboardPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const [stats, aniversariantes] = await Promise.all([
    buscarStatsSecretaria(),
    buscarAniversariantesDia(),
  ]);

  if (!stats) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "var(--color-text-muted)" }}>
        Erro ao carregar dados. Tente novamente.
      </div>
    );
  }

  const hoje = new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
  const currentMonth = new Date().getMonth(); // 0-indexed

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── 1.1.1 Seção de Membros ──────────────────────────────── */}
      <section>
        <p style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em",
          color: "var(--color-text-muted)", marginBottom: 12 }}>
          Situação dos Membros
        </p>

        {/* Badges de situacao */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
          <StatBadge label="Total Geral"       value={stats.total}         color="#4A7DB5" />
          <StatBadge label="Ativos"            value={stats.ativos}        color="#16a34a" />
          <StatBadge label="Em Observação"     value={stats.em_observacao} color="#f59e0b" />
          <StatBadge label="Inativos"          value={stats.inativos}      color="#6b7280" />
          <StatBadge label="Suspensos"         value={stats.suspensos}     color="#dc2626" />
          <StatBadge label="Desligados"        value={stats.desligados}    color="#7c3aed" />
        </div>

        {/* Grid de distribuições */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {/* Gênero */}
          <Card title="Distribuição por Gênero">
            {stats.por_genero.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Sem dados de gênero cadastrados.</p>
            ) : (
              stats.por_genero.map(g => (
                <HorizBar key={g.label} label={g.label} value={g.total} total={stats.ativos || stats.total} color={g.cor} />
              ))
            )}
          </Card>

          {/* Faixa etária */}
          <Card title="Faixa Etária">
            {stats.por_faixa_etaria.map(f => (
              <HorizBar key={f.label} label={f.label} value={f.total} total={stats.ativos || stats.total} color={f.cor} />
            ))}
          </Card>

          {/* Igrejas */}
          <Card title="Igrejas / Congregações"
            extra={
              <span style={{ fontSize: 22, fontWeight: 900, color: "#4A7DB5" }}>{stats.total_igrejas}</span>
            }
          >
            <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: 0 }}>
              Total de unidades ativas do tipo Igreja e Sub-Congregação cadastradas no ministério.
            </p>
          </Card>

          {/* Cargos */}
          <Card title="Membros por Cargo">
            {stats.por_cargo.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Nenhum cargo cadastrado ainda.</p>
            ) : (
              stats.por_cargo.map(c => (
                <HorizBar key={c.nome} label={c.nome} value={c.total} total={stats.ativos || stats.total} color="#4A7DB5" />
              ))
            )}
          </Card>
        </div>
      </section>

      {/* ── 1.1.2 Seção de Gráficos ─────────────────────────────── */}
      <section>
        <p style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em",
          color: "var(--color-text-muted)", marginBottom: 12 }}>
          Gráficos — Ano {new Date().getFullYear()}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {/* Crescimento acumulado */}
          <Card
            title="Crescimento Acumulado de Membros"
            extra={<span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Jan–{MES[currentMonth]}</span>}
          >
            {stats.acumulado_por_mes.length > 0 ? (
              <LineChart
                data={stats.acumulado_por_mes}
                color="#4A7DB5"
              />
            ) : (
              <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Sem cadastros no ano atual.</p>
            )}
          </Card>

          {/* Novos por mês */}
          <Card
            title="Novos Membros por Mês"
            extra={<span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Jan–Dez</span>}
          >
            <BarChart
              data={stats.novos_por_mes}
              label={i => MES[i]}
              color="#22c55e"
            />
          </Card>
        </div>
      </section>

      {/* ── 1.1.3 Aniversariantes do Dia ────────────────────────── */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em",
            color: "var(--color-text-muted)", margin: 0 }}>
            Aniversariantes do Dia — {hoje}
          </p>
          {aniversariantes.length > 0 && (
            <a href="/dashboard/membros?filtro=aniversariantes"
              style={{ fontSize: 11, color: "var(--color-primary)", fontWeight: 600, textDecoration: "none" }}>
              Ver mais →
            </a>
          )}
        </div>

        <div style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: "var(--shadow-sm)",
        }}>
          {aniversariantes.length === 0 ? (
            <div style={{ padding: "28px 18px", textAlign: "center" }}>
              <p style={{ fontSize: 28, margin: "0 0 8px" }}>🎂</p>
              <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
                Nenhum aniversariante hoje.
              </p>
            </div>
          ) : (
            <div>
              {aniversariantes.map((a, idx) => (
                <a
                  key={a.party_id}
                  href={`/dashboard/membros/${a.party_id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 18px",
                    borderBottom: idx < aniversariantes.length - 1 ? "1px solid var(--color-border)" : "none",
                    textDecoration: "none",
                    transition: "background .12s",
                  }}
                  onMouseEnter={() => {}}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 38, height: 38, flexShrink: 0,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18,
                  }}>
                    🎂
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
                      {a.full_name}
                    </p>
                    <p style={{ fontSize: 11, color: "var(--color-text-muted)", margin: "2px 0 0" }}>
                      {a.matricula ? `#${a.matricula} · ` : ""}
                      {a.anos} ano{a.anos !== 1 ? "s" : ""}
                    </p>
                  </div>
                  {/* Badge */}
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: "#92400e",
                    background: "#fef3c7", borderRadius: 99, padding: "3px 10px",
                    border: "1px solid #fde68a",
                  }}>
                    {a.anos} anos
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
