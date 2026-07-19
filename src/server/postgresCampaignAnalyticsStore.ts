import { randomUUID } from "node:crypto";
import {
  CampaignAnalyticsProjectionError,
  createCampaignAnalyticsSnapshot,
  type CampaignAnalyticsAggregateInput,
  type CampaignAnalyticsDimensionAggregate,
  type CampaignAnalyticsErrorCode,
  type CampaignAnalyticsReviewBreakdown,
  type CampaignAnalyticsSnapshot,
  type CampaignAnalyticsTaskAggregate,
} from "../domain/campaignAnalytics";
import {
  CampaignAnalyticsStoreError,
  type CampaignAnalyticsCloseContext,
  type CampaignAnalyticsReadContext,
  type CampaignAnalyticsReadInput,
  type CampaignAnalyticsReadStore,
  type CampaignAnalyticsStoreOperation,
} from "./campaignAnalyticsStore";
import { createCampaignAnalyticsReviewBreakdown } from "./campaignAnalyticsReviewProjection";

const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const LOCALE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]{0,34}$/;
const CANONICAL_COUNT_PATTERN = /^(0|[1-9]\d*)$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const RFC3339_MILLISECONDS_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;
const MAX_SAFE_INTEGER_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);
const DEFAULT_MAX_TASK_ROWS = 5_000;
const DEFAULT_DRAIN_TIMEOUT_MS = 10_000;
const MAX_DRAIN_TIMEOUT_MS = 10_000;

const REQUIRED_MIGRATION_IDS = Object.freeze([
  "0001_campaign_runtime",
  "0002_admin_review_export",
  "0003_admin_review_rank_projection",
  "0004_live_provider_task_verification",
  "0005_participant_wallet_authentication",
] as const);

const SOURCE_SCHEMA_VERSIONS = Object.freeze({
  admin_review: "0002_admin_review_export",
  campaign: "0001_campaign_runtime",
  participant: "0001_campaign_runtime",
  points_projection: "0001_campaign_runtime",
  referral_binding: "0001_campaign_runtime",
  task_completion_evidence: "0004_live_provider_task_verification",
} as const);

// Build M242's canonical JSON bytes in SQL so manifest equality and SHA-256 use one identity.
const sqlTextLiteral = (value: string): string => `'${value.replace(/'/g, "''")}'`;

const M242_SENSITIVE_VALUE_SQL_PATTERN = String.raw`(\mBearer\M[[:space:]]+[^[:space:]]+|\m(access[_-]?token|token|signature|proof|private[ _-]?key)[[:space:]]*[:=]|(postgres(ql)?|file)://|/Users/)`;
const ASTRAL_CHARACTER_PATTERN_SQL = String.raw`('[' || U&'\+010000' || '-' || U&'\+10FFFF' || ']')`;

const utf16LengthSql = (expression: string): string => `(
  2 * char_length(${expression})
  - char_length(regexp_replace(
    ${expression},
    ${ASTRAL_CHARACTER_PATTERN_SQL},
    '',
    'g'
  ))
)`;

const safeM242ArrayValueSql = (expression: string): string => `(
  ${utf16LengthSql(expression)} BETWEEN 1 AND 128
  AND ${expression} !~ '[[:cntrl:]]'
  AND ${expression} !~* ${sqlTextLiteral(M242_SENSITIVE_VALUE_SQL_PATTERN)}
)`;

const canonicalJsonStringSql = (expression: string): string => `to_json(${expression})::text`;

const canonicalNullableJsonStringSql = (expression: string): string =>
  `COALESCE(to_json(${expression})::text, 'null')`;

const canonicalJsonObjectSql = (
  entries: readonly (readonly [key: string, valueSql: string])[],
): string => {
  const sorted = [...entries].sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
  const fields = sorted.map(([key, valueSql]) =>
    `${sqlTextLiteral(`${JSON.stringify(key)}:`)} || (${valueSql})`);
  return `(${sqlTextLiteral("{")} || ${fields.join(` || ${sqlTextLiteral(",")} || `)} || ${sqlTextLiteral("}")})`;
};

