"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { FinAccountWithSaldo, FinAccountTipo } from "@/types";
import { FIN_ACCOUNT_TIPO_LABELS } from "@/types";
import { criarContaAction, editarContaAction } from "../actions";

const TIPOS: FinAccountTipo[] = ["BANCO", "CAIXA", "POUPANCA", "INVESTIMENTO"];

function fmtBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function ContasClient({ contas: init }: { contas: FinAccountWithSaldo[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [contas, setContas] = useState(init);
  const [modal, setModal]   = useState<"criar" | "editar" | null>(null);
  const [editando, setEditando] = useState<FinAccountWithSaldo | null>(null);
  const [tipo, setTipo]     = useState<FinAccountTipo>("CAIXA");
  const [erro, setErro]     = useState("");

  useEffect(() => { setContas(init); }, [init]);

  function abrirCriar() { setEditando(null); setTipo("CAIXA"); setErro(""); setModal("criar"); }
  function abrirEditar(c: FinAccountWithSaldo) { setEditando(c); setTipo(c.tipo); setErro(""); setModal("editar"); }
  function fechar() { setModal(null); setEditando(null); setErro(""); }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErro("");
    startTransition(async () => {
      try {
        if (modal === "criar") await criarContaAction(fd);
        else if (editando) await editarContaAction(editando.id, fd);
        fechar();
        router.refresh();
      } catch (err: any) {
        setErro(err.message ?? "Erro ao salvar");
      }
    });
  }

  const saldoTotal = contas.reduce((acc, c) => acc + c.saldo_atual, 0);

  return (
    <div style={{ padding: "28px 28px", maxWidth: 900 }}>
      <div style={{ marginBottom: 8 }}>
        <Link href="/dashboard/financeiro" style={{ fontSize: 12, color: "#4A7DB5", fontWeight: 600, textDecoration: "none" }}>← Financeiro</Link>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1C2833", margin: 0 }}>Contas Bancárias / Caixas</h1>
          <p style={{ color: "#5D6D7E", fontSize: 13, marginTop: 4 }}>
            Saldo total: <strong style={{ color: saldoTotal >= 0 ? "#166534" : "#dc2626" }}>{fmtBRL(saldoTotal)}</strong>
          </p>
        </div>
        <button onClick={abrirCriar} style={btnStyle("#4A7DB5")}>+ Nova Conta</button>
      </div>

      {contas.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#5D6D7E", background: "#f8fafc", borderRadius: 12 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🏦</div>
          <p style={{ fontWeight: 600 }}>Nenhuma conta cadastrada</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {contas.map((c) => (
            <div key={c.id} style={{ background: "#fff", border: "1.5px solid #C8D6E5", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 14, color: "#1C2833" }}>{c.nome}</span>
                  <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: "#f1f5f9", color: "#475569" }}>
                    {FIN_ACCOUNT_TIPO_LABELS[c.tipo]}
                  </span>
                </div>
              </div>
              {c.banco && <p style={{ fontSize: 12, color: "#5D6D7E", marginBottom: 4 }}>🏦 {c.banco}{c.agencia ? ` · Ag. ${c.agencia}` : ""}{c.conta ? ` · CC ${c.conta}${c.digito ? `-${c.digito}` : ""}` : ""}</p>}
              {c.chave_pix && <p style={{ fontSize: 12, color: "#5D6D7E", marginBottom: 8 }}>PIX: {c.chave_pix}</p>}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>Saldo atual</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: c.saldo_atual >= 0 ? "#166534" : "#dc2626" }}>
                  {fmtBRL(c.saldo_atual)}
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>
                  Saldo inicial: {fmtBRL(c.saldo_inicial)}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Link href={`/dashboard/financeiro/lancamentos?account_id=${c.id}`} style={{ ...btnSmall("#4A7DB5"), textDecoration: "none", flex: 1, textAlign: "center" }}>
                  Ver lançamentos
                </Link>
                <button onClick={() => abrirEditar(c)} style={btnSmall("#64748b")}>Editar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: "#1C2833" }}>
              {modal === "criar" ? "Nova Conta" : "Editar Conta"}
            </h2>
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label style={labelStyle}>
                Nome da conta *
                <input name="nome" required defaultValue={editando?.nome ?? ""} style={inputStyle} placeholder="Ex: Caixa Geral" />
              </label>
              <label style={labelStyle}>
                Tipo *
                <select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as FinAccountTipo)} style={inputStyle}>
                  {TIPOS.map((t) => <option key={t} value={t}>{FIN_ACCOUNT_TIPO_LABELS[t]}</option>)}
                </select>
              </label>
              {tipo === "BANCO" && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <label style={labelStyle}>
                      Banco
                      <input name="banco" defaultValue={editando?.banco ?? ""} style={inputStyle} placeholder="Ex: Bradesco" />
                    </label>
                    <label style={labelStyle}>
                      Agência
                      <input name="agencia" defaultValue={editando?.agencia ?? ""} style={inputStyle} placeholder="0000" />
                    </label>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 60px", gap: 12 }}>
                    <label style={labelStyle}>
                      Conta
                      <input name="conta" defaultValue={editando?.conta ?? ""} style={inputStyle} placeholder="00000" />
                    </label>
                    <label style={labelStyle}>
                      Dígito
                      <input name="digito" defaultValue={editando?.digito ?? ""} style={inputStyle} placeholder="0" />
                    </label>
                  </div>
                  <label style={labelStyle}>
                    Chave PIX
                    <input name="chave_pix" defaultValue={editando?.chave_pix ?? ""} style={inputStyle} placeholder="CPF, CNPJ, e-mail ou aleatória" />
                  </label>
                </>
              )}
              {modal === "criar" && (
                <label style={labelStyle}>
                  Saldo inicial (R$)
                  <input name="saldo_inicial" type="number" step="0.01" defaultValue="0" style={inputStyle} />
                </label>
              )}
              {erro && <p style={{ color: "#dc2626", fontSize: 13 }}>{erro}</p>}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                <button type="button" onClick={fechar} style={btnStyle("#94a3b8")}>Cancelar</button>
                <button type="submit" disabled={isPending} style={btnStyle("#4A7DB5")}>
                  {isPending ? "Salvando..." : "Salvar"}
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
const modalStyle: React.CSSProperties = { background: "#fff", borderRadius: 14, padding: "28px 28px 24px", width: "100%", maxWidth: 480, boxShadow: "0 8px 40px rgba(0,0,0,.18)", maxHeight: "90vh", overflowY: "auto" };
const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: "#475569" };
const inputStyle: React.CSSProperties = { border: "1.5px solid #C8D6E5", borderRadius: 8, padding: "9px 12px", fontSize: 13, outline: "none", fontFamily: "inherit", background: "#fff", color: "#1C2833" };
function btnStyle(bg: string): React.CSSProperties { return { background: bg, color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer" }; }
function btnSmall(bg: string): React.CSSProperties { return { background: bg, color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontWeight: 600, fontSize: 12, cursor: "pointer" }; }
