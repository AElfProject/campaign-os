// @vitest-environment node

import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { projectAdminReviewSnapshot } from "./adminReview";
import type { AdminReviewSnapshotRows } from "./adminReviewStore";
import { CampaignAnalyticsStoreError } from "./campaignAnalyticsStore";
import { resolveCampaignOsCampaignDbConfig } from "./config";
import { postgresMigrationFileManifest } from "./migrationManifest";
import {
  CAMPAIGN_ANALYTICS_FACTS_SQL,
  CAMPAIGN_ANALYTICS_QUERY_BUDGET,
  CAMPAIGN_ANALYTICS_REVIEW_SQL,
  CAMPAIGN_ANALYTICS_TASKS_SQL,
  createPostgresCampaignAnalyticsStore as createPostgresCampaignAnalyticsStoreImplementation,
  type CreatePostgresCampaignAnalyticsStoreOptions,
  type PostgresCampaignAnalyticsClient,
  type PostgresCampaignAnalyticsPool,
  type PostgresCampaignAnalyticsQueryResult,
} from "./postgresCampaignAnalyticsStore";
import {
  loadPostgresMigrations,
  runPostgresMigrations,
  type PostgresMigrationPool,
} from "./postgresMigration";

interface ScriptStep {
  readonly error?: unknown;
  readonly match: RegExp;
  readonly rows?: Array<Record<string, unknown>>;
}

interface TranscriptEntry {
  readonly text: string;
  readonly values: readonly unknown[];
}

const TEST_DATABASE_URL = process.env.CAMPAIGN_OS_TEST_DATABASE_URL?.trim();
const REQUIRE_POSTGRES_TESTS = process.env.CAMPAIGN_OS_REQUIRE_POSTGRES_TESTS?.trim() === "1"
  || process.env.npm_lifecycle_event === "test:postgres:required";

if (REQUIRE_POSTGRES_TESTS && !TEST_DATABASE_URL) {
  throw new Error(
    "Campaign analytics PostgreSQL acceptance requires CAMPAIGN_OS_TEST_DATABASE_URL.",
  );
}

const postgresAcceptance = TEST_DATABASE_URL ? describe : describe.skip;

const migrationLedgerRows = postgresMigrationFileManifest.map(({ checksum, id }) => ({
  checksum,
  migration_id: id,
}));

const expectedMigrations = migrationLedgerRows.map(({ checksum, migration_id: id }) => ({
  checksum,
  id,
}));

const createPostgresCampaignAnalyticsStore = (
  options: Omit<CreatePostgresCampaignAnalyticsStoreOptions, "expectedMigrations">,
) => createPostgresCampaignAnalyticsStoreImplementation({
  expectedMigrations,
  ...options,
});

const deferred = <T = void>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
};

const factsRow = (overrides: Record<string, unknown> = {}) => ({
  account_types: [
    { count: "1", id: "AA" },
    { count: "1", id: "EOA" },
  ],
  as_of: "2026-07-19T00:00:00.000Z",
  campaign_id: "campaign-analytics-1",
  completion_awarded: "100",
  locales: [
    { count: "1", id: "en-US" },
    { count: "1", id: "zh-CN" },
  ],
  participant_awarded: "100",
  participant_count: "2",
  participants_with_points: "1",
  participants_without_points: "1",
  referrals_qualified: "1",
  referrals_total: "1",
  risk_flagged: "1",
  source_corruption_count: "0",
  supported_locales: ["en-US", "zh-CN"],
  ...overrides,
});

const tasksRow = (overrides: Record<string, unknown> = {}) => ({
  completed_count: "2",
  failed_count: "1",
  manual_review_count: "0",
  pending_count: "0",
  task_count: "2",
  tasks: [
    {
      activity_participants: "2",
      required: true,
      task_id: "task-1",
      template_code: "social-follow",
      verified_participants: "1",
    },
    {
      activity_participants: "1",
      required: false,
      task_id: "task-2",
      template_code: "wallet-connect",
      verified_participants: "1",
    },
  ],
  verified_count: "2",
  ...overrides,
});

const reviewRow = (overrides: Record<string, unknown> = {}) => ({
  approved_count: "1",
  invalid_count: "0",
  needs_review_count: "0",
  rejected_count: "0",
  source_corruption_count: "0",
  stale_count: "0",
  total_participants: "2",
  unreviewed_count: "1",
  ...overrides,
});

const successfulScript = (
  facts: Record<string, unknown> = factsRow(),
  tasks: Record<string, unknown> = tasksRow(),
  review: Record<string, unknown> = reviewRow(),
): ScriptStep[] => [
  { match: /^BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY$/, rows: [] },
  { match: /campaign-analytics:facts/, rows: [facts] },
  { match: /campaign-analytics:tasks/, rows: [tasks] },
  { match: /campaign-analytics:review/, rows: [review] },
  { match: /^COMMIT$/, rows: [] },
];

const createPool = (
  scripts: ScriptStep[][],
  ledgerRows: Array<Record<string, unknown>> = migrationLedgerRows,
) => {
  const transcripts: TranscriptEntry[][] = [];
  const releases: ReturnType<typeof vi.fn>[] = [];
  const end = vi.fn(async () => undefined);

  const pool: PostgresCampaignAnalyticsPool = {
    connect: vi.fn(async () => {
      const script = scripts.shift();
      if (!script) {
        throw new Error("Unexpected connection");
      }
      const transcript: TranscriptEntry[] = [];
      const release = vi.fn();
      transcripts.push(transcript);
      releases.push(release);

      const client: PostgresCampaignAnalyticsClient = {
        query: async (text, values = []) => {
          transcript.push({ text, values });
          if (/\bcampaign_os\.schema_migrations\b/i.test(text)) {
            return { rows: ledgerRows };
          }
          const step = script.shift();
          if (!step || !step.match.test(text)) {
            throw new Error("Unexpected statement");
          }
          if (step.error) {
            throw step.error;
          }
          return { rows: step.rows ?? [] };
        },
        release,
      };

      return client;
    }),
    end,
  };

  return { end, pool, releases, transcripts };
};

const read = (pool: PostgresCampaignAnalyticsPool, ownsPool = false) => {
  const store = createPostgresCampaignAnalyticsStore({ ownsPool, pool });
  return {
    store,
    snapshot: store.readSnapshot(
      { campaignId: "campaign-analytics-1" },
      { traceId: "trace-campaign-analytics-1" },
    ),
  };
};

