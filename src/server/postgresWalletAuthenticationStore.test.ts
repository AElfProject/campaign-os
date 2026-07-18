// @vitest-environment node

import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  issueVerifiedWalletSubject,
  projectVerifiedWalletSubjectForPersistence,
  type DurableWalletSessionRecord,
  type WalletAuthenticationChallengeSnapshot,
} from "./walletAuthentication";
import {
  createPostgresWalletAuthenticationStore,
  createRequiredPostgresWalletAuthenticationStore,
  type PostgresWalletAuthenticationClient,
  type PostgresWalletAuthenticationPool,
} from "./postgresWalletAuthenticationStore";
import { loadPostgresMigrations, runPostgresMigrations } from "./postgresMigration";
import { walletAuthenticationSubjectKey } from "./walletAuthenticationStore";

const TEST_DATABASE_URL = process.env.CAMPAIGN_OS_TEST_DATABASE_URL?.trim();
const REQUIRE_POSTGRES_TESTS = process.env.CAMPAIGN_OS_REQUIRE_POSTGRES_TESTS?.trim() === "1"
  || process.env.npm_lifecycle_event === "test:postgres:required";

if (REQUIRE_POSTGRES_TESTS && !TEST_DATABASE_URL) {
  throw new Error(
    "Wallet authentication PostgreSQL acceptance requires CAMPAIGN_OS_TEST_DATABASE_URL.",
  );
}

const postgresSuite = TEST_DATABASE_URL ? describe : describe.skip;
const START = new Date("2026-07-18T06:00:00.000Z");
const digest = (value: string) => value.repeat(64);

const challenge = (
  sequence = 1,
  overrides: Partial<WalletAuthenticationChallengeSnapshot> = {},
): WalletAuthenticationChallengeSnapshot => ({
  adapterId: "portkey-discover-eoa",
  chainId: "AELF",
  expiresAt: new Date(START.getTime() + 5 * 60_000).toISOString(),
  id: `postgres-wallet-challenge-${sequence}`,
  issuedAt: START.toISOString(),
  messageDigest: digest(sequence % 2 === 0 ? "b" : "a"),
  network: "testnet",
  nonceDigest: digest(sequence % 2 === 0 ? "d" : "c"),
  requestedWalletAddress: "ELF_postgres_participant",
  status: "issued",
  traceId: `trace-postgres-challenge-${sequence}`,
  verificationAttempts: 0,
  version: "campaign-os-wallet-auth/v1",
  ...overrides,
});

const persistedSubject = () => projectVerifiedWalletSubjectForPersistence(
  issueVerifiedWalletSubject({
    accountType: "EOA",
    adapterId: "portkey-discover-eoa",
    chainId: "AELF",
    network: "testnet",
    proofDigest: digest("e"),
    proofMethod: "AELF_EOA_RECOVERABLE",
    signerAddress: "ELF_postgres_participant",
    verifiedAt: START.toISOString(),
    walletAddress: "ELF_postgres_participant",
    walletSource: "PORTKEY_EOA_APP",
  }),
);

const session = (
  sequence = 1,
  overrides: Partial<DurableWalletSessionRecord> = {},
): DurableWalletSessionRecord => ({
  absoluteExpiresAt: new Date(START.getTime() + 8 * 60 * 60_000).toISOString(),
  capabilities: ["campaign:read", "task:verify"],
  challengeId: `postgres-wallet-challenge-${sequence}`,
  credentialBoundary: "wallet-auth-cookie/v1",
  credentialDigest: digest(sequence % 2 === 0 ? "2" : "1"),
  csrfTokenDigest: digest(sequence % 2 === 0 ? "4" : "3"),
  id: `postgres-wallet-session-${sequence}`,
  idleExpiresAt: new Date(START.getTime() + 30 * 60_000).toISOString(),
  issuedAt: START.toISOString(),
  lastSeenAt: START.toISOString(),
  membershipRevision: "membership-revision-1",
  roleIds: ["participant"],
  status: "active",
  subject: persistedSubject(),
  version: 1,
  ...overrides,
});

const createPool = (databaseUrl: string, max = 24): pg.Pool => {
  const parsed = new URL(databaseUrl);
  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const loopback = hostname === "localhost" || hostname === "::1" || hostname.startsWith("127.");
  return new pg.Pool({
    connectionString: databaseUrl,
    max,
    ssl: loopback ? false : { rejectUnauthorized: true },
  });
};

