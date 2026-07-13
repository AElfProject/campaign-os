import type {
  CampaignStatus,
  NormalizedWalletSession,
  SupportedLocale,
  WalletPolicy,
} from "../domain/types";

type Brand<T extends string> = string & { readonly __brand: T };

export type OwnerCampaignId = Brand<"OwnerCampaignId">;
export type OwnerTaskId = Brand<"OwnerTaskId">;
export type OwnerTaskPreviewSuggestionId = Brand<"OwnerTaskPreviewSuggestionId">;

export type ProjectOwnerCampaignApiFetch = typeof fetch;

export type OwnerCampaignBridgeCode =
  | "BRIDGE_BASE_URL_INVALID"
  | "BRIDGE_BASE_URL_MISSING"
  | "BRIDGE_INVALID_INPUT"
  | "BRIDGE_REQUEST_ABORTED"
  | "BRIDGE_REQUEST_FAILED"
  | "BRIDGE_REQUEST_TIMEOUT"
  | "BRIDGE_RESPONSE_INVALID"
  | "BRIDGE_RESPONSE_NON_JSON"
  | "BRIDGE_RESPONSE_OVERSIZE";

export type OwnerCampaignServerCode =
  | "AUTH_FORBIDDEN"
  | "AUTH_OWNER_MISMATCH"
  | "AUTH_SESSION_INVALID"
  | "AUTH_SESSION_REQUIRED"
  | "INVALID_CAMPAIGN"
  | "INVALID_REQUEST"
  | "PERSISTENCE_UNAVAILABLE"
  | (string & {});

export type OwnerCampaignErrorCode = OwnerCampaignBridgeCode | OwnerCampaignServerCode;

export interface ProjectOwnerCampaignApiConfig {
  baseUrl?: string;
  maxResponseBytes?: number;
  timeoutMs?: number;
  tracePrefix?: string;
}

export interface ProjectOwnerCampaignApiBridgeFactoryOptions {
  config?: ProjectOwnerCampaignApiConfig;
  fetchImpl?: ProjectOwnerCampaignApiFetch;
  traceIdGenerator?: (operation: OwnerCampaignOperation) => string;
}

export interface OwnerSessionContext {
  session: NormalizedWalletSession;
  signal?: AbortSignal;
  traceId?: string;
}

export interface CreateOwnerCampaignInput {
  contractMode?: string;
  defaultLocale?: SupportedLocale | string;
  duration: string;
  endTime: string;
  goal: string;
  metadataHash?: string;
  metadataUri?: string;
  ownerAddress?: string;
  projectId: string;
  rewardDescription: string;
  rewardDisclaimerHash?: string;
  startTime: string;
  status?: CampaignStatus | string;
  supportedLocales?: readonly (SupportedLocale | string)[];
  walletPolicy?: WalletPolicy | string;
}

export interface RecoverOwnerCampaignsInput {
  limit?: number;
  status?: "draft" | "scheduled" | "live" | string;
}

export interface AddOwnerCampaignTaskInput {
  evidenceRule: Record<string, unknown>;
  points: number;
  required: boolean;
  templateCode: string;
  verificationType: string;
  walletCompatibility: string;
}

export interface GenerateOwnerTaskPreviewInput {
  goal: string;
  product: string;
  targetUsers: readonly string[];
  walletPolicy: WalletPolicy | string;
}

export interface OwnerCampaignProjection {
  createdAt?: string;
  id: OwnerCampaignId;
  ownerAddress: string;
  projectId: string;
  status: string;
  updatedAt?: string;
}

export interface OwnerTaskProjection {
  campaignId: OwnerCampaignId;
  evidenceRule: Record<string, unknown>;
  id: OwnerTaskId;
  points: number;
  required: boolean;
  templateCode: string;
  verificationType: string;
  walletCompatibility: string;
}

export interface OwnerTaskPreviewSuggestion {
  adoptable: boolean;
  campaignId: OwnerCampaignId;
  evidenceRule: Record<string, unknown>;
  id: OwnerTaskPreviewSuggestionId;
  points: number;
  rejectionCode?: string;
  required: boolean;
  templateCode: string;
  verificationType: string;
  walletCompatibility: string;
}

export interface OwnerTaskPreview {
  campaignId: OwnerCampaignId;
  humanReviewRequired: true;
  suggestions: readonly OwnerTaskPreviewSuggestion[];
}

export interface OwnerCampaignSafeDiagnostic {
  code: string;
  field?: string;
  message?: string;
  safeDetails?: Record<string, boolean | number | string>;
}

export interface OwnerCampaignFailure {
  bridgeCode?: OwnerCampaignBridgeCode;
  code: OwnerCampaignErrorCode;
  diagnostic: OwnerCampaignSafeDiagnostic;
  httpStatus?: number;
  ok: false;
  reconnectRequired: boolean;
  retryable: boolean;
  traceId: string;
}

export interface OwnerCampaignCreateSuccess {
  campaign: OwnerCampaignProjection;
  campaignId: OwnerCampaignId;
  httpStatus: number;
  ok: true;
  traceId: string;
}

export interface OwnerCampaignListSuccess {
  campaigns: readonly OwnerCampaignProjection[];
  httpStatus: number;
  ok: true;
  traceId: string;
}

export interface OwnerCampaignDetailSuccess {
  campaign: OwnerCampaignProjection;
  httpStatus: number;
  ok: true;
  tasks: readonly OwnerTaskProjection[];
  traceId: string;
}

