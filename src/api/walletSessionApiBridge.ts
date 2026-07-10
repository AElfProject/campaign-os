import { walletSessions } from "../domain/fixtures";
import type {
  AccountType,
  LocalizedText,
  NormalizedWalletSession,
  WalletCapability,
  WalletNetwork,
  WalletSignatureStatus,
  WalletSource,
  WalletVerificationStatus,
} from "../domain/types";

export type WalletSessionApiSource =
  | "api_runtime"
  | "error_fallback"
  | "loading"
  | "seeded_fallback";

export type WalletSessionApiStatus =
  | "connected"
  | "error"
  | "fallback"
  | "loading";

export interface WalletSessionApiDiagnostic {
  code:
    | "API_BASE_URL_INVALID"
    | "API_BASE_URL_MISSING"
    | "API_REQUEST_FAILED"
    | "API_REQUEST_TIMEOUT"
    | "API_RESPONSE_INVALID"
    | "API_WALLET_SESSION_FAILED";
  message: LocalizedText;
  safeDetails?: Record<string, boolean | number | string>;
  severity: "error" | "info" | "warning";
}

export interface WalletSessionApiConfig {
  baseUrl?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  tracePrefix?: string;
}

export interface WalletSessionPreviewRequest {
  adapterName?: string;
  address?: string;
  chainId?: string;
  fixtureId?: string;
  network?: string;
  nonce?: string;
  proofEvaluatedAt?: string;
  proofIssuedAt?: string;
  signature?: string;
}

export interface WalletSessionRepositoryMetadata {
  adapterId?: string;
  created?: boolean;
  recordId?: string;
  repositoryId?: string;
  sessionId?: string;
  storeId?: string;
  upserted?: boolean;
  walletAddress?: string;
}

export interface WalletSessionApiBridgeState {
  boundary: LocalizedText;
  configured: boolean;
  diagnostics: readonly WalletSessionApiDiagnostic[];
  loading: boolean;
  repository?: WalletSessionRepositoryMetadata;
  request: WalletSessionPreviewRequest;
  session?: NormalizedWalletSession;
  source: WalletSessionApiSource;
  status: WalletSessionApiStatus;
  traceId?: string;
}

export type WalletSessionApiFetch = typeof fetch;

interface SubmitWalletSessionApiPreviewInput {
  config?: WalletSessionApiConfig;
  fetchImpl?: WalletSessionApiFetch;
  request?: WalletSessionPreviewRequest;
}

interface NormalizedConfig {
  baseUrl?: URL;
  configured: boolean;
  diagnostic?: WalletSessionApiDiagnostic;
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
  diagnostic?: WalletSessionApiDiagnostic;
  ok: boolean;
  status?: number;
  traceId?: string;
}

const defaultTimeoutMs = 2_000;
const minTimeoutMs = 250;
const maxTimeoutMs = 8_000;
const defaultTracePrefix = "wallet-session";
const walletSessionEndpoint = "/api/wallet/session";

export const defaultWalletSessionPreviewRequest: WalletSessionPreviewRequest = {
  adapterName: "PortkeyDiscoverWallet",
  fixtureId: "sess-eoa-app-001",
};

export const walletSessionApiBoundary: LocalizedText = {
  "en-US":
    "Local wallet session API bridge only. No live wallet SDK connection, real signature prompt, transaction, contract read/write, production auth token, reward custody, or reward distribution is executed.",
  "zh-CN":
    "仅用于本地 wallet session API bridge。不会执行实时钱包 SDK 连接、真实签名提示、交易、合约读写、生产 auth token、奖励托管或发奖。",
  "zh-TW":
    "僅用於本地 wallet session API bridge。不會執行即時錢包 SDK 連接、真實簽名提示、交易、合約讀寫、生產 auth token、獎勵託管或發獎。",
};

