"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import type { ConsecrationListItem } from "@/types";
import type { ConsecrationLookup } from "./actions";
import {
  criarConsagracaoAction,
  atualizarSituacaoConsagracaoAction,
  aprovarConsagracaoAction,
  editarConsagracaoAction,
} from "./actions";

type Props = {
  items:    ConsecrationListItem[];
  lookups:  ConsecrationLookup;
  isAdmin:  boolean;
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

type ConfirmAction = {
  label:   string;
  item:    ConsecrationListItem;
  action:  "aprovar" | "situacao";
  sit_id?: string;
};

export default function ConsagracoesClient({ items: init, lookups, isAdmin }: Props) {
  const [items, setItems] = useState(init);
  const [busca, setBusca]         = useState("");
  const [filtroSit, setFiltroSit] = useState("");
  const [filtroType, setFiltroType] = useState("");

  const [modalNovo, setModalNovo]     = useState(false);
  const [modalEditar, setModalEditar] = useState<ConsecrationListItem | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [dataConsagracao, setDataConsagracao] = useState("");

  const [pending, startTransition] = useTransition();
  const [error, setError]   = useState<string | null>(null);
  const [busca2, setBusca2] = useState("");    // busca no lookup de membro (form)
  const [membros, setMembros] = useState<{ id: string; nome: string; matricula?: string }[]>([]);
  const [membroSel, setMembroSel] = useState<{ id: string; nome: string } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Form fields
  const [fType, setFType]   = useState("");
  const [fSit, setFSit]     = useState("");
  const [fCargo, setFCargo] = useState("");
  const [fUnit, setFUnit]   = useState("");
  const [fData, setFData]   = useState("");
  const [fObs, setFObs]     = useState("");

  const filtrados = items.filter(i => {
    if (filtroSit  && i.situation_id !== filtroSit)  return false;
    if (filtroType && i.type_id      !== filtroType) return false;
    if (busca) {
      const q = busca.toLowerCase();
      if (!i.membro_nome.toLowerCase().includes(q) && !(i.membro_matricula ?? "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  function abrirNovo() {
    setMembroSel(null); setBusca2(""); setMembros([]);
    setFType(""); setFSit(""); setFCargo(""); setFUnit("");
    setFData(new Date().toISOString().slice(0, 10)); setFObs(""); setError(null);
    setModalNovo(true);
  }
  function abrirEditar(it: ConsecrationListItem) {
    setMembroSel({ id: it.party_id, nome: it.membro_nome });
    setFType(it.type_id ?? ""); setFSit(it.situation_id ?? "");
    setFCargo(it.cargo_pleiteado_id ?? ""); setFUnit(it.unit_id ?? "");
    setFData(it.data_solicitacao ?? ""); setFObs(it.observacoes ?? "");
    setError(null); setModalEditar(it);
  }
  function fechar() { setModalNovo(false); setModalEditar(null); setError(null); }

  const buscarMembros = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setMembros([]); return; }
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/membros/buscar?q=${encodeURIComponent(q)}&limit=8`);
      if (res.ok) setMembros(await res.json());
    }, 350);
  }, []);

  function handleSalvar() {
    if (!membroSel) { setError("Selecione o membro"); return; }
    setError(null);
    const fd = new FormData();
    fd.set("party_id", membroSel.id);
    if (fType)  fd.set("type_id", fType);
    if (fSit)   fd.set("situation_id", fSit);
    if (fCargo) fd.set("cargo_pleiteado_id", fCargo);
    if (fUnit)  fd.set("unit_id", fUnit);
    if (fData)  fd.set("data_solicitacao", fData);
    if (fObs.trim()) fd.set("observacoes", fObs);

    startTransition(async () => {
      try {
        if (modalEditar) {
          await editarConsagracaoAction(modalEditar.id, fd);
          setItems(prev => prev.map(i => i.id === modalEditar.id
            ? { ...i, type_id: fType || null, situation_id: fSit || null, cargo_pleiteado_id: fCargo || null, unit_id: fUnit || null, data_solicitacao: fData, observacoes: fObs || null,
                type_nome: lookups.types.find(t => t.id === fType)?.nome ?? i.type_nome,
                situation_nome: lookups.situations.find(s => s.id === fSit)?.nome ?? i.situation_nome,
                situation_cor: lookups.situations.find(s => s.id === fSit)?.cor ?? i.situation_cor,
                cargo_nome: lookups.cargos.find(c => c.id === fCargo)?.nome ?? i.cargo_nome,
              } : i));
        } else {
          await criarConsagracaoAction(fd);
          const now = new Date().toISOString();
          setItems(prev => [{
            id: crypto.randomUUID(), ministry_id: "", party_id: membroSel!.id,
            type_id: fType || null, situation_id: fSit || null, cargo_pleiteado_id: fCargo || null, unit_id: fUnit || null,
            data_solicitacao: fData, data_consagracao: null, observacoes: fObs || null,
            criado_por: null, aprovado_por: null, created_at: now, updated_at: now,
            membro_nome: membroSel!.nome, membro_matricula: null,
            unit_nome: lookups.units.find(u => u.id === fUnit)?.nome ?? null,
            type_nome: lookups.types.find(t => t.id === fType)?.nome ?? null,
            situation_nome: lookups.situations.find(s => s.id === fSit)?.nome ?? null,
            situation_cor: lookups.situations.find(s => s.id === fSit)?.cor ?? null,
            cargo_nome: lookups.cargos.find(c => c.id === fCargo)?.nome ?? null,
          }, ...prev]);
        }
        fechar();
      } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    });
  }

  function handleConfirmar() {
    if (!confirmAction) return;
    const { item, action, sit_id } = confirmAction;
    startTransition(async () => {
      try {
        if (action === "aprovar") {
          if (!dataConsagracao) { alert("Informe a data de consagração"); return; }
          await aprovarConsagracaoAction(item.id, dataConsagracao);
          setItems(prev => prev.map(i => i.id === item.id ? { ...i, data_consagracao: dataConsagracao } : i));
        } else if (action === "situacao" && sit_id) {
          await atualizarSituacaoConsagracaoAction(item.id, sit_id);
          const sit = lookups.situations.find(s => s.id === sit_id);
          setItems(prev => prev.map(i => i.id === item.id
            ? { ...i, situation_id: sit_id, situation_nome: sit?.nome ?? null, situation_cor: sit?.cor ?? null }
            : i));
        }
        setConfirmAction(null);
      } catch (e: unknown) { alert(e instanceof Error ? e.message : "Erro"); }
    });
  }

  return (
    <>
      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar membro…"
          style={{ ...inputStyle, maxWidth: 220 }}
        />
        <select value={filtroSit} onChange={e => setFiltroSit(e.target.value)} style={{ ...inputStyle, maxWidth: 180 }}>
          <option value="">Todas situações</option>
          {lookups.situations.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
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
            <div style={{ fontSize: 36, marginBottom: 12 }}>⛪</div>
            <div style={{ fontWeight: 700 }}>Nenhum processo encontrado</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F7FAFD", borderBottom: "1px solid var(--color-border)" }}>
                {["Membro", "Tipo", "Cargo Pleiteado", "Situação", "Data Solic.", ""].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 800, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: ".04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((it, i) => (
                <tr key={it.id} style={{ borderBottom: i < filtrados.length - 1 ? "1px solid var(--color-border)" : "none" }}>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{it.membro_nome}</div>
                    {it.membro_matricula && <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{it.membro_matricula}</div>}
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 13 }}>{it.type_nome ?? "—"}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13 }}>{it.cargo_nome ?? "—"}</td>
                  <td style={{ padding: "12px 14px" }}>
                    {it.situation_nome ? (
                      <span style={{
                        padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                        background: it.situation_cor ? `${it.situation_cor}22` : "#f1f5f9",
                        color: it.situation_cor ?? "#64748b",
                        border: `1px solid ${it.situation_cor ?? "#e2e8f0"}44`,
                      }}>{it.situation_nome}</span>
                    ) : <span style={{ color: "var(--color-text-muted)", fontSize: 12 }}>—</span>}
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--color-text-muted)" }}>
                    {it.data_solicitacao ? new Date(it.data_solicitacao + "T12:00").toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                      <button onClick={() => abrirEditar(it)} style={{
                        background: "var(--color-primary-light)", color: "var(--color-primary)",
                        border: "none", borderRadius: 6, padding: "5px 12px",
                        fontSize: 12, fontWeight: 700, cursor: "pointer",
                      }}>Editar</button>
                      {isAdmin && (
                        <>
                          {lookups.situations.map(s => {
                            if (s.nome.toLowerCase() === "aprovado") {
                              return (
                                <button key={s.id}
                                  onClick={() => { setDataConsagracao(""); setConfirmAction({ label: "Aprovar e atualizar cargo", item: it, action: "aprovar" }); }}
                                  style={{ background: "#dcfce7", color: "#166534", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                  ✓ Aprovar
                                </button>
                              );
                            }
                            return null;
                          })}
                          {lookups.situations.filter(s => s.nome.toLowerCase() !== "aprovado").map(s => (
                            <button key={s.id}
                              onClick={() => setConfirmAction({ label: `Mover para "${s.nome}"`, item: it, action: "situacao", sit_id: s.id })}
                              style={{
                                background: `${s.cor}22`, color: s.cor, border: `1px solid ${s.cor}44`,
                                borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                              }}>
                              {s.nome}
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Novo / Editar */}
      {(modalNovo || modalEditar) && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "var(--color-surface)", borderRadius: 14, padding: "24px 24px 20px", width: "100%", maxWidth: 520, boxShadow: "0 20px 60px rgba(0,0,0,.2)", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 15, fontWeight: 900 }}>
              {modalEditar ? `Editar: ${modalEditar.membro_nome}` : "Novo Processo de Consagração"}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Busca de membro */}
              <div style={{ position: "relative" }}>
                <label style={labelStyle}>Membro *</label>
                {membroSel ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>{membroSel.nome}</span>
                    {!modalEditar && (
                      <button onClick={() => setMembroSel(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: 18 }}>×</button>
                    )}
                  </div>
                ) : (
                  <>
                    <input
                      value={busca2}
                      onChange={e => { setBusca2(e.target.value); buscarMembros(e.target.value); }}
                      placeholder="Buscar por nome ou matrícula…"
                      style={inputStyle}
                      autoFocus
                    />
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
                  <label style={labelStyle}>Tipo de Consagração</label>
                  <select value={fType} onChange={e => setFType(e.target.value)} style={inputStyle}>
                    <option value="">Selecionar…</option>
                    {lookups.types.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Situação</label>
                  <select value={fSit} onChange={e => setFSit(e.target.value)} style={inputStyle}>
                    <option value="">Selecionar…</option>
                    {lookups.situations.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Cargo Pleiteado</label>
                  <select value={fCargo} onChange={e => setFCargo(e.target.value)} style={inputStyle}>
                    <option value="">Selecionar…</option>
                    {lookups.cargos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
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

              <div>
                <label style={labelStyle}>Data da Solicitação</label>
                <input type="date" value={fData} onChange={e => setFData(e.target.value)} style={inputStyle} />
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
      {confirmAction && (
        <div style={{ position: "fixed", inset: 0, zIndex: 110, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "var(--color-surface)", borderRadius: 14, padding: "24px 24px 20px", width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
            <h2 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 900 }}>{confirmAction.label}</h2>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "0 0 14px" }}>
              Membro: <strong>{confirmAction.item.membro_nome}</strong>
            </p>
            {confirmAction.action === "aprovar" && (
              <div>
                <label style={labelStyle}>Data de Consagração *</label>
                <input type="date" value={dataConsagracao} onChange={e => setDataConsagracao(e.target.value)} style={inputStyle} />
                {confirmAction.item.cargo_nome && (
                  <p style={{ fontSize: 12, color: "#166534", marginTop: 8, background: "#dcfce7", padding: "8px 12px", borderRadius: 8 }}>
                    ✓ Ao aprovar, o cargo do membro será atualizado para <strong>{confirmAction.item.cargo_nome}</strong>.
                  </p>
                )}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmAction(null)} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--color-text-muted)" }}>
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
