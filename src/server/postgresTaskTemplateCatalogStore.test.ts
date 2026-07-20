// @vitest-environment node

import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { TaskTemplateCatalogVersion } from "../domain/taskTemplateCatalog";
import { taskTemplateCatalogManifestV1 } from "./taskTemplateCatalogManifest";
import {
  loadPostgresMigrations,
  runPostgresMigrations,
  type PostgresMigrationPool,
} from "./postgresMigration";
import {
  createPostgresTaskTemplateCatalogStore,
  type PostgresTaskTemplateCatalogClient,
  type PostgresTaskTemplateCatalogPool,
  type PostgresTaskTemplateCatalogQueryResult,
} from "./postgresTaskTemplateCatalogStore";

const NOW = "2026-07-20T08:00:00.000Z";
const TEST_DATABASE_URL = process.env.CAMPAIGN_OS_TEST_DATABASE_URL?.trim();
const REQUIRE_POSTGRES_TESTS = process.env.CAMPAIGN_OS_REQUIRE_POSTGRES_TESTS?.trim() === "1";

if (REQUIRE_POSTGRES_TESTS && !TEST_DATABASE_URL) {
  throw new Error(
    "Task template catalog PostgreSQL acceptance requires CAMPAIGN_OS_TEST_DATABASE_URL.",
  );
}

const postgresSuite = TEST_DATABASE_URL ? describe : describe.skip;
const CURSOR_KEY = Buffer.alloc(32, 7);
const directTemplate = taskTemplateCatalogManifestV1.find(
  ({ adoptionMode }) => adoptionMode === "direct",
)!;
const secondDirectTemplate = taskTemplateCatalogManifestV1.find(
  ({ adoptionMode, templateCode }) =>
    adoptionMode === "direct" && templateCode !== directTemplate.templateCode,
)!;
const manualTemplate = taskTemplateCatalogManifestV1.find(
  ({ adoptionMode }) => adoptionMode === "manual_review",
)!;
const deferredTemplate = taskTemplateCatalogManifestV1.find(
  ({ adoptionMode }) => adoptionMode === "deferred",
)!;

const catalogRow = (
  template: TaskTemplateCatalogVersion,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  adoption_mode: template.adoptionMode,
  catalog_schema_version: template.catalogSchemaVersion,
  category: template.category,
  checksum: template.checksum,
  created_at: NOW,
  default_points: template.points.default,
  deprecated_at: template.status === "deprecated" ? NOW : null,
  evidence_rule: template.evidenceRule,
  locale_readiness: template.localeReadiness,
  localized_content: template.localizedContent,
  maximum_points: template.points.maximum,
  minimum_points: template.points.minimum,
  required_by_default: template.requiredPolicy.default,
  required_override_allowed: template.requiredPolicy.overrideAllowed,
  retired_at: template.status === "retired" ? NOW : null,
  risk_level: template.riskLevel,
  status: template.status,
  supported_locales: template.supportedLocales,
  template_code: template.templateCode,
  updated_at: NOW,
  verification_type: template.verificationType,
  version: template.version,
  wallet_compatibility: template.walletCompatibility,
  ...overrides,
});

const snapshot = (
  template: TaskTemplateCatalogVersion,
  points = template.points.default,
  required = template.requiredPolicy.default,
) => ({
  adoptionMode: "direct" as const,
  category: template.category,
  evidenceRule: template.evidenceRule,
  points,
  required,
  templateChecksum: template.checksum,
  templateCode: template.templateCode,
  templateVersion: template.version,
  verificationType: template.verificationType,
  version: "task-template-snapshot-v1" as const,
  walletCompatibility: template.walletCompatibility,
});

