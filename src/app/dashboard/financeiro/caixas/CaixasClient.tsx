"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { FinPeriod } from "@/types";
import { abrirPeriodoAction, fecharPeriodoAction } from "../actions";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function fmtBRL(v: number | null) {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function CaixasClient({ periodos: init }: { periodos: FinPeriod[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [periodos, setPeriodos] = useState(init);
  const [modal, setModal] = useState(false);
  const [erro, setErro]   = useState("");

  const agora = new Date();
  const [novoMes, setNovoMes] = useState(agora.getMonth() + 1);
  const [novoAno, setNovoAno] = useState(agora.getFullYear());

  useEffect(() => { setPeriodos(init); }, [init]);

  function criarPeriodo(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    startTransition(async () => {
      try {
        await abrirPeriodoAction(novoMes, novoAno, null);
        setModal(false);
        router.refresh();
      } catch (err: any) {
        setErro(err.message ?? "Erro ao criar período");
      }
    });
  }

  function fechar(id: string) {
    if (!confirm("Fechar este período? Isso calculará o saldo final das contas.")) return;
    startTransition(async () => {
      try {
        await fecharPeriodoAction(id);
        router.refresh();
      } catch (err: any) {
        alert(err.message ?? "Erro ao fechar período");
      }
    });
  }

  const anos = [...new Set(periodos.map((p) => p.ano))].sort((a, b) => b - a);

  return (
    <div style={{ padding: "28px 28px", maxWidth: 900 }}>
      <div style={{ marginBottom: 8 }}>
        <Link href="/dashboard/financeiro" style={{ fontSize: 12, color: "#4A7DB5", fontWeight: 600, textDecoration: "none" }}>← Financeiro</Link>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1C2833", margin: 0 }}>Caixas Mensais</h1>
          <p style={{ color: "#5D6D7E", fontSize: 13, marginTop: 4 }}>Controle de períodos financeiros por mês/ano</p>
        </div>
        <button onClick={() => { setErro(""); setModal(true); }} style={btnStyle("#4A7DB5")}>
          + Abrir Período
        </button>
      </div>

      {periodos.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#5D6D7E", background: "#f8fafc", borderRadius: 12 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📅</div>
          <p style={{ fontWeight: 600 }}>Nenhum período aberto</p>
          <p style={{ fontSize: 12 }}>Clique em "+ Abrir Período" para iniciar</p>
        </div>
      ) : (
        anos.map((ano) => (
          <div key={ano} style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#475569", marginBottom: 12 }}>{ano}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
              {periodos.filter((p) => p.ano === ano).map((p) => {
                const isAberto = p.status === "ABERTO";
                return (
                  <div key={p.id} style={{
                    background: "#fff", border: `1.5px solid ${isAberto ? "#4A7DB5" : "#e2e8f0"}`,
                    borderRadius: 10, padding: "14px 16px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: "#1C2833" }}>
                        {MESES[p.mes - 1]}/{p.ano}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                        background: isAberto ? "#dbeafe" : "#f1f5f9",
                        color: isAberto ? "#1d4ed8" : "#475569",
                      }}>
                        {p.status}
                      </span>
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>Saldo inicial</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1C2833" }}>
                        {fmtBRL(p.saldo_inicial)}
                      </div>
                      {p.saldo_final != null && (
                        <>
                          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Saldo final</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: p.saldo_final >= 0 ? "#166534" : "#dc2626" }}>
                            {fmtBRL(p.saldo_final)}
                          </div>
                        </>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Link
                        href={`/dashboard/financeiro/lancamentos?data_de=${p.ano}-${String(p.mes).padStart(2, "0")}-01&data_ate=${p.ano}-${String(p.mes).padStart(2, "0")}-${new Date(p.ano, p.mes, 0).getDate()}`}
                        style={{ fontSize: 11, color: "#4A7DB5", fontWeight: 600, textDecoration: "none", flex: 1, textAlign: "center", background: "#eff6ff", padding: "5px 8px", borderRadius: 6 }}
                      >
                        Ver lançamentos
                      </Link>
                      {isAberto && (
                        <button
                          onClick={() => fechar(p.id)}
                          disabled={isPending}
                          style={{ fontSize: 11, background: "#fef9c3", color: "#854d0e", border: "none", borderRadius: 6, padding: "5px 8px", fontWeight: 600, cursor: "pointer" }}
                        >
                          Fechar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Modal */}
      {modal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: "#1C2833" }}>Abrir Novo Período</h2>
            <form onSubmit={criarPeriodo} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={labelStyle}>
                  Mês *
                  <select value={novoMes} onChange={(e) => setNovoMes(parseInt(e.target.value))} style={inputStyle}>
                    {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </label>
                <label style={labelStyle}>
                  Ano *
                  <input type="number" min="2020" max="2099" value={novoAno}
                    onChange={(e) => setNovoAno(parseInt(e.target.value))}
                    style={inputStyle} />
                </label>
              </div>
              {erro && <p style={{ color: "#dc2626", fontSize: 13 }}>{erro}</p>}
              <p style={{ fontSize: 12, color: "#5D6D7E" }}>
                O saldo inicial será copiado do saldo final do período anterior (se existir).
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setModal(false)} style={btnStyle("#94a3b8")}>Cancelar</button>
                <button type="submit" disabled={isPending} style={btnStyle("#4A7DB5")}>
                  {isPending ? "Abrindo..." : "Abrir Período"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 };
const modalStyle: React.CSSProperties = { background: "#fff", borderRadius: 14, padding: "28px 28px 24px", width: "100%", maxWidth: 420, boxShadow: "0 8px 40px rgba(0,0,0,.18)" };
const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: "#475569" };
const inputStyle: React.CSSProperties = { border: "1.5px solid #C8D6E5", borderRadius: 8, padding: "9px 12px", fontSize: 13, outline: "none", fontFamily: "inherit", background: "#fff", color: "#1C2833" };
function btnStyle(bg: string): React.CSSProperties { return { background: bg, color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer" }; }
