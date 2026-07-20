import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import {
  validatePostgresMigrationFileManifest,
  type PostgresMigrationManifestEntry,
  type PostgresMigrationManifestIssueCode,
} from "./migrationManifest";

export const POSTGRES_MIGRATION_ADVISORY_LOCK_KEY = 239_000_001;

const DEFAULT_LOCK_WAIT_MS = 5_000;
const DEFAULT_LOCK_RETRY_DELAY_MS = 100;
const DEFAULT_MIGRATION_DIRECTORY = resolve(process.cwd(), "db/migrations");
const MIGRATION_FILE_PATTERN = /^(\d{4}_[a-z0-9]+(?:_[a-z0-9]+)*)\.(up|down)\.sql$/;
const MIGRATION_ID_PATTERN = /^\d{4}_[a-z0-9]+(?:_[a-z0-9]+)*$/;
const CHECKSUM_PATTERN = /^[a-f0-9]{64}$/;
const TRACE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
// Array-level provenance lets apply revalidate discovery without widening each SQL definition.
const POSTGRES_MIGRATION_FILE_MANIFEST = Symbol("postgresMigrationFileManifest");

export type PostgresMigrationMode = "plan" | "validate" | "apply";
export type PostgresMigrationStatus = "ready" | "pending" | "blocked" | "failed";
export type PostgresMigrationOperation =
  | PostgresMigrationMode
  | "close"
  | "configure"
  | "discover"
  | "parse";
export type PostgresMigrationDiagnosticCode =
  | PostgresMigrationManifestIssueCode
  | "POSTGRES_MIGRATION_APPROVAL_REQUIRED"
  | "POSTGRES_MIGRATION_ARGUMENT_INVALID"
  | "POSTGRES_MIGRATION_CHECKSUM_DRIFT"
  | "POSTGRES_MIGRATION_CLEANUP_FAILED"
  | "POSTGRES_MIGRATION_CONFIG_INVALID"
  | "POSTGRES_MIGRATION_DEFINITION_INVALID"
  | "POSTGRES_MIGRATION_DISCOVERY_FAILED"
  | "POSTGRES_MIGRATION_EXECUTION_FAILED"
  | "POSTGRES_MIGRATION_LEDGER_INVALID"
  | "POSTGRES_MIGRATION_LOCK_UNAVAILABLE"
  | "POSTGRES_MIGRATION_QUERY_FAILED"
  | "POSTGRES_MIGRATION_SCHEMA_UNINITIALIZED";

export interface PostgresMigrationQueryResult {
  rows: Array<Record<string, unknown>>;
}

export interface PostgresMigrationClient {
  query(
    text: string,
    values?: readonly unknown[],
  ): Promise<PostgresMigrationQueryResult>;
  release(destroy?: boolean): Promise<void> | void;
}

export interface PostgresMigrationPool {
  connect(): Promise<PostgresMigrationClient>;
  end(): Promise<void>;
}

export interface PostgresMigrationDefinition {
  checksum: string;
  downSql: string;
  id: string;
  upSql: string;
}

type ManifestBoundMigrationDefinitions = PostgresMigrationDefinition[] & {
  readonly [POSTGRES_MIGRATION_FILE_MANIFEST]: readonly PostgresMigrationManifestEntry[];
};

export interface PostgresMigrationResult {
  appliedMigrationIds: string[];
  diagnosticCodes: PostgresMigrationDiagnosticCode[];
  mode: PostgresMigrationMode;
  pendingMigrationIds: string[];
  status: PostgresMigrationStatus;
  traceId: string;
}

export interface RunPostgresMigrationsOptions {
  approved?: boolean;
  lockRetryDelayMs?: number;
  lockWaitMs?: number;
  migrations: readonly PostgresMigrationDefinition[];
  mode: PostgresMigrationMode;
  now?: () => number;
  pool: PostgresMigrationPool;
  sleep?: (milliseconds: number) => Promise<void>;
  traceId: string;
}

