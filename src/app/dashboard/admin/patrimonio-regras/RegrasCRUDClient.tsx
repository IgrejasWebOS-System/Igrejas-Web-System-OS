"use client";

import { useState, useTransition } from "react";
import type {
  PatrimonyDepreciationRule,
  PatrimonyCategoria,
  PatrimonyAquisicaoTipo,
  DepreciacaoMetodo,
} from "@/types";
import {
  PATRIMONY_CATEGORIA_LABELS,
  PATRIMONY_AQUISICAO_LABELS,
  PATRIMONY_AQUISICAO_INFO,
  DEPRECIACAO_METODO_LABELS,
} from "@/types";
import {
  criarRegraDepreciacaoAction,
  atualizarRegraDepreciacaoAction,
  desativarRegraDepreciacaoAction,
} from "@/app/dashboard/patrimonio/actions";

const CATEGORIAS: PatrimonyCategoria[] = [
  "IMOVEL","VEICULO","EQUIPAMENTO","INFORMATICA","INSTRUMENTO_MUSICAL","MOVEL","OUTRO",
];
const TIPOS_AQUISICAO: PatrimonyAquisicaoTipo[] = [
  "COMPRA","DOACAO","BENEFICIAMENTO","PERMUTA","PRODUCAO_PROPRIA","TRANSFERENCIA_INTERNA",
];
const METODOS: DepreciacaoMetodo[] = ["LINEAR","SOMA_DIGITOS","SALDO_DECRESCENTE"];

const NORMAS_SUGERIDAS = [
  "SRF IN 162/1998 Art.3 Anexo I",
  "NBC TG 04 (R4) 2017",
  "NBC TG 04 + SRF IN 162/1998",
  "ITG 1000 (R1) 2015",
  "ITG 2002 (R1) 2015",
  "Política interna do ministério",
];

interface Props {
  regras: PatrimonyDepreciationRule[];
}

const CATEGORIA_ICONS: Record<PatrimonyCategoria, string> = {
  IMOVEL: "🏠", VEICULO: "🚗", EQUIPAMENTO: "⚙️", INFORMATICA: "💻",
  INSTRUMENTO_MUSICAL: "🎸", MOVEL: "🪑", OUTRO: "📦",
};

// Agrupa regras por categoria para exibição
function agrupar(regras: PatrimonyDepreciationRule[]) {
  const grupos: Record<string, PatrimonyDepreciationRule[]> = {};
  for (const r of regras) {
    if (!grupos[r.categoria]) grupos[r.categoria] = [];
    grupos[r.categoria].push(r);
  }
  return grupos;
}

