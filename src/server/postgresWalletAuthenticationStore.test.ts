// @vitest-environment node

import { createHash, randomUUID } from "node:crypto";
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
  type PostgresWalletAuthenticationQueryResult,
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
const capabilityDigest = (values: readonly string[]): string => createHash("sha256")
  .update(["campaign-os-wallet-auth-capabilities/v1", ...[...values].sort()].join("\n"), "utf8")
  .digest("hex");

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

const authorizationFence = (
  overrides: Partial<Readonly<{
    capabilityDigest: string;
    membershipRevision: string;
    sessionId: string;
    subjectKey: string;
    version: number;
  }>> = {},
) => ({
  capabilityDigest: capabilityDigest(session().capabilities),
  membershipRevision: session().membershipRevision,
  sessionId: session().id,
  subjectKey: walletAuthenticationSubjectKey(session().subject),
  version: session().version,
  ...overrides,
});

const atomicFinalWriteRow = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  absolute_expires_at: session().absoluteExpiresAt,
  capabilities: session().capabilities,
  credential_digest: session().credentialDigest,
  id: session().id,
  idle_expires_at: session().idleExpiresAt,
  membership_revision: session().membershipRevision,
  status: session().status,
  subject_key: walletAuthenticationSubjectKey(session().subject),
  version: session().version,
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

  it("exposes a transaction-bound atomic final-write port and commits after the callback", async () => {
    const events: string[] = [];
    const client: PostgresWalletAuthenticationClient = {
      query: vi.fn(async (text) => {
        if (text.includes("FROM campaign_os.wallet_sessions")) {
          events.push("SELECT_FOR_UPDATE");
          return { rows: [atomicFinalWriteRow()] };
        }
        events.push(text);
        return { rows: [] };
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
    const write = vi.fn(async () => {
      events.push("WRITE");
      return "protected-write-result";
    });

    expect(authStore.atomicFinalWritePort.kind).toBe("wallet_auth_atomic_final_write");
    await expect(authStore.atomicFinalWritePort.commitIfCurrent({
      credentialDigest: session().credentialDigest,
      fence: authorizationFence(),
      now: new Date(START),
      signal: new AbortController().signal,
      traceId: "trace-postgres-atomic-commit",
      write,
    })).resolves.toEqual({
      status: "committed",
      value: "protected-write-result",
    });

    expect(events).toEqual(["BEGIN", "SELECT_FOR_UPDATE", "WRITE", "COMMIT"]);
    expect(client.query).toHaveBeenCalledWith(
      expect.stringMatching(/SELECT[\s\S]+credential_digest[\s\S]+subject_key[\s\S]+FOR UPDATE/),
      [session().credentialDigest],
    );
    expect(write).toHaveBeenCalledOnce();
    expect(client.release).toHaveBeenCalledOnce();
    await authStore.close();
  });

  it.each([
    ["missing row", undefined],
    ["credential mismatch", atomicFinalWriteRow({ credential_digest: digest("9") })],
    ["session mismatch", atomicFinalWriteRow({ id: "postgres-wallet-session-other" })],
    ["version mismatch", atomicFinalWriteRow({ version: 2 })],
    ["membership mismatch", atomicFinalWriteRow({ membership_revision: "membership-revision-2" })],
    ["subject mismatch", atomicFinalWriteRow({ subject_key: digest("8") })],
    ["capability mismatch", atomicFinalWriteRow({ capabilities: ["campaign:read"] })],
    ["inactive session", atomicFinalWriteRow({ status: "revoked" })],
    ["idle expiry", atomicFinalWriteRow({ idle_expires_at: START.toISOString() })],
    ["absolute expiry", atomicFinalWriteRow({ absolute_expires_at: START.toISOString() })],
  ])("returns stale without invoking the callback for %s", async (_label, row) => {
    const client: PostgresWalletAuthenticationClient = {
      query: vi.fn(async (text) => ({
        rows: text.includes("FROM campaign_os.wallet_sessions") && row ? [row] : [],
      })),
      release: vi.fn(),
    };
    const authStore = createPostgresWalletAuthenticationStore({
      clock: { now: () => new Date(START) },
      ownsPool: false,
      pool: {
        connect: vi.fn(async () => client),
        end: vi.fn(async () => undefined),
        query: vi.fn(async () => ({ rows: [] })),
      },
    });
    const write = vi.fn();

    await expect(authStore.atomicFinalWritePort.commitIfCurrent({
      credentialDigest: session().credentialDigest,
      fence: authorizationFence(),
      now: new Date(START),
      signal: new AbortController().signal,
      traceId: "trace-postgres-atomic-stale",
      write,
    })).resolves.toEqual({ status: "stale" });
    expect(write).not.toHaveBeenCalled();
    expect(client.query).toHaveBeenLastCalledWith("COMMIT", []);
    await authStore.close();
  });

  it("does not acquire a connection or invoke the callback for a pre-aborted commit", async () => {
    const pool: PostgresWalletAuthenticationPool = {
      connect: vi.fn(),
      end: vi.fn(async () => undefined),
      query: vi.fn(async () => ({ rows: [] })),
    };
    const authStore = createPostgresWalletAuthenticationStore({
      clock: { now: () => new Date(START) },
      ownsPool: false,
      pool,
    });
    const controller = new AbortController();
    controller.abort();
    const write = vi.fn();

    await expect(authStore.atomicFinalWritePort.commitIfCurrent({
      credentialDigest: session().credentialDigest,
      fence: authorizationFence(),
      now: new Date(START),
      signal: controller.signal,
      traceId: "trace-postgres-atomic-pre-abort",
      write,
    })).resolves.toEqual({ status: "stale" });
    expect(pool.connect).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
    await authStore.close();
  });

  it("rechecks abort after the row lock is granted and invokes the callback zero times", async () => {
    let releaseRowLock: (row: PostgresWalletAuthenticationQueryResult) => void = () => undefined;
    const rowLock = new Promise<PostgresWalletAuthenticationQueryResult>((resolve) => {
      releaseRowLock = resolve;
    });
    const client: PostgresWalletAuthenticationClient = {
      query: vi.fn(async (text) => text.includes("FROM campaign_os.wallet_sessions")
        ? rowLock
        : { rows: [] }),
      release: vi.fn(),
    };
    const authStore = createPostgresWalletAuthenticationStore({
      clock: { now: () => new Date(START) },
      ownsPool: false,
      pool: {
        connect: vi.fn(async () => client),
        end: vi.fn(async () => undefined),
        query: vi.fn(async () => ({ rows: [] })),
      },
    });
    const controller = new AbortController();
    const write = vi.fn();
    const committing = authStore.atomicFinalWritePort.commitIfCurrent({
      credentialDigest: session().credentialDigest,
      fence: authorizationFence(),
      now: new Date(START),
      signal: controller.signal,
      traceId: "trace-postgres-atomic-wait-abort",
      write,
    });
    await vi.waitFor(() => expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining("FOR UPDATE"),
      [session().credentialDigest],
    ));

    controller.abort();
    releaseRowLock({ rows: [atomicFinalWriteRow()] });

    await expect(committing).resolves.toEqual({ status: "stale" });
    expect(write).not.toHaveBeenCalled();
    await authStore.close();
  });

  it("uses a fresh post-lock clock when the lock wait crosses session expiry", async () => {
    let storeNow = new Date(START);
    let releaseRowLock: (row: PostgresWalletAuthenticationQueryResult) => void = () => undefined;
    const rowLock = new Promise<PostgresWalletAuthenticationQueryResult>((resolve) => {
      releaseRowLock = resolve;
    });
    const client: PostgresWalletAuthenticationClient = {
      query: vi.fn(async (text) => text.includes("FROM campaign_os.wallet_sessions")
        ? rowLock
        : { rows: [] }),
      release: vi.fn(),
    };
    const authStore = createPostgresWalletAuthenticationStore({
      clock: { now: () => new Date(storeNow) },
      ownsPool: false,
      pool: {
        connect: vi.fn(async () => client),
        end: vi.fn(async () => undefined),
        query: vi.fn(async () => ({ rows: [] })),
      },
    });
    const write = vi.fn();
    const committing = authStore.atomicFinalWritePort.commitIfCurrent({
      credentialDigest: session().credentialDigest,
      fence: authorizationFence(),
      now: new Date(START.getTime() - 60_000),
      signal: new AbortController().signal,
      traceId: "trace-postgres-atomic-lock-crosses-expiry",
      write,
    });
    await vi.waitFor(() => expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining("FOR UPDATE"),
      [session().credentialDigest],
    ));

    storeNow = new Date(START.getTime() + 1_001);
    releaseRowLock({
      rows: [atomicFinalWriteRow({
        idle_expires_at: new Date(START.getTime() + 1_000).toISOString(),
      })],
    });

    await expect(committing).resolves.toEqual({ status: "stale" });
    expect(write).not.toHaveBeenCalled();
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining("status = 'expired'"),
      [
        session().id,
        storeNow.toISOString(),
        "trace-postgres-atomic-lock-crosses-expiry",
        session().version,
      ],
    );
    await authStore.close();
  });

  it.each([
    ["target", session(2).id],
    ["self", session().id],
  ])("atomically executes a nested %s revoke on the existing transaction", async (_case, targetId) => {
    const events: string[] = [];
    const client: PostgresWalletAuthenticationClient = {
      query: vi.fn(async (text, values = []) => {
        if (text === "BEGIN" || text === "COMMIT" || text === "ROLLBACK") {
          events.push(text);
          return { rows: [] };
        }
        if (text.includes("WHERE credential_digest = $1")) {
          events.push("ACTOR_LOCK");
          return { rows: [atomicFinalWriteRow()] };
        }
        if (text.includes("WHERE id = $1 FOR UPDATE")) {
          events.push("TARGET_LOCK");
          return {
            rows: [{
              absolute_expires_at: session().absoluteExpiresAt,
              id: values[0],
              idle_expires_at: session().idleExpiresAt,
              status: "active",
            }],
          };
        }
        if (text.includes("status = 'revoked'")) {
          events.push("TARGET_UPDATE");
        }
        return { rows: [] };
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

    await expect(authStore.atomicFinalWritePort.commitIfCurrent({
      credentialDigest: session().credentialDigest,
      fence: authorizationFence(),
      now: new Date(START),
      signal: new AbortController().signal,
      traceId: `trace-postgres-atomic-nested-${_case}-revoke`,
      write: () => authStore.revokeSession({
        reasonCode: "ADMIN_REVOKE",
        sessionId: targetId,
        traceId: `trace-postgres-atomic-nested-${_case}-revoke-target`,
      }),
    })).resolves.toEqual({
      status: "committed",
      value: { status: "revoked" },
    });
    expect(pool.connect).toHaveBeenCalledOnce();
    expect(events).toEqual([
      "BEGIN",
      "ACTOR_LOCK",
      "TARGET_LOCK",
      "TARGET_UPDATE",
      "COMMIT",
    ]);
    await authStore.close();
  });

  it("rolls back when callback code swallows a nested revoke failure", async () => {
    const client: PostgresWalletAuthenticationClient = {
      query: vi.fn(async (text) => {
        if (text.includes("WHERE credential_digest = $1")) {
          return { rows: [atomicFinalWriteRow()] };
        }
        if (text.includes("WHERE id = $1 FOR UPDATE")) {
          throw Object.assign(new Error("driver detail must remain private"), { code: "40P01" });
        }
        return { rows: [] };
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

    const committing = authStore.atomicFinalWritePort.commitIfCurrent({
      credentialDigest: session().credentialDigest,
      fence: authorizationFence(),
      now: new Date(START),
      signal: new AbortController().signal,
      traceId: "trace-postgres-atomic-nested-failure",
      write: async () => {
        try {
          await authStore.revokeSession({
            reasonCode: "ADMIN_REVOKE",
            sessionId: session(2).id,
            traceId: "trace-postgres-atomic-nested-failure-target",
          });
        } catch {
          // The transaction scope retains the safe failure even when callback code swallows it.
        }
        return "must-not-commit";
      },
    });

    await expect(committing).rejects.toMatchObject({
      code: "WALLET_AUTH_STORE_UNAVAILABLE",
      operation: "revokeSession",
      retryable: true,
    });
    expect(pool.connect).toHaveBeenCalledOnce();
    expect(client.query).toHaveBeenCalledWith("ROLLBACK");
    expect(client.query).not.toHaveBeenCalledWith("COMMIT", []);
    await authStore.close();
  });

  it("fails closed when a callback swallows a non-revoke auth-store reentry", async () => {
    const client: PostgresWalletAuthenticationClient = {
      query: vi.fn(async (text) => ({
        rows: text.includes("WHERE credential_digest = $1")
          ? [atomicFinalWriteRow()]
          : [],
      })),
      release: vi.fn(),
    };
    const authStore = createPostgresWalletAuthenticationStore({
      clock: { now: () => new Date(START) },
      ownsPool: false,
      pool: {
        connect: vi.fn(async () => client),
        end: vi.fn(async () => undefined),
        query: vi.fn(async () => ({ rows: [] })),
      },
    });

    const committing = authStore.atomicFinalWritePort.commitIfCurrent({
      credentialDigest: session().credentialDigest,
      fence: authorizationFence(),
      now: new Date(START),
      signal: new AbortController().signal,
      traceId: "trace-postgres-atomic-non-revoke-reentry",
      write: async () => {
        try {
          await authStore.rotateSession({
            credentialDigest: session().credentialDigest,
            nextCredentialDigest: digest("7"),
            nextCsrfTokenDigest: digest("8"),
            traceId: "trace-postgres-atomic-non-revoke-reentry-rotate",
            version: session().version,
          });
        } catch {
          // The outer transaction must retain the re-entry violation.
        }
        return "must-not-commit";
      },
    });

    await expect(committing).rejects.toMatchObject({
      code: "WALLET_AUTH_STORE_CONFLICT",
      field: "finalWriteCallback",
      operation: "assertFence",
    });
    expect(client.query).toHaveBeenCalledWith("ROLLBACK");
    expect(client.query).not.toHaveBeenCalledWith("COMMIT", []);
    await authStore.close();
  });

  it("fails closed when a callback calls revokeSession on a different store", async () => {
    const actorClient: PostgresWalletAuthenticationClient = {
      query: vi.fn(async (text) => ({
        rows: text.includes("WHERE credential_digest = $1")
          ? [atomicFinalWriteRow()]
          : [],
      })),
      release: vi.fn(),
    };
    const actorStore = createPostgresWalletAuthenticationStore({
      clock: { now: () => new Date(START) },
      ownsPool: false,
      pool: {
        connect: vi.fn(async () => actorClient),
        end: vi.fn(async () => undefined),
        query: vi.fn(async () => ({ rows: [] })),
      },
    });
    const otherConnect = vi.fn();
    const otherStore = createPostgresWalletAuthenticationStore({
      clock: { now: () => new Date(START) },
      ownsPool: false,
      pool: {
        connect: otherConnect,
        end: vi.fn(async () => undefined),
        query: vi.fn(async () => ({ rows: [] })),
      },
    });

    const committing = actorStore.atomicFinalWritePort.commitIfCurrent({
      credentialDigest: session().credentialDigest,
      fence: authorizationFence(),
      now: new Date(START),
      signal: new AbortController().signal,
      traceId: "trace-postgres-atomic-other-store-revoke",
      write: async () => {
        try {
          await otherStore.revokeSession({
            reasonCode: "ADMIN_REVOKE",
            sessionId: session(2).id,
            traceId: "trace-postgres-atomic-other-store-revoke-target",
          });
        } catch {
          // Only the store that owns the actor transaction may service nested revoke.
        }
        return "must-not-commit";
      },
    });

    await expect(committing).rejects.toMatchObject({
      code: "WALLET_AUTH_STORE_CONFLICT",
      field: "finalWriteCallback",
    });
    expect(otherConnect).not.toHaveBeenCalled();
    expect(actorClient.query).toHaveBeenCalledWith("ROLLBACK");
    await actorStore.close();
    await otherStore.close();
  });

  it("rolls back a successful nested revoke when the callback subsequently fails", async () => {
    const client: PostgresWalletAuthenticationClient = {
      query: vi.fn(async (text, values = []) => {
        if (text.includes("WHERE credential_digest = $1")) {
          return { rows: [atomicFinalWriteRow()] };
        }
        if (text.includes("WHERE id = $1 FOR UPDATE")) {
          return {
            rows: [{
              absolute_expires_at: session().absoluteExpiresAt,
              id: values[0],
              idle_expires_at: session().idleExpiresAt,
              status: "active",
            }],
          };
        }
        return { rows: [] };
      }),
      release: vi.fn(),
    };
    const authStore = createPostgresWalletAuthenticationStore({
      clock: { now: () => new Date(START) },
      ownsPool: false,
      pool: {
        connect: vi.fn(async () => client),
        end: vi.fn(async () => undefined),
        query: vi.fn(async () => ({ rows: [] })),
      },
    });

    await expect(authStore.atomicFinalWritePort.commitIfCurrent({
      credentialDigest: session().credentialDigest,
      fence: authorizationFence(),
      now: new Date(START),
      signal: new AbortController().signal,
      traceId: "trace-postgres-atomic-callback-failure",
      write: async () => {
        await authStore.revokeSession({
          reasonCode: "ADMIN_REVOKE",
          sessionId: session(2).id,
          traceId: "trace-postgres-atomic-callback-failure-target",
        });
        throw new Error("post-revoke callback failure");
      },
    })).rejects.toThrow("post-revoke callback failure");
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining("status = 'revoked'"),
      expect.any(Array),
    );
    expect(client.query).toHaveBeenCalledWith("ROLLBACK");
    expect(client.query).not.toHaveBeenCalledWith("COMMIT", []);
    await authStore.close();
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

  it("uses one deadline when a forced transaction abort does not settle", async () => {
    let rejectBlockedQuery: (reason?: unknown) => void = () => undefined;
    const blockedQuery = new Promise<never>((_resolve, reject) => {
      rejectBlockedQuery = reject;
    });
    let resolvePoolEnd: () => void = () => undefined;
    const poolEnd = new Promise<void>((resolve) => {
      resolvePoolEnd = resolve;
    });
    const client: PostgresWalletAuthenticationClient = {
      query: vi.fn(async (text) => text.includes("pg_advisory_xact_lock")
        ? blockedQuery
        : { rows: [] }),
      release: vi.fn(),
    };
    const pool: PostgresWalletAuthenticationPool = {
      connect: vi.fn(async () => client),
      end: vi.fn(() => poolEnd),
      query: vi.fn(async () => ({ rows: [] })),
    };
    const authStore = createPostgresWalletAuthenticationStore({
      clock: { now: () => new Date(START) },
      pool,
      shutdownTimeoutMs: 20,
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

    const startedAt = Date.now();
    await expect(authStore.close()).rejects.toMatchObject({
      code: "WALLET_AUTH_STORE_UNAVAILABLE",
      field: "transaction",
      operation: "close",
    });
    expect(Date.now() - startedAt).toBeLessThan(250);
    expect(client.release).toHaveBeenCalledWith(true);
    expect(pool.end).toHaveBeenCalledOnce();

    resolvePoolEnd();
    rejectBlockedQuery(Object.assign(new Error("connection closed"), { code: "57P01" }));
    expect(await operationFailure).toMatchObject({ code: "WALLET_AUTH_STORE_UNAVAILABLE" });
  }, 2_000);

  it("bounds an owned pool close that never settles", async () => {
    let resolvePoolEnd: () => void = () => undefined;
    const poolEnd = new Promise<void>((resolve) => {
      resolvePoolEnd = resolve;
    });
    const pool: PostgresWalletAuthenticationPool = {
      connect: vi.fn(),
      end: vi.fn(() => poolEnd),
      query: vi.fn(async () => ({ rows: [] })),
    };
    const authStore = createPostgresWalletAuthenticationStore({
      clock: { now: () => new Date(START) },
      pool,
      shutdownTimeoutMs: 20,
    });

    const startedAt = Date.now();
    await expect(authStore.close()).rejects.toMatchObject({
      code: "WALLET_AUTH_STORE_UNAVAILABLE",
      field: "pool",
      operation: "close",
    });
    expect(Date.now() - startedAt).toBeLessThan(250);
    expect(pool.end).toHaveBeenCalledOnce();
    resolvePoolEnd();
  }, 2_000);

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
    })).toMatchObject({ status: "terminal" });
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
    })).toMatchObject({ status: "recorded" });
    expect(await authStore.recordChallengeFailureWithPolicy({
      challengeId: "postgres-wallet-challenge-1",
      terminalCode: "INVALID_PROOF",
      traceId: "trace-postgres-rate-limit-plus-one",
    })).toMatchObject({ status: "rate_limited" });

    now = new Date(START.getTime() + 61_000);
    expect(await authStore.recordChallengeFailureWithPolicy({
      challengeId: "postgres-wallet-challenge-2",
      terminalCode: "INVALID_PROOF",
      traceId: "trace-postgres-rate-reset",
    })).toMatchObject({ status: "recorded" });
    const reset = await requiredPool().query(
      `SELECT rate_attempt_count, rate_window_started_at
       FROM campaign_os.wallet_auth_challenges WHERE id = $1`,
      ["postgres-wallet-challenge-2"],
    );
    expect(reset.rows[0]).toMatchObject({
      rate_attempt_count: 1,
      rate_window_started_at: now,
    });
    await authStore.close();
  });

  it("allows N fingerprint attempts and limits N plus one across different subjects", async () => {
    const authStore = store({
      ownsPool: false,
      policy: {
        maxVerificationAttemptsPerChallenge: 10,
        maxVerificationAttemptsPerWindow: 2,
      },
    });
    const fingerprint = digest("f");
    await authStore.issueChallengeWithPolicy({
      challenge: challenge(1),
      clientFingerprintDigest: fingerprint,
      traceId: "trace-postgres-fingerprint-rate-1",
    });
    await authStore.issueChallengeWithPolicy({
      challenge: challenge(2, { requestedWalletAddress: "ELF_other_postgres_participant" }),
      clientFingerprintDigest: fingerprint,
      traceId: "trace-postgres-fingerprint-rate-2",
    });

    expect(await authStore.recordChallengeFailureWithPolicy({
      challengeId: "postgres-wallet-challenge-1",
      terminalCode: "INVALID_PROOF",
      traceId: "trace-postgres-fingerprint-attempt-1",
    })).toMatchObject({ status: "recorded" });
    expect(await authStore.recordChallengeFailureWithPolicy({
      challengeId: "postgres-wallet-challenge-2",
      terminalCode: "INVALID_PROOF",
      traceId: "trace-postgres-fingerprint-attempt-2",
    })).toMatchObject({ status: "recorded" });
    expect(await authStore.recordChallengeFailureWithPolicy({
      challengeId: "postgres-wallet-challenge-2",
      terminalCode: "INVALID_PROOF",
      traceId: "trace-postgres-fingerprint-attempt-3",
    })).toMatchObject({ status: "rate_limited" });
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

  it("linearizes subject revoke after an already-waiting consume across two instances", async () => {
    const setupStore = store({ ownsPool: false });
    await setupStore.issueChallenge(challenge());
    await setupStore.close();
    const subjectKey = walletAuthenticationSubjectKey(session().subject);
    const blocker = await requiredPool().connect();
    let blockerOpen = false;

    const lockSignal = () => {
      let notified = false;
      let notify: () => void = () => undefined;
      const requested = new Promise<void>((resolve) => {
        notify = () => {
          if (!notified) {
            notified = true;
            resolve();
          }
        };
      });
      return { notify, requested };
    };
    const consumeSignal = lockSignal();
    const revokeSignal = lockSignal();
    const instrumentPool = (notify: () => void): PostgresWalletAuthenticationPool => ({
      connect: async () => {
        const client = await requiredPool().connect();
        return {
          query: async (text: string, values: unknown[] = []) => {
            const resultPromise = client.query(text, values);
            if (text.includes("pg_advisory_xact_lock") && values[0] === subjectKey) {
              notify();
            }
            const result = await resultPromise;
            return { rows: result.rows };
          },
          release: (destroy?: boolean) => client.release(destroy),
        };
      },
      end: async () => undefined,
      query: async (text, values = []) => {
        const result = await requiredPool().query(text, values);
        return { rows: result.rows };
      },
    });
    const consumeStore = createPostgresWalletAuthenticationStore({
      clock: { now: () => new Date(now) },
      ownsPool: false,
      pool: instrumentPool(consumeSignal.notify),
    });
    const revokeStore = createPostgresWalletAuthenticationStore({
      clock: { now: () => new Date(now) },
      ownsPool: false,
      pool: instrumentPool(revokeSignal.notify),
    });

    try {
      await blocker.query("BEGIN");
      blockerOpen = true;
      await blocker.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))",
        [subjectKey],
      );
      const consuming = consumeStore.consumeChallengeAndCreateSession({
        challengeId: "postgres-wallet-challenge-1",
        expectedChallengeVersion: "campaign-os-wallet-auth/v1",
        session: session(),
        traceId: "trace-postgres-revoke-race-consume",
      });
      await consumeSignal.requested;
      const revoking = revokeStore.revokeSubjectSessions({
        reasonCode: "MEMBERSHIP_REVOKED",
        subjectKey,
        traceId: "trace-postgres-revoke-race-revoke",
      });
      await revokeSignal.requested;
      await blocker.query("COMMIT");
      blockerOpen = false;

      await expect(consuming).resolves.toEqual({ status: "created" });
      await expect(revoking).resolves.toBe(1);
      expect((await requiredPool().query(
        "SELECT status FROM campaign_os.wallet_sessions WHERE id = $1",
        ["postgres-wallet-session-1"],
      )).rows).toEqual([{ status: "revoked" }]);
    } finally {
      if (blockerOpen) {
        await blocker.query("ROLLBACK");
      }
      blocker.release();
      await consumeStore.close();
      await revokeStore.close();
    }
  }, 30_000);

  it.each(["revoke", "rotate"] as const)(
    "holds the session row lock through the final write before %s can proceed",
    async (mutation) => {
      const atomicStore = store({ ownsPool: false });
      await atomicStore.issueChallenge(challenge());
      await atomicStore.consumeChallengeAndCreateSession({
        challengeId: "postgres-wallet-challenge-1",
        expectedChallengeVersion: "campaign-os-wallet-auth/v1",
        session: session(),
        traceId: `trace-postgres-atomic-${mutation}-create`,
      });

      let notifyMutationLock: () => void = () => undefined;
      const mutationReachedLock = new Promise<void>((resolve) => {
        notifyMutationLock = resolve;
      });
      const mutationPool: PostgresWalletAuthenticationPool = {
        connect: async () => {
          const client = await requiredPool().connect();
          return {
            query: async (text: string, values: unknown[] = []) => {
              const resultPromise = client.query(text, values);
              if (
                text.includes("FROM campaign_os.wallet_sessions")
                && text.includes("FOR UPDATE")
              ) {
                notifyMutationLock();
              }
              const result = await resultPromise;
              return { rows: result.rows };
            },
            release: (destroy?: boolean) => client.release(destroy),
          };
        },
        end: async () => undefined,
        query: async (text, values = []) => {
          const result = await requiredPool().query(text, values);
          return { rows: result.rows };
        },
      };
      const mutationStore = createPostgresWalletAuthenticationStore({
        clock: { now: () => new Date(now) },
        ownsPool: false,
        pool: mutationPool,
      });
      let notifyWriteEntered: () => void = () => undefined;
      const writeEntered = new Promise<void>((resolve) => {
        notifyWriteEntered = resolve;
      });
      let releaseWrite: () => void = () => undefined;
      const writeGate = new Promise<void>((resolve) => {
        releaseWrite = resolve;
      });

      try {
        const committing = atomicStore.atomicFinalWritePort.commitIfCurrent({
          credentialDigest: session().credentialDigest,
          fence: authorizationFence(),
          now: new Date(now),
          signal: new AbortController().signal,
          traceId: `trace-postgres-atomic-${mutation}-commit`,
          write: async () => {
            notifyWriteEntered();
            await writeGate;
            return "write-committed-before-session-mutation";
          },
        });
        await writeEntered;

        const mutating = mutation === "revoke"
          ? mutationStore.revokeSession({
            reasonCode: "ADMIN_REVOKE",
            sessionId: session().id,
            traceId: "trace-postgres-atomic-concurrent-revoke",
          })
          : mutationStore.rotateSession({
            credentialDigest: session().credentialDigest,
            nextCredentialDigest: digest("7"),
            nextCsrfTokenDigest: digest("8"),
            traceId: "trace-postgres-atomic-concurrent-rotate",
            version: session().version,
          });
        let mutationSettled = false;
        void mutating.then(
          () => { mutationSettled = true; },
          () => { mutationSettled = true; },
        );
        await mutationReachedLock;
        await Promise.resolve();
        expect(mutationSettled).toBe(false);

        releaseWrite();
        await expect(committing).resolves.toEqual({
          status: "committed",
          value: "write-committed-before-session-mutation",
        });
        await expect(mutating).resolves.toMatchObject({
          status: mutation === "revoke" ? "revoked" : "rotated",
        });
      } finally {
        releaseWrite();
        await atomicStore.close();
        await mutationStore.close();
      }
    },
    30_000,
  );

  it.each(["revoke", "rotate"] as const)(
    "returns stale with zero writes when %s commits first",
    async (mutation) => {
      const authStore = store({ ownsPool: false });
      try {
        await authStore.issueChallenge(challenge());
        await authStore.consumeChallengeAndCreateSession({
          challengeId: "postgres-wallet-challenge-1",
          expectedChallengeVersion: "campaign-os-wallet-auth/v1",
          session: session(),
          traceId: `trace-postgres-atomic-${mutation}-first-create`,
        });
        if (mutation === "revoke") {
          await expect(authStore.revokeSession({
            reasonCode: "ADMIN_REVOKE",
            sessionId: session().id,
            traceId: "trace-postgres-atomic-revoke-first",
          })).resolves.toEqual({ status: "revoked" });
        } else {
          await expect(authStore.rotateSession({
            credentialDigest: session().credentialDigest,
            nextCredentialDigest: digest("7"),
            nextCsrfTokenDigest: digest("8"),
            traceId: "trace-postgres-atomic-rotate-first",
            version: session().version,
          })).resolves.toEqual({ status: "rotated" });
        }
        const write = vi.fn();

        await expect(authStore.atomicFinalWritePort.commitIfCurrent({
          credentialDigest: session().credentialDigest,
          fence: authorizationFence(),
          now: new Date(now),
          signal: new AbortController().signal,
          traceId: `trace-postgres-atomic-${mutation}-first-fence`,
          write,
        })).resolves.toEqual({ status: "stale" });
        expect(write).not.toHaveBeenCalled();
      } finally {
        await authStore.close();
      }
    },
    30_000,
  );

  it("rolls back one transaction safely when two admins cross-revoke", async () => {
    const setupStore = store({ ownsPool: false });
    const adminAStore = store({ ownsPool: false });
    const adminBStore = store({ ownsPool: false });
    try {
      await setupStore.issueChallenge(challenge(1));
      await setupStore.issueChallenge(challenge(2));
      await setupStore.consumeChallengeAndCreateSession({
        challengeId: session(1).challengeId,
        expectedChallengeVersion: "campaign-os-wallet-auth/v1",
        session: session(1),
        traceId: "trace-postgres-cross-revoke-create-a",
      });
      await setupStore.consumeChallengeAndCreateSession({
        challengeId: session(2).challengeId,
        expectedChallengeVersion: "campaign-os-wallet-auth/v1",
        session: session(2),
        traceId: "trace-postgres-cross-revoke-create-b",
      });

      let enteredCount = 0;
      let notifyBothEntered: () => void = () => undefined;
      const bothCallbacksEntered = new Promise<void>((resolve) => {
        notifyBothEntered = resolve;
      });
      let releaseNestedRevokes: () => void = () => undefined;
      const nestedRevokeGate = new Promise<void>((resolve) => {
        releaseNestedRevokes = resolve;
      });
      const crossRevoke = (
        actorStore: ReturnType<typeof store>,
        actorSession: DurableWalletSessionRecord,
        targetSessionId: string,
        actorLabel: "a" | "b",
      ) => actorStore.atomicFinalWritePort.commitIfCurrent({
        credentialDigest: actorSession.credentialDigest,
        fence: authorizationFence({ sessionId: actorSession.id }),
        now: new Date(now),
        signal: new AbortController().signal,
        traceId: `trace-postgres-cross-revoke-${actorLabel}`,
        write: async () => {
          enteredCount += 1;
          if (enteredCount === 2) {
            notifyBothEntered();
          }
          await nestedRevokeGate;
          return actorStore.revokeSession({
            reasonCode: "ADMIN_REVOKE",
            sessionId: targetSessionId,
            traceId: `trace-postgres-cross-revoke-${actorLabel}-target`,
          });
        },
      });

      const revokingAFromB = crossRevoke(
        adminBStore,
        session(2),
        session(1).id,
        "b",
      );
      const revokingBFromA = crossRevoke(
        adminAStore,
        session(1),
        session(2).id,
        "a",
      );
      await bothCallbacksEntered;
      releaseNestedRevokes();
      const outcomes = await Promise.allSettled([revokingAFromB, revokingBFromA]);
      const committed = outcomes.filter((outcome) => outcome.status === "fulfilled");
      const rolledBack = outcomes.filter((outcome) => outcome.status === "rejected");

      expect(committed).toHaveLength(1);
      expect(committed[0]).toMatchObject({
        value: {
          status: "committed",
          value: { status: "revoked" },
        },
      });
      expect(rolledBack).toHaveLength(1);
      expect(rolledBack[0]).toMatchObject({
        reason: {
          code: "WALLET_AUTH_STORE_UNAVAILABLE",
          operation: "revokeSession",
          retryable: true,
        },
      });
      const persisted = await requiredPool().query(
        `SELECT id, status FROM campaign_os.wallet_sessions
         WHERE id = ANY($1::text[]) ORDER BY id`,
        [[session(1).id, session(2).id]],
      );
      expect(persisted.rows.map((row) => row.status).sort()).toEqual(["active", "revoked"]);
    } finally {
      await setupStore.close();
      await adminAStore.close();
      await adminBStore.close();
    }
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
      credentialDigest: digest("1"),
      traceId: "trace-postgres-logout-stale-credential",
    })).toEqual({ status: "already_terminal" });
    expect(await runtimeA.logoutSession({
      credentialDigest: digest("7"),
      traceId: "trace-postgres-logout",
    })).toEqual({ status: "revoked" });
    expect(await runtimeB.resolveActiveSession(digest("7"))).toBeUndefined();
    expect(await runtimeB.logoutSession({
      credentialDigest: digest("7"),
      traceId: "trace-postgres-logout-repeat",
    })).toEqual({ status: "already_terminal" });
    expect(await runtimeB.logoutSession({
      credentialDigest: digest("9"),
      traceId: "trace-postgres-logout-unknown",
    })).toEqual({ status: "already_terminal" });
    expect(await runtimeA.revokeSession({
      reasonCode: "ADMIN_REVOKE",
      sessionId: "postgres-wallet-session-1",
      traceId: "trace-postgres-revoke-terminal",
    })).toEqual({ status: "already_terminal" });
    expect(await runtimeB.revokeSession({
      reasonCode: "ADMIN_REVOKE",
      sessionId: "postgres-wallet-session-missing",
      traceId: "trace-postgres-revoke-unknown",
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
    expect(await authStore.logoutSession({
      credentialDigest: digest("1"),
      traceId: "trace-postgres-expiry-logout",
    })).toEqual({ status: "already_terminal" });
    expect(await authStore.revokeSession({
      reasonCode: "ADMIN_REVOKE",
      sessionId: "postgres-wallet-session-1",
      traceId: "trace-postgres-expiry-revoke",
    })).toEqual({ status: "already_terminal" });
    await authStore.close();
  });

  it("persists expiry before direct logout and public revoke without a prior read", async () => {
    const authStore = store();
    await authStore.issueChallenge(challenge(1));
    await authStore.issueChallenge(challenge(2));
    await authStore.consumeChallengeAndCreateSession({
      challengeId: "postgres-wallet-challenge-1",
      expectedChallengeVersion: "campaign-os-wallet-auth/v1",
      session: session(1),
      traceId: "trace-postgres-direct-expiry-create-1",
    });
    await authStore.consumeChallengeAndCreateSession({
      challengeId: "postgres-wallet-challenge-2",
      expectedChallengeVersion: "campaign-os-wallet-auth/v1",
      session: session(2),
      traceId: "trace-postgres-direct-expiry-create-2",
    });
    now = new Date(START.getTime() + 31 * 60_000);

    expect(await authStore.logoutSession({
      credentialDigest: digest("1"),
      traceId: "trace-postgres-direct-expiry-logout",
    })).toEqual({ status: "already_terminal" });
    expect(await authStore.revokeSession({
      reasonCode: "ADMIN_REVOKE",
      sessionId: "postgres-wallet-session-2",
      traceId: "trace-postgres-direct-expiry-revoke",
    })).toEqual({ status: "already_terminal" });
    expect((await requiredPool().query(
      `SELECT id, status, version, revocation_code, revoked_at
       FROM campaign_os.wallet_sessions ORDER BY id`,
    )).rows).toEqual([
      {
        id: "postgres-wallet-session-1",
        revocation_code: "SESSION_EXPIRED",
        revoked_at: now,
        status: "expired",
        version: 2,
      },
      {
        id: "postgres-wallet-session-2",
        revocation_code: "SESSION_EXPIRED",
        revoked_at: now,
        status: "expired",
        version: 2,
      },
    ]);
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
