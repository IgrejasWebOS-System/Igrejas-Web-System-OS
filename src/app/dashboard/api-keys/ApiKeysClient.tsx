"use client";

import { useState, useTransition } from "react";
import { criarClienteAction, gerarApiKeyAction, revogarKeyAction, criarWebhookAction } from "./actions";
import { ESCOPOS_DISPONIVEIS } from "./constants";

type APIKey  = { id: string; nome: string; key_prefix: string; escopos: string[]; expira_em: string | null; ultimo_uso: string | null; ativo: boolean };
type Cliente = { id: string; nome: string; descricao: string | null; api_keys: APIKey[] };
type Webhook = { id: string; url: string; eventos: string[]; ativo: boolean; falhas: number; ultimo_envio: string | null };

const TABS = ["API Keys", "Webhooks", "Docs"] as const;
const inp: React.CSSProperties = { padding: "9px 12px", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 13, background: "var(--color-bg)", color: "var(--color-text-primary)", width: "100%", boxSizing: "border-box" };
const lbl: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)" };

export default function ApiKeysClient({ clientes, webhooks }: { clientes: Cliente[]; webhooks: Webhook[] }) {
  const [tab, setTab]           = useState<typeof TABS[number]>("API Keys");
  const [showModal, setShowModal] = useState<"cliente" | "key" | "webhook" | null>(null);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [newKey, setNewKey]     = useState<{ key: string; prefix: string } | null>(null);
  const [erro, setErro]         = useState("");
  const [isPending, start]      = useTransition();

  async function handleCriarCliente(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErro("");
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try { await criarClienteAction(fd); setShowModal(null); window.location.reload(); }
      catch (ex: unknown) { setErro((ex as Error).message); }
    });
  }

  async function handleGerarKey(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErro("");
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        const result = await gerarApiKeyAction(selectedClient, fd);
        setNewKey(result);
        setShowModal(null);
      } catch (ex: unknown) { setErro((ex as Error).message); }
    });
  }

  async function handleRevogar(id: string) {
    start(async () => {
      try { await revogarKeyAction(id); window.location.reload(); }
      catch (ex: unknown) { setErro((ex as Error).message); }
    });
  }

  async function handleCriarWebhook(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErro("");
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try { await criarWebhookAction(fd); setShowModal(null); window.location.reload(); }
      catch (ex: unknown) { setErro((ex as Error).message); }
    });
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>🔌 API & Integrações</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>Chaves de API · Webhooks · Documentação OpenAPI</p>
        </div>
        {tab === "API Keys" && <button onClick={() => { setErro(""); setShowModal("cliente"); }} style={{ padding: "10px 18px", background: "var(--color-primary)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ Novo Cliente</button>}
        {tab === "Webhooks" && <button onClick={() => { setErro(""); setShowModal("webhook"); }} style={{ padding: "10px 18px", background: "var(--color-primary)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ Novo Webhook</button>}
      </div>

      {erro && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#dc2626" }}>{erro}</div>}

      {newKey && (
        <div style={{ background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>✅ API Key gerada — copie agora, não será exibida novamente</div>
          <code style={{ background: "#fff", padding: "8px 12px", borderRadius: 6, fontSize: 13, display: "block", wordBreak: "break-all" }}>{newKey.key}</code>
          <button onClick={() => { navigator.clipboard.writeText(newKey.key); }} style={{ marginTop: 10, padding: "6px 14px", borderRadius: 6, border: "1px solid #059669", background: "transparent", color: "#059669", fontSize: 12, cursor: "pointer" }}>📋 Copiar</button>
        </div>
      )}

      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid var(--color-border)", marginBottom: 24 }}>
        {TABS.map(t => <button key={t} onClick={() => setTab(t)} style={{ padding: "10px 20px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 700, color: tab === t ? "var(--color-primary)" : "var(--color-text-muted)", borderBottom: tab === t ? "2px solid var(--color-primary)" : "2px solid transparent", marginBottom: -2 }}>{t}</button>)}
      </div>

      {tab === "API Keys" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {clientes.length === 0 ? <p style={{ textAlign: "center", padding: 60, color: "var(--color-text-muted)" }}>Nenhum cliente criado</p> :
            clientes.map(c => (
              <div key={c.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{c.nome}</div>
                    {c.descricao && <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{c.descricao}</div>}
                  </div>
                  <button onClick={() => { setSelectedClient(c.id); setErro(""); setShowModal("key"); }} style={{ fontSize: 12, padding: "6px 14px", borderRadius: 6, background: "transparent", border: "1px solid var(--color-border)", cursor: "pointer" }}>+ Gerar Key</button>
                </div>
                {c.api_keys.filter(k => k.ativo).map(k => (
                  <div key={k.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--color-bg)", borderRadius: 8, marginBottom: 6 }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 12 }}>{k.nome}</span>
                      <span style={{ marginLeft: 10, fontFamily: "monospace", fontSize: 12, color: "var(--color-text-muted)" }}>{k.key_prefix}...</span>
                      <span style={{ marginLeft: 10, fontSize: 11, color: "var(--color-text-muted)" }}>{k.escopos.join(", ")}</span>
                    </div>
                    <button onClick={() => handleRevogar(k.id)} disabled={isPending} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, background: "transparent", border: "1px solid #fecaca", color: "#dc2626", cursor: "pointer" }}>Revogar</button>
                  </div>
                ))}
                {c.api_keys.filter(k => k.ativo).length === 0 && <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: 0 }}>Nenhuma key ativa</p>}
              </div>
            ))}
        </div>
      )}

      {tab === "Webhooks" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {webhooks.length === 0 ? <p style={{ textAlign: "center", padding: 60, color: "var(--color-text-muted)" }}>Nenhum webhook configurado</p> :
            webhooks.map(w => (
              <div key={w.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, padding: "14px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 600 }}>{w.url}</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>{w.eventos.join(", ")}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                    {w.falhas > 0 && <span style={{ fontSize: 11, background: "#fee2e2", color: "#dc2626", padding: "2px 8px", borderRadius: 10 }}>{w.falhas} falhas</span>}
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: w.ativo ? "#d1fae5" : "#f3f4f6", color: w.ativo ? "#065f46" : "#6b7280" }}>{w.ativo ? "Ativo" : "Inativo"}</span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {tab === "Docs" && (
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, marginTop: 0 }}>Documentação OpenAPI</h2>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>O schema OpenAPI 3.0 completo está disponível em:</p>
          <code style={{ background: "var(--color-bg)", padding: "10px 14px", borderRadius: 8, fontSize: 13, display: "block", marginBottom: 16 }}>/api/v1/docs</code>
          <h3 style={{ fontSize: 14, fontWeight: 700 }}>Autenticação</h3>
          <p style={{ fontSize: 13 }}>Envie o header <code>X-API-Key: igsk_...</code> em todas as requisições.</p>
          <h3 style={{ fontSize: 14, fontWeight: 700 }}>Endpoints disponíveis</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { method: "GET", path: "/api/v1/membros", scope: "membros:read", desc: "Lista membros com paginação" },
              { method: "GET", path: "/api/v1/eventos", scope: "eventos:read", desc: "Lista eventos públicos futuros" },
              { method: "GET", path: "/api/v1/docs",    scope: "—",            desc: "Schema OpenAPI 3.0 (JSON)" },
            ].map(ep => (
              <div key={ep.path} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 14px", background: "var(--color-bg)", borderRadius: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 900, padding: "2px 8px", borderRadius: 4, background: "#d1fae5", color: "#065f46" }}>{ep.method}</span>
                <code style={{ fontSize: 12, flex: 1 }}>{ep.path}</code>
                <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Escopo: {ep.scope}</span>
                <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{ep.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowModal(null)}>
          <div style={{ background: "var(--color-surface)", borderRadius: 14, padding: 28, width: "100%", maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            {erro && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#dc2626", fontSize: 13 }}>{erro}</div>}

            {showModal === "cliente" && (
              <form onSubmit={handleCriarCliente} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800 }}>Novo Cliente API</h2>
                <label style={lbl}>Nome *<input name="nome" required style={inp} placeholder="Ex: App Mobile, Site Institucional" /></label>
                <label style={lbl}>Descrição<input name="descricao" style={inp} /></label>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><button type="button" onClick={() => setShowModal(null)} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", cursor: "pointer", fontSize: 13 }}>Cancelar</button><button type="submit" disabled={isPending} style={{ padding: "9px 18px", borderRadius: 8, background: "var(--color-primary)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{isPending ? "Criando..." : "Criar"}</button></div>
              </form>
            )}

            {showModal === "key" && (
              <form onSubmit={handleGerarKey} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800 }}>Gerar API Key</h2>
                <label style={lbl}>Nome da key *<input name="nome" required style={inp} placeholder="Ex: Produção 2025" /></label>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-muted)", marginBottom: 8 }}>Escopos</div>
                  {ESCOPOS_DISPONIVEIS.map(s => (
                    <label key={s} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: 13 }}>
                      <input type="checkbox" name="escopos" value={s} defaultChecked={s === "membros:read"} />
                      <code style={{ fontSize: 12 }}>{s}</code>
                    </label>
                  ))}
                </div>
                <label style={lbl}>Expira em (opcional)<input name="expira_em" type="date" style={inp} /></label>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><button type="button" onClick={() => setShowModal(null)} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", cursor: "pointer", fontSize: 13 }}>Cancelar</button><button type="submit" disabled={isPending} style={{ padding: "9px 18px", borderRadius: 8, background: "var(--color-primary)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{isPending ? "Gerando..." : "Gerar"}</button></div>
              </form>
            )}

            {showModal === "webhook" && (
              <form onSubmit={handleCriarWebhook} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800 }}>Novo Webhook</h2>
                <label style={lbl}>URL *<input name="url" type="url" required style={inp} placeholder="https://seuapp.com/webhook" /></label>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-muted)", marginBottom: 8 }}>Eventos</div>
                  {["membros.criado","membros.atualizado","financeiro.transacao","eventos.inscricao","*"].map(ev => (
                    <label key={ev} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: 13 }}>
                      <input type="checkbox" name="eventos" value={ev} defaultChecked={ev === "*"} />
                      <code style={{ fontSize: 12 }}>{ev}</code>
                    </label>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><button type="button" onClick={() => setShowModal(null)} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", cursor: "pointer", fontSize: 13 }}>Cancelar</button><button type="submit" disabled={isPending} style={{ padding: "9px 18px", borderRadius: 8, background: "var(--color-primary)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{isPending ? "Criando..." : "Criar"}</button></div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
