import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import pg, { type PoolClient } from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  parseTaskTemplateCatalogVersion,
  type TaskTemplateCatalogVersion,
} from "../domain/taskTemplateCatalog";
import {
  POSTGRES_MIGRATION_ADVISORY_LOCK_KEY,
  PostgresMigrationError,
  calculatePostgresMigrationChecksum,
  loadPostgresMigrations,
  runPostgresMigrations,
  type PostgresMigrationClient,
  type PostgresMigrationDefinition,
  type PostgresMigrationPool,
  type PostgresMigrationQueryResult,
} from "./postgresMigration";
import {
  isPostgresMigrationCliDirectExecution,
  parsePostgresMigrationCliMode,
  runPostgresMigrationCli,
  type PostgresMigrationPoolConfig,
} from "./postgresMigrationCli";
import { postgresMigrationFileManifest } from "./migrationManifest";
import { taskTemplateCatalogManifestV1 } from "./taskTemplateCatalogManifest";

interface QueryCall {
  text: string;
  values: readonly unknown[];
}

const TEST_DATABASE_URL = process.env.CAMPAIGN_OS_TEST_DATABASE_URL?.trim();
const REQUIRE_POSTGRES_TESTS = process.env.CAMPAIGN_OS_REQUIRE_POSTGRES_TESTS?.trim() === "1";

if (REQUIRE_POSTGRES_TESTS && !TEST_DATABASE_URL) {
  throw new Error(
    "Migration SQL acceptance requires CAMPAIGN_OS_TEST_DATABASE_URL when required mode is enabled.",
  );
}

const postgresMigrationSqlSuite = TEST_DATABASE_URL ? describe : describe.skip;
const normalizeSql = (value: string) => value.replace(/\s+/g, " ").trim();
const M246_MIGRATION_ID = "0006_durable_task_template_catalog";
const M246_CATALOG_COLUMNS = [
  "template_code",
  "version",
  "catalog_schema_version",
  "status",
  "adoption_mode",
  "category",
  "verification_type",
  "wallet_compatibility",
  "default_points",
  "minimum_points",
  "maximum_points",
  "required_by_default",
  "required_override_allowed",
  "risk_level",
  "supported_locales",
  "localized_content",
  "locale_readiness",
  "evidence_rule",
  "checksum",
  "created_at",
  "updated_at",
  "deprecated_at",
  "retired_at",
] as const;
const M246_TASK_COLUMNS = [
  "template_version",
  "template_checksum",
  "template_snapshot",
  "template_adoption_idempotency_key",
] as const;
const EXPECTED_M246_TEMPLATE_IDENTITIES = Object.freeze([
  "bridge-ebridge@1:c853e3150e98dccab6f12db1082044187c07b8105da579b2f47228753d376366",
  "daipp-submit@1:148400ba54941a018e712991157cefa91623be9d6e96c25783eb1d8dce443cea",
  "dao-vote@1:6480c2e967624f4e79daa0658aed5a1b92d327489c6873b7ef65909201c16e16",
  "forecast-participate@1:ee9e9b502937579115be2eff76e020ae46ffe1d001b378c2cdddaef9843cbd89",
  "invite-friend@1:01a37be6ef94068fc0ca8c81e988e68c223821f996a98cd770e8a2879c2f3731",
  "liquidity-awaken@1:631a473a66b438cb9f57bcbfb44dfa97b2fcf03a9009afb3d136b17cd6762447",
  "nft-hold@1:a449e6359a9eced771eb833707859ec26a94828fedf0d4144d21ac2aaae6bf23",
  "pay-complete@1:06230264ca2c06cb076412adc42bc6cf69eb34f5d2ca640a16321aeeab6b9b24",
  "schrodinger-hold@1:4a440889f5107090b428e457d485e038717cffe9ccd013ecc467e4baa91ce787",
  "social-share@1:031c9374a5a2e0226a174522bc74db101e2cbf41292ffc16aa73ef3631b3def7",
  "swap-awaken@1:d6b8f167617b8ba400b98b9069ae4792131408cde8070f640324890e38aa0df9",
  "wallet-connect@1:0114d4dafde62cda6c222e6499efe55b484f8451f845babb66ccf1f3babd783a",
]);

