-- ============================================================
-- Migration 040 — role_title em admin_roles
-- Projeto: IgrejasWeb System OS
-- Depende de: 004_test_users.sql
-- Objetivo: Adicionar coluna role_title para identificar sub-papéis
--   dentro de um mesmo nível de acesso (ex: secretário, tesoureiro,
--   pastor local) sem alterar a hierarquia de permissões.
--
-- Modelo de uso:
--   N4 + role_title = 'secretario'   → Secretário da Igreja
--   N4 + role_title = 'tesoureiro'   → Tesoureiro da Igreja
--   N4 + role_title = NULL           → Pastor / Líder Local
--   N3 + role_title = NULL           → Admin Setor
--   N2 + role_title = NULL           → Admin Sede / Campo
--
-- IMPORTANTE: role_title é apenas informativo/visual.
--   A restrição de escopo (quais registros o usuário pode ver/editar)
--   é controlada pela função get_accessible_unit_ids() via RLS.
--   Todos os N4, independente do role_title, têm acesso idêntico
--   dentro da sua unidade.
-- ============================================================

-- ── Adicionar coluna ─────────────────────────────────────────
ALTER TABLE public.admin_roles
  ADD COLUMN IF NOT EXISTS role_title varchar(50) DEFAULT NULL;

COMMENT ON COLUMN public.admin_roles.role_title IS
  'Sub-papel descritivo dentro do nível. Ex: secretario, tesoureiro, pastor_local, '
  'lider_departamento. Usado apenas para exibição — não afeta permissões.';

-- ── Índice para filtros por role_title ───────────────────────
CREATE INDEX IF NOT EXISTS idx_admin_roles_role_title
  ON public.admin_roles(role_title)
  WHERE role_title IS NOT NULL;

-- ── Atualizar usuários de teste com role_title ───────────────
-- N4 de Vila Rezende → Pastor Local
UPDATE public.admin_roles
SET role_title = 'pastor_local'
WHERE user_id = '00000003-0000-0000-0000-000000000004'
  AND level = 4;

-- ── Verificação ───────────────────────────────────────────────
SELECT
  u.email,
  ar.level,
  ar.role_title,
  un.name AS unidade,
  m.name  AS ministerio
FROM public.admin_roles ar
JOIN auth.users        u  ON u.id  = ar.user_id
JOIN public.ministries m  ON m.id  = ar.ministry_id
LEFT JOIN public.units un ON un.id = ar.unit_id
WHERE u.email LIKE '%igrejasweb%'
ORDER BY ar.level, u.email;
