import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/utils/supabase/auth-context";
import { inventarioAction } from "@/app/dashboard/relatorios/actions";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export async function GET(req: NextRequest) {
  try {
    await getAuthContext();
    const { searchParams } = new URL(req.url);
    const data_ref = searchParams.get("data_ref") ?? new Date().toISOString().slice(0, 10);

    const r = await inventarioAction(data_ref);

    const linhas = r.itens.map(i => `
      <tr>
        <td class="mono">${i.numero_tombamento}</td>
        <td style="font-weight:600">${i.nome}</td>
        <td>${i.categoria}</td>
        <td class="num">${new Date(i.data_aquisicao).toLocaleDateString("pt-BR")}</td>
        <td class="num">${fmt(i.valor_aquisicao)}</td>
        <td class="num">${i.taxa_depreciacao_anual != null ? i.taxa_depreciacao_anual.toFixed(2) + "%" : "—"}</td>
        <td class="num purple">${fmt(i.valor_contabil)}</td>
        <td>${i.status}</td>
        <td>${i.localizacao ?? "—"}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Inventário ${data_ref}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; margin: 0; padding: 20px; }
  h1 { font-size: 18px; font-weight: 800; margin: 0 0 4px; }
  .sub { color: #6b7280; font-size: 12px; margin-bottom: 16px; }
  .cards { display: flex; gap: 16px; margin-bottom: 20px; }
  .card { flex:1; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; border-top: 4px solid; }
  .card.p { border-top-color: #7c3aed; } .card.b { border-top-color: #2563eb; } .card.g { border-top-color: #059669; }
  .card label { font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; }
  .card .valor { font-size: 16px; font-weight: 800; margin-top: 4px; }
  .card.p .valor { color: #7c3aed; } .card.b .valor { color: #2563eb; } .card.g .valor { color: #059669; }
  table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
  th { background: #f9fafb; font-size: 9px; font-weight: 700; color: #6b7280; text-transform: uppercase; padding: 7px 10px; text-align: left; border-bottom: 2px solid #e5e7eb; }
  th.num, td.num { text-align: right; }
  td { padding: 7px 10px; border-bottom: 1px solid #f3f4f6; }
  td.mono { font-family: monospace; color: #6b7280; }
  td.purple { color: #7c3aed; font-weight: 700; }
  tfoot td { font-weight: 800; border-top: 2px solid #e5e7eb; background: #f9fafb; }
  @media print { body { padding: 0; } }
</style></head><body>
<h1>Inventário Patrimonial</h1>
<p class="sub">Data de referência: ${new Date(data_ref).toLocaleDateString("pt-BR")} · Gerado em ${new Date().toLocaleString("pt-BR")}</p>
<div class="cards">
  <div class="card p"><label>Total de Bens</label><div class="valor">${r.itens.length} itens</div></div>
  <div class="card b"><label>Valor de Aquisição</label><div class="valor">${fmt(r.total_aquisicao)}</div></div>
  <div class="card g"><label>Valor Contábil</label><div class="valor">${fmt(r.total_contabil)}</div></div>
</div>
<table>
  <thead>
    <tr>
      <th>Tombamento</th><th>Nome</th><th>Categoria</th>
      <th class="num">Aquisição</th><th class="num">Vl. Aquisição</th><th class="num">Taxa Dep.</th>
      <th class="num">Vl. Contábil</th><th>Status</th><th>Local</th>
    </tr>
  </thead>
  <tbody>${linhas}</tbody>
  <tfoot>
    <tr>
      <td colspan="4">Total (${r.itens.length} itens)</td>
      <td class="num">${fmt(r.total_aquisicao)}</td>
      <td>—</td>
      <td class="num purple">${fmt(r.total_contabil)}</td>
      <td colspan="2">Dep. acum.: ${fmt(r.depreciacao_total)}</td>
    </tr>
  </tfoot>
</table>
</body></html>`;

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8", "Content-Disposition": `inline; filename="Inventario_${data_ref}.html"` },
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
