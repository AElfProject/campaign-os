// @vitest-environment node

import { randomBytes, randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer as createNetServer, type AddressInfo } from "node:net";
import { resolve } from "node:path";
import AElf from "aelf-sdk";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createCampaignOsApiRuntime,
  type CampaignOsApiRuntime,
  type TaskTemplateCatalogPoolFactory,
} from "./apiRuntime";
import { resolveCampaignOsCampaignDbConfig } from "./config";
import {
  loadPostgresMigrations,
  runPostgresMigrations,
  type PostgresMigrationPool,
} from "./postgresMigration";
import type {
  PostgresTaskTemplateCatalogClient,
  PostgresTaskTemplateCatalogQueryInput,
  PostgresTaskTemplateCatalogQueryResult,
} from "./postgresTaskTemplateCatalogStore";
import {
  startCampaignOsApiServer,
  type CampaignOsApiServerHandle,
} from "./server";
import {
  createDefaultWalletAuthenticationServerComposition,
  type WalletAuthenticationServerComposition,
} from "./walletAuthenticationServerComposition";

const TEST_DATABASE_URL = process.env.CAMPAIGN_OS_TEST_DATABASE_URL?.trim();
const REQUIRE_POSTGRES_TESTS =
  process.env.CAMPAIGN_OS_REQUIRE_POSTGRES_TESTS?.trim() === "1";

if (REQUIRE_POSTGRES_TESTS && !TEST_DATABASE_URL) {
  throw new Error(
    "Task template catalog runtime acceptance requires CAMPAIGN_OS_TEST_DATABASE_URL.",
  );
}

const postgresSuite = TEST_DATABASE_URL ? describe : describe.skip;
const TEST_ORIGIN = "http://127.0.0.1:5173";

type EphemeralSigner = ReturnType<typeof AElf.wallet.ellipticEc.genKeyPair>;

interface ApiEnvelope<TData> {
  readonly data?: TData;
  readonly error?: Readonly<{ code?: string }>;
  readonly ok: boolean;
  readonly traceId?: string;
}

interface HttpResult<TData> {
  readonly body: ApiEnvelope<TData>;
  readonly response: Response;
  readonly status: number;
}

interface WalletChallengeData {
  readonly adapterId: string;
  readonly challengeId: string;
  readonly chainId: string;
  readonly expiresAt: string;
  readonly message: string;
  readonly network: string;
  readonly version: string;
  readonly walletAddress: string;
}

interface WalletSessionData {
  readonly csrfToken: string;
  readonly session: Readonly<{
    accountType: "AA" | "EOA";
    capabilities: readonly string[];
    roles: readonly string[];
    sessionId: string;
    status: "active";
    walletAddress: string;
  }>;
}

interface CampaignCreateData {
  readonly payload: Readonly<{
    id: string;
    ownerAddress: string;
  }>;
}

interface CatalogTemplateProjection {
  readonly adoptionMode: string;
  readonly checksum: string;
  readonly evidenceRule: Readonly<Record<string, unknown>>;
  readonly points: Readonly<{
    default: number;
    maximum: number;
    minimum: number;
  }>;
  readonly requiredPolicy: Readonly<{
    default: boolean;
    overrideAllowed: boolean;
  }>;
  readonly status: string;
  readonly templateCode: string;
  readonly verificationType: string;
  readonly version: number;
  readonly walletCompatibility: string;
}

interface CatalogListData {
  readonly items: readonly CatalogTemplateProjection[];
  readonly page: Readonly<{ nextCursor: string | null }>;
  readonly totalActive: number;
}

interface CatalogAdoptionData {
  readonly campaignId: string;
  readonly replayed: boolean;
  readonly taskId: string;
  readonly templateChecksum: string;
  readonly templateCode: string;
  readonly templateVersion: number;
}

interface CampaignDetailData {
  readonly payload: Readonly<{
    item: Readonly<{ id: string }>;
    tasks: readonly Readonly<{
      points: number;
      required: boolean;
      taskId: string;
      title: Readonly<Record<string, string>>;
      verificationType: string;
    }>[];
  }>;
}

interface DurableTaskSnapshotRow {
  readonly campaign_id: string;
  readonly evidence_rule_bytes: string;
  readonly id: string;
  readonly points: number;
  readonly required: boolean;
  readonly snapshot_bytes: string;
  readonly template_checksum: string;
  readonly template_code: string;
  readonly template_version: number;
  readonly verification_type: string;
  readonly wallet_compatibility: string;
}

interface NegativeAdoptionEvidence {
  readonly after: number;
  readonly before: number;
  readonly code: string;
  readonly label: string;
  readonly status: number;
}

interface IssuedLiveSession {
  readonly address: string;
  readonly adoptionHeaders: (
    traceId: string,
    idempotencyKey: string,
  ) => Record<string, string>;
  readonly catalogHeaders: (traceId: string) => Record<string, string>;
  readonly cookieHeader: string;
  readonly credential: string;
  readonly csrfToken: string;
  readonly mutationHeaders: (
    traceId: string,
    overrides?: Readonly<Record<string, string>>,
  ) => Record<string, string>;
  readonly sessionId: string;
}

interface CatalogPoolState {
  readonly checkedOutClients: number;
  readonly created: boolean;
  readonly endCalls: number;
  readonly ended: boolean;
  readonly queryCount: number;
}

interface CatalogPoolTracker {
  readonly factory: TaskTemplateCatalogPoolFactory;
  readonly identity: object;
  state(): CatalogPoolState;
}

interface RuntimeHarness {
  readonly catalogPool: CatalogPoolTracker;
  readonly runtime: CampaignOsApiRuntime;
  readonly server: CampaignOsApiServerHandle;
  stop(): Promise<void>;
  readonly walletAuthentication: WalletAuthenticationServerComposition;
}

interface ChildRuntimeExit {
  readonly code: number | null;
  readonly signal: NodeJS.Signals | null;
}

interface ChildRuntimeHarness {
  readonly child: ChildProcess;
  readonly processId: number;
  readonly url: string;
  stop(): Promise<void>;
}

const EOA_BINDING = Object.freeze({
  accountType: "EOA",
  adapterId: "portkey-discover-eoa",
  chainIds: ["AELF"],
  enabled: true,
  hashStrategyId: "aelf-web-login-discover-v1",
  network: "testnet",
  productionApproved: false,
  proofMethod: "AELF_EOA_RECOVERABLE",
  signatureEncoding: "AELF_RECOVERABLE_HEX",
  walletSource: "PORTKEY_EOA_APP",
});
const STANDARD_SESSION_AUTHORITY = Object.freeze({
  capabilities: Object.freeze([
    "wallet:session_create",
    "campaign:read",
    "task:verify",
    "eligibility:read",
    "user:participate",
    "campaign:write",
    "campaign:ownership_mutation",
    "task:build",
    "export:preview",
  ]),
  roles: Object.freeze(["participant", "project_owner"]),
});
const ADMIN_SESSION_AUTHORITY = Object.freeze({
  capabilities: Object.freeze([
    ...STANDARD_SESSION_AUTHORITY.capabilities,
    "admin:review",
    "risk:review",
  ]),
  roles: Object.freeze([...STANDARD_SESSION_AUTHORITY.roles, "review_operator"]),
});
const TEST_CSRF_SECRET = randomBytes(32).toString("base64url");

