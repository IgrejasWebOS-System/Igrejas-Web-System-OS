-- ============================================================
-- Migration 011 — EBD (Escola Bíblica Dominical)
-- Projeto: IgrejasWeb System OS
-- Depende de: 001_base_schema.sql, 005_members.sql
-- Fase 4 do Roadmap
-- ============================================================

-- ── 1. Turmas ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ebd_classes (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id         uuid        NOT NULL REFERENCES public.ministries(id)   ON DELETE CASCADE,
  unit_id             uuid        NOT NULL REFERENCES public.units(id)         ON DELETE CASCADE,
  nome                text        NOT NULL,
  faixa_etaria        text        NOT NULL DEFAULT 'ADULTOS',
  professor_party_id  uuid        REFERENCES public.parties(id)               ON DELETE SET NULL,
  dia_semana          smallint    NOT NULL DEFAULT 0,   -- 0=Dom, 1=Seg … 6=Sáb
  horario             time        NOT NULL DEFAULT '09:00',
  descricao           text,
  is_active           boolean     NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CHECK (faixa_etaria IN (
    'MATERNAL', 'JARDIM', 'PRIMARIOS', 'JUNIORES',
    'ADOLESCENTES', 'JOVENS', 'ADULTOS', 'TERCEIRA_IDADE', 'MISTO'
  )),
  CHECK (dia_semana BETWEEN 0 AND 6)
);

COMMENT ON TABLE public.ebd_classes IS 'Turmas da EBD por unidade com professor e faixa etária.';
COMMENT ON COLUMN public.ebd_classes.dia_semana IS '0=Domingo, 1=Segunda … 6=Sábado';

-- ── 2. Chamadas (roll calls) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ebd_roll_calls (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id     uuid        NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  class_id        uuid        NOT NULL REFERENCES public.ebd_classes(id) ON DELETE CASCADE,
  data            date        NOT NULL DEFAULT CURRENT_DATE,
  total_presentes integer     NOT NULL DEFAULT 0,
  visitantes      integer     NOT NULL DEFAULT 0,
  observacoes     text,
  criado_por      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, data)   -- uma chamada por turma por dia
);

COMMENT ON TABLE public.ebd_roll_calls IS 'Chamada semanal por turma. UNIQUE (class_id, data) previne duplicatas.';

-- ── 3. Presenças individuais ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ebd_attendances (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id     uuid        NOT NULL REFERENCES public.ministries(id)   ON DELETE CASCADE,
  roll_call_id    uuid        NOT NULL REFERENCES public.ebd_roll_calls(id) ON DELETE CASCADE,
  party_id        uuid        NOT NULL REFERENCES public.parties(id)       ON DELETE CASCADE,
  presente        boolean     NOT NULL DEFAULT false,
  justificativa   text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (roll_call_id, party_id)
);

COMMENT ON TABLE public.ebd_attendances IS 'Presença individual por aluno por chamada.';

-- ── 4. Matrícula de alunos na turma ─────────────────────────
-- Relacionamento N:N entre alunos (parties) e turmas
CREATE TABLE IF NOT EXISTS public.ebd_enrollments (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id uuid        NOT NULL REFERENCES public.ministries(id)   ON DELETE CASCADE,
  class_id    uuid        NOT NULL REFERENCES public.ebd_classes(id)  ON DELETE CASCADE,
  party_id    uuid        NOT NULL REFERENCES public.parties(id)       ON DELETE CASCADE,
  data_entrada date       NOT NULL DEFAULT CURRENT_DATE,
  data_saida   date,
  is_active    boolean    NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, party_id)
);

COMMENT ON TABLE public.ebd_enrollments IS 'Matrícula de alunos em turmas EBD.';

-- ── 5. Índices ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS ebd_classes_ministry_idx    ON public.ebd_classes (ministry_id);
CREATE INDEX IF NOT EXISTS ebd_classes_unit_idx        ON public.ebd_classes (unit_id);
CREATE INDEX IF NOT EXISTS ebd_roll_calls_class_idx    ON public.ebd_roll_calls (class_id);
CREATE INDEX IF NOT EXISTS ebd_roll_calls_data_idx     ON public.ebd_roll_calls (data DESC);
CREATE INDEX IF NOT EXISTS ebd_attendances_roll_idx    ON public.ebd_attendances (roll_call_id);
CREATE INDEX IF NOT EXISTS ebd_attendances_party_idx   ON public.ebd_attendances (party_id);
CREATE INDEX IF NOT EXISTS ebd_enrollments_class_idx   ON public.ebd_enrollments (class_id);
CREATE INDEX IF NOT EXISTS ebd_enrollments_party_idx   ON public.ebd_enrollments (party_id);