interface MigrationLedgerState {
  appliedMigrationIds: string[];
  initialized: boolean;
  pendingMigrationIds: string[];
}

const SAFE_ERROR_MESSAGES: Record<Exclude<PostgresMigrationDiagnosticCode, "POSTGRES_MIGRATION_SCHEMA_UNINITIALIZED">, string> = {
  POSTGRES_MIGRATION_APPROVAL_REQUIRED: "PostgreSQL migration apply requires explicit approval.",
  POSTGRES_MIGRATION_ARGUMENT_INVALID: "PostgreSQL migration arguments are invalid.",
  POSTGRES_MIGRATION_CHECKSUM_DRIFT: "PostgreSQL migration checksum drift was detected.",
  POSTGRES_MIGRATION_CLEANUP_FAILED: "PostgreSQL migration cleanup failed.",
  POSTGRES_MIGRATION_CONFIG_INVALID: "PostgreSQL migration configuration is invalid.",
  POSTGRES_MIGRATION_DEFINITION_INVALID: "PostgreSQL migration definition is invalid.",
  POSTGRES_MIGRATION_DISCOVERY_FAILED: "PostgreSQL migration discovery failed.",
  POSTGRES_MIGRATION_EXECUTION_FAILED: "PostgreSQL migration execution failed.",
  POSTGRES_MIGRATION_LEDGER_INVALID: "PostgreSQL migration ledger is invalid.",
  POSTGRES_MIGRATION_LOCK_UNAVAILABLE: "PostgreSQL migration lock is unavailable.",
  POSTGRES_MIGRATION_MANIFEST_CHECKSUM_DRIFT:
    "PostgreSQL migration manifest checksum drift was detected.",
  POSTGRES_MIGRATION_MANIFEST_DUPLICATE_ID:
    "PostgreSQL migration manifest contains a duplicate ID.",
  POSTGRES_MIGRATION_MANIFEST_EXTRA_ENTRY:
    "PostgreSQL migration manifest contains an unexpected entry.",
  POSTGRES_MIGRATION_MANIFEST_MISSING_ENTRY:
    "PostgreSQL migration manifest is missing an entry.",
  POSTGRES_MIGRATION_MANIFEST_ORDER_DRIFT:
    "PostgreSQL migration manifest order drift was detected.",
  POSTGRES_MIGRATION_MANIFEST_PATH_DRIFT:
    "PostgreSQL migration manifest path drift was detected.",
  POSTGRES_MIGRATION_QUERY_FAILED: "PostgreSQL migration query failed.",
};

export class PostgresMigrationError extends Error {
  readonly code: Exclude<PostgresMigrationDiagnosticCode, "POSTGRES_MIGRATION_SCHEMA_UNINITIALIZED">;
  declare readonly cause?: unknown;
  readonly field: string;
  readonly operation: PostgresMigrationOperation;
  readonly traceId: string;

  constructor(options: {
    cause?: unknown;
    code: Exclude<PostgresMigrationDiagnosticCode, "POSTGRES_MIGRATION_SCHEMA_UNINITIALIZED">;
    field: string;
    operation: PostgresMigrationOperation;
    traceId: string;
  }) {
    super(SAFE_ERROR_MESSAGES[options.code]);
    this.name = "PostgresMigrationError";
    this.code = options.code;
    this.field = options.field;
    this.operation = options.operation;
    this.traceId = options.traceId;

    if (options.cause !== undefined) {
      Object.defineProperty(this, "cause", {
        configurable: true,
        enumerable: false,
        value: options.cause,
      });
    }
  }
}

const migrationError = (
  code: Exclude<PostgresMigrationDiagnosticCode, "POSTGRES_MIGRATION_SCHEMA_UNINITIALIZED">,
  field: string,
  operation: PostgresMigrationOperation,
  traceId: string,
  cause?: unknown,
) => new PostgresMigrationError({ cause, code, field, operation, traceId });

const toManifestPath = (filePath: string) =>
  relative(process.cwd(), filePath).split(sep).join("/");

