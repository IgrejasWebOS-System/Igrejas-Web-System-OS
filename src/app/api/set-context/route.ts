import { type NextRequest } from "next/server";
import { createClient }    from "@/utils/supabase/server";
import { cookies }         from "next/headers";
import { redirect }        from "next/navigation";
import type { SessionContext, ModuleKey } from "@/types";

export async function GET(request: NextRequest) {
  const ministryId = request.nextUrl.searchParams.get("ministry");
  if (!ministryId) redirect("/contexto");

  const supabase     = await createClient();
  const cookieStore  = await cookies();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Tenta role específico
  type RoleResult = { level: number; unit_id: string | null; ministries: { id: string; name: string; slug: string } | null };
  let resolvedRole: RoleResult | null = null;

  const { data: specificRole } = await supabase
    .from("admin_roles")
    .select("level, unit_id, ministries(id, name, slug)")
    .eq("user_id", user.id)
    .eq("ministry_id", ministryId)
    .eq("is_active", true)
    .maybeSingle();

  if (specificRole) {
    resolvedRole = specificRole as unknown as RoleResult;
  } else {
    // Tenta Super-Master
    const { data: superRole } = await supabase
      .from("admin_roles")
      .select("level, unit_id")
      .eq("user_id", user.id)
      .is("ministry_id", null)
      .eq("level", 0)
      .eq("is_active", true)
      .maybeSingle();

    if (superRole) {
      const { data: ministryData } = await supabase
        .from("ministries")
        .select("id, name, slug")
        .eq("id", ministryId)
        .single();

      resolvedRole = { level: 0, unit_id: null, ministries: ministryData ?? null };
    }
  }

  if (!resolvedRole) redirect("/contexto");

  // Módulos ativos
  const { data: modulesData } = await supabase
    .from("ministry_modules")
    .select("module")
    .eq("ministry_id", ministryId)
    .eq("is_active", true);

  const modules  = (modulesData ?? []).map(m => m.module as ModuleKey);
  const ministry = resolvedRole!.ministries;

  const contexto: SessionContext = {
    ministry_id:   ministryId,
    ministry_name: ministry?.name ?? "",
    ministry_slug: ministry?.slug ?? "",
    unit_id:       resolvedRole!.unit_id ?? null,
    level:         resolvedRole!.level as 0 | 1 | 2 | 3 | 4,
    modules,
  };

  cookieStore.set("iw_context", JSON.stringify(contexto), {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    maxAge:   60 * 60 * 24 * 30,
    path:     "/",
    sameSite: "lax",
  });

  redirect("/dashboard");
}
