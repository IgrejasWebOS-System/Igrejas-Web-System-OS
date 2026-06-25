import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import type { SessionContext } from "@/types";
import { PRE_REG_SITUACAO_LABELS, PRE_REG_SITUACAO_COLORS, CAMPANHA_TIPO_LABELS } from "@/types";
import { buscarPreCadastroAction, aprovarPreCadastroAction, cancelarPreCadastroAction } from "../actions";
import AprovarCancelarButtons from "./AprovarCancelarButtons";

export const metadata = { title: "Pré-Cadastro — IgrejasWeb" };

export default async function PreCadastroDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const cookieStore = await cookies();
  const raw = cookieStore.get("iw_context")?.value;
  if (!raw) redirect("/contexto");
  const ctx: SessionContext = JSON.parse(raw);

  const { id } = await params;
  const { data: pr, error } = await buscarPreCadastroAction(id);
  if (error || !pr) notFound();

  const camp    = (pr as any).pre_registration_campaigns ?? null;
  const party   = (pr as any).parties ?? null;
  const dados   = (pr.dados_json ?? {}) as Record<string, string>;
  const colors  = PRE_REG_SITUACAO_COLORS[pr.situacao];
  const isAdmin = ctx.level <= 2;

  function Campo({ label, value }: { label: string; value?: string | null }) {
    return (
      <div>
        <div style={{ fontSize: 10, fontWeight: 800, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 2 }}>
          {label}
        </div>
        <div style={{ fontSize: 13, color: value ? "var(--color-text-primary)" : "#cbd5e1" }}>
          {value ?? "—"}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Voltar */}
      <a href="/dashboard/secretaria/pre-cadastros" style={{ fontSize: 12, color: "var(--color-text-muted)", textDecoration: "none" }}>
        ← Pré-Cadastros
      </a>

      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: "var(--color-text-primary)", margin: 0 }}>
            {party?.full_name ?? dados.nome ?? "Sem nome"}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <span style={{
              padding: "3px 12px", borderRadius: 99, fontSize: 12, fontWeight: 700,
              background: colors.bg, color: colors.color,
            }}>
              {PRE_REG_SITUACAO_LABELS[pr.situacao]}
            </span>
            {camp && (
              <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                {camp.nome}
                {camp.tipo && <> · {CAMPANHA_TIPO_LABELS[camp.tipo as keyof typeof CAMPANHA_TIPO_LABELS]}</>}
              </span>
            )}
          </div>
        </div>
        <div style={{ fontSize: 11, color: "var(--color-text-muted)", textAlign: "right" }}>
          {new Date(pr.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
        </div>
      </div>

      {/* Dados coletados */}
      <div style={{
        background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: 12, padding: "20px 20px",
      }}>
        <h3 style={{ fontSize: 12, fontWeight: 800, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: ".08em", margin: "0 0 16px" }}>
          Dados coletados
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 20px" }}>
          <Campo label="Nome"                value={party?.full_name ?? dados.nome} />
          <Campo label="E-mail"              value={party?.email ?? dados.email} />
          <Campo label="Telefone"            value={dados.telefone} />
          <Campo label="Data de Nascimento"  value={dados.data_nascimento
            ? new Date(dados.data_nascimento + "T12:00:00").toLocaleDateString("pt-BR")
            : null} />
        </div>
        {pr.observacoes && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--color-border)" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>
              Observações
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>{pr.observacoes}</div>
          </div>
        )}
      </div>

      {/* Party vinculado (se aprovado) */}
      {pr.party_id && pr.situacao === "FINALIZADO" && (
        <div style={{
          background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "16px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#16a34a", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>
              Membro aprovado
            </div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{party?.full_name}</div>
            {pr.data_aprovacao && (
              <div style={{ fontSize: 11, color: "#16a34a", marginTop: 2 }}>
                Aprovado em {new Date(pr.data_aprovacao).toLocaleDateString("pt-BR")}
              </div>
            )}
          </div>
          <a href={`/dashboard/membros/${pr.party_id}`} style={{
            padding: "7px 14px", borderRadius: 8, border: "none",
            background: "#16a34a", color: "#fff",
            fontSize: 12, fontWeight: 700, textDecoration: "none",
          }}>
            Ver ficha
          </a>
        </div>
      )}

      {/* Dados adicionais do formulário */}
      {pr.dados_json && Object.keys(dados).filter(k => !["nome","email","telefone","data_nascimento"].includes(k)).length > 0 && (
        <div style={{
          background: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: 12, padding: "16px 20px",
        }}>
          <h3 style={{ fontSize: 12, fontWeight: 800, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: ".08em", margin: "0 0 12px" }}>
            Dados adicionais
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px" }}>
            {Object.entries(dados)
              .filter(([k]) => !["nome","email","telefone","data_nascimento"].includes(k))
              .map(([k, v]) => <Campo key={k} label={k} value={String(v)} />)}
          </div>
        </div>
      )}

      {/* Ações */}
      {isAdmin && pr.situacao === "PENDENTE" && (
        <AprovarCancelarButtons id={id} nome={party?.full_name ?? dados.nome ?? "este pré-cadastro"} />
      )}
    </div>
  );
}
