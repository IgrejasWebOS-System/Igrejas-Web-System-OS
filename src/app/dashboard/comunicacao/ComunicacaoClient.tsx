"use client";

import { useState, useTransition } from "react";
import { criarTemplateAction, criarCampanhaAction, enviarCampanhaAction } from "./actions";
import { CANAIS, CANAL_LABELS, SEGMENTOS, SEGMENTO_LABELS } from "./constants";

type Template = { id: string; nome: string; canal: string; assunto: string | null; corpo: string; variaveis: string[] };
type Campanha = { id: string; nome: string; status: string; total_enviados: number; total_erros: number; created_at: string; comm_templates: { nome: string; canal: string } | null };

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  RASCUNHO:  { bg: "#f3f4f6", color: "#6b7280" },
  AGENDADA:  { bg: "#eff6ff", color: "#2563eb" },
  ENVIANDO:  { bg: "#fef9c3", color: "#92400e" },
  CONCLUIDA: { bg: "#d1fae5", color: "#065f46" },
  CANCELADA: { bg: "#fee2e2", color: "#dc2626" },
};

const TABS = ["Campanhas", "Templates"] as const;
const inp: React.CSSProperties = { padding: "9px 12px", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 13, background: "var(--color-bg)", color: "var(--color-text-primary)", width: "100%", boxSizing: "border-box" };
const lbl: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)" };

