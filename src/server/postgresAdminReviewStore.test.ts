import { createHash, randomUUID } from "node:crypto";
import pg, { type Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  canonicalizeAdminReviewJson,
  type AdminReviewWinnerRow,
  type AdminReviewWinnerSource,
} from "./adminReview";
import { serializeAdminExportArtifact } from "./adminExportArtifact";
import {
  ADMIN_ARTIFACT_SOURCE_VERSION,
  ADMIN_REVIEW_MAX_ARTIFACT_ROWS,
  ADMIN_REVIEW_MAX_SOURCE_MANIFEST_BYTES,
  ADMIN_REVIEW_MIGRATION_ID,
  ADMIN_REVIEW_SNAPSHOT_VERSION,
  AdminReviewStoreError,
  deriveAdminReviewDecisionPayloadHash,
  type AdminExportArtifactInput,
  type AdminExportArtifactProjection,
  type AdminExportArtifactProjectionInput,
  type AdminReviewDecisionInput,
  type AdminReviewDecisionPayload,
  type AdminReviewJsonObject,
  type AdminReviewSnapshotProjection,
} from "./adminReviewStore";
import {
  createPostgresAdminReviewStore,
  type PostgresAdminReviewStorePool,
  type PostgresAdminReviewStoreQueryResult,
} from "./postgresAdminReviewStore";
import {
  loadPostgresMigrations,
  runPostgresMigrations,
  type PostgresMigrationDefinition,
  type PostgresMigrationPool,
} from "./postgresMigration";

const TEST_DATABASE_URL = process.env.CAMPAIGN_OS_TEST_DATABASE_URL?.trim();
const REQUIRE_POSTGRES_TESTS = process.env.CAMPAIGN_OS_REQUIRE_POSTGRES_TESTS?.trim() === "1";

if (REQUIRE_POSTGRES_TESTS && !TEST_DATABASE_URL) {
  throw new Error(
    "Admin review PostgreSQL acceptance requires CAMPAIGN_OS_TEST_DATABASE_URL when required mode is enabled.",
  );
}

const realPostgresSuite = TEST_DATABASE_URL ? describe : describe.skip;

interface QueryCall {
  text: string;
  values: readonly unknown[];
}

type Assert<T extends true> = T;
type PgPoolIsCompatible = Assert<Pool extends PostgresAdminReviewStorePool ? true : false>;
const pgPoolCompatibility: PgPoolIsCompatible = true;

const normalizeSql = (value: string) => value.replace(/\s+/g, " ").trim();
const sha256 = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");

const maximumArtifactWinnerSource = (revision: string): AdminReviewWinnerSource => {
  const campaignId = "campaign-admin-0001";
  const rows = Array.from(
    { length: ADMIN_REVIEW_MAX_ARTIFACT_ROWS },
    (_, index): AdminReviewWinnerRow => ({
      campaignId,
      decisionId: `d${index}`,
      decisionVersion: 1,
      evidenceHashes: [],
      participantId: `p${index}`,
      rank: index + 1,
      snapshotFingerprint: sha256(`snapshot-${index}`),
      totalPoints: ADMIN_REVIEW_MAX_ARTIFACT_ROWS - index,
      walletAddress: `w${index}`,
    }),
  );
  const manifest = {
    campaign: {
      contractMode: "OFF_CHAIN_MVP" as const,
      endTime: "2026-08-15T00:00:00.000Z",
      id: campaignId,
      startTime: "2026-08-01T00:00:00.000Z",
      status: "ended",
      updatedAt: `2026-07-15T00:00:${revision}.000Z`,
      walletPolicy: "ANY" as const,
    },
    rows,
    version: ADMIN_ARTIFACT_SOURCE_VERSION,
  } satisfies AdminReviewWinnerSource["manifest"];
  const canonicalJson = canonicalizeAdminReviewJson(
    manifest as unknown as AdminReviewJsonObject,
    { field: "sourceManifest", traceId: `trace-5000-source-${revision}` },
  );

  return {
    canonicalJson,
    fingerprint: sha256(canonicalJson),
    manifest,
    rowCount: rows.length,
    rows,
    sourceVersion: ADMIN_ARTIFACT_SOURCE_VERSION,
  };
};
const expectedMigration = {
  checksum: "a".repeat(64),
  id: ADMIN_REVIEW_MIGRATION_ID,
} as const;
const defaultDecisionPayload = {
  campaignId: "campaign-admin-0001",
  decision: "approved",
  expectedSnapshotFingerprint: "1".repeat(64),
  note: "Evidence reviewed.",
  operatorRole: "review_operator",
  operatorSubject: "2F4ReviewOperator",
  participantId: "participant-admin-0001",
  reasonCode: "evidence_verified",
} satisfies AdminReviewDecisionPayload;

class TranscriptPool implements PostgresAdminReviewStorePool {
  readonly calls: QueryCall[] = [];
  readonly directCalls: QueryCall[] = [];
  readonly connect = vi.fn(async () => ({
    query: (text: string, values: readonly unknown[] = []) => this.record(text, values),
    release: this.release,
  }));
  readonly end = vi.fn(async () => {
    if (this.endError) {
      throw this.endError;
    }
  });
  readonly release = vi.fn(() => undefined);

  constructor(
    private readonly respond: (
      call: QueryCall,
      index: number,
    ) => PostgresAdminReviewStoreQueryResult | Promise<PostgresAdminReviewStoreQueryResult> = () => ({ rows: [] }),
    private readonly endError?: Error,
  ) {}

  async query(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<PostgresAdminReviewStoreQueryResult> {
    this.directCalls.push({ text: normalizeSql(text), values });

    return await this.record(text, values);
  }

  private async record(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<PostgresAdminReviewStoreQueryResult> {
    const call = { text: normalizeSql(text), values };
    this.calls.push(call);

    return await this.respond(call, this.calls.length - 1);
  }
}

const timestamp = (value = "2026-07-15T00:00:00.000Z") => new Date(value);

const campaignRow = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  contract_mode: "OFF_CHAIN_MVP",
  end_time: timestamp("2026-08-15T00:00:00.000Z"),
  id: "campaign-admin-0001",
  start_time: timestamp("2026-08-01T00:00:00.000Z"),
  status: "draft",
  updated_at: timestamp("2026-07-15T00:00:01.000Z"),
  wallet_policy: "ANY",
  ...overrides,
});

const taskRow = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  campaign_id: "campaign-admin-0001",
  id: "task-admin-0001",
  points: 120,
  required: true,
  updated_at: timestamp("2026-07-15T00:00:02.000Z"),
  verification_type: "ON_CHAIN",
  wallet_compatibility: "ANY",
  ...overrides,
});

const participantRow = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  account_type: "EOA",
  campaign_id: "campaign-admin-0001",
  created_at: timestamp("2026-07-15T00:00:03.000Z"),
  id: "participant-admin-0001",
  rank: 1,
  risk_flags: ["manual-review"],
  total_points: 120,
  updated_at: timestamp("2026-07-15T00:00:04.000Z"),
  wallet_address: "2F4ParticipantWallet",
  wallet_source: "PORTKEY_EOA_EXTENSION",
  wallet_type_verified: true,
  ...overrides,
});

const completionRow = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  account_type: "EOA",
  campaign_id: "campaign-admin-0001",
  completed_at: timestamp("2026-07-15T00:00:05.000Z"),
  id: "completion-admin-0001",
  points_awarded: 120,
  status: "completed",
  task_id: "task-admin-0001",
  updated_at: timestamp("2026-07-15T00:00:05.000Z"),
  wallet_address: "2F4ParticipantWallet",
  wallet_source: "PORTKEY_EOA_EXTENSION",
  ...overrides,
});

const evidenceRow = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  campaign_id: "campaign-admin-0001",
  captured_at: timestamp("2026-07-15T00:00:06.000Z"),
  completion_id: "completion-admin-0001",
  diagnostic_codes: ["local-review"],
  evidence_hash: "safe-evidence-hash",
  evidence_ref: "aelfscan://transaction/admin-0001",
  evidence_source: "AELFSCAN",
  id: "evidence-admin-0001",
  points_awarded: 120,
  status: "completed",
  task_id: "task-admin-0001",
  updated_at: timestamp("2026-07-15T00:00:06.000Z"),
  wallet_address: "2F4ParticipantWallet",
  ...overrides,
});

const rankedParticipantRow = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => {
  const participant = participantRow(overrides);

  return {
    ...participant,
    participant_id: participant.id,
    ...overrides,
  };
};

const readinessRow = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  checksum: expectedMigration.checksum,
  migration_id: expectedMigration.id,
  ...overrides,
});

const decisionRow = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  campaign_id: "campaign-admin-0001",
  decided_at: timestamp("2026-07-15T00:00:10.000Z"),
  decision: "approved",
  id: "decision-admin-0001",
  idempotency_key_hash: "2".repeat(64),
  note: "Evidence reviewed.",
  ownership_valid: true,
  operator_role: "review_operator",
  operator_subject: "2F4ReviewOperator",
  participant_id: "participant-admin-0001",
  payload_hash: deriveAdminReviewDecisionPayloadHash(defaultDecisionPayload),
  reason_code: "evidence_verified",
  snapshot_fingerprint: "1".repeat(64),
  snapshot_manifest: snapshotProjection().manifest,
  snapshot_version: ADMIN_REVIEW_SNAPSHOT_VERSION,
  trace_id: "trace-decision-create",
  version: 1,
  wallet_address: "2F4ParticipantWallet",
  ...overrides,
});

const snapshotQueryResponse = (
  call: QueryCall,
): PostgresAdminReviewStoreQueryResult | undefined => {
  if (call.text.includes("FROM campaign_os.schema_migrations")) {
    return { rows: [readinessRow()] };
  }
  if (call.text.includes("FROM campaign_os.campaigns")) {
    return { rows: [campaignRow()] };
  }
  if (call.text.includes("FROM campaign_os.campaign_tasks")) {
    return { rows: [taskRow()] };
  }
  if (
    call.text.includes("FROM campaign_os.campaign_participants")
    && !call.text.includes("FROM campaign_os.campaign_review_decisions")
  ) {
    return { rows: [rankedParticipantRow()] };
  }
  if (call.text.includes("FROM campaign_os.campaign_task_completions")) {
    return { rows: [completionRow()] };
  }
  if (call.text.includes("FROM campaign_os.campaign_task_evidence")) {
    return { rows: [evidenceRow()] };
  }
  return undefined;
};

interface DecisionTransaction {
  active: boolean;
  pending?: Record<string, unknown>;
  releaseLock?: () => void;
}

class StatefulDecisionPool implements PostgresAdminReviewStorePool {
  readonly calls: QueryCall[] = [];
  readonly committed: Array<Record<string, unknown>> = [];
  readonly connect = vi.fn(async () => {
    const transaction: DecisionTransaction = { active: false };

    return {
      query: (text: string, values: readonly unknown[] = []) =>
        this.queryTransaction(transaction, text, values),
      release: () => {
        transaction.releaseLock?.();
        transaction.releaseLock = undefined;
        this.release();
      },
    };
  });
  readonly end = vi.fn(async () => undefined);
  readonly release = vi.fn(() => undefined);
  insertCount = 0;
  maxActiveLockHolders = 0;
  private readonly activeLockHolders = new Map<string, number>();
  private readonly lockTails = new Map<string, Promise<void>>();

  async query(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<PostgresAdminReviewStoreQueryResult> {
    this.calls.push({ text: normalizeSql(text), values });
    throw new Error("transaction operation unexpectedly used pool.query");
  }

  private releaseTransactionLock(transaction: DecisionTransaction) {
    transaction.releaseLock?.();
    transaction.releaseLock = undefined;
  }

  private async acquireLock(transaction: DecisionTransaction, key: string) {
    const previous = this.lockTails.get(key) ?? Promise.resolve();
    let releaseCurrent: () => void = () => undefined;
    const current = new Promise<void>((resolve) => {
      releaseCurrent = resolve;
    });
    this.lockTails.set(key, previous.then(() => current));
    await previous;
    const activeCount = (this.activeLockHolders.get(key) ?? 0) + 1;
    this.activeLockHolders.set(key, activeCount);
    this.maxActiveLockHolders = Math.max(this.maxActiveLockHolders, activeCount);
    transaction.releaseLock = () => {
      this.activeLockHolders.set(key, Math.max(0, activeCount - 1));
      releaseCurrent();
    };
  }

  private async queryTransaction(
    transaction: DecisionTransaction,
    text: string,
    values: readonly unknown[],
  ): Promise<PostgresAdminReviewStoreQueryResult> {
    const call = { text: normalizeSql(text), values };
    this.calls.push(call);

    if (call.text.startsWith("BEGIN")) {
      transaction.active = true;
      return { rows: [] };
    }
    if (call.text === "COMMIT") {
      if (transaction.pending) {
        this.committed.push(transaction.pending);
      }
      transaction.pending = undefined;
      transaction.active = false;
      this.releaseTransactionLock(transaction);
      return { rows: [] };
    }
    if (call.text === "ROLLBACK") {
      transaction.pending = undefined;
      transaction.active = false;
      this.releaseTransactionLock(transaction);
      return { rows: [] };
    }
    if (call.text.includes("pg_advisory_xact_lock")) {
      await this.acquireLock(transaction, JSON.stringify(values));
      return { rows: [] };
    }
    const snapshotResult = snapshotQueryResponse(call);
    if (snapshotResult) {
      return snapshotResult;
    }
    if (
      call.text.includes("FROM campaign_os.campaign_review_decisions")
      && call.text.includes("idempotency_key_hash = $3")
    ) {
      const existing = this.committed.find((row) =>
        row.campaign_id === values[0]
        && row.participant_id === values[1]
        && row.idempotency_key_hash === values[2]);

      return { rows: existing ? [existing] : [] };
    }
    if (call.text.includes("COALESCE(MAX(version), 0)")) {
      const versions = this.committed
        .filter((row) => row.campaign_id === values[0] && row.participant_id === values[1])
        .map((row) => Number(row.version));

      return { rows: [{ current_version: String(Math.max(0, ...versions)) }] };
    }
    if (call.text.startsWith("INSERT INTO campaign_os.campaign_review_decisions")) {
      const row = decisionRow({
        campaign_id: values[1],
        decision: values[5],
        id: values[0],
        idempotency_key_hash: values[13],
        note: values[10],
        operator_role: values[12],
        operator_subject: values[11],
        participant_id: values[2],
        payload_hash: values[14],
        reason_code: values[9],
        snapshot_fingerprint: values[7],
        snapshot_manifest: typeof values[8] === "string"
          ? JSON.parse(values[8]) as unknown
          : values[8],
        snapshot_version: values[6],
        trace_id: values[15],
        version: values[4],
        wallet_address: values[3],
      });
      transaction.pending = row;
      this.insertCount += 1;

      return { rows: [row] };
    }

    return { rows: [] };
  }
}

const decisionInput = (
  overrides: Partial<AdminReviewDecisionInput> = {},
): AdminReviewDecisionInput => ({
  ...defaultDecisionPayload,
  idempotencyKeyHash: "2".repeat(64),
  ...overrides,
});

const snapshotProjection = (
  overrides: Partial<AdminReviewSnapshotProjection> = {},
): AdminReviewSnapshotProjection => ({
  fingerprint: "1".repeat(64),
  manifest: {
    campaignId: "campaign-admin-0001",
    participantId: "participant-admin-0001",
    version: ADMIN_REVIEW_SNAPSHOT_VERSION,
  },
  walletAddress: "2F4ParticipantWallet",
  ...overrides,
});

const artifactInput = (
  overrides: Partial<AdminExportArtifactInput> = {},
): AdminExportArtifactInput => {
  const content = "participantId,totalPoints\nparticipant-admin-0001,120\n";

  return {
    campaignId: "campaign-admin-0001",
    content,
    contentHash: sha256(content),
    creatorRole: "internal_operator",
    creatorSubject: "2F4ReviewOperator",
    fileName: "campaign-admin-0001.csv",
    format: "csv",
    mimeType: "text/csv;charset=utf-8",
    rowCount: 1,
    sourceFingerprint: "4".repeat(64),
    sourceManifest: {
      campaignId: "campaign-admin-0001",
      version: ADMIN_ARTIFACT_SOURCE_VERSION,
    },
    sourceVersion: ADMIN_ARTIFACT_SOURCE_VERSION,
    ...overrides,
  };
};

const artifactProjectionInput = (
  overrides: Partial<AdminExportArtifactProjectionInput> = {},
): AdminExportArtifactProjectionInput => ({
  campaignId: "campaign-admin-0001",
  creatorRole: "internal_operator",
  creatorSubject: "2F4ReviewOperator",
  format: "csv",
  ...overrides,
});

const artifactProjection = (
  overrides: Partial<AdminExportArtifactProjection> = {},
): AdminExportArtifactProjection => {
  const input = artifactInput();

  return {
    content: input.content,
    contentHash: input.contentHash,
    fileName: input.fileName,
    mimeType: input.mimeType,
    rowCount: input.rowCount,
    sourceFingerprint: input.sourceFingerprint,
    sourceManifest: input.sourceManifest,
    sourceVersion: input.sourceVersion,
    ...overrides,
  };
};

const artifactRow = (overrides: Record<string, unknown> = {}): Record<string, unknown> => {
  const input = artifactInput();

  return {
    campaign_id: input.campaignId,
    content: input.content,
    content_bytes: Buffer.byteLength(input.content, "utf8"),
    content_hash: input.contentHash,
    created_at: timestamp("2026-07-15T00:00:20.000Z"),
    creator_role: input.creatorRole,
    creator_subject: input.creatorSubject,
    file_name: input.fileName,
    format: input.format,
    id: "artifact-admin-0001",
    mime_type: input.mimeType,
    row_count: input.rowCount,
    source_fingerprint: input.sourceFingerprint,
    source_manifest: input.sourceManifest,
    source_version: input.sourceVersion,
    trace_id: "trace-artifact-create",
    ...overrides,
  };
};

interface ArtifactTransaction {
  pending?: Record<string, unknown>;
  releaseLock?: () => void;
}

class StatefulArtifactPool implements PostgresAdminReviewStorePool {
  readonly calls: QueryCall[] = [];
  readonly committed: Array<Record<string, unknown>> = [];
  readonly connect = vi.fn(async () => {
    const transaction: ArtifactTransaction = {};

    return {
      query: (text: string, values: readonly unknown[] = []) =>
        this.queryTransaction(transaction, text, values),
      release: () => {
        transaction.releaseLock?.();
        transaction.releaseLock = undefined;
        this.release();
      },
    };
  });
  readonly end = vi.fn(async () => undefined);
  readonly release = vi.fn(() => undefined);
  insertCount = 0;
  maxActiveLockHolders = 0;
  private readonly activeLockHolders = new Map<string, number>();
  private readonly lockTails = new Map<string, Promise<void>>();

