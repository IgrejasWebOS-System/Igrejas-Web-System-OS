"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import type { ReqType } from "@/types";
import { criarRequisicaoAction } from "../actions";

type Props = {
  tipos:    ReqType[];
  unidades: { id: string; nome: string }[];
};

type MembroSugestao = { id: string; nome_completo: string; matricula: string | null };

const inputS: React.CSSProperties = {
  width: "100%", border: "1px solid var(--color-border)", borderRadius: 8,
  padding: "9px 12px", fontSize: 13, color: "var(--color-text-primary)",
  background: "var(--color-surface)", outline: "none", boxSizing: "border-box",
};
const labelS: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 700,
  color: "var(--color-text-muted)", marginBottom: 4, textTransform: "uppercase",
};

export default function NovoRequerimentoClient({ tipos, unidades }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError]         = useState<string | null>(null);

  const [typeId, setTypeId]     = useState("");
  const [unitToId, setUnitToId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [partyId, setPartyId]   = useState("");
  const [partyNome, setPartyNome] = useState("");
  const [partyQuery, setPartyQuery] = useState("");
  const [sugestoes, setSugestoes] = useState<MembroSugestao[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tipoSelecionado = tipos.find(t => t.id === typeId);

  function buscarMembro(q: string) {
    setPartyQuery(q);
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

  function handleSubmit() {
    if (!typeId)      { setError("Selecione o tipo de requerimento"); return; }
    if (!unitToId)    { setError("Selecione a igreja destinatária"); return; }
    if (!descricao.trim()) { setError("Preencha a descrição"); return; }
    if (tipoSelecionado?.requer_membro && !partyId) {
      setError("Este tipo de requerimento exige um membro vinculado"); return;
    }
    setError(null);

    const fd = new FormData();
    fd.set("type_id",    typeId);
    fd.set("unit_to_id", unitToId);
    fd.set("descricao",  descricao.trim());
    if (partyId) fd.set("party_id", partyId);

    startTransition(async () => {
      try {
        const id = await criarRequisicaoAction(fd);
        router.push(`/dashboard/requerimentos/${id}`);
      } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    });
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <button
        onClick={() => router.back()}
        style={{ background: "none", border: "none", color: "var(--color-primary)", fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0, marginBottom: 16 }}
      >
        ← Voltar
      </button>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--color-text-primary)", margin: "0 0 24px" }}>
        Novo Requerimento
      </h1>

      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, padding: "24px 24px 20px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Tipo */}
          <div>
            <label style={labelS}>Tipo de Requerimento *</label>
            <select value={typeId} onChange={e => setTypeId(e.target.value)} style={inputS}>
              <option value="">Selecione…</option>
              {tipos.filter(t => t.is_active).map(t => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
            {tipoSelecionado?.descricao && (
              <div style={{ marginTop: 4, fontSize: 12, color: "var(--color-text-muted)" }}>{tipoSelecionado.descricao}</div>
            )}
          </div>

          {/* Igreja destino */}
          <div>
            <label style={labelS}>Igreja Destinatária *</label>
            <select value={unitToId} onChange={e => setUnitToId(e.target.value)} style={inputS}>
              <option value="">Selecione…</option>
              {unidades.map(u => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </div>

          {/* Membro — condicional */}
          {tipoSelecionado && (
            <div style={{ position: "relative" }}>
              <label style={labelS}>
                Membro Referenciado {tipoSelecionado.requer_membro ? "*" : "(opcional)"}
              </label>
              <input
                value={partyQuery}
                onChange={e => buscarMembro(e.target.value)}
                style={inputS}
                placeholder="Buscar por nome ou matrícula…"
              />
              {sugestoes.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,.1)", zIndex: 50, maxHeight: 180, overflowY: "auto" }}>
                  {sugestoes.map(s => (
                    <div
                      key={s.id}
                      onClick={() => { setPartyId(s.id); setPartyNome(s.nome_completo); setPartyQuery(s.nome_completo); setSugestoes([]); }}
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
              {partyId && (
                <div style={{ marginTop: 4, fontSize: 11, color: "var(--color-primary)", fontWeight: 600 }}>
                  ✓ {partyNome}
                  <button onClick={() => { setPartyId(""); setPartyNome(""); setPartyQuery(""); }} style={{ marginLeft: 8, fontSize: 10, color: "#dc2626", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>✕</button>
                </div>
              )}
            </div>
          )}

          {/* Descrição */}
          <div>
            <label style={labelS}>Descrição / Solicitação *</label>
            <textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              style={{ ...inputS, minHeight: 120, resize: "vertical" }}
              placeholder="Descreva o motivo e detalhes do requerimento…"
            />
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 8, background: "#fef2f2", color: "#dc2626", fontSize: 13 }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
          <button onClick={() => router.back()} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--color-text-muted)" }}>
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={pending || !typeId || !unitToId || !descricao.trim()}
            style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: "var(--color-primary)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: pending || !typeId || !unitToId || !descricao.trim() ? 0.6 : 1 }}
          >
            {pending ? "Enviando…" : "Enviar Requerimento"}
          </button>
        </div>
      </div>
    </div>
  );
}
