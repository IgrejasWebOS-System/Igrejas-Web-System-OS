import Link from "next/link";
import { listarTurmas, buscarStatsEbd } from "./actions";
import EbdList from "./EbdList";
import type { EbdClassListItem } from "@/types";
import { EBD_FAIXA_LABELS, DIA_SEMANA_LABELS } from "@/types";

export default async function EbdPage() {
  const [{ data: turmas }, stats] = await Promise.all([
    listarTurmas(),
    buscarStatsEbd(),
  ]);

  return (
    <div style={{ padding: "0 0 40px" }}>
      {/* Cabeçalho */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: 0 }}>
            EBD — Escola Bíblica Dominical
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>
            Turmas, chamadas e frequência dos alunos
          </p>
        </div>
        <Link
          href="/dashboard/ebd/turmas/novo"
          style={{
            background: "var(--color-primary)",
            color: "#fff",
            padding: "9px 18px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          + Nova Turma
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Turmas Ativas",      value: stats.total_turmas,    icon: "📚" },
          { label: "Alunos Matriculados", value: stats.total_alunos,   icon: "👥" },
          { label: "Média Presença/Mês",
            value: stats.media_frequencia !== null ? `${stats.media_frequencia} alunos` : "—",
            icon: "📊" },
          { label: "Atenção Pastoral",   value: stats.turmas_com_alerta, icon: "⚠️" },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "#fff",
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              padding: "16px 20px",
            }}
          >
            <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)" }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Lista de turmas (Client Component para filtros) */}
      <EbdList turmas={turmas} />
    </div>
  );
}
