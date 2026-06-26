import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getAuthContext } from "@/utils/supabase/auth-context";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const ctx = await getAuthContext();
    const sb = await createClient();

    // Buscar evento
    const { data: ev, error: evErr } = await sb
      .from("events")
      .select("*, units:unit_id(name), parties:responsavel_party_id(full_name)")
      .eq("id", id)
      .eq("ministry_id", ctx.ministry_id)
      .single();

    if (evErr || !ev) return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });

    // Buscar inscrições
    const { data: inscricoes } = await sb
      .from("event_registrations")
      .select("*, parties:party_id(full_name)")
      .eq("event_id", id)
      .order("status", { ascending: true })
      .order("created_at", { ascending: true });

    // Buscar check-ins
    const { data: checkins } = await sb
      .from("event_checkins")
      .select("*, parties:party_id(full_name)")
      .eq("event_id", id)
      .order("checkin_at", { ascending: true });

    const insc = inscricoes ?? [];
    const chk  = checkins ?? [];

    const confirmados   = insc.filter((i: { status: string }) => i.status === "CONFIRMADO").length;
    const pendentes     = insc.filter((i: { status: string }) => i.status === "PENDENTE").length;
    const cancelados    = insc.filter((i: { status: string }) => i.status === "CANCELADO").length;
    const presentes     = chk.length;

    const dataFmt = (iso: string) =>
      new Date(iso).toLocaleString("pt-BR", {
        day: "2-digit", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });

    const rowsInsc = insc.map((i: { parties?: { full_name?: string } | null; nome_externo?: string | null; status: string; created_at: string }) => {
      const nome = i.parties?.full_name ?? i.nome_externo ?? "—";
      const sc = i.status === "CONFIRMADO" ? "#16a34a" : i.status === "PENDENTE" ? "#d97706" : "#dc2626";
      return `
        <tr>
          <td>${nome}</td>
          <td style="color:${sc};font-weight:700">${i.status}</td>
          <td>${new Date(i.created_at).toLocaleDateString("pt-BR")}</td>
        </tr>`;
    }).join("");

    const rowsChk = chk.map((c: { parties?: { full_name?: string } | null; nome_avulso?: string | null; checkin_at: string }, idx: number) => {
      const nome = c.parties?.full_name ?? c.nome_avulso ?? "—";
      return `
        <tr>
          <td>${idx + 1}</td>
          <td>${nome}</td>
          <td>${new Date(c.checkin_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</td>
        </tr>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Relatório — ${ev.titulo}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #1e293b; padding: 32px 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; padding-bottom: 16px; border-bottom: 2px solid #2563eb; }
  .logo { font-size: 20px; font-weight: 900; color: #2563eb; }
  .title { font-size: 18px; font-weight: 800; margin: 20px 0 6px; }
  .meta { color: #64748b; font-size: 12px; margin-bottom: 4px; }
  .stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin: 24px 0; }
  .stat { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; text-align: center; }
  .stat-val { font-size: 26px; font-weight: 800; color: #2563eb; }
  .stat-lbl { font-size: 11px; color: #64748b; font-weight: 600; margin-top: 2px; }
  h2 { font-size: 14px; font-weight: 700; margin: 24px 0 10px; color: #2563eb; text-transform: uppercase; letter-spacing: .05em; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #f1f5f9; padding: 8px 12px; text-align: left; font-weight: 700; color: #64748b; text-transform: uppercase; font-size: 10px; letter-spacing: .05em; }
  td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
  tr:last-child td { border-bottom: none; }
  .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 14px; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="logo">IW</div>
    <div style="font-size:11px;color:#64748b;margin-top:2px">IgrejasWeb System OS</div>
  </div>
  <div style="text-align:right;font-size:11px;color:#64748b">
    Relatório gerado em ${new Date().toLocaleString("pt-BR")}<br/>
    Confidencial
  </div>
</div>

<div class="title">${ev.titulo}</div>
<div class="meta">📅 ${dataFmt(ev.data_inicio)}${ev.data_fim ? ` → ${dataFmt(ev.data_fim)}` : ""}</div>
${ev.local_nome ? `<div class="meta">📍 ${ev.local_nome}${ev.local_endereco ? ` — ${ev.local_endereco}` : ""}</div>` : ""}
${ev.parties?.full_name ? `<div class="meta">👤 Responsável: ${ev.parties.full_name}</div>` : ""}

<div class="stats">
  <div class="stat"><div class="stat-val">${insc.length}</div><div class="stat-lbl">Inscritos</div></div>
  <div class="stat"><div class="stat-val" style="color:#16a34a">${confirmados}</div><div class="stat-lbl">Confirmados</div></div>
  <div class="stat"><div class="stat-val" style="color:#2563eb">${presentes}</div><div class="stat-lbl">Check-ins</div></div>
  <div class="stat"><div class="stat-val" style="color:#64748b">${ev.capacidade ?? "∞"}</div><div class="stat-lbl">Capacidade</div></div>
</div>

${insc.length > 0 ? `
<h2>Lista de Inscrições</h2>
<table>
  <thead><tr><th>Nome</th><th>Status</th><th>Data Inscrição</th></tr></thead>
  <tbody>${rowsInsc}</tbody>
</table>` : ""}

${chk.length > 0 ? `
<h2>Lista de Presença — Check-in</h2>
<table>
  <thead><tr><th>#</th><th>Nome</th><th>Horário</th></tr></thead>
  <tbody>${rowsChk}</tbody>
</table>` : ""}

<div class="footer">
  IgrejasWeb System OS · Relatório de Evento · ${ev.titulo}<br/>
  ${presentes} presente${presentes !== 1 ? "s" : ""} de ${confirmados} confirmado${confirmados !== 1 ? "s" : ""}
  ${ev.capacidade ? ` · ${Math.round((presentes / ev.capacidade) * 100)}% de ocupação` : ""}
</div>

</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="evento-${id}.html"`,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
