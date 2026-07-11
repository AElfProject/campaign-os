import type { LocalizedText } from "../domain/types";
import { contractWriterRequiredConfigKeys } from "../domain/contractWriterRuntime";

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
export type BackendRuntimeReleaseScope =
  | "excluded_from_mvp"
  | "future_production"
  | "mvp_release_required"
  | "production_required";

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
  futureProductionOnly: boolean;
  id: string;
  mvpReleaseRequired: boolean;
  releaseScope: BackendRuntimeReleaseScope;
  requiredBeforeProduction: true;
  status: "blocked" | "deferred";
}

type BackendRuntimeReadinessDependencyBlockerInput =
  & Omit<BackendRuntimeReadinessDependencyBlocker, "futureProductionOnly" | "mvpReleaseRequired" | "releaseScope">
  & Partial<Pick<BackendRuntimeReadinessDependencyBlocker, "futureProductionOnly" | "mvpReleaseRequired" | "releaseScope">>;

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

export interface BackendRuntimeReadinessDbPackageBindingSummary {
  bindingId: string;
  blockerCount: number;
  browserBundleAllowed: false;
  dbClientConstructed: false;
  diagnosticCodes: readonly string[];
  liveConnectionAttempted: false;
  liveContractWritesEnabled: false;
  liveMigrationExecutionEnabled: false;
  liveProductionMutationEnabled: false;
  liveProviderCallsEnabled: false;
  liveQueryExecutionEnabled: false;
  liveRewardCustodyEnabled: false;
  liveRewardDistributionEnabled: false;
  liveStorageWritesEnabled: false;
  liveTransactionExecutionEnabled: false;
  packageName: "pg";
  packageRef: "npm:pg";
  productionReady: false;
  requiredConfigKeys: readonly string[];
  secretValueExposed: false;
  status: string;
  valid: boolean;
}

export interface BackendRuntimeReadinessSummary {
  databasePackageBinding: BackendRuntimeReadinessDbPackageBindingSummary;
  deployHandoff: BackendRuntimeReadinessDeployHandoff;
  diagnostics: readonly BackendRuntimeReadinessDiagnosticSummary[];
  generatedAt: string;
  id: "production-backend-runtime-readiness";
  noLiveSideEffects: BackendRuntimeReadinessNoLiveSideEffects;
  futureProductionBlockerIds: readonly string[];
  mvpReleaseBlockerIds: readonly string[];
  mvpReleaseReady: boolean;
  productionDependencyBlockers: readonly BackendRuntimeReadinessDependencyBlocker[];
  productionReady: false;
  profile: BackendRuntimeReadinessProfile;
  routeCoverage: BackendRuntimeReadinessRouteCoverage;
  status: BackendRuntimeReadinessSummaryStatus;
  tracePolicy: BackendRuntimeReadinessTracePolicy;
}

export type BackendRuntimePersistencePostureStatus =
  | "durable_local"
  | "memory_review"
  | "production_deferred"
  | "unavailable"
  | "unknown";

export interface BackendRuntimePersistenceRecordPreview {
  createdAt?: string;
  kind: string;
  routeId?: string;
  traceId?: string;
}

export interface BackendRuntimePersistenceSafetyFlags {
  durable: boolean;
  localOnly: boolean;
  noMigrationRunner: boolean;
  noProductionDatabase: boolean;
  noSecretHandling: boolean;
}

export interface BackendRuntimePersistencePosture {
  adapterLabel?: string;
  diagnosticCodes: readonly string[];
  latestRecords: readonly BackendRuntimePersistenceRecordPreview[];
  mode: "local_json" | "memory" | "production_deferred" | "unknown";
  nextAction: LocalizedText;
  recordCount: number;
  safety: BackendRuntimePersistenceSafetyFlags;
  status: BackendRuntimePersistencePostureStatus;
  statusLabel: LocalizedText;
}

