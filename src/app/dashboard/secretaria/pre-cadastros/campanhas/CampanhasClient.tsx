"use client";

import { useState, useTransition } from "react";
import type { PreRegistrationCampaign, CampanhaTipo } from "@/types";
import { CAMPANHA_TIPO_LABELS } from "@/types";
import { criarCampanhaAction, editarCampanhaAction, toggleCampanhaAction } from "../actions";

const TIPOS: CampanhaTipo[] = ["NOVO_MEMBRO", "ATUALIZACAO_CADASTRAL", "BATISMO", "EVENTO"];

type Props = { campanhas: PreRegistrationCampaign[] };

export default function CampanhasClient({ campanhas: init }: Props) {
  const [campanhas, setCampanhas] = useState(init);
  const [modal, setModal] = useState<"criar" | "editar" | null>(null);
  const [editando, setEditando] = useState<PreRegistrationCampaign | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [nome, setNome]           = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo]           = useState<CampanhaTipo>("NOVO_MEMBRO");
  const [inicio, setInicio]       = useState("");
  const [fim, setFim]             = useState("");

  function abrirCriar() {
    setNome(""); setDescricao(""); setTipo("NOVO_MEMBRO"); setInicio(""); setFim("");
    setError(null); setModal("criar");
  }

  function abrirEditar(c: PreRegistrationCampaign) {
    setEditando(c);
    setNome(c.nome); setDescricao(c.descricao ?? ""); setTipo(c.tipo);
    setInicio(c.data_inicio ?? ""); setFim(c.data_fim ?? "");
    setError(null); setModal("editar");
  }

  function fechar() { setModal(null); setEditando(null); setError(null); }

  function handleSubmit() {
    setError(null);
    const fd = new FormData();
    fd.set("nome", nome); fd.set("tipo", tipo);
    if (descricao.trim()) fd.set("descricao", descricao);
    if (inicio) fd.set("data_inicio", inicio);
    if (fim)    fd.set("data_fim", fim);

    startTransition(async () => {
      try {
        if (modal === "criar") {
          await criarCampanhaAction(fd);
          setCampanhas(prev => [...prev, {
            id: crypto.randomUUID(), ministry_id: "", nome, descricao: descricao || null,
            tipo, data_inicio: inicio || null, data_fim: fim || null,
            link_publico: null, is_active: true, criado_por: null, created_at: new Date().toISOString(),
          }]);
        } else if (modal === "editar" && editando) {
          await editarCampanhaAction(editando.id, fd);
          setCampanhas(prev => prev.map(c => c.id === editando.id
            ? { ...c, nome, descricao: descricao || null, tipo, data_inicio: inicio || null, data_fim: fim || null }
            : c
          ));
        }
        fechar();
      } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    });
  }

  function handleToggle(c: PreRegistrationCampaign) {
    startTransition(async () => {
      try {
        await toggleCampanhaAction(c.id, !c.is_active);
        setCampanhas(prev => prev.map(x => x.id === c.id ? { ...x, is_active: !c.is_active } : x));
      } catch (e: unknown) { alert(e instanceof Error ? e.message : "Erro"); }
    });
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", border: "1px solid var(--color-border)", borderRadius: 8,
    padding: "8px 12px", fontSize: 13, color: "var(--color-text-primary)",
    background: "var(--color-surface)", outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 700, color: "var(--color-text-muted)", marginBottom: 4 };

  const tipoColors: Record<CampanhaTipo, [string, string]> = {
    NOVO_MEMBRO:           ["#dbeafe","#1e40af"],
    ATUALIZACAO_CADASTRAL: ["#fef9c3","#854d0e"],
    BATISMO:               ["#ede9fe","#5b21b6"],
    EVENTO:                ["#dcfce7","#166534"],
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={abrirCriar} style={{
          padding: "9px 18px", borderRadius: 8, border: "none",
          background: "var(--color-primary)", color: "#fff",
          fontSize: 13, fontWeight: 700, cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: 6,
        }}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nova Campanha
        </button>
      </div>

      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, overflow: "hidden" }}>
        {campanhas.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--color-text-muted)" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📢</div>
            <div style={{ fontWeight: 700 }}>Nenhuma campanha cadastrada</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F7FAFD", borderBottom: "1px solid var(--color-border)" }}>
                {["Nome", "Tipo", "Período", "Situação", ""].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 800, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: ".04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campanhas.map((c, i) => {
                const [bg, color] = tipoColors[c.tipo];
                return (
                  <tr key={c.id} style={{ borderBottom: i < campanhas.length - 1 ? "1px solid var(--color-border)" : "none" }}>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{c.nome}</div>
                      {c.descricao && <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 1 }}>{c.descricao}</div>}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: bg, color }}>{CAMPANHA_TIPO_LABELS[c.tipo]}</span>
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--color-text-muted)" }}>
                      {c.data_inicio && c.data_fim
                        ? `${new Date(c.data_inicio + "T12:00").toLocaleDateString("pt-BR")} – ${new Date(c.data_fim + "T12:00").toLocaleDateString("pt-BR")}`
                        : c.data_inicio
                        ? `Desde ${new Date(c.data_inicio + "T12:00").toLocaleDateString("pt-BR")}`
                        : "—"}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <button onClick={() => handleToggle(c)} disabled={pending} style={{
                        padding: "3px 10px", borderRadius: 99, border: "none", cursor: "pointer",
                        fontSize: 11, fontWeight: 700,
                        background: c.is_active ? "#dcfce7" : "#f1f5f9",
                        color: c.is_active ? "#16a34a" : "#64748b",
                      }}>
                        {c.is_active ? "Ativa" : "Inativa"}
                      </button>
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "right" }}>
                      <button onClick={() => abrirEditar(c)} style={{
                        background: "var(--color-primary-light)", color: "var(--color-primary)",
                        border: "none", borderRadius: 6, padding: "5px 12px",
                        fontSize: 12, fontWeight: 700, cursor: "pointer",
                      }}>Editar</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "var(--color-surface)", borderRadius: 14, padding: "24px 24px 20px", width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 15, fontWeight: 900 }}>
              {modal === "criar" ? "Nova Campanha" : `Editar: ${editando?.nome}`}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={labelStyle}>Nome *</label>
                <input value={nome} onChange={e => setNome(e.target.value)} style={inputStyle} autoFocus />
              </div>
              <div>
                <label style={labelStyle}>Tipo</label>
                <select value={tipo} onChange={e => setTipo(e.target.value as CampanhaTipo)} style={inputStyle}>
                  {TIPOS.map(t => <option key={t} value={t}>{CAMPANHA_TIPO_LABELS[t]}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Descrição</label>
                <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Data início</label>
                  <input type="date" value={inicio} onChange={e => setInicio(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Data fim</label>
                  <input type="date" value={fim} onChange={e => setFim(e.target.value)} style={inputStyle} />
                </div>
              </div>
            </div>

            {error && <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 8, background: "#fef2f2", color: "#dc2626", fontSize: 13 }}>⚠ {error}</div>}

            <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
              <button onClick={fechar} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--color-text-muted)" }}>
                Cancelar
              </button>
              <button onClick={handleSubmit} disabled={pending || !nome.trim()} style={{
                padding: "9px 18px", borderRadius: 8, border: "none",
                background: "var(--color-primary)", color: "#fff",
                fontSize: 13, fontWeight: 700, cursor: "pointer",
                opacity: pending || !nome.trim() ? 0.6 : 1,
              }}>
                {pending ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
