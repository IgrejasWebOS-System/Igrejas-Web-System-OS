import { NextRequest, NextResponse } from "next/server";
import { validateAPIKey, hasScope } from "@/middleware/api-key";
import { createClient } from "@/utils/supabase/server";

/**
 * GET /api/v1/membros
 * Query: ?status=ATIVO&limit=50&offset=0
 */
export async function GET(req: NextRequest) {
  const key = req.headers.get("X-API-Key") ?? req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!key) return NextResponse.json({ error: "API key required" }, { status: 401 });

  const auth = await validateAPIKey(key);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });
  if (!hasScope(auth.escopos!, "membros:read")) return NextResponse.json({ error: "Insufficient scope" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const limit  = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const sb = await createClient();
  let q = sb.from("parties")
    .select("id, full_name, email, telefone, status, data_ingresso, created_at", { count: "exact" })
    .eq("ministry_id", auth.ministry_id!)
    .eq("type", "MEMBRO")
    .is("deleted_at", null)
    .order("full_name")
    .range(offset, offset + limit - 1);
  if (status) q = q.eq("status", status);

  const { data, count, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, count, limit, offset });
}
