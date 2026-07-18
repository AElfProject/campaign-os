CREATE TABLE campaign_os.wallet_auth_challenges (
  id text PRIMARY KEY,
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

CREATE TABLE campaign_os.wallet_sessions (
  id text PRIMARY KEY,
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
    jsonb_typeof(role_ids) = 'array'
    AND jsonb_array_length(role_ids) <= 64
  ),
  CONSTRAINT campaign_os_wallet_sessions_capabilities_check CHECK (
    jsonb_typeof(capabilities) = 'array'
    AND jsonb_array_length(capabilities) <= 64
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
