-- ============================================================
-- Migration 004 -- Usuários de Teste para Desenvolvimento
-- Projeto: IgrejasWeb System OS
-- Ordem de execução: 4 de N
-- Descrição:
--   Cria usuários de teste diretamente em auth.users com
--   senha bcrypt e vincula admin_roles para cada nível.
--
-- ⚠ APENAS PARA AMBIENTE DE DESENVOLVIMENTO.
--   NUNCA executar em produção.
--
-- Pré-requisito: Migrations 001, 002 e 003 já executadas.
--
-- Execute no SQL Editor do Supabase Dashboard.
-- ============================================================
--
-- USUÁRIOS CRIADOS
-- ─────────────────────────────────────────────────────────────
--  E-mail                         │ Senha        │ Nível │ Onde usar
-- ─────────────────────────────────────────────────────────────
--  admin@igrejasweb.os            │ Admin@123456!│  N0   │ Super Master — acessa todos os ministérios
--  piracicaba@igrejasweb.os       │ Piracicaba@123!│ N1  │ Admin Campo Piracicaba
--  saopaulo@igrejasweb.os         │ SaoPaulo@123!│  N1   │ Admin Campo São Paulo
--  userN2_01@igrejasweb.test      │ Senha1234@   │  N2   │ Admin Sede — Igreja Sede Piracicaba
--  userN3_01@igrejasweb.test      │ Senha1234@   │  N3   │ Admin Setor — Setor 01 Piracicaba
--  userN4_01@igrejasweb.test      │ Senha1234@   │  N4   │ Usuário Local — Igreja Vila Rezende
--  userN3_sp@igrejasweb.test      │ Senha1234@   │  N3   │ Admin Setor — SP (valida isolamento)
-- ─────────────────────────────────────────────────────────────
--
-- COMO TESTAR O ISOLAMENTO DE DADOS:
--   1. Login com userN3_01 → só vê Setor 01 e suas igrejas
--   2. Login com userN4_01 → só vê Vila Rezende
--   3. Login com userN3_sp → só vê dados de São Paulo
--   4. Compare com piracicaba@igrejasweb.os (N1) que vê tudo
-- ============================================================

DO $$ BEGIN

-- ── UUIDs fixos para os novos usuários de teste ──────────────
-- (os 3 anteriores foram criados manualmente no Dashboard)
-- N2 - Admin Sede Piracicaba
-- N3 - Admin Setor 01 Piracicaba
-- N4 - Usuário Local Vila Rezende
-- N3 - Admin Setor SP

-- ============================================================
-- 1. CRIAR USUÁRIOS NO AUTH.USERS
--    bcrypt da senha "Senha1234@" gerado via gen_salt('bf')
-- ============================================================

