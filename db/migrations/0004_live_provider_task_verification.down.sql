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
      FROM campaign_os.campaign_task_revisions AS snapshot
      LEFT JOIN campaign_os.campaign_tasks AS current_task
        ON current_task.campaign_id = snapshot.campaign_id
        AND current_task.id = snapshot.task_id
      WHERE current_task.id IS NULL
      LIMIT 1
    )
    OR EXISTS (
      SELECT 1
      FROM campaign_os.campaign_tasks AS current_task
      LEFT JOIN campaign_os.campaign_task_revisions AS snapshot
        ON snapshot.campaign_id = current_task.campaign_id
        AND snapshot.task_id = current_task.id
        AND snapshot.revision = current_task.revision
      WHERE snapshot.task_id IS NULL
        OR snapshot.template_code IS DISTINCT FROM current_task.template_code
        OR snapshot.verification_type IS DISTINCT FROM current_task.verification_type
        OR snapshot.wallet_compatibility IS DISTINCT FROM current_task.wallet_compatibility
        OR snapshot.points IS DISTINCT FROM current_task.points
        OR snapshot.required IS DISTINCT FROM current_task.required
        OR snapshot.evidence_rule IS DISTINCT FROM current_task.evidence_rule
        OR snapshot.task_created_at IS DISTINCT FROM current_task.created_at
        OR snapshot.task_updated_at IS DISTINCT FROM current_task.updated_at
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

DROP TRIGGER IF EXISTS verification_attempt_finalization_results_append_only
  ON campaign_os.verification_attempt_finalization_results;
DROP TRIGGER IF EXISTS verification_attempt_finalization_results_truncate_append_only
  ON campaign_os.verification_attempt_finalization_results;
DROP FUNCTION IF EXISTS campaign_os.reject_verification_attempt_finalization_result_mutation();

DROP TRIGGER IF EXISTS verification_attempt_finalization_result_validation
  ON campaign_os.verification_attempt_finalization_results;
DROP FUNCTION IF EXISTS campaign_os.validate_verification_attempt_finalization_result();
DROP TABLE campaign_os.verification_attempt_finalization_results;

DROP TRIGGER IF EXISTS verification_attempt_terminal_immutability
  ON campaign_os.verification_attempts;
DROP FUNCTION IF EXISTS campaign_os.protect_terminal_verification_attempt();
DROP TABLE campaign_os.verification_attempts;
DROP FUNCTION IF EXISTS campaign_os.valid_verification_attempt_diagnostic_codes(jsonb);
DROP TABLE campaign_os.campaign_task_revisions;

ALTER TABLE campaign_os.campaign_tasks
  DROP CONSTRAINT IF EXISTS campaign_os_campaign_tasks_campaign_id_id_revision_key,
  DROP CONSTRAINT IF EXISTS campaign_os_campaign_tasks_revision_check,
  DROP COLUMN IF EXISTS revision;
