import { createHash } from "node:crypto";
import {
  ADMIN_ARTIFACT_SOURCE_VERSION,
  ADMIN_REVIEW_MAX_ARTIFACT_ROWS,
  ADMIN_REVIEW_MAX_SOURCE_MANIFEST_BYTES,
  ADMIN_REVIEW_SNAPSHOT_VERSION,
  AdminReviewStoreError,
  deriveAdminReviewDecisionPayloadHash,
  type AdminOperatorRole,
  type AdminExportArtifactProjectionSource,
  type AdminReviewDecisionRecord,
  type AdminReviewDecisionValue,
  type AdminReviewCampaignRow,
  type AdminReviewCompletionRow,
  type AdminReviewEvidenceRow,
  type AdminReviewJsonObject,
  type AdminReviewJsonValue,
  type AdminReviewParticipantRow,
  type AdminReviewRankingRow,
  type AdminReviewSnapshotRows,
  type AdminReviewStore,
  type AdminReviewTaskRow,
} from "./adminReviewStore";
import { isParticipantAccountTypeCompatible } from "./participantJourney";

const MAX_CANONICAL_BYTES = 10 * 1024 * 1024;
const MAX_COLLECTION_ITEMS = 5_000;
const MAX_JSON_DEPTH = 32;
const MAX_OBJECT_KEYS = 128;
const MAX_REVIEW_LIST_LIMIT = 100;
const MAX_STRING_LENGTH = 4_096;
const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9:._-]*$/;
const SENSITIVE_PERSISTED_VALUE_PATTERN = /(?:\bBearer\s+\S+|\b(?:access[_-]?token|token|signature|proof|private[ _-]?key)\s*[:=]|(?:postgres(?:ql)?|file):\/\/|\/Users\/)/i;

const compareCanonicalText = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

export type AdminReviewDomainErrorCode =
  | "ADMIN_REVIEW_DOMAIN_CONFLICT"
  | "ADMIN_REVIEW_DOMAIN_BOUND_EXCEEDED"
  | "ADMIN_REVIEW_DOMAIN_INVALID_FACTS"
  | "ADMIN_REVIEW_DOMAIN_NOT_FOUND"
  | "ADMIN_REVIEW_DOMAIN_STALE"
  | "ADMIN_REVIEW_DOMAIN_UNAVAILABLE";

const SAFE_ERROR_MESSAGES: Record<AdminReviewDomainErrorCode, string> = {
  ADMIN_REVIEW_DOMAIN_CONFLICT: "Admin review command conflicts with an existing command.",
  ADMIN_REVIEW_DOMAIN_BOUND_EXCEEDED: "Admin review domain bound was exceeded.",
  ADMIN_REVIEW_DOMAIN_INVALID_FACTS: "Admin review domain facts are invalid.",
  ADMIN_REVIEW_DOMAIN_NOT_FOUND: "Admin review domain record was not found.",
  ADMIN_REVIEW_DOMAIN_STALE: "Admin review snapshot precondition is stale.",
  ADMIN_REVIEW_DOMAIN_UNAVAILABLE: "Admin review service is unavailable.",
};

const safeContextValue = (value: string, fallback: string): string =>
  SAFE_IDENTIFIER_PATTERN.test(value) && value.length <= 128 ? value : fallback;

export class AdminReviewDomainError extends Error {
  readonly code: AdminReviewDomainErrorCode;
  readonly field: string;
  readonly traceId: string;

  constructor(options: {
    code: AdminReviewDomainErrorCode;
    field: string;
    traceId: string;
  }) {
    super(SAFE_ERROR_MESSAGES[options.code]);
    this.name = "AdminReviewDomainError";
    this.code = options.code;
    this.field = safeContextValue(options.field, "input");
    this.traceId = safeContextValue(options.traceId, "trace-unavailable");

    // Domain errors are serialized across a server boundary and must never expose call sites.
    delete this.stack;
  }
}

interface DomainContext {
  field: string;
  traceId: string;
}

const fail = (
  code: AdminReviewDomainErrorCode,
  context: DomainContext,
): never => {
  throw new AdminReviewDomainError({
    code,
    field: context.field,
    traceId: context.traceId,
  });
};

const assertBoundedArray = <T>(
  value: readonly T[],
  field: string,
  traceId: string,
): readonly T[] => {
  if (!Array.isArray(value)) {
    return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field, traceId });
  }
  if (value.length > MAX_COLLECTION_ITEMS) {
    return fail("ADMIN_REVIEW_DOMAIN_BOUND_EXCEEDED", { field, traceId });
  }
  return value;
};

const assertBoundedString = (
  value: string,
  field: string,
  traceId: string,
  options: { allowEmpty?: boolean; maxLength?: number } = {},
): string => {
  const maxLength = options.maxLength ?? MAX_STRING_LENGTH;
  if (
    typeof value !== "string"
    || (!options.allowEmpty && value.length === 0)
  ) {
    return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field, traceId });
  }
  if (value.length > maxLength) {
    return fail("ADMIN_REVIEW_DOMAIN_BOUND_EXCEEDED", { field, traceId });
  }
  return value;
};

const assertSafePersistedString = (
  value: string,
  field: string,
  traceId: string,
  options: { allowEmpty?: boolean; maxLength?: number } = {},
): string => {
  const validated = assertBoundedString(value, field, traceId, options);
  if (
    /[\u0000-\u001f\u007f]/.test(validated)
    || SENSITIVE_PERSISTED_VALUE_PATTERN.test(validated)
  ) {
    return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field, traceId });
  }
  return validated;
};

const assertSafeIdentifier = (
  value: string,
  field: string,
  traceId: string,
  maxLength: number,
): string => {
  const validated = assertSafePersistedString(value, field, traceId, { maxLength });
  if (!SAFE_IDENTIFIER_PATTERN.test(validated)) {
    return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field, traceId });
  }
  return validated;
};

const assertFiniteNumber = (
  value: number,
  field: string,
  traceId: string,
  options: { integer?: boolean; min?: number } = {},
): number => {
  if (
    typeof value !== "number"
    || !Number.isFinite(value)
    || (options.integer && !Number.isInteger(value))
    || (options.min !== undefined && value < options.min)
  ) {
    return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field, traceId });
  }
  return value;
};

const assertBoolean = (value: boolean, field: string, traceId: string): boolean => {
  if (typeof value !== "boolean") {
    return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field, traceId });
  }
  return value;
};

const assertEnum = <T extends string>(
  value: T,
  allowed: readonly T[],
  field: string,
  traceId: string,
): T => {
  if (typeof value !== "string" || !allowed.includes(value)) {
    return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field, traceId });
  }
  return value;
};

const assertPlainDataRecord = (
  value: object,
  allowedKeys: readonly string[],
  field: string,
  traceId: string,
): void => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field, traceId });
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field, traceId });
  }

  const ownKeys = Reflect.ownKeys(value);
  if (
    ownKeys.length > MAX_OBJECT_KEYS
    || ownKeys.some((key) => typeof key !== "string" || !allowedKeys.includes(key))
  ) {
    return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field, traceId });
  }
  for (const key of ownKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor)) {
      return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field, traceId });
    }
  }
};

export const canonicalizeAdminReviewJson = (
  value: AdminReviewJsonValue,
  context: DomainContext,
): string => {
  const activeObjects = new WeakSet<object>();

  const encode = (candidate: unknown, depth: number): string => {
    if (depth > MAX_JSON_DEPTH) {
      return fail("ADMIN_REVIEW_DOMAIN_BOUND_EXCEEDED", context);
    }
    if (candidate === null || typeof candidate === "boolean") {
      return JSON.stringify(candidate);
    }
    if (typeof candidate === "string") {
      assertBoundedString(candidate, context.field, context.traceId, { allowEmpty: true });
      return JSON.stringify(candidate);
    }
    if (typeof candidate === "number") {
      assertFiniteNumber(candidate, context.field, context.traceId);
      return JSON.stringify(candidate);
    }
    if (typeof candidate !== "object") {
      return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", context);
    }
    if (activeObjects.has(candidate)) {
      return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", context);
    }

    activeObjects.add(candidate);
    try {
      if (Array.isArray(candidate)) {
        assertBoundedArray(candidate, context.field, context.traceId);
        return `[${candidate.map((item) => encode(item, depth + 1)).join(",")}]`;
      }

      const prototype = Object.getPrototypeOf(candidate);
      if (prototype !== Object.prototype && prototype !== null) {
        return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", context);
      }
      const keys = Reflect.ownKeys(candidate);
      if (
        keys.length > MAX_OBJECT_KEYS
        || keys.some((key) => typeof key !== "string")
      ) {
        return fail("ADMIN_REVIEW_DOMAIN_BOUND_EXCEEDED", context);
      }

      const stringKeys = (keys as string[]).sort(compareCanonicalText);
      const entries: string[] = [];
      for (const key of stringKeys) {
        const descriptor = Object.getOwnPropertyDescriptor(candidate, key);
        if (!descriptor || !("value" in descriptor) || descriptor.value === undefined) {
          return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", context);
        }
        assertBoundedString(key, context.field, context.traceId, { allowEmpty: true });
        entries.push(`${JSON.stringify(key)}:${encode(descriptor.value, depth + 1)}`);
      }
      return `{${entries.join(",")}}`;
    } finally {
      activeObjects.delete(candidate);
    }
  };

  const canonicalJson = encode(value, 0);
  if (Buffer.byteLength(canonicalJson, "utf8") > MAX_CANONICAL_BYTES) {
    return fail("ADMIN_REVIEW_DOMAIN_BOUND_EXCEEDED", context);
  }
  return canonicalJson;
};

