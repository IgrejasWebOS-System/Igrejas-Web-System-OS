import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionContext } from "@/types";
import { listarModelosCredencialAction, listarCargosAction } from "./actions";
import ModelosCredencialClient from "./ModelosCredencialClient";

export const metadata = { title: "Modelos de Credencial — IgrejasWeb" };

export default async function ModelosCredencialPage() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("iw_context")?.value;
  if (!raw) redirect("/contexto");

  const ctx: SessionContext = JSON.parse(raw);
  if (ctx.level > 2) redirect("/dashboard");

  const [modelos, cargos] = await Promise.all([
    listarModelosCredencialAction().catch(() => []),
    listarCargosAction().catch(() => []),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
          Modelos de Credencial
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>
          {ctx.ministry_name} · Templates para emissão de credenciais ministeriais
        </p>
      </div>

      <div style={{
        background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10,
        padding: "12px 16px", fontSize: 12, color: "#1d4ed8", lineHeight: 1.7,
      }}>
        <strong>Variáveis disponíveis no template:</strong>{" "}
        <code>{"{{nome}}"}</code>, <code>{"{{cpf}}"}</code>, <code>{"{{cargo}}"}</code>,{" "}
        <code>{"{{matricula}}"}</code>, <code>{"{{unidade}}"}</code>, <code>{"{{ministerio}}"}</code>,{" "}
        <code>{"{{data_emissao}}"}</code>, <code>{"{{data_validade}}"}</code>, <code>{"{{foto_url}}"}</code>
      </div>

      <ModelosCredencialClient modelos={modelos} cargos={cargos} />
    </div>
  );
}