export interface OwnerTaskSuccess {
  httpStatus: number;
  ok: true;
  task: OwnerTaskProjection;
  taskId: OwnerTaskId;
  traceId: string;
}

export interface OwnerTaskPreviewSuccess {
  httpStatus: number;
  ok: true;
  preview: OwnerTaskPreview;
  traceId: string;
}

export type OwnerCampaignResult = OwnerCampaignCreateSuccess | OwnerCampaignFailure;
export type OwnerCampaignListResult = OwnerCampaignListSuccess | OwnerCampaignFailure;
export type OwnerCampaignDetailResult = OwnerCampaignDetailSuccess | OwnerCampaignFailure;
export type OwnerTaskResult = OwnerTaskSuccess | OwnerCampaignFailure;
export type OwnerTaskPreviewResult = OwnerTaskPreviewSuccess | OwnerCampaignFailure;

export interface ProjectOwnerCampaignApiBridge {
  addTask(
    campaignId: string,
    input: AddOwnerCampaignTaskInput,
    context: OwnerSessionContext,
  ): Promise<OwnerTaskResult>;
  createCampaign(input: CreateOwnerCampaignInput, context: OwnerSessionContext): Promise<OwnerCampaignResult>;
  generateTaskPreview(
    campaignId: string,
    input: GenerateOwnerTaskPreviewInput,
    context: OwnerSessionContext,
  ): Promise<OwnerTaskPreviewResult>;
  getCampaignDetail(campaignId: string, context: OwnerSessionContext): Promise<OwnerCampaignDetailResult>;
  recoverCampaigns(
    projectId: string,
    context: OwnerSessionContext,
    input?: RecoverOwnerCampaignsInput,
  ): Promise<OwnerCampaignListResult>;
}

type OwnerCampaignOperation =
  | "addTask"
  | "createCampaign"
  | "generateTaskPreview"
  | "getCampaignDetail"
  | "recoverCampaigns";

interface NormalizedConfig {
  baseUrl?: URL;
  diagnostic?: OwnerCampaignFailure;
  maxResponseBytes: number;
  normalizedTracePrefix: string;
  timeoutMs: number;
}

interface RequestAdapterInput {
  body?: unknown;
  context: OwnerSessionContext;
  method: "GET" | "POST";
  operation: OwnerCampaignOperation;
  path: string;
  query?: Record<string, string | undefined>;
  requiresAuth: boolean;
}

interface RequestAdapterSuccess {
  body: unknown;
  httpStatus: number;
  ok: true;
  traceId: string;
}

type RequestAdapterResult =
  | RequestAdapterSuccess
  | OwnerCampaignFailure;

type ProofStatusHeader = "blocked" | "local_seeded" | "proof_required" | "signature_unverified" | "verified";
type CredentialBoundaryHeader = "internal_agent_credential" | "ordinary_user_wallet";

