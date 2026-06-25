"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Material } from "@/types";
import { criarPedidoAction } from "../actions";

type Props = {
  materiais: Material[];
  units:     { id: string; nome: string }[];
};

type ItemForm = {
  material_id:    string;
  nome_snapshot:  string;
  quantidade:     number;
  valor_unitario: number;
};

const inputStyle: React.CSSProperties = {
  width: "100%", border: "1px solid var(--color-border)", borderRadius: 8,
  padding: "8px 12px", fontSize: 13, color: "var(--color-text-primary)",
  background: "var(--color-surface)", outline: "none", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 700,
  color: "var(--color-text-muted)", marginBottom: 4,
};

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function NovoPedidoForm({ materiais, units }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [unitId, setUnitId]     = useState(units[0]?.id ?? "");
  const [obs, setObs]           = useState("");
  const [items, setItems]       = useState<ItemForm[]>([]);
  const [matSel, setMatSel]     = useState(materiais[0]?.id ?? "");
  const [qtd, setQtd]           = useState(1);

  const materiaisAtivos = materiais.filter(m => m.is_active);

  function addItem() {
    const mat = materiaisAtivos.find(m => m.id === matSel);
    if (!mat) return;
    // Se já existe, incrementa quantidade
    setItems(prev => {
      const exists = prev.find(i => i.material_id === mat.id);
      if (exists) return prev.map(i => i.material_id === mat.id ? { ...i, quantidade: i.quantidade + qtd } : i);
      return [...prev, { material_id: mat.id, nome_snapshot: mat.nome, quantidade: qtd, valor_unitario: mat.valor_unitario }];
    });
    setQtd(1);
  }

  function removeItem(mid: string) {
    setItems(prev => prev.filter(i => i.material_id !== mid));
  }

  function updateQtd(mid: string, val: number) {
    setItems(prev => prev.map(i => i.material_id === mid ? { ...i, quantidade: Math.max(1, val) } : i));
  }

  const total = items.reduce((sum, i) => sum + i.quantidade * i.valor_unitario, 0);

  function handleSubmit() {
    if (!items.length) { setError("Adicione ao menos um item ao pedido"); return; }
    setError(null);
    startTransition(async () => {
      try {
        const id = await criarPedidoAction(
          unitId || null,
          obs.trim() || null,
          items
        );
        router.push(`/dashboard/secretaria/pedidos/${id}`);
      } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erro"); }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 700 }}>
      {/* Cabeçalho do pedido */}
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: 20 }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 900 }}>Informações do Pedido</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {units.length > 0 && (
            <div>
              <label style={labelStyle}>Unidade Solicitante</label>
              <select value={unitId} onChange={e => setUnitId(e.target.value)} style={inputStyle}>
                <option value="">— Sem unidade específica —</option>
                {units.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>
          )}
          <div>
            <label style={labelStyle}>Observações</label>
            <textarea value={obs} onChange={e => setObs(e.target.value)} rows={3}
              style={{ ...inputStyle, resize: "vertical" }} placeholder="Finalidade, urgência…" />
          </div>
        </div>
      </div>

      {/* Adicionar itens */}
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: 20 }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 900 }}>Itens do Pedido</h2>

        {materiaisAtivos.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Nenhum material ativo no catálogo.</p>
        ) : (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Material</label>
              <select value={matSel} onChange={e => setMatSel(e.target.value)} style={inputStyle}>
                {materiaisAtivos.map(m => (
                  <option key={m.id} value={m.id}>{m.nome} — {fmt(m.valor_unitario)}/{m.unidade}</option>
                ))}
              </select>
            </div>
            <div style={{ width: 100 }}>
              <label style={labelStyle}>Qtd</label>
              <input type="number" min={1} value={qtd} onChange={e => setQtd(parseInt(e.target.value) || 1)} style={inputStyle} />
            </div>
            <button onClick={addItem} style={{
              padding: "8px 16px", borderRadius: 8, border: "none",
              background: "var(--color-primary)", color: "#fff",
              fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
              height: 38,
            }}>
              + Adicionar
            </button>
          </div>
        )}

        {items.length > 0 && (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
              <thead>
                <tr style={{ background: "#F7FAFD", borderBottom: "1px solid var(--color-border)" }}>
                  {["Material","Qtd","Valor Unit.","Subtotal",""].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 800, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: ".04em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(it => (
                  <tr key={it.material_id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600 }}>{it.nome_snapshot}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <input type="number" min={1} value={it.quantidade}
                        onChange={e => updateQtd(it.material_id, parseInt(e.target.value) || 1)}
                        style={{ ...inputStyle, width: 70, padding: "4px 8px" }} />
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--color-text-muted)" }}>{fmt(it.valor_unitario)}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 700 }}>{fmt(it.quantidade * it.valor_unitario)}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <button onClick={() => removeItem(it.material_id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 18, lineHeight: 1 }}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ textAlign: "right", fontSize: 16, fontWeight: 900, color: "var(--color-text-primary)" }}>
              Total: {fmt(total)}
            </div>
          </>
        )}
      </div>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 8, background: "#fef2f2", color: "#dc2626", fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <a href="/dashboard/secretaria/pedidos" style={{
          padding: "10px 20px", borderRadius: 8, border: "1px solid var(--color-border)",
          background: "transparent", fontSize: 13, fontWeight: 600, cursor: "pointer",
          color: "var(--color-text-muted)", textDecoration: "none",
        }}>Cancelar</a>
        <button onClick={handleSubmit} disabled={pending || items.length === 0} style={{
          padding: "10px 24px", borderRadius: 8, border: "none",
          background: "var(--color-primary)", color: "#fff",
          fontSize: 13, fontWeight: 700, cursor: "pointer",
          opacity: pending || items.length === 0 ? 0.6 : 1,
        }}>
          {pending ? "Enviando…" : "Enviar Pedido"}
        </button>
      </div>
    </div>
  );
}
