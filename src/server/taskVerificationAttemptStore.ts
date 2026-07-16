import { createHash, randomBytes, randomUUID } from "node:crypto";
import type {
  CampaignDbParticipantRecord,
  CampaignDbTaskCompletion,
  CampaignDbTaskEvidenceRecord,
} from "./campaignDbRepository";
import {
  TASK_VERIFICATION_EXTERNAL_DISPATCH_LIMIT,
  TASK_VERIFICATION_MAX_OWNERSHIP_ATTEMPTS,
  isServerIssuedTaskVerificationIdentity,
  isServerIssuedTaskVerificationTransition,
  type TaskVerificationAttemptStatus,
  type TaskVerificationIdentity,
  type TaskVerificationTransition,
} from "./taskVerification";

export const taskVerificationDispatchStates = [
  "not_started",
  "started",
  "result_observed",
] as const;
export type TaskVerificationDispatchState = (typeof taskVerificationDispatchStates)[number];

export const taskVerificationRetryPostures = [
  "none",
  "retry_finalize",
  "manual_review",
  "blocked",
] as const;
export type TaskVerificationRetryPosture = (typeof taskVerificationRetryPostures)[number];

export type TaskVerificationAttemptStoreErrorCode =
  | "TASK_VERIFICATION_ATTEMPT_INPUT_INVALID"
  | "TASK_VERIFICATION_ATTEMPT_PERSISTENCE_FAILED"
  | "TASK_VERIFICATION_ATTEMPT_STORE_CLOSED";

const SAFE_ERROR_MESSAGES: Readonly<Record<TaskVerificationAttemptStoreErrorCode, string>> =
  Object.freeze({
    TASK_VERIFICATION_ATTEMPT_INPUT_INVALID: "Task verification attempt input is invalid.",
    TASK_VERIFICATION_ATTEMPT_PERSISTENCE_FAILED:
      "Task verification attempt persistence failed.",
    TASK_VERIFICATION_ATTEMPT_STORE_CLOSED: "Task verification attempt store is closed.",
  });

export class TaskVerificationAttemptStoreError extends Error {
  readonly code: TaskVerificationAttemptStoreErrorCode;
  readonly field: string;
  readonly traceId: string;

  constructor(options: {
    code: TaskVerificationAttemptStoreErrorCode;
    field: string;
    traceId: string;
  }) {
    super(SAFE_ERROR_MESSAGES[options.code]);
    this.name = "TaskVerificationAttemptStoreError";
    this.code = options.code;
    this.field = safeContext(options.field, "input", 160);
    this.traceId = safeContext(options.traceId, "trace-unavailable", 128);
    delete this.stack;
  }
}

export interface TaskVerificationAttemptSafeRecord {
  readonly accountType: TaskVerificationIdentity["issuedSubject"]["accountType"];
  readonly attemptCount: number;
  readonly bindingId: string;
  readonly bindingRevision: number;
  readonly campaignId: string;
  readonly completedAt?: string;
  readonly createdAt: string;
  readonly diagnosticCodes: readonly string[];
  readonly dispatchState: TaskVerificationDispatchState;
  readonly evidenceHash?: string;
  readonly evidenceRef?: string;
  readonly evidenceRuleDigest: string;
  readonly evidenceSource?: "AEFINDER" | "AELFSCAN" | "DAPP_API";
  readonly externalDispatchLimit: typeof TASK_VERIFICATION_EXTERNAL_DISPATCH_LIMIT;
  readonly fence: number;
  readonly id: string;
  readonly idempotencyKey: string;
  readonly leaseExpiresAt?: string;
  readonly maxAttempts: number;
  readonly providerCode?: string;
  readonly providerRef: string;
  readonly requestDigest?: string;
  readonly responseDigest?: string;
  readonly retryPosture: TaskVerificationRetryPosture;
  readonly status: TaskVerificationAttemptStatus;
  readonly taskId: string;
  readonly taskRevision: number;
  readonly taskRevisionDigest: string;
  readonly traceId: string;
  readonly transportFinishedAt?: string;
  readonly transportStartedAt?: string;
  readonly updatedAt: string;
  readonly verificationType: "ON_CHAIN" | "DAPP_API";
  readonly walletAddress: string;
  readonly walletSource: TaskVerificationIdentity["issuedSubject"]["walletSource"];
}

export interface TaskVerificationAttemptPersistenceRecord
  extends TaskVerificationAttemptSafeRecord {
  readonly finalizationDigest?: string;
  readonly leaseTokenHash?: string;
}

export interface TaskVerificationAttemptOwner {
  readonly attemptId: string;
  readonly fence: number;
}

export interface BeginTaskVerificationAttemptInput {
  identity: TaskVerificationIdentity;
  leaseDurationMs: number;
  maxAttempts?: number;
  providerRef: string;
  traceId: string;
  verificationType: "ON_CHAIN" | "DAPP_API";
}

export type BeginTaskVerificationAttemptResult =
  | {
    attempt: TaskVerificationAttemptSafeRecord;
    kind: "acquired";
    owner: TaskVerificationAttemptOwner;
  }
  | {
    attempt: TaskVerificationAttemptSafeRecord;
    kind: "existing_terminal" | "in_progress" | "recovery_required" | "blocked";
  };

export interface MarkTaskVerificationTransportStartedInput {
  owner: TaskVerificationAttemptOwner;
  requestDigest: string;
  traceId: string;
}

export type MarkTaskVerificationTransportStartedResult = {
  attempt: TaskVerificationAttemptSafeRecord;
  kind:
    | "marked"
    | "already_marked_same_owner"
    | "stale_owner"
    | "terminal"
    | "conflict";
};

export interface TaskVerificationAttemptFinalizeWrite {
  completion: CampaignDbTaskCompletion;
  evidence: CampaignDbTaskEvidenceRecord;
  participant: CampaignDbParticipantRecord;
}

export interface TaskVerificationAttemptFinalizeWriteResult {
  completion: CampaignDbTaskCompletion;
  evidence: CampaignDbTaskEvidenceRecord;
  participant: CampaignDbParticipantRecord;
}

