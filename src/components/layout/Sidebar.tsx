"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import type { SessionContext, ModuleKey } from "@/types";

// ── Inline SVG icons ─────────────────────────────────────────────────────────
function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const icons: Record<string, React.ReactNode> = {
    dashboard:  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
    painel:     <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    membros:    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    financeiro: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
    escola:     <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
    cursos:     <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
    ebd:        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
    secretaria: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>,
    patrimonio: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    eventos:    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    ocorrencias:<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    bolo:       <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2 1 2 1"/><path d="M2 21h20"/><path d="M7 8v3"/><path d="M12 8v3"/><path d="M17 8v3"/><path d="M7 4h.01"/><path d="M12 4h.01"/><path d="M17 4h.01"/></svg>,
    tabelas:    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/></svg>,
    modelo:     <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
    credencial: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/><path d="M12 12v3"/><path d="M8 10h1"/><path d="M8 14h1"/></svg>,
    precadastro:<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>,
    consagracao:<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
    batismo:    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>,
    pedidos:    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
    pastoreio:  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/><circle cx="12" cy="5" r="1" fill="currentColor"/></svg>,
    requerimentos:<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
    inbox:      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>,
    alunos:     <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/><circle cx="12" cy="5" r="1" fill="currentColor"/></svg>,
    chevron:    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
    chevronDown:<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
    menu:       <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
    swap:       <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
    logout:     <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    unidades:   <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><rect x="8" y="12" width="8" height="9"/></svg>,
    usuarios:   <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    config:     <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    percent:    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>,
    inventory:  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>,
    relatorios:  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>,
    comunicacao: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    infantil:    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/><path d="M9 11l-1 4 4-2 4 2-1-4"/></svg>,
    voluntarios: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
    governanca:  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="12" y1="2" x2="12" y2="9"/></svg>,
    analytics:   <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="3" y1="20" x2="21" y2="20"/></svg>,
    permissoes:  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    apikeys:     <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
    pagamentos:  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
    perfil:      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    conciliacao: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
  };
  return <>{icons[name] ?? null}</>;
}

const LEVEL_LABEL: Record<number, string> = {
  0: "Super Master", 1: "Admin Campo", 2: "Admin Sede", 3: "Admin Setor", 4: "Usuário",
};

type Props = { ctx: SessionContext };

