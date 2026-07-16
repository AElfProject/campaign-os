ALTER TABLE campaign_os.campaign_tasks
  ADD COLUMN revision integer NOT NULL DEFAULT 1,
  ADD CONSTRAINT campaign_os_campaign_tasks_revision_check CHECK (revision > 0),
  ADD CONSTRAINT campaign_os_campaign_tasks_campaign_id_id_revision_key
    UNIQUE (campaign_id, id, revision);

CREATE TABLE campaign_os.campaign_task_revisions (
  campaign_id text NOT NULL,
  task_id text NOT NULL,
  revision integer NOT NULL,
  template_code text NOT NULL,
  verification_type text NOT NULL,
  wallet_compatibility text NOT NULL,
  points integer NOT NULL,
  required boolean NOT NULL,
  evidence_rule jsonb NOT NULL,
  task_created_at timestamptz NOT NULL,
  task_updated_at timestamptz NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT campaign_os_campaign_task_revisions_pkey
    PRIMARY KEY (campaign_id, task_id, revision),
  CONSTRAINT campaign_os_campaign_task_revisions_revision_check CHECK (revision > 0),
  CONSTRAINT campaign_os_campaign_task_revisions_template_check CHECK (
    btrim(template_code) <> ''
  ),
  CONSTRAINT campaign_os_campaign_task_revisions_verification_type_check CHECK (
    verification_type IN ('WALLET', 'ON_CHAIN', 'DAPP_API', 'SOCIAL', 'MANUAL')
  ),
  CONSTRAINT campaign_os_campaign_task_revisions_wallet_compatibility_check CHECK (
    wallet_compatibility IN ('ANY', 'AA_ONLY', 'EOA_ONLY')
  ),
  CONSTRAINT campaign_os_campaign_task_revisions_points_check CHECK (points >= 0),
  CONSTRAINT campaign_os_campaign_task_revisions_evidence_rule_check CHECK (
    jsonb_typeof(evidence_rule) = 'object'
  ),
  CONSTRAINT campaign_os_campaign_task_revisions_time_check CHECK (
    task_updated_at >= task_created_at
  )
);

INSERT INTO campaign_os.campaign_task_revisions (
  campaign_id,
  task_id,
  revision,
  template_code,
  verification_type,
  wallet_compatibility,
  points,
  required,
  evidence_rule,
  task_created_at,
  task_updated_at
)
SELECT
  campaign_id,
  id,
  revision,
  template_code,
  verification_type,
  wallet_compatibility,
  points,
  required,
  evidence_rule,
  created_at,
  updated_at
FROM campaign_os.campaign_tasks;

CREATE FUNCTION campaign_os.reject_campaign_task_revision_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '55000',
    MESSAGE = 'Campaign Task revision snapshots are append-only.';
END;
$$;

CREATE TRIGGER campaign_task_revisions_append_only
BEFORE UPDATE OR DELETE ON campaign_os.campaign_task_revisions
FOR EACH ROW EXECUTE FUNCTION campaign_os.reject_campaign_task_revision_mutation();

CREATE TRIGGER campaign_task_revisions_truncate_append_only
BEFORE TRUNCATE ON campaign_os.campaign_task_revisions
FOR EACH STATEMENT EXECUTE FUNCTION campaign_os.reject_campaign_task_revision_mutation();

