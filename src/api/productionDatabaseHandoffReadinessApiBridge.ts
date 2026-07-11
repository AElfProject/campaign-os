import {
  createProductionDatabaseHandoffReadiness,
  productionDatabaseHandoffBoundary,
  productionDatabaseNoLiveFlags,
  sanitizeProductionDatabaseHandoffText,
  type ProductionDatabaseDiagnosticSeverity,
  type ProductionDatabaseHandoffReadiness,
  type ProductionDatabaseRequiredReferenceArea,
} from "../domain/productionDatabaseHandoffReadiness";
import type { LocalizedText } from "../domain/types";

export type ProductionDatabaseHandoffReadinessApiSource =
  | "api_runtime"
  | "seeded_fallback";

export interface ProductionDatabaseHandoffReadinessApiDiagnostic {
  code:
    | "API_BASE_URL_INVALID"
    | "API_BASE_URL_MISSING"
    | "API_PAYLOAD_INVALID"
    | "API_REQUEST_FAILED"
    | "API_REQUEST_TIMEOUT"
    | "API_RESPONSE_MALFORMED";
  message: LocalizedText;
  safeDetails?: Record<string, boolean | number | string>;
  severity: ProductionDatabaseDiagnosticSeverity;
}

export interface ProductionDatabaseHandoffReadinessApiConfig {
  baseUrl?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  tracePrefix?: string;
}

export interface ProductionDatabaseHandoffReadinessApiState {
  configured: boolean;
  diagnostics: readonly ProductionDatabaseHandoffReadinessApiDiagnostic[];
  handoff: ProductionDatabaseHandoffReadiness;
  routeCount?: number;
  source: ProductionDatabaseHandoffReadinessApiSource;
  traceId?: string;
}

export type ProductionDatabaseHandoffReadinessApiFetch = typeof fetch;

interface LoadProductionDatabaseHandoffReadinessApiStateInput {
  config?: ProductionDatabaseHandoffReadinessApiConfig;
  fetchImpl?: ProductionDatabaseHandoffReadinessApiFetch;
}

interface NormalizedConfig {
  baseUrl?: URL;
  configured: boolean;
  diagnostic?: ProductionDatabaseHandoffReadinessApiDiagnostic;
  headers: Record<string, string>;
  normalizedTracePrefix: string;
  timeoutMs: number;
}

interface ApiRuntimeEnvelope {
  data?: unknown;
  error?: unknown;
  ok: boolean;
  runtime?: {
    mode?: unknown;
    name?: unknown;
    routeCount?: unknown;
    version?: unknown;
  };
  traceId?: unknown;
}

interface ApiRuntimeMetadata {
  mode: "local_seeded";
  name: "campaign-os-api-runtime";
  routeCount: number;
  version?: string;
}

interface FetchJsonResult {
  body?: unknown;
  diagnostic?: ProductionDatabaseHandoffReadinessApiDiagnostic;
  ok: boolean;
  status?: number;
  traceId?: string;
}

const defaultTimeoutMs = 2_000;
const minTimeoutMs = 250;
const maxTimeoutMs = 8_000;
const defaultTracePrefix = "production-database-handoff-readiness";

export const productionDatabaseHandoffReadinessApiBoundary: LocalizedText = {
  "en-US":
    "Local production database handoff readiness API bridge only. No live API, database connection, DB client construction, query, write, transaction, migration execution, secret reveal, provider call, contract write, storage write, reward custody, or reward distribution is performed.",
  "zh-CN":
    "仅用于本地 production database handoff readiness API bridge。不会执行实时 API、数据库连接、DB client 构造、查询、写入、事务、migration 执行、secret 暴露、provider 调用、合约写入、storage 写入、奖励托管或发奖。",
  "zh-TW":
    "僅用於本地 production database handoff readiness API bridge。不會執行即時 API、資料庫連線、DB client 建構、查詢、寫入、交易、migration 執行、secret 暴露、provider 呼叫、合約寫入、storage 寫入、獎勵託管或發獎。",
};

