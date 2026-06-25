import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionContext } from "@/types";
import { listarDocumentos, listarTiposDocumento } from "./actions";
import DocumentList from "./DocumentList";

export const metadata = { title: "Secretaria — IgrejasWeb" };

export default async function SecretariaPage() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("iw_context")?.value;
  if (!raw) redirect("/contexto");
  const ctx: SessionContext = JSON.parse(raw);

  const [docsResult, tiposResult] = await Promise.all([
    listarDocumentos({ page: 1 }),
    listarTiposDocumento(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Secretaria</h1>
          <p className="text-sm text-gray-500 mt-1">Documentos eclesiásticos emitidos</p>
        </div>
        <a
          href="/dashboard/secretaria/novo"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Emitir Documento
        </a>
      </div>

      <DocumentList
        initialDocs={docsResult.data}
        initialTotal={docsResult.total}
        tipos={tiposResult.data}
        ctx={ctx}
        listarDocumentosAction={listarDocumentos}
      />
    </div>
  );
}