type CanonicalCampaign = Readonly<AdminReviewCampaignRow>;
type CanonicalTask = Readonly<AdminReviewTaskRow>;
type CanonicalCompletion = Readonly<{
  accountType: AdminReviewCompletionRow["accountType"];
  campaignId: string;
  completedAt: string | null;
  id: string;
  pointsAwarded: number;
  status: AdminReviewCompletionRow["status"];
  taskId: string;
  updatedAt: string;
  walletAddress: string;
  walletSource: AdminReviewCompletionRow["walletSource"];
}>;
type CanonicalEvidence = Readonly<{
  campaignId: string;
  capturedAt: string;
  completionId: string | null;
  diagnosticCodes: readonly string[];
  evidenceHash: string;
  evidenceRef: string | null;
  evidenceSource: AdminReviewEvidenceRow["evidenceSource"];
  id: string;
  pointsAwarded: number;
  status: AdminReviewEvidenceRow["status"];
  taskId: string;
  updatedAt: string;
  walletAddress: string;
}>;
type CanonicalParticipant = Readonly<{
  accountType: AdminReviewParticipantRow["accountType"];
  campaignId: string;
  createdAt: string;
  diagnosticCodes: readonly string[];
  eligible: boolean;
  id: string;
  missingTaskIds: readonly string[];
  rank: number | null;
  riskFlags: readonly string[];
  totalPoints: number;
  updatedAt: string;
  walletAddress: string;
  walletSource: AdminReviewParticipantRow["walletSource"];
  walletTypeVerified: boolean;
}>;

export type AdminReviewSnapshotManifest = Readonly<{
  campaign: CanonicalCampaign;
  completions: readonly CanonicalCompletion[];
  evidence: readonly CanonicalEvidence[];
  participant: CanonicalParticipant;
  tasks: readonly CanonicalTask[];
  version: typeof ADMIN_REVIEW_SNAPSHOT_VERSION;
}>;

export interface AdminReviewTaskCoverage {
  completed: number;
  evidence: number;
  required: number;
  total: number;
}

export interface AdminReviewSnapshot {
  canonicalJson: string;
  fingerprint: string;
  fingerprintVersion: typeof ADMIN_REVIEW_SNAPSHOT_VERSION;
  generatedAt: string;
  manifest: AdminReviewSnapshotManifest;
  taskCoverage: AdminReviewTaskCoverage;
  walletAddress: string;
}

export interface ProjectAdminReviewSnapshotOptions {
  generatedAt: string;
  participantId: string;
  traceId: string;
}

export interface ProjectAdminReviewSnapshotsOptions {
  generatedAt: string;
  traceId: string;
}

interface SnapshotIndex {
  campaign: CanonicalCampaign;
  completionsByWallet: Map<string, CanonicalCompletion[]>;
  evidenceByWallet: Map<string, CanonicalEvidence[]>;
  participantsById: Map<string, AdminReviewParticipantRow>;
  rankingByParticipantId: Map<string, AdminReviewRankingRow>;
  tasks: CanonicalTask[];
}

const SNAPSHOT_ROW_KEYS = [
  "campaign", "completions", "evidence", "participants", "ranking", "tasks",
] as const;

const CAMPAIGN_KEYS = [
  "contractMode", "endTime", "id", "startTime", "status", "updatedAt", "walletPolicy",
] as const;
const TASK_KEYS = [
  "campaignId", "id", "points", "required", "updatedAt", "verificationType", "walletCompatibility",
] as const;
const PARTICIPANT_KEYS = [
  "accountType", "campaignId", "createdAt", "id", "rank", "riskFlags", "totalPoints",
  "updatedAt", "walletAddress", "walletSource", "walletTypeVerified",
] as const;
const COMPLETION_KEYS = [
  "accountType", "campaignId", "completedAt", "id", "pointsAwarded", "status", "taskId",
  "updatedAt", "walletAddress", "walletSource",
] as const;
const EVIDENCE_KEYS = [
  "campaignId", "capturedAt", "completionId", "diagnosticCodes", "evidenceHash", "evidenceRef",
  "evidenceSource", "id", "pointsAwarded", "status", "taskId", "updatedAt", "walletAddress",
] as const;
const RANKING_KEYS = [
  "campaignId", "createdAt", "participantId", "rank", "totalPoints", "walletAddress",
] as const;

const lexicalUnique = (
  values: readonly string[],
  field: string,
  traceId: string,
  maxLength = MAX_STRING_LENGTH,
): string[] => {
  assertBoundedArray(values, field, traceId);
  const unique = new Set<string>();
  for (const value of values) {
    unique.add(assertSafePersistedString(value, field, traceId, { maxLength }));
  }
  return [...unique].sort(compareCanonicalText);
};

const validateCampaign = (row: AdminReviewCampaignRow, traceId: string): CanonicalCampaign => {
  assertPlainDataRecord(row, CAMPAIGN_KEYS, "campaign", traceId);
  return {
    contractMode: assertEnum(row.contractMode, ["CONTRACT_CLAIM", "OFF_CHAIN_MVP", "V2_COMPANION"], "contractMode", traceId),
    endTime: assertBoundedString(row.endTime, "endTime", traceId),
    id: assertBoundedString(row.id, "campaignId", traceId),
    startTime: assertBoundedString(row.startTime, "startTime", traceId),
    status: assertBoundedString(row.status, "status", traceId),
    updatedAt: assertBoundedString(row.updatedAt, "updatedAt", traceId),
    walletPolicy: assertEnum(row.walletPolicy, ["AA_ONLY", "ANY", "EOA_ONLY"], "walletPolicy", traceId),
  };
};

const validateTask = (
  row: AdminReviewTaskRow,
  campaignId: string,
  traceId: string,
): CanonicalTask => {
  assertPlainDataRecord(row, TASK_KEYS, "tasks", traceId);
  if (row.campaignId !== campaignId) {
    return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "campaignId", traceId });
  }
  return {
    campaignId: assertBoundedString(row.campaignId, "campaignId", traceId),
    id: assertBoundedString(row.id, "taskId", traceId),
    points: assertFiniteNumber(row.points, "points", traceId, { integer: true, min: 0 }),
    required: assertBoolean(row.required, "required", traceId),
    updatedAt: assertBoundedString(row.updatedAt, "updatedAt", traceId),
    verificationType: assertEnum(row.verificationType, ["DAPP_API", "MANUAL", "ON_CHAIN", "SOCIAL", "WALLET"], "verificationType", traceId),
    walletCompatibility: assertEnum(row.walletCompatibility, ["AA_ONLY", "ANY", "EOA_ONLY"], "walletCompatibility", traceId),
  };
};

const validateParticipant = (
  row: AdminReviewParticipantRow,
  campaignId: string,
  traceId: string,
): void => {
  assertPlainDataRecord(row, PARTICIPANT_KEYS, "participants", traceId);
  if (row.campaignId !== campaignId) {
    return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "campaignId", traceId });
  }
  assertEnum(row.accountType, ["AA", "EOA", "UNKNOWN"], "accountType", traceId);
  assertBoundedString(row.createdAt, "createdAt", traceId);
  assertBoundedString(row.id, "participantId", traceId);
  if (row.rank !== undefined) {
    assertFiniteNumber(row.rank, "rank", traceId, { integer: true, min: 1 });
  }
  lexicalUnique(row.riskFlags, "riskFlags", traceId, 128);
  assertFiniteNumber(row.totalPoints, "totalPoints", traceId, { integer: true, min: 0 });
  assertBoundedString(row.updatedAt, "updatedAt", traceId);
  assertBoundedString(row.walletAddress, "walletAddress", traceId);
  assertEnum(row.walletSource, [
    "AGENT_SKILL", "NIGHTELF", "OTHER", "PORTKEY_AA", "PORTKEY_EOA_APP", "PORTKEY_EOA_EXTENSION",
  ], "walletSource", traceId);
  assertBoolean(row.walletTypeVerified, "walletTypeVerified", traceId);
};

