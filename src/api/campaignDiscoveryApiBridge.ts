import type { LocalizedText } from "../domain/types";

export type CampaignDiscoveryApiSource =
  | "api"
  | "disabled"
  | "error_fallback"
  | "loading"
  | "seeded_fallback";

export interface CampaignDiscoveryApiDiagnostic {
  code:
    | "API_BASE_URL_INVALID"
    | "API_BASE_URL_MISSING"
    | "API_CAMPAIGNS_FAILED"
    | "API_HEALTH_FAILED"
    | "API_REQUEST_FAILED"
    | "API_REQUEST_TIMEOUT"
    | "API_RESPONSE_INVALID";
  message: LocalizedText;
  safeDetails?: Record<string, boolean | number | string>;
}

export interface CampaignDiscoveryApiConfig {
  baseUrl?: string;
  timeoutMs?: number;
  tracePrefix?: string;
}

export interface CampaignDiscoveryApiBridgeState<TCampaign = unknown> {
  boundary: LocalizedText;
  campaignCount: number;
  campaigns: readonly TCampaign[];
  configured: boolean;
  diagnostic?: CampaignDiscoveryApiDiagnostic;
  healthStatus?: string;
  loading: boolean;
  readinessSummary?: string;
  routeCount?: number;
  source: CampaignDiscoveryApiSource;
  traceId?: string;
}

export type CampaignDiscoveryApiFetch = typeof fetch;

interface LoadCampaignDiscoveryApiBridgeStateInput<TCampaign> {
  config?: CampaignDiscoveryApiConfig;
  fetchImpl?: CampaignDiscoveryApiFetch;
  seededCampaigns: readonly TCampaign[];
}

interface NormalizedConfig {
  baseUrl?: URL;
  diagnostic?: CampaignDiscoveryApiDiagnostic;
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
  diagnostic?: CampaignDiscoveryApiDiagnostic;
  ok: boolean;
  status?: number;
  traceId?: string;
}

interface CampaignPayloadResult<TCampaign> {
  campaignCount: number;
  campaigns: readonly TCampaign[];
}

const defaultTimeoutMs = 1_500;
const minTimeoutMs = 250;
const maxTimeoutMs = 5_000;

export const campaignDiscoveryApiBoundary: LocalizedText = {
  "en-US":
    "Local Campaign OS API runtime review only. No production service, provider call, wallet signature, contract write, reward custody, or reward distribution is executed.",
  "zh-CN":
    "仅用于本地 Campaign OS API runtime review。不会执行生产服务、provider 调用、钱包签名、合约写入、奖励托管或发奖。",
  "zh-TW":
    "僅用於本地 Campaign OS API runtime review。不會執行生產服務、provider 呼叫、錢包簽名、合約寫入、獎勵託管或發獎。",
};

