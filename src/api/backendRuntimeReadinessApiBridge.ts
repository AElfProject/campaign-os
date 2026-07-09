import type { LocalizedText } from "../domain/types";

export type BackendRuntimeReadinessApiSource =
  | "api_runtime"
  | "error_fallback"
  | "loading"
  | "seeded_fallback";

export type BackendRuntimeReadinessApiStatus =
  | "blocked"
  | "error"
  | "fallback"
  | "loading"
  | "ready"
  | "scaffold";

export type BackendRuntimeReadinessSummaryStatus = "blocked" | "ready" | "scaffold";

export interface BackendRuntimeReadinessApiConfig {
  baseUrl?: string;
  timeoutMs?: number;
  tracePrefix?: string;
}

export interface BackendRuntimeReadinessApiDiagnostic {
  code:
    | "API_BASE_URL_INVALID"
    | "API_BASE_URL_MISSING"
    | "API_CONTRACTS_FAILED"
    | "API_HEALTH_FAILED"
    | "API_REQUEST_FAILED"
    | "API_REQUEST_TIMEOUT"
    | "API_RESPONSE_INVALID";
  message: LocalizedText;
  safeDetails?: Record<string, boolean | number | string>;
  severity: "error" | "info" | "warning";
}

export interface BackendRuntimeReadinessProfile {
  configuredRequiredConfigKeys: readonly string[];
  externalNetworkAllowed: boolean;
  id: "local-review" | "production-required" | "staging-scaffold";
  label: string;
  missingRequiredConfigKeys: readonly string[];
  requiredConfigKeys: readonly string[];
  requiresSecrets: boolean;
  secretValuesExposed: false;
  status: string;
  supportMode: string;
}

export interface BackendRuntimeReadinessRouteCoverage {
  blockedCount: number;
  coveredApiSkillCount: number;
  localOnlyCount: number;
  missingApiSkillIds: readonly string[];
  readyCount: number;
  requiredApiSkillCount: number;
  reviewRequiredCount: number;
  routeCount: number;
  routeIds: readonly string[];
  runtimeRouteCount: number;
}

export interface BackendRuntimeReadinessDeployHandoff {
  contractsEndpoint: "/api/contracts";
  healthEndpoint: "/api/health";
  runtimeTarget: "api_service";
  shutdownTimeoutMs: number;
  smokeCommand: "npm run server:smoke";
  startCommand: "npm run server:start";
  traceHeaderName: "x-campaign-os-trace-id";
}

export interface BackendRuntimeReadinessTracePolicy {
  failureEnvelopeTraceId: true;
  startupLogIncludesTracePolicy: true;
  successEnvelopeTraceId: true;
  traceHeaderName: "x-campaign-os-trace-id";
}

export interface BackendRuntimeReadinessDependencyBlocker {
  area: string;
  attachPoint: string;
  blockedBy: readonly string[];
  id: string;
  requiredBeforeProduction: true;
  status: "blocked" | "deferred";
}

export interface BackendRuntimeReadinessDiagnosticSummary {
  code: string;
  message: string;
  safeDetails?: Record<string, boolean | number | string>;
  severity: "error" | "info" | "warning";
}

export interface BackendRuntimeReadinessNoLiveSideEffects {
  analyticsWarehouseWriteExecuted: false;
  authProviderConnected: false;
  contractWriteExecuted: false;
  objectStorageWriteExecuted: false;
  productionDatabaseConnected: false;
  providerNetworkExecuted: false;
  queueWorkerExecuted: false;
  rewardCustodyExecuted: false;
  rewardDistributionExecuted: false;
  schedulerExecuted: false;
  walletSdkExecuted: false;
}

