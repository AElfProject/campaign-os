// @vitest-environment node

import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  TASK_TEMPLATE_CATALOG_SCHEMA_VERSION,
  createTaskTemplateCatalogVersion,
  type TaskTemplateCatalogVersion,
  type TaskTemplateCatalogVersionSource,
} from "../domain/taskTemplateCatalog";
import { resolveCampaignOsCampaignDbConfig } from "./config";
import {
  loadPostgresMigrations,
  runPostgresMigrations,
  type PostgresMigrationPool,
} from "./postgresMigration";
import {
  createPostgresTaskTemplateCatalogStore,
  type PostgresTaskTemplateCatalogClient,
  type PostgresTaskTemplateCatalogPool,
  type PostgresTaskTemplateCatalogQueryInput,
  type PostgresTaskTemplateCatalogQueryResult,
} from "./postgresTaskTemplateCatalogStore";

const TEST_DATABASE_URL = process.env.CAMPAIGN_OS_TEST_DATABASE_URL?.trim();
const REQUIRE_POSTGRES_TESTS =
  process.env.CAMPAIGN_OS_REQUIRE_POSTGRES_TESTS?.trim() === "1";

if (REQUIRE_POSTGRES_TESTS && !TEST_DATABASE_URL) {
  throw new Error(
    "Task template catalog performance acceptance requires CAMPAIGN_OS_TEST_DATABASE_URL.",
  );
}

const postgresSuite = TEST_DATABASE_URL ? describe : describe.skip;
const VERSION_COUNT = 10_000;
const ACTIVE_COUNT = 1_000;
const VERSIONS_PER_TEMPLATE = VERSION_COUNT / ACTIVE_COUNT;
const ACTIVE_VERSION = VERSIONS_PER_TEMPLATE;
const PAGE_COUNT = 100;
const PAGE_SIZE = ACTIVE_COUNT / PAGE_COUNT;
const MAX_RESPONSE_BYTES = 256 * 1_024;
const LIST_P95_THRESHOLD_MS = 250;
const DETAIL_P95_THRESHOLD_MS = 100;
const WARM_SAMPLE_COUNT = 10;
const MEASURED_SAMPLE_COUNT = 40;
const CREATED_AT = "2026-07-20T00:00:00.000Z";
const DEPRECATED_AT = "2026-07-20T00:01:00.000Z";
const CURSOR_SIGNING_KEY = Buffer.alloc(32, 46);

interface DatasetRow {
  readonly adoption_mode: string;
  readonly catalog_schema_version: string;
  readonly category: string;
  readonly checksum: string;
  readonly created_at: string;
  readonly default_points: number;
  readonly deprecated_at: string | null;
  readonly evidence_rule: TaskTemplateCatalogVersion["evidenceRule"];
  readonly locale_readiness: TaskTemplateCatalogVersion["localeReadiness"];
  readonly localized_content: TaskTemplateCatalogVersion["localizedContent"];
  readonly maximum_points: number;
  readonly minimum_points: number;
  readonly required_by_default: boolean;
  readonly required_override_allowed: boolean;
  readonly retired_at: null;
  readonly risk_level: string;
  readonly status: string;
  readonly supported_locales: TaskTemplateCatalogVersion["supportedLocales"];
  readonly template_code: string;
  readonly updated_at: string;
  readonly verification_type: string;
  readonly version: number;
  readonly wallet_compatibility: string;
}

interface InstrumentedCatalogPool extends PostgresTaskTemplateCatalogPool {
  queryCount(): number;
  resetQueryCount(): void;
}

interface TimingSummary {
  readonly maxMs: number;
  readonly p50Ms: number;
  readonly p95Ms: number;
  readonly samples: number;
}

interface SafeExplainAggregate {
  readonly actualRows: number;
  readonly executionTimeMs: number;
  readonly indexes: readonly string[];
  readonly label: "count" | "detail" | "list";
  readonly nodeCount: number;
  readonly nodeTypes: readonly string[];
  readonly planningTimeMs: number;
  readonly sharedHitBlocks: number;
  readonly sharedReadBlocks: number;
  readonly totalCost: number;
}

