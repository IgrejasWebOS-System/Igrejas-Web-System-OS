import { redirect }     from "next/navigation";
import { getAuthContext } from "@/utils/supabase/auth-context";
import PainelTabBar       from "./PainelTabBar";

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, maxWidth: 1100 }}>
      {/* Header da seção */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{
          fontSize: 20, fontWeight: 800,
          color: "var(--color-text-primary)", margin: 0, marginBottom: 4,
        }}>
          Painel Analytics
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>
          Indicadores e métricas operacionais do sistema
        </p>
      </div>

      {/* Tab Bar */}
      <div style={{
        display: "flex",
        gap: 4,
        borderBottom: "2px solid var(--color-border)",
        marginBottom: 28,
      }}>
        <PainelTabBar />
      </div>

      {children}
    </div>
  );
}
