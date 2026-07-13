CREATE SCHEMA IF NOT EXISTS campaign_os;

CREATE TABLE IF NOT EXISTS campaign_os.schema_migrations (
  migration_id text PRIMARY KEY,
  checksum text NOT NULL CHECK (checksum ~ '^[a-f0-9]{64}$'),
  applied_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  execution_ms integer NOT NULL CHECK (execution_ms >= 0)
);

CREATE TABLE campaign_os.campaigns (
  id text PRIMARY KEY,
  project_id text NOT NULL CHECK (btrim(project_id) <> ''),
  owner_address text NOT NULL CHECK (btrim(owner_address) <> ''),
  status text NOT NULL CHECK (
    status IN ('draft', 'ai_draft', 'human_review', 'scheduled', 'live', 'paused', 'ended', 'exported', 'archived')
  ),
  default_locale text NOT NULL CHECK (default_locale = 'en-US'),
  supported_locales jsonb NOT NULL CHECK (
    jsonb_typeof(supported_locales) = 'array'
    AND jsonb_array_length(supported_locales) BETWEEN 1 AND 9
    AND supported_locales ? default_locale
    AND supported_locales <@ '["en-US", "zh-CN", "zh-TW", "ja-JP", "ko-KR", "vi-VN", "id-ID", "tr-TR", "es-ES"]'::jsonb
  ),
  wallet_policy text NOT NULL CHECK (wallet_policy IN ('ANY', 'AA_ONLY', 'EOA_ONLY')),
  contract_mode text NOT NULL CHECK (contract_mode IN ('OFF_CHAIN_MVP', 'V2_COMPANION', 'CONTRACT_CLAIM')),
  goal text NOT NULL CHECK (btrim(goal) <> ''),
  duration text NOT NULL CHECK (btrim(duration) <> ''),
  reward_description text NOT NULL CHECK (btrim(reward_description) <> ''),
  reward_disclaimer_hash text,
  metadata_uri text,
  metadata_hash text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  publish_readiness jsonb NOT NULL CHECK (jsonb_typeof(publish_readiness) = 'object'),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT campaign_os_campaigns_time_window_check CHECK (start_time < end_time),
  CONSTRAINT campaign_os_campaigns_updated_after_created_check CHECK (updated_at >= created_at)
);

CREATE INDEX campaign_os_campaigns_project_updated_idx
  ON campaign_os.campaigns (project_id, updated_at DESC, id);
CREATE INDEX campaign_os_campaigns_owner_updated_idx
  ON campaign_os.campaigns (owner_address, updated_at DESC, id);
CREATE INDEX campaign_os_campaigns_status_updated_idx
  ON campaign_os.campaigns (status, updated_at DESC, id);

CREATE TABLE campaign_os.campaign_tasks (
  id text PRIMARY KEY,
  campaign_id text NOT NULL,
  template_code text NOT NULL CHECK (btrim(template_code) <> ''),
  verification_type text NOT NULL CHECK (
    verification_type IN ('WALLET', 'ON_CHAIN', 'DAPP_API', 'SOCIAL', 'MANUAL')
  ),
  wallet_compatibility text NOT NULL CHECK (wallet_compatibility IN ('ANY', 'AA_ONLY', 'EOA_ONLY')),
  points integer NOT NULL CHECK (points >= 0),
  required boolean NOT NULL,
  evidence_rule jsonb NOT NULL CHECK (jsonb_typeof(evidence_rule) = 'object'),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT campaign_os_campaign_tasks_campaign_fk
    FOREIGN KEY (campaign_id) REFERENCES campaign_os.campaigns (id) ON DELETE CASCADE,
  CONSTRAINT campaign_os_campaign_tasks_campaign_id_id_key UNIQUE (campaign_id, id),
  CONSTRAINT campaign_os_campaign_tasks_updated_after_created_check CHECK (updated_at >= created_at)
);

CREATE INDEX campaign_os_campaign_tasks_campaign_idx
  ON campaign_os.campaign_tasks (campaign_id, id);

