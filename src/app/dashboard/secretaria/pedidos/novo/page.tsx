import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionContext } from "@/types";
import { listarMateriaisAtivosAction, listarUnidadesAction } from "../actions";
import NovoPedidoForm from "./NovoPedidoForm";

export const metadata = { title: "Novo Pedido — IgrejasWeb" };

export default async function NovoPedidoPage() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("iw_context")?.value;
  if (!raw) redirect("/contexto");

  const ctx: SessionContext = JSON.parse(raw);
  if (ctx.level > 3) redirect("/dashboard");

  const [materiais, units] = await Promise.all([
    listarMateriaisAtivosAction().catch(() => []),
    listarUnidadesAction().catch(() => []),
  ]);

  return (
    <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <a href="/dashboard/secretaria/pedidos" style={{ fontSize: 12, color: "var(--color-text-muted)", textDecoration: "none", display: "block", marginBottom: 8 }}>
          ← Pedidos de Material
        </a>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
          Novo Pedido de Material
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>
          {ctx.ministry_name} · Selecione os materiais e quantidades desejadas
        </p>
      </div>

      <NovoPedidoForm materiais={materiais} units={units} />
    </div>
  );
}
