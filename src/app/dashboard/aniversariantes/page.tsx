import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionContext } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos futuros (dados virão do cadastro principal de membros)
// ─────────────────────────────────────────────────────────────────────────────
type AniversarioItem = {
  id: string;
  nome: string;
  data: string;        // ISO date
  tempoTexto: string;  // ex: "25 anos", "3 meses"
  foto?: string | null;
};

type SecaoProps = {
  titulo: string;
  subtitulo: string;
  cor: string;
  bg: string;
  icon: React.ReactNode;
  itens: AniversarioItem[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Componente de seção
// ─────────────────────────────────────────────────────────────────────────────
function Secao({ titulo, subtitulo, cor, bg, icon, itens }: SecaoProps) {
  return (
    <section style={{
      background: "var(--color-surface)",
      border: "1px solid var(--color-border)",
      borderRadius: 14,
      overflow: "hidden",
    }}>
      {/* Cabeçalho da seção */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "16px 20px",
        borderBottom: "1px solid var(--color-border)",
        background: bg,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9,
          background: `${cor}18`,
          border: `1px solid ${cor}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: cor, flexShrink: 0,
        }}>
          {icon}
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 800, color: "var(--color-text-primary)" }}>{titulo}</p>
          <p style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{subtitulo}</p>
        </div>
        <div style={{
          marginLeft: "auto",
          padding: "3px 10px",
          background: `${cor}12`,
          border: `1px solid ${cor}25`,
          borderRadius: 99,
          fontSize: 11, fontWeight: 700, color: cor,
        }}>
          {itens.length} {itens.length === 1 ? "pessoa" : "pessoas"}
        </div>
      </div>

      {/* Lista de aniversariantes */}
      {itens.length === 0 ? (
        <div style={{
          padding: "32px 24px", textAlign: "center",
        }}>
          <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
            Nenhum aniversariante no período.
          </p>
          <p style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4, opacity: 0.7 }}>
            Os dados serão exibidos aqui quando importados do cadastro de membros.
          </p>
        </div>
      ) : (
        <div style={{ padding: "8px 0" }}>
          {itens.map(item => (
            <div key={item.id} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 20px",
              borderBottom: "1px solid var(--color-border)",
            }}>
              {/* Avatar */}
              <div style={{
                width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                background: `${cor}18`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, color: cor,
              }}>
                {item.foto
                  ? <img src={item.foto} alt={item.nome} style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover" }} />
                  : item.nome.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {item.nome}
                </p>
                <p style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                  {new Date(item.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}
                </p>
              </div>
              <span style={{
                padding: "3px 10px",
                background: `${cor}10`,
                border: `1px solid ${cor}25`,
                borderRadius: 99,
                fontSize: 11, fontWeight: 600, color: cor,
                whiteSpace: "nowrap",
              }}>
                {item.tempoTexto}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default async function AniversariantesPage() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("iw_context")?.value;
  if (!raw) redirect("/contexto");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ctx: SessionContext = JSON.parse(raw);

  // TODO: buscar dados reais do cadastro de membros
  // Os campos relevantes em `members` serão:
  //   birth_date        → Aniversário de Nascimento
  //   wedding_date      → Aniversário de Casamento
  //   baptism_date      → Aniversário de Batismo
  const nascimento: AniversarioItem[] = [];
  const casamento:  AniversarioItem[] = [];
  const batismo:    AniversarioItem[] = [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 900 }}>

      {/* Cabeçalho da página */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: "#fdf2f8",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#db2777",
        }}>
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 800, color: "var(--color-text-primary)" }}>Aniversariantes</h1>
          <p style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>
            Nascimento · Casamento · Batismo — dados integrados ao cadastro de membros
          </p>
        </div>
      </div>

      {/* Aviso de integração pendente */}
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        padding: "12px 16px",
        background: "#fffbeb",
        border: "1px solid #fde68a",
        borderRadius: 10,
      }}>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <p style={{ fontSize: 12, color: "#92400e", lineHeight: 1.5 }}>
          <strong>Integração pendente.</strong> Os aniversariantes serão exibidos automaticamente após a configuração dos campos{" "}
          <code style={{ background: "#fef3c7", padding: "1px 4px", borderRadius: 3 }}>birth_date</code>,{" "}
          <code style={{ background: "#fef3c7", padding: "1px 4px", borderRadius: 3 }}>wedding_date</code> e{" "}
          <code style={{ background: "#fef3c7", padding: "1px 4px", borderRadius: 3 }}>baptism_date</code>{" "}
          no cadastro principal de membros.
        </p>
      </div>

      {/* ── Seção: Aniversário de Nascimento ── */}
      <Secao
        titulo="Aniversário de Nascimento"
        subtitulo="Membros que fazem aniversário este mês"
        cor="#3b82f6"
        bg="#eff6ff"
        icon={
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        }
        itens={nascimento}
      />

      {/* ── Seção: Aniversário de Casamento ── */}
      <Secao
        titulo="Aniversário de Casamento"
        subtitulo="Casais que celebram bodas este mês"
        cor="#db2777"
        bg="#fdf2f8"
        icon={
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        }
        itens={casamento}
      />

      {/* ── Seção: Aniversário de Batismo ── */}
      <Secao
        titulo="Aniversário de Batismo"
        subtitulo="Membros que completam anos de batismo este mês"
        cor="#8b5cf6"
        bg="#f5f3ff"
        icon={
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        }
        itens={batismo}
      />

    </div>
  );
}
