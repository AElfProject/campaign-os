import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import pg from "pg";
import {
  PostgresMigrationError,
  loadPostgresMigrations,
  runPostgresMigrations,
  type PostgresMigrationClient,
  type PostgresMigrationDefinition,
  type PostgresMigrationDiagnosticCode,
  type PostgresMigrationMode,
  type PostgresMigrationPool,
  type PostgresMigrationQueryResult,
} from "./postgresMigration";

const SAFE_TRACE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);

export interface PostgresMigrationPoolConfig {
  connectionString: string;
  connectionTimeoutMillis: number;
  idleTimeoutMillis: number;
  max: number;
  ssl: false | {
    checkServerIdentity?: () => undefined;
    rejectUnauthorized: boolean;
  };
}

export interface RunPostgresMigrationCliOptions {
  argv: readonly string[];
  createPool?: (
    config: PostgresMigrationPoolConfig,
  ) => PostgresMigrationPool | Promise<PostgresMigrationPool>;
  env?: Readonly<Record<string, string | undefined>>;
  migrations?: readonly PostgresMigrationDefinition[];
  stderr?: (output: string) => void;
  stdout?: (output: string) => void;
  traceId?: string;
}

const cliError = (
  code: Exclude<PostgresMigrationDiagnosticCode, "POSTGRES_MIGRATION_SCHEMA_UNINITIALIZED">,
  field: string,
  operation: "apply" | "close" | "configure" | "parse",
  traceId: string,
  cause?: unknown,
) => new PostgresMigrationError({ cause, code, field, operation, traceId });

const safeTraceId = (candidate: string | undefined) =>
  candidate && SAFE_TRACE_ID_PATTERN.test(candidate) ? candidate : randomUUID();

export const parsePostgresMigrationCliMode = (
  argv: readonly string[],
  traceId = "migration-cli",
): PostgresMigrationMode => {
  if (
    argv.length !== 1 ||
    !["--plan", "--validate", "--apply"].includes(argv[0] ?? "")
  ) {
    throw cliError(
      "POSTGRES_MIGRATION_ARGUMENT_INVALID",
      "argv",
      "parse",
      safeTraceId(traceId),
    );
  }

  return argv[0].slice(2) as PostgresMigrationMode;
};

const parseBoundedInteger = (
  value: string | undefined,
  defaultValue: number,
  minimum: number,
  maximum: number,
  field: string,
  traceId: string,
) => {
  if (value === undefined) {
    return defaultValue;
  }

  if (!/^\d+$/.test(value)) {
    throw cliError(
      "POSTGRES_MIGRATION_CONFIG_INVALID",
      field,
      "configure",
      traceId,
    );
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw cliError(
      "POSTGRES_MIGRATION_CONFIG_INVALID",
      field,
      "configure",
      traceId,
    );
  }

  return parsed;
};

const resolvePoolConfig = (
  env: Readonly<Record<string, string | undefined>>,
  traceId: string,
): PostgresMigrationPoolConfig => {
  const databaseUrl = env.CAMPAIGN_OS_DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw cliError(
      "POSTGRES_MIGRATION_CONFIG_INVALID",
      "CAMPAIGN_OS_DATABASE_URL",
      "configure",
      traceId,
    );
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(databaseUrl);
  } catch (error) {
    throw cliError(
      "POSTGRES_MIGRATION_CONFIG_INVALID",
      "CAMPAIGN_OS_DATABASE_URL",
      "configure",
      traceId,
      error,
    );
  }

  if (
    !["postgres:", "postgresql:"].includes(parsedUrl.protocol) ||
    !parsedUrl.hostname ||
    parsedUrl.pathname.length <= 1 ||
    [...parsedUrl.searchParams.keys()].some((key) =>
      ["sslcert", "sslkey", "sslmode", "sslrootcert"].includes(key.toLowerCase()))
  ) {
    throw cliError(
      "POSTGRES_MIGRATION_CONFIG_INVALID",
      "CAMPAIGN_OS_DATABASE_URL",
      "configure",
      traceId,
    );
  }

  const normalizedHostname = parsedUrl.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const loopback = LOOPBACK_HOSTS.has(normalizedHostname);
  const sslMode = env.CAMPAIGN_OS_DATABASE_SSL_MODE?.trim().toLowerCase()
    ?? (loopback ? "disable" : "verify-full");

  if (!["disable", "require", "verify-ca", "verify-full"].includes(sslMode)) {
    throw cliError(
      "POSTGRES_MIGRATION_CONFIG_INVALID",
      "CAMPAIGN_OS_DATABASE_SSL_MODE",
      "configure",
      traceId,
    );
  }

  if (sslMode === "disable" && !loopback) {
    throw cliError(
      "POSTGRES_MIGRATION_CONFIG_INVALID",
      "CAMPAIGN_OS_DATABASE_SSL_MODE",
      "configure",
      traceId,
    );
  }

  return {
    connectionString: databaseUrl,
    connectionTimeoutMillis: parseBoundedInteger(
      env.CAMPAIGN_OS_DATABASE_CONNECT_TIMEOUT_MS,
      5_000,
      100,
      30_000,
      "CAMPAIGN_OS_DATABASE_CONNECT_TIMEOUT_MS",
      traceId,
    ),
    idleTimeoutMillis: parseBoundedInteger(
      env.CAMPAIGN_OS_DATABASE_IDLE_TIMEOUT_MS,
      10_000,
      1_000,
      60_000,
      "CAMPAIGN_OS_DATABASE_IDLE_TIMEOUT_MS",
      traceId,
    ),
    max: parseBoundedInteger(
      env.CAMPAIGN_OS_DATABASE_POOL_MAX,
      10,
      1,
      20,
      "CAMPAIGN_OS_DATABASE_POOL_MAX",
      traceId,
    ),
    ssl: sslMode === "disable"
      ? false
      : {
        ...(sslMode === "verify-ca"
          ? { checkServerIdentity: () => undefined }
          : {}),
        rejectUnauthorized: sslMode !== "require",
      },
  };
};

