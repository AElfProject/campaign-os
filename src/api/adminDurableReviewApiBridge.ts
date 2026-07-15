import type { NormalizedWalletSession } from "../domain/types";
import {
  createWalletSessionAuthHeaders,
  mergeWalletSessionAuthHeaders,
} from "./walletSessionAuthHeaders";

export type AdminDurableReviewApiFetch = typeof fetch;
export type AdminReviewState =
  | "approved_current"
  | "needs_review_current"
  | "pending_review"
  | "rejected_current"
  | "stale";
export type AdminDecisionValue = "approved" | "needs_review" | "rejected";
export type AdminArtifactFormat = "csv" | "json";
export type AdminOperatorRole = "internal_operator" | "review_operator";
export type AdminArtifactMimeType =
  | "application/json;charset=utf-8"
  | "text/csv;charset=utf-8";
export type AdminDurableReviewOperation =
  | "downloadArtifact"
  | "generateArtifact"
  | "getArtifactDetail"
  | "getReviewDetail"
  | "listArtifacts"
  | "listCampaigns"
  | "listReviews"
  | "listWinners"
  | "submitDecision";

export interface AdminSafeJsonArray extends ReadonlyArray<AdminSafeJsonValue> {}

export interface AdminSafeJsonObject {
  readonly [key: string]: AdminSafeJsonValue;
}

export type AdminSafeJsonValue =
  | boolean
  | null
  | number
  | string
  | AdminSafeJsonArray
  | AdminSafeJsonObject;

export interface AdminRepositoryMetadata {
  readonly adapterId: "campaign-db-postgresql-adapter";
  readonly durable: true;
  readonly repositoryId: string;
  readonly storeId: "campaign-db";
}

export interface AdminCampaignSummary {
  readonly campaignId: string;
  readonly ownerAddress: string;
  readonly participantCount: number;
  readonly projectId: string;
  readonly status: string;
  readonly taskCount: number;
}

export interface AdminReviewCoverage {
  readonly completedTasks: number;
  readonly evidenceCount: number;
  readonly requiredTasks: number;
  readonly totalTasks: number;
}

export interface AdminDecisionSummary {
  readonly decision: AdminDecisionValue;
  readonly decisionId: string;
  readonly decidedAt: string;
  readonly operatorRole: AdminOperatorRole;
  readonly operatorSubject: string;
  readonly reasonCode?: string;
  readonly snapshotFingerprint: string;
  readonly version: number;
}

export interface AdminDecisionRecord extends AdminDecisionSummary {
  readonly note: string | null;
  readonly payloadHash: string;
  readonly reasonCode: string;
  readonly traceId: string;
}

export interface AdminReviewQueueItem {
  readonly campaignId: string;
  readonly coverage: AdminReviewCoverage;
  readonly currentDecision: AdminDecisionSummary | null;
  readonly currentFingerprint: string;
  readonly eligible: boolean;
  readonly participantId: string;
  readonly rank: number | null;
  readonly reviewState: AdminReviewState;
  readonly riskFlags: readonly string[];
  readonly totalPoints: number;
  readonly walletAddress: string;
}

export interface AdminReviewSnapshot {
  readonly campaignId: string;
  readonly completions: readonly Readonly<Record<string, AdminSafeJsonValue>>[];
  readonly evidence: readonly Readonly<Record<string, AdminSafeJsonValue>>[];
  readonly fingerprint: string;
  readonly fingerprintVersion: "review-snapshot-v1";
  readonly generatedAt?: string;
  readonly participantId: string;
  readonly tasks: readonly Readonly<Record<string, AdminSafeJsonValue>>[];
}

export interface AdminWinnerRow {
  readonly campaignId: string;
  readonly decisionId: string;
  readonly decisionVersion: number;
  readonly evidenceHashes: readonly string[];
  readonly participantId: string;
  readonly rank: number | null;
  readonly snapshotFingerprint: string;
  readonly totalPoints: number;
  readonly walletAddress: string;
}

export interface AdminArtifactMetadata {
  readonly artifactId: string;
  readonly campaignId: string;
  readonly contentBytes: number;
  readonly contentHash: string;
  readonly createdAt: string;
  readonly creatorRole: AdminOperatorRole;
  readonly creatorSubject: string;
  readonly fileName: string;
  readonly format: AdminArtifactFormat;
  readonly mimeType: AdminArtifactMimeType;
  readonly rowCount: number;
  readonly sourceFingerprint: string;
  readonly sourceVersion: "artifact-source-v1";
  readonly traceId: string;
}

export interface AdminCampaignListData {
  readonly campaigns: readonly AdminCampaignSummary[];
  readonly repository: AdminRepositoryMetadata;
}

export interface AdminReviewQueueSummary {
  readonly approvedCurrent: number;
  readonly needsReviewCurrent: number;
  readonly pendingReview: number;
  readonly rejectedCurrent: number;
  readonly stale: number;
  readonly total: number;
}

export interface AdminReviewQueueData {
  readonly campaignId: string;
  readonly items: readonly AdminReviewQueueItem[];
  readonly summary: AdminReviewQueueSummary;
}

export interface AdminReviewDetailData {
  readonly campaignId: string;
  readonly currentDecision: AdminDecisionRecord | null;
  readonly history: readonly AdminDecisionRecord[];
  readonly participantId: string;
  readonly reviewState: AdminReviewState;
  readonly snapshot: AdminReviewSnapshot;
}

export interface AdminDecisionReceiptData {
  readonly campaignId: string;
  readonly created: boolean;
  readonly decisionId: string;
  readonly participantId: string;
  readonly snapshotFingerprint: string;
  readonly version: number;
}

export interface AdminWinnerListData {
  readonly campaignId: string;
  readonly rows: readonly AdminWinnerRow[];
  readonly sourceFingerprint: string;
  readonly sourceVersion: "artifact-source-v1";
}

export interface AdminArtifactListData {
  readonly artifacts: readonly AdminArtifactMetadata[];
  readonly campaignId: string;
}

export interface AdminArtifactDetailData {
  readonly artifact: AdminArtifactMetadata;
  readonly sourceManifest: Readonly<Record<string, AdminSafeJsonValue>>;
}

export interface AdminArtifactReceiptData {
  readonly artifact: AdminArtifactMetadata;
  readonly created: boolean;
}

export interface AdminArtifactDownloadData {
  readonly bytes: Uint8Array;
  readonly contentBytes: number;
  readonly contentHash: string;
  readonly fileName: string;
  readonly mimeType: AdminArtifactMimeType;
}

export interface AdminListInput {
  readonly limit?: number;
}

export interface AdminReviewListInput extends AdminListInput {
  readonly state?: AdminReviewState;
}

export interface AdminArtifactListInput extends AdminListInput {
  readonly format?: AdminArtifactFormat;
}

export interface AdminSubmitDecisionInput {
  readonly decision: AdminDecisionValue;
  readonly idempotencyKey: string;
  readonly note?: string;
  readonly reasonCode: string;
  readonly snapshotFingerprint: string;
}

export interface AdminGenerateArtifactInput {
  readonly expectedSourceFingerprint?: string;
  readonly format: AdminArtifactFormat;
}

export interface AdminDownloadArtifactInput {
  readonly expectedContentHash?: string;
}

export interface AdminDurableReviewApiConfig {
  baseUrl?: string;
  headers?: HeadersInit;
  maxDownloadBytes?: number;
  maxResponseBytes?: number;
  timeoutMs?: number;
  tracePrefix?: string;
}

export interface AdminDurableReviewRequestContext {
  session: NormalizedWalletSession | null;
  signal: AbortSignal;
  traceId?: string;
}

export interface AdminDurableReviewApiBridgeFactoryOptions {
  config?: AdminDurableReviewApiConfig;
  fetchImpl?: AdminDurableReviewApiFetch;
  traceIdGenerator?: (operation: AdminDurableReviewOperation) => string;
}

export type AdminDurableReviewBridgeCode =
  | "BRIDGE_AUTH_HEADER_CONFLICT"
  | "BRIDGE_BASE_URL_INVALID"
  | "BRIDGE_BASE_URL_MISSING"
  | "BRIDGE_DOWNLOAD_BYTES_MISMATCH"
  | "BRIDGE_DOWNLOAD_FILENAME_INVALID"
  | "BRIDGE_DOWNLOAD_INTEGRITY_MISMATCH"
  | "BRIDGE_DOWNLOAD_MIME_INVALID"
  | "BRIDGE_INVALID_INPUT"
  | "BRIDGE_REQUEST_ABORTED"
  | "BRIDGE_REQUEST_FAILED"
  | "BRIDGE_REQUEST_TIMEOUT"
  | "BRIDGE_RESPONSE_EMPTY"
  | "BRIDGE_RESPONSE_IDENTITY_MISMATCH"
  | "BRIDGE_RESPONSE_INVALID"
  | "BRIDGE_RESPONSE_NON_JSON"
  | "BRIDGE_RESPONSE_OVERSIZE"
  | "BRIDGE_SESSION_INVALID";
export type AdminDurableReviewErrorCode = AdminDurableReviewBridgeCode | (string & {});
export type AdminDurableReviewFailurePhase =
  | "auth"
  | "config"
  | "identity"
  | "input"
  | "integrity"
  | "request"
  | "response";

export interface AdminDurableReviewSafeDetails {
  readonly diagnosticCode?: string;
  readonly field?: string;
  readonly operation?: string;
  readonly reconnectRequired?: boolean;
  readonly retryable?: boolean;
  readonly routeId?: string;
}

export interface AdminDurableReviewFailure {
  readonly bridgeCode?: AdminDurableReviewBridgeCode;
  readonly code: AdminDurableReviewErrorCode;
  readonly details?: AdminDurableReviewSafeDetails;
  readonly httpStatus?: number;
  ok: false;
  readonly phase: AdminDurableReviewFailurePhase;
  readonly reconnectRequired: boolean;
  readonly retryable: boolean;
  readonly traceId: string;
}

export interface AdminDurableReviewSuccess<T> {
  readonly data: T;
  readonly httpStatus: number;
  ok: true;
  readonly traceId: string;
}

export type AdminDurableReviewResult<T = unknown> =
  | AdminDurableReviewFailure
  | AdminDurableReviewSuccess<T>;

export interface AdminDurableReviewApiBridge {
  downloadArtifact(
    campaignId: string,
    artifactId: string,
    context: AdminDurableReviewRequestContext,
    input?: AdminDownloadArtifactInput,
  ): Promise<AdminDurableReviewResult<AdminArtifactDownloadData>>;
  generateArtifact(
    campaignId: string,
    input: AdminGenerateArtifactInput,
    context: AdminDurableReviewRequestContext,
  ): Promise<AdminDurableReviewResult<AdminArtifactReceiptData>>;
  getArtifactDetail(
    campaignId: string,
    artifactId: string,
    context: AdminDurableReviewRequestContext,
  ): Promise<AdminDurableReviewResult<AdminArtifactDetailData>>;
  getReviewDetail(
    campaignId: string,
    participantId: string,
    context: AdminDurableReviewRequestContext,
  ): Promise<AdminDurableReviewResult<AdminReviewDetailData>>;
  listArtifacts(
    campaignId: string,
    context: AdminDurableReviewRequestContext,
    input?: AdminArtifactListInput,
  ): Promise<AdminDurableReviewResult<AdminArtifactListData>>;
  listCampaigns(
    context: AdminDurableReviewRequestContext,
    input?: AdminListInput,
  ): Promise<AdminDurableReviewResult<AdminCampaignListData>>;
  listReviews(
    campaignId: string,
    context: AdminDurableReviewRequestContext,
    input?: AdminReviewListInput,
  ): Promise<AdminDurableReviewResult<AdminReviewQueueData>>;
  listWinners(
    campaignId: string,
    context: AdminDurableReviewRequestContext,
    input?: AdminListInput,
  ): Promise<AdminDurableReviewResult<AdminWinnerListData>>;
  submitDecision(
    campaignId: string,
    participantId: string,
    input: AdminSubmitDecisionInput,
    context: AdminDurableReviewRequestContext,
  ): Promise<AdminDurableReviewResult<AdminDecisionReceiptData>>;
}

