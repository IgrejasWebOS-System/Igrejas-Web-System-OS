"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ReqType } from "@/types";
import { criarTipoAction, editarTipoAction, toggleTipoAction } from "../actions";

type Props = { tipos: ReqType[] };

const inputS: React.CSSProperties = {
  width: "100%", border: "1px solid var(--color-border)", borderRadius: 8,
  padding: "8px 12px", fontSize: 13, color: "var(--color-text-primary)",
  background: "var(--color-surface)", outline: "none", boxSizing: "border-box",
};
const labelS: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700,
  color: "var(--color-text-muted)", marginBottom: 4, textTransform: "uppercase",
};

export default function TiposReqClient({ tipos: init }: Props) {
  const router = useRouter();
  const [tipos, setTipos] = useState(init);
  const [modal, setModal] = useState<"criar" | "editar" | null>(null);
  const [editando, setEditando] = useState<ReqType | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [nome, setNome]               = useState("");
  const [descricao, setDescricao]     = useState("");
  const [requerMembro, setReqMembro]  = useState(false);

  function abrirCriar() {
    setNome(""); setDescricao(""); setReqMembro(false);
    setError(null); setEditando(null); setModal("criar");
  }

  function abrirEditar(t: ReqType) {
    setNome(t.nome); setDescricao(t.descricao ?? ""); setReqMembro(t.requer_membro);
    setError(null); setEditando(t); setModal("editar");
  }

  function fechar() { setModal(null); setEditando(null); setError(null); }

  function handleSubmit() {
    if (!nome.trim()) { setError("Nome obrigatório"); return; }
    setError(null);
    const fd = new FormData();
    fd.set("nome",          nome.trim());
    fd.set("descricao",     descricao.trim());
    fd.set("requer_membro", String(requerMembro));

    startTransition(async () => {
      try {
        if (modal === "criar") {
          await criarTipoAction(fd);
        } else if (modal === "editar" && editando) {
          await editarTipoAction(editando.id, fd);
        }
        fechar();
        router.refresh();
      } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    });
  }

  function handleToggle(t: ReqType) {
    startTransition(async () => {
      try {
        await toggleTipoAction(t.id, !t.is_active);
        setTipos(prev => prev.map(x => x.id === t.id ? { ...x, is_active: !x.is_active } : x));
      } catch { /* silent */ }
    });
  }

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 700 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--color-text-primary)", margin: 0 }}>
            Tipos de Requerimento
          </h1>
          <button onClick={abrirCriar} style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: "var(--color-primary)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Novo Tipo
          </button>
        </div>

        {tipos.length === 0 ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--color-text-muted)", background: "var(--color-surface)", borderRadius: 12, border: "1px solid var(--color-border)" }}>
            Nenhum tipo de requerimento cadastrado.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {tipos.map(t => (
              <div key={t.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 14, opacity: t.is_active ? 1 : 0.6 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <span style={{ fontWeight: 800, fontSize: 14 }}>{t.nome}</span>
                    {!t.is_active && <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99, background: "#f1f5f9", color: "#94a3b8" }}>Inativo</span>}
                    {t.requer_membro && <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99, background: "#dbeafe", color: "#1e40af" }}>Requer membro</span>}
                  </div>
                  {t.descricao && <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{t.descricao}</div>}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => abrirEditar(t)} style={{ padding: "5px 10px", borderRadius: 6, border: "none", background: "var(--color-primary-light)", color: "var(--color-primary)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Editar</button>
                  <button onClick={() => handleToggle(t)} disabled={pending} style={{ padding: "5px 10px", borderRadius: 6, border: "none", background: t.is_active ? "#fef2f2" : "#f0fdf4", color: t.is_active ? "#dc2626" : "#16a34a", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    {t.is_active ? "Desativar" : "Ativar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "var(--color-surface)", borderRadius: 14, padding: "24px 26px 20px", width: "100%", maxWidth: 460, boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
            <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 900 }}>
              {modal === "criar" ? "Novo Tipo de Requerimento" : "Editar Tipo"}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={labelS}>Nome *</label>
                <input value={nome} onChange={e => setNome(e.target.value)} style={inputS} autoFocus placeholder="Ex: Carta de Mudança" />
              </div>
              <div>
                <label style={labelS}>Descrição</label>
                <textarea value={descricao} onChange={e => setDescricao(e.target.value)} style={{ ...inputS, minHeight: 72, resize: "vertical" }} placeholder="Descrição opcional…" />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={requerMembro} onChange={e => setReqMembro(e.target.checked)} />
                Requer vinculação a um membro
              </label>
            </div>

            {error && <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 8, background: "#fef2f2", color: "#dc2626", fontSize: 13 }}>⚠ {error}</div>}

            <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
              <button onClick={fechar} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--color-text-muted)" }}>
                Cancelar
              </button>
              <button onClick={handleSubmit} disabled={pending || !nome.trim()} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "var(--color-primary)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: pending || !nome.trim() ? 0.6 : 1 }}>
                {pending ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