export interface FinalizeTaskVerificationAttemptInput {
  completedAt: string;
  owner: TaskVerificationAttemptOwner;
  providerCode: string;
  responseDigest: string;
  retryPosture: TaskVerificationRetryPosture;
  traceId: string;
  transition: TaskVerificationTransition;
  write?: TaskVerificationAttemptFinalizeWrite;
}

export type FinalizeTaskVerificationAttemptResult = {
  attempt: TaskVerificationAttemptSafeRecord;
  kind:
    | "committed"
    | "terminal_replay"
    | "stale_owner"
    | "conflict"
    | "blocked";
  writeResult?: TaskVerificationAttemptFinalizeWriteResult;
};

export interface TaskVerificationAttemptOperationContext {
  traceId: string;
}

export interface TaskVerificationAttemptStore {
  begin(input: BeginTaskVerificationAttemptInput): Promise<BeginTaskVerificationAttemptResult>;
  close(): Promise<void>;
  finalize(
    input: FinalizeTaskVerificationAttemptInput,
  ): Promise<FinalizeTaskVerificationAttemptResult>;
  get(
    attemptId: string,
    context: TaskVerificationAttemptOperationContext,
  ): Promise<TaskVerificationAttemptSafeRecord | undefined>;
  markTransportStarted(
    input: MarkTaskVerificationTransportStartedInput,
  ): Promise<MarkTaskVerificationTransportStartedResult>;
}

export interface CreateMemoryTaskVerificationAttemptStoreOptions {
  attemptId?: () => string;
  initialRecords?: readonly TaskVerificationAttemptPersistenceRecord[];
  now?: () => string;
  ownerToken?: () => string;
  persistFinalization?: (
    write: TaskVerificationAttemptFinalizeWrite,
    records: readonly TaskVerificationAttemptPersistenceRecord[],
  ) => Promise<TaskVerificationAttemptFinalizeWriteResult>;
  persistRecords?: (
    records: readonly TaskVerificationAttemptPersistenceRecord[],
  ) => Promise<void>;
}

export interface MemoryTaskVerificationAttemptStore extends TaskVerificationAttemptStore {
  activeOperationCount(): number;
  exportPersistenceRecords(): TaskVerificationAttemptPersistenceRecord[];
  listSafe(): Promise<TaskVerificationAttemptSafeRecord[]>;
}

interface OwnerSecret {
  attemptId: string;
  fence: number;
  token: string;
}

const ATTEMPT_STATUSES = [
  "requested",
  "running",
  "pending",
  "completed",
  "failed",
  "manual_review",
] as const satisfies readonly TaskVerificationAttemptStatus[];
const VERIFICATION_TYPES = ["ON_CHAIN", "DAPP_API"] as const;
const ACCOUNT_TYPES = ["AA", "EOA", "UNKNOWN"] as const;
const WALLET_SOURCES = [
  "PORTKEY_AA",
  "PORTKEY_EOA_APP",
  "PORTKEY_EOA_EXTENSION",
  "NIGHTELF",
  "AGENT_SKILL",
  "OTHER",
] as const;
const EVIDENCE_SOURCES = ["AEFINDER", "AELFSCAN", "DAPP_API"] as const;
const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const SAFE_WALLET_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const SAFE_PROVIDER_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,63}$/;
const SAFE_DIAGNOSTIC_PATTERN = /^[A-Z][A-Z0-9_]{0,63}$/;
const SHA_256_PATTERN = /^[a-f0-9]{64}$/;
const TRACE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;
const MAX_LEASE_DURATION_MS = 5 * 60_000;
const PERSISTENCE_FIELDS = [
  "accountType",
  "attemptCount",
  "bindingId",
  "bindingRevision",
  "campaignId",
  "completedAt",
  "createdAt",
  "diagnosticCodes",
  "dispatchState",
  "evidenceHash",
  "evidenceRef",
  "evidenceRuleDigest",
  "evidenceSource",
  "externalDispatchLimit",
  "fence",
  "finalizationDigest",
  "id",
  "idempotencyKey",
  "leaseExpiresAt",
  "leaseTokenHash",
  "maxAttempts",
  "providerCode",
  "providerRef",
  "requestDigest",
  "responseDigest",
  "retryPosture",
  "status",
  "taskId",
  "taskRevision",
  "taskRevisionDigest",
  "traceId",
  "transportFinishedAt",
  "transportStartedAt",
  "updatedAt",
  "verificationType",
  "walletAddress",
  "walletSource",
] as const;

const safeContext = (value: unknown, fallback: string, maximum: number) =>
  typeof value === "string"
  && value.length > 0
  && value.length <= maximum
  && !CONTROL_CHARACTER_PATTERN.test(value)
    ? value
    : fallback;

const fail = (
  code: TaskVerificationAttemptStoreErrorCode,
  field: string,
  traceId: string,
): never => {
  throw new TaskVerificationAttemptStoreError({ code, field, traceId });
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const assertExactRecord = (
  value: unknown,
  allowedFields: readonly string[],
  field: string,
  traceId: string,
) => {
  if (!isPlainRecord(value)) {
    return fail("TASK_VERIFICATION_ATTEMPT_INPUT_INVALID", field, traceId);
  }
  const allowed = new Set(allowedFields);
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    return fail("TASK_VERIFICATION_ATTEMPT_INPUT_INVALID", field, traceId);
  }
  return value;
};

const assertString = (
  value: unknown,
  field: string,
  traceId: string,
  maximum: number,
  pattern: RegExp = SAFE_IDENTIFIER_PATTERN,
) => {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length > maximum
    || value !== value.trim()
    || CONTROL_CHARACTER_PATTERN.test(value)
    || !pattern.test(value)
  ) {
    return fail("TASK_VERIFICATION_ATTEMPT_INPUT_INVALID", field, traceId);
  }
  return value;
};

const assertDigest = (value: unknown, field: string, traceId: string) =>
  assertString(value, field, traceId, 64, SHA_256_PATTERN);