const nonceFromMessage = (message: string): string => {
  const nonce = message.split("\n")
    .find((line) => line.startsWith("Nonce: "))
    ?.slice("Nonce: ".length);
  if (!nonce || !/^[A-Za-z0-9_-]{43}$/.test(nonce)) {
    throw new Error("Canonical wallet challenge did not contain a valid nonce.");
  }
  return nonce;
};

const signExactMessage = (message: string, signer: EphemeralSigner): Uint8Array =>
  Uint8Array.from(AElf.wallet.sign(Buffer.from(message, "utf8").toString("hex"), signer));

const executeCatalogQuery = async (
  queryable: Pick<pg.Pool, "query"> | Pick<pg.PoolClient, "query">,
  input: PostgresTaskTemplateCatalogQueryInput,
  values: readonly unknown[] = [],
): Promise<PostgresTaskTemplateCatalogQueryResult> => {
  const result = typeof input === "string"
    ? await queryable.query(input, [...values])
    : await queryable.query({ ...input, values: [...input.values] });

  return { rows: result.rows as Array<Record<string, unknown>> };
};

const createCatalogPoolTracker = (): CatalogPoolTracker => {
  const identity = Object.freeze({});
  let checkedOutClients = 0;
  let created = false;
  let endCalls = 0;
  let ended = false;
  let queryCount = 0;

  const factory: TaskTemplateCatalogPoolFactory = (config) => {
    if (created) {
      throw new Error("Catalog pool factory may create exactly one pool per runtime.");
    }
    created = true;
    const pool = new pg.Pool(config);

    return {
      connect: async (): Promise<PostgresTaskTemplateCatalogClient> => {
        const client = await pool.connect();
        checkedOutClients += 1;
        let released = false;

        return {
          query: async (input, values = []) => {
            queryCount += 1;
            return executeCatalogQuery(client, input, values);
          },
          release: (destroy = false) => {
            if (released) {
              return;
            }
            released = true;
            checkedOutClients -= 1;
            client.release(destroy);
          },
        };
      },
      end: async () => {
        endCalls += 1;
        if (!ended) {
          ended = true;
          await pool.end();
        }
      },
      onError: (listener) => pool.on("error", listener),
      query: async (input, values = []) => {
        queryCount += 1;
        return executeCatalogQuery(pool, input, values);
      },
    };
  };

  return Object.freeze({
    factory,
    identity,
    state: () => Object.freeze({
      checkedOutClients,
      created,
      endCalls,
      ended,
      queryCount,
    }),
  });
};

const isLoopback = (hostname: string): boolean => {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return normalized === "localhost" || normalized === "::1" || normalized.startsWith("127.");
};

const createPool = (databaseUrl: string, maximum: number): pg.Pool => {
  const parsed = new URL(databaseUrl);
  const config = resolveCampaignOsCampaignDbConfig({
    databaseUrl,
    env: {},
    mode: "postgres",
    poolMax: maximum,
    sslMode: isLoopback(parsed.hostname) ? "disable" : "verify-full",
  });
  if (config.mode !== "postgres") {
    throw new Error("Task template catalog runtime acceptance requires PostgreSQL mode.");
  }
  return new pg.Pool(config.pool);
};

const isolatedDatabaseUrl = (baseUrl: string, databaseName: string): string => {
  const parsed = new URL(baseUrl);
  parsed.pathname = `/${databaseName}`;
  parsed.search = "";
  return parsed.toString();
};

const reserveLoopbackPorts = async (count: number): Promise<readonly number[]> => {
  const reservations = await Promise.all(Array.from({ length: count }, () => new Promise<{
    readonly port: number;
    readonly server: ReturnType<typeof createNetServer>;
  }>((resolve, reject) => {
    const server = createNetServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address() as AddressInfo;
      resolve({ port: address.port, server });
    });
  })));
  await Promise.all(reservations.map(({ server }) => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  })));
  return Object.freeze(reservations.map(({ port }) => port));
};

const requestApiAtUrl = async <TData>(
  apiUrl: string,
  path: string,
  init: RequestInit = {},
): Promise<HttpResult<TData>> => {
  const response = await fetch(`${apiUrl}${path}`, init);
  return {
    body: await response.json() as ApiEnvelope<TData>,
    response,
    status: response.status,
  };
};

const requestApi = async <TData>(
  server: CampaignOsApiServerHandle,
  path: string,
  init: RequestInit = {},
): Promise<HttpResult<TData>> => requestApiAtUrl(server.url, path, init);

const requireSuccess = <TData>(
  result: HttpResult<TData>,
  expectedStatus = 200,
): TData => {
  if (result.status !== expectedStatus || !result.body.ok || !result.body.data) {
    throw new Error(
      `Runtime acceptance request failed with status ${result.status}`
      + ` and code ${result.body.error?.code ?? "unknown"}.`,
    );
  }
  return result.body.data;
};

