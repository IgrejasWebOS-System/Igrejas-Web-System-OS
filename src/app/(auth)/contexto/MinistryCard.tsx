"use client";

type Props = {
  roleId: string;
  ministryName: string;
  ministrySlug: string;
  level: number;
  action: () => Promise<never>;
};

const levelLabel: Record<number, string> = {
  0: "Super Master",
  1: "Admin Campo",
  2: "Admin Sede",
  3: "Admin Setor",
  4: "Usuário Local",
};

const levelColor: Record<number, string> = {
  0: "#ef4444",
  1: "#f97316",
  2: "#eab308",
  3: "#22c55e",
  4: "#3b82f6",
};

export default function MinistryCard({ roleId, ministryName, ministrySlug, level, action }: Props) {
  return (
    <form key={roleId} action={action}>
      <button
        type="submit"
        style={{
          width: "100%",
          background: "var(--color-surface)",
          border: "1.5px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
          padding: "18px 22px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          cursor: "pointer",
          textAlign: "left",
          transition: "all .15s",
          boxShadow: "var(--shadow-sm)",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-primary)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow   = "var(--shadow-md)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-border)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow   = "var(--shadow-sm)";
        }}
      >
        {/* Ícone */}
        <div style={{
          width: 48, height: 48,
          background: "var(--color-primary-light)",
          borderRadius: "var(--radius-lg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontWeight: 800,
          fontSize: 16,
          color: "var(--color-primary-dark)",
        }}>
          {ministryName.charAt(0)}
        </div>

        {/* Dados */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 15, fontWeight: 800,
            color: "var(--color-text-primary)",
            marginBottom: 3,
          }}>
            {ministryName}
          </p>
          <p style={{ fontSize: 11, color: "var(--color-text-muted)", fontFamily: "monospace" }}>
            @{ministrySlug}
          </p>
        </div>

        {/* Nível */}
        <div style={{
          fontSize: 10, fontWeight: 700,
          padding: "4px 10px",
          borderRadius: "var(--radius-xl)",
          background: `${levelColor[level]}18`,
          color: levelColor[level],
          flexShrink: 0,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}>
          {levelLabel[level]}
        </div>

        {/* Seta */}
        <span style={{ color: "var(--color-primary)", fontSize: 18, flexShrink: 0 }}>→</span>
      </button>
    </form>
  );
}
