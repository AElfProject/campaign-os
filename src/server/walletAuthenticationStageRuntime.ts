import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import pg from "pg";
import packageJson from "../../package.json";
import {
  resolveCampaignOsCampaignDbConfig,
  resolveCampaignOsWalletAuthenticationConfig,
  type CampaignOsCampaignDbConfig,
  type WalletAuthenticationConfig,
} from "./config";
import {
  loadPostgresMigrations,
  runPostgresMigrations,
  type PostgresMigrationClient,
  type PostgresMigrationPool,
  type PostgresMigrationQueryResult,
  type PostgresMigrationResult,
} from "./postgresMigration";
import {
  startCampaignOsApiServer,
  type CampaignOsApiServerHandle,
  type StartCampaignOsApiServerOptions,
} from "./server";
import {
  createDefaultWalletAuthenticationServerComposition,
  type WalletAuthenticationLiveAuthorityRuntime,
  type WalletAuthenticationServerComposition,
  type WalletAuthenticationServerCompositionFactory,
} from "./walletAuthenticationServerComposition";

export type WalletAuthenticationStageRuntimeErrorCode =
  | "WALLET_AUTH_STAGE_ADAPTER_PACKAGE_INVALID"
  | "WALLET_AUTH_STAGE_API_HOST_INVALID"
  | "WALLET_AUTH_STAGE_API_PORT_INVALID"
  | "WALLET_AUTH_STAGE_AUTH_CONFIG_INVALID"
  | "WALLET_AUTH_STAGE_BINDING_REQUIRED"
  | "WALLET_AUTH_STAGE_CA_ENDPOINT_INVALID"
  | "WALLET_AUTH_STAGE_CLI_INVALID_ARGUMENT"
  | "WALLET_AUTH_STAGE_COMPOSITION_UNAVAILABLE"
  | "WALLET_AUTH_STAGE_DATABASE_REQUIRED"
  | "WALLET_AUTH_STAGE_DATABASE_UNSAFE"
  | "WALLET_AUTH_STAGE_HEALTH_CHECK_FAILED"
  | "WALLET_AUTH_STAGE_MIGRATION_NOT_READY"
  | "WALLET_AUTH_STAGE_ORIGIN_INVALID"
  | "WALLET_AUTH_STAGE_PORT_COLLISION"
  | "WALLET_AUTH_STAGE_RUNTIME_NOT_ACCEPTING"
  | "WALLET_AUTH_STAGE_SERVER_START_FAILED"
  | "WALLET_AUTH_STAGE_SHUTDOWN_FAILED";

export type WalletAuthenticationStagePreflightCheck =
  | "adapter_packages"
  | "api_host"
  | "api_port"
  | "auth_config"
  | "binding"
  | "ca_endpoint"
  | "database"
  | "migration"
  | "origin"
  | "ports";

export interface WalletAuthenticationStagePreflightResult {
  readonly check: WalletAuthenticationStagePreflightCheck;
  readonly status: "failed" | "ready";
}

const ERROR_MESSAGES: Readonly<Record<WalletAuthenticationStageRuntimeErrorCode, string>> =
  Object.freeze({
    WALLET_AUTH_STAGE_ADAPTER_PACKAGE_INVALID:
      "Wallet authentication stage adapter package validation failed.",
    WALLET_AUTH_STAGE_API_HOST_INVALID:
      "Wallet authentication stage requires the exact loopback API host.",
    WALLET_AUTH_STAGE_API_PORT_INVALID:
      "Wallet authentication stage requires a valid API port.",
    WALLET_AUTH_STAGE_AUTH_CONFIG_INVALID:
      "Wallet authentication stage configuration is invalid.",
    WALLET_AUTH_STAGE_BINDING_REQUIRED:
      "Wallet authentication stage requires an enabled EOA or AA binding.",
    WALLET_AUTH_STAGE_CA_ENDPOINT_INVALID:
      "Wallet authentication stage requires an exact loopback CA endpoint for AA.",
    WALLET_AUTH_STAGE_CLI_INVALID_ARGUMENT:
      "Wallet authentication stage CLI arguments are invalid.",
    WALLET_AUTH_STAGE_COMPOSITION_UNAVAILABLE:
      "Wallet authentication stage composition is unavailable.",
    WALLET_AUTH_STAGE_DATABASE_REQUIRED:
      "Wallet authentication stage requires PostgreSQL persistence.",
    WALLET_AUTH_STAGE_DATABASE_UNSAFE:
      "Wallet authentication stage requires an acknowledged disposable database.",
    WALLET_AUTH_STAGE_HEALTH_CHECK_FAILED:
      "Wallet authentication stage health check failed.",
    WALLET_AUTH_STAGE_MIGRATION_NOT_READY:
      "Wallet authentication stage migration validation failed.",
    WALLET_AUTH_STAGE_ORIGIN_INVALID:
      "Wallet authentication stage requires one exact loopback Origin.",
    WALLET_AUTH_STAGE_PORT_COLLISION:
      "Wallet authentication stage API, UI, and CA ports must be independent.",
    WALLET_AUTH_STAGE_RUNTIME_NOT_ACCEPTING:
      "Wallet authentication stage runtime is not accepting work.",
    WALLET_AUTH_STAGE_SERVER_START_FAILED:
      "Wallet authentication stage API server failed to start.",
    WALLET_AUTH_STAGE_SHUTDOWN_FAILED:
      "Wallet authentication stage failed to shut down within its bound.",
  });

