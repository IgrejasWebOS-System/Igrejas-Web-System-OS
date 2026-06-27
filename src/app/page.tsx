import { getAuthContext } from "@/utils/supabase/auth-context";
import { createAdminClient } from "@/utils/supabase/admin";
import QuickLoginPanel from "./QuickLoginPanel";

// ── Dados estáticos do design system ────────────────────────────────────────

const PALETA = [
  { color: "#4A7DB5", label: "Primário",       hex: "#4A7DB5" },
  { color: "#BDE9FB", label: "Primário Claro", hex: "#BDE9FB" },
  { color: "#6B7FA3", label: "Slate",          hex: "#6B7FA3" },
  { color: "#EAE0DA", label: "Bege",           hex: "#EAE0DA" },
  { color: "#D0E0CD", label: "Sage",           hex: "#D0E0CD" },
  { color: "#EBF2F8", label: "Background",     hex: "#EBF2F8" },
];

const TIPOGRAFIA = [
  { cor: "#000000", nome: "Black #000000",      desc: "Bordas e alto contraste" },
  { cor: "#1C2833", nome: "Smoke #1C2833",      desc: "Títulos e leitura em tela" },
  { cor: "#333333", nome: "Night Rider #333333", desc: "Corpo de texto e parágrafos" },
];

const MODULOS = [
  "membros", "financeiro", "escola", "cursos", "ebd",
  "secretaria", "patrimônio", "eventos", "ocorrências",
  "comunicação", "voluntários", "infantil", "governança",
  "permissões", "api & webhooks", "configurações", "analytics", "conciliação",
];

// ── Helpers de estilo ────────────────────────────────────────────────────────

const card = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  padding: "16px 18px",
  marginBottom: 12,
  ...extra,
});

const sectionLabel = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  fontSize: 10, fontWeight: 700,
  color: "var(--color-text-muted)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  marginBottom: 10,
  display: "flex", alignItems: "center", gap: 5,
  ...extra,
});

// ── Componente principal ─────────────────────────────────────────────────────

