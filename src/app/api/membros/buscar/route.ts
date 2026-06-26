import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getAuthContext } from "@/utils/supabase/auth-context";

// GET /api/membros/buscar?q=termo&limit=10
// Retorna { id, nome_completo, matricula } para uso no DisciplinaDetail
export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ data: [], error: "Não autorizado" }, { status: 401 });
    const supabase = await createClient();

    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "10");

    if (!q) return NextResponse.json({ data: [] });

    // Busca por nome na tabela parties
    const { data: parties, error } = await supabase
      .from("parties")
      .select("id, full_name")
      .eq("ministry_id", ctx.ministry_id)
      .eq("is_active", true)
      .ilike("full_name", `%${q}%`)
      .order("full_name")
      .limit(limit);

    if (error) {
      return NextResponse.json({ data: [], error: error.message }, { status: 500 });
    }

    const partyIds = (parties ?? []).map((p) => p.id);

    // Busca matrículas em party_members
    const { data: pmList } = partyIds.length
      ? await supabase
          .from("party_members")
          .select("party_id, matricula")
          .in("party_id", partyIds)
          .eq("ministry_id", ctx.ministry_id)
      : { data: [] };

    const matriculaMap: Record<string, string> = Object.fromEntries(
      (pmList ?? []).map((pm: any) => [pm.party_id, pm.matricula ?? ""])
    );

    const data = (parties ?? []).map((p) => ({
      id: p.id,
      nome_completo: p.full_name ?? "",
      matricula: matriculaMap[p.id] ?? "",
    }));

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ data: [], error: e.message }, { status: 401 });
  }
}
