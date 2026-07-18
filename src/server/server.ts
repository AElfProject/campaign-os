import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { resolve } from "node:path";
import {
  createCampaignOsApiServiceContract,
  type CampaignOsApiServiceContract,
} from "./apiService";
import {
  createCampaignOsApiRuntime,
  type ApiRuntimeHeaders,
  type CampaignOsApiRuntime,
  type CreateCampaignOsApiRuntimeOptions,
  type DeprecatedNonLivePreviewAuthorityOption,
} from "./apiRuntime";
import { createFailureEnvelope, type ApiRuntimeEnvelope } from "./envelope";
import { internalRuntimeError, persistenceUnavailable, routeNotFound } from "./errors";
import { createBackendServiceReadinessReport } from "./backendService";
import {
  apiRuntimeContractRoutes,
  resolveExactProtectedApiRoute,
} from "./routes";
import {
  createAdminFailureEnvelope,
  createServerRequestContext,
  evaluateServerRequestGuard,
  isAdminRequestTarget,
} from "./serverRequestGuard";
import {
  createServerRuntimeReadiness,
  withServerRuntimeReadiness,
  type ServerRuntimeReadiness,
  type ServerShutdownState,
} from "./serverReadiness";
import {
  formatServerStartupLog,
  resolveApiServerRuntimeContract,
  type ApiServerRuntimeContract,
} from "./serverRuntime";
import type { ProviderHttpTransport } from "./providerHttpTransport";
import {
  resolveCampaignOsWalletAuthenticationConfig,
  type WalletAuthenticationConfig,
} from "./config";
import type {
  WalletAuthenticationHttpController,
  WalletAuthenticationHttpHeaders,
  WalletAuthenticationHttpRequest,
  WalletAuthenticationHttpResponse,
} from "./walletAuthenticationHttp";
import type {
  RevalidateWalletAuthenticationFenceInput,
  RevalidateWalletAuthenticationFenceResult,
  ResolveWalletAuthenticationAuthorizationResult,
  WalletAuthenticationMutationRequestInput,
  WalletAuthenticationRuntimeDiagnostic,
  WalletAuthenticationRuntimeFailure,
  WalletAuthenticationRuntimeStopResult,
} from "./walletAuthenticationRuntime";
import {
  createDefaultWalletAuthenticationServerComposition,
  type WalletAuthenticationLiveAuthorityRuntime,
  type WalletAuthenticationServerComposition,
  type WalletAuthenticationServerCompositionDependencies,
  type WalletAuthenticationServerCompositionFactory,
} from "./walletAuthenticationServerComposition";

export type {
  WalletAuthenticationLiveAuthorityRuntime,
  WalletAuthenticationServerComposition,
  WalletAuthenticationServerCompositionDependencies,
  WalletAuthenticationServerCompositionFactory,
  WalletAuthenticationServerCompositionFactoryInput,
} from "./walletAuthenticationServerComposition";

export interface CampaignOsApiServerHandle {
  getReadiness(): ServerRuntimeReadiness;
  getServiceContract(): CampaignOsApiServiceContract;
  getServiceReadiness(): CampaignOsApiServiceContract["readiness"];
  runtimeContract: ApiServerRuntimeContract;
  server: Server;
  serviceContract: CampaignOsApiServiceContract;
  stop(): Promise<void>;
  url: string;
}

export interface StartCampaignOsApiServerOptions {
  allowedCorsOrigins?: string[];
  /** @deprecated Local review compatibility only; never enables live wallet authority. */
  deprecatedNonLivePreviewAuthority?: DeprecatedNonLivePreviewAuthorityOption;
  env?: Record<string, string | undefined>;
  host?: string;
  logger?: Pick<Console, "error" | "log"> | false;
  maxBodyBytes?: number;
  port?: number;
  profileId?: string;
  runtimeFactory?: (options: CreateCampaignOsApiRuntimeOptions) => CampaignOsApiRuntime;
  shutdownTimeoutMs?: number;
  taskVerificationTransport?: ProviderHttpTransport;
  version?: string;
  walletAuthenticationAllowedOrigins?: readonly string[];
  walletAuthenticationCompositionDependencies?: WalletAuthenticationServerCompositionDependencies;
  walletAuthenticationCompositionFactory?: WalletAuthenticationServerCompositionFactory;
  walletAuthenticationHttpController?: WalletAuthenticationHttpController;
  walletAuthenticationRuntime?: WalletAuthenticationLiveAuthorityRuntime;
}

export type ApiServerShutdownErrorCode =
  | "API_SERVER_HTTP_CLOSE_FAILED"
  | "API_SERVER_SHUTDOWN_TIMEOUT"
  | "API_SERVER_RUNTIME_CLOSE_FAILED";

export class ApiServerShutdownError extends Error {
  readonly code: ApiServerShutdownErrorCode;
  readonly traceId: string;