const SAFE_TRACE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const UNSAFE_TRACE_ID_PATTERN =
  /(?:authorization|bearer|credential|password|private|raw[_-]?signature|secret|token)/i;
const EXACT_API_HOST = "127.0.0.1";
const REQUIRED_MIGRATION_ID = "0005_participant_wallet_authentication";
const STAGE_DATABASE_ACK_ENV = "CAMPAIGN_OS_STAGE_DISPOSABLE_DATABASE_ACK";
const STAGE_DATABASE_ACK_VALUE = "disposable-stage-approved";
const HEALTH_TIMEOUT_MS = 5_000;
const APPROVED_ADAPTER_PACKAGE_VERSION = "0.4.0-alpha.21";
const REQUIRED_ADAPTER_PACKAGES = Object.freeze([
  "@aelf-web-login/wallet-adapter-base",
  "@aelf-web-login/wallet-adapter-night-elf",
  "@aelf-web-login/wallet-adapter-portkey-discover",
] as const);
const LOOPBACK_DATABASE_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);
const DISPOSABLE_DATABASE_PATTERN = /(?:^|[_-])(?:disposable|stage|test)(?:[_-]|$)/i;
const PRODUCTION_DATABASE_PATTERN = /(?:^|[_-])(?:live|prod|production)(?:[_-]|$)/i;

type PostgresCampaignDbConfig = Extract<CampaignOsCampaignDbConfig, { mode: "postgres" }>;

export interface ValidateWalletAuthenticationStageMigrationsInput {
  readonly database: PostgresCampaignDbConfig;
  readonly mode: "validate";
  readonly traceId: string;
}

export type WalletAuthenticationStageMigrationValidator = (
  input: ValidateWalletAuthenticationStageMigrationsInput,
) => Promise<PostgresMigrationResult>;

export interface StartWalletAuthenticationStageRuntimeOptions {
  readonly adapterPackageVersions?: Readonly<Record<string, string | undefined>>;
  readonly compositionFactory?: WalletAuthenticationServerCompositionFactory;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly healthFetch?: typeof fetch;
  readonly migrationValidator?: WalletAuthenticationStageMigrationValidator;
  readonly serverStarter?: (
    options: StartCampaignOsApiServerOptions,
  ) => Promise<CampaignOsApiServerHandle>;
}

export interface RunWalletAuthenticationStageRuntimeCliOptions
  extends StartWalletAuthenticationStageRuntimeOptions {
  readonly argv?: readonly string[];
  readonly stdout?: (line: string) => void;
}

export interface WalletAuthenticationStageRuntimeState {
  readonly environment: "stage";
  readonly lifecycle: "ready" | "closing" | "closed";
  readonly migration: Readonly<{
    appliedRequiredMigration: true;
    pendingCount: 0;
    status: "ready";
  }>;
  readonly preflight: readonly WalletAuthenticationStagePreflightResult[];
  readonly productionReady: false;
  readonly stageReady: boolean;
  readonly walletAuthentication: Readonly<{
    accepting: boolean;
    bindingCount: number;
  }>;
}

export interface WalletAuthenticationStageRuntimeHandle {
  readonly url: string;
  close(): Promise<void>;
  getState(): WalletAuthenticationStageRuntimeState;
}

