import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { NormalizedWalletSession } from "../domain/types";
import { createDeprecatedNonLivePreviewAuthorityOption } from "./apiRuntime";
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
const REQUIRE_POSTGRES_TESTS = process.env.CAMPAIGN_OS_REQUIRE_POSTGRES_TESTS?.trim() === "1";

if (REQUIRE_POSTGRES_TESTS && !TEST_DATABASE_URL) {
  throw new Error(
    "Admin HTTP PostgreSQL acceptance requires CAMPAIGN_OS_TEST_DATABASE_URL when required mode is enabled.",
  );
}

const realPostgresSuite = TEST_DATABASE_URL ? describe : describe.skip;
const campaignId = "campaign-admin-http";
const participantId = "participant-admin-http";
const operatorAddress = "2F4AdminHttpOperator";

interface IssuedWalletAuthSession {
  accountType: NormalizedWalletSession["accountType"];
  address: string;
  proofStatus: "verified";
  sessionId: string;
  walletSource: NormalizedWalletSession["walletSource"];
}

type AdminEnvelope<T> = {
  data: T;
  ok: true;
  traceId: string;
};

const isLoopback = (hostname: string) => {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  return normalized === "localhost" || normalized === "::1" || normalized.startsWith("127.");
};

const createPool = (databaseUrl: string, max = 20) => {
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

const endPoolAndWaitForClients = async (pool: pg.Pool) => {
  let remainingClients = pool.totalCount;
  const clientsDisconnected = remainingClients === 0
    ? Promise.resolve()
    : new Promise<void>((resolve) => {
        const handleRemove = () => {
          remainingClients -= 1;
          if (remainingClients === 0) {
            pool.off("remove", handleRemove);
            resolve();
          }
        };
        pool.on("remove", handleRemove);
      });

  await pool.end();
  await clientsDisconnected;
};

const settleWithin = async <T>(promise: Promise<T>, timeoutMs: number, label: string) => {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`${label} did not complete within ${timeoutMs} ms.`)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
};

const waitForDatabaseConnectionsToClose = async (
  adminPool: pg.Pool,
  databaseName: string,
  timeoutMs = 10_000,
) => {
  const startedAt = performance.now();
  let remainingConnections = Number.POSITIVE_INFINITY;

  while (performance.now() - startedAt <= timeoutMs) {
    const result = await adminPool.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM pg_stat_activity WHERE datname = $1",
      [databaseName],
    );
    remainingConnections = Number(result.rows[0]?.count ?? Number.POSITIVE_INFINITY);
    if (remainingConnections === 0) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  throw new Error(
    `Admin HTTP PostgreSQL runtime retained ${remainingConnections} database connection(s).`,
  );
};

