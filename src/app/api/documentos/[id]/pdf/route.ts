import { NextRequest, NextResponse }  from "next/server";
import { createClient }               from "@/utils/supabase/server";
import { getAuthContext }             from "@/utils/supabase/auth-context";
import { sanitizeHtmlServer }         from "@/utils/sanitize-server";

// Retorna o documento emitido como HTML pronto para impressão (print CSS)
// O conteudo_html já foi gerado com variáveis substituídas na emissão.
// Este endpoint apenas o serve com um wrapper de página + CSS de impressão.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // SEC-1: autorização via app_metadata (JWT), não via cookie
  const ctx = await getAuthContext();
  if (!ctx) return new NextResponse("Não autorizado", { status: 401 });

  const { id: documentId } = await params;
  const supabase = await createClient();

  // Busca documento + joins
  const { data: doc, error } = await supabase
    .from("documents")
    .select(`
      *,
      document_types ( nome, slug, requer_assinatura ),
      parties ( full_name, cpf ),
      units ( name )
    `)
    .eq("id", documentId)
    .eq("ministry_id", ctx.ministry_id)
    .eq("is_active", true)
    .single();

  if (error || !doc)
    return new NextResponse("Documento não encontrado", { status: 404 });

  const d = doc as any;
  const docName = d.document_types?.nome ?? "Documento";
  const memberName = d.parties?.full_name ?? "Membro";
  const protocolo = d.numero_protocolo ?? "";
  const dataEmissao = new Date(d.data_emissao + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });
  const requerAssinatura = d.document_types?.requer_assinatura ?? false;

  // SEC-7: sanitizar HTML antes de servir — previne XSS mesmo em conteúdo salvo
  const rawHtml = d.conteudo_html ?? `<p>Conteúdo não disponível.</p>`;
  const bodyContent = await sanitizeHtmlServer(rawHtml);

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${docName} — ${memberName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', Arial, sans-serif;
    font-size: 11pt;
    color: #1C2833;
    background: #f0f4f8;
  }

  /* ── Wrapper de impressão ── */
  .print-page {
    max-width: 800px;
    margin: 24px auto;
    background: #fff;
    padding: 48px;
    border-radius: 12px;
    box-shadow: 0 4px 24px rgba(0,0,0,.10);
  }

  /* ── Barra superior (só na tela) ── */
  .screen-bar {
    max-width: 800px;
    margin: 24px auto 0;
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: flex-end;
    padding: 0 4px;
  }
  .screen-bar button {
    background: #2563eb;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 8px 20px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .screen-bar button:hover { background: #1d4ed8; }
  .screen-bar a {
    font-size: 13px;
    color: #64748b;
    text-decoration: none;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    background: #fff;
  }
  .screen-bar a:hover { background: #f8fafc; }

  /* ── Cabeçalho do documento ── */
  .doc-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 16px;
    border-bottom: 2px solid #4A7DB5;
    margin-bottom: 24px;
  }
  .doc-title-label {
    font-size: 7.5pt;
    font-weight: 800;
    color: #4A7DB5;
    text-transform: uppercase;
    letter-spacing: .12em;
    margin-bottom: 4px;
  }
  .doc-ministry {
    font-size: 15pt;
    font-weight: 900;
    color: #1C2833;
  }
  .doc-meta {
    text-align: right;
    font-size: 8.5pt;
    color: #5D6D7E;
    line-height: 1.7;
  }
  .doc-meta .protocolo {
    font-family: 'Courier New', monospace;
    font-size: 9pt;
    font-weight: 700;
    color: #1C2833;
    background: #F4F8FC;
    border: 1px solid #C8D6E5;
    border-radius: 4px;
    padding: 2px 8px;
    display: inline-block;
    margin-top: 2px;
  }

  /* ── Conteúdo principal do documento ── */
  .doc-body {
    min-height: 200px;
    line-height: 1.9;
    font-size: 11.5pt;
    color: #1C2833;
    text-align: justify;
  }

  /* Estilos internos dos templates emitidos */
  .doc-body p { margin-bottom: 12px; }
  .doc-body strong { font-weight: 700; }

  /* ── Bloco de assinaturas ── */
  .signatures {
    margin-top: 56px;
    display: flex;
    justify-content: space-between;
    gap: 40px;
  }
  .sig-block {
    flex: 1;
    text-align: center;
  }
  .sig-line {
    border-top: 1px solid #1C2833;
    padding-top: 6px;
    font-size: 8.5pt;
    color: #5D6D7E;
    margin-top: 48px;
  }
  .sig-name {
    font-size: 9pt;
    font-weight: 700;
    color: #1C2833;
    margin-top: 2px;
  }

  /* ── Rodapé ── */
  .doc-footer {
    margin-top: 32px;
    padding-top: 12px;
    border-top: 1px solid #C8D6E5;
    display: flex;
    justify-content: space-between;
    font-size: 8pt;
    color: #94a3b8;
  }

  /* ── Print ── */
  @media print {
    html, body { background: #fff !important; }
    .screen-bar { display: none !important; }
    .print-page {
      box-shadow: none;
      border-radius: 0;
      margin: 0;
      padding: 1.5cm 2cm;
      max-width: 100%;
    }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page { size: A4; margin: 0; }
  }
</style>
</head>
<body>

<!-- Barra de ações (só na tela) -->
<div class="screen-bar">
  <a href="/dashboard/secretaria">← Voltar</a>
  <button onclick="window.print()">
    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
    </svg>
    Imprimir / Salvar PDF
  </button>
</div>

<!-- Documento -->
<div class="print-page">

  <!-- Cabeçalho -->
  <div class="doc-header">
    <div>
      <div class="doc-title-label">${docName}</div>
      <div class="doc-ministry">${ctx.ministry_name}</div>
    </div>
    <div class="doc-meta">
      <div>Emitido em: ${dataEmissao}</div>
      ${protocolo ? `<div class="protocolo">${protocolo}</div>` : ""}
    </div>
  </div>

  <!-- Conteúdo gerado do template -->
  <div class="doc-body">
    ${bodyContent}
  </div>

  ${requerAssinatura ? `
  <!-- Assinaturas -->
  <div class="signatures">
    <div class="sig-block">
      <div class="sig-line">
        <div>Secretário(a) do Ministério</div>
      </div>
    </div>
    <div class="sig-block">
      <div class="sig-line">
        <div>Pastor(a) Responsável</div>
      </div>
    </div>
  </div>` : ""}

  <!-- Rodapé -->
  <div class="doc-footer">
    <span>IgrejasWeb System OS · Documento gerado automaticamente</span>
    <span>${ctx.ministry_name}</span>
  </div>

</div>

<script>
  window.addEventListener('load', () => setTimeout(() => window.print(), 400));
</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