interface NormalizedConfig {
  readonly baseUrl?: URL;
  readonly configCode?: Extract<
    AdminDurableReviewBridgeCode,
    "BRIDGE_BASE_URL_INVALID" | "BRIDGE_BASE_URL_MISSING"
  >;
  readonly headers?: HeadersInit;
  readonly maxDownloadBytes: number;
  readonly maxResponseBytes: number;
  readonly timeoutMs: number;
  readonly tracePrefix: string;
}

interface NormalizationSuccess<T> {
  readonly ok: true;
  readonly value: T;
}

interface NormalizationFailure {
  readonly ok: false;
  readonly reason: "identity" | "invalid";
}

type NormalizationResult<T> = NormalizationFailure | NormalizationSuccess<T>;

interface AuthenticatedRequestInput {
  readonly accept?: string;
  readonly body?: unknown;
  readonly context: AdminDurableReviewRequestContext;
  readonly idempotencyKey?: string;
  readonly method: "GET" | "POST";
  readonly operation: AdminDurableReviewOperation;
  readonly path: string;
  readonly query?: Readonly<Record<string, string | undefined>>;
}

interface RequestInput<T> extends AuthenticatedRequestInput {
  readonly normalize: (data: unknown) => NormalizationResult<T>;
  readonly successStatuses: ReadonlySet<number>;
}

const defaultTimeoutMs = 5_000;
const defaultMaxResponseBytes = 5 * 1_024 * 1_024;
const defaultMaxDownloadBytes = 10 * 1_024 * 1_024;
const maxTimeoutMs = 30_000;
const maxResponseBytes = 10 * 1_024 * 1_024;
const maxIdentityLength = 160;
const maxTraceLength = 128;
const maxGeneralTextLength = 4_096;
const maxArtifactRows = 5_000;
const maxSafeJsonDepth = 12;
const maxSafeJsonNodes = 250_000;
const sha256Pattern = /^[a-f0-9]{64}$/u;
const safeTracePattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const safeCodePattern = /^[A-Z][A-Z0-9_]{0,95}$/u;
const unsafeCodePattern = /(?:^|_)(?:API_?KEY|PASSWORD|PRIVATE_?KEY|PROOF|SECRET|SIGNATURE|SQL|STACK|TOKEN)(?:_|$)/u;
const safeFileNamePattern = /^(?!\.{1,2}$)[A-Za-z0-9._-]{1,180}$/u;
const idempotencyKeyPattern = /^[A-Za-z0-9._:-]{8,128}$/u;
const reasonCodePattern = /^[a-z0-9_:-]{1,64}$/u;
const isoDateTimePattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))$/u;
const unsafeJsonKeyPattern = /(?:authorization|cookie|database.?url|password|private.?key|proof|secret|signature|sql|stack|token)/iu;
const unsafeJsonTextPattern = /(?:\b(?:postgres|postgresql|redis):\/\/|\/(?:Users|home|private|tmp|var\/folders)\/|[A-Za-z]:\\(?:Users|Windows\\Temp|Temp)\\|\bBearer\s+\S+|\b(?:token|password|api[_-]?key)\s*[=:])/iu;
const safeDetailTextPattern = /^[A-Za-z0-9][A-Za-z0-9._:[\]-]{0,127}$/u;
const reviewStates = new Set<AdminReviewState>([
  "approved_current",
  "needs_review_current",
  "pending_review",
  "rejected_current",
  "stale",
]);
const decisionValues = new Set<AdminDecisionValue>(["approved", "needs_review", "rejected"]);
const artifactFormats = new Set<AdminArtifactFormat>(["csv", "json"]);
const operatorRoles = new Set<AdminOperatorRole>(["internal_operator", "review_operator"]);
const artifactSourceContractModes = new Set([
  "CONTRACT_CLAIM",
  "OFF_CHAIN_MVP",
  "V2_COMPANION",
] as const);
const artifactSourceWalletPolicies = new Set(["AA_ONLY", "ANY", "EOA_ONLY"] as const);
const jsonContentType = "application/json";
const protectedOperationHeaders = Object.freeze([
  "idempotency-key",
  "x-campaign-os-idempotency-key",
  "x-campaign-os-trace-id",
]);

let fallbackTraceSequence = 0;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasOnlyKeys = (
  value: Record<string, unknown>,
  allowed: readonly string[],
): boolean => {
  const allowedKeys = new Set(allowed);
  return Object.keys(value).every((key) => allowedKeys.has(key));
};

const hasRequiredKeys = (
  value: Record<string, unknown>,
  required: readonly string[],
): boolean => required.every((key) => Object.prototype.hasOwnProperty.call(value, key));

const text = (value: unknown, maximum = maxGeneralTextLength): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0
    && normalized.length <= maximum
    && !/[\u0000-\u001f\u007f-\u009f]/u.test(normalized)
    ? normalized
    : undefined;
};

const identity = (value: unknown): string | undefined => {
  const normalized = text(value, maxIdentityLength);
  return normalized && normalized !== "." && normalized !== ".." ? normalized : undefined;
};

const safeTraceId = (value: unknown): string | undefined => {
  const normalized = text(value, maxTraceLength);
  return normalized && safeTracePattern.test(normalized) ? normalized : undefined;
};

const sha256 = (value: unknown): string | undefined =>
  typeof value === "string" && sha256Pattern.test(value) ? value : undefined;

const nonNegativeInteger = (value: unknown, maximum = Number.MAX_SAFE_INTEGER): number | undefined =>
  typeof value === "number"
  && Number.isSafeInteger(value)
  && value >= 0
  && value <= maximum
    ? value
    : undefined;

const positiveInteger = (value: unknown, maximum = Number.MAX_SAFE_INTEGER): number | undefined => {
  const normalized = nonNegativeInteger(value, maximum);
  return normalized !== undefined && normalized > 0 ? normalized : undefined;
};

const booleanValue = (value: unknown): boolean | undefined =>
  typeof value === "boolean" ? value : undefined;

const enumValue = <T extends string>(value: unknown, values: ReadonlySet<T>): T | undefined => {
  const normalized = text(value, 128);
  return normalized && values.has(normalized as T) ? normalized as T : undefined;
};

