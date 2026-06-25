import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionContext } from "@/types";
import { listarCampanhasAction } from "../actions";
import NovoPreCadastroForm from "./NovoPreCadastroForm";

export const metadata = { title: "Novo Pré-Cadastro — IgrejasWeb" };

export default async function NovoPreCadastroPage() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("iw_context")?.value;
  if (!raw) redirect("/contexto");
  const ctx: SessionContext = JSON.parse(raw);

  const campanhas = await listarCampanhasAction().catch(() => []);

  return (
    <div style={{ maxWidth: 620 }}>
      <a href="/dashboard/secretaria/pre-cadastros" style={{ fontSize: 12, color: "var(--color-text-muted)", textDecoration: "none", display: "block", marginBottom: 16 }}>
        ← Voltar para Pré-Cadastros
      </a>
      <h1 style={{ fontSize: 20, fontWeight: 900, color: "var(--color-text-primary)", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
        Novo Pré-Cadastro
      </h1>
      <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 24 }}>
        {ctx.ministry_name} · Preencha os dados básicos. Detalhes completos são preenchidos após aprovação.
      </p>
      <NovoPreCadastroForm campanhas={campanhas} />
    </div>
  );
}
