CREATE FUNCTION campaign_os.valid_wallet_auth_id_array(value jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
STRICT
PARALLEL SAFE
AS $$
DECLARE
  item jsonb;
  item_value text;
  seen_values text[] := ARRAY[]::text[];
BEGIN
  IF jsonb_typeof(value) <> 'array'
    OR jsonb_array_length(value) > 64
    OR octet_length(value::text) > 8192
  THEN
    RETURN false;
  END IF;

  FOR item IN SELECT element FROM jsonb_array_elements(value) AS entries(element)
  LOOP
    IF jsonb_typeof(item) <> 'string' THEN
      RETURN false;
    END IF;
    item_value := item #>> '{}';
    IF length(item_value) NOT BETWEEN 1 AND 128
      OR item_value !~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'
      OR item_value = ANY(seen_values)
    THEN
      RETURN false;
    END IF;
    seen_values := array_append(seen_values, item_value);
  END LOOP;

  RETURN true;
END;
$$;

CREATE TABLE campaign_os.wallet_auth_challenges (
  id text NOT NULL,
  version text NOT NULL,
  wallet_address text NOT NULL,
  subject_key text NOT NULL,
  adapter_id text NOT NULL,
  chain_id text NOT NULL,
  network text NOT NULL,
  ca_hash text,
  nonce_digest text NOT NULL,
  message_digest text NOT NULL,
  client_fingerprint_digest text,
  status text NOT NULL,
  state_version integer NOT NULL DEFAULT 1,
  verification_attempts integer NOT NULL DEFAULT 0,
  rate_window_started_at timestamptz NOT NULL,
  rate_attempt_count integer NOT NULL DEFAULT 0,
  issued_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  terminal_at timestamptz,
  terminal_code text,
  trace_id text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT campaign_os_wallet_auth_challenges_pkey PRIMARY KEY (id),
  CONSTRAINT campaign_os_wallet_auth_challenges_id_check CHECK (
    length(id) BETWEEN 1 AND 160
    AND id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'
  ),
  CONSTRAINT campaign_os_wallet_auth_challenges_version_check CHECK (
    version = 'campaign-os-wallet-auth/v1'
  ),
  CONSTRAINT campaign_os_wallet_auth_challenges_wallet_address_check CHECK (
    length(wallet_address) BETWEEN 1 AND 256
    AND wallet_address ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'
  ),
  CONSTRAINT campaign_os_wallet_auth_challenges_subject_key_check CHECK (
    octet_length(subject_key) = 64 AND subject_key ~ '^[a-f0-9]{64}$'
  ),
  CONSTRAINT campaign_os_wallet_auth_challenges_adapter_id_check CHECK (
    length(adapter_id) BETWEEN 1 AND 64
    AND adapter_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'
  ),
  CONSTRAINT campaign_os_wallet_auth_challenges_chain_id_check CHECK (
    chain_id IN ('AELF', 'tDVV', 'tDVW')
  ),
  CONSTRAINT campaign_os_wallet_auth_challenges_network_check CHECK (
    network IN ('mainnet', 'testnet')
  ),
  CONSTRAINT campaign_os_wallet_auth_challenges_ca_hash_check CHECK (
    ca_hash IS NULL OR (
      length(ca_hash) BETWEEN 1 AND 256
      AND ca_hash ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'
    )
  ),
  CONSTRAINT campaign_os_wallet_auth_challenges_nonce_digest_key UNIQUE (nonce_digest),
  CONSTRAINT campaign_os_wallet_auth_challenges_nonce_digest_check CHECK (
    octet_length(nonce_digest) = 64 AND nonce_digest ~ '^[a-f0-9]{64}$'
  ),
  CONSTRAINT campaign_os_wallet_auth_challenges_message_digest_key UNIQUE (message_digest),
  CONSTRAINT campaign_os_wallet_auth_challenges_message_digest_check CHECK (
    octet_length(message_digest) = 64 AND message_digest ~ '^[a-f0-9]{64}$'
  ),
  CONSTRAINT campaign_os_wallet_auth_challenges_client_fingerprint_digest_check CHECK (
    client_fingerprint_digest IS NULL OR (
      octet_length(client_fingerprint_digest) = 64
      AND client_fingerprint_digest ~ '^[a-f0-9]{64}$'
    )
  ),
  CONSTRAINT campaign_os_wallet_auth_challenges_status_check CHECK (
    status IN ('issued', 'consumed', 'rejected', 'expired')
  ),
  CONSTRAINT campaign_os_wallet_auth_challenges_state_version_check CHECK (
    state_version >= 1
  ),
  CONSTRAINT campaign_os_wallet_auth_challenges_attempts_check CHECK (
    verification_attempts BETWEEN 0 AND 100
    AND rate_attempt_count BETWEEN 0 AND 1000
  ),
  CONSTRAINT campaign_os_wallet_auth_challenges_time_check CHECK (
    created_at <= issued_at
    AND issued_at < expires_at
    AND updated_at >= created_at
  ),
  CONSTRAINT campaign_os_wallet_auth_challenges_terminal_check CHECK (
    (
      status = 'issued'
      AND consumed_at IS NULL
      AND terminal_at IS NULL
      AND terminal_code IS NULL
    )
    OR (
      status = 'consumed'
      AND consumed_at IS NOT NULL
      AND terminal_at = consumed_at
      AND consumed_at >= issued_at
      AND length(terminal_code) BETWEEN 1 AND 64
      AND terminal_code ~ '^[A-Z][A-Z0-9_]*$'
    )
    OR (
      status IN ('rejected', 'expired')
      AND consumed_at IS NULL
      AND terminal_at IS NOT NULL
      AND terminal_at >= issued_at
      AND length(terminal_code) BETWEEN 1 AND 64
      AND terminal_code ~ '^[A-Z][A-Z0-9_]*$'
    )
  )
);

CREATE INDEX campaign_os_wallet_auth_challenges_state_expiry_idx
  ON campaign_os.wallet_auth_challenges (status, expires_at, id);
CREATE INDEX campaign_os_wallet_auth_challenges_subject_state_idx
  ON campaign_os.wallet_auth_challenges (subject_key, status, expires_at, id);
CREATE INDEX campaign_os_wallet_auth_challenges_fingerprint_rate_idx
  ON campaign_os.wallet_auth_challenges (
    client_fingerprint_digest, rate_window_started_at, status, id
  ) WHERE client_fingerprint_digest IS NOT NULL;

CREATE FUNCTION campaign_os.validate_wallet_auth_challenge_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status <> 'issued'
    OR NEW.state_version <> 1
    OR NEW.verification_attempts <> 0
    OR NEW.rate_attempt_count <> 0
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Wallet authentication challenges must begin in the issued state.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER wallet_auth_challenge_insert_guard
BEFORE INSERT ON campaign_os.wallet_auth_challenges
FOR EACH ROW EXECUTE FUNCTION campaign_os.validate_wallet_auth_challenge_insert();

CREATE FUNCTION campaign_os.protect_wallet_auth_challenge_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status <> 'issued' THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Wallet authentication challenge terminal state is immutable.';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.version IS DISTINCT FROM OLD.version
    OR NEW.wallet_address IS DISTINCT FROM OLD.wallet_address
    OR NEW.subject_key IS DISTINCT FROM OLD.subject_key
    OR NEW.adapter_id IS DISTINCT FROM OLD.adapter_id
    OR NEW.chain_id IS DISTINCT FROM OLD.chain_id
    OR NEW.network IS DISTINCT FROM OLD.network
    OR NEW.ca_hash IS DISTINCT FROM OLD.ca_hash
    OR NEW.nonce_digest IS DISTINCT FROM OLD.nonce_digest
    OR NEW.message_digest IS DISTINCT FROM OLD.message_digest
    OR NEW.client_fingerprint_digest IS DISTINCT FROM OLD.client_fingerprint_digest
    OR NEW.issued_at IS DISTINCT FROM OLD.issued_at
    OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Wallet authentication challenge canonical facts are immutable.';
  END IF;

  IF NEW.status NOT IN ('issued', 'consumed', 'rejected', 'expired')
    OR NEW.state_version <> OLD.state_version + 1
    OR NEW.verification_attempts < OLD.verification_attempts
    OR NEW.verification_attempts > OLD.verification_attempts + 1
    OR NEW.updated_at < OLD.updated_at
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Wallet authentication challenge transition is invalid.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER wallet_auth_challenge_transition_guard
BEFORE UPDATE ON campaign_os.wallet_auth_challenges
FOR EACH ROW EXECUTE FUNCTION campaign_os.protect_wallet_auth_challenge_transition();

CREATE TABLE campaign_os.wallet_sessions (
  id text NOT NULL,
  credential_digest text NOT NULL,
  csrf_token_digest text NOT NULL,
  challenge_id text NOT NULL,
  subject_key text NOT NULL,
  wallet_address text NOT NULL,
  account_type text NOT NULL,
  wallet_source text NOT NULL,
  chain_id text NOT NULL,
  network text NOT NULL,
  adapter_id text NOT NULL,
  proof_method text NOT NULL,
  signer_address text NOT NULL,
  ca_hash text,
  proof_digest text NOT NULL,
  verified_at timestamptz NOT NULL,
  credential_boundary text NOT NULL,
  role_ids jsonb NOT NULL,
  capabilities jsonb NOT NULL,
  status text NOT NULL,
  version integer NOT NULL,
  membership_revision text NOT NULL,
  issued_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL,
  idle_expires_at timestamptz NOT NULL,
  absolute_expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  revocation_code text,
  last_trace_id text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT campaign_os_wallet_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT campaign_os_wallet_sessions_id_check CHECK (
    length(id) BETWEEN 1 AND 160
    AND id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'
  ),
  CONSTRAINT campaign_os_wallet_sessions_credential_digest_key UNIQUE (credential_digest),
  CONSTRAINT campaign_os_wallet_sessions_credential_digest_check CHECK (
    octet_length(credential_digest) = 64 AND credential_digest ~ '^[a-f0-9]{64}$'
  ),
  CONSTRAINT campaign_os_wallet_sessions_csrf_token_digest_key UNIQUE (csrf_token_digest),
  CONSTRAINT campaign_os_wallet_sessions_csrf_token_digest_check CHECK (
    octet_length(csrf_token_digest) = 64 AND csrf_token_digest ~ '^[a-f0-9]{64}$'
  ),
  CONSTRAINT campaign_os_wallet_sessions_challenge_fk
    FOREIGN KEY (challenge_id) REFERENCES campaign_os.wallet_auth_challenges (id) ON DELETE RESTRICT,
  CONSTRAINT campaign_os_wallet_sessions_challenge_key UNIQUE (challenge_id),
  CONSTRAINT campaign_os_wallet_sessions_subject_key_check CHECK (
    octet_length(subject_key) = 64 AND subject_key ~ '^[a-f0-9]{64}$'
  ),
  CONSTRAINT campaign_os_wallet_sessions_wallet_address_check CHECK (
    length(wallet_address) BETWEEN 1 AND 256
    AND wallet_address ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'
  ),
  CONSTRAINT campaign_os_wallet_sessions_account_type_check CHECK (
    account_type IN ('AA', 'EOA')
  ),
  CONSTRAINT campaign_os_wallet_sessions_wallet_source_check CHECK (
    wallet_source IN ('PORTKEY_AA', 'PORTKEY_EOA_APP', 'PORTKEY_EOA_EXTENSION', 'NIGHTELF')
  ),
  CONSTRAINT campaign_os_wallet_sessions_chain_id_check CHECK (
    chain_id IN ('AELF', 'tDVV', 'tDVW')
  ),
  CONSTRAINT campaign_os_wallet_sessions_network_check CHECK (
    network IN ('mainnet', 'testnet')
  ),
  CONSTRAINT campaign_os_wallet_sessions_adapter_id_check CHECK (
    length(adapter_id) BETWEEN 1 AND 64
    AND adapter_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'
  ),
  CONSTRAINT campaign_os_wallet_sessions_proof_method_check CHECK (
    (account_type = 'EOA' AND proof_method = 'AELF_EOA_RECOVERABLE')
    OR (account_type = 'AA' AND proof_method = 'PORTKEY_AA_MANAGER_CA')
  ),
  CONSTRAINT campaign_os_wallet_sessions_signer_address_check CHECK (
    length(signer_address) BETWEEN 1 AND 256
    AND signer_address ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'
  ),
  CONSTRAINT campaign_os_wallet_sessions_ca_hash_check CHECK (
    (account_type = 'EOA' AND ca_hash IS NULL)
    OR (
      account_type = 'AA'
      AND length(ca_hash) BETWEEN 1 AND 256
      AND ca_hash ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'
    )
  ),
  CONSTRAINT campaign_os_wallet_sessions_proof_digest_check CHECK (
    octet_length(proof_digest) = 64 AND proof_digest ~ '^[a-f0-9]{64}$'
  ),
  CONSTRAINT campaign_os_wallet_sessions_credential_boundary_check CHECK (
    length(credential_boundary) BETWEEN 1 AND 128
    AND credential_boundary ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]*$'
  ),
  CONSTRAINT campaign_os_wallet_sessions_roles_check CHECK (
    campaign_os.valid_wallet_auth_id_array(role_ids)
  ),
  CONSTRAINT campaign_os_wallet_sessions_capabilities_check CHECK (
    campaign_os.valid_wallet_auth_id_array(capabilities)
  ),
  CONSTRAINT campaign_os_wallet_sessions_status_check CHECK (
    status IN ('active', 'revoked', 'expired')
  ),
  CONSTRAINT campaign_os_wallet_sessions_version_check CHECK (version >= 1),
  CONSTRAINT campaign_os_wallet_sessions_membership_revision_check CHECK (
    length(membership_revision) BETWEEN 1 AND 160
    AND membership_revision ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'
  ),
  CONSTRAINT campaign_os_wallet_sessions_last_trace_id_check CHECK (
    length(last_trace_id) BETWEEN 1 AND 128
    AND last_trace_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'
  ),
  CONSTRAINT campaign_os_wallet_sessions_time_check CHECK (
    verified_at <= issued_at
    AND created_at <= issued_at
    AND issued_at <= last_seen_at
    AND last_seen_at < idle_expires_at
    AND idle_expires_at <= absolute_expires_at
    AND issued_at < absolute_expires_at
    AND updated_at >= created_at
  ),
  CONSTRAINT campaign_os_wallet_sessions_revocation_check CHECK (
    (status = 'active' AND revoked_at IS NULL AND revocation_code IS NULL)
    OR (
      status IN ('revoked', 'expired')
      AND revoked_at IS NOT NULL
      AND revoked_at >= issued_at
      AND length(revocation_code) BETWEEN 1 AND 64
      AND revocation_code ~ '^[A-Z][A-Z0-9_]*$'
    )
  )
);

