-- ============================================================
-- Migration 036 — Gateway de Pagamento Pagar.me / Stripe
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payment_gateways (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id  uuid NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  provider     text NOT NULL DEFAULT 'PAGARME' CHECK (provider IN ('PAGARME','STRIPE','MERCADOPAGO')),
  api_key_enc  text,          -- key criptografada em repouso (TODO: encrypt)
  config       jsonb NOT NULL DEFAULT '{}',
  ativo        boolean NOT NULL DEFAULT false,
  test_mode    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ministry_id, provider)
);

CREATE TABLE IF NOT EXISTS public.payment_orders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id      uuid NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  gateway_id       uuid NOT NULL REFERENCES public.payment_gateways(id) ON DELETE RESTRICT,
  referencia_tipo  text NOT NULL,  -- EVENTO, CURSO, DOACAO
  referencia_id    uuid,
  party_id         uuid REFERENCES public.parties(id) ON DELETE SET NULL,
  valor            numeric(14,2) NOT NULL,
  moeda            text NOT NULL DEFAULT 'BRL',
  status           text NOT NULL DEFAULT 'PENDENTE'
                   CHECK (status IN ('PENDENTE','PAGO','CANCELADO','REEMBOLSADO','FALHOU')),
  gateway_order_id text,
  gateway_payload  jsonb,
  pago_em          timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_payment_orders_ministry ON public.payment_orders(ministry_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status   ON public.payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_party    ON public.payment_orders(party_id);

-- RLS
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_orders   ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT unnest(ARRAY['payment_gateways','payment_orders'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_super"  ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "%s_select" ON public.%I FOR SELECT USING (ministry_id = ANY(get_user_ministry_ids()))', t, t);
    EXECUTE format('CREATE POLICY "%s_insert" ON public.%I FOR INSERT WITH CHECK (ministry_id = ANY(get_user_ministry_ids()))', t, t);
    EXECUTE format('CREATE POLICY "%s_update" ON public.%I FOR UPDATE USING (ministry_id = ANY(get_user_ministry_ids()))', t, t);
    EXECUTE format('CREATE POLICY "%s_super"  ON public.%I FOR ALL USING (is_super_master())', t, t);
  END LOOP;
END $$;