const diagnosticMessages: Record<WalletSessionApiDiagnostic["code"], LocalizedText> = {
  API_BASE_URL_INVALID: {
    "en-US": "The local wallet session API base URL is invalid, so seeded wallet preview remains visible.",
    "zh-CN": "本地 wallet session API base URL 无效，因此继续显示 seeded 钱包预览。",
    "zh-TW": "本地 wallet session API base URL 無效，因此繼續顯示 seeded 錢包預覽。",
  },
  API_BASE_URL_MISSING: {
    "en-US": "No local wallet session API base URL is configured, so seeded wallet preview is used.",
    "zh-CN": "未配置本地 wallet session API base URL，因此使用 seeded 钱包预览。",
    "zh-TW": "未設定本地 wallet session API base URL，因此使用 seeded 錢包預覽。",
  },
  API_REQUEST_FAILED: {
    "en-US": "The local wallet session API request failed, so no API-backed wallet session was applied.",
    "zh-CN": "本地 wallet session API 请求失败，因此未应用 API-backed 钱包会话。",
    "zh-TW": "本地 wallet session API 請求失敗，因此未套用 API-backed 錢包會話。",
  },
  API_REQUEST_TIMEOUT: {
    "en-US": "The local wallet session API request timed out, so no API-backed wallet session was applied.",
    "zh-CN": "本地 wallet session API 请求超时，因此未应用 API-backed 钱包会话。",
    "zh-TW": "本地 wallet session API 請求逾時，因此未套用 API-backed 錢包會話。",
  },
  API_RESPONSE_INVALID: {
    "en-US": "The local wallet session API response shape was not recognized.",
    "zh-CN": "本地 wallet session API 响应结构无法识别。",
    "zh-TW": "本地 wallet session API 回應結構無法識別。",
  },
  API_WALLET_SESSION_FAILED: {
    "en-US": "The local wallet session route did not return a usable wallet session.",
    "zh-CN": "本地 wallet session route 未返回可用的钱包会话。",
    "zh-TW": "本地 wallet session route 未回傳可用的錢包會話。",
  },
};