const defaultTimeoutMs = 2_000;
const minTimeoutMs = 250;
const maxTimeoutMs = 8_000;
const defaultMaxResponseBytes = 128_000;
const minMaxResponseBytes = 1;
const maxMaxResponseBytes = 1_000_000;
const defaultTracePrefix = "project-owner-campaign";
const successStatuses = new Set([200, 201, 202, 204]);
const recoverStatuses = new Set(["draft", "scheduled", "live"]);
const supportedSuggestionVerificationTypes = new Set(["DAPP_API", "MANUAL", "ON_CHAIN", "SOCIAL", "WALLET"]);
const allowedDiagnosticKeys = new Set([
  "code",
  "endpoint",
  "field",
  "message",
  "method",
  "reason",
  "rejectionCode",
  "status",
  "traceId",
]);

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
  [/\b(postgres|postgresql|redis):\/\/[^"'\s<>]+/gi, "redacted service URL"],
  [/\/Users\/[^"'\s<>]*campaign-os-kitty[^"'\s<>]*/gi, "redacted private path"],
  [/\/private\/[^"'\s<>]*/gi, "redacted private path"],
  [/\bprovider[-_\s]*payload\b/gi, "redacted provider data"],
  [/\bstack\s*trace\b/gi, "redacted stack"],
];

export const sanitizeProjectOwnerCampaignApiText = (value: unknown): string => {
  const raw = value instanceof Error
    ? `${value.name}: ${value.message}`
    : typeof value === "string"
      ? value
      : JSON.stringify(value ?? "");
  const strippedUrlQuery = raw.replace(/\?[^"'\s<>]*/g, "?redacted-query");

  return unsafePatterns.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    strippedUrlQuery,
  );
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const safePrimitive = (value: unknown): boolean | number | string | undefined => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    return sanitizeProjectOwnerCampaignApiText(value);
  }

  return undefined;
};

const safeDetailsFromRecord = (value: unknown): Record<string, boolean | number | string> | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const entries: Array<[string, boolean | number | string]> = [];

  for (const [key, rawValue] of Object.entries(value)) {
    if (!allowedDiagnosticKeys.has(key)) {
      continue;
    }

    const safeValue = safePrimitive(rawValue);

    if (safeValue !== undefined) {
      entries.push([sanitizeProjectOwnerCampaignApiText(key), safeValue]);
    }
  }

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

const safeDiagnostic = (
  code: OwnerCampaignErrorCode,
  message: string,
  safeDetails?: Record<string, unknown>,
): OwnerCampaignSafeDiagnostic => {
  const normalizedDetails = safeDetailsFromRecord(safeDetails);

  return {
    code: sanitizeProjectOwnerCampaignApiText(code),
    message: sanitizeProjectOwnerCampaignApiText(message),
    ...(normalizedDetails ? { safeDetails: normalizedDetails } : {}),
  };
};

const failure = ({
  bridgeCode,
  code,
  httpStatus,
  message,
  reconnectRequired = false,
  retryable,
  safeDetails,
  traceId,
}: {
  bridgeCode?: OwnerCampaignBridgeCode;
  code: OwnerCampaignErrorCode;
  httpStatus?: number;
  message: string;
  reconnectRequired?: boolean;
  retryable: boolean;
  safeDetails?: Record<string, unknown>;
  traceId: string;
}): OwnerCampaignFailure => ({
  ...(bridgeCode ? { bridgeCode } : {}),
  code,
  diagnostic: safeDiagnostic(code, message, safeDetails),
  ...(httpStatus !== undefined ? { httpStatus } : {}),
  ok: false,
  reconnectRequired,
  retryable,
  traceId: sanitizeProjectOwnerCampaignApiText(traceId),
});

const clampTimeout = (timeoutMs: number | undefined) => {
  if (!Number.isFinite(timeoutMs)) {
    return defaultTimeoutMs;
  }

  return Math.min(maxTimeoutMs, Math.max(minTimeoutMs, Math.trunc(timeoutMs ?? defaultTimeoutMs)));
};

const clampMaxResponseBytes = (maxResponseBytes: number | undefined) => {
  if (!Number.isFinite(maxResponseBytes)) {
    return defaultMaxResponseBytes;
  }

  return Math.min(
    maxMaxResponseBytes,
    Math.max(minMaxResponseBytes, Math.trunc(maxResponseBytes ?? defaultMaxResponseBytes)),
  );
};

const normalizeTracePrefix = (tracePrefix: string | undefined) => {
  const sanitized = sanitizeProjectOwnerCampaignApiText(tracePrefix ?? defaultTracePrefix)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized || defaultTracePrefix;
};

const normalizeConfig = (config: ProjectOwnerCampaignApiConfig | undefined): NormalizedConfig => {
  const timeoutMs = clampTimeout(config?.timeoutMs);
  const maxResponseBytes = clampMaxResponseBytes(config?.maxResponseBytes);
  const normalizedTracePrefix = normalizeTracePrefix(config?.tracePrefix);
  const rawBaseUrl = config?.baseUrl?.trim();
  const fallbackTraceId = `${normalizedTracePrefix}-config`;

  if (!rawBaseUrl) {
    return {
      diagnostic: failure({
        bridgeCode: "BRIDGE_BASE_URL_MISSING",
        code: "BRIDGE_BASE_URL_MISSING",
        message: "Project Owner Campaign API base URL is missing.",
        retryable: false,
        safeDetails: { reason: "missing_base_url" },
        traceId: fallbackTraceId,
      }),
      maxResponseBytes,
      normalizedTracePrefix,
      timeoutMs,
    };
  }

  try {
    const baseUrl = new URL(rawBaseUrl);

    if (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:") {
      return {
        diagnostic: failure({
          bridgeCode: "BRIDGE_BASE_URL_INVALID",
          code: "BRIDGE_BASE_URL_INVALID",
          message: "Project Owner Campaign API base URL must use HTTP or HTTPS.",
          retryable: false,
          safeDetails: { reason: "unsupported_protocol", endpoint: rawBaseUrl },
          traceId: fallbackTraceId,
        }),
        maxResponseBytes,
        normalizedTracePrefix,
        timeoutMs,
      };
    }

    return {
      baseUrl,
      maxResponseBytes,
      normalizedTracePrefix,
      timeoutMs,
    };
  } catch {
    return {
      diagnostic: failure({
        bridgeCode: "BRIDGE_BASE_URL_INVALID",
        code: "BRIDGE_BASE_URL_INVALID",
        message: "Project Owner Campaign API base URL is malformed.",
        retryable: false,
        safeDetails: { reason: "malformed_url", endpoint: rawBaseUrl },
        traceId: fallbackTraceId,
      }),
      maxResponseBytes,
      normalizedTracePrefix,
      timeoutMs,
    };
  }
};

const endpointUrl = (
  baseUrl: URL,
  path: string,
  query?: Record<string, string | undefined>,
) => {
  const next = new URL(baseUrl.toString());

  next.pathname = path;
  next.search = "";
  next.hash = "";

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value.trim()) {
      next.searchParams.set(key, value);
    }
  }

  return next.toString();
};

const nonEmptyText = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim()
    ? sanitizeProjectOwnerCampaignApiText(value.trim())
    : undefined;

const rawNonEmptyText = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const optionalStringField = (record: Record<string, unknown>, key: string): string | undefined =>
  nonEmptyText(record[key]);

const optionalRawStringField = (record: Record<string, unknown>, key: string): string | undefined =>
  rawNonEmptyText(record[key]);

const optionalBooleanField = (record: Record<string, unknown>, key: string): boolean | undefined =>
  typeof record[key] === "boolean" ? record[key] : undefined;

const optionalNumberField = (record: Record<string, unknown>, key: string): number | undefined => {
  const value = record[key];

  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
};

const extractTraceId = (value: unknown): string | undefined =>
  isRecord(value) && typeof value.traceId === "string" && value.traceId.trim()
    ? sanitizeProjectOwnerCampaignApiText(value.traceId)
    : undefined;

const isRuntimeEnvelope = (body: unknown): body is Record<string, unknown> & { ok: boolean } =>
  isRecord(body) && typeof body.ok === "boolean";

const dataRecord = (body: unknown): Record<string, unknown> | undefined => {
  if (!isRuntimeEnvelope(body) || !isRecord(body.data)) {
    return undefined;
  }

  return body.data;
};

const payloadRecord = (body: unknown): Record<string, unknown> | undefined => {
  const data = dataRecord(body);

  return data && isRecord(data.payload) ? data.payload : undefined;
};

const toCampaignId = (value: string): OwnerCampaignId => value as OwnerCampaignId;
const toTaskId = (value: string): OwnerTaskId => value as OwnerTaskId;
const toPreviewSuggestionId = (value: string): OwnerTaskPreviewSuggestionId =>
  value as OwnerTaskPreviewSuggestionId;

const sameIdentity = (left: string, right: string) =>
  left.trim().toLowerCase() === right.trim().toLowerCase();

const isCanonicalCampaignId = (value: string | undefined): value is string =>
  typeof value === "string"
  && value.trim().length > 0
  && !/^(local|seeded|synthetic|preview|suggestion)[-_]/i.test(value);

const isCanonicalTaskId = (value: string | undefined): value is string =>
  typeof value === "string"
  && value.trim().length > 0
  && !/^(local-task|local|seeded|synthetic|preview|suggestion|request)[-_]/i.test(value);

const invalidInputFailure = (
  traceId: string,
  field: string,
): OwnerCampaignFailure => failure({
  bridgeCode: "BRIDGE_INVALID_INPUT",
  code: "INVALID_REQUEST",
  message: "Project Owner Campaign API input is invalid.",
  retryable: false,
  safeDetails: { field },
  traceId,
});

const normalizeProofStatus = (session: NormalizedWalletSession): ProofStatusHeader => {
  const proofStatus = session.proof?.status;

  if (
    proofStatus === "blocked"
    || proofStatus === "proof_required"
    || proofStatus === "signature_unverified"
    || proofStatus === "verified"
  ) {
    return proofStatus;
  }

  if (session.verificationStatus === "verified") {
    return "verified";
  }

  if (session.verificationStatus === "internal_agent") {
    return "proof_required";
  }

  return "signature_unverified";
};

const credentialBoundaryForSession = (session: NormalizedWalletSession): CredentialBoundaryHeader =>
  session.walletSource === "AGENT_SKILL" || session.capabilities.includes("INTERNAL_AUTOMATION")
    ? "internal_agent_credential"
    : "ordinary_user_wallet";

const sessionAuthHeaders = (session: NormalizedWalletSession): Record<string, string> => ({
  "x-campaign-os-account-type": session.accountType,
  "x-campaign-os-credential-boundary": credentialBoundaryForSession(session),
  "x-campaign-os-proof-status": normalizeProofStatus(session),
  "x-campaign-os-roles": "project_owner",
  "x-campaign-os-session-id": session.sessionId,
  "x-campaign-os-wallet-address": session.address,
  "x-campaign-os-wallet-source": session.walletSource,
});

const makeTraceId = (
  operation: OwnerCampaignOperation,
  context: OwnerSessionContext,
  config: NormalizedConfig,
  traceIdGenerator?: (operation: OwnerCampaignOperation) => string,
) => {
  if (context.traceId?.trim()) {
    return sanitizeProjectOwnerCampaignApiText(context.traceId);
  }

  const generated = traceIdGenerator?.(operation);

  if (generated?.trim()) {
    return sanitizeProjectOwnerCampaignApiText(generated);
  }

  return `${config.normalizedTracePrefix}-${operation}-${Date.now().toString(36)}`;
};

const authSessionIsUsable = (session: NormalizedWalletSession) =>
  Boolean(
    session.sessionId.trim()
    && session.address.trim()
    && session.accountType.trim()
    && session.walletSource.trim(),
  );

const createManagedAbortSignal = (callerSignal: AbortSignal | undefined, timeoutMs: number) => {
  const controller = new AbortController();
  let timedOut = false;
  let callerAborted = Boolean(callerSignal?.aborted);
  const abortFromCaller = () => {
    callerAborted = true;
    controller.abort();
  };
  const timeout = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  if (callerSignal) {
    if (callerSignal.aborted) {
      abortFromCaller();
    } else {
      callerSignal.addEventListener("abort", abortFromCaller, { once: true });
    }
  }

  return {
    abortCode: (): OwnerCampaignBridgeCode =>
      timedOut ? "BRIDGE_REQUEST_TIMEOUT" : callerAborted ? "BRIDGE_REQUEST_ABORTED" : "BRIDGE_REQUEST_FAILED",
    clear: () => {
      globalThis.clearTimeout(timeout);

      if (callerSignal && !callerSignal.aborted) {
        callerSignal.removeEventListener("abort", abortFromCaller);
      } else if (callerSignal) {
        callerSignal.removeEventListener("abort", abortFromCaller);
      }
    },
    signal: controller.signal,
  };
};

const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === "AbortError"
  || isRecord(error) && error.name === "AbortError"
  || sanitizeProjectOwnerCampaignApiText(error).includes("AbortError");

const mapStatusToCode = (httpStatus: number): OwnerCampaignServerCode => {
  if (httpStatus === 400) {
    return "INVALID_REQUEST";
  }

  if (httpStatus === 401) {
    return "AUTH_SESSION_INVALID";
  }

  if (httpStatus === 403) {
    return "AUTH_FORBIDDEN";
  }

  if (httpStatus === 404) {
    return "INVALID_CAMPAIGN";
  }

  if (httpStatus === 503) {
    return "PERSISTENCE_UNAVAILABLE";
  }

  return "PERSISTENCE_UNAVAILABLE";
};

const retryableForCode = (code: OwnerCampaignErrorCode, httpStatus?: number) =>
  code === "PERSISTENCE_UNAVAILABLE"
  || code === "BRIDGE_REQUEST_TIMEOUT"
  || code === "BRIDGE_REQUEST_FAILED"
  || httpStatus === 503;

const reconnectRequiredForCode = (code: OwnerCampaignErrorCode, httpStatus?: number) =>
  httpStatus === 401 || code === "AUTH_SESSION_INVALID" || code === "AUTH_SESSION_REQUIRED";

const errorCodeFromEnvelope = (body: unknown, httpStatus: number): OwnerCampaignServerCode => {
  if (isRecord(body) && isRecord(body.error)) {
    const code = optionalStringField(body.error, "code");

    if (code) {
      return code;
    }
  }

  return mapStatusToCode(httpStatus);
};

const safeErrorDetails = (
  body: unknown,
  httpStatus: number,
  endpoint: string,
  method: string,
): Record<string, unknown> => {
  const base: Record<string, unknown> = {
    endpoint,
    method,
    status: httpStatus,
  };

  if (!isRecord(body) || !isRecord(body.error)) {
    return base;
  }

  return {
    ...base,
    ...safeDetailsFromRecord(body.error),
    ...(isRecord(body.error.details) ? safeDetailsFromRecord(body.error.details) : {}),
  };
};

const normalizeHttpError = (
  body: unknown,
  httpStatus: number,
  traceId: string,
  endpoint: string,
  method: string,
): OwnerCampaignFailure => {
  const code = errorCodeFromEnvelope(body, httpStatus);
  const message = isRecord(body) && isRecord(body.error) && typeof body.error.message === "string"
    ? body.error.message
    : `Project Owner Campaign API request failed with HTTP ${httpStatus}.`;

  return failure({
    code,
    httpStatus,
    message,
    reconnectRequired: reconnectRequiredForCode(code, httpStatus),
    retryable: retryableForCode(code, httpStatus),
    safeDetails: safeErrorDetails(body, httpStatus, endpoint, method),
    traceId,
  });
};

const parseResponseBody = async (
  response: Response,
  maxResponseBytes: number,
  traceId: string,
  endpoint: string,
  method: string,
): Promise<{ body: unknown; ok: true; traceId: string } | OwnerCampaignFailure> => {
  const contentLength = Number(response.headers.get("content-length") ?? 0);

  if (Number.isFinite(contentLength) && contentLength > maxResponseBytes) {
    return failure({
      bridgeCode: "BRIDGE_RESPONSE_OVERSIZE",
      code: "BRIDGE_RESPONSE_OVERSIZE",
      httpStatus: response.status,
      message: "Project Owner Campaign API response exceeded the configured size limit.",
      retryable: false,
      safeDetails: { endpoint, method, status: response.status },
      traceId,
    });
  }

  const text = await response.text();

  if (text.length > maxResponseBytes) {
    return failure({
      bridgeCode: "BRIDGE_RESPONSE_OVERSIZE",
      code: "BRIDGE_RESPONSE_OVERSIZE",
      httpStatus: response.status,
      message: "Project Owner Campaign API response exceeded the configured size limit.",
      retryable: false,
      safeDetails: { endpoint, method, status: response.status },
      traceId,
    });
  }

  try {
    const body = JSON.parse(text) as unknown;
    const responseTraceId = extractTraceId(body) ?? response.headers.get("x-campaign-os-trace-id") ?? traceId;

    return {
      body,
      ok: true,
      traceId: sanitizeProjectOwnerCampaignApiText(responseTraceId),
    };
  } catch {
    return failure({
      bridgeCode: "BRIDGE_RESPONSE_NON_JSON",
      code: "BRIDGE_RESPONSE_NON_JSON",
      httpStatus: response.status,
      message: "Project Owner Campaign API response was not valid JSON.",
      retryable: false,
      safeDetails: { endpoint, method, status: response.status },
      traceId,
    });
  }
};

const requestAdapter = async (
  input: RequestAdapterInput,
  config: NormalizedConfig,
  fetchImpl: ProjectOwnerCampaignApiFetch,
  traceIdGenerator?: (operation: OwnerCampaignOperation) => string,
): Promise<RequestAdapterResult> => {
  const traceId = makeTraceId(input.operation, input.context, config, traceIdGenerator);

  if (config.diagnostic || !config.baseUrl) {
    return {
      ...(config.diagnostic ?? failure({
        bridgeCode: "BRIDGE_BASE_URL_MISSING",
        code: "BRIDGE_BASE_URL_MISSING",
        message: "Project Owner Campaign API base URL is missing.",
        retryable: false,
        traceId,
      })),
      traceId,
    };
  }

  if (!authSessionIsUsable(input.context.session)) {
    return invalidInputFailure(traceId, "session");
  }

  const timeout = createManagedAbortSignal(input.context.signal, config.timeoutMs);
  const url = endpointUrl(config.baseUrl, input.path, input.query);
  const headers: Record<string, string> = {
    accept: "application/json",
    ...(input.body !== undefined ? { "content-type": "application/json" } : {}),
    ...(input.requiresAuth ? sessionAuthHeaders(input.context.session) : {}),
    "x-campaign-os-trace-id": traceId,
  };

  try {
    const response = await fetchImpl(url, {
      ...(input.body !== undefined ? { body: JSON.stringify(input.body) } : {}),
      headers,
      method: input.method,
      signal: timeout.signal,
    });
    const parsed = await parseResponseBody(
      response,
      config.maxResponseBytes,
      traceId,
      input.path,
      input.method,
    );

    if (!parsed.ok) {
      return parsed;
    }

    if (!successStatuses.has(response.status) || !response.ok) {
      return normalizeHttpError(parsed.body, response.status, parsed.traceId, input.path, input.method);
    }

    if (!isRuntimeEnvelope(parsed.body)) {
      return invalidResponseFailure(parsed.traceId, response.status, input.path, "runtime_envelope");
    }

    if (parsed.body.ok === false) {
      return normalizeHttpError(parsed.body, response.status, parsed.traceId, input.path, input.method);
    }

    return {
      body: parsed.body,
      httpStatus: response.status,
      ok: true,
      traceId: parsed.traceId,
    };
  } catch (error) {
    const bridgeCode = isAbortError(error) ? timeout.abortCode() : "BRIDGE_REQUEST_FAILED";
    const retryable = bridgeCode !== "BRIDGE_REQUEST_ABORTED";

    return failure({
      bridgeCode,
      code: bridgeCode === "BRIDGE_REQUEST_FAILED" ? "PERSISTENCE_UNAVAILABLE" : bridgeCode,
      message: bridgeCode === "BRIDGE_REQUEST_FAILED"
        ? "Project Owner Campaign API request failed."
        : bridgeCode === "BRIDGE_REQUEST_TIMEOUT"
          ? "Project Owner Campaign API request timed out."
          : "Project Owner Campaign API request was aborted.",
      retryable,
      safeDetails: {
        endpoint: input.path,
        method: input.method,
        reason: sanitizeProjectOwnerCampaignApiText(error),
      },
      traceId,
    });
  } finally {
    timeout.clear();
  }
};

const invalidResponseFailure = (
  traceId: string,
  httpStatus: number,
  endpoint: string,
  reason: string,
): OwnerCampaignFailure => failure({
  bridgeCode: "BRIDGE_RESPONSE_INVALID",
  code: "BRIDGE_RESPONSE_INVALID",
  httpStatus,
  message: "Project Owner Campaign API response shape was not recognized.",
  retryable: false,
  safeDetails: { endpoint, reason, status: httpStatus },
  traceId,
});

const campaignProjectionFromValue = (
  value: unknown,
  expected: {
    campaignId?: string;
    ownerAddress?: string;
  } = {},
): OwnerCampaignProjection | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = optionalRawStringField(value, "id");
  const projectId = optionalStringField(value, "projectId");
  const ownerAddress = optionalStringField(value, "ownerAddress");
  const status = optionalStringField(value, "status");

  if (!isCanonicalCampaignId(id) || !projectId || !ownerAddress || !status) {
    return undefined;
  }

  if (expected.campaignId && id !== expected.campaignId) {
    return undefined;
  }

  if (expected.ownerAddress && !sameIdentity(ownerAddress, expected.ownerAddress)) {
    return undefined;
  }

  return {
    ...(optionalStringField(value, "createdAt") ? { createdAt: optionalStringField(value, "createdAt") } : {}),
    id: toCampaignId(id),
    ownerAddress,
    projectId,
    status,
    ...(optionalStringField(value, "updatedAt") ? { updatedAt: optionalStringField(value, "updatedAt") } : {}),
  };
};

const evidenceRuleFromValue = (value: unknown): Record<string, unknown> | undefined =>
  isRecord(value) ? { ...value } : undefined;

const taskProjectionFromValue = (
  value: unknown,
  expectedCampaignId: string,
): OwnerTaskProjection | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = optionalRawStringField(value, "id");
  const campaignId = optionalRawStringField(value, "campaignId");
  const templateCode = optionalStringField(value, "templateCode");
  const verificationType = optionalStringField(value, "verificationType");
  const walletCompatibility = optionalStringField(value, "walletCompatibility");
  const points = optionalNumberField(value, "points");
  const required = optionalBooleanField(value, "required");
  const evidenceRule = evidenceRuleFromValue(value.evidenceRule);

  if (
    !isCanonicalTaskId(id)
    || campaignId !== expectedCampaignId
    || !templateCode
    || !verificationType
    || !walletCompatibility
    || points === undefined
    || points < 0
    || required === undefined
    || !evidenceRule
  ) {
    return undefined;
  }

  return {
    campaignId: toCampaignId(campaignId),
    evidenceRule,
    id: toTaskId(id),
    points,
    required,
    templateCode,
    verificationType,
    walletCompatibility,
  };
};

const previewSuggestionFromValue = (
  value: unknown,
  expectedCampaignId: string,
): OwnerTaskPreviewSuggestion | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = optionalRawStringField(value, "id");
  const campaignId = optionalRawStringField(value, "campaignId") ?? expectedCampaignId;
  const templateCode = optionalStringField(value, "templateCode");
  const verificationType = optionalStringField(value, "verificationType");
  const walletCompatibility = optionalStringField(value, "walletCompatibility");
  const points = optionalNumberField(value, "points");
  const required = optionalBooleanField(value, "required");
  const evidenceRule = evidenceRuleFromValue(value.evidenceRule);

  if (
    !id
    || campaignId !== expectedCampaignId
    || !templateCode
    || !verificationType
    || !walletCompatibility
    || points === undefined
    || points < 0
    || required === undefined
    || !evidenceRule
  ) {
    return undefined;
  }

  const unsupported = !supportedSuggestionVerificationTypes.has(verificationType);
  const serverAdoptable = optionalBooleanField(value, "adoptable") === true;
  const adoptable = unsupported ? false : serverAdoptable;
  const rejectionCode = unsupported
    ? "UNSUPPORTED_VERIFICATION_TYPE"
    : !adoptable
      ? optionalStringField(value, "rejectionCode") ?? "UNSUPPORTED_SUGGESTION"
      : optionalStringField(value, "rejectionCode");

  return {
    adoptable,
    campaignId: toCampaignId(campaignId),
    evidenceRule,
    id: toPreviewSuggestionId(id),
    points,
    ...(rejectionCode ? { rejectionCode } : {}),
    required,
    templateCode,
    verificationType,
    walletCompatibility,
  };
};

