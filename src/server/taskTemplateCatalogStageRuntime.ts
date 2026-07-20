import { randomBytes, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import pg from "pg";
import {
  resolveCampaignOsCampaignDbConfig,
  type CampaignOsCampaignDbConfig,
} from "./config";
import {
  loadPostgresMigrations,
  runPostgresMigrations,
  type PostgresMigrationClient,
  type PostgresMigrationPool,
  type PostgresMigrationQueryResult,
  type PostgresMigrationResult,
} from "./postgresMigration";
import { resolveTaskTemplateCatalogConfig } from "./taskTemplateCatalogConfig";
import { taskTemplateCatalogManifestV1 } from "./taskTemplateCatalogManifest";
import {
  createPostgresTaskTemplateCatalogStore,
  type PostgresTaskTemplateCatalogClient,
  type PostgresTaskTemplateCatalogPool,
  type PostgresTaskTemplateCatalogQueryInput,
  type PostgresTaskTemplateCatalogQueryResult,
} from "./postgresTaskTemplateCatalogStore";
import { startCampaignOsApiServer } from "./server";
import {
  startWalletAuthenticationStageRuntime,
  type StartWalletAuthenticationStageRuntimeOptions,
  type ValidateWalletAuthenticationStageMigrationsInput,
  type WalletAuthenticationStageRuntimeHandle,
} from "./walletAuthenticationStageRuntime";

const EXACT_API_HOST = "127.0.0.1";
const REQUIRED_CATALOG_MIGRATION_ID = "0006_durable_task_template_catalog";
const REQUIRED_WALLET_AUTH_MIGRATION_ID = "0005_participant_wallet_authentication";
const STAGE_DATABASE_ACK_ENV = "CAMPAIGN_OS_STAGE_DISPOSABLE_DATABASE_ACK";
const STAGE_DATABASE_ACK_VALUE = "disposable-stage-approved";
const LOOPBACK_DATABASE_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);
const DISPOSABLE_DATABASE_PATTERN = /(?:^|[_-])(?:disposable|stage|test)(?:[_-]|$)/i;
const PRODUCTION_DATABASE_PATTERN = /(?:^|[_-])(?:live|prod|production)(?:[_-]|$)/i;
const SAFE_TRACE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SAFE_DATABASE_USERNAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_.-]{0,62}$/;

type PostgresCampaignDbConfig = Extract<CampaignOsCampaignDbConfig, { mode: "postgres" }>;

export type TaskTemplateCatalogStageRuntimeErrorCode =
  | "TASK_TEMPLATE_CATALOG_STAGE_CATALOG_NOT_READY"
  | "TASK_TEMPLATE_CATALOG_STAGE_CATALOG_REQUIRED"
  | "TASK_TEMPLATE_CATALOG_STAGE_CLI_INVALID_ARGUMENT"
  | "TASK_TEMPLATE_CATALOG_STAGE_DATABASE_UNSAFE"
  | "TASK_TEMPLATE_CATALOG_STAGE_LOOPBACK_REQUIRED"
  | "TASK_TEMPLATE_CATALOG_STAGE_MIGRATION_NOT_READY"
  | "TASK_TEMPLATE_CATALOG_STAGE_SHUTDOWN_FAILED"
  | "TASK_TEMPLATE_CATALOG_STAGE_START_FAILED";

export type TaskTemplateCatalogStagePreflightCheck =
  | "catalog_config"
  | "catalog_support"
  | "database"
  | "loopback"
  | "migration"
  | "wallet_authentication";

export interface TaskTemplateCatalogStagePreflightResult {
  readonly check: TaskTemplateCatalogStagePreflightCheck;
  readonly status: "failed" | "ready";
}

const ERROR_MESSAGES: Readonly<Record<TaskTemplateCatalogStageRuntimeErrorCode, string>> =
  Object.freeze({
    TASK_TEMPLATE_CATALOG_STAGE_CATALOG_REQUIRED:
      "Task template catalog stage runtime requires durable catalog configuration.",
    TASK_TEMPLATE_CATALOG_STAGE_CATALOG_NOT_READY:
      "Task template catalog stage runtime could not validate the durable catalog.",
    TASK_TEMPLATE_CATALOG_STAGE_CLI_INVALID_ARGUMENT:
      "Task template catalog stage runtime CLI arguments are invalid.",
    TASK_TEMPLATE_CATALOG_STAGE_DATABASE_UNSAFE:
      "Task template catalog stage runtime requires an acknowledged disposable loopback database.",
    TASK_TEMPLATE_CATALOG_STAGE_LOOPBACK_REQUIRED:
      "Task template catalog stage runtime requires independent explicit loopback endpoints.",
    TASK_TEMPLATE_CATALOG_STAGE_MIGRATION_NOT_READY:
      "Task template catalog stage runtime migration validation failed.",
    TASK_TEMPLATE_CATALOG_STAGE_SHUTDOWN_FAILED:
      "Task template catalog stage runtime failed to drain.",
    TASK_TEMPLATE_CATALOG_STAGE_START_FAILED:
      "Task template catalog stage runtime failed to start.",
  });

