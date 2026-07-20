// @vitest-environment node

import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  issueResolvedWalletSessionAuthority,
  issueVerifiedWalletSubject,
} from "./walletAuthentication";
import {
  loadPostgresMigrations,
  runPostgresMigrations,
  type PostgresMigrationPool,
} from "./postgresMigration";
import {
  createPostgresTaskTemplateCatalogStore,
  type PostgresTaskTemplateCatalogPool,
} from "./postgresTaskTemplateCatalogStore";
import { taskTemplateCatalogManifestV1 } from "./taskTemplateCatalogManifest";
import {
  createTaskTemplateCatalogService,
  type TaskTemplateCatalogOwnerAdoptionAuthority,
} from "./taskTemplateCatalogService";

const TEST_DATABASE_URL = process.env.CAMPAIGN_OS_TEST_DATABASE_URL?.trim();
const REQUIRE_POSTGRES_TESTS = process.env.CAMPAIGN_OS_REQUIRE_POSTGRES_TESTS?.trim() === "1";
const NOW = "2026-07-20T10:00:00.000Z";
const CURSOR_KEY = Buffer.alloc(32, 17);

if (REQUIRE_POSTGRES_TESTS && !TEST_DATABASE_URL) {
  throw new Error(
    "Task template catalog service PostgreSQL acceptance requires CAMPAIGN_OS_TEST_DATABASE_URL.",
  );
}

const postgresSuite = TEST_DATABASE_URL ? describe : describe.skip;
const directTemplates = taskTemplateCatalogManifestV1.filter(
  ({ adoptionMode }) => adoptionMode === "direct",
);
const concurrentTemplate = directTemplates[0]!;
const staleTemplate = directTemplates[2]!;
const corruptTemplate = directTemplates[3]!;
const rollbackTemplate = directTemplates[4]!;
const deferredTemplate = taskTemplateCatalogManifestV1.find(
  ({ adoptionMode }) => adoptionMode === "deferred",
)!;
const manualTemplate = taskTemplateCatalogManifestV1.find(
  ({ adoptionMode }) => adoptionMode === "manual_review",
)!;

const createPool = (databaseUrl: string, maximum: number) => {
  const parsed = new URL(databaseUrl);
  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const loopback = hostname === "localhost" || hostname === "::1" || hostname.startsWith("127.");
  return new pg.Pool({
    connectionString: databaseUrl,
    max: maximum,
    ssl: loopback ? false : { rejectUnauthorized: true },
  });
};

const isolatedDatabaseUrl = (baseUrl: string, databaseName: string): string => {
  const parsed = new URL(baseUrl);
  parsed.pathname = `/${databaseName}`;
  parsed.search = "";
  return parsed.toString();
};

const waitForDatabaseSessionsToDrain = async (
  administrator: pg.Pool,
  databaseName: string,
): Promise<void> => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const result = await administrator.query(
      `SELECT COUNT(*)::integer AS count
       FROM pg_stat_activity
       WHERE datname = $1`,
      [databaseName],
    );
    if (result.rows[0]?.count === 0) {
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("Task template catalog service database sessions did not drain.");
};

