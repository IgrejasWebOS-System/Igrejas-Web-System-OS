"use client";

import { useState, useTransition } from "react";
import type { DocumentListItem, DocumentType, SessionContext } from "@/types";

type Props = {
  initialDocs: DocumentListItem[];
  initialTotal: number;
  tipos: DocumentType[];
  ctx: SessionContext;
  listarDocumentosAction: (filtros?: {
    party_id?: string;
    type_id?: string;
    data_inicio?: string;
    data_fim?: string;
    page?: number;
  }) => Promise<{ data: DocumentListItem[]; total: number; error?: string }>;
};

const SLUG_ICONS: Record<string, string> = {
  "declaracao-membro-ativo":  "📋",
  "certidao-batismo":         "✝️",
  "carta-transferencia":      "📨",
  "oficio-ministerio":        "📄",
  "declaracao-cargo":         "🏅",
};

const SLUG_COLORS: Record<string, string> = {
  "declaracao-membro-ativo":  "bg-blue-50 text-blue-700 border-blue-200",
  "certidao-batismo":         "bg-purple-50 text-purple-700 border-purple-200",
  "carta-transferencia":      "bg-orange-50 text-orange-700 border-orange-200",
  "oficio-ministerio":        "bg-gray-50 text-gray-700 border-gray-200",
  "declaracao-cargo":         "bg-green-50 text-green-700 border-green-200",
};

export default function DocumentList({
  initialDocs,
  initialTotal,
  tipos,
  listarDocumentosAction,
}: Props) {
  const [docs, setDocs] = useState(initialDocs);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [typeId, setTypeId] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [isPending, startTransition] = useTransition();

  const totalPages = Math.ceil(total / 25);

  function applyFilters(newPage = 1) {
    startTransition(async () => {
      const result = await listarDocumentosAction({
        type_id: typeId || undefined,
        data_inicio: dataInicio || undefined,
        data_fim: dataFim || undefined,
        page: newPage,
      });
      setDocs(result.data);
      setTotal(result.total);
      setPage(newPage);
    });
  }

  function clearFilters() {
    setTypeId("");
    setDataInicio("");
    setDataFim("");
    startTransition(async () => {
      const result = await listarDocumentosAction({ page: 1 });
      setDocs(result.data);
      setTotal(result.total);
      setPage(1);
    });
  }

  const hasFilters = typeId || dataInicio || dataFim;

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de Documento</label>
            <select
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os tipos</option>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">De</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Até</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => applyFilters(1)}
            disabled={isPending}
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {isPending ? "Filtrando…" : "Filtrar"}
          </button>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700 px-2 py-2"
            >
              × Limpar
            </button>
          )}
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {isPending ? "Carregando…" : `${total} documento${total !== 1 ? "s" : ""}`}
          </span>
        </div>

        {docs.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">📄</div>
            <p className="text-gray-500 text-sm">Nenhum documento emitido ainda</p>
            <a
              href="/dashboard/secretaria/novo"
              className="inline-block mt-4 text-blue-600 text-sm font-semibold hover:underline"
            >
              Emitir primeiro documento →
            </a>
          </div>
        ) : (
          <div className={`overflow-x-auto transition-opacity ${isPending ? "opacity-50" : ""}`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Protocolo</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Membro</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Unidade</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Data</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {docs.map((doc) => {
                  const icon = SLUG_ICONS[doc.tipo_slug] ?? "📄";
                  const colorClass = SLUG_COLORS[doc.tipo_slug] ?? "bg-gray-50 text-gray-700 border-gray-200";
                  const dataFormatada = new Date(doc.data_emissao + "T00:00:00").toLocaleDateString("pt-BR");

                  return (
                    <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {doc.numero_protocolo ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${colorClass}`}>
                          {icon} {doc.tipo_nome}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{doc.membro_nome}</p>
                        {doc.membro_matricula && (
                          <p className="text-xs text-gray-400">{doc.membro_matricula}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{doc.unidade_nome ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{dataFormatada}</td>
                      <td className="px-4 py-3">
                        <a
                          href={`/api/documentos/${doc.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          PDF
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => applyFilters(page - 1)}
                disabled={page <= 1 || isPending}
                className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                ← Anterior
              </button>
              <button
                onClick={() => applyFilters(page + 1)}
                disabled={page >= totalPages || isPending}
                className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Próxima →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
