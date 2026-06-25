"use client";

import { useState, useTransition } from "react";
import type { Unit, AdminLevel } from "@/types";
import type { UsuarioComRole } from "./actions";
import UserFormModal from "./UserFormModal";

const LEVEL_LABEL: Record<AdminLevel, string> = {
  0: "Super Master",
  1: "Admin Campo",
  2: "Admin Sede",
  3: "Admin Setor",
  4: "Usuário Local",
};
const LEVEL_COLOR: Record<AdminLevel, string> = {
  0: "#ef4444",
  1: "#f97316",
  2: "#4A7DB5",
  3: "#22c55e",
  4: "#8b5cf6",
};

type Props = {
  usuarios: UsuarioComRole[];
  units: Unit[];
  currentLevel: AdminLevel;
  convidarAction:  (fd: FormData) => Promise<void>;
  atualizarAction: (id: string, fd: FormData) => Promise<void>;
  revogarAction:   (id: string) => Promise<void>;
  reativarAction:  (id: string) => Promise<void>;
};

export default function UserTable({
  usuarios, units, currentLevel,
  convidarAction, atualizarAction, revogarAction, reativarAction,
}: Props) {
  const [modal, setModal]     = useState<"invite" | "edit" | null>(null);
  const [editUser, setEditUser] = useState<UsuarioComRole | null>(null);
  const [search, setSearch]   = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("");
  const [showInactive, setShowInactive] = useState(false);
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = usuarios.filter(u => {
    if (!showInactive && !u.is_active) return false;
    if (filterLevel && String(u.level) !== filterLevel) return false;
    if (search && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalAtivos   = usuarios.filter(u => u.is_active).length;
  const totalInativos = usuarios.filter(u => !u.is_active).length;

  function handleRevoke(u: UsuarioComRole) {
    if (!confirm(`Revogar acesso de ${u.email}? O usuário não poderá mais entrar no sistema.`)) return;
    setActionError(null);
    startTransition(async () => {
      try { await revogarAction(u.role_id); }
      catch (e: unknown) { setActionError(e instanceof Error ? e.message : "Erro"); }
    });
  }

  function handleReactivate(u: UsuarioComRole) {
    setActionError(null);
    startTransition(async () => {
      try { await reativarAction(u.role_id); }
      catch (e: unknown) { setActionError(e instanceof Error ? e.message : "Erro"); }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Barra de ações ─────────────────────────────────── */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Buscar por e-mail..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: "1 1 200px", padding: "8px 12px",
            border: "1px solid var(--color-border)", borderRadius: 8,
            fontSize: 13, background: "var(--color-surface)",
            color: "var(--color-text-primary)", fontFamily: "inherit", outline: "none",
          }}
        />
        <select
          value={filterLevel}
          onChange={e => setFilterLevel(e.target.value)}
          style={{
            padding: "8px 12px", border: "1px solid var(--color-border)",
            borderRadius: 8, fontSize: 13, background: "var(--color-surface)",
            color: "var(--color-text-primary)", fontFamily: "inherit", outline: "none",
          }}
        >
          <option value="">Todos os níveis</option>
          {([1,2,3,4] as AdminLevel[]).map(l => (
            <option key={l} value={l}>{LEVEL_LABEL[l]}</option>
          ))}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--color-text-muted)", cursor: "pointer" }}>
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
          Mostrar revogados
        </label>
        <button
          onClick={() => { setEditUser(null); setModal("invite"); }}
          style={{
            marginLeft: "auto", padding: "8px 18px",
            background: "var(--color-primary)", color: "#fff",
            border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            fontFamily: "inherit",
          }}
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Convidar Usuário
        </button>
      </div>

      {/* ── Stats ──────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 10 }}>
        {[
          { label: "Total",     value: usuarios.length,  color: "#4A7DB5" },
          { label: "Ativos",    value: totalAtivos,       color: "#16a34a" },
          { label: "Revogados", value: totalInativos,     color: "#64748b" },
          { label: "Exibindo",  value: filtered.length,   color: "#7c3aed" },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, padding: "10px 14px",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 10, textAlign: "center",
          }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Erro de ação ────────────────────────────────────── */}
      {actionError && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", color: "#dc2626", fontSize: 13 }}>
          {actionError}
        </div>
      )}

      {/* ── Tabela ─────────────────────────────────────────── */}
      <div style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 12, overflow: "hidden",
      }}>
        {/* Cabeçalho */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 160px 200px 90px 80px",
          padding: "10px 16px",
          background: "#F7FAFD",
          borderBottom: "1px solid var(--color-border)",
          fontSize: 11, fontWeight: 800,
          color: "var(--color-text-muted)",
          textTransform: "uppercase", letterSpacing: "0.06em",
        }}>
          <span>E-mail</span>
          <span>Nível</span>
          <span>Unidade</span>
          <span>Status</span>
          <span style={{ textAlign: "right" }}>Ações</span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--color-text-muted)", fontSize: 13 }}>
            {usuarios.length === 0
              ? "Nenhum usuário cadastrado. Convide o primeiro usuário."
              : "Nenhum usuário encontrado com esse filtro."}
          </div>
        ) : (
          filtered.map((u, i) => {
            const color = LEVEL_COLOR[u.level];
            const canEdit = currentLevel < u.level; // só pode editar quem tem nível menor
            return (
              <div key={u.role_id} style={{
                display: "grid",
                gridTemplateColumns: "1fr 160px 200px 90px 80px",
                padding: "12px 16px",
                borderBottom: i < filtered.length - 1 ? "1px solid var(--color-border)" : "none",
                alignItems: "center",
                opacity: u.is_active ? 1 : 0.5,
                background: i % 2 === 0 ? "transparent" : "#FAFBFC",
              }}>
                {/* E-mail */}
                <span style={{ fontSize: 13, color: "var(--color-text-primary)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 12 }}>
                  {u.email}
                </span>

                {/* Nível */}
                <span>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "3px 10px", borderRadius: 99,
                    fontSize: 11, fontWeight: 700,
                    background: `${color}15`, color,
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, flexShrink: 0 }} />
                    {LEVEL_LABEL[u.level]}
                  </span>
                </span>

                {/* Unidade */}
                <span style={{ fontSize: 12, color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {u.unit_name ?? <em>—</em>}
                </span>

                {/* Status */}
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  color: u.is_active ? "#16a34a" : "#64748b",
                }}>
                  {u.is_active ? "● Ativo" : "○ Revogado"}
                </span>

                {/* Ações */}
                <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                  {canEdit && u.is_active && (
                    <button
                      onClick={() => { setEditUser(u); setModal("edit"); }}
                      title="Editar acesso"
                      style={actionBtnStyle}
                    >
                      <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  )}
                  {canEdit && (
                    u.is_active
                      ? (
                        <button
                          onClick={() => handleRevoke(u)}
                          disabled={pending}
                          title="Revogar acesso"
                          style={{ ...actionBtnStyle, color: "#dc2626" }}
                        >
                          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                          </svg>
                        </button>
                      )
                      : (
                        <button
                          onClick={() => handleReactivate(u)}
                          disabled={pending}
                          title="Reativar acesso"
                          style={{ ...actionBtnStyle, color: "#16a34a" }}
                        >
                          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </button>
                      )
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Info de permissões ─────────────────────────────── */}
      <p style={{ fontSize: 11, color: "var(--color-text-muted)", textAlign: "center" }}>
        Você (N{currentLevel}) só pode gerenciar usuários com nível maior que o seu.
        Usuários N0 são gerenciados diretamente no banco de dados.
      </p>

      {/* ── Modal ──────────────────────────────────────────── */}
      {modal && (
        <UserFormModal
          units={units}
          editUser={modal === "edit" ? editUser : null}
          onClose={() => { setModal(null); setEditUser(null); }}
          convidarAction={convidarAction}
          atualizarAction={atualizarAction}
        />
      )}
    </div>
  );
}

const actionBtnStyle: React.CSSProperties = {
  padding: "4px 6px", background: "none",
  border: "1px solid var(--color-border)", borderRadius: 6,
  cursor: "pointer", color: "var(--color-text-muted)",
  display: "flex", alignItems: "center",
};
