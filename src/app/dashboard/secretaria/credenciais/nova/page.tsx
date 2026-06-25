import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionContext } from "@/types";
import { listarModelosAtivosAction, listarTiposAtivosAction } from "../actions";
import NovaCredencialForm from "./NovaCredencialForm";

export const metadata = { title: "Nova Credencial — IgrejasWeb" };

export default async function NovaCredencialPage() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("iw_context")?.value;
  if (!raw) redirect("/contexto");

  const ctx: SessionContext = JSON.parse(raw);

  const [modelos, tipos] = await Promise.all([
    listarModelosAtivosAction().catch(() => []),
    listarTiposAtivosAction().catch(()  => []),
  ]);

  if (modelos.length === 0) {
    return (
      <div style={{ maxWidth: 600 }}>
        <a href="/dashboard/secretaria/credenciais" style={{ fontSize: 12, color: "var(--color-text-muted)", textDecoration: "none", display: "block", marginBottom: 16 }}>
          ← Voltar para Credenciais
        </a>
        <div style={{
          background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 12,
          padding: "20px 24px", color: "#92400e",
        }}>
          <strong>Nenhum modelo de credencial cadastrado.</strong>
          <p style={{ fontSize: 13, marginTop: 6 }}>
            Crie pelo menos um modelo em{" "}
            <a href="/dashboard/admin/credenciais/modelos" style={{ color: "#92400e", fontWeight: 700 }}>
              Admin → Modelos de Credencial
            </a>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <a href="/dashboard/secretaria/credenciais" style={{ fontSize: 12, color: "var(--color-text-muted)", textDecoration: "none", display: "block", marginBottom: 16 }}>
        ← Voltar para Credenciais
      </a>
      <h1 style={{ fontSize: 20, fontWeight: 900, color: "var(--color-text-primary)", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
        Nova Credencial
      </h1>
      <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 24 }}>
        {ctx.ministry_name} · Selecione o membro e o modelo de credencial.
      </p>
      <NovaCredencialForm modelos={modelos} tipos={tipos} />
    </div>
  );
}