  constructor(code: ApiServerShutdownErrorCode, traceId: string) {
    super("Campaign OS API server shutdown failed.");
    this.name = "ApiServerShutdownError";
    this.code = code;
    this.traceId = traceId;
  }
}

interface RequestBodyReadResult {
  body?: string;
  bodyBytes: number;
}

const toRuntimeHeaders = (request: IncomingMessage): ApiRuntimeHeaders => {
  const headers: ApiRuntimeHeaders = {};

  for (let index = 0; index < request.rawHeaders.length; index += 2) {
    const rawName = request.rawHeaders[index];
    const rawValue = request.rawHeaders[index + 1];
    if (typeof rawName !== "string" || typeof rawValue !== "string") {
      continue;
    }

    const name = rawName.toLowerCase();
    const existing = headers[name];
    headers[name] = existing === undefined
      ? rawValue
      : Array.isArray(existing)
        ? [...existing, rawValue]
        : [existing, rawValue];
  }

  return headers;
};

const toGuardHeaders = (
  requestHeaders: ApiRuntimeHeaders,
  traceHeaderName: string,
) => {
  const headers = { ...requestHeaders };
  const traceHeaderKey = Object.keys(headers).find(
    (key) => key.toLowerCase() === traceHeaderName.toLowerCase(),
  );
  const rawTraceId = traceHeaderKey
    ? Array.isArray(headers[traceHeaderKey])
      ? headers[traceHeaderKey]?.[0]
      : headers[traceHeaderKey]
    : undefined;
  const traceId = typeof rawTraceId === "string" ? rawTraceId.trim() : undefined;
  const safe = Boolean(
    traceId
    && traceId.length <= 128
    && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(traceId)
    && !/(?:bearer|password|private|raw[_-]?signature|secret|token)/i.test(traceId)
  );

  if (traceHeaderKey && !safe && !Array.isArray(headers[traceHeaderKey])) {
    delete headers[traceHeaderKey];
  }

  return headers;
};

const readRequestBody = (
  request: IncomingMessage,
  maxBodyBytes: number,
): Promise<RequestBodyReadResult> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let bodyBytes = 0;

    request.on("data", (chunk: Buffer) => {
      bodyBytes += chunk.byteLength;

      if (bodyBytes <= maxBodyBytes) {
        chunks.push(chunk);
      }
    });
    request.on("end", () => {
      if (chunks.length === 0) {
        resolve({ bodyBytes });
        return;
      }

      resolve({ body: Buffer.concat(chunks).toString("utf8"), bodyBytes });
    });
    request.on("aborted", () => reject(new Error("Request aborted.")));
    request.on("error", reject);
  });

const writeJsonResponse = (
  response: ServerResponse,
  status: number,
  headers: Record<string, string>,
  body: unknown,
) => {
  const payload = body === undefined ? undefined : JSON.stringify(body);

  response.writeHead(status, headers);
  response.end(payload);
};

const writeRuntimeResponse = (
  response: ServerResponse,
  status: number,
  headers: Record<string, string>,
  body: unknown,
  rawBody: string | undefined,
) => {
  if (rawBody !== undefined && status >= 200 && status < 300) {
    response.writeHead(status, headers);
    response.end(Buffer.from(rawBody, "utf8"));
    return;
  }

  writeJsonResponse(response, status, headers, body);
};

const isRuntimeMetadataPath = (path: string | undefined) => {
  const pathname = new URL(path || "/", "http://127.0.0.1").pathname;

  return pathname === "/api/health" || pathname === "/api/contracts";
};

const isLegacyRuntimeEnvelope = (body: unknown): body is ApiRuntimeEnvelope =>
  typeof body === "object"
  && body !== null
  && "runtime" in body
  && "safety" in body
  && "timestamp" in body;

const wait = (delayMs: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });

const settleWithin = <T>(promise: Promise<T>, timeoutMs: number) =>
  new Promise<"fulfilled" | "rejected" | "timeout">((resolve) => {
    const timer = setTimeout(() => resolve("timeout"), Math.max(0, timeoutMs));

    promise.then(
      () => {
        clearTimeout(timer);
        resolve("fulfilled");
      },
      () => {
        clearTimeout(timer);
        resolve("rejected");
      },
    );
  });

const liveWalletAuthenticationRouteIds = new Set([
  "admin.wallet-session.revoke",
  "wallet.auth.challenge.create",
  "wallet.auth.session.create",
  "wallet.auth.session.current",
  "wallet.auth.session.logout",
  "wallet.auth.session.rotate",
]);

const safeWalletAuthenticationTraceId = (value: unknown): string =>
  typeof value === "string"
  && value.length > 0
  && value.length <= 128
  && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)
  && !/(?:bearer|password|private|raw[_-]?signature|secret|token)/i.test(value)
    ? value
    : `wallet-auth-composition-${randomUUID()}`;

