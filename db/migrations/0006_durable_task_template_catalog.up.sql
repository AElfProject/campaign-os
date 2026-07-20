CREATE FUNCTION campaign_os.valid_task_template_supported_locales(value jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
SET search_path = pg_catalog
AS $function$
  SELECT CASE
    WHEN jsonb_typeof(value) <> 'array' THEN false
    WHEN jsonb_array_length(value) NOT BETWEEN 1 AND 16 THEN false
    ELSE
      NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(value) AS locale(item)
        WHERE jsonb_typeof(item) <> 'string'
          OR octet_length(item #>> '{}') NOT BETWEEN 1 AND 35
          OR (item #>> '{}') !~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$'
      )
      AND jsonb_array_length(value) = (
        SELECT COUNT(DISTINCT (item #>> '{}') COLLATE "C")
        FROM jsonb_array_elements(value) AS locale(item)
      )
      AND value = (
        SELECT jsonb_agg(item ORDER BY (item #>> '{}') COLLATE "C")
        FROM jsonb_array_elements(value) AS locale(item)
      )
  END
$function$;

CREATE FUNCTION campaign_os.valid_task_template_locales(
  localized_content jsonb,
  locale_readiness jsonb,
  supported_locales jsonb
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
SET search_path = pg_catalog
AS $function$
  SELECT CASE
    WHEN jsonb_typeof(localized_content) <> 'object'
      OR jsonb_typeof(locale_readiness) <> 'object'
      OR jsonb_typeof(supported_locales) <> 'array'
      OR octet_length(localized_content::text) > 65536
      OR octet_length(locale_readiness::text) > 4096
    THEN false
    ELSE
      (SELECT COUNT(*) FROM jsonb_object_keys(localized_content))
        = jsonb_array_length(supported_locales)
      AND (SELECT COUNT(*) FROM jsonb_object_keys(locale_readiness))
        = jsonb_array_length(supported_locales)
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(supported_locales) AS locale(value)
        WHERE NOT localized_content ? value
          OR NOT locale_readiness ? value
      )
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_each(localized_content) AS content(locale, value)
        WHERE jsonb_typeof(value) <> 'object'
          OR NOT value ?& ARRAY['description', 'title']
          OR (SELECT COUNT(*) FROM jsonb_object_keys(value)) <> 2
          OR jsonb_typeof(value -> 'description') <> 'string'
          OR octet_length(value ->> 'description') NOT BETWEEN 1 AND 1000
          OR jsonb_typeof(value -> 'title') <> 'string'
          OR octet_length(value ->> 'title') NOT BETWEEN 1 AND 160
      )
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_each(locale_readiness) AS readiness(locale, value)
        WHERE jsonb_typeof(value) <> 'string'
          OR value #>> '{}' NOT IN ('ready', 'reviewed', 'ai_draft', 'fallback', 'missing')
      )
  END
$function$;

CREATE FUNCTION campaign_os.valid_task_template_snapshot(
  snapshot jsonb,
  expected_template_code text,
  expected_template_version integer,
  expected_template_checksum text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
SET search_path = pg_catalog
AS $function$
  SELECT CASE
    WHEN jsonb_typeof(snapshot) <> 'object'
      OR octet_length(snapshot::text) > 32768
    THEN false
    ELSE
      (SELECT COUNT(*) FROM jsonb_object_keys(snapshot)) = 11
      AND snapshot ?& ARRAY[
        'version',
        'templateCode',
        'templateVersion',
        'templateChecksum',
        'category',
        'adoptionMode',
        'verificationType',
        'walletCompatibility',
        'points',
        'required',
        'evidenceRule'
      ]
      AND jsonb_typeof(snapshot -> 'version') = 'string'
      AND snapshot ->> 'version' = 'task-template-snapshot-v1'
      AND jsonb_typeof(snapshot -> 'templateCode') = 'string'
      AND snapshot ->> 'templateCode' = expected_template_code
      AND jsonb_typeof(snapshot -> 'templateVersion') = 'number'
      AND snapshot ->> 'templateVersion' = expected_template_version::text
      AND jsonb_typeof(snapshot -> 'templateChecksum') = 'string'
      AND snapshot ->> 'templateChecksum' = expected_template_checksum
      AND jsonb_typeof(snapshot -> 'category') = 'string'
      AND octet_length(snapshot ->> 'category') BETWEEN 1 AND 64
      AND snapshot ->> 'category' ~ '^[a-z][a-z0-9-]*$'
      AND jsonb_typeof(snapshot -> 'adoptionMode') = 'string'
      AND snapshot ->> 'adoptionMode' = 'direct'
      AND jsonb_typeof(snapshot -> 'verificationType') = 'string'
      AND snapshot ->> 'verificationType'
        IN ('WALLET', 'ON_CHAIN', 'DAPP_API', 'SOCIAL', 'MANUAL')
      AND jsonb_typeof(snapshot -> 'walletCompatibility') = 'string'
      AND snapshot ->> 'walletCompatibility' IN ('ANY', 'AA_ONLY', 'EOA_ONLY')
      AND jsonb_typeof(snapshot -> 'points') = 'number'
      AND snapshot ->> 'points' ~ '^(0|[1-9][0-9]{0,6})$'
      AND (snapshot ->> 'points')::numeric BETWEEN 0 AND 1000000
      AND jsonb_typeof(snapshot -> 'required') = 'boolean'
      AND jsonb_typeof(snapshot -> 'evidenceRule') = 'object'
      AND octet_length((snapshot -> 'evidenceRule')::text) <= 16384
  END
$function$;

CREATE TABLE campaign_os.task_template_catalog_versions (
  template_code text NOT NULL,
  version integer NOT NULL,
  catalog_schema_version text NOT NULL,
  status text NOT NULL,
  adoption_mode text NOT NULL,
  category text NOT NULL,
  verification_type text NOT NULL,
  wallet_compatibility text NOT NULL,
  default_points integer NOT NULL,
  minimum_points integer NOT NULL,
  maximum_points integer NOT NULL,
  required_by_default boolean NOT NULL,
  required_override_allowed boolean NOT NULL,
  risk_level text NOT NULL,
  supported_locales jsonb NOT NULL,
  localized_content jsonb NOT NULL,
  locale_readiness jsonb NOT NULL,
  evidence_rule jsonb NOT NULL,
  checksum text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  deprecated_at timestamptz,
  retired_at timestamptz,
  CONSTRAINT task_template_catalog_versions_pkey
    PRIMARY KEY (template_code, version),
  CONSTRAINT task_template_catalog_code_check CHECK (
    octet_length(template_code) BETWEEN 1 AND 96
    AND template_code ~ '^[a-z0-9][a-z0-9-]*$'
  ),
  CONSTRAINT task_template_catalog_version_check CHECK (
    version BETWEEN 1 AND 2147483647
  ),
  CONSTRAINT task_template_catalog_schema_check CHECK (
    catalog_schema_version = 'task-template-catalog-v1'
  ),
  CONSTRAINT task_template_catalog_status_check CHECK (
    status IN ('active', 'deprecated', 'retired')
  ),
  CONSTRAINT task_template_catalog_adoption_check CHECK (
    adoption_mode IN ('direct', 'manual_review', 'deferred')
  ),
  CONSTRAINT task_template_catalog_direct_adoption_check CHECK (
    adoption_mode <> 'direct'
    OR verification_type NOT IN ('SOCIAL', 'MANUAL')
  ),
  CONSTRAINT task_template_catalog_category_check CHECK (
    octet_length(category) BETWEEN 1 AND 64
    AND category ~ '^[a-z][a-z0-9-]*$'
  ),
  CONSTRAINT task_template_catalog_verification_check CHECK (
    verification_type IN ('WALLET', 'ON_CHAIN', 'DAPP_API', 'SOCIAL', 'MANUAL')
  ),
  CONSTRAINT task_template_catalog_wallet_check CHECK (
    wallet_compatibility IN ('ANY', 'AA_ONLY', 'EOA_ONLY')
  ),
  CONSTRAINT task_template_catalog_points_check CHECK (
    minimum_points BETWEEN 0 AND 1000000
    AND default_points BETWEEN minimum_points AND maximum_points
    AND maximum_points BETWEEN 0 AND 1000000
  ),
  CONSTRAINT task_template_catalog_risk_check CHECK (
    risk_level IN ('low', 'medium', 'high')
  ),
  CONSTRAINT task_template_catalog_supported_locales_check CHECK (
    campaign_os.valid_task_template_supported_locales(supported_locales)
  ),
  CONSTRAINT task_template_catalog_locales_check CHECK (
    campaign_os.valid_task_template_locales(
      localized_content,
      locale_readiness,
      supported_locales
    )
  ),
  CONSTRAINT task_template_catalog_evidence_rule_check CHECK (
    jsonb_typeof(evidence_rule) = 'object'
    AND octet_length(evidence_rule::text) <= 16384
  ),
  CONSTRAINT task_template_catalog_checksum_check CHECK (
    checksum ~ '^[a-f0-9]{64}$'
  ),
  CONSTRAINT task_template_catalog_lifecycle_check CHECK (
    updated_at >= created_at
    AND (deprecated_at IS NULL OR deprecated_at BETWEEN created_at AND updated_at)
    AND (retired_at IS NULL OR retired_at BETWEEN created_at AND updated_at)
    AND (
      (status = 'active' AND deprecated_at IS NULL AND retired_at IS NULL)
      OR (status = 'deprecated' AND deprecated_at IS NOT NULL AND retired_at IS NULL)
      OR (
        status = 'retired'
        AND retired_at IS NOT NULL
        AND (deprecated_at IS NULL OR deprecated_at <= retired_at)
      )
    )
  )
);

CREATE UNIQUE INDEX task_template_catalog_single_active_idx
  ON campaign_os.task_template_catalog_versions (template_code)
  WHERE status = 'active';

CREATE INDEX task_template_catalog_list_idx
  ON campaign_os.task_template_catalog_versions (
    status,
    category,
    verification_type,
    wallet_compatibility,
    template_code COLLATE "C",
    version
  );

CREATE INDEX task_template_catalog_adoption_idx
  ON campaign_os.task_template_catalog_versions (
    template_code COLLATE "C",
    version,
    adoption_mode
  )
  WHERE status = 'active';

CREATE INDEX task_template_catalog_locales_idx
  ON campaign_os.task_template_catalog_versions
  USING gin (supported_locales jsonb_path_ops);

CREATE FUNCTION campaign_os.protect_task_template_catalog_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $function$
BEGIN
  IF NEW.template_code IS DISTINCT FROM OLD.template_code
    OR NEW.version IS DISTINCT FROM OLD.version
    OR NEW.catalog_schema_version IS DISTINCT FROM OLD.catalog_schema_version
    OR NEW.adoption_mode IS DISTINCT FROM OLD.adoption_mode
    OR NEW.category IS DISTINCT FROM OLD.category
    OR NEW.verification_type IS DISTINCT FROM OLD.verification_type
    OR NEW.wallet_compatibility IS DISTINCT FROM OLD.wallet_compatibility
    OR NEW.default_points IS DISTINCT FROM OLD.default_points
    OR NEW.minimum_points IS DISTINCT FROM OLD.minimum_points
    OR NEW.maximum_points IS DISTINCT FROM OLD.maximum_points
    OR NEW.required_by_default IS DISTINCT FROM OLD.required_by_default
    OR NEW.required_override_allowed IS DISTINCT FROM OLD.required_override_allowed
    OR NEW.risk_level IS DISTINCT FROM OLD.risk_level
    OR NEW.supported_locales IS DISTINCT FROM OLD.supported_locales
    OR NEW.localized_content IS DISTINCT FROM OLD.localized_content
    OR NEW.locale_readiness IS DISTINCT FROM OLD.locale_readiness
    OR NEW.evidence_rule IS DISTINCT FROM OLD.evidence_rule
    OR NEW.checksum IS DISTINCT FROM OLD.checksum
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'TASK TEMPLATE CATALOG CANONICAL FIELDS ARE IMMUTABLE';
  END IF;

  IF NEW.updated_at < OLD.updated_at
    OR (OLD.deprecated_at IS NOT NULL AND NEW.deprecated_at IS DISTINCT FROM OLD.deprecated_at)
    OR (OLD.retired_at IS NOT NULL AND NEW.retired_at IS DISTINCT FROM OLD.retired_at)
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'TASK TEMPLATE CATALOG LIFECYCLE TIMESTAMPS ARE FORWARD ONLY';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
    AND NOT (
      (OLD.status = 'active' AND NEW.status IN ('deprecated', 'retired'))
      OR (OLD.status = 'deprecated' AND NEW.status = 'retired')
    )
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'TASK TEMPLATE CATALOG STATUS IS FORWARD ONLY';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.updated_at <= OLD.updated_at
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'TASK TEMPLATE CATALOG STATUS REQUIRES A NEW TIMESTAMP';
  END IF;

  RETURN NEW;
END
$function$;

CREATE TRIGGER task_template_catalog_update_guard
BEFORE UPDATE ON campaign_os.task_template_catalog_versions
FOR EACH ROW EXECUTE FUNCTION campaign_os.protect_task_template_catalog_update();

INSERT INTO campaign_os.task_template_catalog_versions (
  template_code,
  version,
  catalog_schema_version,
  status,
  adoption_mode,
  category,
  verification_type,
  wallet_compatibility,
  default_points,
  minimum_points,
  maximum_points,
  required_by_default,
  required_override_allowed,
  risk_level,
  supported_locales,
  localized_content,
  locale_readiness,
  evidence_rule,
  checksum,
  created_at,
  updated_at
)
VALUES
  (
    'wallet-connect',
    1,
    'task-template-catalog-v1',
    'active',
    'direct',
    'wallet',
    'WALLET',
    'ANY',
    40,
    20,
    80,
    true,
    false,
    'low',
    $json$["en-US","zh-CN","zh-TW"]$json$::jsonb,
    $json${
      "en-US":{"description":"Connect any supported aelf AA or EOA wallet.","title":"Connect wallet"},
      "zh-CN":{"description":"连接任意受支持的 aelf AA 或 EOA 钱包。","title":"连接钱包"},
      "zh-TW":{"description":"连接任意受支持的 aelf AA 或 EOA 钱包。","title":"连接钱包"}
    }$json$::jsonb,
    $json${"en-US":"ready","zh-CN":"reviewed","zh-TW":"fallback"}$json$::jsonb,
    $json${"kind":"wallet_session","source":"WALLET_SESSION"}$json$::jsonb,
    '0114d4dafde62cda6c222e6499efe55b484f8451f845babb66ccf1f3babd783a',
    TIMESTAMPTZ '2026-07-20 00:00:00+00',
    TIMESTAMPTZ '2026-07-20 00:00:00+00'
  ),
  (
    'bridge-ebridge',
    1,
    'task-template-catalog-v1',
    'active',
    'direct',
    'bridge',
    'ON_CHAIN',
    'ANY',
    120,
    60,
    240,
    true,
    false,
    'low',
    $json$["en-US","zh-CN","zh-TW"]$json$::jsonb,
    $json${
      "en-US":{"description":"Complete one bridge action with the connected wallet.","title":"Bridge with eBridge"},
      "zh-CN":{"description":"使用已连接钱包完成一次跨链操作。","title":"使用 eBridge 跨链"},
      "zh-TW":{"description":"使用已连接钱包完成一次跨链操作。","title":"使用 eBridge 跨链"}
    }$json$::jsonb,
    $json${"en-US":"ready","zh-CN":"ai_draft","zh-TW":"missing"}$json$::jsonb,
    $json${"kind":"provider_event","source":"AEFINDER"}$json$::jsonb,
    'c853e3150e98dccab6f12db1082044187c07b8105da579b2f47228753d376366',
    TIMESTAMPTZ '2026-07-20 00:00:00+00',
    TIMESTAMPTZ '2026-07-20 00:00:00+00'
  ),
  (
    'swap-awaken',
    1,
    'task-template-catalog-v1',
    'active',
    'direct',
    'swap',
    'DAPP_API',
    'ANY',
    100,
    50,
    200,
    false,
    true,
    'medium',
    $json$["en-US","zh-CN","zh-TW"]$json$::jsonb,
    $json${
      "en-US":{"description":"Complete a seeded swap task for the campaign token pair.","title":"Swap on Awaken"},
      "zh-CN":{"description":"完成活动指定交易对的一次 Swap。","title":"在 Awaken Swap"},
      "zh-TW":{"description":"完成活动指定交易对的一次 Swap。","title":"在 Awaken Swap"}
    }$json$::jsonb,
    $json${"en-US":"ready","zh-CN":"ai_draft","zh-TW":"missing"}$json$::jsonb,
    $json${"kind":"provider_api","source":"DAPP_API"}$json$::jsonb,
    'd6b8f167617b8ba400b98b9069ae4792131408cde8070f640324890e38aa0df9',
    TIMESTAMPTZ '2026-07-20 00:00:00+00',
    TIMESTAMPTZ '2026-07-20 00:00:00+00'
  ),
  (
    'liquidity-awaken',
    1,
    'task-template-catalog-v1',
    'active',
    'direct',
    'liquidity',
    'ON_CHAIN',
    'ANY',
    130,
    65,
    260,
    false,
    true,
    'medium',
    $json$["en-US","zh-CN","zh-TW"]$json$::jsonb,
    $json${
      "en-US":{"description":"Verify seeded/local LP position or liquidity event evidence without connecting a live Awaken provider.","title":"Add liquidity on Awaken"},
      "zh-CN":{"description":"验证 seeded/本地 LP 仓位或流动性事件证据，不连接实时 Awaken provider。","title":"在 Awaken 添加流动性"},
      "zh-TW":{"description":"验证 seeded/本地 LP 仓位或流动性事件证据，不连接实时 Awaken provider。","title":"在 Awaken 添加流动性"}
    }$json$::jsonb,
    $json${"en-US":"ready","zh-CN":"ai_draft","zh-TW":"missing"}$json$::jsonb,
    $json${"kind":"provider_event","source":"AEFINDER"}$json$::jsonb,
    '631a473a66b438cb9f57bcbfb44dfa97b2fcf03a9009afb3d136b17cd6762447',
    TIMESTAMPTZ '2026-07-20 00:00:00+00',
    TIMESTAMPTZ '2026-07-20 00:00:00+00'
  ),
  (
    'nft-hold',
    1,
    'task-template-catalog-v1',
    'active',
    'direct',
    'nft',
    'ON_CHAIN',
    'ANY',
    90,
    45,
    180,
    false,
    true,
    'medium',
    $json$["en-US","zh-CN","zh-TW"]$json$::jsonb,
    $json${
      "en-US":{"description":"Verify ownership of an eligible NFT collection.","title":"Hold campaign NFT"},
      "zh-CN":{"description":"验证指定 NFT 合集的持有状态。","title":"持有活动 NFT"},
      "zh-TW":{"description":"验证指定 NFT 合集的持有状态。","title":"持有活动 NFT"}
    }$json$::jsonb,
    $json${"en-US":"ready","zh-CN":"ai_draft","zh-TW":"missing"}$json$::jsonb,
    $json${"kind":"provider_event","source":"AELFSCAN"}$json$::jsonb,
    'a449e6359a9eced771eb833707859ec26a94828fedf0d4144d21ac2aaae6bf23',
    TIMESTAMPTZ '2026-07-20 00:00:00+00',
    TIMESTAMPTZ '2026-07-20 00:00:00+00'
  ),
  (
    'schrodinger-hold',
    1,
    'task-template-catalog-v1',
    'active',
    'direct',
    'schrodinger',
    'ON_CHAIN',
    'ANY',
    95,
    45,
    190,
    false,
    true,
    'medium',
    $json$["en-US","zh-CN","zh-TW"]$json$::jsonb,
    $json${
      "en-US":{"description":"Verify seeded adopt, hold, or trade participation for Schrödinger NFTs.","title":"Hold Schrödinger NFT"},
      "zh-CN":{"description":"验证 Schrödinger NFT 的 seeded 领养、持有或交易参与。","title":"持有 Schrödinger NFT"},
      "zh-TW":{"description":"验证 Schrödinger NFT 的 seeded 领养、持有或交易参与。","title":"持有 Schrödinger NFT"}
    }$json$::jsonb,
    $json${"en-US":"ready","zh-CN":"ai_draft","zh-TW":"missing"}$json$::jsonb,
    $json${"kind":"provider_event","source":"AELFSCAN"}$json$::jsonb,
    '4a440889f5107090b428e457d485e038717cffe9ccd013ecc467e4baa91ce787',
    TIMESTAMPTZ '2026-07-20 00:00:00+00',
    TIMESTAMPTZ '2026-07-20 00:00:00+00'
  ),
  (
    'dao-vote',
    1,
    'task-template-catalog-v1',
    'active',
    'direct',
    'dao',
    'ON_CHAIN',
    'EOA_ONLY',
    110,
    55,
    220,
    false,
    true,
    'medium',
    $json$["en-US","zh-CN","zh-TW"]$json$::jsonb,
    $json${
      "en-US":{"description":"Verify participation in a governance proposal.","title":"Vote in DAO proposal"},
      "zh-CN":{"description":"验证治理提案参与记录。","title":"参与 DAO 提案投票"},
      "zh-TW":{"description":"验证治理提案参与记录。","title":"参与 DAO 提案投票"}
    }$json$::jsonb,
    $json${"en-US":"ready","zh-CN":"fallback","zh-TW":"fallback"}$json$::jsonb,
    $json${"kind":"provider_event","source":"AEFINDER"}$json$::jsonb,
    '6480c2e967624f4e79daa0658aed5a1b92d327489c6873b7ef65909201c16e16',
    TIMESTAMPTZ '2026-07-20 00:00:00+00',
    TIMESTAMPTZ '2026-07-20 00:00:00+00'
  ),
  (
    'daipp-submit',
    1,
    'task-template-catalog-v1',
    'active',
    'direct',
    'daipp',
    'DAPP_API',
    'ANY',
    80,
    40,
    160,
    false,
    true,
    'low',
    $json$["en-US","zh-CN","zh-TW"]$json$::jsonb,
    $json${
      "en-US":{"description":"Submit structured feedback for a dAIPP initiative.","title":"Submit dAIPP feedback"},
      "zh-CN":{"description":"为 dAIPP 计划提交结构化反馈。","title":"提交 dAIPP 反馈"},
      "zh-TW":{"description":"为 dAIPP 计划提交结构化反馈。","title":"提交 dAIPP 反馈"}
    }$json$::jsonb,
    $json${"en-US":"ready","zh-CN":"ai_draft","zh-TW":"missing"}$json$::jsonb,
    $json${"kind":"provider_api","source":"DAPP_API"}$json$::jsonb,
    '148400ba54941a018e712991157cefa91623be9d6e96c25783eb1d8dce443cea',
    TIMESTAMPTZ '2026-07-20 00:00:00+00',
    TIMESTAMPTZ '2026-07-20 00:00:00+00'
  ),
  (
    'pay-complete',
    1,
    'task-template-catalog-v1',
    'active',
    'direct',
    'pay',
    'DAPP_API',
    'ANY',
    85,
    40,
    170,
    false,
    true,
    'medium',
    $json$["en-US","zh-CN","zh-TW"]$json$::jsonb,
    $json${
      "en-US":{"description":"Complete a seeded invoice or payment link task through aelf Pay metadata.","title":"Complete aelf Pay payment"},
      "zh-CN":{"description":"通过 aelf Pay metadata 完成 seeded 发票或支付链接任务。","title":"完成 aelf Pay 支付"},
      "zh-TW":{"description":"通过 aelf Pay metadata 完成 seeded 发票或支付链接任务。","title":"完成 aelf Pay 支付"}
    }$json$::jsonb,
    $json${"en-US":"ready","zh-CN":"ai_draft","zh-TW":"missing"}$json$::jsonb,
    $json${"kind":"provider_api","source":"DAPP_API"}$json$::jsonb,
    '06230264ca2c06cb076412adc42bc6cf69eb34f5d2ca640a16321aeeab6b9b24',
    TIMESTAMPTZ '2026-07-20 00:00:00+00',
    TIMESTAMPTZ '2026-07-20 00:00:00+00'
  ),
  (
    'forecast-participate',
    1,
    'task-template-catalog-v1',
    'active',
    'direct',
    'forecast',
    'DAPP_API',
    'ANY',
    90,
    45,
    180,
    false,
    true,
    'medium',
    $json$["en-US","zh-CN","zh-TW"]$json$::jsonb,
    $json${
      "en-US":{"description":"Join a seeded prediction or win-streak activity from Forecast metadata.","title":"Participate in Forecast"},
      "zh-CN":{"description":"基于 Forecast metadata 参与 seeded 预测或连胜任务。","title":"参与 Forecast 预测"},
      "zh-TW":{"description":"基于 Forecast metadata 参与 seeded 预测或连胜任务。","title":"参与 Forecast 预测"}
    }$json$::jsonb,
    $json${"en-US":"ready","zh-CN":"ai_draft","zh-TW":"missing"}$json$::jsonb,
    $json${"kind":"provider_api","source":"DAPP_API"}$json$::jsonb,
    'ee9e9b502937579115be2eff76e020ae46ffe1d001b378c2cdddaef9843cbd89',
    TIMESTAMPTZ '2026-07-20 00:00:00+00',
    TIMESTAMPTZ '2026-07-20 00:00:00+00'
  ),
  (
    'social-share',
    1,
    'task-template-catalog-v1',
    'active',
    'manual_review',
    'social',
    'SOCIAL',
    'ANY',
    180,
    0,
    180,
    false,
    true,
    'high',
    $json$["en-US","zh-CN","zh-TW"]$json$::jsonb,
    $json${
      "en-US":{"description":"Share an approved social post without making it the only high-value action.","title":"Share campaign post"},
      "zh-CN":{"description":"分享已审核动态，但不能作为唯一高价值任务。","title":"分享活动动态"},
      "zh-TW":{"description":"分享已审核动态，但不能作为唯一高价值任务。","title":"分享活动动态"}
    }$json$::jsonb,
    $json${"en-US":"ready","zh-CN":"ai_draft","zh-TW":"missing"}$json$::jsonb,
    $json${"kind":"manual_social_review","source":"MANUAL"}$json$::jsonb,
    '031c9374a5a2e0226a174522bc74db101e2cbf41292ffc16aa73ef3631b3def7',
    TIMESTAMPTZ '2026-07-20 00:00:00+00',
    TIMESTAMPTZ '2026-07-20 00:00:00+00'
  ),
  (
    'invite-friend',
    1,
    'task-template-catalog-v1',
    'active',
    'deferred',
    'invite',
    'MANUAL',
    'ANY',
    70,
    0,
    70,
    false,
    false,
    'high',
    $json$["en-US","zh-CN","zh-TW"]$json$::jsonb,
    $json${
      "en-US":{"description":"Invite a friend who completes required wallet and campaign tasks.","title":"Invite a qualified friend"},
      "zh-CN":{"description":"邀请完成钱包与活动必做任务的好友。","title":"邀请合格好友"},
      "zh-TW":{"description":"邀请完成钱包与活动必做任务的好友。","title":"邀请合格好友"}
    }$json$::jsonb,
    $json${"en-US":"ready","zh-CN":"fallback","zh-TW":"fallback"}$json$::jsonb,
    $json${"kind":"deferred_referral","reasonCode":"REFERRAL_RUNTIME_NOT_AVAILABLE","source":"MANUAL"}$json$::jsonb,
    '01a37be6ef94068fc0ca8c81e988e68c223821f996a98cd770e8a2879c2f3731',
    TIMESTAMPTZ '2026-07-20 00:00:00+00',
    TIMESTAMPTZ '2026-07-20 00:00:00+00'
  );

ALTER TABLE campaign_os.campaign_tasks
  ADD COLUMN template_version integer,
  ADD COLUMN template_checksum text,
  ADD COLUMN template_snapshot jsonb,
  ADD COLUMN template_adoption_idempotency_key text,
  ADD CONSTRAINT campaign_tasks_template_snapshot_all_or_none CHECK (
    (
      template_version IS NULL
      AND template_checksum IS NULL
      AND template_snapshot IS NULL
      AND template_adoption_idempotency_key IS NULL
    )
    OR (
      template_version IS NOT NULL
      AND template_checksum IS NOT NULL
      AND template_snapshot IS NOT NULL
      AND template_adoption_idempotency_key IS NOT NULL
    )
  ),
  ADD CONSTRAINT campaign_tasks_template_version_check CHECK (
    template_version IS NULL OR template_version BETWEEN 1 AND 2147483647
  ),
  ADD CONSTRAINT campaign_tasks_template_checksum_check CHECK (
    template_checksum IS NULL OR template_checksum ~ '^[a-f0-9]{64}$'
  ),
  ADD CONSTRAINT campaign_tasks_template_snapshot_check CHECK (
    template_snapshot IS NULL
    OR campaign_os.valid_task_template_snapshot(
      template_snapshot,
      template_code,
      template_version,
      template_checksum
    )
  ),
  ADD CONSTRAINT campaign_tasks_template_idempotency_check CHECK (
    template_adoption_idempotency_key IS NULL
    OR (
      octet_length(template_adoption_idempotency_key) BETWEEN 8 AND 128
      AND template_adoption_idempotency_key
        ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'
    )
  ),
  ADD CONSTRAINT campaign_tasks_template_catalog_fk
    FOREIGN KEY (template_code, template_version)
    REFERENCES campaign_os.task_template_catalog_versions (template_code, version)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT;

CREATE UNIQUE INDEX campaign_tasks_template_idempotency_key
  ON campaign_os.campaign_tasks (
    campaign_id,
    template_adoption_idempotency_key
  )
  WHERE template_adoption_idempotency_key IS NOT NULL;
