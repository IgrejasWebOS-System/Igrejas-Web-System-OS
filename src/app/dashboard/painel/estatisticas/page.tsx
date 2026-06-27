import { redirect }       from "next/navigation";
import { requireAuthContext }  from "@/utils/supabase/auth-context";
import { buscarStatsUso }  from "../actions";

function UsageCard({
  icon, title, principal, principalLabel, secundario, secundarioLabel, color,
}: {
  icon: string;
  title: string;
  principal: number;
  principalLabel: string;
  secundario: number;
  secundarioLabel: string;
  color: string;
}) {
  return (
    <div style={{
      background: "var(--color-surface)",
      border: "1px solid var(--color-border)",
      borderRadius: 14,
      padding: "20px 22px",
      boxShadow: "var(--shadow-sm)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: `${color}18`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18,
        }}>
          {icon}
        </div>
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>{title}</p>
      </div>

      {/* Linha separadora */}
      <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {/* Principal */}
          <div>
            <p style={{ fontSize: 28, fontWeight: 900, color, margin: 0, lineHeight: 1 }}>
              {principal.toLocaleString("pt-BR")}
            </p>
            <p style={{ fontSize: 11, color: "var(--color-text-muted)", margin: "4px 0 0", fontWeight: 600 }}>
              {principalLabel}
            </p>
          </div>
          {/* Secundário */}
          <div style={{ borderLeft: "1px solid var(--color-border)", paddingLeft: 12 }}>
            <p style={{ fontSize: 22, fontWeight: 800, color: `${color}cc`, margin: 0, lineHeight: 1 }}>
              +{secundario.toLocaleString("pt-BR")}
            </p>
            <p style={{ fontSize: 11, color: "var(--color-text-muted)", margin: "4px 0 0", fontWeight: 600 }}>
              {secundarioLabel}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function EstatisticasPage() {
  const ctx = await requireAuthContext();

  const stats = await buscarStatsUso();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── 1.3.1 Membros ───────────────────────────────────────── */}
      <section>
        <p style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em",
          color: "var(--color-text-muted)", marginBottom: 12 }}>
          Membros
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          <UsageCard
            icon="👥"
            title="Membros no Sistema"
            principal={stats.membros_ativos}
            principalLabel="membros ativos"
            secundario={stats.membros_novos_mes}
            secundarioLabel="novos nos últimos 30 dias"
            color="#16a34a"
          />
        </div>
      </section>

      {/* ── 1.3.2 Lançamentos Financeiros (placeholder) ─────────── */}
      <section>
        <p style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em",
          color: "var(--color-text-muted)", marginBottom: 12 }}>
          Lançamentos Financeiros
        </p>
        <div style={{
          background: "#fffbeb",
          border: "1px solid #fde68a",
          borderRadius: 14,
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}>
          <span style={{ fontSize: 22 }}>💰</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#92400e", margin: "0 0 2px" }}>
              Módulo Financeiro — Fase 7
            </p>
            <p style={{ fontSize: 12, color: "#78350f", margin: 0 }}>
              Total de lançamentos e movimentações serão exibidos aqui após a implementação do módulo financeiro.
            </p>
          </div>
        </div>
      </section>

      {/* ── 1.3.3 Usuários ──────────────────────────────────────── */}
      <section>
        <p style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em",
          color: "var(--color-text-muted)", marginBottom: 12 }}>
          Usuários do Sistema
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          <UsageCard
            icon="🔑"
            title="Usuários Cadastrados"
            principal={stats.usuarios_total}
            principalLabel="usuários com acesso ativo"
            secundario={0}
            secundarioLabel="acessos no último mês*"
            color="#4A7DB5"
          />
        </div>
        <p style={{ fontSize: 10, color: "var(--color-text-muted)", marginTop: 6 }}>
          * Contagem de acessos requer integração com log de sessões do Supabase Auth (prevista na Fase 14 — Governança & Compliance).
        </p>
      </section>

      {/* ── 1.3.4 Arquivos / Documentos ─────────────────────────── */}
      <section>
        <p style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em",
          color: "var(--color-text-muted)", marginBottom: 12 }}>
          Documentos e Arquivos
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          <UsageCard
            icon="📄"
            title="Documentos Emitidos"
            principal={stats.documentos_total}
            principalLabel="documentos no sistema"
            secundario={stats.documentos_mes}
            secundarioLabel="emitidos nos últimos 30 dias"
            color="#7c3aed"
          />
        </div>
        <p style={{ fontSize: 10, color: "var(--color-text-muted)", marginTop: 6 }}>
          * Tamanho total de arquivos exigirá coluna file_size na tabela de documentos (prevista em versão futura).
        </p>
      </section>

      {/* ── Bônus: EBD ──────────────────────────────────────────── */}
      <section>
        <p style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em",
          color: "var(--color-text-muted)", marginBottom: 12 }}>
          EBD — Escola Bíblica Dominical
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          <UsageCard
            icon="📚"
            title="Turmas EBD"
            principal={stats.turmas_ebd}
            principalLabel="turmas ativas"
            secundario={stats.alunos_ebd}
            secundarioLabel="alunos matriculados"
            color="#0f766e"
          />
        </div>
      </section>

    </div>
  );
}