const validateCompletion = (
  row: AdminReviewCompletionRow,
  campaignId: string,
  traceId: string,
): CanonicalCompletion => {
  assertPlainDataRecord(row, COMPLETION_KEYS, "completions", traceId);
  if (row.campaignId !== campaignId) {
    return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "campaignId", traceId });
  }
  return {
    accountType: assertEnum(row.accountType, ["AA", "EOA", "UNKNOWN"], "accountType", traceId),
    campaignId: assertBoundedString(row.campaignId, "campaignId", traceId),
    completedAt: row.completedAt === undefined
      ? null
      : assertBoundedString(row.completedAt, "completedAt", traceId),
    id: assertBoundedString(row.id, "completionId", traceId),
    pointsAwarded: assertFiniteNumber(row.pointsAwarded, "pointsAwarded", traceId, { integer: true, min: 0 }),
    status: assertEnum(row.status, ["completed", "failed", "manual_review", "pending"], "status", traceId),
    taskId: assertBoundedString(row.taskId, "taskId", traceId),
    updatedAt: assertBoundedString(row.updatedAt, "updatedAt", traceId),
    walletAddress: assertBoundedString(row.walletAddress, "walletAddress", traceId),
    walletSource: assertEnum(row.walletSource, [
      "AGENT_SKILL", "NIGHTELF", "OTHER", "PORTKEY_AA", "PORTKEY_EOA_APP", "PORTKEY_EOA_EXTENSION",
    ], "walletSource", traceId),
  };
};

const validateEvidence = (
  row: AdminReviewEvidenceRow,
  campaignId: string,
  traceId: string,
): CanonicalEvidence => {
  assertPlainDataRecord(row, EVIDENCE_KEYS, "evidence", traceId);
  if (row.campaignId !== campaignId) {
    return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "campaignId", traceId });
  }
  return {
    campaignId: assertBoundedString(row.campaignId, "campaignId", traceId),
    capturedAt: assertBoundedString(row.capturedAt, "capturedAt", traceId),
    completionId: row.completionId === undefined
      ? null
      : assertBoundedString(row.completionId, "completionId", traceId),
    diagnosticCodes: lexicalUnique(row.diagnosticCodes, "diagnosticCodes", traceId, 128),
    evidenceHash: assertSafePersistedString(row.evidenceHash, "evidenceHash", traceId),
    evidenceRef: row.evidenceRef === undefined
      ? null
      : assertSafePersistedString(row.evidenceRef, "evidenceRef", traceId),
    evidenceSource: assertEnum(row.evidenceSource, ["AEFINDER", "AELFSCAN", "DAPP_API", "MANUAL", "SOCIAL_API"], "evidenceSource", traceId),
    id: assertBoundedString(row.id, "evidenceId", traceId),
    pointsAwarded: assertFiniteNumber(row.pointsAwarded, "pointsAwarded", traceId, { integer: true, min: 0 }),
    status: assertEnum(row.status, ["completed", "failed", "manual_review", "pending"], "status", traceId),
    taskId: assertBoundedString(row.taskId, "taskId", traceId),
    updatedAt: assertBoundedString(row.updatedAt, "updatedAt", traceId),
    walletAddress: assertBoundedString(row.walletAddress, "walletAddress", traceId),
  };
};

const validateRanking = (
  row: AdminReviewRankingRow,
  campaignId: string,
  traceId: string,
): void => {
  assertPlainDataRecord(row, RANKING_KEYS, "ranking", traceId);
  if (row.campaignId !== campaignId) {
    return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "campaignId", traceId });
  }
  assertBoundedString(row.createdAt, "createdAt", traceId);
  assertBoundedString(row.participantId, "participantId", traceId);
  if (row.rank !== undefined) {
    assertFiniteNumber(row.rank, "rank", traceId, { integer: true, min: 1 });
  }
  assertFiniteNumber(row.totalPoints, "totalPoints", traceId, { integer: true, min: 0 });
  assertBoundedString(row.walletAddress, "walletAddress", traceId);
};

const buildSnapshotIndex = (
  rows: AdminReviewSnapshotRows,
  traceId: string,
): SnapshotIndex => {
  if (!rows || typeof rows !== "object") {
    return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "rows", traceId });
  }
  assertPlainDataRecord(rows, SNAPSHOT_ROW_KEYS, "rows", traceId);
  if (!rows.campaign) {
    return fail("ADMIN_REVIEW_DOMAIN_NOT_FOUND", { field: "campaignId", traceId });
  }
  const campaign = validateCampaign(rows.campaign, traceId);
  const taskRows = assertBoundedArray(rows.tasks, "tasks", traceId);
  const participantRows = assertBoundedArray(rows.participants, "participants", traceId);
  const completionRows = assertBoundedArray(rows.completions, "completions", traceId);
  const evidenceRows = assertBoundedArray(rows.evidence, "evidence", traceId);
  const rankingRows = assertBoundedArray(rows.ranking, "ranking", traceId);

  const tasksById = new Map<string, CanonicalTask>();
  for (const row of taskRows) {
    const task = validateTask(row, campaign.id, traceId);
    if (tasksById.has(task.id)) {
      return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "taskId", traceId });
    }
    tasksById.set(task.id, task);
  }

  const participantsById = new Map<string, AdminReviewParticipantRow>();
  const participantsByWallet = new Map<string, AdminReviewParticipantRow>();
  for (const participant of participantRows) {
    validateParticipant(participant, campaign.id, traceId);
    if (
      participantsById.has(participant.id)
      || participantsByWallet.has(participant.walletAddress)
    ) {
      return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "participantId", traceId });
    }
    participantsById.set(participant.id, participant);
    participantsByWallet.set(participant.walletAddress, participant);
  }

  const rankingByParticipantId = new Map<string, AdminReviewRankingRow>();
  for (const ranking of rankingRows) {
    validateRanking(ranking, campaign.id, traceId);
    if (rankingByParticipantId.has(ranking.participantId)) {
      return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "participantId", traceId });
    }
    const participant = participantsById.get(ranking.participantId);
    if (
      !participant
      || participant.walletAddress !== ranking.walletAddress
      || participant.totalPoints !== ranking.totalPoints
      || participant.rank !== ranking.rank
    ) {
      return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "participantId", traceId });
    }
    rankingByParticipantId.set(ranking.participantId, ranking);
  }

  const completionsById = new Map<string, CanonicalCompletion>();
  const completionsByWallet = new Map<string, CanonicalCompletion[]>();
  for (const row of completionRows) {
    const completion = validateCompletion(row, campaign.id, traceId);
    if (completionsById.has(completion.id)) {
      return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "completionId", traceId });
    }
    if (!tasksById.has(completion.taskId)) {
      return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "taskId", traceId });
    }
    const participant = participantsByWallet.get(completion.walletAddress);
    if (
      !participant
      || participant.accountType !== completion.accountType
      || participant.walletSource !== completion.walletSource
    ) {
      return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "walletAddress", traceId });
    }
    completionsById.set(completion.id, completion);
    const group = completionsByWallet.get(completion.walletAddress) ?? [];
    group.push(completion);
    completionsByWallet.set(completion.walletAddress, group);
  }

  const evidenceIds = new Set<string>();
  const evidenceByWallet = new Map<string, CanonicalEvidence[]>();
  for (const row of evidenceRows) {
    const evidence = validateEvidence(row, campaign.id, traceId);
    if (evidenceIds.has(evidence.id)) {
      return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "evidenceId", traceId });
    }
    if (!tasksById.has(evidence.taskId)) {
      return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "taskId", traceId });
    }
    if (!participantsByWallet.has(evidence.walletAddress)) {
      return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "walletAddress", traceId });
    }
    if (evidence.completionId !== null) {
      const completion = completionsById.get(evidence.completionId);
      if (
        !completion
        || completion.taskId !== evidence.taskId
        || completion.walletAddress !== evidence.walletAddress
      ) {
        return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "completionId", traceId });
      }
    }
    evidenceIds.add(evidence.id);
    const group = evidenceByWallet.get(evidence.walletAddress) ?? [];
    group.push(evidence);
    evidenceByWallet.set(evidence.walletAddress, group);
  }

  return {
    campaign,
    completionsByWallet,
    evidenceByWallet,
    participantsById,
    rankingByParticipantId,
    tasks: [...tasksById.values()].sort((left, right) => compareCanonicalText(left.id, right.id)),
  };
};

