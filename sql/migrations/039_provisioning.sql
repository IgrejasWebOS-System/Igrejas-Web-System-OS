-- ============================================================
-- Migration 039 — Provisionamento Automático de Novo Campo
-- Função: provisionar_novo_campo()
-- Acesso: N0 Super Master via Server Action
-- Estratégia: copia dados do ministério-template (UUID fixo 001)
--   e os replica para o novo ministry_id gerado.
-- ============================================================

-- ── Tabela de jobs de provisionamento (auditoria + status) ────

CREATE TABLE IF NOT EXISTS public.provisioning_jobs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id   uuid        REFERENCES public.ministries(id) ON DELETE CASCADE,
  status        text        NOT NULL DEFAULT 'PENDING'
                CHECK (status IN ('PENDING','RUNNING','DONE','ERROR')),
  iniciado_por  uuid        REFERENCES auth.users(id),
  log           text,
  started_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz
);

-- ── Tabela de identidade visual por campo ─────────────────────
-- (complementa system_configs com campos tipados)

CREATE TABLE IF NOT EXISTS public.ministry_branding (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id     uuid        NOT NULL UNIQUE REFERENCES public.ministries(id) ON DELETE CASCADE,
  -- Identidade Visual
  nome_display    text        NOT NULL,  -- Nome completo para o cliente
  sigla           text,                  -- Ex: ADMP, ADSPA
  logo_url        text,                  -- Supabase Storage URL
  favicon_url     text,
  -- Paleta de Cores
  cor_primaria    text        NOT NULL DEFAULT '#6D28D9',
  cor_secundaria  text        NOT NULL DEFAULT '#4A7DB5',
  cor_acento      text        NOT NULL DEFAULT '#059669',
  -- Tipografia
  fonte_principal text        NOT NULL DEFAULT 'Inter',
  -- Contato público
  site_url        text,
  email_contato   text,
  whatsapp        text,
  -- Endereço da sede
  endereco        text,
  cidade          text,
  estado          text,
  cep             text,
  -- CNPJ
  cnpj            text,
  -- Controle
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ministry_branding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "branding_select" ON public.ministry_branding;
DROP POLICY IF EXISTS "branding_update" ON public.ministry_branding;
DROP POLICY IF EXISTS "branding_super"  ON public.ministry_branding;

CREATE POLICY "branding_select" ON public.ministry_branding
  FOR SELECT USING (ministry_id = ANY(get_user_ministry_ids()));

CREATE POLICY "branding_update" ON public.ministry_branding
  FOR UPDATE USING (
    ministry_id = ANY(get_user_ministry_ids())
    AND get_user_level(ministry_id) <= 1
  );

CREATE POLICY "branding_super" ON public.ministry_branding
  FOR ALL USING (is_super_master());

-- ── Função principal ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.provisionar_novo_campo(
  p_nome          text,        -- "AD Madureira Campinas"
  p_slug          text,        -- "madureira-campinas"
  p_nome_display  text,        -- Nome completo para exibição
  p_sigla         text,        -- "ADMC"
  p_cor_primaria  text         DEFAULT '#6D28D9',
  p_cor_secundaria text        DEFAULT '#4A7DB5',
  p_cnpj          text         DEFAULT NULL,
  p_cidade        text         DEFAULT NULL,
  p_estado        text         DEFAULT NULL,
  p_email_contato text         DEFAULT NULL,
  p_iniciado_por  uuid         DEFAULT NULL
)
RETURNS uuid   -- retorna o novo ministry_id
LANGUAGE plpgsql
SECURITY DEFINER   -- roda como owner, contorna RLS durante provisionamento
SET search_path = public
AS $$
DECLARE
  v_new_id         uuid := gen_random_uuid();
  v_template_id    uuid := '00000001-0000-0000-0000-000000000001'; -- Piracicaba (template)
  v_job_id         uuid;
  v_campo_unit_id  uuid := gen_random_uuid();
  v_sede_unit_id   uuid := gen_random_uuid();
  v_rec            RECORD;
  v_old_id         uuid;
  -- chart_of_accounts
  v_coa_map        jsonb := '{}';
  v_new_coa_id     uuid;
  -- fin_categories
  v_new_fin_id     uuid;
  v_fin_map        jsonb := '{}';
  -- shared para parent lookup em ambos os loops
  v_parent_new_id  uuid;
BEGIN

  -- ── 1. Criar job de provisionamento ─────────────────────────
  INSERT INTO provisioning_jobs (ministry_id, status, iniciado_por, log)
  VALUES (v_new_id, 'RUNNING', p_iniciado_por, 'Iniciando...')
  RETURNING id INTO v_job_id;

  -- ── 2. Criar ministério ──────────────────────────────────────
  INSERT INTO ministries (id, name, slug, is_active)
  VALUES (v_new_id, p_nome, p_slug, true);

  -- ── 3. Módulos — todos ativos (cópia do template) ────────────
  INSERT INTO ministry_modules (ministry_id, module, is_active)
  SELECT v_new_id, module, true
  FROM ministry_modules
  WHERE ministry_id = v_template_id
  ON CONFLICT (ministry_id, module) DO NOTHING;

  -- ── 4. Branding / Identidade Visual ─────────────────────────
  INSERT INTO ministry_branding (
    ministry_id, nome_display, sigla,
    cor_primaria, cor_secundaria,
    cnpj, cidade, estado, email_contato
  ) VALUES (
    v_new_id, p_nome_display, p_sigla,
    p_cor_primaria, p_cor_secundaria,
    p_cnpj, p_cidade, p_estado, p_email_contato
  );

  -- ── 5. Unidade raiz (CAMPO) + Sede ───────────────────────────
  INSERT INTO units (id, ministry_id, parent_id, name, unit_type, is_headquarters, is_sector_mother, order_index)
  VALUES
    (v_campo_unit_id, v_new_id, NULL,           p_nome,           'CAMPO', false, false, 0),
    (v_sede_unit_id,  v_new_id, v_campo_unit_id, 'Igreja Sede',   'SEDE',  true,  false, 0);

  -- ── 6. System configs (defaults de configuração) ─────────────
  INSERT INTO system_configs (ministry_id, chave, valor)
  VALUES
    (v_new_id, 'nome_sistema',          p_nome_display),
    (v_new_id, 'cor_primaria',          p_cor_primaria),
    (v_new_id, 'cor_secundaria',        p_cor_secundaria),
    (v_new_id, 'fuso_horario',          'America/Sao_Paulo'),
    (v_new_id, 'email_remetente',       COALESCE(p_email_contato, '')),
    (v_new_id, 'notif_aniversariantes', 'true'),
    (v_new_id, 'notif_dias_ante',       '1')
  ON CONFLICT (ministry_id, chave) DO NOTHING;

  -- ── 7. Lookup tables (cópia do template) ────────────────────

  -- member_cargos
  INSERT INTO member_cargos (ministry_id, nome, ordem)
  SELECT v_new_id, nome, ordem
  FROM member_cargos
  WHERE ministry_id = v_template_id
  ON CONFLICT (ministry_id, nome) DO NOTHING;

  -- departments
  INSERT INTO departments (ministry_id, nome, sigla)
  SELECT v_new_id, nome, sigla
  FROM departments
  WHERE ministry_id = v_template_id
  ON CONFLICT (ministry_id, nome) DO NOTHING;

  -- member_funcoes_lookup
  INSERT INTO member_funcoes_lookup (ministry_id, nome)
  SELECT v_new_id, nome
  FROM member_funcoes_lookup
  WHERE ministry_id = v_template_id
  ON CONFLICT (ministry_id, nome) DO NOTHING;

  -- member_professions
  INSERT INTO member_professions (ministry_id, nome)
  SELECT v_new_id, nome
  FROM member_professions
  WHERE ministry_id = v_template_id
  ON CONFLICT (ministry_id, nome) DO NOTHING;

  -- member_schooling (se existir)
  BEGIN
    INSERT INTO member_schooling (ministry_id, nome)
    SELECT v_new_id, nome
    FROM member_schooling
    WHERE ministry_id = v_template_id
    ON CONFLICT (ministry_id, nome) DO NOTHING;
  EXCEPTION WHEN undefined_table THEN NULL; END;

  -- member_civil_status (se existir)
  BEGIN
    INSERT INTO member_civil_status (ministry_id, nome)
    SELECT v_new_id, nome
    FROM member_civil_status
    WHERE ministry_id = v_template_id
    ON CONFLICT (ministry_id, nome) DO NOTHING;
  EXCEPTION WHEN undefined_table THEN NULL; END;

  -- ── 8. Plano de contas (chart_of_accounts) ───────────────────
  -- Cópia hierárquica: nível 1→2→3→4→5, resolvendo parent_id
  FOR v_rec IN
    SELECT * FROM chart_of_accounts
    WHERE ministry_id = v_template_id
    ORDER BY account_level ASC, ordem ASC
  LOOP
    v_new_coa_id := gen_random_uuid();
    v_coa_map := v_coa_map || jsonb_build_object(v_rec.id::text, v_new_coa_id::text);

    IF v_rec.parent_id IS NULL THEN
      v_parent_new_id := NULL;
    ELSE
      v_parent_new_id := (v_coa_map ->> v_rec.parent_id::text)::uuid;
    END IF;

    INSERT INTO chart_of_accounts (
      id, ministry_id, parent_id, code, name, type, nature,
      account_level, is_analytical, is_active, ordem
    ) VALUES (
      v_new_coa_id, v_new_id, v_parent_new_id,
      v_rec.code, v_rec.name, v_rec.type, v_rec.nature,
      v_rec.account_level, v_rec.is_analytical, v_rec.is_active, v_rec.ordem
    ) ON CONFLICT (ministry_id, code) DO NOTHING;
  END LOOP;

  -- ── 9. Categorias financeiras (fin_categories) ───────────────
  -- Cópia hierárquica com remapeamento de IDs
  FOR v_rec IN
    SELECT * FROM fin_categories
    WHERE ministry_id = v_template_id
    ORDER BY CASE WHEN parent_id IS NULL THEN 0 ELSE 1 END, ordem ASC
  LOOP
    v_new_fin_id := gen_random_uuid();
    v_fin_map := v_fin_map || jsonb_build_object(v_rec.id::text, v_new_fin_id::text);

    IF v_rec.parent_id IS NULL THEN
      v_parent_new_id := NULL;
    ELSE
      v_parent_new_id := (v_fin_map ->> v_rec.parent_id::text)::uuid;
    END IF;

    INSERT INTO fin_categories (
      id, ministry_id, parent_id, codigo, nome, tipo, fundo, ordem, ativo
    ) VALUES (
      v_new_fin_id, v_new_id, v_parent_new_id,
      v_rec.codigo, v_rec.nome, v_rec.tipo,
      v_rec.fundo, v_rec.ordem, v_rec.ativo
    ) ON CONFLICT DO NOTHING;
  END LOOP;

  -- ── 10. Document types (templates de documentos) ─────────────
  INSERT INTO document_types (ministry_id, nome, slug, template_html, variaveis_disponiveis, requer_assinatura, ativo)
  SELECT v_new_id, nome, slug, template_html, variaveis_disponiveis, requer_assinatura, ativo
  FROM document_types
  WHERE ministry_id = v_template_id
  ON CONFLICT DO NOTHING;

  -- ── 11. Regras de depreciação patrimonial ────────────────────
  BEGIN
    INSERT INTO patrimony_depreciation_rules (
      ministry_id, categoria, vida_util_anos, taxa_anual_pct,
      metodo, norma, observacoes, is_active
    )
    SELECT
      v_new_id, categoria, vida_util_anos, taxa_anual_pct,
      metodo, norma, observacoes, is_active
    FROM patrimony_depreciation_rules
    WHERE ministry_id = v_template_id OR ministry_id IS NULL
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN undefined_table THEN NULL; END;

  -- ── 12. Credenciais ministeriais (modelos) ───────────────────
  BEGIN
    INSERT INTO credential_models (ministry_id, nome, template_html, cargo_id, validade_anos, is_active)
    SELECT v_new_id, nome, template_html, NULL, validade_anos, is_active
    FROM credential_models
    WHERE ministry_id = v_template_id
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN undefined_table THEN NULL; END;

  -- ── 13. Finalizar job ────────────────────────────────────────
  UPDATE provisioning_jobs
  SET status = 'DONE',
      log = 'Campo provisionado com sucesso. ministry_id=' || v_new_id::text,
      finished_at = now()
  WHERE id = v_job_id;

  RETURN v_new_id;

EXCEPTION WHEN OTHERS THEN
  UPDATE provisioning_jobs
  SET status = 'ERROR',
      log = SQLERRM,
      finished_at = now()
  WHERE id = v_job_id;
  RAISE;
END;
$$;

-- Apenas N0 pode chamar via RPC
REVOKE ALL ON FUNCTION public.provisionar_novo_campo FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provisionar_novo_campo TO service_role;

COMMENT ON FUNCTION public.provisionar_novo_campo IS
  'Provisiona um novo campo/ministério completo: módulos, identidade visual, '
  'lookup tables, plano de contas, categorias financeiras, templates de documentos, '
  'regras de depreciação — tudo copiado do ministério-template (Piracicaba). '
  'Executar apenas como service_role (N0 Super Master via Server Action).';
