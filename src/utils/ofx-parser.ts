/**
 * Minimal OFX/QFX parser — suporta OFX 1.x (SGML) e 2.x (XML)
 * Retorna as transações do extrato sem dependência externa.
 */

export type OFXTransaction = {
  fitid:    string;
  data:     string;   // YYYY-MM-DD
  valor:    number;   // positivo=crédito, negativo=débito
  descricao: string;
  memo:     string;
  tipo:     "DEBITO" | "CREDITO" | "OUTRO";
};

export type OFXResult = {
  banco:     string | null;
  agencia:   string | null;
  conta:     string | null;
  data_inicio: string | null;
  data_fim:    string | null;
  moeda:     string | null;
  transacoes: OFXTransaction[];
};

function ofxDate(raw: string): string {
  // OFX: YYYYMMDD ou YYYYMMDDHHMMSS[offset]
  const d = raw.trim().replace(/[^0-9]/g, "").slice(0, 8);
  if (d.length < 8) return "";
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

function tag(content: string, name: string): string {
  const re = new RegExp(`<${name}[^>]*>([^<]*)`, "i");
  const m = content.match(re);
  return m ? m[1].trim() : "";
}

function tagAll(content: string, name: string): string[] {
  const re = new RegExp(`<${name}[^>]*>([^<]*)`, "gi");
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) results.push(m[1].trim());
  return results;
}

function blocks(content: string, name: string): string[] {
  const results: string[] = [];
  const openRe  = new RegExp(`<${name}[^>]*>`, "gi");
  const closeRe = new RegExp(`</${name}>`, "gi");
  let m: RegExpExecArray | null;
  while ((m = openRe.exec(content)) !== null) {
    const start = m.index + m[0].length;
    closeRe.lastIndex = start;
    const end = closeRe.exec(content);
    if (end) results.push(content.slice(start, end.index));
  }
  return results;
}

export function parseOFX(raw: string): OFXResult {
  // Normalise: remove BOM, trim header before <OFX>
  const ofxStart = raw.search(/<OFX/i);
  const content  = ofxStart >= 0 ? raw.slice(ofxStart) : raw;

  const banco   = tag(content, "FI") ? tag(blocks(content, "FI")[0] ?? "", "ORG") || tag(content, "BANKID") : tag(content, "BANKID");
  const agencia = tag(content, "BRANCHID") || null;
  const conta   = tag(content, "ACCTID") || null;
  const dtStart = tag(content, "DTSTART");
  const dtEnd   = tag(content, "DTEND");

  // Transações: blocos <STMTTRN>
  const txBlocks = blocks(content, "STMTTRN");
  const transacoes: OFXTransaction[] = txBlocks.map(b => {
    const trntype = tag(b, "TRNTYPE").toUpperCase();
    const valor   = parseFloat(tag(b, "TRNAMT").replace(",", ".")) || 0;
    const tipo: OFXTransaction["tipo"] =
      trntype === "DEBIT" || valor < 0 ? "DEBITO" :
      trntype === "CREDIT" || valor > 0 ? "CREDITO" : "OUTRO";

    return {
      fitid:    tag(b, "FITID") || crypto.randomUUID(),
      data:     ofxDate(tag(b, "DTPOSTED")),
      valor,
      descricao: tag(b, "NAME") || tag(b, "MEMO") || "",
      memo:      tag(b, "MEMO") || "",
      tipo,
    };
  });

  // Fallback: SGML flat (sem blocos fechados)
  if (transacoes.length === 0) {
    const fitids  = tagAll(content, "FITID");
    const datas   = tagAll(content, "DTPOSTED");
    const valores = tagAll(content, "TRNAMT");
    const nomes   = tagAll(content, "NAME");
    const memos   = tagAll(content, "MEMO");
    for (let i = 0; i < fitids.length; i++) {
      const valor = parseFloat((valores[i] ?? "0").replace(",", ".")) || 0;
      transacoes.push({
        fitid:    fitids[i] || crypto.randomUUID(),
        data:     ofxDate(datas[i] ?? ""),
        valor,
        descricao: nomes[i] ?? "",
        memo:      memos[i] ?? "",
        tipo:      valor < 0 ? "DEBITO" : valor > 0 ? "CREDITO" : "OUTRO",
      });
    }
  }

  return {
    banco:      banco || null,
    agencia,
    conta,
    data_inicio: dtStart ? ofxDate(dtStart) : null,
    data_fim:    dtEnd   ? ofxDate(dtEnd)   : null,
    moeda:      tag(content, "CURDEF") || null,
    transacoes,
  };
}