CREATE FUNCTION campaign_os.capture_campaign_task_revision()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.id IS DISTINCT FROM OLD.id OR NEW.campaign_id IS DISTINCT FROM OLD.campaign_id THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'Campaign Task identity cannot change after revision capture.';
    END IF;

    IF NEW.revision IS DISTINCT FROM OLD.revision
      AND NEW.revision <> OLD.revision + 1
    THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'Campaign Task revision must advance by exactly one.';
    END IF;
  END IF;

  INSERT INTO campaign_os.campaign_task_revisions (
    campaign_id,
    task_id,
    revision,
    template_code,
    verification_type,
    wallet_compatibility,
    points,
    required,
    evidence_rule,
    task_created_at,
    task_updated_at
  )
  VALUES (
    NEW.campaign_id,
    NEW.id,
    NEW.revision,
    NEW.template_code,
    NEW.verification_type,
    NEW.wallet_compatibility,
    NEW.points,
    NEW.required,
    NEW.evidence_rule,
    NEW.created_at,
    NEW.updated_at
  )
  ON CONFLICT (campaign_id, task_id, revision) DO NOTHING;

  IF NOT FOUND THEN
    PERFORM 1
    FROM campaign_os.campaign_task_revisions AS snapshot
    WHERE snapshot.campaign_id = NEW.campaign_id
      AND snapshot.task_id = NEW.id
      AND snapshot.revision = NEW.revision
      AND snapshot.template_code = NEW.template_code
      AND snapshot.verification_type = NEW.verification_type
      AND snapshot.wallet_compatibility = NEW.wallet_compatibility
      AND snapshot.points = NEW.points
      AND snapshot.required = NEW.required
      AND snapshot.evidence_rule = NEW.evidence_rule
      AND snapshot.task_created_at = NEW.created_at
      AND snapshot.task_updated_at = NEW.updated_at;

    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'Campaign Task provenance changes require a new revision.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER campaign_task_revision_capture
BEFORE INSERT OR UPDATE OF
  id,
  campaign_id,
  revision,
  template_code,
  verification_type,
  wallet_compatibility,
  points,
  required,
  evidence_rule,
  updated_at
ON campaign_os.campaign_tasks
FOR EACH ROW EXECUTE FUNCTION campaign_os.capture_campaign_task_revision();