const assertPostgresMigrationFileManifest = (
  entries: readonly PostgresMigrationManifestEntry[],
  operation: PostgresMigrationOperation,
  traceId: string,
) => {
  const issue = validatePostgresMigrationFileManifest(entries)[0];

  if (issue) {
    throw migrationError(issue.code, issue.field, operation, traceId);
  }
};

const bindPostgresMigrationFileManifest = (
  definitions: PostgresMigrationDefinition[],
  entries: readonly PostgresMigrationManifestEntry[],
) => {
  const snapshot = Object.freeze(entries.map((entry) => Object.freeze({ ...entry })));

  Object.defineProperty(definitions, POSTGRES_MIGRATION_FILE_MANIFEST, {
    configurable: false,
    enumerable: false,
    value: snapshot,
    writable: false,
  });

  return definitions as ManifestBoundMigrationDefinitions;
};

const manifestForBoundMigrationDefinitions = (
  definitions: readonly PostgresMigrationDefinition[],
): PostgresMigrationManifestEntry[] | undefined => {
  const sourceEntries = (
    definitions as Partial<ManifestBoundMigrationDefinitions>
  )[POSTGRES_MIGRATION_FILE_MANIFEST];

  if (!sourceEntries) {
    return undefined;
  }

  const sourceById = new Map(sourceEntries.map((entry) => [entry.id, entry]));

  return definitions.map((definition) => {
    const candidate = definition as Partial<PostgresMigrationDefinition> | undefined;
    const id = typeof candidate?.id === "string" ? candidate.id : "";
    const source = sourceById.get(id);

    return {
      checksum: typeof candidate?.checksum === "string" ? candidate.checksum : "",
      downPath: source?.downPath ?? "",
      id,
      upPath: source?.upPath ?? "",
    };
  });
};

const normalizeMigrationSql = (sql: string) => `${sql.replace(/\r\n?/g, "\n").trimEnd()}\n`;

export const calculatePostgresMigrationChecksum = async (sql: string): Promise<string> =>
  createHash("sha256").update(normalizeMigrationSql(sql), "utf8").digest("hex");

export const loadPostgresMigrations = async (
  directoryPath = DEFAULT_MIGRATION_DIRECTORY,
  traceId = "migration-discovery",
): Promise<PostgresMigrationDefinition[]> => {
  if (!TRACE_ID_PATTERN.test(traceId)) {
    throw migrationError(
      "POSTGRES_MIGRATION_ARGUMENT_INVALID",
      "traceId",
      "discover",
      "trace-invalid",
    );
  }

  try {
    const resolvedDirectoryPath = resolve(directoryPath);
    const entries = await readdir(resolvedDirectoryPath, { withFileTypes: true });
    const pairs = new Map<string, { downPath?: string; upPath?: string }>();

    for (const entry of entries) {
      if (!entry.isFile()) {
        continue;
      }

      const match = MIGRATION_FILE_PATTERN.exec(entry.name);

      if (!match) {
        continue;
      }

      const [, id, direction] = match;
      const pair = pairs.get(id) ?? {};

      if (direction === "up") {
        pair.upPath = resolve(resolvedDirectoryPath, entry.name);
      } else {
        pair.downPath = resolve(resolvedDirectoryPath, entry.name);
      }

      pairs.set(id, pair);
    }

    if (pairs.size === 0) {
      throw migrationError(
        "POSTGRES_MIGRATION_DEFINITION_INVALID",
        "migrationFiles",
        "discover",
        traceId,
      );
    }

    const definitions: PostgresMigrationDefinition[] = [];
    const discoveredManifest: PostgresMigrationManifestEntry[] = [];

    for (const [id, pair] of [...pairs].sort(([left], [right]) => left.localeCompare(right))) {
      if (!pair.upPath || !pair.downPath) {
        throw migrationError(
          "POSTGRES_MIGRATION_DEFINITION_INVALID",
          "migrationPair",
          "discover",
          traceId,
        );
      }

      const [upSql, downSql] = await Promise.all([
        readFile(pair.upPath, "utf8"),
        readFile(pair.downPath, "utf8"),
      ]);
      const normalizedUpSql = normalizeMigrationSql(upSql);
      const checksum = await calculatePostgresMigrationChecksum(normalizedUpSql);

      definitions.push({
        checksum,
        downSql: normalizeMigrationSql(downSql),
        id,
        upSql: normalizedUpSql,
      });
      discoveredManifest.push({
        checksum,
        downPath: toManifestPath(pair.downPath),
        id,
        upPath: toManifestPath(pair.upPath),
      });
    }

    assertPostgresMigrationFileManifest(discoveredManifest, "discover", traceId);

    return bindPostgresMigrationFileManifest(definitions, discoveredManifest);
  } catch (error) {
    if (error instanceof PostgresMigrationError) {
      throw error;
    }

    throw migrationError(
      "POSTGRES_MIGRATION_DISCOVERY_FAILED",
      "migrationFiles",
      "discover",
      traceId,
      error,
    );
  }
};