postgresSuite("task template catalog service PostgreSQL adoption", () => {
  const databaseName = `campaign_os_m246_service_${process.pid}_${randomUUID()
    .replace(/-/g, "")
    .slice(0, 10)}`;
  const campaignId = "campaign-catalog-service-live-1";
  const ownerAddress = "ELF_catalog_service_live_owner";
  let adminPool: pg.Pool;
  let databasePool: pg.Pool;
  let store: ReturnType<typeof createPostgresTaskTemplateCatalogStore>;
  let service: ReturnType<typeof createTaskTemplateCatalogService>;
  let authority: TaskTemplateCatalogOwnerAdoptionAuthority;
  let taskSequence = 0;

  const command = ({
    idempotencyKey,
    points,
    template = concurrentTemplate,
    traceId,
  }: {
    idempotencyKey: string;
    points?: number;
    template?: typeof concurrentTemplate;
    traceId: string;
  }) => ({
    authority,
    campaignId,
    idempotencyKey,
    ...(points === undefined ? {} : { overrides: { points } }),
    template: {
      templateCode: template.templateCode,
      version: template.version,
    },
    traceId,
  });

  const taskCount = async (idempotencyKey?: string): Promise<number> => {
    const result = await databasePool.query(
      `SELECT COUNT(*)::integer AS count
       FROM campaign_os.campaign_tasks
       WHERE campaign_id = $1
         AND ($2::text IS NULL OR template_adoption_idempotency_key = $2)`,
      [campaignId, idempotencyKey ?? null],
    );
    return result.rows[0]?.count as number;
  };

  beforeAll(async () => {
    adminPool = createPool(TEST_DATABASE_URL!, 4);
    await adminPool.query(`CREATE DATABASE "${databaseName}"`);
    const databaseUrl = isolatedDatabaseUrl(TEST_DATABASE_URL!, databaseName);
    const migrationPool = createPool(databaseUrl, 4);
    try {
      await runPostgresMigrations({
        approved: true,
        migrations: await loadPostgresMigrations(),
        mode: "apply",
        pool: migrationPool as unknown as PostgresMigrationPool,
        traceId: "trace-catalog-service-migration",
      });
    } finally {
      await migrationPool.end();
    }

    databasePool = createPool(databaseUrl, 32);
    await databasePool.query(
      `INSERT INTO campaign_os.campaigns (
         id, project_id, owner_address, status, default_locale, supported_locales,
         wallet_policy, contract_mode, goal, duration, reward_description,
         start_time, end_time, publish_readiness, created_at, updated_at
       ) VALUES (
         $1, 'project-catalog-service', $2, 'draft', 'en-US', '["en-US"]'::jsonb,
         'ANY', 'OFF_CHAIN_MVP', 'Catalog service acceptance', '30 days', 'Points only',
         '2026-08-01T00:00:00.000Z', '2026-08-31T00:00:00.000Z', '{}'::jsonb,
         $3, $3
       )`,
      [campaignId, ownerAddress, NOW],
    );

    const session = issueResolvedWalletSessionAuthority({
      absoluteExpiresAt: "2026-07-20T12:00:00.000Z",
      capabilities: ["campaign:read", "campaign:write", "task:build"],
      credentialBoundary: "wallet-auth-cookie/v1",
      idleExpiresAt: "2026-07-20T11:00:00.000Z",
      membershipRevision: "catalog-service-live-membership-v1",
      roleIds: ["project_owner"],
      sessionId: "catalog-service-live-session-v1",
      subject: issueVerifiedWalletSubject({
        accountType: "EOA",
        adapterId: "nightelf-live",
        chainId: "AELF",
        network: "mainnet",
        proofDigest: "c".repeat(64),
        proofMethod: "AELF_EOA_RECOVERABLE",
        signerAddress: ownerAddress,
        verifiedAt: "2026-07-20T09:55:00.000Z",
        walletAddress: ownerAddress,
        walletSource: "NIGHTELF",
      }),
      version: 1,
    });
    authority = Object.freeze({ campaignId, kind: "owner", session });
    store = createPostgresTaskTemplateCatalogStore({
      cursorSigningKey: CURSOR_KEY,
      now: () => new Date(NOW),
      ownsPool: false,
      pool: databasePool as unknown as PostgresTaskTemplateCatalogPool,
      taskId: () => `task-catalog-service-live-${++taskSequence}`,
    });
    service = createTaskTemplateCatalogService({ now: () => new Date(NOW), store });
  }, 60_000);

  afterAll(async () => {
    const failures: unknown[] = [];
    if (service) {
      try {
        await service.close({ traceId: "trace-catalog-service-close" });
      } catch (error) {
        failures.push(error);
      }
    }
    if (databasePool) {
      try {
        await databasePool.end();
      } catch (error) {
        failures.push(error);
      }
    }
    if (adminPool) {
      try {
        await waitForDatabaseSessionsToDrain(adminPool, databaseName);
        await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
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
      throw new Error("Task template catalog service acceptance cleanup failed.");
    }
  }, 60_000);

  it("creates one Task for twenty same-key requests and conflicts every mismatched replay", async () => {
    const idempotencyKey = "catalog-service-live-concurrent-1";
    const results = await Promise.all(Array.from({ length: 20 }, (_, index) => service.adopt(command({
      idempotencyKey,
      template: concurrentTemplate,
      traceId: `trace-service-concurrent-${index}`,
    }))));

    expect(new Set(results.map(({ taskId }) => taskId)).size).toBe(1);
    expect(results.filter(({ replayed }) => !replayed)).toHaveLength(1);
    expect(await taskCount(idempotencyKey)).toBe(1);

    const beforeMismatch = await taskCount();
    const mismatches = await Promise.allSettled(Array.from({ length: 20 }, (_, index) => service.adopt(command({
      idempotencyKey,
      points: concurrentTemplate.points.default + 1,
      template: concurrentTemplate,
      traceId: `trace-service-mismatch-${index}`,
    }))));
    expect(mismatches.filter(({ status }) => status === "fulfilled")).toHaveLength(0);
    expect(mismatches.every((result) => result.status === "rejected"
      && result.reason instanceof Error
      && (result.reason as { code?: unknown }).code === "TASK_TEMPLATE_ADOPTION_CONFLICT")).toBe(true);
    expect(await taskCount()).toBe(beforeMismatch);

    const duplicate = await service.adopt(command({
      idempotencyKey: "catalog-service-live-different-key-1",
      template: concurrentTemplate,
      traceId: "trace-service-different-key",
    }));
    expect(duplicate.replayed).toBe(false);
    expect(duplicate.taskId).not.toBe(results[0]?.taskId);
  });

  it("keeps stale, manual, deferred, and corrupt outcomes at zero writes", async () => {
    const before = await taskCount();
    await databasePool.query(
      `UPDATE campaign_os.task_template_catalog_versions
       SET status = 'deprecated', deprecated_at = $3, updated_at = $3
       WHERE template_code = $1 AND version = $2`,
      [staleTemplate.templateCode, staleTemplate.version, "2026-07-20T10:01:00.000Z"],
    );
    await expect(service.adopt(command({
      idempotencyKey: "catalog-service-live-stale-1",
      template: staleTemplate,
      traceId: "trace-service-stale",
    }))).rejects.toMatchObject({ code: "TASK_TEMPLATE_STALE", traceId: "trace-service-stale" });
    await expect(service.adopt(command({
      idempotencyKey: "catalog-service-live-manual-1",
      template: manualTemplate,
      traceId: "trace-service-manual",
    }))).rejects.toMatchObject({
      code: "TASK_TEMPLATE_MANUAL_REVIEW_REQUIRED",
      traceId: "trace-service-manual",
    });
    await expect(service.adopt(command({
      idempotencyKey: "catalog-service-live-deferred-1",
      template: deferredTemplate,
      traceId: "trace-service-deferred",
    }))).rejects.toMatchObject({
      code: "TASK_TEMPLATE_ADOPTION_DEFERRED",
      traceId: "trace-service-deferred",
    });

    await databasePool.query(
      "ALTER TABLE campaign_os.task_template_catalog_versions DISABLE TRIGGER task_template_catalog_update_guard",
    );
    try {
      await databasePool.query(
        `UPDATE campaign_os.task_template_catalog_versions
         SET checksum = $3
         WHERE template_code = $1 AND version = $2`,
        [corruptTemplate.templateCode, corruptTemplate.version, "f".repeat(64)],
      );
      await expect(service.adopt(command({
        idempotencyKey: "catalog-service-live-corrupt-1",
        template: corruptTemplate,
        traceId: "trace-service-corrupt",
      }))).rejects.toMatchObject({
        code: "TASK_TEMPLATE_CORRUPT",
        traceId: "trace-service-corrupt",
      });
      await databasePool.query(
        `UPDATE campaign_os.task_template_catalog_versions
         SET checksum = $3
         WHERE template_code = $1 AND version = $2`,
        [corruptTemplate.templateCode, corruptTemplate.version, corruptTemplate.checksum],
      );
    } finally {
      await databasePool.query(
        "ALTER TABLE campaign_os.task_template_catalog_versions ENABLE TRIGGER task_template_catalog_update_guard",
      );
    }
    expect(await taskCount()).toBe(before);
  });

  it("rolls back a real transaction when post-read Task ID generation fails", async () => {
    const before = await taskCount();
    const failingStore = createPostgresTaskTemplateCatalogStore({
      cursorSigningKey: CURSOR_KEY,
      now: () => new Date(NOW),
      ownsPool: false,
      pool: databasePool as unknown as PostgresTaskTemplateCatalogPool,
      taskId: () => {
        throw new Error("sensitive-provider-detail");
      },
    });
    const failingService = createTaskTemplateCatalogService({
      now: () => new Date(NOW),
      store: failingStore,
    });
    const idempotencyKey = "catalog-service-live-rollback-1";
    const failure = await failingService.adopt(command({
      idempotencyKey,
      template: rollbackTemplate,
      traceId: "trace-service-rollback",
    })).catch((error: unknown) => error);

    expect(failure).toMatchObject({
      code: "TASK_TEMPLATE_CATALOG_UNAVAILABLE",
      operation: "adopt",
      retryable: true,
      traceId: "trace-service-rollback",
    });
    expect(JSON.stringify(failure)).not.toContain("sensitive-provider-detail");
    expect(await taskCount(idempotencyKey)).toBe(0);
    expect(await taskCount()).toBe(before);
    await failingService.close({ traceId: "trace-service-failing-close" });
  });
});
