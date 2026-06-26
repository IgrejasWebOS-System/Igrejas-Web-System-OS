-- ============================================================
-- Migration 033 — Analytics & BI (Materialized Views)
-- ============================================================

-- Dashboard financeiro mensal
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_financeiro_mensal AS
SELECT
  ministry_id,
  date_trunc('month', data) AS mes,
  SUM(CASE WHEN tipo = 'RECEITA' AND status = 'APROVADO' THEN valor ELSE 0 END) AS total_receitas,
  SUM(CASE WHEN tipo = 'DESPESA' AND status = 'APROVADO' THEN valor ELSE 0 END) AS total_despesas,
  SUM(CASE WHEN tipo = 'RECEITA' AND status = 'APROVADO' THEN valor ELSE 0 END) -
  SUM(CASE WHEN tipo = 'DESPESA' AND status = 'APROVADO' THEN valor ELSE 0 END) AS saldo_liquido,
  COUNT(*) AS total_lancamentos
FROM public.fin_transactions
WHERE data IS NOT NULL
GROUP BY ministry_id, date_trunc('month', data);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_fin_mensal ON public.mv_financeiro_mensal(ministry_id, mes);

-- Membros por mês (crescimento) — via party_roles onde role_type = 'MEMBRO'
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_membros_mensal AS
SELECT
  pr.ministry_id,
  date_trunc('month', pr.started_at) AS mes,
  COUNT(*) AS novos_membros,
  COUNT(*) FILTER (WHERE pr.status = 'ACTIVE') AS ativos_novos
FROM public.party_roles pr
WHERE pr.role_type = 'MEMBRO'
GROUP BY pr.ministry_id, date_trunc('month', pr.started_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_membros_mensal ON public.mv_membros_mensal(ministry_id, mes);

-- Eventos por categoria
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_eventos_stats AS
SELECT
  e.ministry_id,
  e.tipo,
  date_trunc('month', e.data_inicio) AS mes,
  COUNT(DISTINCT e.id) AS total_eventos,
  COUNT(DISTINCT r.id) AS total_inscricoes,
  SUM(CASE WHEN r.status = 'CONFIRMADO' THEN 1 ELSE 0 END) AS confirmados
FROM public.events e
LEFT JOIN public.event_registrations r ON r.event_id = e.id
GROUP BY e.ministry_id, e.tipo, date_trunc('month', e.data_inicio);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_eventos_stats ON public.mv_eventos_stats(ministry_id, tipo, mes);

-- Função para refresh manual (chamar via cron ou action)
CREATE OR REPLACE FUNCTION public.refresh_analytics_views()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_financeiro_mensal;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_membros_mensal;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_eventos_stats;
END;
$$;
