"use client";

import { useState } from "react";

type Party = {
  id: string; full_name: string; cpf: string | null; data_nascimento: string | null;
  telefone: string | null; email: string | null; data_membro: string | null; status: string; foto_url: string | null;
  units: { name: string } | null; genders: { nome: string } | null; civil_statuses: { nome: string } | null;
} | null;

type Inscricao = { id: string; status: string; created_at: string; events: { titulo: string; data_inicio: string; status: string } | null };
type Documento = { id: string; tipo: string; titulo: string; created_at: string; pdf_url: string | null };
type Certificado = { id: string; status: string; completed_at: string | null; courses: { titulo: string } | null };

const TABS = ["Meus Dados", "Eventos", "Documentos", "Certificados"] as const;

export default function MeuPerfilClient({ party, userEmail, inscricoes, documentos, certificados, ministryName }: {
  party: Party; userEmail: string;
  inscricoes: Inscricao[]; documentos: Documento[]; certificados: Certificado[];
  ministryName: string;
}) {
  const [tab, setTab] = useState<typeof TABS[number]>("Meus Dados");

  return (
    <div style={{ padding: "28px 32px", maxWidth: 860, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 28 }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#fff", fontWeight: 800, flexShrink: 0, overflow: "hidden" }}>
          {party?.foto_url ? <img src={party.foto_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (party?.full_name?.[0] ?? userEmail[0] ?? "?")}
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>{party?.full_name ?? userEmail}</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: 0 }}>{userEmail} · {ministryName}</p>
          {party && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: party.status === "ATIVO" ? "#d1fae5" : "#f3f4f6", color: party.status === "ATIVO" ? "#059669" : "#6b7280", marginTop: 4, display: "inline-block" }}>
              {party.status}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid var(--color-border)", marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "10px 20px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 700,
            color: tab === t ? "var(--color-primary)" : "var(--color-text-muted)",
            borderBottom: tab === t ? "2px solid var(--color-primary)" : "2px solid transparent",
            marginBottom: -2,
          }}>{t}</button>
        ))}
      </div>

      {/* Meus Dados */}
      {tab === "Meus Dados" && (
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: 24 }}>
          {!party ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "var(--color-text-muted)" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
              <p>Seu cadastro de membro ainda não foi vinculado a esta conta.</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>Entre em contato com a secretaria para vincular seus dados.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 24px" }}>
              {[
                ["Nome completo", party.full_name],
                ["CPF", party.cpf ?? "—"],
                ["Data de nascimento", party.data_nascimento ? new Date(party.data_nascimento).toLocaleDateString("pt-BR") : "—"],
                ["Gênero", party.genders?.nome ?? "—"],
                ["Estado civil", party.civil_statuses?.nome ?? "—"],
                ["Telefone", party.telefone ?? "—"],
                ["E-mail", party.email ?? userEmail],
                ["Congregação", party.units?.name ?? "—"],
                ["Membro desde", party.data_membro ? new Date(party.data_membro).toLocaleDateString("pt-BR") : "—"],
                ["Status", party.status],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Eventos */}
      {tab === "Eventos" && (
        <div>
          {inscricoes.length === 0 ? <Empty icon="📅" msg="Nenhuma inscrição em eventos" /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {inscricoes.map(i => (
                <div key={i.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{(i.events as { titulo?: string } | null)?.titulo ?? "—"}</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 3 }}>
                      {(i.events as { data_inicio?: string } | null)?.data_inicio ? new Date((i.events as { data_inicio: string }).data_inicio).toLocaleDateString("pt-BR") : "—"}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: i.status === "CONFIRMADO" ? "#d1fae5" : "#fef9c3", color: i.status === "CONFIRMADO" ? "#059669" : "#92400e" }}>{i.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Documentos */}
      {tab === "Documentos" && (
        <div>
          {documentos.length === 0 ? <Empty icon="📄" msg="Nenhum documento emitido" /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {documentos.map(d => (
                <div key={d.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{d.titulo}</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 3 }}>{d.tipo} · {new Date(d.created_at).toLocaleDateString("pt-BR")}</div>
                  </div>
                  {d.pdf_url && (
                    <a href={d.pdf_url} target="_blank" rel="noreferrer" style={{ padding: "6px 14px", background: "var(--color-primary)", color: "#fff", borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                      📄 PDF
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Certificados */}
      {tab === "Certificados" && (
        <div>
          {certificados.length === 0 ? <Empty icon="🎓" msg="Nenhum certificado obtido ainda" /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {certificados.map(c => (
                <div key={c.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>🎓 {(c.courses as { titulo?: string } | null)?.titulo ?? "—"}</div>
                    {c.completed_at && <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 3 }}>Concluído em {new Date(c.completed_at).toLocaleDateString("pt-BR")}</div>}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: "#ede9fe", color: "#5b21b6" }}>Certificado</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Empty({ icon, msg }: { icon: string; msg: string }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 0", color: "var(--color-text-muted)" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <p>{msg}</p>
    </div>
  );
}
