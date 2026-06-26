-- ============================================================
-- Migration 021 -- Tesouraria Core (Fase 7A)
-- Contas, Plano de Contas, Formas de Pagamento, Centros de Custo,
-- Lançamentos, Transferências, Períodos (Caixas Mensais)
-- ============================================================

-- ── 1. FIN_PAYMENT_METHODS — Formas de pagamento ─────────────
CREATE TABLE IF NOT EXISTS public.fin_payment_methods (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id uuid    NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  nome        text    NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fin_payment_methods_min_idx ON public.fin_payment_methods (ministry_id);

-- ── 2. FIN_COST_CENTERS — Centros de custo ───────────────────
CREATE TABLE IF NOT EXISTS public.fin_cost_centers (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id uuid    NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  nome        text    NOT NULL,
  descricao   text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fin_cost_centers_min_idx ON public.fin_cost_centers (ministry_id);

-- ── 3. FIN_TITHE_JUSTIFICATIONS — Justificativas de dízimos ──
CREATE TABLE IF NOT EXISTS public.fin_tithe_justifications (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id uuid    NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  nome        text    NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fin_tithe_just_min_idx ON public.fin_tithe_justifications (ministry_id);

-- ── 4. FIN_DOCUMENT_TYPES — Tipos de documentos ──────────────
CREATE TABLE IF NOT EXISTS public.fin_document_types (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id uuid    NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  nome        text    NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fin_doc_types_min_idx ON public.fin_document_types (ministry_id);

-- ── 5. FIN_CATEGORIES — Plano de Contas hierárquico ──────────
CREATE TABLE IF NOT EXISTS public.fin_categories (
  id               uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id      uuid    NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  parent_id        uuid    REFERENCES public.fin_categories(id) ON DELETE SET NULL,
  codigo           varchar(20) NOT NULL,
  nome             text    NOT NULL,
  tipo             text    NOT NULL, -- RECEITA | DESPESA
  fundo            text    NOT NULL DEFAULT 'OUTRO', -- DIZIMO | OFERTA | MISSOES | CONSTRUCAO | EVENTO | OUTRO
  codigo_contabil  varchar(20),
  is_active        boolean NOT NULL DEFAULT true,
  ordem            integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ministry_id, codigo),
  CHECK (tipo  IN ('RECEITA','DESPESA')),
  CHECK (fundo IN ('DIZIMO','OFERTA','MISSOES','CONSTRUCAO','EVENTO','OUTRO'))
);
CREATE INDEX IF NOT EXISTS fin_categories_min_idx    ON public.fin_categories (ministry_id);
CREATE INDEX IF NOT EXISTS fin_categories_parent_idx ON public.fin_categories (parent_id);

-- ── 6. FIN_ACCOUNTS — Contas Banco/Caixa ─────────────────────
CREATE TABLE IF NOT EXISTS public.fin_accounts (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id   uuid    NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  unit_id       uuid    REFERENCES public.units(id) ON DELETE SET NULL,
  nome          text    NOT NULL,
  tipo          text    NOT NULL DEFAULT 'CAIXA', -- BANCO | CAIXA | POUPANCA | INVESTIMENTO
  banco         text,
  agencia       varchar(20),
  conta         varchar(30),
  digito        varchar(5),
  chave_pix     text,
  saldo_inicial numeric(12,2) NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  deleted_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (tipo IN ('BANCO','CAIXA','POUPANCA','INVESTIMENTO'))
);
CREATE INDEX IF NOT EXISTS fin_accounts_min_idx  ON public.fin_accounts (ministry_id);
CREATE INDEX IF NOT EXISTS fin_accounts_unit_idx ON public.fin_accounts (unit_id);

-- ── 7. FIN_PERIODS — Caixas Mensais ──────────────────────────
CREATE TABLE IF NOT EXISTS public.fin_periods (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id     uuid    NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  unit_id         uuid    REFERENCES public.units(id) ON DELETE SET NULL,
  mes             integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano             integer NOT NULL CHECK (ano BETWEEN 2000 AND 2100),
  status          text    NOT NULL DEFAULT 'ABERTO', -- ABERTO | FECHADO
  saldo_inicial   numeric(12,2) NOT NULL DEFAULT 0,
  saldo_final     numeric(12,2),
  data_fechamento timestamptz,
  fechado_por     uuid    REFERENCES auth.users(id) ON DELETE SET NULL,
  observacoes     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ministry_id, unit_id, mes, ano),
  CHECK (status IN ('ABERTO','FECHADO'))
);
CREATE INDEX IF NOT EXISTS fin_periods_min_idx  ON public.fin_periods (ministry_id);

-- ── 8. FIN_TRANSACTIONS — Lançamentos (Despesas / Receitas) ──
CREATE TABLE IF NOT EXISTS public.fin_transactions (
  id                      uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id             uuid    NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  unit_id                 uuid    REFERENCES public.units(id) ON DELETE SET NULL,
  account_id              uuid    NOT NULL REFERENCES public.fin_accounts(id) ON DELETE RESTRICT,
  category_id             uuid    NOT NULL REFERENCES public.fin_categories(id) ON DELETE RESTRICT,
  party_id                uuid    REFERENCES public.parties(id) ON DELETE SET NULL,
  payment_method_id       uuid    REFERENCES public.fin_payment_methods(id) ON DELETE SET NULL,
  cost_center_id          uuid    REFERENCES public.fin_cost_centers(id) ON DELETE SET NULL,
  document_type_id        uuid    REFERENCES public.fin_document_types(id) ON DELETE SET NULL,
  justificativa_dizimo_id uuid    REFERENCES public.fin_tithe_justifications(id) ON DELETE SET NULL,
  tipo                    text    NOT NULL, -- ENTRADA | SAIDA
  valor                   numeric(12,2) NOT NULL CHECK (valor > 0),
  data                    date    NOT NULL,
  numero_documento        varchar(60),
  descricao               text,
  comprovante_url         text,
  estorno_de_id           uuid    REFERENCES public.fin_transactions(id) ON DELETE SET NULL,
  status                  text    NOT NULL DEFAULT 'PENDENTE', -- PENDENTE | APROVADO | REJEITADO | ESTORNADO
  criado_por              uuid    REFERENCES auth.users(id) ON DELETE SET NULL,
  aprovado_por            uuid    REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz, -- soft delete — LGPD
  CHECK (tipo   IN ('ENTRADA','SAIDA')),
  CHECK (status IN ('PENDENTE','APROVADO','REJEITADO','ESTORNADO'))
);
CREATE INDEX IF NOT EXISTS fin_tx_min_idx      ON public.fin_transactions (ministry_id);
CREATE INDEX IF NOT EXISTS fin_tx_account_idx  ON public.fin_transactions (account_id);
CREATE INDEX IF NOT EXISTS fin_tx_category_idx ON public.fin_transactions (category_id);
CREATE INDEX IF NOT EXISTS fin_tx_data_idx     ON public.fin_transactions (data DESC);
CREATE INDEX IF NOT EXISTS fin_tx_status_idx   ON public.fin_transactions (status);

-- ── 9. FIN_TRANSFERS — Transferências entre contas ───────────
CREATE TABLE IF NOT EXISTS public.fin_transfers (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id     uuid    NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  unit_id         uuid    REFERENCES public.units(id) ON DELETE SET NULL,
  account_from_id uuid    NOT NULL REFERENCES public.fin_accounts(id) ON DELETE RESTRICT,
  account_to_id   uuid    NOT NULL REFERENCES public.fin_accounts(id) ON DELETE RESTRICT,
  valor           numeric(12,2) NOT NULL CHECK (valor > 0),
  data            date    NOT NULL,
  descricao       text,
  criado_por      uuid    REFERENCES auth.users(id) ON DELETE SET NULL,
  status          text    NOT NULL DEFAULT 'APROVADO', -- PENDENTE | APROVADO
  tx_saida_id     uuid    REFERENCES public.fin_transactions(id) ON DELETE SET NULL,
  tx_entrada_id   uuid    REFERENCES public.fin_transactions(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  CHECK (account_from_id <> account_to_id),
  CHECK (status IN ('PENDENTE','APROVADO'))
);
CREATE INDEX IF NOT EXISTS fin_transfers_min_idx ON public.fin_transfers (ministry_id);

-- ── 10. TRIGGERS updated_at ───────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at_fin()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_fin_accounts_upd    ON public.fin_accounts;
DROP TRIGGER IF EXISTS trg_fin_transactions_upd ON public.fin_transactions;

CREATE TRIGGER trg_fin_accounts_upd
  BEFORE UPDATE ON public.fin_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_fin();

CREATE TRIGGER trg_fin_transactions_upd
  BEFORE UPDATE ON public.fin_transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_fin();

-- ── 11. FUNÇÃO: executar_transferencia ───────────────────────
-- Cria dois lançamentos espelhados (SAIDA + ENTRADA) atomicamente.
-- Requer uma category_id de TRANSFERENCIA no plano de contas (criada no seed).
CREATE OR REPLACE FUNCTION public.executar_transferencia(
  p_ministry_id     uuid,
  p_unit_id         uuid,
  p_account_from_id uuid,
  p_account_to_id   uuid,
  p_valor           numeric,
  p_data            date,
  p_descricao       text,
  p_criado_por      uuid
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_cat_saida  uuid;
  v_cat_entrada uuid;
  v_tx_saida   uuid;
  v_tx_entrada uuid;
  v_transfer_id uuid;
BEGIN
  -- Buscar categorias internas de transferência (criadas no seed)
  SELECT id INTO v_cat_saida
  FROM public.fin_categories
  WHERE ministry_id = p_ministry_id AND codigo = 'TRF-S' LIMIT 1;

  SELECT id INTO v_cat_entrada
  FROM public.fin_categories
  WHERE ministry_id = p_ministry_id AND codigo = 'TRF-E' LIMIT 1;

  -- Fallback: usar qualquer categoria SAIDA/ENTRADA disponível
  IF v_cat_saida IS NULL THEN
    SELECT id INTO v_cat_saida FROM public.fin_categories
    WHERE ministry_id = p_ministry_id AND tipo = 'DESPESA' AND is_active = true LIMIT 1;
  END IF;
  IF v_cat_entrada IS NULL THEN
    SELECT id INTO v_cat_entrada FROM public.fin_categories
    WHERE ministry_id = p_ministry_id AND tipo = 'RECEITA' AND is_active = true LIMIT 1;
  END IF;

  -- Lançamento SAIDA
  INSERT INTO public.fin_transactions
    (ministry_id, unit_id, account_id, category_id, tipo, valor, data, descricao, status, criado_por)
  VALUES
    (p_ministry_id, p_unit_id, p_account_from_id, v_cat_saida, 'SAIDA', p_valor, p_data,
     COALESCE(p_descricao, 'Transferência entre contas'), 'APROVADO', p_criado_por)
  RETURNING id INTO v_tx_saida;

  -- Lançamento ENTRADA
  INSERT INTO public.fin_transactions
    (ministry_id, unit_id, account_id, category_id, tipo, valor, data, descricao, status, criado_por)
  VALUES
    (p_ministry_id, p_unit_id, p_account_to_id, v_cat_entrada, 'ENTRADA', p_valor, p_data,
     COALESCE(p_descricao, 'Transferência entre contas'), 'APROVADO', p_criado_por)
  RETURNING id INTO v_tx_entrada;

  -- Registrar transferência
  INSERT INTO public.fin_transfers
    (ministry_id, unit_id, account_from_id, account_to_id, valor, data, descricao,
     criado_por, status, tx_saida_id, tx_entrada_id)
  VALUES
    (p_ministry_id, p_unit_id, p_account_from_id, p_account_to_id, p_valor, p_data,
     p_descricao, p_criado_por, 'APROVADO', v_tx_saida, v_tx_entrada)
  RETURNING id INTO v_transfer_id;

  RETURN v_transfer_id;
END; $$;

-- ── 12. FUNÇÃO: calcular_saldo_conta ─────────────────────────
CREATE OR REPLACE FUNCTION public.calcular_saldo_conta(
  p_account_id uuid,
  p_ate_data   date DEFAULT CURRENT_DATE
) RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_saldo_inicial numeric;
  v_entradas      numeric;
  v_saidas        numeric;
BEGIN
  SELECT saldo_inicial INTO v_saldo_inicial
  FROM public.fin_accounts WHERE id = p_account_id;

  SELECT COALESCE(SUM(valor), 0) INTO v_entradas
  FROM public.fin_transactions
  WHERE account_id = p_account_id
    AND tipo = 'ENTRADA'
    AND status = 'APROVADO'
    AND deleted_at IS NULL
    AND data <= p_ate_data;

  SELECT COALESCE(SUM(valor), 0) INTO v_saidas
  FROM public.fin_transactions
  WHERE account_id = p_account_id
    AND tipo = 'SAIDA'
    AND status = 'APROVADO'
    AND deleted_at IS NULL
    AND data <= p_ate_data;

  RETURN COALESCE(v_saldo_inicial, 0) + v_entradas - v_saidas;
END; $$;

-- ── 13. RLS ───────────────────────────────────────────────────
ALTER TABLE public.fin_payment_methods     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_cost_centers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_tithe_justifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_document_types      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_categories          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_accounts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_periods             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_transactions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_transfers           ENABLE ROW LEVEL SECURITY;

-- Helper macro: membro do ministério
-- (reutiliza get_user_ministry_ids() e is_super_master() da migration 002)

-- Tabelas lookup (payment_methods, cost_centers, tithe_just, doc_types)
DO $$ DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['fin_payment_methods','fin_cost_centers','fin_tithe_justifications','fin_document_types']
  LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS "%s_select" ON public.%s;
      DROP POLICY IF EXISTS "%s_insert" ON public.%s;
      DROP POLICY IF EXISTS "%s_update" ON public.%s;
      CREATE POLICY "%s_select" ON public.%s FOR SELECT TO authenticated
        USING (ministry_id = ANY(public.get_user_ministry_ids()) OR public.is_super_master());
      CREATE POLICY "%s_insert" ON public.%s FOR INSERT TO authenticated
        WITH CHECK (ministry_id = ANY(public.get_user_ministry_ids()) OR public.is_super_master());
      CREATE POLICY "%s_update" ON public.%s FOR UPDATE TO authenticated
        USING (ministry_id = ANY(public.get_user_ministry_ids()) OR public.is_super_master());
    ', t,t, t,t, t,t, t,t, t,t, t,t);
  END LOOP;
END $$;

-- fin_categories
DROP POLICY IF EXISTS "fin_categories_select" ON public.fin_categories;
DROP POLICY IF EXISTS "fin_categories_insert" ON public.fin_categories;
DROP POLICY IF EXISTS "fin_categories_update" ON public.fin_categories;
CREATE POLICY "fin_categories_select" ON public.fin_categories FOR SELECT TO authenticated
  USING (ministry_id = ANY(public.get_user_ministry_ids()) OR public.is_super_master());
CREATE POLICY "fin_categories_insert" ON public.fin_categories FOR INSERT TO authenticated
  WITH CHECK (ministry_id = ANY(public.get_user_ministry_ids()) OR public.is_super_master());
CREATE POLICY "fin_categories_update" ON public.fin_categories FOR UPDATE TO authenticated
  USING (ministry_id = ANY(public.get_user_ministry_ids()) OR public.is_super_master());

-- fin_accounts
DROP POLICY IF EXISTS "fin_accounts_select" ON public.fin_accounts;
DROP POLICY IF EXISTS "fin_accounts_insert" ON public.fin_accounts;
DROP POLICY IF EXISTS "fin_accounts_update" ON public.fin_accounts;
CREATE POLICY "fin_accounts_select" ON public.fin_accounts FOR SELECT TO authenticated
  USING (ministry_id = ANY(public.get_user_ministry_ids()) OR public.is_super_master());
CREATE POLICY "fin_accounts_insert" ON public.fin_accounts FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_master()
    OR (ministry_id = ANY(public.get_user_ministry_ids()) AND public.get_user_level(ministry_id) <= 2)
  );
CREATE POLICY "fin_accounts_update" ON public.fin_accounts FOR UPDATE TO authenticated
  USING (
    public.is_super_master()
    OR (ministry_id = ANY(public.get_user_ministry_ids()) AND public.get_user_level(ministry_id) <= 2)
  );

-- fin_periods
DROP POLICY IF EXISTS "fin_periods_select" ON public.fin_periods;
DROP POLICY IF EXISTS "fin_periods_insert" ON public.fin_periods;
DROP POLICY IF EXISTS "fin_periods_update" ON public.fin_periods;
CREATE POLICY "fin_periods_select" ON public.fin_periods FOR SELECT TO authenticated
  USING (ministry_id = ANY(public.get_user_ministry_ids()) OR public.is_super_master());
CREATE POLICY "fin_periods_insert" ON public.fin_periods FOR INSERT TO authenticated
  WITH CHECK (ministry_id = ANY(public.get_user_ministry_ids()) OR public.is_super_master());
CREATE POLICY "fin_periods_update" ON public.fin_periods FOR UPDATE TO authenticated
  USING (
    public.is_super_master()
    OR (ministry_id = ANY(public.get_user_ministry_ids()) AND public.get_user_level(ministry_id) <= 2)
  );

-- fin_transactions
DROP POLICY IF EXISTS "fin_tx_select" ON public.fin_transactions;
DROP POLICY IF EXISTS "fin_tx_insert" ON public.fin_transactions;
DROP POLICY IF EXISTS "fin_tx_update" ON public.fin_transactions;
CREATE POLICY "fin_tx_select" ON public.fin_transactions FOR SELECT TO authenticated
  USING (ministry_id = ANY(public.get_user_ministry_ids()) OR public.is_super_master());
CREATE POLICY "fin_tx_insert" ON public.fin_transactions FOR INSERT TO authenticated
  WITH CHECK (ministry_id = ANY(public.get_user_ministry_ids()) OR public.is_super_master());
CREATE POLICY "fin_tx_update" ON public.fin_transactions FOR UPDATE TO authenticated
  USING (ministry_id = ANY(public.get_user_ministry_ids()) OR public.is_super_master());

-- fin_transfers
DROP POLICY IF EXISTS "fin_transfers_select" ON public.fin_transfers;
DROP POLICY IF EXISTS "fin_transfers_insert" ON public.fin_transfers;
CREATE POLICY "fin_transfers_select" ON public.fin_transfers FOR SELECT TO authenticated
  USING (ministry_id = ANY(public.get_user_ministry_ids()) OR public.is_super_master());
CREATE POLICY "fin_transfers_insert" ON public.fin_transfers FOR INSERT TO authenticated
  WITH CHECK (ministry_id = ANY(public.get_user_ministry_ids()) OR public.is_super_master());

-- ── 14. SEED — Plano de Contas padrão + tabelas lookup ───────
DO $$ DECLARE
  v_min uuid := '00000001-0000-0000-0000-000000000001';

  -- IDs das categorias raiz
  c_rec uuid := gen_random_uuid();  -- 1 Receitas
  c_des uuid := gen_random_uuid();  -- 2 Despesas
  c_trf uuid := gen_random_uuid();  -- 9 Transferências (interno)

  -- Receitas nível 2
  c_diz uuid := gen_random_uuid();  -- 1.1 Dízimos
  c_ofe uuid := gen_random_uuid();  -- 1.2 Ofertas Gerais
  c_mis uuid := gen_random_uuid();  -- 1.3 Missões
  c_con uuid := gen_random_uuid();  -- 1.4 Construção
  c_evt uuid := gen_random_uuid();  -- 1.5 Eventos
  c_don uuid := gen_random_uuid();  -- 1.6 Doações Diversas

  -- Despesas nível 2
  c_sal uuid := gen_random_uuid();  -- 2.1 Salários / Honorários
  c_mat uuid := gen_random_uuid();  -- 2.2 Materiais e Suprimentos
  c_ser uuid := gen_random_uuid();  -- 2.3 Serviços e Utilidades
  c_mnt uuid := gen_random_uuid();  -- 2.4 Manutenção
  c_adm uuid := gen_random_uuid();  -- 2.5 Administrativo

  -- Transferências internas
  c_trf_s uuid := gen_random_uuid(); -- TRF-S saída
  c_trf_e uuid := gen_random_uuid(); -- TRF-E entrada

BEGIN

-- PLANO DE CONTAS
INSERT INTO public.fin_categories (id, ministry_id, parent_id, codigo, nome, tipo, fundo, ordem) VALUES
  -- Grupos raiz
  (c_rec, v_min, NULL, '1',   'Receitas',              'RECEITA', 'OUTRO',       1),
  (c_des, v_min, NULL, '2',   'Despesas',              'DESPESA', 'OUTRO',       2),
  (c_trf, v_min, NULL, '9',   'Transferências',        'DESPESA', 'OUTRO',       9),
  -- Receitas
  (c_diz, v_min, c_rec, '1.1', 'Dízimos',             'RECEITA', 'DIZIMO',      1),
  (c_ofe, v_min, c_rec, '1.2', 'Ofertas Gerais',      'RECEITA', 'OFERTA',      2),
  (c_mis, v_min, c_rec, '1.3', 'Missões',             'RECEITA', 'MISSOES',     3),
  (c_con, v_min, c_rec, '1.4', 'Construção',          'RECEITA', 'CONSTRUCAO',  4),
  (c_evt, v_min, c_rec, '1.5', 'Eventos',             'RECEITA', 'EVENTO',      5),
  (c_don, v_min, c_rec, '1.6', 'Doações Diversas',    'RECEITA', 'OUTRO',       6),
  -- Despesas
  (c_sal, v_min, c_des, '2.1', 'Salários / Honorários','DESPESA','OUTRO',       1),
  (c_mat, v_min, c_des, '2.2', 'Materiais e Suprimentos','DESPESA','OUTRO',     2),
  (c_ser, v_min, c_des, '2.3', 'Serviços e Utilidades','DESPESA','OUTRO',       3),
  (c_mnt, v_min, c_des, '2.4', 'Manutenção',          'DESPESA', 'OUTRO',       4),
  (c_adm, v_min, c_des, '2.5', 'Administrativo',      'DESPESA', 'OUTRO',       5),
  -- Subcontas de dízimos
  (gen_random_uuid(), v_min, c_diz, '1.1.1', 'Dízimos — Membros Ativos',     'RECEITA','DIZIMO', 1),
  (gen_random_uuid(), v_min, c_diz, '1.1.2', 'Dízimos — Pré-membros',        'RECEITA','DIZIMO', 2),
  -- Transferências internas
  (c_trf_s, v_min, c_trf, 'TRF-S', 'Saída por Transferência',  'DESPESA','OUTRO', 1),
  (c_trf_e, v_min, c_trf, 'TRF-E', 'Entrada por Transferência','RECEITA','OUTRO', 2)
ON CONFLICT (ministry_id, codigo) DO NOTHING;

-- FORMAS DE PAGAMENTO
INSERT INTO public.fin_payment_methods (ministry_id, nome) VALUES
  (v_min, 'Dinheiro'),
  (v_min, 'PIX'),
  (v_min, 'Transferência Bancária'),
  (v_min, 'Cartão Débito'),
  (v_min, 'Cartão Crédito'),
  (v_min, 'Boleto'),
  (v_min, 'Cheque'),
  (v_min, 'Depósito')
ON CONFLICT DO NOTHING;

-- CENTROS DE CUSTO
INSERT INTO public.fin_cost_centers (ministry_id, nome) VALUES
  (v_min, 'Fixo'),
  (v_min, 'Variável'),
  (v_min, 'Louvor / Música'),
  (v_min, 'Secretaria'),
  (v_min, 'Missões'),
  (v_min, 'Eventos')
ON CONFLICT DO NOTHING;

-- JUSTIFICATIVAS DE DÍZIMOS
INSERT INTO public.fin_tithe_justifications (ministry_id, nome) VALUES
  (v_min, 'Desemprego'),
  (v_min, 'Dízimo Atrasado'),
  (v_min, 'Doença / Afastamento'),
  (v_min, 'Viagem'),
  (v_min, 'Dificuldade Financeira'),
  (v_min, 'Outro Motivo')
ON CONFLICT DO NOTHING;

-- TIPOS DE DOCUMENTOS
INSERT INTO public.fin_document_types (ministry_id, nome) VALUES
  (v_min, 'Nota Fiscal'),
  (v_min, 'Cupom Fiscal'),
  (v_min, 'Recibo'),
  (v_min, 'Boleto'),
  (v_min, 'Fatura / Duplicata'),
  (v_min, 'Sem Documento')
ON CONFLICT DO NOTHING;

RAISE NOTICE 'Seed Tesouraria concluído: plano de contas + tabelas lookup inseridos.';
END $$;
