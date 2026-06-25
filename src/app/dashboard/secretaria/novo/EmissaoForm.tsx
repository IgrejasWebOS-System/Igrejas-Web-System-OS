"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { sanitizeHtmlClient } from "@/utils/sanitize";
import type { DocumentType, SessionContext } from "@/types";

type MembroResult = {
  party_id: string;
  nome: string;
  matricula: string | null;
  unidade: string | null;
};

type Props = {
  tipos: DocumentType[];
  ctx: SessionContext;
  emitirAction: (payload: {
    party_id: string;
    type_id: string;
    observacoes?: string;
  }) => Promise<{ data?: { id: string; numero_protocolo: string }; error?: string }>;
  buscarMembrosAction: (
    termo: string
  ) => Promise<{ data: MembroResult[]; error?: string }>;
  buscarTipoAction: (
    typeId: string
  ) => Promise<{ data: DocumentType | null; error?: string }>;
};

const SLUG_ICONS: Record<string, string> = {
  "declaracao-membro-ativo":  "📋",
  "certidao-batismo":         "✝️",
  "carta-transferencia":      "📨",
  "oficio-ministerio":        "📄",
  "declaracao-cargo":         "🏅",
};

export default function EmissaoForm({
  tipos,
  emitirAction,
  buscarMembrosAction,
  buscarTipoAction,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Membro
  const [termoBusca, setTermoBusca] = useState("");
  const [sugestoes, setSugestoes] = useState<MembroResult[]>([]);
  const [membroSelecionado, setMembroSelecionado] = useState<MembroResult | null>(null);
  const [buscando, setBuscando] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tipo
  const [typeId, setTypeId] = useState("");
  const [tipoSelecionado, setTipoSelecionado] = useState<DocumentType | null>(null);

  // Outros
  const [observacoes, setObservacoes] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState<{ id: string; protocolo: string } | null>(null);

  // Busca de membros com debounce
  useEffect(() => {
    if (termoBusca.length < 2) { setSugestoes([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setBuscando(true);
      const result = await buscarMembrosAction(termoBusca);
      setSugestoes(result.data);
      setBuscando(false);
    }, 300);
  }, [termoBusca, buscarMembrosAction]);

  // Busca e sanitiza template ao mudar tipo (SEC-7: previne XSS em preview)
  useEffect(() => {
    if (!typeId) { setTipoSelecionado(null); return; }
    buscarTipoAction(typeId).then(async (r) => {
      if (!r.data) { setTipoSelecionado(null); return; }
      const safeHtml = await sanitizeHtmlClient(r.data.template_html);
      setTipoSelecionado({ ...r.data, template_html: safeHtml });
    });
  }, [typeId, buscarTipoAction]);

  function selecionarMembro(m: MembroResult) {
    setMembroSelecionado(m);
    setTermoBusca(m.nome);
    setSugestoes([]);
  }

  function limparMembro() {
    setMembroSelecionado(null);
    setTermoBusca("");
    setSugestoes([]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!membroSelecionado) { setErro("Selecione um membro."); return; }
    if (!typeId) { setErro("Selecione o tipo de documento."); return; }
    setErro("");

    startTransition(async () => {
      const result = await emitirAction({
        party_id: membroSelecionado.party_id,
        type_id: typeId,
        observacoes: observacoes || undefined,
      });

      if (result.error) {
        setErro(result.error);
        return;
      }

      setSucesso({ id: result.data!.id, protocolo: result.data!.numero_protocolo });
    });
  }

  if (sucesso) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center space-y-4">
        <div className="text-5xl">✅</div>
        <h2 className="text-xl font-bold text-gray-900">Documento emitido!</h2>
        <p className="text-sm text-gray-500">
          Protocolo: <span className="font-mono font-bold text-gray-800">{sucesso.protocolo}</span>
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <a
            href={`/api/documentos/${sucesso.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Abrir PDF
          </a>
          <button
            onClick={() => {
              setSucesso(null);
              setMembroSelecionado(null);
              setTermoBusca("");
              setTypeId("");
              setTipoSelecionado(null);
              setObservacoes("");
            }}
            className="text-sm text-gray-500 hover:text-gray-700 px-5 py-2.5 border border-gray-200 rounded-lg"
          >
            Emitir outro
          </button>
          <button
            onClick={() => router.push("/dashboard/secretaria")}
            className="text-sm text-gray-500 hover:text-gray-700 px-5 py-2.5 border border-gray-200 rounded-lg"
          >
            Ver lista
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Membro */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">1. Membro</h2>

        {membroSelecionado ? (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <div>
              <p className="font-semibold text-gray-900 text-sm">{membroSelecionado.nome}</p>
              <p className="text-xs text-gray-500">
                {membroSelecionado.matricula && <span className="mr-3">Matrícula: {membroSelecionado.matricula}</span>}
                {membroSelecionado.unidade && <span>{membroSelecionado.unidade}</span>}
              </p>
            </div>
            <button
              type="button"
              onClick={limparMembro}
              className="text-xs text-gray-400 hover:text-red-500"
            >
              × Trocar
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por nome ou CPF…"
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {buscando && (
              <p className="absolute right-3 top-2.5 text-xs text-gray-400">Buscando…</p>
            )}
            {sugestoes.length > 0 && (
              <div className="absolute z-10 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                {sugestoes.map((m) => (
                  <button
                    key={m.party_id}
                    type="button"
                    onClick={() => selecionarMembro(m)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0"
                  >
                    <p className="text-sm font-medium text-gray-900">{m.nome}</p>
                    <p className="text-xs text-gray-400">
                      {m.matricula && <span className="mr-2">#{m.matricula}</span>}
                      {m.unidade}
                    </p>
                  </button>
                ))}
              </div>
            )}
            {termoBusca.length >= 2 && !buscando && sugestoes.length === 0 && (
              <p className="absolute top-full mt-1 w-full text-xs text-gray-400 bg-white border border-gray-200 rounded-lg px-4 py-3">
                Nenhum membro ativo encontrado
              </p>
            )}
          </div>
        )}
      </div>

      {/* Tipo de documento */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">2. Tipo de Documento</h2>
        <div className="grid grid-cols-1 gap-2">
          {tipos.map((t) => {
            const icon = SLUG_ICONS[t.slug] ?? "📄";
            const isSelected = typeId === t.id;
            return (
              <label
                key={t.id}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  isSelected
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="type_id"
                  value={t.id}
                  checked={isSelected}
                  onChange={(e) => setTypeId(e.target.value)}
                  className="mt-0.5 accent-blue-600"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {icon} {t.nome}
                  </p>
                  {t.descricao && (
                    <p className="text-xs text-gray-500 mt-0.5">{t.descricao}</p>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Preview do template */}
      {tipoSelecionado && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Preview do Template</h2>
          <p className="text-xs text-gray-400">
            As variáveis em <code className="bg-gray-100 px-1 rounded">{"{{chaves}}"}</code> serão
            substituídas pelos dados do membro na emissão.
          </p>
          <div className="border border-gray-100 rounded-lg overflow-hidden bg-gray-50 p-2 max-h-64 overflow-y-auto">
            <div
              className="scale-75 origin-top-left pointer-events-none"
              dangerouslySetInnerHTML={{ __html: tipoSelecionado.template_html }}
            />
          </div>
        </div>
      )}

      {/* Observações */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
        <h2 className="text-sm font-semibold text-gray-700">3. Observações (opcional)</h2>
        <textarea
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          rows={2}
          placeholder="Observações internas sobre este documento…"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || !membroSelecionado || !typeId}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-3 rounded-xl transition-colors"
      >
        {isPending ? "Emitindo documento…" : "Emitir Documento"}
      </button>
    </form>
  );
}