const diagnosticMessages: Record<CampaignDiscoveryApiDiagnostic["code"], LocalizedText> = {
  API_BASE_URL_INVALID: {
    "en-US": "The local API base URL is invalid, so seeded campaign data is shown.",
    "zh-CN": "本地 API base URL 无效，因此显示 seeded 活动数据。",
    "zh-TW": "本地 API base URL 無效，因此顯示 seeded 活動資料。",
  },
  API_BASE_URL_MISSING: {
    "en-US": "No local API base URL is configured, so seeded campaign data is shown.",
    "zh-CN": "未配置本地 API base URL，因此显示 seeded 活动数据。",
    "zh-TW": "未設定本地 API base URL，因此顯示 seeded 活動資料。",
  },
  API_CAMPAIGNS_FAILED: {
    "en-US": "The local campaign discovery route did not return usable campaign data.",
    "zh-CN": "本地活动 discovery route 未返回可用活动数据。",
    "zh-TW": "本地活動 discovery route 未回傳可用活動資料。",
  },
  API_HEALTH_FAILED: {
    "en-US": "The local API health route did not return a usable runtime envelope.",
    "zh-CN": "本地 API health route 未返回可用 runtime envelope。",
    "zh-TW": "本地 API health route 未回傳可用 runtime envelope。",
  },
  API_REQUEST_FAILED: {
    "en-US": "The local API request failed, so seeded campaign data remains visible.",
    "zh-CN": "本地 API 请求失败，因此继续显示 seeded 活动数据。",
    "zh-TW": "本地 API 請求失敗，因此繼續顯示 seeded 活動資料。",
  },
  API_REQUEST_TIMEOUT: {
    "en-US": "The local API request timed out, so seeded campaign data remains visible.",
    "zh-CN": "本地 API 请求超时，因此继续显示 seeded 活动数据。",
    "zh-TW": "本地 API 請求逾時，因此繼續顯示 seeded 活動資料。",
  },
  API_RESPONSE_INVALID: {
    "en-US": "The local API response shape was not recognized, so seeded campaign data is shown.",
    "zh-CN": "本地 API 响应结构无法识别，因此显示 seeded 活动数据。",
    "zh-TW": "本地 API 回應結構無法識別，因此顯示 seeded 活動資料。",
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
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const sanitizeCampaignDiscoveryApiText = (value: unknown): string => {
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

  return sanitizeCampaignDiscoveryApiText(value);
};

const diagnostic = (
  code: CampaignDiscoveryApiDiagnostic["code"],
  safeDetails?: Record<string, unknown>,
): CampaignDiscoveryApiDiagnostic => {
  const normalizedDetails = safeDetails
    ? Object.fromEntries(
      Object.entries(safeDetails).map(([key, value]) => [
        sanitizeCampaignDiscoveryApiText(key),
        sanitizeDetailValue(value),
      ]),
    )
    : undefined;

  return {
    code,
    message: diagnosticMessages[code],
    ...(normalizedDetails ? { safeDetails: normalizedDetails } : {}),
  };
};

const clampTimeout = (timeoutMs: number | undefined) => {
  if (!Number.isFinite(timeoutMs)) {
    return defaultTimeoutMs;
  }

  return Math.min(maxTimeoutMs, Math.max(minTimeoutMs, Math.trunc(timeoutMs ?? defaultTimeoutMs)));
};

const normalizeTracePrefix = (tracePrefix: string | undefined) => {
  const sanitized = sanitizeCampaignDiscoveryApiText(tracePrefix ?? "campaign-discovery-review")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized || "campaign-discovery-review";
};

const normalizeConfig = (config: CampaignDiscoveryApiConfig | undefined): NormalizedConfig => {
  const timeoutMs = clampTimeout(config?.timeoutMs);
  const normalizedTracePrefix = normalizeTracePrefix(config?.tracePrefix);
  const rawBaseUrl = config?.baseUrl?.trim();

  if (!rawBaseUrl) {
    return {
      diagnostic: diagnostic("API_BASE_URL_MISSING"),
      normalizedTracePrefix,
      timeoutMs,
    };
  }

  try {
    const baseUrl = new URL(rawBaseUrl);

    if (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:") {
      return {
        diagnostic: diagnostic("API_BASE_URL_INVALID", {
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
      diagnostic: diagnostic("API_BASE_URL_INVALID", {
        reason: "malformed_url",
        url: rawBaseUrl,
      }),
      normalizedTracePrefix,
      timeoutMs,
    };
  }
};

const createTraceId = (prefix: string) => `${prefix}-${Date.now().toString(36)}`;

const endpointUrl = (baseUrl: URL, endpoint: "/api/campaigns" | "/api/health") => {
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

const safeFetchJson = async (
  fetchImpl: CampaignDiscoveryApiFetch,
  url: string,
  endpoint: "/api/campaigns" | "/api/health",
  traceId: string,
  timeoutMs: number,
): Promise<FetchJsonResult> => {
  const timeout = withTimeoutSignal(timeoutMs);

  try {
    const response = await fetchImpl(url, {
      headers: {
        accept: "application/json",
        "x-campaign-os-trace-id": traceId,
      },
      method: "GET",
      signal: timeout.signal,
    });
    const body = await response.json() as unknown;
    const responseTraceId = extractTraceId(body) ?? response.headers.get("x-campaign-os-trace-id") ?? traceId;

    if (!response.ok) {
      return {
        body,
        diagnostic: diagnostic(
          endpoint === "/api/health" ? "API_HEALTH_FAILED" : "API_CAMPAIGNS_FAILED",
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
        {
          endpoint,
          reason: sanitizeCampaignDiscoveryApiText(error),
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
    ? sanitizeCampaignDiscoveryApiText(value.traceId)
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
      return sanitizeCampaignDiscoveryApiText(data.status);
    }

    if (isRecord(data.apiService) && typeof data.apiService.status === "string") {
      return sanitizeCampaignDiscoveryApiText(data.apiService.status);
    }

    if (isRecord(data.serverRuntime) && typeof data.serverRuntime.state === "string") {
      return sanitizeCampaignDiscoveryApiText(data.serverRuntime.state);
    }
  }

  return envelope.ok ? "ready" : undefined;
};

const getPayloadCandidate = (body: unknown): unknown => {
  if (!isApiEnvelope(body)) {
    return undefined;
  }

  const data = body.data;

  if (isRecord(data) && "payload" in data) {
    return data.payload;
  }

  return data;
};

const normalizeCampaignPayload = <TCampaign>(
  body: unknown,
): CampaignPayloadResult<TCampaign> | undefined => {
  const payload = getPayloadCandidate(body);

  if (isRecord(payload)) {
    if (Array.isArray(payload.items)) {
      return {
        campaignCount:
          isRecord(payload.summary) && typeof payload.summary.totalCampaigns === "number"
            ? payload.summary.totalCampaigns
            : payload.items.length,
        campaigns: payload.items as TCampaign[],
      };
    }

    if (Array.isArray(payload.campaigns)) {
      return {
        campaignCount: payload.campaigns.length,
        campaigns: payload.campaigns as TCampaign[],
      };
    }
  }

  if (Array.isArray(payload)) {
    return {
      campaignCount: payload.length,
      campaigns: payload as TCampaign[],
    };
  }

  return undefined;
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

const seededState = <TCampaign>({
  configured,
  diagnostic: stateDiagnostic,
  source,
  traceId,
  seededCampaigns,
  healthStatus,
  routeCount,
}: {
  configured: boolean;
  diagnostic?: CampaignDiscoveryApiDiagnostic;
  healthStatus?: string;
  routeCount?: number;
  seededCampaigns: readonly TCampaign[];
  source: Extract<CampaignDiscoveryApiSource, "disabled" | "error_fallback" | "seeded_fallback">;
  traceId?: string;
}): CampaignDiscoveryApiBridgeState<TCampaign> => ({
  boundary: campaignDiscoveryApiBoundary,
  campaignCount: seededCampaigns.length,
  campaigns: seededCampaigns,
  configured,
  ...(stateDiagnostic ? { diagnostic: stateDiagnostic } : {}),
  ...(healthStatus ? { healthStatus } : {}),
  loading: false,
  ...(readinessSummary(healthStatus, routeCount) ? { readinessSummary: readinessSummary(healthStatus, routeCount) } : {}),
  ...(routeCount !== undefined ? { routeCount } : {}),
  source,
  ...(traceId ? { traceId } : {}),
});

export const createCampaignDiscoveryApiLoadingState = ({
  campaignCount,
}: {
  campaignCount: number;
}): CampaignDiscoveryApiBridgeState<never> => ({
  boundary: campaignDiscoveryApiBoundary,
  campaignCount,
  campaigns: [],
  configured: true,
  loading: true,
  source: "loading",
});

export const loadCampaignDiscoveryApiBridgeState = async <TCampaign>({
  config,
  fetchImpl = fetch,
  seededCampaigns,
}: LoadCampaignDiscoveryApiBridgeStateInput<TCampaign>): Promise<CampaignDiscoveryApiBridgeState<TCampaign>> => {
  const normalizedConfig = normalizeConfig(config);

  if (!normalizedConfig.baseUrl) {
    return seededState({
      configured: Boolean(config?.baseUrl?.trim()),
      diagnostic: normalizedConfig.diagnostic,
      seededCampaigns,
      source: config?.baseUrl?.trim() ? "seeded_fallback" : "disabled",
    });
  }

  const health = await safeFetchJson(
    fetchImpl,
    endpointUrl(normalizedConfig.baseUrl, "/api/health"),
    "/api/health",
    createTraceId(normalizedConfig.normalizedTracePrefix),
    normalizedConfig.timeoutMs,
  );

  if (!health.ok || !isApiEnvelope(health.body) || !health.body.ok) {
    return seededState({
      configured: true,
      diagnostic: health.diagnostic ?? diagnostic("API_HEALTH_FAILED", { endpoint: "/api/health" }),
      seededCampaigns,
      source: "error_fallback",
      traceId: health.traceId ?? extractTraceId(health.body),
    });
  }

  const routeCount = routeCountFromEnvelope(health.body);
  const healthStatus = healthStatusFromEnvelope(health.body);
  const campaigns = await safeFetchJson(
    fetchImpl,
    endpointUrl(normalizedConfig.baseUrl, "/api/campaigns"),
    "/api/campaigns",
    createTraceId(normalizedConfig.normalizedTracePrefix),
    normalizedConfig.timeoutMs,
  );
  const campaignsTraceId = campaigns.traceId ?? extractTraceId(campaigns.body) ?? health.traceId;

  if (!campaigns.ok || !isApiEnvelope(campaigns.body) || !campaigns.body.ok) {
    return seededState({
      configured: true,
      diagnostic: campaigns.diagnostic ?? diagnostic("API_CAMPAIGNS_FAILED", { endpoint: "/api/campaigns" }),
      healthStatus,
      routeCount,
      seededCampaigns,
      source: "error_fallback",
      traceId: campaignsTraceId,
    });
  }

  const payload = normalizeCampaignPayload<TCampaign>(campaigns.body);

  if (!payload) {
    return seededState({
      configured: true,
      diagnostic: diagnostic("API_RESPONSE_INVALID", { endpoint: "/api/campaigns" }),
      healthStatus,
      routeCount,
      seededCampaigns,
      source: "error_fallback",
      traceId: campaignsTraceId,
    });
  }

  return {
    boundary: campaignDiscoveryApiBoundary,
    campaignCount: payload.campaignCount,
    campaigns: payload.campaigns,
    configured: true,
    ...(healthStatus ? { healthStatus } : {}),
    loading: false,
    ...(readinessSummary(healthStatus, routeCount) ? { readinessSummary: readinessSummary(healthStatus, routeCount) } : {}),
    ...(routeCount !== undefined ? { routeCount } : {}),
    source: "api",
    ...(campaignsTraceId ? { traceId: campaignsTraceId } : {}),
  };
};
