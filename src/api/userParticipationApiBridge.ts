import type {
  AccountType,
  EligibilityStatus,
  LocalizedText,
  TaskVerificationStatus,
  WalletSource,
} from "../domain/types";

export type UserParticipationApiSource =
  | "api_runtime"
  | "error_fallback"
  | "loading"
  | "seeded_fallback";

export type UserParticipationApiStatus =
  | "eligibility_checked"
  | "error"
  | "fallback"
  | "loading"
  | "partial"
  | "verified";

export interface UserParticipationApiDiagnostic {
  code:
    | "API_BASE_URL_INVALID"
    | "API_BASE_URL_MISSING"
    | "API_ELIGIBILITY_FAILED"
    | "API_REQUEST_FAILED"
    | "API_REQUEST_TIMEOUT"
    | "API_RESPONSE_INVALID"
    | "API_VERIFY_FAILED";
  message: LocalizedText;
  safeDetails?: Record<string, boolean | number | string>;
  severity: "error" | "info" | "warning";
}

export interface UserParticipationApiConfig {
  baseUrl?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  tracePrefix?: string;
}

export interface UserParticipationReviewRequest {
  accountType: AccountType;
  campaignId: string;
  taskId: string;
  walletAddress: string;
  walletSource: WalletSource;
}

export interface UserParticipationVerificationResult {
  accountType: AccountType | string;
  campaignId: string;
  evidenceHash?: string;
  evidenceSource?: string;
  nextAction?: LocalizedText;
  pointsAwarded: number;
  pointsAvailable?: number;
  riskFlags: readonly string[];
  status: Exclude<TaskVerificationStatus, "ready"> | string;
  taskId: string;
  walletAddress: string;
  walletSource: WalletSource | string;
}

export interface UserParticipationEligibilityResult {
  accountType?: AccountType | string;
  campaignId: string;
  eligible: boolean;
  localePreference?: string;
  missingTasks: readonly string[];
  nextAction?: LocalizedText;
  riskFlags: readonly string[];
  score: number;
  status: EligibilityStatus | string;
  walletAddress: string;
  walletSource?: WalletSource | string;
  walletTypeVerified: boolean;
}

export interface UserParticipationApiPersistenceMetadata {
  kind?: string;
  recordId?: string;
}

export interface UserParticipationApiRepositoryMetadata {
  adapterId?: string;
  createdViaRepository?: boolean;
  repositoryId?: string;
  storeId?: string;
}

export interface UserParticipationApiBridgeState {
  boundary: LocalizedText;
  configured: boolean;
  diagnostics: readonly UserParticipationApiDiagnostic[];
  eligibility?: UserParticipationEligibilityResult;
  loading: boolean;
  persistence?: UserParticipationApiPersistenceMetadata;
  repository?: UserParticipationApiRepositoryMetadata;
  request: UserParticipationReviewRequest;
  source: UserParticipationApiSource;
  status: UserParticipationApiStatus;
  traceId?: string;
  verification?: UserParticipationVerificationResult;
}

export type UserParticipationApiFetch = typeof fetch;

interface SubmitUserParticipationApiReviewInput {
  config?: UserParticipationApiConfig;
  fetchImpl?: UserParticipationApiFetch;
  request: UserParticipationReviewRequest;
}

interface NormalizedConfig {
  baseUrl?: URL;
  configured: boolean;
  diagnostic?: UserParticipationApiDiagnostic;
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
  diagnostic?: UserParticipationApiDiagnostic;
  ok: boolean;
  status?: number;
  traceId?: string;
}

const defaultTimeoutMs = 2_000;
const minTimeoutMs = 250;
const maxTimeoutMs = 8_000;

export const userParticipationApiBoundary: LocalizedText = {
  "en-US":
    "Local user participation API review only. No live provider or indexer call, wallet signature, contract write, export file, storage write, reward custody, or reward distribution is executed.",
  "zh-CN":
    "仅用于本地用户参与 API 评审。不会执行实时 provider 或 indexer 调用、钱包签名、合约写入、导出文件、storage 写入、奖励托管或发奖。",
  "zh-TW":
    "僅用於本地使用者參與 API 評審。不會執行即時 provider 或 indexer 呼叫、錢包簽名、合約寫入、匯出檔案、storage 寫入、獎勵託管或發獎。",
};

