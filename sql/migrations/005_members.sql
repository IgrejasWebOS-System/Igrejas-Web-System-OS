-- ============================================================
-- Migration 005 -- Modulo Membros (NUCLEO)
-- Projeto: IgrejasWeb System OS
-- Ordem de execucao: 5 de N
-- Decisoes arquiteturais registradas no ROADMAP.html Fase 2
--
-- O QUE ESTA MIGRATION FAZ:
--   1. Atualiza CHECK de unit_type para incluir SUB_CONGREGACAO
--   2. Cria 8 tabelas de lookup (controladas por ministerio)
--   3. Cria party_members   — dados eclesiasticos ricos por membro
--   4. Cria party_addresses — endereco estruturado reutilizavel
--   5. Cria party_funcoes   — funcoes departamentais com escopo geografico
--   6. Cria party_dependents — filhos/dependentes vinculados a membros
--   7. Cria member_history  — audit trail imutavel de situacao eclesial
--   8. Cria member_transfers — historico de transferencias
--   9. Habilita RLS em todas as novas tabelas
-- ============================================================


-- ============================================================
-- 1. ATUALIZAR ENUM DE UNIT_TYPE
-- Adiciona SUB_CONGREGACAO ao CHECK constraint.
-- SUB_CONGREGACAO: grupo consolidado, local fixo, lideranca
--   definida. Evolucao: PONTO_PREGACAO -> SUB_CONGREGACAO -> IGREJA
-- ============================================================
ALTER TABLE public.units
  DROP CONSTRAINT IF EXISTS units_unit_type_check;

ALTER TABLE public.units
  ADD CONSTRAINT units_unit_type_check CHECK (
    unit_type IN (
      'CAMPO',
      'SEDE',
      'SETOR',
      'IGREJA',
      'SUB_CONGREGACAO',   -- Novo: grupo consolidado, filho de IGREJA
      'PONTO_PREGACAO',    -- Ja existia: reuniao informal, filho de IGREJA ou SUB_CONGREGACAO
      'CELULA'             -- Filho de IGREJA, SUB_CONGREGACAO ou PONTO_PREGACAO
    )
  );

COMMENT ON COLUMN public.units.unit_type IS
  'Tipos de unidade na hierarquia eclesial. '
  'Evolucao: PONTO_PREGACAO -> SUB_CONGREGACAO -> IGREJA (troca apenas o unit_type). '
  'CELULA pode ser filha de IGREJA, SUB_CONGREGACAO ou PONTO_PREGACAO.';


-- ============================================================
-- 2. TABELAS DE LOOKUP
-- Evitam texto livre e inconsistencias (ex: "mecanico" vs "Mecânico").
-- Cada ministerio pode customizar suas listas.
-- Todas pre-populadas com defaults na propria migration.
-- ============================================================

-- 2.1 Cargos eclesiasticos — O que o membro E (um por vez)
CREATE TABLE IF NOT EXISTS public.member_cargos (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id  uuid        NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  nome         text        NOT NULL,
  ordem        smallint    NOT NULL DEFAULT 0,
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ministry_id, nome)
);
COMMENT ON TABLE public.member_cargos IS
  'Cargo eclesiastico do membro (MEMBRO, DIACONO, PRESBITERO, PASTOR, BISPO). '
  'Um membro tem apenas um cargo por vez. Separado de funcoes (o que faz).';

-- 2.2 Departamentos — areas de atuacao na igreja
CREATE TABLE IF NOT EXISTS public.departments (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id  uuid        NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  nome         text        NOT NULL,
  sigla        text,
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ministry_id, nome)
);
COMMENT ON TABLE public.departments IS
  'Departamentos da igreja: Mocidade, Coral, Dorcas, Louvor, EBD, etc. '
  'Usado em party_funcoes para definir em qual area o membro atua.';

-- 2.3 Tipos de funcao — O que o membro FAZ em um departamento
CREATE TABLE IF NOT EXISTS public.member_funcoes_lookup (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id  uuid        NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  nome         text        NOT NULL,
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ministry_id, nome)
);
COMMENT ON TABLE public.member_funcoes_lookup IS
  'Tipos de funcao exercida em um departamento: Lider, Sub-lider, Tesoureiro, '
  'Secretario, Professor, Musico, etc. Um membro pode ter multiplas funcoes simultaneas.';

-- 2.4 Profissoes
CREATE TABLE IF NOT EXISTS public.member_professions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id  uuid        NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  nome         text        NOT NULL,
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ministry_id, nome)
);
COMMENT ON TABLE public.member_professions IS
  'Lista controlada de profissoes. Evita "mecanico", "mecanico " e "Mecanico" como tres entradas.';