const adoptedTaskRow = (
  template: TaskTemplateCatalogVersion,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => {
  const points = typeof overrides.points === "number"
    ? overrides.points
    : template.points.default;
  const required = typeof overrides.required === "boolean"
    ? overrides.required
    : template.requiredPolicy.default;

  return {
    campaign_id: "campaign-catalog-1",
    created_at: NOW,
    evidence_rule: template.evidenceRule,
    id: "task-from-template-1",
    points,
    required,
    template_adoption_idempotency_key: "catalog-adoption-0001",
    template_checksum: template.checksum,
    template_code: template.templateCode,
    template_snapshot: snapshot(template, points, required),
    template_version: template.version,
    updated_at: NOW,
    verification_type: template.verificationType,
    wallet_compatibility: template.walletCompatibility,
    ...overrides,
  };
};

const emptyPool = (
  overrides: Partial<PostgresTaskTemplateCatalogPool> = {},
): PostgresTaskTemplateCatalogPool => ({
  connect: vi.fn(),
  end: vi.fn(async () => undefined),
  query: vi.fn(async () => ({ rows: [] })),
  ...overrides,
});

const createStore = (
  pool: PostgresTaskTemplateCatalogPool,
  options: Partial<Parameters<typeof createPostgresTaskTemplateCatalogStore>[0]> = {},
) => createPostgresTaskTemplateCatalogStore({
  cursorSigningKey: CURSOR_KEY,
  now: () => new Date(NOW),
  ownsPool: false,
  pool,
  taskId: () => "task-from-template-1",
  ...options,
});

const adoptionRequest = (
  template = directTemplate,
  overrides: { points?: number; required?: boolean } | undefined = undefined,
) => ({
  campaignId: "campaign-catalog-1",
  idempotencyKey: "catalog-adoption-0001",
  overrides,
  template: {
    templateCode: template.templateCode,
    version: template.version,
  },
});

const adoptionAuthority = {
  ownerAddress: "ELF_catalog_owner",
  traceId: "trace-catalog-adoption",
};

const transactionPool = ({
  campaignRows = [{ id: "campaign-catalog-1" }],
  catalog = directTemplate,
  existingRows = [[]] as Array<Array<Record<string, unknown>>>,
  insertRows = [adoptedTaskRow(directTemplate)],
}: {
  campaignRows?: Array<Record<string, unknown>>;
  catalog?: TaskTemplateCatalogVersion;
  existingRows?: Array<Array<Record<string, unknown>>>;
  insertRows?: Array<Record<string, unknown>>;
} = {}) => {
  const events: string[] = [];
  let existingRead = 0;
  const query = vi.fn(async (
    text: string,
    _values: readonly unknown[] = [],
  ): Promise<PostgresTaskTemplateCatalogQueryResult> => {
    if (text === "BEGIN") {
      events.push("BEGIN");
      return { rows: [] };
    }
    if (text === "COMMIT") {
      events.push("COMMIT");
      return { rows: [] };
    }
    if (text === "ROLLBACK") {
      events.push("ROLLBACK");
      return { rows: [] };
    }
    if (text.includes("FROM campaign_os.campaigns")) {
      events.push("CAMPAIGN_FENCE");
      return { rows: campaignRows };
    }
    if (text.includes("FROM campaign_os.task_template_catalog_versions")) {
      events.push("CATALOG_LOCK");
      return { rows: [catalogRow(catalog)] };
    }
    if (text.includes("FROM campaign_os.campaign_tasks")) {
      events.push("IDEMPOTENCY_READ");
      const rows = existingRows[Math.min(existingRead, existingRows.length - 1)] ?? [];
      existingRead += 1;
      return { rows };
    }
    if (text.includes("INSERT INTO campaign_os.campaign_tasks")) {
      events.push("TASK_INSERT");
      return { rows: insertRows };
    }

    throw new Error("Unexpected query shape.");
  });
  const client: PostgresTaskTemplateCatalogClient = {
    query,
    release: vi.fn(),
  };
  const pool = emptyPool({ connect: vi.fn(async () => client) });

  return { client, events, pool, query };
};

describe("PostgreSQL task template catalog reads", () => {
  it("uses bounded stable keyset pagination and binds the cursor to normalized filters", async () => {
    let listRead = 0;
    const query = vi.fn(async (text: string) => {
      if (text.includes("COUNT(*)")) {
        return { rows: [{ total_active: 12 }] };
      }

      listRead += 1;
      return {
        rows: listRead === 1
          ? [catalogRow(directTemplate), catalogRow(secondDirectTemplate)]
          : [catalogRow(secondDirectTemplate)],
      };
    });
    const store = createStore(emptyPool({ query }));
    const context = { traceId: "trace-catalog-list" };
    const first = await store.list({
      categories: [directTemplate.category],
      limit: 1,
    }, context);

    expect(first.catalogSchemaVersion).toBe("task-template-catalog-v1");
    expect(first.items).toEqual([directTemplate]);
    expect(first.page.nextCursor).toEqual(expect.any(String));
    expect(first.snapshotAt).toBe(NOW);
    expect(first.totalActive).toBe(12);
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0]?.[0]).toMatch(
      /ORDER BY\s+template_code COLLATE "C" ASC,\s+version ASC/,
    );
    expect(query.mock.calls[0]?.[0]).not.toContain("OFFSET");
    expect(query.mock.calls[0]?.[0]).not.toContain(`category = '${directTemplate.category}'`);

    const second = await store.list({
      categories: [directTemplate.category],
      cursor: first.page.nextCursor!,
      limit: 1,
    }, context);

    expect(second.items).toEqual([secondDirectTemplate]);
    expect(second.page.nextCursor).toBeNull();
    expect(query.mock.calls[2]?.[0]).toMatch(
      /\(template_code, version\) > \(\$\d+::text COLLATE "C", \$\d+::integer\)/,
    );
    expect(query).toHaveBeenCalledTimes(4);

    const callsBeforeReuse = query.mock.calls.length;
    await expect(store.list({
      categories: ["different-category"],
      cursor: first.page.nextCursor!,
      limit: 1,
    }, context)).rejects.toMatchObject({
      code: "TASK_TEMPLATE_CURSOR_INVALID",
      field: "cursor",
      operation: "list",
      retryable: false,
      traceId: context.traceId,
    });
    expect(query).toHaveBeenCalledTimes(callsBeforeReuse);
  });

  it("rejects tampered and expired cursors before querying PostgreSQL", async () => {
    let clock = new Date(NOW);
    const query = vi.fn(async (text: string, _values?: readonly unknown[]) => text.includes("COUNT(*)")
      ? { rows: [{ total_active: 12 }] }
      : { rows: [catalogRow(directTemplate), catalogRow(secondDirectTemplate)] });
    const store = createStore(emptyPool({ query }), {
      cursorTtlMs: 1_000,
      now: () => new Date(clock),
    });
    const first = await store.list({ limit: 1 }, { traceId: "trace-cursor-source" });
    const cursor = first.page.nextCursor!;
    const tampered = `${cursor.slice(0, -1)}${cursor.endsWith("a") ? "b" : "a"}`;
    const callsAfterFirstPage = query.mock.calls.length;

    await expect(store.list({ cursor: tampered, limit: 1 }, {
      traceId: "trace-cursor-tampered",
    })).rejects.toMatchObject({ code: "TASK_TEMPLATE_CURSOR_INVALID" });

    clock = new Date(Date.parse(NOW) + 1_001);
    await expect(store.list({ cursor, limit: 1 }, {
      traceId: "trace-cursor-expired",
    })).rejects.toMatchObject({ code: "TASK_TEMPLATE_CURSOR_INVALID" });
    expect(query).toHaveBeenCalledTimes(callsAfterFirstPage);
  });

  it("defaults to active rows and gates historical filters with a server-only flag", async () => {
    const query = vi.fn(async (text: string, _values?: readonly unknown[]) => text.includes("COUNT(*)")
      ? { rows: [{ total_active: 12 }] }
      : { rows: [] });
    const store = createStore(emptyPool({ query }));

    await store.list({}, { traceId: "trace-active-list" });
    expect(query.mock.calls[0]?.[1]).toContainEqual(["active"]);

    await expect(store.list({ statuses: ["deprecated"] }, {
      traceId: "trace-history-denied",
    })).rejects.toMatchObject({
      code: "TASK_TEMPLATE_ARGUMENT_INVALID",
      field: "statuses",
    });

    await expect(store.list({ statuses: ["deprecated"] }, {
      historicalReadAllowed: true,
      traceId: "trace-history-allowed",
    })).resolves.toMatchObject({ items: [] });
  });

  it("decodes an exact detail and recomputes the canonical checksum", async () => {
    const query = vi.fn(async () => ({ rows: [catalogRow(directTemplate)] }));
    const store = createStore(emptyPool({ query }));

    await expect(store.get({
      templateCode: directTemplate.templateCode,
      version: directTemplate.version,
    }, { traceId: "trace-catalog-detail" })).resolves.toEqual(directTemplate);
    expect(query).toHaveBeenCalledWith(
      expect.stringMatching(/WHERE template_code = \$1 AND version = \$2/),
      [directTemplate.templateCode, directTemplate.version],
    );
  });

  it.each([
    ["checksum mismatch", { checksum: "f".repeat(64) }],
    ["unknown schema", { catalog_schema_version: "task-template-catalog-v0" }],
    ["malformed locales", { supported_locales: Object.assign(["en-US"], { extra: true }) }],
    ["oversize JSON", { evidence_rule: { value: "x".repeat(17_000) } }],
  ])("fails closed on a %s without returning a partial row", async (_label, overrides) => {
    const store = createStore(emptyPool({
      query: vi.fn(async () => ({ rows: [catalogRow(directTemplate, overrides)] })),
    }));

    await expect(store.get({
      templateCode: directTemplate.templateCode,
      version: directTemplate.version,
    }, { traceId: "trace-corrupt-row" })).rejects.toMatchObject({
      code: "TASK_TEMPLATE_CORRUPT",
      field: "catalogRow",
      operation: "detail",
      retryable: false,
      traceId: "trace-corrupt-row",
    });
  });

  it("maps driver failures to a safe typed error without SQL, URL, or stack data", async () => {
    const store = createStore(emptyPool({
      query: vi.fn(async () => {
        throw Object.assign(new Error("driver-private-marker"), {
          code: "08006",
          query: "query-private-marker",
        });
      }),
    }));

    const outcome = store.get({
      templateCode: directTemplate.templateCode,
      version: directTemplate.version,
    }, { traceId: "trace-safe-driver-error" });

    await expect(outcome).rejects.toMatchObject({
      code: "TASK_TEMPLATE_CATALOG_UNAVAILABLE",
      field: "database",
      operation: "detail",
      retryable: true,
      traceId: "trace-safe-driver-error",
    });
    await expect(outcome).rejects.not.toThrow(/driver-private-marker|query-private-marker/i);
  });

  it("recognizes schema SQLSTATE on an Error instance and rejects client authority fields", async () => {
    const query = vi.fn(async () => {
      throw Object.assign(new Error("missing relation"), { code: "42P01" });
    });
    const store = createStore(emptyPool({ query }));

    await expect(store.get({
      templateCode: directTemplate.templateCode,
      version: directTemplate.version,
    }, { traceId: "trace-schema-not-ready" })).rejects.toMatchObject({
      code: "TASK_TEMPLATE_SCHEMA_NOT_READY",
      field: "database",
      retryable: true,
    });

    const callsBeforeForgedContext = query.mock.calls.length;
    await expect(store.list({}, {
      actor: "admin",
      traceId: "trace-forged-read-context",
    } as never)).rejects.toMatchObject({
      code: "TASK_TEMPLATE_ARGUMENT_INVALID",
      field: "context",
    });
    expect(query).toHaveBeenCalledTimes(callsBeforeForgedContext);
  });
});

