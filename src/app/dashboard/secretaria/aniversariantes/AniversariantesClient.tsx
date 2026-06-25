"use client";

import { useState, useTransition } from "react";
import { buscarAniversariantes, type Aniversariante } from "./actions";

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

type Props = {
  initialData: Aniversariante[];
  initialMes: number;
};

export default function AniversariantesClient({ initialData, initialMes }: Props) {
  const [mes, setMes] = useState(initialMes);
  const [data, setData] = useState<Aniversariante[]>(initialData);
  const [pending, startTransition] = useTransition();

  function handleMesChange(novoMes: number) {
    setMes(novoMes);
    startTransition(async () => {
      const result = await buscarAniversariantes(novoMes);
      setData(result.data);
    });
  }

  const hoje = new Date();
  const diaHoje = hoje.getDate();
  const mesHoje = hoje.getMonth() + 1;

  const inputStyle: React.CSSProperties = {
    border: "1px solid var(--color-border)", borderRadius: 8,
    padding: "8px 12px", fontSize: 13,
    color: "var(--color-text-primary)", background: "var(--color-surface)",
    outline: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Seletor de mês */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
        background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: 10, padding: "12px 16px",
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-muted)" }}>Mês:</span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {MESES.map((nome, i) => {
            const m = i + 1;
            const ativo = m === mes;
            const ehHoje = m === mesHoje;
            return (
              <button
                key={m}
                onClick={() => handleMesChange(m)}
                style={{
                  padding: "5px 12px", borderRadius: 99,
                  border: ativo ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                  background: ativo ? "var(--color-primary)" : ehHoje && !ativo ? "var(--color-primary-light)" : "transparent",
                  color: ativo ? "#fff" : ehHoje ? "var(--color-primary)" : "var(--color-text-muted)",
                  fontWeight: ativo || ehHoje ? 700 : 500,
                  fontSize: 12, cursor: "pointer",
                  opacity: pending ? 0.6 : 1,
                }}
              >
                {nome}
              </button>
            );
          })}
        </div>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--color-text-muted)" }}>
          {pending ? "Buscando..." : `${data.length} aniversariante${data.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Tabela */}
      <div style={{
        background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: 12, overflow: "hidden",
        opacity: pending ? 0.6 : 1, transition: "opacity .15s",
      }}>
        {data.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--color-text-muted)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎂</div>
            <div style={{ fontWeight: 700 }}>Nenhum aniversariante em {MESES[mes - 1]}</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F7FAFD", borderBottom: "1px solid var(--color-border)" }}>
                {["Dia", "Nome", "Idade", "Matrícula", "Unidade", "WhatsApp"].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((a, i) => {
                const ehAniversarioHoje = a.dia === diaHoje && a.mes === mesHoje;
                const waLink = a.phone
                  ? `https://wa.me/55${a.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Feliz Aniversário, ${a.full_name.split(" ")[0]}! 🎉 Deus te abençoe!`)}`
                  : null;

                return (
                  <tr
                    key={a.party_id}
                    style={{
                      borderBottom: i < data.length - 1 ? "1px solid var(--color-border)" : "none",
                      background: ehAniversarioHoje ? "#f0fdf4" : "transparent",
                    }}
                  >
                    {/* Dia */}
                    <td style={{ ...tdStyle, width: 60 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{
                          fontWeight: 900, fontSize: 18,
                          color: ehAniversarioHoje ? "#16a34a" : "var(--color-primary)",
                          minWidth: 28, textAlign: "center",
                        }}>
                          {a.dia}
                        </span>
                        {ehAniversarioHoje && (
                          <span style={{ fontSize: 14 }}>🎂</span>
                        )}
                      </div>
                    </td>

                    {/* Nome */}
                    <td style={tdStyle}>
                      <a
                        href={`/dashboard/membros/${a.party_id}`}
                        style={{ fontWeight: 700, fontSize: 13, color: "var(--color-text-primary)", textDecoration: "none" }}
                      >
                        {a.full_name}
                      </a>
                    </td>

                    {/* Idade */}
                    <td style={tdStyle}>
                      {a.idade !== null ? (
                        <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                          {a.idade} anos
                        </span>
                      ) : (
                        <span style={{ color: "#cbd5e1" }}>—</span>
                      )}
                    </td>

                    {/* Matrícula */}
                    <td style={tdStyle}>
                      {a.matricula
                        ? <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "var(--color-primary)" }}>{a.matricula}</span>
                        : <span style={{ color: "#cbd5e1" }}>—</span>
                      }
                    </td>

                    {/* Unidade */}
                    <td style={tdStyle}>
                      <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                        {a.unit_name ?? "—"}
                      </span>
                    </td>

                    {/* WhatsApp */}
                    <td style={{ ...tdStyle, width: 100 }}>
                      {waLink ? (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            padding: "5px 10px", borderRadius: 7,
                            background: "#dcfce7", color: "#16a34a",
                            fontSize: 12, fontWeight: 700, textDecoration: "none",
                          }}
                        >
                          <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                          Enviar
                        </a>
                      ) : (
                        <span style={{ fontSize: 12, color: "#cbd5e1" }}>Sem tel.</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "10px 14px", textAlign: "left",
  fontSize: 11, fontWeight: 800,
  color: "var(--color-text-muted)",
  textTransform: "uppercase", letterSpacing: ".04em", whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "11px 14px", fontSize: 13, verticalAlign: "middle",
};
