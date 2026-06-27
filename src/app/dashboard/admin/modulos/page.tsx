import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { SessionContext, ModuleKey } from "@/types";
import ModulesGrid from "./ModulesGrid";
import { toggleModuloAction } from "./actions";

export const metadata = { title: "Configuração de Módulos — IgrejasWeb" };

export default async function ModulosPage() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("iw_context")?.value;
  if (!raw) redirect("/contexto");

  const ctx: SessionContext = JSON.parse(raw);
  if (ctx.level > 1) redirect("/dashboard");

  const supabase = await createClient();

  // Busca todos os módulos do ministério
  const { data: rows } = await supabase
    .from("ministry_modules")
    .select("module, is_active")
    .eq("ministry_id", ctx.ministry_id);

  const activeModules = (rows ?? [])
    .filter((r) => r.is_active)
    .map((r) => r.module as ModuleKey);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1000 }}>

      {/* ── Cabeçalho ─────────────────────────────────────────── */}
      <div>
        <h1 style={{
          fontSize: 20, fontWeight: 900,
          color: "var(--color-text-primary)",
          margin: 0, letterSpacing: "-0.02em",
        }}>
          Configuração de Módulos
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>
          {ctx.ministry_name} · Ative ou desative módulos para este campo
        </p>
      </div>

      {/* ── Aviso de comportamento ────────────────────────────── */}
      <div style={{
        display: "flex", gap: 12, alignItems: "flex-start",
        background: "#eff6ff",
        border: "1px solid #bfdbfe",
        borderRadius: 10, padding: "12px 16px",
      }}>
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <div>
          <p style={{ fontSize: 13, color: "#1e40af", fontWeight: 700, margin: "0 0 2px" }}>
            Mudanças refletem no próximo login dos usuários
          </p>
          <p style={{ fontSize: 12, color: "#3b82f6", margin: 0 }}>
            Desativar um módulo remove seu item do menu lateral. Os dados existentes são preservados
            e o módulo pode ser reativado a qualquer momento sem perda de informações.
          </p>
        </div>
      </div>

      {/* ── Aviso Super Master ────────────────────────────────── */}
      {ctx.level === 0 && (
        <div style={{
          background: "#fef9c3", border: "1px solid #fde047",
          borderRadius: 8, padding: "10px 14px",
          fontSize: 12, color: "#854d0e",
        }}>
          👑 <strong>Super Master:</strong> você está configurando módulos do campo{" "}
          <strong>{ctx.ministry_name}</strong>. Cada campo possui configuração independente.
        </div>
      )}

      {/* ── Grid interativo ────────────────────────────────────── */}
      <ModulesGrid
        activeModules={activeModules}
        ministryName={ctx.ministry_name}
        toggleAction={toggleModuloAction}
      />
    </div>
  );
}
