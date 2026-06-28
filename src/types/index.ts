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
  role_title: string | null;
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

// ── Fase 5 — Escola Teológica ─────────────────────────────────────────────────

export type EnrollmentSituacao =
  | "CURSANDO"
  | "APROVADO"
  | "REPROVADO_NOTA"
  | "REPROVADO_FREQUENCIA"
  | "TRANCADO";

export const ENROLLMENT_SITUACAO_LABELS: Record<EnrollmentSituacao, string> = {
  CURSANDO:             "Cursando",
  APROVADO:             "Aprovado",
  REPROVADO_NOTA:       "Reprovado (nota)",
  REPROVADO_FREQUENCIA: "Reprovado (frequência)",
  TRANCADO:             "Trancado",
};

export const ENROLLMENT_SITUACAO_COLORS: Record<EnrollmentSituacao, { bg: string; color: string }> = {
  CURSANDO:             { bg: "#dbeafe", color: "#1e40af" },
  APROVADO:             { bg: "#dcfce7", color: "#166534" },
  REPROVADO_NOTA:       { bg: "#fee2e2", color: "#991b1b" },
  REPROVADO_FREQUENCIA: { bg: "#fef3c7", color: "#92400e" },
  TRANCADO:             { bg: "#f1f5f9", color: "#475569" },
};

export type GradeTipo = "AP1" | "AP2" | "FINAL" | "RECUPERACAO";

export type SchoolSemester = {
  id:          string;
  ministry_id: string;
  nome:        string;
  data_inicio: string;
  data_fim:    string;
  is_active:   boolean;
  created_at:  string;
};

export type SchoolSemesterWithStats = SchoolSemester & {
  total_disciplinas: number;
  total_alunos:      number;
};

export type SchoolDiscipline = {
  id:                 string;
  ministry_id:        string;
  semester_id:        string;
  nome:               string;
  carga_horaria:      number;
  professor_party_id: string | null;
  nota_minima:        number;
  frequencia_minima:  number;
  is_active:          boolean;
  created_at:         string;
};

export type SchoolDisciplineWithStats = SchoolDiscipline & {
  professor_nome:    string | null;
  total_alunos:      number;
  total_aulas:       number;
};

export type SchoolLesson = {
  id:            string;
  discipline_id: string;
  ministry_id:   string;
  numero:        number;
  data_aula:     string;
  conteudo:      string | null;
  created_at:    string;
};

export type SchoolEnrollment = {
  id:            string;
  ministry_id:   string;
  discipline_id: string;
  party_id:      string;
  situacao:      EnrollmentSituacao;
  created_at:    string;
};

export type SchoolGrade = {
  id:            string;
  enrollment_id: string;
  ministry_id:   string;
  tipo:          GradeTipo;
  nota:          number;
  created_at:    string;
  updated_at:    string;
};

export type SchoolAttendance = {
  id:            string;
  lesson_id:     string;
  enrollment_id: string;
  ministry_id:   string;
  presente:      boolean;
  created_at:    string;
};

// Enrollment enriquecido para exibição na disciplina
export type EnrollmentListItem = SchoolEnrollment & {
  party_nome:      string;
  party_matricula: string;
  ap1:             number | null;
  ap2:             number | null;
  final:           number | null;
  recuperacao:     number | null;
  media:           number | null;
  presencas:       number;
  total_aulas:     number;
  frequencia_pct:  number;
};

// Dados completos para boletim do aluno
export type StudentBoletim = {
  party_id:        string;
  party_nome:      string;
  party_matricula: string;
  semester_nome:   string;
  disciplinas: Array<{
    discipline_nome: string;
    professor_nome:  string | null;
    carga_horaria:   number;
    nota_minima:     number;
    frequencia_min:  number;
    ap1:             number | null;
    ap2:             number | null;
    final:           number | null;
    recuperacao:     number | null;
    media:           number | null;
    presencas:       number;
    total_aulas:     number;
    frequencia_pct:  number;
    situacao:        EnrollmentSituacao;
  }>;
};

// ── FASE 6 — CURSOS LIVRES ───────────────────────────────────

export type CourseStatus = "INSCRITO" | "CONCLUIDO" | "DESISTENCIA";
export type CourseCategoria = "GERAL" | "BIBLICO" | "DISCIPULADO" | "LIDERANCA" | "MUSICA" | "INFANTIL" | "JOVENS" | "OUTROS";

export const COURSE_STATUS_LABELS: Record<CourseStatus, string> = {
  INSCRITO:   "Inscrito",
  CONCLUIDO:  "Concluído",
  DESISTENCIA: "Desistência",
};

