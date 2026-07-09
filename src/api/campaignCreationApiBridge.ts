import type {
  CampaignStatus,
  ContractMode,
  LocalizedText,
  SupportedLocale,
  WalletPolicy,
} from "../domain/types";

export type CampaignCreationApiSource =
  | "api_runtime"
  | "error_fallback"
  | "loading"
  | "seeded_fallback";

export type CampaignCreationApiStatus =
  | "created"
  | "error"
  | "fallback"
  | "loading";

export interface CampaignCreationApiDiagnostic {
  code:
    | "API_BASE_URL_INVALID"
    | "API_BASE_URL_MISSING"
    | "API_CREATE_FAILED"
    | "API_HEALTH_FAILED"
    | "API_LIST_FAILED"
    | "API_REQUEST_FAILED"
    | "API_REQUEST_TIMEOUT"
    | "API_RESPONSE_INVALID";
  message: LocalizedText;
  safeDetails?: Record<string, boolean | number | string>;
  severity: "error" | "info" | "warning";
}

export interface CampaignCreationApiConfig {
  baseUrl?: string;
  timeoutMs?: number;
  tracePrefix?: string;
}

export interface CampaignCreationDraftInput {
  contractMode?: ContractMode;
  defaultLocale?: SupportedLocale;
  duration: string;
  endTime: string;
  goal: string;
  metadataHash?: string;
  metadataUri?: string;
  ownerAddress: string;
  projectId: string;
  rewardDescription: string;
  rewardDisclaimerHash?: string;
  startTime: string;
  status?: CampaignStatus;
  supportedLocales?: SupportedLocale[];
  walletPolicy?: WalletPolicy;
}

export interface CampaignCreationApiRepositoryMetadata {
  adapterId?: string;
  createdViaRepository?: boolean;
  draftId?: string;
  repositoryId?: string;
  storeId?: string;
}

export interface CampaignCreationApiPersistenceMetadata {
  kind?: string;
  recordId?: string;
}

export interface CampaignCreationApiBridgeState {
  boundary: LocalizedText;
  campaignCount: number;
  configured: boolean;
  createdDraftId?: string;
  diagnostics: readonly CampaignCreationApiDiagnostic[];
  healthStatus?: string;
  listContainsCreatedDraft?: boolean;
  loading: boolean;
  persistence?: CampaignCreationApiPersistenceMetadata;
  readinessSummary?: string;
  repository?: CampaignCreationApiRepositoryMetadata;
  routeCount?: number;
  source: CampaignCreationApiSource;
  status: CampaignCreationApiStatus;
  traceId?: string;
}

export type CampaignCreationApiFetch = typeof fetch;

interface SubmitCampaignCreationApiBridgeDraftInput {
  config?: CampaignCreationApiConfig;
  draft: CampaignCreationDraftInput;
  fetchImpl?: CampaignCreationApiFetch;
  seededCampaignCount?: number;
}