const walletAuthenticationTraceIdFromHeaders = (
  headers: WalletAuthenticationHttpHeaders | undefined,
): string => {
  if (!headers || typeof headers !== "object" || Array.isArray(headers)) {
    return safeWalletAuthenticationTraceId(undefined);
  }

  try {
    const values = Object.entries(headers)
      .filter(([name, value]) => name.toLowerCase() === "x-campaign-os-trace-id" && value !== undefined)
      .map(([, value]) => value);

    return values.length === 1 && typeof values[0] === "string"
      ? safeWalletAuthenticationTraceId(values[0])
      : safeWalletAuthenticationTraceId(undefined);
  } catch {
    return safeWalletAuthenticationTraceId(undefined);
  }
};

const resolveLiveWalletAuthenticationRoute = (requestTarget: string | undefined) => {
  try {
    const resolution = resolveExactProtectedApiRoute(requestTarget ?? "/");

    return resolution && liveWalletAuthenticationRouteIds.has(resolution.route.id)
      ? resolution
      : undefined;
  } catch {
    return undefined;
  }
};

const createWalletAuthenticationUnavailableDiagnostic = (
  traceId: unknown,
): WalletAuthenticationRuntimeDiagnostic => Object.freeze({
  code: "WALLET_AUTH_RUNTIME_CONFIG_INVALID" as const,
  field: "composition",
  retryable: false,
  traceId: safeWalletAuthenticationTraceId(traceId),
});

const createUnavailableWalletAuthenticationRuntime = (
): WalletAuthenticationLiveAuthorityRuntime => {
  let stopPromise: Promise<WalletAuthenticationRuntimeStopResult> | undefined;

  const unavailable = (traceId: unknown): WalletAuthenticationRuntimeFailure => Object.freeze({
    diagnostic: createWalletAuthenticationUnavailableDiagnostic(traceId),
    status: "unavailable" as const,
  });
  const runtime: WalletAuthenticationLiveAuthorityRuntime = Object.freeze({
    resolveAuthorization: async (
      input: WalletAuthenticationMutationRequestInput,
    ): Promise<ResolveWalletAuthenticationAuthorizationResult> => unavailable(input?.traceId),
    revalidateFenceBeforeWrite: async <TValue>(
      input: RevalidateWalletAuthenticationFenceInput<TValue>,
    ): Promise<RevalidateWalletAuthenticationFenceResult<TValue>> => Object.freeze({
      diagnostic: createWalletAuthenticationUnavailableDiagnostic(input?.traceId),
      status: "failed" as const,
    }),
    state: () => Object.freeze({
      accepting: false,
      activeOperationCount: 0,
      controllerCount: 0,
    }),
    stop: (): Promise<WalletAuthenticationRuntimeStopResult> => {
      stopPromise ??= Promise.resolve(Object.freeze({
        diagnosticCodes: Object.freeze([]),
        diagnostics: Object.freeze([]),
        status: "drained" as const,
      }));
      return stopPromise;
    },
  });

  return runtime;
};

const createUnavailableWalletAuthenticationHttpController = (
): WalletAuthenticationHttpController => Object.freeze({
  handle: async (
    request: WalletAuthenticationHttpRequest,
  ): Promise<WalletAuthenticationHttpResponse | undefined> => {
    let route;
    try {
      route = resolveLiveWalletAuthenticationRoute(request?.path);
    } catch {
      return undefined;
    }
    if (!route) {
      return undefined;
    }

    const traceId = walletAuthenticationTraceIdFromHeaders(request?.headers);
    return Object.freeze({
      body: Object.freeze({
        error: Object.freeze({
          code: "AUTH_DEPENDENCY_UNAVAILABLE",
          details: Object.freeze({
            diagnosticCode: "WALLET_AUTH_RUNTIME_CONFIG_INVALID",
            field: "composition",
            retryable: false,
          }),
          message: "Wallet authentication is temporarily unavailable.",
        }),
        ok: false as const,
        traceId,
      }),
      headers: Object.freeze({
        "content-type": "application/json; charset=utf-8",
        "x-campaign-os-trace-id": traceId,
      }),
      status: 503,
    });
  },
});

const validWalletAuthenticationRuntime = (
  value: unknown,
): value is WalletAuthenticationLiveAuthorityRuntime => {
  if (value === null || typeof value !== "object") {
    return false;
  }

  try {
    return [
      "resolveAuthorization",
      "revalidateFenceBeforeWrite",
      "state",
      "stop",
    ].every((method) => typeof (value as Record<string, unknown>)[method] === "function");
  } catch {
    return false;
  }
};

const validWalletAuthenticationHttpController = (
  value: unknown,
): value is WalletAuthenticationHttpController => {
  if (value === null || typeof value !== "object") {
    return false;
  }

  try {
    return typeof (value as Partial<WalletAuthenticationHttpController>).handle === "function";
  } catch {
    return false;
  }
};