const INSERT_DATASET_SQL = `
  INSERT INTO campaign_os.task_template_catalog_versions (
    template_code,
    version,
    catalog_schema_version,
    status,
    adoption_mode,
    category,
    verification_type,
    wallet_compatibility,
    default_points,
    minimum_points,
    maximum_points,
    required_by_default,
    required_override_allowed,
    risk_level,
    supported_locales,
    localized_content,
    locale_readiness,
    evidence_rule,
    checksum,
    created_at,
    updated_at,
    deprecated_at,
    retired_at
  )
  SELECT
    template_code,
    version,
    catalog_schema_version,
    status,
    adoption_mode,
    category,
    verification_type,
    wallet_compatibility,
    default_points,
    minimum_points,
    maximum_points,
    required_by_default,
    required_override_allowed,
    risk_level,
    supported_locales,
    localized_content,
    locale_readiness,
    evidence_rule,
    checksum,
    created_at,
    updated_at,
    deprecated_at,
    retired_at
  FROM jsonb_to_recordset($1::jsonb) AS dataset(
    template_code text,
    version integer,
    catalog_schema_version text,
    status text,
    adoption_mode text,
    category text,
    verification_type text,
    wallet_compatibility text,
    default_points integer,
    minimum_points integer,
    maximum_points integer,
    required_by_default boolean,
    required_override_allowed boolean,
    risk_level text,
    supported_locales jsonb,
    localized_content jsonb,
    locale_readiness jsonb,
    evidence_rule jsonb,
    checksum text,
    created_at timestamptz,
    updated_at timestamptz,
    deprecated_at timestamptz,
    retired_at timestamptz
  )
`;

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
    throw new Error("Task template catalog performance requires PostgreSQL mode.");
  }

  return new pg.Pool(config.pool);
};

const isolatedDatabaseUrl = (baseUrl: string, databaseName: string): string => {
  const parsed = new URL(baseUrl);
  parsed.pathname = `/${databaseName}`;
  parsed.search = "";
  return parsed.toString();
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

const createInstrumentedCatalogPool = (pool: pg.Pool): InstrumentedCatalogPool => {
  let queries = 0;

  return {
    connect: async (): Promise<PostgresTaskTemplateCatalogClient> => {
      const client = await pool.connect();

      return {
        query: async (input, values = []) => {
          queries += 1;
          return executeCatalogQuery(client, input, values);
        },
        release: (destroy = false) => client.release(destroy),
      };
    },
    end: async () => pool.end(),
    query: async (input, values = []) => {
      queries += 1;
      return executeCatalogQuery(pool, input, values);
    },
    queryCount: () => queries,
    resetQueryCount: () => {
      queries = 0;
    },
  };
};

const datasetTemplateCode = (templateIndex: number): string =>
  `perf-template-${String(templateIndex).padStart(4, "0")}`;

const datasetVersion = (
  templateIndex: number,
  version: number,
): TaskTemplateCatalogVersion => {
  const active = version === ACTIVE_VERSION;
  const source: TaskTemplateCatalogVersionSource = {
    adoptionMode: "direct",
    catalogSchemaVersion: TASK_TEMPLATE_CATALOG_SCHEMA_VERSION,
    category: templateIndex === 0 ? "benchmark-single" : "benchmark-bulk",
    evidenceRule: {
      dataset: "m246-performance",
      templateIndex,
      version,
    },
    localeReadiness: { "en-US": "ready" },
    localizedContent: {
      "en-US": {
        description: `Deterministic PostgreSQL performance template ${templateIndex} version ${version}.`,
        title: `Performance template ${templateIndex} v${version}`,
      },
    },
    points: { default: 100, maximum: 200, minimum: 50 },
    requiredPolicy: { default: false, overrideAllowed: true },
    riskLevel: "low",
    status: active ? "active" : "deprecated",
    supportedLocales: ["en-US"],
    templateCode: datasetTemplateCode(templateIndex),
    verificationType: "WALLET",
    version,
    walletCompatibility: "ANY",
  };

  return createTaskTemplateCatalogVersion(source);
};

const datasetRow = (
  templateIndex: number,
  versionNumber: number,
): DatasetRow => {
  const version = datasetVersion(templateIndex, versionNumber);
  const active = version.status === "active";

  return {
    adoption_mode: version.adoptionMode,
    catalog_schema_version: version.catalogSchemaVersion,
    category: version.category,
    checksum: version.checksum,
    created_at: CREATED_AT,
    default_points: version.points.default,
    deprecated_at: active ? null : DEPRECATED_AT,
    evidence_rule: version.evidenceRule,
    locale_readiness: version.localeReadiness,
    localized_content: version.localizedContent,
    maximum_points: version.points.maximum,
    minimum_points: version.points.minimum,
    required_by_default: version.requiredPolicy.default,
    required_override_allowed: version.requiredPolicy.overrideAllowed,
    retired_at: null,
    risk_level: version.riskLevel,
    status: version.status,
    supported_locales: version.supportedLocales,
    template_code: version.templateCode,
    updated_at: active ? CREATED_AT : DEPRECATED_AT,
    verification_type: version.verificationType,
    version: version.version,
    wallet_compatibility: version.walletCompatibility,
  };
};

const populateDeterministicDataset = async (pool: pg.Pool): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM campaign_os.task_template_catalog_versions");

    const batch: DatasetRow[] = [];
    for (let templateIndex = 0; templateIndex < ACTIVE_COUNT; templateIndex += 1) {
      for (let version = 1; version <= VERSIONS_PER_TEMPLATE; version += 1) {
        batch.push(datasetRow(templateIndex, version));
        if (batch.length === 500) {
          await client.query(INSERT_DATASET_SQL, [JSON.stringify(batch)]);
          batch.length = 0;
        }
      }
    }
    if (batch.length > 0) {
      await client.query(INSERT_DATASET_SQL, [JSON.stringify(batch)]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  await pool.query("ANALYZE campaign_os.task_template_catalog_versions");
};

const percentile = (samples: readonly number[], ratio: number): number => {
  const sorted = [...samples].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * ratio) - 1)]
    ?? Number.POSITIVE_INFINITY;
};

