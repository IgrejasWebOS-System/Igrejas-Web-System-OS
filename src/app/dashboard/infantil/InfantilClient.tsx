"use client";

import { useState, useTransition } from "react";
import { cadastrarCriancaAction, criarTurmaAction, checkinAction } from "./actions";
import { PARENTESCO_LABELS } from "./constants";

type Crianca  = { id: string; nome: string; data_nascimento: string | null; alergias: string | null; qr_token: string; child_responsibles: { nome: string; parentesco: string; principal: boolean }[] };
type Turma    = { id: string; nome: string; faixa_etaria_min: number | null; faixa_etaria_max: number | null; sala: string | null; parties: { full_name: string } | null };
type Checkin  = { id: string; checkin_em: string; checkout_em: string | null; etiqueta_codigo: string; child_profiles: { nome: string } | null; child_classes: { nome: string } | null };
type Membro   = { id: string; full_name: string };

const TABS = ["Check-in", "Crianças", "Turmas"] as const;
const inp: React.CSSProperties = { padding: "9px 12px", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 13, background: "var(--color-bg)", color: "var(--color-text-primary)", width: "100%", boxSizing: "border-box" };
const lbl: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)" };

function calcIdade(dataNasc: string | null): string {
  if (!dataNasc) return "—";
  const anos = Math.floor((Date.now() - new Date(dataNasc).getTime()) / (365.25 * 86400000));
  return `${anos} ano${anos !== 1 ? "s" : ""}`;
}

