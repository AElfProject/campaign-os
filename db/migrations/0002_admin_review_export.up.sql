CREATE TABLE campaign_os.campaign_review_decisions (
  id text PRIMARY KEY,
  campaign_id text NOT NULL,
  participant_id text NOT NULL,
  wallet_address text NOT NULL,
  version integer NOT NULL,
  decision text NOT NULL,
  snapshot_version text NOT NULL,
  snapshot_fingerprint text NOT NULL,
  snapshot_manifest jsonb NOT NULL,
  reason_code text NOT NULL,
  note text,
  operator_subject text NOT NULL,
  operator_role text NOT NULL,
  idempotency_key_hash text NOT NULL,
  payload_hash text NOT NULL,
  trace_id text NOT NULL,
  decided_at timestamptz NOT NULL,
  CONSTRAINT campaign_os_campaign_review_decisions_id_check CHECK (
    id = btrim(id) AND char_length(id) BETWEEN 1 AND 160
  ),
  CONSTRAINT campaign_os_campaign_review_decisions_campaign_id_check CHECK (
    campaign_id = btrim(campaign_id) AND char_length(campaign_id) BETWEEN 1 AND 160
  ),
  CONSTRAINT campaign_os_campaign_review_decisions_participant_id_check CHECK (
    participant_id = btrim(participant_id) AND char_length(participant_id) BETWEEN 1 AND 160
  ),
  CONSTRAINT campaign_os_campaign_review_decisions_wallet_check CHECK (
    wallet_address = btrim(wallet_address) AND char_length(wallet_address) BETWEEN 1 AND 256
  ),
  CONSTRAINT campaign_os_campaign_review_decisions_version_check CHECK (version > 0),
  CONSTRAINT campaign_os_campaign_review_decisions_decision_check CHECK (
    decision IN ('approved', 'rejected', 'needs_review')
  ),
  CONSTRAINT campaign_os_campaign_review_decisions_snapshot_version_check CHECK (
    snapshot_version = 'review-snapshot-v1'
  ),
  CONSTRAINT campaign_os_campaign_review_decisions_snapshot_fingerprint_check CHECK (
    snapshot_fingerprint ~ '^[a-f0-9]{64}$'
  ),
  CONSTRAINT campaign_os_campaign_review_decisions_snapshot_manifest_check CHECK (
    jsonb_typeof(snapshot_manifest) = 'object'
    AND octet_length(snapshot_manifest::text) BETWEEN 2 AND 1048576
  ),
  CONSTRAINT campaign_os_campaign_review_decisions_reason_code_check CHECK (
    reason_code ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$'
  ),
  CONSTRAINT campaign_os_campaign_review_decisions_note_check CHECK (
    note IS NULL OR (char_length(note) <= 1000 AND note !~ '[[:cntrl:]]')
  ),
  CONSTRAINT campaign_os_campaign_review_decisions_operator_subject_check CHECK (
    operator_subject = btrim(operator_subject)
    AND char_length(operator_subject) BETWEEN 1 AND 256
  ),
  CONSTRAINT campaign_os_campaign_review_decisions_operator_role_check CHECK (
    operator_role IN ('internal_operator', 'review_operator')
  ),
  CONSTRAINT campaign_os_campaign_review_decisions_idempotency_hash_check CHECK (
    idempotency_key_hash ~ '^[a-f0-9]{64}$'
  ),
  CONSTRAINT campaign_os_campaign_review_decisions_payload_hash_check CHECK (
    payload_hash ~ '^[a-f0-9]{64}$'
  ),
  CONSTRAINT campaign_os_campaign_review_decisions_trace_id_check CHECK (
    trace_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'
  ),
  CONSTRAINT campaign_os_campaign_review_decisions_campaign_fk
    FOREIGN KEY (campaign_id) REFERENCES campaign_os.campaigns (id) ON DELETE CASCADE,
  CONSTRAINT campaign_os_campaign_review_decisions_participant_fk
    FOREIGN KEY (participant_id) REFERENCES campaign_os.campaign_participants (id) ON DELETE CASCADE,
  CONSTRAINT campaign_os_campaign_review_decisions_version_key
    UNIQUE (campaign_id, participant_id, version),
  CONSTRAINT campaign_os_campaign_review_decisions_idempotency_key
    UNIQUE (campaign_id, participant_id, idempotency_key_hash)
);

CREATE INDEX campaign_os_campaign_review_decisions_current_idx
  ON campaign_os.campaign_review_decisions (campaign_id, participant_id, version DESC);
