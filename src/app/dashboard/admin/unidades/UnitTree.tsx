"use client";

import { useState, useTransition } from "react";
import type { Unit, UnitType } from "@/types";
import UnitFormModal from "./UnitFormModal";

const TYPE_LABEL: Record<UnitType, string> = {
  CAMPO:           "Campo",
  SEDE:            "Sede",
  SETOR:           "Setor",
  IGREJA:          "Igreja",
  SUB_CONGREGACAO: "Sub-Congregação",
  PONTO_PREGACAO:  "Ponto de Pregação",
  CELULA:          "Célula",
};

const TYPE_COLOR: Record<UnitType, string> = {
  CAMPO:           "#4A7DB5",
  SEDE:            "#2E5F8A",
  SETOR:           "#7c3aed",
  IGREJA:          "#16a34a",
  SUB_CONGREGACAO: "#0f766e",  // teal — estágio consolidado
  PONTO_PREGACAO:  "#64748b",  // slate — estágio inicial
  CELULA:          "#f97316",  // laranja — reunião em casa
};

type UnitNode = Unit & { children: UnitNode[] };

function buildTree(units: Unit[]): UnitNode[] {
  const map = new Map<string, UnitNode>();
  units.forEach(u => map.set(u.id, { ...u, children: [] }));
  const roots: UnitNode[] = [];
  map.forEach(node => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  // sort by order_index then name
  function sort(nodes: UnitNode[]) {
    nodes.sort((a, b) => a.order_index - b.order_index || a.name.localeCompare(b.name));
    nodes.forEach(n => sort(n.children));
  }
  sort(roots);
  return roots;
}

type Props = {
  units: Unit[];
  canManage: boolean;
  createAction: (fd: FormData) => Promise<void>;
  updateAction: (id: string, fd: FormData) => Promise<void>;
  toggleAction: (id: string, active: boolean) => Promise<void>;
};

export default function UnitTree({ units, canManage, createAction, updateAction, toggleAction }: Props) {
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editUnit, setEditUnit] = useState<Unit | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<UnitType | "">("");
  const [showInactive, setShowInactive] = useState(false);

  const filtered = units.filter(u => {
    if (!showInactive && !u.is_active) return false;
    if (filterType && u.unit_type !== filterType) return false;
    if (search && !u.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const tree = buildTree(filtered);

  function openCreate() { setEditUnit(null); setModal("create"); }
  function openEdit(u: Unit) { setEditUnit(u); setModal("edit"); }
  function closeModal() { setModal(null); setEditUnit(null); }

  const totalActive   = units.filter(u => u.is_active).length;
  const totalInactive = units.filter(u => !u.is_active).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Barra de ações ─────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Buscar unidade..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: "1 1 200px",
            padding: "8px 12px",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            fontSize: 13,
            background: "var(--color-surface)",
            color: "var(--color-text-primary)",
            fontFamily: "inherit",
            outline: "none",
          }}
        />
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as UnitType | "")}
          style={{
            padding: "8px 12px",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            fontSize: 13,
            background: "var(--color-surface)",
            color: "var(--color-text-primary)",
            fontFamily: "inherit",
            outline: "none",
          }}
        >
          <option value="">Todos os tipos</option>
          {(Object.entries(TYPE_LABEL) as [UnitType, string][]).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--color-text-muted)", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={showInactive}
            onChange={e => setShowInactive(e.target.checked)}
          />
          Mostrar inativas
        </label>
        {canManage && (
          <button
            onClick={openCreate}
            style={{
              marginLeft: "auto",
              padding: "8px 18px",
              background: "var(--color-primary)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
              fontFamily: "inherit",
            }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nova Unidade
          </button>
        )}
      </div>

      {/* ── Stats resumo ───────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 10 }}>
        {([
          { label: "Total", value: units.length,  color: "#4A7DB5" },
          { label: "Ativas", value: totalActive,  color: "#16a34a" },
          { label: "Inativas", value: totalInactive, color: "#64748b" },
          { label: "Exibindo", value: filtered.length, color: "#7c3aed" },
        ] as const).map(s => (
          <div key={s.label} style={{
            flex: 1, padding: "10px 14px",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 10,
            textAlign: "center",
          }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Árvore ─────────────────────────────────────────────── */}
      {tree.length === 0 ? (
        <div style={{
          padding: "48px 24px", textAlign: "center",
          background: "var(--color-surface)",
          border: "1px dashed var(--color-border)",
          borderRadius: 12,
        }}>
          <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
            {units.length === 0
              ? "Nenhuma unidade cadastrada. Clique em \"Nova Unidade\" para começar."
              : "Nenhuma unidade corresponde ao filtro."}
          </p>
        </div>
      ) : (
        <div style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 12,
          overflow: "hidden",
        }}>
          {tree.map((node, i) => (
            <TreeNode
              key={node.id}
              node={node}
              depth={0}
              isLast={i === tree.length - 1}
              canManage={canManage}
              allUnits={units}
              onEdit={openEdit}
              toggleAction={toggleAction}
            />
          ))}
        </div>
      )}

      {/* ── Modal ──────────────────────────────────────────────── */}
      {modal && (
        <UnitFormModal
          units={units}
          editUnit={modal === "edit" ? editUnit : null}
          onClose={closeModal}
          createAction={createAction}
          updateAction={updateAction}
        />
      )}
    </div>
  );
}

