-- ============================================================
-- Migration 006 -- RLS Hierárquico por Unidade
-- Projeto: IgrejasWeb System OS
-- Depende de: 005_members.sql
-- Objetivo: Adicionar filtro de unit_id ao RLS de party_members
--   e tabelas relacionadas para usuários N3 e N4.
--   N0–N2: veem tudo do ministério (sem restrição de unidade)
--   N3 (Admin Setor): veem membros da própria unidade + descendentes
--   N4 (Usuário Local): veem membros da própria Igreja + descendentes
-- ============================================================

-- ── Helper: retorna todos os unit_ids acessíveis ao usuário ──
-- Usa recursão para percorrer a hierarquia de unidades.
-- N0–N2: retorna NULL (não restringe por unidade)
-- N3–N4: retorna o unit_id do usuário + todos os descendentes
CREATE OR REPLACE FUNCTION public.get_accessible_unit_ids(p_ministry_id uuid)
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH RECURSIVE unit_tree AS (
    -- Base: unidade do próprio usuário
    SELECT id
    FROM   public.units
    WHERE  id = public.get_user_unit_id(p_ministry_id)
      AND  ministry_id = p_ministry_id

    UNION ALL

    -- Recursão: todas as unidades filhas (descendentes diretos e indiretos)
    SELECT u.id
    FROM   public.units u
    JOIN   unit_tree ut ON u.parent_id = ut.id
    WHERE  u.ministry_id = p_ministry_id
      AND  u.is_active = true
  )
  SELECT ARRAY(SELECT id FROM unit_tree);
$$;

COMMENT ON FUNCTION public.get_accessible_unit_ids IS
  'Retorna array de unit_ids acessíveis ao usuário logado em um ministério. '
  'Para N3/N4: o próprio unit_id + todos os descendentes na hierarquia. '
  'Usado pelas policies de RLS para filtrar membros por unidade.';

-- ── Atualiza policy de SELECT em party_members ───────────────
-- Adiciona filtro de unidade para N3 (level=3) e N4 (level=4).
-- N0-N2 (level <= 2) continuam vendo tudo do ministério.

DROP POLICY IF EXISTS "party_members_select" ON public.party_members;

CREATE POLICY "party_members_select" ON public.party_members
  FOR SELECT TO authenticated
  USING (
    -- Super-Master: acesso irrestrito
    public.is_super_master()
    OR (
      -- Usuário pertence ao ministério do registro
      ministry_id = ANY(public.get_user_ministry_ids())
      AND (
        -- N0, N1, N2: veem todos os membros do ministério
        public.get_user_level(ministry_id) <= 2

        -- N3, N4: apenas membros da sua unidade e descendentes
        OR unit_id = ANY(public.get_accessible_unit_ids(ministry_id))

        -- Membros sem unidade definida: visíveis apenas para N0-N2
        -- (unit_id IS NULL já é excluído pelo filtro acima para N3/N4)
      )
    )
  );

-- ── Atualiza policy de SELECT em party_addresses ─────────────
-- Endereço segue a mesma regra do membro.
DROP POLICY IF EXISTS "party_addresses_select" ON public.party_addresses;

CREATE POLICY "party_addresses_select" ON public.party_addresses
  FOR SELECT TO authenticated
  USING (
    public.is_super_master()
    OR (
      ministry_id = ANY(public.get_user_ministry_ids())
      AND (
        public.get_user_level(ministry_id) <= 2
        -- N3/N4: só endereços de membros da sua unidade (via JOIN implícito no party_id)
        -- Como party_addresses não tem unit_id direto, filtramos via party_id
        OR EXISTS (
          SELECT 1 FROM public.party_members pm
          WHERE pm.party_id    = party_addresses.party_id
            AND pm.ministry_id = party_addresses.ministry_id
            AND pm.unit_id     = ANY(public.get_accessible_unit_ids(party_addresses.ministry_id))
        )
      )
    )
  );

-- ── Atualiza policy de SELECT em party_funcoes ───────────────
DROP POLICY IF EXISTS "party_funcoes_select" ON public.party_funcoes;

