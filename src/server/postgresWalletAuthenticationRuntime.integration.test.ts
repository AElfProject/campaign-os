// @vitest-environment node

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createServer as createNetServer, type AddressInfo } from "node:net";
import AElf from "aelf-sdk";
import pg from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  loadPostgresMigrations,
  runPostgresMigrations,
  type PostgresMigrationDefinition,
} from "./postgresMigration";
import {
  startPortkeyCaRelationSandbox,
  type PortkeyCaRelationSandboxHandle,
  type PortkeyCaRelationSandboxScenario,
} from "./portkeyCaRelationSandbox";
import {
  startCampaignOsApiServer,
  type CampaignOsApiServerHandle,
} from "./server";
import type { WalletAuthenticationRuntime } from "./walletAuthenticationRuntime";
import {
  createDefaultWalletAuthenticationServerComposition,
} from "./walletAuthenticationServerComposition";
import { startWalletAuthenticationStageRuntime } from "./walletAuthenticationStageRuntime";

const TEST_DATABASE_URL = process.env.CAMPAIGN_OS_TEST_DATABASE_URL?.trim();
const REQUIRED_ACCEPTANCE = process.env.CAMPAIGN_OS_REQUIRE_POSTGRES_TESTS?.trim() === "1"
  || process.env.CAMPAIGN_OS_REQUIRE_WALLET_AUTH_TESTS?.trim() === "1"
  || process.env.npm_lifecycle_event === "test:postgres:required";

if (REQUIRED_ACCEPTANCE && !TEST_DATABASE_URL) {
  throw new Error(
    "Required wallet authentication runtime acceptance needs CAMPAIGN_OS_TEST_DATABASE_URL.",
  );
}

const postgresAcceptance = TEST_DATABASE_URL ? describe : describe.skip;
const ORIGIN = "http://127.0.0.1:5193";
const JSON_HEADERS = Object.freeze({
  "content-type": "application/json",
  origin: ORIGIN,
});
const AUTH_TABLES = ["wallet_auth_challenges", "wallet_sessions"] as const;

type ApiEnvelope<T> = Readonly<{
  data?: T;
  error?: Readonly<{
    code?: string;
    details?: Readonly<{ diagnosticCode?: string }>;
  }>;
  ok: boolean;
  traceId: string;
}>;

type ChallengeProjection = Readonly<{
  adapterId: string;
  challengeId: string;
  chainId: string;
  expiresAt: string;
  message: string;
  network: string;
  version: string;
  walletAddress: string;
}>;

type SessionProjection = Readonly<{
  csrfToken: string;
  session: Readonly<{
    accountType: "AA" | "EOA";
    sessionId: string;
    status: "active";
    walletAddress: string;
  }>;
}>;

type HttpResult<T> = Readonly<{
  body: ApiEnvelope<T>;
  response: Response;
}>;

type EphemeralSigner = ReturnType<typeof AElf.wallet.ellipticEc.genKeyPair>;

interface LiveServer {
  readonly handle: CampaignOsApiServerHandle;
  readonly runtime: WalletAuthenticationRuntime;
}

const openServers = new Set<CampaignOsApiServerHandle>();
const openSandboxes = new Set<PortkeyCaRelationSandboxHandle>();

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

const disposableDatabaseName = (purpose: string): string =>
  `campaign_os_m244_wp08_${purpose}_${process.pid}_${randomUUID().replace(/-/g, "").slice(0, 8)}`;

