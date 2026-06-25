"use server";

import { getAuthContext } from "@/utils/supabase/auth-context";
import { createClient }   from "@/utils/supabase/server";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type StatsSecretaria = {
  // 1.1.1 Seção de Membros
  total: number;
  ativos: number;
  inativos: number;
  em_observacao: number;
  suspensos: number;
  desligados: number;
  por_genero: { label: string; total: number; cor: string }[];
  por_faixa_etaria: { label: string; total: number; cor: string }[];
  por_cargo: { nome: string; total: number }[];
  total_igrejas: number;
  // 1.1.2 Gráficos
  novos_por_mes: number[];       // [0..11] somente ano atual
  acumulado_por_mes: number[];   // crescimento acumulado até o mês corrente
};

export type Aniversariante = {
  party_id: string;
  full_name: string;
  data_nascimento: string;
  matricula: string | null;
  anos: number;
};

export type StatsUso = {
  membros_ativos: number;
  membros_novos_mes: number;
  usuarios_total: number;
  documentos_total: number;
  documentos_mes: number;
  turmas_ebd: number;
  alunos_ebd: number;
};

// ─────────────────────────────────────────────────────────────
// 1.1 Dashboard Secretaria
// ─────────────────────────────────────────────────────────────

export async function buscarStatsSecretaria(): Promise<StatsSecretaria | null> {
  const ctx = await getAuthContext();
  if (!ctx) return null;

  const supabase = await createClient();

  // Busca todos os party_members ativos com dados pessoais e cargo
  const { data: members, error } = await supabase
    .from("party_members")
    .select(`
      situacao,
      cargo_id,
      created_at,
      parties!inner ( gender, data_nascimento )
    `)
    .eq("ministry_id", ctx.ministry_id)
    .eq("is_active", true);

  if (error) return null;

  // Cargos lookup
  const { data: cargosData } = await supabase
    .from("member_cargos")
    .select("id, nome")
    .eq("ministry_id", ctx.ministry_id);
  const cargoMap: Record<string, string> = {};
  for (const c of cargosData ?? []) cargoMap[c.id] = c.nome;

  // Contadores
  const situacaoCount = { ATIVO: 0, INATIVO: 0, EM_OBSERVACAO: 0, SUSPENSO: 0, DESLIGADO: 0 };
  const generoCount: Record<string, number> = {};
  const cargoCount: Record<string, number> = {};
  const faixaCount = { crianca: 0, adolescente: 0, adulto: 0, idoso: 0 };
  const novosPorMes = new Array(12).fill(0);

  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonthIdx = now.getMonth(); // 0-indexed

  for (const m of members ?? []) {
    const s = m.situacao as keyof typeof situacaoCount;
    if (s in situacaoCount) situacaoCount[s]++;

    const gender: string = (m as any).parties?.gender ?? "";
    const genLabel =
      gender === "M" ? "Masculino" :
      gender === "F" ? "Feminino"  :
      gender        ? gender       : "Não informado";
    generoCount[genLabel] = (generoCount[genLabel] ?? 0) + 1;

    if (m.cargo_id) {
      const cn = cargoMap[m.cargo_id] ?? "Outro";
      cargoCount[cn] = (cargoCount[cn] ?? 0) + 1;
    }

    const created = new Date(m.created_at);
    if (created.getFullYear() === thisYear) {
      novosPorMes[created.getMonth()]++;
    }

    const dobStr: string | null = (m as any).parties?.data_nascimento ?? null;
    if (dobStr) {
      const dob = new Date(dobStr + "T00:00:00");
      const age = Math.floor(
        (now.getTime() - dob.getTime()) / (365.25 * 24 * 3600 * 1000)
      );
      if (age < 12)       faixaCount.crianca++;
      else if (age < 18)  faixaCount.adolescente++;
      else if (age < 60)  faixaCount.adulto++;
      else                faixaCount.idoso++;
    }
  }

  // Acumulado até o mês corrente
  const acumuladoPorMes: number[] = [];
  let acc = 0;
  for (let i = 0; i <= thisMonthIdx; i++) {
    acc += novosPorMes[i];
    acumuladoPorMes.push(acc);
  }

  // Igrejas
  const { count: totalIgrejas } = await supabase
    .from("units")
    .select("id", { count: "exact", head: true })
    .eq("ministry_id", ctx.ministry_id)
    .eq("is_active", true)
    .in("unit_type", ["IGREJA", "SUB_CONGREGACAO"]);

  const COR_GENERO: Record<string, string> = {
    "Masculino": "#4A7DB5",
    "Feminino":  "#e91e8c",
  };

  return {
    total:          (members ?? []).length,
    ativos:         situacaoCount.ATIVO,
    inativos:       situacaoCount.INATIVO,
    em_observacao:  situacaoCount.EM_OBSERVACAO,
    suspensos:      situacaoCount.SUSPENSO,
    desligados:     situacaoCount.DESLIGADO,
    por_genero: Object.entries(generoCount)
      .sort((a, b) => b[1] - a[1])
      .map(([label, total]) => ({
        label, total,
        cor: COR_GENERO[label] ?? "#8b5cf6",
      })),
    por_faixa_etaria: [
      { label: "Crianças (0–11)",       total: faixaCount.crianca,     cor: "#22c55e" },
      { label: "Adolescentes (12–17)",   total: faixaCount.adolescente, cor: "#f59e0b" },
      { label: "Adultos (18–59)",        total: faixaCount.adulto,      cor: "#4A7DB5" },
      { label: "Idosos (60+)",           total: faixaCount.idoso,       cor: "#8b5cf6" },
    ],
    por_cargo: Object.entries(cargoCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([nome, total]) => ({ nome, total })),
    total_igrejas:    totalIgrejas ?? 0,
    novos_por_mes:    novosPorMes,
    acumulado_por_mes: acumuladoPorMes,
  };
}