export type TaskTemplateCatalogStageMigrationValidator = (
  input: ValidateWalletAuthenticationStageMigrationsInput,
) => Promise<PostgresMigrationResult>;

export type TaskTemplateCatalogStageCatalogValidator = (
  input: ValidateWalletAuthenticationStageMigrationsInput,
) => Promise<void>;

export type TaskTemplateCatalogWalletRuntimeStarter = (
  options?: StartWalletAuthenticationStageRuntimeOptions,
) => Promise<WalletAuthenticationStageRuntimeHandle>;

export interface StartTaskTemplateCatalogStageRuntimeOptions
  extends Omit<StartWalletAuthenticationStageRuntimeOptions, "env" | "migrationValidator"> {
  readonly catalogValidator?: TaskTemplateCatalogStageCatalogValidator;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly migrationValidator?: TaskTemplateCatalogStageMigrationValidator;
  readonly walletRuntimeStarter?: TaskTemplateCatalogWalletRuntimeStarter;
}

export interface RunTaskTemplateCatalogStageRuntimeCliOptions
  extends StartTaskTemplateCatalogStageRuntimeOptions {
  readonly argv?: readonly string[];
  readonly stdout?: (line: string) => void;
}

export interface TaskTemplateCatalogStageRuntimeState {
  readonly catalog: Readonly<{
    enabled: true;
    mode: "durable";
    requiredMigrationId: typeof REQUIRED_CATALOG_MIGRATION_ID;
  }>;
  readonly environment: "stage";
  readonly lifecycle: "ready" | "closing" | "closed";
  readonly preflight: readonly TaskTemplateCatalogStagePreflightResult[];
  readonly productionReady: false;
  readonly stageProductReviewReady: false;
  readonly stageReady: boolean;
  readonly walletAuthentication: Readonly<{
    accepting: boolean;
    bindingCount: number;
  }>;
}

export interface TaskTemplateCatalogStageRuntimeHandle {
  readonly url: string;
  close(): Promise<void>;
  getState(): TaskTemplateCatalogStageRuntimeState;
}

interface ResolvedStageBoundary {
  readonly database: PostgresCampaignDbConfig;
  readonly env: Record<string, string | undefined>;
  readonly preflight: TaskTemplateCatalogStagePreflightResult[];
}

export class TaskTemplateCatalogStageRuntimeError extends Error {
  readonly code: TaskTemplateCatalogStageRuntimeErrorCode;
  readonly preflight: readonly TaskTemplateCatalogStagePreflightResult[];
  readonly traceId: string;

  constructor(
    code: TaskTemplateCatalogStageRuntimeErrorCode,
    traceId: string = randomUUID(),
    preflight: readonly TaskTemplateCatalogStagePreflightResult[] = [],
  ) {
    super(ERROR_MESSAGES[code]);
    this.name = "TaskTemplateCatalogStageRuntimeError";
    this.code = code;
    this.preflight = Object.freeze(preflight.map((entry) => Object.freeze({ ...entry })));
    this.traceId = SAFE_TRACE_ID_PATTERN.test(traceId) ? traceId : randomUUID();
    delete this.stack;
  }
}

