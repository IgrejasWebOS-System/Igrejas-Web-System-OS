"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { FinTransferListItem, FinAccountWithSaldo } from "@/types";
import { criarTransferenciaAction } from "../actions";

function fmtBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

export default function TransferenciasClient({
  transferencias: init, contas,
}: { transferencias: FinTransferListItem[]; contas: FinAccountWithSaldo[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState(init);
  const [modal, setModal] = useState(false);
  const [erro, setErro]   = useState("");

  useEffect(() => { setItems(init); }, [init]);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErro("");
    startTransition(async () => {
      try {
        await criarTransferenciaAction(fd);
        setModal(false);
        router.refresh();
      } catch (err: any) {
        setErro(err.message ?? "Erro ao criar transferência");
      }
    });
  }

  return (
    <div style={{ padding: "28px 28px", maxWidth: 900 }}>
      <div style={{ marginBottom: 8 }}>
        <Link href="/dashboard/financeiro" style={{ fontSize: 12, color: "#4A7DB5", fontWeight: 600, textDecoration: "none" }}>← Financeiro</Link>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1C2833", margin: 0 }}>Transferências entre Contas</h1>
          <p style={{ color: "#5D6D7E", fontSize: 13, marginTop: 4 }}>{items.length} transferência(s)</p>
        </div>
        <button onClick={() => { setErro(""); setModal(true); }} style={btnStyle("#4A7DB5")}>
          + Nova Transferência
        </button>
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#5D6D7E", background: "#f8fafc", borderRadius: 12 }}>
          <p style={{ fontWeight: 600 }}>Nenhuma transferência registrada</p>
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Data", "De", "Para", "Valor", "Descrição", "Status"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "#5D6D7E" }}>{fmtDate(t.data)}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, color: "#1C2833" }}>{t.account_from_nome}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, color: "#1C2833" }}>{t.account_to_nome}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "#1C2833" }}>{fmtBRL(t.valor)}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "#5D6D7E" }}>{t.descricao ?? "—"}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
                      background: t.status === "APROVADO" ? "#f0fdf4" : "#fffbeb",
                      color: t.status === "APROVADO" ? "#166534" : "#92400e",
                    }}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: "#1C2833" }}>Nova Transferência</h2>
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label style={labelStyle}>
                Conta de Origem *
                <select name="account_from_id" required style={inputStyle}>
                  <option value="">Selecione...</option>
                  {contas.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome} ({fmtBRL(c.saldo_atual)})</option>
                  ))}
                </select>
              </label>
              <label style={labelStyle}>
                Conta de Destino *
                <select name="account_to_id" required style={inputStyle}>
                  <option value="">Selecione...</option>
                  {contas.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={labelStyle}>
                  Valor (R$) *
                  <input name="valor" type="number" step="0.01" min="0.01" required style={inputStyle} placeholder="0,00" />
                </label>
                <label style={labelStyle}>
                  Data *
                  <input name="data" type="date" required style={inputStyle} defaultValue={new Date().toISOString().slice(0, 10)} />
                </label>
              </div>
              <label style={labelStyle}>
                Descrição
                <input name="descricao" style={inputStyle} placeholder="Motivo da transferência..." />
              </label>
              {erro && <p style={{ color: "#dc2626", fontSize: 13 }}>{erro}</p>}
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#166534" }}>
                ✓ A transferência criará automaticamente lançamentos de saída e entrada já APROVADOS.
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                <button type="button" onClick={() => setModal(false)} style={btnStyle("#94a3b8")}>Cancelar</button>
                <button type="submit" disabled={isPending} style={btnStyle("#4A7DB5")}>
                  {isPending ? "Processando..." : "Executar Transferência"}
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
const modalStyle: React.CSSProperties = { background: "#fff", borderRadius: 14, padding: "28px 28px 24px", width: "100%", maxWidth: 460, boxShadow: "0 8px 40px rgba(0,0,0,.18)" };
const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: "#475569" };
const inputStyle: React.CSSProperties = { border: "1.5px solid #C8D6E5", borderRadius: 8, padding: "9px 12px", fontSize: 13, outline: "none", fontFamily: "inherit", background: "#fff", color: "#1C2833" };
function btnStyle(bg: string): React.CSSProperties { return { background: bg, color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer" }; }