CREATE TABLE campaign_os.campaign_participants (
  id text PRIMARY KEY,
  campaign_id text NOT NULL,
  wallet_address text NOT NULL CHECK (btrim(wallet_address) <> ''),
  account_type text NOT NULL CHECK (account_type IN ('AA', 'EOA', 'UNKNOWN')),
  wallet_source text NOT NULL CHECK (
    wallet_source IN ('PORTKEY_AA', 'PORTKEY_EOA_APP', 'PORTKEY_EOA_EXTENSION', 'NIGHTELF', 'AGENT_SKILL', 'OTHER')
  ),
  wallet_type_verified boolean NOT NULL,
  wallet_signature_status text NOT NULL CHECK (
    wallet_signature_status IN ('signed', 'missing', 'not_required', 'not_available')
  ),
  wallet_verified_at timestamptz,
  locale_preference text NOT NULL CHECK (
    locale_preference IN ('en-US', 'zh-CN', 'zh-TW', 'ja-JP', 'ko-KR', 'vi-VN', 'id-ID', 'tr-TR', 'es-ES')
  ),
  total_points integer NOT NULL CHECK (total_points >= 0),
  rank integer CHECK (rank IS NULL OR rank > 0),
  risk_flags jsonb NOT NULL CHECK (
    jsonb_typeof(risk_flags) = 'array' AND jsonb_array_length(risk_flags) <= 100
  ),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT campaign_os_campaign_participants_campaign_fk
    FOREIGN KEY (campaign_id) REFERENCES campaign_os.campaigns (id) ON DELETE CASCADE,
  CONSTRAINT campaign_os_campaign_participants_campaign_wallet_key UNIQUE (campaign_id, wallet_address),
  CONSTRAINT campaign_os_campaign_participants_updated_after_created_check CHECK (updated_at >= created_at)
);

CREATE INDEX campaign_os_campaign_participants_campaign_rank_idx
  ON campaign_os.campaign_participants (campaign_id, rank, wallet_address);

CREATE TABLE campaign_os.campaign_task_completions (
  id text PRIMARY KEY,
  campaign_id text NOT NULL,
  task_id text NOT NULL,
  wallet_address text NOT NULL CHECK (btrim(wallet_address) <> ''),
  account_type text NOT NULL CHECK (account_type IN ('AA', 'EOA', 'UNKNOWN')),
  wallet_source text NOT NULL CHECK (
    wallet_source IN ('PORTKEY_AA', 'PORTKEY_EOA_APP', 'PORTKEY_EOA_EXTENSION', 'NIGHTELF', 'AGENT_SKILL', 'OTHER')
  ),
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'manual_review')),
  evidence_source text NOT NULL CHECK (
    evidence_source IN ('AEFINDER', 'AELFSCAN', 'DAPP_API', 'SOCIAL_API', 'MANUAL')
  ),
  evidence_id text,
  evidence_hash text,
  points_awarded integer NOT NULL CHECK (points_awarded >= 0),
  completed_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT campaign_os_campaign_task_completions_campaign_fk
    FOREIGN KEY (campaign_id) REFERENCES campaign_os.campaigns (id) ON DELETE CASCADE,
  CONSTRAINT campaign_os_campaign_task_completions_task_fk
    FOREIGN KEY (campaign_id, task_id)
    REFERENCES campaign_os.campaign_tasks (campaign_id, id) ON DELETE CASCADE,
  CONSTRAINT campaign_os_campaign_task_completions_campaign_task_wallet_key
    UNIQUE (campaign_id, task_id, wallet_address),
  CONSTRAINT campaign_os_campaign_task_completions_campaign_task_wallet_id_key
    UNIQUE (campaign_id, task_id, wallet_address, id),
  CONSTRAINT campaign_os_campaign_task_completions_completed_at_check CHECK (
    status <> 'completed' OR completed_at IS NOT NULL
  ),
  CONSTRAINT campaign_os_campaign_task_completions_updated_after_created_check CHECK (updated_at >= created_at)
);

CREATE INDEX campaign_os_campaign_task_completions_campaign_wallet_idx
  ON campaign_os.campaign_task_completions (campaign_id, wallet_address, task_id);