const projectFromIndex = (
  index: SnapshotIndex,
  participantId: string,
  generatedAt: string,
  traceId: string,
): AdminReviewSnapshot => {
  assertBoundedString(participantId, "participantId", traceId);
  assertBoundedString(generatedAt, "generatedAt", traceId);
  const participant = index.participantsById.get(participantId);
  if (!participant) {
    return fail("ADMIN_REVIEW_DOMAIN_NOT_FOUND", { field: "participantId", traceId });
  }

  const completions = [...(index.completionsByWallet.get(participant.walletAddress) ?? [])]
    .sort((left, right) => compareCanonicalText(left.taskId, right.taskId)
      || compareCanonicalText(left.id, right.id));
  const evidence = [...(index.evidenceByWallet.get(participant.walletAddress) ?? [])]
    .sort((left, right) => compareCanonicalText(left.taskId, right.taskId)
      || compareCanonicalText(left.id, right.id));
  const completionByTaskId = new Map<string, CanonicalCompletion>();
  for (const completion of completions) {
    if (completionByTaskId.has(completion.taskId)) {
      return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "taskId", traceId });
    }
    completionByTaskId.set(completion.taskId, completion);
  }
  const evidenceByTaskId = new Map<string, CanonicalEvidence>();
  for (const record of evidence) {
    if (evidenceByTaskId.has(record.taskId)) {
      return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "taskId", traceId });
    }
    evidenceByTaskId.set(record.taskId, record);
  }
  const campaignWalletCompatible = isParticipantAccountTypeCompatible(
    index.campaign.walletPolicy,
    participant.accountType,
  );
  const diagnosticCodes = new Set<string>();
  if (!campaignWalletCompatible) {
    diagnosticCodes.add("CAMPAIGN_WALLET_POLICY_INCOMPATIBLE");
  }
  const eligibleCompletedTaskIds = new Set<string>();
  const completedTaskIds = new Set<string>();
  for (const task of index.tasks) {
    const completion = completionByTaskId.get(task.id);
    const taskEvidence = evidenceByTaskId.get(task.id);
    if (completion?.status === "completed") {
      completedTaskIds.add(task.id);
    }
    const taskWalletCompatible = campaignWalletCompatible
      && isParticipantAccountTypeCompatible(task.walletCompatibility, participant.accountType);
    if (!taskWalletCompatible && (completion || taskEvidence)) {
      diagnosticCodes.add("TASK_WALLET_POLICY_INCOMPATIBLE");
      continue;
    }
    if (!completion && taskEvidence) {
      diagnosticCodes.add("EVIDENCE_WITHOUT_COMPLETION");
      continue;
    }
    if (completion && !taskEvidence) {
      diagnosticCodes.add("COMPLETION_WITHOUT_EVIDENCE");
      continue;
    }
    if (completion && taskEvidence && (
      completion.status !== taskEvidence.status
      || completion.pointsAwarded !== taskEvidence.pointsAwarded
      || completion.pointsAwarded !== (completion.status === "completed" ? task.points : 0)
    )) {
      diagnosticCodes.add("TASK_EVIDENCE_FACT_MISMATCH");
      continue;
    }
    if (completion?.status === "completed") {
      eligibleCompletedTaskIds.add(task.id);
    }
  }
  const requiredTaskIds = index.tasks
    .filter((task) => task.required)
    .map((task) => task.id);
  const missingTaskIds = requiredTaskIds.filter((taskId) => !eligibleCompletedTaskIds.has(taskId));
  const completionPoints = completions
    .filter((completion) => completion.status === "completed")
    .reduce((total, completion) => total + completion.pointsAwarded, 0);
  if (completionPoints !== participant.totalPoints) {
    diagnosticCodes.add("COMPLETION_POINTS_TOTAL_MISMATCH");
  }
  const eligible = missingTaskIds.length === 0 && diagnosticCodes.size === 0;

  const manifest: AdminReviewSnapshotManifest = {
    campaign: index.campaign,
    completions,
    evidence,
    participant: {
      accountType: participant.accountType,
      campaignId: participant.campaignId,
      createdAt: participant.createdAt,
      diagnosticCodes: [...diagnosticCodes].sort(compareCanonicalText),
      eligible,
      id: participant.id,
      missingTaskIds,
      rank: participant.rank ?? null,
      riskFlags: lexicalUnique(participant.riskFlags, "riskFlags", traceId, 128),
      totalPoints: participant.totalPoints,
      updatedAt: participant.updatedAt,
      walletAddress: participant.walletAddress,
      walletSource: participant.walletSource,
      walletTypeVerified: participant.walletTypeVerified,
    },
    tasks: index.tasks,
    version: ADMIN_REVIEW_SNAPSHOT_VERSION,
  };
  const canonicalJson = canonicalizeAdminReviewJson(
    manifest as unknown as AdminReviewJsonObject,
    { field: "manifest", traceId },
  );

  return {
    canonicalJson,
    fingerprint: createHash("sha256").update(canonicalJson, "utf8").digest("hex"),
    fingerprintVersion: ADMIN_REVIEW_SNAPSHOT_VERSION,
    generatedAt,
    manifest,
    taskCoverage: {
      completed: completedTaskIds.size,
      evidence: evidence.length,
      required: requiredTaskIds.length,
      total: index.tasks.length,
    },
    walletAddress: participant.walletAddress,
  };
};

export const projectAdminReviewSnapshot = (
  rows: AdminReviewSnapshotRows,
  options: ProjectAdminReviewSnapshotOptions,
): AdminReviewSnapshot => {
  const traceId = safeContextValue(options.traceId, "trace-unavailable");
  return projectFromIndex(
    buildSnapshotIndex(rows, traceId),
    options.participantId,
    options.generatedAt,
    traceId,
  );
};

export const projectAdminReviewSnapshots = (
  rows: AdminReviewSnapshotRows,
  options: ProjectAdminReviewSnapshotsOptions,
): readonly AdminReviewSnapshot[] => {
  const traceId = safeContextValue(options.traceId, "trace-unavailable");
  const index = buildSnapshotIndex(rows, traceId);
  return [...index.participantsById.keys()]
    .sort(compareCanonicalText)
    .map((participantId) => projectFromIndex(index, participantId, options.generatedAt, traceId));
};

export interface AdminReviewCampaignSummary {
  campaignId: string;
  ownerAddress: string;
  participantCount: number;
  projectId: string;
  status: string;
  taskCount: number;
}

export interface ProjectAdminReviewCampaignFeedOptions {
  limit?: number;
  traceId: string;
}

const CAMPAIGN_SUMMARY_KEYS = [
  "campaignId",
  "ownerAddress",
  "participantCount",
  "projectId",
  "status",
  "taskCount",
] as const;

export const projectAdminReviewCampaignFeed = (
  campaigns: readonly AdminReviewCampaignSummary[],
  options: ProjectAdminReviewCampaignFeedOptions,
): readonly AdminReviewCampaignSummary[] => {
  const traceId = safeContextValue(options.traceId, "trace-unavailable");
  const limit = resolveListLimit(options.limit, "limit", traceId);
  assertBoundedArray(campaigns, "campaigns", traceId);
  if (campaigns.length > MAX_REVIEW_LIST_LIMIT) {
    return fail("ADMIN_REVIEW_DOMAIN_BOUND_EXCEEDED", { field: "campaigns", traceId });
  }

  const campaignIds = new Set<string>();
  const projected = campaigns.map((campaign): AdminReviewCampaignSummary => {
    assertPlainDataRecord(campaign, CAMPAIGN_SUMMARY_KEYS, "campaigns", traceId);
    const campaignId = assertBoundedString(campaign.campaignId, "campaignId", traceId, {
      maxLength: 256,
    });
    if (campaignIds.has(campaignId)) {
      return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "campaignId", traceId });
    }
    campaignIds.add(campaignId);
    return Object.freeze({
      campaignId,
      ownerAddress: assertSafePersistedString(
        campaign.ownerAddress,
        "ownerAddress",
        traceId,
        { maxLength: 256 },
      ),
      participantCount: assertFiniteNumber(
        campaign.participantCount,
        "participantCount",
        traceId,
        { integer: true, min: 0 },
      ),
      projectId: assertBoundedString(campaign.projectId, "projectId", traceId, {
        maxLength: 256,
      }),
      status: assertBoundedString(campaign.status, "status", traceId, { maxLength: 64 }),
      taskCount: assertFiniteNumber(campaign.taskCount, "taskCount", traceId, {
        integer: true,
        min: 0,
      }),
    });
  });

  return Object.freeze(projected
    .sort((left, right) => compareCanonicalText(left.campaignId, right.campaignId))
    .slice(0, limit));
};

export type AdminReviewState =
  | "approved_current"
  | "needs_review_current"
  | "pending_review"
  | "rejected_current"
  | "stale";

export interface AdminReviewStateResolution {
  latestDecision?: AdminReviewDecisionRecord;
  state: AdminReviewState;
}

export interface AdminReviewDecisionSummary {
  decidedAt: string;
  decision: AdminReviewDecisionValue;
  id: string;
  operatorRole: AdminOperatorRole;
  operatorSubject: string;
  reasonCode: string;
  snapshotFingerprint: string;
  version: number;
}

export interface AdminReviewDecisionDetail extends AdminReviewDecisionSummary {
  note?: string;
  operatorRole: AdminOperatorRole;
  operatorSubject: string;
  payloadHash: string;
  traceId: string;
}