const formatTimestampSql = (expression: string): string =>
  `to_char(${expression} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;

const CAMPAIGN_CANONICAL_JSON_SQL = canonicalJsonObjectSql([
  ["contractMode", canonicalJsonStringSql("campaign.contract_mode")],
  ["endTime", canonicalJsonStringSql(formatTimestampSql("campaign.end_time"))],
  ["id", canonicalJsonStringSql("campaign.id")],
  ["startTime", canonicalJsonStringSql(formatTimestampSql("campaign.start_time"))],
  ["status", canonicalJsonStringSql("campaign.status")],
  ["updatedAt", canonicalJsonStringSql(formatTimestampSql("campaign.updated_at"))],
  ["walletPolicy", canonicalJsonStringSql("campaign.wallet_policy")],
]);

const TASK_CANONICAL_JSON_SQL = canonicalJsonObjectSql([
  ["campaignId", canonicalJsonStringSql("task.campaign_id")],
  ["id", canonicalJsonStringSql("task.id")],
  ["points", "task.points::text"],
  ["required", "task.required::text"],
  ["updatedAt", canonicalJsonStringSql(formatTimestampSql("task.updated_at"))],
  ["verificationType", canonicalJsonStringSql("task.verification_type")],
  ["walletCompatibility", canonicalJsonStringSql("task.wallet_compatibility")],
]);

const COMPLETION_CANONICAL_JSON_SQL = canonicalJsonObjectSql([
  ["accountType", canonicalJsonStringSql("completion.account_type")],
  ["campaignId", canonicalJsonStringSql("completion.campaign_id")],
  ["completedAt", canonicalNullableJsonStringSql(formatTimestampSql("completion.completed_at"))],
  ["id", canonicalJsonStringSql("completion.id")],
  ["pointsAwarded", "completion.points_awarded::text"],
  ["status", canonicalJsonStringSql("completion.status")],
  ["taskId", canonicalJsonStringSql("completion.task_id")],
  ["updatedAt", canonicalJsonStringSql(formatTimestampSql("completion.updated_at"))],
  ["walletAddress", canonicalJsonStringSql("completion.wallet_address")],
  ["walletSource", canonicalJsonStringSql("completion.wallet_source")],
]);

const EVIDENCE_CANONICAL_JSON_SQL = canonicalJsonObjectSql([
  ["campaignId", canonicalJsonStringSql("evidence.campaign_id")],
  ["capturedAt", canonicalJsonStringSql(formatTimestampSql("evidence.captured_at"))],
  ["completionId", canonicalNullableJsonStringSql("evidence.completion_id")],
  ["diagnosticCodes", "diagnostic.canonical_json"],
  ["evidenceHash", canonicalJsonStringSql("evidence.evidence_hash")],
  ["evidenceRef", canonicalNullableJsonStringSql("evidence.evidence_ref")],
  ["evidenceSource", canonicalJsonStringSql("evidence.evidence_source")],
  ["id", canonicalJsonStringSql("evidence.id")],
  ["pointsAwarded", "evidence.points_awarded::text"],
  ["status", canonicalJsonStringSql("evidence.status")],
  ["taskId", canonicalJsonStringSql("evidence.task_id")],
  ["updatedAt", canonicalJsonStringSql(formatTimestampSql("evidence.updated_at"))],
  ["walletAddress", canonicalJsonStringSql("evidence.wallet_address")],
]);

const LIVE_EVIDENCE_CANONICAL_JSON_SQL = canonicalJsonObjectSql([
  ["campaignId", canonicalJsonStringSql("evidence.campaign_id")],
  ["capturedAt", canonicalJsonStringSql(formatTimestampSql("evidence.captured_at"))],
  ["completionId", canonicalNullableJsonStringSql("evidence.completion_id")],
  ["diagnosticCodes", "diagnostic.canonical_json"],
  ["evidenceHash", canonicalJsonStringSql("evidence.evidence_hash")],
  ["evidenceRef", canonicalNullableJsonStringSql("evidence.evidence_ref")],
  ["evidenceSource", canonicalJsonStringSql("evidence.evidence_source")],
  ["id", canonicalJsonStringSql("evidence.id")],
  ["liveProviderExecuted", "'true'"],
  ["pointsAwarded", "evidence.points_awarded::text"],
  ["status", canonicalJsonStringSql("evidence.status")],
  ["taskId", canonicalJsonStringSql("evidence.task_id")],
  ["updatedAt", canonicalJsonStringSql(formatTimestampSql("evidence.updated_at"))],
  ["verificationAttemptId", canonicalJsonStringSql("evidence.verification_attempt_id")],
  ["walletAddress", canonicalJsonStringSql("evidence.wallet_address")],
]);

const PARTICIPANT_CANONICAL_JSON_SQL = canonicalJsonObjectSql([
  ["accountType", canonicalJsonStringSql("participant.account_type")],
  ["campaignId", canonicalJsonStringSql("participant.campaign_id")],
  ["createdAt", canonicalJsonStringSql(formatTimestampSql("participant.created_at"))],
  ["diagnosticCodes", "derivation.diagnostic_codes_json"],
  ["eligible", "derivation.eligible::text"],
  ["id", canonicalJsonStringSql("participant.id")],
  ["missingTaskIds", "derivation.missing_task_ids_json"],
  ["rank", "participant.dynamic_rank::text"],
  ["riskFlags", "risk_flags.canonical_json"],
  ["totalPoints", "participant.total_points::text"],
  ["updatedAt", canonicalJsonStringSql(formatTimestampSql("participant.updated_at"))],
  ["walletAddress", canonicalJsonStringSql("participant.wallet_address")],
  ["walletSource", canonicalJsonStringSql("participant.wallet_source")],
  ["walletTypeVerified", "participant.wallet_type_verified::text"],
]);

const REVIEW_MANIFEST_CANONICAL_JSON_SQL = canonicalJsonObjectSql([
  ["campaign", "campaign_snapshot.canonical_json"],
  ["completions", "COALESCE(completion_manifest.canonical_json, '[]')"],
  ["evidence", "COALESCE(evidence_manifest.canonical_json, '[]')"],
  ["participant", "participant_snapshot.canonical_json"],
  ["tasks", "task_manifest.canonical_json"],
  ["version", canonicalJsonStringSql("'review-snapshot-v1'::text")],
]);

export const CAMPAIGN_ANALYTICS_QUERY_BUDGET = 6 as const;

export const CAMPAIGN_ANALYTICS_MIGRATION_SQL = `SELECT migration_id, checksum
FROM campaign_os.schema_migrations
ORDER BY migration_id COLLATE "C" ASC`;

export const CAMPAIGN_ANALYTICS_FACTS_SQL = `WITH /* campaign-analytics:facts */
scoped_participants AS (
  SELECT
    participant.account_type,
    participant.locale_preference,
    participant.risk_flags,
    participant.total_points
  FROM campaign_os.campaign_participants AS participant
  WHERE participant.campaign_id = $1
),
participant_totals AS (
  SELECT
    COUNT(*) AS participant_count,
    COUNT(*) FILTER (WHERE jsonb_array_length(participant.risk_flags) > 0) AS risk_flagged,
    COALESCE(SUM(participant.total_points), 0) AS participant_awarded,
    COUNT(*) FILTER (WHERE participant.total_points > 0) AS participants_with_points,
    COUNT(*) FILTER (WHERE participant.total_points = 0) AS participants_without_points,
    COUNT(*) FILTER (
      WHERE EXISTS (
        SELECT 1
        FROM jsonb_array_elements(participant.risk_flags) AS risk_flag(item)
        WHERE jsonb_typeof(risk_flag.item) IS DISTINCT FROM 'string'
          OR NOT ${safeM242ArrayValueSql("risk_flag.item #>> '{}'")}
      )
    ) AS source_corruption_count
  FROM campaign_os.campaign_participants AS participant
  WHERE participant.campaign_id = $1
),
account_type_counts AS (
  SELECT
    participant.account_type AS id,
    COUNT(*) AS dimension_count
  FROM campaign_os.campaign_participants AS participant
  WHERE participant.campaign_id = $1
  GROUP BY participant.account_type
),
account_type_dimensions AS (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('id', dimension.id, 'count', dimension.dimension_count::text)
      ORDER BY dimension.id COLLATE "C"
    ),
    '[]'::jsonb
  ) AS dimensions
  FROM account_type_counts AS dimension
),
locale_counts AS (
  SELECT
    participant.locale_preference AS id,
    COUNT(*) AS dimension_count
  FROM campaign_os.campaign_participants AS participant
  WHERE participant.campaign_id = $1
  GROUP BY participant.locale_preference
),
locale_dimensions AS (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('id', dimension.id, 'count', dimension.dimension_count::text)
      ORDER BY dimension.id COLLATE "C"
    ),
    '[]'::jsonb
  ) AS dimensions
  FROM locale_counts AS dimension
),
completion_points AS (
  SELECT COALESCE(SUM(completion.points_awarded), 0) AS completion_awarded
  FROM campaign_os.campaign_task_completions AS completion
  WHERE completion.campaign_id = $1
    AND completion.status = 'completed'
),
referral_totals AS (
  SELECT
    COUNT(*) AS referrals_total,
    COUNT(*) FILTER (
      WHERE referral.status = 'qualified'
        AND referral.qualified_action_completed = true
    ) AS referrals_qualified
  FROM campaign_os.campaign_referral_bindings AS referral
  WHERE referral.campaign_id = $1
)
SELECT
  campaign.id AS campaign_id,
  transaction_timestamp() AS as_of,
  campaign.supported_locales,
  participant_totals.participant_count,
  participant_totals.risk_flagged,
  account_type_dimensions.dimensions AS account_types,
  locale_dimensions.dimensions AS locales,
  completion_points.completion_awarded,
  participant_totals.participant_awarded,
  participant_totals.participants_with_points,
  participant_totals.participants_without_points,
  participant_totals.source_corruption_count,
  referral_totals.referrals_total,
  referral_totals.referrals_qualified
FROM campaign_os.campaigns AS campaign
CROSS JOIN participant_totals
CROSS JOIN account_type_dimensions
CROSS JOIN locale_dimensions
CROSS JOIN completion_points
CROSS JOIN referral_totals
WHERE campaign.id = $1`;

export const CAMPAIGN_ANALYTICS_TASKS_SQL = `WITH /* campaign-analytics:tasks */
scoped_tasks AS (
  SELECT task.id, task.template_code, task.required, task.revision, task.points
  FROM campaign_os.campaign_tasks AS task
  WHERE task.campaign_id = $1
  ORDER BY task.id COLLATE "C" ASC
  LIMIT 5001
),
scoped_completions AS (
  SELECT
    completion.id,
    completion.campaign_id,
    completion.task_id,
    completion.wallet_address,
    completion.status,
    completion.points_awarded
  FROM campaign_os.campaign_task_completions AS completion
  WHERE completion.campaign_id = $1
),
task_aggregates AS (
  SELECT
    task.id AS task_id,
    task.template_code,
    task.required,
    COUNT(DISTINCT completion.wallet_address) AS activity_participants,
    COUNT(DISTINCT completion.wallet_address) FILTER (
      WHERE completion.status = 'completed'
        AND EXISTS (
          SELECT 1
          FROM campaign_os.campaign_task_evidence AS evidence
          WHERE evidence.campaign_id = $1
            AND evidence.task_id = task.id
            AND evidence.wallet_address = completion.wallet_address
            AND evidence.completion_id = completion.id
            AND evidence.status = 'completed'
            AND evidence.points_awarded = completion.points_awarded
            AND completion.points_awarded = task.points
            AND (
              (
                evidence.live_provider_executed = false
                AND evidence.verification_attempt_id IS NULL
              )
              OR (
                evidence.live_provider_executed = true
                AND evidence.verification_attempt_id IS NOT NULL
                AND EXISTS (
                  SELECT 1
                  FROM campaign_os.verification_attempts AS attempt
                  WHERE attempt.campaign_id = $1
                    AND attempt.id = evidence.verification_attempt_id
                    AND attempt.task_id = task.id
                    AND attempt.task_revision = task.revision
                    AND attempt.wallet_address = completion.wallet_address
                    AND attempt.status = 'completed'
                    AND attempt.dispatch_state = 'result_observed'
                    AND attempt.evidence_hash = evidence.evidence_hash
                    AND attempt.finalization_digest IS NOT NULL
                )
              )
            )
        )
    ) AS verified_participants
  FROM scoped_tasks AS task
  LEFT JOIN scoped_completions AS completion
    ON completion.campaign_id = $1
    AND completion.task_id = task.id
  GROUP BY task.id, task.template_code, task.required, task.revision, task.points
),
task_payload AS (
  SELECT
    COUNT(*) AS task_count,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'task_id', task.task_id,
          'template_code', task.template_code,
          'required', task.required,
          'activity_participants', task.activity_participants::text,
          'verified_participants', task.verified_participants::text
        )
        ORDER BY task.task_id COLLATE "C"
      ),
      '[]'::jsonb
    ) AS tasks,
    COALESCE(SUM(task.verified_participants), 0) AS verified_count
  FROM task_aggregates AS task
),
completion_totals AS (
  SELECT
    COUNT(*) FILTER (WHERE completion.status = 'pending') AS pending_count,
    COUNT(*) FILTER (WHERE completion.status = 'completed') AS completed_count,
    COUNT(*) FILTER (WHERE completion.status = 'failed') AS failed_count,
    COUNT(*) FILTER (WHERE completion.status = 'manual_review') AS manual_review_count
  FROM campaign_os.campaign_task_completions AS completion
  WHERE completion.campaign_id = $1
)
SELECT
  task_payload.task_count,
  task_payload.tasks,
  completion_totals.pending_count,
  completion_totals.completed_count,
  completion_totals.failed_count,
  completion_totals.manual_review_count,
  task_payload.verified_count
