import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/utils/supabase/auth-context";
import { balanceteAction } from "@/app/dashboard/relatorios/actions";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export async function GET(req: NextRequest) {
  try {
    await getAuthContext();
    const { searchParams } = new URL(req.url);
    const de  = searchParams.get("de")  ?? new Date().toISOString().slice(0, 8) + "01";
    const ate = searchParams.get("ate") ?? new Date().toISOString().slice(0, 10);

    const r = await balanceteAction(de, ate);

    const linhas = r.linhas.map(l => `
      <tr>
        <td>${l.account_nome}</td>
        <td class="num">${fmt(l.saldo_ini)}</td>
        <td class="num green">${fmt(l.entradas)}</td>
        <td class="num red">${fmt(l.saidas)}</td>
        <td class="num ${l.saldo_fin >= 0 ? "green" : "red"}" style="font-weight:800">${fmt(l.saldo_fin)}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Balancete ${de} — ${ate}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 0; padding: 20px; }
  h1 { font-size: 18px; font-weight: 800; margin: 0 0 4px; }
  .sub { color: #6b7280; font-size: 12px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f9fafb; font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; padding: 9px 12px; text-align: left; border-bottom: 2px solid #e5e7eb; }
  th.num { text-align: right; }
  td { padding: 9px 12px; border-bottom: 1px solid #f3f4f6; }
  td.num { text-align: right; }
  td.green { color: #059669; font-weight: 700; } td.red { color: #dc2626; font-weight: 700; }
  tfoot td { font-weight: 800; border-top: 2px solid #e5e7eb; background: #f9fafb; padding: 10px 12px; }
</style></head><body>
<h1>Balancete por Período</h1>
<p class="sub">Período: ${new Date(de).toLocaleDateString("pt-BR")} a ${new Date(ate).toLocaleDateString("pt-BR")} · Gerado em ${new Date().toLocaleString("pt-BR")}</p>
<table>
  <thead>
    <tr>
      <th>Conta</th>
      <th class="num">Saldo Inicial</th>
      <th class="num">Entradas</th>
      <th class="num">Saídas</th>
      <th class="num">Saldo Final</th>
    </tr>
  </thead>
  <tbody>${linhas}</tbody>
  <tfoot>
    <tr>
      <td>Total</td>
      <td class="num">—</td>
      <td class="num green">${fmt(r.total_entradas)}</td>
      <td class="num red">${fmt(r.total_saidas)}</td>
      <td class="num ${r.total_entradas - r.total_saidas >= 0 ? "green" : "red"}">${fmt(r.total_entradas - r.total_saidas)}</td>
    </tr>
  </tfoot>
</table>
</body></html>`;

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8", "Content-Disposition": `inline; filename="Balancete_${de}_${ate}.html"` },
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