const normalizeCreateCampaign = (
  result: RequestAdapterResult,
  session: NormalizedWalletSession,
): OwnerCampaignResult => {
  if (!result.ok) {
    return result;
  }

  const payload = payloadRecord(result.body);
  const campaign = campaignProjectionFromValue(payload, { ownerAddress: session.address });

  if (!campaign) {
    return invalidResponseFailure(result.traceId, result.httpStatus, "/api/campaigns", "campaign_payload");
  }

  return {
    campaign,
    campaignId: campaign.id,
    httpStatus: result.httpStatus,
    ok: true,
    traceId: result.traceId,
  };
};

const normalizeRecoverCampaigns = (
  result: RequestAdapterResult,
  projectId: string,
  session: NormalizedWalletSession,
): OwnerCampaignListResult => {
  if (!result.ok) {
    return result;
  }

  const data = dataRecord(result.body);
  const items = data?.items;

  if (!Array.isArray(items) || items.length > 100) {
    return invalidResponseFailure(result.traceId, result.httpStatus, "/api/projects/:projectId/campaigns", "items");
  }

  const campaigns = items.map((item) =>
    campaignProjectionFromValue(item, { ownerAddress: session.address }),
  );

  if (campaigns.some((campaign) => !campaign) || campaigns.some((campaign) => campaign?.projectId !== projectId)) {
    return invalidResponseFailure(result.traceId, result.httpStatus, "/api/projects/:projectId/campaigns", "campaign_items");
  }

  return {
    campaigns: campaigns as OwnerCampaignProjection[],
    httpStatus: result.httpStatus,
    ok: true,
    traceId: result.traceId,
  };
};