interface NormalizedConfig {
  baseUrl?: URL;
  diagnostic?: CampaignCreationApiDiagnostic;
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

interface FetchJsonResult {
  body?: unknown;
  diagnostic?: CampaignCreationApiDiagnostic;
  ok: boolean;
  status?: number;
  traceId?: string;
}

interface CreationPayloadResult {
  boundary?: LocalizedText;
  createdDraftId: string;
  persistence?: CampaignCreationApiPersistenceMetadata;
  repository?: CampaignCreationApiRepositoryMetadata;
}

interface CampaignListResult {
  campaignCount: number;
  containsCreatedDraft: boolean;
}

type EndpointPath = "/api/campaigns" | "/api/health";

const defaultTimeoutMs = 2_000;
const minTimeoutMs = 250;
const maxTimeoutMs = 8_000;

export const campaignCreationApiBoundary: LocalizedText = {
  "en-US":
    "Local Campaign OS API creation review only. No production database, provider call, wallet signature, contract write, storage-backed export file, reward custody, or reward distribution is executed.",
  "zh-CN":
    "仅用于本地 Campaign OS API 创建评审。不会执行生产数据库、provider 调用、钱包签名、合约写入、storage-backed 导出文件、奖励托管或发奖。",
  "zh-TW":
    "僅用於本地 Campaign OS API 建立評審。不會執行生產資料庫、provider 呼叫、錢包簽名、合約寫入、storage-backed 匯出檔案、獎勵託管或發獎。",
};

const diagnosticMessages: Record<CampaignCreationApiDiagnostic["code"], LocalizedText> = {
  API_BASE_URL_INVALID: {
    "en-US": "The local API base URL is invalid, so the seeded campaign builder remains visible.",
    "zh-CN": "本地 API base URL 无效，因此继续显示 seeded 活动创建器。",
    "zh-TW": "本地 API base URL 無效，因此繼續顯示 seeded 活動建立器。",
  },
  API_BASE_URL_MISSING: {
    "en-US": "No local API base URL is configured, so the seeded campaign builder remains visible.",
    "zh-CN": "未配置本地 API base URL，因此继续显示 seeded 活动创建器。",
    "zh-TW": "未設定本地 API base URL，因此繼續顯示 seeded 活動建立器。",
  },
  API_CREATE_FAILED: {
    "en-US": "The local campaign creation route did not return a usable draft.",
    "zh-CN": "本地活动创建 route 未返回可用草稿。",
    "zh-TW": "本地活動建立 route 未回傳可用草稿。",
  },
  API_HEALTH_FAILED: {
    "en-US": "The local API health route did not return a usable runtime envelope.",
    "zh-CN": "本地 API health route 未返回可用 runtime envelope。",
    "zh-TW": "本地 API health route 未回傳可用 runtime envelope。",
  },
  API_LIST_FAILED: {
    "en-US": "The local campaign list refresh did not confirm the created draft.",
    "zh-CN": "本地活动列表刷新未确认创建的草稿。",
    "zh-TW": "本地活動列表刷新未確認建立的草稿。",
  },
  API_REQUEST_FAILED: {
    "en-US": "The local API request failed, so the seeded campaign builder remains visible.",
    "zh-CN": "本地 API 请求失败，因此继续显示 seeded 活动创建器。",
    "zh-TW": "本地 API 請求失敗，因此繼續顯示 seeded 活動建立器。",
  },
  API_REQUEST_TIMEOUT: {
    "en-US": "The local API request timed out, so the seeded campaign builder remains visible.",
    "zh-CN": "本地 API 请求超时，因此继续显示 seeded 活动创建器。",
    "zh-TW": "本地 API 請求逾時，因此繼續顯示 seeded 活動建立器。",
  },
  API_RESPONSE_INVALID: {
    "en-US": "The local API response shape was not recognized, so the seeded campaign builder remains visible.",
    "zh-CN": "本地 API 响应结构无法识别，因此继续显示 seeded 活动创建器。",
    "zh-TW": "本地 API 回應結構無法識別，因此繼續顯示 seeded 活動建立器。",
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
  [/\bprovider[-_\s]*payload\b/gi, "redacted provider payload"],
  [/\bstack\s*trace\b/gi, "redacted stack"],
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const sanitizeCampaignCreationApiText = (value: unknown): string => {
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

  return sanitizeCampaignCreationApiText(value);
};

const diagnostic = (
  code: CampaignCreationApiDiagnostic["code"],
  severity: CampaignCreationApiDiagnostic["severity"],
  safeDetails?: Record<string, unknown>,
): CampaignCreationApiDiagnostic => {
  const normalizedDetails = safeDetails
    ? Object.fromEntries(
      Object.entries(safeDetails).map(([key, value]) => [
        sanitizeCampaignCreationApiText(key),
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
  const sanitized = sanitizeCampaignCreationApiText(tracePrefix ?? "campaign-creation-review")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized || "campaign-creation-review";
};

const normalizeConfig = (config: CampaignCreationApiConfig | undefined): NormalizedConfig => {
  const timeoutMs = clampTimeout(config?.timeoutMs);
  const normalizedTracePrefix = normalizeTracePrefix(config?.tracePrefix);
  const rawBaseUrl = config?.baseUrl?.trim();

  if (!rawBaseUrl) {
    return {
      diagnostic: diagnostic("API_BASE_URL_MISSING", "info"),
      normalizedTracePrefix,
      timeoutMs,
    };
  }

  try {
    const baseUrl = new URL(rawBaseUrl);

    if (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:") {
      return {
        diagnostic: diagnostic("API_BASE_URL_INVALID", "warning", {
          reason: "unsupported_protocol",
          url: rawBaseUrl,
        }),
        normalizedTracePrefix,
        timeoutMs,
      };
    }

    return {
      baseUrl,
      normalizedTracePrefix,
      timeoutMs,
    };
  } catch {
    return {
      diagnostic: diagnostic("API_BASE_URL_INVALID", "warning", {
        reason: "malformed_url",
        url: rawBaseUrl,
      }),
      normalizedTracePrefix,
      timeoutMs,
    };
  }
};

const createTraceId = (prefix: string) => `${prefix}-${Date.now().toString(36)}`;

const endpointUrl = (baseUrl: URL, endpoint: EndpointPath) => {
  const next = new URL(baseUrl.toString());

  next.pathname = endpoint;
  next.search = "";
  next.hash = "";

  return next.toString();
};

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

const routeFailureCode = (endpoint: EndpointPath): CampaignCreationApiDiagnostic["code"] => {
  if (endpoint === "/api/health") {
    return "API_HEALTH_FAILED";
  }

  return "API_LIST_FAILED";
};

const safeFetchJson = async (
  fetchImpl: CampaignCreationApiFetch,
  url: string,
  endpoint: EndpointPath,
  traceId: string,
  timeoutMs: number,
  init: Pick<RequestInit, "body" | "method">,
): Promise<FetchJsonResult> => {
  const timeout = withTimeoutSignal(timeoutMs);

  try {
    const response = await fetchImpl(url, {
      body: init.body,
      headers: {
        accept: "application/json",
        ...(init.body ? { "content-type": "application/json" } : {}),
        "x-campaign-os-trace-id": traceId,
      },
      method: init.method,
      signal: timeout.signal,
    });
    const body = await response.json() as unknown;
    const responseTraceId = extractTraceId(body) ?? response.headers.get("x-campaign-os-trace-id") ?? traceId;

    if (!response.ok) {
      return {
        body,
        diagnostic: diagnostic(
          endpoint === "/api/campaigns" && init.method === "POST"
            ? "API_CREATE_FAILED"
            : routeFailureCode(endpoint),
          "error",
          {
            endpoint,
            status: response.status,
          },
        ),
        ok: false,
        status: response.status,
        traceId: responseTraceId,
      };
    }

    return {
      body,
      ok: true,
      status: response.status,
      traceId: responseTraceId,
    };
  } catch (error) {
    return {
      diagnostic: diagnostic(
        error instanceof DOMException && error.name === "AbortError"
          ? "API_REQUEST_TIMEOUT"
          : "API_REQUEST_FAILED",
        "error",
        {
          endpoint,
          reason: sanitizeCampaignCreationApiText(error),
        },
      ),
      ok: false,
      traceId,
    };
  } finally {
    timeout.clear();
  }
};

const isApiEnvelope = (value: unknown): value is ApiRuntimeEnvelope =>
  isRecord(value) && typeof value.ok === "boolean";

const extractTraceId = (value: unknown): string | undefined =>
  isRecord(value) && typeof value.traceId === "string" && value.traceId.trim()
    ? sanitizeCampaignCreationApiText(value.traceId)
    : undefined;

const routeCountFromEnvelope = (envelope: unknown): number | undefined => {
  if (!isApiEnvelope(envelope)) {
    return undefined;
  }

  const routeCount = envelope.runtime?.routeCount;

  return typeof routeCount === "number" && Number.isFinite(routeCount) ? routeCount : undefined;
};

const healthStatusFromEnvelope = (envelope: unknown): string | undefined => {
  if (!isApiEnvelope(envelope)) {
    return undefined;
  }

  const data = envelope.data;

  if (isRecord(data)) {
    if (typeof data.status === "string") {
      return sanitizeCampaignCreationApiText(data.status);
    }

    if (isRecord(data.apiService) && typeof data.apiService.status === "string") {
      return sanitizeCampaignCreationApiText(data.apiService.status);
    }

    if (isRecord(data.serverRuntime) && typeof data.serverRuntime.state === "string") {
      return sanitizeCampaignCreationApiText(data.serverRuntime.state);
    }
  }

  return envelope.ok ? "ready" : undefined;
};

const localizedTextFromValue = (value: unknown): LocalizedText | undefined => {
  if (
    isRecord(value)
    && typeof value["en-US"] === "string"
    && typeof value["zh-CN"] === "string"
  ) {
    return {
      "en-US": sanitizeCampaignCreationApiText(value["en-US"]),
      "zh-CN": sanitizeCampaignCreationApiText(value["zh-CN"]),
      ...(typeof value["zh-TW"] === "string"
        ? { "zh-TW": sanitizeCampaignCreationApiText(value["zh-TW"]) }
        : {}),
    };
  }

  return undefined;
};

const getDataRecord = (body: unknown): Record<string, unknown> | undefined => {
  if (!isApiEnvelope(body) || !isRecord(body.data)) {
    return undefined;
  }

  return body.data;
};

const optionalStringField = (
  value: Record<string, unknown>,
  key: string,
): string | undefined => {
  const raw = value[key];

  return typeof raw === "string" && raw.trim() ? sanitizeCampaignCreationApiText(raw) : undefined;
};

const optionalBooleanField = (
  value: Record<string, unknown>,
  key: string,
): boolean | undefined => {
  const raw = value[key];

  return typeof raw === "boolean" ? raw : undefined;
};

const repositoryMetadataFromValue = (value: unknown): CampaignCreationApiRepositoryMetadata | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const metadata: CampaignCreationApiRepositoryMetadata = {
    ...(optionalStringField(value, "adapterId") ? { adapterId: optionalStringField(value, "adapterId") } : {}),
    ...(optionalBooleanField(value, "createdViaRepository") !== undefined
      ? { createdViaRepository: optionalBooleanField(value, "createdViaRepository") }
      : {}),
    ...(optionalStringField(value, "draftId") ? { draftId: optionalStringField(value, "draftId") } : {}),
    ...(optionalStringField(value, "repositoryId") ? { repositoryId: optionalStringField(value, "repositoryId") } : {}),
    ...(optionalStringField(value, "storeId") ? { storeId: optionalStringField(value, "storeId") } : {}),
  };

  return Object.keys(metadata).length > 0 ? metadata : undefined;
};

const persistenceMetadataFromValue = (value: unknown): CampaignCreationApiPersistenceMetadata | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const metadata: CampaignCreationApiPersistenceMetadata = {
    ...(optionalStringField(value, "kind") ? { kind: optionalStringField(value, "kind") } : {}),
    ...(optionalStringField(value, "recordId") ? { recordId: optionalStringField(value, "recordId") } : {}),
  };

  return Object.keys(metadata).length > 0 ? metadata : undefined;
};

const normalizeCreationPayload = (body: unknown): CreationPayloadResult | undefined => {
  const data = getDataRecord(body);

  if (!data) {
    return undefined;
  }

  const payload = data.payload;
  const payloadId = isRecord(payload) ? optionalStringField(payload, "id") : undefined;
  const repository = repositoryMetadataFromValue(data.campaignDb);
  const createdDraftId = payloadId ?? repository?.draftId;

  if (!createdDraftId) {
    return undefined;
  }

  return {
    ...(localizedTextFromValue(data.boundary)
      ?? (isRecord(payload) ? localizedTextFromValue(payload.rewardBoundary) : undefined)
      ? {
        boundary:
          localizedTextFromValue(data.boundary)
          ?? (isRecord(payload) ? localizedTextFromValue(payload.rewardBoundary) : undefined),
      }
      : {}),
    createdDraftId,
    ...(persistenceMetadataFromValue(data.persistence)
      ? { persistence: persistenceMetadataFromValue(data.persistence) }
      : {}),
    ...(repository ? { repository } : {}),
  };
};

const getPayloadCandidate = (body: unknown): unknown => {
  const data = getDataRecord(body);

  if (!data) {
    return undefined;
  }

  return "payload" in data ? data.payload : data;
};

const normalizeCampaignList = (
  body: unknown,
  createdDraftId: string,
): CampaignListResult | undefined => {
  const payload = getPayloadCandidate(body);
  const items = (() => {
    if (isRecord(payload)) {
      if (Array.isArray(payload.items)) {
        return payload.items;
      }

      if (Array.isArray(payload.campaigns)) {
        return payload.campaigns;
      }
    }

    return Array.isArray(payload) ? payload : undefined;
  })();

  if (!items) {
    return undefined;
  }

  const campaignCount =
    isRecord(payload)
    && isRecord(payload.summary)
    && typeof payload.summary.totalCampaigns === "number"
      ? payload.summary.totalCampaigns
      : items.length;

  return {
    campaignCount,
    containsCreatedDraft: items.some(
      (item) => isRecord(item) && optionalStringField(item, "id") === createdDraftId,
    ),
  };
};

const readinessSummary = (healthStatus: string | undefined, routeCount: number | undefined) => {
  if (healthStatus && routeCount !== undefined) {
    return `${healthStatus}; ${routeCount} routes`;
  }

  if (healthStatus) {
    return healthStatus;
  }

  if (routeCount !== undefined) {
    return `${routeCount} routes`;
  }

  return undefined;
};

const fallbackState = ({
  configured,
  diagnostics,
  healthStatus,
  routeCount,
  seededCampaignCount,
  source,
  status,
  traceId,
}: {
  configured: boolean;
  diagnostics: readonly CampaignCreationApiDiagnostic[];
  healthStatus?: string;
  routeCount?: number;
  seededCampaignCount: number;
  source: Extract<CampaignCreationApiSource, "error_fallback" | "seeded_fallback">;
  status: Extract<CampaignCreationApiStatus, "error" | "fallback">;
  traceId?: string;
}): CampaignCreationApiBridgeState => ({
  boundary: campaignCreationApiBoundary,
  campaignCount: seededCampaignCount,
  configured,
  diagnostics,
  ...(healthStatus ? { healthStatus } : {}),
  loading: false,
  ...(readinessSummary(healthStatus, routeCount) ? { readinessSummary: readinessSummary(healthStatus, routeCount) } : {}),
  ...(routeCount !== undefined ? { routeCount } : {}),
  source,
  status,
  ...(traceId ? { traceId } : {}),
});

export const createCampaignCreationApiLoadingState = ({
  campaignCount = 0,
}: {
  campaignCount?: number;
} = {}): CampaignCreationApiBridgeState => ({
  boundary: campaignCreationApiBoundary,
  campaignCount,
  configured: true,
  diagnostics: [],
  loading: true,
  source: "loading",
  status: "loading",
});

export const submitCampaignCreationApiBridgeDraft = async ({
  config,
  draft,
  fetchImpl = fetch,
  seededCampaignCount = 0,
}: SubmitCampaignCreationApiBridgeDraftInput): Promise<CampaignCreationApiBridgeState> => {
  const normalizedConfig = normalizeConfig(config);

  if (!normalizedConfig.baseUrl) {
    return fallbackState({
      configured: Boolean(config?.baseUrl?.trim()),
      diagnostics: normalizedConfig.diagnostic ? [normalizedConfig.diagnostic] : [],
      seededCampaignCount,
      source: "seeded_fallback",
      status: "fallback",
    });
  }

  const health = await safeFetchJson(
    fetchImpl,
    endpointUrl(normalizedConfig.baseUrl, "/api/health"),
    "/api/health",
    createTraceId(normalizedConfig.normalizedTracePrefix),
    normalizedConfig.timeoutMs,
    { method: "GET" },
  );

  if (!health.ok || !isApiEnvelope(health.body) || !health.body.ok) {
    return fallbackState({
      configured: true,
      diagnostics: [health.diagnostic ?? diagnostic("API_HEALTH_FAILED", "error", { endpoint: "/api/health" })],
      seededCampaignCount,
      source: "error_fallback",
      status: "error",
      traceId: health.traceId ?? extractTraceId(health.body),
    });
  }

  const healthStatus = healthStatusFromEnvelope(health.body);
  const routeCount = routeCountFromEnvelope(health.body);
  const create = await safeFetchJson(
    fetchImpl,
    endpointUrl(normalizedConfig.baseUrl, "/api/campaigns"),
    "/api/campaigns",
    createTraceId(normalizedConfig.normalizedTracePrefix),
    normalizedConfig.timeoutMs,
    {
      body: JSON.stringify(draft),
      method: "POST",
    },
  );
  const createTraceIdValue = create.traceId ?? extractTraceId(create.body) ?? health.traceId;

  if (!create.ok || !isApiEnvelope(create.body) || !create.body.ok) {
    return fallbackState({
      configured: true,
      diagnostics: [create.diagnostic ?? diagnostic("API_CREATE_FAILED", "error", { endpoint: "/api/campaigns" })],
      healthStatus,
      routeCount,
      seededCampaignCount,
      source: "error_fallback",
      status: "error",
      traceId: createTraceIdValue,
    });
  }

  const creationPayload = normalizeCreationPayload(create.body);

  if (!creationPayload) {
    return fallbackState({
      configured: true,
      diagnostics: [diagnostic("API_RESPONSE_INVALID", "error", { endpoint: "/api/campaigns" })],
      healthStatus,
      routeCount,
      seededCampaignCount,
      source: "error_fallback",
      status: "error",
      traceId: createTraceIdValue,
    });
  }

  const list = await safeFetchJson(
    fetchImpl,
    endpointUrl(normalizedConfig.baseUrl, "/api/campaigns"),
    "/api/campaigns",
    createTraceId(normalizedConfig.normalizedTracePrefix),
    normalizedConfig.timeoutMs,
    { method: "GET" },
  );
  const listTraceId = list.traceId ?? extractTraceId(list.body) ?? createTraceIdValue;
  const listResult =
    list.ok && isApiEnvelope(list.body) && list.body.ok
      ? normalizeCampaignList(list.body, creationPayload.createdDraftId)
      : undefined;
  const listDiagnostic =
    list.ok && isApiEnvelope(list.body) && list.body.ok
      ? listResult
        ? undefined
        : diagnostic("API_RESPONSE_INVALID", "warning", { endpoint: "/api/campaigns" })
      : list.diagnostic
        ? { ...list.diagnostic, severity: "warning" as const }
        : diagnostic("API_LIST_FAILED", "warning", { endpoint: "/api/campaigns" });

  return {
    boundary: creationPayload.boundary ?? campaignCreationApiBoundary,
    campaignCount: listResult?.campaignCount ?? seededCampaignCount,
    configured: true,
    createdDraftId: creationPayload.createdDraftId,
    diagnostics: listDiagnostic ? [listDiagnostic] : [],
    ...(healthStatus ? { healthStatus } : {}),
    ...(listResult ? { listContainsCreatedDraft: listResult.containsCreatedDraft } : {}),
    loading: false,
    ...(creationPayload.persistence ? { persistence: creationPayload.persistence } : {}),
    ...(readinessSummary(healthStatus, routeCount) ? { readinessSummary: readinessSummary(healthStatus, routeCount) } : {}),
    ...(creationPayload.repository ? { repository: creationPayload.repository } : {}),
    ...(routeCount !== undefined ? { routeCount } : {}),
    source: "api_runtime",
    status: "created",
    ...(listTraceId ? { traceId: listTraceId } : {}),
  };
};
