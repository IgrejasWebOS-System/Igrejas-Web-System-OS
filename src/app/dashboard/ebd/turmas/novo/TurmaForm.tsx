"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { EbdFaixaEtaria } from "@/types";
import { EBD_FAIXA_LABELS, DIA_SEMANA_LABELS } from "@/types";

type Unit = { id: string; name: string; unit_type: string };
type MembroResult = { party_id: string; nome: string; matricula: string | null };

type Props = {
  units: Unit[];
  criarTurmaAction: (payload: {
    unit_id: string;
    nome: string;
    faixa_etaria: EbdFaixaEtaria;
    professor_party_id?: string;
    dia_semana: number;
    horario: string;
    descricao?: string;
  }) => Promise<{ data?: any; error?: string }>;
  buscarMembroAction: (termo: string) => Promise<{ data: MembroResult[] }>;
};

export default function TurmaForm({ units, criarTurmaAction, buscarMembroAction }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [unitId, setUnitId]           = useState(units[0]?.id ?? "");
  const [nome, setNome]               = useState("");
  const [faixa, setFaixa]             = useState<EbdFaixaEtaria>("ADULTOS");
  const [diaSemana, setDiaSemana]     = useState(0);
  const [horario, setHorario]         = useState("09:00");
  const [descricao, setDescricao]     = useState("");
  const [erro, setErro]               = useState("");

  // Professor (autocomplete)
  const [termoProfessor, setTermoProfessor]       = useState("");
  const [sugestoesProfessor, setSugestoesProfessor] = useState<MembroResult[]>([]);
  const [professor, setProfessor]                 = useState<MembroResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (termoProfessor.length < 2) { setSugestoesProfessor([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const res = await buscarMembroAction(termoProfessor);
      setSugestoesProfessor(res.data);
    }, 300);
  }, [termoProfessor, buscarMembroAction]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) { setErro("Informe o nome da turma."); return; }
    if (!unitId)      { setErro("Selecione a unidade."); return; }
    setErro("");

    startTransition(async () => {
      const result = await criarTurmaAction({
        unit_id:            unitId,
        nome:               nome.trim(),
        faixa_etaria:       faixa,
        professor_party_id: professor?.party_id,
        dia_semana:         diaSemana,
        horario,
        descricao:          descricao || undefined,
      });

      if (result.error) { setErro(result.error); return; }
      router.push(`/dashboard/ebd/turmas/${result.data?.id}`);
    });
  }

  const field: React.CSSProperties = {
    width: "100%", border: "1px solid var(--color-border)", borderRadius: 8,
    padding: "9px 12px", fontSize: 13, outline: "none", background: "#fff",
  };
  const label: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 600,
    color: "var(--color-text-muted)", marginBottom: 6,
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 12, padding: 20 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: "var(--color-text-primary)" }}>
          Dados da Turma
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Nome */}
          <div>
            <label style={label}>Nome da Turma *</label>
            <input style={field} value={nome} onChange={e => setNome(e.target.value)}
              placeholder="Ex: Turma Adultos Manhã" required />
          </div>

          {/* Unidade */}
          <div>
            <label style={label}>Unidade *</label>
            <select style={field} value={unitId} onChange={e => setUnitId(e.target.value)} required>
              {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>

          {/* Faixa etária */}
          <div>
            <label style={label}>Faixa Etária *</label>
            <select style={field} value={faixa} onChange={e => setFaixa(e.target.value as EbdFaixaEtaria)}>
              {Object.entries(EBD_FAIXA_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Dia e Horário */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={label}>Dia da Semana *</label>
              <select style={field} value={diaSemana} onChange={e => setDiaSemana(Number(e.target.value))}>
                {Object.entries(DIA_SEMANA_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={label}>Horário *</label>
              <input type="time" style={field} value={horario} onChange={e => setHorario(e.target.value)} required />
            </div>
          </div>
        </div>
      </div>

      {/* Professor */}
      <div style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 12, padding: 20 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: "var(--color-text-primary)" }}>
          Professor Responsável (opcional)
        </h2>
        {professor ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
            background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "10px 14px" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{professor.nome}</div>
              {professor.matricula && <div style={{ fontSize: 11, color: "#64748b" }}>#{professor.matricula}</div>}
            </div>
            <button type="button" onClick={() => { setProfessor(null); setTermoProfessor(""); }}
              style={{ fontSize: 12, color: "#94a3b8", background: "none", border: "none", cursor: "pointer" }}>
              × Remover
            </button>
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            <input style={field} value={termoProfessor} onChange={e => setTermoProfessor(e.target.value)}
              placeholder="Buscar membro por nome…" />
            {sugestoesProfessor.length > 0 && (
              <div style={{ position: "absolute", zIndex: 10, top: "100%", marginTop: 2, width: "100%",
                background: "#fff", border: "1px solid var(--color-border)", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,.1)" }}>
                {sugestoesProfessor.map(m => (
                  <button key={m.party_id} type="button"
                    onClick={() => { setProfessor(m); setTermoProfessor(m.nome); setSugestoesProfessor([]); }}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px",
                      background: "none", border: "none", cursor: "pointer", fontSize: 13,
                      borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ fontWeight: 600 }}>{m.nome}</div>
                    {m.matricula && <div style={{ fontSize: 11, color: "#94a3b8" }}>#{m.matricula}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Descrição */}
      <div style={{ background: "#fff", border: "1px solid var(--color-border)", borderRadius: 12, padding: 20 }}>
        <label style={{ ...label, marginBottom: 8 }}>Descrição (opcional)</label>
        <textarea style={{ ...field, resize: "none" }} rows={3} value={descricao}
          onChange={e => setDescricao(e.target.value)}
          placeholder="Observações sobre a turma, material utilizado, etc." />
      </div>

      {erro && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8,
          padding: "10px 14px", fontSize: 13, color: "#b91c1c" }}>
          {erro}
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button type="button" onClick={() => router.back()}
          style={{ flex: 1, padding: "10px", border: "1px solid var(--color-border)", borderRadius: 8,
            fontSize: 13, background: "#fff", cursor: "pointer", color: "var(--color-text-muted)" }}>
          Cancelar
        </button>
        <button type="submit" disabled={isPending}
          style={{ flex: 2, padding: "10px", background: "var(--color-primary)", color: "#fff",
            border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? .6 : 1 }}>
          {isPending ? "Criando turma…" : "Criar Turma"}
        </button>
      </div>
    </form>
  );
}
