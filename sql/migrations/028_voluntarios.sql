-- ============================================================
-- Migration 028 — Voluntários & Escalas
-- ============================================================

-- Perfil de voluntário
CREATE TABLE IF NOT EXISTS public.volunteer_profiles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id uuid NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  party_id    uuid NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
  areas       text[] NOT NULL DEFAULT '{}',  -- ex: ['MUSICA','RECEPCAO','MIDIA','INFANTIL']
  disponibilidade text,                       -- texto livre
  observacoes text,
  ativo       boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ministry_id, party_id)
);

-- Times/ministérios de serviço
CREATE TABLE IF NOT EXISTS public.ministry_teams (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id uuid NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  unit_id     uuid REFERENCES public.units(id) ON DELETE SET NULL,
  nome        text NOT NULL,
  descricao   text,
  area        text NOT NULL DEFAULT 'OUTRO'
              CHECK (area IN ('MUSICA','RECEPCAO','MIDIA','INFANTIL','LIMPEZA','SEGURANCA','INTERCESSAO','OUTRO')),
  lider_party_id uuid REFERENCES public.parties(id) ON DELETE SET NULL,
  ativo       boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Escalas semanais
CREATE TABLE IF NOT EXISTS public.service_schedules (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id uuid NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  team_id     uuid NOT NULL REFERENCES public.ministry_teams(id) ON DELETE CASCADE,
  data        date NOT NULL,
  turno       text NOT NULL DEFAULT 'MANHA' CHECK (turno IN ('MANHA','TARDE','NOITE','INTEGRAL')),
  descricao   text,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Confirmações de escala
CREATE TABLE IF NOT EXISTS public.schedule_confirmations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id     uuid NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  schedule_id     uuid NOT NULL REFERENCES public.service_schedules(id) ON DELETE CASCADE,
  volunteer_id    uuid NOT NULL REFERENCES public.volunteer_profiles(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'CONVOCADO'
                  CHECK (status IN ('CONVOCADO','CONFIRMADO','RECUSADO','SUBSTITUIDO')),
  motivo_recusa   text,
  substituto_id   uuid REFERENCES public.volunteer_profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (schedule_id, volunteer_id)
);

-- Triggers updated_at
CREATE OR REPLACE FUNCTION trg_updated_at_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_vol_profiles_updated_at ON public.volunteer_profiles;
CREATE TRIGGER trg_vol_profiles_updated_at BEFORE UPDATE ON public.volunteer_profiles FOR EACH ROW EXECUTE FUNCTION trg_updated_at_fn();

DROP TRIGGER IF EXISTS trg_sched_conf_updated_at ON public.schedule_confirmations;
CREATE TRIGGER trg_sched_conf_updated_at BEFORE UPDATE ON public.schedule_confirmations FOR EACH ROW EXECUTE FUNCTION trg_updated_at_fn();

-- Índices
CREATE INDEX IF NOT EXISTS idx_vol_profiles_ministry  ON public.volunteer_profiles(ministry_id);
CREATE INDEX IF NOT EXISTS idx_teams_ministry         ON public.ministry_teams(ministry_id);
CREATE INDEX IF NOT EXISTS idx_schedules_ministry     ON public.service_schedules(ministry_id);
CREATE INDEX IF NOT EXISTS idx_schedules_data         ON public.service_schedules(data);
CREATE INDEX IF NOT EXISTS idx_confirmations_schedule ON public.schedule_confirmations(schedule_id);

-- RLS
ALTER TABLE public.volunteer_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ministry_teams        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_schedules     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_confirmations ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT unnest(ARRAY['volunteer_profiles','ministry_teams','service_schedules','schedule_confirmations'])
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