const productionDatabaseRequiredReferenceKeys = [
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

const referenceAreaByKey: Record<typeof productionDatabaseRequiredReferenceKeys[number], ProductionDatabaseRequiredReferenceArea> = {
  CAMPAIGN_OS_DATABASE_LIVE_ENABLEMENT: "activation",
  CAMPAIGN_OS_DATABASE_MIGRATION_APPROVAL: "migration",
  CAMPAIGN_OS_DATABASE_OBSERVABILITY_REF: "observability",
  CAMPAIGN_OS_DATABASE_PACKAGE: "package",
  CAMPAIGN_OS_DATABASE_PACKAGE_BINDING: "binding",
  CAMPAIGN_OS_DATABASE_POOL_POLICY: "pooling",
  CAMPAIGN_OS_DATABASE_PROVIDER: "provider",
  CAMPAIGN_OS_DATABASE_ROLLBACK_BACKUP_PLAN: "rollback",
  CAMPAIGN_OS_DATABASE_RUNBOOK_URL: "runbook",
  CAMPAIGN_OS_DATABASE_SECRET_REF: "secrets",
  CAMPAIGN_OS_DATABASE_URL: "connection",
};

const diagnosticMessages: Record<ProductionDatabaseHandoffReadinessApiDiagnostic["code"], LocalizedText> = {
  API_BASE_URL_INVALID: {
    "en-US": "The local production database handoff API base URL is invalid, so seeded handoff data stays visible.",
    "zh-CN": "本地 production database handoff API base URL 无效，因此继续显示 seeded handoff 数据。",
    "zh-TW": "本地 production database handoff API base URL 無效，因此繼續顯示 seeded handoff 資料。",
  },
  API_BASE_URL_MISSING: {
    "en-US": "No local production database handoff API base URL is configured, so seeded handoff data is shown.",
    "zh-CN": "未配置本地 production database handoff API base URL，因此显示 seeded handoff 数据。",
    "zh-TW": "未設定本地 production database handoff API base URL，因此顯示 seeded handoff 資料。",
  },
  API_PAYLOAD_INVALID: {
    "en-US": "The local production database handoff payload is missing required no-live review fields.",
    "zh-CN": "本地 production database handoff payload 缺少必需 no-live review 字段。",
    "zh-TW": "本地 production database handoff payload 缺少必要 no-live review 欄位。",
  },
  API_REQUEST_FAILED: {
    "en-US": "The local production database handoff API request failed, so seeded handoff data stays visible.",
    "zh-CN": "本地 production database handoff API 请求失败，因此继续显示 seeded handoff 数据。",
    "zh-TW": "本地 production database handoff API 請求失敗，因此繼續顯示 seeded handoff 資料。",
  },
  API_REQUEST_TIMEOUT: {
    "en-US": "The local production database handoff API request timed out, so seeded handoff data stays visible.",
    "zh-CN": "本地 production database handoff API 请求超时，因此继续显示 seeded handoff 数据。",
    "zh-TW": "本地 production database handoff API 請求逾時，因此繼續顯示 seeded handoff 資料。",
  },
  API_RESPONSE_MALFORMED: {
    "en-US": "The local production database handoff API response envelope was not recognized.",
    "zh-CN": "本地 production database handoff API response envelope 无法识别。",
    "zh-TW": "本地 production database handoff API response envelope 無法識別。",
  },
};

const unsafeApiPatterns: Array<[RegExp, string]> = [
  [/postgres(?:ql)?:\/\/[^"'\s<>]+/gi, "__PDB_API_RED_0__"],
  [/mysql:\/\/[^"'\s<>]+/gi, "__PDB_API_RED_0__"],
  [/mongodb(?:\+srv)?:\/\/[^"'\s<>]+/gi, "__PDB_API_RED_0__"],
  [/\bprivate[-_\s]*key\b/gi, "__PDB_API_RED_1__"],
  [/\bprivatekey\b/gi, "__PDB_API_RED_1__"],
  [/\bseed[-_\s]*phrase\b/gi, "__PDB_API_RED_1__"],
  [/\bbearer[-_\s]*token\b/gi, "__PDB_API_RED_2__"],
  [/\bbearer\s+[A-Za-z0-9._~+/=-]+/gi, "__PDB_API_RED_2__"],
  [/\b(token|access_token|refresh_token|api_key|apikey|password)=([^&\s"'<>]+)/gi, "__PDB_API_RED_2__"],
  [/\b(secret|plain[-_\s]*secret|credential)\b[^\s,."'<>]*/gi, "__PDB_API_RED_2__"],
  [/\bstack\s*trace\b/gi, "__PDB_API_RED_3__"],
  [/at\s+[A-Za-z0-9_$.[\]<>]+\s+\([^)]*\)/g, "__PDB_API_RED_3__"],
  [/\/Users\/[^"'\s<>]+/gi, "__PDB_API_RED_4__"],
  [/\/private\/[^"'\s<>]*/gi, "__PDB_API_RED_4__"],
  [/\bsigned[-_\s]*url\b/gi, "__PDB_API_RED_5__"],
  [/\bsignedurl\b/gi, "__PDB_API_RED_5__"],
  [/\bobject[-_\s]*key\b/gi, "__PDB_API_RED_5__"],
  [/\bobjectkey\b/gi, "__PDB_API_RED_5__"],
  [/https?:\/\/[^"'\s<>]+/gi, "__PDB_API_RED_6__"],
];

const unsafeApiReplacementLabels: Record<string, string> = {
  __PDB_API_RED_0__: "[REDACTED:DATABASE_URL]",
  __PDB_API_RED_1__: "[REDACTED:PRIVATE_KEY]",
  __PDB_API_RED_2__: "[REDACTED:CREDENTIAL]",
  __PDB_API_RED_3__: "[REDACTED:STACK]",
  __PDB_API_RED_4__: "[REDACTED:PRIVATE_PATH]",
  __PDB_API_RED_5__: "[REDACTED:STORAGE_REFERENCE]",
  __PDB_API_RED_6__: "[REDACTED:ENDPOINT]",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const sanitizeProductionDatabaseHandoffReadinessApiText = (value: unknown): string => {
  const raw = typeof value === "string" ? value : JSON.stringify(value ?? "");
  const strippedUrlQuery = raw.replace(/\?[^"'\s<>]*/g, "?redacted-query");
  const domainSanitized = sanitizeProductionDatabaseHandoffText(strippedUrlQuery) || strippedUrlQuery;
  const apiSanitized = unsafeApiPatterns.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    domainSanitized,
  );

  return Object.entries(unsafeApiReplacementLabels).reduce(
    (current, [placeholder, replacement]) => current.split(placeholder).join(replacement),
    apiSanitized,
  );
};

const sanitizeDetailValue = (value: unknown): boolean | number | string => {
  if (typeof value === "boolean" || typeof value === "number") {
    return value;
  }

  return sanitizeProductionDatabaseHandoffReadinessApiText(value);
};

const diagnostic = (
  code: ProductionDatabaseHandoffReadinessApiDiagnostic["code"],
  severity: ProductionDatabaseHandoffReadinessApiDiagnostic["severity"],
  safeDetails?: Record<string, unknown>,
): ProductionDatabaseHandoffReadinessApiDiagnostic => {
  const normalizedDetails = safeDetails
    ? Object.fromEntries(
      Object.entries(safeDetails).map(([key, value]) => [
        sanitizeProductionDatabaseHandoffReadinessApiText(key),
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

const dedupeDiagnostics = (
  diagnostics: readonly ProductionDatabaseHandoffReadinessApiDiagnostic[],
): ProductionDatabaseHandoffReadinessApiDiagnostic[] =>
  diagnostics.filter((item, index, all) =>
    all.findIndex((candidate) =>
      candidate.code === item.code
      && candidate.severity === item.severity
      && candidate.message["en-US"] === item.message["en-US"]
    ) === index,
  );

const clampTimeout = (timeoutMs: number | undefined) => {
  if (!Number.isFinite(timeoutMs)) {
    return defaultTimeoutMs;
  }

  return Math.min(maxTimeoutMs, Math.max(minTimeoutMs, Math.trunc(timeoutMs ?? defaultTimeoutMs)));
};

const normalizeTracePrefix = (tracePrefix: string | undefined) => {
  const sanitized = sanitizeProductionDatabaseHandoffReadinessApiText(tracePrefix ?? defaultTracePrefix)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized || defaultTracePrefix;
};

const normalizeHeaders = (headers: Record<string, string> | undefined) =>
  Object.fromEntries(
    Object.entries(headers ?? {})
      .filter(([key, value]) => key.trim() && value.trim())
      .map(([key, value]) => [
        sanitizeProductionDatabaseHandoffReadinessApiText(key).toLowerCase(),
        sanitizeProductionDatabaseHandoffReadinessApiText(value),
      ]),
  );

const normalizeConfig = (config: ProductionDatabaseHandoffReadinessApiConfig | undefined): NormalizedConfig => {
  const headers = normalizeHeaders(config?.headers);
  const timeoutMs = clampTimeout(config?.timeoutMs);
  const normalizedTracePrefix = normalizeTracePrefix(config?.tracePrefix);
  const rawBaseUrl = config?.baseUrl?.trim();

  if (!rawBaseUrl) {
    return {
      configured: false,
      diagnostic: diagnostic("API_BASE_URL_MISSING", "info"),
      headers,
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
        headers,
        normalizedTracePrefix,
        timeoutMs,
      };
    }

    return { baseUrl, configured: true, headers, normalizedTracePrefix, timeoutMs };
  } catch (error) {
    return {
      configured: true,
      diagnostic: diagnostic("API_BASE_URL_INVALID", "warning", { error }),
      headers,
      normalizedTracePrefix,
      timeoutMs,
    };
  }
};

export const buildProductionDatabaseHandoffReadinessApiUrl = (baseUrl: URL) => {
  const next = new URL(baseUrl.toString());
  const basePath = next.pathname.replace(/\/+$/, "");

  next.pathname = `${basePath}/api/backend/production-database/handoff-readiness`;
  next.search = "";
  next.hash = "";

  return next.toString();
};

export const createProductionDatabaseHandoffReadinessApiTraceId = (prefix: string) =>
  `${prefix}-production-database-handoff-readiness-${Date.now().toString(36)}`;

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
    ? sanitizeProductionDatabaseHandoffReadinessApiText(body.traceId)
    : undefined;

const safeFetchJson = async (
  fetchImpl: ProductionDatabaseHandoffReadinessApiFetch,
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<FetchJsonResult> => {
  const timeout = withTimeoutSignal(timeoutMs);

  try {
    const response = await fetchImpl(url, {
      ...init,
      signal: timeout.signal,
    });
    const body = await response.json().catch((error: unknown) => ({
      jsonError: sanitizeProductionDatabaseHandoffReadinessApiText(error),
    }));
    const responseTraceId = extractTraceId(body)
      ?? response.headers.get("x-campaign-os-trace-id")
      ?? undefined;
    const failedEnvelope = isRecord(body) && body.ok === false;

    if (!response.ok || failedEnvelope) {
      return {
        body,
        diagnostic: diagnostic("API_REQUEST_FAILED", "error", {
          error: isRecord(body) ? body.error : body,
          status: response.status,
        }),
        ok: false,
        status: response.status,
        traceId: responseTraceId ? sanitizeProductionDatabaseHandoffReadinessApiText(responseTraceId) : undefined,
      };
    }

    return {
      body,
      ok: true,
      status: response.status,
      traceId: responseTraceId ? sanitizeProductionDatabaseHandoffReadinessApiText(responseTraceId) : undefined,
    };
  } catch (error) {
    return {
      diagnostic: diagnostic(isAbortError(error) ? "API_REQUEST_TIMEOUT" : "API_REQUEST_FAILED", "error", { error }),
      ok: false,
    };
  } finally {
    timeout.clear();
  }
};

const seededHandoff = (
  traceId = "production-database-handoff-local-review",
): ProductionDatabaseHandoffReadiness =>
  createProductionDatabaseHandoffReadiness({
    migrationGate: {
      approvalStatus: "missing",
      blockedMigrationIds: ["production-db-schema-cutover"],
      id: "production-database-migration-gate",
      liveExecutionEnabled: false,
      pendingMigrationIds: ["production-db-schema-cutover"],
      rollbackPlanStatus: "missing",
      rollbackReady: false,
      status: "blocked",
    },
    packageBinding: {
      bindingId: "campaign-os-postgresql-package-binding-local",
      blockerCount: productionDatabaseRequiredReferenceKeys.length,
      driverId: "campaign-os-node-postgres-driver-deferred",
      importPosture: "metadata_only_no_import",
      mode: "production_required",
      packageName: "pg",
      packageRef: "npm:pg",
      providerId: "campaign-os-postgresql-provider-deferred",
      providerKind: "managed-postgresql-compatible",
      status: "blocked",
    },
    requiredReferences: productionDatabaseRequiredReferenceKeys.map((key) => ({
      area: referenceAreaByKey[key],
      id: key.toLowerCase().replace(/_/g, "-"),
      key,
      message: `${key} is required before production activation.`,
      redacted: true,
      requiredBeforeProduction: true,
      status: key === "CAMPAIGN_OS_DATABASE_OBSERVABILITY_REF" || key === "CAMPAIGN_OS_DATABASE_RUNBOOK_URL"
        ? "deferred"
        : "blocked",
    })),
    safety: productionDatabaseNoLiveFlags,
    source: "seeded_fallback",
    storeCoverage: [
      {
        coverageStatus: "mapped",
        label: "Campaign DB",
        migrationRequired: true,
        ownerServiceId: "campaign-service",
        schemaVersion: "v1",
        storeId: "campaign-db",
      },
    ],
    traceId,
  });

const createFallbackState = (
  normalizedConfig: NormalizedConfig,
  diagnostics: readonly ProductionDatabaseHandoffReadinessApiDiagnostic[],
  traceId?: string,
): ProductionDatabaseHandoffReadinessApiState => ({
  configured: normalizedConfig.configured,
  diagnostics: dedupeDiagnostics(diagnostics),
  handoff: seededHandoff(traceId),
  source: "seeded_fallback",
  ...(traceId ? { traceId } : {}),
});

export const createProductionDatabaseHandoffReadinessApiSeededFallbackState = (
  traceId?: string,
): ProductionDatabaseHandoffReadinessApiState => ({
  configured: false,
  diagnostics: [],
  handoff: seededHandoff(traceId),
  source: "seeded_fallback",
  ...(traceId ? { traceId } : {}),
});

const isApiEnvelope = (value: unknown): value is ApiRuntimeEnvelope =>
  isRecord(value) && typeof value.ok === "boolean";

const isRuntimeMetadata = (value: unknown): value is ApiRuntimeMetadata =>
  isRecord(value)
  && value.mode === "local_seeded"
  && value.name === "campaign-os-api-runtime"
  && typeof value.routeCount === "number"
  && Number.isFinite(value.routeCount);

const localizedText = (value: unknown): value is LocalizedText =>
  isRecord(value)
  && typeof value["en-US"] === "string"
  && (value["zh-CN"] === undefined || typeof value["zh-CN"] === "string")
  && (value["zh-TW"] === undefined || typeof value["zh-TW"] === "string");

const stringArray = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const hasRequiredReferenceKeys = (value: unknown) => {
  if (!Array.isArray(value)) {
    return false;
  }

  const keys = value
    .map((item) => isRecord(item) && typeof item.key === "string" ? item.key : undefined)
    .filter((item): item is string => Boolean(item));

  return productionDatabaseRequiredReferenceKeys.every((key) => keys.includes(key));
};

const safetyFlagsAllFalse = (value: unknown) =>
  isRecord(value)
  && Object.keys(productionDatabaseNoLiveFlags).every((key) => value[key] === false);

const isProductionDatabaseHandoffReadiness = (
  value: unknown,
): value is ProductionDatabaseHandoffReadiness =>
  isRecord(value)
  && value.id === "campaign-os-production-database-handoff-readiness"
  && localizedText(value.boundary)
  && stringArray(value.diagnosticCodes)
  && value.localMvpReady === true
  && value.productionReady === false
  && value.valid === true
  && value.source === "server_runtime"
  && (value.status === "blocked" || value.status === "review_required" || value.status === "local_ready")
  && isRecord(value.packageBinding)
  && value.packageBinding.importPosture === "metadata_only_no_import"
  && value.packageBinding.packageName === "pg"
  && value.packageBinding.packageRef === "npm:pg"
  && hasRequiredReferenceKeys(value.requiredReferences)
  && Array.isArray(value.storeCoverage)
  && value.storeCoverage.length > 0
  && isRecord(value.migrationGate)
  && value.migrationGate.liveExecutionEnabled === false
  && safetyFlagsAllFalse(value.safety)
  && isRecord(value.summary)
  && typeof value.summary.requiredReferenceCount === "number"
  && typeof value.summary.storeCoverageCount === "number";

const sanitizeJsonValue = (value: unknown): unknown => {
  if (typeof value === "string") {
    return sanitizeProductionDatabaseHandoffReadinessApiText(value);
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeJsonValue);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      sanitizeProductionDatabaseHandoffReadinessApiText(key),
      sanitizeJsonValue(nestedValue),
    ]),
  );
};

const dataPayloadFromEnvelope = (body: unknown) => {
  if (!isApiEnvelope(body) || body.ok !== true || !isRecord(body.data)) {
    return undefined;
  }

  return body.data.payload;
};

export const loadProductionDatabaseHandoffReadinessApiState = async ({
  config,
  fetchImpl = fetch,
}: LoadProductionDatabaseHandoffReadinessApiStateInput = {}): Promise<ProductionDatabaseHandoffReadinessApiState> => {
  const normalizedConfig = normalizeConfig(config);

  if (!normalizedConfig.baseUrl) {
    return createFallbackState(
      normalizedConfig,
      normalizedConfig.diagnostic ? [normalizedConfig.diagnostic] : [],
    );
  }

  const url = buildProductionDatabaseHandoffReadinessApiUrl(normalizedConfig.baseUrl);
  const traceId = createProductionDatabaseHandoffReadinessApiTraceId(normalizedConfig.normalizedTracePrefix);
  const result = await safeFetchJson(fetchImpl, url, {
    headers: {
      accept: "application/json",
      ...normalizedConfig.headers,
      "x-campaign-os-trace-id": traceId,
    },
    method: "GET",
  }, normalizedConfig.timeoutMs);
  const responseTraceId = result.traceId ?? extractTraceId(result.body);

  if (!result.ok) {
    return createFallbackState(
      normalizedConfig,
      result.diagnostic ? [result.diagnostic] : [diagnostic("API_REQUEST_FAILED", "error")],
      responseTraceId,
    );
  }

  if (!isApiEnvelope(result.body)) {
    return createFallbackState(
      normalizedConfig,
      [diagnostic("API_RESPONSE_MALFORMED", "error")],
      responseTraceId,
    );
  }

  const payload = dataPayloadFromEnvelope(result.body);

  if (!isRuntimeMetadata(result.body.runtime) || !isProductionDatabaseHandoffReadiness(payload)) {
    return createFallbackState(
      normalizedConfig,
      [diagnostic(payload === undefined ? "API_RESPONSE_MALFORMED" : "API_PAYLOAD_INVALID", "error")],
      responseTraceId,
    );
  }

  const handoff = sanitizeJsonValue(payload) as ProductionDatabaseHandoffReadiness;

  return {
    configured: normalizedConfig.configured,
    diagnostics: [],
    handoff,
    routeCount: result.body.runtime.routeCount,
    source: "api_runtime",
    traceId: responseTraceId ?? handoff.traceId,
  };
};

export const productionDatabaseHandoffReadinessSeededBoundary = productionDatabaseHandoffBoundary;
