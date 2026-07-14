import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolveCampaignOsCampaignDbConfig } from "./config";
import {
  loadPostgresMigrations,
  runPostgresMigrations,
  type PostgresMigrationPool,
} from "./postgresMigration";
import {
  startCampaignOsApiServer,
  type CampaignOsApiServerHandle,
} from "./server";

const TEST_DATABASE_URL = process.env.CAMPAIGN_OS_TEST_DATABASE_URL?.trim();
const integrationSuite = TEST_DATABASE_URL ? describe : describe.skip;

interface ApiEnvelope<T> {
  data?: T;
  error?: {
    code?: string;
    details?: {
      diagnosticCode?: string;
      operation?: string;
      routeId?: string;
      [key: string]: unknown;
    };
  };
  ok: boolean;
  traceId?: string;
}

interface CampaignCreateData {
  payload: {
    contractMode: string;
    duration: string;
    endTime: string;
    goal: string;
    id: string;
    ownerAddress: string;
    projectId: string;
    required?: boolean;
    rewardDescription: string;
    startTime: string;
    status: string;
    supportedLocales: string[];
    walletPolicy: string;
  };
}

interface CampaignListData {
  payload: {
    campaignDb?: { draftCount: number };
    details?: DetailData["payload"][];
    items: Array<{
      id: string;
      tags?: Array<Record<string, string>>;
    }>;
    summary?: { totalCampaigns: number };
  };
}

interface TaskCreateData {
  campaignDbTask: { taskId: string };
  payload: {
    campaignId: string;
    evidenceRule: Record<string, string | number | boolean>;
    id: string;
    points: number;
    required: boolean;
    templateCode: string;
    verificationType: string;
    walletCompatibility: string;
  };
}

interface GeneratedTasksData {
  payload: {
    campaignId: string;
    humanReviewRequired: boolean;
    taskList: Array<{
      adoptability: "adoptable" | "unsupported";
      evidenceRule: Record<string, string | number | boolean>;
      id: string;
      points: number;
      required: boolean;
      templateCode: string;
      unsupportedReason?: string;
      verificationType: string;
      walletCompatibility: string;
    }>;
  };
}

interface WalletSessionData {
  payload: {
    accountType: string;
    address: string;
    id: string;
    issuer?: {
      issuerMode?: string;
      valid?: boolean;
    };
    proof?: {
      status?: string;
      trustLevel?: string;
    };
    sessionId: string;
    walletSource: string;
  };
}

interface EligibilityData {
  payload: {
    eligible: boolean;
    missingTasks: string[];
    score: number;
  };
}

interface ExportData {
  payload: {
    campaignId: string;
    readyRows: number;
    rows: Array<{
      referrerAddress: string;
      walletAddress: string;
    }>;
  };
}

interface DetailData {
  payload: {
    item: {
      id: string;
      tags: Array<Record<string, string>>;
      title: Record<string, string>;
    };
    tasks: Array<{
      points: number;
      required: boolean;
      taskId: string;
      title: Record<string, string>;
      verificationType: string;
    }>;
  };
}

interface HealthData {
  apiService: {
    workerExecutionEnabled: boolean;
  };
  backendService: {
    providerClientReadiness: {
      liveProviderCallsAttempted: boolean;
      providerClientsEnabled: boolean;
      providerHttpRuntime: {
        liveHttpCallsAttempted: boolean;
      };
      queueHandoff: unknown;
    };
  };
  campaignDatabase: {
    liveConnectionAttempted: boolean;
    liveQueryExecutionEnabled: boolean;
    selectedMode: string;
    status: string;
  };
  persistence: {
    countsByKind: Record<string, number>;
    recordCount: number;
  };
}

interface VerificationData {
  campaignDbCompletion: { completionId: string };
  campaignDbEvidence: { evidenceId: string };
}

const isLoopback = (hostname: string) => {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  return normalized === "localhost" || normalized === "::1" || normalized.startsWith("127.");
};

interface ApiResult<T> {
  envelope: ApiEnvelope<T>;
  status: number;
}

interface IssuedProjectOwnerSession {
  data: WalletSessionData;
  headers: (
    traceId: string,
    overrides?: Record<string, string>,
  ) => Record<string, string>;
}

const percentile95 = (samples: readonly number[]) => {
  const sorted = [...samples].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);

  return sorted[index] ?? Number.POSITIVE_INFINITY;
};

const timestampMillis = (value: unknown) =>
  value instanceof Date ? value.getTime() : Date.parse(String(value));

