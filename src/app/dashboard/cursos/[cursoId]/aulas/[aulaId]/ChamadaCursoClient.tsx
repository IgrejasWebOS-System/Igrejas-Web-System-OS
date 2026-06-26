"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CourseLesson } from "@/types";
import { salvarPresencaCursoAction } from "../../../actions";

type Attendance = {
  id: string;
  lesson_id: string;
  enrollment_id: string;
  ministry_id: string;
  presente: boolean;
  created_at: string;
  party: { id: string; nome_completo: string; matricula: string };
};

type Props = {
  cursoId: string;
  cursoTitulo: string;
  aula: CourseLesson;
  initAttendances: Attendance[];
};

export default function ChamadaCursoClient({ cursoId, cursoTitulo, aula, initAttendances }: Props) {
  const router   = useRouter();
  const [isPending, startTransition] = useTransition();
  const [attendances, setAttendances] = useState(initAttendances);
  const [salvando, setSalvando]       = useState<string | null>(null);

  function togglePresenca(att: Attendance) {
    const novoValor = !att.presente;
    setAttendances((prev) =>
      prev.map((a) => a.id === att.id ? { ...a, presente: novoValor } : a)
    );
    setSalvando(att.id);
    startTransition(async () => {
      await salvarPresencaCursoAction(att.id, novoValor);
      setSalvando(null);
      router.refresh();
    });
  }

  const presentes = attendances.filter((a) => a.presente).length;
  const total     = attendances.length;

  return (
    <div style={{ padding: "28px 28px", maxWidth: 720 }}>
      {/* Breadcrumb */}
      <button
        onClick={() => router.push(`/dashboard/cursos/${cursoId}`)}
        style={{ background: "none", border: "none", color: "#4A7DB5", cursor: "pointer", fontWeight: 600, fontSize: 13, padding: 0, marginBottom: 16 }}
      >
        ← {cursoTitulo}
      </button>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1C2833", margin: 0 }}>
            Chamada — Aula {aula.numero}
          </h1>
          <p style={{ fontSize: 13, color: "#5D6D7E", marginTop: 4 }}>
            {new Date(aula.data_aula + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
            {aula.conteudo && ` · ${aula.conteudo}`}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#1C2833" }}>{presentes}/{total}</div>
          <div style={{ fontSize: 11, color: "#5D6D7E" }}>presentes</div>
        </div>
      </div>

      {/* Barra de progresso */}
      <div style={{ height: 8, background: "#e2e8f0", borderRadius: 99, marginBottom: 24, overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 99,
          background: presentes / total >= 0.75 ? "#16a34a" : "#f59e0b",
          width: `${total > 0 ? (presentes / total) * 100 : 0}%`,
          transition: "width 0.3s",
        }} />
      </div>

      {total === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#5D6D7E" }}>
          <p style={{ fontWeight: 600 }}>Nenhum participante inscrito neste curso</p>
          <p style={{ fontSize: 13 }}>Inscreva participantes na página do curso primeiro.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {attendances.map((att) => (
            <div
              key={att.id}
              onClick={() => !isPending && togglePresenca(att)}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                background: att.presente ? "#f0fdf4" : "#fff",
                border: `1.5px solid ${att.presente ? "#86efac" : "#e2e8f0"}`,
                borderRadius: 10, padding: "14px 16px",
                cursor: isPending ? "wait" : "pointer",
                transition: "all 0.15s",
                opacity: salvando === att.id ? 0.6 : 1,
              }}
            >
              {/* Checkbox visual */}
              <div style={{
                width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                border: `2px solid ${att.presente ? "#16a34a" : "#cbd5e1"}`,
                background: att.presente ? "#16a34a" : "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
              }}>
                {att.presente && <span style={{ color: "#fff", fontSize: 14, fontWeight: 800 }}>✓</span>}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#1C2833" }}>{att.party.nome_completo}</div>
                {att.party.matricula && (
                  <div style={{ fontSize: 12, color: "#5D6D7E" }}>Matrícula: {att.party.matricula}</div>
                )}
              </div>

              <span style={{
                fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
                background: att.presente ? "#dcfce7" : "#f1f5f9",
                color: att.presente ? "#166534" : "#94a3b8",
              }}>
                {salvando === att.id ? "..." : att.presente ? "Presente" : "Ausente"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Ações rápidas */}
      {total > 0 && (
        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button
            onClick={() => {
              attendances.forEach((a) => {
                if (!a.presente) togglePresenca(a);
              });
            }}
            style={btnStyle("#16a34a")}
            disabled={isPending}
          >
            ✓ Marcar todos presentes
          </button>
          <button
            onClick={() => {
              attendances.forEach((a) => {
                if (a.presente) togglePresenca(a);
              });
            }}
            style={btnStyle("#dc2626")}
            disabled={isPending}
          >
            ✗ Marcar todos ausentes
          </button>
        </div>
      )}
    </div>
  );
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    background: bg, color: "#fff", border: "none", borderRadius: 8,
    padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer",
  };
}
