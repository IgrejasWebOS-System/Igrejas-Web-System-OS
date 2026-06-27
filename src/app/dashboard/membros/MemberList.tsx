"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { MemberListItem, MemberLookups, SessionContext, MemberSituacao } from "@/types";
import { listarMembros } from "./actions";
import { maskCpf } from "@/utils/privacy"; // SEC-8: LGPD — CPF mascarado em listagens

const SITUACAO_CONFIG: Record<MemberSituacao, { label: string; bg: string; color: string }> = {
  ATIVO:        { label: "Ativo",         bg: "#dcfce7", color: "#166534" },
  INATIVO:      { label: "Inativo",       bg: "#f1f5f9", color: "#475569" },
  EM_OBSERVACAO:{ label: "Em Observação", bg: "#fef3c7", color: "#92400e" },
  SUSPENSO:     { label: "Suspenso",      bg: "#fee2e2", color: "#991b1b" },
  DESLIGADO:    { label: "Desligado",     bg: "#fce7f3", color: "#9d174d" },
};

const PER_PAGE_OPTIONS = [25, 50, 100];

type Props = {
  initialData: MemberListItem[];
  total: number;
  page: number;
  lookups: MemberLookups | null;
  initialBusca: string;
  initialSituacao: string;
  initialCargoId: string;
  initialUnitId: string;
  initialGenderId: string;
  initialCivilStatusId: string;
  initialPerPage: number;
  ctx: SessionContext;
};