const normalizeCampaignDetail = (
  result: RequestAdapterResult,
  campaignId: string,
): OwnerCampaignDetailResult => {
  if (!result.ok) {
    return result;
  }

  const payload = payloadRecord(result.body);
  const item = payload?.item;
  const campaign = campaignProjectionFromValue(item, { campaignId });
  const tasks = isRecord(item) && Array.isArray(item.tasks)
    ? item.tasks.map((task) => taskProjectionFromValue(task, campaignId))
    : undefined;

  if (!campaign || !tasks || tasks.some((task) => !task)) {
    return invalidResponseFailure(result.traceId, result.httpStatus, "/api/campaigns/:campaignId", "detail_payload");
  }

  return {
    campaign,
    httpStatus: result.httpStatus,
    ok: true,
    tasks: tasks as OwnerTaskProjection[],
    traceId: result.traceId,
  };
};

const normalizeTaskMutation = (
  result: RequestAdapterResult,
  campaignId: string,
): OwnerTaskResult => {
  if (!result.ok) {
    return result;
  }

  const payload = payloadRecord(result.body);
  const task = taskProjectionFromValue(payload, campaignId);

  if (!task) {
    return invalidResponseFailure(result.traceId, result.httpStatus, "/api/campaigns/:campaignId/tasks", "task_payload");
  }

  return {
    httpStatus: result.httpStatus,
    ok: true,
    task,
    taskId: task.id,
    traceId: result.traceId,
  };
};