export default async function Home() {
  // Tenta pegar contexto — não redireciona se não autenticado
  let ctx = null;
  let campos: Array<{
    id: string; name: string; slug: string; is_active: boolean; created_at: string;
    ministry_branding: { cor_primaria: string; sigla: string } | null;
    ministry_modules: { is_active: boolean }[];
    provisioning_jobs: { status: string }[];
  }> = [];

  try {
    ctx = await getAuthContext();
  } catch { /* não autenticado — ok */ }

  // N0 busca lista de campos
  if (ctx && ctx.level === 0) {
    try {
      const admin = createAdminClient();
      const { data } = await admin
        .from("ministries")
        .select(`id, name, slug, is_active, created_at,
          ministry_branding ( cor_primaria, sigla ),
          ministry_modules ( is_active ),
          provisioning_jobs ( status )`)
        .order("created_at", { ascending: false })
        .limit(8);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      campos = (data ?? []) as any;
    } catch { /* silencioso */ }
  }

  const totalCampos  = campos.length;
  const camposAtivos = campos.filter(c => c.is_active).length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <header style={{
        background: "var(--color-surface)",
        borderBottom: "1px solid var(--color-border)",
        boxShadow: "var(--shadow-sm)",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: "var(--color-primary)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontWeight: 900, fontSize: 13 }}>IW</span>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--color-text-primary)", lineHeight: 1 }}>IgrejasWeb</div>
              <div style={{ fontSize: 9, color: "var(--color-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>System OS</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {ctx && (
              <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                Logado como <strong style={{ color: "var(--color-text-primary)" }}>{ctx.ministry_name || "Super Master"}</strong>
              </span>
            )}
            <span style={{ fontSize: 10, fontWeight: 700, background: "var(--color-primary-light)", color: "var(--color-primary-dark)", padding: "3px 10px", borderRadius: 99 }}>
              v4.1 · Dev Console
            </span>
          </div>
        </div>
      </header>

      {/* ── Hero compacto ────────────────────────────────────────── */}
      <div style={{ background: "var(--color-primary)", padding: "20px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,.55)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>
            Plataforma Multi-Tenant · White Label SaaS
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#fff", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
            IgrejasWeb System OS
          </h1>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,.7)", margin: 0 }}>
            Um sistema · Múltiplos campos · Módulos configuráveis · Identidade visual por campo
          </p>
        </div>
      </div>

      {/* ── Conteúdo 2 colunas ──────────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

          {/* ══ COLUNA ESQUERDA: Design System ══════════════════════ */}
          <div>

            {/* Paleta de cores */}
            <div style={card()}>
              <div style={sectionLabel()}>
                <span>🎨</span> Paleta de cores
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
                {PALETA.map(p => (
                  <div key={p.hex} style={{ textAlign: "center" }}>
                    <div style={{ height: 36, background: p.color, borderRadius: 6, border: "1px solid var(--color-border)", marginBottom: 4 }} />
                    <div style={{ fontSize: 9, fontWeight: 700, color: "var(--color-text-primary)" }}>{p.label}</div>
                    <div style={{ fontSize: 9, color: "var(--color-text-muted)", fontFamily: "monospace" }}>{p.hex}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Padrões de texto */}
            <div style={card()}>
              <div style={sectionLabel()}>
                <span>✏️</span> Padrões de texto
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {TIPOGRAFIA.map(t => (
                  <div key={t.cor} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 24, height: 24, background: t.cor, borderRadius: 4, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: t.cor }}>{t.nome}</div>
                      <div style={{ fontSize: 10, color: "var(--color-text-muted)" }}>{t.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Módulos disponíveis */}
            <div style={card()}>
              <div style={sectionLabel()}>
                <span>🧩</span> Módulos da plataforma
                <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, background: "var(--color-sage)", color: "var(--color-success)", padding: "1px 8px", borderRadius: 99 }}>
                  {MODULOS.length} módulos
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>
                {MODULOS.map(m => (
                  <div key={m} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--color-text-secondary)", padding: "2px 0", textTransform: "capitalize" }}>
                    <div style={{ width: 5, height: 5, background: "var(--color-success)", borderRadius: "50%", flexShrink: 0 }} />
                    {m}
                  </div>
                ))}
              </div>
            </div>

            {/* Status do ambiente */}
            <div style={{
              background: "var(--color-sage)", border: "1px solid var(--color-sage-dark)",
              borderRadius: 10, padding: "12px 16px",
              display: "flex", alignItems: "flex-start", gap: 10,
            }}>
              <div style={{ width: 8, height: 8, background: "var(--color-success)", borderRadius: "50%", flexShrink: 0, marginTop: 3 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)" }}>
                  Ambiente configurado
                </div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
                  39 migrations aplicadas · Next.js 15 · Supabase · Tailwind v4 · Vercel-ready
                </div>
              </div>
            </div>

          </div>

          {/* ══ COLUNA DIREITA: Acesso + Campos + Identidade Visual ═ */}
          <div>

            {/* Login rápido */}
            <div style={card()}>
              <div style={sectionLabel({ marginBottom: 14 })}>
                <span>🔑</span> Acesso ao sistema
              </div>
              <QuickLoginPanel />
            </div>

            {/* Gestão de Campos — só para N0 autenticado */}
            {ctx && ctx.level === 0 ? (
              <div style={card()}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={sectionLabel({ marginBottom: 0 })}>
                    <span>⛪</span> Gestão de campos
                    <span style={{ fontSize: 9, fontWeight: 700, background: "#fef9c3", color: "#854d0e", padding: "1px 6px", borderRadius: 99, marginLeft: 4 }}>
                      N0
                    </span>
                  </div>
                  <a href="/dashboard/admin/campos" style={{ fontSize: 11, color: "var(--color-primary)", textDecoration: "none", fontWeight: 600 }}>
                    Ver todos →
                  </a>
                </div>

                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
                  {[
                    { label: "Total",    value: totalCampos,             color: "var(--color-primary)" },
                    { label: "Ativos",   value: camposAtivos,            color: "var(--color-success)" },
                    { label: "Inativos", value: totalCampos - camposAtivos, color: "var(--color-text-muted)" },
                  ].map(s => (
                    <div key={s.label} style={{ background: "var(--color-bg)", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: 9, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Tabela de campos */}
                {campos.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "20px 0", color: "var(--color-text-muted)", fontSize: 12 }}>
                    Nenhum campo cadastrado. <a href="/dashboard/admin/campos" style={{ color: "var(--color-primary)" }}>Criar primeiro campo →</a>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {campos.map(c => {
                      const b = c.ministry_branding;
                      const modAtivos = c.ministry_modules.filter(m => m.is_active).length;
                      const job = c.provisioning_jobs?.[0];
                      return (
                        <div key={c.id} style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "8px 10px", borderRadius: 8,
                          background: "var(--color-bg)", border: "1px solid var(--color-border)",
                        }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                            background: b?.cor_primaria ?? "var(--color-primary)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "#fff", fontSize: 9, fontWeight: 700,
                          }}>
                            {b?.sigla?.slice(0, 2) ?? "IW"}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                            <div style={{ fontSize: 10, color: "var(--color-text-muted)" }}>/{c.slug}</div>
                          </div>
                          <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
                            <span style={{ fontSize: 9, fontWeight: 600, background: "var(--color-sage)", color: "var(--color-success)", padding: "1px 6px", borderRadius: 99 }}>
                              {modAtivos} mód.
                            </span>
                            <span style={{
                              fontSize: 9, fontWeight: 600, padding: "1px 6px", borderRadius: 99,
                              background: c.is_active ? "var(--color-sage)" : "var(--color-danger-bg)",
                              color: c.is_active ? "var(--color-success)" : "var(--color-danger)",
                            }}>
                              {c.is_active ? "Ativo" : "Inativo"}
                            </span>
                            {job && job.status === "DONE" && (
                              <span style={{ fontSize: 9, color: "var(--color-success)" }}>✓</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div style={{ marginTop: 10 }}>
                  <a
                    href="/dashboard/admin/campos"
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      padding: "8px", borderRadius: 8,
                      border: "1px dashed var(--color-primary-muted)",
                      color: "var(--color-primary)", fontSize: 12, fontWeight: 600,
                      textDecoration: "none", background: "var(--color-primary-light)" + "40",
                    }}
                  >
                    + Provisionar novo campo
                  </a>
                </div>
              </div>
            ) : !ctx ? (
              /* Não autenticado — mostra teaser da feature */
              <div style={card({ background: "var(--color-bg)", border: "1px dashed var(--color-border)" })}>
                <div style={sectionLabel()}>
                  <span>⛪</span> Gestão de campos
                  <span style={{ fontSize: 9, fontWeight: 700, background: "#fef9c3", color: "#854d0e", padding: "1px 6px", borderRadius: 99, marginLeft: 4 }}>
                    Requer N0
                  </span>
                </div>
                <p style={{ fontSize: 11, color: "var(--color-text-muted)", lineHeight: 1.5, margin: 0 }}>
                  Entre como Super Master para provisionar e gerenciar campos da plataforma.
                  Cada novo campo recebe sistema completo automaticamente.
                </p>
              </div>
            ) : null}

            {/* Identidade Visual Padrão */}
            <div style={card()}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={sectionLabel({ marginBottom: 0 })}>
                  <span>🎨</span> Identidade visual padrão
                </div>
                {ctx && (
                  <a href="/dashboard/configuracoes" style={{ fontSize: 11, color: "var(--color-primary)", textDecoration: "none", fontWeight: 600 }}>
                    Editar →
                  </a>
                )}
              </div>

              {/* Preview */}
              <div style={{
                background: "#4A7DB5", borderRadius: 8, padding: "10px 14px",
                display: "flex", alignItems: "center", gap: 10, marginBottom: 12,
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                  ⛪
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>Nome do Campo</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)" }}>Cidade, Estado · Sistema ativo</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { label: "Cor primária",   value: "#4A7DB5", color: "#4A7DB5" },
                  { label: "Cor secundária", value: "#6D28D9", color: "#6D28D9" },
                ].map(c => (
                  <div key={c.label}>
                    <div style={{ fontSize: 10, color: "var(--color-text-muted)", marginBottom: 4 }}>{c.label}</div>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 6,
                      background: "var(--color-bg)", border: "1px solid var(--color-border)",
                      borderRadius: 6, padding: "5px 8px",
                    }}>
                      <div style={{ width: 14, height: 14, background: c.color, borderRadius: 3, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--color-text-secondary)" }}>{c.value}</span>
                    </div>
                  </div>
                ))}
                <div>
                  <div style={{ fontSize: 10, color: "var(--color-text-muted)", marginBottom: 4 }}>Fonte</div>
                  <div style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: 6, padding: "5px 8px", fontSize: 11, color: "var(--color-text-secondary)" }}>
                    Inter
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--color-text-muted)", marginBottom: 4 }}>Logo</div>
                  <div style={{ background: "var(--color-bg)", border: "1px dashed var(--color-border)", borderRadius: 6, padding: "5px 8px", fontSize: 11, color: "var(--color-primary)", textAlign: "center" }}>
                    Upload →
                  </div>
                </div>
              </div>

              <p style={{ fontSize: 10, color: "var(--color-text-muted)", margin: "10px 0 0", lineHeight: 1.5 }}>
                Novos campos herdam estas configurações ao serem provisionados.
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
