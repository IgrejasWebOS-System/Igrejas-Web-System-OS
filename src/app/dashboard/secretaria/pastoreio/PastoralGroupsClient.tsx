"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import type { PastoralGroupListItem } from "@/types";
import { criarGrupoAction, editarGrupoAction, toggleGrupoAction } from "./actions";

type Props = { grupos: PastoralGroupListItem[] };

const inputS: React.CSSProperties = {
  width: "100%", border: "1px solid var(--color-border)", borderRadius: 8,
  padding: "9px 12px", fontSize: 13, color: "var(--color-text-primary)",
  background: "var(--color-surface)", outline: "none", boxSizing: "border-box",
};
const labelS: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 700,
  color: "var(--color-text-muted)", marginBottom: 4, textTransform: "uppercase",
};

type MembroSugestao = { id: string; nome_completo: string; matricula: string | null };

export default function PastoralGroupsClient({ grupos: init }: Props) {
  const router = useRouter();
  const [grupos, setGrupos]   = useState(init);
  const [busca, setBusca]     = useState("");
  const [modal, setModal]     = useState<"criar" | "editar" | null>(null);
  const [editando, setEditando] = useState<PastoralGroupListItem | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError]     = useState<string | null>(null);

  // Form fields
  const [nome, setNome]           = useState("");
  const [descricao, setDescricao] = useState("");
  const [pastorId, setPastorId]   = useState("");
  const [pastorNome, setPastorNome] = useState("");
  const [unitId, setUnitId]       = useState("");
  const [unitNome, setUnitNome]   = useState("");

  // Debounced search para pastor
  const [sugestoesPastor, setSugestoesPastor] = useState<MembroSugestao[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function buscarPastor(q: string) {
    setPastorNome(q);
    if (!q.trim()) { setSugestoesPastor([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/membros/buscar?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setSugestoesPastor(data ?? []);
      } catch { setSugestoesPastor([]); }
    }, 300);
  }

  function abrirCriar() {
    setNome(""); setDescricao(""); setPastorId(""); setPastorNome(""); setUnitId(""); setUnitNome("");
    setSugestoesPastor([]); setError(null); setEditando(null); setModal("criar");
  }

  function abrirEditar(g: PastoralGroupListItem) {
    setNome(g.nome); setDescricao(g.descricao ?? "");
    setPastorId(g.pastor_party_id ?? ""); setPastorNome(g.pastor_nome ?? "");
    setUnitId(g.unit_id ?? ""); setUnitNome(g.unit_nome ?? "");
    setSugestoesPastor([]); setError(null); setEditando(g); setModal("editar");
  }

  function fechar() { setModal(null); setEditando(null); setError(null); }

  function handleSubmit() {
    if (!nome.trim()) { setError("Nome do grupo obrigatório"); return; }
    setError(null);
    const fd = new FormData();
    fd.set("nome", nome.trim());
    if (descricao.trim()) fd.set("descricao", descricao.trim());
    if (pastorId)         fd.set("pastor_party_id", pastorId);
    if (unitId)           fd.set("unit_id", unitId);

    startTransition(async () => {
      try {
        if (modal === "criar") {
          await criarGrupoAction(fd);
        } else if (modal === "editar" && editando) {
          await editarGrupoAction(editando.id, fd);
        }
        fechar();
        router.refresh();
      } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    });
  }

  function handleToggle(g: PastoralGroupListItem) {
    startTransition(async () => {
      try {
        await toggleGrupoAction(g.id, !g.is_active);
        setGrupos(prev => prev.map(x => x.id === g.id ? { ...x, is_active: !x.is_active } : x));
      } catch { /* silent */ }
    });
  }

  const filtrados = grupos.filter(g =>
    !busca.trim() ||
    g.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (g.pastor_nome ?? "").toLowerCase().includes(busca.toLowerCase())
  );

  const fmtVpd = (v: number) =>
    v > 0 ? `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—";

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--color-text-primary)", margin: 0 }}>
              Grupos de Pastoreio
            </h1>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "4px 0 0" }}>
              {grupos.length} grupo{grupos.length !== 1 ? "s" : ""} cadastrado{grupos.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={abrirCriar}
            style={{ padding: "10px 18px", borderRadius: 9, background: "var(--color-primary)", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
          >
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Novo Grupo
          </button>
        </div>

        {/* Busca */}
        <input
          value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome ou pastor…"
          style={{ ...inputS, maxWidth: 360 }}
        />

        {/* Lista */}
        {filtrados.length === 0 ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--color-text-muted)", background: "var(--color-surface)", borderRadius: 12, border: "1px solid var(--color-border)" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🏘️</div>
            <div style={{ fontWeight: 700 }}>Nenhum grupo encontrado</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtrados.map(g => (
              <div
                key={g.id}
                style={{ background: "var(--color-surface)", border: `1px solid ${g.is_active ? "var(--color-border)" : "#e2e8f0"}`, borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, opacity: g.is_active ? 1 : 0.6 }}
              >
                {/* Ícone */}
                <div style={{ width: 44, height: 44, borderRadius: 10, background: g.is_active ? "var(--color-primary-light)" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={g.is_active ? "var(--color-primary)" : "#94a3b8"} strokeWidth={2}>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontWeight: 800, fontSize: 14, color: "var(--color-text-primary)" }}>{g.nome}</span>
                    {!g.is_active && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: "#f1f5f9", color: "#94a3b8" }}>Inativo</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", display: "flex", flexWrap: "wrap", gap: "2px 14px" }}>
                    {g.pastor_nome && <span>👤 {g.pastor_nome}</span>}
                    {g.unit_nome   && <span>🏛 {g.unit_nome}</span>}
                    <span>👥 {g.qtd_membros} membro{g.qtd_membros !== 1 ? "s" : ""}</span>
                    <span>💰 VPD {fmtVpd(g.vpd_total)}</span>
                  </div>
                </div>

                {/* Ações */}
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => router.push(`/dashboard/secretaria/pastoreio/${g.id}`)}
                    style={{ padding: "6px 12px", borderRadius: 7, border: "none", background: "var(--color-primary-light)", color: "var(--color-primary)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                  >
                    Ver
                  </button>
                  <button
                    onClick={() => abrirEditar(g)}
                    style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid var(--color-border)", background: "transparent", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "var(--color-text-muted)" }}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleToggle(g)}
                    disabled={pending}
                    style={{ padding: "6px 12px", borderRadius: 7, border: "none", background: g.is_active ? "#fef2f2" : "#f0fdf4", color: g.is_active ? "#dc2626" : "#16a34a", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                  >
                    {g.is_active ? "Desativar" : "Ativar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Criar/Editar */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "var(--color-surface)", borderRadius: 14, padding: "26px 28px 22px", width: "100%", maxWidth: 520, boxShadow: "0 20px 60px rgba(0,0,0,.2)", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 900 }}>
              {modal === "criar" ? "Novo Grupo de Pastoreio" : "Editar Grupo"}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelS}>Nome do Grupo *</label>
                <input value={nome} onChange={e => setNome(e.target.value)} style={inputS} autoFocus placeholder="Ex: Grupo Norte, Célula da Esperança…" />
              </div>
              <div>
                <label style={labelS}>Descrição</label>
                <textarea value={descricao} onChange={e => setDescricao(e.target.value)} style={{ ...inputS, minHeight: 72, resize: "vertical" }} placeholder="Descrição opcional…" />
              </div>

              {/* Pastor */}
              <div style={{ position: "relative" }}>
                <label style={labelS}>Pastor Responsável</label>
                <input
                  value={pastorNome}
                  onChange={e => buscarPastor(e.target.value)}
                  style={inputS}
                  placeholder="Buscar membro…"
                />
                {sugestoesPastor.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,.12)", zIndex: 50, maxHeight: 180, overflowY: "auto" }}>
                    {sugestoesPastor.map(s => (
                      <div
                        key={s.id}
                        onClick={() => { setPastorId(s.id); setPastorNome(s.nome_completo); setSugestoesPastor([]); }}
                        style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid var(--color-border)" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--color-primary-light)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "")}
                      >
                        <div style={{ fontWeight: 700 }}>{s.nome_completo}</div>
                        {s.matricula && <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{s.matricula}</div>}
                      </div>
                    ))}
                  </div>
                )}
                {pastorId && (
                  <div style={{ marginTop: 4, fontSize: 11, color: "var(--color-primary)", fontWeight: 600 }}>
                    ✓ Selecionado: {pastorNome}
                    <button onClick={() => { setPastorId(""); setPastorNome(""); }} style={{ marginLeft: 8, fontSize: 10, color: "#dc2626", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>✕ Remover</button>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: "#fef2f2", color: "#dc2626", fontSize: 13 }}>
                ⚠ {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button onClick={fechar} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--color-text-muted)" }}>
                Cancelar
              </button>
              <button onClick={handleSubmit} disabled={pending || !nome.trim()} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "var(--color-primary)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: pending || !nome.trim() ? 0.6 : 1 }}>
                {pending ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
