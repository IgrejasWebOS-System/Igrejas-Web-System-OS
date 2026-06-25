"use client";

import { useState, useTransition } from "react";
import type { MemberBankAccount, BankAccountTipo } from "@/types";
import { BANK_TIPO_LABELS } from "@/types";
import { criarContaAction, editarContaAction, excluirContaAction } from "./actions";

type Props = {
  partyId:  string;
  contas:   MemberBankAccount[];
  isAdmin:  boolean;
};

const TIPOS: BankAccountTipo[] = ["CORRENTE","POUPANCA","SALARIO"];

const inputStyle: React.CSSProperties = {
  width: "100%", border: "1px solid var(--color-border)", borderRadius: 8,
  padding: "8px 12px", fontSize: 13, color: "var(--color-text-primary)",
  background: "var(--color-surface)", outline: "none", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 700,
  color: "var(--color-text-muted)", marginBottom: 4,
};

export default function BankAccountsTab({ partyId, contas: init, isAdmin }: Props) {
  const [contas, setContas] = useState(init);
  const [modal, setModal]   = useState<"criar" | "editar" | null>(null);
  const [editando, setEditando] = useState<MemberBankAccount | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError]   = useState<string | null>(null);

  const [banco, setBanco]         = useState("");
  const [agencia, setAgencia]     = useState("");
  const [conta, setConta]         = useState("");
  const [tipo, setTipo]           = useState<BankAccountTipo>("CORRENTE");
  const [pix, setPix]             = useState("");
  const [principal, setPrincipal] = useState(false);

  function abrirCriar() {
    setBanco(""); setAgencia(""); setConta(""); setTipo("CORRENTE"); setPix(""); setPrincipal(contas.length === 0);
    setError(null); setModal("criar");
  }
  function abrirEditar(c: MemberBankAccount) {
    setEditando(c);
    setBanco(c.banco); setAgencia(c.agencia ?? ""); setConta(c.conta ?? "");
    setTipo(c.tipo); setPix(c.chave_pix ?? ""); setPrincipal(c.is_principal);
    setError(null); setModal("editar");
  }
  function fechar() { setModal(null); setEditando(null); setError(null); }

  function handleSubmit() {
    if (!banco.trim()) { setError("Nome do banco obrigatório"); return; }
    setError(null);
    const fd = new FormData();
    fd.set("banco", banco.trim());
    fd.set("tipo", tipo);
    fd.set("is_principal", String(principal));
    if (agencia.trim()) fd.set("agencia", agencia.trim());
    if (conta.trim())   fd.set("conta",   conta.trim());
    if (pix.trim())     fd.set("chave_pix", pix.trim());

    startTransition(async () => {
      try {
        if (modal === "criar") {
          await criarContaAction(partyId, fd);
          const now = new Date().toISOString();
          const nova: MemberBankAccount = {
            id: crypto.randomUUID(), ministry_id: "", party_id: partyId,
            banco: banco.trim(), agencia: agencia || null, conta: conta || null,
            tipo, chave_pix: pix || null, is_principal: principal,
            created_at: now, updated_at: now,
          };
          setContas(prev => principal
            ? [nova, ...prev.map(c => ({ ...c, is_principal: false }))]
            : [...prev, nova]);
        } else if (modal === "editar" && editando) {
          await editarContaAction(editando.id, partyId, fd);
          setContas(prev => prev.map(c => {
            if (c.id === editando.id) return { ...c, banco: banco.trim(), agencia: agencia || null, conta: conta || null, tipo, chave_pix: pix || null, is_principal: principal };
            return principal ? { ...c, is_principal: false } : c;
          }));
        }
        fechar();
      } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    });
  }

  function handleExcluir(c: MemberBankAccount) {
    if (!confirm(`Excluir conta ${c.banco}?`)) return;
    startTransition(async () => {
      try {
        await excluirContaAction(c.id);
        setContas(prev => prev.filter(x => x.id !== c.id));
      } catch (e: unknown) { alert(e instanceof Error ? e.message : "Erro"); }
    });
  }

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {isAdmin && (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={abrirCriar} style={{
              padding: "8px 16px", borderRadius: 8, border: "none",
              background: "var(--color-primary)", color: "#fff",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Adicionar Conta
            </button>
          </div>
        )}

        {contas.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--color-text-muted)" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🏦</div>
            <div style={{ fontWeight: 700 }}>Nenhuma conta bancária cadastrada</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {contas.map(c => (
              <div key={c.id} style={{
                background: "var(--color-surface)", border: `1px solid ${c.is_principal ? "var(--color-primary)" : "var(--color-border)"}`,
                borderRadius: 10, padding: "14px 16px",
                display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12,
              }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 800, fontSize: 14 }}>{c.banco}</span>
                    {c.is_principal && (
                      <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 800, background: "var(--color-primary-light)", color: "var(--color-primary)" }}>
                        Principal
                      </span>
                    )}
                    <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: "#f1f5f9", color: "#64748b" }}>
                      {BANK_TIPO_LABELS[c.tipo]}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", display: "flex", gap: 16, flexWrap: "wrap" }}>
                    {c.agencia && <span>Ag: <strong>{c.agencia}</strong></span>}
                    {c.conta   && <span>Cc: <strong>{c.conta}</strong></span>}
                    {c.chave_pix && <span>PIX: <strong>{c.chave_pix}</strong></span>}
                  </div>
                </div>
                {isAdmin && (
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => abrirEditar(c)} style={{
                      background: "var(--color-primary-light)", color: "var(--color-primary)",
                      border: "none", borderRadius: 6, padding: "5px 10px",
                      fontSize: 12, fontWeight: 700, cursor: "pointer",
                    }}>Editar</button>
                    <button onClick={() => handleExcluir(c)} style={{
                      background: "#fee2e2", color: "#dc2626",
                      border: "none", borderRadius: 6, padding: "5px 10px",
                      fontSize: 12, fontWeight: 700, cursor: "pointer",
                    }}>Excluir</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "var(--color-surface)", borderRadius: 14, padding: "24px 24px 20px", width: "100%", maxWidth: 460, boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 15, fontWeight: 900 }}>
              {modal === "criar" ? "Nova Conta Bancária" : "Editar Conta"}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={labelStyle}>Banco *</label>
                <input value={banco} onChange={e => setBanco(e.target.value)} style={inputStyle} autoFocus placeholder="Ex: Bradesco, Nubank, CEF…" />
              </div>
              <div>
                <label style={labelStyle}>Tipo</label>
                <select value={tipo} onChange={e => setTipo(e.target.value as BankAccountTipo)} style={inputStyle}>
                  {TIPOS.map(t => <option key={t} value={t}>{BANK_TIPO_LABELS[t]}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Agência</label>
                  <input value={agencia} onChange={e => setAgencia(e.target.value)} style={inputStyle} placeholder="0001" />
                </div>
                <div>
                  <label style={labelStyle}>Conta</label>
                  <input value={conta} onChange={e => setConta(e.target.value)} style={inputStyle} placeholder="12345-6" />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Chave PIX</label>
                <input value={pix} onChange={e => setPix(e.target.value)} style={inputStyle} placeholder="CPF, e-mail, telefone ou chave aleatória" />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={principal} onChange={e => setPrincipal(e.target.checked)} />
                Definir como conta principal
              </label>
            </div>

            {error && <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 8, background: "#fef2f2", color: "#dc2626", fontSize: 13 }}>⚠ {error}</div>}

            <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
              <button onClick={fechar} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--color-text-muted)" }}>
                Cancelar
              </button>
              <button onClick={handleSubmit} disabled={pending || !banco.trim()} style={{
                padding: "9px 18px", borderRadius: 8, border: "none",
                background: "var(--color-primary)", color: "#fff",
                fontSize: 13, fontWeight: 700, cursor: "pointer",
                opacity: pending || !banco.trim() ? 0.6 : 1,
              }}>
                {pending ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
