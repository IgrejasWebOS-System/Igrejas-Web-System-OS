import { cookies }  from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import type { SessionContext, Unit, AdminLevel } from "@/types";
import UserTable from "./UserTable";
import type { UsuarioComRole } from "./actions";
import {
  convidarUsuarioAction,
  atualizarUsuarioAction,
  revogarAcessoAction,
  reativarAcessoAction,
} from "./actions";

export const metadata = { title: "Gestão de Usuários — IgrejasWeb" };

export default async function UsuariosPage() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("iw_context")?.value;
  if (!raw) redirect("/contexto");

  const ctx: SessionContext = JSON.parse(raw);
  if (ctx.level > 1) redirect("/dashboard");

  const supabase = await createClient();

  // Busca unidades (para o modal de convite/edição)
  const { data: units } = await supabase
    .from("units")
    .select("id, ministry_id, parent_id, name, unit_type, is_headquarters, is_sector_mother, is_active, order_index, created_at, updated_at")
    .eq("ministry_id", ctx.ministry_id)
    .eq("is_active", true)
    .order("name");

  // ── Fetch de usuários direto no Server Component ───────────────────────────
  // Não chamamos listarUsuariosAction() aqui para evitar dependência de
  // getAuthContext() / app_metadata na renderização inicial da página.
  // RLS do supabase client já filtra por ministry_id do usuário autenticado.
  let usuarios: UsuarioComRole[] = [];
  const serviceKeyAvailable = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const { data: roles } = await supabase
      .from("admin_roles")
      .select("id, user_id, level, unit_id, is_active, created_at, units(name)")
      .eq("ministry_id", ctx.ministry_id)
      .order("level", { ascending: true });

    if (roles && roles.length > 0) {
      // Enriquece com e-mails via admin API (requer service_role)
      let userMap = new Map<string, string>();
      if (serviceKeyAvailable) {
        try {
          const adminClient = createAdminClient();
          const { data: authData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
          userMap = new Map(authData?.users?.map(u => [u.id, u.email ?? "—"]) ?? []);
        } catch { /* service key presente mas falhou — exibe sem e-mail */ }
      }

      usuarios = roles.map(r => ({
        role_id:    r.id,
        user_id:    r.user_id,
        email:      userMap.get(r.user_id) ?? "—",
        level:      r.level as AdminLevel,
        unit_id:    r.unit_id,
        unit_name:  (r.units as unknown as { name: string } | null)?.name ?? null,
        is_active:  r.is_active,
        created_at: r.created_at,
      }));
    }
  } catch (err) {
    console.error("[usuarios/fetch]", err);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1100 }}>

      {/* ── Cabeçalho ─────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
            Gestão de Usuários
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>
            {ctx.ministry_name} · Controle de acessos e níveis hierárquicos
          </p>
        </div>
      </div>

      {/* ── Legenda de níveis ──────────────────────────────── */}
      <div style={{
        display: "flex", gap: 8, flexWrap: "wrap",
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 10, padding: "12px 16px",
      }}>
        <span style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 600, marginRight: 4 }}>Hierarquia:</span>
        {([
          { level: 0, label: "N0 Super Master",  color: "#ef4444" },
          { level: 1, label: "N1 Admin Campo",   color: "#f97316" },
          { level: 2, label: "N2 Admin Sede",    color: "#4A7DB5" },
          { level: 3, label: "N3 Admin Setor",   color: "#22c55e" },
          { level: 4, label: "N4 Usuário Local", color: "#8b5cf6" },
        ]).map((l, i, arr) => (
          <span key={l.level} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
              background: `${l.color}15`, color: l.color,
            }}>
              {l.label}
            </span>
            {i < arr.length - 1 && (
              <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth={2.5}>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            )}
          </span>
        ))}
      </div>

      {/* ── Painel de Testes DEV ───────────────────────────── */}
      <details style={{
        background: "#fafaf9",
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        overflow: "hidden",
      }}>
        <summary style={{
          padding: "10px 16px", cursor: "pointer",
          fontSize: 12, fontWeight: 700, color: "#6b7280",
          listStyle: "none", display: "flex", alignItems: "center", gap: 8,
          userSelect: "none",
        }}>
          🛠 Usuários de Teste (migration 004_test_users.sql)
          <span style={{ marginLeft: "auto", fontSize: 10 }}>clique para expandir ▸</span>
        </summary>
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid #e5e7eb" }}>
          <p style={{ fontSize: 11, color: "#6b7280", marginTop: 12, marginBottom: 8 }}>
            Todos os usuários abaixo têm senha <code style={{ background: "#f3f4f6", padding: "1px 4px", borderRadius: 4 }}>Senha1234@</code>.
            Execute a migration 004 no SQL Editor do Supabase antes de usar.
          </p>
          <div style={{ display: "grid", gap: 6 }}>
            {([
              { email: "admin@igrejasweb.os",          pass: "Admin@123456!",  nivel: "N0", desc: "Super Master — acessa TODOS os ministérios",                   color: "#ef4444" },
              { email: "piracicaba@igrejasweb.os",      pass: "Piracicaba@123!",nivel: "N1", desc: "Admin Campo Piracicaba — vê tudo do campo",                    color: "#f97316" },
              { email: "saopaulo@igrejasweb.os",        pass: "SaoPaulo@123!",  nivel: "N1", desc: "Admin Campo São Paulo — testa isolamento entre ministérios",    color: "#f97316" },
              { email: "userN2_01@igrejasweb.test",     pass: "Senha1234@",     nivel: "N2", desc: "Admin Sede · Igreja Sede Piracicaba — vê sede e setores",      color: "#4A7DB5" },
              { email: "userN3_01@igrejasweb.test",     pass: "Senha1234@",     nivel: "N3", desc: "Admin Setor 01 Piracicaba — vê apenas Setor 01 e igrejas",     color: "#22c55e" },
              { email: "userN4_01@igrejasweb.test",     pass: "Senha1234@",     nivel: "N4", desc: "Usuário Local · Igreja Vila Rezende — acesso mínimo",          color: "#8b5cf6" },
              { email: "userN3_sp@igrejasweb.test",     pass: "Senha1234@",     nivel: "N3", desc: "Admin Setor SP — valida que não vê dados de Piracicaba",       color: "#22c55e" },
            ] as const).map(u => (
              <div key={u.email} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 12px",
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 8, fontSize: 12,
              }}>
                <span style={{
                  padding: "2px 8px", borderRadius: 99,
                  fontSize: 10, fontWeight: 800,
                  background: `${u.color}15`, color: u.color,
                  flexShrink: 0,
                }}>{u.nivel}</span>
                <code style={{ color: "#1e293b", fontWeight: 600, flex: "0 0 auto" }}>{u.email}</code>
                <span style={{ color: "#94a3b8" }}>·</span>
                <code style={{ color: "#64748b", fontSize: 11 }}>{u.pass}</code>
                <span style={{ color: "#94a3b8", flex: 1, textAlign: "right", fontSize: 11 }}>{u.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </details>

      {/* ── Aviso se service role não configurada ─────────── */}
      {usuarios.length === 0 && !serviceKeyAvailable && (
        <div style={{
          background: "#fff8f1", border: "1px solid #fed7aa",
          borderRadius: 8, padding: "12px 16px",
          color: "#d97706", fontSize: 13,
        }}>
          ⚠ Configure <code>SUPABASE_SERVICE_ROLE_KEY</code> no <code>.env.local</code> para listar e convidar usuários.
        </div>
      )}

      {/* ── Tabela interativa ──────────────────────────────── */}
      <UserTable
        usuarios={usuarios}
        units={(units ?? []) as Unit[]}
        currentLevel={ctx.level}
        convidarAction={convidarUsuarioAction}
        atualizarAction={atualizarUsuarioAction}
        revogarAction={revogarAcessoAction}
        reativarAction={reativarAcessoAction}
      />
    </div>
  );
}