type ResolvedWalletAuthenticationServerComposition = Readonly<{
  mode: "preview";
  source: "deprecated_preview";
}> | Readonly<{
  allowedOrigins: readonly string[];
  httpController: WalletAuthenticationHttpController;
  mode: "live";
  runtime: WalletAuthenticationLiveAuthorityRuntime;
  runtimeOwnership: "external" | "runtime";
  serverOwnedRuntime?: WalletAuthenticationLiveAuthorityRuntime;
  source: "default" | "external" | "factory" | "unavailable";
}>;

const stopWalletAuthenticationRuntimeForCleanup = async (
  runtime: WalletAuthenticationLiveAuthorityRuntime,
  timeoutMs: number,
  traceId: string,
): Promise<"fulfilled" | "rejected" | "timeout"> => settleWithin(
  Promise.resolve()
    .then(() => runtime.stop(traceId))
    .then((result) => {
      if (result.status !== "drained") {
        throw new Error("Wallet authentication runtime did not drain cleanly.");
      }
    }),
  timeoutMs,
);

const resolveWalletAuthenticationServerComposition = async ({
  config,
  env,
  explicitAllowedOrigins,
  explicitHttpController,
  explicitRuntime,
  defaultDependencies,
  factory,
  fallbackAllowedOrigins,
  logger,
  shutdownTimeoutMs,
}: Readonly<{
  config: WalletAuthenticationConfig;
  defaultDependencies: WalletAuthenticationServerCompositionDependencies | undefined;
  env: Readonly<Record<string, string | undefined>>;
  explicitAllowedOrigins: readonly string[] | undefined;
  explicitHttpController: WalletAuthenticationHttpController | undefined;
  explicitRuntime: WalletAuthenticationLiveAuthorityRuntime | undefined;
  factory: WalletAuthenticationServerCompositionFactory | undefined;
  fallbackAllowedOrigins: readonly string[];
  logger: Pick<Console, "error" | "log"> | false;
  shutdownTimeoutMs: number;
}>): Promise<ResolvedWalletAuthenticationServerComposition> => {
  const traceId = safeWalletAuthenticationTraceId(undefined);
  const fallbackOrigins = Object.freeze([
    ...(explicitAllowedOrigins
      ?? (config.status === "ready" ? config.allowedOrigins : fallbackAllowedOrigins)),
  ]);
  const unavailable = (code: string): ResolvedWalletAuthenticationServerComposition => {
    if (logger) {
      logger.error(
        `[campaign-os-api-runtime] wallet_auth_composition_unavailable code=${code} traceId=${traceId}`,
      );
    }
    return Object.freeze({
      allowedOrigins: fallbackOrigins,
      httpController: createUnavailableWalletAuthenticationHttpController(),
      mode: "live" as const,
      runtime: createUnavailableWalletAuthenticationRuntime(),
      runtimeOwnership: "runtime" as const,
      source: "unavailable" as const,
    });
  };
  const rollbackCandidateRuntime = async (candidateRuntime: unknown) => {
    if (!validWalletAuthenticationRuntime(candidateRuntime)) {
      return;
    }

    const cleanup = await stopWalletAuthenticationRuntimeForCleanup(
      candidateRuntime,
      shutdownTimeoutMs,
      traceId,
    );
    if (cleanup !== "fulfilled" && logger) {
      logger.error(
        `[campaign-os-api-runtime] wallet_auth_composition_rollback_failed code=WALLET_AUTH_COMPOSITION_ROLLBACK_FAILED traceId=${traceId}`,
      );
    }
  };
  const explicitDependencyCount = Number(explicitRuntime !== undefined)
    + Number(explicitHttpController !== undefined);

  if (explicitDependencyCount > 0) {
    if (
      explicitDependencyCount !== 2
      || !validWalletAuthenticationRuntime(explicitRuntime)
      || !validWalletAuthenticationHttpController(explicitHttpController)
    ) {
      return unavailable("WALLET_AUTH_EXPLICIT_COMPOSITION_INCOMPLETE");
    }
    return Object.freeze({
      allowedOrigins: fallbackOrigins,
      httpController: explicitHttpController,
      mode: "live" as const,
      runtime: explicitRuntime,
      runtimeOwnership: "runtime" as const,
      source: "external" as const,
    });
  }

  if (config.status === "disabled") {
    return Object.freeze({
      mode: "preview" as const,
      source: "deprecated_preview" as const,
    });
  }
  if (config.status !== "ready") {
    return unavailable("WALLET_AUTH_CONFIG_INVALID");
  }
  if (config.storeMode !== "postgres") {
    return unavailable("WALLET_AUTH_POSTGRES_REQUIRED");
  }
  let candidate: WalletAuthenticationServerComposition;
  const selectedFactory: WalletAuthenticationServerCompositionFactory = factory
    ?? ((input) => createDefaultWalletAuthenticationServerComposition({
      ...input,
      ...(defaultDependencies === undefined ? {} : { dependencies: defaultDependencies }),
    }));
  try {
    candidate = await selectedFactory(Object.freeze({ config, env, traceId }));
  } catch {
    return unavailable("WALLET_AUTH_COMPOSITION_START_FAILED");
  }
  let candidateRuntime: unknown;
  let candidateHttpController: unknown;
  try {
    candidateRuntime = Reflect.get(candidate as unknown as object, "runtime");
    candidateHttpController = Reflect.get(candidate as unknown as object, "httpController");
  } catch {
    await rollbackCandidateRuntime(candidateRuntime);
    return unavailable("WALLET_AUTH_COMPOSITION_INVALID");
  }
  if (
    !validWalletAuthenticationRuntime(candidateRuntime)
    || !validWalletAuthenticationHttpController(candidateHttpController)
  ) {
    await rollbackCandidateRuntime(candidateRuntime);
    return unavailable("WALLET_AUTH_COMPOSITION_INVALID");
  }

  return Object.freeze({
    allowedOrigins: Object.freeze([...config.allowedOrigins]),
    httpController: candidateHttpController,
    mode: "live" as const,
    runtime: candidateRuntime,
    runtimeOwnership: "external" as const,
    serverOwnedRuntime: candidateRuntime,
    source: factory ? "factory" as const : "default" as const,
  });
};

