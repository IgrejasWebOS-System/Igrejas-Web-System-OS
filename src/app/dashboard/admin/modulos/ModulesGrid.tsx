"use client";

import { useState, useTransition } from "react";
import { toggleModuloAction } from "./actions";

// ─── Configuração dos módulos ────────────────────────────────────────────────
const MODULES_CONFIG = [
  {
    key: "membros",
    label: "Membros",
    desc: "Cadastro completo de membros, ficha eclesial, situação, histórico e transferências.",
    fase: "Fase 2",
    color: "#4A7DB5",
    icon: (
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    key: "financeiro",
    label: "Financeiro",
    desc: "Plano de contas, lançamentos, fluxo de caixa, orçamento e relatórios contábeis.",
    fase: "Fase 7",
    color: "#16a34a",
    icon: (
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
  },
  {
    key: "escola",
    label: "Escola Teológica",
    desc: "Semestres, disciplinas, matrículas, notas, frequência e boletim do aluno.",
    fase: "Fase 5",
    color: "#7c3aed",
    icon: (
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
        <path d="M6 12v5c3 3 9 3 12 0v-5"/>
      </svg>
    ),
  },
  {
    key: "cursos",
    label: "Cursos Livres",
    desc: "Catálogo de cursos, inscrições de participantes e emissão de certificados.",
    fase: "Fase 6",
    color: "#d97706",
    icon: (
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
    ),
  },
  {
    key: "ebd",
    label: "EBD",
    desc: "Turmas da Escola Bíblica Dominical, chamada semanal e relatório de frequência.",
    fase: "Fase 4",
    color: "#0f766e",
    icon: (
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      </svg>
    ),
  },
  {
    key: "secretaria",
    label: "Secretaria",
    desc: "Emissão de documentos eclesiásticos: declarações, certidões, cartas e ofícios em PDF.",
    fase: "Fase 3",
    color: "#475569",
    icon: (
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
  {
    key: "patrimonio",
    label: "Patrimônio",
    desc: "Inventário de bens por unidade, depreciação automática e movimentação entre igrejas.",
    fase: "Fase 9",
    color: "#b45309",
    icon: (
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
      </svg>
    ),
  },
  {
    key: "eventos",
    label: "Eventos",
    desc: "Calendário, tipos de evento, inscrições com controle de vagas e check-in.",
    fase: "Fase 8",
    color: "#be185d",
    icon: (
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    key: "ocorrencias",
    label: "Ocorrências",
    desc: "Registro pastoral sensível com severidade, fluxo de aprovação e acesso restrito a N2+.",
    fase: "Fase 10",
    color: "#dc2626",
    icon: (
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  },
] as const;

// ─── Props ───────────────────────────────────────────────────────────────────
type ModuleKey = typeof MODULES_CONFIG[number]["key"];

interface Props {
  activeModules: ModuleKey[];
  ministryName: string;
  toggleAction: (module: string, is_active: boolean) => Promise<{ error?: string }>;
}

// ─── Toggle Switch ───────────────────────────────────────────────────────────
function ToggleSwitch({
  on,
  color,
  pending,
  onClick,
}: {
  on: boolean;
  color: string;
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-label={on ? "Desativar módulo" : "Ativar módulo"}
      style={{
        width: 48,
        height: 26,
        borderRadius: 99,
        background: on ? color : "#e2e8f0",
        border: "none",
        cursor: pending ? "not-allowed" : "pointer",
        position: "relative",
        flexShrink: 0,
        transition: "background .2s",
        opacity: pending ? 0.6 : 1,
        outline: "none",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: on ? 25 : 3,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 4px rgba(0,0,0,.25)",
          transition: "left .2s",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {pending && (
          <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth={3}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round"/>
          </svg>
        )}
      </span>
    </button>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ModulesGrid({ activeModules, ministryName, toggleAction }: Props) {
  const [active, setActive] = useState<Set<string>>(new Set(activeModules));
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleToggle(key: string) {
    if (isPending) return;
    const nextValue = !active.has(key);
    setPendingKey(key);
    setErrorMsg(null);

    // Optimistic update
    setActive(prev => {
      const next = new Set(prev);
      nextValue ? next.add(key) : next.delete(key);
      return next;
    });

    startTransition(async () => {
      const result = await toggleAction(key, nextValue);
      if (result?.error) {
        // Reverter em caso de erro
        setActive(prev => {
          const next = new Set(prev);
          nextValue ? next.delete(key) : next.add(key);
          return next;
        });
        setErrorMsg(`Erro ao atualizar módulo "${key}": ${result.error}`);
      }
      setPendingKey(null);
    });
  }

  const totalAtivos = active.size;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Stats ───────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16,
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 10, padding: "12px 18px",
        flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: "#f0fdf4", border: "1px solid #bbf7d0",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 900, color: "#16a34a",
          }}>
            {totalAtivos}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)" }}>
              de 9 módulos ativos
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{ministryName}</div>
          </div>
        </div>

        {/* Barra de progresso visual */}
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{
            height: 6, background: "var(--color-border)", borderRadius: 99, overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              width: `${(totalAtivos / 9) * 100}%`,
              background: "linear-gradient(90deg, #16a34a, #22c55e)",
              borderRadius: 99,
              transition: "width .3s",
            }} />
          </div>
        </div>

        <div style={{
          fontSize: 11, color: "var(--color-text-muted)",
          background: "var(--color-bg-2)",
          border: "1px solid var(--color-border)",
          borderRadius: 6, padding: "4px 10px",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Mudanças refletem no próximo login
        </div>
      </div>

      {/* ── Erro global ─────────────────────────────────────────── */}
      {errorMsg && (
        <div style={{
          background: "#fff5f5", border: "1px solid #fca5a5",
          borderRadius: 8, padding: "10px 14px",
          fontSize: 13, color: "#dc2626", fontWeight: 600,
        }}>
          ⚠ {errorMsg}
        </div>
      )}

      {/* ── Grid de módulos ─────────────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 14,
      }}>
        {MODULES_CONFIG.map((mod) => {
          const isOn = active.has(mod.key);
          const isThisPending = pendingKey === mod.key && isPending;

          return (
            <div
              key={mod.key}
              style={{
                background: "var(--color-surface)",
                border: `1.5px solid ${isOn ? `${mod.color}40` : "var(--color-border)"}`,
                borderRadius: 12,
                padding: "18px 18px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                transition: "border-color .2s, box-shadow .2s",
                boxShadow: isOn ? `0 2px 12px ${mod.color}18` : "none",
                opacity: isThisPending ? 0.75 : 1,
              }}
            >
              {/* Topo: ícone + label + toggle */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: isOn ? `${mod.color}15` : "#f1f5f9",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: isOn ? mod.color : "#94a3b8",
                  transition: "background .2s, color .2s",
                }}>
                  {mod.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 800,
                    color: isOn ? "var(--color-text-primary)" : "var(--color-text-muted)",
                    transition: "color .2s",
                  }}>
                    {mod.label}
                  </div>
                  <div style={{
                    fontSize: 10, fontWeight: 700,
                    color: isOn ? mod.color : "#94a3b8",
                    textTransform: "uppercase", letterSpacing: ".05em",
                    transition: "color .2s",
                  }}>
                    {mod.fase}
                  </div>
                </div>
                <ToggleSwitch
                  on={isOn}
                  color={mod.color}
                  pending={isThisPending}
                  onClick={() => handleToggle(mod.key)}
                />
              </div>

              {/* Descrição */}
              <p style={{
                fontSize: 12.5,
                color: isOn ? "var(--color-text-muted)" : "#94a3b8",
                lineHeight: 1.5,
                margin: 0,
                transition: "color .2s",
              }}>
                {mod.desc}
              </p>

              {/* Badge de status */}
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "5px 10px",
                background: isOn ? `${mod.color}10` : "#f8fafc",
                border: `1px solid ${isOn ? `${mod.color}30` : "var(--color-border)"}`,
                borderRadius: 6,
                width: "fit-content",
                transition: "all .2s",
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: isOn ? mod.color : "#cbd5e1",
                  transition: "background .2s",
                }} />
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  color: isOn ? mod.color : "#94a3b8",
                  transition: "color .2s",
                }}>
                  {isOn ? "Ativo" : "Inativo"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
