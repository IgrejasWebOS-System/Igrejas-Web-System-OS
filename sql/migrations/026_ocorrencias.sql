-- ============================================================
-- Migration 026 — Módulo Ocorrências (Fase 10)
-- Registro pastoral sigiloso de ocorrências vinculadas a membros
-- ============================================================

-- ── 1. OCCURRENCES ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.occurrences (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id          uuid        NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  unit_id              uuid        REFERENCES public.units(id) ON DELETE SET NULL,

  party_id             uuid        REFERENCES public.parties(id) ON DELETE SET NULL,
  -- membro principal vinculado à ocorrência

  tipo                 text        NOT NULL DEFAULT 'OUTRO'
                         CHECK (tipo IN (
                           'DISCIPLINAR',   -- processo disciplinar / conselho
                           'PASTORAL',      -- aconselhamento, visita, cuidado espiritual
                           'FAMILIAR',      -- conflitos familiares, separação, violência
                           'FINANCEIRO',    -- inadimplência, fraude, ajuda social
                           'SAUDE',         -- questões de saúde físicas ou mentais
                           'JURIDICO',      -- problemas legais, prisão, processo
                           'OUTRO'
                         )),

  titulo               text        NOT NULL,
  descricao            text,
  data_ocorrencia      date        NOT NULL DEFAULT CURRENT_DATE,

  status               text        NOT NULL DEFAULT 'ABERTA'
                         CHECK (status IN (
                           'ABERTA',
                           'EM_ACOMPANHAMENTO',
                           'RESOLVIDA',
                           'ARQUIVADA'
                         )),

  -- SIGILO: RESTRITO = apenas N0/N1/N2; NORMAL = N3 em diante pode ver
  nivel_sigilo         text        NOT NULL DEFAULT 'RESTRITO'
                         CHECK (nivel_sigilo IN ('NORMAL', 'RESTRITO')),

  responsavel_party_id uuid        REFERENCES public.parties(id) ON DELETE SET NULL,
  -- líder/pastor responsável pelo acompanhamento

  resolucao            text,
  -- preenchido quando status = RESOLVIDA

  deleted_at           timestamptz,
  created_by           uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ── 2. OCCURRENCE_FOLLOWUPS — Acompanhamentos / Registros ─────

CREATE TABLE IF NOT EXISTS public.occurrence_followups (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id    uuid        NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  occurrence_id  uuid        NOT NULL REFERENCES public.occurrences(id) ON DELETE CASCADE,

  data           date        NOT NULL DEFAULT CURRENT_DATE,
  tipo_contato   text        NOT NULL DEFAULT 'VISITA'
                   CHECK (tipo_contato IN ('VISITA','LIGACAO','REUNIAO','MENSAGEM','EMAIL','OUTRO')),
  descricao      text        NOT NULL,
  -- relato do acompanhamento

  proxima_acao   text,
  -- próximo passo planejado

  created_by     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ── 3. TRIGGERS updated_at ───────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at_occurrences()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_occurrences_updated_at ON public.occurrences;
CREATE TRIGGER trg_occurrences_updated_at
  BEFORE UPDATE ON public.occurrences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_occurrences();

-- ── 4. RLS ────────────────────────────────────────────────────
-- Ocorrências RESTRITAS: só N0/N1/N2 (level <= 2)
-- Ocorrências NORMAIS: N3 em diante (level <= 3)
-- A verificação de nível é feita na camada de aplicação (assertLevel).
-- No RLS garantimos apenas o isolamento por ministry_id.

ALTER TABLE public.occurrences         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occurrence_followups ENABLE ROW LEVEL SECURITY;

-- occurrences
DROP POLICY IF EXISTS "occurrences_select" ON public.occurrences;
DROP POLICY IF EXISTS "occurrences_insert" ON public.occurrences;
DROP POLICY IF EXISTS "occurrences_update" ON public.occurrences;
DROP POLICY IF EXISTS "occurrences_super"  ON public.occurrences;

CREATE POLICY "occurrences_select" ON public.occurrences
  FOR SELECT USING (ministry_id = ANY(get_user_ministry_ids()) AND deleted_at IS NULL);
CREATE POLICY "occurrences_insert" ON public.occurrences
  FOR INSERT WITH CHECK (ministry_id = ANY(get_user_ministry_ids()));
CREATE POLICY "occurrences_update" ON public.occurrences
  FOR UPDATE USING (ministry_id = ANY(get_user_ministry_ids()));
CREATE POLICY "occurrences_super" ON public.occurrences
  USING (is_super_master());

-- occurrence_followups
DROP POLICY IF EXISTS "followups_select" ON public.occurrence_followups;
DROP POLICY IF EXISTS "followups_insert" ON public.occurrence_followups;
DROP POLICY IF EXISTS "followups_super"  ON public.occurrence_followups;

CREATE POLICY "followups_select" ON public.occurrence_followups
  FOR SELECT USING (ministry_id = ANY(get_user_ministry_ids()));
CREATE POLICY "followups_insert" ON public.occurrence_followups
  FOR INSERT WITH CHECK (ministry_id = ANY(get_user_ministry_ids()));
CREATE POLICY "followups_super" ON public.occurrence_followups
  USING (is_super_master());
