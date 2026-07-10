import {
  contractWriterRequiredConfigKeys,
  contractWriterRuntimeBoundary,
  createContractWriterRuntimeReadiness,
  sanitizeContractWriterRuntimeText,
  type ContractWriterApprovalGate,
  type ContractWriterConfigHandoff,
  type ContractWriterOperation,
  type ContractWriterOperationGroup,
  type ContractWriterRuntimeDiagnostic,
  type ContractWriterRuntimeReadiness,
  type ContractWriterRuntimeStatus,
} from "../domain/contractWriterRuntime";
import { campaignDetail } from "../domain/fixtures";
import type { LocalizedText } from "../domain/types";

export type ContractWriterRuntimeApiSource =
  | "api_runtime"
  | "error_fallback"
  | "loading"
  | "seeded_fallback";

export type ContractWriterRuntimeApiStatus =
  | "blocked"
  | "error"
  | "fallback"
  | "loading"
  | "local_ready"
  | "review_required";

export interface ContractWriterRuntimeApiDiagnostic {
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

export interface ContractWriterRuntimeApiConfig {
  baseUrl?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  tracePrefix?: string;
}

export interface ContractWriterRuntimeApiBridgeState {
  boundary: LocalizedText;
  campaignId: string;
  configured: boolean;
  diagnostics: readonly ContractWriterRuntimeApiDiagnostic[];
  loading: boolean;
  readiness: ContractWriterRuntimeReadiness;
  routeCount?: number;
  source: ContractWriterRuntimeApiSource;
  status: ContractWriterRuntimeApiStatus;
  traceId?: string;
}

export type ContractWriterRuntimeApiFetch = typeof fetch;

interface LoadContractWriterRuntimeApiBridgeStateInput {
  campaignId: string;
  config?: ContractWriterRuntimeApiConfig;
  fetchImpl?: ContractWriterRuntimeApiFetch;
}

interface NormalizedConfig {
  baseUrl?: URL;
  configured: boolean;
  diagnostic?: ContractWriterRuntimeApiDiagnostic;
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
  diagnostic?: ContractWriterRuntimeApiDiagnostic;
  ok: boolean;
  status?: number;
  traceId?: string;
}

const defaultTimeoutMs = 2_000;
const minTimeoutMs = 250;
const maxTimeoutMs = 8_000;
const defaultTracePrefix = "contract-writer-runtime";

export const contractWriterRuntimeApiBoundary: LocalizedText = {
  "en-US":
    "Local contract writer runtime API bridge only. No live signer, wallet signature, ABI generation, contract write, root write, queue publishing, scheduler execution, storage write, export write, reward custody, or reward distribution is executed.",
  "zh-CN":
    "仅用于本地 contract writer runtime API bridge。不会执行真实 signer、钱包签名、ABI 生成、合约写入、root 写入、队列发布、调度执行、storage 写入、导出写入、奖励托管或发奖。",
  "zh-TW":
    "僅用於本地 contract writer runtime API bridge。不會執行真實 signer、錢包簽名、ABI 生成、合約寫入、root 寫入、佇列發布、調度執行、storage 寫入、匯出寫入、獎勵託管或發獎。",
};

const diagnosticMessages: Record<ContractWriterRuntimeApiDiagnostic["code"], LocalizedText> = {
  API_BASE_URL_INVALID: {
    "en-US": "The local contract writer readiness API base URL is invalid, so seeded review data stays visible.",
    "zh-CN": "本地 contract writer readiness API base URL 无效，因此继续显示 seeded review 数据。",
    "zh-TW": "本地 contract writer readiness API base URL 無效，因此繼續顯示 seeded review 資料。",
  },
  API_BASE_URL_MISSING: {
    "en-US": "No local contract writer readiness API base URL is configured, so seeded review data is shown.",
    "zh-CN": "未配置本地 contract writer readiness API base URL，因此显示 seeded review 数据。",
    "zh-TW": "未設定本地 contract writer readiness API base URL，因此顯示 seeded review 資料。",
  },
  API_PAYLOAD_INVALID: {
    "en-US": "The local contract writer readiness payload is missing required no-live review fields.",
    "zh-CN": "本地 contract writer readiness payload 缺少必需 no-live review 字段。",
    "zh-TW": "本地 contract writer readiness payload 缺少必要 no-live review 欄位。",
  },
  API_REQUEST_FAILED: {
    "en-US": "The local contract writer readiness API request failed, so seeded review data stays visible.",
    "zh-CN": "本地 contract writer readiness API 请求失败，因此继续显示 seeded review 数据。",
    "zh-TW": "本地 contract writer readiness API 請求失敗，因此繼續顯示 seeded review 資料。",
  },
  API_REQUEST_TIMEOUT: {
    "en-US": "The local contract writer readiness API request timed out, so seeded review data stays visible.",
    "zh-CN": "本地 contract writer readiness API 请求超时，因此继续显示 seeded review 数据。",
    "zh-TW": "本地 contract writer readiness API 請求逾時，因此繼續顯示 seeded review 資料。",
  },
  API_RESPONSE_MALFORMED: {
    "en-US": "The local contract writer readiness API response envelope was not recognized.",
    "zh-CN": "本地 contract writer readiness API response envelope 无法识别。",
    "zh-TW": "本地 contract writer readiness API response envelope 無法識別。",
  },
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const unsafeApiPatterns: Array<[RegExp, string]> = [
  [/\braw[-_\s]*signature\b/gi, "__CW_API_RED_0__"],
  [/\bwallet[-_\s]*signature\b/gi, "__CW_API_RED_0__"],
  [/\bprivate[-_\s]*key\b/gi, "__CW_API_RED_1__"],
  [/\bseed[-_\s]*phrase\b/gi, "__CW_API_RED_1__"],
  [/\bbearer[-_\s]*token\b/gi, "__CW_API_RED_2__"],
  [/\bbearer\s+[A-Za-z0-9._~+/=-]+/gi, "__CW_API_RED_2__"],
  [/\b(token|access_token|refresh_token|api_key|apikey)=([^&\s"'<>]+)/gi, "__CW_API_RED_2__"],
  [/\bprovider[-_\s]*(payload|response|request)\b/gi, "__CW_API_RED_3__"],
  [/\bprovider[-_\s]*call\b/gi, "__CW_API_RED_3__"],
  [/\bstack\s*trace\b/gi, "__CW_API_RED_4__"],
  [/at\s+[A-Za-z0-9_$.[\]<>]+\s+\([^)]*\)/g, "__CW_API_RED_4__"],
  [/\bsigned[-_\s]*url\b/gi, "__CW_API_RED_5__"],
  [/\bdownload[-_\s]*url\b/gi, "__CW_API_RED_6__"],
  [/\bobject[-_\s]*key\b/gi, "__CW_API_RED_7__"],
  [/\bstorage[-_\s]*key\b/gi, "__CW_API_RED_7__"],
];

const unsafeApiReplacementLabels: Record<string, string> = {
  __CW_API_RED_0__: "[REDACTED:WALLET_SIGNATURE]",
  __CW_API_RED_1__: "[REDACTED:PRIVATE_KEY]",
  __CW_API_RED_2__: "[REDACTED:CREDENTIAL]",
  __CW_API_RED_3__: "[REDACTED:PROVIDER_PAYLOAD]",
  __CW_API_RED_4__: "[REDACTED:STACK]",
  __CW_API_RED_5__: "[REDACTED:SIGNED_URL]",
  __CW_API_RED_6__: "[REDACTED:ENDPOINT]",
  __CW_API_RED_7__: "[REDACTED:OBJECT_KEY]",
};

export const sanitizeContractWriterRuntimeApiText = (value: unknown): string => {
  const raw = typeof value === "string" ? value : JSON.stringify(value ?? "");
  const strippedUrlQuery = raw.replace(/\?[^"'\s<>]*/g, "?redacted-query");
  const apiSanitized = unsafeApiPatterns.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    strippedUrlQuery,
  );

  return Object.entries(unsafeApiReplacementLabels).reduce(
    (current, [placeholder, replacement]) => current.split(placeholder).join(replacement),
    sanitizeContractWriterRuntimeText(apiSanitized),
  );
};

const sanitizeDetailValue = (value: unknown): boolean | number | string => {
  if (typeof value === "boolean" || typeof value === "number") {
    return value;
  }

  return sanitizeContractWriterRuntimeApiText(value);
};

const diagnostic = (
  code: ContractWriterRuntimeApiDiagnostic["code"],
  severity: ContractWriterRuntimeApiDiagnostic["severity"],
  safeDetails?: Record<string, unknown>,
): ContractWriterRuntimeApiDiagnostic => {
  const normalizedDetails = safeDetails
    ? Object.fromEntries(
      Object.entries(safeDetails).map(([key, value]) => [
        sanitizeContractWriterRuntimeApiText(key),
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
  const sanitized = sanitizeContractWriterRuntimeApiText(tracePrefix ?? defaultTracePrefix)
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
        sanitizeContractWriterRuntimeApiText(key).toLowerCase(),
        sanitizeContractWriterRuntimeApiText(value),
      ]),
  );

const normalizeConfig = (config: ContractWriterRuntimeApiConfig | undefined): NormalizedConfig => {
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

export const buildContractWriterRuntimeApiUrl = (baseUrl: URL, campaignId: string) => {
  const next = new URL(baseUrl.toString());
  const basePath = next.pathname.replace(/\/+$/, "");
  const safeCampaignId = encodeURIComponent(campaignId);

  next.pathname = `${basePath}/api/campaigns/${safeCampaignId}/contract-writer/readiness`;
  next.search = "";
  next.hash = "";

  return next.toString();
};

export const createContractWriterRuntimeApiTraceId = (prefix: string) =>
  `${prefix}-contract-writer-runtime-${Date.now().toString(36)}`;

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
    ? sanitizeContractWriterRuntimeApiText(body.traceId)
    : undefined;

const safeFetchJson = async (
  fetchImpl: ContractWriterRuntimeApiFetch,
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
      jsonError: sanitizeContractWriterRuntimeApiText(error),
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
        traceId: responseTraceId ? sanitizeContractWriterRuntimeApiText(responseTraceId) : undefined,
      };
    }

    return {
      body,
      ok: true,
      status: response.status,
      traceId: responseTraceId ? sanitizeContractWriterRuntimeApiText(responseTraceId) : undefined,
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
  traceId = "contract-writer-local-review",
): ContractWriterRuntimeReadiness => ({
  ...createContractWriterRuntimeReadiness({
    campaign: campaignDetail,
    source: "seeded_runtime",
    traceId,
  }),
  campaignId,
  traceId,
});

export const createContractWriterRuntimeApiLoadingState = (
  campaignId: string,
): ContractWriterRuntimeApiBridgeState => ({
  boundary: contractWriterRuntimeApiBoundary,
  campaignId,
  configured: true,
  diagnostics: [],
  loading: true,
  readiness: seededReadiness(campaignId),
  source: "loading",
  status: "loading",
});

export const createContractWriterRuntimeApiSeededFallbackState = (
  campaignId: string,
  traceId?: string,
): ContractWriterRuntimeApiBridgeState => ({
  boundary: contractWriterRuntimeApiBoundary,
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
  source: Extract<ContractWriterRuntimeApiSource, "error_fallback" | "seeded_fallback">,
  diagnostics: readonly ContractWriterRuntimeApiDiagnostic[],
  traceId?: string,
): ContractWriterRuntimeApiBridgeState => ({
  boundary: contractWriterRuntimeApiBoundary,
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

const diagnosticsSafe = (value: unknown): value is readonly ContractWriterRuntimeDiagnostic[] =>
  Array.isArray(value)
  && value.every((item) =>
    isRecord(item)
    && stringField(item, "code")
    && stringField(item, "field")
    && stringField(item, "message")
    && (item.severity === "info" || item.severity === "warning" || item.severity === "error")
    && stringField(item, "source")
  );

const isApprovalGate = (value: unknown): value is ContractWriterApprovalGate =>
  isRecord(value)
  && stringField(value, "id")
  && localizedText(value.label)
  && value.requiredBeforeProduction === true
  && (value.status === "approved" || value.status === "missing" || value.status === "review_required");

const isOperation = (value: unknown): value is ContractWriterOperation =>
  isRecord(value)
  && localizedText(value.boundary)
  && localizedText(value.evidenceSurface)
  && stringField(value, "id")
  && value.liveWriteEnabled === false
  && stringField(value, "methodName")
  && value.requiresIdempotency === true
  && value.requiresOperatorApproval === true
  && value.requiresSignerPolicy === true
  && (value.riskLevel === "critical" || value.riskLevel === "high" || value.riskLevel === "medium");

const isOperationGroup = (value: unknown): value is ContractWriterOperationGroup =>
  isRecord(value)
  && localizedText(value.boundary)
  && stringField(value, "contractId")
  && stringField(value, "contractName")
  && stringArray(value.evidenceRefs)
  && localizedText(value.nextAction)
  && Array.isArray(value.operations)
  && value.operations.every(isOperation)
  && stringField(value, "ownerRole")
  && value.phase === "P1"
  && (value.readiness === "blocked" || value.readiness === "local_only" || value.readiness === "review_required");

const isNoLiveSideEffects = (value: unknown) =>
  isRecord(value)
  && [
    "liveAbiGeneration",
    "liveContractWrite",
    "liveExportFileWrite",
    "liveObjectStorageWrite",
    "liveProductionDatabaseMutation",
    "liveQueuePublishing",
    "liveRewardCustody",
    "liveRewardDistribution",
    "liveRootWrite",
    "liveSchedulerExecution",
    "liveSignerExecution",
    "liveWalletSignature",
  ].every((key) => value[key] === false);

const isConfigHandoff = (value: unknown): value is ContractWriterConfigHandoff => {
  if (!isRecord(value)) {
    return false;
  }

  const requiredConfigKeys = value.requiredConfigKeys;

  if (!stringArray(requiredConfigKeys)) {
    return false;
  }

  return stringArray(value.missingConfigKeys)
    && value.productionReady === false
    && contractWriterRequiredConfigKeys.every((key) => requiredConfigKeys.includes(key))
    && (value.status === "missing" || value.status === "partial" || value.status === "ready_disabled")
    && localizedText(value.topBlocker);
};

const isSummary = (value: unknown) =>
  isRecord(value)
  && [
    "approvalGateCount",
    "approvedApprovalGateCount",
    "contractGroupCount",
    "missingConfigCount",
    "operationCount",
    "requiredConfigCount",
  ].every((key) => numberField(value, key))
  && localizedText(value.topBlocker)
  && localizedText(value.topNextAction);

const isContractWriterRuntimeReadiness = (
  value: unknown,
  campaignId: string,
): value is ContractWriterRuntimeReadiness =>
  isRecord(value)
  && value.campaignId === campaignId
  && value.source === "server_runtime"
  && (value.status === "blocked" || value.status === "review_required" || value.status === "local_ready")
  && localizedText(value.boundary)
  && Array.isArray(value.approvalGates)
  && value.approvalGates.every(isApprovalGate)
  && isConfigHandoff(value.configHandoff)
  && stringArray(value.diagnosticCodes)
  && diagnosticsSafe(value.diagnostics)
  && isNoLiveSideEffects(value.noLiveSideEffects)
  && Array.isArray(value.operationCatalog)
  && value.operationCatalog.every(isOperationGroup)
  && value.productionReady === false
  && isSummary(value.summary)
  && (value.traceId === undefined || stringField(value, "traceId"))
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

  if ("contractWriterRuntime" in data) {
    return data.contractWriterRuntime;
  }

  return data;
};

const statusFromReadiness = (
  readiness: Pick<ContractWriterRuntimeReadiness, "status">,
): ContractWriterRuntimeStatus =>
  readiness.status;

export const loadContractWriterRuntimeApiBridgeState = async ({
  campaignId,
  config,
  fetchImpl = fetch,
}: LoadContractWriterRuntimeApiBridgeStateInput): Promise<ContractWriterRuntimeApiBridgeState> => {
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

  const traceId = createContractWriterRuntimeApiTraceId(normalizedConfig.normalizedTracePrefix);
  const result = await safeFetchJson(
    fetchImpl,
    buildContractWriterRuntimeApiUrl(normalizedConfig.baseUrl, campaignId),
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

  if (!isContractWriterRuntimeReadiness(payload, campaignId)) {
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
      : contractWriterRuntimeBoundary,
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
