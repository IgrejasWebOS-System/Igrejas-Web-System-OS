-- ============================================================
-- Migration 001 -- Schema Base
-- Projeto: IgrejasWeb System OS
-- Ordem de execucao: 1 de 3
-- Descricao: Tabelas fundacao do sistema (CORE)
--   ministries, ministry_modules, units, parties,
--   party_roles, admin_roles
-- ============================================================

-- ── EXTENSOES ────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. MINISTRIES
-- O tenant raiz do sistema. Cada ministerio e um campo
-- independente (ex: AD Madureira Piracicaba, AD Belem).
-- Todos os dados do sistema sao isolados por ministry_id.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ministries (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  slug        text        NOT NULL UNIQUE,    -- 'madureira-piracicaba', 'belem'
  logo_url    text,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ministries IS
  'Tenant raiz. Cada ministerio/campo e um registro aqui.';

-- ============================================================
-- 2. MINISTRY_MODULES
-- Feature flags por ministerio. Liga/desliga modulos
-- sem deploy. O menu lateral e construido a partir desta tabela.
-- Modulos: membros, financeiro, escola, cursos, ebd, secretaria,
--          patrimonio, eventos
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ministry_modules (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id  uuid    NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  module       text    NOT NULL,
  is_active    boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ministry_id, module),
  CHECK (module IN (
    'membros',
    'financeiro',
    'escola',
    'cursos',
    'ebd',
    'secretaria',
    'patrimonio',
    'eventos',
    'ocorrencias'
  ))
);

COMMENT ON TABLE public.ministry_modules IS
  'Feature flags por ministerio. Controla quais modulos aparecem no menu.';

-- ============================================================
-- 3. UNITS
-- Hierarquia organizacional universal.
-- Tipos: CAMPO -> SEDE -> SETOR -> IGREJA -> CELULA
-- A mesma tabela serve para qualquer hierarquia futura.
-- parent_id: auto-referencia para montar a arvore.
-- is_headquarters: esta unidade e a sede do campo?
-- is_sector_mother: esta unidade e a igreja mae do setor?
-- ============================================================
CREATE TABLE IF NOT EXISTS public.units (
  id               uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id      uuid    NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  parent_id        uuid    REFERENCES public.units(id) ON DELETE SET NULL,
  name             text    NOT NULL,
  unit_type        text    NOT NULL,
  is_headquarters  boolean NOT NULL DEFAULT false,
  is_sector_mother boolean NOT NULL DEFAULT false,
  is_active        boolean NOT NULL DEFAULT true,
  order_index      integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CHECK (unit_type IN ('CAMPO', 'SEDE', 'SETOR', 'IGREJA', 'CELULA', 'PONTO_PREGACAO'))
);

COMMENT ON TABLE public.units IS
  'Hierarquia organizacional: CAMPO > SEDE > SETOR > IGREJA > CELULA. '
  'Uma unidade pode ser sede (is_headquarters) e mae de setor (is_sector_mother) ao mesmo tempo.';

CREATE INDEX IF NOT EXISTS units_ministry_id_idx ON public.units (ministry_id);
CREATE INDEX IF NOT EXISTS units_parent_id_idx   ON public.units (parent_id);
CREATE INDEX IF NOT EXISTS units_unit_type_idx   ON public.units (unit_type);

-- ============================================================
-- 4. PARTIES
-- Entidade universal de pessoa (fisica ou juridica).
-- Um CPF = Um registro por ministerio.
-- A mesma pessoa pode ter multiplos papeis (party_roles).
-- Substitui: members, clients, suppliers, students, volunteers.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.parties (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id  uuid NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  party_type   text NOT NULL DEFAULT 'PESSOA_FISICA',
  full_name    text NOT NULL,
  cpf          text,
  cnpj         text,
  email        text,
  phone        text,
  birth_date   date,
  gender       text,
  photo_url    text,
  -- Endereco
  zip_code     text,
  address      text,
  address_num  text,
  neighborhood text,
  city         text,
  state        text,
  -- Documentos
  rg           text,
  rg_issuer    text,
  rg_state     text,
  -- Filiacao
  mother_name  text,
  father_name  text,
  spouse_name  text,
  -- Controle
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (party_type IN ('PESSOA_FISICA', 'PESSOA_JURIDICA')),
  UNIQUE (ministry_id, cpf)
);

COMMENT ON TABLE public.parties IS
  'Entidade universal de pessoa. Um registro por CPF por ministerio. '
  'Papeis (membro, aluno, voluntario) sao definidos em party_roles.';

