import { NextRequest, NextResponse } from "next/server";
import { validateAPIKey, hasScope } from "@/middleware/api-key";
import { createClient } from "@/utils/supabase/server";

export async function GET(req: NextRequest) {
  const key = req.headers.get("X-API-Key") ?? req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!key) return NextResponse.json({ error: "API key required" }, { status: 401 });

  const auth = await validateAPIKey(key);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!hasScope(auth.escopos!, "eventos:read")) return NextResponse.json({ error: "Insufficient scope" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);
  const de    = searchParams.get("de") ?? new Date().toISOString().slice(0, 10);

  const sb = await createClient();
  const { data, count, error } = await sb
    .from("events")
    .select("id, titulo, descricao, categoria, data_inicio, data_fim, local, vagas, publico", { count: "exact" })
    .eq("ministry_id", auth.ministry_id!)
    .eq("publico", true)
    .gte("data_inicio", de)
    .order("data_inicio")
    .limit(limit);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, count });
}
