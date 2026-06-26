import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/utils/supabase/auth-context";
import { membrosRelatorioAction } from "@/app/dashboard/relatorios/actions";

export async function GET(req: NextRequest) {
  try {
    await getAuthContext();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? undefined;

    const r = await membrosRelatorioAction(status ? { status } : {});

    const linhas = r.membros.map(m => `
      <tr>
        <td style="font-weight:600">${m.full_name}</td>
        <td>${m.gender ?? "—"}</td>
        <td>${m.civil_status ?? "—"}</td>
        <td>${m.telefone ?? "—"}</td>
        <td>${m.email ?? "—"}</td>
        <td>${m.unit_nome ?? "—"}</td>
        <td>${m.data_membro ? new Date(m.data_membro).toLocaleDateString("pt-BR") : "—"}</td>
        <td><span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:${m.status === "ATIVO" ? "#d1fae5" : "#f3f4f6"};color:${m.status === "ATIVO" ? "#059669" : "#6b7280"}">${m.status}</span></td>
      </tr>`).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Relatório de Membros</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 0; padding: 20px; }
  h1 { font-size: 18px; font-weight: 800; margin: 0 0 4px; }
  .sub { color: #6b7280; font-size: 12px; margin-bottom: 16px; }
  .cards { display: flex; gap: 16px; margin-bottom: 20px; }
  .card { flex:1; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; border-top: 4px solid; }
  .card.a { border-top-color: #d97706; } .card.b { border-top-color: #059669; } .card.c { border-top-color: #6b7280; }
  .card label { font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; }
  .card .valor { font-size: 22px; font-weight: 800; margin-top: 4px; }
  .card.a .valor { color: #d97706; } .card.b .valor { color: #059669; } .card.c .valor { color: #6b7280; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f9fafb; font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; padding: 8px 10px; text-align: left; border-bottom: 2px solid #e5e7eb; }
  td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; font-size: 11px; }
  @media print { body { padding: 0; } }
</style></head><body>
<h1>Relatório de Membros</h1>
<p class="sub">${status ? `Filtro: ${status} · ` : ""}Gerado em ${new Date().toLocaleString("pt-BR")}</p>
<div class="cards">
  <div class="card a"><label>Total</label><div class="valor">${r.total}</div></div>
  <div class="card b"><label>Ativos</label><div class="valor">${r.ativos}</div></div>
  <div class="card c"><label>Inativos/Outros</label><div class="valor">${r.inativos}</div></div>
</div>
<table>
  <thead>
    <tr>
      <th>Nome</th><th>Gênero</th><th>Estado Civil</th>
      <th>Telefone</th><th>E-mail</th><th>Congregação</th>
      <th>Membro desde</th><th>Status</th>
    </tr>
  </thead>
  <tbody>${linhas}</tbody>
</table>
</body></html>`;

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8", "Content-Disposition": `inline; filename="Membros_${new Date().toISOString().slice(0,10)}.html"` },
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
