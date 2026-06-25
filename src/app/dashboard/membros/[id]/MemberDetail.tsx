"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MemberFull, MemberLookups, SessionContext, MemberSituacao, ScopeType, MemberBankAccount } from "@/types";
import MemberForm from "../MemberForm";
import FuncaoModal from "./FuncaoModal";
import DependenteModal from "./DependenteModal";
import TransferenciaModal from "./TransferenciaModal";
import { isSafeImageUrl } from "@/utils/privacy"; // SEC-9
import BankAccountsTab from "./bank-accounts/BankAccountsTab";

const SITUACAO_CONFIG: Record<MemberSituacao, { label: string; bg: string; color: string; dot: string }> = {
  ATIVO:         { label: "Ativo",          bg: "#dcfce7", color: "#166534", dot: "#16a34a" },
  INATIVO:       { label: "Inativo",        bg: "#f1f5f9", color: "#475569", dot: "#94a3b8" },
  EM_OBSERVACAO: { label: "Em Observação",  bg: "#fef3c7", color: "#92400e", dot: "#d97706" },
  SUSPENSO:      { label: "Suspenso",       bg: "#fee2e2", color: "#991b1b", dot: "#dc2626" },
  DESLIGADO:     { label: "Desligado",      bg: "#fce7f3", color: "#9d174d", dot: "#be185d" },
};

const SCOPE_LABEL: Record<string, string> = {
  CAMPO: "Campo", SETOR: "Setor", IGREJA: "Igreja",
  SUB_CONGREGACAO: "Sub-Congregação", PONTO_PREGACAO: "Ponto de Pregação", CELULA: "Célula",
};

type Tab = "dados" | "eclesial" | "funcoes" | "dependentes" | "bancario" | "historico" | "editar";

type Props = {
  member: MemberFull;
  lookups: MemberLookups | null;
  ctx: SessionContext;
  contasBancarias: MemberBankAccount[];
  updateAction: (partyId: string, fd: FormData) => Promise<{ error?: string }>;
  alterarSituacaoAction: (partyId: string, sit: MemberSituacao, motivo: string) => Promise<{ error?: string }>;
  criarFuncaoAction: (partyId: string, payload: {
    department_id: string; funcao_id?: string; scope_type: ScopeType;
    unit_id?: string; data_inicio?: string; observacoes?: string;
  }) => Promise<{ error?: string }>;
  encerrarFuncaoAction: (partyId: string, funcaoId: string) => Promise<{ error?: string }>;
  criarDependenteAction: (responsiblePartyId: string, payload: {
    full_name: string; birth_date?: string; relationship: "FILHO" | "TUTELADO";
    data_apresentacao?: string; observacoes?: string;
  }) => Promise<{ error?: string }>;
  transferirMembroAction: (partyId: string, payload: {
    unit_destino_id: string; tipo: "INTRA" | "INTER" | "DESLIGAMENTO" | "RETORNO";
    data_transferencia?: string; obs?: string;
  }) => Promise<{ error?: string }>;
};