export default function MemberList({
  initialData,
  total,
  page,
  lookups,
  initialBusca,
  initialSituacao,
  initialCargoId,
  initialUnitId,
  initialGenderId,
  initialCivilStatusId,
  initialPerPage,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [data, setData] = useState<MemberListItem[]>(initialData);
  const [totalCount, setTotalCount] = useState(total);
  const [currentPage, setCurrentPage] = useState(page);

  const [busca, setBusca] = useState(initialBusca);
  const [situacao, setSituacao] = useState<string>(initialSituacao);
  const [cargoId, setCargoId] = useState<string>(initialCargoId);
  const [unitId, setUnitId] = useState<string>(initialUnitId);
  const [genderId, setGenderId] = useState<string>(initialGenderId);
  const [civilStatusId, setCivilStatusId] = useState<string>(initialCivilStatusId);
  const [perPage, setPerPage] = useState<number>(initialPerPage);
  const [showMoreFilters, setShowMoreFilters] = useState(!!(initialGenderId || initialCivilStatusId));

  const totalPages = Math.ceil(totalCount / perPage);

  const buscarMembros = useCallback(
    (overrides: Partial<{ busca: string; situacao: string; cargoId: string; unitId: string; genderId: string; civilStatusId: string; perPage: number; page: number }> = {}) => {
      const pp = overrides.perPage ?? perPage;
      const params = {
        busca: overrides.busca ?? busca,
        situacao: (overrides.situacao ?? situacao) as MemberSituacao | "",
        cargo_id: overrides.cargoId ?? cargoId,
        unit_id: overrides.unitId ?? unitId,
        gender_id: overrides.genderId ?? genderId,
        civil_status_id: overrides.civilStatusId ?? civilStatusId,
        page: overrides.page ?? currentPage,
        per_page: pp,
      };

      startTransition(async () => {
        const result = await listarMembros(params);
        setData(result.data);
        setTotalCount(result.total);
        if (overrides.page !== undefined) setCurrentPage(overrides.page);
      });
    },
    [busca, situacao, cargoId, unitId, genderId, civilStatusId, perPage, currentPage],
  );

  function handleBuscaChange(v: string) {
    setBusca(v);
    buscarMembros({ busca: v, page: 1 });
  }

  function handleFiltroChange(key: string, v: string) {
    if (key === "situacao")      { setSituacao(v);      buscarMembros({ situacao: v, page: 1 }); }
    if (key === "cargoId")       { setCargoId(v);       buscarMembros({ cargoId: v, page: 1 }); }
    if (key === "unitId")        { setUnitId(v);        buscarMembros({ unitId: v, page: 1 }); }
    if (key === "genderId")      { setGenderId(v);      buscarMembros({ genderId: v, page: 1 }); }
    if (key === "civilStatusId") { setCivilStatusId(v); buscarMembros({ civilStatusId: v, page: 1 }); }
  }

  function handlePerPageChange(v: number) {
    setPerPage(v);
    setCurrentPage(1);
    buscarMembros({ perPage: v, page: 1 });
  }

  function abrirFicha(partyId: string) {
    router.push(`/dashboard/membros/${partyId}`);
  }

  const inputStyle: React.CSSProperties = {
    border: "1px solid var(--color-border)",
    borderRadius: 8, padding: "8px 12px",
    fontSize: 13, color: "var(--color-text-primary)",
    background: "var(--color-surface)",
    outline: "none", width: "100%",
  };

  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Filtros */}
      <div style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 10, padding: "14px 16px",
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        {/* Linha 1: busca + filtros principais */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 180px 180px", gap: 10 }}>
          {/* Busca */}
          <div style={{ position: "relative" }}>
            <svg
              width={15} height={15} viewBox="0 0 24 24" fill="none"
              stroke="var(--color-text-muted)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
            >
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              value={busca}
              onChange={e => handleBuscaChange(e.target.value)}
              placeholder="Buscar por nome, CPF ou matrícula..."
              style={{ ...inputStyle, paddingLeft: 32 }}
            />
          </div>

          {/* Situação */}
          <select value={situacao} onChange={e => handleFiltroChange("situacao", e.target.value)} style={selectStyle}>
            <option value="">Situação</option>
            {Object.entries(SITUACAO_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          {/* Cargo */}
          <select value={cargoId} onChange={e => handleFiltroChange("cargoId", e.target.value)} style={selectStyle}>
            <option value="">Cargo</option>
            {(lookups?.cargos ?? []).map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>

          {/* Unidade */}
          <select value={unitId} onChange={e => handleFiltroChange("unitId", e.target.value)} style={selectStyle}>
            <option value="">Unidade</option>
            {(lookups?.units ?? [])
              .filter(u => ["IGREJA", "SUB_CONGREGACAO", "PONTO_PREGACAO", "CELULA"].includes(u.unit_type))
              .map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
          </select>
        </div>

        {/* Linha 2: mais filtros (expansível) */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => setShowMoreFilters(v => !v)}
            style={{
              border: "1px solid var(--color-border)", borderRadius: 7,
              padding: "5px 12px", fontSize: 12, fontWeight: 600,
              color: showMoreFilters ? "var(--color-primary)" : "var(--color-text-muted)",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
              background: showMoreFilters ? "var(--color-primary-light)" : "transparent",
            } as React.CSSProperties}
          >
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
            </svg>
            Mais filtros
          </button>
          {showMoreFilters && (
            <>
              <select value={genderId} onChange={e => handleFiltroChange("genderId", e.target.value)} style={{ ...selectStyle, width: 160 }}>
                <option value="">Sexo</option>
                {(lookups?.genders ?? []).map(g => (
                  <option key={g.id} value={g.id}>{g.nome}</option>
                ))}
              </select>
              <select value={civilStatusId} onChange={e => handleFiltroChange("civilStatusId", e.target.value)} style={{ ...selectStyle, width: 180 }}>
                <option value="">Estado Civil</option>
                {(lookups?.civil_statuses ?? []).map(cs => (
                  <option key={cs.id} value={cs.id}>{cs.nome}</option>
                ))}
              </select>
            </>
          )}
          {/* Per page */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-text-muted)" }}>
            <span>Exibir</span>
            <select
              value={perPage}
              onChange={e => handlePerPageChange(Number(e.target.value))}
              style={{ ...selectStyle, width: 70, padding: "6px 8px" }}
            >
              {PER_PAGE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span>por página</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--color-text-muted)" }}>
        {pending ? (
          <span>Buscando...</span>
        ) : (
          <>
            <span>{totalCount} membro{totalCount !== 1 ? "s" : ""}</span>
            {(busca || situacao || cargoId || unitId || genderId || civilStatusId) && (
              <button
                onClick={() => {
                  setBusca(""); setSituacao(""); setCargoId(""); setUnitId("");
                  setGenderId(""); setCivilStatusId("");
                  buscarMembros({ busca: "", situacao: "", cargoId: "", unitId: "", genderId: "", civilStatusId: "", page: 1 });
                }}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 12, color: "var(--color-primary)", fontWeight: 600,
                  padding: "0 4px",
                }}
              >
                × Limpar filtros
              </button>
            )}
          </>
        )}
      </div>

      {/* Tabela */}
      <div style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 12, overflow: "hidden",
        opacity: pending ? 0.6 : 1,
        transition: "opacity 0.15s",
      }}>
        {data.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--color-text-muted)" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>👤</div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Nenhum membro encontrado</div>
            <div style={{ fontSize: 12 }}>
              {busca || situacao || cargoId || unitId
                ? "Tente ajustar os filtros de busca."
                : "Cadastre o primeiro membro clicando em 'Novo Membro'."}
            </div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F7FAFD", borderBottom: "1px solid var(--color-border)" }}>
                <th style={thStyle}>Membro</th>
                <th style={thStyle}>Matrícula</th>
                <th style={thStyle}>Cargo</th>
                <th style={thStyle}>Unidade</th>
                <th style={thStyle}>Situação</th>
                <th style={thStyle}>Ingresso</th>
                <th style={{ ...thStyle, width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {data.map((m, i) => {
                const sit = SITUACAO_CONFIG[m.situacao] ?? SITUACAO_CONFIG.EM_OBSERVACAO;
                return (
                  <tr
                    key={m.pm_id}
                    onClick={() => abrirFicha(m.party_id)}
                    style={{
                      cursor: "pointer",
                      borderBottom: i < data.length - 1 ? "1px solid var(--color-border)" : "none",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#F7FAFD")}
                    onMouseLeave={e => (e.currentTarget.style.background = "")}
                  >
                    {/* Foto + nome */}
                    <td style={tdStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: "50%",
                          background: "var(--color-primary-light)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 13, fontWeight: 800, color: "var(--color-primary)",
                          flexShrink: 0, overflow: "hidden",
                        }}>
                          {m.photo_url ? (
                            <img src={m.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            m.full_name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--color-text-primary)" }}>
                            {m.full_name}
                          </div>
                          {m.cpf && (
                            <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                              CPF: {maskCpf(m.cpf)}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Matrícula */}
                    <td style={tdStyle}>
                      {m.matricula ? (
                        <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "var(--color-primary)" }}>
                          {m.matricula}
                        </span>
                      ) : m.codigo_provisorio ? (
                        <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--color-text-muted)" }}>
                          {m.codigo_provisorio}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: "#cbd5e1" }}>—</span>
                      )}
                    </td>

                    {/* Cargo */}
                    <td style={tdStyle}>
                      <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                        {m.cargo_nome ?? "Membro"}
                      </span>
                    </td>

                    {/* Unidade */}
                    <td style={tdStyle}>
                      <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                        {m.unit_name ?? "—"}
                      </span>
                    </td>

                    {/* Situação */}
                    <td style={tdStyle}>
                      <span style={{
                        display: "inline-block",
                        padding: "2px 10px", borderRadius: 99,
                        fontSize: 11, fontWeight: 700,
                        background: sit.bg, color: sit.color,
                      }}>
                        {sit.label}
                      </span>
                    </td>

                    {/* Data ingresso */}
                    <td style={{ ...tdStyle, fontSize: 12, color: "var(--color-text-muted)" }}>
                      {m.data_ingresso
                        ? new Date(m.data_ingresso + "T00:00:00").toLocaleDateString("pt-BR")
                        : "—"}
                    </td>

                    {/* Chevron */}
                    <td style={{ ...tdStyle, textAlign: "right", paddingRight: 14 }}>
                      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          fontSize: 13,
        }}>
          <button
            onClick={() => { setCurrentPage(p => p - 1); buscarMembros({ page: currentPage - 1 }); }}
            disabled={currentPage <= 1 || pending}
            style={paginationBtnStyle(currentPage <= 1)}
          >
            ← Anterior
          </button>
          <span style={{ color: "var(--color-text-muted)", minWidth: 100, textAlign: "center" }}>
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={() => { setCurrentPage(p => p + 1); buscarMembros({ page: currentPage + 1 }); }}
            disabled={currentPage >= totalPages || pending}
            style={paginationBtnStyle(currentPage >= totalPages)}
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "10px 14px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 800,
  color: "var(--color-text-muted)",
  textTransform: "uppercase",
  letterSpacing: ".04em",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "11px 14px",
  fontSize: 13,
  verticalAlign: "middle",
};

function paginationBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "7px 14px",
    borderRadius: 7,
    border: "1px solid var(--color-border)",
    background: disabled ? "#f8fafc" : "var(--color-surface)",
    color: disabled ? "#cbd5e1" : "var(--color-primary)",
    fontWeight: 600,
    fontSize: 13,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}
