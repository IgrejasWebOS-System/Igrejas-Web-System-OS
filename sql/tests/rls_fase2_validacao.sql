-- =============================================================
-- IgrejasWeb System OS — Rotinas de Validação RLS — Fase 2
-- Execute cada BLOCO separadamente no Supabase SQL Editor
-- Tabela de acesso: public.admin_roles (não user_roles)
-- =============================================================
-- Usuários de teste:
--   userN3_01@igrejasweb.test  → UID: 00000003-0000-0000-0000-000000000003
--   userN3_sp@igrejasweb.test  → UID: 00000003-0000-0000-0000-000000000005
--   userN4_01@igrejasweb.test  → UID: 00000003-0000-0000-0000-000000000004
-- =============================================================
-- DIAGNÓSTICO IMPORTANTE (executado em Bloco 0):
--   N3_01 (Piracicaba, Setor 01) e N4_01 (Piracicaba, Vila Rezende)
--   estão no MESMO ministério. A migration 005 implementou apenas
--   isolamento por ministério. Para isolar por unidade (N3/N4),
--   execute PRIMEIRO a migration 006_rls_unit_hierarchy.sql no
--   Supabase SQL Editor, depois rode os Blocos 1–6 abaixo.
--
--   SEM migration 006: Blocos 4C e 2D vão retornar > 0 (esperado).
--   COM migration 006: Todos os "DEVE SER 0" devem retornar 0.
-- =============================================================


-- ┌─────────────────────────────────────────────────────────┐
-- │  BLOCO 0 — DIAGNÓSTICO (service_role, sem RLS)          │
-- │  Execute PRIMEIRO — mapeia ministérios e unidades       │
-- └─────────────────────────────────────────────────────────┘

SELECT
  au.email,
  au.id                     AS user_uid,
  ar.level                  AS nivel,
  ar.ministry_id,
  m.name                    AS ministerio,
  ar.unit_id,
  u.name                    AS unidade,
  u.unit_type
FROM auth.users au
JOIN public.admin_roles ar ON ar.user_id = au.id
LEFT JOIN public.ministries m ON m.id = ar.ministry_id
LEFT JOIN public.units u ON u.id = ar.unit_id
WHERE au.id IN (
  '00000003-0000-0000-0000-000000000003',
  '00000003-0000-0000-0000-000000000004',
  '00000003-0000-0000-0000-000000000005'
)
ORDER BY ar.level, au.email;


-- ┌─────────────────────────────────────────────────────────┐
-- │  BLOCO 1 — GABARITO (service_role, sem RLS)             │
-- │  Total real de membros por ministério                   │
-- │  Compare com os resultados dos blocos seguintes         │
-- └─────────────────────────────────────────────────────────┘

SELECT
  m.name           AS ministerio,
  pm.ministry_id,
  COUNT(pm.id)     AS total_membros
FROM public.party_members pm
JOIN public.ministries m ON m.id = pm.ministry_id
GROUP BY m.name, pm.ministry_id
ORDER BY total_membros DESC;


-- ┌─────────────────────────────────────────────────────────┐
-- │  BLOCO 2 — TESTE N3_01                                  │
-- │  userN3_01@igrejasweb.test                              │
-- │  UID: 00000003-0000-0000-0000-000000000003              │
-- │  Esperado: vê só o seu ministério; acesso cruzado = 0   │
-- └─────────────────────────────────────────────────────────┘

BEGIN;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000003-0000-0000-0000-000000000003","role":"authenticated"}';

-- 2A: Total de membros visível para N3_01
SELECT
  'N3_01 — Total visível' AS teste,
  COUNT(*)                AS resultado
FROM public.party_members;

-- 2B: Agrupado por ministério — deve aparecer APENAS UM
SELECT
  'N3_01 — Por ministério' AS teste,
  ministry_id,
  COUNT(*)                  AS membros
FROM public.party_members
GROUP BY ministry_id;

-- 2C: Acesso cruzado — membros de outros ministérios (DEVE SER 0)
SELECT
  'N3_01 — Acesso cruzado (DEVE SER 0)' AS teste,
  COUNT(*) AS resultado
