import {
  createRewardDistributionHandoffReadiness,
  rewardDistributionHandoffBoundary,
  rewardDistributionHandoffRequiredEvidenceKeys,
  rewardDistributionRequiredItemIds,
  sanitizeRewardDistributionHandoffRuntimeText,
  sanitizeRewardDistributionHandoffRuntimeValue,
  type RewardDistributionExportLinkage,
  type RewardDistributionHandoffEvidence,
  type RewardDistributionHandoffItem,
  type RewardDistributionHandoffNoLiveSideEffects,
  type RewardDistributionHandoffReadiness,
  type RewardDistributionHandoffRuntimeDiagnostic,
  type RewardDistributionHandoffRuntimeStatus,
  type RewardDistributionHandoffRuntimeSummary,
} from "../domain/rewardDistributionHandoffRuntime";
import { campaignDetail } from "../domain/fixtures";
import type { LocalizedText } from "../domain/types";

export type RewardDistributionHandoffRuntimeApiSource =
  | "api_runtime"
  | "error_fallback"
  | "loading"
  | "seeded_fallback";

export type RewardDistributionHandoffRuntimeApiStatus =
  | "blocked"
  | "error"
  | "fallback"
  | "loading"
  | "review_required";

export interface RewardDistributionHandoffRuntimeApiDiagnostic {
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

export interface RewardDistributionHandoffRuntimeApiConfig {
  baseUrl?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  tracePrefix?: string;
}

export interface RewardDistributionHandoffRuntimeApiBridgeState {
  boundary: LocalizedText;
  campaignId: string;
  configured: boolean;
  diagnostics: readonly RewardDistributionHandoffRuntimeApiDiagnostic[];
  loading: boolean;
  readiness: RewardDistributionHandoffReadiness;
  routeCount?: number;
  source: RewardDistributionHandoffRuntimeApiSource;
  status: RewardDistributionHandoffRuntimeApiStatus;
  traceId?: string;
}

export type RewardDistributionHandoffRuntimeApiFetch = typeof fetch;

interface LoadRewardDistributionHandoffRuntimeApiBridgeStateInput {
  campaignId: string;
  config?: RewardDistributionHandoffRuntimeApiConfig;
  fetchImpl?: RewardDistributionHandoffRuntimeApiFetch;
}

interface NormalizedConfig {
  baseUrl?: URL;
  configured: boolean;
  diagnostic?: RewardDistributionHandoffRuntimeApiDiagnostic;
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
  diagnostic?: RewardDistributionHandoffRuntimeApiDiagnostic;
  ok: boolean;
  status?: number;
  traceId?: string;
}

const defaultTimeoutMs = 2_000;
const minTimeoutMs = 250;
const maxTimeoutMs = 8_000;
const defaultTracePrefix = "reward-distribution-handoff-runtime";

export const rewardDistributionHandoffRuntimeApiBoundary: LocalizedText = {
  "en-US":
    "Local reward distribution handoff readiness API bridge only. No reward custody, reward distribution, payout, claim, provider call, wallet signature, contract write, queue publishing, scheduler execution, or worker execution is performed.",
  "zh-CN":
    "仅用于本地 reward distribution handoff readiness API bridge。不会执行奖励托管、发奖、payout、claim、provider 调用、钱包签名、合约写入、队列发布、调度执行或 worker 执行。",
  "zh-TW":
    "僅用於本地 reward distribution handoff readiness API bridge。不會執行獎勵託管、發獎、payout、claim、provider 呼叫、錢包簽名、合約寫入、隊列發布、排程執行或 worker 執行。",
};

const diagnosticMessages: Record<RewardDistributionHandoffRuntimeApiDiagnostic["code"], LocalizedText> = {
  API_BASE_URL_INVALID: {
    "en-US": "The local reward distribution handoff readiness API base URL is invalid, so seeded review data stays visible.",
    "zh-CN": "本地 reward distribution handoff readiness API base URL 无效，因此继续显示 seeded review 数据。",
    "zh-TW": "本地 reward distribution handoff readiness API base URL 無效，因此繼續顯示 seeded review 資料。",
  },
  API_BASE_URL_MISSING: {
    "en-US": "No local reward distribution handoff readiness API base URL is configured, so seeded review data is shown.",
    "zh-CN": "未配置本地 reward distribution handoff readiness API base URL，因此显示 seeded review 数据。",
    "zh-TW": "未設定本地 reward distribution handoff readiness API base URL，因此顯示 seeded review 資料。",
  },
  API_PAYLOAD_INVALID: {
    "en-US": "The local reward distribution handoff readiness payload is missing required no-live review fields.",
    "zh-CN": "本地 reward distribution handoff readiness payload 缺少必需 no-live review 字段。",
    "zh-TW": "本地 reward distribution handoff readiness payload 缺少必要 no-live review 欄位。",
  },
  API_REQUEST_FAILED: {
    "en-US": "The local reward distribution handoff readiness API request failed, so seeded review data stays visible.",
    "zh-CN": "本地 reward distribution handoff readiness API 请求失败，因此继续显示 seeded review 数据。",
    "zh-TW": "本地 reward distribution handoff readiness API 請求失敗，因此繼續顯示 seeded review 資料。",
  },
  API_REQUEST_TIMEOUT: {
    "en-US": "The local reward distribution handoff readiness API request timed out, so seeded review data stays visible.",
    "zh-CN": "本地 reward distribution handoff readiness API 请求超时，因此继续显示 seeded review 数据。",
    "zh-TW": "本地 reward distribution handoff readiness API 請求逾時，因此繼續顯示 seeded review 資料。",
  },
  API_RESPONSE_MALFORMED: {
    "en-US": "The local reward distribution handoff readiness API response envelope was not recognized.",
    "zh-CN": "本地 reward distribution handoff readiness API response envelope 无法识别。",
    "zh-TW": "本地 reward distribution handoff readiness API response envelope 無法識別。",
  },
};

const unsafeApiPatterns: Array<[RegExp, string]> = [
  [/\bprivate[-_\s]*key\b/gi, "__RDH_API_RED_0__"],
  [/\bseed[-_\s]*phrase\b/gi, "__RDH_API_RED_0__"],
  [/\bseedphrase\b/gi, "__RDH_API_RED_0__"],
  [/\bbearer[-_\s]*token\b/gi, "__RDH_API_RED_1__"],
  [/\bbearer\s+[A-Za-z0-9._~+/=-]+/gi, "__RDH_API_RED_1__"],
  [/\b(token|access_token|refresh_token|api_key|apikey)=([^&\s"'<>]+)/gi, "__RDH_API_RED_1__"],
  [/\b(secret|plain[-_\s]*secret|credential)\b[^\s,."'<>]*/gi, "__RDH_API_RED_1__"],
  [/\bprovider[-_\s]*(payload|response|request)\b/gi, "__RDH_API_RED_2__"],
  [/\bproviderpayload\b/gi, "__RDH_API_RED_2__"],
  [/\bprovider[-_\s]*call\b/gi, "__RDH_API_RED_2__"],
  [/\bstack\s*trace\b/gi, "__RDH_API_RED_3__"],
  [/at\s+[A-Za-z0-9_$.[\]<>]+\s+\([^)]*\)/g, "__RDH_API_RED_3__"],
  [/\/Users\/[^"'\s<>]+/gi, "__RDH_API_RED_4__"],
  [/\/private\/[^"'\s<>]*/gi, "__RDH_API_RED_4__"],
  [/\braw[-_\s]*signature\b/gi, "__RDH_API_RED_5__"],
  [/\bwallet[-_\s]*signature\b/gi, "__RDH_API_RED_5__"],
  [/\bwalletsignature\b/gi, "__RDH_API_RED_5__"],
  [/\bsignature\b/gi, "__RDH_API_RED_5__"],
  [/\btransaction[-_\s]*id\b\s*[^\s,."'<>]*/gi, "__RDH_API_RED_6__"],
  [/\btransactionid\b\s*[^\s,."'<>]*/gi, "__RDH_API_RED_6__"],
  [/\bpayout[-_\s]*id\b\s*[^\s,."'<>]*/gi, "__RDH_API_RED_6__"],
  [/\bpayoutid\b\s*[^\s,."'<>]*/gi, "__RDH_API_RED_6__"],
  [/\bcustody[-_\s]*id\b\s*[^\s,."'<>]*/gi, "__RDH_API_RED_6__"],
  [/\bcustodyid\b\s*[^\s,."'<>]*/gi, "__RDH_API_RED_6__"],
  [/\bdistribution[-_\s]*tx\b\s*[^\s,."'<>]*/gi, "__RDH_API_RED_6__"],
  [/\bdistributiontx\b\s*[^\s,."'<>]*/gi, "__RDH_API_RED_6__"],
  [/\bcontract[-_\s]*write\b\s*[^\s,."'<>]*/gi, "__RDH_API_RED_6__"],
  [/\bcontractwrite\b\s*[^\s,."'<>]*/gi, "__RDH_API_RED_6__"],
  [/\bclaim[-_\s]*transaction\b\s*[^\s,."'<>]*/gi, "__RDH_API_RED_6__"],
  [/\bclaimtransaction\b\s*[^\s,."'<>]*/gi, "__RDH_API_RED_6__"],
  [/\bsigned[-_\s]*url\b/gi, "__RDH_API_RED_7__"],
  [/https?:\/\/[^"'\s<>]+/gi, "__RDH_API_RED_7__"],
];

const unsafeApiReplacementLabels: Record<string, string> = {
  __RDH_API_RED_0__: "[REDACTED:PRIVATE_KEY]",
  __RDH_API_RED_1__: "[REDACTED:CREDENTIAL]",
  __RDH_API_RED_2__: "[REDACTED:PROVIDER_PAYLOAD]",
  __RDH_API_RED_3__: "[REDACTED:STACK]",
  __RDH_API_RED_4__: "[REDACTED:PRIVATE_PATH]",
  __RDH_API_RED_5__: "[REDACTED:WALLET_SIGNATURE]",
  __RDH_API_RED_6__: "[REDACTED:REWARD_EXECUTION_REF]",
  __RDH_API_RED_7__: "[REDACTED:ENDPOINT]",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const sanitizeRewardDistributionHandoffRuntimeApiText = (value: unknown): string => {
  const raw = typeof value === "string" ? value : JSON.stringify(value ?? "");
  const strippedUrlQuery = raw.replace(/\?[^"'\s<>]*/g, "?redacted-query");
  const domainSanitized = sanitizeRewardDistributionHandoffRuntimeText(strippedUrlQuery);
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

  return sanitizeRewardDistributionHandoffRuntimeApiText(value);
};

const diagnostic = (
  code: RewardDistributionHandoffRuntimeApiDiagnostic["code"],
  severity: RewardDistributionHandoffRuntimeApiDiagnostic["severity"],
  safeDetails?: Record<string, unknown>,
): RewardDistributionHandoffRuntimeApiDiagnostic => {
  const normalizedDetails = safeDetails
    ? Object.fromEntries(
      Object.entries(safeDetails).map(([key, value]) => [
        sanitizeRewardDistributionHandoffRuntimeApiText(key),
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
  const sanitized = sanitizeRewardDistributionHandoffRuntimeApiText(tracePrefix ?? defaultTracePrefix)
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
        sanitizeRewardDistributionHandoffRuntimeApiText(key).toLowerCase(),
        sanitizeRewardDistributionHandoffRuntimeApiText(value),
      ]),
  );

const normalizeConfig = (config: RewardDistributionHandoffRuntimeApiConfig | undefined): NormalizedConfig => {
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

export const buildRewardDistributionHandoffRuntimeApiUrl = (baseUrl: URL, campaignId: string) => {
  const next = new URL(baseUrl.toString());
  const basePath = next.pathname.replace(/\/+$/, "");
  const safeCampaignId = encodeURIComponent(campaignId);

  next.pathname = `${basePath}/api/campaigns/${safeCampaignId}/reward-distribution/handoff-readiness`;
  next.search = "";
  next.hash = "";

  return next.toString();
};

export const createRewardDistributionHandoffRuntimeApiTraceId = (prefix: string) =>
  `${prefix}-reward-distribution-handoff-runtime-${Date.now().toString(36)}`;

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
    ? sanitizeRewardDistributionHandoffRuntimeApiText(body.traceId)
    : undefined;

const safeFetchJson = async (
  fetchImpl: RewardDistributionHandoffRuntimeApiFetch,
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
      jsonError: sanitizeRewardDistributionHandoffRuntimeApiText(error),
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
        traceId: responseTraceId ? sanitizeRewardDistributionHandoffRuntimeApiText(responseTraceId) : undefined,
      };
    }

    return {
      body,
      ok: true,
      status: response.status,
      traceId: responseTraceId ? sanitizeRewardDistributionHandoffRuntimeApiText(responseTraceId) : undefined,
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
  traceId = "reward-distribution-handoff-local-review",
): RewardDistributionHandoffReadiness => ({
  ...createRewardDistributionHandoffReadiness({
    campaign: campaignDetail,
    source: "seeded_runtime",
    traceId,
  }),
  campaignId,
  traceId,
});

export const createRewardDistributionHandoffRuntimeApiLoadingState = (
  campaignId: string,
): RewardDistributionHandoffRuntimeApiBridgeState => ({
  boundary: rewardDistributionHandoffRuntimeApiBoundary,
  campaignId,
  configured: true,
  diagnostics: [],
  loading: true,
  readiness: seededReadiness(campaignId),
  source: "loading",
  status: "loading",
});

export const createRewardDistributionHandoffRuntimeApiSeededFallbackState = (
  campaignId: string,
  traceId?: string,
): RewardDistributionHandoffRuntimeApiBridgeState => ({
  boundary: rewardDistributionHandoffRuntimeApiBoundary,
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
  source: Extract<RewardDistributionHandoffRuntimeApiSource, "error_fallback" | "seeded_fallback">,
  diagnostics: readonly RewardDistributionHandoffRuntimeApiDiagnostic[],
  traceId?: string,
): RewardDistributionHandoffRuntimeApiBridgeState => ({
  boundary: rewardDistributionHandoffRuntimeApiBoundary,
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

const numberRecord = (value: unknown) =>
  isRecord(value) && Object.values(value).every((item) => typeof item === "number" && Number.isFinite(item));

const hasRequiredEvidenceKeys = (value: unknown): value is readonly string[] =>
  stringArray(value)
  && rewardDistributionHandoffRequiredEvidenceKeys.every((key) => value.includes(key));

const hasRequiredItems = (items: readonly RewardDistributionHandoffItem[]) => {
  const itemIds = new Set(items.map((item) => item.id));

  return rewardDistributionRequiredItemIds.every((itemId) => itemIds.has(itemId));
};

const diagnosticsSafe = (value: unknown): value is readonly RewardDistributionHandoffRuntimeDiagnostic[] =>
  Array.isArray(value)
  && value.every((item) =>
    isRecord(item)
    && stringField(item, "code")
    && stringField(item, "field")
    && stringField(item, "message")
    && (item.severity === "info" || item.severity === "warning" || item.severity === "error")
    && stringField(item, "source")
  );

const isEvidenceHandoff = (value: unknown): value is RewardDistributionHandoffEvidence =>
  isRecord(value)
  && stringArray(value.missingEvidenceKeys)
  && value.productionReady === false
  && hasRequiredEvidenceKeys(value.requiredEvidenceKeys)
  && (value.status === "missing" || value.status === "partial" || value.status === "ready_disabled")
  && localizedText(value.topBlocker);

const isExportLinkage = (value: unknown): value is RewardDistributionExportLinkage =>
  isRecord(value)
  && stringField(value, "campaignId")
  && value.derivedFrom === "seeded_export_preview"
  && numberField(value, "eligibleRecipientCount")
  && stringArray(value.exportBatchIds)
  && numberField(value, "exportReadyRecipientCount")
  && numberField(value, "evidenceHashCount")
  && value.localPreviewOnly === true
  && numberField(value, "recipientCount")
  && numberField(value, "riskFlaggedRecipientCount")
  && numberRecord(value.rowStatusCounts);

const isHandoffItem = (value: unknown): value is RewardDistributionHandoffItem =>
  isRecord(value)
  && localizedText(value.boundary)
  && rewardDistributionRequiredItemIds.includes(value.id as never)
  && localizedText(value.label)
  && value.liveExecutionEnabled === false
  && localizedText(value.nextAction)
  && (value.ownerRole === "ai_worker"
    || value.ownerRole === "finance_reviewer"
    || value.ownerRole === "internal_operator"
    || value.ownerRole === "legal_reviewer"
    || value.ownerRole === "project_owner")
  && value.requiredBeforeProduction === true
  && (value.state === "blocked" || value.state === "review_required" || value.state === "ready");

const isNoLiveSideEffects = (value: unknown): value is RewardDistributionHandoffNoLiveSideEffects =>
  isRecord(value)
  && [
    "liveClaim",
    "liveContractWrite",
    "livePayout",
    "liveProviderCall",
    "liveQueuePublishing",
    "liveRewardCustody",
    "liveRewardDistribution",
    "liveSchedulerExecution",
    "liveWalletSignature",
    "liveWorkerExecution",
  ].every((key) => value[key] === false);

const isSummary = (value: unknown): value is RewardDistributionHandoffRuntimeSummary =>
  isRecord(value)
  && [
    "blockedItemCount",
    "evidenceHashCount",
    "exportReadyRecipientCount",
    "itemCount",
    "missingEvidenceCount",
    "readyItemCount",
    "recipientCount",
    "reviewRequiredItemCount",
  ].every((key) => numberField(value, key))
  && localizedText(value.topBlocker)
  && localizedText(value.topNextAction);

const isRewardDistributionHandoffReadiness = (
  value: unknown,
  campaignId: string,
): value is RewardDistributionHandoffReadiness =>
  isRecord(value)
  && value.campaignId === campaignId
  && value.source === "server_runtime"
  && (value.status === "blocked" || value.status === "review_required" || value.status === "local_ready")
  && localizedText(value.boundary)
  && stringArray(value.diagnosticCodes)
  && diagnosticsSafe(value.diagnostics)
  && isEvidenceHandoff(value.evidenceHandoff)
  && isExportLinkage(value.exportLinkage)
  && Array.isArray(value.items)
  && value.items.every(isHandoffItem)
  && hasRequiredItems(value.items)
  && isNoLiveSideEffects(value.noLiveSideEffects)
  && value.productionReady === false
  && hasRequiredEvidenceKeys(value.requiredEvidenceKeys)
  && isSummary(value.summary)
  && (value.traceId === undefined || stringField(value, "traceId"))
  && value.valid === true;

const sanitizeRuntimeDiagnostic = (
  diagnostic: RewardDistributionHandoffRuntimeDiagnostic,
): RewardDistributionHandoffRuntimeDiagnostic => ({
  code: diagnostic.code,
  field: sanitizeRewardDistributionHandoffRuntimeApiText(diagnostic.field),
  message: sanitizeRewardDistributionHandoffRuntimeApiText(diagnostic.message),
  safeDetails: diagnostic.safeDetails === undefined
    ? undefined
    : sanitizeRewardDistributionHandoffRuntimeValue(diagnostic.safeDetails),
  severity: diagnostic.severity,
  source: sanitizeRewardDistributionHandoffRuntimeApiText(diagnostic.source),
});

const sanitizeReadiness = (
  readiness: RewardDistributionHandoffReadiness,
): RewardDistributionHandoffReadiness => ({
  ...readiness,
  boundary: localizedText(readiness.boundary) ? readiness.boundary : rewardDistributionHandoffBoundary,
  diagnostics: readiness.diagnostics.map(sanitizeRuntimeDiagnostic),
  traceId: readiness.traceId ? sanitizeRewardDistributionHandoffRuntimeApiText(readiness.traceId) : undefined,
});

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

  if ("rewardDistributionHandoffRuntime" in data) {
    return data.rewardDistributionHandoffRuntime;
  }

  return data;
};

const statusFromReadiness = (
  readiness: Pick<RewardDistributionHandoffReadiness, "status">,
): RewardDistributionHandoffRuntimeApiStatus => {
  if (readiness.status === "local_ready") {
    return "review_required";
  }

  return readiness.status as Exclude<RewardDistributionHandoffRuntimeStatus, "local_ready">;
};

export const loadRewardDistributionHandoffRuntimeApiBridgeState = async ({
  campaignId,
  config,
  fetchImpl = fetch,
}: LoadRewardDistributionHandoffRuntimeApiBridgeStateInput): Promise<RewardDistributionHandoffRuntimeApiBridgeState> => {
  const normalizedConfig = normalizeConfig(config);

  if (normalizedConfig.diagnostic) {
    return createFallbackState(
      campaignId,
      normalizedConfig,
      normalizedConfig.configured ? "error_fallback" : "seeded_fallback",
      [normalizedConfig.diagnostic],
    );
  }

  if (!normalizedConfig.baseUrl) {
    return createFallbackState(
      campaignId,
      normalizedConfig,
      "error_fallback",
      [diagnostic("API_BASE_URL_INVALID", "warning")],
    );
  }

  const traceId = createRewardDistributionHandoffRuntimeApiTraceId(normalizedConfig.normalizedTracePrefix);
  const url = buildRewardDistributionHandoffRuntimeApiUrl(normalizedConfig.baseUrl, campaignId);
  const result = await safeFetchJson(fetchImpl, url, {
    headers: {
      accept: "application/json",
      ...normalizedConfig.headers,
      "x-campaign-os-trace-id": traceId,
    },
    method: "GET",
  }, normalizedConfig.timeoutMs);

  if (!result.ok || result.diagnostic) {
    return createFallbackState(
      campaignId,
      normalizedConfig,
      "error_fallback",
      result.diagnostic ? [result.diagnostic] : [diagnostic("API_REQUEST_FAILED", "error")],
      result.traceId,
    );
  }

  if (!isApiEnvelope(result.body)) {
    return createFallbackState(
      campaignId,
      normalizedConfig,
      "error_fallback",
      [diagnostic("API_RESPONSE_MALFORMED", "error", { status: result.status })],
      result.traceId,
    );
  }

  if (!isRuntimeMetadata(result.body.runtime)) {
    return createFallbackState(
      campaignId,
      normalizedConfig,
      "error_fallback",
      [diagnostic("API_RESPONSE_MALFORMED", "error", { runtime: result.body.runtime })],
      result.traceId,
    );
  }

  const payload = payloadFromEnvelope(result.body);

  if (!isRewardDistributionHandoffReadiness(payload, campaignId)) {
    return createFallbackState(
      campaignId,
      normalizedConfig,
      "error_fallback",
      [diagnostic("API_PAYLOAD_INVALID", "error", { payload })],
      result.traceId,
    );
  }

  const readiness = sanitizeReadiness(payload);
  const responseData = isRecord(result.body.data) ? result.body.data : undefined;

  return {
    boundary: localizedText(responseData?.boundary)
      ? responseData.boundary
      : rewardDistributionHandoffRuntimeApiBoundary,
    campaignId,
    configured: true,
    diagnostics: [],
    loading: false,
    readiness,
    routeCount: result.body.runtime.routeCount,
    source: "api_runtime",
    status: statusFromReadiness(readiness),
    traceId: result.traceId ?? readiness.traceId ?? traceId,
  };
};
