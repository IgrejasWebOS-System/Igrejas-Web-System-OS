-- ============================================================
-- MIGRATION 014 — Consagração e Batismo (Fase 3E)
-- ============================================================
-- Tabelas:
--   consecration_types       — tipos de consagração (lookup)
--   consecration_situations  — situações do processo (lookup)
--   consecration_processes   — processos de consagração
--   baptism_types            — tipos de batismo (lookup)
--   baptism_processes        — processos de batismo
-- ============================================================

-- ── 1. Lookup: tipos de consagração ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consecration_types (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id uuid NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  nome        text NOT NULL,      -- Pastor, Missionário, Evangelista, Diácono, Presbítero, etc.
  ordem       int  NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ministry_id, nome)
);

-- ── 2. Lookup: situações do processo ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consecration_situations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id uuid NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  nome        text NOT NULL,      -- Em Avaliação, Aprovado, Recusado, Suspenso
  cor         text NOT NULL DEFAULT '#94a3b8',
  ordem       int  NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ministry_id, nome)
);

-- ── 3. Processos de consagração ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consecration_processes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id         uuid NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  party_id            uuid NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  type_id             uuid REFERENCES consecration_types(id) ON DELETE SET NULL,
  situation_id        uuid REFERENCES consecration_situations(id) ON DELETE SET NULL,
  cargo_pleiteado_id  uuid REFERENCES member_cargos(id) ON DELETE SET NULL,
  unit_id             uuid REFERENCES units(id) ON DELETE SET NULL,
  data_solicitacao    date NOT NULL DEFAULT CURRENT_DATE,
  data_consagracao    date,
  observacoes         text,
  criado_por          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  aprovado_por        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_consecration_processes_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_consecration_updated_at ON consecration_processes;
CREATE TRIGGER trg_consecration_updated_at
  BEFORE UPDATE ON consecration_processes
  FOR EACH ROW EXECUTE FUNCTION update_consecration_processes_updated_at();

CREATE INDEX IF NOT EXISTS idx_consecration_ministry ON consecration_processes(ministry_id);
CREATE INDEX IF NOT EXISTS idx_consecration_party    ON consecration_processes(party_id);

-- ── 4. Lookup: tipos de batismo ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS baptism_types (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id uuid NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  nome        text NOT NULL,      -- Batismo nas Águas, Batismo no Espírito Santo
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ministry_id, nome)
);

-- ── 5. Processos de batismo ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS baptism_processes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id     uuid NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  party_id        uuid NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  type_id         uuid REFERENCES baptism_types(id) ON DELETE SET NULL,
  unit_id         uuid REFERENCES units(id) ON DELETE SET NULL,
  pastor_party_id uuid REFERENCES parties(id) ON DELETE SET NULL,

  situacao        text NOT NULL DEFAULT 'PENDENTE'
                  CHECK (situacao IN ('PENDENTE','EM_ANDAMENTO','BATIZADO','CANCELADO')),

  data_prevista   date,
  data_realizada  date,
  observacoes     text,
  criado_por      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_baptism_processes_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_baptism_updated_at ON baptism_processes;
CREATE TRIGGER trg_baptism_updated_at
  BEFORE UPDATE ON baptism_processes
  FOR EACH ROW EXECUTE FUNCTION update_baptism_processes_updated_at();

CREATE INDEX IF NOT EXISTS idx_baptism_ministry ON baptism_processes(ministry_id);
CREATE INDEX IF NOT EXISTS idx_baptism_party    ON baptism_processes(party_id);
CREATE INDEX IF NOT EXISTS idx_baptism_situacao ON baptism_processes(situacao);

-- ── 6. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE consecration_types      ENABLE ROW LEVEL SECURITY;
ALTER TABLE consecration_situations ENABLE ROW LEVEL SECURITY;
ALTER TABLE consecration_processes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE baptism_types           ENABLE ROW LEVEL SECURITY;
ALTER TABLE baptism_processes       ENABLE ROW LEVEL SECURITY;

-- consecration_types
CREATE POLICY "consec_types_sel" ON consecration_types FOR SELECT
  USING (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid));
CREATE POLICY "consec_types_ins" ON consecration_types FOR INSERT
  WITH CHECK (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid)
    AND (auth.jwt()->'app_metadata'->>'iw_level')::int <= 2);
CREATE POLICY "consec_types_upd" ON consecration_types FOR UPDATE
  USING (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid))
  WITH CHECK ((auth.jwt()->'app_metadata'->>'iw_level')::int <= 2);

-- consecration_situations
CREATE POLICY "consec_sit_sel" ON consecration_situations FOR SELECT
  USING (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid));
CREATE POLICY "consec_sit_ins" ON consecration_situations FOR INSERT
  WITH CHECK (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid)
    AND (auth.jwt()->'app_metadata'->>'iw_level')::int <= 2);
CREATE POLICY "consec_sit_upd" ON consecration_situations FOR UPDATE
  USING (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid))
  WITH CHECK ((auth.jwt()->'app_metadata'->>'iw_level')::int <= 2);

-- consecration_processes
CREATE POLICY "consec_proc_sel" ON consecration_processes FOR SELECT
  USING (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid));
CREATE POLICY "consec_proc_ins" ON consecration_processes FOR INSERT
  WITH CHECK (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid)
    AND (auth.jwt()->'app_metadata'->>'iw_level')::int <= 3);
CREATE POLICY "consec_proc_upd" ON consecration_processes FOR UPDATE
  USING (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid))
  WITH CHECK ((auth.jwt()->'app_metadata'->>'iw_level')::int <= 2);

-- baptism_types
CREATE POLICY "bapt_types_sel" ON baptism_types FOR SELECT
  USING (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid));
CREATE POLICY "bapt_types_ins" ON baptism_types FOR INSERT
  WITH CHECK (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid)
    AND (auth.jwt()->'app_metadata'->>'iw_level')::int <= 2);
CREATE POLICY "bapt_types_upd" ON baptism_types FOR UPDATE
  USING (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid))
  WITH CHECK ((auth.jwt()->'app_metadata'->>'iw_level')::int <= 2);

-- baptism_processes
CREATE POLICY "bapt_proc_sel" ON baptism_processes FOR SELECT
  USING (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid));
CREATE POLICY "bapt_proc_ins" ON baptism_processes FOR INSERT
  WITH CHECK (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid)
    AND (auth.jwt()->'app_metadata'->>'iw_level')::int <= 3);
CREATE POLICY "bapt_proc_upd" ON baptism_processes FOR UPDATE
  USING (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid))
  WITH CHECK ((auth.jwt()->'app_metadata'->>'iw_level')::int <= 2);

-- ── 7. Seed de lookup padrão ─────────────────────────────────────────────────
-- Rodar após migration, substituindo <ministry_id>:
-- INSERT INTO consecration_types (ministry_id, nome, ordem) SELECT id, unnest(ARRAY['Diácono','Presbítero','Evangelista','Missionário','Pastor']), generate_series(1,5) FROM ministries;
-- INSERT INTO consecration_situations (ministry_id, nome, cor, ordem) SELECT id, unnest(ARRAY['Em Avaliação','Aprovado','Recusado','Suspenso']), unnest(ARRAY['#854d0e','#166534','#991b1b','#1e40af']), generate_series(1,4) FROM ministries;
-- INSERT INTO baptism_types (ministry_id, nome) SELECT id, unnest(ARRAY['Batismo nas Águas','Batismo no Espírito Santo']) FROM ministries;
