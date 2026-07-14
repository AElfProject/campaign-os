import type {
  AccountType,
  CampaignStatus,
  LocalizedText,
  NormalizedWalletSession,
  SupportedLocale,
  VerificationType,
  WalletCompatibility,
  WalletPolicy,
  WalletSource,
} from "../domain/types";
import {
  createWalletSessionAuthHeaders,
  mergeWalletSessionAuthHeaders,
} from "./walletSessionAuthHeaders";

export type ParticipantJourneyMode = "durable" | "seeded_preview";
export type ParticipantJourneyApiFetch = typeof fetch;
export type ParticipantJourneyOperation = "getJourney" | "listCampaigns" | "verifyTask";
export type ParticipantJourneyResultSource = "durable" | "seeded_preview";
export type ParticipantJourneyFailureStatus = "blocked" | "degraded";
export type ParticipantJourneyFailurePhase =
  | "auth"
  | "config"
  | "identity"
  | "request"
  | "response";

export type ParticipantJourneyBridgeCode =
  | "BRIDGE_AUTH_HEADER_CONFLICT"
  | "BRIDGE_BASE_URL_INVALID"
  | "BRIDGE_BASE_URL_MISSING"
  | "BRIDGE_INVALID_INPUT"
  | "BRIDGE_REQUEST_ABORTED"
  | "BRIDGE_REQUEST_FAILED"
  | "BRIDGE_REQUEST_TIMEOUT"
  | "BRIDGE_RESPONSE_EMPTY"
  | "BRIDGE_RESPONSE_IDENTITY_MISMATCH"
  | "BRIDGE_RESPONSE_INVALID"
  | "BRIDGE_RESPONSE_NON_JSON"
  | "BRIDGE_RESPONSE_OVERSIZE"
  | "BRIDGE_SEEDED_PREVIEW_UNAVAILABLE"
  | "BRIDGE_SESSION_INVALID";

export type ParticipantJourneyErrorCode = ParticipantJourneyBridgeCode | (string & {});

export interface ParticipantJourneyApiConfig {
  baseUrl?: string;
  headers?: HeadersInit;
  maxResponseBytes?: number;
  timeoutMs?: number;
  tracePrefix?: string;
}

export interface ParticipantJourneyContext {
  mode: ParticipantJourneyMode;
  selectedCampaignId: string | null;
  session: NormalizedWalletSession | null;
  signal?: AbortSignal;
  traceId?: string;
}

export interface ParticipantJourneyRepositoryMetadata {
  adapterId: string;
  createdViaRepository: true;
  repositoryId: string;
  storeId: "campaign-db";
}

export type ParticipantCampaignVisibility = "participant_preview" | "public";

export interface ParticipantCampaignFeedItem {
  campaignId: string;
  endTime?: string;
  goal?: string;
  projectId?: string;
  repository: ParticipantJourneyRepositoryMetadata;
  rewardDescription?: string;
  startTime?: string;
  status: CampaignStatus;
  subtitle?: LocalizedText;
  taskCount?: number;
  title?: LocalizedText;
  visibility: ParticipantCampaignVisibility;
  walletPolicy?: WalletPolicy;
}

export interface ParticipantJourneyCampaign {
  campaignId: string;
  endTime: string;
  goal: string;
  projectId: string;
  rewardDescription: string;
  startTime: string;
  status: CampaignStatus;
  taskCount: number;
  walletPolicy: WalletPolicy;
}

export interface ParticipantJourneyDiagnostic {
  code: string;
  scope: "participant" | "snapshot" | "task";
  taskId?: string;
}

export interface ParticipantJourneyParticipant {
  accountType: AccountType;
  campaignId: string;
  localePreference: SupportedLocale;
  participantId: string | null;
  riskFlags: readonly string[];
  totalPoints: number;
  walletAddress: string;
  walletSource: WalletSource;
  walletTypeVerified: boolean;
}

export interface ParticipantJourneyRanking {
  campaignId: string;
  participantCount: number;
  rank: number | null;
  source: "repository_projection";
  totalPoints: number;
  walletAddress: string;
}

export interface ParticipantJourneyEligibility {
  accountType: AccountType;
  campaignId: string;
  eligible: boolean;
  localePreference: SupportedLocale;
  missingTasks: readonly string[];
  riskFlags: readonly string[];
  score: number;
  status: "eligible" | "not_eligible" | "pending" | "risk_flagged";
  walletAddress: string;
  walletSource: WalletSource;
  walletTypeVerified: boolean;
}

export interface ParticipantJourneyTask {
  action: "await_review" | "blocked" | "completed" | "retry" | "verify";
  blockedReason: "inconsistent_records" | "wallet_incompatible" | null;
  campaignId: string;
  completionId: string | null;
  evidenceId: string | null;
  evidenceSource: "AEFINDER" | "AELFSCAN" | "DAPP_API" | "MANUAL" | "SOCIAL_API" | null;
  pointsAvailable: number;
  pointsAwarded: number;
  required: boolean;
  status: "completed" | "failed" | "manual_review" | "not_started" | "pending";
  taskId: string;
  templateCode: string;
  updatedAt: string | null;
  verificationType: VerificationType;
  walletCompatibility: WalletCompatibility;
}

export interface ParticipantJourneyProjection {
  campaign: ParticipantJourneyCampaign;
  diagnostics: readonly ParticipantJourneyDiagnostic[];
  eligibility: ParticipantJourneyEligibility;
  participant: ParticipantJourneyParticipant;
  ranking: ParticipantJourneyRanking;
  repository: ParticipantJourneyRepositoryMetadata;
  tasks: readonly ParticipantJourneyTask[];
}

export interface ParticipantVerificationCompletion {
  accountType: AccountType;
  campaignId: string;
  evidenceId: string;
  id: string;
  pointsAwarded: number;
  status: "completed" | "failed" | "manual_review" | "pending";
  taskId: string;
  walletAddress: string;
  walletSource: WalletSource;
}

export interface ParticipantVerificationEvidence {
  accountType: AccountType;
  campaignId: string;
  completionId: string;
  id: string;
  pointsAwarded: number;
  status: "completed" | "failed" | "manual_review" | "pending";
  taskId: string;
  walletAddress: string;
  walletSource: WalletSource;
}

export interface ParticipantVerificationParticipant {
  accountType: AccountType;
  campaignId: string;
  id: string;
  totalPoints: number;
  walletAddress: string;
  walletSource: WalletSource;
}

export interface ParticipantVerificationProjection {
  completion: ParticipantVerificationCompletion;
  evidence: ParticipantVerificationEvidence;
  participant?: ParticipantVerificationParticipant;
  repository: ParticipantJourneyRepositoryMetadata;
}

export interface ParticipantJourneyFailure {
  bridgeCode?: ParticipantJourneyBridgeCode;
  code: ParticipantJourneyErrorCode;
  httpStatus?: number;
  ok: false;
  phase: ParticipantJourneyFailurePhase;
  reconnectRequired: boolean;
  retryable: boolean;
  safeDetails?: Readonly<Record<string, boolean | number | string>>;
  source: ParticipantJourneyResultSource;
  status: ParticipantJourneyFailureStatus;
  traceId: string;
}

