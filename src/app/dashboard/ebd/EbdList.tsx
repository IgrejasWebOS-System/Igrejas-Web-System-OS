"use client";

import { useState } from "react";
import Link from "next/link";
import type { EbdClassListItem, EbdFaixaEtaria } from "@/types";
import { EBD_FAIXA_LABELS, DIA_SEMANA_LABELS } from "@/types";

const FAIXA_COLORS: Record<EbdFaixaEtaria, { bg: string; color: string }> = {
  MATERNAL:      { bg: "#fce7f3", color: "#9d174d" },
  JARDIM:        { bg: "#fef3c7", color: "#92400e" },
  PRIMARIOS:     { bg: "#fed7aa", color: "#9a3412" },
  JUNIORES:      { bg: "#dbeafe", color: "#1e40af" },
  ADOLESCENTES:  { bg: "#ede9fe", color: "#5b21b6" },
  JOVENS:        { bg: "#d1fae5", color: "#065f46" },
  ADULTOS:       { bg: "#e0f2fe", color: "#075985" },
  TERCEIRA_IDADE:{ bg: "#f1f5f9", color: "#475569" },
  MISTO:         { bg: "#f0fdf4", color: "#166534" },
};

type Props = { turmas: EbdClassListItem[] };

export default function EbdList({ turmas }: Props) {
  const [busca, setBusca] = useState("");
  const [faixaFiltro, setFaixaFiltro] = useState<string>("");

  const filtradas = turmas.filter((t) => {
    const ok = !busca || t.nome.toLowerCase().includes(busca.toLowerCase())
      || t.unit_name.toLowerCase().includes(busca.toLowerCase());
    const faixaOk = !faixaFiltro || t.faixa_etaria === faixaFiltro;
    return ok && faixaOk;
  });

  return (
    <div>
      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Buscar por turma ou unidade…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{
            flex: 1, minWidth: 200,
            border: "1px solid var(--color-border)",
            borderRadius: 8, padding: "8px 12px",
            fontSize: 13, outline: "none",
          }}
        />
        <select
          value={faixaFiltro}
          onChange={(e) => setFaixaFiltro(e.target.value)}
          style={{
            border: "1px solid var(--color-border)", borderRadius: 8,
            padding: "8px 12px", fontSize: 13, background: "#fff",
          }}
        >
          <option value="">Todas as faixas</option>
          {Object.entries(EBD_FAIXA_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {filtradas.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--color-text-muted)", fontSize: 14 }}>
          {turmas.length === 0
            ? "Nenhuma turma cadastrada. Crie a primeira turma!"
            : "Nenhuma turma encontrada para os filtros selecionados."}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {filtradas.map((t) => {
            const faixaStyle = FAIXA_COLORS[t.faixa_etaria] ?? FAIXA_COLORS.MISTO;
            const temAlerta = t.faltas_consecutivas !== undefined && t.total_alunos > 0;
            return (
              <Link
                key={t.id}
                href={`/dashboard/ebd/turmas/${t.id}`}
                style={{ textDecoration: "none" }}
              >
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    padding: "16px 18px",
                    cursor: "pointer",
                    transition: "box-shadow .15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
                >
                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>{t.nome}</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>{t.unit_name}</div>
                    </div>
                    <span style={{
                      background: faixaStyle.bg, color: faixaStyle.color,
                      fontSize: 10, fontWeight: 700, padding: "3px 8px",
                      borderRadius: 99, whiteSpace: "nowrap",
                    }}>
                      {EBD_FAIXA_LABELS[t.faixa_etaria]}
                    </span>
                  </div>

                  {/* Info */}
                  <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--color-text-muted)", marginBottom: 12, flexWrap: "wrap" }}>
                    <span>📅 {DIA_SEMANA_LABELS[t.dia_semana]} às {t.horario.slice(0, 5)}</span>
                    {t.professor_nome && <span>👤 {t.professor_nome}</span>}
                  </div>

                  {/* Footer */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid var(--color-border)" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)" }}>
                      👥 {t.total_alunos} aluno{t.total_alunos !== 1 ? "s" : ""}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                      {t.ultima_chamada
                        ? `Última: ${new Date(t.ultima_chamada + "T00:00:00").toLocaleDateString("pt-BR")}`
                        : "Sem chamadas"}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