export const startTaskTemplateCatalogStageRuntime = async (
  options: StartTaskTemplateCatalogStageRuntimeOptions = {},
): Promise<TaskTemplateCatalogStageRuntimeHandle> => {
  const traceId = randomUUID();
  const resolved = resolveStageBoundary(options.env ?? process.env, traceId);
  const migrationValidator = options.migrationValidator ?? validateStageMigrations;
  let migration: PostgresMigrationResult;
  try {
    migration = await migrationValidator({
      database: resolved.database,
      mode: "validate",
      traceId,
    });
  } catch {
    throw failedPreflight(
      "TASK_TEMPLATE_CATALOG_STAGE_MIGRATION_NOT_READY",
      "migration",
      traceId,
      resolved.preflight,
    );
  }
  if (!migrationReady(migration)) {
    throw failedPreflight(
      "TASK_TEMPLATE_CATALOG_STAGE_MIGRATION_NOT_READY",
      "migration",
      traceId,
      resolved.preflight,
    );
  }
  resolved.preflight.push({ check: "migration", status: "ready" });

  const catalogValidator = options.catalogValidator ?? validateStageCatalog;
  try {
    await catalogValidator({
      database: resolved.database,
      mode: "validate",
      traceId,
    });
  } catch {
    throw failedPreflight(
      "TASK_TEMPLATE_CATALOG_STAGE_CATALOG_NOT_READY",
      "catalog_support",
      traceId,
      resolved.preflight,
    );
  }
  resolved.preflight.push({ check: "catalog_support", status: "ready" });

  const walletRuntimeStarter = options.walletRuntimeStarter
    ?? startWalletAuthenticationStageRuntime;
  const walletBoundaryEnv = withoutDatabaseUsername(resolved.env);
  const serverStarter = options.serverStarter ?? startCampaignOsApiServer;
  let walletRuntime: WalletAuthenticationStageRuntimeHandle;
  try {
    walletRuntime = await walletRuntimeStarter({
      adapterPackageVersions: options.adapterPackageVersions,
      compositionFactory: options.compositionFactory,
      env: walletBoundaryEnv,
      healthFetch: options.healthFetch,
      migrationValidator: async () => migration,
      serverStarter: (serverOptions) => serverStarter({
        ...serverOptions,
        env: resolved.env,
      }),
    });
  } catch {
    throw failedPreflight(
      "TASK_TEMPLATE_CATALOG_STAGE_START_FAILED",
      "wallet_authentication",
      traceId,
      resolved.preflight,
    );
  }

  let initialWalletState: ReturnType<WalletAuthenticationStageRuntimeHandle["getState"]>;
  try {
    initialWalletState = walletRuntime.getState();
  } catch {
    await closeAfterFailedStart(walletRuntime, traceId, resolved.preflight);
    throw failedPreflight(
      "TASK_TEMPLATE_CATALOG_STAGE_START_FAILED",
      "wallet_authentication",
      traceId,
      resolved.preflight,
    );
  }
  if (!initialWalletState.stageReady || !initialWalletState.walletAuthentication.accepting) {
    await closeAfterFailedStart(walletRuntime, traceId, resolved.preflight);
    throw failedPreflight(
      "TASK_TEMPLATE_CATALOG_STAGE_START_FAILED",
      "wallet_authentication",
      traceId,
      resolved.preflight,
    );
  }
  resolved.preflight.push({ check: "wallet_authentication", status: "ready" });

  let lifecycle: TaskTemplateCatalogStageRuntimeState["lifecycle"] = "ready";
  let closePromise: Promise<void> | undefined;
  const getState = (): TaskTemplateCatalogStageRuntimeState => {
    let accepting = false;
    let bindingCount = 0;
    if (lifecycle === "ready") {
      try {
        const walletState = walletRuntime.getState();
        accepting = walletState.stageReady && walletState.walletAuthentication.accepting;
        bindingCount = walletState.walletAuthentication.bindingCount;
      } catch {
        accepting = false;
      }
    } else {
      try {
        bindingCount = walletRuntime.getState().walletAuthentication.bindingCount;
      } catch {
        bindingCount = initialWalletState.walletAuthentication.bindingCount;
      }
    }

    return Object.freeze({
      catalog: Object.freeze({
        enabled: true as const,
        mode: "durable" as const,
        requiredMigrationId: REQUIRED_CATALOG_MIGRATION_ID,
      }),
      environment: "stage" as const,
      lifecycle,
      preflight: Object.freeze(resolved.preflight.map((entry) => Object.freeze({ ...entry }))),
      productionReady: false as const,
      stageProductReviewReady: false as const,
      stageReady: lifecycle === "ready" && accepting,
      walletAuthentication: Object.freeze({ accepting, bindingCount }),
    });
  };
  const close = (): Promise<void> => {
    if (closePromise) {
      return closePromise;
    }
    lifecycle = "closing";
    closePromise = Promise.resolve()
      .then(() => walletRuntime.close())
      .then(
        () => {
          lifecycle = "closed";
        },
        () => {
          lifecycle = "closed";
          throw new TaskTemplateCatalogStageRuntimeError(
            "TASK_TEMPLATE_CATALOG_STAGE_SHUTDOWN_FAILED",
            traceId,
            resolved.preflight,
          );
        },
      );
    return closePromise;
  };

  return Object.freeze({ close, getState, url: walletRuntime.url });
};