export interface ParticipantCampaignListSuccess {
  campaigns: readonly ParticipantCampaignFeedItem[];
  httpStatus: number;
  ok: true;
  source: ParticipantJourneyResultSource;
  status: "success";
  traceId: string;
}

export interface ParticipantJourneySuccess {
  httpStatus: number;
  journey: ParticipantJourneyProjection;
  ok: true;
  source: ParticipantJourneyResultSource;
  status: "success";
  traceId: string;
}

export interface ParticipantVerifySuccess {
  httpStatus: number;
  ok: true;
  source: ParticipantJourneyResultSource;
  status: "success";
  traceId: string;
  verification: ParticipantVerificationProjection;
}

export type ParticipantCampaignListResult = ParticipantCampaignListSuccess | ParticipantJourneyFailure;
export type ParticipantJourneyResult = ParticipantJourneySuccess | ParticipantJourneyFailure;
export type ParticipantVerifyResult = ParticipantVerifySuccess | ParticipantJourneyFailure;

export interface ParticipantJourneyApiBridge {
  getJourney(context: ParticipantJourneyContext): Promise<ParticipantJourneyResult>;
  listCampaigns(context: ParticipantJourneyContext): Promise<ParticipantCampaignListResult>;
  verifyTask(taskId: string, context: ParticipantJourneyContext): Promise<ParticipantVerifyResult>;
}

export interface ParticipantJourneyApiBridgeFactoryOptions {
  config?: ParticipantJourneyApiConfig;
  fetchImpl?: ParticipantJourneyApiFetch;
  seededPreviewBridge?: ParticipantJourneyApiBridge;
  traceIdGenerator?: (operation: ParticipantJourneyOperation) => string;
}

interface NormalizedConfig {
  baseUrl?: URL;
  configCode?: Extract<ParticipantJourneyBridgeCode, "BRIDGE_BASE_URL_INVALID" | "BRIDGE_BASE_URL_MISSING">;
  headers?: HeadersInit;
  maxResponseBytes: number;
  timeoutMs: number;
  tracePrefix: string;
}

interface RequestInput {
  body?: unknown;
  context: ParticipantJourneyContext;
  method: "GET" | "POST";
  operation: ParticipantJourneyOperation;
  path: string;
}

interface RequestSuccess {
  body: Record<string, unknown>;
  httpStatus: number;
  ok: true;
  traceId: string;
}

type RequestResult = ParticipantJourneyFailure | RequestSuccess;
type NormalizationFailureReason = "identity" | "invalid";
type NormalizationResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: NormalizationFailureReason };

const defaultTimeoutMs = 5_000;
const defaultMaxResponseBytes = 256_000;
const maxConfiguredTimeoutMs = 30_000;
const maxConfiguredResponseBytes = 1_000_000;
const maxIdentityLength = 256;
const maxTextLength = 4_096;
const maxCollectionLength = 500;
const safeCodePattern = /^[A-Z][A-Z0-9_]{1,127}$/u;
const unsafeCodeFragmentPattern = /(?:^|_)(?:API_?KEY|PASSWORD|PRIVATE_?KEY|RAW_?SIGNATURE|SECRET|STACK|TOKEN)(?:_|$)/u;
const safeTracePattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const campaignStatuses = new Set<CampaignStatus>([
  "ai_draft",
  "archived",
  "draft",
  "ended",
  "exported",
  "human_review",
  "live",
  "paused",
  "scheduled",
]);
const accountTypes = new Set<AccountType>(["AA", "EOA"]);
const walletSources = new Set<WalletSource>([
  "AGENT_SKILL",
  "NIGHTELF",
  "OTHER",
  "PORTKEY_AA",
  "PORTKEY_EOA_APP",
  "PORTKEY_EOA_EXTENSION",
]);
const supportedLocales = new Set<SupportedLocale>([
  "en-US",
  "es-ES",
  "id-ID",
  "ja-JP",
  "ko-KR",
  "tr-TR",
  "vi-VN",
  "zh-CN",
  "zh-TW",
]);
const walletPolicies = new Set<WalletPolicy>(["AA_ONLY", "ANY", "EOA_ONLY"]);
const verificationTypes = new Set<VerificationType>(["DAPP_API", "MANUAL", "ON_CHAIN", "SOCIAL", "WALLET"]);
const walletCompatibilities = new Set<WalletCompatibility>(["AA_ONLY", "ANY", "EOA_ONLY"]);
const taskActions = new Set<ParticipantJourneyTask["action"]>([
  "await_review",
  "blocked",
  "completed",
  "retry",
  "verify",
]);
const taskStatuses = new Set<ParticipantJourneyTask["status"]>([
  "completed",
  "failed",
  "manual_review",
  "not_started",
  "pending",
]);
const verificationStatuses = new Set<ParticipantVerificationCompletion["status"]>([
  "completed",
  "failed",
  "manual_review",
  "pending",
]);
const evidenceSources = new Set<NonNullable<ParticipantJourneyTask["evidenceSource"]>>([
  "AEFINDER",
  "AELFSCAN",
  "DAPP_API",
  "MANUAL",
  "SOCIAL_API",
]);
const eligibilityStatuses = new Set<ParticipantJourneyEligibility["status"]>([
  "eligible",
  "not_eligible",
  "pending",
  "risk_flagged",
]);

