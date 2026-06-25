import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionContext } from "@/types";
import { listarTiposDocumento } from "../actions";
import EmissaoForm from "./EmissaoForm";
import {
  emitirDocumentoAction,
  buscarMembrosParaDocumento,
  buscarTipoDocumento,
} from "../actions";

export const metadata = { title: "Emitir Documento — IgrejasWeb" };

export default async function NovoDocumentoPage() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("iw_context")?.value;
  if (!raw) redirect("/contexto");
  const ctx: SessionContext = JSON.parse(raw);

  const { data: tipos } = await listarTiposDocumento();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <a
          href="/dashboard/secretaria"
          className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-4"
        >
          ← Voltar para Secretaria
        </a>
        <h1 className="text-2xl font-bold text-gray-900">Emitir Documento</h1>
        <p className="text-sm text-gray-500 mt-1">
          Selecione o membro e o tipo de documento. O protocolo é gerado automaticamente.
        </p>
      </div>

      <EmissaoForm
        tipos={tipos}
        ctx={ctx}
        emitirAction={emitirDocumentoAction}
        buscarMembrosAction={buscarMembrosParaDocumento}
        buscarTipoAction={buscarTipoDocumento}
      />
    </div>
  );
}