export interface AdminReviewQueueItem {
  campaignId: string;
  campaignStatus: string;
  currentFingerprint: string;
  eligible: boolean;
  latestDecision?: AdminReviewDecisionSummary;
  participantId: string;
  rank: number | null;
  reviewState: AdminReviewState;
  riskFlags: readonly string[];
  taskCoverage: AdminReviewTaskCoverage;
  totalPoints: number;
  walletAddress: string;
}

export interface AdminReviewDetail {
  history: readonly AdminReviewDecisionDetail[];
  latestDecision?: AdminReviewDecisionDetail;
  reviewState: AdminReviewState;
  snapshot: AdminReviewSnapshot;
}

export interface ProjectAdminReviewQueueOptions {
  limit?: number;
  state?: AdminReviewState;
  traceId: string;
}

export interface ProjectAdminReviewDetailOptions {
  historyLimit?: number;
  traceId: string;
}

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const REVIEW_STATES: readonly AdminReviewState[] = [
  "approved_current",
  "needs_review_current",
  "pending_review",
  "rejected_current",
  "stale",
];
const CURRENT_REVIEW_STATE: Record<AdminReviewDecisionValue, AdminReviewState> = {
  approved: "approved_current",
  needs_review: "needs_review_current",
  rejected: "rejected_current",
};

const DECISION_RECORD_KEYS = [
  "campaignId",
  "decidedAt",
  "decision",
  "id",
  "idempotencyKeyHash",
  "note",
  "operatorRole",
  "operatorSubject",
  "participantId",
  "payloadHash",
  "reasonCode",
  "snapshotFingerprint",
  "snapshotManifest",
  "snapshotVersion",
  "traceId",
  "version",
  "walletAddress",
] as const;

const assertSha256 = (value: string, field: string, traceId: string): string => {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field, traceId });
  }
  return value;
};

const resolveListLimit = (
  value: number | undefined,
  field: string,
  traceId: string,
): number => {
  if (value === undefined) {
    return MAX_REVIEW_LIST_LIMIT;
  }
  if (!Number.isInteger(value) || value < 1) {
    return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field, traceId });
  }
  if (value > MAX_REVIEW_LIST_LIMIT) {
    return fail("ADMIN_REVIEW_DOMAIN_BOUND_EXCEEDED", { field, traceId });
  }
  return value;
};

const validateDecisionRecord = (
  decision: AdminReviewDecisionRecord,
  traceId: string,
): void => {
  if (!decision || typeof decision !== "object") {
    return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "decision", traceId });
  }
  assertPlainDataRecord(decision, DECISION_RECORD_KEYS, "decision", traceId);
  assertBoundedString(decision.campaignId, "campaignId", traceId);
  assertBoundedString(decision.decidedAt, "decidedAt", traceId);
  assertEnum(decision.decision, ["approved", "rejected", "needs_review"], "decision", traceId);
  assertBoundedString(decision.id, "decisionId", traceId);
  assertSha256(decision.idempotencyKeyHash, "idempotencyKeyHash", traceId);
  if (decision.note !== undefined) {
    assertSafePersistedString(decision.note, "note", traceId, {
      allowEmpty: true,
      maxLength: 1_000,
    });
  }
  assertEnum(decision.operatorRole, ["internal_operator", "review_operator"], "operatorRole", traceId);
  assertSafeIdentifier(decision.operatorSubject, "operatorSubject", traceId, 256);
  assertBoundedString(decision.participantId, "participantId", traceId);
  assertSha256(decision.payloadHash, "payloadHash", traceId);
  assertSafeIdentifier(decision.reasonCode, "reasonCode", traceId, 64);
  assertSha256(decision.snapshotFingerprint, "snapshotFingerprint", traceId);
  canonicalizeAdminReviewJson(decision.snapshotManifest, {
    field: "snapshotManifest",
    traceId,
  });
  if (decision.snapshotVersion !== ADMIN_REVIEW_SNAPSHOT_VERSION) {
    return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "snapshotVersion", traceId });
  }
  if (safeContextValue(decision.traceId, "") !== decision.traceId) {
    return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "decisionTraceId", traceId });
  }
  assertFiniteNumber(decision.version, "version", traceId, { integer: true, min: 1 });
  assertSafePersistedString(decision.walletAddress, "walletAddress", traceId, { maxLength: 256 });
  const expectedPayloadHash = deriveAdminReviewDecisionPayloadHash({
    campaignId: decision.campaignId,
    decision: decision.decision,
    expectedSnapshotFingerprint: decision.snapshotFingerprint,
    ...(decision.note === undefined ? {} : { note: decision.note }),
    operatorRole: decision.operatorRole,
    operatorSubject: decision.operatorSubject,
    participantId: decision.participantId,
    reasonCode: decision.reasonCode,
  });
  if (decision.payloadHash !== expectedPayloadHash) {
    return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "payloadHash", traceId });
  }
};

const normalizeDecisionHistory = (
  decisions: readonly AdminReviewDecisionRecord[],
  traceId: string,
): AdminReviewDecisionRecord[] => {
  assertBoundedArray(decisions, "decisions", traceId);
  const versions = new Set<number>();
  const ids = new Set<string>();
  const normalized = [...decisions];
  for (const decision of normalized) {
    validateDecisionRecord(decision, traceId);
    if (versions.has(decision.version)) {
      return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "version", traceId });
    }
    if (ids.has(decision.id)) {
      return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "decisionId", traceId });
    }
    versions.add(decision.version);
    ids.add(decision.id);
  }
  return normalized.sort((left, right) =>
    right.version - left.version
    || compareCanonicalText(right.decidedAt, left.decidedAt)
    || compareCanonicalText(left.id, right.id));
};

export const resolveAdminReviewState = (
  currentFingerprint: string,
  decisions: readonly AdminReviewDecisionRecord[],
  context: { traceId: string },
): AdminReviewStateResolution => {
  const traceId = safeContextValue(context.traceId, "trace-unavailable");
  assertSha256(currentFingerprint, "currentFingerprint", traceId);
  const latestDecision = normalizeDecisionHistory(decisions, traceId)[0];
  if (!latestDecision) {
    return { latestDecision: undefined, state: "pending_review" };
  }
  if (latestDecision.snapshotFingerprint !== currentFingerprint) {
    return { latestDecision, state: "stale" };
  }
  return { latestDecision, state: CURRENT_REVIEW_STATE[latestDecision.decision] };
};

const toDecisionSummary = (
  decision: AdminReviewDecisionRecord,
): AdminReviewDecisionSummary => ({
  decidedAt: decision.decidedAt,
  decision: decision.decision,
  id: decision.id,
  operatorRole: decision.operatorRole,
  operatorSubject: decision.operatorSubject,
  reasonCode: decision.reasonCode,
  snapshotFingerprint: decision.snapshotFingerprint,
  version: decision.version,
});

const toDecisionDetail = (
  decision: AdminReviewDecisionRecord,
): AdminReviewDecisionDetail => ({
  ...toDecisionSummary(decision),
  ...(decision.note === undefined ? {} : { note: decision.note }),
  operatorRole: decision.operatorRole,
  operatorSubject: decision.operatorSubject,
  payloadHash: decision.payloadHash,
  traceId: decision.traceId,
});

const groupDecisionsByParticipant = (
  snapshots: readonly AdminReviewSnapshot[],
  decisions: readonly AdminReviewDecisionRecord[],
  traceId: string,
): Map<string, AdminReviewDecisionRecord[]> => {
  assertBoundedArray(snapshots, "snapshots", traceId);
  assertBoundedArray(decisions, "decisions", traceId);
  const campaignId = snapshots[0]?.manifest.campaign.id;
  const snapshotsByParticipant = new Map<string, AdminReviewSnapshot>();
  for (const snapshot of snapshots) {
    validateSnapshotIntegrity(snapshot, traceId);
    if (snapshot.manifest.campaign.id !== campaignId) {
      return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "campaignId", traceId });
    }
    const participantId = snapshot.manifest.participant.id;
    if (snapshotsByParticipant.has(participantId)) {
      return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "participantId", traceId });
    }
    snapshotsByParticipant.set(participantId, snapshot);
  }
  const groups = new Map<string, AdminReviewDecisionRecord[]>();
  for (const decision of decisions) {
    validateDecisionRecord(decision, traceId);
    if (decision.campaignId !== campaignId) {
      return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "campaignId", traceId });
    }
    const snapshot = snapshotsByParticipant.get(decision.participantId);
    if (!snapshot) {
      return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "participantId", traceId });
    }
    if (decision.walletAddress !== snapshot.walletAddress) {
      return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "walletAddress", traceId });
    }
    const group = groups.get(decision.participantId) ?? [];
    group.push(decision);
    groups.set(decision.participantId, group);
  }
  return groups;
};

