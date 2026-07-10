import type {
  EligibilityRootExportReviewPacket,
  EligibilityRootExportReviewRow,
  EligibilityRootExportSafety,
  ExportContractRootMode,
  ExportPreviewMode,
  LocalizedText,
} from "../domain/types";

export type ExportArtifactDeliveryApiSource =
  | "api_runtime"
  | "error_fallback"
  | "loading"
  | "seeded_fallback";

export type ExportArtifactDeliveryApiStatus =
  | "delivered"
  | "error"
  | "fallback"
  | "loading"
  | "partial";

export interface ExportArtifactDeliveryApiDiagnostic {
  code:
    | "API_AUDIT_DETAIL_FAILED"
    | "API_AUDIT_LIST_FAILED"
    | "API_BASE_URL_INVALID"
    | "API_BASE_URL_MISSING"
    | "API_EXPORT_PREVIEW_FAILED"
    | "API_REQUEST_FAILED"
    | "API_REQUEST_TIMEOUT"
    | "API_RESPONSE_INVALID";
  message: LocalizedText;
  safeDetails?: Record<string, boolean | number | string>;
  severity: "error" | "info" | "warning";
}

export interface ExportArtifactDeliveryApiConfig {
  baseUrl?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  tracePrefix?: string;
}

export interface ExportArtifactDeliveryRequest {
  campaignId: string;
  contractRootMode?: ExportContractRootMode | string;
  format?: ExportPreviewMode;
  includeLocalePreference?: boolean;
  includeRiskFlags?: boolean;
  includeWalletType?: boolean;
}

export interface ExportArtifactDeliveryPersistenceMetadata {
  kind?: string;
  recordId?: string;
}

export interface ExportArtifactDeliveryRepositoryMetadata {
  adapterId?: string;
  createdViaRepository?: boolean;
  repositoryId?: string;
  storeId?: string;
}

export interface ExportArtifactDeliveryArtifactMetadata {
  blockedRows?: number;
  checksum?: string;
  checksumAlgorithm?: string;
  columns: readonly string[];
  generatedMode?: string;
  payloadBytes?: number;
  readyRows?: number;
  reviewRequiredRows?: number;
  totalRows?: number;
}

export interface ExportArtifactDeliverySafetyFlags {
  boundary?: LocalizedText;
  contractRootWriteEnabled?: false;
  downloadUrlEnabled?: false;
  forbiddenFieldsAbsent?: boolean;
  localOnly?: true;
  localReviewOnly?: true;
  noContractRoot?: true;
  noContractTransaction?: true;
  noDownloadUrl?: true;
  noRewardCustody?: true;
  noRewardDistribution?: true;
  noStorageWrite?: true;
  objectKeyEnabled?: false;
  providerCallEnabled?: false;
  queueExecutionEnabled?: false;
  rewardCustodyEnabled?: false;
  rewardDistributionEnabled?: false;
  schedulerExecutionEnabled?: false;
  signedUrlEnabled?: false;
  storageWriteEnabled?: false;
  verifiedRecordsOnly?: boolean;
  walletSigningEnabled?: false;
}

export interface ExportArtifactDeliveryArtifact {
  batchId?: string;
  campaignId?: string;
  fileName?: string;
  format?: string;
  metadata?: ExportArtifactDeliveryArtifactMetadata;
  mimeType?: string;
  safety?: ExportArtifactDeliverySafetyFlags;
}

export interface ExportArtifactDeliveryAuditEvent {
  id?: string;
  routeId?: string;
  traceId?: string;
  type: string;
}

export interface ExportArtifactDeliveryRetention {
  expiresAt?: string;
  mode?: string;
  productionStorageBacked?: false;
  purgeRequired?: boolean;
  ttlHours?: number;
}

export interface ExportArtifactDeliveryRegistryRecord {
  artifactId: string;
  auditEvents: readonly ExportArtifactDeliveryAuditEvent[];
  batchId?: string;
  campaignId?: string;
  checksum?: string;
  checksumAlgorithm?: string;
  expiresAt?: string;
  retention?: ExportArtifactDeliveryRetention;
  routeId?: string;
  safety?: ExportArtifactDeliverySafetyFlags;
  traceId?: string;
}

export interface ExportArtifactDeliveryPreviewResult {
  artifact?: ExportArtifactDeliveryArtifact;
  artifactRegistry?: ExportArtifactDeliveryRegistryRecord;
  blockedRows: number;
  campaignId: string;
  columns: readonly string[];
  contractRootMode?: string;
  disclaimer?: string;
  eligibilityRootPacket?: EligibilityRootExportReviewPacket;
  exportBatchId: string;
  format: string;
  readyRows: number;
  reviewRequiredRows: number;
}

export interface ExportArtifactDeliveryContractRootReview {
  blockedReason?: string;
  publicationStatus: string;
  requestedMode: string;
  supported: boolean;
}

export interface ExportArtifactDeliveryAuditSummary {
  activeRecords?: number;
  blockedRows?: number;
  expiredRecords?: number;
  readyRows?: number;
  reviewRequiredRows?: number;
  totalRecords: number;
  totalRows?: number;
}

export interface ExportArtifactDeliveryAuditListResult {
  boundary?: LocalizedText;
  campaignId: string;
  filters?: {
    artifactId?: string;
    batchId?: string;
    format?: string;
    retentionState?: string;
    traceId?: string;
  };
  records: readonly ExportArtifactDeliveryRegistryRecord[];
  safety?: ExportArtifactDeliverySafetyFlags;
  summary: ExportArtifactDeliveryAuditSummary;
}

export interface ExportArtifactDeliveryAuditDetailResult {
  artifactId: string;
  boundary?: LocalizedText;
  campaignId: string;
  record: ExportArtifactDeliveryRegistryRecord;
  safety?: ExportArtifactDeliverySafetyFlags;
}

export interface ExportArtifactDeliveryApiBridgeState {
  artifactId?: string;
  auditDetail?: ExportArtifactDeliveryAuditDetailResult;
  auditList?: ExportArtifactDeliveryAuditListResult;
  boundary: LocalizedText;
  configured: boolean;
  contractRootReview?: ExportArtifactDeliveryContractRootReview;
  diagnostics: readonly ExportArtifactDeliveryApiDiagnostic[];
  eligibilityRootPacket?: EligibilityRootExportReviewPacket;
  loading: boolean;
  persistence?: ExportArtifactDeliveryPersistenceMetadata;
  preview?: ExportArtifactDeliveryPreviewResult;
  registry?: ExportArtifactDeliveryRegistryRecord;
  repository?: ExportArtifactDeliveryRepositoryMetadata;
  request: ExportArtifactDeliveryRequest;
  source: ExportArtifactDeliveryApiSource;
  status: ExportArtifactDeliveryApiStatus;
  traceId?: string;
}

