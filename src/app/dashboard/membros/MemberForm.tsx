"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MemberLookups, MemberFull } from "@/types";

type Props = {
  lookups: MemberLookups | null;
  createAction?: (fd: FormData) => Promise<{ error?: string; party_id?: string }>;
  updateAction?: (partyId: string, fd: FormData) => Promise<{ error?: string }>;
  member?: MemberFull;
  mode: "create" | "edit";
};

type Tab = "pessoal" | "eclesial" | "contato";

const TABS: { key: Tab; label: string }[] = [
  { key: "pessoal",  label: "Dados Pessoais"  },
  { key: "eclesial", label: "Ficha Eclesial"  },
  { key: "contato",  label: "Contato e Endereço" },
];

export default function MemberForm({ lookups, createAction, updateAction, member, mode }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>("pessoal");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Dados do formulário (controlled)
  const pm = member?.party_members;

  const [form, setForm] = useState({
    // Pessoal
    full_name:        member?.full_name ?? "",
    cpf:              member?.cpf ?? "",
    rg:               member?.rg ?? "",
    birth_date:       member?.birth_date ?? "",
    gender_id:        pm?.gender_id ?? "",
    civil_status_id:  pm?.civil_status_id ?? "",
    schooling_id:     pm?.schooling_id ?? "",
    profession_id:    pm?.profession_id ?? "",
    mother_name:      member?.mother_name ?? "",
    father_name:      member?.father_name ?? "",
    // Eclesial
    party_subtype:    pm?.party_subtype ?? "MEMBRO_PROVISORIO",
    unit_id:          pm?.unit_id ?? "",
    cargo_id:         pm?.cargo_id ?? "",
    data_ingresso:    pm?.data_ingresso ?? "",
    data_batismo_aguas:    pm?.data_batismo_aguas ?? "",
    data_batismo_espirito: pm?.data_batismo_espirito ?? "",
    matricula_legado: pm?.matricula_legado ?? "",
    financial_status_id: pm?.financial_status_id ?? "",
    igreja_origem:    pm?.igreja_origem ?? "",
    observacoes:      pm?.observacoes ?? "",
    // Contato e endereço
    celular:          pm?.celular ?? "",
    whatsapp:         pm?.whatsapp ?? "",
    email:            member?.email ?? "",
    cep:              member?.party_addresses?.[0]?.cep ?? "",
    logradouro:       member?.party_addresses?.[0]?.logradouro ?? "",
    numero:           member?.party_addresses?.[0]?.numero ?? "",
    complemento:      member?.party_addresses?.[0]?.complemento ?? "",
    bairro:           member?.party_addresses?.[0]?.bairro ?? "",
    cidade:           member?.party_addresses?.[0]?.cidade ?? "",
    estado:           member?.party_addresses?.[0]?.estado ?? "",
  });

  function setField(key: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function buildFormData(): FormData {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v) fd.set(k, v); });
    return fd;
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const fd = buildFormData();
      if (mode === "create" && createAction) {
        const result = await createAction(fd);
        if (result.error) { setError(result.error); return; }
        setSuccess(true);
        setTimeout(() => router.push(`/dashboard/membros/${result.party_id}`), 800);
      } else if (mode === "edit" && updateAction && member) {
        const result = await updateAction(member.id, fd);
        if (result.error) { setError(result.error); return; }
        setSuccess(true);
        setTimeout(() => router.push(`/dashboard/membros/${member.id}`), 800);
      }
    });
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px",
    border: "1px solid var(--color-border)", borderRadius: 8,
    fontSize: 13, color: "var(--color-text-primary)",
    background: "var(--color-surface)",
    outline: "none", boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 700,
    color: "var(--color-text-muted)", marginBottom: 5,
    textTransform: "uppercase", letterSpacing: ".04em",
  };

  const gridStyle: React.CSSProperties = {
    display: "grid", gap: 16,
  };

  const sectionTitle: React.CSSProperties = {
    fontSize: 12, fontWeight: 800, color: "var(--color-primary)",
    textTransform: "uppercase", letterSpacing: ".06em",
    margin: "20px 0 12px", borderBottom: "1px solid var(--color-border)",
    paddingBottom: 6,
  };

  return (
    <div style={{
      background: "var(--color-surface)",
      border: "1px solid var(--color-border)",
      borderRadius: 12, overflow: "hidden",
    }}>
      {/* Abas */}
      <div style={{
        display: "flex", borderBottom: "1px solid var(--color-border)",
        background: "#f8fafc",
      }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "13px 20px",
              border: "none", background: "none",
              fontSize: 13, fontWeight: tab === t.key ? 800 : 500,
              color: tab === t.key ? "var(--color-primary)" : "var(--color-text-muted)",
              borderBottom: tab === t.key ? "2px solid var(--color-primary)" : "2px solid transparent",
              cursor: "pointer", transition: "all 0.15s",
              whiteSpace: "nowrap",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: 24 }}>
        {/* ABA 1: DADOS PESSOAIS */}
        {tab === "pessoal" && (
          <div>
            <div style={{ ...gridStyle, gridTemplateColumns: "1fr 1fr" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Nome Completo *</label>
                <input
                  value={form.full_name}
                  onChange={e => setField("full_name", e.target.value)}
                  placeholder="Nome completo do membro"
                  style={inputStyle}
                  required
                />
              </div>

              <div>
                <label style={labelStyle}>CPF</label>
                <input
                  value={form.cpf}
                  onChange={e => setField("cpf", e.target.value)}
                  placeholder="000.000.000-00"
                  style={inputStyle}
                  maxLength={14}
                />
              </div>

              <div>
                <label style={labelStyle}>RG</label>
                <input
                  value={form.rg}
                  onChange={e => setField("rg", e.target.value)}
                  placeholder="Número do RG"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Data de Nascimento</label>
                <input
                  type="date"
                  value={form.birth_date}
                  onChange={e => setField("birth_date", e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Gênero</label>
                <select value={form.gender_id} onChange={e => setField("gender_id", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="">Selecione</option>
                  {(lookups?.genders ?? []).map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Estado Civil</label>
                <select value={form.civil_status_id} onChange={e => setField("civil_status_id", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="">Selecione</option>
                  {(lookups?.civil_statuses ?? []).map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Escolaridade</label>
                <select value={form.schooling_id} onChange={e => setField("schooling_id", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="">Selecione</option>
                  {(lookups?.schoolings ?? []).map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Profissão</label>
                <select value={form.profession_id} onChange={e => setField("profession_id", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="">Selecione</option>
                  {(lookups?.professions ?? []).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Nome da Mãe</label>
                <input value={form.mother_name} onChange={e => setField("mother_name", e.target.value)} placeholder="Nome da mãe" style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Nome do Pai</label>
                <input value={form.father_name} onChange={e => setField("father_name", e.target.value)} placeholder="Nome do pai" style={inputStyle} />
              </div>
            </div>
          </div>
        )}

        {/* ABA 2: FICHA ECLESIAL */}
        {tab === "eclesial" && (
          <div>
            <p style={sectionTitle}>Vínculo e Cargo</p>
            <div style={{ ...gridStyle, gridTemplateColumns: "1fr 1fr" }}>
              <div>
                <label style={labelStyle}>Tipo de Membro</label>
                <select value={form.party_subtype} onChange={e => setField("party_subtype", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="MEMBRO_PROVISORIO">Membro Provisório</option>
                  <option value="MEMBRO_ATIVO">Membro Ativo</option>
                  <option value="VISITANTE">Visitante</option>
                  <option value="DEPENDENTE">Dependente</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Cargo Eclesiástico</label>
                <select value={form.cargo_id} onChange={e => setField("cargo_id", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="">Selecione o cargo</option>
                  {(lookups?.cargos ?? []).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Igreja / Unidade</label>
                <select value={form.unit_id} onChange={e => setField("unit_id", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="">Selecione a unidade</option>
                  {(lookups?.units ?? [])
                    .filter(u => ["IGREJA", "SUB_CONGREGACAO", "PONTO_PREGACAO", "CELULA"].includes(u.unit_type))
                    .map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Situação Financeira</label>
                <select value={form.financial_status_id} onChange={e => setField("financial_status_id", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="">Selecione</option>
                  {(lookups?.financial_statuses ?? []).map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
              </div>
            </div>

            <p style={sectionTitle}>Datas Eclesiais</p>
            <div style={{ ...gridStyle, gridTemplateColumns: "1fr 1fr 1fr" }}>
              <div>
                <label style={labelStyle}>Data de Ingresso</label>
                <input type="date" value={form.data_ingresso} onChange={e => setField("data_ingresso", e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Batismo nas Águas</label>
                <input type="date" value={form.data_batismo_aguas} onChange={e => setField("data_batismo_aguas", e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Batismo no Espírito Santo</label>
                <input type="date" value={form.data_batismo_espirito} onChange={e => setField("data_batismo_espirito", e.target.value)} style={inputStyle} />
              </div>
            </div>

            <p style={sectionTitle}>Histórico</p>
            <div style={{ ...gridStyle, gridTemplateColumns: "1fr 1fr" }}>
              <div>
                <label style={labelStyle}>Igreja de Origem</label>
                <input value={form.igreja_origem} onChange={e => setField("igreja_origem", e.target.value)} placeholder="Igreja anterior" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Matrícula Legado (sistema antigo)</label>
                <input value={form.matricula_legado} onChange={e => setField("matricula_legado", e.target.value)} placeholder="Número do sistema anterior" style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Observações</label>
                <textarea
                  value={form.observacoes}
                  onChange={e => setField("observacoes", e.target.value)}
                  placeholder="Observações pastorais ou administrativas..."
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ABA 3: CONTATO E ENDEREÇO */}
        {tab === "contato" && (
          <div>
            <p style={sectionTitle}>Contato</p>
            <div style={{ ...gridStyle, gridTemplateColumns: "1fr 1fr 1fr" }}>
              <div>
                <label style={labelStyle}>Celular</label>
                <input value={form.celular} onChange={e => setField("celular", e.target.value)} placeholder="(11) 9 0000-0000" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>WhatsApp</label>
                <input value={form.whatsapp} onChange={e => setField("whatsapp", e.target.value)} placeholder="(11) 9 0000-0000" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>E-mail</label>
                <input type="email" value={form.email} onChange={e => setField("email", e.target.value)} placeholder="email@exemplo.com" style={inputStyle} />
              </div>
            </div>

            <p style={sectionTitle}>Endereço Residencial</p>
            <div style={{ ...gridStyle, gridTemplateColumns: "160px 1fr 80px" }}>
              <div>
                <label style={labelStyle}>CEP</label>
                <input value={form.cep} onChange={e => setField("cep", e.target.value)} placeholder="00000-000" style={inputStyle} maxLength={9} />
              </div>
              <div>
                <label style={labelStyle}>Logradouro</label>
                <input value={form.logradouro} onChange={e => setField("logradouro", e.target.value)} placeholder="Rua / Av. / Praça" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Número</label>
                <input value={form.numero} onChange={e => setField("numero", e.target.value)} placeholder="N°" style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Complemento</label>
                <input value={form.complemento} onChange={e => setField("complemento", e.target.value)} placeholder="Apto, Bloco..." style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Bairro</label>
                <input value={form.bairro} onChange={e => setField("bairro", e.target.value)} placeholder="Bairro" style={inputStyle} />
              </div>
              <div style={{ gridColumn: "span 1" }}>
                <label style={labelStyle}>Estado (UF)</label>
                <input value={form.estado} onChange={e => setField("estado", e.target.value.toUpperCase())} placeholder="SP" maxLength={2} style={inputStyle} />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Cidade</label>
                <input value={form.cidade} onChange={e => setField("cidade", e.target.value)} placeholder="Cidade" style={inputStyle} />
              </div>
            </div>
          </div>
        )}

        {/* Erro */}
        {error && (
          <div style={{
            marginTop: 16, padding: "10px 14px",
            background: "#fff5f5", border: "1px solid #fed7d7",
            borderRadius: 8, fontSize: 13, color: "#c53030",
          }}>
            {error}
          </div>
        )}

        {/* Sucesso */}
        {success && (
          <div style={{
            marginTop: 16, padding: "10px 14px",
            background: "#f0fff4", border: "1px solid #c6f6d5",
            borderRadius: 8, fontSize: 13, color: "#22543d", fontWeight: 700,
          }}>
            ✓ {mode === "create" ? "Membro cadastrado com sucesso! Redirecionando..." : "Dados atualizados!"}
          </div>
        )}

        {/* Ações */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginTop: 24, paddingTop: 20,
          borderTop: "1px solid var(--color-border)",
        }}>
          {/* Navegação entre abas */}
          <div style={{ display: "flex", gap: 8 }}>
            {tab !== "pessoal" && (
              <button
                type="button"
                onClick={() => setTab(tab === "contato" ? "eclesial" : "pessoal")}
                style={{
                  padding: "9px 16px", borderRadius: 8,
                  border: "1px solid var(--color-border)", background: "var(--color-surface)",
                  fontSize: 13, cursor: "pointer", color: "var(--color-text-muted)",
                }}
              >
                ← Anterior
              </button>
            )}
            {tab !== "contato" && (
              <button
                type="button"
                onClick={() => setTab(tab === "pessoal" ? "eclesial" : "contato")}
                style={{
                  padding: "9px 16px", borderRadius: 8,
                  border: "1px solid var(--color-border)", background: "var(--color-surface)",
                  fontSize: 13, cursor: "pointer", color: "var(--color-primary)", fontWeight: 600,
                }}
              >
                Próximo →
              </button>
            )}
          </div>

          {/* Salvar — disponível em qualquer aba */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={pending || success || !form.full_name.trim()}
            style={{
              padding: "10px 24px", borderRadius: 9,
              background: "var(--color-primary)", color: "#fff",
              border: "none", fontSize: 13, fontWeight: 700,
              cursor: pending || !form.full_name.trim() ? "not-allowed" : "pointer",
              opacity: pending || !form.full_name.trim() ? 0.6 : 1,
              transition: "opacity 0.15s",
            }}
          >
            {pending ? "Salvando..." : mode === "create" ? "Cadastrar Membro" : "Salvar Alterações"}
          </button>
        </div>
      </div>
    </div>
  );
}