describe("PostgreSQL task template catalog adoption", () => {
  it("locks Campaign ownership and exact catalog identity before one canonical Task insert", async () => {
    const { client, events, pool, query } = transactionPool();
    const store = createStore(pool);

    await expect(store.adopt(adoptionRequest(), adoptionAuthority)).resolves.toMatchObject({
      campaignId: "campaign-catalog-1",
      replayed: false,
      taskId: "task-from-template-1",
      templateChecksum: directTemplate.checksum,
      templateCode: directTemplate.templateCode,
      templateVersion: directTemplate.version,
    });
    expect(events).toEqual([
      "BEGIN",
      "CAMPAIGN_FENCE",
      "CATALOG_LOCK",
      "IDEMPOTENCY_READ",
      "TASK_INSERT",
      "COMMIT",
    ]);
    expect(query).toHaveBeenCalledWith(
      expect.stringMatching(/FROM campaign_os\.campaigns[\s\S]+owner_address = \$2[\s\S]+FOR SHARE/),
      [adoptionRequest().campaignId, adoptionAuthority.ownerAddress],
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringMatching(/FROM campaign_os\.task_template_catalog_versions[\s\S]+FOR SHARE/),
      [directTemplate.templateCode, directTemplate.version],
    );
    const insertCall = query.mock.calls.find(([text]) =>
      text.includes("INSERT INTO campaign_os.campaign_tasks"));
    expect(insertCall?.[0]).toContain("ON CONFLICT");
    expect(insertCall?.[0]).not.toContain(adoptionAuthority.ownerAddress);
    expect(insertCall?.[1]).toContain(JSON.stringify(snapshot(directTemplate)));
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("returns a deterministic replay without inserting for the same logical payload", async () => {
    const { events, pool } = transactionPool({
      existingRows: [[adoptedTaskRow(directTemplate)]],
    });
    const store = createStore(pool);

    await expect(store.adopt(adoptionRequest(), adoptionAuthority)).resolves.toMatchObject({
      replayed: true,
      taskId: "task-from-template-1",
    });
    expect(events).toEqual([
      "BEGIN",
      "CAMPAIGN_FENCE",
      "CATALOG_LOCK",
      "IDEMPOTENCY_READ",
      "COMMIT",
    ]);
  });

  it("resolves an insert race to the same Task and never creates a second result", async () => {
    const { events, pool } = transactionPool({
      existingRows: [[], [adoptedTaskRow(directTemplate)]],
      insertRows: [],
    });
    const store = createStore(pool);

    await expect(store.adopt(adoptionRequest(), adoptionAuthority)).resolves.toMatchObject({
      replayed: true,
      taskId: "task-from-template-1",
    });
    expect(events).toEqual([
      "BEGIN",
      "CAMPAIGN_FENCE",
      "CATALOG_LOCK",
      "IDEMPOTENCY_READ",
      "TASK_INSERT",
      "IDEMPOTENCY_READ",
      "COMMIT",
    ]);
  });

  it("rolls back same-key different-payload reuse as a typed conflict", async () => {
    const { events, pool } = transactionPool({
      existingRows: [[adoptedTaskRow(secondDirectTemplate)]],
    });
    const store = createStore(pool);

    await expect(store.adopt(adoptionRequest(), adoptionAuthority)).rejects.toMatchObject({
      code: "TASK_TEMPLATE_ADOPTION_CONFLICT",
      field: "idempotencyKey",
      operation: "adopt",
      retryable: false,
      traceId: adoptionAuthority.traceId,
    });
    expect(events).toEqual([
      "BEGIN",
      "CAMPAIGN_FENCE",
      "CATALOG_LOCK",
      "IDEMPOTENCY_READ",
      "ROLLBACK",
    ]);
  });

  it.each([
    [manualTemplate, "TASK_TEMPLATE_MANUAL_REVIEW_REQUIRED"],
    [deferredTemplate, "TASK_TEMPLATE_ADOPTION_DEFERRED"],
  ])("rejects %s adoption mode with zero Task writes", async (template, code) => {
    const { events, pool } = transactionPool({ catalog: template });
    const store = createStore(pool);

    await expect(store.adopt(adoptionRequest(template), adoptionAuthority)).rejects.toMatchObject({
      code,
      field: "template",
      operation: "adopt",
    });
    expect(events).toEqual(["BEGIN", "CAMPAIGN_FENCE", "CATALOG_LOCK", "ROLLBACK"]);
  });

  it("uses the locked lifecycle state and rejects stale adoption with zero Task writes", async () => {
    const staleTemplate = Object.freeze({
      ...directTemplate,
      status: "deprecated" as const,
    });
    const { events, pool } = transactionPool({ catalog: staleTemplate });
    const store = createStore(pool);

    await expect(store.adopt(adoptionRequest(staleTemplate), adoptionAuthority)).rejects.toMatchObject({
      code: "TASK_TEMPLATE_STALE",
      field: "template",
    });
    expect(events).toEqual(["BEGIN", "CAMPAIGN_FENCE", "CATALOG_LOCK", "ROLLBACK"]);
  });

  it("rejects points and required overrides outside the locked template policy", async () => {
    const forbiddenRequired = Object.freeze({
      ...directTemplate,
      requiredPolicy: Object.freeze({ default: true, overrideAllowed: false }),
    });

    for (const overrides of [
      { points: directTemplate.points.maximum + 1 },
      { required: false },
    ]) {
      const { events, pool } = transactionPool({
        catalog: overrides.required === false ? forbiddenRequired : directTemplate,
      });
      const store = createStore(pool);

      await expect(store.adopt(adoptionRequest(
        overrides.required === false ? forbiddenRequired : directTemplate,
        overrides,
      ), adoptionAuthority)).rejects.toMatchObject({
        code: "TASK_TEMPLATE_POLICY_MISMATCH",
        field: overrides.required === false ? "overrides.required" : "overrides.points",
      });
      expect(events).toEqual(["BEGIN", "CAMPAIGN_FENCE", "CATALOG_LOCK", "ROLLBACK"]);
    }
  });

  it("does not reveal whether a Campaign exists when the owner fence fails", async () => {
    const { events, pool } = transactionPool({ campaignRows: [] });
    const store = createStore(pool);

    await expect(store.adopt(adoptionRequest(), adoptionAuthority)).rejects.toMatchObject({
      code: "TASK_TEMPLATE_NOT_FOUND",
      field: "campaign",
    });
    expect(events).toEqual(["BEGIN", "CAMPAIGN_FENCE", "ROLLBACK"]);
  });
});

describe("PostgreSQL task template catalog lifecycle", () => {
  it("closes an owned Pool once and leaves a borrowed Pool open", async () => {
    const ownedEnd = vi.fn(async () => undefined);
    const owned = createStore(emptyPool({ end: ownedEnd }), { ownsPool: true });
    const firstClose = owned.close({ traceId: "trace-owned-close" });
    const secondClose = owned.close({ traceId: "trace-owned-close-repeat" });

    expect(firstClose).toBe(secondClose);
    await expect(firstClose).resolves.toBeUndefined();
    expect(ownedEnd).toHaveBeenCalledOnce();

    const borrowedEnd = vi.fn(async () => undefined);
    const borrowed = createStore(emptyPool({ end: borrowedEnd }), { ownsPool: false });
    await borrowed.close({ traceId: "trace-borrowed-close" });
    expect(borrowedEnd).not.toHaveBeenCalled();
  });

  it("rejects new work while closing and drains an active read before ending the Pool", async () => {
    let releaseRows: (result: PostgresTaskTemplateCatalogQueryResult) => void = () => undefined;
    const rows = new Promise<PostgresTaskTemplateCatalogQueryResult>((resolve) => {
      releaseRows = resolve;
    });
    const end = vi.fn(async () => undefined);
    const query = vi.fn(async (text: string) => text.includes("COUNT(*)")
      ? { rows: [{ total_active: 12 }] }
      : rows);
    const store = createStore(emptyPool({ end, query }), { ownsPool: true });
    const listing = store.list({}, { traceId: "trace-drain-list" });
    await vi.waitFor(() => expect(query).toHaveBeenCalledOnce());

    const closing = store.close({ traceId: "trace-drain-close" });
    expect(end).not.toHaveBeenCalled();
    await expect(store.get({
      templateCode: directTemplate.templateCode,
      version: directTemplate.version,
    }, { traceId: "trace-after-close" })).rejects.toMatchObject({
      code: "TASK_TEMPLATE_CLOSED",
      field: "store",
    });

    releaseRows({ rows: [] });
    await expect(listing).resolves.toMatchObject({ items: [] });
    await expect(closing).resolves.toBeUndefined();
    expect(end).toHaveBeenCalledOnce();
  });

  it("maps owned Pool shutdown failure to a safe cleanup error", async () => {
    const store = createStore(emptyPool({
      end: vi.fn(async () => {
        throw new Error("driver-private-marker");
      }),
    }), { ownsPool: true });

    await expect(store.close({ traceId: "trace-cleanup-failure" })).rejects.toMatchObject({
      code: "TASK_TEMPLATE_CLEANUP_FAILED",
      field: "pool",
      operation: "close",
      retryable: true,
      traceId: "trace-cleanup-failure",
    });
  });
});

const createRealPool = (databaseUrl: string, max = 24): pg.Pool => {
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

postgresSuite("PostgreSQL task template catalog real acceptance", () => {
  const databaseName = `campaign_os_m246_store_${process.pid}_${randomUUID()
    .replace(/-/g, "")
    .slice(0, 10)}`;
  const campaignId = "campaign-catalog-live-1";
  const ownerAddress = "ELF_catalog_live_owner";
  let adminPool: pg.Pool;
  let databasePool: pg.Pool;
  let store: ReturnType<typeof createPostgresTaskTemplateCatalogStore>;
  let taskSequence = 0;

  beforeAll(async () => {
    if (!/^[a-z0-9_]+$/.test(databaseName)) {
      throw new Error("Generated PostgreSQL acceptance database name is invalid.");
    }
    adminPool = createRealPool(TEST_DATABASE_URL!, 4);
    await adminPool.query(`CREATE DATABASE "${databaseName}"`);
    const databaseUrl = isolatedDatabaseUrl(TEST_DATABASE_URL!, databaseName);
    const migrationPool = createRealPool(databaseUrl, 4);
    try {
      const migrations = await loadPostgresMigrations();
      await runPostgresMigrations({
        approved: true,
        migrations,
        mode: "apply",
        pool: migrationPool as unknown as PostgresMigrationPool,
        traceId: "trace-catalog-store-migration",
      });
    } finally {
      await migrationPool.end();
    }

    databasePool = createRealPool(databaseUrl, 32);
    await databasePool.query(
      `INSERT INTO campaign_os.campaigns (
         id, project_id, owner_address, status, default_locale, supported_locales,
         wallet_policy, contract_mode, goal, duration, reward_description,
         start_time, end_time, publish_readiness, created_at, updated_at
       ) VALUES (
         $1, 'project-catalog-live', $2, 'draft', 'en-US', '["en-US"]'::jsonb,
         'ANY', 'OFF_CHAIN_MVP', 'Catalog acceptance', '30 days', 'Points only',
         '2026-08-01T00:00:00.000Z', '2026-08-31T00:00:00.000Z', '{}'::jsonb,
         $3, $3
       )`,
      [campaignId, ownerAddress, NOW],
    );
    store = createPostgresTaskTemplateCatalogStore({
      cursorSigningKey: CURSOR_KEY,
      now: () => new Date(NOW),
      ownsPool: false,
      pool: databasePool as unknown as PostgresTaskTemplateCatalogPool,
      taskId: () => `task-catalog-live-${++taskSequence}`,
    });
  }, 60_000);

  afterAll(async () => {
    const cleanupErrors: unknown[] = [];
    if (store) {
      try {
        await store.close({ traceId: "trace-catalog-store-close" });
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    if (databasePool) {
      try {
        await databasePool.end();
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
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
      throw new Error("Task template catalog acceptance cleanup failed.");
    }
  }, 60_000);

  it("reads filtered keyset pages and exact details from the migrated catalog", async () => {
    const first = await store.list({ locale: "en-US", limit: 5 }, {
      traceId: "trace-catalog-live-list-1",
    });
    expect(first.items).toHaveLength(5);
    expect(first.page.nextCursor).toEqual(expect.any(String));
    expect(first.totalActive).toBe(12);

    const second = await store.list({
      cursor: first.page.nextCursor!,
      limit: 5,
      locale: "en-US",
    }, { traceId: "trace-catalog-live-list-2" });
    expect(second.items).toHaveLength(5);
    expect(new Set([
      ...first.items.map(({ templateCode, version }) => `${templateCode}@${version}`),
      ...second.items.map(({ templateCode, version }) => `${templateCode}@${version}`),
    ]).size).toBe(10);

    const filtered = await store.list({ categories: [directTemplate.category] }, {
      traceId: "trace-catalog-live-filter",
    });
    expect(filtered.items).toEqual([directTemplate]);
    await expect(store.get({
      templateCode: directTemplate.templateCode,
      version: directTemplate.version,
    }, { traceId: "trace-catalog-live-detail" })).resolves.toEqual(directTemplate);
  });

  it("atomically adopts, replays, and rejects a different idempotency payload", async () => {
    const request = {
      ...adoptionRequest(),
      campaignId,
      idempotencyKey: "catalog-live-idempotency-1",
    };
    const authority = {
      ownerAddress,
      traceId: "trace-catalog-live-adopt",
    };
    const created = await store.adopt(request, authority);
    expect(created.replayed).toBe(false);

    await expect(store.adopt(request, {
      ...authority,
      traceId: "trace-catalog-live-replay",
    })).resolves.toMatchObject({
      replayed: true,
      taskId: created.taskId,
    });
    await expect(store.adopt({
      ...request,
      overrides: { points: directTemplate.points.default + 1 },
    }, {
      ...authority,
      traceId: "trace-catalog-live-conflict",
    })).rejects.toMatchObject({
      code: "TASK_TEMPLATE_ADOPTION_CONFLICT",
      field: "idempotencyKey",
    });

    const persisted = await databasePool.query(
      `SELECT template_code, template_version, template_checksum, template_snapshot,
         COUNT(*) OVER ()::integer AS task_count
       FROM campaign_os.campaign_tasks
       WHERE campaign_id = $1 AND template_adoption_idempotency_key = $2`,
      [campaignId, request.idempotencyKey],
    );
    expect(persisted.rows).toHaveLength(1);
    expect(persisted.rows[0]).toMatchObject({
      task_count: 1,
      template_checksum: directTemplate.checksum,
      template_code: directTemplate.templateCode,
      template_snapshot: snapshot(directTemplate),
      template_version: directTemplate.version,
    });
  });

  it("creates at most one Task for twenty concurrent same-key adoptions", async () => {
    const template = secondDirectTemplate;
    const request = {
      ...adoptionRequest(template),
      campaignId,
      idempotencyKey: "catalog-live-concurrent-1",
    };
    const results = await Promise.all(Array.from({ length: 20 }, (_, index) =>
      store.adopt(request, {
        ownerAddress,
        traceId: `trace-catalog-concurrent-${index}`,
      })));

    expect(new Set(results.map(({ taskId }) => taskId)).size).toBe(1);
    expect(results.filter(({ replayed }) => !replayed)).toHaveLength(1);
    const count = await databasePool.query(
      `SELECT COUNT(*)::integer AS count
       FROM campaign_os.campaign_tasks
       WHERE campaign_id = $1 AND template_adoption_idempotency_key = $2`,
      [campaignId, request.idempotencyKey],
    );
    expect(count.rows[0]?.count).toBe(1);
  });

  it("keeps unauthorized, deferred, and stale adoption paths at zero writes", async () => {
    const before = await databasePool.query(
      "SELECT COUNT(*)::integer AS count FROM campaign_os.campaign_tasks WHERE campaign_id = $1",
      [campaignId],
    );
    await expect(store.adopt({
      ...adoptionRequest(),
      campaignId,
      idempotencyKey: "catalog-live-unauthorized-1",
    }, {
      ownerAddress: "ELF_not_the_owner",
      traceId: "trace-catalog-live-unauthorized",
    })).rejects.toMatchObject({ code: "TASK_TEMPLATE_NOT_FOUND", field: "campaign" });
    await expect(store.adopt({
      ...adoptionRequest(deferredTemplate),
      campaignId,
      idempotencyKey: "catalog-live-deferred-1",
    }, {
      ownerAddress,
      traceId: "trace-catalog-live-deferred",
    })).rejects.toMatchObject({ code: "TASK_TEMPLATE_ADOPTION_DEFERRED" });

    const staleTemplate = taskTemplateCatalogManifestV1.find(
      ({ adoptionMode, templateCode }) =>
        adoptionMode === "direct"
        && templateCode !== directTemplate.templateCode
        && templateCode !== secondDirectTemplate.templateCode,
    )!;
    await databasePool.query(
      `UPDATE campaign_os.task_template_catalog_versions
       SET status = 'deprecated', deprecated_at = $3, updated_at = $3
       WHERE template_code = $1 AND version = $2`,
      [staleTemplate.templateCode, staleTemplate.version, "2026-07-20T08:01:00.000Z"],
    );
    await expect(store.adopt({
      ...adoptionRequest(staleTemplate),
      campaignId,
      idempotencyKey: "catalog-live-stale-1",
    }, {
      ownerAddress,
      traceId: "trace-catalog-live-stale",
    })).rejects.toMatchObject({ code: "TASK_TEMPLATE_STALE" });

    const after = await databasePool.query(
      "SELECT COUNT(*)::integer AS count FROM campaign_os.campaign_tasks WHERE campaign_id = $1",
      [campaignId],
    );
    expect(after.rows[0]?.count).toBe(before.rows[0]?.count);
  });

  it("detects canonical checksum corruption and preserves facts across a Pool restart", async () => {
    const target = taskTemplateCatalogManifestV1.find(
      ({ status, templateCode }) => status === "active"
        && templateCode !== directTemplate.templateCode
        && templateCode !== secondDirectTemplate.templateCode,
    )!;
    await databasePool.query(
      "ALTER TABLE campaign_os.task_template_catalog_versions DISABLE TRIGGER task_template_catalog_update_guard",
    );
    try {
      await databasePool.query(
        `UPDATE campaign_os.task_template_catalog_versions
         SET checksum = $3
         WHERE template_code = $1 AND version = $2`,
        [target.templateCode, target.version, "f".repeat(64)],
      );
      await expect(store.get({
        templateCode: target.templateCode,
        version: target.version,
      }, { traceId: "trace-catalog-live-corrupt" })).rejects.toMatchObject({
        code: "TASK_TEMPLATE_CORRUPT",
      });
      await databasePool.query(
        `UPDATE campaign_os.task_template_catalog_versions
         SET checksum = $3
         WHERE template_code = $1 AND version = $2`,
        [target.templateCode, target.version, target.checksum],
      );
    } finally {
      await databasePool.query(
        "ALTER TABLE campaign_os.task_template_catalog_versions ENABLE TRIGGER task_template_catalog_update_guard",
      );
    }

    await store.close({ traceId: "trace-catalog-pre-restart-close" });
    const restartPool = createRealPool(
      isolatedDatabaseUrl(TEST_DATABASE_URL!, databaseName),
      8,
    );
    const restartStore = createPostgresTaskTemplateCatalogStore({
      cursorSigningKey: CURSOR_KEY,
      ownsPool: true,
      pool: restartPool as unknown as PostgresTaskTemplateCatalogPool,
    });
    try {
      await expect(restartStore.get({
        templateCode: directTemplate.templateCode,
        version: directTemplate.version,
      }, { traceId: "trace-catalog-post-restart-detail" })).resolves.toEqual(directTemplate);
      const taskFacts = await restartPool.query(
        `SELECT COUNT(*)::integer AS count
         FROM campaign_os.campaign_tasks
         WHERE campaign_id = $1
           AND template_version IS NOT NULL
           AND template_checksum IS NOT NULL
           AND template_snapshot IS NOT NULL`,
        [campaignId],
      );
      expect(taskFacts.rows[0]?.count).toBe(2);
    } finally {
      await restartStore.close({ traceId: "trace-catalog-post-restart-close" });
    }
  });
});
