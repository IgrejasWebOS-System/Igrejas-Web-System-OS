-- ============================================================
-- Migration 020 -- Cursos Livres
-- Fase 6: Catalogo de cursos, inscricoes, presenca, certificados
-- ============================================================

-- ── 1. COURSES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.courses (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id       uuid        NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  titulo            text        NOT NULL,
  descricao         text,
  categoria         text        NOT NULL DEFAULT 'GERAL',
  carga_horaria     integer     NOT NULL DEFAULT 20,
  data_inicio       date,
  data_fim          date,
  vagas             integer,                          -- NULL = ilimitado
  publico_alvo      text,
  instrutor_party_id uuid       REFERENCES public.parties(id) ON DELETE SET NULL,
  frequencia_minima numeric(5,2) NOT NULL DEFAULT 75, -- % minima para certificado
  is_active         boolean     NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CHECK (categoria IN ('GERAL','BIBLICO','DISCIPULADO','LIDERANCA','MUSICA','INFANTIL','JOVENS','OUTROS'))
);

CREATE INDEX IF NOT EXISTS courses_ministry_id_idx ON public.courses (ministry_id);

-- ── 2. COURSE_LESSONS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.course_lessons (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id    uuid        NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  ministry_id  uuid        NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  numero       integer     NOT NULL,
  data_aula    date        NOT NULL,
  conteudo     text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, numero)
);

CREATE INDEX IF NOT EXISTS course_lessons_course_id_idx ON public.course_lessons (course_id);

-- ── 3. COURSE_ENROLLMENTS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id    uuid        NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  party_id     uuid        NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
  ministry_id  uuid        NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  status       text        NOT NULL DEFAULT 'INSCRITO',
  inscrito_em  timestamptz NOT NULL DEFAULT now(),
  concluido_em timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, party_id),
  CHECK (status IN ('INSCRITO','CONCLUIDO','DESISTENCIA'))
);

CREATE INDEX IF NOT EXISTS course_enrollments_course_id_idx ON public.course_enrollments (course_id);
CREATE INDEX IF NOT EXISTS course_enrollments_party_id_idx  ON public.course_enrollments (party_id);

-- ── 4. COURSE_ATTENDANCE ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.course_attendance (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id     uuid    NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  enrollment_id uuid    NOT NULL REFERENCES public.course_enrollments(id) ON DELETE CASCADE,
  ministry_id   uuid    NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  presente      boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, enrollment_id)
);

CREATE INDEX IF NOT EXISTS course_attendance_lesson_id_idx     ON public.course_attendance (lesson_id);
CREATE INDEX IF NOT EXISTS course_attendance_enrollment_id_idx ON public.course_attendance (enrollment_id);

