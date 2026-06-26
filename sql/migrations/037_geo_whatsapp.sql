-- ============================================================
-- Migration 037 — Geolocalização + WhatsApp Business (scaffold)
-- ============================================================

-- Localização de unidades/membros
CREATE TABLE IF NOT EXISTS public.party_locations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id uuid NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  party_id    uuid NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
  latitude    numeric(10,7),
  longitude   numeric(10,7),
  endereco    text,
  cidade      text,
  estado      text,
  cep         text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ministry_id, party_id)
);

-- WhatsApp Business scaffold
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id uuid NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  phone_number_id text,      -- Meta WhatsApp Business Phone Number ID
  access_token_enc text,     -- criptografado
  verify_token text,
  ativo       boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id  uuid NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  session_id   uuid REFERENCES public.whatsapp_sessions(id) ON DELETE SET NULL,
  party_id     uuid REFERENCES public.parties(id) ON DELETE SET NULL,
  telefone     text NOT NULL,
  direcao      text NOT NULL DEFAULT 'SAIDA' CHECK (direcao IN ('ENTRADA','SAIDA')),
  tipo         text NOT NULL DEFAULT 'TEXTO' CHECK (tipo IN ('TEXTO','TEMPLATE','MIDIA')),
  conteudo     text,
  status       text NOT NULL DEFAULT 'ENVIADO' CHECK (status IN ('ENVIADO','ENTREGUE','LIDO','FALHOU')),
  whatsapp_id  text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_party_locations_ministry ON public.party_locations(ministry_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_msgs_ministry   ON public.whatsapp_messages(ministry_id);

-- RLS
ALTER TABLE public.party_locations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT unnest(ARRAY['party_locations','whatsapp_sessions','whatsapp_messages'])
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
