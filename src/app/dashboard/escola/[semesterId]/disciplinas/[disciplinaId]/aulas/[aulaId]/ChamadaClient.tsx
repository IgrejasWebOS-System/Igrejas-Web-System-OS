"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarPresencaAction } from "../../../../../actions";

type AttendanceRow = {
  id: string;
  presente: boolean;
  enrollment: {
    party_id: string;
    party: { nome_completo: string; matricula: string };
  };
};

type Props = {
  semesterId: string;
  disciplinaId: string;
  aula: any;
  attendance: AttendanceRow[];
};

export default function ChamadaClient({ semesterId, disciplinaId, aula, attendance: init }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [attendance, setAttendance] = useState(init);
  const [salvando, setSalvando] = useState<string | null>(null);

  function togglePresenca(att: AttendanceRow) {
    const novoValor = !att.presente;
    setAttendance((prev) => prev.map((a) => a.id === att.id ? { ...a, presente: novoValor } : a));
    setSalvando(att.id);
    startTransition(async () => {
      try {
        await salvarPresencaAction(att.id, novoValor);
      } catch {
        // reverter em caso de erro
        setAttendance((prev) => prev.map((a) => a.id === att.id ? { ...a, presente: att.presente } : a));
      } finally {
        setSalvando(null);
      }
    });
  }

  const presentes = attendance.filter((a) => a.presente).length;
  const total = attendance.length;
  const pct = total > 0 ? Math.round((presentes / total) * 100) : 0;

  return (
    <div style={{ padding: "32px 28px", maxWidth: 700 }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, fontSize: 13, color: "#5D6D7E" }}>
        <button onClick={() => router.push("/dashboard/escola")} style={linkBtn}>Escola</button>
        <span>/</span>
        <button onClick={() => router.push(`/dashboard/escola/${semesterId}`)} style={linkBtn}>Semestre</button>
        <span>/</span>
        <button onClick={() => router.push(`/dashboard/escola/${semesterId}/disciplinas/${disciplinaId}`)} style={linkBtn}>Disciplina</button>
        <span>/</span>
        <span style={{ color: "#1C2833", fontWeight: 600 }}>Chamada — Aula {aula?.numero}</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1C2833", margin: 0 }}>
            Chamada — Aula {aula?.numero}
          </h1>
          <p style={{ color: "#5D6D7E", fontSize: 13, marginTop: 4 }}>
            {aula?.data_aula ? new Date(aula.data_aula + "T00:00:00").toLocaleDateString("pt-BR") : ""}
            {aula?.conteudo && ` · ${aula.conteudo}`}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: pct >= 75 ? "#166534" : "#991b1b" }}>{pct}%</div>
          <div style={{ fontSize: 12, color: "#5D6D7E" }}>{presentes}/{total} presentes</div>
        </div>
      </div>

      {/* Barra de progresso */}
      <div style={{ height: 6, background: "#e2e8f0", borderRadius: 99, marginBottom: 24, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: pct >= 75 ? "#16a34a" : "#dc2626", borderRadius: 99, transition: "width .3s" }} />
      </div>

      {attendance.length === 0 ? (
        <p style={{ color: "#5D6D7E", textAlign: "center", padding: "40px 0" }}>
          Nenhum aluno matriculado nesta disciplina.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {attendance.map((att) => {
            const party = att.enrollment?.party;
            const isSaving = salvando === att.id;
            return (
              <div key={att.id} onClick={() => !isSaving && togglePresenca(att)} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 18px", borderRadius: 10, cursor: isSaving ? "wait" : "pointer",
                background: att.presente ? "#f0fdf4" : "#fff",
                border: `1.5px solid ${att.presente ? "#86efac" : "#e2e8f0"}`,
                transition: "all .15s",
              }}>
                <div>
                  <span style={{ fontWeight: 700, color: "#1C2833", fontSize: 14 }}>{party?.nome_completo ?? "—"}</span>
                  <span style={{ color: "#5D6D7E", fontSize: 12, marginLeft: 10 }}>#{party?.matricula}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {isSaving && <span style={{ fontSize: 11, color: "#94a3b8" }}>salvando...</span>}
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: att.presente ? "#16a34a" : "#e2e8f0",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: att.presente ? "#fff" : "#94a3b8", fontSize: 16, fontWeight: 700,
                    transition: "background .15s",
                  }}>
                    {att.presente ? "✓" : "○"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 24, textAlign: "center" }}>
        <button onClick={() => router.push(`/dashboard/escola/${semesterId}/disciplinas/${disciplinaId}`)}
          style={{ background: "#4A7DB5", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          ← Voltar para Disciplina
        </button>
      </div>
    </div>
  );
}

const linkBtn: React.CSSProperties = {
  background: "none", border: "none", color: "#4A7DB5", cursor: "pointer",
  fontSize: 13, fontWeight: 600, padding: 0,
};