const normalizeTaskPreview = (
  result: RequestAdapterResult,
  campaignId: string,
): OwnerTaskPreviewResult => {
  if (!result.ok) {
    return result;
  }

  const payload = payloadRecord(result.body);
  const payloadCampaignId = payload ? optionalRawStringField(payload, "campaignId") : undefined;
  const humanReviewRequired = payload ? optionalBooleanField(payload, "humanReviewRequired") : undefined;
  const taskList = payload?.taskList;

  if (payloadCampaignId !== campaignId || humanReviewRequired !== true || !Array.isArray(taskList) || taskList.length > 20) {
    return invalidResponseFailure(
      result.traceId,
      result.httpStatus,
      "/api/campaigns/:campaignId/tasks/generate",
      "preview_payload",
    );
  }

  const suggestions = taskList.map((task) => previewSuggestionFromValue(task, campaignId));

  if (suggestions.some((suggestion) => !suggestion)) {
    return invalidResponseFailure(
      result.traceId,
      result.httpStatus,
      "/api/campaigns/:campaignId/tasks/generate",
      "preview_suggestions",
    );
  }

  return {
    httpStatus: result.httpStatus,
    ok: true,
    preview: {
      campaignId: toCampaignId(campaignId),
      humanReviewRequired: true,
      suggestions: suggestions as OwnerTaskPreviewSuggestion[],
    },
    traceId: result.traceId,
  };
};

