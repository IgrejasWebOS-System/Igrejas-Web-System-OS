import { NextRequest, NextResponse } from "next/server";
import { createClient }              from "@/utils/supabase/server";
import { getAuthContext }            from "@/utils/supabase/auth-context";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ cursoId: string; enrollmentId: string }> },
) {
  const ctx = await getAuthContext();
  if (!ctx) return new NextResponse("Não autorizado", { status: 401 });

  const { cursoId, enrollmentId } = await params;
  const supabase = await createClient();

  // Validar que enrollment pertence ao ministério
  const { data: enr } = await supabase
    .from("course_enrollments")
    .select("*")
    .eq("id", enrollmentId)
    .eq("course_id", cursoId)
    .eq("ministry_id", ctx.ministry_id)
    .eq("status", "CONCLUIDO")
    .single();

  if (!enr) return new NextResponse("Certificado não disponível", { status: 404 });

  // Buscar certificado
  const { data: cert } = await supabase
    .from("course_certificates")
    .select("*")
    .eq("enrollment_id", enrollmentId)
    .single();

  if (!cert) return new NextResponse("Certificado não emitido", { status: 404 });

  // Buscar curso
  const { data: curso } = await supabase
    .from("courses")
    .select("*")
    .eq("id", cursoId)
    .eq("ministry_id", ctx.ministry_id)
    .single();

  if (!curso) return new NextResponse("Curso não encontrado", { status: 404 });

  // Buscar participante
  const { data: party } = await supabase
    .from("parties")
    .select("id, full_name")
    .eq("id", enr.party_id)
    .single();

  // Buscar instrutor
  let instrutorNome = "—";
  if (curso.instrutor_party_id) {
    const { data: inst } = await supabase
      .from("parties")
      .select("full_name")
      .eq("id", curso.instrutor_party_id)
      .single();
    instrutorNome = inst?.full_name ?? "—";
  }

  // Buscar ministério
  const { data: ministry } = await supabase
    .from("ministries")
    .select("name")
    .eq("id", ctx.ministry_id)
    .single();

  // Calcular frequência
  const { data: lessons } = await supabase
    .from("course_lessons")
    .select("id")
    .eq("course_id", cursoId)
    .eq("ministry_id", ctx.ministry_id);

  const { data: attends } = await supabase
    .from("course_attendance")
    .select("presente")
    .eq("enrollment_id", enrollmentId);

  const totalAulas = lessons?.length ?? 0;
  const presencas  = (attends ?? []).filter((a) => a.presente).length;
  const freqPct    = totalAulas > 0 ? Math.round((presencas / totalAulas) * 100) : 100;

  const emitidoEm  = new Date(cert.emitido_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const concluidoEm = enr.concluido_em
    ? new Date(enr.concluido_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : emitidoEm;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Certificado — ${curso.titulo}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&family=Playfair+Display:wght@700;900&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      background: #f8fafc;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; font-family: 'Inter', sans-serif;
      padding: 40px 20px;
    }

    .cert {
      background: #fff;
      width: 800px;
      min-height: 560px;
      border: 3px solid #1C2833;
      border-radius: 4px;
      padding: 0;
      position: relative;
      overflow: hidden;
      box-shadow: 0 8px 40px rgba(0,0,0,.12);
    }

    .cert-border {
      position: absolute; inset: 10px;
      border: 1.5px solid #4A7DB5;
      border-radius: 2px;
      pointer-events: none;
    }

    .cert-header {
      background: #1C2833;
      color: #fff;
      text-align: center;
      padding: 28px 40px 22px;
    }

    .ministry-name {
      font-size: 13px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #94a3b8;
      margin-bottom: 6px;
    }

    .cert-title {
      font-family: 'Playfair Display', serif;
      font-size: 38px;
      font-weight: 900;
      color: #fff;
      letter-spacing: 0.04em;
    }

    .cert-body {
      padding: 40px 56px 36px;
      text-align: center;
    }

    .cert-label {
      font-size: 13px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .cert-name {
      font-family: 'Playfair Display', serif;
      font-size: 32px;
      font-weight: 700;
      color: #1C2833;
      margin-bottom: 28px;
      padding-bottom: 20px;
      border-bottom: 1.5px solid #e2e8f0;
    }

    .cert-text {
      font-size: 15px;
      color: #374151;
      line-height: 1.8;
      margin-bottom: 28px;
    }

    .cert-text strong {
      color: #1C2833;
      font-weight: 700;
    }

    .cert-stats {
      display: flex;
      justify-content: center;
      gap: 40px;
      margin-bottom: 36px;
      padding: 16px 0;
      border-top: 1px solid #f1f5f9;
      border-bottom: 1px solid #f1f5f9;
    }

    .stat-item { text-align: center; }
    .stat-value { font-size: 22px; font-weight: 800; color: #4A7DB5; }
    .stat-label { font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 2px; }

    .cert-footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding: 0 56px 32px;
      margin-top: 8px;
    }

    .signature-block { text-align: center; }
    .signature-line {
      width: 180px; border-bottom: 1.5px solid #1C2833;
      margin: 0 auto 8px;
    }
    .signature-name { font-size: 12px; font-weight: 700; color: "#1C2833"; }
    .signature-role { font-size: 11px; color: #94a3b8; }

    .cert-id {
      font-size: 10px; color: #cbd5e1;
      font-family: monospace;
      text-align: right;
    }

    @media print {
      body { background: #fff; padding: 0; }
      .cert { width: 100%; min-height: auto; box-shadow: none; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="cert">
    <div class="cert-border"></div>

    <div class="cert-header">
      <div class="ministry-name">${ministry?.name ?? ""}</div>
      <div class="cert-title">Certificado de Conclusão</div>
    </div>

    <div class="cert-body">
      <p class="cert-label">Certificamos que</p>
      <div class="cert-name">${party?.full_name ?? ""}</div>

      <p class="cert-text">
        concluiu com êxito o curso <strong>"${curso.titulo}"</strong>,
        ${curso.categoria !== "GERAL" ? `na categoria <strong>${curso.categoria}</strong>,` : ""}
        com carga horária de <strong>${curso.carga_horaria} horas</strong>,
        sob instrução de <strong>${instrutorNome}</strong>.
        A conclusão foi registrada em <strong>${concluidoEm}</strong>.
      </p>

      <div class="cert-stats">
        <div class="stat-item">
          <div class="stat-value">${curso.carga_horaria}h</div>
          <div class="stat-label">Carga Horária</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${presencas}/${totalAulas}</div>
          <div class="stat-label">Presenças</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${freqPct}%</div>
          <div class="stat-label">Frequência</div>
        </div>
      </div>
    </div>

    <div class="cert-footer">
      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-name">${instrutorNome}</div>
        <div class="signature-role">Instrutor(a)</div>
      </div>

      <div class="cert-id">
        Certificado Nº ${cert.id.slice(0, 8).toUpperCase()}<br/>
        Emitido em: ${emitidoEm}
      </div>

      <div class="signature-block">
        <div class="signature-line"></div>
        <div class="signature-name">${ministry?.name ?? ""}</div>
        <div class="signature-role">Instituição</div>
      </div>
    </div>
  </div>

  <div class="no-print" style="margin-top: 20px; text-align: center;">
    <button onclick="window.print()" style="background:#4A7DB5;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-weight:600;font-size:14px;cursor:pointer;">
      🖨️ Imprimir / Salvar PDF
    </button>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
