-- ============================================================
-- MIGRATION 016 — Dados Bancários + Pastoreio (Fase 3G)
-- ============================================================
-- Tabelas:
--   member_bank_accounts   — dados bancários do membro
--   pastoral_groups        — grupos de pastoreio
--   pastoral_group_members — vínculo membro ↔ grupo (N:N) + VPD
-- ============================================================

-- ── 1. Dados bancários do membro ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS member_bank_accounts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id  uuid NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  party_id     uuid NOT NULL REFERENCES parties(id)    ON DELETE CASCADE,
  banco        text NOT NULL,
  agencia      text,
  conta        text,
  tipo         text NOT NULL DEFAULT 'CORRENTE'
               CHECK (tipo IN ('CORRENTE','POUPANCA','SALARIO')),
  chave_pix    text,
  is_principal boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_member_bank_accounts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_bank_updated_at ON member_bank_accounts;
CREATE TRIGGER trg_bank_updated_at
  BEFORE UPDATE ON member_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION update_member_bank_accounts_updated_at();

-- Garante só uma conta principal por membro por ministério
CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_principal
  ON member_bank_accounts(ministry_id, party_id)
  WHERE is_principal = true;

CREATE INDEX IF NOT EXISTS idx_bank_party ON member_bank_accounts(party_id);

-- ── 2. Grupos de pastoreio ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pastoral_groups (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id     uuid NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  nome            text NOT NULL,
  descricao       text,
  pastor_party_id uuid REFERENCES parties(id) ON DELETE SET NULL,
  unit_id         uuid REFERENCES units(id)   ON DELETE SET NULL,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ministry_id, nome)
);

CREATE INDEX IF NOT EXISTS idx_pastoral_ministry ON pastoral_groups(ministry_id);

-- ── 3. Vínculo membro ↔ grupo de pastoreio ────────────────────────────────────
CREATE TABLE IF NOT EXISTS pastoral_group_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   uuid NOT NULL REFERENCES pastoral_groups(id) ON DELETE CASCADE,
  party_id   uuid NOT NULL REFERENCES parties(id)         ON DELETE CASCADE,
  ministry_id uuid NOT NULL REFERENCES ministries(id)     ON DELETE CASCADE,
  -- VPD: Valor Potencial de Dízimo (estimativa de contribuição mensal)
  vpd        numeric(10,2),
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, party_id)
);

CREATE INDEX IF NOT EXISTS idx_pgm_group   ON pastoral_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_pgm_party   ON pastoral_group_members(party_id);
CREATE INDEX IF NOT EXISTS idx_pgm_ministry ON pastoral_group_members(ministry_id);

-- ── 4. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE member_bank_accounts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE pastoral_groups        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pastoral_group_members ENABLE ROW LEVEL SECURITY;

-- member_bank_accounts: leitura N3+; escrita N2+
CREATE POLICY "bank_sel" ON member_bank_accounts FOR SELECT
  USING (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid));
CREATE POLICY "bank_ins" ON member_bank_accounts FOR INSERT
  WITH CHECK (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid)
    AND (auth.jwt()->'app_metadata'->>'iw_level')::int <= 2);
CREATE POLICY "bank_upd" ON member_bank_accounts FOR UPDATE
  USING (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid))
  WITH CHECK ((auth.jwt()->'app_metadata'->>'iw_level')::int <= 2);
CREATE POLICY "bank_del" ON member_bank_accounts FOR DELETE
  USING (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid)
    AND (auth.jwt()->'app_metadata'->>'iw_level')::int <= 2);

-- pastoral_groups: leitura N3+; escrita N2+
CREATE POLICY "pg_sel" ON pastoral_groups FOR SELECT
  USING (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid));
CREATE POLICY "pg_ins" ON pastoral_groups FOR INSERT
  WITH CHECK (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid)
    AND (auth.jwt()->'app_metadata'->>'iw_level')::int <= 2);
CREATE POLICY "pg_upd" ON pastoral_groups FOR UPDATE
  USING (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid))
  WITH CHECK ((auth.jwt()->'app_metadata'->>'iw_level')::int <= 2);

-- pastoral_group_members: leitura N3+; escrita N2+
CREATE POLICY "pgm_sel" ON pastoral_group_members FOR SELECT
  USING (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid));
CREATE POLICY "pgm_ins" ON pastoral_group_members FOR INSERT
  WITH CHECK (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid)
    AND (auth.jwt()->'app_metadata'->>'iw_level')::int <= 2);
CREATE POLICY "pgm_upd" ON pastoral_group_members FOR UPDATE
  USING (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid))
  WITH CHECK ((auth.jwt()->'app_metadata'->>'iw_level')::int <= 2);
CREATE POLICY "pgm_del" ON pastoral_group_members FOR DELETE
  USING (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid)
    AND (auth.jwt()->'app_metadata'->>'iw_level')::int <= 2);
