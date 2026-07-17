import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import {
  createCampaignOsApiRuntime,
  type CampaignOsApiRuntime,
  type CreateCampaignOsApiRuntimeOptions,
  type TaskVerificationRuleResolver,
} from "./apiRuntime";
import {
  resolveCampaignOsCampaignDbConfig,
  resolveCampaignOsParticipantPreviewConfig,
} from "./config";
import {
  createProviderHttpExecutionMaterialResolver,
  type ProviderHttpExecutionMaterialResolver,
} from "./providerHttpExecutionMaterial";
import {
  createProviderHttpFetchTransport,
  type ProviderHttpFetchTransport,
} from "./providerHttpFetchTransport";
import type { ProviderHttpRequestPlan } from "./providerHttpRequestPlanner";
import {
  createProviderHttpRuntimeSummary,
  providerHttpEndpointRegistry,
  providerHttpRuntimeProductionPreconditions,
} from "./providerHttpRuntimeRegistry";
import type { ProviderHttpRuntimeSummary } from "./providerHttpRuntimeTypes";
import {
  startCampaignOsApiServer,
  type CampaignOsApiServerHandle,
  type StartCampaignOsApiServerOptions,
} from "./server";
import {
  resolveTaskVerificationConfig,
  type TaskVerificationBinding,
  type TaskVerificationConfig,
} from "./taskVerificationConfig";

export type ProviderVerificationStageRuntimeErrorCode =
  | "PROVIDER_STAGE_API_HOST_INVALID"
  | "PROVIDER_STAGE_BINDINGS_REQUIRED"
  | "PROVIDER_STAGE_CLI_INVALID_ARGUMENT"
  | "PROVIDER_STAGE_DATABASE_REQUIRED"
  | "PROVIDER_STAGE_DATABASE_UNSAFE"
  | "PROVIDER_STAGE_ENDPOINT_INVALID"
  | "PROVIDER_STAGE_ENDPOINT_KEY_INVALID"
  | "PROVIDER_STAGE_HEALTH_CHECK_FAILED"
  | "PROVIDER_STAGE_PREVIEW_REQUIRED"
  | "PROVIDER_STAGE_SERVER_START_FAILED"
  | "PROVIDER_STAGE_SHUTDOWN_FAILED"
  | "PROVIDER_STAGE_STATIC_MATERIAL_FORBIDDEN"
  | "PROVIDER_STAGE_VERIFICATION_CONFIG_INVALID";

const ERROR_MESSAGES: Readonly<Record<ProviderVerificationStageRuntimeErrorCode, string>> =
  Object.freeze({
    PROVIDER_STAGE_API_HOST_INVALID:
      "Provider verification stage runtime requires a loopback API host.",
    PROVIDER_STAGE_BINDINGS_REQUIRED:
      "Provider verification stage runtime requires live ON_CHAIN and DAPP_API bindings.",
    PROVIDER_STAGE_CLI_INVALID_ARGUMENT:
      "Provider verification stage runtime CLI arguments are invalid.",
    PROVIDER_STAGE_DATABASE_REQUIRED:
      "Provider verification stage runtime requires PostgreSQL persistence.",
    PROVIDER_STAGE_DATABASE_UNSAFE:
      "Provider verification stage runtime requires an acknowledged disposable loopback database.",
    PROVIDER_STAGE_ENDPOINT_INVALID:
      "Provider verification stage runtime requires an HTTP loopback provider endpoint.",
    PROVIDER_STAGE_ENDPOINT_KEY_INVALID:
      "Provider verification stage runtime requires the dedicated stage provider endpoint key.",
    PROVIDER_STAGE_HEALTH_CHECK_FAILED:
      "Provider verification stage runtime health check failed.",
    PROVIDER_STAGE_PREVIEW_REQUIRED:
      "Provider verification stage runtime requires standalone all-draft preview.",
    PROVIDER_STAGE_SERVER_START_FAILED:
      "Provider verification stage runtime failed to start.",
    PROVIDER_STAGE_SHUTDOWN_FAILED:
      "Provider verification stage runtime failed to shut down cleanly.",
    PROVIDER_STAGE_STATIC_MATERIAL_FORBIDDEN:
      "Provider verification stage runtime forbids static provider material.",
    PROVIDER_STAGE_VERIFICATION_CONFIG_INVALID:
      "Provider verification stage runtime configuration is invalid.",
  });