export const COURSE_STATUS_COLORS: Record<CourseStatus, { bg: string; color: string }> = {
  INSCRITO:    { bg: "#eff6ff", color: "#1d4ed8" },
  CONCLUIDO:   { bg: "#f0fdf4", color: "#166534" },
  DESISTENCIA: { bg: "#fef2f2", color: "#991b1b" },
};

export const COURSE_CATEGORIA_LABELS: Record<CourseCategoria, string> = {
  GERAL:       "Geral",
  BIBLICO:     "Bíblico",
  DISCIPULADO: "Discipulado",
  LIDERANCA:   "Liderança",
  MUSICA:      "Música",
  INFANTIL:    "Infantil",
  JOVENS:      "Jovens",
  OUTROS:      "Outros",
};

export type Course = {
  id:                  string;
  ministry_id:         string;
  titulo:              string;
  descricao:           string | null;
  categoria:           CourseCategoria;
  carga_horaria:       number;
  data_inicio:         string | null;
  data_fim:            string | null;
  vagas:               number | null;
  publico_alvo:        string | null;
  instrutor_party_id:  string | null;
  frequencia_minima:   number;
  is_active:           boolean;
  created_at:          string;
  updated_at:          string;
};

export type CourseWithStats = Course & {
  instrutor_nome:    string | null;
  total_inscritos:   number;
  total_concluidos:  number;
  total_aulas:       number;
  vagas_disponiveis: number | null;
};

export type CourseLesson = {
  id:          string;
  course_id:   string;
  ministry_id: string;
  numero:      number;
  data_aula:   string;
  conteudo:    string | null;
  created_at:  string;
};

export type CourseEnrollment = {
  id:          string;
  course_id:   string;
  party_id:    string;
  ministry_id: string;
  status:      CourseStatus;
  inscrito_em: string;
  concluido_em: string | null;
  created_at:  string;
};

export type CourseEnrollmentListItem = CourseEnrollment & {
  party_nome:      string;
  party_matricula: string;
  presencas:       number;
  total_aulas:     number;
  frequencia_pct:  number;
  certificado_id:  string | null;
};

export type CourseAttendance = {
  id:            string;
  lesson_id:     string;
  enrollment_id: string;
  ministry_id:   string;
  presente:      boolean;
  created_at:    string;
};

export type CourseCertificate = {
  id:            string;
  enrollment_id: string;
  ministry_id:   string;
  emitido_em:    string;
};

// ── FASE 7 — TESOURARIA / FINANCEIRO ────────────────────────

export type FinTxTipo   = "ENTRADA" | "SAIDA";
export type FinTxStatus = "PENDENTE" | "APROVADO" | "REJEITADO" | "ESTORNADO";
export type FinAccountTipo   = "BANCO" | "CAIXA" | "POUPANCA" | "INVESTIMENTO";
export type FinCategoryTipo  = "RECEITA" | "DESPESA";
export type FinCategoryFundo = "DIZIMO" | "OFERTA" | "MISSOES" | "CONSTRUCAO" | "EVENTO" | "OUTRO";
export type FinPeriodStatus  = "ABERTO" | "FECHADO";

export const FIN_TX_STATUS_LABELS: Record<FinTxStatus, string> = {
  PENDENTE:  "Pendente",
  APROVADO:  "Aprovado",
  REJEITADO: "Rejeitado",
  ESTORNADO: "Estornado",
};
export const FIN_TX_STATUS_COLORS: Record<FinTxStatus, { bg: string; color: string }> = {
  PENDENTE:  { bg: "#fffbeb", color: "#92400e" },
  APROVADO:  { bg: "#f0fdf4", color: "#166534" },
  REJEITADO: { bg: "#fef2f2", color: "#991b1b" },
  ESTORNADO: { bg: "#f8fafc", color: "#475569" },
};

export const FIN_ACCOUNT_TIPO_LABELS: Record<FinAccountTipo, string> = {
  BANCO:       "Banco",
  CAIXA:       "Caixa",
  POUPANCA:    "Poupança",
  INVESTIMENTO: "Investimento",
};

export const FIN_FUNDO_LABELS: Record<FinCategoryFundo, string> = {
  DIZIMO:     "Dízimo",
  OFERTA:     "Oferta",
  MISSOES:    "Missões",
  CONSTRUCAO: "Construção",
  EVENTO:     "Evento",
  OUTRO:      "Outro",
};

export type FinPaymentMethod = {
  id:          string;
  ministry_id: string;
  nome:        string;
  is_active:   boolean;
  created_at:  string;
};

export type FinCostCenter = {
  id:          string;
  ministry_id: string;
  nome:        string;
  descricao:   string | null;
  is_active:   boolean;
  created_at:  string;
};

