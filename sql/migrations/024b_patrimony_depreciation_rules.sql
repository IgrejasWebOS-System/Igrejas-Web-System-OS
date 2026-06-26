-- ============================================================
-- Migration 024B — Regras de Depreciação Patrimonial
-- Tabela normativa (SRF IN 162/1998 + ITG 1000 R1 + NBC TG 04)
-- Tipo de aquisição + valor de avaliação no bem patrimonial
-- ============================================================

-- ── 1. TIPO DE AQUISIÇÃO no bem patrimonial ───────────────────
-- NBC TG 04 item 16: ativo adquirido por doação mensurado a valor justo

ALTER TABLE public.patrimony_items
  ADD COLUMN IF NOT EXISTS tipo_aquisicao text DEFAULT 'COMPRA'
    CHECK (tipo_aquisicao IN (
      'COMPRA',           -- aquisição onerosa normal
      'DOACAO',           -- recebido em doação; base = valor justo na data
      'BENEFICIAMENTO',   -- cessão de uso com melhorias absorvidas
      'PERMUTA',          -- troca por outro bem ou serviço
      'PRODUCAO_PROPRIA', -- construído/fabricado pela própria entidade
      'TRANSFERENCIA_INTERNA' -- recebido de outra unidade do mesmo ministério
    )),
  ADD COLUMN IF NOT EXISTS valor_avaliacao numeric(14,2),  -- valor justo (doação/permuta)
  ADD COLUMN IF NOT EXISTS laudo_avaliacao text;           -- referência ao laudo/CFC

-- ── 2. PATRIMONY_DEPRECIATION_RULES — Tabela Normativa ───────
-- Permite manutenção manual das taxas conforme atualizações legais.
-- Cada linha representa uma regra vigente para categoria + tipo_aquisicao.

CREATE TABLE IF NOT EXISTS public.patrimony_depreciation_rules (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id      uuid        REFERENCES public.ministries(id) ON DELETE CASCADE,
  -- NULL = regra global (padrão do sistema); NOT NULL = override por ministério
  categoria        text        NOT NULL
                     CHECK (categoria IN ('IMOVEL','MOVEL','EQUIPAMENTO','VEICULO',
                                          'INSTRUMENTO_MUSICAL','INFORMATICA','OUTRO')),
  tipo_aquisicao   text        NOT NULL DEFAULT 'COMPRA'
                     CHECK (tipo_aquisicao IN (
                       'COMPRA','DOACAO','BENEFICIAMENTO',
                       'PERMUTA','PRODUCAO_PROPRIA','TRANSFERENCIA_INTERNA'
                     )),
  taxa_anual       numeric(5,2) NOT NULL CHECK (taxa_anual >= 0 AND taxa_anual <= 100),
  vida_util_anos   integer     CHECK (vida_util_anos > 0),
  metodo           text        NOT NULL DEFAULT 'LINEAR'
                     CHECK (metodo IN ('LINEAR','SOMA_DIGITOS','SALDO_DECRESCENTE')),
  norma_referencia text        NOT NULL, -- ex: "SRF IN 162/1998 art. 3º"
  notas            text,
  vigente_desde    date        NOT NULL DEFAULT CURRENT_DATE,
  vigente_ate      date,
  is_active        boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ministry_id, categoria, tipo_aquisicao, vigente_desde)
);

-- ── 3. TRIGGER updated_at ─────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at_depr_rules()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_depr_rules_updated_at ON public.patrimony_depreciation_rules;
CREATE TRIGGER trg_depr_rules_updated_at
  BEFORE UPDATE ON public.patrimony_depreciation_rules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_depr_rules();

-- ── 4. RLS ────────────────────────────────────────────────────

ALTER TABLE public.patrimony_depreciation_rules ENABLE ROW LEVEL SECURITY;

-- Regras globais (ministry_id IS NULL): todos podem ler, só super_master altera
-- Regras de ministério: RLS normal
DROP POLICY IF EXISTS "depr_rules_select" ON public.patrimony_depreciation_rules;
DROP POLICY IF EXISTS "depr_rules_insert" ON public.patrimony_depreciation_rules;
DROP POLICY IF EXISTS "depr_rules_update" ON public.patrimony_depreciation_rules;
DROP POLICY IF EXISTS "depr_rules_super"  ON public.patrimony_depreciation_rules;

CREATE POLICY "depr_rules_select" ON public.patrimony_depreciation_rules
  FOR SELECT USING (
    ministry_id IS NULL                                   -- regras globais
    OR ministry_id = ANY(get_user_ministry_ids())         -- regras do ministério
  );

CREATE POLICY "depr_rules_insert" ON public.patrimony_depreciation_rules
  FOR INSERT WITH CHECK (
    (ministry_id IS NULL AND is_super_master())
    OR ministry_id = ANY(get_user_ministry_ids())
  );