CREATE INDEX campaign_os_wallet_sessions_subject_inventory_idx
  ON campaign_os.wallet_sessions (subject_key, status, issued_at, id);
CREATE INDEX campaign_os_wallet_sessions_expiry_idx
  ON campaign_os.wallet_sessions (status, idle_expires_at, absolute_expires_at, id);

CREATE FUNCTION campaign_os.validate_wallet_session_challenge()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status <> 'active' OR NEW.version <> 1 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Wallet sessions must begin in the active state at version one.';
  END IF;

  PERFORM 1
  FROM campaign_os.wallet_auth_challenges
  WHERE id = NEW.challenge_id
    AND status = 'consumed'
    AND wallet_address = NEW.wallet_address
    AND chain_id = NEW.chain_id
    AND network = NEW.network
    AND adapter_id = NEW.adapter_id
    AND ca_hash IS NOT DISTINCT FROM NEW.ca_hash;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Wallet session requires one consumed matching authentication challenge.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER wallet_session_challenge_guard
BEFORE INSERT ON campaign_os.wallet_sessions
FOR EACH ROW EXECUTE FUNCTION campaign_os.validate_wallet_session_challenge();

CREATE FUNCTION campaign_os.protect_wallet_session_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status <> 'active' THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Wallet session terminal state is immutable.';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.challenge_id IS DISTINCT FROM OLD.challenge_id
    OR NEW.subject_key IS DISTINCT FROM OLD.subject_key
    OR NEW.wallet_address IS DISTINCT FROM OLD.wallet_address
    OR NEW.account_type IS DISTINCT FROM OLD.account_type
    OR NEW.wallet_source IS DISTINCT FROM OLD.wallet_source
    OR NEW.chain_id IS DISTINCT FROM OLD.chain_id
    OR NEW.network IS DISTINCT FROM OLD.network
    OR NEW.adapter_id IS DISTINCT FROM OLD.adapter_id
    OR NEW.proof_method IS DISTINCT FROM OLD.proof_method
    OR NEW.signer_address IS DISTINCT FROM OLD.signer_address
    OR NEW.ca_hash IS DISTINCT FROM OLD.ca_hash
    OR NEW.proof_digest IS DISTINCT FROM OLD.proof_digest
    OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
    OR NEW.credential_boundary IS DISTINCT FROM OLD.credential_boundary
    OR NEW.role_ids IS DISTINCT FROM OLD.role_ids
    OR NEW.capabilities IS DISTINCT FROM OLD.capabilities
    OR NEW.membership_revision IS DISTINCT FROM OLD.membership_revision
    OR NEW.issued_at IS DISTINCT FROM OLD.issued_at
    OR NEW.absolute_expires_at IS DISTINCT FROM OLD.absolute_expires_at
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Wallet session subject and proof lineage are immutable.';
  END IF;

  IF NEW.status NOT IN ('active', 'revoked', 'expired')
    OR NEW.version < OLD.version
    OR NEW.version > OLD.version + 1
    OR NEW.last_seen_at < OLD.last_seen_at
    OR NEW.idle_expires_at < OLD.idle_expires_at
    OR NEW.updated_at < OLD.updated_at
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Wallet session transition is invalid.';
  END IF;

  IF NEW.credential_digest IS DISTINCT FROM OLD.credential_digest
    OR NEW.csrf_token_digest IS DISTINCT FROM OLD.csrf_token_digest
  THEN
    IF NEW.status <> 'active'
      OR NEW.version <> OLD.version + 1
      OR NEW.credential_digest IS NOT DISTINCT FROM OLD.credential_digest
      OR NEW.csrf_token_digest IS NOT DISTINCT FROM OLD.csrf_token_digest
    THEN
      RAISE EXCEPTION USING
        ERRCODE = '55000',
        MESSAGE = 'Wallet session credential rotation is invalid.';
    END IF;
  END IF;

  IF NEW.status <> 'active' AND NEW.version <> OLD.version + 1 THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'Wallet session terminal transition must advance version.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER wallet_session_transition_guard
BEFORE UPDATE ON campaign_os.wallet_sessions
FOR EACH ROW EXECUTE FUNCTION campaign_os.protect_wallet_session_transition();
