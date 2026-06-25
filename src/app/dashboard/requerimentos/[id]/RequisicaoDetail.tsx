"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RequisitionDetail, SessionContext, RequisitionSituacao } from "@/types";
import { REQUISITION_SITUACAO_LABELS, REQUISITION_SITUACAO_COLORS } from "@/types";
import { responderRequisicaoAction, arquivarRequisicaoAction } from "../actions";

type Props = {
  requisicao: RequisitionDetail;
  ctx:        SessionContext;
};

function Badge({ sit }: { sit: RequisitionSituacao }) {
  const c = REQUISITION_SITUACAO_COLORS[sit];
  return (
    <span style={{ padding: "4px 12px", borderRadius: 99, fontSize: 12, fontWeight: 800, background: c.bg, color: c.color }}>
      {REQUISITION_SITUACAO_LABELS[sit]}
    </span>
  );
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const inputS: React.CSSProperties = {
  width: "100%", border: "1px solid var(--color-border)", borderRadius: 8,
  padding: "9px 12px", fontSize: 13, color: "var(--color-text-primary)",
  background: "var(--color-surface)", outline: "none", boxSizing: "border-box",
};

export default function RequisicaoDetail({ requisicao: req, ctx }: Props) {
  const router  = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Modal de resposta
  const [showResp, setShowResp]   = useState(false);
  const [respSit, setRespSit]     = useState<"APROVADO" | "REJEITADO">("APROVADO");
  const [resposta, setResposta]   = useState("");
  const [situacao, setSituacao]   = useState<RequisitionSituacao>(req.situacao);

  // Permissões
  const isDestino  = req.unit_to_id   === ctx.unit_id;
  const isRemetente = req.unit_from_id === ctx.unit_id;
  const canResponder = isDestino  && ["PENDENTE","EM_ANALISE"].includes(situacao) && ctx.level <= 3;
  const canArquivar  = isRemetente && ["PENDENTE","EM_ANALISE"].includes(situacao) && ctx.level <= 3;

  function handleResponder() {
    if (!resposta.trim()) { setError("Preencha a resposta"); return; }
    setError(null);
    startTransition(async () => {
      try {
        await responderRequisicaoAction(req.id, respSit, resposta.trim());
        setSituacao(respSit);
        setShowResp(false);
      } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    });
  }

  function handleArquivar() {
    if (!confirm("Arquivar este requerimento?")) return;
    startTransition(async () => {
      try {
        await arquivarRequisicaoAction(req.id);
        setSituacao("ARQUIVADO");
      } catch { /* silent */ }
    });
  }

  const secTitle: React.CSSProperties = { fontSize: 11, fontWeight: 800, color: "var(--color-primary)", textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 10px", paddingBottom: 6, borderBottom: "1px solid var(--color-border)" };
  const field: React.CSSProperties    = { display: "flex", flexDirection: "column", gap: 2 };
  const fLabel: React.CSSProperties   = { fontSize: 10, fontWeight: 800, color: "var(--color-text-muted)", textTransform: "uppercase" };
  const fVal: React.CSSProperties     = { fontSize: 13, color: "var(--color-text-primary)", fontWeight: 500 };

  return (
    <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 20 }}>
      <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "var(--color-primary)", fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0, width: "fit-content" }}>
        ← Voltar
      </button>

      {/* Card principal */}
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, padding: "22px 24px" }}>

        {/* Header do card */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: "var(--color-primary)" }}>
                #{String(req.numero).padStart(3, "0")}
              </span>
              <Badge sit={situacao} />
            </div>
            <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{req.type_nome}</h1>
          </div>

          {/* Ações */}
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            {canResponder && (
              <button onClick={() => setShowResp(true)} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--color-primary)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Responder
              </button>
            )}
            {canArquivar && (
              <button onClick={handleArquivar} disabled={pending} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--color-text-muted)" }}>
                Arquivar
              </button>
            )}
          </div>
        </div>

        {/* Grid de informações */}
        <h3 style={secTitle}>Informações do Requerimento</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 24px", marginBottom: 20 }}>
          <div style={field}><span style={fLabel}>Igreja Remetente</span><span style={fVal}>{req.unit_from_nome}</span></div>
          <div style={field}><span style={fLabel}>Igreja Destinatária</span><span style={fVal}>{req.unit_to_nome}</span></div>
          <div style={field}><span style={fLabel}>Data de Envio</span><span style={fVal}>{fmtDate(req.data_envio)}</span></div>
          {req.membro_nome && (
            <div style={field}>
              <span style={fLabel}>Membro Referenciado</span>
              <span style={fVal}>{req.membro_nome}{req.membro_matricula ? ` (${req.membro_matricula})` : ""}</span>
            </div>
          )}
          {req.data_resposta && (
            <div style={field}><span style={fLabel}>Data da Resposta</span><span style={fVal}>{fmtDate(req.data_resposta)}</span></div>
          )}
        </div>

        {/* Descrição */}
        <h3 style={secTitle}>Descrição / Solicitação</h3>
        <div style={{ fontSize: 13, color: "var(--color-text-primary)", lineHeight: 1.7, padding: "12px 16px", background: "#f8fafc", borderRadius: 10, marginBottom: 16 }}>
          {req.descricao}
        </div>

        {/* Resposta */}
        {req.resposta && (
          <>
            <h3 style={{ ...secTitle, color: situacao === "APROVADO" ? "#16a34a" : "#dc2626" }}>
              Resposta — {REQUISITION_SITUACAO_LABELS[situacao]}
            </h3>
            <div style={{ fontSize: 13, color: "var(--color-text-primary)", lineHeight: 1.7, padding: "12px 16px", background: situacao === "APROVADO" ? "#f0fdf4" : "#fef2f2", border: `1px solid ${situacao === "APROVADO" ? "#bbf7d0" : "#fca5a5"}`, borderRadius: 10 }}>
              {req.resposta}
            </div>
          </>
        )}
      </div>

      {/* Modal de resposta */}
      {showResp && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "var(--color-surface)", borderRadius: 14, padding: "24px 26px 20px", width: "100%", maxWidth: 500, boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
            <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 900 }}>Responder Requerimento</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Decisão</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {(["APROVADO","REJEITADO"] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setRespSit(s)}
                      style={{
                        flex: 1, padding: "10px 0", borderRadius: 8, border: `2px solid ${respSit === s ? (s === "APROVADO" ? "#16a34a" : "#dc2626") : "var(--color-border)"}`,
                        background: respSit === s ? (s === "APROVADO" ? "#f0fdf4" : "#fef2f2") : "transparent",
                        color: respSit === s ? (s === "APROVADO" ? "#16a34a" : "#dc2626") : "var(--color-text-muted)",
                        fontWeight: 800, fontSize: 13, cursor: "pointer",
                      }}
                    >
                      {s === "APROVADO" ? "✓ Aprovar" : "✕ Rejeitar"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Resposta *</label>
                <textarea value={resposta} onChange={e => setResposta(e.target.value)} style={{ ...inputS, minHeight: 100, resize: "vertical" }} placeholder="Descreva a decisão e motivo…" autoFocus />
              </div>
            </div>

            {error && <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 8, background: "#fef2f2", color: "#dc2626", fontSize: 13 }}>⚠ {error}</div>}

            <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowResp(false); setError(null); }} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--color-text-muted)" }}>
                Cancelar
              </button>
              <button
                onClick={handleResponder}
                disabled={pending || !resposta.trim()}
                style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: respSit === "APROVADO" ? "#16a34a" : "#dc2626", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: pending || !resposta.trim() ? 0.7 : 1 }}
              >
                {pending ? "Salvando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
