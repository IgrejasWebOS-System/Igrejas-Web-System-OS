-- ============================================================
-- Migration 002 -- Row Level Security (RLS)
-- Projeto: IgrejasWeb System OS
-- Ordem de execucao: 2 de 3
-- Descricao: Politicas de seguranca por ministry_id.
--   O banco rejeita qualquer consulta fora do contexto
--   do usuario logado, independente do codigo da aplicacao.
-- ============================================================

-- ── Habilitar RLS em todas as tabelas ───────────────────────
ALTER TABLE public.ministries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ministry_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parties         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_roles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles     ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- FUNCAO AUXILIAR: retorna os ministry_ids do usuario logado
-- Usada nas policies para evitar subquery repetida.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_ministry_ids()
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT ARRAY(
    SELECT ministry_id
    FROM   public.admin_roles
    WHERE  user_id   = auth.uid()
    AND    is_active = true
    AND    ministry_id IS NOT NULL
  );
$$;

-- ============================================================
-- FUNCAO AUXILIAR: retorna o nivel do usuario em um ministerio
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_level(p_ministry_id uuid)
RETURNS smallint LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT level
  FROM   public.admin_roles
  WHERE  user_id      = auth.uid()
  AND    ministry_id  = p_ministry_id
  AND    is_active    = true
  LIMIT 1;
$$;

-- ============================================================
-- FUNCAO AUXILIAR: usuario e Super-Master (nivel 0)?
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_super_master()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE  user_id      = auth.uid()
    AND    level        = 0
    AND    is_active    = true
  );
$$;

-- ============================================================
-- MINISTRIES
-- Super-Master ve tudo.
-- Demais usuarios veem apenas os ministerios aos quais pertencem.
-- ============================================================
DROP POLICY IF EXISTS "ministries_select"  ON public.ministries;
DROP POLICY IF EXISTS "ministries_insert"  ON public.ministries;
DROP POLICY IF EXISTS "ministries_update"  ON public.ministries;
DROP POLICY IF EXISTS "ministries_delete"  ON public.ministries;

CREATE POLICY "ministries_select" ON public.ministries
  FOR SELECT TO authenticated
  USING (
    public.is_super_master()
    OR id = ANY(public.get_user_ministry_ids())
  );

CREATE POLICY "ministries_insert" ON public.ministries
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_master());

CREATE POLICY "ministries_update" ON public.ministries
  FOR UPDATE TO authenticated
  USING (public.is_super_master());

CREATE POLICY "ministries_delete" ON public.ministries
  FOR DELETE TO authenticated
  USING (public.is_super_master());

-- ============================================================
-- MINISTRY_MODULES
-- ============================================================
DROP POLICY IF EXISTS "ministry_modules_select"  ON public.ministry_modules;
DROP POLICY IF EXISTS "ministry_modules_insert"  ON public.ministry_modules;
DROP POLICY IF EXISTS "ministry_modules_update"  ON public.ministry_modules;
DROP POLICY IF EXISTS "ministry_modules_delete"  ON public.ministry_modules;

CREATE POLICY "ministry_modules_select" ON public.ministry_modules
  FOR SELECT TO authenticated
  USING (
    public.is_super_master()
    OR ministry_id = ANY(public.get_user_ministry_ids())
  );

CREATE POLICY "ministry_modules_insert" ON public.ministry_modules
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_master()
    OR (
      ministry_id = ANY(public.get_user_ministry_ids())
      AND public.get_user_level(ministry_id) <= 1
    )
  );

CREATE POLICY "ministry_modules_update" ON public.ministry_modules
  FOR UPDATE TO authenticated
  USING (
    public.is_super_master()
    OR (
      ministry_id = ANY(public.get_user_ministry_ids())
      AND public.get_user_level(ministry_id) <= 1
    )
  );

CREATE POLICY "ministry_modules_delete" ON public.ministry_modules
  FOR DELETE TO authenticated
  USING (public.is_super_master());

-- ============================================================
-- UNITS
-- Super-Master ve tudo.
-- Nivel 1 (Campo) ve todas as unidades do seu campo.
-- Nivel 2 (Sede) ve todas as unidades do seu campo.
-- Nivel 3 (Setor) ve as unidades do seu setor.
-- Nivel 4 (Local) ve apenas sua propria unidade.
-- Por ora: qualquer usuario autenticado do ministerio pode ler.
-- Refinamento de escopo por nivel sera feito em migracao futura.
-- ============================================================
DROP POLICY IF EXISTS "units_select" ON public.units;
DROP POLICY IF EXISTS "units_insert" ON public.units;
DROP POLICY IF EXISTS "units_update" ON public.units;
DROP POLICY IF EXISTS "units_delete" ON public.units;

CREATE POLICY "units_select" ON public.units
  FOR SELECT TO authenticated
  USING (
    public.is_super_master()
    OR ministry_id = ANY(public.get_user_ministry_ids())
  );