const assertTimestamp = (value: unknown, field: string, traceId: string) => {
  if (
    typeof value !== "string"
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    || Number.isNaN(Date.parse(value))
  ) {
    return fail("TASK_VERIFICATION_ATTEMPT_INPUT_INVALID", field, traceId);
  }
  return value;
};

const assertPositiveInteger = (
  value: unknown,
  field: string,
  traceId: string,
  maximum = Number.MAX_SAFE_INTEGER,
) => {
  if (!Number.isSafeInteger(value) || (value as number) < 1 || (value as number) > maximum) {
    return fail("TASK_VERIFICATION_ATTEMPT_INPUT_INVALID", field, traceId);
  }
  return value as number;
};

const assertEnum = <TValue extends string>(
  value: unknown,
  values: readonly TValue[],
  field: string,
  traceId: string,
): TValue => values.includes(value as TValue)
  ? value as TValue
  : fail("TASK_VERIFICATION_ATTEMPT_INPUT_INVALID", field, traceId);

const assertOptional = <TValue>(
  value: unknown,
  assertion: (value: unknown) => TValue,
): TValue | undefined => value === undefined ? undefined : assertion(value);

const assertDiagnosticCodes = (value: unknown, traceId: string) => {
  if (
    !Array.isArray(value)
    || value.length > 16
    || value.some((entry) => typeof entry !== "string" || !SAFE_DIAGNOSTIC_PATTERN.test(entry))
    || new Set(value).size !== value.length
  ) {
    return fail("TASK_VERIFICATION_ATTEMPT_INPUT_INVALID", "diagnosticCodes", traceId);
  }
  return Object.freeze([...value].sort()) as readonly string[];
};

const hashToken = (token: string) => createHash("sha256")
  .update("campaign-os/task-verification-owner/v1\0", "utf8")
  .update(token, "utf8")
  .digest("hex");

const canonicalDigest = (value: unknown) => createHash("sha256")
  .update("campaign-os/task-verification-finalization/v1\0", "utf8")
  .update(JSON.stringify(value), "utf8")
  .digest("hex");

export const deriveTaskVerificationFinalizationDigest = (
  input: FinalizeTaskVerificationAttemptInput,
) => canonicalDigest({
  completedAt: input.completedAt,
  providerCode: input.providerCode,
  responseDigest: input.responseDigest,
  retryPosture: input.retryPosture,
  transition: {
    bindingEnabled: input.transition.bindingEnabled,
    diagnosticCodes: [...input.transition.diagnosticCodes],
    evidence: input.transition.evidence
      ? {
        diagnosticCodes: [...input.transition.evidence.diagnosticCodes],
        evidenceHash: input.transition.evidence.evidenceHash,
        evidenceRef: input.transition.evidence.evidenceRef,
        evidenceSource: input.transition.evidence.evidenceSource,
      }
      : null,
    positiveMatch: input.transition.positiveMatch,
    previousStatus: input.transition.previousStatus,
    status: input.transition.status,
    terminal: input.transition.terminal,
    transportExecuted: input.transition.transportExecuted,
  },
  write: input.write
    ? {
      completion: {
        accountType: input.write.completion.accountType,
        campaignId: input.write.completion.campaignId,
        completedAt: input.write.completion.completedAt ?? null,
        createdAt: input.write.completion.createdAt,
        evidenceHash: input.write.completion.evidenceHash ?? null,
        evidenceId: input.write.completion.evidenceId ?? null,
        evidenceSource: input.write.completion.evidenceSource,
        id: input.write.completion.id,
        pointsAwarded: input.write.completion.pointsAwarded,
        status: input.write.completion.status,
        taskId: input.write.completion.taskId,
        updatedAt: input.write.completion.updatedAt,
        verificationAttemptId: input.write.completion.verificationAttemptId ?? null,
        walletAddress: input.write.completion.walletAddress,
        walletSource: input.write.completion.walletSource,
      },
      evidence: {
        accountType: input.write.evidence.accountType,
        campaignId: input.write.evidence.campaignId,
        capturedAt: input.write.evidence.capturedAt,
        completionId: input.write.evidence.completionId ?? null,
        createdAt: input.write.evidence.createdAt,
        diagnosticCodes: [...input.write.evidence.diagnosticCodes],
        evidenceHash: input.write.evidence.evidenceHash,
        evidenceRef: input.write.evidence.evidenceRef ?? null,
        evidenceSource: input.write.evidence.evidenceSource,
        id: input.write.evidence.id,
        liveContractExecuted: input.write.evidence.liveContractExecuted,
        liveProviderExecuted: input.write.evidence.liveProviderExecuted,
        liveRewardExecuted: input.write.evidence.liveRewardExecuted,
        liveStorageExecuted: input.write.evidence.liveStorageExecuted,
        pointsAwarded: input.write.evidence.pointsAwarded,
        status: input.write.evidence.status,
        taskId: input.write.evidence.taskId,
        updatedAt: input.write.evidence.updatedAt,
        verificationAttemptId: input.write.evidence.verificationAttemptId ?? null,
        walletAddress: input.write.evidence.walletAddress,
        walletSource: input.write.evidence.walletSource,
      },
      participant: {
        accountType: input.write.participant.accountType,
        campaignId: input.write.participant.campaignId,
        createdAt: input.write.participant.createdAt,
        id: input.write.participant.id,
        localePreference: input.write.participant.localePreference,
        rank: input.write.participant.rank ?? null,
        riskFlags: [...input.write.participant.riskFlags],
        totalPoints: input.write.participant.totalPoints,
        updatedAt: input.write.participant.updatedAt,
        walletAddress: input.write.participant.walletAddress,
        walletSignatureStatus: input.write.participant.walletSignatureStatus,
        walletSource: input.write.participant.walletSource,
        walletTypeVerified: input.write.participant.walletTypeVerified,
        walletVerifiedAt: input.write.participant.walletVerifiedAt ?? null,
      },
    }
    : null,
});

const clone = <TValue>(value: TValue): TValue => structuredClone(value);