export default function ComunicacaoClient({ templates, campanhas: initCamp }: { templates: Template[]; campanhas: Campanha[] }) {
  const [tab, setTab]           = useState<typeof TABS[number]>("Campanhas");
  const [campanhas, setCampanhas] = useState(initCamp);
  const [showModal, setShowModal] = useState<"template" | "campanha" | null>(null);
  const [erro, setErro]         = useState("");
  const [msg, setMsg]           = useState("");
  const [isPending, start]      = useTransition();

  async function handleTemplate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErro("");
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try { await criarTemplateAction(fd); setShowModal(null); window.location.reload(); }
      catch (ex: unknown) { setErro((ex as Error).message); }
    });
  }

  async function handleCampanha(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErro("");
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try { await criarCampanhaAction(fd); setShowModal(null); window.location.reload(); }
      catch (ex: unknown) { setErro((ex as Error).message); }
    });
  }

  async function handleEnviar(id: string) {
    setErro(""); setMsg("");
    start(async () => {
      try {
        const r = await enviarCampanhaAction(id);
        setMsg(`✅ Campanha enviada: ${r.enviados} enviados, ${r.erros} erros`);
        window.location.reload();
      } catch (ex: unknown) { setErro((ex as Error).message); }
    });
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>📣 Comunicação</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>E-mail · WhatsApp · SMS · Push</p>
        </div>
        <button onClick={() => { setErro(""); setShowModal(tab === "Templates" ? "template" : "campanha"); }}
          style={{ padding: "10px 18px", background: "var(--color-primary)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          + {tab === "Templates" ? "Novo Template" : "Nova Campanha"}
        </button>
      </div>

      {msg && <div style={{ background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#065f46" }}>{msg}</div>}
      {erro && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#dc2626" }}>{erro}</div>}

      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid var(--color-border)", marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "10px 20px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 700, color: tab === t ? "var(--color-primary)" : "var(--color-text-muted)", borderBottom: tab === t ? "2px solid var(--color-primary)" : "2px solid transparent", marginBottom: -2 }}>{t}</button>
        ))}
      </div>

      {/* Campanhas */}
      {tab === "Campanhas" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {campanhas.length === 0 ? <div style={{ textAlign: "center", padding: 60, color: "var(--color-text-muted)" }}><div style={{ fontSize: 40, marginBottom: 12 }}>📣</div><p>Nenhuma campanha criada</p></div> :
            campanhas.map(c => {
              const ss = STATUS_STYLE[c.status] ?? STATUS_STYLE.RASCUNHO;
              return (
                <div key={c.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{c.nome}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: ss.bg, color: ss.color }}>{c.status}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)", display: "flex", gap: 14 }}>
                      {(c.comm_templates as { canal?: string; nome?: string } | null) && <span>{CANAL_LABELS[(c.comm_templates as { canal: string }).canal] ?? ""} · {(c.comm_templates as { nome: string }).nome}</span>}
                      {c.total_enviados > 0 && <span>✅ {c.total_enviados} enviados{c.total_erros > 0 ? ` · ❌ ${c.total_erros} erros` : ""}</span>}
                      <span>{new Date(c.created_at).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                  {c.status === "RASCUNHO" && (
                    <button onClick={() => handleEnviar(c.id)} disabled={isPending} style={{ padding: "8px 16px", background: "#059669", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                      📤 Enviar
                    </button>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* Templates */}
      {tab === "Templates" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {templates.length === 0 ? <div style={{ textAlign: "center", padding: 60, color: "var(--color-text-muted)", gridColumn: "1/-1" }}><p>Nenhum template criado</p></div> :
            templates.map(t => (
              <div key={t.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{t.nome}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#eff6ff", color: "#2563eb" }}>{CANAL_LABELS[t.canal] ?? t.canal}</span>
                </div>
                {t.assunto && <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Assunto: {t.assunto}</div>}
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", maxHeight: 60, overflow: "hidden" }}>{t.corpo}</div>
                {t.variaveis.length > 0 && (
                  <div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {t.variaveis.map(v => <span key={v} style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "#fef9c3", color: "#92400e" }}>{`{{${v}}}`}</span>)}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowModal(null)}>
          <div style={{ background: "var(--color-surface)", borderRadius: 14, padding: 28, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            {showModal === "template" && (
              <form onSubmit={handleTemplate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800 }}>Novo Template</h2>
                <label style={lbl}>Nome *<input name="nome" required style={inp} /></label>
                <label style={lbl}>Canal *<select name="canal" required defaultValue="EMAIL" style={inp}>{CANAIS.map(c => <option key={c} value={c}>{CANAL_LABELS[c]}</option>)}</select></label>
                <label style={lbl}>Assunto (e-mail)<input name="assunto" style={inp} /></label>
                <label style={lbl}>Corpo *<textarea name="corpo" required rows={6} style={{ ...inp, resize: "vertical" }} placeholder="Olá {{nome}}, ..." /></label>
                <label style={lbl}>Variáveis (separadas por vírgula)<input name="variaveis" style={inp} placeholder="nome,data,link" /></label>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><button type="button" onClick={() => setShowModal(null)} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", cursor: "pointer", fontSize: 13 }}>Cancelar</button><button type="submit" disabled={isPending} style={{ padding: "9px 18px", borderRadius: 8, background: "var(--color-primary)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{isPending ? "Salvando..." : "Criar"}</button></div>
              </form>
            )}
            {showModal === "campanha" && (
              <form onSubmit={handleCampanha} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800 }}>Nova Campanha</h2>
                <label style={lbl}>Nome *<input name="nome" required style={inp} /></label>
                <label style={lbl}>Template<select name="template_id" style={inp}><option value="">Sem template</option>{templates.map(t => <option key={t.id} value={t.id}>{CANAL_LABELS[t.canal] ?? t.canal} — {t.nome}</option>)}</select></label>
                <label style={lbl}>Segmento de destinatários<select name="segmento" defaultValue="ATIVOS" style={inp}>{SEGMENTOS.map(s => <option key={s} value={s}>{SEGMENTO_LABELS[s]}</option>)}</select></label>
                <label style={lbl}>Agendar para (opcional)<input name="agendado_para" type="datetime-local" style={inp} /></label>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><button type="button" onClick={() => setShowModal(null)} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", cursor: "pointer", fontSize: 13 }}>Cancelar</button><button type="submit" disabled={isPending} style={{ padding: "9px 18px", borderRadius: 8, background: "var(--color-primary)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{isPending ? "Criando..." : "Criar"}</button></div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
