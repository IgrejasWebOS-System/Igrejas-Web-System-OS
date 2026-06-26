"use client";

import { useState, useTransition } from "react";
import { criarReuniaoAction, criarAtaAction, aprovarAtaAction, criarMandatoAction, revogarConsentimentoAction } from "./actions";

type Reuniao = { id: string; tipo: string; titulo: string; data: string; hora_inicio: string | null; local: string | null; status: string };
type Ata = { id: string; numero_ata: string | null; conteudo: string; presentes: number | null; aprovada: boolean; created_at: string; governance_meetings: { titulo: string; data: string } | null };
type Mandato = { id: string; cargo: string; inicio: string; fim: string | null; ativo: boolean; parties: { full_name: string } | null };
type Consentimento = { id: string; finalidade: string; consentiu: boolean; created_at: string; revogado_em: string | null; parties: { full_name: string } | null };
type AuditLog = { id: string; acao: string; tabela: string | null; created_at: string; user_id: string | null };
type Membro = { id: string; full_name: string };

const TIPO_LABELS: Record<string, string> = { ASSEMBLEIA:"⚖️ Assembleia", CONSELHO:"🏛️ Conselho", REUNIAO:"🤝 Reunião", COMITE:"📋 Comitê" };
const TABS = ["Reuniões", "Atas", "Mandatos", "LGPD", "Auditoria"] as const;
const inp: React.CSSProperties = { padding: "9px 12px", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 13, background: "var(--color-bg)", color: "var(--color-text-primary)", width: "100%", boxSizing: "border-box" };
const lbl: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)" };