interface ResolvedStageConfig {
  readonly apiPort: number;
  readonly authConfig: WalletAuthenticationConfig;
  readonly database: PostgresCampaignDbConfig;
  readonly enabledBindingCount: number;
  readonly env: Record<string, string | undefined>;
  readonly preflight: WalletAuthenticationStagePreflightResult[];
  readonly shutdownTimeoutMs: number;
}

export class WalletAuthenticationStageRuntimeError extends Error {
  readonly code: WalletAuthenticationStageRuntimeErrorCode;
  readonly preflight: readonly WalletAuthenticationStagePreflightResult[];
  readonly traceId: string;

  constructor(
    code: WalletAuthenticationStageRuntimeErrorCode,
    traceId: string = randomUUID(),
    preflight: readonly WalletAuthenticationStagePreflightResult[] = [],
  ) {
    super(ERROR_MESSAGES[code]);
    this.name = "WalletAuthenticationStageRuntimeError";
    this.code = code;
    this.preflight = Object.freeze(preflight.map((entry) => Object.freeze({ ...entry })));
    this.traceId = safeTraceId(traceId);
    delete this.stack;
  }
}

export const startWalletAuthenticationStageRuntime = async (
  options: StartWalletAuthenticationStageRuntimeOptions = {},
): Promise<WalletAuthenticationStageRuntimeHandle> => {
  const traceId = randomUUID();
  const resolved = resolveStageConfig(
    options.env ?? process.env,
    options.adapterPackageVersions ?? packageJson.dependencies,
    traceId,
  );
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
      "WALLET_AUTH_STAGE_MIGRATION_NOT_READY",
      "migration",
      traceId,
      resolved.preflight,
    );
  }
  if (
    migration.mode !== "validate"
    || migration.status !== "ready"
    || migration.pendingMigrationIds.length !== 0
    || !migration.appliedMigrationIds.includes(REQUIRED_MIGRATION_ID)
  ) {
    throw failedPreflight(
      "WALLET_AUTH_STAGE_MIGRATION_NOT_READY",
      "migration",
      traceId,
      resolved.preflight,
    );
  }
  resolved.preflight.push({ check: "migration", status: "ready" });

  const compositionFactory = options.compositionFactory
    ?? createDefaultWalletAuthenticationServerComposition;
  const serverStarter = options.serverStarter ?? startCampaignOsApiServer;
  let capturedComposition: WalletAuthenticationServerComposition | undefined;
  const captureComposition: WalletAuthenticationServerCompositionFactory = async (input) => {
    if (capturedComposition) {
      throw new WalletAuthenticationStageRuntimeError(
        "WALLET_AUTH_STAGE_COMPOSITION_UNAVAILABLE",
        traceId,
        resolved.preflight,
      );
    }
    const candidate = await compositionFactory(input);
    if (validComposition(candidate)) {
      capturedComposition = candidate;
    }
    return candidate;
  };

  let server: CampaignOsApiServerHandle | undefined;
  try {
    server = await serverStarter({
      env: resolved.env,
      host: EXACT_API_HOST,
      logger: false,
      port: resolved.apiPort,
      profileId: "staging-scaffold",
      shutdownTimeoutMs: resolved.shutdownTimeoutMs,
      walletAuthenticationAllowedOrigins: resolved.authConfig.allowedOrigins,
      walletAuthenticationCompositionFactory: captureComposition,
    });
  } catch {
    const clean = capturedComposition
      ? await stopDetachedComposition(
        capturedComposition.runtime,
        resolved.shutdownTimeoutMs,
        traceId,
      )
      : true;
    if (!clean) {
      throw new WalletAuthenticationStageRuntimeError(
        "WALLET_AUTH_STAGE_SHUTDOWN_FAILED",
        traceId,
        resolved.preflight,
      );
    }
    throw new WalletAuthenticationStageRuntimeError(
      "WALLET_AUTH_STAGE_SERVER_START_FAILED",
      traceId,
      resolved.preflight,
    );
  }

  const failAfterServerStart = async (
    code: WalletAuthenticationStageRuntimeErrorCode,
  ): Promise<never> => {
    if (!await stopServerWithin(server!, resolved.shutdownTimeoutMs)) {
      throw new WalletAuthenticationStageRuntimeError(
        "WALLET_AUTH_STAGE_SHUTDOWN_FAILED",
        traceId,
        resolved.preflight,
      );
    }
    throw new WalletAuthenticationStageRuntimeError(code, traceId, resolved.preflight);
  };

  if (!capturedComposition) {
    return failAfterServerStart("WALLET_AUTH_STAGE_COMPOSITION_UNAVAILABLE");
  }
  if (!runtimeAccepting(capturedComposition.runtime)) {
    return failAfterServerStart("WALLET_AUTH_STAGE_RUNTIME_NOT_ACCEPTING");
  }
  if (!isExpectedServerUrl(server.url, resolved.apiPort)) {
    return failAfterServerStart("WALLET_AUTH_STAGE_SERVER_START_FAILED");
  }
  try {
    await assertHealthy(server, options.healthFetch ?? globalThis.fetch);
  } catch {
    return failAfterServerStart("WALLET_AUTH_STAGE_HEALTH_CHECK_FAILED");
  }
  if (!runtimeAccepting(capturedComposition.runtime)) {
    return failAfterServerStart("WALLET_AUTH_STAGE_RUNTIME_NOT_ACCEPTING");
  }

  const ownedComposition = capturedComposition;
  let lifecycle: WalletAuthenticationStageRuntimeState["lifecycle"] = "ready";
  let closePromise: Promise<void> | undefined;
  const getState = (): WalletAuthenticationStageRuntimeState => {
    const accepting = lifecycle === "ready" && runtimeAccepting(ownedComposition.runtime);
    return Object.freeze({
      environment: "stage" as const,
      lifecycle,
      migration: Object.freeze({
        appliedRequiredMigration: true as const,
        pendingCount: 0 as const,
        status: "ready" as const,
      }),
      preflight: Object.freeze(resolved.preflight.map((entry) => Object.freeze({ ...entry }))),
      productionReady: false as const,
      stageReady: accepting,
      walletAuthentication: Object.freeze({
        accepting,
        bindingCount: resolved.enabledBindingCount,
      }),
    });
  };
  const close = (): Promise<void> => {
    if (closePromise) {
      return closePromise;
    }
    lifecycle = "closing";
    closePromise = stopServerWithin(server!, resolved.shutdownTimeoutMs).then((clean) => {
      lifecycle = "closed";
      if (!clean) {
        throw new WalletAuthenticationStageRuntimeError(
          "WALLET_AUTH_STAGE_SHUTDOWN_FAILED",
          traceId,
          resolved.preflight,
        );
      }
    });
    return closePromise;
  };

  return Object.freeze({ close, getState, url: server.url });
};