const isoDateTime = (value: unknown): string | undefined => {
  const normalized = text(value, 128);
  const match = normalized ? isoDateTimePattern.exec(normalized) : null;
  if (!normalized || !match || !Number.isFinite(Date.parse(normalized))) {
    return undefined;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const offsetHour = match[7] === undefined ? 0 : Number(match[7]);
  const offsetMinute = match[8] === undefined ? 0 : Number(match[8]);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1
    && month <= 12
    && day >= 1
    && day <= (daysInMonth[month - 1] ?? 0)
    && hour <= 23
    && minute <= 59
    && second <= 59
    && offsetHour <= 23
    && offsetMinute <= 59
    ? normalized
    : undefined;
};

const noteText = (value: unknown): string | undefined => {
  if (typeof value !== "string" || value.length > 1_000) {
    return undefined;
  }
  return /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(value)
    ? undefined
    : value;
};

const exactRecord = (
  value: unknown,
  required: readonly string[],
  allowed: readonly string[] = required,
): value is Record<string, unknown> => isRecord(value)
  && hasRequiredKeys(value, required)
  && hasOnlyKeys(value, allowed);

const normalizeTextList = (
  value: unknown,
  maximumItems: number,
  itemMaximum = 128,
): readonly string[] | undefined => {
  if (!Array.isArray(value) || value.length > maximumItems) {
    return undefined;
  }
  const normalized = value.map((item) => text(item, itemMaximum));
  return normalized.every((item): item is string => item !== undefined)
    ? Object.freeze(normalized)
    : undefined;
};

interface SafeJsonBudget {
  nodes: number;
}

const normalizeSafeJson = (
  value: unknown,
  budget: SafeJsonBudget,
  depth = 0,
): AdminSafeJsonValue | undefined => {
  budget.nodes += 1;
  if (budget.nodes > maxSafeJsonNodes || depth > maxSafeJsonDepth) {
    return undefined;
  }
  if (value === null || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string") {
    return value.length <= maxGeneralTextLength
      && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(value)
      && !unsafeJsonTextPattern.test(value)
      ? value
      : undefined;
  }
  if (Array.isArray(value)) {
    if (value.length > 5_000) {
      return undefined;
    }
    const output: AdminSafeJsonValue[] = [];
    for (const item of value) {
      const normalized = normalizeSafeJson(item, budget, depth + 1);
      if (normalized === undefined) {
        return undefined;
      }
      output.push(normalized);
    }
    return Object.freeze(output);
  }
  if (!isRecord(value)) {
    return undefined;
  }
  const entries = Object.entries(value);
  if (entries.length > 200) {
    return undefined;
  }
  const output: Array<[string, AdminSafeJsonValue]> = [];
  for (const [key, item] of entries) {
    if (!text(key, 128) || unsafeJsonKeyPattern.test(key)) {
      return undefined;
    }
    const normalized = normalizeSafeJson(item, budget, depth + 1);
    if (normalized === undefined) {
      return undefined;
    }
    output.push([key, normalized]);
  }
  return Object.freeze(Object.fromEntries(output)) as Readonly<Record<string, AdminSafeJsonValue>>;
};

const normalizeSafeRecord = (
  value: unknown,
  budget: SafeJsonBudget,
): Readonly<Record<string, AdminSafeJsonValue>> | undefined => {
  const normalized = normalizeSafeJson(value, budget);
  return normalized && !Array.isArray(normalized) && typeof normalized === "object"
    ? normalized as Readonly<Record<string, AdminSafeJsonValue>>
    : undefined;
};

const nestedIdentityMatches = (
  value: AdminSafeJsonValue,
  key: "artifactId" | "campaignId" | "participantId",
  expected: string,
): boolean => {
  if (Array.isArray(value)) {
    return value.every((item) => nestedIdentityMatches(item, key, expected));
  }
  if (!value || typeof value !== "object") {
    return true;
  }
  for (const [nestedKey, nestedValue] of Object.entries(value)) {
    if (nestedKey === key && nestedValue !== expected) {
      return false;
    }
    if (!nestedIdentityMatches(nestedValue, key, expected)) {
      return false;
    }
  }
  return true;
};

const valid = <T>(value: T): NormalizationSuccess<T> => ({ ok: true, value });
const invalidNormalization = (): NormalizationFailure => ({ ok: false, reason: "invalid" });
const identityNormalization = (): NormalizationFailure => ({ ok: false, reason: "identity" });

const normalizeRepository = (value: unknown): AdminRepositoryMetadata | undefined => {
  if (!exactRecord(value, ["adapterId", "durable", "repositoryId", "storeId"])) {
    return undefined;
  }
  const repositoryId = identity(value.repositoryId);
  return repositoryId
    && value.adapterId === "campaign-db-postgresql-adapter"
    && value.durable === true
    && value.storeId === "campaign-db"
    ? Object.freeze({
        adapterId: "campaign-db-postgresql-adapter",
        durable: true,
        repositoryId,
        storeId: "campaign-db",
      })
    : undefined;
};

const normalizeCampaign = (value: unknown): AdminCampaignSummary | undefined => {
  if (!exactRecord(value, [
    "campaignId",
    "ownerAddress",
    "participantCount",
    "projectId",
    "status",
    "taskCount",
  ])) {
    return undefined;
  }
  const campaignId = identity(value.campaignId);
  const ownerAddress = identity(value.ownerAddress);
  const participantCount = nonNegativeInteger(value.participantCount);
  const projectId = identity(value.projectId);
  const status = text(value.status, 64);
  const taskCount = nonNegativeInteger(value.taskCount);
  return campaignId
    && ownerAddress
    && participantCount !== undefined
    && projectId
    && status
    && taskCount !== undefined
    ? Object.freeze({ campaignId, ownerAddress, participantCount, projectId, status, taskCount })
    : undefined;
};

const normalizeCoverage = (value: unknown): AdminReviewCoverage | undefined => {
  if (!exactRecord(value, ["completedTasks", "evidenceCount", "requiredTasks", "totalTasks"])) {
    return undefined;
  }
  const completedTasks = nonNegativeInteger(value.completedTasks);
  const evidenceCount = nonNegativeInteger(value.evidenceCount);
  const requiredTasks = nonNegativeInteger(value.requiredTasks);
  const totalTasks = nonNegativeInteger(value.totalTasks);
  return completedTasks !== undefined
    && evidenceCount !== undefined
    && requiredTasks !== undefined
    && totalTasks !== undefined
    && completedTasks <= totalTasks
    && requiredTasks <= totalTasks
    ? Object.freeze({ completedTasks, evidenceCount, requiredTasks, totalTasks })
    : undefined;
};

const decisionSummaryKeys = [
  "decision",
  "decisionId",
  "decidedAt",
  "operatorRole",
  "operatorSubject",
  "reasonCode",
  "snapshotFingerprint",
  "version",
] as const;

const normalizeDecisionSummary = (value: unknown): AdminDecisionSummary | undefined => {
  if (!exactRecord(value, [
    "decision",
    "decisionId",
    "decidedAt",
    "operatorRole",
    "operatorSubject",
    "snapshotFingerprint",
    "version",
  ], decisionSummaryKeys)) {
    return undefined;
  }
  const decision = enumValue(value.decision, decisionValues);
  const decisionId = identity(value.decisionId);
  const decidedAt = isoDateTime(value.decidedAt);
  const operatorRole = enumValue(value.operatorRole, operatorRoles);
  const operatorSubject = identity(value.operatorSubject);
  const reasonCode = value.reasonCode === undefined ? undefined : text(value.reasonCode, 64);
  const snapshotFingerprint = sha256(value.snapshotFingerprint);
  const version = positiveInteger(value.version);
  return decision
    && decisionId
    && decidedAt
    && operatorRole
    && operatorSubject
    && (value.reasonCode === undefined || reasonCode)
    && snapshotFingerprint
    && version !== undefined
    ? Object.freeze({
        decision,
        decisionId,
        decidedAt,
        operatorRole,
        operatorSubject,
        ...(reasonCode ? { reasonCode } : {}),
        snapshotFingerprint,
        version,
      })
    : undefined;
};

const normalizeDecisionRecord = (value: unknown): AdminDecisionRecord | undefined => {
  const allowed = [...decisionSummaryKeys, "note", "payloadHash", "traceId"];
  if (!exactRecord(value, [
    "decision",
    "decisionId",
    "decidedAt",
    "note",
    "operatorRole",
    "operatorSubject",
    "payloadHash",
    "reasonCode",
    "snapshotFingerprint",
    "traceId",
    "version",
  ], allowed)) {
    return undefined;
  }
  const summary = normalizeDecisionSummary(Object.fromEntries(
    decisionSummaryKeys
      .filter((key) => value[key] !== undefined)
      .map((key) => [key, value[key]]),
  ));
  const note = value.note === null ? null : noteText(value.note);
  const payloadHashValue = sha256(value.payloadHash);
  const reasonCode = text(value.reasonCode, 64);
  const traceId = safeTraceId(value.traceId);
  return summary
    && (value.note === null || note !== undefined)
    && payloadHashValue
    && reasonCode
    && traceId
    ? Object.freeze({ ...summary, note: note ?? null, payloadHash: payloadHashValue, reasonCode, traceId })
    : undefined;
};

const normalizeQueueItem = (value: unknown): AdminReviewQueueItem | undefined => {
  if (!exactRecord(value, [
    "campaignId",
    "coverage",
    "currentFingerprint",
    "eligible",
    "participantId",
    "rank",
    "reviewState",
    "riskFlags",
    "totalPoints",
    "walletAddress",
  ], [
    "campaignId",
    "coverage",
    "currentDecision",
    "currentFingerprint",
    "eligible",
    "participantId",
    "rank",
    "reviewState",
    "riskFlags",
    "totalPoints",
    "walletAddress",
  ])) {
    return undefined;
  }
  const campaignId = identity(value.campaignId);
  const coverage = normalizeCoverage(value.coverage);
  const currentDecision = value.currentDecision === undefined || value.currentDecision === null
    ? null
    : normalizeDecisionSummary(value.currentDecision);
  const currentFingerprint = sha256(value.currentFingerprint);
  const eligible = booleanValue(value.eligible);
  const participantId = identity(value.participantId);
  const rank = value.rank === null ? null : positiveInteger(value.rank);
  const reviewState = enumValue(value.reviewState, reviewStates);
  const riskFlags = normalizeTextList(value.riskFlags, 100, 128);
  const totalPoints = nonNegativeInteger(value.totalPoints);
  const walletAddress = identity(value.walletAddress);
  return campaignId
    && coverage
    && (value.currentDecision === undefined || value.currentDecision === null || currentDecision)
    && currentFingerprint
    && eligible !== undefined
    && participantId
    && (value.rank === null || rank !== undefined)
    && reviewState
    && riskFlags
    && totalPoints !== undefined
    && walletAddress
    ? Object.freeze({
        campaignId,
        coverage,
        currentDecision: currentDecision ?? null,
        currentFingerprint,
        eligible,
        participantId,
        rank: rank ?? null,
        reviewState,
        riskFlags,
        totalPoints,
        walletAddress,
      })
    : undefined;
};

const normalizeSnapshot = (value: unknown): AdminReviewSnapshot | undefined => {
  if (!exactRecord(value, [
    "campaignId",
    "completions",
    "evidence",
    "fingerprint",
    "fingerprintVersion",
    "participantId",
    "tasks",
  ], [
    "campaignId",
    "completions",
    "evidence",
    "fingerprint",
    "fingerprintVersion",
    "generatedAt",
    "participantId",
    "tasks",
  ])) {
    return undefined;
  }
  const campaignId = identity(value.campaignId);
  const participantId = identity(value.participantId);
  const fingerprintValue = sha256(value.fingerprint);
  const generatedAt = value.generatedAt === undefined ? undefined : isoDateTime(value.generatedAt);
  if (
    !campaignId
    || !participantId
    || !fingerprintValue
    || value.fingerprintVersion !== "review-snapshot-v1"
    || (value.generatedAt !== undefined && !generatedAt)
  ) {
    return undefined;
  }
  const budget: SafeJsonBudget = { nodes: 0 };
  const normalizeRecords = (records: unknown): readonly Readonly<Record<string, AdminSafeJsonValue>>[] | undefined => {
    if (!Array.isArray(records) || records.length > 1_000) {
      return undefined;
    }
    const normalized = records.map((record) => normalizeSafeRecord(record, budget));
    return normalized.every((record): record is Readonly<Record<string, AdminSafeJsonValue>> => Boolean(record))
      ? Object.freeze(normalized)
      : undefined;
  };
  const completions = normalizeRecords(value.completions);
  const evidence = normalizeRecords(value.evidence);
  const tasks = normalizeRecords(value.tasks);
  return completions && evidence && tasks
    ? Object.freeze({
        campaignId,
        completions,
        evidence,
        fingerprint: fingerprintValue,
        fingerprintVersion: "review-snapshot-v1",
        ...(generatedAt ? { generatedAt } : {}),
        participantId,
        tasks,
      })
    : undefined;
};

const normalizeWinner = (value: unknown): AdminWinnerRow | undefined => {
  if (!exactRecord(value, [
    "campaignId",
    "decisionId",
    "decisionVersion",
    "participantId",
    "rank",
    "snapshotFingerprint",
    "totalPoints",
    "walletAddress",
  ], [
    "campaignId",
    "decisionId",
    "decisionVersion",
    "evidenceHashes",
    "participantId",
    "rank",
    "snapshotFingerprint",
    "totalPoints",
    "walletAddress",
  ])) {
    return undefined;
  }
  const campaignId = identity(value.campaignId);
  const decisionId = identity(value.decisionId);
  const decisionVersion = positiveInteger(value.decisionVersion);
  const evidenceHashes = value.evidenceHashes === undefined
    ? Object.freeze([] as string[])
    : Array.isArray(value.evidenceHashes)
      && value.evidenceHashes.length <= 1_000
      && value.evidenceHashes.every((hash) => Boolean(sha256(hash)))
      ? Object.freeze(value.evidenceHashes as string[])
      : undefined;
  const participantId = identity(value.participantId);
  const rank = value.rank === null ? null : positiveInteger(value.rank);
  const snapshotFingerprint = sha256(value.snapshotFingerprint);
  const totalPoints = nonNegativeInteger(value.totalPoints);
  const walletAddress = identity(value.walletAddress);
  return campaignId
    && decisionId
    && decisionVersion !== undefined
    && evidenceHashes
    && participantId
    && (value.rank === null || rank !== undefined)
    && snapshotFingerprint
    && totalPoints !== undefined
    && walletAddress
    ? Object.freeze({
        campaignId,
        decisionId,
        decisionVersion,
        evidenceHashes,
        participantId,
        rank: rank ?? null,
        snapshotFingerprint,
        totalPoints,
        walletAddress,
      })
    : undefined;
};

const artifactSourceCampaignKeys = [
  "contractMode",
  "endTime",
  "id",
  "startTime",
  "status",
  "updatedAt",
  "walletPolicy",
] as const;
const artifactSourceWinnerKeys = [
  "campaignId",
  "decisionId",
  "decisionVersion",
  "evidenceHashes",
  "participantId",
  "rank",
  "snapshotFingerprint",
  "totalPoints",
  "walletAddress",
] as const;

const normalizeArtifactSourceCampaign = (
  value: unknown,
  expectedCampaignId: string,
): NormalizationResult<Readonly<Record<string, AdminSafeJsonValue>>> => {
  if (!exactRecord(value, artifactSourceCampaignKeys)) {
    return invalidNormalization();
  }
  const id = identity(value.id);
  if (id && id !== expectedCampaignId) {
    return identityNormalization();
  }
  const contractMode = enumValue(value.contractMode, artifactSourceContractModes);
  const endTime = text(value.endTime, 128);
  const startTime = text(value.startTime, 128);
  const status = text(value.status, 128);
  const updatedAt = text(value.updatedAt, 128);
  const walletPolicy = enumValue(value.walletPolicy, artifactSourceWalletPolicies);
  if (!id || !contractMode || !endTime || !startTime || !status || !updatedAt || !walletPolicy) {
    return invalidNormalization();
  }
  return valid(Object.freeze({
    contractMode,
    endTime,
    id,
    startTime,
    status,
    updatedAt,
    walletPolicy,
  }));
};

const normalizeArtifactSourceWinner = (value: unknown): AdminWinnerRow | undefined => {
  if (!exactRecord(value, artifactSourceWinnerKeys)) {
    return undefined;
  }
  const row = normalizeWinner(value);
  return row && new Set(row.evidenceHashes).size === row.evidenceHashes.length
    ? row
    : undefined;
};

const normalizeArtifactSourceManifest = (
  value: unknown,
  expectedCampaignId: string,
  expectedRowCount: number,
): NormalizationResult<Readonly<Record<string, AdminSafeJsonValue>>> => {
  if (
    !exactRecord(value, ["campaign", "rows", "version"])
    || value.version !== "artifact-source-v1"
    || !Array.isArray(value.rows)
    || value.rows.length > maxArtifactRows
    || value.rows.length !== expectedRowCount
  ) {
    return invalidNormalization();
  }
  const campaign = normalizeArtifactSourceCampaign(value.campaign, expectedCampaignId);
  if (!campaign.ok) {
    return campaign;
  }
  const rows = value.rows.map(normalizeArtifactSourceWinner);
  if (!rows.every((row): row is AdminWinnerRow => Boolean(row))) {
    return invalidNormalization();
  }
  if (rows.some((row) => row.campaignId !== expectedCampaignId)) {
    return identityNormalization();
  }
  if (new Set(rows.map((row) => row.participantId)).size !== rows.length) {
    return invalidNormalization();
  }
  const safeRows = rows.map((row): Readonly<Record<string, AdminSafeJsonValue>> => Object.freeze({
    campaignId: row.campaignId,
    decisionId: row.decisionId,
    decisionVersion: row.decisionVersion,
    evidenceHashes: row.evidenceHashes,
    participantId: row.participantId,
    rank: row.rank,
    snapshotFingerprint: row.snapshotFingerprint,
    totalPoints: row.totalPoints,
    walletAddress: row.walletAddress,
  }));
  return valid(Object.freeze({
    campaign: campaign.value,
    rows: Object.freeze(safeRows),
    version: "artifact-source-v1",
  }));
};

const expectedMimeType = (format: AdminArtifactFormat): AdminArtifactMimeType =>
  format === "csv" ? "text/csv;charset=utf-8" : "application/json;charset=utf-8";

const normalizeArtifact = (value: unknown): AdminArtifactMetadata | undefined => {
  if (!exactRecord(value, [
    "artifactId",
    "campaignId",
    "contentBytes",
    "contentHash",
    "createdAt",
    "creatorRole",
    "creatorSubject",
    "fileName",
    "format",
    "mimeType",
    "rowCount",
    "sourceFingerprint",
    "sourceVersion",
    "traceId",
  ])) {
    return undefined;
  }
  const artifactId = identity(value.artifactId);
  const campaignId = identity(value.campaignId);
  const contentBytes = nonNegativeInteger(value.contentBytes, defaultMaxDownloadBytes);
  const contentHash = sha256(value.contentHash);
  const createdAt = isoDateTime(value.createdAt);
  const creatorRole = enumValue(value.creatorRole, operatorRoles);
  const creatorSubject = identity(value.creatorSubject);
  const fileName = text(value.fileName, 180);
  const format = enumValue(value.format, artifactFormats);
  const mimeType = text(value.mimeType, 64) as AdminArtifactMimeType | undefined;
  const rowCount = nonNegativeInteger(value.rowCount, maxArtifactRows);
  const sourceFingerprint = sha256(value.sourceFingerprint);
  const traceId = safeTraceId(value.traceId);
  return artifactId
    && campaignId
    && contentBytes !== undefined
    && contentHash
    && createdAt
    && creatorRole
    && creatorSubject
    && fileName
    && safeFileNamePattern.test(fileName)
    && format
    && mimeType === expectedMimeType(format)
    && fileName.toLowerCase().endsWith(`.${format}`)
    && rowCount !== undefined
    && sourceFingerprint
    && value.sourceVersion === "artifact-source-v1"
    && traceId
    ? Object.freeze({
        artifactId,
        campaignId,
        contentBytes,
        contentHash,
        createdAt,
        creatorRole,
        creatorSubject,
        fileName,
        format,
        mimeType,
        rowCount,
        sourceFingerprint,
        sourceVersion: "artifact-source-v1",
        traceId,
      })
    : undefined;
};

const normalizeCampaignList = (
  value: unknown,
  expectedLimit?: number,
): NormalizationResult<AdminCampaignListData> => {
  if (!exactRecord(value, ["campaigns", "repository"]) || !Array.isArray(value.campaigns) || value.campaigns.length > 100) {
    return invalidNormalization();
  }
  if (expectedLimit !== undefined && value.campaigns.length > expectedLimit) {
    return invalidNormalization();
  }
  const campaigns = value.campaigns.map(normalizeCampaign);
  const repositoryValue = normalizeRepository(value.repository);
  return campaigns.every((item): item is AdminCampaignSummary => Boolean(item)) && repositoryValue
    ? valid(Object.freeze({ campaigns: Object.freeze(campaigns), repository: repositoryValue }))
    : invalidNormalization();
};

const normalizeReviewQueue = (
  value: unknown,
  expectedCampaignId: string,
  expectedState?: AdminReviewState,
  expectedLimit?: number,
): NormalizationResult<AdminReviewQueueData> => {
  if (!exactRecord(value, ["campaignId", "items", "summary"])) {
    return invalidNormalization();
  }
  const campaignId = identity(value.campaignId);
  if (campaignId && campaignId !== expectedCampaignId) {
    return identityNormalization();
  }
  if (
    !campaignId
    || !Array.isArray(value.items)
    || value.items.length > 100
    || expectedLimit !== undefined && value.items.length > expectedLimit
  ) {
    return invalidNormalization();
  }
  const items = value.items.map(normalizeQueueItem);
  if (!items.every((item): item is AdminReviewQueueItem => Boolean(item))) {
    return invalidNormalization();
  }
  if (items.some((item) => item.campaignId !== expectedCampaignId)) {
    return identityNormalization();
  }
  if (expectedState !== undefined && items.some((item) => item.reviewState !== expectedState)) {
    return invalidNormalization();
  }
  if (!exactRecord(value.summary, [
    "approvedCurrent",
    "needsReviewCurrent",
    "pendingReview",
    "rejectedCurrent",
    "stale",
    "total",
  ])) {
    return invalidNormalization();
  }
  const approvedCurrent = nonNegativeInteger(value.summary.approvedCurrent);
  const needsReviewCurrent = nonNegativeInteger(value.summary.needsReviewCurrent);
  const pendingReview = nonNegativeInteger(value.summary.pendingReview);
  const rejectedCurrent = nonNegativeInteger(value.summary.rejectedCurrent);
  const stale = nonNegativeInteger(value.summary.stale);
  const total = nonNegativeInteger(value.summary.total);
  return approvedCurrent !== undefined
    && needsReviewCurrent !== undefined
    && pendingReview !== undefined
    && rejectedCurrent !== undefined
    && stale !== undefined
    && total !== undefined
    ? valid(Object.freeze({
        campaignId,
        items: Object.freeze(items),
        summary: Object.freeze({ approvedCurrent, needsReviewCurrent, pendingReview, rejectedCurrent, stale, total }),
      }))
    : invalidNormalization();
};

const snapshotIdentitiesMatch = (
  snapshot: AdminReviewSnapshot,
  expectedCampaignId: string,
  expectedParticipantId: string,
): boolean => {
  const nested = [...snapshot.tasks, ...snapshot.completions, ...snapshot.evidence];
  return snapshot.campaignId === expectedCampaignId
    && snapshot.participantId === expectedParticipantId
    && nested.every((item) => nestedIdentityMatches(item, "campaignId", expectedCampaignId))
    && nested.every((item) => nestedIdentityMatches(item, "participantId", expectedParticipantId));
};

const normalizeReviewDetail = (
  value: unknown,
  expectedCampaignId: string,
  expectedParticipantId: string,
): NormalizationResult<AdminReviewDetailData> => {
  if (!exactRecord(value, [
    "campaignId",
    "currentDecision",
    "history",
    "participantId",
    "reviewState",
    "snapshot",
  ])) {
    return invalidNormalization();
  }
  const campaignId = identity(value.campaignId);
  const participantId = identity(value.participantId);
  if (
    campaignId && campaignId !== expectedCampaignId
    || participantId && participantId !== expectedParticipantId
  ) {
    return identityNormalization();
  }
  const currentDecision = value.currentDecision === null ? null : normalizeDecisionRecord(value.currentDecision);
  const history = Array.isArray(value.history) && value.history.length <= 100
    ? value.history.map(normalizeDecisionRecord)
    : undefined;
  const reviewState = enumValue(value.reviewState, reviewStates);
  const snapshot = normalizeSnapshot(value.snapshot);
  if (
    !campaignId
    || !participantId
    || (value.currentDecision !== null && !currentDecision)
    || !history
    || !history.every((item): item is AdminDecisionRecord => Boolean(item))
    || !reviewState
    || !snapshot
  ) {
    return invalidNormalization();
  }
  if (!snapshotIdentitiesMatch(snapshot, expectedCampaignId, expectedParticipantId)) {
    return identityNormalization();
  }
  return valid(Object.freeze({
    campaignId,
    currentDecision: currentDecision ?? null,
    history: Object.freeze(history),
    participantId,
    reviewState,
    snapshot,
  }));
};

const normalizeDecisionReceipt = (
  value: unknown,
  expectedCampaignId: string,
  expectedParticipantId: string,
  expectedSnapshotFingerprint: string,
): NormalizationResult<AdminDecisionReceiptData> => {
  if (!exactRecord(value, [
    "campaignId",
    "created",
    "decisionId",
    "participantId",
    "snapshotFingerprint",
    "version",
  ])) {
    return invalidNormalization();
  }
  const campaignId = identity(value.campaignId);
  const participantId = identity(value.participantId);
  if (
    campaignId && campaignId !== expectedCampaignId
    || participantId && participantId !== expectedParticipantId
  ) {
    return identityNormalization();
  }
  const created = booleanValue(value.created);
  const decisionId = identity(value.decisionId);
  const snapshotFingerprint = sha256(value.snapshotFingerprint);
  const version = positiveInteger(value.version);
  if (snapshotFingerprint && snapshotFingerprint !== expectedSnapshotFingerprint) {
    return identityNormalization();
  }
  return campaignId
    && participantId
    && created !== undefined
    && decisionId
    && snapshotFingerprint
    && version !== undefined
    ? valid(Object.freeze({ campaignId, created, decisionId, participantId, snapshotFingerprint, version }))
    : invalidNormalization();
};

const normalizeWinners = (
  value: unknown,
  expectedCampaignId: string,
  expectedLimit?: number,
): NormalizationResult<AdminWinnerListData> => {
  if (!exactRecord(value, ["campaignId", "rows", "sourceFingerprint", "sourceVersion"])) {
    return invalidNormalization();
  }
  const campaignId = identity(value.campaignId);
  if (campaignId && campaignId !== expectedCampaignId) {
    return identityNormalization();
  }
  const sourceFingerprintValue = sha256(value.sourceFingerprint);
  if (
    !campaignId
    || !Array.isArray(value.rows)
    || value.rows.length > maxArtifactRows
    || expectedLimit !== undefined && value.rows.length > expectedLimit
    || !sourceFingerprintValue
    || value.sourceVersion !== "artifact-source-v1"
  ) {
    return invalidNormalization();
  }
  const rows = value.rows.map(normalizeWinner);
  if (!rows.every((row): row is AdminWinnerRow => Boolean(row))) {
    return invalidNormalization();
  }
  return rows.some((row) => row.campaignId !== expectedCampaignId)
    ? identityNormalization()
    : valid(Object.freeze({
        campaignId,
        rows: Object.freeze(rows),
        sourceFingerprint: sourceFingerprintValue,
        sourceVersion: "artifact-source-v1",
      }));
};

const normalizeArtifactList = (
  value: unknown,
  expectedCampaignId: string,
  expectedFormat?: AdminArtifactFormat,
  expectedLimit?: number,
): NormalizationResult<AdminArtifactListData> => {
  if (!exactRecord(value, ["artifacts", "campaignId"])) {
    return invalidNormalization();
  }
  const campaignId = identity(value.campaignId);
  if (campaignId && campaignId !== expectedCampaignId) {
    return identityNormalization();
  }
  if (
    !campaignId
    || !Array.isArray(value.artifacts)
    || value.artifacts.length > 100
    || expectedLimit !== undefined && value.artifacts.length > expectedLimit
  ) {
    return invalidNormalization();
  }
  const artifacts = value.artifacts.map(normalizeArtifact);
  if (!artifacts.every((item): item is AdminArtifactMetadata => Boolean(item))) {
    return invalidNormalization();
  }
  if (expectedFormat !== undefined && artifacts.some((item) => item.format !== expectedFormat)) {
    return invalidNormalization();
  }
  return artifacts.some((item) => item.campaignId !== expectedCampaignId)
    ? identityNormalization()
    : valid(Object.freeze({ artifacts: Object.freeze(artifacts), campaignId }));
};

const normalizeArtifactDetail = (
  value: unknown,
  expectedCampaignId: string,
  expectedArtifactId: string,
): NormalizationResult<AdminArtifactDetailData> => {
  if (!exactRecord(value, ["artifact", "sourceManifest"])) {
    return invalidNormalization();
  }
  const artifact = normalizeArtifact(value.artifact);
  if (artifact && (
    artifact.campaignId !== expectedCampaignId
    || artifact.artifactId !== expectedArtifactId
  )) {
    return identityNormalization();
  }
  if (!artifact) {
    return invalidNormalization();
  }
  const sourceManifest = normalizeArtifactSourceManifest(
    value.sourceManifest,
    expectedCampaignId,
    artifact.rowCount,
  );
  return sourceManifest.ok
    ? valid(Object.freeze({ artifact, sourceManifest: sourceManifest.value }))
    : sourceManifest;
};

const normalizeArtifactReceipt = (
  value: unknown,
  expectedCampaignId: string,
  expectedFormat: AdminArtifactFormat,
  expectedSourceFingerprint?: string,
): NormalizationResult<AdminArtifactReceiptData> => {
  if (!exactRecord(value, ["artifact", "created"])) {
    return invalidNormalization();
  }
  const artifact = normalizeArtifact(value.artifact);
  const created = booleanValue(value.created);
  if (artifact && (
    artifact.campaignId !== expectedCampaignId
    || artifact.format !== expectedFormat
    || expectedSourceFingerprint !== undefined
      && artifact.sourceFingerprint !== expectedSourceFingerprint
  )) {
    return identityNormalization();
  }
  return artifact && created !== undefined
    ? valid(Object.freeze({ artifact, created }))
    : invalidNormalization();
};

const positiveConfig = (value: unknown, fallback: number, maximum: number): number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? Math.min(value, maximum)
    : fallback;

const normalizeConfig = (config: AdminDurableReviewApiConfig | undefined): NormalizedConfig => {
  try {
    const timeoutMs = positiveConfig(config?.timeoutMs, defaultTimeoutMs, maxTimeoutMs);
    const configuredResponseBytes = positiveConfig(config?.maxResponseBytes, defaultMaxResponseBytes, maxResponseBytes);
    const configuredDownloadBytes = positiveConfig(config?.maxDownloadBytes, defaultMaxDownloadBytes, defaultMaxDownloadBytes);
    const configuredTracePrefix = text(config?.tracePrefix, 64)
      ?.replace(/[^A-Za-z0-9._-]/gu, "-")
      .replace(/^[^A-Za-z0-9]+/u, "");
    const tracePrefix = configuredTracePrefix || "admin-durable-review";
    const headers = config?.headers;
    const rawBaseUrl = text(config?.baseUrl, 2_048);
    if (!rawBaseUrl) {
      return {
        configCode: "BRIDGE_BASE_URL_MISSING",
        headers,
        maxDownloadBytes: configuredDownloadBytes,
        maxResponseBytes: configuredResponseBytes,
        timeoutMs,
        tracePrefix,
      };
    }
    const baseUrl = new URL(rawBaseUrl);
    if (
      (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:")
      || baseUrl.username
      || baseUrl.password
    ) {
      return {
        configCode: "BRIDGE_BASE_URL_INVALID",
        headers,
        maxDownloadBytes: configuredDownloadBytes,
        maxResponseBytes: configuredResponseBytes,
        timeoutMs,
        tracePrefix,
      };
    }
    baseUrl.search = "";
    baseUrl.hash = "";
    return {
      baseUrl,
      headers,
      maxDownloadBytes: configuredDownloadBytes,
      maxResponseBytes: configuredResponseBytes,
      timeoutMs,
      tracePrefix,
    };
  } catch {
    return {
      configCode: "BRIDGE_BASE_URL_INVALID",
      maxDownloadBytes: defaultMaxDownloadBytes,
      maxResponseBytes: defaultMaxResponseBytes,
      timeoutMs: defaultTimeoutMs,
      tracePrefix: "admin-durable-review",
    };
  }
};

const requestTraceId = (
  operation: AdminDurableReviewOperation,
  context: unknown,
  config: NormalizedConfig,
  generator?: (operation: AdminDurableReviewOperation) => string,
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
    // Use a local opaque identifier when a custom generator is not total.
  }
  fallbackTraceSequence = (fallbackTraceSequence + 1) % Number.MAX_SAFE_INTEGER;
  return `${config.tracePrefix}-${operation}-${Date.now().toString(36)}-${fallbackTraceSequence.toString(36)}`;
};

const bridgeFailure = (
  code: AdminDurableReviewBridgeCode,
  phase: AdminDurableReviewFailurePhase,
  traceId: string,
  extras: Partial<Pick<
    AdminDurableReviewFailure,
    "details" | "httpStatus" | "reconnectRequired" | "retryable"
  >> = {},
): AdminDurableReviewFailure => ({
  bridgeCode: code,
  code,
  ...(extras.details ? { details: extras.details } : {}),
  ...(extras.httpStatus === undefined ? {} : { httpStatus: extras.httpStatus }),
  ok: false,
  phase,
  reconnectRequired: extras.reconnectRequired ?? code === "BRIDGE_SESSION_INVALID",
  retryable: extras.retryable
    ?? (code === "BRIDGE_REQUEST_FAILED" || code === "BRIDGE_REQUEST_TIMEOUT"),
  traceId,
});

const invalidInputFailure = (
  operation: AdminDurableReviewOperation,
  context: unknown,
  config: NormalizedConfig,
  field: string,
  generator?: (operation: AdminDurableReviewOperation) => string,
): AdminDurableReviewFailure => bridgeFailure(
  "BRIDGE_INVALID_INPUT",
  "input",
  requestTraceId(operation, context, config, generator),
  { details: Object.freeze({ field }) },
);

interface NormalizedSignal {
  readonly aborted: boolean;
  readonly signal: AbortSignal;
}

const normalizeSignal = (value: unknown): NormalizedSignal | undefined => {
  try {
    if (
      !value
      || typeof value !== "object"
      || typeof (value as AbortSignal).addEventListener !== "function"
      || typeof (value as AbortSignal).removeEventListener !== "function"
      || typeof (value as AbortSignal).aborted !== "boolean"
    ) {
      return undefined;
    }
    return { aborted: (value as AbortSignal).aborted, signal: value as AbortSignal };
  } catch {
    return undefined;
  }
};

const createManagedAbort = (callerSignal: AbortSignal, timeoutMs: number) => {
  const controller = new AbortController();
  let callerAborted = false;
  let listenerAdded = false;
  let timedOut = false;
  let timer: ReturnType<typeof globalThis.setTimeout> | undefined;
  const abortFromCaller = () => {
    callerAborted = true;
    controller.abort();
  };
  try {
    callerSignal.addEventListener("abort", abortFromCaller, { once: true });
    listenerAdded = true;
    timer = globalThis.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
  } catch (error) {
    if (timer !== undefined) {
      try {
        globalThis.clearTimeout(timer);
      } catch {
        // Nothing else can release a host timer that rejects clearTimeout.
      }
    }
    if (listenerAdded) {
      try {
        callerSignal.removeEventListener("abort", abortFromCaller);
      } catch {
        // Preserve the original invalid signal failure.
      }
    }
    throw error;
  }
  return {
    callerAborted: () => callerAborted,
    cleanup: () => {
      if (timer !== undefined) {
        try {
          globalThis.clearTimeout(timer);
        } catch {
          // Cleanup is best effort for a hostile host implementation.
        }
      }
      try {
        callerSignal.removeEventListener("abort", abortFromCaller);
      } catch {
        // The caller still owns its signal; never throw while releasing it.
      }
    },
    signal: controller.signal,
    timedOut: () => timedOut,
  };
};

class ManagedAbortError extends Error {
  constructor() {
    super("Managed request aborted");
    this.name = "AbortError";
  }
}

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
      reject(new ManagedAbortError());
    };
    Promise.resolve(promise).then(
      (value) => {
        if (!settled) {
          settled = true;
          cleanup();
          resolve(value);
        }
      },
      (error: unknown) => {
        if (!settled) {
          settled = true;
          cleanup();
          reject(error);
        }
      },
    );
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
  });

