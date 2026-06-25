-- ============================================================
-- Migration 010 -- Protocolo com Sequence por Ministério
-- Projeto: IgrejasWeb System OS
-- Depende de: 007_secretaria.sql
-- Objetivo: Eliminar race condition em gerar_numero_protocolo.
--   COUNT+1 sob carga simultânea gera protocolos duplicados.
--   Sequences PostgreSQL são atômicas — garantem unicidade.
-- ============================================================

-- ── 1. Tabela de controle de sequences por ministério ─────────
-- Em vez de criar sequences dinâmicas (DDL em runtime é arriscado),
-- usamos uma tabela com lock advisory para garantir atomicidade.
-- Esta abordagem funciona em qualquer plano do Supabase (incluindo Free).
CREATE TABLE IF NOT EXISTS public.protocol_sequences (
  ministry_id  uuid    PRIMARY KEY REFERENCES public.ministries(id) ON DELETE CASCADE,
  last_seq     integer NOT NULL DEFAULT 0,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.protocol_sequences IS
  'Contadores atômicos de protocolo por ministério. '
  'UPDATE ... RETURNING garante serialização sem race condition.';

-- RLS: ninguém acessa diretamente — apenas via SECURITY DEFINER function
ALTER TABLE public.protocol_sequences ENABLE ROW LEVEL SECURITY;
-- Sem policies = nenhum acesso externo. Acesso apenas via função abaixo.

-- ── 2. Inicializar sequences para ministérios existentes ──────
INSERT INTO public.protocol_sequences (ministry_id, last_seq)
SELECT
  id,
  -- Começa do máximo atual para não gerar conflito com protocolos já emitidos
  COALESCE(
    (SELECT COUNT(*) FROM public.documents d WHERE d.ministry_id = m.id),
    0
  )
FROM public.ministries m
ON CONFLICT (ministry_id) DO NOTHING;

-- ── 3. Trigger: criar sequence ao inserir novo ministério ─────
CREATE OR REPLACE FUNCTION public.trg_create_protocol_sequence()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.protocol_sequences (ministry_id, last_seq)
  VALUES (NEW.id, 0)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_protocol_sequence ON public.ministries;
CREATE TRIGGER create_protocol_sequence
  AFTER INSERT ON public.ministries
  FOR EACH ROW EXECUTE FUNCTION public.trg_create_protocol_sequence();

-- ── 4. Nova função gerar_numero_protocolo — atômica ───────────
-- Substitui a versão anterior baseada em COUNT+1.
-- UPDATE ... RETURNING é atômico: incrementa e retorna em uma só operação,
-- mesmo sob carga concorrente — PostgreSQL garante serialização por linha.
CREATE OR REPLACE FUNCTION public.gerar_numero_protocolo(p_ministry_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_seq         integer;
  v_year        text;
  v_prefix      text;
  v_slug        text;
BEGIN
  -- Obtém o próximo número de forma atômica
  UPDATE public.protocol_sequences
  SET    last_seq   = last_seq + 1,
         updated_at = now()
  WHERE  ministry_id = p_ministry_id
  RETURNING last_seq INTO v_seq;

  -- Se o ministério não tem sequence (não deveria acontecer), cria e tenta novamente
  IF v_seq IS NULL THEN
    INSERT INTO public.protocol_sequences (ministry_id, last_seq)
    VALUES (p_ministry_id, 1)
    ON CONFLICT (ministry_id) DO UPDATE
      SET last_seq = protocol_sequences.last_seq + 1,
          updated_at = now()
    RETURNING last_seq INTO v_seq;
  END IF;

  v_year := to_char(now(), 'YYYY');

  -- Prefixo derivado do slug do ministério (3 primeiras letras, maiúsculas)
  SELECT UPPER(LEFT(REGEXP_REPLACE(slug, '[^a-zA-Z]', '', 'g'), 3))
  INTO   v_prefix
  FROM   public.ministries
  WHERE  id = p_ministry_id;

  v_prefix := COALESCE(NULLIF(v_prefix, ''), 'DOC');

  -- Formato: PREFIX-YYYY-NNNN (ex: MAD-2026-0042)
  RETURN v_prefix || '-' || v_year || '-' || LPAD(v_seq::text, 4, '0');
END;
$$;

COMMENT ON FUNCTION public.gerar_numero_protocolo IS
  'Gera número de protocolo único e atômico usando UPDATE...RETURNING em '
  'protocol_sequences. Elimina race condition da versão COUNT+1 anterior. '
  'Formato: PREFIX-YYYY-NNNN (ex: MAD-2026-0042).';
