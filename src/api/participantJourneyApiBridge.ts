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
  evidenceHash?: string;
  evidenceId?: string;
  id: string;
  pointsAwarded: number;
  status: "completed" | "failed" | "manual_review" | "pending";
  taskId: string;
  verificationAttemptId?: string;
  walletAddress: string;
  walletSource: WalletSource;
}

export interface ParticipantVerificationEvidence {
  accountType: AccountType;
  campaignId: string;
  completionId: string;
  evidenceHash?: string;
  evidenceRef?: string;
  evidenceSource?: "AEFINDER" | "AELFSCAN" | "DAPP_API";
  id: string;
  liveProviderExecuted?: true;
  pointsAwarded: number;
  status: "completed";
  taskId: string;
  verificationAttemptId?: string;
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

export type ParticipantVerificationOutcome = "completed" | "failed" | "manual_review" | "pending";

export interface ParticipantVerificationAttempt {
  authoritative: boolean;
  id: string;
  providerFamily: string;
  retryAfterMs?: number;
  retryable: boolean;
  status: ParticipantVerificationOutcome;
  transportExecuted: boolean;
}

export interface ParticipantVerificationDiagnostic {
  code: string;
  retryAfterMs?: number;
  retryable: boolean;
  severity: "error" | "info" | "warning";
}

export interface ParticipantVerificationRepositoryMetadata
  extends ParticipantJourneyRepositoryMetadata {
  adapterId: "campaign-db-postgresql-adapter";
  mode: "postgres";
}

export interface ParticipantVerificationProjection {
  attempt?: ParticipantVerificationAttempt;
  completion?: ParticipantVerificationCompletion;
  diagnostics?: readonly ParticipantVerificationDiagnostic[];
  evidence?: ParticipantVerificationEvidence;
  outcome?: ParticipantVerificationOutcome;
  participant?: ParticipantVerificationParticipant;
  repository: ParticipantJourneyRepositoryMetadata | ParticipantVerificationRepositoryMetadata;
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
  outcome?: ParticipantVerificationOutcome;
  source: ParticipantJourneyResultSource;
  status: ParticipantVerificationOutcome | "success";
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
const maxVerificationDiagnostics = 32;
const maxVerificationRetryAfterMs = 600_000;
const safeCodePattern = /^[A-Z][A-Z0-9_]{1,127}$/u;
const unsafeCodeFragmentPattern = /(?:^|_)(?:API_?KEY|PASSWORD|PRIVATE_?KEY|RAW_?SIGNATURE|SECRET|STACK|TOKEN)(?:_|$)/u;
const safeTracePattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const safeProviderFamilyPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/u;
const safeEvidenceHashPattern = /^[a-f0-9]{64}$/u;
const safeEvidenceRefPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;
const unsafeEvidenceRefSegmentPattern = /(?:^|[._:-])(?:authorization|credential|header|password|payload|secret|token|uri|url)(?:$|[._:-])/iu;
const safeFieldPattern = /^[A-Za-z][A-Za-z0-9._-]{0,127}$/u;
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
const verificationEvidenceSources = new Set<NonNullable<ParticipantVerificationEvidence["evidenceSource"]>>([
  "AEFINDER",
  "AELFSCAN",
  "DAPP_API",
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

const hasOnlyKeys = (
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  required: readonly string[] = [],
): boolean => Object.keys(value).every((key) => allowed.has(key))
  && required.every((key) => Object.prototype.hasOwnProperty.call(value, key));

const forbiddenVerificationKeyTokens = new Set([
  "authorization",
  "body",
  "config",
  "credential",
  "debug",
  "endpoint",
  "env",
  "environment",
  "header",
  "headers",
  "idempotency",
  "lease",
  "material",
  "path",
  "private",
  "query",
  "raw",
  "request",
  "response",
  "secret",
  "signed",
  "sql",
  "stack",
  "token",
  "url",
]);

const verificationKeyTokens = (key: string): readonly string[] => key
  .replace(/([a-z0-9])([A-Z])/gu, "$1_$2")
  .toLowerCase()
  .split(/[^a-z0-9]+/u)
  .filter(Boolean);

const containsForbiddenVerificationKey = (value: unknown): boolean => {
  const pending: unknown[] = [value];
  let visited = 0;

  while (pending.length > 0) {
    const current = pending.pop();
    visited += 1;
    if (visited > 4_096) {
      return true;
    }
    if (Array.isArray(current)) {
      pending.push(...current);
      continue;
    }
    if (!isRecord(current)) {
      continue;
    }

    for (const [key, nested] of Object.entries(current)) {
      if (verificationKeyTokens(key).some((token) => forbiddenVerificationKeyTokens.has(token))) {
        return true;
      }
      pending.push(nested);
    }
  }

  return false;
};

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

const verificationRepositoryKeys = new Set([
  "adapterId",
  "createdViaRepository",
  "mode",
  "repositoryId",
  "storeId",
]);

const normalizeVerificationRepository = (
  value: unknown,
): ParticipantVerificationRepositoryMetadata | undefined => {
  if (!isRecord(value) || !hasOnlyKeys(value, verificationRepositoryKeys)) {
    return undefined;
  }
  const repository = normalizeRepository(value);
  if (
    !repository
    || repository.adapterId !== "campaign-db-postgresql-adapter"
    || value.mode !== "postgres"
  ) {
    return undefined;
  }

  return { ...repository, adapterId: "campaign-db-postgresql-adapter", mode: "postgres" };
};

const failure = (input: {
  bridgeCode?: ParticipantJourneyBridgeCode;
  code: ParticipantJourneyErrorCode;
  httpStatus?: number;
  phase: ParticipantJourneyFailurePhase;
  retryable?: boolean;
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
  retryable: input.retryable ?? (
    input.code === "BRIDGE_REQUEST_FAILED"
      || input.code === "BRIDGE_REQUEST_TIMEOUT"
      || input.httpStatus === 503
      || (input.httpStatus !== undefined && input.httpStatus >= 500)
  ),
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

const responseTraceHeaderState = (
  response: Response,
): { invalid: boolean; value?: string } => {
  try {
    const raw = response.headers.get("x-campaign-os-trace-id");
    if (raw === null) {
      return { invalid: false };
    }
    const value = safeTraceId(raw);
    return value ? { invalid: false, value } : { invalid: true };
  } catch {
    return { invalid: true };
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
    const contentType = response.headers.get("content-type")
      ?.split(";", 1)[0]
      ?.trim()
      .toLowerCase();
    if (
      !contentType
      || !/^application\/(?:[a-z0-9!#$&^_.+-]+\+)?json$/u.test(contentType)
    ) {
      await cancelResponseBody(response);
      throw new ResponseReadFailure("BRIDGE_RESPONSE_NON_JSON");
    }
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
): Readonly<Record<string, boolean | number | string>> => {
  const error = isRecord(body.error) ? body.error : undefined;
  const details = isRecord(error?.details) ? error.details : undefined;
  const output: Record<string, boolean | number | string> = {};

  const diagnosticCode = text(details?.diagnosticCode, 128);
  if (
    diagnosticCode
    && safeCodePattern.test(diagnosticCode)
    && !unsafeCodeFragmentPattern.test(diagnosticCode)
  ) {
    output.diagnosticCode = diagnosticCode;
  }
  const field = text(details?.field, 128);
  if (field && safeFieldPattern.test(field)) {
    output.field = field;
  }
  if (typeof details?.retryable === "boolean") {
    output.retryable = details.retryable;
  }
  const retryAfterMs = nonNegativeInteger(details?.retryAfterMs);
  if (retryAfterMs !== undefined && retryAfterMs <= maxVerificationRetryAfterMs) {
    output.retryAfterMs = retryAfterMs;
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

    const traceHeader = responseTraceHeaderState(response);
    const responseFailureTraceId = traceHeader.value ?? traceId;
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

    const bodyTraceId = safeTraceId(parsed.traceId);
    if (
      input.operation === "verifyTask"
      && (
        traceHeader.invalid
        || !bodyTraceId
        || (traceHeader.value !== undefined && traceHeader.value !== bodyTraceId)
      )
    ) {
      return bridgeFailure("BRIDGE_RESPONSE_INVALID", "response", responseFailureTraceId, {
        httpStatus: response.status,
      });
    }

    const resolvedTraceId = responseTraceId(response, parsed, traceId);
    if (input.operation === "verifyTask" && containsForbiddenVerificationKey(parsed)) {
      return bridgeFailure("BRIDGE_RESPONSE_INVALID", "response", resolvedTraceId, {
        httpStatus: response.status,
      });
    }
    if (!response.ok || response.status < 200 || response.status >= 300) {
      const safeDetails = safeErrorDetails(parsed);
      return failure({
        code: safeErrorCode(parsed, response.status),
        httpStatus: response.status,
        phase: "response",
        ...(typeof safeDetails.retryable === "boolean"
          ? { retryable: safeDetails.retryable }
          : {}),
        safeDetails,
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

const verificationEnvelopeKeys = new Set(["data", "ok", "traceId"]);
const verificationDataKeys = new Set([
  "boundary",
  "campaignDb",
  "campaignDbCompletion",
  "campaignDbEvidence",
  "completion",
  "evidence",
  "participant",
  "payload",
  "persistence",
  "repository",
]);
const verificationPayloadKeys = new Set([
  "accountType",
  "authoritative",
  "campaignId",
  "canonicalEvidenceSource",
  "completion",
  "diagnosticCodes",
  "evidence",
  "evidenceHash",
  "evidenceId",
  "evidenceRef",
  "evidenceSource",
  "liveContractExecuted",
  "liveProviderExecuted",
  "liveRewardExecuted",
  "liveStorageExecuted",
  "manualReview",
  "nextAction",
  "outcome",
  "participant",
  "pointsAwarded",
  "pointsAvailable",
  "provider",
  "providerFamily",
  "repository",
  "retryAfterMs",
  "retryable",
  "riskFlags",
  "status",
  "taskId",
  "transportExecuted",
  "verificationAttemptId",
  "walletAddress",
  "walletSource",
]);
const verificationCompletionKeys = new Set([
  "accountType",
  "campaignId",
  "completedAt",
  "completionId",
  "evidenceHash",
  "evidenceId",
  "id",
  "pointsAwarded",
  "status",
  "taskId",
  "updatedAt",
  "verificationAttemptId",
  "walletAddress",
  "walletSource",
]);
const verificationEvidenceKeys = new Set([
  "accountType",
  "campaignId",
  "capturedAt",
  "completionId",
  "evidenceHash",
  "evidenceId",
  "evidenceRef",
  "evidenceSource",
  "id",
  "live",
  "liveProviderExecuted",
  "pointsAwarded",
  "source",
  "sourceLabel",
  "status",
  "taskId",
  "verificationAttemptId",
  "walletAddress",
  "walletSource",
]);
const verificationParticipantKeys = new Set([
  "accountType",
  "campaignId",
  "id",
  "participantId",
  "totalPoints",
  "walletAddress",
  "walletSource",
]);
const verificationCompletionMetadataKeys = new Set([
  "completionId",
  "createdViaRepository",
  "evidenceId",
  "repositoryId",
  "storeId",
  "taskId",
  "verificationAttemptId",
]);
const verificationEvidenceMetadataKeys = new Set([
  "completionId",
  "createdViaRepository",
  "evidenceHash",
  "evidenceId",
  "evidenceRef",
  "evidenceSource",
  "liveContractExecuted",
  "liveProviderExecuted",
  "liveRewardExecuted",
  "liveStorageExecuted",
  "repositoryId",
  "status",
  "storeId",
  "taskId",
  "verificationAttemptId",
]);
const verificationPersistenceKeys = new Set([
  "code",
  "kind",
  "operation",
  "recordId",
  "status",
  "traceId",
]);
const verificationManualReviewKeys = new Set(["queued", "reason", "severity"]);
const verificationProviderKeys = new Set(["nextAdapterStep", "providerId", "readiness"]);

interface NormalizedVerificationIdentity {
  accountType: AccountType;
  campaignId: string;
  taskId: string;
  walletAddress: string;
  walletSource: WalletSource;
}

const verificationIdentity = (
  value: Record<string, unknown>,
  fallback: Record<string, unknown>,
  session: NormalizedWalletSession,
): NormalizedVerificationIdentity | undefined => {
  const accountType = enumValue(
    value.accountType ?? fallback.accountType ?? session.accountType,
    accountTypes,
  );
  const campaignId = identity(value.campaignId ?? fallback.campaignId);
  const taskId = identity(value.taskId ?? fallback.taskId);
  const walletAddress = identity(value.walletAddress ?? fallback.walletAddress);
  const walletSource = enumValue(value.walletSource ?? fallback.walletSource, walletSources);

  return accountType && campaignId && taskId && walletAddress && walletSource
    ? { accountType, campaignId, taskId, walletAddress, walletSource }
    : undefined;
};

const verificationIdentityMatches = (
  value: NormalizedVerificationIdentity,
  campaignId: string,
  taskId: string,
  session: NormalizedWalletSession,
): boolean => value.campaignId === campaignId
  && value.taskId === taskId
  && value.walletAddress === session.address.trim()
  && value.accountType === session.accountType.trim()
  && value.walletSource === session.walletSource.trim();

type ConsistentValueResult<T> =
  | { ok: true; value: T | undefined }
  | { ok: false; reason: NormalizationFailureReason };

const consistentValue = <T>(
  values: readonly unknown[],
  normalize: (value: unknown) => T | undefined,
  required = true,
): ConsistentValueResult<T> => {
  const normalized: T[] = [];
  for (const value of values) {
    if (value === undefined) {
      continue;
    }
    const candidate = normalize(value);
    if (candidate === undefined) {
      return { ok: false, reason: "invalid" };
    }
    normalized.push(candidate);
  }
  if (normalized.length === 0) {
    return required
      ? { ok: false, reason: "invalid" }
      : { ok: true, value: undefined };
  }
  if (normalized.some((value) => value !== normalized[0])) {
    return { ok: false, reason: "identity" };
  }
  return { ok: true, value: normalized[0] };
};

const normalizeVerificationDiagnostics = (
  value: unknown,
  outcome: ParticipantVerificationOutcome,
  retryable: boolean,
  retryAfterMs: number | undefined,
): readonly ParticipantVerificationDiagnostic[] | undefined => {
  if (!Array.isArray(value) || value.length > maxVerificationDiagnostics) {
    return undefined;
  }
  const seen = new Set<string>();
  const severity: ParticipantVerificationDiagnostic["severity"] = outcome === "completed"
    ? "info"
    : outcome === "failed"
      ? "error"
      : "warning";
  const diagnostics: ParticipantVerificationDiagnostic[] = [];
  for (const item of value) {
    const code = text(item, 80);
    if (
      !code
      || !safeCodePattern.test(code)
      || unsafeCodeFragmentPattern.test(code)
      || seen.has(code)
    ) {
      return undefined;
    }
    seen.add(code);
    diagnostics.push({
      code,
      ...(retryable && retryAfterMs !== undefined ? { retryAfterMs } : {}),
      retryable,
      severity,
    });
  }
  return diagnostics;
};

const validVerificationScaffolding = (
  data: Record<string, unknown>,
  payload: Record<string, unknown>,
): boolean => {
  if (data.boundary !== undefined && !normalizeLocalizedText(data.boundary)) {
    return false;
  }
  if (data.persistence !== undefined) {
    if (
      !isRecord(data.persistence)
      || !hasOnlyKeys(data.persistence, verificationPersistenceKeys, ["kind"])
      || !identity(data.persistence.kind)
      || (data.persistence.recordId !== undefined && !identity(data.persistence.recordId))
      || (data.persistence.code !== undefined && !text(data.persistence.code, 128))
      || (data.persistence.operation !== undefined && !identity(data.persistence.operation))
      || (data.persistence.status !== undefined && !identity(data.persistence.status))
      || (data.persistence.traceId !== undefined && !safeTraceId(data.persistence.traceId))
    ) {
      return false;
    }
  }
  if (payload.manualReview !== undefined) {
    if (
      !isRecord(payload.manualReview)
      || !hasOnlyKeys(payload.manualReview, verificationManualReviewKeys, ["queued", "severity"])
      || typeof payload.manualReview.queued !== "boolean"
      || !new Set(["info", "warning"]).has(String(payload.manualReview.severity))
      || (payload.manualReview.reason !== undefined && !normalizeLocalizedText(payload.manualReview.reason))
    ) {
      return false;
    }
  }
  if (payload.nextAction !== undefined && !normalizeLocalizedText(payload.nextAction)) {
    return false;
  }
  if (payload.provider !== undefined) {
    if (
      !isRecord(payload.provider)
      || !hasOnlyKeys(payload.provider, verificationProviderKeys, ["nextAdapterStep", "providerId", "readiness"])
      || !normalizeLocalizedText(payload.provider.nextAdapterStep)
      || !identity(payload.provider.providerId)
      || !identity(payload.provider.readiness)
    ) {
      return false;
    }
  }
  return payload.riskFlags === undefined || boundedTextList(payload.riskFlags) !== undefined;
};

const normalizeVerificationParticipant = (
  value: unknown,
  payload: Record<string, unknown>,
  campaignId: string,
  taskId: string,
  session: NormalizedWalletSession,
): NormalizationResult<ParticipantVerificationParticipant | undefined> => {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }
  if (!isRecord(value) || !hasOnlyKeys(value, verificationParticipantKeys)) {
    return { ok: false, reason: "invalid" };
  }
  const normalizedIdentity = verificationIdentity(value, { ...payload, taskId }, session);
  const id = identity(value.id ?? value.participantId);
  const totalPoints = nonNegativeInteger(value.totalPoints);
  if (!normalizedIdentity || !id || totalPoints === undefined) {
    return { ok: false, reason: "invalid" };
  }
  if (!verificationIdentityMatches(normalizedIdentity, campaignId, taskId, session)) {
    return { ok: false, reason: "identity" };
  }
  return {
    ok: true,
    value: {
      accountType: normalizedIdentity.accountType,
      campaignId: normalizedIdentity.campaignId,
      id,
      totalPoints,
      walletAddress: normalizedIdentity.walletAddress,
      walletSource: normalizedIdentity.walletSource,
    },
  };
};

const normalizeVerification = (
  body: Record<string, unknown>,
  httpStatus: number,
  campaignId: string,
  taskId: string,
  session: NormalizedWalletSession,
): NormalizationResult<ParticipantVerificationProjection> => {
  const data = dataRecord(body);
  const payload = data?.payload;
  if (
    containsForbiddenVerificationKey(body)
    || !hasOnlyKeys(body, verificationEnvelopeKeys, ["data", "ok", "traceId"])
    || body.ok !== true
    || !data
    || !hasOnlyKeys(data, verificationDataKeys, ["payload"])
    || !isRecord(payload)
    || !hasOnlyKeys(payload, verificationPayloadKeys)
    || !validVerificationScaffolding(data, payload)
  ) {
    return { ok: false, reason: "invalid" };
  }

  const nestedCompletion = isRecord(data.completion)
    ? data.completion
    : isRecord(payload.completion)
      ? payload.completion
      : undefined;
  const nestedEvidence = isRecord(data.evidence)
    ? data.evidence
    : isRecord(payload.evidence)
      ? payload.evidence
      : undefined;
  const completionMetadata = isRecord(data.campaignDbCompletion)
    ? data.campaignDbCompletion
    : undefined;
  const evidenceMetadata = isRecord(data.campaignDbEvidence)
    ? data.campaignDbEvidence
    : undefined;
  if (
    (nestedCompletion && !hasOnlyKeys(nestedCompletion, verificationCompletionKeys))
    || (nestedEvidence && !hasOnlyKeys(nestedEvidence, verificationEvidenceKeys))
    || (completionMetadata && !hasOnlyKeys(completionMetadata, verificationCompletionMetadataKeys))
    || (evidenceMetadata && !hasOnlyKeys(evidenceMetadata, verificationEvidenceMetadataKeys))
  ) {
    return { ok: false, reason: "invalid" };
  }
  if (
    nestedEvidence?.sourceLabel !== undefined
    && !normalizeLocalizedText(nestedEvidence.sourceLabel)
  ) {
    return { ok: false, reason: "invalid" };
  }

  const outcome = enumValue(payload.outcome, verificationStatuses);
  const status = enumValue(payload.status, verificationStatuses);
  const authoritative = booleanValue(payload.authoritative);
  const retryable = booleanValue(payload.retryable);
  const transportExecuted = booleanValue(payload.transportExecuted);
  const providerFamily = text(payload.providerFamily, 80);
  const retryAfterMs = payload.retryAfterMs === undefined
    ? undefined
    : nonNegativeInteger(payload.retryAfterMs);
  if (
    !outcome
    || !status
    || status !== outcome
    || authoritative === undefined
    || retryable === undefined
    || transportExecuted === undefined
    || !providerFamily
    || !safeProviderFamilyPattern.test(providerFamily)
    || (payload.retryAfterMs !== undefined
      && (retryAfterMs === undefined || retryAfterMs > maxVerificationRetryAfterMs))
    || (httpStatus === 202) !== (outcome === "pending")
    || (httpStatus !== 200 && httpStatus !== 202)
    || (outcome === "pending" && (!retryable || retryAfterMs === undefined))
    || (outcome === "completed" && (!authoritative || !transportExecuted || retryable))
  ) {
    return { ok: false, reason: "invalid" };
  }

  const fallbackIdentity = nestedCompletion ?? nestedEvidence ?? {};
  const responseIdentity = verificationIdentity(payload, fallbackIdentity, session);
  if (!responseIdentity) {
    return { ok: false, reason: "invalid" };
  }
  if (!verificationIdentityMatches(responseIdentity, campaignId, taskId, session)) {
    return { ok: false, reason: "identity" };
  }

  const attemptIdResult = consistentValue([
    payload.verificationAttemptId,
    nestedCompletion?.verificationAttemptId,
    nestedEvidence?.verificationAttemptId,
    completionMetadata?.verificationAttemptId,
    evidenceMetadata?.verificationAttemptId,
  ], identity);
  if (!attemptIdResult.ok) {
    return attemptIdResult;
  }
  const attemptId = attemptIdResult.value!;
  const diagnostics = normalizeVerificationDiagnostics(
    payload.diagnosticCodes,
    outcome,
    retryable,
    retryAfterMs,
  );
  if (!diagnostics) {
    return { ok: false, reason: "invalid" };
  }

  const rawRepository = data.campaignDb ?? data.repository ?? payload.repository;
  const repository = normalizeVerificationRepository(rawRepository);
  if (!repository) {
    return { ok: false, reason: "invalid" };
  }
  for (const candidate of [data.campaignDb, data.repository, payload.repository]) {
    if (candidate === undefined) {
      continue;
    }
    const normalized = normalizeVerificationRepository(candidate);
    if (
      !normalized
      || normalized.repositoryId !== repository.repositoryId
      || normalized.storeId !== repository.storeId
    ) {
      return { ok: false, reason: normalized ? "identity" : "invalid" };
    }
  }

  const participantResult = normalizeVerificationParticipant(
    data.participant ?? payload.participant,
    payload,
    campaignId,
    taskId,
    session,
  );
  if (!participantResult.ok) {
    return participantResult;
  }

  const points = nonNegativeInteger(payload.pointsAwarded ?? nestedCompletion?.pointsAwarded);
  if (points === undefined) {
    return { ok: false, reason: "invalid" };
  }
  const attempt: ParticipantVerificationAttempt = {
    authoritative,
    id: attemptId,
    providerFamily,
    ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
    retryable,
    status: outcome,
    transportExecuted,
  };

  if (outcome !== "completed") {
    const providerEvidencePresent = nestedEvidence !== undefined
      || evidenceMetadata !== undefined
      || payload.evidenceHash !== undefined
      || payload.evidenceId !== undefined
      || payload.evidenceRef !== undefined
      || payload.evidenceSource !== undefined
      || payload.canonicalEvidenceSource !== undefined
      || payload.liveProviderExecuted !== undefined;
    const completionEvidenceLinkagePresent = nestedCompletion?.evidenceId !== undefined
      || nestedCompletion?.evidenceHash !== undefined;
    if (
      points !== 0
      || providerEvidencePresent
      || completionEvidenceLinkagePresent
      || completionMetadata !== undefined
    ) {
      return { ok: false, reason: "invalid" };
    }

    let completion: ParticipantVerificationCompletion | undefined;
    if (nestedCompletion) {
      const completionIdentity = verificationIdentity(nestedCompletion, payload, session);
      const completionId = identity(nestedCompletion.id ?? nestedCompletion.completionId);
      const completionPoints = nonNegativeInteger(nestedCompletion.pointsAwarded);
      const completionStatus = enumValue(nestedCompletion.status, verificationStatuses);
      if (!completionIdentity || !completionId || completionPoints !== 0 || completionStatus !== outcome) {
        return { ok: false, reason: "invalid" };
      }
      if (!verificationIdentityMatches(completionIdentity, campaignId, taskId, session)) {
        return { ok: false, reason: "identity" };
      }
      completion = {
        accountType: completionIdentity.accountType,
        campaignId: completionIdentity.campaignId,
        id: completionId,
        pointsAwarded: completionPoints,
        status: completionStatus,
        taskId: completionIdentity.taskId,
        verificationAttemptId: attemptId,
        walletAddress: completionIdentity.walletAddress,
        walletSource: completionIdentity.walletSource,
      };
    }

    return {
      ok: true,
      value: {
        attempt,
        ...(completion ? { completion } : {}),
        diagnostics,
        outcome,
        ...(participantResult.value ? { participant: participantResult.value } : {}),
        repository,
      },
    };
  }

  if (!completionMetadata || !evidenceMetadata || !nestedEvidence) {
    return { ok: false, reason: "invalid" };
  }
  const completionIdentity = verificationIdentity(nestedCompletion ?? payload, payload, session);
  const evidenceIdentity = verificationIdentity(nestedEvidence, payload, session);
  if (!completionIdentity || !evidenceIdentity) {
    return { ok: false, reason: "invalid" };
  }
  if (
    !verificationIdentityMatches(completionIdentity, campaignId, taskId, session)
    || !verificationIdentityMatches(evidenceIdentity, campaignId, taskId, session)
  ) {
    return { ok: false, reason: "identity" };
  }

  const completionIdResult = consistentValue([
    nestedCompletion?.id,
    nestedCompletion?.completionId,
    completionMetadata.completionId,
    nestedEvidence.completionId,
    evidenceMetadata.completionId,
  ], identity);
  const evidenceIdResult = consistentValue([
    nestedCompletion?.evidenceId,
    payload.evidenceId,
    nestedEvidence.id,
    nestedEvidence.evidenceId,
    completionMetadata.evidenceId,
    evidenceMetadata.evidenceId,
  ], identity);
  const evidenceHashResult = consistentValue([
    nestedCompletion?.evidenceHash,
    payload.evidenceHash,
    nestedEvidence.evidenceHash,
    evidenceMetadata.evidenceHash,
  ], (value) => {
    const normalized = text(value, 64);
    return normalized && safeEvidenceHashPattern.test(normalized) ? normalized : undefined;
  });
  const evidenceRefResult = consistentValue([
    payload.evidenceRef,
    nestedEvidence.evidenceRef,
    evidenceMetadata.evidenceRef,
  ], (value) => {
    const normalized = text(value, 256);
    return normalized
      && safeEvidenceRefPattern.test(normalized)
      && !unsafeEvidenceRefSegmentPattern.test(normalized)
      ? normalized
      : undefined;
  });
  const evidenceSourceResult = consistentValue([
    payload.canonicalEvidenceSource,
    payload.evidenceSource,
    nestedEvidence.evidenceSource,
    nestedEvidence.source,
    evidenceMetadata.evidenceSource,
  ], (value) => enumValue(value, verificationEvidenceSources));
  if (!completionIdResult.ok) {
    return completionIdResult;
  }
  if (!evidenceIdResult.ok) {
    return evidenceIdResult;
  }
  if (!evidenceHashResult.ok) {
    return evidenceHashResult;
  }
  if (!evidenceRefResult.ok) {
    return evidenceRefResult;
  }
  if (!evidenceSourceResult.ok) {
    return evidenceSourceResult;
  }

  const completionId = completionIdResult.value!;
  const evidenceId = evidenceIdResult.value!;
  const evidenceHash = evidenceHashResult.value!;
  const evidenceRef = evidenceRefResult.value!;
  const evidenceSource = evidenceSourceResult.value!;
  const nestedEvidencePoints = nestedEvidence.pointsAwarded === undefined
    ? points
    : nonNegativeInteger(nestedEvidence.pointsAwarded);
  const nestedCompletionPoints = nestedCompletion?.pointsAwarded === undefined
    ? points
    : nonNegativeInteger(nestedCompletion.pointsAwarded);
  const nestedCompletionStatus = nestedCompletion?.status === undefined
    ? outcome
    : enumValue(nestedCompletion.status, verificationStatuses);
  const nestedEvidenceStatus = nestedEvidence.status === undefined
    ? outcome
    : enumValue(nestedEvidence.status, verificationStatuses);
  const nestedEvidenceLive = nestedEvidence.liveProviderExecuted ?? nestedEvidence.live;
  const provenanceIdentityMismatch = completionMetadata.createdViaRepository !== true
    || evidenceMetadata.createdViaRepository !== true
    || identity(completionMetadata.repositoryId) !== repository.repositoryId
    || identity(evidenceMetadata.repositoryId) !== repository.repositoryId
    || identity(completionMetadata.storeId) !== repository.storeId
    || identity(evidenceMetadata.storeId) !== repository.storeId
    || identity(completionMetadata.taskId) !== taskId
    || identity(evidenceMetadata.taskId) !== taskId;
  if (provenanceIdentityMismatch) {
    return { ok: false, reason: "identity" };
  }
  if (
    nestedCompletionPoints !== points
    || nestedEvidencePoints !== points
    || nestedCompletionStatus !== "completed"
    || nestedEvidenceStatus !== "completed"
    || payload.liveProviderExecuted !== true
    || nestedEvidenceLive !== true
    || evidenceMetadata.liveProviderExecuted !== true
  ) {
    return { ok: false, reason: "invalid" };
  }

  const completion: ParticipantVerificationCompletion = {
    accountType: completionIdentity.accountType,
    campaignId: completionIdentity.campaignId,
    evidenceHash,
    evidenceId,
    id: completionId,
    pointsAwarded: points,
    status: "completed",
    taskId: completionIdentity.taskId,
    verificationAttemptId: attemptId,
    walletAddress: completionIdentity.walletAddress,
    walletSource: completionIdentity.walletSource,
  };
  const evidence: ParticipantVerificationEvidence = {
    accountType: evidenceIdentity.accountType,
    campaignId: evidenceIdentity.campaignId,
    completionId,
    evidenceHash,
    evidenceRef,
    evidenceSource,
    id: evidenceId,
    liveProviderExecuted: true,
    pointsAwarded: points,
    status: "completed",
    taskId: evidenceIdentity.taskId,
    verificationAttemptId: attemptId,
    walletAddress: evidenceIdentity.walletAddress,
    walletSource: evidenceIdentity.walletSource,
  };

  return {
    ok: true,
    value: {
      attempt,
      completion,
      diagnostics,
      evidence,
      outcome,
      ...(participantResult.value ? { participant: participantResult.value } : {}),
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
        request.httpStatus,
        campaignId,
        taskId,
        context.session as NormalizedWalletSession,
      );
      return normalized.ok
        ? {
            httpStatus: request.httpStatus,
            ok: true,
            outcome: normalized.value.outcome!,
            source: "durable",
            status: normalized.value.outcome!,
            traceId: request.traceId,
            verification: normalized.value,
          }
        : normalizationFailure(normalized, request);
    },
  };
};
