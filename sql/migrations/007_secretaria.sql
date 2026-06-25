-- ============================================================
-- Migration 007 -- Secretaria / Documentos Eclesiásticos
-- Projeto: IgrejasWeb System OS
-- Depende de: 006_rls_unit_hierarchy.sql
-- Tabelas: document_types, documents
-- ============================================================

-- ── 1. document_types ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.document_types (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id           uuid        NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  nome                  text        NOT NULL,
  slug                  text        NOT NULL,
  descricao             text,
  template_html         text        NOT NULL DEFAULT '',
  variaveis_disponiveis jsonb       NOT NULL DEFAULT '[]',
  requer_assinatura     boolean     NOT NULL DEFAULT false,
  is_active             boolean     NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ministry_id, slug)
);

COMMENT ON TABLE public.document_types IS
  'Tipos de documento configuráveis por ministério. '
  'template_html contém variáveis como {{nome}}, {{matricula}}, {{data_emissao}}.';

-- ── 2. documents ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.documents (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id       uuid        NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  party_id          uuid        NOT NULL REFERENCES public.parties(id),
  unit_id           uuid        REFERENCES public.units(id),
  type_id           uuid        NOT NULL REFERENCES public.document_types(id),
  emitido_por       uuid        REFERENCES auth.users(id),
  data_emissao      date        NOT NULL DEFAULT CURRENT_DATE,
  numero_protocolo  text,
  conteudo_html     text,
  arquivo_url       text,
  observacoes       text,
  is_active         boolean     NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.documents IS
  'Histórico de documentos emitidos. conteudo_html é um snapshot '
  'do template preenchido no momento da emissão (imutável).';

-- ── 3. Índices ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS documents_ministry_idx    ON public.documents (ministry_id);
CREATE INDEX IF NOT EXISTS documents_party_idx       ON public.documents (party_id);
CREATE INDEX IF NOT EXISTS documents_type_idx        ON public.documents (type_id);
CREATE INDEX IF NOT EXISTS documents_emissao_idx     ON public.documents (data_emissao DESC);
CREATE INDEX IF NOT EXISTS document_types_ministry_idx ON public.document_types (ministry_id);

-- ── 4. Função: gerar número de protocolo ─────────────────────
CREATE OR REPLACE FUNCTION public.gerar_numero_protocolo(p_ministry_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_ano  text := to_char(now(), 'YYYY');
  v_slug text;
  v_seq  int;
  v_prefix text;
BEGIN
  SELECT slug INTO v_slug FROM public.ministries WHERE id = p_ministry_id;
  -- Prefixo: 3 letras do slug (ex: "ad-madureira-piracicaba" → "ADM")
  v_prefix := upper(regexp_replace(v_slug, '[^a-zA-Z]', '', 'g'));
  v_prefix := left(v_prefix, 3);

  SELECT COUNT(*) + 1 INTO v_seq
  FROM public.documents
  WHERE ministry_id = p_ministry_id
    AND to_char(data_emissao, 'YYYY') = v_ano;

  RETURN v_prefix || '-' || v_ano || '-' || lpad(v_seq::text, 4, '0');
END;
$$;

COMMENT ON FUNCTION public.gerar_numero_protocolo IS
  'Gera número de protocolo sequencial por ministério/ano. '
  'Ex: ADM-2026-0001. Não usa sequence para evitar gaps.';

-- ── 5. Trigger: updated_at em document_types ─────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS document_types_updated_at ON public.document_types;
CREATE TRIGGER document_types_updated_at
  BEFORE UPDATE ON public.document_types
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 6. RLS ───────────────────────────────────────────────────
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents      ENABLE ROW LEVEL SECURITY;

-- document_types: leitura para qualquer usuário do ministério; escrita N0/N1
DROP POLICY IF EXISTS "document_types_select" ON public.document_types;
DROP POLICY IF EXISTS "document_types_insert" ON public.document_types;
DROP POLICY IF EXISTS "document_types_update" ON public.document_types;
DROP POLICY IF EXISTS "document_types_delete" ON public.document_types;

CREATE POLICY "document_types_select" ON public.document_types
  FOR SELECT TO authenticated
  USING (public.is_super_master() OR ministry_id = ANY(public.get_user_ministry_ids()));

CREATE POLICY "document_types_insert" ON public.document_types
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_master() OR public.get_user_level(ministry_id) <= 1);

CREATE POLICY "document_types_update" ON public.document_types
  FOR UPDATE TO authenticated
  USING (public.is_super_master() OR public.get_user_level(ministry_id) <= 1);

CREATE POLICY "document_types_delete" ON public.document_types
  FOR DELETE TO authenticated
  USING (public.is_super_master() OR public.get_user_level(ministry_id) <= 1);

-- documents: N3/N4 veem apenas da sua unidade (via party_members)
DROP POLICY IF EXISTS "documents_select" ON public.documents;
DROP POLICY IF EXISTS "documents_insert" ON public.documents;
DROP POLICY IF EXISTS "documents_update" ON public.documents;

CREATE POLICY "documents_select" ON public.documents
  FOR SELECT TO authenticated
  USING (
    public.is_super_master()
    OR (
      ministry_id = ANY(public.get_user_ministry_ids())
      AND (
        public.get_user_level(ministry_id) <= 2
        OR unit_id = ANY(public.get_accessible_unit_ids(ministry_id))
      )
    )
  );

CREATE POLICY "documents_insert" ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_master()
    OR (
      ministry_id = ANY(public.get_user_ministry_ids())
      AND public.get_user_level(ministry_id) <= 4
    )
  );

