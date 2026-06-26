-- ============================================================
-- Migration 038 — Push Notifications (PWA)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id  uuid NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  party_id     uuid REFERENCES public.parties(id) ON DELETE SET NULL,
  endpoint     text NOT NULL,
  p256dh       text NOT NULL,
  auth         text NOT NULL,
  user_agent   text,
  ativo        boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subs_ministry ON public.push_subscriptions(ministry_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_user     ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_subscriptions_select" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_insert" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_update" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_super"  ON public.push_subscriptions;

CREATE POLICY "push_subscriptions_select" ON public.push_subscriptions FOR SELECT USING (ministry_id = ANY(get_user_ministry_ids()));
CREATE POLICY "push_subscriptions_insert" ON public.push_subscriptions FOR INSERT WITH CHECK (ministry_id = ANY(get_user_ministry_ids()));
CREATE POLICY "push_subscriptions_update" ON public.push_subscriptions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "push_subscriptions_super"  ON public.push_subscriptions FOR ALL USING (is_super_master());
