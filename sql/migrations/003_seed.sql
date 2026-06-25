-- ============================================================
-- Migration 003 -- Seed Data Inicial
-- Projeto: IgrejasWeb System OS
-- Ordem de execucao: 3 de 3
-- Descricao: Dados iniciais para iniciar o desenvolvimento.
--   - 2 ministerios (AD Madureira Piracicaba + Sao Paulo)
--   - Modulos ativos por ministerio
--   - Estrutura de unidades (Campo > Sede > Setores > Igrejas)
-- ============================================================
-- ATENCAO: Substitua os UUIDs fixos se precisar recriar.
-- Execute este arquivo DEPOIS de 001 e 002.
-- ============================================================

-- ── UUIDs fixos para facilitar referencias ───────────────────
-- Ministerio Piracicaba
DO $$ BEGIN

-- ============================================================
-- MINISTERIOS
-- ============================================================
INSERT INTO public.ministries (id, name, slug, is_active) VALUES
  ('00000001-0000-0000-0000-000000000001', 'AD Madureira Piracicaba', 'madureira-piracicaba', true),
  ('00000001-0000-0000-0000-000000000002', 'AD Madureira Sao Paulo',  'madureira-saopaulo',   true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- MODULOS POR MINISTERIO
-- Piracicaba: todos os modulos ativos
-- Sao Paulo: membros, financeiro, ebd (exemplo parcial)
-- Ajuste conforme necessidade real
-- ============================================================

-- Piracicaba
INSERT INTO public.ministry_modules (ministry_id, module, is_active) VALUES
  ('00000001-0000-0000-0000-000000000001', 'membros',      true),
  ('00000001-0000-0000-0000-000000000001', 'financeiro',   true),
  ('00000001-0000-0000-0000-000000000001', 'escola',       true),
  ('00000001-0000-0000-0000-000000000001', 'cursos',       true),
  ('00000001-0000-0000-0000-000000000001', 'ebd',          true),
  ('00000001-0000-0000-0000-000000000001', 'secretaria',   true),
  ('00000001-0000-0000-0000-000000000001', 'patrimonio',   true),
  ('00000001-0000-0000-0000-000000000001', 'eventos',      true),
  ('00000001-0000-0000-0000-000000000001', 'ocorrencias',  true)
ON CONFLICT (ministry_id, module) DO NOTHING;

-- Sao Paulo
INSERT INTO public.ministry_modules (ministry_id, module, is_active) VALUES
  ('00000001-0000-0000-0000-000000000002', 'membros',      true),
  ('00000001-0000-0000-0000-000000000002', 'financeiro',   true),
  ('00000001-0000-0000-0000-000000000002', 'escola',       false),
  ('00000001-0000-0000-0000-000000000002', 'cursos',       true),
  ('00000001-0000-0000-0000-000000000002', 'ebd',          true),
  ('00000001-0000-0000-0000-000000000002', 'secretaria',   false),
  ('00000001-0000-0000-0000-000000000002', 'patrimonio',   false),
  ('00000001-0000-0000-0000-000000000002', 'eventos',      true),
  ('00000001-0000-0000-0000-000000000002', 'ocorrencias',  true)
ON CONFLICT (ministry_id, module) DO NOTHING;

-- ============================================================
-- UNITS -- AD MADUREIRA PIRACICABA
-- Hierarquia: CAMPO > SEDE > SETOR > IGREJA
-- ============================================================

-- CAMPO
INSERT INTO public.units (id, ministry_id, parent_id, name, unit_type, is_headquarters, is_sector_mother, order_index) VALUES
  ('00000002-0000-0000-0001-000000000001',
   '00000001-0000-0000-0000-000000000001',
   NULL,
   'Campo Madureira Piracicaba', 'CAMPO', false, false, 0)
ON CONFLICT DO NOTHING;

-- SEDE (is_headquarters = true, tambem e uma Igreja)
INSERT INTO public.units (id, ministry_id, parent_id, name, unit_type, is_headquarters, is_sector_mother, order_index) VALUES
  ('00000002-0000-0000-0001-000000000002',
   '00000001-0000-0000-0000-000000000001',
   '00000002-0000-0000-0001-000000000001',
   'Igreja Sede Piracicaba', 'SEDE', true, false, 0)
ON CONFLICT DO NOTHING;

-- SETOR 01
INSERT INTO public.units (id, ministry_id, parent_id, name, unit_type, is_headquarters, is_sector_mother, order_index) VALUES
  ('00000002-0000-0000-0001-000000010000',
   '00000001-0000-0000-0000-000000000001',
   '00000002-0000-0000-0001-000000000002',
   'Setor 01', 'SETOR', false, false, 1)
ON CONFLICT DO NOTHING;

-- Igrejas do Setor 01
INSERT INTO public.units (ministry_id, parent_id, name, unit_type, is_headquarters, is_sector_mother, order_index) VALUES
  ('00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0001-000000010000', 'Vila Rezende',    'IGREJA', false, true,  1),
  ('00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0001-000000010000', 'Jardim Europa',   'IGREJA', false, false, 2),
  ('00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0001-000000010000', 'Pq. Conceicao II','IGREJA', false, false, 3),
  ('00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0001-000000010000', 'Jupia',           'IGREJA', false, false, 4),
  ('00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0001-000000010000', 'Nhoquim',         'IGREJA', false, false, 5),
  ('00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0001-000000010000', 'Travessa',        'IGREJA', false, false, 6),
  ('00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0001-000000010000', 'Central',         'IGREJA', false, false, 7)
ON CONFLICT DO NOTHING;

-- SETOR 02
INSERT INTO public.units (id, ministry_id, parent_id, name, unit_type, is_headquarters, is_sector_mother, order_index) VALUES
  ('00000002-0000-0000-0001-000000020000',
   '00000001-0000-0000-0000-000000000001',
   '00000002-0000-0000-0001-000000000002',
   'Setor 02', 'SETOR', false, false, 2)
ON CONFLICT DO NOTHING;

-- Igrejas do Setor 02
INSERT INTO public.units (ministry_id, parent_id, name, unit_type, is_headquarters, is_sector_mother, order_index) VALUES
  ('00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0001-000000020000', 'Artemis', 'IGREJA', false, true, 1)
ON CONFLICT DO NOTHING;

-- SETOR 11
INSERT INTO public.units (id, ministry_id, parent_id, name, unit_type, is_headquarters, is_sector_mother, order_index) VALUES
  ('00000002-0000-0000-0001-000000110000',
   '00000001-0000-0000-0000-000000000001',
   '00000002-0000-0000-0001-000000000002',
   'Setor 11', 'SETOR', false, false, 11)
ON CONFLICT DO NOTHING;

INSERT INTO public.units (ministry_id, parent_id, name, unit_type, is_headquarters, is_sector_mother, order_index) VALUES
  ('00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0001-000000110000', 'Santa Terezinha', 'IGREJA', false, true, 1)
ON CONFLICT DO NOTHING;

-- SETOR 13
INSERT INTO public.units (id, ministry_id, parent_id, name, unit_type, is_headquarters, is_sector_mother, order_index) VALUES
  ('00000002-0000-0000-0001-000000130000',
   '00000001-0000-0000-0000-000000000001',
   '00000002-0000-0000-0001-000000000002',
   'Setor 13', 'SETOR', false, false, 13)
ON CONFLICT DO NOTHING;

INSERT INTO public.units (ministry_id, parent_id, name, unit_type, is_headquarters, is_sector_mother, order_index) VALUES
  ('00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0001-000000130000', 'Mario Dedine', 'IGREJA', false, true, 1)
ON CONFLICT DO NOTHING;

-- Setores 03-10, 12, 14, 15 (estrutura base sem igrejas por ora)
INSERT INTO public.units (ministry_id, parent_id, name, unit_type, order_index) VALUES
  ('00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0001-000000000002', 'Setor 03', 'SETOR', 3),
  ('00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0001-000000000002', 'Setor 04', 'SETOR', 4),
  ('00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0001-000000000002', 'Setor 05', 'SETOR', 5),
  ('00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0001-000000000002', 'Setor 06', 'SETOR', 6),
  ('00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0001-000000000002', 'Setor 07', 'SETOR', 7),
  ('00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0001-000000000002', 'Setor 08', 'SETOR', 8),
  ('00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0001-000000000002', 'Setor 09', 'SETOR', 9),
  ('00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0001-000000000002', 'Setor 10', 'SETOR', 10),
  ('00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0001-000000000002', 'Setor 12', 'SETOR', 12),
  ('00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0001-000000000002', 'Setor 14', 'SETOR', 14),
  ('00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0001-000000000002', 'Setor 15', 'SETOR', 15)
ON CONFLICT DO NOTHING;

-- ============================================================
-- UNITS -- AD MADUREIRA SAO PAULO (estrutura base)
-- ============================================================
INSERT INTO public.units (ministry_id, parent_id, name, unit_type, is_headquarters, order_index) VALUES
  ('00000001-0000-0000-0000-000000000002', NULL,                                         'Campo Madureira Sao Paulo', 'CAMPO', false, 0),
  ('00000001-0000-0000-0000-000000000002', (SELECT id FROM public.units WHERE name = 'Campo Madureira Sao Paulo' AND ministry_id = '00000001-0000-0000-0000-000000000002'), 'Igreja Sede Sao Paulo', 'SEDE', true, 0)
ON CONFLICT DO NOTHING;

END $$;

-- ============================================================
-- VERIFICACAO FINAL
-- ============================================================
SELECT
  m.name AS ministerio,
  COUNT(DISTINCT mm.module) FILTER (WHERE mm.is_active) AS modulos_ativos,
  COUNT(DISTINCT u.id) AS total_unidades
FROM public.ministries m
LEFT JOIN public.ministry_modules mm ON mm.ministry_id = m.id
LEFT JOIN public.units u ON u.ministry_id = m.id
GROUP BY m.name
ORDER BY m.name;
