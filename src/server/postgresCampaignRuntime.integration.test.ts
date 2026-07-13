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
    details?: { diagnosticCode?: string; operation?: string };
  };
  ok: boolean;
  traceId?: string;
}

interface CampaignCreateData {
  payload: { id: string };
}

interface CampaignListData {
  payload: {
    items: Array<{ id: string }>;
  };
}

interface TaskCreateData {
  campaignDbTask: { taskId: string };
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
    item: { id: string };
    tasks: Array<{ taskId: string }>;
  };
}

interface HealthData {
  campaignDatabase: {
    liveConnectionAttempted: boolean;
    liveQueryExecutionEnabled: boolean;
    selectedMode: string;
    status: string;
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

const projectOwnerHeaders = (ownerAddress: string, traceId: string) => ({
  "content-type": "application/json",
  "x-campaign-os-account-type": "AA",
  "x-campaign-os-credential-boundary": "ordinary_user_wallet",
  "x-campaign-os-proof-status": "verified",
  "x-campaign-os-roles": "project_owner",
  "x-campaign-os-session-id": `sess-${ownerAddress}`,
  "x-campaign-os-trace-id": traceId,
  "x-campaign-os-wallet-address": ownerAddress,
  "x-campaign-os-wallet-source": "PORTKEY_AA",
});

const percentile95 = (samples: readonly number[]) => {
  const sorted = [...samples].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);

  return sorted[index] ?? Number.POSITIVE_INFINITY;
};

const timestampMillis = (value: unknown) =>
  value instanceof Date ? value.getTime() : Date.parse(String(value));

integrationSuite("PostgreSQL Campaign API runtime", () => {
  const databaseName = `campaign_os_m239_${process.pid}_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
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

  const requestJson = async <T>(
    server: CampaignOsApiServerHandle,
    path: string,
    init: RequestInit = {},
    timingSamples: number[] = timings,
  ): Promise<T> => recordTiming(async () => {
    const response = await fetch(`${server.url}${path}`, init);
    const envelope = await response.json() as ApiEnvelope<T>;

    if (response.status !== 200 || !envelope.ok || !envelope.data) {
      throw new Error(
        `PostgreSQL integration API request failed with status ${response.status}`
        + `, code ${envelope.error?.code ?? "unknown"}`
        + `, diagnostic ${envelope.error?.details?.diagnosticCode ?? "unknown"}`
        + `, and operation ${envelope.error?.details?.operation ?? "unknown"}.`,
      );
    }

    return envelope.data;
  }, timingSamples);

  const startServer = async () => {
    const server = await startCampaignOsApiServer({
      env: {
        CAMPAIGN_OS_CAMPAIGN_DB_MODE: "postgres",
        CAMPAIGN_OS_DATABASE_CONNECT_TIMEOUT_MS: "5000",
        CAMPAIGN_OS_DATABASE_IDLE_TIMEOUT_MS: "5000",
        CAMPAIGN_OS_DATABASE_POOL_MAX: "10",
        CAMPAIGN_OS_DATABASE_SSL_MODE: sslMode,
        CAMPAIGN_OS_DATABASE_URL: databaseUrl,
      },
      logger: false,
      port: 0,
      shutdownTimeoutMs: 10_000,
    });

    servers.add(server);
    return server;
  };

  const stopServer = async (server: CampaignOsApiServerHandle) => {
    await server.stop();
    servers.delete(server);
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
          SELECT id, project_id, owner_address, status, goal, created_at, updated_at
          FROM campaign_os.campaigns
          WHERE id = $1
          ORDER BY id
        `,
        [campaignId],
      ),
      pool.query(
        `
          SELECT id, campaign_id, template_code, points, required, created_at, updated_at
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

  it("survives restart and preserves concurrent Campaign workflows", async () => {
    const runtimeWriteWindowStartedAt = Date.now();
    const firstServer = await startServer();
    const ownerAddress = "2F4PostgresRuntimeOwner";
    const created = await requestJson<CampaignCreateData>(firstServer, "/api/campaigns", {
      body: JSON.stringify({
        duration: "2026-08-01/2026-08-14",
        endTime: "2026-08-14T23:59:59Z",
        goal: "Review PostgreSQL restart recovery",
        ownerAddress,
        projectId: "postgres-restart-project",
        rewardDescription: "PostgreSQL-backed review rewards.",
        startTime: "2026-08-01T00:00:00Z",
      }),
      headers: projectOwnerHeaders(ownerAddress, "trace-pg-runtime-create"),
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
      headers: {
        "content-type": "application/json",
        "x-campaign-os-trace-id": "trace-pg-runtime-task",
      },
      method: "POST",
    });
    const taskId = task.campaignDbTask.taskId;
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
      campaigns: [expect.objectContaining({ id: campaignId })],
      completions: [expect.objectContaining({ task_id: taskId, wallet_address: walletAddress })],
      evidence: [expect.objectContaining({ task_id: taskId, wallet_address: walletAddress })],
      participants: [expect.objectContaining({ wallet_address: walletAddress })],
      referrals: [expect.objectContaining({ id: referralId })],
      tasks: [expect.objectContaining({ id: taskId })],
    });
    const runtimeWriteRows = [
      beforeRestartSnapshot.campaigns[0],
      beforeRestartSnapshot.tasks[0],
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

    const secondServer = await startServer();
    const health = await requestJson<HealthData>(secondServer, "/api/health");
    const list = await requestJson<CampaignListData>(
      secondServer,
      "/api/campaigns?projectId=postgres-restart-project",
    );
    const detail = await requestJson<DetailData>(secondServer, `/api/campaigns/${campaignId}`);
    const restartedEligibility = await requestJson<EligibilityData>(
      secondServer,
      `/api/campaigns/${campaignId}/eligibility?address=${walletAddress}&accountType=EOA&walletSource=PORTKEY_EOA_EXTENSION`,
    );
    const restartedExport = await requestJson<ExportData>(secondServer, `/api/campaigns/${campaignId}/export`, {
      body: JSON.stringify({ contractRootMode: "none", format: "json" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    expect(health.campaignDatabase).toMatchObject({
      liveConnectionAttempted: true,
      liveQueryExecutionEnabled: true,
      selectedMode: "postgres",
      status: "ready",
    });
    expect(list.payload.items.map((item) => item.id)).toEqual([campaignId]);
    expect(detail.payload.item.id).toBe(campaignId);
    expect(detail.payload.tasks.map((item) => item.taskId)).toContain(taskId);
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

    const concurrentCampaigns = await Promise.all(Array.from({ length: 20 }, (_, index) => {
      const concurrentOwner = `2F4ConcurrentOwner${index.toString().padStart(2, "0")}`;

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
        headers: projectOwnerHeaders(concurrentOwner, `trace-pg-concurrent-create-${index}`),
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
        headers: { "content-type": "application/json" },
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
        headers: { "content-type": "application/json" },
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
      eligibility: [] as number[],
      list: [] as number[],
      taskAdd: [] as number[],
    };

    for (let index = 0; index < 20; index += 1) {
      const nfrOwner = `2F4NfrCreateOwner${index.toString().padStart(2, "0")}`;

      await requestJson<CampaignCreateData>(secondServer, "/api/campaigns", {
        body: JSON.stringify({
          duration: "2026-11-01/2026-11-14",
          endTime: "2026-11-14T23:59:59Z",
          goal: `PostgreSQL NFR create ${index}`,
          ownerAddress: nfrOwner,
          projectId: `postgres-nfr-create-${index}`,
          rewardDescription: "PostgreSQL NFR create rewards.",
          startTime: "2026-11-01T00:00:00Z",
        }),
        headers: projectOwnerHeaders(nfrOwner, `trace-pg-nfr-create-${index}`),
        method: "POST",
      }, nfrTimings.create);
      await requestJson(
        secondServer,
        "/api/campaigns?limit=100",
        {},
        nfrTimings.list,
      );
      await requestJson(
        secondServer,
        "/api/campaigns/000-nfr-campaign-001",
        {},
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
          headers: {
            "content-type": "application/json",
            "x-campaign-os-trace-id": `trace-pg-nfr-task-${index}`,
          },
          method: "POST",
        },
        nfrTimings.taskAdd,
      );
      await requestJson<EligibilityData>(
        secondServer,
        `/api/campaigns/${campaignId}/eligibility?address=${walletAddress}&accountType=EOA&walletSource=PORTKEY_EOA_EXTENSION`,
        {},
        nfrTimings.eligibility,
      );
    }

    for (const [operation, samples] of Object.entries(nfrTimings)) {
      expect(samples, `${operation} sample count`).toHaveLength(20);
      expect(percentile95(samples), `${operation} p95`).toBeLessThanOrEqual(500);
    }

    expect(timings.length).toBeGreaterThanOrEqual(50);
    expect(percentile95(timings)).toBeLessThanOrEqual(500);
    await stopServer(secondServer);
  }, 120_000);
});