export class ProviderVerificationStageRuntimeError extends Error {
  readonly code: ProviderVerificationStageRuntimeErrorCode;
  readonly traceId: string;

  constructor(code: ProviderVerificationStageRuntimeErrorCode, traceId = randomUUID()) {
    super(ERROR_MESSAGES[code]);
    this.name = "ProviderVerificationStageRuntimeError";
    this.code = code;
    this.traceId = safeTraceId(traceId);
    delete this.stack;
  }
}

export interface ProviderVerificationStageRuntimeState {
  readonly bindingCount: number;
  readonly bindingIds: readonly string[];
  readonly environment: "stage";
  readonly lifecycle: "ready" | "closing" | "closed";
  readonly productionReady: false;
  readonly providerTransport: Readonly<{
    accepting: boolean;
    activeCallCount: number;
  }>;
}

export interface ProviderVerificationStageRuntimeHandle {
  readonly url: string;
  close(): Promise<void>;
  getState(): ProviderVerificationStageRuntimeState;
}

export interface StartProviderVerificationStageRuntimeOptions {
  readonly apiRuntimeFactory?: (
    options: CreateCampaignOsApiRuntimeOptions,
  ) => CampaignOsApiRuntime;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly healthFetch?: typeof fetch;
  readonly providerFetch?: typeof fetch;
  readonly serverStarter?: (
    options: StartCampaignOsApiServerOptions,
  ) => Promise<CampaignOsApiServerHandle>;
}

export interface RunProviderVerificationStageRuntimeCliOptions
  extends StartProviderVerificationStageRuntimeOptions {
  readonly argv?: readonly string[];
  readonly stdout?: (line: string) => void;
}

interface ResolvedStageRuntimeConfig {
  readonly bindingIds: readonly string[];
  readonly env: Record<string, string | undefined>;
  readonly materialResolver: ProviderHttpExecutionMaterialResolver;
  readonly providerRuntime: ProviderHttpRuntimeSummary;
  readonly taskVerificationConfig: TaskVerificationConfig;
  readonly taskVerificationRuleResolver: TaskVerificationRuleResolver;
}

const LOOPBACK_API_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const LOOPBACK_PROVIDER_HOSTS = new Set(["127.0.0.1", "localhost"]);
const STAGE_DATABASE_ACK_ENV = "CAMPAIGN_OS_STAGE_DISPOSABLE_DATABASE_ACK";
const STAGE_DATABASE_ACK_VALUE = "disposable-stage-approved";
const STAGE_PROVIDER_URL_ENV = "CAMPAIGN_OS_STAGE_PROVIDER_URL";
const STAGE_HEALTH_TIMEOUT_MS = 5_000;
const STAGE_TRANSPORT_DRAIN_TIMEOUT_MS = 2_000;
const SAFE_TRACE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const UNSAFE_TRACE_ID_PATTERN =
  /(?:authorization|bearer|credential|password|private|raw[_-]?signature|secret|token)/i;
const STAGE_PROVIDER_SCENARIO_BY_TEMPLATE = new Map<string, string>([
  ["bridge-ebridge", "completed"],
  ["swap-awaken", "completed"],
  ["liquidity-awaken", "pending"],
  ["nft-hold", "negative"],
  ["schrodinger-hold", "timeout"],
  ["dao-vote", "429"],
  ["daipp-submit", "5xx"],
  ["pay-complete", "malformed"],
  ["forecast-participate", "oversized"],
]);