-- Documentos são imutáveis após emissão (apenas N0/N1 podem cancelar via is_active)
CREATE POLICY "documents_update" ON public.documents
  FOR UPDATE TO authenticated
  USING (
    public.is_super_master()
    OR (
      ministry_id = ANY(public.get_user_ministry_ids())
      AND public.get_user_level(ministry_id) <= 1
    )
  );

-- ── 7. Seed — Tipos de documento para os 2 ministérios ───────
-- Templates HTML compactos com variáveis {{variavel}}
-- Ministério 1: AD Madureira Piracicaba
-- Ministério 2: AD Madureira São Paulo

DO $$
DECLARE
  m1 uuid := '00000001-0000-0000-0000-000000000001';
  m2 uuid := '00000001-0000-0000-0000-000000000002';
  tpl_declaracao_ativo text := '
<div style="font-family:Georgia,serif;max-width:680px;margin:0 auto;padding:40px;border:2px solid #1a365d;min-height:900px;position:relative">
  <div style="text-align:center;border-bottom:2px solid #1a365d;padding-bottom:20px;margin-bottom:30px">
    <p style="font-size:11px;color:#666;margin:0">CNPJ: {{cnpj_ministerio}}</p>
    <h1 style="font-size:22px;font-weight:bold;color:#1a365d;margin:8px 0">{{ministerio}}</h1>
    <p style="font-size:13px;color:#444;margin:0">{{endereco_ministerio}}</p>
  </div>
  <h2 style="text-align:center;font-size:16px;text-transform:uppercase;letter-spacing:2px;margin-bottom:30px;color:#1a365d">
    Declaração de Membro Ativo
  </h2>
  <p style="font-size:14px;line-height:2;text-align:justify">
    Declaramos para os devidos fins que <strong>{{nome}}</strong>, portador(a) do CPF nº <strong>{{cpf}}</strong>,
    é membro <strong>ativo</strong> desta congregação, matriculado(a) sob o nº <strong>{{matricula}}</strong>,
    com ingresso em <strong>{{data_ingresso}}</strong>, exercendo o cargo de <strong>{{cargo}}</strong>
    na unidade <strong>{{unidade}}</strong>.
  </p>
  <p style="font-size:14px;line-height:2;text-align:justify;margin-top:16px">
    O referido(a) membro encontra-se em plena comunhão com esta igreja, cumprindo com seus deveres
    eclesiásticos e usufruindo de todos os seus direitos como membro ativo.
  </p>
  <p style="font-size:13px;color:#555;margin-top:30px">
    {{unidade}}, {{data_emissao_extenso}}.
  </p>
  <div style="margin-top:60px;text-align:center">
    <div style="border-top:1px solid #333;display:inline-block;padding-top:8px;min-width:280px">
      <p style="margin:0;font-size:13px;font-weight:bold">Pastor(a) Responsável</p>
      <p style="margin:0;font-size:12px;color:#555">{{ministerio}}</p>
    </div>
  </div>
  <div style="position:absolute;bottom:30px;left:40px;right:40px;border-top:1px solid #ccc;padding-top:10px">
    <p style="font-size:10px;color:#888;text-align:center;margin:0">
      Protocolo nº {{numero_protocolo}} · Emitido em {{data_emissao}} · {{ministerio}}
    </p>
  </div>