const stableTestJson = (value: unknown): string => {
  if (value === null) {
    return "null";
  }
  if (typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableTestJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort()
      .map((key) => `${JSON.stringify(key)}:${stableTestJson(record[key])}`)
      .join(",")}}`;
  }

  throw new Error("Test projection contains an unsupported value.");
};

const digestTestValue = (value: unknown) =>
  createHash("sha256").update(stableTestJson(value), "utf8").digest("hex");

const catalogVersionFromRow = (row: Record<string, unknown>): TaskTemplateCatalogVersion =>
  parseTaskTemplateCatalogVersion({
    adoptionMode: row.adoption_mode,
    catalogSchemaVersion: row.catalog_schema_version,
    category: row.category,
    checksum: row.checksum,
    evidenceRule: row.evidence_rule,
    localeReadiness: row.locale_readiness,
    localizedContent: row.localized_content,
    points: {
      default: row.default_points,
      maximum: row.maximum_points,
      minimum: row.minimum_points,
    },
    requiredPolicy: {
      default: row.required_by_default,
      overrideAllowed: row.required_override_allowed,
    },
    riskLevel: row.risk_level,
    status: row.status,
    supportedLocales: row.supported_locales,
    templateCode: row.template_code,
    verificationType: row.verification_type,
    version: row.version,
    walletCompatibility: row.wallet_compatibility,
  });

const createPostgresPool = (databaseUrl: string) => {
  const parsed = new URL(databaseUrl);
  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const isLoopback = hostname === "localhost"
    || hostname === "::1"
    || hostname.startsWith("127.");

  return new pg.Pool({
    connectionString: databaseUrl,
    max: 4,
    ssl: isLoopback ? false : { rejectUnauthorized: true },
  });
};

const isolatedPostgresDatabaseUrl = (baseUrl: string, databaseName: string) => {
  const parsed = new URL(baseUrl);
  parsed.pathname = `/${databaseName}`;
  parsed.search = "";

  return parsed.toString();
};

class TranscriptClient implements PostgresMigrationClient {
  readonly calls: QueryCall[] = [];
  readonly release = vi.fn(async (_destroy?: boolean) => {
    if (this.releaseFails) {
      throw new Error("postgres://operator:secret@db.internal/release");
    }
  });

  constructor(
    private readonly appliedRows: Array<{ checksum: string; migration_id: string }> = [],
    private readonly failWhen?: (sql: string) => boolean,
    private readonly ledgerExists = true,
    private readonly lockAcquired = true,
    private readonly lockReleased = true,
    private readonly releaseFails = false,
  ) {}

  async query(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<PostgresMigrationQueryResult> {
    const normalized = normalizeSql(text);
    this.calls.push({ text: normalized, values });

    if (this.failWhen?.(normalized)) {
      throw new Error("postgres://operator:secret@db.internal/campaign stack trace");
    }

    if (normalized.includes("to_regclass")) {
      return {
        rows: [{ ledger_name: this.ledgerExists ? "campaign_os.schema_migrations" : null }],
      };
    }

    if (normalized.includes("pg_try_advisory_lock")) {
      return { rows: [{ acquired: this.lockAcquired }] };
    }

    if (normalized.includes("pg_advisory_unlock")) {
      return { rows: [{ released: this.lockReleased }] };
    }

    if (normalized.includes("SELECT migration_id, checksum")) {
      return { rows: this.appliedRows };
    }

    return { rows: [] };
  }
}

class TranscriptPool implements PostgresMigrationPool {
  readonly connect = vi.fn(async () => this.client);
  readonly end = vi.fn(async () => {
    if (this.endFails) {
      throw new Error("postgres://operator:secret@db.internal/pool-close");
    }
  });

  constructor(
    readonly client: TranscriptClient,
    private readonly endFails = false,
  ) {}
}

const migration = async (
  overrides: Partial<PostgresMigrationDefinition> = {},
): Promise<PostgresMigrationDefinition> => {
  const upSql = overrides.upSql ?? "CREATE TABLE campaign_os.example (id text PRIMARY KEY);\n";

  return {
    checksum: await calculatePostgresMigrationChecksum(upSql),
    downSql: "DROP TABLE campaign_os.example;\n",
    id: "0001_campaign_runtime",
    upSql,
    ...overrides,
  };
};

interface ManifestApplyDriftScenario {
  readonly code:
    | "POSTGRES_MIGRATION_MANIFEST_CHECKSUM_DRIFT"
    | "POSTGRES_MIGRATION_MANIFEST_EXTRA_ENTRY"
    | "POSTGRES_MIGRATION_MANIFEST_MISSING_ENTRY"
    | "POSTGRES_MIGRATION_MANIFEST_ORDER_DRIFT";
  readonly label: string;
  readonly mutate: (
    migrations: PostgresMigrationDefinition[],
  ) => Promise<unknown> | unknown;
}

const manifestApplyDriftScenarios: readonly ManifestApplyDriftScenario[] = [
  {
    code: "POSTGRES_MIGRATION_MANIFEST_MISSING_ENTRY",
    label: "missing migration",
    mutate: (migrations) => migrations.pop(),
  },
  {
    code: "POSTGRES_MIGRATION_MANIFEST_EXTRA_ENTRY",
    label: "extra migration",
    mutate: async (migrations) => migrations.push(await migration({
      id: "0007_unexpected",
      upSql: "CREATE TABLE campaign_os.unexpected (id text PRIMARY KEY);\n",
    })),
  },
  {
    code: "POSTGRES_MIGRATION_MANIFEST_ORDER_DRIFT",
    label: "reordered migrations",
    mutate: (migrations) => {
      [migrations[0], migrations[1]] = [migrations[1]!, migrations[0]!];
    },
  },
  {
    code: "POSTGRES_MIGRATION_MANIFEST_CHECKSUM_DRIFT",
    label: "checksum drift",
    mutate: (migrations) => {
      migrations[5] = {
        ...migrations[5]!,
        checksum: "0".repeat(64),
      };
    },
  },
];

describe("PostgreSQL migration runtime", () => {
  it("loads committed additive migrations with stable checksums and owned down contracts", async () => {
    const first = await loadPostgresMigrations();
    const second = await loadPostgresMigrations();

    expect(first.map(({ id }) => id)).toEqual([
      "0001_campaign_runtime",
      "0002_admin_review_export",
      "0003_admin_review_rank_projection",
      "0004_live_provider_task_verification",
      "0005_participant_wallet_authentication",
      "0006_durable_task_template_catalog",
    ]);
    const campaignRuntime = first[0];
    const adminReviewExport = first[1];
    const adminReviewRankProjection = first[2];
    const liveProviderTaskVerification = first[3];
    const participantWalletAuthentication = first[4];
    const durableTaskTemplateCatalog = first[5];

    for (const table of [
      "campaigns",
      "campaign_tasks",
      "campaign_participants",
      "campaign_task_completions",
      "campaign_task_evidence",
      "campaign_referral_bindings",
    ]) {
      expect(campaignRuntime?.upSql).toContain(`CREATE TABLE campaign_os.${table}`);
    }
    expect(campaignRuntime?.upSql).toContain("CREATE TABLE IF NOT EXISTS campaign_os.schema_migrations");
    expect(campaignRuntime?.upSql).toContain("FOREIGN KEY (campaign_id, task_id, wallet_address, completion_id)");
    expect(campaignRuntime?.upSql).toContain("default_locale = 'en-US'");
    expect(campaignRuntime?.upSql).toContain("CHECK (start_time < end_time)");
    expect(campaignRuntime?.upSql).toContain("campaign_os_campaigns_project_updated_idx");
    expect(campaignRuntime?.upSql).toContain("campaign_os_campaign_task_evidence_campaign_task_idx");
    expect(campaignRuntime?.upSql).toContain("campaign_os_campaign_referral_bindings_campaign_referrer_idx");
    expect(campaignRuntime?.downSql).toContain("DROP TABLE IF EXISTS campaign_os.campaigns");
    expect(campaignRuntime?.checksum).toBe(
      "f8987b38a916e3c53d533f6fdcd75bfe95e2ea766346b5786c998529435c75a4",
    );

    expect(adminReviewExport?.upSql).toContain(
      "CREATE TABLE campaign_os.campaign_review_decisions",
    );
    expect(adminReviewExport?.upSql).toContain(
      "CREATE TABLE campaign_os.campaign_export_artifacts",
    );
    for (const contractFragment of [
      "ALTER TABLE campaign_os.campaign_participants",
      "campaign_os_campaign_participants_campaign_id_id_wallet_key",
      "UNIQUE (campaign_id, id, wallet_address)",
      "campaign_os_campaign_review_decisions_participant_owner_fk",
      "FOREIGN KEY (campaign_id, participant_id, wallet_address)",
      "REFERENCES campaign_os.campaign_participants (campaign_id, id, wallet_address)",
      "campaign_os_campaign_review_decisions_version_key",
      "campaign_os_campaign_review_decisions_idempotency_key",
      "campaign_os_campaign_review_decisions_current_idx",
      "campaign_os_campaign_review_decisions_filter_idx",
      "campaign_os_campaign_export_artifacts_campaign_fk",
      "campaign_os_campaign_export_artifacts_source_key",
      "campaign_os_campaign_export_artifacts_list_idx",
      "snapshot_version = 'review-snapshot-v1'",
      "source_version = 'artifact-source-v1'",
      "row_count BETWEEN 0 AND 5000",
      "content_bytes BETWEEN 0 AND 10485760",
      "content_bytes = octet_length(content)",
      "^[a-f0-9]{64}$",
      "text/csv;charset=utf-8",
      "application/json;charset=utf-8",
      "BEFORE UPDATE OR DELETE ON campaign_os.campaign_review_decisions",
      "BEFORE UPDATE OR DELETE ON campaign_os.campaign_export_artifacts",
      "BEFORE TRUNCATE ON campaign_os.campaign_review_decisions",
      "BEFORE TRUNCATE ON campaign_os.campaign_export_artifacts",
      "FOR EACH STATEMENT EXECUTE FUNCTION campaign_os.reject_admin_review_export_mutation()",
    ]) {
      expect(adminReviewExport?.upSql).toContain(contractFragment);
    }
    expect(adminReviewExport?.upSql).not.toContain(
      "campaign_os_campaign_review_decisions_participant_fk",
    );
    expect(adminReviewExport?.upSql).not.toContain(
      "campaign_os_campaign_review_decisions_campaign_fk",
    );
    expect(adminReviewExport?.checksum).toBe(
      "4f8eb20ac83b52bc9bc3e842416ff09fce369ec64412b7d67b974f2c900e6af5",
    );

    expect(adminReviewRankProjection?.upSql).toContain(
      "CREATE INDEX campaign_os_campaign_participants_dynamic_rank_idx",
    );
    expect(adminReviewRankProjection?.upSql).toContain(
      "campaign_id,\n    total_points DESC,\n    created_at ASC",
    );
    expect(adminReviewRankProjection?.upSql).toContain('id COLLATE "C" ASC');
    expect(adminReviewRankProjection?.upSql).toContain('wallet_address COLLATE "C" ASC');
    expect(adminReviewRankProjection?.upSql).not.toMatch(/\b(?:ALTER|DROP|TRUNCATE|UPDATE|DELETE)\b/i);
    expect(adminReviewRankProjection?.downSql).toBe(
      "DROP INDEX IF EXISTS campaign_os.campaign_os_campaign_participants_dynamic_rank_idx;\n",
    );
    expect(adminReviewRankProjection?.checksum).toBe(
      "c9236184b25820b36540942de86c2342c9098002a023db8da1f706cf287dd7e8",
    );

    expect(liveProviderTaskVerification?.upSql).toContain(
      "ADD COLUMN revision integer NOT NULL DEFAULT 1",
    );
    expect(liveProviderTaskVerification?.upSql).toContain(
      "CREATE TABLE campaign_os.verification_attempts",
    );
    expect(liveProviderTaskVerification?.upSql).toContain(
      "wallet_address ~ '^[A-Za-z0-9][A-Za-z0-9._-]*$'",
    );
    for (const contractFragment of [
      "CREATE TABLE campaign_os.campaign_task_revisions",
      "campaign_task_revisions_append_only",
      "capture_campaign_task_revision",
      "REFERENCES campaign_os.campaign_task_revisions",
      "ON DELETE RESTRICT",
      "idempotency_key",
      "lease_token_hash",
      "lease_expires_at",
      "fence",
      "attempt_count",
      "max_attempts",
      "dispatch_state",
      "transport_started_at",
      "transport_finished_at",
      "response_digest",
      "retry_posture",
      "verification_attempt_id",
      "campaign_os_verification_attempts_idempotency_key",
      "campaign_os_verification_attempts_recovery_idx",
      "campaign_os_verification_attempts_participant_journey_idx",
      "campaign_os_verification_attempts_state_dispatch_result_check",
      "campaign_os.valid_verification_attempt_diagnostic_codes",
      "campaign_os.protect_terminal_verification_attempt",
      "verification_attempt_terminal_immutability",
      "CREATE TABLE campaign_os.verification_attempt_finalization_results",
      "verification_attempt_finalization_result_validation",
      "verification_attempt_finalization_results_append_only",
      "verification_attempt_finalization_results_truncate_append_only",
      "NEW.completion_snapshot = to_jsonb(completion)",
      "NEW.evidence_snapshot = to_jsonb(evidence)",
      "NEW.participant_snapshot = to_jsonb(participant)",
      "campaign_os_campaign_task_evidence_live_provider_check",
      "live_provider_executed = false",
      "status = 'completed'",
      "verification_attempt_id IS NOT NULL",
      "attempt.evidence_ref = current_evidence.evidence_ref",
      "attempt.completed_at = current_evidence.captured_at",
      "completion.points_awarded = current_evidence.points_awarded",
      "completion.completed_at = attempt.completed_at",
      "completion.verification_attempt_id = attempt.id",
      "campaign_task_completion_live_provider_validation",
      "DEFERRABLE INITIALLY IMMEDIATE",
    ]) {
      expect(liveProviderTaskVerification?.upSql).toContain(contractFragment);
    }
    expect(liveProviderTaskVerification?.upSql).not.toContain(
      "REFERENCES campaign_os.campaign_tasks (campaign_id, id, revision)",
    );
    expect(normalizeSql(liveProviderTaskVerification?.upSql ?? "")).toContain(normalizeSql(`
      CREATE CONSTRAINT TRIGGER campaign_task_evidence_live_provider_validation
      AFTER INSERT OR UPDATE ON campaign_os.campaign_task_evidence
      DEFERRABLE INITIALLY IMMEDIATE
    `));
    expect(normalizeSql(liveProviderTaskVerification?.upSql ?? "")).toContain(normalizeSql(`
      evidence_rule,
      updated_at
      ON campaign_os.campaign_tasks
    `));
    expect(liveProviderTaskVerification?.upSql).not.toMatch(
      /\b(?:UPDATE|DELETE\s+FROM|TRUNCATE|DROP)\s+(?:TABLE\s+)?(?:IF\s+EXISTS\s+)?campaign_os\.(?:campaigns|campaign_tasks|campaign_participants|campaign_task_completions|campaign_task_evidence|campaign_referral_bindings)\b/i,
    );
    expect(liveProviderTaskVerification?.downSql).toContain(
      "LIVE PROVIDER VERIFICATION DATA EXISTS",
    );
    expect(liveProviderTaskVerification?.downSql).toContain(
      "TASK REVISION LINEAGE EXISTS",
    );
    expect(liveProviderTaskVerification?.downSql).toContain("revision > 1");
    expect(liveProviderTaskVerification?.downSql).toContain("HAVING COUNT(*) > 1");
    expect(liveProviderTaskVerification?.downSql).toContain("current_task.id IS NULL");
    expect(liveProviderTaskVerification?.downSql).toContain(
      "DROP TABLE campaign_os.verification_attempts",
    );
    expect(liveProviderTaskVerification?.downSql).toContain(
      "DROP TABLE campaign_os.verification_attempt_finalization_results",
    );
    expect(liveProviderTaskVerification?.downSql).toContain(
      "DROP TRIGGER IF EXISTS verification_attempt_terminal_immutability",
    );
    expect(liveProviderTaskVerification?.downSql).toContain(
      "DROP TABLE campaign_os.campaign_task_revisions",
    );
    expect(liveProviderTaskVerification?.downSql).toContain(
      "DROP TRIGGER IF EXISTS campaign_task_revision_capture",
    );
    expect(liveProviderTaskVerification?.downSql).toContain(
      "DROP TRIGGER IF EXISTS campaign_task_completion_live_provider_validation",
    );
    expect(liveProviderTaskVerification?.downSql).toMatch(
      /ADD CONSTRAINT campaign_task_evidence_live_provider_executed_check\s+CHECK \(live_provider_executed = false\)/,
    );
    expect(liveProviderTaskVerification?.checksum).toBe(
      "8e772b6427b4e41f9fe0f13c0c355c2cfd94eb302ab4fd6bb036188f78130d63",
    );

    for (const contractFragment of [
      "CREATE TABLE campaign_os.wallet_auth_challenges",
      "CREATE TABLE campaign_os.wallet_sessions",
      "campaign_os_wallet_auth_challenges_message_digest_key",
      "campaign_os_wallet_auth_challenges_nonce_digest_key",
      "campaign_os_wallet_sessions_credential_digest_key",
      "campaign_os_wallet_sessions_csrf_token_digest_key",
      "campaign_os_wallet_sessions_challenge_key",
      "FOREIGN KEY (challenge_id) REFERENCES campaign_os.wallet_auth_challenges (id) ON DELETE RESTRICT",
      "campaign_os_wallet_auth_challenges_state_expiry_idx",
      "campaign_os_wallet_auth_challenges_subject_state_idx",
      "campaign_os_wallet_auth_challenges_fingerprint_rate_idx",
      "campaign_os_wallet_sessions_subject_inventory_idx",
      "campaign_os_wallet_sessions_expiry_idx",
      "wallet_auth_challenge_insert_guard",
      "wallet_auth_challenge_transition_guard",
      "wallet_session_challenge_guard",
      "wallet_session_transition_guard",
    ]) {
      expect(participantWalletAuthentication?.upSql).toContain(contractFragment);
    }
    for (const forbiddenColumn of [
      "raw_credential",
      "raw_csrf",
      "canonical_message",
      "nonce text",
      "signature",
      "public_key",
      "provider_payload",
      "domain",
      "audience",
      "uri",
    ]) {
      expect(participantWalletAuthentication?.upSql).not.toContain(forbiddenColumn);
    }
    expect(participantWalletAuthentication?.upSql).not.toMatch(
      /\b(?:ALTER|DELETE\s+FROM|TRUNCATE|DROP)\b/i,
    );
    for (const historicalTable of [
      "campaigns",
      "campaign_tasks",
      "campaign_participants",
      "campaign_task_completions",
      "campaign_task_evidence",
      "campaign_referral_bindings",
      "campaign_review_decisions",
      "campaign_export_artifacts",
      "verification_attempts",
    ]) {
      expect(participantWalletAuthentication?.upSql).not.toMatch(new RegExp(
        `(?:ALTER|UPDATE|DELETE\\s+FROM|TRUNCATE|DROP)\\s+(?:TABLE\\s+)?campaign_os\\.${historicalTable}\\b`,
        "i",
      ));
    }
    expect(participantWalletAuthentication?.downSql).toContain(
      "PARTICIPANT WALLET AUTHENTICATION DATA EXISTS",
    );
    for (const ownedDrop of [
      "DROP TRIGGER IF EXISTS wallet_auth_challenge_insert_guard",
      "DROP TRIGGER IF EXISTS wallet_auth_challenge_transition_guard",
      "DROP TRIGGER IF EXISTS wallet_session_challenge_guard",
      "DROP TRIGGER IF EXISTS wallet_session_transition_guard",
      "DROP FUNCTION IF EXISTS campaign_os.valid_wallet_auth_id_array(jsonb)",
      "DROP FUNCTION IF EXISTS campaign_os.validate_wallet_auth_challenge_insert()",
      "DROP FUNCTION IF EXISTS campaign_os.protect_wallet_auth_challenge_transition()",
      "DROP FUNCTION IF EXISTS campaign_os.validate_wallet_session_challenge()",
      "DROP FUNCTION IF EXISTS campaign_os.protect_wallet_session_transition()",
    ]) {
      expect(participantWalletAuthentication?.downSql).toContain(ownedDrop);
    }
    expect(participantWalletAuthentication?.downSql).not.toMatch(/\bCASCADE\b/i);
    expect(participantWalletAuthentication?.checksum).toBe(
      "d8d7dea2d7e8d4d0f8d195082cad72c01007dd28a63d2b97b27fa4584940db0c",
    );

    for (const contractFragment of [
      "CREATE TABLE campaign_os.task_template_catalog_versions",
      "PRIMARY KEY (template_code, version)",
      "task_template_catalog_single_active_idx",
      "campaign_os.valid_task_template_supported_locales",
      "campaign_os.valid_task_template_locales",
      "task_template_catalog_update_guard",
      "TASK TEMPLATE CATALOG CANONICAL FIELDS ARE IMMUTABLE",
      "TASK TEMPLATE CATALOG STATUS IS FORWARD ONLY",
      "ADD COLUMN template_version integer",
      "ADD COLUMN template_checksum text",
      "ADD COLUMN template_snapshot jsonb",
      "ADD COLUMN template_adoption_idempotency_key text",
      "campaign_tasks_template_snapshot_all_or_none",
      "campaign_tasks_template_catalog_fk",
      "campaign_task_template_adoption_immutable_guard",
      "CAMPAIGN TASK TEMPLATE ADOPTION IS IMMUTABLE",
      "ON DELETE RESTRICT",
      "campaign_tasks_template_idempotency_key",
    ]) {
      expect(durableTaskTemplateCatalog?.upSql).toContain(contractFragment);
    }
    expect(durableTaskTemplateCatalog?.upSql).not.toMatch(
      /\b(?:UPDATE|DELETE\s+FROM|TRUNCATE|DROP)\s+(?:TABLE\s+)?(?:IF\s+EXISTS\s+)?campaign_os\.(?:campaigns|campaign_tasks|campaign_participants|campaign_task_completions|campaign_task_evidence|campaign_referral_bindings)\b/i,
    );
    expect(durableTaskTemplateCatalog?.upSql).not.toMatch(/\bBACKFILL\b/i);
    expect(durableTaskTemplateCatalog?.downSql).toContain(
      "TASK TEMPLATE CATALOG REFERENCES EXIST",
    );
    expect(durableTaskTemplateCatalog?.downSql).toContain(
      "DROP TABLE IF EXISTS campaign_os.task_template_catalog_versions",
    );
    const durableDownSql = durableTaskTemplateCatalog?.downSql ?? "";
    const referenceGuardIndex = durableDownSql.indexOf(
      "TASK TEMPLATE CATALOG REFERENCES EXIST",
    );
    const adoptionTriggerDropIndex = durableDownSql.indexOf(
      "DROP TRIGGER IF EXISTS campaign_task_template_adoption_immutable_guard",
    );
    const adoptionFunctionDropIndex = durableDownSql.indexOf(
      "DROP FUNCTION IF EXISTS campaign_os.protect_campaign_task_template_adoption()",
    );
    const taskColumnDropIndex = durableDownSql.indexOf(
      "ALTER TABLE campaign_os.campaign_tasks",
    );
    expect(referenceGuardIndex).toBeGreaterThanOrEqual(0);
    expect(adoptionTriggerDropIndex).toBeGreaterThan(referenceGuardIndex);
    expect(adoptionFunctionDropIndex).toBeGreaterThan(adoptionTriggerDropIndex);
    expect(taskColumnDropIndex).toBeGreaterThan(adoptionFunctionDropIndex);
    expect(durableTaskTemplateCatalog?.downSql).not.toMatch(/\bCASCADE\b/i);
    expect(durableTaskTemplateCatalog?.checksum).toBe(
      "421d5944d5203c419d5967e80399134237aad897cef9da184eed5c17066cd0de",
    );

    const factTables = [
      "campaigns",
      "campaign_tasks",
      "campaign_task_completions",
      "campaign_task_evidence",
      "campaign_referral_bindings",
    ];
    for (const factTable of factTables) {
      expect(adminReviewExport?.upSql).not.toMatch(new RegExp(
        `(?:ALTER|DROP|TRUNCATE)\\s+(?:TABLE\\s+)?(?:IF\\s+EXISTS\\s+)?campaign_os\\.${factTable}\\b`,
        "i",
      ));
      expect(adminReviewExport?.upSql).not.toMatch(new RegExp(
        `(?:UPDATE|DELETE\\s+FROM)\\s+campaign_os\\.${factTable}\\b`,
        "i",
      ));
    }
    expect(adminReviewExport?.upSql?.match(
      /\bALTER\s+TABLE\s+campaign_os\.campaign_participants\b/gi,
    )).toHaveLength(1);
    expect(adminReviewExport?.upSql).not.toMatch(
      /\b(?:DROP|TRUNCATE)\s+(?:TABLE\s+)?(?:IF\s+EXISTS\s+)?campaign_os\.campaign_participants\b/i,
    );
    expect(adminReviewExport?.upSql).not.toMatch(
      /\b(?:UPDATE|DELETE\s+FROM)\s+campaign_os\.campaign_participants\b/i,
    );
    expect(adminReviewExport?.upSql).not.toMatch(/\bBACKFILL\b/i);
    expect(adminReviewExport?.upSql).not.toMatch(/\bTRUNCATE\s+TABLE\b/i);

    const downSql = adminReviewExport?.downSql ?? "";
    expect(downSql).toContain("DESTRUCTIVE OPERATOR RECOVERY ONLY");
    expect(downSql).toContain("DROP TRIGGER IF EXISTS campaign_review_decisions_append_only");
    expect(downSql).toContain("DROP TRIGGER IF EXISTS campaign_export_artifacts_append_only");
    expect(downSql).toContain("DROP TRIGGER IF EXISTS campaign_review_decisions_truncate_append_only");
    expect(downSql).toContain("DROP TRIGGER IF EXISTS campaign_export_artifacts_truncate_append_only");
    expect(downSql).toContain("DROP TABLE IF EXISTS campaign_os.campaign_export_artifacts");
    expect(downSql).toContain("DROP TABLE IF EXISTS campaign_os.campaign_review_decisions");
    expect(downSql).toContain(
      "DROP CONSTRAINT IF EXISTS campaign_os_campaign_participants_campaign_id_id_wallet_key",
    );
    expect(downSql).toContain("DROP FUNCTION IF EXISTS campaign_os.reject_admin_review_export_mutation()");
    expect(downSql.indexOf("DROP TRIGGER")).toBeLessThan(downSql.indexOf("DROP TABLE"));
    expect(downSql.indexOf("DROP TABLE IF EXISTS campaign_os.campaign_review_decisions")).toBeLessThan(
      downSql.indexOf("DROP CONSTRAINT IF EXISTS"),
    );
    expect(downSql.indexOf("DROP CONSTRAINT IF EXISTS")).toBeLessThan(
      downSql.indexOf("DROP FUNCTION"),
    );
    for (const forbiddenOwnershipTarget of [
      ...factTables,
      "schema_migrations",
    ]) {
      expect(downSql).not.toContain(`campaign_os.${forbiddenOwnershipTarget}`);
    }
    expect(downSql).not.toMatch(/DROP\s+SCHEMA/i);

    for (const definition of first) {
      expect(definition.checksum).toMatch(/^[a-f0-9]{64}$/);
    }
    expect(second).toEqual(first);
  });

  it("keeps every historical migration byte-for-byte invariant", async () => {
    const expectedByteChecksums = {
      "0001_campaign_runtime.down.sql": "08df0fbad60af8d0187499ff5ed586b6187fbc91acfd30d7678aa3ae99dcba15",
      "0001_campaign_runtime.up.sql": "f8987b38a916e3c53d533f6fdcd75bfe95e2ea766346b5786c998529435c75a4",
      "0002_admin_review_export.down.sql": "2a5b90913cec0ffb8c314d1145587ee897fe6303314b2962b558f4c191e7c6dd",
      "0002_admin_review_export.up.sql": "4f8eb20ac83b52bc9bc3e842416ff09fce369ec64412b7d67b974f2c900e6af5",
      "0003_admin_review_rank_projection.down.sql": "b668da49231bb443fe8618816ce68323f83ca9ea15fd4969db49f230538e5fc9",
      "0003_admin_review_rank_projection.up.sql": "c9236184b25820b36540942de86c2342c9098002a023db8da1f706cf287dd7e8",
      "0004_live_provider_task_verification.down.sql": "87c9ab26a7e37fb1800324a4179415d98128684e3ca78cfed520a82e2b55e58d",
      "0004_live_provider_task_verification.up.sql": "8e772b6427b4e41f9fe0f13c0c355c2cfd94eb302ab4fd6bb036188f78130d63",
      "0005_participant_wallet_authentication.down.sql": "ed59547af758339ca20a34c8f5bf609c8af8143e280c49fd33712bb5af238b9c",
      "0005_participant_wallet_authentication.up.sql": "d8d7dea2d7e8d4d0f8d195082cad72c01007dd28a63d2b97b27fa4584940db0c",
    } as const;

    for (const [fileName, expectedChecksum] of Object.entries(expectedByteChecksums)) {
      const bytes = await readFile(resolve(process.cwd(), "db/migrations", fileName));
      expect(createHash("sha256").update(bytes).digest("hex"), fileName).toBe(expectedChecksum);
    }
  });

  it("propagates a caller Trace ID when migration discovery fails", async () => {
    await expect(loadPostgresMigrations(
      "db/migrations/missing-test-directory",
      "trace-discovery",
    )).rejects.toMatchObject({
      code: "POSTGRES_MIGRATION_DISCOVERY_FAILED",
      operation: "discover",
      traceId: "trace-discovery",
    });
  });

  it.each(["up", "down"] as const)(
    "rejects a migration with only the %s file present",
    async (direction) => {
      const directory = await mkdtemp(join(tmpdir(), "campaign-os-migration-pair-"));

      try {
        await writeFile(
          join(directory, `0006_durable_task_template_catalog.${direction}.sql`),
          "SELECT 1;\n",
          "utf8",
        );

        await expect(loadPostgresMigrations(
          directory,
          `trace-missing-${direction}`,
        )).rejects.toMatchObject({
          code: "POSTGRES_MIGRATION_DEFINITION_INVALID",
          field: "migrationPair",
          operation: "discover",
        });
      } finally {
        await rm(directory, { force: true, recursive: true });
      }
    },
  );

  it("rejects migration discovery from paths outside the fixed manifest", async () => {
    const directory = await mkdtemp(join(tmpdir(), "campaign-os-migration-path-drift-"));

    try {
      for (const entry of postgresMigrationFileManifest) {
        for (const manifestPath of [entry.upPath, entry.downPath]) {
          await copyFile(
            resolve(process.cwd(), manifestPath),
            join(directory, basename(manifestPath)),
          );
        }
      }

      const failure = loadPostgresMigrations(directory, "trace-path-drift");
      await expect(failure).rejects.toBeInstanceOf(PostgresMigrationError);
      await expect(failure).rejects.toMatchObject({
        code: "POSTGRES_MIGRATION_MANIFEST_PATH_DRIFT",
        operation: "discover",
        traceId: "trace-path-drift",
      });
    } finally {
      await rm(directory, { force: true, recursive: true });
    }
  });

  it.each(manifestApplyDriftScenarios)(
    "rejects $label from the production-loaded catalog before connecting",
    async ({ code, mutate }) => {
      const migrations = await loadPostgresMigrations();
      const pool = new TranscriptPool(new TranscriptClient());
      await mutate(migrations);

      const failure = runPostgresMigrations({
        approved: true,
        migrations,
        mode: "apply",
        pool,
        traceId: "trace-manifest-drift",
      });

      await expect(failure).rejects.toBeInstanceOf(PostgresMigrationError);
      await expect(failure).rejects.toMatchObject({
        code,
        operation: "apply",
        traceId: "trace-manifest-drift",
      });
      await expect(failure).rejects.not.toHaveProperty(
        "message",
        expect.stringContaining("CREATE TABLE"),
      );
      expect(pool.connect).not.toHaveBeenCalled();
    },
  );

  it("normalizes line endings before calculating a checksum", async () => {
    expect(await calculatePostgresMigrationChecksum("SELECT 1;\r\n")).toBe(
      await calculatePostgresMigrationChecksum("SELECT 1;\n"),
    );
  });

  it("plans a pending migration without DDL or advisory locks", async () => {
    const client = new TranscriptClient([], undefined, false);
    const pool = new TranscriptPool(client);

    const result = await runPostgresMigrations({
      migrations: [await migration()],
      mode: "plan",
      pool,
      traceId: "trace-plan",
    });

    expect(result).toMatchObject({
      appliedMigrationIds: [],
      mode: "plan",
      pendingMigrationIds: ["0001_campaign_runtime"],
      status: "pending",
      traceId: "trace-plan",
    });
    expect(client.calls.map((call) => call.text)).toHaveLength(1);
    expect(client.calls[0]?.text).toContain("to_regclass");
    expect(client.calls.some((call) => /CREATE|BEGIN|advisory_lock/i.test(call.text))).toBe(false);
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("classifies an uninitialized schema during validation without DDL", async () => {
    const client = new TranscriptClient([], undefined, false);

    const result = await runPostgresMigrations({
      migrations: [await migration()],
      mode: "validate",
      pool: new TranscriptPool(client),
      traceId: "trace-uninitialized",
    });

    expect(result).toMatchObject({
      diagnosticCodes: ["POSTGRES_MIGRATION_SCHEMA_UNINITIALIZED"],
      pendingMigrationIds: ["0001_campaign_runtime"],
      status: "pending",
    });
    expect(client.calls).toHaveLength(1);
    expect(client.calls.some((call) => /CREATE|BEGIN|INSERT/i.test(call.text))).toBe(false);
  });

  it("validates an applied migration without mutating schema", async () => {
    const definition = await migration();
    const client = new TranscriptClient([
      { checksum: definition.checksum, migration_id: definition.id },
    ]);

    const result = await runPostgresMigrations({
      migrations: [definition],
      mode: "validate",
      pool: new TranscriptPool(client),
      traceId: "trace-validate",
    });

    expect(result.status).toBe("ready");
    expect(result.appliedMigrationIds).toEqual([definition.id]);
    expect(result.pendingMigrationIds).toEqual([]);
    expect(client.calls.some((call) => /CREATE|INSERT|BEGIN/i.test(call.text))).toBe(false);
  });

  it("classifies an initialized migration ledger with a pending suffix", async () => {
    const first = await migration();
    const second = await migration({
      id: "0002_campaign_indexes",
      upSql: "CREATE INDEX example_idx ON campaign_os.example (id);\n",
    });
    const client = new TranscriptClient([
      { checksum: first.checksum, migration_id: first.id },
    ]);

    const result = await runPostgresMigrations({
      migrations: [second, first],
      mode: "validate",
      pool: new TranscriptPool(client),
      traceId: "trace-pending-suffix",
    });

    expect(result).toMatchObject({
      appliedMigrationIds: [first.id],
      diagnosticCodes: [],
      pendingMigrationIds: [second.id],
      status: "pending",
    });
  });

  it("blocks a migration ledger gap before executing DDL", async () => {
    const first = await migration();
    const second = await migration({
      id: "0002_campaign_indexes",
      upSql: "CREATE INDEX example_idx ON campaign_os.example (id);\n",
    });
    const client = new TranscriptClient([
      { checksum: second.checksum, migration_id: second.id },
    ]);

    await expect(runPostgresMigrations({
      migrations: [first, second],
      mode: "validate",
      pool: new TranscriptPool(client),
      traceId: "trace-ledger-gap",
    })).rejects.toMatchObject({
      code: "POSTGRES_MIGRATION_LEDGER_INVALID",
      field: "migrationOrder",
      operation: "validate",
    });
    expect(client.calls.some((call) => /CREATE|INSERT|BEGIN/i.test(call.text))).toBe(false);
  });

  it("blocks checksum drift with a safe typed diagnostic", async () => {
    const definition = await migration();
    const client = new TranscriptClient([
      { checksum: "0".repeat(64), migration_id: definition.id },
    ]);

    await expect(runPostgresMigrations({
      migrations: [definition],
      mode: "validate",
      pool: new TranscriptPool(client),
      traceId: "trace-drift",
    })).rejects.toMatchObject({
      code: "POSTGRES_MIGRATION_CHECKSUM_DRIFT",
      operation: "validate",
      traceId: "trace-drift",
    });
  });

  it("maps query failures to safe typed diagnostics and releases the client", async () => {
    const client = new TranscriptClient(
      [],
      (sql) => sql.includes("to_regclass"),
      false,
    );

    const failure = runPostgresMigrations({
      migrations: [await migration()],
      mode: "plan",
      pool: new TranscriptPool(client),
      traceId: "trace-query-failure",
    });

    await expect(failure).rejects.toMatchObject({
      code: "POSTGRES_MIGRATION_QUERY_FAILED",
      operation: "plan",
      traceId: "trace-query-failure",
    });
    await expect(failure).rejects.not.toHaveProperty("message", expect.stringContaining("operator:secret"));
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("surfaces client release failures without exposing the connection detail", async () => {
    const client = new TranscriptClient([], undefined, false, true, true, true);

    const failure = runPostgresMigrations({
      migrations: [await migration()],
      mode: "plan",
      pool: new TranscriptPool(client),
      traceId: "trace-release-failure",
    });

    await expect(failure).rejects.toMatchObject({
      code: "POSTGRES_MIGRATION_CLEANUP_FAILED",
      operation: "close",
      traceId: "trace-release-failure",
    });
    await expect(failure).rejects.not.toHaveProperty(
      "message",
      expect.stringContaining("operator:secret"),
    );
  });

  it("rejects duplicate migration ids before acquiring a client", async () => {
    const pool = new TranscriptPool(new TranscriptClient());
    const definition = await migration();

    await expect(runPostgresMigrations({
      migrations: [definition, definition],
      mode: "plan",
      pool,
      traceId: "trace-duplicate",
    })).rejects.toMatchObject({
      code: "POSTGRES_MIGRATION_DEFINITION_INVALID",
      field: "migrations",
    });
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it("maps malformed migration definitions to a typed error before connecting", async () => {
    const pool = new TranscriptPool(new TranscriptClient());
    const malformed = {
      checksum: 7,
      downSql: null,
      id: "0001_campaign_runtime",
      upSql: undefined,
    } as unknown as PostgresMigrationDefinition;

    await expect(runPostgresMigrations({
      migrations: [malformed],
      mode: "plan",
      pool,
      traceId: "trace-malformed",
    })).rejects.toMatchObject({
      code: "POSTGRES_MIGRATION_DEFINITION_INVALID",
      field: "migrations",
      operation: "plan",
      traceId: "trace-malformed",
    });
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it("rejects apply without approval before acquiring a client", async () => {
    const pool = new TranscriptPool(new TranscriptClient());

    await expect(runPostgresMigrations({
      approved: false,
      migrations: [await migration()],
      mode: "apply",
      pool,
      traceId: "trace-unapproved",
    })).rejects.toBeInstanceOf(PostgresMigrationError);
    await expect(runPostgresMigrations({
      approved: false,
      migrations: [await migration()],
      mode: "apply",
      pool,
      traceId: "trace-unapproved",
    })).rejects.toMatchObject({
      code: "POSTGRES_MIGRATION_APPROVAL_REQUIRED",
    });
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it("applies a pending migration under one lock and transaction", async () => {
    const definition = await migration();
    const client = new TranscriptClient([], undefined, false);

    const result = await runPostgresMigrations({
      approved: true,
      migrations: [definition],
      mode: "apply",
      now: () => 25,
      pool: new TranscriptPool(client),
      traceId: "trace-apply",
    });

    expect(result).toMatchObject({
      appliedMigrationIds: [definition.id],
      mode: "apply",
      pendingMigrationIds: [],
      status: "ready",
      traceId: "trace-apply",
    });

    const statements = client.calls.map((call) => call.text);
    expect(statements).toEqual([
      expect.stringContaining("pg_try_advisory_lock"),
      "BEGIN",
      expect.stringContaining("CREATE SCHEMA IF NOT EXISTS campaign_os"),
      expect.stringContaining("CREATE TABLE IF NOT EXISTS campaign_os.schema_migrations"),
      expect.stringContaining("SELECT migration_id, checksum"),
      normalizeSql(definition.upSql),
      expect.stringContaining("INSERT INTO campaign_os.schema_migrations"),
      "COMMIT",
      expect.stringContaining("pg_advisory_unlock"),
    ]);
    expect(client.calls[0]?.values).toEqual([POSTGRES_MIGRATION_ADVISORY_LOCK_KEY]);
    expect(client.calls[6]?.values).toEqual([
      definition.id,
      definition.checksum,
      expect.any(Number),
    ]);
    expect(client.release).toHaveBeenCalledOnce();
    expect(client.calls[3]?.text).toContain("checksum ~ '^[a-f0-9]{64}$'");
  });

  it("bounds lock acquisition and does not begin when the lock is unavailable", async () => {
    const client = new TranscriptClient([], undefined, false, false);

    await expect(runPostgresMigrations({
      approved: true,
      lockWaitMs: 0,
      migrations: [await migration()],
      mode: "apply",
      pool: new TranscriptPool(client),
      traceId: "trace-lock",
    })).rejects.toMatchObject({
      code: "POSTGRES_MIGRATION_LOCK_UNAVAILABLE",
      operation: "apply",
    });

    expect(client.calls.map((call) => call.text)).toEqual([
      expect.stringContaining("pg_try_advisory_lock"),
    ]);
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("maps advisory lock query failures and releases the client", async () => {
    const client = new TranscriptClient(
      [],
      (sql) => sql.includes("pg_try_advisory_lock"),
      false,
    );

    await expect(runPostgresMigrations({
      approved: true,
      migrations: [await migration()],
      mode: "apply",
      pool: new TranscriptPool(client),
      traceId: "trace-lock-query",
    })).rejects.toMatchObject({
      code: "POSTGRES_MIGRATION_LOCK_UNAVAILABLE",
      operation: "apply",
      traceId: "trace-lock-query",
    });
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("destroys the client when a session lock cannot be released", async () => {
    const definition = await migration();
    const client = new TranscriptClient(
      [{ checksum: definition.checksum, migration_id: definition.id }],
      undefined,
      true,
      true,
      false,
    );

    await expect(runPostgresMigrations({
      approved: true,
      migrations: [definition],
      mode: "apply",
      pool: new TranscriptPool(client),
      traceId: "trace-unlock",
    })).rejects.toMatchObject({
      code: "POSTGRES_MIGRATION_CLEANUP_FAILED",
      operation: "close",
    });
    expect(client.release).toHaveBeenCalledWith(true);
  });

  it("rolls back, unlocks, and releases when DDL fails", async () => {
    const definition = await migration();
    const client = new TranscriptClient(
      [],
      (sql) => sql === normalizeSql(definition.upSql),
      false,
    );

    await expect(runPostgresMigrations({
      approved: true,
      migrations: [definition],
      mode: "apply",
      pool: new TranscriptPool(client),
      traceId: "trace-failure",
    })).rejects.toMatchObject({
      code: "POSTGRES_MIGRATION_EXECUTION_FAILED",
      traceId: "trace-failure",
    });

    const statements = client.calls.map((call) => call.text);
    expect(statements).toContain("ROLLBACK");
    expect(statements.some((statement) => statement.includes("INSERT INTO"))).toBe(false);
    expect(statements[statements.length - 1]).toContain("pg_advisory_unlock");
    expect(client.release).toHaveBeenCalledOnce();
    expect(JSON.stringify((client.calls))).not.toContain("operator:secret");
  });

  it("preserves the primary execution diagnostic when cleanup also fails", async () => {
    const definition = await migration();
    const client = new TranscriptClient(
      [],
      (sql) => sql === normalizeSql(definition.upSql),
      false,
      true,
      false,
      true,
    );

    const failure = runPostgresMigrations({
      approved: true,
      migrations: [definition],
      mode: "apply",
      pool: new TranscriptPool(client),
      traceId: "trace-primary-cleanup",
    });

    await expect(failure).rejects.toMatchObject({
      code: "POSTGRES_MIGRATION_EXECUTION_FAILED",
      operation: "apply",
      traceId: "trace-primary-cleanup",
    });
    await expect(failure).rejects.not.toHaveProperty(
      "message",
      expect.stringContaining("operator:secret"),
    );
    expect(client.release).toHaveBeenCalledWith(true);
  });

  it("does not rerun an already applied migration", async () => {
    const definition = await migration();
    const client = new TranscriptClient([
      { checksum: definition.checksum, migration_id: definition.id },
    ]);

    const result = await runPostgresMigrations({
      approved: true,
      migrations: [definition],
      mode: "apply",
      pool: new TranscriptPool(client),
      traceId: "trace-repeat",
    });

    expect(result.status).toBe("ready");
    expect(result.appliedMigrationIds).toEqual([definition.id]);
    expect(client.calls.some((call) => call.text === normalizeSql(definition.upSql))).toBe(false);
    expect(client.calls.some((call) => call.text.includes("INSERT INTO"))).toBe(false);
  });
});

postgresMigrationSqlSuite("PostgreSQL 0004 and 0005 migration SQL invariants", () => {
  const TASK_REVISION_DIGEST = "a".repeat(64);
  const EVIDENCE_RULE_DIGEST = "b".repeat(64);
  const LEASE_TOKEN_HASH = "c".repeat(64);
  const REQUEST_DIGEST = "d".repeat(64);
  const RESPONSE_DIGEST = "e".repeat(64);
  const EVIDENCE_HASH = "f".repeat(64);
  const FINALIZATION_DIGEST = "0".repeat(64);
  const campaignId = "campaign-migration-0004";
  const taskId = "task-migration-0004";
  const walletAddress = "8A2...1eF";
  const databaseName = `campaign_os_m243_${process.pid}_${randomUUID()
    .replace(/-/g, "")
    .slice(0, 8)}`;
  let adminPool: pg.Pool | undefined;
  let databasePool: pg.Pool | undefined;
  let client: PoolClient | undefined;
  let liveProviderMigration: PostgresMigrationDefinition | undefined;
  let walletAuthenticationMigration: PostgresMigrationDefinition | undefined;
  let savepointSequence = 0;

  const requiredClient = () => {
    if (!client) {
      throw new Error("Migration SQL acceptance client is unavailable.");
    }

    return client;
  };

  const requiredLiveProviderMigration = () => {
    if (!liveProviderMigration) {
      throw new Error("Migration 0004 was not loaded for SQL acceptance.");
    }

    return liveProviderMigration;
  };

  const requiredWalletAuthenticationMigration = () => {
    if (!walletAuthenticationMigration) {
      throw new Error("Migration 0005 was not loaded for SQL acceptance.");
    }

    return walletAuthenticationMigration;
  };

  const walletSessionInsertSql = `
    INSERT INTO campaign_os.wallet_sessions (
      id, credential_digest, csrf_token_digest, challenge_id, subject_key,
      wallet_address, account_type, wallet_source, chain_id, network, adapter_id,
      proof_method, signer_address, ca_hash, proof_digest, verified_at,
      credential_boundary, role_ids, capabilities, status, version,
      membership_revision, issued_at, last_seen_at, idle_expires_at,
      absolute_expires_at, revoked_at, revocation_code, last_trace_id,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, 'wallet-safe', 'EOA',
      'PORTKEY_EOA_EXTENSION', 'AELF', 'mainnet', 'portkey-eoa',
      'AELF_EOA_RECOVERABLE', 'signer-safe', NULL, $6,
      '2026-07-18T00:00:01.000Z', 'credential/v1', $7::jsonb,
      $8::jsonb, $9, $10, 'membership-1',
      '2026-07-18T00:00:02.000Z', '2026-07-18T00:00:02.000Z',
      '2026-07-18T00:30:00.000Z', '2026-07-18T08:00:00.000Z', $11, $12,
      'trace-session-fixture', '2026-07-18T00:00:02.000Z',
      '2026-07-18T00:00:02.000Z'
    )
  `;

  const walletSessionValues = (options: Readonly<{
    capabilities?: unknown;
    challengeId: string;
    credentialSeed: string;
    csrfSeed: string;
    id: string;
    revocationCode?: string;
    revokedAt?: string;
    roleIds?: unknown;
    status?: "active" | "expired" | "revoked";
    version?: number;
  }>): readonly unknown[] => [
    options.id,
    options.credentialSeed.repeat(64),
    options.csrfSeed.repeat(64),
    options.challengeId,
    "c".repeat(64),
    "6".repeat(64),
    JSON.stringify(options.roleIds ?? ["participant"]),
    JSON.stringify(options.capabilities ?? ["campaign:read"]),
    options.status ?? "active",
    options.version ?? 1,
    options.revokedAt ?? null,
    options.revocationCode ?? null,
  ];

  const insertWalletAuthenticationChallenge = async (
    id: string,
    nonceSeed: string,
    messageSeed: string,
  ) => requiredClient().query(
    `INSERT INTO campaign_os.wallet_auth_challenges (
       id, version, wallet_address, subject_key, adapter_id, chain_id, network,
       ca_hash, nonce_digest, message_digest, client_fingerprint_digest, status,
       state_version, verification_attempts, rate_window_started_at,
       rate_attempt_count, issued_at, expires_at, consumed_at, terminal_at,
       terminal_code, trace_id, created_at, updated_at
     ) VALUES (
       $1, 'campaign-os-wallet-auth/v1', 'wallet-safe', $4,
       'portkey-eoa', 'AELF', 'mainnet', NULL, $2, $3, NULL, 'issued', 1, 0,
       '2026-07-18T00:00:00.000Z', 0, '2026-07-18T00:00:00.000Z',
       '2026-07-18T00:10:00.000Z', NULL, NULL, NULL, 'trace-auth-migration',
       '2026-07-18T00:00:00.000Z', '2026-07-18T00:00:00.000Z'
     )`,
    [id, nonceSeed.repeat(64), messageSeed.repeat(64), "a".repeat(64)],
  );

  const consumeWalletAuthenticationChallenge = async (id: string) => requiredClient().query(
    `UPDATE campaign_os.wallet_auth_challenges
     SET status = 'consumed', state_version = state_version + 1,
       consumed_at = '2026-07-18T00:00:01.000Z',
       terminal_at = '2026-07-18T00:00:01.000Z',
       terminal_code = 'CHALLENGE_CONSUMED',
       updated_at = '2026-07-18T00:00:01.000Z'
     WHERE id = $1`,
    [id],
  );

  const expectSqlError = async (
    text: string,
    values: readonly unknown[],
    code: string,
  ) => {
    const sqlClient = requiredClient();
    const savepoint = `migration_sql_error_${++savepointSequence}`;
    await sqlClient.query(`SAVEPOINT ${savepoint}`);
    let caught: unknown;

    try {
      await sqlClient.query(text, [...values]);
    } catch (error) {
      caught = error;
    }

    await sqlClient.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
    await sqlClient.query(`RELEASE SAVEPOINT ${savepoint}`);
    expect(caught).toMatchObject({ code });
  };

  const seedCampaignTask = async () => {
    const sqlClient = requiredClient();
    await sqlClient.query(
      `
        INSERT INTO campaign_os.campaigns (
          id, project_id, owner_address, status, default_locale, supported_locales,
          wallet_policy, contract_mode, goal, duration, reward_description,
          reward_disclaimer_hash, metadata_uri, metadata_hash, start_time, end_time,
          publish_readiness, created_at, updated_at
        )
        VALUES (
          $1, 'project-migration-0004', 'owner-migration-0004', 'draft', 'en-US',
          '["en-US"]'::jsonb, 'ANY', 'OFF_CHAIN_MVP', 'Migration verification',
          '30 days', 'Migration reward', NULL, NULL, NULL,
          '2026-07-16T00:00:00.000Z', '2026-08-16T00:00:00.000Z', '{}'::jsonb,
          '2026-07-16T00:00:00.000Z', '2026-07-16T00:00:00.000Z'
        )
      `,
      [campaignId],
    );
    await sqlClient.query(
      `
        INSERT INTO campaign_os.campaign_tasks (
          id, campaign_id, template_code, verification_type, wallet_compatibility,
          points, required, evidence_rule, created_at, updated_at
        )
        VALUES (
          $1, $2, 'migration-task', 'ON_CHAIN', 'ANY', 120, true,
          '{"source":"AELFSCAN"}'::jsonb,
          '2026-07-16T00:00:00.000Z', '2026-07-16T00:00:00.000Z'
        )
      `,
      [taskId, campaignId],
    );
  };

  const insertRunningAttempt = async (
    id: string,
    idempotencyKey = "1".repeat(64),
  ) => {
    await requiredClient().query(
      `
        INSERT INTO campaign_os.verification_attempts (
          id, idempotency_key, campaign_id, task_id, task_revision, wallet_address,
          account_type, wallet_source, binding_id, binding_revision, provider_ref,
          verification_type, task_revision_digest, evidence_rule_digest, status,
          dispatch_state, lease_token_hash, lease_expires_at, fence, attempt_count,
          max_attempts, retry_posture, diagnostic_codes, trace_id, created_at, updated_at
        )
        VALUES (
          $1, $2, $3, $4, 1, $5, 'EOA', 'PORTKEY_EOA_EXTENSION',
          'binding-migration-0004', 1, 'provider-migration-0004', 'ON_CHAIN',
          $6, $7, 'running', 'not_started', $8,
          '2026-07-16T00:10:00.000Z', 1, 1, 3, 'none', '[]'::jsonb,
          'trace-migration-0004', '2026-07-16T00:00:00.000Z',
          '2026-07-16T00:00:00.000Z'
        )
      `,
      [
        id,
        idempotencyKey,
        campaignId,
        taskId,
        walletAddress,
        TASK_REVISION_DIGEST,
        EVIDENCE_RULE_DIGEST,
        LEASE_TOKEN_HASH,
      ],
    );
  };

  const insertCompletedAttempt = async () => {
    await requiredClient().query(
      `
        INSERT INTO campaign_os.verification_attempts (
          id, idempotency_key, campaign_id, task_id, task_revision, wallet_address,
          account_type, wallet_source, binding_id, binding_revision, provider_ref,
          verification_type, task_revision_digest, evidence_rule_digest, request_digest,
          status, dispatch_state, fence, attempt_count, max_attempts, response_digest,
          provider_code, retry_posture, diagnostic_codes, trace_id, evidence_hash,
          evidence_ref, evidence_source, finalization_digest, transport_started_at,
          transport_finished_at, completed_at, created_at, updated_at
        )
        VALUES (
          'attempt-live-evidence', $1, $2, $3, 1, $4, 'EOA',
          'PORTKEY_EOA_EXTENSION', 'binding-migration-0004', 1,
          'provider-migration-0004', 'ON_CHAIN', $5, $6, $7, 'completed',
          'result_observed', 1, 1, 3, $8, 'MATCH_CONFIRMED', 'none',
          '["PROVIDER_MATCH_CONFIRMED"]'::jsonb, 'trace-migration-live-evidence',
          $9, 'provider-evidence:migration-0004', 'AELFSCAN', $10,
          '2026-07-16T00:00:01.000Z', '2026-07-16T00:00:02.000Z',
          '2026-07-16T00:00:02.000Z', '2026-07-16T00:00:00.000Z',
          '2026-07-16T00:00:02.000Z'
        )
      `,
      [
        "2".repeat(64),
        campaignId,
        taskId,
        walletAddress,
        TASK_REVISION_DIGEST,
        EVIDENCE_RULE_DIGEST,
        REQUEST_DIGEST,
        RESPONSE_DIGEST,
        EVIDENCE_HASH,
        FINALIZATION_DIGEST,
      ],
    );
  };

  beforeAll(async () => {
    adminPool = createPostgresPool(TEST_DATABASE_URL!);
    await adminPool.query(`CREATE DATABASE "${databaseName}"`);
    databasePool = createPostgresPool(
      isolatedPostgresDatabaseUrl(TEST_DATABASE_URL!, databaseName),
    );
    client = await databasePool.connect();
    const migrations = await loadPostgresMigrations();
    liveProviderMigration = migrations.find(
      ({ id }) => id === "0004_live_provider_task_verification",
    );
    walletAuthenticationMigration = migrations.find(
      ({ id }) => id === "0005_participant_wallet_authentication",
    );

    for (const definition of migrations) {
      await client.query(definition.upSql);
    }
  }, 60_000);

  beforeEach(async () => {
    savepointSequence = 0;
    await requiredClient().query("BEGIN");
  });

  afterEach(async () => {
    await requiredClient().query("ROLLBACK");
  });

  afterAll(async () => {
    client?.release();
    client = undefined;
    await databasePool?.end();
    databasePool = undefined;
    if (adminPool) {
      await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
      await adminPool.end();
      adminPool = undefined;
    }
  }, 60_000);

  it("preserves revision-one attempt lineage when a Task advances revision or is deleted", async () => {
    const sqlClient = requiredClient();
    await seedCampaignTask();
    await expectSqlError(
      `
        UPDATE campaign_os.campaign_tasks
        SET updated_at = '2026-07-16T00:00:15.000Z'
        WHERE campaign_id = $1 AND id = $2
      `,
      [campaignId, taskId],
      "23514",
    );
    await insertRunningAttempt("attempt-revision-lineage");

    await expectSqlError(
      `
        UPDATE campaign_os.campaign_tasks
        SET points = 121, updated_at = '2026-07-16T00:00:30.000Z'
        WHERE campaign_id = $1 AND id = $2
      `,
      [campaignId, taskId],
      "23514",
    );
    await expectSqlError(
      `
        UPDATE campaign_os.campaign_tasks
        SET revision = 3, points = 180, updated_at = '2026-07-16T00:01:00.000Z'
        WHERE campaign_id = $1 AND id = $2
      `,
      [campaignId, taskId],
      "23514",
    );
    await expect(sqlClient.query(
      `
        UPDATE campaign_os.campaign_tasks
        SET revision = 2, points = 180, updated_at = '2026-07-16T00:01:00.000Z'
        WHERE campaign_id = $1 AND id = $2
      `,
      [campaignId, taskId],
    )).resolves.toMatchObject({ rowCount: 1 });

    const snapshots = await sqlClient.query(
      `
        SELECT revision, points, task_updated_at
        FROM campaign_os.campaign_task_revisions
        WHERE campaign_id = $1 AND task_id = $2
        ORDER BY revision
      `,
      [campaignId, taskId],
    );
    expect(snapshots.rows).toEqual([
      { points: 120, revision: 1, task_updated_at: new Date("2026-07-16T00:00:00.000Z") },
      { points: 180, revision: 2, task_updated_at: new Date("2026-07-16T00:01:00.000Z") },
    ]);
    await expectSqlError(
      `UPDATE campaign_os.campaign_task_revisions SET points = 999
       WHERE campaign_id = $1 AND task_id = $2 AND revision = 1`,
      [campaignId, taskId],
      "55000",
    );

    await expect(sqlClient.query(
      "DELETE FROM campaign_os.campaign_tasks WHERE campaign_id = $1 AND id = $2",
      [campaignId, taskId],
    )).resolves.toMatchObject({ rowCount: 1 });
    const lineage = await sqlClient.query(
      `
        SELECT
          (SELECT COUNT(*)::integer FROM campaign_os.verification_attempts) AS attempts,
          (SELECT COUNT(*)::integer FROM campaign_os.campaign_task_revisions) AS revisions
      `,
    );
    expect(lineage.rows[0]).toEqual({ attempts: 1, revisions: 2 });
  });

  it("rejects unreachable state, dispatch, lease, and result combinations", async () => {
    const sqlClient = requiredClient();
    await seedCampaignTask();
    await insertRunningAttempt("attempt-impossible-result");

    await expectSqlError(
      `
        UPDATE campaign_os.verification_attempts
        SET dispatch_state = 'result_observed', request_digest = $2,
          response_digest = $3, provider_code = 'MATCH_CONFIRMED',
          finalization_digest = $4,
          transport_started_at = '2026-07-16T00:00:01.000Z',
          transport_finished_at = '2026-07-16T00:00:02.000Z',
          completed_at = '2026-07-16T00:00:02.000Z',
          updated_at = '2026-07-16T00:00:02.000Z'
        WHERE id = $1
      `,
      ["attempt-impossible-result", REQUEST_DIGEST, RESPONSE_DIGEST, FINALIZATION_DIGEST],
      "23514",
    );
    await expectSqlError(
      "UPDATE campaign_os.verification_attempts SET finalization_digest = $2 WHERE id = $1",
      ["attempt-impossible-result", FINALIZATION_DIGEST],
      "23514",
    );

    await sqlClient.query(
      `
        UPDATE campaign_os.verification_attempts
        SET dispatch_state = 'started', request_digest = $2,
          transport_started_at = '2026-07-16T00:00:01.000Z',
          updated_at = '2026-07-16T00:00:01.000Z'
        WHERE id = $1
      `,
      ["attempt-impossible-result", REQUEST_DIGEST],
    );
    await expect(sqlClient.query(
      `
        UPDATE campaign_os.verification_attempts
        SET status = 'manual_review', lease_token_hash = NULL, lease_expires_at = NULL,
          retry_posture = 'manual_review',
          diagnostic_codes = '["TASK_VERIFICATION_OUTCOME_UNKNOWN"]'::jsonb,
          updated_at = '2026-07-16T00:00:02.000Z'
        WHERE id = $1
      `,
      ["attempt-impossible-result"],
    )).resolves.toMatchObject({ rowCount: 1 });

    await insertRunningAttempt("attempt-result-without-finalization", "3".repeat(64));
    await expectSqlError(
      `
        UPDATE campaign_os.verification_attempts
        SET status = 'failed', dispatch_state = 'result_observed',
          lease_token_hash = NULL, lease_expires_at = NULL, request_digest = $2,
          response_digest = $3, provider_code = 'NO_MATCH',
          transport_started_at = '2026-07-16T00:00:01.000Z',
          transport_finished_at = '2026-07-16T00:00:02.000Z',
          completed_at = '2026-07-16T00:00:02.000Z',
          updated_at = '2026-07-16T00:00:02.000Z'
        WHERE id = $1
      `,
      ["attempt-result-without-finalization", REQUEST_DIGEST, RESPONSE_DIGEST],
      "23514",
    );
  });

  it("rejects direct SQL values that the verification-attempt codec cannot decode", async () => {
    await seedCampaignTask();
    await insertRunningAttempt("attempt-codec-parity");

    for (const [column, value] of [
      ["id", "attempt-codec\nparity"],
      ["binding_id", "binding-codec\rparity"],
      ["provider_ref", "provider-codec\tparity"],
    ] as const) {
      await expectSqlError(
        `UPDATE campaign_os.verification_attempts SET ${column} = $2 WHERE id = $1`,
        ["attempt-codec-parity", value],
        "23514",
      );
    }

    for (const diagnosticCodes of [
      "{}",
      "[1]",
      '["unsafe-code"]',
      '["DUPLICATE_CODE","DUPLICATE_CODE"]',
    ]) {
      await expectSqlError(
        "UPDATE campaign_os.verification_attempts SET diagnostic_codes = $2::jsonb WHERE id = $1",
        ["attempt-codec-parity", diagnosticCodes],
        "23514",
      );
    }

    await expectSqlError(
      "UPDATE campaign_os.verification_attempts SET evidence_ref = $2 WHERE id = $1",
      ["attempt-codec-parity", "https://unsafe.example/evidence"],
      "23514",
    );
  });

  it("revalidates live Evidence when ref, points, or completion linkage changes", async () => {
    const sqlClient = requiredClient();
    await seedCampaignTask();
    await insertCompletedAttempt();
    await sqlClient.query(
      `
        INSERT INTO campaign_os.campaign_task_completions (
          id, campaign_id, task_id, wallet_address, account_type, wallet_source,
          status, evidence_source, evidence_id, evidence_hash, points_awarded,
          completed_at, created_at, updated_at, verification_attempt_id
        )
        VALUES (
          'completion-live-evidence', $1, $2, $3, 'EOA', 'PORTKEY_EOA_EXTENSION',
          'completed', 'AELFSCAN', 'evidence-live-evidence', $4, 120,
          '2026-07-16T00:00:02.000Z', '2026-07-16T00:00:02.000Z',
          '2026-07-16T00:00:02.000Z', 'attempt-live-evidence'
        )
      `,
      [campaignId, taskId, walletAddress, EVIDENCE_HASH],
    );
    await sqlClient.query(
      `
        INSERT INTO campaign_os.campaign_task_evidence (
          id, campaign_id, task_id, wallet_address, completion_id, account_type,
          wallet_source, status, evidence_source, evidence_hash, evidence_ref,
          diagnostic_codes, points_awarded, captured_at, live_contract_executed,
          live_provider_executed, live_reward_executed, live_storage_executed,
          created_at, updated_at, verification_attempt_id
        )
        VALUES (
          'evidence-live-evidence', $1, $2, $3, 'completion-live-evidence', 'EOA',
          'PORTKEY_EOA_EXTENSION', 'completed', 'AELFSCAN', $4,
          'provider-evidence:migration-0004', '["PROVIDER_MATCH_CONFIRMED"]'::jsonb,
          120, '2026-07-16T00:00:02.000Z', false, true, false, false,
          '2026-07-16T00:00:02.000Z', '2026-07-16T00:00:02.000Z',
          'attempt-live-evidence'
        )
      `,
      [campaignId, taskId, walletAddress, EVIDENCE_HASH],
    );

    await expectSqlError(
      "UPDATE campaign_os.campaign_task_evidence SET evidence_ref = $2 WHERE id = $1",
      ["evidence-live-evidence", "provider-evidence:mismatch"],
      "23514",
    );
    await expectSqlError(
      "UPDATE campaign_os.campaign_task_evidence SET points_awarded = 121 WHERE id = $1",
      ["evidence-live-evidence"],
      "23514",
    );
    await expectSqlError(
      "UPDATE campaign_os.campaign_task_evidence SET completion_id = $2 WHERE id = $1",
      ["evidence-live-evidence", "completion-mismatch"],
      "23503",
    );
    await expectSqlError(
      `UPDATE campaign_os.campaign_task_evidence
       SET captured_at = '2026-07-16T00:00:03.000Z' WHERE id = $1`,
      ["evidence-live-evidence"],
      "23514",
    );
    await expectSqlError(
      `UPDATE campaign_os.campaign_task_completions
       SET completed_at = '2026-07-16T00:00:03.000Z' WHERE id = $1`,
      ["completion-live-evidence"],
      "23514",
    );
    await expectSqlError(
      "UPDATE campaign_os.campaign_task_completions SET points_awarded = 121 WHERE id = $1",
      ["completion-live-evidence"],
      "23514",
    );
    await expectSqlError(
      `UPDATE campaign_os.verification_attempts
       SET status = 'failed', evidence_hash = NULL, evidence_ref = NULL, evidence_source = NULL
       WHERE id = $1`,
      ["attempt-live-evidence"],
      "55000",
    );
    await expectSqlError(
      "UPDATE campaign_os.verification_attempts SET provider_code = 'NO_MATCH' WHERE id = $1",
      ["attempt-live-evidence"],
      "55000",
    );
    await expectSqlError(
      "UPDATE campaign_os.verification_attempts SET evidence_ref = $2 WHERE id = $1",
      ["attempt-live-evidence", "provider-evidence:rewritten"],
      "55000",
    );
    await expectSqlError(
      "DELETE FROM campaign_os.verification_attempts WHERE id = $1",
      ["attempt-live-evidence"],
      "55000",
    );

    const durableFacts = await sqlClient.query(
      `SELECT
        attempt.status AS attempt_status,
        attempt.provider_code,
        attempt.evidence_ref AS attempt_evidence_ref,
        evidence.evidence_ref,
        evidence.points_awarded,
        evidence.completion_id
       FROM campaign_os.verification_attempts AS attempt
       JOIN campaign_os.campaign_task_evidence AS evidence
         ON evidence.verification_attempt_id = attempt.id
       WHERE evidence.id = $1`,
      ["evidence-live-evidence"],
    );
    expect(durableFacts.rows[0]).toEqual({
      attempt_evidence_ref: "provider-evidence:migration-0004",
      attempt_status: "completed",
      completion_id: "completion-live-evidence",
      evidence_ref: "provider-evidence:migration-0004",
      points_awarded: 120,
      provider_code: "MATCH_CONFIRMED",
    });
  });

  it("refuses down with attempt data", async () => {
    const sqlClient = requiredClient();
    const migration0004 = requiredLiveProviderMigration();
    await seedCampaignTask();
    await insertRunningAttempt("attempt-down-guard");

    await expectSqlError(migration0004.downSql, [], "55000");
    await expect(sqlClient.query(
      "SELECT COUNT(*)::integer AS count FROM campaign_os.verification_attempts",
    )).resolves.toMatchObject({ rows: [{ count: 1 }] });
  });

  it("refuses down with advanced or detached multi-version Task lineage", async () => {
    const sqlClient = requiredClient();
    const migration0004 = requiredLiveProviderMigration();
    await seedCampaignTask();
    await sqlClient.query(
      `
        UPDATE campaign_os.campaign_tasks
        SET revision = 2, points = 180, updated_at = '2026-07-16T00:01:00.000Z'
        WHERE campaign_id = $1 AND id = $2
      `,
      [campaignId, taskId],
    );

    await expectSqlError(migration0004.downSql, [], "55000");
    await sqlClient.query(
      "DELETE FROM campaign_os.campaign_tasks WHERE campaign_id = $1 AND id = $2",
      [campaignId, taskId],
    );
    await expectSqlError(migration0004.downSql, [], "55000");
    await expect(sqlClient.query(
      "SELECT COUNT(*)::integer AS count FROM campaign_os.campaign_task_revisions",
    )).resolves.toMatchObject({ rows: [{ count: 2 }] });
  });

  it("refuses down when deleting a revision-one Task leaves a detached snapshot", async () => {
    const sqlClient = requiredClient();
    const migration0004 = requiredLiveProviderMigration();
    await seedCampaignTask();
    await sqlClient.query(
      "DELETE FROM campaign_os.campaign_tasks WHERE campaign_id = $1 AND id = $2",
      [campaignId, taskId],
    );

    await expectSqlError(migration0004.downSql, [], "55000");
    await expect(sqlClient.query(
      `SELECT COUNT(*)::integer AS count
       FROM campaign_os.campaign_task_revisions
       WHERE campaign_id = $1 AND task_id = $2`,
      [campaignId, taskId],
    )).resolves.toMatchObject({ rows: [{ count: 1 }] });
  });

  it("backfills historical Task revision one without changing canonical row bytes", async () => {
    const sqlClient = requiredClient();
    const migration0004 = requiredLiveProviderMigration();
    const historicalTaskId = "t".repeat(200);
    await sqlClient.query(migration0004.downSql);
    await seedCampaignTask();
    await sqlClient.query(
      `UPDATE campaign_os.campaign_tasks
       SET id = $1, template_code = ' padded-historical-template '
       WHERE id = $2`,
      [historicalTaskId, taskId],
    );
    const before = await sqlClient.query(
      "SELECT to_jsonb(task_row) AS row FROM campaign_os.campaign_tasks AS task_row",
    );

    await sqlClient.query(migration0004.upSql);
    const afterUp = await sqlClient.query(
      `SELECT to_jsonb(task_row) - 'revision' AS row, revision
       FROM campaign_os.campaign_tasks AS task_row`,
    );
    expect(afterUp.rows[0]).toEqual({ revision: 1, row: before.rows[0]?.row });
    await expect(sqlClient.query(
      `SELECT revision, points FROM campaign_os.campaign_task_revisions
       WHERE campaign_id = $1 AND task_id = $2`,
      [campaignId, historicalTaskId],
    )).resolves.toMatchObject({ rows: [{ points: 120, revision: 1 }] });

    await sqlClient.query(migration0004.downSql);
    const afterDown = await sqlClient.query(
      "SELECT to_jsonb(task_row) AS row FROM campaign_os.campaign_tasks AS task_row",
    );
    expect(afterDown.rows[0]?.row).toEqual(before.rows[0]?.row);
    const restoredConstraint = await sqlClient.query(
      `
        SELECT pg_get_constraintdef(oid) AS definition
        FROM pg_constraint
        WHERE conname = 'campaign_task_evidence_live_provider_executed_check'
      `,
    );
    expect(normalizeSql(restoredConstraint.rows[0]?.definition ?? "")).toContain(
      "CHECK ((live_provider_executed = false))",
    );
  });

  it("creates the exact wallet authentication columns, constraints, and hot-path indexes", async () => {
    const sqlClient = requiredClient();
    const columns = await sqlClient.query(
      `SELECT table_name, column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'campaign_os'
         AND table_name IN ('wallet_auth_challenges', 'wallet_sessions')
       ORDER BY table_name, ordinal_position`,
    );
    const columnKeys = columns.rows.map((row) => [
      row.table_name,
      row.column_name,
      row.data_type,
      row.is_nullable,
    ].join(":"));
    expect(columns.rows
      .filter((row) => row.table_name === "wallet_auth_challenges")
      .map((row) => row.column_name)).toEqual([
      "id",
      "version",
      "wallet_address",
      "subject_key",
      "adapter_id",
      "chain_id",
      "network",
      "ca_hash",
      "nonce_digest",
      "message_digest",
      "client_fingerprint_digest",
      "status",
      "state_version",
      "verification_attempts",
      "rate_window_started_at",
      "rate_attempt_count",
      "issued_at",
      "expires_at",
      "consumed_at",
      "terminal_at",
      "terminal_code",
      "trace_id",
      "created_at",
      "updated_at",
    ]);
    expect(columns.rows
      .filter((row) => row.table_name === "wallet_sessions")
      .map((row) => row.column_name)).toEqual([
      "id",
      "credential_digest",
      "csrf_token_digest",
      "challenge_id",
      "subject_key",
      "wallet_address",
      "account_type",
      "wallet_source",
      "chain_id",
      "network",
      "adapter_id",
      "proof_method",
      "signer_address",
      "ca_hash",
      "proof_digest",
      "verified_at",
      "credential_boundary",
      "role_ids",
      "capabilities",
      "status",
      "version",
      "membership_revision",
      "issued_at",
      "last_seen_at",
      "idle_expires_at",
      "absolute_expires_at",
      "revoked_at",
      "revocation_code",
      "last_trace_id",
      "created_at",
      "updated_at",
    ]);
    expect(columnKeys).toEqual(expect.arrayContaining([
      "wallet_auth_challenges:id:text:NO",
      "wallet_auth_challenges:message_digest:text:NO",
      "wallet_auth_challenges:nonce_digest:text:NO",
      "wallet_auth_challenges:state_version:integer:NO",
      "wallet_auth_challenges:subject_key:text:NO",
      "wallet_auth_challenges:client_fingerprint_digest:text:YES",
      "wallet_auth_challenges:rate_attempt_count:integer:NO",
      "wallet_auth_challenges:consumed_at:timestamp with time zone:YES",
      "wallet_auth_challenges:expires_at:timestamp with time zone:NO",
      "wallet_sessions:id:text:NO",
      "wallet_sessions:challenge_id:text:NO",
      "wallet_sessions:credential_digest:text:NO",
      "wallet_sessions:csrf_token_digest:text:NO",
      "wallet_sessions:subject_key:text:NO",
      "wallet_sessions:role_ids:jsonb:NO",
      "wallet_sessions:capabilities:jsonb:NO",
      "wallet_sessions:idle_expires_at:timestamp with time zone:NO",
      "wallet_sessions:absolute_expires_at:timestamp with time zone:NO",
      "wallet_sessions:revoked_at:timestamp with time zone:YES",
      "wallet_sessions:last_trace_id:text:NO",
    ]));

    const constraints = await sqlClient.query(
      `SELECT conname, contype, pg_get_constraintdef(oid) AS definition
       FROM pg_constraint
       WHERE connamespace = 'campaign_os'::regnamespace
         AND conrelid IN (
           'campaign_os.wallet_auth_challenges'::regclass,
           'campaign_os.wallet_sessions'::regclass
         )
       ORDER BY conname`,
    );
    const constraintDefinitions = constraints.rows.map((row) =>
      `${String(row.conname)}:${String(row.contype)}:${normalizeSql(String(row.definition))}`,
    ).join("\n");
    for (const requiredConstraint of [
      "campaign_os_wallet_auth_challenges_message_digest_key:u",
      "campaign_os_wallet_auth_challenges_nonce_digest_key:u",
      "campaign_os_wallet_sessions_challenge_fk:f",
      "campaign_os_wallet_sessions_challenge_key:u",
      "campaign_os_wallet_sessions_credential_digest_key:u",
      "campaign_os_wallet_sessions_csrf_token_digest_key:u",
      "octet_length(message_digest) = 64",
      "octet_length(credential_digest) = 64",
      "idle_expires_at <= absolute_expires_at",
      "ON DELETE RESTRICT",
    ]) {
      expect(constraintDefinitions).toContain(requiredConstraint);
    }

    const triggers = await sqlClient.query(
      `SELECT tgname
       FROM pg_trigger
       WHERE tgrelid IN (
         'campaign_os.wallet_auth_challenges'::regclass,
         'campaign_os.wallet_sessions'::regclass
       )
         AND NOT tgisinternal
       ORDER BY tgname`,
    );
    expect(triggers.rows.map((row) => row.tgname)).toEqual([
      "wallet_auth_challenge_insert_guard",
      "wallet_auth_challenge_transition_guard",
      "wallet_session_challenge_guard",
      "wallet_session_transition_guard",
    ]);

    const indexes = await sqlClient.query(
      `SELECT indexname, indexdef
       FROM pg_indexes
       WHERE schemaname = 'campaign_os'
         AND tablename IN ('wallet_auth_challenges', 'wallet_sessions')
       ORDER BY indexname`,
    );
    const indexDefinitions = indexes.rows.map((row) =>
      `${String(row.indexname)}:${normalizeSql(String(row.indexdef))}`,
    ).join("\n");
    for (const requiredIndex of [
      "campaign_os_wallet_auth_challenges_state_expiry_idx",
      "campaign_os_wallet_auth_challenges_subject_state_idx",
      "campaign_os_wallet_auth_challenges_fingerprint_rate_idx",
      "campaign_os_wallet_sessions_credential_digest_key",
      "campaign_os_wallet_sessions_pkey",
      "campaign_os_wallet_sessions_subject_inventory_idx",
      "campaign_os_wallet_sessions_expiry_idx",
    ]) {
      expect(indexDefinitions).toContain(requiredIndex);
    }
  });

  it("enforces challenge and session creation and terminal state machines", async () => {
    const sqlClient = requiredClient();
    await insertWalletAuthenticationChallenge("challenge-valid", "1", "2");

    for (const statement of [
      "UPDATE campaign_os.wallet_auth_challenges SET message_digest = 'ABC' WHERE id = 'challenge-valid'",
      "UPDATE campaign_os.wallet_auth_challenges SET status = 'consumed' WHERE id = 'challenge-valid'",
      "UPDATE campaign_os.wallet_auth_challenges SET expires_at = issued_at WHERE id = 'challenge-valid'",
      "UPDATE campaign_os.wallet_auth_challenges SET state_version = 0 WHERE id = 'challenge-valid'",
    ]) {
      await expectSqlError(statement, [], "55000");
    }

    await expectSqlError(
      `INSERT INTO campaign_os.wallet_auth_challenges (
         id, version, wallet_address, subject_key, adapter_id, chain_id, network,
         nonce_digest, message_digest, status, state_version, verification_attempts,
         rate_window_started_at, rate_attempt_count, issued_at, expires_at,
         terminal_at, terminal_code, trace_id, created_at, updated_at
       ) VALUES (
         'challenge-terminal-insert', 'campaign-os-wallet-auth/v1', 'wallet-safe', $3,
         'portkey-eoa', 'AELF', 'mainnet', $1, $2, 'rejected', 2, 1,
         '2026-07-18T00:00:00.000Z', 1, '2026-07-18T00:00:00.000Z',
         '2026-07-18T00:10:00.000Z', '2026-07-18T00:00:01.000Z',
         'INVALID_PROOF', 'trace-terminal-insert', '2026-07-18T00:00:00.000Z',
         '2026-07-18T00:00:01.000Z'
       )`,
      ["3".repeat(64), "4".repeat(64), "a".repeat(64)],
      "23514",
    );

    const validSessionValues = walletSessionValues({
      challengeId: "challenge-valid",
      credentialSeed: "4",
      csrfSeed: "5",
      id: "session-valid",
    });
    await expectSqlError(walletSessionInsertSql, validSessionValues, "23514");
    await consumeWalletAuthenticationChallenge("challenge-valid");
    await expectSqlError(
      walletSessionInsertSql,
      walletSessionValues({
        challengeId: "challenge-valid",
        credentialSeed: "4",
        csrfSeed: "5",
        id: "session-terminal-insert",
        revocationCode: "LOGOUT",
        revokedAt: "2026-07-18T00:00:03.000Z",
        status: "revoked",
        version: 2,
      }),
      "23514",
    );
    await sqlClient.query(walletSessionInsertSql, [...validSessionValues]);

    for (const [statement, code] of [
      ["UPDATE campaign_os.wallet_sessions SET version = 0 WHERE id = 'session-valid'", "55000"],
      ["UPDATE campaign_os.wallet_sessions SET csrf_token_digest = 'short' WHERE id = 'session-valid'", "55000"],
      ["UPDATE campaign_os.wallet_sessions SET status = 'revoked' WHERE id = 'session-valid'", "55000"],
      ["UPDATE campaign_os.wallet_sessions SET idle_expires_at = absolute_expires_at + interval '1 second' WHERE id = 'session-valid'", "23514"],
      ["UPDATE campaign_os.wallet_sessions SET proof_method = 'PORTKEY_AA_MANAGER_CA' WHERE id = 'session-valid'", "55000"],
    ] as const) {
      await expectSqlError(statement, [], code);
    }

    await sqlClient.query(
      `UPDATE campaign_os.wallet_sessions
       SET status = 'revoked', version = version + 1,
         revoked_at = '2026-07-18T00:00:03.000Z', revocation_code = 'LOGOUT',
         last_trace_id = 'trace-session-revoke',
         updated_at = '2026-07-18T00:00:03.000Z'
       WHERE id = 'session-valid'`,
    );
    for (const statement of [
      "UPDATE campaign_os.wallet_sessions SET status = 'active' WHERE id = 'session-valid'",
      `UPDATE campaign_os.wallet_sessions SET proof_digest = '${"9".repeat(64)}' WHERE id = 'session-valid'`,
      "UPDATE campaign_os.wallet_auth_challenges SET status = 'issued' WHERE id = 'challenge-valid'",
      "UPDATE campaign_os.wallet_auth_challenges SET wallet_address = 'wallet-rewritten' WHERE id = 'challenge-valid'",
    ]) {
      await expectSqlError(statement, [], "55000");
    }
  });

  it("rejects malformed, duplicate, and non-string role or capability JSON", async () => {
    await insertWalletAuthenticationChallenge("challenge-json-arrays", "7", "8");
    await consumeWalletAuthenticationChallenge("challenge-json-arrays");

    const invalidArrays = [
      { roleIds: { participant: true } },
      { roleIds: ["participant", "participant"] },
      { roleIds: [7] },
      { capabilities: "campaign:read" },
      { capabilities: ["campaign:read", "campaign:read"] },
      { capabilities: [false] },
    ];
    for (const [index, invalid] of invalidArrays.entries()) {
      await expectSqlError(
        walletSessionInsertSql,
        walletSessionValues({
          ...invalid,
          challengeId: "challenge-json-arrays",
          credentialSeed: "9",
          csrfSeed: "a",
          id: `session-invalid-json-${index}`,
        }),
        "23514",
      );
    }
  });

  it("applies additively over historical rows without changing their byte projection", async () => {
    const sqlClient = requiredClient();
    const migration0005 = requiredWalletAuthenticationMigration();
    await sqlClient.query(migration0005.downSql);
    await seedCampaignTask();
    const before = await sqlClient.query(
      `SELECT jsonb_build_object(
         'campaigns', (SELECT jsonb_agg(to_jsonb(row_value) ORDER BY row_value.id) FROM campaign_os.campaigns AS row_value),
         'tasks', (SELECT jsonb_agg(to_jsonb(row_value) ORDER BY row_value.id) FROM campaign_os.campaign_tasks AS row_value),
         'revisions', (SELECT jsonb_agg(to_jsonb(row_value) ORDER BY row_value.task_id, row_value.revision) FROM campaign_os.campaign_task_revisions AS row_value)
       ) AS projection`,
    );

    await sqlClient.query(migration0005.upSql);
    const after = await sqlClient.query(
      `SELECT jsonb_build_object(
         'campaigns', (SELECT jsonb_agg(to_jsonb(row_value) ORDER BY row_value.id) FROM campaign_os.campaigns AS row_value),
         'tasks', (SELECT jsonb_agg(to_jsonb(row_value) ORDER BY row_value.id) FROM campaign_os.campaign_tasks AS row_value),
         'revisions', (SELECT jsonb_agg(to_jsonb(row_value) ORDER BY row_value.task_id, row_value.revision) FROM campaign_os.campaign_task_revisions AS row_value)
       ) AS projection`,
    );
    expect(after.rows[0]?.projection).toEqual(before.rows[0]?.projection);
  });

  it("refuses 0005 down when authentication rows exist and preserves historical rows", async () => {
    const sqlClient = requiredClient();
    const migration0005 = requiredWalletAuthenticationMigration();
    await seedCampaignTask();
    await sqlClient.query(
      `INSERT INTO campaign_os.wallet_auth_challenges (
         id, version, wallet_address, subject_key, adapter_id, chain_id, network,
         nonce_digest, message_digest, client_fingerprint_digest, status,
         state_version, verification_attempts, rate_window_started_at,
         rate_attempt_count, issued_at, expires_at, trace_id, created_at, updated_at
       ) VALUES (
         'challenge-down-guard', 'campaign-os-wallet-auth/v1', 'wallet-down-guard',
         $3, 'nightelf', 'AELF', 'testnet', $1, $2, NULL, 'issued', 1, 0,
         '2026-07-18T00:00:00.000Z', 0,
         '2026-07-18T00:00:00.000Z', '2026-07-18T00:10:00.000Z',
         'trace-down-guard', '2026-07-18T00:00:00.000Z',
         '2026-07-18T00:00:00.000Z'
       )`,
      ["7".repeat(64), "8".repeat(64), "d".repeat(64)],
    );

    await expectSqlError(migration0005.downSql, [], "55000");
    await expect(sqlClient.query(
      "SELECT COUNT(*)::integer AS count FROM campaign_os.campaign_tasks WHERE id = $1",
      [taskId],
    )).resolves.toMatchObject({ rows: [{ count: 1 }] });
    await expect(sqlClient.query(
      "SELECT COUNT(*)::integer AS count FROM campaign_os.wallet_auth_challenges",
    )).resolves.toMatchObject({ rows: [{ count: 1 }] });
  });
});

postgresMigrationSqlSuite("PostgreSQL 0006 durable task template catalog invariants", () => {
  interface IsolatedDatabaseContext {
    openRestartPool(): pg.Pool;
    pool: pg.Pool;
  }

  const databaseNames = new Set<string>();
  let adminPool: pg.Pool | undefined;
  let savepointSequence = 0;

  const requiredAdminPool = () => {
    if (!adminPool) {
      throw new Error("Migration SQL acceptance admin pool is unavailable.");
    }

    return adminPool;
  };

  const withIsolatedDatabase = async (
    run: (context: IsolatedDatabaseContext) => Promise<void>,
  ) => {
    const databaseName = `campaign_os_m246_${process.pid}_${randomUUID()
      .replace(/-/g, "")
      .slice(0, 12)}`;
    const administrator = requiredAdminPool();
    await administrator.query(`CREATE DATABASE "${databaseName}"`);
    databaseNames.add(databaseName);
    const databaseUrl = isolatedPostgresDatabaseUrl(TEST_DATABASE_URL!, databaseName);
    const pool = createPostgresPool(databaseUrl);

    try {
      await run({
        openRestartPool: () => createPostgresPool(databaseUrl),
        pool,
      });
    } finally {
      await pool.end();
      await administrator.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
      databaseNames.delete(databaseName);
    }
  };

  const migrationPool = (pool: pg.Pool) =>
    pool as unknown as PostgresMigrationPool;

  const requiredMigration = (
    migrations: readonly PostgresMigrationDefinition[],
    id: string,
  ) => {
    const definition = migrations.find((candidate) => candidate.id === id);

    if (!definition) {
      throw new Error("Required migration definition is unavailable.");
    }

    return definition;
  };

  const applyMigrations = (
    pool: pg.Pool,
    migrations: readonly PostgresMigrationDefinition[],
    traceId: string,
  ) => runPostgresMigrations({
    approved: true,
    migrations,
    mode: "apply",
    pool: migrationPool(pool),
    traceId,
  });

  const expectSqlState = async (
    client: PoolClient,
    text: string,
    values: readonly unknown[],
    expectedCode: string,
  ) => {
    const savepoint = `m246_expected_error_${++savepointSequence}`;
    await client.query(`SAVEPOINT ${savepoint}`);
    let observedCode: unknown;

    try {
      await client.query(text, [...values]);
    } catch (error) {
      observedCode = error && typeof error === "object" && "code" in error
        ? (error as { code?: unknown }).code
        : undefined;
    }

    await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
    await client.query(`RELEASE SAVEPOINT ${savepoint}`);

    if (observedCode !== expectedCode) {
      throw new Error(`Expected PostgreSQL SQLSTATE ${expectedCode}.`);
    }
  };

  const catalogRows = (pool: pg.Pool) => pool.query(`
    SELECT
      template_code, version, catalog_schema_version, status, adoption_mode,
      category, verification_type, wallet_compatibility, default_points,
      minimum_points, maximum_points, required_by_default,
      required_override_allowed, risk_level, supported_locales,
      localized_content, locale_readiness, evidence_rule, checksum
    FROM campaign_os.task_template_catalog_versions
    ORDER BY template_code COLLATE "C" ASC, version ASC
  `);

  beforeAll(async () => {
    adminPool = createPostgresPool(TEST_DATABASE_URL!);
  });

  afterAll(async () => {
    const administrator = adminPool;
    if (administrator) {
      for (const databaseName of databaseNames) {
        await administrator.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
      }
      databaseNames.clear();
      await administrator.end();
      adminPool = undefined;
    }
  }, 60_000);

  it("applies fresh 0001..0006, reconciles the exact seed, survives restart, and reruns without writes", async () => {
    await withIsolatedDatabase(async ({ openRestartPool, pool }) => {
      const migrations = await loadPostgresMigrations();
      const firstApply = await applyMigrations(pool, migrations, "trace-m246-fresh");

      expect(firstApply.status).toBe("ready");
      expect(firstApply.appliedMigrationIds).toEqual(migrations.map(({ id }) => id));

      const ledger = await pool.query(
        "SELECT COUNT(*)::integer AS count FROM campaign_os.schema_migrations",
      );
      expect(ledger.rows[0]?.count).toBe(6);

      const catalogColumns = await pool.query(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = 'campaign_os'
           AND table_name = 'task_template_catalog_versions'
         ORDER BY ordinal_position`,
      );
      expect(catalogColumns.rows.map(({ column_name }) => column_name).join(",")).toBe(
        M246_CATALOG_COLUMNS.join(","),
      );
      const taskColumns = await pool.query(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = 'campaign_os'
           AND table_name = 'campaign_tasks'
           AND column_name = ANY($1::text[])
         ORDER BY ordinal_position`,
        [M246_TASK_COLUMNS],
      );
      expect(taskColumns.rows.map(({ column_name }) => column_name).join(",")).toBe(
        M246_TASK_COLUMNS.join(","),
      );

      const seededRows = await catalogRows(pool);
      const seededVersions = seededRows.rows.map(catalogVersionFromRow);
      const expectedVersions = [...taskTemplateCatalogManifestV1].sort(
        (left, right) => left.templateCode < right.templateCode
          ? -1
          : left.templateCode > right.templateCode
            ? 1
            : left.version - right.version,
      );
      expect(seededVersions).toHaveLength(12);
      expect(seededVersions
        .map(({ checksum, templateCode, version }) => `${templateCode}@${version}:${checksum}`)
        .join("\n")).toBe(EXPECTED_M246_TEMPLATE_IDENTITIES.join("\n"));
      expect(digestTestValue(seededVersions)).toBe(digestTestValue(expectedVersions));

      const deterministicTimestamps = await pool.query(`
        SELECT COUNT(*)::integer AS count
        FROM campaign_os.task_template_catalog_versions
        WHERE created_at = TIMESTAMPTZ '2026-07-20 00:00:00+00'
          AND updated_at = TIMESTAMPTZ '2026-07-20 00:00:00+00'
          AND deprecated_at IS NULL
          AND retired_at IS NULL
      `);
      expect(deterministicTimestamps.rows[0]?.count).toBe(12);

      const beforeRerunDigest = digestTestValue(seededVersions);
      const secondApply = await applyMigrations(pool, migrations, "trace-m246-rerun");
      expect(secondApply.status).toBe("ready");
      expect(secondApply.pendingMigrationIds).toEqual([]);
      const rerunRows = await catalogRows(pool);
      expect(digestTestValue(rerunRows.rows.map(catalogVersionFromRow))).toBe(
        beforeRerunDigest,
      );

      const restartPool = openRestartPool();
      try {
        const restartRows = await catalogRows(restartPool);
        expect(digestTestValue(restartRows.rows.map(catalogVersionFromRow))).toBe(
          beforeRerunDigest,
        );
      } finally {
        await restartPool.end();
      }

      const client = await pool.connect();
      await client.query("BEGIN");
      try {
        await expectSqlState(
          client,
          `INSERT INTO campaign_os.task_template_catalog_versions
             (template_code, version, catalog_schema_version, status, adoption_mode,
              category, verification_type, wallet_compatibility, default_points,
              minimum_points, maximum_points, required_by_default,
              required_override_allowed, risk_level, supported_locales,
              localized_content, locale_readiness, evidence_rule, checksum,
              created_at, updated_at, deprecated_at, retired_at)
           SELECT template_code, 2, catalog_schema_version, status, adoption_mode,
              category, verification_type, wallet_compatibility, default_points,
              minimum_points, maximum_points, required_by_default,
              required_override_allowed, risk_level, supported_locales,
              localized_content, locale_readiness, evidence_rule, checksum,
              created_at, updated_at, deprecated_at, retired_at
           FROM campaign_os.task_template_catalog_versions
           WHERE template_code = $1 AND version = 1`,
          ["wallet-connect"],
          "23505",
        );
        await expectSqlState(
          client,
          `INSERT INTO campaign_os.task_template_catalog_versions
           SELECT * FROM campaign_os.task_template_catalog_versions
           WHERE template_code = $1 AND version = 1`,
          ["wallet-connect"],
          "23505",
        );

        const invalidCatalogInsert = `
          INSERT INTO campaign_os.task_template_catalog_versions
            (template_code, version, catalog_schema_version, status, adoption_mode,
             category, verification_type, wallet_compatibility, default_points,
             minimum_points, maximum_points, required_by_default,
             required_override_allowed, risk_level, supported_locales,
             localized_content, locale_readiness, evidence_rule, checksum,
             created_at, updated_at, deprecated_at, retired_at)
          SELECT
            CASE WHEN $1 = 'code' THEN 'INVALID-CODE' ELSE 'invalid-' || $1 END,
            CASE WHEN $1 = 'version' THEN 0 ELSE version END,
            catalog_schema_version, status, adoption_mode, category,
            CASE WHEN $1 = 'adoption' THEN 'SOCIAL' ELSE verification_type END,
            wallet_compatibility,
            CASE WHEN $1 = 'points' THEN maximum_points + 1 ELSE default_points END,
            minimum_points, maximum_points, required_by_default,
            required_override_allowed, risk_level, supported_locales,
            CASE WHEN $1 = 'json' THEN
              jsonb_build_object(
                'en-US',
                jsonb_build_object('title', 'x', 'description', repeat('x', 70000))
              )
            ELSE localized_content END,
            locale_readiness, evidence_rule,
            CASE WHEN $1 = 'checksum' THEN repeat('z', 64) ELSE checksum END,
            created_at, updated_at, deprecated_at, retired_at
          FROM campaign_os.task_template_catalog_versions
          WHERE template_code = 'wallet-connect' AND version = 1
        `;
        for (const invalidField of [
          "adoption",
          "code",
          "version",
          "points",
          "json",
          "checksum",
        ]) {
          await expectSqlState(client, invalidCatalogInsert, [invalidField], "23514");
        }

        await client.query(
          `UPDATE campaign_os.task_template_catalog_versions
           SET status = 'deprecated',
             deprecated_at = TIMESTAMPTZ '2026-07-20 00:01:00+00',
             updated_at = TIMESTAMPTZ '2026-07-20 00:01:00+00'
           WHERE template_code = $1 AND version = 1`,
          ["wallet-connect"],
        );
        await expectSqlState(
          client,
          `UPDATE campaign_os.task_template_catalog_versions
           SET status = 'active', deprecated_at = NULL,
             updated_at = TIMESTAMPTZ '2026-07-20 00:02:00+00'
           WHERE template_code = $1 AND version = 1`,
          ["wallet-connect"],
          "55000",
        );
        await client.query(
          `UPDATE campaign_os.task_template_catalog_versions
           SET status = 'retired',
             retired_at = TIMESTAMPTZ '2026-07-20 00:02:00+00',
             updated_at = TIMESTAMPTZ '2026-07-20 00:02:00+00'
           WHERE template_code = $1 AND version = 1`,
          ["wallet-connect"],
        );
        await expectSqlState(
          client,
          `UPDATE campaign_os.task_template_catalog_versions
           SET category = 'rewritten',
             updated_at = TIMESTAMPTZ '2026-07-20 00:03:00+00'
           WHERE template_code = $1 AND version = 1`,
          ["wallet-connect"],
          "55000",
        );
      } finally {
        await client.query("ROLLBACK");
        client.release();
      }
    });
  }, 60_000);

  it("preserves existing Campaign and Task bytes while enforcing snapshots, idempotency, and references", async () => {
    await withIsolatedDatabase(async ({ pool }) => {
      const migrations = await loadPostgresMigrations();
      const historicalMigrations = migrations.slice(0, 5);
      await applyMigrations(pool, historicalMigrations, "trace-m246-existing-base");

      const campaignId = "campaign-m246-existing";
      const legacyTaskId = "task-m246-legacy";
      await pool.query(
        `INSERT INTO campaign_os.campaigns (
           id, project_id, owner_address, status, default_locale, supported_locales,
           wallet_policy, contract_mode, goal, duration, reward_description,
           reward_disclaimer_hash, metadata_uri, metadata_hash, start_time, end_time,
           publish_readiness, created_at, updated_at
         ) VALUES (
           $1, 'project-m246-existing', 'owner-m246-existing', 'draft', 'en-US',
           '["en-US"]'::jsonb, 'ANY', 'OFF_CHAIN_MVP', 'Existing migration path',
           '30 days', 'Existing reward', NULL, NULL, NULL,
           '2026-07-19T00:00:00.000Z', '2026-08-19T00:00:00.000Z', '{}'::jsonb,
           '2026-07-19T00:00:00.000Z', '2026-07-19T00:00:00.000Z'
         )`,
        [campaignId],
      );
      await pool.query(
        `INSERT INTO campaign_os.campaign_tasks (
           id, campaign_id, template_code, verification_type, wallet_compatibility,
           points, required, evidence_rule, created_at, updated_at
         ) VALUES (
           $1, $2, 'legacy-template', 'ON_CHAIN', 'ANY', 77, true,
           '{"kind":"legacy"}'::jsonb,
           '2026-07-19T00:00:00.000Z', '2026-07-19T00:00:00.000Z'
         )`,
        [legacyTaskId, campaignId],
      );

      const before = await pool.query(
        `SELECT to_jsonb(campaign_row) AS campaign_projection,
           to_jsonb(task_row) AS task_projection,
           (SELECT COUNT(*)::integer FROM campaign_os.campaigns) AS campaign_count,
           (SELECT COUNT(*)::integer FROM campaign_os.campaign_tasks) AS task_count
         FROM campaign_os.campaigns AS campaign_row
         JOIN campaign_os.campaign_tasks AS task_row
           ON task_row.campaign_id = campaign_row.id
         WHERE campaign_row.id = $1 AND task_row.id = $2`,
        [campaignId, legacyTaskId],
      );
      const beforeDigest = digestTestValue(before.rows[0]);

      await applyMigrations(pool, migrations, "trace-m246-existing-upgrade");

      const after = await pool.query(
        `SELECT to_jsonb(campaign_row) AS campaign_projection,
           to_jsonb(task_row) - ARRAY[
             'template_version',
             'template_checksum',
             'template_snapshot',
             'template_adoption_idempotency_key'
           ] AS task_projection,
           (SELECT COUNT(*)::integer FROM campaign_os.campaigns) AS campaign_count,
           (SELECT COUNT(*)::integer FROM campaign_os.campaign_tasks) AS task_count
         FROM campaign_os.campaigns AS campaign_row
         JOIN campaign_os.campaign_tasks AS task_row
           ON task_row.campaign_id = campaign_row.id
         WHERE campaign_row.id = $1 AND task_row.id = $2`,
        [campaignId, legacyTaskId],
      );
      expect(digestTestValue(after.rows[0])).toBe(beforeDigest);
      const legacyNulls = await pool.query(
        `SELECT COUNT(*)::integer AS count
         FROM campaign_os.campaign_tasks
         WHERE id = $1
           AND template_version IS NULL
           AND template_checksum IS NULL
           AND template_snapshot IS NULL
           AND template_adoption_idempotency_key IS NULL`,
        [legacyTaskId],
      );
      expect(legacyNulls.rows[0]?.count).toBe(1);

      const walletTemplate = taskTemplateCatalogManifestV1.find(
        ({ templateCode }) => templateCode === "wallet-connect",
      );
      if (!walletTemplate) {
        throw new Error("Wallet template fixture is unavailable.");
      }
      const templateSnapshot = {
        adoptionMode: "direct",
        category: walletTemplate.category,
        evidenceRule: walletTemplate.evidenceRule,
        points: walletTemplate.points.default,
        required: walletTemplate.requiredPolicy.default,
        templateChecksum: walletTemplate.checksum,
        templateCode: walletTemplate.templateCode,
        templateVersion: walletTemplate.version,
        verificationType: walletTemplate.verificationType,
        version: "task-template-snapshot-v1",
        walletCompatibility: walletTemplate.walletCompatibility,
      };
      const adoptedTaskInsertSql = `
        INSERT INTO campaign_os.campaign_tasks (
          id, campaign_id, template_code, verification_type, wallet_compatibility,
          points, required, evidence_rule, created_at, updated_at,
          template_version, template_checksum, template_snapshot,
          template_adoption_idempotency_key
        ) VALUES (
          $1, $2, $3, 'WALLET', 'ANY', 40, true,
          '{"kind":"wallet_session","source":"WALLET_SESSION"}'::jsonb,
          '2026-07-20T00:10:00.000Z', '2026-07-20T00:10:00.000Z',
          1, $4, $5::jsonb, $6
        )
      `;

      const client = await pool.connect();
      await client.query("BEGIN");
      try {
        await expectSqlState(
          client,
          `INSERT INTO campaign_os.campaign_tasks (
             id, campaign_id, template_code, verification_type, wallet_compatibility,
             points, required, evidence_rule, created_at, updated_at, template_version
           ) VALUES (
             'task-m246-partial', $1, 'wallet-connect', 'WALLET', 'ANY',
             40, true, '{"kind":"wallet_session"}'::jsonb,
             '2026-07-20T00:05:00.000Z', '2026-07-20T00:05:00.000Z', 1
           )`,
          [campaignId],
          "23514",
        );

        const adoptedValues = [
          "task-m246-adopted",
          campaignId,
          walletTemplate.templateCode,
          walletTemplate.checksum,
          JSON.stringify(templateSnapshot),
          "idem-m246-valid",
        ] as const;
        await client.query(adoptedTaskInsertSql, [...adoptedValues]);
        const adoptedBeforeMutation = await client.query(
          `SELECT to_jsonb(task_row) AS task_projection
           FROM campaign_os.campaign_tasks AS task_row
           WHERE id = $1`,
          [adoptedValues[0]],
        );
        const adoptedBytesBeforeMutation = digestTestValue(
          adoptedBeforeMutation.rows[0]?.task_projection,
        );

        await client.query(
          `UPDATE campaign_os.campaign_tasks
           SET template_version = template_version,
             template_checksum = template_checksum,
             template_snapshot = template_snapshot,
             template_adoption_idempotency_key = template_adoption_idempotency_key
           WHERE id = $1`,
          [adoptedValues[0]],
        );

        for (const immutableMutation of [
          `UPDATE campaign_os.campaign_tasks
           SET template_version = NULL,
             template_checksum = NULL,
             template_snapshot = NULL,
             template_adoption_idempotency_key = NULL
           WHERE id = $1`,
          `UPDATE campaign_os.campaign_tasks
           SET template_snapshot = jsonb_set(template_snapshot, '{points}', '41'::jsonb)
           WHERE id = $1`,
          `UPDATE campaign_os.campaign_tasks
           SET template_checksum = repeat('a', 64)
           WHERE id = $1`,
          `UPDATE campaign_os.campaign_tasks
           SET template_version = 2
           WHERE id = $1`,
          `UPDATE campaign_os.campaign_tasks
           SET template_adoption_idempotency_key = 'idem-m246-changed'
           WHERE id = $1`,
        ]) {
          await expectSqlState(
            client,
            immutableMutation,
            [adoptedValues[0]],
            "55000",
          );
        }

        const adoptedAfterMutation = await client.query(
          `SELECT to_jsonb(task_row) AS task_projection
           FROM campaign_os.campaign_tasks AS task_row
           WHERE id = $1`,
          [adoptedValues[0]],
        );
        expect(digestTestValue(adoptedAfterMutation.rows[0]?.task_projection)).toBe(
          adoptedBytesBeforeMutation,
        );
        await expectSqlState(
          client,
          adoptedTaskInsertSql,
          ["task-m246-duplicate-idempotency", ...adoptedValues.slice(1)],
          "23505",
        );
        await expectSqlState(
          client,
          `DELETE FROM campaign_os.task_template_catalog_versions
           WHERE template_code = $1 AND version = $2`,
          [walletTemplate.templateCode, walletTemplate.version],
          "23503",
        );

        const migration0006 = requiredMigration(migrations, M246_MIGRATION_ID);
        await expectSqlState(client, migration0006.downSql, [], "55000");

        const adoptedAfterBlockedDown = await client.query(
          `SELECT to_jsonb(task_row) AS task_projection
           FROM campaign_os.campaign_tasks AS task_row
           WHERE id = $1`,
          [adoptedValues[0]],
        );
        expect(digestTestValue(adoptedAfterBlockedDown.rows[0]?.task_projection)).toBe(
          adoptedBytesBeforeMutation,
        );

        const protectedFacts = await client.query(
          `SELECT
             (SELECT COUNT(*)::integer
              FROM campaign_os.task_template_catalog_versions) AS catalog_count,
             (SELECT COUNT(*)::integer
              FROM campaign_os.campaign_tasks
              WHERE id = 'task-m246-adopted') AS adopted_count`,
        );
        expect(protectedFacts.rows[0]).toEqual({
          adopted_count: 1,
          catalog_count: 12,
        });
      } finally {
        await client.query("ROLLBACK");
        client.release();
      }
    });
  }, 60_000);

  it("rolls back every 0006 effect when a real migration transaction fails", async () => {
    await withIsolatedDatabase(async ({ pool }) => {
      const migrations = await loadPostgresMigrations();
      const historicalMigrations = migrations.slice(0, 5);
      const migration0006 = requiredMigration(migrations, M246_MIGRATION_ID);
      await applyMigrations(pool, historicalMigrations, "trace-m246-failure-base");
      const failedUpSql = `${migration0006.upSql}
SELECT * FROM campaign_os.m246_forced_failure_target;
`;
      const failedMigration = {
        ...migration0006,
        checksum: await calculatePostgresMigrationChecksum(failedUpSql),
        upSql: failedUpSql,
      };
      let observedCode: unknown;

      try {
        await applyMigrations(
          pool,
          [...historicalMigrations, failedMigration],
          "trace-m246-failure",
        );
      } catch (error) {
        observedCode = error instanceof PostgresMigrationError ? error.code : undefined;
      }
      expect(observedCode).toBe("POSTGRES_MIGRATION_EXECUTION_FAILED");

      const rollbackFacts = await pool.query(
        `SELECT
           to_regclass($1) AS catalog_relation,
           (SELECT COUNT(*)::integer
            FROM information_schema.columns
            WHERE table_schema = 'campaign_os'
              AND table_name = 'campaign_tasks'
              AND column_name = ANY($2::text[])) AS additive_column_count,
           (SELECT COUNT(*)::integer
            FROM campaign_os.schema_migrations
            WHERE migration_id = $3) AS migration_count`,
        [
          "campaign_os.task_template_catalog_versions",
          M246_TASK_COLUMNS,
          M246_MIGRATION_ID,
        ],
      );
      expect(rollbackFacts.rows[0]).toEqual({
        additive_column_count: 0,
        catalog_relation: null,
        migration_count: 0,
      });
    });
  }, 60_000);

  it("allows the owned down migration only when no Task references catalog data", async () => {
    await withIsolatedDatabase(async ({ pool }) => {
      const migrations = await loadPostgresMigrations();
      const migration0006 = requiredMigration(migrations, M246_MIGRATION_ID);
      await applyMigrations(pool, migrations, "trace-m246-clean-down");

      await pool.query(migration0006.downSql);

      const rollbackFacts = await pool.query(
        `SELECT
           to_regclass($1) AS catalog_relation,
           to_regclass($2) AS campaigns_relation,
           to_regprocedure($3) AS adoption_guard_function,
           (SELECT COUNT(*)::integer
            FROM pg_trigger
            WHERE tgname = $4 AND NOT tgisinternal) AS adoption_guard_trigger_count,
           (SELECT COUNT(*)::integer
            FROM information_schema.columns
            WHERE table_schema = 'campaign_os'
              AND table_name = 'campaign_tasks'
              AND column_name = ANY($5::text[])) AS additive_column_count`,
        [
          "campaign_os.task_template_catalog_versions",
          "campaign_os.campaigns",
          "campaign_os.protect_campaign_task_template_adoption()",
          "campaign_task_template_adoption_immutable_guard",
          M246_TASK_COLUMNS,
        ],
      );
      expect(rollbackFacts.rows[0]).toEqual({
        adoption_guard_function: null,
        adoption_guard_trigger_count: 0,
        additive_column_count: 0,
        campaigns_relation: "campaign_os.campaigns",
        catalog_relation: null,
      });
    });
  }, 60_000);
});

describe("PostgreSQL migration CLI", () => {
  it("parses exactly one supported mode", () => {
    expect(parsePostgresMigrationCliMode(["--plan"])).toBe("plan");
    expect(parsePostgresMigrationCliMode(["--validate"])).toBe("validate");
    expect(parsePostgresMigrationCliMode(["--apply"])).toBe("apply");
    expect(() => parsePostgresMigrationCliMode([])).toThrowError(PostgresMigrationError);
    expect(() => parsePostgresMigrationCliMode(["--plan", "--apply"])).toThrowError(
      PostgresMigrationError,
    );
    expect(() => parsePostgresMigrationCliMode(["--unknown"])).toThrowError(
      PostgresMigrationError,
    );
  });

  it("runs only when the CLI module is the actual process entrypoint", () => {
    expect(isPostgresMigrationCliDirectExecution(process.argv[1])).toBe(false);
    expect(isPostgresMigrationCliDirectExecution("/tmp/host-with-run-argument.ts")).toBe(false);
    expect(isPostgresMigrationCliDirectExecution(
      `${process.cwd()}/src/server/postgresMigrationCli.ts`,
    )).toBe(true);
  });

  it("imports without side effects when the host process also has --run", async () => {
    const directory = await mkdtemp(join(process.cwd(), ".campaign-os-migration-import-"));
    const probePath = join(directory, "probe.ts");
    const cliModulePath = resolve(process.cwd(), "src/server/postgresMigrationCli.ts");

    try {
      await writeFile(
        probePath,
        `import ${JSON.stringify(cliModulePath)};\nprocess.stdout.write("IMPORT_OK");\n`,
        "utf8",
      );
      const probe = spawnSync(
        process.execPath,
        [
          resolve(process.cwd(), "node_modules/vite-node/vite-node.mjs"),
          "--script",
          probePath,
          "--run",
        ],
        {
          cwd: process.cwd(),
          encoding: "utf8",
          env: {
            ...process.env,
            CAMPAIGN_OS_APPROVE_LIVE_MIGRATIONS: "true",
            CAMPAIGN_OS_DATABASE_URL: "postgresql://operator@127.0.0.1/campaign",
          },
          timeout: 10_000,
        },
      );

      expect(probe.status).toBe(0);
      expect(probe.stdout).toBe("IMPORT_OK");
      expect(probe.stderr).toBe("");
    } finally {
      await rm(directory, { force: true, recursive: true });
    }
  }, 15_000);

  it("does not construct a pool for unapproved apply", async () => {
    const createPool = vi.fn();
    const stdout = vi.fn();
    const stderr = vi.fn();

    const exitCode = await runPostgresMigrationCli({
      argv: ["--apply"],
      createPool,
      env: {
        CAMPAIGN_OS_DATABASE_URL: "postgres://operator:secret@db.internal/campaign",
      },
      stderr,
      stdout,
      traceId: "trace-cli-unapproved",
    });

    expect(exitCode).toBe(1);
    expect(createPool).not.toHaveBeenCalled();
    expect(stdout).not.toHaveBeenCalled();
    expect(stderr).toHaveBeenCalledOnce();
    expect(stderr.mock.calls[0]?.[0]).toContain("POSTGRES_MIGRATION_APPROVAL_REQUIRED");
    expect(stderr.mock.calls[0]?.[0]).not.toContain("operator:secret");
    expect(stderr.mock.calls[0]?.[0]).not.toContain("db.internal");
  });

  it("rejects missing database configuration before constructing a pool", async () => {
    const createPool = vi.fn();
    const stderr = vi.fn();

    const exitCode = await runPostgresMigrationCli({
      argv: ["--plan"],
      createPool,
      env: {},
      migrations: [await migration()],
      stderr,
      stdout: vi.fn(),
      traceId: "trace-cli-config",
    });

    expect(exitCode).toBe(1);
    expect(createPool).not.toHaveBeenCalled();
    expect(JSON.parse(stderr.mock.calls[0]?.[0] ?? "{}")).toMatchObject({
      diagnosticCodes: ["POSTGRES_MIGRATION_CONFIG_INVALID"],
      status: "failed",
      traceId: "trace-cli-config",
    });
  });

  it("closes the pool and emits allowlisted JSON for plan", async () => {
    const pool = new TranscriptPool(new TranscriptClient([], undefined, false));
    const stdout = vi.fn();
    const stderr = vi.fn();

    const exitCode = await runPostgresMigrationCli({
      argv: ["--plan"],
      createPool: vi.fn(() => pool),
      env: {
        CAMPAIGN_OS_DATABASE_SSL_MODE: "verify-full",
        CAMPAIGN_OS_DATABASE_URL: "postgres://operator:secret@db.internal/campaign",
      },
      migrations: [await migration()],
      stderr,
      stdout,
      traceId: "trace-cli-plan",
    });

    expect(exitCode).toBe(0);
    expect(pool.end).toHaveBeenCalledOnce();
    expect(stderr).not.toHaveBeenCalled();
    expect(stdout).toHaveBeenCalledOnce();
    const output = stdout.mock.calls[0]?.[0] ?? "";
    expect(JSON.parse(output)).toMatchObject({
      mode: "plan",
      pendingMigrationIds: ["0001_campaign_runtime"],
      status: "pending",
      traceId: "trace-cli-plan",
    });
    expect(output).not.toContain("operator:secret");
    expect(output).not.toContain("db.internal");
    expect(output).not.toContain("CREATE TABLE");
  });

  it("treats IPv6 loopback as local and preserves verify-ca semantics", async () => {
    const localPool = new TranscriptPool(new TranscriptClient([], undefined, false));
    const localCreatePool = vi.fn((_config: PostgresMigrationPoolConfig) => localPool);

    expect(await runPostgresMigrationCli({
      argv: ["--plan"],
      createPool: localCreatePool,
      env: {
        CAMPAIGN_OS_DATABASE_URL: "postgresql://operator@[::1]/campaign",
      },
      migrations: [await migration()],
      stderr: vi.fn(),
      stdout: vi.fn(),
      traceId: "trace-cli-ipv6",
    })).toBe(0);
    expect(localCreatePool.mock.calls[0]?.[0].ssl).toBe(false);

    const remotePool = new TranscriptPool(new TranscriptClient([], undefined, false));
    const remoteCreatePool = vi.fn((_config: PostgresMigrationPoolConfig) => remotePool);

    expect(await runPostgresMigrationCli({
      argv: ["--validate"],
      createPool: remoteCreatePool,
      env: {
        CAMPAIGN_OS_DATABASE_SSL_MODE: "verify-ca",
        CAMPAIGN_OS_DATABASE_URL: "postgresql://operator@db.internal/campaign",
      },
      migrations: [await migration()],
      stderr: vi.fn(),
      stdout: vi.fn(),
      traceId: "trace-cli-verify-ca",
    })).toBe(0);
    const ssl = remoteCreatePool.mock.calls[0]?.[0].ssl;
    expect(ssl).toMatchObject({ rejectUnauthorized: true });
    expect(ssl && ssl.checkServerIdentity?.()).toBeUndefined();
  });

  it("closes the pool and emits safe JSON when a query fails", async () => {
    const pool = new TranscriptPool(new TranscriptClient(
      [],
      (sql) => sql.includes("to_regclass"),
      false,
    ));
    const stdout = vi.fn();
    const stderr = vi.fn();

    const exitCode = await runPostgresMigrationCli({
      argv: ["--validate"],
      createPool: vi.fn(() => pool),
      env: {
        CAMPAIGN_OS_DATABASE_SSL_MODE: "verify-full",
        CAMPAIGN_OS_DATABASE_URL: "postgres://operator:secret@db.internal/campaign",
      },
      migrations: [await migration()],
      stderr,
      stdout,
      traceId: "trace-cli-query",
    });

    expect(exitCode).toBe(1);
    expect(pool.end).toHaveBeenCalledOnce();
    expect(stdout).not.toHaveBeenCalled();
    const output = stderr.mock.calls[0]?.[0] ?? "";
    expect(JSON.parse(output)).toMatchObject({
      diagnosticCodes: ["POSTGRES_MIGRATION_QUERY_FAILED"],
      status: "failed",
      traceId: "trace-cli-query",
    });
    expect(output).not.toContain("operator:secret");
    expect(output).not.toContain("db.internal");
  });

  it("emits a safe cleanup diagnostic when pool close fails", async () => {
    const pool = new TranscriptPool(
      new TranscriptClient([], undefined, false),
      true,
    );
    const stdout = vi.fn();
    const stderr = vi.fn();

    const exitCode = await runPostgresMigrationCli({
      argv: ["--plan"],
      createPool: vi.fn(() => pool),
      env: {
        CAMPAIGN_OS_DATABASE_SSL_MODE: "verify-full",
        CAMPAIGN_OS_DATABASE_URL: "postgresql://operator@db.internal/campaign",
      },
      migrations: [await migration()],
      stderr,
      stdout,
      traceId: "trace-cli-close",
    });

    expect(exitCode).toBe(1);
    expect(stdout).not.toHaveBeenCalled();
    const output = stderr.mock.calls[0]?.[0] ?? "";
    expect(JSON.parse(output)).toMatchObject({
      diagnosticCodes: ["POSTGRES_MIGRATION_CLEANUP_FAILED"],
      operation: "close",
      status: "failed",
      traceId: "trace-cli-close",
    });
    expect(output).not.toContain("operator:secret");
    expect(output).not.toContain("db.internal");
  });
});
