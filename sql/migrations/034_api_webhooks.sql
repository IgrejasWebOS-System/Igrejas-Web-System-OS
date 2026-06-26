-- ============================================================
-- Migration 034 — API Pública + Webhooks
-- ============================================================

CREATE TABLE IF NOT EXISTS public.api_clients (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id  uuid NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  nome         text NOT NULL,
  descricao    text,
  ativo        boolean NOT NULL DEFAULT true,
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.api_keys (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id  uuid NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  client_id    uuid NOT NULL REFERENCES public.api_clients(id) ON DELETE CASCADE,
  nome         text NOT NULL,
  key_hash     text NOT NULL UNIQUE,    -- sha256(key)
  key_prefix   text NOT NULL,           -- primeiros 8 chars para display
  escopos      text[] NOT NULL DEFAULT '{"membros:read"}',  -- membros:read, financeiro:read, eventos:read, etc.
  expira_em    timestamptz,
  ultimo_uso   timestamptz,
  ativo        boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id  uuid NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  url          text NOT NULL,
  eventos      text[] NOT NULL DEFAULT '{}',  -- membros.criado, financeiro.transacao, etc.
  secret       text,                          -- HMAC-SHA256 signing secret
  ativo        boolean NOT NULL DEFAULT true,
  falhas       integer NOT NULL DEFAULT 0,
  ultimo_envio timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id  uuid NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  endpoint_id  uuid NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  evento       text NOT NULL,
  payload      jsonb NOT NULL,
  status_http  integer,
  resposta     text,
  tentativas   integer NOT NULL DEFAULT 1,
  enviado_em   timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_api_keys_client   ON public.api_keys(client_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_ep   ON public.webhook_logs(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_data ON public.webhook_logs(enviado_em DESC);

-- RLS
ALTER TABLE public.api_clients       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs      ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT unnest(ARRAY['api_clients','api_keys','webhook_endpoints','webhook_logs'])
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