const toSafeRecord = (
  record: TaskVerificationAttemptPersistenceRecord,
): TaskVerificationAttemptSafeRecord => {
  const { finalizationDigest: _finalizationDigest, leaseTokenHash: _leaseTokenHash, ...safe } = record;
  return Object.freeze(clone(safe));
};

const validatePersistenceRecord = (
  value: unknown,
  traceId = "attempt-codec",
): TaskVerificationAttemptPersistenceRecord => {
  const record = assertExactRecord(value, PERSISTENCE_FIELDS, "record", traceId);
  const validatedTraceId = assertString(
    record.traceId,
    "traceId",
    traceId,
    128,
    TRACE_ID_PATTERN,
  );
  const status = assertEnum(record.status, ATTEMPT_STATUSES, "status", validatedTraceId);
  const dispatchState = assertEnum(
    record.dispatchState,
    taskVerificationDispatchStates,
    "dispatchState",
    validatedTraceId,
  );
  const retryPosture = assertEnum(
    record.retryPosture,
    taskVerificationRetryPostures,
    "retryPosture",
    validatedTraceId,
  );
  const attemptCount = assertPositiveInteger(record.attemptCount, "attemptCount", validatedTraceId, 3);
  const maxAttempts = assertPositiveInteger(record.maxAttempts, "maxAttempts", validatedTraceId, 3);
  const fence = assertPositiveInteger(record.fence, "fence", validatedTraceId);
  const createdAt = assertTimestamp(record.createdAt, "createdAt", validatedTraceId);
  const updatedAt = assertTimestamp(record.updatedAt, "updatedAt", validatedTraceId);
  const leaseTokenHash = assertOptional(record.leaseTokenHash, (entry) =>
    assertDigest(entry, "leaseTokenHash", validatedTraceId));
  const leaseExpiresAt = assertOptional(record.leaseExpiresAt, (entry) =>
    assertTimestamp(entry, "leaseExpiresAt", validatedTraceId));
  const transportStartedAt = assertOptional(record.transportStartedAt, (entry) =>
    assertTimestamp(entry, "transportStartedAt", validatedTraceId));
  const transportFinishedAt = assertOptional(record.transportFinishedAt, (entry) =>
    assertTimestamp(entry, "transportFinishedAt", validatedTraceId));
  const completedAt = assertOptional(record.completedAt, (entry) =>
    assertTimestamp(entry, "completedAt", validatedTraceId));
  const requestDigest = assertOptional(record.requestDigest, (entry) =>
    assertDigest(entry, "requestDigest", validatedTraceId));
  const responseDigest = assertOptional(record.responseDigest, (entry) =>
    assertDigest(entry, "responseDigest", validatedTraceId));
  const finalizationDigest = assertOptional(record.finalizationDigest, (entry) =>
    assertDigest(entry, "finalizationDigest", validatedTraceId));
  const evidenceHash = assertOptional(record.evidenceHash, (entry) =>
    assertDigest(entry, "evidenceHash", validatedTraceId));
  const evidenceRef = assertOptional(record.evidenceRef, (entry) =>
    assertString(entry, "evidenceRef", validatedTraceId, 256));
  const evidenceSource = assertOptional(record.evidenceSource, (entry) =>
    assertEnum(entry, EVIDENCE_SOURCES, "evidenceSource", validatedTraceId));
  const providerCode = assertOptional(record.providerCode, (entry) =>
    assertString(entry, "providerCode", validatedTraceId, 64, SAFE_PROVIDER_CODE_PATTERN));
  const stateCombinationValid = (
    status === "running"
    && (dispatchState === "not_started" || dispatchState === "started")
    && retryPosture === "none"
  ) || (
    status === "requested"
    && dispatchState === "not_started"
    && retryPosture === "none"
  ) || (
    status === "manual_review"
    && dispatchState === "not_started"
    && retryPosture === "blocked"
  ) || (
    status === "manual_review"
    && dispatchState === "started"
    && retryPosture === "manual_review"
  ) || (
    ["pending", "completed", "failed", "manual_review"].includes(status)
    && dispatchState === "result_observed"
  );

  if (
    attemptCount > maxAttempts
    || Date.parse(updatedAt) < Date.parse(createdAt)
    || record.externalDispatchLimit !== TASK_VERIFICATION_EXTERNAL_DISPATCH_LIMIT
    || !stateCombinationValid
    || (dispatchState === "not_started" && (
      requestDigest
      || responseDigest
      || providerCode
      || finalizationDigest
      || transportStartedAt
      || transportFinishedAt
      || completedAt
    ))
    || (dispatchState === "started" && (
      !requestDigest
      || responseDigest
      || providerCode
      || finalizationDigest
      || !transportStartedAt
      || transportFinishedAt
      || completedAt
    ))
    || (dispatchState === "result_observed"
      && (
        status === "running"
        || !requestDigest
        || !responseDigest
        || !providerCode
        || !finalizationDigest
        || !transportStartedAt
        || !transportFinishedAt
        || !completedAt
      ))
    || ((status === "running") !== Boolean(leaseTokenHash && leaseExpiresAt))
    || (status === "completed"
      && (!completedAt || !evidenceHash || !evidenceRef || !evidenceSource || !finalizationDigest))
    || (status !== "completed" && (evidenceHash || evidenceRef || evidenceSource))
  ) {
    return fail("TASK_VERIFICATION_ATTEMPT_INPUT_INVALID", "record", validatedTraceId);
  }

  return Object.freeze({
    accountType: assertEnum(record.accountType, ACCOUNT_TYPES, "accountType", validatedTraceId),
    attemptCount,
    bindingId: assertString(record.bindingId, "bindingId", validatedTraceId, 160),
    bindingRevision: assertPositiveInteger(
      record.bindingRevision,
      "bindingRevision",
      validatedTraceId,
      2_147_483_647,
    ),
    campaignId: assertString(record.campaignId, "campaignId", validatedTraceId, 160),
    ...(completedAt ? { completedAt } : {}),
    createdAt,
    diagnosticCodes: assertDiagnosticCodes(record.diagnosticCodes, validatedTraceId),
    dispatchState,
    ...(evidenceHash ? { evidenceHash } : {}),
    ...(evidenceRef ? { evidenceRef } : {}),
    evidenceRuleDigest: assertDigest(
      record.evidenceRuleDigest,
      "evidenceRuleDigest",
      validatedTraceId,
    ),
    ...(evidenceSource ? { evidenceSource } : {}),
    externalDispatchLimit: TASK_VERIFICATION_EXTERNAL_DISPATCH_LIMIT,
    fence,
    ...(finalizationDigest ? { finalizationDigest } : {}),
    id: assertString(record.id, "id", validatedTraceId, 160),
    idempotencyKey: assertDigest(record.idempotencyKey, "idempotencyKey", validatedTraceId),
    ...(leaseExpiresAt ? { leaseExpiresAt } : {}),
    ...(leaseTokenHash ? { leaseTokenHash } : {}),
    maxAttempts,
    ...(providerCode ? { providerCode } : {}),
    providerRef: assertString(record.providerRef, "providerRef", validatedTraceId, 160),
    ...(requestDigest ? { requestDigest } : {}),
    ...(responseDigest ? { responseDigest } : {}),
    retryPosture,
    status,
    taskId: assertString(record.taskId, "taskId", validatedTraceId, 160),
    taskRevision: assertPositiveInteger(
      record.taskRevision,
      "taskRevision",
      validatedTraceId,
      2_147_483_647,
    ),
    taskRevisionDigest: assertDigest(
      record.taskRevisionDigest,
      "taskRevisionDigest",
      validatedTraceId,
    ),
    traceId: validatedTraceId,
    ...(transportFinishedAt ? { transportFinishedAt } : {}),
    ...(transportStartedAt ? { transportStartedAt } : {}),
    updatedAt,
    verificationType: assertEnum(
      record.verificationType,
      VERIFICATION_TYPES,
      "verificationType",
      validatedTraceId,
    ),
    walletAddress: assertString(
      record.walletAddress,
      "walletAddress",
      validatedTraceId,
      192,
      SAFE_WALLET_PATTERN,
    ),
    walletSource: assertEnum(record.walletSource, WALLET_SOURCES, "walletSource", validatedTraceId),
  });
};