const requestFailureForAbort = (
  managed: ReturnType<typeof createManagedAbort>,
  traceId: string,
): AdminDurableReviewFailure | undefined => managed.timedOut()
  ? bridgeFailure("BRIDGE_REQUEST_TIMEOUT", "request", traceId, { retryable: true })
  : managed.callerAborted()
    ? bridgeFailure("BRIDGE_REQUEST_ABORTED", "request", traceId)
    : undefined;

const endpointUrl = (
  baseUrl: URL,
  path: string,
  query?: Readonly<Record<string, string | undefined>>,
): string => {
  const endpoint = new URL(path, baseUrl);
  endpoint.search = "";
  endpoint.hash = "";
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) {
      endpoint.searchParams.set(key, value);
    }
  }
  return endpoint.toString();
};

const pathSegment = (value: string): string => encodeURIComponent(value)
  .replace(/[!'()*]/gu, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);

class ResponseReadFailure extends Error {
  readonly code: Extract<
    AdminDurableReviewBridgeCode,
    | "BRIDGE_RESPONSE_EMPTY"
    | "BRIDGE_RESPONSE_INVALID"
    | "BRIDGE_RESPONSE_NON_JSON"
    | "BRIDGE_RESPONSE_OVERSIZE"
  >;

  constructor(code: ResponseReadFailure["code"]) {
    super(code);
    this.code = code;
  }
}

const cancelWithAbort = async (
  cancel: () => PromiseLike<unknown> | unknown,
  signal: AbortSignal,
): Promise<void> => {
  try {
    await raceWithAbort(Promise.resolve(cancel()), signal);
  } catch {
    // Best-effort stream cleanup must not replace the original protocol failure.
  }
};

const cancelResponseBody = (response: Response, signal: AbortSignal): Promise<void> =>
  cancelWithAbort(() => response.body?.cancel(), signal);

const cancelBodyReader = (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signal: AbortSignal,
): Promise<void> => cancelWithAbort(() => reader.cancel(), signal);

const contentLengthHeader = (response: Response): number | null => {
  const raw = response.headers.get("content-length");
  if (raw === null) {
    return null;
  }
  if (!/^(?:0|[1-9][0-9]*)$/u.test(raw)) {
    throw new ResponseReadFailure("BRIDGE_RESPONSE_INVALID");
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value)) {
    throw new ResponseReadFailure("BRIDGE_RESPONSE_INVALID");
  }
  return value;
};

const readBoundedBytes = async (
  response: Response,
  maximumBytes: number,
  signal: AbortSignal,
): Promise<{ bytes: Uint8Array; declaredLength: number | null }> => {
  const declaredLength = contentLengthHeader(response);
  if (declaredLength !== null && declaredLength > maximumBytes) {
    await cancelResponseBody(response, signal);
    throw new ResponseReadFailure("BRIDGE_RESPONSE_OVERSIZE");
  }
  if (!response.body) {
    const buffer = await raceWithAbort(response.arrayBuffer(), signal);
    if (buffer.byteLength > maximumBytes) {
      throw new ResponseReadFailure("BRIDGE_RESPONSE_OVERSIZE");
    }
    const bytes = new Uint8Array(buffer);
    if (declaredLength !== null && declaredLength !== bytes.byteLength) {
      throw new ResponseReadFailure("BRIDGE_RESPONSE_INVALID");
    }
    return { bytes, declaredLength };
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  const cancelOnAbort = () => {
    void cancelBodyReader(reader, signal);
  };
  signal.addEventListener("abort", cancelOnAbort, { once: true });
  try {
    while (true) {
      const chunk = await raceWithAbort(reader.read(), signal);
      if (chunk.done) {
        break;
      }
      length += chunk.value.byteLength;
      if (length > maximumBytes) {
        await cancelBodyReader(reader, signal);
        throw new ResponseReadFailure("BRIDGE_RESPONSE_OVERSIZE");
      }
      chunks.push(chunk.value);
    }
  } finally {
    signal.removeEventListener("abort", cancelOnAbort);
    try {
      reader.releaseLock();
    } catch {
      // Ignore a release failure after cancellation.
    }
  }
  if (declaredLength !== null && declaredLength !== length) {
    throw new ResponseReadFailure("BRIDGE_RESPONSE_INVALID");
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { bytes, declaredLength };
};

const responseMediaType = (response: Response): string | undefined => {
  try {
    const raw = response.headers.get("content-type");
    return raw ? raw.split(";", 1)[0]?.trim().toLowerCase() : undefined;
  } catch {
    return undefined;
  }
};

const parseJsonResponse = async (
  response: Response,
  maximumBytes: number,
  signal: AbortSignal,
): Promise<Record<string, unknown>> => {
  if (responseMediaType(response) !== jsonContentType) {
    await cancelResponseBody(response, signal);
    throw new ResponseReadFailure("BRIDGE_RESPONSE_NON_JSON");
  }
  const { bytes } = await readBoundedBytes(response, maximumBytes, signal);
  if (bytes.byteLength === 0) {
    throw new ResponseReadFailure("BRIDGE_RESPONSE_EMPTY");
  }
  let decoded: string;
  try {
    decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new ResponseReadFailure("BRIDGE_RESPONSE_NON_JSON");
  }
  if (!decoded.trim()) {
    throw new ResponseReadFailure("BRIDGE_RESPONSE_EMPTY");
  }
  try {
    const parsed: unknown = JSON.parse(decoded);
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

const responseEnvelopeTraceId = (
  response: Response,
  body: Record<string, unknown>,
): string | undefined => {
  const bodyTraceId = safeTraceId(body.traceId);
  if (!bodyTraceId) {
    return undefined;
  }
  const rawHeader = response.headers.get("x-campaign-os-trace-id");
  if (rawHeader === null) {
    return bodyTraceId;
  }
  const headerTraceId = safeTraceId(rawHeader);
  return headerTraceId === bodyTraceId ? bodyTraceId : undefined;
};

const serverErrorKeys = ["code", "details", "message"] as const;
const serverErrorDetailKeys = [
  "diagnosticCode",
  "field",
  "operation",
  "reconnectRequired",
  "retryable",
  "routeId",
] as const;

const normalizeErrorDetails = (value: unknown): AdminDurableReviewSafeDetails | undefined => {
  if (!isRecord(value) || !hasOnlyKeys(value, serverErrorDetailKeys)) {
    return undefined;
  }
  const output: {
    diagnosticCode?: string;
    field?: string;
    operation?: string;
    reconnectRequired?: boolean;
    retryable?: boolean;
    routeId?: string;
  } = {};
  const safeDetailText = (candidate: unknown, maximum: number): string | undefined => {
    const normalized = text(candidate, maximum);
    return normalized
      && safeDetailTextPattern.test(normalized)
      && !unsafeJsonTextPattern.test(normalized)
      ? normalized
      : undefined;
  };
  const diagnosticCodeCandidate = safeDetailText(value.diagnosticCode, 96);
  const diagnosticCode = diagnosticCodeCandidate
    && safeCodePattern.test(diagnosticCodeCandidate)
    && !unsafeCodePattern.test(diagnosticCodeCandidate)
    ? diagnosticCodeCandidate
    : undefined;
  const field = safeDetailText(value.field, 128);
  const operation = safeDetailText(value.operation, 128);
  const routeId = safeDetailText(value.routeId, 128);
  if (diagnosticCode) output.diagnosticCode = diagnosticCode;
  if (field) output.field = field;
  if (operation) output.operation = operation;
  if (typeof value.reconnectRequired === "boolean") output.reconnectRequired = value.reconnectRequired;
  if (typeof value.retryable === "boolean") output.retryable = value.retryable;
  if (routeId) output.routeId = routeId;
  return Object.keys(output).length > 0 ? Object.freeze(output) : undefined;
};

const normalizeServerError = (
  response: Response,
  body: Record<string, unknown>,
  traceId: string,
): AdminDurableReviewFailure | undefined => {
  if (
    !exactRecord(body, ["error", "ok", "traceId"])
    || body.ok !== false
    || !exactRecord(body.error, ["code", "message"], serverErrorKeys)
    || body.error.details !== undefined
      && (!isRecord(body.error.details) || !hasOnlyKeys(body.error.details, serverErrorDetailKeys))
  ) {
    return undefined;
  }
  const codeCandidate = text(body.error.code, 96);
  const message = typeof body.error.message === "string" && body.error.message.length <= 500
    ? body.error.message
    : undefined;
  if (!message) {
    return undefined;
  }
  const code = codeCandidate
    && safeCodePattern.test(codeCandidate)
    && !unsafeCodePattern.test(codeCandidate)
    ? codeCandidate
    : `HTTP_${response.status}`;
  const details = normalizeErrorDetails(body.error.details);
  const reconnectRequired = response.status === 401 || details?.reconnectRequired === true;
  const retryable = details?.retryable ?? (response.status === 503 || response.status >= 500);
  return {
    code,
    ...(details ? { details } : {}),
    httpStatus: response.status,
    ok: false,
    phase: "response",
    reconnectRequired,
    retryable,
    traceId,
  };
};

const normalizeJsonResponse = async <T>(
  response: Response,
  input: RequestInput<T>,
  config: NormalizedConfig,
  requestId: string,
  signal: AbortSignal,
): Promise<AdminDurableReviewResult<T>> => {
  const body = await parseJsonResponse(response, config.maxResponseBytes, signal);
  const traceId = responseEnvelopeTraceId(response, body);
  if (!traceId) {
    return bridgeFailure("BRIDGE_RESPONSE_INVALID", "response", requestId, { httpStatus: response.status });
  }
  if (!response.ok || !input.successStatuses.has(response.status)) {
    const normalizedError = normalizeServerError(response, body, traceId);
    return normalizedError
      ?? bridgeFailure("BRIDGE_RESPONSE_INVALID", "response", traceId, { httpStatus: response.status });
  }
  if (!exactRecord(body, ["data", "ok", "traceId"]) || body.ok !== true) {
    return bridgeFailure("BRIDGE_RESPONSE_INVALID", "response", traceId, { httpStatus: response.status });
  }
  const normalized = input.normalize(body.data);
  if (!normalized.ok) {
    return bridgeFailure(
      normalized.reason === "identity"
        ? "BRIDGE_RESPONSE_IDENTITY_MISMATCH"
        : "BRIDGE_RESPONSE_INVALID",
      normalized.reason === "identity" ? "identity" : "response",
      traceId,
      { httpStatus: response.status },
    );
  }
  return {
    data: normalized.value,
    httpStatus: response.status,
    ok: true,
    traceId,
  };
};

const canonicalDownloadMime = (value: string | null): AdminArtifactMimeType | undefined => {
  if (!value) {
    return undefined;
  }
  const parts = value.split(";").map((part) => part.trim().toLowerCase());
  if (parts.length !== 2 || parts[1] !== "charset=utf-8") {
    return undefined;
  }
  return parts[0] === "text/csv"
    ? "text/csv;charset=utf-8"
    : parts[0] === "application/json"
      ? "application/json;charset=utf-8"
      : undefined;
};

const downloadFileName = (value: string | null): string | undefined => {
  if (!value) {
    return undefined;
  }
  const match = /^attachment\s*;\s*filename=(?:"([^"]+)"|([^;\s]+))$/iu.exec(value.trim());
  const fileName = match?.[1] ?? match?.[2];
  return fileName && safeFileNamePattern.test(fileName) ? fileName : undefined;
};

const bytesSha256 = async (bytes: Uint8Array, signal: AbortSignal): Promise<string | undefined> => {
  try {
    if (!globalThis.crypto?.subtle) {
      return undefined;
    }
    const digest = await raceWithAbort(
      globalThis.crypto.subtle.digest("SHA-256", Uint8Array.from(bytes)),
      signal,
    );
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch (error) {
    if (error instanceof ManagedAbortError) {
      throw error;
    }
    return undefined;
  }
};

const normalizeDownloadResponse = async (
  response: Response,
  expectedContentHash: string | undefined,
  config: NormalizedConfig,
  requestId: string,
  signal: AbortSignal,
): Promise<AdminDurableReviewResult<AdminArtifactDownloadData>> => {
  if (!response.ok || response.status !== 200) {
    const body = await parseJsonResponse(response, config.maxResponseBytes, signal);
    const traceId = responseEnvelopeTraceId(response, body);
    if (!traceId) {
      return bridgeFailure("BRIDGE_RESPONSE_INVALID", "response", requestId, { httpStatus: response.status });
    }
    return normalizeServerError(response, body, traceId)
      ?? bridgeFailure("BRIDGE_RESPONSE_INVALID", "response", traceId, { httpStatus: response.status });
  }
  const traceId = safeTraceId(response.headers.get("x-campaign-os-trace-id"));
  if (!traceId) {
    await cancelResponseBody(response, signal);
    return bridgeFailure("BRIDGE_RESPONSE_INVALID", "response", requestId, { httpStatus: response.status });
  }
  const mimeType = canonicalDownloadMime(response.headers.get("content-type"));
  if (!mimeType) {
    await cancelResponseBody(response, signal);
    return bridgeFailure("BRIDGE_DOWNLOAD_MIME_INVALID", "integrity", traceId, { httpStatus: response.status });
  }
  const fileName = downloadFileName(response.headers.get("content-disposition"));
  const expectedExtension = mimeType.startsWith("text/csv") ? ".csv" : ".json";
  if (!fileName || !fileName.toLowerCase().endsWith(expectedExtension)) {
    await cancelResponseBody(response, signal);
    return bridgeFailure("BRIDGE_DOWNLOAD_FILENAME_INVALID", "integrity", traceId, { httpStatus: response.status });
  }
  let declaredLength: number | null;
  try {
    declaredLength = contentLengthHeader(response);
  } catch {
    await cancelResponseBody(response, signal);
    return bridgeFailure("BRIDGE_DOWNLOAD_BYTES_MISMATCH", "integrity", traceId, { httpStatus: response.status });
  }
  if (declaredLength === null || declaredLength > config.maxDownloadBytes) {
    await cancelResponseBody(response, signal);
    return bridgeFailure(
      declaredLength !== null && declaredLength > config.maxDownloadBytes
        ? "BRIDGE_RESPONSE_OVERSIZE"
        : "BRIDGE_DOWNLOAD_BYTES_MISMATCH",
      "integrity",
      traceId,
      { httpStatus: response.status },
    );
  }
  const headerHash = sha256(response.headers.get("x-campaign-os-content-sha256"));
  if (!headerHash) {
    await cancelResponseBody(response, signal);
    return bridgeFailure("BRIDGE_DOWNLOAD_INTEGRITY_MISMATCH", "integrity", traceId, { httpStatus: response.status });
  }
  let bytes: Uint8Array;
  try {
    bytes = (await readBoundedBytes(response, config.maxDownloadBytes, signal)).bytes;
  } catch (error) {
    if (error instanceof ResponseReadFailure && error.code === "BRIDGE_RESPONSE_INVALID") {
      return bridgeFailure("BRIDGE_DOWNLOAD_BYTES_MISMATCH", "integrity", traceId, { httpStatus: response.status });
    }
    throw error;
  }
  if (bytes.byteLength !== declaredLength) {
    return bridgeFailure("BRIDGE_DOWNLOAD_BYTES_MISMATCH", "integrity", traceId, { httpStatus: response.status });
  }
  const actualHash = await bytesSha256(bytes, signal);
  if (!actualHash || actualHash !== headerHash || expectedContentHash && actualHash !== expectedContentHash) {
    return bridgeFailure("BRIDGE_DOWNLOAD_INTEGRITY_MISMATCH", "integrity", traceId, { httpStatus: response.status });
  }
  return {
    data: Object.freeze({
      bytes: bytes.slice(),
      contentBytes: bytes.byteLength,
      contentHash: actualHash,
      fileName,
      mimeType,
    }),
    httpStatus: response.status,
    ok: true,
    traceId,
  };
};

type ResponseNormalizer<T> = (
  response: Response,
  requestTraceId: string,
  signal: AbortSignal,
) => Promise<AdminDurableReviewResult<T>>;

const authenticatedRequestAdapter = async <T>(
  input: AuthenticatedRequestInput,
  config: NormalizedConfig,
  fetchImpl: AdminDurableReviewApiFetch,
  normalizeResponse: ResponseNormalizer<T>,
  generator?: (operation: AdminDurableReviewOperation) => string,
): Promise<AdminDurableReviewResult<T>> => {
  const traceId = requestTraceId(input.operation, input.context, config, generator);
  if (config.configCode || !config.baseUrl) {
    const code = config.configCode ?? "BRIDGE_BASE_URL_MISSING";
    return bridgeFailure(code, "config", traceId);
  }
  if (!isRecord(input.context)) {
    return bridgeFailure("BRIDGE_INVALID_INPUT", "input", traceId, {
      details: Object.freeze({ field: "context" }),
    });
  }
  let contextSession: NormalizedWalletSession | null;
  let contextSignal: unknown;
  try {
    contextSession = input.context.session;
    contextSignal = input.context.signal;
  } catch {
    return bridgeFailure("BRIDGE_INVALID_INPUT", "input", traceId, {
      details: Object.freeze({ field: "context" }),
    });
  }
  const normalizedSignal = normalizeSignal(contextSignal);
  if (!normalizedSignal) {
    return bridgeFailure("BRIDGE_INVALID_INPUT", "input", traceId, {
      details: Object.freeze({ field: "signal" }),
    });
  }
  const auth = createWalletSessionAuthHeaders(contextSession, "review_operator");
  if (!auth.ok) {
    return bridgeFailure("BRIDGE_SESSION_INVALID", "auth", traceId, {
      details: Object.freeze({ field: auth.field }),
      reconnectRequired: true,
    });
  }
  if (
    auth.headers["x-campaign-os-proof-status"] !== "verified"
    || auth.headers["x-campaign-os-credential-boundary"] !== "ordinary_user_wallet"
  ) {
    return bridgeFailure("BRIDGE_SESSION_INVALID", "auth", traceId, { reconnectRequired: true });
  }
  const merged = mergeWalletSessionAuthHeaders(
    auth.headers,
    config.headers,
    protectedOperationHeaders,
  );
  if (!merged.ok) {
    return bridgeFailure("BRIDGE_AUTH_HEADER_CONFLICT", "auth", traceId, {
      details: Object.freeze({ field: merged.field }),
    });
  }
  if (normalizedSignal.aborted) {
    return bridgeFailure("BRIDGE_REQUEST_ABORTED", "request", traceId);
  }
  let body: string | undefined;
  let url: string;
  let headers: Headers;
  try {
    body = input.body === undefined ? undefined : JSON.stringify(input.body);
    url = endpointUrl(config.baseUrl, input.path, input.query);
    headers = new Headers(merged.headers);
    headers.set("accept", input.accept ?? "application/json");
    headers.set("x-campaign-os-trace-id", traceId);
    if (body !== undefined) {
      headers.set("content-type", "application/json");
    }
    if (input.idempotencyKey) {
      headers.set("idempotency-key", input.idempotencyKey);
    }
  } catch {
    return bridgeFailure("BRIDGE_INVALID_INPUT", "request", traceId);
  }
  let managed: ReturnType<typeof createManagedAbort>;
  try {
    managed = createManagedAbort(normalizedSignal.signal, config.timeoutMs);
  } catch {
    return bridgeFailure("BRIDGE_INVALID_INPUT", "input", traceId, {
      details: Object.freeze({ field: "signal" }),
    });
  }
  let responseFailureTraceId = traceId;
  try {
    const response = await raceWithAbort(fetchImpl(url, {
      ...(body === undefined ? {} : { body }),
      headers,
      method: input.method,
      signal: managed.signal,
    }), managed.signal);
    const aborted = requestFailureForAbort(managed, traceId);
    if (aborted) {
      return aborted;
    }
    try {
      responseFailureTraceId = safeTraceId(response.headers.get("x-campaign-os-trace-id")) ?? traceId;
    } catch {
      responseFailureTraceId = traceId;
    }
    const result = await raceWithAbort(
      normalizeResponse(response, traceId, managed.signal),
      managed.signal,
    );
    return requestFailureForAbort(managed, traceId) ?? result;
  } catch (error) {
    const aborted = requestFailureForAbort(managed, traceId);
    if (aborted) {
      return aborted;
    }
    if (error instanceof ResponseReadFailure) {
      return bridgeFailure(error.code, "response", responseFailureTraceId);
    }
    return bridgeFailure("BRIDGE_REQUEST_FAILED", "request", traceId, { retryable: true });
  } finally {
    managed.cleanup();
  }
};

const requestAdapter = <T>(
  input: RequestInput<T>,
  config: NormalizedConfig,
  fetchImpl: AdminDurableReviewApiFetch,
  generator?: (operation: AdminDurableReviewOperation) => string,
): Promise<AdminDurableReviewResult<T>> => authenticatedRequestAdapter(
  input,
  config,
  fetchImpl,
  (response, requestId, signal) => normalizeJsonResponse(
    response,
    input,
    config,
    requestId,
    signal,
  ),
  generator,
);

const downloadAdapter = (
  campaignId: string,
  artifactId: string,
  expectedContentHash: string | undefined,
  context: AdminDurableReviewRequestContext,
  config: NormalizedConfig,
  fetchImpl: AdminDurableReviewApiFetch,
  generator?: (operation: AdminDurableReviewOperation) => string,
): Promise<AdminDurableReviewResult<AdminArtifactDownloadData>> =>
  authenticatedRequestAdapter({
    accept: "text/csv, application/json",
    context,
    method: "GET",
    operation: "downloadArtifact",
    path: `/api/admin/campaigns/${pathSegment(campaignId)}/artifacts/${pathSegment(artifactId)}/download`,
  }, config, fetchImpl, (response, requestId, signal) => normalizeDownloadResponse(
    response,
    expectedContentHash,
    config,
    requestId,
    signal,
  ), generator);

const normalizeListInput = (value: unknown): AdminListInput | undefined => {
  if (value === undefined) {
    return {};
  }
  if (!isRecord(value) || !hasOnlyKeys(value, ["limit"])) {
    return undefined;
  }
  const limit = value.limit === undefined ? undefined : positiveInteger(value.limit, 100);
  return value.limit === undefined || limit !== undefined ? { ...(limit ? { limit } : {}) } : undefined;
};

const normalizeReviewListInput = (value: unknown): AdminReviewListInput | undefined => {
  if (value === undefined) {
    return {};
  }
  if (!isRecord(value) || !hasOnlyKeys(value, ["limit", "state"])) {
    return undefined;
  }
  const limit = value.limit === undefined ? undefined : positiveInteger(value.limit, 100);
  const state = value.state === undefined ? undefined : enumValue(value.state, reviewStates);
  return (value.limit === undefined || limit !== undefined) && (value.state === undefined || state)
    ? { ...(limit ? { limit } : {}), ...(state ? { state } : {}) }
    : undefined;
};

const normalizeArtifactListInput = (value: unknown): AdminArtifactListInput | undefined => {
  if (value === undefined) {
    return {};
  }
  if (!isRecord(value) || !hasOnlyKeys(value, ["format", "limit"])) {
    return undefined;
  }
  const format = value.format === undefined ? undefined : enumValue(value.format, artifactFormats);
  const limit = value.limit === undefined ? undefined : positiveInteger(value.limit, 100);
  return (value.format === undefined || format) && (value.limit === undefined || limit !== undefined)
    ? { ...(format ? { format } : {}), ...(limit ? { limit } : {}) }
    : undefined;
};

const normalizeDecisionInput = (value: unknown): AdminSubmitDecisionInput | undefined => {
  if (!exactRecord(value, [
    "decision",
    "idempotencyKey",
    "reasonCode",
    "snapshotFingerprint",
  ], ["decision", "idempotencyKey", "note", "reasonCode", "snapshotFingerprint"])) {
    return undefined;
  }
  const decision = enumValue(value.decision, decisionValues);
  const idempotencyKey = typeof value.idempotencyKey === "string"
    && idempotencyKeyPattern.test(value.idempotencyKey)
    ? value.idempotencyKey
    : undefined;
  const note = value.note === undefined ? undefined : noteText(value.note);
  const reasonCode = typeof value.reasonCode === "string" && reasonCodePattern.test(value.reasonCode)
    ? value.reasonCode
    : undefined;
  const snapshotFingerprint = sha256(value.snapshotFingerprint);
  return decision
    && idempotencyKey
    && (value.note === undefined || note !== undefined)
    && reasonCode
    && snapshotFingerprint
    ? { decision, idempotencyKey, ...(note !== undefined ? { note } : {}), reasonCode, snapshotFingerprint }
    : undefined;
};

const normalizeGenerateInput = (value: unknown): AdminGenerateArtifactInput | undefined => {
  if (!exactRecord(value, ["format"], ["expectedSourceFingerprint", "format"])) {
    return undefined;
  }
  const expectedSourceFingerprint = value.expectedSourceFingerprint === undefined
    ? undefined
    : sha256(value.expectedSourceFingerprint);
  const format = enumValue(value.format, artifactFormats);
  return format && (value.expectedSourceFingerprint === undefined || expectedSourceFingerprint)
    ? { ...(expectedSourceFingerprint ? { expectedSourceFingerprint } : {}), format }
    : undefined;
};

const normalizeDownloadInput = (value: unknown): AdminDownloadArtifactInput | undefined => {
  if (value === undefined) {
    return {};
  }
  if (!isRecord(value) || !hasOnlyKeys(value, ["expectedContentHash"])) {
    return undefined;
  }
  const expectedContentHash = value.expectedContentHash === undefined
    ? undefined
    : sha256(value.expectedContentHash);
  return value.expectedContentHash === undefined || expectedContentHash
    ? { ...(expectedContentHash ? { expectedContentHash } : {}) }
    : undefined;
};

const normalizedIdentity = (value: unknown): string | undefined => identity(value);

export const createAdminDurableReviewApiBridge = (
  options: AdminDurableReviewApiBridgeFactoryOptions = {},
): AdminDurableReviewApiBridge => {
  let configInput: AdminDurableReviewApiConfig | undefined;
  let providedFetchImpl: AdminDurableReviewApiFetch | undefined;
  let traceIdGenerator: ((operation: AdminDurableReviewOperation) => string) | undefined;
  let factoryOptionsInvalid = false;
  try {
    if (!isRecord(options)) {
      factoryOptionsInvalid = true;
    } else {
      const rawConfig = options.config;
      const rawFetchImpl = options.fetchImpl;
      const rawTraceIdGenerator = options.traceIdGenerator;
      if (rawConfig !== undefined && !isRecord(rawConfig)) {
        factoryOptionsInvalid = true;
      } else {
        configInput = rawConfig;
      }
      if (rawFetchImpl !== undefined && typeof rawFetchImpl !== "function") {
        factoryOptionsInvalid = true;
      } else {
        providedFetchImpl = rawFetchImpl as AdminDurableReviewApiFetch | undefined;
      }
      if (rawTraceIdGenerator !== undefined && typeof rawTraceIdGenerator !== "function") {
        factoryOptionsInvalid = true;
      } else {
        traceIdGenerator = rawTraceIdGenerator as
          | ((operation: AdminDurableReviewOperation) => string)
          | undefined;
      }
    }
  } catch {
    factoryOptionsInvalid = true;
  }
  const config = normalizeConfig(factoryOptionsInvalid ? { baseUrl: "invalid:" } : configInput);
  const fetchImpl: AdminDurableReviewApiFetch = providedFetchImpl
    ?? ((input, init) => globalThis.fetch(input, init));

  return {
    downloadArtifact: async (campaignIdValue, artifactIdValue, context, inputValue) => {
      const campaignId = normalizedIdentity(campaignIdValue);
      const artifactId = normalizedIdentity(artifactIdValue);
      const input = normalizeDownloadInput(inputValue);
      if (!campaignId || !artifactId || !input) {
        return invalidInputFailure(
          "downloadArtifact",
          context,
          config,
          !campaignId ? "campaignId" : !artifactId ? "artifactId" : "input",
          traceIdGenerator,
        );
      }
      return downloadAdapter(
        campaignId,
        artifactId,
        input.expectedContentHash,
        context,
        config,
        fetchImpl,
        traceIdGenerator,
      );
    },

    generateArtifact: async (campaignIdValue, inputValue, context) => {
      const campaignId = normalizedIdentity(campaignIdValue);
      const input = normalizeGenerateInput(inputValue);
      if (!campaignId || !input) {
        return invalidInputFailure(
          "generateArtifact",
          context,
          config,
          campaignId ? "input" : "campaignId",
          traceIdGenerator,
        );
      }
      return requestAdapter({
        body: input,
        context,
        method: "POST",
        normalize: (data) => normalizeArtifactReceipt(
          data,
          campaignId,
          input.format,
          input.expectedSourceFingerprint,
        ),
        operation: "generateArtifact",
        path: `/api/admin/campaigns/${pathSegment(campaignId)}/artifacts`,
        successStatuses: new Set([200, 201]),
      }, config, fetchImpl, traceIdGenerator);
    },

    getArtifactDetail: async (campaignIdValue, artifactIdValue, context) => {
      const campaignId = normalizedIdentity(campaignIdValue);
      const artifactId = normalizedIdentity(artifactIdValue);
      if (!campaignId || !artifactId) {
        return invalidInputFailure(
          "getArtifactDetail",
          context,
          config,
          campaignId ? "artifactId" : "campaignId",
          traceIdGenerator,
        );
      }
      return requestAdapter({
        context,
        method: "GET",
        normalize: (data) => normalizeArtifactDetail(data, campaignId, artifactId),
        operation: "getArtifactDetail",
        path: `/api/admin/campaigns/${pathSegment(campaignId)}/artifacts/${pathSegment(artifactId)}`,
        successStatuses: new Set([200]),
      }, config, fetchImpl, traceIdGenerator);
    },

    getReviewDetail: async (campaignIdValue, participantIdValue, context) => {
      const campaignId = normalizedIdentity(campaignIdValue);
      const participantId = normalizedIdentity(participantIdValue);
      if (!campaignId || !participantId) {
        return invalidInputFailure(
          "getReviewDetail",
          context,
          config,
          campaignId ? "participantId" : "campaignId",
          traceIdGenerator,
        );
      }
      return requestAdapter({
        context,
        method: "GET",
        normalize: (data) => normalizeReviewDetail(data, campaignId, participantId),
        operation: "getReviewDetail",
        path: `/api/admin/campaigns/${pathSegment(campaignId)}/reviews/${pathSegment(participantId)}`,
        successStatuses: new Set([200]),
      }, config, fetchImpl, traceIdGenerator);
    },

    listArtifacts: async (campaignIdValue, context, inputValue) => {
      const campaignId = normalizedIdentity(campaignIdValue);
      const input = normalizeArtifactListInput(inputValue);
      if (!campaignId || !input) {
        return invalidInputFailure(
          "listArtifacts",
          context,
          config,
          campaignId ? "input" : "campaignId",
          traceIdGenerator,
        );
      }
      return requestAdapter({
        context,
        method: "GET",
        normalize: (data) => normalizeArtifactList(
          data,
          campaignId,
          input.format,
          input.limit,
        ),
        operation: "listArtifacts",
        path: `/api/admin/campaigns/${pathSegment(campaignId)}/artifacts`,
        query: {
          ...(input.limit === undefined ? {} : { limit: String(input.limit) }),
          ...(input.format === undefined ? {} : { format: input.format }),
        },
        successStatuses: new Set([200]),
      }, config, fetchImpl, traceIdGenerator);
    },

    listCampaigns: async (context, inputValue) => {
      const input = normalizeListInput(inputValue);
      if (!input) {
        return invalidInputFailure("listCampaigns", context, config, "input", traceIdGenerator);
      }
      return requestAdapter({
        context,
        method: "GET",
        normalize: (data) => normalizeCampaignList(data, input.limit),
        operation: "listCampaigns",
        path: "/api/admin/campaigns",
        query: input.limit === undefined ? undefined : { limit: String(input.limit) },
        successStatuses: new Set([200]),
      }, config, fetchImpl, traceIdGenerator);
    },

    listReviews: async (campaignIdValue, context, inputValue) => {
      const campaignId = normalizedIdentity(campaignIdValue);
      const input = normalizeReviewListInput(inputValue);
      if (!campaignId || !input) {
        return invalidInputFailure(
          "listReviews",
          context,
          config,
          campaignId ? "input" : "campaignId",
          traceIdGenerator,
        );
      }
      return requestAdapter({
        context,
        method: "GET",
        normalize: (data) => normalizeReviewQueue(
          data,
          campaignId,
          input.state,
          input.limit,
        ),
        operation: "listReviews",
        path: `/api/admin/campaigns/${pathSegment(campaignId)}/reviews`,
        query: {
          ...(input.limit === undefined ? {} : { limit: String(input.limit) }),
          ...(input.state === undefined ? {} : { state: input.state }),
        },
        successStatuses: new Set([200]),
      }, config, fetchImpl, traceIdGenerator);
    },

    listWinners: async (campaignIdValue, context, inputValue) => {
      const campaignId = normalizedIdentity(campaignIdValue);
      const input = normalizeListInput(inputValue);
      if (!campaignId || !input) {
        return invalidInputFailure(
          "listWinners",
          context,
          config,
          campaignId ? "input" : "campaignId",
          traceIdGenerator,
        );
      }
      return requestAdapter({
        context,
        method: "GET",
        normalize: (data) => normalizeWinners(data, campaignId, input.limit),
        operation: "listWinners",
        path: `/api/admin/campaigns/${pathSegment(campaignId)}/winners`,
        query: input.limit === undefined ? undefined : { limit: String(input.limit) },
        successStatuses: new Set([200]),
      }, config, fetchImpl, traceIdGenerator);
    },

    submitDecision: async (campaignIdValue, participantIdValue, inputValue, context) => {
      const campaignId = normalizedIdentity(campaignIdValue);
      const participantId = normalizedIdentity(participantIdValue);
      const input = normalizeDecisionInput(inputValue);
      if (!campaignId || !participantId || !input) {
        return invalidInputFailure(
          "submitDecision",
          context,
          config,
          !campaignId ? "campaignId" : !participantId ? "participantId" : "input",
          traceIdGenerator,
        );
      }
      const { idempotencyKey, ...body } = input;
      return requestAdapter({
        body,
        context,
        idempotencyKey,
        method: "POST",
        normalize: (data) => normalizeDecisionReceipt(
          data,
          campaignId,
          participantId,
          input.snapshotFingerprint,
        ),
        operation: "submitDecision",
        path: `/api/admin/campaigns/${pathSegment(campaignId)}/reviews/${pathSegment(participantId)}/decisions`,
        successStatuses: new Set([200, 201]),
      }, config, fetchImpl, traceIdGenerator);
    },
  };
};