const isolatedDatabaseUrl = (baseUrl: string, databaseName: string): string => {
  const parsed = new URL(baseUrl);
  parsed.pathname = `/${databaseName}`;
  parsed.search = "";
  return parsed.toString();
};

describe("required PostgreSQL wallet authentication configuration", () => {
  it("fails closed without a configured PostgreSQL URL and never selects memory", () => {
    const poolFactory = vi.fn(() => ({
      connect: vi.fn(),
      end: vi.fn(),
      query: vi.fn(),
    }) as unknown as PostgresWalletAuthenticationPool);

    expect(() => createRequiredPostgresWalletAuthenticationStore({
      clock: { now: () => new Date(START) },
      env: {},
      poolFactory,
    })).toThrowError(expect.objectContaining({
      code: "WALLET_AUTH_STORE_CONFIG_INVALID",
      field: "CAMPAIGN_OS_DATABASE_URL",
    }));
    expect(poolFactory).not.toHaveBeenCalled();
  });

  it("rejects an invalid required PostgreSQL URL before constructing a pool", () => {
    const poolFactory = vi.fn();

    expect(() => createRequiredPostgresWalletAuthenticationStore({
      clock: { now: () => new Date(START) },
      env: { CAMPAIGN_OS_DATABASE_URL: "https://example.test/database" },
      poolFactory,
    })).toThrowError(expect.objectContaining({
      code: "WALLET_AUTH_STORE_CONFIG_INVALID",
      field: "CAMPAIGN_OS_DATABASE_URL",
    }));
    expect(poolFactory).not.toHaveBeenCalled();
  });

  it("closes an owned pool idempotently and rejects call-after-close", async () => {
    const pool: PostgresWalletAuthenticationPool = {
      connect: vi.fn(),
      end: vi.fn(async () => undefined),
      query: vi.fn(async () => ({ rows: [] })),
    };
    const store = createPostgresWalletAuthenticationStore({
      clock: { now: () => new Date(START) },
      ownsPool: true,
      pool,
    });

    const firstClose = store.close();
    expect(store.close()).toBe(firstClose);
    await firstClose;
    expect(pool.end).toHaveBeenCalledOnce();
    await expect(store.loadChallenge("postgres-wallet-challenge-1")).rejects.toMatchObject({
      code: "WALLET_AUTH_STORE_CLOSED",
      retryable: false,
    });
  });

  it("bounds close by aborting an active transaction and rejects new work", async () => {
    let rejectBlockedQuery: (reason?: unknown) => void = () => undefined;
    const blockedQuery = new Promise<never>((_resolve, reject) => {
      rejectBlockedQuery = reject;
    });
    const client: PostgresWalletAuthenticationClient = {
      query: vi.fn(async (text) => {
        if (text.includes("pg_advisory_xact_lock")) {
          return blockedQuery;
        }
        return { rows: [] };
      }),
      release: vi.fn((destroy) => {
        if (destroy) {
          rejectBlockedQuery(Object.assign(new Error("connection closed"), { code: "57P01" }));
        }
      }),
    };
    const pool: PostgresWalletAuthenticationPool = {
      connect: vi.fn(async () => client),
      end: vi.fn(async () => undefined),
      query: vi.fn(async () => ({ rows: [] })),
    };
    const authStore = createPostgresWalletAuthenticationStore({
      clock: { now: () => new Date(START) },
      pool,
      shutdownTimeoutMs: 5,
    });
    const operation = authStore.issueChallenge(challenge());
    const operationFailure = operation.then(
      () => undefined,
      (error: unknown) => error,
    );
    await vi.waitFor(() => {
      expect(client.query).toHaveBeenCalledWith(
        expect.stringContaining("pg_advisory_xact_lock"),
        expect.any(Array),
      );
    });

    const firstClose = authStore.close();
    expect(authStore.close()).toBe(firstClose);
    await expect(firstClose).resolves.toBeUndefined();
    expect(await operationFailure).toMatchObject({
      code: "WALLET_AUTH_STORE_UNAVAILABLE",
      retryable: true,
    });
    expect(client.release).toHaveBeenCalledWith(true);
    expect(pool.end).toHaveBeenCalledOnce();
    await expect(authStore.loadChallenge("postgres-wallet-challenge-1")).rejects.toMatchObject({
      code: "WALLET_AUTH_STORE_CLOSED",
    });
  });

  it.each(["40001", "40P01"])(
    "maps retryable transaction error %s without blind retry",
    async (driverCode) => {
      const client: PostgresWalletAuthenticationClient = {
        query: vi.fn(async (text) => {
          if (text === "BEGIN" || text === "ROLLBACK") {
            return { rows: [] };
          }
          throw Object.assign(new Error("driver detail must remain private"), { code: driverCode });
        }),
        release: vi.fn(),
      };
      const pool: PostgresWalletAuthenticationPool = {
        connect: vi.fn(async () => client),
        end: vi.fn(async () => undefined),
        query: vi.fn(async () => ({ rows: [] })),
      };
      const authStore = createPostgresWalletAuthenticationStore({
        clock: { now: () => new Date(START) },
        ownsPool: false,
        pool,
      });

      await expect(authStore.issueChallenge(challenge())).rejects.toMatchObject({
        code: "WALLET_AUTH_STORE_UNAVAILABLE",
        operation: "issueChallenge",
        retryable: true,
      });
      expect(pool.connect).toHaveBeenCalledOnce();
      expect(client.query).toHaveBeenCalledTimes(3);
      expect(client.release).toHaveBeenCalledOnce();
      await authStore.close();
    },
  );
});

