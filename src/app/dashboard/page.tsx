import { cookies }  from "next/headers";
import { redirect } from "next/navigation";
import type { ModuleKey, SessionContext } from "@/types";
import ModuleCard from "./ModuleCard";
import AniversariantesCard from "./AniversariantesCard";

// Ordem de exibição dos módulos — apenas estes são mostrados no dashboard principal
const DISPLAY_ORDER: ModuleKey[] = [
  "membros",
  "ocorrencias",
  "secretaria",
  "financeiro",
  "patrimonio",
  "escola",
  "ebd",
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function DashboardPage() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("iw_context")?.value;
  if (!raw) redirect("/contexto");

  const ctx: SessionContext = JSON.parse(raw);

  // Filtra pelos módulos ativos do ministério, respeitando a ordem definida
  const ordered = DISPLAY_ORDER.filter(m => ctx.modules.includes(m));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28, maxWidth: 1200 }}>

      {/* ── Módulos ───────────────────────────────────────────── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: "var(--color-text-primary)" }}>
            Módulos do Sistema
          </h2>
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
        }}>
          {ordered.map(mod => (
            <ModuleCard key={mod} mod={mod} />
          ))}
          {/* Card especial — Aniversariantes */}
          <AniversariantesCard />
        </div>
        {ordered.length === 0 && (
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
