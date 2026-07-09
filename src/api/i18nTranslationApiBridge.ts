import type {
  I18nReviewAction,
  LocalizedText,
  SupportedLocale,
  TranslationManagerReadModel,
} from "../domain/types";

export type I18nTranslationApiSource =
  | "api_runtime"
  | "error_fallback"
  | "loading"
  | "seeded_fallback";

export type I18nTranslationApiStatus =
  | "draft_generated"
  | "error"
  | "fallback"
  | "loading";

export interface I18nTranslationApiDiagnostic {
  code:
    | "API_BASE_URL_INVALID"
    | "API_BASE_URL_MISSING"
    | "API_REQUEST_FAILED"
    | "API_REQUEST_TIMEOUT"
    | "API_RESPONSE_INVALID"
    | "API_TRANSLATION_FAILED";
  message: LocalizedText;
  safeDetails?: Record<string, boolean | number | string>;
  severity: "error" | "info" | "warning";
}

export interface I18nTranslationApiConfig {
  baseUrl?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  tracePrefix?: string;
}

export interface I18nTranslationDraftRequest {
  campaignId: string;
  contentKeys: string[];
  sourceLocale?: SupportedLocale;
  targetLocale: Exclude<SupportedLocale, "en-US">;
}

export interface I18nTranslationApiPersistenceMetadata {
  kind?: string;
  recordId?: string;
}

export interface I18nTranslationApiDraftResult {
  aiDraft?: boolean;
  draft: Record<string, string>;
  fallbackToEnglish?: boolean;
  humanReviewRequired: boolean;
  noAutoPublishNotice?: LocalizedText;
}

export interface I18nTranslationApiBridgeState {
  actions?: I18nReviewAction[];
  boundary: LocalizedText;
  campaignId?: string;
  configured: boolean;
  contentKeys: string[];
  diagnostics: readonly I18nTranslationApiDiagnostic[];
  draft?: I18nTranslationApiDraftResult;
  loading: boolean;
  persistence?: I18nTranslationApiPersistenceMetadata;
  source: I18nTranslationApiSource;
  sourceLocale: SupportedLocale;
  status: I18nTranslationApiStatus;
  targetLocale: Exclude<SupportedLocale, "en-US">;
  traceId?: string;
  translationManager?: TranslationManagerReadModel;
}

export type I18nTranslationApiFetch = typeof fetch;

interface SubmitI18nTranslationApiDraftInput {
  config?: I18nTranslationApiConfig;
  fetchImpl?: I18nTranslationApiFetch;
  request: I18nTranslationDraftRequest;
}

interface NormalizedConfig {
  baseUrl?: URL;
  diagnostic?: I18nTranslationApiDiagnostic;
  headers: Record<string, string>;
  normalizedTracePrefix: string;
  timeoutMs: number;
}

interface ApiRuntimeEnvelope {
  data?: unknown;
  error?: unknown;
  ok: boolean;
  traceId?: unknown;
}

interface FetchJsonResult {
  body?: unknown;
  diagnostic?: I18nTranslationApiDiagnostic;
  ok: boolean;
  status?: number;
  traceId?: string;
}

type I18nEndpointPath = `/api/campaigns/${string}/i18n/generate`;

const defaultTimeoutMs = 2_000;
const minTimeoutMs = 250;
const maxTimeoutMs = 8_000;

export const i18nTranslationApiBoundary: LocalizedText = {
  "en-US":
    "Local i18n draft review only. No live AI provider, LLM gateway, production persistence, auto-publish, contract write, export file, storage write, reward custody, or reward distribution is executed.",
  "zh-CN":
    "仅用于本地 i18n 草稿评审。不会执行实时 AI provider、LLM gateway、生产持久化、自动发布、合约写入、导出文件、storage 写入、奖励托管或发奖。",
  "zh-TW":
    "僅用於本地 i18n 草稿評審。不會執行即時 AI provider、LLM gateway、生產持久化、自動發布、合約寫入、匯出檔案、storage 寫入、獎勵託管或發獎。",
};