export const runWalletAuthenticationStageRuntimeCli = async (
  options: RunWalletAuthenticationStageRuntimeCliOptions = {},
): Promise<WalletAuthenticationStageRuntimeHandle | undefined> => {
  const argv = options.argv ?? process.argv.slice(2);
  if (argv.length === 0) {
    return undefined;
  }
  if (argv.length !== 1 || argv[0] !== "--listen") {
    throw new WalletAuthenticationStageRuntimeError("WALLET_AUTH_STAGE_CLI_INVALID_ARGUMENT");
  }

  const runtime = await startWalletAuthenticationStageRuntime(options);
  const state = runtime.getState();
  const stdout = options.stdout ?? ((line: string) => process.stdout.write(`${line}\n`));
  stdout(JSON.stringify({
    apiUrl: runtime.url,
    bindingCount: state.walletAuthentication.bindingCount,
    environment: state.environment,
    event: "wallet_authentication_stage_runtime.ready",
    migrationId: REQUIRED_MIGRATION_ID,
    productionReady: state.productionReady,
    stageReady: state.stageReady,
    status: "ready",
  }));
  return runtime;
};

function resolveStageConfig(
  sourceEnv: Readonly<Record<string, string | undefined>>,
  adapterPackageVersions: Readonly<Record<string, string | undefined>>,
  traceId: string,
): ResolvedStageConfig {
  const env = { ...sourceEnv };
  const preflight: WalletAuthenticationStagePreflightResult[] = [];
  if (env.CAMPAIGN_OS_API_HOST?.trim() !== EXACT_API_HOST) {
    throw failedPreflight(
      "WALLET_AUTH_STAGE_API_HOST_INVALID",
      "api_host",
      traceId,
      preflight,
    );
  }
  const apiPort = parsePort(env.CAMPAIGN_OS_API_PORT);
  if (apiPort === undefined) {
    throw failedPreflight(
      "WALLET_AUTH_STAGE_API_PORT_INVALID",
      "api_port",
      traceId,
      preflight,
    );
  }
  preflight.push({ check: "api_host", status: "ready" });
  preflight.push({ check: "api_port", status: "ready" });

  let database: CampaignOsCampaignDbConfig;
  try {
    database = resolveCampaignOsCampaignDbConfig({ env });
  } catch {
    throw failedPreflight(
      "WALLET_AUTH_STAGE_DATABASE_REQUIRED",
      "database",
      traceId,
      preflight,
    );
  }
  if (database.mode !== "postgres") {
    throw failedPreflight(
      "WALLET_AUTH_STAGE_DATABASE_REQUIRED",
      "database",
      traceId,
      preflight,
    );
  }
  if (!safeDisposableDatabase(database.pool.connectionString, env[STAGE_DATABASE_ACK_ENV])) {
    throw failedPreflight(
      "WALLET_AUTH_STAGE_DATABASE_UNSAFE",
      "database",
      traceId,
      preflight,
    );
  }
  preflight.push({ check: "database", status: "ready" });

  const authConfig = resolveCampaignOsWalletAuthenticationConfig({ env, traceId });
  if (authConfig.status === "invalid" && authConfig.diagnostics.some(
    ({ code, field }) => code.includes("CA_PROVIDER") || field.includes("caRelationProviders"),
  )) {
    throw failedPreflight(
      "WALLET_AUTH_STAGE_CA_ENDPOINT_INVALID",
      "ca_endpoint",
      traceId,
      preflight,
    );
  }
  if (!validAuthPosture(authConfig, env)) {
    throw failedPreflight(
      "WALLET_AUTH_STAGE_AUTH_CONFIG_INVALID",
      "auth_config",
      traceId,
      preflight,
    );
  }
  preflight.push({ check: "auth_config", status: "ready" });

  const origin = exactLoopbackOrigin(authConfig.allowedOrigins);
  if (!origin) {
    throw failedPreflight(
      "WALLET_AUTH_STAGE_ORIGIN_INVALID",
      "origin",
      traceId,
      preflight,
    );
  }
  preflight.push({ check: "origin", status: "ready" });

  if (!approvedAdapterPackages(adapterPackageVersions)) {
    throw failedPreflight(
      "WALLET_AUTH_STAGE_ADAPTER_PACKAGE_INVALID",
      "adapter_packages",
      traceId,
      preflight,
    );
  }
  preflight.push({ check: "adapter_packages", status: "ready" });

  const enabledBindings = authConfig.bindings.filter(({ enabled }) => enabled);
  if (
    enabledBindings.length === 0
    || !enabledBindings.some(({ accountType }) => accountType === "EOA" || accountType === "AA")
  ) {
    throw failedPreflight(
      "WALLET_AUTH_STAGE_BINDING_REQUIRED",
      "binding",
      traceId,
      preflight,
    );
  }
  preflight.push({ check: "binding", status: "ready" });

  const occupiedPorts = new Set([apiPort, Number(origin.port)]);
  if (occupiedPorts.size !== 2) {
    throw failedPreflight(
      "WALLET_AUTH_STAGE_PORT_COLLISION",
      "ports",
      traceId,
      preflight,
    );
  }
  const providerById = new Map(
    authConfig.caRelationProviders.map((provider) => [provider.id, provider]),
  );
  for (const binding of enabledBindings.filter(({ accountType }) => accountType === "AA")) {
    const provider = binding.caRelationProviderId
      ? providerById.get(binding.caRelationProviderId)
      : undefined;
    const endpoint = provider ? exactLoopbackCaEndpoint(env[provider.endpointEnvKey]) : undefined;
    if (!provider?.enabled || !endpoint) {
      throw failedPreflight(
        "WALLET_AUTH_STAGE_CA_ENDPOINT_INVALID",
        "ca_endpoint",
        traceId,
        preflight,
      );
    }
    const port = Number(endpoint.port);
    if (occupiedPorts.has(port)) {
      throw failedPreflight(
        "WALLET_AUTH_STAGE_PORT_COLLISION",
        "ports",
        traceId,
        preflight,
      );
    }
    occupiedPorts.add(port);
  }
  preflight.push({ check: "ca_endpoint", status: "ready" });
  preflight.push({ check: "ports", status: "ready" });

  return {
    apiPort,
    authConfig,
    database,
    enabledBindingCount: enabledBindings.length,
    env,
    preflight,
    shutdownTimeoutMs: authConfig.limits.shutdownTimeoutMs,
  };
}