const validateTraceId = (traceId: string, operation: PostgresMigrationOperation) => {
  if (!TRACE_ID_PATTERN.test(traceId)) {
    throw migrationError(
      "POSTGRES_MIGRATION_ARGUMENT_INVALID",
      "traceId",
      operation,
      "trace-invalid",
    );
  }

  return traceId;
};

const validateBoundedNumber = (
  value: number,
  field: string,
  maximum: number,
  operation: PostgresMigrationOperation,
  traceId: string,
) => {
  if (!Number.isInteger(value) || value < 0 || value > maximum) {
    throw migrationError(
      "POSTGRES_MIGRATION_ARGUMENT_INVALID",
      field,
      operation,
      traceId,
    );
  }

  return value;
};

const validateMigrationDefinitions = async (
  migrations: readonly PostgresMigrationDefinition[],
  operation: PostgresMigrationMode,
  traceId: string,
) => {
  if (!Array.isArray(migrations) || migrations.length === 0) {
    throw migrationError(
      "POSTGRES_MIGRATION_DEFINITION_INVALID",
      "migrations",
      operation,
      traceId,
    );
  }

  const ids = new Set<string>();
  const validated: PostgresMigrationDefinition[] = [];

  for (const migration of migrations) {
    if (
      !migration ||
      typeof migration !== "object" ||
      typeof migration.id !== "string" ||
      !MIGRATION_ID_PATTERN.test(migration.id) ||
      ids.has(migration.id) ||
      typeof migration.upSql !== "string" ||
      migration.upSql.trim().length === 0 ||
      typeof migration.downSql !== "string" ||
      migration.downSql.trim().length === 0 ||
      typeof migration.checksum !== "string" ||
      !CHECKSUM_PATTERN.test(migration.checksum) ||
      migration.checksum !== await calculatePostgresMigrationChecksum(migration.upSql)
    ) {
      throw migrationError(
        "POSTGRES_MIGRATION_DEFINITION_INVALID",
        "migrations",
        operation,
        traceId,
      );
    }

    ids.add(migration.id);
    validated.push({
      ...migration,
      downSql: normalizeMigrationSql(migration.downSql),
      upSql: normalizeMigrationSql(migration.upSql),
    });
  }

  return validated.sort((left, right) => left.id.localeCompare(right.id));
};

const readAppliedRows = async (
  client: PostgresMigrationClient,
  initialized: boolean,
) => {
  if (!initialized) {
    return [];
  }

  const result = await client.query(
    "SELECT migration_id, checksum FROM campaign_os.schema_migrations ORDER BY migration_id ASC",
  );

  return result.rows.map((row) => {
    if (
      typeof row.migration_id !== "string" ||
      !MIGRATION_ID_PATTERN.test(row.migration_id) ||
      typeof row.checksum !== "string" ||
      !CHECKSUM_PATTERN.test(row.checksum)
    ) {
      throw migrationError(
        "POSTGRES_MIGRATION_LEDGER_INVALID",
        "schemaMigrations",
        "validate",
        "migration-ledger",
      );
    }

    return {
      checksum: row.checksum,
      migrationId: row.migration_id,
    };
  });
};

