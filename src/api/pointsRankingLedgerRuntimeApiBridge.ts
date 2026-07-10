import { campaignDetail } from "../domain/fixtures";
import {
  createPointsRankingLedgerRuntime,
  pointsRankingLedgerRuntimeBoundary,
} from "../domain/pointsRankingLedgerRuntime";
import type {
  LocalizedText,
  PointsLedgerNoLiveSideEffects,
  PointsLedgerRuntimeEvent,
  PointsRankingLedgerRuntime,
  PointsRankingSnapshotRow,
} from "../domain/types";

export type PointsRankingLedgerRuntimeApiSource =
  | "api_runtime"
  | "error_fallback"
  | "loading"
  | "seeded_fallback";

export type PointsRankingLedgerRuntimeApiStatus =
  | "blocked"
  | "error"
  | "fallback"
  | "loading"
  | "ready"
  | "review_required";

export interface PointsRankingLedgerRuntimeApiDiagnostic {
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

export interface PointsRankingLedgerRuntimeApiConfig {
  baseUrl?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  tracePrefix?: string;
}

export interface PointsRankingLedgerRuntimeApiBridgeState {
  boundary: LocalizedText;
  campaignId: string;
  configured: boolean;
  diagnostics: readonly PointsRankingLedgerRuntimeApiDiagnostic[];
  loading: boolean;
  review: PointsRankingLedgerRuntime;
  routeCount?: number;
  runtime: PointsRankingLedgerRuntime;
  source: PointsRankingLedgerRuntimeApiSource;
  status: PointsRankingLedgerRuntimeApiStatus;
  traceId?: string;
}

export type PointsRankingLedgerRuntimeApiFetch = typeof fetch;

interface LoadPointsRankingLedgerRuntimeApiBridgeStateInput {
  campaignId: string;
  config?: PointsRankingLedgerRuntimeApiConfig;
  fetchImpl?: PointsRankingLedgerRuntimeApiFetch;
}

interface NormalizedConfig {
  baseUrl?: URL;
  configured: boolean;
  diagnostic?: PointsRankingLedgerRuntimeApiDiagnostic;
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
  diagnostic?: PointsRankingLedgerRuntimeApiDiagnostic;
  ok: boolean;
  status?: number;
  traceId?: string;
}

const defaultTimeoutMs = 2_000;
const minTimeoutMs = 250;
const maxTimeoutMs = 8_000;
const defaultTracePrefix = "points-ranking-ledger-runtime";

export const pointsRankingLedgerRuntimeApiBoundary: LocalizedText = {
  "en-US":
    "Local points ranking ledger runtime API bridge only. No production Pixiepoints ledger write, backend ledger write, provider/indexer call, wallet signature, contract root write, export file, reward custody, or reward distribution is executed.",
  "zh-CN":
    "仅用于本地 points ranking ledger runtime API bridge。不会执行生产 Pixiepoints 账本写入、后端账本写入、provider/indexer 调用、钱包签名、合约 root 写入、导出文件、奖励托管或发奖。",
  "zh-TW":
    "Local points ranking ledger runtime API bridge only. No production Pixiepoints ledger write, backend ledger write, provider/indexer call, wallet signature, contract root write, export file, reward custody, or reward distribution is executed.",
};

const diagnosticMessages: Record<PointsRankingLedgerRuntimeApiDiagnostic["code"], LocalizedText> = {
  API_BASE_URL_INVALID: {
    "en-US": "The local points ranking ledger runtime API base URL is invalid, so seeded review data stays visible.",
    "zh-CN": "本地 points ranking ledger runtime API base URL 无效，因此继续显示 seeded review 数据。",
    "zh-TW": "The local points ranking ledger runtime API base URL is invalid, so seeded review data stays visible.",
  },
  API_BASE_URL_MISSING: {
    "en-US": "No local points ranking ledger runtime API base URL is configured, so seeded review data is shown.",
    "zh-CN": "未配置本地 points ranking ledger runtime API base URL，因此显示 seeded review 数据。",
    "zh-TW": "No local points ranking ledger runtime API base URL is configured, so seeded review data is shown.",
  },
  API_PAYLOAD_INVALID: {
    "en-US": "The local points ranking ledger runtime payload is missing required review fields.",
    "zh-CN": "本地 points ranking ledger runtime payload 缺少必需 review 字段。",
    "zh-TW": "The local points ranking ledger runtime payload is missing required review fields.",
  },
  API_REQUEST_FAILED: {
    "en-US": "The local points ranking ledger runtime API request failed, so seeded review data stays visible.",
    "zh-CN": "本地 points ranking ledger runtime API 请求失败，因此继续显示 seeded review 数据。",
    "zh-TW": "The local points ranking ledger runtime API request failed, so seeded review data stays visible.",
  },
  API_REQUEST_TIMEOUT: {
    "en-US": "The local points ranking ledger runtime API request timed out, so seeded review data stays visible.",
    "zh-CN": "本地 points ranking ledger runtime API 请求超时，因此继续显示 seeded review 数据。",
    "zh-TW": "The local points ranking ledger runtime API request timed out, so seeded review data stays visible.",
  },
  API_RESPONSE_MALFORMED: {
    "en-US": "The local points ranking ledger runtime API response envelope was not recognized.",
    "zh-CN": "本地 points ranking ledger runtime API response envelope 无法识别。",
    "zh-TW": "The local points ranking ledger runtime API response envelope was not recognized.",
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
  [/\bprovider[-_\s]*payload\b/gi, "redacted provider data"],
  [/\bprovider[-_\s]*call\b/gi, "redacted external interaction"],
  [/\bstack\s*trace\b/gi, "redacted stack"],
  [/at\s+[A-Za-z0-9_$.[\]<>]+\s+\([^)]*\)/g, "redacted stack frame"],
  [/\bsigned[-_\s]*url\b/gi, "redacted signed link"],
  [/\bobject[-_\s]*key\b/gi, "redacted object reference"],
  [/\bstorage[-_\s]*key\b/gi, "redacted storage reference"],
  [/\bwallet[-_\s]*signature\b/gi, "redacted wallet action"],
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const sanitizePointsRankingLedgerRuntimeApiText = (value: unknown): string => {
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

  return sanitizePointsRankingLedgerRuntimeApiText(value);
};

const diagnostic = (
  code: PointsRankingLedgerRuntimeApiDiagnostic["code"],
  severity: PointsRankingLedgerRuntimeApiDiagnostic["severity"],
  safeDetails?: Record<string, unknown>,
): PointsRankingLedgerRuntimeApiDiagnostic => {
  const normalizedDetails = safeDetails
    ? Object.fromEntries(
      Object.entries(safeDetails).map(([key, value]) => [
        sanitizePointsRankingLedgerRuntimeApiText(key),
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
  const sanitized = sanitizePointsRankingLedgerRuntimeApiText(tracePrefix ?? defaultTracePrefix)
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
        sanitizePointsRankingLedgerRuntimeApiText(key).toLowerCase(),
        sanitizePointsRankingLedgerRuntimeApiText(value),
      ]),
  );

const normalizeConfig = (config: PointsRankingLedgerRuntimeApiConfig | undefined): NormalizedConfig => {
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

export const buildPointsRankingLedgerRuntimeApiUrl = (baseUrl: URL, campaignId: string) => {
  const next = new URL(baseUrl.toString());
  const basePath = next.pathname.replace(/\/+$/, "");
  const safeCampaignId = encodeURIComponent(campaignId);

  next.pathname = `${basePath}/api/campaigns/${safeCampaignId}/points-ranking-ledger-runtime`;
  next.search = "";
  next.hash = "";

  return next.toString();
};

export const createPointsRankingLedgerRuntimeApiTraceId = (prefix: string) =>
  `${prefix}-points-ranking-ledger-runtime-${Date.now().toString(36)}`;

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
    ? sanitizePointsRankingLedgerRuntimeApiText(body.traceId)
    : undefined;

const safeFetchJson = async (
  fetchImpl: PointsRankingLedgerRuntimeApiFetch,
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
      jsonError: sanitizePointsRankingLedgerRuntimeApiText(error),
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
        traceId: responseTraceId ? sanitizePointsRankingLedgerRuntimeApiText(responseTraceId) : undefined,
      };
    }

    return {
      body,
      ok: true,
      status: response.status,
      traceId: responseTraceId ? sanitizePointsRankingLedgerRuntimeApiText(responseTraceId) : undefined,
    };
  } catch (error) {
    return {
      diagnostic: diagnostic(isAbortError(error) ? "API_REQUEST_TIMEOUT" : "API_REQUEST_FAILED", "error", {
        error,
      }),
      ok: false,
    };
  } finally {
    timeout.clear();
  }
};

const seededRuntime = (
  campaignId: string,
  source: PointsRankingLedgerRuntimeApiSource,
  traceId?: string,
): PointsRankingLedgerRuntime => ({
  ...createPointsRankingLedgerRuntime(campaignDetail, {
    source: source === "api_runtime" ? "api_runtime" : source === "loading" ? "fallback" : "fallback",
    traceId,
  }),
  campaignId,
  source: source === "api_runtime" ? "api_runtime" : "fallback",
});

export const createPointsRankingLedgerRuntimeApiLoadingState = (
  campaignId: string,
): PointsRankingLedgerRuntimeApiBridgeState => {
  const runtime = {
    ...seededRuntime(campaignId, "loading"),
    status: "review_required" as const,
  };

  return {
    boundary: pointsRankingLedgerRuntimeApiBoundary,
    campaignId,
    configured: true,
    diagnostics: [],
    loading: true,
    review: runtime,
    runtime,
    source: "loading",
    status: "loading",
  };
};

export const createPointsRankingLedgerRuntimeApiSeededFallbackState = (
  campaignId: string,
  traceId?: string,
): PointsRankingLedgerRuntimeApiBridgeState => {
  const runtime = seededRuntime(campaignId, "seeded_fallback", traceId);

  return {
    boundary: pointsRankingLedgerRuntimeApiBoundary,
    campaignId,
    configured: false,
    diagnostics: [],
    loading: false,
    review: runtime,
    runtime,
    source: "seeded_fallback",
    status: "fallback",
    ...(traceId ? { traceId } : {}),
  };
};

const createFallbackState = (
  campaignId: string,
  normalizedConfig: NormalizedConfig,
  source: Extract<PointsRankingLedgerRuntimeApiSource, "error_fallback" | "seeded_fallback">,
  diagnostics: readonly PointsRankingLedgerRuntimeApiDiagnostic[],
  traceId?: string,
): PointsRankingLedgerRuntimeApiBridgeState => {
  const runtime = seededRuntime(campaignId, source, traceId);
  const status = source === "seeded_fallback" ? "fallback" : "error";

  return {
    boundary: pointsRankingLedgerRuntimeApiBoundary,
    campaignId,
    configured: normalizedConfig.configured,
    diagnostics,
    loading: false,
    review: {
      ...runtime,
      status: "review_required",
    },
    runtime: {
      ...runtime,
      status: "review_required",
    },
    source,
    status,
    ...(traceId ? { traceId } : {}),
  };
};

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

const stringArray = (value: unknown) =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const isNoLiveSideEffects = (value: unknown): value is PointsLedgerNoLiveSideEffects =>
  isRecord(value)
  && [
    "liveBackendLedgerWrite",
    "liveContractWrite",
    "liveEligibilityRootPublished",
    "liveExportFileWritten",
    "liveIndexerExecuted",
    "livePixiepointsLedgerWrite",
    "liveProviderExecuted",
    "liveRewardCustody",
    "liveRewardDistribution",
    "liveWalletSignature",
  ].every((key) => value[key] === false);

const isLedgerEvent = (value: unknown): value is PointsLedgerRuntimeEvent =>
  isRecord(value)
  && [
    "campaignId",
    "eventId",
    "evidenceHash",
    "evidenceSource",
    "localePreference",
    "riskFlags",
    "status",
    "taskId",
    "templateCode",
    "verificationType",
    "walletAddress",
    "walletSource",
  ].every((key) => key === "riskFlags" ? stringArray(value[key]) : stringField(value, key))
  && (value.accountType === "AA" || value.accountType === "EOA" || value.accountType === "UNKNOWN")
  && numberField(value, "pointsAwarded")
  && numberField(value, "pointsAvailable");

const isRankingRow = (value: unknown): value is PointsRankingSnapshotRow =>
  isRecord(value)
  && [
    "evidenceHashes",
    "missingTasks",
    "riskFlags",
  ].every((key) => stringArray(value[key]))
  && [
    "localePreference",
    "walletAddress",
    "walletSource",
  ].every((key) => stringField(value, key))
  && (value.accountType === "AA" || value.accountType === "EOA" || value.accountType === "UNKNOWN")
  && typeof value.eligible === "boolean"
  && numberField(value, "rank")
  && numberField(value, "totalPoints");

const isSummary = (value: unknown) =>
  isRecord(value)
  && [
    "completedEvents",
    "eligibleWallets",
    "failedEvents",
    "manualReviewEvents",
    "pendingEvents",
    "rankedWallets",
    "riskFlaggedWallets",
    "totalLedgerEvents",
    "totalPoints",
  ].every((key) => numberField(value, key))
  && localizedText(value.topNextAction);

const isLedgerSection = (value: unknown) =>
  isRecord(value)
  && localizedText(value.boundary)
  && Array.isArray(value.events)
  && value.events.every(isLedgerEvent)
  && [
    "completedEvents",
    "failedEvents",
    "manualReviewEvents",
    "pendingEvents",
    "totalEvents",
  ].every((key) => numberField(value, key));

const isRankingSection = (value: unknown) =>
  isRecord(value)
  && localizedText(value.boundary)
  && Array.isArray(value.rows)
  && value.rows.every(isRankingRow)
  && numberField(value, "generatedFromLedgerEventCount");

const isEligibilityRoot = (value: unknown) =>
  isRecord(value)
  && value.contractRootMode === "none"
  && value.generationMode === "local_preview"
  && value.schemaVersion === "local-v1"
  && stringField(value, "rootHash")
  && stringField(value, "rootId")
  && stringArray(value.evidenceHashes)
  && localizedText(value.nextAction)
  && numberField(value, "eligibleWalletCount")
  && numberField(value, "pointsTotal")
  && numberField(value, "totalRows");

const diagnosticsSafe = (value: unknown) =>
  Array.isArray(value)
  && value.every((item) =>
    isRecord(item)
    && stringField(item, "code")
    && localizedText(item.message)
    && (item.severity === "info" || item.severity === "warning" || item.severity === "error")
    && stringField(item, "source")
  );

const isPointsRankingLedgerRuntime = (
  value: unknown,
  campaignId: string,
): value is PointsRankingLedgerRuntime =>
  isRecord(value)
  && value.campaignId === campaignId
  && (value.source === "api_runtime" || value.source === "seeded_runtime" || value.source === "fallback")
  && (value.status === "ready" || value.status === "review_required" || value.status === "blocked")
  && localizedText(value.boundary)
  && isSummary(value.summary)
  && isLedgerSection(value.ledger)
  && isRankingSection(value.ranking)
  && isEligibilityRoot(value.eligibilityRoot)
  && isNoLiveSideEffects(value.noLiveSideEffects)
  && diagnosticsSafe(value.diagnostics);

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

