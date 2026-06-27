"use client";

import { useState, useTransition } from "react";
import { conciliarLinhaAction, ignorarLinhaAction, criarLancamentoDaLinhaAction, buscarCandidatosAction } from "../actions";

type Linha = { id: string; data: string; valor: number; descricao: string; tipo: string; status: string; fitid: string; fin_transactions: { descricao: string; valor: number } | null };
type Conta = { id: string; nome: string };
type Cat   = { id: string; nome: string; tipo: string };
type Imp   = { id: string; nome_arquivo: string; banco: string | null; conta: string | null; data_inicio: string | null; data_fim: string | null; total_linhas: number; conciliadas: number; status: string; fin_accounts: { nome: string } | null };

const fmt = (v: number) => Math.abs(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const inp: React.CSSProperties = { padding: "8px 12px", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 13, background: "var(--color-bg)", color: "var(--color-text-primary)", width: "100%", boxSizing: "border-box" };

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  PENDENTE:   { bg: "#fef9c3", color: "#92400e" },
  CONCILIADA: { bg: "#d1fae5", color: "#065f46" },
  IGNORADA:   { bg: "#f3f4f6", color: "#6b7280" },
  CRIADA:     { bg: "#ede9fe", color: "#5b21b6" },
};

export default function ConciliacaoDetalheClient({ importacao, linhas: initial, contas, categorias }: { importacao: Imp; linhas: Linha[]; contas: Conta[]; categorias: Cat[] }) {
  const [linhas, setLinhas]       = useState(initial);
  const [filtro, setFiltro]       = useState<"TODOS" | "PENDENTE" | "CONCILIADA" | "IGNORADA" | "CRIADA">("PENDENTE");
  const [activeId, setActiveId]   = useState<string | null>(null);
  const [candidatos, setCandidatos] = useState<{ id: string; descricao: string; valor: number; data: string; fin_categories: { nome: string } | null }[]>([]);
  const [showCriar, setShowCriar] = useState(false);
  const [isPending, start]        = useTransition();

  const filtradas = linhas.filter(l => filtro === "TODOS" || l.status === filtro);
  const pct = importacao.total_linhas > 0 ? Math.round((importacao.conciliadas / importacao.total_linhas) * 100) : 0;

  async function abrirLinha(linha: Linha) {
    if (activeId === linha.id) { setActiveId(null); return; }
    setActiveId(linha.id);
    setCandidatos([]);
    setShowCriar(false);
    if (linha.status === "PENDENTE") {
      const cands = await buscarCandidatosAction(linha.data, linha.valor);
      setCandidatos(cands as unknown as typeof candidatos);
    }
  }

  function atualizarLinha(id: string, updates: Partial<Linha>) {
    setLinhas(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  }

  async function handleConciliar(linha: Linha, tx_id: string) {
    start(async () => {
      await conciliarLinhaAction(linha.id, tx_id);
      atualizarLinha(linha.id, { status: "CONCILIADA" });
      setActiveId(null);
    });
  }

  async function handleIgnorar(linha: Linha) {
    start(async () => {
      await ignorarLinhaAction(linha.id);
      atualizarLinha(linha.id, { status: "IGNORADA" });
      setActiveId(null);
    });
  }

  async function handleCriar(e: React.FormEvent<HTMLFormElement>, linha: Linha) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      await criarLancamentoDaLinhaAction(linha.id, fd);
      atualizarLinha(linha.id, { status: "CRIADA" });
      setActiveId(null); setShowCriar(false);
    });
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <a href="/dashboard/financeiro/conciliacao" style={{ color: "var(--color-text-muted)", fontSize: 13 }}>← Conciliação</a>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>🏦 {importacao.nome_arquivo}</h1>
      </div>

      {/* Resumo */}
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 13, color: "var(--color-text-muted)", marginBottom: 12 }}>
          <span>🏦 {importacao.fin_accounts?.nome ?? "—"}</span>
          {importacao.banco && <span>Banco: {importacao.banco}</span>}
          {importacao.conta && <span>Conta: {importacao.conta}</span>}
          {importacao.data_inicio && <span>📅 {new Date(importacao.data_inicio).toLocaleDateString("pt-BR")} – {importacao.data_fim ? new Date(importacao.data_fim).toLocaleDateString("pt-BR") : "?"}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ flex: 1, height: 8, background: "var(--color-border)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#059669" : "#2563eb", borderRadius: 99 }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 800, color: pct === 100 ? "#059669" : "#2563eb" }}>{pct}% — {importacao.conciliadas}/{importacao.total_linhas}</span>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["TODOS", "PENDENTE", "CONCILIADA", "CRIADA", "IGNORADA"] as const).map(f => (
          <button key={f} onClick={() => setFiltro(f)} style={{
            padding: "6px 14px", borderRadius: 20, border: "1px solid var(--color-border)", fontSize: 12, fontWeight: 700, cursor: "pointer",
            background: filtro === f ? "var(--color-primary)" : "transparent",
            color: filtro === f ? "#fff" : "var(--color-text-muted)",
          }}>{f} ({f === "TODOS" ? linhas.length : linhas.filter(l => l.status === f).length})</button>
        ))}
      </div>

      {/* Linhas */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtradas.map(linha => {
          const isActive = activeId === linha.id;
          const ss = STATUS_STYLE[linha.status] ?? STATUS_STYLE.PENDENTE;
          return (
            <div key={linha.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }} onClick={() => abrirLinha(linha)}>
                <div style={{ fontSize: 20 }}>{linha.tipo === "CREDITO" ? "📥" : "📤"}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{linha.descricao || "—"}</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{new Date(linha.data).toLocaleDateString("pt-BR")} · {linha.fitid}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: linha.tipo === "CREDITO" ? "#059669" : "#dc2626" }}>
                    {linha.tipo === "CREDITO" ? "+" : "−"}{fmt(linha.valor)}
                  </div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: ss.bg, color: ss.color }}>{linha.status}</span>
                <span style={{ color: "var(--color-text-muted)" }}>{isActive ? "▲" : "▼"}</span>
              </div>

              {isActive && linha.status === "PENDENTE" && (
                <div style={{ borderTop: "1px solid var(--color-border)", padding: "16px", background: "var(--color-bg)" }}>
                  {!showCriar ? (
                    <>
                      {candidatos.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-muted)", marginBottom: 8 }}>LANÇAMENTOS CANDIDATOS</div>
                          {candidatos.map(c => (
                            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "var(--color-surface)", borderRadius: 8, border: "1px solid var(--color-border)", marginBottom: 6 }}>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{c.descricao || "—"}</div>
                                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{new Date(c.data).toLocaleDateString("pt-BR")} · {(c.fin_categories as { nome?: string } | null)?.nome ?? "—"}</div>
                              </div>
                              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <span style={{ fontWeight: 800, fontSize: 14 }}>{fmt(c.valor)}</span>
                                <button onClick={() => handleConciliar(linha, c.id)} disabled={isPending} style={{ padding: "6px 14px", background: "#059669", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                  Conciliar
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {candidatos.length === 0 && (
                        <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 12 }}>Nenhum lançamento candidato encontrado (±3 dias, ±1%).</p>
                      )}
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => setShowCriar(true)} style={{ padding: "8px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Criar Lançamento</button>
                        <button onClick={() => handleIgnorar(linha)} disabled={isPending} style={{ padding: "8px 16px", background: "transparent", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", color: "var(--color-text-muted)" }}>Ignorar</button>
                      </div>
                    </>
                  ) : (
                    <form onSubmit={e => handleCriar(e, linha)} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Criar lançamento a partir do extrato</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)" }}>
                          Conta
                          <select name="account_id" required style={inp}>
                            {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                          </select>
                        </label>
                        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)" }}>
                          Categoria
                          <select name="category_id" required style={inp}>
                            {categorias.filter(c => c.tipo === (linha.valor > 0 ? "RECEITA" : "DESPESA")).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                          </select>
                        </label>
                      </div>
                      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)" }}>
                        Descrição
                        <input name="descricao" defaultValue={linha.descricao} style={inp} />
                      </label>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button type="submit" disabled={isPending} style={{ padding: "8px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Criar e Conciliar</button>
                        <button type="button" onClick={() => setShowCriar(false)} style={{ padding: "8px 16px", background: "transparent", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>Voltar</button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