const inspectLedger = async (
  client: PostgresMigrationClient,
  migrations: readonly PostgresMigrationDefinition[],
  operation: PostgresMigrationMode,
  traceId: string,
  ledgerKnownToExist = false,
): Promise<MigrationLedgerState> => {
  let initialized = ledgerKnownToExist;

  if (!ledgerKnownToExist) {
    const result = await client.query(
      "SELECT to_regclass($1) AS ledger_name",
      ["campaign_os.schema_migrations"],
    );
    initialized = typeof result.rows[0]?.ledger_name === "string";
  }

  let appliedRows: Awaited<ReturnType<typeof readAppliedRows>>;

  try {
    appliedRows = await readAppliedRows(client, initialized);
  } catch (error) {
    if (error instanceof PostgresMigrationError) {
      throw new PostgresMigrationError({
        cause: error.cause,
        code: error.code,
        field: error.field,
        operation,
        traceId,
      });
    }

    throw error;
  }

  const definitionById = new Map(migrations.map((migration) => [migration.id, migration]));

  for (const [index, applied] of appliedRows.entries()) {
    if (migrations[index]?.id !== applied.migrationId) {
      throw migrationError(
        "POSTGRES_MIGRATION_LEDGER_INVALID",
        "migrationOrder",
        operation,
        traceId,
      );
    }
  }

  for (const applied of appliedRows) {
    const definition = definitionById.get(applied.migrationId);

    if (!definition) {
      throw migrationError(
        "POSTGRES_MIGRATION_LEDGER_INVALID",
        "migrationId",
        operation,
        traceId,
      );
    }

    if (definition.checksum !== applied.checksum) {
      throw migrationError(
        "POSTGRES_MIGRATION_CHECKSUM_DRIFT",
        "checksum",
        operation,
        traceId,
      );
    }
  }

  const appliedMigrationIds = appliedRows.map((row) => row.migrationId);
  const appliedIds = new Set(appliedMigrationIds);

  return {
    appliedMigrationIds,
    initialized,
    pendingMigrationIds: migrations
      .filter((migration) => !appliedIds.has(migration.id))
      .map((migration) => migration.id),
  };
};

const resultFromState = (
  state: MigrationLedgerState,
  mode: PostgresMigrationMode,
  traceId: string,
): PostgresMigrationResult => ({
  appliedMigrationIds: state.appliedMigrationIds,
  diagnosticCodes: state.initialized ? [] : ["POSTGRES_MIGRATION_SCHEMA_UNINITIALIZED"],
  mode,
  pendingMigrationIds: state.pendingMigrationIds,
  status: state.pendingMigrationIds.length > 0 ? "pending" : "ready",
  traceId,
});

const normalizeRuntimeError = (
  error: unknown,
  operation: PostgresMigrationMode,
  traceId: string,
) => {
  if (error instanceof PostgresMigrationError) {
    return error;
  }

  return migrationError(
    operation === "apply"
      ? "POSTGRES_MIGRATION_EXECUTION_FAILED"
      : "POSTGRES_MIGRATION_QUERY_FAILED",
    "database",
    operation,
    traceId,
    error,
  );
};

const connectClient = async (
  pool: PostgresMigrationPool,
  operation: PostgresMigrationMode,
  traceId: string,
) => {
  try {
    return await pool.connect();
  } catch (error) {
    throw normalizeRuntimeError(error, operation, traceId);
  }
};

