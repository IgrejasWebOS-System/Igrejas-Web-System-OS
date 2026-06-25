import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionContext } from "@/types";
import { listarMateriaisAction } from "@/app/dashboard/secretaria/pedidos/actions";
import MateriaisClient from "./MateriaisClient";

export const metadata = { title: "Catálogo de Materiais — IgrejasWeb" };

export default async function MateriaisAdminPage() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("iw_context")?.value;
  if (!raw) redirect("/contexto");

  const ctx: SessionContext = JSON.parse(raw);
  if (ctx.level > 2) redirect("/dashboard");

  const materiais = await listarMateriaisAction().catch(() => []);

  return (
    <div style={{ maxWidth: 800, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
          Catálogo de Materiais
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>
          {ctx.ministry_name} · Gerencie os materiais disponíveis para pedido
        </p>
      </div>
      <MateriaisClient materiais={materiais} />
    </div>
  );
}