const rounded = (value: number): number => Number(value.toFixed(3));

const summarizeTimings = (samples: readonly number[]): TimingSummary => ({
  maxMs: rounded(Math.max(...samples)),
  p50Ms: rounded(percentile(samples, 0.5)),
  p95Ms: rounded(percentile(samples, 0.95)),
  samples: samples.length,
});

const measure = async <TValue>(operation: () => Promise<TValue>) => {
  const startedAt = performance.now();
  const value = await operation();

  return { durationMs: performance.now() - startedAt, value };
};

const numericPlanValue = (plan: Record<string, unknown>, key: string): number => {
  const value = plan[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
};

const safeExplainAggregate = (
  label: SafeExplainAggregate["label"],
  rawPlan: unknown,
): SafeExplainAggregate => {
  const parsed = typeof rawPlan === "string" ? JSON.parse(rawPlan) as unknown : rawPlan;
  if (!Array.isArray(parsed) || parsed.length !== 1) {
    throw new Error("PostgreSQL EXPLAIN did not return one JSON document.");
  }
  const document = parsed[0];
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    throw new Error("PostgreSQL EXPLAIN document is invalid.");
  }
  const root = (document as Record<string, unknown>).Plan;
  if (!root || typeof root !== "object" || Array.isArray(root)) {
    throw new Error("PostgreSQL EXPLAIN root plan is invalid.");
  }

  const indexes = new Set<string>();
  const nodeTypes = new Set<string>();
  let nodeCount = 0;
  let sharedHitBlocks = 0;
  let sharedReadBlocks = 0;
  const visit = (candidate: unknown): void => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      return;
    }
    const node = candidate as Record<string, unknown>;
    nodeCount += 1;
    sharedHitBlocks += numericPlanValue(node, "Shared Hit Blocks");
    sharedReadBlocks += numericPlanValue(node, "Shared Read Blocks");
    if (typeof node["Node Type"] === "string") {
      nodeTypes.add(node["Node Type"]);
    }
    if (typeof node["Index Name"] === "string") {
      indexes.add(node["Index Name"]);
    }
    if (Array.isArray(node.Plans)) {
      node.Plans.forEach(visit);
    }
  };
  visit(root);

  const rootPlan = root as Record<string, unknown>;
  const planDocument = document as Record<string, unknown>;
  return {
    actualRows: numericPlanValue(rootPlan, "Actual Rows"),
    executionTimeMs: rounded(numericPlanValue(planDocument, "Execution Time")),
    indexes: [...indexes].sort(),
    label,
    nodeCount,
    nodeTypes: [...nodeTypes].sort(),
    planningTimeMs: rounded(numericPlanValue(planDocument, "Planning Time")),
    sharedHitBlocks,
    sharedReadBlocks,
    totalCost: numericPlanValue(rootPlan, "Total Cost"),
  };
};