const runReadOnlyMigrationCheck = async (
  options: RunPostgresMigrationsOptions,
  migrations: readonly PostgresMigrationDefinition[],
  traceId: string,
) => {
  const client = await connectClient(options.pool, options.mode, traceId);
  let failure: PostgresMigrationError | undefined;
  let result: PostgresMigrationResult | undefined;

  try {
    result = resultFromState(
      await inspectLedger(client, migrations, options.mode, traceId),
      options.mode,
      traceId,
    );
  } catch (error) {
    failure = normalizeRuntimeError(error, options.mode, traceId);
  }

  try {
    await client.release();
  } catch (error) {
    failure = failure
      ? new PostgresMigrationError({
        cause: [failure.cause ?? failure, error],
        code: failure.code,
        field: failure.field,
        operation: failure.operation,
        traceId: failure.traceId,
      })
      : migrationError(
        "POSTGRES_MIGRATION_CLEANUP_FAILED",
        "client",
        "close",
        traceId,
        error,
      );
  }

  if (failure) {
    throw failure;
  }

  return result as PostgresMigrationResult;
};

const acquireMigrationLock = async (
  client: PostgresMigrationClient,
  lockWaitMs: number,
  retryDelayMs: number,
  sleep: (milliseconds: number) => Promise<void>,
  traceId: string,
) => {
  const attempts = Math.floor(lockWaitMs / retryDelayMs) + 1;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    let result: PostgresMigrationQueryResult;

    try {
      result = await client.query(
        "SELECT pg_try_advisory_lock($1) AS acquired",
        [POSTGRES_MIGRATION_ADVISORY_LOCK_KEY],
      );
    } catch (error) {
      throw migrationError(
        "POSTGRES_MIGRATION_LOCK_UNAVAILABLE",
        "advisoryLock",
        "apply",
        traceId,
        error,
      );
    }

    if (result.rows[0]?.acquired === true) {
      return;
    }

    if (attempt < attempts - 1) {
      await sleep(retryDelayMs);
    }
  }

  throw migrationError(
    "POSTGRES_MIGRATION_LOCK_UNAVAILABLE",
    "advisoryLock",
    "apply",
    traceId,
  );
};

const bootstrapMigrationLedger = async (client: PostgresMigrationClient) => {
  await client.query("CREATE SCHEMA IF NOT EXISTS campaign_os");
  await client.query(`
    CREATE TABLE IF NOT EXISTS campaign_os.schema_migrations (
      migration_id text PRIMARY KEY,
      checksum text NOT NULL CHECK (checksum ~ '^[a-f0-9]{64}$'),
      applied_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
      execution_ms integer NOT NULL CHECK (execution_ms >= 0)
    )
  `);
};

const combineFailureCauses = (
  failure: PostgresMigrationError,
  cleanupErrors: unknown[],
) => {
  if (cleanupErrors.length === 0) {
    return failure;
  }

  return new PostgresMigrationError({
    cause: [failure.cause ?? failure, ...cleanupErrors],
    code: failure.code,
    field: failure.field,
    operation: failure.operation,
    traceId: failure.traceId,
  });
};