-- ── 6. RLS ────────────────────────────────────────────────────
ALTER TABLE public.ebd_classes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebd_roll_calls   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebd_attendances  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebd_enrollments  ENABLE ROW LEVEL SECURITY;

-- Função auxiliar (reutiliza padrão do projeto)
-- Acesso a ebd_classes: mesmo ministry_id + unidades acessíveis
CREATE POLICY "ebd_classes_select" ON public.ebd_classes
  FOR SELECT TO authenticated
  USING (
    ministry_id = (auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid
    AND (
      -- N0/N1/N2: todas as turmas do ministério
      (auth.jwt()->'app_metadata'->>'iw_level')::int <= 2
      OR
      -- N3/N4: apenas turmas de unidades acessíveis (passa ministry_id como argumento)
      unit_id = ANY(
        public.get_accessible_unit_ids(
          (auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid
        )
      )
    )
  );

CREATE POLICY "ebd_classes_insert" ON public.ebd_classes
  FOR INSERT TO authenticated
  WITH CHECK (
    ministry_id = (auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid
    AND (auth.jwt()->'app_metadata'->>'iw_level')::int <= 3
  );

CREATE POLICY "ebd_classes_update" ON public.ebd_classes
  FOR UPDATE TO authenticated
  USING (
    ministry_id = (auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid
    AND (auth.jwt()->'app_metadata'->>'iw_level')::int <= 3
  );

-- Roll calls
CREATE POLICY "ebd_roll_calls_select" ON public.ebd_roll_calls
  FOR SELECT TO authenticated
  USING (ministry_id = (auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid);

CREATE POLICY "ebd_roll_calls_insert" ON public.ebd_roll_calls
  FOR INSERT TO authenticated
  WITH CHECK (
    ministry_id = (auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid
    AND (auth.jwt()->'app_metadata'->>'iw_level')::int <= 4
  );

-- Attendances
CREATE POLICY "ebd_attendances_select" ON public.ebd_attendances
  FOR SELECT TO authenticated
  USING (ministry_id = (auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid);

CREATE POLICY "ebd_attendances_insert" ON public.ebd_attendances
  FOR INSERT TO authenticated
  WITH CHECK (ministry_id = (auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid);

CREATE POLICY "ebd_attendances_update" ON public.ebd_attendances
  FOR UPDATE TO authenticated
  USING (ministry_id = (auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid);

-- Enrollments
CREATE POLICY "ebd_enrollments_select" ON public.ebd_enrollments
  FOR SELECT TO authenticated
  USING (ministry_id = (auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid);

CREATE POLICY "ebd_enrollments_insert" ON public.ebd_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (
    ministry_id = (auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid
    AND (auth.jwt()->'app_metadata'->>'iw_level')::int <= 3
  );

CREATE POLICY "ebd_enrollments_update" ON public.ebd_enrollments
  FOR UPDATE TO authenticated
  USING (ministry_id = (auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid);

-- ── 7. Trigger: atualizar total_presentes no roll_call ───────
-- Mantém o counter sincronizado automaticamente após INSERT/UPDATE em ebd_attendances
CREATE OR REPLACE FUNCTION public.trg_sync_roll_call_totals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.ebd_roll_calls
  SET total_presentes = (
    SELECT COUNT(*) FROM public.ebd_attendances
    WHERE roll_call_id = COALESCE(NEW.roll_call_id, OLD.roll_call_id)
    AND   presente = true
  )
  WHERE id = COALESCE(NEW.roll_call_id, OLD.roll_call_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_roll_call_totals ON public.ebd_attendances;
CREATE TRIGGER sync_roll_call_totals
  AFTER INSERT OR UPDATE OF presente ON public.ebd_attendances
  FOR EACH ROW EXECUTE FUNCTION public.trg_sync_roll_call_totals();
