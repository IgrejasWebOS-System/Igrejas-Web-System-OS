"use client";

import { useState, useTransition } from "react";
import { salvarConfigsLoteAction, criarComunicadoAction, criarAutomacaoAction, toggleAutomacaoAction } from "./actions";

type Config     = { chave: string; valor: unknown; descricao: string | null };
type Comunicado = { id: string; titulo: string; conteudo: string; tipo: string; fixado: boolean; expira_em: string | null; created_at: string };
type Automacao  = { id: string; nome: string; gatilho: string; ativo: boolean; ultimo_exec: string | null; config: Record<string, unknown> };

const TABS = ["Geral", "Comunicados", "Automações"] as const;
const TIPO_COLORS: Record<string, { bg: string; color: string }> = {
  INFO:    { bg: "#eff6ff", color: "#2563eb" },
  AVISO:   { bg: "#fef9c3", color: "#92400e" },
  URGENTE: { bg: "#fee2e2", color: "#dc2626" },
};
const GATILHOS = ["membro_aniversario","membro_novo","evento_proximo","pagamento_pendente","inscricao_evento"] as const;
const inp: React.CSSProperties = { padding: "9px 12px", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 13, background: "var(--color-bg)", color: "var(--color-text-primary)", width: "100%", boxSizing: "border-box" };
const lbl: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)" };

