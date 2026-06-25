import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionContext } from "@/types";
import { listarBatismosAction, carregarLookupsBatismo } from "./actions";
import BatismosClient from "./BatismosClient";

export const metadata = { title: "Batismos — IgrejasWeb" };

export default async function BatismosPage() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("iw_context")?.value;
  if (!raw) redirect("/contexto");

  const ctx: SessionContext = JSON.parse(raw);
  if (ctx.level > 3) redirect("/dashboard");

  const [items, lookups] = await Promise.all([
    listarBatismosAction().catch(() => []),
    carregarLookupsBatismo().catch(() => ({ types: [], units: [] })),
  ]);

  return (
    <div style={{ maxWidth: 1000, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
          Processos de Batismo
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>
          {ctx.ministry_name} · Batismo nas Águas e no Espírito Santo
        </p>
      </div>

      <BatismosClient
        items={items}
        lookups={lookups}
        isAdmin={ctx.level <= 2}
      />
    </div>
  );
}