export const startProviderVerificationStageRuntime = async (
  options: StartProviderVerificationStageRuntimeOptions = {},
): Promise<ProviderVerificationStageRuntimeHandle> => {
  const resolved = resolveStageRuntimeConfig(options.env ?? process.env);
  const transport = createProviderHttpFetchTransport({
    drainTimeoutMs: STAGE_TRANSPORT_DRAIN_TIMEOUT_MS,
    ...(options.providerFetch ? { fetch: options.providerFetch } : {}),
    materialResolver: resolved.materialResolver,
  });
  const apiRuntimeFactory = options.apiRuntimeFactory ?? createCampaignOsApiRuntime;
  const serverStarter = options.serverStarter ?? startCampaignOsApiServer;
  let server: CampaignOsApiServerHandle | undefined;

  try {
    server = await serverStarter({
      env: resolved.env,
      logger: false,
      profileId: "staging-scaffold",
      runtimeFactory: (runtimeOptions) => apiRuntimeFactory({
        ...runtimeOptions,
        taskVerificationConfig: resolved.taskVerificationConfig,
        taskVerificationProviderRuntime: resolved.providerRuntime,
        taskVerificationRuleResolver: resolved.taskVerificationRuleResolver,
        taskVerificationTransport: transport,
      }),
      taskVerificationTransport: transport,
    });
  } catch {
    await closeAfterFailedStart(server, transport);
    throw new ProviderVerificationStageRuntimeError("PROVIDER_STAGE_SERVER_START_FAILED");
  }

  try {
    await assertHealthy(server, options.healthFetch ?? globalThis.fetch);
  } catch {
    await closeAfterFailedStart(server, transport);
    throw new ProviderVerificationStageRuntimeError("PROVIDER_STAGE_HEALTH_CHECK_FAILED");
  }

  let lifecycle: ProviderVerificationStageRuntimeState["lifecycle"] = "ready";
  let closePromise: Promise<void> | undefined;
  const getState = (): ProviderVerificationStageRuntimeState => Object.freeze({
    bindingCount: resolved.bindingIds.length,
    bindingIds: Object.freeze([...resolved.bindingIds]),
    environment: "stage" as const,
    lifecycle,
    productionReady: false as const,
    providerTransport: Object.freeze({ ...transport.state() }),
  });
  const close = (): Promise<void> => {
    if (closePromise) {
      return closePromise;
    }
    lifecycle = "closing";
    closePromise = closeStageRuntime(server, transport).then(
      () => {
        lifecycle = "closed";
      },
      () => {
        lifecycle = "closed";
        throw new ProviderVerificationStageRuntimeError("PROVIDER_STAGE_SHUTDOWN_FAILED");
      },
    );
    return closePromise;
  };

  return Object.freeze({ close, getState, url: server.url });
};

export const runProviderVerificationStageRuntimeCli = async (
  options: RunProviderVerificationStageRuntimeCliOptions = {},
): Promise<ProviderVerificationStageRuntimeHandle | undefined> => {
  const argv = options.argv ?? process.argv.slice(2);
  if (!argv.includes("--listen")) {
    return undefined;
  }
  if (argv.length !== 1 || argv[0] !== "--listen") {
    throw new ProviderVerificationStageRuntimeError("PROVIDER_STAGE_CLI_INVALID_ARGUMENT");
  }

  const runtime = await startProviderVerificationStageRuntime({
    ...(options.apiRuntimeFactory ? { apiRuntimeFactory: options.apiRuntimeFactory } : {}),
    ...(options.env ? { env: options.env } : {}),
    ...(options.healthFetch ? { healthFetch: options.healthFetch } : {}),
    ...(options.providerFetch ? { providerFetch: options.providerFetch } : {}),
    ...(options.serverStarter ? { serverStarter: options.serverStarter } : {}),
  });
  const state = runtime.getState();
  const stdout = options.stdout ?? ((line: string) => process.stdout.write(`${line}\n`));
  stdout(JSON.stringify({
    apiUrl: runtime.url,
    bindingCount: state.bindingCount,
    bindingIds: state.bindingIds,
    environment: state.environment,
    event: "provider_verification_stage_runtime.ready",
    productionReady: state.productionReady,
    status: "ready",
  }));
  return runtime;
};

