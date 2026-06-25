import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionContext } from "@/types";
import { listarConsagracoesAction, carregarLookupsConsagracao } from "./actions";
import ConsagracoesClient from "./ConsagracoesClient";

export const metadata = { title: "Consagrações — IgrejasWeb" };

export default async function ConsagracoesPage() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("iw_context")?.value;
  if (!raw) redirect("/contexto");

  const ctx: SessionContext = JSON.parse(raw);
  if (ctx.level > 3) redirect("/dashboard");

  const [items, lookups] = await Promise.all([
    listarConsagracoesAction().catch(() => []),
    carregarLookupsConsagracao().catch(() => ({ types: [], situations: [], cargos: [], units: [] })),
  ]);

  return (
    <div style={{ maxWidth: 1000, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
          Processos de Consagração
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>
          {ctx.ministry_name} · Acompanhe e aprove processos de ordenação e consagração ministerial
        </p>
      </div>

      <ConsagracoesClient
        items={items}
        lookups={lookups}
        isAdmin={ctx.level <= 2}
      />
    </div>
  );
}
