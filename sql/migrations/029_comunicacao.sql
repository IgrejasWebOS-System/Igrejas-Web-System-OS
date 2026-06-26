-- ============================================================
-- Migration 029 — Comunicação Omnichannel
-- ============================================================

CREATE TABLE IF NOT EXISTS public.comm_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id uuid NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  nome        text NOT NULL,
  canal       text NOT NULL DEFAULT 'EMAIL'
              CHECK (canal IN ('EMAIL','WHATSAPP','SMS','PUSH')),
  assunto     text,
  corpo       text NOT NULL,
  variaveis   text[] NOT NULL DEFAULT '{}',  -- ex: ['nome','data','link']
  ativo       boolean NOT NULL DEFAULT true,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.comm_campaigns (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id     uuid NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  template_id     uuid REFERENCES public.comm_templates(id) ON DELETE SET NULL,
  nome            text NOT NULL,
  status          text NOT NULL DEFAULT 'RASCUNHO'
                  CHECK (status IN ('RASCUNHO','AGENDADA','ENVIANDO','CONCLUIDA','CANCELADA')),
  destinatarios   jsonb NOT NULL DEFAULT '{}',  -- {segmento:"TODOS"|"ATIVOS"|"ANIVERSARIANTES", unit_id?, filtros?}
  total_enviados  integer NOT NULL DEFAULT 0,
  total_erros     integer NOT NULL DEFAULT 0,
  agendado_para   timestamptz,
  iniciado_em     timestamptz,
  concluido_em    timestamptz,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.comm_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id  uuid NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  campaign_id  uuid REFERENCES public.comm_campaigns(id) ON DELETE SET NULL,
  template_id  uuid REFERENCES public.comm_templates(id) ON DELETE SET NULL,
  party_id     uuid REFERENCES public.parties(id) ON DELETE SET NULL,
  canal        text NOT NULL,
  destinatario text NOT NULL,  -- email ou telefone
  status       text NOT NULL DEFAULT 'ENVIADO'
               CHECK (status IN ('ENVIADO','ENTREGUE','FALHOU','BOUNCE')),
  erro         text,
  provider_id  text,           -- ID externo (SendGrid message_id, etc.)
  enviado_em   timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_comm_templates_ministry  ON public.comm_templates(ministry_id);
CREATE INDEX IF NOT EXISTS idx_comm_campaigns_ministry  ON public.comm_campaigns(ministry_id);
CREATE INDEX IF NOT EXISTS idx_comm_logs_ministry       ON public.comm_logs(ministry_id);
CREATE INDEX IF NOT EXISTS idx_comm_logs_campaign       ON public.comm_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_comm_logs_enviado_em     ON public.comm_logs(enviado_em DESC);

-- Triggers
DROP TRIGGER IF EXISTS trg_comm_templates_updated_at ON public.comm_templates;
CREATE TRIGGER trg_comm_templates_updated_at BEFORE UPDATE ON public.comm_templates FOR EACH ROW EXECUTE FUNCTION trg_updated_at_fn();

-- RLS
ALTER TABLE public.comm_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comm_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comm_logs      ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT unnest(ARRAY['comm_templates','comm_campaigns','comm_logs'])
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