export type ExportArtifactDeliveryApiFetch = typeof fetch;

interface SubmitExportArtifactDeliveryApiReviewInput {
  config?: ExportArtifactDeliveryApiConfig;
  fetchImpl?: ExportArtifactDeliveryApiFetch;
  request: ExportArtifactDeliveryRequest;
}

interface NormalizedRequest {
  campaignId: string;
  contractRootMode: string;
  format: ExportPreviewMode;
  includeLocalePreference: boolean;
  includeRiskFlags: boolean;
  includeWalletType: boolean;
}

interface NormalizedConfig {
  baseUrl?: URL;
  configured: boolean;
  diagnostic?: ExportArtifactDeliveryApiDiagnostic;
  headers: Record<string, string>;
  normalizedTracePrefix: string;
  timeoutMs: number;
}

interface FetchJsonResult {
  body?: unknown;
  diagnostic?: ExportArtifactDeliveryApiDiagnostic;
  ok: boolean;
  status?: number;
  traceId?: string;
}

type EndpointKind = "audit_detail" | "audit_list" | "preview";

const defaultTimeoutMs = 2_000;
const minTimeoutMs = 250;
const maxTimeoutMs = 8_000;

export const exportArtifactDeliveryApiBoundary: LocalizedText = {
  "en-US":
    "Local export artifact delivery API review only. No download URL, storage write, signed URL, provider call, contract root write, wallet signing, queue execution, scheduler execution, reward custody, or reward distribution is executed.",
  "zh-CN":
    "仅用于本地导出 artifact delivery API 评审。不会生成下载 URL、写入存储、生成 signed URL、调用 provider、写入合约 root、执行钱包签名、队列执行、调度执行、奖励托管或发奖。",
  "zh-TW":
    "僅用於本地匯出 artifact delivery API 評審。不會產生下載 URL、寫入儲存、產生 signed URL、呼叫 provider、寫入合約 root、執行錢包簽名、佇列執行、排程執行、獎勵託管或發獎。",
};