CREATE TABLE campaign_os.campaign_task_evidence (
  id text PRIMARY KEY,
  campaign_id text NOT NULL,
  task_id text NOT NULL,
  wallet_address text NOT NULL CHECK (btrim(wallet_address) <> ''),
  completion_id text,
  account_type text NOT NULL CHECK (account_type IN ('AA', 'EOA', 'UNKNOWN')),
  wallet_source text NOT NULL CHECK (
    wallet_source IN ('PORTKEY_AA', 'PORTKEY_EOA_APP', 'PORTKEY_EOA_EXTENSION', 'NIGHTELF', 'AGENT_SKILL', 'OTHER')
  ),
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'manual_review')),
  evidence_source text NOT NULL CHECK (
    evidence_source IN ('AEFINDER', 'AELFSCAN', 'DAPP_API', 'SOCIAL_API', 'MANUAL')
  ),
  evidence_hash text NOT NULL CHECK (btrim(evidence_hash) <> ''),
  evidence_ref text,
  diagnostic_codes jsonb NOT NULL CHECK (
    jsonb_typeof(diagnostic_codes) = 'array' AND jsonb_array_length(diagnostic_codes) <= 100
  ),
  points_awarded integer NOT NULL CHECK (points_awarded >= 0),
  captured_at timestamptz NOT NULL,
  live_contract_executed boolean NOT NULL DEFAULT false CHECK (live_contract_executed = false),
  live_provider_executed boolean NOT NULL DEFAULT false CHECK (live_provider_executed = false),
  live_reward_executed boolean NOT NULL DEFAULT false CHECK (live_reward_executed = false),
  live_storage_executed boolean NOT NULL DEFAULT false CHECK (live_storage_executed = false),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT campaign_os_campaign_task_evidence_campaign_fk
    FOREIGN KEY (campaign_id) REFERENCES campaign_os.campaigns (id) ON DELETE CASCADE,
  CONSTRAINT campaign_os_campaign_task_evidence_task_fk
    FOREIGN KEY (campaign_id, task_id)
    REFERENCES campaign_os.campaign_tasks (campaign_id, id) ON DELETE CASCADE,
  CONSTRAINT campaign_os_campaign_task_evidence_completion_fk
    FOREIGN KEY (campaign_id, task_id, wallet_address, completion_id)
    REFERENCES campaign_os.campaign_task_completions (campaign_id, task_id, wallet_address, id)
    ON DELETE CASCADE,
  CONSTRAINT campaign_os_campaign_task_evidence_campaign_task_wallet_key
    UNIQUE (campaign_id, task_id, wallet_address),
  CONSTRAINT campaign_os_campaign_task_evidence_updated_after_created_check CHECK (updated_at >= created_at)
);

CREATE INDEX campaign_os_campaign_task_evidence_campaign_wallet_idx
  ON campaign_os.campaign_task_evidence (campaign_id, wallet_address, task_id);
CREATE INDEX campaign_os_campaign_task_evidence_campaign_task_idx
  ON campaign_os.campaign_task_evidence (campaign_id, task_id, captured_at DESC);

CREATE TABLE campaign_os.campaign_referral_bindings (
  id text PRIMARY KEY,
  campaign_id text NOT NULL,
  invitee_wallet_address text NOT NULL CHECK (btrim(invitee_wallet_address) <> ''),
  invitee_account_type text NOT NULL CHECK (invitee_account_type IN ('AA', 'EOA', 'UNKNOWN')),
  invitee_wallet_source text NOT NULL CHECK (
    invitee_wallet_source IN ('PORTKEY_AA', 'PORTKEY_EOA_APP', 'PORTKEY_EOA_EXTENSION', 'NIGHTELF', 'AGENT_SKILL', 'OTHER')
  ),
  referrer_wallet_address text NOT NULL CHECK (btrim(referrer_wallet_address) <> ''),
  referrer_account_type text NOT NULL CHECK (referrer_account_type IN ('AA', 'EOA', 'UNKNOWN')),
  referrer_wallet_source text NOT NULL CHECK (
    referrer_wallet_source IN ('PORTKEY_AA', 'PORTKEY_EOA_APP', 'PORTKEY_EOA_EXTENSION', 'NIGHTELF', 'AGENT_SKILL', 'OTHER')
  ),
  qualified_action_completed boolean NOT NULL,
  qualified_action_completed_at timestamptz,
  qualified_action_evidence_hash text,
  status text NOT NULL CHECK (status IN ('pending', 'qualified', 'risk_review')),
  risk_flags jsonb NOT NULL CHECK (
    jsonb_typeof(risk_flags) = 'array' AND jsonb_array_length(risk_flags) <= 100
  ),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT campaign_os_campaign_referral_bindings_campaign_fk
    FOREIGN KEY (campaign_id) REFERENCES campaign_os.campaigns (id) ON DELETE CASCADE,
  CONSTRAINT campaign_os_campaign_referral_bindings_campaign_invitee_key
    UNIQUE (campaign_id, invitee_wallet_address),
  CONSTRAINT campaign_os_campaign_referral_bindings_no_self_referral_check
    CHECK (invitee_wallet_address <> referrer_wallet_address),
  CONSTRAINT campaign_os_campaign_referral_bindings_qualified_at_check CHECK (
    qualified_action_completed = (qualified_action_completed_at IS NOT NULL)
  ),
  CONSTRAINT campaign_os_campaign_referral_bindings_status_check CHECK (
    (status = 'qualified') = qualified_action_completed
  ),
  CONSTRAINT campaign_os_campaign_referral_bindings_updated_after_created_check CHECK (updated_at >= created_at)
);

CREATE INDEX campaign_os_campaign_referral_bindings_campaign_referrer_idx
  ON campaign_os.campaign_referral_bindings (campaign_id, referrer_wallet_address, invitee_wallet_address);
