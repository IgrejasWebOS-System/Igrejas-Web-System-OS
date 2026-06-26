-- ============================================================
-- MIGRATION 018 — Escola Teológica (Fase 5)
-- ============================================================
-- Tabelas:
--   school_semesters    — semestres letivos por ministério
--   school_disciplines  — disciplinas por semestre
--   school_lessons      — aulas (encontros) por disciplina
--   school_enrollments  — matrículas (Party com role ALUNO)
--   school_grades       — notas por matrícula (AP1, AP2, FINAL, REC)
--   school_attendance   — presença por aluno por aula
-- ============================================================

-- ── 1. Semestres ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS school_semesters (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id  uuid        NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  nome         text        NOT NULL,
  data_inicio  date        NOT NULL,
  data_fim     date        NOT NULL,
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ministry_id, nome)
);

-- ── 2. Disciplinas ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS school_disciplines (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id         uuid        NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  semester_id         uuid        NOT NULL REFERENCES school_semesters(id) ON DELETE CASCADE,
  nome                text        NOT NULL,
  carga_horaria       int         NOT NULL DEFAULT 40,
  professor_party_id  uuid        REFERENCES parties(id) ON DELETE SET NULL,
  nota_minima         numeric(4,2) NOT NULL DEFAULT 6.0,
  frequencia_minima   numeric(5,2) NOT NULL DEFAULT 75.0,
  is_active           boolean     NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ── 3. Aulas (encontros) ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS school_lessons (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  discipline_id  uuid        NOT NULL REFERENCES school_disciplines(id) ON DELETE CASCADE,
  ministry_id    uuid        NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  numero         int         NOT NULL,           -- 1, 2, 3...
  data_aula      date        NOT NULL,
  conteudo       text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (discipline_id, numero)
);

-- ── 4. Matrículas ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS school_enrollments (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id    uuid        NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  discipline_id  uuid        NOT NULL REFERENCES school_disciplines(id) ON DELETE CASCADE,
  party_id       uuid        NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  situacao       text        NOT NULL DEFAULT 'CURSANDO'
                 CHECK (situacao IN ('CURSANDO','APROVADO','REPROVADO_NOTA','REPROVADO_FREQUENCIA','TRANCADO')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (discipline_id, party_id)
);

-- ── 5. Notas ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS school_grades (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id  uuid        NOT NULL REFERENCES school_enrollments(id) ON DELETE CASCADE,
  ministry_id    uuid        NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  tipo           text        NOT NULL CHECK (tipo IN ('AP1','AP2','FINAL','RECUPERACAO')),
  nota           numeric(4,2) NOT NULL CHECK (nota >= 0 AND nota <= 10),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, tipo)
);

-- ── 6. Presença ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS school_attendance (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id      uuid        NOT NULL REFERENCES school_lessons(id) ON DELETE CASCADE,
  enrollment_id  uuid        NOT NULL REFERENCES school_enrollments(id) ON DELETE CASCADE,
  ministry_id    uuid        NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  presente       boolean     NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, enrollment_id)
);

-- ── 7. Trigger updated_at em school_grades ───────────────────────────────────
CREATE OR REPLACE FUNCTION update_school_grades_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_school_grades_updated_at
  BEFORE UPDATE ON school_grades
  FOR EACH ROW EXECUTE FUNCTION update_school_grades_updated_at();

-- ── 8. Função: calcular situação de matrícula ─────────────────────────────────
-- Chamada pelo server action após lançar notas/presença.
-- Retorna: 'CURSANDO' | 'APROVADO' | 'REPROVADO_NOTA' | 'REPROVADO_FREQUENCIA'
CREATE OR REPLACE FUNCTION calcular_situacao_matricula(p_enrollment_id uuid)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_nota_min      numeric;
  v_freq_min      numeric;
  v_total_aulas   int;
  v_presencas     int;
  v_freq          numeric;
  v_ap1           numeric := NULL;
  v_ap2           numeric := NULL;
  v_final         numeric := NULL;
  v_rec           numeric := NULL;
  v_media         numeric;
