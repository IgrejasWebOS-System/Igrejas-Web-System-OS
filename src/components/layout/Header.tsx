"use client";

import { usePathname } from "next/navigation";
import type { SessionContext } from "@/types";

const LEVEL_LABEL: Record<number, string> = {
  0: "Super Master", 1: "Admin Campo", 2: "Admin Sede", 3: "Admin Setor", 4: "Usuário",
};
const LEVEL_COLOR: Record<number, string> = {
  0: "#ef4444", 1: "#f97316", 2: "#4A7DB5", 3: "#22c55e", 4: "#8b5cf6",
};

const BREADCRUMB: Record<string, string> = {
  "/dashboard":                      "Dashboard",
  "/dashboard/membros":              "Membros",
  "/dashboard/financeiro":           "Financeiro",
  "/dashboard/escola":               "Escola Teológica",
  "/dashboard/cursos":               "Cursos",
  "/dashboard/ebd":                  "EBD",
  "/dashboard/secretaria":           "Secretaria",
  "/dashboard/patrimonio":           "Patrimônio",
  "/dashboard/eventos":              "Eventos",
  "/dashboard/ocorrencias":          "Ocorrências",
  // Admin
  "/dashboard/admin/unidades":       "Gestão de Unidades",
  "/dashboard/admin/usuarios":       "Gestão de Usuários",
  "/dashboard/admin/modulos":        "Configuração de Módulos",
};

type Props = { ctx: SessionContext };

export default function Header({ ctx }: Props) {
  const pathname = usePathname();
  // Resolve breadcrumb: tenta match exato, depois prefixo mais longo
  const pageTitle = BREADCRUMB[pathname]
    ?? Object.entries(BREADCRUMB)
         .filter(([k]) => pathname.startsWith(k) && k !== "/dashboard")
         .sort((a, b) => b[0].length - a[0].length)[0]?.[1]
    ?? "Dashboard";
  const levelColor = LEVEL_COLOR[ctx.level];

  // Data formatada (client-side para evitar hidration mismatch)
  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <header style={{
      height: 64,
      background: "var(--color-surface)",
      borderBottom: "1px solid var(--color-border)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 28px",
      position: "sticky",
      top: 0,
      zIndex: 30,
      gap: 16,
      flexShrink: 0,
      boxShadow: "0 1px 3px rgba(44,82,130,.06)",
    }}>

      {/* ── Esquerda: nome do ministério (fonte maior) + página ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <span style={{
          fontSize: 15, fontWeight: 800,
          color: "var(--color-text-primary)",
          whiteSpace: "nowrap",
        }}>
          {ctx.ministry_name}
        </span>
        <span style={{ color: "var(--color-border)", fontSize: 16, flexShrink: 0 }}>›</span>
        <span style={{
          fontSize: 14, fontWeight: 600,
          color: "var(--color-text-muted)",
          whiteSpace: "nowrap",
        }}>
          {pageTitle}
        </span>
      </div>

      {/* ── Direita: data · badge nível · badge slug · ● Online ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>

        {/* Data */}
        <span style={{
          fontSize: 11, color: "var(--color-text-muted)",
          fontWeight: 500, textTransform: "capitalize",
          whiteSpace: "nowrap",
        }}>
          {today}
        </span>

        {/* Separador */}
        <span style={{ width: 1, height: 18, background: "var(--color-border)", flexShrink: 0 }} />

        {/* Badge de nível */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "5px 12px",
          background: `${levelColor}12`,
          border: `1px solid ${levelColor}30`,
          borderRadius: 99,
          fontSize: 11, fontWeight: 700,
          color: levelColor,
          whiteSpace: "nowrap",
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: levelColor, flexShrink: 0 }} />
          {LEVEL_LABEL[ctx.level]}
        </div>

        {/* Slug do ministério */}
        <div style={{
          padding: "5px 10px",
          background: "var(--color-bg-2)",
          border: "1px solid var(--color-border)",
          borderRadius: 99,
          fontSize: 11, fontWeight: 600,
          color: "var(--color-text-muted)",
          fontFamily: "monospace",
          whiteSpace: "nowrap",
        }}>
          @{ctx.ministry_slug}
        </div>

        {/* ● Online — extremo direito */}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
            background: "#4ade80",
            boxShadow: "0 0 5px #4ade80",
          }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: "#16a34a" }}>Online</span>
        </div>
      </div>
    </header>
  );
}
