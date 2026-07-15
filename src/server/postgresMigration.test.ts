import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  POSTGRES_MIGRATION_ADVISORY_LOCK_KEY,
  PostgresMigrationError,
  calculatePostgresMigrationChecksum,
  loadPostgresMigrations,
  runPostgresMigrations,
  type PostgresMigrationClient,
  type PostgresMigrationDefinition,
  type PostgresMigrationPool,
  type PostgresMigrationQueryResult,
} from "./postgresMigration";
import {
  isPostgresMigrationCliDirectExecution,
  parsePostgresMigrationCliMode,
  runPostgresMigrationCli,
  type PostgresMigrationPoolConfig,
} from "./postgresMigrationCli";

interface QueryCall {
  text: string;
  values: readonly unknown[];
}

const normalizeSql = (value: string) => value.replace(/\s+/g, " ").trim();

class TranscriptClient implements PostgresMigrationClient {
  readonly calls: QueryCall[] = [];
  readonly release = vi.fn(async (_destroy?: boolean) => {
    if (this.releaseFails) {
      throw new Error("postgres://operator:secret@db.internal/release");
    }
  });

  constructor(
    private readonly appliedRows: Array<{ checksum: string; migration_id: string }> = [],
    private readonly failWhen?: (sql: string) => boolean,
    private readonly ledgerExists = true,
    private readonly lockAcquired = true,
    private readonly lockReleased = true,
    private readonly releaseFails = false,
  ) {}

  async query(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<PostgresMigrationQueryResult> {
    const normalized = normalizeSql(text);
    this.calls.push({ text: normalized, values });

    if (this.failWhen?.(normalized)) {
      throw new Error("postgres://operator:secret@db.internal/campaign stack trace");
    }

    if (normalized.includes("to_regclass")) {
      return {
        rows: [{ ledger_name: this.ledgerExists ? "campaign_os.schema_migrations" : null }],
      };
    }

    if (normalized.includes("pg_try_advisory_lock")) {
      return { rows: [{ acquired: this.lockAcquired }] };
    }

    if (normalized.includes("pg_advisory_unlock")) {
      return { rows: [{ released: this.lockReleased }] };
    }

    if (normalized.includes("SELECT migration_id, checksum")) {
      return { rows: this.appliedRows };
    }

    return { rows: [] };
  }
}

class TranscriptPool implements PostgresMigrationPool {
  readonly connect = vi.fn(async () => this.client);
  readonly end = vi.fn(async () => {
    if (this.endFails) {
      throw new Error("postgres://operator:secret@db.internal/pool-close");
    }
  });