function failedPreflight(
  code: WalletAuthenticationStageRuntimeErrorCode,
  check: WalletAuthenticationStagePreflightCheck,
  traceId: string,
  completed: readonly WalletAuthenticationStagePreflightResult[],
): WalletAuthenticationStageRuntimeError {
  return new WalletAuthenticationStageRuntimeError(code, traceId, [
    ...completed,
    { check, status: "failed" },
  ]);
}

function safeTraceId(candidate: string | undefined): string {
  return candidate
    && SAFE_TRACE_ID_PATTERN.test(candidate)
    && !UNSAFE_TRACE_ID_PATTERN.test(candidate)
    ? candidate
    : randomUUID();
}

function parsePort(value: string | undefined): number | undefined {
  if (!value || !/^\d{1,5}$/.test(value)) {
    return undefined;
  }
  const port = Number(value);
  return Number.isSafeInteger(port) && port >= 1 && port <= 65_535 ? port : undefined;
}

function safeDisposableDatabase(
  connectionString: string,
  acknowledgement: string | undefined,
): boolean {
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
  return acknowledgement?.trim() === STAGE_DATABASE_ACK_VALUE
    && LOOPBACK_DATABASE_HOSTS.has(hostname)
    && url.username === ""
    && url.password === ""
    && url.search === ""
    && url.hash === ""
    && DISPOSABLE_DATABASE_PATTERN.test(databaseName)
    && !PRODUCTION_DATABASE_PATTERN.test(databaseName);
}