CREATE POLICY "units_insert" ON public.units
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_master()
    OR (
      ministry_id = ANY(public.get_user_ministry_ids())
      AND public.get_user_level(ministry_id) <= 2
    )
  );

CREATE POLICY "units_update" ON public.units
  FOR UPDATE TO authenticated
  USING (
    public.is_super_master()
    OR (
      ministry_id = ANY(public.get_user_ministry_ids())
      AND public.get_user_level(ministry_id) <= 2
    )
  );

CREATE POLICY "units_delete" ON public.units
  FOR DELETE TO authenticated
  USING (
    public.is_super_master()
    OR (
      ministry_id = ANY(public.get_user_ministry_ids())
      AND public.get_user_level(ministry_id) <= 1
    )
  );

-- ============================================================
-- PARTIES
-- Isolamento completo por ministry_id.
-- ============================================================
DROP POLICY IF EXISTS "parties_select" ON public.parties;
DROP POLICY IF EXISTS "parties_insert" ON public.parties;
DROP POLICY IF EXISTS "parties_update" ON public.parties;
DROP POLICY IF EXISTS "parties_delete" ON public.parties;

CREATE POLICY "parties_select" ON public.parties
  FOR SELECT TO authenticated
  USING (
    public.is_super_master()
    OR ministry_id = ANY(public.get_user_ministry_ids())
  );

CREATE POLICY "parties_insert" ON public.parties
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_master()
    OR ministry_id = ANY(public.get_user_ministry_ids())
  );

CREATE POLICY "parties_update" ON public.parties
  FOR UPDATE TO authenticated
  USING (
    public.is_super_master()
    OR ministry_id = ANY(public.get_user_ministry_ids())
  );

CREATE POLICY "parties_delete" ON public.parties
  FOR DELETE TO authenticated
  USING (
    public.is_super_master()
    OR (
      ministry_id = ANY(public.get_user_ministry_ids())
      AND public.get_user_level(ministry_id) <= 2
    )
  );

-- ============================================================
-- PARTY_ROLES
-- ============================================================
DROP POLICY IF EXISTS "party_roles_select" ON public.party_roles;
DROP POLICY IF EXISTS "party_roles_insert" ON public.party_roles;
DROP POLICY IF EXISTS "party_roles_update" ON public.party_roles;
DROP POLICY IF EXISTS "party_roles_delete" ON public.party_roles;

CREATE POLICY "party_roles_select" ON public.party_roles
  FOR SELECT TO authenticated
  USING (
    public.is_super_master()
    OR ministry_id = ANY(public.get_user_ministry_ids())
  );

CREATE POLICY "party_roles_insert" ON public.party_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_master()
    OR ministry_id = ANY(public.get_user_ministry_ids())
  );

CREATE POLICY "party_roles_update" ON public.party_roles
  FOR UPDATE TO authenticated
  USING (
    public.is_super_master()
    OR ministry_id = ANY(public.get_user_ministry_ids())
  );

CREATE POLICY "party_roles_delete" ON public.party_roles
  FOR DELETE TO authenticated
  USING (
    public.is_super_master()
    OR (
      ministry_id = ANY(public.get_user_ministry_ids())
      AND public.get_user_level(ministry_id) <= 2
    )
  );

-- ============================================================
-- ADMIN_ROLES
-- Apenas Super-Master e nivel 1 (Campo) podem criar/remover acessos.
-- Cada usuario pode ler o proprio registro.
-- ============================================================
DROP POLICY IF EXISTS "admin_roles_select" ON public.admin_roles;
DROP POLICY IF EXISTS "admin_roles_insert" ON public.admin_roles;
DROP POLICY IF EXISTS "admin_roles_update" ON public.admin_roles;
DROP POLICY IF EXISTS "admin_roles_delete" ON public.admin_roles;

CREATE POLICY "admin_roles_select" ON public.admin_roles
  FOR SELECT TO authenticated
  USING (
    public.is_super_master()
    OR user_id = auth.uid()
    OR ministry_id = ANY(public.get_user_ministry_ids())
  );

CREATE POLICY "admin_roles_insert" ON public.admin_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_master()
    OR (
      ministry_id = ANY(public.get_user_ministry_ids())
      AND public.get_user_level(ministry_id) <= 1
    )
  );

CREATE POLICY "admin_roles_update" ON public.admin_roles
  FOR UPDATE TO authenticated
  USING (
    public.is_super_master()
    OR (
      ministry_id = ANY(public.get_user_ministry_ids())
      AND public.get_user_level(ministry_id) <= 1
    )
  );

CREATE POLICY "admin_roles_delete" ON public.admin_roles
  FOR DELETE TO authenticated
  USING (
    public.is_super_master()
    OR (
      ministry_id = ANY(public.get_user_ministry_ids())
      AND public.get_user_level(ministry_id) <= 1
    )
  );