FROM public.party_members
WHERE ministry_id != (
  SELECT ministry_id FROM public.admin_roles
  WHERE user_id = '00000003-0000-0000-0000-000000000003'
  LIMIT 1
);

-- 2D: Isolamento de setor — membros de unidades fora do Setor 01 (DEVE SER 0 após migration 006)
-- Verifica se N3_01 só vê membros de unidades filhas do Setor 01
SELECT
  'N3_01 — Fora do Setor 01 (DEVE SER 0 após migr 006)' AS teste,
  COUNT(*) AS resultado
FROM public.party_members
WHERE unit_id IS NOT NULL
  AND unit_id NOT IN (
    -- Setor 01 e todos os seus filhos (hierarquia)
    WITH RECURSIVE setor_tree AS (
      SELECT id FROM public.units
      WHERE id = (
        SELECT unit_id FROM public.admin_roles
        WHERE user_id = '00000003-0000-0000-0000-000000000003'
        LIMIT 1
      )
      UNION ALL
      SELECT u.id FROM public.units u
      JOIN setor_tree st ON u.parent_id = st.id
    )
    SELECT id FROM setor_tree
  );

ROLLBACK;


-- ┌─────────────────────────────────────────────────────────┐
-- │  BLOCO 3 — TESTE N3_sp                                  │
-- │  userN3_sp@igrejasweb.test                              │
-- │  UID: 00000003-0000-0000-0000-000000000005              │
-- │  Esperado: vê só o SEU ministério (diferente de N3_01)  │
-- └─────────────────────────────────────────────────────────┘

BEGIN;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000003-0000-0000-0000-000000000005","role":"authenticated"}';

-- 3A: Total visível para N3_sp
SELECT
  'N3_sp — Total visível' AS teste,
  COUNT(*)                AS resultado
FROM public.party_members;

-- 3B: Por ministério — deve ser diferente do bloco 2
SELECT
  'N3_sp — Por ministério' AS teste,
  ministry_id,
  COUNT(*)                  AS membros
FROM public.party_members
GROUP BY ministry_id;

-- 3C: Vê membros do ministério de N3_01? (DEVE SER 0)
SELECT
  'N3_sp — Vê ministério de N3_01? (DEVE SER 0)' AS teste,
  COUNT(*) AS resultado
FROM public.party_members
WHERE ministry_id = (
  SELECT ministry_id FROM public.admin_roles
  WHERE user_id = '00000003-0000-0000-0000-000000000003'
  LIMIT 1
);

ROLLBACK;


-- ┌─────────────────────────────────────────────────────────┐
-- │  BLOCO 4 — TESTE N4_01                                  │
-- │  userN4_01@igrejasweb.test                              │
-- │  UID: 00000003-0000-0000-0000-000000000004              │
-- │  Esperado: vê APENAS membros da sua Igreja específica   │
-- └─────────────────────────────────────────────────────────┘

BEGIN;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000003-0000-0000-0000-000000000004","role":"authenticated"}';

-- 4A: Total visível para N4
SELECT
  'N4_01 — Total visível' AS teste,
  COUNT(*)                AS resultado
FROM public.party_members;

-- 4B: Por unidade — deve aparecer APENAS 1 linha
SELECT
  'N4_01 — Por unidade (deve ser 1 linha)' AS teste,
  pm.unit_id,
  u.name                                   AS nome_unidade,
  u.unit_type,
  COUNT(pm.id)                             AS membros
FROM public.party_members pm
LEFT JOIN public.units u ON u.id = pm.unit_id
GROUP BY pm.unit_id, u.name, u.unit_type;

-- 4C: Membros de outras unidades (DEVE SER 0)
SELECT
  'N4_01 — Outras unidades (DEVE SER 0)' AS teste,
  COUNT(*) AS resultado
FROM public.party_members
WHERE unit_id != (
  SELECT unit_id FROM public.admin_roles
  WHERE user_id = '00000003-0000-0000-0000-000000000004'
  LIMIT 1
)
AND unit_id IS NOT NULL;

-- 4D: Outro ministério (DEVE SER 0)
SELECT
  'N4_01 — Outro ministério (DEVE SER 0)' AS teste,
  COUNT(*) AS resultado