</div>';

  tpl_certidao_batismo text := '
<div style="font-family:Georgia,serif;max-width:680px;margin:0 auto;padding:40px;border:2px solid #1a365d;min-height:900px;position:relative">
  <div style="text-align:center;border-bottom:2px solid #1a365d;padding-bottom:20px;margin-bottom:30px">
    <p style="font-size:11px;color:#666;margin:0">CNPJ: {{cnpj_ministerio}}</p>
    <h1 style="font-size:22px;font-weight:bold;color:#1a365d;margin:8px 0">{{ministerio}}</h1>
    <p style="font-size:13px;color:#444;margin:0">{{endereco_ministerio}}</p>
  </div>
  <h2 style="text-align:center;font-size:16px;text-transform:uppercase;letter-spacing:2px;margin-bottom:30px;color:#1a365d">
    Certidão de Batismo
  </h2>
  <p style="font-size:14px;line-height:2;text-align:justify">
    Certificamos que <strong>{{nome}}</strong>, portador(a) do CPF nº <strong>{{cpf}}</strong>,
    recebeu o <strong>Santo Batismo nas Águas</strong> em <strong>{{data_batismo_aguas}}</strong>
    nesta congregação, conforme o mandamento de nosso Senhor Jesus Cristo (Mateus 28:19).
  </p>
  <p style="font-size:14px;line-height:2;text-align:justify;margin-top:16px">
    O referido(a) irmão(ã) encontra-se registrado(a) em nossos livros de membros sob a
    matrícula nº <strong>{{matricula}}</strong>, na unidade <strong>{{unidade}}</strong>.
  </p>
  <p style="font-size:13px;color:#555;margin-top:30px">
    {{unidade}}, {{data_emissao_extenso}}.
  </p>
  <div style="margin-top:60px;text-align:center">
    <div style="border-top:1px solid #333;display:inline-block;padding-top:8px;min-width:280px">
      <p style="margin:0;font-size:13px;font-weight:bold">Pastor(a) Responsável</p>
      <p style="margin:0;font-size:12px;color:#555">{{ministerio}}</p>
    </div>
  </div>
  <div style="position:absolute;bottom:30px;left:40px;right:40px;border-top:1px solid #ccc;padding-top:10px">
    <p style="font-size:10px;color:#888;text-align:center;margin:0">
      Protocolo nº {{numero_protocolo}} · Emitido em {{data_emissao}} · {{ministerio}}
    </p>
  </div>
</div>';

  tpl_carta_transferencia text := '
<div style="font-family:Georgia,serif;max-width:680px;margin:0 auto;padding:40px;border:2px solid #1a365d;min-height:900px;position:relative">
  <div style="text-align:center;border-bottom:2px solid #1a365d;padding-bottom:20px;margin-bottom:30px">
    <p style="font-size:11px;color:#666;margin:0">CNPJ: {{cnpj_ministerio}}</p>
    <h1 style="font-size:22px;font-weight:bold;color:#1a365d;margin:8px 0">{{ministerio}}</h1>
    <p style="font-size:13px;color:#444;margin:0">{{endereco_ministerio}}</p>
  </div>
  <h2 style="text-align:center;font-size:16px;text-transform:uppercase;letter-spacing:2px;margin-bottom:30px;color:#1a365d">
    Carta de Transferência
  </h2>
  <p style="font-size:14px;line-height:2;text-align:justify">
    A Igreja <strong>{{unidade}}</strong>, pertencente ao <strong>{{ministerio}}</strong>,
    por meio desta carta, transfere o(a) irmão(ã) <strong>{{nome}}</strong>,
    portador(a) do CPF nº <strong>{{cpf}}</strong>, membro desta congregação sob a
    matrícula nº <strong>{{matricula}}</strong>, cargo de <strong>{{cargo}}</strong>,
    batizado(a) em águas em <strong>{{data_batismo_aguas}}</strong>.
  </p>
  <p style="font-size:14px;line-height:2;text-align:justify;margin-top:16px">
    O(A) referido(a) membro encontrava-se em plena comunhão com esta congregação,
    sem impedimento canônico conhecido, sendo digno(a) de receber a comunhão da
    Igreja que o(a) acolher.
  </p>
  <p style="font-size:14px;line-height:2;text-align:justify;margin-top:16px">
    Pedimos aos irmãos da Igreja receptora que o(a) recebam em nome do Senhor,
    inscrevendo-o(a) em seus livros de membros.
  </p>
  <p style="font-size:13px;color:#555;margin-top:30px">
    {{unidade}}, {{data_emissao_extenso}}.
  </p>
  <div style="margin-top:60px;text-align:center">
    <div style="border-top:1px solid #333;display:inline-block;padding-top:8px;min-width:280px">
      <p style="margin:0;font-size:13px;font-weight:bold">Pastor(a) Responsável</p>
      <p style="margin:0;font-size:12px;color:#555">{{ministerio}}</p>
    </div>
  </div>
  <div style="position:absolute;bottom:30px;left:40px;right:40px;border-top:1px solid #ccc;padding-top:10px">
    <p style="font-size:10px;color:#888;text-align:center;margin:0">
      Protocolo nº {{numero_protocolo}} · Emitido em {{data_emissao}} · {{ministerio}}
    </p>
  </div>
