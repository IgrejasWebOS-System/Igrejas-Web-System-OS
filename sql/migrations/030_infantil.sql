-- ============================================================
-- Migration 030 — Ministério Infantil
-- ============================================================

CREATE TABLE IF NOT EXISTS public.child_profiles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id  uuid NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  unit_id      uuid REFERENCES public.units(id) ON DELETE SET NULL,
  nome         text NOT NULL,
  data_nascimento date,
  alergias     text,
  observacoes  text,
  foto_url     text,
  ativo        boolean NOT NULL DEFAULT true,
  qr_token     text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.child_responsibles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id uuid NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  child_id    uuid NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  party_id    uuid REFERENCES public.parties(id) ON DELETE SET NULL,
  nome        text NOT NULL,  -- fallback se não for membro
  telefone    text,
  parentesco  text NOT NULL DEFAULT 'MAE' CHECK (parentesco IN ('PAI','MAE','AVO','AVOA','TIO','TIA','RESPONSAVEL','OUTRO')),
  pode_buscar boolean NOT NULL DEFAULT true,
  principal   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.child_classes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id uuid NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  unit_id     uuid REFERENCES public.units(id) ON DELETE SET NULL,
  nome        text NOT NULL,
  faixa_etaria_min integer,   -- anos
  faixa_etaria_max integer,
  professor_party_id uuid REFERENCES public.parties(id) ON DELETE SET NULL,
  sala        text,
  ativo       boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.child_checkins (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id uuid NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  child_id    uuid NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  class_id    uuid REFERENCES public.child_classes(id) ON DELETE SET NULL,
  data        date NOT NULL DEFAULT CURRENT_DATE,
  checkin_em  timestamptz NOT NULL DEFAULT now(),
  checkout_em timestamptz,
  checkin_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  checkout_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  responsavel_busca text,     -- nome de quem buscou
  etiqueta_codigo text UNIQUE DEFAULT encode(gen_random_bytes(4), 'hex'),
  observacoes text
);

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_child_profiles_updated_at ON public.child_profiles;
CREATE TRIGGER trg_child_profiles_updated_at BEFORE UPDATE ON public.child_profiles FOR EACH ROW EXECUTE FUNCTION trg_updated_at_fn();

-- Índices
CREATE INDEX IF NOT EXISTS idx_child_profiles_ministry ON public.child_profiles(ministry_id);
CREATE INDEX IF NOT EXISTS idx_child_checkins_data     ON public.child_checkins(data);
CREATE INDEX IF NOT EXISTS idx_child_checkins_child    ON public.child_checkins(child_id);

-- RLS
ALTER TABLE public.child_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_responsibles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_classes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_checkins    ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT unnest(ARRAY['child_profiles','child_responsibles','child_classes','child_checkins'])
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
