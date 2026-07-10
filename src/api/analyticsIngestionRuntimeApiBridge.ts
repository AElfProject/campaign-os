import {
  analyticsIngestionRuntimeBoundary,
  analyticsIngestionWarehouseRequiredConfigKeys,
  createAnalyticsIngestionRuntimeReadiness,
  sanitizeAnalyticsIngestionRuntimeText,
  type AnalyticsIngestionEventGroup,
  type AnalyticsIngestionMetricLineageRow,
  type AnalyticsIngestionRuntimeDiagnostic,
  type AnalyticsIngestionRuntimeReadiness,
  type AnalyticsIngestionRuntimeStatus,
  type AnalyticsIngestionWarehouseHandoff,
} from "../domain/analyticsIngestionRuntime";
import { campaignDetail } from "../domain/fixtures";
import type { LocalizedText } from "../domain/types";

export type AnalyticsIngestionRuntimeApiSource =
  | "api_runtime"
  | "error_fallback"
  | "loading"
  | "seeded_fallback";

export type AnalyticsIngestionRuntimeApiStatus =
  | "blocked"
  | "error"
  | "fallback"
  | "loading"
  | "local_ready"
  | "review_required";

export interface AnalyticsIngestionRuntimeApiDiagnostic {
  code:
    | "API_BASE_URL_INVALID"
    | "API_BASE_URL_MISSING"
    | "API_PAYLOAD_INVALID"
    | "API_REQUEST_FAILED"
    | "API_REQUEST_TIMEOUT"
    | "API_RESPONSE_MALFORMED";
  message: LocalizedText;
  safeDetails?: Record<string, boolean | number | string>;
  severity: "error" | "info" | "warning";
}

export interface AnalyticsIngestionRuntimeApiConfig {
  baseUrl?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  tracePrefix?: string;
}

export interface AnalyticsIngestionRuntimeApiBridgeState {
  boundary: LocalizedText;
  campaignId: string;
  configured: boolean;
  diagnostics: readonly AnalyticsIngestionRuntimeApiDiagnostic[];
  loading: boolean;
  readiness: AnalyticsIngestionRuntimeReadiness;
  routeCount?: number;
  source: AnalyticsIngestionRuntimeApiSource;
  status: AnalyticsIngestionRuntimeApiStatus;
  traceId?: string;
}

export type AnalyticsIngestionRuntimeApiFetch = typeof fetch;

interface LoadAnalyticsIngestionRuntimeApiBridgeStateInput {
  campaignId: string;
  config?: AnalyticsIngestionRuntimeApiConfig;
  fetchImpl?: AnalyticsIngestionRuntimeApiFetch;
}

interface NormalizedConfig {
  baseUrl?: URL;
  configured: boolean;
  diagnostic?: AnalyticsIngestionRuntimeApiDiagnostic;
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
  safety?: unknown;
  timestamp?: unknown;
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
  diagnostic?: AnalyticsIngestionRuntimeApiDiagnostic;
  ok: boolean;
  status?: number;
  traceId?: string;
}

const defaultTimeoutMs = 2_000;
const minTimeoutMs = 250;
const maxTimeoutMs = 8_000;
const defaultTracePrefix = "analytics-ingestion-runtime";

export const analyticsIngestionRuntimeApiBoundary: LocalizedText = {
  "en-US":
    "Local analytics ingestion runtime API bridge only. No live analytics SDK, event warehouse write, browser tracking, profiling, fingerprinting, export write, contract write, wallet signature, reward custody, or reward distribution is executed.",
  "zh-CN":
    "仅用于本地 analytics ingestion runtime API bridge。不会执行实时 analytics SDK、事件仓库写入、浏览器追踪、画像、指纹识别、导出写入、合约写入、钱包签名、奖励托管或发奖。",
  "zh-TW":
    "僅用於本地 analytics ingestion runtime API bridge。不會執行即時 analytics SDK、事件倉庫寫入、瀏覽器追蹤、画像、指紋識別、匯出寫入、合約寫入、錢包簽名、獎勵託管或發獎。",
};