function resolveStageRuntimeConfig(
  sourceEnv: Readonly<Record<string, string | undefined>>,
): ResolvedStageRuntimeConfig {
  const env = { ...sourceEnv };
  const apiHost = (env.CAMPAIGN_OS_API_HOST ?? "127.0.0.1").trim().toLowerCase();
  if (!LOOPBACK_API_HOSTS.has(apiHost)) {
    throw new ProviderVerificationStageRuntimeError("PROVIDER_STAGE_API_HOST_INVALID");
  }

  try {
    const database = resolveCampaignOsCampaignDbConfig({ env });
    if (database.mode !== "postgres") {
      throw new ProviderVerificationStageRuntimeError("PROVIDER_STAGE_DATABASE_REQUIRED");
    }
    assertDisposableStageDatabase(
      database.pool.connectionString,
      env[STAGE_DATABASE_ACK_ENV],
    );
  } catch (error) {
    if (error instanceof ProviderVerificationStageRuntimeError) {
      throw error;
    }
    throw new ProviderVerificationStageRuntimeError("PROVIDER_STAGE_DATABASE_REQUIRED");
  }

  try {
    const preview = resolveCampaignOsParticipantPreviewConfig({ env });
    if (preview.campaignIds.length !== 1 || preview.campaignIds[0] !== "*") {
      throw new ProviderVerificationStageRuntimeError("PROVIDER_STAGE_PREVIEW_REQUIRED");
    }
  } catch (error) {
    if (error instanceof ProviderVerificationStageRuntimeError) {
      throw error;
    }
    throw new ProviderVerificationStageRuntimeError("PROVIDER_STAGE_PREVIEW_REQUIRED");
  }

  const taskVerificationConfig = resolveTaskVerificationConfig({
    env,
    environment: "stage",
    providerHttpTransportProvided: true,
  });
  if (
    !taskVerificationConfig.enabled
    || !taskVerificationConfig.hasLiveBindings
    || taskVerificationConfig.status !== "ready"
    || !taskVerificationConfig.valid
  ) {
    throw new ProviderVerificationStageRuntimeError(
      "PROVIDER_STAGE_VERIFICATION_CONFIG_INVALID",
    );
  }

  const bindings = taskVerificationConfig.bindings.filter(({ enabled }) => enabled);
  const verificationTypes = new Set(bindings.map(({ verificationType }) => verificationType));
  if (!verificationTypes.has("ON_CHAIN") || !verificationTypes.has("DAPP_API")) {
    throw new ProviderVerificationStageRuntimeError("PROVIDER_STAGE_BINDINGS_REQUIRED");
  }
  assertUnambiguousStageBindingDefaults(bindings);

  for (const binding of bindings) {
    if (binding.endpointEnvKey !== STAGE_PROVIDER_URL_ENV) {
      throw new ProviderVerificationStageRuntimeError(
        "PROVIDER_STAGE_ENDPOINT_KEY_INVALID",
      );
    }
    if (binding.bodyEnvKey || binding.credentialEnvKey || binding.headerEnvKey) {
      throw new ProviderVerificationStageRuntimeError(
        "PROVIDER_STAGE_STATIC_MATERIAL_FORBIDDEN",
      );
    }
    assertStageProviderEndpoint(env[binding.endpointEnvKey]);
  }

  const providerRuntime = createStageProviderRuntimeSummary(bindings);
  const materialResolver = createStageMaterialResolver(bindings, env);
  const bindingIds = Object.freeze(bindings.map(({ id }) => id).sort());

  return Object.freeze({
    bindingIds,
    env,
    materialResolver,
    providerRuntime,
    taskVerificationConfig,
    taskVerificationRuleResolver: createStageTaskVerificationRuleResolver(bindings),
  });
}

function assertUnambiguousStageBindingDefaults(
  bindings: readonly TaskVerificationBinding[],
): void {
  const defaults = new Set<string>();

  for (const binding of bindings) {
    const key = `${binding.verificationType}\u0000${binding.evidenceSource}`;
    if (defaults.has(key)) {
      throw new ProviderVerificationStageRuntimeError(
        "PROVIDER_STAGE_VERIFICATION_CONFIG_INVALID",
      );
    }
    defaults.add(key);
  }
}

function createStageTaskVerificationRuleResolver(
  bindings: readonly TaskVerificationBinding[],
): TaskVerificationRuleResolver {
  const bindingByDefault = new Map<string, TaskVerificationBinding>(
    bindings.map((binding) => [
      `${binding.verificationType}\u0000${binding.evidenceSource}`,
      binding,
    ] as const),
  );

  return (input) => {
    const source = input.evidenceRule.source;
    if (
      typeof source !== "string"
      || (input.verificationType !== "ON_CHAIN" && input.verificationType !== "DAPP_API")
    ) {
      return { ...input.evidenceRule };
    }

    const binding = bindingByDefault.get(`${input.verificationType}\u0000${source}`);
    if (!binding) {
      return { ...input.evidenceRule };
    }

    const templateCode = input.templateCode
      .trim()
      .toLowerCase()
      .replace(/^tpl[-_]/, "")
      .replace(/_/g, "-");
    const scenario = STAGE_PROVIDER_SCENARIO_BY_TEMPLATE.get(templateCode) ?? "completed";
    const expectation = {
      expectedType: "boolean" as const,
      expectedValue: true,
      providerBindingId: binding.id,
      source: binding.evidenceSource,
    };

    return input.verificationType === "ON_CHAIN"
      ? {
          chainId: "AELF",
          expectedField: "verified",
          ...expectation,
          ...(scenario === "completed" ? {} : { methodName: scenario }),
        }
      : {
          action: scenario,
          expectedField: "eligible",
          ...expectation,
        };
  };
}

