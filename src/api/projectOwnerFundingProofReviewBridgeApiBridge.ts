import {
  createProjectOwnerFundingProofReviewBridge,
  projectOwnerFundingProofBoundary,
  projectOwnerFundingProofRequiredEvidenceKeys,
  projectOwnerFundingProofReviewItemIds,
  sanitizeProjectOwnerFundingProofReviewValue,
  type ProjectOwnerFundingProofDiagnostic,
  type ProjectOwnerFundingProofItem,
  type ProjectOwnerFundingProofPackage,
  type ProjectOwnerFundingProofPackageInput,
  type ProjectOwnerFundingProofReviewBridge,
  type ProjectOwnerFundingProofSafetyFlags,
  type ProjectOwnerFundingProofStatus,
  type ProjectOwnerFundingProofSummary,
} from "../domain/projectOwnerFundingProofReviewBridge";
import { campaignDetail } from "../domain/fixtures";
import type { LocalizedText } from "../domain/types";

export type ProjectOwnerFundingProofReviewBridgeApiSource =
  | "api_runtime"
  | "error_fallback"
  | "loading"
  | "seeded_fallback";

export type ProjectOwnerFundingProofReviewBridgeApiStatus =
  | "blocked"
  | "error"
  | "fallback"
  | "loading"
  | "review_required";