export default function InfantilClient({ criancas, turmas, checkinsHoje: initCheckins, membros }: { criancas: Crianca[]; turmas: Turma[]; checkinsHoje: Checkin[]; membros: Membro[] }) {
  const [tab, setTab]       = useState<typeof TABS[number]>("Check-in");
  const [checkins, setCheckins] = useState(initCheckins);
  const [showModal, setShowModal] = useState<"crianca" | "turma" | null>(null);
  const [qrInput, setQrInput]   = useState("");
  const [msg, setMsg]           = useState("");
  const [erro, setErro]         = useState("");
  const [isPending, start]      = useTransition();

  async function handleCheckin() {
    if (!qrInput.trim()) return;
    setErro(""); setMsg("");
    start(async () => {
      try {
        const r = await checkinAction(qrInput.trim());
        setMsg(`${r.acao === "CHECKIN" ? "✅ Check-in" : "👋 Check-out"}: ${r.nome}${r.etiqueta ? ` · Etiqueta: ${r.etiqueta}` : ""}`);
        setQrInput("");
        window.location.reload();
      } catch (ex: unknown) { setErro((ex as Error).message); }
    });
  }

  async function handleCrianca(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErro("");
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try { await cadastrarCriancaAction(fd); setShowModal(null); window.location.reload(); }
      catch (ex: unknown) { setErro((ex as Error).message); }
    });
  }

  async function handleTurma(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErro("");
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try { await criarTurmaAction(fd); setShowModal(null); window.location.reload(); }
      catch (ex: unknown) { setErro((ex as Error).message); }
    });
  }

  const presentes = checkins.filter(c => !c.checkout_em).length;

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>👶 Ministério Infantil</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>
            {criancas.length} cadastradas · <span style={{ color: "#059669", fontWeight: 700 }}>{presentes} presentes agora</span>
          </p>
        </div>
        {(tab === "Crianças" || tab === "Turmas") && (
          <button onClick={() => { setErro(""); setShowModal(tab === "Crianças" ? "crianca" : "turma"); }}
            style={{ padding: "10px 18px", background: "var(--color-primary)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            + {tab === "Crianças" ? "Cadastrar Criança" : "Criar Turma"}
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid var(--color-border)", marginBottom: 24 }}>
        {TABS.map(t => <button key={t} onClick={() => setTab(t)} style={{ padding: "10px 20px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 700, color: tab === t ? "var(--color-primary)" : "var(--color-text-muted)", borderBottom: tab === t ? "2px solid var(--color-primary)" : "2px solid transparent", marginBottom: -2 }}>{t}</button>)}
      </div>

      {/* Check-in */}
      {tab === "Check-in" && (
        <div>
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: 24, marginBottom: 24 }}>
            <h2 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 800 }}>Leitura de QR Code / Token</h2>
            {msg && <div style={{ background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#065f46" }}>{msg}</div>}
            {erro && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#dc2626" }}>{erro}</div>}
            <div style={{ display: "flex", gap: 10 }}>
              <input value={qrInput} onChange={e => setQrInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCheckin()}
                placeholder="Cole o token QR ou leia o código de barras..." style={{ ...inp, flex: 1 }} autoFocus />
              <button onClick={handleCheckin} disabled={isPending || !qrInput.trim()} style={{ padding: "9px 20px", background: "#059669", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer", flexShrink: 0 }}>Check-in / Out</button>
            </div>
          </div>

          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Hoje — {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</h3>
          {checkins.length === 0 ? <p style={{ color: "var(--color-text-muted)", textAlign: "center", padding: 40 }}>Nenhum check-in hoje</p> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {checkins.map(c => (
                <div key={c.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{(c.child_profiles as { nome?: string } | null)?.nome ?? "—"}</span>
                    {(c.child_classes as { nome?: string } | null)?.nome && <span style={{ fontSize: 12, color: "var(--color-text-muted)", marginLeft: 10 }}>{(c.child_classes as { nome: string }).nome}</span>}
                    <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>Etiqueta: <strong>{c.etiqueta_codigo}</strong> · Entrada: {new Date(c.checkin_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                  {c.checkout_em ? (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: "#f3f4f6", color: "#6b7280" }}>Saiu {new Date(c.checkout_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: "#d1fae5", color: "#059669" }}>● Presente</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Crianças */}
      {tab === "Crianças" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
          {criancas.length === 0 ? <p style={{ gridColumn: "1/-1", textAlign: "center", padding: 60, color: "var(--color-text-muted)" }}>Nenhuma criança cadastrada</p> :
            criancas.map(c => (
              <div key={c.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{c.nome}</div>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 8 }}>{calcIdade(c.data_nascimento)}</div>
                {c.alergias && <div style={{ fontSize: 11, background: "#fee2e2", color: "#dc2626", padding: "3px 8px", borderRadius: 6, marginBottom: 8 }}>⚠️ {c.alergias}</div>}
                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                  {c.child_responsibles.filter(r => r.principal).map(r => <div key={r.nome}>👤 {r.nome} ({PARENTESCO_LABELS[r.parentesco] ?? r.parentesco})</div>)}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Turmas */}
      {tab === "Turmas" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {turmas.length === 0 ? <p style={{ textAlign: "center", padding: 60, color: "var(--color-text-muted)" }}>Nenhuma turma criada</p> :
            turmas.map(t => (
              <div key={t.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{t.nome}</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 3 }}>
                    {t.faixa_etaria_min != null && t.faixa_etaria_max != null ? `${t.faixa_etaria_min}–${t.faixa_etaria_max} anos` : "Sem faixa definida"}
                    {t.sala ? ` · Sala: ${t.sala}` : ""}
                  </div>
                </div>
                {(t.parties as { full_name?: string } | null)?.full_name && (
                  <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Prof.: {(t.parties as { full_name: string }).full_name}</span>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowModal(null)}>
          <div style={{ background: "var(--color-surface)", borderRadius: 14, padding: 28, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            {erro && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#dc2626", fontSize: 13 }}>{erro}</div>}

            {showModal === "crianca" && (
              <form onSubmit={handleCrianca} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800 }}>Cadastrar Criança</h2>
                <label style={lbl}>Nome *<input name="nome" required style={inp} /></label>
                <label style={lbl}>Data de nascimento<input name="data_nascimento" type="date" style={inp} /></label>
                <label style={lbl}>Alergias<input name="alergias" style={inp} placeholder="Ex: amendoim, látex" /></label>
                <label style={lbl}>Observações<textarea name="observacoes" rows={2} style={{ ...inp, resize: "vertical" }} /></label>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><button type="button" onClick={() => setShowModal(null)} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", cursor: "pointer", fontSize: 13 }}>Cancelar</button><button type="submit" disabled={isPending} style={{ padding: "9px 18px", borderRadius: 8, background: "var(--color-primary)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{isPending ? "Salvando..." : "Cadastrar"}</button></div>
              </form>
            )}

            {showModal === "turma" && (
              <form onSubmit={handleTurma} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800 }}>Criar Turma</h2>
                <label style={lbl}>Nome *<input name="nome" required style={inp} /></label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label style={lbl}>Faixa mín. (anos)<input name="faixa_min" type="number" min="0" max="17" style={inp} /></label>
                  <label style={lbl}>Faixa máx. (anos)<input name="faixa_max" type="number" min="0" max="17" style={inp} /></label>
                </div>
                <label style={lbl}>Sala<input name="sala" style={inp} /></label>
                <label style={lbl}>Professor<select name="professor_party_id" style={inp}><option value="">Sem professor</option>{membros.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select></label>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><button type="button" onClick={() => setShowModal(null)} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", cursor: "pointer", fontSize: 13 }}>Cancelar</button><button type="submit" disabled={isPending} style={{ padding: "9px 18px", borderRadius: 8, background: "var(--color-primary)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{isPending ? "Criando..." : "Criar"}</button></div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
