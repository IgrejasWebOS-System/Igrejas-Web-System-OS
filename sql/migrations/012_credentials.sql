-- ============================================================
-- MIGRATION 012 — Credenciais Ministeriais (Fase 3C)
-- ============================================================
-- Tabelas:
--   credential_models         — templates de credencial por ministério
--   credential_request_types  — tipos de solicitação (1ª via, renovação, etc.)
--   credential_requests       — solicitações com fluxo PENDENTE → LIBERADA → CONFIRMADA
-- ============================================================

-- ── 1. Modelos de credencial ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS credential_models (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id   uuid NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  nome          text NOT NULL,
  slug          text NOT NULL,
  template_html text,
  cargo_id      uuid REFERENCES member_cargos(id) ON DELETE SET NULL,
  validade_anos int  NOT NULL DEFAULT 2,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (ministry_id, slug)
);

-- ── 2. Tipos de solicitação ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS credential_request_types (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id uuid NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  nome        text NOT NULL,                          -- "1ª via", "Renovação", "Substituição"
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (ministry_id, nome)
);

-- ── 3. Solicitações de credencial ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS credential_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id     uuid NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  party_id        uuid NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  model_id        uuid NOT NULL REFERENCES credential_models(id) ON DELETE RESTRICT,
  request_type_id uuid REFERENCES credential_request_types(id) ON DELETE SET NULL,

  situacao        text NOT NULL DEFAULT 'PENDENTE'
                  CHECK (situacao IN ('PENDENTE','CANCELADA','LIBERADA','CONFIRMADA','DIGITAL')),

  arquivo_url     text,                               -- URL do PDF gerado
  data_validade   date,                               -- calculada ao aprovar (hoje + validade_anos)
  observacoes     text,

  criado_por      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  aprovado_por    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  data_aprovacao  timestamptz,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_credential_requests_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_credential_requests_updated_at ON credential_requests;
CREATE TRIGGER trg_credential_requests_updated_at
  BEFORE UPDATE ON credential_requests
  FOR EACH ROW EXECUTE FUNCTION update_credential_requests_updated_at();

-- Índices
CREATE INDEX IF NOT EXISTS idx_credential_requests_ministry   ON credential_requests(ministry_id);
CREATE INDEX IF NOT EXISTS idx_credential_requests_party      ON credential_requests(party_id);
CREATE INDEX IF NOT EXISTS idx_credential_requests_situacao   ON credential_requests(situacao);
CREATE INDEX IF NOT EXISTS idx_credential_models_ministry     ON credential_models(ministry_id);
CREATE INDEX IF NOT EXISTS idx_cred_req_types_ministry        ON credential_request_types(ministry_id);

-- ── 4. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE credential_models         ENABLE ROW LEVEL SECURITY;
ALTER TABLE credential_request_types  ENABLE ROW LEVEL SECURITY;
ALTER TABLE credential_requests       ENABLE ROW LEVEL SECURITY;

-- credential_models
CREATE POLICY "cred_models_select" ON credential_models FOR SELECT
  USING (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid));

CREATE POLICY "cred_models_insert" ON credential_models FOR INSERT
  WITH CHECK (
    ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid)
    AND (auth.jwt()->'app_metadata'->>'iw_level')::int <= 2
  );

CREATE POLICY "cred_models_update" ON credential_models FOR UPDATE
  USING (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid))
  WITH CHECK ((auth.jwt()->'app_metadata'->>'iw_level')::int <= 2);

-- credential_request_types
CREATE POLICY "cred_req_types_select" ON credential_request_types FOR SELECT
  USING (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid));

CREATE POLICY "cred_req_types_insert" ON credential_request_types FOR INSERT
  WITH CHECK (
    ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid)
    AND (auth.jwt()->'app_metadata'->>'iw_level')::int <= 2
  );

CREATE POLICY "cred_req_types_update" ON credential_request_types FOR UPDATE
  USING (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid))
  WITH CHECK ((auth.jwt()->'app_metadata'->>'iw_level')::int <= 2);

-- credential_requests
CREATE POLICY "cred_requests_select" ON credential_requests FOR SELECT
  USING (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid));

CREATE POLICY "cred_requests_insert" ON credential_requests FOR INSERT
  WITH CHECK (
    ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid)
    AND (auth.jwt()->'app_metadata'->>'iw_level')::int <= 3
  );

CREATE POLICY "cred_requests_update" ON credential_requests FOR UPDATE
  USING (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid))
  WITH CHECK ((auth.jwt()->'app_metadata'->>'iw_level')::int <= 2);

-- ── 5. Seed — tipos padrão (inseridos via service_role, sem RLS) ─────────────
-- Executar após criar o primeiro ministério ou via painel de admin
-- INSERT INTO credential_request_types (ministry_id, nome) VALUES
--   (<ministry_id>, '1ª via'),
--   (<ministry_id>, 'Renovação'),
--   (<ministry_id>, 'Substituição');
