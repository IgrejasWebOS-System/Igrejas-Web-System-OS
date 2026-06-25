// ============================================================
// IgrejasWeb System OS — Tipos Globais
// ============================================================

export type Ministry = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
};

export type MinistryModule = {
  id: string;
  ministry_id: string;
  module: ModuleKey;
  is_active: boolean;
};

export type ModuleKey =
  | "membros"
  | "financeiro"
  | "escola"
  | "cursos"
  | "ebd"
  | "secretaria"
  | "patrimonio"
  | "eventos"
  | "ocorrencias";

export type UnitType =
  | "CAMPO"
  | "SEDE"
  | "SETOR"
  | "IGREJA"
  | "SUB_CONGREGACAO"   // Grupo consolidado, local fixo, liderança definida. Filho de IGREJA.
  | "PONTO_PREGACAO"    // Reunião informal/inicial. Filho de IGREJA ou SUB_CONGREGACAO.
  | "CELULA";           // Reunião em casa. Filho de IGREJA, SUB_CONGREGACAO ou PONTO_PREGACAO.

export type Unit = {
  id: string;
  ministry_id: string;
  parent_id: string | null;
  name: string;
  unit_type: UnitType;
  is_headquarters: boolean;
  is_sector_mother: boolean;
  is_active: boolean;
  order_index: number;
  created_at: string;
};

export type PartyType = "PESSOA_FISICA" | "PESSOA_JURIDICA";

export type Party = {
  id: string;
  ministry_id: string;
  party_type: PartyType;
  full_name: string;
  cpf: string | null;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  gender: string | null;
  photo_url: string | null;
  zip_code: string | null;
  address: string | null;
  address_num: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  rg: string | null;
  rg_issuer: string | null;
  rg_state: string | null;
  mother_name: string | null;
  father_name: string | null;
  spouse_name: string | null;
  is_active: boolean;
  created_at: string;
};

export type RoleType =
  | "MEMBRO"
  | "CLIENTE"
  | "FORNECEDOR"
  | "ALUNO"
  | "VOLUNTARIO";

export type PartyRole = {
  id: string;
  party_id: string;
  ministry_id: string;
  unit_id: string | null;
  role_type: RoleType;
  status: "ACTIVE" | "INACTIVE" | "PENDING" | "ARCHIVED";
  registration_number: string | null;
  ecclesiastical_role: string | null;
  ecclesiastical_status: "ACTIVE" | "INACTIVE" | "OBSERVATION" | "UNFIT" | null;
  baptism_date: string | null;
  marriage_date: string | null;
  origin_church: string | null;
  financial_status: "UP_TO_DATE" | "PENDING" | null;
  enrollment_date: string | null;
  started_at: string;
  ended_at: string | null;
};

export type AdminLevel = 0 | 1 | 2 | 3 | 4;

export type AdminRole = {
  id: string;
  user_id: string;
  ministry_id: string | null;
  unit_id: string | null;
  level: AdminLevel;
  is_active: boolean;
  created_at: string;
  ministries?: Ministry;
  units?: Unit;
};

// ============================================================
// FASE 2 — MÓDULO MEMBROS
// ============================================================

// ── Lookup tables ────────────────────────────────────────────
export type MemberCargo = {
  id: string;
  ministry_id: string;
  nome: string;
  ordem: number;
  is_active: boolean;
};

export type Department = {
  id: string;
  ministry_id: string;
  nome: string;
  sigla: string | null;
  is_active: boolean;
};

export type MemberFuncaoLookup = {
  id: string;
  ministry_id: string;
  nome: string;
  is_active: boolean;
};

export type MemberProfession = {
  id: string;
  ministry_id: string;
  nome: string;
  is_active: boolean;
};

export type MemberSchooling = {
  id: string;
  ministry_id: string;
  nome: string;
  ordem: number;
  is_active: boolean;
};

export type MemberCivilStatus = {
  id: string;
  ministry_id: string;
  nome: string;
  is_active: boolean;
};

export type MemberGender = {
  id: string;
  ministry_id: string;
  nome: string;
  is_active: boolean;
};

export type MemberFinancialStatus = {
  id: string;
  ministry_id: string;
  nome: string;
  is_active: boolean;
};