BEGIN
  -- Buscar mínimos da disciplina
  SELECT d.nota_minima, d.frequencia_minima
  INTO v_nota_min, v_freq_min
  FROM school_enrollments e
  JOIN school_disciplines d ON d.id = e.discipline_id
  WHERE e.id = p_enrollment_id;

  -- Notas
  SELECT nota INTO v_ap1 FROM school_grades WHERE enrollment_id = p_enrollment_id AND tipo = 'AP1';
  SELECT nota INTO v_ap2 FROM school_grades WHERE enrollment_id = p_enrollment_id AND tipo = 'AP2';
  SELECT nota INTO v_final FROM school_grades WHERE enrollment_id = p_enrollment_id AND tipo = 'FINAL';
  SELECT nota INTO v_rec FROM school_grades WHERE enrollment_id = p_enrollment_id AND tipo = 'RECUPERACAO';

  -- Se ainda não tem todas as notas base, permanece CURSANDO
  IF v_ap1 IS NULL OR v_ap2 IS NULL THEN
    RETURN 'CURSANDO';
  END IF;

  -- Média: se tem recuperação, usa (media_base + rec) / 2 capped at nota_min
  v_media := (COALESCE(v_ap1,0) + COALESCE(v_ap2,0)) / 2.0;
  IF v_final IS NOT NULL THEN
    v_media := (v_media + v_final) / 2.0;
  END IF;
  IF v_rec IS NOT NULL THEN
    v_media := (v_media + v_rec) / 2.0;
  END IF;

  -- Frequência
  SELECT COUNT(*) INTO v_total_aulas
  FROM school_lessons l
  JOIN school_enrollments e ON e.discipline_id = l.discipline_id
  WHERE e.id = p_enrollment_id;

  SELECT COUNT(*) INTO v_presencas
  FROM school_attendance
  WHERE enrollment_id = p_enrollment_id AND presente = true;

  IF v_total_aulas > 0 THEN
    v_freq := (v_presencas::numeric / v_total_aulas) * 100;
  ELSE
    v_freq := 100;
  END IF;

  -- Decisão
  IF v_freq < v_freq_min THEN
    RETURN 'REPROVADO_FREQUENCIA';
  ELSIF v_media < v_nota_min THEN
    RETURN 'REPROVADO_NOTA';
  ELSE
    RETURN 'APROVADO';
  END IF;
END;
$$;

-- ── 9. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE school_semesters   ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_disciplines ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_lessons     ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_grades      ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_attendance  ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer usuário autenticado do mesmo ministério (N0–N4)
CREATE POLICY "escola_semesters_read" ON school_semesters
  FOR SELECT TO authenticated
  USING (ministry_id = (SELECT (auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid));

CREATE POLICY "escola_disciplines_read" ON school_disciplines
  FOR SELECT TO authenticated
  USING (ministry_id = (SELECT (auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid));

CREATE POLICY "escola_lessons_read" ON school_lessons
  FOR SELECT TO authenticated
  USING (ministry_id = (SELECT (auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid));

CREATE POLICY "escola_enrollments_read" ON school_enrollments
  FOR SELECT TO authenticated
  USING (ministry_id = (SELECT (auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid));

CREATE POLICY "escola_grades_read" ON school_grades
  FOR SELECT TO authenticated
  USING (ministry_id = (SELECT (auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid));

CREATE POLICY "escola_attendance_read" ON school_attendance
  FOR SELECT TO authenticated
  USING (ministry_id = (SELECT (auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid));

-- Escrita: N2 ou superior (iw_level <= 2)
CREATE POLICY "escola_semesters_write" ON school_semesters
  FOR ALL TO authenticated
  USING (
    ministry_id = (SELECT (auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid)
    AND (auth.jwt()->'app_metadata'->>'iw_level')::int <= 2
  )
  WITH CHECK (
    ministry_id = (SELECT (auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid)
    AND (auth.jwt()->'app_metadata'->>'iw_level')::int <= 2
  );

CREATE POLICY "escola_disciplines_write" ON school_disciplines
  FOR ALL TO authenticated
  USING (
    ministry_id = (SELECT (auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid)
    AND (auth.jwt()->'app_metadata'->>'iw_level')::int <= 2
  )
  WITH CHECK (
    ministry_id = (SELECT (auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid)
    AND (auth.jwt()->'app_metadata'->>'iw_level')::int <= 2
  );

CREATE POLICY "escola_lessons_write" ON school_lessons
  FOR ALL TO authenticated
  USING (
    ministry_id = (SELECT (auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid)
    AND (auth.jwt()->'app_metadata'->>'iw_level')::int <= 2
  )
  WITH CHECK (
    ministry_id = (SELECT (auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid)
    AND (auth.jwt()->'app_metadata'->>'iw_level')::int <= 2
  );

CREATE POLICY "escola_enrollments_write" ON school_enrollments
  FOR ALL TO authenticated
  USING (
    ministry_id = (SELECT (auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid)
    AND (auth.jwt()->'app_metadata'->>'iw_level')::int <= 3
  )
  WITH CHECK (
    ministry_id = (SELECT (auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid)
    AND (auth.jwt()->'app_metadata'->>'iw_level')::int <= 3
  );

CREATE POLICY "escola_grades_write" ON school_grades
  FOR ALL TO authenticated
  USING (
    ministry_id = (SELECT (auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid)
    AND (auth.jwt()->'app_metadata'->>'iw_level')::int <= 3
  )
  WITH CHECK (
    ministry_id = (SELECT (auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid)
    AND (auth.jwt()->'app_metadata'->>'iw_level')::int <= 3
  );

CREATE POLICY "escola_attendance_write" ON school_attendance
  FOR ALL TO authenticated
  USING (
    ministry_id = (SELECT (auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid)
    AND (auth.jwt()->'app_metadata'->>'iw_level')::int <= 3
  )
  WITH CHECK (
    ministry_id = (SELECT (auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid)
    AND (auth.jwt()->'app_metadata'->>'iw_level')::int <= 3
  );

-- ── 10. Nota sobre party_roles ───────────────────────────────────────────────
-- O role 'ALUNO' ja e um valor valido no CHECK constraint de party_roles.role_type
-- (definido em migration 001). Nao e necessario nenhum INSERT adicional.
-- Ao matricular um aluno, matricularAlunoAction insere em party_roles com role_type='ALUNO'.
