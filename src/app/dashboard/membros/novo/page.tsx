import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionContext } from "@/types";
import { buscarLookups, criarMembroAction } from "../actions";
import MemberForm from "../MemberForm";

export const metadata = { title: "Novo Membro — IgrejasWeb" };

export default async function NovoMembroPage() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("iw_context")?.value;
  if (!raw) redirect("/contexto");
  const ctx: SessionContext = JSON.parse(raw);

  const lookupsResult = await buscarLookups();

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ marginBottom: 24 }}>
        <a
          href="/dashboard/membros"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 13, color: "var(--color-text-muted)", textDecoration: "none",
            marginBottom: 12,
          }}
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Voltar para membros
        </a>
        <h1 style={{
          fontSize: 20, fontWeight: 900,
          color: "var(--color-text-primary)",
          margin: 0, letterSpacing: "-0.02em",
        }}>
          Novo Membro
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>
          {ctx.ministry_name} · Preencha os dados para cadastrar um novo membro
        </p>
      </div>

      <MemberForm
        lookups={lookupsResult.data}
        createAction={criarMembroAction}
        mode="create"
      />
    </div>
  );
}