// ─────────────────────────────────────────────────────────────
// 1.1.3 Aniversariantes do Dia
// ─────────────────────────────────────────────────────────────

export async function buscarAniversariantesDia(): Promise<Aniversariante[]> {
  const ctx = await getAuthContext();
  if (!ctx) return [];

  const supabase = await createClient();

  const { data } = await supabase
    .from("party_members")
    .select("party_id, matricula, parties!inner(full_name, data_nascimento)")
    .eq("ministry_id", ctx.ministry_id)
    .eq("is_active", true)
    .eq("situacao", "ATIVO");

  if (!data) return [];

  const today = new Date();
  const month = today.getMonth() + 1;
  const day   = today.getDate();

  return (data as any[])
    .filter(m => {
      const dob: string | null = m.parties?.data_nascimento;
      if (!dob) return false;
      const d = new Date(dob + "T00:00:00");
      return d.getMonth() + 1 === month && d.getDate() === day;
    })
    .map(m => {
      const dob = new Date(m.parties.data_nascimento + "T00:00:00");
      const anos = today.getFullYear() - dob.getFullYear();
      return {
        party_id:        m.party_id,
        full_name:       m.parties.full_name as string,
        data_nascimento: m.parties.data_nascimento as string,
        matricula:       m.matricula ?? null,
        anos,
      };
    })
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "pt-BR"));
}

// ─────────────────────────────────────────────────────────────
// 1.3 Estatísticas de Uso
// ─────────────────────────────────────────────────────────────

export async function buscarStatsUso(): Promise<StatsUso> {
  const ctx = await getAuthContext();
  if (!ctx) {
    return {
      membros_ativos: 0, membros_novos_mes: 0,
      usuarios_total: 0,
      documentos_total: 0, documentos_mes: 0,
      turmas_ebd: 0, alunos_ebd: 0,
    };
  }

  const supabase = await createClient();
  const umMesAtras = new Date(Date.now() - 30 * 86400_000).toISOString();

  const [
    membrosAtivos,
    membrosNovos,
    usuarios,
    docsTotal,
    docsMes,
    turmas,
    alunos,
  ] = await Promise.all([
    supabase
      .from("party_members")
      .select("id", { count: "exact", head: true })
      .eq("ministry_id", ctx.ministry_id)
      .eq("situacao", "ATIVO")
      .eq("is_active", true),
    supabase
      .from("party_members")
      .select("id", { count: "exact", head: true })
      .eq("ministry_id", ctx.ministry_id)
      .eq("is_active", true)
      .gte("created_at", umMesAtras),
    supabase
      .from("admin_roles")
      .select("id", { count: "exact", head: true })
      .eq("ministry_id", ctx.ministry_id)
      .eq("is_active", true),
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("ministry_id", ctx.ministry_id),
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("ministry_id", ctx.ministry_id)
      .gte("created_at", umMesAtras),
    supabase
      .from("ebd_classes")
      .select("id", { count: "exact", head: true })
      .eq("ministry_id", ctx.ministry_id)
      .eq("is_active", true),
    supabase
      .from("ebd_enrollments")
      .select("id", { count: "exact", head: true })
      .eq("ministry_id", ctx.ministry_id)
      .eq("is_active", true),
  ]);

  return {
    membros_ativos:    membrosAtivos.count ?? 0,
    membros_novos_mes: membrosNovos.count ?? 0,
    usuarios_total:    usuarios.count ?? 0,
    documentos_total:  docsTotal.count ?? 0,
    documentos_mes:    docsMes.count ?? 0,
    turmas_ebd:        turmas.count ?? 0,
    alunos_ebd:        alunos.count ?? 0,
  };
}
