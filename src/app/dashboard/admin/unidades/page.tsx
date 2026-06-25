import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { SessionContext, Unit } from "@/types";
import UnitTree from "./UnitTree";
import { criarUnidadeAction, atualizarUnidadeAction, toggleUnidadeAtivaAction } from "./actions";

export const metadata = { title: "Gestão de Unidades — IgrejasWeb" };

export default async function UnidadesPage() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("iw_context")?.value;
  if (!raw) redirect("/contexto");

  const ctx: SessionContext = JSON.parse(raw);
  const supabase = await createClient();

  const { data: units, error } = await supabase
    .from("units")
    .select("id, ministry_id, parent_id, name, unit_type, is_headquarters, is_sector_mother, is_active, order_index, created_at, updated_at")
    .eq("ministry_id", ctx.ministry_id)
    .order("order_index", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("[unidades]", error.message);
  }

  const canManage = ctx.level <= 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1100 }}>

      {/* ── Cabeçalho ─────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
            Gestão de Unidades
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>
            {ctx.ministry_name} · Hierarquia de igrejas, setores e células
          </p>
        </div>
        {!canManage && (
          <div style={{
            background: "#fff8f1",
            border: "1px solid #fed7aa",
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: 12,
            color: "#d97706",
            fontWeight: 600,
          }}>
            ⚠ Visualização apenas — N{ctx.level} não edita unidades
          </div>
        )}
      </div>

      {/* ── Legenda de tipos ───────────────────────────────────── */}
      <div style={{
        display: "flex", gap: 8, flexWrap: "wrap",
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 10,
        padding: "12px 16px",
      }}>
        <span style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 600, marginRight: 4 }}>Hierarquia:</span>
        {(["CAMPO","SEDE","SETOR","IGREJA","SUB_CONGREGACAO","PONTO_PREGACAO","CELULA"] as const).map((t, i, arr) => (
          <span key={t} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{
              fontSize: 11, fontWeight: 700,
              padding: "2px 8px", borderRadius: 99,
              background: {
                CAMPO:"#EBF2F8",SEDE:"#dbeafe",SETOR:"#ede9fe",
                IGREJA:"#dcfce7",SUB_CONGREGACAO:"#ccfbf1",PONTO_PREGACAO:"#f1f5f9",CELULA:"#fff7ed"
              }[t],
              color: {
                CAMPO:"#4A7DB5",SEDE:"#1d4ed8",SETOR:"#7c3aed",
                IGREJA:"#16a34a",SUB_CONGREGACAO:"#0f766e",PONTO_PREGACAO:"#64748b",CELULA:"#f97316"
              }[t],
            }}>
              {{ CAMPO:"Campo",SEDE:"Sede",SETOR:"Setor",IGREJA:"Igreja",SUB_CONGREGACAO:"Sub-Congregação",PONTO_PREGACAO:"Ponto Pregação",CELULA:"Célula" }[t]}
            </span>
            {i < arr.length - 1 && (
              <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth={2.5}>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            )}
          </span>
        ))}
      </div>

      {/* ── Árvore interativa ──────────────────────────────────── */}
      <UnitTree
        units={(units ?? []) as Unit[]}
        canManage={canManage}
        createAction={criarUnidadeAction}
        updateAction={atualizarUnidadeAction}
        toggleAction={toggleUnidadeAtivaAction}
      />
    </div>
  );
}