const adaptPgClient = (client: pg.PoolClient): PostgresMigrationClient => ({
  query: async (
    text: string,
    values: readonly unknown[] = [],
  ): Promise<PostgresMigrationQueryResult> => {
    const result = await client.query(text, [...values]);

    return { rows: result.rows as Array<Record<string, unknown>> };
  },
  release: (destroy = false) => client.release(
    destroy ? new Error("PostgreSQL migration client cleanup failed.") : undefined,
  ),
});

const createPgMigrationPool = (config: PostgresMigrationPoolConfig): PostgresMigrationPool => {
  const pool = new pg.Pool(config);

  return {
    connect: async () => adaptPgClient(await pool.connect()),
    end: async () => pool.end(),
  };
};

const isApplyApproved = (value: string | undefined) =>
  value !== undefined && ["1", "true"].includes(value.trim().toLowerCase());

const normalizeCliFailure = (
  error: unknown,
  traceId: string,
  operation: "close" | "configure",
) => {
  if (error instanceof PostgresMigrationError) {
    return error;
  }

  return cliError(
    operation === "close"
      ? "POSTGRES_MIGRATION_CLEANUP_FAILED"
      : "POSTGRES_MIGRATION_CONFIG_INVALID",
    operation === "close" ? "pool" : "database",
    operation,
    traceId,
    error,
  );
};

const safeFailureOutput = (
  error: PostgresMigrationError,
  mode: PostgresMigrationMode | undefined,
  traceId: string,
) => JSON.stringify({
  diagnosticCodes: [error.code],
  ...(mode ? { mode } : {}),
  operation: error.operation,
  status: "failed",
  traceId,
});

export const runPostgresMigrationCli = async (
  options: RunPostgresMigrationCliOptions,
): Promise<number> => {
  const traceId = safeTraceId(options.traceId);
  const env = options.env ?? process.env;
  const stdout = options.stdout ?? ((output: string) => process.stdout.write(`${output}\n`));
  const stderr = options.stderr ?? ((output: string) => process.stderr.write(`${output}\n`));
  let mode: PostgresMigrationMode | undefined;
  let pool: PostgresMigrationPool | undefined;
  let result: Awaited<ReturnType<typeof runPostgresMigrations>> | undefined;
  let failure: PostgresMigrationError | undefined;

  try {
    mode = parsePostgresMigrationCliMode(options.argv, traceId);

    if (mode === "apply" && !isApplyApproved(env.CAMPAIGN_OS_APPROVE_LIVE_MIGRATIONS)) {
      throw cliError(
        "POSTGRES_MIGRATION_APPROVAL_REQUIRED",
        "CAMPAIGN_OS_APPROVE_LIVE_MIGRATIONS",
        "apply",
        traceId,
      );
    }

    const migrations = options.migrations ?? await loadPostgresMigrations(undefined, traceId);
    const poolConfig = resolvePoolConfig(env, traceId);
    pool = await (options.createPool ?? createPgMigrationPool)(poolConfig);
    result = await runPostgresMigrations({
      approved: mode === "apply",
      migrations,
      mode,
      pool,
      traceId,
    });
  } catch (error) {
    failure = normalizeCliFailure(error, traceId, "configure");
  }

  if (pool) {
    try {
      await pool.end();
    } catch (error) {
      const closeFailure = normalizeCliFailure(error, traceId, "close");
      failure = failure
        ? new PostgresMigrationError({
          cause: [failure.cause ?? failure, closeFailure.cause ?? closeFailure],
          code: failure.code,
          field: failure.field,
          operation: failure.operation,
          traceId: failure.traceId,
        })
        : closeFailure;
    }
  }

  if (failure) {
    stderr(safeFailureOutput(failure, mode, traceId));
    return 1;
  }

  stdout(JSON.stringify(result));
  return 0;
};

const POSTGRES_MIGRATION_CLI_ENTRY_PATH = resolve(
  process.cwd(),
  "src/server/postgresMigrationCli.ts",
);

export const isPostgresMigrationCliDirectExecution = (
  entryPath = process.argv[1],
) => typeof entryPath === "string"
  && resolve(entryPath) === POSTGRES_MIGRATION_CLI_ENTRY_PATH;

if (isPostgresMigrationCliDirectExecution()) {
  runPostgresMigrationCli({ argv: process.argv.slice(2) })
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch(() => {
      process.stderr.write(JSON.stringify({
        diagnosticCodes: ["POSTGRES_MIGRATION_EXECUTION_FAILED"],
        status: "failed",
        traceId: randomUUID(),
      }) + "\n");
      process.exitCode = 1;
    });
}
