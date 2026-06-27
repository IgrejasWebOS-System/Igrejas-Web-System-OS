"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  FinAccountWithSaldo,
  FinCategory,
  FinPaymentMethod,
  FinCostCenter,
  FinTitheJustification,
  FinDocumentType,
} from "@/types";
import { criarLancamentoAction, buscarMembrosParaLancamentoAction } from "../../actions";

type Props = {
  contas:               FinAccountWithSaldo[];
  categorias:           FinCategory[];
  paymentMethods:       FinPaymentMethod[];
  costCenters:          FinCostCenter[];
  titheJustifications:  FinTitheJustification[];
  documentTypes:        FinDocumentType[];
};

type SearchResult = { id: string; nome_completo: string; matricula: string };

function fmtBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function NovoLancamentoClient({
  contas, categorias, paymentMethods, costCenters, titheJustifications, documentTypes,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tipo, setTipo]     = useState<"ENTRADA" | "SAIDA">("ENTRADA");
  const [erro, setErro]     = useState("");
  const [catId, setCatId]   = useState("");

  // Busca de pessoa (party)
  const [searchQ, setSearchQ]   = useState("");
  const [searchRes, setSearchRes] = useState<SearchResult[]>([]);
  const [party, setParty]       = useState<SearchResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  function buscarPessoa(q: string) {
    setSearchQ(q); setParty(null);
    clearTimeout(debounceRef.current);
    if (!q.trim()) { setSearchRes([]); return; }
    debounceRef.current = setTimeout(async () => {
      const res = await buscarMembrosParaLancamentoAction(q).catch(() => []);
      setSearchRes(res);
    }, 300);
  }

  const tipoCategoria = tipo === "ENTRADA" ? "RECEITA" : "DESPESA";
  const categoriasDoTipo = categorias.filter((c) => c.tipo === tipoCategoria);
  const catSelecionada   = categorias.find((c) => c.id === catId);
  const isDizimo = catSelecionada?.fundo === "DIZIMO";

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("tipo", tipo);
    if (party) fd.set("party_id", party.id);
    setErro("");
    startTransition(async () => {
      try {
        await criarLancamentoAction(fd);
        router.push("/dashboard/financeiro/lancamentos");
      } catch (err: any) {
        setErro(err.message ?? "Erro ao salvar");
      }
    });
  }

  return (
    <div style={{ padding: "28px 28px", maxWidth: 700 }}>
      <div style={{ marginBottom: 20 }}>
        <Link href="/dashboard/financeiro/lancamentos" style={{ fontSize: 12, color: "#4A7DB5", fontWeight: 600, textDecoration: "none" }}>
          ← Lançamentos
        </Link>
      </div>

      <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1C2833", marginBottom: 24 }}>Novo Lançamento</h1>

      {/* Seletor ENTRADA / SAIDA */}
      <div style={{ display: "flex", gap: 0, marginBottom: 24, border: "1.5px solid #C8D6E5", borderRadius: 10, overflow: "hidden" }}>
        {(["ENTRADA", "SAIDA"] as const).map((t) => (
          <button
            key={t} type="button" onClick={() => { setTipo(t); setCatId(""); }}
            style={{
              flex: 1, padding: "12px 0", fontWeight: 700, fontSize: 14,
              border: "none", cursor: "pointer",
              background: tipo === t ? (t === "ENTRADA" ? "#f0fdf4" : "#fef2f2") : "#fff",
              color: tipo === t ? (t === "ENTRADA" ? "#166534" : "#991b1b") : "#64748b",
              borderRight: t === "ENTRADA" ? "1.5px solid #C8D6E5" : "none",
            }}
          >
            {t === "ENTRADA" ? "📥 Receita (Entrada)" : "📤 Despesa (Saída)"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <label style={labelStyle}>
            Conta *
            <select name="account_id" required style={inputStyle}>
              <option value="">Selecione a conta...</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} ({fmtBRL(c.saldo_atual)})
                </option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            Categoria *
            <select
              name="category_id"
              required
              value={catId}
              onChange={(e) => setCatId(e.target.value)}
              style={inputStyle}
            >
              <option value="">Selecione a categoria...</option>
              {categoriasDoTipo.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.codigo} — {c.nome}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <label style={labelStyle}>
            Valor (R$) *
            <input
              name="valor" type="number" step="0.01" min="0.01"
              required style={inputStyle} placeholder="0,00"
            />
          </label>
          <label style={labelStyle}>
            Data *
            <input
              name="data" type="date" required style={inputStyle}
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </label>
        </div>

        <label style={labelStyle}>
          Forma de Pagamento
          <select name="payment_method_id" style={inputStyle}>
            <option value="">Selecione...</option>
            {paymentMethods.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </label>

        {/* Busca de Pessoa */}
        <label style={labelStyle}>
          {tipo === "ENTRADA" ? "Doador / Membro" : "Fornecedor / Beneficiário"}
          <div style={{ position: "relative" }}>
            <input
              value={searchQ}
              onChange={(e) => buscarPessoa(e.target.value)}
              placeholder="Digite para buscar..."
              style={inputStyle}
              autoComplete="off"
            />
            {searchRes.length > 0 && (
              <div style={dropdownStyle}>
                {searchRes.map((r) => (
                  <div key={r.id}
                    onClick={() => { setParty(r); setSearchQ(r.nome_completo); setSearchRes([]); }}
                    style={dropItemStyle}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f7ff")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <strong>{r.nome_completo}</strong>
                    {r.matricula && <span style={{ color: "#5D6D7E", marginLeft: 8 }}>#{r.matricula}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
          {party && <span style={{ fontSize: 11, color: "#16a34a" }}>✓ {party.nome_completo} selecionado</span>}
        </label>

        {isDizimo && (
          <label style={labelStyle}>
            Justificativa do Dízimo
            <select name="justificativa_dizimo_id" style={inputStyle}>
              <option value="">Sem justificativa</option>
              {titheJustifications.map((j) => <option key={j.id} value={j.id}>{j.nome}</option>)}
            </select>
          </label>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <label style={labelStyle}>
            Centro de Custo
            <select name="cost_center_id" style={inputStyle}>
              <option value="">Nenhum</option>
              {costCenters.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </label>
          <label style={labelStyle}>
            Tipo de Documento
            <select name="document_type_id" style={inputStyle}>
              <option value="">Nenhum</option>
              {documentTypes.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
            </select>
          </label>
        </div>

        <label style={labelStyle}>
          Número do Documento
          <input name="numero_documento" style={inputStyle} placeholder="NF-001, Recibo 123..." />
        </label>

        <label style={labelStyle}>
          Descrição / Observação
          <textarea name="descricao" style={{ ...inputStyle, minHeight: 72, resize: "vertical" }} placeholder="Descreva o lançamento..." />
        </label>

        {erro && <p style={{ color: "#dc2626", fontSize: 13 }}>{erro}</p>}

        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#92400e" }}>
          ℹ️ O lançamento será salvo com status <strong>PENDENTE</strong>. Um N2 ou superior deve aprovar para afetar o saldo.
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
          <Link href="/dashboard/financeiro/lancamentos" style={{ ...btnStyle("#94a3b8"), textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            Cancelar
          </Link>
          <button type="submit" disabled={isPending} style={btnStyle("#4A7DB5")}>
            {isPending ? "Salvando..." : "Salvar Lançamento"}
          </button>
        </div>
      </form>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 5,
  fontSize: 12, fontWeight: 600, color: "#475569",
};
const inputStyle: React.CSSProperties = {
  border: "1.5px solid #C8D6E5", borderRadius: 8, padding: "9px 12px",
  fontSize: 13, outline: "none", fontFamily: "inherit",
  background: "#fff", color: "#1C2833",
};
const dropdownStyle: React.CSSProperties = {
  position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20,
  background: "#fff", border: "1px solid #C8D6E5", borderRadius: 8,
  boxShadow: "0 4px 16px rgba(0,0,0,.12)", overflow: "hidden",
};
const dropItemStyle: React.CSSProperties = {
  padding: "10px 14px", cursor: "pointer", fontSize: 13,
  borderBottom: "1px solid #f1f5f9",
};
function btnStyle(bg: string): React.CSSProperties {
  return {
    background: bg, color: "#fff", border: "none", borderRadius: 8,
    padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer",
  };
}
