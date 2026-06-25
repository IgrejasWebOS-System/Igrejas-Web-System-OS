"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import type { PastoralGroupDetail, PastoralGroupMember } from "@/types";
import {
  adicionarMembroGrupoAction,
  removerMembroGrupoAction,
  atualizarVpdAction,
} from "../actions";

type Props = { grupo: PastoralGroupDetail };

type MembroSugestao = { id: string; nome_completo: string; matricula: string | null };

const inputS: React.CSSProperties = {
  width: "100%", border: "1px solid var(--color-border)", borderRadius: 8,
  padding: "8px 12px", fontSize: 13, color: "var(--color-text-primary)",
  background: "var(--color-surface)", outline: "none", boxSizing: "border-box",
};
const labelS: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700,
  color: "var(--color-text-muted)", marginBottom: 4, textTransform: "uppercase",
};

type ExtMembro = PastoralGroupMember & { membro_nome: string; membro_matricula: string | null; cargo_nome: string | null };

export default function PastoralGroupDetail({ grupo }: Props) {
  const router = useRouter();
  const [membros, setMembros] = useState<ExtMembro[]>(grupo.membros as ExtMembro[]);
  const [pending, startTransition] = useTransition();

  // Adicionar membro
  const [showAdd, setShowAdd]   = useState(false);
  const [addQuery, setAddQuery] = useState("");
  const [addId, setAddId]       = useState("");
  const [addNome, setAddNome]   = useState("");
  const [addVpd, setAddVpd]     = useState("");
  const [addObs, setAddObs]     = useState("");
  const [sugestoes, setSugestoes] = useState<MembroSugestao[]>([]);
  const [addError, setAddError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Editar VPD inline
  const [editVpdId, setEditVpdId] = useState<string | null>(null);
  const [editVpdVal, setEditVpdVal] = useState("");

  function buscarMembro(q: string) {
    setAddQuery(q);
    if (!q.trim()) { setSugestoes([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/membros/buscar?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setSugestoes(data ?? []);
      } catch { setSugestoes([]); }
    }, 300);
  }

  function handleAdicionarMembro() {
    if (!addId) { setAddError("Selecione um membro"); return; }
    setAddError(null);
    const vpd = addVpd ? parseFloat(addVpd.replace(",", ".")) : null;
    startTransition(async () => {
      try {
        await adicionarMembroGrupoAction(grupo.id, addId, vpd, addObs || null);
        // Otimistic update
        const novo: ExtMembro = {
          id: crypto.randomUUID(), group_id: grupo.id, party_id: addId,
          ministry_id: "", vpd: vpd, observacoes: addObs || null,
          created_at: new Date().toISOString(),
          membro_nome: addNome, membro_matricula: null, cargo_nome: null,
        };
        setMembros(prev => [...prev, novo]);
        setShowAdd(false); setAddId(""); setAddNome(""); setAddQuery(""); setAddVpd(""); setAddObs("");
      } catch (e: unknown) { setAddError(e instanceof Error ? e.message : "Erro"); }
    });
  }

  function handleRemover(m: ExtMembro) {
    if (!confirm(`Remover ${m.membro_nome} do grupo?`)) return;
    startTransition(async () => {
      try {
        await removerMembroGrupoAction(m.id);
        setMembros(prev => prev.filter(x => x.id !== m.id));
      } catch { /* silent */ }
    });
  }

  function handleSalvarVpd(id: string) {
    const vpd = editVpdVal ? parseFloat(editVpdVal.replace(",", ".")) : null;
    startTransition(async () => {
      try {
        await atualizarVpdAction(id, vpd);
        setMembros(prev => prev.map(m => m.id === id ? { ...m, vpd } : m));
        setEditVpdId(null);
      } catch { /* silent */ }
    });
  }

  const vpd_total = membros.reduce((s, m) => s + (m.vpd ?? 0), 0);
  const fmtVpd = (v: number | null) =>
    v != null && v > 0 ? `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 860 }}>

      {/* Header */}
      <div>
        <button
          onClick={() => router.back()}
          style={{ background: "none", border: "none", color: "var(--color-primary)", fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0, marginBottom: 12 }}
        >
          ← Voltar
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--color-text-primary)", margin: 0 }}>{grupo.nome}</h1>
        {grupo.descricao && <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "4px 0 0" }}>{grupo.descricao}</p>}
      </div>

      {/* Cards de resumo */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {[
          { label: "Pastor", value: grupo.pastor_nome ?? "—", icon: "👤" },
          { label: "Membros", value: String(membros.length), icon: "👥" },
          { label: "VPD Total", value: fmtVpd(vpd_total), icon: "💰" },
        ].map(c => (
          <div key={c.label} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{c.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", marginBottom: 2 }}>{c.label}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--color-text-primary)" }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Membros */}
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: "20px 20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>Membros do Grupo</h2>
          <button
            onClick={() => { setShowAdd(v => !v); setAddId(""); setAddNome(""); setAddQuery(""); setAddVpd(""); setAddObs(""); setAddError(null); }}
            style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "var(--color-primary)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
          >
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Adicionar Membro
          </button>
        </div>

        {/* Formulário adicionar */}
        {showAdd && (
          <div style={{ background: "#f8fafc", border: "1px solid var(--color-border)", borderRadius: 10, padding: "16px", marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {/* Busca membro */}
              <div style={{ position: "relative", gridColumn: "1 / -1" }}>
                <label style={labelS}>Membro *</label>
                <input
                  value={addQuery}
                  onChange={e => buscarMembro(e.target.value)}
                  style={inputS}
                  placeholder="Buscar membro por nome ou matrícula…"
                  autoFocus
                />
                {sugestoes.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,.1)", zIndex: 50, maxHeight: 160, overflowY: "auto" }}>
                    {sugestoes.map(s => (
                      <div
                        key={s.id}
                        onClick={() => { setAddId(s.id); setAddNome(s.nome_completo); setAddQuery(s.nome_completo); setSugestoes([]); }}
                        style={{ padding: "9px 14px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid var(--color-border)" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--color-primary-light)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "")}
                      >
                        <div style={{ fontWeight: 700 }}>{s.nome_completo}</div>
                        {s.matricula && <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{s.matricula}</div>}
                      </div>
                    ))}
                  </div>
                )}
                {addId && <div style={{ fontSize: 11, color: "var(--color-primary)", fontWeight: 600, marginTop: 3 }}>✓ {addNome}</div>}
              </div>
              <div>
                <label style={labelS}>VPD (R$)</label>
                <input value={addVpd} onChange={e => setAddVpd(e.target.value)} style={inputS} placeholder="0,00" type="text" inputMode="decimal" />
              </div>
              <div>
                <label style={labelS}>Observações</label>
                <input value={addObs} onChange={e => setAddObs(e.target.value)} style={inputS} placeholder="Opcional…" />
              </div>
            </div>
            {addError && <div style={{ marginTop: 8, fontSize: 12, color: "#dc2626" }}>⚠ {addError}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
              <button onClick={() => setShowAdd(false)} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid var(--color-border)", background: "transparent", fontSize: 12, cursor: "pointer", color: "var(--color-text-muted)" }}>
                Cancelar
              </button>
              <button onClick={handleAdicionarMembro} disabled={pending || !addId} style={{ padding: "7px 14px", borderRadius: 7, border: "none", background: "var(--color-primary)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: !addId ? 0.6 : 1 }}>
                {pending ? "…" : "Adicionar"}
              </button>
            </div>
          </div>
        )}

        {/* Tabela de membros */}
        {membros.length === 0 ? (
          <div style={{ textAlign: "center", padding: "28px 0", color: "var(--color-text-muted)", fontSize: 13 }}>
            Nenhum membro neste grupo.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--color-border)" }}>
                  {["Membro", "Cargo", "VPD", "Observações", ""].map(h => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {membros.map(m => (
                  <tr key={m.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "10px 10px" }}>
                      <div style={{ fontWeight: 700 }}>{m.membro_nome}</div>
                      {m.membro_matricula && <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{m.membro_matricula}</div>}
                    </td>
                    <td style={{ padding: "10px 10px", color: "var(--color-text-muted)" }}>
                      {m.cargo_nome ?? "—"}
                    </td>
                    <td style={{ padding: "10px 10px", minWidth: 120 }}>
                      {editVpdId === m.id ? (
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <input
                            value={editVpdVal}
                            onChange={e => setEditVpdVal(e.target.value)}
                            style={{ ...inputS, width: 80, padding: "4px 8px" }}
                            placeholder="0,00"
                            autoFocus
                            onKeyDown={e => { if (e.key === "Enter") handleSalvarVpd(m.id); if (e.key === "Escape") setEditVpdId(null); }}
                          />
                          <button onClick={() => handleSalvarVpd(m.id)} style={{ background: "none", border: "none", color: "var(--color-primary)", cursor: "pointer", fontWeight: 800, fontSize: 14 }}>✓</button>
                          <button onClick={() => setEditVpdId(null)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 14 }}>✕</button>
                        </div>
                      ) : (
                        <span
                          onClick={() => { setEditVpdId(m.id); setEditVpdVal(m.vpd != null ? String(m.vpd) : ""); }}
                          style={{ cursor: "pointer", color: m.vpd ? "var(--color-text-primary)" : "var(--color-text-muted)", fontWeight: m.vpd ? 700 : 400 }}
                          title="Clique para editar VPD"
                        >
                          {fmtVpd(m.vpd)}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "10px 10px", color: "var(--color-text-muted)", maxWidth: 200 }}>
                      <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {m.observacoes ?? "—"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 10px" }}>
                      <button
                        onClick={() => handleRemover(m)}
                        disabled={pending}
                        style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: "#fee2e2", color: "#dc2626", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
