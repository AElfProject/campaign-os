-- DESTRUCTIVE OPERATOR MAINTENANCE ONLY: ordinary application rollback must never execute this file.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM campaign_os.verification_attempts LIMIT 1)
    OR EXISTS (
      SELECT 1
      FROM campaign_os.campaign_task_completions
      WHERE verification_attempt_id IS NOT NULL
      LIMIT 1
    )
    OR EXISTS (
      SELECT 1
      FROM campaign_os.campaign_task_evidence
      WHERE verification_attempt_id IS NOT NULL OR live_provider_executed
      LIMIT 1
    )
    OR EXISTS (
      SELECT 1
      FROM campaign_os.campaign_tasks
      WHERE revision > 1
      LIMIT 1
    )
    OR EXISTS (
      SELECT 1
      FROM campaign_os.campaign_task_revisions
      WHERE revision > 1
      LIMIT 1
    )
    OR EXISTS (
      SELECT 1
      FROM campaign_os.campaign_task_revisions
      GROUP BY campaign_id, task_id
      HAVING COUNT(*) > 1
      LIMIT 1
    )
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'LIVE PROVIDER VERIFICATION DATA EXISTS OR TASK REVISION LINEAGE EXISTS; migration 0004 down is refused.';
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS campaign_task_completion_live_provider_validation
  ON campaign_os.campaign_task_completions;
DROP FUNCTION IF EXISTS campaign_os.validate_live_provider_task_completion();

DROP TRIGGER IF EXISTS campaign_task_evidence_live_provider_validation
  ON campaign_os.campaign_task_evidence;
DROP FUNCTION IF EXISTS campaign_os.validate_live_provider_task_evidence();

DROP TRIGGER IF EXISTS campaign_task_revision_capture
  ON campaign_os.campaign_tasks;
DROP FUNCTION IF EXISTS campaign_os.capture_campaign_task_revision();

DROP TRIGGER IF EXISTS campaign_task_revisions_append_only
  ON campaign_os.campaign_task_revisions;
DROP TRIGGER IF EXISTS campaign_task_revisions_truncate_append_only
  ON campaign_os.campaign_task_revisions;
DROP FUNCTION IF EXISTS campaign_os.reject_campaign_task_revision_mutation();

DROP INDEX IF EXISTS campaign_os.campaign_os_campaign_task_evidence_verification_attempt_idx;
ALTER TABLE campaign_os.campaign_task_evidence
  DROP CONSTRAINT IF EXISTS campaign_os_campaign_task_evidence_live_provider_check,
  DROP CONSTRAINT IF EXISTS campaign_os_campaign_task_evidence_verification_attempt_fk,
  DROP COLUMN IF EXISTS verification_attempt_id,
  ADD CONSTRAINT campaign_task_evidence_live_provider_executed_check
    CHECK (live_provider_executed = false);

DROP INDEX IF EXISTS campaign_os.campaign_os_campaign_task_completions_verification_attempt_idx;
ALTER TABLE campaign_os.campaign_task_completions
  DROP CONSTRAINT IF EXISTS campaign_os_campaign_task_completions_verification_attempt_fk,
  DROP COLUMN IF EXISTS verification_attempt_id;

DROP TABLE campaign_os.verification_attempts;
DROP TABLE campaign_os.campaign_task_revisions;

ALTER TABLE campaign_os.campaign_tasks
  DROP CONSTRAINT IF EXISTS campaign_os_campaign_tasks_campaign_id_id_revision_key,
  DROP CONSTRAINT IF EXISTS campaign_os_campaign_tasks_revision_check,
  DROP COLUMN IF EXISTS revision;