const diagnosticMessages: Record<I18nTranslationApiDiagnostic["code"], LocalizedText> = {
  API_BASE_URL_INVALID: {
    "en-US": "The local i18n API base URL is invalid, so the seeded translation manager remains visible.",
    "zh-CN": "本地 i18n API base URL 无效，因此继续显示 seeded 翻译管理。",
    "zh-TW": "本地 i18n API base URL 無效，因此繼續顯示 seeded 翻譯管理。",
  },
  API_BASE_URL_MISSING: {
    "en-US": "No local i18n API base URL is configured, so the seeded translation manager remains visible.",
    "zh-CN": "未配置本地 i18n API base URL，因此继续显示 seeded 翻译管理。",
    "zh-TW": "未設定本地 i18n API base URL，因此繼續顯示 seeded 翻譯管理。",
  },
  API_REQUEST_FAILED: {
    "en-US": "The local i18n API request failed, so the seeded translation manager remains visible.",
    "zh-CN": "本地 i18n API 请求失败，因此继续显示 seeded 翻译管理。",
    "zh-TW": "本地 i18n API 請求失敗，因此繼續顯示 seeded 翻譯管理。",
  },
  API_REQUEST_TIMEOUT: {
    "en-US": "The local i18n API request timed out, so the seeded translation manager remains visible.",
    "zh-CN": "本地 i18n API 请求超时，因此继续显示 seeded 翻译管理。",
    "zh-TW": "本地 i18n API 請求逾時，因此繼續顯示 seeded 翻譯管理。",
  },
  API_RESPONSE_INVALID: {
    "en-US": "The local i18n API response shape was not recognized, so the seeded translation manager remains visible.",
    "zh-CN": "本地 i18n API 响应结构无法识别，因此继续显示 seeded 翻译管理。",
    "zh-TW": "本地 i18n API 回應結構無法識別，因此繼續顯示 seeded 翻譯管理。",
  },
  API_TRANSLATION_FAILED: {
    "en-US": "The local i18n generation route did not return a usable draft.",
    "zh-CN": "本地 i18n 生成 route 未返回可用草稿。",
    "zh-TW": "本地 i18n 生成 route 未回傳可用草稿。",
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

export const sanitizeI18nTranslationApiText = (value: unknown): string => {
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

  return sanitizeI18nTranslationApiText(value);
};

const diagnostic = (
  code: I18nTranslationApiDiagnostic["code"],
  severity: I18nTranslationApiDiagnostic["severity"],
  safeDetails?: Record<string, unknown>,
): I18nTranslationApiDiagnostic => {
  const normalizedDetails = safeDetails
    ? Object.fromEntries(
      Object.entries(safeDetails).map(([key, value]) => [
        sanitizeI18nTranslationApiText(key),
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
  const sanitized = sanitizeI18nTranslationApiText(tracePrefix ?? "i18n-translation-review")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized || "i18n-translation-review";
};

const normalizeHeaders = (headers: Record<string, string> | undefined) =>
  Object.fromEntries(
    Object.entries(headers ?? {})
      .filter(([key, value]) => key.trim() && value.trim())
      .map(([key, value]) => [
        sanitizeI18nTranslationApiText(key).toLowerCase(),
        sanitizeI18nTranslationApiText(value),
      ]),
  );

const normalizeConfig = (config: I18nTranslationApiConfig | undefined): NormalizedConfig => {
  const timeoutMs = clampTimeout(config?.timeoutMs);
  const normalizedTracePrefix = normalizeTracePrefix(config?.tracePrefix);
  const headers = normalizeHeaders(config?.headers);
  const rawBaseUrl = config?.baseUrl?.trim();

  if (!rawBaseUrl) {
    return {
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
        diagnostic: diagnostic("API_BASE_URL_INVALID", "warning", {
          reason: "unsupported_protocol",
          url: rawBaseUrl,
        }),
        headers,
        normalizedTracePrefix,
        timeoutMs,
      };
    }

    return {
      baseUrl,
      headers,
      normalizedTracePrefix,
      timeoutMs,
    };
  } catch {
    return {
      diagnostic: diagnostic("API_BASE_URL_INVALID", "warning", {
        reason: "malformed_url",
        url: rawBaseUrl,
      }),
      headers,
      normalizedTracePrefix,
      timeoutMs,
    };
  }
};

const createTraceId = (prefix: string) => `${prefix}-${Date.now().toString(36)}`;

const endpointForRequest = (campaignId: string): I18nEndpointPath =>
  `/api/campaigns/${encodeURIComponent(campaignId)}/i18n/generate`;

const endpointUrl = (baseUrl: URL, endpoint: I18nEndpointPath) => {
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

const isApiEnvelope = (value: unknown): value is ApiRuntimeEnvelope =>
  isRecord(value) && typeof value.ok === "boolean";

const extractTraceId = (value: unknown): string | undefined =>
  isRecord(value) && typeof value.traceId === "string" && value.traceId.trim()
    ? sanitizeI18nTranslationApiText(value.traceId)
    : undefined;

const safeFetchJson = async (
  fetchImpl: I18nTranslationApiFetch,
  url: string,
  endpoint: I18nEndpointPath,
  traceId: string,
  timeoutMs: number,
  headers: Record<string, string>,
  body: unknown,
): Promise<FetchJsonResult> => {
  const timeout = withTimeoutSignal(timeoutMs);

  try {
    const response = await fetchImpl(url, {
      body: JSON.stringify(body),
      headers: {
        accept: "application/json",
        ...headers,
        "content-type": "application/json",
        "x-campaign-os-trace-id": traceId,
      },
      method: "POST",
      signal: timeout.signal,
    });
    const responseBody = await response.json() as unknown;
    const responseTraceId = response.headers.get("x-campaign-os-trace-id") ?? extractTraceId(responseBody) ?? traceId;

    if (!response.ok) {
      return {
        body: responseBody,
        diagnostic: diagnostic("API_TRANSLATION_FAILED", "error", {
          endpoint,
          status: response.status,
        }),
        ok: false,
        status: response.status,
        traceId: responseTraceId,
      };
    }

    return {
      body: responseBody,
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
          reason: sanitizeI18nTranslationApiText(error),
        },
      ),
      ok: false,
      traceId,
    };
  } finally {
    timeout.clear();
  }
};

const localizedTextFromValue = (value: unknown): LocalizedText | undefined => {
  if (
    isRecord(value)
    && typeof value["en-US"] === "string"
    && typeof value["zh-CN"] === "string"
  ) {
    return {
      "en-US": sanitizeI18nTranslationApiText(value["en-US"]),
      "zh-CN": sanitizeI18nTranslationApiText(value["zh-CN"]),
      ...(typeof value["zh-TW"] === "string"
        ? { "zh-TW": sanitizeI18nTranslationApiText(value["zh-TW"]) }
        : {}),
    };
  }

  return undefined;
};

const optionalStringField = (
  value: Record<string, unknown>,
  key: string,
): string | undefined => {
  const raw = value[key];

  return typeof raw === "string" && raw.trim() ? sanitizeI18nTranslationApiText(raw) : undefined;
};

const optionalBooleanField = (
  value: Record<string, unknown>,
  key: string,
): boolean | undefined => {
  const raw = value[key];

  return typeof raw === "boolean" ? raw : undefined;
};

const stringArrayFromValue = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const values = value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map(sanitizeI18nTranslationApiText);

  return values.length > 0 ? values : undefined;
};

const draftFromValue = (value: unknown): Record<string, string> | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const draft = Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string")
      .map(([key, item]) => [
        sanitizeI18nTranslationApiText(key),
        sanitizeI18nTranslationApiText(item),
      ]),
  );

  return Object.keys(draft).length > 0 ? draft : undefined;
};