export default function Sidebar({ ctx }: Props) {
  const pathname    = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // ── Grupos abertos ────────────────────────────────────────────
  // Inicializa com o grupo que contém a rota atual já aberto
  function getInitialOpen(): Set<string> {
    const open = new Set<string>();
    if (pathname.startsWith("/dashboard/financeiro"))         open.add("financeiro");
    if (pathname.startsWith("/dashboard/patrimonio") || pathname.startsWith("/dashboard/admin/patrimonio")) open.add("patrimonio");
    if (["/dashboard/membros", "/dashboard/secretaria/pastoreio", "/dashboard/ocorrencias"].some(p => pathname.startsWith(p))) open.add("pastoral");
    if (["/dashboard/secretaria", "/dashboard/secretaria/credenciais", "/dashboard/secretaria/pre-cadastros", "/dashboard/secretaria/consagracoes", "/dashboard/secretaria/batismos", "/dashboard/secretaria/aniversariantes", "/dashboard/secretaria/pedidos"].some(p => pathname.startsWith(p)) && !pathname.startsWith("/dashboard/secretaria/pastoreio")) open.add("secretaria");
    if (["/dashboard/ebd", "/dashboard/escola", "/dashboard/cursos"].some(p => pathname.startsWith(p))) open.add("ensino");
    if (["/dashboard/admin/documentos", "/dashboard/admin/credenciais/modelos", "/dashboard/admin/tabelas", "/dashboard/admin/materiais"].some(p => pathname.startsWith(p))) open.add("admin-modelos");
    return open;
  }

  const [openGroups, setOpenGroups] = useState<Set<string>>(getInitialOpen);

  function toggleGroup(key: string) {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const W = collapsed ? 68 : 256;
  const hasModule = (mod: ModuleKey) => ctx.modules.includes(mod);

  // ── NavItem flat ──────────────────────────────────────────────
  function NavItem({ icon, label, href, active }: { icon: string; label: string; href: string; active: boolean }) {
    return (
      <a
        href={href}
        title={collapsed ? label : undefined}
        style={{
          display: "flex", alignItems: "center",
          gap: 12,
          padding: collapsed ? "10px 0" : "10px 14px",
          justifyContent: collapsed ? "center" : "flex-start",
          borderRadius: 10, textDecoration: "none",
          fontWeight: active ? 700 : 500, fontSize: 13.5,
          color: active ? "var(--color-primary)" : "var(--color-text-muted)",
          background: active ? "var(--color-primary-light)" : "transparent",
          transition: "all .15s",
          position: "relative",
          marginBottom: 2,
        }}
        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.background = "var(--color-bg)"; }}
        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
      >
        {active && !collapsed && (
          <span style={{ position: "absolute", left: 0, top: "20%", bottom: "20%", width: 3, borderRadius: 99, background: "var(--color-primary)" }} />
        )}
        <span style={{ flexShrink: 0, display: "flex", alignItems: "center", color: active ? "var(--color-primary)" : "var(--color-text-muted)" }}>
          <Icon name={icon} size={18} />
        </span>
        {!collapsed && <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>}
      </a>
    );
  }

  // ── NavSubItem (dentro de grupo) ──────────────────────────────
  function NavSubItem({ icon, label, href, active }: { icon: string; label: string; href: string; active: boolean }) {
    return (
      <a
        href={href}
        style={{
          display: "flex", alignItems: "center",
          gap: 10,
          padding: "8px 14px 8px 38px",
          borderRadius: 8, textDecoration: "none",
          fontWeight: active ? 700 : 400, fontSize: 13,
          color: active ? "var(--color-primary)" : "var(--color-text-muted)",
          background: active ? "var(--color-primary-light)" : "transparent",
          transition: "all .15s",
          marginBottom: 1,
        }}
        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.background = "var(--color-bg)"; }}
        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
      >
        <span style={{ flexShrink: 0, display: "flex", alignItems: "center", color: active ? "var(--color-primary)" : "var(--color-text-muted)", opacity: 0.75 }}>
          <Icon name={icon} size={15} />
        </span>
        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      </a>
    );
  }

  // ── NavGroup (cabeçalho colapsável) ──────────────────────────
  function NavGroup({ groupKey, icon, label, children, groupActive }: {
    groupKey: string; icon: string; label: string; children: React.ReactNode; groupActive: boolean;
  }) {
    const isOpen = openGroups.has(groupKey);
    if (collapsed) {
      // No modo colapsado mostra só o ícone do grupo como link representativo
      return (
        <div
          onClick={() => toggleGroup(groupKey)}
          title={label}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "10px 0", cursor: "pointer", borderRadius: 10, marginBottom: 2,
            color: groupActive ? "var(--color-primary)" : "var(--color-text-muted)",
            background: groupActive ? "var(--color-primary-light)" : "transparent",
          }}
        >
          <Icon name={icon} size={18} />
        </div>
      );
    }
    return (
      <div style={{ marginBottom: 2 }}>
        {/* Cabeçalho do grupo */}
        <div
          onClick={() => toggleGroup(groupKey)}
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 14px", borderRadius: 10, cursor: "pointer",
            fontWeight: 600, fontSize: 13.5,
            color: groupActive ? "var(--color-primary)" : "var(--color-text-muted)",
            background: groupActive && !isOpen ? "var(--color-primary-light)" : "transparent",
            transition: "all .15s",
            userSelect: "none",
            position: "relative",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = groupActive && !isOpen ? "var(--color-primary-light)" : "var(--color-bg)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = groupActive && !isOpen ? "var(--color-primary-light)" : "transparent"; }}
        >
          <span style={{ flexShrink: 0, display: "flex", color: groupActive ? "var(--color-primary)" : "var(--color-text-muted)" }}>
            <Icon name={icon} size={18} />
          </span>
          <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
          <span style={{
            display: "flex", flexShrink: 0,
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform .2s",
            opacity: 0.5,
          }}>
            <Icon name="chevronDown" size={14} />
          </span>
        </div>
        {/* Sub-itens */}
        {isOpen && (
          <div style={{
            borderLeft: "1.5px solid var(--color-border)",
            marginLeft: 22,
            paddingLeft: 0,
          }}>
            {children}
          </div>
        )}
      </div>
    );
  }

  // ── Separador de seção ────────────────────────────────────────
  function SectionLabel({ label }: { label: string }) {
    if (collapsed) return <div style={{ height: 12 }} />;
    return (
      <p style={{
        fontSize: 9, fontWeight: 800, color: "var(--color-text-muted)",
        textTransform: "uppercase", letterSpacing: "0.1em",
        padding: "12px 6px 4px", opacity: 0.7,
      }}>
        {label}
      </p>
    );
  }

  // ── Helpers de rota ───────────────────────────────────────────
  const fin  = (sub: string) => pathname.startsWith(`/dashboard/financeiro/${sub}`);
  const sec  = (sub: string) => pathname.startsWith(`/dashboard/secretaria/${sub}`);
  const isFinanceiroActive = pathname.startsWith("/dashboard/financeiro");
  const isPatrimonioActive = pathname.startsWith("/dashboard/patrimonio") || pathname.startsWith("/dashboard/admin/patrimonio");
  const isPastoralActive   = ["/dashboard/membros", "/dashboard/secretaria/pastoreio", "/dashboard/ocorrencias"].some(p => pathname.startsWith(p));
  const isSecretariaActive = pathname.startsWith("/dashboard/secretaria") && !pathname.startsWith("/dashboard/secretaria/pastoreio");
  const isEnsinoActive     = ["/dashboard/ebd", "/dashboard/escola", "/dashboard/cursos"].some(p => pathname.startsWith(p));
  const isAdminModelosActive = ["/dashboard/admin/documentos", "/dashboard/admin/credenciais/modelos", "/dashboard/admin/tabelas", "/dashboard/admin/materiais"].some(p => pathname.startsWith(p));

  return (
    <aside style={{
      width: W, minWidth: W,
      height: "100vh", position: "sticky", top: 0,
      background: "var(--color-surface)",
      borderRight: "1px solid var(--color-border)",
      display: "flex", flexDirection: "column",
      transition: "width .2s ease",
      overflow: "hidden", zIndex: 40,
      boxShadow: "2px 0 8px rgba(44,82,130,.04)",
    }}>

      {/* ── Logo + toggle ─────────────────────────────────────── */}
      <div style={{
        height: 64, display: "flex", alignItems: "center",
        justifyContent: collapsed ? "center" : "space-between",
        padding: collapsed ? "0" : "0 16px",
        borderBottom: "1px solid var(--color-border)",
        flexShrink: 0, gap: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
          <div style={{
            width: 36, height: 36, flexShrink: 0,
            background: "var(--color-primary)", borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 8px rgba(74,125,181,.35)",
          }}>
            <span style={{ color: "#fff", fontWeight: 900, fontSize: 13, letterSpacing: "-0.5px" }}>IW</span>
          </div>
          {!collapsed && (
            <div style={{ overflow: "hidden" }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: "var(--color-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.2 }}>
                {ctx.ministry_name}
              </p>
              <p style={{ fontSize: 10, color: "var(--color-text-muted)", marginTop: 1 }}>
                {LEVEL_LABEL[ctx.level]}
              </p>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", padding: 4, borderRadius: 6, display: "flex", flexShrink: 0 }}
        >
          <Icon name="menu" size={17} />
        </button>
      </div>

      {/* ── Navegação ────────────────────────────────────────────── */}
      <nav style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: collapsed ? "12px 8px" : "12px 10px" }}>

        {/* Dashboard & Painel */}
        <NavItem icon="dashboard" label="Dashboard"      href="/dashboard"        active={pathname === "/dashboard"} />
        <NavItem icon="painel"    label="Painel Analytics" href="/dashboard/painel" active={pathname.startsWith("/dashboard/painel")} />

        <SectionLabel label="Módulos" />

        {/* ── ENSINO & FORMAÇÃO ─────────────────────────── */}
        {(hasModule("ebd") || hasModule("escola") || hasModule("cursos")) && (
          <NavGroup groupKey="ensino" icon="escola" label="Ensino & Formação" groupActive={isEnsinoActive}>
            {hasModule("ebd") && (
              <NavSubItem icon="ebd"    label="EBD"             href="/dashboard/ebd"    active={pathname.startsWith("/dashboard/ebd")} />
            )}
            {hasModule("escola") && (
              <NavSubItem icon="escola" label="Escola Teológica" href="/dashboard/escola" active={pathname === "/dashboard/escola" || (pathname.startsWith("/dashboard/escola") && !pathname.startsWith("/dashboard/escola/alunos"))} />
            )}
            {hasModule("cursos") && (
              <NavSubItem icon="cursos" label="Cursos Livres"    href="/dashboard/cursos" active={pathname.startsWith("/dashboard/cursos")} />
            )}
            {hasModule("escola") && (
              <NavSubItem icon="alunos" label="Alunos"           href="/dashboard/escola/alunos" active={pathname.startsWith("/dashboard/escola/alunos")} />
            )}
          </NavGroup>
        )}

        {/* ── PASTORAL & MEMBROS ────────────────────────── */}
        {(hasModule("membros") || hasModule("ocorrencias") || hasModule("secretaria")) && (
          <NavGroup groupKey="pastoral" icon="membros" label="Pastoral & Membros" groupActive={isPastoralActive}>
            {hasModule("membros") && (
              <NavSubItem icon="membros"   label="Membros"    href="/dashboard/membros"                  active={pathname.startsWith("/dashboard/membros")} />
            )}
            {hasModule("secretaria") && (
              <NavSubItem icon="pastoreio" label="Pastoreio"  href="/dashboard/secretaria/pastoreio"     active={pathname.startsWith("/dashboard/secretaria/pastoreio")} />
            )}
            {hasModule("ocorrencias") && (
              <NavSubItem icon="ocorrencias" label="Ocorrências" href="/dashboard/ocorrencias"           active={pathname.startsWith("/dashboard/ocorrencias")} />
            )}
          </NavGroup>
        )}

        {/* ── SECRETARIA ────────────────────────────────── */}
        {hasModule("secretaria") && (
          <NavGroup groupKey="secretaria" icon="secretaria" label="Secretaria" groupActive={isSecretariaActive}>
            <NavSubItem icon="secretaria"  label="Documentos"     href="/dashboard/secretaria"                        active={pathname === "/dashboard/secretaria"} />
            <NavSubItem icon="credencial"  label="Credenciais"    href="/dashboard/secretaria/credenciais"            active={sec("credenciais")} />
            <NavSubItem icon="precadastro" label="Pré-Cadastros"  href="/dashboard/secretaria/pre-cadastros"          active={sec("pre-cadastros")} />
            <NavSubItem icon="consagracao" label="Consagrações"   href="/dashboard/secretaria/consagracoes"           active={sec("consagracoes")} />
            <NavSubItem icon="batismo"     label="Batismos"       href="/dashboard/secretaria/batismos"               active={sec("batismos")} />
            <NavSubItem icon="bolo"        label="Aniversariantes" href="/dashboard/secretaria/aniversariantes"       active={sec("aniversariantes")} />
            <NavSubItem icon="pedidos"     label="Pedidos de Mat." href="/dashboard/secretaria/pedidos"              active={sec("pedidos")} />
          </NavGroup>
        )}

        {/* ── FINANCEIRO ────────────────────────────────── */}
        {hasModule("financeiro") && (
          <NavGroup groupKey="financeiro" icon="financeiro" label="Financeiro" groupActive={isFinanceiroActive}>
            <NavSubItem icon="requerimentos" label="Lançamentos"    href="/dashboard/financeiro/lancamentos"    active={fin("lancamentos")} />
            <NavSubItem icon="swap"          label="Transferências"  href="/dashboard/financeiro/transferencias" active={fin("transferencias")} />
            <NavSubItem icon="financeiro"    label="Contas & Caixas" href="/dashboard/financeiro/contas"         active={fin("contas") || fin("caixas")} />
            <NavSubItem icon="tabelas"       label="Projetos"        href="/dashboard/financeiro/projetos"       active={fin("projetos")} />
            <NavSubItem icon="modelo"        label="Parcelamentos"   href="/dashboard/financeiro/parcelamentos"  active={fin("parcelamentos")} />
            <NavSubItem icon="requerimentos" label="Programações"    href="/dashboard/financeiro/programacoes"   active={fin("programacoes")} />
            <NavSubItem icon="swap"          label="Repasses"        href="/dashboard/financeiro/repasses"       active={fin("repasses")} />
            <NavSubItem icon="tabelas"       label="Plano de Contas" href="/dashboard/financeiro/plano"          active={fin("plano")} />
          </NavGroup>
        )}

        {/* ── PATRIMÔNIO ────────────────────────────────── */}
        {hasModule("patrimonio") && (
          <NavGroup groupKey="patrimonio" icon="patrimonio" label="Patrimônio" groupActive={isPatrimonioActive}>
            <NavSubItem icon="inventory" label="Inventário"       href="/dashboard/patrimonio"              active={pathname === "/dashboard/patrimonio"} />
            <NavSubItem icon="percent"   label="Taxas de Deprec." href="/dashboard/admin/patrimonio-regras"  active={pathname.startsWith("/dashboard/admin/patrimonio-regras")} />
          </NavGroup>
        )}

        {/* ── EVENTOS (standalone) ──────────────────────── */}
        {hasModule("eventos") && (
          <NavItem icon="eventos" label="Eventos" href="/dashboard/eventos" active={pathname.startsWith("/dashboard/eventos")} />
        )}

        {/* ── CONCILIAÇÃO BANCÁRIA ──────────────────────── */}
        {hasModule("financeiro") && ctx.level <= 2 && (
          <NavItem icon="conciliacao" label="Conciliação" href="/dashboard/financeiro/conciliacao" active={pathname.startsWith("/dashboard/financeiro/conciliacao")} />
        )}

        {/* ── RELATÓRIOS (N2+) ─────────────────────────── */}
        {ctx.level <= 2 && (
          <NavItem icon="relatorios" label="Relatórios" href="/dashboard/relatorios" active={pathname.startsWith("/dashboard/relatorios")} />
        )}

        {/* ── ANALYTICS ─────────────────────────────────── */}
        {ctx.level <= 2 && (
          <NavItem icon="analytics" label="Analytics & BI" href="/dashboard/analytics" active={pathname.startsWith("/dashboard/analytics")} />
        )}

        {/* ── COMUNICAÇÃO ───────────────────────────────── */}
        {ctx.level <= 2 && (
          <NavItem icon="comunicacao" label="Comunicação" href="/dashboard/comunicacao" active={pathname.startsWith("/dashboard/comunicacao")} />
        )}

        {/* ── VOLUNTÁRIOS ───────────────────────────────── */}
        <NavItem icon="voluntarios" label="Voluntários" href="/dashboard/voluntarios" active={pathname.startsWith("/dashboard/voluntarios")} />

        {/* ── MINISTÉRIO INFANTIL ───────────────────────── */}
        <NavItem icon="infantil" label="Ministério Infantil" href="/dashboard/infantil" active={pathname.startsWith("/dashboard/infantil")} />

        {/* ── MEU PERFIL ────────────────────────────────── */}
        <NavItem icon="perfil" label="Meu Perfil" href="/dashboard/meu-perfil" active={pathname.startsWith("/dashboard/meu-perfil")} />

        {/* ── REQUERIMENTOS ─────────────────────────────── */}
        <SectionLabel label="Requerimentos" />
        <NavItem icon="inbox"         label="Meus"      href="/dashboard/requerimentos/meus"      active={pathname.startsWith("/dashboard/requerimentos/meus")} />
        <NavItem icon="requerimentos" label="Recebidos"  href="/dashboard/requerimentos/recebidos"  active={pathname.startsWith("/dashboard/requerimentos/recebidos")} />
        {ctx.level <= 2 && (
          <NavItem icon="tabelas" label="Tipos Req." href="/dashboard/requerimentos/tipos" active={pathname.startsWith("/dashboard/requerimentos/tipos")} />
        )}

        {/* ── ADMINISTRAÇÃO (N0–N2) ─────────────────────── */}
        {ctx.level <= 2 && (
          <>
            <SectionLabel label="Administração" />
            {/* ── Super Master: gestão de campos (N0 only) ─── */}
            {ctx.level === 0 && (
              <NavItem icon="unidades" label="Campos / Igrejas" href="/dashboard/admin/campos" active={pathname.startsWith("/dashboard/admin/campos")} />
            )}
            {ctx.level <= 1 && (
              <>
                <NavItem icon="unidades" label="Unidades" href="/dashboard/admin/unidades" active={pathname.startsWith("/dashboard/admin/unidades")} />
                <NavItem icon="usuarios" label="Usuários"  href="/dashboard/admin/usuarios"  active={pathname.startsWith("/dashboard/admin/usuarios")} />
                <NavItem icon="config"   label="Módulos"   href="/dashboard/admin/modulos"   active={pathname.startsWith("/dashboard/admin/modulos")} />
              </>
            )}
            <NavGroup groupKey="admin-modelos" icon="modelo" label="Modelos & Tabelas" groupActive={isAdminModelosActive}>
              <NavSubItem icon="modelo"     label="Modelos de Doc."    href="/dashboard/admin/documentos/modelos"   active={pathname.startsWith("/dashboard/admin/documentos/modelos")} />
              <NavSubItem icon="credencial" label="Modelos Credencial" href="/dashboard/admin/credenciais/modelos"  active={pathname.startsWith("/dashboard/admin/credenciais/modelos")} />
              <NavSubItem icon="tabelas"    label="Tabelas Lookup"     href="/dashboard/admin/tabelas/cargos"       active={pathname.startsWith("/dashboard/admin/tabelas")} />
              <NavSubItem icon="pedidos"    label="Catálogo de Mat."   href="/dashboard/admin/materiais"            active={pathname.startsWith("/dashboard/admin/materiais")} />
            </NavGroup>
            {/* ── Novos módulos admin ────────────────────── */}
            <NavItem icon="governanca"  label="Governança & LGPD" href="/dashboard/governanca"   active={pathname.startsWith("/dashboard/governanca")} />
            <NavItem icon="permissoes"  label="Permissões"         href="/dashboard/permissoes"   active={pathname.startsWith("/dashboard/permissoes")} />
            <NavItem icon="apikeys"     label="API & Integrações"  href="/dashboard/api-keys"     active={pathname.startsWith("/dashboard/api-keys")} />
            <NavItem icon="pagamentos"  label="Pagamentos"         href="/dashboard/pagamentos"   active={pathname.startsWith("/dashboard/pagamentos")} />
            <NavItem icon="config"      label="Configurações"      href="/dashboard/configuracoes" active={pathname.startsWith("/dashboard/configuracoes")} />
          </>
        )}
      </nav>

      {/* ── Rodapé ──────────────────────────────────────────────── */}
      <div style={{
        borderTop: "1px solid var(--color-border)",
        padding: collapsed ? "10px 8px" : "10px 10px",
        display: "flex", flexDirection: "column", gap: 2, flexShrink: 0,
      }}>
        <a
          href="/contexto"
          title={collapsed ? "Trocar Ministério" : undefined}
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: collapsed ? "9px 0" : "9px 14px",
            justifyContent: collapsed ? "center" : "flex-start",
            borderRadius: 8, textDecoration: "none",
            fontSize: 13, fontWeight: 500, color: "var(--color-text-muted)", transition: "all .15s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--color-bg)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
        >
          <Icon name="swap" size={16} />
          {!collapsed && "Trocar Ministério"}
        </a>
        <form action="/api/logout" method="POST">
          <button
            type="submit"
            title={collapsed ? "Sair" : undefined}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 12,
              padding: collapsed ? "9px 0" : "9px 14px",
              justifyContent: collapsed ? "center" : "flex-start",
              borderRadius: 8, border: "none", background: "transparent",
              fontSize: 13, fontWeight: 500, color: "#ef4444", cursor: "pointer", transition: "all .15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fef2f2"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
          >
            <Icon name="logout" size={16} />
            {!collapsed && "Sair do Sistema"}
          </button>
        </form>
      </div>
    </aside>
  );
}