const unsafePatterns: ReadonlyArray<readonly [RegExp, string]> = [
  [/\braw[-_\s]*signature\b/giu, "redacted credential"],
  [/\b(wallet[-_\s]*)?private[-_\s]*key\b/giu, "redacted key"],
  [/\bseed[-_\s]*phrase\b/giu, "redacted phrase"],
  [/\bbearer\s+[A-Za-z0-9._~+/=-]+/giu, "redacted bearer credential"],
  [/\b(token|access_token|refresh_token|api_key|apikey)=([^&\s"'<>]+)/giu, "redacted query credential"],
  [/\b(postgres|postgresql|redis):\/\/[^"'\s<>]+/giu, "redacted service URL"],
  [/(?:\/home\/[^/"'\s<>]+|\/Users\/[^/"'\s<>]+)(?:\/[^"'\s<>]*)?/gu, "redacted private path"],
  [/(?:\/private\/(?:tmp|var\/folders)|\/tmp|\/var\/folders)(?:\/[^"'\s<>]*)?/gu, "redacted private path"],
  [/\bstack(?:\s+trace)?\b/giu, "redacted diagnostic"],
];

const diagnosticText = (value: unknown): string => {
  try {
    if (typeof value === "string") {
      return value;
    }
    if (value instanceof Error) {
      return `${value.name}: ${value.message}`;
    }

    const seen = new WeakSet<object>();
    return JSON.stringify(value ?? "", (_key, current: unknown) => {
      if (typeof current === "bigint" || typeof current === "function" || typeof current === "symbol") {
        return String(current);
      }
      if (current && typeof current === "object") {
        if (seen.has(current)) {
          return "[Circular]";
        }
        seen.add(current);
      }
      return current;
    }) ?? "";
  } catch {
    return "[Unserializable]";
  }
};

export const sanitizeParticipantJourneyApiText = (value: unknown): string => {
  const withoutQuery = diagnosticText(value).replace(/\?[^"'\s<>]*/gu, "?redacted-query");

  return unsafePatterns.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    withoutQuery,
  );
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const abortSignalAbortedGetter = Object.getOwnPropertyDescriptor(
  AbortSignal.prototype,
  "aborted",
)?.get;

type ContextSignalResult =
  | { aborted: boolean; ok: true; signal?: AbortSignal }
  | { ok: false };

const normalizeContextSignal = (context: Record<string, unknown>): ContextSignalResult => {
  try {
    const candidate = context.signal;
    if (candidate === undefined) {
      return { aborted: false, ok: true };
    }
    if (
      !candidate
      || typeof candidate !== "object"
      || !abortSignalAbortedGetter
      || typeof (candidate as AbortSignal).addEventListener !== "function"
      || typeof (candidate as AbortSignal).removeEventListener !== "function"
    ) {
      return { ok: false };
    }

    const aborted = abortSignalAbortedGetter.call(candidate);
    return typeof aborted === "boolean"
      ? { aborted, ok: true, signal: candidate as AbortSignal }
      : { ok: false };
  } catch {
    return { ok: false };
  }
};

const text = (value: unknown, maxLength = maxTextLength): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0
    && normalized.length <= maxLength
    && !/[\u0000-\u001f\u007f-\u009f]/u.test(normalized)
    ? normalized
    : undefined;
};

const identity = (value: unknown): string | undefined => text(value, maxIdentityLength);

const nonNegativeInteger = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;

const positiveInteger = (value: unknown): number | undefined => {
  const normalized = nonNegativeInteger(value);
  return normalized !== undefined && normalized > 0 ? normalized : undefined;
};

const booleanValue = (value: unknown): boolean | undefined =>
  typeof value === "boolean" ? value : undefined;

const enumValue = <T extends string>(value: unknown, values: ReadonlySet<T>): T | undefined => {
  const normalized = text(value, 128);
  return normalized && values.has(normalized as T) ? normalized as T : undefined;
};

const nullableText = (value: unknown): string | null | undefined =>
  value === null ? null : identity(value);

const boundedTextList = (value: unknown): readonly string[] | undefined => {
  if (!Array.isArray(value) || value.length > maxCollectionLength) {
    return undefined;
  }
  const normalized = value.map((item) => text(item, maxIdentityLength));
  return normalized.every(Boolean) ? normalized as string[] : undefined;
};

const normalizeLocalizedText = (value: unknown): LocalizedText | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  const english = text(value["en-US"]);
  if (!english) {
    return undefined;
  }

  const normalized: LocalizedText = { "en-US": english };
  for (const locale of supportedLocales) {
    if (locale === "en-US" || value[locale] === undefined) {
      continue;
    }
    const localized = text(value[locale]);
    if (!localized) {
      return undefined;
    }
    normalized[locale] = localized;
  }
  return normalized;
};

const normalizeRepository = (value: unknown): ParticipantJourneyRepositoryMetadata | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  const adapterId = identity(value.adapterId);
  const repositoryId = identity(value.repositoryId);

  return adapterId
    && repositoryId
    && value.createdViaRepository === true
    && value.storeId === "campaign-db"
    ? {
        adapterId,
        createdViaRepository: true,
        repositoryId,
        storeId: "campaign-db",
      }
    : undefined;
};

const failure = (input: {
  bridgeCode?: ParticipantJourneyBridgeCode;
  code: ParticipantJourneyErrorCode;
  httpStatus?: number;
  phase: ParticipantJourneyFailurePhase;
  safeDetails?: Readonly<Record<string, boolean | number | string>>;
  source?: ParticipantJourneyResultSource;
  status?: ParticipantJourneyFailureStatus;
  traceId: string;
}): ParticipantJourneyFailure => ({
  ...(input.bridgeCode ? { bridgeCode: input.bridgeCode } : {}),
  code: input.code,
  ...(input.httpStatus === undefined ? {} : { httpStatus: input.httpStatus }),
  ok: false,
  phase: input.phase,
  reconnectRequired: input.httpStatus === 401,
  retryable: input.code === "BRIDGE_REQUEST_FAILED"
    || input.code === "BRIDGE_REQUEST_TIMEOUT"
    || input.httpStatus === 503
    || (input.httpStatus !== undefined && input.httpStatus >= 500),
  ...(input.safeDetails ? { safeDetails: input.safeDetails } : {}),
  source: input.source ?? "durable",
  status: input.status ?? (
    input.code === "BRIDGE_REQUEST_FAILED"
    || input.code === "BRIDGE_REQUEST_TIMEOUT"
    || input.code === "BRIDGE_RESPONSE_EMPTY"
    || input.code === "BRIDGE_RESPONSE_NON_JSON"
    || input.code === "BRIDGE_RESPONSE_OVERSIZE"
    || (input.httpStatus !== undefined && input.httpStatus >= 500)
      ? "degraded"
      : "blocked"
  ),
  traceId: input.traceId,
});

const bridgeFailure = (
  code: ParticipantJourneyBridgeCode,
  phase: ParticipantJourneyFailurePhase,
  traceId: string,
  extras: Partial<Pick<ParticipantJourneyFailure, "httpStatus" | "safeDetails" | "source" | "status">> = {},
): ParticipantJourneyFailure => failure({ bridgeCode: code, code, phase, traceId, ...extras });

const normalizedPositiveConfig = (value: unknown, fallback: number, maximum: number): number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? Math.min(value, maximum)
    : fallback;

const normalizeConfig = (config: ParticipantJourneyApiConfig | undefined): NormalizedConfig => {
  const timeoutMs = normalizedPositiveConfig(config?.timeoutMs, defaultTimeoutMs, maxConfiguredTimeoutMs);
  const maxResponseBytes = normalizedPositiveConfig(
    config?.maxResponseBytes,
    defaultMaxResponseBytes,
    maxConfiguredResponseBytes,
  );
  const tracePrefix = text(config?.tracePrefix, 64)?.replace(/[^A-Za-z0-9._-]/gu, "-")
    ?? "participant-journey";
  const rawBaseUrl = text(config?.baseUrl, 2_048);

  if (!rawBaseUrl) {
    return {
      configCode: "BRIDGE_BASE_URL_MISSING",
      headers: config?.headers,
      maxResponseBytes,
      timeoutMs,
      tracePrefix,
    };
  }

  try {
    const baseUrl = new URL(rawBaseUrl);

    if (
      (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:")
      || baseUrl.username
      || baseUrl.password
    ) {
      return {
        configCode: "BRIDGE_BASE_URL_INVALID",
        headers: config?.headers,
        maxResponseBytes,
        timeoutMs,
        tracePrefix,
      };
    }

    baseUrl.search = "";
    baseUrl.hash = "";

    return { baseUrl, headers: config?.headers, maxResponseBytes, timeoutMs, tracePrefix };
  } catch {
    return {
      configCode: "BRIDGE_BASE_URL_INVALID",
      headers: config?.headers,
      maxResponseBytes,
      timeoutMs,
      tracePrefix,
    };
  }
};

const safeTraceId = (value: unknown): string | undefined => {
  const normalized = text(value, 128);
  return normalized && safeTracePattern.test(normalized) ? normalized : undefined;
};

const requestTraceId = (
  operation: ParticipantJourneyOperation,
  context: unknown,
  config: NormalizedConfig,
  generator?: (operation: ParticipantJourneyOperation) => string,
): string => {
  try {
    if (isRecord(context)) {
      const contextual = safeTraceId(context.traceId);
      if (contextual) {
        return contextual;
      }
    }

    const generated = safeTraceId(generator?.(operation));
    if (generated) {
      return generated;
    }
  } catch {
    // Fall through to a local opaque request identifier.
  }

  return `${config.tracePrefix}-${operation}-${Date.now().toString(36)}`;
};

const endpointUrl = (baseUrl: URL, path: string): string => new URL(path, baseUrl).toString();

const responseHeader = (response: Response, name: string): string | undefined => {
  try {
    return safeTraceId(response.headers.get(name));
  } catch {
    return undefined;
  }
};

const responseTraceId = (response: Response, body: unknown, requestId: string): string => {
  const headerTrace = responseHeader(response, "x-campaign-os-trace-id");
  if (headerTrace) {
    return headerTrace;
  }
  return isRecord(body) ? safeTraceId(body.traceId) ?? requestId : requestId;
};

class ResponseReadFailure extends Error {
  readonly code: Extract<
    ParticipantJourneyBridgeCode,
    "BRIDGE_REQUEST_ABORTED" | "BRIDGE_RESPONSE_EMPTY" | "BRIDGE_RESPONSE_NON_JSON" | "BRIDGE_RESPONSE_OVERSIZE"
  >;

  constructor(code: ResponseReadFailure["code"]) {
    super(code);
    this.code = code;
  }
}

const cancelResponseBody = async (response: Response): Promise<void> => {
  try {
    await response.body?.cancel();
  } catch {
    // Preserve the protocol failure when best-effort stream cleanup also fails.
  }
};

const boundedResponseText = async (
  response: Response,
  maxBytes: number,
  signal: AbortSignal,
): Promise<string> => {
  const rawContentLength = response.headers.get("content-length");

  if (rawContentLength !== null) {
    const contentLength = Number(rawContentLength);
    if (!Number.isSafeInteger(contentLength) || contentLength < 0 || contentLength > maxBytes) {
      await cancelResponseBody(response);
      throw new ResponseReadFailure("BRIDGE_RESPONSE_OVERSIZE");
    }
  }

  if (!response.body) {
    if (signal.aborted) {
      throw new ResponseReadFailure("BRIDGE_REQUEST_ABORTED");
    }
    const fallbackText = await response.text();
    if (new TextEncoder().encode(fallbackText).byteLength > maxBytes) {
      throw new ResponseReadFailure("BRIDGE_RESPONSE_OVERSIZE");
    }
    return fallbackText;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  const cancelOnAbort = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener("abort", cancelOnAbort, { once: true });

  try {
    while (true) {
      if (signal.aborted) {
        throw new ResponseReadFailure("BRIDGE_REQUEST_ABORTED");
      }
      const chunk = await reader.read();
      if (chunk.done) {
        break;
      }
      byteLength += chunk.value.byteLength;
      if (byteLength > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new ResponseReadFailure("BRIDGE_RESPONSE_OVERSIZE");
      }
      chunks.push(chunk.value);
    }
  } finally {
    signal.removeEventListener("abort", cancelOnAbort);
    reader.releaseLock();
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
};

const parseBoundedResponse = async (
  response: Response,
  maxBytes: number,
  signal: AbortSignal,
): Promise<Record<string, unknown>> => {
  let rawText: string;

  try {
    rawText = await boundedResponseText(response, maxBytes, signal);
  } catch (error) {
    if (error instanceof ResponseReadFailure) {
      throw error;
    }
    throw new ResponseReadFailure("BRIDGE_RESPONSE_NON_JSON");
  }

  if (!rawText.trim()) {
    throw new ResponseReadFailure("BRIDGE_RESPONSE_EMPTY");
  }

  try {
    const parsed: unknown = JSON.parse(rawText);
    if (!isRecord(parsed)) {
      throw new ResponseReadFailure("BRIDGE_RESPONSE_NON_JSON");
    }
    return parsed;
  } catch (error) {
    if (error instanceof ResponseReadFailure) {
      throw error;
    }
    throw new ResponseReadFailure("BRIDGE_RESPONSE_NON_JSON");
  }
};

const raceWithAbort = <T>(promise: PromiseLike<T>, signal: AbortSignal): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    let settled = false;
    const cleanup = () => signal.removeEventListener("abort", onAbort);
    const onAbort = () => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(new ResponseReadFailure("BRIDGE_REQUEST_ABORTED"));
    };

    if (signal.aborted) {
      onAbort();
      return;
    }

    signal.addEventListener("abort", onAbort, { once: true });
    Promise.resolve(promise).then(
      (value) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        resolve(value);
      },
      (error: unknown) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        reject(error);
      },
    );
  });

const safeErrorCode = (body: Record<string, unknown>, status: number): string => {
  const error = isRecord(body.error) ? body.error : undefined;
  const candidate = text(error?.code, 128);
  return candidate
    && safeCodePattern.test(candidate)
    && !unsafeCodeFragmentPattern.test(candidate)
    ? candidate
    : `HTTP_${status}`;
};

const safeErrorDetails = (
  body: Record<string, unknown>,
  status: number,
): Readonly<Record<string, boolean | number | string>> => {
  const error = isRecord(body.error) ? body.error : undefined;
  const details = isRecord(error?.details) ? error.details : undefined;
  const output: Record<string, boolean | number | string> = { status };

  for (const key of ["field", "reason"] as const) {
    const value = details?.[key];
    if (typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) {
      output[key] = value;
    } else {
      const normalized = text(value, maxIdentityLength);
      if (normalized) {
        output[key] = sanitizeParticipantJourneyApiText(normalized);
      }
    }
  }

  return Object.freeze(output);
};

const createManagedAbort = (externalSignal: AbortSignal | undefined, timeoutMs: number) => {
  const controller = new AbortController();
  let externalAborted = false;
  let timedOut = false;
  const onExternalAbort = () => {
    externalAborted = true;
    controller.abort();
  };
  externalSignal?.addEventListener("abort", onExternalAbort, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  return {
    cleanup: () => {
      clearTimeout(timer);
      externalSignal?.removeEventListener("abort", onExternalAbort);
    },
    controller,
    externalAborted: () => externalAborted,
    timedOut: () => timedOut,
  };
};

const executeRequest = async (
  input: RequestInput,
  config: NormalizedConfig,
  fetchImpl: ParticipantJourneyApiFetch,
  generator?: (operation: ParticipantJourneyOperation) => string,
): Promise<RequestResult> => {
  const traceId = requestTraceId(input.operation, input.context, config, generator);

  if (config.configCode || !config.baseUrl) {
    const code = config.configCode ?? "BRIDGE_BASE_URL_MISSING";
    return bridgeFailure(code, "config", traceId);
  }

  if (!isRecord(input.context) || input.context.mode !== "durable") {
    return bridgeFailure("BRIDGE_INVALID_INPUT", "config", traceId);
  }

  const contextSignal = normalizeContextSignal(input.context);
  if (!contextSignal.ok) {
    return bridgeFailure("BRIDGE_INVALID_INPUT", "config", traceId, {
      safeDetails: Object.freeze({ field: "signal" }),
    });
  }

  const auth = createWalletSessionAuthHeaders(input.context.session);
  if (!auth.ok) {
    return bridgeFailure("BRIDGE_SESSION_INVALID", "auth", traceId, {
      safeDetails: Object.freeze({ field: auth.field }),
    });
  }
  try {
    const session = input.context.session;
    const usableIssuedSession = session?.issuer?.valid === true
      && auth.headers["x-campaign-os-proof-status"] === "verified"
      && auth.headers["x-campaign-os-credential-boundary"] === "ordinary_user_wallet";
    if (!usableIssuedSession) {
      return bridgeFailure("BRIDGE_SESSION_INVALID", "auth", traceId);
    }
  } catch {
    return bridgeFailure("BRIDGE_SESSION_INVALID", "auth", traceId);
  }

  let body: string | undefined;
  let url: string;
  let customHeaders: Headers;

  try {
    body = input.body === undefined ? undefined : JSON.stringify(input.body);
    url = endpointUrl(config.baseUrl, input.path);
    customHeaders = new Headers(config.headers);
    customHeaders.set("accept", "application/json");
    if (body !== undefined) {
      customHeaders.set("content-type", "application/json");
    }
    customHeaders.set("x-campaign-os-trace-id", traceId);
  } catch {
    return bridgeFailure("BRIDGE_INVALID_INPUT", "request", traceId);
  }

  const mergedHeaders = mergeWalletSessionAuthHeaders(auth.headers, customHeaders);
  if (!mergedHeaders.ok) {
    return bridgeFailure("BRIDGE_AUTH_HEADER_CONFLICT", "auth", traceId, {
      safeDetails: Object.freeze({ field: mergedHeaders.field }),
    });
  }

  if (contextSignal.aborted) {
    return bridgeFailure("BRIDGE_REQUEST_ABORTED", "request", traceId);
  }

  const managedAbort = createManagedAbort(contextSignal.signal, config.timeoutMs);

  try {
    const response = await raceWithAbort(Promise.resolve(fetchImpl(url, {
      ...(body === undefined ? {} : { body }),
      headers: mergedHeaders.headers,
      method: input.method,
      signal: managedAbort.controller.signal,
    })), managedAbort.controller.signal);

    if (managedAbort.timedOut()) {
      return bridgeFailure("BRIDGE_REQUEST_TIMEOUT", "request", traceId);
    }
    if (managedAbort.externalAborted()) {
      return bridgeFailure("BRIDGE_REQUEST_ABORTED", "request", traceId);
    }

    const responseFailureTraceId = responseTraceId(response, undefined, traceId);
    let parsed: Record<string, unknown>;
    try {
      parsed = await parseBoundedResponse(response, config.maxResponseBytes, managedAbort.controller.signal);
    } catch (error) {
      if (managedAbort.timedOut()) {
        return bridgeFailure("BRIDGE_REQUEST_TIMEOUT", "request", responseFailureTraceId);
      }
      if (managedAbort.externalAborted()) {
        return bridgeFailure("BRIDGE_REQUEST_ABORTED", "request", traceId);
      }
      const code = error instanceof ResponseReadFailure
        ? error.code
        : "BRIDGE_RESPONSE_NON_JSON";
      return bridgeFailure(
        code,
        code === "BRIDGE_REQUEST_ABORTED" ? "request" : "response",
        responseFailureTraceId,
        {
          httpStatus: response.status,
        },
      );
    }

    const resolvedTraceId = responseTraceId(response, parsed, traceId);
    if (!response.ok || response.status < 200 || response.status >= 300) {
      return failure({
        code: safeErrorCode(parsed, response.status),
        httpStatus: response.status,
        phase: "response",
        safeDetails: safeErrorDetails(parsed, response.status),
        traceId: resolvedTraceId,
      });
    }
    if (parsed.ok !== true) {
      return bridgeFailure("BRIDGE_RESPONSE_INVALID", "response", resolvedTraceId, {
        httpStatus: response.status,
      });
    }

    return {
      body: parsed,
      httpStatus: response.status,
      ok: true,
      traceId: resolvedTraceId,
    };
  } catch {
    if (managedAbort.timedOut()) {
      return bridgeFailure("BRIDGE_REQUEST_TIMEOUT", "request", traceId);
    }
    if (managedAbort.externalAborted()) {
      return bridgeFailure("BRIDGE_REQUEST_ABORTED", "request", traceId);
    }
    return bridgeFailure("BRIDGE_REQUEST_FAILED", "request", traceId);
  } finally {
    managedAbort.cleanup();
  }
};

const dataRecord = (body: Record<string, unknown>): Record<string, unknown> | undefined =>
  isRecord(body.data) ? body.data : undefined;

const payloadValue = (body: Record<string, unknown>): unknown => {
  const data = dataRecord(body);
  return data && Object.prototype.hasOwnProperty.call(data, "payload") ? data.payload : data;
};

const normalizeFeedItem = (value: unknown): NormalizationResult<ParticipantCampaignFeedItem> => {
  if (!isRecord(value)) {
    return { ok: false, reason: "invalid" };
  }
  const id = identity(value.id);
  const campaignId = identity(value.campaignId) ?? id;

  if (id && campaignId && id !== campaignId) {
    return { ok: false, reason: "identity" };
  }

  const status = enumValue(value.status, campaignStatuses);
  const visibility = enumValue(
    value.visibility,
    new Set<ParticipantCampaignVisibility>(["participant_preview", "public"]),
  );
  if (!campaignId || !status || !visibility) {
    return { ok: false, reason: "invalid" };
  }

  const repository = normalizeRepository(value.repository);
  if (!repository) {
    return { ok: false, reason: "invalid" };
  }

  const optionalTextFields = ["endTime", "goal", "projectId", "rewardDescription", "startTime"] as const;
  const output: ParticipantCampaignFeedItem = { campaignId, repository, status, visibility };
  for (const field of optionalTextFields) {
    if (value[field] !== undefined) {
      const normalized = text(value[field]);
      if (!normalized) {
        return { ok: false, reason: "invalid" };
      }
      output[field] = normalized;
    }
  }

  if (value.taskCount !== undefined) {
    const taskCount = nonNegativeInteger(value.taskCount);
    if (taskCount === undefined) {
      return { ok: false, reason: "invalid" };
    }
    output.taskCount = taskCount;
  }
  if (value.walletPolicy !== undefined) {
    const walletPolicy = enumValue(value.walletPolicy, walletPolicies);
    if (!walletPolicy) {
      return { ok: false, reason: "invalid" };
    }
    output.walletPolicy = walletPolicy;
  }
  for (const field of ["subtitle", "title"] as const) {
    if (value[field] !== undefined) {
      const localized = normalizeLocalizedText(value[field]);
      if (!localized) {
        return { ok: false, reason: "invalid" };
      }
      output[field] = localized;
    }
  }
  return { ok: true, value: output };
};

const normalizeFeed = (body: Record<string, unknown>): NormalizationResult<readonly ParticipantCampaignFeedItem[]> => {
  const payload = payloadValue(body);
  const root = isRecord(payload) ? payload : undefined;
  const items = Array.isArray(payload) ? payload : root?.items;

  if (!Array.isArray(items) || items.length > maxCollectionLength) {
    return { ok: false, reason: "invalid" };
  }

  const seen = new Set<string>();
  const campaigns: ParticipantCampaignFeedItem[] = [];
  for (const item of items) {
    const normalized = normalizeFeedItem(item);
    if (!normalized.ok) {
      return normalized;
    }
    if (!seen.has(normalized.value.campaignId)) {
      seen.add(normalized.value.campaignId);
      campaigns.push(normalized.value);
    }
  }
  return { ok: true, value: campaigns };
};

const normalizeCampaign = (value: unknown): ParticipantJourneyCampaign | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  const campaignId = identity(value.campaignId);
  const endTime = text(value.endTime);
  const goal = text(value.goal);
  const projectId = identity(value.projectId);
  const rewardDescription = text(value.rewardDescription);
  const startTime = text(value.startTime);
  const status = enumValue(value.status, campaignStatuses);
  const taskCount = nonNegativeInteger(value.taskCount);
  const walletPolicy = enumValue(value.walletPolicy, walletPolicies);

  return campaignId && endTime && goal && projectId && rewardDescription && startTime
    && status && taskCount !== undefined && walletPolicy
    ? { campaignId, endTime, goal, projectId, rewardDescription, startTime, status, taskCount, walletPolicy }
    : undefined;
};

const normalizeParticipant = (value: unknown): ParticipantJourneyParticipant | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  const accountType = enumValue(value.accountType, accountTypes);
  const campaignId = identity(value.campaignId);
  const localePreference = enumValue(value.localePreference, supportedLocales);
  const participantId = nullableText(value.participantId);
  const riskFlags = boundedTextList(value.riskFlags);
  const totalPoints = nonNegativeInteger(value.totalPoints);
  const walletAddress = identity(value.walletAddress);
  const walletSource = enumValue(value.walletSource, walletSources);
  const walletTypeVerified = booleanValue(value.walletTypeVerified);

  return accountType && campaignId && localePreference && participantId !== undefined
    && riskFlags && totalPoints !== undefined && walletAddress && walletSource
    && walletTypeVerified !== undefined
    ? {
        accountType,
        campaignId,
        localePreference,
        participantId,
        riskFlags,
        totalPoints,
        walletAddress,
        walletSource,
        walletTypeVerified,
      }
    : undefined;
};

const normalizeRanking = (value: unknown): ParticipantJourneyRanking | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  const campaignId = identity(value.campaignId);
  const participantCount = nonNegativeInteger(value.participantCount);
  const rank = value.rank === null ? null : positiveInteger(value.rank);
  const totalPoints = nonNegativeInteger(value.totalPoints);
  const walletAddress = identity(value.walletAddress);

  if (
    !campaignId
    || participantCount === undefined
    || rank === undefined
    || totalPoints === undefined
    || !walletAddress
    || value.source !== "repository_projection"
    || (rank !== null && rank > participantCount)
    || (participantCount === 0 && rank !== null)
  ) {
    return undefined;
  }

  return { campaignId, participantCount, rank, source: "repository_projection", totalPoints, walletAddress };
};

const normalizeEligibility = (value: unknown): ParticipantJourneyEligibility | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  const accountType = enumValue(value.accountType, accountTypes);
  const campaignId = identity(value.campaignId);
  const eligible = booleanValue(value.eligible);
  const localePreference = enumValue(value.localePreference, supportedLocales);
  const missingTasks = boundedTextList(value.missingTasks);
  const riskFlags = boundedTextList(value.riskFlags);
  const score = nonNegativeInteger(value.score);
  const status = enumValue(value.status, eligibilityStatuses);
  const walletAddress = identity(value.walletAddress);
  const walletSource = enumValue(value.walletSource, walletSources);
  const walletTypeVerified = booleanValue(value.walletTypeVerified);

  return accountType && campaignId && eligible !== undefined && localePreference
    && missingTasks && riskFlags && score !== undefined && status && walletAddress
    && walletSource && walletTypeVerified !== undefined
    && eligible === (status === "eligible")
    ? {
        accountType,
        campaignId,
        eligible,
        localePreference,
        missingTasks,
        riskFlags,
        score,
        status,
        walletAddress,
        walletSource,
        walletTypeVerified,
      }
    : undefined;
};

const normalizeTask = (value: unknown): ParticipantJourneyTask | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  const action = enumValue(value.action, taskActions);
  const blockedReason = value.blockedReason === null
    ? null
    : enumValue(value.blockedReason, new Set(["inconsistent_records", "wallet_incompatible"] as const));
  const campaignId = identity(value.campaignId);
  const completionId = nullableText(value.completionId);
  const evidenceId = nullableText(value.evidenceId);
  const evidenceSource = value.evidenceSource === null
    ? null
    : enumValue(value.evidenceSource, evidenceSources);
  const pointsAvailable = nonNegativeInteger(value.pointsAvailable);
  const pointsAwarded = nonNegativeInteger(value.pointsAwarded);
  const required = booleanValue(value.required);
  const status = enumValue(value.status, taskStatuses);
  const taskId = identity(value.taskId);
  const templateCode = identity(value.templateCode);
  const updatedAt = value.updatedAt === null ? null : text(value.updatedAt);
  const verificationType = enumValue(value.verificationType, verificationTypes);
  const walletCompatibility = enumValue(value.walletCompatibility, walletCompatibilities);

  return action && blockedReason !== undefined && campaignId && completionId !== undefined
    && evidenceId !== undefined && evidenceSource !== undefined && pointsAvailable !== undefined
    && pointsAwarded !== undefined && pointsAwarded <= pointsAvailable && required !== undefined
    && status && taskId && templateCode && updatedAt !== undefined && verificationType
    && walletCompatibility
    ? {
        action,
        blockedReason,
        campaignId,
        completionId,
        evidenceId,
        evidenceSource,
        pointsAvailable,
        pointsAwarded,
        required,
        status,
        taskId,
        templateCode,
        updatedAt,
        verificationType,
        walletCompatibility,
      }
    : undefined;
};

const normalizeDiagnostics = (value: unknown): readonly ParticipantJourneyDiagnostic[] | undefined => {
  if (!Array.isArray(value) || value.length > 100) {
    return undefined;
  }
  const diagnostics: ParticipantJourneyDiagnostic[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      return undefined;
    }
    const code = text(item.code, 128);
    const scope = enumValue(item.scope, new Set(["participant", "snapshot", "task"] as const));
    const taskId = item.taskId === undefined ? undefined : identity(item.taskId);
    if (!code || !safeCodePattern.test(code) || !scope || (item.taskId !== undefined && !taskId)) {
      return undefined;
    }
    diagnostics.push({ code, scope, ...(taskId ? { taskId } : {}) });
  }
  return diagnostics;
};