const eoaBinding = Object.freeze({
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

const aaBinding = Object.freeze({
  accountType: "AA",
  adapterId: "portkey-aa",
  caRelationProviderId: "stage-portkey-ca",
  chainIds: ["AELF"],
  enabled: true,
  hashStrategyId: "aelf-web-login-portkey-aa-v1",
  network: "testnet",
  productionApproved: false,
  proofMethod: "PORTKEY_AA_MANAGER_CA",
  signatureEncoding: "AELF_RECOVERABLE_HEX",
  walletSource: "PORTKEY_AA",
});

const stageEnv = (
  databaseUrl: string,
  caRelationUrl?: string,
): Record<string, string | undefined> => ({
  CAMPAIGN_OS_CAMPAIGN_DB_MODE: "postgres",
  CAMPAIGN_OS_DATABASE_URL: databaseUrl,
  ...(caRelationUrl === undefined
    ? {}
    : {
      CAMPAIGN_OS_PORTKEY_CA_RELATION_PROVIDERS_JSON: JSON.stringify([{
        enabled: true,
        endpointEnvKey: "CAMPAIGN_OS_PORTKEY_CA_RELATION_URL",
        id: "stage-portkey-ca",
        productionApproved: false,
        timeoutMs: 100,
      }]),
      CAMPAIGN_OS_PORTKEY_CA_RELATION_URL: caRelationUrl,
    }),
  CAMPAIGN_OS_WALLET_AUTH_ALLOWED_ORIGINS: ORIGIN,
  CAMPAIGN_OS_WALLET_AUTH_ALLOW_INSECURE_LOOPBACK_COOKIE: "1",
  CAMPAIGN_OS_WALLET_AUTH_BINDINGS_JSON: JSON.stringify(
    caRelationUrl === undefined ? [eoaBinding] : [eoaBinding, aaBinding],
  ),
  CAMPAIGN_OS_WALLET_AUTH_CSRF_SECRET: "required-acceptance-csrf-secret-32-bytes",
  CAMPAIGN_OS_WALLET_AUTH_ENABLED: "1",
  CAMPAIGN_OS_WALLET_AUTH_ENVIRONMENT: "stage",
  CAMPAIGN_OS_WALLET_AUTH_SHUTDOWN_TIMEOUT_MS: "9000",
});

const startLiveServer = async (
  databaseUrl: string,
  caRelationUrl?: string,
): Promise<LiveServer> => {
  let runtime: WalletAuthenticationRuntime | undefined;
  const handle = await startCampaignOsApiServer({
    env: stageEnv(databaseUrl, caRelationUrl),
    host: "127.0.0.1",
    logger: false,
    port: 0,
    shutdownTimeoutMs: 9_000,
    walletAuthenticationCompositionFactory: async (input) => {
      const composition = await createDefaultWalletAuthenticationServerComposition(input);
      runtime = composition.runtime as WalletAuthenticationRuntime;
      return composition;
    },
  });
  openServers.add(handle);
  if (!runtime) {
    await handle.stop();
    openServers.delete(handle);
    throw new Error("The default wallet authentication composition did not expose its runtime.");
  }
  return { handle, runtime };
};

const stopServer = async (handle: CampaignOsApiServerHandle): Promise<number> => {
  const startedAt = Date.now();
  try {
    await handle.stop();
  } finally {
    openServers.delete(handle);
  }
  return Date.now() - startedAt;
};

const startSandbox = async (
  options: Parameters<typeof startPortkeyCaRelationSandbox>[0],
): Promise<PortkeyCaRelationSandboxHandle> => {
  const sandbox = await startPortkeyCaRelationSandbox(options);
  openSandboxes.add(sandbox);
  return sandbox;
};

const stopSandbox = async (sandbox: PortkeyCaRelationSandboxHandle): Promise<void> => {
  try {
    await sandbox.close();
  } finally {
    openSandboxes.delete(sandbox);
  }
};

const fetchJson = async <T>(
  server: CampaignOsApiServerHandle,
  path: string,
  init: RequestInit,
): Promise<HttpResult<T>> => {
  const response = await fetch(`${server.url}${path}`, init);
  const body = await response.json() as ApiEnvelope<T>;
  return { body, response };
};

const traceHeaders = (traceId: string): Record<string, string> => ({
  ...JSON_HEADERS,
  "x-campaign-os-trace-id": traceId,
});

const nonceFromMessage = (message: string): string => {
  const nonce = message.split("\n")
    .find((line) => line.startsWith("Nonce: "))
    ?.slice("Nonce: ".length);
  if (!nonce || !/^[A-Za-z0-9_-]{43}$/.test(nonce)) {
    throw new Error("Canonical challenge did not contain a valid nonce line.");
  }
  return nonce;
};

const issueChallenge = async (
  server: CampaignOsApiServerHandle,
  input: Readonly<{
    adapterId: "portkey-aa" | "portkey-discover-eoa";
    caHash?: string;
    traceId: string;
    walletAddress: string;
  }>,
): Promise<ChallengeProjection> => {
  const result = await fetchJson<ChallengeProjection>(server, "/api/wallet/auth/challenges", {
    body: JSON.stringify({
      adapterId: input.adapterId,
      ...(input.caHash === undefined ? {} : { caHash: input.caHash }),
      chainId: "AELF",
      network: "testnet",
      walletAddress: input.walletAddress,
    }),
    headers: traceHeaders(input.traceId),
    method: "POST",
  });
  expect(result.response.status).toBe(201);
  expect(result.body).toMatchObject({ ok: true });
  if (!result.body.data) {
    throw new Error("Wallet challenge response was missing its safe projection.");
  }
  return result.body.data;
};

const signExactMessage = (message: string, signer: EphemeralSigner): Uint8Array =>
  Uint8Array.from(AElf.wallet.sign(Buffer.from(message, "utf8").toString("hex"), signer));

const sessionRequest = (
  challenge: ChallengeProjection,
  signer: EphemeralSigner,
  overrides: Readonly<Record<string, unknown>> = {},
): Record<string, unknown> => ({
  challengeId: challenge.challengeId,
  message: challenge.message,
  nonce: nonceFromMessage(challenge.message),
  publicKey: Buffer.from(signer.getPublic().encode("array", false)).toString("hex"),
  signature: Buffer.from(signExactMessage(challenge.message, signer)).toString("hex"),
  ...overrides,
});

const verifySession = async (
  server: CampaignOsApiServerHandle,
  body: Readonly<Record<string, unknown>>,
  traceId: string,
): Promise<HttpResult<SessionProjection>> => fetchJson<SessionProjection>(
  server,
  "/api/wallet/auth/sessions",
  {
    body: JSON.stringify(body),
    headers: traceHeaders(traceId),
    method: "POST",
  },
);

const sessionHeaders = (
  cookie: string,
  traceId: string,
  csrfToken?: string,
): Record<string, string> => ({
  cookie,
  origin: ORIGIN,
  "x-campaign-os-trace-id": traceId,
  ...(csrfToken === undefined ? {} : { "x-campaign-os-csrf": csrfToken }),
});

const currentSession = (
  server: CampaignOsApiServerHandle,
  cookie: string,
  traceId: string,
): Promise<HttpResult<SessionProjection>> => fetchJson<SessionProjection>(
  server,
  "/api/wallet/auth/session",
  { headers: sessionHeaders(cookie, traceId), method: "GET" },
);

const rotateSession = (
  server: CampaignOsApiServerHandle,
  cookie: string,
  csrfToken: string,
  traceId: string,
): Promise<HttpResult<SessionProjection>> => fetchJson<SessionProjection>(
  server,
  "/api/wallet/auth/session/rotate",
  { headers: sessionHeaders(cookie, traceId, csrfToken), method: "POST" },
);

const setCookie = (response: Response): string | undefined =>
  response.headers.get("set-cookie")?.split(";", 1)[0] ?? undefined;

const expectAuthenticationFailure = (
  result: HttpResult<SessionProjection>,
  expected: Readonly<{
    diagnosticCode: "WALLET_AUTH_RUNTIME_PROOF_REJECTED" | "WALLET_AUTH_RUNTIME_PROOF_UNAVAILABLE";
    publicCode: "AUTH_DEPENDENCY_UNAVAILABLE" | "AUTH_PROOF_INVALID";
    status: 401 | 503;
  }>,
  label?: string,
): void => {
  expect(result.response.status, label).toBe(expected.status);
  expect(result.body, label).toMatchObject({
    error: {
      code: expected.publicCode,
      details: { diagnosticCode: expected.diagnosticCode },
    },
    ok: false,
  });
  expect(setCookie(result.response), label).toBeUndefined();
};

const createEoaSession = async (
  server: CampaignOsApiServerHandle,
  traceId: string,
): Promise<Readonly<{
  challenge: ChallengeProjection;
  cookie: string;
  response: SessionProjection;
}>> => {
  const signer = AElf.wallet.ellipticEc.genKeyPair({ entropy: randomBytes(32) });
  const address = AElf.wallet.getAddressFromPubKey(signer.getPublic());
  const challenge = await issueChallenge(server, {
    adapterId: "portkey-discover-eoa",
    traceId: `${traceId}-challenge`,
    walletAddress: address,
  });
  const verified = await verifySession(server, sessionRequest(challenge, signer), `${traceId}-verify`);
  expect({ body: verified.body, status: verified.response.status }).toMatchObject({
    body: { ok: true },
    status: 201,
  });
  const cookie = setCookie(verified.response);
  if (!cookie || !verified.body.data) {
    throw new Error("EOA authentication did not return a session delivery.");
  }
  return { challenge, cookie, response: verified.body.data };
};

const authenticationCounts = async (pool: pg.Pool) => {
  const result = await pool.query(
    `SELECT
       (SELECT COUNT(*)::integer FROM campaign_os.wallet_auth_challenges) AS challenges,
       (SELECT COUNT(*)::integer FROM campaign_os.wallet_sessions) AS sessions,
       (SELECT COUNT(*)::integer FROM campaign_os.wallet_sessions WHERE status = 'active') AS active_sessions`,
  );
  return result.rows[0] as Readonly<{
    active_sessions: number;
    challenges: number;
    sessions: number;
  }>;
};

const truncateAuthentication = async (pool: pg.Pool): Promise<void> => {
  await pool.query(
    "TRUNCATE TABLE campaign_os.wallet_sessions, campaign_os.wallet_auth_challenges",
  );
};

const seedM243History = async (pool: pg.Pool): Promise<void> => {
  await pool.query(`
    INSERT INTO campaign_os.campaigns (
      id, project_id, owner_address, status, default_locale, supported_locales,
      wallet_policy, contract_mode, goal, duration, reward_description,
      reward_disclaimer_hash, metadata_uri, metadata_hash, start_time, end_time,
      publish_readiness, created_at, updated_at
    ) VALUES (
      'campaign-m244-history', 'project-m244-history', 'owner-m244-history', 'draft',
      'en-US', '["en-US"]'::jsonb, 'ANY', 'OFF_CHAIN_MVP', 'Historical migration proof',
      '30 days', 'Historical reward', NULL, NULL, NULL,
      '2026-07-16T00:00:00.000Z', '2026-08-16T00:00:00.000Z',
      '{"blockers":[],"ready":false,"warnings":[]}'::jsonb,
      '2026-07-16T00:00:00.000Z', '2026-07-16T00:00:00.000Z'
    )
  `);
  await pool.query(`
    INSERT INTO campaign_os.campaign_tasks (
      id, campaign_id, template_code, verification_type, wallet_compatibility,
      points, required, evidence_rule, created_at, updated_at
    ) VALUES (
      'task-m244-history', 'campaign-m244-history', 'history-task', 'ON_CHAIN', 'ANY',
      120, true, '{"source":"AELFSCAN"}'::jsonb,
      '2026-07-16T00:00:00.000Z', '2026-07-16T00:00:00.000Z'
    )
  `);
  await pool.query(`
    INSERT INTO campaign_os.verification_attempts (
      id, idempotency_key, campaign_id, task_id, task_revision, wallet_address,
      account_type, wallet_source, binding_id, binding_revision, provider_ref,
      verification_type, task_revision_digest, evidence_rule_digest, status,
      dispatch_state, lease_token_hash, lease_expires_at, fence, attempt_count,
      max_attempts, retry_posture, diagnostic_codes, trace_id, created_at, updated_at
    ) VALUES (
      'attempt-m244-history', $1, 'campaign-m244-history', 'task-m244-history', 1,
      'wallet-m244-history', 'EOA', 'PORTKEY_EOA_EXTENSION', 'binding-m244-history', 1,
      'provider-m244-history', 'ON_CHAIN', $2, $3, 'running', 'not_started', $4,
      '2026-07-16T00:10:00.000Z', 1, 1, 3, 'none', '[]'::jsonb,
      'trace-m244-history', '2026-07-16T00:00:00.000Z', '2026-07-16T00:00:00.000Z'
    )
  `, ["1".repeat(64), "2".repeat(64), "3".repeat(64), "4".repeat(64)]);
};

const historicalBytes = async (pool: pg.Pool): Promise<string> => {
  const result = await pool.query(`
    SELECT encode(convert_to(
      (SELECT to_jsonb(c)::text FROM campaign_os.campaigns AS c WHERE id = 'campaign-m244-history')
      || E'\\n'
      || (SELECT to_jsonb(t)::text FROM campaign_os.campaign_tasks AS t WHERE id = 'task-m244-history')
      || E'\\n'
      || (SELECT to_jsonb(a)::text FROM campaign_os.verification_attempts AS a WHERE id = 'attempt-m244-history'),
      'UTF8'
    ), 'hex') AS bytes
  `);
  const bytes = result.rows[0]?.bytes;
  if (typeof bytes !== "string" || bytes.length === 0) {
    throw new Error("M243 historical byte projection was unavailable.");
  }
  return bytes;
};

const databaseMaterial = async (pool: pg.Pool): Promise<unknown> => {
  const result = await pool.query(`
    SELECT COALESCE(jsonb_agg(to_jsonb(material)), '[]'::jsonb) AS material
    FROM (
      SELECT 'challenge' AS kind, to_jsonb(challenge_row) AS value
      FROM campaign_os.wallet_auth_challenges AS challenge_row
      UNION ALL
      SELECT 'session' AS kind, to_jsonb(session_row) AS value
      FROM campaign_os.wallet_sessions AS session_row
    ) AS material
  `);
  return result.rows[0]?.material ?? [];
};

const collectStringValues = (value: unknown): string[] => {
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap(collectStringValues);
  }
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap(collectStringValues);
  }
  return [];
};

