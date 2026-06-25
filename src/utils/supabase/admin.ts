import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com service_role key.
 * ⚠ APENAS para uso em Server Actions e Route Handlers.
 * NUNCA importar em Client Components ou expor ao browser.
 */
export function createAdminClient() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada no .env.local");
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
