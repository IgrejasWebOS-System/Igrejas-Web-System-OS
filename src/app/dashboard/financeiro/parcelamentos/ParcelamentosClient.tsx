"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  FinInstallmentPlanListItem,
  FinAccountWithSaldo,
  FinCategoryWithChildren,
  FinInstallmentStatus,
} from "@/types";
import {
  FIN_INSTALLMENT_STATUS_COLORS,
  FIN_PERIODICITY_LABELS,
} from "@/types";
import { criarParcelamentoAction, buscarParcelasAction, pagarParcelaAction } from "../actions";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDate(d: string) {
  if (!d) return "";
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y}`;
}

type Props = {
  planos: FinInstallmentPlanListItem[];
  contas: FinAccountWithSaldo[];
  categorias: FinCategoryWithChildren[];
};

export default function ParcelamentosClient({ planos, contas, categorias }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [modal, setModal]         = useState(false);
  const [tipoTx, setTipoTx]       = useState<"ENTRADA" | "SAIDA">("SAIDA");
  const [planDetalhe, setPlanDetalhe] = useState<string | null>(null);
  const [parcelas, setParcelas]   = useState<any[]>([]);
  const [loadParcelas, setLoadParcelas] = useState(false);
  const [modalPagamento, setModalPagamento] = useState<string | null>(null);
  const [erro, setErro]           = useState("");

  const catsFlat = flatCats(categorias).filter((c) =>
    tipoTx === "ENTRADA" ? c.tipo === "RECEITA" : c.tipo === "DESPESA"
  );

  async function abrirDetalhe(planId: string) {
    setPlanDetalhe(planId);
    setLoadParcelas(true);
    try {
      const data = await buscarParcelasAction(planId);
      setParcelas(data);
    } finally {
      setLoadParcelas(false);
    }
  }

  function submitNovo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("tipo", tipoTx);
    setErro("");
    startTransition(async () => {
      try {
        const planId = await criarParcelamentoAction(fd);
        setModal(false);
        router.refresh();
        abrirDetalhe(planId);
      } catch (err: any) {
        setErro(err.message ?? "Erro ao criar parcelamento");
      }
    });
  }

  function submitPagamento(e: React.FormEvent<HTMLFormElement>, installmentId: string) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await pagarParcelaAction(installmentId, fd);
        setModalPagamento(null);
        if (planDetalhe) abrirDetalhe(planDetalhe);
        router.refresh();
      } catch (err: any) {
        alert(err.message);
      }
    });
  }

  const planoAtual = planos.find((p) => p.id === planDetalhe);

  return (
    <div style={{ padding: "28px 28px", maxWidth: 1100 }}>
      <div style={{ marginBottom: 8 }}>
        <Link href="/dashboard/financeiro" style={{ fontSize: 12, color: "#4A7DB5", fontWeight: 600, textDecoration: "none" }}>← Financeiro</Link>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1C2833", margin: 0 }}>Parcelamentos</h1>
          <p style={{ color: "#5D6D7E", fontSize: 13, marginTop: 4 }}>
            Compromissos financeiros divididos em parcelas periódicas
          </p>
        </div>
        <button onClick={() => { setErro(""); setModal(true); }} style={btnStyle("#4A7DB5")}>
          + Novo Parcelamento
        </button>
      </div>

      {/* Info banner */}
      <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "10px 16px", marginBottom: 20, fontSize: 12, color: "#1d4ed8" }}>
        ℹ️ Parcelamentos geram parcelas automaticamente. Cada parcela pode ser marcada como paga individualmente, criando o lançamento correspondente.
      </div>

      {/* Tabela de planos */}
      <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr", gap: 0, background: "#0f172a", color: "#94a3b8", fontSize: 10, fontWeight: 700, textTransform: "uppercase", padding: "10px 16px" }}>
          <span>Descrição</span>
          <span>Tipo</span>
          <span>Valor Total</span>
          <span>Progresso</span>
          <span>Status</span>
          <span>Ações</span>
        </div>

        {planos.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>
            <p style={{ fontWeight: 600 }}>Nenhum parcelamento cadastrado</p>
          </div>
        ) : planos.map((p) => {
          const pagas = p.pagas ?? 0;
          const atrasadas = p.atrasadas ?? 0;
          const pct = Math.round((pagas / p.num_parcelas) * 100);
          const statusColor = p.status === "QUITADO" ? { bg: "#f0fdf4", color: "#166534" } :
                              p.status === "CANCELADO" ? { bg: "#fef2f2", color: "#991b1b" } :
                              { bg: "#eff6ff", color: "#1d4ed8" };
          return (
            <div key={p.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr", gap: 0, padding: "12px 16px", borderBottom: "1px solid #f1f5f9", alignItems: "center", fontSize: 13 }}>
              <div>
                <div style={{ fontWeight: 600, color: "#1C2833" }}>{p.descricao}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>{p.account_nome} · {p.category_nome}</div>
                {p.party_nome && <div style={{ fontSize: 11, color: "#94a3b8" }}>{p.party_nome}</div>}
              </div>
              <div>
                <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: p.tipo === "ENTRADA" ? "#f0fdf4" : "#fef2f2", color: p.tipo === "ENTRADA" ? "#166534" : "#991b1b" }}>
                  {p.tipo}
                </span>
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{fmtBRL(p.valor_total)}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>{p.num_parcelas}x {fmtBRL(p.valor_parcela)}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>{FIN_PERIODICITY_LABELS[p.periodicidade]}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, marginBottom: 3 }}>{pagas}/{p.num_parcelas} pagas {atrasadas > 0 && <span style={{ color: "#dc2626" }}>· {atrasadas} atrasada{atrasadas > 1 ? "s" : ""}</span>}</div>
                <div style={{ background: "#e2e8f0", borderRadius: 99, height: 5, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: "#22c55e", borderRadius: 99 }} />
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{fmtBRL(p.valor_pago ?? 0)} pago</div>
              </div>
              <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: statusColor.bg, color: statusColor.color, width: "fit-content" }}>
                {p.status}
              </span>
              <button
                onClick={() => abrirDetalhe(p.id)}
                style={{ padding: "6px 12px", border: "1.5px solid #C8D6E5", borderRadius: 8, background: "#fff", fontSize: 12, fontWeight: 600, color: "#4A7DB5", cursor: "pointer" }}
              >
                Ver Parcelas
              </button>
            </div>
          );
        })}
      </div>

      {/* Modal criar parcelamento */}
      {modal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "#1C2833" }}>Novo Parcelamento</h2>

            {/* Toggle tipo */}
            <div style={{ display: "flex", gap: 0, border: "1.5px solid #C8D6E5", borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
              {(["ENTRADA", "SAIDA"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setTipoTx(t)} style={{
                  flex: 1, padding: "9px", border: "none", cursor: "pointer",
                  fontWeight: 700, fontSize: 13,
                  background: tipoTx === t ? (t === "ENTRADA" ? "#166534" : "#991b1b") : "#fff",
                  color: tipoTx === t ? "#fff" : "#64748b",
                }}>{t === "ENTRADA" ? "↓ Receita a Receber" : "↑ Despesa a Pagar"}</button>
              ))}
            </div>

            <form onSubmit={submitNovo} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label style={labelStyle}>
                Descrição *
                <input name="descricao" required style={inputStyle} placeholder="Ex: Compra de instrumento musical" />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={labelStyle}>
                  Conta *
                  <select name="account_id" required style={inputStyle}>
                    <option value="">Selecione...</option>
                    {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </label>
                <label style={labelStyle}>
                  Categoria *
                  <select name="category_id" required style={inputStyle}>
                    <option value="">Selecione...</option>
                    {catsFlat.map((c) => <option key={c.id} value={c.id}>{c.codigo} — {c.nome}</option>)}
                  </select>
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <label style={labelStyle}>
                  Valor Total (R$) *
                  <input name="valor_total" type="number" step="0.01" min="0.01" required style={inputStyle} placeholder="0,00" />
                </label>
                <label style={labelStyle}>
                  Nº de Parcelas *
                  <input name="num_parcelas" type="number" min="1" max="360" required style={inputStyle} placeholder="12" />
                </label>
                <label style={labelStyle}>
                  Periodicidade *
                  <select name="periodicidade" required style={inputStyle}>
                    {Object.entries(FIN_PERIODICITY_LABELS).filter(([k]) => k !== "DIARIO").map(([v, l]) => (
                      <option key={v} value={v} selected={v === "MENSAL"}>{l}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label style={labelStyle}>
                Data da 1ª Parcela *
                <input name="data_primeira_parcela" type="date" required style={inputStyle} />
              </label>

              <label style={labelStyle}>
                Observações
                <textarea name="observacoes" rows={2} style={{ ...inputStyle, resize: "vertical" }} />
              </label>

              {erro && <p style={{ color: "#dc2626", fontSize: 13 }}>{erro}</p>}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setModal(false)} style={btnStyle("#94a3b8")}>Cancelar</button>
                <button type="submit" disabled={isPending} style={btnStyle("#4A7DB5")}>
                  {isPending ? "Gerando parcelas..." : "Criar e Gerar Parcelas"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal detalhe de parcelas */}
      {planDetalhe && (
        <div style={overlayStyle} onClick={() => setPlanDetalhe(null)}>
          <div style={{ ...modalStyle, maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1C2833", margin: 0 }}>
                Parcelas — {planoAtual?.descricao}
              </h2>
              <button onClick={() => setPlanDetalhe(null)} style={{ border: "none", background: "none", fontSize: 18, cursor: "pointer", color: "#64748b" }}>✕</button>
            </div>

            {loadParcelas ? (
              <p style={{ color: "#64748b", textAlign: "center" }}>Carregando parcelas...</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 400, overflowY: "auto" }}>
                {parcelas.map((inst) => {
                  const sc = FIN_INSTALLMENT_STATUS_COLORS[inst.status as FinInstallmentStatus] ?? { bg: "#f1f5f9", color: "#475569" };
                  return (
                    <div key={inst.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 8, background: "#fafafa" }}>
                      <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 12, minWidth: 28, color: "#64748b" }}>
                        #{inst.numero}
                      </span>
                      <span style={{ flex: 1, fontSize: 13 }}>
                        <div style={{ fontWeight: 600, color: "#1C2833" }}>{fmtBRL(inst.valor)}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>Vence: {fmtDate(inst.data_vencimento)}</div>
                        {inst.data_pagamento && <div style={{ fontSize: 11, color: "#64748b" }}>Pago: {fmtDate(inst.data_pagamento)}</div>}
                      </span>
                      <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: sc.bg, color: sc.color }}>
                        {inst.status}
                      </span>
                      {inst.status === "PENDENTE" || inst.status === "ATRASADO" ? (
                        <button
                          onClick={() => setModalPagamento(inst.id)}
                          style={{ padding: "5px 10px", border: "none", borderRadius: 7, background: "#166534", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                        >
                          Pagar
                        </button>
                      ) : (
                        <div style={{ width: 56 }} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal pagamento de parcela */}
      {modalPagamento && (
        <div style={overlayStyle}>
          <div style={{ ...modalStyle, maxWidth: 380 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: "#1C2833" }}>Registrar Pagamento</h2>
            <form onSubmit={(e) => submitPagamento(e, modalPagamento)} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label style={labelStyle}>
                Data do Pagamento *
                <input name="data_pagamento" type="date" required style={inputStyle} defaultValue={new Date().toISOString().slice(0, 10)} />
              </label>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setModalPagamento(null)} style={btnStyle("#94a3b8")}>Cancelar</button>
                <button type="submit" disabled={isPending} style={btnStyle("#166534")}>
                  {isPending ? "Registrando..." : "Confirmar Pagamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function flatCats(cats: FinCategoryWithChildren[]): FinCategoryWithChildren[] {
  return cats.flatMap((c) => [c, ...flatCats((c.children ?? []) as unknown as FinCategoryWithChildren[])]);
}

const overlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.5)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999,
};
const modalStyle: React.CSSProperties = {
  background: "#fff", borderRadius: 14, padding: "28px 28px 24px",
  width: "100%", maxWidth: 540, boxShadow: "0 8px 40px rgba(0,0,0,.2)",
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