</div>';

  tpl_oficio text := '
<div style="font-family:Georgia,serif;max-width:680px;margin:0 auto;padding:40px;min-height:900px;position:relative">
  <div style="text-align:right;margin-bottom:30px">
    <p style="font-size:12px;color:#555;margin:0">{{unidade}}, {{data_emissao_extenso}}</p>
    <p style="font-size:12px;color:#555;margin:0">Ofício nº {{numero_protocolo}}</p>
  </div>
  <div style="margin-bottom:20px">
    <p style="font-size:13px;color:#444;font-weight:bold">Ao(À) Prezado(a),</p>
  </div>
  <h2 style="text-align:center;font-size:16px;text-transform:uppercase;letter-spacing:2px;margin-bottom:30px;color:#1a365d">
    Ofício ao Ministério
  </h2>
  <p style="font-size:14px;line-height:2;text-align:justify">
    Servimo-nos do presente para informar que o(a) irmão(ã) <strong>{{nome}}</strong>,
    portador(a) do CPF nº <strong>{{cpf}}</strong>, membro desta congregação sob a
    matrícula nº <strong>{{matricula}}</strong>, exercendo o cargo de <strong>{{cargo}}</strong>
    na unidade <strong>{{unidade}}</strong>.
  </p>
  <p style="font-size:14px;line-height:2;text-align:justify;margin-top:16px">
    Sem mais para o momento, subscrevemo-nos,
  </p>
  <p style="font-size:13px;color:#555;margin-top:10px">Atenciosamente,</p>
  <div style="margin-top:60px">
    <div style="border-top:1px solid #333;display:inline-block;padding-top:8px;min-width:280px">
      <p style="margin:0;font-size:13px;font-weight:bold">Pastor(a) Responsável</p>
      <p style="margin:0;font-size:12px;color:#555">{{ministerio}}</p>
    </div>
  </div>
  <div style="position:absolute;bottom:30px;left:40px;right:40px;border-top:1px solid #ccc;padding-top:10px">
    <p style="font-size:10px;color:#888;text-align:center;margin:0">
      Protocolo nº {{numero_protocolo}} · Emitido em {{data_emissao}} · {{ministerio}}
    </p>
  </div>
</div>';

  tpl_declaracao_cargo text := '