export interface BackendRuntimeReadinessApiBridgeState {
  boundary: LocalizedText;
  configured: boolean;
  diagnostics: readonly BackendRuntimeReadinessApiDiagnostic[];
  loading: boolean;
  persistencePosture?: BackendRuntimePersistencePosture;
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
  [/\/(?:Users|var|tmp|private\/var)\/[^"'\s<>]*/gi, "redacted local path"],
  [/[A-Z]:\\[^"'\s<>]*/gi, "redacted local path"],
  [/(^|[\/\\])(?:docs\/current|kitty-specs|evidence|sync|\.agents|\.kittify)([\/\\][^"'\s<>]*)?/gi, " redacted private artifact"],
  [/\bprovider[-_\s]*payload\b/gi, "redacted provider data"],
  [/\bprovider[-_\s]*call\b/gi, "redacted provider call"],
  [/\bstack\s*trace\b/gi, "redacted stack"],
  [/\bsigned[-_\s]*url\b/gi, "redacted signed link"],
  [/\bobject[-_\s]*key\b/gi, "redacted object reference"],
  [/\bstorage[-_\s]*key\b/gi, "redacted storage reference"],
  [/\bwallet[-_\s]*signature\b/gi, "redacted wallet action"],
];

const seededDatabasePackageBindingRequiredConfigKeys = [
  "CAMPAIGN_OS_DATABASE_PACKAGE",
  "CAMPAIGN_OS_DATABASE_PACKAGE_BINDING",
  "CAMPAIGN_OS_DATABASE_PROVIDER",
  "CAMPAIGN_OS_DATABASE_URL",
  "CAMPAIGN_OS_DATABASE_SECRET_REF",
  "CAMPAIGN_OS_DATABASE_POOL_POLICY",
  "CAMPAIGN_OS_DATABASE_MIGRATION_APPROVAL",
  "CAMPAIGN_OS_DATABASE_ROLLBACK_BACKUP_PLAN",
  "CAMPAIGN_OS_DATABASE_OBSERVABILITY_REF",
  "CAMPAIGN_OS_DATABASE_RUNBOOK_URL",
  "CAMPAIGN_OS_DATABASE_LIVE_ENABLEMENT",
] as const;

export const seededBackendRuntimeReadinessSummary: BackendRuntimeReadinessSummary = {
  databasePackageBinding: {
    bindingId: "campaign-os-postgresql-package-binding-local",
    blockerCount: 0,
    browserBundleAllowed: false,
    dbClientConstructed: false,
    diagnosticCodes: [],
    liveConnectionAttempted: false,
    liveContractWritesEnabled: false,
    liveMigrationExecutionEnabled: false,
    liveProductionMutationEnabled: false,
    liveProviderCallsEnabled: false,
    liveQueryExecutionEnabled: false,
    liveRewardCustodyEnabled: false,
    liveRewardDistributionEnabled: false,
    liveStorageWritesEnabled: false,
    liveTransactionExecutionEnabled: false,
    packageName: "pg",
    packageRef: "npm:pg",
    productionReady: false,
    requiredConfigKeys: [...seededDatabasePackageBindingRequiredConfigKeys],
    secretValueExposed: false,
    status: "local_ready",
    valid: true,
  },
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
  futureProductionBlockerIds: ["reward-custody", "reward-distribution"],
  mvpReleaseBlockerIds: ["backend-readiness-api-unavailable"],
  mvpReleaseReady: false,
  productionDependencyBlockers: [
    {
      area: "database",
      attachPoint: "src/server/productionDatabase.ts",
      blockedBy: ["production database driver"],
      futureProductionOnly: false,
      id: "live-database-driver",
      mvpReleaseRequired: false,
      releaseScope: "production_required",
      requiredBeforeProduction: true,
      status: "blocked",
    },
    {
      area: "contract",
      attachPoint: "src/server/servicePorts.ts",
      blockedBy: [...contractWriterRequiredConfigKeys],
      futureProductionOnly: false,
      id: "contract-writer",
      mvpReleaseRequired: false,
      releaseScope: "production_required",
      requiredBeforeProduction: true,
      status: "blocked",
    },
    {
      area: "reward",
      attachPoint: "src/server/servicePorts.ts",
      blockedBy: ["reward custody mission", "finance/security review"],
      futureProductionOnly: true,
      id: "reward-custody",
      mvpReleaseRequired: false,
      releaseScope: "excluded_from_mvp",
      requiredBeforeProduction: true,
      status: "blocked",
    },
    {
      area: "reward",
      attachPoint: "src/server/servicePorts.ts",
      blockedBy: ["reward distribution mission"],
      futureProductionOnly: true,
      id: "reward-distribution",
      mvpReleaseRequired: false,
      releaseScope: "excluded_from_mvp",
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

export const seededBackendRuntimePersistencePosture: BackendRuntimePersistencePosture = {
  diagnosticCodes: [],
  latestRecords: [],
  mode: "memory",
  nextAction: {
    "en-US": "Configure durable local persistence to prove review records survive restart.",
    "zh-CN": "配置 durable local persistence，以证明 review 记录可在重启后保留。",
    "zh-TW": "設定 durable local persistence，以證明 review 記錄可在重啟後保留。",
  },
  recordCount: 0,
  safety: {
    durable: false,
    localOnly: true,
    noMigrationRunner: true,
    noProductionDatabase: true,
    noSecretHandling: true,
  },
  status: "memory_review",
  statusLabel: {
    "en-US": "Memory-only review persistence",
    "zh-CN": "Memory-only review persistence",
    "zh-TW": "Memory-only review persistence",
  },
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readNestedRecord = (
  value: unknown,
  path: string[],
): Record<string, unknown> | undefined => {
  let current: unknown = value;

  for (const segment of path) {
    if (!isRecord(current)) {
      return undefined;
    }

    current = current[segment];
  }

  return isRecord(current) ? current : undefined;
};

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

const isDatabasePackageConfigKey = (value: string): boolean =>
  /^CAMPAIGN_OS_DATABASE_[A-Z0-9_]+$/.test(value);

const isValidSummaryStatus = (value: unknown): value is BackendRuntimeReadinessSummaryStatus =>
  value === "blocked" || value === "ready" || value === "scaffold";

const isValidProfileId = (value: unknown): value is BackendRuntimeReadinessProfile["id"] =>
  value === "local-review" || value === "production-required" || value === "staging-scaffold";

const isValidBlockerStatus = (
  value: unknown,
): value is BackendRuntimeReadinessDependencyBlocker["status"] =>
  value === "blocked" || value === "deferred";

const isReleaseScope = (value: unknown): value is BackendRuntimeReleaseScope =>
  value === "excluded_from_mvp"
  || value === "future_production"
  || value === "mvp_release_required"
  || value === "production_required";

const releaseScopeFrom = (value: unknown): BackendRuntimeReleaseScope =>
  isReleaseScope(value) ? value : "production_required";

const futureProductionOnlyFrom = (
  value: unknown,
  releaseScope: BackendRuntimeReleaseScope,
): boolean =>
  typeof value === "boolean"
    ? value
    : releaseScope === "excluded_from_mvp" || releaseScope === "future_production";

const mvpReleaseRequiredFrom = (
  value: unknown,
  releaseScope: BackendRuntimeReleaseScope,
): boolean =>
  typeof value === "boolean" ? value : releaseScope === "mvp_release_required";

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

const safeString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim()
    ? sanitizeBackendRuntimeReadinessApiText(value)
    : undefined;

const numberValue = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const recordArray = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter(isRecord) : [];

const diagnosticCodesFrom = (value: unknown): string[] =>
  stringArray(value)?.map(sanitizeBackendRuntimeReadinessApiText) ?? [];

const explicitFalseFrom = (
  record: Record<string, unknown>,
  fallback: Record<string, unknown> | undefined,
  key: string,
): boolean =>
  record[key] === false || (record[key] === undefined && fallback?.[key] === false);

const normalizeDatabasePackageBinding = (
  value: unknown,
): BackendRuntimeReadinessDbPackageBindingSummary | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const noLiveFlags = readNestedRecord(value, ["noLiveFlags"]);
  const bindingId = safeString(value.bindingId);
  const status = safeString(value.status);
  const requiredConfigKeys = stringArray(value.requiredConfigKeys);
  const liveFlagKeys = [
    "browserBundleAllowed",
    "dbClientConstructed",
    "liveConnectionAttempted",
    "liveContractWritesEnabled",
    "liveMigrationExecutionEnabled",
    "liveProductionMutationEnabled",
    "liveProviderCallsEnabled",
    "liveQueryExecutionEnabled",
    "liveRewardCustodyEnabled",
    "liveRewardDistributionEnabled",
    "liveStorageWritesEnabled",
    "liveTransactionExecutionEnabled",
    "secretValueExposed",
  ];

  if (
    !bindingId
    || !status
    || value.packageName !== "pg"
    || value.packageRef !== "npm:pg"
    || value.productionReady !== false
    || typeof value.blockerCount !== "number"
    || !Number.isFinite(value.blockerCount)
    || requiredConfigKeys === undefined
    || !requiredConfigKeys.every(isDatabasePackageConfigKey)
    || stringArray(value.diagnosticCodes) === undefined
    || typeof value.valid !== "boolean"
    || !liveFlagKeys.every((key) => explicitFalseFrom(value, noLiveFlags, key))
  ) {
    return undefined;
  }

  return {
    bindingId,
    blockerCount: numberValue(value.blockerCount),
    browserBundleAllowed: false,
    dbClientConstructed: false,
    diagnosticCodes: diagnosticCodesFrom(value.diagnosticCodes),
    liveConnectionAttempted: false,
    liveContractWritesEnabled: false,
    liveMigrationExecutionEnabled: false,
    liveProductionMutationEnabled: false,
    liveProviderCallsEnabled: false,
    liveQueryExecutionEnabled: false,
    liveRewardCustodyEnabled: false,
    liveRewardDistributionEnabled: false,
    liveStorageWritesEnabled: false,
    liveTransactionExecutionEnabled: false,
    packageName: "pg",
    packageRef: "npm:pg",
    productionReady: false,
    requiredConfigKeys: uniqueSafeStrings(requiredConfigKeys),
    secretValueExposed: false,
    status,
    valid: value.valid === true,
  };
};

const persistenceStatusLabel = (
  status: BackendRuntimePersistencePostureStatus,
): LocalizedText => {
  const labels: Record<BackendRuntimePersistencePostureStatus, LocalizedText> = {
    durable_local: {
      "en-US": "Durable local review persistence",
      "zh-CN": "Durable local review persistence",
      "zh-TW": "Durable local review persistence",
    },
    memory_review: {
      "en-US": "Memory-only review persistence",
      "zh-CN": "Memory-only review persistence",
      "zh-TW": "Memory-only review persistence",
    },
    production_deferred: {
      "en-US": "Production persistence deferred",
      "zh-CN": "Production persistence deferred",
      "zh-TW": "Production persistence deferred",
    },
    unavailable: {
      "en-US": "Durable local persistence unavailable",
      "zh-CN": "Durable local persistence unavailable",
      "zh-TW": "Durable local persistence unavailable",
    },
    unknown: {
      "en-US": "Persistence posture unavailable",
      "zh-CN": "Persistence posture unavailable",
      "zh-TW": "Persistence posture unavailable",
    },
  };

  return labels[status];
};

const persistenceNextAction = (
  status: BackendRuntimePersistencePostureStatus,
): LocalizedText => {
  const actions: Record<BackendRuntimePersistencePostureStatus, LocalizedText> = {
    durable_local: {
      "en-US": "Review persisted local records before restart-sensitive handoff.",
      "zh-CN": "在重启敏感的交付前 review 已持久化的本地记录。",
      "zh-TW": "在重啟敏感的交付前 review 已持久化的本地記錄。",
    },
    memory_review: seededBackendRuntimePersistencePosture.nextAction,
    production_deferred: {
      "en-US": "Keep production database and migration work deferred to a backend mission.",
      "zh-CN": "生产数据库与 migration 工作继续 defer 到后端 mission。",
      "zh-TW": "生產資料庫與 migration 工作繼續 defer 到後端 mission。",
    },
    unavailable: {
      "en-US": "Set CAMPAIGN_OS_PERSISTENCE_DIR for local_json review or switch back to memory review.",
      "zh-CN": "为 local_json review 设置 CAMPAIGN_OS_PERSISTENCE_DIR，或切回 memory review。",
      "zh-TW": "為 local_json review 設定 CAMPAIGN_OS_PERSISTENCE_DIR，或切回 memory review。",
    },
    unknown: {
      "en-US": "Check /api/health persistence metadata before relying on restart behavior.",
      "zh-CN": "依赖重启行为前，先检查 /api/health persistence metadata。",
      "zh-TW": "依賴重啟行為前，先檢查 /api/health persistence metadata。",
    },
  };

  return actions[status];
};

const normalizeLatestRecords = (
  records: unknown,
): BackendRuntimePersistenceRecordPreview[] =>
  recordArray(records).slice(0, 5).map((record) => ({
    ...(safeString(record.createdAt) ? { createdAt: safeString(record.createdAt) } : {}),
    kind: safeString(record.kind) ?? "unknown",
    ...(safeString(record.routeId) ? { routeId: safeString(record.routeId) } : {}),
    ...(safeString(record.traceId) ? { traceId: safeString(record.traceId) } : {}),
  }));

const normalizePersistenceHealth = (
  persistence: Record<string, unknown>,
): BackendRuntimePersistencePosture => {
  const rawMode = persistence.mode;
  const mode =
    rawMode === "local_json" || rawMode === "memory" ? rawMode : "unknown";
  const status =
    persistence.status === "unavailable"
      ? "unavailable"
      : mode === "local_json" && persistence.durable === true
        ? "durable_local"
        : mode === "memory"
          ? "memory_review"
          : "unknown";

  return {
    ...(safeString(persistence.adapterLabel) ? { adapterLabel: safeString(persistence.adapterLabel) } : {}),
    diagnosticCodes: diagnosticCodesFrom(persistence.diagnosticCodes),
    latestRecords: normalizeLatestRecords(persistence.latestRecords),
    mode,
    nextAction: persistenceNextAction(status),
    recordCount: numberValue(persistence.recordCount),
    safety: {
      durable: persistence.durable === true,
      localOnly: persistence.localOnly === true,
      noMigrationRunner: persistence.noMigrationRunner === true,
      noProductionDatabase: persistence.noProductionDatabase === true,
      noSecretHandling: persistence.noSecretHandling === true,
    },
    status,
    statusLabel: persistenceStatusLabel(status),
  };
};

const productionDeferredPersistencePosture = (): BackendRuntimePersistencePosture => ({
  ...seededBackendRuntimePersistencePosture,
  diagnosticCodes: ["PRODUCTION_PERSISTENCE_DEFERRED"],
  mode: "production_deferred",
  nextAction: persistenceNextAction("production_deferred"),
  status: "production_deferred",
  statusLabel: persistenceStatusLabel("production_deferred"),
});

const errorPersistencePosture = (body: unknown): BackendRuntimePersistencePosture | undefined => {
  if (!isApiEnvelope(body) || body.ok !== false || !isRecord(body.error)) {
    return undefined;
  }

  const details = isRecord(body.error.details) ? body.error.details : {};
  const field = safeString(details.field);
  const diagnosticCodes = diagnosticCodesFrom(details.diagnosticCodes);
  const persistenceMode = safeString(details.persistenceMode);

  if (field !== "runtimeConfig.persistence.localDataDir" && persistenceMode !== "local_json") {
    return undefined;
  }

  return {
    diagnosticCodes,
    latestRecords: [],
    mode: "local_json",
    nextAction: persistenceNextAction("unavailable"),
    recordCount: 0,
    safety: {
      durable: true,
      localOnly: true,
      noMigrationRunner: true,
      noProductionDatabase: true,
      noSecretHandling: true,
    },
    status: "unavailable",
    statusLabel: persistenceStatusLabel("unavailable"),
  };
};

const persistencePostureFromEnvelope = (
  body: unknown,
  summary?: BackendRuntimeReadinessSummary,
): BackendRuntimePersistencePosture => {
  if (isApiEnvelope(body) && isRecord(body.data) && isRecord(body.data.persistence)) {
    return normalizePersistenceHealth(body.data.persistence);
  }

  const errorPosture = errorPersistencePosture(body);

  if (errorPosture) {
    return errorPosture;
  }

  if (summary?.status === "blocked" || summary?.profile.id === "production-required") {
    return productionDeferredPersistencePosture();
  }

  return seededBackendRuntimePersistencePosture;
};

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

const isDependencyBlocker = (value: unknown): value is BackendRuntimeReadinessDependencyBlockerInput =>
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

const uniqueSafeStrings = (values: readonly string[]): string[] => {
  const seen = new Set<string>();

  return values.reduce<string[]>((items, value) => {
    const safeValue = safeString(value);

    if (!safeValue || seen.has(safeValue)) {
      return items;
    }

    seen.add(safeValue);
    items.push(safeValue);
    return items;
  }, []);
};

const normalizeDependencyBlockers = (
  blockers: readonly BackendRuntimeReadinessDependencyBlockerInput[],
): BackendRuntimeReadinessDependencyBlocker[] => {
  const areaLabels = uniqueSafeStrings(blockers.map((blocker) => blocker.area));
  const reservedLabels = new Set(areaLabels);
  const blockedByLabels = new Set(areaLabels);
  const grouped = new Map<string, BackendRuntimeReadinessDependencyBlocker>();

  for (const area of areaLabels) {
    const firstBlocker = blockers.find((blocker) => safeString(blocker.area) === area);

    if (!firstBlocker) {
      continue;
    }

    const releaseScope = releaseScopeFrom(firstBlocker.releaseScope);

    grouped.set(area, {
      area,
      attachPoint: safeString(firstBlocker.attachPoint) ?? "runtime readiness",
      blockedBy: [],
      futureProductionOnly: futureProductionOnlyFrom(firstBlocker.futureProductionOnly, releaseScope),
      id: safeString(firstBlocker.id) ?? area,
      mvpReleaseRequired: mvpReleaseRequiredFrom(firstBlocker.mvpReleaseRequired, releaseScope),
      releaseScope,
      requiredBeforeProduction: true,
      status: firstBlocker.status,
    });
  }

  for (const blocker of blockers) {
    const area = safeString(blocker.area);
    const groupedBlocker = area ? grouped.get(area) : undefined;

    if (!groupedBlocker) {
      continue;
    }

    if (blocker.status === "blocked") {
      groupedBlocker.status = "blocked";
    }

    const releaseScope = releaseScopeFrom(blocker.releaseScope);
    groupedBlocker.futureProductionOnly = groupedBlocker.futureProductionOnly
      || futureProductionOnlyFrom(blocker.futureProductionOnly, releaseScope);
    groupedBlocker.mvpReleaseRequired = groupedBlocker.mvpReleaseRequired
      || mvpReleaseRequiredFrom(blocker.mvpReleaseRequired, releaseScope);
    if (groupedBlocker.releaseScope === "production_required" && releaseScope !== "production_required") {
      groupedBlocker.releaseScope = releaseScope;
    }

    const nextBlockedBy = uniqueSafeStrings(blocker.blockedBy).filter((label) => {
      if (blockedByLabels.has(label) || reservedLabels.has(label)) {
        return false;
      }

      blockedByLabels.add(label);
      return true;
    });

    groupedBlocker.blockedBy = [
      ...groupedBlocker.blockedBy,
      ...nextBlockedBy,
    ];
  }

  return Array.from(grouped.values());
};

const uniqueStringArrayFrom = (value: unknown): string[] | undefined => {
  const values = stringArray(value);

  return values ? uniqueSafeStrings(values) : undefined;
};

const releaseScopeIdsFrom = (
  summary: Record<string, unknown>,
  activation: Record<string, unknown> | undefined,
  summaryKey: "futureProductionBlockerIds" | "mvpReleaseBlockerIds",
  activationKey: "futureProductionBlockerIds" | "mvpReleaseBlockerIds",
  deploymentHandoffKey: "futureProduction" | "requiredBeforeMvpRelease",
): string[] => {
  const deploymentHandoff = readNestedRecord(activation, ["deploymentHandoff"]);

  return uniqueStringArrayFrom(summary[summaryKey])
    ?? uniqueStringArrayFrom(activation?.[activationKey])
    ?? uniqueStringArrayFrom(deploymentHandoff?.[deploymentHandoffKey])
    ?? [];
};

const normalizeReadinessSummary = (
  summary: BackendRuntimeReadinessSummary,
  activation?: Record<string, unknown>,
): BackendRuntimeReadinessSummary => {
  const summaryRecord = summary as unknown as Record<string, unknown>;
  const mvpReleaseBlockerIds = releaseScopeIdsFrom(
    summaryRecord,
    activation,
    "mvpReleaseBlockerIds",
    "mvpReleaseBlockerIds",
    "requiredBeforeMvpRelease",
  );
  const futureProductionBlockerIds = releaseScopeIdsFrom(
    summaryRecord,
    activation,
    "futureProductionBlockerIds",
    "futureProductionBlockerIds",
    "futureProduction",
  );
  const runtimeMvpReleaseReady = summaryRecord.mvpReleaseReady === true || activation?.mvpReleaseReady === true;

  return {
    ...summary,
    databasePackageBinding: {
      ...summary.databasePackageBinding,
      bindingId: sanitizeBackendRuntimeReadinessApiText(summary.databasePackageBinding.bindingId),
      diagnosticCodes: uniqueSafeStrings(summary.databasePackageBinding.diagnosticCodes),
      requiredConfigKeys: uniqueSafeStrings(summary.databasePackageBinding.requiredConfigKeys),
      status: sanitizeBackendRuntimeReadinessApiText(summary.databasePackageBinding.status),
    },
    diagnostics: summary.diagnostics.map((diagnostic) => ({
      ...diagnostic,
      code: sanitizeBackendRuntimeReadinessApiText(diagnostic.code),
      message: sanitizeBackendRuntimeReadinessApiText(diagnostic.message),
    })),
    futureProductionBlockerIds,
    mvpReleaseBlockerIds,
    mvpReleaseReady: runtimeMvpReleaseReady && mvpReleaseBlockerIds.length === 0,
    productionDependencyBlockers: normalizeDependencyBlockers(summary.productionDependencyBlockers),
    profile: {
      ...summary.profile,
      configuredRequiredConfigKeys: uniqueSafeStrings(summary.profile.configuredRequiredConfigKeys),
      label: sanitizeBackendRuntimeReadinessApiText(summary.profile.label),
      missingRequiredConfigKeys: uniqueSafeStrings(summary.profile.missingRequiredConfigKeys),
      requiredConfigKeys: uniqueSafeStrings(summary.profile.requiredConfigKeys),
      status: sanitizeBackendRuntimeReadinessApiText(summary.profile.status),
      supportMode: sanitizeBackendRuntimeReadinessApiText(summary.profile.supportMode),
    },
    routeCoverage: {
      ...summary.routeCoverage,
      missingApiSkillIds: uniqueSafeStrings(summary.routeCoverage.missingApiSkillIds),
      routeIds: uniqueSafeStrings(summary.routeCoverage.routeIds),
    },
  };
};

const readinessSummaryFromEnvelope = (body: unknown): BackendRuntimeReadinessSummary | undefined => {
  if (!isApiEnvelope(body) || !body.ok || !isRecord(body.data)) {
    return undefined;
  }

  const summary = body.data.productionBackendReadiness;
  const activation = readNestedRecord(body.data, ["activation"])
    ?? readNestedRecord(body.data, ["backendService", "activation"]);
  const activationDependencyBlockers = recordArray(activation?.productionDependencyBlockers);
  const productionDependencyBlockers = activationDependencyBlockers.length > 0
    ? activationDependencyBlockers
    : recordArray(isRecord(summary) ? summary.productionDependencyBlockers : undefined);
  const databasePackageBinding = normalizeDatabasePackageBinding(
    readNestedRecord(summary, ["databasePackageBinding"])
    ?? readNestedRecord(body.data, ["backendService", "databaseAdapterRuntime", "packageBinding"])
    ?? readNestedRecord(body.data, ["serverRuntime", "readiness", "databaseAdapterRuntime", "packageBinding"]),
  );

  if (
    !isRecord(summary)
    || databasePackageBinding === undefined
    || summary.id !== "production-backend-runtime-readiness"
    || !isValidSummaryStatus(summary.status)
    || summary.productionReady !== false
    || typeof summary.generatedAt !== "string"
    || !isProfile(summary.profile)
    || !isRouteCoverage(summary.routeCoverage)
    || !isDeployHandoff(summary.deployHandoff)
    || !isTracePolicy(summary.tracePolicy)
    || !noLiveSideEffectsValid(summary.noLiveSideEffects)
    || productionDependencyBlockers.length === 0
    || !productionDependencyBlockers.every(isDependencyBlocker)
    || !Array.isArray(summary.diagnostics)
    || !summary.diagnostics.every(isDiagnosticSummary)
  ) {
    return undefined;
  }

  return normalizeReadinessSummary({
    ...summary,
    databasePackageBinding,
    productionDependencyBlockers,
  } as unknown as BackendRuntimeReadinessSummary, activation);
};

const fallbackState = ({
  configured,
  diagnostics,
  persistencePosture = seededBackendRuntimePersistencePosture,
  status,
  traceId,
}: {
  configured: boolean;
  diagnostics: readonly BackendRuntimeReadinessApiDiagnostic[];
  persistencePosture?: BackendRuntimePersistencePosture;
  status: Extract<BackendRuntimeReadinessApiStatus, "error" | "fallback">;
  traceId?: string;
}): BackendRuntimeReadinessApiBridgeState => ({
  boundary: backendRuntimeReadinessApiBoundary,
  configured,
  diagnostics,
  loading: false,
  persistencePosture,
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
  persistencePosture: seededBackendRuntimePersistencePosture,
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
      persistencePosture: persistencePostureFromEnvelope(health.body),
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
      persistencePosture: persistencePostureFromEnvelope(health.body, healthSummary),
      status: "error",
      traceId: contracts.traceId ?? extractTraceId(contracts.body) ?? health.traceId,
    });
  }

  return {
    boundary: backendRuntimeReadinessApiBoundary,
    configured: true,
    diagnostics: [],
    loading: false,
    persistencePosture: persistencePostureFromEnvelope(health.body, contractsSummary),
    source: "api_runtime",
    status: contractsSummary.status,
    summary: contractsSummary,
    traceId: contracts.traceId ?? extractTraceId(contracts.body) ?? health.traceId,
  };
};
