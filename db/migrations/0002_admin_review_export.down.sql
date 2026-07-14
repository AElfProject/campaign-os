-- DESTRUCTIVE OPERATOR RECOVERY ONLY: back up decision and artifact audit data first.
DROP TRIGGER IF EXISTS campaign_export_artifacts_append_only
  ON campaign_os.campaign_export_artifacts;
DROP TRIGGER IF EXISTS campaign_review_decisions_append_only
  ON campaign_os.campaign_review_decisions;
DROP TABLE IF EXISTS campaign_os.campaign_export_artifacts;
DROP TABLE IF EXISTS campaign_os.campaign_review_decisions;
DROP FUNCTION IF EXISTS campaign_os.reject_admin_review_export_mutation();
