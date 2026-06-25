import { createClient }   from "@/utils/supabase/server";
import { getAuthContext } from "@/utils/supabase/auth-context";
import { redirect }       from "next/navigation";
import TurmaForm          from "./TurmaForm";
import { criarTurmaAction, buscarMembroParaEbd } from "../../actions";

export default async function NovaTurmaPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data: units } = await supabase
    .from("units")
    .select("id, name, unit_type")
    .eq("ministry_id", ctx.ministry_id)
    .eq("is_active", true)
    .order("name");

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", paddingBottom: 40 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--color-text-primary)", margin: 0 }}>
          Nova Turma EBD
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>
          Configure a turma, professor responsável e horário.
        </p>
      </div>

      <TurmaForm
        units={units ?? []}
        criarTurmaAction={criarTurmaAction}
        buscarMembroAction={buscarMembroParaEbd}
      />
    </div>
  );
}
