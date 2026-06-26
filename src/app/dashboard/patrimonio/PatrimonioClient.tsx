"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  PatrimonyItemListItem,
  PatrimonyCategoria,
  PatrimonyStatus,
  PatrimonyAquisicaoTipo,
} from "@/types";
import {
  PATRIMONY_CATEGORIA_LABELS,
  PATRIMONY_CATEGORIA_ICONS,
  PATRIMONY_STATUS_COLORS,
  PATRIMONY_AQUISICAO_LABELS,
  PATRIMONY_AQUISICAO_INFO,
} from "@/types";
import {
  criarPatrimonyItemAction,
  buscarTaxaSugeridaAction,
} from "./actions";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDate(d: string) {
  if (!d) return "—";
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y}`;
}

const CATEGORIAS = Object.entries(PATRIMONY_CATEGORIA_LABELS) as [PatrimonyCategoria, string][];
const STATUS_LIST: PatrimonyStatus[] = ["ATIVO", "BAIXADO", "EM_MANUTENCAO", "TRANSFERIDO"];
const STATUS_LABELS: Record<PatrimonyStatus, string> = {
  ATIVO: "Ativo",
  BAIXADO: "Baixado",
  EM_MANUTENCAO: "Em Manutenção",
  TRANSFERIDO: "Transferido",
};

// Taxas fallback (usadas enquanto a RPC carrega ou se não houver regra no banco)
const TAXA_FALLBACK: Record<PatrimonyCategoria, number> = {
  IMOVEL:              2.5,
  VEICULO:            20.0,
  EQUIPAMENTO:        10.0,
  INFORMATICA:        20.0,
  INSTRUMENTO_MUSICAL: 5.0,
  MOVEL:              10.0,
  OUTRO:              10.0,
};

const TIPOS_AQUISICAO: PatrimonyAquisicaoTipo[] = [
  "COMPRA","DOACAO","BENEFICIAMENTO","PERMUTA","PRODUCAO_PROPRIA","TRANSFERENCIA_INTERNA",
];

type Props = {
  itens: PatrimonyItemListItem[];
  dashData: any;
  unidades: { id: string; name: string; unit_type: string }[];
  filter: { categoria?: string; status?: string; unit_id?: string; search?: string };
};

export default function PatrimonioClient({ itens, dashData, unidades, filter }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [modal, setModal]           = useState(false);
  const [catSel, setCatSel]         = useState<PatrimonyCategoria>("EQUIPAMENTO");
  const [tipoAquis, setTipoAquis]   = useState<PatrimonyAquisicaoTipo>("COMPRA");
  const [taxaSug, setTaxaSug]       = useState(TAXA_FALLBACK["EQUIPAMENTO"]);
  const [vidaUtilSug, setVidaUtilSug] = useState<number | null>(10);
  const [normaSug, setNormaSug]     = useState<string | null>(null);
  const [loadingTaxa, setLoadingTaxa] = useState(false);
  const [erro, setErro]             = useState("");

  async function buscarTaxa(cat: PatrimonyCategoria, tipo: PatrimonyAquisicaoTipo) {
    setLoadingTaxa(true);
    try {
      const res = await buscarTaxaSugeridaAction(cat, tipo);
      if (res) {
        setTaxaSug(Number(res.taxa_anual));
        setVidaUtilSug(res.vida_util_anos ?? null);
        setNormaSug(res.norma_referencia);
      } else {
        setTaxaSug(TAXA_FALLBACK[cat]);
        setVidaUtilSug(null);
        setNormaSug(null);
      }
    } catch {
      setTaxaSug(TAXA_FALLBACK[cat]);
    } finally {
      setLoadingTaxa(false);
    }
  }

  function handleCatChange(cat: PatrimonyCategoria) {
    setCatSel(cat);
    buscarTaxa(cat, tipoAquis);
  }

  function handleTipoChange(tipo: PatrimonyAquisicaoTipo) {
    setTipoAquis(tipo);
    buscarTaxa(catSel, tipo);
  }

  function submitNovo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("categoria", catSel);
    setErro("");
    startTransition(async () => {
      try {
        const id = await criarPatrimonyItemAction(fd);
        setModal(false);
        router.push(`/dashboard/patrimonio/${id}`);
      } catch (err: any) {
        setErro(err.message ?? "Erro ao cadastrar bem");
      }
    });
  }

  function applyFilter(key: string, value: string) {
    const p = new URLSearchParams(filter as any);
    if (value) p.set(key, value); else p.delete(key);
    router.push(`/dashboard/patrimonio?${p.toString()}`);
  }

  const totalItens = dashData?.total_itens ?? itens.length;
  const totalAquisicao = dashData?.total_valor_aquisicao ?? 0;
  const totalContabil  = dashData?.total_valor_contabil  ?? 0;
  const depreciacaoAcum = totalAquisicao - totalContabil;

  return (
    <div style={{ padding: "28px 28px", maxWidth: 1200 }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: "#4A7DB5", fontWeight: 600 }}>📦 Patrimônio</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1C2833", margin: 0 }}>Inventário de Bens</h1>
          <p style={{ color: "#5D6D7E", fontSize: 13, marginTop: 4 }}>Tombamento, depreciação e movimentações patrimoniais</p>
        </div>
        <button onClick={() => { setErro(""); setModal(true); }} style={btnStyle("#4A7DB5")}>
          + Novo Bem
        </button>
      </div>

      {/* Cards resumo */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total de Bens", value: totalItens, sub: "ativos no inventário", color: "#4A7DB5", isNum: true },
          { label: "Valor de Aquisição", value: fmtBRL(totalAquisicao), sub: "custo histórico", color: "#1C2833" },
          { label: "Valor Contábil", value: fmtBRL(totalContabil), sub: "após depreciações", color: "#166534" },
          { label: "Depreciação Acumulada", value: fmtBRL(depreciacaoAcum), sub: "total depreciado", color: "#dc2626" },
        ].map((c) => (
          <div key={c.label} style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: "14px 18px" }}>
            <p style={{ fontSize: 11, color: "#64748b", fontWeight: 600, margin: 0 }}>{c.label}</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: c.color, margin: "4px 0 2px" }}>{c.value}</p>
            <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Por categoria */}
      {dashData?.por_categoria?.length > 0 && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
          {dashData.por_categoria.map((c: any) => (
            <div key={c.categoria} style={{
              background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10,
              padding: "10px 16px", cursor: "pointer",
              outline: filter.categoria === c.categoria ? "2px solid #4A7DB5" : "none",
            }} onClick={() => applyFilter("categoria", filter.categoria === c.categoria ? "" : c.categoria)}>
              <div style={{ fontSize: 18 }}>{PATRIMONY_CATEGORIA_ICONS[c.categoria as PatrimonyCategoria]}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1C2833" }}>{PATRIMONY_CATEGORIA_LABELS[c.categoria as PatrimonyCategoria]}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{c.qtd} bens · {fmtBRL(c.valor)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Buscar por nome..."
          defaultValue={filter.search ?? ""}
          onKeyDown={(e) => {
            if (e.key === "Enter") applyFilter("search", (e.target as HTMLInputElement).value);
          }}
          style={{ ...inputStyle, width: 200 }}
        />
        <select
          value={filter.status ?? ""}
          onChange={(e) => applyFilter("status", e.target.value)}
          style={{ ...inputStyle, width: 160 }}
        >
          <option value="">Todos os status</option>
          {STATUS_LIST.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <select
          value={filter.unit_id ?? ""}
          onChange={(e) => applyFilter("unit_id", e.target.value)}
          style={{ ...inputStyle, width: 180 }}
        >
          <option value="">Todas as unidades</option>
          {unidades.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        {(filter.categoria || filter.status || filter.unit_id || filter.search) && (
          <button onClick={() => router.push("/dashboard/patrimonio")} style={{ padding: "7px 14px", border: "1.5px solid #e2e8f0", borderRadius: 8, background: "#fff", fontSize: 12, color: "#64748b", cursor: "pointer", fontWeight: 600 }}>
            Limpar filtros
          </button>
        )}
      </div>

      {/* Tabela de bens */}
      <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "100px 2fr 1fr 1fr 1fr 1fr 80px", background: "#0f172a", color: "#94a3b8", fontSize: 10, fontWeight: 700, textTransform: "uppercase", padding: "10px 16px" }}>
          <span>Tombamento</span>
          <span>Bem</span>
          <span>Categoria</span>
          <span>Valor Aquisição</span>
          <span>Valor Contábil</span>
          <span>Status</span>
          <span>Ficha</span>
        </div>

        {itens.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#64748b" }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>📦</div>
            <p style={{ fontWeight: 600 }}>Nenhum bem cadastrado</p>
            <p style={{ fontSize: 13 }}>Clique em "+ Novo Bem" para começar o inventário</p>
          </div>
        ) : itens.map((item) => {
          const sc = PATRIMONY_STATUS_COLORS[item.status] ?? { bg: "#f1f5f9", color: "#475569" };
          const perdaValor = ((item.valor_aquisicao - item.valor_contabil_atual) / item.valor_aquisicao * 100);
          return (
            <div key={item.id} style={{ display: "grid", gridTemplateColumns: "100px 2fr 1fr 1fr 1fr 1fr 80px", padding: "12px 16px", borderBottom: "1px solid #f1f5f9", alignItems: "center", fontSize: 13 }}>
              <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "#4A7DB5" }}>
                {item.numero_tombamento}
              </span>
              <div>
                <div style={{ fontWeight: 600, color: "#1C2833" }}>{item.nome}</div>
                {item.localizacao_nome && <div style={{ fontSize: 11, color: "#94a3b8" }}>📍 {item.localizacao_nome}</div>}
                {item.responsavel_nome && <div style={{ fontSize: 11, color: "#94a3b8" }}>👤 {item.responsavel_nome}</div>}
                <div style={{ fontSize: 11, color: "#94a3b8" }}>Adquirido: {fmtDate(item.data_aquisicao)}</div>
              </div>
              <div>
                <span style={{ fontSize: 18 }}>{PATRIMONY_CATEGORIA_ICONS[item.categoria]}</span>
                <div style={{ fontSize: 11, color: "#64748b" }}>{PATRIMONY_CATEGORIA_LABELS[item.categoria]}</div>
              </div>
              <div style={{ fontWeight: 600 }}>{fmtBRL(item.valor_aquisicao)}</div>
              <div>
                <div style={{ fontWeight: 700, color: item.valor_contabil_atual < item.valor_aquisicao * 0.3 ? "#dc2626" : "#166534" }}>
                  {fmtBRL(item.valor_contabil_atual)}
                </div>
                {perdaValor > 0 && (
                  <div style={{ fontSize: 10, color: "#94a3b8" }}>
                    -{perdaValor.toFixed(0)}% depreciado
                  </div>
                )}
              </div>
              <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: sc.bg, color: sc.color, width: "fit-content" }}>
                {STATUS_LABELS[item.status]}
              </span>
              <Link
                href={`/dashboard/patrimonio/${item.id}`}
                style={{ padding: "6px 10px", border: "1.5px solid #C8D6E5", borderRadius: 8, fontSize: 11, fontWeight: 600, color: "#4A7DB5", textDecoration: "none", textAlign: "center" }}
              >
                Ver →
              </Link>
            </div>
          );
        })}
      </div>

      {/* Modal novo bem */}
      {modal && (
        <div style={overlayStyle}>
          <div style={{ ...modalStyle, maxWidth: 580 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: "#1C2833" }}>Cadastrar Novo Bem</h2>

            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "8px 14px", marginBottom: 16, fontSize: 12, color: "#1d4ed8" }}>
              ℹ️ O número de tombamento será gerado automaticamente.
            </div>

            <form onSubmit={submitNovo} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label style={labelStyle}>
                Nome do Bem *
                <input name="nome" required style={inputStyle} placeholder="Ex: Teclado Roland FA-07" />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={labelStyle}>
                  Categoria *
                  <select value={catSel} onChange={(e) => handleCatChange(e.target.value as PatrimonyCategoria)} style={inputStyle}>
                    {CATEGORIAS.map(([v, l]) => <option key={v} value={v}>{PATRIMONY_CATEGORIA_ICONS[v]} {l}</option>)}
                  </select>
                </label>
                <label style={labelStyle}>
                  Unidade *
                  <select name="unit_id" required style={inputStyle}>
                    <option value="">Selecione...</option>
                    {unidades.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </label>
              </div>

              {/* TIPO DE AQUISIÇÃO — campo novo */}
              <label style={labelStyle}>
                Tipo de Aquisição *
                <select
                  name="tipo_aquisicao"
                  value={tipoAquis}
                  onChange={(e) => handleTipoChange(e.target.value as PatrimonyAquisicaoTipo)}
                  style={inputStyle}
                >
                  {TIPOS_AQUISICAO.map((t) => (
                    <option key={t} value={t}>{PATRIMONY_AQUISICAO_LABELS[t]}</option>
                  ))}
                </select>
                {tipoAquis && (
                  <span style={{ fontSize: 11, color: "#2563eb", marginTop: 3 }}>
                    {PATRIMONY_AQUISICAO_INFO[tipoAquis]}
                  </span>
                )}
              </label>

              {/* VALOR AVALIAÇÃO — aparece apenas para DOAÇÃO e PERMUTA */}
              {(tipoAquis === "DOACAO" || tipoAquis === "PERMUTA") && (
                <div style={{ background: "#fefce8", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 14px", fontSize: 12 }}>
                  <strong style={{ color: "#92400e" }}>⚖️ NBC TG 04 — Valor Justo Obrigatório</strong>
                  <p style={{ color: "#78350f", margin: "4px 0 0" }}>
                    Bens recebidos por doação ou permuta devem ser registrados pelo <strong>valor justo na data da entrada</strong> (Art. 16). Use laudo de avaliador ou pesquisa de mercado (ex: tabela FIPE para veículos).
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                    <label style={labelStyle}>
                      Valor de Avaliação (R$)
                      <input name="valor_avaliacao" type="number" step="0.01" min="0" style={inputStyle} placeholder="Valor justo apurado" />
                    </label>
                    <label style={labelStyle}>
                      Referência do Laudo
                      <input name="laudo_avaliacao" style={inputStyle} placeholder="Ex: FIPE Jun/2026 · Laudo CFC 123" />
                    </label>
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={labelStyle}>
                  {tipoAquis === "DOACAO" || tipoAquis === "PERMUTA" ? "Valor de Aquisição / Custo Histórico (R$)" : "Valor de Aquisição (R$) *"}
                  <input
                    name="valor_aquisicao"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    style={inputStyle}
                    placeholder="0,00"
                  />
                  {(tipoAquis === "DOACAO" || tipoAquis === "PERMUTA") && (
                    <span style={{ fontSize: 10, color: "#6b7280" }}>
                      Para cálculo de depreciação, use o Valor de Avaliação acima.
                    </span>
                  )}
                </label>
                <label style={labelStyle}>
                  Data de Aquisição *
                  <input name="data_aquisicao" type="date" required style={inputStyle} />
                </label>
              </div>

              {/* TAXA SUGERIDA — carregada do banco */}
              {normaSug && (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "8px 12px", fontSize: 11, color: "#166534" }}>
                  ✅ Taxa sugerida pela norma <strong>{normaSug}</strong>: {taxaSug.toFixed(2)}% a.a.{vidaUtilSug ? ` · Vida útil: ${vidaUtilSug} anos` : ""}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <label style={labelStyle}>
                  Vida Útil (anos)
                  <input
                    name="vida_util_anos"
                    type="number"
                    min="1"
                    style={inputStyle}
                    value={vidaUtilSug ?? ""}
                    onChange={(e) => setVidaUtilSug(e.target.value ? parseInt(e.target.value) : null)}
                  />
                </label>
                <label style={labelStyle}>
                  Taxa Deprec. (% a.a.) {loadingTaxa && <span style={{ color: "#94a3b8" }}>⏳</span>}
                  <input
                    name="taxa_depreciacao_anual"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={taxaSug}
                    onChange={(e) => setTaxaSug(parseFloat(e.target.value))}
                    style={inputStyle}
                  />
                </label>
                <label style={labelStyle}>
                  Valor Residual (R$)
                  <input name="valor_residual" type="number" step="0.01" min="0" style={inputStyle} defaultValue="0" />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={labelStyle}>
                  Fornecedor / Doador
                  <input name="fornecedor" style={inputStyle} placeholder="Nome do fornecedor ou doador" />
                </label>
                <label style={labelStyle}>
                  Nota Fiscal / NF-e
                  <input name="nota_fiscal" style={inputStyle} placeholder="Número da NF ou recibo" />
                </label>
              </div>

              <label style={labelStyle}>
                Descrição
                <textarea name="descricao" rows={2} style={{ ...inputStyle, resize: "vertical" }} placeholder="Descrição adicional..." />
              </label>

              {erro && <p style={{ color: "#dc2626", fontSize: 13 }}>{erro}</p>}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setModal(false)} style={btnStyle("#94a3b8")}>Cancelar</button>
                <button type="submit" disabled={isPending} style={btnStyle("#4A7DB5")}>
                  {isPending ? "Salvando..." : "Cadastrar Bem"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.5)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999,
};
const modalStyle: React.CSSProperties = {
  background: "#fff", borderRadius: 14, padding: "28px 28px 24px",
  width: "100%", maxWidth: 520, boxShadow: "0 8px 40px rgba(0,0,0,.2)",
  maxHeight: "90vh", overflowY: "auto",
};
const labelStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 5,
  fontSize: 12, fontWeight: 600, color: "#475569",
};
const inputStyle: React.CSSProperties = {
  border: "1.5px solid #C8D6E5", borderRadius: 8, padding: "9px 12px",
  fontSize: 13, outline: "none", fontFamily: "inherit", background: "#fff", color: "#1C2833",
};
function btnStyle(bg: string): React.CSSProperties {
  return { background: bg, color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer" };
}
