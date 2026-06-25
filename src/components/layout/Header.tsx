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

  // Iniciais do ministério para avatar
  const initials = ctx.ministry_name
    .split(" ")
    .slice(0, 2)
    .map(w => w[0])
    .join("")
    .toUpperCase();

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

      {/* ── Esquerda: breadcrumb ─────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 500 }}>
          {ctx.ministry_name}
        </span>
        <span style={{ color: "var(--color-border)", fontSize: 14 }}>›</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>
          {pageTitle}
        </span>
      </div>

      {/* ── Direita: badges + avatar ─────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

        {/* Badge de nível */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "5px 12px",
          background: `${levelColor}12`,
          border: `1px solid ${levelColor}30`,
          borderRadius: 99,
          fontSize: 11, fontWeight: 700,
          color: levelColor,
          letterSpacing: "0.03em",
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: levelColor, flexShrink: 0,
          }} />
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
        }}>
          @{ctx.ministry_slug}
        </div>

        {/* Avatar */}
        <div style={{
          width: 34, height: 34,
          background: "var(--color-primary)",
          borderRadius: 10,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 12, fontWeight: 800,
          flexShrink: 0,
          boxShadow: "0 2px 6px rgba(74,125,181,.3)",
          letterSpacing: "-0.5px",
        }}>
          {initials}
        </div>
      </div>
    </header>
  );
}