// ── Enums de situação e subtipo ──────────────────────────────
export type MemberSituacao =
  | "ATIVO"
  | "INATIVO"
  | "EM_OBSERVACAO"
  | "SUSPENSO"
  | "DESLIGADO";

export type PartySubtype =
  | "MEMBRO_ATIVO"
  | "MEMBRO_PROVISORIO"
  | "DEPENDENTE"
  | "VISITANTE";

export type ScopeType =
  | "CAMPO"
  | "SETOR"
  | "IGREJA"
  | "SUB_CONGREGACAO"
  | "PONTO_PREGACAO"
  | "CELULA";

// ── Tabelas principais ───────────────────────────────────────
export type PartyMember = {
  id: string;
  party_id: string;
  ministry_id: string;
  unit_id: string | null;
  party_subtype: PartySubtype;
  matricula: string | null;
  codigo_provisorio: string | null;
  matricula_legado: string | null;
  cargo_id: string | null;
  situacao: MemberSituacao;
  data_ingresso: string | null;
  data_batismo_aguas: string | null;
  data_batismo_espirito: string | null;
  data_desligamento: string | null;
  civil_status_id: string | null;
  gender_id: string | null;
  schooling_id: string | null;
  profession_id: string | null;
  financial_status_id: string | null;
  conjuge_party_id: string | null;
  igreja_origem: string | null;
  whatsapp: string | null;
  celular: string | null;
  foto_url: string | null;
  observacoes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PartyAddress = {
  id: string;
  party_id: string;
  ministry_id: string;
  tipo: "RESIDENCIAL" | "COMERCIAL";
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  pais: string;
  is_principal: boolean;
};

export type PartyFuncao = {
  id: string;
  party_id: string;
  ministry_id: string;
  department_id: string;
  funcao_id: string | null;
  scope_type: ScopeType;
  unit_id: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  is_ativo: boolean;
  observacoes: string | null;
  // joins
  departments?: { nome: string; sigla: string | null };
  member_funcoes_lookup?: { nome: string };
  units?: { name: string };
};

export type PartyDependent = {
  id: string;
  party_id: string;
  responsible_party_id: string;
  ministry_id: string;
  relationship: "FILHO" | "TUTELADO";
  data_apresentacao: string | null;
  observacoes: string | null;
  // join
  parties?: { full_name: string; birth_date: string | null };
};

export type MemberHistory = {
  id: string;
  ministry_id: string;
  party_id: string;
  situacao_anterior: MemberSituacao | null;
  situacao_nova: MemberSituacao;
  motivo: string | null;
  alterado_por: string | null;
  criado_em: string;
};

export type MemberTransfer = {
  id: string;
  ministry_id: string;
  party_id: string;
  unit_origem_id: string | null;
  unit_destino_id: string | null;
  tipo: "INTRA" | "INTER" | "DESLIGAMENTO" | "RETORNO";
  data_transferencia: string;
  aprovado_por: string | null;
  obs: string | null;
  created_at: string;
};

// ── Tipo composto para listagem de membros ───────────────────
// JOIN de parties + party_members + lookups
export type MemberListItem = {
  // de parties
  party_id: string;
  full_name: string;
  cpf: string | null;
  email: string | null;
  photo_url: string | null;
  // de party_members
  pm_id: string;
  matricula: string | null;
  codigo_provisorio: string | null;
  situacao: MemberSituacao;
  party_subtype: PartySubtype;
  data_ingresso: string | null;
  // joins de lookup
  cargo_nome: string | null;
  unit_name: string | null;
  gender_nome: string | null;
};

// ── Tipo completo para ficha do membro ───────────────────────
export type MemberFull = Party & {
  party_members: PartyMember & {
    member_cargos: MemberCargo | null;
    member_civil_status: MemberCivilStatus | null;
    member_genders: MemberGender | null;
    member_schooling: MemberSchooling | null;
    member_professions: MemberProfession | null;
    member_financial_status: MemberFinancialStatus | null;
    units: Unit | null;
  };
  party_addresses: PartyAddress[];
  party_funcoes: PartyFuncao[];
  party_dependents: PartyDependent[];
  member_history: MemberHistory[];
};

// ── Lookups agrupados (para formulários) ────────────────────
export type MemberLookups = {
  cargos: MemberCargo[];
  genders: MemberGender[];
  civil_statuses: MemberCivilStatus[];
  schoolings: MemberSchooling[];
  professions: MemberProfession[];
  financial_statuses: MemberFinancialStatus[];
  departments: Department[];
  funcoes_lookup: MemberFuncaoLookup[];
  units: Unit[];
};

// ============================================================
// FASE 3 — MÓDULO SECRETARIA
// ============================================================

export type DocumentType = {
  id: string;
  ministry_id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  template_html: string;
  variaveis_disponiveis: string[];
  requer_assinatura: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Document = {
  id: string;
  ministry_id: string;
  party_id: string;
  unit_id: string | null;
  type_id: string;
  emitido_por: string | null;
  data_emissao: string;
  numero_protocolo: string | null;
  conteudo_html: string | null;
  arquivo_url: string | null;
  observacoes: string | null;
  is_active: boolean;
  created_at: string;
};

// Tipo composto para listagem de documentos emitidos
export type DocumentListItem = Document & {
  tipo_nome: string;
  tipo_slug: string;
  membro_nome: string;
  membro_matricula: string | null;
  unidade_nome: string | null;
};

// Tipo completo para visualização/PDF
export type DocumentFull = Document & {
  document_types: DocumentType;
  parties: Pick<Party, "id" | "full_name" | "cpf" | "email">;
  units: Pick<Unit, "id" | "name" | "unit_type"> | null;
};

// ── Contexto de sessão (salvo em cookie após login) ──────────
export type SessionContext = {
  ministry_id: string;
  ministry_name: string;
  ministry_slug: string;
  unit_id: string | null;
  level: AdminLevel;
  modules: ModuleKey[];
};

// ── Fase 4: EBD ──────────────────────────────────────────────

export type EbdFaixaEtaria =
  | "MATERNAL" | "JARDIM" | "PRIMARIOS" | "JUNIORES"
  | "ADOLESCENTES" | "JOVENS" | "ADULTOS" | "TERCEIRA_IDADE" | "MISTO";

export const EBD_FAIXA_LABELS: Record<EbdFaixaEtaria, string> = {
  MATERNAL:      "Maternal",
  JARDIM:        "Jardim",
  PRIMARIOS:     "Primários",
  JUNIORES:      "Juniores",
  ADOLESCENTES:  "Adolescentes",
  JOVENS:        "Jovens",
  ADULTOS:       "Adultos",
  TERCEIRA_IDADE:"Terceira Idade",
  MISTO:         "Misto",
};

export const DIA_SEMANA_LABELS: Record<number, string> = {
  0: "Domingo", 1: "Segunda", 2: "Terça",
  3: "Quarta",  4: "Quinta",  5: "Sexta", 6: "Sábado",
};

export type EbdClass = {
  id: string;
  ministry_id: string;
  unit_id: string;
  nome: string;
  faixa_etaria: EbdFaixaEtaria;
  professor_party_id: string | null;
  dia_semana: number;
  horario: string;
  descricao: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type EbdClassListItem = EbdClass & {
  unit_name: string;
  professor_nome: string | null;
  total_alunos: number;
  ultima_chamada: string | null;
  media_frequencia: number | null; // 0–100
};

export type EbdEnrollment = {
  id: string;
  ministry_id: string;
  class_id: string;
  party_id: string;
  data_entrada: string;
  data_saida: string | null;
  is_active: boolean;
  created_at: string;
};

export type EbdEnrollmentWithMember = EbdEnrollment & {
  full_name: string;
  matricula: string | null;
  data_nascimento: string | null;
  faltas_consecutivas: number;
};

export type EbdRollCall = {
  id: string;
  ministry_id: string;
  class_id: string;
  data: string;
  total_presentes: number;
  visitantes: number;
  observacoes: string | null;
  criado_por: string | null;
  created_at: string;
};

export type EbdRollCallFull = EbdRollCall & {
  attendances: {
    party_id: string;
    full_name: string;
    presente: boolean;
    justificativa: string | null;
  }[];
};

export type EbdAttendance = {
  id: string;
  ministry_id: string;
  roll_call_id: string;
  party_id: string;
  presente: boolean;
  justificativa: string | null;
  created_at: string;
};

// ── Fase 3C: Credenciais Ministeriais ───────────────────────

export type CredentialSituacao =
  | "PENDENTE" | "CANCELADA" | "LIBERADA" | "CONFIRMADA" | "DIGITAL";

export const CREDENTIAL_SITUACAO_LABELS: Record<CredentialSituacao, string> = {
  PENDENTE:   "Pendente",
  CANCELADA:  "Cancelada",
  LIBERADA:   "Liberada",
  CONFIRMADA: "Confirmada",
  DIGITAL:    "Digital",
};

export const CREDENTIAL_SITUACAO_COLORS: Record<CredentialSituacao, { bg: string; color: string }> = {
  PENDENTE:   { bg: "#fef9c3", color: "#854d0e" },
  CANCELADA:  { bg: "#fee2e2", color: "#991b1b" },
  LIBERADA:   { bg: "#dbeafe", color: "#1e40af" },
  CONFIRMADA: { bg: "#dcfce7", color: "#166534" },
  DIGITAL:    { bg: "#ede9fe", color: "#5b21b6" },
};

export type CredentialModel = {
  id:            string;
  ministry_id:   string;
  nome:          string;
  slug:          string;
  template_html: string | null;
  cargo_id:      string | null;
  validade_anos: number;
  is_active:     boolean;
  created_at:    string;
};

export type CredentialRequestType = {
  id:          string;
  ministry_id: string;
  nome:        string;
  is_active:   boolean;
  created_at:  string;
};

export type CredentialRequest = {
  id:              string;
  ministry_id:     string;
  party_id:        string;
  model_id:        string;
  request_type_id: string | null;
  situacao:        CredentialSituacao;
  arquivo_url:     string | null;
  data_validade:   string | null;
  observacoes:     string | null;
  criado_por:      string | null;
  aprovado_por:    string | null;
  data_aprovacao:  string | null;
  created_at:      string;
  updated_at:      string;
};

export type CredentialRequestListItem = CredentialRequest & {
  membro_nome:       string;
  membro_matricula:  string | null;
  membro_foto:       string | null;
  model_nome:        string;
  request_type_nome: string | null;
  cargo_nome:        string | null;
  unit_nome:         string | null;
};

// ── Fase 3D: Pré-Cadastros e Campanhas ──────────────────────

export type CampanhaTipo =
  | "ATUALIZACAO_CADASTRAL" | "NOVO_MEMBRO" | "BATISMO" | "EVENTO";

export const CAMPANHA_TIPO_LABELS: Record<CampanhaTipo, string> = {
  ATUALIZACAO_CADASTRAL: "Atualização Cadastral",
  NOVO_MEMBRO:           "Novo Membro",
  BATISMO:               "Batismo",
  EVENTO:                "Evento",
};

export type PreRegSituacao = "PENDENTE" | "CANCELADO" | "FINALIZADO";

export const PRE_REG_SITUACAO_LABELS: Record<PreRegSituacao, string> = {
  PENDENTE:   "Pendente",
  CANCELADO:  "Cancelado",
  FINALIZADO: "Finalizado",
};

export const PRE_REG_SITUACAO_COLORS: Record<PreRegSituacao, { bg: string; color: string }> = {
  PENDENTE:   { bg: "#fef9c3", color: "#854d0e" },
  CANCELADO:  { bg: "#fee2e2", color: "#991b1b" },
  FINALIZADO: { bg: "#dcfce7", color: "#166534" },
};

export type PreRegistrationCampaign = {
  id:           string;
  ministry_id:  string;
  nome:         string;
  descricao:    string | null;
  tipo:         CampanhaTipo;
  data_inicio:  string | null;
  data_fim:     string | null;
  link_publico: string | null;
  is_active:    boolean;
  criado_por:   string | null;
  created_at:   string;
};

export type PreRegistration = {
  id:             string;
  ministry_id:    string;
  campaign_id:    string | null;
  party_id:       string | null;
  situacao:       PreRegSituacao;
  dados_json:     Record<string, unknown> | null;
  observacoes:    string | null;
  aprovado_por:   string | null;
  data_aprovacao: string | null;
  criado_por:     string | null;
  created_at:     string;
};

export type PreRegistrationListItem = PreRegistration & {
  nome:           string;
  telefone:       string | null;
  email:          string | null;
  campaign_nome:  string | null;
  campaign_tipo:  CampanhaTipo | null;
};

// ── Fase 3E: Consagração e Batismo ───────────────────────────

export type ConsecrationProcess = {
  id:                 string;
  ministry_id:        string;
  party_id:           string;
  type_id:            string | null;
  situation_id:       string | null;
  cargo_pleiteado_id: string | null;
  unit_id:            string | null;
  data_solicitacao:   string;
  data_consagracao:   string | null;
  observacoes:        string | null;
  criado_por:         string | null;
  aprovado_por:       string | null;
  created_at:         string;
  updated_at:         string;
};

export type ConsecrationListItem = ConsecrationProcess & {
  membro_nome:       string;
  membro_matricula:  string | null;
  unit_nome:         string | null;
  type_nome:         string | null;
  situation_nome:    string | null;
  situation_cor:     string | null;
  cargo_nome:        string | null;
};

export type BaptismSituacao = "PENDENTE" | "EM_ANDAMENTO" | "BATIZADO" | "CANCELADO";

export const BAPTISM_SITUACAO_LABELS: Record<BaptismSituacao, string> = {
  PENDENTE:     "Pendente",
  EM_ANDAMENTO: "Em Andamento",
  BATIZADO:     "Batizado",
  CANCELADO:    "Cancelado",
};

export const BAPTISM_SITUACAO_COLORS: Record<BaptismSituacao, { bg: string; color: string }> = {
  PENDENTE:     { bg: "#fef9c3", color: "#854d0e" },
  EM_ANDAMENTO: { bg: "#dbeafe", color: "#1e40af" },
  BATIZADO:     { bg: "#dcfce7", color: "#166534" },
  CANCELADO:    { bg: "#fee2e2", color: "#991b1b" },
};

export type BaptismProcess = {
  id:              string;
  ministry_id:     string;
  party_id:        string;
  type_id:         string | null;
  unit_id:         string | null;
  pastor_party_id: string | null;
  situacao:        BaptismSituacao;
  data_prevista:   string | null;
  data_realizada:  string | null;
  observacoes:     string | null;
  criado_por:      string | null;
  created_at:      string;
  updated_at:      string;
};

export type BaptismListItem = BaptismProcess & {
  membro_nome:      string;
  membro_matricula: string | null;
  unit_nome:        string | null;
  type_nome:        string | null;
  pastor_nome:      string | null;
};

// ── Fase 3F: Material e Pedidos ───────────────────────────────

export type Material = {
  id:             string;
  ministry_id:    string;
  nome:           string;
  descricao:      string | null;
  unidade:        string;
  valor_unitario: number;
  is_active:      boolean;
  created_at:     string;
};

export type OrderSituacao =
  | "PENDENTE"
  | "CONFIRMADO"
  | "PARCIALMENTE_PAGO"
  | "PAGO"
  | "CANCELADO";

export const ORDER_SITUACAO_LABELS: Record<OrderSituacao, string> = {
  PENDENTE:          "Pendente",
  CONFIRMADO:        "Confirmado",
  PARCIALMENTE_PAGO: "Parcialmente Pago",
  PAGO:              "Pago",
  CANCELADO:         "Cancelado",
};

export const ORDER_SITUACAO_COLORS: Record<OrderSituacao, { bg: string; color: string }> = {
  PENDENTE:          { bg: "#fef9c3", color: "#854d0e" },
  CONFIRMADO:        { bg: "#dbeafe", color: "#1e40af" },
  PARCIALMENTE_PAGO: { bg: "#ede9fe", color: "#5b21b6" },
  PAGO:              { bg: "#dcfce7", color: "#166534" },
  CANCELADO:         { bg: "#fee2e2", color: "#991b1b" },
};

export type MaterialOrder = {
  id:              string;
  ministry_id:     string;
  unit_id:         string | null;
  situacao:        OrderSituacao;
  data_pedido:     string;
  observacoes:     string | null;
  criado_por:      string | null;
  criado_por_nome: string | null;
  created_at:      string;
  updated_at:      string;
};

export type MaterialOrderItem = {
  id:             string;
  order_id:       string;
  material_id:    string | null;
  nome_snapshot:  string;
  quantidade:     number;
  valor_unitario: number;
  subtotal:       number;
  created_at:     string;
};

export type MaterialOrderListItem = MaterialOrder & {
  unit_nome:  string | null;
  total:      number;
  qtd_itens:  number;
};

export type MaterialOrderDetail = MaterialOrder & {
  unit_nome: string | null;
  total:     number;
  items:     MaterialOrderItem[];
};

// ── Fase 3G: Dados Bancários + Pastoreio ─────────────────────

export type BankAccountTipo = "CORRENTE" | "POUPANCA" | "SALARIO";

export const BANK_TIPO_LABELS: Record<BankAccountTipo, string> = {
  CORRENTE: "Conta Corrente",
  POUPANCA: "Conta Poupança",
  SALARIO:  "Conta Salário",
};

export type MemberBankAccount = {
  id:           string;
  ministry_id:  string;
  party_id:     string;
  banco:        string;
  agencia:      string | null;
  conta:        string | null;
  tipo:         BankAccountTipo;
  chave_pix:    string | null;
  is_principal: boolean;
  created_at:   string;
  updated_at:   string;
};

export type PastoralGroup = {
  id:              string;
  ministry_id:     string;
  nome:            string;
  descricao:       string | null;
  pastor_party_id: string | null;
  unit_id:         string | null;
  is_active:       boolean;
  created_at:      string;
};

export type PastoralGroupMember = {
  id:          string;
  group_id:    string;
  party_id:    string;
  ministry_id: string;
  vpd:         number | null;
  observacoes: string | null;
  created_at:  string;
};

export type PastoralGroupListItem = PastoralGroup & {
  pastor_nome:  string | null;
  unit_nome:    string | null;
  qtd_membros:  number;
  vpd_total:    number;
};

export type PastoralGroupDetail = PastoralGroup & {
  pastor_nome: string | null;
  unit_nome:   string | null;
  membros: (PastoralGroupMember & {
    membro_nome:      string;
    membro_matricula: string | null;
    cargo_nome:       string | null;
  })[];
};

// ── Fase 4B — Requerimentos ───────────────────────────────────────────────────

export type RequisitionSituacao = "PENDENTE" | "EM_ANALISE" | "APROVADO" | "REJEITADO" | "ARQUIVADO";

export const REQUISITION_SITUACAO_LABELS: Record<RequisitionSituacao, string> = {
  PENDENTE:    "Pendente",
  EM_ANALISE:  "Em Análise",
  APROVADO:    "Aprovado",
  REJEITADO:   "Rejeitado",
  ARQUIVADO:   "Arquivado",
};

export const REQUISITION_SITUACAO_COLORS: Record<RequisitionSituacao, { bg: string; color: string }> = {
  PENDENTE:    { bg: "#fef3c7", color: "#92400e" },
  EM_ANALISE:  { bg: "#dbeafe", color: "#1e40af" },
  APROVADO:    { bg: "#dcfce7", color: "#166534" },
  REJEITADO:   { bg: "#fee2e2", color: "#991b1b" },
  ARQUIVADO:   { bg: "#f1f5f9", color: "#475569" },
};

export type ReqType = {
  id:            string;
  ministry_id:   string;
  nome:          string;
  descricao:     string | null;
  requer_membro: boolean;
  is_active:     boolean;
  created_at:    string;
};

export type Requisition = {
  id:             string;
  ministry_id:    string;
  numero:         number;
  unit_from_id:   string;
  unit_to_id:     string;
  type_id:        string;
  party_id:       string | null;
  situacao:       RequisitionSituacao;
  descricao:      string;
  resposta:       string | null;
  data_envio:     string;
  data_resposta:  string | null;
  criado_por:     string | null;
  respondido_por: string | null;
  created_at:     string;
  updated_at:     string;
};

export type RequisitionListItem = Requisition & {
  type_nome:      string;
  unit_from_nome: string;
  unit_to_nome:   string;
  membro_nome:    string | null;
};

export type RequisitionDetail = RequisitionListItem & {
  membro_matricula: string | null;
};