CREATE FUNCTION campaign_os.valid_verification_attempt_diagnostic_codes(value jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
STRICT
PARALLEL SAFE
AS $$
DECLARE
  diagnostic jsonb;
  diagnostic_code text;
  seen_codes text[] := ARRAY[]::text[];
BEGIN
  IF jsonb_typeof(value) <> 'array' THEN
    RETURN false;
  END IF;
  IF jsonb_array_length(value) > 16 OR octet_length(value::text) > 2048 THEN
    RETURN false;
  END IF;

  FOR diagnostic IN SELECT element FROM jsonb_array_elements(value) AS entries(element)
  LOOP
    IF jsonb_typeof(diagnostic) <> 'string' THEN
      RETURN false;
    END IF;
    diagnostic_code := diagnostic #>> '{}';
    IF diagnostic_code !~ '^[A-Z][A-Z0-9_]{0,63}$'
      OR diagnostic_code = ANY(seen_codes)
    THEN
      RETURN false;
    END IF;
    seen_codes := array_append(seen_codes, diagnostic_code);
  END LOOP;

  RETURN true;
END;
$$;

CREATE TABLE campaign_os.verification_attempts (
  id text PRIMARY KEY,
  idempotency_key text NOT NULL,
  campaign_id text NOT NULL,
  task_id text NOT NULL,
  task_revision integer NOT NULL,
  wallet_address text NOT NULL,
  account_type text NOT NULL,
  wallet_source text NOT NULL,
  binding_id text NOT NULL,
  binding_revision integer NOT NULL,
  provider_ref text NOT NULL,
  verification_type text NOT NULL,
  task_revision_digest text NOT NULL,
  evidence_rule_digest text NOT NULL,
  request_digest text,
  status text NOT NULL,
  dispatch_state text NOT NULL,
  lease_token_hash text,
  lease_expires_at timestamptz,
  fence bigint NOT NULL,
  attempt_count integer NOT NULL,
  max_attempts integer NOT NULL,
  external_dispatch_limit integer NOT NULL DEFAULT 1,
  response_digest text,
  provider_code text,
  retry_posture text NOT NULL,
  diagnostic_codes jsonb NOT NULL,
  trace_id text NOT NULL,
  evidence_hash text,
  evidence_ref text,
  evidence_source text,
  finalization_digest text,
  transport_started_at timestamptz,
  transport_finished_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT campaign_os_verification_attempts_id_check CHECK (
    char_length(id) BETWEEN 1 AND 160
    AND id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'
    AND id !~ '[[:cntrl:]]'
  ),
  CONSTRAINT campaign_os_verification_attempts_idempotency_hash_check CHECK (
    idempotency_key ~ '^[a-f0-9]{64}$'
  ),
  CONSTRAINT campaign_os_verification_attempts_campaign_id_check CHECK (
    char_length(campaign_id) BETWEEN 1 AND 160
    AND campaign_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'
    AND campaign_id !~ '[[:cntrl:]]'
  ),
  CONSTRAINT campaign_os_verification_attempts_task_id_check CHECK (
    char_length(task_id) BETWEEN 1 AND 160
    AND task_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'
    AND task_id !~ '[[:cntrl:]]'
  ),
  CONSTRAINT campaign_os_verification_attempts_task_revision_check CHECK (task_revision > 0),
  CONSTRAINT campaign_os_verification_attempts_wallet_check CHECK (
    char_length(wallet_address) BETWEEN 1 AND 192
    AND wallet_address ~ '^[A-Za-z0-9][A-Za-z0-9_-]*$'
    AND wallet_address !~ '[[:cntrl:]]'
  ),
  CONSTRAINT campaign_os_verification_attempts_account_type_check CHECK (
    account_type IN ('AA', 'EOA', 'UNKNOWN')
  ),
  CONSTRAINT campaign_os_verification_attempts_wallet_source_check CHECK (
    wallet_source IN (
      'PORTKEY_AA',
      'PORTKEY_EOA_APP',
      'PORTKEY_EOA_EXTENSION',
      'NIGHTELF',
      'AGENT_SKILL',
      'OTHER'
    )
  ),
  CONSTRAINT campaign_os_verification_attempts_binding_id_check CHECK (
    char_length(binding_id) BETWEEN 1 AND 160
    AND binding_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'
    AND binding_id !~ '[[:cntrl:]]'
  ),
  CONSTRAINT campaign_os_verification_attempts_binding_revision_check CHECK (binding_revision > 0),
  CONSTRAINT campaign_os_verification_attempts_provider_ref_check CHECK (
    char_length(provider_ref) BETWEEN 1 AND 160
    AND provider_ref ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'
    AND provider_ref !~ '[[:cntrl:]]'
  ),
  CONSTRAINT campaign_os_verification_attempts_verification_type_check CHECK (
    verification_type IN ('ON_CHAIN', 'DAPP_API')
  ),
  CONSTRAINT campaign_os_verification_attempts_digest_check CHECK (
    task_revision_digest ~ '^[a-f0-9]{64}$'
    AND evidence_rule_digest ~ '^[a-f0-9]{64}$'
    AND (request_digest IS NULL OR request_digest ~ '^[a-f0-9]{64}$')
    AND (response_digest IS NULL OR response_digest ~ '^[a-f0-9]{64}$')
    AND (evidence_hash IS NULL OR evidence_hash ~ '^[a-f0-9]{64}$')
    AND (finalization_digest IS NULL OR finalization_digest ~ '^[a-f0-9]{64}$')
  ),
  CONSTRAINT campaign_os_verification_attempts_status_check CHECK (
    status IN ('requested', 'running', 'pending', 'completed', 'failed', 'manual_review')
  ),
  CONSTRAINT campaign_os_verification_attempts_dispatch_state_check CHECK (
    dispatch_state IN ('not_started', 'started', 'result_observed')
  ),
  CONSTRAINT campaign_os_verification_attempts_lease_hash_check CHECK (
    lease_token_hash IS NULL OR lease_token_hash ~ '^[a-f0-9]{64}$'
  ),
  CONSTRAINT campaign_os_verification_attempts_ownership_check CHECK (
    fence > 0
    AND attempt_count BETWEEN 1 AND 3
    AND max_attempts BETWEEN 1 AND 3
    AND attempt_count <= max_attempts
    AND external_dispatch_limit = 1
    AND (
      (status = 'running' AND lease_token_hash IS NOT NULL AND lease_expires_at IS NOT NULL)
      OR
      (status <> 'running' AND lease_token_hash IS NULL AND lease_expires_at IS NULL)
    )
  ),
  CONSTRAINT campaign_os_verification_attempts_dispatch_timeline_check CHECK (
    (
      dispatch_state = 'not_started'
      AND request_digest IS NULL
      AND transport_started_at IS NULL
      AND transport_finished_at IS NULL
      AND response_digest IS NULL
    )
    OR
    (
      dispatch_state = 'started'
      AND request_digest IS NOT NULL
      AND transport_started_at IS NOT NULL
      AND transport_finished_at IS NULL
      AND response_digest IS NULL
    )
    OR
    (
      dispatch_state = 'result_observed'
      AND request_digest IS NOT NULL
      AND transport_started_at IS NOT NULL
      AND transport_finished_at IS NOT NULL
      AND response_digest IS NOT NULL
    )
  ),
  CONSTRAINT campaign_os_verification_attempts_result_check CHECK (
    retry_posture IN ('none', 'retry_finalize', 'manual_review', 'blocked')
    AND (provider_code IS NULL OR provider_code ~ '^[A-Z][A-Z0-9_]{0,63}$')
    AND campaign_os.valid_verification_attempt_diagnostic_codes(diagnostic_codes)
    AND trace_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'
    AND trace_id !~ '[[:cntrl:]]'
    AND (evidence_ref IS NULL OR (
      char_length(evidence_ref) BETWEEN 1 AND 256
      AND evidence_ref ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'
      AND evidence_ref !~ '[[:cntrl:]]'
    ))
    AND (evidence_source IS NULL OR evidence_source IN ('AEFINDER', 'AELFSCAN', 'DAPP_API'))
  ),
  CONSTRAINT campaign_os_verification_attempts_completed_check CHECK (
    (
      status = 'completed'
      AND dispatch_state = 'result_observed'
      AND completed_at IS NOT NULL
      AND evidence_hash IS NOT NULL
      AND evidence_ref IS NOT NULL
      AND evidence_source IS NOT NULL
      AND finalization_digest IS NOT NULL
    )
    OR
    (
      status <> 'completed'
      AND evidence_hash IS NULL
      AND evidence_ref IS NULL
      AND evidence_source IS NULL
    )
  ),
  CONSTRAINT campaign_os_verification_attempts_state_dispatch_result_check CHECK (
    (
      status = 'running'
      AND dispatch_state IN ('not_started', 'started')
      AND lease_token_hash IS NOT NULL
      AND lease_expires_at IS NOT NULL
      AND retry_posture = 'none'
      AND response_digest IS NULL
      AND provider_code IS NULL
      AND finalization_digest IS NULL
      AND completed_at IS NULL
    )
    OR
    (
      status = 'requested'
      AND dispatch_state = 'not_started'
      AND lease_token_hash IS NULL
      AND lease_expires_at IS NULL
      AND retry_posture = 'none'
      AND response_digest IS NULL
      AND provider_code IS NULL
      AND finalization_digest IS NULL
      AND completed_at IS NULL
    )
    OR
    (
      status = 'manual_review'
      AND dispatch_state = 'not_started'
      AND lease_token_hash IS NULL
      AND lease_expires_at IS NULL
      AND retry_posture = 'blocked'
      AND response_digest IS NULL
      AND provider_code IS NULL
      AND finalization_digest IS NULL
      AND completed_at IS NULL
    )
    OR
    (
      status = 'manual_review'
      AND dispatch_state = 'started'
      AND lease_token_hash IS NULL
      AND lease_expires_at IS NULL
      AND retry_posture = 'manual_review'
      AND response_digest IS NULL
      AND provider_code IS NULL
      AND finalization_digest IS NULL
      AND completed_at IS NULL
    )
    OR
    (
      status IN ('pending', 'completed', 'failed', 'manual_review')
      AND dispatch_state = 'result_observed'
      AND lease_token_hash IS NULL
      AND lease_expires_at IS NULL
      AND response_digest IS NOT NULL
      AND provider_code IS NOT NULL
      AND finalization_digest IS NOT NULL
      AND completed_at IS NOT NULL
    )
  ),
  CONSTRAINT campaign_os_verification_attempts_time_check CHECK (
    updated_at >= created_at
    AND (lease_expires_at IS NULL OR lease_expires_at > updated_at)
    AND (transport_started_at IS NULL OR transport_started_at >= created_at)
    AND (transport_finished_at IS NULL OR transport_finished_at >= transport_started_at)
    AND (completed_at IS NULL OR completed_at >= created_at)
  ),
  CONSTRAINT campaign_os_verification_attempts_task_fk
    FOREIGN KEY (campaign_id, task_id, task_revision)
    REFERENCES campaign_os.campaign_task_revisions (campaign_id, task_id, revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT campaign_os_verification_attempts_idempotency_key
    UNIQUE (idempotency_key),
  CONSTRAINT campaign_os_verification_attempts_campaign_task_wallet_id_key
    UNIQUE (campaign_id, task_id, wallet_address, id)
);

CREATE INDEX campaign_os_verification_attempts_participant_journey_idx
  ON campaign_os.verification_attempts (
    campaign_id,
    wallet_address,
    task_id,
    task_revision DESC,
    created_at DESC,
    id
  );
CREATE INDEX campaign_os_verification_attempts_recovery_idx
  ON campaign_os.verification_attempts (status, dispatch_state, lease_expires_at, id)
  WHERE status = 'running' OR dispatch_state = 'started';
CREATE INDEX campaign_os_verification_attempts_provider_degradation_idx
  ON campaign_os.verification_attempts (provider_ref, retry_posture, updated_at DESC, id);

ALTER TABLE campaign_os.campaign_task_completions
  ADD COLUMN verification_attempt_id text,
  ADD CONSTRAINT campaign_os_campaign_task_completions_verification_attempt_fk
    FOREIGN KEY (campaign_id, task_id, wallet_address, verification_attempt_id)
    REFERENCES campaign_os.verification_attempts (campaign_id, task_id, wallet_address, id);

CREATE INDEX campaign_os_campaign_task_completions_verification_attempt_idx
  ON campaign_os.campaign_task_completions (verification_attempt_id)
  WHERE verification_attempt_id IS NOT NULL;

ALTER TABLE campaign_os.campaign_task_evidence
  ADD COLUMN verification_attempt_id text,
  DROP CONSTRAINT IF EXISTS campaign_task_evidence_live_provider_executed_check,
  ADD CONSTRAINT campaign_os_campaign_task_evidence_verification_attempt_fk
    FOREIGN KEY (campaign_id, task_id, wallet_address, verification_attempt_id)
    REFERENCES campaign_os.verification_attempts (campaign_id, task_id, wallet_address, id),
  ADD CONSTRAINT campaign_os_campaign_task_evidence_live_provider_check CHECK (
    live_provider_executed = false
    OR (
      status = 'completed'
      AND completion_id IS NOT NULL
      AND verification_attempt_id IS NOT NULL
      AND evidence_source IN ('AEFINDER', 'AELFSCAN', 'DAPP_API')
      AND points_awarded > 0
    )
  );

CREATE INDEX campaign_os_campaign_task_evidence_verification_attempt_idx
  ON campaign_os.campaign_task_evidence (verification_attempt_id)
  WHERE verification_attempt_id IS NOT NULL;

CREATE FUNCTION campaign_os.validate_live_provider_task_evidence()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  current_evidence campaign_os.campaign_task_evidence%ROWTYPE;
BEGIN
  SELECT evidence.*
  INTO current_evidence
  FROM campaign_os.campaign_task_evidence AS evidence
  WHERE evidence.id = NEW.id
    AND evidence.campaign_id = NEW.campaign_id
    AND evidence.task_id = NEW.task_id
    AND evidence.wallet_address = NEW.wallet_address;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF TG_OP = 'UPDATE'
    AND OLD.live_provider_executed
    AND NOT current_evidence.live_provider_executed
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Live provider Evidence provenance cannot be removed.';
  END IF;

  IF current_evidence.live_provider_executed THEN
    PERFORM 1
    FROM campaign_os.verification_attempts AS attempt
    JOIN campaign_os.campaign_task_completions AS completion
      ON completion.id = current_evidence.completion_id
      AND completion.campaign_id = current_evidence.campaign_id
      AND completion.task_id = current_evidence.task_id
      AND completion.wallet_address = current_evidence.wallet_address
      AND completion.verification_attempt_id = attempt.id
    WHERE attempt.id = current_evidence.verification_attempt_id
      AND attempt.campaign_id = current_evidence.campaign_id
      AND attempt.task_id = current_evidence.task_id
      AND attempt.wallet_address = current_evidence.wallet_address
      AND attempt.account_type = current_evidence.account_type
      AND attempt.wallet_source = current_evidence.wallet_source
      AND attempt.status = 'completed'
      AND attempt.dispatch_state = 'result_observed'
      AND attempt.completed_at = current_evidence.captured_at
      AND attempt.evidence_hash = current_evidence.evidence_hash
      AND attempt.evidence_ref = current_evidence.evidence_ref
      AND attempt.evidence_source = current_evidence.evidence_source
      AND completion.account_type = current_evidence.account_type
      AND completion.wallet_source = current_evidence.wallet_source
      AND completion.status = 'completed'
      AND completion.evidence_id = current_evidence.id
      AND completion.evidence_hash = current_evidence.evidence_hash
      AND completion.evidence_source = current_evidence.evidence_source
      AND completion.points_awarded = current_evidence.points_awarded
      AND completion.completed_at = attempt.completed_at;

    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'Live provider evidence requires a matching completed verification attempt.';
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER campaign_task_evidence_live_provider_validation
AFTER INSERT OR UPDATE ON campaign_os.campaign_task_evidence
DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION campaign_os.validate_live_provider_task_evidence();

CREATE FUNCTION campaign_os.validate_live_provider_task_completion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  current_completion campaign_os.campaign_task_completions%ROWTYPE;
BEGIN
  SELECT completion.*
  INTO current_completion
  FROM campaign_os.campaign_task_completions AS completion
  WHERE completion.id = NEW.id
    AND completion.campaign_id = NEW.campaign_id
    AND completion.task_id = NEW.task_id
    AND completion.wallet_address = NEW.wallet_address;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM campaign_os.campaign_task_evidence AS evidence
    WHERE evidence.live_provider_executed
      AND evidence.completion_id = current_completion.id
      AND evidence.campaign_id = current_completion.campaign_id
      AND evidence.task_id = current_completion.task_id
      AND evidence.wallet_address = current_completion.wallet_address
  ) THEN
    PERFORM 1
    FROM campaign_os.campaign_task_evidence AS evidence
    JOIN campaign_os.verification_attempts AS attempt
      ON attempt.id = evidence.verification_attempt_id
      AND attempt.campaign_id = evidence.campaign_id
      AND attempt.task_id = evidence.task_id
      AND attempt.wallet_address = evidence.wallet_address
    WHERE evidence.live_provider_executed
      AND evidence.completion_id = current_completion.id
      AND evidence.campaign_id = current_completion.campaign_id
      AND evidence.task_id = current_completion.task_id
      AND evidence.wallet_address = current_completion.wallet_address
      AND attempt.status = 'completed'
      AND attempt.dispatch_state = 'result_observed'
      AND attempt.completed_at = evidence.captured_at
      AND current_completion.evidence_id = evidence.id
      AND current_completion.account_type = evidence.account_type
      AND current_completion.wallet_source = evidence.wallet_source
      AND current_completion.status = 'completed'
      AND current_completion.evidence_hash = evidence.evidence_hash
      AND current_completion.evidence_source = evidence.evidence_source
      AND current_completion.points_awarded = evidence.points_awarded
      AND current_completion.completed_at = attempt.completed_at
      AND current_completion.verification_attempt_id = attempt.id;

    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'Live provider completion must remain consistent with its Evidence and attempt.';
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER campaign_task_completion_live_provider_validation
AFTER INSERT OR UPDATE ON campaign_os.campaign_task_completions
DEFERRABLE INITIALLY IMMEDIATE
FOR EACH ROW EXECUTE FUNCTION campaign_os.validate_live_provider_task_completion();
