-- ============================================================
-- Migration 035 — Config Global + Automações
-- ============================================================

CREATE TABLE IF NOT EXISTS public.system_configs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id  uuid NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  chave        text NOT NULL,
  valor        jsonb,
  descricao    text,
  updated_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ministry_id, chave)
);

CREATE TABLE IF NOT EXISTS public.ministry_announcements (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id  uuid NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  titulo       text NOT NULL,
  conteudo     text NOT NULL,
  tipo         text NOT NULL DEFAULT 'INFO' CHECK (tipo IN ('INFO','AVISO','URGENTE')),
  ativo        boolean NOT NULL DEFAULT true,
  expira_em    date,
  fixado       boolean NOT NULL DEFAULT false,
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.automations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id  uuid NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  nome         text NOT NULL,
  gatilho      text NOT NULL,  -- membro_aniversario, membro_novo, evento_proximo, etc.
  ativo        boolean NOT NULL DEFAULT true,
  config       jsonb NOT NULL DEFAULT '{}',  -- {dias_antecedencia, template_id, canal, etc.}
  ultimo_exec  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_sys_configs_ministry   ON public.system_configs(ministry_id);
CREATE INDEX IF NOT EXISTS idx_announcements_ministry ON public.ministry_announcements(ministry_id, ativo);
CREATE INDEX IF NOT EXISTS idx_automations_ministry   ON public.automations(ministry_id);

-- RLS
ALTER TABLE public.system_configs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ministry_announcements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automations             ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT unnest(ARRAY['system_configs','ministry_announcements','automations'])
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

-- Seeds de config padrão (inserir apenas se não existir)
-- Serão inseridos via action ao criar ministério
