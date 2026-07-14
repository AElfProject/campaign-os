import { createHash, randomUUID } from "node:crypto";
import pg, { type Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  ADMIN_ARTIFACT_SOURCE_VERSION,
  ADMIN_REVIEW_MIGRATION_ID,
  ADMIN_REVIEW_SNAPSHOT_VERSION,
  AdminReviewStoreError,
  type AdminExportArtifactInput,
  type AdminReviewDecisionInput,
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
const expectedMigration = {
  checksum: "a".repeat(64),
  id: ADMIN_REVIEW_MIGRATION_ID,
} as const;

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

const rankingRow = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  campaign_id: "campaign-admin-0001",
  created_at: timestamp("2026-07-15T00:00:03.000Z"),
  participant_id: "participant-admin-0001",
  rank: 1,
  total_points: 120,
  wallet_address: "2F4ParticipantWallet",
  ...overrides,
});

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
  operator_role: "review_operator",
  operator_subject: "2F4ReviewOperator",
  participant_id: "participant-admin-0001",
  payload_hash: "3".repeat(64),
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
    && call.text.includes("id = $2")
  ) {
    return { rows: [participantRow()] };
  }
  if (call.text.includes("FROM campaign_os.campaign_task_completions")) {
    return { rows: [completionRow()] };
  }
  if (call.text.includes("FROM campaign_os.campaign_task_evidence")) {
    return { rows: [evidenceRow()] };
  }
  if (call.text.includes("AS participant_id")) {
    return { rows: [rankingRow()] };
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

    if (call.text === "BEGIN") {
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
  campaignId: "campaign-admin-0001",
  decision: "approved",
  expectedSnapshotFingerprint: "1".repeat(64),
  idempotencyKeyHash: "2".repeat(64),
  note: "Evidence reviewed.",
  operatorRole: "review_operator",
  operatorSubject: "2F4ReviewOperator",
  participantId: "participant-admin-0001",
  payloadHash: "3".repeat(64),
  reasonCode: "evidence_verified",
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

    if (call.text === "BEGIN") {
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
        return { rows: [participantRow()] };
      }
      if (call.text.includes("FROM campaign_os.campaign_task_completions")) {
        return { rows: [completionRow()] };
      }
      if (call.text.includes("FROM campaign_os.campaign_task_evidence")) {
        return { rows: [evidenceRow()] };
      }
      if (call.text.includes("AS participant_id")) {
        return { rows: [rankingRow()] };
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
      expect.stringContaining("AS participant_id"),
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
    expect(pool.calls.every(({ text }) => !/\b(?:INSERT|UPDATE|DELETE|TRUNCATE)\b/i.test(text))).toBe(true);
    expect(pool.release).toHaveBeenCalledOnce();
  });

  it.each([
    ["cross-Campaign Task", "campaign_id", (call: QueryCall) =>
      call.text.includes("FROM campaign_os.campaign_tasks")
        ? { rows: [taskRow({ campaign_id: "campaign-admin-other" })] }
        : undefined],
    ["malformed Participant count", "total_points", (call: QueryCall) =>
      call.text.includes("FROM campaign_os.campaign_participants") && call.text.includes("id = $2")
        ? { rows: [participantRow({ total_points: "120" })] }
        : undefined],
    ["malformed Participant JSONB", "risk_flags", (call: QueryCall) =>
      call.text.includes("FROM campaign_os.campaign_participants") && call.text.includes("id = $2")
        ? { rows: [participantRow({ risk_flags: ["safe", 7] })] }
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
      if (call.text.includes("FROM campaign_os.campaign_participants") && call.text.includes("id = $2")) {
        return { rows: [participantRow()] };
      }
      if (call.text.includes("FROM campaign_os.campaign_task_completions")) {
        return { rows: [completionRow()] };
      }
      if (call.text.includes("FROM campaign_os.campaign_task_evidence")) {
        return { rows: [evidenceRow()] };
      }
      if (call.text.includes("AS participant_id")) {
        return { rows: [rankingRow()] };
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
        payloadHash: "3".repeat(64),
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
    expect(pool.calls.map(({ text }) => text)).toEqual([
      "BEGIN",
      expect.stringContaining("FROM campaign_os.schema_migrations"),
      expect.stringContaining(
        "pg_advisory_xact_lock( hashtextextended(jsonb_build_array($1::text, $2::text)::text, 0) )",
      ),
      expect.stringContaining("FROM campaign_os.campaigns"),
      expect.stringContaining("FROM campaign_os.campaign_tasks"),
      expect.stringContaining("FROM campaign_os.campaign_participants"),
      expect.stringContaining("FROM campaign_os.campaign_task_completions"),
      expect.stringContaining("FROM campaign_os.campaign_task_evidence"),
      expect.stringContaining("AS participant_id"),
      expect.stringContaining("idempotency_key_hash = $3"),
      expect.stringContaining("COALESCE(MAX(version), 0)"),
      expect.stringContaining("INSERT INTO campaign_os.campaign_review_decisions"),
      "COMMIT",
    ]);
    expect(pool.calls[2]?.values).toEqual([
      "campaign-admin-0001",
      "participant-admin-0001",
    ]);
    expect(pool.calls[9]?.values).toEqual([
      "campaign-admin-0001",
      "participant-admin-0001",
      "2".repeat(64),
    ]);
    expect(pool.calls[11]?.values).not.toContain("raw-idempotency-key");
    expect(pool.calls.every(({ text }) => !/\b(?:UPDATE|DELETE|TRUNCATE)\b/i.test(text))).toBe(true);
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
      traceId: "trace-decision-replay",
    });
    expect(replay.result).toEqual({
      ok: true,
      value: expect.objectContaining({
        created: false,
        record: expect.objectContaining({ id: "decision-admin-0001", version: 1 }),
      }),
    });
    expect(replay.pool.calls.some(({ text }) => text.startsWith("INSERT"))).toBe(false);
    expect(replay.pool.calls[replay.pool.calls.length - 1]?.text).toBe("COMMIT");

    const conflict = await run({
      existing: decisionRow({ payload_hash: "9".repeat(64) }),
      participant: participantRow(),
      traceId: "trace-decision-conflict",
    });
    expect(conflict.result).toEqual({
      error: expect.objectContaining({ code: "ADMIN_REVIEW_STORE_IDEMPOTENCY_CONFLICT" }),
      ok: false,
    });
    expect(conflict.pool.calls.some(({ text }) => text.startsWith("INSERT"))).toBe(false);
    expect(conflict.pool.calls[conflict.pool.calls.length - 1]?.text).toBe("ROLLBACK");

    const stale = await run({
      participant: participantRow(),
      projection: snapshotProjection({ fingerprint: "8".repeat(64) }),
      traceId: "trace-decision-stale",
    });
    expect(stale.result).toEqual({
      error: expect.objectContaining({ code: "ADMIN_REVIEW_STORE_STALE" }),
      ok: false,
    });
    expect(stale.pool.calls.some(({ text }) => text.includes("idempotency_key_hash = $3"))).toBe(false);
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
        decisionInput({ payloadHash: sha256(`conflicting-payload-${index}`) }),
        project,
        { traceId: `trace-decision-conflict-${index}` },
      )));
    expect(conflicting.every((result) =>
      result.status === "rejected"
      && result.reason instanceof AdminReviewStoreError
      && result.reason.code === "ADMIN_REVIEW_STORE_IDEMPOTENCY_CONFLICT")).toBe(true);
    expect(pool.committed).toHaveLength(1);
    expect(pool.insertCount).toBe(1);

    const differentKeys = await Promise.all(Array.from({ length: 20 }, (_, index) =>
      store.appendDecision(
        decisionInput({
          idempotencyKeyHash: sha256(`decision-key-${index}`),
          payloadHash: sha256(`decision-payload-${index}`),
        }),
        project,
        { traceId: `trace-decision-version-${index}` },
      )));
    expect(pool.committed).toHaveLength(21);
    expect(pool.insertCount).toBe(21);
    expect(differentKeys.map(({ record }) => record.version).sort((left, right) => left - right)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 2),
    );
    expect(pool.maxActiveLockHolders).toBe(1);
    expect(pool.release).toHaveBeenCalledTimes(60);
  });
});