const normalizeJourney = (
  body: Record<string, unknown>,
  campaignId: string,
  session: NormalizedWalletSession,
): NormalizationResult<ParticipantJourneyProjection> => {
  const payload = payloadValue(body);
  const payloadRecord = isRecord(payload) ? payload : undefined;
  const value = payloadRecord && isRecord(payloadRecord.journey) ? payloadRecord.journey : payloadRecord;

  if (!value) {
    return { ok: false, reason: "invalid" };
  }

  const campaign = normalizeCampaign(value.campaign);
  const diagnostics = normalizeDiagnostics(value.diagnostics);
  const eligibility = normalizeEligibility(value.eligibility);
  const participant = normalizeParticipant(value.participant);
  const ranking = normalizeRanking(value.ranking);
  const repository = normalizeRepository(value.repository);
  const rawTasks = value.tasks;

  if (
    !campaign
    || !diagnostics
    || !eligibility
    || !participant
    || !ranking
    || !repository
    || !Array.isArray(rawTasks)
    || rawTasks.length > maxCollectionLength
  ) {
    return { ok: false, reason: "invalid" };
  }

  const tasks = rawTasks.map(normalizeTask);
  if (tasks.some((task) => !task)) {
    return { ok: false, reason: "invalid" };
  }
  const normalizedTasks = tasks as ParticipantJourneyTask[];
  const taskIds = new Set(normalizedTasks.map((task) => task.taskId));
  if (
    taskIds.size !== normalizedTasks.length
    || campaign.taskCount !== normalizedTasks.length
    || participant.totalPoints !== ranking.totalPoints
    || participant.totalPoints !== eligibility.score
  ) {
    return { ok: false, reason: "invalid" };
  }

  const issuedAddress = session.address.trim();
  const issuedAccountType = session.accountType.trim();
  const issuedWalletSource = session.walletSource.trim();
  const identityMismatch = campaign.campaignId !== campaignId
    || participant.campaignId !== campaignId
    || ranking.campaignId !== campaignId
    || eligibility.campaignId !== campaignId
    || normalizedTasks.some((task) => task.campaignId !== campaignId)
    || participant.walletAddress !== issuedAddress
    || ranking.walletAddress !== issuedAddress
    || eligibility.walletAddress !== issuedAddress
    || participant.accountType !== issuedAccountType
    || eligibility.accountType !== issuedAccountType
    || participant.walletSource !== issuedWalletSource
    || eligibility.walletSource !== issuedWalletSource;

  return identityMismatch
    ? { ok: false, reason: "identity" }
    : {
        ok: true,
        value: {
          campaign,
          diagnostics,
          eligibility,
          participant,
          ranking,
          repository,
          tasks: normalizedTasks,
        },
      };
};