FROM public.party_members
WHERE ministry_id != (
  SELECT ministry_id FROM public.admin_roles
  WHERE user_id = '00000003-0000-0000-0000-000000000004'
  LIMIT 1
);

ROLLBACK;


-- ┌─────────────────────────────────────────────────────────┐
-- │  BLOCO 5 — ISOLAMENTO CRUZADO BILATERAL                 │
-- │  N3_01 ↔ N3_sp: nenhum vê o ministério do outro        │
-- └─────────────────────────────────────────────────────────┘

BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000003-0000-0000-0000-000000000003","role":"authenticated"}';

SELECT 'N3_01 → N3_sp (DEVE SER 0)' AS teste,
  COUNT(*) AS resultado
FROM public.party_members
WHERE ministry_id = (
  SELECT ministry_id FROM public.admin_roles
  WHERE user_id = '00000003-0000-0000-0000-000000000005' LIMIT 1
);
ROLLBACK;

BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000003-0000-0000-0000-000000000005","role":"authenticated"}';

SELECT 'N3_sp → N3_01 (DEVE SER 0)' AS teste,
  COUNT(*) AS resultado
FROM public.party_members
WHERE ministry_id = (
  SELECT ministry_id FROM public.admin_roles
  WHERE user_id = '00000003-0000-0000-0000-000000000003' LIMIT 1
);
ROLLBACK;


-- ┌─────────────────────────────────────────────────────────┐
-- │  BLOCO 6 — TABELAS AUXILIARES (N4_01)                   │
-- │  party_addresses, party_funcoes, member_history         │
-- └─────────────────────────────────────────────────────────┘

BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO
  '{"sub":"00000003-0000-0000-0000-000000000004","role":"authenticated"}';

SELECT 'N4 — party_addresses outro ministério (DEVE SER 0)' AS teste,
  COUNT(*) AS resultado
FROM public.party_addresses
WHERE ministry_id != (
  SELECT ministry_id FROM public.admin_roles
  WHERE user_id = '00000003-0000-0000-0000-000000000004' LIMIT 1
);

SELECT 'N4 — party_funcoes outro ministério (DEVE SER 0)' AS teste,
  COUNT(*) AS resultado
FROM public.party_funcoes
WHERE ministry_id != (
  SELECT ministry_id FROM public.admin_roles
  WHERE user_id = '00000003-0000-0000-0000-000000000004' LIMIT 1
);

SELECT 'N4 — member_history outro ministério (DEVE SER 0)' AS teste,
  COUNT(*) AS resultado
FROM public.member_history
WHERE ministry_id != (
  SELECT ministry_id FROM public.admin_roles
  WHERE user_id = '00000003-0000-0000-0000-000000000004' LIMIT 1
);

ROLLBACK;


-- ┌─────────────────────────────────────────────────────────┐
-- │  GABARITO                                               │
-- └─────────────────────────────────────────────────────────┘
--
--  PRÉ-REQUISITO: executar migration 006_rls_unit_hierarchy.sql
--
--  ✅ FASE 2 APROVADA quando todos os testes abaixo = 0:
--     Bloco 2C  → "N3_01 — Acesso cruzado"                     = 0
--     Bloco 2D  → "N3_01 — Fora do Setor 01"                   = 0 (requer migr 006)
--     Bloco 3C  → "N3_sp — Vê ministério de N3_01"             = 0
--     Bloco 4C  → "N4_01 — Outras unidades"                    = 0 (requer migr 006)
--     Bloco 4D  → "N4_01 — Outro ministério"                   = 0
--     Bloco 5   → "N3_01 → N3_sp"                              = 0
--     Bloco 5   → "N3_sp → N3_01"                              = 0
--     Bloco 6   → Todos os três                                = 0
--
--  E quando os blocos por ministério mostrarem cada um 1 linha
--  diferente (N3_01 e N3_sp em ministérios distintos).
--
--  SEM migration 006: Bloco 2D e Bloco 4C podem retornar > 0.
--  Isso é ESPERADO — significa que a migration ainda não foi aplicada.
-- =============================================================