function assertDisposableStageDatabase(
  connectionString: string,
  acknowledgement: string | undefined,
): void {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new ProviderVerificationStageRuntimeError("PROVIDER_STAGE_DATABASE_UNSAFE");
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const loopbackIpv4 = /^127(?:\.\d{1,3}){3}$/.test(hostname)
    && hostname.split(".").every((octet) => Number(octet) <= 255);
  if (
    acknowledgement?.trim() !== STAGE_DATABASE_ACK_VALUE
    || !(hostname === "localhost" || hostname === "::1" || loopbackIpv4)
  ) {
    throw new ProviderVerificationStageRuntimeError("PROVIDER_STAGE_DATABASE_UNSAFE");
  }
}

function createStageProviderRuntimeSummary(
  bindings: readonly TaskVerificationBinding[],
): ProviderHttpRuntimeSummary {
  const endpointIds = new Set(bindings.map(({ endpointId }) => endpointId));
  const endpointRegistry = providerHttpEndpointRegistry.filter(({ endpointId }) =>
    endpointIds.has(endpointId));
  if (endpointRegistry.length !== endpointIds.size) {
    throw new ProviderVerificationStageRuntimeError(
      "PROVIDER_STAGE_VERIFICATION_CONFIG_INVALID",
    );
  }

  const validationEnv = Object.fromEntries(
    providerHttpRuntimeProductionPreconditions.map(({ area, field }) => [
      field,
      area === "activation"
        ? "explicitly-enabled"
        : `config-ref:provider-stage-loopback-${area}`,
    ]),
  );
  const validated = createProviderHttpRuntimeSummary({
    endpointRegistry,
    env: validationEnv,
    profileId: "production-required",
    transportProvided: true,
  });
  if (!validated.valid || validated.status !== "activated") {
    throw new ProviderVerificationStageRuntimeError(
      "PROVIDER_STAGE_VERIFICATION_CONFIG_INVALID",
    );
  }

  // Re-label the validation result so health metadata cannot imply production approval.
  return Object.freeze({
    ...validated,
    productionReady: false,
    profileId: "staging-scaffold",
  });
}

function createStageMaterialResolver(
  bindings: readonly TaskVerificationBinding[],
  env: Readonly<Record<string, string | undefined>>,
): ProviderHttpExecutionMaterialResolver {
  const resolvers = new Map<string, ProviderHttpExecutionMaterialResolver>();
  for (const binding of bindings) {
    resolvers.set(
      bindingKey(binding),
      createProviderHttpExecutionMaterialResolver({
        binding,
        environment: "stage",
        lookup: { get: (key) => env[key] },
      }),
    );
  }
  const fallback = resolvers.values().next().value as
    | ProviderHttpExecutionMaterialResolver
    | undefined;
  if (!fallback) {
    throw new ProviderVerificationStageRuntimeError("PROVIDER_STAGE_BINDINGS_REQUIRED");
  }

  return (plan, requestMaterial, context) => (
    resolvers.get(planKey(plan)) ?? fallback
  )(plan, requestMaterial, context);
}

function bindingKey(binding: TaskVerificationBinding): string {
  return [
    binding.verificationType,
    binding.providerGroupId,
    binding.endpointId,
    binding.requestMappingId,
    binding.responseMappingId,
  ].join("\u0000");
}

function planKey(plan: ProviderHttpRequestPlan): string {
  return [
    plan.verificationType,
    plan.providerGroupId,
    plan.endpointId,
    plan.requestMappingId,
    plan.responseMappingId,
  ].join("\u0000");
}

function assertStageProviderEndpoint(value: string | undefined): void {
  let url: URL;
  try {
    url = new URL(value ?? "");
  } catch {
    throw new ProviderVerificationStageRuntimeError("PROVIDER_STAGE_ENDPOINT_INVALID");
  }

  if (
    url.protocol !== "http:"
    || !LOOPBACK_PROVIDER_HOSTS.has(url.hostname.toLowerCase())
    || Boolean(url.username)
    || Boolean(url.password)
    || Boolean(url.hash)
    || Boolean(url.search)
  ) {
    throw new ProviderVerificationStageRuntimeError("PROVIDER_STAGE_ENDPOINT_INVALID");
  }
}

