import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionContext } from "@/types";
import { listarCampanhasAction } from "../actions";
import CampanhasClient from "./CampanhasClient";

export const metadata = { title: "Campanhas de Captação — IgrejasWeb" };

export default async function CampanhasPage() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("iw_context")?.value;
  if (!raw) redirect("/contexto");

  const ctx: SessionContext = JSON.parse(raw);
  if (ctx.level > 2) redirect("/dashboard/secretaria/pre-cadastros");

  const campanhas = await listarCampanhasAction().catch(() => []);

  return (
    <div style={{ maxWidth: 800, display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <a href="/dashboard/secretaria/pre-cadastros" style={{ fontSize: 12, color: "var(--color-text-muted)", textDecoration: "none", display: "block", marginBottom: 8 }}>
            ← Pré-Cadastros
          </a>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
            Campanhas de Captação
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>
            {ctx.ministry_name} · Organize pré-cadastros por campanha ou evento
          </p>
        </div>
      </div>
      <CampanhasClient campanhas={campanhas} />
    </div>
  );
}
