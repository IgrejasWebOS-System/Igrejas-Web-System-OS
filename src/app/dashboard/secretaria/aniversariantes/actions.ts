"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies }      from "next/headers";
import type { SessionContext } from "@/types";

export type Aniversariante = {
  party_id:   string;
  full_name:  string;
  phone:      string | null;
  birth_date: string;      // YYYY-MM-DD
  dia:        number;
  mes:        number;
  idade:      number | null;
  matricula:  string | null;
  unit_name:  string | null;
};

export async function buscarAniversariantes(mes: number): Promise<{
  data: Aniversariante[];
  error?: string;
}> {
  const cookieStore = await cookies();
  const raw = cookieStore.get("iw_context")?.value;
  if (!raw) return { data: [], error: "Sem contexto" };
  const ctx: SessionContext = JSON.parse(raw);

  const supabase = await createClient();

  // Busca todos os membros ativos com birth_date preenchida.
  // Filtragem por mês é feita em JS pois Supabase client não expõe EXTRACT.
  const { data, error } = await supabase
    .from("party_members")
    .select(`
      id, matricula, unit_id,
      units ( name ),
      parties!inner ( id, full_name, phone, birth_date )
    `)
    .eq("ministry_id", ctx.ministry_id)
    .eq("is_active", true)
    .eq("situacao", "ATIVO")
    .not("parties.birth_date", "is", null);

  if (error) return { data: [], error: error.message };

  const hoje = new Date();
  const anoAtual = hoje.getFullYear();

  const rows = (data ?? []) as any[];
  const filtrados: Aniversariante[] = [];

  for (const r of rows) {
    const bd: string | null = r.parties?.birth_date;
    if (!bd) continue;

    const [anoNasc, mesNasc, diaNasc] = bd.split("-").map(Number);
    if (mesNasc !== mes) continue;

    const idadeCalc = anoAtual - anoNasc - (
      hoje.getMonth() + 1 > mesNasc ||
      (hoje.getMonth() + 1 === mesNasc && hoje.getDate() >= diaNasc)
        ? 0 : 1
    );

    filtrados.push({
      party_id:  r.parties.id,
      full_name: r.parties.full_name,
      phone:     r.parties.phone ?? null,
      birth_date: bd,
      dia:       diaNasc,
      mes:       mesNasc,
      idade:     anoNasc > 1 ? idadeCalc : null,
      matricula: r.matricula ?? null,
      unit_name: (r.units as { name: string } | null)?.name ?? null,
    });
  }

  // Ordena por dia do mês
  filtrados.sort((a, b) => a.dia - b.dia);

  return { data: filtrados };
}