-- ── 5. COURSE_CERTIFICATES ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.course_certificates (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid    NOT NULL UNIQUE REFERENCES public.course_enrollments(id) ON DELETE CASCADE,
  ministry_id   uuid    NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  emitido_em    timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── 6. TRIGGER updated_at em courses ────────────────────────
CREATE OR REPLACE FUNCTION update_courses_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_courses_updated_at ON public.courses;
CREATE TRIGGER trg_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION update_courses_updated_at();

-- ── 7. FUNCAO: verificar_conclusao_curso ─────────────────────
-- Calcula frequencia do inscrito e, se >= minimo, marca CONCLUIDO
-- e emite certificado automaticamente.
CREATE OR REPLACE FUNCTION public.verificar_conclusao_curso(
  p_enrollment_id uuid
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_course_id           uuid;
  v_frequencia_minima   numeric;
  v_total_aulas         integer;
  v_presencas           integer;
  v_pct                 numeric;
  v_status              text;
BEGIN
  -- Dados da matricula e curso
  SELECT e.course_id, e.status
  INTO   v_course_id, v_status
  FROM   public.course_enrollments e
  WHERE  e.id = p_enrollment_id;

  IF v_course_id IS NULL THEN RETURN 'NOT_FOUND'; END IF;
  IF v_status = 'DESISTENCIA' THEN RETURN 'DESISTENCIA'; END IF;

  SELECT frequencia_minima
  INTO   v_frequencia_minima
  FROM   public.courses
  WHERE  id = v_course_id;

  SELECT COUNT(*) INTO v_total_aulas
  FROM   public.course_lessons
  WHERE  course_id = v_course_id;

  IF v_total_aulas = 0 THEN RETURN 'SEM_AULAS'; END IF;

  SELECT COUNT(*) INTO v_presencas
  FROM   public.course_attendance
  WHERE  enrollment_id = p_enrollment_id
  AND    presente = true;

  v_pct := (v_presencas::numeric / v_total_aulas) * 100;

  IF v_pct >= v_frequencia_minima THEN
    -- Marcar como concluido
    UPDATE public.course_enrollments
    SET    status = 'CONCLUIDO', concluido_em = now()
    WHERE  id = p_enrollment_id
    AND    status = 'INSCRITO';

    -- Emitir certificado se nao existir
    INSERT INTO public.course_certificates (enrollment_id, ministry_id)
    SELECT p_enrollment_id, ministry_id
    FROM   public.course_enrollments
    WHERE  id = p_enrollment_id
    ON CONFLICT (enrollment_id) DO NOTHING;

    RETURN 'CONCLUIDO';
  ELSE
    -- Voltar para INSCRITO se estiver como CONCLUIDO e perdeu frequencia
    UPDATE public.course_enrollments
    SET    status = 'INSCRITO', concluido_em = NULL
    WHERE  id = p_enrollment_id
    AND    status = 'CONCLUIDO';

    RETURN 'INSCRITO';
  END IF;
END; $$;

-- ── 8. RLS ───────────────────────────────────────────────────
ALTER TABLE public.courses             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_attendance   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_certificates ENABLE ROW LEVEL SECURITY;

-- Helper: usuario pertence ao ministerio com nivel >= N
-- (reutiliza get_user_ministry_ids e get_user_level da migration 002)

-- courses
DROP POLICY IF EXISTS "courses_select" ON public.courses;
DROP POLICY IF EXISTS "courses_insert" ON public.courses;
DROP POLICY IF EXISTS "courses_update" ON public.courses;

CREATE POLICY "courses_select" ON public.courses
  FOR SELECT TO authenticated
  USING (ministry_id = ANY(public.get_user_ministry_ids()) OR public.is_super_master());

CREATE POLICY "courses_insert" ON public.courses
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_master()
    OR (ministry_id = ANY(public.get_user_ministry_ids())
        AND (public.get_user_level(ministry_id) IS NOT NULL
             AND public.get_user_level(ministry_id) <= 2))
  );

CREATE POLICY "courses_update" ON public.courses
  FOR UPDATE TO authenticated
  USING (
    public.is_super_master()
    OR (ministry_id = ANY(public.get_user_ministry_ids())
        AND public.get_user_level(ministry_id) <= 2)
  );

-- course_lessons
DROP POLICY IF EXISTS "course_lessons_select" ON public.course_lessons;
DROP POLICY IF EXISTS "course_lessons_insert" ON public.course_lessons;
DROP POLICY IF EXISTS "course_lessons_update" ON public.course_lessons;
DROP POLICY IF EXISTS "course_lessons_delete" ON public.course_lessons;

CREATE POLICY "course_lessons_select" ON public.course_lessons
  FOR SELECT TO authenticated
  USING (ministry_id = ANY(public.get_user_ministry_ids()) OR public.is_super_master());

CREATE POLICY "course_lessons_insert" ON public.course_lessons
  FOR INSERT TO authenticated
  WITH CHECK (ministry_id = ANY(public.get_user_ministry_ids()) OR public.is_super_master());

CREATE POLICY "course_lessons_update" ON public.course_lessons
  FOR UPDATE TO authenticated
  USING (ministry_id = ANY(public.get_user_ministry_ids()) OR public.is_super_master());

CREATE POLICY "course_lessons_delete" ON public.course_lessons
  FOR DELETE TO authenticated
  USING (ministry_id = ANY(public.get_user_ministry_ids()) OR public.is_super_master());

-- course_enrollments
DROP POLICY IF EXISTS "course_enrollments_select" ON public.course_enrollments;
DROP POLICY IF EXISTS "course_enrollments_insert" ON public.course_enrollments;
DROP POLICY IF EXISTS "course_enrollments_update" ON public.course_enrollments;

CREATE POLICY "course_enrollments_select" ON public.course_enrollments
  FOR SELECT TO authenticated
  USING (ministry_id = ANY(public.get_user_ministry_ids()) OR public.is_super_master());

CREATE POLICY "course_enrollments_insert" ON public.course_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (ministry_id = ANY(public.get_user_ministry_ids()) OR public.is_super_master());

CREATE POLICY "course_enrollments_update" ON public.course_enrollments
  FOR UPDATE TO authenticated
  USING (ministry_id = ANY(public.get_user_ministry_ids()) OR public.is_super_master());

-- course_attendance
DROP POLICY IF EXISTS "course_attendance_select" ON public.course_attendance;
DROP POLICY IF EXISTS "course_attendance_insert" ON public.course_attendance;
DROP POLICY IF EXISTS "course_attendance_update" ON public.course_attendance;

CREATE POLICY "course_attendance_select" ON public.course_attendance
  FOR SELECT TO authenticated
  USING (ministry_id = ANY(public.get_user_ministry_ids()) OR public.is_super_master());

CREATE POLICY "course_attendance_insert" ON public.course_attendance
  FOR INSERT TO authenticated
  WITH CHECK (ministry_id = ANY(public.get_user_ministry_ids()) OR public.is_super_master());

CREATE POLICY "course_attendance_update" ON public.course_attendance
  FOR UPDATE TO authenticated
  USING (ministry_id = ANY(public.get_user_ministry_ids()) OR public.is_super_master());

-- course_certificates
DROP POLICY IF EXISTS "course_certificates_select" ON public.course_certificates;
DROP POLICY IF EXISTS "course_certificates_insert" ON public.course_certificates;

CREATE POLICY "course_certificates_select" ON public.course_certificates
  FOR SELECT TO authenticated
  USING (ministry_id = ANY(public.get_user_ministry_ids()) OR public.is_super_master());

CREATE POLICY "course_certificates_insert" ON public.course_certificates
  FOR INSERT TO authenticated
  WITH CHECK (ministry_id = ANY(public.get_user_ministry_ids()) OR public.is_super_master());