export const runTaskTemplateCatalogStageRuntimeCli = async (
  options: RunTaskTemplateCatalogStageRuntimeCliOptions = {},
): Promise<TaskTemplateCatalogStageRuntimeHandle | undefined> => {
  const argv = options.argv ?? process.argv.slice(2);
  if (argv.length === 0) {
    return undefined;
  }
  if (argv.length !== 1 || (argv[0] !== "--check" && argv[0] !== "--listen")) {
    throw new TaskTemplateCatalogStageRuntimeError(
      "TASK_TEMPLATE_CATALOG_STAGE_CLI_INVALID_ARGUMENT",
    );
  }

  const runtime = await startTaskTemplateCatalogStageRuntime(options);
  const state = runtime.getState();
  const stdout = options.stdout ?? ((line: string) => process.stdout.write(`${line}\n`));
  if (argv[0] === "--check") {
    await runtime.close();
    const closedState = runtime.getState();
    if (closedState.lifecycle !== "closed" || closedState.stageReady) {
      throw new TaskTemplateCatalogStageRuntimeError(
        "TASK_TEMPLATE_CATALOG_STAGE_SHUTDOWN_FAILED",
      );
    }
    stdout(JSON.stringify({
      environment: state.environment,
      event: "task_template_catalog_stage_runtime.preflight_passed",
      migrationId: REQUIRED_CATALOG_MIGRATION_ID,
      productionReady: state.productionReady,
      resourcesDrained: true,
      stageProductReviewReady: state.stageProductReviewReady,
      status: "passed",
    }));
    return undefined;
  }
  stdout(JSON.stringify({
    apiUrl: runtime.url,
    environment: state.environment,
    event: "task_template_catalog_stage_runtime.ready",
    migrationId: REQUIRED_CATALOG_MIGRATION_ID,
    productionReady: state.productionReady,
    stageProductReviewReady: state.stageProductReviewReady,
    stageReady: state.stageReady,
    status: "ready",
  }));
  return runtime;
};

const resolveStageBoundary = (
  sourceEnv: Readonly<Record<string, string | undefined>>,
  traceId: string,
): ResolvedStageBoundary => {
  const env = { ...sourceEnv };
  const preflight: TaskTemplateCatalogStagePreflightResult[] = [];
  if (!validLoopbackBoundary(env)) {
    throw failedPreflight(
      "TASK_TEMPLATE_CATALOG_STAGE_LOOPBACK_REQUIRED",
      "loopback",
      traceId,
      preflight,
    );
  }
  preflight.push({ check: "loopback", status: "ready" });

  let database: CampaignOsCampaignDbConfig;
  try {
    database = resolveCampaignOsCampaignDbConfig({ env });
  } catch {
    throw failedPreflight(
      "TASK_TEMPLATE_CATALOG_STAGE_DATABASE_UNSAFE",
      "database",
      traceId,
      preflight,
    );
  }
  if (
    database.mode !== "postgres"
    || !safeDisposableDatabase(database.pool.connectionString, env[STAGE_DATABASE_ACK_ENV])
  ) {
    throw failedPreflight(
      "TASK_TEMPLATE_CATALOG_STAGE_DATABASE_UNSAFE",
      "database",
      traceId,
      preflight,
    );
  }
  preflight.push({ check: "database", status: "ready" });

  try {
    const catalog = resolveTaskTemplateCatalogConfig({ env });
    if (!catalog.enabled || catalog.mode !== "durable" || catalog.status !== "ready") {
      throw new Error("Catalog is disabled.");
    }
  } catch {
    throw failedPreflight(
      "TASK_TEMPLATE_CATALOG_STAGE_CATALOG_REQUIRED",
      "catalog_config",
      traceId,
      preflight,
    );
  }
  preflight.push({ check: "catalog_config", status: "ready" });

  return { database, env, preflight };
};

