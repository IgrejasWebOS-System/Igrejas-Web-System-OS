-- ============================================================
-- Migration 027 — Conciliação Bancária OFX
-- ============================================================

-- Importações de extratos bancários
CREATE TABLE IF NOT EXISTS public.fin_bank_imports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id  uuid NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  account_id   uuid NOT NULL REFERENCES public.fin_accounts(id) ON DELETE CASCADE,
  nome_arquivo text NOT NULL,
  banco        text,
  agencia      text,
  conta        text,
  data_inicio  date,
  data_fim     date,
  total_linhas integer NOT NULL DEFAULT 0,
  conciliadas  integer NOT NULL DEFAULT 0,
  status       text NOT NULL DEFAULT 'PENDENTE'
               CHECK (status IN ('PENDENTE','EM_ANALISE','CONCLUIDA')),
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Linhas do extrato
CREATE TABLE IF NOT EXISTS public.fin_bank_import_lines (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id     uuid NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  import_id       uuid NOT NULL REFERENCES public.fin_bank_imports(id) ON DELETE CASCADE,
  fitid           text,                          -- ID único OFX para deduplicação
  data            date NOT NULL,
  valor           numeric(14,2) NOT NULL,        -- positivo=crédito, negativo=débito
  descricao       text,
  memo            text,
  tipo            text NOT NULL DEFAULT 'OUTRO'
                  CHECK (tipo IN ('DEBITO','CREDITO','OUTRO')),
  status          text NOT NULL DEFAULT 'PENDENTE'
                  CHECK (status IN ('PENDENTE','CONCILIADA','IGNORADA','CRIADA')),
  transaction_id  uuid REFERENCES public.fin_transactions(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_bank_imports_ministry  ON public.fin_bank_imports(ministry_id);
CREATE INDEX IF NOT EXISTS idx_bank_import_lines_imp  ON public.fin_bank_import_lines(import_id);
CREATE INDEX IF NOT EXISTS idx_bank_import_lines_fitid ON public.fin_bank_import_lines(ministry_id, fitid);

-- RLS
ALTER TABLE public.fin_bank_imports      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_bank_import_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bank_imports_select"  ON public.fin_bank_imports;
DROP POLICY IF EXISTS "bank_imports_insert"  ON public.fin_bank_imports;
DROP POLICY IF EXISTS "bank_imports_update"  ON public.fin_bank_imports;
DROP POLICY IF EXISTS "bank_imports_super"   ON public.fin_bank_imports;
DROP POLICY IF EXISTS "bank_lines_select"    ON public.fin_bank_import_lines;
DROP POLICY IF EXISTS "bank_lines_insert"    ON public.fin_bank_import_lines;
DROP POLICY IF EXISTS "bank_lines_update"    ON public.fin_bank_import_lines;
DROP POLICY IF EXISTS "bank_lines_super"     ON public.fin_bank_import_lines;

CREATE POLICY "bank_imports_select" ON public.fin_bank_imports FOR SELECT
  USING (ministry_id = ANY(get_user_ministry_ids()));
CREATE POLICY "bank_imports_insert" ON public.fin_bank_imports FOR INSERT
  WITH CHECK (ministry_id = ANY(get_user_ministry_ids()));
CREATE POLICY "bank_imports_update" ON public.fin_bank_imports FOR UPDATE
  USING (ministry_id = ANY(get_user_ministry_ids()));
CREATE POLICY "bank_imports_super"  ON public.fin_bank_imports FOR ALL
  USING (is_super_master());

CREATE POLICY "bank_lines_select" ON public.fin_bank_import_lines FOR SELECT
  USING (ministry_id = ANY(get_user_ministry_ids()));
CREATE POLICY "bank_lines_insert" ON public.fin_bank_import_lines FOR INSERT
  WITH CHECK (ministry_id = ANY(get_user_ministry_ids()));
CREATE POLICY "bank_lines_update" ON public.fin_bank_import_lines FOR UPDATE
  USING (ministry_id = ANY(get_user_ministry_ids()));
CREATE POLICY "bank_lines_super"  ON public.fin_bank_import_lines FOR ALL
  USING (is_super_master());