export type FinTitheJustification = {
  id:          string;
  ministry_id: string;
  nome:        string;
  is_active:   boolean;
  created_at:  string;
};

export type FinDocumentType = {
  id:          string;
  ministry_id: string;
  nome:        string;
  is_active:   boolean;
  created_at:  string;
};

export type FinCategory = {
  id:              string;
  ministry_id:     string;
  parent_id:       string | null;
  codigo:          string;
  nome:            string;
  tipo:            FinCategoryTipo;
  fundo:           FinCategoryFundo;
  codigo_contabil: string | null;
  is_active:       boolean;
  ordem:           number;
  created_at:      string;
};

export type FinCategoryWithChildren = FinCategory & {
  children: FinCategory[];
};

export type FinAccount = {
  id:            string;
  ministry_id:   string;
  unit_id:       string | null;
  nome:          string;
  tipo:          FinAccountTipo;
  banco:         string | null;
  agencia:       string | null;
  conta:         string | null;
  digito:        string | null;
  chave_pix:     string | null;
  saldo_inicial: number;
  is_active:     boolean;
  deleted_at:    string | null;
  created_at:    string;
  updated_at:    string;
};

export type FinAccountWithSaldo = FinAccount & {
  saldo_atual:  number;
  unit_nome:    string | null;
};

export type FinPeriod = {
  id:              string;
  ministry_id:     string;
  unit_id:         string | null;
  mes:             number;
  ano:             number;
  status:          FinPeriodStatus;
  saldo_inicial:   number;
  saldo_final:     number | null;
  data_fechamento: string | null;
  fechado_por:     string | null;
  observacoes:     string | null;
  created_at:      string;
};

export type FinTransaction = {
  id:                      string;
  ministry_id:             string;
  unit_id:                 string | null;
  account_id:              string;
  category_id:             string;
  party_id:                string | null;
  payment_method_id:       string | null;
  cost_center_id:          string | null;
  document_type_id:        string | null;
  justificativa_dizimo_id: string | null;
  tipo:                    FinTxTipo;
  valor:                   number;
  data:                    string;
  numero_documento:        string | null;
  descricao:               string | null;
  comprovante_url:         string | null;
  estorno_de_id:           string | null;
  status:                  FinTxStatus;
  criado_por:              string | null;
  aprovado_por:            string | null;
  created_at:              string;
  updated_at:              string;
  deleted_at:              string | null;
};

export type FinTransactionListItem = FinTransaction & {
  account_nome:         string;
  category_nome:        string;
  category_codigo:      string;
  party_nome:           string | null;
  payment_method_nome:  string | null;
  cost_center_nome:     string | null;
};

export type FinTransfer = {
  id:              string;
  ministry_id:     string;
  unit_id:         string | null;
  account_from_id: string;
  account_to_id:   string;
  valor:           number;
  data:            string;
  descricao:       string | null;
  criado_por:      string | null;
  status:          "PENDENTE" | "APROVADO";
  tx_saida_id:     string | null;
  tx_entrada_id:   string | null;
  created_at:      string;
  deleted_at:      string | null;
};

export type FinTransferListItem = FinTransfer & {
  account_from_nome: string;
  account_to_nome:   string;
};

// ── PLANO DE CONTAS PROFISSIONAL (ITG 2002 / CFC) ────────────

export type ChartAccountType   = "asset" | "liability" | "equity" | "revenue" | "expense" | "compensation";
export type ChartAccountNature = "debit" | "credit";

export const CHART_ACCOUNT_TYPE_LABELS: Record<ChartAccountType, string> = {
  asset:         "Ativo",
  liability:     "Passivo",
  equity:        "Patrimônio Líquido",
  revenue:       "Receitas",
  expense:       "Despesas",
  compensation:  "Compensação",
};

export const CHART_ACCOUNT_TYPE_COLORS: Record<ChartAccountType, { bg: string; color: string }> = {
  asset:        { bg: "#dbeafe", color: "#1d4ed8" },
  liability:    { bg: "#fee2e2", color: "#991b1b" },
  equity:       { bg: "#d1fae5", color: "#065f46" },
  revenue:      { bg: "#dcfce7", color: "#166534" },
  expense:      { bg: "#fef2f2", color: "#dc2626" },
  compensation: { bg: "#f3e8ff", color: "#7c3aed" },
};

export const CHART_ACCOUNT_NATURE_LABELS: Record<ChartAccountNature, string> = {
  debit:  "Devedor",
  credit: "Credor",
};

export type ChartOfAccount = {
  id:            string;
  ministry_id:   string;
  parent_id:     string | null;
  code:          string;
  name:          string;
  type:          ChartAccountType;
  nature:        ChartAccountNature;
  account_level: number;
  is_analytical: boolean;
  is_active:     boolean;
  ordem:         number;
  created_at:    string;
  updated_at:    string;
};