FROM task_payload
CROSS JOIN completion_totals`;

export const CAMPAIGN_ANALYTICS_REVIEW_SQL = `WITH /* campaign-analytics:review */
ranked_participants AS (
  SELECT
    participant.*,
    ROW_NUMBER() OVER (
      ORDER BY
        participant.total_points DESC,
        participant.created_at ASC,
        participant.id COLLATE "C" ASC,
        participant.wallet_address COLLATE "C" ASC
    )::integer AS dynamic_rank
  FROM campaign_os.campaign_participants AS participant
  WHERE participant.campaign_id = $1
),
latest_decisions AS (
  SELECT decision.*
  FROM (
    SELECT
      persisted.*,
      ROW_NUMBER() OVER (
        PARTITION BY persisted.participant_id
        ORDER BY
          persisted.version DESC,
          persisted.decided_at DESC,
          persisted.id COLLATE "C" ASC
      ) AS decision_position
    FROM campaign_os.campaign_review_decisions AS persisted
    WHERE persisted.campaign_id = $1
  ) AS decision
  WHERE decision.decision_position = 1
),
reviewed_participants AS (
  SELECT participant.*
  FROM ranked_participants AS participant
  JOIN latest_decisions AS decision
    ON decision.campaign_id = $1
    AND decision.participant_id = participant.id
    AND decision.wallet_address = participant.wallet_address
  WHERE participant.campaign_id = $1
),
campaign_snapshot AS (
  SELECT ${CAMPAIGN_CANONICAL_JSON_SQL} AS canonical_json
  FROM campaign_os.campaigns AS campaign
  WHERE campaign.id = $1
),
task_snapshots AS (
  SELECT
    task.id AS task_id,
    ${TASK_CANONICAL_JSON_SQL} AS canonical_json
  FROM campaign_os.campaign_tasks AS task
  WHERE task.campaign_id = $1
),
task_manifest AS (
  SELECT COALESCE(
    '[' || string_agg(task.canonical_json, ',' ORDER BY task.task_id COLLATE "C") || ']',
    '[]'
  ) AS canonical_json
  FROM task_snapshots AS task
),
completion_snapshots AS (
  SELECT
    completion.id AS completion_id,
    completion.task_id,
    completion.wallet_address,
    ${COMPLETION_CANONICAL_JSON_SQL} AS canonical_json
  FROM campaign_os.campaign_task_completions AS completion
  JOIN reviewed_participants AS participant
    ON participant.campaign_id = $1
    AND participant.wallet_address = completion.wallet_address
  WHERE completion.campaign_id = $1
),
completion_manifests AS (
  SELECT
    completion.wallet_address,
    '[' || string_agg(
      completion.canonical_json,
      ',' ORDER BY completion.task_id COLLATE "C", completion.completion_id COLLATE "C"
    ) || ']' AS canonical_json
  FROM completion_snapshots AS completion
  GROUP BY completion.wallet_address
),
evidence_diagnostic_values AS (
  SELECT DISTINCT
    evidence.id AS evidence_id,
    diagnostic.item #>> '{}' AS value
  FROM campaign_os.campaign_task_evidence AS evidence
  JOIN reviewed_participants AS participant
    ON participant.campaign_id = $1
    AND participant.wallet_address = evidence.wallet_address
  CROSS JOIN LATERAL jsonb_array_elements(evidence.diagnostic_codes) AS diagnostic(item)
  WHERE evidence.campaign_id = $1
    AND jsonb_typeof(diagnostic.item) = 'string'
    AND ${safeM242ArrayValueSql("diagnostic.item #>> '{}'")}
),
evidence_diagnostic_corruption AS (
  SELECT
    evidence.id AS evidence_id,
    COUNT(*) FILTER (
      WHERE diagnostic.item IS NOT NULL
        AND (
          jsonb_typeof(diagnostic.item) IS DISTINCT FROM 'string'
          OR NOT ${safeM242ArrayValueSql("diagnostic.item #>> '{}'")}
        )
    ) AS source_corruption_count
  FROM campaign_os.campaign_task_evidence AS evidence
  JOIN reviewed_participants AS participant
    ON participant.campaign_id = $1
    AND participant.wallet_address = evidence.wallet_address
  LEFT JOIN LATERAL jsonb_array_elements(evidence.diagnostic_codes) AS diagnostic(item) ON true
  WHERE evidence.campaign_id = $1
  GROUP BY evidence.id
),
evidence_diagnostics AS (
  SELECT
    evidence.id AS evidence_id,
    COALESCE(
      '[' || string_agg(
        to_json(diagnostic.value)::text,
        ',' ORDER BY diagnostic.value COLLATE "C"
      ) || ']',
      '[]'
    ) AS canonical_json,
    corruption.source_corruption_count
  FROM campaign_os.campaign_task_evidence AS evidence
  JOIN reviewed_participants AS participant
    ON participant.campaign_id = $1
    AND participant.wallet_address = evidence.wallet_address
  JOIN evidence_diagnostic_corruption AS corruption
    ON corruption.evidence_id = evidence.id
  LEFT JOIN evidence_diagnostic_values AS diagnostic
    ON diagnostic.evidence_id = evidence.id
  WHERE evidence.campaign_id = $1
  GROUP BY evidence.id, corruption.source_corruption_count
),
evidence_snapshots AS (
  SELECT
    evidence.id AS evidence_id,
    evidence.task_id,
    evidence.wallet_address,
    CASE
      WHEN evidence.live_provider_executed THEN ${LIVE_EVIDENCE_CANONICAL_JSON_SQL}
      ELSE ${EVIDENCE_CANONICAL_JSON_SQL}
    END AS canonical_json,
    diagnostic.source_corruption_count + CASE
      WHEN evidence.live_provider_executed AND (
        evidence.verification_attempt_id IS NULL
        OR evidence.status <> 'completed'
        OR evidence.evidence_source IN ('MANUAL', 'SOCIAL_API')
      ) THEN 1
      WHEN NOT evidence.live_provider_executed
        AND evidence.verification_attempt_id IS NOT NULL THEN 1
      ELSE 0
    END AS source_corruption_count
  FROM campaign_os.campaign_task_evidence AS evidence
  JOIN reviewed_participants AS participant
    ON participant.campaign_id = $1
    AND participant.wallet_address = evidence.wallet_address
  JOIN evidence_diagnostics AS diagnostic
    ON diagnostic.evidence_id = evidence.id
  WHERE evidence.campaign_id = $1
),
evidence_manifests AS (
  SELECT
    evidence.wallet_address,
    '[' || string_agg(
      evidence.canonical_json,
      ',' ORDER BY evidence.task_id COLLATE "C", evidence.evidence_id COLLATE "C"
    ) || ']' AS canonical_json
  FROM evidence_snapshots AS evidence
  GROUP BY evidence.wallet_address
),
evidence_diagnostic_source_corruption AS (
  SELECT COUNT(*) FILTER (
    WHERE diagnostic.item IS NOT NULL
      AND (
        jsonb_typeof(diagnostic.item) IS DISTINCT FROM 'string'
        OR NOT ${safeM242ArrayValueSql("diagnostic.item #>> '{}'")}
      )
  ) AS corruption_count
  FROM campaign_os.campaign_task_evidence AS evidence
  LEFT JOIN LATERAL jsonb_array_elements(evidence.diagnostic_codes) AS diagnostic(item) ON true
  WHERE evidence.campaign_id = $1
),
evidence_lifecycle_source_corruption AS (
  SELECT COUNT(*) AS corruption_count
  FROM campaign_os.campaign_task_evidence AS evidence
  WHERE evidence.campaign_id = $1
    AND (
      (
        evidence.live_provider_executed
        AND (
          evidence.verification_attempt_id IS NULL
          OR evidence.status <> 'completed'
          OR evidence.evidence_source IN ('MANUAL', 'SOCIAL_API')
        )
      )
      OR (
        NOT evidence.live_provider_executed
        AND evidence.verification_attempt_id IS NOT NULL
      )
    )
),
participant_risk_flag_values AS (
  SELECT DISTINCT
    participant.id AS participant_id,
    risk_flag.item #>> '{}' AS value
  FROM reviewed_participants AS participant
  CROSS JOIN LATERAL jsonb_array_elements(participant.risk_flags) AS risk_flag(item)
  WHERE participant.campaign_id = $1
    AND jsonb_typeof(risk_flag.item) = 'string'
    AND ${safeM242ArrayValueSql("risk_flag.item #>> '{}'")}
),
participant_risk_flag_corruption AS (
  SELECT
    participant.id AS participant_id,
    COUNT(*) FILTER (
      WHERE risk_flag.item IS NOT NULL
        AND (
          jsonb_typeof(risk_flag.item) IS DISTINCT FROM 'string'
          OR NOT ${safeM242ArrayValueSql("risk_flag.item #>> '{}'")}
        )
    ) AS source_corruption_count
  FROM reviewed_participants AS participant
  LEFT JOIN LATERAL jsonb_array_elements(participant.risk_flags) AS risk_flag(item) ON true
  WHERE participant.campaign_id = $1
  GROUP BY participant.id
),
participant_risk_flags AS (
  SELECT
    participant.id AS participant_id,
    COALESCE(
      '[' || string_agg(
        to_json(risk_flag.value)::text,
        ',' ORDER BY risk_flag.value COLLATE "C"
      ) || ']',
      '[]'
    ) AS canonical_json,
    corruption.source_corruption_count
  FROM reviewed_participants AS participant
  JOIN participant_risk_flag_corruption AS corruption
    ON corruption.participant_id = participant.id
  LEFT JOIN participant_risk_flag_values AS risk_flag
    ON risk_flag.participant_id = participant.id
  WHERE participant.campaign_id = $1
  GROUP BY participant.id, corruption.source_corruption_count
),
participant_task_facts AS (
  SELECT
    participant.id AS participant_id,
    task.id AS task_id,
    task.required,
    task.points AS task_points,
    (
      participant.account_type IN ('AA', 'EOA')
      AND (
        campaign.wallet_policy = 'ANY'
        OR (campaign.wallet_policy = 'AA_ONLY' AND participant.account_type = 'AA')
        OR (campaign.wallet_policy = 'EOA_ONLY' AND participant.account_type = 'EOA')
      )
    ) AS campaign_wallet_compatible,
    (
      participant.account_type IN ('AA', 'EOA')
      AND (
        campaign.wallet_policy = 'ANY'
        OR (campaign.wallet_policy = 'AA_ONLY' AND participant.account_type = 'AA')
        OR (campaign.wallet_policy = 'EOA_ONLY' AND participant.account_type = 'EOA')
      )
      AND (
        task.wallet_compatibility = 'ANY'
        OR (task.wallet_compatibility = 'AA_ONLY' AND participant.account_type = 'AA')
        OR (task.wallet_compatibility = 'EOA_ONLY' AND participant.account_type = 'EOA')
      )
    ) AS task_wallet_compatible,
    completion.id AS completion_id,
    completion.status AS completion_status,
    completion.points_awarded AS completion_points,
    evidence.id AS evidence_id,
    evidence.status AS evidence_status,
    evidence.points_awarded AS evidence_points
  FROM reviewed_participants AS participant
  JOIN campaign_os.campaigns AS campaign
    ON campaign.id = $1
  JOIN campaign_os.campaign_tasks AS task
    ON task.campaign_id = $1
  LEFT JOIN campaign_os.campaign_task_completions AS completion
    ON completion.campaign_id = $1
    AND completion.task_id = task.id
    AND completion.wallet_address = participant.wallet_address
  LEFT JOIN campaign_os.campaign_task_evidence AS evidence
    ON evidence.campaign_id = $1
    AND evidence.task_id = task.id
    AND evidence.wallet_address = participant.wallet_address
  WHERE participant.campaign_id = $1
),
completion_point_totals AS (
  SELECT
    completion.wallet_address,
    COALESCE(
      SUM(completion.points_awarded) FILTER (WHERE completion.status = 'completed'),
      0
    ) AS completed_points
  FROM campaign_os.campaign_task_completions AS completion
  JOIN reviewed_participants AS participant
    ON participant.campaign_id = $1
    AND participant.wallet_address = completion.wallet_address
  WHERE completion.campaign_id = $1
  GROUP BY completion.wallet_address
),
participant_diagnostic_codes AS (
  SELECT participant.id AS participant_id, 'CAMPAIGN_WALLET_POLICY_INCOMPATIBLE' AS code
  FROM reviewed_participants AS participant
  JOIN campaign_os.campaigns AS campaign
    ON campaign.id = $1
  WHERE participant.campaign_id = $1
    AND NOT (
      participant.account_type IN ('AA', 'EOA')
      AND (
        campaign.wallet_policy = 'ANY'
        OR (campaign.wallet_policy = 'AA_ONLY' AND participant.account_type = 'AA')
        OR (campaign.wallet_policy = 'EOA_ONLY' AND participant.account_type = 'EOA')
      )
    )
  UNION
  SELECT fact.participant_id, 'TASK_WALLET_POLICY_INCOMPATIBLE'
  FROM participant_task_facts AS fact
  WHERE fact.task_wallet_compatible = false
    AND (fact.completion_id IS NOT NULL OR fact.evidence_id IS NOT NULL)
  UNION
  SELECT fact.participant_id, 'EVIDENCE_WITHOUT_COMPLETION'
  FROM participant_task_facts AS fact
  WHERE fact.task_wallet_compatible = true
    AND fact.completion_id IS NULL
    AND fact.evidence_id IS NOT NULL
  UNION
  SELECT fact.participant_id, 'COMPLETION_WITHOUT_EVIDENCE'
  FROM participant_task_facts AS fact
  WHERE fact.task_wallet_compatible = true
    AND fact.completion_id IS NOT NULL
    AND fact.evidence_id IS NULL
  UNION
  SELECT fact.participant_id, 'TASK_EVIDENCE_FACT_MISMATCH'
  FROM participant_task_facts AS fact
  WHERE fact.task_wallet_compatible = true
    AND fact.completion_id IS NOT NULL
    AND fact.evidence_id IS NOT NULL
    AND (
      fact.completion_status IS DISTINCT FROM fact.evidence_status
      OR fact.completion_points IS DISTINCT FROM fact.evidence_points
      OR fact.completion_points IS DISTINCT FROM (
        CASE WHEN fact.completion_status = 'completed' THEN fact.task_points ELSE 0 END
      )
    )
  UNION
  SELECT participant.id, 'COMPLETION_POINTS_TOTAL_MISMATCH'
  FROM reviewed_participants AS participant
  LEFT JOIN completion_point_totals AS completion
    ON completion.wallet_address = participant.wallet_address
  WHERE participant.campaign_id = $1
    AND COALESCE(completion.completed_points, 0) <> participant.total_points
),
participant_missing_tasks AS (
  SELECT
    fact.participant_id,
    COALESCE(
      '[' || string_agg(
        to_json(fact.task_id)::text,
        ',' ORDER BY fact.task_id COLLATE "C"
      ) FILTER (
        WHERE fact.required = true
          AND NOT (
            fact.task_wallet_compatible = true
            AND fact.completion_id IS NOT NULL
            AND fact.evidence_id IS NOT NULL
            AND fact.completion_status = 'completed'
            AND fact.completion_status = fact.evidence_status
            AND fact.completion_points = fact.evidence_points
            AND fact.completion_points = fact.task_points
          )
      ) || ']',
      '[]'
    ) AS canonical_json,
    COUNT(*) FILTER (
      WHERE fact.required = true
        AND NOT (
          fact.task_wallet_compatible = true
          AND fact.completion_id IS NOT NULL
          AND fact.evidence_id IS NOT NULL
          AND fact.completion_status = 'completed'
          AND fact.completion_status = fact.evidence_status
          AND fact.completion_points = fact.evidence_points
          AND fact.completion_points = fact.task_points
        )
    ) AS missing_count
  FROM participant_task_facts AS fact
  GROUP BY fact.participant_id
),
participant_diagnostic_manifests AS (
  SELECT
    diagnostic.participant_id,
    '[' || string_agg(
      to_json(diagnostic.code)::text,
      ',' ORDER BY diagnostic.code COLLATE "C"
    ) || ']' AS canonical_json,
    COUNT(*) AS diagnostic_count
  FROM participant_diagnostic_codes AS diagnostic
  GROUP BY diagnostic.participant_id
),
participant_review_derivation AS (
  SELECT
    participant.id AS participant_id,
    COALESCE(missing.canonical_json, '[]') AS missing_task_ids_json,
    COALESCE(diagnostic.canonical_json, '[]') AS diagnostic_codes_json,
    COALESCE(missing.missing_count, 0) = 0
      AND COALESCE(diagnostic.diagnostic_count, 0) = 0 AS eligible
  FROM reviewed_participants AS participant
  LEFT JOIN participant_missing_tasks AS missing
    ON missing.participant_id = participant.id
  LEFT JOIN participant_diagnostic_manifests AS diagnostic
    ON diagnostic.participant_id = participant.id
  WHERE participant.campaign_id = $1
),
participant_snapshots AS (
  SELECT
    participant.id AS participant_id,
    participant.wallet_address,
    ${PARTICIPANT_CANONICAL_JSON_SQL} AS canonical_json
  FROM reviewed_participants AS participant
  JOIN participant_review_derivation AS derivation
    ON derivation.participant_id = participant.id
  JOIN participant_risk_flags AS risk_flags
    ON risk_flags.participant_id = participant.id
  WHERE participant.campaign_id = $1
),
current_snapshots AS (
  SELECT
    participant_snapshot.participant_id,
    participant_snapshot.wallet_address,
    ${REVIEW_MANIFEST_CANONICAL_JSON_SQL} AS canonical_json
  FROM participant_snapshots AS participant_snapshot
  CROSS JOIN campaign_snapshot
  CROSS JOIN task_manifest
  LEFT JOIN completion_manifests AS completion_manifest
    ON completion_manifest.wallet_address = participant_snapshot.wallet_address
  LEFT JOIN evidence_manifests AS evidence_manifest
    ON evidence_manifest.wallet_address = participant_snapshot.wallet_address
),
manifest_checks AS (
  SELECT
    participant.id AS participant_id,
    decision.decision,
    decision.id AS decision_id,
    CASE
      WHEN decision.id IS NULL THEN true
      WHEN decision.snapshot_version IS DISTINCT FROM 'review-snapshot-v1'
        OR decision.snapshot_fingerprint !~ '^[a-f0-9]{64}$'
        OR jsonb_typeof(decision.snapshot_manifest) IS DISTINCT FROM 'object'
        OR decision.snapshot_manifest ->> 'version' IS DISTINCT FROM 'review-snapshot-v1'
        OR jsonb_typeof(decision.snapshot_manifest -> 'campaign') IS DISTINCT FROM 'object'
        OR jsonb_typeof(decision.snapshot_manifest -> 'participant') IS DISTINCT FROM 'object'
        OR jsonb_typeof(decision.snapshot_manifest -> 'tasks') IS DISTINCT FROM 'array'
        OR jsonb_typeof(decision.snapshot_manifest -> 'completions') IS DISTINCT FROM 'array'
        OR jsonb_typeof(decision.snapshot_manifest -> 'evidence') IS DISTINCT FROM 'array'
      THEN false
      ELSE true
    END AS manifest_valid,
    CASE
      WHEN decision.id IS NULL THEN false
      WHEN decision.snapshot_version IS DISTINCT FROM 'review-snapshot-v1'
        OR decision.snapshot_fingerprint !~ '^[a-f0-9]{64}$'
        OR jsonb_typeof(decision.snapshot_manifest) IS DISTINCT FROM 'object'
        OR decision.snapshot_manifest ->> 'version' IS DISTINCT FROM 'review-snapshot-v1'
        OR jsonb_typeof(decision.snapshot_manifest -> 'campaign') IS DISTINCT FROM 'object'
        OR jsonb_typeof(decision.snapshot_manifest -> 'participant') IS DISTINCT FROM 'object'
        OR jsonb_typeof(decision.snapshot_manifest -> 'tasks') IS DISTINCT FROM 'array'
        OR jsonb_typeof(decision.snapshot_manifest -> 'completions') IS DISTINCT FROM 'array'
        OR jsonb_typeof(decision.snapshot_manifest -> 'evidence') IS DISTINCT FROM 'array'
      THEN false
      ELSE COALESCE(
        decision.snapshot_manifest = current_snapshot.canonical_json::jsonb
        AND decision.snapshot_fingerprint = encode(
          sha256(convert_to(current_snapshot.canonical_json, 'UTF8')),
          'hex'
        ),
        false
      )
    END AS manifest_current
  FROM ranked_participants AS participant
  LEFT JOIN latest_decisions AS decision
    ON decision.campaign_id = $1
    AND decision.participant_id = participant.id
    AND decision.wallet_address = participant.wallet_address
  LEFT JOIN current_snapshots AS current_snapshot
    ON current_snapshot.participant_id = participant.id
    AND current_snapshot.wallet_address = participant.wallet_address
  WHERE participant.campaign_id = $1
),
classified_reviews AS (
  SELECT
    CASE
      WHEN review.decision_id IS NULL THEN 'unreviewed'
      WHEN review.manifest_valid = false THEN 'invalid'
      WHEN review.manifest_current = false THEN 'stale'
      WHEN review.decision = 'approved' THEN 'approved'
      WHEN review.decision = 'rejected' THEN 'rejected'
      WHEN review.decision = 'needs_review' THEN 'needs_review'
      ELSE 'invalid'
    END AS review_state
  FROM manifest_checks AS review
),
completion_source_corruption AS (
  SELECT COUNT(*) AS corruption_count
  FROM campaign_os.campaign_task_completions AS completion
  LEFT JOIN ranked_participants AS participant
    ON participant.campaign_id = $1
    AND participant.wallet_address = completion.wallet_address
  WHERE completion.campaign_id = $1
    AND (
      participant.id IS NULL
      OR participant.account_type IS DISTINCT FROM completion.account_type
      OR participant.wallet_source IS DISTINCT FROM completion.wallet_source
    )
),
evidence_source_corruption AS (
  SELECT COUNT(*) AS corruption_count
  FROM campaign_os.campaign_task_evidence AS evidence
  LEFT JOIN ranked_participants AS participant
    ON participant.campaign_id = $1
    AND participant.wallet_address = evidence.wallet_address
  WHERE evidence.campaign_id = $1
    AND participant.id IS NULL
),
source_integrity AS (
  SELECT
    COALESCE((SELECT SUM(risk.source_corruption_count) FROM participant_risk_flags AS risk), 0)
    + (SELECT corruption_count FROM evidence_diagnostic_source_corruption)
    + (SELECT corruption_count FROM evidence_lifecycle_source_corruption)
    + (SELECT corruption_count FROM completion_source_corruption)
    + (SELECT corruption_count FROM evidence_source_corruption) AS source_corruption_count
),
review_counts AS (
  SELECT
    COUNT(*) FILTER (WHERE review.review_state = 'approved') AS approved_count,
    COUNT(*) FILTER (WHERE review.review_state = 'rejected') AS rejected_count,
    COUNT(*) FILTER (WHERE review.review_state = 'needs_review') AS needs_review_count,
    COUNT(*) FILTER (WHERE review.review_state = 'stale') AS stale_count,
    COUNT(*) FILTER (WHERE review.review_state = 'invalid') AS invalid_count,
    COUNT(*) FILTER (WHERE review.review_state = 'unreviewed') AS unreviewed_count,
    COUNT(*) AS total_participants
  FROM classified_reviews AS review
)
SELECT
  review.approved_count,
  review.rejected_count,
  review.needs_review_count,
  review.stale_count,
  review.invalid_count,
  review.unreviewed_count,
  review.total_participants,
  source_integrity.source_corruption_count
