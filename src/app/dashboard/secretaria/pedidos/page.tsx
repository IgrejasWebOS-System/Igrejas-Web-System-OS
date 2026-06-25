import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionContext } from "@/types";
import { listarPedidosAction, listarUnidadesAction } from "./actions";
import PedidosClient from "./PedidosClient";

export const metadata = { title: "Pedidos de Material — IgrejasWeb" };

export default async function PedidosPage() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("iw_context")?.value;
  if (!raw) redirect("/contexto");

  const ctx: SessionContext = JSON.parse(raw);
  if (ctx.level > 3) redirect("/dashboard");

  const [pedidos, units] = await Promise.all([
    listarPedidosAction().catch(() => []),
    listarUnidadesAction().catch(() => []),
  ]);

  return (
    <div style={{ maxWidth: 1000, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
          Pedidos de Material
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>
          {ctx.ministry_name} · Solicite e acompanhe pedidos de materiais por unidade
        </p>
      </div>

      <PedidosClient
        pedidos={pedidos}
        units={units}
        isAdmin={ctx.level <= 2}
      />
    </div>
  );
}