const createCampaignBody = (
  input: CreateOwnerCampaignInput,
  session: NormalizedWalletSession,
): Record<string, unknown> => ({
  ...(input.contractMode ? { contractMode: input.contractMode } : {}),
  ...(input.defaultLocale ? { defaultLocale: input.defaultLocale } : {}),
  duration: input.duration,
  endTime: input.endTime,
  goal: input.goal,
  ...(input.metadataHash ? { metadataHash: input.metadataHash } : {}),
  ...(input.metadataUri ? { metadataUri: input.metadataUri } : {}),
  ownerAddress: session.address,
  projectId: input.projectId,
  rewardDescription: input.rewardDescription,
  ...(input.rewardDisclaimerHash ? { rewardDisclaimerHash: input.rewardDisclaimerHash } : {}),
  startTime: input.startTime,
  ...(input.status ? { status: input.status } : {}),
  ...(input.supportedLocales ? { supportedLocales: [...input.supportedLocales] } : {}),
  ...(input.walletPolicy ? { walletPolicy: input.walletPolicy } : {}),
});

const taskMutationBody = (input: AddOwnerCampaignTaskInput): Record<string, unknown> => ({
  evidenceRule: input.evidenceRule,
  points: input.points,
  required: input.required,
  templateCode: input.templateCode,
  verificationType: input.verificationType,
  walletCompatibility: input.walletCompatibility,
});

