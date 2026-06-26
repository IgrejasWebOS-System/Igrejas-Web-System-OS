"use client";

import { useState, useTransition } from "react";
import { cadastrarVoluntarioAction, criarTimeAction, criarEscalaAction } from "./actions";
import { AREA_LABELS, TURNOS, TURNO_LABELS } from "./constants";

type Vol  = { id: string; areas: string[]; disponibilidade: string | null; parties: { full_name: string; telefone: string | null } | null };
type Time = { id: string; nome: string; area: string; descricao: string | null; parties: { full_name: string } | null };
type Escala = { id: string; data: string; turno: string; descricao: string | null; ministry_teams: { nome: string; area: string } | null; schedule_confirmations: { id: string; status: string }[] };
type Membro = { id: string; full_name: string };

const TABS = ["Voluntários", "Times", "Escalas"] as const;
const inp: React.CSSProperties = { padding: "9px 12px", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 13, background: "var(--color-bg)", color: "var(--color-text-primary)", width: "100%", boxSizing: "border-box" };
const lbl: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)" };

export default function VoluntariosClient({ voluntarios: initVols, times: initTimes, escalas: initEscalas, membros }: {
  voluntarios: Vol[]; times: Time[]; escalas: Escala[]; membros: Membro[];
}) {
  const [tab, setTab]         = useState<typeof TABS[number]>("Voluntários");
  const [vols, setVols]       = useState(initVols);
  const [times, setTimes]     = useState(initTimes);
  const [escalas, setEscalas] = useState(initEscalas);
  const [showModal, setShowModal] = useState<"vol" | "time" | "escala" | null>(null);
  const [erro, setErro]       = useState("");
  const [isPending, start]    = useTransition();
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);

  async function handleVol(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErro("");
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        await cadastrarVoluntarioAction(fd.get("party_id") as string, selectedAreas, fd.get("disponibilidade") as string, fd.get("observacoes") as string);
        setShowModal(null); window.location.reload();
      } catch (ex: unknown) { setErro((ex as Error).message); }
    });
  }

  async function handleTime(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErro("");
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try { await criarTimeAction(fd); setShowModal(null); window.location.reload(); }
      catch (ex: unknown) { setErro((ex as Error).message); }
    });
  }

  async function handleEscala(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErro("");
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try { await criarEscalaAction(fd); setShowModal(null); window.location.reload(); }
      catch (ex: unknown) { setErro((ex as Error).message); }
    });
  }

  function toggleArea(a: string) {
    setSelectedAreas(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>🙌 Voluntários & Escalas</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>
            {vols.length} voluntários · {times.length} times · {escalas.length} escalas recentes
          </p>
        </div>
        <button onClick={() => { setErro(""); setShowModal(tab === "Voluntários" ? "vol" : tab === "Times" ? "time" : "escala"); }}
          style={{ padding: "10px 18px", background: "var(--color-primary)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          + {tab === "Voluntários" ? "Cadastrar Voluntário" : tab === "Times" ? "Criar Time" : "Nova Escala"}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid var(--color-border)", marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "10px 20px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 700,
            color: tab === t ? "var(--color-primary)" : "var(--color-text-muted)",
            borderBottom: tab === t ? "2px solid var(--color-primary)" : "2px solid transparent", marginBottom: -2,
          }}>{t}</button>
        ))}
      </div>

      {/* Voluntários */}
      {tab === "Voluntários" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {vols.length === 0 ? <p style={{ color: "var(--color-text-muted)", gridColumn: "1/-1", textAlign: "center", padding: 40 }}>Nenhum voluntário cadastrado</p> :
            vols.map(v => (
              <div key={v.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{(v.parties as { full_name?: string } | null)?.full_name ?? "—"}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {v.areas.map(a => <span key={a} style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#ede9fe", color: "#5b21b6" }}>{AREA_LABELS[a] ?? a}</span>)}
                </div>
                {v.disponibilidade && <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 8 }}>{v.disponibilidade}</div>}
              </div>
            ))}
        </div>
      )}

      {/* Times */}
      {tab === "Times" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {times.length === 0 ? <p style={{ color: "var(--color-text-muted)", textAlign: "center", padding: 40 }}>Nenhum time criado</p> :
            times.map(t => (
              <div key={t.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{AREA_LABELS[t.area] ?? t.area} — {t.nome}</span>
                  {t.descricao && <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 3 }}>{t.descricao}</div>}
                </div>
                {(t.parties as { full_name?: string } | null)?.full_name && (
                  <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Líder: {(t.parties as { full_name: string }).full_name}</span>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Escalas */}
      {tab === "Escalas" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {escalas.length === 0 ? <p style={{ color: "var(--color-text-muted)", textAlign: "center", padding: 40 }}>Nenhuma escala nos próximos dias</p> :
            escalas.map(e => {
              const conf   = e.schedule_confirmations ?? [];
              const total  = conf.length;
              const ok     = conf.filter((c: { status: string }) => c.status === "CONFIRMADO").length;
              return (
                <div key={e.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, padding: "14px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{new Date(e.data).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })} · {TURNO_LABELS[e.turno] ?? e.turno}</div>
                      <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>{(e.ministry_teams as { nome?: string } | null)?.nome ?? "—"}{e.descricao ? ` · ${e.descricao}` : ""}</div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: ok === total && total > 0 ? "#059669" : "#d97706" }}>{ok}/{total} confirmados</span>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowModal(null)}>
          <div style={{ background: "var(--color-surface)", borderRadius: 14, padding: 28, width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,.18)" }} onClick={e => e.stopPropagation()}>
            {erro && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#dc2626", fontSize: 13 }}>{erro}</div>}

            {showModal === "vol" && (
              <form onSubmit={handleVol} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800 }}>Cadastrar Voluntário</h2>
                <label style={lbl}>Membro *<select name="party_id" required style={inp}><option value="">Selecione...</option>{membros.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select></label>
                <div><div style={{ ...lbl, marginBottom: 8 }}>Áreas de atuação</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{Object.entries(AREA_LABELS).map(([k, v]) => (<button type="button" key={k} onClick={() => toggleArea(k)} style={{ padding: "5px 12px", borderRadius: 20, border: "1px solid var(--color-border)", fontSize: 12, fontWeight: 700, cursor: "pointer", background: selectedAreas.includes(k) ? "#7c3aed" : "transparent", color: selectedAreas.includes(k) ? "#fff" : "var(--color-text-muted)" }}>{v}</button>))}</div></div>
                <label style={lbl}>Disponibilidade<input name="disponibilidade" style={inp} placeholder="Ex: Domingo manhã e tarde" /></label>
                <label style={lbl}>Observações<textarea name="observacoes" rows={2} style={{ ...inp, resize: "vertical" }} /></label>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><button type="button" onClick={() => setShowModal(null)} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", cursor: "pointer", fontSize: 13 }}>Cancelar</button><button type="submit" disabled={isPending} style={{ padding: "9px 18px", borderRadius: 8, background: "var(--color-primary)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{isPending ? "Salvando..." : "Cadastrar"}</button></div>
              </form>
            )}

            {showModal === "time" && (
              <form onSubmit={handleTime} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800 }}>Criar Time</h2>
                <label style={lbl}>Nome *<input name="nome" required style={inp} /></label>
                <label style={lbl}>Área *<select name="area" required defaultValue="OUTRO" style={inp}>{Object.entries(AREA_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
                <label style={lbl}>Descrição<textarea name="descricao" rows={2} style={{ ...inp, resize: "vertical" }} /></label>
                <label style={lbl}>Líder<select name="lider_party_id" style={inp}><option value="">Sem líder definido</option>{membros.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select></label>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><button type="button" onClick={() => setShowModal(null)} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", cursor: "pointer", fontSize: 13 }}>Cancelar</button><button type="submit" disabled={isPending} style={{ padding: "9px 18px", borderRadius: 8, background: "var(--color-primary)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{isPending ? "Criando..." : "Criar"}</button></div>
              </form>
            )}

            {showModal === "escala" && (
              <form onSubmit={handleEscala} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800 }}>Nova Escala</h2>
                <label style={lbl}>Time *<select name="team_id" required style={inp}><option value="">Selecione...</option>{times.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}</select></label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label style={lbl}>Data *<input name="data" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} style={inp} /></label>
                  <label style={lbl}>Turno *<select name="turno" required defaultValue="MANHA" style={inp}>{TURNOS.map(t => <option key={t} value={t}>{TURNO_LABELS[t]}</option>)}</select></label>
                </div>
                <label style={lbl}>Descrição<input name="descricao" style={inp} /></label>
                <label style={lbl}>Convocar voluntários<select name="volunteer_ids" multiple size={5} style={{ ...inp, height: "auto" }}>{vols.map(v => <option key={v.id} value={v.id}>{(v.parties as { full_name?: string } | null)?.full_name ?? v.id}</option>)}</select></label>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}><button type="button" onClick={() => setShowModal(null)} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", cursor: "pointer", fontSize: 13 }}>Cancelar</button><button type="submit" disabled={isPending} style={{ padding: "9px 18px", borderRadius: 8, background: "var(--color-primary)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{isPending ? "Criando..." : "Criar Escala"}</button></div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
