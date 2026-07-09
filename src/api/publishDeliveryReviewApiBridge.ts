import { createDeliveryChecklistReadinessConsole, createLaunchConsoleCampaignBundles } from "../domain/campaign";
import { createPublishGateDecisionCenter, seededCampaignDraft } from "../domain/builder";
import { campaignDetail } from "../domain/fixtures";
import { createPublishDeliveryReview, publishDeliveryReviewBoundary } from "../domain/publishDeliveryReview";
import type {
  LocalizedText,
  PublishDeliveryReview,
  PublishDeliveryReviewSource,
  PublishDeliveryReviewStatus,
} from "../domain/types";

export type PublishDeliveryReviewApiSource = PublishDeliveryReviewSource;
export type PublishDeliveryReviewApiStatus = PublishDeliveryReviewStatus;

export interface PublishDeliveryReviewApiDiagnostic {
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

export interface PublishDeliveryReviewApiConfig {
  baseUrl?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  tracePrefix?: string;
}

export interface PublishDeliveryReviewApiBridgeState {
  boundary: LocalizedText;
  campaignId: string;
  configured: boolean;
  diagnostics: readonly PublishDeliveryReviewApiDiagnostic[];
  loading: boolean;
  review: PublishDeliveryReview;
  routeCount?: number;
  source: PublishDeliveryReviewApiSource;
  status: PublishDeliveryReviewApiStatus;
  traceId?: string;
}

export type PublishDeliveryReviewApiFetch = typeof fetch;

interface LoadPublishDeliveryReviewApiBridgeStateInput {
  campaignId: string;
  config?: PublishDeliveryReviewApiConfig;
  fetchImpl?: PublishDeliveryReviewApiFetch;
}

interface NormalizedConfig {
  baseUrl?: URL;
  configured: boolean;
  diagnostic?: PublishDeliveryReviewApiDiagnostic;
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
  diagnostic?: PublishDeliveryReviewApiDiagnostic;
  ok: boolean;
  status?: number;
  traceId?: string;
}

const defaultTimeoutMs = 2_000;
const minTimeoutMs = 250;
const maxTimeoutMs = 8_000;
const defaultTracePrefix = "publish-delivery-review";

export const publishDeliveryReviewApiBoundary: LocalizedText = {
  "en-US":
    "Local front-end/back-end publish delivery review bridge only. No production publish, provider call, wallet signature, contract write, storage write, reward custody, reward distribution, queue execution, scheduler execution, or analytics warehouse write is executed.",
  "zh-CN":
    "仅用于本地前后端发布交付 review bridge。不会执行生产发布、provider 调用、钱包签名、合约写入、storage 写入、奖励托管、发奖、queue 执行、scheduler 执行或 analytics warehouse 写入。",
  "zh-TW":
    "Local front-end/back-end publish delivery review bridge only. No production publish, provider call, wallet signature, contract write, storage write, reward custody, reward distribution, queue execution, scheduler execution, or analytics warehouse write is executed.",
};

const diagnosticMessages: Record<PublishDeliveryReviewApiDiagnostic["code"], LocalizedText> = {
  API_BASE_URL_INVALID: {
    "en-US": "The local publish delivery review API base URL is invalid, so review-safe fallback stays visible.",
    "zh-CN": "本地 publish delivery review API base URL 无效，因此继续显示 review-safe fallback。",
    "zh-TW": "The local publish delivery review API base URL is invalid, so review-safe fallback stays visible.",
  },
  API_BASE_URL_MISSING: {
    "en-US": "No local publish delivery review API base URL is configured, so seeded review data is shown.",
    "zh-CN": "未配置本地 publish delivery review API base URL，因此显示 seeded review 数据。",
    "zh-TW": "No local publish delivery review API base URL is configured, so seeded review data is shown.",
  },
  API_PAYLOAD_INVALID: {
    "en-US": "The local publish delivery review payload is missing required review sections.",
    "zh-CN": "本地 publish delivery review payload 缺少必需 review section。",
    "zh-TW": "The local publish delivery review payload is missing required review sections.",
  },
  API_REQUEST_FAILED: {
    "en-US": "The local publish delivery review API request failed, so review-safe fallback stays visible.",
    "zh-CN": "本地 publish delivery review API 请求失败，因此继续显示 review-safe fallback。",
    "zh-TW": "The local publish delivery review API request failed, so review-safe fallback stays visible.",
  },
  API_REQUEST_TIMEOUT: {
    "en-US": "The local publish delivery review API request timed out, so review-safe fallback stays visible.",
    "zh-CN": "本地 publish delivery review API 请求超时，因此继续显示 review-safe fallback。",
    "zh-TW": "The local publish delivery review API request timed out, so review-safe fallback stays visible.",
  },
  API_RESPONSE_MALFORMED: {
    "en-US": "The local publish delivery review API response envelope was not recognized.",
    "zh-CN": "本地 publish delivery review API response envelope 无法识别。",
    "zh-TW": "The local publish delivery review API response envelope was not recognized.",
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
  [/\bprovider[-_\s]*call\b/gi, "redacted external interaction"],
  [/\bstack\s*trace\b/gi, "redacted stack"],
  [/\bsigned[-_\s]*url\b/gi, "redacted signed link"],
  [/\bobject[-_\s]*key\b/gi, "redacted object reference"],
  [/\bstorage[-_\s]*key\b/gi, "redacted storage reference"],
  [/\bwallet[-_\s]*signature\b/gi, "redacted wallet action"],
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const sanitizePublishDeliveryReviewApiText = (value: unknown): string => {
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

  return sanitizePublishDeliveryReviewApiText(value);
};

const diagnostic = (
  code: PublishDeliveryReviewApiDiagnostic["code"],
  severity: PublishDeliveryReviewApiDiagnostic["severity"],
  safeDetails?: Record<string, unknown>,
): PublishDeliveryReviewApiDiagnostic => {
  const normalizedDetails = safeDetails
    ? Object.fromEntries(
      Object.entries(safeDetails).map(([key, value]) => [
        sanitizePublishDeliveryReviewApiText(key),
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
  const sanitized = sanitizePublishDeliveryReviewApiText(tracePrefix ?? defaultTracePrefix)
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
        sanitizePublishDeliveryReviewApiText(key).toLowerCase(),
        sanitizePublishDeliveryReviewApiText(value),
      ]),
  );

const normalizeConfig = (config: PublishDeliveryReviewApiConfig | undefined): NormalizedConfig => {
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

const endpointUrl = (baseUrl: URL, campaignId: string) => {
  const next = new URL(baseUrl.toString());
  const basePath = next.pathname.replace(/\/+$/, "");
  const safeCampaignId = encodeURIComponent(campaignId);

  next.pathname = `${basePath}/api/campaigns/${safeCampaignId}/publish-delivery-review`;
  next.search = "";
  next.hash = "";

  return next.toString();
};

const createTraceId = (prefix: string) => `${prefix}-publish-delivery-review-${Date.now().toString(36)}`;

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
    ? sanitizePublishDeliveryReviewApiText(body.traceId)
    : undefined;

const safeFetchJson = async (
  fetchImpl: PublishDeliveryReviewApiFetch,
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
      jsonError: sanitizePublishDeliveryReviewApiText(error),
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
        traceId: responseTraceId ? sanitizePublishDeliveryReviewApiText(responseTraceId) : undefined,
      };
    }

    return {
      body,
      ok: true,
      status: response.status,
      traceId: responseTraceId ? sanitizePublishDeliveryReviewApiText(responseTraceId) : undefined,
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

const createSeededReview = (
  campaignId: string,
  source: Extract<PublishDeliveryReviewSource, "error_fallback" | "loading" | "seeded_fallback">,
  traceId?: string,
): PublishDeliveryReview =>
  createPublishDeliveryReview({
    backendRuntime: {
      productionDependencyBlockers: [
        {
          code: "PRODUCTION_DEPENDENCY_DEFERRED",
          field: "backend",
          message: "Production backend services remain deferred for local MVP review.",
          severity: "error",
        },
      ],
      productionReady: false,
      profileId: "local-review",
      routeCoverage: {
        blockedCount: 0,
        readyCount: 1,
        reviewRequiredCount: 1,
        routeCount: 1,
      },
      status: "blocked",
    },
    campaignId,
    deliveryChecklist: {
      campaignId,
      ...createDeliveryChecklistReadinessConsole(),
    },
    diagnostics: [
      {
        code: "PUBLISH_DELIVERY_REVIEW_API_FALLBACK",
        message: {
          "en-US": "Seeded local review data is shown until the local API runtime returns a valid review payload.",
          "zh-CN": "在本地 API runtime 返回有效 review payload 之前，先显示 seeded 本地 review 数据。",
          "zh-TW": "Seeded local review data is shown until the local API runtime returns a valid review payload.",
        },
        severity: "info",
        source: "apiBridge",
      },
    ],
    launchBundles: createLaunchConsoleCampaignBundles(campaignDetail),
    publishGate: createPublishGateDecisionCenter(seededCampaignDraft),
    source,
    traceId,
  });

export const createPublishDeliveryReviewApiLoadingState = (
  campaignId: string,
): PublishDeliveryReviewApiBridgeState => ({
  boundary: publishDeliveryReviewApiBoundary,
  campaignId,
  configured: true,
  diagnostics: [],
  loading: true,
  review: {
    ...createSeededReview(campaignId, "loading"),
    source: "loading",
    status: "loading",
  },
  source: "loading",
  status: "loading",
});

export const createPublishDeliveryReviewApiSeededFallbackState = (
  campaignId: string,
  traceId?: string,
): PublishDeliveryReviewApiBridgeState => {
  const review = createSeededReview(campaignId, "seeded_fallback", traceId);

  return {
    boundary: publishDeliveryReviewApiBoundary,
    campaignId,
    configured: false,
    diagnostics: [],
    loading: false,
    review,
    source: "seeded_fallback",
    status: "fallback",
    ...(traceId ? { traceId } : {}),
  };
};

const createFallbackState = (
  campaignId: string,
  normalizedConfig: NormalizedConfig,
  source: Extract<PublishDeliveryReviewApiSource, "error_fallback" | "seeded_fallback">,
  diagnostics: readonly PublishDeliveryReviewApiDiagnostic[],
  traceId?: string,
): PublishDeliveryReviewApiBridgeState => {
  const review = createSeededReview(campaignId, source, traceId);
  const status = source === "seeded_fallback" ? "fallback" : "error";

  return {
    boundary: publishDeliveryReviewApiBoundary,
    campaignId,
    configured: normalizedConfig.configured,
    diagnostics,
    loading: false,
    review: {
      ...review,
      status,
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

const isNoLiveSideEffects = (value: unknown) =>
  isRecord(value)
  && value.liveContractExecuted === false
  && value.liveProviderExecuted === false
  && value.liveRewardExecuted === false
  && value.liveStorageExecuted === false;

const isBackendRuntime = (value: unknown) =>
  isRecord(value)
  && value.productionReady === false
  && typeof value.profileId === "string"
  && (value.status === "ready" || value.status === "blocked" || value.status === "scaffold")
  && Array.isArray(value.productionDependencyBlockers)
  && isRecord(value.noLiveSideEffects)
  && Object.values(value.noLiveSideEffects).every((flag) => flag === false)
  && isRecord(value.tracePolicy)
  && value.tracePolicy.traceHeaderName === "x-campaign-os-trace-id"
  && value.tracePolicy.successEnvelopeTraceId === true
  && value.tracePolicy.failureEnvelopeTraceId === true
  && isRecord(value.routeCoverage)
  && ["routeCount", "reviewRequiredCount", "readyCount", "blockedCount"].every((key) =>
    numberField(value.routeCoverage as Record<string, unknown>, key)
  );

const isReviewSummary = (value: unknown) =>
  isRecord(value)
  && [
    "blockerCount",
    "warningCount",
    "passedCount",
    "checklistCoveredCount",
    "checklistTotalCount",
    "launchBundleCount",
    "handoffReviewRequiredCount",
    "repositoryEvidenceCount",
    "exportEvidenceHashCoverage",
    "productionBlockerCount",
  ].every((key) => numberField(value, key))
  && localizedText(value.topNextAction);

const isPublishGate = (value: unknown) =>
  isRecord(value)
  && typeof value.ready === "boolean"
  && isRecord(value.counts)
  && ["blockers", "warnings", "passed", "total"].every((key) =>
    numberField(value.counts as Record<string, unknown>, key)
  )
  && Array.isArray(value.topBlockers)
  && Array.isArray(value.topWarnings)
  && Array.isArray(value.approvalRoutes)
  && localizedText(value.boundary);

const isDeliveryChecklist = (value: unknown) =>
  isRecord(value)
  && Array.isArray(value.groups)
  && ["totalItems", "coveredItems", "blockedItems", "needsReviewItems", "deferredItems"].every((key) =>
    numberField(value, key)
  )
  && localizedText(value.boundary)
  && localizedText(value.topNextAction);

const isLaunchBundles = (value: unknown) =>
  isRecord(value)
  && Array.isArray(value.bundles)
  && Array.isArray(value.handoffs)
  && isRecord(value.summary)
  && [
    "totalBundles",
    "readyCount",
    "reviewRequiredCount",
    "blockedCount",
    "localOnlyCount",
    "launchBlockingCount",
    "handoffRequiredCount",
  ].every((key) => numberField(value.summary as Record<string, unknown>, key))
  && localizedText(value.boundary)
  && localizedText(value.nextAction);

const isRepositoryEvidence = (value: unknown) =>
  isRecord(value)
  && typeof value.available === "boolean"
  && [
    "taskEvidenceCount",
    "completedEvidenceCount",
    "manualReviewEvidenceCount",
    "failedEvidenceCount",
    "evidenceHashCoverage",
    "exportRowsWithEvidence",
  ].every((key) => numberField(value, key))
  && localizedText(value.boundary)
  && isNoLiveSideEffects(value.noLiveSideEffects);

const isPublishDeliveryReview = (value: unknown, campaignId: string): value is PublishDeliveryReview =>
  isRecord(value)
  && value.campaignId === campaignId
  && (value.source === "api_runtime" || value.source === "seeded_fallback" || value.source === "error_fallback")
  && (
    value.status === "ready"
    || value.status === "blocked"
    || value.status === "warning"
    || value.status === "fallback"
    || value.status === "error"
  )
  && (value.launchState === "ready" || value.launchState === "warning" || value.launchState === "blocked")
  && typeof value.ready === "boolean"
  && isReviewSummary(value.summary)
  && isPublishGate(value.publishGate)
  && isDeliveryChecklist(value.deliveryChecklist)
  && isLaunchBundles(value.launchBundles)
  && isRepositoryEvidence(value.repositoryEvidence)
  && isBackendRuntime(value.backendRuntime)
  && Array.isArray(value.diagnostics)
  && localizedText(value.boundary)
  && stringField(value, "lastReviewedAt");

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

  if ("publishDeliveryReview" in data) {
    return data.publishDeliveryReview;
  }

  return data;
};

export const loadPublishDeliveryReviewApiBridgeState = async ({
  campaignId,
  config,
  fetchImpl = fetch,
}: LoadPublishDeliveryReviewApiBridgeStateInput): Promise<PublishDeliveryReviewApiBridgeState> => {
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

  const traceId = createTraceId(normalizedConfig.normalizedTracePrefix);
  const result = await safeFetchJson(
    fetchImpl,
    endpointUrl(normalizedConfig.baseUrl, campaignId),
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

  if (!isPublishDeliveryReview(payload, campaignId)) {
    return createFallbackState(
      campaignId,
      normalizedConfig,
      "error_fallback",
      [diagnostic("API_PAYLOAD_INVALID", "error", { payload })],
      responseTraceId,
    );
  }

  return {
    boundary: publishDeliveryReviewBoundary,
    campaignId,
    configured: true,
    diagnostics: [],
    loading: false,
    review: payload,
    routeCount: runtimeMetadata.routeCount,
    source: "api_runtime",
    status: payload.status,
    ...(responseTraceId ? { traceId: responseTraceId } : {}),
  };
};