-- 2.5 Escolaridade
CREATE TABLE IF NOT EXISTS public.member_schooling (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id  uuid        NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  nome         text        NOT NULL,
  ordem        smallint    NOT NULL DEFAULT 0,
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ministry_id, nome)
);

-- 2.6 Estado civil
CREATE TABLE IF NOT EXISTS public.member_civil_status (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id  uuid        NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  nome         text        NOT NULL,
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ministry_id, nome)
);

-- 2.7 Genero
CREATE TABLE IF NOT EXISTS public.member_genders (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id  uuid        NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  nome         text        NOT NULL,
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ministry_id, nome)
);

-- 2.8 Situacao financeira (contribuicao)
CREATE TABLE IF NOT EXISTS public.member_financial_status (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id  uuid        NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  nome         text        NOT NULL,
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ministry_id, nome)
);

-- Indices para lookup tables
CREATE INDEX IF NOT EXISTS member_cargos_ministry_idx        ON public.member_cargos (ministry_id);
CREATE INDEX IF NOT EXISTS departments_ministry_idx           ON public.departments (ministry_id);
CREATE INDEX IF NOT EXISTS member_funcoes_lookup_ministry_idx ON public.member_funcoes_lookup (ministry_id);
CREATE INDEX IF NOT EXISTS member_professions_ministry_idx   ON public.member_professions (ministry_id);
CREATE INDEX IF NOT EXISTS member_schooling_ministry_idx     ON public.member_schooling (ministry_id);
CREATE INDEX IF NOT EXISTS member_civil_status_ministry_idx  ON public.member_civil_status (ministry_id);
CREATE INDEX IF NOT EXISTS member_genders_ministry_idx       ON public.member_genders (ministry_id);
CREATE INDEX IF NOT EXISTS member_financial_status_ministry_idx ON public.member_financial_status (ministry_id);