  async query(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<PostgresAdminReviewStoreQueryResult> {
    this.calls.push({ text: normalizeSql(text), values });
    throw new Error("artifact transaction unexpectedly used pool.query");
  }

  private releaseTransactionLock(transaction: ArtifactTransaction) {
    transaction.releaseLock?.();
    transaction.releaseLock = undefined;
  }

  private async acquireLock(transaction: ArtifactTransaction, key: string) {
    const previous = this.lockTails.get(key) ?? Promise.resolve();
    let releaseCurrent: () => void = () => undefined;
    const current = new Promise<void>((resolve) => {
      releaseCurrent = resolve;
    });
    this.lockTails.set(key, previous.then(() => current));
    await previous;
    const activeCount = (this.activeLockHolders.get(key) ?? 0) + 1;
    this.activeLockHolders.set(key, activeCount);
    this.maxActiveLockHolders = Math.max(this.maxActiveLockHolders, activeCount);
    transaction.releaseLock = () => {
      this.activeLockHolders.set(key, Math.max(0, activeCount - 1));
      releaseCurrent();
    };
  }

  private async queryTransaction(
    transaction: ArtifactTransaction,
    text: string,
    values: readonly unknown[],
  ): Promise<PostgresAdminReviewStoreQueryResult> {
    const call = { text: normalizeSql(text), values };
    this.calls.push(call);

    if (call.text.startsWith("BEGIN")) {
      return { rows: [] };
    }
    if (call.text === "COMMIT") {
      if (transaction.pending) {
        this.committed.push(transaction.pending);
      }
      transaction.pending = undefined;
      this.releaseTransactionLock(transaction);
      return { rows: [] };
    }
    if (call.text === "ROLLBACK") {
      transaction.pending = undefined;
      this.releaseTransactionLock(transaction);
      return { rows: [] };
    }
    if (call.text.includes("FROM campaign_os.schema_migrations")) {
      return { rows: [readinessRow()] };
    }
    if (call.text.includes("pg_advisory_xact_lock")) {
      await this.acquireLock(transaction, JSON.stringify(values));
      return { rows: [] };
    }
    const snapshotResult = snapshotQueryResponse(call);
    if (snapshotResult) {
      return snapshotResult;
    }
    if (call.text.includes("FROM campaign_os.campaign_review_decisions")) {
      return { rows: [decisionRow()] };
    }
    if (call.text.startsWith("INSERT INTO campaign_os.campaign_export_artifacts")) {
      const existing = this.committed.find((row) =>
        row.campaign_id === values[1]
        && row.source_fingerprint === values[3]
        && row.format === values[5]);
      if (existing) {
        return { rows: [] };
      }
      const row = artifactRow({
        campaign_id: values[1],
        content: values[8],
        content_bytes: values[9],
        content_hash: values[7],
        creator_role: values[13],
        creator_subject: values[12],
        file_name: values[10],
        format: values[5],
        id: values[0],
        mime_type: values[11],
        row_count: values[6],
        source_fingerprint: values[3],
        source_manifest: typeof values[4] === "string"
          ? JSON.parse(values[4]) as unknown
          : values[4],
        source_version: values[2],
        trace_id: values[14],
      });
      transaction.pending = row;
      this.insertCount += 1;

      return { rows: [row] };
    }
    if (
      call.text.includes("FROM campaign_os.campaign_export_artifacts")
      && call.text.includes("source_fingerprint = $2")
    ) {
      const existing = this.committed.find((row) =>
        row.campaign_id === values[0]
        && row.source_fingerprint === values[1]
        && row.format === values[2]);

      return { rows: existing ? [existing] : [] };
    }

    return { rows: [] };
  }
}

const createStore = (
  pool: PostgresAdminReviewStorePool,
  ownsPool = true,
) => createPostgresAdminReviewStore({
  boundedListLimit: 100,
  expectedMigration,
  ownsPool,
  pool,
});

describe("Admin review decision canonical payload", () => {
  it("derives a golden hash without caller-controlled request metadata", () => {
    const input = decisionInput();

    expect(input).not.toHaveProperty("payloadHash");
    expect(deriveAdminReviewDecisionPayloadHash(input)).toBe(
      "c166e99171cb24b13b77a66e6f0802ec42b422862d4bbd3965006d26fe523b8f",
    );
    const alternateKeyInput: AdminReviewDecisionInput = {
      ...input,
      idempotencyKeyHash: "9".repeat(64),
    };
    expect(deriveAdminReviewDecisionPayloadHash(alternateKeyInput)).toBe(
      deriveAdminReviewDecisionPayloadHash(input),
    );
    const untrustedClaim = { ...input, payloadHash: "9".repeat(64) };
    expect(deriveAdminReviewDecisionPayloadHash(untrustedClaim)).toBe(
      deriveAdminReviewDecisionPayloadHash(input),
    );
  });

  it("changes the hash for every immutable command identity field", () => {
    const baseline = deriveAdminReviewDecisionPayloadHash(decisionInput());
    const mutations: Array<[string, Partial<AdminReviewDecisionPayload>]> = [
      ["campaignId", { campaignId: "campaign-admin-0002" }],
      ["decision", { decision: "rejected" }],
      ["expectedSnapshotFingerprint", { expectedSnapshotFingerprint: "8".repeat(64) }],
      ["note", { note: "Different note." }],
      ["operatorRole", { operatorRole: "internal_operator" }],
      ["operatorSubject", { operatorSubject: "2F4DifferentOperator" }],
      ["participantId", { participantId: "participant-admin-0002" }],
      ["reasonCode", { reasonCode: "different_reason" }],
    ];

    for (const [field, mutation] of mutations) {
      expect(
        deriveAdminReviewDecisionPayloadHash(decisionInput(mutation)),
        field,
      ).not.toBe(baseline);
    }
  });
});

describe("PostgreSQL Admin review store contract", () => {
  it("constructs without I/O and exposes only append-only decision/artifact operations", () => {
    expect(pgPoolCompatibility).toBe(true);
    const pool = new TranscriptPool();
    const store = createStore(pool);

    expect(pool.calls).toEqual([]);
    expect(pool.connect).not.toHaveBeenCalled();
    expect(store).toMatchObject({
      appendDecision: expect.any(Function),
      close: expect.any(Function),
      getArtifact: expect.any(Function),
      getCurrentDecision: expect.any(Function),
      listArtifacts: expect.any(Function),
      listDecisions: expect.any(Function),
      putArtifact: expect.any(Function),
      putArtifactFromSnapshot: expect.any(Function),
      readArtifactContent: expect.any(Function),
      readSnapshot: expect.any(Function),
    });
    expect(store).not.toHaveProperty("deleteDecision");
    expect(store).not.toHaveProperty("reset");
    expect(store).not.toHaveProperty("updateArtifact");
    expect(store).not.toHaveProperty("updateDecision");
  });

  it("validates every public input and Trace ID before query or connect", async () => {
    const pool = new TranscriptPool();
    const store = createStore(pool);
    const invalidContext = { traceId: "unsafe trace with spaces" };
    const projector = vi.fn(async () => snapshotProjection());

    const operations = [
      store.readSnapshot({ campaignId: "", participantId: undefined }, invalidContext),
      store.appendDecision(decisionInput(), projector, invalidContext),
      store.getCurrentDecision({ campaignId: "", participantId: "participant-admin-0001" }, invalidContext),
      store.listDecisions({ campaignId: "campaign-admin-0001", limit: 101, participantId: "participant-admin-0001" }, invalidContext),
      store.putArtifact(artifactInput({ contentHash: "0".repeat(64) }), invalidContext),
      store.listArtifacts({ campaignId: "campaign-admin-0001", limit: 0 }, invalidContext),
      store.getArtifact({ artifactId: "", campaignId: "campaign-admin-0001" }, invalidContext),
      store.readArtifactContent({ artifactId: "artifact-admin-0001", campaignId: "" }, invalidContext),
    ];

    for (const operation of operations) {
      await expect(operation).rejects.toMatchObject({
        code: "ADMIN_REVIEW_STORE_ARGUMENT_INVALID",
        traceId: "trace-invalid",
      });
    }
    expect(projector).not.toHaveBeenCalled();
    expect(pool.calls).toEqual([]);
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it("rejects invalid factory dependencies and migration readiness configuration", () => {
    const pool = new TranscriptPool();

    for (const options of [
      {
        boundedListLimit: 0,
        expectedMigration,
        ownsPool: true,
        pool,
      },
      {
        boundedListLimit: 100,
        expectedMigration: { checksum: "invalid", id: ADMIN_REVIEW_MIGRATION_ID },
        ownsPool: true,
        pool,
      },
      {
        boundedListLimit: 100,
        expectedMigration: { checksum: "a".repeat(64), id: "0001_campaign_runtime" },
        ownsPool: true,
        pool,
      },
      {
        boundedListLimit: 100,
        expectedMigration,
        ownsPool: true,
        pool: null,
      },
    ]) {
      expect(() => createPostgresAdminReviewStore(
        options as Parameters<typeof createPostgresAdminReviewStore>[0],
      )).toThrow(expect.objectContaining({
        code: "ADMIN_REVIEW_STORE_ARGUMENT_INVALID",
      }));
    }
    expect(pool.calls).toEqual([]);
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it("closes an owned pool once, reuses the Promise, and rejects post-close operations", async () => {
    const pool = new TranscriptPool();
    const store = createStore(pool);

    const first = store.close({ traceId: "trace-close-owned" });
    const second = store.close({ traceId: "trace-close-repeated" });

    expect(second).toBe(first);
    await expect(first).resolves.toBeUndefined();
    expect(pool.end).toHaveBeenCalledOnce();
    await expect(store.readSnapshot(
      { campaignId: "campaign-admin-0001" },
      { traceId: "trace-after-close" },
    )).rejects.toMatchObject({
      code: "ADMIN_REVIEW_STORE_CLOSED",
      operation: "readSnapshot",
      traceId: "trace-after-close",
    });
    expect(pool.calls).toEqual([]);
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it("does not close a borrowed pool and maps end failures to safe typed errors", async () => {
    const borrowedPool = new TranscriptPool();
    await createStore(borrowedPool, false).close({ traceId: "trace-close-borrowed" });
    expect(borrowedPool.end).not.toHaveBeenCalled();

    const sensitive = "postgres://operator:secret@db.internal/private stack";
    const ownedPool = new TranscriptPool(undefined, new Error(sensitive));
    const store = createStore(ownedPool);
    const failure = store.close({ traceId: "trace-close-failure" });

    await expect(failure).rejects.toBeInstanceOf(AdminReviewStoreError);
    await expect(failure).rejects.toMatchObject({
      code: "ADMIN_REVIEW_STORE_CLEANUP_FAILED",
      field: "pool",
      operation: "close",
      traceId: "trace-close-failure",
    });
    const serialized = await failure.catch((error: unknown) => error);
    expect(JSON.stringify(serialized)).not.toContain(sensitive);
    expect(serialized).not.toHaveProperty("cause");
    expect(ownedPool.end).toHaveBeenCalledOnce();
  });
});

describe("PostgreSQL Admin review snapshots", () => {
  it("reads one coherent participant snapshot on the dedicated repeatable-read client", async () => {
    const pool = new TranscriptPool((call) => {
      if (call.text.includes("FROM campaign_os.schema_migrations")) {
        return { rows: [readinessRow()] };
      }
      if (call.text.includes("FROM campaign_os.campaigns")) {
        return { rows: [campaignRow()] };
      }
      if (call.text.includes("FROM campaign_os.campaign_tasks")) {
        return { rows: [taskRow()] };
      }
      if (
        call.text.includes("FROM campaign_os.campaign_participants")
        && call.text.includes("id = $2")
      ) {
        return { rows: [rankedParticipantRow()] };
      }
      if (call.text.includes("FROM campaign_os.campaign_task_completions")) {
        return { rows: [completionRow()] };
      }
      if (call.text.includes("FROM campaign_os.campaign_task_evidence")) {
        return { rows: [evidenceRow()] };
      }
      return { rows: [] };
    });
    const store = createStore(pool);

    await expect(store.readSnapshot({
      campaignId: "campaign-admin-0001",
      participantId: "participant-admin-0001",
    }, { traceId: "trace-snapshot-coherent" })).resolves.toEqual({
      campaign: {
        contractMode: "OFF_CHAIN_MVP",
        endTime: "2026-08-15T00:00:00.000Z",
        id: "campaign-admin-0001",
        startTime: "2026-08-01T00:00:00.000Z",
        status: "draft",
        updatedAt: "2026-07-15T00:00:01.000Z",
        walletPolicy: "ANY",
      },
      completions: [{
        accountType: "EOA",
        campaignId: "campaign-admin-0001",
        completedAt: "2026-07-15T00:00:05.000Z",
        id: "completion-admin-0001",
        pointsAwarded: 120,
        status: "completed",
        taskId: "task-admin-0001",
        updatedAt: "2026-07-15T00:00:05.000Z",
        walletAddress: "2F4ParticipantWallet",
        walletSource: "PORTKEY_EOA_EXTENSION",
      }],
      evidence: [{
        campaignId: "campaign-admin-0001",
        capturedAt: "2026-07-15T00:00:06.000Z",
        completionId: "completion-admin-0001",
        diagnosticCodes: ["local-review"],
        evidenceHash: "safe-evidence-hash",
        evidenceRef: "aelfscan://transaction/admin-0001",
        evidenceSource: "AELFSCAN",
        id: "evidence-admin-0001",
        pointsAwarded: 120,
        status: "completed",
        taskId: "task-admin-0001",
        updatedAt: "2026-07-15T00:00:06.000Z",
        walletAddress: "2F4ParticipantWallet",
      }],
      participants: [{
        accountType: "EOA",
        campaignId: "campaign-admin-0001",
        createdAt: "2026-07-15T00:00:03.000Z",
        id: "participant-admin-0001",
        rank: 1,
        riskFlags: ["manual-review"],
        totalPoints: 120,
        updatedAt: "2026-07-15T00:00:04.000Z",
        walletAddress: "2F4ParticipantWallet",
        walletSource: "PORTKEY_EOA_EXTENSION",
        walletTypeVerified: true,
      }],
      ranking: [{
        campaignId: "campaign-admin-0001",
        createdAt: "2026-07-15T00:00:03.000Z",
        participantId: "participant-admin-0001",
        rank: 1,
        totalPoints: 120,
        walletAddress: "2F4ParticipantWallet",
      }],
      tasks: [{
        campaignId: "campaign-admin-0001",
        id: "task-admin-0001",
        points: 120,
        required: true,
        updatedAt: "2026-07-15T00:00:02.000Z",
        verificationType: "ON_CHAIN",
        walletCompatibility: "ANY",
      }],
    });

    expect(pool.connect).toHaveBeenCalledOnce();
    expect(pool.directCalls).toEqual([]);
    expect(pool.calls.map(({ text }) => text)).toEqual([
      "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY",
      expect.stringContaining("FROM campaign_os.schema_migrations"),
      expect.stringContaining("FROM campaign_os.campaigns"),
      expect.stringContaining("FROM campaign_os.campaign_tasks"),
      expect.stringContaining("FROM campaign_os.campaign_participants"),
      expect.stringContaining("FROM campaign_os.campaign_task_completions"),
      expect.stringContaining("FROM campaign_os.campaign_task_evidence"),
      "COMMIT",
    ]);
    expect(pool.calls[1]?.values).toEqual([ADMIN_REVIEW_MIGRATION_ID]);
    expect(pool.calls[2]?.values).toEqual(["campaign-admin-0001"]);
    expect(pool.calls[4]?.values.slice(0, 2)).toEqual([
      "campaign-admin-0001",
      "participant-admin-0001",
    ]);
    expect(pool.calls[5]?.values.slice(0, 2)).toEqual([
      "campaign-admin-0001",
      "2F4ParticipantWallet",
    ]);
    expect(pool.calls[6]?.values.slice(0, 2)).toEqual([
      "campaign-admin-0001",
      "2F4ParticipantWallet",
    ]);
    expect(pool.calls[4]?.text).toContain(
      "WHERE ranked_participant.campaign_id = $1 AND ranked_participant.id = $2",
    );
    expect(pool.calls[4]?.text).toContain("ROW_NUMBER() OVER");
    expect(pool.calls[4]?.text).toContain("id AS participant_id");
    expect(pool.calls[4]?.text).toContain("ranked_participant.id = $2");
    expect(pool.calls.filter(({ text }) => text.includes("ROW_NUMBER() OVER"))).toHaveLength(1);
    expect(pool.calls.every(({ text }) => !/\b(?:INSERT|UPDATE|DELETE|TRUNCATE)\b/i.test(text))).toBe(true);
    expect(pool.release).toHaveBeenCalledOnce();
  });

  it("reads more than one page of ranked Participants once and derives both projections", async () => {
    const rankedRows = Array.from({ length: 101 }, (_, index) => {
      const suffix = String(index + 1).padStart(3, "0");

      return rankedParticipantRow({
        id: `participant-admin-${suffix}`,
        rank: index + 1,
        total_points: 101 - index,
        wallet_address: `2F4ParticipantWallet${suffix}`,
      });
    });
    const pool = new TranscriptPool((call) => {
      if (call.text.includes("FROM campaign_os.schema_migrations")) {
        return { rows: [readinessRow()] };
      }
      if (call.text.includes("FROM campaign_os.campaigns")) {
        return { rows: [campaignRow()] };
      }
      if (call.text.includes("FROM campaign_os.campaign_participants")) {
        const limit = typeof call.values[1] === "number" ? call.values[1] : rankedRows.length;
        const offset = typeof call.values[2] === "number" ? call.values[2] : 0;

        return { rows: rankedRows.slice(offset, offset + limit) };
      }

      return { rows: [] };
    });

    const snapshot = await createStore(pool).readSnapshot(
      { campaignId: "campaign-admin-0001" },
      { traceId: "trace-ranked-snapshot-single-query" },
    );

    expect(snapshot.participants).toHaveLength(101);
    expect(snapshot.ranking).toHaveLength(101);
    expect(snapshot.ranking.map(({ participantId, rank }) => ({ participantId, rank }))).toEqual(
      snapshot.participants.map(({ id, rank }) => ({ participantId: id, rank })),
    );
    const rankedQueries = pool.calls.filter(({ text }) => text.includes("ROW_NUMBER() OVER"));
    expect(rankedQueries).toHaveLength(1);
    expect(rankedQueries[0]?.values).toEqual([
      "campaign-admin-0001",
      ADMIN_REVIEW_MAX_ARTIFACT_ROWS + 1,
    ]);
    expect(rankedQueries[0]?.text).toContain("id AS participant_id");
    expect(rankedQueries[0]?.text).toContain("LIMIT $2");
    expect(rankedQueries[0]?.text).not.toContain("OFFSET");
  });

  it.each([
    ["cross-Campaign Task", "campaign_id", (call: QueryCall) =>
      call.text.includes("FROM campaign_os.campaign_tasks")
        ? { rows: [taskRow({ campaign_id: "campaign-admin-other" })] }
        : undefined],
    ["malformed Participant count", "total_points", (call: QueryCall) =>
      call.text.includes("FROM campaign_os.campaign_participants")
        && call.text.includes("id = $2")
        ? { rows: [rankedParticipantRow({ total_points: "120" })] }
        : undefined],
    ["malformed Participant JSONB", "risk_flags", (call: QueryCall) =>
      call.text.includes("FROM campaign_os.campaign_participants")
        && call.text.includes("id = $2")
        ? { rows: [rankedParticipantRow({ risk_flags: ["safe", 7] })] }
        : undefined],
    ["malformed Evidence timestamp", "captured_at", (call: QueryCall) =>
      call.text.includes("FROM campaign_os.campaign_task_evidence")
        ? { rows: [evidenceRow({ captured_at: "not-a-timestamp" })] }
        : undefined],
    ["cross-wallet Completion", "wallet_address", (call: QueryCall) =>
      call.text.includes("FROM campaign_os.campaign_task_completions")
        ? { rows: [completionRow({ wallet_address: "2F4OtherWallet" })] }
        : undefined],
    ["cross-Completion Evidence", "completion_id", (call: QueryCall) =>
      call.text.includes("FROM campaign_os.campaign_task_evidence")
        ? { rows: [evidenceRow({ completion_id: "completion-other" })] }
        : undefined],
    ["unscoped ranking row", "participant_id", (call: QueryCall) =>
      call.text.includes("AS participant_id")
        ? {
            rows: [
              rankedParticipantRow(),
              rankedParticipantRow({
                id: "participant-admin-0002",
                rank: 2,
                wallet_address: "2F4OtherParticipantWallet",
              }),
            ],
          }
        : undefined],
  ])("rolls back and fails closed for %s", async (_caseName, field, override) => {
    const pool = new TranscriptPool((call) => {
      const overridden = override(call);
      if (overridden) {
        return overridden;
      }
      if (call.text.includes("FROM campaign_os.schema_migrations")) {
        return { rows: [readinessRow()] };
      }
      if (call.text.includes("FROM campaign_os.campaigns")) {
        return { rows: [campaignRow()] };
      }
      if (call.text.includes("FROM campaign_os.campaign_tasks")) {
        return { rows: [taskRow()] };
      }
      if (
        call.text.includes("FROM campaign_os.campaign_participants")
        && call.text.includes("id = $2")
      ) {
        return { rows: [rankedParticipantRow()] };
      }
      if (call.text.includes("FROM campaign_os.campaign_task_completions")) {
        return { rows: [completionRow()] };
      }
      if (call.text.includes("FROM campaign_os.campaign_task_evidence")) {
        return { rows: [evidenceRow()] };
      }
      return { rows: [] };
    });
    const store = createStore(pool);

    await expect(store.readSnapshot({
      campaignId: "campaign-admin-0001",
      participantId: "participant-admin-0001",
    }, { traceId: "trace-snapshot-corrupt" })).rejects.toMatchObject({
      code: "ADMIN_REVIEW_STORE_ROW_CORRUPTION",
      field,
      operation: "readSnapshot",
      traceId: "trace-snapshot-corrupt",
    });
    expect(pool.calls[pool.calls.length - 1]?.text).toBe("ROLLBACK");
    expect(pool.calls.every(({ text }) => !/\b(?:INSERT|UPDATE|DELETE|TRUNCATE)\b/i.test(text))).toBe(true);
    expect(pool.directCalls).toEqual([]);
    expect(pool.release).toHaveBeenCalledOnce();
  });
});

describe("PostgreSQL Admin review decisions", () => {
  it("locks, reprojects the snapshot, and appends one database-canonical version", async () => {
    const pool = new TranscriptPool((call) => {
      const snapshotResult = snapshotQueryResponse(call);
      if (snapshotResult) {
        return snapshotResult;
      }
      if (call.text.includes("COALESCE(MAX(version), 0)")) {
        return { rows: [{ current_version: "0" }] };
      }
      if (call.text.startsWith("INSERT INTO campaign_os.campaign_review_decisions")) {
        return { rows: [decisionRow()] };
      }

      return { rows: [] };
    });
    const store = createStore(pool);
    const projector = vi.fn(async () => snapshotProjection());

    await expect(store.appendDecision(
      decisionInput(),
      projector,
      { traceId: "trace-decision-create" },
    )).resolves.toEqual({
      created: true,
      record: {
        campaignId: "campaign-admin-0001",
        decidedAt: "2026-07-15T00:00:10.000Z",
        decision: "approved",
        id: "decision-admin-0001",
        idempotencyKeyHash: "2".repeat(64),
        note: "Evidence reviewed.",
        operatorRole: "review_operator",
        operatorSubject: "2F4ReviewOperator",
        participantId: "participant-admin-0001",
        payloadHash: deriveAdminReviewDecisionPayloadHash(decisionInput()),
        reasonCode: "evidence_verified",
        snapshotFingerprint: "1".repeat(64),
        snapshotManifest: snapshotProjection().manifest,
        snapshotVersion: ADMIN_REVIEW_SNAPSHOT_VERSION,
        traceId: "trace-decision-create",
        version: 1,
        walletAddress: "2F4ParticipantWallet",
      },
    });

    expect(projector).toHaveBeenCalledOnce();
    expect(pool.directCalls).toEqual([]);
    expect(pool.calls[0]?.text).toBe("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ");
    const advisoryIndex = pool.calls.findIndex(({ text }) => text.includes("pg_advisory_xact_lock"));
    const idempotencyIndex = pool.calls.findIndex(({ text }) =>
      text.includes("idempotency_key_hash = $3"));
    const campaignLockIndex = pool.calls.findIndex(({ text }) =>
      text.includes("FROM campaign_os.campaigns") && text.includes("FOR NO KEY UPDATE"));
    const participantLockIndex = pool.calls.findIndex(({ text }) =>
      text.includes("FROM campaign_os.campaign_participants")
      && text.includes("FOR NO KEY UPDATE"));
    expect(advisoryIndex).toBeGreaterThan(0);
    expect(idempotencyIndex).toBeGreaterThan(advisoryIndex);
    expect(campaignLockIndex).toBeGreaterThan(idempotencyIndex);
    expect(participantLockIndex).toBeGreaterThan(campaignLockIndex);
    expect(pool.calls.some(({ text }) =>
      text.startsWith("INSERT INTO campaign_os.campaign_review_decisions")
      && text.includes("ON CONFLICT DO NOTHING"))).toBe(true);
    expect(pool.calls[pool.calls.length - 1]?.text).toBe("COMMIT");
    expect(pool.calls[2]?.values).toEqual([
      "campaign-admin-0001",
      "participant-admin-0001",
    ]);
    expect(pool.calls[idempotencyIndex]?.values).toEqual([
      "campaign-admin-0001",
      "participant-admin-0001",
      "2".repeat(64),
    ]);
    expect(pool.calls.every(({ values }) => !values.includes("raw-idempotency-key"))).toBe(true);
    expect(pool.calls.every(({ text }) =>
      !/\b(?:UPDATE\s+campaign_os|DELETE\s+FROM|TRUNCATE\s+TABLE)\b/i.test(text))).toBe(true);
    expect(pool.release).toHaveBeenCalledOnce();
  });

  it("returns same-payload replay and rejects stale, conflict, and cross-Campaign ownership without writes", async () => {
    const run = async (options: {
      existing?: Record<string, unknown>;
      participant?: Record<string, unknown>;
      projection?: AdminReviewSnapshotProjection;
      traceId: string;
    }) => {
      const pool = new TranscriptPool((call) => {
        if (
          call.text.includes("FROM campaign_os.campaign_participants")
          && call.text.includes("id = $2")
          && !call.text.includes("FROM campaign_os.campaign_review_decisions")
          && !call.text.includes("AS participant_id")
        ) {
          return { rows: options.participant ? [options.participant] : [] };
        }
        const snapshotResult = snapshotQueryResponse(call);
        if (snapshotResult) {
          return snapshotResult;
        }
        if (call.text.includes("idempotency_key_hash = $3")) {
          return { rows: options.existing ? [options.existing] : [] };
        }

        return { rows: [] };
      });
      const projector = vi.fn(async () => options.projection ?? snapshotProjection());
      const result = storeResult(createStore(pool).appendDecision(
        decisionInput(),
        projector,
        { traceId: options.traceId },
      ));

      return { pool, projector, result: await result };
    };

    const replay = await run({
      existing: decisionRow({ trace_id: "trace-original" }),
      participant: participantRow(),
      projection: snapshotProjection({ fingerprint: "8".repeat(64) }),
      traceId: "trace-decision-replay",
    });
    expect(replay.result).toEqual({
      ok: true,
      value: expect.objectContaining({
        created: false,
        record: expect.objectContaining({ id: "decision-admin-0001", version: 1 }),
      }),
    });
    expect(replay.projector).not.toHaveBeenCalled();
    expect(replay.pool.calls.some(({ text }) => text.startsWith("INSERT"))).toBe(false);
    expect(replay.pool.calls[replay.pool.calls.length - 1]?.text).toBe("COMMIT");

    const corruptPayloadHash = await run({
      existing: decisionRow({ payload_hash: "9".repeat(64) }),
      participant: participantRow(),
      traceId: "trace-decision-payload-corrupt",
    });
    expect(corruptPayloadHash.result).toEqual({
      error: expect.objectContaining({
        code: "ADMIN_REVIEW_STORE_ROW_CORRUPTION",
        field: "payload_hash",
      }),
      ok: false,
    });
    expect(corruptPayloadHash.pool.calls.some(({ text }) => text.startsWith("INSERT"))).toBe(false);
    expect(corruptPayloadHash.pool.calls[corruptPayloadHash.pool.calls.length - 1]?.text).toBe("ROLLBACK");

    const stale = await run({
      participant: participantRow(),
      projection: snapshotProjection({ fingerprint: "8".repeat(64) }),
      traceId: "trace-decision-stale",
    });
    expect(stale.result).toEqual({
      error: expect.objectContaining({ code: "ADMIN_REVIEW_STORE_STALE" }),
      ok: false,
    });
    expect(stale.pool.calls.some(({ text }) => text.includes("idempotency_key_hash = $3"))).toBe(true);
    expect(stale.pool.calls[stale.pool.calls.length - 1]?.text).toBe("ROLLBACK");

    const missing = await run({
      traceId: "trace-decision-missing",
    });
    expect(missing.result).toEqual({
      error: expect.objectContaining({
        code: "ADMIN_REVIEW_STORE_NOT_FOUND",
        field: "participantId",
      }),
      ok: false,
    });
    expect(missing.projector).not.toHaveBeenCalled();
    expect(missing.pool.calls.some(({ text }) => text.startsWith("INSERT"))).toBe(false);
    expect(missing.pool.calls[missing.pool.calls.length - 1]?.text).toBe("ROLLBACK");
  });

  it("compares every immutable command field instead of trusting the claimed payload hash", async () => {
    const mutations: Array<[string, Partial<AdminReviewDecisionInput>]> = [
      ["decision", { decision: "rejected" }],
      ["snapshot fingerprint", { expectedSnapshotFingerprint: "8".repeat(64) }],
      ["reason", { reasonCode: "different_reason" }],
      ["note", { note: "Different note." }],
      ["operator subject", { operatorSubject: "2F4DifferentOperator" }],
      ["operator role", { operatorRole: "internal_operator" }],
    ];

    for (const [caseName, overrides] of mutations) {
      const pool = new TranscriptPool((call) => {
        if (call.text.includes("idempotency_key_hash = $3")) {
          return { rows: [decisionRow({ trace_id: "trace-original" })] };
        }

        return snapshotQueryResponse(call) ?? { rows: [] };
      });
      const projector = vi.fn(async () => snapshotProjection());

      await expect(createStore(pool).appendDecision(
        decisionInput(overrides),
        projector,
        { traceId: `trace-semantic-${caseName.replace(/\s+/g, "-")}` },
      )).rejects.toMatchObject({
        code: "ADMIN_REVIEW_STORE_IDEMPOTENCY_CONFLICT",
        field: "idempotencyKeyHash",
      });
      expect(projector).not.toHaveBeenCalled();
      expect(pool.calls.some(({ text }) => text.startsWith("INSERT"))).toBe(false);
      expect(pool.calls[pool.calls.length - 1]?.text).toBe("ROLLBACK");
    }
  });

  it("fails closed when a persisted decision no longer has composite ownership", async () => {
    const pool = new TranscriptPool((call) => {
      if (call.text.includes("FROM campaign_os.schema_migrations")) {
        return { rows: [readinessRow()] };
      }
      if (call.text.includes("FROM campaign_os.campaign_review_decisions")) {
        return { rows: [decisionRow({ ownership_valid: false })] };
      }

      return { rows: [] };
    });

    await expect(createStore(pool).getCurrentDecision(
      { campaignId: "campaign-admin-0001", participantId: "participant-admin-0001" },
      { traceId: "trace-decision-ownership-corrupt" },
    )).rejects.toMatchObject({
      code: "ADMIN_REVIEW_STORE_ROW_CORRUPTION",
      field: "wallet_address",
    });
    expect(pool.calls[1]?.text).toContain("AS ownership_valid");
  });

  it("fails closed when a persisted decision payload hash is not canonical", async () => {
    const pool = new TranscriptPool((call) => {
      if (call.text.includes("FROM campaign_os.schema_migrations")) {
        return { rows: [readinessRow()] };
      }
      if (call.text.includes("FROM campaign_os.campaign_review_decisions")) {
        return { rows: [decisionRow({ payload_hash: "9".repeat(64) })] };
      }

      return { rows: [] };
    });

    await expect(createStore(pool).getCurrentDecision(
      { campaignId: "campaign-admin-0001", participantId: "participant-admin-0001" },
      { traceId: "trace-decision-payload-corrupt-read" },
    )).rejects.toMatchObject({
      code: "ADMIN_REVIEW_STORE_ROW_CORRUPTION",
      field: "payload_hash",
    });
  });

  it("recovers a PostgreSQL unique serialization race in a fresh transaction", async () => {
    let idempotencyReads = 0;
    const pool = new TranscriptPool((call) => {
      if (call.text.includes("idempotency_key_hash = $3")) {
        idempotencyReads += 1;

        return {
          rows: idempotencyReads === 1
            ? []
            : [decisionRow({ trace_id: "trace-race-winner" })],
        };
      }
      if (call.text.startsWith("INSERT INTO campaign_os.campaign_review_decisions")) {
        throw Object.assign(new Error("serialization race"), { code: "40001" });
      }
      if (call.text.includes("COALESCE(MAX(version), 0)")) {
        return { rows: [{ current_version: "0" }] };
      }

      return snapshotQueryResponse(call) ?? { rows: [] };
    });

    await expect(createStore(pool).appendDecision(
      decisionInput(),
      async () => snapshotProjection(),
      { traceId: "trace-decision-race-recovery" },
    )).resolves.toEqual({
      created: false,
      record: expect.objectContaining({
        id: "decision-admin-0001",
        traceId: "trace-race-winner",
        version: 1,
      }),
    });
    expect(idempotencyReads).toBe(2);
    expect(pool.calls.filter(({ text }) => text === "ROLLBACK")).toHaveLength(1);
    expect(pool.calls.filter(({ text }) =>
      text === "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ")).toHaveLength(2);
    expect(pool.calls[pool.calls.length - 1]?.text).toBe("COMMIT");
    expect(pool.release).toHaveBeenCalledOnce();
  });

  it("serializes twenty-way retries and preserves unique monotonic versions", async () => {
    const pool = new StatefulDecisionPool();
    const store = createStore(pool);
    const project = async () => snapshotProjection();

    const sameKey = await Promise.all(Array.from({ length: 20 }, (_, index) =>
      store.appendDecision(
        decisionInput(),
        project,
        { traceId: `trace-decision-same-${index}` },
      )));
    expect(pool.committed).toHaveLength(1);
    expect(pool.insertCount).toBe(1);
    expect(new Set(sameKey.map(({ record }) => record.id)).size).toBe(1);
    expect(new Set(sameKey.map(({ record }) => record.version))).toEqual(new Set([1]));
    expect(sameKey.filter(({ created }) => created)).toHaveLength(1);

    const conflicting = await Promise.allSettled(Array.from({ length: 20 }, (_, index) =>
      store.appendDecision(
        decisionInput({ note: `Conflicting note ${index}` }),
        project,
        { traceId: `trace-decision-conflict-${index}` },
      )));
    expect(conflicting.every((result) =>
      result.status === "rejected"
      && result.reason instanceof AdminReviewStoreError
      && result.reason.code === "ADMIN_REVIEW_STORE_IDEMPOTENCY_CONFLICT")).toBe(true);
    expect(pool.committed).toHaveLength(1);
    expect(pool.insertCount).toBe(1);

    const semanticConflicts = await Promise.allSettled(Array.from({ length: 20 }, (_, index) => {
      const variants: Array<Partial<AdminReviewDecisionInput>> = [
        { decision: "rejected" },
        { expectedSnapshotFingerprint: "8".repeat(64) },
        { note: `Different note ${index}` },
        { operatorRole: "internal_operator" },
        { operatorSubject: `2F4DifferentOperator${index}` },
        { reasonCode: `different_reason_${index}` },
      ];

      return store.appendDecision(
        decisionInput(variants[index % variants.length]),
        project,
        { traceId: `trace-decision-semantic-conflict-${index}` },
      );
    }));
    expect(semanticConflicts.every((result) =>
      result.status === "rejected"
      && result.reason instanceof AdminReviewStoreError
      && result.reason.code === "ADMIN_REVIEW_STORE_IDEMPOTENCY_CONFLICT")).toBe(true);
    expect(pool.committed).toHaveLength(1);
    expect(pool.insertCount).toBe(1);

    const differentKeys = await Promise.all(Array.from({ length: 20 }, (_, index) =>
      store.appendDecision(
        decisionInput({
          idempotencyKeyHash: sha256(`decision-key-${index}`),
        }),
        project,
        { traceId: `trace-decision-version-${index}` },
      )));
    expect(pool.committed).toHaveLength(21);
    expect(pool.insertCount).toBe(21);
    expect(differentKeys.map(({ record }) => record.version).sort((left, right) => left - right)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 2),
    );
    expect(new Set(differentKeys.map(({ record }) => record.payloadHash))).toEqual(new Set([
      deriveAdminReviewDecisionPayloadHash(decisionInput()),
    ]));
    expect(pool.maxActiveLockHolders).toBe(1);
    expect(pool.release).toHaveBeenCalledTimes(80);
  });
});

describe("PostgreSQL Admin export artifacts", () => {
  it("projects facts and latest decisions inside the artifact insert transaction", async () => {
    const sequence: string[] = [];
    const pool = new TranscriptPool((call) => {
      sequence.push(call.text);
      const snapshotResult = snapshotQueryResponse(call);
      if (snapshotResult) {
        return snapshotResult;
      }
      if (call.text.includes("FROM campaign_os.campaign_review_decisions")) {
        return { rows: [decisionRow()] };
      }
      if (call.text.startsWith("INSERT INTO campaign_os.campaign_export_artifacts")) {
        return { rows: [artifactRow({ trace_id: "trace-artifact-project" })] };
      }

      return { rows: [] };
    });
    const store = createStore(pool);
    const projector = vi.fn(async (source) => {
      sequence.push("PROJECT_ARTIFACT");
      expect(source.rows).toEqual({
        campaign: expect.objectContaining({ id: "campaign-admin-0001" }),
        completions: [expect.objectContaining({ id: "completion-admin-0001" })],
        evidence: [expect.objectContaining({ id: "evidence-admin-0001" })],
        participants: [expect.objectContaining({ id: "participant-admin-0001" })],
        ranking: [expect.objectContaining({ participantId: "participant-admin-0001" })],
        tasks: [expect.objectContaining({ id: "task-admin-0001" })],
      });
      expect(source.latestDecisions).toEqual([
        expect.objectContaining({ id: "decision-admin-0001", version: 1 }),
      ]);

      return artifactProjection();
    });

    await expect(store.putArtifactFromSnapshot(
      artifactProjectionInput(),
      projector,
      { traceId: "trace-artifact-project" },
    )).resolves.toEqual({
      artifact: expect.objectContaining({
        campaignId: "campaign-admin-0001",
        sourceFingerprint: "4".repeat(64),
      }),
      created: true,
    });

    expect(projector).toHaveBeenCalledOnce();
    expect(pool.directCalls).toEqual([]);
    expect(pool.calls[0]?.text).toBe("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ");
    const decisionReadIndex = sequence.findIndex((value) =>
      value.includes("FROM campaign_os.campaign_review_decisions"));
    const projectorIndex = sequence.indexOf("PROJECT_ARTIFACT");
    const insertIndex = sequence.findIndex((value) =>
      value.startsWith("INSERT INTO campaign_os.campaign_export_artifacts"));
    expect(decisionReadIndex).toBeGreaterThan(0);
    expect(projectorIndex).toBeGreaterThan(decisionReadIndex);
    expect(insertIndex).toBeGreaterThan(projectorIndex);
    expect(pool.calls[pool.calls.length - 1]?.text).toBe("COMMIT");
    expect(pool.release).toHaveBeenCalledOnce();
  });

  it.each([
    ["projector failure", async () => { throw new Error("postgresql://secret /Users/private"); }, "ADMIN_REVIEW_STORE_ARGUMENT_INVALID", "projectArtifact"],
    ["content hash mismatch", async () => artifactProjection({ contentHash: "0".repeat(64) }), "ADMIN_REVIEW_STORE_CONTENT_INTEGRITY_FAILED", "contentHash"],
  ])("rolls back %s without a partial artifact", async (
    _caseName,
    projector,
    expectedCode,
    expectedField,
  ) => {
    const pool = new TranscriptPool((call) => {
      const snapshotResult = snapshotQueryResponse(call);
      if (snapshotResult) {
        return snapshotResult;
      }
      if (call.text.includes("FROM campaign_os.campaign_review_decisions")) {
        return { rows: [decisionRow()] };
      }
      return { rows: [] };
    });
    const store = createStore(pool);

    await expect(store.putArtifactFromSnapshot(
      artifactProjectionInput(),
      projector,
      { traceId: "trace-artifact-project-failure" },
    )).rejects.toMatchObject({
      code: expectedCode,
      field: expectedField,
      operation: "putArtifactFromSnapshot",
      traceId: "trace-artifact-project-failure",
    });
    expect(pool.calls.some(({ text }) =>
      text.startsWith("INSERT INTO campaign_os.campaign_export_artifacts"))).toBe(false);
    expect(pool.calls[pool.calls.length - 1]?.text).toBe("ROLLBACK");
    expect(pool.release).toHaveBeenCalledOnce();
  });

  it("exports the exact source-manifest persistence bound", () => {
    expect(ADMIN_REVIEW_MAX_SOURCE_MANIFEST_BYTES).toBe(2 * 1024 * 1024);
  });

  it("serializes twenty transactional same-source projections into one artifact", async () => {
    const pool = new StatefulArtifactPool();
    const store = createStore(pool);
    const projector = vi.fn(async () => artifactProjection());

    const results = await Promise.all(Array.from({ length: 20 }, (_, index) =>
      store.putArtifactFromSnapshot(
        artifactProjectionInput(),
        projector,
        { traceId: `trace-artifact-project-race-${index}` },
      )));

    expect(projector).toHaveBeenCalledTimes(20);
    expect(pool.committed).toHaveLength(1);
    expect(pool.insertCount).toBe(1);
    expect(new Set(results.map(({ artifact }) => artifact.id)).size).toBe(1);
    expect(new Set(results.map(({ artifact }) => artifact.contentHash)).size).toBe(1);
    expect(results.filter(({ created }) => created)).toHaveLength(1);
    expect(pool.maxActiveLockHolders).toBe(1);
    expect(pool.release).toHaveBeenCalledTimes(20);
  });

  it("rolls back an insert fault after projection without committing partial content", async () => {
    const pool = new TranscriptPool((call) => {
      const snapshotResult = snapshotQueryResponse(call);
      if (snapshotResult) {
        return snapshotResult;
      }
      if (call.text.includes("FROM campaign_os.campaign_review_decisions")) {
        return { rows: [decisionRow()] };
      }
      if (call.text.startsWith("INSERT INTO campaign_os.campaign_export_artifacts")) {
        throw new Error("database insert failed at postgresql://secret /Users/private");
      }
      return { rows: [] };
    });
    const store = createStore(pool);

    await expect(store.putArtifactFromSnapshot(
      artifactProjectionInput(),
      async () => artifactProjection(),
      { traceId: "trace-artifact-project-insert-fault" },
    )).rejects.toMatchObject({
      code: "ADMIN_REVIEW_STORE_QUERY_FAILED",
      field: "database",
      operation: "putArtifactFromSnapshot",
      traceId: "trace-artifact-project-insert-fault",
    });
    expect(pool.calls.some(({ text }) => text === "COMMIT")).toBe(false);
    expect(pool.calls[pool.calls.length - 1]?.text).toBe("ROLLBACK");
    expect(pool.release).toHaveBeenCalledOnce();
  });

  it("atomically inserts a validated exact-content artifact", async () => {
    const pool = new TranscriptPool((call) => {
      if (call.text.includes("FROM campaign_os.schema_migrations")) {
        return { rows: [readinessRow()] };
      }
      if (call.text.startsWith("INSERT INTO campaign_os.campaign_export_artifacts")) {
        return { rows: [artifactRow()] };
      }

      return { rows: [] };
    });
    const store = createStore(pool);

    await expect(store.putArtifact(
      artifactInput(),
      { traceId: "trace-artifact-create" },
    )).resolves.toEqual({
      artifact: {
        campaignId: "campaign-admin-0001",
        contentBytes: Buffer.byteLength(artifactInput().content, "utf8"),
        contentHash: artifactInput().contentHash,
        createdAt: "2026-07-15T00:00:20.000Z",
        creatorRole: "internal_operator",
        creatorSubject: "2F4ReviewOperator",
        fileName: "campaign-admin-0001.csv",
        format: "csv",
        id: "artifact-admin-0001",
        mimeType: "text/csv;charset=utf-8",
        rowCount: 1,
        sourceFingerprint: "4".repeat(64),
        sourceVersion: ADMIN_ARTIFACT_SOURCE_VERSION,
        traceId: "trace-artifact-create",
      },
      created: true,
    });
    expect(pool.directCalls).toEqual([]);
    expect(pool.calls.map(({ text }) => text)).toEqual([
      "BEGIN",
      expect.stringContaining("FROM campaign_os.schema_migrations"),
      expect.stringContaining(
        "pg_advisory_xact_lock( hashtextextended(jsonb_build_array($1::text, $2::text)::text, 0) )",
      ),
      expect.stringContaining("INSERT INTO campaign_os.campaign_export_artifacts"),
      "COMMIT",
    ]);
    expect(pool.calls[2]?.values).toEqual([
      "campaign-admin-0001",
      JSON.stringify(["4".repeat(64), "csv"]),
    ]);
    expect(pool.calls[3]?.text).toContain("ON CONFLICT (campaign_id, source_fingerprint, format) DO NOTHING");
    expect(pool.calls[3]?.values[8]).toBe(artifactInput().content);
    expect(pool.calls[3]?.values[9]).toBe(Buffer.byteLength(artifactInput().content, "utf8"));
    expect(pool.calls.every(({ text }) => !/\b(?:UPDATE|DELETE|TRUNCATE)\b/i.test(text))).toBe(true);
    expect(pool.release).toHaveBeenCalledOnce();
  });

  it("rejects hash, Unicode, JSONB, filename, row, and byte violations before I/O", async () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const oversized = "x".repeat(10 * 1024 * 1024 + 1);
    const pool = new TranscriptPool();
    const store = createStore(pool);
    const cases: Array<{
      expectedCode: string;
      expectedField: string;
      input: AdminExportArtifactInput;
    }> = [
      {
        expectedCode: "ADMIN_REVIEW_STORE_CONTENT_INTEGRITY_FAILED",
        expectedField: "contentHash",
        input: artifactInput({ contentHash: "0".repeat(64) }),
      },
      {
        expectedCode: "ADMIN_REVIEW_STORE_ARGUMENT_INVALID",
        expectedField: "content",
        input: artifactInput({ content: "invalid-\ud800-unicode", contentHash: sha256("invalid-\ud800-unicode") }),
      },
      {
        expectedCode: "ADMIN_REVIEW_STORE_ARGUMENT_INVALID",
        expectedField: "sourceManifest",
        input: artifactInput({ sourceManifest: circular as AdminExportArtifactInput["sourceManifest"] }),
      },
      {
        expectedCode: "ADMIN_REVIEW_STORE_ARGUMENT_INVALID",
        expectedField: "fileName",
        input: artifactInput({ fileName: "../private.csv" }),
      },
      {
        expectedCode: "ADMIN_REVIEW_STORE_BOUND_EXCEEDED",
        expectedField: "rowCount",
        input: artifactInput({ rowCount: 5_001 }),
      },
      {
        expectedCode: "ADMIN_REVIEW_STORE_BOUND_EXCEEDED",
        expectedField: "content",
        input: artifactInput({ content: oversized, contentHash: sha256(oversized) }),
      },
    ];

    for (const testCase of cases) {
      await expect(store.putArtifact(
        testCase.input,
        { traceId: "trace-artifact-invalid" },
      )).rejects.toMatchObject({
        code: testCase.expectedCode,
        field: testCase.expectedField,
        operation: "putArtifact",
        traceId: "trace-artifact-invalid",
      });
    }
    expect(pool.calls).toEqual([]);
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it("returns one immutable row for twenty concurrent source retries", async () => {
    const pool = new StatefulArtifactPool();
    const store = createStore(pool);

    const results = await Promise.all(Array.from({ length: 20 }, (_, index) =>
      store.putArtifact(
        artifactInput(),
        { traceId: `trace-artifact-race-${index}` },
      )));

    expect(pool.committed).toHaveLength(1);
    expect(pool.insertCount).toBe(1);
    expect(new Set(results.map(({ artifact }) => artifact.id)).size).toBe(1);
    expect(new Set(results.map(({ artifact }) => artifact.contentHash)).size).toBe(1);
    expect(results.filter(({ created }) => created)).toHaveLength(1);
    expect(pool.maxActiveLockHolders).toBe(1);
    expect(pool.release).toHaveBeenCalledTimes(20);
  });

  it("keeps list/detail metadata bounded and verifies exact content only on content reads", async () => {
    const pool = new TranscriptPool((call) => {
      if (call.text.includes("FROM campaign_os.schema_migrations")) {
        return { rows: [readinessRow()] };
      }
      if (call.text.includes("FROM campaign_os.campaign_export_artifacts")) {
        return { rows: [artifactRow()] };
      }

      return { rows: [] };
    });
    const store = createStore(pool);

    const list = await store.listArtifacts(
      { campaignId: "campaign-admin-0001", limit: 25 },
      { traceId: "trace-artifact-list" },
    );
    const detail = await store.getArtifact(
      { artifactId: "artifact-admin-0001", campaignId: "campaign-admin-0001" },
      { traceId: "trace-artifact-detail" },
    );
    const content = await store.readArtifactContent(
      { artifactId: "artifact-admin-0001", campaignId: "campaign-admin-0001" },
      { traceId: "trace-artifact-content" },
    );

    expect(list).toEqual([expect.objectContaining({ id: "artifact-admin-0001" })]);
    expect(list[0]).not.toHaveProperty("content");
    expect(list[0]).not.toHaveProperty("sourceManifest");
    expect(detail).toEqual({
      artifact: expect.objectContaining({ id: "artifact-admin-0001" }),
      sourceManifest: artifactInput().sourceManifest,
    });
    expect(detail).not.toHaveProperty("content");
    expect(content).toEqual({
      artifact: expect.objectContaining({ id: "artifact-admin-0001" }),
      content: artifactInput().content,
      sourceManifest: artifactInput().sourceManifest,
    });
    const dataQueries = pool.directCalls.filter(({ text }) =>
      text.includes("FROM campaign_os.campaign_export_artifacts"));
    expect(dataQueries).toHaveLength(3);
    expect(dataQueries[0]?.text).toContain("ORDER BY created_at DESC, id COLLATE \"C\" ASC LIMIT $2");
    expect(dataQueries[0]?.text).not.toMatch(/(?:^|,\s*)content(?:\s*,|\s+FROM)/i);
    expect(dataQueries[1]?.text).toContain("source_manifest");
    expect(dataQueries[1]?.text).not.toMatch(/(?:^|,\s*)content(?:\s*,|\s+FROM)/i);
    expect(dataQueries[2]?.text).toMatch(/(?:^|,\s*)content(?:\s*,|\s+FROM)/i);
  });

  it("pushes optional artifact format filtering into the bounded metadata query", async () => {
    const pool = new TranscriptPool((call) => {
      if (call.text.includes("FROM campaign_os.schema_migrations")) {
        return { rows: [readinessRow()] };
      }
      if (call.text.includes("FROM campaign_os.campaign_export_artifacts")) {
        return { rows: [artifactRow()] };
      }

      return { rows: [] };
    });
    const store = createStore(pool);

    await expect(store.listArtifacts(
      { campaignId: "campaign-admin-0001", format: "csv", limit: 25 },
      { traceId: "trace-artifact-format-list" },
    )).resolves.toEqual([expect.objectContaining({ format: "csv" })]);

    const dataQuery = pool.directCalls.find(({ text }) =>
      text.includes("FROM campaign_os.campaign_export_artifacts"));
    expect(dataQuery?.text).toContain("WHERE campaign_id = $1 AND format = $2");
    expect(dataQuery?.text).toContain("LIMIT $3");
    expect(dataQuery?.values).toEqual(["campaign-admin-0001", "csv", 25]);
  });

  it.each([
    ["content hash", { content_hash: "9".repeat(64) }, "ADMIN_REVIEW_STORE_CONTENT_INTEGRITY_FAILED", "contentHash"],
    ["content bytes", { content_bytes: 1 }, "ADMIN_REVIEW_STORE_CONTENT_INTEGRITY_FAILED", "contentBytes"],
    ["MIME", { mime_type: "application/json;charset=utf-8" }, "ADMIN_REVIEW_STORE_CONTENT_INTEGRITY_FAILED", "mimeType"],
    ["file extension", { file_name: "campaign-admin-0001.json" }, "ADMIN_REVIEW_STORE_CONTENT_INTEGRITY_FAILED", "fileName"],
    ["Campaign scope", { campaign_id: "campaign-admin-other" }, "ADMIN_REVIEW_STORE_ROW_CORRUPTION", "campaign_id"],
  ])("fails closed when stored %s is corrupt", async (_caseName, overrides, code, field) => {
    const pool = new TranscriptPool((call) => {
      if (call.text.includes("FROM campaign_os.schema_migrations")) {
        return { rows: [readinessRow()] };
      }
      if (call.text.includes("FROM campaign_os.campaign_export_artifacts")) {
        return { rows: [artifactRow(overrides)] };
      }

      return { rows: [] };
    });
    const store = createStore(pool);

    await expect(store.readArtifactContent(
      { artifactId: "artifact-admin-0001", campaignId: "campaign-admin-0001" },
      { traceId: "trace-artifact-corrupt" },
    )).rejects.toMatchObject({
      code,
      field,
      operation: "readArtifactContent",
      traceId: "trace-artifact-corrupt",
    });
  });
});

const storeResult = async <T>(promise: Promise<T>) => {
  try {
    return { ok: true as const, value: await promise };
  } catch (error) {
    return { error, ok: false as const };
  }
};

const isLoopback = (hostname: string) => {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  return normalized === "localhost" || normalized === "::1" || normalized.startsWith("127.");
};

const createRealPool = (databaseUrl: string, max = 20) => {
  const parsed = new URL(databaseUrl);

  return new pg.Pool({
    connectionString: databaseUrl,
    max,
    ssl: isLoopback(parsed.hostname) ? false : { rejectUnauthorized: true },
  });
};

const isolatedDatabaseUrl = (baseUrl: string, databaseName: string) => {
  const parsed = new URL(baseUrl);
  parsed.pathname = `/${databaseName}`;
  parsed.search = "";

  return parsed.toString();
};

const migrationPoolAdapter = (pool: pg.Pool): PostgresMigrationPool => ({
  connect: async () => {
    const client = await pool.connect();

    return {
      query: async (text, values = []) => {
        const result = await client.query(text, [...values]);

        return { rows: result.rows as Array<Record<string, unknown>> };
      },
      release: () => client.release(),
    };
  },
  end: async () => pool.end(),
});

const seedRealCampaign = async (
  pool: pg.Pool,
  fixture: {
    campaignId: string;
    completionId: string;
    evidenceId: string;
    participantId: string;
    suffix: string;
    taskId: string;
    walletAddress: string;
  },
) => {
  const createdAt = "2026-07-15T01:00:00.000Z";
  const updatedAt = "2026-07-15T01:00:01.000Z";
  await pool.query(
    `INSERT INTO campaign_os.campaigns (
       id, project_id, owner_address, status, default_locale, supported_locales,
       wallet_policy, contract_mode, goal, duration, reward_description,
       start_time, end_time, publish_readiness, created_at, updated_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11,
       $12, $13, $14::jsonb, $15, $16
     )`,
    [
      fixture.campaignId,
      `project-${fixture.suffix}`,
      `owner-${fixture.suffix}`,
      "draft",
      "en-US",
      JSON.stringify(["en-US"]),
      "ANY",
      "OFF_CHAIN_MVP",
      `Review ${fixture.suffix}`,
      "14 days",
      "Points only",
      "2026-08-01T00:00:00.000Z",
      "2026-08-15T00:00:00.000Z",
      JSON.stringify({ blockers: [], ready: true, warnings: [] }),
      createdAt,
      updatedAt,
    ],
  );
  await pool.query(
    `INSERT INTO campaign_os.campaign_tasks (
       id, campaign_id, template_code, verification_type, wallet_compatibility,
       points, required, evidence_rule, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10)`,
    [
      fixture.taskId,
      fixture.campaignId,
      `task-${fixture.suffix}`,
      "ON_CHAIN",
      "ANY",
      120,
      true,
      JSON.stringify({ source: "AELFSCAN" }),
      createdAt,
      updatedAt,
    ],
  );
  await pool.query(
    `INSERT INTO campaign_os.campaign_participants (
       id, campaign_id, wallet_address, account_type, wallet_source,
       wallet_type_verified, wallet_signature_status, wallet_verified_at,
       locale_preference, total_points, rank, risk_flags, created_at, updated_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14
     )`,
    [
      fixture.participantId,
      fixture.campaignId,
      fixture.walletAddress,
      "EOA",
      "PORTKEY_EOA_EXTENSION",
      true,
      "signed",
      createdAt,
      "en-US",
      120,
      1,
      JSON.stringify([]),
      createdAt,
      updatedAt,
    ],
  );
  await pool.query(
    `INSERT INTO campaign_os.campaign_task_completions (
       id, campaign_id, task_id, wallet_address, account_type, wallet_source,
       status, evidence_source, evidence_id, evidence_hash, points_awarded,
       completed_at, created_at, updated_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
     )`,
    [
      fixture.completionId,
      fixture.campaignId,
      fixture.taskId,
      fixture.walletAddress,
      "EOA",
      "PORTKEY_EOA_EXTENSION",
      "completed",
      "AELFSCAN",
      fixture.evidenceId,
      `completion-hash-${fixture.suffix}`,
      120,
      updatedAt,
      createdAt,
      updatedAt,
    ],
  );
  await pool.query(
    `INSERT INTO campaign_os.campaign_task_evidence (
       id, campaign_id, task_id, wallet_address, completion_id, account_type,
       wallet_source, status, evidence_source, evidence_hash, evidence_ref,
       diagnostic_codes, points_awarded, captured_at, live_contract_executed,
       live_provider_executed, live_reward_executed, live_storage_executed,
       created_at, updated_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb,
       $13, $14, $15, $16, $17, $18, $19, $20
     )`,
    [
      fixture.evidenceId,
      fixture.campaignId,
      fixture.taskId,
      fixture.walletAddress,
      fixture.completionId,
      "EOA",
      "PORTKEY_EOA_EXTENSION",
      "completed",
      "AELFSCAN",
      `evidence-hash-${fixture.suffix}`,
      `aelfscan://transaction/${fixture.suffix}`,
      JSON.stringify(["local-review"]),
      120,
      updatedAt,
      false,
      false,
      false,
      false,
      createdAt,
      updatedAt,
    ],
  );
};

realPostgresSuite("PostgreSQL Admin review store real acceptance", () => {
  const databaseName = `campaign_os_m242_wp02_${process.pid}_${randomUUID().replace(/-/g, "").slice(0, 10)}`;
  const campaignA = {
    campaignId: "campaign-admin-0001",
    completionId: "completion-admin-0001",
    evidenceId: "evidence-admin-0001",
    participantId: "participant-admin-0001",
    suffix: "a",
    taskId: "task-admin-0001",
    walletAddress: "2F4ParticipantWallet",
  };
  const campaignB = {
    campaignId: "campaign-admin-0002",
    completionId: "completion-admin-0002",
    evidenceId: "evidence-admin-0002",
    participantId: "participant-admin-0002",
    suffix: "b",
    taskId: "task-admin-0002",
    walletAddress: "2F4OtherCampaignWallet",
  };
  const multiParticipantCampaign = {
    campaignId: "campaign-admin-multi",
    completionId: "completion-admin-multi-a",
    evidenceId: "evidence-admin-multi-a",
    participantId: "participant-admin-multi-a",
    suffix: "multi",
    taskId: "task-admin-multi",
    walletAddress: "2F4MultiParticipantA",
  };
  let adminPool: pg.Pool;
  let databasePool: pg.Pool;
  let databaseUrl = "";
  let definitions: PostgresMigrationDefinition[] = [];
  let reviewMigration: PostgresMigrationDefinition;
  let store: ReturnType<typeof createPostgresAdminReviewStore>;
  let executedMigrationCount = 0;

  const createDatabase = async (name: string) => {
    if (!/^[a-z0-9_]+$/.test(name)) {
      throw new Error("Generated PostgreSQL acceptance database name is invalid.");
    }
    await adminPool.query(`CREATE DATABASE "${name}"`);
  };

  const dropDatabase = async (name: string) => {
    if (!/^[a-z0-9_]+$/.test(name)) {
      throw new Error("Generated PostgreSQL acceptance database name is invalid.");
    }
    await adminPool.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  };

  const applyMigrations = async (
    targetUrl: string,
    migrations: readonly PostgresMigrationDefinition[],
    traceId: string,
  ) => {
    const pool = createRealPool(targetUrl, 4);

    try {
      return await runPostgresMigrations({
        approved: true,
        migrations,
        mode: "apply",
        pool: migrationPoolAdapter(pool),
        traceId,
      });
    } finally {
      await pool.end();
    }
  };

  const factSnapshot = async () => {
    const tables = [
      "campaigns",
      "campaign_tasks",
      "campaign_participants",
      "campaign_task_completions",
      "campaign_task_evidence",
    ] as const;
    const entries = await Promise.all(tables.map(async (table) => {
      const result = await databasePool.query(
        `SELECT to_jsonb(row_data) AS row_data
         FROM (SELECT * FROM campaign_os.${table} ORDER BY id) AS row_data`,
      );

      return [table, result.rows.map(({ row_data }) => row_data)] as const;
    }));

    return Object.fromEntries(entries);
  };

  beforeAll(async () => {
    definitions = await loadPostgresMigrations();
    reviewMigration = definitions.find(({ id }) => id === ADMIN_REVIEW_MIGRATION_ID)!;
    if (!reviewMigration) {
      throw new Error("Committed Admin review migration was not discovered.");
    }
    adminPool = createRealPool(TEST_DATABASE_URL!, 4);
    await createDatabase(databaseName);
    databaseUrl = isolatedDatabaseUrl(TEST_DATABASE_URL!, databaseName);
    const migrationResult = await applyMigrations(
      databaseUrl,
      definitions,
      "trace-real-migration",
    );
    executedMigrationCount = migrationResult.appliedMigrationIds.length;
    databasePool = createRealPool(databaseUrl, 24);
    await seedRealCampaign(databasePool, campaignA);
    await seedRealCampaign(databasePool, campaignB);
    store = createPostgresAdminReviewStore({
      boundedListLimit: 100,
      expectedMigration: {
        checksum: reviewMigration.checksum,
        id: reviewMigration.id,
      },
      ownsPool: false,
      pool: databasePool,
    });
  }, 60_000);

  afterAll(async () => {
    const cleanupErrors: unknown[] = [];

    if (store) {
      try {
        await store.close({ traceId: "trace-real-store-close" });
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    if (databasePool) {
      try {
        let remainingClients = databasePool.totalCount;
        const clientsDisconnected = remainingClients === 0
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              const handleRemove = () => {
                remainingClients -= 1;
                if (remainingClients === 0) {
                  databasePool.off("remove", handleRemove);
                  resolve();
                }
              };
              databasePool.on("remove", handleRemove);
            });
        await databasePool.end();
        await clientsDisconnected;
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    if (adminPool) {
      try {
        await dropDatabase(databaseName);
      } catch (error) {
        cleanupErrors.push(error);
      }
      try {
        await adminPool.end();
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    if (cleanupErrors.length > 0) {
      throw new Error(`Admin review PostgreSQL cleanup failed (${cleanupErrors.length} errors).`);
    }
  }, 60_000);

  it("executes committed migrations and enforces real schema contracts", async () => {
    expect(TEST_DATABASE_URL).toBeTruthy();
    expect(executedMigrationCount).toBeGreaterThan(0);
    const ledger = await databasePool.query(
      "SELECT migration_id, checksum FROM campaign_os.schema_migrations ORDER BY migration_id",
    );
    expect(ledger.rows).toEqual(definitions.map(({ checksum, id }) => ({
      checksum,
      migration_id: id,
    })));
    const indexes = await databasePool.query<{ indexname: string }>(
      `SELECT indexname
       FROM pg_indexes
       WHERE schemaname = $1
         AND tablename IN ($2, $3, $4)
       ORDER BY indexname`,
      [
        "campaign_os",
        "campaign_review_decisions",
        "campaign_export_artifacts",
        "campaign_participants",
      ],
    );
    expect(indexes.rows.map(({ indexname }) => indexname)).toEqual(expect.arrayContaining([
      "campaign_os_campaign_export_artifacts_list_idx",
      "campaign_os_campaign_participants_dynamic_rank_idx",
      "campaign_os_campaign_review_decisions_current_idx",
      "campaign_os_campaign_review_decisions_filter_idx",
    ]));
    const ownershipConstraints = await databasePool.query<{
      constraint_definition: string;
      constraint_name: string;
    }>(
      `SELECT conname AS constraint_name, pg_get_constraintdef(oid) AS constraint_definition
       FROM pg_constraint
       WHERE connamespace = 'campaign_os'::regnamespace
         AND conname IN ($1, $2)
       ORDER BY conname`,
      [
        "campaign_os_campaign_participants_campaign_id_id_wallet_key",
        "campaign_os_campaign_review_decisions_participant_owner_fk",
      ],
    );
    expect(ownershipConstraints.rows).toEqual([
      {
        constraint_definition: "UNIQUE (campaign_id, id, wallet_address)",
        constraint_name: "campaign_os_campaign_participants_campaign_id_id_wallet_key",
      },
      {
        constraint_definition: expect.stringContaining(
          "FOREIGN KEY (campaign_id, participant_id, wallet_address)",
        ),
        constraint_name: "campaign_os_campaign_review_decisions_participant_owner_fk",
      },
    ]);
    const triggers = await databasePool.query<{ event_manipulation: string; trigger_name: string }>(
      `SELECT trigger_name, event_manipulation
       FROM information_schema.triggers
       WHERE trigger_schema = $1
         AND event_object_table IN ($2, $3)
       ORDER BY trigger_name, event_manipulation`,
      ["campaign_os", "campaign_review_decisions", "campaign_export_artifacts"],
    );
    expect(triggers.rows).toEqual(expect.arrayContaining([
      { event_manipulation: "DELETE", trigger_name: "campaign_export_artifacts_append_only" },
      { event_manipulation: "UPDATE", trigger_name: "campaign_export_artifacts_append_only" },
      { event_manipulation: "DELETE", trigger_name: "campaign_review_decisions_append_only" },
      { event_manipulation: "UPDATE", trigger_name: "campaign_review_decisions_append_only" },
    ]));
    const truncateTriggers = await databasePool.query<{ trigger_name: string }>(
      `SELECT tgname AS trigger_name
       FROM pg_trigger
       WHERE tgrelid IN ($1::regclass, $2::regclass)
         AND NOT tgisinternal
         AND (tgtype & 32) = 32
       ORDER BY tgname`,
      [
        "campaign_os.campaign_review_decisions",
        "campaign_os.campaign_export_artifacts",
      ],
    );
    expect(truncateTriggers.rows).toEqual([
      { trigger_name: "campaign_export_artifacts_truncate_append_only" },
      { trigger_name: "campaign_review_decisions_truncate_append_only" },
    ]);

    const decisionInsertSql =
      `INSERT INTO campaign_os.campaign_review_decisions (
         id, campaign_id, participant_id, wallet_address, version, decision,
         snapshot_version, snapshot_fingerprint, snapshot_manifest, reason_code,
         operator_subject, operator_role, idempotency_key_hash, payload_hash,
         trace_id, decided_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10,
         $11, $12, $13, $14, $15, CURRENT_TIMESTAMP
       )`;
    const invalidOwnership = [
      ["cross-campaign", campaignA.campaignId, campaignB.participantId, campaignB.walletAddress],
      ["wrong-wallet", campaignA.campaignId, campaignA.participantId, "2F4WrongWallet"],
      ["cross-wallet", campaignB.campaignId, campaignA.participantId, campaignA.walletAddress],
    ] as const;
    for (const [suffix, campaignId, participantId, walletAddress] of invalidOwnership) {
      await expect(databasePool.query(decisionInsertSql, [
        `decision-invalid-${suffix}`,
        campaignId,
        participantId,
        walletAddress,
        1,
        "approved",
        ADMIN_REVIEW_SNAPSHOT_VERSION,
        "1".repeat(64),
        JSON.stringify({ version: ADMIN_REVIEW_SNAPSHOT_VERSION }),
        "evidence_verified",
        "2F4ReviewOperator",
        "review_operator",
        sha256(`invalid-key-${suffix}`),
        sha256(`invalid-payload-${suffix}`),
        `trace-real-invalid-${suffix}`,
      ])).rejects.toMatchObject({ code: "23503" });
    }
    await expect(store.getCurrentDecision(
      { campaignId: campaignA.campaignId, participantId: campaignB.participantId },
      { traceId: "trace-real-invalid-ownership-read" },
    )).resolves.toBeUndefined();
    for (const table of ["campaign_review_decisions", "campaign_export_artifacts"]) {
      await expect(databasePool.query(`TRUNCATE TABLE campaign_os.${table}`)).rejects.toMatchObject({
        code: "55000",
      });
    }
    await expect(databasePool.query(
      `INSERT INTO campaign_os.campaign_export_artifacts (
         id, campaign_id, source_version, source_fingerprint, source_manifest,
         format, row_count, content_hash, content, content_bytes, file_name,
         mime_type, creator_subject, creator_role, trace_id, created_at
       ) VALUES (
         $1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11,
         $12, $13, $14, $15, CURRENT_TIMESTAMP
       )`,
      [
        "artifact-invalid-bound",
        campaignA.campaignId,
        ADMIN_ARTIFACT_SOURCE_VERSION,
        "7".repeat(64),
        JSON.stringify({ version: ADMIN_ARTIFACT_SOURCE_VERSION }),
        "csv",
        5_001,
        sha256(""),
        "",
        0,
        "invalid-bound.csv",
        "text/csv;charset=utf-8",
        "2F4ReviewOperator",
        "internal_operator",
        "trace-real-invalid-bound",
      ],
    )).rejects.toMatchObject({ code: "23514" });
  }, 30_000);

  it("requires the exact latest Admin review readiness checksum on a real database", async () => {
    const readinessDatabase = `campaign_os_m242_ready_${process.pid}_${randomUUID().replace(/-/g, "").slice(0, 8)}`;
    await createDatabase(readinessDatabase);
    const readinessUrl = isolatedDatabaseUrl(TEST_DATABASE_URL!, readinessDatabase);
    let readinessPool: pg.Pool | undefined;

    try {
      await applyMigrations(
        readinessUrl,
        [definitions[0]!, definitions[1]!],
        "trace-real-through-0002",
      );
      readinessPool = createRealPool(readinessUrl, 4);
      const readinessStore = createPostgresAdminReviewStore({
        boundedListLimit: 100,
        expectedMigration: { checksum: reviewMigration.checksum, id: reviewMigration.id },
        ownsPool: false,
        pool: readinessPool,
      });
      await expect(readinessStore.listArtifacts(
        { campaignId: campaignA.campaignId },
        { traceId: "trace-real-missing-0003" },
      )).rejects.toMatchObject({
        code: "ADMIN_REVIEW_STORE_SCHEMA_NOT_READY",
        field: "migrationId",
      });
      await readinessPool.end();
      readinessPool = undefined;

      await applyMigrations(readinessUrl, definitions, "trace-real-apply-0003");
      readinessPool = createRealPool(readinessUrl, 4);
      await readinessPool.query(
        "UPDATE campaign_os.schema_migrations SET checksum = $1 WHERE migration_id = $2",
        ["0".repeat(64), ADMIN_REVIEW_MIGRATION_ID],
      );
      const driftStore = createPostgresAdminReviewStore({
        boundedListLimit: 100,
        expectedMigration: { checksum: reviewMigration.checksum, id: reviewMigration.id },
        ownsPool: false,
        pool: readinessPool,
      });
      await expect(driftStore.listArtifacts(
        { campaignId: campaignA.campaignId },
        { traceId: "trace-real-checksum-drift" },
      )).rejects.toMatchObject({
        code: "ADMIN_REVIEW_STORE_MIGRATION_CHECKSUM_MISMATCH",
        field: "migrationChecksum",
      });
    } finally {
      if (readinessPool) {
        await readinessPool.end();
      }
      await dropDatabase(readinessDatabase);
    }
  }, 60_000);

  it("isolates real snapshot ownership and serializes decision races without fact mutation", async () => {
    const beforeFacts = await factSnapshot();
    const snapshot = await store.readSnapshot(
      { campaignId: campaignA.campaignId, participantId: campaignA.participantId },
      { traceId: "trace-real-snapshot" },
    );
    expect(snapshot).toMatchObject({
      campaign: { id: campaignA.campaignId },
      completions: [{ id: campaignA.completionId, walletAddress: campaignA.walletAddress }],
      evidence: [{ id: campaignA.evidenceId, walletAddress: campaignA.walletAddress }],
      participants: [{ id: campaignA.participantId, walletAddress: campaignA.walletAddress }],
      tasks: [{ id: campaignA.taskId }],
    });
    const crossCampaign = await store.readSnapshot(
      { campaignId: campaignA.campaignId, participantId: campaignB.participantId },
      { traceId: "trace-real-cross-campaign" },
    );
    expect(crossCampaign.campaign?.id).toBe(campaignA.campaignId);
    expect(crossCampaign.participants).toEqual([]);
    expect(crossCampaign.completions).toEqual([]);
    expect(crossCampaign.evidence).toEqual([]);

    const sameKey = await Promise.all(Array.from({ length: 20 }, (_, index) =>
      store.appendDecision(
        decisionInput(),
        async () => snapshotProjection(),
        { traceId: `trace-real-decision-same-${index}` },
      )));
    expect(sameKey.filter(({ created }) => created)).toHaveLength(1);
    expect(new Set(sameKey.map(({ record }) => record.id)).size).toBe(1);
    const afterSameKey = await databasePool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM campaign_os.campaign_review_decisions
       WHERE campaign_id = $1 AND participant_id = $2`,
      [campaignA.campaignId, campaignA.participantId],
    );
    expect(Number(afterSameKey.rows[0]?.count)).toBe(1);
    const persistedDecision = sameKey[0]!.record;
    expect(persistedDecision.payloadHash).toBe(
      deriveAdminReviewDecisionPayloadHash(decisionInput()),
    );

    await databasePool.query(
      "ALTER TABLE campaign_os.campaign_review_decisions DISABLE TRIGGER campaign_review_decisions_append_only",
    );
    try {
      await databasePool.query(
        "UPDATE campaign_os.campaign_review_decisions SET payload_hash = $1 WHERE id = $2",
        ["9".repeat(64), persistedDecision.id],
      );
    } finally {
      await databasePool.query(
        "ALTER TABLE campaign_os.campaign_review_decisions ENABLE TRIGGER campaign_review_decisions_append_only",
      );
    }
    try {
      await expect(store.getCurrentDecision(
        { campaignId: campaignA.campaignId, participantId: campaignA.participantId },
        { traceId: "trace-real-decision-payload-corrupt" },
      )).rejects.toMatchObject({
        code: "ADMIN_REVIEW_STORE_ROW_CORRUPTION",
        field: "payload_hash",
      });
    } finally {
      await databasePool.query(
        "ALTER TABLE campaign_os.campaign_review_decisions DISABLE TRIGGER campaign_review_decisions_append_only",
      );
      try {
        await databasePool.query(
          "UPDATE campaign_os.campaign_review_decisions SET payload_hash = $1 WHERE id = $2",
          [persistedDecision.payloadHash, persistedDecision.id],
        );
      } finally {
        await databasePool.query(
          "ALTER TABLE campaign_os.campaign_review_decisions ENABLE TRIGGER campaign_review_decisions_append_only",
        );
      }
    }

    const conflicts = await Promise.allSettled(Array.from({ length: 20 }, (_, index) =>
      store.appendDecision(
        decisionInput({ note: `Real conflicting note ${index}` }),
        async () => snapshotProjection(),
        { traceId: `trace-real-decision-conflict-${index}` },
      )));
    expect(conflicts.every((result) =>
      result.status === "rejected"
      && result.reason instanceof AdminReviewStoreError
      && result.reason.code === "ADMIN_REVIEW_STORE_IDEMPOTENCY_CONFLICT")).toBe(true);

    const versions = await Promise.all(Array.from({ length: 20 }, (_, index) =>
      store.appendDecision(
        decisionInput({
          idempotencyKeyHash: sha256(`real-key-${index}`),
        }),
        async () => snapshotProjection(),
        { traceId: `trace-real-decision-version-${index}` },
      )));
    expect(versions.map(({ record }) => record.version).sort((left, right) => left - right)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 2),
    );
    const countBeforeFault = await databasePool.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM campaign_os.campaign_review_decisions",
    );
    await expect(store.appendDecision(
      decisionInput({
        idempotencyKeyHash: sha256("real-projector-fault"),
      }),
      async () => {
        throw new Error("private projector failure");
      },
      { traceId: "trace-real-projector-fault" },
    )).rejects.toMatchObject({
      code: "ADMIN_REVIEW_STORE_ARGUMENT_INVALID",
      field: "projectSnapshot",
    });
    await expect(store.appendDecision(
      decisionInput({ campaignId: campaignA.campaignId, participantId: campaignB.participantId }),
      async () => snapshotProjection(),
      { traceId: "trace-real-cross-campaign-decision" },
    )).rejects.toMatchObject({
      code: "ADMIN_REVIEW_STORE_NOT_FOUND",
      field: "participantId",
    });
    const countAfterFault = await databasePool.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM campaign_os.campaign_review_decisions",
    );
    expect(countAfterFault.rows).toEqual(countBeforeFault.rows);
    expect(await factSnapshot()).toEqual(beforeFacts);

    const decisionId = sameKey[0]!.record.id;
    await expect(databasePool.query(
      "UPDATE campaign_os.campaign_review_decisions SET note = $1 WHERE id = $2",
      ["mutated", decisionId],
    )).rejects.toMatchObject({ code: "55000" });
    await expect(databasePool.query(
      "DELETE FROM campaign_os.campaign_review_decisions WHERE id = $1",
      [decisionId],
    )).rejects.toMatchObject({ code: "55000" });
  }, 60_000);

  it("preserves the campaign-wide rank for a scoped second-place Participant", async () => {
    await seedRealCampaign(databasePool, multiParticipantCampaign);
    const scopedParticipantId = "participant-admin-multi-b";
    const scopedWalletAddress = "2F4MultiParticipantB";
    await databasePool.query(
      `INSERT INTO campaign_os.campaign_participants (
         id, campaign_id, wallet_address, account_type, wallet_source,
         wallet_type_verified, wallet_signature_status, wallet_verified_at,
         locale_preference, total_points, rank, risk_flags, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14
       )`,
      [
        scopedParticipantId,
        multiParticipantCampaign.campaignId,
        scopedWalletAddress,
        "EOA",
        "PORTKEY_EOA_EXTENSION",
        true,
        "signed",
        "2026-07-15T01:00:00.000Z",
        "en-US",
        0,
        2,
        JSON.stringify([]),
        "2026-07-15T01:00:00.000Z",
        "2026-07-15T01:00:01.000Z",
      ],
    );
    const beforeFacts = await factSnapshot();

    const snapshot = await store.readSnapshot({
      campaignId: multiParticipantCampaign.campaignId,
      participantId: scopedParticipantId,
    }, { traceId: "trace-real-multi-participant-snapshot" });
    expect(snapshot.participants).toMatchObject([{ id: scopedParticipantId, rank: 2 }]);
    expect(snapshot.ranking).toMatchObject([{ participantId: scopedParticipantId, rank: 2 }]);
    expect(snapshot.completions).toEqual([]);
    expect(snapshot.evidence).toEqual([]);

    const expectedFingerprint = "6".repeat(64);
    const input = decisionInput({
      campaignId: multiParticipantCampaign.campaignId,
      expectedSnapshotFingerprint: expectedFingerprint,
      idempotencyKeyHash: sha256("real-multi-participant-decision"),
      participantId: scopedParticipantId,
    });
    await expect(store.appendDecision(input, async (rows) => {
      expect(rows.participants).toMatchObject([{ id: scopedParticipantId, rank: 2 }]);
      expect(rows.ranking).toMatchObject([{ participantId: scopedParticipantId, rank: 2 }]);

      return snapshotProjection({
        fingerprint: expectedFingerprint,
        manifest: {
          campaignId: multiParticipantCampaign.campaignId,
          participantId: scopedParticipantId,
          version: ADMIN_REVIEW_SNAPSHOT_VERSION,
        },
        walletAddress: scopedWalletAddress,
      });
    }, { traceId: "trace-real-multi-participant-decision" })).resolves.toMatchObject({
      created: true,
      record: {
        campaignId: multiParticipantCampaign.campaignId,
        participantId: scopedParticipantId,
      },
    });
    const persisted = await databasePool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM campaign_os.campaign_review_decisions
       WHERE campaign_id = $1 AND participant_id = $2`,
      [multiParticipantCampaign.campaignId, scopedParticipantId],
    );
    expect(persisted.rows).toEqual([{ count: "1" }]);
    expect(await factSnapshot()).toEqual(beforeFacts);
  }, 60_000);

  it("locks canonical ownership and replays the exact command after fact drift", async () => {
    const input = decisionInput({
      campaignId: campaignB.campaignId,
      idempotencyKeyHash: sha256("real-lock-and-drift-key"),
      participantId: campaignB.participantId,
    });
    const projection = snapshotProjection({
      manifest: {
        campaignId: campaignB.campaignId,
        participantId: campaignB.participantId,
        version: ADMIN_REVIEW_SNAPSHOT_VERSION,
      },
      walletAddress: campaignB.walletAddress,
    });
    let walletMutationSettled = false;
    let factMutationSettled = false;
    let walletMutation: Promise<{ error?: unknown; rowCount?: number }> | undefined;
    let factMutation: Promise<{ error?: unknown; rowCount?: number }> | undefined;

    try {
      const created = await store.appendDecision(input, async (rows) => {
        expect(rows.participants).toEqual([
          expect.objectContaining({
            id: campaignB.participantId,
            totalPoints: 120,
            walletAddress: campaignB.walletAddress,
          }),
        ]);
        walletMutation = databasePool.query(
          `UPDATE campaign_os.campaign_participants
           SET wallet_address = $1, updated_at = $2
           WHERE campaign_id = $3 AND id = $4`,
          [
            "2F4ConcurrentWallet",
            "2026-07-15T01:00:02.000Z",
            campaignB.campaignId,
            campaignB.participantId,
          ],
        ).then(
          ({ rowCount }) => ({ rowCount: rowCount ?? 0 }),
          (error: unknown) => ({ error }),
        ).finally(() => {
          walletMutationSettled = true;
        });
        factMutation = databasePool.query(
          `UPDATE campaign_os.campaign_participants
           SET total_points = $1, updated_at = $2
           WHERE campaign_id = $3 AND id = $4`,
          [121, "2026-07-15T01:00:02.000Z", campaignB.campaignId, campaignB.participantId],
        ).then(
          ({ rowCount }) => ({ rowCount: rowCount ?? 0 }),
          (error: unknown) => ({ error }),
        ).finally(() => {
          factMutationSettled = true;
        });
        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(walletMutationSettled).toBe(false);
        expect(factMutationSettled).toBe(false);

        return projection;
      }, { traceId: "trace-real-lock-and-drift-create" });
      expect(created.created).toBe(true);

      const walletOutcome = await walletMutation!;
      const factOutcome = await factMutation!;
      expect(walletOutcome.error).toMatchObject({ code: "23503" });
      expect(factOutcome).toEqual({ rowCount: 1 });

      const replayProjector = vi.fn(async () => snapshotProjection({
        fingerprint: "9".repeat(64),
      }));
      await expect(store.appendDecision(
        input,
        replayProjector,
        { traceId: "trace-real-lock-and-drift-replay" },
      )).resolves.toMatchObject({
        created: false,
        record: { id: created.record.id, version: created.record.version },
      });
      expect(replayProjector).not.toHaveBeenCalled();

      const conflictProjector = vi.fn(async () => projection);
      await expect(store.appendDecision(
        { ...input, decision: "rejected" },
        conflictProjector,
        { traceId: "trace-real-semantic-conflict" },
      )).rejects.toMatchObject({
        code: "ADMIN_REVIEW_STORE_IDEMPOTENCY_CONFLICT",
        field: "idempotencyKeyHash",
      });
      expect(conflictProjector).not.toHaveBeenCalled();
    } finally {
      await Promise.all([walletMutation, factMutation].filter(
        (pending): pending is Promise<{ error?: unknown; rowCount?: number }> => pending !== undefined,
      ));
      await databasePool.query(
        `UPDATE campaign_os.campaign_participants
         SET total_points = $1, updated_at = $2
         WHERE campaign_id = $3 AND id = $4`,
        [120, "2026-07-15T01:00:03.000Z", campaignB.campaignId, campaignB.participantId],
      );
    }
  }, 60_000);

  it("recovers an external same-key winner without querying an aborted transaction", async () => {
    const input = decisionInput({
      campaignId: campaignB.campaignId,
      idempotencyKeyHash: sha256("real-external-race-key"),
      participantId: campaignB.participantId,
    });
    const projection = snapshotProjection({
      manifest: {
        campaignId: campaignB.campaignId,
        participantId: campaignB.participantId,
        version: ADMIN_REVIEW_SNAPSHOT_VERSION,
      },
      walletAddress: campaignB.walletAddress,
    });
    const versionResult = await databasePool.query<{ current_version: string }>(
      `SELECT COALESCE(MAX(version), 0)::text AS current_version
       FROM campaign_os.campaign_review_decisions
       WHERE campaign_id = $1 AND participant_id = $2`,
      [campaignB.campaignId, campaignB.participantId],
    );
    const competingId = "decision-real-external-winner";
    const result = await store.appendDecision(input, async () => {
      await databasePool.query(
        `INSERT INTO campaign_os.campaign_review_decisions (
           id, campaign_id, participant_id, wallet_address, version, decision,
           snapshot_version, snapshot_fingerprint, snapshot_manifest, reason_code,
           note, operator_subject, operator_role, idempotency_key_hash, payload_hash,
           trace_id, decided_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10,
           $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP
         )`,
        [
          competingId,
          input.campaignId,
          input.participantId,
          campaignB.walletAddress,
          Number(versionResult.rows[0]!.current_version) + 1,
          input.decision,
          ADMIN_REVIEW_SNAPSHOT_VERSION,
          input.expectedSnapshotFingerprint,
          JSON.stringify(projection.manifest),
          input.reasonCode,
          input.note ?? null,
          input.operatorSubject,
          input.operatorRole,
          input.idempotencyKeyHash,
          deriveAdminReviewDecisionPayloadHash(input),
          "trace-real-external-winner",
        ],
      );

      return projection;
    }, { traceId: "trace-real-external-race" });

    expect(result).toMatchObject({
      created: false,
      record: { id: competingId, traceId: "trace-real-external-winner" },
    });
    const persisted = await databasePool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM campaign_os.campaign_review_decisions
       WHERE campaign_id = $1 AND participant_id = $2 AND idempotency_key_hash = $3`,
      [input.campaignId, input.participantId, input.idempotencyKeyHash],
    );
    expect(persisted.rows).toEqual([{ count: "1" }]);
  }, 60_000);

  it("persists one real artifact race winner and fails closed on stored corruption", async () => {
    const input = artifactInput();
    const projectedSource = artifactProjection({
      sourceFingerprint: "5".repeat(64),
      sourceManifest: {
        campaignId: campaignA.campaignId,
        transactionMode: "repeatable-read",
        version: ADMIN_ARTIFACT_SOURCE_VERSION,
      },
    });
    const projectedResults = await Promise.all(Array.from({ length: 20 }, (_, index) =>
      store.putArtifactFromSnapshot(
        artifactProjectionInput({ campaignId: campaignA.campaignId }),
        async (source) => {
          expect(source.rows).toMatchObject({
            campaign: { id: campaignA.campaignId },
            participants: [{ id: campaignA.participantId }],
          });
          expect(source.latestDecisions).toEqual([
            expect.objectContaining({
              campaignId: campaignA.campaignId,
              participantId: campaignA.participantId,
            }),
          ]);
          return projectedSource;
        },
        { traceId: `trace-real-artifact-project-${index}` },
      )));
    expect(projectedResults.filter(({ created }) => created)).toHaveLength(1);
    expect(new Set(projectedResults.map(({ artifact }) => artifact.id)).size).toBe(1);

    const countBeforeProjectorFault = await databasePool.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM campaign_os.campaign_export_artifacts",
    );
    await expect(store.putArtifactFromSnapshot(
      artifactProjectionInput({ campaignId: campaignA.campaignId }),
      async () => {
        throw new Error("postgresql://secret /Users/private");
      },
      { traceId: "trace-real-artifact-project-fault" },
    )).rejects.toMatchObject({
      code: "ADMIN_REVIEW_STORE_ARGUMENT_INVALID",
      field: "projectArtifact",
      operation: "putArtifactFromSnapshot",
      traceId: "trace-real-artifact-project-fault",
    });
    const countAfterProjectorFault = await databasePool.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM campaign_os.campaign_export_artifacts",
    );
    expect(countAfterProjectorFault.rows).toEqual(countBeforeProjectorFault.rows);

    const results = await Promise.all(Array.from({ length: 20 }, (_, index) =>
      store.putArtifact(input, { traceId: `trace-real-artifact-${index}` })));
    expect(results.filter(({ created }) => created)).toHaveLength(1);
    expect(new Set(results.map(({ artifact }) => artifact.id)).size).toBe(1);
    const artifactId = results[0]!.artifact.id;
    const count = await databasePool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM campaign_os.campaign_export_artifacts
       WHERE campaign_id = $1 AND source_fingerprint = $2 AND format = $3`,
      [input.campaignId, input.sourceFingerprint, input.format],
    );
    expect(Number(count.rows[0]?.count)).toBe(1);
    await expect(store.getArtifact(
      { artifactId, campaignId: input.campaignId },
      { traceId: "trace-real-artifact-detail" },
    )).resolves.toEqual({
      artifact: expect.objectContaining({ id: artifactId, contentHash: input.contentHash }),
      sourceManifest: input.sourceManifest,
    });
    await expect(store.readArtifactContent(
      { artifactId, campaignId: input.campaignId },
      { traceId: "trace-real-artifact-content" },
    )).resolves.toEqual({
      artifact: expect.objectContaining({ id: artifactId, contentBytes: Buffer.byteLength(input.content, "utf8") }),
      content: input.content,
      sourceManifest: input.sourceManifest,
    });

    const rowCountBeforeConflict = await databasePool.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM campaign_os.campaign_export_artifacts",
    );
    const conflictingContent = `${input.content}conflict\n`;
    await expect(store.putArtifact(
      artifactInput({ content: conflictingContent, contentHash: sha256(conflictingContent) }),
      { traceId: "trace-real-artifact-conflict" },
    )).rejects.toMatchObject({
      code: "ADMIN_REVIEW_STORE_IDEMPOTENCY_CONFLICT",
      field: "sourceFingerprint",
    });
    const rowCountAfterConflict = await databasePool.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM campaign_os.campaign_export_artifacts",
    );
    expect(rowCountAfterConflict.rows).toEqual(rowCountBeforeConflict.rows);

    await expect(databasePool.query(
      "UPDATE campaign_os.campaign_export_artifacts SET file_name = $1 WHERE id = $2",
      ["mutated.csv", artifactId],
    )).rejects.toMatchObject({ code: "55000" });
    await expect(databasePool.query(
      "DELETE FROM campaign_os.campaign_export_artifacts WHERE id = $1",
      [artifactId],
    )).rejects.toMatchObject({ code: "55000" });

    await databasePool.query(
      "ALTER TABLE campaign_os.campaign_export_artifacts DISABLE TRIGGER campaign_export_artifacts_append_only",
    );
    try {
      await databasePool.query(
        "UPDATE campaign_os.campaign_export_artifacts SET content_hash = $1 WHERE id = $2",
        ["9".repeat(64), artifactId],
      );
    } finally {
      await databasePool.query(
        "ALTER TABLE campaign_os.campaign_export_artifacts ENABLE TRIGGER campaign_export_artifacts_append_only",
      );
    }
    await expect(store.readArtifactContent(
      { artifactId, campaignId: input.campaignId },
      { traceId: "trace-real-artifact-corrupt" },
    )).rejects.toMatchObject({
      code: "ADMIN_REVIEW_STORE_CONTENT_INTEGRITY_FAILED",
      field: "contentHash",
      traceId: "trace-real-artifact-corrupt",
    });

    const correctBytes = Buffer.byteLength(input.content, "utf8");
    await databasePool.query(
      "ALTER TABLE campaign_os.campaign_export_artifacts DISABLE TRIGGER campaign_export_artifacts_append_only",
    );
    await databasePool.query(
      `ALTER TABLE campaign_os.campaign_export_artifacts
       DROP CONSTRAINT campaign_os_campaign_export_artifacts_content_bytes_check`,
    );
    try {
      await databasePool.query(
        `UPDATE campaign_os.campaign_export_artifacts
         SET content_hash = $1, content_bytes = $2
         WHERE id = $3`,
        [input.contentHash, correctBytes + 1, artifactId],
      );
      await databasePool.query(
        "ALTER TABLE campaign_os.campaign_export_artifacts ENABLE TRIGGER campaign_export_artifacts_append_only",
      );
      await expect(store.readArtifactContent(
        { artifactId, campaignId: input.campaignId },
        { traceId: "trace-real-artifact-bytes-corrupt" },
      )).rejects.toMatchObject({
        code: "ADMIN_REVIEW_STORE_CONTENT_INTEGRITY_FAILED",
        field: "contentBytes",
        traceId: "trace-real-artifact-bytes-corrupt",
      });
    } finally {
      await databasePool.query(
        "ALTER TABLE campaign_os.campaign_export_artifacts DISABLE TRIGGER campaign_export_artifacts_append_only",
      );
      await databasePool.query(
        `UPDATE campaign_os.campaign_export_artifacts
         SET content_hash = $1, content_bytes = $2
         WHERE id = $3`,
        [input.contentHash, correctBytes, artifactId],
      );
      await databasePool.query(
        "ALTER TABLE campaign_os.campaign_export_artifacts ENABLE TRIGGER campaign_export_artifacts_append_only",
      );
      await databasePool.query(
        `ALTER TABLE campaign_os.campaign_export_artifacts
         ADD CONSTRAINT campaign_os_campaign_export_artifacts_content_bytes_check CHECK (
           content_bytes BETWEEN 0 AND 10485760
           AND content_bytes = octet_length(content)
         )`,
      );
    }
  }, 60_000);

  it("bounds the production ranked window query above the 5000-Participant limit", async () => {
    const scaleParticipantCount = 20_000;
    const scaleCampaign = {
      campaignId: "campaign-admin-scale",
      completionId: "completion-admin-scale-0001",
      evidenceId: "evidence-admin-scale-0001",
      participantId: "participant-admin-scale-0001",
      suffix: "scale",
      taskId: "task-admin-scale",
      walletAddress: "2F4ScaleWallet0001",
    };
    await seedRealCampaign(databasePool, scaleCampaign);
    await databasePool.query(
      `UPDATE campaign_os.campaign_participants
       SET total_points = $1
       WHERE campaign_id = $2 AND id = $3`,
      [scaleParticipantCount + 1, scaleCampaign.campaignId, scaleCampaign.participantId],
    );
    await databasePool.query(
      `INSERT INTO campaign_os.campaign_participants (
         id, campaign_id, wallet_address, account_type, wallet_source,
         wallet_type_verified, wallet_signature_status, wallet_verified_at,
         locale_preference, total_points, rank, risk_flags, created_at, updated_at
       )
       SELECT
         'participant-admin-scale-' || lpad(ordinal::text, 6, '0'),
         $1,
         '2F4ScaleWallet' || lpad(ordinal::text, 6, '0'),
         'EOA',
         'PORTKEY_EOA_EXTENSION',
         true,
         'signed',
         '2026-07-15T01:00:00.000Z'::timestamptz,
         'en-US',
         $2 - ordinal,
         ordinal,
         '[]'::jsonb,
         '2026-07-15T01:00:00.000Z'::timestamptz + ordinal * interval '1 millisecond',
         '2026-07-15T01:00:01.000Z'::timestamptz + ordinal * interval '1 millisecond'
       FROM generate_series(2, $2) AS ordinal`,
      [scaleCampaign.campaignId, scaleParticipantCount],
    );
    await databasePool.query("ANALYZE campaign_os.campaign_participants");

    let rankedQueryCount = 0;
    let rankedQueryText: string | undefined;
    let rankedQueryValues: readonly unknown[] = [];
    let completionQueryCount = 0;
    let evidenceQueryCount = 0;
    const countedPool: PostgresAdminReviewStorePool = {
      connect: async () => {
        const client = await databasePool.connect();

        return {
          query: async (text, values = []) => {
            if (text.includes("ROW_NUMBER() OVER")) {
              rankedQueryCount += 1;
              rankedQueryText = text;
              rankedQueryValues = values;
            }
            if (text.includes("FROM campaign_os.campaign_task_completions")) {
              completionQueryCount += 1;
            }
            if (text.includes("FROM campaign_os.campaign_task_evidence")) {
              evidenceQueryCount += 1;
            }
            const result = await client.query(text, [...values]);

            return { rows: result.rows as Array<Record<string, unknown>> };
          },
          release: () => client.release(),
        };
      },
      end: async () => undefined,
      query: async (text, values = []) => {
        const result = await databasePool.query(text, [...values]);

        return { rows: result.rows as Array<Record<string, unknown>> };
      },
    };
    const countedStore = createPostgresAdminReviewStore({
      boundedListLimit: 100,
      expectedMigration: { checksum: reviewMigration.checksum, id: reviewMigration.id },
      ownsPool: false,
      pool: countedPool,
    });
    const samples: number[] = [];

    for (let sampleIndex = 0; sampleIndex < 3; sampleIndex += 1) {
      rankedQueryCount = 0;
      completionQueryCount = 0;
      evidenceQueryCount = 0;
      const startedAt = performance.now();
      await expect(countedStore.readSnapshot(
        { campaignId: scaleCampaign.campaignId },
        { traceId: `trace-real-ranked-scale-${sampleIndex}` },
      )).rejects.toMatchObject({
        code: "ADMIN_REVIEW_STORE_BOUND_EXCEEDED",
        field: "participants",
        operation: "readSnapshot",
        traceId: `trace-real-ranked-scale-${sampleIndex}`,
      });
      samples.push(performance.now() - startedAt);

      expect(rankedQueryCount).toBe(1);
      expect(completionQueryCount).toBe(0);
      expect(evidenceQueryCount).toBe(0);
    }

    samples.sort((left, right) => left - right);
    expect(samples[Math.ceil(samples.length * 0.95) - 1]).toBeLessThan(2_000);

    const explainClient = await databasePool.connect();
    try {
      expect(rankedQueryText).toBeDefined();
      const explain = await explainClient.query(
        `EXPLAIN (ANALYZE, FORMAT JSON) ${rankedQueryText!}`,
        [...rankedQueryValues],
      );
      const explainJson = JSON.stringify(explain.rows);
      expect(explainJson).toContain(
        "campaign_os_campaign_participants_dynamic_rank_idx",
      );
      const rootPlan = explain.rows[0]?.["QUERY PLAN"]?.[0]?.Plan as {
        "Actual Rows"?: number;
        "Node Type"?: string;
        Plans?: unknown[];
      } | undefined;
      const planStack: unknown[] = rootPlan ? [rootPlan] : [];
      let windowActualRows: number | undefined;

      while (planStack.length > 0) {
        const node = planStack.pop() as {
          "Actual Rows"?: number;
          "Node Type"?: string;
          Plans?: unknown[];
        };
        if (node["Node Type"] === "WindowAgg") {
          windowActualRows = node["Actual Rows"];
          break;
        }
        planStack.push(...(node.Plans ?? []));
      }

      expect(windowActualRows).toBeGreaterThan(0);
      expect(windowActualRows).toBeLessThanOrEqual(ADMIN_REVIEW_MAX_ARTIFACT_ROWS + 1);
    } finally {
      explainClient.release();
      await countedStore.close({ traceId: "trace-real-ranked-scale-close" });
    }
  }, 60_000);

  it("keeps 5000-row serialize, SHA-256, and PostgreSQL transaction p95 within two seconds", async () => {
    for (const [formatIndex, format] of (["csv", "json"] as const).entries()) {
      const samples: number[] = [];

      for (let sampleIndex = 0; sampleIndex < 3; sampleIndex += 1) {
        const revision = String(10 + formatIndex * 3 + sampleIndex);
        const source = maximumArtifactWinnerSource(revision);
        const traceId = `trace-real-5000-${format}-${sampleIndex}`;
        const startedAt = performance.now();
        const projection = serializeAdminExportArtifact(source, format, { traceId });
        const result = await store.putArtifact({
          campaignId: source.manifest.campaign.id,
          content: projection.content,
          contentHash: projection.contentHash,
          creatorRole: "review_operator",
          creatorSubject: "2F4ReviewOperator",
          fileName: projection.fileName,
          format,
          mimeType: projection.mimeType,
          rowCount: projection.rowCount,
          sourceFingerprint: projection.sourceFingerprint,
          sourceManifest: projection.sourceManifest,
          sourceVersion: projection.sourceVersion,
        }, { traceId });
        samples.push(performance.now() - startedAt);

        expect(result).toMatchObject({
          artifact: {
            contentHash: projection.contentHash,
            format,
            rowCount: ADMIN_REVIEW_MAX_ARTIFACT_ROWS,
            sourceFingerprint: projection.sourceFingerprint,
          },
          created: true,
        });
      }

      samples.sort((left, right) => left - right);
      const p95 = samples[Math.ceil(samples.length * 0.95) - 1]!;
      expect(p95).toBeLessThan(2_000);
    }
  }, 30_000);

  it("rolls back commit faults and reports rollback/release cleanup faults without leaks", async () => {
    type Fault = "commit" | "release" | "rollback";
    const createFaultStore = (fault: Fault) => {
      let releaseCount = 0;
      const faultPool: PostgresAdminReviewStorePool = {
        connect: async () => {
          const client = await databasePool.connect();

          return {
            query: async (text, values = []) => {
              const normalized = normalizeSql(text);
              if (fault === "commit" && normalized === "COMMIT") {
                throw new Error("injected commit failure");
              }
              if (fault === "rollback" && normalized === "ROLLBACK") {
                await client.query(text, [...values]);
                throw new Error("injected rollback acknowledgement failure");
              }
              const result = await client.query(text, [...values]);

              return { rows: result.rows as Array<Record<string, unknown>> };
            },
            release: () => {
              client.release();
              releaseCount += 1;
              if (fault === "release") {
                throw new Error("injected release acknowledgement failure");
              }
            },
          };
        },
        end: async () => undefined,
        query: async (text, values = []) => {
          const result = await databasePool.query(text, [...values]);

          return { rows: result.rows as Array<Record<string, unknown>> };
        },
      };

      return {
        get releaseCount() {
          return releaseCount;
        },
        store: createPostgresAdminReviewStore({
          boundedListLimit: 100,
          expectedMigration: { checksum: reviewMigration.checksum, id: reviewMigration.id },
          ownsPool: false,
          pool: faultPool,
        }),
      };
    };
    const countDecision = async (idempotencyKeyHash: string) => {
      const result = await databasePool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM campaign_os.campaign_review_decisions
         WHERE campaign_id = $1 AND participant_id = $2 AND idempotency_key_hash = $3`,
        [campaignA.campaignId, campaignA.participantId, idempotencyKeyHash],
      );

      return Number(result.rows[0]!.count);
    };

    const commitInput = decisionInput({
      idempotencyKeyHash: sha256("real-commit-fault-key"),
    });
    const commitFault = createFaultStore("commit");
    await expect(commitFault.store.appendDecision(
      commitInput,
      async () => snapshotProjection(),
      { traceId: "trace-real-commit-fault" },
    )).rejects.toMatchObject({
      code: "ADMIN_REVIEW_STORE_QUERY_FAILED",
      field: "database",
    });
    expect(await countDecision(commitInput.idempotencyKeyHash)).toBe(0);
    expect(commitFault.releaseCount).toBe(1);

    const rollbackInput = decisionInput({
      idempotencyKeyHash: sha256("real-rollback-fault-key"),
    });
    const rollbackFault = createFaultStore("rollback");
    await expect(rollbackFault.store.appendDecision(
      rollbackInput,
      async () => {
        throw new Error("injected projector failure");
      },
      { traceId: "trace-real-rollback-fault" },
    )).rejects.toMatchObject({
      code: "ADMIN_REVIEW_STORE_CLEANUP_FAILED",
      field: "transaction",
    });
    expect(await countDecision(rollbackInput.idempotencyKeyHash)).toBe(0);
    expect(rollbackFault.releaseCount).toBe(1);

    const releaseFault = createFaultStore("release");
    await expect(releaseFault.store.readSnapshot(
      { campaignId: campaignA.campaignId, participantId: campaignA.participantId },
      { traceId: "trace-real-release-fault" },
    )).rejects.toMatchObject({
      code: "ADMIN_REVIEW_STORE_CLEANUP_FAILED",
      field: "client",
    });
    expect(releaseFault.releaseCount).toBe(1);
    expect(databasePool.totalCount).toBe(databasePool.idleCount);
  }, 60_000);

  it("closes real owned and borrowed pools with one owner in under ten seconds", async () => {
    const borrowedPool = createRealPool(databaseUrl, 2);
    const borrowedStore = createPostgresAdminReviewStore({
      boundedListLimit: 100,
      expectedMigration: { checksum: reviewMigration.checksum, id: reviewMigration.id },
      ownsPool: false,
      pool: borrowedPool,
    });
    await borrowedStore.close({ traceId: "trace-real-borrowed-close" });
    await expect(borrowedPool.query("SELECT 1 AS ready")).resolves.toMatchObject({
      rows: [{ ready: 1 }],
    });
    await borrowedPool.end();

    const ownedPool = createRealPool(databaseUrl, 2);
    const ownedStore = createPostgresAdminReviewStore({
      boundedListLimit: 100,
      expectedMigration: { checksum: reviewMigration.checksum, id: reviewMigration.id },
      ownsPool: true,
      pool: ownedPool,
    });
    const startedAt = performance.now();
    const firstClose = ownedStore.close({ traceId: "trace-real-owned-close" });
    const secondClose = ownedStore.close({ traceId: "trace-real-owned-close-repeat" });
    expect(secondClose).toBe(firstClose);
    await firstClose;
    expect(performance.now() - startedAt).toBeLessThanOrEqual(10_000);
    await expect(ownedPool.query("SELECT 1")).rejects.toBeDefined();
  }, 30_000);
});
