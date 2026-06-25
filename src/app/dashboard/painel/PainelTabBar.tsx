"use client";

import { usePathname } from "next/navigation";

const TABS = [
  { label: "Secretaria",          href: "/dashboard/painel/secretaria",  icon: "👥" },
  { label: "Tesouraria",          href: "/dashboard/painel/tesouraria",  icon: "💰" },
  { label: "Estatísticas de Uso", href: "/dashboard/painel/estatisticas", icon: "📊" },
];

export default function PainelTabBar() {
  const pathname = usePathname();

  return (
    <>
      {TABS.map(tab => {
        const active = pathname.startsWith(tab.href);
        return (
          <a
            key={tab.href}
            href={tab.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: active ? 700 : 500,
              color: active ? "var(--color-primary)" : "var(--color-text-muted)",
              textDecoration: "none",
              borderBottom: `2px solid ${active ? "var(--color-primary)" : "transparent"}`,
              marginBottom: -2,
              transition: "all .15s",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ fontSize: 14 }}>{tab.icon}</span>
            {tab.label}
          </a>
        );
      })}
    </>
  );
}