postgresSuite("PostgreSQL task template catalog Runtime A/B acceptance", () => {
  const databaseName = `campaign_os_m246_stage_test_${process.pid}_${randomUUID()
    .replace(/-/g, "")
    .slice(0, 8)}`;
  const openChildRuntimes = new Set<ChildRuntimeHarness>();
  const openRuntimes = new Set<RuntimeHarness>();
  let administratorPool: pg.Pool | undefined;
  let databaseUrl = "";
  let runtimePorts: readonly number[] = [];

  const startRuntime = async (
    port: number,
    adminAddress: string,
  ): Promise<RuntimeHarness> => {
    const catalogPool = createCatalogPoolTracker();
    let runtime: CampaignOsApiRuntime | undefined;
    let walletAuthentication: WalletAuthenticationServerComposition | undefined;
    const server = await startCampaignOsApiServer({
      allowedCorsOrigins: [TEST_ORIGIN],
      env: {
        CAMPAIGN_OS_ADMIN_OPERATOR_MEMBERSHIPS_JSON: JSON.stringify([{
          active: true,
          campaignIds: null,
          roleIds: ["review_operator"],
          subjectAddress: adminAddress,
        }]),
        CAMPAIGN_OS_ADMIN_REVIEW_ENABLED: "true",
        CAMPAIGN_OS_CAMPAIGN_DB_MODE: "postgres",
        CAMPAIGN_OS_DATABASE_CONNECT_TIMEOUT_MS: "2000",
        CAMPAIGN_OS_DATABASE_IDLE_TIMEOUT_MS: "2000",
        CAMPAIGN_OS_DATABASE_POOL_MAX: "20",
        CAMPAIGN_OS_DATABASE_SSL_MODE: "disable",
        CAMPAIGN_OS_DATABASE_URL: databaseUrl,
        CAMPAIGN_OS_TASK_TEMPLATE_CATALOG_ENABLED: "1",
        CAMPAIGN_OS_WALLET_AUTH_ALLOWED_ORIGINS: TEST_ORIGIN,
        CAMPAIGN_OS_WALLET_AUTH_ALLOW_INSECURE_LOOPBACK_COOKIE: "1",
        CAMPAIGN_OS_WALLET_AUTH_BINDINGS_JSON: JSON.stringify([EOA_BINDING]),
        CAMPAIGN_OS_WALLET_AUTH_CSRF_SECRET: TEST_CSRF_SECRET,
        CAMPAIGN_OS_WALLET_AUTH_ENABLED: "1",
        CAMPAIGN_OS_WALLET_AUTH_ENVIRONMENT: "stage",
        CAMPAIGN_OS_WALLET_AUTH_SHUTDOWN_TIMEOUT_MS: "9000",
      },
      host: "127.0.0.1",
      logger: false,
      port,
      runtimeFactory: (options) => {
        runtime = createCampaignOsApiRuntime({
          ...options,
          taskTemplateCatalogPoolFactory: catalogPool.factory,
        });
        return runtime;
      },
      shutdownTimeoutMs: 10_000,
      walletAuthenticationCompositionFactory: async (input) => {
        const composition = await createDefaultWalletAuthenticationServerComposition(input);
        walletAuthentication = composition;
        return composition;
      },
    });
    if (!runtime || !walletAuthentication) {
      await server.stop();
      throw new Error("Campaign OS API or durable wallet-auth runtime was not captured.");
    }
    let stopped = false;
    const harness: RuntimeHarness = Object.freeze({
      catalogPool,
      runtime,
      server,
      stop: async () => {
        if (stopped) {
          return;
        }
        stopped = true;
        await server.stop();
        openRuntimes.delete(harness);
      },
      walletAuthentication,
    });
    openRuntimes.add(harness);
    return harness;
  };

  const issueSession = async (
    apiUrl: string,
    signer: EphemeralSigner,
    traceId: string,
    expectedAuthority: typeof STANDARD_SESSION_AUTHORITY | typeof ADMIN_SESSION_AUTHORITY,
  ): Promise<IssuedLiveSession> => {
    const address = AElf.wallet.getAddressFromPubKey(signer.getPublic());
    const challenge = requireSuccess(await requestApiAtUrl<WalletChallengeData>(
      apiUrl,
      "/api/wallet/auth/challenges",
      {
        body: JSON.stringify({
          adapterId: EOA_BINDING.adapterId,
          chainId: "AELF",
          network: "testnet",
          walletAddress: address,
        }),
        headers: {
          "content-type": "application/json",
          origin: TEST_ORIGIN,
          "x-campaign-os-trace-id": traceId,
        },
        method: "POST",
      },
    ), 201);
    expect(challenge).toMatchObject({
      adapterId: EOA_BINDING.adapterId,
      network: "testnet",
      walletAddress: address,
    });
    const sessionResult = await requestApiAtUrl<WalletSessionData>(
      apiUrl,
      "/api/wallet/auth/sessions",
      {
        body: JSON.stringify({
          challengeId: challenge.challengeId,
          message: challenge.message,
          nonce: nonceFromMessage(challenge.message),
          publicKey: Buffer.from(signer.getPublic().encode("array", false)).toString("hex"),
          signature: Buffer.from(signExactMessage(challenge.message, signer)).toString("hex"),
        }),
        headers: {
          "content-type": "application/json",
          origin: TEST_ORIGIN,
          "x-campaign-os-trace-id": `${traceId}-verify`,
        },
        method: "POST",
      },
    );
    const session = requireSuccess(sessionResult, 201);
    const cookieHeader = sessionResult.response.headers.get("set-cookie")?.split(";", 1)[0];
    if (!cookieHeader) {
      throw new Error("Durable wallet authentication did not issue a session cookie.");
    }
    const credential = cookieHeader.slice(cookieHeader.indexOf("=") + 1);
    if (!credential || credential === cookieHeader) {
      throw new Error("Durable wallet authentication did not issue a bounded cookie credential.");
    }
    expect(session.session).toMatchObject({
      accountType: "EOA",
      status: "active",
      walletAddress: address,
    });
    expect(session.session.roles).toEqual([...expectedAuthority.roles]);
    expect(session.session.capabilities).toEqual([...expectedAuthority.capabilities]);
    return Object.freeze({
      address,
      adoptionHeaders: (requestTraceId: string, idempotencyKey: string) => ({
        "content-type": "application/json",
        cookie: cookieHeader,
        "idempotency-key": idempotencyKey,
        origin: TEST_ORIGIN,
        "x-campaign-os-trace-id": requestTraceId,
        "x-csrf-token": session.csrfToken,
      }),
      catalogHeaders: (requestTraceId: string) => ({
        cookie: cookieHeader,
        origin: TEST_ORIGIN,
        "x-campaign-os-trace-id": requestTraceId,
      }),
      cookieHeader,
      credential,
      csrfToken: session.csrfToken,
      mutationHeaders: (
        requestTraceId: string,
        overrides: Readonly<Record<string, string>> = {},
      ) => ({
        "content-type": "application/json",
        cookie: cookieHeader,
        origin: TEST_ORIGIN,
        "x-campaign-os-csrf": session.csrfToken,
        "x-campaign-os-trace-id": requestTraceId,
        ...overrides,
      }),
      sessionId: session.session.sessionId,
    });
  };

  const readTaskSnapshot = async (taskId: string): Promise<DurableTaskSnapshotRow> => {
    const pool = createPool(databaseUrl, 2);
    try {
      const result = await pool.query<DurableTaskSnapshotRow>(`
        SELECT
          id,
          campaign_id,
          template_code,
          verification_type,
          wallet_compatibility,
          points,
          required,
          evidence_rule::text AS evidence_rule_bytes,
          template_version,
          template_checksum,
          template_snapshot::text AS snapshot_bytes
        FROM campaign_os.campaign_tasks
        WHERE id = $1
      `, [taskId]);
      if (result.rows.length !== 1 || !result.rows[0]) {
        throw new Error("Expected one durable adopted Task snapshot.");
      }
      return result.rows[0];
    } finally {
      await pool.end();
    }
  };

  const readTaskRowCount = async (pool: pg.Pool): Promise<number> => {
    const result = await pool.query<{ readonly count: number }>(
      "SELECT COUNT(*)::integer AS count FROM campaign_os.campaign_tasks",
    );
    const count = result.rows[0]?.count;
    if (!Number.isSafeInteger(count) || (count ?? -1) < 0) {
      throw new Error("Expected a safe PostgreSQL Task row count.");
    }
    return count!;
  };

  const waitForDatabaseSessionsToDrain = async (): Promise<void> => {
    if (!administratorPool) {
      throw new Error("PostgreSQL administrator pool is unavailable.");
    }
    for (let attempt = 0; attempt < 200; attempt += 1) {
      const result = await administratorPool.query<{ count: number }>(`
        SELECT COUNT(*)::integer AS count
        FROM pg_stat_activity
        WHERE datname = $1
      `, [databaseName]);
      if (result.rows[0]?.count === 0) {
        return;
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 25));
    }
    throw new Error("Task template catalog runtime database sessions did not drain.");
  };

  const childRuntimeEnvironment = (
    port: number,
  ): NodeJS.ProcessEnv => {
    const connection = new URL(databaseUrl);
    const password = connection.password ? decodeURIComponent(connection.password) : undefined;
    connection.password = "";
    return Object.freeze({
      ...process.env,
      CAMPAIGN_OS_API_CORS_ENABLED: "true",
      CAMPAIGN_OS_API_CORS_ORIGINS: TEST_ORIGIN,
      CAMPAIGN_OS_API_HOST: "127.0.0.1",
      CAMPAIGN_OS_API_PORT: String(port),
      CAMPAIGN_OS_CAMPAIGN_DB_MODE: "postgres",
      CAMPAIGN_OS_DATABASE_CONNECT_TIMEOUT_MS: "2000",
      CAMPAIGN_OS_DATABASE_IDLE_TIMEOUT_MS: "2000",
      CAMPAIGN_OS_DATABASE_POOL_MAX: "20",
      CAMPAIGN_OS_DATABASE_SSL_MODE: "disable",
      CAMPAIGN_OS_DATABASE_URL: connection.toString(),
      CAMPAIGN_OS_STAGE_DISPOSABLE_DATABASE_ACK: "disposable-stage-approved",
      CAMPAIGN_OS_TASK_TEMPLATE_CATALOG_ENABLED: "1",
      CAMPAIGN_OS_WALLET_AUTH_ALLOWED_ORIGINS: TEST_ORIGIN,
      CAMPAIGN_OS_WALLET_AUTH_ALLOW_INSECURE_LOOPBACK_COOKIE: "1",
      CAMPAIGN_OS_WALLET_AUTH_BINDINGS_JSON: JSON.stringify([EOA_BINDING]),
      CAMPAIGN_OS_WALLET_AUTH_CSRF_SECRET: TEST_CSRF_SECRET,
      CAMPAIGN_OS_WALLET_AUTH_ENABLED: "1",
      CAMPAIGN_OS_WALLET_AUTH_ENVIRONMENT: "stage",
      CAMPAIGN_OS_WALLET_AUTH_SHUTDOWN_TIMEOUT_MS: "9000",
      ...(password ? { PGPASSWORD: password } : {}),
    });
  };

  const waitForChildExit = async (
    exitPromise: Promise<ChildRuntimeExit>,
    timeoutMs: number,
  ): Promise<ChildRuntimeExit> => new Promise((resolveExit, rejectExit) => {
    const timeout = setTimeout(() => {
      rejectExit(new Error("Task template catalog child runtime did not exit in time."));
    }, timeoutMs);
    exitPromise.then(
      (exit) => {
        clearTimeout(timeout);
        resolveExit(exit);
      },
      (error: unknown) => {
        clearTimeout(timeout);
        rejectExit(error);
      },
    );
  });

  const startChildRuntime = async (
    env: NodeJS.ProcessEnv,
  ): Promise<ChildRuntimeHarness> => {
    const child = spawn(process.execPath, [
      resolve(process.cwd(), "node_modules/vite-node/vite-node.mjs"),
      "--script",
      resolve(process.cwd(), "src/server/taskTemplateCatalogStageRuntime.ts"),
      "--listen",
    ], {
      cwd: process.cwd(),
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const processId = child.pid;
    if (!processId || !child.stdout || !child.stderr) {
      child.kill("SIGKILL");
      throw new Error("Task template catalog child runtime could not be observed.");
    }
    child.stderr.resume();
    const exitPromise = new Promise<ChildRuntimeExit>((resolveExit) => {
      child.once("exit", (code, signal) => resolveExit({ code, signal }));
    });
    let ready: Readonly<{ apiUrl: string; processId: number }>;
    try {
      ready = await new Promise((resolveReady, rejectReady) => {
        let buffer = "";
        const cleanup = () => {
          clearTimeout(timeout);
          child.stdout?.off("data", onData);
          child.off("exit", onExit);
        };
        const onExit = () => {
          cleanup();
          rejectReady(new Error("Task template catalog child runtime exited before ready."));
        };
        const onData = (chunk: Buffer | string) => {
          buffer += chunk.toString();
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            let candidate: Record<string, unknown>;
            try {
              candidate = JSON.parse(line) as Record<string, unknown>;
            } catch {
              continue;
            }
            if (candidate.event !== "task_template_catalog_stage_runtime.ready") {
              continue;
            }
            if (
              typeof candidate.apiUrl !== "string"
              || !Number.isSafeInteger(candidate.processId)
              || candidate.processId !== processId
            ) {
              cleanup();
              rejectReady(new Error("Task template catalog child readiness was invalid."));
              return;
            }
            cleanup();
            resolveReady({ apiUrl: candidate.apiUrl, processId });
            return;
          }
        };
        const timeout = setTimeout(() => {
          cleanup();
          rejectReady(new Error("Task template catalog child runtime did not become ready."));
        }, 20_000);
        child.stdout?.on("data", onData);
        child.once("exit", onExit);
      });
    } catch (error) {
      child.kill("SIGKILL");
      await exitPromise;
      throw error;
    }
    child.stdout.resume();

    let stopPromise: Promise<void> | undefined;
    const harness: ChildRuntimeHarness = Object.freeze({
      child,
      processId: ready.processId,
      stop: () => {
        if (stopPromise) {
          return stopPromise;
        }
        stopPromise = (async () => {
          if (child.exitCode === null && child.signalCode === null && !child.kill("SIGTERM")) {
            throw new Error("Task template catalog child runtime rejected shutdown.");
          }
          let exit: ChildRuntimeExit;
          try {
            exit = await waitForChildExit(exitPromise, 15_000);
          } catch (error) {
            child.kill("SIGKILL");
            await exitPromise;
            throw error;
          }
          if (exit.code !== 0 || exit.signal !== null) {
            throw new Error("Task template catalog child runtime did not drain cleanly.");
          }
          openChildRuntimes.delete(harness);
        })();
        return stopPromise;
      },
      url: ready.apiUrl,
    });
    openChildRuntimes.add(harness);
    return harness;
  };

  beforeAll(async () => {
    if (!/^[a-z0-9_]+$/.test(databaseName)) {
      throw new Error("Generated PostgreSQL runtime database name is invalid.");
    }
    runtimePorts = await reserveLoopbackPorts(3);
    expect(new Set(runtimePorts).size).toBe(3);
    administratorPool = createPool(TEST_DATABASE_URL!, 4);
    await administratorPool.query(`CREATE DATABASE "${databaseName}"`);
    databaseUrl = isolatedDatabaseUrl(TEST_DATABASE_URL!, databaseName);

    const migrationPool = createPool(databaseUrl, 4);
    try {
      const migration = await runPostgresMigrations({
        approved: true,
        migrations: await loadPostgresMigrations(),
        mode: "apply",
        pool: migrationPool as unknown as PostgresMigrationPool,
        traceId: "trace-m246-runtime-migration",
      });
      expect(migration.status).toBe("ready");
      expect(migration.appliedMigrationIds).toContain("0006_durable_task_template_catalog");
      expect(migration.pendingMigrationIds).toEqual([]);
    } finally {
      await migrationPool.end();
    }
  }, 60_000);

  afterAll(async () => {
    const failures: unknown[] = [];
    const childRuntimeResults = await Promise.allSettled(
      [...openChildRuntimes].map((runtime) => runtime.stop()),
    );
    failures.push(...childRuntimeResults
      .filter((result): result is PromiseRejectedResult => result.status === "rejected")
      .map((result) => result.reason));
    openChildRuntimes.clear();
    const runtimeResults = await Promise.allSettled(
      [...openRuntimes].map((runtime) => runtime.stop()),
    );
    failures.push(...runtimeResults
      .filter((result): result is PromiseRejectedResult => result.status === "rejected")
      .map((result) => result.reason));
    openRuntimes.clear();

    if (administratorPool) {
      try {
        await administratorPool.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
      } catch (error) {
        failures.push(error);
      }
      try {
        await administratorPool.end();
      } catch (error) {
        failures.push(error);
      }
    }
    if (failures.length > 0) {
      throw new Error("Task template catalog Runtime A/B cleanup failed.");
    }
  }, 60_000);

  it("recovers exact catalog and adopted Task facts through a fully stopped independent Runtime B", async () => {
    const ownerSigner = AElf.wallet.ellipticEc.genKeyPair({ entropy: randomBytes(32) });
    const adminSigner = AElf.wallet.ellipticEc.genKeyPair({ entropy: randomBytes(32) });
    const participantSigner = AElf.wallet.ellipticEc.genKeyPair({ entropy: randomBytes(32) });
    const ownerAddress = AElf.wallet.getAddressFromPubKey(ownerSigner.getPublic());
    const adminAddress = AElf.wallet.getAddressFromPubKey(adminSigner.getPublic());
    const participantAddress = AElf.wallet.getAddressFromPubKey(participantSigner.getPublic());
    const runtimeA = await startRuntime(runtimePorts[0]!, adminAddress);
    const ownerA = await issueSession(
      runtimeA.server.url,
      ownerSigner,
      "trace-m246-owner-a",
      STANDARD_SESSION_AUTHORITY,
    );
    const adminA = await issueSession(
      runtimeA.server.url,
      adminSigner,
      "trace-m246-admin-a",
      ADMIN_SESSION_AUTHORITY,
    );
    const participantA = await issueSession(
      runtimeA.server.url,
      participantSigner,
      "trace-m246-participant-a",
      STANDARD_SESSION_AUTHORITY,
    );

    const listA = requireSuccess(await requestApi<CatalogListData>(
      runtimeA.server,
      "/api/task-templates?status=active&verification=WALLET&wallet=ANY&locale=en-US&limit=24",
      { headers: ownerA.catalogHeaders("trace-m246-list-a") },
    ));
    const selected = listA.items.find((template) =>
      template.adoptionMode === "direct" && template.verificationType === "WALLET"
    );
    expect(selected).toBeDefined();
    const detailPath = `/api/task-templates/${selected!.templateCode}/versions/${selected!.version}`;
    const ownerDetailA = requireSuccess(await requestApi<CatalogTemplateProjection>(
      runtimeA.server,
      detailPath,
      { headers: ownerA.catalogHeaders("trace-m246-owner-detail-a") },
    ));
    const adminDetailA = requireSuccess(await requestApi<CatalogTemplateProjection>(
      runtimeA.server,
      detailPath,
      { headers: adminA.catalogHeaders("trace-m246-admin-detail-a") },
    ));
    expect(adminDetailA).toMatchObject({
      checksum: ownerDetailA.checksum,
      templateCode: ownerDetailA.templateCode,
      version: ownerDetailA.version,
    });
    const canonicalAdoptionBody = JSON.stringify({
      template: {
        templateCode: selected!.templateCode,
        version: selected!.version,
      },
    });

    const campaign = requireSuccess(await requestApi<CampaignCreateData>(
      runtimeA.server,
      "/api/campaigns",
      {
        body: JSON.stringify({
          duration: "2026-08-01/2026-08-31",
          endTime: "2026-08-31T23:59:59.000Z",
          goal: "M246 Runtime A/B durable catalog acceptance",
          ownerAddress,
          projectId: "m246-runtime-catalog-acceptance",
          rewardDescription: "Durable catalog acceptance reward.",
          startTime: "2026-08-01T00:00:00.000Z",
        }),
        headers: ownerA.mutationHeaders("trace-m246-campaign-a"),
        method: "POST",
      },
    ));
    expect(campaign.payload.ownerAddress).toBe(ownerAddress);

    const adoption = requireSuccess(await requestApi<CatalogAdoptionData>(
      runtimeA.server,
      `/api/campaigns/${campaign.payload.id}/tasks/from-template`,
      {
        body: canonicalAdoptionBody,
        headers: ownerA.adoptionHeaders(
          "trace-m246-adopt-a",
          "m246-runtime-ab-adoption-1",
        ),
        method: "POST",
      },
    ), 201);
    expect(adoption).toMatchObject({
      campaignId: campaign.payload.id,
      replayed: false,
      templateChecksum: selected!.checksum,
      templateCode: selected!.templateCode,
      templateVersion: selected!.version,
    });

    const campaignPath = `/api/owner/campaigns/${campaign.payload.id}`;
    const campaignDetailA = requireSuccess(await requestApi<CampaignDetailData>(
      runtimeA.server,
      campaignPath,
      { headers: ownerA.mutationHeaders("trace-m246-campaign-detail-a") },
    ));
    const detailTaskA = campaignDetailA.payload.tasks.find(({ taskId }) => taskId === adoption.taskId);
    expect(detailTaskA).toMatchObject({
      points: selected!.points.default,
      required: selected!.requiredPolicy.default,
      verificationType: selected!.verificationType,
    });
    const durableTaskA = await readTaskSnapshot(adoption.taskId);
    const snapshotA = JSON.parse(durableTaskA.snapshot_bytes) as Record<string, unknown>;
    expect(durableTaskA).toMatchObject({
      campaign_id: campaign.payload.id,
      points: selected!.points.default,
      required: selected!.requiredPolicy.default,
      template_checksum: selected!.checksum,
      template_code: selected!.templateCode,
      template_version: selected!.version,
      verification_type: selected!.verificationType,
      wallet_compatibility: selected!.walletCompatibility,
    });
    expect(JSON.parse(durableTaskA.evidence_rule_bytes)).toEqual(selected!.evidenceRule);
    expect(snapshotA).toMatchObject({
      evidenceRule: selected!.evidenceRule,
      templateChecksum: selected!.checksum,
      templateCode: selected!.templateCode,
      templateVersion: selected!.version,
      verificationType: selected!.verificationType,
      walletCompatibility: selected!.walletCompatibility,
    });

    const participantOwnedCampaign = requireSuccess(await requestApi<CampaignCreateData>(
      runtimeA.server,
      "/api/campaigns",
      {
        body: JSON.stringify({
          duration: "2026-09-01/2026-09-30",
          endTime: "2026-09-30T23:59:59.000Z",
          goal: "M246 cross-Campaign negative acceptance",
          ownerAddress: participantAddress,
          projectId: "m246-runtime-catalog-negative-scope",
          rewardDescription: "Durable catalog negative acceptance reward.",
          startTime: "2026-09-01T00:00:00.000Z",
        }),
        headers: participantA.mutationHeaders("trace-m246-participant-campaign-a"),
        method: "POST",
      },
    ));
    expect(participantOwnedCampaign.payload.ownerAddress).toBe(participantAddress);

    const badCsrfToken = randomBytes(32).toString("base64url");
    const negativeCases = [
      {
        body: canonicalAdoptionBody,
        campaignId: campaign.payload.id,
        code: "AUTH_FORBIDDEN",
        headers: participantA.adoptionHeaders(
          "trace-m246-negative-participant",
          "m246-negative-participant-1",
        ),
        label: "participant-owner-campaign",
        status: 403,
      },
      {
        body: canonicalAdoptionBody,
        campaignId: participantOwnedCampaign.payload.id,
        code: "AUTH_FORBIDDEN",
        headers: ownerA.adoptionHeaders(
          "trace-m246-negative-cross-campaign",
          "m246-negative-cross-campaign-1",
        ),
        label: "owner-cross-campaign",
        status: 403,
      },
      {
        body: canonicalAdoptionBody,
        campaignId: campaign.payload.id,
        code: "AUTH_CSRF_INVALID",
        headers: {
          ...ownerA.adoptionHeaders(
            "trace-m246-negative-csrf",
            "m246-negative-csrf-1",
          ),
          "x-csrf-token": badCsrfToken,
        },
        label: "bad-csrf",
        status: 403,
      },
      {
        body: canonicalAdoptionBody,
        campaignId: campaign.payload.id,
        code: "TASK_TEMPLATE_ARGUMENT_INVALID",
        headers: {
          ...ownerA.adoptionHeaders(
            "trace-m246-negative-forged-role",
            "m246-negative-forged-role-1",
          ),
          "x-campaign-os-role": "project_owner",
        },
        label: "forged-role-header",
        status: 400,
      },
      {
        body: canonicalAdoptionBody,
        campaignId: campaign.payload.id,
        code: "TASK_TEMPLATE_ARGUMENT_INVALID",
        headers: {
          ...ownerA.adoptionHeaders(
            "trace-m246-negative-forged-subject",
            "m246-negative-forged-subject-1",
          ),
          "x-wallet-address": ownerAddress,
        },
        label: "forged-subject-header",
        status: 400,
      },
      {
        body: canonicalAdoptionBody,
        campaignId: campaign.payload.id,
        code: "TASK_TEMPLATE_ARGUMENT_INVALID",
        headers: {
          ...ownerA.adoptionHeaders(
            "trace-m246-negative-forged-capability",
            "m246-negative-forged-capability-1",
          ),
          "x-campaign-os-capabilities": "campaign:write,task:build",
        },
        label: "forged-capability-header",
        status: 400,
      },
      {
        body: JSON.stringify({
          template: {
            templateCode: selected!.templateCode,
            version: selected!.version,
          },
          verificationType: "MANUAL",
        }),
        campaignId: campaign.payload.id,
        code: "TASK_TEMPLATE_ARGUMENT_INVALID",
        headers: ownerA.adoptionHeaders(
          "trace-m246-negative-forged-canonical",
          "m246-negative-forged-canonical-1",
        ),
        label: "forged-root-canonical-field",
        status: 400,
      },
      {
        body: JSON.stringify({
          template: {
            checksum: selected!.checksum,
            templateCode: selected!.templateCode,
            version: selected!.version,
          },
        }),
        campaignId: campaign.payload.id,
        code: "TASK_TEMPLATE_ARGUMENT_INVALID",
        headers: ownerA.adoptionHeaders(
          "trace-m246-negative-forged-checksum",
          "m246-negative-forged-checksum-1",
        ),
        label: "forged-nested-canonical-field",
        status: 400,
      },
    ] as const;
    const negativeEvidence: NegativeAdoptionEvidence[] = [];
    const evidencePool = createPool(databaseUrl, 2);
    try {
      for (const negativeCase of negativeCases) {
        const before = await readTaskRowCount(evidencePool);
        const response = await requestApi<never>(
          runtimeA.server,
          `/api/campaigns/${negativeCase.campaignId}/tasks/from-template`,
          {
            body: negativeCase.body,
            headers: negativeCase.headers,
            method: "POST",
          },
        );
        const after = await readTaskRowCount(evidencePool);
        expect(response.status, negativeCase.label).toBe(negativeCase.status);
        expect(response.body, negativeCase.label).toMatchObject({
          error: { code: negativeCase.code },
          ok: false,
        });
        expect(response.body.data, negativeCase.label).toBeUndefined();
        expect(after, negativeCase.label).toBe(before);
        const responseHeaders: Record<string, string> = {};
        response.response.headers.forEach((value, name) => {
          responseHeaders[name] = value;
        });
        const serializedResponseSurface = JSON.stringify({
          body: response.body,
          headers: responseHeaders,
        });
        const sensitiveValues = [
          ownerA.cookieHeader,
          ownerA.credential,
          ownerA.csrfToken,
          ownerA.sessionId,
          ownerAddress,
          adminA.cookieHeader,
          adminA.credential,
          adminA.csrfToken,
          adminA.sessionId,
          adminAddress,
          participantA.cookieHeader,
          participantA.credential,
          participantA.csrfToken,
          participantA.sessionId,
          participantAddress,
          badCsrfToken,
        ];
        expect(
          sensitiveValues.some((value) => serializedResponseSurface.includes(value)),
          negativeCase.label,
        ).toBe(false);
        expect(JSON.stringify(response.body), negativeCase.label).not.toMatch(
          /campaign_tasks|credential|publicKey|set-cookie|signature|stack|postgres|\b(?:DELETE|INSERT|SELECT|UPDATE)\b/iu,
        );
        expect(JSON.stringify(responseHeaders), negativeCase.label).not.toMatch(
          /campaign_tasks|publicKey|set-cookie|signature|stack|postgres|\b(?:DELETE|INSERT|SELECT|UPDATE)\b/iu,
        );
        negativeEvidence.push(Object.freeze({
          after,
          before,
          code: negativeCase.code,
          label: negativeCase.label,
          status: response.status,
        }));
      }
    } finally {
      await evidencePool.end();
    }
    expect(negativeEvidence).toHaveLength(negativeCases.length);
    expect(negativeEvidence.every(({ after, before }) => after - before === 0)).toBe(true);

    const runtimeAUrl = runtimeA.server.url;
    await runtimeA.stop();
    expect(runtimeA.server.server.listening).toBe(false);
    expect(runtimeA.catalogPool.state()).toMatchObject({
      checkedOutClients: 0,
      created: true,
      endCalls: 1,
      ended: true,
    });
    expect(runtimeA.walletAuthentication.runtime.state()).toMatchObject({
      accepting: false,
      activeOperationCount: 0,
      controllerCount: 0,
    });
    await waitForDatabaseSessionsToDrain();
    await expect(fetch(`${runtimeAUrl}/api/health`, {
      signal: AbortSignal.timeout(500),
    })).rejects.toBeDefined();

    const runtimeB = await startRuntime(runtimePorts[1]!, adminAddress);
    expect(runtimeB.server.url).not.toBe(runtimeAUrl);
    expect(runtimeB.server).not.toBe(runtimeA.server);
    expect(runtimeB.runtime).not.toBe(runtimeA.runtime);
    expect(runtimeB.catalogPool.identity).not.toBe(runtimeA.catalogPool.identity);
    expect(runtimeB.walletAuthentication.runtime).not.toBe(runtimeA.walletAuthentication.runtime);

    const restoredAdminSession = requireSuccess(await requestApi<WalletSessionData>(
      runtimeB.server,
      "/api/wallet/auth/session",
      { headers: adminA.catalogHeaders("trace-m246-admin-session-restored-b") },
    ));
    expect(restoredAdminSession.session.sessionId).toBe(adminA.sessionId);
    expect(restoredAdminSession.session.roles).toEqual([...ADMIN_SESSION_AUTHORITY.roles]);
    expect(restoredAdminSession.session.capabilities)
      .toEqual([...ADMIN_SESSION_AUTHORITY.capabilities]);

    const restoredOwnerDetail = requireSuccess(await requestApi<CatalogTemplateProjection>(
      runtimeB.server,
      detailPath,
      { headers: ownerA.catalogHeaders("trace-m246-owner-restored-b") },
    ));
    const restoredAdminDetail = requireSuccess(await requestApi<CatalogTemplateProjection>(
      runtimeB.server,
      detailPath,
      { headers: adminA.catalogHeaders("trace-m246-admin-restored-b") },
    ));
    expect(restoredOwnerDetail).toEqual(ownerDetailA);
    expect(restoredAdminDetail).toEqual(adminDetailA);

    const logout = requireSuccess(await requestApi<{ readonly revoked: boolean }>(
      runtimeB.server,
      "/api/wallet/auth/logout",
      {
        headers: {
          cookie: ownerA.cookieHeader,
          origin: TEST_ORIGIN,
          "x-campaign-os-csrf": ownerA.csrfToken,
          "x-campaign-os-trace-id": "trace-m246-owner-logout-b",
        },
        method: "POST",
      },
    ));
    expect(logout.revoked).toBe(true);
    const revokedOwnerRead = await requestApi<CatalogTemplateProjection>(
      runtimeB.server,
      detailPath,
      { headers: ownerA.catalogHeaders("trace-m246-owner-revoked-b") },
    );
    expect(revokedOwnerRead.status).toBe(401);
    expect(revokedOwnerRead.body.ok).toBe(false);

    const ownerB = await issueSession(
      runtimeB.server.url,
      ownerSigner,
      "trace-m246-owner-b",
      STANDARD_SESSION_AUTHORITY,
    );
    const adminB = await issueSession(
      runtimeB.server.url,
      adminSigner,
      "trace-m246-admin-b",
      ADMIN_SESSION_AUTHORITY,
    );
    expect(ownerB.sessionId).not.toBe(ownerA.sessionId);
    expect(adminB.sessionId).not.toBe(adminA.sessionId);

    const listB = requireSuccess(await requestApi<CatalogListData>(
      runtimeB.server,
      "/api/task-templates?status=active&verification=WALLET&wallet=ANY&locale=en-US&limit=24",
      { headers: ownerB.catalogHeaders("trace-m246-list-b") },
    ));
    const ownerDetailB = requireSuccess(await requestApi<CatalogTemplateProjection>(
      runtimeB.server,
      detailPath,
      { headers: ownerB.catalogHeaders("trace-m246-owner-detail-b") },
    ));
    const adminDetailB = requireSuccess(await requestApi<CatalogTemplateProjection>(
      runtimeB.server,
      detailPath,
      { headers: adminB.catalogHeaders("trace-m246-admin-detail-b") },
    ));
    const campaignDetailB = requireSuccess(await requestApi<CampaignDetailData>(
      runtimeB.server,
      campaignPath,
      { headers: ownerB.mutationHeaders("trace-m246-campaign-detail-b") },
    ));
    const durableTaskB = await readTaskSnapshot(adoption.taskId);
    const selectedB = listB.items.find(({ templateCode, version }) =>
      templateCode === selected!.templateCode && version === selected!.version
    );
    const mismatches = [
      ["owner catalog detail", ownerDetailA, ownerDetailB],
      ["admin catalog detail", adminDetailA, adminDetailB],
      ["catalog list identity", selected, selectedB],
      ["Campaign detail", campaignDetailA.payload, campaignDetailB.payload],
      ["durable Task snapshot", durableTaskA, durableTaskB],
    ].flatMap(([label, expected, actual]) =>
      JSON.stringify(expected) === JSON.stringify(actual) ? [] : [label]
    );
    expect(mismatches).toEqual([]);

    await runtimeB.stop();
    expect(runtimeB.server.server.listening).toBe(false);
    expect(runtimeB.catalogPool.state()).toMatchObject({
      checkedOutClients: 0,
      created: true,
      endCalls: 1,
      ended: true,
    });
    expect(runtimeB.walletAuthentication.runtime.state()).toMatchObject({
      accepting: false,
      activeOperationCount: 0,
      controllerCount: 0,
    });
    await waitForDatabaseSessionsToDrain();

    console.info(`WP06 Runtime A/B acceptance ${JSON.stringify({
      catalogPoolReleased: { A: true, B: true },
      listenersDistinct: true,
      listenersReleased: { A: true, B: true },
      routes: [
        "POST /api/wallet/auth/challenges",
        "POST /api/wallet/auth/sessions",
        "POST /api/wallet/auth/logout",
        "GET /api/task-templates",
        "GET /api/task-templates/:templateCode/versions/:version",
        "POST /api/campaigns",
        "POST /api/campaigns/:campaignId/tasks/from-template",
        "GET /api/owner/campaigns/:campaignId",
      ],
      revokedSessionRejected: revokedOwnerRead.status === 401,
      runtimeDistinct: true,
      negativeMatrix: negativeEvidence.map(({ after, before, code, label, status }) => ({
        code,
        label,
        rowDelta: after - before,
        status,
      })),
      snapshotMismatches: mismatches.length,
      walletAuthDurableSessionRestored: true,
    })}`);
  }, 120_000);

  it("recovers durable facts across separate processes on one immutable endpoint", async () => {
    const apiPort = runtimePorts[2]!;
    const apiUrl = `http://127.0.0.1:${apiPort}`;
    const immutableEnv = childRuntimeEnvironment(apiPort);
    const ownerSigner = AElf.wallet.ellipticEc.genKeyPair({ entropy: randomBytes(32) });
    const revokedSigner = AElf.wallet.ellipticEc.genKeyPair({ entropy: randomBytes(32) });
    const ownerAddress = AElf.wallet.getAddressFromPubKey(ownerSigner.getPublic());

    const runtimeA = await startChildRuntime(immutableEnv);
    expect(runtimeA.url).toBe(apiUrl);
    expect(runtimeA.child.pid).toBe(runtimeA.processId);
    const ownerA = await issueSession(
      runtimeA.url,
      ownerSigner,
      "trace-m246-process-owner-a",
      STANDARD_SESSION_AUTHORITY,
    );
    const revokedA = await issueSession(
      runtimeA.url,
      revokedSigner,
      "trace-m246-process-revoked-a",
      STANDARD_SESSION_AUTHORITY,
    );
    const listA = requireSuccess(await requestApiAtUrl<CatalogListData>(
      runtimeA.url,
      "/api/task-templates?status=active&verification=WALLET&wallet=ANY&locale=en-US&limit=24",
      { headers: ownerA.catalogHeaders("trace-m246-process-list-a") },
    ));
    const selected = listA.items.find((template) =>
      template.adoptionMode === "direct" && template.verificationType === "WALLET"
    );
    expect(selected).toBeDefined();
    const detailPath = `/api/task-templates/${selected!.templateCode}/versions/${selected!.version}`;
    const catalogDetailA = requireSuccess(await requestApiAtUrl<CatalogTemplateProjection>(
      runtimeA.url,
      detailPath,
      { headers: ownerA.catalogHeaders("trace-m246-process-detail-a") },
    ));
    const campaign = requireSuccess(await requestApiAtUrl<CampaignCreateData>(
      runtimeA.url,
      "/api/campaigns",
      {
        body: JSON.stringify({
          duration: "2026-10-01/2026-10-31",
          endTime: "2026-10-31T23:59:59.000Z",
          goal: "M246 immutable-endpoint process restart acceptance",
          ownerAddress,
          projectId: "m246-process-restart-acceptance",
          rewardDescription: "Durable process restart acceptance reward.",
          startTime: "2026-10-01T00:00:00.000Z",
        }),
        headers: ownerA.mutationHeaders("trace-m246-process-campaign-a"),
        method: "POST",
      },
    ));
    const adoption = requireSuccess(await requestApiAtUrl<CatalogAdoptionData>(
      runtimeA.url,
      `/api/campaigns/${campaign.payload.id}/tasks/from-template`,
      {
        body: JSON.stringify({
          template: {
            templateCode: selected!.templateCode,
            version: selected!.version,
          },
        }),
        headers: ownerA.adoptionHeaders(
          "trace-m246-process-adopt-a",
          "m246-process-restart-adoption-1",
        ),
        method: "POST",
      },
    ), 201);
    const campaignPath = `/api/owner/campaigns/${campaign.payload.id}`;
    const campaignDetailA = requireSuccess(await requestApiAtUrl<CampaignDetailData>(
      runtimeA.url,
      campaignPath,
      { headers: ownerA.mutationHeaders("trace-m246-process-campaign-detail-a") },
    ));
    const durableTaskA = await readTaskSnapshot(adoption.taskId);
    const revoked = requireSuccess(await requestApiAtUrl<{ readonly revoked: boolean }>(
      runtimeA.url,
      "/api/wallet/auth/logout",
      {
        headers: {
          cookie: revokedA.cookieHeader,
          origin: TEST_ORIGIN,
          "x-campaign-os-csrf": revokedA.csrfToken,
          "x-campaign-os-trace-id": "trace-m246-process-revoke-a",
        },
        method: "POST",
      },
    ));
    expect(revoked.revoked).toBe(true);

    await runtimeA.stop();
    await waitForDatabaseSessionsToDrain();
    await expect(fetch(`${apiUrl}/api/health`, {
      signal: AbortSignal.timeout(500),
    })).rejects.toBeDefined();

    const runtimeB = await startChildRuntime(immutableEnv);
    expect(runtimeB.url).toBe(apiUrl);
    expect(runtimeB.processId).not.toBe(runtimeA.processId);
    expect(runtimeB.child).not.toBe(runtimeA.child);
    const restoredOwnerSession = requireSuccess(await requestApiAtUrl<WalletSessionData>(
      runtimeB.url,
      "/api/wallet/auth/session",
      { headers: ownerA.catalogHeaders("trace-m246-process-owner-restored-b") },
    ));
    expect(restoredOwnerSession.session.sessionId).toBe(ownerA.sessionId);
    const revokedSession = await requestApiAtUrl<WalletSessionData>(
      runtimeB.url,
      "/api/wallet/auth/session",
      { headers: revokedA.catalogHeaders("trace-m246-process-revoked-b") },
    );
    expect(revokedSession.status).toBe(401);
    expect(revokedSession.body.ok).toBe(false);

    const catalogDetailB = requireSuccess(await requestApiAtUrl<CatalogTemplateProjection>(
      runtimeB.url,
      detailPath,
      { headers: ownerA.catalogHeaders("trace-m246-process-detail-b") },
    ));
    const campaignDetailB = requireSuccess(await requestApiAtUrl<CampaignDetailData>(
      runtimeB.url,
      campaignPath,
      { headers: ownerA.mutationHeaders("trace-m246-process-campaign-detail-b") },
    ));
    const durableTaskB = await readTaskSnapshot(adoption.taskId);
    const ownerB = await issueSession(
      runtimeB.url,
      ownerSigner,
      "trace-m246-process-owner-b",
      STANDARD_SESSION_AUTHORITY,
    );
    expect(ownerB.sessionId).not.toBe(ownerA.sessionId);
    const mismatches = [
      ["catalog detail", catalogDetailA, catalogDetailB],
      ["Campaign detail", campaignDetailA.payload, campaignDetailB.payload],
      ["durable Task snapshot", durableTaskA, durableTaskB],
    ].flatMap(([label, expected, actual]) =>
      JSON.stringify(expected) === JSON.stringify(actual) ? [] : [label]
    );
    expect(mismatches).toEqual([]);

    await runtimeB.stop();
    await waitForDatabaseSessionsToDrain();
    await expect(fetch(`${apiUrl}/api/health`, {
      signal: AbortSignal.timeout(500),
    })).rejects.toBeDefined();

    console.info(`WP06 process restart acceptance ${JSON.stringify({
      apiEndpointReused: runtimeA.url === runtimeB.url,
      configuredEnvironmentReused: true,
      durableSessionRestored: restoredOwnerSession.session.sessionId === ownerA.sessionId,
      freshSessionIssued: ownerB.sessionId !== ownerA.sessionId,
      listenerReleasedAfterA: true,
      listenerReleasedAfterB: true,
      processIdentitiesDistinct: runtimeA.processId !== runtimeB.processId,
      revokedSessionRejected: revokedSession.status === 401,
      snapshotMismatches: mismatches.length,
    })}`);
  }, 180_000);
});