export const encodeTaskVerificationAttemptRecords = (
  records: readonly TaskVerificationAttemptPersistenceRecord[],
): string => JSON.stringify(
  records.map((record) => validatePersistenceRecord(record)).sort((left, right) =>
    left.id.localeCompare(right.id)),
);

export const decodeTaskVerificationAttemptRecords = (
  encoded: string,
): TaskVerificationAttemptPersistenceRecord[] => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(encoded) as unknown;
  } catch {
    return fail("TASK_VERIFICATION_ATTEMPT_INPUT_INVALID", "records", "attempt-codec");
  }
  if (!Array.isArray(parsed) || parsed.length > 10_000) {
    return fail("TASK_VERIFICATION_ATTEMPT_INPUT_INVALID", "records", "attempt-codec");
  }
  const records = parsed.map((record) => validatePersistenceRecord(record));
  const ids = new Set<string>();
  const idempotencyKeys = new Set<string>();
  for (const record of records) {
    if (ids.has(record.id) || idempotencyKeys.has(record.idempotencyKey)) {
      return fail("TASK_VERIFICATION_ATTEMPT_INPUT_INVALID", "records", record.traceId);
    }
    ids.add(record.id);
    idempotencyKeys.add(record.idempotencyKey);
  }
  return records;
};

const traceIdFrom = (value: unknown) => {
  if (isPlainRecord(value) && typeof value.traceId === "string") {
    return safeContext(value.traceId, "trace-unavailable", 128);
  }
  return "trace-unavailable";
};

const validateBeginInput = (input: BeginTaskVerificationAttemptInput) => {
  const traceId = traceIdFrom(input);
  if (!isPlainRecord(input) || !isServerIssuedTaskVerificationIdentity(input.identity)) {
    return fail("TASK_VERIFICATION_ATTEMPT_INPUT_INVALID", "identity", traceId);
  }
  const validatedTraceId = assertString(input.traceId, "traceId", traceId, 128, TRACE_ID_PATTERN);
  const leaseDurationMs = assertPositiveInteger(
    input.leaseDurationMs,
    "leaseDurationMs",
    validatedTraceId,
    MAX_LEASE_DURATION_MS,
  );
  const maxAttempts = assertPositiveInteger(
    input.maxAttempts ?? TASK_VERIFICATION_MAX_OWNERSHIP_ATTEMPTS,
    "maxAttempts",
    validatedTraceId,
    TASK_VERIFICATION_MAX_OWNERSHIP_ATTEMPTS,
  );
  const providerRef = assertString(input.providerRef, "providerRef", validatedTraceId, 160);
  const verificationType = assertEnum(
    input.verificationType,
    VERIFICATION_TYPES,
    "verificationType",
    validatedTraceId,
  );
  return { leaseDurationMs, maxAttempts, providerRef, traceId: validatedTraceId, verificationType };
};

const validateOwner = (owner: TaskVerificationAttemptOwner, traceId: string) => {
  if (!isPlainRecord(owner) || Object.keys(owner).some((key) => !["attemptId", "fence"].includes(key))) {
    return fail("TASK_VERIFICATION_ATTEMPT_INPUT_INVALID", "owner", traceId);
  }
  return {
    attemptId: assertString(owner.attemptId, "owner.attemptId", traceId, 160),
    fence: assertPositiveInteger(owner.fence, "owner.fence", traceId),
  };
};

const ownerMatches = (
  record: TaskVerificationAttemptPersistenceRecord,
  owner: TaskVerificationAttemptOwner,
  secret: OwnerSecret | undefined,
) => Boolean(
  secret
  && secret.attemptId === record.id
  && secret.fence === record.fence
  && owner.attemptId === record.id
  && owner.fence === record.fence
  && record.leaseTokenHash === hashToken(secret.token),
);

