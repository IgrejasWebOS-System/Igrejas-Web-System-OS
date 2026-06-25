"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import type { BaptismListItem, BaptismSituacao } from "@/types";
import { BAPTISM_SITUACAO_LABELS, BAPTISM_SITUACAO_COLORS } from "@/types";
import type { BaptismLookup } from "./actions";
import { criarBatismoAction, confirmarBatismoAction, mudarSituacaoBatismoAction } from "./actions";

type Props = {
  items:   BaptismListItem[];
  lookups: BaptismLookup;
  isAdmin: boolean;
};

const inputStyle: React.CSSProperties = {
  width: "100%", border: "1px solid var(--color-border)", borderRadius: 8,
  padding: "8px 12px", fontSize: 13, color: "var(--color-text-primary)",
  background: "var(--color-surface)", outline: "none", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 700,
  color: "var(--color-text-muted)", marginBottom: 4,
};

const SITUACOES: BaptismSituacao[] = ["PENDENTE","EM_ANDAMENTO","BATIZADO","CANCELADO"];

type Confirm = { item: BaptismListItem; action: "confirmar" | "situacao"; situacao?: BaptismSituacao };

export default function BatismosClient({ items: init, lookups, isAdmin }: Props) {
  const [items, setItems] = useState(init);
  const [busca, setBusca]         = useState("");
  const [filtroSit, setFiltroSit] = useState<BaptismSituacao | "">("");
  const [filtroType, setFiltroType] = useState("");

  const [modalNovo, setModalNovo] = useState(false);
  const [confirm, setConfirm]     = useState<Confirm | null>(null);
  const [dataRealizada, setDataRealizada] = useState("");

  const [pending, startTransition] = useTransition();
  const [error, setError]   = useState<string | null>(null);
  const [busca2, setBusca2] = useState("");
  const [membros, setMembros] = useState<{ id: string; nome: string; matricula?: string }[]>([]);
  const [membroSel, setMembroSel] = useState<{ id: string; nome: string } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [fType, setFType]         = useState("");
  const [fUnit, setFUnit]         = useState("");
  const [fPastor, setFPastor]     = useState("");
  const [fPastores, setFPastores] = useState<{ id: string; nome: string }[]>([]);
  const [fPastorBusca, setFPastorBusca] = useState("");
  const pastorDebRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fDataPrev, setFDataPrev] = useState("");
  const [fObs, setFObs]           = useState("");

  const filtrados = items.filter(i => {
    if (filtroSit  && i.situacao  !== filtroSit)  return false;
    if (filtroType && i.type_id   !== filtroType) return false;
    if (busca) {
      const q = busca.toLowerCase();
      if (!i.membro_nome.toLowerCase().includes(q) && !(i.membro_matricula ?? "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  function abrirNovo() {
    setMembroSel(null); setBusca2(""); setMembros([]);
    setFType(""); setFUnit(""); setFPastor(""); setFPastorBusca(""); setFPastores([]);
    setFDataPrev(""); setFObs(""); setError(null); setModalNovo(true);
  }
  function fechar() { setModalNovo(false); setError(null); }

  const buscarMembros = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setMembros([]); return; }
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/membros/buscar?q=${encodeURIComponent(q)}&limit=8`);
      if (res.ok) setMembros(await res.json());
    }, 350);
  }, []);

  const buscarPastor = useCallback((q: string) => {
    if (pastorDebRef.current) clearTimeout(pastorDebRef.current);
    if (!q.trim()) { setFPastores([]); return; }
    pastorDebRef.current = setTimeout(async () => {
      const res = await fetch(`/api/membros/buscar?q=${encodeURIComponent(q)}&limit=8`);
      if (res.ok) setFPastores(await res.json());
    }, 350);
  }, []);

  function handleSalvar() {
    if (!membroSel) { setError("Selecione o membro"); return; }
    setError(null);
    const fd = new FormData();
    fd.set("party_id", membroSel.id);
    if (fType)         fd.set("type_id", fType);
    if (fUnit)         fd.set("unit_id", fUnit);
    if (fPastor)       fd.set("pastor_party_id", fPastor);
    if (fDataPrev)     fd.set("data_prevista", fDataPrev);
    if (fObs.trim())   fd.set("observacoes", fObs);

    startTransition(async () => {
      try {
        await criarBatismoAction(fd);
        const now = new Date().toISOString();
        setItems(prev => [{
          id: crypto.randomUUID(), ministry_id: "", party_id: membroSel!.id,
          type_id: fType || null, unit_id: fUnit || null, pastor_party_id: fPastor || null,
          situacao: "PENDENTE", data_prevista: fDataPrev || null, data_realizada: null,
          observacoes: fObs || null, criado_por: null, created_at: now, updated_at: now,
          membro_nome: membroSel!.nome, membro_matricula: null,
          unit_nome: lookups.units.find(u => u.id === fUnit)?.nome ?? null,
          type_nome: lookups.types.find(t => t.id === fType)?.nome ?? null,
          pastor_nome: null,
        }, ...prev]);
        fechar();
      } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    });
  }

  function handleConfirmar() {
    if (!confirm) return;
    const { item, action, situacao } = confirm;
    startTransition(async () => {
      try {
        if (action === "confirmar") {
          if (!dataRealizada) { alert("Informe a data de realização"); return; }
          await confirmarBatismoAction(item.id, dataRealizada);
          setItems(prev => prev.map(i => i.id === item.id ? { ...i, situacao: "BATIZADO", data_realizada: dataRealizada } : i));
        } else if (action === "situacao" && situacao) {
          await mudarSituacaoBatismoAction(item.id, situacao);
          setItems(prev => prev.map(i => i.id === item.id ? { ...i, situacao } : i));
        }
        setConfirm(null);
      } catch (e: unknown) { alert(e instanceof Error ? e.message : "Erro"); }
    });
  }

  return (
    <>
      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar membro…" style={{ ...inputStyle, maxWidth: 220 }} />
        <select value={filtroSit} onChange={e => setFiltroSit(e.target.value as BaptismSituacao | "")} style={{ ...inputStyle, maxWidth: 180 }}>
          <option value="">Todas situações</option>
          {SITUACOES.map(s => <option key={s} value={s}>{BAPTISM_SITUACAO_LABELS[s]}</option>)}
        </select>
        <select value={filtroType} onChange={e => setFiltroType(e.target.value)} style={{ ...inputStyle, maxWidth: 180 }}>
          <option value="">Todos tipos</option>
          {lookups.types.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button onClick={abrirNovo} style={{
          padding: "9px 18px", borderRadius: 8, border: "none",
          background: "var(--color-primary)", color: "#fff",
          fontSize: 13, fontWeight: 700, cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: 6,
        }}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Novo Processo
        </button>
      </div>

      {/* Tabela */}
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, overflow: "hidden" }}>
        {filtrados.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--color-text-muted)" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>💧</div>
            <div style={{ fontWeight: 700 }}>Nenhum processo encontrado</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F7FAFD", borderBottom: "1px solid var(--color-border)" }}>
                {["Membro", "Tipo", "Pastor", "Situação", "Data Prevista", "Data Realizada", ""].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 800, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: ".04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((it, i) => {
                const sc = BAPTISM_SITUACAO_COLORS[it.situacao];
                return (
                  <tr key={it.id} style={{ borderBottom: i < filtrados.length - 1 ? "1px solid var(--color-border)" : "none" }}>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{it.membro_nome}</div>
                      {it.membro_matricula && <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{it.membro_matricula}</div>}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 13 }}>{it.type_nome ?? "—"}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13 }}>{it.pastor_nome ?? "—"}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>
                        {BAPTISM_SITUACAO_LABELS[it.situacao]}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--color-text-muted)" }}>
                      {it.data_prevista ? new Date(it.data_prevista + "T12:00").toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--color-text-muted)" }}>
                      {it.data_realizada ? new Date(it.data_realizada + "T12:00").toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      {isAdmin && it.situacao !== "BATIZADO" && it.situacao !== "CANCELADO" && (
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button onClick={() => { setDataRealizada(""); setConfirm({ item: it, action: "confirmar" }); }}
                            style={{ background: "#dcfce7", color: "#166534", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                            ✓ Confirmar Batismo
                          </button>
                          {it.situacao === "PENDENTE" && (
                            <button onClick={() => setConfirm({ item: it, action: "situacao", situacao: "EM_ANDAMENTO" })}
                              style={{ background: "#dbeafe", color: "#1e40af", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                              Em Andamento
                            </button>
                          )}
                          <button onClick={() => setConfirm({ item: it, action: "situacao", situacao: "CANCELADO" })}
                            style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                            Cancelar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Novo */}
      {modalNovo && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "var(--color-surface)", borderRadius: 14, padding: "24px 24px 20px", width: "100%", maxWidth: 520, boxShadow: "0 20px 60px rgba(0,0,0,.2)", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 15, fontWeight: 900 }}>Novo Processo de Batismo</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Membro */}
              <div style={{ position: "relative" }}>
                <label style={labelStyle}>Membro *</label>
                {membroSel ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>{membroSel.nome}</span>
                    <button onClick={() => setMembroSel(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: 18 }}>×</button>
                  </div>
                ) : (
                  <>
                    <input value={busca2} onChange={e => { setBusca2(e.target.value); buscarMembros(e.target.value); }}
                      placeholder="Buscar por nome ou matrícula…" style={inputStyle} autoFocus />
                    {membros.length > 0 && (
                      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, zIndex: 10, maxHeight: 200, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,.12)" }}>
                        {membros.map(m => (
                          <div key={m.id} onClick={() => { setMembroSel(m); setMembros([]); setBusca2(""); }}
                            style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid var(--color-border)" }}>
                            <div style={{ fontWeight: 700 }}>{m.nome}</div>
                            {m.matricula && <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{m.matricula}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Tipo de Batismo</label>
                  <select value={fType} onChange={e => setFType(e.target.value)} style={inputStyle}>
                    <option value="">Selecionar…</option>
                    {lookups.types.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Unidade</label>
                  <select value={fUnit} onChange={e => setFUnit(e.target.value)} style={inputStyle}>
                    <option value="">Selecionar…</option>
                    {lookups.units.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                  </select>
                </div>
              </div>

              {/* Pastor */}
              <div style={{ position: "relative" }}>
                <label style={labelStyle}>Pastor Responsável</label>
                {fPastor ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>{fPastorBusca}</span>
                    <button onClick={() => { setFPastor(""); setFPastorBusca(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: 18 }}>×</button>
                  </div>
                ) : (
                  <>
                    <input value={fPastorBusca} onChange={e => { setFPastorBusca(e.target.value); buscarPastor(e.target.value); }}
                      placeholder="Buscar pastor…" style={inputStyle} />
                    {fPastores.length > 0 && (
                      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, zIndex: 10, maxHeight: 200, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,.12)" }}>
                        {fPastores.map(m => (
                          <div key={m.id} onClick={() => { setFPastor(m.id); setFPastorBusca(m.nome); setFPastores([]); }}
                            style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid var(--color-border)" }}>
                            {m.nome}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                <label style={labelStyle}>Data Prevista</label>
                <input type="date" value={fDataPrev} onChange={e => setFDataPrev(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Observações</label>
                <textarea value={fObs} onChange={e => setFObs(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
              </div>
            </div>

            {error && <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 8, background: "#fef2f2", color: "#dc2626", fontSize: 13 }}>⚠ {error}</div>}

            <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
              <button onClick={fechar} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--color-text-muted)" }}>
                Cancelar
              </button>
              <button onClick={handleSalvar} disabled={pending || !membroSel} style={{
                padding: "9px 18px", borderRadius: 8, border: "none",
                background: "var(--color-primary)", color: "#fff",
                fontSize: 13, fontWeight: 700, cursor: "pointer",
                opacity: pending || !membroSel ? 0.6 : 1,
              }}>
                {pending ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmação */}
      {confirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 110, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "var(--color-surface)", borderRadius: 14, padding: "24px 24px 20px", width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
            <h2 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 900 }}>
              {confirm.action === "confirmar" ? "Confirmar Batismo" : `Mover para "${confirm.situacao && BAPTISM_SITUACAO_LABELS[confirm.situacao]}"`}
            </h2>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "0 0 14px" }}>
              Membro: <strong>{confirm.item.membro_nome}</strong>
            </p>
            {confirm.action === "confirmar" && (
              <div>
                <label style={labelStyle}>Data de Realização *</label>
                <input type="date" value={dataRealizada} onChange={e => setDataRealizada(e.target.value)} style={inputStyle} />
                <p style={{ fontSize: 12, color: "#166534", marginTop: 8, background: "#dcfce7", padding: "8px 12px", borderRadius: 8 }}>
                  ✓ A data de batismo será atualizada na ficha do membro automaticamente.
                </p>
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirm(null)} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--color-text-muted)" }}>
                Cancelar
              </button>
              <button onClick={handleConfirmar} disabled={pending} style={{
                padding: "9px 18px", borderRadius: 8, border: "none",
                background: "var(--color-primary)", color: "#fff",
                fontSize: 13, fontWeight: 700, cursor: "pointer",
                opacity: pending ? 0.6 : 1,
              }}>
                {pending ? "Salvando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
