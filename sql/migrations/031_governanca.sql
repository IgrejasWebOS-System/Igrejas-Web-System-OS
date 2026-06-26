-- ============================================================
-- Migration 031 — Governança & LGPD
-- ============================================================

CREATE TABLE IF NOT EXISTS public.governance_meetings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id  uuid NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  tipo         text NOT NULL DEFAULT 'REUNIAO'
               CHECK (tipo IN ('ASSEMBLEIA','CONSELHO','REUNIAO','COMITE')),
  titulo       text NOT NULL,
  data         date NOT NULL,
  hora_inicio  time,
  hora_fim     time,
  local        text,
  pauta        text,
  quorum_minimo integer,
  status       text NOT NULL DEFAULT 'AGENDADA'
               CHECK (status IN ('AGENDADA','REALIZADA','CANCELADA')),
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.governance_minutes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id  uuid NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  meeting_id   uuid NOT NULL REFERENCES public.governance_meetings(id) ON DELETE CASCADE,
  numero_ata   text,
  conteudo     text NOT NULL,
  presentes    integer,
  ausentes     integer,
  deliberacoes jsonb NOT NULL DEFAULT '[]',  -- [{assunto, decisao, votacao}]
  aprovada     boolean NOT NULL DEFAULT false,
  aprovada_em  timestamptz,
  assinaturas  jsonb NOT NULL DEFAULT '[]',  -- [{party_id, nome, cargo, assinado_em}]
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.governance_mandates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id  uuid NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  party_id     uuid NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
  cargo        text NOT NULL,
  inicio       date NOT NULL,
  fim          date,
  eleito_em    date,
  referencia   text,       -- ata de eleição
  ativo        boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lgpd_consents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id uuid NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  party_id    uuid NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
  finalidade  text NOT NULL,  -- ex: COMUNICACAO, IMAGEM, DADOS_PASTORAIS
  consentiu   boolean NOT NULL DEFAULT false,
  versao      text,
  ip_origem   text,
  dados_extras jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  revogado_em timestamptz,
  UNIQUE (ministry_id, party_id, finalidade)
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id  uuid NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  party_id     uuid REFERENCES public.parties(id) ON DELETE SET NULL,
  acao         text NOT NULL,   -- INSERT, UPDATE, DELETE, LOGIN, EXPORT
  tabela       text,
  registro_id  uuid,
  detalhes     jsonb,
  ip           text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_gov_meetings_ministry  ON public.governance_meetings(ministry_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_gov_minutes_meeting    ON public.governance_minutes(meeting_id);
CREATE INDEX IF NOT EXISTS idx_gov_mandates_ministry  ON public.governance_mandates(ministry_id);
CREATE INDEX IF NOT EXISTS idx_lgpd_consents_ministry ON public.lgpd_consents(ministry_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ministry    ON public.audit_logs(ministry_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user        ON public.audit_logs(user_id);

-- Triggers
DROP TRIGGER IF EXISTS trg_gov_minutes_updated_at ON public.governance_minutes;
CREATE TRIGGER trg_gov_minutes_updated_at BEFORE UPDATE ON public.governance_minutes FOR EACH ROW EXECUTE FUNCTION trg_updated_at_fn();

-- RLS
ALTER TABLE public.governance_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_minutes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_mandates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lgpd_consents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs          ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT unnest(ARRAY['governance_meetings','governance_minutes','governance_mandates','lgpd_consents','audit_logs'])
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
