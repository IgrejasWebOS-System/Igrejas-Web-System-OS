-- ============================================================
-- Migration 009b — Audit Log: Índices + Função + Triggers
-- Execute APÓS 009_audit_log.sql (tabela e RLS básico já existem)
-- ============================================================

-- ── Índices para consultas de auditoria ───────────────────────
CREATE INDEX IF NOT EXISTS audit_log_ministry_id_idx  ON public.audit_log (ministry_id);
CREATE INDEX IF NOT EXISTS audit_log_user_id_idx      ON public.audit_log (user_id);
CREATE INDEX IF NOT EXISTS audit_log_entity_table_idx ON public.audit_log (entity_table);
CREATE INDEX IF NOT EXISTS audit_log_entity_id_idx    ON public.audit_log (entity_id);
CREATE INDEX IF NOT EXISTS audit_log_action_idx       ON public.audit_log (action);
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx   ON public.audit_log (created_at DESC);

-- ── Função auxiliar: registrar evento ──────────────────────
-- Usada pelos triggers abaixo. SECURITY DEFINER = roda como owner
-- mesmo quando chamada por outros roles. EXCEPTION silencia falhas
-- para nunca bloquear a operação principal.
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

-- ── Trigger em party_members ────────────────────────────────
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

-- ── Trigger em documents ─────────────────────────────────────
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

-- ── Trigger em admin_roles ────────────────────────────────────
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
        'UPDATE', to_jsonb(OLD), to_jsonb(NEW)
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
