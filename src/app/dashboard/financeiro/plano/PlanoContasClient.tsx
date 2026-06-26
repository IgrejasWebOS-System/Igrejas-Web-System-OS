"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ChartOfAccountWithChildren, ChartAccountType } from "@/types";
import {
  CHART_ACCOUNT_TYPE_LABELS,
  CHART_ACCOUNT_TYPE_COLORS,
  CHART_ACCOUNT_NATURE_LABELS,
} from "@/types";
import { criarChartAccountAction } from "../actions";

const MODULOS: { tipo: ChartAccountType | "all"; label: string; emoji: string }[] = [
  { tipo: "all",          label: "Todos os Módulos",       emoji: "🗂️" },
  { tipo: "asset",        label: "Ativo (1 e 1.x)",        emoji: "📦" },
  { tipo: "liability",    label: "Passivo (2.1 e 2.2)",    emoji: "📋" },
  { tipo: "equity",       label: "Patrimônio Líq. (2.3)",  emoji: "🏛️" },
  { tipo: "revenue",      label: "Receitas (3.x)",          emoji: "📈" },
  { tipo: "expense",      label: "Despesas (4.x)",          emoji: "📉" },
  { tipo: "compensation", label: "Compensação (5 e 6)",     emoji: "⚖️" },
];

const DEPTH_STYLES: React.CSSProperties[] = [
  { fontWeight: 800, fontSize: 13, background: "#1e3a5f", color: "#fff"    }, // nível 1 — azul escuro legível
  { fontWeight: 700, fontSize: 13, background: "#dbeafe", color: "#1e3a5f" }, // nível 2 — azul claro
  { fontWeight: 600, fontSize: 13, background: "#f1f5f9", color: "#1C2833" }, // nível 3 — cinza claro
  { fontWeight: 500, fontSize: 13, background: "#fff",    color: "#1C2833" }, // nível 4 — branco
  { fontWeight: 400, fontSize: 12, background: "#fafafa", color: "#334155" }, // nível 5 — analítica
];

type NodeProps = {
  node: ChartOfAccountWithChildren;
  depth: number;
  expanded: Set<string>;
  toggle: (id: string) => void;
};

function AccountNode({ node, depth, expanded, toggle }: NodeProps) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);
  const style = DEPTH_STYLES[Math.min(depth, 4)];
  const typeColor = CHART_ACCOUNT_TYPE_COLORS[node.type];

  return (
    <>
      <div
        style={{
          display: "flex", alignItems: "center", gap: 8,
          paddingLeft: 12 + depth * 20,
          paddingRight: 12, paddingTop: 7, paddingBottom: 7,
          borderBottom: "1px solid rgba(0,0,0,.05)",
          cursor: hasChildren ? "pointer" : "default",
          ...style,
        }}
        onClick={() => hasChildren && toggle(node.id)}
      >
        {/* Expand icon */}
        <span style={{
          minWidth: 14, fontSize: 10, flexShrink: 0,
          color: depth === 0 ? "rgba(255,255,255,.6)" : "#94a3b8",
        }}>
          {hasChildren ? (isOpen ? "▼" : "▶") : "·"}
        </span>

        {/* Código */}
        <span style={{ fontFamily: "monospace", fontSize: 11, minWidth: 90, flexShrink: 0, opacity: 0.85 }}>
          {node.code}
        </span>

        {/* Nome */}
        <span style={{ flex: 1 }}>{node.name}</span>

        {/* Badge natureza */}
        <span style={{
          fontSize: 9, fontWeight: 700, padding: "1px 7px", borderRadius: 99,
          background: node.nature === "debit" ? "rgba(59,130,246,.15)" : "rgba(34,197,94,.15)",
          color: node.nature === "debit"
            ? (depth <= 1 ? "#93c5fd" : "#1d4ed8")
            : (depth <= 1 ? "#86efac" : "#15803d"),
          flexShrink: 0,
        }}>
          {CHART_ACCOUNT_NATURE_LABELS[node.nature].toUpperCase()}
        </span>

        {/* Badge tipo (só nível 1 e analíticas) */}
        {(depth === 0 || node.is_analytical) && (
          <span style={{
            fontSize: 9, fontWeight: 700, padding: "1px 7px", borderRadius: 99,
            background: typeColor.bg, color: typeColor.color, flexShrink: 0,
          }}>
            {depth === 0 ? CHART_ACCOUNT_TYPE_LABELS[node.type].toUpperCase() : "ANALÍTICA"}
          </span>
        )}
      </div>

      {/* Filhos */}
      {isOpen && node.children.map((child) => (
        <AccountNode key={child.id} node={child} depth={depth + 1} expanded={expanded} toggle={toggle} />
      ))}
    </>
  );
}