export interface BackendRuntimeReadinessSummary {
  deployHandoff: BackendRuntimeReadinessDeployHandoff;
  diagnostics: readonly BackendRuntimeReadinessDiagnosticSummary[];
  generatedAt: string;
  id: "production-backend-runtime-readiness";
  noLiveSideEffects: BackendRuntimeReadinessNoLiveSideEffects;
  productionDependencyBlockers: readonly BackendRuntimeReadinessDependencyBlocker[];
  productionReady: false;
  profile: BackendRuntimeReadinessProfile;
  routeCoverage: BackendRuntimeReadinessRouteCoverage;
  status: BackendRuntimeReadinessSummaryStatus;
  tracePolicy: BackendRuntimeReadinessTracePolicy;
}

export interface BackendRuntimeReadinessApiBridgeState {
  boundary: LocalizedText;
  configured: boolean;
  diagnostics: readonly BackendRuntimeReadinessApiDiagnostic[];
  loading: boolean;
  source: BackendRuntimeReadinessApiSource;
  status: BackendRuntimeReadinessApiStatus;
  summary: BackendRuntimeReadinessSummary;
  traceId?: string;
}

export type BackendRuntimeReadinessApiFetch = typeof fetch;

interface LoadBackendRuntimeReadinessApiBridgeStateInput {
  config?: BackendRuntimeReadinessApiConfig;
  fetchImpl?: BackendRuntimeReadinessApiFetch;
}

interface NormalizedConfig {
  baseUrl?: URL;
  configured: boolean;
  diagnostic?: BackendRuntimeReadinessApiDiagnostic;
  normalizedTracePrefix: string;
  timeoutMs: number;
}

interface FetchJsonResult {
  body?: unknown;
  diagnostic?: BackendRuntimeReadinessApiDiagnostic;
  ok: boolean;
  status?: number;
  traceId?: string;
}

interface ApiRuntimeEnvelope {
  data?: unknown;
  error?: unknown;
  ok: boolean;
  traceId?: unknown;
}

type RuntimeEndpoint = "/api/contracts" | "/api/health";

const defaultTimeoutMs = 1_500;
const minTimeoutMs = 250;
const maxTimeoutMs = 5_000;

export const backendRuntimeReadinessApiBoundary: LocalizedText = {
  "en-US":
    "Local Campaign OS backend runtime readiness review only. No live provider call, production database connection, wallet SDK, contract write, queue worker, scheduler, storage write, analytics warehouse write, reward custody, or reward distribution is executed.",
  "zh-CN":
    "仅用于本地 Campaign OS backend runtime readiness review。不会执行实时 provider 调用、生产数据库连接、钱包 SDK、合约写入、队列 worker、调度器、存储写入、analytics warehouse 写入、奖励托管或发奖。",
  "zh-TW":
    "僅用於本地 Campaign OS backend runtime readiness review。不會執行即時 provider 呼叫、生產資料庫連線、錢包 SDK、合約寫入、佇列 worker、排程器、儲存寫入、analytics warehouse 寫入、獎勵託管或發獎。",
};

const diagnosticMessages: Record<BackendRuntimeReadinessApiDiagnostic["code"], LocalizedText> = {
  API_BASE_URL_INVALID: {
    "en-US": "The local backend readiness API base URL is invalid, so seeded readiness is shown.",
    "zh-CN": "本地 backend readiness API base URL 无效，因此显示 seeded readiness。",
    "zh-TW": "本地 backend readiness API base URL 無效，因此顯示 seeded readiness。",
  },
  API_BASE_URL_MISSING: {
    "en-US": "No local backend readiness API base URL is configured, so seeded readiness is shown.",
    "zh-CN": "未配置本地 backend readiness API base URL，因此显示 seeded readiness。",
    "zh-TW": "未設定本地 backend readiness API base URL，因此顯示 seeded readiness。",
  },
  API_CONTRACTS_FAILED: {
    "en-US": "The local API contracts route did not return usable backend readiness.",
    "zh-CN": "本地 API contracts route 未返回可用 backend readiness。",
    "zh-TW": "本地 API contracts route 未回傳可用 backend readiness。",
  },
  API_HEALTH_FAILED: {
    "en-US": "The local API health route did not return usable backend readiness.",
    "zh-CN": "本地 API health route 未返回可用 backend readiness。",
    "zh-TW": "本地 API health route 未回傳可用 backend readiness。",
  },
  API_REQUEST_FAILED: {
    "en-US": "The local backend readiness API request failed, so seeded readiness remains visible.",
    "zh-CN": "本地 backend readiness API 请求失败，因此继续显示 seeded readiness。",
    "zh-TW": "本地 backend readiness API 請求失敗，因此繼續顯示 seeded readiness。",
  },
  API_REQUEST_TIMEOUT: {
    "en-US": "The local backend readiness API request timed out, so seeded readiness remains visible.",
    "zh-CN": "本地 backend readiness API 请求超时，因此继续显示 seeded readiness。",
    "zh-TW": "本地 backend readiness API 請求逾時，因此繼續顯示 seeded readiness。",
  },
  API_RESPONSE_INVALID: {
    "en-US": "The local backend readiness API response shape was not recognized.",
    "zh-CN": "本地 backend readiness API 响应结构无法识别。",
    "zh-TW": "本地 backend readiness API 回應結構無法識別。",
  },
};

