import { cookies }  from "next/headers";
import { redirect } from "next/navigation";
import type { SessionContext } from "@/types";
import ModuleCard from "./ModuleCard";

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function DashboardPage() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("iw_context")?.value;
  if (!raw) redirect("/contexto");

  const ctx: SessionContext = JSON.parse(raw);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28, maxWidth: 1100 }}>

      {/* ── Módulos ───────────────────────────────────────────── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: "var(--color-text-primary)" }}>
            Módulos do Sistema
          </h2>
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