postgresSuite("PostgreSQL task template catalog performance acceptance", () => {
  const databaseName = `campaign_os_m246_perf_${process.pid}_${randomUUID()
    .replace(/-/g, "")
    .slice(0, 8)}`;
  let administratorPool: pg.Pool | undefined;
  let databasePool: pg.Pool | undefined;
  let instrumentedPool: InstrumentedCatalogPool | undefined;
  let store: ReturnType<typeof createPostgresTaskTemplateCatalogStore> | undefined;

  const requiredPool = (): pg.Pool => {
    if (!databasePool) {
      throw new Error("Task template catalog performance database is unavailable.");
    }
    return databasePool;
  };

  const requiredInstrumentedPool = (): InstrumentedCatalogPool => {
    if (!instrumentedPool) {
      throw new Error("Task template catalog query instrumentation is unavailable.");
    }
    return instrumentedPool;
  };

  const requiredStore = (): ReturnType<typeof createPostgresTaskTemplateCatalogStore> => {
    if (!store) {
      throw new Error("Task template catalog performance store is unavailable.");
    }
    return store;
  };

  beforeAll(async () => {
    if (!/^[a-z0-9_]+$/.test(databaseName)) {
      throw new Error("Generated PostgreSQL performance database name is invalid.");
    }
    administratorPool = createPool(TEST_DATABASE_URL!, 4);
    await administratorPool.query(`CREATE DATABASE "${databaseName}"`);

    const databaseUrl = isolatedDatabaseUrl(TEST_DATABASE_URL!, databaseName);
    const migrationPool = createPool(databaseUrl, 4);
    try {
      const migration = await runPostgresMigrations({
        approved: true,
        migrations: await loadPostgresMigrations(),
        mode: "apply",
        pool: migrationPool as unknown as PostgresMigrationPool,
        traceId: "trace-m246-catalog-performance-migration",
      });
      expect(migration.status).toBe("ready");
      expect(migration.appliedMigrationIds).toContain("0006_durable_task_template_catalog");
      expect(migration.pendingMigrationIds).toEqual([]);
    } finally {
      await migrationPool.end();
    }

    databasePool = createPool(databaseUrl, 8);
    await populateDeterministicDataset(databasePool);
    instrumentedPool = createInstrumentedCatalogPool(databasePool);
    store = createPostgresTaskTemplateCatalogStore({
      cursorSigningKey: CURSOR_SIGNING_KEY,
      ownsPool: false,
      pool: instrumentedPool,
      queryTimeoutMs: 1_500,
    });
  }, 120_000);

  afterAll(async () => {
    const cleanupFailures: unknown[] = [];
    if (store) {
      try {
        await store.close({ traceId: "trace-m246-catalog-performance-close" });
      } catch (error) {
        cleanupFailures.push(error);
      }
    }
    if (databasePool) {
      try {
        await databasePool.end();
      } catch (error) {
        cleanupFailures.push(error);
      }
    }
    if (administratorPool) {
      try {
        await administratorPool.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
      } catch (error) {
        cleanupFailures.push(error);
      }
      try {
        await administratorPool.end();
      } catch (error) {
        cleanupFailures.push(error);
      }
    }
    if (cleanupFailures.length > 0) {
      throw new Error("Task template catalog performance cleanup failed.");
    }
  }, 60_000);

  it("uses row-count-independent bounded queries for exactly 10,000 versions and 1,000 active templates", async () => {
    const counts = await requiredPool().query<{
      active_versions: number;
      template_codes: number;
      versions: number;
    }>(`
      SELECT
        COUNT(*)::integer AS versions,
        (COUNT(*) FILTER (WHERE status = 'active'))::integer AS active_versions,
        COUNT(DISTINCT template_code)::integer AS template_codes
      FROM campaign_os.task_template_catalog_versions
    `);
    expect(counts.rows[0]).toEqual({
      active_versions: ACTIVE_COUNT,
      template_codes: ACTIVE_COUNT,
      versions: VERSION_COUNT,
    });

    const catalog = requiredStore();
    const queries = requiredInstrumentedPool();
    queries.resetQueryCount();
    const single = await catalog.list(
      { categories: ["benchmark-single"], limit: 100, statuses: ["active"] },
      { traceId: "trace-m246-performance-single" },
    );
    const singleQueryCount = queries.queryCount();

    queries.resetQueryCount();
    const bulk = await catalog.list(
      { categories: ["benchmark-bulk"], limit: 100, statuses: ["active"] },
      { traceId: "trace-m246-performance-bulk" },
    );
    const bulkQueryCount = queries.queryCount();

    expect(single.items).toHaveLength(1);
    expect(bulk.items).toHaveLength(100);
    expect(single.totalActive).toBe(ACTIVE_COUNT);
    expect(bulk.totalActive).toBe(ACTIVE_COUNT);
    expect(singleQueryCount).toBe(bulkQueryCount);
    expect(singleQueryCount).toBeLessThanOrEqual(3);

    queries.resetQueryCount();
    await expect(catalog.get(
      { templateCode: datasetTemplateCode(500), version: ACTIVE_VERSION },
      { traceId: "trace-m246-performance-detail-present" },
    )).resolves.toMatchObject({
      status: "active",
      templateCode: datasetTemplateCode(500),
      version: ACTIVE_VERSION,
    });
    const presentDetailQueries = queries.queryCount();

    queries.resetQueryCount();
    await expect(catalog.get(
      { templateCode: "perf-template-missing", version: ACTIVE_VERSION },
      { traceId: "trace-m246-performance-detail-missing" },
    )).resolves.toBeNull();
    expect(queries.queryCount()).toBe(presentDetailQueries);
    expect(presentDetailQueries).toBeLessThanOrEqual(3);
  }, 30_000);

  it("walks pages 1 through 100 within response bounds and emits only a safe EXPLAIN aggregate", async () => {
    const catalog = requiredStore();
    const queries = requiredInstrumentedPool();
    const identities = new Set<string>();
    const queryCounts = new Set<number>();
    let cursor: string | undefined;
    let firstCursor: string | undefined;
    let maximumObservedResponseBytes = 0;

    for (let pageNumber = 1; pageNumber <= PAGE_COUNT; pageNumber += 1) {
      queries.resetQueryCount();
      const page = await catalog.list(
        {
          ...(cursor ? { cursor } : {}),
          limit: PAGE_SIZE,
          statuses: ["active"],
        },
        { traceId: `trace-m246-performance-page-${pageNumber}` },
      );
      queryCounts.add(queries.queryCount());
      expect(queries.queryCount(), `page ${pageNumber} query count`).toBeLessThanOrEqual(3);
      expect(page.items, `page ${pageNumber} items`).toHaveLength(PAGE_SIZE);
      expect(page.totalActive).toBe(ACTIVE_COUNT);
      for (const item of page.items) {
        identities.add(`${item.templateCode}@${item.version}`);
      }
      const responseBytes = Buffer.byteLength(JSON.stringify(page), "utf8");
      maximumObservedResponseBytes = Math.max(maximumObservedResponseBytes, responseBytes);
      expect(responseBytes, `page ${pageNumber} response bytes`).toBeLessThan(MAX_RESPONSE_BYTES);

      const nextCursor = page.page.nextCursor ?? undefined;
      if (pageNumber === 1) {
        firstCursor = nextCursor;
      }
      if (pageNumber < PAGE_COUNT) {
        expect(nextCursor, `page ${pageNumber} next cursor`).toEqual(expect.any(String));
      } else {
        expect(nextCursor).toBeUndefined();
      }
      cursor = nextCursor;
    }

    expect(identities.size).toBe(ACTIVE_COUNT);
    expect([...queryCounts]).toHaveLength(1);
    expect(firstCursor).toEqual(expect.any(String));
    const [cursorBody, cursorSignature] = firstCursor!.split(".");
    const replacement = cursorSignature.startsWith("A") ? "B" : "A";
    const invalidCursor = `${cursorBody}.${replacement}${cursorSignature.slice(1)}`;
    queries.resetQueryCount();
    const invalidStartedAt = performance.now();
    await expect(catalog.list(
      { cursor: invalidCursor, limit: PAGE_SIZE, statuses: ["active"] },
      { traceId: "trace-m246-performance-invalid-cursor" },
    )).rejects.toMatchObject({
      code: "TASK_TEMPLATE_CURSOR_INVALID",
      field: "cursor",
      operation: "list",
    });
    expect(performance.now() - invalidStartedAt).toBeLessThan(250);
    expect(queries.queryCount()).toBe(0);

    const explainInputs = [
      {
        label: "list" as const,
        sql: `
          EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
          SELECT template_code, version, checksum
          FROM campaign_os.task_template_catalog_versions
          WHERE status = 'active' AND category = $1
          ORDER BY template_code COLLATE "C" ASC, version ASC
          LIMIT 101
        `,
        values: ["benchmark-bulk"],
      },
      {
        label: "detail" as const,
        sql: `
          EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
          SELECT template_code, version, checksum
          FROM campaign_os.task_template_catalog_versions
          WHERE template_code = $1 AND version = $2
          LIMIT 2
        `,
        values: [datasetTemplateCode(500), ACTIVE_VERSION],
      },
      {
        label: "count" as const,
        sql: `
          EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
          SELECT COUNT(*)::integer AS total_active
          FROM campaign_os.task_template_catalog_versions
          WHERE status = 'active'
        `,
        values: [],
      },
    ];
    const explainAggregates: SafeExplainAggregate[] = [];
    for (const input of explainInputs) {
      const result = await requiredPool().query<Record<string, unknown>>(input.sql, input.values);
      const rawPlan = result.rows[0]?.["QUERY PLAN"];
      explainAggregates.push(safeExplainAggregate(input.label, rawPlan));
    }
    expect(explainAggregates.find(({ label }) => label === "list")?.actualRows)
      .toBeLessThanOrEqual(101);
    expect(explainAggregates.find(({ label }) => label === "detail")?.actualRows).toBe(1);
    expect(explainAggregates.find(({ label }) => label === "count")?.actualRows).toBe(1);

    const safeSummary = {
      dataset: { active: ACTIVE_COUNT, versions: VERSION_COUNT },
      explain: explainAggregates,
      pagination: {
        maximumObservedResponseBytes,
        pageCount: PAGE_COUNT,
        pageSize: PAGE_SIZE,
      },
    };
    expect(JSON.stringify(safeSummary)).not.toMatch(
      /postgres(?:ql)?:\/\/|127\.0\.0\.1|CAMPAIGN_OS_TEST_DATABASE_URL|password/i,
    );
    console.info(`WP06 catalog safe EXPLAIN aggregate ${JSON.stringify(safeSummary)}`);
  }, 60_000);

  it("keeps warm list p95 below 250 ms and detail p95 below 100 ms", async () => {
    const catalog = requiredStore();
    const queries = requiredInstrumentedPool();
    const listOperation = (sample: string) => catalog.list(
      { categories: ["benchmark-bulk"], limit: 100, statuses: ["active"] },
      { traceId: `trace-m246-performance-list-${sample}` },
    );
    const detailOperation = (sample: string) => catalog.get(
      { templateCode: datasetTemplateCode(500), version: ACTIVE_VERSION },
      { traceId: `trace-m246-performance-detail-${sample}` },
    );

    for (let index = 0; index < WARM_SAMPLE_COUNT; index += 1) {
      await listOperation(`warm-${index}`);
      await detailOperation(`warm-${index}`);
    }

    const listSamples: number[] = [];
    const detailSamples: number[] = [];
    const listQueryCounts = new Set<number>();
    const detailQueryCounts = new Set<number>();
    for (let index = 0; index < MEASURED_SAMPLE_COUNT; index += 1) {
      queries.resetQueryCount();
      const list = await measure(() => listOperation(`sample-${index}`));
      listSamples.push(list.durationMs);
      listQueryCounts.add(queries.queryCount());
      expect(list.value.items).toHaveLength(100);
      expect(Buffer.byteLength(JSON.stringify(list.value), "utf8")).toBeLessThan(
        MAX_RESPONSE_BYTES,
      );

      queries.resetQueryCount();
      const detail = await measure(() => detailOperation(`sample-${index}`));
      detailSamples.push(detail.durationMs);
      detailQueryCounts.add(queries.queryCount());
      expect(detail.value).toMatchObject({
        status: "active",
        templateCode: datasetTemplateCode(500),
        version: ACTIVE_VERSION,
      });
    }

    expect([...listQueryCounts]).toHaveLength(1);
    expect(Math.max(...listQueryCounts)).toBeLessThanOrEqual(3);
    expect([...detailQueryCounts]).toHaveLength(1);
    expect(Math.max(...detailQueryCounts)).toBeLessThanOrEqual(3);
    const listSummary = summarizeTimings(listSamples);
    const detailSummary = summarizeTimings(detailSamples);
    expect(listSummary.p95Ms).toBeLessThan(LIST_P95_THRESHOLD_MS);
    expect(detailSummary.p95Ms).toBeLessThan(DETAIL_P95_THRESHOLD_MS);

    console.info(`WP06 catalog warm timings ${JSON.stringify({
      dataset: { active: ACTIVE_COUNT, versions: VERSION_COUNT },
      detail: { ...detailSummary, thresholdMs: DETAIL_P95_THRESHOLD_MS },
      list: { ...listSummary, thresholdMs: LIST_P95_THRESHOLD_MS },
      queryCounts: {
        detail: [...detailQueryCounts],
        list: [...listQueryCounts],
      },
      warmSamples: WARM_SAMPLE_COUNT,
    })}`);
  }, 60_000);
});
