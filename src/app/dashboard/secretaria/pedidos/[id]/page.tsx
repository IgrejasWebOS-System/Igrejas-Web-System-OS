import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionContext } from "@/types";
import { ORDER_SITUACAO_LABELS, ORDER_SITUACAO_COLORS } from "@/types";
import { buscarPedidoAction, mudarSituacaoPedidoAction } from "../actions";
import AtualizarSituacaoBtn from "./AtualizarSituacaoBtn";

export const metadata = { title: "Detalhe do Pedido — IgrejasWeb" };

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function PedidoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const raw = cookieStore.get("iw_context")?.value;
  if (!raw) redirect("/contexto");

  const ctx: SessionContext = JSON.parse(raw);
  if (ctx.level > 3) redirect("/dashboard");

  const pedido = await buscarPedidoAction(id).catch(() => null);
  if (!pedido) return (
    <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-muted)" }}>
      Pedido não encontrado.{" "}
      <a href="/dashboard/secretaria/pedidos" style={{ color: "var(--color-primary)" }}>Voltar</a>
    </div>
  );

  const sc = ORDER_SITUACAO_COLORS[pedido.situacao];
  const isAdmin = ctx.level <= 2;

  return (
    <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <a href="/dashboard/secretaria/pedidos" style={{ fontSize: 12, color: "var(--color-text-muted)", textDecoration: "none", display: "block", marginBottom: 8 }}>
            ← Pedidos de Material
          </a>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
            Pedido #{id.slice(-8).toUpperCase()}
          </h1>
        </div>
        <span style={{ padding: "6px 16px", borderRadius: 99, fontSize: 13, fontWeight: 700, background: sc.bg, color: sc.color, alignSelf: "center" }}>
          {ORDER_SITUACAO_LABELS[pedido.situacao]}
        </span>
      </div>

      {/* Info */}
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: 16 }}>
          {[
            ["Unidade", pedido.unit_nome ?? "—"],
            ["Data do Pedido", new Date(pedido.data_pedido + "T12:00").toLocaleDateString("pt-BR")],
            ["Solicitante", pedido.criado_por_nome ?? "—"],
            ["Total", fmt(pedido.total)],
          ].map(([l, v]) => (
            <div key={l}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 2 }}>{l}</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{v}</div>
            </div>
          ))}
        </div>
        {pedido.observacoes && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--color-border)", fontSize: 13, color: "var(--color-text-muted)" }}>
            <strong>Observações:</strong> {pedido.observacoes}
          </div>
        )}
      </div>

      {/* Itens */}
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--color-border)", fontWeight: 800, fontSize: 13 }}>
          Itens ({pedido.items.length})
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F7FAFD", borderBottom: "1px solid var(--color-border)" }}>
              {["Material","Qtd","Valor Unit.","Subtotal"].map(h => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 800, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: ".04em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pedido.items.map((it, i) => (
              <tr key={it.id} style={{ borderBottom: i < pedido.items.length - 1 ? "1px solid var(--color-border)" : "none" }}>
                <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600 }}>{it.nome_snapshot}</td>
                <td style={{ padding: "12px 16px", fontSize: 13 }}>{it.quantidade}</td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--color-text-muted)" }}>{fmt(it.valor_unitario)}</td>
                <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700 }}>{fmt(it.subtotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: "2px solid var(--color-border)", background: "#F7FAFD" }}>
              <td colSpan={3} style={{ padding: "12px 16px", fontSize: 13, fontWeight: 800, textAlign: "right" }}>TOTAL</td>
              <td style={{ padding: "12px 16px", fontSize: 15, fontWeight: 900, color: "var(--color-primary)" }}>{fmt(pedido.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Ações admin */}
      {isAdmin && pedido.situacao !== "CANCELADO" && pedido.situacao !== "PAGO" && (
        <AtualizarSituacaoBtn pedidoId={id} situacaoAtual={pedido.situacao} />
      )}
    </div>
  );
}