const validLoopbackBoundary = (
  env: Readonly<Record<string, string | undefined>>,
): boolean => {
  if (env.CAMPAIGN_OS_API_HOST?.trim() !== EXACT_API_HOST) {
    return false;
  }
  const apiPort = parsePort(env.CAMPAIGN_OS_API_PORT);
  if (apiPort === undefined) {
    return false;
  }
  try {
    const origin = new URL(env.CAMPAIGN_OS_WALLET_AUTH_ALLOWED_ORIGINS?.trim() ?? "");
    return origin.protocol === "http:"
      && origin.hostname === EXACT_API_HOST
      && origin.username === ""
      && origin.password === ""
      && origin.pathname === "/"
      && origin.search === ""
      && origin.hash === ""
      && parsePort(origin.port) !== undefined
      && Number(origin.port) !== apiPort;
  } catch {
    return false;
  }
};

const safeDisposableDatabase = (
  connectionString: string,
  acknowledgement: string | undefined,
): boolean => {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    return false;
  }
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  let databaseName: string;
  try {
    databaseName = decodeURIComponent(url.pathname.slice(1));
  } catch {
    return false;
  }
  return (url.protocol === "postgresql:" || url.protocol === "postgres:")
    && acknowledgement?.trim() === STAGE_DATABASE_ACK_VALUE
    && LOOPBACK_DATABASE_HOSTS.has(hostname)
    && (url.username === "" || SAFE_DATABASE_USERNAME_PATTERN.test(url.username))
    && url.password === ""
    && url.search === ""
    && url.hash === ""
    && DISPOSABLE_DATABASE_PATTERN.test(databaseName)
    && !PRODUCTION_DATABASE_PATTERN.test(databaseName);
};

const withoutDatabaseUsername = (
  env: Readonly<Record<string, string | undefined>>,
): Record<string, string | undefined> => {
  const databaseUrl = new URL(env.CAMPAIGN_OS_DATABASE_URL ?? "");
  databaseUrl.username = "";
  return {
    ...env,
    CAMPAIGN_OS_DATABASE_URL: databaseUrl.toString(),
  };
};

const parsePort = (value: string | undefined): number | undefined => {
  if (!value || !/^\d{1,5}$/.test(value)) {
    return undefined;
  }
  const port = Number(value);
  return Number.isSafeInteger(port) && port >= 1 && port <= 65_535 ? port : undefined;
};

const migrationReady = (migration: PostgresMigrationResult): boolean =>
  migration.mode === "validate"
  && migration.status === "ready"
  && migration.pendingMigrationIds.length === 0
  && migration.appliedMigrationIds.includes(REQUIRED_WALLET_AUTH_MIGRATION_ID)
  && migration.appliedMigrationIds.includes(REQUIRED_CATALOG_MIGRATION_ID);

const failedPreflight = (
  code: TaskTemplateCatalogStageRuntimeErrorCode,
  check: TaskTemplateCatalogStagePreflightCheck,
  traceId: string,
  completed: readonly TaskTemplateCatalogStagePreflightResult[],
): TaskTemplateCatalogStageRuntimeError => new TaskTemplateCatalogStageRuntimeError(
  code,
  traceId,
  [...completed, { check, status: "failed" }],
);

const closeAfterFailedStart = async (
  runtime: WalletAuthenticationStageRuntimeHandle,
  traceId: string,
  preflight: readonly TaskTemplateCatalogStagePreflightResult[],
): Promise<void> => {
  try {
    await runtime.close();
  } catch {
    throw new TaskTemplateCatalogStageRuntimeError(
      "TASK_TEMPLATE_CATALOG_STAGE_SHUTDOWN_FAILED",
      traceId,
      preflight,
    );
  }
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
    destroy ? new Error("PostgreSQL catalog stage migration client cleanup failed.") : undefined,
  ),
});

const createMigrationPool = (
  config: PostgresCampaignDbConfig["pool"],
): PostgresMigrationPool => {
  const pool = new pg.Pool(config);
  return {
    connect: async () => adaptPgClient(await pool.connect()),
    end: async () => pool.end(),
  };
};

const executeCatalogQuery = async (
  queryable: Pick<pg.Pool, "query"> | Pick<pg.PoolClient, "query">,
  input: PostgresTaskTemplateCatalogQueryInput,
  values: readonly unknown[] = [],
): Promise<PostgresTaskTemplateCatalogQueryResult> => {
  const result = typeof input === "string"
    ? await queryable.query(input, [...values])
    : await queryable.query({
      query_timeout: input.query_timeout,
      text: input.text,
      values: [...input.values],
    } as pg.QueryConfig);
  return { rows: result.rows as Array<Record<string, unknown>> };
};

