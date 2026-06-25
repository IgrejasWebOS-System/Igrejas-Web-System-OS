"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import type { CredentialModel, CredentialRequestType } from "@/types";
import { criarCredencialAction } from "../actions";
import { buscarMembrosParaDocumento } from "../../actions";

type Membro = { party_id: string; nome: string; matricula: string | null; unidade: string | null };

type Props = {
  modelos: CredentialModel[];
  tipos:   CredentialRequestType[];
};

export default function NovaCredencialForm({ modelos, tipos }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Busca de membro
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<Membro[]>([]);
  const [membroSelecionado, setMembroSelecionado] = useState<Membro | null>(null);
  const [buscando, setBuscando] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Campos do form
  const [modeloId, setModeloId] = useState(modelos[0]?.id ?? "");
  const [tipoId, setTipoId] = useState(tipos[0]?.id ?? "");
  const [observacoes, setObservacoes] = useState("");

  function handleBusca(termo: string) {
    setBusca(termo);
    setMembroSelecionado(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!termo.trim()) { setResultados([]); return; }
    debounceRef.current = setTimeout(async () => {
      setBuscando(true);
      const { data } = await buscarMembrosParaDocumento(termo);
      setResultados(data);
      setBuscando(false);
    }, 350);
  }

  function selecionarMembro(m: Membro) {
    setMembroSelecionado(m);
    setBusca(m.nome);
    setResultados([]);
  }

  function handleSubmit() {
    setError(null);
    if (!membroSelecionado) { setError("Selecione um membro."); return; }
    if (!modeloId) { setError("Selecione um modelo."); return; }

    const fd = new FormData();
    fd.set("party_id",        membroSelecionado.party_id);
    fd.set("model_id",        modeloId);
    if (tipoId) fd.set("request_type_id", tipoId);
    if (observacoes.trim()) fd.set("observacoes", observacoes.trim());

    startTransition(async () => {
      const result = await criarCredencialAction(fd);
      if (result.error) { setError(result.error); return; }
      router.push(`/dashboard/secretaria/credenciais`);
    });
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", border: "1px solid var(--color-border)", borderRadius: 8,
    padding: "9px 12px", fontSize: 13, color: "var(--color-text-primary)",
    background: "var(--color-surface)", outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 700,
    color: "var(--color-text-muted)", marginBottom: 4,
  };

  return (
    <div style={{
      background: "var(--color-surface)", border: "1px solid var(--color-border)",
      borderRadius: 14, padding: "24px 24px 20px",
      display: "flex", flexDirection: "column", gap: 16,
    }}>
      {/* Busca de membro */}
      <div style={{ position: "relative" }}>
        <label style={labelStyle}>Membro *</label>
        <input
          value={busca}
          onChange={e => handleBusca(e.target.value)}
          placeholder="Digite o nome ou matrícula..."
          style={inputStyle}
          autoFocus
        />
        {buscando && (
          <div style={{ position: "absolute", right: 10, top: 30, fontSize: 11, color: "var(--color-text-muted)" }}>
            Buscando…
          </div>
        )}
        {resultados.length > 0 && (
          <div style={{
            position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
            background: "var(--color-surface)", border: "1px solid var(--color-border)",
            borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,.12)",
            maxHeight: 220, overflowY: "auto",
          }}>
            {resultados.map(m => (
              <button
                key={m.party_id}
                onClick={() => selecionarMembro(m)}
                style={{
                  width: "100%", textAlign: "left", padding: "10px 14px",
                  border: "none", background: "transparent", cursor: "pointer",
                  borderBottom: "1px solid var(--color-border)", fontSize: 13,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--color-bg)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ fontWeight: 700 }}>{m.nome}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                  {m.matricula ?? "—"} · {m.unidade ?? "—"}
                </div>
              </button>
            ))}
          </div>
        )}
        {membroSelecionado && (
          <div style={{
            marginTop: 6, padding: "6px 10px", borderRadius: 8,
            background: "#dcfce7", color: "#166534", fontSize: 12, fontWeight: 700,
          }}>
            ✓ {membroSelecionado.nome} — {membroSelecionado.matricula ?? "sem matrícula"} · {membroSelecionado.unidade}
          </div>
        )}
      </div>

      {/* Modelo */}
      <div>
        <label style={labelStyle}>Modelo de Credencial *</label>
        <select value={modeloId} onChange={e => setModeloId(e.target.value)} style={inputStyle}>
          {modelos.map(m => <option key={m.id} value={m.id}>{m.nome} ({m.validade_anos} ano{m.validade_anos !== 1 ? "s" : ""})</option>)}
        </select>
      </div>

      {/* Tipo de solicitação */}
      {tipos.length > 0 && (
        <div>
          <label style={labelStyle}>Tipo de Solicitação</label>
          <select value={tipoId} onChange={e => setTipoId(e.target.value)} style={inputStyle}>
            <option value="">Não especificado</option>
            {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </div>
      )}

      {/* Observações */}
      <div>
        <label style={labelStyle}>Observações (opcional)</label>
        <textarea
          value={observacoes}
          onChange={e => setObservacoes(e.target.value)}
          rows={2}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
          placeholder="Motivo da solicitação, urgência, etc."
        />
      </div>

      {error && (
        <div style={{ padding: "10px 14px", borderRadius: 8, background: "#fef2f2", color: "#dc2626", fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <a href="/dashboard/secretaria/credenciais" style={{
          padding: "10px 20px", borderRadius: 8,
          border: "1px solid var(--color-border)", background: "transparent",
          fontSize: 13, fontWeight: 600, textDecoration: "none",
          color: "var(--color-text-muted)",
        }}>
          Cancelar
        </a>
        <button onClick={handleSubmit} disabled={pending || !membroSelecionado} style={{
          padding: "10px 20px", borderRadius: 8, border: "none",
          background: "var(--color-primary)", color: "#fff",
          fontSize: 13, fontWeight: 700, cursor: "pointer",
          opacity: pending || !membroSelecionado ? 0.6 : 1,
        }}>
          {pending ? "Criando…" : "Criar Credencial"}
        </button>
      </div>
    </div>
  );
}