CREATE INDEX IF NOT EXISTS parties_ministry_id_idx  ON public.parties (ministry_id);
CREATE INDEX IF NOT EXISTS parties_full_name_idx    ON public.parties (full_name);
CREATE INDEX IF NOT EXISTS parties_cpf_idx          ON public.parties (cpf);

-- ============================================================
-- 5. PARTY_ROLES
-- Papeis que uma party exerce em um contexto.
-- role_type: MEMBRO | CLIENTE | FORNECEDOR | ALUNO | VOLUNTARIO
-- unit_id: em qual unidade (igreja, setor) esse papel existe.
-- Uma pessoa pode ser MEMBRO da Igreja X e ALUNO do portal
-- ao mesmo tempo, sem duplicar o cadastro.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.party_roles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id     uuid NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
  ministry_id  uuid NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  unit_id      uuid REFERENCES public.units(id) ON DELETE SET NULL,
  role_type    text NOT NULL,
  status       text NOT NULL DEFAULT 'ACTIVE',
  -- Dados especificos de MEMBRO
  registration_number  text,          -- matricula eclesiastica
  ecclesiastical_role  text,          -- cargo: PASTOR, PRESBITERO, DIACONO, etc.
  ecclesiastical_status text DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, OBSERVATION, UNFIT
  baptism_date         date,
  marriage_date        date,
  origin_church        text,
  financial_status     text DEFAULT 'PENDING', -- UP_TO_DATE, PENDING
  -- Dados especificos de ALUNO
  enrollment_date  date,
  -- Controle
  started_at   timestamptz DEFAULT now(),
  ended_at     timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (role_type IN ('MEMBRO', 'CLIENTE', 'FORNECEDOR', 'ALUNO', 'VOLUNTARIO')),
  CHECK (status IN ('ACTIVE', 'INACTIVE', 'PENDING', 'ARCHIVED')),
  UNIQUE (party_id, ministry_id, role_type, unit_id)
);

COMMENT ON TABLE public.party_roles IS
  'Papeis da party em contextos. Mesmo cadastro, multiplos papeis.';

CREATE INDEX IF NOT EXISTS party_roles_party_id_idx      ON public.party_roles (party_id);
CREATE INDEX IF NOT EXISTS party_roles_ministry_id_idx   ON public.party_roles (ministry_id);
CREATE INDEX IF NOT EXISTS party_roles_unit_id_idx       ON public.party_roles (unit_id);
CREATE INDEX IF NOT EXISTS party_roles_role_type_idx     ON public.party_roles (role_type);
CREATE INDEX IF NOT EXISTS party_roles_status_idx        ON public.party_roles (status);

-- ============================================================
-- 6. ADMIN_ROLES
-- Controla quem acessa o sistema e com qual nivel.
-- Niveis:
--   0 = Super-Master (desenvolvedor, acesso irrestrito)
--   1 = Master/Campo (ve e controla tudo do seu campo)
--   2 = Admin-Sede (controla a sede + setores, emite convites)
--   3 = Admin-Setor/Igreja-Mae (controla igrejas do setor)
--   4 = Usuario-Local (controla apenas sua congregacao)
-- ministry_id NULL = Super-Master (acesso a todos os campos)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_roles (
  id           uuid     PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid     NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ministry_id  uuid     REFERENCES public.ministries(id) ON DELETE CASCADE,
  unit_id      uuid     REFERENCES public.units(id) ON DELETE SET NULL,
  level        smallint NOT NULL,
  is_active    boolean  NOT NULL DEFAULT true,
  invited_by   uuid     REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (level BETWEEN 0 AND 4),
  UNIQUE (user_id, ministry_id)
);

COMMENT ON TABLE public.admin_roles IS
  'Controla acesso ao sistema. Nivel 0=Super-Master ate 4=Usuario-Local. '
  'ministry_id NULL = Super-Master com acesso a todos os campos.';

CREATE INDEX IF NOT EXISTS admin_roles_user_id_idx      ON public.admin_roles (user_id);
CREATE INDEX IF NOT EXISTS admin_roles_ministry_id_idx  ON public.admin_roles (ministry_id);
CREATE INDEX IF NOT EXISTS admin_roles_unit_id_idx      ON public.admin_roles (unit_id);

-- ============================================================
-- TRIGGERS: updated_at automatico
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER ministries_updated_at
  BEFORE UPDATE ON public.ministries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER units_updated_at
  BEFORE UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER parties_updated_at
  BEFORE UPDATE ON public.parties
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
