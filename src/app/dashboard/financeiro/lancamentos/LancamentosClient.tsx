"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { FinTransactionListItem, FinAccountWithSaldo, FinCategory } from "@/types";
import { FIN_TX_STATUS_COLORS, FIN_TX_STATUS_LABELS } from "@/types";
import { aprovarLancamentoAction, rejeitarLancamentoAction, estornarLancamentoAction, softDeleteLancamentoAction } from "../actions";
import type { LancamentosFilter } from "../actions";

type Props = {
  lancamentos:  FinTransactionListItem[];
  total:        number;
  contas:       FinAccountWithSaldo[];
  categorias:   FinCategory[];
  filter:       LancamentosFilter;
};

function fmtBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

export default function LancamentosClient({ lancamentos: init, total, contas, categorias, filter }: Props) {
  const router   = useRouter();
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState(init);

  function acao(fn: () => Promise<void>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  const totalReceitas = items.filter((t) => t.tipo === "ENTRADA" && t.status === "APROVADO").reduce((acc, t) => acc + t.valor, 0);
  const totalDespesas = items.filter((t) => t.tipo === "SAIDA"   && t.status === "APROVADO").reduce((acc, t) => acc + t.valor, 0);

  return (
    <div style={{ padding: "28px 28px", maxWidth: 1100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 12, color: "#4A7DB5", fontWeight: 600, marginBottom: 6 }}>
            <Link href="/dashboard/financeiro" style={{ color: "#4A7DB5", textDecoration: "none" }}>← Financeiro</Link>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1C2833", margin: 0 }}>Lançamentos</h1>
          <p style={{ color: "#5D6D7E", fontSize: 13, marginTop: 4 }}>{total} lançamento(s) encontrado(s)</p>
        </div>
        <Link href="/dashboard/financeiro/lancamentos/novo" style={btnLink("#4A7DB5")}>
          + Novo Lançamento
        </Link>
      </div>

      {/* Filtros */}
      <div style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
        <form method="GET" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label style={labelStyle}>
            Tipo
            <select name="tipo" defaultValue={filter.tipo} style={selectStyle}>
              <option value="">Todos</option>
              <option value="ENTRADA">Receitas</option>
              <option value="SAIDA">Despesas</option>
            </select>
          </label>
          <label style={labelStyle}>
            Conta
            <select name="account_id" defaultValue={filter.account_id} style={selectStyle}>
              <option value="">Todas</option>
              {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </label>
          <label style={labelStyle}>
            Categoria
            <select name="category_id" defaultValue={filter.category_id} style={selectStyle}>
              <option value="">Todas</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.codigo} — {c.nome}</option>)}
            </select>
          </label>
          <label style={labelStyle}>
            Status
            <select name="status" defaultValue={filter.status} style={selectStyle}>
              <option value="">Todos</option>
              <option value="PENDENTE">Pendente</option>
              <option value="APROVADO">Aprovado</option>
              <option value="REJEITADO">Rejeitado</option>
              <option value="ESTORNADO">Estornado</option>
            </select>
          </label>
          <label style={labelStyle}>
            De
            <input name="data_de" type="date" defaultValue={filter.data_de} style={selectStyle} />
          </label>
          <label style={labelStyle}>
            Até
            <input name="data_ate" type="date" defaultValue={filter.data_ate} style={selectStyle} />
          </label>
          <button type="submit" style={btnSmall("#4A7DB5")}>Filtrar</button>
          <Link href="/dashboard/financeiro/lancamentos" style={{ ...btnSmall("#94a3b8"), textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            Limpar
          </Link>
        </form>
      </div>

      {/* Totais filtrados */}
      {items.length > 0 && (
        <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
          <Pill label="Receitas APROVADAS" value={fmtBRL(totalReceitas)} color="#166534" bg="#f0fdf4" />
          <Pill label="Despesas APROVADAS" value={fmtBRL(totalDespesas)} color="#991b1b" bg="#fef2f2" />
          <Pill label="Saldo parcial" value={fmtBRL(totalReceitas - totalDespesas)} color={totalReceitas >= totalDespesas ? "#166534" : "#991b1b"} bg="#f8fafc" />
        </div>
      )}

      {/* Tabela */}
      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#5D6D7E", background: "#f8fafc", borderRadius: 12 }}>
          <p style={{ fontWeight: 600 }}>Nenhum lançamento encontrado</p>
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Data", "Descrição / Categoria", "Conta", "Forma Pag.", "Valor", "Status", "Ações"].map((h) => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((t) => {
                const colors = FIN_TX_STATUS_COLORS[t.status];
                return (
                  <tr key={t.id} style={{ borderBottom: "1px solid #f1f5f9", opacity: t.deleted_at ? 0.5 : 1 }}>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: "#5D6D7E", whiteSpace: "nowrap" }}>
                      {fmtDate(t.data)}
                    </td>
                    <td style={{ padding: "10px 12px", maxWidth: 220 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1C2833" }}>
                        {t.descricao || "—"}
                      </div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                        {t.category_codigo} — {t.category_nome}
                        {t.party_nome && ` · ${t.party_nome}`}
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: "#5D6D7E" }}>{t.account_nome}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: "#5D6D7E" }}>{t.payment_method_nome ?? "—"}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 700, fontSize: 13, color: t.tipo === "ENTRADA" ? "#166534" : "#dc2626", whiteSpace: "nowrap" }}>
                      {t.tipo === "ENTRADA" ? "+" : "-"}{fmtBRL(t.valor)}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: colors.bg, color: colors.color }}>
                        {FIN_TX_STATUS_LABELS[t.status]}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        {t.status === "PENDENTE" && (
                          <>
                            <button onClick={() => acao(() => aprovarLancamentoAction(t.id))} style={btnAcao("#16a34a")} disabled={isPending}>✓</button>
                            <button onClick={() => acao(() => rejeitarLancamentoAction(t.id))} style={btnAcao("#dc2626")} disabled={isPending}>✗</button>
                          </>
                        )}
                        {t.status === "APROVADO" && (
                          <button
                            onClick={() => { if (confirm("Estornar este lançamento?")) acao(() => estornarLancamentoAction(t.id)); }}
                            style={btnAcao("#f59e0b")} disabled={isPending}
                          >
                            ↩
                          </button>
                        )}
                        {(t.status === "PENDENTE" || t.status === "REJEITADO") && !t.deleted_at && (
                          <button
                            onClick={() => { if (confirm("Excluir lançamento?")) acao(() => softDeleteLancamentoAction(t.id)); }}
                            style={btnAcao("#94a3b8")} disabled={isPending}
                          >
                            🗑
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Pill({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <div style={{ background: bg, border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 14px" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 4,
  fontSize: 11, fontWeight: 600, color: "#64748b",
};
const selectStyle: React.CSSProperties = {
  border: "1.5px solid #C8D6E5", borderRadius: 6, padding: "6px 10px",
  fontSize: 12, outline: "none", background: "#fff", color: "#1C2833",
};
function btnSmall(bg: string): React.CSSProperties {
  return {
    background: bg, color: "#fff", border: "none", borderRadius: 6,
    padding: "6px 14px", fontWeight: 600, fontSize: 12, cursor: "pointer",
  };
}
function btnLink(bg: string): React.CSSProperties {
  return {
    display: "inline-block", background: bg, color: "#fff",
    padding: "9px 18px", borderRadius: 8, fontWeight: 600,
    fontSize: 13, textDecoration: "none",
  };
}
function btnAcao(bg: string): React.CSSProperties {
  return {
    background: bg, color: "#fff", border: "none", borderRadius: 4,
    padding: "4px 8px", fontWeight: 700, fontSize: 12, cursor: "pointer",
  };
}
