import { createClient } from "@/utils/supabase/server";
import { requireAuthContext } from "@/utils/supabase/auth-context";
import MeuPerfilClient from "./MeuPerfilClient";

export const dynamic = "force-dynamic";

export default async function MeuPerfilPage() {
  const ctx = await requireAuthContext();
  const sb  = await createClient();
  const { data: { user } } = await sb.auth.getUser();

  // Buscar party vinculado ao user
  const { data: party } = await sb
    .from("parties")
    .select(`id, full_name, cpf, data_nascimento, telefone, email, data_membro, status, foto_url,
      units:unit_id(name),
      genders:gender_id(nome),
      civil_statuses:civil_status_id(nome)`)
    .eq("ministry_id", ctx.ministry_id)
    .eq("user_id", user?.id)
    .maybeSingle();

  // Eventos inscritos
  const { data: inscricoes } = await sb
    .from("event_registrations")
    .select("id, status, created_at, events:event_id(titulo, data_inicio, status)")
    .eq("ministry_id", ctx.ministry_id)
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(10);

  // Documentos emitidos
  const { data: documentos } = await sb
    .from("documents")
    .select("id, tipo, titulo, created_at, pdf_url")
    .eq("ministry_id", ctx.ministry_id)
    .eq("party_id", party?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(10);

  // Certificados de cursos
  const { data: certificados } = await sb
    .from("course_enrollments")
    .select("id, status, completed_at, courses:course_id(titulo)")
    .eq("ministry_id", ctx.ministry_id)
    .eq("party_id", party?.id ?? "")
    .eq("status", "CERTIFICADO")
    .order("completed_at", { ascending: false })
    .limit(10);

  return (
    <MeuPerfilClient
      party={party as any}
      userEmail={user?.email ?? ""}
      inscricoes={inscricoes ?? []}
      documentos={documentos ?? []}
      certificados={certificados ?? []}
      ministryName={ctx.ministry_name ?? ""}
    />
  );
}