export type ChartOfAccountWithChildren = ChartOfAccount & {
  children: ChartOfAccountWithChildren[];
};

// ── FASE 7B — PROJETOS, PARCELAMENTOS, PROGRAMAÇÕES, REPASSES ──

export type FinProjectTipo   = "CONSTRUCAO" | "REFORMA" | "EVANGELISMO" | "MISSOES" | "EVENTO" | "SOCIAL" | "AQUISICAO" | "OUTRO";
export type FinProjectStatus = "PLANEJAMENTO" | "ATIVO" | "CONCLUIDO" | "CANCELADO";

export const FIN_PROJECT_TIPO_LABELS: Record<FinProjectTipo, string> = {
  CONSTRUCAO:  "Construção",
  REFORMA:     "Reforma",
  EVANGELISMO: "Evangelismo",
  MISSOES:     "Missões",
  EVENTO:      "Evento",
  SOCIAL:      "Social",
  AQUISICAO:   "Aquisição",
  OUTRO:       "Outro",
};

export const FIN_PROJECT_STATUS_COLORS: Record<FinProjectStatus, { bg: string; color: string }> = {
  PLANEJAMENTO: { bg: "#eff6ff", color: "#1d4ed8" },
  ATIVO:        { bg: "#f0fdf4", color: "#166534" },
  CONCLUIDO:    { bg: "#f3e8ff", color: "#7c3aed" },
  CANCELADO:    { bg: "#fef2f2", color: "#991b1b" },
};

export type FinProject = {
  id:                   string;
  ministry_id:          string;
  unit_id:              string | null;
  nome:                 string;
  descricao:            string | null;
  tipo:                 FinProjectTipo;
  status:               FinProjectStatus;
  orcamento_total:      number | null;
  data_inicio:          string | null;
  data_fim_prevista:    string | null;
  data_conclusao:       string | null;
  responsavel_party_id: string | null;
  is_active:            boolean;
  created_at:           string;
  updated_at:           string;
};

export type FinProjectWithStats = FinProject & {
  responsavel_nome: string | null;
  unit_nome:        string | null;
  total_receitas:   number;
  total_despesas:   number;
  saldo:            number;
};

// ── Parcelamentos ────────────────────────────────────────────────

export type FinInstallmentPeriodicity =
  | "SEMANAL" | "QUINZENAL" | "MENSAL" | "BIMESTRAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL";

export const FIN_PERIODICITY_LABELS: Record<FinInstallmentPeriodicity, string> = {
  SEMANAL:     "Semanal",
  QUINZENAL:   "Quinzenal",
  MENSAL:      "Mensal",
  BIMESTRAL:   "Bimestral",
  TRIMESTRAL:  "Trimestral",
  SEMESTRAL:   "Semestral",
  ANUAL:       "Anual",
};

export type FinInstallmentPlanStatus = "ATIVO" | "QUITADO" | "CANCELADO";

export type FinInstallmentPlan = {
  id:                   string;
  ministry_id:          string;
  unit_id:              string | null;
  descricao:            string;
  tipo:                 FinTxTipo;
  account_id:           string;
  category_id:          string;
  party_id:             string | null;
  project_id:           string | null;
  valor_total:          number;
  num_parcelas:         number;
  valor_parcela:        number;
  periodicidade:        FinInstallmentPeriodicity;
  data_primeira_parcela: string;
  status:               FinInstallmentPlanStatus;
  observacoes:          string | null;
  criado_por:           string | null;
  created_at:           string;
  updated_at:           string;
};

export type FinInstallmentPlanListItem = FinInstallmentPlan & {
  account_nome:   string;
  category_nome:  string;
  party_nome:     string | null;
  pagas:          number;
  atrasadas:      number;
  valor_pago:     number;
};

export type FinInstallmentStatus = "PENDENTE" | "PAGO" | "ATRASADO" | "CANCELADO";

export const FIN_INSTALLMENT_STATUS_COLORS: Record<FinInstallmentStatus, { bg: string; color: string }> = {
  PENDENTE:  { bg: "#fffbeb", color: "#92400e" },
  PAGO:      { bg: "#f0fdf4", color: "#166534" },
  ATRASADO:  { bg: "#fef2f2", color: "#991b1b" },
  CANCELADO: { bg: "#f8fafc", color: "#475569" },
};

export type FinInstallment = {
  id:              string;
  ministry_id:     string;
  plan_id:         string;
  numero:          number;
  data_vencimento: string;
  valor:           number;
  status:          FinInstallmentStatus;
  transaction_id:  string | null;
  data_pagamento:  string | null;
  created_at:      string;
};

