import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionContext } from "@/types";
import { listarModelosAction } from "./actions";
import ModelosClient from "./ModelosClient";

export const metadata = { title: "Modelos de Documentos — IgrejasWeb" };

export default async function ModelosPage() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("iw_context")?.value;
  if (!raw) redirect("/contexto");

  const ctx: SessionContext = JSON.parse(raw);
  if (ctx.level > 2) redirect("/dashboard");

  let modelos: Awaited<ReturnType<typeof listarModelosAction>> = [];
  try { modelos = await listarModelosAction(); } catch { /* sem app_metadata — continua vazio */ }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900 }}>
      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
            Modelos de Documentos
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>
            {ctx.ministry_name} · Templates usados na emissão de documentos eclesiásticos
          </p>
        </div>
      </div>

      {/* Informativo */}
      <div style={{
        background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10,
        padding: "12px 16px", fontSize: 12, color: "#1d4ed8", lineHeight: 1.7,
      }}>
        <strong>Variáveis disponíveis:</strong> insira <code>{"{{nome}}"}</code>, <code>{"{{cpf}}"}</code>,{" "}
        <code>{"{{cargo}}"}</code>, <code>{"{{matricula}}"}</code>, <code>{"{{unidade}}"}</code>,{" "}
        <code>{"{{data_emissao}}"}</code>, <code>{"{{protocolo}}"}</code> e <code>{"{{ministerio}}"}</code>{" "}
        no template HTML. Elas serão substituídas pelos dados reais na emissão.
      </div>

      <ModelosClient modelos={modelos} />
    </div>
  );
}