describe("PostgreSQL Admin export artifacts", () => {
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
         AND tablename IN ($2, $3)
       ORDER BY indexname`,
      ["campaign_os", "campaign_review_decisions", "campaign_export_artifacts"],
    );
    expect(indexes.rows.map(({ indexname }) => indexname)).toEqual(expect.arrayContaining([
      "campaign_os_campaign_export_artifacts_list_idx",
      "campaign_os_campaign_review_decisions_current_idx",
      "campaign_os_campaign_review_decisions_filter_idx",
    ]));
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

    await expect(databasePool.query(
      `INSERT INTO campaign_os.campaign_review_decisions (
         id, campaign_id, participant_id, wallet_address, version, decision,
         snapshot_version, snapshot_fingerprint, snapshot_manifest, reason_code,
         operator_subject, operator_role, idempotency_key_hash, payload_hash,
         trace_id, decided_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10,
         $11, $12, $13, $14, $15, CURRENT_TIMESTAMP
       )`,
      [
        "decision-invalid-fk",
        campaignA.campaignId,
        "participant-missing",
        campaignA.walletAddress,
        1,
        "approved",
        ADMIN_REVIEW_SNAPSHOT_VERSION,
        "1".repeat(64),
        JSON.stringify({ version: ADMIN_REVIEW_SNAPSHOT_VERSION }),
        "evidence_verified",
        "2F4ReviewOperator",
        "review_operator",
        "2".repeat(64),
        "3".repeat(64),
        "trace-real-invalid-fk",
      ],
    )).rejects.toMatchObject({ code: "23503" });
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

  it("requires the exact 0002 readiness checksum on a real database", async () => {
    const readinessDatabase = `campaign_os_m242_ready_${process.pid}_${randomUUID().replace(/-/g, "").slice(0, 8)}`;
    await createDatabase(readinessDatabase);
    const readinessUrl = isolatedDatabaseUrl(TEST_DATABASE_URL!, readinessDatabase);
    let readinessPool: pg.Pool | undefined;

    try {
      await applyMigrations(readinessUrl, [definitions[0]!], "trace-real-only-0001");
      readinessPool = createRealPool(readinessUrl, 4);
      const readinessStore = createPostgresAdminReviewStore({
        boundedListLimit: 100,
        expectedMigration: { checksum: reviewMigration.checksum, id: reviewMigration.id },
        ownsPool: false,
        pool: readinessPool,
      });
      await expect(readinessStore.listArtifacts(
        { campaignId: campaignA.campaignId },
        { traceId: "trace-real-missing-0002" },
      )).rejects.toMatchObject({
        code: "ADMIN_REVIEW_STORE_SCHEMA_NOT_READY",
        field: "migrationId",
      });
      await readinessPool.end();
      readinessPool = undefined;

      await applyMigrations(readinessUrl, definitions, "trace-real-apply-0002");
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

    const conflicts = await Promise.allSettled(Array.from({ length: 20 }, (_, index) =>
      store.appendDecision(
        decisionInput({ payloadHash: sha256(`real-conflict-${index}`) }),
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
          payloadHash: sha256(`real-payload-${index}`),
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
        payloadHash: sha256("real-projector-fault-payload"),
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

  it("persists one real artifact race winner and fails closed on stored corruption", async () => {
    const input = artifactInput();
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