// ── Programações Recorrentes ──────────────────────────────────────

export type FinRecurringPeriodicity =
  | "DIARIO" | "SEMANAL" | "QUINZENAL" | "MENSAL" | "BIMESTRAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL";

export const FIN_RECURRING_PERIODICITY_LABELS: Record<FinRecurringPeriodicity, string> = {
  DIARIO:      "Diário",
  SEMANAL:     "Semanal",
  QUINZENAL:   "Quinzenal",
  MENSAL:      "Mensal",
  BIMESTRAL:   "Bimestral",
  TRIMESTRAL:  "Trimestral",
  SEMESTRAL:   "Semestral",
  ANUAL:       "Anual",
};

export type FinRecurringStatus = "ATIVO" | "PAUSADO" | "ENCERRADO";

export const FIN_RECURRING_STATUS_COLORS: Record<FinRecurringStatus, { bg: string; color: string }> = {
  ATIVO:     { bg: "#f0fdf4", color: "#166534" },
  PAUSADO:   { bg: "#fffbeb", color: "#92400e" },
  ENCERRADO: { bg: "#f8fafc", color: "#475569" },
};

export type FinRecurring = {
  id:               string;
  ministry_id:      string;
  unit_id:          string | null;
  descricao:        string;
  tipo:             FinTxTipo;
  account_id:       string;
  category_id:      string;
  party_id:         string | null;
  project_id:       string | null;
  valor:            number;
  periodicidade:    FinRecurringPeriodicity;
  dia_vencimento:   number | null;
  data_inicio:      string;
  data_fim:         string | null;
  status:           FinRecurringStatus;
  ultima_geracao:   string | null;
  proxima_geracao:  string | null;
  total_gerado:     number;
  criado_por:       string | null;
  created_at:       string;
  updated_at:       string;
};

export type FinRecurringListItem = FinRecurring & {
  account_nome:  string;
  category_nome: string;
  party_nome:    string | null;
};

// ── Repasses entre Unidades ───────────────────────────────────────

export type FinRepasseStatus = "PENDENTE" | "EXECUTADO" | "CANCELADO";

export const FIN_REPASSE_STATUS_COLORS: Record<FinRepasseStatus, { bg: string; color: string }> = {
  PENDENTE:  { bg: "#fffbeb", color: "#92400e" },
  EXECUTADO: { bg: "#f0fdf4", color: "#166534" },
  CANCELADO: { bg: "#fef2f2", color: "#991b1b" },
};

export type FinUnitRepasse = {
  id:              string;
  ministry_id:     string;
  unit_from_id:    string;
  unit_to_id:      string;
  account_from_id: string | null;
  account_to_id:   string | null;
  descricao:       string;
  valor:           number;
  percentual:      number | null;
  data:            string;
  competencia_mes: number | null;
  competencia_ano: number | null;
  status:          FinRepasseStatus;
  transaction_id:  string | null;
  criado_por:      string | null;
  aprovado_por:    string | null;
  created_at:      string;
};

export type FinUnitRepasseListItem = FinUnitRepasse & {
  unit_from_nome: string;
  unit_to_nome:   string;
  account_from_nome: string | null;
  account_to_nome:   string | null;
};

export type FinRepasseRule = {
  id:            string;
  ministry_id:   string;
  unit_from_id:  string;
  unit_to_id:    string;
  descricao:     string;
  percentual:    number;
  base_calculo:  "DIZIMO" | "OFERTA" | "TOTAL_RECEITAS" | "VALOR_FIXO";
  valor_fixo:    number | null;
  periodicidade: "MENSAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL";
  is_active:     boolean;
  created_at:    string;
};

// ── FASE 8 — MÓDULO PATRIMÔNIO ────────────────────────────────────

export type PatrimonyCategoria =
  | "IMOVEL" | "MOVEL" | "EQUIPAMENTO" | "VEICULO" | "INSTRUMENTO_MUSICAL"
  | "INFORMATICA" | "OUTRO";

export const PATRIMONY_CATEGORIA_LABELS: Record<PatrimonyCategoria, string> = {
  IMOVEL:              "Imóvel",
  MOVEL:               "Móvel",
  EQUIPAMENTO:         "Equipamento",
  VEICULO:             "Veículo",
  INSTRUMENTO_MUSICAL: "Instrumento Musical",
  INFORMATICA:         "Informática",
  OUTRO:               "Outro",
};

