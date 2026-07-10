import { campaignDetail } from "../domain/fixtures";
import type { LocalizedText } from "../domain/types";

export type ObjectStorageExportRuntimeApiSource =
  | "api_runtime"
  | "error_fallback"
  | "loading"
  | "seeded_fallback";

export type ObjectStorageExportRuntimeApiStatus =
  | "blocked"
  | "deferred"
  | "error"
  | "fallback"
  | "loading"
  | "review_required";

export type ObjectStorageExportReadinessStatus = "blocked" | "deferred" | "local_ready";
export type ObjectStorageExportProviderStatus =
  | "approval_required"
  | "configured_disabled"
  | "not_configured"
  | "ready_for_provider_binding";

export interface ObjectStorageExportRuntimeApiDiagnostic {
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

export interface ObjectStorageExportRuntimeApiConfig {
  baseUrl?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  tracePrefix?: string;
}

export interface ObjectStorageExportManifestSummary {
  artifactCount: number;
  auditTraceId: string;
  classification: "local_manifest_only";
  containsDownloadUrl: false;
  containsObjectKey: false;
  containsSignedUrl: false;
  exportBatchId: string;
  formats: readonly string[];
  retentionClass: "compliance_hold" | "review_only" | "short_lived";
}

export interface ObjectStorageExportRuntimeSafety {
  contractWriteExecuted: false;
  downloadEnabled: false;
  liveUploadEnabled: false;
  localReviewOnly: true;
  manifestOnly: true;
  objectKeyCreated: false;
  providerCallAttempted: false;
  queueExecutionEnabled: false;
  rewardCustodyExecuted: false;
  rewardDistributionExecuted: false;
  schedulerExecutionEnabled: false;
  signedUrlCreated: false;
  unsafeValueRedacted: true;
  walletSignatureExecuted: false;
}

export interface ObjectStorageExportRuntimeDiagnostic {
  code: string;
  field: string;
  message: string;
  safeDetails?: unknown;
  severity: "error" | "info" | "warning";
}

export interface ObjectStorageExportReadinessPayload {
  blockerCount: number;
  campaignId: string;
  diagnosticCodes: readonly string[];
  diagnostics: readonly ObjectStorageExportRuntimeDiagnostic[];
  id: "campaign-os-object-storage-export-runtime";
  manifestSummary: ObjectStorageExportManifestSummary;
  nextAction: string;
  productionReady: false;
  providerStatus: ObjectStorageExportProviderStatus;
  requiredConfigKeys: readonly string[];
  safety: ObjectStorageExportRuntimeSafety;
  source: "api_runtime" | "fallback";
  status: ObjectStorageExportReadinessStatus;
  supportMode: "local_review";
  traceId: string;
  valid: boolean;
}

export interface ObjectStorageExportRuntimeApiBridgeState {
  boundary: LocalizedText;
  campaignId: string;
  configured: boolean;
  diagnostics: readonly ObjectStorageExportRuntimeApiDiagnostic[];
  loading: boolean;
  readiness: ObjectStorageExportReadinessPayload;
  routeCount?: number;
  source: ObjectStorageExportRuntimeApiSource;
  status: ObjectStorageExportRuntimeApiStatus;
  traceId?: string;
}

export type ObjectStorageExportRuntimeApiFetch = typeof fetch;

interface LoadObjectStorageExportRuntimeApiBridgeStateInput {
  campaignId: string;
  config?: ObjectStorageExportRuntimeApiConfig;
  fetchImpl?: ObjectStorageExportRuntimeApiFetch;
}

interface NormalizedConfig {
  baseUrl?: URL;
  configured: boolean;
  diagnostic?: ObjectStorageExportRuntimeApiDiagnostic;
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
  diagnostic?: ObjectStorageExportRuntimeApiDiagnostic;
  ok: boolean;
  status?: number;
  traceId?: string;
}

const defaultTimeoutMs = 2_000;
const minTimeoutMs = 250;
const maxTimeoutMs = 8_000;
const defaultTracePrefix = "object-storage-export-runtime";

export const objectStorageExportRuntimeApiBoundary: LocalizedText = {
  "en-US":
    "Local object storage export readiness API bridge only. No upload, object key creation, signed URL creation, download, provider call, wallet signature, contract write, queue execution, scheduler execution, reward custody, or reward distribution is executed.",
  "zh-CN":
    "仅用于本地 object storage export readiness API bridge。不会执行上传、object key 创建、signed URL 创建、下载、provider 调用、钱包签名、合约写入、queue 执行、scheduler 执行、奖励托管或发奖。",
  "zh-TW":
    "僅用於本地 object storage export readiness API bridge。不會執行上傳、object key 建立、signed URL 建立、下載、provider 呼叫、錢包簽名、合約寫入、queue 執行、scheduler 執行、獎勵託管或發獎。",
};

const diagnosticMessages: Record<ObjectStorageExportRuntimeApiDiagnostic["code"], LocalizedText> = {
  API_BASE_URL_INVALID: {
    "en-US": "The local object storage export readiness API base URL is invalid, so seeded review data stays visible.",
    "zh-CN": "本地 object storage export readiness API base URL 无效，因此继续显示 seeded review 数据。",
    "zh-TW": "本地 object storage export readiness API base URL 無效，因此繼續顯示 seeded review 資料。",
  },
  API_BASE_URL_MISSING: {
    "en-US": "No local object storage export readiness API base URL is configured, so seeded review data is shown.",
    "zh-CN": "未配置本地 object storage export readiness API base URL，因此显示 seeded review 数据。",
    "zh-TW": "未設定本地 object storage export readiness API base URL，因此顯示 seeded review 資料。",
  },
  API_PAYLOAD_INVALID: {
    "en-US": "The local object storage export readiness payload is missing required no-live review fields.",
    "zh-CN": "本地 object storage export readiness payload 缺少必需 no-live review 字段。",
    "zh-TW": "本地 object storage export readiness payload 缺少必要 no-live review 欄位。",
  },
  API_REQUEST_FAILED: {
    "en-US": "The local object storage export readiness API request failed, so seeded review data stays visible.",
    "zh-CN": "本地 object storage export readiness API 请求失败，因此继续显示 seeded review 数据。",
    "zh-TW": "本地 object storage export readiness API 請求失敗，因此繼續顯示 seeded review 資料。",
  },
  API_REQUEST_TIMEOUT: {
    "en-US": "The local object storage export readiness API request timed out, so seeded review data stays visible.",
    "zh-CN": "本地 object storage export readiness API 请求超时，因此继续显示 seeded review 数据。",
    "zh-TW": "本地 object storage export readiness API 請求逾時，因此繼續顯示 seeded review 資料。",
  },
  API_RESPONSE_MALFORMED: {
    "en-US": "The local object storage export readiness API response envelope was not recognized.",
    "zh-CN": "本地 object storage export readiness API response envelope 无法识别。",
    "zh-TW": "本地 object storage export readiness API response envelope 無法識別。",
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
  [/\bdownload[-_\s]*url\b/gi, "redacted download link"],
  [/\bobject[-_\s]*key\b/gi, "redacted object reference"],
  [/\bstorage[-_\s]*key\b/gi, "redacted storage reference"],
  [/\bwallet[-_\s]*signature\b/gi, "redacted wallet action"],
];

const requiredConfigKeys = [
  "CAMPAIGN_OS_OBJECT_STORAGE_PROVIDER_REF",
  "CAMPAIGN_OS_OBJECT_STORAGE_BUCKET_REF",
  "CAMPAIGN_OS_OBJECT_STORAGE_CREDENTIAL_REF",
  "CAMPAIGN_OS_OBJECT_STORAGE_SIGNED_URL_POLICY_REF",
  "CAMPAIGN_OS_OBJECT_STORAGE_RETENTION_POLICY_REF",
  "CAMPAIGN_OS_OBJECT_STORAGE_APPROVAL_REF",
] as const;

const seededDiagnosticCodes = [
  "OBJECT_STORAGE_PROVIDER_MISSING",
  "OBJECT_STORAGE_BUCKET_MISSING",
  "OBJECT_STORAGE_CREDENTIAL_REF_MISSING",
  "OBJECT_STORAGE_SIGNED_URL_POLICY_MISSING",
  "OBJECT_STORAGE_RETENTION_POLICY_MISSING",
  "OBJECT_STORAGE_APPROVAL_REQUIRED",
  "OBJECT_STORAGE_LIVE_EXECUTION_DISABLED",
] as const;

const noLiveSafety: ObjectStorageExportRuntimeSafety = {
  contractWriteExecuted: false,
  downloadEnabled: false,
  liveUploadEnabled: false,
  localReviewOnly: true,
  manifestOnly: true,
  objectKeyCreated: false,
  providerCallAttempted: false,
  queueExecutionEnabled: false,
  rewardCustodyExecuted: false,
  rewardDistributionExecuted: false,
  schedulerExecutionEnabled: false,
  signedUrlCreated: false,
  unsafeValueRedacted: true,
  walletSignatureExecuted: false,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const sanitizeObjectStorageExportRuntimeApiText = (value: unknown): string => {
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

  return sanitizeObjectStorageExportRuntimeApiText(value);
};

const diagnostic = (
  code: ObjectStorageExportRuntimeApiDiagnostic["code"],
  severity: ObjectStorageExportRuntimeApiDiagnostic["severity"],
  safeDetails?: Record<string, unknown>,
): ObjectStorageExportRuntimeApiDiagnostic => {
  const normalizedDetails = safeDetails
    ? Object.fromEntries(
      Object.entries(safeDetails).map(([key, value]) => [
        sanitizeObjectStorageExportRuntimeApiText(key),
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
  const sanitized = sanitizeObjectStorageExportRuntimeApiText(tracePrefix ?? defaultTracePrefix)
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
        sanitizeObjectStorageExportRuntimeApiText(key).toLowerCase(),
        sanitizeObjectStorageExportRuntimeApiText(value),
      ]),
  );

const normalizeConfig = (config: ObjectStorageExportRuntimeApiConfig | undefined): NormalizedConfig => {
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

export const buildObjectStorageExportRuntimeApiUrl = (baseUrl: URL, campaignId: string) => {
  const next = new URL(baseUrl.toString());
  const basePath = next.pathname.replace(/\/+$/, "");
  const safeCampaignId = encodeURIComponent(campaignId);

  next.pathname = `${basePath}/api/campaigns/${safeCampaignId}/export/storage-readiness`;
  next.search = "";
  next.hash = "";

  return next.toString();
};

export const createObjectStorageExportRuntimeApiTraceId = (prefix: string) =>
  `${prefix}-object-storage-export-runtime-${Date.now().toString(36)}`;

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
    ? sanitizeObjectStorageExportRuntimeApiText(body.traceId)
    : undefined;

const safeFetchJson = async (
  fetchImpl: ObjectStorageExportRuntimeApiFetch,
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
      jsonError: sanitizeObjectStorageExportRuntimeApiText(error),
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
        traceId: responseTraceId ? sanitizeObjectStorageExportRuntimeApiText(responseTraceId) : undefined,
      };
    }

    return {
      body,
      ok: true,
      status: response.status,
      traceId: responseTraceId ? sanitizeObjectStorageExportRuntimeApiText(responseTraceId) : undefined,
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
  traceId = "object-storage-export-local-review",
): ObjectStorageExportReadinessPayload => {
  const exportBatchId = campaignDetail.exportPreview.rows[0]?.exportBatchId ?? "local-export-review";

  return {
    blockerCount: seededDiagnosticCodes.length,
    campaignId,
    diagnosticCodes: seededDiagnosticCodes,
    diagnostics: seededDiagnosticCodes.map((code) => ({
      code,
      field: code === "OBJECT_STORAGE_LIVE_EXECUTION_DISABLED" ? "safety.liveUploadEnabled" : "config",
      message: code === "OBJECT_STORAGE_LIVE_EXECUTION_DISABLED"
        ? "Live upload, object key creation, signed URL creation, and download remain disabled."
        : "Object storage export provider configuration or approval is missing.",
      severity: code === "OBJECT_STORAGE_LIVE_EXECUTION_DISABLED" ? "info" : "warning",
    })),
    id: "campaign-os-object-storage-export-runtime",
    manifestSummary: {
      artifactCount: 1,
      auditTraceId: traceId,
      classification: "local_manifest_only",
      containsDownloadUrl: false,
      containsObjectKey: false,
      containsSignedUrl: false,
      exportBatchId,
      formats: ["csv"],
      retentionClass: "review_only",
    },
    nextAction: "Configure provider, bucket, credential reference, signed URL policy, retention policy, and approval before provider binding.",
    productionReady: false,
    providerStatus: "not_configured",
    requiredConfigKeys,
    safety: noLiveSafety,
    source: "fallback",
    status: "blocked",
    supportMode: "local_review",
    traceId,
    valid: true,
  };
};

export const createObjectStorageExportRuntimeApiLoadingState = (
  campaignId: string,
): ObjectStorageExportRuntimeApiBridgeState => ({
  boundary: objectStorageExportRuntimeApiBoundary,
  campaignId,
  configured: true,
  diagnostics: [],
  loading: true,
  readiness: seededReadiness(campaignId),
  source: "loading",
  status: "loading",
});

export const createObjectStorageExportRuntimeApiSeededFallbackState = (
  campaignId: string,
  traceId?: string,
): ObjectStorageExportRuntimeApiBridgeState => ({
  boundary: objectStorageExportRuntimeApiBoundary,
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
  source: Extract<ObjectStorageExportRuntimeApiSource, "error_fallback" | "seeded_fallback">,
  diagnostics: readonly ObjectStorageExportRuntimeApiDiagnostic[],
  traceId?: string,
): ObjectStorageExportRuntimeApiBridgeState => ({
  boundary: objectStorageExportRuntimeApiBoundary,
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

const stringArray = (value: unknown) =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const isSafety = (value: unknown): value is ObjectStorageExportRuntimeSafety =>
  isRecord(value)
  && value.contractWriteExecuted === false
  && value.downloadEnabled === false
  && value.liveUploadEnabled === false
  && value.localReviewOnly === true
  && value.manifestOnly === true
  && value.objectKeyCreated === false
  && value.providerCallAttempted === false
  && value.queueExecutionEnabled === false
  && value.rewardCustodyExecuted === false
  && value.rewardDistributionExecuted === false
  && value.schedulerExecutionEnabled === false
  && value.signedUrlCreated === false
  && value.unsafeValueRedacted === true
  && value.walletSignatureExecuted === false;

const isManifestSummary = (value: unknown): value is ObjectStorageExportManifestSummary =>
  isRecord(value)
  && numberField(value, "artifactCount")
  && stringField(value, "auditTraceId")
  && value.classification === "local_manifest_only"
  && value.containsDownloadUrl === false
  && value.containsObjectKey === false
  && value.containsSignedUrl === false
  && stringField(value, "exportBatchId")
  && stringArray(value.formats)
  && (value.retentionClass === "compliance_hold"
    || value.retentionClass === "review_only"
    || value.retentionClass === "short_lived");

const diagnosticsSafe = (value: unknown) =>
  Array.isArray(value)
  && value.every((item) =>
    isRecord(item)
    && stringField(item, "code")
    && stringField(item, "field")
    && stringField(item, "message")
    && (item.severity === "info" || item.severity === "warning" || item.severity === "error")
  );

const isObjectStorageExportReadinessPayload = (
  value: unknown,
  campaignId: string,
): value is ObjectStorageExportReadinessPayload =>
  isRecord(value)
  && value.blockerCount !== undefined
  && numberField(value, "blockerCount")
  && value.campaignId === campaignId
  && stringArray(value.diagnosticCodes)
  && diagnosticsSafe(value.diagnostics)
  && value.id === "campaign-os-object-storage-export-runtime"
  && isManifestSummary(value.manifestSummary)
  && stringField(value, "nextAction")
  && value.productionReady === false
  && (value.providerStatus === "approval_required"
    || value.providerStatus === "configured_disabled"
    || value.providerStatus === "not_configured"
    || value.providerStatus === "ready_for_provider_binding")
  && stringArray(value.requiredConfigKeys)
  && isSafety(value.safety)
  && value.source === "api_runtime"
  && (value.status === "blocked" || value.status === "deferred" || value.status === "local_ready")
  && value.supportMode === "local_review"
  && stringField(value, "traceId")
  && typeof value.valid === "boolean";

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

  if ("objectStorageExportRuntime" in data) {
    return data.objectStorageExportRuntime;
  }

  return data;
};

const statusFromReadiness = (
  readiness: ObjectStorageExportReadinessPayload,
): ObjectStorageExportRuntimeApiStatus => {
  if (readiness.status === "local_ready") {
    return "review_required";
  }

  return readiness.status;
};

export const loadObjectStorageExportRuntimeApiBridgeState = async ({
  campaignId,
  config,
  fetchImpl = fetch,
}: LoadObjectStorageExportRuntimeApiBridgeStateInput): Promise<ObjectStorageExportRuntimeApiBridgeState> => {
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

  const traceId = createObjectStorageExportRuntimeApiTraceId(normalizedConfig.normalizedTracePrefix);
  const result = await safeFetchJson(
    fetchImpl,
    buildObjectStorageExportRuntimeApiUrl(normalizedConfig.baseUrl, campaignId),
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

  if (!isObjectStorageExportReadinessPayload(payload, campaignId)) {
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
      : objectStorageExportRuntimeApiBoundary,
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
