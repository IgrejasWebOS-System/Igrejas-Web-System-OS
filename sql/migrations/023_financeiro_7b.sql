-- ============================================================
-- Migration 023 — Financeiro Fase 7B
-- Projetos, Parcelamentos, Programações Recorrentes, Repasses
-- ============================================================

-- ── 1. FIN_PROJECTS — Projetos Financeiros ───────────────────
-- Vincula lançamentos a um projeto (obra, campanha, evento)
-- e controla orçamento vs realizado.

CREATE TABLE IF NOT EXISTS public.fin_projects (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id         uuid        NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  unit_id             uuid        REFERENCES public.units(id) ON DELETE SET NULL,
  nome                text        NOT NULL,
  descricao           text,
  tipo                text        NOT NULL DEFAULT 'OUTRO'
                        CHECK (tipo IN ('CONSTRUCAO','REFORMA','EVANGELISMO','MISSOES',
                                        'EVENTO','SOCIAL','AQUISICAO','OUTRO')),
  status              text        NOT NULL DEFAULT 'ATIVO'
                        CHECK (status IN ('PLANEJAMENTO','ATIVO','CONCLUIDO','CANCELADO')),
  orcamento_total     numeric(14,2),
  data_inicio         date,
  data_fim_prevista   date,
  data_conclusao      date,
  responsavel_party_id uuid       REFERENCES public.parties(id) ON DELETE SET NULL,
  is_active           boolean     NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Adicionar project_id em fin_transactions (FK opcional)
ALTER TABLE public.fin_transactions
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.fin_projects(id) ON DELETE SET NULL;

-- ── 2. FIN_INSTALLMENT_PLANS — Planos de Parcelamento ────────
-- Um compromisso financeiro dividido em N parcelas periódicas.
-- Ex: compra de instrumento em 12x, doação prometida em 6 meses.

CREATE TABLE IF NOT EXISTS public.fin_installment_plans (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id         uuid        NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  unit_id             uuid        REFERENCES public.units(id) ON DELETE SET NULL,
  descricao           text        NOT NULL,
  tipo                text        NOT NULL CHECK (tipo IN ('ENTRADA','SAIDA')),
  account_id          uuid        NOT NULL REFERENCES public.fin_accounts(id),
  category_id         uuid        NOT NULL REFERENCES public.fin_categories(id),
  party_id            uuid        REFERENCES public.parties(id) ON DELETE SET NULL,
  project_id          uuid        REFERENCES public.fin_projects(id) ON DELETE SET NULL,
  valor_total         numeric(14,2) NOT NULL CHECK (valor_total > 0),
  num_parcelas        integer     NOT NULL CHECK (num_parcelas >= 1),
  valor_parcela       numeric(14,2) NOT NULL CHECK (valor_parcela > 0),
  periodicidade       text        NOT NULL DEFAULT 'MENSAL'
                        CHECK (periodicidade IN ('SEMANAL','QUINZENAL','MENSAL',
                                                 'BIMESTRAL','TRIMESTRAL','SEMESTRAL','ANUAL')),
  data_primeira_parcela date      NOT NULL,
  status              text        NOT NULL DEFAULT 'ATIVO'
                        CHECK (status IN ('ATIVO','QUITADO','CANCELADO')),
  observacoes         text,
  criado_por          uuid        REFERENCES auth.users(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ── 3. FIN_INSTALLMENTS — Parcelas individuais ───────────────

CREATE TABLE IF NOT EXISTS public.fin_installments (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id     uuid        NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  plan_id         uuid        NOT NULL REFERENCES public.fin_installment_plans(id) ON DELETE CASCADE,
  numero          integer     NOT NULL CHECK (numero >= 1),
  data_vencimento date        NOT NULL,
  valor           numeric(14,2) NOT NULL CHECK (valor > 0),
  status          text        NOT NULL DEFAULT 'PENDENTE'
                    CHECK (status IN ('PENDENTE','PAGO','ATRASADO','CANCELADO')),
  transaction_id  uuid        REFERENCES public.fin_transactions(id) ON DELETE SET NULL,
  data_pagamento  date,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(plan_id, numero)
);

-- Adicionar installment_id em fin_transactions
ALTER TABLE public.fin_transactions
  ADD COLUMN IF NOT EXISTS installment_id uuid REFERENCES public.fin_installments(id) ON DELETE SET NULL;

-- ── 4. FIN_RECURRING_TRANSACTIONS — Programações Recorrentes ─
-- Template de lançamento que se repete automaticamente.
-- Ex: energia elétrica todo mês, dízimo de membro, prebenda pastoral.

CREATE TABLE IF NOT EXISTS public.fin_recurring_transactions (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id         uuid        NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  unit_id             uuid        REFERENCES public.units(id) ON DELETE SET NULL,
  descricao           text        NOT NULL,
  tipo                text        NOT NULL CHECK (tipo IN ('ENTRADA','SAIDA')),
  account_id          uuid        NOT NULL REFERENCES public.fin_accounts(id),
  category_id         uuid        NOT NULL REFERENCES public.fin_categories(id),
  party_id            uuid        REFERENCES public.parties(id) ON DELETE SET NULL,
  project_id          uuid        REFERENCES public.fin_projects(id) ON DELETE SET NULL,
  valor               numeric(14,2) NOT NULL CHECK (valor > 0),
  periodicidade       text        NOT NULL DEFAULT 'MENSAL'
                        CHECK (periodicidade IN ('DIARIO','SEMANAL','QUINZENAL','MENSAL',
                                                 'BIMESTRAL','TRIMESTRAL','SEMESTRAL','ANUAL')),
  dia_vencimento      integer     CHECK (dia_vencimento BETWEEN 1 AND 31),
  data_inicio         date        NOT NULL,
  data_fim            date,
  status              text        NOT NULL DEFAULT 'ATIVO'
                        CHECK (status IN ('ATIVO','PAUSADO','ENCERRADO')),
  ultima_geracao      date,
  proxima_geracao     date,
  total_gerado        integer     NOT NULL DEFAULT 0,
  criado_por          uuid        REFERENCES auth.users(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Adicionar recurring_id em fin_transactions
ALTER TABLE public.fin_transactions
  ADD COLUMN IF NOT EXISTS recurring_id uuid REFERENCES public.fin_recurring_transactions(id) ON DELETE SET NULL;

-- ── 5. FIN_UNIT_REPASSES — Repasses entre Unidades ───────────
-- Fluxo de recursos entre unidades hierárquicas.
-- Ex: congregação repassa % do dízimo para o setor/sede.

CREATE TABLE IF NOT EXISTS public.fin_unit_repasses (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id     uuid        NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  unit_from_id    uuid        NOT NULL REFERENCES public.units(id),
  unit_to_id      uuid        NOT NULL REFERENCES public.units(id),
  account_from_id uuid        REFERENCES public.fin_accounts(id) ON DELETE SET NULL,
  account_to_id   uuid        REFERENCES public.fin_accounts(id) ON DELETE SET NULL,
  descricao       text        NOT NULL,
  valor           numeric(14,2) NOT NULL CHECK (valor > 0),
  percentual      numeric(5,2), -- % da arrecadação base (opcional)
  data            date        NOT NULL,
  competencia_mes integer     CHECK (competencia_mes BETWEEN 1 AND 12),
  competencia_ano integer,
  status          text        NOT NULL DEFAULT 'PENDENTE'
                    CHECK (status IN ('PENDENTE','EXECUTADO','CANCELADO')),
  transaction_id  uuid        REFERENCES public.fin_transactions(id) ON DELETE SET NULL,
  criado_por      uuid        REFERENCES auth.users(id),
  aprovado_por    uuid        REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unit_repasse_diferente CHECK (unit_from_id <> unit_to_id)
);

-- ── 6. FIN_REPASSE_RULES — Regras automáticas de repasse ─────
-- Define percentual fixo de repasse entre unidades (ex: 10% do dízimo).

CREATE TABLE IF NOT EXISTS public.fin_repasse_rules (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id     uuid        NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  unit_from_id    uuid        NOT NULL REFERENCES public.units(id),
  unit_to_id      uuid        NOT NULL REFERENCES public.units(id),
  descricao       text        NOT NULL,
  percentual      numeric(5,2) NOT NULL CHECK (percentual > 0 AND percentual <= 100),
  base_calculo    text        NOT NULL DEFAULT 'DIZIMO'
                    CHECK (base_calculo IN ('DIZIMO','OFERTA','TOTAL_RECEITAS','VALOR_FIXO')),
  valor_fixo      numeric(14,2),
  periodicidade   text        NOT NULL DEFAULT 'MENSAL'
                    CHECK (periodicidade IN ('MENSAL','TRIMESTRAL','SEMESTRAL','ANUAL')),
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── 7. TRIGGERS updated_at ────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at_7b()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'fin_projects',
    'fin_installment_plans',
    'fin_recurring_transactions'
  ] LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON public.%1$s;
      CREATE TRIGGER trg_%1$s_updated_at
        BEFORE UPDATE ON public.%1$s
        FOR EACH ROW EXECUTE FUNCTION set_updated_at_7b();
    ', tbl);
  END LOOP;
END $$;

-- ── 8. FUNÇÃO: Gerar parcelas de um plano ────────────────────

CREATE OR REPLACE FUNCTION public.gerar_parcelas(p_plan_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  plan   public.fin_installment_plans%ROWTYPE;
  i      integer;
  vdata  date;
  m_id   uuid;
BEGIN
  SELECT * INTO plan FROM public.fin_installment_plans WHERE id = p_plan_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plano % não encontrado', p_plan_id; END IF;

  m_id := plan.ministry_id;
  vdata := plan.data_primeira_parcela;

  FOR i IN 1..plan.num_parcelas LOOP
    INSERT INTO public.fin_installments (ministry_id, plan_id, numero, data_vencimento, valor)
    VALUES (m_id, p_plan_id, i, vdata, plan.valor_parcela)
    ON CONFLICT (plan_id, numero) DO NOTHING;

    -- Avança data conforme periodicidade
    vdata := CASE plan.periodicidade
      WHEN 'SEMANAL'     THEN vdata + INTERVAL '7 days'
      WHEN 'QUINZENAL'   THEN vdata + INTERVAL '15 days'
      WHEN 'MENSAL'      THEN vdata + INTERVAL '1 month'
      WHEN 'BIMESTRAL'   THEN vdata + INTERVAL '2 months'
      WHEN 'TRIMESTRAL'  THEN vdata + INTERVAL '3 months'
      WHEN 'SEMESTRAL'   THEN vdata + INTERVAL '6 months'
      WHEN 'ANUAL'       THEN vdata + INTERVAL '1 year'
      ELSE vdata + INTERVAL '1 month'
    END;
  END LOOP;
END;
$$;

-- ── 9. FUNÇÃO: Calcular próxima data de geração recorrente ────

CREATE OR REPLACE FUNCTION public.calcular_proxima_geracao(
  p_ultima date,
  p_periodicidade text,
  p_dia_vencimento integer DEFAULT NULL
)
RETURNS date LANGUAGE sql STABLE AS $$
  SELECT CASE p_periodicidade
    WHEN 'DIARIO'      THEN p_ultima + INTERVAL '1 day'
    WHEN 'SEMANAL'     THEN p_ultima + INTERVAL '7 days'
    WHEN 'QUINZENAL'   THEN p_ultima + INTERVAL '15 days'
    WHEN 'MENSAL'      THEN p_ultima + INTERVAL '1 month'
    WHEN 'BIMESTRAL'   THEN p_ultima + INTERVAL '2 months'
    WHEN 'TRIMESTRAL'  THEN p_ultima + INTERVAL '3 months'
    WHEN 'SEMESTRAL'   THEN p_ultima + INTERVAL '6 months'
    WHEN 'ANUAL'       THEN p_ultima + INTERVAL '1 year'
    ELSE p_ultima + INTERVAL '1 month'
  END::date;
$$;

-- ── 10. RLS ───────────────────────────────────────────────────

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'fin_projects',
    'fin_installment_plans',
    'fin_installments',
    'fin_recurring_transactions',
    'fin_unit_repasses',
    'fin_repasse_rules'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);

    EXECUTE format('
      DROP POLICY IF EXISTS "%1$s_select" ON public.%1$s;
      CREATE POLICY "%1$s_select" ON public.%1$s
        FOR SELECT USING (ministry_id = ANY(get_user_ministry_ids()));
    ', tbl);

    EXECUTE format('
      DROP POLICY IF EXISTS "%1$s_insert" ON public.%1$s;
      CREATE POLICY "%1$s_insert" ON public.%1$s
        FOR INSERT WITH CHECK (ministry_id = ANY(get_user_ministry_ids()));
    ', tbl);

    EXECUTE format('
      DROP POLICY IF EXISTS "%1$s_update" ON public.%1$s;
      CREATE POLICY "%1$s_update" ON public.%1$s
        FOR UPDATE USING (ministry_id = ANY(get_user_ministry_ids()));
    ', tbl);

    EXECUTE format('
      DROP POLICY IF EXISTS "%1$s_super" ON public.%1$s;
      CREATE POLICY "%1$s_super" ON public.%1$s USING (is_super_master());
    ', tbl);
  END LOOP;
END $$;

-- Parcelas não têm ministry_id diretamente — RLS via plan_id
DROP POLICY IF EXISTS "fin_installments_select" ON public.fin_installments;
CREATE POLICY "fin_installments_select" ON public.fin_installments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.fin_installment_plans p
      WHERE p.id = plan_id
        AND p.ministry_id = ANY(get_user_ministry_ids())
    )
  );

DROP POLICY IF EXISTS "fin_installments_update" ON public.fin_installments;
CREATE POLICY "fin_installments_update" ON public.fin_installments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.fin_installment_plans p
      WHERE p.id = plan_id
        AND p.ministry_id = ANY(get_user_ministry_ids())
    )
  );
