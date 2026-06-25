import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionContext, CredentialSituacao } from "@/types";
import {
  listarCredenciaisAction,
  listarModelosAtivosAction,
  listarTiposAtivosAction,
} from "./actions";
import CredenciaisClient from "./CredenciaisClient";

export const metadata = { title: "Credenciais Ministeriais — IgrejasWeb" };

export default async function CredenciaisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const cookieStore = await cookies();
  const raw = cookieStore.get("iw_context")?.value;
  if (!raw) redirect("/contexto");

  const ctx: SessionContext = JSON.parse(raw);
  const sp = await searchParams;

  const VALID_SITUACOES: CredentialSituacao[] = ["PENDENTE", "CANCELADA", "LIBERADA", "CONFIRMADA", "DIGITAL"];
  const situacao = VALID_SITUACOES.includes(sp.situacao as CredentialSituacao)
    ? (sp.situacao as CredentialSituacao)
    : "";
  const page     = Math.max(1, Number(sp.page)     || 1);
  const per_page = [25, 50, 100].includes(Number(sp.per_page)) ? Number(sp.per_page) : 25;

  const [result, modelos, tipos] = await Promise.all([
    listarCredenciaisAction({
      page, per_page,
      busca:           sp.busca           ?? "",
      situacao,
      model_id:        sp.model_id        ?? "",
      request_type_id: sp.request_type_id ?? "",
      unit_id:         sp.unit_id         ?? "",
    }).catch(() => ({ data: [], total: 0 })),
    listarModelosAtivosAction().catch(() => []),
    listarTiposAtivosAction().catch(()  => []),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
            Credenciais Ministeriais
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>
            {ctx.ministry_name} · {result.total} registro{result.total !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <CredenciaisClient
        credenciais={result.data}
        total={result.total}
        modelos={modelos}
        tipos={tipos}
        page={page}
        per_page={per_page}
        busca={sp.busca ?? ""}
        situacao={situacao}
        model_id={sp.model_id ?? ""}
        request_type_id={sp.request_type_id ?? ""}
        isAdmin={ctx.level <= 2}
      />
    </div>
  );
}