export default function PlanoContasClient({ tree }: { tree: ChartOfAccountWithChildren[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [filtro, setFiltro]     = useState<ChartAccountType | "all">("all");
  const [search, setSearch]     = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [modal, setModal]       = useState(false);
  const [tipo, setTipo]         = useState<ChartAccountType>("revenue");
  const [natureza, setNatureza] = useState<"debit" | "credit">("credit");
  const [erro, setErro]         = useState("");

  // Expandir/colapsar tudo
  function getAllIds(nodes: ChartOfAccountWithChildren[]): string[] {
    return nodes.flatMap((n) => [n.id, ...getAllIds(n.children)]);
  }
  function expandAll() { setExpanded(new Set(getAllIds(tree))); }
  function collapseAll() { setExpanded(new Set()); }
  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // Filtrar raízes por tipo
  const raizes = tree.filter((n) => filtro === "all" || n.type === filtro);

  // Contadores
  const total      = getAllIds(tree).length;
  const totalAnali = getAllIds(tree).filter((id) => {
    function find(nodes: ChartOfAccountWithChildren[]): ChartOfAccountWithChildren | undefined {
      for (const n of nodes) { if (n.id === id) return n; const f = find(n.children); if (f) return f; }
    }
    return find(tree)?.is_analytical;
  }).length;

  function submitNova(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("type", tipo);
    fd.set("nature", natureza);
    setErro("");
    startTransition(async () => {
      try {
        await criarChartAccountAction(fd);
        setModal(false);
        router.refresh();
      } catch (err: any) {
        setErro(err.message ?? "Erro ao criar conta");
      }
    });
  }

  return (
    <div style={{ padding: "28px 28px", maxWidth: 1100 }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 8 }}>
        <Link href="/dashboard/financeiro" style={{ fontSize: 12, color: "#4A7DB5", fontWeight: 600, textDecoration: "none" }}>← Financeiro</Link>
      </div>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1C2833", margin: 0 }}>Plano de Contas</h1>
          <p style={{ color: "#5D6D7E", fontSize: 13, marginTop: 4 }}>
            Arquitetura híbrida ITG 2002 / CFC · 5 níveis analíticos ·{" "}
            <strong>{total}</strong> contas · <strong>{totalAnali}</strong> analíticas
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={expandAll}   style={btnSmall("#475569")}>Expandir tudo</button>
          <button onClick={collapseAll} style={btnSmall("#94a3b8")}>Recolher tudo</button>
          <button onClick={() => { setErro(""); setModal(true); }} style={btnSmall("#4A7DB5")}>+ Nova Conta</button>
        </div>
      </div>

      {/* Filtros de módulo */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {MODULOS.map((m) => (
          <button
            key={m.tipo}
            onClick={() => setFiltro(m.tipo)}
            style={{
              padding: "6px 14px", borderRadius: 20, border: "1.5px solid",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              borderColor: filtro === m.tipo ? "#4A7DB5" : "#C8D6E5",
              background:  filtro === m.tipo ? "#4A7DB5" : "#fff",
              color:       filtro === m.tipo ? "#fff"    : "#5D6D7E",
            }}
          >
            {m.emoji} {m.label}
          </button>
        ))}
      </div>

      {/* Legenda */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        {(Object.entries(CHART_ACCOUNT_TYPE_COLORS) as [string, { bg: string; color: string }][]).map(([tipo, c]) => (
          <div key={tipo} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
            <span style={{ width: 10, height: 10, borderRadius: 99, background: c.color, display: "inline-block" }} />
            <span style={{ color: "#475569", fontWeight: 600 }}>{CHART_ACCOUNT_TYPE_LABELS[tipo as ChartAccountType]}</span>
          </div>
        ))}
        <div style={{ fontSize: 11, color: "#94a3b8" }}>· Clique em um grupo para expandir/recolher</div>
      </div>

      {/* Árvore */}
      {raizes.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#5D6D7E", background: "#f8fafc", borderRadius: 12 }}>
          <p style={{ fontWeight: 600 }}>Nenhuma conta encontrada</p>
          <p style={{ fontSize: 12 }}>Execute a migration 022 no Supabase SQL Editor</p>
        </div>
      ) : (
        <div style={{ border: "1.5px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
          {/* Cabeçalho da tabela */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 12px 8px 26px",
            background: "#0f172a", color: "#94a3b8",
            fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
          }}>
            <span style={{ minWidth: 14 }} />
            <span style={{ minWidth: 90 }}>Código</span>
            <span style={{ flex: 1 }}>Descrição</span>
            <span style={{ minWidth: 70 }}>Natureza</span>
            <span style={{ minWidth: 70 }}>Tipo</span>
          </div>

          {raizes.map((node) => (
            <AccountNode key={node.id} node={node} depth={0} expanded={expanded} toggle={toggle} />
          ))}
        </div>
      )}

      {/* Modal nova conta */}
      {modal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: "#1C2833" }}>Nova Conta Contábil</h2>
            <form onSubmit={submitNova} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={labelStyle}>
                  Código *
                  <input name="code" required style={inputStyle} placeholder="Ex: 3.1.1.01.005" />
                </label>
                <label style={labelStyle}>
                  Tipo *
                  <select
                    value={tipo}
                    onChange={(e) => {
                      const t = e.target.value as ChartAccountType;
                      setTipo(t);
                      setNatureza(["asset","expense","compensation"].includes(t) ? "debit" : "credit");
                    }}
                    style={inputStyle}
                  >
                    {(Object.entries(CHART_ACCOUNT_TYPE_LABELS) as [ChartAccountType, string][]).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label style={labelStyle}>
                Nome / Descrição *
                <input name="name" required style={inputStyle} placeholder="Nome da conta contábil" />
              </label>
              <label style={labelStyle}>
                Conta Pai (opcional)
                <select name="parent_id" style={inputStyle}>
                  <option value="">Sem pai (conta raiz nível 1)</option>
                  {/* Listar todas as contas não-analíticas como opção de pai */}
                  {getAllAccountsFlat(raizes).filter((c) => !c.is_analytical && c.account_level < 5).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label style={labelStyle}>
                Natureza Contábil *
                <div style={{ display: "flex", gap: 0, border: "1.5px solid #C8D6E5", borderRadius: 8, overflow: "hidden" }}>
                  {(["debit", "credit"] as const).map((n) => (
                    <button
                      key={n} type="button"
                      onClick={() => setNatureza(n)}
                      style={{
                        flex: 1, padding: "8px", border: "none", cursor: "pointer",
                        fontWeight: 600, fontSize: 12,
                        background: natureza === n ? "#4A7DB5" : "#fff",
                        color:      natureza === n ? "#fff"    : "#64748b",
                      }}
                    >
                      {CHART_ACCOUNT_NATURE_LABELS[n]} ({n === "debit" ? "D" : "C"})
                    </button>
                  ))}
                </div>
              </label>
              {erro && <p style={{ color: "#dc2626", fontSize: 13 }}>{erro}</p>}
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#166534" }}>
                ℹ️ O nível da conta será calculado automaticamente com base na conta pai. Contas de nível 5 são automaticamente analíticas.
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setModal(false)} style={btnStyle("#94a3b8")}>Cancelar</button>
                <button type="submit" disabled={isPending} style={btnStyle("#4A7DB5")}>
                  {isPending ? "Salvando..." : "Criar Conta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper: achatar árvore
function getAllAccountsFlat(nodes: ChartOfAccountWithChildren[]): ChartOfAccountWithChildren[] {
  return nodes.flatMap((n) => [n, ...getAllAccountsFlat(n.children)]);
}

const overlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.5)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999,
};
const modalStyle: React.CSSProperties = {
  background: "#fff", borderRadius: 14, padding: "28px 28px 24px",
  width: "100%", maxWidth: 520, boxShadow: "0 8px 40px rgba(0,0,0,.2)",
  maxHeight: "90vh", overflowY: "auto",
};
const labelStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 5,
  fontSize: 12, fontWeight: 600, color: "#475569",
};
const inputStyle: React.CSSProperties = {
  border: "1.5px solid #C8D6E5", borderRadius: 8, padding: "9px 12px",
  fontSize: 13, outline: "none", fontFamily: "inherit", background: "#fff", color: "#1C2833",
};
function btnStyle(bg: string): React.CSSProperties {
  return { background: bg, color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer" };
}
function btnSmall(bg: string): React.CSSProperties {
  return { background: bg, color: "#fff", border: "none", borderRadius: 7, padding: "7px 14px", fontWeight: 600, fontSize: 12, cursor: "pointer" };
}