const diagnosticMessages: Record<AnalyticsIngestionRuntimeApiDiagnostic["code"], LocalizedText> = {
  API_BASE_URL_INVALID: {
    "en-US": "The local analytics ingestion readiness API base URL is invalid, so seeded review data stays visible.",
    "zh-CN": "本地 analytics ingestion readiness API base URL 无效，因此继续显示 seeded review 数据。",
    "zh-TW": "本地 analytics ingestion readiness API base URL 無效，因此繼續顯示 seeded review 資料。",
  },
  API_BASE_URL_MISSING: {
    "en-US": "No local analytics ingestion readiness API base URL is configured, so seeded review data is shown.",
    "zh-CN": "未配置本地 analytics ingestion readiness API base URL，因此显示 seeded review 数据。",
    "zh-TW": "未設定本地 analytics ingestion readiness API base URL，因此顯示 seeded review 資料。",
  },
  API_PAYLOAD_INVALID: {
    "en-US": "The local analytics ingestion readiness payload is missing required no-live review fields.",
    "zh-CN": "本地 analytics ingestion readiness payload 缺少必需 no-live review 字段。",
    "zh-TW": "本地 analytics ingestion readiness payload 缺少必要 no-live review 欄位。",
  },
  API_REQUEST_FAILED: {
    "en-US": "The local analytics ingestion readiness API request failed, so seeded review data stays visible.",
    "zh-CN": "本地 analytics ingestion readiness API 请求失败，因此继续显示 seeded review 数据。",
    "zh-TW": "本地 analytics ingestion readiness API 請求失敗，因此繼續顯示 seeded review 資料。",
  },
  API_REQUEST_TIMEOUT: {
    "en-US": "The local analytics ingestion readiness API request timed out, so seeded review data stays visible.",
    "zh-CN": "本地 analytics ingestion readiness API 请求超时，因此继续显示 seeded review 数据。",
    "zh-TW": "本地 analytics ingestion readiness API 請求逾時，因此繼續顯示 seeded review 資料。",
  },
  API_RESPONSE_MALFORMED: {
    "en-US": "The local analytics ingestion readiness API response envelope was not recognized.",
    "zh-CN": "本地 analytics ingestion readiness API response envelope 无法识别。",
    "zh-TW": "本地 analytics ingestion readiness API response envelope 無法識別。",
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
  [/\/private\/[^"'\s<>]*/gi, "redacted private path"],
  [/\bprovider[-_\s]*(payload|response|request)\b/gi, "redacted provider data"],
  [/\bprovider[-_\s]*call\b/gi, "redacted external interaction"],
  [/\bstack\s*trace\b/gi, "redacted stack"],
  [/at\s+[A-Za-z0-9_$.[\]<>]+\s+\([^)]*\)/g, "redacted stack frame"],
  [/\bsigned[-_\s]*url\b/gi, "redacted signed link"],
  [/\bdownload[-_\s]*url\b/gi, "redacted download link"],
  [/\bobject[-_\s]*key\b/gi, "redacted object reference"],
  [/\bstorage[-_\s]*key\b/gi, "redacted storage reference"],
  [/\bwarehouse[-_\s]*key\b/gi, "redacted warehouse reference"],
  [/\bwallet[-_\s]*signature\b/gi, "redacted wallet action"],
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const sanitizeAnalyticsIngestionRuntimeApiText = (value: unknown): string => {
  const raw = typeof value === "string" ? value : JSON.stringify(value ?? "");
  const strippedUrlQuery = raw.replace(/\?[^"'\s<>]*/g, "?redacted-query");
  const apiSanitized = unsafePatterns.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    strippedUrlQuery,
  );

  return sanitizeAnalyticsIngestionRuntimeText(apiSanitized);
};

const sanitizeDetailValue = (value: unknown): boolean | number | string => {
  if (typeof value === "boolean" || typeof value === "number") {
    return value;
  }

  return sanitizeAnalyticsIngestionRuntimeApiText(value);
};

const diagnostic = (
  code: AnalyticsIngestionRuntimeApiDiagnostic["code"],
  severity: AnalyticsIngestionRuntimeApiDiagnostic["severity"],
  safeDetails?: Record<string, unknown>,
): AnalyticsIngestionRuntimeApiDiagnostic => {
  const normalizedDetails = safeDetails
    ? Object.fromEntries(
      Object.entries(safeDetails).map(([key, value]) => [
        sanitizeAnalyticsIngestionRuntimeApiText(key),
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
  const sanitized = sanitizeAnalyticsIngestionRuntimeApiText(tracePrefix ?? defaultTracePrefix)
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
        sanitizeAnalyticsIngestionRuntimeApiText(key).toLowerCase(),
        sanitizeAnalyticsIngestionRuntimeApiText(value),
      ]),
  );

const normalizeConfig = (config: AnalyticsIngestionRuntimeApiConfig | undefined): NormalizedConfig => {
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

export const buildAnalyticsIngestionRuntimeApiUrl = (baseUrl: URL, campaignId: string) => {
  const next = new URL(baseUrl.toString());
  const basePath = next.pathname.replace(/\/+$/, "");
  const safeCampaignId = encodeURIComponent(campaignId);

  next.pathname = `${basePath}/api/campaigns/${safeCampaignId}/analytics/ingestion-readiness`;
  next.search = "";
  next.hash = "";

  return next.toString();
};

export const createAnalyticsIngestionRuntimeApiTraceId = (prefix: string) =>
  `${prefix}-analytics-ingestion-runtime-${Date.now().toString(36)}`;

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
    ? sanitizeAnalyticsIngestionRuntimeApiText(body.traceId)
    : undefined;

const safeFetchJson = async (
  fetchImpl: AnalyticsIngestionRuntimeApiFetch,
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
      jsonError: sanitizeAnalyticsIngestionRuntimeApiText(error),
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
        traceId: responseTraceId ? sanitizeAnalyticsIngestionRuntimeApiText(responseTraceId) : undefined,
      };
    }

    return {
      body,
      ok: true,
      status: response.status,
      traceId: responseTraceId ? sanitizeAnalyticsIngestionRuntimeApiText(responseTraceId) : undefined,
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

const seededReadiness = (
  campaignId: string,
  traceId = "analytics-ingestion-local-review",
): AnalyticsIngestionRuntimeReadiness => ({
  ...createAnalyticsIngestionRuntimeReadiness({
    campaign: campaignDetail,
    source: "seeded_runtime",
    traceId,
  }),
  campaignId,
  traceId,
});

export const createAnalyticsIngestionRuntimeApiLoadingState = (
  campaignId: string,
): AnalyticsIngestionRuntimeApiBridgeState => ({
  boundary: analyticsIngestionRuntimeApiBoundary,
  campaignId,
  configured: true,
  diagnostics: [],
  loading: true,
  readiness: seededReadiness(campaignId),
  source: "loading",
  status: "loading",
});

export const createAnalyticsIngestionRuntimeApiSeededFallbackState = (
  campaignId: string,
  traceId?: string,
): AnalyticsIngestionRuntimeApiBridgeState => ({
  boundary: analyticsIngestionRuntimeApiBoundary,
  campaignId,
  configured: false,
  diagnostics: [],
  loading: false,
  readiness: seededReadiness(campaignId, traceId),
  source: "seeded_fallback",
  status: "fallback",
  ...(traceId ? { traceId } : {}),
});

const createFallbackState = (
  campaignId: string,
  normalizedConfig: NormalizedConfig,
  source: Extract<AnalyticsIngestionRuntimeApiSource, "error_fallback" | "seeded_fallback">,
  diagnostics: readonly AnalyticsIngestionRuntimeApiDiagnostic[],
  traceId?: string,
): AnalyticsIngestionRuntimeApiBridgeState => ({
  boundary: analyticsIngestionRuntimeApiBoundary,
  campaignId,
  configured: normalizedConfig.configured,
  diagnostics,
  loading: false,
  readiness: seededReadiness(campaignId, traceId),
  source,
  status: source === "seeded_fallback" ? "fallback" : "error",
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

const numberField = (record: Record<string, unknown>, key: string) =>
  typeof record[key] === "number" && Number.isFinite(record[key]);

const stringField = (record: Record<string, unknown>, key: string) =>
  typeof record[key] === "string" && record[key].trim().length > 0;

const stringArray = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const diagnosticsSafe = (value: unknown): value is readonly AnalyticsIngestionRuntimeDiagnostic[] =>
  Array.isArray(value)
  && value.every((item) =>
    isRecord(item)
    && stringField(item, "code")
    && stringField(item, "field")
    && stringField(item, "message")
    && (item.severity === "info" || item.severity === "warning" || item.severity === "error")
    && stringField(item, "source")
  );

const isEventGroup = (value: unknown): value is AnalyticsIngestionEventGroup =>
  isRecord(value)
  && localizedText(value.boundary)
  && numberField(value, "eventCount")
  && stringField(value, "id")
  && localizedText(value.label)
  && value.localOnly === true
  && value.schemaState === "local_review";

const isMetricLineageRow = (value: unknown): value is AnalyticsIngestionMetricLineageRow =>
  isRecord(value)
  && stringField(value, "id")
  && numberField(value, "inputCount")
  && localizedText(value.label)
  && localizedText(value.lineage)
  && stringField(value, "outputMetric")
  && stringArray(value.sourceEventGroupIds);

const isNoLiveSideEffects = (value: unknown) =>
  isRecord(value)
  && [
    "liveAnalyticsSdkExecuted",
    "liveBrowserTrackingEnabled",
    "liveContractWrite",
    "liveEventIngestionEnabled",
    "liveEventWarehouseWrite",
    "liveExportFileWrite",
    "liveFingerprintingEnabled",
    "liveProfilingEnabled",
    "liveProviderCallExecuted",
    "liveProductionDatabaseMutation",
    "liveRewardCustody",
    "liveRewardDistribution",
    "liveWalletSignature",
  ].every((key) => value[key] === false);

const isWarehouseHandoff = (value: unknown): value is AnalyticsIngestionWarehouseHandoff => {
  if (!isRecord(value)) {
    return false;
  }

  const requiredConfigKeys = value.requiredConfigKeys;

  if (!stringArray(requiredConfigKeys)) {
    return false;
  }

  return value.eventWarehouseWriteAttempted === false
    && value.liveWarehouseWriteEnabled === false
    && stringArray(value.missingConfigKeys)
    && value.productionReady === false
    && analyticsIngestionWarehouseRequiredConfigKeys.every((key) => requiredConfigKeys.includes(key))
    && (value.status === "missing" || value.status === "partial" || value.status === "ready_disabled")
    && localizedText(value.topBlocker);
};

const isSummary = (value: unknown) =>
  isRecord(value)
  && [
    "aiOpsReportCount",
    "eligibleWinners",
    "eventGroupCount",
    "exportRows",
    "metricLineageCount",
    "riskReviewQueue",
    "totalEvents",
    "totalParticipants",
    "verifiedActions",
  ].every((key) => numberField(value, key))
  && localizedText(value.topBlocker)
  && localizedText(value.topNextAction);

const isAnalyticsIngestionRuntimeReadiness = (
  value: unknown,
  campaignId: string,
): value is AnalyticsIngestionRuntimeReadiness =>
  isRecord(value)
  && value.campaignId === campaignId
  && value.source === "server_runtime"
  && (value.status === "blocked" || value.status === "review_required" || value.status === "local_ready")
  && localizedText(value.boundary)
  && stringArray(value.diagnosticCodes)
  && diagnosticsSafe(value.diagnostics)
  && Array.isArray(value.eventCatalog)
  && value.eventCatalog.every(isEventGroup)
  && Array.isArray(value.metricLineage)
  && value.metricLineage.every(isMetricLineageRow)
  && isNoLiveSideEffects(value.noLiveSideEffects)
  && value.productionReady === false
  && isSummary(value.summary)
  && (value.traceId === undefined || stringField(value, "traceId"))
  && typeof value.valid === "boolean"
  && isWarehouseHandoff(value.warehouseHandoff);

const payloadFromEnvelope = (body: unknown) => {
  if (!isRecord(body)) {
    return undefined;
  }

  const data = body.data;

  if (!isRecord(data)) {
    return undefined;
  }

  if ("payload" in data) {
    return data.payload;
  }

  if ("analyticsIngestionRuntime" in data) {
    return data.analyticsIngestionRuntime;
  }

  return data;
};

const statusFromReadiness = (
  readiness: Pick<AnalyticsIngestionRuntimeReadiness, "status">,
): AnalyticsIngestionRuntimeStatus =>
  readiness.status === "local_ready" ? "review_required" : readiness.status;

export const loadAnalyticsIngestionRuntimeApiBridgeState = async ({
  campaignId,
  config,
  fetchImpl = fetch,
}: LoadAnalyticsIngestionRuntimeApiBridgeStateInput): Promise<AnalyticsIngestionRuntimeApiBridgeState> => {
  const normalizedConfig = normalizeConfig(config);

  if (normalizedConfig.diagnostic) {
    return createFallbackState(
      campaignId,
      normalizedConfig,
      normalizedConfig.diagnostic.code === "API_BASE_URL_MISSING" ? "seeded_fallback" : "error_fallback",
      [normalizedConfig.diagnostic],
    );
  }

  if (!normalizedConfig.baseUrl) {
    return createFallbackState(
      campaignId,
      normalizedConfig,
      "seeded_fallback",
      [diagnostic("API_BASE_URL_MISSING", "info")],
    );
  }

  const traceId = createAnalyticsIngestionRuntimeApiTraceId(normalizedConfig.normalizedTracePrefix);
  const result = await safeFetchJson(
    fetchImpl,
    buildAnalyticsIngestionRuntimeApiUrl(normalizedConfig.baseUrl, campaignId),
    {
      headers: {
        ...normalizedConfig.headers,
        accept: "application/json",
        "x-campaign-os-trace-id": traceId,
      },
      method: "GET",
    },
    normalizedConfig.timeoutMs,
  );

  if (!result.ok) {
    return createFallbackState(
      campaignId,
      normalizedConfig,
      "error_fallback",
      result.diagnostic ? [result.diagnostic] : [diagnostic("API_REQUEST_FAILED", "error")],
      result.traceId,
    );
  }

  const envelope = result.body;
  const responseTraceId = result.traceId ?? extractTraceId(envelope);
  const runtimeMetadata = isApiEnvelope(envelope) && isRuntimeMetadata(envelope.runtime)
    ? envelope.runtime
    : undefined;

  if (!isApiEnvelope(envelope) || !runtimeMetadata || envelope.ok !== true) {
    return createFallbackState(
      campaignId,
      normalizedConfig,
      "error_fallback",
      [diagnostic("API_RESPONSE_MALFORMED", "error", { body: envelope })],
      responseTraceId,
    );
  }

  const payload = payloadFromEnvelope(envelope);

  if (!isAnalyticsIngestionRuntimeReadiness(payload, campaignId)) {
    return createFallbackState(
      campaignId,
      normalizedConfig,
      "error_fallback",
      [diagnostic("API_PAYLOAD_INVALID", "error", { payload })],
      responseTraceId,
    );
  }

  const readiness = {
    ...payload,
    traceId: responseTraceId ?? payload.traceId,
  };
  const envelopeData = isRecord(envelope.data) ? envelope.data : undefined;

  return {
    boundary: localizedText(envelopeData?.boundary)
      ? envelopeData.boundary as LocalizedText
      : analyticsIngestionRuntimeApiBoundary,
    campaignId,
    configured: true,
    diagnostics: [],
    loading: false,
    readiness,
    routeCount: runtimeMetadata.routeCount,
    source: "api_runtime",
    status: statusFromReadiness(readiness),
    ...(readiness.traceId ? { traceId: readiness.traceId } : {}),
  };
};