export default function MemberDetail({
  member, lookups, ctx, contasBancarias,
  updateAction, alterarSituacaoAction,
  criarFuncaoAction, encerrarFuncaoAction,
  criarDependenteAction, transferirMembroAction,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>("dados");

  // Modais
  const [showSitModal, setShowSitModal] = useState(false);
  const [showFuncaoModal, setShowFuncaoModal] = useState(false);
  const [showDependenteModal, setShowDependenteModal] = useState(false);
  const [showTransfModal, setShowTransfModal] = useState(false);

  // Situação modal state
  const [novaSit, setNovaSit] = useState<MemberSituacao>("ATIVO");
  const [motivoSit, setMotivoSit] = useState("");
  const [sitError, setSitError] = useState<string | null>(null);

  // Encerrar função
  const [encerrando, setEncerrando] = useState<string | null>(null);

  const pm = member.party_members;
  const sit = SITUACAO_CONFIG[pm.situacao] ?? SITUACAO_CONFIG.EM_OBSERVACAO;
  const initials = member.full_name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
  const funcoesAtivas = member.party_funcoes.filter(f => f.is_ativo);

  function formatDate(d: string | null) {
    if (!d) return "—";
    return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
  }

  function handleAlterarSituacao() {
    setSitError(null);
    startTransition(async () => {
      const result = await alterarSituacaoAction(member.id, novaSit, motivoSit);
      if (result.error) { setSitError(result.error); return; }
      setShowSitModal(false);
      router.refresh();
    });
  }

  function handleEncerrarFuncao(funcaoId: string) {
    setEncerrando(funcaoId);
    startTransition(async () => {
      await encerrarFuncaoAction(member.id, funcaoId);
      setEncerrando(null);
      router.refresh();
    });
  }

  function abrirPDF() {
    window.open(`/api/membros/${member.id}/pdf`, "_blank");
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "dados",       label: "Dados Pessoais" },
    { key: "eclesial",    label: "Ficha Eclesial" },
    { key: "funcoes",     label: `Funções (${funcoesAtivas.length})` },
    { key: "dependentes", label: `Dependentes (${member.party_dependents.length})` },
    { key: "bancario",    label: "Dados Bancários" },
    { key: "historico",   label: "Histórico" },
    { key: "editar",      label: "✏ Editar" },
  ];

  const fS: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 3 };
  const fLabel: React.CSSProperties = { fontSize: 10, fontWeight: 800, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: ".06em" };
  const fValue: React.CSSProperties = { fontSize: 13, color: "var(--color-text-primary)", fontWeight: 500 };
  const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 24px" };
  const grid3: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px 24px" };
  const secTitle: React.CSSProperties = { fontSize: 11, fontWeight: 800, color: "var(--color-primary)", textTransform: "uppercase", letterSpacing: ".06em", margin: "20px 0 12px", paddingBottom: 6, borderBottom: "1px solid var(--color-border)" };
  const inputS: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 13, color: "var(--color-text-primary)", background: "var(--color-surface)", outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 860 }}>

      {/* Modais */}
      {showFuncaoModal && (
        <FuncaoModal
          partyId={member.id}
          lookups={lookups}
          onClose={() => { setShowFuncaoModal(false); router.refresh(); }}
          createAction={criarFuncaoAction}
        />
      )}
      {showDependenteModal && (
        <DependenteModal
          partyId={member.id}
          onClose={() => { setShowDependenteModal(false); router.refresh(); }}
          createAction={criarDependenteAction}
        />
      )}
      {showTransfModal && (
        <TransferenciaModal
          partyId={member.id}
          currentUnitId={pm.unit_id}
          units={lookups?.units ?? []}
          onClose={() => { setShowTransfModal(false); router.refresh(); }}
          transferAction={transferirMembroAction}
        />
      )}

      {/* Voltar */}
      <a href="/dashboard/membros" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--color-text-muted)", textDecoration: "none" }}>
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Membros
      </a>

      {/* Header da ficha */}
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 14, padding: "20px 24px", display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
        {/* Avatar */}
        <div style={{ width: 68, height: 68, borderRadius: "50%", background: "var(--color-primary-light)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900, color: "var(--color-primary)", flexShrink: 0, overflow: "hidden", border: `3px solid ${sit.dot}` }}>
          {pm.foto_url && isSafeImageUrl(pm.foto_url) ? <img src={pm.foto_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 19, fontWeight: 900, margin: "0 0 5px", color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>
            {member.full_name}
          </h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <span style={{ padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: sit.bg, color: sit.color }}>{sit.label}</span>
            {pm.matricula && <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "var(--color-primary)" }}>#{pm.matricula}</span>}
            {!pm.matricula && pm.codigo_provisorio && <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--color-text-muted)" }}>Prov: {pm.codigo_provisorio}</span>}
            {(pm as any).member_cargos && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>· {(pm as any).member_cargos.nome}</span>}
            {(pm as any).units && <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>· {(pm as any).units.name}</span>}
          </div>
        </div>

        {/* Ações do header */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {/* PDF */}
          <button
            onClick={abrirPDF}
            style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-primary)", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
          >
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            PDF
          </button>

          {/* Transferir */}
          {ctx.level <= 2 && (
            <button
              onClick={() => setShowTransfModal(true)}
              style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-primary)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              Transferir
            </button>
          )}

          {/* Alterar situação */}
          {ctx.level <= 2 && (
            <button
              onClick={() => { setNovaSit(pm.situacao); setShowSitModal(true); }}
              style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-primary)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              Alterar Situação
            </button>
          )}
        </div>
      </div>

      {/* Abas */}
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "flex", overflowX: "auto", background: "#f8fafc", borderBottom: "1px solid var(--color-border)" }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: "12px 18px", border: "none", background: "none", fontSize: 12.5, fontWeight: tab === t.key ? 800 : 500, color: tab === t.key ? "var(--color-primary)" : "var(--color-text-muted)", borderBottom: tab === t.key ? "2px solid var(--color-primary)" : "2px solid transparent", cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap" }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: 24 }}>

          {/* ABA: DADOS PESSOAIS */}
          {tab === "dados" && (
            <div>
              <div style={grid2}>
                <div style={fS}><span style={fLabel}>CPF</span><span style={fValue}>{member.cpf ? member.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : "—"}</span></div>
                <div style={fS}><span style={fLabel}>RG</span><span style={fValue}>{member.rg ?? "—"}</span></div>
                <div style={fS}><span style={fLabel}>Data de Nascimento</span><span style={fValue}>{formatDate(member.birth_date)}</span></div>
                <div style={fS}><span style={fLabel}>Gênero</span><span style={fValue}>{(pm as any).member_genders?.nome ?? "—"}</span></div>
                <div style={fS}><span style={fLabel}>Estado Civil</span><span style={fValue}>{(pm as any).member_civil_status?.nome ?? "—"}</span></div>
                <div style={fS}><span style={fLabel}>Escolaridade</span><span style={fValue}>{(pm as any).member_schooling?.nome ?? "—"}</span></div>
                <div style={fS}><span style={fLabel}>Profissão</span><span style={fValue}>{(pm as any).member_professions?.nome ?? "—"}</span></div>
                <div style={fS}><span style={fLabel}>Situação Financeira</span><span style={fValue}>{(pm as any).member_financial_status?.nome ?? "—"}</span></div>
                <div style={fS}><span style={fLabel}>Nome da Mãe</span><span style={fValue}>{member.mother_name ?? "—"}</span></div>
                <div style={fS}><span style={fLabel}>Nome do Pai</span><span style={fValue}>{member.father_name ?? "—"}</span></div>
              </div>
              {member.party_addresses.length > 0 && (
                <>
                  <p style={secTitle}>Endereço</p>
                  {member.party_addresses.map(addr => (
                    <div key={addr.id} style={grid3}>
                      <div style={{ ...fS, gridColumn: "1 / -1" }}><span style={fLabel}>Logradouro</span><span style={fValue}>{[addr.logradouro, addr.numero, addr.complemento].filter(Boolean).join(", ") || "—"}</span></div>
                      <div style={fS}><span style={fLabel}>Bairro</span><span style={fValue}>{addr.bairro ?? "—"}</span></div>
                      <div style={fS}><span style={fLabel}>Cidade / UF</span><span style={fValue}>{[addr.cidade, addr.estado].filter(Boolean).join(" / ") || "—"}</span></div>
                      <div style={fS}><span style={fLabel}>CEP</span><span style={fValue}>{addr.cep ? addr.cep.replace(/(\d{5})(\d{3})/, "$1-$2") : "—"}</span></div>
                    </div>
                  ))}
                </>
              )}
              <p style={secTitle}>Contato</p>
              <div style={grid3}>
                <div style={fS}><span style={fLabel}>Celular</span><span style={fValue}>{pm.celular ?? "—"}</span></div>
                <div style={fS}><span style={fLabel}>WhatsApp</span><span style={fValue}>{pm.whatsapp ?? "—"}</span></div>
                <div style={fS}><span style={fLabel}>E-mail</span><span style={fValue}>{member.email ?? "—"}</span></div>
              </div>
            </div>
          )}

          {/* ABA: FICHA ECLESIAL */}
          {tab === "eclesial" && (
            <div>
              <div style={grid3}>
                <div style={fS}><span style={fLabel}>Cargo Eclesiástico</span><span style={fValue}>{(pm as any).member_cargos?.nome ?? "Membro"}</span></div>
                <div style={fS}><span style={fLabel}>Situação</span>
                  <span><span style={{ padding: "2px 10px", borderRadius: 99, background: sit.bg, color: sit.color, fontSize: 11, fontWeight: 700 }}>{sit.label}</span></span>
                </div>
                <div style={fS}><span style={fLabel}>Unidade</span><span style={fValue}>{(pm as any).units?.name ?? "—"}</span></div>
                <div style={fS}><span style={fLabel}>Matrícula</span><span style={{ ...fValue, fontFamily: "monospace", fontWeight: 700, color: "var(--color-primary)" }}>{pm.matricula ?? "—"}</span></div>
                <div style={fS}><span style={fLabel}>Código Provisório</span><span style={{ ...fValue, fontFamily: "monospace" }}>{pm.codigo_provisorio ?? "—"}</span></div>
                <div style={fS}><span style={fLabel}>Matrícula Legado</span><span style={{ ...fValue, fontFamily: "monospace" }}>{pm.matricula_legado ?? "—"}</span></div>
                <div style={fS}><span style={fLabel}>Data de Ingresso</span><span style={fValue}>{formatDate(pm.data_ingresso)}</span></div>
                <div style={fS}><span style={fLabel}>Batismo nas Águas</span><span style={fValue}>{formatDate(pm.data_batismo_aguas)}</span></div>
                <div style={fS}><span style={fLabel}>Batismo no Espírito</span><span style={fValue}>{formatDate(pm.data_batismo_espirito)}</span></div>
                <div style={fS}><span style={fLabel}>Igreja de Origem</span><span style={fValue}>{pm.igreja_origem ?? "—"}</span></div>
              </div>
              {pm.observacoes && (<><p style={secTitle}>Observações</p><p style={{ fontSize: 13, color: "var(--color-text-primary)", whiteSpace: "pre-wrap" }}>{pm.observacoes}</p></>)}
            </div>
          )}

          {/* ABA: FUNÇÕES DEPARTAMENTAIS */}
          {tab === "funcoes" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{funcoesAtivas.length} função{funcoesAtivas.length !== 1 ? "ões" : ""} ativa{funcoesAtivas.length !== 1 ? "s" : ""}</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{member.party_funcoes.length - funcoesAtivas.length} encerrada{member.party_funcoes.length - funcoesAtivas.length !== 1 ? "s" : ""}</div>
                </div>
                {ctx.level <= 2 && (
                  <button onClick={() => setShowFuncaoModal(true)} style={{ padding: "8px 16px", borderRadius: 8, background: "var(--color-primary)", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    + Atribuir Função
                  </button>
                )}
              </div>

              {member.party_funcoes.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "var(--color-text-muted)", fontSize: 13 }}>Nenhuma função departamental registrada.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {member.party_funcoes.map(f => (
                    <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: f.is_ativo ? "#f0fdf4" : "#f8fafc", border: `1px solid ${f.is_ativo ? "#bbf7d0" : "var(--color-border)"}`, borderRadius: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: f.is_ativo ? "#16a34a" : "#cbd5e1", flexShrink: 0 }}/>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--color-text-primary)" }}>
                          {(f as any).member_funcoes_lookup?.nome ?? "Membro"} — {(f as any).departments?.nome}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
                          Escopo: {SCOPE_LABEL[f.scope_type] ?? f.scope_type}
                          {(f as any).units ? ` · ${(f as any).units.name}` : ""}
                          {f.data_inicio ? ` · desde ${formatDate(f.data_inicio)}` : ""}
                          {f.data_fim ? ` · até ${formatDate(f.data_fim)}` : ""}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: f.is_ativo ? "#dcfce7" : "#f1f5f9", color: f.is_ativo ? "#166534" : "#94a3b8" }}>
                        {f.is_ativo ? "Ativa" : "Encerrada"}
                      </span>
                      {f.is_ativo && ctx.level <= 2 && (
                        <button
                          onClick={() => handleEncerrarFuncao(f.id)}
                          disabled={encerrando === f.id}
                          style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "1px solid #fca5a5", background: "#fff", color: "#dc2626", cursor: "pointer", fontWeight: 600 }}
                        >
                          {encerrando === f.id ? "..." : "Encerrar"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ABA: DEPENDENTES */}
          {tab === "dependentes" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{member.party_dependents.length} dependente{member.party_dependents.length !== 1 ? "s" : ""}</div>
                {ctx.level <= 3 && (
                  <button onClick={() => setShowDependenteModal(true)} style={{ padding: "8px 16px", borderRadius: 8, background: "var(--color-primary)", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    + Adicionar
                  </button>
                )}
              </div>

              {member.party_dependents.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "var(--color-text-muted)", fontSize: 13 }}>Nenhum dependente registrado.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {member.party_dependents.map(d => (
                    <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "#f8fafc", border: "1px solid var(--color-border)", borderRadius: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                        {d.relationship === "FILHO" ? "👶" : "🤝"}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--color-text-primary)" }}>
                          {(d as any).parties?.full_name ?? "—"}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
                          {d.relationship === "FILHO" ? "Filho(a)" : "Tutelado(a)"}
                          {(d as any).parties?.birth_date ? ` · Nascimento: ${formatDate((d as any).parties.birth_date)}` : ""}
                          {d.data_apresentacao ? ` · Apresentado: ${formatDate(d.data_apresentacao)}` : ""}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ABA: DADOS BANCÁRIOS */}
          {tab === "bancario" && (
            <BankAccountsTab
              partyId={member.id}
              contas={contasBancarias}
              isAdmin={ctx.level <= 2}
            />
          )}

          {/* ABA: HISTÓRICO */}
          {tab === "historico" && (
            <div>
              {member.member_history.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "var(--color-text-muted)", fontSize: 13 }}>Sem histórico registrado.</div>
              ) : (
                <div style={{ position: "relative" }}>
                  <div style={{ position: "absolute", left: 15, top: 8, bottom: 8, width: 2, background: "var(--color-border)" }}/>
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {member.member_history.map((h, i) => {
                      const sitConf = SITUACAO_CONFIG[h.situacao_nova] ?? SITUACAO_CONFIG.EM_OBSERVACAO;
                      return (
                        <div key={h.id} style={{ display: "flex", gap: 20, alignItems: "flex-start", paddingBottom: i < member.member_history.length - 1 ? 20 : 0 }}>
                          <div style={{ width: 30, height: 30, borderRadius: "50%", background: sitConf.bg, border: `2px solid ${sitConf.dot}`, flexShrink: 0, position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: sitConf.dot }}/>
                          </div>
                          <div style={{ flex: 1, background: "#f8fafc", border: "1px solid var(--color-border)", borderRadius: 10, padding: "12px 16px", marginTop: 2 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 4 }}>
                                  {h.situacao_anterior
                                    ? <><span style={{ color: SITUACAO_CONFIG[h.situacao_anterior]?.color }}>{SITUACAO_CONFIG[h.situacao_anterior]?.label}</span>{" → "}<span style={{ color: sitConf.color }}>{sitConf.label}</span></>
                                    : <span>Cadastro inicial — <span style={{ color: sitConf.color }}>{sitConf.label}</span></span>}
                                </div>
                                {h.motivo && <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Motivo: {h.motivo}</div>}
                              </div>
                              <div style={{ fontSize: 11, color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                                {new Date(h.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ABA: EDITAR */}
          {tab === "editar" && (
            <MemberForm lookups={lookups} updateAction={updateAction} member={member} mode="edit" />
          )}
        </div>
      </div>

      {/* Modal Alterar Situação */}
      {showSitModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "var(--color-surface)", borderRadius: 14, padding: "28px 32px", width: "min(480px, 90vw)", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 20px", color: "var(--color-text-primary)" }}>Alterar Situação Eclesial</h2>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--color-text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".04em" }}>Nova Situação</label>
              <select value={novaSit} onChange={e => setNovaSit(e.target.value as MemberSituacao)} style={{ ...inputS, cursor: "pointer" }}>
                {Object.entries(SITUACAO_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--color-text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".04em" }}>Motivo (obrigatório)</label>
              <textarea value={motivoSit} onChange={e => setMotivoSit(e.target.value)} rows={3} placeholder="Descreva o motivo da alteração..." style={{ ...inputS, resize: "vertical" }} />
            </div>
            {sitError && <div style={{ marginBottom: 16, padding: "8px 12px", background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: 6, fontSize: 13, color: "#c53030" }}>{sitError}</div>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowSitModal(false); setSitError(null); }} disabled={pending} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-surface)", fontSize: 13, cursor: "pointer", color: "var(--color-text-muted)" }}>Cancelar</button>
              <button onClick={handleAlterarSituacao} disabled={pending || !motivoSit.trim()} style={{ padding: "9px 18px", borderRadius: 8, background: "var(--color-primary)", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: pending || !motivoSit.trim() ? "not-allowed" : "pointer", opacity: pending || !motivoSit.trim() ? 0.6 : 1 }}>
                {pending ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