-- N2 — userN2_01@igrejasweb.test
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  is_super_admin,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  '00000003-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'userN2_01@igrejasweb.test',
  crypt('Senha1234@', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Usuário N2 Teste","role":"admin_sede"}',
  'authenticated',
  'authenticated',
  false,
  '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

-- N3 — userN3_01@igrejasweb.test
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  aud, role, is_super_admin,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES (
  '00000003-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'userN3_01@igrejasweb.test',
  crypt('Senha1234@', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Usuário N3 Teste","role":"admin_setor"}',
  'authenticated', 'authenticated', false,
  '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

-- N4 — userN4_01@igrejasweb.test
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  aud, role, is_super_admin,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES (
  '00000003-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000000',
  'userN4_01@igrejasweb.test',
  crypt('Senha1234@', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Usuário N4 Teste","role":"usuario_local"}',
  'authenticated', 'authenticated', false,
  '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

-- N3 SP — userN3_sp@igrejasweb.test
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  aud, role, is_super_admin,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES (
  '00000003-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000000',
  'userN3_sp@igrejasweb.test',
  crypt('Senha1234@', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Usuário N3 SP Teste","role":"admin_setor"}',
  'authenticated', 'authenticated', false,
  '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. CRIAR IDENTIDADES (auth.identities) — necessário para login
-- ============================================================

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  created_at,
  updated_at,
  last_sign_in_at
) VALUES
  (
    gen_random_uuid(),
    '00000003-0000-0000-0000-000000000002',
    '{"sub":"00000003-0000-0000-0000-000000000002","email":"userN2_01@igrejasweb.test"}',
    'email',
    '00000003-0000-0000-0000-000000000002',
    now(), now(), now()
  ),
  (
    gen_random_uuid(),
    '00000003-0000-0000-0000-000000000003',
    '{"sub":"00000003-0000-0000-0000-000000000003","email":"userN3_01@igrejasweb.test"}',
    'email',
    '00000003-0000-0000-0000-000000000003',
    now(), now(), now()
  ),
  (
    gen_random_uuid(),
    '00000003-0000-0000-0000-000000000004',
    '{"sub":"00000003-0000-0000-0000-000000000004","email":"userN4_01@igrejasweb.test"}',
    'email',
    '00000003-0000-0000-0000-000000000004',
    now(), now(), now()
  ),
  (
    gen_random_uuid(),
    '00000003-0000-0000-0000-000000000005',
    '{"sub":"00000003-0000-0000-0000-000000000005","email":"userN3_sp@igrejasweb.test"}',
    'email',
    '00000003-0000-0000-0000-000000000005',
    now(), now(), now()
  )
ON CONFLICT (provider, provider_id) DO NOTHING;

-- ============================================================
-- 3. VINCULAR ADMIN_ROLES
--    Usando UUIDs fixos dos ministérios e unidades do seed 003
-- ============================================================

-- N2 → Sede Piracicaba (unit: Igreja Sede Piracicaba)
INSERT INTO public.admin_roles (user_id, ministry_id, unit_id, level, is_active)
VALUES (
  '00000003-0000-0000-0000-000000000002',
  '00000001-0000-0000-0000-000000000001',
  '00000002-0000-0000-0001-000000000002',  -- Igreja Sede Piracicaba
  2,
  true
) ON CONFLICT (user_id, ministry_id) DO NOTHING;

-- N3 → Setor 01 Piracicaba
INSERT INTO public.admin_roles (user_id, ministry_id, unit_id, level, is_active)
VALUES (
  '00000003-0000-0000-0000-000000000003',
  '00000001-0000-0000-0000-000000000001',
  '00000002-0000-0000-0001-000000010000',  -- Setor 01
  3,
  true
) ON CONFLICT (user_id, ministry_id) DO NOTHING;

-- N4 → Vila Rezende (primeira igreja do Setor 01, busca por nome)
INSERT INTO public.admin_roles (user_id, ministry_id, unit_id, level, is_active)
VALUES (
  '00000003-0000-0000-0000-000000000004',
  '00000001-0000-0000-0000-000000000001',
  (SELECT id FROM public.units
   WHERE ministry_id = '00000001-0000-0000-0000-000000000001'
     AND name = 'Vila Rezende'
   LIMIT 1),
  4,
  true
) ON CONFLICT (user_id, ministry_id) DO NOTHING;

-- N3 SP → Sede São Paulo (referência pela SEDE do campo SP)
INSERT INTO public.admin_roles (user_id, ministry_id, unit_id, level, is_active)
VALUES (
  '00000003-0000-0000-0000-000000000005',
  '00000001-0000-0000-0000-000000000002',
  (SELECT id FROM public.units
   WHERE ministry_id = '00000001-0000-0000-0000-000000000002'
     AND unit_type = 'SEDE'
   LIMIT 1),
  3,
  true
) ON CONFLICT (user_id, ministry_id) DO NOTHING;

END $$;

-- ============================================================
-- VERIFICAÇÃO FINAL
-- ============================================================
SELECT
  ar.level,
  u2.email,
  m.name  AS ministerio,
  u.name  AS unidade,
  ar.is_active
FROM public.admin_roles ar
JOIN auth.users u2  ON u2.id  = ar.user_id
JOIN public.ministries m ON m.id = ar.ministry_id
LEFT JOIN public.units u ON u.id = ar.unit_id
WHERE u2.email LIKE '%igrejasweb%'
ORDER BY ar.level, u2.email;
