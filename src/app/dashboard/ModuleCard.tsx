"use client";

import type { ModuleKey } from "@/types";

const MODULE_CONFIG: Record<ModuleKey, {
  label: string; desc: string; color: string; bg: string; icon: React.ReactNode;
}> = {
  membros: {
    label: "Membros", desc: "Cadastro, fichas e controle de membros",
    color: "#4A7DB5", bg: "#EBF2F8",
    icon: <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  financeiro: {
    label: "Financeiro", desc: "Entradas, saídas e relatórios financeiros",
    color: "#22c55e", bg: "#f0fdf4",
    icon: <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
  },
  escola: {
    label: "Escola Teológica", desc: "Alunos, professores e disciplinas",
    color: "#8b5cf6", bg: "#f5f3ff",
    icon: <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  },
  cursos: {
    label: "Cursos", desc: "Cursos livres e capacitações",
    color: "#f97316", bg: "#fff7ed",
    icon: <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
  },
  ebd: {
    label: "EBD", desc: "Escola Bíblica Dominical e chamadas",
    color: "#0ea5e9", bg: "#f0f9ff",
    icon: <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  },
  secretaria: {
    label: "Secretaria", desc: "Documentos, declarações e ofícios",
    color: "#64748b", bg: "#f8fafc",
    icon: <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>,
  },
  patrimonio: {
    label: "Patrimônio", desc: "Bens, imóveis e inventário",
    color: "#d97706", bg: "#fffbeb",
    icon: <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  },
  eventos: {
    label: "Eventos", desc: "Agenda, cultos e programações",
    color: "#ec4899", bg: "#fdf2f8",
    icon: <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  },
  ocorrencias: {
    label: "Ocorrências", desc: "Registros, disciplinas e anotações",
    color: "#ef4444", bg: "#fef2f2",
    icon: <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  },
};

export default function ModuleCard({ mod }: { mod: ModuleKey }) {
  const cfg = MODULE_CONFIG[mod];
  if (!cfg) return null;

  return (
    <a
      href={`/dashboard/${mod}`}
      style={{
        display: "flex", alignItems: "center", gap: 14,
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 12,
        padding: "16px 18px",
        textDecoration: "none",
        transition: "all .15s",
        boxShadow: "var(--shadow-sm)",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.borderColor = cfg.color;
        el.style.boxShadow   = `0 4px 14px ${cfg.color}20`;
        el.style.transform   = "translateY(-1px)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.borderColor = "var(--color-border)";
        el.style.boxShadow   = "var(--shadow-sm)";
        el.style.transform   = "translateY(0)";
      }}
    >
      <div style={{
        width: 42, height: 42, flexShrink: 0,
        borderRadius: 10, background: cfg.bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: cfg.color,
      }}>
        {cfg.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13.5, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 2 }}>
          {cfg.label}
        </p>
        <p style={{ fontSize: 11.5, color: "var(--color-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {cfg.desc}
        </p>
      </div>
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.5 }}>
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </a>
  );
}