const unsafePatterns: Array<[RegExp, string]> = [
  [/\braw[-_\s]*signature\b/gi, "redacted signature"],
  [/\bwallet[-_\s]*signature\b/gi, "redacted wallet action"],
  [/\bprivate[-_\s]*key\b/gi, "redacted key"],
  [/\bseed[-_\s]*phrase\b/gi, "redacted seed"],
  [/\brecovery[-_\s]*phrase\b/gi, "redacted recovery phrase"],
  [/\bbearer[-_\s]*token\b/gi, "redacted bearer credential"],
  [/\bbearer\s+[A-Za-z0-9._~+/=-]+/gi, "redacted bearer credential"],
  [/\bpassword\s*[=:]\s*[^&\s"'<>]+/gi, "password=redacted"],
  [/\bapi[-_\s]*key\b/gi, "redacted credential"],
  [/\b(token|access_token|refresh_token|api_key|apikey)=([^&\s"'<>]+)/gi, "redacted query credential"],
  [/\/Users\/[^"'\s<>]*campaign-os-kitty[^"'\s<>]*/gi, "redacted private path"],
  [/\/private\/[^"'\s<>]*/gi, "redacted private path"],
  [/\bprovider[-_\s]*payload\b/gi, "redacted provider data"],
  [/\bstack\s*trace\b/gi, "redacted stack"],
  [/at\s+[A-Za-z0-9_$.[\]<>]+\s+\([^)]*\)/g, "redacted stack frame"],
  [/\bsigned[-_\s]*url\b/gi, "redacted signed link"],
  [/\bobject[-_\s]*key\b/gi, "redacted object reference"],
  [/\bstorage[-_\s]*key\b/gi, "redacted storage reference"],
];

const accountTypes: ReadonlySet<AccountType> = new Set(["AA", "EOA", "UNKNOWN"]);
const walletSources: ReadonlySet<WalletSource> = new Set([
  "AGENT_SKILL",
  "NIGHTELF",
  "OTHER",
  "PORTKEY_AA",
  "PORTKEY_EOA_APP",
  "PORTKEY_EOA_EXTENSION",
]);
const walletNetworks: ReadonlySet<WalletNetwork> = new Set(["mainnet", "testnet", "unknown"]);
const verificationStatuses: ReadonlySet<WalletVerificationStatus> = new Set([
  "account_restricted",
  "address_only",
  "extension_not_installed",
  "internal_agent",
  "missing_signature",
  "unsupported_wallet",
  "verified",
  "wrong_chain",
]);
const signatureStatuses: ReadonlySet<WalletSignatureStatus> = new Set([
  "missing",
  "not_available",
  "not_required",
  "signed",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const sanitizeWalletSessionApiText = (value: unknown): string => {
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

  return sanitizeWalletSessionApiText(value);
};

const diagnostic = (
  code: WalletSessionApiDiagnostic["code"],
  severity: WalletSessionApiDiagnostic["severity"],
  safeDetails?: Record<string, unknown>,
): WalletSessionApiDiagnostic => {
  const normalizedDetails = safeDetails
    ? Object.fromEntries(
      Object.entries(safeDetails).map(([key, value]) => [
        sanitizeWalletSessionApiText(key),
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
  const sanitized = sanitizeWalletSessionApiText(tracePrefix ?? defaultTracePrefix)
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
        sanitizeWalletSessionApiText(key).toLowerCase(),
        sanitizeWalletSessionApiText(value),
      ]),
  );

const normalizeConfig = (config: WalletSessionApiConfig | undefined): NormalizedConfig => {
  const headers = normalizeHeaders(config?.headers);
  const normalizedTracePrefix = normalizeTracePrefix(config?.tracePrefix);
  const timeoutMs = clampTimeout(config?.timeoutMs);
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
      configured: true,
      headers,
      normalizedTracePrefix,
      timeoutMs,
    };
  } catch {
    return {
      configured: true,
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

const createTraceId = (prefix: string) => `${prefix}-wallet-session-${Date.now().toString(36)}`;

const walletSessionApiUrl = (baseUrl: URL) => {
  const next = new URL(baseUrl.toString());

  next.pathname = `${next.pathname.replace(/\/$/, "")}${walletSessionEndpoint}`;
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
    ? sanitizeWalletSessionApiText(value.traceId)
    : undefined;

const safeFetchJson = async (
  fetchImpl: WalletSessionApiFetch,
  url: string,
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
        diagnostic: diagnostic("API_WALLET_SESSION_FAILED", "error", {
          endpoint: walletSessionEndpoint,
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
          endpoint: walletSessionEndpoint,
          reason: sanitizeWalletSessionApiText(error),
        },
      ),
      ok: false,
      traceId,
    };
  } finally {
    timeout.clear();
  }
};

const sanitizedString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? sanitizeWalletSessionApiText(value) : undefined;

const localizedTextFromValue = (value: unknown): LocalizedText | undefined => {
  if (
    isRecord(value)
    && typeof value["en-US"] === "string"
    && typeof value["zh-CN"] === "string"
  ) {
    return {
      "en-US": sanitizeWalletSessionApiText(value["en-US"]),
      "zh-CN": sanitizeWalletSessionApiText(value["zh-CN"]),
      ...(typeof value["zh-TW"] === "string"
        ? { "zh-TW": sanitizeWalletSessionApiText(value["zh-TW"]) }
        : {}),
    };
  }

  return undefined;
};

const stringRecordFromValue = (value: unknown): Record<string, string> | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const record = Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string")
      .map(([key, item]) => [
        sanitizeWalletSessionApiText(key),
        sanitizeWalletSessionApiText(item),
      ]),
  );

  return Object.keys(record).length > 0 ? record : undefined;
};

const stringArrayFromValue = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const values = value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map(sanitizeWalletSessionApiText);

  return values.length > 0 ? values : undefined;
};

const trimmedStringFromValue = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const walletCapabilitiesFromValue = (value: unknown): WalletCapability[] | undefined => {
  const values = stringArrayFromValue(value);

  return values?.filter((item): item is WalletCapability =>
    [
      "ADDRESS_ONLY",
      "CONTRACT_SEND",
      "CONTRACT_VIEW",
      "EBRIDGE",
      "INTERNAL_AUTOMATION",
      "SEND_TRANSACTION",
      "SIGN_MESSAGE",
      "VIEW_BALANCE",
    ].includes(item),
  );
};

const proofFromValue = (value: unknown): NormalizedWalletSession["proof"] | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const diagnosticCodes = stringArrayFromValue(value.diagnosticCodes) ?? [];
  const liveVerificationExecuted = value.liveVerificationExecuted === false ? false : undefined;
  const proofType = trimmedStringFromValue(value.proofType);
  const status = trimmedStringFromValue(value.status);
  const trustLevel = trimmedStringFromValue(value.trustLevel);

  if (
    liveVerificationExecuted !== false
    || !["address_only", "agent_context", "wallet_signature"].includes(proofType ?? "")
    || !["blocked", "proof_required", "signature_unverified", "stale", "verified"].includes(status ?? "")
    || !["blocked", "internal_only", "untrusted", "verified_local"].includes(trustLevel ?? "")
  ) {
    return undefined;
  }

  return {
    diagnosticCodes,
    liveVerificationExecuted,
    proofType: proofType as NonNullable<NormalizedWalletSession["proof"]>["proofType"],
    status: status as NonNullable<NormalizedWalletSession["proof"]>["status"],
    trustLevel: trustLevel as NonNullable<NormalizedWalletSession["proof"]>["trustLevel"],
  };
};

const issuerFromValue = (value: unknown): NormalizedWalletSession["issuer"] | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const artifactType = sanitizedString(value.artifactType);
  const issuerMode = sanitizedString(value.issuerMode);
  const referenceId = sanitizedString(value.referenceId);
  const ttlSeconds = typeof value.ttlSeconds === "number" ? value.ttlSeconds : undefined;

  if (
    artifactType !== "local_session_reference"
    || !["local_opaque", "production_blocked"].includes(issuerMode ?? "")
    || !referenceId
    || typeof ttlSeconds !== "number"
    || value.cookieIssued !== false
    || value.jwtIssued !== false
    || value.liveSigningExecuted !== false
    || typeof value.valid !== "boolean"
  ) {
    return undefined;
  }

  return {
    artifactType,
    cookieIssued: false,
    diagnosticCodes: stringArrayFromValue(value.diagnosticCodes) ?? [],
    issuerMode: issuerMode as NonNullable<NormalizedWalletSession["issuer"]>["issuerMode"],
    jwtIssued: false,
    liveSigningExecuted: false,
    referenceId,
    ttlSeconds,
    valid: value.valid,
  };
};

const productionReadinessFromValue = (
  value: unknown,
): NormalizedWalletSession["productionReadiness"] | undefined => {
  if (!isRecord(value) || value.productionReady !== false) {
    return undefined;
  }

  return {
    blockedDependencyIds: stringArrayFromValue(value.blockedDependencyIds) ?? [],
    liveSigningReady: value.liveSigningReady === true,
    liveVerifierReady: value.liveVerifierReady === true,
    productionReady: false,
    productionRequired: value.productionRequired === true,
    productionSessionStoreReady: value.productionSessionStoreReady === true,
    secretManagerReady: value.secretManagerReady === true,
    signingKeyReady: value.signingKeyReady === true,
  };
};

const normalizeWalletSession = (value: unknown): NormalizedWalletSession | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const accountType = sanitizedString(value.accountType);
  const walletSource = sanitizedString(value.walletSource);
  const network = sanitizedString(value.network);
  const verificationStatus = sanitizedString(value.verificationStatus);
  const signatureStatus = sanitizedString(value.signatureStatus);
  const statusMessage = localizedTextFromValue(value.statusMessage);
  const capabilities = walletCapabilitiesFromValue(value.capabilities);
  const id = sanitizedString(value.id);
  const sessionId = sanitizedString(value.sessionId);
  const address = sanitizedString(value.address);
  const displayAddress = sanitizedString(value.displayAddress);
  const walletName = sanitizedString(value.walletName);
  const chainId = sanitizedString(value.chainId);

  if (
    !id
    || !sessionId
    || !address
    || !displayAddress
    || !accountTypes.has(accountType as AccountType)
    || !walletSources.has(walletSource as WalletSource)
    || !walletName
    || !chainId
    || !walletNetworks.has(network as WalletNetwork)
    || !capabilities
    || !verificationStatuses.has(verificationStatus as WalletVerificationStatus)
    || !signatureStatuses.has(signatureStatus as WalletSignatureStatus)
    || typeof value.walletTypeVerified !== "boolean"
    || typeof value.normalUserRecommended !== "boolean"
    || !statusMessage
  ) {
    return undefined;
  }

  const proof = proofFromValue(value.proof);
  const issuer = issuerFromValue(value.issuer);
  const productionReadiness = productionReadinessFromValue(value.productionReadiness);

  return {
    id,
    sessionId,
    address,
    displayAddress,
    accountType: accountType as AccountType,
    walletSource: walletSource as WalletSource,
    walletName,
    chainId,
    network: network as WalletNetwork,
    ...(stringRecordFromValue(value.accounts) ? { accounts: stringRecordFromValue(value.accounts) } : {}),
    ...(sanitizedString(value.publicKey) ? { publicKey: sanitizedString(value.publicKey) } : {}),
    capabilities,
    ...(sanitizedString(value.connectedAt) ? { connectedAt: sanitizedString(value.connectedAt) } : {}),
    ...(sanitizedString(value.lastSeenAt) ? { lastSeenAt: sanitizedString(value.lastSeenAt) } : {}),
    verificationStatus: verificationStatus as WalletVerificationStatus,
    signatureStatus: signatureStatus as WalletSignatureStatus,
    walletTypeVerified: value.walletTypeVerified,
    normalUserRecommended: value.normalUserRecommended,
    ...(sanitizedString(value.errorReason) ? { errorReason: sanitizedString(value.errorReason) } : {}),
    ...(localizedTextFromValue(value.userAction) ? { userAction: localizedTextFromValue(value.userAction) } : {}),
    statusMessage,
    ...(proof ? { proof } : {}),
    ...(issuer ? { issuer } : {}),
    ...(productionReadiness ? { productionReadiness } : {}),
  };
};

const repositoryMetadataFromValue = (value: unknown): WalletSessionRepositoryMetadata | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const metadata: WalletSessionRepositoryMetadata = {
    ...(sanitizedString(value.adapterId) ? { adapterId: sanitizedString(value.adapterId) } : {}),
    ...(typeof value.created === "boolean" ? { created: value.created } : {}),
    ...(sanitizedString(value.recordId) ? { recordId: sanitizedString(value.recordId) } : {}),
    ...(sanitizedString(value.repositoryId) ? { repositoryId: sanitizedString(value.repositoryId) } : {}),
    ...(sanitizedString(value.sessionId) ? { sessionId: sanitizedString(value.sessionId) } : {}),
    ...(sanitizedString(value.storeId) ? { storeId: sanitizedString(value.storeId) } : {}),
    ...(typeof value.upserted === "boolean" ? { upserted: value.upserted } : {}),
    ...(sanitizedString(value.walletAddress) ? { walletAddress: sanitizedString(value.walletAddress) } : {}),
  };

  return Object.keys(metadata).length > 0 ? metadata : undefined;
};

const dataRecord = (body: unknown): Record<string, unknown> | undefined =>
  isApiEnvelope(body) && isRecord(body.data) ? body.data : undefined;

const payloadRecord = (body: unknown): unknown => {
  const data = dataRecord(body);

  if (data && "payload" in data) {
    return data.payload;
  }

  return data ?? body;
};

const repositoryMetadata = (body: unknown): WalletSessionRepositoryMetadata | undefined => {
  const data = dataRecord(body);

  return repositoryMetadataFromValue(data?.walletSessionRepository)
    ?? repositoryMetadataFromValue(isRecord(body) ? body.walletSessionRepository : undefined);
};

const fallbackState = ({
  configured,
  diagnostics,
  request,
  session,
  source,
  status,
  traceId,
}: {
  configured: boolean;
  diagnostics: readonly WalletSessionApiDiagnostic[];
  request: WalletSessionPreviewRequest;
  session?: NormalizedWalletSession;
  source: Extract<WalletSessionApiSource, "error_fallback" | "seeded_fallback">;
  status: Extract<WalletSessionApiStatus, "error" | "fallback">;
  traceId?: string;
}): WalletSessionApiBridgeState => ({
  boundary: walletSessionApiBoundary,
  configured,
  diagnostics,
  loading: false,
  request,
  session,
  source,
  status,
  ...(traceId ? { traceId } : {}),
});

const fallbackSessionForRequest = (request: WalletSessionPreviewRequest): NormalizedWalletSession | undefined =>
  walletSessions.find((session) => session.sessionId === request.fixtureId) ?? walletSessions[0];

const normalizeRequest = (request: WalletSessionPreviewRequest | undefined): WalletSessionPreviewRequest => ({
  ...defaultWalletSessionPreviewRequest,
  ...(request ?? {}),
});

export const createWalletSessionApiLoadingState = (
  request?: WalletSessionPreviewRequest,
): WalletSessionApiBridgeState => ({
  boundary: walletSessionApiBoundary,
  configured: true,
  diagnostics: [],
  loading: true,
  request: normalizeRequest(request),
  source: "loading",
  status: "loading",
});

export const createWalletSessionApiSeededFallbackState = (
  request?: WalletSessionPreviewRequest,
): WalletSessionApiBridgeState => {
  const normalizedRequest = normalizeRequest(request);

  return fallbackState({
    configured: false,
    diagnostics: [diagnostic("API_BASE_URL_MISSING", "info")],
    request: normalizedRequest,
    session: fallbackSessionForRequest(normalizedRequest),
    source: "seeded_fallback",
    status: "fallback",
  });
};

export const submitWalletSessionApiPreview = async ({
  config,
  fetchImpl = fetch,
  request,
}: SubmitWalletSessionApiPreviewInput): Promise<WalletSessionApiBridgeState> => {
  const normalizedRequest = normalizeRequest(request);
  const normalizedConfig = normalizeConfig(config);

  if (!normalizedConfig.baseUrl) {
    return fallbackState({
      configured: normalizedConfig.configured,
      diagnostics: normalizedConfig.diagnostic ? [normalizedConfig.diagnostic] : [],
      request: normalizedRequest,
      session: normalizedConfig.configured ? undefined : fallbackSessionForRequest(normalizedRequest),
      source: normalizedConfig.configured ? "error_fallback" : "seeded_fallback",
      status: normalizedConfig.configured ? "error" : "fallback",
    });
  }

  const response = await safeFetchJson(
    fetchImpl,
    walletSessionApiUrl(normalizedConfig.baseUrl),
    createTraceId(normalizedConfig.normalizedTracePrefix),
    normalizedConfig.timeoutMs,
    normalizedConfig.headers,
    normalizedRequest,
  );
  const responseTraceId = response.traceId ?? extractTraceId(response.body);

  if (!response.ok || !isApiEnvelope(response.body) || !response.body.ok) {
    return fallbackState({
      configured: true,
      diagnostics: [response.diagnostic ?? diagnostic("API_WALLET_SESSION_FAILED", "error", { endpoint: walletSessionEndpoint })],
      request: normalizedRequest,
      source: "error_fallback",
      status: "error",
      traceId: responseTraceId,
    });
  }

  const session = normalizeWalletSession(payloadRecord(response.body));

  if (!session) {
    return fallbackState({
      configured: true,
      diagnostics: [diagnostic("API_RESPONSE_INVALID", "error", { endpoint: walletSessionEndpoint })],
      request: normalizedRequest,
      source: "error_fallback",
      status: "error",
      traceId: responseTraceId,
    });
  }

  return {
    boundary: walletSessionApiBoundary,
    configured: true,
    diagnostics: [],
    loading: false,
    ...(repositoryMetadata(response.body) ? { repository: repositoryMetadata(response.body) } : {}),
    request: normalizedRequest,
    session,
    source: "api_runtime",
    status: "connected",
    ...(responseTraceId ? { traceId: responseTraceId } : {}),
  };
};
