-- ============================================================
-- MIGRATION 013 — Pré-Cadastros e Campanhas (Fase 3D)
-- ============================================================
-- Tabelas:
--   pre_registration_campaigns  — campanhas de captação
--   pre_registrations           — pré-cadastros vinculados à campanha
-- Estratégia:
--   Um pré-cadastro cria um party com party_subtype = MEMBRO_PROVISORIO.
--   A ação "Aprovar" converte em party_members definitivo e gera matrícula.
-- ============================================================

-- ── 1. Campanhas ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pre_registration_campaigns (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id uuid NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  nome        text NOT NULL,
  descricao   text,
  tipo        text NOT NULL DEFAULT 'NOVO_MEMBRO'
              CHECK (tipo IN ('ATUALIZACAO_CADASTRAL','NOVO_MEMBRO','BATISMO','EVENTO')),
  data_inicio date,
  data_fim    date,
  link_publico text,           -- slug ou URL futura de formulário público
  is_active   boolean NOT NULL DEFAULT true,
  criado_por  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pre_reg_campaigns_ministry ON pre_registration_campaigns(ministry_id);

-- ── 2. Pré-cadastros ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pre_registrations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id uuid NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES pre_registration_campaigns(id) ON DELETE SET NULL,
  party_id    uuid REFERENCES parties(id) ON DELETE CASCADE,

  situacao    text NOT NULL DEFAULT 'PENDENTE'
              CHECK (situacao IN ('PENDENTE','CANCELADO','FINALIZADO')),

  -- Dados brutos do formulário (antes de virar party_member)
  dados_json  jsonb,

  observacoes     text,
  aprovado_por    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  data_aprovacao  timestamptz,
  criado_por      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pre_registrations_ministry  ON pre_registrations(ministry_id);
CREATE INDEX IF NOT EXISTS idx_pre_registrations_campaign  ON pre_registrations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_pre_registrations_party     ON pre_registrations(party_id);
CREATE INDEX IF NOT EXISTS idx_pre_registrations_situacao  ON pre_registrations(situacao);

-- ── 3. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE pre_registration_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_registrations          ENABLE ROW LEVEL SECURITY;

-- Campanhas
CREATE POLICY "pre_reg_campaigns_select" ON pre_registration_campaigns FOR SELECT
  USING (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid));

CREATE POLICY "pre_reg_campaigns_insert" ON pre_registration_campaigns FOR INSERT
  WITH CHECK (
    ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid)
    AND (auth.jwt()->'app_metadata'->>'iw_level')::int <= 2
  );

CREATE POLICY "pre_reg_campaigns_update" ON pre_registration_campaigns FOR UPDATE
  USING (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid))
  WITH CHECK ((auth.jwt()->'app_metadata'->>'iw_level')::int <= 2);

-- Pré-cadastros
CREATE POLICY "pre_registrations_select" ON pre_registrations FOR SELECT
  USING (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid));

CREATE POLICY "pre_registrations_insert" ON pre_registrations FOR INSERT
  WITH CHECK (
    ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid)
    AND (auth.jwt()->'app_metadata'->>'iw_level')::int <= 3
  );

CREATE POLICY "pre_registrations_update" ON pre_registrations FOR UPDATE
  USING (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid))
  WITH CHECK ((auth.jwt()->'app_metadata'->>'iw_level')::int <= 2);