const adaptCatalogClient = (client: pg.PoolClient): PostgresTaskTemplateCatalogClient => ({
  query: (input, values = []) => executeCatalogQuery(client, input, values),
  release: (destroy = false) => client.release(
    destroy ? new Error("PostgreSQL catalog stage validation client cleanup failed.") : undefined,
  ),
});

const createCatalogPool = (
  config: PostgresCampaignDbConfig["pool"],
): PostgresTaskTemplateCatalogPool => {
  const pool = new pg.Pool(config);
  return {
    connect: async () => adaptCatalogClient(await pool.connect()),
    end: async () => pool.end(),
    query: (input, values = []) => executeCatalogQuery(pool, input, values),
  };
};

const validateStageCatalog: TaskTemplateCatalogStageCatalogValidator = async ({
  database,
  traceId,
}) => {
  if (database.mode !== "postgres") {
    throw new TaskTemplateCatalogStageRuntimeError(
      "TASK_TEMPLATE_CATALOG_STAGE_CATALOG_NOT_READY",
      traceId,
    );
  }
  const store = createPostgresTaskTemplateCatalogStore({
    cursorSigningKey: randomBytes(32),
    ownsPool: true,
    pool: createCatalogPool(database.pool),
  });
  try {
    const page = await store.list(
      { limit: 100, statuses: ["active"] },
      { traceId },
    );
    const expected = taskTemplateCatalogManifestV1.map((template) =>
      `${template.templateCode}@${template.version}:${template.checksum}:${template.status}`
    ).sort();
    const actual = page.items.map((template) =>
      `${template.templateCode}@${template.version}:${template.checksum}:${template.status}`
    ).sort();
    if (
      page.totalActive !== expected.length
      || page.page.nextCursor !== null
      || actual.length !== expected.length
      || actual.some((fingerprint, index) => fingerprint !== expected[index])
    ) {
      throw new TaskTemplateCatalogStageRuntimeError(
        "TASK_TEMPLATE_CATALOG_STAGE_CATALOG_NOT_READY",
        traceId,
      );
    }
  } finally {
    await store.close({ traceId });
  }
};

const validateStageMigrations = async ({
  database,
  traceId,
}: ValidateWalletAuthenticationStageMigrationsInput): Promise<PostgresMigrationResult> => {
  const pool = createMigrationPool(database.pool);
  let result: PostgresMigrationResult | undefined;
  let failed = false;
  try {
    result = await runPostgresMigrations({
      migrations: await loadPostgresMigrations(undefined, traceId),
      mode: "validate",
      pool,
      traceId,
    });
  } catch {
    failed = true;
  }
  try {
    await pool.end();
  } catch {
    failed = true;
  }
  if (failed || !result) {
    throw new TaskTemplateCatalogStageRuntimeError(
      "TASK_TEMPLATE_CATALOG_STAGE_MIGRATION_NOT_READY",
      traceId,
    );
  }
  return result;
};

const STAGE_RUNTIME_ENTRY_PATH = resolve(
  process.cwd(),
  "src/server/taskTemplateCatalogStageRuntime.ts",
);

export const isTaskTemplateCatalogStageRuntimeDirectExecution = (
  entryPath = process.argv[1],
): boolean => typeof entryPath === "string" && resolve(entryPath) === STAGE_RUNTIME_ENTRY_PATH;

if (isTaskTemplateCatalogStageRuntimeDirectExecution()) {
  runTaskTemplateCatalogStageRuntimeCli().then((runtime) => {
    if (!runtime) {
      return;
    }
    const stop = () => {
      runtime.close().catch((error: unknown) => {
        const failure = error instanceof TaskTemplateCatalogStageRuntimeError
          ? error
          : new TaskTemplateCatalogStageRuntimeError(
            "TASK_TEMPLATE_CATALOG_STAGE_SHUTDOWN_FAILED",
          );
        process.stderr.write(`${JSON.stringify({
          code: failure.code,
          preflight: failure.preflight,
          status: "failed",
          traceId: failure.traceId,
        })}\n`);
        process.exitCode = 1;
      });
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
  }).catch((error: unknown) => {
    const failure = error instanceof TaskTemplateCatalogStageRuntimeError
      ? error
      : new TaskTemplateCatalogStageRuntimeError("TASK_TEMPLATE_CATALOG_STAGE_START_FAILED");
    process.stderr.write(`${JSON.stringify({
      code: failure.code,
      preflight: failure.preflight,
      status: "failed",
      traceId: failure.traceId,
    })}\n`);
    process.exitCode = 1;
  });
}