export default function RegrasCRUDClient({ regras: initial }: Props) {
  const [regras, setRegras] = useState(initial);
  const [editing, setEditing] = useState<PatrimonyDepreciationRule | null>(null);
  const [creating, setCreating] = useState(false);
  const [infoOpen, setInfoOpen] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const grupos = agrupar(regras);

  function handleEdit(regra: PatrimonyDepreciationRule) {
    // Só permite editar regras do próprio ministério (ministry_id !== null)
    if (!regra.ministry_id) {
      setInfoOpen(regra.id);
      return;
    }
    setEditing(regra);
  }

  function handleDesativar(id: string) {
    if (!confirm("Desativar esta regra? Bens já cadastrados não são afetados.")) return;
    startTransition(async () => {
      try {
        await desativarRegraDepreciacaoAction(id);
        setRegras((prev) => prev.filter((r) => r.id !== id));
      } catch (e: any) {
        setError(e.message);
      }
    });
  }

  async function handleSubmitCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await criarRegraDepreciacaoAction(fd);
        setCreating(false);
        // Recarrega via router — ou adiciona otimisticamente
        window.location.reload();
      } catch (e: any) {
        setError(e.message);
      }
    });
  }

  async function handleSubmitEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await atualizarRegraDepreciacaoAction(editing.id, fd);
        setEditing(null);
        window.location.reload();
      } catch (e: any) {
        setError(e.message);
      }
    });
  }

  return (
    <div className="page-container">
      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Regras de Depreciação Patrimonial</h1>
          <p className="page-subtitle">
            Taxas normativas por categoria e tipo de aquisição — SRF IN 162/1998 · NBC TG 04 · ITG 1000 R1
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          + Nova Regra
        </button>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-sm underline">×</button>
        </div>
      )}

      {/* LEGENDA NORMATIVA */}
      <div className="card mb-6 p-4 bg-blue-50 border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">📋 Base Normativa</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-blue-800">
          <div>
            <strong>SRF IN 162/1998</strong> — Taxas fiscais de depreciação para fins tributários.
            Referência primária para bens adquiridos por compra.
          </div>
          <div>
            <strong>NBC TG 04 (R4) / 2017</strong> — Depreciação, amortização e impairment.
            Art. 16: bens doados → mensurar a <strong>valor justo</strong> na data da doação.
          </div>
          <div>
            <strong>ITG 1000 (R1) / 2015</strong> — Demonstrações para pequenas entidades, incluindo
            igrejas e associações religiosas.
          </div>
          <div>
            <strong>ITG 2002 (R1) / 2015</strong> — Entidades sem finalidade de lucro. Define
            tratamento contábil específico para doações e subvenções.
          </div>
        </div>
        <p className="text-xs text-blue-700 mt-3">
          ⚠️ Regras globais (🌐) são padrão do sistema. Crie regras de ministério para sobrescrever casos específicos.
          Bens já cadastrados com taxa manual não são afetados automaticamente — altere-os individualmente se necessário.
        </p>
      </div>

      {/* TABELA POR CATEGORIA */}
      {CATEGORIAS.map((cat) => {
        const lista = grupos[cat] ?? [];
        if (lista.length === 0) return null;
        return (
          <div key={cat} className="card mb-4 overflow-hidden">
            <div className="card-header flex items-center gap-2 bg-gray-50 border-b px-4 py-3">
              <span className="text-xl">{CATEGORIA_ICONS[cat]}</span>
              <h2 className="font-semibold text-gray-800">
                {PATRIMONY_CATEGORIA_LABELS?.[cat] ?? cat}
              </h2>
              <span className="text-xs text-gray-400 ml-auto">{lista.length} regra(s)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Tipo de Aquisição</th>
                    <th>Taxa a.a.</th>
                    <th>Vida Útil</th>
                    <th>Método</th>
                    <th>Norma</th>
                    <th>Vigência</th>
                    <th>Origem</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div className="font-medium text-sm">
                          {PATRIMONY_AQUISICAO_LABELS[r.tipo_aquisicao as PatrimonyAquisicaoTipo] ?? r.tipo_aquisicao}
                        </div>
                        {r.notas && (
                          <div className="text-xs text-gray-400 max-w-xs truncate" title={r.notas}>
                            {r.notas}
                          </div>
                        )}
                      </td>
                      <td className="font-mono text-right font-semibold text-orange-600">
                        {r.taxa_anual.toFixed(2)}%
                      </td>
                      <td className="text-center">
                        {r.vida_util_anos ? `${r.vida_util_anos} anos` : "—"}
                      </td>
                      <td className="text-sm">
                        {DEPRECIACAO_METODO_LABELS[r.metodo as DepreciacaoMetodo] ?? r.metodo}
                      </td>
                      <td className="text-xs text-gray-500 max-w-xs truncate" title={r.norma_referencia}>
                        {r.norma_referencia}
                      </td>
                      <td className="text-xs">
                        <span className="text-green-600">{r.vigente_desde}</span>
                        {r.vigente_ate && <span className="text-gray-400"> → {r.vigente_ate}</span>}
                      </td>
                      <td>
                        {r.ministry_id ? (
                          <span className="badge badge-blue text-xs">🏛 Ministério</span>
                        ) : (
                          <span className="badge badge-gray text-xs">🌐 Global</span>
                        )}
                      </td>
                      <td>
                        <div className="flex gap-1">
                          {r.ministry_id ? (
                            <>
                              <button
                                className="btn btn-xs btn-secondary"
                                onClick={() => handleEdit(r)}
                              >
                                Editar
                              </button>
                              <button
                                className="btn btn-xs btn-danger"
                                onClick={() => handleDesativar(r.id)}
                                disabled={isPending}
                              >
                                Desativar
                              </button>
                            </>
                          ) : (
                            <button
                              className="btn btn-xs btn-secondary"
                              onClick={() => setInfoOpen(infoOpen === r.id ? null : r.id)}
                              title="Regra global — não editável aqui. Crie uma regra de ministério para sobrescrever."
                            >
                              ℹ️ Ver
                            </button>
                          )}
                        </div>
                        {infoOpen === r.id && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800 max-w-xs">
                            Regra global do sistema (SRF/ITG). Para sobrescrever, crie uma nova regra
                            de ministério com a mesma categoria e tipo de aquisição — ela terá prioridade
                            automaticamente.
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* INFO TIPOS DE AQUISIÇÃO */}
      <div className="card p-4 mb-6">
        <h3 className="font-semibold text-gray-700 mb-3">📌 Como cada tipo de aquisição afeta a depreciação</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {TIPOS_AQUISICAO.map((t) => (
            <div key={t} className="flex gap-2 text-sm">
              <span className="font-medium text-gray-800 shrink-0">
                {PATRIMONY_AQUISICAO_LABELS[t]}:
              </span>
              <span className="text-gray-500">{PATRIMONY_AQUISICAO_INFO[t]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL CRIAR */}
      {creating && (
        <RegraModal
          title="Nova Regra de Depreciação"
          onClose={() => setCreating(false)}
          onSubmit={handleSubmitCreate}
          isPending={isPending}
        />
      )}

      {/* MODAL EDITAR */}
      {editing && (
        <RegraModal
          title="Editar Regra"
          regra={editing}
          onClose={() => setEditing(null)}
          onSubmit={handleSubmitEdit}
          isPending={isPending}
        />
      )}
    </div>
  );
}

// ── SUB-COMPONENTE: Modal de regra ────────────────────────────

interface ModalProps {
  title: string;
  regra?: PatrimonyDepreciationRule;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isPending: boolean;
}

function RegraModal({ title, regra, onClose, onSubmit, isPending }: ModalProps) {
  const [categoriaSelected, setCategoriaSelected] = useState<string>(regra?.categoria ?? "EQUIPAMENTO");
  const [tipoSelected, setTipoSelected] = useState<string>(regra?.tipo_aquisicao ?? "COMPRA");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="modal-body grid grid-cols-2 gap-4">
            {/* Categoria */}
            <div className="form-group">
              <label className="form-label">Categoria *</label>
              <select
                name="categoria"
                className="form-select"
                required
                value={categoriaSelected}
                onChange={(e) => setCategoriaSelected(e.target.value)}
                disabled={!!regra}
              >
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORIA_ICONS[c]} {PATRIMONY_CATEGORIA_LABELS?.[c] ?? c}
                  </option>
                ))}
              </select>
            </div>

            {/* Tipo Aquisição */}
            <div className="form-group">
              <label className="form-label">Tipo de Aquisição *</label>
              <select
                name="tipo_aquisicao"
                className="form-select"
                required
                value={tipoSelected}
                onChange={(e) => setTipoSelected(e.target.value)}
                disabled={!!regra}
              >
                {TIPOS_AQUISICAO.map((t) => (
                  <option key={t} value={t}>
                    {PATRIMONY_AQUISICAO_LABELS[t]}
                  </option>
                ))}
              </select>
              {tipoSelected && (
                <p className="form-hint text-xs text-blue-600 mt-1">
                  {PATRIMONY_AQUISICAO_INFO[tipoSelected as PatrimonyAquisicaoTipo]}
                </p>
              )}
            </div>

            {/* Taxa anual */}
            <div className="form-group">
              <label className="form-label">Taxa de Depreciação Anual (%) *</label>
              <input
                type="number"
                name="taxa_anual"
                className="form-input"
                required
                step="0.01"
                min="0"
                max="100"
                defaultValue={regra?.taxa_anual ?? ""}
                placeholder="Ex: 10.00"
              />
            </div>

            {/* Vida útil */}
            <div className="form-group">
              <label className="form-label">Vida Útil (anos)</label>
              <input
                type="number"
                name="vida_util_anos"
                className="form-input"
                min="1"
                defaultValue={regra?.vida_util_anos ?? ""}
                placeholder="Ex: 10"
              />
            </div>

            {/* Método */}
            <div className="form-group">
              <label className="form-label">Método de Depreciação *</label>
              <select name="metodo" className="form-select" required defaultValue={regra?.metodo ?? "LINEAR"}>
                {METODOS.map((m) => (
                  <option key={m} value={m}>{DEPRECIACAO_METODO_LABELS[m]}</option>
                ))}
              </select>
            </div>

            {/* Norma */}
            <div className="form-group">
              <label className="form-label">Norma de Referência *</label>
              <input
                type="text"
                name="norma_referencia"
                className="form-input"
                required
                list="normas-list"
                defaultValue={regra?.norma_referencia ?? ""}
                placeholder="Ex: SRF IN 162/1998"
              />
              <datalist id="normas-list">
                {NORMAS_SUGERIDAS.map((n) => <option key={n} value={n} />)}
              </datalist>
            </div>

            {/* Vigente desde */}
            <div className="form-group">
              <label className="form-label">Vigente Desde</label>
              <input
                type="date"
                name="vigente_desde"
                className="form-input"
                defaultValue={regra?.vigente_desde ?? new Date().toISOString().slice(0, 10)}
              />
            </div>

            {/* Vigente até */}
            <div className="form-group">
              <label className="form-label">Vigente Até (opcional)</label>
              <input
                type="date"
                name="vigente_ate"
                className="form-input"
                defaultValue={regra?.vigente_ate ?? ""}
              />
              <p className="form-hint">Deixe em branco para vigência indefinida.</p>
            </div>

            {/* Notas — coluna inteira */}
            <div className="form-group col-span-2">
              <label className="form-label">Notas / Observações</label>
              <textarea
                name="notas"
                className="form-textarea"
                rows={3}
                defaultValue={regra?.notas ?? ""}
                placeholder="Observações sobre a aplicação desta taxa, exceções, referências adicionais..."
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar Regra"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
