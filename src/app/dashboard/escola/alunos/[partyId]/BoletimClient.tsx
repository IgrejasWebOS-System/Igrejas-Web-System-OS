"use client";

import { useRouter } from "next/navigation";
import type { SchoolSemesterWithStats, StudentBoletim, EnrollmentSituacao } from "@/types";
import { ENROLLMENT_SITUACAO_LABELS, ENROLLMENT_SITUACAO_COLORS } from "@/types";

type Props = {
  partyId: string;
  semestres: SchoolSemesterWithStats[];
  semesterId: string | null;
  boletim: StudentBoletim | null;
};

export default function BoletimClient({ partyId, semestres, semesterId, boletim }: Props) {
  const router = useRouter();

  function mudarSemestre(id: string) {
    router.push(`/dashboard/escola/alunos/${partyId}?semestre=${id}`);
  }

  const aprovados = boletim?.disciplinas.filter((d) => d.situacao === "APROVADO").length ?? 0;
  const total = boletim?.disciplinas.length ?? 0;

  return (
    <div style={{ padding: "32px 28px", maxWidth: 820 }}>
      {/* Breadcrumb */}
      <button onClick={() => router.back()} style={linkBtn}>← Voltar</button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", margin: "16px 0 24px" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1C2833", margin: 0 }}>
            {boletim?.party_nome ?? "Boletim do Aluno"}
          </h1>
          {boletim?.party_matricula && (
            <p style={{ color: "#5D6D7E", fontSize: 13, marginTop: 4 }}>Matrícula #{boletim.party_matricula}</p>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <a
            href={`/api/escola/alunos/${partyId}/boletim?semestre=${semesterId}`}
            target="_blank"
            style={{ background: "#dc2626", color: "#fff", textDecoration: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600 }}>
            PDF
          </a>
        </div>
      </div>

      {/* Seletor de semestre */}
      {semestres.length > 1 && (
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Semestre</label>
          <select
            value={semesterId ?? ""}
            onChange={(e) => mudarSemestre(e.target.value)}
            style={{ border: "1.5px solid #C8D6E5", borderRadius: 8, padding: "9px 12px", fontSize: 14, background: "#fff", cursor: "pointer" }}>
            {semestres.map((s) => (
              <option key={s.id} value={s.id}>{s.nome}</option>
            ))}
          </select>
        </div>
      )}

      {!boletim || boletim.disciplinas.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#5D6D7E" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <p style={{ fontWeight: 600 }}>Nenhuma matrícula encontrada neste semestre.</p>
        </div>
      ) : (
        <>
          {/* Resumo */}
          <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
            <Card label="Disciplinas" value={total} />
            <Card label="Aprovadas" value={aprovados} color="#16a34a" />
            <Card label="Pendentes" value={total - aprovados} color={total - aprovados > 0 ? "#dc2626" : "#94a3b8"} />
          </div>

          {/* Tabela */}
          <div style={{ background: "#fff", border: "1.5px solid #C8D6E5", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#F4F8FC" }}>
                  <th style={th}>Disciplina</th>
                  <th style={th}>CH</th>
                  <th style={th}>AP1</th>
                  <th style={th}>AP2</th>
                  <th style={th}>Final</th>
                  <th style={th}>Rec</th>
                  <th style={th}>Média</th>
                  <th style={th}>Freq.</th>
                  <th style={th}>Situação</th>
                </tr>
              </thead>
              <tbody>
                {boletim.disciplinas.map((d, i) => {
                  const colors = ENROLLMENT_SITUACAO_COLORS[d.situacao];
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={td}>
                        <div style={{ fontWeight: 700, color: "#1C2833" }}>{d.discipline_nome}</div>
                        {d.professor_nome && <div style={{ fontSize: 11, color: "#5D6D7E" }}>Prof. {d.professor_nome}</div>}
                      </td>
                      <td style={{ ...td, color: "#5D6D7E" }}>{d.carga_horaria}h</td>
                      <Nota val={d.ap1} min={d.nota_minima} />
                      <Nota val={d.ap2} min={d.nota_minima} />
                      <Nota val={d.final} min={d.nota_minima} />
                      <Nota val={d.recuperacao} min={d.nota_minima} />
                      <td style={{ ...td, fontWeight: 800, fontSize: 14, color: d.media !== null && d.media >= d.nota_minima ? "#166534" : d.media !== null ? "#991b1b" : "#94a3b8" }}>
                        {d.media !== null ? d.media.toFixed(1) : "—"}
                      </td>
                      <td style={{ ...td, color: d.frequencia_pct >= d.frequencia_min ? "#166534" : "#991b1b" }}>
                        {d.frequencia_pct.toFixed(1)}%
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>{d.presencas}/{d.total_aulas}</div>
                      </td>
                      <td style={td}>
                        <span style={{ padding: "3px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: colors.bg, color: colors.color }}>
                          {ENROLLMENT_SITUACAO_LABELS[d.situacao]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Nota({ val, min }: { val: number | null; min: number }) {
  if (val === null) return <td style={{ ...td, color: "#cbd5e1" }}>—</td>;
  return (
    <td style={{ ...td, color: val >= min ? "#166534" : "#991b1b", fontWeight: 600 }}>
      {val.toFixed(1)}
    </td>
  );
}

function Card({ label, value, color = "#1C2833" }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ background: "#fff", border: "1.5px solid #C8D6E5", borderRadius: 10, padding: "14px 20px", minWidth: 100 }}>
      <div style={{ fontSize: 24, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 12, color: "#5D6D7E" }}>{label}</div>
    </div>
  );
}

const th: React.CSSProperties = { padding: "10px 12px", textAlign: "left", fontWeight: 700, fontSize: 12, color: "#5D6D7E", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "10px 12px", verticalAlign: "middle" };
const linkBtn: React.CSSProperties = { background: "none", border: "none", color: "#4A7DB5", cursor: "pointer", fontSize: 13, fontWeight: 600, padding: 0 };
