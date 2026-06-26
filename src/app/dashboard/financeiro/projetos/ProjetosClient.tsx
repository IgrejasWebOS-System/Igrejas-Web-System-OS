"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { FinProjectWithStats } from "@/types";
import {
  FIN_PROJECT_TIPO_LABELS,
  FIN_PROJECT_STATUS_COLORS,
} from "@/types";
import { criarProjetoAction, atualizarStatusProjetoAction } from "../actions";

const STATUS_LABELS: Record<string, string> = {
  PLANEJAMENTO: "Planejamento",
  ATIVO: "Ativo",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

const TIPOS = Object.entries(FIN_PROJECT_TIPO_LABELS);

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ProgressBar({ atual, total }: { atual: number; total: number | null }) {
  if (!total) return null;
  const pct = Math.min(100, Math.round((atual / total) * 100));
  const cor = pct >= 100 ? "#dc2626" : pct >= 80 ? "#f59e0b" : "#22c55e";
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b", marginBottom: 3 }}>
        <span>Realizado</span>
        <span>{pct}%</span>
      </div>
      <div style={{ background: "#e2e8f0", borderRadius: 99, height: 6, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: cor, borderRadius: 99, transition: "width .3s" }} />
      </div>
    </div>
  );
}

export default function ProjetosClient({ projetos }: { projetos: FinProjectWithStats[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [modal, setModal]     = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [erro, setErro]       = useState("");

  const filtrados = projetos.filter((p) =>
    filtroStatus === "todos" || p.status === filtroStatus
  );

  function submitNovo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErro("");
    startTransition(async () => {
      try {
        await criarProjetoAction(fd);
        setModal(false);
        router.refresh();
      } catch (err: any) {
        setErro(err.message ?? "Erro ao criar projeto");
      }
    });
  }

  // Totalizadores
  const totalAtivos    = projetos.filter((p) => p.status === "ATIVO").length;
  const totalOrcamento = projetos.reduce((a, p) => a + (p.orcamento_total ?? 0), 0);
  const totalRealizado = projetos.reduce((a, p) => a + p.total_despesas, 0);

  return (
    <div style={{ padding: "28px 28px", maxWidth: 1100 }}>
      <div style={{ marginBottom: 8 }}>
        <Link href="/dashboard/financeiro" style={{ fontSize: 12, color: "#4A7DB5", fontWeight: 600, textDecoration: "none" }}>← Financeiro</Link>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1C2833", margin: 0 }}>Projetos Financeiros</h1>
          <p style={{ color: "#5D6D7E", fontSize: 13, marginTop: 4 }}>
            Gerencie orçamentos de obras, campanhas e eventos
          </p>
        </div>
        <button onClick={() => { setErro(""); setModal(true); }} style={btnStyle("#4A7DB5")}>
          + Novo Projeto
        </button>
      </div>

      {/* Cards resumo */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Projetos Ativos", value: totalAtivos, sub: `de ${projetos.length} no total`, color: "#22c55e" },
          { label: "Orçamento Total", value: fmtBRL(totalOrcamento), sub: "todos os projetos", color: "#4A7DB5" },
          { label: "Total Realizado", value: fmtBRL(totalRealizado), sub: "lançamentos aprovados", color: "#f59e0b" },
        ].map((c) => (
          <div key={c.label} style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: "16px 20px" }}>
            <p style={{ fontSize: 12, color: "#64748b", fontWeight: 600, margin: 0 }}>{c.label}</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: c.color, margin: "4px 0 2px" }}>{c.value}</p>
            <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["todos", "PLANEJAMENTO", "ATIVO", "CONCLUIDO", "CANCELADO"].map((s) => (
          <button
            key={s}
            onClick={() => setFiltroStatus(s)}
            style={{
              padding: "6px 14px", borderRadius: 20, border: "1.5px solid",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              borderColor: filtroStatus === s ? "#4A7DB5" : "#C8D6E5",
              background:  filtroStatus === s ? "#4A7DB5" : "#fff",
              color:       filtroStatus === s ? "#fff"    : "#5D6D7E",
            }}
          >
            {s === "todos" ? "Todos" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", background: "#f8fafc", borderRadius: 12, color: "#64748b" }}>
          <p style={{ fontWeight: 600 }}>Nenhum projeto encontrado</p>
          <p style={{ fontSize: 13 }}>Clique em "+ Novo Projeto" para começar</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {filtrados.map((p) => {
            const statusColor = FIN_PROJECT_STATUS_COLORS[p.status] ?? { bg: "#f1f5f9", color: "#475569" };
            return (
              <div key={p.id} style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: statusColor.bg, color: statusColor.color }}>
                    {STATUS_LABELS[p.status]}
                  </span>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>{FIN_PROJECT_TIPO_LABELS[p.tipo]}</span>
                </div>

                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1C2833", margin: "0 0 4px" }}>{p.nome}</h3>
                {p.descricao && <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 8px" }}>{p.descricao}</p>}

                <div style={{ fontSize: 12, color: "#475569", marginBottom: 8 }}>
                  <div>Receitas: <strong style={{ color: "#166534" }}>{fmtBRL(p.total_receitas)}</strong></div>
                  <div>Despesas: <strong style={{ color: "#dc2626" }}>{fmtBRL(p.total_despesas)}</strong></div>
                  <div>Saldo: <strong style={{ color: p.saldo >= 0 ? "#166534" : "#dc2626" }}>{fmtBRL(p.saldo)}</strong></div>
                  {p.orcamento_total && <div>Orçamento: {fmtBRL(p.orcamento_total)}</div>}
                </div>

                <ProgressBar atual={p.total_despesas} total={p.orcamento_total} />

                {p.responsavel_nome && (
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>👤 {p.responsavel_nome}</div>
                )}

                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <Link
                    href={`/dashboard/financeiro/lancamentos?project_id=${p.id}`}
                    style={{ flex: 1, textAlign: "center", padding: "7px 0", border: "1.5px solid #C8D6E5", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#4A7DB5", textDecoration: "none" }}
                  >
                    Ver Lançamentos
                  </Link>
                  {p.status === "ATIVO" && (
                    <button
                      onClick={() => startTransition(async () => { await atualizarStatusProjetoAction(p.id, "CONCLUIDO"); router.refresh(); })}
                      style={{ padding: "7px 12px", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "#f0fdf4", color: "#166534", cursor: "pointer" }}
                    >
                      ✓ Concluir
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal novo projeto */}
      {modal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: "#1C2833" }}>Novo Projeto Financeiro</h2>
            <form onSubmit={submitNovo} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label style={labelStyle}>
                Nome do Projeto *
                <input name="nome" required style={inputStyle} placeholder="Ex: Reforma do Templo Principal" />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={labelStyle}>
                  Tipo *
                  <select name="tipo" style={inputStyle}>
                    {TIPOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </label>
                <label style={labelStyle}>
                  Status Inicial
                  <select name="status" style={inputStyle}>
                    <option value="PLANEJAMENTO">Planejamento</option>
                    <option value="ATIVO" selected>Ativo</option>
                  </select>
                </label>
              </div>

              <label style={labelStyle}>
                Descrição
                <textarea name="descricao" rows={2} style={{ ...inputStyle, resize: "vertical" }} placeholder="Descrição do projeto..." />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={labelStyle}>
                  Orçamento Total (R$)
                  <input name="orcamento_total" type="number" step="0.01" min="0" style={inputStyle} placeholder="0,00" />
                </label>
                <label style={labelStyle}>
                  Data de Início
                  <input name="data_inicio" type="date" style={inputStyle} />
                </label>
              </div>

              <label style={labelStyle}>
                Previsão de Conclusão
                <input name="data_fim_prevista" type="date" style={inputStyle} />
              </label>

              {erro && <p style={{ color: "#dc2626", fontSize: 13 }}>{erro}</p>}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setModal(false)} style={btnStyle("#94a3b8")}>Cancelar</button>
                <button type="submit" disabled={isPending} style={btnStyle("#4A7DB5")}>
                  {isPending ? "Salvando..." : "Criar Projeto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.5)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999,
};
const modalStyle: React.CSSProperties = {
  background: "#fff", borderRadius: 14, padding: "28px 28px 24px",
  width: "100%", maxWidth: 500, boxShadow: "0 8px 40px rgba(0,0,0,.2)",
  maxHeight: "90vh", overflowY: "auto",
};
const labelStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 5,
  fontSize: 12, fontWeight: 600, color: "#475569",
};
const inputStyle: React.CSSProperties = {
  border: "1.5px solid #C8D6E5", borderRadius: 8, padding: "9px 12px",
  fontSize: 13, outline: "none", fontFamily: "inherit", background: "#fff", color: "#1C2833",
};
function btnStyle(bg: string): React.CSSProperties {
  return { background: bg, color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer" };
}
