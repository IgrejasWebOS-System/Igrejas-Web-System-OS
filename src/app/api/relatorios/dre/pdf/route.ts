import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/utils/supabase/auth-context";
import { dreAction } from "@/app/dashboard/relatorios/actions";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export async function GET(req: NextRequest) {
  try {
    await getAuthContext();
    const { searchParams } = new URL(req.url);
    const de  = searchParams.get("de")  ?? new Date().toISOString().slice(0, 8) + "01";
    const ate = searchParams.get("ate") ?? new Date().toISOString().slice(0, 10);

    const r = await dreAction(de, ate);

    const linhaReceita = (l: { categoria_cod: string; categoria_nome: string; total: number }) => `
      <tr>
        <td class="cod">${l.categoria_cod}</td>
        <td>${l.categoria_nome}</td>
        <td class="val green">${fmt(l.total)}</td>
        <td class="pct">${r.total_receitas > 0 ? ((l.total / r.total_receitas) * 100).toFixed(1) : "0.0"}%</td>
      </tr>`;
    const linhaDespesa = (l: { categoria_cod: string; categoria_nome: string; total: number }) => `
      <tr>
        <td class="cod">${l.categoria_cod}</td>
        <td>${l.categoria_nome}</td>
        <td class="val red">${fmt(l.total)}</td>
        <td class="pct">${r.total_despesas > 0 ? ((l.total / r.total_despesas) * 100).toFixed(1) : "0.0"}%</td>
      </tr>`;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>DRE ${de} — ${ate}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 0; padding: 20px; }
  h1 { font-size: 18px; font-weight: 800; margin: 0 0 4px; }
  .sub { color: #6b7280; font-size: 12px; margin-bottom: 24px; }
  .cards { display: flex; gap: 16px; margin-bottom: 24px; }
  .card { flex: 1; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; border-top: 4px solid; }
  .card.green { border-top-color: #059669; } .card.red { border-top-color: #dc2626; } .card.blue { border-top-color: #2563eb; }
  .card label { font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; }
  .card .valor { font-size: 18px; font-weight: 800; margin-top: 4px; }
  .card.green .valor { color: #059669; } .card.red .valor { color: #dc2626; } .card.blue .valor { color: #2563eb; }
  section { margin-bottom: 24px; }
  section h2 { font-size: 13px; font-weight: 800; margin: 0 0 8px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f9fafb; font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; padding: 8px 10px; text-align: left; border-bottom: 2px solid #e5e7eb; }
  td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; }
  td.cod { font-family: monospace; color: #6b7280; }
  td.val { text-align: right; font-weight: 700; }
  td.pct { text-align: right; color: #6b7280; }
  td.green { color: #059669; } td.red { color: #dc2626; }
  tfoot td { font-weight: 800; border-top: 2px solid #e5e7eb; background: #f9fafb; }
  .resultado { font-size: 15px; font-weight: 800; text-align: right; margin-top: 16px; padding: 12px 16px; border-radius: 8px; }
  .resultado.pos { background: #d1fae5; color: #059669; }
  .resultado.neg { background: #fee2e2; color: #dc2626; }
  @media print { body { padding: 0; } }
</style></head><body>
<h1>DRE — Demonstração do Resultado do Exercício</h1>
<p class="sub">Período: ${new Date(de).toLocaleDateString("pt-BR")} a ${new Date(ate).toLocaleDateString("pt-BR")} · Gerado em ${new Date().toLocaleString("pt-BR")}</p>

<div class="cards">
  <div class="card green"><label>Total Receitas</label><div class="valor">${fmt(r.total_receitas)}</div></div>
  <div class="card red"><label>Total Despesas</label><div class="valor">${fmt(r.total_despesas)}</div></div>
  <div class="card ${r.resultado >= 0 ? "green" : "red"}"><label>${r.resultado >= 0 ? "Superávit" : "Déficit"}</label><div class="valor">${fmt(Math.abs(r.resultado))}</div></div>
</div>

<section>
  <h2>Receitas</h2>
  <table>
    <thead><tr><th>Código</th><th>Categoria</th><th style="text-align:right">Total</th><th style="text-align:right">%</th></tr></thead>
    <tbody>${r.receitas.map(linhaReceita).join("")}</tbody>
    <tfoot><tr><td colspan="2">Total Receitas</td><td class="val green">${fmt(r.total_receitas)}</td><td class="pct">100%</td></tr></tfoot>
  </table>
</section>

<section>
  <h2>Despesas</h2>
  <table>
    <thead><tr><th>Código</th><th>Categoria</th><th style="text-align:right">Total</th><th style="text-align:right">%</th></tr></thead>
    <tbody>${r.despesas.map(linhaDespesa).join("")}</tbody>
    <tfoot><tr><td colspan="2">Total Despesas</td><td class="val red">${fmt(r.total_despesas)}</td><td class="pct">100%</td></tr></tfoot>
  </table>
</section>

<div class="resultado ${r.resultado >= 0 ? "pos" : "neg"}">
  ${r.resultado >= 0 ? "✅ Superávit" : "⚠️ Déficit"}: ${fmt(Math.abs(r.resultado))}
</div>
</body></html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="DRE_${de}_${ate}.html"`,
      },
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
