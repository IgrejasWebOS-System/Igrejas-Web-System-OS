"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  FinUnitRepasseListItem,
  FinAccountWithSaldo,
  FinRepasseStatus,
} from "@/types";
import { FIN_REPASSE_STATUS_COLORS } from "@/types";
import { criarRepasseAction, executarRepasseAction } from "../actions";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDate(d: string) {
  if (!d) return "—";
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y}`;
}

type UnitOpt = { id: string; name: string; unit_type: string };

type Props = {
  repasses: FinUnitRepasseListItem[];
  contas: FinAccountWithSaldo[];
  unidades: UnitOpt[];
};

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

export default function RepassesClient({ repasses, contas, unidades }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [modal, setModal] = useState(false);
  const [filtro, setFiltro] = useState<FinRepasseStatus | "todos">("todos");
  const [erro, setErro] = useState("");

  const filtrados = repasses.filter((r) =>
    filtro === "todos" || r.status === filtro
  );

  const totalExecutado = repasses
    .filter((r) => r.status === "EXECUTADO")
    .reduce((a, r) => a + r.valor, 0);

  const totalPendente = repasses
    .filter((r) => r.status === "PENDENTE")
    .reduce((a, r) => a + r.valor, 0);

  function submitNovo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErro("");
    startTransition(async () => {
      try {
        await criarRepasseAction(fd);
        setModal(false);
        router.refresh();
      } catch (err: any) {
        setErro(err.message ?? "Erro ao criar repasse");
      }
    });
  }

  function executar(id: string) {
    if (!confirm("Confirma a execução do repasse? Isso gerará os lançamentos automaticamente.")) return;
    startTransition(async () => {
      try {
        await executarRepasseAction(id);
        router.refresh();
      } catch (err: any) {
        alert(err.message ?? "Erro ao executar repasse");
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
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1C2833", margin: 0 }}>Repasses entre Unidades</h1>
          <p style={{ color: "#5D6D7E", fontSize: 13, marginTop: 4 }}>
            Fluxo de recursos entre congregações, setores e sede
          </p>
        </div>
        <button onClick={() => { setErro(""); setModal(true); }} style={btnStyle("#4A7DB5")}>
          + Registrar Repasse
        </button>
      </div>

      {/* Cards resumo */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total Repasses", value: repasses.length, sub: "registros", color: "#4A7DB5" },
          { label: "Executado", value: fmtBRL(totalExecutado), sub: "efetivado", color: "#166534" },
          { label: "A Executar", value: fmtBRL(totalPendente), sub: "pendente de execução", color: "#92400e" },
        ].map((c) => (
          <div key={c.label} style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: "16px 20px" }}>
            <p style={{ fontSize: 12, color: "#64748b", fontWeight: 600, margin: 0 }}>{c.label}</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: c.color, margin: "4px 0 2px" }}>{c.value}</p>
            <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Info */}
      <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "10px 16px", marginBottom: 20, fontSize: 12, color: "#1d4ed8" }}>
        ℹ️ Ao executar um repasse com contas vinculadas, os lançamentos de saída e entrada são gerados automaticamente.
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["todos", "PENDENTE", "EXECUTADO", "CANCELADO"].map((s) => (
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
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr 1fr", background: "#0f172a", color: "#94a3b8", fontSize: 10, fontWeight: 700, textTransform: "uppercase", padding: "10px 16px" }}>
          <span>Descrição</span>
          <span>Fluxo</span>
          <span>Valor</span>
          <span>Data</span>
          <span>Status</span>
          <span>Ações</span>
        </div>

        {filtrados.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>
            <p style={{ fontWeight: 600 }}>Nenhum repasse encontrado</p>
          </div>
        ) : filtrados.map((r) => {
          const sc = FIN_REPASSE_STATUS_COLORS[r.status] ?? { bg: "#f1f5f9", color: "#475569" };
          return (
            <div key={r.id} style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr 1fr", padding: "12px 16px", borderBottom: "1px solid #f1f5f9", alignItems: "center", fontSize: 13 }}>
              <div>
                <div style={{ fontWeight: 600, color: "#1C2833" }}>{r.descricao}</div>
                {r.competencia_mes && r.competencia_ano && (
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>Competência: {MESES[r.competencia_mes - 1]}/{r.competencia_ano}</div>
                )}
                {r.percentual && <div style={{ fontSize: 11, color: "#94a3b8" }}>{r.percentual}% base</div>}
              </div>
              <div style={{ fontSize: 12 }}>
                <div style={{ fontWeight: 600, color: "#dc2626" }}>↑ {r.unit_from_nome}</div>
                <div style={{ color: "#94a3b8", fontSize: 10 }}>→</div>
                <div style={{ fontWeight: 600, color: "#166534" }}>↓ {r.unit_to_nome}</div>
                {r.account_from_nome && <div style={{ fontSize: 10, color: "#94a3b8" }}>{r.account_from_nome} → {r.account_to_nome ?? "s/ conta destino"}</div>}
              </div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{fmtBRL(r.valor)}</div>
              <div style={{ fontSize: 12 }}>{fmtDate(r.data)}</div>
              <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color, width: "fit-content" }}>
                {r.status}
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                {r.status === "PENDENTE" && (
                  <button
                    onClick={() => executar(r.id)}
                    disabled={isPending}
                    style={{ padding: "5px 10px", border: "none", borderRadius: 7, background: "#166534", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                  >
                    Executar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal criar repasse */}
      {modal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: "#1C2833" }}>Registrar Repasse</h2>
            <form onSubmit={submitNovo} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label style={labelStyle}>
                Descrição *
                <input name="descricao" required style={inputStyle} placeholder="Ex: Repasse de dízimos — Março 2026" />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={labelStyle}>
                  Unidade de Origem *
                  <select name="unit_from_id" required style={inputStyle}>
                    <option value="">Selecione...</option>
                    {unidades.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.unit_type})</option>)}
                  </select>
                </label>
                <label style={labelStyle}>
                  Unidade de Destino *
                  <select name="unit_to_id" required style={inputStyle}>
                    <option value="">Selecione...</option>
                    {unidades.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.unit_type})</option>)}
                  </select>
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={labelStyle}>
                  Conta de Saída (opcional)
                  <select name="account_from_id" style={inputStyle}>
                    <option value="">Sem conta vinculada</option>
                    {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </label>
                <label style={labelStyle}>
                  Conta de Entrada (opcional)
                  <select name="account_to_id" style={inputStyle}>
                    <option value="">Sem conta vinculada</option>
                    {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={labelStyle}>
                  Valor (R$) *
                  <input name="valor" type="number" step="0.01" min="0.01" required style={inputStyle} />
                </label>
                <label style={labelStyle}>
                  Data do Repasse *
                  <input name="data" type="date" required style={inputStyle} defaultValue={new Date().toISOString().slice(0, 10)} />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={labelStyle}>
                  Competência (Mês)
                  <select name="competencia_mes" style={inputStyle}>
                    <option value="">—</option>
                    {MESES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                  </select>
                </label>
                <label style={labelStyle}>
                  Competência (Ano)
                  <input name="competencia_ano" type="number" min="2020" max="2099" style={inputStyle} placeholder={new Date().getFullYear().toString()} />
                </label>
              </div>

              {erro && <p style={{ color: "#dc2626", fontSize: 13 }}>{erro}</p>}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setModal(false)} style={btnStyle("#94a3b8")}>Cancelar</button>
                <button type="submit" disabled={isPending} style={btnStyle("#4A7DB5")}>
                  {isPending ? "Salvando..." : "Registrar Repasse"}
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
