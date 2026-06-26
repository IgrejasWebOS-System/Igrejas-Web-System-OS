"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  PatrimonyItemListItem,
  PatrimonyMovementListItem,
  PatrimonyDepreciation,
  PatrimonyMovimentoTipo,
} from "@/types";
import {
  PATRIMONY_CATEGORIA_LABELS,
  PATRIMONY_CATEGORIA_ICONS,
  PATRIMONY_STATUS_COLORS,
  PATRIMONY_MOVIMENTO_LABELS,
} from "@/types";
import {
  registrarMovimentoAction,
  registrarDepreciacaoAction,
  softDeletePatrimonyItemAction,
} from "../actions";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDate(d: string | null) {
  if (!d) return "—";
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y}`;
}

const TIPO_MOVIMENTO_LIST: PatrimonyMovimentoTipo[] = [
  "TRANSFERENCIA", "BAIXA", "MANUTENCAO", "RETORNO_MANUTENCAO", "REAVALIACAO",
];

type Props = {
  item: PatrimonyItemListItem;
  movimentos: PatrimonyMovementListItem[];
  depreciacoes: PatrimonyDepreciation[];
  unidades: { id: string; name: string; unit_type: string }[];
};

export default function PatrimonyItemClient({ item, movimentos, depreciacoes, unidades }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [tab, setTab]             = useState<"ficha" | "movimentos" | "depreciacao">("ficha");
  const [modalMov, setModalMov]   = useState(false);
  const [tipoMov, setTipoMov]     = useState<PatrimonyMovimentoTipo>("TRANSFERENCIA");
  const [modalDepr, setModalDepr] = useState(false);
  const [erro, setErro]           = useState("");

  const sc = PATRIMONY_STATUS_COLORS[item.status] ?? { bg: "#f1f5f9", color: "#475569" };
  const depreciacaoTotal = item.valor_aquisicao - item.valor_contabil_atual;
  const depreciacaoPct   = item.valor_aquisicao > 0
    ? Math.round((depreciacaoTotal / item.valor_aquisicao) * 100)
    : 0;

  function submitMovimento(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("tipo", tipoMov);
    setErro("");
    startTransition(async () => {
      try {
        await registrarMovimentoAction(item.id, fd);
        setModalMov(false);
        router.refresh();
      } catch (err: any) {
        setErro(err.message ?? "Erro ao registrar movimentação");
      }
    });
  }

  function submitDepreciacao(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const ano = parseInt(fd.get("ano") as string);
    const mes = parseInt(fd.get("mes") as string);
    setErro("");
    startTransition(async () => {
      try {
        await registrarDepreciacaoAction(item.id, ano, mes);
        setModalDepr(false);
        router.refresh();
      } catch (err: any) {
        setErro(err.message ?? "Erro ao registrar depreciação");
      }
    });
  }

  function handleBaixa() {
    if (!confirm(`Deseja dar baixa no bem "${item.nome}"? O status será alterado para BAIXADO.`)) return;
    const fd = new FormData();
    fd.set("tipo", "BAIXA");
    fd.set("data", new Date().toISOString().slice(0, 10));
    fd.set("descricao", "Baixa patrimonial");
    startTransition(async () => {
      await registrarMovimentoAction(item.id, fd);
      router.refresh();
    });
  }

  const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

  return (
    <div style={{ padding: "28px 28px", maxWidth: 1100 }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 12 }}>
        <Link href="/dashboard/patrimonio" style={{ fontSize: 12, color: "#4A7DB5", fontWeight: 600, textDecoration: "none" }}>← Inventário</Link>
        <span style={{ fontSize: 12, color: "#94a3b8", margin: "0 6px" }}>/</span>
        <span style={{ fontSize: 12, color: "#64748b" }}>{item.nome}</span>
      </div>

      {/* Header do bem */}
      <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 14, padding: "20px 24px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            <div style={{ fontSize: 48 }}>{PATRIMONY_CATEGORIA_ICONS[item.categoria]}</div>
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "#4A7DB5", background: "#eff6ff", padding: "2px 10px", borderRadius: 99 }}>
                  {item.numero_tombamento}
                </span>
                <span style={{ padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>
                  {item.status.replace("_", " ")}
                </span>
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1C2833", margin: "0 0 4px" }}>{item.nome}</h1>
              <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
                {PATRIMONY_CATEGORIA_LABELS[item.categoria]}
                {item.localizacao_nome && ` · 📍 ${item.localizacao_nome}`}
                {item.responsavel_nome && ` · 👤 ${item.responsavel_nome}`}
              </p>
              {item.descricao && <p style={{ fontSize: 12, color: "#94a3b8", margin: "4px 0 0" }}>{item.descricao}</p>}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => { setErro(""); setModalMov(true); }}
              style={btnSmall("#475569")}
            >
              + Movimentação
            </button>
            {item.taxa_depreciacao_anual && (
              <button onClick={() => { setErro(""); setModalDepr(true); }} style={btnSmall("#4A7DB5")}>
                Registrar Depreciação
              </button>
            )}
            {item.status === "ATIVO" && (
              <button onClick={handleBaixa} disabled={isPending} style={btnSmall("#dc2626")}>
                Dar Baixa
              </button>
            )}
          </div>
        </div>

        {/* Valores */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginTop: 20, paddingTop: 20, borderTop: "1px solid #f1f5f9" }}>
          {[
            { label: "Valor de Aquisição", value: fmtBRL(item.valor_aquisicao), color: "#1C2833" },
            { label: "Valor Contábil Atual", value: fmtBRL(item.valor_contabil_atual), color: "#166534" },
            { label: "Depreciação Acumulada", value: fmtBRL(depreciacaoTotal), color: "#dc2626" },
            { label: "% Depreciado", value: `${depreciacaoPct}%`, color: depreciacaoPct > 70 ? "#dc2626" : "#f59e0b" },
          ].map((v) => (
            <div key={v.label}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 2 }}>{v.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: v.color }}>{v.value}</div>
            </div>
          ))}
        </div>

        {/* Barra de depreciação */}
        <div style={{ marginTop: 12 }}>
          <div style={{ background: "#e2e8f0", borderRadius: 99, height: 8, overflow: "hidden" }}>
            <div style={{
              width: `${Math.min(100, depreciacaoPct)}%`, height: "100%",
              background: depreciacaoPct > 80 ? "#dc2626" : depreciacaoPct > 50 ? "#f59e0b" : "#22c55e",
              borderRadius: 99, transition: "width .3s",
            }} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "2px solid #e2e8f0" }}>
        {([
          { key: "ficha",       label: "📋 Ficha Técnica" },
          { key: "movimentos",  label: `🔄 Movimentações (${movimentos.length})` },
          { key: "depreciacao", label: `📉 Depreciação (${depreciacoes.length})` },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: "8px 18px", border: "none", background: "none",
              fontWeight: tab === key ? 700 : 500,
              color:    tab === key ? "#4A7DB5" : "#64748b",
              borderBottom: tab === key ? "2px solid #4A7DB5" : "2px solid transparent",
              marginBottom: -2, cursor: "pointer", fontSize: 13,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Conteúdo das tabs */}
      {tab === "ficha" && (
        <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: "20px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {[
              { label: "Data de Aquisição", value: fmtDate(item.data_aquisicao) },
              { label: "Categoria", value: `${PATRIMONY_CATEGORIA_ICONS[item.categoria]} ${PATRIMONY_CATEGORIA_LABELS[item.categoria]}` },
              { label: "Fornecedor", value: item.fornecedor ?? "Não informado" },
              { label: "Nota Fiscal", value: item.nota_fiscal ?? "Não informado" },
              { label: "Vida Útil", value: item.vida_util_anos ? `${item.vida_util_anos} anos` : "Não configurada" },
              { label: "Taxa de Depreciação", value: item.taxa_depreciacao_anual ? `${item.taxa_depreciacao_anual}% a.a.` : "Não configurada" },
              { label: "Valor Residual", value: fmtBRL(item.valor_residual ?? 0) },
              { label: "Unidade de Cadastro", value: item.unit_nome ?? "Não informada" },
              { label: "Localização Atual", value: item.localizacao_nome ?? "Não informada" },
              { label: "Responsável", value: item.responsavel_nome ?? "Não informado" },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 13, color: "#1C2833", fontWeight: 500 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "movimentos" && (
        <div>
          {movimentos.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px", color: "#64748b", background: "#f8fafc", borderRadius: 12 }}>
              <p style={{ fontWeight: 600 }}>Nenhuma movimentação registrada</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {movimentos.map((m) => (
                <div key={m.id} style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "14px 18px", display: "flex", gap: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                    {m.tipo === "AQUISICAO" ? "🛒" : m.tipo === "TRANSFERENCIA" ? "🔄" : m.tipo === "BAIXA" ? "❌" : m.tipo === "MANUTENCAO" ? "🔧" : m.tipo === "RETORNO_MANUTENCAO" ? "✅" : "📊"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: "#1C2833" }}>{PATRIMONY_MOVIMENTO_LABELS[m.tipo]}</span>
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>{fmtDate(m.data)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{m.descricao}</div>
                    {(m.unit_from_nome || m.unit_to_nome) && (
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                        {m.unit_from_nome && `De: ${m.unit_from_nome}`}
                        {m.unit_from_nome && m.unit_to_nome && " → "}
                        {m.unit_to_nome && `Para: ${m.unit_to_nome}`}
                      </div>
                    )}
                    {m.responsavel_nome && <div style={{ fontSize: 11, color: "#94a3b8" }}>👤 {m.responsavel_nome}</div>}
                    {m.valor && <div style={{ fontSize: 12, fontWeight: 600, color: "#4A7DB5" }}>{fmtBRL(m.valor)}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "depreciacao" && (
        <div>
          {depreciacoes.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px", color: "#64748b", background: "#f8fafc", borderRadius: 12 }}>
              <p style={{ fontWeight: 600 }}>Nenhuma depreciação registrada</p>
              {!item.taxa_depreciacao_anual && (
                <p style={{ fontSize: 12 }}>Configure a taxa de depreciação na ficha técnica do bem para habilitar</p>
              )}
            </div>
          ) : (
            <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", background: "#0f172a", color: "#94a3b8", fontSize: 10, fontWeight: 700, textTransform: "uppercase", padding: "10px 16px" }}>
                <span>Competência</span>
                <span>Depreciação</span>
                <span>Valor Contábil</span>
                <span>% Original</span>
              </div>
              {depreciacoes.map((d) => {
                const pct = item.valor_aquisicao > 0
                  ? Math.round((d.valor_contabil / item.valor_aquisicao) * 100)
                  : 100;
                return (
                  <div key={d.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", padding: "10px 16px", borderBottom: "1px solid #f1f5f9", fontSize: 13 }}>
                    <span style={{ fontWeight: 600 }}>{MESES[d.mes - 1]}/{d.ano}</span>
                    <span style={{ color: "#dc2626" }}>- {fmtBRL(d.valor_depreciacao)}</span>
                    <span style={{ fontWeight: 600, color: "#166534" }}>{fmtBRL(d.valor_contabil)}</span>
                    <span>{pct}% do valor original</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal movimentação */}
      {modalMov && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: "#1C2833" }}>Registrar Movimentação</h2>
            <form onSubmit={submitMovimento} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label style={labelStyle}>
                Tipo de Movimentação *
                <select value={tipoMov} onChange={(e) => setTipoMov(e.target.value as PatrimonyMovimentoTipo)} style={inputStyle}>
                  {TIPO_MOVIMENTO_LIST.map((t) => <option key={t} value={t}>{PATRIMONY_MOVIMENTO_LABELS[t]}</option>)}
                </select>
              </label>

              <label style={labelStyle}>
                Data *
                <input name="data" type="date" required style={inputStyle} defaultValue={new Date().toISOString().slice(0, 10)} />
              </label>

              {tipoMov === "TRANSFERENCIA" && (
                <>
                  <label style={labelStyle}>
                    Unidade de Origem
                    <select name="unit_from_id" style={inputStyle}>
                      <option value="">Localização atual</option>
                      {unidades.map((u) => <option key={u.id} value={u.id} selected={u.id === item.localizacao_unit_id}>{u.name}</option>)}
                    </select>
                  </label>
                  <label style={labelStyle}>
                    Unidade de Destino *
                    <select name="unit_to_id" required style={inputStyle}>
                      <option value="">Selecione...</option>
                      {unidades.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </label>
                </>
              )}

              {tipoMov === "REAVALIACAO" && (
                <label style={labelStyle}>
                  Novo Valor (R$) *
                  <input name="valor" type="number" step="0.01" min="0" required style={inputStyle} />
                </label>
              )}

              {tipoMov === "BAIXA" && (
                <label style={labelStyle}>
                  Valor de Baixa (R$)
                  <input name="valor" type="number" step="0.01" min="0" style={inputStyle} placeholder="Valor de alienação ou sucateamento" />
                </label>
              )}

              <label style={labelStyle}>
                Descrição *
                <textarea name="descricao" required rows={2} style={{ ...inputStyle, resize: "vertical" }} placeholder="Descreva a movimentação..." />
              </label>

              {erro && <p style={{ color: "#dc2626", fontSize: 13 }}>{erro}</p>}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setModalMov(false)} style={btnStyle("#94a3b8")}>Cancelar</button>
                <button type="submit" disabled={isPending} style={btnStyle("#4A7DB5")}>
                  {isPending ? "Salvando..." : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal depreciação */}
      {modalDepr && (
        <div style={overlayStyle}>
          <div style={{ ...modalStyle, maxWidth: 380 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: "#1C2833" }}>Registrar Depreciação Mensal</h2>
            <form onSubmit={submitDepreciacao} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "8px 14px", fontSize: 12, color: "#1d4ed8" }}>
                Taxa: {item.taxa_depreciacao_anual}% a.a. · Mensalidade: {fmtBRL((item.valor_aquisicao - (item.valor_residual ?? 0)) * (item.taxa_depreciacao_anual ?? 0) / 100 / 12)}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={labelStyle}>
                  Mês *
                  <select name="mes" required style={inputStyle}>
                    {MESES.map((m, i) => (
                      <option key={i+1} value={i+1} selected={i + 1 === new Date().getMonth() + 1}>{m}</option>
                    ))}
                  </select>
                </label>
                <label style={labelStyle}>
                  Ano *
                  <input name="ano" type="number" required min="2020" max="2099" style={inputStyle} defaultValue={new Date().getFullYear()} />
                </label>
              </div>
              {erro && <p style={{ color: "#dc2626", fontSize: 13 }}>{erro}</p>}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setModalDepr(false)} style={btnStyle("#94a3b8")}>Cancelar</button>
                <button type="submit" disabled={isPending} style={btnStyle("#4A7DB5")}>
                  {isPending ? "Calculando..." : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const overlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.5)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999,
};
const modalStyle: React.CSSProperties = {
  background: "#fff", borderRadius: 14, padding: "28px 28px 24px",
  width: "100%", maxWidth: 480, boxShadow: "0 8px 40px rgba(0,0,0,.2)",
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
function btnSmall(bg: string): React.CSSProperties {
  return { background: bg, color: "#fff", border: "none", borderRadius: 7, padding: "7px 14px", fontWeight: 600, fontSize: 12, cursor: "pointer" };
}
