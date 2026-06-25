import { cookies }  from "next/headers";
import { redirect } from "next/navigation";
import type { SessionContext } from "@/types";
import Sidebar from "@/components/layout/Sidebar";
import Header  from "@/components/layout/Header";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const raw = cookieStore.get("iw_context")?.value;
  if (!raw) redirect("/contexto");

  const ctx: SessionContext = JSON.parse(raw);

  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      background: "var(--color-bg)",
    }}>
      {/* Sidebar */}
      <Sidebar ctx={ctx} />

      {/* Conteúdo principal */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        overflow: "hidden",
      }}>
        <Header ctx={ctx} />
        <main style={{
          flex: 1,
          padding: "28px 32px",
          overflowY: "auto",
          overflowX: "hidden",
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}