CREATE POLICY "party_funcoes_select" ON public.party_funcoes
  FOR SELECT TO authenticated
  USING (
    public.is_super_master()
    OR (
      ministry_id = ANY(public.get_user_ministry_ids())
      AND (
        public.get_user_level(ministry_id) <= 2
        OR EXISTS (
          SELECT 1 FROM public.party_members pm
          WHERE pm.party_id    = party_funcoes.party_id
            AND pm.ministry_id = party_funcoes.ministry_id
            AND pm.unit_id     = ANY(public.get_accessible_unit_ids(party_funcoes.ministry_id))
        )
      )
    )
  );

-- ── Atualiza policy de SELECT em party_dependents ────────────
DROP POLICY IF EXISTS "party_dependents_select" ON public.party_dependents;

CREATE POLICY "party_dependents_select" ON public.party_dependents
  FOR SELECT TO authenticated
  USING (
    public.is_super_master()
    OR (
      ministry_id = ANY(public.get_user_ministry_ids())
      AND (
        public.get_user_level(ministry_id) <= 2
        OR EXISTS (
          SELECT 1 FROM public.party_members pm
          WHERE pm.party_id    = party_dependents.responsible_party_id
            AND pm.ministry_id = party_dependents.ministry_id
            AND pm.unit_id     = ANY(public.get_accessible_unit_ids(party_dependents.ministry_id))
        )
      )
    )
  );

-- ── Atualiza policy de SELECT em member_history ──────────────
DROP POLICY IF EXISTS "member_history_select" ON public.member_history;

CREATE POLICY "member_history_select" ON public.member_history
  FOR SELECT TO authenticated
  USING (
    public.is_super_master()
    OR (
      ministry_id = ANY(public.get_user_ministry_ids())
      AND (
        public.get_user_level(ministry_id) <= 2
        OR EXISTS (
          SELECT 1 FROM public.party_members pm
          WHERE pm.party_id    = member_history.party_id
            AND pm.ministry_id = member_history.ministry_id
            AND pm.unit_id     = ANY(public.get_accessible_unit_ids(member_history.ministry_id))
        )
      )
    )
  );

-- ── Atualiza policy de SELECT em member_transfers ────────────
DROP POLICY IF EXISTS "member_transfers_select" ON public.member_transfers;

CREATE POLICY "member_transfers_select" ON public.member_transfers
  FOR SELECT TO authenticated
  USING (
    public.is_super_master()
    OR (
      ministry_id = ANY(public.get_user_ministry_ids())
      AND (
        public.get_user_level(ministry_id) <= 2
        OR EXISTS (
          SELECT 1 FROM public.party_members pm
          WHERE pm.party_id    = member_transfers.party_id
            AND pm.ministry_id = member_transfers.ministry_id
            AND pm.unit_id     = ANY(public.get_accessible_unit_ids(member_transfers.ministry_id))
        )
      )
    )
  );

-- ── Verificação pós-migração ─────────────────────────────────
-- Execute para confirmar que as policies foram criadas:
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'party_members', 'party_addresses', 'party_funcoes',
    'party_dependents', 'member_history', 'member_transfers'
  )
  AND cmd = 'SELECT'
ORDER BY tablename;

-- ============================================================
-- RESULTADO ESPERADO APÓS ESTA MIGRATION:
--
-- N3_01 (Setor 01, Piracicaba):
--   → Vê apenas membros das igrejas do Setor 01
--   → NÃO vê membros de outros setores do mesmo campo
--
-- N4_01 (Vila Rezende, Piracicaba):
--   → Vê apenas membros de Vila Rezende (e sub-unidades filhas)
--   → NÃO vê membros de outras igrejas do Setor 01
--
-- N3_sp (Sede SP, São Paulo):
--   → Vê membros de todas as unidades filhas da Sede SP
--   → NÃO vê nada de Piracicaba (ministério diferente)
--
-- N0/N1/N2: comportamento inalterado (veem tudo do campo)
-- ============================================================
