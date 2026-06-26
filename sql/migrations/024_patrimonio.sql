-- ============================================================
-- Migration 024 — Módulo Patrimônio (Fase 8)
-- Inventário de bens, tombamento, depreciação e movimentações
-- ============================================================

-- ── 1. PATRIMONY_ITEMS — Cadastro de Bens ─────────────────────

CREATE TABLE IF NOT EXISTS public.patrimony_items (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id             uuid        NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  unit_id                 uuid        REFERENCES public.units(id) ON DELETE SET NULL,
  numero_tombamento       text        NOT NULL,
  nome                    text        NOT NULL,
  descricao               text,
  categoria               text        NOT NULL DEFAULT 'OUTRO'
                            CHECK (categoria IN ('IMOVEL','MOVEL','EQUIPAMENTO','VEICULO',
                                                 'INSTRUMENTO_MUSICAL','INFORMATICA','OUTRO')),
  valor_aquisicao         numeric(14,2) NOT NULL CHECK (valor_aquisicao >= 0),
  data_aquisicao          date        NOT NULL,
  fornecedor              text,
  nota_fiscal             text,
  vida_util_anos          integer     CHECK (vida_util_anos > 0),
  taxa_depreciacao_anual  numeric(5,2) CHECK (taxa_depreciacao_anual >= 0 AND taxa_depreciacao_anual <= 100),
  valor_residual          numeric(14,2) DEFAULT 0,
  localizacao_unit_id     uuid        REFERENCES public.units(id) ON DELETE SET NULL,
  responsavel_party_id    uuid        REFERENCES public.parties(id) ON DELETE SET NULL,
  status                  text        NOT NULL DEFAULT 'ATIVO'
                            CHECK (status IN ('ATIVO','BAIXADO','EM_MANUTENCAO','TRANSFERIDO')),
  chart_account_id        uuid        REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  foto_url                text,
  deleted_at              timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ministry_id, numero_tombamento)
);

-- ── 2. PATRIMONY_MOVEMENTS — Histórico de Movimentações ───────

