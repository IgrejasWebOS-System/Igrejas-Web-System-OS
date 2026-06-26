import { createClient }              from "@/utils/supabase/server";
import { redirect }                  from "next/navigation";
import { selecionarContextoAction }  from "./actions";  // usado pelo MinistryCard via prop
import MinistryCard                  from "./MinistryCard";
import type { AdminRole }            from "@/types";

type MinistryData = { id: string; name: string; slug: string; logo_url: string | null };

type DisplayRole = {
  id: string;
  level: number;
  unit_id: string | null;
  ministry_id: string;
  ministries: MinistryData;
};

export default async function ContextoPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Busca os roles do usuário
  const { data: roles } = await supabase
    .from("admin_roles")
    .select("id, level, unit_id, ministry_id, ministries(id, name, slug, logo_url)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("level");

  const adminRoles = (roles ?? []) as unknown as AdminRole[];

  // Detecta Super-Master (level=0 com ministry_id=null)
  const isSuperMaster = adminRoles.some(r => r.level === 0 && !r.ministry_id);

  // Monta lista de ministérios para exibir
  let displayRoles: DisplayRole[] = [];

  if (isSuperMaster) {
    // Super-Master vê TODOS os ministérios ativos
    const { data: allMinistries } = await supabase
      .from("ministries")
      .select("id, name, slug, logo_url")
      .eq("is_active", true)
      .order("name");

    displayRoles = (allMinistries ?? []).map(m => ({
      id:          `sm-${m.id}`,
      level:       0,
      unit_id:     null,
      ministry_id: m.id,
      ministries:  m as MinistryData,
    }));
  } else {
    // Admins normais: filtrar apenas roles com ministry_id real
    displayRoles = adminRoles
      .filter(r => !!r.ministry_id && !!r.ministries)
      .map(r => ({
        id:          String(r.id),
        level:       r.level,
        unit_id:     r.unit_id ?? null,
        ministry_id: r.ministry_id!,
        ministries:  r.ministries as unknown as MinistryData,
      }));

    // Se só tem 1 ministério → entra direto via Route Handler
    if (displayRoles.length === 1) {
      redirect(`/api/set-context?ministry=${displayRoles[0].ministry_id}`);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--color-bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
    }}>
      <div style={{ width: "100%", maxWidth: 560 }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56,
            background: "var(--color-primary)",
            borderRadius: "var(--radius-lg)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 14,
            boxShadow: "var(--shadow-md)",
          }}>
            <span style={{ color: "#fff", fontWeight: 900, fontSize: 20 }}>IW</span>
          </div>
          <h1 style={{
            fontSize: 20, fontWeight: 900,
            color: "var(--color-text-primary)",
          }}>
            Selecione o Ministério
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: 13, marginTop: 4 }}>
            {isSuperMaster
              ? `Super Master · ${displayRoles.length} ministério${displayRoles.length !== 1 ? "s" : ""} disponível${displayRoles.length !== 1 ? "is" : ""}`
              : `Você tem acesso a ${displayRoles.length} ministério${displayRoles.length !== 1 ? "s" : ""}. Selecione para continuar.`
            }
          </p>
        </div>

        {/* Cards de ministério */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {displayRoles.map((role) => (
            <MinistryCard
              key={role.id}
              roleId={role.id}
              ministryName={role.ministries.name}
              ministrySlug={role.ministries.slug}
              level={role.level}
              action={selecionarContextoAction.bind(null, role.ministry_id)}
            />
          ))}
        </div>

        {displayRoles.length === 0 && (
          <div style={{
            background: "var(--color-danger-bg)",
            border: "1px solid #F1948A",
            borderRadius: "var(--radius-lg)",
            padding: "20px",
            textAlign: "center",
          }}>
            <p style={{ color: "var(--color-danger)", fontWeight: 700 }}>
              Nenhum ministério vinculado à sua conta.
            </p>
            <p style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 6 }}>
              Solicite acesso ao administrador do sistema.
            </p>
          </div>
        )}

        {/* Logout */}
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <form action="/api/logout" method="POST">
            <button type="submit" style={{
              background: "none", border: "none",
              color: "var(--color-text-muted)",
              fontSize: 12, cursor: "pointer",
              textDecoration: "underline",
            }}>
              Sair da conta
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
