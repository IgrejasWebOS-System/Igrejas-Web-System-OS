export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>

      {/* Header */}
      <header style={{
        background: "var(--color-surface)",
        borderBottom: "1px solid var(--color-border)",
        boxShadow: "var(--shadow-sm)"
      }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div style={{
              width: 36, height: 36,
              background: "var(--color-primary)",
              borderRadius: "var(--radius-lg)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <span style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>IW</span>
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 800, color: "var(--color-text-primary)", lineHeight: 1 }}>
                IgrejasWeb
              </p>
              <p style={{ fontSize: 10, color: "var(--color-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                System OS
              </p>
            </div>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 700,
            background: "var(--color-primary-light)",
            color: "var(--color-primary-dark)",
            padding: "4px 12px",
            borderRadius: "var(--radius-xl)",
          }}>
            v1.0 · Em Desenvolvimento
          </span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">

        {/* Hero */}
        <div style={{
          background: "var(--color-primary)",
          borderRadius: "var(--radius-2xl)",
          padding: "40px 48px",
          boxShadow: "var(--shadow-lg)",
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Plataforma Multi-Tenant
          </p>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: "#fff", marginTop: 8, lineHeight: 1.2 }}>
            IgrejasWeb System OS
          </h1>
          <p style={{ color: "rgba(255,255,255,0.75)", marginTop: 10, fontSize: 15, maxWidth: 480 }}>
            Um sistema · Múltiplos ministérios · Módulos configuráveis por campo.
            Ambiente configurado com sucesso.
          </p>
          <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
            <a href="/login" style={{
              background: "#fff",
              color: "var(--color-primary-dark)",
              fontWeight: 700, fontSize: 13,
              padding: "10px 24px",
              borderRadius: "var(--radius-lg)",
              textDecoration: "none",
              boxShadow: "var(--shadow-sm)"
            }}>
              Acessar Sistema →
            </a>
          </div>
        </div>

        {/* Paleta de Cores */}
        <div style={{
          background: "var(--color-surface)",
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--color-border)",
          padding: "24px",
          boxShadow: "var(--shadow-sm)"
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
            Paleta de Cores do Sistema
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
            {[
              { color: "#4A7DB5", label: "Primário", sub: "#4A7DB5" },
              { color: "#BDE9FB", label: "Primário Claro", sub: "#BDE9FB" },
              { color: "#6B7FA3", label: "Slate", sub: "#6B7FA3" },
              { color: "#EAE0DA", label: "Bege", sub: "#EAE0DA" },
              { color: "#D0E0CD", label: "Sage", sub: "#D0E0CD" },
              { color: "#EBF2F8", label: "Background", sub: "#EBF2F8" },
            ].map((item) => (
              <div key={item.color} style={{ textAlign: "center" }}>
                <div style={{
                  height: 52,
                  background: item.color,
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)",
                  marginBottom: 6
                }} />
                <p style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-primary)" }}>{item.label}</p>
                <p style={{ fontSize: 10, color: "var(--color-text-muted)", fontFamily: "monospace" }}>{item.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Padrões de texto */}
        <div style={{
          background: "var(--color-surface)",
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--color-border)",
          padding: "24px",
          boxShadow: "var(--shadow-sm)"
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
            Padrões de Texto
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 28, height: 28, background: "#000000", borderRadius: 4, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#000000" }}>Black #000000 — Bordas e alto contraste</p>
                <p style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Preto puro. Ideal para detalhes e separadores.</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 28, height: 28, background: "#1C2833", borderRadius: 4, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#1C2833" }}>Smoke #1C2833 — Leitura em tela</p>
                <p style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Preto acinzentado. Títulos e corpo principal.</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 28, height: 28, background: "#333333", borderRadius: 4, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#333333" }}>Night Rider #333333 — Corpo de texto</p>
                <p style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Carvão escuro. Textos secundários e parágrafos.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Status */}
        <div style={{
          background: "var(--color-sage)",
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--color-sage-dark)",
          padding: "16px 24px",
          display: "flex", alignItems: "center", gap: 12
        }}>
          <div style={{ width: 8, height: 8, background: "var(--color-success)", borderRadius: "50%", flexShrink: 0 }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
            Ambiente configurado · Próximo passo: executar as migrations SQL no Supabase e configurar o .env.local
          </p>
        </div>

      </div>
    </div>
  );
}
