-- ============================================================
-- MIGRATION 015 — Material e Pedidos (Fase 3F)
-- ============================================================
-- Tabelas:
--   materials            — catálogo de materiais do ministério
--   material_orders      — pedidos por unidade
--   material_order_items — itens do pedido (subtotal gerado)
-- ============================================================

-- ── 1. Catálogo de materiais ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS materials (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id    uuid    NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  nome           text    NOT NULL,
  descricao      text,
  unidade        text    NOT NULL DEFAULT 'unid',  -- unid, cx, kg, m, L, etc.
  valor_unitario numeric(10,2) NOT NULL DEFAULT 0,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ministry_id, nome)
);

CREATE INDEX IF NOT EXISTS idx_materials_ministry ON materials(ministry_id);

-- ── 2. Pedidos ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS material_orders (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id  uuid NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
  unit_id      uuid REFERENCES units(id) ON DELETE SET NULL,
  situacao     text NOT NULL DEFAULT 'PENDENTE'
               CHECK (situacao IN ('PENDENTE','CONFIRMADO','PARCIALMENTE_PAGO','PAGO','CANCELADO')),
  data_pedido  date NOT NULL DEFAULT CURRENT_DATE,
  observacoes  text,
  criado_por   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_por_nome text,   -- snapshot do nome no momento do pedido
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_material_orders_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_material_orders_updated_at ON material_orders;
CREATE TRIGGER trg_material_orders_updated_at
  BEFORE UPDATE ON material_orders
  FOR EACH ROW EXECUTE FUNCTION update_material_orders_updated_at();

CREATE INDEX IF NOT EXISTS idx_mat_orders_ministry ON material_orders(ministry_id);
CREATE INDEX IF NOT EXISTS idx_mat_orders_unit     ON material_orders(unit_id);
CREATE INDEX IF NOT EXISTS idx_mat_orders_situacao ON material_orders(situacao);

-- ── 3. Itens do pedido ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS material_order_items (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       uuid    NOT NULL REFERENCES material_orders(id) ON DELETE CASCADE,
  material_id    uuid    REFERENCES materials(id) ON DELETE SET NULL,
  nome_snapshot  text    NOT NULL,           -- snapshot do nome do material
  quantidade     int     NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  valor_unitario numeric(10,2) NOT NULL DEFAULT 0,
  subtotal       numeric(10,2) GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mat_order_items_order ON material_order_items(order_id);

-- ── 4. View: pedidos com total ────────────────────────────────────────────────
CREATE OR REPLACE VIEW material_orders_with_total AS
SELECT
  mo.*,
  u.nome AS unit_nome,
  COALESCE(SUM(moi.subtotal), 0) AS total,
  COUNT(moi.id) AS qtd_itens
FROM material_orders mo
LEFT JOIN units u ON u.id = mo.unit_id
LEFT JOIN material_order_items moi ON moi.order_id = mo.id
GROUP BY mo.id, u.nome;

-- ── 5. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE materials           ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_order_items ENABLE ROW LEVEL SECURITY;

-- materials: SELECT todos, INSERT/UPDATE N2+
CREATE POLICY "mat_sel" ON materials FOR SELECT
  USING (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid));
CREATE POLICY "mat_ins" ON materials FOR INSERT
  WITH CHECK (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid)
    AND (auth.jwt()->'app_metadata'->>'iw_level')::int <= 2);
CREATE POLICY "mat_upd" ON materials FOR UPDATE
  USING (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid))
  WITH CHECK ((auth.jwt()->'app_metadata'->>'iw_level')::int <= 2);

-- material_orders: SELECT todos, INSERT N3+, UPDATE (situação) N2+
CREATE POLICY "mat_ord_sel" ON material_orders FOR SELECT
  USING (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid));
CREATE POLICY "mat_ord_ins" ON material_orders FOR INSERT
  WITH CHECK (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid)
    AND (auth.jwt()->'app_metadata'->>'iw_level')::int <= 3);
CREATE POLICY "mat_ord_upd" ON material_orders FOR UPDATE
  USING (ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid))
  WITH CHECK ((auth.jwt()->'app_metadata'->>'iw_level')::int <= 2);

-- material_order_items: seguem o pedido
CREATE POLICY "mat_item_sel" ON material_order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM material_orders mo
    WHERE mo.id = order_id
      AND mo.ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid)
  ));
CREATE POLICY "mat_item_ins" ON material_order_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM material_orders mo
    WHERE mo.id = order_id
      AND mo.ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid)
      AND (auth.jwt()->'app_metadata'->>'iw_level')::int <= 3
  ));
CREATE POLICY "mat_item_del" ON material_order_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM material_orders mo
    WHERE mo.id = order_id
      AND mo.ministry_id = ((auth.jwt()->'app_metadata'->>'iw_ministry_id')::uuid)
      AND (auth.jwt()->'app_metadata'->>'iw_level')::int <= 2
  ));
