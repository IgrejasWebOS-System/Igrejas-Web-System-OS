"use client";

import { useState, useTransition } from "react";
import type { Material } from "@/types";
import { criarMaterialAction, editarMaterialAction, toggleMaterialAction } from "@/app/dashboard/secretaria/pedidos/actions";

type Props = { materiais: Material[] };

const UNIDADES = ["unid","cx","kg","g","L","mL","m","pc","par","resma"];

const inputStyle: React.CSSProperties = {
  width: "100%", border: "1px solid var(--color-border)", borderRadius: 8,
  padding: "8px 12px", fontSize: 13, color: "var(--color-text-primary)",
  background: "var(--color-surface)", outline: "none", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 700,
  color: "var(--color-text-muted)", marginBottom: 4,
};

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function MateriaisClient({ materiais: init }: Props) {
  const [materiais, setMateriais] = useState(init);
  const [modal, setModal]     = useState<"criar" | "editar" | null>(null);
  const [editando, setEditando] = useState<Material | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [nome, setNome]     = useState("");
  const [desc, setDesc]     = useState("");
  const [unidade, setUnidade] = useState("unid");
  const [valor, setValor]   = useState("0");

  function abrirCriar() {
    setNome(""); setDesc(""); setUnidade("unid"); setValor("0");
    setError(null); setModal("criar");
  }
  function abrirEditar(m: Material) {
    setEditando(m);
    setNome(m.nome); setDesc(m.descricao ?? ""); setUnidade(m.unidade); setValor(String(m.valor_unitario));
    setError(null); setModal("editar");
  }
  function fechar() { setModal(null); setEditando(null); setError(null); }

  function handleSubmit() {
    if (!nome.trim()) { setError("Nome obrigatório"); return; }
    setError(null);
    const fd = new FormData();
    fd.set("nome", nome.trim());
    fd.set("unidade", unidade);
    fd.set("valor_unitario", valor || "0");
    if (desc.trim()) fd.set("descricao", desc.trim());

    startTransition(async () => {
      try {
        if (modal === "criar") {
          await criarMaterialAction(fd);
          const now = new Date().toISOString();
          setMateriais(prev => [...prev, {
            id: crypto.randomUUID(), ministry_id: "", nome: nome.trim(),
            descricao: desc || null, unidade, valor_unitario: parseFloat(valor || "0"),
            is_active: true, created_at: now,
          }]);
        } else if (modal === "editar" && editando) {
          await editarMaterialAction(editando.id, fd);
          setMateriais(prev => prev.map(m => m.id === editando.id
            ? { ...m, nome: nome.trim(), descricao: desc || null, unidade, valor_unitario: parseFloat(valor || "0") }
            : m));
        }
        fechar();
      } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    });
  }

  function handleToggle(m: Material) {
    startTransition(async () => {
      try {
        await toggleMaterialAction(m.id, !m.is_active);
        setMateriais(prev => prev.map(x => x.id === m.id ? { ...x, is_active: !m.is_active } : x));
      } catch (e: unknown) { alert(e instanceof Error ? e.message : "Erro"); }
    });
  }

  const ativos   = materiais.filter(m => m.is_active).length;
  const inativos = materiais.length - ativos;

  return (
    <>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        {[
          ["Total", materiais.length, "#64748b"],
          ["Ativos", ativos, "#166534"],
          ["Inativos", inativos, "#991b1b"],
        ].map(([l, v, c]) => (
          <div key={l as string} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, padding: "12px 16px" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 4 }}>{l}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: c as string }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Botão novo */}
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
          Novo Material
        </button>
      </div>

      {/* Tabela */}
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, overflow: "hidden" }}>
        {materiais.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--color-text-muted)" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
            <div style={{ fontWeight: 700 }}>Nenhum material cadastrado</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F7FAFD", borderBottom: "1px solid var(--color-border)" }}>
                {["Nome","Unidade","Valor Unit.","Situação",""].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 800, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: ".04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {materiais.map((m, i) => (
                <tr key={m.id} style={{ borderBottom: i < materiais.length - 1 ? "1px solid var(--color-border)" : "none", opacity: m.is_active ? 1 : 0.55 }}>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{m.nome}</div>
                    {m.descricao && <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 1 }}>{m.descricao}</div>}
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 13 }}>{m.unidade}</td>
                  <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 700 }}>{fmt(m.valor_unitario)}</td>
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

      {/* Modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "var(--color-surface)", borderRadius: 14, padding: "24px 24px 20px", width: "100%", maxWidth: 460, boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 15, fontWeight: 900 }}>
              {modal === "criar" ? "Novo Material" : `Editar: ${editando?.nome}`}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={labelStyle}>Nome *</label>
                <input value={nome} onChange={e => setNome(e.target.value)} style={inputStyle} autoFocus />
              </div>
              <div>
                <label style={labelStyle}>Descrição</label>
                <input value={desc} onChange={e => setDesc(e.target.value)} style={inputStyle} placeholder="Opcional" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Unidade</label>
                  <select value={unidade} onChange={e => setUnidade(e.target.value)} style={inputStyle}>
                    {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Valor Unitário (R$)</label>
                  <input type="number" min="0" step="0.01" value={valor} onChange={e => setValor(e.target.value)} style={inputStyle} />
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