-- ============================================================
-- 3. PARTY_MEMBERS
-- Extensao de parties com dados eclesiasticos ricos.
-- Uma linha por membro por ministerio.
-- Modelo matricula 3 campos (DEC #1 do ROADMAP):
--   matricula         = numero definitivo (gerado ao ativar)
--   codigo_provisorio = codigo temporario antes da ativacao
--   matricula_legado  = importado do sistema antigo
-- Cargo vs Funcao (DEC #2 do ROADMAP):
--   cargo_id em party_members = O que o membro E (um por vez)
--   party_funcoes separado    = O que o membro FAZ (multiplos)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.party_members (
  -- Chave e vinculo
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id                  uuid        NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
  ministry_id               uuid        NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  unit_id                   uuid        REFERENCES public.units(id) ON DELETE SET NULL,

  -- Subtipo de party (DEC #5)
  party_subtype             text        NOT NULL DEFAULT 'MEMBRO_PROVISORIO'
    CHECK (party_subtype IN ('MEMBRO_ATIVO', 'MEMBRO_PROVISORIO', 'DEPENDENTE', 'VISITANTE')),

  -- Modelo matricula 3 campos (DEC #1)
  matricula                 varchar(20) UNIQUE,            -- definitiva, gerada ao ativar
  codigo_provisorio         varchar(20) UNIQUE,            -- temporaria, ate ativacao
  matricula_legado          varchar(50),                   -- importada do sistema antigo

  -- Cargo eclesiastico (DEC #2 - O que o membro E)
  cargo_id                  uuid        REFERENCES public.member_cargos(id) ON DELETE SET NULL,

  -- Situacao eclesial
  situacao                  text        NOT NULL DEFAULT 'EM_OBSERVACAO'
    CHECK (situacao IN ('ATIVO', 'INATIVO', 'EM_OBSERVACAO', 'SUSPENSO', 'DESLIGADO')),

  -- Datas eclesiasticas
  data_ingresso             date,
  data_batismo_aguas        date,
  data_batismo_espirito     date,
  data_desligamento         date,

  -- Dados pessoais (complementares aos da tabela parties)
  civil_status_id           uuid        REFERENCES public.member_civil_status(id) ON DELETE SET NULL,
  gender_id                 uuid        REFERENCES public.member_genders(id) ON DELETE SET NULL,
  schooling_id              uuid        REFERENCES public.member_schooling(id) ON DELETE SET NULL,
  profession_id             uuid        REFERENCES public.member_professions(id) ON DELETE SET NULL,
  financial_status_id       uuid        REFERENCES public.member_financial_status(id) ON DELETE SET NULL,

  -- Filiacao eclesial
  conjuge_party_id          uuid        REFERENCES public.parties(id) ON DELETE SET NULL,
  igreja_origem             text,                          -- nome da igreja anterior (texto livre)

  -- Contato adicional
  whatsapp                  text,
  celular                   text,

  -- Outros
  foto_url                  text,
  observacoes               text,

  -- Controle
  is_active                 boolean     NOT NULL DEFAULT true,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),

  UNIQUE (party_id, ministry_id)
);

COMMENT ON TABLE public.party_members IS
  'Extensao de parties com dados eclesiasticos ricos. '
  'Modelo matricula 3 campos: matricula (definitiva), codigo_provisorio (temp), matricula_legado (legado). '
  'Cargo (o que E) fica aqui. Funcoes (o que FAZ) ficam em party_funcoes.';

COMMENT ON COLUMN public.party_members.matricula IS
  'Numero definitivo de matricula. Gerado automaticamente quando situacao = ATIVO. '
  'Formato sugerido: ANO + SEQUENCIA (ex: 2024001). Referencia principal do membro no sistema.';

COMMENT ON COLUMN public.party_members.codigo_provisorio IS
  'Codigo temporario gerado no cadastro inicial. '
  'Substituido pela matricula definitiva ao ativar o membro.';

COMMENT ON COLUMN public.party_members.matricula_legado IS
  'Matricula do sistema antigo, preservada na importacao. '
  'Permite busca por codigo historico e continuidade de documentos fisicos.';

COMMENT ON COLUMN public.party_members.cargo_id IS
  'Cargo eclesiastico atual do membro (o que ele E). Um por vez. '
  'Exemplos: MEMBRO, OBREIRO, DIACONO, PRESBITERO, PASTOR, BISPO. '
  'Separado de party_funcoes (o que faz). Cargo NAO implica nivel de acesso ao sistema.';

CREATE INDEX IF NOT EXISTS party_members_party_id_idx    ON public.party_members (party_id);
CREATE INDEX IF NOT EXISTS party_members_ministry_id_idx ON public.party_members (ministry_id);
CREATE INDEX IF NOT EXISTS party_members_unit_id_idx     ON public.party_members (unit_id);
CREATE INDEX IF NOT EXISTS party_members_situacao_idx    ON public.party_members (situacao);
CREATE INDEX IF NOT EXISTS party_members_subtype_idx     ON public.party_members (party_subtype);
CREATE INDEX IF NOT EXISTS party_members_matricula_idx   ON public.party_members (matricula);
CREATE INDEX IF NOT EXISTS party_members_cod_prov_idx    ON public.party_members (codigo_provisorio);
CREATE INDEX IF NOT EXISTS party_members_legado_idx      ON public.party_members (matricula_legado);

CREATE TRIGGER party_members_updated_at
  BEFORE UPDATE ON public.party_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- 4. PARTY_ADDRESSES
-- Endereco estruturado, reutilizavel para qualquer Party.
-- Mais detalhado que os campos inline de parties.
-- Um membro pode ter endereco RESIDENCIAL e COMERCIAL.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.party_addresses (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id     uuid        NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
  ministry_id  uuid        NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  tipo         text        NOT NULL DEFAULT 'RESIDENCIAL'
    CHECK (tipo IN ('RESIDENCIAL', 'COMERCIAL')),
  cep          varchar(8),
  logradouro   text,
  numero       text,
  complemento  text,
  bairro       text,
  cidade       text,
  estado       varchar(2),
  pais         text        NOT NULL DEFAULT 'Brasil',
  is_principal boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.party_addresses IS
  'Enderecos estruturados de qualquer Party. '
  'Reutilizavel por membros, fornecedores, igrejas, etc.';

CREATE INDEX IF NOT EXISTS party_addresses_party_id_idx    ON public.party_addresses (party_id);
CREATE INDEX IF NOT EXISTS party_addresses_ministry_id_idx ON public.party_addresses (ministry_id);

CREATE TRIGGER party_addresses_updated_at
  BEFORE UPDATE ON public.party_addresses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- 5. PARTY_FUNCOES
-- Funcoes departamentais que o membro EXERCE (DEC #2 e #3 do ROADMAP).
-- Multiplas simultâneas. Separado do cargo (o que o membro E).
-- scope_type define o alcance geografico da funcao.
--
-- IMPORTANTE: Lideranca departamental NAO implica nivel de
-- acesso ao sistema (RBAC). Sao eixos completamente independentes.
-- Ser Lider Regional da Mocidade NAO concede acesso N1.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.party_funcoes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id        uuid        NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
  ministry_id     uuid        NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  department_id   uuid        NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  funcao_id       uuid        REFERENCES public.member_funcoes_lookup(id) ON DELETE SET NULL,

  -- Escopo geografico da funcao (DEC #3)
  scope_type      text        NOT NULL
    CHECK (scope_type IN (
      'CAMPO',            -- Lider regional (todo o campo)
      'SETOR',            -- Lider setorial (um setor especifico)
      'IGREJA',           -- Lider local (uma igreja)
      'SUB_CONGREGACAO',  -- Responsavel por sub-congregacao
      'PONTO_PREGACAO',   -- Responsavel por ponto de pregacao
      'CELULA'            -- Lider de celula
    )),

  -- Unidade especifica (NULL = escopo de todo o campo)
  unit_id         uuid        REFERENCES public.units(id) ON DELETE SET NULL,

  -- Controle temporal
  data_inicio     date,
  data_fim        date,
  is_ativo        boolean     NOT NULL DEFAULT true,

  observacoes     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- Um membro nao pode ter duas funcoes identicas ativas no mesmo departamento e escopo
  CONSTRAINT party_funcoes_unique_ativa
    UNIQUE NULLS NOT DISTINCT (party_id, department_id, scope_type, unit_id)
    DEFERRABLE INITIALLY DEFERRED
);

-- Nota: a constraint acima usa NULLS NOT DISTINCT para tratar unit_id NULL
-- (scope CAMPO) corretamente. Se NULLS NOT DISTINCT nao estiver disponivel
-- na versao do Postgres, usar partial unique index abaixo como alternativa:
-- CREATE UNIQUE INDEX party_funcoes_unique_ativa_idx
--   ON public.party_funcoes (party_id, department_id, scope_type, unit_id)
--   WHERE is_ativo = true AND unit_id IS NOT NULL;
-- CREATE UNIQUE INDEX party_funcoes_unique_ativa_null_idx
--   ON public.party_funcoes (party_id, department_id, scope_type)
--   WHERE is_ativo = true AND unit_id IS NULL;

COMMENT ON TABLE public.party_funcoes IS
  'Funcoes departamentais que o membro exerce (o que faz). '
  'Multiplas funcoes simultaneas em departamentos e escopos geograficos diferentes. '
  'NAO relacionado ao RBAC: Lider Regional da Mocidade nao tem acesso N1 ao sistema.';

COMMENT ON COLUMN public.party_funcoes.scope_type IS
  'Alcance geografico da funcao: '
  'CAMPO = todo o campo | SETOR = um setor | IGREJA = uma igreja | '
  'SUB_CONGREGACAO = uma sub-congregacao | PONTO_PREGACAO = um ponto | CELULA = uma celula';

CREATE INDEX IF NOT EXISTS party_funcoes_party_id_idx    ON public.party_funcoes (party_id);
CREATE INDEX IF NOT EXISTS party_funcoes_ministry_id_idx ON public.party_funcoes (ministry_id);
CREATE INDEX IF NOT EXISTS party_funcoes_dept_id_idx     ON public.party_funcoes (department_id);
CREATE INDEX IF NOT EXISTS party_funcoes_unit_id_idx     ON public.party_funcoes (unit_id);
CREATE INDEX IF NOT EXISTS party_funcoes_ativo_idx       ON public.party_funcoes (is_ativo);

CREATE TRIGGER party_funcoes_updated_at
  BEFORE UPDATE ON public.party_funcoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- 6. PARTY_DEPENDENTS
-- Filhos menores e dependentes vinculados a um membro responsavel.
-- data_apresentacao: dia em que a crianca foi apresentada a Igreja.
-- Um DEPENDENTE pode ter dois responsaveis (pai e mae membros).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.party_dependents (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id             uuid        NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,  -- a crianca
  responsible_party_id uuid        NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,  -- o membro responsavel
  ministry_id          uuid        NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  relationship         text        NOT NULL
    CHECK (relationship IN ('FILHO', 'TUTELADO')),
  data_apresentacao    date,  -- dia em que foi apresentado a Igreja (requisito pastoral)
  observacoes          text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (party_id, responsible_party_id, ministry_id)
);

COMMENT ON TABLE public.party_dependents IS
  'Filhos e dependentes vinculados a membros responsaveis. '
  'data_apresentacao registra o dia da apresentacao da crianca a Igreja. '
  'Um DEPENDENTE pode ter pai e mae como responsaveis (dois registros).';

CREATE INDEX IF NOT EXISTS party_dependents_party_id_idx      ON public.party_dependents (party_id);
CREATE INDEX IF NOT EXISTS party_dependents_responsible_idx   ON public.party_dependents (responsible_party_id);
CREATE INDEX IF NOT EXISTS party_dependents_ministry_id_idx   ON public.party_dependents (ministry_id);


-- ============================================================
-- 7. MEMBER_HISTORY
-- Audit trail IMUTAVEL de mudancas de situacao eclesial.
-- NUNCA atualizar ou deletar registros desta tabela.
-- INSERT apenas. Toda mudanca de situacao gera uma nova linha.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.member_history (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id    uuid        NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  party_id       uuid        NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
  situacao_anterior text     CHECK (situacao_anterior IN ('ATIVO','INATIVO','EM_OBSERVACAO','SUSPENSO','DESLIGADO') OR situacao_anterior IS NULL),
  situacao_nova  text        NOT NULL
    CHECK (situacao_nova IN ('ATIVO', 'INATIVO', 'EM_OBSERVACAO', 'SUSPENSO', 'DESLIGADO')),
  motivo         text,
  alterado_por   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em      timestamptz NOT NULL DEFAULT now()
  -- Sem updated_at: este registro e imutavel
);

COMMENT ON TABLE public.member_history IS
  'Audit trail imutavel de mudancas de situacao eclesial. '
  'INSERT apenas. Jamais UPDATE ou DELETE. '
  'situacao_anterior NULL indica o cadastro inicial do membro.';

-- Previne UPDATE e DELETE nesta tabela via trigger
CREATE OR REPLACE FUNCTION public.prevent_member_history_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'member_history e imutavel. INSERT apenas.';
END;
$$;

CREATE TRIGGER member_history_immutable_update
  BEFORE UPDATE ON public.member_history
  FOR EACH ROW EXECUTE FUNCTION public.prevent_member_history_mutation();

CREATE TRIGGER member_history_immutable_delete
  BEFORE DELETE ON public.member_history
  FOR EACH ROW EXECUTE FUNCTION public.prevent_member_history_mutation();

CREATE INDEX IF NOT EXISTS member_history_party_id_idx    ON public.member_history (party_id);
CREATE INDEX IF NOT EXISTS member_history_ministry_id_idx ON public.member_history (ministry_id);
CREATE INDEX IF NOT EXISTS member_history_criado_em_idx   ON public.member_history (criado_em DESC);


-- ============================================================
-- 8. MEMBER_TRANSFERS
-- Historico de transferencias intra e inter-ministerio.
-- INTRA: membro vai para outra unidade do mesmo campo.
-- INTER: membro vai para outro campo (carta de transferencia).
-- DESLIGAMENTO: saida definitiva do ministerio.
-- RETORNO: membro que voltou apos desligamento ou transferencia.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.member_transfers (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id          uuid        NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  party_id             uuid        NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
  unit_origem_id       uuid        REFERENCES public.units(id) ON DELETE SET NULL,
  unit_destino_id      uuid        REFERENCES public.units(id) ON DELETE SET NULL,
  tipo                 text        NOT NULL
    CHECK (tipo IN ('INTRA', 'INTER', 'DESLIGAMENTO', 'RETORNO')),
  data_transferencia   date        NOT NULL DEFAULT CURRENT_DATE,
  aprovado_por         uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  obs                  text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.member_transfers IS
  'Historico completo de transferencias. '
  'INTRA: dentro do mesmo campo. INTER: para outro campo (gera carta de transferencia). '
  'DESLIGAMENTO: saida definitiva. RETORNO: re-ingresso.';

CREATE INDEX IF NOT EXISTS member_transfers_party_id_idx    ON public.member_transfers (party_id);
CREATE INDEX IF NOT EXISTS member_transfers_ministry_id_idx ON public.member_transfers (ministry_id);
CREATE INDEX IF NOT EXISTS member_transfers_data_idx        ON public.member_transfers (data_transferencia DESC);


-- ============================================================
-- 9. ROW LEVEL SECURITY
-- Habilita RLS em todas as novas tabelas.
-- Pattern: usuario ve apenas dados do seu ministerio.
-- Tabelas de lookup: gerenciadas por N0/N1.
-- Dados de membros: filtro adicional por unit_id para N3/N4.
-- ============================================================

-- Lookup tables (acesso simples por ministry_id)
ALTER TABLE public.member_cargos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_funcoes_lookup  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_professions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_schooling       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_civil_status    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_genders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_financial_status ENABLE ROW LEVEL SECURITY;

-- Tabelas de dados
ALTER TABLE public.party_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_addresses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_funcoes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_dependents  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_transfers  ENABLE ROW LEVEL SECURITY;

-- ── HELPER: get_user_unit_id ─────────────────────────────────
-- Retorna o unit_id do usuario logado em um ministerio.
-- Usada nas policies de N3/N4 para filtrar por unidade.
CREATE OR REPLACE FUNCTION public.get_user_unit_id(p_ministry_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT unit_id
  FROM   public.admin_roles
  WHERE  user_id      = auth.uid()
  AND    ministry_id  = p_ministry_id
  AND    is_active    = true
  LIMIT 1;
$$;

-- ── POLICIES: Lookup tables ───────────────────────────────────
-- SELECT: qualquer usuario autenticado do ministerio
-- INSERT/UPDATE/DELETE: apenas N0 e N1

-- Template macro para lookup tables (executado para cada uma):
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN VALUES
    ('member_cargos'),
    ('departments'),
    ('member_funcoes_lookup'),
    ('member_professions'),
    ('member_schooling'),
    ('member_civil_status'),
    ('member_genders'),
    ('member_financial_status')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I', tbl, tbl);

    -- SELECT: qualquer usuario autenticado do ministerio
    EXECUTE format(
      'CREATE POLICY "%s_select" ON public.%I FOR SELECT TO authenticated '
      'USING (public.is_super_master() OR ministry_id = ANY(public.get_user_ministry_ids()))',
      tbl, tbl
    );

    -- INSERT: apenas N0 e N1
    EXECUTE format(
      'CREATE POLICY "%s_insert" ON public.%I FOR INSERT TO authenticated '
      'WITH CHECK (public.is_super_master() OR public.get_user_level(ministry_id) <= 1)',
      tbl, tbl
    );

    -- UPDATE: apenas N0 e N1
    EXECUTE format(
      'CREATE POLICY "%s_update" ON public.%I FOR UPDATE TO authenticated '
      'USING (public.is_super_master() OR public.get_user_level(ministry_id) <= 1)',
      tbl, tbl
    );

    -- DELETE: apenas N0
    EXECUTE format(
      'CREATE POLICY "%s_delete" ON public.%I FOR DELETE TO authenticated '
      'USING (public.is_super_master())',
      tbl, tbl
    );
  END LOOP;
END;
$$;

-- ── POLICIES: party_members ───────────────────────────────────
DROP POLICY IF EXISTS "party_members_select" ON public.party_members;
DROP POLICY IF EXISTS "party_members_insert" ON public.party_members;
DROP POLICY IF EXISTS "party_members_update" ON public.party_members;
DROP POLICY IF EXISTS "party_members_delete" ON public.party_members;

-- SELECT: usuario ve membros do seu ministerio
-- N3/N4 veem apenas membros da sua unidade (filtro unit_id aplicado na aplicacao)
-- RLS aqui garante o isolamento de ministerio; filtro de setor/igreja e feito na query
CREATE POLICY "party_members_select" ON public.party_members
  FOR SELECT TO authenticated
  USING (
    public.is_super_master()
    OR ministry_id = ANY(public.get_user_ministry_ids())
  );

CREATE POLICY "party_members_insert" ON public.party_members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_master()
    OR public.get_user_level(ministry_id) <= 4  -- qualquer usuario autenticado do campo pode cadastrar
  );

CREATE POLICY "party_members_update" ON public.party_members
  FOR UPDATE TO authenticated
  USING (
    public.is_super_master()
    OR public.get_user_level(ministry_id) <= 4
  );

CREATE POLICY "party_members_delete" ON public.party_members
  FOR DELETE TO authenticated
  USING (
    public.is_super_master()
    OR public.get_user_level(ministry_id) <= 1  -- apenas N0/N1 podem excluir membros
  );

-- ── POLICIES: party_addresses ─────────────────────────────────
DROP POLICY IF EXISTS "party_addresses_select" ON public.party_addresses;
DROP POLICY IF EXISTS "party_addresses_insert" ON public.party_addresses;
DROP POLICY IF EXISTS "party_addresses_update" ON public.party_addresses;
DROP POLICY IF EXISTS "party_addresses_delete" ON public.party_addresses;

CREATE POLICY "party_addresses_select" ON public.party_addresses
  FOR SELECT TO authenticated
  USING (public.is_super_master() OR ministry_id = ANY(public.get_user_ministry_ids()));

CREATE POLICY "party_addresses_insert" ON public.party_addresses
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_master() OR public.get_user_level(ministry_id) <= 4);

CREATE POLICY "party_addresses_update" ON public.party_addresses
  FOR UPDATE TO authenticated
  USING (public.is_super_master() OR public.get_user_level(ministry_id) <= 4);

CREATE POLICY "party_addresses_delete" ON public.party_addresses
  FOR DELETE TO authenticated
  USING (public.is_super_master() OR public.get_user_level(ministry_id) <= 2);

-- ── POLICIES: party_funcoes ───────────────────────────────────
DROP POLICY IF EXISTS "party_funcoes_select" ON public.party_funcoes;
DROP POLICY IF EXISTS "party_funcoes_insert" ON public.party_funcoes;
DROP POLICY IF EXISTS "party_funcoes_update" ON public.party_funcoes;
DROP POLICY IF EXISTS "party_funcoes_delete" ON public.party_funcoes;

CREATE POLICY "party_funcoes_select" ON public.party_funcoes
  FOR SELECT TO authenticated
  USING (public.is_super_master() OR ministry_id = ANY(public.get_user_ministry_ids()));

-- Gestao de funcoes departamentais: apenas N0, N1 e N2
CREATE POLICY "party_funcoes_insert" ON public.party_funcoes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_master() OR public.get_user_level(ministry_id) <= 2);

CREATE POLICY "party_funcoes_update" ON public.party_funcoes
  FOR UPDATE TO authenticated
  USING (public.is_super_master() OR public.get_user_level(ministry_id) <= 2);

CREATE POLICY "party_funcoes_delete" ON public.party_funcoes
  FOR DELETE TO authenticated
  USING (public.is_super_master() OR public.get_user_level(ministry_id) <= 2);

-- ── POLICIES: party_dependents ────────────────────────────────
DROP POLICY IF EXISTS "party_dependents_select" ON public.party_dependents;
DROP POLICY IF EXISTS "party_dependents_insert" ON public.party_dependents;
DROP POLICY IF EXISTS "party_dependents_update" ON public.party_dependents;
DROP POLICY IF EXISTS "party_dependents_delete" ON public.party_dependents;

CREATE POLICY "party_dependents_select" ON public.party_dependents
  FOR SELECT TO authenticated
  USING (public.is_super_master() OR ministry_id = ANY(public.get_user_ministry_ids()));

CREATE POLICY "party_dependents_insert" ON public.party_dependents
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_master() OR public.get_user_level(ministry_id) <= 4);

CREATE POLICY "party_dependents_update" ON public.party_dependents
  FOR UPDATE TO authenticated
  USING (public.is_super_master() OR public.get_user_level(ministry_id) <= 4);

CREATE POLICY "party_dependents_delete" ON public.party_dependents
  FOR DELETE TO authenticated
  USING (public.is_super_master() OR public.get_user_level(ministry_id) <= 2);

-- ── POLICIES: member_history ──────────────────────────────────
-- INSERT por qualquer usuario autenticado do ministerio.
-- UPDATE e DELETE bloqueados via trigger (adicional ao RLS).
DROP POLICY IF EXISTS "member_history_select" ON public.member_history;
DROP POLICY IF EXISTS "member_history_insert" ON public.member_history;

CREATE POLICY "member_history_select" ON public.member_history
  FOR SELECT TO authenticated
  USING (public.is_super_master() OR ministry_id = ANY(public.get_user_ministry_ids()));

CREATE POLICY "member_history_insert" ON public.member_history
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_master() OR public.get_user_level(ministry_id) <= 4);

-- ── POLICIES: member_transfers ────────────────────────────────
DROP POLICY IF EXISTS "member_transfers_select" ON public.member_transfers;
DROP POLICY IF EXISTS "member_transfers_insert" ON public.member_transfers;
DROP POLICY IF EXISTS "member_transfers_update" ON public.member_transfers;

CREATE POLICY "member_transfers_select" ON public.member_transfers
  FOR SELECT TO authenticated
  USING (public.is_super_master() OR ministry_id = ANY(public.get_user_ministry_ids()));

-- Transferencia INTRA: N3+ pode fazer | INTER: apenas N2+
CREATE POLICY "member_transfers_insert" ON public.member_transfers
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_master()
    OR (
      tipo = 'INTRA'
      AND public.get_user_level(ministry_id) <= 4
    )
    OR (
      tipo IN ('INTER', 'DESLIGAMENTO', 'RETORNO')
      AND public.get_user_level(ministry_id) <= 2
    )
  );

CREATE POLICY "member_transfers_update" ON public.member_transfers
  FOR UPDATE TO authenticated
  USING (public.is_super_master() OR public.get_user_level(ministry_id) <= 2);


-- ============================================================
-- 10. FUNCAO AUXILIAR: gerar_matricula
-- Gera automaticamente o numero de matricula definitivo
-- quando o membro e ativado. Formato: ANO + 4 digitos sequenciais.
-- Chamada pela aplicacao ao mudar situacao para ATIVO.
-- ============================================================
CREATE OR REPLACE FUNCTION public.gerar_matricula(p_ministry_id uuid)
RETURNS varchar LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_ano       text := to_char(CURRENT_DATE, 'YYYY');
  v_seq       integer;
  v_matricula varchar(20);
BEGIN
  SELECT COALESCE(
    MAX(NULLIF(regexp_replace(matricula, '^' || v_ano, ''), '')::integer),
    0
  ) + 1
  INTO v_seq
  FROM public.party_members
  WHERE ministry_id = p_ministry_id
    AND matricula LIKE v_ano || '%';

  v_matricula := v_ano || lpad(v_seq::text, 4, '0');
  RETURN v_matricula;
END;
$$;

COMMENT ON FUNCTION public.gerar_matricula IS
  'Gera matricula no formato AAAA0001, AAAA0002... por ministerio por ano. '
  'Chamar ao ativar um membro: UPDATE party_members SET matricula = gerar_matricula(ministry_id) '
  'WHERE party_id = X AND matricula IS NULL.';


-- ============================================================
-- 11. SEED DE LOOKUP TABLES
-- Popula os ministerios ja existentes com valores default.
-- Usa INSERT ... ON CONFLICT DO NOTHING para ser idempotente.
-- ============================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.ministries LOOP

    -- Cargos eclesiasticos
    INSERT INTO public.member_cargos (ministry_id, nome, ordem) VALUES
      (r.id, 'Membro',     1),
      (r.id, 'Obreiro',    2),
      (r.id, 'Diacono',    3),
      (r.id, 'Presbitero', 4),
      (r.id, 'Pastor',     5),
      (r.id, 'Bispo',      6)
    ON CONFLICT (ministry_id, nome) DO NOTHING;

    -- Departamentos
    INSERT INTO public.departments (ministry_id, nome, sigla) VALUES
      (r.id, 'Mocidade',             'MOC'),
      (r.id, 'Coral',                'COR'),
      (r.id, 'Dorcas',               'DOR'),
      (r.id, 'Louvor',               'LOU'),
      (r.id, 'EBD',                  'EBD'),
      (r.id, 'Escola Teologica',     'EST'),
      (r.id, 'Missoes',              'MIS'),
      (r.id, 'Intercession',         'INT'),
      (r.id, 'Ministerio Infantil',  'INF'),
      (r.id, 'Cerimonia',            'CER')
    ON CONFLICT (ministry_id, nome) DO NOTHING;

    -- Tipos de funcao
    INSERT INTO public.member_funcoes_lookup (ministry_id, nome) VALUES
      (r.id, 'Lider'),
      (r.id, 'Sub-lider'),
      (r.id, 'Coordenador'),
      (r.id, 'Secretario'),
      (r.id, 'Tesoureiro'),
      (r.id, 'Professor'),
      (r.id, 'Musico'),
      (r.id, 'Responsavel')
    ON CONFLICT (ministry_id, nome) DO NOTHING;

    -- Profissoes (lista reduzida; ministerio pode expandir)
    INSERT INTO public.member_professions (ministry_id, nome) VALUES
      (r.id, 'Agricultor'),
      (r.id, 'Advogado'),
      (r.id, 'Autonomo'),
      (r.id, 'Contador'),
      (r.id, 'Do lar'),
      (r.id, 'Educador'),
      (r.id, 'Enfermeiro'),
      (r.id, 'Engenheiro'),
      (r.id, 'Empresario'),
      (r.id, 'Medico'),
      (r.id, 'Mecanico'),
      (r.id, 'Motorista'),
      (r.id, 'Servidor publico'),
      (r.id, 'Tecnico de informatica'),
      (r.id, 'Comerciante'),
      (r.id, 'Aposentado'),
      (r.id, 'Estudante'),
      (r.id, 'Outros')
    ON CONFLICT (ministry_id, nome) DO NOTHING;

    -- Escolaridade
    INSERT INTO public.member_schooling (ministry_id, nome, ordem) VALUES
      (r.id, 'Fundamental incompleto',  1),
      (r.id, 'Fundamental completo',    2),
      (r.id, 'Medio incompleto',        3),
      (r.id, 'Medio completo',          4),
      (r.id, 'Superior incompleto',     5),
      (r.id, 'Superior completo',       6),
      (r.id, 'Pos-graduacao',           7),
      (r.id, 'Mestrado',                8),
      (r.id, 'Doutorado',               9)
    ON CONFLICT (ministry_id, nome) DO NOTHING;

    -- Estado civil
    INSERT INTO public.member_civil_status (ministry_id, nome) VALUES
      (r.id, 'Solteiro'),
      (r.id, 'Casado'),
      (r.id, 'Divorciado'),
      (r.id, 'Viuvo'),
      (r.id, 'Uniao estavel'),
      (r.id, 'Separado')
    ON CONFLICT (ministry_id, nome) DO NOTHING;

    -- Genero
    INSERT INTO public.member_genders (ministry_id, nome) VALUES
      (r.id, 'Masculino'),
      (r.id, 'Feminino')
    ON CONFLICT (ministry_id, nome) DO NOTHING;

    -- Situacao financeira
    INSERT INTO public.member_financial_status (ministry_id, nome) VALUES
      (r.id, 'Dizimista'),
      (r.id, 'Colaborador'),
      (r.id, 'Nao contribuinte')
    ON CONFLICT (ministry_id, nome) DO NOTHING;

  END LOOP;
END;
$$;

-- ============================================================
-- FIM DA MIGRATION 005
-- Proximos passos:
--   - Executar no Supabase SQL Editor
--   - Verificar no Table Editor que todas as 14 tabelas foram criadas
--   - Verificar que RLS esta habilitado em todas elas
--   - Executar query de teste: SELECT * FROM member_cargos (deve retornar os defaults)
--   - Iniciar frontend: Fase 2 lista de membros
-- ============================================================