export const PATRIMONY_CATEGORIA_ICONS: Record<PatrimonyCategoria, string> = {
  IMOVEL:              "🏠",
  MOVEL:               "🪑",
  EQUIPAMENTO:         "⚙️",
  VEICULO:             "🚗",
  INSTRUMENTO_MUSICAL: "🎸",
  INFORMATICA:         "💻",
  OUTRO:               "📦",
};

export type PatrimonyStatus = "ATIVO" | "BAIXADO" | "EM_MANUTENCAO" | "TRANSFERIDO";

export const PATRIMONY_STATUS_COLORS: Record<PatrimonyStatus, { bg: string; color: string }> = {
  ATIVO:          { bg: "#f0fdf4", color: "#166534" },
  BAIXADO:        { bg: "#fef2f2", color: "#991b1b" },
  EM_MANUTENCAO:  { bg: "#fffbeb", color: "#92400e" },
  TRANSFERIDO:    { bg: "#eff6ff", color: "#1d4ed8" },
};

export type PatrimonyItem = {
  id:                    string;
  ministry_id:           string;
  unit_id:               string | null;
  numero_tombamento:     string;
  nome:                  string;
  descricao:             string | null;
  categoria:             PatrimonyCategoria;
  valor_aquisicao:       number;
  data_aquisicao:        string;
  fornecedor:            string | null;
  nota_fiscal:           string | null;
  vida_util_anos:        number | null;
  taxa_depreciacao_anual: number | null;
  valor_residual:        number | null;
  localizacao_unit_id:   string | null;
  responsavel_party_id:  string | null;
  status:                PatrimonyStatus;
  chart_account_id:      string | null;
  foto_url:              string | null;
  deleted_at:            string | null;
  created_at:            string;
  updated_at:            string;
};

export type PatrimonyItemListItem = PatrimonyItem & {
  unit_nome:           string | null;
  localizacao_nome:    string | null;
  responsavel_nome:    string | null;
  valor_contabil_atual: number;
};

export type PatrimonyMovimentoTipo =
  | "AQUISICAO" | "TRANSFERENCIA" | "BAIXA" | "MANUTENCAO" | "RETORNO_MANUTENCAO" | "REAVALIACAO";

export const PATRIMONY_MOVIMENTO_LABELS: Record<PatrimonyMovimentoTipo, string> = {
  AQUISICAO:         "Aquisição",
  TRANSFERENCIA:     "Transferência",
  BAIXA:             "Baixa",
  MANUTENCAO:        "Entrada em Manutenção",
  RETORNO_MANUTENCAO: "Retorno da Manutenção",
  REAVALIACAO:       "Reavaliação",
};

export type PatrimonyMovement = {
  id:                  string;
  ministry_id:         string;
  item_id:             string;
  tipo:                PatrimonyMovimentoTipo;
  data:                string;
  unit_from_id:        string | null;
  unit_to_id:          string | null;
  descricao:           string;
  responsavel_party_id: string | null;
  valor:               number | null;
  created_at:          string;
};

export type PatrimonyMovementListItem = PatrimonyMovement & {
  unit_from_nome:    string | null;
  unit_to_nome:      string | null;
  responsavel_nome:  string | null;
};

export type PatrimonyDepreciation = {
  id:               string;
  ministry_id:      string;
  item_id:          string;
  ano:              number;
  mes:              number;
  valor_depreciacao: number;
  valor_contabil:   number;
  transaction_id:   string | null;
  created_at:       string;
};

// ── Tipo de Aquisição ────────────────────────────────────────────

export type PatrimonyAquisicaoTipo =
  | "COMPRA"
  | "DOACAO"
  | "BENEFICIAMENTO"
  | "PERMUTA"
  | "PRODUCAO_PROPRIA"
  | "TRANSFERENCIA_INTERNA";

export const PATRIMONY_AQUISICAO_LABELS: Record<PatrimonyAquisicaoTipo, string> = {
  COMPRA:               "Compra",
  DOACAO:               "Doação",
  BENEFICIAMENTO:       "Beneficiamento / Cessão",
  PERMUTA:              "Permuta",
  PRODUCAO_PROPRIA:     "Produção Própria",
  TRANSFERENCIA_INTERNA:"Transferência Interna",
};

export const PATRIMONY_AQUISICAO_INFO: Record<PatrimonyAquisicaoTipo, string> = {
  COMPRA:               "Aquisição onerosa. Base de cálculo = nota fiscal.",
  DOACAO:               "NBC TG 04 Art.16: base = valor justo na data da doação (laudo necessário).",
  BENEFICIAMENTO:       "Cessão de uso com benfeitorias absorvidas. Depreciar pelo menor prazo: vida útil ou contrato.",
  PERMUTA:              "Troca por bem/serviço. Base = valor justo do bem dado ou recebido, o mais confiável.",
  PRODUCAO_PROPRIA:     "Bem construído/fabricado pela entidade. Base = custo de produção (materiais + mão de obra).",
  TRANSFERENCIA_INTERNA:"Recebido de outra unidade. Manter valor contábil líquido (não recalcular depreciação).",
};

