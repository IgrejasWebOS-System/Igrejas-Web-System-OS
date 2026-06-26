import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/utils/supabase/auth-context";
import { buscarBoletimAction } from "@/app/dashboard/escola/actions";
import { ENROLLMENT_SITUACAO_LABELS } from "@/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ partyId: string }> }
) {
  const ctx = await getAuthContext();
  if (!ctx) return new NextResponse("Nao autorizado", { status: 401 });

  const { partyId } = await params;
  const semesterId = req.nextUrl.searchParams.get("semestre") ?? "";

  if (!semesterId) {
    return new NextResponse("Semestre nao informado", { status: 400 });
  }

  let boletim;
  try {
    boletim = await buscarBoletimAction(partyId, semesterId);
  } catch (e: any) {
    return new NextResponse("Erro ao buscar boletim", { status: 500 });
  }

  const dataAtual = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });

  const linhas = boletim.disciplinas.map((d) => {
    const situacaoLabel = ENROLLMENT_SITUACAO_LABELS[d.situacao];
    const statusColor =
      d.situacao === "APROVADO"
        ? "#166534"
        : d.situacao === "CURSANDO"
        ? "#1e40af"
        : "#991b1b";

    const fmtNota = (n: number | null) => n !== null ? n.toFixed(1) : "—";
    const mediaColor = d.media !== null && d.media >= d.nota_minima ? "#166534" : d.media !== null ? "#991b1b" : "#94a3b8";
    const freqColor = d.frequencia_pct >= d.frequencia_min ? "#166534" : "#991b1b";

    return `
      <tr>
        <td class="disc">
          <strong>${d.discipline_nome}</strong>
          ${d.professor_nome ? `<br><small>Prof. ${d.professor_nome}</small>` : ""}
        </td>
        <td class="center">${d.carga_horaria}h</td>
        <td class="center">${fmtNota(d.ap1)}</td>
        <td class="center">${fmtNota(d.ap2)}</td>
        <td class="center">${fmtNota(d.final)}</td>
        <td class="center">${fmtNota(d.recuperacao)}</td>
        <td class="center media" style="color:${mediaColor}">${fmtNota(d.media)}</td>
        <td class="center" style="color:${freqColor}">${d.frequencia_pct.toFixed(1)}%<br><small>${d.presencas}/${d.total_aulas}</small></td>
        <td class="center"><span class="badge" style="color:${statusColor}">${situacaoLabel}</span></td>
      </tr>
    `;
  }).join("");

  const aprovadas = boletim.disciplinas.filter((d) => d.situacao === "APROVADO").length;
  const totalDisc = boletim.disciplinas.length;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Boletim — ${boletim.party_nome}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; font-size: 13px; color: #1C2833; background: #fff; padding: 40px 48px; }

    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #4A7DB5; padding-bottom: 18px; margin-bottom: 24px; }
    .header-logo { font-size: 20px; font-weight: 900; color: #4A7DB5; }
    .header-sub  { font-size: 11px; color: #5D6D7E; margin-top: 4px; }
    .header-date { font-size: 11px; color: #5D6D7E; text-align: right; }

    .aluno-box { background: #EBF2F8; border-radius: 10px; padding: 16px 20px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
    .aluno-nome { font-size: 18px; font-weight: 800; color: #1C2833; }
    .aluno-mat  { font-size: 12px; color: #5D6D7E; margin-top: 2px; }
    .aluno-sem  { font-size: 13px; font-weight: 700; color: #4A7DB5; }

    .stats { display: flex; gap: 16px; margin-bottom: 24px; }
    .stat { border: 1.5px solid #C8D6E5; border-radius: 8px; padding: 12px 18px; text-align: center; }
    .stat-val { font-size: 22px; font-weight: 900; }
    .stat-lbl { font-size: 11px; color: #5D6D7E; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
    th { background: #F4F8FC; padding: 9px 10px; font-size: 11px; font-weight: 700; color: #5D6D7E; text-align: left; border-bottom: 2px solid #C8D6E5; }
    th.center, td.center { text-align: center; }
    td { padding: 9px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    td.disc { max-width: 220px; }
    td.disc small { color: #5D6D7E; font-size: 11px; }
    td.media { font-size: 15px; font-weight: 800; }
    td small { font-size: 11px; color: #94a3b8; display: block; }
    .badge { font-size: 11px; font-weight: 700; }

    .footer { border-top: 1px solid #C8D6E5; padding-top: 16px; font-size: 11px; color: #94a3b8; text-align: center; }

    @media print {
      body { padding: 20px 28px; }
      @page { margin: 18mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="header-logo">IgrejasWeb System OS</div>
      <div class="header-sub">Escola Teológica — Boletim Acadêmico</div>
    </div>
    <div class="header-date">Emitido em ${dataAtual}</div>
  </div>

  <div class="aluno-box">
    <div>
      <div class="aluno-nome">${boletim.party_nome}</div>
      <div class="aluno-mat">Matrícula #${boletim.party_matricula}</div>
    </div>
    <div class="aluno-sem">${boletim.semester_nome}</div>
  </div>

  <div class="stats">
    <div class="stat"><div class="stat-val">${totalDisc}</div><div class="stat-lbl">Disciplinas</div></div>
    <div class="stat"><div class="stat-val" style="color:#166534">${aprovadas}</div><div class="stat-lbl">Aprovadas</div></div>
    <div class="stat"><div class="stat-val" style="color:${totalDisc - aprovadas > 0 ? "#dc2626" : "#94a3b8"}">${totalDisc - aprovadas}</div><div class="stat-lbl">Pendentes</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Disciplina</th>
        <th class="center">CH</th>
        <th class="center">AP1</th>
        <th class="center">AP2</th>
        <th class="center">Final</th>
        <th class="center">Rec</th>
        <th class="center">Média</th>
        <th class="center">Freq.</th>
        <th class="center">Situação</th>
      </tr>
    </thead>
    <tbody>${linhas}</tbody>
  </table>

  <div class="footer">
    Documento gerado automaticamente pelo IgrejasWeb System OS · ${dataAtual}
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
