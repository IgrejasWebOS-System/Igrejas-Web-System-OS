"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  FinRecurringListItem,
  FinAccountWithSaldo,
  FinCategoryWithChildren,
  FinRecurringStatus,
} from "@/types";
import {
  FIN_RECURRING_STATUS_COLORS,
  FIN_RECURRING_PERIODICITY_LABELS,
} from "@/types";
import {
  criarRecorrenteAction,
  toggleRecorrenteAction,
  gerarLancamentoRecorrenteAction,
} from "../actions";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDate(d: string | null) {
  if (!d) return "—";
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y}`;
}

type Props = {
  recorrentes: FinRecurringListItem[];
  contas: FinAccountWithSaldo[];
  categorias: FinCategoryWithChildren[];
};

export default function ProgramacoesClient({ recorrentes, contas, categorias }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [modal, setModal]   = useState(false);
  const [tipoTx, setTipoTx] = useState<"ENTRADA" | "SAIDA">("SAIDA");
  const [filtro, setFiltro] = useState<FinRecurringStatus | "todos">("todos");
  const [erro, setErro]     = useState("");

  const catsFlat = flatCats(categorias).filter((c) =>
    tipoTx === "ENTRADA" ? c.tipo === "RECEITA" : c.tipo === "DESPESA"
  );

  const filtrados = recorrentes.filter((r) =>
    filtro === "todos" || r.status === filtro
  );

  function submitNova(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("tipo", tipoTx);
    setErro("");
    startTransition(async () => {
      try {
        await criarRecorrenteAction(fd);
        setModal(false);
        router.refresh();
      } catch (err: any) {
        setErro(err.message ?? "Erro ao criar programação");
      }
    });
  }

  function toggleStatus(id: string, current: FinRecurringStatus) {
    const novo = current === "ATIVO" ? "PAUSADO" : "ATIVO";
    startTransition(async () => {
      await toggleRecorrenteAction(id, novo as any);
      router.refresh();
    });
  }

  function gerarLancamento(id: string) {
    startTransition(async () => {
      try {
        await gerarLancamentoRecorrenteAction(id);
        router.refresh();
        alert("Lançamento gerado com status PENDENTE.");
      } catch (err: any) {
        alert(err.message ?? "Erro ao gerar lançamento");
      }
    });
  }

  return (
    <div style={{ padding: "28px 28px", maxWidth: 1100 }}>
      <div style={{ marginBottom: 8 }}>
        <Link href="/dashboard/financeiro" style={{ fontSize: 12, color: "#4A7DB5", fontWeight: 600, textDecoration: "none" }}>← Financeiro</Link>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1C2833", margin: 0 }}>Programações Recorrentes</h1>
          <p style={{ color: "#5D6D7E", fontSize: 13, marginTop: 4 }}>
            Lançamentos automáticos periódicos (conta de luz, dízimo de membro, prebenda…)
          </p>
        </div>
        <button onClick={() => { setErro(""); setModal(true); }} style={btnStyle("#4A7DB5")}>
          + Nova Programação
        </button>
      </div>

      {/* Info banner */}
      <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "10px 16px", marginBottom: 20, fontSize: 12, color: "#166534" }}>
        ℹ️ Clique em "Gerar" para criar o lançamento da próxima competência como PENDENTE. Ele pode ser aprovado na página de Lançamentos.
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["todos", "ATIVO", "PAUSADO", "ENCERRADO"].map((s) => (
          <button key={s} onClick={() => setFiltro(s as any)} style={{
            padding: "6px 14px", borderRadius: 20, border: "1.5px solid",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
            borderColor: filtro === s ? "#4A7DB5" : "#C8D6E5",
            background:  filtro === s ? "#4A7DB5" : "#fff",
            color:       filtro === s ? "#fff"    : "#5D6D7E",
          }}>
            {s === "todos" ? "Todos" : s}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 1fr 1fr 1fr", background: "#0f172a", color: "#94a3b8", fontSize: 10, fontWeight: 700, textTransform: "uppercase", padding: "10px 16px" }}>
          <span>Programação</span>
          <span>Tipo</span>
          <span>Valor</span>
          <span>Periodicidade</span>
          <span>Próxima</span>
          <span>Ações</span>
        </div>

        {filtrados.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>
            <p style={{ fontWeight: 600 }}>Nenhuma programação encontrada</p>
          </div>
        ) : filtrados.map((r) => {
          const sc = FIN_RECURRING_STATUS_COLORS[r.status] ?? { bg: "#f1f5f9", color: "#475569" };
          const vencida = r.proxima_geracao && r.proxima_geracao < new Date().toISOString().slice(0, 10) && r.status === "ATIVO";
          return (
            <div key={r.id} style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 1fr 1fr 1fr", padding: "12px 16px", borderBottom: "1px solid #f1f5f9", alignItems: "center", fontSize: 13 }}>
              <div>
                <div style={{ fontWeight: 600, color: "#1C2833" }}>{r.descricao}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>{r.account_nome} · {r.category_nome}</div>
                {r.party_nome && <div style={{ fontSize: 11, color: "#94a3b8" }}>👤 {r.party_nome}</div>}
                <div style={{ fontSize: 11, color: "#64748b" }}>{r.total_gerado} gerado{r.total_gerado !== 1 ? "s" : ""}</div>
              </div>
              <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: r.tipo === "ENTRADA" ? "#f0fdf4" : "#fef2f2", color: r.tipo === "ENTRADA" ? "#166534" : "#991b1b" }}>
                {r.tipo}
              </span>
              <div style={{ fontWeight: 600 }}>{fmtBRL(r.valor)}</div>
              <div style={{ fontSize: 12, color: "#475569" }}>{FIN_RECURRING_PERIODICITY_LABELS[r.periodicidade]}</div>
              <div style={{ fontSize: 12, color: vencida ? "#dc2626" : "#475569", fontWeight: vencida ? 700 : 400 }}>
                {fmtDate(r.proxima_geracao)}
                {vencida && <div style={{ fontSize: 10, color: "#dc2626" }}>⚠ Vencida</div>}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={{ padding: "2px 6px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: sc.bg, color: sc.color }}>
                  {r.status}
                </span>
                {r.status === "ATIVO" && (
                  <button onClick={() => gerarLancamento(r.id)} disabled={isPending} style={{ padding: "4px 8px", border: "none", borderRadius: 6, background: "#4A7DB5", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    Gerar
                  </button>
                )}
                <button
                  onClick={() => toggleStatus(r.id, r.status)}
                  disabled={isPending || r.status === "ENCERRADO"}
                  style={{ padding: "4px 8px", border: "1px solid #C8D6E5", borderRadius: 6, background: "#fff", fontSize: 11, fontWeight: 600, color: "#475569", cursor: "pointer" }}
                >
                  {r.status === "ATIVO" ? "Pausar" : "Retomar"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal criar */}
      {modal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "#1C2833" }}>Nova Programação Recorrente</h2>

            <div style={{ display: "flex", gap: 0, border: "1.5px solid #C8D6E5", borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
              {(["ENTRADA", "SAIDA"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setTipoTx(t)} style={{
                  flex: 1, padding: "9px", border: "none", cursor: "pointer",
                  fontWeight: 700, fontSize: 13,
                  background: tipoTx === t ? (t === "ENTRADA" ? "#166534" : "#991b1b") : "#fff",
                  color: tipoTx === t ? "#fff" : "#64748b",
                }}>{t === "ENTRADA" ? "↓ Receita Recorrente" : "↑ Despesa Recorrente"}</button>
              ))}
            </div>

            <form onSubmit={submitNova} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label style={labelStyle}>
                Descrição *
                <input name="descricao" required style={inputStyle} placeholder="Ex: Conta de Energia — CEMIG" />
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={labelStyle}>
                  Valor (R$) *
                  <input name="valor" type="number" step="0.01" min="0.01" required style={inputStyle} />
                </label>
                <label style={labelStyle}>
                  Periodicidade *
                  <select name="periodicidade" required defaultValue="MENSAL" style={inputStyle}>
                    {Object.entries(FIN_RECURRING_PERIODICITY_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={labelStyle}>
                  Data de Início *
                  <input name="data_inicio" type="date" required style={inputStyle} />
                </label>
                <label style={labelStyle}>
                  Data de Encerramento
                  <input name="data_fim" type="date" style={inputStyle} />
                </label>
              </div>

              {erro && <p style={{ color: "#dc2626", fontSize: 13 }}>{erro}</p>}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setModal(false)} style={btnStyle("#94a3b8")}>Cancelar</button>
                <button type="submit" disabled={isPending} style={btnStyle("#4A7DB5")}>
                  {isPending ? "Salvando..." : "Criar Programação"}
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
  return cats.flatMap((c) => [c, ...flatCats(c.children ?? [])]);
}

const overlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.5)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999,
};
const modalStyle: React.CSSProperties = {
  background: "#fff", borderRadius: 14, padding: "28px 28px 24px",
  width: "100%", maxWidth: 520, boxShadow: "0 8px 40px rgba(0,0,0,.2)",
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