const verificationIdentity = (
  value: Record<string, unknown>,
  fallback: Record<string, unknown>,
) => ({
  accountType: enumValue(value.accountType ?? fallback.accountType, accountTypes),
  campaignId: identity(value.campaignId ?? fallback.campaignId),
  taskId: identity(value.taskId ?? fallback.taskId),
  walletAddress: identity(value.walletAddress ?? fallback.walletAddress),
  walletSource: enumValue(value.walletSource ?? fallback.walletSource, walletSources),
});

const normalizeVerification = (
  body: Record<string, unknown>,
  campaignId: string,
  taskId: string,
  session: NormalizedWalletSession,
): NormalizationResult<ParticipantVerificationProjection> => {
  const data = dataRecord(body);
  const payload = payloadValue(body);
  if (!isRecord(payload)) {
    return { ok: false, reason: "invalid" };
  }

  const nestedCompletion = isRecord(payload.completion) ? payload.completion : undefined;
  const nestedEvidence = isRecord(payload.evidence) ? payload.evidence : undefined;
  const completionMetadata = isRecord(data?.campaignDbCompletion) ? data.campaignDbCompletion : undefined;
  const evidenceMetadata = isRecord(data?.campaignDbEvidence) ? data.campaignDbEvidence : undefined;
  const rawCompletion = nestedCompletion ?? payload;
  const rawEvidence = nestedEvidence ?? payload;
  const completionIdentity = verificationIdentity(rawCompletion, payload);
  const evidenceIdentity = verificationIdentity(rawEvidence, payload);
  const completionId = identity(rawCompletion.id ?? rawCompletion.completionId ?? completionMetadata?.completionId);
  const completionEvidenceId = identity(
    rawCompletion.evidenceId ?? payload.evidenceId ?? completionMetadata?.evidenceId ?? evidenceMetadata?.evidenceId,
  );
  const evidenceId = identity(rawEvidence.id ?? rawEvidence.evidenceId ?? evidenceMetadata?.evidenceId);
  const evidenceCompletionId = identity(
    rawEvidence.completionId ?? evidenceMetadata?.completionId ?? completionMetadata?.completionId,
  );
  const completionPoints = nonNegativeInteger(rawCompletion.pointsAwarded ?? payload.pointsAwarded);
  const evidencePoints = nonNegativeInteger(rawEvidence.pointsAwarded ?? payload.pointsAwarded);
  const completionStatus = enumValue(rawCompletion.status ?? payload.status, verificationStatuses);
  const evidenceStatus = enumValue(rawEvidence.status ?? payload.status, verificationStatuses);

  const rawRepository = data?.campaignDb;
  const repository = normalizeRepository(rawRepository);

  const completionProvenanceMatches = Boolean(
    completionMetadata
    && completionMetadata.createdViaRepository === true
    && identity(completionMetadata.completionId) === completionId
    && identity(completionMetadata.evidenceId) === completionEvidenceId
    && identity(completionMetadata.repositoryId) === repository?.repositoryId
    && identity(completionMetadata.storeId) === repository?.storeId
    && identity(completionMetadata.taskId) === completionIdentity.taskId
  );
  const evidenceProvenanceMatches = Boolean(
    evidenceMetadata
    && evidenceMetadata.createdViaRepository === true
    && identity(evidenceMetadata.completionId) === evidenceCompletionId
    && identity(evidenceMetadata.evidenceId) === evidenceId
    && identity(evidenceMetadata.repositoryId) === repository?.repositoryId
    && identity(evidenceMetadata.storeId) === repository?.storeId
    && identity(evidenceMetadata.taskId) === evidenceIdentity.taskId
  );

  if (
    !completionIdentity.accountType
    || !completionIdentity.campaignId
    || !completionIdentity.taskId
    || !completionIdentity.walletAddress
    || !completionIdentity.walletSource
    || !evidenceIdentity.accountType
    || !evidenceIdentity.campaignId
    || !evidenceIdentity.taskId
    || !evidenceIdentity.walletAddress
    || !evidenceIdentity.walletSource
    || !completionId
    || !completionEvidenceId
    || !evidenceId
    || !evidenceCompletionId
    || completionPoints === undefined
    || evidencePoints === undefined
    || !completionStatus
    || !evidenceStatus
    || !repository
    || !completionProvenanceMatches
    || !evidenceProvenanceMatches
  ) {
    return { ok: false, reason: "invalid" };
  }

  const rawParticipant = isRecord(payload.participant) ? payload.participant : undefined;
  let participant: ParticipantVerificationParticipant | undefined;
  if (rawParticipant) {
    const participantIdentity = verificationIdentity(rawParticipant, payload);
    const participantId = identity(rawParticipant.id ?? rawParticipant.participantId);
    const totalPoints = nonNegativeInteger(rawParticipant.totalPoints);
    if (
      !participantIdentity.accountType
      || !participantIdentity.campaignId
      || !participantIdentity.walletAddress
      || !participantIdentity.walletSource
      || !participantId
      || totalPoints === undefined
    ) {
      return { ok: false, reason: "invalid" };
    }
    participant = {
      accountType: participantIdentity.accountType,
      campaignId: participantIdentity.campaignId,
      id: participantId,
      totalPoints,
      walletAddress: participantIdentity.walletAddress,
      walletSource: participantIdentity.walletSource,
    };
  }

  const issuedAddress = session.address.trim();
  const issuedAccountType = session.accountType.trim();
  const issuedWalletSource = session.walletSource.trim();
  const records = [completionIdentity, evidenceIdentity];
  const identityMismatch = records.some((record) =>
    record.campaignId !== campaignId
    || record.taskId !== taskId
    || record.walletAddress !== issuedAddress
    || record.accountType !== issuedAccountType
    || record.walletSource !== issuedWalletSource)
    || (participant !== undefined && (
      participant.campaignId !== campaignId
      || participant.walletAddress !== issuedAddress
      || participant.accountType !== issuedAccountType
      || participant.walletSource !== issuedWalletSource
    ));

  if (
    identityMismatch
    || completionEvidenceId !== evidenceId
    || evidenceCompletionId !== completionId
    || completionPoints !== evidencePoints
    || completionStatus !== evidenceStatus
  ) {
    return { ok: false, reason: "identity" };
  }

  return {
    ok: true,
    value: {
      completion: {
        accountType: completionIdentity.accountType,
        campaignId: completionIdentity.campaignId,
        evidenceId: completionEvidenceId,
        id: completionId,
        pointsAwarded: completionPoints,
        status: completionStatus,
        taskId: completionIdentity.taskId,
        walletAddress: completionIdentity.walletAddress,
        walletSource: completionIdentity.walletSource,
      },
      evidence: {
        accountType: evidenceIdentity.accountType,
        campaignId: evidenceIdentity.campaignId,
        completionId: evidenceCompletionId,
        id: evidenceId,
        pointsAwarded: evidencePoints,
        status: evidenceStatus,
        taskId: evidenceIdentity.taskId,
        walletAddress: evidenceIdentity.walletAddress,
        walletSource: evidenceIdentity.walletSource,
      },
      ...(participant ? { participant } : {}),
      repository,
    },
  };
};

