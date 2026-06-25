import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionContext } from "@/types";
import { buscarAniversariantes } from "./actions";
import AniversariantesClient from "./AniversariantesClient";

export const metadata = { title: "Aniversariantes — IgrejasWeb" };

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

export default async function AniversariantesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const cookieStore = await cookies();
  const raw = cookieStore.get("iw_context")?.value;
  if (!raw) redirect("/contexto");
  const ctx: SessionContext = JSON.parse(raw);

  const sp  = await searchParams;
  const mes = Math.min(12, Math.max(1, parseInt(sp.mes ?? String(new Date().getMonth() + 1), 10)));

  const result = await buscarAniversariantes(mes);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 1000 }}>
      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
            Aniversariantes
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>
            {ctx.ministry_name} · {MESES[mes - 1]} · {result.data.length} membro{result.data.length !== 1 ? "s" : ""}
          </p>
        </div>
        <a
          href="/dashboard/secretaria"
          style={{
            fontSize: 13, color: "var(--color-text-muted)", textDecoration: "none",
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 14px", border: "1px solid var(--color-border)",
            borderRadius: 8, fontWeight: 500,
          }}
        >
          ← Secretaria
        </a>
      </div>

      <AniversariantesClient initialData={result.data} initialMes={mes} />
    </div>
  );
}