describe("PostgreSQL Campaign analytics store", () => {
  it("projects one immutable snapshot within the fixed six-statement query budget", async () => {
    const fake = createPool([successfulScript()]);
    const { snapshot } = read(fake.pool);

    await expect(snapshot).resolves.toMatchObject({
      asOf: "2026-07-19T00:00:00.000Z",
      campaignId: "campaign-analytics-1",
      completionBreakdown: {
        completed: 2,
        failed: 1,
        manualReview: 0,
        pending: 0,
        verified: 2,
      },
      reviewBreakdown: {
        approved: 1,
        totalParticipants: 2,
        unreviewed: 1,
      },
      status: "partial",
      traceId: "trace-campaign-analytics-1",
      version: "campaign-analytics-v1",
    });
    expect(CAMPAIGN_ANALYTICS_QUERY_BUDGET).toBe(6);
    expect(CAMPAIGN_ANALYTICS_QUERY_BUDGET).toBeLessThanOrEqual(8);
    expect(fake.transcripts[0]).toHaveLength(CAMPAIGN_ANALYTICS_QUERY_BUDGET);
    expect(fake.transcripts[0]?.[0]?.text).toMatch(/\bcampaign_os\.schema_migrations\b/i);
    expect(fake.transcripts[0]?.[1]?.text).toBe("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    expect(fake.transcripts[0]?.[fake.transcripts[0].length - 1]?.text).toBe("COMMIT");
    expect(fake.transcripts[0]
      ?.filter(({ text }) => /campaign-analytics:(?:facts|tasks|review)/.test(text))
      .map(({ values }) => values)).toEqual([
      ["campaign-analytics-1"],
      ["campaign-analytics-1"],
      ["campaign-analytics-1"],
    ]);
    expect(fake.releases[0]).toHaveBeenCalledTimes(1);
  });

  it.each([0, 1, 10_000])("keeps query count constant for %i participants", async (count) => {
    const fake = createPool([successfulScript(
      factsRow({
        account_types: count === 0 ? [] : [{ count: String(count), id: "AA" }],
        completion_awarded: count === 0 ? "0" : String(count),
        locales: count === 0 ? [] : [{ count: String(count), id: "en-US" }],
        participant_awarded: count === 0 ? "0" : String(count),
        participant_count: String(count),
        participants_with_points: count === 0 ? "0" : String(count),
        participants_without_points: "0",
        referrals_qualified: "0",
        referrals_total: "0",
        risk_flagged: "0",
        supported_locales: ["en-US"],
      }),
      tasksRow({
        completed_count: "0",
        failed_count: "0",
        manual_review_count: "0",
        pending_count: "0",
        task_count: "0",
        tasks: [],
        verified_count: "0",
      }),
      reviewRow({
        approved_count: "0",
        total_participants: String(count),
        unreviewed_count: String(count),
      }),
    )]);

    await read(fake.pool).snapshot;
    expect(fake.transcripts[0]).toHaveLength(CAMPAIGN_ANALYTICS_QUERY_BUDGET);
  });

  it("checks the exact 0001-0005 migration ledger before reading Campaign facts", async () => {
    expect(postgresMigrationFileManifest.map(({ id }) => id)).toEqual([
      "0001_campaign_runtime",
      "0002_admin_review_export",
      "0003_admin_review_rank_projection",
      "0004_live_provider_task_verification",
      "0005_participant_wallet_authentication",
    ]);
    expect(postgresMigrationFileManifest.every(({ checksum }) =>
      /^[a-f0-9]{64}$/.test(checksum))).toBe(true);
    const fake = createPool([successfulScript()]);

    await expect(read(fake.pool).snapshot).resolves.toMatchObject({
      campaignId: "campaign-analytics-1",
    });

    const readinessIndex = fake.transcripts[0]?.findIndex(({ text }) =>
      /\bcampaign_os\.schema_migrations\b/i.test(text)) ?? -1;
    const readiness = fake.transcripts[0]?.[readinessIndex];
    const factsIndex = fake.transcripts[0]?.findIndex(({ text }) =>
      /campaign-analytics:facts/.test(text)) ?? -1;
    expect(readinessIndex).toBe(0);
    expect(factsIndex).toBeGreaterThan(readinessIndex);
    expect(readiness?.text).toMatch(/SELECT\s+migration_id\s*,\s*checksum/i);
    expect(readiness?.text).toMatch(/ORDER BY\s+migration_id/i);
    expect(readiness?.text).not.toMatch(/\bWHERE\b|\bANY\s*\(/i);
    expect(readiness?.values).toEqual([]);
  });

  it.each([
    ["missing entry", migrationLedgerRows.slice(0, -1)],
    ["checksum drift", migrationLedgerRows.map((row, index) => index === 2
      ? { ...row, checksum: "0".repeat(64) }
      : row)],
    ["unexpected entry", [
      ...migrationLedgerRows,
      { checksum: "f".repeat(64), migration_id: "0006_unapproved_analytics_schema" },
    ]],
  ])("fails closed when the 0001-0005 migration ledger has %s", async (_label, ledgerRows) => {
    const fake = createPool([successfulScript()], ledgerRows);

    await expect(read(fake.pool).snapshot).rejects.toMatchObject({
      code: "CAMPAIGN_ANALYTICS_SCHEMA_NOT_READY",
      operation: "read_snapshot",
      retryable: false,
    });
    expect(fake.transcripts[0]).toHaveLength(1);
    expect(fake.transcripts[0]?.[0]?.text).toMatch(/\bcampaign_os\.schema_migrations\b/i);
  });

  it("returns the complete bounded 50-Task aggregate to the WP01 projector", async () => {
    const tasks = Array.from({ length: 50 }, (_, index) => ({
      activity_participants: "0",
      required: index === 0,
      task_id: `task-${String(index + 1).padStart(2, "0")}`,
      template_code: `template-${String(index + 1).padStart(2, "0")}`,
      verified_participants: "0",
    }));
    const fake = createPool([successfulScript(
      factsRow({
        account_types: [{ count: "100", id: "AA" }],
        completion_awarded: "0",
        locales: [{ count: "100", id: "en-US" }],
        participant_awarded: "0",
        participant_count: "100",
        participants_with_points: "0",
        participants_without_points: "100",
        referrals_qualified: "0",
        referrals_total: "0",
        risk_flagged: "0",
        supported_locales: ["en-US"],
      }),
      tasksRow({
        completed_count: "0",
        failed_count: "0",
        manual_review_count: "0",
        pending_count: "0",
        task_count: "50",
        tasks,
        verified_count: "0",
      }),
      reviewRow({
        approved_count: "0",
        total_participants: "100",
        unreviewed_count: "100",
      }),
    )]);

    const snapshot = await read(fake.pool).snapshot;
    expect(snapshot.taskBreakdown).toMatchObject({
      rowLimit: 50,
      totalRows: 50,
      truncated: false,
    });
    expect(snapshot.taskBreakdown.rows).toHaveLength(50);
    expect(fake.transcripts[0]).toHaveLength(CAMPAIGN_ANALYTICS_QUERY_BUDGET);
  });

  it("rejects malformed, oversized, inherited, and unknown read inputs synchronously", () => {
    const fake = createPool([]);
    const store = createPostgresCampaignAnalyticsStore({ ownsPool: false, pool: fake.pool });
    const cases: Array<[{ campaignId: string }, { traceId: string }]> = [
      [{ campaignId: "" }, { traceId: "trace-valid" }],
      [{ campaignId: "bad id" }, { traceId: "trace-valid" }],
      [{ campaignId: `c${"x".repeat(128)}` }, { traceId: "trace-valid" }],
      [{ campaignId: "campaign-1" }, { traceId: "bad trace" }],
    ];

    for (const [input, context] of cases) {
      expect(() => store.readSnapshot(input, context)).toThrowError(CampaignAnalyticsStoreError);
    }
    expect(() => store.readSnapshot(
      { campaignId: "campaign-1", role: "admin" } as never,
      { traceId: "trace-valid" },
    )).toThrowError(CampaignAnalyticsStoreError);
    const inherited = Object.assign(Object.create({ role: "owner" }), {
      campaignId: "campaign-1",
    });
    expect(() => store.readSnapshot(inherited, { traceId: "trace-valid" }))
      .toThrowError(CampaignAnalyticsStoreError);
  });

  it("rejects an incomplete AbortSignal shape before acquiring a database client", () => {
    const fake = createPool([]);
    const store = createPostgresCampaignAnalyticsStore({ ownsPool: false, pool: fake.pool });
    const signal = {
      aborted: false,
      addEventListener: vi.fn(),
    } as unknown as AbortSignal;

    expect(() => store.readSnapshot(
      { campaignId: "campaign-analytics-1" },
      { signal, traceId: "trace-invalid-signal" },
    )).toThrowError(expect.objectContaining({
      code: "CAMPAIGN_ANALYTICS_ARGUMENT_INVALID",
      operation: "read_snapshot",
    }));
    expect(fake.pool.connect).not.toHaveBeenCalled();
  });

  it("releases lifecycle accounting when caller AbortSignal listener cleanup fails", async () => {
    const fake = createPool([successfulScript()]);
    const store = createPostgresCampaignAnalyticsStore({ ownsPool: false, pool: fake.pool });
    const signal = {
      aborted: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(() => {
        throw new Error("raw-listener-cleanup-detail");
      }),
    } as unknown as AbortSignal;

    await expect(store.readSnapshot(
      { campaignId: "campaign-analytics-1" },
      { signal, traceId: "trace-listener-cleanup" },
    )).rejects.toMatchObject({
      code: "CAMPAIGN_ANALYTICS_CLEANUP_FAILED",
      operation: "read_snapshot",
      traceId: "trace-listener-cleanup",
    });
    await expect(store.close({ traceId: "trace-listener-cleanup-close" })).resolves.toBeUndefined();
  });

  it("rolls back not-found reads without returning a partial snapshot", async () => {
    const fake = createPool([[
      { match: /^BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY$/, rows: [] },
      { match: /campaign-analytics:facts/, rows: [] },
      { match: /^ROLLBACK$/, rows: [] },
    ]]);

    await expect(read(fake.pool).snapshot).rejects.toMatchObject({
      code: "CAMPAIGN_ANALYTICS_NOT_FOUND",
      operation: "read_snapshot",
      retryable: false,
      traceId: "trace-campaign-analytics-1",
    });
    expect(fake.transcripts[0]?.[0]?.text).toMatch(/\bcampaign_os\.schema_migrations\b/i);
    expect(fake.transcripts[0]?.[1]?.text).toBe("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    expect(fake.transcripts[0]?.[fake.transcripts[0].length - 1]?.text).toBe("ROLLBACK");
  });

  it.each([
    ["42P01", "CAMPAIGN_ANALYTICS_SCHEMA_NOT_READY", false],
    ["57014", "CAMPAIGN_ANALYTICS_TIMEOUT", true],
    ["08006", "CAMPAIGN_ANALYTICS_UNAVAILABLE", true],
  ] as const)("maps driver code %s to a safe typed failure", async (driverCode, code, retryable) => {
    const fake = createPool([[
      { match: /^BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY$/, rows: [] },
      {
        error: Object.assign(
          new Error("raw-driver-detail-must-not-escape"),
          { code: driverCode },
        ),
        match: /campaign-analytics:facts/,
      },
      { match: /^ROLLBACK$/, rows: [] },
    ]]);

    const failure = await read(fake.pool).snapshot.catch((error: unknown) => error);
    expect(failure).toMatchObject({ code, retryable, traceId: "trace-campaign-analytics-1" });
    expect(failure).toBeInstanceOf(CampaignAnalyticsStoreError);
    expect((failure as Error).message).not.toContain("raw-driver-detail-must-not-escape");
    expect((failure as Error).stack).toBeUndefined();
  });

  it("rejects corrupt int8 values and rolls back", async () => {
    const fake = createPool([[
      { match: /^BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY$/, rows: [] },
      { match: /campaign-analytics:facts/, rows: [factsRow({ participant_count: "01" })] },
      { match: /^ROLLBACK$/, rows: [] },
    ]]);

    await expect(read(fake.pool).snapshot).rejects.toMatchObject({
      code: "CAMPAIGN_ANALYTICS_ROW_CORRUPTION",
    });
  });

  it.each([
    ["supported Locale", () => [
      { match: /^BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY$/, rows: [] },
      {
        match: /campaign-analytics:facts/,
        rows: [factsRow({ supported_locales: ["en-US", { locale: "corrupt" }] })],
      },
      { match: /^ROLLBACK$/, rows: [] },
    ] satisfies ScriptStep[]],
    ["dimension", () => [
      { match: /^BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY$/, rows: [] },
      {
        match: /campaign-analytics:facts/,
        rows: [factsRow({ account_types: [{ count: "1", id: "AA" }, 7] })],
      },
      { match: /^ROLLBACK$/, rows: [] },
    ] satisfies ScriptStep[]],
    ["Task", () => [
      { match: /^BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY$/, rows: [] },
      { match: /campaign-analytics:facts/, rows: [factsRow()] },
      {
        match: /campaign-analytics:tasks/,
        rows: [tasksRow({
          tasks: [{
            activity_participants: "1",
            required: true,
            task_id: "task-1",
            template_code: "social-follow",
            verified_participants: "1",
          }, ["corrupt-array-element"]],
        })],
      },
      { match: /^ROLLBACK$/, rows: [] },
    ] satisfies ScriptStep[]],
  ])("fails closed on a corrupt JSON array %s element", async (_label, script) => {
    const fake = createPool([[...script()]]);

    await expect(read(fake.pool).snapshot).rejects.toMatchObject({
      code: "CAMPAIGN_ANALYTICS_ROW_CORRUPTION",
    });
    expect(fake.transcripts[0]?.[fake.transcripts[0].length - 1]?.text).toBe("ROLLBACK");
  });

  it("rejects an oversized Task aggregate before projection", async () => {
    const fake = createPool([[
      { match: /^BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY$/, rows: [] },
      { match: /campaign-analytics:facts/, rows: [factsRow()] },
      {
        match: /campaign-analytics:tasks/,
        rows: [tasksRow({
          task_count: "5001",
          tasks: Array.from({ length: 5_001 }, () => ({})),
        })],
      },
      { match: /^ROLLBACK$/, rows: [] },
    ]]);

    await expect(read(fake.pool).snapshot).rejects.toMatchObject({
      code: "CAMPAIGN_ANALYTICS_BOUND_EXCEEDED",
    });
    expect(fake.transcripts[0]?.[fake.transcripts[0].length - 1]?.text).toBe("ROLLBACK");
  });

  it("fails closed when review buckets do not reconcile", async () => {
    const fake = createPool([successfulScript(
      factsRow(),
      tasksRow(),
      reviewRow({ approved_count: "2", unreviewed_count: "2" }),
    ).slice(0, 4).concat([{ match: /^ROLLBACK$/, rows: [] }])]);

    await expect(read(fake.pool).snapshot).rejects.toMatchObject({
      code: "CAMPAIGN_ANALYTICS_INTEGRITY_FAILED",
    });
    expect(fake.transcripts[0]?.[fake.transcripts[0].length - 1]?.text).toBe("ROLLBACK");
  });

  it("fails closed when review source strings violate M242 safety bounds", async () => {
    const fake = createPool([successfulScript(
      factsRow(),
      tasksRow(),
      reviewRow({ source_corruption_count: "1" }),
    ).slice(0, 4).concat([{ match: /^ROLLBACK$/, rows: [] }])]);

    await expect(read(fake.pool).snapshot).rejects.toMatchObject({
      code: "CAMPAIGN_ANALYTICS_ROW_CORRUPTION",
      operation: "read_snapshot",
    });
    expect(fake.transcripts[0]?.[fake.transcripts[0].length - 1]?.text).toBe("ROLLBACK");
  });

  it("rolls back when commit fails", async () => {
    const fake = createPool([successfulScript().slice(0, 4).concat([
      { error: { code: "08006" }, match: /^COMMIT$/ },
      { match: /^ROLLBACK$/, rows: [] },
    ])]);

    await expect(read(fake.pool).snapshot).rejects.toMatchObject({
      code: "CAMPAIGN_ANALYTICS_UNAVAILABLE",
    });
    expect(fake.transcripts[0]?.[fake.transcripts[0].length - 1]?.text).toBe("ROLLBACK");
  });

  it("closes an owned pool exactly once and never closes a borrowed pool", async () => {
    const owned = createPool([]);
    const borrowed = createPool([]);
    const ownedStore = createPostgresCampaignAnalyticsStore({ ownsPool: true, pool: owned.pool });
    const borrowedStore = createPostgresCampaignAnalyticsStore({ ownsPool: false, pool: borrowed.pool });

    const firstClose = ownedStore.close({ traceId: "trace-close-owned" });
    expect(ownedStore.close({ traceId: "trace-close-owned" })).toBe(firstClose);
    await firstClose;
    await borrowedStore.close({ traceId: "trace-close-borrowed" });

    expect(owned.end).toHaveBeenCalledTimes(1);
    expect(borrowed.end).not.toHaveBeenCalled();
    expect(() => ownedStore.readSnapshot(
      { campaignId: "campaign-analytics-1" },
      { traceId: "trace-read-after-close" },
    )).toThrowError(expect.objectContaining({ code: "CAMPAIGN_ANALYTICS_CLOSED" }));
  });

  it("stops new reads and drains an active read before closing the owned pool", async () => {
    const started = deferred();
    const resume = deferred();
    const script = successfulScript();
    const transcript: TranscriptEntry[] = [];
    const end = vi.fn(async () => undefined);
    const release = vi.fn();
    const client: PostgresCampaignAnalyticsClient = {
      query: async (text, values = []) => {
        transcript.push({ text, values });
        if (/\bcampaign_os\.schema_migrations\b/i.test(text)) {
          return { rows: migrationLedgerRows };
        }
        const step = script.shift();
        if (!step || !step.match.test(text)) {
          throw new Error("Unexpected statement");
        }
        if (/campaign-analytics:facts/.test(text)) {
          started.resolve();
          await resume.promise;
        }
        return { rows: step.rows ?? [] };
      },
      release,
    };
    const pool: PostgresCampaignAnalyticsPool = {
      connect: vi.fn(async () => client),
      end,
    };
    const store = createPostgresCampaignAnalyticsStore({ ownsPool: true, pool });
    const input = { campaignId: "campaign-analytics-1" };
    const activeRead = store.readSnapshot(input, { traceId: "trace-active-read" });
    await started.promise;
    input.campaignId = "campaign-mutated-after-start";
    const closing = store.close({ traceId: "trace-active-close" });
    let didClose = false;
    void closing.then(() => {
      didClose = true;
    });

    await Promise.resolve();
    expect(didClose).toBe(false);
    expect(() => store.readSnapshot(
      { campaignId: "campaign-analytics-1" },
      { traceId: "trace-new-read-during-close" },
    )).toThrowError(expect.objectContaining({ code: "CAMPAIGN_ANALYTICS_CLOSED" }));
    resume.resolve();
    await activeRead;
    await closing;

    expect(end).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledTimes(1);
    expect(transcript
      .filter(({ text }) => /campaign-analytics:(?:facts|tasks|review)/.test(text))
      .map(({ values }) => values)).toEqual([
      ["campaign-analytics-1"],
      ["campaign-analytics-1"],
      ["campaign-analytics-1"],
    ]);
  });

  it("reports owned Pool cleanup failure without leaking the driver error", async () => {
    const fake = createPool([]);
    fake.end.mockImplementationOnce(async () => {
      throw new Error("raw-close-detail-must-not-escape");
    });
    const store = createPostgresCampaignAnalyticsStore({ ownsPool: true, pool: fake.pool });

    const failure = await store.close({ traceId: "trace-close-failure" })
      .catch((error: unknown) => error);
    expect(failure).toMatchObject({
      code: "CAMPAIGN_ANALYTICS_CLEANUP_FAILED",
      operation: "close",
      retryable: false,
      traceId: "trace-close-failure",
    });
    expect((failure as Error).message).not.toContain("raw-close-detail-must-not-escape");
    expect((failure as Error).stack).toBeUndefined();
  });

  it("fails an already-aborted read before acquiring a database client", async () => {
    const fake = createPool([]);
    const controller = new AbortController();
    controller.abort();
    const store = createPostgresCampaignAnalyticsStore({ ownsPool: false, pool: fake.pool });

    await expect(store.readSnapshot(
      { campaignId: "campaign-analytics-1" },
      { signal: controller.signal, traceId: "trace-aborted-read" },
    )).rejects.toMatchObject({
      code: "CAMPAIGN_ANALYTICS_TIMEOUT",
      retryable: true,
    });
    expect(fake.pool.connect).not.toHaveBeenCalled();
  });

  it("rejects promptly when abort wins a pending Pool connect and destroys the late client", async () => {
    const pendingConnection = deferred<PostgresCampaignAnalyticsClient>();
    const release = vi.fn((_destroy?: boolean) => undefined);
    const query = vi.fn(async (): Promise<PostgresCampaignAnalyticsQueryResult> => ({ rows: [] }));
    const client: PostgresCampaignAnalyticsClient = { query, release };
    const pool: PostgresCampaignAnalyticsPool = {
      connect: vi.fn(() => pendingConnection.promise),
      end: vi.fn(async () => undefined),
    };
    const controller = new AbortController();
    const store = createPostgresCampaignAnalyticsStore({ ownsPool: false, pool });
    let readSettled = false;
    const outcome = store.readSnapshot(
      { campaignId: "campaign-analytics-1" },
      { signal: controller.signal, traceId: "trace-abort-pending-connect" },
    ).catch((error: unknown) => error).finally(() => {
      readSettled = true;
    });
    await vi.waitFor(() => expect(pool.connect).toHaveBeenCalledTimes(1));

    controller.abort();
    await vi.waitFor(() => expect(readSettled).toBe(true), {
      interval: 5,
      timeout: 100,
    });
    const failure = await outcome;

    expect(failure).toMatchObject({
      code: "CAMPAIGN_ANALYTICS_TIMEOUT",
      operation: "read_snapshot",
      retryable: true,
      traceId: "trace-abort-pending-connect",
    });
    expect(release).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();

    pendingConnection.resolve(client);
    await vi.waitFor(() => expect(release).toHaveBeenCalledWith(true));

    expect(release).toHaveBeenCalledTimes(1);
    expect(query).not.toHaveBeenCalled();
    await store.close({ traceId: "trace-abort-pending-connect-close" });
    expect(pool.end).not.toHaveBeenCalled();
  });

  it.each(["BEGIN", "facts query"] as const)(
    "destroys the client when abort wins a pending %s and never returns an open transaction",
    async (blockedStatement) => {
      const entered = deferred();
      const blocked = deferred<PostgresCampaignAnalyticsQueryResult>();
      const release = vi.fn((_destroy?: boolean) => undefined);
      const client: PostgresCampaignAnalyticsClient = {
        query: vi.fn(async (text) => {
          if (/\bcampaign_os\.schema_migrations\b/i.test(text)) {
            return { rows: migrationLedgerRows };
          }
          if (/^BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY$/.test(text)) {
            if (blockedStatement === "BEGIN") {
              entered.resolve();
              return blocked.promise;
            }
            return { rows: [] };
          }
          if (/campaign-analytics:facts/.test(text)) {
            entered.resolve();
            return blocked.promise;
          }
          if (text === "ROLLBACK") {
            return { rows: [] };
          }
          throw new Error("Unexpected statement");
        }),
        release,
      };
      const pool: PostgresCampaignAnalyticsPool = {
        connect: vi.fn(async () => client),
        end: vi.fn(async () => undefined),
      };
      const controller = new AbortController();
      const store = createPostgresCampaignAnalyticsStore({ ownsPool: false, pool });
      const reading = store.readSnapshot(
        { campaignId: "campaign-analytics-1" },
        {
          signal: controller.signal,
          traceId: `trace-abort-pending-${blockedStatement === "BEGIN" ? "begin" : "facts"}`,
        },
      );
      const outcome = reading.catch((error: unknown) => error);
      await entered.promise;

      controller.abort();
      let destroyedWhileQueryWasBlocked = true;
      try {
        await vi.waitFor(() => expect(release).toHaveBeenCalledWith(true), {
          interval: 5,
          timeout: 100,
        });
      } catch {
        destroyedWhileQueryWasBlocked = false;
      }
      blocked.resolve({
        rows: blockedStatement === "BEGIN" ? [] : [factsRow()],
      });
      const failure = await outcome;

      expect(destroyedWhileQueryWasBlocked).toBe(true);
      expect(failure).toMatchObject({
        code: "CAMPAIGN_ANALYTICS_TIMEOUT",
        operation: "read_snapshot",
        retryable: true,
      });
      expect(release).toHaveBeenCalledTimes(1);
      expect(release).toHaveBeenCalledWith(true);
    },
  );

  it("terminates an active read after drain timeout and still closes its owned Pool", async () => {
    const factsStarted = deferred();
    const blockedFacts = deferred<PostgresCampaignAnalyticsQueryResult>();
    let blockedFactsSettled = false;
    const end = vi.fn(async () => undefined);
    const release = vi.fn((destroy?: boolean) => {
      if (destroy && !blockedFactsSettled) {
        blockedFactsSettled = true;
        blockedFacts.reject(Object.assign(new Error("destroyed client"), { code: "57014" }));
      }
    });
    const client: PostgresCampaignAnalyticsClient = {
      query: vi.fn(async (text) => {
        if (text === "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY") {
          return { rows: [] };
        }
        if (/\bcampaign_os\.schema_migrations\b/i.test(text)) {
          return { rows: migrationLedgerRows };
        }
        if (/campaign-analytics:facts/.test(text)) {
          factsStarted.resolve();
          return blockedFacts.promise;
        }
        if (text === "ROLLBACK") {
          return { rows: [] };
        }
        throw new Error("Unexpected statement");
      }),
      release,
    };
    const pool: PostgresCampaignAnalyticsPool = {
      connect: vi.fn(async () => client),
      end,
    };
    const store = createPostgresCampaignAnalyticsStore({
      drainTimeoutMs: 5,
      ownsPool: true,
      pool,
    });
    const activeRead = store.readSnapshot(
      { campaignId: "campaign-analytics-1" },
      { traceId: "trace-close-timeout-active-read" },
    );
    const readOutcome = activeRead.catch((error: unknown) => error);
    await factsStarted.promise;

    const closeOutcome = await store.close({ traceId: "trace-close-timeout" }).then(
      () => ({ status: "resolved" as const }),
      (error: unknown) => ({ error, status: "rejected" as const }),
    );
    if (!blockedFactsSettled) {
      blockedFactsSettled = true;
      blockedFacts.reject(Object.assign(new Error("test cleanup"), { code: "57014" }));
    }
    const readFailure = await readOutcome;

    expect(release).toHaveBeenCalledWith(true);
    expect(end).toHaveBeenCalledTimes(1);
    expect(readFailure).toMatchObject({
      operation: "read_snapshot",
      retryable: true,
    });
    if (closeOutcome.status === "rejected") {
      expect(closeOutcome.error).toMatchObject({
        code: "CAMPAIGN_ANALYTICS_CLEANUP_FAILED",
        operation: "close",
        traceId: "trace-close-timeout",
      });
    }
  });

  it("aborts a pending rollback after drain timeout and closes the owned Pool", async () => {
    const rollbackStarted = deferred();
    const blockedRollback = deferred<PostgresCampaignAnalyticsQueryResult>();
    const end = vi.fn(async () => undefined);
    const release = vi.fn((destroy?: boolean) => {
      if (destroy) {
        blockedRollback.reject(Object.assign(new Error("destroyed rollback client"), { code: "57014" }));
      }
    });
    const client: PostgresCampaignAnalyticsClient = {
      query: vi.fn(async (text) => {
        if (/\bcampaign_os\.schema_migrations\b/i.test(text)) {
          return { rows: migrationLedgerRows };
        }
        if (text === "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY") {
          return { rows: [] };
        }
        if (/campaign-analytics:facts/.test(text)) {
          throw Object.assign(new Error("primary query failed"), { code: "08006" });
        }
        if (text === "ROLLBACK") {
          rollbackStarted.resolve();
          return blockedRollback.promise;
        }
        throw new Error("Unexpected statement");
      }),
      release,
    };
    const pool: PostgresCampaignAnalyticsPool = {
      connect: vi.fn(async () => client),
      end,
    };
    const store = createPostgresCampaignAnalyticsStore({
      drainTimeoutMs: 100,
      ownsPool: true,
      pool,
    });
    const readOutcome = store.readSnapshot(
      { campaignId: "campaign-analytics-1" },
      { traceId: "trace-pending-rollback-read" },
    ).catch((error: unknown) => error);
    await rollbackStarted.promise;

    await expect(store.close({ traceId: "trace-pending-rollback-close" })).resolves.toBeUndefined();
    const failure = await readOutcome;

    expect(failure).toMatchObject({
      code: "CAMPAIGN_ANALYTICS_CLEANUP_FAILED",
      operation: "read_snapshot",
      traceId: "trace-pending-rollback-read",
    });
    expect(release).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledWith(true);
    expect(end).toHaveBeenCalledTimes(1);
  });

  it("surfaces release failure even when a primary query failure already exists", async () => {
    const release = vi.fn(() => {
      throw new Error("raw-release-detail-must-not-escape");
    });
    const client: PostgresCampaignAnalyticsClient = {
      query: vi.fn(async (text) => {
        if (text === "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY") {
          return { rows: [] };
        }
        if (/\bcampaign_os\.schema_migrations\b/i.test(text)) {
          return { rows: migrationLedgerRows };
        }
        if (/campaign-analytics:facts/.test(text)) {
          throw Object.assign(new Error("raw-primary-detail-must-not-escape"), { code: "08006" });
        }
        if (text === "ROLLBACK") {
          return { rows: [] };
        }
        throw new Error("Unexpected statement");
      }),
      release,
    };
    const pool: PostgresCampaignAnalyticsPool = {
      connect: vi.fn(async () => client),
      end: vi.fn(async () => undefined),
    };
    const store = createPostgresCampaignAnalyticsStore({ ownsPool: false, pool });

    const failure = await store.readSnapshot(
      { campaignId: "campaign-analytics-1" },
      { traceId: "trace-primary-and-release-failure" },
    ).catch((error: unknown) => error);

    expect(failure).toMatchObject({
      code: "CAMPAIGN_ANALYTICS_CLEANUP_FAILED",
      operation: "read_snapshot",
      retryable: false,
      traceId: "trace-primary-and-release-failure",
    });
    expect((failure as Error).message).not.toContain("raw-release-detail-must-not-escape");
    expect((failure as Error).message).not.toContain("raw-primary-detail-must-not-escape");
    expect((failure as Error).stack).toBeUndefined();
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("rejects unknown construction options", () => {
    const fake = createPool([]);
    expect(() => createPostgresCampaignAnalyticsStore({
      ownsPool: false,
      pool: fake.pool,
      role: "admin",
    } as never)).toThrowError(CampaignAnalyticsStoreError);
  });

  it.each([
    ["maxTaskRows", { maxTaskRows: 0 }, "read_snapshot"],
    ["drainTimeoutMs", { drainTimeoutMs: 0 }, "close"],
  ] as const)("classifies invalid %s construction options by operation", (_label, option, operation) => {
    const fake = createPool([]);
    let failure: unknown;
    try {
      createPostgresCampaignAnalyticsStore({ ownsPool: false, pool: fake.pool, ...option });
    } catch (error) {
      failure = error;
    }

    expect(failure).toMatchObject({
      code: "CAMPAIGN_ANALYTICS_ARGUMENT_INVALID",
      operation,
    });
  });

  it("does not expose write statements or unparameterized Campaign scope", () => {
    for (const sql of [
      CAMPAIGN_ANALYTICS_FACTS_SQL,
      CAMPAIGN_ANALYTICS_TASKS_SQL,
      CAMPAIGN_ANALYTICS_REVIEW_SQL,
    ]) {
      expect(sql).not.toMatch(/\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|TRUNCATE|LOCK)\b/i);
      expect(sql).toContain("$1");
      expect(sql).not.toContain("campaign-analytics-1");
    }
    expect(CAMPAIGN_ANALYTICS_REVIEW_SQL).toMatch(/version\s+DESC/i);
    expect(CAMPAIGN_ANALYTICS_REVIEW_SQL).toMatch(/decided_at\s+DESC/i);
    expect(CAMPAIGN_ANALYTICS_REVIEW_SQL).toMatch(/id\s+COLLATE\s+"C"\s+ASC/i);
    expect(CAMPAIGN_ANALYTICS_REVIEW_SQL).toMatch(/snapshot_manifest/i);
    expect(CAMPAIGN_ANALYTICS_TASKS_SQL).toMatch(/verification_attempts/i);
    expect(CAMPAIGN_ANALYTICS_TASKS_SQL).toMatch(/dispatch_state\s*=\s*'result_observed'/i);
  });

  it("uses the exact M242 full manifest and fingerprint without a Task templateCode", () => {
    expect(CAMPAIGN_ANALYTICS_REVIEW_SQL).not.toMatch(/['"]templateCode['"]/);
    expect(CAMPAIGN_ANALYTICS_REVIEW_SQL).toMatch(
      /\bdecision\.snapshot_manifest\s+(?:IS\s+NOT\s+DISTINCT\s+FROM|=)\s+/i,
    );
    expect(CAMPAIGN_ANALYTICS_REVIEW_SQL).toMatch(
      /\bdecision\.snapshot_fingerprint\s+(?:IS\s+NOT\s+DISTINCT\s+FROM|=)\s+/i,
    );
    for (const field of [
      "campaignId",
      "id",
      "points",
      "required",
      "updatedAt",
      "verificationType",
      "walletCompatibility",
    ]) {
      expect(CAMPAIGN_ANALYTICS_REVIEW_SQL).toContain(`"${field}"`);
    }
  });

  it("counts a verified Task only when Completion and Evidence points equal Task points", () => {
    const scopedTasks = CAMPAIGN_ANALYTICS_TASKS_SQL.slice(
      CAMPAIGN_ANALYTICS_TASKS_SQL.indexOf("scoped_tasks AS ("),
      CAMPAIGN_ANALYTICS_TASKS_SQL.indexOf("scoped_completions AS ("),
    );

    expect(scopedTasks).toMatch(/\btask\.points\b/i);
    expect(CAMPAIGN_ANALYTICS_TASKS_SQL).toMatch(
      /\bcompletion\.points_awarded\s*=\s*task\.points\b/i,
    );
    expect(CAMPAIGN_ANALYTICS_TASKS_SQL).toMatch(
      /\bevidence\.points_awarded\s*=\s*completion\.points_awarded\b/i,
    );
  });

  it("validates M242 JSONB string types, bounds, control characters, and sensitive values", () => {
    expect(CAMPAIGN_ANALYTICS_REVIEW_SQL).toMatch(
      /jsonb_array_elements\(participant\.risk_flags\)/i,
    );
    expect(CAMPAIGN_ANALYTICS_REVIEW_SQL).toMatch(
      /jsonb_array_elements\(evidence\.diagnostic_codes\)/i,
    );
    const stringElementChecks = CAMPAIGN_ANALYTICS_REVIEW_SQL.match(
      /jsonb_typeof\(\s*[a-z_][a-z0-9_]*\.item\s*\)\s*=\s*'string'/gi,
    ) ?? [];
    expect(stringElementChecks).toHaveLength(2);
    expect(CAMPAIGN_ANALYTICS_REVIEW_SQL).toMatch(
      /regexp_replace\(\s*risk_flag\.item #>> '\{\}'/i,
    );
    expect(CAMPAIGN_ANALYTICS_REVIEW_SQL).toMatch(
      /regexp_replace\(\s*diagnostic\.item #>> '\{\}'/i,
    );
    expect(CAMPAIGN_ANALYTICS_REVIEW_SQL).toContain("U&'\\+010000'");
    expect(CAMPAIGN_ANALYTICS_REVIEW_SQL).toContain("U&'\\+10FFFF'");
    expect(CAMPAIGN_ANALYTICS_REVIEW_SQL).toContain("BETWEEN 1 AND 128");
    expect(CAMPAIGN_ANALYTICS_REVIEW_SQL).toContain("[[:cntrl:]]");
    expect(CAMPAIGN_ANALYTICS_REVIEW_SQL).toContain("access[_-]?token");
    expect(CAMPAIGN_ANALYTICS_REVIEW_SQL).toContain("/Users/");
  });

  it("pre-aggregates review derivations instead of running correlated aggregates per Participant", () => {
    const derivationStart = CAMPAIGN_ANALYTICS_REVIEW_SQL.indexOf(
      "participant_review_derivation AS (",
    );
    const derivationEnd = CAMPAIGN_ANALYTICS_REVIEW_SQL.indexOf(
      "participant_snapshots AS (",
    );
    expect(derivationStart).toBeGreaterThan(-1);
    expect(derivationEnd).toBeGreaterThan(derivationStart);
    const derivation = CAMPAIGN_ANALYTICS_REVIEW_SQL.slice(derivationStart, derivationEnd);
    const manifestChecks = CAMPAIGN_ANALYTICS_REVIEW_SQL.slice(
      CAMPAIGN_ANALYTICS_REVIEW_SQL.indexOf("manifest_checks AS ("),
      CAMPAIGN_ANALYTICS_REVIEW_SQL.indexOf("classified_reviews AS ("),
    );

    expect(derivation.match(/\bSELECT\b/gi) ?? []).toHaveLength(1);
    expect(manifestChecks.match(/\bSELECT\b/gi) ?? []).toHaveLength(1);
    expect(CAMPAIGN_ANALYTICS_REVIEW_SQL).toMatch(/GROUP BY\s+fact\.participant_id\b/i);
    expect(CAMPAIGN_ANALYTICS_REVIEW_SQL).toMatch(
      /GROUP BY\s+diagnostic\.participant_id\b/i,
    );
    expect(CAMPAIGN_ANALYTICS_REVIEW_SQL).not.toMatch(
      /WHERE\s+[a-z_][a-z0-9_]*\.participant_id\s*=\s*participant\.id/i,
    );
  });

  it("scopes Completion and Evidence manifest work to Participants with a latest decision", () => {
    const completionSnapshots = CAMPAIGN_ANALYTICS_REVIEW_SQL.slice(
      CAMPAIGN_ANALYTICS_REVIEW_SQL.indexOf("completion_snapshots AS ("),
      CAMPAIGN_ANALYTICS_REVIEW_SQL.indexOf("completion_manifests AS ("),
    );
    const evidenceSnapshots = CAMPAIGN_ANALYTICS_REVIEW_SQL.slice(
      CAMPAIGN_ANALYTICS_REVIEW_SQL.indexOf("evidence_diagnostic_values AS ("),
      CAMPAIGN_ANALYTICS_REVIEW_SQL.indexOf("evidence_manifests AS ("),
    );

    expect(completionSnapshots).toMatch(/JOIN\s+reviewed_participants\s+AS\s+participant/i);
    expect(evidenceSnapshots.match(/JOIN\s+reviewed_participants\s+AS\s+participant/gi) ?? [])
      .toHaveLength(4);

    const globalEvidenceIntegrity = CAMPAIGN_ANALYTICS_REVIEW_SQL.slice(
      CAMPAIGN_ANALYTICS_REVIEW_SQL.indexOf("evidence_diagnostic_source_corruption AS ("),
      CAMPAIGN_ANALYTICS_REVIEW_SQL.indexOf("participant_risk_flag_values AS ("),
    );
    expect(globalEvidenceIntegrity).toMatch(
      /FROM\s+campaign_os\.campaign_task_evidence\s+AS\s+evidence/gi,
    );
    expect(globalEvidenceIntegrity).not.toMatch(/reviewed_participants/i);
  });
});

const createRealPostgresPool = (databaseUrl: string, max = 2): pg.Pool => {
  const parsed = new URL(databaseUrl);
  const loopback = parsed.hostname === "127.0.0.1"
    || parsed.hostname === "localhost"
    || parsed.hostname === "::1";
  const config = resolveCampaignOsCampaignDbConfig({
    databaseUrl,
    env: {},
    mode: "postgres",
    poolMax: max,
    sslMode: process.env.CAMPAIGN_OS_DATABASE_SSL_MODE?.trim()
      || (loopback ? "disable" : "verify-full"),
  });
  if (config.mode !== "postgres") {
    throw new Error("Campaign analytics PostgreSQL test configuration did not resolve PostgreSQL mode.");
  }
  return new pg.Pool(config.pool);
};

const createAnalyticsAdapterPool = (pool: pg.Pool): PostgresCampaignAnalyticsPool => ({
  connect: async () => {
    const client = await pool.connect();
    return {
      query: async (text, values = []) => {
        const result = await client.query(text, [...values]);
        return { rows: result.rows as Array<Record<string, unknown>> };
      },
      release: (destroy?: boolean) => client.release(destroy),
    };
  },
  end: async () => pool.end(),
});

postgresAcceptance("PostgreSQL Campaign analytics SQL acceptance", () => {
  const databaseName = `campaign_os_m245_wp02_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  let adminPool: pg.Pool | undefined;
  let analyticsPool: pg.Pool | undefined;
  let databaseCreated = false;

  const requiredAnalyticsPool = (): pg.Pool => {
    if (!analyticsPool) {
      throw new Error("Campaign analytics PostgreSQL acceptance Pool is unavailable.");
    }
    return analyticsPool;
  };

  beforeAll(async () => {
    try {
      adminPool = createRealPostgresPool(TEST_DATABASE_URL!, 1);
      if (!/^[a-z0-9_]+$/.test(databaseName)) {
        throw new Error("Campaign analytics PostgreSQL acceptance database name is invalid.");
      }
      await adminPool.query(`CREATE DATABASE "${databaseName}"`);
      databaseCreated = true;

      const isolatedUrl = new URL(TEST_DATABASE_URL!);
      isolatedUrl.pathname = `/${databaseName}`;
      isolatedUrl.search = "";
      const isolatedDatabaseUrl = isolatedUrl.toString();
      const migrationDriverPool = createRealPostgresPool(isolatedDatabaseUrl, 1);
      const migrationPool: PostgresMigrationPool = {
        connect: async () => {
          const client = await migrationDriverPool.connect();
          return {
            query: async (text, values = []) => {
              const result = await client.query(text, [...values]);
              return { rows: result.rows as Array<Record<string, unknown>> };
            },
            release: (destroy?: boolean) => client.release(destroy),
          };
        },
        end: async () => migrationDriverPool.end(),
      };

      try {
        const migration = await runPostgresMigrations({
          approved: true,
          migrations: await loadPostgresMigrations(),
          mode: "apply",
          pool: migrationPool,
          traceId: "trace-m245-wp02-postgres-migrations",
        });
        expect(migration.status).toBe("ready");
        expect(migration.pendingMigrationIds).toEqual([]);
      } finally {
        await migrationPool.end();
      }

      analyticsPool = createRealPostgresPool(isolatedDatabaseUrl, 2);
    } catch {
      throw new Error("Campaign analytics PostgreSQL acceptance setup failed.");
    }
  }, 60_000);

  afterAll(async () => {
    const cleanupFailures: unknown[] = [];
    if (analyticsPool) {
      try {
        await analyticsPool.end();
      } catch (error) {
        cleanupFailures.push(error);
      }
    }
    if (adminPool && databaseCreated) {
      try {
        await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
      } catch (error) {
        cleanupFailures.push(error);
      }
    }
    if (adminPool) {
      try {
        await adminPool.end();
      } catch (error) {
        cleanupFailures.push(error);
      }
    }
    if (cleanupFailures.length > 0) {
      throw new Error(
        `Campaign analytics PostgreSQL acceptance cleanup failed (${cleanupFailures.length} failures).`,
      );
    }
  }, 60_000);

  it("executes the configured PostgreSQL acceptance suite instead of skipping", () => {
    expect(TEST_DATABASE_URL).toBeTruthy();
  });

  it("executes and EXPLAINs every analytics aggregate against migrations 0001-0005", async () => {
    const pool = requiredAnalyticsPool();
    const ledger = await pool.query(
      "SELECT migration_id, checksum FROM campaign_os.schema_migrations ORDER BY migration_id ASC",
    );
    expect(ledger.rows).toEqual(migrationLedgerRows);

    const client = await pool.connect();
    let transactionOpen = false;
    try {
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      transactionOpen = true;
      for (const [index, sql] of [
        CAMPAIGN_ANALYTICS_FACTS_SQL,
        CAMPAIGN_ANALYTICS_TASKS_SQL,
        CAMPAIGN_ANALYTICS_REVIEW_SQL,
      ].entries()) {
        try {
          const execution = await client.query(sql, ["campaign-m245-wp02-explain"]);
          expect(Array.isArray(execution.rows)).toBe(true);
          const explained = await client.query(`EXPLAIN (FORMAT JSON) ${sql}`, [
            "campaign-m245-wp02-explain",
          ]);
          expect(explained.rows).toHaveLength(1);
          expect(explained.rows[0]?.["QUERY PLAN"]).toBeDefined();
        } catch {
          throw new Error(
            `Campaign analytics PostgreSQL statement ${index + 1} failed execution or EXPLAIN.`,
          );
        }
      }
      await client.query("ROLLBACK");
      transactionOpen = false;
    } finally {
      if (transactionOpen) {
        await client.query("ROLLBACK").catch(() => undefined);
      }
      client.release();
    }

    const adapterPool = createAnalyticsAdapterPool(pool);
    const store = createPostgresCampaignAnalyticsStore({ ownsPool: false, pool: adapterPool });
    await expect(store.readSnapshot(
      { campaignId: "campaign-m245-wp02-missing" },
      { traceId: "trace-m245-wp02-real-read" },
    )).rejects.toMatchObject({
      code: "CAMPAIGN_ANALYTICS_NOT_FOUND",
      operation: "read_snapshot",
    });
    await store.close({ traceId: "trace-m245-wp02-real-close" });
    await expect(pool.query("SELECT 1 AS ready")).resolves.toMatchObject({
      rows: [{ ready: 1 }],
    });
  }, 60_000);

  it("fails closed against a real PostgreSQL ledger containing an unexpected migration", async () => {
    const pool = requiredAnalyticsPool();
    const migrationId = "0006_unapproved_analytics_schema";
    await pool.query(`
      INSERT INTO campaign_os.schema_migrations (
        migration_id, checksum, execution_ms
      ) VALUES ($1, $2, 0)
    `, [migrationId, "f".repeat(64)]);
    const store = createPostgresCampaignAnalyticsStore({
      ownsPool: false,
      pool: createAnalyticsAdapterPool(pool),
    });

    try {
      await expect(store.readSnapshot(
        { campaignId: "campaign-m245-wp02-missing" },
        { traceId: "trace-m245-wp02-extra-migration" },
      )).rejects.toMatchObject({
        code: "CAMPAIGN_ANALYTICS_SCHEMA_NOT_READY",
        operation: "read_snapshot",
      });
    } finally {
      await store.close({ traceId: "trace-m245-wp02-extra-migration-close" });
      await pool.query(
        "DELETE FROM campaign_os.schema_migrations WHERE migration_id = $1",
        [migrationId],
      );
    }
  }, 60_000);

  it("matches the M242 canonical identity for current and stale review decisions", async () => {
    const pool = requiredAnalyticsPool();
    const campaignId = "campaign-m245-review";
    const taskId = "task-m245-review";
    const participantId = "participant-m245-review";
    const walletAddress = "3E9M245ReviewParticipant";
    const campaignUpdatedAt = "2026-07-19T00:00:00.000Z";
    const activityAt = "2026-07-19T00:01:00.000Z";
    const evidenceHash = "b".repeat(64);

    await pool.query(`
      INSERT INTO campaign_os.campaigns (
        id, project_id, owner_address, status, default_locale, supported_locales,
        wallet_policy, contract_mode, goal, duration, reward_description,
        reward_disclaimer_hash, metadata_uri, metadata_hash, start_time, end_time,
        publish_readiness, created_at, updated_at
      ) VALUES (
        'campaign-m245-review', 'project-m245-review', '2F4M245ReviewOwner', 'draft',
        'en-US', '["en-US"]'::jsonb, 'ANY', 'OFF_CHAIN_MVP',
        'M245 canonical review acceptance', '2026-08-01/2026-08-14',
        'M245 review rewards.', repeat('a', 64), NULL, NULL,
        '2026-08-01T00:00:00.000Z', '2026-08-14T23:59:59.000Z',
        '{"ready":true,"blockers":[],"warnings":[]}'::jsonb,
        '2026-07-19T00:00:00.000Z', '2026-07-19T00:00:00.000Z'
      );
      INSERT INTO campaign_os.campaign_tasks (
        id, campaign_id, template_code, verification_type, wallet_compatibility,
        points, required, evidence_rule, created_at, updated_at
      ) VALUES (
        'task-m245-review', 'campaign-m245-review', 'm245_review_task', 'ON_CHAIN',
        'ANY', 40, true, '{"source":"AELFSCAN","minAmount":1}'::jsonb,
        '2026-07-19T00:00:00.000Z', '2026-07-19T00:00:00.000Z'
      );
      INSERT INTO campaign_os.campaign_participants (
        id, campaign_id, wallet_address, account_type, wallet_source,
        wallet_type_verified, wallet_signature_status, wallet_verified_at,
        locale_preference, total_points, rank, risk_flags, created_at, updated_at
      ) VALUES (
        'participant-m245-review', 'campaign-m245-review', '3E9M245ReviewParticipant',
        'EOA', 'PORTKEY_EOA_EXTENSION', true, 'signed',
        '2026-07-19T00:00:00.000Z', 'en-US', 40, 1, '[]'::jsonb,
        '2026-07-19T00:00:00.000Z', '2026-07-19T00:00:00.000Z'
      );
      INSERT INTO campaign_os.campaign_task_completions (
        id, campaign_id, task_id, wallet_address, account_type, wallet_source,
        status, evidence_source, evidence_id, evidence_hash, points_awarded,
        completed_at, created_at, updated_at
      ) VALUES (
        'completion-m245-review', 'campaign-m245-review', 'task-m245-review',
        '3E9M245ReviewParticipant', 'EOA', 'PORTKEY_EOA_EXTENSION', 'completed',
        'AELFSCAN', 'evidence-m245-review', repeat('b', 64), 40,
        '2026-07-19T00:01:00.000Z', '2026-07-19T00:01:00.000Z',
        '2026-07-19T00:01:00.000Z'
      );
      INSERT INTO campaign_os.campaign_task_evidence (
        id, campaign_id, task_id, wallet_address, completion_id, account_type,
        wallet_source, status, evidence_source, evidence_hash, evidence_ref,
        diagnostic_codes, points_awarded, captured_at, live_contract_executed,
        live_provider_executed, live_reward_executed, live_storage_executed,
        created_at, updated_at
      ) VALUES (
        'evidence-m245-review', 'campaign-m245-review', 'task-m245-review',
        '3E9M245ReviewParticipant', 'completion-m245-review', 'EOA',
        'PORTKEY_EOA_EXTENSION', 'completed', 'AELFSCAN', repeat('b', 64),
        'm245-review-evidence-ref', '[]'::jsonb, 40,
        '2026-07-19T00:01:00.000Z', false, false, false, false,
        '2026-07-19T00:01:00.000Z', '2026-07-19T00:01:00.000Z'
      );
    `);

    const rows = {
      campaign: {
        contractMode: "OFF_CHAIN_MVP",
        endTime: "2026-08-14T23:59:59.000Z",
        id: campaignId,
        startTime: "2026-08-01T00:00:00.000Z",
        status: "draft",
        updatedAt: campaignUpdatedAt,
        walletPolicy: "ANY",
      },
      completions: [{
        accountType: "EOA",
        campaignId,
        completedAt: activityAt,
        id: "completion-m245-review",
        pointsAwarded: 40,
        status: "completed",
        taskId,
        updatedAt: activityAt,
        walletAddress,
        walletSource: "PORTKEY_EOA_EXTENSION",
      }],
      evidence: [{
        campaignId,
        capturedAt: activityAt,
        completionId: "completion-m245-review",
        diagnosticCodes: [],
        evidenceHash,
        evidenceRef: "m245-review-evidence-ref",
        evidenceSource: "AELFSCAN",
        id: "evidence-m245-review",
        liveProviderExecuted: false,
        pointsAwarded: 40,
        status: "completed",
        taskId,
        updatedAt: activityAt,
        walletAddress,
      }],
      participants: [{
        accountType: "EOA",
        campaignId,
        createdAt: campaignUpdatedAt,
        id: participantId,
        rank: 1,
        riskFlags: [],
        totalPoints: 40,
        updatedAt: campaignUpdatedAt,
        walletAddress,
        walletSource: "PORTKEY_EOA_EXTENSION",
        walletTypeVerified: true,
      }],
      ranking: [{
        campaignId,
        createdAt: campaignUpdatedAt,
        participantId,
        rank: 1,
        totalPoints: 40,
        walletAddress,
      }],
      tasks: [{
        campaignId,
        id: taskId,
        points: 40,
        required: true,
        updatedAt: campaignUpdatedAt,
        verificationType: "ON_CHAIN",
        walletCompatibility: "ANY",
      }],
    } satisfies AdminReviewSnapshotRows;
    const projected = projectAdminReviewSnapshot(rows, {
      generatedAt: "2026-07-19T00:02:00.000Z",
      participantId,
      traceId: "trace-m245-review-project",
    });

    expect(projected.manifest.tasks).toHaveLength(1);
    expect(projected.manifest.tasks[0]).not.toHaveProperty("templateCode");

    await pool.query(`
      INSERT INTO campaign_os.campaign_review_decisions (
        id, campaign_id, participant_id, wallet_address, version, decision,
        snapshot_version, snapshot_fingerprint, snapshot_manifest, reason_code,
        note, operator_subject, operator_role, idempotency_key_hash, payload_hash,
        trace_id, decided_at
      ) VALUES (
        $1, $2, $3, $4, 1, 'approved', $5, $6, $7::jsonb, 'M245_APPROVED',
        NULL, '2F4M245ReviewAdmin', 'review_operator', $8, $9,
        'trace-m245-review-decision-v1', '2026-07-19T00:02:00.000Z'
      )
    `, [
      "decision-m245-review-v1",
      campaignId,
      participantId,
      walletAddress,
      projected.fingerprintVersion,
      projected.fingerprint,
      JSON.stringify(projected.manifest),
      "c".repeat(64),
      "d".repeat(64),
    ]);

    const current = await pool.query(CAMPAIGN_ANALYTICS_REVIEW_SQL, [campaignId]);
    expect(current.rows).toHaveLength(1);
    expect(current.rows[0]).toMatchObject({
      approved_count: "1",
      invalid_count: "0",
      stale_count: "0",
      total_participants: "1",
    });

    const wrongFingerprint = projected.fingerprint === "0".repeat(64)
      ? "1".repeat(64)
      : "0".repeat(64);
    const staleManifest = {
      ...projected.manifest,
      unexpectedRootKey: "must-be-stale",
    };
    await pool.query(`
      INSERT INTO campaign_os.campaign_review_decisions (
        id, campaign_id, participant_id, wallet_address, version, decision,
        snapshot_version, snapshot_fingerprint, snapshot_manifest, reason_code,
        note, operator_subject, operator_role, idempotency_key_hash, payload_hash,
        trace_id, decided_at
      ) VALUES (
        $1, $2, $3, $4, 2, 'approved', $5, $6, $7::jsonb, 'M245_STALE',
        NULL, '2F4M245ReviewAdmin', 'review_operator', $8, $9,
        'trace-m245-review-decision-v2', '2026-07-19T00:03:00.000Z'
      )
    `, [
      "decision-m245-review-v2",
      campaignId,
      participantId,
      walletAddress,
      projected.fingerprintVersion,
      wrongFingerprint,
      JSON.stringify(staleManifest),
      "e".repeat(64),
      "f".repeat(64),
    ]);

    const stale = await pool.query(CAMPAIGN_ANALYTICS_REVIEW_SQL, [campaignId]);
    expect(stale.rows).toHaveLength(1);
    expect(stale.rows[0]).toMatchObject({
      approved_count: "0",
      invalid_count: "0",
      stale_count: "1",
      total_participants: "1",
    });

    await pool.query(`
      UPDATE campaign_os.campaign_participants
      SET risk_flags = $2::jsonb
      WHERE campaign_id = $1
    `, [campaignId, JSON.stringify(["token=private-review-value"])]);
    const unsafeRisk = await pool.query(CAMPAIGN_ANALYTICS_REVIEW_SQL, [campaignId]);
    expect(unsafeRisk.rows[0]).toMatchObject({ source_corruption_count: "1" });

    await pool.query(`
      UPDATE campaign_os.campaign_participants
      SET risk_flags = '[]'::jsonb
      WHERE campaign_id = $1
    `, [campaignId]);
    await pool.query(`
      INSERT INTO campaign_os.campaign_participants (
        id, campaign_id, wallet_address, account_type, wallet_source,
        wallet_type_verified, wallet_signature_status, wallet_verified_at,
        locale_preference, total_points, rank, risk_flags, created_at, updated_at
      ) VALUES (
        'participant-m245-unreviewed', $1, '3E9M245UnreviewedParticipant',
        'EOA', 'PORTKEY_EOA_EXTENSION', true, 'signed',
        '2026-07-19T00:00:00.000Z', 'en-US', 0, 2, '[]'::jsonb,
        '2026-07-19T00:00:00.000Z', '2026-07-19T00:00:00.000Z'
      )
    `, [campaignId]);
    await pool.query(`
      INSERT INTO campaign_os.campaign_task_evidence (
        id, campaign_id, task_id, wallet_address, completion_id, account_type,
        wallet_source, status, evidence_source, evidence_hash, evidence_ref,
        diagnostic_codes, points_awarded, captured_at, live_contract_executed,
        live_provider_executed, live_reward_executed, live_storage_executed,
        created_at, updated_at
      ) VALUES (
        'evidence-m245-unreviewed', $1, 'task-m245-review',
        '3E9M245UnreviewedParticipant', NULL, 'EOA',
        'PORTKEY_EOA_EXTENSION', 'pending', 'AELFSCAN', repeat('a', 64),
        'm245-unreviewed-evidence-ref', $2::jsonb, 0,
        '2026-07-19T00:04:00.000Z', false, false, false, false,
        '2026-07-19T00:04:00.000Z', '2026-07-19T00:04:00.000Z'
      )
    `, [campaignId, JSON.stringify(["x".repeat(129)])]);
    const oversizedDiagnostic = await pool.query(CAMPAIGN_ANALYTICS_REVIEW_SQL, [campaignId]);
    expect(oversizedDiagnostic.rows[0]).toMatchObject({
      source_corruption_count: "1",
      total_participants: "2",
      unreviewed_count: "1",
    });

    await pool.query(`
      UPDATE campaign_os.campaign_task_evidence
      SET diagnostic_codes = $2::jsonb
      WHERE campaign_id = $1
        AND id = 'evidence-m245-unreviewed'
    `, [campaignId, JSON.stringify(["\u{1F600}".repeat(65)])]);
    const utf16OversizedDiagnostic = await pool.query(
      CAMPAIGN_ANALYTICS_REVIEW_SQL,
      [campaignId],
    );
    expect(utf16OversizedDiagnostic.rows[0]).toMatchObject({
      source_corruption_count: "1",
      total_participants: "2",
      unreviewed_count: "1",
    });
  }, 60_000);
});