function validAuthPosture(
  config: WalletAuthenticationConfig,
  env: Readonly<Record<string, string | undefined>>,
): boolean {
  const csrf = env.CAMPAIGN_OS_WALLET_AUTH_CSRF_SECRET;
  const csrfBytes = typeof csrf === "string" ? Buffer.byteLength(csrf, "utf8") : 0;
  const insecureCookieAllowed = env.CAMPAIGN_OS_WALLET_AUTH_ALLOW_INSECURE_LOOPBACK_COOKIE === "1"
    || env.CAMPAIGN_OS_WALLET_AUTH_ALLOW_INSECURE_LOOPBACK_COOKIE === "true";
  return config.status === "ready"
    && config.valid
    && config.enabled
    && config.environment === "stage"
    && config.storeMode === "postgres"
    && config.productionReady === false
    && config.cookie.httpOnly
    && config.cookie.path === "/"
    && (config.cookie.sameSite === "lax" || config.cookie.sameSite === "strict")
    && (config.cookie.secure || insecureCookieAllowed)
    && csrfBytes >= 32
    && csrfBytes <= 4_096;
}

function exactLoopbackOrigin(origins: readonly string[]): URL | undefined {
  if (origins.length !== 1) {
    return undefined;
  }
  try {
    const origin = new URL(origins[0]!);
    return origin.protocol === "http:"
      && origin.hostname === EXACT_API_HOST
      && origin.username === ""
      && origin.password === ""
      && origin.pathname === "/"
      && origin.search === ""
      && origin.hash === ""
      && parsePort(origin.port) !== undefined
      ? origin
      : undefined;
  } catch {
    return undefined;
  }
}

function exactLoopbackCaEndpoint(value: string | undefined): URL | undefined {
  try {
    const endpoint = new URL(value ?? "");
    return endpoint.protocol === "http:"
      && endpoint.hostname === EXACT_API_HOST
      && endpoint.username === ""
      && endpoint.password === ""
      && endpoint.search === ""
      && endpoint.hash === ""
      && parsePort(endpoint.port) !== undefined
      ? endpoint
      : undefined;
  } catch {
    return undefined;
  }
}

function approvedAdapterPackages(
  versions: Readonly<Record<string, string | undefined>>,
): boolean {
  return REQUIRED_ADAPTER_PACKAGES.every(
    (packageName) => versions[packageName] === APPROVED_ADAPTER_PACKAGE_VERSION,
  );
}

function validComposition(value: unknown): value is WalletAuthenticationServerComposition {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<WalletAuthenticationServerComposition>;
  return Boolean(candidate.httpController)
    && typeof candidate.httpController?.handle === "function"
    && Boolean(candidate.runtime)
    && typeof candidate.runtime?.resolveAuthorization === "function"
    && typeof candidate.runtime?.revalidateFenceBeforeWrite === "function"
    && typeof candidate.runtime?.state === "function"
    && typeof candidate.runtime?.stop === "function";
}