// ── Regra de Depreciação ─────────────────────────────────────────

export type DepreciacaoMetodo = "LINEAR" | "SOMA_DIGITOS" | "SALDO_DECRESCENTE";

export const DEPRECIACAO_METODO_LABELS: Record<DepreciacaoMetodo, string> = {
  LINEAR:            "Linear (cotas iguais)",
  SOMA_DIGITOS:      "Soma dos Dígitos (acelerada)",
  SALDO_DECRESCENTE: "Saldo Decrescente",
};

export type PatrimonyDepreciationRule = {
  id:               string;
  ministry_id:      string | null;    // null = regra global
  categoria:        PatrimonyCategoria;
  tipo_aquisicao:   PatrimonyAquisicaoTipo;
  taxa_anual:       number;
  vida_util_anos:   number | null;
  metodo:           DepreciacaoMetodo;
  norma_referencia: string;
  notas:            string | null;
  vigente_desde:    string;
  vigente_ate:      string | null;
  is_active:        boolean;
  created_at:       string;
  updated_at:       string;
};

// Retorno da RPC buscar_taxa_depreciacao
export type TaxaDepreciacaoSugerida = {
  taxa_anual:       number;
  vida_util_anos:   number | null;
  metodo:           DepreciacaoMetodo;
  norma_referencia: string;
};

// ============================================================
// FASE 9 — EVENTOS
// ============================================================

export type EventTipo =
  | "CULTO"
  | "CONFERENCIA"
  | "RETIRO"
  | "CONGRESSO"
  | "ENCONTRO"
  | "SEMINARIO"
  | "SHOW_GOSPEL"
  | "OUTRO";

export const EVENT_TIPO_LABELS: Record<EventTipo, string> = {
  CULTO:        "Culto",
  CONFERENCIA:  "Conferência",
  RETIRO:       "Retiro",
  CONGRESSO:    "Congresso",
  ENCONTRO:     "Encontro",
  SEMINARIO:    "Seminário",
  SHOW_GOSPEL:  "Show Gospel",
  OUTRO:        "Outro",
};

export const EVENT_TIPO_ICON: Record<EventTipo, string> = {
  CULTO:        "🙏",
  CONFERENCIA:  "🎤",
  RETIRO:       "⛺",
  CONGRESSO:    "🏛️",
  ENCONTRO:     "🤝",
  SEMINARIO:    "📚",
  SHOW_GOSPEL:  "🎵",
  OUTRO:        "📅",
};

export type EventStatus = "RASCUNHO" | "PUBLICADO" | "ENCERRADO" | "CANCELADO";

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  RASCUNHO:   "Rascunho",
  PUBLICADO:  "Publicado",
  ENCERRADO:  "Encerrado",
  CANCELADO:  "Cancelado",
};

export const EVENT_STATUS_COLOR: Record<EventStatus, string> = {
  RASCUNHO:   "#64748b",
  PUBLICADO:  "#16a34a",
  ENCERRADO:  "#2563eb",
  CANCELADO:  "#dc2626",
};

export type EventItem = {
  id:                          string;
  ministry_id:                 string;
  unit_id:                     string | null;
  titulo:                      string;
  descricao:                   string | null;
  tipo:                        EventTipo;
  status:                      EventStatus;
  data_inicio:                 string;
  data_fim:                    string | null;
  local_nome:                  string | null;
  local_endereco:              string | null;
  capacidade:                  number | null;
  inscricao_aberta:            boolean;
  inscricao_requer_aprovacao:  boolean;
  capa_url:                    string | null;
  responsavel_party_id:        string | null;
  created_by:                  string | null;
  created_at:                  string;
  updated_at:                  string;
  // joins opcionais
  inscritos_count?:            number;
  checkins_count?:             number;
  responsavel_nome?:           string | null;
  unit_nome?:                  string | null;
};

export type EventRegistrationStatus = "PENDENTE" | "CONFIRMADO" | "CANCELADO" | "LISTA_ESPERA";

export const EVENT_REG_STATUS_LABELS: Record<EventRegistrationStatus, string> = {
  PENDENTE:      "Pendente",
  CONFIRMADO:    "Confirmado",
  CANCELADO:     "Cancelado",
  LISTA_ESPERA:  "Lista de Espera",
};

export const EVENT_REG_STATUS_COLOR: Record<EventRegistrationStatus, string> = {
  PENDENTE:      "#d97706",
  CONFIRMADO:    "#16a34a",
  CANCELADO:     "#dc2626",
  LISTA_ESPERA:  "#2563eb",
};

