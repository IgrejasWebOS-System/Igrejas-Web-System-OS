import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionContext, PreRegSituacao } from "@/types";
import { listarPreCadastrosAction, listarCampanhasAction } from "./actions";
import PreCadastrosClient from "./PreCadastrosClient";

export const metadata = { title: "Pré-Cadastros — IgrejasWeb" };

export default async function PreCadastrosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const cookieStore = await cookies();
  const raw = cookieStore.get("iw_context")?.value;
  if (!raw) redirect("/contexto");

  const ctx: SessionContext = JSON.parse(raw);
  const sp = await searchParams;

  const VALID: PreRegSituacao[] = ["PENDENTE", "CANCELADO", "FINALIZADO"];
  const situacao = VALID.includes(sp.situacao as PreRegSituacao) ? (sp.situacao as PreRegSituacao) : "";
  const page     = Math.max(1, Number(sp.page) || 1);
  const per_page = [25, 50, 100].includes(Number(sp.per_page)) ? Number(sp.per_page) : 25;

  const [result, campanhas] = await Promise.all([
    listarPreCadastrosAction({
      page, per_page,
      busca:       sp.busca       ?? "",
      situacao,
      campaign_id: sp.campaign_id ?? "",
    }).catch(() => ({ data: [], total: 0 })),
    listarCampanhasAction().catch(() => []),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
          Pré-Cadastros
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>
          {ctx.ministry_name} · {result.total} registro{result.total !== 1 ? "s" : ""}
        </p>
      </div>

      <PreCadastrosClient
        registros={result.data}
        total={result.total}
        campanhas={campanhas}
        page={page}
        per_page={per_page}
        busca={sp.busca ?? ""}
        situacao={situacao}
        campaign_id={sp.campaign_id ?? ""}
        isAdmin={ctx.level <= 2}
      />
    </div>
  );
}