CREATE INDEX campaign_os_campaign_review_decisions_filter_idx
  ON campaign_os.campaign_review_decisions (campaign_id, decision, decided_at DESC, id);

CREATE TABLE campaign_os.campaign_export_artifacts (
  id text PRIMARY KEY,
  campaign_id text NOT NULL,
  source_version text NOT NULL,
  source_fingerprint text NOT NULL,
  source_manifest jsonb NOT NULL,
  format text NOT NULL,
  row_count integer NOT NULL,
  content_hash text NOT NULL,
  content text NOT NULL,
  content_bytes integer NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  creator_subject text NOT NULL,
  creator_role text NOT NULL,
  trace_id text NOT NULL,
  created_at timestamptz NOT NULL,
  CONSTRAINT campaign_os_campaign_export_artifacts_id_check CHECK (
    id = btrim(id) AND char_length(id) BETWEEN 1 AND 160
  ),
  CONSTRAINT campaign_os_campaign_export_artifacts_campaign_id_check CHECK (
    campaign_id = btrim(campaign_id) AND char_length(campaign_id) BETWEEN 1 AND 160
  ),
  CONSTRAINT campaign_os_campaign_export_artifacts_source_version_check CHECK (
    source_version = 'artifact-source-v1'
  ),
  CONSTRAINT campaign_os_campaign_export_artifacts_source_fingerprint_check CHECK (
    source_fingerprint ~ '^[a-f0-9]{64}$'
  ),
  CONSTRAINT campaign_os_campaign_export_artifacts_source_manifest_check CHECK (
    jsonb_typeof(source_manifest) = 'object'
    AND octet_length(source_manifest::text) BETWEEN 2 AND 2097152
  ),
  CONSTRAINT campaign_os_campaign_export_artifacts_format_check CHECK (
    format IN ('csv', 'json')
  ),
  CONSTRAINT campaign_os_campaign_export_artifacts_row_count_check CHECK (
    row_count BETWEEN 0 AND 5000
  ),
  CONSTRAINT campaign_os_campaign_export_artifacts_content_hash_check CHECK (
    content_hash ~ '^[a-f0-9]{64}$'
  ),
  CONSTRAINT campaign_os_campaign_export_artifacts_content_bytes_check CHECK (
    content_bytes BETWEEN 0 AND 10485760
    AND content_bytes = octet_length(content)
  ),
  CONSTRAINT campaign_os_campaign_export_artifacts_file_name_check CHECK (
    char_length(file_name) BETWEEN 1 AND 255
    AND file_name ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,254}$'
    AND file_name NOT IN ('.', '..')
  ),
  CONSTRAINT campaign_os_campaign_export_artifacts_format_mime_check CHECK (
    (format = 'csv' AND mime_type = 'text/csv;charset=utf-8' AND file_name ~ '\.csv$')
    OR
    (format = 'json' AND mime_type = 'application/json;charset=utf-8' AND file_name ~ '\.json$')
  ),
  CONSTRAINT campaign_os_campaign_export_artifacts_creator_subject_check CHECK (
    creator_subject = btrim(creator_subject)
    AND char_length(creator_subject) BETWEEN 1 AND 256
  ),
  CONSTRAINT campaign_os_campaign_export_artifacts_creator_role_check CHECK (
    creator_role IN ('internal_operator', 'review_operator')
  ),
  CONSTRAINT campaign_os_campaign_export_artifacts_trace_id_check CHECK (
    trace_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'
  ),
  CONSTRAINT campaign_os_campaign_export_artifacts_campaign_fk
    FOREIGN KEY (campaign_id) REFERENCES campaign_os.campaigns (id) ON DELETE CASCADE,
  CONSTRAINT campaign_os_campaign_export_artifacts_source_key
    UNIQUE (campaign_id, source_fingerprint, format)
);

CREATE INDEX campaign_os_campaign_export_artifacts_list_idx
  ON campaign_os.campaign_export_artifacts (campaign_id, created_at DESC, id);

CREATE FUNCTION campaign_os.reject_admin_review_export_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '55000',
    MESSAGE = 'Campaign OS admin review records are append-only.';
  RETURN NULL;
END;
$$;

CREATE TRIGGER campaign_review_decisions_append_only
BEFORE UPDATE OR DELETE ON campaign_os.campaign_review_decisions
FOR EACH ROW EXECUTE FUNCTION campaign_os.reject_admin_review_export_mutation();

CREATE TRIGGER campaign_export_artifacts_append_only
BEFORE UPDATE OR DELETE ON campaign_os.campaign_export_artifacts
FOR EACH ROW EXECUTE FUNCTION campaign_os.reject_admin_review_export_mutation();