const seedCampaign = async (pool: pg.Pool) => {
  const taskId = "task-admin-http";
  const walletAddress = "2F4AdminHttpParticipant";
  const completionId = "completion-admin-http";
  const evidenceId = "evidence-admin-http";
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
      campaignId,
      "project-admin-http",
      "owner-admin-http",
      "ended",
      "en-US",
      JSON.stringify(["en-US"]),
      "ANY",
      "OFF_CHAIN_MVP",
      "Admin HTTP acceptance",
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
      taskId,
      campaignId,
      "task-admin-http",
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
      participantId,
      campaignId,
      walletAddress,
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
      completionId,
      campaignId,
      taskId,
      walletAddress,
      "EOA",
      "PORTKEY_EOA_EXTENSION",
      "completed",
      "AELFSCAN",
      evidenceId,
      "completion-hash-admin-http",
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
      evidenceId,
      campaignId,
      taskId,
      walletAddress,
      completionId,
      "EOA",
      "PORTKEY_EOA_EXTENSION",
      "completed",
      "AELFSCAN",
      "evidence-hash-admin-http",
      "aelfscan://transaction/admin-http",
      JSON.stringify([]),
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

const issueWalletSession = async (
  baseUrl: string,
  address: string,
): Promise<IssuedWalletAuthSession> => {
  const response = await fetch(`${baseUrl}/api/wallet/session`, {
    body: JSON.stringify({
      address,
      adapterName: "PortkeyDiscoverWallet",
      chainId: "AELF",
      network: "mainnet",
      nonce: "nonce-admin-http-acceptance",
      proofEvaluatedAt: "2026-07-15T01:00:00.000Z",
      proofIssuedAt: "2026-07-15T00:59:59.000Z",
      signature: "test-wallet-signature",
    }),
    headers: {
      "content-type": "application/json",
      "x-campaign-os-trace-id": "trace-admin-http-session",
    },
    method: "POST",
  });
  const envelope = await response.json() as {
    data?: { payload?: NormalizedWalletSession };
    ok?: boolean;
  };
  const session = envelope.data?.payload;

  expect(response.status).toBe(200);
  expect(envelope.ok).toBe(true);
  if (!session || session.proof?.status !== "verified") {
    throw new Error("Expected a verified issued wallet session.");
  }

  return {
    accountType: session.accountType,
    address: session.address,
    proofStatus: "verified",
    sessionId: session.sessionId,
    walletSource: session.walletSource,
  };
};

const adminHeaders = (
  session: IssuedWalletAuthSession,
  traceId: string,
  extra: Record<string, string> = {},
) => ({
  "x-campaign-os-account-type": session.accountType,
  "x-campaign-os-credential-boundary": "ordinary_user_wallet",
  "x-campaign-os-proof-status": session.proofStatus,
  "x-campaign-os-roles": "review_operator",
  "x-campaign-os-session-id": session.sessionId,
  "x-campaign-os-trace-id": traceId,
  "x-campaign-os-wallet-address": session.address,
  "x-campaign-os-wallet-source": session.walletSource,
  ...extra,
});

const readAdminEnvelope = async <T>(response: Response): Promise<AdminEnvelope<T>> => {
  const envelope = await response.json() as AdminEnvelope<T> | {
    error?: unknown;
    ok?: false;
    traceId?: string;
  };

  expect(envelope).toMatchObject({ ok: true, traceId: expect.any(String) });
  if (!envelope.ok) {
    throw new Error(`Expected Admin success envelope for HTTP ${response.status}.`);
  }

  return envelope;
};

realPostgresSuite("Admin Node HTTP and PostgreSQL acceptance", () => {
  const databaseName = `campaign_os_m242_http_${process.pid}_${randomUUID().replace(/-/g, "").slice(0, 10)}`;
  let adminPool: pg.Pool;
  let databasePool: pg.Pool;
  let databaseUrl = "";
  let server: CampaignOsApiServerHandle;
  let session: IssuedWalletAuthSession;

  beforeAll(async () => {
    adminPool = createPool(TEST_DATABASE_URL!, 4);
    if (!/^[a-z0-9_]+$/.test(databaseName)) {
      throw new Error("Generated PostgreSQL acceptance database name is invalid.");
    }
    await adminPool.query(`CREATE DATABASE "${databaseName}"`);
    databaseUrl = isolatedDatabaseUrl(TEST_DATABASE_URL!, databaseName);
    const migrationPool = createPool(databaseUrl, 4);
    try {
      await runPostgresMigrations({
        approved: true,
        migrations: await loadPostgresMigrations(),
        mode: "apply",
        pool: migrationPoolAdapter(migrationPool),
        traceId: "trace-admin-http-migrations",
      });
    } finally {
      await migrationPool.end();
    }
    databasePool = createPool(databaseUrl, 24);
    await seedCampaign(databasePool);
    server = await startCampaignOsApiServer({
      deprecatedNonLivePreviewAuthority: createDeprecatedNonLivePreviewAuthorityOption(),
      env: {
        CAMPAIGN_OS_ADMIN_OPERATOR_MEMBERSHIPS_JSON: JSON.stringify([{
          active: true,
          campaignIds: [campaignId],
          roleIds: ["review_operator"],
          subjectAddress: operatorAddress,
        }]),
        CAMPAIGN_OS_ADMIN_REVIEW_ENABLED: "true",
        CAMPAIGN_OS_CAMPAIGN_DB_MODE: "postgres",
        CAMPAIGN_OS_DATABASE_POOL_MAX: "20",
        CAMPAIGN_OS_DATABASE_SSL_MODE: "disable",
        CAMPAIGN_OS_DATABASE_URL: databaseUrl,
      },
      logger: false,
      port: 0,
    });
    session = await issueWalletSession(server.url, operatorAddress);
  }, 60_000);

  afterAll(async () => {
    const failures: unknown[] = [];
    let connectionsClosed = false;
    if (server) {
      try {
        await settleWithin(server.stop(), 10_000, "Admin HTTP server shutdown");
      } catch (error) {
        failures.push(error);
      }
    }
    if (databasePool) {
      try {
        await settleWithin(
          endPoolAndWaitForClients(databasePool),
          10_000,
          "Admin HTTP fixture pool shutdown",
        );
      } catch (error) {
        failures.push(error);
      }
    }
    if (adminPool) {
      try {
        await waitForDatabaseConnectionsToClose(adminPool, databaseName);
        connectionsClosed = true;
      } catch (error) {
        failures.push(error);
      }
      try {
        await adminPool.query(
          connectionsClosed
            ? `DROP DATABASE IF EXISTS "${databaseName}"`
            : `DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`,
        );
      } catch (error) {
        failures.push(error);
      }
      try {
        await adminPool.end();
      } catch (error) {
        failures.push(error);
      }
    }
    if (failures.length > 0) {
      throw new Error(`Admin HTTP PostgreSQL cleanup failed (${failures.length} errors).`);
    }
  }, 60_000);

  it("serializes 20-way decision and artifact races through real HTTP into one durable row", async () => {
    const detailResponse = await fetch(
      `${server.url}/api/admin/campaigns/${campaignId}/reviews/${participantId}`,
      { headers: adminHeaders(session, "trace-admin-http-detail") },
    );
    const detail = await readAdminEnvelope<{
      snapshot: { fingerprint: string };
    }>(detailResponse);
    expect(detailResponse.status).toBe(200);

    const decisionResponses = await Promise.all(Array.from({ length: 20 }, (_, index) =>
      fetch(`${server.url}/api/admin/campaigns/${campaignId}/reviews/${participantId}/decisions`, {
        body: JSON.stringify({
          decision: "approved",
          reasonCode: "evidence_verified",
          snapshotFingerprint: detail.data.snapshot.fingerprint,
        }),
        headers: adminHeaders(session, `trace-admin-http-decision-${index}`, {
          "content-type": "application/json",
          "Idempotency-Key": "admin-http-decision-race",
        }),
        method: "POST",
      })));
    expect(decisionResponses.filter(({ status }) => status === 201)).toHaveLength(1);
    expect(decisionResponses.filter(({ status }) => status === 200)).toHaveLength(19);
    const decisionReceipts = await Promise.all(decisionResponses.map((response) =>
      readAdminEnvelope<{ created: boolean; decisionId: string }>(response)));
    expect(new Set(decisionReceipts.map(({ data }) => data.decisionId)).size).toBe(1);
    expect(decisionReceipts.filter(({ data }) => data.created)).toHaveLength(1);
    const decisionCount = await databasePool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM campaign_os.campaign_review_decisions
       WHERE campaign_id = $1 AND participant_id = $2`,
      [campaignId, participantId],
    );
    expect(decisionCount.rows).toEqual([{ count: "1" }]);

    const winnerResponse = await fetch(`${server.url}/api/admin/campaigns/${campaignId}/winners`, {
      headers: adminHeaders(session, "trace-admin-http-winners"),
    });
    const winners = await readAdminEnvelope<{
      rows: Array<{ participantId: string }>;
      sourceFingerprint: string;
    }>(winnerResponse);
    expect(winners.data.rows).toEqual([expect.objectContaining({ participantId })]);

    const artifactResponses = await Promise.all(Array.from({ length: 20 }, (_, index) =>
      fetch(`${server.url}/api/admin/campaigns/${campaignId}/artifacts`, {
        body: JSON.stringify({
          expectedSourceFingerprint: winners.data.sourceFingerprint,
          format: "csv",
        }),
        headers: adminHeaders(session, `trace-admin-http-artifact-${index}`, {
          "content-type": "application/json",
        }),
        method: "POST",
      })));
    expect(artifactResponses.filter(({ status }) => status === 201)).toHaveLength(1);
    expect(artifactResponses.filter(({ status }) => status === 200)).toHaveLength(19);
    const artifactReceipts = await Promise.all(artifactResponses.map((response) =>
      readAdminEnvelope<{
        artifact: { artifactId: string; contentHash: string };
        created: boolean;
      }>(response)));
    const artifactIds = new Set(artifactReceipts.map(({ data }) => data.artifact.artifactId));
    expect(artifactIds.size).toBe(1);
    expect(artifactReceipts.filter(({ data }) => data.created)).toHaveLength(1);
    const artifactCount = await databasePool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM campaign_os.campaign_export_artifacts
       WHERE campaign_id = $1 AND source_fingerprint = $2 AND format = 'csv'`,
      [campaignId, winners.data.sourceFingerprint],
    );
    expect(artifactCount.rows).toEqual([{ count: "1" }]);

    const artifactId = [...artifactIds][0]!;
    const download = await fetch(
      `${server.url}/api/admin/campaigns/${campaignId}/artifacts/${artifactId}/download`,
      { headers: adminHeaders(session, "trace-admin-http-download") },
    );
    const content = await download.text();
    expect(download.status).toBe(200);
    expect(download.headers.get("content-length")).toBe(String(Buffer.byteLength(content, "utf8")));
    expect(download.headers.get("x-campaign-os-content-sha256"))
      .toBe(artifactReceipts[0]!.data.artifact.contentHash);
    expect(content).toContain(participantId);
  }, 60_000);
});
