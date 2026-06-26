"use client";

import { useState, useTransition } from "react";
import { importarOFXAction } from "./actions";

type Importacao = {
  id: string; nome_arquivo: string; banco: string | null; conta: string | null;
  data_inicio: string | null; data_fim: string | null;
  total_linhas: number; conciliadas: number; status: string;
  fin_accounts: { nome: string } | null;
  created_at: string;
};
type Conta = { id: string; nome: string };

const STATUS_COLOR: Record<string, string> = {
  PENDENTE: "#d97706", EM_ANALISE: "#2563eb", CONCLUIDA: "#059669",
};

const inp: React.CSSProperties = {
  padding: "9px 12px", borderRadius: 8, border: "1px solid var(--color-border)",
  fontSize: 13, background: "var(--color-bg)", color: "var(--color-text-primary)", width: "100%", boxSizing: "border-box",
};
const lbl: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)" };

export default function ConciliacaoClient({ importacoes: initial, contas }: { importacoes: Importacao[]; contas: Conta[] }) {
  const [importacoes, setImportacoes] = useState(initial);
  const [showModal, setShowModal]     = useState(false);
  const [erro, setErro]               = useState("");
  const [msg, setMsg]                 = useState("");
  const [isPending, start]            = useTransition();

  async function handleImportar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(""); setMsg("");
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        const r = await importarOFXAction(fd);
        setMsg(`✅ Importado: ${r.novas} transações novas${r.duplicadas > 0 ? `, ${r.duplicadas} duplicadas ignoradas` : ""}`);
        setShowModal(false);
        window.location.reload();
      } catch (ex: unknown) { setErro((ex as Error).message); }
    });
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>🏦 Conciliação Bancária</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>Importe extratos OFX/QFX e concilie com seus lançamentos</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ padding: "10px 18px", background: "var(--color-primary)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          + Importar Extrato
        </button>
      </div>

      {msg && <div style={{ background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#065f46" }}>{msg}</div>}

      {/* Lista de importações */}
      {importacoes.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--color-text-muted)" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏦</div>
          <p style={{ fontSize: 15, fontWeight: 600 }}>Nenhuma importação ainda</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Clique em "Importar Extrato" e selecione um arquivo OFX ou QFX</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {importacoes.map(imp => {
            const pct = imp.total_linhas > 0 ? Math.round((imp.conciliadas / imp.total_linhas) * 100) : 0;
            return (
              <a key={imp.id} href={`/dashboard/financeiro/conciliacao/${imp.id}`} style={{ textDecoration: "none" }}>
                <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{imp.nome_arquivo}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: (STATUS_COLOR[imp.status] ?? "#6b7280") + "18", color: STATUS_COLOR[imp.status] ?? "#6b7280" }}>{imp.status}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--color-text-muted)", display: "flex", gap: 14, flexWrap: "wrap" }}>
                        <span>🏦 {imp.fin_accounts?.nome ?? "—"}</span>
                        {imp.banco && <span>Banco: {imp.banco}</span>}
                        {imp.data_inicio && <span>📅 {new Date(imp.data_inicio).toLocaleDateString("pt-BR")} – {imp.data_fim ? new Date(imp.data_fim).toLocaleDateString("pt-BR") : "?"}</span>}
                        <span>Importado em {new Date(imp.created_at).toLocaleDateString("pt-BR")}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: pct === 100 ? "#059669" : "#d97706" }}>{pct}%</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{imp.conciliadas}/{imp.total_linhas}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, height: 6, background: "var(--color-border)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#059669" : "#d97706", borderRadius: 99, transition: "width .3s" }} />
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}

      {/* Modal importar */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
          onClick={() => setShowModal(false)}>
          <div style={{ background: "var(--color-surface)", borderRadius: 14, padding: 28, width: "100%", maxWidth: 480, boxShadow: "0 8px 40px rgba(0,0,0,.18)" }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 20px", fontSize: 17, fontWeight: 800 }}>Importar Extrato OFX/QFX</h2>
            {erro && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#dc2626", fontSize: 13 }}>{erro}</div>}
            <form onSubmit={handleImportar} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label style={lbl}>
                Conta bancária *
                <select name="account_id" required style={inp}>
                  <option value="">Selecione a conta...</option>
                  {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </label>
              <label style={lbl}>
                Arquivo OFX / QFX *
                <input name="arquivo" type="file" accept=".ofx,.qfx,.OFX,.QFX" required style={{ ...inp, padding: "7px 12px" }} />
              </label>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", cursor: "pointer", fontSize: 13 }}>Cancelar</button>
                <button type="submit" disabled={isPending} style={{ padding: "9px 18px", borderRadius: 8, background: "var(--color-primary)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                  {isPending ? "Importando..." : "Importar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