<div style="font-family:Georgia,serif;max-width:680px;margin:0 auto;padding:40px;border:2px solid #1a365d;min-height:900px;position:relative">
  <div style="text-align:center;border-bottom:2px solid #1a365d;padding-bottom:20px;margin-bottom:30px">
    <p style="font-size:11px;color:#666;margin:0">CNPJ: {{cnpj_ministerio}}</p>
    <h1 style="font-size:22px;font-weight:bold;color:#1a365d;margin:8px 0">{{ministerio}}</h1>
    <p style="font-size:13px;color:#444;margin:0">{{endereco_ministerio}}</p>
  </div>
  <h2 style="text-align:center;font-size:16px;text-transform:uppercase;letter-spacing:2px;margin-bottom:30px;color:#1a365d">
    Declaração de Cargo Eclesiástico
  </h2>
  <p style="font-size:14px;line-height:2;text-align:justify">
    Declaramos que <strong>{{nome}}</strong>, portador(a) do CPF nº <strong>{{cpf}}</strong>,
    membro desta congregação sob a matrícula nº <strong>{{matricula}}</strong>, ocupa o
    cargo de <strong>{{cargo}}</strong> nesta Igreja desde <strong>{{data_ingresso}}</strong>,
    na unidade <strong>{{unidade}}</strong>, pertencente ao <strong>{{ministerio}}</strong>.
  </p>
  <p style="font-size:14px;line-height:2;text-align:justify;margin-top:16px">
    O cargo acima mencionado é reconhecido e ratificado pela liderança desta congregação,
    estando o(a) membro em plena comunhão e no exercício regular de suas funções eclesiásticas.
  </p>
  <p style="font-size:13px;color:#555;margin-top:30px">
    {{unidade}}, {{data_emissao_extenso}}.
  </p>
  <div style="margin-top:60px;text-align:center">
    <div style="border-top:1px solid #333;display:inline-block;padding-top:8px;min-width:280px">
      <p style="margin:0;font-size:13px;font-weight:bold">Pastor(a) Responsável</p>
      <p style="margin:0;font-size:12px;color:#555">{{ministerio}}</p>
    </div>
  </div>
  <div style="position:absolute;bottom:30px;left:40px;right:40px;border-top:1px solid #ccc;padding-top:10px">
    <p style="font-size:10px;color:#888;text-align:center;margin:0">
      Protocolo nº {{numero_protocolo}} · Emitido em {{data_emissao}} · {{ministerio}}
    </p>
  </div>
</div>';

  v_vars jsonb := '["nome","cpf","matricula","cargo","situacao","unidade","ministerio","data_emissao","data_emissao_extenso","numero_protocolo","data_batismo_aguas","data_batismo_espirito","data_ingresso","cnpj_ministerio","endereco_ministerio"]';

BEGIN
  -- Insere para Piracicaba
  INSERT INTO public.document_types (ministry_id, nome, slug, descricao, template_html, variaveis_disponiveis, requer_assinatura)
  VALUES
    (m1, 'Declaração de Membro Ativo',      'declaracao-membro-ativo',    'Confirma que o membro está ativo na congregação',               tpl_declaracao_ativo,      v_vars, false),
    (m1, 'Certidão de Batismo',             'certidao-batismo',           'Certifica a data e local do batismo nas águas',                  tpl_certidao_batismo,      v_vars, false),
    (m1, 'Carta de Transferência',          'carta-transferencia',        'Carta formal para transferência inter ou intra-ministerial',     tpl_carta_transferencia,   v_vars, false),
    (m1, 'Ofício ao Ministério',            'oficio-ministerio',          'Ofício formal para comunicações com entidades externas',         tpl_oficio,                v_vars, false),
    (m1, 'Declaração de Cargo Eclesiástico','declaracao-cargo',           'Declara o cargo ocupado pelo membro na congregação',            tpl_declaracao_cargo,      v_vars, false)
  ON CONFLICT (ministry_id, slug) DO NOTHING;

  -- Insere para São Paulo (mesmos templates)
  INSERT INTO public.document_types (ministry_id, nome, slug, descricao, template_html, variaveis_disponiveis, requer_assinatura)
  VALUES
    (m2, 'Declaração de Membro Ativo',      'declaracao-membro-ativo',    'Confirma que o membro está ativo na congregação',               tpl_declaracao_ativo,      v_vars, false),
    (m2, 'Certidão de Batismo',             'certidao-batismo',           'Certifica a data e local do batismo nas águas',                  tpl_certidao_batismo,      v_vars, false),
    (m2, 'Carta de Transferência',          'carta-transferencia',        'Carta formal para transferência inter ou intra-ministerial',     tpl_carta_transferencia,   v_vars, false),
    (m2, 'Ofício ao Ministério',            'oficio-ministerio',          'Ofício formal para comunicações com entidades externas',         tpl_oficio,                v_vars, false),
    (m2, 'Declaração de Cargo Eclesiástico','declaracao-cargo',           'Declara o cargo ocupado pelo membro na congregação',            tpl_declaracao_cargo,      v_vars, false)
  ON CONFLICT (ministry_id, slug) DO NOTHING;
END;
$$;

-- ── Verificação pós-migração ─────────────────────────────────
SELECT ministry_id, nome, slug, is_active
FROM public.document_types
ORDER BY ministry_id, nome;