const persistenceMetadataFromValue = (value: unknown): I18nTranslationApiPersistenceMetadata | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const metadata: I18nTranslationApiPersistenceMetadata = {
    ...(optionalStringField(value, "kind") ? { kind: optionalStringField(value, "kind") } : {}),
    ...(optionalStringField(value, "recordId") ? { recordId: optionalStringField(value, "recordId") } : {}),
  };

  return Object.keys(metadata).length > 0 ? metadata : undefined;
};

const getDataRecord = (body: unknown): Record<string, unknown> | undefined => {
  if (!isApiEnvelope(body) || !isRecord(body.data)) {
    return undefined;
  }

  return body.data;
};

const getPayloadRecord = (body: unknown): Record<string, unknown> | undefined => {
  const data = getDataRecord(body);

  if (!data) {
    return undefined;
  }

  if (isRecord(data.payload)) {
    return data.payload;
  }

  return data;
};

const normalizeDraftPayload = (
  body: unknown,
  request: I18nTranslationDraftRequest,
): Omit<I18nTranslationApiBridgeState, "boundary" | "configured" | "diagnostics" | "loading" | "source" | "status" | "traceId"> | undefined => {
  const data = getDataRecord(body);
  const payload = getPayloadRecord(body);

  if (!payload) {
    return undefined;
  }

  const draft = draftFromValue(payload.draft);
  const contentKeys = stringArrayFromValue(payload.contentKeys) ?? [...request.contentKeys];
  const sourceLocale = optionalStringField(payload, "sourceLocale") as SupportedLocale | undefined;
  const targetLocale = optionalStringField(payload, "targetLocale") as Exclude<SupportedLocale, "en-US"> | undefined;
  const campaignId = optionalStringField(payload, "campaignId") ?? request.campaignId;
  const noAutoPublishNotice = localizedTextFromValue(payload.noAutoPublishNotice);
  const humanReviewRequired = optionalBooleanField(payload, "humanReviewRequired");

  if (!campaignId || !sourceLocale || !targetLocale || !contentKeys.length) {
    return undefined;
  }

  if (!draft && !isRecord(payload.translationManager)) {
    return undefined;
  }

  return {
    ...(Array.isArray(payload.actions) ? { actions: payload.actions as I18nReviewAction[] } : {}),
    campaignId,
    contentKeys,
    ...(draft || humanReviewRequired !== undefined || noAutoPublishNotice
      ? {
        draft: {
          ...(optionalBooleanField(payload, "aiDraft") !== undefined
            ? { aiDraft: optionalBooleanField(payload, "aiDraft") }
            : {}),
          draft: draft ?? {},
          ...(optionalBooleanField(payload, "fallbackToEnglish") !== undefined
            ? { fallbackToEnglish: optionalBooleanField(payload, "fallbackToEnglish") }
            : {}),
          humanReviewRequired: humanReviewRequired ?? true,
          ...(noAutoPublishNotice ? { noAutoPublishNotice } : {}),
        },
      }
      : {}),
    ...(data && persistenceMetadataFromValue(data.persistence)
      ? { persistence: persistenceMetadataFromValue(data.persistence) }
      : {}),
    sourceLocale,
    targetLocale,
    ...(isRecord(payload.translationManager)
      ? { translationManager: payload.translationManager as unknown as TranslationManagerReadModel }
      : {}),
  };
};