postgresSuite("PostgreSQL wallet authentication store", () => {
  const databaseName = `campaign_os_m244_${process.pid}_${randomUUID()
    .replace(/-/g, "")
    .slice(0, 8)}`;
  let adminPool: pg.Pool | undefined;
  let databasePool: pg.Pool | undefined;
  let databaseUrl = "";
  let now = new Date(START);

  const requiredPool = (): pg.Pool => {
    if (!databasePool) {
      throw new Error("Wallet authentication test pool is unavailable.");
    }
    return databasePool;
  };

  const store = (
    overrides: Partial<Omit<
      Parameters<typeof createPostgresWalletAuthenticationStore>[0],
      "clock" | "pool"
    >> = {},
  ) => createPostgresWalletAuthenticationStore({
    clock: { now: () => new Date(now) },
    ownsPool: false,
    pool: requiredPool(),
    ...overrides,
  });

  beforeAll(async () => {
    adminPool = createPool(TEST_DATABASE_URL!, 4);
    databaseUrl = isolatedDatabaseUrl(TEST_DATABASE_URL!, databaseName);
    await adminPool.query(`CREATE DATABASE "${databaseName}"`);
    databasePool = createPool(databaseUrl);
    const migrations = await loadPostgresMigrations();
    const result = await runPostgresMigrations({
      approved: true,
      migrations,
      mode: "apply",
      pool: databasePool,
      traceId: "trace-wallet-auth-migrations",
    });
    expect(result.status).toBe("ready");
    expect(result.appliedMigrationIds).toContain("0005_participant_wallet_authentication");
  }, 60_000);

  beforeEach(async () => {
    now = new Date(START);
    await requiredPool().query(
      "TRUNCATE campaign_os.wallet_sessions, campaign_os.wallet_auth_challenges RESTART IDENTITY",
    );
  });

  afterAll(async () => {
    const pool = databasePool;
    databasePool = undefined;
    await pool?.end();
    if (adminPool) {
      await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
      await adminPool.end();
      adminPool = undefined;
    }
  }, 60_000);

  it("issues exact digest-only challenges and applies bounded failure/rate transitions", async () => {
    const authStore = store({
      ownsPool: false,
      policy: {
        maxVerificationAttemptsPerChallenge: 2,
        maxVerificationAttemptsPerWindow: 2,
      },
    });
    const value = challenge();
    expect(await authStore.issueChallengeWithPolicy({
      challenge: value,
      clientFingerprintDigest: digest("f"),
      traceId: value.traceId,
    })).toMatchObject({ status: "issued" });
    expect(await authStore.loadChallenge(value.id)).toEqual(value);

    expect(await authStore.recordChallengeFailureWithPolicy({
      challengeId: value.id,
      terminalCode: "INVALID_PROOF",
      traceId: "trace-postgres-failure-1",
    })).toMatchObject({ status: "recorded" });
    expect(await authStore.recordChallengeFailureWithPolicy({
      challengeId: value.id,
      terminalCode: "INVALID_PROOF",
      traceId: "trace-postgres-failure-2",
    })).toMatchObject({ status: "rate_limited" });
    expect(await authStore.loadChallenge(value.id)).toMatchObject({
      status: "rejected",
      verificationAttempts: 2,
    });

    const persisted = await requiredPool().query(
      "SELECT row_to_json(challenge_row)::text AS value FROM campaign_os.wallet_auth_challenges AS challenge_row",
    );
    const encoded = JSON.stringify(persisted.rows);
    expect(encoded).not.toContain("raw-cookie-material");
    expect(encoded).not.toContain("raw-message-material");
    expect(encoded).not.toContain("raw-signature-material");
    await authStore.close();
  });

  it("applies independent subject rate limits and resets the persisted window", async () => {
    const authStore = store({
      ownsPool: false,
      policy: {
        maxVerificationAttemptsPerChallenge: 10,
        maxVerificationAttemptsPerWindow: 2,
        verificationRateWindowMs: 60_000,
      },
    });
    await authStore.issueChallengeWithPolicy({
      challenge: challenge(1),
      clientFingerprintDigest: digest("f"),
      traceId: "trace-postgres-rate-1",
    });
    await authStore.issueChallengeWithPolicy({
      challenge: challenge(2),
      clientFingerprintDigest: digest("9"),
      traceId: "trace-postgres-rate-2",
    });

    expect(await authStore.recordChallengeFailureWithPolicy({
      challengeId: "postgres-wallet-challenge-1",
      terminalCode: "INVALID_PROOF",
      traceId: "trace-postgres-rate-failure-1",
    })).toMatchObject({ status: "recorded" });
    expect(await authStore.recordChallengeFailureWithPolicy({
      challengeId: "postgres-wallet-challenge-2",
      terminalCode: "INVALID_PROOF",
      traceId: "trace-postgres-rate-failure-2",
    })).toMatchObject({ status: "rate_limited" });

    now = new Date(START.getTime() + 61_000);
    expect(await authStore.recordChallengeFailureWithPolicy({
      challengeId: "postgres-wallet-challenge-1",
      terminalCode: "INVALID_PROOF",
      traceId: "trace-postgres-rate-reset",
    })).toMatchObject({ status: "recorded" });
    const reset = await requiredPool().query(
      `SELECT rate_attempt_count, rate_window_started_at
       FROM campaign_os.wallet_auth_challenges WHERE id = $1`,
      ["postgres-wallet-challenge-1"],
    );
    expect(reset.rows[0]).toMatchObject({
      rate_attempt_count: 1,
      rate_window_started_at: now,
    });
    await authStore.close();
  });

  it("serializes 20 consumes to one session and rolls back challenge state on insert conflict", async () => {
    const authStore = store();
    await authStore.issueChallenge(challenge());
    const input = {
      challengeId: "postgres-wallet-challenge-1",
      expectedChallengeVersion: "campaign-os-wallet-auth/v1",
      session: session(),
      traceId: "trace-postgres-consume",
    } as const;
    const outcomes = await Promise.all(
      Array.from({ length: 20 }, () => authStore.consumeChallengeAndCreateSession(input)),
    );

    expect(outcomes.filter((outcome) => outcome.status === "created")).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome.status === "conflict")).toHaveLength(19);
    expect((await requiredPool().query(
      "SELECT count(*)::integer AS count FROM campaign_os.wallet_sessions",
    )).rows).toEqual([{ count: 1 }]);

    await authStore.issueChallenge(challenge(2));
    await expect(authStore.consumeChallengeAndCreateSession({
      challengeId: "postgres-wallet-challenge-2",
      expectedChallengeVersion: "campaign-os-wallet-auth/v1",
      session: session(2, { credentialDigest: digest("1") }),
      traceId: "trace-postgres-rollback",
    })).resolves.toMatchObject({ status: "conflict" });
    expect(await authStore.loadChallenge("postgres-wallet-challenge-2"))
      .toMatchObject({ status: "issued" });
    await authStore.close();
  }, 30_000);

  it("keeps the subject session cap under concurrent consume", async () => {
    const authStore = store({
      ownsPool: false,
      policy: {
        maxActiveSessionsPerSubject: 1,
        sessionCapStrategy: "deny",
      },
    });
    await authStore.issueChallenge(challenge(1));
    await authStore.issueChallenge(challenge(2));

    const outcomes = await Promise.all([
      authStore.consumeChallengeAndCreateSession({
        challengeId: "postgres-wallet-challenge-1",
        expectedChallengeVersion: "campaign-os-wallet-auth/v1",
        session: session(1),
        traceId: "trace-postgres-cap-1",
      }),
      authStore.consumeChallengeAndCreateSession({
        challengeId: "postgres-wallet-challenge-2",
        expectedChallengeVersion: "campaign-os-wallet-auth/v1",
        session: session(2),
        traceId: "trace-postgres-cap-2",
      }),
    ]);

    expect(outcomes.filter((outcome) => outcome.status === "created")).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome.status === "conflict")).toHaveLength(1);
    expect((await requiredPool().query(
      "SELECT count(*)::integer AS count FROM campaign_os.wallet_sessions WHERE status = 'active'",
    )).rows).toEqual([{ count: 1 }]);
    expect((await requiredPool().query(
      "SELECT status, count(*)::integer AS count FROM campaign_os.wallet_auth_challenges GROUP BY status ORDER BY status",
    )).rows).toEqual([
      { count: 1, status: "consumed" },
      { count: 1, status: "issued" },
    ]);
    await authStore.close();
  }, 30_000);

  it("restores across instances, throttles touch, rotates once and shares terminal state", async () => {
    const runtimeA = store({
      ownsPool: false,
      policy: { touchIntervalMs: 60_000 },
    });
    const runtimeB = store({
      ownsPool: false,
      policy: { touchIntervalMs: 60_000 },
    });
    await runtimeA.issueChallenge(challenge());
    await runtimeA.consumeChallengeAndCreateSession({
      challengeId: "postgres-wallet-challenge-1",
      expectedChallengeVersion: "campaign-os-wallet-auth/v1",
      session: session(),
      traceId: "trace-postgres-lifecycle",
    });
    expect(await runtimeB.resolveActiveSession(digest("1"))).toMatchObject({
      id: "postgres-wallet-session-1",
      version: 1,
    });

    const beforeTouch = await requiredPool().query(
      "SELECT updated_at FROM campaign_os.wallet_sessions WHERE id = $1",
      ["postgres-wallet-session-1"],
    );
    const touches = await Promise.all(Array.from({ length: 100 }, () => runtimeB.touchSession({
      credentialDigest: digest("1"),
      now,
      traceId: "trace-postgres-touch",
      version: 1,
    })));
    expect(touches.every((result) => result.status === "throttled")).toBe(true);
    const afterTouch = await requiredPool().query(
      `SELECT absolute_expires_at, idle_expires_at, updated_at
       FROM campaign_os.wallet_sessions WHERE id = $1`,
      ["postgres-wallet-session-1"],
    );
    expect(afterTouch.rows[0]?.updated_at).toEqual(beforeTouch.rows[0]?.updated_at);

    now = new Date(START.getTime() + 61_000);
    expect(await runtimeB.touchSession({
      credentialDigest: digest("1"),
      now,
      traceId: "trace-postgres-touch-cross-interval",
      version: 1,
    })).toEqual({ status: "touched" });
    expect(await runtimeA.touchSession({
      credentialDigest: digest("1"),
      now,
      traceId: "trace-postgres-touch-repeat",
      version: 1,
    })).toEqual({ status: "throttled" });
    const afterCrossIntervalTouch = await requiredPool().query(
      `SELECT absolute_expires_at, idle_expires_at, updated_at
       FROM campaign_os.wallet_sessions WHERE id = $1`,
      ["postgres-wallet-session-1"],
    );
    expect(afterCrossIntervalTouch.rows[0]?.absolute_expires_at)
      .toEqual(afterTouch.rows[0]?.absolute_expires_at);
    expect(afterCrossIntervalTouch.rows[0]?.idle_expires_at)
      .toEqual(new Date(START.getTime() + 31 * 60_000 + 1_000));
    expect(afterCrossIntervalTouch.rows[0]?.updated_at).toEqual(now);

    const rotations = await Promise.all([runtimeA, runtimeB].map((candidate) =>
      candidate.rotateSession({
        credentialDigest: digest("1"),
        nextCredentialDigest: digest("7"),
        nextCsrfTokenDigest: digest("8"),
        traceId: "trace-postgres-rotate",
        version: 1,
      })));
    expect(rotations.filter((result) => result.status === "rotated")).toHaveLength(1);
    expect(await runtimeA.resolveActiveSession(digest("1"))).toBeUndefined();
    expect(await runtimeB.resolveActiveSession(digest("7"))).toMatchObject({ version: 2 });
    expect(await runtimeB.assertActiveAuthorizationFence({
      credentialDigest: digest("7"),
      membershipRevision: "membership-revision-1",
      now,
      sessionId: "postgres-wallet-session-1",
      traceId: "trace-postgres-fence",
      version: 2,
    })).toEqual({ status: "active" });
    expect(await runtimeA.logoutSession({
      credentialDigest: digest("7"),
      traceId: "trace-postgres-logout",
    })).toEqual({ status: "revoked" });
    expect(await runtimeB.resolveActiveSession(digest("7"))).toBeUndefined();
    expect(await runtimeB.logoutSession({
      credentialDigest: digest("7"),
      traceId: "trace-postgres-logout-repeat",
    })).toEqual({ status: "already_terminal" });
    await runtimeA.close();
    await runtimeB.close();
  }, 30_000);

  it("persists request-time expiry before refusing rotation", async () => {
    const authStore = store();
    await authStore.issueChallenge(challenge());
    await authStore.consumeChallengeAndCreateSession({
      challengeId: "postgres-wallet-challenge-1",
      expectedChallengeVersion: "campaign-os-wallet-auth/v1",
      session: session(),
      traceId: "trace-postgres-expiry-create",
    });

    now = new Date(START.getTime() + 31 * 60_000);
    expect(await authStore.rotateSession({
      credentialDigest: digest("1"),
      nextCredentialDigest: digest("7"),
      nextCsrfTokenDigest: digest("8"),
      traceId: "trace-postgres-expiry-rotate",
      version: 1,
    })).toEqual({ status: "not_found" });
    expect((await requiredPool().query(
      `SELECT status, version, revocation_code, revoked_at
       FROM campaign_os.wallet_sessions WHERE id = $1`,
      ["postgres-wallet-session-1"],
    )).rows).toEqual([{
      revocation_code: "SESSION_EXPIRED",
      revoked_at: now,
      status: "expired",
      version: 2,
    }]);
    expect(await authStore.resolveActiveSession(digest("1"))).toBeUndefined();
    await authStore.close();
  });

  it("uses indexed credential, public ID and subject inventory paths", async () => {
    const authStore = store();
    await authStore.issueChallenge(challenge());
    await authStore.consumeChallengeAndCreateSession({
      challengeId: "postgres-wallet-challenge-1",
      expectedChallengeVersion: "campaign-os-wallet-auth/v1",
      session: session(),
      traceId: "trace-postgres-index",
    });
    const subjectKey = walletAuthenticationSubjectKey(session().subject);
    const client = await requiredPool().connect();
    try {
      await client.query("SET enable_seqscan = off");
      const plans = [
        await client.query(
          "EXPLAIN (FORMAT JSON) SELECT id FROM campaign_os.wallet_sessions WHERE credential_digest = $1",
          [digest("1")],
        ),
        await client.query(
          "EXPLAIN (FORMAT JSON) SELECT id FROM campaign_os.wallet_sessions WHERE id = $1",
          ["postgres-wallet-session-1"],
        ),
        await client.query(
          "EXPLAIN (FORMAT JSON) SELECT id FROM campaign_os.wallet_sessions WHERE subject_key = $1 AND status = 'active' ORDER BY issued_at, id",
          [subjectKey],
        ),
      ];
      const encoded = JSON.stringify(plans.map((result) => result.rows));
      expect(encoded).toContain("wallet_sessions_credential_digest_key");
      expect(encoded).toContain("wallet_sessions_pkey");
      expect(encoded).toContain("wallet_sessions_subject_inventory_idx");
    } finally {
      client.release();
    }
    await authStore.close();
  });
});
