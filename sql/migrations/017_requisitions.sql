-- ============================================================
-- MIGRATION 017 — Requerimentos entre Igrejas (Fase 4B)
-- ============================================================
-- Tabelas:
--   req_types     — tipos de requerimento (lookup por ministério)
--   requisitions  — requerimentos com fluxo de situação
-- ============================================================

-- ── 1. Tipos de Requerimento ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS req_types (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id   uuid NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  nome          text NOT NULL,
  descricao     text,
  requer_membro boolean NOT NULL DEFAULT false,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ministry_id, nome)
);

CREATE INDEX IF NOT EXISTS idx_req_types_ministry ON req_types(ministry_id);

-- ── 2. Requerimentos ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS requisitions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id    uuid NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  -- Numeração sequencial por ministério
  numero         int NOT NULL,
  unit_from_id   uuid NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  unit_to_id     uuid NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  type_id        uuid NOT NULL REFERENCES req_types(id) ON DELETE RESTRICT,
  -- Membro opcional (apenas quando req_type.requer_membro = true)
  party_id       uuid REFERENCES parties(id) ON DELETE SET NULL,
  situacao       text NOT NULL DEFAULT 'PENDENTE'
                 CHECK (situacao IN ('PENDENTE','EM_ANALISE','APROVADO','REJEITADO','ARQUIVADO')),
  descricao      text NOT NULL,
  resposta       text,
  data_envio     timestamptz NOT NULL DEFAULT now(),
  data_resposta  timestamptz,
  criado_por     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  respondido_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ministry_id, numero)
);

CREATE INDEX IF NOT EXISTS idx_req_ministry    ON requisitions(ministry_id);
CREATE INDEX IF NOT EXISTS idx_req_unit_from   ON requisitions(unit_from_id);
CREATE INDEX IF NOT EXISTS idx_req_unit_to     ON requisitions(unit_to_id);
CREATE INDEX IF NOT EXISTS idx_req_situacao    ON requisitions(situacao);

-- ── 3. Trigger updated_at ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_requisitions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_req_updated_at ON requisitions;
CREATE TRIGGER trg_req_updated_at
  BEFORE UPDATE ON requisitions
  FOR EACH ROW EXECUTE FUNCTION update_requisitions_updated_at();

-- ── 4. Gerador de número sequencial ─────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS seq_req_numero START 1;

CREATE OR REPLACE FUNCTION gerar_numero_req(p_ministry_id uuid)
RETURNS int LANGUAGE plpgsql AS $$
DECLARE
  v_max int;
BEGIN
  SELECT COALESCE(MAX(numero), 0) + 1
    INTO v_max
    FROM requisitions
   WHERE ministry_id = p_ministry_id;
  RETURN v_max;
END;
$$;

-- ── 5. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE req_types    ENABLE ROW LEVEL SECURITY;
ALTER TABLE requisitions ENABLE ROW LEVEL SECURITY;

-- req_types: leitura N4+; CRUD N2+
CREATE POLICY "rqt_sel" ON req_types FOR SELECT
  USING (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid));
CREATE POLICY "rqt_ins" ON req_types FOR INSERT
  WITH CHECK (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid)
    AND (auth.jwt()->'app_metadata'->>'iw_level')::int <= 2);
CREATE POLICY "rqt_upd" ON req_types FOR UPDATE
  USING (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid))
  WITH CHECK ((auth.jwt()->'app_metadata'->>'iw_level')::int <= 2);
CREATE POLICY "rqt_del" ON req_types FOR DELETE
  USING (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid)
    AND (auth.jwt()->'app_metadata'->>'iw_level')::int <= 2);

-- requisitions: leitura por unidade (from ou to); escrita N3+ dentro do ministério
CREATE POLICY "req_sel" ON requisitions FOR SELECT
  USING (
    ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid)
    AND (
      (auth.jwt()->'app_metadata'->>'iw_level')::int <= 2
      OR unit_from_id = ((auth.jwt()->'app_metadata'->>'iw_unit_id')::uuid)
      OR unit_to_id   = ((auth.jwt()->'app_metadata'->>'iw_unit_id')::uuid)
    )
  );
CREATE POLICY "req_ins" ON requisitions FOR INSERT
  WITH CHECK (
    ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid)
    AND (auth.jwt()->'app_metadata'->>'iw_level')::int <= 3
  );
CREATE POLICY "req_upd" ON requisitions FOR UPDATE
  USING (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid))
  WITH CHECK (
    (auth.jwt()->'app_metadata'->>'iw_level')::int <= 3
    AND (
      unit_from_id = ((auth.jwt()->'app_metadata'->>'iw_unit_id')::uuid)
      OR unit_to_id   = ((auth.jwt()->'app_metadata'->>'iw_unit_id')::uuid)
      OR (auth.jwt()->'app_metadata'->>'iw_level')::int <= 2
    )
  );

-- ── 6. Seed — Tipos padrão ───────────────────────────────────────────────────
-- NOTA: Executar após ter um ministry_id disponível.
-- Os tipos abaixo são inseridos por trigger/seed script do ministério.
-- Exemplo para uso no seed manual:
/*
INSERT INTO req_types (ministry_id, nome, descricao, requer_membro)
SELECT
  m.id,
  v.nome,
  v.desc,
  v.req_membro
FROM ministries m,
LATERAL (VALUES
  ('Carta de Mudança',         'Solicitação de transferência formal de membro entre igrejas', true),
  ('Desligamento de Membro',   'Solicitação de desligamento de membro da lista eclesiástica', true),
  ('Convite para Evento',      'Convite formal para participação em evento ou culto especial', false),
  ('Pedido de Apoio',          'Solicitação de apoio ministerial, pastoral ou financeiro', false),
  ('Transferência de Membro',  'Transferência temporária ou definitiva de membro',           true),
  ('Solicitação de Informação','Pedido de informações sobre membro ou situação eclesiástica', true),
  ('Indicação de Ministério',  'Indicação formal para ingresso em ministério ou departamento', true),
  ('Outro',                    'Requerimento de natureza diversa não listada acima',          false)
) v(nome, desc, req_membro)
ON CONFLICT (ministry_id, nome) DO NOTHING;
*/