const fallbackState = ({
  configured,
  diagnostics,
  request,
  source,
  status,
  traceId,
}: {
  configured: boolean;
  diagnostics: readonly I18nTranslationApiDiagnostic[];
  request: I18nTranslationDraftRequest;
  source: Extract<I18nTranslationApiSource, "error_fallback" | "seeded_fallback">;
  status: Extract<I18nTranslationApiStatus, "error" | "fallback">;
  traceId?: string;
}): I18nTranslationApiBridgeState => ({
  boundary: i18nTranslationApiBoundary,
  configured,
  contentKeys: [...request.contentKeys],
  diagnostics,
  loading: false,
  source,
  sourceLocale: request.sourceLocale ?? "en-US",
  status,
  targetLocale: request.targetLocale,
  ...(traceId ? { traceId } : {}),
});

export const createI18nTranslationApiLoadingState = (
  request: I18nTranslationDraftRequest,
): I18nTranslationApiBridgeState => ({
  boundary: i18nTranslationApiBoundary,
  campaignId: request.campaignId,
  configured: true,
  contentKeys: [...request.contentKeys],
  diagnostics: [],
  loading: true,
  source: "loading",
  sourceLocale: request.sourceLocale ?? "en-US",
  status: "loading",
  targetLocale: request.targetLocale,
});

export const createI18nTranslationSeededFallbackState = (
  request: I18nTranslationDraftRequest,
): I18nTranslationApiBridgeState =>
  fallbackState({
    configured: false,
    diagnostics: [diagnostic("API_BASE_URL_MISSING", "info")],
    request,
    source: "seeded_fallback",
    status: "fallback",
  });

export const submitI18nTranslationApiDraft = async ({
  config,
  fetchImpl = fetch,
  request,
}: SubmitI18nTranslationApiDraftInput): Promise<I18nTranslationApiBridgeState> => {
  const normalizedConfig = normalizeConfig(config);

  if (!normalizedConfig.baseUrl) {
    return fallbackState({
      configured: Boolean(config?.baseUrl?.trim()),
      diagnostics: normalizedConfig.diagnostic ? [normalizedConfig.diagnostic] : [],
      request,
      source: "seeded_fallback",
      status: "fallback",
    });
  }

  const endpoint = endpointForRequest(request.campaignId);
  const response = await safeFetchJson(
    fetchImpl,
    endpointUrl(normalizedConfig.baseUrl, endpoint),
    endpoint,
    createTraceId(normalizedConfig.normalizedTracePrefix),
    normalizedConfig.timeoutMs,
    normalizedConfig.headers,
    {
      contentKeys: request.contentKeys,
      sourceLocale: request.sourceLocale ?? "en-US",
      targetLocale: request.targetLocale,
    },
  );
  const responseTraceId = response.traceId ?? extractTraceId(response.body);

  if (!response.ok || !isApiEnvelope(response.body) || !response.body.ok) {
    return fallbackState({
      configured: true,
      diagnostics: [response.diagnostic ?? diagnostic("API_TRANSLATION_FAILED", "error", { endpoint })],
      request,
      source: "error_fallback",
      status: "error",
      traceId: responseTraceId,
    });
  }

  const payload = normalizeDraftPayload(response.body, request);

  if (!payload) {
    return fallbackState({
      configured: true,
      diagnostics: [diagnostic("API_RESPONSE_INVALID", "error", { endpoint })],
      request,
      source: "error_fallback",
      status: "error",
      traceId: responseTraceId,
    });
  }

  return {
    ...payload,
    boundary: i18nTranslationApiBoundary,
    configured: true,
    diagnostics: [],
    loading: false,
    source: "api_runtime",
    status: "draft_generated",
    ...(responseTraceId ? { traceId: responseTraceId } : {}),
  };
};