export type EventRegistration = {
  id:               string;
  ministry_id:      string;
  event_id:         string;
  party_id:         string | null;
  nome_externo:     string | null;
  telefone_externo: string | null;
  status:           EventRegistrationStatus;
  inscrito_por:     string | null;
  observacao:       string | null;
  created_at:       string;
  updated_at:       string;
  // joins
  party_nome?:      string | null;
  party_foto?:      string | null;
};

export type EventCheckin = {
  id:              string;
  ministry_id:     string;
  event_id:        string;
  registration_id: string | null;
  party_id:        string | null;
  nome_avulso:     string | null;
  checkin_at:      string;
  checkin_by:      string | null;
  // joins
  party_nome?:     string | null;
};

// ============================================================
// FASE 10 — OCORRÊNCIAS
// ============================================================

export type OccurrenceTipo =
  | "DISCIPLINAR"
  | "PASTORAL"
  | "FAMILIAR"
  | "FINANCEIRO"
  | "SAUDE"
  | "JURIDICO"
  | "OUTRO";

export const OCCURRENCE_TIPO_LABELS: Record<OccurrenceTipo, string> = {
  DISCIPLINAR: "Disciplinar",
  PASTORAL:    "Pastoral",
  FAMILIAR:    "Familiar",
  FINANCEIRO:  "Financeiro",
  SAUDE:       "Saúde",
  JURIDICO:    "Jurídico",
  OUTRO:       "Outro",
};

export const OCCURRENCE_TIPO_ICON: Record<OccurrenceTipo, string> = {
  DISCIPLINAR: "⚖️",
  PASTORAL:    "🙏",
  FAMILIAR:    "🏠",
  FINANCEIRO:  "💰",
  SAUDE:       "🏥",
  JURIDICO:    "📜",
  OUTRO:       "📋",
};

export const OCCURRENCE_TIPO_COLOR: Record<OccurrenceTipo, string> = {
  DISCIPLINAR: "#dc2626",
  PASTORAL:    "#2563eb",
  FAMILIAR:    "#d97706",
  FINANCEIRO:  "#7c3aed",
  SAUDE:       "#0891b2",
  JURIDICO:    "#64748b",
  OUTRO:       "#64748b",
};

export type OccurrenceStatus = "ABERTA" | "EM_ACOMPANHAMENTO" | "RESOLVIDA" | "ARQUIVADA";

export const OCCURRENCE_STATUS_LABELS: Record<OccurrenceStatus, string> = {
  ABERTA:             "Aberta",
  EM_ACOMPANHAMENTO:  "Em Acompanhamento",
  RESOLVIDA:          "Resolvida",
  ARQUIVADA:          "Arquivada",
};

export const OCCURRENCE_STATUS_COLOR: Record<OccurrenceStatus, string> = {
  ABERTA:             "#dc2626",
  EM_ACOMPANHAMENTO:  "#d97706",
  RESOLVIDA:          "#16a34a",
  ARQUIVADA:          "#64748b",
};

export type OccurrenceNivelSigilo = "NORMAL" | "RESTRITO";

export type FollowupTipoContato = "VISITA" | "LIGACAO" | "REUNIAO" | "MENSAGEM" | "EMAIL" | "OUTRO";

export const FOLLOWUP_CONTATO_LABELS: Record<FollowupTipoContato, string> = {
  VISITA:   "Visita",
  LIGACAO:  "Ligação",
  REUNIAO:  "Reunião",
  MENSAGEM: "Mensagem",
  EMAIL:    "E-mail",
  OUTRO:    "Outro",
};

export type Occurrence = {
  id:                   string;
  ministry_id:          string;
  unit_id:              string | null;
  party_id:             string | null;
  tipo:                 OccurrenceTipo;
  titulo:               string;
  descricao:            string | null;
  data_ocorrencia:      string;
  status:               OccurrenceStatus;
  nivel_sigilo:         OccurrenceNivelSigilo;
  responsavel_party_id: string | null;
  resolucao:            string | null;
  created_by:           string | null;
  created_at:           string;
  updated_at:           string;
  // joins
  party_nome?:          string | null;
  party_foto?:          string | null;
  responsavel_nome?:    string | null;
  unit_nome?:           string | null;
  followups_count?:     number;
};

export type OccurrenceFollowup = {
  id:            string;
  ministry_id:   string;
  occurrence_id: string;
  data:          string;
  tipo_contato:  FollowupTipoContato;
  descricao:     string;
  proxima_acao:  string | null;
  created_by:    string | null;
  created_at:    string;
};