  if ("pointsRankingLedgerRuntime" in data) {
    return data.pointsRankingLedgerRuntime;
  }

  return data;
};

export const loadPointsRankingLedgerRuntimeApiBridgeState = async ({
  campaignId,
  config,
  fetchImpl = fetch,
}: LoadPointsRankingLedgerRuntimeApiBridgeStateInput): Promise<PointsRankingLedgerRuntimeApiBridgeState> => {
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

  const traceId = createPointsRankingLedgerRuntimeApiTraceId(normalizedConfig.normalizedTracePrefix);
  const result = await safeFetchJson(
    fetchImpl,
    buildPointsRankingLedgerRuntimeApiUrl(normalizedConfig.baseUrl, campaignId),
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

  if (!isPointsRankingLedgerRuntime(payload, campaignId)) {
    return createFallbackState(
      campaignId,
      normalizedConfig,
      "error_fallback",
      [diagnostic("API_PAYLOAD_INVALID", "error", { payload })],
      responseTraceId,
    );
  }

  const runtime = {
    ...payload,
    source: "api_runtime" as const,
    ...(responseTraceId ? { traceId: responseTraceId } : {}),
  };

  const envelopeData = isRecord(envelope.data) ? envelope.data : undefined;

  return {
    boundary: localizedText(envelopeData?.boundary)
      ? envelopeData.boundary as LocalizedText
      : pointsRankingLedgerRuntimeBoundary,
    campaignId,
    configured: true,
    diagnostics: [],
    loading: false,
    review: runtime,
    routeCount: runtimeMetadata.routeCount,
    runtime,
    source: "api_runtime",
    status: runtime.status,
    ...(responseTraceId ? { traceId: responseTraceId } : {}),
  };
};