export default function ConfiguracoesClient({ configs, comunicados, automacoes }: { configs: Config[]; comunicados: Comunicado[]; automacoes: Automacao[] }) {
  const [tab, setTab]           = useState<typeof TABS[number]>("Geral");
  const [showModal, setShowModal] = useState<"comunicado" | "automacao" | null>(null);
  const [configMap, setConfigMap] = useState<Record<string, unknown>>(Object.fromEntries(configs.map(c => [c.chave, c.valor])));
  const [msg, setMsg]           = useState("");
  const [erro, setErro]         = useState("");
  const [isPending, start]      = useTransition();

  async function handleSaveConfigs(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErro(""); setMsg("");
    const fd = new FormData(e.currentTarget);
    const updates: Record<string, unknown> = {};
    for (const [k, v] of fd.entries()) updates[k] = v;
    start(async () => {
      try { await salvarConfigsLoteAction(updates); setMsg("✅ Configurações salvas"); }
      catch (ex: unknown) { setErro((ex as Error).message); }
    });
  }

  async function handleComunicado(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErro("");
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try { await criarComunicadoAction(fd); setShowModal(null); window.location.reload(); }
      catch (ex: unknown) { setErro((ex as Error).message); }
    });
  }

  async function handleAutomacao(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErro("");
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try { await criarAutomacaoAction(fd); setShowModal(null); window.location.reload(); }
      catch (ex: unknown) { setErro((ex as Error).message); }
    });
  }

  async function handleToggle(id: string, ativo: boolean) {
    start(async () => {
      try { await toggleAutomacaoAction(id, !ativo); window.location.reload(); }
      catch (ex: unknown) { setErro((ex as Error).message); }
    });
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>⚙️ Configurações</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>Geral · Comunicados · Automações</p>
        </div>
        {tab === "Comunicados" && <button onClick={() => { setErro(""); setShowModal("comunicado"); }} style={{ padding: "10px 18px", background: "var(--color-primary)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ Comunicado</button>}
        {tab === "Automações"  && <button onClick={() => { setErro(""); setShowModal("automacao"); }} style={{ padding: "10px 18px", background: "var(--color-primary)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ Automação</button>}
      </div>

      {msg  && <div style={{ background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#065f46" }}>{msg}</div>}
      {erro && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#dc2626" }}>{erro}</div>}

      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid var(--color-border)", marginBottom: 24 }}>
        {TABS.map(t => <button key={t} onClick={() => setTab(t)} style={{ padding: "10px 20px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 700, color: tab === t ? "var(--color-primary)" : "var(--color-text-muted)", borderBottom: tab === t ? "2px solid var(--color-primary)" : "2px solid transparent", marginBottom: -2 }}>{t}</button>)}
      </div>

      {tab === "Geral" && (
        <form onSubmit={handleSaveConfigs} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={lbl}>Nome do sistema<input name="nome_sistema" defaultValue={configMap["nome_sistema"] as string ?? ""} style={inp} /></label>
          <label style={lbl}>E-mail remetente<input name="email_remetente" type="email" defaultValue={configMap["email_remetente"] as string ?? ""} style={inp} /></label>
          <label style={lbl}>Fuso horário<select name="fuso_horario" defaultValue={configMap["fuso_horario"] as string ?? "America/Sao_Paulo"} style={inp}>
            <option value="America/Sao_Paulo">America/Sao_Paulo (UTC-3)</option>
            <option value="America/Manaus">America/Manaus (UTC-4)</option>
            <option value="America/Belem">America/Belem (UTC-3)</option>
            <option value="America/Fortaleza">America/Fortaleza (UTC-3)</option>
          </select></label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input id="notif_aniv" type="checkbox" name="notif_aniversariantes" defaultChecked={!!(configMap["notif_aniversariantes"] ?? true)} />
            <label htmlFor="notif_aniv" style={{ fontSize: 13 }}>Notificar aniversariantes automaticamente</label>
          </div>
          <label style={lbl}>Dias de antecedência para avisar aniversários<input name="notif_dias_ante" type="number" min="0" max="30" defaultValue={configMap["notif_dias_ante"] as number ?? 1} style={{ ...inp, width: 120 }} /></label>
          <div><button type="submit" disabled={isPending} style={{ padding: "10px 24px", background: "var(--color-primary)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>{isPending ? "Salvando..." : "Salvar"}</button></div>
        </form>
      )}

      {tab === "Comunicados" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {comunicados.length === 0 ? <p style={{ textAlign: "center", padding: 60, color: "var(--color-text-muted)" }}>Nenhum comunicado ativo</p> :
            comunicados.map(c => {
              const cs = TIPO_COLORS[c.tipo] ?? TIPO_COLORS.INFO;
              return (
                <div key={c.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderLeft: `4px solid ${cs.color}`, borderRadius: 10, padding: "14px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {c.fixado && <span style={{ fontSize: 11, fontWeight: 900 }}>📌</span>}
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{c.titulo}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: cs.bg, color: cs.color }}>{c.tipo}</span>
                  </div>
                  <p style={{ fontSize: 13, margin: "0 0 6px" }}>{c.conteudo}</p>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                    {new Date(c.created_at).toLocaleDateString("pt-BR")}
                    {c.expira_em ? ` · Expira em ${new Date(c.expira_em + "T00:00:00").toLocaleDateString("pt-BR")}` : ""}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {tab === "Automações" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {automacoes.length === 0 ? <p style={{ textAlign: "center", padding: 60, color: "var(--color-text-muted)" }}>Nenhuma automação configurada</p> :
            automacoes.map(a => (
              <div key={a.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{a.nome}</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
                    Gatilho: <code style={{ fontSize: 11 }}>{a.gatilho}</code>
                    {a.ultimo_exec ? ` · Último: ${new Date(a.ultimo_exec).toLocaleString("pt-BR")}` : " · Nunca executada"}
                  </div>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <div onClick={() => handleToggle(a.id, a.ativo)} style={{ width: 40, height: 22, borderRadius: 11, background: a.ativo ? "var(--color-primary)" : "#d1d5db", position: "relative", cursor: "pointer", transition: "background .2s" }}>
                    <div style={{ position: "absolute", top: 3, left: a.ativo ? 21 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
                  </div>
                  <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{a.ativo ? "Ativa" : "Inativa"}</span>
                </label>
              </div>
            ))}
        </div>
      )}

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowModal(null)}>
          <div style={{ background: "var(--color-surface)", borderRadius: 14, padding: 28, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            {erro && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#dc2626", fontSize: 13 }}>{erro}</div>}

            {showModal === "comunicado" && (
              <form onSubmit={handleComunicado} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800 }}>Novo Comunicado</h2>
                <label style={lbl}>Título *<input name="titulo" required style={inp} /></label>
                <label style={lbl}>Tipo<select name="tipo" defaultValue="INFO" style={inp}><option value="INFO">ℹ️ Informativo</option><option value="AVISO">⚠️ Aviso</option><option value="URGENTE">🚨 Urgente</option></select></label>
                <label style={lbl}>Conteúdo *<textarea name="conteudo" required rows={4} style={{ ...inp, resize: "vertical" }} /></label>
                <label style={lbl}>Expira em<input name="expira_em" type="date" style={inp} /></label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" name="fixado" id="fixado" /><label htmlFor="fixado" style={{ fontSize: 13 }}>📌 Fixar no topo</label></div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><button type="button" onClick={() => setShowModal(null)} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", cursor: "pointer", fontSize: 13 }}>Cancelar</button><button type="submit" disabled={isPending} style={{ padding: "9px 18px", borderRadius: 8, background: "var(--color-primary)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{isPending ? "Criando..." : "Publicar"}</button></div>
              </form>
            )}

            {showModal === "automacao" && (
              <form onSubmit={handleAutomacao} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800 }}>Nova Automação</h2>
                <label style={lbl}>Nome *<input name="nome" required style={inp} /></label>
                <label style={lbl}>Gatilho *<select name="gatilho" required style={inp}>{GATILHOS.map(g => <option key={g} value={g}>{g}</option>)}</select></label>
                <label style={lbl}>Canal<select name="canal" defaultValue="EMAIL" style={inp}><option value="EMAIL">E-mail</option><option value="WHATSAPP">WhatsApp</option><option value="SMS">SMS</option></select></label>
                <label style={lbl}>Dias de antecedência<input name="dias_ante" type="number" min="0" max="30" defaultValue="0" style={inp} /></label>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><button type="button" onClick={() => setShowModal(null)} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", cursor: "pointer", fontSize: 13 }}>Cancelar</button><button type="submit" disabled={isPending} style={{ padding: "9px 18px", borderRadius: 8, background: "var(--color-primary)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{isPending ? "Criando..." : "Criar"}</button></div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