const hasObservedResult = (record: TaskVerificationAttemptPersistenceRecord) =>
  record.dispatchState === "result_observed"
  || record.status === "completed"
  || record.status === "failed"
  || record.status === "manual_review";

export const createMemoryTaskVerificationAttemptStore = ({
  attemptId = () => `verification-attempt-${randomUUID()}`,
  initialRecords = [],
  now = () => new Date().toISOString(),
  ownerToken = () => randomBytes(32).toString("hex"),
  persistFinalization,
  persistRecords = async () => undefined,
}: CreateMemoryTaskVerificationAttemptStoreOptions = {}): MemoryTaskVerificationAttemptStore => {
  let recordsById = new Map<string, TaskVerificationAttemptPersistenceRecord>();
  const idsByIdempotencyKey = new Map<string, string>();
  const ownerSecrets = new WeakMap<object, OwnerSecret>();
  const terminalWriteResults = new Map<string, TaskVerificationAttemptFinalizeWriteResult>();
  let operationTail = Promise.resolve();
  let activeOperations = 0;
  let accepting = true;
  let closePromise: Promise<void> | undefined;
  const closeWaiters = new Set<() => void>();

  for (const initialRecord of initialRecords) {
    const record = validatePersistenceRecord(initialRecord);
    if (recordsById.has(record.id) || idsByIdempotencyKey.has(record.idempotencyKey)) {
      fail("TASK_VERIFICATION_ATTEMPT_INPUT_INVALID", "initialRecords", record.traceId);
    }
    recordsById.set(record.id, record);
    idsByIdempotencyKey.set(record.idempotencyKey, record.id);
  }

  const ensureAccepting = (traceId: string) => {
    if (!accepting) {
      fail("TASK_VERIFICATION_ATTEMPT_STORE_CLOSED", "store", traceId);
    }
  };

  const runExclusive = async <TValue>(
    traceId: string,
    operation: () => Promise<TValue>,
  ): Promise<TValue> => {
    ensureAccepting(traceId);
    activeOperations += 1;
    const previous = operationTail;
    let release: () => void = () => undefined;
    operationTail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await operation();
    } finally {
      release();
      activeOperations -= 1;
      if (activeOperations === 0) {
        for (const waiter of closeWaiters) {
          waiter();
        }
        closeWaiters.clear();
      }
    }
  };

  const sortedRecords = (records = recordsById) => Array.from(records.values())
    .sort((left, right) => left.id.localeCompare(right.id));

  const commitRecords = async (
    nextRecords: Map<string, TaskVerificationAttemptPersistenceRecord>,
    traceId: string,
    finalizationWrite?: TaskVerificationAttemptFinalizeWrite,
  ) => {
    const records = sortedRecords(nextRecords);
    try {
      const writeResult = finalizationWrite && persistFinalization
        ? await persistFinalization(clone(finalizationWrite), clone(records))
        : undefined;
      if (!finalizationWrite || !persistFinalization) {
        await persistRecords(clone(records));
      }
      recordsById = nextRecords;
      return writeResult;
    } catch {
      return fail("TASK_VERIFICATION_ATTEMPT_PERSISTENCE_FAILED", "persistence", traceId);
    }
  };

  const issueOwner = (record: TaskVerificationAttemptPersistenceRecord, token: string) => {
    const owner = Object.freeze({ attemptId: record.id, fence: record.fence });
    ownerSecrets.set(owner, { attemptId: record.id, fence: record.fence, token });
    return owner;
  };

  const begin: TaskVerificationAttemptStore["begin"] = async (input) => {
    const validated = validateBeginInput(input);
    return runExclusive(validated.traceId, async () => {
      const timestamp = assertTimestamp(now(), "now", validated.traceId);
      const identity = input.identity;
      const existingId = idsByIdempotencyKey.get(identity.idempotencyKey);
      const existing = existingId ? recordsById.get(existingId) : undefined;

      if (existing) {
        if (
          existing.campaignId !== identity.campaignId
          || existing.taskId !== identity.taskId
          || existing.taskRevision !== identity.taskRevision
          || existing.taskRevisionDigest !== identity.taskRevisionDigest
          || existing.evidenceRuleDigest !== identity.evidenceRuleDigest
          || existing.walletAddress !== identity.issuedSubject.walletAddress
          || existing.accountType !== identity.issuedSubject.accountType
          || existing.walletSource !== identity.issuedSubject.walletSource
          || existing.bindingId !== identity.binding.bindingId
          || existing.bindingRevision !== identity.binding.bindingRevision
          || existing.providerRef !== validated.providerRef
          || existing.verificationType !== validated.verificationType
          || existing.maxAttempts !== validated.maxAttempts
        ) {
          return { attempt: toSafeRecord(existing), kind: "blocked" as const };
        }
        if (hasObservedResult(existing)) {
          return { attempt: toSafeRecord(existing), kind: "existing_terminal" as const };
        }
        if (Date.parse(existing.leaseExpiresAt ?? "") > Date.parse(timestamp)) {
          return { attempt: toSafeRecord(existing), kind: "in_progress" as const };
        }
        if (existing.dispatchState === "started") {
          const recovered = validatePersistenceRecord({
            ...existing,
            diagnosticCodes: ["TASK_VERIFICATION_OUTCOME_UNKNOWN"],
            leaseExpiresAt: undefined,
            leaseTokenHash: undefined,
            retryPosture: "manual_review",
            status: "manual_review",
            traceId: validated.traceId,
            updatedAt: timestamp,
          }, validated.traceId);
          const next = new Map(recordsById).set(existing.id, recovered);
          await commitRecords(next, validated.traceId);
          return { attempt: toSafeRecord(recovered), kind: "recovery_required" as const };
        }
        if (existing.attemptCount >= existing.maxAttempts) {
          const blocked = validatePersistenceRecord({
            ...existing,
            diagnosticCodes: ["TASK_VERIFICATION_ATTEMPT_BUDGET_EXHAUSTED"],
            leaseExpiresAt: undefined,
            leaseTokenHash: undefined,
            retryPosture: "blocked",
            status: "manual_review",
            traceId: validated.traceId,
            updatedAt: timestamp,
          }, validated.traceId);
          const next = new Map(recordsById).set(existing.id, blocked);
          await commitRecords(next, validated.traceId);
          return { attempt: toSafeRecord(blocked), kind: "blocked" as const };
        }
        const token = assertString(ownerToken(), "ownerToken", validated.traceId, 512);
        const reclaimed = validatePersistenceRecord({
          ...existing,
          attemptCount: existing.attemptCount + 1,
          diagnosticCodes: [],
          fence: existing.fence + 1,
          leaseExpiresAt: new Date(Date.parse(timestamp) + validated.leaseDurationMs).toISOString(),
          leaseTokenHash: hashToken(token),
          retryPosture: "none",
          status: "running",
          traceId: validated.traceId,
          updatedAt: timestamp,
        }, validated.traceId);
        const next = new Map(recordsById).set(existing.id, reclaimed);
        await commitRecords(next, validated.traceId);
        return {
          attempt: toSafeRecord(reclaimed),
          kind: "acquired" as const,
          owner: issueOwner(reclaimed, token),
        };
      }

      const id = assertString(attemptId(), "attemptId", validated.traceId, 160);
      if (recordsById.has(id)) {
        return fail("TASK_VERIFICATION_ATTEMPT_INPUT_INVALID", "attemptId", validated.traceId);
      }
      const token = assertString(ownerToken(), "ownerToken", validated.traceId, 512);
      const record = validatePersistenceRecord({
        accountType: identity.issuedSubject.accountType,
        attemptCount: 1,
        bindingId: identity.binding.bindingId,
        bindingRevision: identity.binding.bindingRevision,
        campaignId: identity.campaignId,
        createdAt: timestamp,
        diagnosticCodes: [],
        dispatchState: "not_started",
        evidenceRuleDigest: identity.evidenceRuleDigest,
        externalDispatchLimit: TASK_VERIFICATION_EXTERNAL_DISPATCH_LIMIT,
        fence: 1,
        id,
        idempotencyKey: identity.idempotencyKey,
        leaseExpiresAt: new Date(Date.parse(timestamp) + validated.leaseDurationMs).toISOString(),
        leaseTokenHash: hashToken(token),
        maxAttempts: validated.maxAttempts,
        providerRef: validated.providerRef,
        retryPosture: "none",
        status: "running",
        taskId: identity.taskId,
        taskRevision: identity.taskRevision,
        taskRevisionDigest: identity.taskRevisionDigest,
        traceId: validated.traceId,
        updatedAt: timestamp,
        verificationType: validated.verificationType,
        walletAddress: identity.issuedSubject.walletAddress,
        walletSource: identity.issuedSubject.walletSource,
      }, validated.traceId);
      const next = new Map(recordsById).set(id, record);
      await commitRecords(next, validated.traceId);
      idsByIdempotencyKey.set(identity.idempotencyKey, id);
      return { attempt: toSafeRecord(record), kind: "acquired", owner: issueOwner(record, token) };
    });
  };

  const markTransportStarted: TaskVerificationAttemptStore["markTransportStarted"] = async (input) => {
    const traceId = assertString(input.traceId, "traceId", traceIdFrom(input), 128, TRACE_ID_PATTERN);
    const owner = validateOwner(input.owner, traceId);
    const requestDigest = assertDigest(input.requestDigest, "requestDigest", traceId);
    return runExclusive(traceId, async () => {
      const existing = recordsById.get(owner.attemptId);
      if (!existing) {
        return fail("TASK_VERIFICATION_ATTEMPT_INPUT_INVALID", "owner.attemptId", traceId);
      }
      if (hasObservedResult(existing)) {
        return { attempt: toSafeRecord(existing), kind: "terminal" };
      }
      const secret = ownerSecrets.get(input.owner);
      if (!ownerMatches(existing, input.owner, secret)) {
        return { attempt: toSafeRecord(existing), kind: "stale_owner" };
      }
      if (Date.parse(existing.leaseExpiresAt ?? "") <= Date.parse(now())) {
        return { attempt: toSafeRecord(existing), kind: "stale_owner" };
      }
      if (existing.dispatchState === "started") {
        return {
          attempt: toSafeRecord(existing),
          kind: existing.requestDigest === requestDigest
            ? "already_marked_same_owner"
            : "conflict",
        };
      }
      if (existing.dispatchState !== "not_started" || existing.status !== "running") {
        return { attempt: toSafeRecord(existing), kind: "terminal" };
      }
      const timestamp = assertTimestamp(now(), "now", traceId);
      const marked = validatePersistenceRecord({
        ...existing,
        dispatchState: "started",
        requestDigest,
        traceId,
        transportStartedAt: timestamp,
        updatedAt: timestamp,
      }, traceId);
      const next = new Map(recordsById).set(existing.id, marked);
      await commitRecords(next, traceId);
      return { attempt: toSafeRecord(marked), kind: "marked" };
    });
  };

  const finalize: TaskVerificationAttemptStore["finalize"] = async (input) => {
    const traceId = assertString(input.traceId, "traceId", traceIdFrom(input), 128, TRACE_ID_PATTERN);
    const owner = validateOwner(input.owner, traceId);
    const responseDigest = assertDigest(input.responseDigest, "responseDigest", traceId);
    const providerCode = assertString(
      input.providerCode,
      "providerCode",
      traceId,
      64,
      SAFE_PROVIDER_CODE_PATTERN,
    );
    const completedAt = assertTimestamp(input.completedAt, "completedAt", traceId);
    const retryPosture = assertEnum(
      input.retryPosture,
      taskVerificationRetryPostures,
      "retryPosture",
      traceId,
    );
    if (!isServerIssuedTaskVerificationTransition(input.transition)) {
      return fail("TASK_VERIFICATION_ATTEMPT_INPUT_INVALID", "transition", traceId);
    }
    if (input.transition.traceId !== traceId) {
      return fail("TASK_VERIFICATION_ATTEMPT_INPUT_INVALID", "transition.traceId", traceId);
    }
    if (input.transition.status === "completed") {
      if (
        !input.write
        || input.write.completion.status !== "completed"
        || input.write.completion.pointsAwarded <= 0
        || input.write.evidence.status !== "completed"
        || input.write.evidence.liveProviderExecuted !== true
        || input.write.evidence.pointsAwarded !== input.write.completion.pointsAwarded
      ) {
        return fail("TASK_VERIFICATION_ATTEMPT_INPUT_INVALID", "write", traceId);
      }
    } else if (input.write) {
      return fail("TASK_VERIFICATION_ATTEMPT_INPUT_INVALID", "write", traceId);
    }
    const finalizationDigest = deriveTaskVerificationFinalizationDigest(input);

    return runExclusive(traceId, async () => {
      const existing = recordsById.get(owner.attemptId);
      if (!existing) {
        return fail("TASK_VERIFICATION_ATTEMPT_INPUT_INVALID", "owner.attemptId", traceId);
      }
      if (hasObservedResult(existing)) {
        if (existing.finalizationDigest === finalizationDigest) {
          return {
            attempt: toSafeRecord(existing),
            kind: "terminal_replay",
            ...(terminalWriteResults.get(existing.id)
              ? { writeResult: clone(terminalWriteResults.get(existing.id)!) }
              : {}),
          };
        }
        return { attempt: toSafeRecord(existing), kind: "conflict" };
      }
      if (input.transition.status === "completed") {
        const write = input.write!;
        const transitionEvidence = input.transition.evidence!;
        if (
          write.completion.campaignId !== existing.campaignId
          || write.completion.taskId !== existing.taskId
          || write.completion.walletAddress !== existing.walletAddress
          || write.completion.accountType !== existing.accountType
          || write.completion.walletSource !== existing.walletSource
          || write.completion.evidenceHash !== transitionEvidence.evidenceHash
          || write.completion.evidenceSource !== transitionEvidence.evidenceSource
          || write.completion.evidenceId !== write.evidence.id
          || (
            write.completion.verificationAttemptId !== undefined
            && write.completion.verificationAttemptId !== existing.id
          )
          || write.evidence.campaignId !== existing.campaignId
          || write.evidence.taskId !== existing.taskId
          || write.evidence.walletAddress !== existing.walletAddress
          || write.evidence.accountType !== existing.accountType
          || write.evidence.walletSource !== existing.walletSource
          || write.evidence.evidenceHash !== transitionEvidence.evidenceHash
          || write.evidence.evidenceRef !== transitionEvidence.evidenceRef
          || write.evidence.evidenceSource !== transitionEvidence.evidenceSource
          || write.evidence.completionId !== write.completion.id
          || write.evidence.pointsAwarded !== write.completion.pointsAwarded
          || (
            write.evidence.verificationAttemptId !== undefined
            && write.evidence.verificationAttemptId !== existing.id
          )
          || write.participant.campaignId !== existing.campaignId
          || write.participant.walletAddress !== existing.walletAddress
          || write.participant.accountType !== existing.accountType
          || write.participant.walletSource !== existing.walletSource
        ) {
          return fail("TASK_VERIFICATION_ATTEMPT_INPUT_INVALID", "write.identity", traceId);
        }
      }
      const secret = ownerSecrets.get(input.owner);
      if (
        !ownerMatches(existing, input.owner, secret)
        || Date.parse(existing.leaseExpiresAt ?? "") <= Date.parse(now())
      ) {
        return { attempt: toSafeRecord(existing), kind: "stale_owner" };
      }
      if (existing.dispatchState !== "started" || !existing.requestDigest) {
        return { attempt: toSafeRecord(existing), kind: "blocked" };
      }
      if (input.transition.previousStatus !== existing.status) {
        return { attempt: toSafeRecord(existing), kind: "conflict" };
      }
      const completed = input.transition.status === "completed";
      const finalized = validatePersistenceRecord({
        ...existing,
        completedAt,
        diagnosticCodes: input.transition.diagnosticCodes,
        dispatchState: "result_observed",
        ...(completed && input.transition.evidence
          ? {
            evidenceHash: input.transition.evidence.evidenceHash,
            evidenceRef: input.transition.evidence.evidenceRef,
            evidenceSource: input.transition.evidence.evidenceSource,
          }
          : {}),
        finalizationDigest,
        leaseExpiresAt: undefined,
        leaseTokenHash: undefined,
        providerCode,
        responseDigest,
        retryPosture,
        status: input.transition.status,
        traceId,
        transportFinishedAt: completedAt,
        updatedAt: completedAt,
      }, traceId);
      const next = new Map(recordsById).set(existing.id, finalized);
      const writeResult = input.write
        ? await commitRecords(next, traceId, input.write)
        : await commitRecords(next, traceId);
      if (writeResult) {
        terminalWriteResults.set(existing.id, clone(writeResult));
      }
      return {
        attempt: toSafeRecord(finalized),
        kind: "committed",
        ...(writeResult ? { writeResult: clone(writeResult) } : {}),
      };
    });
  };

  return {
    activeOperationCount: () => activeOperations,
    begin,
    close: () => {
      if (closePromise) {
        return closePromise;
      }
      accepting = false;
      closePromise = activeOperations === 0
        ? Promise.resolve()
        : new Promise<void>((resolve) => closeWaiters.add(resolve));
      return closePromise;
    },
    exportPersistenceRecords: () => clone(sortedRecords()),
    finalize,
    get: async (attemptIdValue, context) => {
      const traceId = assertString(context.traceId, "traceId", traceIdFrom(context), 128, TRACE_ID_PATTERN);
      const id = assertString(attemptIdValue, "attemptId", traceId, 160);
      return runExclusive(traceId, async () => {
        const record = recordsById.get(id);
        return record ? toSafeRecord(record) : undefined;
      });
    },
    listSafe: () => runExclusive("attempt-list", async () => sortedRecords().map(toSafeRecord)),
    markTransportStarted,
  };
};
