import { NextRequest, NextResponse } from "next/server";
import { createClient }              from "@/utils/supabase/server";
import { getAuthContext }            from "@/utils/supabase/auth-context";
import { isSafeImageUrl }            from "@/utils/privacy"; // SEC-9

// Gera a ficha do membro como PDF usando HTML → print CSS
// Retorna o HTML que o browser imprime / converte via window.print()
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // SEC-1: autorização via app_metadata (JWT), não via cookie
  const ctx = await getAuthContext();
  if (!ctx) return new NextResponse("Não autorizado", { status: 401 });

  const { id: partyId } = await params;
  const supabase = await createClient();

  // Busca dados do membro
  const { data: party } = await supabase
    .from("parties")
    .select("*")
    .eq("id", partyId)
    .eq("ministry_id", ctx.ministry_id)
    .maybeSingle();

  if (!party) return new NextResponse("Membro não encontrado", { status: 404 });

  const { data: pm } = await supabase
    .from("party_members")
    .select(`*, member_cargos(nome), units(name), member_genders(nome), member_civil_status(nome), member_schooling(nome), member_professions(nome)`)
    .eq("party_id", partyId)
    .eq("ministry_id", ctx.ministry_id)
    .maybeSingle();

  const { data: funcoes } = await supabase
    .from("party_funcoes")
    .select(`*, departments(nome, sigla), member_funcoes_lookup(nome)`)
    .eq("party_id", partyId)
    .eq("ministry_id", ctx.ministry_id)
    .eq("is_ativo", true);

  const { data: history } = await supabase
    .from("member_history")
    .select("*")
    .eq("party_id", partyId)
    .eq("ministry_id", ctx.ministry_id)
    .order("criado_em", { ascending: false })
    .limit(10);

  function fmt(d: string | null | undefined) {
    if (!d) return "—";
    return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
  }

  function fmtCpf(cpf: string | null) {
    if (!cpf) return "—";
    const c = cpf.replace(/\D/g, "");
    return c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }

  const SITUACAO_LABEL: Record<string, string> = {
    ATIVO: "Ativo", INATIVO: "Inativo", EM_OBSERVACAO: "Em Observação",
    SUSPENSO: "Suspenso", DESLIGADO: "Desligado",
  };

  const SITUACAO_COLOR: Record<string, string> = {
    ATIVO: "#16a34a", INATIVO: "#475569", EM_OBSERVACAO: "#d97706",
    SUSPENSO: "#dc2626", DESLIGADO: "#be185d",
  };

  const situacaoCor = SITUACAO_COLOR[pm?.situacao ?? ""] ?? "#475569";
  const situacaoLabel = SITUACAO_LABEL[pm?.situacao ?? ""] ?? pm?.situacao ?? "—";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Ficha do Membro — ${party.full_name}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', Arial, sans-serif; font-size: 11pt; color: #1C2833; background: #fff; }
  .page { max-width: 800px; margin: 0 auto; padding: 32px; }

  /* HEADER */
  .doc-header { display: flex; justify-content: space-between; align-items: center;
    padding-bottom: 16px; border-bottom: 2px solid #4A7DB5; margin-bottom: 20px; }
  .doc-title { font-size: 9pt; font-weight: 800; color: #4A7DB5; text-transform: uppercase;
    letter-spacing: .1em; }
  .ministry-name { font-size: 14pt; font-weight: 900; color: #1C2833; margin-top: 2px; }
  .doc-date { font-size: 9pt; color: #5D6D7E; text-align: right; }

  /* IDENTITY BLOCK */
  .identity { display: flex; gap: 20px; align-items: flex-start;
    background: #F4F8FC; border: 1px solid #C8D6E5; border-radius: 10px;
    padding: 16px; margin-bottom: 20px; }
  .avatar { width: 80px; height: 80px; border-radius: 50%; background: #EBF2F8;
    border: 3px solid ${situacaoCor}; display: flex; align-items: center; justify-content: center;
    font-size: 22pt; font-weight: 900; color: #4A7DB5; flex-shrink: 0; overflow: hidden; }
  .avatar img { width: 100%; height: 100%; object-fit: cover; }
  .identity-info { flex: 1; }
  .member-name { font-size: 16pt; font-weight: 900; color: #1C2833; margin-bottom: 4px; }
  .identity-meta { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 99px;
    font-size: 8pt; font-weight: 700; }
  .matricula { font-family: 'Courier New', monospace; font-size: 11pt;
    font-weight: 700; color: #4A7DB5; }

  /* SECTIONS */
  .section { margin-bottom: 18px; }
  .sec-title { font-size: 8pt; font-weight: 800; color: #4A7DB5;
    text-transform: uppercase; letter-spacing: .1em;
    padding-bottom: 4px; border-bottom: 1px solid #C8D6E5; margin-bottom: 10px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; }
  .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px 16px; }
  .field { }
  .f-label { font-size: 7.5pt; font-weight: 700; color: #5D6D7E;
    text-transform: uppercase; letter-spacing: .05em; }
  .f-value { font-size: 10pt; color: #1C2833; margin-top: 1px; }

  /* FUNCOES */
  .funcao-item { display: flex; gap: 10px; align-items: flex-start;
    padding: 7px 10px; background: #f0fdf4; border: 1px solid #bbf7d0;
    border-radius: 7px; margin-bottom: 6px; }
  .funcao-dot { width: 6px; height: 6px; border-radius: 50%; background: #16a34a;
    margin-top: 4px; flex-shrink: 0; }

  /* HISTORICO */
  .hist-item { display: flex; gap: 12px; padding: 6px 0;
    border-bottom: 1px solid #F4F8FC; }
  .hist-date { font-size: 8pt; color: #5D6D7E; width: 90px; flex-shrink: 0; }
  .hist-text { font-size: 9pt; flex: 1; }

  /* FOOTER */
  .doc-footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #C8D6E5;
    display: flex; justify-content: space-between; font-size: 8pt; color: #5D6D7E; }
  .signature-line { border-top: 1px solid #1C2833; width: 180px; padding-top: 4px;
    font-size: 8pt; text-align: center; margin-top: 32px; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page { size: A4; margin: 1.5cm; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER DO DOCUMENTO -->
  <div class="doc-header">
    <div>
      <div class="doc-title">Ficha Eclesiástica do Membro</div>
      <div class="ministry-name">${ctx.ministry_name}</div>
    </div>
    <div class="doc-date">
      Emitido em: ${new Date().toLocaleDateString("pt-BR")}<br>
      Protocolo: IW-${Date.now().toString(36).toUpperCase()}
    </div>
  </div>

  <!-- IDENTIDADE -->
  <div class="identity">
    <div class="avatar">
      ${pm?.foto_url && isSafeImageUrl(pm.foto_url)
        ? `<img src="${pm.foto_url}" alt="Foto">`
        : party.full_name.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase()
      }
    </div>
    <div class="identity-info">
      <div class="member-name">${party.full_name}</div>
      <div class="identity-meta">
        <span class="badge" style="background:${situacaoCor}22;color:${situacaoCor};">${situacaoLabel}</span>
        ${pm?.matricula
          ? `<span class="matricula">Matrícula: ${pm.matricula}</span>`
          : pm?.codigo_provisorio
            ? `<span style="color:#5D6D7E;font-size:9pt;">Código Prov.: ${pm.codigo_provisorio}</span>`
            : ""}
        ${(pm as any)?.member_cargos?.nome
          ? `<span style="font-size:9pt;color:#1C2833;">· ${(pm as any).member_cargos.nome}</span>`
          : ""}
        ${(pm as any)?.units?.name
          ? `<span style="font-size:9pt;color:#5D6D7E;">· ${(pm as any).units.name}</span>`
          : ""}
      </div>
    </div>
  </div>

  <!-- DADOS PESSOAIS -->
  <div class="section">
    <div class="sec-title">Dados Pessoais</div>
    <div class="grid3">
      <div class="field"><div class="f-label">CPF</div><div class="f-value">${fmtCpf(party.cpf)}</div></div>
      <div class="field"><div class="f-label">RG</div><div class="f-value">${party.rg ?? "—"}</div></div>
      <div class="field"><div class="f-label">Nascimento</div><div class="f-value">${fmt(party.birth_date)}</div></div>
      <div class="field"><div class="f-label">Gênero</div><div class="f-value">${(pm as any)?.member_genders?.nome ?? "—"}</div></div>
      <div class="field"><div class="f-label">Estado Civil</div><div class="f-value">${(pm as any)?.member_civil_status?.nome ?? "—"}</div></div>
      <div class="field"><div class="f-label">Escolaridade</div><div class="f-value">${(pm as any)?.member_schooling?.nome ?? "—"}</div></div>
      <div class="field"><div class="f-label">Profissão</div><div class="f-value">${(pm as any)?.member_professions?.nome ?? "—"}</div></div>
      <div class="field"><div class="f-label">Celular</div><div class="f-value">${pm?.celular ?? "—"}</div></div>
      <div class="field"><div class="f-label">E-mail</div><div class="f-value">${party.email ?? "—"}</div></div>
    </div>
  </div>

  <!-- FICHA ECLESIAL -->
  <div class="section">
    <div class="sec-title">Ficha Eclesial</div>
    <div class="grid3">
      <div class="field"><div class="f-label">Data de Ingresso</div><div class="f-value">${fmt(pm?.data_ingresso)}</div></div>
      <div class="field"><div class="f-label">Batismo nas Águas</div><div class="f-value">${fmt(pm?.data_batismo_aguas)}</div></div>
      <div class="field"><div class="f-label">Batismo no Espírito</div><div class="f-value">${fmt(pm?.data_batismo_espirito)}</div></div>
      <div class="field"><div class="f-label">Igreja de Origem</div><div class="f-value">${pm?.igreja_origem ?? "—"}</div></div>
      <div class="field"><div class="f-label">Matrícula Legado</div><div class="f-value">${pm?.matricula_legado ?? "—"}</div></div>
    </div>
  </div>

  <!-- FUNÇÕES DEPARTAMENTAIS -->
  ${(funcoes ?? []).length > 0 ? `
  <div class="section">
    <div class="sec-title">Funções Departamentais Ativas</div>
    ${(funcoes ?? []).map((f: any) => `
      <div class="funcao-item">
        <div class="funcao-dot"></div>
        <div>
          <strong style="font-size:9pt;">${f.member_funcoes_lookup?.nome ?? "Membro"}</strong>
          <span style="color:#5D6D7E;font-size:9pt;"> — ${f.departments?.nome ?? ""}</span>
          ${f.data_inicio ? `<span style="font-size:8pt;color:#5D6D7E;"> · desde ${fmt(f.data_inicio)}</span>` : ""}
        </div>
      </div>
    `).join("")}
  </div>` : ""}

  <!-- HISTÓRICO DE SITUAÇÃO -->
  ${(history ?? []).length > 0 ? `
  <div class="section">
    <div class="sec-title">Histórico de Situação (últimas ocorrências)</div>
    ${(history ?? []).map((h: any) => `
      <div class="hist-item">
        <div class="hist-date">${new Date(h.criado_em).toLocaleDateString("pt-BR")}</div>
        <div class="hist-text">
          ${h.situacao_anterior
            ? `<strong>${SITUACAO_LABEL[h.situacao_anterior] ?? h.situacao_anterior}</strong> → <strong>${SITUACAO_LABEL[h.situacao_nova] ?? h.situacao_nova}</strong>`
            : `Cadastro: <strong>${SITUACAO_LABEL[h.situacao_nova] ?? h.situacao_nova}</strong>`}
          ${h.motivo ? ` · ${h.motivo}` : ""}
        </div>
      </div>
    `).join("")}
  </div>` : ""}

  <!-- ASSINATURA -->
  <div style="display:flex;justify-content:space-between;margin-top:40px;">
    <div class="signature-line">Secretário(a) do Ministério</div>
    <div class="signature-line">Pastor(a) Responsável</div>
  </div>

  <!-- RODAPÉ -->
  <div class="doc-footer">
    <span>IgrejasWeb System OS · Documento gerado automaticamente</span>
    <span>${ctx.ministry_name} · ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</span>
  </div>

</div>

<script>
  // Auto-abre diálogo de impressão após carregar
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