function runtimeAccepting(runtime: WalletAuthenticationLiveAuthorityRuntime): boolean {
  try {
    return runtime.state().accepting === true;
  } catch {
    return false;
  }
}

function isExpectedServerUrl(value: string, port: number): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:"
      && url.hostname === EXACT_API_HOST
      && Number(url.port) === port
      && url.username === ""
      && url.password === ""
      && url.pathname === "/"
      && url.search === ""
      && url.hash === "";
  } catch {
    return false;
  }
}

async function assertHealthy(
  server: CampaignOsApiServerHandle,
  healthFetch: typeof fetch,
): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    const response = await healthFetch(`${server.url}/api/health`, {
      headers: { "x-campaign-os-trace-id": randomUUID() },
      signal: controller.signal,
    });
    const body = await response.json().catch(() => undefined) as { ok?: unknown } | undefined;
    if (!response.ok || body?.ok !== true) {
      throw new Error("Health response was not ready.");
    }
  } finally {
    clearTimeout(timer);
  }
}

type Settlement = "fulfilled" | "rejected" | "timeout";

async function settleWithin(operation: Promise<unknown>, timeoutMs: number): Promise<Settlement> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation.then(() => "fulfilled" as const, () => "rejected" as const),
      new Promise<"timeout">((resolveTimeout) => {
        timer = setTimeout(() => resolveTimeout("timeout"), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

async function stopServerWithin(
  server: CampaignOsApiServerHandle,
  timeoutMs: number,
): Promise<boolean> {
  try {
    return await settleWithin(Promise.resolve().then(() => server.stop()), timeoutMs)
      === "fulfilled";
  } catch {
    return false;
  }
}

async function stopDetachedComposition(
  runtime: WalletAuthenticationLiveAuthorityRuntime,
  timeoutMs: number,
  traceId: string,
): Promise<boolean> {
  try {
    return await settleWithin(
      Promise.resolve().then(() => runtime.stop(traceId)).then((result) => {
        if (result.status !== "drained") {
          throw new Error("Runtime did not drain.");
        }
      }),
      timeoutMs,
    ) === "fulfilled";
  } catch {
    return false;
  }
}

function adaptPgClient(client: pg.PoolClient): PostgresMigrationClient {
  return {
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
  };
}

function createMigrationPool(config: PostgresCampaignDbConfig["pool"]): PostgresMigrationPool {
  const pool = new pg.Pool(config);
  return {
    connect: async () => adaptPgClient(await pool.connect()),
    end: async () => pool.end(),
  };
}

async function validateStageMigrations({
  database,
  traceId,
}: ValidateWalletAuthenticationStageMigrationsInput): Promise<PostgresMigrationResult> {
  const migrations = await loadPostgresMigrations(undefined, traceId);
  const pool = createMigrationPool(database.pool);
  let result: PostgresMigrationResult | undefined;
  let failed = false;
  try {
    result = await runPostgresMigrations({
      migrations,
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
    throw new WalletAuthenticationStageRuntimeError(
      "WALLET_AUTH_STAGE_MIGRATION_NOT_READY",
      traceId,
    );
  }
  return result;
}

const STAGE_RUNTIME_ENTRY_PATH = resolve(
  process.cwd(),
  "src/server/walletAuthenticationStageRuntime.ts",
);

export const isWalletAuthenticationStageRuntimeDirectExecution = (
  entryPath = process.argv[1],
): boolean => typeof entryPath === "string" && resolve(entryPath) === STAGE_RUNTIME_ENTRY_PATH;

if (isWalletAuthenticationStageRuntimeDirectExecution()) {
  runWalletAuthenticationStageRuntimeCli().then((runtime) => {
    if (!runtime) {
      return;
    }
    const stop = () => {
      runtime.close().catch((error: unknown) => {
        const failure = error instanceof WalletAuthenticationStageRuntimeError
          ? error
          : new WalletAuthenticationStageRuntimeError("WALLET_AUTH_STAGE_SHUTDOWN_FAILED");
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
    const failure = error instanceof WalletAuthenticationStageRuntimeError
      ? error
      : new WalletAuthenticationStageRuntimeError("WALLET_AUTH_STAGE_SERVER_START_FAILED");
    process.stderr.write(`${JSON.stringify({
      code: failure.code,
      preflight: failure.preflight,
      status: "failed",
      traceId: failure.traceId,
    })}\n`);
    process.exitCode = 1;
  });
}