CREATE TABLE IF NOT EXISTS public.patrimony_movements (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id          uuid        NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  item_id              uuid        NOT NULL REFERENCES public.patrimony_items(id) ON DELETE CASCADE,
  tipo                 text        NOT NULL
                         CHECK (tipo IN ('AQUISICAO','TRANSFERENCIA','BAIXA','MANUTENCAO',
                                         'RETORNO_MANUTENCAO','REAVALIACAO')),
  data                 date        NOT NULL,
  unit_from_id         uuid        REFERENCES public.units(id) ON DELETE SET NULL,
  unit_to_id           uuid        REFERENCES public.units(id) ON DELETE SET NULL,
  descricao            text        NOT NULL,
  responsavel_party_id uuid        REFERENCES public.parties(id) ON DELETE SET NULL,
  valor                numeric(14,2), -- novo valor em caso de reavaliação ou valor de baixa
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- ── 3. PATRIMONY_DEPRECIATIONS — Depreciação Mensal ───────────

CREATE TABLE IF NOT EXISTS public.patrimony_depreciations (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id       uuid        NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  item_id           uuid        NOT NULL REFERENCES public.patrimony_items(id) ON DELETE CASCADE,
  ano               integer     NOT NULL,
  mes               integer     NOT NULL CHECK (mes BETWEEN 1 AND 12),
  valor_depreciacao numeric(14,2) NOT NULL,
  valor_contabil    numeric(14,2) NOT NULL, -- valor após depreciação acumulada
  transaction_id    uuid        REFERENCES public.fin_transactions(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_id, ano, mes)
);

-- ── 4. SEQUÊNCIA — Tombamento automático ─────────────────────

CREATE TABLE IF NOT EXISTS public.patrimony_sequences (
  ministry_id uuid PRIMARY KEY REFERENCES public.ministries(id) ON DELETE CASCADE,
  last_number integer NOT NULL DEFAULT 0
);

-- ── 5. FUNÇÃO: Gerar número de tombamento ────────────────────

CREATE OR REPLACE FUNCTION public.gerar_numero_tombamento(p_ministry_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_next integer;
  v_prefix text;
BEGIN
  INSERT INTO public.patrimony_sequences (ministry_id, last_number)
  VALUES (p_ministry_id, 1)
  ON CONFLICT (ministry_id) DO UPDATE
    SET last_number = patrimony_sequences.last_number + 1
  RETURNING last_number INTO v_next;

  RETURN 'TOMB-' || LPAD(v_next::text, 6, '0');
END;
$$;

-- ── 6. FUNÇÃO: Calcular valor contábil atual ──────────────────

CREATE OR REPLACE FUNCTION public.calcular_valor_contabil(
  p_item_id uuid,
  p_ate_data date DEFAULT CURRENT_DATE
)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  item     public.patrimony_items%ROWTYPE;
  total_dep numeric;
BEGIN
  SELECT * INTO item FROM public.patrimony_items WHERE id = p_item_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  -- Somar depreciações registradas até a data
  SELECT COALESCE(SUM(valor_depreciacao), 0)
    INTO total_dep
    FROM public.patrimony_depreciations
   WHERE item_id = p_item_id
     AND (ano < EXTRACT(YEAR FROM p_ate_data)::int
          OR (ano = EXTRACT(YEAR FROM p_ate_data)::int
              AND mes <= EXTRACT(MONTH FROM p_ate_data)::int));

  RETURN GREATEST(
    item.valor_residual,
    item.valor_aquisicao - total_dep
  );
END;
$$;

-- ── 7. FUNÇÃO: Calcular depreciação mensal de um item ─────────

CREATE OR REPLACE FUNCTION public.calcular_depreciacao_mensal(p_item_id uuid)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  item public.patrimony_items%ROWTYPE;
  base_depreciavel numeric;
BEGIN
  SELECT * INTO item FROM public.patrimony_items WHERE id = p_item_id;
  IF NOT FOUND OR item.taxa_depreciacao_anual IS NULL THEN RETURN 0; END IF;

  base_depreciavel := item.valor_aquisicao - COALESCE(item.valor_residual, 0);
  RETURN ROUND((base_depreciavel * item.taxa_depreciacao_anual / 100) / 12, 2);
END;
$$;

-- ── 8. TRIGGER: atualizar status ao mover/baixar ─────────────

CREATE OR REPLACE FUNCTION patrimony_movement_trigger()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tipo = 'BAIXA' THEN
    UPDATE public.patrimony_items SET status = 'BAIXADO', updated_at = now() WHERE id = NEW.item_id;
  ELSIF NEW.tipo = 'MANUTENCAO' THEN
    UPDATE public.patrimony_items SET status = 'EM_MANUTENCAO', updated_at = now() WHERE id = NEW.item_id;
  ELSIF NEW.tipo = 'RETORNO_MANUTENCAO' THEN
    UPDATE public.patrimony_items SET status = 'ATIVO', updated_at = now() WHERE id = NEW.item_id;
  ELSIF NEW.tipo = 'TRANSFERENCIA' AND NEW.unit_to_id IS NOT NULL THEN
    UPDATE public.patrimony_items
      SET localizacao_unit_id = NEW.unit_to_id, status = 'ATIVO', updated_at = now()
     WHERE id = NEW.item_id;
  ELSIF NEW.tipo = 'REAVALIACAO' AND NEW.valor IS NOT NULL THEN
    UPDATE public.patrimony_items
      SET valor_aquisicao = NEW.valor, updated_at = now()
     WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_patrimony_movement ON public.patrimony_movements;
CREATE TRIGGER trg_patrimony_movement
  AFTER INSERT ON public.patrimony_movements
  FOR EACH ROW EXECUTE FUNCTION patrimony_movement_trigger();

-- ── 9. TRIGGER: updated_at ────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at_patrimony()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_patrimony_items_updated_at ON public.patrimony_items;
CREATE TRIGGER trg_patrimony_items_updated_at
  BEFORE UPDATE ON public.patrimony_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_patrimony();

-- ── 10. RLS ───────────────────────────────────────────────────

ALTER TABLE public.patrimony_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patrimony_movements   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patrimony_depreciations ENABLE ROW LEVEL SECURITY;

-- patrimony_items
DROP POLICY IF EXISTS "patrimony_items_select" ON public.patrimony_items;
DROP POLICY IF EXISTS "patrimony_items_insert" ON public.patrimony_items;
DROP POLICY IF EXISTS "patrimony_items_update" ON public.patrimony_items;
DROP POLICY IF EXISTS "patrimony_items_super"  ON public.patrimony_items;
CREATE POLICY "patrimony_items_select" ON public.patrimony_items
  FOR SELECT USING (ministry_id = ANY(get_user_ministry_ids()));
CREATE POLICY "patrimony_items_insert" ON public.patrimony_items
  FOR INSERT WITH CHECK (ministry_id = ANY(get_user_ministry_ids()));
CREATE POLICY "patrimony_items_update" ON public.patrimony_items
  FOR UPDATE USING (ministry_id = ANY(get_user_ministry_ids()));
CREATE POLICY "patrimony_items_super" ON public.patrimony_items
  USING (is_super_master());

-- patrimony_movements
DROP POLICY IF EXISTS "patrimony_movements_select" ON public.patrimony_movements;
DROP POLICY IF EXISTS "patrimony_movements_insert" ON public.patrimony_movements;
DROP POLICY IF EXISTS "patrimony_movements_super"  ON public.patrimony_movements;
CREATE POLICY "patrimony_movements_select" ON public.patrimony_movements
  FOR SELECT USING (ministry_id = ANY(get_user_ministry_ids()));
CREATE POLICY "patrimony_movements_insert" ON public.patrimony_movements
  FOR INSERT WITH CHECK (ministry_id = ANY(get_user_ministry_ids()));
CREATE POLICY "patrimony_movements_super" ON public.patrimony_movements
  USING (is_super_master());

-- patrimony_depreciations
DROP POLICY IF EXISTS "patrimony_depreciations_select" ON public.patrimony_depreciations;
DROP POLICY IF EXISTS "patrimony_depreciations_insert" ON public.patrimony_depreciations;
DROP POLICY IF EXISTS "patrimony_depreciations_super"  ON public.patrimony_depreciations;
CREATE POLICY "patrimony_depreciations_select" ON public.patrimony_depreciations
  FOR SELECT USING (ministry_id = ANY(get_user_ministry_ids()));
CREATE POLICY "patrimony_depreciations_insert" ON public.patrimony_depreciations
  FOR INSERT WITH CHECK (ministry_id = ANY(get_user_ministry_ids()));
CREATE POLICY "patrimony_depreciations_super" ON public.patrimony_depreciations
  USING (is_super_master());

-- ── 11. CATEGORIAS SUGERIDAS POR TIPO ─────────────────────────
-- Taxas de depreciação baseadas em NBR/SRF para entidades sem fins lucrativos

-- Referência de taxas sugeridas (não inseridas em tabela, apenas comment):
-- IMOVEL:              2.5% a.a.  (vida útil 40 anos)
-- VEICULO:            20.0% a.a.  (vida útil 5 anos)
-- EQUIPAMENTO:        10.0% a.a.  (vida útil 10 anos)
-- INFORMATICA:        20.0% a.a.  (vida útil 5 anos)
-- INSTRUMENTO_MUSICAL: 5.0% a.a.  (vida útil 20 anos)
-- MOVEL:               6.67% a.a. (vida útil 15 anos)
-- OUTRO:              10.0% a.a.  (padrão genérico)
