"use client";

import { useState } from "react";
import type { NovoCampoInput } from "./actions";

interface Props {
  onCriar: (input: NovoCampoInput) => Promise<{ ministry_id?: string; error?: string }>;
  onClose: () => void;
}

const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const CORES_PRESET = [
  { label: "Roxo (padrão)", value: "#6D28D9" },
  { label: "Azul", value: "#1D4ED8" },
  { label: "Verde", value: "#059669" },
  { label: "Vermelho", value: "#DC2626" },
  { label: "Laranja", value: "#EA580C" },
  { label: "Rosa", value: "#BE185D" },
  { label: "Índigo", value: "#4338CA" },
  { label: "Cinza", value: "#374151" },
];

// Gera slug automático a partir do nome
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function NovoCampoModal({ onCriar, onClose }: Props) {
  // Etapa do wizard: 1 = Info básica, 2 = Identidade Visual, 3 = Confirmação
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState<NovoCampoInput>({
    nome: "",
    slug: "",
    nome_display: "",
    sigla: "",
    cor_primaria: "#6D28D9",
    cor_secundaria: "#4A7DB5",
    cnpj: "",
    cidade: "",
    estado: "",
    email_contato: "",
  });

  function set(k: keyof NovoCampoInput, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function handleNomeChange(v: string) {
    set("nome", v);
    if (!form.slug || form.slug === toSlug(form.nome)) {
      set("slug", toSlug(v));
    }
    if (!form.nome_display || form.nome_display === form.nome) {
      set("nome_display", v);
    }
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    const res = await onCriar(form);
    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else {
      setSuccess(res.ministry_id!);
    }
  }

  // ── Estilos inline (sem dependência de classes customizadas) ─────────────────
  const card: React.CSSProperties = {
    background: "var(--color-bg-card, #fff)",
    border: "1px solid var(--color-border, #e5e7eb)",
    borderRadius: 12,
    padding: "20px 24px",
    marginBottom: 16,
  };
  const label: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "var(--color-text-muted, #6b7280)",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };
  const input: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid var(--color-border, #d1d5db)",
    fontSize: 14,
    color: "var(--color-text-primary, #111827)",
    background: "var(--color-bg-input, #f9fafb)",
    boxSizing: "border-box",
  };
  const btn = (variant: "primary" | "ghost"): React.CSSProperties => ({
    padding: "10px 20px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
    background: variant === "primary" ? form.cor_primaria : "transparent",
    color: variant === "primary" ? "#fff" : "var(--color-text-muted, #6b7280)",
    opacity: loading ? 0.6 : 1,
  });

  // ── Tela de sucesso ───────────────────────────────────────────────────────────
  if (success) {
    return (
      <div style={{ textAlign: "center", padding: "40px 24px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 8px", color: "var(--color-text-primary, #111827)" }}>
          Campo provisionado com sucesso!
        </h2>
        <p style={{ fontSize: 14, color: "var(--color-text-muted, #6b7280)", marginBottom: 24 }}>
          <strong>{form.nome_display}</strong> está pronto para uso.<br/>
          Todos os módulos, plano de contas, templates e configurações foram copiados do ministério-template.
        </p>
        <div style={{
          background: "#f0fdf4", border: "1px solid #bbf7d0",
          borderRadius: 10, padding: "12px 16px",
          fontSize: 13, color: "#166534",
          marginBottom: 24, textAlign: "left",
        }}>
          <strong>Próximos passos:</strong>
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            <li>Convidar o N1 (Presidente/Pastor) do campo</li>
            <li>Fazer upload do logo em Identidade Visual</li>
            <li>Revisar módulos ativos se necessário</li>
          </ul>
        </div>
        <button onClick={onClose} style={btn("primary")}>
          Fechar
        </button>
      </div>
    );
  }

  // ── Steps ─────────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Progress */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {[1,2,3].map(s => (
          <div key={s} style={{
            flex: 1, height: 4, borderRadius: 99,
            background: s <= step ? form.cor_primaria : "var(--color-border, #e5e7eb)",
            transition: "background 0.3s",
          }} />
        ))}
      </div>

      {/* ── STEP 1: Informações básicas ──────────────────────────── */}
      {step === 1 && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>Informações do Campo</h3>

          <div style={card}>
            <div style={{ marginBottom: 16 }}>
              <label style={label}>Nome oficial *</label>
              <input
                style={input} value={form.nome}
                onChange={e => handleNomeChange(e.target.value)}
                placeholder="Ex: AD Madureira Campinas"
              />
              <p style={{ fontSize: 11, color: "var(--color-text-muted)", margin: "4px 0 0" }}>
                Nome exato do ministério conforme CNPJ/documentos
              </p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={label}>Nome de exibição *</label>
              <input
                style={input} value={form.nome_display}
                onChange={e => set("nome_display", e.target.value)}
                placeholder="Ex: AD Madureira Campinas"
              />
              <p style={{ fontSize: 11, color: "var(--color-text-muted)", margin: "4px 0 0" }}>
                Aparece no sistema e nos documentos emitidos
              </p>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 2 }}>
                <label style={label}>Slug (URL única) *</label>
                <input
                  style={input} value={form.slug}
                  onChange={e => set("slug", toSlug(e.target.value))}
                  placeholder="madureira-campinas"
                />
                <p style={{ fontSize: 11, color: "var(--color-text-muted)", margin: "4px 0 0" }}>
                  Apenas letras, números e hífens. Gerado automaticamente.
                </p>
              </div>
              <div style={{ flex: 1 }}>
                <label style={label}>Sigla</label>
                <input
                  style={input} value={form.sigla}
                  onChange={e => set("sigla", e.target.value.toUpperCase())}
                  placeholder="ADMC" maxLength={8}
                />
              </div>
            </div>
          </div>

          <div style={card}>
            <h4 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 12px" }}>Localização</h4>
            <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 2 }}>
                <label style={label}>Cidade</label>
                <input style={input} value={form.cidade ?? ""} onChange={e => set("cidade", e.target.value)} placeholder="Campinas" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={label}>Estado</label>
                <select style={input} value={form.estado ?? ""} onChange={e => set("estado", e.target.value)}>
                  <option value="">UF</option>
                  {ESTADOS_BR.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={label}>E-mail de contato</label>
                <input style={input} type="email" value={form.email_contato ?? ""} onChange={e => set("email_contato", e.target.value)} placeholder="contato@igrejacampinas.com.br" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={label}>CNPJ</label>
                <input style={input} value={form.cnpj ?? ""} onChange={e => set("cnpj", e.target.value)} placeholder="00.000.000/0000-00" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: Identidade Visual ────────────────────────────── */}
      {step === 2 && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>Guia de Identidade Visual</h3>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "0 0 16px" }}>
            Estas configurações definem a aparência do sistema para este campo.
            O logo pode ser alterado depois pelo administrador do campo.
          </p>

          <div style={card}>
            <h4 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 12px" }}>Paleta de Cores</h4>

            {/* Preview */}
            <div style={{
              display: "flex", alignItems: "center", gap: 12, marginBottom: 20,
              padding: "12px 16px", borderRadius: 10,
              background: form.cor_primaria,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 8,
                background: "rgba(255,255,255,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18,
              }}>⛪</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{form.nome_display || "Nome do Campo"}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>{form.sigla || "SIGLA"} · {form.cidade || "Cidade"}, {form.estado || "UF"}</div>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={label}>Cor Primária</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                {CORES_PRESET.map(c => (
                  <button
                    key={c.value}
                    onClick={() => set("cor_primaria", c.value)}
                    title={c.label}
                    style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: c.value, cursor: "pointer",
                      border: form.cor_primaria === c.value ? "3px solid #111" : "2px solid transparent",
                      padding: 0,
                    }}
                  />
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="color" value={form.cor_primaria} onChange={e => set("cor_primaria", e.target.value)}
                  style={{ width: 40, height: 32, padding: 2, borderRadius: 6, border: "1px solid #d1d5db", cursor: "pointer" }} />
                <input style={{ ...input, flex: 1 }} value={form.cor_primaria} onChange={e => set("cor_primaria", e.target.value)} placeholder="#6D28D9" />
              </div>
            </div>

            <div>
              <label style={label}>Cor Secundária</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="color" value={form.cor_secundaria ?? "#4A7DB5"} onChange={e => set("cor_secundaria", e.target.value)}
                  style={{ width: 40, height: 32, padding: 2, borderRadius: 6, border: "1px solid #d1d5db", cursor: "pointer" }} />
                <input style={{ ...input, flex: 1 }} value={form.cor_secundaria ?? "#4A7DB5"} onChange={e => set("cor_secundaria", e.target.value)} placeholder="#4A7DB5" />
              </div>
              <p style={{ fontSize: 11, color: "var(--color-text-muted)", margin: "4px 0 0" }}>
                Usada em botões secundários, gráficos e ícones complementares
              </p>
            </div>
          </div>

          <div style={{
            background: "#fffbeb", border: "1px solid #fde68a",
            borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#92400e",
          }}>
            💡 <strong>Logo e favicon</strong> podem ser enviados depois, na tela de Identidade Visual do campo.
            O sistema usa as cores definidas aqui como base até o logo ser configurado.
          </div>
        </div>
      )}

      {/* ── STEP 3: Revisão ──────────────────────────────────────── */}
      {step === 3 && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px" }}>Revisão e Confirmação</h3>

          <div style={card}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <tbody>
                {[
                  ["Nome oficial", form.nome],
                  ["Nome de exibição", form.nome_display],
                  ["Slug", form.slug],
                  ["Sigla", form.sigla || "—"],
                  ["Localização", form.cidade ? `${form.cidade} / ${form.estado}` : "—"],
                  ["CNPJ", form.cnpj || "—"],
                  ["E-mail", form.email_contato || "—"],
                ].map(([k, v]) => (
                  <tr key={k} style={{ borderBottom: "1px solid var(--color-border, #f3f4f6)" }}>
                    <td style={{ padding: "8px 0", color: "var(--color-text-muted)", fontWeight: 600, width: "40%" }}>{k}</td>
                    <td style={{ padding: "8px 0", color: "var(--color-text-primary)" }}>{v}</td>
                  </tr>
                ))}
                <tr>
                  <td style={{ padding: "8px 0", color: "var(--color-text-muted)", fontWeight: 600 }}>Cores</td>
                  <td style={{ padding: "8px 0", display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ display: "inline-block", width: 20, height: 20, borderRadius: 4, background: form.cor_primaria }} />
                    <span style={{ fontSize: 12 }}>{form.cor_primaria}</span>
                    <span style={{ display: "inline-block", width: 20, height: 20, borderRadius: 4, background: form.cor_secundaria }} />
                    <span style={{ fontSize: 12 }}>{form.cor_secundaria}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{
            background: "#f0fdf4", border: "1px solid #bbf7d0",
            borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#166534",
            marginBottom: 16,
          }}>
            <strong>O que será criado automaticamente:</strong>
            <ul style={{ margin: "6px 0 0", paddingLeft: 20 }}>
              <li>✅ Ministério com todos os 9 módulos ativos</li>
              <li>✅ Unidade raiz (CAMPO) + Igreja Sede</li>
              <li>✅ Plano de contas completo (ITG 2002/CFC, ~60 contas)</li>
              <li>✅ Categorias financeiras operacionais</li>
              <li>✅ Cargos eclesiásticos, departamentos, funções, profissões</li>
              <li>✅ Templates de documentos (Declaração, Transferência, etc.)</li>
              <li>✅ Regras de depreciação patrimonial (19 categorias)</li>
              <li>✅ Configurações padrão do sistema</li>
              <li>✅ Identidade visual com as cores selecionadas</li>
            </ul>
          </div>

          {error && (
            <div style={{
              background: "#fef2f2", border: "1px solid #fecaca",
              borderRadius: 8, padding: "10px 14px",
              fontSize: 13, color: "#991b1b", marginBottom: 12,
            }}>
              ❌ {error}
            </div>
          )}
        </div>
      )}

      {/* ── Navegação ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
        <button
          onClick={step === 1 ? onClose : () => setStep(s => s - 1)}
          style={btn("ghost")}
          disabled={loading}
        >
          {step === 1 ? "Cancelar" : "← Voltar"}
        </button>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
            Etapa {step} de 3
          </span>
          {step < 3 ? (
            <button
              onClick={() => {
                if (step === 1 && !form.nome.trim()) { setError("Nome do campo é obrigatório"); return; }
                setError(null);
                setStep(s => s + 1);
              }}
              style={btn("primary")}
            >
              Próximo →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{ ...btn("primary"), minWidth: 140 }}
            >
              {loading ? "⏳ Provisionando..." : "🚀 Criar Campo"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