// ── Nó da árvore ─────────────────────────────────────────────────────────────
function TreeNode({
  node, depth, isLast, canManage, allUnits, onEdit, toggleAction
}: {
  node: UnitNode;
  depth: number;
  isLast: boolean;
  canManage: boolean;
  allUnits: Unit[];
  onEdit: (u: Unit) => void;
  toggleAction: (id: string, active: boolean) => Promise<void>;
}) {
  const [collapsed, setCollapsed] = useState(depth >= 2);
  const [pending, startTransition] = useTransition();
  const hasChildren = node.children.length > 0;
  const color = TYPE_COLOR[node.unit_type];

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 16px",
          paddingLeft: 16 + depth * 24,
          borderBottom: isLast && !hasChildren ? "none" : "1px solid var(--color-border)",
          opacity: node.is_active ? 1 : 0.5,
          background: depth === 0 ? "#F7FAFD" : "transparent",
        }}
      >
        {/* Expand toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{
            width: 20, height: 20, flexShrink: 0,
            background: hasChildren ? `${color}15` : "transparent",
            border: hasChildren ? `1px solid ${color}40` : "none",
            borderRadius: 4,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: hasChildren ? "pointer" : "default",
            color,
          }}
        >
          {hasChildren && (
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}
              style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform .15s" }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          )}
        </button>

        {/* Badge tipo */}
        <span style={{
          padding: "2px 8px", borderRadius: 99,
          fontSize: 10, fontWeight: 800, letterSpacing: "0.06em",
          background: `${color}18`, color,
          flexShrink: 0,
        }}>
          {TYPE_LABEL[node.unit_type]}
        </span>

        {/* Nome */}
        <span style={{
          flex: 1,
          fontSize: 13,
          fontWeight: depth === 0 ? 800 : depth === 1 ? 700 : 600,
          color: "var(--color-text-primary)",
        }}>
          {node.name}
          {node.is_headquarters && (
            <span style={{ marginLeft: 6, fontSize: 10, color: "#f97316", fontWeight: 700 }}>★ SEDE</span>
          )}
          {node.is_sector_mother && (
            <span style={{ marginLeft: 6, fontSize: 10, color: "#7c3aed", fontWeight: 700 }}>◆ MÃE</span>
          )}
          {!node.is_active && (
            <span style={{ marginLeft: 6, fontSize: 10, color: "#64748b", fontWeight: 700 }}>[INATIVA]</span>
          )}
        </span>

        {/* Qtd filhos */}
        {hasChildren && (
          <span style={{ fontSize: 11, color: "var(--color-text-muted)", flexShrink: 0 }}>
            {node.children.length} sub
          </span>
        )}

        {/* Ações */}
        {canManage && (
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <button
              onClick={() => onEdit(node)}
              title="Editar"
              style={actionBtnStyle}
            >
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button
              onClick={() => startTransition(() => toggleAction(node.id, !node.is_active))}
              title={node.is_active ? "Desativar" : "Ativar"}
              disabled={pending}
              style={{
                ...actionBtnStyle,
                color: node.is_active ? "#dc2626" : "#16a34a",
              }}
            >
              {node.is_active
                ? <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                : <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="20 6 9 17 4 12"/></svg>
              }
            </button>
          </div>
        )}
      </div>

      {/* Filhos */}
      {hasChildren && !collapsed && (
        <div>
          {node.children.map((child, i) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              isLast={i === node.children.length - 1}
              canManage={canManage}
              allUnits={allUnits}
              onEdit={onEdit}
              toggleAction={toggleAction}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const actionBtnStyle: React.CSSProperties = {
  padding: "4px 6px",
  background: "none",
  border: "1px solid var(--color-border)",
  borderRadius: 6,
  cursor: "pointer",
  color: "var(--color-text-muted)",
  display: "flex", alignItems: "center",
  transition: "background .12s",
};