const allocateLoopbackPort = async (): Promise<number> => {
  const server = createNetServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = (server.address() as AddressInfo).port;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
  return port;
};

const requiredSessionData = (result: HttpResult<SessionProjection>): SessionProjection => {
  if (!result.body.data) {
    throw new Error("Expected a safe session projection.");
  }
  return result.body.data;
};

postgresAcceptance("required PostgreSQL wallet authentication runtime and cryptographic acceptance", () => {
  const freshDatabaseName = disposableDatabaseName("stage_fresh");
  const runtimeDatabaseName = disposableDatabaseName("runtime");
  let adminPool: pg.Pool | undefined;
  let freshDatabaseUrl = "";
  let freshPool: pg.Pool | undefined;
  let runtimePool: pg.Pool | undefined;
  let runtimeDatabaseUrl = "";
  let migrations: PostgresMigrationDefinition[] = [];
  let freshMigrationIds: readonly string[] = [];
  let historicalPendingIds: readonly string[] = [];
  let historicalBytesBefore = "";
  let historicalBytesAfter = "";

  const requiredRuntimePool = (): pg.Pool => {
    if (!runtimePool) {
      throw new Error("Runtime acceptance pool is unavailable.");
    }
    return runtimePool;
  };

  const requiredAdminPool = (): pg.Pool => {
    if (!adminPool) {
      throw new Error("Runtime acceptance admin pool is unavailable.");
    }
    return adminPool;
  };

  beforeAll(async () => {
    adminPool = createPool(TEST_DATABASE_URL!, 4);
    await adminPool.query(`CREATE DATABASE "${freshDatabaseName}"`);
    await adminPool.query(`CREATE DATABASE "${runtimeDatabaseName}"`);
    freshDatabaseUrl = isolatedDatabaseUrl(TEST_DATABASE_URL!, freshDatabaseName);
    runtimeDatabaseUrl = isolatedDatabaseUrl(TEST_DATABASE_URL!, runtimeDatabaseName);
    freshPool = createPool(freshDatabaseUrl, 4);
    runtimePool = createPool(runtimeDatabaseUrl, 32);
    migrations = await loadPostgresMigrations();

    const freshResult = await runPostgresMigrations({
      approved: true,
      migrations,
      mode: "apply",
      pool: freshPool,
      traceId: "trace-wp08-fresh-migrations",
    });
    freshMigrationIds = freshResult.appliedMigrationIds;
    await freshPool.end();
    freshPool = undefined;

    await runPostgresMigrations({
      approved: true,
      migrations: migrations.slice(0, 4),
      mode: "apply",
      pool: runtimePool,
      traceId: "trace-wp08-m243-migrations",
    });
    await seedM243History(runtimePool);
    historicalBytesBefore = await historicalBytes(runtimePool);
    const plan = await runPostgresMigrations({
      migrations: migrations.slice(0, 5),
      mode: "plan",
      pool: runtimePool,
      traceId: "trace-wp08-plan-0005",
    });
    historicalPendingIds = plan.pendingMigrationIds;
    await runPostgresMigrations({
      approved: true,
      migrations: migrations.slice(0, 5),
      mode: "apply",
      pool: runtimePool,
      traceId: "trace-wp08-apply-0005",
    });
    historicalBytesAfter = await historicalBytes(runtimePool);
  }, 60_000);

  beforeEach(async () => {
    await truncateAuthentication(requiredRuntimePool());
  });

  afterEach(async () => {
    await Promise.all([...openServers].map(async (server) => {
      try {
        await server.stop();
      } finally {
        openServers.delete(server);
      }
    }));
    await Promise.all([...openSandboxes].map(async (sandbox) => {
      try {
        await sandbox.close();
      } finally {
        openSandboxes.delete(sandbox);
      }
    }));
  });

  afterAll(async () => {
    await Promise.all([...openServers].map((server) => server.stop().catch(() => undefined)));
    openServers.clear();
    await Promise.all([...openSandboxes].map((sandbox) => sandbox.close().catch(() => undefined)));
    openSandboxes.clear();
    await freshPool?.end();
    freshPool = undefined;
    await runtimePool?.end();
    runtimePool = undefined;
    if (adminPool) {
      await adminPool.query(`DROP DATABASE IF EXISTS "${freshDatabaseName}" WITH (FORCE)`);
      await adminPool.query(`DROP DATABASE IF EXISTS "${runtimeDatabaseName}" WITH (FORCE)`);
      await adminPool.end();
      adminPool = undefined;
    }
  }, 60_000);

  it("applies fresh 0001-0006 and adds only 0005 to the M243 fixture without changing historical bytes", () => {
    expect(migrations.map(({ id }) => id)).toEqual([
      "0001_campaign_runtime",
      "0002_admin_review_export",
      "0003_admin_review_rank_projection",
      "0004_live_provider_task_verification",
      "0005_participant_wallet_authentication",
      "0006_durable_task_template_catalog",
    ]);
    expect(freshMigrationIds).toEqual(migrations.map(({ id }) => id));
    expect(historicalPendingIds).toEqual(["0005_participant_wallet_authentication"]);
    expect(historicalBytesAfter).toBe(historicalBytesBefore);
  });

  it("starts the unmocked Stage launcher on PostgreSQL and releases every owned connection", async () => {
    const sourceUrl = new URL(freshDatabaseUrl);
    const safeStageUrl = new URL(freshDatabaseUrl);
    safeStageUrl.username = "";
    safeStageUrl.password = "";
    safeStageUrl.search = "";
    safeStageUrl.hash = "";
    const apiPort = await allocateLoopbackPort();
    expect([5193, 5195]).not.toContain(apiPort);

    const previousPgUser = process.env.PGUSER;
    const previousPgPassword = process.env.PGPASSWORD;
    if (sourceUrl.username) {
      process.env.PGUSER = decodeURIComponent(sourceUrl.username);
    }
    if (sourceUrl.password) {
      process.env.PGPASSWORD = decodeURIComponent(sourceUrl.password);
    }

    let stage: Awaited<ReturnType<typeof startWalletAuthenticationStageRuntime>> | undefined;
    try {
      stage = await startWalletAuthenticationStageRuntime({
        env: {
          CAMPAIGN_OS_API_HOST: "127.0.0.1",
          CAMPAIGN_OS_API_PORT: String(apiPort),
          CAMPAIGN_OS_CAMPAIGN_DB_MODE: "postgres",
          CAMPAIGN_OS_DATABASE_SSL_MODE: "disable",
          CAMPAIGN_OS_DATABASE_URL: safeStageUrl.toString(),
          CAMPAIGN_OS_STAGE_DISPOSABLE_DATABASE_ACK: "disposable-stage-approved",
          CAMPAIGN_OS_WALLET_AUTH_ALLOWED_ORIGINS: ORIGIN,
          CAMPAIGN_OS_WALLET_AUTH_ALLOW_INSECURE_LOOPBACK_COOKIE: "1",
          CAMPAIGN_OS_WALLET_AUTH_BINDINGS_JSON: JSON.stringify([eoaBinding]),
          CAMPAIGN_OS_WALLET_AUTH_COOKIE_PATH: "/",
          CAMPAIGN_OS_WALLET_AUTH_COOKIE_SAME_SITE: "lax",
          CAMPAIGN_OS_WALLET_AUTH_COOKIE_SECURE: "0",
          CAMPAIGN_OS_WALLET_AUTH_CSRF_SECRET: "required-stage-csrf-secret-32-bytes",
          CAMPAIGN_OS_WALLET_AUTH_ENABLED: "1",
          CAMPAIGN_OS_WALLET_AUTH_ENVIRONMENT: "stage",
          CAMPAIGN_OS_WALLET_AUTH_SHUTDOWN_TIMEOUT_MS: "9000",
        },
      });
      expect(stage.url).toBe(`http://127.0.0.1:${apiPort}`);
      expect(stage.getState()).toMatchObject({
        environment: "stage",
        lifecycle: "ready",
        migration: { appliedRequiredMigration: true, pendingCount: 0, status: "ready" },
        productionReady: false,
        stageReady: true,
        walletAuthentication: { accepting: true, bindingCount: 1 },
      });
      const health = await fetch(`${stage.url}/api/health`);
      expect({ body: await health.json(), status: health.status }).toMatchObject({
        body: { ok: true },
        status: 200,
      });

      const startedAt = Date.now();
      await stage.close();
      expect(Date.now() - startedAt).toBeLessThanOrEqual(10_000);
      expect(stage.getState()).toMatchObject({ lifecycle: "closed", stageReady: false });
      await expect(fetch(`${stage.url}/api/health`)).rejects.toBeDefined();

      const activityDeadline = Date.now() + 10_000;
      let activeConnectionCount = Number.POSITIVE_INFINITY;
      do {
        const result = await requiredAdminPool().query<{ count: string }>(
          "SELECT COUNT(*)::text AS count FROM pg_stat_activity WHERE datname = $1",
          [freshDatabaseName],
        );
        activeConnectionCount = Number(result.rows[0]?.count);
        if (activeConnectionCount > 0) {
          await new Promise((resolve) => setTimeout(resolve, 25));
        }
      } while (activeConnectionCount > 0 && Date.now() < activityDeadline);
      expect(activeConnectionCount).toBe(0);
    } finally {
      await stage?.close().catch(() => undefined);
      if (previousPgUser === undefined) {
        delete process.env.PGUSER;
      } else {
        process.env.PGUSER = previousPgUser;
      }
      if (previousPgPassword === undefined) {
        delete process.env.PGPASSWORD;
      } else {
        process.env.PGPASSWORD = previousPgPassword;
      }
    }
  }, 30_000);

  it("recovers an exact ephemeral EOA proof and atomically permits one of 20 session deliveries", async () => {
    const live = await startLiveServer(runtimeDatabaseUrl);
    const signer = AElf.wallet.ellipticEc.genKeyPair({ entropy: randomBytes(32) });
    const address = AElf.wallet.getAddressFromPubKey(signer.getPublic());
    const challenge = await issueChallenge(live.handle, {
      adapterId: "portkey-discover-eoa",
      traceId: "trace-wp08-eoa-race-challenge",
      walletAddress: address,
    });
    const request = sessionRequest(challenge, signer);
    const results = await Promise.all(Array.from({ length: 20 }, (_, index) =>
      verifySession(live.handle, request, `trace-wp08-eoa-race-${index}`)));
    const authenticated = results.filter(({ response }) => response.status === 201);
    const replayed = results.filter(({ response }) => response.status !== 201);
    const credentialDeliveries = results.filter(({ response }) => setCookie(response) !== undefined);

    expect(results.map(({ body, response }) => ({ code: body.error?.code, status: response.status })))
      .toContainEqual({ code: undefined, status: 201 });
    expect(authenticated).toHaveLength(1);
    expect(replayed).toHaveLength(19);
    expect(credentialDeliveries).toHaveLength(1);
    for (const replay of replayed) {
      const expected = replay.response.status === 409
        ? {
          diagnosticCode: "WALLET_AUTH_RUNTIME_CONFLICT",
          publicCode: "AUTH_CONFLICT",
        }
        : replay.response.status === 401
          ? {
            diagnosticCode: "WALLET_AUTH_RUNTIME_PROOF_REJECTED",
            publicCode: "AUTH_PROOF_INVALID",
          }
          : undefined;
      expect(expected).toBeDefined();
      expect(replay.body).toMatchObject({
        error: {
          code: expected?.publicCode,
          details: { diagnosticCode: expected?.diagnosticCode },
        },
        ok: false,
      });
      expect(setCookie(replay.response)).toBeUndefined();
    }
    expect(requiredSessionData(authenticated[0]).session).toMatchObject({
      accountType: "EOA",
      status: "active",
      walletAddress: address,
    });
    expect(await authenticationCounts(requiredRuntimePool())).toEqual({
      active_sessions: 1,
      challenges: 1,
      sessions: 1,
    });

    const columns = await requiredRuntimePool().query(
      `SELECT table_name, column_name
       FROM information_schema.columns
       WHERE table_schema = 'campaign_os' AND table_name = ANY($1::text[])
       ORDER BY table_name, ordinal_position`,
      [[...AUTH_TABLES]],
    );
    const columnNames = columns.rows.map(({ column_name }) => String(column_name));
    expect(columnNames).toEqual(expect.arrayContaining([
      "credential_digest",
      "csrf_token_digest",
      "message_digest",
      "nonce_digest",
      "proof_digest",
    ]));
    expect(columnNames.filter((name) =>
      /(?:^|_)(?:raw|plaintext|message|nonce|signature|private_key|csrf_token|credential)$/.test(name)
      && !name.endsWith("_digest"))).toEqual([]);

    const successful = authenticated[0];
    const rawCookie = setCookie(successful.response)?.split(";", 1)[0]?.split("=", 2)[1];
    const rawCsrf = requiredSessionData(successful).csrfToken;
    const rawSignature = String(request.signature);
    const rawNonce = String(request.nonce);
    const persisted = await databaseMaterial(requiredRuntimePool());
    const persistedStringValues = collectStringValues(persisted);
    for (const raw of [challenge.message, rawNonce, rawSignature, rawCookie, rawCsrf]) {
      expect(typeof raw === "string" && raw.length > 0).toBe(true);
      expect(persistedStringValues.some((value) => value.includes(raw as string))).toBe(false);
    }
    expect(JSON.stringify(persisted)).not.toMatch(
      /private[_-]?key|raw[_-]?(?:credential|proof|signature)/i,
    );
  }, 30_000);

  it("rejects wrong EOA hash, encoding, domain and address without creating a session", async () => {
    const live = await startLiveServer(runtimeDatabaseUrl);
    const signer = AElf.wallet.ellipticEc.genKeyPair({ entropy: randomBytes(32) });
    const otherSigner = AElf.wallet.ellipticEc.genKeyPair({ entropy: randomBytes(32) });
    const address = AElf.wallet.getAddressFromPubKey(signer.getPublic());
    const cases = ["hash", "encoding", "domain", "address"] as const;

    for (const [index, kind] of cases.entries()) {
      const challenge = await issueChallenge(live.handle, {
        adapterId: "portkey-discover-eoa",
        traceId: `trace-wp08-eoa-negative-${index}-challenge`,
        walletAddress: address,
      });
      const valid = sessionRequest(challenge, signer);
      let body: Record<string, unknown>;
      if (kind === "hash") {
        const digestHex = AElf.utils.sha256(new TextEncoder().encode(challenge.message));
        body = {
          ...valid,
          signature: Buffer.from(AElf.wallet.sign(digestHex, signer)).toString("hex"),
        };
      } else if (kind === "encoding") {
        const signature = String(valid.signature);
        body = { ...valid, signature: `${signature.slice(0, -2)}04` };
      } else if (kind === "domain") {
        const changedMessage = challenge.message.replace(
          "Domain: 127.0.0.1:5193",
          "Domain: localhost:5193",
        );
        body = {
          ...valid,
          message: changedMessage,
          signature: Buffer.from(signExactMessage(changedMessage, signer)).toString("hex"),
        };
      } else {
        body = sessionRequest(challenge, otherSigner);
      }
      const rejected = await verifySession(live.handle, body, `trace-wp08-eoa-negative-${index}`);
      expectAuthenticationFailure(rejected, {
        diagnosticCode: "WALLET_AUTH_RUNTIME_PROOF_REJECTED",
        publicCode: "AUTH_PROOF_INVALID",
        status: 401,
      }, kind);
    }

    expect((await authenticationCounts(requiredRuntimePool())).sessions).toBe(0);
  }, 30_000);

  it("restores across restart and shares current, rotate and revoke state between live instances", async () => {
    const runtimeA = await startLiveServer(runtimeDatabaseUrl);
    const runtimeB = await startLiveServer(runtimeDatabaseUrl);
    const issued = await createEoaSession(runtimeA.handle, "trace-wp08-shared");
    const sessionId = issued.response.session.sessionId;

    expect((await currentSession(runtimeB.handle, issued.cookie, "trace-wp08-current-b")).response.status)
      .toBe(200);
    const stopDuration = await stopServer(runtimeA.handle);
    expect(stopDuration).toBeLessThanOrEqual(10_000);

    const runtimeC = await startLiveServer(runtimeDatabaseUrl);
    const restoreStartedAt = Date.now();
    const restored = await currentSession(runtimeC.handle, issued.cookie, "trace-wp08-current-c");
    expect(restored.response.status).toBe(200);
    expect(Date.now() - restoreStartedAt).toBeLessThan(1_000);

    const rotated = await rotateSession(
      runtimeC.handle,
      issued.cookie,
      issued.response.csrfToken,
      "trace-wp08-rotate-c",
    );
    expect(rotated.response.status).toBe(200);
    const rotatedCookie = setCookie(rotated.response);
    if (!rotatedCookie) {
      throw new Error("Rotation did not return its replacement cookie.");
    }
    expect((await currentSession(runtimeB.handle, issued.cookie, "trace-wp08-old-cookie-b")).response.status)
      .toBe(401);
    expect((await currentSession(runtimeB.handle, rotatedCookie, "trace-wp08-new-cookie-b")).response.status)
      .toBe(200);

    await expect(runtimeB.runtime.revokeSession({
      reasonCode: "ADMIN_REVOKED",
      sessionId,
      traceId: "trace-wp08-revoke-b",
    })).resolves.toEqual({ status: "revoked" });
    expect((await currentSession(runtimeC.handle, rotatedCookie, "trace-wp08-revoked-c")).response.status)
      .toBe(401);

    await stopServer(runtimeB.handle);
    await stopServer(runtimeC.handle);
    const runtimeD = await startLiveServer(runtimeDatabaseUrl);
    expect((await currentSession(runtimeD.handle, rotatedCookie, "trace-wp08-revoked-restart-d"))
      .response.status).toBe(401);
  }, 30_000);

  it("accepts Portkey manager plus current CA relation and rejects relation/provider negatives", async () => {
    const manager = AElf.wallet.ellipticEc.genKeyPair({ entropy: randomBytes(32) });
    const ca = AElf.wallet.ellipticEc.genKeyPair({ entropy: randomBytes(32) });
    const managerAddress = AElf.wallet.getAddressFromPubKey(manager.getPublic());
    const caAddress = AElf.wallet.getAddressFromPubKey(ca.getPublic());
    const caHash = createHash("sha256").update(randomBytes(32)).digest("hex");
    const fixture = {
      blockHeight: 42_000,
      caAddress,
      caHash,
      chainId: "AELF" as const,
      managerAddress,
      observedAt: new Date().toISOString(),
      relationRevision: `revision-${randomBytes(8).toString("hex")}`,
      relationVersion: 7,
    };
    const sandbox = await startSandbox({ fixture, port: 0, timeoutFixtureMs: 300 });
    const validRuntime = await startLiveServer(runtimeDatabaseUrl, sandbox.relationUrl);
    const validChallenge = await issueChallenge(validRuntime.handle, {
      adapterId: "portkey-aa",
      caHash,
      traceId: "trace-wp08-aa-valid-challenge",
      walletAddress: caAddress,
    });
    const valid = await verifySession(
      validRuntime.handle,
      sessionRequest(validChallenge, manager),
      "trace-wp08-aa-valid",
    );
    expect({ body: valid.body, status: valid.response.status }).toMatchObject({
      body: { ok: true },
      status: 201,
    });
    expect(requiredSessionData(valid).session).toMatchObject({
      accountType: "AA",
      status: "active",
      walletAddress: caAddress,
    });
    expect(sandbox.count("current")).toBe(1);
    await stopServer(validRuntime.handle);

    const negativeScenarios = [
      { diagnosticCode: "WALLET_AUTH_RUNTIME_PROOF_REJECTED", publicCode: "AUTH_PROOF_INVALID", scenario: "wrong-manager", status: 401 },
      { diagnosticCode: "WALLET_AUTH_RUNTIME_PROOF_REJECTED", publicCode: "AUTH_PROOF_INVALID", scenario: "wrong-ca-address", status: 401 },
      { diagnosticCode: "WALLET_AUTH_RUNTIME_PROOF_REJECTED", publicCode: "AUTH_PROOF_INVALID", scenario: "wrong-ca-hash", status: 401 },
      { diagnosticCode: "WALLET_AUTH_RUNTIME_PROOF_REJECTED", publicCode: "AUTH_PROOF_INVALID", scenario: "wrong-chain", status: 401 },
      { diagnosticCode: "WALLET_AUTH_RUNTIME_PROOF_REJECTED", publicCode: "AUTH_PROOF_INVALID", scenario: "unknown", status: 401 },
      { diagnosticCode: "WALLET_AUTH_RUNTIME_PROOF_REJECTED", publicCode: "AUTH_PROOF_INVALID", scenario: "stale-time", status: 401 },
      { diagnosticCode: "WALLET_AUTH_RUNTIME_PROOF_UNAVAILABLE", publicCode: "AUTH_DEPENDENCY_UNAVAILABLE", scenario: "429", status: 503 },
      { diagnosticCode: "WALLET_AUTH_RUNTIME_PROOF_UNAVAILABLE", publicCode: "AUTH_DEPENDENCY_UNAVAILABLE", scenario: "5xx", status: 503 },
      { diagnosticCode: "WALLET_AUTH_RUNTIME_PROOF_UNAVAILABLE", publicCode: "AUTH_DEPENDENCY_UNAVAILABLE", scenario: "malformed", status: 503 },
      { diagnosticCode: "WALLET_AUTH_RUNTIME_PROOF_UNAVAILABLE", publicCode: "AUTH_DEPENDENCY_UNAVAILABLE", scenario: "timeout", status: 503 },
    ] as const satisfies readonly Readonly<{
      diagnosticCode: "WALLET_AUTH_RUNTIME_PROOF_REJECTED" | "WALLET_AUTH_RUNTIME_PROOF_UNAVAILABLE";
      publicCode: "AUTH_DEPENDENCY_UNAVAILABLE" | "AUTH_PROOF_INVALID";
      scenario: PortkeyCaRelationSandboxScenario;
      status: 401 | 503;
    }>[];
    for (const [index, expected] of negativeScenarios.entries()) {
      await truncateAuthentication(requiredRuntimePool());
      const live = await startLiveServer(runtimeDatabaseUrl, sandbox.urlForScenario(expected.scenario));
      const challenge = await issueChallenge(live.handle, {
        adapterId: "portkey-aa",
        caHash,
        traceId: `trace-wp08-aa-${index}-challenge`,
        walletAddress: caAddress,
      });
      const rejected = await verifySession(
        live.handle,
        sessionRequest(challenge, manager),
        `trace-wp08-aa-${index}-verify`,
      );
      expectAuthenticationFailure(rejected, expected, expected.scenario);
      expect((await authenticationCounts(requiredRuntimePool())).sessions).toBe(0);
      await stopServer(live.handle);
    }

    await truncateAuthentication(requiredRuntimePool());
    const outageUrl = sandbox.relationUrl;
    await stopSandbox(sandbox);
    const outageRuntime = await startLiveServer(runtimeDatabaseUrl, outageUrl);
    const outageChallenge = await issueChallenge(outageRuntime.handle, {
      adapterId: "portkey-aa",
      caHash,
      traceId: "trace-wp08-aa-outage-challenge",
      walletAddress: caAddress,
    });
    const outage = await verifySession(
      outageRuntime.handle,
      sessionRequest(outageChallenge, manager),
      "trace-wp08-aa-outage-verify",
    );
    expectAuthenticationFailure(outage, {
      diagnosticCode: "WALLET_AUTH_RUNTIME_PROOF_UNAVAILABLE",
      publicCode: "AUTH_DEPENDENCY_UNAVAILABLE",
      status: 503,
    }, "outage");
    expect((await authenticationCounts(requiredRuntimePool())).sessions).toBe(0);
    const publicCampaigns = await fetchJson<unknown>(
      outageRuntime.handle,
      "/api/campaigns",
      {
        headers: traceHeaders("trace-wp08-aa-outage-public-campaigns"),
        method: "GET",
      },
    );
    expect({ body: publicCampaigns.body, status: publicCampaigns.response.status }).toMatchObject({
      body: { ok: true },
      status: 200,
    });
  }, 60_000);

  it("rolls back a store failure and stops issuance with bounded complete teardown", async () => {
    const live = await startLiveServer(runtimeDatabaseUrl);
    const signer = AElf.wallet.ellipticEc.genKeyPair({ entropy: randomBytes(32) });
    const address = AElf.wallet.getAddressFromPubKey(signer.getPublic());
    const challenge = await issueChallenge(live.handle, {
      adapterId: "portkey-discover-eoa",
      traceId: "trace-wp08-store-rollback-challenge",
      walletAddress: address,
    });

    await requiredRuntimePool().query(
      "ALTER TABLE campaign_os.wallet_sessions RENAME TO wallet_sessions_unavailable",
    );
    try {
      const failed = await verifySession(
        live.handle,
        sessionRequest(challenge, signer),
        "trace-wp08-store-rollback-verify",
      );
      expect(failed.response.status).toBe(503);
      expect(setCookie(failed.response)).toBeUndefined();
    } finally {
      await requiredRuntimePool().query(
        "ALTER TABLE campaign_os.wallet_sessions_unavailable RENAME TO wallet_sessions",
      );
    }

    const persisted = await requiredRuntimePool().query(
      `SELECT
         (SELECT status FROM campaign_os.wallet_auth_challenges WHERE id = $1) AS challenge_status,
         (SELECT COUNT(*)::integer FROM campaign_os.wallet_sessions) AS sessions`,
      [challenge.challengeId],
    );
    expect(persisted.rows[0]).toEqual({ challenge_status: "issued", sessions: 0 });

    const beforeStop = await authenticationCounts(requiredRuntimePool());
    const duration = await stopServer(live.handle);
    expect(duration).toBeLessThanOrEqual(10_000);
    expect(live.runtime.state()).toMatchObject({
      accepting: false,
      activeOperationCount: 0,
      controllerCount: 0,
    });
    await expect(fetch(`${live.handle.url}/api/wallet/auth/challenges`, {
      body: JSON.stringify({
        adapterId: "portkey-discover-eoa",
        chainId: "AELF",
        network: "testnet",
        walletAddress: address,
      }),
      headers: traceHeaders("trace-wp08-after-stop"),
      method: "POST",
    })).rejects.toBeDefined();
    expect(await authenticationCounts(requiredRuntimePool())).toEqual(beforeStop);
  }, 30_000);
});
