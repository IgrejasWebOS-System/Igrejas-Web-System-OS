-- ============================================================
-- Migration 009 -- Audit Log
-- Projeto: IgrejasWeb System OS
-- Depende de: 001_base_schema.sql
-- Objetivo: Rastreabilidade completa de operações sensíveis.
--   Quem alterou, o quê, quando, com qual contexto.
--   Compliance LGPD: manter trilha de acesso a dados pessoais.
-- ============================================================

-- ── 1. Tabela principal ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id     uuid        REFERENCES public.ministries(id) ON DELETE SET NULL,
  user_id         uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_table    text        NOT NULL,
  entity_id       uuid,
  action          text        NOT NULL,
  payload_before  jsonb,
  payload_after   jsonb,
  ip_address      inet,
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (action IN (
    'INSERT', 'UPDATE', 'DELETE',
    'VIEW_PDF', 'VIEW_FICHA', 'EXPORT',
    'LOGIN', 'LOGOUT', 'CONTEXT_SELECT',
    'INVITE_USER', 'DEACTIVATE_USER',
    'EMIT_DOCUMENT', 'CANCEL_DOCUMENT',
    'TRANSFER_MEMBER', 'STATUS_CHANGE'
  ))
);

COMMENT ON TABLE public.audit_log IS
  'Trilha de auditoria imutável. INSERT-only via trigger ou Server Action. '
  'Compliance LGPD: registra acesso e alteração de dados pessoais de membros.';

-- Índices para consultas de auditoria
CREATE INDEX IF NOT EXISTS audit_log_ministry_id_idx  ON public.audit_log (ministry_id);
CREATE INDEX IF NOT EXISTS audit_log_user_id_idx      ON public.audit_log (user_id);
CREATE INDEX IF NOT EXISTS audit_log_entity_table_idx ON public.audit_log (entity_table);
CREATE INDEX IF NOT EXISTS audit_log_entity_id_idx    ON public.audit_log (entity_id);
CREATE INDEX IF NOT EXISTS audit_log_action_idx       ON public.audit_log (action);
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx   ON public.audit_log (created_at DESC);

-- ── 2. RLS — INSERT-only para autenticados, SELECT apenas N0 ──
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode inserir (via trigger/action)
CREATE POLICY "audit_log_insert" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Apenas Super-Master pode ler o audit_log
CREATE POLICY "audit_log_select" ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.is_super_master());

-- Ninguém pode atualizar ou deletar — imutabilidade garantida pelo banco
-- (sem policy UPDATE/DELETE = bloqueado por padrão com RLS ativo)

-- ── 3. Função auxiliar: registrar evento ──────────────────────
CREATE OR REPLACE FUNCTION public.audit_record(
  p_ministry_id   uuid,
  p_entity_table  text,
  p_entity_id     uuid,
  p_action        text,
  p_before        jsonb DEFAULT NULL,
  p_after         jsonb DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.audit_log (
    ministry_id, user_id, entity_table, entity_id,
    action, payload_before, payload_after
  ) VALUES (
    p_ministry_id, auth.uid(), p_entity_table, p_entity_id,
    p_action, p_before, p_after
  );
EXCEPTION WHEN OTHERS THEN
  -- Nunca deixar falha de audit bloquear a operação principal
  RAISE WARNING 'audit_record falhou: %', SQLERRM;
END;
$$;

-- ── 4. Trigger em party_members (INSERT/UPDATE/DELETE) ────────
CREATE OR REPLACE FUNCTION public.trg_audit_party_members()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.audit_record(
      NEW.ministry_id, 'party_members', NEW.id,
      'INSERT', NULL, to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.audit_record(
      NEW.ministry_id, 'party_members', NEW.id,
      'UPDATE', to_jsonb(OLD), to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.audit_record(
      OLD.ministry_id, 'party_members', OLD.id,
      'DELETE', to_jsonb(OLD), NULL
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_party_members ON public.party_members;
CREATE TRIGGER audit_party_members
  AFTER INSERT OR UPDATE OR DELETE ON public.party_members
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_party_members();

-- ── 5. Trigger em documents ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_audit_documents()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.audit_record(
      NEW.ministry_id, 'documents', NEW.id,
      'EMIT_DOCUMENT', NULL,
      jsonb_build_object(
        'type_id',          NEW.type_id,
        'party_id',         NEW.party_id,
        'numero_protocolo', NEW.numero_protocolo,
        'emitido_por',      NEW.emitido_por,
        'data_emissao',     NEW.data_emissao
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND NEW.is_active = false AND OLD.is_active = true THEN
    PERFORM public.audit_record(
      NEW.ministry_id, 'documents', NEW.id,
      'CANCEL_DOCUMENT',
      jsonb_build_object('numero_protocolo', OLD.numero_protocolo),
      jsonb_build_object('is_active', false)
    );
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_documents ON public.documents;
CREATE TRIGGER audit_documents
  AFTER INSERT OR UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_documents();

-- ── 6. Trigger em admin_roles (alterações de acesso) ──────────
CREATE OR REPLACE FUNCTION public.trg_audit_admin_roles()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.audit_record(
      NEW.ministry_id, 'admin_roles', NEW.id,
      'INVITE_USER', NULL,
      jsonb_build_object('user_id', NEW.user_id, 'level', NEW.level)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_active = true AND NEW.is_active = false THEN
      PERFORM public.audit_record(
        NEW.ministry_id, 'admin_roles', NEW.id,
        'DEACTIVATE_USER',
        jsonb_build_object('user_id', OLD.user_id, 'level', OLD.level),
        jsonb_build_object('is_active', false)
      );
    ELSE
      PERFORM public.audit_record(
        NEW.ministry_id, 'admin_roles', NEW.id,
        'UPDATE',
        to_jsonb(OLD), to_jsonb(NEW)
      );
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_admin_roles ON public.admin_roles;
CREATE TRIGGER audit_admin_roles
  AFTER INSERT OR UPDATE ON public.admin_roles
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_admin_roles();
