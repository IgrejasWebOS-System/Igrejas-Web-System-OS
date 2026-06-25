import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionContext } from "@/types";
import { listarMembros, buscarLookups } from "./actions";
import MemberList from "./MemberList";

export const metadata = { title: "Membros — IgrejasWeb" };

export default async function MembrosPage({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; situacao?: string; cargo_id?: string; unit_id?: string; gender_id?: string; civil_status_id?: string; per_page?: string; page?: string }>;
}) {
  const cookieStore = await cookies();
  const raw = cookieStore.get("iw_context")?.value;
  if (!raw) redirect("/contexto");
  const ctx: SessionContext = JSON.parse(raw);

  const sp = await searchParams;
  const page    = Math.max(1, parseInt(sp.page ?? "1", 10));
  const perPage = [25, 50, 100].includes(Number(sp.per_page)) ? Number(sp.per_page) : 25;

  const [membrosResult, lookupsResult] = await Promise.all([
    listarMembros({
      busca:           sp.busca ?? "",
      situacao:        (sp.situacao ?? "") as any,
      cargo_id:        sp.cargo_id ?? "",
      unit_id:         sp.unit_id ?? "",
      gender_id:       sp.gender_id ?? "",
      civil_status_id: sp.civil_status_id ?? "",
      page,
      per_page: perPage,
    }),
    buscarLookups(),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
            Membros
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>
            {ctx.ministry_name} · {membrosResult.total} {membrosResult.total === 1 ? "membro" : "membros"} encontrados
          </p>
        </div>
        <a
          href="/dashboard/membros/novo"
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "var(--color-primary)", color: "#fff",
            padding: "9px 18px", borderRadius: 9,
            fontSize: 13, fontWeight: 700, textDecoration: "none",
            boxShadow: "0 2px 8px rgba(74,125,181,.3)",
            whiteSpace: "nowrap",
          }}
        >
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Novo Membro
        </a>
      </div>

      {/* Lista interativa */}
      <MemberList
        initialData={membrosResult.data}
        total={membrosResult.total}
        page={page}
        lookups={lookupsResult.data}
        initialBusca={sp.busca ?? ""}
        initialSituacao={sp.situacao ?? ""}
        initialCargoId={sp.cargo_id ?? ""}
        initialUnitId={sp.unit_id ?? ""}
        initialGenderId={sp.gender_id ?? ""}
        initialCivilStatusId={sp.civil_status_id ?? ""}
        initialPerPage={perPage}
        ctx={ctx}
      />
    </div>
  );
}
