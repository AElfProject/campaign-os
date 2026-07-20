// @vitest-environment node

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createServer as createNetServer, type AddressInfo } from "node:net";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createCampaignOsApiRuntime,
  type CampaignOsApiRuntime,
  type TaskTemplateCatalogPoolFactory,
  type WalletAuthenticationAuthorityRuntime,
} from "./apiRuntime";
import { authSessionRolePolicyById } from "./authSession";
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
  issueResolvedWalletSessionAuthority,
  issueVerifiedWalletSubject,
  type ResolvedWalletSessionAuthority,
} from "./walletAuthentication";
import type {
  RevalidateWalletAuthenticationFenceInput,
  WalletAuthenticationAuthorizationFence,
} from "./walletAuthenticationRuntime";
import { walletAuthenticationSubjectKey } from "./walletAuthenticationStore";

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

type IssuedSessionRole = "project_owner" | "review_operator";

interface ApiEnvelope<TData> {
  readonly data?: TData;
  readonly error?: Readonly<{ code?: string }>;
  readonly ok: boolean;
  readonly traceId?: string;
}

interface HttpResult<TData> {
  readonly body: ApiEnvelope<TData>;
  readonly status: number;
}

interface PreviewWalletSessionData {
  readonly payload: Readonly<{
    accountType: "AA" | "EOA";
    address: string;
    id: string;
    issuer?: Readonly<{ valid?: boolean }>;
    proof?: Readonly<{ status?: string }>;
    sessionId: string;
    walletSource:
      | "NIGHTELF"
      | "OTHER"
      | "PORTKEY_AA"
      | "PORTKEY_EOA_APP"
      | "PORTKEY_EOA_EXTENSION";
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

interface IssuedTestSession {
  readonly authority: ResolvedWalletSessionAuthority;
  readonly adoptionHeaders: (
    traceId: string,
    idempotencyKey: string,
  ) => Record<string, string>;
  readonly catalogHeaders: (traceId: string) => Record<string, string>;
  readonly mutationHeaders: (
    traceId: string,
    overrides?: Readonly<Record<string, string>>,
  ) => Record<string, string>;
}

interface TestAuthorization {
  readonly authority: ResolvedWalletSessionAuthority;
  readonly cookieHeader: string;
  readonly csrfToken: string;
  readonly fence: WalletAuthenticationAuthorizationFence;
}

interface TestAuthorizationRegistry {
  readonly runtime: WalletAuthenticationAuthorityRuntime;
  issue(data: PreviewWalletSessionData, role: IssuedSessionRole): IssuedTestSession;
  state(): Readonly<{ accepting: boolean; sessionCount: number; stopCalls: number }>;
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
  readonly auth: TestAuthorizationRegistry;
  readonly catalogPool: CatalogPoolTracker;
  readonly runtime: CampaignOsApiRuntime;
  readonly server: CampaignOsApiServerHandle;
  stop(): Promise<void>;
}

const capabilityDigest = (values: readonly string[]): string => createHash("sha256")
  .update(["campaign-os-wallet-auth-capabilities/v1", ...[...values].sort()].join("\n"), "utf8")
  .digest("hex");

const authorizationFailure = (traceId: string) => Object.freeze({
  diagnostic: Object.freeze({
    code: "WALLET_AUTH_RUNTIME_SESSION_UNAUTHORIZED" as const,
    field: "cookie",
    retryable: false,
    traceId,
  }),
  status: "unauthorized" as const,
});

const staleFenceFailure = (traceId: string) => Object.freeze({
  diagnostic: Object.freeze({
    code: "WALLET_AUTH_RUNTIME_FENCE_STALE" as const,
    field: "fence",
    retryable: false,
    traceId,
  }),
  status: "stale" as const,
});

const createTestAuthorizationRegistry = (): TestAuthorizationRegistry => {
  const byCookie = new Map<string, TestAuthorization>();
  const bySession = new Map<string, TestAuthorization>();
  let accepting = true;
  let stopCalls = 0;

  const currentSession = async (input: {
    cookieHeader?: string;
    origin?: string;
    traceId: string;
  }) => {
    const authorization = input.cookieHeader
      ? byCookie.get(input.cookieHeader)
      : undefined;
    if (!accepting || input.origin !== TEST_ORIGIN || !authorization) {
      return authorizationFailure(input.traceId);
    }
    const authority = authorization.authority;

    return Object.freeze({
      response: Object.freeze({
        csrfToken: authorization.csrfToken,
        session: Object.freeze({
          absoluteExpiresAt: authority.absoluteExpiresAt,
          accountType: authority.subject.accountType,
          capabilities: authority.capabilities,
          chainId: authority.subject.chainId,
          idleExpiresAt: authority.idleExpiresAt,
          issuedAt: authority.subject.verifiedAt,
          network: authority.subject.network,
          roleIds: authority.roleIds,
          sessionId: authority.sessionId,
          status: "active" as const,
          walletAddress: authority.subject.walletAddress,
          walletSource: authority.subject.walletSource,
        }),
      }),
      status: "active" as const,
    });
  };

  const runtime: WalletAuthenticationAuthorityRuntime = {
    currentSession,
    resolveAuthorization: async (input) => {
      const authorization = input.cookieHeader
        ? byCookie.get(input.cookieHeader)
        : undefined;
      if (
        !accepting
        || input.origin !== TEST_ORIGIN
        || !authorization
        || input.csrfHeader !== authorization.csrfToken
      ) {
        return authorizationFailure(input.traceId);
      }

      return Object.freeze({
        authority: authorization.authority,
        fence: authorization.fence,
        status: "authorized" as const,
      });
    },
    revalidateFenceBeforeWrite: async <TValue>(
      input: RevalidateWalletAuthenticationFenceInput<TValue>,
    ) => {
      const authorization = bySession.get(input.fence.sessionId);
      if (
        !accepting
        || !authorization
        || authorization.fence.capabilityDigest !== input.fence.capabilityDigest
        || authorization.fence.membershipRevision !== input.fence.membershipRevision
        || authorization.fence.subjectKey !== input.fence.subjectKey
        || authorization.fence.version !== input.fence.version
      ) {
        return staleFenceFailure(input.traceId);
      }
      const signal = input.signal ?? new AbortController().signal;

      return Object.freeze({
        status: "committed" as const,
        value: await input.write({ authority: authorization.authority, signal }),
      });
    },
    state: () => Object.freeze({
      accepting,
      activeOperationCount: 0,
      controllerCount: 0,
    }),
    stop: async () => {
      stopCalls += 1;
      accepting = false;
      return Object.freeze({
        diagnosticCodes: Object.freeze([]),
        diagnostics: Object.freeze([]),
        status: "drained" as const,
      });
    },
  };

  const issue = (
    data: PreviewWalletSessionData,
    role: IssuedSessionRole,
  ): IssuedTestSession => {
    if (!accepting || data.payload.issuer?.valid !== true || data.payload.proof?.status !== "verified") {
      throw new Error("Server-issued test wallet session is not verified.");
    }
    const payload = data.payload;
    const subject = issueVerifiedWalletSubject({
      accountType: payload.accountType,
      adapterId: `m246-runtime-${payload.accountType.toLowerCase()}`,
      ...(payload.accountType === "AA"
        ? { caHash: createHash("sha256").update(`ca:${payload.sessionId}`).digest("hex") }
        : {}),
      chainId: "AELF",
      network: "mainnet",
      proofDigest: createHash("sha256").update(`proof:${payload.sessionId}`).digest("hex"),
      proofMethod: payload.accountType === "AA"
        ? "PORTKEY_AA_MANAGER_CA"
        : "AELF_EOA_RECOVERABLE",
      signerAddress: payload.address,
      verifiedAt: "2026-07-20T00:00:00.000Z",
      walletAddress: payload.address,
      walletSource: payload.walletSource,
    });
    const capabilities = authSessionRolePolicyById[role].allowedCapabilities;
    const authority = issueResolvedWalletSessionAuthority({
      absoluteExpiresAt: "2099-12-31T23:59:59.000Z",
      capabilities,
      credentialBoundary: "wallet-auth-cookie/v1",
      idleExpiresAt: "2099-12-31T23:59:59.000Z",
      membershipRevision: `m246-runtime-membership-${role}-${payload.sessionId}`,
      roleIds: [role],
      sessionId: payload.sessionId,
      subject,
      version: 1,
    });
    const cookieHeader = `campaign_os_wallet_session=${randomBytes(32).toString("base64url")}`;
    const csrfToken = randomBytes(32).toString("base64url");
    const authorization = Object.freeze({
      authority,
      cookieHeader,
      csrfToken,
      fence: Object.freeze({
        capabilityDigest: capabilityDigest(authority.capabilities),
        membershipRevision: authority.membershipRevision,
        sessionId: authority.sessionId,
        subjectKey: walletAuthenticationSubjectKey(authority.subject),
        version: authority.version,
      }),
    });
    byCookie.set(cookieHeader, authorization);
    bySession.set(authority.sessionId, authorization);

    return Object.freeze({
      authority,
      adoptionHeaders: (traceId: string, idempotencyKey: string) => ({
        "content-type": "application/json",
        cookie: cookieHeader,
        "idempotency-key": idempotencyKey,
        origin: TEST_ORIGIN,
        "x-campaign-os-trace-id": traceId,
        "x-csrf-token": csrfToken,
      }),
      catalogHeaders: (traceId: string) => ({
        cookie: cookieHeader,
        origin: TEST_ORIGIN,
        "x-campaign-os-trace-id": traceId,
      }),
      mutationHeaders: (
        traceId: string,
        overrides: Readonly<Record<string, string>> = {},
      ) => ({
        "content-type": "application/json",
        cookie: cookieHeader,
        origin: TEST_ORIGIN,
        "x-campaign-os-csrf": csrfToken,
        "x-campaign-os-trace-id": traceId,
        ...overrides,
      }),
    });
  };

  return Object.freeze({
    issue,
    runtime,
    state: () => Object.freeze({ accepting, sessionCount: byCookie.size, stopCalls }),
  });
};

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

const requestApi = async <TData>(
  server: CampaignOsApiServerHandle,
  path: string,
  init: RequestInit = {},
): Promise<HttpResult<TData>> => {
  const response = await fetch(`${server.url}${path}`, init);
  return {
    body: await response.json() as ApiEnvelope<TData>,
    status: response.status,
  };
};

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
  const databaseName = `campaign_os_m246_runtime_${process.pid}_${randomUUID()
    .replace(/-/g, "")
    .slice(0, 8)}`;
  const openRuntimes = new Set<RuntimeHarness>();
  let administratorPool: pg.Pool | undefined;
  let databaseUrl = "";
  let runtimePorts: readonly number[] = [];

  const startRuntime = async (port: number): Promise<RuntimeHarness> => {
    const auth = createTestAuthorizationRegistry();
    const catalogPool = createCatalogPoolTracker();
    let runtime: CampaignOsApiRuntime | undefined;
    const server = await startCampaignOsApiServer({
      allowedCorsOrigins: [TEST_ORIGIN],
      env: {
        CAMPAIGN_OS_CAMPAIGN_DB_MODE: "postgres",
        CAMPAIGN_OS_DATABASE_CONNECT_TIMEOUT_MS: "2000",
        CAMPAIGN_OS_DATABASE_IDLE_TIMEOUT_MS: "2000",
        CAMPAIGN_OS_DATABASE_POOL_MAX: "20",
        CAMPAIGN_OS_DATABASE_SSL_MODE: "disable",
        CAMPAIGN_OS_DATABASE_URL: databaseUrl,
        CAMPAIGN_OS_TASK_TEMPLATE_CATALOG_ENABLED: "1",
      },
      host: "127.0.0.1",
      logger: false,
      port,
      runtimeFactory: (options) => {
        runtime = createCampaignOsApiRuntime({
          ...options,
          taskTemplateCatalogPoolFactory: catalogPool.factory,
          walletAuthenticationRuntime: auth.runtime,
          walletAuthenticationRuntimeOwnership: "runtime",
        });
        return runtime;
      },
      shutdownTimeoutMs: 10_000,
      walletAuthenticationAllowedOrigins: [TEST_ORIGIN],
      walletAuthenticationRuntime: auth.runtime,
    });
    if (!runtime) {
      await server.stop();
      throw new Error("Campaign OS API runtime was not captured.");
    }
    let stopped = false;
    const harness: RuntimeHarness = Object.freeze({
      auth,
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
    });
    openRuntimes.add(harness);
    return harness;
  };

  const issueSession = async (
    runtime: RuntimeHarness,
    address: string,
    role: IssuedSessionRole,
    traceId: string,
  ): Promise<IssuedTestSession> => {
    const preview = requireSuccess(await requestApi<PreviewWalletSessionData>(
      runtime.server,
      "/api/wallet/session",
      {
        body: JSON.stringify({
          adapterName: "PortkeyAAWallet",
          address,
          chainId: "AELF",
          network: "mainnet",
          proofEvaluatedAt: "2026-07-20T00:00:01.000Z",
          proofIssuedAt: "2026-07-20T00:00:00.000Z",
          signature: randomUUID(),
        }),
        headers: {
          "content-type": "application/json",
          "x-campaign-os-trace-id": traceId,
        },
        method: "POST",
      },
    ));
    expect(preview.payload.sessionId).toBe(preview.payload.id);
    return runtime.auth.issue(preview, role);
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

  beforeAll(async () => {
    if (!/^[a-z0-9_]+$/.test(databaseName)) {
      throw new Error("Generated PostgreSQL runtime database name is invalid.");
    }
    runtimePorts = await reserveLoopbackPorts(2);
    expect(new Set(runtimePorts).size).toBe(2);
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
    const ownerAddress = `2F4M246Owner${randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const adminAddress = `2F4M246Admin${randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const runtimeA = await startRuntime(runtimePorts[0]!);
    const ownerA = await issueSession(runtimeA, ownerAddress, "project_owner", "trace-m246-owner-a");
    const adminA = await issueSession(runtimeA, adminAddress, "review_operator", "trace-m246-admin-a");

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
        body: JSON.stringify({
          template: {
            templateCode: selected!.templateCode,
            version: selected!.version,
          },
        }),
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

    const runtimeAUrl = runtimeA.server.url;
    await runtimeA.stop();
    expect(runtimeA.server.server.listening).toBe(false);
    expect(runtimeA.catalogPool.state()).toMatchObject({
      checkedOutClients: 0,
      created: true,
      endCalls: 1,
      ended: true,
    });
    expect(runtimeA.auth.state()).toMatchObject({ accepting: false, stopCalls: 1 });
    await waitForDatabaseSessionsToDrain();
    await expect(fetch(`${runtimeAUrl}/api/health`, {
      signal: AbortSignal.timeout(500),
    })).rejects.toBeDefined();

    const runtimeB = await startRuntime(runtimePorts[1]!);
    expect(runtimeB.server.url).not.toBe(runtimeAUrl);
    expect(runtimeB.server).not.toBe(runtimeA.server);
    expect(runtimeB.runtime).not.toBe(runtimeA.runtime);
    expect(runtimeB.catalogPool.identity).not.toBe(runtimeA.catalogPool.identity);
    const ownerB = await issueSession(runtimeB, ownerAddress, "project_owner", "trace-m246-owner-b");
    const adminB = await issueSession(runtimeB, adminAddress, "review_operator", "trace-m246-admin-b");

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
    expect(runtimeB.auth.state()).toMatchObject({ accepting: false, stopCalls: 1 });
    await waitForDatabaseSessionsToDrain();

    console.info(`WP06 Runtime A/B acceptance ${JSON.stringify({
      catalogPoolReleased: { A: true, B: true },
      listenersDistinct: true,
      listenersReleased: { A: true, B: true },
      routes: [
        "GET /api/task-templates",
        "GET /api/task-templates/:templateCode/versions/:version",
        "POST /api/campaigns",
        "POST /api/campaigns/:campaignId/tasks/from-template",
        "GET /api/owner/campaigns/:campaignId",
      ],
      runtimeDistinct: true,
      snapshotMismatches: mismatches.length,
    })}`);
  }, 120_000);
});
