DO $guard$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM campaign_os.campaign_tasks
    WHERE template_version IS NOT NULL
      OR template_checksum IS NOT NULL
      OR template_snapshot IS NOT NULL
      OR template_adoption_idempotency_key IS NOT NULL
  )
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'TASK TEMPLATE CATALOG REFERENCES EXIST';
  END IF;
END
$guard$;

DROP TRIGGER IF EXISTS campaign_task_template_adoption_immutable_guard
  ON campaign_os.campaign_tasks;

DROP FUNCTION IF EXISTS campaign_os.protect_campaign_task_template_adoption();

DROP INDEX IF EXISTS campaign_os.campaign_tasks_template_idempotency_key;

ALTER TABLE campaign_os.campaign_tasks
  DROP CONSTRAINT IF EXISTS campaign_tasks_template_catalog_fk,
  DROP CONSTRAINT IF EXISTS campaign_tasks_template_idempotency_check,
  DROP CONSTRAINT IF EXISTS campaign_tasks_template_snapshot_check,
  DROP CONSTRAINT IF EXISTS campaign_tasks_template_checksum_check,
  DROP CONSTRAINT IF EXISTS campaign_tasks_template_version_check,
  DROP CONSTRAINT IF EXISTS campaign_tasks_template_snapshot_all_or_none,
  DROP COLUMN IF EXISTS template_adoption_idempotency_key,
  DROP COLUMN IF EXISTS template_snapshot,
  DROP COLUMN IF EXISTS template_checksum,
  DROP COLUMN IF EXISTS template_version;

DROP TRIGGER IF EXISTS task_template_catalog_update_guard
  ON campaign_os.task_template_catalog_versions;

DROP INDEX IF EXISTS campaign_os.task_template_catalog_locales_idx;
DROP INDEX IF EXISTS campaign_os.task_template_catalog_adoption_idx;
DROP INDEX IF EXISTS campaign_os.task_template_catalog_list_idx;
DROP INDEX IF EXISTS campaign_os.task_template_catalog_single_active_idx;

DROP TABLE IF EXISTS campaign_os.task_template_catalog_versions;

DROP FUNCTION IF EXISTS campaign_os.protect_task_template_catalog_update();
DROP FUNCTION IF EXISTS campaign_os.valid_task_template_snapshot(jsonb, text, integer, text);
DROP FUNCTION IF EXISTS campaign_os.valid_task_template_locales(jsonb, jsonb, jsonb);
DROP FUNCTION IF EXISTS campaign_os.valid_task_template_supported_locales(jsonb);
