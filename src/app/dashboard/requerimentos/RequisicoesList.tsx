"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RequisitionListItem, ReqType, RequisitionSituacao } from "@/types";
import { REQUISITION_SITUACAO_LABELS, REQUISITION_SITUACAO_COLORS } from "@/types";

type Props = {
  mode:          "meus" | "recebidos";
  requerimentos: RequisitionListItem[];
  tipos:         ReqType[];
  title:         string;
};

const inputS: React.CSSProperties = {
  border: "1px solid var(--color-border)", borderRadius: 8, padding: "8px 12px",
  fontSize: 13, color: "var(--color-text-primary)", background: "var(--color-surface)",
  outline: "none",
};

function Badge({ sit }: { sit: RequisitionSituacao }) {
  const c = REQUISITION_SITUACAO_COLORS[sit];
  return (
    <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 800, background: c.bg, color: c.color }}>
      {REQUISITION_SITUACAO_LABELS[sit]}
    </span>
  );
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function RequisicoesList({ mode, requerimentos: init, tipos, title }: Props) {
  const router = useRouter();
  const [reqs, setReqs]   = useState(init);
  const [sitFilter, setSit] = useState<RequisitionSituacao | "">("");
  const [typeFilter, setType] = useState("");
  const [numMin, setNumMin] = useState("");
  const [numMax, setNumMax] = useState("");

  const filtrados = reqs.filter(r => {
    if (sitFilter  && r.situacao !== sitFilter)   return false;
    if (typeFilter && r.type_id  !== typeFilter)  return false;
    if (numMin     && r.numero   < Number(numMin)) return false;
    if (numMax     && r.numero   > Number(numMax)) return false;
    return true;
  });

  const pendentes = reqs.filter(r => r.situacao === "PENDENTE").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--color-text-primary)", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            {title}
            {pendentes > 0 && (
              <span style={{ fontSize: 12, fontWeight: 800, padding: "2px 9px", borderRadius: 99, background: "#fef3c7", color: "#92400e" }}>
                {pendentes} pendente{pendentes !== 1 ? "s" : ""}
              </span>
            )}
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "4px 0 0" }}>
            {filtrados.length} de {reqs.length} requerimento{reqs.length !== 1 ? "s" : ""}
          </p>
        </div>
        {mode === "meus" && (
          <button
            onClick={() => router.push("/dashboard/requerimentos/novo")}
            style={{ padding: "10px 18px", borderRadius: 9, background: "var(--color-primary)", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
          >
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Novo Requerimento
          </button>
        )}
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <select value={sitFilter} onChange={e => setSit(e.target.value as RequisitionSituacao | "")} style={{ ...inputS }}>
          <option value="">Todas situações</option>
          {(["PENDENTE","EM_ANALISE","APROVADO","REJEITADO","ARQUIVADO"] as RequisitionSituacao[]).map(s => (
            <option key={s} value={s}>{REQUISITION_SITUACAO_LABELS[s]}</option>
          ))}
        </select>
        <select value={typeFilter} onChange={e => setType(e.target.value)} style={{ ...inputS }}>
          <option value="">Todos os tipos</option>
          {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input value={numMin} onChange={e => setNumMin(e.target.value)} style={{ ...inputS, width: 80 }} placeholder="Nº de" type="number" />
          <span style={{ color: "var(--color-text-muted)", fontSize: 12 }}>–</span>
          <input value={numMax} onChange={e => setNumMax(e.target.value)} style={{ ...inputS, width: 80 }} placeholder="até" type="number" />
        </div>
        {(sitFilter || typeFilter || numMin || numMax) && (
          <button onClick={() => { setSit(""); setType(""); setNumMin(""); setNumMax(""); }} style={{ ...inputS, background: "none", color: "var(--color-primary)", fontWeight: 700, cursor: "pointer" }}>
            Limpar filtros
          </button>
        )}
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--color-text-muted)", background: "var(--color-surface)", borderRadius: 12, border: "1px solid var(--color-border)" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
          <div style={{ fontWeight: 700 }}>Nenhum requerimento encontrado</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtrados.map(r => (
            <div
              key={r.id}
              onClick={() => router.push(`/dashboard/requerimentos/${r.id}`)}
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 16, transition: "box-shadow 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,.08)")}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = "")}
            >
              {/* Número */}
              <div style={{ fontWeight: 900, fontSize: 18, color: "var(--color-primary)", flexShrink: 0, minWidth: 40, textAlign: "center" }}>
                #{String(r.numero).padStart(3, "0")}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
                  <span style={{ fontWeight: 800, fontSize: 14 }}>{r.type_nome}</span>
                  <Badge sit={r.situacao} />
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", display: "flex", flexWrap: "wrap", gap: "2px 14px" }}>
                  <span>De: <strong style={{ color: "var(--color-text-primary)" }}>{r.unit_from_nome}</strong></span>
                  <span>Para: <strong style={{ color: "var(--color-text-primary)" }}>{r.unit_to_nome}</strong></span>
                  {r.membro_nome && <span>Membro: <strong style={{ color: "var(--color-text-primary)" }}>{r.membro_nome}</strong></span>}
                  <span>Enviado: {fmtDate(r.data_envio)}</span>
                  {r.data_resposta && <span>Respondido: {fmtDate(r.data_resposta)}</span>}
                </div>
                {r.descricao && (
                  <div style={{ marginTop: 6, fontSize: 12, color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.descricao}
                  </div>
                )}
              </div>

              {/* Chevron */}
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }}>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
