-- ============================================================
-- Migration 032 — Permissões Granulares
-- ============================================================

CREATE TABLE IF NOT EXISTS public.permission_profiles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id  uuid NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  nome         text NOT NULL,
  descricao    text,
  nivel_base   integer NOT NULL DEFAULT 4 CHECK (nivel_base BETWEEN 0 AND 4),
  permissoes   jsonb NOT NULL DEFAULT '{}',  -- {modulo: {ler:bool, criar:bool, editar:bool, excluir:bool}}
  ativo        boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.permission_grants (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id  uuid NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id   uuid REFERENCES public.permission_profiles(id) ON DELETE SET NULL,
  -- Permissões ad-hoc (override)
  permissoes   jsonb NOT NULL DEFAULT '{}',
  granted_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  valido_ate   date,
  ativo        boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ministry_id, user_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_perm_profiles_ministry ON public.permission_profiles(ministry_id);
CREATE INDEX IF NOT EXISTS idx_perm_grants_user       ON public.permission_grants(user_id);
CREATE INDEX IF NOT EXISTS idx_perm_grants_ministry   ON public.permission_grants(ministry_id);

-- Triggers
DROP TRIGGER IF EXISTS trg_perm_profiles_updated_at ON public.permission_profiles;
CREATE TRIGGER trg_perm_profiles_updated_at BEFORE UPDATE ON public.permission_profiles FOR EACH ROW EXECUTE FUNCTION trg_updated_at_fn();

-- RLS
ALTER TABLE public.permission_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_grants   ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT unnest(ARRAY['permission_profiles','permission_grants'])
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

-- Perfis default para novos ministérios (seed)
-- INSERT via application layer ao criar ministry