const generatePreviewBody = (input: GenerateOwnerTaskPreviewInput): Record<string, unknown> => ({
  goal: input.goal,
  product: input.product,
  targetUsers: [...input.targetUsers],
  walletPolicy: input.walletPolicy,
});

const boundedRecoverQuery = (input: RecoverOwnerCampaignsInput | undefined): Record<string, string | undefined> => {
  const status = input?.status && recoverStatuses.has(input.status) ? input.status : undefined;
  const limit = Number.isFinite(input?.limit)
    ? Math.min(100, Math.max(1, Math.trunc(input?.limit ?? 100))).toString()
    : undefined;

  return {
    status,
    limit,
  };
};

const pathSegment = (value: string) => encodeURIComponent(value.trim());

export const createProjectOwnerCampaignApiBridge = (
  options: ProjectOwnerCampaignApiBridgeFactoryOptions = {},
): ProjectOwnerCampaignApiBridge => {
  const config = normalizeConfig(options.config);
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);

  return {
    addTask: async (campaignId, input, context) => {
      const normalizedCampaignId = rawNonEmptyText(campaignId);

      if (!normalizedCampaignId) {
        const traceId = makeTraceId("addTask", context, config, options.traceIdGenerator);

        return invalidInputFailure(traceId, "campaignId");
      }

      const result = await requestAdapter({
        body: taskMutationBody(input),
        context,
        method: "POST",
        operation: "addTask",
        path: `/api/campaigns/${pathSegment(normalizedCampaignId)}/tasks`,
        requiresAuth: true,
      }, config, fetchImpl, options.traceIdGenerator);

      return normalizeTaskMutation(result, normalizedCampaignId);
    },

    createCampaign: async (input, context) => {
      if (!rawNonEmptyText(input.projectId) || !rawNonEmptyText(input.goal)) {
        const traceId = makeTraceId("createCampaign", context, config, options.traceIdGenerator);

        return invalidInputFailure(traceId, "projectId");
      }

      const result = await requestAdapter({
        body: createCampaignBody(input, context.session),
        context,
        method: "POST",
        operation: "createCampaign",
        path: "/api/campaigns",
        requiresAuth: true,
      }, config, fetchImpl, options.traceIdGenerator);

      return normalizeCreateCampaign(result, context.session);
    },

    generateTaskPreview: async (campaignId, input, context) => {
      const normalizedCampaignId = rawNonEmptyText(campaignId);

      if (!normalizedCampaignId) {
        const traceId = makeTraceId("generateTaskPreview", context, config, options.traceIdGenerator);

        return invalidInputFailure(traceId, "campaignId");
      }

      const result = await requestAdapter({
        body: generatePreviewBody(input),
        context,
        method: "POST",
        operation: "generateTaskPreview",
        path: `/api/campaigns/${pathSegment(normalizedCampaignId)}/tasks/generate`,
        requiresAuth: true,
      }, config, fetchImpl, options.traceIdGenerator);

      return normalizeTaskPreview(result, normalizedCampaignId);
    },

    getCampaignDetail: async (campaignId, context) => {
      const normalizedCampaignId = rawNonEmptyText(campaignId);

      if (!normalizedCampaignId) {
        const traceId = makeTraceId("getCampaignDetail", context, config, options.traceIdGenerator);

        return invalidInputFailure(traceId, "campaignId");
      }

      const result = await requestAdapter({
        context,
        method: "GET",
        operation: "getCampaignDetail",
        path: `/api/campaigns/${pathSegment(normalizedCampaignId)}`,
        requiresAuth: false,
      }, config, fetchImpl, options.traceIdGenerator);

      return normalizeCampaignDetail(result, normalizedCampaignId);
    },

    recoverCampaigns: async (projectId, context, input) => {
      const normalizedProjectId = rawNonEmptyText(projectId);

      if (!normalizedProjectId) {
        const traceId = makeTraceId("recoverCampaigns", context, config, options.traceIdGenerator);

        return invalidInputFailure(traceId, "projectId");
      }

      const result = await requestAdapter({
        context,
        method: "GET",
        operation: "recoverCampaigns",
        path: `/api/projects/${pathSegment(normalizedProjectId)}/campaigns`,
        query: boundedRecoverQuery(input),
        requiresAuth: true,
      }, config, fetchImpl, options.traceIdGenerator);

      return normalizeRecoverCampaigns(result, normalizedProjectId, context.session);
    },
  };
};