const runMigrationApply = async (
  options: RunPostgresMigrationsOptions,
  migrations: readonly PostgresMigrationDefinition[],
  traceId: string,
) => {
  const lockWaitMs = validateBoundedNumber(
    options.lockWaitMs ?? DEFAULT_LOCK_WAIT_MS,
    "lockWaitMs",
    60_000,
    "apply",
    traceId,
  );
  const retryDelayMs = validateBoundedNumber(
    options.lockRetryDelayMs ?? DEFAULT_LOCK_RETRY_DELAY_MS,
    "lockRetryDelayMs",
    5_000,
    "apply",
    traceId,
  );

  if (retryDelayMs === 0) {
    throw migrationError(
      "POSTGRES_MIGRATION_ARGUMENT_INVALID",
      "lockRetryDelayMs",
      "apply",
      traceId,
    );
  }

  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? ((milliseconds: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  const client = await connectClient(options.pool, "apply", traceId);
  const cleanupErrors: unknown[] = [];
  let failure: PostgresMigrationError | undefined;
  let lockAcquired = false;
  let transactionOpen = false;
  let result: PostgresMigrationResult | undefined;

  try {
    await acquireMigrationLock(client, lockWaitMs, retryDelayMs, sleep, traceId);
    lockAcquired = true;
    await client.query("BEGIN");
    transactionOpen = true;
    await bootstrapMigrationLedger(client);
    const state = await inspectLedger(client, migrations, "apply", traceId, true);
    const migrationById = new Map(migrations.map((migration) => [migration.id, migration]));

    for (const migrationId of state.pendingMigrationIds) {
      const migration = migrationById.get(migrationId);

      if (!migration) {
        throw migrationError(
          "POSTGRES_MIGRATION_DEFINITION_INVALID",
          "migrationId",
          "apply",
          traceId,
        );
      }

      const startedAt = now();
      await client.query(migration.upSql);
      const finishedAt = now();

      if (!Number.isFinite(startedAt) || !Number.isFinite(finishedAt)) {
        throw migrationError(
          "POSTGRES_MIGRATION_ARGUMENT_INVALID",
          "now",
          "apply",
          traceId,
        );
      }

      await client.query(
        `INSERT INTO campaign_os.schema_migrations
          (migration_id, checksum, execution_ms)
         VALUES ($1, $2, $3)`,
        [migration.id, migration.checksum, Math.max(0, Math.trunc(finishedAt - startedAt))],
      );
    }

    await client.query("COMMIT");
    transactionOpen = false;
    result = {
      appliedMigrationIds: migrations.map((migration) => migration.id),
      diagnosticCodes: [],
      mode: "apply",
      pendingMigrationIds: [],
      status: "ready",
      traceId,
    };
  } catch (error) {
    failure = normalizeRuntimeError(error, "apply", traceId);

    if (transactionOpen) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        cleanupErrors.push(rollbackError);
      }
      transactionOpen = false;
    }
  }

  if (lockAcquired) {
    try {
      const unlock = await client.query(
        "SELECT pg_advisory_unlock($1) AS released",
        [POSTGRES_MIGRATION_ADVISORY_LOCK_KEY],
      );

      if (unlock.rows[0]?.released !== true) {
        cleanupErrors.push(new Error("Advisory lock release was not confirmed."));
      }
    } catch (unlockError) {
      cleanupErrors.push(unlockError);
    }
  }

  try {
      await client.release(cleanupErrors.length > 0);
  } catch (releaseError) {
    cleanupErrors.push(releaseError);
  }

  if (failure) {
    throw combineFailureCauses(failure, cleanupErrors);
  }

  if (cleanupErrors.length > 0) {
    throw migrationError(
      "POSTGRES_MIGRATION_CLEANUP_FAILED",
      "client",
      "close",
      traceId,
      cleanupErrors.length === 1 ? cleanupErrors[0] : cleanupErrors,
    );
  }

  return result as PostgresMigrationResult;
};

export const runPostgresMigrations = async (
  options: RunPostgresMigrationsOptions,
): Promise<PostgresMigrationResult> => {
  const traceId = validateTraceId(options.traceId, "parse");

  if (!["plan", "validate", "apply"].includes(options.mode)) {
    throw migrationError(
      "POSTGRES_MIGRATION_ARGUMENT_INVALID",
      "mode",
      "parse",
      traceId,
    );
  }

  if (options.mode === "apply" && options.approved !== true) {
    throw migrationError(
      "POSTGRES_MIGRATION_APPROVAL_REQUIRED",
      "approval",
      "apply",
      traceId,
    );
  }

  const boundManifest = manifestForBoundMigrationDefinitions(options.migrations);

  if (boundManifest) {
    assertPostgresMigrationFileManifest(boundManifest, options.mode, traceId);
  }

  const migrations = await validateMigrationDefinitions(
    options.migrations,
    options.mode,
    traceId,
  );

  if (options.mode === "apply") {
    return runMigrationApply(options, migrations, traceId);
  }

  return runReadOnlyMigrationCheck(options, migrations, traceId);
};