const diagnosticMessages: Record<ExportArtifactDeliveryApiDiagnostic["code"], LocalizedText> = {
  API_AUDIT_DETAIL_FAILED: {
    "en-US": "The local export artifact audit detail route did not return a usable record.",
    "zh-CN": "本地导出 artifact 审计详情 route 未返回可用记录。",
    "zh-TW": "本地匯出 artifact 審計詳情 route 未回傳可用記錄。",
  },
  API_AUDIT_LIST_FAILED: {
    "en-US": "The local export artifact audit list route did not return usable records.",
    "zh-CN": "本地导出 artifact 审计列表 route 未返回可用记录。",
    "zh-TW": "本地匯出 artifact 審計列表 route 未回傳可用記錄。",
  },
  API_BASE_URL_INVALID: {
    "en-US": "The local export delivery API base URL is invalid, so seeded export review remains visible.",
    "zh-CN": "本地导出 delivery API base URL 无效，因此继续显示 seeded 导出评审。",
    "zh-TW": "本地匯出 delivery API base URL 無效，因此繼續顯示 seeded 匯出評審。",
  },
  API_BASE_URL_MISSING: {
    "en-US": "No local export delivery API base URL is configured, so seeded export review remains visible.",
    "zh-CN": "未配置本地导出 delivery API base URL，因此继续显示 seeded 导出评审。",
    "zh-TW": "未設定本地匯出 delivery API base URL，因此繼續顯示 seeded 匯出評審。",
  },
  API_EXPORT_PREVIEW_FAILED: {
    "en-US": "The local export preview route did not return a usable preview.",
    "zh-CN": "本地导出 preview route 未返回可用 preview。",
    "zh-TW": "本地匯出 preview route 未回傳可用 preview。",
  },
  API_REQUEST_FAILED: {
    "en-US": "The local export delivery API request failed, so seeded export review remains visible.",
    "zh-CN": "本地导出 delivery API 请求失败，因此继续显示 seeded 导出评审。",
    "zh-TW": "本地匯出 delivery API 請求失敗，因此繼續顯示 seeded 匯出評審。",
  },
  API_REQUEST_TIMEOUT: {
    "en-US": "The local export delivery API request timed out, so seeded export review remains visible.",
    "zh-CN": "本地导出 delivery API 请求超时，因此继续显示 seeded 导出评审。",
    "zh-TW": "本地匯出 delivery API 請求逾時，因此繼續顯示 seeded 匯出評審。",
  },
  API_RESPONSE_INVALID: {
    "en-US": "The local export delivery API response shape was not recognized.",
    "zh-CN": "本地导出 delivery API 响应结构无法识别。",
    "zh-TW": "本地匯出 delivery API 回應結構無法識別。",
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const sanitizeExportArtifactDeliveryApiText = (value: unknown): string => {
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

  return sanitizeExportArtifactDeliveryApiText(value);
};

const diagnostic = (
  code: ExportArtifactDeliveryApiDiagnostic["code"],
  severity: ExportArtifactDeliveryApiDiagnostic["severity"],
  safeDetails?: Record<string, unknown>,
): ExportArtifactDeliveryApiDiagnostic => {
  const normalizedDetails = safeDetails
    ? Object.fromEntries(
      Object.entries(safeDetails).map(([key, value]) => [
        sanitizeExportArtifactDeliveryApiText(key),
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
  const sanitized = sanitizeExportArtifactDeliveryApiText(tracePrefix ?? "export-delivery-review")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized || "export-delivery-review";
};

const normalizeHeaders = (headers: Record<string, string> | undefined) =>
  Object.fromEntries(
    Object.entries(headers ?? {})
      .filter(([key, value]) => key.trim() && value.trim())
      .map(([key, value]) => [
        sanitizeExportArtifactDeliveryApiText(key).toLowerCase(),
        sanitizeExportArtifactDeliveryApiText(value),
      ]),
  );

const normalizeConfig = (config: ExportArtifactDeliveryApiConfig | undefined): NormalizedConfig => {
  const timeoutMs = clampTimeout(config?.timeoutMs);
  const normalizedTracePrefix = normalizeTracePrefix(config?.tracePrefix);
  const headers = normalizeHeaders(config?.headers);
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

const normalizeRequest = (request: ExportArtifactDeliveryRequest): NormalizedRequest => ({
  campaignId: sanitizeExportArtifactDeliveryApiText(request.campaignId),
  contractRootMode: sanitizeExportArtifactDeliveryApiText(request.contractRootMode ?? "none"),
  format: request.format ?? "csv",
  includeLocalePreference: request.includeLocalePreference ?? true,
  includeRiskFlags: request.includeRiskFlags ?? true,
  includeWalletType: request.includeWalletType ?? true,
});

const traceId = (prefix: string) => `${prefix}-${Date.now().toString(36)}`;

const endpointUrl = (baseUrl: URL, path: string) => {
  const normalizedBase = new URL(baseUrl.toString());
  normalizedBase.pathname = `${normalizedBase.pathname.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
  normalizedBase.search = "";
  normalizedBase.hash = "";

  return normalizedBase.toString();
};

const queryEndpointUrl = (baseUrl: URL, path: string, query: Record<string, string | undefined>) => {
  const url = new URL(endpointUrl(baseUrl, path));

  for (const [key, value] of Object.entries(query)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
};

const extractTraceId = (body: unknown): string | undefined => {
  if (!isRecord(body)) {
    return undefined;
  }

  return typeof body.traceId === "string" ? sanitizeExportArtifactDeliveryApiText(body.traceId) : undefined;
};

const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === "AbortError";

const diagnosticCodeForEndpoint = (
  endpointKind: EndpointKind,
): ExportArtifactDeliveryApiDiagnostic["code"] => {
  if (endpointKind === "audit_detail") {
    return "API_AUDIT_DETAIL_FAILED";
  }

  if (endpointKind === "audit_list") {
    return "API_AUDIT_LIST_FAILED";
  }

  return "API_EXPORT_PREVIEW_FAILED";
};

const safeFetchJson = async (
  fetchImpl: ExportArtifactDeliveryApiFetch,
  url: string,
  endpoint: string,
  endpointKind: EndpointKind,
  init: RequestInit,
  timeoutMs: number,
): Promise<FetchJsonResult> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      ...init,
      signal: controller.signal,
    });
    const body = await response.json().catch((error: unknown) => ({
      jsonError: sanitizeExportArtifactDeliveryApiText(error),
    }));
    const headerTraceId = response.headers.get("x-campaign-os-trace-id") ?? undefined;
    const responseTraceId = sanitizeExportArtifactDeliveryApiText(headerTraceId ?? extractTraceId(body) ?? "");
    const failedEnvelope = isRecord(body) && body.ok === false;

    if (!response.ok || failedEnvelope) {
      return {
        body,
        diagnostic: diagnostic(diagnosticCodeForEndpoint(endpointKind), "error", {
          endpoint,
          error: isRecord(body) ? body.error : body,
          status: response.status,
        }),
        ok: false,
        status: response.status,
        traceId: responseTraceId || undefined,
      };
    }

    return {
      body,
      ok: true,
      status: response.status,
      traceId: responseTraceId || undefined,
    };
  } catch (error) {
    return {
      diagnostic: diagnostic(isAbortError(error) ? "API_REQUEST_TIMEOUT" : "API_REQUEST_FAILED", "error", {
        endpoint,
        error,
      }),
      ok: false,
    };
  } finally {
    clearTimeout(timeout);
  }
};

const dataPayload = (body: unknown): unknown => {
  if (!isRecord(body)) {
    return undefined;
  }

  const data = body.data;

  if (isRecord(data) && "payload" in data) {
    return data.payload;
  }

  return data;
};

const metadataPayload = (body: unknown, key: "campaignDb" | "persistence") => {
  if (!isRecord(body)) {
    return undefined;
  }

  if (isRecord(body.data) && isRecord(body.data[key])) {
    return body.data[key];
  }

  if (isRecord(body[key])) {
    return body[key];
  }

  return undefined;
};

const optionalText = (value: unknown) =>
  typeof value === "string" ? sanitizeExportArtifactDeliveryApiText(value) : undefined;

const textArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map(sanitizeExportArtifactDeliveryApiText)
    : [];

const numberValue = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const booleanValue = (value: unknown) =>
  typeof value === "boolean" ? value : undefined;

const falseValue = (value: unknown) => value === false ? false : undefined;

const localizedText = (value: unknown): LocalizedText | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const enUS = optionalText(value["en-US"]);
  const zhCN = optionalText(value["zh-CN"]);
  const zhTW = optionalText(value["zh-TW"]);

  if (!enUS && !zhCN && !zhTW) {
    return undefined;
  }

  return {
    "en-US": enUS ?? zhCN ?? zhTW ?? "",
    "zh-CN": zhCN ?? enUS ?? zhTW ?? "",
    "zh-TW": zhTW ?? enUS ?? zhCN ?? "",
  };
};

const packetDisplayUnsafePatterns: Array<[RegExp, string]> = [
  [/\braw[-_\s]*signature\b/gi, "redacted signature"],
  [/\bprivate[-_\s]*key\b/gi, "redacted key"],
  [/\bseed[-_\s]*phrase\b/gi, "redacted seed"],
  [/\bbearer[-_\s]*token\b/gi, "redacted bearer credential"],
  [/\bbearer\s+[A-Za-z0-9._~+/=-]+/gi, "redacted bearer credential"],
  [/\bpassword\s*[=:]\s*[^&\s"'<>]+/gi, "password=redacted"],
  [/\bapi[-_\s]*key\b/gi, "redacted credential"],
  [/\b(token|access_token|refresh_token|api_key|apikey)=([^&\s"'<>]+)/gi, "redacted query credential"],
  [/\/Users\/[^"'\s<>]*campaign-os-kitty[^"'\s<>]*/gi, "redacted private path"],
  [/\bstack\s*trace\b/gi, "redacted stack"],
];

const sanitizePacketDisplayText = (value: unknown): string => {
  const raw = typeof value === "string" ? value : JSON.stringify(value ?? "");
  const strippedUrlQuery = raw.replace(/\?[^"'\s<>]*/g, "?redacted-query");

  return packetDisplayUnsafePatterns.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    strippedUrlQuery,
  );
};

const localizedPacketText = (value: unknown): LocalizedText | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const enUS = typeof value["en-US"] === "string" ? sanitizePacketDisplayText(value["en-US"]) : undefined;
  const zhCN = typeof value["zh-CN"] === "string" ? sanitizePacketDisplayText(value["zh-CN"]) : undefined;
  const zhTW = typeof value["zh-TW"] === "string" ? sanitizePacketDisplayText(value["zh-TW"]) : undefined;

  if (!enUS && !zhCN && !zhTW) {
    return undefined;
  }

  return {
    "en-US": enUS ?? zhCN ?? zhTW ?? "",
    "zh-CN": zhCN ?? enUS ?? zhTW ?? "",
    "zh-TW": zhTW ?? enUS ?? zhCN ?? "",
  };
};

const unsafePacketKeys = new Set([
  "apikey",
  "api_key",
  "contracttransactionhash",
  "contracttransactionid",
  "downloadurl",
  "objectkey",
  "privatekey",
  "providerpayload",
  "rawsignature",
  "secret",
  "signature",
  "signedpayload",
  "signedurl",
  "storagekey",
  "token",
  "transactionhash",
  "transactionid",
  "txid",
  "walletsignature",
]);

const hasUnsafePacketKey = (value: unknown): boolean => {
  if (Array.isArray(value)) {
    return value.some(hasUnsafePacketKey);
  }

  if (!isRecord(value)) {
    return false;
  }

  return Object.entries(value).some(([key, nested]) => (
    unsafePacketKeys.has(key.replace(/[-_\s]/g, "").toLowerCase()) || hasUnsafePacketKey(nested)
  ));
};

const requiredText = (value: unknown): string | undefined => {
  const text = optionalText(value);

  return text && text.trim() ? text : undefined;
};

const requiredNumber = (value: unknown) => numberValue(value);

const requiredBoolean = (value: unknown) => booleanValue(value);

const normalizeEligibilityRootSafety = (payload: unknown): EligibilityRootExportSafety | undefined => {
  if (!isRecord(payload)) {
    return undefined;
  }

  const safety = {
    claimExecutionEnabled: falseValue(payload.claimExecutionEnabled),
    contractWriteExecuted: falseValue(payload.contractWriteExecuted),
    providerCallExecuted: falseValue(payload.providerCallExecuted),
    rewardCustodyEnabled: falseValue(payload.rewardCustodyEnabled),
    rewardDistributionEnabled: falseValue(payload.rewardDistributionEnabled),
    signedUrlGenerated: falseValue(payload.signedUrlGenerated),
    storageWriteExecuted: falseValue(payload.storageWriteExecuted),
    walletSignatureRequested: falseValue(payload.walletSignatureRequested),
  };

  return Object.values(safety).every((value) => value === false)
    ? safety as EligibilityRootExportSafety
    : undefined;
};

const normalizeEligibilityRootRow = (payload: unknown): EligibilityRootExportReviewRow | undefined => {
  if (!isRecord(payload)) {
    return undefined;
  }

  const walletAddress = requiredText(payload.walletAddress);
  const accountType = requiredText(payload.accountType);
  const walletSource = requiredText(payload.walletSource);
  const localePreference = requiredText(payload.localePreference);
  const totalPoints = requiredNumber(payload.totalPoints);
  const rank = numberValue(payload.rank);
  const eligible = requiredBoolean(payload.eligible);
  const missingTasks = textArray(payload.missingTasks);
  const riskFlags = textArray(payload.riskFlags);
  const evidenceHashes = textArray(payload.evidenceHashes);

  if (
    !walletAddress ||
    !accountType ||
    !walletSource ||
    !localePreference ||
    totalPoints === undefined ||
    eligible === undefined ||
    !Array.isArray(payload.missingTasks) ||
    !Array.isArray(payload.riskFlags) ||
    evidenceHashes.length === 0
  ) {
    return undefined;
  }

  return {
    accountType: accountType as EligibilityRootExportReviewRow["accountType"],
    eligible,
    evidenceHashes,
    localePreference: localePreference as EligibilityRootExportReviewRow["localePreference"],
    missingTasks,
    ...(rank !== undefined ? { rank } : {}),
    riskFlags,
    totalPoints,
    walletAddress,
    walletSource: walletSource as EligibilityRootExportReviewRow["walletSource"],
  };
};

const normalizeEligibilityRootPacket = (payload: unknown): EligibilityRootExportReviewPacket | undefined => {
  if (!isRecord(payload) || hasUnsafePacketKey(payload)) {
    return undefined;
  }

  const mode = requiredText(payload.mode);
  const publicationStatus = requiredText(payload.publicationStatus);
  const contractWriteEnabled = falseValue(payload.contractWriteEnabled);
  const rootId = requiredText(payload.rootId);
  const rootVersion = requiredNumber(payload.rootVersion);
  const rootHash = requiredText(payload.rootHash);
  const exportBatchId = requiredText(payload.exportBatchId);
  const generatedMode = requiredText(payload.generatedMode);
  const totalRows = requiredNumber(payload.totalRows);
  const eligibleWalletCount = requiredNumber(payload.eligibleWalletCount);
  const evidenceHashes = textArray(payload.evidenceHashes);
  const rows = Array.isArray(payload.rows)
    ? payload.rows.map(normalizeEligibilityRootRow)
    : [];
  const safety = normalizeEligibilityRootSafety(payload.safety);
  const nextAction = localizedPacketText(payload.nextAction);
  const boundary = localizedPacketText(payload.boundary);

  if (
    mode !== "eligibility_root" ||
    publicationStatus !== "not_published" ||
    contractWriteEnabled !== false ||
    !rootId ||
    rootVersion === undefined ||
    !rootHash ||
    !exportBatchId ||
    generatedMode !== "local_review_only" ||
    totalRows === undefined ||
    eligibleWalletCount === undefined ||
    evidenceHashes.length === 0 ||
    rows.length === 0 ||
    rows.some((row) => !row) ||
    !safety ||
    !nextAction ||
    !boundary
  ) {
    return undefined;
  }

  const normalizedRows = rows as EligibilityRootExportReviewRow[];
  const normalizedEligibleWalletCount = normalizedRows.filter((row) => row.eligible).length;

  if (totalRows !== normalizedRows.length || eligibleWalletCount !== normalizedEligibleWalletCount) {
    return undefined;
  }

  return {
    boundary,
    contractWriteEnabled,
    eligibleWalletCount,
    evidenceHashes,
    exportBatchId,
    generatedMode: "local_review_only",
    mode: "eligibility_root",
    nextAction,
    publicationStatus: "not_published",
    rootHash,
    rootId,
    rootVersion,
    rows: normalizedRows,
    safety,
    totalRows,
  };
};

const normalizeSafety = (payload: unknown): ExportArtifactDeliverySafetyFlags | undefined => {
  if (!isRecord(payload)) {
    return undefined;
  }

  const safety: ExportArtifactDeliverySafetyFlags = {};
  const setFalseFlag = <TKey extends keyof ExportArtifactDeliverySafetyFlags>(key: TKey) => {
    if (payload[key] === false) {
      safety[key] = false as never;
    }
  };
  const setTrueFlag = <TKey extends keyof ExportArtifactDeliverySafetyFlags>(key: TKey) => {
    if (payload[key] === true) {
      safety[key] = true as never;
    }
  };

  for (const key of [
    "contractRootWriteEnabled",
    "downloadUrlEnabled",
    "objectKeyEnabled",
    "providerCallEnabled",
    "queueExecutionEnabled",
    "rewardCustodyEnabled",
    "rewardDistributionEnabled",
    "schedulerExecutionEnabled",
    "signedUrlEnabled",
    "storageWriteEnabled",
    "walletSigningEnabled",
  ] as const) {
    setFalseFlag(key);
  }
  for (const key of [
    "localOnly",
    "localReviewOnly",
    "noContractRoot",
    "noContractTransaction",
    "noDownloadUrl",
    "noRewardCustody",
    "noRewardDistribution",
    "noStorageWrite",
  ] as const) {
    setTrueFlag(key);
  }

  const boundary = localizedText(payload.boundary);
  const forbiddenFieldsAbsent = booleanValue(payload.forbiddenFieldsAbsent);
  const verifiedRecordsOnly = booleanValue(payload.verifiedRecordsOnly);

  return {
    ...(boundary ? { boundary } : {}),
    ...(forbiddenFieldsAbsent !== undefined ? { forbiddenFieldsAbsent } : {}),
    ...safety,
    ...(verifiedRecordsOnly !== undefined ? { verifiedRecordsOnly } : {}),
  };
};

const normalizeRetention = (payload: unknown): ExportArtifactDeliveryRetention | undefined => {
  if (!isRecord(payload)) {
    return undefined;
  }

  const retention = {
    ...(optionalText(payload.expiresAt) ? { expiresAt: optionalText(payload.expiresAt) } : {}),
    ...(optionalText(payload.mode) ? { mode: optionalText(payload.mode) } : {}),
    ...(payload.productionStorageBacked === false ? { productionStorageBacked: false as const } : {}),
    ...(booleanValue(payload.purgeRequired) !== undefined ? { purgeRequired: booleanValue(payload.purgeRequired) } : {}),
    ...(numberValue(payload.ttlHours) !== undefined ? { ttlHours: numberValue(payload.ttlHours) } : {}),
  };

  return Object.keys(retention).length > 0 ? retention : undefined;
};

const normalizeAuditEvents = (payload: unknown): ExportArtifactDeliveryAuditEvent[] =>
  Array.isArray(payload)
    ? payload
      .filter(isRecord)
      .map((event) => {
        const type = optionalText(event.type);

        if (!type) {
          return undefined;
        }

        return {
          ...(optionalText(event.id) ? { id: optionalText(event.id) } : {}),
          ...(optionalText(event.routeId) ? { routeId: optionalText(event.routeId) } : {}),
          ...(optionalText(event.traceId) ? { traceId: optionalText(event.traceId) } : {}),
          type,
        };
      })
      .filter((event): event is ExportArtifactDeliveryAuditEvent => Boolean(event))
    : [];

const normalizeRegistry = (payload: unknown): ExportArtifactDeliveryRegistryRecord | undefined => {
  if (!isRecord(payload)) {
    return undefined;
  }

  const artifactId = optionalText(payload.artifactId);
  const auditEvents = normalizeAuditEvents(payload.auditEvents);
  const retention = normalizeRetention(payload.retention);
  const safety = normalizeSafety(payload.safety);

  if (!artifactId) {
    return undefined;
  }

  return {
    artifactId,
    auditEvents,
    ...(optionalText(payload.batchId) ? { batchId: optionalText(payload.batchId) } : {}),
    ...(optionalText(payload.campaignId) ? { campaignId: optionalText(payload.campaignId) } : {}),
    ...(optionalText(payload.checksum) ? { checksum: optionalText(payload.checksum) } : {}),
    ...(optionalText(payload.checksumAlgorithm) ? { checksumAlgorithm: optionalText(payload.checksumAlgorithm) } : {}),
    ...(optionalText(payload.expiresAt) ? { expiresAt: optionalText(payload.expiresAt) } : {}),
    ...(retention ? { retention } : {}),
    ...(optionalText(payload.routeId) ? { routeId: optionalText(payload.routeId) } : {}),
    ...(safety ? { safety } : {}),
    ...(optionalText(payload.traceId) ? { traceId: optionalText(payload.traceId) } : {}),
  };
};

const normalizeArtifact = (payload: unknown): ExportArtifactDeliveryArtifact | undefined => {
  if (!isRecord(payload)) {
    return undefined;
  }

  const metadataPayloadValue = isRecord(payload.metadata) ? payload.metadata : undefined;
  const columns = metadataPayloadValue ? textArray(metadataPayloadValue.columns) : textArray(payload.columns);
  const safety = normalizeSafety(payload.safety);
  const metadata = columns.length > 0
    ? {
      columns,
      ...(numberValue(metadataPayloadValue?.blockedRows) !== undefined
        ? { blockedRows: numberValue(metadataPayloadValue?.blockedRows) }
        : {}),
      ...(optionalText(metadataPayloadValue?.checksum) ? { checksum: optionalText(metadataPayloadValue?.checksum) } : {}),
      ...(optionalText(metadataPayloadValue?.checksumAlgorithm)
        ? { checksumAlgorithm: optionalText(metadataPayloadValue?.checksumAlgorithm) }
        : {}),
      ...(optionalText(metadataPayloadValue?.generatedMode)
        ? { generatedMode: optionalText(metadataPayloadValue?.generatedMode) }
        : {}),
      ...(numberValue(metadataPayloadValue?.payloadBytes) !== undefined
        ? { payloadBytes: numberValue(metadataPayloadValue?.payloadBytes) }
        : {}),
      ...(numberValue(metadataPayloadValue?.readyRows) !== undefined
        ? { readyRows: numberValue(metadataPayloadValue?.readyRows) }
        : {}),
      ...(numberValue(metadataPayloadValue?.reviewRequiredRows) !== undefined
        ? { reviewRequiredRows: numberValue(metadataPayloadValue?.reviewRequiredRows) }
        : {}),
      ...(numberValue(metadataPayloadValue?.totalRows) !== undefined
        ? { totalRows: numberValue(metadataPayloadValue?.totalRows) }
        : {}),
    }
    : undefined;

  return {
    ...(optionalText(payload.batchId) ? { batchId: optionalText(payload.batchId) } : {}),
    ...(optionalText(payload.campaignId) ? { campaignId: optionalText(payload.campaignId) } : {}),
    ...(optionalText(payload.fileName) ? { fileName: optionalText(payload.fileName) } : {}),
    ...(optionalText(payload.format) ? { format: optionalText(payload.format) } : {}),
    ...(metadata ? { metadata } : {}),
    ...(optionalText(payload.mimeType) ? { mimeType: optionalText(payload.mimeType) } : {}),
    ...(safety ? { safety } : {}),
  };
};

const normalizePreview = (payload: unknown): ExportArtifactDeliveryPreviewResult | undefined => {
  if (!isRecord(payload)) {
    return undefined;
  }

  const artifact = normalizeArtifact(payload.artifact);
  const artifactRegistry = normalizeRegistry(payload.artifactRegistry);
  const campaignId = optionalText(payload.campaignId);
  const exportBatchId =
    optionalText(payload.exportBatchId) ??
    optionalText(payload.batchId) ??
    artifact?.batchId ??
    artifactRegistry?.batchId;
  const format = optionalText(payload.format);
  const readyRows = numberValue(payload.readyRows);
  const reviewRequiredRows = numberValue(payload.reviewRequiredRows);
  const blockedRows = numberValue(payload.blockedRows);
  const columns = textArray(payload.columns);

  if (
    !campaignId ||
    !exportBatchId ||
    !format ||
    readyRows === undefined ||
    reviewRequiredRows === undefined ||
    blockedRows === undefined ||
    columns.length === 0
  ) {
    return undefined;
  }

  const contractRootMode = optionalText(payload.contractRootMode);
  const disclaimer = optionalText(payload.disclaimer);
  const eligibilityRootPacket = normalizeEligibilityRootPacket(payload.eligibilityRootPacket);

  if (contractRootMode && !["none", "eligibility_root"].includes(contractRootMode)) {
    return undefined;
  }

  if (
    (contractRootMode === "eligibility_root" && !eligibilityRootPacket) ||
    (contractRootMode === "none" && eligibilityRootPacket)
  ) {
    return undefined;
  }

  return {
    ...(artifact ? { artifact } : {}),
    ...(artifactRegistry ? { artifactRegistry } : {}),
    blockedRows,
    campaignId,
    columns,
    ...(contractRootMode ? { contractRootMode } : {}),
    ...(disclaimer ? { disclaimer } : {}),
    ...(eligibilityRootPacket ? { eligibilityRootPacket } : {}),
    exportBatchId,
    format,
    readyRows,
    reviewRequiredRows,
  };
};

const contractRootReviewFor = (
  request: NormalizedRequest,
  preview: ExportArtifactDeliveryPreviewResult,
): ExportArtifactDeliveryContractRootReview => {
  if (request.contractRootMode === "eligibility_root") {
    return preview.eligibilityRootPacket
      ? {
        publicationStatus: preview.eligibilityRootPacket.publicationStatus,
        requestedMode: request.contractRootMode,
        supported: true,
      }
      : {
        blockedReason: "eligibility_root_packet_missing",
        publicationStatus: "not_published",
        requestedMode: request.contractRootMode,
        supported: false,
      };
  }

  return {
    publicationStatus: "not_requested",
    requestedMode: request.contractRootMode,
    supported: request.contractRootMode === "none",
    ...(request.contractRootMode === "none" ? {} : { blockedReason: "unsupported_contract_root_mode" }),
  };
};

const normalizeAuditSummary = (payload: unknown): ExportArtifactDeliveryAuditSummary | undefined => {
  if (!isRecord(payload)) {
    return undefined;
  }

  const totalRecords = numberValue(payload.totalRecords);

  if (totalRecords === undefined) {
    return undefined;
  }

  return {
    ...(numberValue(payload.activeRecords) !== undefined ? { activeRecords: numberValue(payload.activeRecords) } : {}),
    ...(numberValue(payload.blockedRows) !== undefined ? { blockedRows: numberValue(payload.blockedRows) } : {}),
    ...(numberValue(payload.expiredRecords) !== undefined ? { expiredRecords: numberValue(payload.expiredRecords) } : {}),
    ...(numberValue(payload.readyRows) !== undefined ? { readyRows: numberValue(payload.readyRows) } : {}),
    ...(numberValue(payload.reviewRequiredRows) !== undefined
      ? { reviewRequiredRows: numberValue(payload.reviewRequiredRows) }
      : {}),
    totalRecords,
    ...(numberValue(payload.totalRows) !== undefined ? { totalRows: numberValue(payload.totalRows) } : {}),
  };
};

const normalizeAuditFilters = (payload: unknown): ExportArtifactDeliveryAuditListResult["filters"] | undefined => {
  if (!isRecord(payload)) {
    return undefined;
  }

  const filters = {
    ...(optionalText(payload.artifactId) ? { artifactId: optionalText(payload.artifactId) } : {}),
    ...(optionalText(payload.batchId) ? { batchId: optionalText(payload.batchId) } : {}),
    ...(optionalText(payload.format) ? { format: optionalText(payload.format) } : {}),
    ...(optionalText(payload.retentionState) ? { retentionState: optionalText(payload.retentionState) } : {}),
    ...(optionalText(payload.traceId) ? { traceId: optionalText(payload.traceId) } : {}),
  };

  return Object.keys(filters).length > 0 ? filters : undefined;
};

const normalizeAuditList = (payload: unknown): ExportArtifactDeliveryAuditListResult | undefined => {
  if (!isRecord(payload)) {
    return undefined;
  }

  const campaignId = optionalText(payload.campaignId);
  const records = Array.isArray(payload.records)
    ? payload.records.map(normalizeRegistry).filter((record): record is ExportArtifactDeliveryRegistryRecord => Boolean(record))
    : undefined;
  const boundary = localizedText(payload.boundary);
  const filters = normalizeAuditFilters(payload.filters);
  const safety = normalizeSafety(payload.safety);
  const summary = normalizeAuditSummary(payload.summary);

  if (!campaignId || !records || !summary) {
    return undefined;
  }

  return {
    ...(boundary ? { boundary } : {}),
    campaignId,
    ...(filters ? { filters } : {}),
    records,
    ...(safety ? { safety } : {}),
    summary,
  };
};

const normalizeAuditDetail = (payload: unknown): ExportArtifactDeliveryAuditDetailResult | undefined => {
  if (!isRecord(payload)) {
    return undefined;
  }

  const artifactId = optionalText(payload.artifactId);
  const campaignId = optionalText(payload.campaignId);
  const boundary = localizedText(payload.boundary);
  const record = normalizeRegistry(payload.record);
  const safety = normalizeSafety(payload.safety);

  if (!artifactId || !campaignId || !record) {
    return undefined;
  }

  return {
    artifactId,
    ...(boundary ? { boundary } : {}),
    campaignId,
    record,
    ...(safety ? { safety } : {}),
  };
};

const normalizePersistence = (payload: unknown): ExportArtifactDeliveryPersistenceMetadata | undefined => {
  if (!isRecord(payload)) {
    return undefined;
  }

  const kind = optionalText(payload.kind);
  const recordId = optionalText(payload.recordId);

  if (!kind && !recordId) {
    return undefined;
  }

  return {
    ...(kind ? { kind } : {}),
    ...(recordId ? { recordId } : {}),
  };
};

const normalizeRepository = (payload: unknown): ExportArtifactDeliveryRepositoryMetadata | undefined => {
  if (!isRecord(payload)) {
    return undefined;
  }

  const adapterId = optionalText(payload.adapterId);
  const repositoryId = optionalText(payload.repositoryId);
  const storeId = optionalText(payload.storeId);
  const createdViaRepository = booleanValue(payload.createdViaRepository);

  if (!adapterId && !repositoryId && !storeId && createdViaRepository === undefined) {
    return undefined;
  }

  return {
    ...(adapterId ? { adapterId } : {}),
    ...(createdViaRepository !== undefined ? { createdViaRepository } : {}),
    ...(repositoryId ? { repositoryId } : {}),
    ...(storeId ? { storeId } : {}),
  };
};

const requestHeaders = (
  normalizedConfig: NormalizedConfig,
  contentType: boolean,
  requestTraceId: string,
) => ({
  accept: "application/json",
  ...normalizedConfig.headers,
  ...(contentType ? { "content-type": "application/json" } : {}),
  "x-campaign-os-trace-id": requestTraceId,
});

const fallbackState = (
  request: ExportArtifactDeliveryRequest,
  normalizedConfig: NormalizedConfig,
  source: Extract<ExportArtifactDeliveryApiSource, "error_fallback" | "seeded_fallback">,
  status: Extract<ExportArtifactDeliveryApiStatus, "error" | "fallback">,
  diagnostics: readonly ExportArtifactDeliveryApiDiagnostic[],
  traceIdValue?: string,
): ExportArtifactDeliveryApiBridgeState => ({
  boundary: exportArtifactDeliveryApiBoundary,
  configured: normalizedConfig.configured,
  diagnostics,
  loading: false,
  request,
  source,
  status,
  ...(traceIdValue ? { traceId: traceIdValue } : {}),
});

export const createExportArtifactDeliveryApiLoadingState = (
  request: ExportArtifactDeliveryRequest,
): ExportArtifactDeliveryApiBridgeState => ({
  boundary: exportArtifactDeliveryApiBoundary,
  configured: true,
  diagnostics: [],
  loading: true,
  request,
  source: "loading",
  status: "loading",
});

export const createExportArtifactDeliverySeededFallbackState = (
  request: ExportArtifactDeliveryRequest,
): ExportArtifactDeliveryApiBridgeState => fallbackState(
  request,
  normalizeConfig(undefined),
  "seeded_fallback",
  "fallback",
  [diagnostic("API_BASE_URL_MISSING", "info")],
);

export const submitExportArtifactDeliveryApiReview = async ({
  config,
  fetchImpl = fetch,
  request,
}: SubmitExportArtifactDeliveryApiReviewInput): Promise<ExportArtifactDeliveryApiBridgeState> => {
  const normalizedConfig = normalizeConfig(config);
  const normalizedRequest = normalizeRequest(request);

  if (!normalizedConfig.baseUrl) {
    return fallbackState(
      request,
      normalizedConfig,
      "seeded_fallback",
      "fallback",
      [normalizedConfig.diagnostic ?? diagnostic("API_BASE_URL_MISSING", "info")],
    );
  }

  const previewEndpoint = `/api/campaigns/${encodeURIComponent(normalizedRequest.campaignId)}/export`;
  const preview = await safeFetchJson(
    fetchImpl,
    endpointUrl(normalizedConfig.baseUrl, previewEndpoint),
    previewEndpoint,
    "preview",
    {
      body: JSON.stringify({
        contractRootMode: normalizedRequest.contractRootMode,
        format: normalizedRequest.format,
        includeLocalePreference: normalizedRequest.includeLocalePreference,
        includeRiskFlags: normalizedRequest.includeRiskFlags,
        includeWalletType: normalizedRequest.includeWalletType,
      }),
      headers: requestHeaders(normalizedConfig, true, traceId(normalizedConfig.normalizedTracePrefix)),
      method: "POST",
    },
    normalizedConfig.timeoutMs,
  );

  if (!preview.ok) {
    return fallbackState(
      request,
      normalizedConfig,
      "error_fallback",
      "error",
      [preview.diagnostic ?? diagnostic("API_EXPORT_PREVIEW_FAILED", "error", {
        endpoint: previewEndpoint,
        status: preview.status,
      })],
      preview.traceId,
    );
  }

  const normalizedPreview = normalizePreview(dataPayload(preview.body));

  if (!normalizedPreview) {
    return fallbackState(
      request,
      normalizedConfig,
      "error_fallback",
      "error",
      [diagnostic("API_RESPONSE_INVALID", "error", { endpoint: previewEndpoint })],
      preview.traceId,
    );
  }

  const registry = normalizedPreview.artifactRegistry;
  const persistence = normalizePersistence(metadataPayload(preview.body, "persistence"));
  const repository = normalizeRepository(metadataPayload(preview.body, "campaignDb"));
  const artifactId = registry?.artifactId;
  const contractRootReview = contractRootReviewFor(normalizedRequest, normalizedPreview);
  const eligibilityRootPacket = normalizedPreview.eligibilityRootPacket;
  const auditListEndpoint = `/api/campaigns/${encodeURIComponent(normalizedRequest.campaignId)}/export-artifacts`;
  const auditList = await safeFetchJson(
    fetchImpl,
    queryEndpointUrl(normalizedConfig.baseUrl, auditListEndpoint, {
      artifactId,
      batchId: registry?.batchId ?? normalizedPreview.exportBatchId,
      traceId: registry?.traceId ?? preview.traceId,
    }),
    auditListEndpoint,
    "audit_list",
    {
      headers: requestHeaders(normalizedConfig, false, traceId(normalizedConfig.normalizedTracePrefix)),
      method: "GET",
    },
    normalizedConfig.timeoutMs,
  );

  if (!auditList.ok) {
    return {
      artifactId,
      boundary: exportArtifactDeliveryApiBoundary,
      configured: true,
      contractRootReview,
      diagnostics: [
        auditList.diagnostic ?? diagnostic("API_AUDIT_LIST_FAILED", "error", {
          endpoint: auditListEndpoint,
          status: auditList.status,
        }),
      ],
      ...(eligibilityRootPacket ? { eligibilityRootPacket } : {}),
      loading: false,
      ...(persistence ? { persistence } : {}),
      preview: normalizedPreview,
      ...(registry ? { registry } : {}),
      ...(repository ? { repository } : {}),
      request,
      source: "api_runtime",
      status: "partial",
      traceId: auditList.traceId ?? preview.traceId,
    };
  }

  const normalizedAuditList = normalizeAuditList(dataPayload(auditList.body));

  if (!normalizedAuditList) {
    return {
      artifactId,
      boundary: exportArtifactDeliveryApiBoundary,
      configured: true,
      contractRootReview,
      diagnostics: [diagnostic("API_RESPONSE_INVALID", "error", { endpoint: auditListEndpoint })],
      ...(eligibilityRootPacket ? { eligibilityRootPacket } : {}),
      loading: false,
      ...(persistence ? { persistence } : {}),
      preview: normalizedPreview,
      ...(registry ? { registry } : {}),
      ...(repository ? { repository } : {}),
      request,
      source: "api_runtime",
      status: "partial",
      traceId: auditList.traceId ?? preview.traceId,
    };
  }

  if (!artifactId) {
    return {
      boundary: exportArtifactDeliveryApiBoundary,
      configured: true,
      contractRootReview,
      diagnostics: [],
      auditList: normalizedAuditList,
      ...(eligibilityRootPacket ? { eligibilityRootPacket } : {}),
      loading: false,
      ...(persistence ? { persistence } : {}),
      preview: normalizedPreview,
      ...(repository ? { repository } : {}),
      request,
      source: "api_runtime",
      status: "delivered",
      traceId: auditList.traceId ?? preview.traceId,
    };
  }

  const auditDetailEndpoint =
    `/api/campaigns/${encodeURIComponent(normalizedRequest.campaignId)}/export-artifacts/${encodeURIComponent(artifactId)}`;
  const auditDetail = await safeFetchJson(
    fetchImpl,
    endpointUrl(normalizedConfig.baseUrl, auditDetailEndpoint),
    auditDetailEndpoint,
    "audit_detail",
    {
      headers: requestHeaders(normalizedConfig, false, traceId(normalizedConfig.normalizedTracePrefix)),
      method: "GET",
    },
    normalizedConfig.timeoutMs,
  );

  if (!auditDetail.ok) {
    return {
      artifactId,
      auditList: normalizedAuditList,
      boundary: exportArtifactDeliveryApiBoundary,
      configured: true,
      contractRootReview,
      diagnostics: [
        auditDetail.diagnostic ?? diagnostic("API_AUDIT_DETAIL_FAILED", "error", {
          endpoint: auditDetailEndpoint,
          status: auditDetail.status,
        }),
      ],
      ...(eligibilityRootPacket ? { eligibilityRootPacket } : {}),
      loading: false,
      ...(persistence ? { persistence } : {}),
      preview: normalizedPreview,
      registry,
      ...(repository ? { repository } : {}),
      request,
      source: "api_runtime",
      status: "partial",
      traceId: auditDetail.traceId ?? auditList.traceId ?? preview.traceId,
    };
  }

  const normalizedAuditDetail = normalizeAuditDetail(dataPayload(auditDetail.body));

  if (!normalizedAuditDetail) {
    return {
      artifactId,
      auditList: normalizedAuditList,
      boundary: exportArtifactDeliveryApiBoundary,
      configured: true,
      contractRootReview,
      diagnostics: [diagnostic("API_RESPONSE_INVALID", "error", { endpoint: auditDetailEndpoint })],
      ...(eligibilityRootPacket ? { eligibilityRootPacket } : {}),
      loading: false,
      ...(persistence ? { persistence } : {}),
      preview: normalizedPreview,
      registry,
      ...(repository ? { repository } : {}),
      request,
      source: "api_runtime",
      status: "partial",
      traceId: auditDetail.traceId ?? auditList.traceId ?? preview.traceId,
    };
  }

  return {
    artifactId,
    auditDetail: normalizedAuditDetail,
    auditList: normalizedAuditList,
    boundary: exportArtifactDeliveryApiBoundary,
    configured: true,
    contractRootReview,
    diagnostics: [],
    ...(eligibilityRootPacket ? { eligibilityRootPacket } : {}),
    loading: false,
    ...(persistence ? { persistence } : {}),
    preview: normalizedPreview,
    ...(registry ? { registry } : {}),
    ...(repository ? { repository } : {}),
    request,
    source: "api_runtime",
    status: "delivered",
    traceId: auditDetail.traceId ?? auditList.traceId ?? preview.traceId,
  };
};
