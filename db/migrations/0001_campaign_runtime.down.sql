-- DESTRUCTIVE OPERATOR RECOVERY ONLY: back up data and stop all Campaign OS writers first.
DROP TABLE IF EXISTS campaign_os.campaign_referral_bindings;
DROP TABLE IF EXISTS campaign_os.campaign_task_evidence;
DROP TABLE IF EXISTS campaign_os.campaign_task_completions;
DROP TABLE IF EXISTS campaign_os.campaign_participants;
DROP TABLE IF EXISTS campaign_os.campaign_tasks;
DROP TABLE IF EXISTS campaign_os.campaigns;
DROP TABLE IF EXISTS campaign_os.schema_migrations;
DROP SCHEMA IF EXISTS campaign_os;