export default function GovernancaClient({ reunioes, atas, mandatos, consentimentos, auditLogs, membros }: {
  reunioes: Reuniao[]; atas: Ata[]; mandatos: Mandato[]; consentimentos: Consentimento[]; auditLogs: AuditLog[]; membros: Membro[];
}) {
  const [tab, setTab]       = useState<typeof TABS[number]>("Reuniões");
  const [showModal, setShowModal] = useState<"reuniao" | "ata" | "mandato" | null>(null);
  const [erro, setErro]     = useState("");
  const [msg, setMsg]       = useState("");
  const [isPending, start]  = useTransition();

  function submit(action: (fd: FormData) => Promise<void>) {
    return (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault(); setErro("");
      const fd = new FormData(e.currentTarget);
      start(async () => {
        try { await action(fd); setShowModal(null); window.location.reload(); }
        catch (ex: unknown) { setErro((ex as Error).message); }
      });
    };
  }

  async function handleAprovar(id: string) {
    setErro(""); setMsg("");
    start(async () => {
      try { await aprovarAtaAction(id); setMsg("✅ Ata aprovada"); window.location.reload(); }
      catch (ex: unknown) { setErro((ex as Error).message); }
    });
  }

  async function handleRevogar(id: string) {
    setErro(""); setMsg("");
    start(async () => {
      try { await revogarConsentimentoAction(id); window.location.reload(); }
      catch (ex: unknown) { setErro((ex as Error).message); }
    });
  }

  const hasModal = tab === "Reuniões" || tab === "Atas" || tab === "Mandatos";

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>🏛️ Governança & LGPD</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>Reuniões · Atas · Mandatos · Consentimentos · Auditoria</p>
        </div>
        {hasModal && (
          <button onClick={() => { setErro(""); setShowModal(tab === "Reuniões" ? "reuniao" : tab === "Atas" ? "ata" : "mandato"); }}
            style={{ padding: "10px 18px", background: "var(--color-primary)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            + {tab === "Reuniões" ? "Reunião" : tab === "Atas" ? "Ata" : "Mandato"}
          </button>
        )}
      </div>

      {msg && <div style={{ background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#065f46" }}>{msg}</div>}
      {erro && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#dc2626" }}>{erro}</div>}

      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid var(--color-border)", marginBottom: 24, overflowX: "auto" }}>
        {TABS.map(t => <button key={t} onClick={() => setTab(t)} style={{ padding: "10px 18px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", color: tab === t ? "var(--color-primary)" : "var(--color-text-muted)", borderBottom: tab === t ? "2px solid var(--color-primary)" : "2px solid transparent", marginBottom: -2 }}>{t}</button>)}
      </div>

      {/* Reuniões */}
      {tab === "Reuniões" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {reunioes.length === 0 ? <p style={{ textAlign: "center", padding: 60, color: "var(--color-text-muted)" }}>Nenhuma reunião registrada</p> :
            reunioes.map(r => (
              <div key={r.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{r.titulo}</span>
                    <span style={{ fontSize: 11, background: "#eff6ff", color: "#2563eb", padding: "1px 8px", borderRadius: 20, fontWeight: 700 }}>{TIPO_LABELS[r.tipo] ?? r.tipo}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                    {new Date(r.data + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                    {r.hora_inicio ? ` · ${r.hora_inicio}` : ""}
                    {r.local ? ` · ${r.local}` : ""}
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: r.status === "REALIZADA" ? "#d1fae5" : r.status === "CANCELADA" ? "#fee2e2" : "#fef9c3", color: r.status === "REALIZADA" ? "#065f46" : r.status === "CANCELADA" ? "#dc2626" : "#92400e" }}>{r.status}</span>
              </div>
            ))}
        </div>
      )}

      {/* Atas */}
      {tab === "Atas" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {atas.length === 0 ? <p style={{ textAlign: "center", padding: 60, color: "var(--color-text-muted)" }}>Nenhuma ata registrada</p> :
            atas.map(a => (
              <div key={a.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{a.numero_ata ? `Ata nº ${a.numero_ata}` : "Ata sem número"}</div>
                    {(a.governance_meetings as { titulo?: string; data?: string } | null) && (
                      <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>{(a.governance_meetings as { titulo: string }).titulo} · {new Date((a.governance_meetings as { data: string }).data + "T00:00:00").toLocaleDateString("pt-BR")}</div>
                    )}
                  </div>
                  {a.aprovada ? (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "#d1fae5", color: "#065f46" }}>✅ Aprovada</span>
                  ) : (
                    <button onClick={() => handleAprovar(a.id)} disabled={isPending} style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20, background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", cursor: "pointer" }}>Aprovar</button>
                  )}
                </div>
                <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: 0, maxHeight: 60, overflow: "hidden" }}>{a.conteudo}</p>
              </div>
            ))}
        </div>
      )}

      {/* Mandatos */}
      {tab === "Mandatos" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {mandatos.length === 0 ? <p style={{ textAlign: "center", padding: 60, color: "var(--color-text-muted)" }}>Nenhum mandato registrado</p> :
            mandatos.map(m => (
              <div key={m.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{(m.parties as { full_name?: string } | null)?.full_name ?? "—"}</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>{m.cargo} · {new Date(m.inicio + "T00:00:00").toLocaleDateString("pt-BR")}{m.fim ? ` a ${new Date(m.fim + "T00:00:00").toLocaleDateString("pt-BR")}` : " (em curso)"}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: m.ativo ? "#d1fae5" : "#f3f4f6", color: m.ativo ? "#065f46" : "#6b7280" }}>{m.ativo ? "Ativo" : "Encerrado"}</span>
              </div>
            ))}
        </div>
      )}

      {/* LGPD */}
      {tab === "LGPD" && (
        <div>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 16 }}>Total: {consentimentos.length} registros · {consentimentos.filter(c => c.consentiu && !c.revogado_em).length} ativos</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {consentimentos.map(c => (
              <div key={c.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{(c.parties as { full_name?: string } | null)?.full_name ?? "—"}</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>{c.finalidade} · {new Date(c.created_at).toLocaleDateString("pt-BR")}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: c.consentiu && !c.revogado_em ? "#d1fae5" : "#fee2e2", color: c.consentiu && !c.revogado_em ? "#065f46" : "#dc2626" }}>{c.consentiu && !c.revogado_em ? "Consentido" : "Revogado"}</span>
                  {c.consentiu && !c.revogado_em && (
                    <button onClick={() => handleRevogar(c.id)} disabled={isPending} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, background: "transparent", border: "1px solid #fecaca", color: "#dc2626", cursor: "pointer" }}>Revogar</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auditoria */}
      {tab === "Auditoria" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {auditLogs.length === 0 ? <p style={{ textAlign: "center", padding: 60, color: "var(--color-text-muted)" }}>Sem registros de auditoria</p> :
            auditLogs.map(l => (
              <div key={l.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, padding: "10px 16px", display: "flex", gap: 16, alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace", padding: "2px 8px", borderRadius: 4, background: "#f3f4f6" }}>{l.acao}</span>
                <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{l.tabela ?? "—"}</span>
                <span style={{ fontSize: 12, color: "var(--color-text-muted)", marginLeft: "auto" }}>{new Date(l.created_at).toLocaleString("pt-BR")}</span>
              </div>
            ))}
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowModal(null)}>
          <div style={{ background: "var(--color-surface)", borderRadius: 14, padding: 28, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            {erro && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#dc2626", fontSize: 13 }}>{erro}</div>}

            {showModal === "reuniao" && (
              <form onSubmit={submit(criarReuniaoAction)} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800 }}>Nova Reunião</h2>
                <label style={lbl}>Tipo<select name="tipo" defaultValue="REUNIAO" style={inp}>{Object.entries(TIPO_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></label>
                <label style={lbl}>Título *<input name="titulo" required style={inp} /></label>
                <label style={lbl}>Data *<input name="data" type="date" required style={inp} /></label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label style={lbl}>Hora início<input name="hora_inicio" type="time" style={inp} /></label>
                  <label style={lbl}>Local<input name="local" style={inp} /></label>
                </div>
                <label style={lbl}>Pauta<textarea name="pauta" rows={3} style={{ ...inp, resize: "vertical" }} /></label>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><button type="button" onClick={() => setShowModal(null)} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", cursor: "pointer", fontSize: 13 }}>Cancelar</button><button type="submit" disabled={isPending} style={{ padding: "9px 18px", borderRadius: 8, background: "var(--color-primary)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{isPending ? "Salvando..." : "Criar"}</button></div>
              </form>
            )}

            {showModal === "ata" && (
              <form onSubmit={submit(criarAtaAction)} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800 }}>Nova Ata</h2>
                <label style={lbl}>Reunião *<select name="meeting_id" required style={inp}><option value="">Selecionar...</option>{reunioes.map(r => <option key={r.id} value={r.id}>{r.titulo} ({new Date(r.data + "T00:00:00").toLocaleDateString("pt-BR")})</option>)}</select></label>
                <label style={lbl}>Número da Ata<input name="numero_ata" style={inp} placeholder="Ex: 001/2025" /></label>
                <label style={lbl}>Presentes<input name="presentes" type="number" min="0" style={inp} /></label>
                <label style={lbl}>Conteúdo *<textarea name="conteudo" required rows={8} style={{ ...inp, resize: "vertical" }} /></label>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><button type="button" onClick={() => setShowModal(null)} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", cursor: "pointer", fontSize: 13 }}>Cancelar</button><button type="submit" disabled={isPending} style={{ padding: "9px 18px", borderRadius: 8, background: "var(--color-primary)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{isPending ? "Salvando..." : "Criar"}</button></div>
              </form>
            )}

            {showModal === "mandato" && (
              <form onSubmit={submit(criarMandatoAction)} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800 }}>Novo Mandato</h2>
                <label style={lbl}>Pessoa *<select name="party_id" required style={inp}><option value="">Selecionar membro...</option>{membros.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select></label>
                <label style={lbl}>Cargo *<input name="cargo" required style={inp} placeholder="Ex: Presidente, Tesoureiro..." /></label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label style={lbl}>Início *<input name="inicio" type="date" required style={inp} /></label>
                  <label style={lbl}>Término<input name="fim" type="date" style={inp} /></label>
                </div>
                <label style={lbl}>Referência (Ata)<input name="referencia" style={inp} placeholder="Ex: Ata nº 002/2025" /></label>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><button type="button" onClick={() => setShowModal(null)} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", cursor: "pointer", fontSize: 13 }}>Cancelar</button><button type="submit" disabled={isPending} style={{ padding: "9px 18px", borderRadius: 8, background: "var(--color-primary)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{isPending ? "Salvando..." : "Criar"}</button></div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
