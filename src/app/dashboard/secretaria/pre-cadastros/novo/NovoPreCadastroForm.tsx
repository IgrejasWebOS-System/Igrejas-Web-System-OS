"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PreRegistrationCampaign } from "@/types";
import { criarPreCadastroAction } from "../actions";

type Props = { campanhas: PreRegistrationCampaign[] };

export default function NovoPreCadastroForm({ campanhas }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [campaignId, setCampaignId] = useState(campanhas[0]?.id ?? "");
  const [nome, setNome]             = useState("");
  const [email, setEmail]           = useState("");
  const [telefone, setTelefone]     = useState("");
  const [dataNasc, setDataNasc]     = useState("");
  const [observacoes, setObs]       = useState("");

  function handleSubmit() {
    setError(null);
    if (!nome.trim()) { setError("Nome é obrigatório."); return; }

    const dados: Record<string, string> = { nome: nome.trim() };
    if (email.trim())    dados.email           = email.trim();
    if (telefone.trim()) dados.telefone        = telefone.trim();
    if (dataNasc)        dados.data_nascimento = dataNasc;

    const fd = new FormData();
    if (campaignId) fd.set("campaign_id", campaignId);
    if (observacoes.trim()) fd.set("observacoes", observacoes.trim());
    fd.set("dados_json", JSON.stringify(dados));

    startTransition(async () => {
      const result = await criarPreCadastroAction(fd);
      if (result.error) { setError(result.error); return; }
      router.push("/dashboard/secretaria/pre-cadastros");
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
      display: "flex", flexDirection: "column", gap: 14,
    }}>
      {/* Campanha */}
      {campanhas.length > 0 && (
        <div>
          <label style={labelStyle}>Campanha</label>
          <select value={campaignId} onChange={e => setCampaignId(e.target.value)} style={inputStyle}>
            <option value="">Sem campanha</option>
            {campanhas.filter(c => c.is_active).map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>
      )}

      {/* Nome */}
      <div>
        <label style={labelStyle}>Nome completo *</label>
        <input value={nome} onChange={e => setNome(e.target.value)} style={inputStyle} placeholder="Nome da pessoa" autoFocus />
      </div>

      {/* Grid: email + telefone */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={labelStyle}>E-mail</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} placeholder="email@exemplo.com" />
        </div>
        <div>
          <label style={labelStyle}>Telefone / WhatsApp</label>
          <input value={telefone} onChange={e => setTelefone(e.target.value)} style={inputStyle} placeholder="(11) 99999-9999" />
        </div>
      </div>

      {/* Data de nascimento */}
      <div>
        <label style={labelStyle}>Data de nascimento</label>
        <input type="date" value={dataNasc} onChange={e => setDataNasc(e.target.value)} style={inputStyle} />
      </div>

      {/* Observações */}
      <div>
        <label style={labelStyle}>Observações</label>
        <textarea
          value={observacoes} onChange={e => setObs(e.target.value)}
          rows={2} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
          placeholder="Como chegou à igreja, indicação, etc."
        />
      </div>

      {error && (
        <div style={{ padding: "10px 14px", borderRadius: 8, background: "#fef2f2", color: "#dc2626", fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <a href="/dashboard/secretaria/pre-cadastros" style={{
          padding: "10px 20px", borderRadius: 8, border: "1px solid var(--color-border)",
          background: "transparent", fontSize: 13, fontWeight: 600,
          textDecoration: "none", color: "var(--color-text-muted)",
        }}>
          Cancelar
        </a>
        <button onClick={handleSubmit} disabled={pending || !nome.trim()} style={{
          padding: "10px 20px", borderRadius: 8, border: "none",
          background: "var(--color-primary)", color: "#fff",
          fontSize: 13, fontWeight: 700, cursor: "pointer",
          opacity: pending || !nome.trim() ? 0.6 : 1,
        }}>
          {pending ? "Salvando…" : "Criar Pré-Cadastro"}
        </button>
      </div>
    </div>
  );
}
