import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import type { SessionContext } from "@/types";
import { listarItensAction } from "./actions";
import { TABELAS_CONFIG, type TabelaKey } from "./tabelas.config";
import TabelaClient from "./TabelaClient";

export async function generateMetadata({ params }: { params: Promise<{ tabela: string }> }) {
  const { tabela } = await params;
  const cfg = TABELAS_CONFIG[tabela as TabelaKey];
  return { title: `${cfg?.label ?? "Tabela"} — IgrejasWeb` };
}

const TABS: { key: TabelaKey; label: string }[] = [
  { key: "cargos",        label: "Títulos Eclesiásticos" },
  { key: "funcoes",       label: "Funções" },
  { key: "departamentos", label: "Departamentos" },
];

export default async function TabelaPage({
  params,
}: {
  params: Promise<{ tabela: string }>;
}) {
  const cookieStore = await cookies();
  const raw = cookieStore.get("iw_context")?.value;
  if (!raw) redirect("/contexto");

  const ctx: SessionContext = JSON.parse(raw);
  if (ctx.level > 2) redirect("/dashboard");

  const { tabela: tabelaParam } = await params;
  if (!(tabelaParam in TABELAS_CONFIG)) notFound();
  const tabela = tabelaParam as TabelaKey;
  const cfg = TABELAS_CONFIG[tabela];

  let items: Awaited<ReturnType<typeof listarItensAction>> = [];
  try { items = await listarItensAction(tabela); } catch { /* continua vazio */ }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 800 }}>
      {/* Cabeçalho */}
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
          Tabelas de Cadastro
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>
          {ctx.ministry_name} · Gerencie os itens usados em formulários e filtros
        </p>
      </div>

      {/* Abas de navegação entre tabelas */}
      <div style={{ display: "flex", gap: 4, borderBottom: "2px solid var(--color-border)" }}>
        {TABS.map(t => (
          <a
            key={t.key}
            href={`/dashboard/admin/tabelas/${t.key}`}
            style={{
              padding: "8px 16px",
              fontSize: 13, fontWeight: t.key === tabela ? 800 : 500,
              color: t.key === tabela ? "var(--color-primary)" : "var(--color-text-muted)",
              textDecoration: "none",
              borderBottom: t.key === tabela ? "2px solid var(--color-primary)" : "2px solid transparent",
              marginBottom: -2,
              whiteSpace: "nowrap",
            }}
          >
            {t.label}
          </a>
        ))}
      </div>

      <TabelaClient
        tabela={tabela}
        label={cfg.label}
        items={items}
        temOrdem={cfg.temOrdem}
        temSigla={cfg.temSigla}
      />
    </div>
  );
}