  constructor(
    readonly client: TranscriptClient,
    private readonly endFails = false,
  ) {}
}

const migration = async (
  overrides: Partial<PostgresMigrationDefinition> = {},
): Promise<PostgresMigrationDefinition> => {
  const upSql = overrides.upSql ?? "CREATE TABLE campaign_os.example (id text PRIMARY KEY);\n";

  return {
    checksum: await calculatePostgresMigrationChecksum(upSql),
    downSql: "DROP TABLE campaign_os.example;\n",
    id: "0001_campaign_runtime",
    upSql,
    ...overrides,
  };
};

describe("PostgreSQL migration runtime", () => {
  it("loads committed additive migrations with stable checksums and owned down contracts", async () => {
    const first = await loadPostgresMigrations();
    const second = await loadPostgresMigrations();

    expect(first.map(({ id }) => id)).toEqual([
      "0001_campaign_runtime",
      "0002_admin_review_export",
      "0003_admin_review_rank_projection",
    ]);
    const campaignRuntime = first[0];
    const adminReviewExport = first[1];
    const adminReviewRankProjection = first[2];

    for (const table of [
      "campaigns",
      "campaign_tasks",
      "campaign_participants",
      "campaign_task_completions",
      "campaign_task_evidence",
      "campaign_referral_bindings",
    ]) {
      expect(campaignRuntime?.upSql).toContain(`CREATE TABLE campaign_os.${table}`);
    }
    expect(campaignRuntime?.upSql).toContain("CREATE TABLE IF NOT EXISTS campaign_os.schema_migrations");
    expect(campaignRuntime?.upSql).toContain("FOREIGN KEY (campaign_id, task_id, wallet_address, completion_id)");
    expect(campaignRuntime?.upSql).toContain("default_locale = 'en-US'");
    expect(campaignRuntime?.upSql).toContain("CHECK (start_time < end_time)");
    expect(campaignRuntime?.upSql).toContain("campaign_os_campaigns_project_updated_idx");
    expect(campaignRuntime?.upSql).toContain("campaign_os_campaign_task_evidence_campaign_task_idx");
    expect(campaignRuntime?.upSql).toContain("campaign_os_campaign_referral_bindings_campaign_referrer_idx");
    expect(campaignRuntime?.downSql).toContain("DROP TABLE IF EXISTS campaign_os.campaigns");
    expect(campaignRuntime?.checksum).toBe(
      "f8987b38a916e3c53d533f6fdcd75bfe95e2ea766346b5786c998529435c75a4",
    );

    expect(adminReviewExport?.upSql).toContain(
      "CREATE TABLE campaign_os.campaign_review_decisions",
    );
    expect(adminReviewExport?.upSql).toContain(
      "CREATE TABLE campaign_os.campaign_export_artifacts",
    );
    for (const contractFragment of [
      "ALTER TABLE campaign_os.campaign_participants",
      "campaign_os_campaign_participants_campaign_id_id_wallet_key",
      "UNIQUE (campaign_id, id, wallet_address)",
      "campaign_os_campaign_review_decisions_participant_owner_fk",
      "FOREIGN KEY (campaign_id, participant_id, wallet_address)",
      "REFERENCES campaign_os.campaign_participants (campaign_id, id, wallet_address)",
      "campaign_os_campaign_review_decisions_version_key",
      "campaign_os_campaign_review_decisions_idempotency_key",
      "campaign_os_campaign_review_decisions_current_idx",
      "campaign_os_campaign_review_decisions_filter_idx",
      "campaign_os_campaign_export_artifacts_campaign_fk",
      "campaign_os_campaign_export_artifacts_source_key",
      "campaign_os_campaign_export_artifacts_list_idx",
      "snapshot_version = 'review-snapshot-v1'",
      "source_version = 'artifact-source-v1'",
      "row_count BETWEEN 0 AND 5000",
      "content_bytes BETWEEN 0 AND 10485760",
      "content_bytes = octet_length(content)",
      "^[a-f0-9]{64}$",
      "text/csv;charset=utf-8",
      "application/json;charset=utf-8",
      "BEFORE UPDATE OR DELETE ON campaign_os.campaign_review_decisions",
      "BEFORE UPDATE OR DELETE ON campaign_os.campaign_export_artifacts",
      "BEFORE TRUNCATE ON campaign_os.campaign_review_decisions",
      "BEFORE TRUNCATE ON campaign_os.campaign_export_artifacts",
      "FOR EACH STATEMENT EXECUTE FUNCTION campaign_os.reject_admin_review_export_mutation()",
    ]) {
      expect(adminReviewExport?.upSql).toContain(contractFragment);
    }
    expect(adminReviewExport?.upSql).not.toContain(
      "campaign_os_campaign_review_decisions_participant_fk",
    );
    expect(adminReviewExport?.upSql).not.toContain(
      "campaign_os_campaign_review_decisions_campaign_fk",
    );
    expect(adminReviewExport?.checksum).toBe(
      "4f8eb20ac83b52bc9bc3e842416ff09fce369ec64412b7d67b974f2c900e6af5",
    );

    expect(adminReviewRankProjection?.upSql).toContain(
      "CREATE INDEX campaign_os_campaign_participants_dynamic_rank_idx",
    );
    expect(adminReviewRankProjection?.upSql).toContain(
      "campaign_id,\n    total_points DESC,\n    created_at ASC",
    );
    expect(adminReviewRankProjection?.upSql).toContain('id COLLATE "C" ASC');
    expect(adminReviewRankProjection?.upSql).toContain('wallet_address COLLATE "C" ASC');
    expect(adminReviewRankProjection?.upSql).not.toMatch(/\b(?:ALTER|DROP|TRUNCATE|UPDATE|DELETE)\b/i);
    expect(adminReviewRankProjection?.downSql).toBe(
      "DROP INDEX IF EXISTS campaign_os.campaign_os_campaign_participants_dynamic_rank_idx;\n",
    );
    expect(adminReviewRankProjection?.checksum).toBe(
      "c9236184b25820b36540942de86c2342c9098002a023db8da1f706cf287dd7e8",
    );

    const factTables = [
      "campaigns",
      "campaign_tasks",
      "campaign_task_completions",
      "campaign_task_evidence",
      "campaign_referral_bindings",
    ];
    for (const factTable of factTables) {
      expect(adminReviewExport?.upSql).not.toMatch(new RegExp(
        `(?:ALTER|DROP|TRUNCATE)\\s+(?:TABLE\\s+)?(?:IF\\s+EXISTS\\s+)?campaign_os\\.${factTable}\\b`,
        "i",
      ));
      expect(adminReviewExport?.upSql).not.toMatch(new RegExp(
        `(?:UPDATE|DELETE\\s+FROM)\\s+campaign_os\\.${factTable}\\b`,
        "i",
      ));
    }
    expect(adminReviewExport?.upSql?.match(
      /\bALTER\s+TABLE\s+campaign_os\.campaign_participants\b/gi,
    )).toHaveLength(1);
    expect(adminReviewExport?.upSql).not.toMatch(
      /\b(?:DROP|TRUNCATE)\s+(?:TABLE\s+)?(?:IF\s+EXISTS\s+)?campaign_os\.campaign_participants\b/i,
    );
    expect(adminReviewExport?.upSql).not.toMatch(
      /\b(?:UPDATE|DELETE\s+FROM)\s+campaign_os\.campaign_participants\b/i,
    );
    expect(adminReviewExport?.upSql).not.toMatch(/\bBACKFILL\b/i);
    expect(adminReviewExport?.upSql).not.toMatch(/\bTRUNCATE\s+TABLE\b/i);

    const downSql = adminReviewExport?.downSql ?? "";
    expect(downSql).toContain("DESTRUCTIVE OPERATOR RECOVERY ONLY");
    expect(downSql).toContain("DROP TRIGGER IF EXISTS campaign_review_decisions_append_only");
    expect(downSql).toContain("DROP TRIGGER IF EXISTS campaign_export_artifacts_append_only");
    expect(downSql).toContain("DROP TRIGGER IF EXISTS campaign_review_decisions_truncate_append_only");
    expect(downSql).toContain("DROP TRIGGER IF EXISTS campaign_export_artifacts_truncate_append_only");
    expect(downSql).toContain("DROP TABLE IF EXISTS campaign_os.campaign_export_artifacts");
    expect(downSql).toContain("DROP TABLE IF EXISTS campaign_os.campaign_review_decisions");
    expect(downSql).toContain(
      "DROP CONSTRAINT IF EXISTS campaign_os_campaign_participants_campaign_id_id_wallet_key",
    );
    expect(downSql).toContain("DROP FUNCTION IF EXISTS campaign_os.reject_admin_review_export_mutation()");
    expect(downSql.indexOf("DROP TRIGGER")).toBeLessThan(downSql.indexOf("DROP TABLE"));
    expect(downSql.indexOf("DROP TABLE IF EXISTS campaign_os.campaign_review_decisions")).toBeLessThan(
      downSql.indexOf("DROP CONSTRAINT IF EXISTS"),
    );
    expect(downSql.indexOf("DROP CONSTRAINT IF EXISTS")).toBeLessThan(
      downSql.indexOf("DROP FUNCTION"),
    );
    for (const forbiddenOwnershipTarget of [
      ...factTables,
      "schema_migrations",
    ]) {
      expect(downSql).not.toContain(`campaign_os.${forbiddenOwnershipTarget}`);
    }
    expect(downSql).not.toMatch(/DROP\s+SCHEMA/i);

    for (const definition of first) {
      expect(definition.checksum).toMatch(/^[a-f0-9]{64}$/);
    }
    expect(second).toEqual(first);
  });

  it("propagates a caller Trace ID when migration discovery fails", async () => {
    await expect(loadPostgresMigrations(
      "db/migrations/missing-test-directory",
      "trace-discovery",
    )).rejects.toMatchObject({
      code: "POSTGRES_MIGRATION_DISCOVERY_FAILED",
      operation: "discover",
      traceId: "trace-discovery",
    });
  });

  it("normalizes line endings before calculating a checksum", async () => {
    expect(await calculatePostgresMigrationChecksum("SELECT 1;\r\n")).toBe(
      await calculatePostgresMigrationChecksum("SELECT 1;\n"),
    );
  });

  it("plans a pending migration without DDL or advisory locks", async () => {
    const client = new TranscriptClient([], undefined, false);
    const pool = new TranscriptPool(client);

    const result = await runPostgresMigrations({
      migrations: [await migration()],
      mode: "plan",
      pool,
      traceId: "trace-plan",
    });

    expect(result).toMatchObject({
      appliedMigrationIds: [],
      mode: "plan",
      pendingMigrationIds: ["0001_campaign_runtime"],
      status: "pending",
      traceId: "trace-plan",
    });
    expect(client.calls.map((call) => call.text)).toHaveLength(1);
    expect(client.calls[0]?.text).toContain("to_regclass");
    expect(client.calls.some((call) => /CREATE|BEGIN|advisory_lock/i.test(call.text))).toBe(false);
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("classifies an uninitialized schema during validation without DDL", async () => {
    const client = new TranscriptClient([], undefined, false);

    const result = await runPostgresMigrations({
      migrations: [await migration()],
      mode: "validate",
      pool: new TranscriptPool(client),
      traceId: "trace-uninitialized",
    });

    expect(result).toMatchObject({
      diagnosticCodes: ["POSTGRES_MIGRATION_SCHEMA_UNINITIALIZED"],
      pendingMigrationIds: ["0001_campaign_runtime"],
      status: "pending",
    });
    expect(client.calls).toHaveLength(1);
    expect(client.calls.some((call) => /CREATE|BEGIN|INSERT/i.test(call.text))).toBe(false);
  });

  it("validates an applied migration without mutating schema", async () => {
    const definition = await migration();
    const client = new TranscriptClient([
      { checksum: definition.checksum, migration_id: definition.id },
    ]);

    const result = await runPostgresMigrations({
      migrations: [definition],
      mode: "validate",
      pool: new TranscriptPool(client),
      traceId: "trace-validate",
    });

    expect(result.status).toBe("ready");
    expect(result.appliedMigrationIds).toEqual([definition.id]);
    expect(result.pendingMigrationIds).toEqual([]);
    expect(client.calls.some((call) => /CREATE|INSERT|BEGIN/i.test(call.text))).toBe(false);
  });

  it("classifies an initialized migration ledger with a pending suffix", async () => {
    const first = await migration();
    const second = await migration({
      id: "0002_campaign_indexes",
      upSql: "CREATE INDEX example_idx ON campaign_os.example (id);\n",
    });
    const client = new TranscriptClient([
      { checksum: first.checksum, migration_id: first.id },
    ]);

    const result = await runPostgresMigrations({
      migrations: [second, first],
      mode: "validate",
      pool: new TranscriptPool(client),
      traceId: "trace-pending-suffix",
    });

    expect(result).toMatchObject({
      appliedMigrationIds: [first.id],
      diagnosticCodes: [],
      pendingMigrationIds: [second.id],
      status: "pending",
    });
  });

  it("blocks a migration ledger gap before executing DDL", async () => {
    const first = await migration();
    const second = await migration({
      id: "0002_campaign_indexes",
      upSql: "CREATE INDEX example_idx ON campaign_os.example (id);\n",
    });
    const client = new TranscriptClient([
      { checksum: second.checksum, migration_id: second.id },
    ]);

    await expect(runPostgresMigrations({
      migrations: [first, second],
      mode: "validate",
      pool: new TranscriptPool(client),
      traceId: "trace-ledger-gap",
    })).rejects.toMatchObject({
      code: "POSTGRES_MIGRATION_LEDGER_INVALID",
      field: "migrationOrder",
      operation: "validate",
    });
    expect(client.calls.some((call) => /CREATE|INSERT|BEGIN/i.test(call.text))).toBe(false);
  });

  it("blocks checksum drift with a safe typed diagnostic", async () => {
    const definition = await migration();
    const client = new TranscriptClient([
      { checksum: "0".repeat(64), migration_id: definition.id },
    ]);

    await expect(runPostgresMigrations({
      migrations: [definition],
      mode: "validate",
      pool: new TranscriptPool(client),
      traceId: "trace-drift",
    })).rejects.toMatchObject({
      code: "POSTGRES_MIGRATION_CHECKSUM_DRIFT",
      operation: "validate",
      traceId: "trace-drift",
    });
  });

  it("maps query failures to safe typed diagnostics and releases the client", async () => {
    const client = new TranscriptClient(
      [],
      (sql) => sql.includes("to_regclass"),
      false,
    );

    const failure = runPostgresMigrations({
      migrations: [await migration()],
      mode: "plan",
      pool: new TranscriptPool(client),
      traceId: "trace-query-failure",
    });

    await expect(failure).rejects.toMatchObject({
      code: "POSTGRES_MIGRATION_QUERY_FAILED",
      operation: "plan",
      traceId: "trace-query-failure",
    });
    await expect(failure).rejects.not.toHaveProperty("message", expect.stringContaining("operator:secret"));
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("surfaces client release failures without exposing the connection detail", async () => {
    const client = new TranscriptClient([], undefined, false, true, true, true);

    const failure = runPostgresMigrations({
      migrations: [await migration()],
      mode: "plan",
      pool: new TranscriptPool(client),
      traceId: "trace-release-failure",
    });

    await expect(failure).rejects.toMatchObject({
      code: "POSTGRES_MIGRATION_CLEANUP_FAILED",
      operation: "close",
      traceId: "trace-release-failure",
    });
    await expect(failure).rejects.not.toHaveProperty(
      "message",
      expect.stringContaining("operator:secret"),
    );
  });

  it("rejects duplicate migration ids before acquiring a client", async () => {
    const pool = new TranscriptPool(new TranscriptClient());
    const definition = await migration();

    await expect(runPostgresMigrations({
      migrations: [definition, definition],
      mode: "plan",
      pool,
      traceId: "trace-duplicate",
    })).rejects.toMatchObject({
      code: "POSTGRES_MIGRATION_DEFINITION_INVALID",
      field: "migrations",
    });
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it("maps malformed migration definitions to a typed error before connecting", async () => {
    const pool = new TranscriptPool(new TranscriptClient());
    const malformed = {
      checksum: 7,
      downSql: null,
      id: "0001_campaign_runtime",
      upSql: undefined,
    } as unknown as PostgresMigrationDefinition;

    await expect(runPostgresMigrations({
      migrations: [malformed],
      mode: "plan",
      pool,
      traceId: "trace-malformed",
    })).rejects.toMatchObject({
      code: "POSTGRES_MIGRATION_DEFINITION_INVALID",
      field: "migrations",
      operation: "plan",
      traceId: "trace-malformed",
    });
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it("rejects apply without approval before acquiring a client", async () => {
    const pool = new TranscriptPool(new TranscriptClient());

    await expect(runPostgresMigrations({
      approved: false,
      migrations: [await migration()],
      mode: "apply",
      pool,
      traceId: "trace-unapproved",
    })).rejects.toBeInstanceOf(PostgresMigrationError);
    await expect(runPostgresMigrations({
      approved: false,
      migrations: [await migration()],
      mode: "apply",
      pool,
      traceId: "trace-unapproved",
    })).rejects.toMatchObject({
      code: "POSTGRES_MIGRATION_APPROVAL_REQUIRED",
    });
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it("applies a pending migration under one lock and transaction", async () => {
    const definition = await migration();
    const client = new TranscriptClient([], undefined, false);

    const result = await runPostgresMigrations({
      approved: true,
      migrations: [definition],
      mode: "apply",
      now: () => 25,
      pool: new TranscriptPool(client),
      traceId: "trace-apply",
    });

    expect(result).toMatchObject({
      appliedMigrationIds: [definition.id],
      mode: "apply",
      pendingMigrationIds: [],
      status: "ready",
      traceId: "trace-apply",
    });

    const statements = client.calls.map((call) => call.text);
    expect(statements).toEqual([
      expect.stringContaining("pg_try_advisory_lock"),
      "BEGIN",
      expect.stringContaining("CREATE SCHEMA IF NOT EXISTS campaign_os"),
      expect.stringContaining("CREATE TABLE IF NOT EXISTS campaign_os.schema_migrations"),
      expect.stringContaining("SELECT migration_id, checksum"),
      normalizeSql(definition.upSql),
      expect.stringContaining("INSERT INTO campaign_os.schema_migrations"),
      "COMMIT",
      expect.stringContaining("pg_advisory_unlock"),
    ]);
    expect(client.calls[0]?.values).toEqual([POSTGRES_MIGRATION_ADVISORY_LOCK_KEY]);
    expect(client.calls[6]?.values).toEqual([
      definition.id,
      definition.checksum,
      expect.any(Number),
    ]);
    expect(client.release).toHaveBeenCalledOnce();
    expect(client.calls[3]?.text).toContain("checksum ~ '^[a-f0-9]{64}$'");
  });

  it("bounds lock acquisition and does not begin when the lock is unavailable", async () => {
    const client = new TranscriptClient([], undefined, false, false);

    await expect(runPostgresMigrations({
      approved: true,
      lockWaitMs: 0,
      migrations: [await migration()],
      mode: "apply",
      pool: new TranscriptPool(client),
      traceId: "trace-lock",
    })).rejects.toMatchObject({
      code: "POSTGRES_MIGRATION_LOCK_UNAVAILABLE",
      operation: "apply",
    });

    expect(client.calls.map((call) => call.text)).toEqual([
      expect.stringContaining("pg_try_advisory_lock"),
    ]);
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("maps advisory lock query failures and releases the client", async () => {
    const client = new TranscriptClient(
      [],
      (sql) => sql.includes("pg_try_advisory_lock"),
      false,
    );

    await expect(runPostgresMigrations({
      approved: true,
      migrations: [await migration()],
      mode: "apply",
      pool: new TranscriptPool(client),
      traceId: "trace-lock-query",
    })).rejects.toMatchObject({
      code: "POSTGRES_MIGRATION_LOCK_UNAVAILABLE",
      operation: "apply",
      traceId: "trace-lock-query",
    });
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("destroys the client when a session lock cannot be released", async () => {
    const definition = await migration();
    const client = new TranscriptClient(
      [{ checksum: definition.checksum, migration_id: definition.id }],
      undefined,
      true,
      true,
      false,
    );

    await expect(runPostgresMigrations({
      approved: true,
      migrations: [definition],
      mode: "apply",
      pool: new TranscriptPool(client),
      traceId: "trace-unlock",
    })).rejects.toMatchObject({
      code: "POSTGRES_MIGRATION_CLEANUP_FAILED",
      operation: "close",
    });
    expect(client.release).toHaveBeenCalledWith(true);
  });

  it("rolls back, unlocks, and releases when DDL fails", async () => {
    const definition = await migration();
    const client = new TranscriptClient(
      [],
      (sql) => sql === normalizeSql(definition.upSql),
      false,
    );

    await expect(runPostgresMigrations({
      approved: true,
      migrations: [definition],
      mode: "apply",
      pool: new TranscriptPool(client),
      traceId: "trace-failure",
    })).rejects.toMatchObject({
      code: "POSTGRES_MIGRATION_EXECUTION_FAILED",
      traceId: "trace-failure",
    });

    const statements = client.calls.map((call) => call.text);
    expect(statements).toContain("ROLLBACK");
    expect(statements.some((statement) => statement.includes("INSERT INTO"))).toBe(false);
    expect(statements[statements.length - 1]).toContain("pg_advisory_unlock");
    expect(client.release).toHaveBeenCalledOnce();
    expect(JSON.stringify((client.calls))).not.toContain("operator:secret");
  });

  it("preserves the primary execution diagnostic when cleanup also fails", async () => {
    const definition = await migration();
    const client = new TranscriptClient(
      [],
      (sql) => sql === normalizeSql(definition.upSql),
      false,
      true,
      false,
      true,
    );

    const failure = runPostgresMigrations({
      approved: true,
      migrations: [definition],
      mode: "apply",
      pool: new TranscriptPool(client),
      traceId: "trace-primary-cleanup",
    });

    await expect(failure).rejects.toMatchObject({
      code: "POSTGRES_MIGRATION_EXECUTION_FAILED",
      operation: "apply",
      traceId: "trace-primary-cleanup",
    });
    await expect(failure).rejects.not.toHaveProperty(
      "message",
      expect.stringContaining("operator:secret"),
    );
    expect(client.release).toHaveBeenCalledWith(true);
  });

  it("does not rerun an already applied migration", async () => {
    const definition = await migration();
    const client = new TranscriptClient([
      { checksum: definition.checksum, migration_id: definition.id },
    ]);

    const result = await runPostgresMigrations({
      approved: true,
      migrations: [definition],
      mode: "apply",
      pool: new TranscriptPool(client),
      traceId: "trace-repeat",
    });

    expect(result.status).toBe("ready");
    expect(result.appliedMigrationIds).toEqual([definition.id]);
    expect(client.calls.some((call) => call.text === normalizeSql(definition.upSql))).toBe(false);
    expect(client.calls.some((call) => call.text.includes("INSERT INTO"))).toBe(false);
  });
});

describe("PostgreSQL migration CLI", () => {
  it("parses exactly one supported mode", () => {
    expect(parsePostgresMigrationCliMode(["--plan"])).toBe("plan");
    expect(parsePostgresMigrationCliMode(["--validate"])).toBe("validate");
    expect(parsePostgresMigrationCliMode(["--apply"])).toBe("apply");
    expect(() => parsePostgresMigrationCliMode([])).toThrowError(PostgresMigrationError);
    expect(() => parsePostgresMigrationCliMode(["--plan", "--apply"])).toThrowError(
      PostgresMigrationError,
    );
    expect(() => parsePostgresMigrationCliMode(["--unknown"])).toThrowError(
      PostgresMigrationError,
    );
  });

  it("runs only when the CLI module is the actual process entrypoint", () => {
    expect(isPostgresMigrationCliDirectExecution(process.argv[1])).toBe(false);
    expect(isPostgresMigrationCliDirectExecution("/tmp/host-with-run-argument.ts")).toBe(false);
    expect(isPostgresMigrationCliDirectExecution(
      `${process.cwd()}/src/server/postgresMigrationCli.ts`,
    )).toBe(true);
  });

  it("imports without side effects when the host process also has --run", async () => {
    const directory = await mkdtemp(join(tmpdir(), "campaign-os-migration-import-"));
    const probePath = join(directory, "probe.ts");
    const cliModulePath = resolve(process.cwd(), "src/server/postgresMigrationCli.ts");

    try {
      await writeFile(
        probePath,
        `import ${JSON.stringify(cliModulePath)};\nprocess.stdout.write("IMPORT_OK");\n`,
        "utf8",
      );
      const probe = spawnSync(
        resolve(process.cwd(), "node_modules/.bin/vite-node"),
        ["--script", probePath, "--run"],
        {
          cwd: process.cwd(),
          encoding: "utf8",
          env: {
            ...process.env,
            CAMPAIGN_OS_APPROVE_LIVE_MIGRATIONS: "true",
            CAMPAIGN_OS_DATABASE_URL: "postgresql://operator@127.0.0.1/campaign",
          },
          timeout: 10_000,
        },
      );

      expect(probe.status).toBe(0);
      expect(probe.stdout).toBe("IMPORT_OK");
      expect(probe.stderr).toBe("");
    } finally {
      await rm(directory, { force: true, recursive: true });
    }
  }, 15_000);

  it("does not construct a pool for unapproved apply", async () => {
    const createPool = vi.fn();
    const stdout = vi.fn();
    const stderr = vi.fn();

    const exitCode = await runPostgresMigrationCli({
      argv: ["--apply"],
      createPool,
      env: {
        CAMPAIGN_OS_DATABASE_URL: "postgres://operator:secret@db.internal/campaign",
      },
      stderr,
      stdout,
      traceId: "trace-cli-unapproved",
    });

    expect(exitCode).toBe(1);
    expect(createPool).not.toHaveBeenCalled();
    expect(stdout).not.toHaveBeenCalled();
    expect(stderr).toHaveBeenCalledOnce();
    expect(stderr.mock.calls[0]?.[0]).toContain("POSTGRES_MIGRATION_APPROVAL_REQUIRED");
    expect(stderr.mock.calls[0]?.[0]).not.toContain("operator:secret");
    expect(stderr.mock.calls[0]?.[0]).not.toContain("db.internal");
  });

  it("rejects missing database configuration before constructing a pool", async () => {
    const createPool = vi.fn();
    const stderr = vi.fn();

    const exitCode = await runPostgresMigrationCli({
      argv: ["--plan"],
      createPool,
      env: {},
      migrations: [await migration()],
      stderr,
      stdout: vi.fn(),
      traceId: "trace-cli-config",
    });

    expect(exitCode).toBe(1);
    expect(createPool).not.toHaveBeenCalled();
    expect(JSON.parse(stderr.mock.calls[0]?.[0] ?? "{}")).toMatchObject({
      diagnosticCodes: ["POSTGRES_MIGRATION_CONFIG_INVALID"],
      status: "failed",
      traceId: "trace-cli-config",
    });
  });

  it("closes the pool and emits allowlisted JSON for plan", async () => {
    const pool = new TranscriptPool(new TranscriptClient([], undefined, false));
    const stdout = vi.fn();
    const stderr = vi.fn();

    const exitCode = await runPostgresMigrationCli({
      argv: ["--plan"],
      createPool: vi.fn(() => pool),
      env: {
        CAMPAIGN_OS_DATABASE_SSL_MODE: "verify-full",
        CAMPAIGN_OS_DATABASE_URL: "postgres://operator:secret@db.internal/campaign",
      },
      migrations: [await migration()],
      stderr,
      stdout,
      traceId: "trace-cli-plan",
    });

    expect(exitCode).toBe(0);
    expect(pool.end).toHaveBeenCalledOnce();
    expect(stderr).not.toHaveBeenCalled();
    expect(stdout).toHaveBeenCalledOnce();
    const output = stdout.mock.calls[0]?.[0] ?? "";
    expect(JSON.parse(output)).toMatchObject({
      mode: "plan",
      pendingMigrationIds: ["0001_campaign_runtime"],
      status: "pending",
      traceId: "trace-cli-plan",
    });
    expect(output).not.toContain("operator:secret");
    expect(output).not.toContain("db.internal");
    expect(output).not.toContain("CREATE TABLE");
  });

  it("treats IPv6 loopback as local and preserves verify-ca semantics", async () => {
    const localPool = new TranscriptPool(new TranscriptClient([], undefined, false));
    const localCreatePool = vi.fn((_config: PostgresMigrationPoolConfig) => localPool);

    expect(await runPostgresMigrationCli({
      argv: ["--plan"],
      createPool: localCreatePool,
      env: {
        CAMPAIGN_OS_DATABASE_URL: "postgresql://operator@[::1]/campaign",
      },
      migrations: [await migration()],
      stderr: vi.fn(),
      stdout: vi.fn(),
      traceId: "trace-cli-ipv6",
    })).toBe(0);
    expect(localCreatePool.mock.calls[0]?.[0].ssl).toBe(false);

    const remotePool = new TranscriptPool(new TranscriptClient([], undefined, false));
    const remoteCreatePool = vi.fn((_config: PostgresMigrationPoolConfig) => remotePool);

    expect(await runPostgresMigrationCli({
      argv: ["--validate"],
      createPool: remoteCreatePool,
      env: {
        CAMPAIGN_OS_DATABASE_SSL_MODE: "verify-ca",
        CAMPAIGN_OS_DATABASE_URL: "postgresql://operator@db.internal/campaign",
      },
      migrations: [await migration()],
      stderr: vi.fn(),
      stdout: vi.fn(),
      traceId: "trace-cli-verify-ca",
    })).toBe(0);
    const ssl = remoteCreatePool.mock.calls[0]?.[0].ssl;
    expect(ssl).toMatchObject({ rejectUnauthorized: true });
    expect(ssl && ssl.checkServerIdentity?.()).toBeUndefined();
  });

  it("closes the pool and emits safe JSON when a query fails", async () => {
    const pool = new TranscriptPool(new TranscriptClient(
      [],
      (sql) => sql.includes("to_regclass"),
      false,
    ));
    const stdout = vi.fn();
    const stderr = vi.fn();

    const exitCode = await runPostgresMigrationCli({
      argv: ["--validate"],
      createPool: vi.fn(() => pool),
      env: {
        CAMPAIGN_OS_DATABASE_SSL_MODE: "verify-full",
        CAMPAIGN_OS_DATABASE_URL: "postgres://operator:secret@db.internal/campaign",
      },
      migrations: [await migration()],
      stderr,
      stdout,
      traceId: "trace-cli-query",
    });

    expect(exitCode).toBe(1);
    expect(pool.end).toHaveBeenCalledOnce();
    expect(stdout).not.toHaveBeenCalled();
    const output = stderr.mock.calls[0]?.[0] ?? "";
    expect(JSON.parse(output)).toMatchObject({
      diagnosticCodes: ["POSTGRES_MIGRATION_QUERY_FAILED"],
      status: "failed",
      traceId: "trace-cli-query",
    });
    expect(output).not.toContain("operator:secret");
    expect(output).not.toContain("db.internal");
  });

  it("emits a safe cleanup diagnostic when pool close fails", async () => {
    const pool = new TranscriptPool(
      new TranscriptClient([], undefined, false),
      true,
    );
    const stdout = vi.fn();
    const stderr = vi.fn();

    const exitCode = await runPostgresMigrationCli({
      argv: ["--plan"],
      createPool: vi.fn(() => pool),
      env: {
        CAMPAIGN_OS_DATABASE_SSL_MODE: "verify-full",
        CAMPAIGN_OS_DATABASE_URL: "postgresql://operator@db.internal/campaign",
      },
      migrations: [await migration()],
      stderr,
      stdout,
      traceId: "trace-cli-close",
    });

    expect(exitCode).toBe(1);
    expect(stdout).not.toHaveBeenCalled();
    const output = stderr.mock.calls[0]?.[0] ?? "";
    expect(JSON.parse(output)).toMatchObject({
      diagnosticCodes: ["POSTGRES_MIGRATION_CLEANUP_FAILED"],
      operation: "close",
      status: "failed",
      traceId: "trace-cli-close",
    });
    expect(output).not.toContain("operator:secret");
    expect(output).not.toContain("db.internal");
  });
});