const taskVerificationEnvironmentForProfile = (
  profileId: ApiServerRuntimeContract["profileId"],
): "local" | "production" | "stage" => profileId === "production-required"
  ? "production"
  : profileId === "staging-scaffold"
    ? "stage"
    : "local";

export const startCampaignOsApiServer = async ({
  allowedCorsOrigins,
  deprecatedNonLivePreviewAuthority,
  env,
  host,
  logger = console,
  maxBodyBytes,
  port,
  profileId,
  runtimeFactory = createCampaignOsApiRuntime,
  shutdownTimeoutMs,
  taskVerificationTransport,
  version,
  walletAuthenticationAllowedOrigins,
  walletAuthenticationCompositionDependencies,
  walletAuthenticationCompositionFactory,
  walletAuthenticationHttpController,
  walletAuthenticationRuntime,
}: StartCampaignOsApiServerOptions = {}): Promise<CampaignOsApiServerHandle> => {
  const runtimeEnv = env ?? (typeof process === "undefined" ? {} : process.env);
  const walletAuthenticationConfig = resolveCampaignOsWalletAuthenticationConfig({
    env: runtimeEnv,
    traceId: safeWalletAuthenticationTraceId(undefined),
  });
  const initialRuntimeContract = resolveApiServerRuntimeContract({
    allowedCorsOrigins,
    env: runtimeEnv,
    host,
    maxBodyBytes,
    port,
    profileId,
    shutdownTimeoutMs,
    version,
  });
  const mergeWalletAuthenticationOrigins = allowedCorsOrigins === undefined
    && walletAuthenticationConfig.status === "ready"
    && walletAuthenticationConfig.allowedOrigins.some(
      (origin) => !initialRuntimeContract.corsPolicy.allowedOrigins.includes(origin),
    );
  const runtimeContract = mergeWalletAuthenticationOrigins
    ? resolveApiServerRuntimeContract({
      allowedCorsOrigins: [...new Set([
        ...initialRuntimeContract.corsPolicy.allowedOrigins,
        ...walletAuthenticationConfig.allowedOrigins,
      ])],
      env: runtimeEnv,
      host,
      maxBodyBytes,
      port,
      profileId,
      shutdownTimeoutMs,
      startedAt: initialRuntimeContract.startedAt,
      version,
    })
    : initialRuntimeContract;
  const walletAuthenticationComposition = await resolveWalletAuthenticationServerComposition({
    config: walletAuthenticationConfig,
    env: runtimeEnv,
    explicitAllowedOrigins: walletAuthenticationAllowedOrigins,
    explicitHttpController: walletAuthenticationHttpController,
    explicitRuntime: walletAuthenticationRuntime,
    defaultDependencies: walletAuthenticationCompositionDependencies,
    factory: walletAuthenticationCompositionFactory,
    fallbackAllowedOrigins: runtimeContract.corsPolicy.allowedOrigins,
    logger,
    shutdownTimeoutMs: runtimeContract.shutdown.shutdownTimeoutMs,
  });
  const credentialedAllowedOrigins = Object.freeze([
    ...(walletAuthenticationComposition.mode === "live"
      ? walletAuthenticationComposition.allowedOrigins
      : walletAuthenticationAllowedOrigins ?? runtimeContract.corsPolicy.allowedOrigins),
  ]);
  const backendServiceReadiness = createBackendServiceReadinessReport({
    configOptions: {
      env: runtimeEnv,
      host: runtimeContract.host,
      port: runtimeContract.port,
      profileId: runtimeContract.profileId,
      version: runtimeContract.runtimeVersion,
    },
    providerHttpTransportProvided: Boolean(taskVerificationTransport),
  });
  const runtimeOptions: CreateCampaignOsApiRuntimeOptions = {
    backendServiceReadiness: () => backendServiceReadiness,
    logger,
    runtimeConfigOptions: {
      env: runtimeEnv,
      version: runtimeContract.runtimeVersion,
    },
    taskVerificationConfigOptions: {
      env: runtimeEnv,
      environment: taskVerificationEnvironmentForProfile(runtimeContract.profileId),
      providerHttpTransportProvided: Boolean(taskVerificationTransport),
    },
    taskVerificationProviderRuntime:
      backendServiceReadiness.providerClientReadiness.providerHttpRuntime,
    ...(walletAuthenticationComposition.mode === "preview"
      && deprecatedNonLivePreviewAuthority
      ? { deprecatedNonLivePreviewAuthority }
      : {}),
    ...(taskVerificationTransport ? { taskVerificationTransport } : {}),
    version: runtimeContract.runtimeVersion,
    ...(walletAuthenticationComposition.mode === "live"
      ? {
        walletAuthenticationHttpController: walletAuthenticationComposition.httpController,
        walletAuthenticationRuntime: walletAuthenticationComposition.runtime,
        walletAuthenticationRuntimeOwnership: walletAuthenticationComposition.runtimeOwnership,
      }
      : {}),
  };
  let runtime: CampaignOsApiRuntime;
  try {
    runtime = runtimeFactory(runtimeOptions);
    if (
      !runtime
      || typeof runtime.close !== "function"
      || typeof runtime.handle !== "function"
    ) {
      throw new TypeError("Campaign OS API runtime factory returned an invalid runtime.");
    }
  } catch (error) {
    if (walletAuthenticationComposition.mode === "live"
      && walletAuthenticationComposition.serverOwnedRuntime) {
      const cleanupTraceId = safeWalletAuthenticationTraceId(undefined);
      const cleanup = await stopWalletAuthenticationRuntimeForCleanup(
        walletAuthenticationComposition.serverOwnedRuntime,
        runtimeContract.shutdown.shutdownTimeoutMs,
        cleanupTraceId,
      );
      if (cleanup !== "fulfilled" && logger) {
        logger.error(
          `[campaign-os-api-runtime] startup_cleanup_failed code=API_SERVER_WALLET_AUTH_CLOSE_FAILED traceId=${cleanupTraceId}`,
        );
      }
    }
    throw error;
  }
  let serverOwnedWalletAuthenticationStopPromise: Promise<void> | undefined;
  const stopServerOwnedWalletAuthentication = (): Promise<void> => {
    if (serverOwnedWalletAuthenticationStopPromise) {
      return serverOwnedWalletAuthenticationStopPromise;
    }
    if (
      walletAuthenticationComposition.mode !== "live"
      || !walletAuthenticationComposition.serverOwnedRuntime
    ) {
      return Promise.resolve();
    }

    const ownedRuntime = walletAuthenticationComposition.serverOwnedRuntime;
    const traceId = safeWalletAuthenticationTraceId(undefined);
    try {
      serverOwnedWalletAuthenticationStopPromise = Promise.resolve(ownedRuntime.stop(traceId))
        .then((result) => {
          if (result.status !== "drained") {
            throw new Error("Wallet authentication runtime did not drain cleanly.");
          }
        });
    } catch (error) {
      serverOwnedWalletAuthenticationStopPromise = Promise.reject(error);
    }
    return serverOwnedWalletAuthenticationStopPromise;
  };
  const closeRuntimeGraph = (): Promise<void> => {
    if (
      walletAuthenticationComposition.mode !== "live"
      || !walletAuthenticationComposition.serverOwnedRuntime
    ) {
      try {
        return Promise.resolve(runtime.close());
      } catch (error) {
        return Promise.reject(error);
      }
    }

    return (async () => {
      const startedAt = Date.now();
      const walletAuthenticationResult = await settleWithin(
        stopServerOwnedWalletAuthentication(),
        Math.max(1, Math.floor(runtimeContract.shutdown.shutdownTimeoutMs / 2)),
      );
      let apiRuntimeClose: Promise<void>;
      try {
        apiRuntimeClose = Promise.resolve(runtime.close());
      } catch (error) {
        apiRuntimeClose = Promise.reject(error);
      }
      const apiRuntimeResult = await settleWithin(
        apiRuntimeClose,
        Math.max(
          0,
          runtimeContract.shutdown.shutdownTimeoutMs - (Date.now() - startedAt),
        ),
      );
      if (walletAuthenticationResult !== "fulfilled" || apiRuntimeResult !== "fulfilled") {
        throw new Error("Campaign OS API runtime graph did not close cleanly.");
      }
    })();
  };
  const shutdownState: ServerShutdownState = {
    activeRequestCount: 0,
    state: "running",
  };
  let stopPromise: Promise<void> | undefined;
  const getReadiness = () => createServerRuntimeReadiness({
    backendReadiness: backendServiceReadiness,
    contract: runtimeContract,
    shutdownState,
  });
  const getServiceContract = () => createCampaignOsApiServiceContract({
    allowedCorsOrigins: runtimeContract.corsPolicy.allowedOrigins,
    env: runtimeEnv,
    host: runtimeContract.host,
    maxBodyBytes: runtimeContract.requestGuard.maxBodyBytes,
    port: runtimeContract.port,
    profileId: runtimeContract.profileId,
    shutdownState,
    shutdownTimeoutMs: runtimeContract.shutdown.shutdownTimeoutMs,
    startedAt: runtimeContract.startedAt,
    version: runtimeContract.runtimeVersion,
  });
  const getServiceReadiness = () => getServiceContract().readiness;

  const server = createServer((request, response) => {
    const requestTarget = request.url ?? "/";
    const adminRequest = isAdminRequestTarget(requestTarget);
    const runtimeHeaders = toRuntimeHeaders(request);
    const guardHeaders = toGuardHeaders(
      runtimeHeaders,
      runtimeContract.requestGuard.traceHeaderName,
    );
    const requestContext = createServerRequestContext(guardHeaders, runtimeContract);

    if (shutdownState.state !== "running") {
      const traceId = adminRequest ? requestContext.traceId : randomUUID();
      const runtimeError = persistenceUnavailable("server.shutdown").body;

      request.resume();
      try {
        writeJsonResponse(
          response,
          503,
          {
            ...(adminRequest ? requestContext.corsHeaders : {}),
            connection: "close",
            "content-type": "application/json",
            "x-campaign-os-trace-id": traceId,
          },
          adminRequest
            ? createAdminFailureEnvelope(runtimeError, traceId)
            : createFailureEnvelope({
              error: runtimeError,
              routeCount: apiRuntimeContractRoutes.length,
              traceId,
              version: runtimeContract.runtimeVersion,
            }),
        );
      } catch {
        response.destroy();
      }

      return;
    }

    const previewOnlyLiveRoute = walletAuthenticationComposition.mode === "preview"
      ? resolveLiveWalletAuthenticationRoute(requestTarget)
      : undefined;
    if (previewOnlyLiveRoute) {
      const traceId = requestContext.traceId;
      const runtimeError = routeNotFound(
        request.method ?? "GET",
        previewOnlyLiveRoute.route.path,
      ).body;

      request.resume();
      try {
        writeJsonResponse(
          response,
          404,
          {
            "content-type": "application/json",
            "x-campaign-os-trace-id": traceId,
          },
          adminRequest
            ? createAdminFailureEnvelope(runtimeError, traceId)
            : createFailureEnvelope({
              error: runtimeError,
              routeCount: apiRuntimeContractRoutes.length,
              traceId,
              version: runtimeContract.runtimeVersion,
            }),
        );
      } catch {
        response.destroy();
      }

      return;
    }

    shutdownState.activeRequestCount += 1;

    void (async () => {
      try {
        const requestBody = await readRequestBody(request, runtimeContract.requestGuard.maxBodyBytes);
        const guardDecision = evaluateServerRequestGuard({
          body: requestBody.body,
          bodyBytes: requestBody.bodyBytes,
          headers: guardHeaders,
          method: request.method ?? "GET",
          path: requestTarget,
        }, runtimeContract, apiRuntimeContractRoutes.length, requestContext, {
          credentialedRoutes: { allowedOrigins: credentialedAllowedOrigins },
        });

        if (guardDecision.kind === "preflight") {
          writeJsonResponse(response, guardDecision.status, guardDecision.headers, guardDecision.body);
          return;
        }

        if (guardDecision.kind === "rejected") {
          writeJsonResponse(response, guardDecision.status, guardDecision.headers, guardDecision.body);
          return;
        }

        const runtimeResponse = await runtime.handle({
          body: guardDecision.body,
          headers: runtimeHeaders,
          method: request.method ?? "GET",
          path: request.url ?? "/",
        });
        const responseBody = isRuntimeMetadataPath(request.url)
          && isLegacyRuntimeEnvelope(runtimeResponse.body)
          ? withServerRuntimeReadiness(
            runtimeResponse.body,
            getReadiness(),
          )
          : runtimeResponse.body;

        writeRuntimeResponse(
          response,
          runtimeResponse.status,
          {
            ...guardDecision.headers,
            ...runtimeResponse.headers,
          },
          responseBody,
          runtimeResponse.rawBody,
        );
      } catch {
        const traceId = adminRequest ? requestContext.traceId : randomUUID();
        const runtimeError = internalRuntimeError().body;

        if (logger) {
          logger.error(
            `[campaign-os-api-runtime] request_failed code=API_SERVER_REQUEST_FAILED traceId=${traceId}`,
          );
        }

        if (!response.destroyed && !response.headersSent && !response.writableEnded) {
          try {
            writeJsonResponse(
              response,
              500,
              {
                ...(adminRequest ? requestContext.corsHeaders : {}),
                "content-type": "application/json",
                "x-campaign-os-trace-id": traceId,
              },
              adminRequest
                ? createAdminFailureEnvelope(runtimeError, traceId)
                : createFailureEnvelope({
                  error: runtimeError,
                  routeCount: apiRuntimeContractRoutes.length,
                  traceId,
                  version: runtimeContract.runtimeVersion,
                }),
            );
          } catch {
            response.destroy();
          }
        } else if (!response.destroyed && !response.writableEnded) {
          response.destroy();
        }
      } finally {
        shutdownState.activeRequestCount = Math.max(0, shutdownState.activeRequestCount - 1);
      }
    })().catch(() => {
      if (!response.destroyed) {
        response.destroy();
      }
    });
  });

  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(runtimeContract.port, runtimeContract.host, () => {
        server.off("error", reject);
        resolve();
      });
    });
  } catch (error) {
    const cleanupTraceId = randomUUID();
    const cleanupResult = await settleWithin(
      closeRuntimeGraph(),
      runtimeContract.shutdown.shutdownTimeoutMs,
    );

    if (cleanupResult !== "fulfilled" && logger) {
      logger.error(
        `[campaign-os-api-runtime] startup_cleanup_failed code=API_SERVER_RUNTIME_CLOSE_FAILED traceId=${cleanupTraceId}`,
      );
    }

    throw error;
  }

  const address = server.address() as AddressInfo;
  const url = `http://${runtimeContract.host}:${address.port}`;

  if (logger) {
    logger.log(
      [
        `[campaign-os-api-runtime] listening on ${url}`,
        `entrypoint=${backendServiceReadiness.entrypoint.id}`,
        `walletAuth=${walletAuthenticationComposition.source}`,
        formatServerStartupLog(runtimeContract),
      ].join(" "),
    );
  }

  const stop = (): Promise<void> => {
    if (stopPromise) {
      return stopPromise;
    }

    stopPromise = (async () => {
      shutdownState.state = "stopping";
      shutdownState.stopStartedAt = new Date().toISOString();
      const shutdownTraceId = randomUUID();
      const deadline = Date.now() + runtimeContract.shutdown.shutdownTimeoutMs;
      let failureCode: ApiServerShutdownErrorCode | undefined;
      let runtimeClosePromise: Promise<void>;
      try {
        runtimeClosePromise = closeRuntimeGraph();
      } catch (error) {
        runtimeClosePromise = Promise.reject(error);
      }
      const runtimeCloseResultPromise = settleWithin(
        runtimeClosePromise,
        Math.max(0, deadline - Date.now()),
      );

      const httpClosePromise = new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });

      while (shutdownState.activeRequestCount > 0 && Date.now() < deadline) {
        await wait(5);
      }

      if (shutdownState.activeRequestCount > 0) {
        failureCode = "API_SERVER_SHUTDOWN_TIMEOUT";
        server.closeAllConnections();
      } else {
        server.closeIdleConnections();
      }

      const httpCloseResult = await settleWithin(
        httpClosePromise,
        Math.max(0, deadline - Date.now()),
      );
      if (httpCloseResult === "rejected") {
        failureCode ??= "API_SERVER_HTTP_CLOSE_FAILED";
      } else if (httpCloseResult === "timeout") {
        failureCode ??= "API_SERVER_SHUTDOWN_TIMEOUT";
        server.closeAllConnections();
      }

      const runtimeCloseResult = await runtimeCloseResultPromise;
      if (runtimeCloseResult === "rejected") {
        failureCode ??= "API_SERVER_RUNTIME_CLOSE_FAILED";
      } else if (runtimeCloseResult === "timeout") {
        failureCode ??= "API_SERVER_SHUTDOWN_TIMEOUT";
      }

      shutdownState.activeRequestCount = 0;
      shutdownState.closedAt = new Date().toISOString();
      shutdownState.state = "stopped";

      if (failureCode) {
        if (logger) {
          logger.error(
            `[campaign-os-api-runtime] shutdown_failed code=${failureCode} traceId=${shutdownTraceId}`,
          );
        }
        throw new ApiServerShutdownError(failureCode, shutdownTraceId);
      }
    })();

    return stopPromise;
  };

  return {
    getReadiness,
    getServiceContract,
    getServiceReadiness,
    runtimeContract,
    server,
    get serviceContract() {
      return getServiceContract();
    },
    stop,
    url,
  };
};

const CAMPAIGN_OS_API_SERVER_ENTRY_PATH = resolve(process.cwd(), "src/server/server.ts");

export const isCampaignOsApiServerDirectExecution = (
  entryPath = process.argv[1],
): boolean => typeof entryPath === "string"
  && resolve(entryPath) === CAMPAIGN_OS_API_SERVER_ENTRY_PATH;

if (isCampaignOsApiServerDirectExecution() && process.argv.includes("--listen")) {
  startCampaignOsApiServer().catch((error: unknown) => {
    console.error("[campaign-os-api-runtime] failed to start", error);
    process.exitCode = 1;
  });
}