CREATE POLICY "depr_rules_update" ON public.patrimony_depreciation_rules
  FOR UPDATE USING (
    (ministry_id IS NULL AND is_super_master())
    OR ministry_id = ANY(get_user_ministry_ids())
  );

CREATE POLICY "depr_rules_super" ON public.patrimony_depreciation_rules
  USING (is_super_master());

-- ── 5. FUNÇÃO: buscar taxa vigente para um bem ────────────────
-- Prioridade: regra do ministério > regra global
-- Retorna a regra mais recente vigente na data

CREATE OR REPLACE FUNCTION public.buscar_taxa_depreciacao(
  p_ministry_id  uuid,
  p_categoria    text,
  p_tipo_aquis   text DEFAULT 'COMPRA',
  p_data         date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  taxa_anual       numeric,
  vida_util_anos   integer,
  metodo           text,
  norma_referencia text
) LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  -- 1. Tenta regra específica do ministério
  RETURN QUERY
    SELECT r.taxa_anual, r.vida_util_anos, r.metodo, r.norma_referencia
      FROM public.patrimony_depreciation_rules r
     WHERE r.ministry_id = p_ministry_id
       AND r.categoria = p_categoria
       AND r.tipo_aquisicao = p_tipo_aquis
       AND r.is_active = true
       AND r.vigente_desde <= p_data
       AND (r.vigente_ate IS NULL OR r.vigente_ate >= p_data)
     ORDER BY r.vigente_desde DESC
     LIMIT 1;

  -- 2. Se não encontrou, usa regra global
  IF NOT FOUND THEN
    RETURN QUERY
      SELECT r.taxa_anual, r.vida_util_anos, r.metodo, r.norma_referencia
        FROM public.patrimony_depreciation_rules r
       WHERE r.ministry_id IS NULL
         AND r.categoria = p_categoria
         AND r.tipo_aquisicao = p_tipo_aquis
         AND r.is_active = true
         AND r.vigente_desde <= p_data
         AND (r.vigente_ate IS NULL OR r.vigente_ate >= p_data)
       ORDER BY r.vigente_desde DESC
       LIMIT 1;
  END IF;
END;
$$;

-- ── 6. SEED — Taxas globais (ministry_id IS NULL) ─────────────
-- Fonte primária: SRF IN 162/1998 (Art. 3º, Anexo I)
-- Para entidades sem fins lucrativos + NBC TG 04 + ITG 1000 R1

INSERT INTO public.patrimony_depreciation_rules
  (ministry_id, categoria, tipo_aquisicao, taxa_anual, vida_util_anos,
   metodo, norma_referencia, notas, vigente_desde)
VALUES
-- ── IMÓVEL ────────────────────────────────────────────────────
(NULL,'IMOVEL','COMPRA',           2.5,  40, 'LINEAR','SRF IN 162/1998 Art.3 Anexo I',
  'Taxa padrão para edificações e benfeitorias. Terrenos NÃO se depreciam.','1998-12-31'),
(NULL,'IMOVEL','DOACAO',           2.5,  40, 'LINEAR','NBC TG 04 + SRF IN 162/1998',
  'Base de cálculo = valor justo na data da doação (laudo de avaliação exigido pela NBC TG 04).','1998-12-31'),
(NULL,'IMOVEL','PRODUCAO_PROPRIA', 2.5,  40, 'LINEAR','SRF IN 162/1998 + NBC TG 04',
  'Custo de produção própria: materiais + mão de obra + encargos.','1998-12-31'),
(NULL,'IMOVEL','BENEFICIAMENTO',   2.5,  40, 'LINEAR','SRF IN 162/1998',
  'Benfeitorias em imóvel de terceiros: depreciar pelo menor entre vida útil remanescente e prazo do contrato.','1998-12-31'),

-- ── VEÍCULO ───────────────────────────────────────────────────
(NULL,'VEICULO','COMPRA',          20.0, 5,  'LINEAR','SRF IN 162/1998 Art.3 Anexo I',
  'Veículos de transporte em geral. Ônibus e caminhões: 25% a.a. (vida útil 4 anos) — ajustar manualmente.','1998-12-31'),
(NULL,'VEICULO','DOACAO',          20.0, 5,  'LINEAR','NBC TG 04 + SRF IN 162/1998',
  'Veículo doado: base = valor justo (FIPE ou laudo) na data da doação.','1998-12-31'),
(NULL,'VEICULO','PERMUTA',         20.0, 5,  'LINEAR','NBC TG 04 Art.24',
  'Permuta de veículo: base = valor justo do bem dado em troca (se determinável) ou do bem recebido.','1998-12-31'),

-- ── EQUIPAMENTO ───────────────────────────────────────────────
(NULL,'EQUIPAMENTO','COMPRA',       10.0, 10, 'LINEAR','SRF IN 162/1998 Art.3 Anexo I',
  'Máquinas e equipamentos em geral. Equipamentos industriais ou de uso intensivo podem usar 20% a.a.','1998-12-31'),