const unsafePatterns: Array<[RegExp, string]> = [
  [/\braw[-_\s]*signature\b/gi, "redacted signature"],
  [/\bprivate[-_\s]*key\b/gi, "redacted key"],
  [/\bseed[-_\s]*phrase\b/gi, "redacted seed"],
  [/\bbearer[-_\s]*token\b/gi, "redacted bearer credential"],
  [/\bbearer\s+[A-Za-z0-9._~+/=-]+/gi, "redacted bearer credential"],
  [/\bpassword\s*[=:]\s*[^&\s"'<>]+/gi, "password=redacted"],
  [/\bapi[-_\s]*key\b/gi, "redacted credential"],
  [/\b(token|access_token|refresh_token|api_key|apikey)=([^&\s"'<>]+)/gi, "redacted query credential"],
  [/\/Users\/[^"'\s<>]*campaign-os-kitty[^"'\s<>]*/gi, "redacted private path"],
  [/\bprovider[-_\s]*payload\b/gi, "redacted provider data"],
  [/\bprovider[-_\s]*call\b/gi, "redacted provider call"],
  [/\bstack\s*trace\b/gi, "redacted stack"],
  [/\bsigned[-_\s]*url\b/gi, "redacted signed link"],
  [/\bobject[-_\s]*key\b/gi, "redacted object reference"],
  [/\bstorage[-_\s]*key\b/gi, "redacted storage reference"],
  [/\bwallet[-_\s]*signature\b/gi, "redacted wallet action"],
];

export const seededBackendRuntimeReadinessSummary: BackendRuntimeReadinessSummary = {
  deployHandoff: {
    contractsEndpoint: "/api/contracts",
    healthEndpoint: "/api/health",
    runtimeTarget: "api_service",
    shutdownTimeoutMs: 5000,
    smokeCommand: "npm run server:smoke",
    startCommand: "npm run server:start",
    traceHeaderName: "x-campaign-os-trace-id",
  },
  diagnostics: [
    {
      code: "PRODUCTION_BACKEND_NO_LIVE_SIDE_EFFECTS",
      message: "Seeded fallback is review-only and does not enable live side effects.",
      severity: "info",
    },
  ],
  generatedAt: "2026-07-09T18:53:49.000Z",
  id: "production-backend-runtime-readiness",
  noLiveSideEffects: {
    analyticsWarehouseWriteExecuted: false,
    authProviderConnected: false,
    contractWriteExecuted: false,
    objectStorageWriteExecuted: false,
    productionDatabaseConnected: false,
    providerNetworkExecuted: false,
    queueWorkerExecuted: false,
    rewardCustodyExecuted: false,
    rewardDistributionExecuted: false,
    schedulerExecuted: false,
    walletSdkExecuted: false,
  },
  productionDependencyBlockers: [
    {
      area: "database",
      attachPoint: "src/server/productionDatabase.ts",
      blockedBy: ["production database driver"],
      id: "live-database-driver",
      requiredBeforeProduction: true,
      status: "blocked",
    },
    {
      area: "contract",
      attachPoint: "src/server/servicePorts.ts",
      blockedBy: ["contract writer mission"],
      id: "contract-writer",
      requiredBeforeProduction: true,
      status: "blocked",
    },
    {
      area: "reward",
      attachPoint: "src/server/servicePorts.ts",
      blockedBy: ["reward distribution mission"],
      id: "reward-distribution",
      requiredBeforeProduction: true,
      status: "blocked",
    },
  ],
  productionReady: false,
  profile: {
    configuredRequiredConfigKeys: [],
    externalNetworkAllowed: false,
    id: "local-review",
    label: "Local review backend scaffold",
    missingRequiredConfigKeys: [],
    requiredConfigKeys: [],
    requiresSecrets: false,
    secretValuesExposed: false,
    status: "ready",
    supportMode: "local_seeded",
  },
  routeCoverage: {
    blockedCount: 0,
    coveredApiSkillCount: 18,
    localOnlyCount: 0,
    missingApiSkillIds: [],
    readyCount: 2,
    requiredApiSkillCount: 18,
    reviewRequiredCount: 0,
    routeCount: 2,
    routeIds: ["runtime.health", "runtime.contracts"],
    runtimeRouteCount: 2,
  },
  status: "ready",
  tracePolicy: {
    failureEnvelopeTraceId: true,
    startupLogIncludesTracePolicy: true,
    successEnvelopeTraceId: true,
    traceHeaderName: "x-campaign-os-trace-id",
  },
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const sanitizeBackendRuntimeReadinessApiText = (value: unknown): string => {
  const raw = typeof value === "string" ? value : JSON.stringify(value ?? "");
  const strippedUrlQuery = raw.replace(/\?[^"'\s<>]*/g, "?redacted-query");

  return unsafePatterns.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    strippedUrlQuery,
  );
};

const sanitizeDetailValue = (value: unknown): boolean | number | string => {
  if (typeof value === "boolean" || typeof value === "number") {
    return value;
  }

  return sanitizeBackendRuntimeReadinessApiText(value);
};

const diagnostic = (
  code: BackendRuntimeReadinessApiDiagnostic["code"],
  severity: BackendRuntimeReadinessApiDiagnostic["severity"],
  safeDetails?: Record<string, unknown>,
): BackendRuntimeReadinessApiDiagnostic => {
  const normalizedDetails = safeDetails
    ? Object.fromEntries(
      Object.entries(safeDetails).map(([key, value]) => [
        sanitizeBackendRuntimeReadinessApiText(key),
        sanitizeDetailValue(value),
      ]),
    )
    : undefined;

  return {
    code,
    message: diagnosticMessages[code],
    ...(normalizedDetails ? { safeDetails: normalizedDetails } : {}),
    severity,
  };
};

const clampTimeout = (timeoutMs: number | undefined) => {
  if (!Number.isFinite(timeoutMs)) {
    return defaultTimeoutMs;
  }

  return Math.min(maxTimeoutMs, Math.max(minTimeoutMs, Math.trunc(timeoutMs ?? defaultTimeoutMs)));
};

const normalizeTracePrefix = (tracePrefix: string | undefined) => {
  const sanitized = sanitizeBackendRuntimeReadinessApiText(tracePrefix ?? "backend-readiness-review")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized || "backend-readiness-review";
};

const normalizeConfig = (config: BackendRuntimeReadinessApiConfig | undefined): NormalizedConfig => {
  const timeoutMs = clampTimeout(config?.timeoutMs);
  const normalizedTracePrefix = normalizeTracePrefix(config?.tracePrefix);
  const rawBaseUrl = config?.baseUrl?.trim();

  if (!rawBaseUrl) {
    return {
      configured: false,
      diagnostic: diagnostic("API_BASE_URL_MISSING", "info"),
      normalizedTracePrefix,
      timeoutMs,
    };
  }

  try {
    const baseUrl = new URL(rawBaseUrl);

    if (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:") {
      return {
        configured: true,
        diagnostic: diagnostic("API_BASE_URL_INVALID", "warning", { protocol: baseUrl.protocol }),
        normalizedTracePrefix,
        timeoutMs,
      };
    }

    return { baseUrl, configured: true, normalizedTracePrefix, timeoutMs };
  } catch (error) {
    return {
      configured: true,
      diagnostic: diagnostic("API_BASE_URL_INVALID", "warning", { error }),
      normalizedTracePrefix,
      timeoutMs,
    };
  }
};

const endpointUrl = (baseUrl: URL, endpoint: RuntimeEndpoint) => {
  const next = new URL(baseUrl.toString());

  next.pathname = `${next.pathname.replace(/\/+$/, "")}${endpoint}`;
  next.search = "";
  next.hash = "";

  return next.toString();
};

const createTraceId = (prefix: string, endpoint: RuntimeEndpoint) =>
  `${prefix}-${endpoint.slice("/api/".length)}-${Date.now().toString(36)}`;

const withTimeoutSignal = (timeoutMs: number) => {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return {
    clear: () => globalThis.clearTimeout(timeout),
    signal: controller.signal,
  };
};

const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === "AbortError";

const extractTraceId = (body: unknown): string | undefined =>
  isRecord(body) && typeof body.traceId === "string" && body.traceId.trim()
    ? sanitizeBackendRuntimeReadinessApiText(body.traceId)
    : undefined;

const endpointFailureCode = (
  endpoint: RuntimeEndpoint,
): BackendRuntimeReadinessApiDiagnostic["code"] =>
  endpoint === "/api/health" ? "API_HEALTH_FAILED" : "API_CONTRACTS_FAILED";

const safeFetchJson = async (
  fetchImpl: BackendRuntimeReadinessApiFetch,
  url: string,
  endpoint: RuntimeEndpoint,
  traceId: string,
  timeoutMs: number,
): Promise<FetchJsonResult> => {
  const timeout = withTimeoutSignal(timeoutMs);

  try {
    const response = await fetchImpl(url, {
      headers: {
        accept: "application/json",
        "x-campaign-os-trace-id": traceId,
      },
      method: "GET",
      signal: timeout.signal,
    });
    const body = await response.json().catch((error: unknown) => ({
      jsonError: sanitizeBackendRuntimeReadinessApiText(error),
    }));
    const responseTraceId = extractTraceId(body) ?? response.headers.get("x-campaign-os-trace-id") ?? traceId;
    const failedEnvelope = isRecord(body) && body.ok === false;

    if (!response.ok || failedEnvelope) {
      return {
        body,
        diagnostic: diagnostic(endpointFailureCode(endpoint), "error", {
          endpoint,
          error: isRecord(body) ? body.error : body,
          status: response.status,
        }),
        ok: false,
        status: response.status,
        traceId: sanitizeBackendRuntimeReadinessApiText(responseTraceId),
      };
    }

    return {
      body,
      ok: true,
      status: response.status,
      traceId: sanitizeBackendRuntimeReadinessApiText(responseTraceId),
    };
  } catch (error) {
    return {
      diagnostic: diagnostic(isAbortError(error) ? "API_REQUEST_TIMEOUT" : "API_REQUEST_FAILED", "error", {
        endpoint,
        error,
      }),
      ok: false,
      traceId,
    };
  } finally {
    timeout.clear();
  }
};

const isApiEnvelope = (value: unknown): value is ApiRuntimeEnvelope =>
  isRecord(value) && typeof value.ok === "boolean";

const stringArray = (value: unknown): string[] | undefined =>
  Array.isArray(value) && value.every((item) => typeof item === "string") ? value : undefined;

const isValidSummaryStatus = (value: unknown): value is BackendRuntimeReadinessSummaryStatus =>
  value === "blocked" || value === "ready" || value === "scaffold";

const isValidProfileId = (value: unknown): value is BackendRuntimeReadinessProfile["id"] =>
  value === "local-review" || value === "production-required" || value === "staging-scaffold";

const isValidBlockerStatus = (
  value: unknown,
): value is BackendRuntimeReadinessDependencyBlocker["status"] =>
  value === "blocked" || value === "deferred";

const noLiveSideEffectsValid = (
  value: unknown,
): value is BackendRuntimeReadinessNoLiveSideEffects =>
  isRecord(value)
  && [
    "analyticsWarehouseWriteExecuted",
    "authProviderConnected",
    "contractWriteExecuted",
    "objectStorageWriteExecuted",
    "productionDatabaseConnected",
    "providerNetworkExecuted",
    "queueWorkerExecuted",
    "rewardCustodyExecuted",
    "rewardDistributionExecuted",
    "schedulerExecuted",
    "walletSdkExecuted",
  ].every((key) => value[key] === false);

const isProfile = (value: unknown): value is BackendRuntimeReadinessProfile =>
  isRecord(value)
  && isValidProfileId(value.id)
  && typeof value.label === "string"
  && typeof value.status === "string"
  && typeof value.supportMode === "string"
  && typeof value.requiresSecrets === "boolean"
  && typeof value.externalNetworkAllowed === "boolean"
  && stringArray(value.requiredConfigKeys) !== undefined
  && stringArray(value.missingRequiredConfigKeys) !== undefined
  && stringArray(value.configuredRequiredConfigKeys) !== undefined
  && value.secretValuesExposed === false;

const numberField = (record: Record<string, unknown>, key: string) =>
  typeof record[key] === "number" && Number.isFinite(record[key]);

const isRouteCoverage = (value: unknown): value is BackendRuntimeReadinessRouteCoverage =>
  isRecord(value)
  && [
    "blockedCount",
    "coveredApiSkillCount",
    "localOnlyCount",
    "readyCount",
    "requiredApiSkillCount",
    "reviewRequiredCount",
    "routeCount",
    "runtimeRouteCount",
  ].every((key) => numberField(value, key))
  && stringArray(value.missingApiSkillIds) !== undefined
  && stringArray(value.routeIds) !== undefined;

const isDeployHandoff = (value: unknown): value is BackendRuntimeReadinessDeployHandoff =>
  isRecord(value)
  && value.contractsEndpoint === "/api/contracts"
  && value.healthEndpoint === "/api/health"
  && value.runtimeTarget === "api_service"
  && numberField(value, "shutdownTimeoutMs")
  && value.smokeCommand === "npm run server:smoke"
  && value.startCommand === "npm run server:start"
  && value.traceHeaderName === "x-campaign-os-trace-id";

const isTracePolicy = (value: unknown): value is BackendRuntimeReadinessTracePolicy =>
  isRecord(value)
  && value.failureEnvelopeTraceId === true
  && value.startupLogIncludesTracePolicy === true
  && value.successEnvelopeTraceId === true
  && value.traceHeaderName === "x-campaign-os-trace-id";

const isDependencyBlocker = (value: unknown): value is BackendRuntimeReadinessDependencyBlocker =>
  isRecord(value)
  && typeof value.area === "string"
  && typeof value.attachPoint === "string"
  && stringArray(value.blockedBy) !== undefined
  && typeof value.id === "string"
  && value.requiredBeforeProduction === true
  && isValidBlockerStatus(value.status);

const isDiagnosticSummary = (value: unknown): value is BackendRuntimeReadinessDiagnosticSummary =>
  isRecord(value)
  && typeof value.code === "string"
  && typeof value.message === "string"
  && (value.severity === "error" || value.severity === "info" || value.severity === "warning");

const readinessSummaryFromEnvelope = (body: unknown): BackendRuntimeReadinessSummary | undefined => {
  if (!isApiEnvelope(body) || !body.ok || !isRecord(body.data)) {
    return undefined;
  }

  const summary = body.data.productionBackendReadiness;

  if (
    !isRecord(summary)
    || summary.id !== "production-backend-runtime-readiness"
    || !isValidSummaryStatus(summary.status)
    || summary.productionReady !== false
    || typeof summary.generatedAt !== "string"
    || !isProfile(summary.profile)
    || !isRouteCoverage(summary.routeCoverage)
    || !isDeployHandoff(summary.deployHandoff)
    || !isTracePolicy(summary.tracePolicy)
    || !noLiveSideEffectsValid(summary.noLiveSideEffects)
    || !Array.isArray(summary.productionDependencyBlockers)
    || !summary.productionDependencyBlockers.every(isDependencyBlocker)
    || !Array.isArray(summary.diagnostics)
    || !summary.diagnostics.every(isDiagnosticSummary)
  ) {
    return undefined;
  }

  return summary as unknown as BackendRuntimeReadinessSummary;
};

const fallbackState = ({
  configured,
  diagnostics,
  status,
  traceId,
}: {
  configured: boolean;
  diagnostics: readonly BackendRuntimeReadinessApiDiagnostic[];
  status: Extract<BackendRuntimeReadinessApiStatus, "error" | "fallback">;
  traceId?: string;
}): BackendRuntimeReadinessApiBridgeState => ({
  boundary: backendRuntimeReadinessApiBoundary,
  configured,
  diagnostics,
  loading: false,
  source: status === "error" ? "error_fallback" : "seeded_fallback",
  status,
  summary: seededBackendRuntimeReadinessSummary,
  ...(traceId ? { traceId } : {}),
});

export const createBackendRuntimeReadinessApiLoadingState = (): BackendRuntimeReadinessApiBridgeState => ({
  boundary: backendRuntimeReadinessApiBoundary,
  configured: true,
  diagnostics: [],
  loading: true,
  source: "loading",
  status: "loading",
  summary: seededBackendRuntimeReadinessSummary,
});

export const loadBackendRuntimeReadinessApiBridgeState = async ({
  config,
  fetchImpl = fetch,
}: LoadBackendRuntimeReadinessApiBridgeStateInput = {}): Promise<BackendRuntimeReadinessApiBridgeState> => {
  const normalizedConfig = normalizeConfig(config);

  if (!normalizedConfig.baseUrl) {
    return fallbackState({
      configured: normalizedConfig.configured,
      diagnostics: normalizedConfig.diagnostic ? [normalizedConfig.diagnostic] : [],
      status: "fallback",
    });
  }

  const health = await safeFetchJson(
    fetchImpl,
    endpointUrl(normalizedConfig.baseUrl, "/api/health"),
    "/api/health",
    createTraceId(normalizedConfig.normalizedTracePrefix, "/api/health"),
    normalizedConfig.timeoutMs,
  );
  const healthSummary = readinessSummaryFromEnvelope(health.body);

  if (!health.ok || !healthSummary) {
    return fallbackState({
      configured: true,
      diagnostics: [
        health.diagnostic ?? diagnostic("API_RESPONSE_INVALID", "error", { endpoint: "/api/health" }),
      ],
      status: "error",
      traceId: health.traceId ?? extractTraceId(health.body),
    });
  }

  const contracts = await safeFetchJson(
    fetchImpl,
    endpointUrl(normalizedConfig.baseUrl, "/api/contracts"),
    "/api/contracts",
    createTraceId(normalizedConfig.normalizedTracePrefix, "/api/contracts"),
    normalizedConfig.timeoutMs,
  );
  const contractsSummary = readinessSummaryFromEnvelope(contracts.body);

  if (!contracts.ok || !contractsSummary) {
    return fallbackState({
      configured: true,
      diagnostics: [
        contracts.diagnostic ?? diagnostic("API_RESPONSE_INVALID", "error", { endpoint: "/api/contracts" }),
      ],
      status: "error",
      traceId: contracts.traceId ?? extractTraceId(contracts.body) ?? health.traceId,
    });
  }

  return {
    boundary: backendRuntimeReadinessApiBoundary,
    configured: true,
    diagnostics: [],
    loading: false,
    source: "api_runtime",
    status: contractsSummary.status,
    summary: contractsSummary,
    traceId: contracts.traceId ?? extractTraceId(contracts.body) ?? health.traceId,
  };
};
