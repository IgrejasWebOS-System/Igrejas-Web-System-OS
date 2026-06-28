"use client";

export default function AniversariantesCard() {
  const color = "#db2777";
  const bg    = "#fdf2f8";

  return (
    <a
      href="/dashboard/aniversariantes"
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
        el.style.borderColor = color;
        el.style.boxShadow   = `0 4px 14px ${color}20`;
        el.style.transform   = "translateY(-1px)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.borderColor = "var(--color-border)";
        el.style.boxShadow   = "var(--shadow-sm)";
        el.style.transform   = "translateY(0)";
      }}
    >
      {/* Ícone */}
      <div style={{
        width: 42, height: 42, flexShrink: 0,
        borderRadius: 10, background: bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        color,
      }}>
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2z"/>
          <path d="M12 12c-5 0-9 2.5-9 5.5V20h18v-2.5c0-3-4-5.5-9-5.5z"/>
          {/* faixa de aniversário */}
          <path d="M8 3.5C9 2 10.5 1 12 1" strokeDasharray="2 2"/>
          <circle cx="17" cy="4" r="1.5" fill="currentColor" stroke="none"/>
          <circle cx="19" cy="7" r="1" fill="currentColor" stroke="none"/>
          <circle cx="15" cy="2.5" r="1" fill="currentColor" stroke="none"/>
        </svg>
      </div>

      {/* Textos */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13.5, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 2 }}>
          Aniversariantes
        </p>
        <p style={{ fontSize: 11.5, color: "var(--color-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          Nascimento · Casamento · Batismo
        </p>
      </div>

      {/* Seta */}
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.5 }}>
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </a>
  );
}
