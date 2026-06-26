-- ============================================================
-- Migration 019 -- Seed: 3 membros de teste
-- Objetivo: popular parties + party_members para validar
--           o modulo Escola Teologica (busca e matricula).
-- Execute no SQL Editor do Supabase.
-- ============================================================

DO $$ DECLARE
  v_min uuid := '00000001-0000-0000-0000-000000000001'; -- AD Madureira Piracicaba
  p1    uuid := gen_random_uuid();
  p2    uuid := gen_random_uuid();
  p3    uuid := gen_random_uuid();
BEGIN

-- ── PARTIES (registro universal de pessoa) ────────────────────
INSERT INTO public.parties (id, ministry_id, party_type, full_name, email, is_active) VALUES
  (p1, v_min, 'PESSOA_FISICA', 'Joao da Silva',     'joao@teste.com',   true),
  (p2, v_min, 'PESSOA_FISICA', 'Maria Oliveira',    'maria@teste.com',  true),
  (p3, v_min, 'PESSOA_FISICA', 'Pedro Almeida',     'pedro@teste.com',  true)
ON CONFLICT DO NOTHING;

-- ── PARTY_MEMBERS (dados eclesiasticos) ───────────────────────
INSERT INTO public.party_members
  (party_id, ministry_id, party_subtype, situacao, matricula)
VALUES
  (p1, v_min, 'MEMBRO_ATIVO', 'ATIVO', '20260001'),
  (p2, v_min, 'MEMBRO_ATIVO', 'ATIVO', '20260002'),
  (p3, v_min, 'MEMBRO_ATIVO', 'ATIVO', '20260003')
ON CONFLICT DO NOTHING;

RAISE NOTICE 'Seed concluido: 3 membros de teste inseridos.';
END $$;