export const projectAdminReviewQueue = (
  snapshots: readonly AdminReviewSnapshot[],
  decisions: readonly AdminReviewDecisionRecord[],
  options: ProjectAdminReviewQueueOptions,
): readonly AdminReviewQueueItem[] => {
  const traceId = safeContextValue(options.traceId, "trace-unavailable");
  const limit = resolveListLimit(options.limit, "limit", traceId);
  if (options.state !== undefined && !REVIEW_STATES.includes(options.state)) {
    return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "state", traceId });
  }
  const decisionsByParticipant = groupDecisionsByParticipant(snapshots, decisions, traceId);

  return [...snapshots]
    .sort((left, right) => compareCanonicalText(
      left.manifest.participant.id,
      right.manifest.participant.id,
    ))
    .map((snapshot): AdminReviewQueueItem => {
      const participant = snapshot.manifest.participant;
      const resolution = resolveAdminReviewState(
        snapshot.fingerprint,
        decisionsByParticipant.get(participant.id) ?? [],
        { traceId },
      );
      return {
        campaignId: snapshot.manifest.campaign.id,
        campaignStatus: snapshot.manifest.campaign.status,
        currentFingerprint: snapshot.fingerprint,
        eligible: participant.eligible,
        latestDecision: resolution.latestDecision
          ? toDecisionSummary(resolution.latestDecision)
          : undefined,
        participantId: participant.id,
        rank: participant.rank,
        reviewState: resolution.state,
        riskFlags: participant.riskFlags,
        taskCoverage: snapshot.taskCoverage,
        totalPoints: participant.totalPoints,
        walletAddress: participant.walletAddress,
      };
    })
    .filter((item) => options.state === undefined || item.reviewState === options.state)
    .slice(0, limit);
};

export const projectAdminReviewDetail = (
  snapshot: AdminReviewSnapshot,
  decisions: readonly AdminReviewDecisionRecord[],
  options: ProjectAdminReviewDetailOptions,
): AdminReviewDetail => {
  const traceId = safeContextValue(options.traceId, "trace-unavailable");
  validateSnapshotIntegrity(snapshot, traceId);
  const historyLimit = resolveListLimit(options.historyLimit, "historyLimit", traceId);
  const history = normalizeDecisionHistory(decisions, traceId);
  for (const decision of history) {
    if (decision.campaignId !== snapshot.manifest.campaign.id) {
      return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "campaignId", traceId });
    }
    if (
      decision.participantId !== snapshot.manifest.participant.id
      || decision.walletAddress !== snapshot.walletAddress
    ) {
      return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "participantId", traceId });
    }
  }
  const resolution = resolveAdminReviewState(snapshot.fingerprint, history, { traceId });
  const projectedHistory = history.slice(0, historyLimit).map(toDecisionDetail);
  return {
    history: projectedHistory,
    latestDecision: projectedHistory[0],
    reviewState: resolution.state,
    snapshot,
  };
};

export const ADMIN_REVIEW_REASON_CODES = {
  approved: ["evidence_verified"],
  needs_review: ["manual_review_required", "risk_requires_review"],
  rejected: ["eligibility_not_met", "evidence_invalid"],
} as const satisfies Record<AdminReviewDecisionValue, readonly string[]>;

export interface SubmitAdminReviewDecisionInput {
  campaignId: string;
  decision: AdminReviewDecisionValue;
  expectedSnapshotFingerprint: string;
  idempotencyKey: string;
  note?: string;
  participantId: string;
  reasonCode: string;
}

export interface TrustedAdminReviewOperatorContext {
  operatorRole: AdminOperatorRole;
  operatorSubject: string;
  traceId: string;
}

export interface SubmitAdminReviewDecisionOptions {
  clock?: () => string;
}

export interface AdminReviewDecisionReceipt {
  campaignId: string;
  created: boolean;
  decidedAt: string;
  decision: AdminReviewDecisionValue;
  decisionId: string;
  participantId: string;
  replayed: boolean;
  snapshotFingerprint: string;
  traceId: string;
  version: number;
}

const DECISION_INPUT_KEYS = [
  "campaignId",
  "decision",
  "expectedSnapshotFingerprint",
  "idempotencyKey",
  "note",
  "participantId",
  "reasonCode",
] as const;
const SAFE_COMMAND_VALUE_PATTERN = SAFE_IDENTIFIER_PATTERN;

const normalizeCommandValue = (
  value: string,
  field: string,
  traceId: string,
  maxLength: number,
): string => {
  if (typeof value !== "string") {
    return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field, traceId });
  }
  const normalized = value.trim();
  assertBoundedString(normalized, field, traceId, { maxLength });
  if (!SAFE_COMMAND_VALUE_PATTERN.test(normalized)) {
    return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field, traceId });
  }
  return normalized;
};

const normalizeDecisionNote = (
  value: string | undefined,
  traceId: string,
): string | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "note", traceId });
  }
  const normalized = value.trim();
  return assertSafePersistedString(normalized, "note", traceId, { maxLength: 1_000 });
};

const normalizeStoreError = (error: unknown, traceId: string): AdminReviewDomainError => {
  if (!(error instanceof AdminReviewStoreError)) {
    return new AdminReviewDomainError({
      code: "ADMIN_REVIEW_DOMAIN_UNAVAILABLE",
      field: "store",
      traceId,
    });
  }
  if (error.code === "ADMIN_REVIEW_STORE_STALE") {
    return new AdminReviewDomainError({
      code: "ADMIN_REVIEW_DOMAIN_STALE",
      field: "expectedSnapshotFingerprint",
      traceId,
    });
  }
  if (error.code === "ADMIN_REVIEW_STORE_IDEMPOTENCY_CONFLICT") {
    return new AdminReviewDomainError({
      code: "ADMIN_REVIEW_DOMAIN_CONFLICT",
      field: "idempotencyKey",
      traceId,
    });
  }
  if (error.code === "ADMIN_REVIEW_STORE_NOT_FOUND") {
    return new AdminReviewDomainError({
      code: "ADMIN_REVIEW_DOMAIN_NOT_FOUND",
      field: error.field,
      traceId,
    });
  }
  if (error.code === "ADMIN_REVIEW_STORE_BOUND_EXCEEDED") {
    return new AdminReviewDomainError({
      code: "ADMIN_REVIEW_DOMAIN_BOUND_EXCEEDED",
      field: error.field,
      traceId,
    });
  }
  if (error.code === "ADMIN_REVIEW_STORE_ARGUMENT_INVALID") {
    return new AdminReviewDomainError({
      code: "ADMIN_REVIEW_DOMAIN_INVALID_FACTS",
      field: error.field,
      traceId,
    });
  }
  return new AdminReviewDomainError({
    code: "ADMIN_REVIEW_DOMAIN_UNAVAILABLE",
    field: "store",
    traceId,
  });
};