export interface ProjectOwnerFundingProofReviewBridgeApiDiagnostic {
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

export interface ProjectOwnerFundingProofReviewBridgeApiConfig {
  baseUrl?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  tracePrefix?: string;
}

export interface ProjectOwnerFundingProofReviewBridgeApiState {
  boundary: LocalizedText;
  campaignId: string;
  configured: boolean;
  diagnostics: readonly ProjectOwnerFundingProofReviewBridgeApiDiagnostic[];
  loading: boolean;
  review: ProjectOwnerFundingProofReviewBridge;
  routeCount?: number;
  source: ProjectOwnerFundingProofReviewBridgeApiSource;
  status: ProjectOwnerFundingProofReviewBridgeApiStatus;
  traceId?: string;
}

export type ProjectOwnerFundingProofReviewBridgeApiFetch = typeof fetch;

interface LoadProjectOwnerFundingProofReviewBridgeApiStateInput {
  campaignId: string;
  config?: ProjectOwnerFundingProofReviewBridgeApiConfig;
  fetchImpl?: ProjectOwnerFundingProofReviewBridgeApiFetch;
}

interface SubmitProjectOwnerFundingProofReviewBridgeApiStateInput
  extends LoadProjectOwnerFundingProofReviewBridgeApiStateInput {
  proofPackage?: ProjectOwnerFundingProofPackageInput;
}

interface NormalizedConfig {
  baseUrl?: URL;
  configured: boolean;
  diagnostic?: ProjectOwnerFundingProofReviewBridgeApiDiagnostic;
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
  diagnostic?: ProjectOwnerFundingProofReviewBridgeApiDiagnostic;
  ok: boolean;
  status?: number;
  traceId?: string;
}

const defaultTimeoutMs = 2_000;
const minTimeoutMs = 250;
const maxTimeoutMs = 8_000;
const defaultTracePrefix = "project-owner-funding-proof-review";

export const projectOwnerFundingProofReviewBridgeApiBoundary: LocalizedText = {
  "en-US":
    "Local project owner funding proof review API bridge only. No upload, object storage write, signed URL, funding transfer, reward custody, reward distribution, provider call, wallet signature, contract write, queue publishing, scheduler execution, or worker execution is performed.",
  "zh-CN":
    "仅用于本地项目方资金证明 review API bridge。不会执行上传、对象存储写入、signed URL、资金转移、奖励托管、发奖、provider 调用、钱包签名、合约写入、队列发布、调度执行或 worker 执行。",
  "zh-TW":
    "僅用於本地專案方資金證明 review API bridge。不會執行上傳、物件儲存寫入、signed URL、資金轉移、獎勵託管、發獎、provider 呼叫、錢包簽名、合約寫入、隊列發布、排程執行或 worker 執行。",
};

const diagnosticMessages: Record<ProjectOwnerFundingProofReviewBridgeApiDiagnostic["code"], LocalizedText> = {
  API_BASE_URL_INVALID: {
    "en-US": "The local project owner funding proof review API base URL is invalid, so seeded review data stays visible.",
    "zh-CN": "本地项目方资金证明 review API base URL 无效，因此继续显示 seeded review 数据。",
    "zh-TW": "本地專案方資金證明 review API base URL 無效，因此繼續顯示 seeded review 資料。",
  },
  API_BASE_URL_MISSING: {
    "en-US": "No local project owner funding proof review API base URL is configured, so seeded review data is shown.",
    "zh-CN": "未配置本地项目方资金证明 review API base URL，因此显示 seeded review 数据。",
    "zh-TW": "未設定本地專案方資金證明 review API base URL，因此顯示 seeded review 資料。",
  },
  API_PAYLOAD_INVALID: {
    "en-US": "The local project owner funding proof review payload is missing required no-live review fields.",
    "zh-CN": "本地项目方资金证明 review payload 缺少必需 no-live review 字段。",
    "zh-TW": "本地專案方資金證明 review payload 缺少必要 no-live review 欄位。",
  },
  API_REQUEST_FAILED: {
    "en-US": "The local project owner funding proof review API request failed, so seeded review data stays visible.",
    "zh-CN": "本地项目方资金证明 review API 请求失败，因此继续显示 seeded review 数据。",
    "zh-TW": "本地專案方資金證明 review API 請求失敗，因此繼續顯示 seeded review 資料。",
  },
  API_REQUEST_TIMEOUT: {
    "en-US": "The local project owner funding proof review API request timed out, so seeded review data stays visible.",
    "zh-CN": "本地项目方资金证明 review API 请求超时，因此继续显示 seeded review 数据。",
    "zh-TW": "本地專案方資金證明 review API 請求逾時，因此繼續顯示 seeded review 資料。",
  },
  API_RESPONSE_MALFORMED: {
    "en-US": "The local project owner funding proof review API response envelope was not recognized.",
    "zh-CN": "本地项目方资金证明 review API response envelope 无法识别。",
    "zh-TW": "本地專案方資金證明 review API response envelope 無法識別。",
  },
};

const unsafeApiPatterns: Array<[RegExp, string]> = [
  [/\bprivate[-_\s]*key\b/gi, "__FP_API_RED_0__"],
  [/\bseed[-_\s]*phrase\b/gi, "__FP_API_RED_0__"],
  [/\bseedphrase\b/gi, "__FP_API_RED_0__"],
  [/\bbearer[-_\s]*token\b/gi, "__FP_API_RED_1__"],
  [/\bbearer\s+[A-Za-z0-9._~+/=-]+/gi, "__FP_API_RED_1__"],
  [/\b(token|access_token|refresh_token|api_key|apikey)=([^&\s"'<>]+)/gi, "__FP_API_RED_1__"],
  [/\b(secret|plain[-_\s]*secret|credential)\b[^\s,."'<>]*/gi, "__FP_API_RED_1__"],
  [/\bprovider[-_\s]*(payload|response|request)\b/gi, "__FP_API_RED_2__"],
  [/\bproviderpayload\b/gi, "__FP_API_RED_2__"],
  [/\bprovider[-_\s]*call\b/gi, "__FP_API_RED_2__"],
  [/\bstack\s*trace\b/gi, "__FP_API_RED_3__"],
  [/at\s+[A-Za-z0-9_$.[\]<>]+\s+\([^)]*\)/g, "__FP_API_RED_3__"],
  [/\/Users\/[^"'\s<>]+/gi, "__FP_API_RED_4__"],
  [/\/private\/[^"'\s<>]*/gi, "__FP_API_RED_4__"],
  [/\braw[-_\s]*signature\b/gi, "__FP_API_RED_5__"],
  [/\bwallet[-_\s]*signature\b/gi, "__FP_API_RED_5__"],
  [/\bwalletsignature\b/gi, "__FP_API_RED_5__"],
  [/\bsignature\b/gi, "__FP_API_RED_5__"],
  [/\btransaction[-_\s]*id\b\s*[^\s,."'<>]*/gi, "__FP_API_RED_6__"],
  [/\btransactionid\b\s*[^\s,."'<>]*/gi, "__FP_API_RED_6__"],
  [/\bpayout[-_\s]*id\b\s*[^\s,."'<>]*/gi, "__FP_API_RED_6__"],
  [/\bpayoutid\b\s*[^\s,."'<>]*/gi, "__FP_API_RED_6__"],
  [/\bcustody[-_\s]*id\b\s*[^\s,."'<>]*/gi, "__FP_API_RED_6__"],
  [/\bcustodyid\b\s*[^\s,."'<>]*/gi, "__FP_API_RED_6__"],
  [/\bdistribution[-_\s]*tx\b\s*[^\s,."'<>]*/gi, "__FP_API_RED_6__"],
  [/\bdistributiontx\b\s*[^\s,."'<>]*/gi, "__FP_API_RED_6__"],
  [/\bcontract[-_\s]*write\b\s*[^\s,."'<>]*/gi, "__FP_API_RED_6__"],
  [/\bcontractwrite\b\s*[^\s,."'<>]*/gi, "__FP_API_RED_6__"],
  [/\bclaim[-_\s]*transaction\b\s*[^\s,."'<>]*/gi, "__FP_API_RED_6__"],
  [/\bclaimtransaction\b\s*[^\s,."'<>]*/gi, "__FP_API_RED_6__"],
  [/\bsigned[-_\s]*url\b\s*[:=]\s*[^\s,."'<>]+/gi, "__FP_API_RED_7__"],
  [/\bsignedurl\b\s*[:=]\s*[^\s,."'<>]+/gi, "__FP_API_RED_7__"],
  [/https?:\/\/[^"'\s<>]+/gi, "__FP_API_RED_7__"],
];

const unsafeApiReplacementLabels: Record<string, string> = {
  __FP_API_RED_0__: "[REDACTED:PRIVATE_KEY]",
  __FP_API_RED_1__: "[REDACTED:CREDENTIAL]",
  __FP_API_RED_2__: "[REDACTED:PROVIDER_PAYLOAD]",
  __FP_API_RED_3__: "[REDACTED:STACK]",
  __FP_API_RED_4__: "[REDACTED:PRIVATE_PATH]",
  __FP_API_RED_5__: "[REDACTED:WALLET_SIGNATURE]",
  __FP_API_RED_6__: "[REDACTED:REWARD_EXECUTION_REF]",
  __FP_API_RED_7__: "[REDACTED:ENDPOINT]",
};

const proofPackageTextFields = [
  "amountSummaryRef",
  "disclaimerSignoffRef",
  "exportBatchId",
  "financeReviewRef",
  "operatorReviewRef",
  "proofReference",
  "recipientListHashRef",
  "rewardProviderStatementRef",
] as const satisfies readonly (keyof ProjectOwnerFundingProofPackageInput)[];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const sanitizeProjectOwnerFundingProofReviewBridgeApiText = (value: unknown): string => {
  const raw = typeof value === "string" ? value : JSON.stringify(value ?? "");
  const strippedUrlQuery = raw.replace(/\?[^"'\s<>]*/g, "?redacted-query");
  const apiSanitized = unsafeApiPatterns.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    strippedUrlQuery,
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

  return sanitizeProjectOwnerFundingProofReviewBridgeApiText(value);
};

const diagnostic = (
  code: ProjectOwnerFundingProofReviewBridgeApiDiagnostic["code"],
  severity: ProjectOwnerFundingProofReviewBridgeApiDiagnostic["severity"],
  safeDetails?: Record<string, unknown>,
): ProjectOwnerFundingProofReviewBridgeApiDiagnostic => {
  const normalizedDetails = safeDetails
    ? Object.fromEntries(
      Object.entries(safeDetails).map(([key, value]) => [
        sanitizeProjectOwnerFundingProofReviewBridgeApiText(key),
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
  const sanitized = sanitizeProjectOwnerFundingProofReviewBridgeApiText(tracePrefix ?? defaultTracePrefix)
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
        sanitizeProjectOwnerFundingProofReviewBridgeApiText(key).toLowerCase(),
        sanitizeProjectOwnerFundingProofReviewBridgeApiText(value),
      ]),
  );

const normalizeConfig = (config: ProjectOwnerFundingProofReviewBridgeApiConfig | undefined): NormalizedConfig => {
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

export const buildProjectOwnerFundingProofReviewBridgeApiUrl = (baseUrl: URL, campaignId: string) => {
  const next = new URL(baseUrl.toString());
  const basePath = next.pathname.replace(/\/+$/, "");
  const safeCampaignId = encodeURIComponent(campaignId);

  next.pathname = `${basePath}/api/campaigns/${safeCampaignId}/reward-distribution/funding-proof-review`;
  next.search = "";
  next.hash = "";

  return next.toString();
};

export const createProjectOwnerFundingProofReviewBridgeApiTraceId = (prefix: string) =>
  `${prefix}-project-owner-funding-proof-review-${Date.now().toString(36)}`;

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
    ? sanitizeProjectOwnerFundingProofReviewBridgeApiText(body.traceId)
    : undefined;

const safeFetchJson = async (
  fetchImpl: ProjectOwnerFundingProofReviewBridgeApiFetch,
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
      jsonError: sanitizeProjectOwnerFundingProofReviewBridgeApiText(error),
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
        traceId: responseTraceId ? sanitizeProjectOwnerFundingProofReviewBridgeApiText(responseTraceId) : undefined,
      };
    }

    return {
      body,
      ok: true,
      status: response.status,
      traceId: responseTraceId ? sanitizeProjectOwnerFundingProofReviewBridgeApiText(responseTraceId) : undefined,
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

const seededReview = (
  campaignId: string,
  traceId = "project-owner-funding-proof-local-review",
): ProjectOwnerFundingProofReviewBridge => ({
  ...createProjectOwnerFundingProofReviewBridge({
    campaign: campaignDetail,
    source: "seeded_runtime",
    traceId,
  }),
  campaignId,
  traceId,
});

export const createProjectOwnerFundingProofReviewBridgeApiLoadingState = (
  campaignId: string,
): ProjectOwnerFundingProofReviewBridgeApiState => ({
  boundary: projectOwnerFundingProofReviewBridgeApiBoundary,
  campaignId,
  configured: true,
  diagnostics: [],
  loading: true,
  review: seededReview(campaignId),
  source: "loading",
  status: "loading",
});

export const createProjectOwnerFundingProofReviewBridgeApiSeededFallbackState = (
  campaignId: string,
  traceId?: string,
): ProjectOwnerFundingProofReviewBridgeApiState => ({
  boundary: projectOwnerFundingProofReviewBridgeApiBoundary,
  campaignId,
  configured: false,
  diagnostics: [],
  loading: false,
  review: seededReview(campaignId, traceId),
  source: "seeded_fallback",
  status: "fallback",
  ...(traceId ? { traceId } : {}),
});

const createFallbackState = (
  campaignId: string,
  normalizedConfig: NormalizedConfig,
  source: Extract<ProjectOwnerFundingProofReviewBridgeApiSource, "error_fallback" | "seeded_fallback">,
  diagnostics: readonly ProjectOwnerFundingProofReviewBridgeApiDiagnostic[],
  traceId?: string,
): ProjectOwnerFundingProofReviewBridgeApiState => ({
  boundary: projectOwnerFundingProofReviewBridgeApiBoundary,
  campaignId,
  configured: normalizedConfig.configured,
  diagnostics,
  loading: false,
  review: seededReview(campaignId, traceId),
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

const hasRequiredEvidenceKeys = (value: unknown): value is readonly string[] =>
  stringArray(value)
  && projectOwnerFundingProofRequiredEvidenceKeys.every((key) => value.includes(key));

const hasRequiredItems = (items: readonly ProjectOwnerFundingProofItem[]) => {
  const itemIds = new Set(items.map((item) => item.id));

  return projectOwnerFundingProofReviewItemIds.every((itemId) => itemIds.has(itemId));
};

const diagnosticsSafe = (value: unknown): value is readonly ProjectOwnerFundingProofDiagnostic[] =>
  Array.isArray(value)
  && value.every((item) =>
    isRecord(item)
    && stringField(item, "code")
    && stringField(item, "field")
    && stringField(item, "message")
    && (item.severity === "info" || item.severity === "warning" || item.severity === "error")
    && stringField(item, "source")
  );

const isProofPackage = (value: unknown): value is ProjectOwnerFundingProofPackage =>
  isRecord(value)
  && stringArray(value.missingEvidenceKeys)
  && value.productionReady === false
  && hasRequiredEvidenceKeys(value.requiredEvidenceKeys)
  && (value.reviewState === "accepted_for_handoff"
    || value.reviewState === "in_review"
    || value.reviewState === "missing"
    || value.reviewState === "submitted")
  && (value.status === "missing" || value.status === "partial" || value.status === "ready_disabled")
  && (value.submittedByRole === "internal_operator"
    || value.submittedByRole === "project_owner"
    || value.submittedByRole === "system_seed")
  && localizedText(value.topBlocker);

const isReviewItem = (value: unknown): value is ProjectOwnerFundingProofItem =>
  isRecord(value)
  && localizedText(value.boundary)
  && projectOwnerFundingProofReviewItemIds.includes(value.id as never)
  && localizedText(value.label)
  && value.liveExecutionEnabled === false
  && localizedText(value.nextAction)
  && (value.ownerRole === "finance_reviewer"
    || value.ownerRole === "internal_operator"
    || value.ownerRole === "legal_reviewer"
    || value.ownerRole === "project_owner")
  && value.requiredBeforeProduction === true
  && (value.risk === "high" || value.risk === "medium" || value.risk === "low")
  && (value.state === "blocked" || value.state === "review_required" || value.state === "ready");

const isSafetyFlags = (value: unknown): value is ProjectOwnerFundingProofSafetyFlags =>
  isRecord(value)
  && [
    "liveContractWrite",
    "liveFundingTransfer",
    "liveObjectStorageWrite",
    "liveProviderCall",
    "liveQueuePublishing",
    "liveRewardCustody",
    "liveRewardDistribution",
    "liveSchedulerExecution",
    "liveWalletSignature",
    "liveWorkerExecution",
  ].every((key) => value[key] === false);

const isSummary = (value: unknown): value is ProjectOwnerFundingProofSummary =>
  isRecord(value)
  && [
    "blockedItemCount",
    "readyItemCount",
    "requiredItemCount",
    "reviewRequiredItemCount",
  ].every((key) => numberField(value, key))
  && (value.status === "blocked" || value.status === "review_required" || value.status === "local_ready")
  && localizedText(value.topBlocker)
  && localizedText(value.topNextAction);

const isProjectOwnerFundingProofReviewBridge = (
  value: unknown,
  campaignId: string,
): value is ProjectOwnerFundingProofReviewBridge =>
  isRecord(value)
  && value.campaignId === campaignId
  && value.source === "server_runtime"
  && (value.status === "blocked" || value.status === "review_required" || value.status === "local_ready")
  && localizedText(value.boundary)
  && stringArray(value.diagnosticCodes)
  && diagnosticsSafe(value.diagnostics)
  && Array.isArray(value.items)
  && value.items.every(isReviewItem)
  && hasRequiredItems(value.items)
  && value.productionReady === false
  && isProofPackage(value.proofPackage)
  && hasRequiredEvidenceKeys(value.requiredEvidenceKeys)
  && isSafetyFlags(value.safety)
  && isSummary(value.summary)
  && (value.traceId === undefined || stringField(value, "traceId"))
  && value.valid === true;

const sanitizeReviewDiagnostic = (
  item: ProjectOwnerFundingProofDiagnostic,
): ProjectOwnerFundingProofDiagnostic => ({
  code: item.code,
  field: sanitizeProjectOwnerFundingProofReviewBridgeApiText(item.field),
  message: sanitizeProjectOwnerFundingProofReviewBridgeApiText(item.message),
  ...(item.safeDetails === undefined ? {} : {
    safeDetails: sanitizeProjectOwnerFundingProofReviewValue(item.safeDetails),
  }),
  severity: item.severity,
  source: sanitizeProjectOwnerFundingProofReviewBridgeApiText(item.source) as ProjectOwnerFundingProofDiagnostic["source"],
});

const sanitizeReview = (
  review: ProjectOwnerFundingProofReviewBridge,
): ProjectOwnerFundingProofReviewBridge => ({
  ...review,
  boundary: localizedText(review.boundary) ? review.boundary : projectOwnerFundingProofBoundary,
  diagnostics: review.diagnostics.map(sanitizeReviewDiagnostic),
  traceId: review.traceId ? sanitizeProjectOwnerFundingProofReviewBridgeApiText(review.traceId) : undefined,
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

  if ("projectOwnerFundingProofReviewBridge" in data) {
    return data.projectOwnerFundingProofReviewBridge;
  }

  return data;
};

const statusFromReview = (
  review: Pick<ProjectOwnerFundingProofReviewBridge, "status">,
): ProjectOwnerFundingProofReviewBridgeApiStatus => {
  if (review.status === "local_ready") {
    return "review_required";
  }

  return review.status as Exclude<ProjectOwnerFundingProofStatus, "local_ready">;
};

const normalizeProofPackageBody = (
  proofPackage: ProjectOwnerFundingProofPackageInput | undefined,
): ProjectOwnerFundingProofPackageInput => {
  const normalized: ProjectOwnerFundingProofPackageInput = {};

  for (const key of proofPackageTextFields) {
    const value = proofPackage?.[key];

    if (typeof value !== "string") {
      continue;
    }

    const sanitized = sanitizeProjectOwnerFundingProofReviewBridgeApiText(value);

    if (sanitized && !sanitized.includes("[REDACTED:")) {
      normalized[key] = sanitized;
    }
  }

  if (
    proofPackage?.submittedByRole === "internal_operator"
    || proofPackage?.submittedByRole === "project_owner"
    || proofPackage?.submittedByRole === "system_seed"
  ) {
    normalized.submittedByRole = proofPackage.submittedByRole;
  }

  if (
    proofPackage?.reviewState === "accepted_for_handoff"
    || proofPackage?.reviewState === "in_review"
    || proofPackage?.reviewState === "missing"
    || proofPackage?.reviewState === "submitted"
  ) {
    normalized.reviewState = proofPackage.reviewState;
  }

  return normalized;
};

const requestProjectOwnerFundingProofReviewBridgeApiState = async ({
  campaignId,
  config,
  fetchImpl = fetch,
  proofPackage,
  requestMethod,
}: SubmitProjectOwnerFundingProofReviewBridgeApiStateInput & {
  requestMethod: "GET" | "POST";
}): Promise<ProjectOwnerFundingProofReviewBridgeApiState> => {
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

  const traceId = createProjectOwnerFundingProofReviewBridgeApiTraceId(normalizedConfig.normalizedTracePrefix);
  const url = buildProjectOwnerFundingProofReviewBridgeApiUrl(normalizedConfig.baseUrl, campaignId);
  const result = await safeFetchJson(fetchImpl, url, {
    ...(requestMethod === "POST"
      ? { body: JSON.stringify(normalizeProofPackageBody(proofPackage)) }
      : {}),
    headers: {
      accept: "application/json",
      ...(requestMethod === "POST" ? { "content-type": "application/json" } : {}),
      ...normalizedConfig.headers,
      "x-campaign-os-trace-id": traceId,
    },
    method: requestMethod,
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

  if (!isProjectOwnerFundingProofReviewBridge(payload, campaignId)) {
    return createFallbackState(
      campaignId,
      normalizedConfig,
      "error_fallback",
      [diagnostic("API_PAYLOAD_INVALID", "error", { payload })],
      result.traceId,
    );
  }

  const review = sanitizeReview(payload);
  const responseData = isRecord(result.body.data) ? result.body.data : undefined;

  return {
    boundary: localizedText(responseData?.boundary)
      ? responseData.boundary
      : projectOwnerFundingProofReviewBridgeApiBoundary,
    campaignId,
    configured: true,
    diagnostics: [],
    loading: false,
    review,
    routeCount: result.body.runtime.routeCount,
    source: "api_runtime",
    status: statusFromReview(review),
    traceId: result.traceId ?? review.traceId ?? traceId,
  };
};

export const loadProjectOwnerFundingProofReviewBridgeApiState = async (
  input: LoadProjectOwnerFundingProofReviewBridgeApiStateInput,
): Promise<ProjectOwnerFundingProofReviewBridgeApiState> =>
  requestProjectOwnerFundingProofReviewBridgeApiState({
    ...input,
    requestMethod: "GET",
  });

export const submitProjectOwnerFundingProofReviewBridgeApiState = async (
  input: SubmitProjectOwnerFundingProofReviewBridgeApiStateInput,
): Promise<ProjectOwnerFundingProofReviewBridgeApiState> =>
  requestProjectOwnerFundingProofReviewBridgeApiState({
    ...input,
    requestMethod: "POST",
  });
