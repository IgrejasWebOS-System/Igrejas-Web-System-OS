import { NextRequest, NextResponse } from "next/server";
import { getAuthContext }            from "@/utils/supabase/auth-context";
import { sanitizeHtmlServer }        from "@/utils/sanitize-server";
import { buscarCredencialAction }    from "@/app/dashboard/secretaria/credenciais/actions";

// Gera HTML de impressão da credencial (mesmo padrão do módulo de documentos)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getAuthContext();
  if (!ctx) return new NextResponse("Não autorizado", { status: 401 });

  const { id } = await params;
  const { data: cred, error } = await buscarCredencialAction(id);
  if (error || !cred) return new NextResponse("Credencial não encontrada.", { status: 404 });

  const model = cred.model;
  if (!model.template_html)
    return new NextResponse("Modelo sem template definido.", { status: 422 });

  // Substituir variáveis
  const validade = cred.data_validade
    ? new Date(cred.data_validade + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : "—";

  const emissao = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  const vars: Record<string, string> = {
    "{{nome}}":         cred.membro_nome,
    "{{cpf}}":          cred.membro_cpf ?? "—",
    "{{cargo}}":        cred.cargo_nome ?? "—",
    "{{matricula}}":    cred.membro_matricula ?? "—",
    "{{unidade}}":      cred.unit_nome ?? "—",
    "{{ministerio}}":   cred.ministry_name,
    "{{data_emissao}}": emissao,
    "{{data_validade}}":validade,
    "{{foto_url}}":     cred.membro_foto
      ? `<img src="${cred.membro_foto}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid #4A7DB5" alt="Foto" />`
      : `<div style="width:80px;height:80px;border-radius:50%;background:#dbeafe;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:800;color:#1e40af">${cred.membro_nome.charAt(0)}</div>`,
  };

  let rawHtml = model.template_html;
  for (const [k, v] of Object.entries(vars)) rawHtml = rawHtml.replaceAll(k, v);

  const bodyContent = await sanitizeHtmlServer(rawHtml);

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Credencial — ${cred.membro_nome}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', Arial, sans-serif;
    font-size: 11pt;
    color: #1C2833;
    background: #f0f4f8;
  }
  .screen-bar {
    max-width: 520px; margin: 24px auto 0;
    display: flex; gap: 10px; align-items: center; justify-content: flex-end; padding: 0 4px;
  }
  .screen-bar button {
    background: #2563eb; color: #fff; border: none; border-radius: 8px;
    padding: 8px 18px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit;
  }
  .screen-bar a {
    font-size: 13px; color: #64748b; text-decoration: none;
    padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff;
  }
  /* Credencial: formato cartão (85.6×54mm = ~324×204px @96dpi ou ~243×153@72dpi) */
  .credential-card {
    width: 85.6mm; max-width: 100%;
    margin: 24px auto;
    background: #fff;
    border-radius: 10px;
    box-shadow: 0 6px 32px rgba(0,0,0,.18);
    overflow: hidden;
  }
  .cred-header {
    background: linear-gradient(135deg, #1e40af 0%, #4A7DB5 100%);
    color: #fff;
    padding: 10px 12px 8px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .cred-header-ministry { font-size: 7pt; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; opacity: .85; }
  .cred-header-type     { font-size: 10pt; font-weight: 900; margin-top: 2px; }
  .cred-logo { width: 28px; height: 28px; background: rgba(255,255,255,.2); border-radius: 6px; display:flex; align-items:center; justify-content:center; font-size: 10px; font-weight: 900; }
  .cred-body {
    padding: 12px 14px;
  }
  .doc-body { line-height: 1.7; font-size: 10pt; color: #1C2833; }
  .doc-body p { margin-bottom: 8px; }
  .cred-footer {
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    padding: 6px 14px;
    display: flex;
    justify-content: space-between;
    font-size: 7pt;
    color: #94a3b8;
  }
  .validity {
    font-size: 8pt;
    font-weight: 700;
    color: #1e40af;
  }
  @media print {
    html, body { background: #fff !important; }
    .screen-bar { display: none !important; }
    .credential-card { box-shadow: none; margin: 0 auto; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page { size: 86mm 200mm; margin: 4mm; }
  }
</style>
</head>
<body>
<div class="screen-bar">
  <a href="/dashboard/secretaria/credenciais">← Voltar</a>
  <button onclick="window.print()">Imprimir / Salvar PDF</button>
</div>

<div class="credential-card">
  <div class="cred-header">
    <div>
      <div class="cred-header-ministry">${cred.ministry_name}</div>
      <div class="cred-header-type">${model.nome}</div>
    </div>
    <div class="cred-logo">IW</div>
  </div>
  <div class="cred-body">
    <div class="doc-body">${bodyContent}</div>
    ${cred.data_validade ? `<div class="validity" style="margin-top:8px">Válido até: ${validade}</div>` : ""}
  </div>
  <div class="cred-footer">
    <span>IgrejasWeb System OS</span>
    <span>${cred.situacao}</span>
  </div>
</div>

<script>
  window.addEventListener('load', () => setTimeout(() => window.print(), 400));
</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