export const submitAdminReviewDecision = async (
  store: AdminReviewStore,
  input: SubmitAdminReviewDecisionInput,
  trustedContext: TrustedAdminReviewOperatorContext,
  options: SubmitAdminReviewDecisionOptions = {},
): Promise<AdminReviewDecisionReceipt> => {
  const traceId = safeContextValue(trustedContext.traceId, "trace-unavailable");
  assertPlainDataRecord(input, DECISION_INPUT_KEYS, "command", traceId);
  const campaignId = normalizeCommandValue(input.campaignId, "campaignId", traceId, 256);
  const participantId = normalizeCommandValue(input.participantId, "participantId", traceId, 256);
  const decision = assertEnum(
    input.decision,
    ["approved", "rejected", "needs_review"],
    "decision",
    traceId,
  );
  const expectedSnapshotFingerprint = assertSha256(
    input.expectedSnapshotFingerprint,
    "expectedSnapshotFingerprint",
    traceId,
  );
  const reasonCode = normalizeCommandValue(input.reasonCode, "reasonCode", traceId, 64);
  if (!(ADMIN_REVIEW_REASON_CODES[decision] as readonly string[]).includes(reasonCode)) {
    return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "reasonCode", traceId });
  }
  const note = normalizeDecisionNote(input.note, traceId);
  const idempotencyKey = normalizeCommandValue(
    input.idempotencyKey,
    "idempotencyKey",
    traceId,
    128,
  );
  if (idempotencyKey.length < 8) {
    return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "idempotencyKey", traceId });
  }
  const operatorRole = assertEnum(
    trustedContext.operatorRole,
    ["internal_operator", "review_operator"],
    "operatorRole",
    traceId,
  );
  const operatorSubject = normalizeCommandValue(
    trustedContext.operatorSubject,
    "operatorSubject",
    traceId,
    256,
  );
  if (
    !store
    || typeof store.readSnapshot !== "function"
    || typeof store.appendDecision !== "function"
  ) {
    return fail("ADMIN_REVIEW_DOMAIN_UNAVAILABLE", { field: "store", traceId });
  }
  const clock = options.clock ?? (() => new Date().toISOString());
  const project = (rows: AdminReviewSnapshotRows): AdminReviewSnapshot =>
    projectAdminReviewSnapshot(rows, {
      generatedAt: clock(),
      participantId,
      traceId,
    });

  let preflight: AdminReviewSnapshot;
  try {
    const rows = await store.readSnapshot({ campaignId, participantId }, { traceId });
    preflight = project(rows);
  } catch (error) {
    if (error instanceof AdminReviewDomainError) {
      throw error;
    }
    throw normalizeStoreError(error, traceId);
  }
  if (preflight.manifest.campaign.id !== campaignId) {
    return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "campaignId", traceId });
  }
  if (preflight.fingerprint !== expectedSnapshotFingerprint) {
    return fail("ADMIN_REVIEW_DOMAIN_STALE", {
      field: "expectedSnapshotFingerprint",
      traceId,
    });
  }

  const normalizedInput = {
    campaignId,
    decision,
    expectedSnapshotFingerprint,
    idempotencyKeyHash: createHash("sha256").update(idempotencyKey, "utf8").digest("hex"),
    ...(note === undefined ? {} : { note }),
    operatorRole,
    operatorSubject,
    participantId,
    reasonCode,
  };
  let result;
  try {
    result = await store.appendDecision(
      normalizedInput,
      (rows) => {
        const snapshot = project(rows);
        return {
          fingerprint: snapshot.fingerprint,
          manifest: snapshot.manifest as unknown as AdminReviewJsonObject,
          walletAddress: snapshot.walletAddress,
        };
      },
      { traceId },
    );
  } catch (error) {
    throw normalizeStoreError(error, traceId);
  }

  if (!result || typeof result !== "object") {
    return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "decisionResult", traceId });
  }
  assertPlainDataRecord(result, ["created", "record"], "decisionResult", traceId);
  assertBoolean(result.created, "created", traceId);
  validateDecisionRecord(result.record, traceId);
  const record = result.record;
  if (
    record.campaignId !== campaignId
    || record.participantId !== participantId
    || record.walletAddress !== preflight.walletAddress
    || record.snapshotFingerprint !== expectedSnapshotFingerprint
    || record.decision !== decision
    || record.reasonCode !== reasonCode
    || record.note !== note
    || record.operatorRole !== operatorRole
    || record.operatorSubject !== operatorSubject
    || record.idempotencyKeyHash !== normalizedInput.idempotencyKeyHash
  ) {
    const field = record.walletAddress !== preflight.walletAddress
      ? "walletAddress"
      : "decisionRecord";
    return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field, traceId });
  }
  const recordSnapshotCanonicalJson = canonicalizeAdminReviewJson(record.snapshotManifest, {
    field: "snapshotManifest",
    traceId,
  });
  if (recordSnapshotCanonicalJson !== preflight.canonicalJson) {
    return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "snapshotManifest", traceId });
  }

  return {
    campaignId,
    created: result.created,
    decidedAt: record.decidedAt,
    decision: record.decision,
    decisionId: record.id,
    participantId,
    replayed: !result.created,
    snapshotFingerprint: record.snapshotFingerprint,
    traceId: record.traceId,
    version: record.version,
  };
};

export interface AdminReviewWinnerRow {
  campaignId: string;
  decisionId: string;
  decisionVersion: number;
  evidenceHashes: readonly string[];
  participantId: string;
  rank: number | null;
  snapshotFingerprint: string;
  totalPoints: number;
  walletAddress: string;
}

export type AdminReviewArtifactSourceManifest = Readonly<{
  campaign: CanonicalCampaign;
  rows: readonly AdminReviewWinnerRow[];
  version: typeof ADMIN_ARTIFACT_SOURCE_VERSION;
}>;

export interface AdminReviewWinnerSource {
  canonicalJson: string;
  fingerprint: string;
  manifest: AdminReviewArtifactSourceManifest;
  rowCount: number;
  rows: readonly AdminReviewWinnerRow[];
  sourceVersion: typeof ADMIN_ARTIFACT_SOURCE_VERSION;
}

export interface ProjectAdminReviewWinnerSourceOptions {
  campaign?: AdminReviewCampaignRow;
  traceId: string;
}

const hasBlockingRisk = (riskFlags: readonly string[]): boolean =>
  riskFlags.some((riskFlag) => riskFlag.startsWith("blocking:"));

const validateSnapshotIntegrity = (
  snapshot: AdminReviewSnapshot,
  traceId: string,
): void => {
  if (!snapshot || typeof snapshot !== "object") {
    return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "snapshot", traceId });
  }
  if (snapshot.fingerprintVersion !== ADMIN_REVIEW_SNAPSHOT_VERSION) {
    return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "fingerprintVersion", traceId });
  }
  assertSha256(snapshot.fingerprint, "snapshotFingerprint", traceId);
  if (snapshot.walletAddress !== snapshot.manifest.participant.walletAddress) {
    return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "walletAddress", traceId });
  }
  const canonicalJson = canonicalizeAdminReviewJson(
    snapshot.manifest as unknown as AdminReviewJsonObject,
    { field: "manifest", traceId },
  );
  const fingerprint = createHash("sha256").update(canonicalJson, "utf8").digest("hex");
  if (canonicalJson !== snapshot.canonicalJson || fingerprint !== snapshot.fingerprint) {
    return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "snapshotFingerprint", traceId });
  }
};

const compareWinnerRows = (
  left: AdminReviewWinnerRow,
  right: AdminReviewWinnerRow,
): number => {
  if (left.totalPoints !== right.totalPoints) {
    return right.totalPoints - left.totalPoints;
  }
  if (left.rank === null && right.rank !== null) {
    return 1;
  }
  if (left.rank !== null && right.rank === null) {
    return -1;
  }
  if (left.rank !== null && right.rank !== null && left.rank !== right.rank) {
    return left.rank - right.rank;
  }
  return compareCanonicalText(left.walletAddress, right.walletAddress)
    || compareCanonicalText(left.participantId, right.participantId);
};

export const projectAdminReviewWinnerSource = (
  snapshots: readonly AdminReviewSnapshot[],
  decisions: readonly AdminReviewDecisionRecord[],
  options: ProjectAdminReviewWinnerSourceOptions,
): AdminReviewWinnerSource => {
  const traceId = safeContextValue(options.traceId, "trace-unavailable");
  assertBoundedArray(snapshots, "snapshots", traceId);
  if (snapshots.length > ADMIN_REVIEW_MAX_ARTIFACT_ROWS) {
    return fail("ADMIN_REVIEW_DOMAIN_BOUND_EXCEEDED", { field: "snapshots", traceId });
  }
  const requestedCampaign = options.campaign === undefined
    ? undefined
    : validateCampaign(options.campaign, traceId);
  if (snapshots.length === 0 && !requestedCampaign) {
    return fail("ADMIN_REVIEW_DOMAIN_NOT_FOUND", { field: "campaignId", traceId });
  }

  const campaign = requestedCampaign ?? snapshots[0]!.manifest.campaign;
  const campaignCanonicalJson = canonicalizeAdminReviewJson(
    campaign as unknown as AdminReviewJsonObject,
    { field: "campaign", traceId },
  );
  const campaignId = campaign.id;
  const participantIds = new Set<string>();
  for (const snapshot of snapshots) {
    validateSnapshotIntegrity(snapshot, traceId);
    if (
      snapshot.manifest.campaign.id !== campaignId
      || canonicalizeAdminReviewJson(
        snapshot.manifest.campaign as unknown as AdminReviewJsonObject,
        { field: "campaign", traceId },
      ) !== campaignCanonicalJson
    ) {
      return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "campaignId", traceId });
    }
    const participantId = snapshot.manifest.participant.id;
    if (participantIds.has(participantId)) {
      return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "participantId", traceId });
    }
    participantIds.add(participantId);
  }

  const decisionsByParticipant = groupDecisionsByParticipant(snapshots, decisions, traceId);
  const rows: AdminReviewWinnerRow[] = [];
  for (const snapshot of snapshots) {
    const participant = snapshot.manifest.participant;
    const resolution = resolveAdminReviewState(
      snapshot.fingerprint,
      decisionsByParticipant.get(participant.id) ?? [],
      { traceId },
    );
    const latestDecision = resolution.latestDecision;
    if (
      resolution.state !== "approved_current"
      || !latestDecision
      || !participant.eligible
      || hasBlockingRisk(participant.riskFlags)
    ) {
      continue;
    }
    if (latestDecision.walletAddress !== participant.walletAddress) {
      return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "walletAddress", traceId });
    }
    rows.push({
      campaignId,
      decisionId: latestDecision.id,
      decisionVersion: latestDecision.version,
      evidenceHashes: lexicalUnique(
        snapshot.manifest.evidence.map((evidence) => evidence.evidenceHash),
        "evidenceHashes",
        traceId,
      ),
      participantId: participant.id,
      rank: participant.rank,
      snapshotFingerprint: snapshot.fingerprint,
      totalPoints: participant.totalPoints,
      walletAddress: participant.walletAddress,
    });
  }
  rows.sort(compareWinnerRows);

  const frozenRows = Object.freeze(rows.map((row): AdminReviewWinnerRow => Object.freeze({
    ...row,
    evidenceHashes: Object.freeze([...row.evidenceHashes]),
  })));
  const frozenCampaign = Object.freeze({ ...campaign });
  const manifest: AdminReviewArtifactSourceManifest = Object.freeze({
    campaign: frozenCampaign,
    rows: frozenRows,
    version: ADMIN_ARTIFACT_SOURCE_VERSION,
  });
  const canonicalJson = canonicalizeAdminReviewJson(
    manifest as unknown as AdminReviewJsonObject,
    { field: "sourceManifest", traceId },
  );
  if (Buffer.byteLength(canonicalJson, "utf8") > ADMIN_REVIEW_MAX_SOURCE_MANIFEST_BYTES) {
    return fail("ADMIN_REVIEW_DOMAIN_BOUND_EXCEEDED", { field: "sourceManifest", traceId });
  }

  return Object.freeze({
    canonicalJson,
    fingerprint: createHash("sha256").update(canonicalJson, "utf8").digest("hex"),
    manifest,
    rowCount: frozenRows.length,
    rows: frozenRows,
    sourceVersion: ADMIN_ARTIFACT_SOURCE_VERSION,
  });
};

