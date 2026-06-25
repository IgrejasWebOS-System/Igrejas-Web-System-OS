"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import type { CredentialModel } from "@/types";
import {
  criarModeloCredencialAction,
  editarModeloCredencialAction,
  toggleModeloCredencialAction,
} from "./actions";

const VARIAVEIS = [
  { chave: "{{nome}}",          label: "Nome completo" },
  { chave: "{{cpf}}",           label: "CPF" },
  { chave: "{{cargo}}",         label: "Cargo eclesiástico" },
  { chave: "{{matricula}}",     label: "Matrícula" },
  { chave: "{{unidade}}",       label: "Unidade" },
  { chave: "{{ministerio}}",    label: "Ministério" },
  { chave: "{{data_emissao}}", label: "Data de emissão" },
  { chave: "{{data_validade}}", label: "Data de validade" },
  { chave: "{{foto_url}}",      label: "Foto (renderiza <img>)" },
];

type Props = {
  modelos: CredentialModel[];
  cargos:  { id: string; nome: string }[];
};

type Tab = "editor" | "preview";

export default function ModelosCredencialClient({ modelos: init, cargos }: Props) {
  const [modelos, setModelos] = useState(init);
  const [modal, setModal] = useState<"criar" | "editar" | null>(null);
  const [editando, setEditando] = useState<CredentialModel | null>(null);
  const [tab, setTab] = useState<Tab>("editor");
  const [previewHtml, setPreviewHtml] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [templateHtml, setTemplateHtml] = useState("");
  const [cargoId, setCargoId] = useState("");
  const [validadeAnos, setValidadeAnos] = useState("2");

  function abrirCriar() {
    setNome(""); setSlug(""); setTemplateHtml(""); setCargoId(""); setValidadeAnos("2");
    setTab("editor"); setError(null); setModal("criar");
  }

  function abrirEditar(m: CredentialModel) {
    setEditando(m);
    setNome(m.nome); setSlug(m.slug ?? ""); setTemplateHtml(m.template_html ?? "");
    setCargoId(m.cargo_id ?? ""); setValidadeAnos(String(m.validade_anos));
    setTab("editor"); setError(null); setModal("editar");
  }

  function fechar() { setModal(null); setEditando(null); setError(null); }

  useEffect(() => {
    if (modal === "criar") {
      setSlug(nome.toLowerCase()
        .normalize("NFD").replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  }, [nome, modal]);

  useEffect(() => {
    if (tab !== "preview") return;
    const demo: Record<string, string> = {
      "{{nome}}":          "João da Silva",
      "{{cpf}}":           "123.456.789-00",
      "{{cargo}}":         cargos.find(c => c.id === cargoId)?.nome ?? "Pastor",
      "{{matricula}}":     "2024-0001",
      "{{unidade}}":       "Igreja Sede",
      "{{ministerio}}":    "Campo Piracicaba",
      "{{data_emissao}}":  new Date().toLocaleDateString("pt-BR"),
      "{{data_validade}}": new Date(Date.now() + Number(validadeAnos) * 365.25 * 86400000).toLocaleDateString("pt-BR"),
      "{{foto_url}}":      `<div style="width:60px;height:60px;border-radius:50%;background:#dbeafe;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#1e40af">J</div>`,
    };
    let html = templateHtml;
    for (const [k, v] of Object.entries(demo)) html = html.replaceAll(k, v);
    setPreviewHtml(html);
  }, [tab, templateHtml, cargoId, validadeAnos, cargos]);

  function inserirVariavel(chave: string) {
    const ta = textareaRef.current;
    if (!ta) { setTemplateHtml(v => v + chave); return; }
    const s = ta.selectionStart ?? templateHtml.length;
    const e = ta.selectionEnd   ?? templateHtml.length;
    const novo = templateHtml.slice(0, s) + chave + templateHtml.slice(e);
    setTemplateHtml(novo);
    setTimeout(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = s + chave.length; }, 0);
  }

  function handleSubmit() {
    setError(null);
    const fd = new FormData();
    fd.set("nome", nome); fd.set("slug", slug);
    fd.set("template_html", templateHtml);
    fd.set("cargo_id", cargoId);
    fd.set("validade_anos", validadeAnos);

    startTransition(async () => {
      try {
        if (modal === "criar") {
          await criarModeloCredencialAction(fd);
          setModelos(prev => [...prev, {
            id: crypto.randomUUID(), ministry_id: "", nome, slug,
            template_html: templateHtml, cargo_id: cargoId || null,
            validade_anos: Number(validadeAnos), is_active: true, created_at: new Date().toISOString(),
          }]);
        } else if (modal === "editar" && editando) {
          await editarModeloCredencialAction(editando.id, fd);
          setModelos(prev => prev.map(m => m.id === editando.id
            ? { ...m, nome, slug, template_html: templateHtml, cargo_id: cargoId || null, validade_anos: Number(validadeAnos) }
            : m
          ));
        }
        fechar();
      } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    });
  }

  function handleToggle(m: CredentialModel) {
    startTransition(async () => {
      try {
        await toggleModeloCredencialAction(m.id, !m.is_active);
        setModelos(prev => prev.map(x => x.id === m.id ? { ...x, is_active: !m.is_active } : x));
      } catch (e: unknown) { alert(e instanceof Error ? e.message : "Erro"); }
    });
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", border: "1px solid var(--color-border)", borderRadius: 8,
    padding: "8px 12px", fontSize: 13, color: "var(--color-text-primary)",
    background: "var(--color-surface)", outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 700, color: "var(--color-text-muted)", marginBottom: 4 };

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
          Novo Modelo
        </button>
      </div>

      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, overflow: "hidden" }}>
        {modelos.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--color-text-muted)" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🪪</div>
            <div style={{ fontWeight: 700 }}>Nenhum modelo de credencial cadastrado</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F7FAFD", borderBottom: "1px solid var(--color-border)" }}>
                {["Nome", "Slug", "Validade", "Situação", ""].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 800, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: ".04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modelos.map((m, i) => (
                <tr key={m.id} style={{ borderBottom: i < modelos.length - 1 ? "1px solid var(--color-border)" : "none" }}>
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{m.nome}</span>
                    {m.cargo_id && cargos.find(c => c.id === m.cargo_id) && (
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                        {cargos.find(c => c.id === m.cargo_id)?.nome}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <code style={{ fontSize: 11, background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>{m.slug}</code>
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 13, color: "var(--color-text-muted)" }}>
                    {m.validade_anos} ano{m.validade_anos !== 1 ? "s" : ""}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <button onClick={() => handleToggle(m)} disabled={pending} style={{
                      padding: "3px 10px", borderRadius: 99, border: "none", cursor: "pointer",
                      fontSize: 11, fontWeight: 700,
                      background: m.is_active ? "#dcfce7" : "#f1f5f9",
                      color: m.is_active ? "#16a34a" : "#64748b",
                    }}>
                      {m.is_active ? "Ativo" : "Inativo"}
                    </button>
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    <button onClick={() => abrirEditar(m)} style={{
                      background: "var(--color-primary-light)", color: "var(--color-primary)",
                      border: "none", borderRadius: 6, padding: "5px 12px",
                      fontSize: 12, fontWeight: 700, cursor: "pointer",
                    }}>Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(0,0,0,.45)", display: "flex", alignItems: "flex-start",
          justifyContent: "center", padding: "40px 16px", overflowY: "auto",
        }}>
          <div style={{
            background: "var(--color-surface)", borderRadius: 14, padding: "28px 28px 24px",
            width: "100%", maxWidth: 720, boxShadow: "0 20px 60px rgba(0,0,0,.2)",
          }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 900 }}>
              {modal === "criar" ? "Novo Modelo de Credencial" : `Editar: ${editando?.nome}`}
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Nome *</label>
                <input value={nome} onChange={e => setNome(e.target.value)} style={inputStyle} placeholder="Ex: Carteira de Pastor" />
              </div>
              <div>
                <label style={labelStyle}>Slug</label>
                <input value={slug} onChange={e => setSlug(e.target.value)} style={inputStyle} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Cargo vinculado (opcional)</label>
                <select value={cargoId} onChange={e => setCargoId(e.target.value)} style={inputStyle}>
                  <option value="">Nenhum</option>
                  {cargos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Validade (anos)</label>
                <input type="number" value={validadeAnos} onChange={e => setValidadeAnos(e.target.value)} style={inputStyle} min={1} max={10} />
              </div>
            </div>

            {/* Chips */}
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Variáveis disponíveis</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 4 }}>
                {VARIAVEIS.map(v => (
                  <button key={v.chave} onClick={() => inserirVariavel(v.chave)} title={v.label} style={{
                    padding: "3px 10px", borderRadius: 99,
                    border: "1px solid var(--color-primary)",
                    background: "var(--color-primary-light)",
                    color: "var(--color-primary)",
                    fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "monospace",
                  }}>
                    {v.chave}
                  </button>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 2, marginBottom: 8 }}>
              {(["editor", "preview"] as Tab[]).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  padding: "6px 14px", borderRadius: "6px 6px 0 0",
                  border: "1px solid var(--color-border)",
                  borderBottom: t === tab ? "1px solid var(--color-surface)" : "1px solid var(--color-border)",
                  background: t === tab ? "var(--color-surface)" : "#f8fafc",
                  color: t === tab ? "var(--color-primary)" : "var(--color-text-muted)",
                  fontSize: 12, fontWeight: 700, cursor: "pointer", marginBottom: t === tab ? -1 : 0,
                }}>
                  {t === "editor" ? "✏️ Editor HTML" : "👁 Preview"}
                </button>
              ))}
            </div>

            {tab === "editor" && (
              <textarea ref={textareaRef} value={templateHtml} onChange={e => setTemplateHtml(e.target.value)}
                rows={12} style={{ ...inputStyle, fontFamily: "monospace", fontSize: 12, lineHeight: 1.6, resize: "vertical", borderRadius: "0 8px 8px 8px" }}
                placeholder="<p><strong>{{nome}}</strong> — {{cargo}}</p>&#10;<p>Válido até {{data_validade}}</p>" />
            )}
            {tab === "preview" && (
              <div style={{
                border: "1px solid var(--color-border)", borderRadius: "0 8px 8px 8px",
                minHeight: 180, padding: "16px 20px", background: "#fff", fontSize: 13, lineHeight: 1.7, color: "#1e293b",
              }}
                dangerouslySetInnerHTML={{ __html: previewHtml || "<em style='color:#94a3b8'>Nenhum conteúdo.</em>" }}
              />
            )}

            {error && <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 8, background: "#fef2f2", color: "#dc2626", fontSize: 13 }}>⚠ {error}</div>}

            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button onClick={fechar} style={{
                padding: "9px 18px", borderRadius: 8, border: "1px solid var(--color-border)",
                background: "transparent", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--color-text-muted)",
              }}>Cancelar</button>
              <button onClick={handleSubmit} disabled={pending || !nome.trim()} style={{
                padding: "9px 18px", borderRadius: 8, border: "none",
                background: "var(--color-primary)", color: "#fff",
                fontSize: 13, fontWeight: 700, cursor: "pointer",
                opacity: pending || !nome.trim() ? 0.6 : 1,
              }}>
                {pending ? "Salvando…" : "Salvar Modelo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
