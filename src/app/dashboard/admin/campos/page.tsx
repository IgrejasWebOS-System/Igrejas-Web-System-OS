import { redirect } from "next/navigation";
import { getAuthContext } from "@/utils/supabase/auth-context";
import {
  listarCamposAction,
  criarCampoAction,
  toggleCampoAtivoAction,
} from "./actions";
import CamposClient from "./CamposClient";

export const metadata = { title: "Gestão de Campos — IgrejasWeb Super Master" };

export default async function CamposPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (ctx.level > 0) redirect("/dashboard"); // N0 only

  const { data: campos, error } = await listarCamposAction();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 1100 }}>

      {/* ── Cabeçalho ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{
            fontSize: 22, fontWeight: 900,
            color: "var(--color-text-primary, #111827)",
            margin: 0, letterSpacing: "-0.02em",
          }}>
            Gestão de Campos
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-muted, #6b7280)", marginTop: 4 }}>
            👑 Super Master · Provisionar e gerenciar campos da plataforma
          </p>
        </div>
      </div>

      {/* ── Aviso de provisionamento ────────────────────────────── */}
      <div style={{
        display: "flex", gap: 12, alignItems: "flex-start",
        background: "#f5f3ff", border: "1px solid #ddd6fe",
        borderRadius: 10, padding: "14px 16px",
      }}>
        <span style={{ fontSize: 20 }}>🚀</span>
        <div>
          <p style={{ fontSize: 13, color: "#5b21b6", fontWeight: 700, margin: "0 0 4px" }}>
            Provisionamento Automático Completo
          </p>
          <p style={{ fontSize: 12, color: "#7c3aed", margin: 0 }}>
            Cada novo campo recebe automaticamente: todos os módulos ativos,
            plano de contas ITG 2002/CFC, categorias financeiras, cargos eclesiásticos,
            templates de documentos, regras de depreciação e configurações padrão —
            tudo copiado do ministério-template. Apenas a identidade visual é personalizada.
          </p>
        </div>
      </div>

      {/* ── Erro de carregamento ────────────────────────────────── */}
      {error && (
        <div style={{
          background: "#fef2f2", border: "1px solid #fecaca",
          borderRadius: 10, padding: "12px 16px",
          fontSize: 13, color: "#991b1b",
        }}>
          ❌ Erro ao carregar campos: {error}
        </div>
      )}

      {/* ── Lista interativa ────────────────────────────────────── */}
      <CamposClient
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        campos={(campos ?? []) as any}
        onCriar={criarCampoAction}
        onToggleAtivo={toggleCampoAtivoAction}
      />
    </div>
  );
}