export interface ProjectAdminReviewWinnerSourceFromStoreSnapshotOptions {
  generatedAt: string;
  traceId: string;
}

export const projectAdminReviewWinnerSourceFromStoreSnapshot = (
  source: AdminExportArtifactProjectionSource,
  options: ProjectAdminReviewWinnerSourceFromStoreSnapshotOptions,
): AdminReviewWinnerSource => {
  if (!source?.rows?.campaign) {
    return fail("ADMIN_REVIEW_DOMAIN_NOT_FOUND", {
      field: "campaignId",
      traceId: safeContextValue(options.traceId, "trace-unavailable"),
    });
  }
  const snapshots = projectAdminReviewSnapshots(source.rows, {
    generatedAt: options.generatedAt,
    traceId: options.traceId,
  });

  return projectAdminReviewWinnerSource(snapshots, source.latestDecisions, {
    campaign: source.rows.campaign,
    traceId: options.traceId,
  });
};

export interface ReadAdminReviewQueueInput extends ProjectAdminReviewQueueOptions {
  campaignId: string;
  generatedAt: string;
}

export interface ReadAdminReviewDetailInput extends ProjectAdminReviewDetailOptions {
  campaignId: string;
  generatedAt: string;
  participantId: string;
}

export interface ReadAdminReviewWinnerSourceInput {
  campaignId: string;
  generatedAt: string;
  traceId: string;
}

const READ_QUEUE_INPUT_KEYS = [
  "campaignId", "generatedAt", "limit", "state", "traceId",
] as const;
const READ_DETAIL_INPUT_KEYS = [
  "campaignId", "generatedAt", "historyLimit", "participantId", "traceId",
] as const;
const READ_WINNER_INPUT_KEYS = ["campaignId", "generatedAt", "traceId"] as const;

const assertStoreMethods = (
  store: AdminReviewStore,
  methods: readonly (keyof AdminReviewStore)[],
  traceId: string,
): void => {
  if (
    !store
    || (typeof store !== "object" && typeof store !== "function")
    || methods.some((method) => typeof store[method] !== "function")
  ) {
    return fail("ADMIN_REVIEW_DOMAIN_UNAVAILABLE", { field: "store", traceId });
  }
};

const assertRequestedCampaign = (
  rows: AdminReviewSnapshotRows,
  campaignId: string,
  traceId: string,
): void => {
  if (rows.campaign?.id !== campaignId) {
    return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "campaignId", traceId });
  }
};

const currentDecisionsForSnapshots = async (
  store: AdminReviewStore,
  campaignId: string,
  snapshots: readonly AdminReviewSnapshot[],
  traceId: string,
): Promise<AdminReviewDecisionRecord[]> => {
  const decisions = await Promise.all(snapshots.map((snapshot) => store.getCurrentDecision({
    campaignId,
    participantId: snapshot.manifest.participant.id,
  }, { traceId })));
  return decisions.filter((decision): decision is AdminReviewDecisionRecord =>
    decision !== undefined);
};

export const readAdminReviewQueue = async (
  store: AdminReviewStore,
  input: ReadAdminReviewQueueInput,
): Promise<readonly AdminReviewQueueItem[]> => {
  const traceId = safeContextValue(input.traceId, "trace-unavailable");
  assertPlainDataRecord(input, READ_QUEUE_INPUT_KEYS, "input", traceId);
  const campaignId = normalizeCommandValue(input.campaignId, "campaignId", traceId, 256);
  const generatedAt = assertBoundedString(input.generatedAt, "generatedAt", traceId);
  resolveListLimit(input.limit, "limit", traceId);
  if (input.state !== undefined && !REVIEW_STATES.includes(input.state)) {
    return fail("ADMIN_REVIEW_DOMAIN_INVALID_FACTS", { field: "state", traceId });
  }
  assertStoreMethods(store, ["getCurrentDecision", "readSnapshot"], traceId);

  try {
    const rows = await store.readSnapshot({ campaignId }, { traceId });
    assertRequestedCampaign(rows, campaignId, traceId);
    const snapshots = projectAdminReviewSnapshots(rows, { generatedAt, traceId });
    const decisions = await currentDecisionsForSnapshots(
      store,
      campaignId,
      snapshots,
      traceId,
    );
    return projectAdminReviewQueue(snapshots, decisions, {
      ...(input.limit === undefined ? {} : { limit: input.limit }),
      ...(input.state === undefined ? {} : { state: input.state }),
      traceId,
    });
  } catch (error) {
    if (error instanceof AdminReviewDomainError) {
      throw error;
    }
    throw normalizeStoreError(error, traceId);
  }
};

export const readAdminReviewDetail = async (
  store: AdminReviewStore,
  input: ReadAdminReviewDetailInput,
): Promise<AdminReviewDetail> => {
  const traceId = safeContextValue(input.traceId, "trace-unavailable");
  assertPlainDataRecord(input, READ_DETAIL_INPUT_KEYS, "input", traceId);
  const campaignId = normalizeCommandValue(input.campaignId, "campaignId", traceId, 256);
  const participantId = normalizeCommandValue(
    input.participantId,
    "participantId",
    traceId,
    256,
  );
  const generatedAt = assertBoundedString(input.generatedAt, "generatedAt", traceId);
  const historyLimit = resolveListLimit(input.historyLimit, "historyLimit", traceId);
  assertStoreMethods(store, ["listDecisions", "readSnapshot"], traceId);

  try {
    const [rows, decisions] = await Promise.all([
      store.readSnapshot({ campaignId, participantId }, { traceId }),
      store.listDecisions({ campaignId, participantId, limit: historyLimit }, { traceId }),
    ]);
    assertRequestedCampaign(rows, campaignId, traceId);
    const snapshot = projectAdminReviewSnapshot(rows, {
      generatedAt,
      participantId,
      traceId,
    });
    return projectAdminReviewDetail(snapshot, decisions, { historyLimit, traceId });
  } catch (error) {
    if (error instanceof AdminReviewDomainError) {
      throw error;
    }
    throw normalizeStoreError(error, traceId);
  }
};

export const readAdminReviewWinnerSource = async (
  store: AdminReviewStore,
  input: ReadAdminReviewWinnerSourceInput,
): Promise<AdminReviewWinnerSource> => {
  const traceId = safeContextValue(input.traceId, "trace-unavailable");
  assertPlainDataRecord(input, READ_WINNER_INPUT_KEYS, "input", traceId);
  const campaignId = normalizeCommandValue(input.campaignId, "campaignId", traceId, 256);
  const generatedAt = assertBoundedString(input.generatedAt, "generatedAt", traceId);
  assertStoreMethods(store, ["getCurrentDecision", "readSnapshot"], traceId);

  try {
    const rows = await store.readSnapshot({ campaignId }, { traceId });
    assertRequestedCampaign(rows, campaignId, traceId);
    const snapshots = projectAdminReviewSnapshots(rows, { generatedAt, traceId });
    const decisions = await currentDecisionsForSnapshots(
      store,
      campaignId,
      snapshots,
      traceId,
    );
    return projectAdminReviewWinnerSource(snapshots, decisions, {
      campaign: rows.campaign!,
      traceId,
    });
  } catch (error) {
    if (error instanceof AdminReviewDomainError) {
      throw error;
    }
    throw normalizeStoreError(error, traceId);
  }
};
