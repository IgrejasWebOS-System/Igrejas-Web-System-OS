-- ============================================================
-- Migration 025 — Módulo Eventos (Fase 9)
-- Gestão de eventos, inscrições e check-in/presença
-- ============================================================

-- ── 1. EVENTS ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.events (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id     uuid        NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  unit_id         uuid        REFERENCES public.units(id) ON DELETE SET NULL,
  -- NULL = evento global do ministério; preenchido = pertence à unidade

  titulo          text        NOT NULL,
  descricao       text,
  tipo            text        NOT NULL DEFAULT 'OUTRO'
                    CHECK (tipo IN ('CULTO','CONFERENCIA','RETIRO','CONGRESSO',
                                    'ENCONTRO','SEMINARIO','SHOW_GOSPEL','OUTRO')),
  status          text        NOT NULL DEFAULT 'RASCUNHO'
                    CHECK (status IN ('RASCUNHO','PUBLICADO','ENCERRADO','CANCELADO')),

  data_inicio     timestamptz NOT NULL,
  data_fim        timestamptz,
  local_nome      text,
  local_endereco  text,

  capacidade      integer     CHECK (capacidade > 0),
  -- NULL = sem limite de vagas

  inscricao_aberta        boolean     NOT NULL DEFAULT true,
  inscricao_requer_aprovacao boolean  NOT NULL DEFAULT false,
  -- false = inscrição automática confirmada
  -- true  = fica como PENDENTE até N2+ aprovar

  capa_url        text,
  responsavel_party_id uuid REFERENCES public.parties(id) ON DELETE SET NULL,

  deleted_at      timestamptz,
  created_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── 2. EVENT_REGISTRATIONS ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.event_registrations (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id uuid        NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  event_id    uuid        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  party_id    uuid        REFERENCES public.parties(id) ON DELETE SET NULL,
  -- NULL = inscrito externo (não membro)
  nome_externo    text,
  -- preenchido quando party_id IS NULL
  telefone_externo text,

  status      text        NOT NULL DEFAULT 'CONFIRMADO'
                CHECK (status IN ('PENDENTE','CONFIRMADO','CANCELADO','LISTA_ESPERA')),

  inscrito_por uuid       REFERENCES auth.users(id) ON DELETE SET NULL,
  observacao  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (event_id, party_id)
  -- um membro só pode se inscrever uma vez por evento
);

-- ── 3. EVENT_CHECKINS ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.event_checkins (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id     uuid        NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  event_id        uuid        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  registration_id uuid        REFERENCES public.event_registrations(id) ON DELETE SET NULL,
  party_id        uuid        REFERENCES public.parties(id) ON DELETE SET NULL,
  -- pode haver check-in sem inscrição prévia (entrada direta)
  nome_avulso     text,
  -- para pessoas sem cadastro e sem inscrição

  checkin_at      timestamptz NOT NULL DEFAULT now(),
  checkin_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,

  UNIQUE (event_id, registration_id),
  UNIQUE (event_id, party_id)
);

-- ── 4. SEQUÊNCIA de número de inscrição ──────────────────────

CREATE TABLE IF NOT EXISTS public.event_registration_sequences (
  event_id    uuid PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE,
  last_number integer NOT NULL DEFAULT 0
);

-- ── 5. FUNÇÕES ────────────────────────────────────────────────

-- Contagem de inscritos confirmados
CREATE OR REPLACE FUNCTION public.event_inscritos_count(p_event_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COUNT(*)::integer
    FROM public.event_registrations
   WHERE event_id = p_event_id
     AND status IN ('CONFIRMADO','PENDENTE');
$$;

-- Vagas disponíveis (NULL = ilimitado)
CREATE OR REPLACE FUNCTION public.event_vagas_disponiveis(p_event_id uuid)
RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_cap    integer;
  v_count  integer;
BEGIN
  SELECT capacidade INTO v_cap FROM public.events WHERE id = p_event_id;
  IF v_cap IS NULL THEN RETURN NULL; END IF;
  SELECT event_inscritos_count(p_event_id) INTO v_count;
  RETURN GREATEST(0, v_cap - v_count);
END;
$$;

-- Contagem de check-ins
CREATE OR REPLACE FUNCTION public.event_checkins_count(p_event_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COUNT(*)::integer FROM public.event_checkins WHERE event_id = p_event_id;
$$;

-- ── 6. TRIGGERS updated_at ───────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at_events()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_events_updated_at ON public.events;
CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_events();

DROP TRIGGER IF EXISTS trg_event_reg_updated_at ON public.event_registrations;
CREATE TRIGGER trg_event_reg_updated_at
  BEFORE UPDATE ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_events();

-- ── 7. RLS ────────────────────────────────────────────────────

ALTER TABLE public.events                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_checkins               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registration_sequences ENABLE ROW LEVEL SECURITY;

-- events
DROP POLICY IF EXISTS "events_select" ON public.events;
DROP POLICY IF EXISTS "events_insert" ON public.events;
DROP POLICY IF EXISTS "events_update" ON public.events;
DROP POLICY IF EXISTS "events_super"  ON public.events;

CREATE POLICY "events_select" ON public.events
  FOR SELECT USING (ministry_id = ANY(get_user_ministry_ids()) AND deleted_at IS NULL);
CREATE POLICY "events_insert" ON public.events
  FOR INSERT WITH CHECK (ministry_id = ANY(get_user_ministry_ids()));
CREATE POLICY "events_update" ON public.events
  FOR UPDATE USING (ministry_id = ANY(get_user_ministry_ids()));
CREATE POLICY "events_super" ON public.events
  USING (is_super_master());

-- event_registrations
DROP POLICY IF EXISTS "event_reg_select" ON public.event_registrations;
DROP POLICY IF EXISTS "event_reg_insert" ON public.event_registrations;
DROP POLICY IF EXISTS "event_reg_update" ON public.event_registrations;
DROP POLICY IF EXISTS "event_reg_super"  ON public.event_registrations;

CREATE POLICY "event_reg_select" ON public.event_registrations
  FOR SELECT USING (ministry_id = ANY(get_user_ministry_ids()));
CREATE POLICY "event_reg_insert" ON public.event_registrations
  FOR INSERT WITH CHECK (ministry_id = ANY(get_user_ministry_ids()));
CREATE POLICY "event_reg_update" ON public.event_registrations
  FOR UPDATE USING (ministry_id = ANY(get_user_ministry_ids()));
CREATE POLICY "event_reg_super" ON public.event_registrations
  USING (is_super_master());

-- event_checkins
DROP POLICY IF EXISTS "event_checkins_select" ON public.event_checkins;
DROP POLICY IF EXISTS "event_checkins_insert" ON public.event_checkins;
DROP POLICY IF EXISTS "event_checkins_super"  ON public.event_checkins;

CREATE POLICY "event_checkins_select" ON public.event_checkins
  FOR SELECT USING (ministry_id = ANY(get_user_ministry_ids()));
CREATE POLICY "event_checkins_insert" ON public.event_checkins
  FOR INSERT WITH CHECK (ministry_id = ANY(get_user_ministry_ids()));
CREATE POLICY "event_checkins_super" ON public.event_checkins
  USING (is_super_master());

-- sequences (apenas leitura pelo RLS; escrita via SECURITY DEFINER)
DROP POLICY IF EXISTS "event_seq_select" ON public.event_registration_sequences;
DROP POLICY IF EXISTS "event_seq_super"  ON public.event_registration_sequences;

CREATE POLICY "event_seq_select" ON public.event_registration_sequences
  FOR SELECT USING (
    event_id IN (SELECT id FROM public.events WHERE ministry_id = ANY(get_user_ministry_ids()))
  );
CREATE POLICY "event_seq_super" ON public.event_registration_sequences
  USING (is_super_master());