const diagnosticMessages: Record<UserParticipationApiDiagnostic["code"], LocalizedText> = {
  API_BASE_URL_INVALID: {
    "en-US": "The local participation API base URL is invalid, so the seeded User App remains visible.",
    "zh-CN": "本地参与 API base URL 无效，因此继续显示 seeded User App。",
    "zh-TW": "本地參與 API base URL 無效，因此繼續顯示 seeded User App。",
  },
  API_BASE_URL_MISSING: {
    "en-US": "No local participation API base URL is configured, so the seeded User App remains visible.",
    "zh-CN": "未配置本地参与 API base URL，因此继续显示 seeded User App。",
    "zh-TW": "未設定本地參與 API base URL，因此繼續顯示 seeded User App。",
  },
  API_ELIGIBILITY_FAILED: {
    "en-US": "Task verification completed, but the local eligibility refresh did not return a usable result.",
    "zh-CN": "任务验证已完成，但本地资格刷新未返回可用结果。",
    "zh-TW": "任務驗證已完成，但本地資格刷新未回傳可用結果。",
  },
  API_REQUEST_FAILED: {
    "en-US": "The local participation API request failed, so the seeded User App remains visible.",
    "zh-CN": "本地参与 API 请求失败，因此继续显示 seeded User App。",
    "zh-TW": "本地參與 API 請求失敗，因此繼續顯示 seeded User App。",
  },
  API_REQUEST_TIMEOUT: {
    "en-US": "The local participation API request timed out, so the seeded User App remains visible.",
    "zh-CN": "本地参与 API 请求超时，因此继续显示 seeded User App。",
    "zh-TW": "本地參與 API 請求逾時，因此繼續顯示 seeded User App。",
  },
  API_RESPONSE_INVALID: {
    "en-US": "The local participation API response shape was not recognized.",
    "zh-CN": "本地参与 API 响应结构无法识别。",
    "zh-TW": "本地參與 API 回應結構無法識別。",
  },
  API_VERIFY_FAILED: {
    "en-US": "The local task verification route did not return a usable result.",
    "zh-CN": "本地任务验证 route 未返回可用结果。",
    "zh-TW": "本地任務驗證 route 未回傳可用結果。",
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
  [/\bstack\s*trace\b/gi, "redacted stack"],
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const sanitizeUserParticipationApiText = (value: unknown): string => {
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

  return sanitizeUserParticipationApiText(value);
};

const diagnostic = (
  code: UserParticipationApiDiagnostic["code"],
  severity: UserParticipationApiDiagnostic["severity"],
  safeDetails?: Record<string, unknown>,
): UserParticipationApiDiagnostic => {
  const normalizedDetails = safeDetails
    ? Object.fromEntries(
      Object.entries(safeDetails).map(([key, value]) => [
        sanitizeUserParticipationApiText(key),
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
  const sanitized = sanitizeUserParticipationApiText(tracePrefix ?? "user-participation-review")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized || "user-participation-review";
};

const normalizeHeaders = (headers: Record<string, string> | undefined) =>
  Object.fromEntries(
    Object.entries(headers ?? {})
      .filter(([key, value]) => key.trim() && value.trim())
      .map(([key, value]) => [
        sanitizeUserParticipationApiText(key).toLowerCase(),
        sanitizeUserParticipationApiText(value),
      ]),
  );

const normalizeConfig = (config: UserParticipationApiConfig | undefined): NormalizedConfig => {
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

const traceId = (prefix: string) => `${prefix}-${Date.now().toString(36)}`;

const endpointUrl = (baseUrl: URL, path: string) => {
  const normalizedBase = new URL(baseUrl.toString());
  normalizedBase.pathname = `${normalizedBase.pathname.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
  normalizedBase.search = "";
  normalizedBase.hash = "";

  return normalizedBase.toString();
};

const queryEndpointUrl = (baseUrl: URL, path: string, query: Record<string, string>) => {
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

  return typeof body.traceId === "string" ? sanitizeUserParticipationApiText(body.traceId) : undefined;
};

const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === "AbortError";

const safeFetchJson = async (
  fetchImpl: UserParticipationApiFetch,
  url: string,
  endpoint: string,
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
    const body = await response.json().catch((error: unknown) => ({ jsonError: sanitizeUserParticipationApiText(error) }));
    const headerTraceId = response.headers.get("x-campaign-os-trace-id") ?? undefined;
    const responseTraceId = sanitizeUserParticipationApiText(headerTraceId ?? extractTraceId(body) ?? "");
    const failedEnvelope = isRecord(body) && body.ok === false;

    if (!response.ok || failedEnvelope) {
      return {
        body,
        diagnostic: diagnostic(endpoint.includes("/eligibility") ? "API_ELIGIBILITY_FAILED" : "API_VERIFY_FAILED", "error", {
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

const fallbackState = (
  request: UserParticipationReviewRequest,
  normalizedConfig: NormalizedConfig,
  source: Extract<UserParticipationApiSource, "error_fallback" | "seeded_fallback">,
  status: Extract<UserParticipationApiStatus, "error" | "fallback">,
  diagnostics: readonly UserParticipationApiDiagnostic[],
  traceIdValue?: string,
): UserParticipationApiBridgeState => ({
  boundary: userParticipationApiBoundary,
  configured: normalizedConfig.configured,
  diagnostics,
  loading: false,
  request,
  source,
  status,
  ...(traceIdValue ? { traceId: traceIdValue } : {}),
});

export const createUserParticipationApiLoadingState = (
  request: UserParticipationReviewRequest,
): UserParticipationApiBridgeState => ({
  boundary: userParticipationApiBoundary,
  configured: true,
  diagnostics: [],
  loading: true,
  request,
  source: "loading",
  status: "loading",
});

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
  typeof value === "string" ? sanitizeUserParticipationApiText(value) : undefined;

const textArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map(sanitizeUserParticipationApiText)
    : [];

const numberValue = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

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

const normalizeVerification = (payload: unknown): UserParticipationVerificationResult | undefined => {
  if (!isRecord(payload)) {
    return undefined;
  }

  const campaignId = optionalText(payload.campaignId);
  const taskId = optionalText(payload.taskId);
  const walletAddress = optionalText(payload.walletAddress);
  const accountType = optionalText(payload.accountType);
  const walletSource = optionalText(payload.walletSource);
  const status = optionalText(payload.status);
  const pointsAwarded = numberValue(payload.pointsAwarded);

  if (!campaignId || !taskId || !walletAddress || !accountType || !walletSource || !status || pointsAwarded === undefined) {
    return undefined;
  }

  return {
    accountType,
    campaignId,
    ...(optionalText(payload.evidenceHash) ? { evidenceHash: optionalText(payload.evidenceHash) } : {}),
    ...(optionalText(payload.evidenceSource) ? { evidenceSource: optionalText(payload.evidenceSource) } : {}),
    ...(localizedText(payload.nextAction) ? { nextAction: localizedText(payload.nextAction) } : {}),
    pointsAwarded,
    ...(numberValue(payload.pointsAvailable) !== undefined ? { pointsAvailable: numberValue(payload.pointsAvailable) } : {}),
    riskFlags: textArray(payload.riskFlags),
    status,
    taskId,
    walletAddress,
    walletSource,
  };
};

const normalizeEligibility = (payload: unknown): UserParticipationEligibilityResult | undefined => {
  if (!isRecord(payload)) {
    return undefined;
  }

  const campaignId = optionalText(payload.campaignId);
  const walletAddress = optionalText(payload.walletAddress);
  const status = optionalText(payload.status);
  const score = numberValue(payload.score);

  if (
    !campaignId ||
    !walletAddress ||
    typeof payload.eligible !== "boolean" ||
    typeof payload.walletTypeVerified !== "boolean" ||
    !status ||
    score === undefined
  ) {
    return undefined;
  }

  return {
    ...(optionalText(payload.accountType) ? { accountType: optionalText(payload.accountType) } : {}),
    campaignId,
    eligible: payload.eligible,
    ...(optionalText(payload.localePreference) ? { localePreference: optionalText(payload.localePreference) } : {}),
    missingTasks: textArray(payload.missingTasks),
    ...(localizedText(payload.nextAction) ? { nextAction: localizedText(payload.nextAction) } : {}),
    riskFlags: textArray(payload.riskFlags),
    score,
    status,
    walletAddress,
    ...(optionalText(payload.walletSource) ? { walletSource: optionalText(payload.walletSource) } : {}),
    walletTypeVerified: payload.walletTypeVerified,
  };
};

const normalizePersistence = (payload: unknown): UserParticipationApiPersistenceMetadata | undefined => {
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

const normalizeRepository = (payload: unknown): UserParticipationApiRepositoryMetadata | undefined => {
  if (!isRecord(payload)) {
    return undefined;
  }

  const adapterId = optionalText(payload.adapterId);
  const repositoryId = optionalText(payload.repositoryId);
  const storeId = optionalText(payload.storeId);
  const createdViaRepository = typeof payload.createdViaRepository === "boolean" ? payload.createdViaRepository : undefined;

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

export const submitUserParticipationApiReview = async ({
  config,
  fetchImpl = fetch,
  request,
}: SubmitUserParticipationApiReviewInput): Promise<UserParticipationApiBridgeState> => {
  const normalizedConfig = normalizeConfig(config);

  if (!normalizedConfig.baseUrl) {
    return fallbackState(
      request,
      normalizedConfig,
      "seeded_fallback",
      "fallback",
      [normalizedConfig.diagnostic ?? diagnostic("API_BASE_URL_MISSING", "info")],
    );
  }

  const verifyTraceId = traceId(normalizedConfig.normalizedTracePrefix);
  const verifyEndpoint = `/api/tasks/${encodeURIComponent(request.taskId)}/verify`;
  const verify = await safeFetchJson(
    fetchImpl,
    endpointUrl(normalizedConfig.baseUrl, verifyEndpoint),
    verifyEndpoint,
    {
      body: JSON.stringify({
        accountType: request.accountType,
        campaignId: request.campaignId,
        walletAddress: request.walletAddress,
        walletSource: request.walletSource,
      }),
      headers: requestHeaders(normalizedConfig, true, verifyTraceId),
      method: "POST",
    },
    normalizedConfig.timeoutMs,
  );

  if (!verify.ok) {
    return fallbackState(
      request,
      normalizedConfig,
      "error_fallback",
      "error",
      [verify.diagnostic ?? diagnostic("API_VERIFY_FAILED", "error", { endpoint: verifyEndpoint, status: verify.status })],
      verify.traceId,
    );
  }

  const verification = normalizeVerification(dataPayload(verify.body));

  if (!verification) {
    return fallbackState(
      request,
      normalizedConfig,
      "error_fallback",
      "error",
      [diagnostic("API_RESPONSE_INVALID", "error", { endpoint: verifyEndpoint })],
      verify.traceId,
    );
  }

  const eligibilityTraceId = traceId(normalizedConfig.normalizedTracePrefix);
  const eligibilityEndpoint = `/api/campaigns/${encodeURIComponent(request.campaignId)}/eligibility`;
  const eligibilityUrl = queryEndpointUrl(normalizedConfig.baseUrl, eligibilityEndpoint, {
    address: request.walletAddress,
    accountType: request.accountType,
    walletSource: request.walletSource,
  });
  const eligibility = await safeFetchJson(
    fetchImpl,
    eligibilityUrl,
    eligibilityEndpoint,
    {
      headers: requestHeaders(normalizedConfig, false, eligibilityTraceId),
      method: "GET",
    },
    normalizedConfig.timeoutMs,
  );

  const persistence = normalizePersistence(metadataPayload(verify.body, "persistence"));
  const repository = normalizeRepository(metadataPayload(eligibility.body, "campaignDb"));

  if (!eligibility.ok) {
    return {
      boundary: userParticipationApiBoundary,
      configured: true,
      diagnostics: [
        eligibility.diagnostic ??
        diagnostic("API_ELIGIBILITY_FAILED", "error", { endpoint: eligibilityEndpoint, status: eligibility.status }),
      ],
      loading: false,
      ...(persistence ? { persistence } : {}),
      request,
      source: "api_runtime",
      status: "partial",
      traceId: eligibility.traceId ?? verify.traceId,
      verification,
    };
  }

  const normalizedEligibility = normalizeEligibility(dataPayload(eligibility.body));

  if (!normalizedEligibility) {
    return {
      boundary: userParticipationApiBoundary,
      configured: true,
      diagnostics: [diagnostic("API_RESPONSE_INVALID", "error", { endpoint: eligibilityEndpoint })],
      loading: false,
      ...(persistence ? { persistence } : {}),
      request,
      source: "api_runtime",
      status: "partial",
      traceId: eligibility.traceId ?? verify.traceId,
      verification,
    };
  }

  return {
    boundary: userParticipationApiBoundary,
    configured: true,
    diagnostics: [],
    eligibility: normalizedEligibility,
    loading: false,
    ...(persistence ? { persistence } : {}),
    ...(repository ? { repository } : {}),
    request,
    source: "api_runtime",
    status: "eligibility_checked",
    traceId: eligibility.traceId ?? verify.traceId,
    verification,
  };
};
