import { cookies }  from "next/headers";
import { redirect } from "next/navigation";
import type { SessionContext } from "@/types";
import ModuleCard from "./ModuleCard";

// ── Stat Card (sem event handlers → Server Component ok) ─────────────────────
function StatCard({ label, value, sub, color, icon }: {
  label: string; value: string; sub: string; color: string; icon: React.ReactNode;
}) {
  return (
    <div style={{
      background: "var(--color-surface)",
      border: "1px solid var(--color-border)",
      borderRadius: 14,
      padding: "20px 22px",
      display: "flex",
      alignItems: "flex-start",
      gap: 14,
      boxShadow: "var(--shadow-sm)",
      flex: 1,
      minWidth: 160,
    }}>
      <div style={{
        width: 44, height: 44, flexShrink: 0,
        borderRadius: 11,
        background: `${color}15`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color,
      }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
          {label}
        </p>
        <p style={{ fontSize: 24, fontWeight: 900, color: "var(--color-text-primary)", lineHeight: 1, marginBottom: 4 }}>
          {value}
        </p>
        <p style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{sub}</p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function DashboardPage() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("iw_context")?.value;
  if (!raw) redirect("/contexto");

  const ctx: SessionContext = JSON.parse(raw);

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const levelLabel: Record<number, string> = {
    0: "Super Master", 1: "Admin Campo", 2: "Admin Sede", 3: "Admin Setor", 4: "Usuário",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28, maxWidth: 1100 }}>

      {/* ── Boas-vindas ──────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)",
        borderRadius: 16,
        padding: "28px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 20,
        boxShadow: "0 4px 20px rgba(74,125,181,.25)",
      }}>
        <div>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,.65)", marginBottom: 6, textTransform: "capitalize" }}>
            {today}
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#fff", marginBottom: 6, letterSpacing: "-0.02em" }}>
            {ctx.ministry_name}
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.75)" }}>
            {levelLabel[ctx.level]} · {ctx.modules.length} módulo{ctx.modules.length !== 1 ? "s" : ""} ativo{ctx.modules.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div style={{
          width: 64, height: 64, flexShrink: 0,
          background: "rgba(255,255,255,.15)",
          borderRadius: 16,
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "1px solid rgba(255,255,255,.2)",
        }}>
          <span style={{ color: "#fff", fontWeight: 900, fontSize: 20, letterSpacing: "-1px" }}>IW</span>
        </div>
      </div>

      {/* ── Stats ────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <StatCard
          label="Módulos Ativos"
          value={String(ctx.modules.length)}
          sub="módulos habilitados"
          color="#4A7DB5"
          icon={<svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>}
        />
        <StatCard
          label="Nível de Acesso"
          value={ctx.level === 0 ? "N0" : `N${ctx.level}`}
          sub={levelLabel[ctx.level]}
          color="#22c55e"
          icon={<svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
        />
        <StatCard
          label="Ministério"
          value={`@${ctx.ministry_slug}`}
          sub="identificador único"
          color="#8b5cf6"
          icon={<svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}
        />
        <StatCard
          label="Sistema"
          value="Online"
          sub="IgrejasWeb OS v0.1"
          color="#f97316"
          icon={<svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
        />
      </div>

      {/* ── Módulos ───────────────────────────────────────────── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: "var(--color-text-primary)" }}>
            Módulos do Sistema
          </h2>
          <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
            {ctx.modules.length} disponíveis
          </span>
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 12,
        }}>
          {ctx.modules.map(mod => (
            <ModuleCard key={mod} mod={mod} />
          ))}
        </div>
        {ctx.modules.length === 0 && (
          <div style={{
            padding: "40px 24px", textAlign: "center",
            background: "var(--color-surface)", borderRadius: 12,
            border: "1px dashed var(--color-border)",
          }}>
            <p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
              Nenhum módulo ativo para este ministério.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
