import { createHash } from "crypto";
import { createClient } from "@/utils/supabase/server";

export interface APIAuthResult {
  ok: boolean;
  ministry_id?: string;
  escopos?: string[];
  error?: string;
}

export async function validateAPIKey(key: string): Promise<APIAuthResult> {
  if (!key?.startsWith("igsk_")) return { ok: false, error: "Invalid key format" };

  const hash = createHash("sha256").update(key).digest("hex");
  const sb   = await createClient();

  const { data } = await sb
    .from("api_keys")
    .select("id, ministry_id, escopos, expira_em, ativo")
    .eq("key_hash", hash)
    .single();

  if (!data || !data.ativo) return { ok: false, error: "Key not found or inactive" };
  if (data.expira_em && new Date(data.expira_em) < new Date()) return { ok: false, error: "Key expired" };

  // Update last use (fire-and-forget)
  sb.from("api_keys").update({ ultimo_uso: new Date().toISOString() }).eq("id", data.id).then(() => {});

  return { ok: true, ministry_id: data.ministry_id, escopos: data.escopos };
}

export function hasScope(escopos: string[], required: string): boolean {
  return escopos.includes(required) || escopos.includes("*");
}