const normalizationFailure = (
  normalized: { ok: false; reason: NormalizationFailureReason },
  request: RequestSuccess,
): ParticipantJourneyFailure => bridgeFailure(
  normalized.reason === "identity"
    ? "BRIDGE_RESPONSE_IDENTITY_MISMATCH"
    : "BRIDGE_RESPONSE_INVALID",
  normalized.reason === "identity" ? "identity" : "response",
  request.traceId,
  { httpStatus: request.httpStatus },
);

const normalizedContextId = (value: unknown): string | undefined => identity(value);

const seededPreviewFailure = (
  operation: ParticipantJourneyOperation,
  context: ParticipantJourneyContext,
  config: NormalizedConfig,
  generator?: (operation: ParticipantJourneyOperation) => string,
): ParticipantJourneyFailure => bridgeFailure(
  "BRIDGE_SEEDED_PREVIEW_UNAVAILABLE",
  "config",
  requestTraceId(operation, context, config, generator),
  { source: "seeded_preview", status: "blocked" },
);

export const createParticipantJourneyApiBridge = (
  options: ParticipantJourneyApiBridgeFactoryOptions = {},
): ParticipantJourneyApiBridge => {
  const config = normalizeConfig(options.config);
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);

  const delegatePreview = <T>(
    context: ParticipantJourneyContext,
    operation: ParticipantJourneyOperation,
    invoke: (delegate: ParticipantJourneyApiBridge) => Promise<T>,
  ): Promise<T | ParticipantJourneyFailure> | undefined => {
    if (context?.mode !== "seeded_preview") {
      return undefined;
    }
    return options.seededPreviewBridge
      ? invoke(options.seededPreviewBridge)
      : Promise.resolve(seededPreviewFailure(operation, context, config, options.traceIdGenerator));
  };

  return {
    getJourney: async (context) => {
      const preview = delegatePreview(context, "getJourney", (delegate) => delegate.getJourney(context));
      if (preview) {
        return preview;
      }

      const traceId = requestTraceId("getJourney", context, config, options.traceIdGenerator);
      const campaignId = normalizedContextId(context?.selectedCampaignId);
      if (!campaignId) {
        return bridgeFailure("BRIDGE_INVALID_INPUT", "config", traceId, {
          safeDetails: Object.freeze({ field: "selectedCampaignId" }),
        });
      }

      const request = await executeRequest({
        context,
        method: "GET",
        operation: "getJourney",
        path: `/api/participant/campaigns/${encodeURIComponent(campaignId)}/journey`,
      }, config, fetchImpl, options.traceIdGenerator);
      if (!request.ok) {
        return request;
      }

      const normalized = normalizeJourney(request.body, campaignId, context.session as NormalizedWalletSession);
      return normalized.ok
        ? {
            httpStatus: request.httpStatus,
            journey: normalized.value,
            ok: true,
            source: "durable",
            status: "success",
            traceId: request.traceId,
          }
        : normalizationFailure(normalized, request);
    },

    listCampaigns: async (context) => {
      const preview = delegatePreview(context, "listCampaigns", (delegate) => delegate.listCampaigns(context));
      if (preview) {
        return preview;
      }

      const request = await executeRequest({
        context,
        method: "GET",
        operation: "listCampaigns",
        path: "/api/participant/campaigns",
      }, config, fetchImpl, options.traceIdGenerator);
      if (!request.ok) {
        return request;
      }

      const normalized = normalizeFeed(request.body);
      return normalized.ok
        ? {
            campaigns: normalized.value,
            httpStatus: request.httpStatus,
            ok: true,
            source: "durable",
            status: "success",
            traceId: request.traceId,
          }
        : normalizationFailure(normalized, request);
    },

    verifyTask: async (taskIdValue, context) => {
      const preview = delegatePreview(context, "verifyTask", (delegate) => delegate.verifyTask(taskIdValue, context));
      if (preview) {
        return preview;
      }

      const traceId = requestTraceId("verifyTask", context, config, options.traceIdGenerator);
      const campaignId = normalizedContextId(context?.selectedCampaignId);
      const taskId = normalizedContextId(taskIdValue);
      if (!campaignId || !taskId) {
        return bridgeFailure("BRIDGE_INVALID_INPUT", "config", traceId, {
          safeDetails: Object.freeze({ field: campaignId ? "taskId" : "selectedCampaignId" }),
        });
      }

      const request = await executeRequest({
        body: { campaignId },
        context,
        method: "POST",
        operation: "verifyTask",
        path: `/api/tasks/${encodeURIComponent(taskId)}/verify`,
      }, config, fetchImpl, options.traceIdGenerator);
      if (!request.ok) {
        return request;
      }

      const normalized = normalizeVerification(
        request.body,
        campaignId,
        taskId,
        context.session as NormalizedWalletSession,
      );
      return normalized.ok
        ? {
            httpStatus: request.httpStatus,
            ok: true,
            source: "durable",
            status: "success",
            traceId: request.traceId,
            verification: normalized.value,
          }
        : normalizationFailure(normalized, request);
    },
  };
};