(NULL,'EQUIPAMENTO','DOACAO',       10.0, 10, 'LINEAR','NBC TG 04 + SRF IN 162/1998',
  'Valor justo na data da doação. Considerar depreciação do bem já ocorrida antes da doação.','1998-12-31'),
(NULL,'EQUIPAMENTO','BENEFICIAMENTO',10.0,10, 'LINEAR','SRF IN 162/1998',
  'Equipamentos recebidos em beneficiamento: depreciar pelo prazo de uso acordado ou vida útil, o menor.','1998-12-31'),

-- ── INFORMÁTICA ───────────────────────────────────────────────
(NULL,'INFORMATICA','COMPRA',       20.0, 5,  'LINEAR','SRF IN 162/1998 Art.3 Anexo I',
  'Computadores, servidores, impressoras, tablets. Obsolescência tecnológica acelerada.','1998-12-31'),
(NULL,'INFORMATICA','DOACAO',       20.0, 5,  'LINEAR','NBC TG 04 + SRF IN 162/1998',
  'Equipamento de informática doado: verificar estado de conservação e ajustar vida útil remanescente.','1998-12-31'),

-- ── INSTRUMENTO MUSICAL ───────────────────────────────────────
(NULL,'INSTRUMENTO_MUSICAL','COMPRA', 5.0, 20, 'LINEAR','ITG 1000 R1 + Prática do setor',
  'Taxa conservadora para instrumentos musicais de qualidade. Órgãos e pianos: até 40 anos vida útil.','2015-01-01'),
(NULL,'INSTRUMENTO_MUSICAL','DOACAO', 5.0, 20, 'LINEAR','NBC TG 04 + ITG 1000 R1',
  'Instrumento doado: avaliar estado de conservação. Instrumentos históricos/raros: vida útil indefinida (não depreciar).','2015-01-01'),
(NULL,'INSTRUMENTO_MUSICAL','PRODUCAO_PROPRIA',5.0,20,'LINEAR','ITG 1000 R1',
  'Instrumentos confeccionados pela própria entidade: custo de materiais + mão de obra.','2015-01-01'),

-- ── MÓVEIS E UTENSÍLIOS ───────────────────────────────────────
(NULL,'MOVEL','COMPRA',             10.0, 10, 'LINEAR','SRF IN 162/1998 Art.3 Anexo I',
  'Móveis, utensílios e equipamentos de escritório. Móveis de aço ou madeira maciça podem ter vida útil 15–20 anos.','1998-12-31'),
(NULL,'MOVEL','DOACAO',             10.0, 10, 'LINEAR','NBC TG 04 + SRF IN 162/1998',
  'Móvel doado: valor justo (pesquisa de mercado ou tabela FIPECAFI).','1998-12-31'),
(NULL,'MOVEL','TRANSFERENCIA_INTERNA',10.0,10,'LINEAR','Política interna + NBC TG 04',
  'Transferência entre unidades do mesmo ministério: manter valor contábil líquido (não recalcular).','2015-01-01'),

-- ── OUTRO ─────────────────────────────────────────────────────
(NULL,'OUTRO','COMPRA',             10.0, 10, 'LINEAR','SRF IN 162/1998 (padrão genérico)',
  'Taxa genérica. Revisar conforme o tipo específico do bem. Ajustar manualmente se necessário.','1998-12-31'),
(NULL,'OUTRO','DOACAO',             10.0, 10, 'LINEAR','NBC TG 04 + SRF IN 162/1998',
  'Bem doado não classificado: exigir laudo de avaliação a valor justo.','1998-12-31')

ON CONFLICT (ministry_id, categoria, tipo_aquisicao, vigente_desde) DO NOTHING;

-- ── 7. COMENTÁRIOS NORMATIVOS ─────────────────────────────────
COMMENT ON TABLE public.patrimony_depreciation_rules IS
'Tabela de taxas normativas de depreciação patrimonial.
Regras globais (ministry_id IS NULL): baseadas em SRF IN 162/1998 e NBC TG 04.
Regras de ministério (ministry_id NOT NULL): sobrescrevem as globais para casos específicos.

Normas de referência:
  - SRF IN 162/1998: taxas fiscais para fins tributários (ainda aplicadas como referência)
  - NBC TG 04 (R4) 2017: depreciação, amortização e redução ao valor recuperável
  - NBC TG 04 Art.16: ativos adquiridos por doação = valor justo na data de aquisição
  - ITG 1000 (R1) 2015: demonstrações contábeis para pequenas entidades (inclui igrejas)
  - ITG 2002 (R1) 2015: entidades sem finalidade de lucro

Método LINEAR = cota de depreciação constante = (Valor Aquisição − Valor Residual) × Taxa / 12 por mês.
Método SOMA_DIGITOS = acelerada nos primeiros anos (veículos/tecnologia).
Método SALDO_DECRESCENTE = aplica taxa sobre saldo contábil restante.';
