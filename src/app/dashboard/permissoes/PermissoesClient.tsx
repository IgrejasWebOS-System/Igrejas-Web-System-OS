"use client";

import React, { useState, useTransition } from "react";
import { criarPerfilAction, revogarGrantAction } from "./actions";
import { MODULOS } from "./constants";

type Perfil = { id: string; nome: string; descricao: string | null; nivel_base: number; permissoes: Record<string, Record<string, boolean>> };
type Grant  = { id: string; user_id: string; valido_ate: string | null; permission_profiles: { nome: string } | null };

const NIVEL_LABELS: Record<number, string> = { 0:"N0 Super Master", 1:"N1 Presidente", 2:"N2 Admin Sede", 3:"N3 Admin Setor", 4:"N4 Regular" };
const TABS = ["Perfis", "Concessões"] as const;
const inp: React.CSSProperties = { padding: "9px 12px", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 13, background: "var(--color-bg)", color: "var(--color-text-primary)", width: "100%", boxSizing: "border-box" };
const lbl: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)" };

export default function PermissoesClient({ perfis, grants }: { perfis: Perfil[]; grants: Grant[] }) {
  const [tab, setTab]       = useState<typeof TABS[number]>("Perfis");
  const [showModal, setShowModal] = useState(false);
  const [erro, setErro]     = useState("");
  const [isPending, start]  = useTransition();

  async function handleCriarPerfil(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErro("");
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try { await criarPerfilAction(fd); setShowModal(false); window.location.reload(); }
      catch (ex: unknown) { setErro((ex as Error).message); }
    });
  }

  async function handleRevogar(id: string) {
    start(async () => {
      try { await revogarGrantAction(id); window.location.reload(); }
      catch (ex: unknown) { setErro((ex as Error).message); }
    });
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>🔐 Permissões Granulares</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>Perfis de acesso por módulo</p>
        </div>
        {tab === "Perfis" && <button onClick={() => { setErro(""); setShowModal(true); }} style={{ padding: "10px 18px", background: "var(--color-primary)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ Novo Perfil</button>}
      </div>

      {erro && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#dc2626" }}>{erro}</div>}

      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid var(--color-border)", marginBottom: 24 }}>
        {TABS.map(t => <button key={t} onClick={() => setTab(t)} style={{ padding: "10px 20px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 700, color: tab === t ? "var(--color-primary)" : "var(--color-text-muted)", borderBottom: tab === t ? "2px solid var(--color-primary)" : "2px solid transparent", marginBottom: -2 }}>{t}</button>)}
      </div>

      {tab === "Perfis" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {perfis.length === 0 ? <p style={{ gridColumn: "1/-1", textAlign: "center", padding: 60, color: "var(--color-text-muted)" }}>Nenhum perfil criado</p> :
            perfis.map(p => (
              <div key={p.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{p.nome}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#eff6ff", color: "#2563eb" }}>{NIVEL_LABELS[p.nivel_base]}</span>
                </div>
                {p.descricao && <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: "0 0 10px" }}>{p.descricao}</p>}
                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                  {MODULOS.filter(m => p.permissoes?.[m]?.ler).length} módulos com acesso de leitura
                </div>
              </div>
            ))}
        </div>
      )}

      {tab === "Concessões" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {grants.length === 0 ? <p style={{ textAlign: "center", padding: 60, color: "var(--color-text-muted)" }}>Nenhuma concessão ativa</p> :
            grants.map(g => (
              <div key={g.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, fontFamily: "monospace" }}>{g.user_id.slice(0, 16)}...</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
                    Perfil: {(g.permission_profiles as { nome?: string } | null)?.nome ?? "Personalizado"}
                    {g.valido_ate ? ` · Válido até ${new Date(g.valido_ate + "T00:00:00").toLocaleDateString("pt-BR")}` : ""}
                  </div>
                </div>
                <button onClick={() => handleRevogar(g.id)} disabled={isPending} style={{ fontSize: 11, padding: "4px 12px", borderRadius: 6, background: "transparent", border: "1px solid #fecaca", color: "#dc2626", cursor: "pointer" }}>Revogar</button>
              </div>
            ))}
        </div>
      )}

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: "var(--color-surface)", borderRadius: 14, padding: 28, width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleCriarPerfil} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800 }}>Novo Perfil de Permissão</h2>
              {erro && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", color: "#dc2626", fontSize: 13 }}>{erro}</div>}
              <label style={lbl}>Nome *<input name="nome" required style={inp} /></label>
              <label style={lbl}>Descrição<input name="descricao" style={inp} /></label>
              <label style={lbl}>Nível base<select name="nivel_base" defaultValue="4" style={inp}>{Object.entries(NIVEL_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></label>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Permissões por módulo</div>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 4, alignItems: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)" }}>Módulo</div>
                  {["Ler","Criar","Editar","Excluir"].map(a => <div key={a} style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textAlign: "center" }}>{a}</div>)}
                  {MODULOS.map(mod => (
                    <React.Fragment key={mod}>
                      <div style={{ fontSize: 12, textTransform: "capitalize" }}>{mod}</div>
                      {["ler","criar","editar","excluir"].map(a => (
                        <div key={`${mod}_${a}`} style={{ textAlign: "center" }}>
                          <input type="checkbox" name={`${mod}_${a}`} defaultChecked={a === "ler"} />
                        </div>
                      ))}
                    </React.Fragment>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", cursor: "pointer", fontSize: 13 }}>Cancelar</button>
                <button type="submit" disabled={isPending} style={{ padding: "9px 18px", borderRadius: 8, background: "var(--color-primary)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{isPending ? "Criando..." : "Criar Perfil"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