integrationSuite("PostgreSQL Campaign API runtime", () => {
  const databaseName = `campaign_os_m239_${process.pid}_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const shutdownTimings: number[] = [];
  const timings: number[] = [];
  const servers = new Set<CampaignOsApiServerHandle>();
  let adminPool: pg.Pool;
  let databaseUrl = "";
  let sslMode = "verify-full";

  const recordTiming = async <T>(
    operation: () => Promise<T>,
    timingSamples: number[] = timings,
  ) => {
    const startedAt = performance.now();

    try {
      return await operation();
    } finally {
      timingSamples.push(performance.now() - startedAt);
    }
  };

  const requestApi = async <T>(
    server: CampaignOsApiServerHandle,
    path: string,
    init: RequestInit = {},
    timingSamples: number[] = timings,
  ): Promise<ApiResult<T>> => recordTiming(async () => {
    const response = await fetch(`${server.url}${path}`, init);
    const envelope = await response.json() as ApiEnvelope<T>;

    return { envelope, status: response.status };
  }, timingSamples);

  const requestJson = async <T>(
    server: CampaignOsApiServerHandle,
    path: string,
    init: RequestInit = {},
    timingSamples: number[] = timings,
  ): Promise<T> => {
    const { envelope, status } = await requestApi<T>(server, path, init, timingSamples);

    if (status !== 200 || !envelope.ok || !envelope.data) {
      throw new Error(
        `PostgreSQL integration API request failed with status ${status}`
        + `, code ${envelope.error?.code ?? "unknown"}`
        + `, diagnostic ${envelope.error?.details?.diagnosticCode ?? "unknown"}`
        + `, and operation ${envelope.error?.details?.operation ?? "unknown"}.`,
      );
    }

    return envelope.data;
  };

  const issueProjectOwnerSession = async (
    server: CampaignOsApiServerHandle,
    input: {
      adapterName?: "PortkeyAAWallet" | "PortkeyDiscoverWallet" | "PortkeyExtensionWallet";
      address?: string;
      fixtureId?: string;
      productionRequired?: boolean;
    },
    traceId: string,
  ): Promise<IssuedProjectOwnerSession> => {
    const now = Date.now();
    const body = input.fixtureId
      ? {
          fixtureId: input.fixtureId,
          productionRequired: input.productionRequired,
          proofEvaluatedAt: new Date(now).toISOString(),
          proofIssuedAt: new Date(now - 1_000).toISOString(),
          signature: randomUUID(),
        }
      : {
          adapterName: input.adapterName ?? "PortkeyAAWallet",
          address: input.address,
          chainId: "AELF",
          network: "mainnet",
          productionRequired: input.productionRequired,
          proofEvaluatedAt: new Date(now).toISOString(),
          proofIssuedAt: new Date(now - 1_000).toISOString(),
          signature: randomUUID(),
        };
    const data = await requestJson<WalletSessionData>(server, "/api/wallet/session", {
      body: JSON.stringify(body),
      headers: {
        "content-type": "application/json",
        "x-campaign-os-trace-id": traceId,
      },
      method: "POST",
    });

    expect(data.payload.sessionId).toBe(data.payload.id);
    expect(data.payload.address).not.toHaveLength(0);
    if (!input.productionRequired) {
      expect(data.payload.proof).toMatchObject({ status: "verified" });
      expect(data.payload.issuer).toMatchObject({ valid: true });
    }

    return {
      data,
      headers: (requestTraceId, overrides = {}) => ({
        "content-type": "application/json",
        "x-campaign-os-account-type": data.payload.accountType,
        "x-campaign-os-credential-boundary": "ordinary_user_wallet",
        "x-campaign-os-proof-status": data.payload.proof?.status ?? "proof_required",
        "x-campaign-os-roles": "project_owner",
        "x-campaign-os-session-id": data.payload.sessionId,
        "x-campaign-os-trace-id": requestTraceId,
        "x-campaign-os-wallet-address": data.payload.address,
        "x-campaign-os-wallet-source": data.payload.walletSource,
        ...overrides,
      }),
    };
  };

  const startServer = async (
    selectedDatabaseUrl = databaseUrl,
    connectTimeoutMs = "5000",
  ) => {
    const server = await startCampaignOsApiServer({
      env: {
        CAMPAIGN_OS_CAMPAIGN_DB_MODE: "postgres",
        CAMPAIGN_OS_DATABASE_CONNECT_TIMEOUT_MS: connectTimeoutMs,
        CAMPAIGN_OS_DATABASE_IDLE_TIMEOUT_MS: "5000",
        CAMPAIGN_OS_DATABASE_POOL_MAX: "10",
        CAMPAIGN_OS_DATABASE_SSL_MODE: sslMode,
        CAMPAIGN_OS_DATABASE_URL: selectedDatabaseUrl,
      },
      logger: false,
      port: 0,
      shutdownTimeoutMs: 10_000,
    });

    servers.add(server);
    return server;
  };

  const stopServer = async (server: CampaignOsApiServerHandle) => {
    await recordTiming(() => server.stop(), shutdownTimings);
    servers.delete(server);
  };

  const waitForRuntimeDatabaseConnectionsToClose = async () => {
    const startedAt = performance.now();
    let activeConnectionCount = Number.POSITIVE_INFINITY;

    while (performance.now() - startedAt <= 10_000) {
      const result = await adminPool.query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM pg_stat_activity WHERE datname = $1",
        [databaseName],
      );
      activeConnectionCount = Number(result.rows[0]?.count ?? Number.POSITIVE_INFINITY);
      if (activeConnectionCount === 0) {
        return performance.now() - startedAt;
      }

      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    throw new Error(
      `PostgreSQL runtime pool did not close within 10000 ms (${activeConnectionCount} connections remain).`,
    );
  };

  const createAuditPool = () => {
    const config = resolveCampaignOsCampaignDbConfig({
      databaseUrl,
      env: {},
      mode: "postgres",
      sslMode,
    });

    if (config.mode !== "postgres") {
      throw new Error("PostgreSQL audit config did not resolve PostgreSQL mode.");
    }

    return new pg.Pool(config.pool);
  };

  const readCampaignSnapshot = async (pool: pg.Pool, campaignId: string) => {
    const [campaigns, tasks, participants, completions, evidence, referrals] = await Promise.all([
      pool.query(
        `
          SELECT
            id,
            project_id,
            owner_address,
            status,
            default_locale,
            supported_locales,
            wallet_policy,
            contract_mode,
            goal,
            duration,
            reward_description,
            start_time,
            end_time,
            created_at,
            updated_at
          FROM campaign_os.campaigns
          WHERE id = $1
          ORDER BY id
        `,
        [campaignId],
      ),
      pool.query(
        `
          SELECT
            id,
            campaign_id,
            template_code,
            verification_type,
            wallet_compatibility,
            points,
            required,
            evidence_rule,
            created_at,
            updated_at
          FROM campaign_os.campaign_tasks
          WHERE campaign_id = $1
          ORDER BY id
        `,
        [campaignId],
      ),
      pool.query(
        `
          SELECT id, campaign_id, wallet_address, total_points, wallet_type_verified, created_at, updated_at
          FROM campaign_os.campaign_participants
          WHERE campaign_id = $1
          ORDER BY wallet_address
        `,
        [campaignId],
      ),
      pool.query(
        `
          SELECT id, campaign_id, task_id, wallet_address, status, points_awarded, created_at, updated_at
          FROM campaign_os.campaign_task_completions
          WHERE campaign_id = $1
          ORDER BY wallet_address, task_id
        `,
        [campaignId],
      ),
      pool.query(
        `
          SELECT id, campaign_id, task_id, wallet_address, completion_id, evidence_hash, created_at, updated_at
          FROM campaign_os.campaign_task_evidence
          WHERE campaign_id = $1
          ORDER BY wallet_address, task_id
        `,
        [campaignId],
      ),
      pool.query(
        `
          SELECT id, campaign_id, invitee_wallet_address, referrer_wallet_address, status, created_at, updated_at
          FROM campaign_os.campaign_referral_bindings
          WHERE campaign_id = $1
          ORDER BY invitee_wallet_address
        `,
        [campaignId],
      ),
    ]);

    return {
      campaigns: campaigns.rows,
      completions: completions.rows,
      evidence: evidence.rows,
      participants: participants.rows,
      referrals: referrals.rows,
      tasks: tasks.rows,
    };
  };

  beforeAll(async () => {
    const baseUrl = new URL(TEST_DATABASE_URL!);
    sslMode = process.env.CAMPAIGN_OS_DATABASE_SSL_MODE?.trim()
      || (isLoopback(baseUrl.hostname) ? "disable" : "verify-full");
    const baseConfig = resolveCampaignOsCampaignDbConfig({
      databaseUrl: TEST_DATABASE_URL,
      env: {},
      mode: "postgres",
      sslMode,
    });

    if (baseConfig.mode !== "postgres") {
      throw new Error("PostgreSQL integration config did not resolve PostgreSQL mode.");
    }

    adminPool = new pg.Pool(baseConfig.pool);
    if (!/^[a-z0-9_]+$/.test(databaseName)) {
      throw new Error("Generated PostgreSQL integration database name is invalid.");
    }
    await adminPool.query(`CREATE DATABASE "${databaseName}"`);

    const isolatedUrl = new URL(TEST_DATABASE_URL!);
    isolatedUrl.pathname = `/${databaseName}`;
    isolatedUrl.search = "";
    databaseUrl = isolatedUrl.toString();
    const isolatedConfig = resolveCampaignOsCampaignDbConfig({
      databaseUrl,
      env: {},
      mode: "postgres",
      sslMode,
    });
    if (isolatedConfig.mode !== "postgres") {
      throw new Error("Isolated PostgreSQL integration config did not resolve PostgreSQL mode.");
    }

    const migrationPool = new pg.Pool(isolatedConfig.pool);
    const migrationAdapter: PostgresMigrationPool = {
      connect: async () => {
        const client = await migrationPool.connect();

        return {
          query: async (text, values = []) => {
            const result = await client.query(text, [...values]);

            return { rows: result.rows as Array<Record<string, unknown>> };
          },
          release: () => client.release(),
        };
      },
      end: async () => migrationPool.end(),
    };

    try {
      const migration = await runPostgresMigrations({
        approved: true,
        migrations: await loadPostgresMigrations(),
        mode: "apply",
        pool: migrationAdapter,
        traceId: "m239-postgres-runtime-integration-migration",
      });

      expect(migration.status).toBe("ready");
      expect(migration.pendingMigrationIds).toEqual([]);
    } finally {
      await migrationPool.end();
    }
  }, 60_000);

  afterAll(async () => {
    const cleanupErrors: unknown[] = [];
    const stopResults = await Promise.allSettled(
      Array.from(servers, (server) => server.stop()),
    );
    cleanupErrors.push(...stopResults
      .filter((result): result is PromiseRejectedResult => result.status === "rejected")
      .map((result) => result.reason));
    servers.clear();

    if (adminPool) {
      try {
        await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
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
      throw new Error(`PostgreSQL integration cleanup failed (${cleanupErrors.length} errors).`);
    }
  }, 60_000);

  it("recovers exact Owner Campaign and Task identities after a full PostgreSQL runtime restart", async () => {
    const runtimeWriteWindowStartedAt = Date.now();
    const firstServer = await startServer();
    const sessionA = await issueProjectOwnerSession(
      firstServer,
      { fixtureId: "sess-eoa-app-001" },
      "trace-pg-session-a",
    );
    const ownerAddress = sessionA.data.payload.address;
    const created = await requestJson<CampaignCreateData>(firstServer, "/api/campaigns", {
      body: JSON.stringify({
        contractMode: "OFF_CHAIN_MVP",
        defaultLocale: "en-US",
        duration: "2026-08-01/2026-08-14",
        endTime: "2026-08-14T23:59:59Z",
        goal: "Review PostgreSQL restart recovery",
        ownerAddress,
        projectId: "postgres-restart-project",
        rewardDescription: "PostgreSQL-backed review rewards.",
        startTime: "2026-08-01T00:00:00Z",
        supportedLocales: ["en-US", "zh-CN"],
        walletPolicy: "ANY",
      }),
      headers: sessionA.headers("trace-pg-runtime-create"),
      method: "POST",
    });
    const campaignId = created.payload.id;
    const task = await requestJson<TaskCreateData>(firstServer, `/api/campaigns/${campaignId}/tasks`, {
      body: JSON.stringify({
        evidenceRule: { minAmount: 1, source: "AELFSCAN" },
        points: 120,
        required: true,
        templateCode: "bridge_ebridge",
        verificationType: "ON_CHAIN",
        walletCompatibility: "ANY",
      }),
      headers: sessionA.headers("trace-pg-runtime-task"),
      method: "POST",
    });
    const taskId = task.campaignDbTask.taskId;
    const previewDbBefore = await (async () => {
      const pool = createAuditPool();

      try {
        return await readCampaignSnapshot(pool, campaignId);
      } finally {
        await pool.end();
      }
    })();
    const previewHealthBefore = await requestJson<HealthData>(firstServer, "/api/health");
    const generated = await requestJson<GeneratedTasksData>(
      firstServer,
      `/api/campaigns/${campaignId}/tasks/generate`,
      {
        body: JSON.stringify({
          goal: created.payload.goal,
          product: "Campaign OS",
          targetUsers: ["project owners"],
          walletPolicy: created.payload.walletPolicy,
        }),
        headers: sessionA.headers("trace-pg-runtime-generate"),
        method: "POST",
      },
    );
    const supportedSuggestion = generated.payload.taskList.find(
      (suggestion) => suggestion.adoptability === "adoptable" && !suggestion.required,
    ) ?? generated.payload.taskList.find((suggestion) => suggestion.adoptability === "adoptable");
    const referralSuggestion = generated.payload.taskList.find(
      (suggestion) => suggestion.verificationType === "REFERRAL",
    );

    expect(supportedSuggestion).toBeDefined();
    expect(referralSuggestion).toMatchObject({
      adoptability: "unsupported",
      unsupportedReason: "REFERRAL_TASK_ADD_UNSUPPORTED",
    });

    const referralBypass = await requestApi(
      firstServer,
      `/api/campaigns/${campaignId}/tasks`,
      {
        body: JSON.stringify({
          evidenceRule: referralSuggestion?.evidenceRule ?? { source: "REFERRAL" },
          points: referralSuggestion?.points ?? 25,
          required: referralSuggestion?.required ?? false,
          templateCode: referralSuggestion?.templateCode ?? "invite_friend",
          verificationType: "REFERRAL",
          walletCompatibility: referralSuggestion?.walletCompatibility ?? "ANY",
        }),
        headers: sessionA.headers("trace-pg-runtime-referral-bypass"),
        method: "POST",
      },
    );
    const previewHealthAfter = await requestJson<HealthData>(firstServer, "/api/health");
    const previewDbAfter = await (async () => {
      const pool = createAuditPool();

      try {
        return await readCampaignSnapshot(pool, campaignId);
      } finally {
        await pool.end();
      }
    })();

    expect(generated.payload).toMatchObject({
      campaignId,
      humanReviewRequired: true,
    });
    expect(previewDbAfter).toEqual(previewDbBefore);
    expect(previewHealthAfter.persistence).toEqual(previewHealthBefore.persistence);
    expect(previewHealthAfter.backendService.providerClientReadiness).toEqual(
      previewHealthBefore.backendService.providerClientReadiness,
    );
    expect(previewHealthAfter.apiService.workerExecutionEnabled).toBe(false);
    expect(previewHealthAfter.backendService.providerClientReadiness).toMatchObject({
      liveProviderCallsAttempted: false,
      providerClientsEnabled: false,
      providerHttpRuntime: { liveHttpCallsAttempted: false },
    });
    expect(referralBypass).toMatchObject({
      status: 400,
      envelope: {
        ok: false,
        traceId: "trace-pg-runtime-referral-bypass",
        error: {
          code: "INVALID_REQUEST",
          details: { field: "verificationType" },
        },
      },
    });

    if (!supportedSuggestion) {
      throw new Error("Expected at least one supported generated Task suggestion.");
    }
    const adoptedTask = await requestJson<TaskCreateData>(
      firstServer,
      `/api/campaigns/${campaignId}/tasks`,
      {
        body: JSON.stringify({
          evidenceRule: supportedSuggestion.evidenceRule,
          points: supportedSuggestion.points,
          required: supportedSuggestion.required,
          templateCode: supportedSuggestion.templateCode,
          verificationType: supportedSuggestion.verificationType,
          walletCompatibility: supportedSuggestion.walletCompatibility,
        }),
        headers: sessionA.headers("trace-pg-runtime-adopt"),
        method: "POST",
      },
    );
    const adoptedTaskId = adoptedTask.campaignDbTask.taskId;
    const walletAddress = "2F4PostgresRestartWallet";

    await requestJson(firstServer, `/api/tasks/${taskId}/verify`, {
      body: JSON.stringify({
        accountType: "EOA",
        campaignId,
        walletAddress,
        walletSource: "PORTKEY_EOA_EXTENSION",
      }),
      headers: {
        "content-type": "application/json",
        "x-campaign-os-trace-id": "trace-pg-runtime-verify",
      },
      method: "POST",
    });
    const eligibility = await requestJson<EligibilityData>(
      firstServer,
      `/api/campaigns/${campaignId}/eligibility?address=${walletAddress}&accountType=EOA&walletSource=PORTKEY_EOA_EXTENSION`,
    );
    const exportPreview = await requestJson<ExportData>(firstServer, `/api/campaigns/${campaignId}/export`, {
      body: JSON.stringify({
        contractRootMode: "none",
        format: "json",
        includeLocalePreference: true,
        includeRiskFlags: true,
        includeWalletType: true,
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    expect(campaignId).toMatch(/^campaign-[0-9a-f-]{36}$/);
    expect(taskId).toMatch(/^campaign-task-[0-9a-f-]{36}$/);
    expect(adoptedTaskId).toMatch(/^campaign-task-[0-9a-f-]{36}$/);
    expect(adoptedTaskId).not.toBe(taskId);
    expect(task.payload.id).toBe(taskId);
    expect(adoptedTask.payload.id).toBe(adoptedTaskId);
    expect(eligibility.payload).toMatchObject({ eligible: true, missingTasks: [], score: 120 });
    expect(exportPreview.payload).toMatchObject({ campaignId, readyRows: 1 });
    const referralId = `referral-binding-${randomUUID()}`;
    const beforeRestartSnapshot = await (async () => {
      const pool = createAuditPool();

      try {
        await pool.query(
          `
            INSERT INTO campaign_os.campaign_referral_bindings (
              id,
              campaign_id,
              invitee_wallet_address,
              invitee_account_type,
              invitee_wallet_source,
              referrer_wallet_address,
              referrer_account_type,
              referrer_wallet_source,
              qualified_action_completed,
              qualified_action_completed_at,
              qualified_action_evidence_hash,
              status,
              risk_flags,
              created_at,
              updated_at
            )
            VALUES (
              $1, $2, $3, 'EOA', 'PORTKEY_EOA_EXTENSION', $4,
              'EOA', 'PORTKEY_EOA_EXTENSION', false, NULL, NULL,
              'pending', '[]'::jsonb, $5, $5
            )
          `,
          [
            referralId,
            campaignId,
            walletAddress,
            "2F4PostgresReferrerWallet",
            "2026-07-13T00:00:00.000Z",
          ],
        );

        return await readCampaignSnapshot(pool, campaignId);
      } finally {
        await pool.end();
      }
    })();

    expect(beforeRestartSnapshot).toMatchObject({
      campaigns: [expect.objectContaining({
        contract_mode: created.payload.contractMode,
        goal: created.payload.goal,
        id: campaignId,
        owner_address: ownerAddress,
        project_id: created.payload.projectId,
        wallet_policy: created.payload.walletPolicy,
      })],
      completions: [expect.objectContaining({ task_id: taskId, wallet_address: walletAddress })],
      evidence: [expect.objectContaining({ task_id: taskId, wallet_address: walletAddress })],
      participants: [expect.objectContaining({ wallet_address: walletAddress })],
      referrals: [expect.objectContaining({ id: referralId })],
      tasks: expect.arrayContaining([
        expect.objectContaining({
          id: taskId,
          points: task.payload.points,
          required: task.payload.required,
          template_code: task.payload.templateCode,
          verification_type: task.payload.verificationType,
        }),
        expect.objectContaining({
          id: adoptedTaskId,
          points: adoptedTask.payload.points,
          required: adoptedTask.payload.required,
          template_code: adoptedTask.payload.templateCode,
          verification_type: adoptedTask.payload.verificationType,
        }),
      ]),
    });
    expect(beforeRestartSnapshot.tasks).toHaveLength(2);
    const runtimeWriteRows = [
      beforeRestartSnapshot.campaigns[0],
      beforeRestartSnapshot.tasks[0],
      beforeRestartSnapshot.tasks[1],
      beforeRestartSnapshot.participants[0],
      beforeRestartSnapshot.completions[0],
      beforeRestartSnapshot.evidence[0],
    ];
    const runtimeWriteWindowEndedAt = Date.now();

    for (const row of runtimeWriteRows) {
      const createdAt = timestampMillis(row?.created_at);
      const updatedAt = timestampMillis(row?.updated_at);

      expect(Number.isFinite(createdAt)).toBe(true);
      expect(Number.isFinite(updatedAt)).toBe(true);
      expect(createdAt).toBeGreaterThanOrEqual(runtimeWriteWindowStartedAt - 1_000);
      expect(createdAt).toBeLessThanOrEqual(runtimeWriteWindowEndedAt + 1_000);
      expect(updatedAt).toBeGreaterThanOrEqual(createdAt);
    }
    await stopServer(firstServer);
    expect(shutdownTimings[shutdownTimings.length - 1]).toBeLessThanOrEqual(10_000);
    expect(await waitForRuntimeDatabaseConnectionsToClose()).toBeLessThanOrEqual(10_000);

    const secondServer = await startServer();
    const sessionB = await issueProjectOwnerSession(
      secondServer,
      { adapterName: "PortkeyDiscoverWallet", address: ownerAddress },
      "trace-pg-session-b",
    );
    expect(sessionB.data.payload.sessionId).not.toBe(sessionA.data.payload.sessionId);
    expect(sessionB.data.payload.address).toBe(ownerAddress);
    expect(sessionB.data.payload.proof).toMatchObject({
      status: "verified",
      trustLevel: "verified_local",
    });
    expect(sessionB.data.payload.issuer).toMatchObject({
      issuerMode: "local_opaque",
      valid: true,
    });
    const oldSessionAfterRestart = await requestApi(
      secondServer,
      "/api/projects/postgres-restart-project/campaigns?status=draft&limit=100",
      { headers: sessionA.headers("trace-pg-old-session-after-restart") },
    );
    const health = await requestJson<HealthData>(secondServer, "/api/health");
    const list = await requestJson<CampaignListData>(
      secondServer,
      "/api/projects/postgres-restart-project/campaigns?status=draft&limit=100",
      { headers: sessionB.headers("trace-pg-runtime-owner-recovery") },
    );
    const detail = await requestJson<DetailData>(
      secondServer,
      `/api/campaigns/${campaignId}`,
      { headers: sessionB.headers("trace-pg-runtime-detail") },
    );
    const restartedEligibility = await requestJson<EligibilityData>(
      secondServer,
      `/api/campaigns/${campaignId}/eligibility?address=${walletAddress}&accountType=EOA&walletSource=PORTKEY_EOA_EXTENSION`,
    );
    const restartedExport = await requestJson<ExportData>(secondServer, `/api/campaigns/${campaignId}/export`, {
      body: JSON.stringify({ contractRootMode: "none", format: "json" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    expect(oldSessionAfterRestart).toMatchObject({
      status: 401,
      envelope: {
        ok: false,
        traceId: "trace-pg-old-session-after-restart",
        error: {
          code: "AUTH_SESSION_INVALID",
          details: { diagnosticCode: "AUTH_SESSION_INVALID" },
        },
      },
    });
    expect(health.campaignDatabase).toMatchObject({
      liveConnectionAttempted: true,
      liveQueryExecutionEnabled: true,
      selectedMode: "postgres",
      status: "ready",
    });
    expect(list.payload.items.map((item) => item.id)).toEqual([campaignId]);
    expect(list.payload.campaignDb).toEqual(expect.objectContaining({ draftCount: 1 }));
    expect(list.payload.summary).toEqual(expect.objectContaining({ totalCampaigns: 1 }));
    expect(detail.payload.item.id).toBe(campaignId);
    expect(JSON.stringify(detail.payload.item.tags)).toContain(created.payload.projectId);
    expect(detail.payload.item.title["en-US"]).toBe(created.payload.goal);
    expect(new Set(detail.payload.tasks.map((item) => item.taskId))).toEqual(
      new Set([taskId, adoptedTaskId]),
    );
    const recoveredManualTask = detail.payload.tasks.find((item) => item.taskId === taskId);
    const recoveredAdoptedTask = detail.payload.tasks.find((item) => item.taskId === adoptedTaskId);
    expect(recoveredManualTask).toMatchObject({
      points: task.payload.points,
      required: task.payload.required,
      title: { "en-US": task.payload.templateCode },
      verificationType: task.payload.verificationType,
    });
    expect(recoveredAdoptedTask).toMatchObject({
      points: adoptedTask.payload.points,
      required: adoptedTask.payload.required,
      title: { "en-US": adoptedTask.payload.templateCode },
      verificationType: adoptedTask.payload.verificationType,
    });
    expect(restartedEligibility.payload).toEqual(expect.objectContaining({ eligible: true, score: 120 }));
    expect(restartedExport.payload).toEqual(expect.objectContaining({ campaignId, readyRows: 1 }));
    expect(restartedExport.payload.rows).toContainEqual(expect.objectContaining({
      referrerAddress: "2F4PostgresReferrerWallet",
      walletAddress,
    }));
    const afterRestartSnapshot = await (async () => {
      const pool = createAuditPool();

      try {
        return await readCampaignSnapshot(pool, campaignId);
      } finally {
        await pool.end();
      }
    })();
    expect(afterRestartSnapshot).toEqual(beforeRestartSnapshot);
    const canonicalIdentitySurfaces = JSON.stringify({
      campaign: created.payload,
      database: afterRestartSnapshot,
      detail: detail.payload,
      manualTask: task.payload,
      adoptedTask: adoptedTask.payload,
      recovery: list.payload,
    }).toLowerCase();
    expect(canonicalIdentitySurfaces).not.toContain("local-task-");
    expect(canonicalIdentitySurfaces).not.toContain("synthetic");

    const otherWalletSession = await issueProjectOwnerSession(
      secondServer,
      { address: "2F4PostgresIsolatedOwner" },
      "trace-pg-other-wallet-session",
    );
    const otherWalletRecovery = await requestJson<CampaignListData>(
      secondServer,
      "/api/projects/postgres-restart-project/campaigns?status=draft&limit=100",
      { headers: otherWalletSession.headers("trace-pg-other-wallet-recovery") },
    );
    const otherWalletAdd = await requestApi(
      secondServer,
      `/api/campaigns/${campaignId}/tasks`,
      {
        body: JSON.stringify({
          evidenceRule: { source: "MANUAL" },
          points: 10,
          required: false,
          templateCode: "forbidden_other_wallet_add",
          verificationType: "MANUAL",
          walletCompatibility: "ANY",
        }),
        headers: otherWalletSession.headers("trace-pg-other-wallet-add"),
        method: "POST",
      },
    );
    const otherWalletGenerate = await requestApi(
      secondServer,
      `/api/campaigns/${campaignId}/tasks/generate`,
      {
        body: JSON.stringify({
          goal: created.payload.goal,
          product: "Campaign OS",
          targetUsers: ["project owners"],
          walletPolicy: created.payload.walletPolicy,
        }),
        headers: otherWalletSession.headers("trace-pg-other-wallet-generate"),
        method: "POST",
      },
    );
    const unknownSession = await requestApi(
      secondServer,
      "/api/projects/postgres-restart-project/campaigns?status=draft&limit=100",
      {
        headers: sessionB.headers("trace-pg-unknown-session", {
          "x-campaign-os-session-id": "unissued-wp05-session",
        }),
      },
    );
    const mismatchedSession = await requestApi(
      secondServer,
      "/api/projects/postgres-restart-project/campaigns?status=draft&limit=100",
      {
        headers: sessionB.headers("trace-pg-mismatched-session", {
          "x-campaign-os-wallet-address": "2F4MismatchedOwnerClaim",
        }),
      },
    );
    const invalidIssuerSession = await issueProjectOwnerSession(
      secondServer,
      {
        address: "2F4InvalidIssuerOwner",
        productionRequired: true,
      },
      "trace-pg-invalid-issuer-session",
    );
    expect(invalidIssuerSession.data.payload.issuer).toMatchObject({
      issuerMode: "production_blocked",
      valid: false,
    });
    const invalidIssuer = await requestApi(
      secondServer,
      "/api/projects/postgres-restart-project/campaigns?status=draft&limit=100",
      { headers: invalidIssuerSession.headers("trace-pg-invalid-issuer") },
    );
    const forbiddenRole = await requestApi(
      secondServer,
      "/api/projects/postgres-restart-project/campaigns?status=draft&limit=100",
      {
        headers: sessionB.headers("trace-pg-forbidden-role", {
          "x-campaign-os-roles": "participant",
        }),
      },
    );
    const missingCampaign = await requestApi(
      secondServer,
      "/api/campaigns/campaign-missing-wp05/tasks/generate",
      {
        body: JSON.stringify({
          goal: "Do not leak missing Campaign ownership",
          product: "Campaign OS",
          targetUsers: ["project owners"],
          walletPolicy: "ANY",
        }),
        headers: sessionB.headers("trace-pg-missing-campaign"),
        method: "POST",
      },
    );

    expect(otherWalletRecovery.payload).toMatchObject({
      campaignDb: { draftCount: 0 },
      items: [],
      summary: { totalCampaigns: 0 },
    });
    for (const [result, traceId] of [
      [otherWalletAdd, "trace-pg-other-wallet-add"],
      [otherWalletGenerate, "trace-pg-other-wallet-generate"],
    ] as const) {
      expect(result).toMatchObject({
        status: 403,
        envelope: {
          ok: false,
          traceId,
          error: {
            code: "AUTH_FORBIDDEN",
            details: { diagnosticCode: "AUTH_OWNER_MISMATCH" },
          },
        },
      });
    }
    for (const [result, traceId] of [
      [unknownSession, "trace-pg-unknown-session"],
      [mismatchedSession, "trace-pg-mismatched-session"],
      [invalidIssuer, "trace-pg-invalid-issuer"],
    ] as const) {
      expect(result).toMatchObject({
        status: 401,
        envelope: {
          ok: false,
          traceId,
          error: {
            code: "AUTH_SESSION_INVALID",
            details: { diagnosticCode: "AUTH_SESSION_INVALID" },
          },
        },
      });
    }
    expect(forbiddenRole).toMatchObject({
      status: 403,
      envelope: {
        ok: false,
        traceId: "trace-pg-forbidden-role",
        error: {
          code: "AUTH_FORBIDDEN",
          details: { diagnosticCode: "AUTH_ROLE_FORBIDDEN" },
        },
      },
    });
    expect(missingCampaign).toMatchObject({
      status: 404,
      envelope: {
        ok: false,
        traceId: "trace-pg-missing-campaign",
        error: { code: "INVALID_CAMPAIGN" },
      },
    });
    expect(JSON.stringify(missingCampaign.envelope)).not.toContain(ownerAddress);
    expect(JSON.stringify(missingCampaign.envelope)).not.toContain(otherWalletSession.data.payload.address);
    for (const result of [
      oldSessionAfterRestart,
      otherWalletAdd,
      otherWalletGenerate,
      unknownSession,
      mismatchedSession,
      invalidIssuer,
      forbiddenRole,
      missingCampaign,
    ]) {
      const serialized = JSON.stringify(result.envelope).toLowerCase();

      expect(result.envelope.data).toBeUndefined();
      expect(result.envelope.traceId).toMatch(/^trace-pg-/);
      expect(serialized).not.toContain("postgresql://");
      expect(serialized).not.toContain("stack");
      expect(serialized).not.toContain("password");
    }
    const afterNegativeSnapshot = await (async () => {
      const pool = createAuditPool();

      try {
        return await readCampaignSnapshot(pool, campaignId);
      } finally {
        await pool.end();
      }
    })();
    expect(afterNegativeSnapshot).toEqual(beforeRestartSnapshot);

    const unavailableUrl = new URL(databaseUrl);
    unavailableUrl.port = "1";
    const unavailableServer = await startServer(unavailableUrl.toString(), "100");
    const unavailableOwnerSession = await issueProjectOwnerSession(
      unavailableServer,
      { address: "2F4UnavailableDatabaseOwner" },
      "trace-pg-unavailable-session",
    );
    const unavailableCreate = await requestApi(
      unavailableServer,
      "/api/campaigns",
      {
        body: JSON.stringify({
          duration: "2026-09-01/2026-09-14",
          endTime: "2026-09-14T23:59:59Z",
          goal: "Fail closed without PostgreSQL",
          ownerAddress: unavailableOwnerSession.data.payload.address,
          projectId: "postgres-unavailable-project",
          rewardDescription: "No fallback write is allowed.",
          startTime: "2026-09-01T00:00:00Z",
        }),
        headers: unavailableOwnerSession.headers("trace-pg-unavailable-create"),
        method: "POST",
      },
    );
    expect(unavailableCreate).toMatchObject({
      status: 503,
      envelope: {
        ok: false,
        traceId: "trace-pg-unavailable-create",
        error: { code: "PERSISTENCE_UNAVAILABLE" },
      },
    });
    expect(unavailableCreate.envelope.data).toBeUndefined();
    expect(JSON.stringify(unavailableCreate.envelope).toLowerCase()).not.toContain("local-task-");
    await stopServer(unavailableServer);
    const afterUnavailableSnapshot = await (async () => {
      const pool = createAuditPool();

      try {
        return await readCampaignSnapshot(pool, campaignId);
      } finally {
        await pool.end();
      }
    })();
    expect(afterUnavailableSnapshot).toEqual(beforeRestartSnapshot);

    const concurrentSessions = await Promise.all(Array.from({ length: 20 }, (_, index) =>
      issueProjectOwnerSession(
        secondServer,
        { address: `2F4ConcurrentOwner${index.toString().padStart(2, "0")}` },
        `trace-pg-concurrent-session-${index}`,
      )));
    const concurrentCampaigns = await Promise.all(concurrentSessions.map((session, index) => {
      const concurrentOwner = session.data.payload.address;

      return requestJson<CampaignCreateData>(secondServer, "/api/campaigns", {
        body: JSON.stringify({
          duration: "2026-09-01/2026-09-14",
          endTime: "2026-09-14T23:59:59Z",
          goal: `Concurrent PostgreSQL Campaign ${index}`,
          ownerAddress: concurrentOwner,
          projectId: `postgres-concurrent-project-${index}`,
          rewardDescription: "Concurrent PostgreSQL review rewards.",
          startTime: "2026-09-01T00:00:00Z",
        }),
        headers: session.headers(`trace-pg-concurrent-create-${index}`),
        method: "POST",
      });
    }));
    const concurrentCampaignIds = concurrentCampaigns.map((item) => item.payload.id);

    expect(new Set(concurrentCampaignIds).size).toBe(20);
    expect(concurrentCampaignIds).not.toContain(campaignId);

    const secondCampaignId = concurrentCampaignIds[0]!;
    const secondTask = await requestJson<TaskCreateData>(
      secondServer,
      `/api/campaigns/${secondCampaignId}/tasks`,
      {
        body: JSON.stringify({
          evidenceRule: { minAmount: 1, source: "AELFSCAN" },
          points: 120,
          required: true,
          templateCode: "bridge_ebridge",
          verificationType: "ON_CHAIN",
          walletCompatibility: "ANY",
        }),
        headers: concurrentSessions[0]!.headers("trace-pg-concurrent-task-required"),
        method: "POST",
      },
    );
    const secondTaskId = secondTask.campaignDbTask.taskId;
    const atomicTask = await requestJson<TaskCreateData>(
      secondServer,
      `/api/campaigns/${secondCampaignId}/tasks`,
      {
        body: JSON.stringify({
          evidenceRule: { minAmount: 1, source: "AELFSCAN" },
          points: 80,
          required: false,
          templateCode: "atomic_same_wallet_task",
          verificationType: "ON_CHAIN",
          walletCompatibility: "ANY",
        }),
        headers: concurrentSessions[0]!.headers("trace-pg-concurrent-task-optional"),
        method: "POST",
      },
    );
    const atomicTaskId = atomicTask.campaignDbTask.taskId;
    const atomicWallet = "2F4AtomicVerificationWallet";
    const atomicVerifications = await Promise.all(
      [secondTaskId, atomicTaskId].map((verificationTaskId, index) =>
        requestJson<VerificationData>(secondServer, `/api/tasks/${verificationTaskId}/verify`, {
          body: JSON.stringify({
            accountType: "EOA",
            campaignId: secondCampaignId,
            walletAddress: atomicWallet,
            walletSource: "PORTKEY_EOA_EXTENSION",
          }),
          headers: {
            "content-type": "application/json",
            "x-campaign-os-trace-id": `trace-pg-atomic-verify-${index}`,
          },
          method: "POST",
        })),
    );

    expect(new Set(atomicVerifications.map(
      (item) => item.campaignDbCompletion.completionId,
    )).size).toBe(2);
    expect(new Set(atomicVerifications.map(
      (item) => item.campaignDbEvidence.evidenceId,
    )).size).toBe(2);

    const concurrentWallets = Array.from(
      { length: 10 },
      (_, index) => `2F4ConcurrentWallet${index.toString().padStart(2, "0")}`,
    );
    const verificationTargets = [
      ...concurrentWallets.map((wallet) => ({ campaignId, taskId, wallet })),
      ...concurrentWallets.map((wallet) => ({
        campaignId: secondCampaignId,
        taskId: secondTaskId,
        wallet,
      })),
    ];

    const verifications = await Promise.all(verificationTargets.map((target, index) =>
      requestJson<VerificationData>(secondServer, `/api/tasks/${target.taskId}/verify`, {
        body: JSON.stringify({
          accountType: "EOA",
          campaignId: target.campaignId,
          walletAddress: target.wallet,
          walletSource: "PORTKEY_EOA_EXTENSION",
        }),
        headers: {
          "content-type": "application/json",
          "x-campaign-os-trace-id": `trace-pg-concurrent-verify-${index}`,
        },
        method: "POST",
      })));
    expect(new Set(verifications.map((item) => item.campaignDbCompletion.completionId)).size).toBe(20);
    expect(new Set(verifications.map((item) => item.campaignDbEvidence.evidenceId)).size).toBe(20);

    const auditPool = createAuditPool();

    try {
      const campaignRows = await auditPool.query<{ id: string }>(
        "SELECT id FROM campaign_os.campaigns WHERE id = ANY($1::text[])",
        [concurrentCampaignIds],
      );
      const participantRows = await auditPool.query<{ campaign_id: string; count: string }>(
        `
          SELECT campaign_id, COUNT(*)::text AS count
          FROM campaign_os.campaign_participants
          WHERE campaign_id = ANY($1::text[])
            AND wallet_address LIKE '2F4ConcurrentWallet%'
          GROUP BY campaign_id
          ORDER BY campaign_id
        `,
        [[campaignId, secondCampaignId]],
      );
      const completionRows = await auditPool.query<{ campaign_id: string; count: string }>(
        `
          SELECT campaign_id, COUNT(*)::text AS count
          FROM campaign_os.campaign_task_completions
          WHERE campaign_id = ANY($1::text[])
            AND wallet_address LIKE '2F4ConcurrentWallet%'
          GROUP BY campaign_id
          ORDER BY campaign_id
        `,
        [[campaignId, secondCampaignId]],
      );
      const atomicRows = await auditPool.query<{
        completion_count: string;
        evidence_count: string;
        partial_evidence_count: string;
        total_points: number;
      }>(
        `
          SELECT
            participant.total_points,
            (
              SELECT COUNT(*)::text
              FROM campaign_os.campaign_task_completions AS completion
              WHERE completion.campaign_id = participant.campaign_id
                AND completion.wallet_address = participant.wallet_address
            ) AS completion_count,
            (
              SELECT COUNT(*)::text
              FROM campaign_os.campaign_task_evidence AS evidence
              WHERE evidence.campaign_id = participant.campaign_id
                AND evidence.wallet_address = participant.wallet_address
            ) AS evidence_count,
            (
              SELECT COUNT(*)::text
              FROM campaign_os.campaign_task_evidence AS evidence
              LEFT JOIN campaign_os.campaign_task_completions AS completion
                ON completion.campaign_id = evidence.campaign_id
                AND completion.task_id = evidence.task_id
                AND completion.wallet_address = evidence.wallet_address
                AND completion.id = evidence.completion_id
              WHERE evidence.campaign_id = participant.campaign_id
                AND evidence.wallet_address = participant.wallet_address
                AND completion.id IS NULL
            ) AS partial_evidence_count
          FROM campaign_os.campaign_participants AS participant
          WHERE participant.campaign_id = $1
            AND participant.wallet_address = $2
        `,
        [secondCampaignId, atomicWallet],
      );

      expect(campaignRows.rows).toHaveLength(20);
      expect(participantRows.rows.map((row) => Number(row.count))).toEqual([10, 10]);
      expect(completionRows.rows.map((row) => Number(row.count))).toEqual([10, 10]);
      expect(atomicRows.rows).toEqual([{
        completion_count: "2",
        evidence_count: "2",
        partial_evidence_count: "0",
        total_points: 200,
      }]);

      await auditPool.query(`
        INSERT INTO campaign_os.campaigns (
          id,
          project_id,
          owner_address,
          status,
          default_locale,
          supported_locales,
          wallet_policy,
          contract_mode,
          goal,
          duration,
          reward_description,
          reward_disclaimer_hash,
          metadata_uri,
          metadata_hash,
          start_time,
          end_time,
          publish_readiness,
          created_at,
          updated_at
        )
        SELECT
          '000-nfr-campaign-' || lpad(campaign_number::text, 3, '0'),
          'nfr-project-' || lpad(campaign_number::text, 3, '0'),
          '2F4NfrOwner' || lpad(campaign_number::text, 3, '0'),
          'draft',
          'en-US',
          '["en-US"]'::jsonb,
          'ANY',
          'OFF_CHAIN_MVP',
          'PostgreSQL NFR Campaign ' || campaign_number,
          '2026-10-01/2026-10-31',
          'PostgreSQL NFR review rewards.',
          NULL,
          NULL,
          NULL,
          '2026-10-01T00:00:00Z'::timestamptz,
          '2026-10-31T23:59:59Z'::timestamptz,
          '{"ready":true,"blockers":[],"warnings":[]}'::jsonb,
          '2026-07-13T00:00:00Z'::timestamptz,
          '2026-07-13T00:00:00Z'::timestamptz
        FROM generate_series(1, 100) AS campaigns(campaign_number)
      `);
      await auditPool.query(`
        INSERT INTO campaign_os.campaign_tasks (
          id,
          campaign_id,
          template_code,
          verification_type,
          wallet_compatibility,
          points,
          required,
          evidence_rule,
          created_at,
          updated_at
        )
        SELECT
          '000-nfr-task-'
            || lpad(campaign_number::text, 3, '0')
            || '-'
            || lpad(task_number::text, 2, '0'),
          '000-nfr-campaign-' || lpad(campaign_number::text, 3, '0'),
          'nfr_task_' || lpad(task_number::text, 2, '0'),
          'ON_CHAIN',
          'ANY',
          10,
          true,
          '{"minAmount":1,"source":"AELFSCAN"}'::jsonb,
          '2026-07-13T00:00:00Z'::timestamptz,
          '2026-07-13T00:00:00Z'::timestamptz
        FROM generate_series(1, 100) AS campaigns(campaign_number)
        CROSS JOIN generate_series(1, 10) AS tasks(task_number)
      `);
      const nfrDataset = await auditPool.query<{ campaign_count: string; task_count: string }>(`
        SELECT
          (
            SELECT COUNT(*)::text
            FROM campaign_os.campaigns
            WHERE id LIKE '000-nfr-campaign-%'
          ) AS campaign_count,
          (
            SELECT COUNT(*)::text
            FROM campaign_os.campaign_tasks
            WHERE id LIKE '000-nfr-task-%'
          ) AS task_count
      `);

      expect(nfrDataset.rows[0]).toEqual({ campaign_count: "100", task_count: "1000" });
    } finally {
      await auditPool.end();
    }

    const nfrTimings = {
      create: [] as number[],
      detail: [] as number[],
      generatePreview: [] as number[],
      recovery: [] as number[],
      taskAdd: [] as number[],
    };
    const nfrDatasetOwnerSession = await issueProjectOwnerSession(
      secondServer,
      { address: "2F4NfrOwner001" },
      "trace-pg-nfr-dataset-owner-session",
    );

    for (let index = 0; index < 20; index += 1) {
      await requestJson<CampaignCreateData>(secondServer, "/api/campaigns", {
        body: JSON.stringify({
          duration: "2026-11-01/2026-11-14",
          endTime: "2026-11-14T23:59:59Z",
          goal: `PostgreSQL NFR create ${index}`,
          ownerAddress,
          projectId: `postgres-nfr-create-${index}`,
          rewardDescription: "PostgreSQL NFR create rewards.",
          startTime: "2026-11-01T00:00:00Z",
        }),
        headers: sessionB.headers(`trace-pg-nfr-create-${index}`),
        method: "POST",
      }, nfrTimings.create);
      await requestJson<CampaignListData>(
        secondServer,
        "/api/projects/nfr-project-001/campaigns?status=draft&limit=100",
        { headers: nfrDatasetOwnerSession.headers(`trace-pg-nfr-recovery-${index}`) },
        nfrTimings.recovery,
      );
      await requestJson<DetailData>(
        secondServer,
        "/api/campaigns/000-nfr-campaign-001",
        { headers: nfrDatasetOwnerSession.headers(`trace-pg-nfr-detail-${index}`) },
        nfrTimings.detail,
      );
      await requestJson<TaskCreateData>(
        secondServer,
        "/api/campaigns/000-nfr-campaign-001/tasks",
        {
          body: JSON.stringify({
            evidenceRule: { minAmount: index + 1, source: "AELFSCAN" },
            points: 10,
            required: false,
            templateCode: `nfr_incremental_${index}`,
            verificationType: "ON_CHAIN",
            walletCompatibility: "ANY",
          }),
          headers: nfrDatasetOwnerSession.headers(`trace-pg-nfr-task-${index}`),
          method: "POST",
        },
        nfrTimings.taskAdd,
      );
      await requestJson<GeneratedTasksData>(
        secondServer,
        "/api/campaigns/000-nfr-campaign-001/tasks/generate",
        {
          body: JSON.stringify({
            goal: "Measure PostgreSQL-backed Generate preview",
            product: "Campaign OS",
            targetUsers: ["project owners"],
            walletPolicy: "ANY",
          }),
          headers: nfrDatasetOwnerSession.headers(`trace-pg-nfr-generate-${index}`),
          method: "POST",
        },
        nfrTimings.generatePreview,
      );
    }

    for (const [operation, samples] of Object.entries(nfrTimings)) {
      expect(samples, `${operation} sample count`).toHaveLength(20);
      expect(percentile95(samples), `${operation} p95`).toBeLessThanOrEqual(500);
    }

    expect(timings.length).toBeGreaterThanOrEqual(50);
    expect(percentile95(timings)).toBeLessThanOrEqual(500);
    await stopServer(secondServer);
    expect(shutdownTimings.every((duration) => duration <= 10_000)).toBe(true);
    expect(servers.size).toBe(0);
    expect(await waitForRuntimeDatabaseConnectionsToClose()).toBeLessThanOrEqual(10_000);
  }, 120_000);
});