FROM review_counts AS review
CROSS JOIN source_integrity`;

export interface PostgresCampaignAnalyticsQueryResult {
  readonly rows: Array<Record<string, unknown>>;
}

export interface PostgresCampaignAnalyticsClient {
  query(
    text: string,
    values?: readonly unknown[],
  ): Promise<PostgresCampaignAnalyticsQueryResult>;
  release(destroy?: boolean): void;
}

export interface PostgresCampaignAnalyticsPool {
  connect(): Promise<PostgresCampaignAnalyticsClient>;
  end(): Promise<void>;
}

export interface CreatePostgresCampaignAnalyticsStoreOptions {
  readonly drainTimeoutMs?: number;
  readonly expectedMigrations: readonly CampaignAnalyticsExpectedMigration[];
  readonly maxTaskRows?: number;
  readonly ownsPool?: boolean;
  readonly pool: PostgresCampaignAnalyticsPool;
}

export interface CampaignAnalyticsExpectedMigration {
  readonly checksum: string;
  readonly id: string;
}

class AnalyticsRowError extends Error {
  constructor(
    readonly code: Extract<
      CampaignAnalyticsErrorCode,
      | "CAMPAIGN_ANALYTICS_BOUND_EXCEEDED"
      | "CAMPAIGN_ANALYTICS_INTEGRITY_FAILED"
      | "CAMPAIGN_ANALYTICS_ROW_CORRUPTION"
    >,
  ) {
    super(code);
    this.name = "AnalyticsRowError";
  }
}

type DbRow = Record<string, unknown>;

const rowError = (
  code: AnalyticsRowError["code"] = "CAMPAIGN_ANALYTICS_ROW_CORRUPTION",
): never => {
  throw new AnalyticsRowError(code);
};

const isPlainRecord = (value: unknown): value is DbRow => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const assertExactKeys = (
  value: unknown,
  allowedKeys: readonly string[],
): DbRow => {
  if (!isPlainRecord(value)) {
    return rowError();
  }
  const allowed = new Set(allowedKeys);
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    return rowError();
  }
  return value;
};

const readField = (row: DbRow, field: string): unknown =>
  Object.prototype.hasOwnProperty.call(row, field) ? row[field] : rowError();

const decodeCountValue = (value: unknown): number => {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value >= 0 ? value : rowError();
  }
  if (typeof value !== "string" || !CANONICAL_COUNT_PATTERN.test(value)) {
    return rowError();
  }

  const parsed = BigInt(value);
  return parsed <= MAX_SAFE_INTEGER_BIGINT ? Number(parsed) : rowError();
};

const decodeCount = (row: DbRow, field: string): number =>
  decodeCountValue(readField(row, field));

const decodeIdentifierValue = (value: unknown): string =>
  typeof value === "string" && IDENTIFIER_PATTERN.test(value) ? value : rowError();

const decodeIdentifier = (row: DbRow, field: string): string =>
  decodeIdentifierValue(readField(row, field));

const decodeTimestamp = (row: DbRow, field: string): string => {
  const value = readField(row, field);
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.toISOString() : rowError();
  }
  if (typeof value !== "string" || !RFC3339_MILLISECONDS_PATTERN.test(value)) {
    return rowError();
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : rowError();
};

const decodeBoolean = (row: DbRow, field: string): boolean => {
  const value = readField(row, field);
  return typeof value === "boolean" ? value : rowError();
};

const decodeDimensions = (
  value: unknown,
  allowedIds: readonly string[] | undefined,
  maximum: number,
): readonly CampaignAnalyticsDimensionAggregate[] => {
  if (!Array.isArray(value) || value.length > maximum) {
    return rowError(value instanceof Array
      ? "CAMPAIGN_ANALYTICS_BOUND_EXCEEDED"
      : "CAMPAIGN_ANALYTICS_ROW_CORRUPTION");
  }
  const seen = new Set<string>();
  return value.map((item) => {
    const row = assertExactKeys(item, ["count", "id"]);
    const id = decodeIdentifier(row, "id");
    if (seen.has(id) || (allowedIds && !allowedIds.includes(id))) {
      return rowError("CAMPAIGN_ANALYTICS_INTEGRITY_FAILED");
    }
    seen.add(id);
    return { count: decodeCount(row, "count"), id };
  });
};

const decodeSupportedLocales = (value: unknown): readonly string[] => {
  if (!Array.isArray(value) || value.length < 1 || value.length > 9) {
    return rowError();
  }
  const locales = value.map((locale) =>
    typeof locale === "string" && LOCALE_PATTERN.test(locale) ? locale : rowError());
  if (new Set(locales).size !== locales.length) {
    return rowError("CAMPAIGN_ANALYTICS_INTEGRITY_FAILED");
  }
  return locales;
};

const decodeFacts = (value: unknown) => {
  const row = assertExactKeys(value, [
    "account_types",
    "as_of",
    "campaign_id",
    "completion_awarded",
    "locales",
    "participant_awarded",
    "participant_count",
    "participants_with_points",
    "participants_without_points",
    "referrals_qualified",
    "referrals_total",
    "risk_flagged",
    "source_corruption_count",
    "supported_locales",
  ]);
  if (decodeCount(row, "source_corruption_count") !== 0) {
    return rowError("CAMPAIGN_ANALYTICS_ROW_CORRUPTION");
  }
  const supportedLocales = decodeSupportedLocales(readField(row, "supported_locales"));
  const participants = {
    accountTypes: decodeDimensions(readField(row, "account_types"), ["AA", "EOA", "UNKNOWN"], 3),
    locales: decodeDimensions(readField(row, "locales"), supportedLocales, 9),
    riskFlagged: decodeCount(row, "risk_flagged"),
    unique: decodeCount(row, "participant_count"),
  };
  const accountTotal = participants.accountTypes.reduce((sum, item) => sum + item.count, 0);
  const localeTotal = participants.locales.reduce((sum, item) => sum + item.count, 0);
  if (accountTotal !== participants.unique || localeTotal !== participants.unique) {
    return rowError("CAMPAIGN_ANALYTICS_INTEGRITY_FAILED");
  }

  return {
    asOf: decodeTimestamp(row, "as_of"),
    campaignId: decodeIdentifier(row, "campaign_id"),
    completionAwarded: decodeCount(row, "completion_awarded"),
    participantAwarded: decodeCount(row, "participant_awarded"),
    participants,
    participantsWithPoints: decodeCount(row, "participants_with_points"),
    participantsWithoutPoints: decodeCount(row, "participants_without_points"),
    referralsQualified: decodeCount(row, "referrals_qualified"),
    referralsTotal: decodeCount(row, "referrals_total"),
    supportedLocales,
  };
};

const decodeTasks = (
  value: unknown,
  maxTaskRows: number,
): {
  readonly completions: CampaignAnalyticsAggregateInput["completions"];
  readonly tasks: readonly CampaignAnalyticsTaskAggregate[];
} => {
  const row = assertExactKeys(value, [
    "completed_count",
    "failed_count",
    "manual_review_count",
    "pending_count",
    "task_count",
    "tasks",
    "verified_count",
  ]);
  const taskCount = decodeCount(row, "task_count");
  const taskRows = readField(row, "tasks");
  if (taskCount > maxTaskRows || !Array.isArray(taskRows) || taskRows.length > maxTaskRows) {
    return rowError("CAMPAIGN_ANALYTICS_BOUND_EXCEEDED");
  }
  if (taskRows.length !== taskCount) {
    return rowError("CAMPAIGN_ANALYTICS_INTEGRITY_FAILED");
  }
  const seen = new Set<string>();
  const tasks = taskRows.map((item): CampaignAnalyticsTaskAggregate => {
    const task = assertExactKeys(item, [
      "activity_participants",
      "required",
      "task_id",
      "template_code",
      "verified_participants",
    ]);
    const taskId = decodeIdentifier(task, "task_id");
    if (seen.has(taskId)) {
      return rowError("CAMPAIGN_ANALYTICS_INTEGRITY_FAILED");
    }
    seen.add(taskId);
    return {
      activityParticipants: decodeCount(task, "activity_participants"),
      required: decodeBoolean(task, "required"),
      taskId,
      templateCode: decodeIdentifier(task, "template_code"),
      verifiedParticipants: decodeCount(task, "verified_participants"),
    };
  });

  return {
    completions: {
      completed: decodeCount(row, "completed_count"),
      failed: decodeCount(row, "failed_count"),
      manualReview: decodeCount(row, "manual_review_count"),
      pending: decodeCount(row, "pending_count"),
      verified: decodeCount(row, "verified_count"),
    },
    tasks,
  };
};

const decodeReview = (value: unknown): CampaignAnalyticsReviewBreakdown => {
  const row = assertExactKeys(value, [
    "approved_count",
    "invalid_count",
    "needs_review_count",
    "rejected_count",
    "source_corruption_count",
    "stale_count",
    "total_participants",
    "unreviewed_count",
  ]);
  if (decodeCount(row, "source_corruption_count") !== 0) {
    return rowError("CAMPAIGN_ANALYTICS_ROW_CORRUPTION");
  }
  const counts = {
    approved: decodeCount(row, "approved_count"),
    invalid: decodeCount(row, "invalid_count"),
    needsReview: decodeCount(row, "needs_review_count"),
    rejected: decodeCount(row, "rejected_count"),
    stale: decodeCount(row, "stale_count"),
    unreviewed: decodeCount(row, "unreviewed_count"),
  };
  const totalParticipants = decodeCount(row, "total_participants");
  const bucketTotal = Object.values(counts).reduce((sum, count) => sum + count, 0);
  if (!Number.isSafeInteger(bucketTotal) || bucketTotal !== totalParticipants) {
    return rowError("CAMPAIGN_ANALYTICS_INTEGRITY_FAILED");
  }
  return createCampaignAnalyticsReviewBreakdown(counts, totalParticipants);
};

const singleRow = (result: PostgresCampaignAnalyticsQueryResult): unknown => {
  if (!result || !Array.isArray(result.rows) || result.rows.length !== 1) {
    return rowError();
  }
  return result.rows[0];
};

const validateExpectedMigrations = (
  value: unknown,
): readonly CampaignAnalyticsExpectedMigration[] => {
  if (!Array.isArray(value) || value.length !== REQUIRED_MIGRATION_IDS.length) {
    throw argumentError("read_snapshot");
  }
  const normalized = value.map((candidate) => {
    if (!isPlainRecord(candidate)) {
      throw argumentError("read_snapshot");
    }
    const { checksum, id } = candidate;
    if (
      typeof id !== "string"
      || typeof checksum !== "string"
      || !SHA256_PATTERN.test(checksum)
    ) {
      throw argumentError("read_snapshot");
    }
    return Object.freeze({ checksum, id });
  }).sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);

  if (normalized.some((migration, index) => migration.id !== REQUIRED_MIGRATION_IDS[index])) {
    throw argumentError("read_snapshot");
  }
  return Object.freeze(normalized);
};

const decodeMigrationLedger = (
  result: PostgresCampaignAnalyticsQueryResult,
  expectedMigrations: readonly CampaignAnalyticsExpectedMigration[],
  traceId: string,
): void => {
  if (!result || !Array.isArray(result.rows)) {
    return rowError();
  }
  if (result.rows.length !== expectedMigrations.length) {
    throw new CampaignAnalyticsStoreError({
      code: "CAMPAIGN_ANALYTICS_SCHEMA_NOT_READY",
      operation: "read_snapshot",
      traceId,
    });
  }

  result.rows.forEach((value, index) => {
    const row = assertExactKeys(value, ["checksum", "migration_id"]);
    const migrationId = decodeIdentifier(row, "migration_id");
    const checksum = readField(row, "checksum");
    if (typeof checksum !== "string" || !SHA256_PATTERN.test(checksum)) {
      return rowError();
    }
    const expected = expectedMigrations[index];
    if (migrationId !== expected?.id || checksum !== expected.checksum) {
      throw new CampaignAnalyticsStoreError({
        code: "CAMPAIGN_ANALYTICS_SCHEMA_NOT_READY",
        operation: "read_snapshot",
        traceId,
      });
    }
  });
};

const isDriverError = (error: unknown): error is { readonly code: string } =>
  typeof error === "object"
  && error !== null
  && "code" in error
  && typeof (error as { readonly code?: unknown }).code === "string";

const normalizeFailure = (
  error: unknown,
  operation: CampaignAnalyticsStoreOperation,
  traceId: string,
): CampaignAnalyticsStoreError => {
  if (error instanceof CampaignAnalyticsStoreError) {
    return error;
  }
  if (error instanceof CampaignAnalyticsProjectionError) {
    return new CampaignAnalyticsStoreError({
      code: error.code,
      operation,
      retryable: error.retryable,
      traceId,
    });
  }
  if (error instanceof AnalyticsRowError) {
    return new CampaignAnalyticsStoreError({ code: error.code, operation, traceId });
  }
  if (isDriverError(error)) {
    if (["3F000", "42703", "42883", "42P01"].includes(error.code)) {
      return new CampaignAnalyticsStoreError({
        code: "CAMPAIGN_ANALYTICS_SCHEMA_NOT_READY",
        operation,
        traceId,
      });
    }
    if (error.code === "57014") {
      return new CampaignAnalyticsStoreError({
        code: "CAMPAIGN_ANALYTICS_TIMEOUT",
        operation,
        retryable: true,
        traceId,
      });
    }
  }
  return new CampaignAnalyticsStoreError({
    code: "CAMPAIGN_ANALYTICS_UNAVAILABLE",
    operation,
    retryable: true,
    traceId,
  });
};

const argumentError = (
  operation: CampaignAnalyticsStoreOperation,
  traceId = "trace-invalid",
): CampaignAnalyticsStoreError => new CampaignAnalyticsStoreError({
  code: "CAMPAIGN_ANALYTICS_ARGUMENT_INVALID",
  operation,
  traceId,
});

const validateReadRequest = (
  input: CampaignAnalyticsReadInput,
  context: CampaignAnalyticsReadContext,
) => {
  let normalizedInput: DbRow;
  let normalizedContext: DbRow;
  try {
    normalizedInput = assertExactKeys(input, ["campaignId"]);
    normalizedContext = assertExactKeys(context, ["signal", "traceId"]);
  } catch {
    throw argumentError("read_snapshot");
  }
  const campaignId = normalizedInput.campaignId;
  const traceId = normalizedContext.traceId;
  if (
    typeof campaignId !== "string"
    || !IDENTIFIER_PATTERN.test(campaignId)
    || typeof traceId !== "string"
    || !IDENTIFIER_PATTERN.test(traceId)
  ) {
    throw argumentError("read_snapshot");
  }
  const signal = normalizedContext.signal;
  if (signal !== undefined && (
    typeof signal !== "object"
    || signal === null
    || typeof (signal as AbortSignal).aborted !== "boolean"
    || typeof (signal as AbortSignal).addEventListener !== "function"
    || typeof (signal as AbortSignal).removeEventListener !== "function"
  )) {
    throw argumentError("read_snapshot", traceId);
  }
  return { campaignId, signal: signal as AbortSignal | undefined, traceId };
};

const assertNotAborted = (
  signal: AbortSignal | undefined,
  traceId: string,
): void => {
  if (signal?.aborted) {
    throw new CampaignAnalyticsStoreError({
      code: "CAMPAIGN_ANALYTICS_TIMEOUT",
      operation: "read_snapshot",
      retryable: true,
      traceId,
    });
  }
};

const validatePositiveInteger = (
  value: number | undefined,
  fallback: number,
  maximum: number,
  operation: CampaignAnalyticsStoreOperation,
): number => {
  const result = value ?? fallback;
  if (!Number.isSafeInteger(result) || result < 1 || result > maximum) {
    throw argumentError(operation);
  }
  return result;
};

export const createPostgresCampaignAnalyticsStore = (
  options: CreatePostgresCampaignAnalyticsStoreOptions,
): CampaignAnalyticsReadStore => {
  let normalizedOptions: DbRow;
  try {
    normalizedOptions = assertExactKeys(options, [
      "drainTimeoutMs",
      "expectedMigrations",
      "maxTaskRows",
      "ownsPool",
      "pool",
    ]);
  } catch {
    throw argumentError("read_snapshot");
  }
  const pool = normalizedOptions.pool as PostgresCampaignAnalyticsPool;
  if (
    !pool
    || typeof pool.connect !== "function"
    || typeof pool.end !== "function"
    || (normalizedOptions.ownsPool !== undefined && typeof normalizedOptions.ownsPool !== "boolean")
  ) {
    throw argumentError("read_snapshot");
  }
  const ownsPool = (normalizedOptions.ownsPool as boolean | undefined) ?? true;
  const expectedMigrations = validateExpectedMigrations(normalizedOptions.expectedMigrations);
  const maxTaskRows = validatePositiveInteger(
    normalizedOptions.maxTaskRows as number | undefined,
    DEFAULT_MAX_TASK_ROWS,
    DEFAULT_MAX_TASK_ROWS,
    "read_snapshot",
  );
  const drainTimeoutMs = validatePositiveInteger(
    normalizedOptions.drainTimeoutMs as number | undefined,
    DEFAULT_DRAIN_TIMEOUT_MS,
    MAX_DRAIN_TIMEOUT_MS,
    "close",
  );
  let state: "closed" | "closing" | "open" = "open";
  let activeReads = 0;
  let backgroundCleanupFailed = false;
  let closePromise: Promise<void> | undefined;
  const drainWaiters = new Set<() => void>();
  const activeReadCancels = new Set<() => void>();
  const pendingConnectCleanups = new Set<Promise<void>>();

  const isDrained = (): boolean => activeReads === 0 && pendingConnectCleanups.size === 0;

  const notifyDrained = (): void => {
    if (!isDrained()) {
      return;
    }
    for (const resolve of drainWaiters) {
      resolve();
    }
    drainWaiters.clear();
  };

  const ensureOpen = (traceId: string): void => {
    if (state !== "open") {
      throw new CampaignAnalyticsStoreError({
        code: "CAMPAIGN_ANALYTICS_CLOSED",
        operation: "read_snapshot",
        traceId,
      });
    }
  };

  const timeoutError = (traceId: string): CampaignAnalyticsStoreError =>
    new CampaignAnalyticsStoreError({
      code: "CAMPAIGN_ANALYTICS_TIMEOUT",
      operation: "read_snapshot",
      retryable: true,
      traceId,
    });

  const cleanupError = (
    operation: CampaignAnalyticsStoreOperation,
    traceId: string,
  ): CampaignAnalyticsStoreError => new CampaignAnalyticsStoreError({
    code: "CAMPAIGN_ANALYTICS_CLEANUP_FAILED",
    operation,
    traceId,
  });

  const trackPendingConnectCleanup = (cleanup: Promise<void>): void => {
    pendingConnectCleanups.add(cleanup);
    void cleanup.finally(() => {
      pendingConnectCleanups.delete(cleanup);
      notifyDrained();
    });
  };

  const connect = (
    signal: AbortSignal | undefined,
    traceId: string,
  ): Promise<PostgresCampaignAnalyticsClient> => {
    assertNotAborted(signal, traceId);
    const connection = pool.connect();
    if (!signal) {
      return connection;
    }

    return new Promise<PostgresCampaignAnalyticsClient>((resolve, reject) => {
      let settled = false;
      const onAbort = () => {
        if (settled) {
          return;
        }
        settled = true;
        signal.removeEventListener("abort", onAbort);
        const cleanup = connection.then(
          (client) => {
            try {
              client.release(true);
            } catch {
              backgroundCleanupFailed = true;
            }
          },
          () => undefined,
        );
        trackPendingConnectCleanup(cleanup);
        reject(timeoutError(traceId));
      };
      signal.addEventListener("abort", onAbort, { once: true });
      if (signal.aborted) {
        onAbort();
        return;
      }
      void connection.then(
        (client) => {
          if (settled) {
            return;
          }
          settled = true;
          signal.removeEventListener("abort", onAbort);
          resolve(client);
        },
        (error) => {
          if (settled) {
            return;
          }
          settled = true;
          signal.removeEventListener("abort", onAbort);
          reject(error);
        },
      );
    });
  };

  const executeRead = async (
    campaignId: string,
    signal: AbortSignal | undefined,
    traceId: string,
  ): Promise<CampaignAnalyticsSnapshot> => {
    let client: PostgresCampaignAnalyticsClient | undefined;
    let transactionStarted = false;
    let clientReleased = false;
    let failure: CampaignAnalyticsStoreError | undefined;

    const releaseClient = (destroy = false): void => {
      if (!client || clientReleased) {
        return;
      }
      clientReleased = true;
      client.release(destroy);
    };

    const query = async (
      text: string,
      values: readonly unknown[],
    ): Promise<PostgresCampaignAnalyticsQueryResult> => {
      assertNotAborted(signal, traceId);
      if (!client || clientReleased) {
        throw cleanupError("read_snapshot", traceId);
      }
      const queryPromise = client.query(text, values);
      let onAbort: (() => void) | undefined;
      const abortPromise = signal
        ? new Promise<never>((_resolve, reject) => {
          onAbort = () => {
            try {
              releaseClient(true);
              reject(timeoutError(traceId));
            } catch {
              reject(cleanupError("read_snapshot", traceId));
            }
          };
          signal.addEventListener("abort", onAbort, { once: true });
          if (signal.aborted) {
            onAbort();
          }
        })
        : undefined;
      try {
        const result = abortPromise
          ? await Promise.race([queryPromise, abortPromise])
          : await queryPromise;
        assertNotAborted(signal, traceId);
        if (!result || !Array.isArray(result.rows)) {
          return rowError();
        }
        return result;
      } finally {
        if (signal && onAbort) {
          signal.removeEventListener("abort", onAbort);
        }
      }
    };

    try {
      assertNotAborted(signal, traceId);
      client = await connect(signal, traceId);
      if (!client || typeof client.query !== "function" || typeof client.release !== "function") {
        throw argumentError("read_snapshot", traceId);
      }
      const migrationResult = await query(
        CAMPAIGN_ANALYTICS_MIGRATION_SQL,
        [],
      );
      decodeMigrationLedger(migrationResult, expectedMigrations, traceId);
      transactionStarted = true;
      await query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY", []);
      const factsResult = await query(CAMPAIGN_ANALYTICS_FACTS_SQL, [campaignId]);
      if (factsResult.rows.length === 0) {
        throw new CampaignAnalyticsStoreError({
          code: "CAMPAIGN_ANALYTICS_NOT_FOUND",
          operation: "read_snapshot",
          traceId,
        });
      }
      const facts = decodeFacts(singleRow(factsResult));
      if (facts.campaignId !== campaignId) {
        return rowError("CAMPAIGN_ANALYTICS_INTEGRITY_FAILED");
      }
      const taskResult = await query(CAMPAIGN_ANALYTICS_TASKS_SQL, [campaignId]);
      const taskFacts = decodeTasks(singleRow(taskResult), maxTaskRows);
      const reviewResult = await query(CAMPAIGN_ANALYTICS_REVIEW_SQL, [campaignId]);
      const review = decodeReview(singleRow(reviewResult));
      if (review.totalParticipants !== facts.participants.unique) {
        return rowError("CAMPAIGN_ANALYTICS_INTEGRITY_FAILED");
      }
      const aggregate: CampaignAnalyticsAggregateInput = {
        asOf: facts.asOf,
        campaignId,
        completions: taskFacts.completions,
        participants: facts.participants,
        points: {
          completionAwarded: facts.completionAwarded,
          participantAwarded: facts.participantAwarded,
          participantsWithPoints: facts.participantsWithPoints,
          participantsWithoutPoints: facts.participantsWithoutPoints,
        },
        referrals: {
          availability: "available",
          qualified: facts.referralsQualified,
          total: facts.referralsTotal,
        },
        review,
        sourceSchemaVersions: SOURCE_SCHEMA_VERSIONS,
        supportedLocales: facts.supportedLocales,
        tasks: taskFacts.tasks,
        traceId,
      };
      const snapshot = createCampaignAnalyticsSnapshot(aggregate);
      await query("COMMIT", []);
      transactionStarted = false;
      return snapshot;
    } catch (error) {
      failure = normalizeFailure(error, "read_snapshot", traceId);
      if (client && transactionStarted && !clientReleased) {
        try {
          await query("ROLLBACK", []);
          transactionStarted = false;
        } catch {
          failure = cleanupError("read_snapshot", traceId);
          try {
            releaseClient(true);
          } catch {
            failure = cleanupError("read_snapshot", traceId);
          }
        }
      }
      throw failure;
    } finally {
      if (client && !clientReleased) {
        try {
          releaseClient(failure?.code === "CAMPAIGN_ANALYTICS_CLEANUP_FAILED");
        } catch {
          throw cleanupError("read_snapshot", traceId);
        }
      }
    }
  };

  const readSnapshot = (
    input: CampaignAnalyticsReadInput,
    context: CampaignAnalyticsReadContext,
  ): Promise<CampaignAnalyticsSnapshot> => {
    const request = validateReadRequest(input, context);
    ensureOpen(request.traceId);
    const controller = new AbortController();
    const relayAbort = () => controller.abort();
    try {
      if (request.signal?.aborted) {
        controller.abort();
      } else {
        request.signal?.addEventListener("abort", relayAbort, { once: true });
      }
    } catch {
      throw argumentError("read_snapshot", request.traceId);
    }
    const cancel = () => controller.abort();
    activeReadCancels.add(cancel);
    activeReads += 1;

    return executeRead(request.campaignId, controller.signal, request.traceId).finally(() => {
      let listenerCleanupFailed = false;
      try {
        request.signal?.removeEventListener("abort", relayAbort);
      } catch {
        listenerCleanupFailed = true;
      } finally {
        activeReadCancels.delete(cancel);
        activeReads -= 1;
        notifyDrained();
      }
      if (listenerCleanupFailed) {
        throw cleanupError("read_snapshot", request.traceId);
      }
    });
  };

  const awaitDrain = (timeoutMs: number): Promise<boolean> => {
    if (isDrained()) {
      return Promise.resolve(true);
    }
    if (timeoutMs <= 0) {
      return Promise.resolve(false);
    }
    return new Promise<boolean>((resolve) => {
      const onDrained = () => {
        clearTimeout(timer);
        drainWaiters.delete(onDrained);
        resolve(true);
      };
      const timer = setTimeout(() => {
        drainWaiters.delete(onDrained);
        resolve(false);
      }, timeoutMs);
      drainWaiters.add(onDrained);
    });
  };

  const settleWithin = async (
    promise: Promise<void>,
    timeoutMs: number,
  ): Promise<"failed" | "settled" | "timed_out"> => {
    if (timeoutMs <= 0) {
      void promise.catch(() => undefined);
      return "timed_out";
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<"timed_out">((resolve) => {
      timer = setTimeout(() => resolve("timed_out"), timeoutMs);
    });
    const result = await Promise.race([
      promise.then(() => "settled" as const, () => "failed" as const),
      timeout,
    ]);
    if (timer) {
      clearTimeout(timer);
    }
    return result;
  };

  const close = (context?: CampaignAnalyticsCloseContext): Promise<void> => {
    if (closePromise) {
      return closePromise;
    }
    let traceId: string = randomUUID();
    if (context !== undefined) {
      let row: DbRow;
      try {
        row = assertExactKeys(context, ["traceId"]);
      } catch {
        throw argumentError("close");
      }
      if (typeof row.traceId !== "string" || !IDENTIFIER_PATTERN.test(row.traceId)) {
        throw argumentError("close");
      }
      traceId = row.traceId;
    }
    state = "closing";
    closePromise = (async () => {
      const startedAt = Date.now();
      let failed = false;
      try {
        const gracefulWindow = Math.max(1, Math.floor(drainTimeoutMs / 2));
        let drained = await awaitDrain(gracefulWindow);
        if (!drained) {
          for (const cancel of activeReadCancels) {
            cancel();
          }
          const remainingDrain = Math.max(
            0,
            Math.floor(drainTimeoutMs * 0.75) - (Date.now() - startedAt),
          );
          drained = await awaitDrain(remainingDrain);
        }
        failed = !drained || backgroundCleanupFailed;

        if (ownsPool) {
          const remainingClose = Math.max(0, drainTimeoutMs - (Date.now() - startedAt));
          try {
            const endResult = await settleWithin(pool.end(), remainingClose);
            failed = failed || endResult !== "settled";
          } catch {
            failed = true;
          }
        }
      } finally {
        state = "closed";
      }
      if (failed) {
        throw cleanupError("close", traceId);
      }
    })();
    return closePromise;
  };

  return Object.freeze({ close, readSnapshot });
};