async function assertHealthy(
  server: CampaignOsApiServerHandle,
  healthFetch: typeof fetch,
): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), STAGE_HEALTH_TIMEOUT_MS);
  try {
    const response = await healthFetch(`${server.url}/api/health`, {
      headers: { "x-campaign-os-trace-id": randomUUID() },
      signal: controller.signal,
    });
    const body = await response.json().catch(() => undefined) as {
      data?: {
        campaignDatabase?: {
          fallbackUsed?: unknown;
          selectedMode?: unknown;
          status?: unknown;
        };
        taskVerificationRuntime?: {
          bindingCount?: unknown;
          enabled?: unknown;
          schemaStatus?: unknown;
          status?: unknown;
        };
      };
      ok?: unknown;
    } | undefined;
    const campaignDatabase = body?.data?.campaignDatabase;
    const taskVerificationRuntime = body?.data?.taskVerificationRuntime;
    if (
      !response.ok
      || body?.ok !== true
      || campaignDatabase?.selectedMode !== "postgres"
      || campaignDatabase.status !== "ready"
      || campaignDatabase.fallbackUsed !== false
      || taskVerificationRuntime?.enabled !== true
      || taskVerificationRuntime.status !== "ready"
      || taskVerificationRuntime.schemaStatus !== "ready"
      || !Number.isSafeInteger(taskVerificationRuntime.bindingCount)
      || Number(taskVerificationRuntime.bindingCount) < 2
    ) {
      throw new ProviderVerificationStageRuntimeError("PROVIDER_STAGE_HEALTH_CHECK_FAILED");
    }
  } finally {
    clearTimeout(timer);
  }
}

async function closeAfterFailedStart(
  server: CampaignOsApiServerHandle | undefined,
  transport: ProviderHttpFetchTransport,
): Promise<void> {
  await closeStageResources(server, transport);
}

async function closeStageRuntime(
  server: CampaignOsApiServerHandle,
  transport: ProviderHttpFetchTransport,
): Promise<void> {
  await closeStageResources(server, transport);
}

async function closeStageResources(
  server: CampaignOsApiServerHandle | undefined,
  transport: ProviderHttpFetchTransport,
): Promise<void> {
  let serverFailed = false;
  if (server) {
    try {
      await server.stop();
    } catch {
      serverFailed = true;
    }
  }

  let transportFailed = false;
  try {
    const result = await transport.close();
    const state = transport.state();
    transportFailed = result.status !== "drained"
      || result.activeCallCount !== 0
      || state.accepting
      || state.activeCallCount !== 0;
  } catch {
    transportFailed = true;
  }

  if (serverFailed || transportFailed) {
    throw new ProviderVerificationStageRuntimeError("PROVIDER_STAGE_SHUTDOWN_FAILED");
  }
}

function safeTraceId(value: string): string {
  return SAFE_TRACE_ID_PATTERN.test(value) && !UNSAFE_TRACE_ID_PATTERN.test(value)
    ? value
    : randomUUID();
}

const PROVIDER_STAGE_RUNTIME_ENTRY_PATH = resolve(
  process.cwd(),
  "src/server/providerVerificationStageRuntime.ts",
);

export const isProviderVerificationStageRuntimeDirectExecution = (
  entryPath = process.argv[1],
): boolean => typeof entryPath === "string"
  && resolve(entryPath) === PROVIDER_STAGE_RUNTIME_ENTRY_PATH;

if (isProviderVerificationStageRuntimeDirectExecution() && process.argv.includes("--listen")) {
  runProviderVerificationStageRuntimeCli()
    .then((runtime) => {
      if (!runtime) {
        return;
      }
      let shuttingDown = false;
      const shutdown = () => {
        if (shuttingDown) {
          return;
        }
        shuttingDown = true;
        process.off("SIGINT", shutdown);
        process.off("SIGTERM", shutdown);
        void runtime.close().catch(() => {
          process.exitCode = 1;
        });
      };
      process.once("SIGINT", shutdown);
      process.once("SIGTERM", shutdown);
    })
    .catch((error: unknown) => {
      const stageError = error instanceof ProviderVerificationStageRuntimeError
        ? error
        : new ProviderVerificationStageRuntimeError("PROVIDER_STAGE_SERVER_START_FAILED");
      process.stderr.write(`${JSON.stringify({
        diagnosticCode: stageError.code,
        event: "provider_verification_stage_runtime.failed",
        status: "failed",
        traceId: stageError.traceId,
      })}\n`);
      process.exitCode = 1;
    });
}
