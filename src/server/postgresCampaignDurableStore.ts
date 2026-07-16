import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  campaignLifecycleStatuses,
  supportedLocales,
  type AccountType,
  type CampaignStatus,
  type ContractMode,
  type SupportedLocale,
  type VerificationType,
  type WalletCompatibility,
  type WalletPolicy,
  type WalletSignatureStatus,
  type WalletSource,
} from "../domain/types";
import type {
  CampaignDbDraft,
  CampaignDbParticipantRecord,
  CampaignDbReferralBindingRecord,
  CampaignDbTaskCompletion,
  CampaignDbTaskCompletionEvidenceSource,
  CampaignDbTaskCompletionStatus,
  CampaignDbTaskDraft,
  CampaignDbTaskEvidenceRecord,
} from "./campaignDbRepository";
import type {
  CampaignDurableStore,
  CampaignDurableStoreCompletionListOptions,
  CampaignDurableStoreDiagnostic,
  CampaignDurableStoreDiagnosticCode,
  CampaignDurableStoreEntityListOptions,
  CampaignDurableStoreListOptions,
  CampaignDurableStoreManifest,
  CampaignDurableStoreOperationContext,
  CampaignDurableStoreParticipantJourneySnapshot,
  CampaignDurableStoreParticipantJourneySnapshotInput,
  CampaignDurableStoreParticipantListOptions,
  CampaignDurableStoreReferralListOptions,
  CampaignDurableStoreTaskVerificationResult,
  CampaignDurableStoreTaskVerificationWrite,
} from "./campaignDurableStore";
import {
  withoutParticipantRank,
  type ParticipantRankRow,
} from "./participantJourney";
import {
  TASK_VERIFICATION_EXTERNAL_DISPATCH_LIMIT,
  createCanonicalTaskVerificationRevision,
  isServerIssuedTaskVerificationIdentity,
  isServerIssuedTaskVerificationTransition,
} from "./taskVerification";
import {
  TaskVerificationAttemptStoreError,
  decodeTaskVerificationAttemptRecords,
  deriveTaskVerificationFinalizationDigest,
  type BeginTaskVerificationAttemptInput,
  type BeginTaskVerificationAttemptResult,
  type FinalizeTaskVerificationAttemptInput,
  type FinalizeTaskVerificationAttemptResult,
  type MarkTaskVerificationTransportStartedInput,
  type MarkTaskVerificationTransportStartedResult,
  type TaskVerificationAttemptOwner,
  type TaskVerificationAttemptPersistenceRecord,
  type TaskVerificationAttemptSafeRecord,
  type TaskVerificationAttemptStore,
} from "./taskVerificationAttemptStore";

const DEFAULT_BOUNDED_LIST_LIMIT = 100;
const MAX_BOUNDED_LIST_LIMIT = 100;
const DEFAULT_SCHEMA_VERSION = "0004_live_provider_task_verification";
const TRACE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const MIGRATION_ID_PATTERN = /^\d{4}_[a-z0-9]+(?:_[a-z0-9]+)*$/;

const ACCOUNT_TYPES = ["AA", "EOA", "UNKNOWN"] as const satisfies readonly AccountType[];
const WALLET_SOURCES = [
  "PORTKEY_AA",
  "PORTKEY_EOA_APP",
  "PORTKEY_EOA_EXTENSION",
  "NIGHTELF",
  "AGENT_SKILL",
  "OTHER",
] as const satisfies readonly WalletSource[];
const WALLET_POLICIES = ["ANY", "AA_ONLY", "EOA_ONLY"] as const satisfies readonly WalletPolicy[];
const CONTRACT_MODES = [
  "OFF_CHAIN_MVP",
  "V2_COMPANION",
  "CONTRACT_CLAIM",
] as const satisfies readonly ContractMode[];
const VERIFICATION_TYPES = [
  "WALLET",
  "ON_CHAIN",
  "DAPP_API",
  "SOCIAL",
  "MANUAL",
] as const satisfies readonly VerificationType[];
const WALLET_COMPATIBILITIES = [
  "ANY",
  "AA_ONLY",
  "EOA_ONLY",
] as const satisfies readonly WalletCompatibility[];
const WALLET_SIGNATURE_STATUSES = [
  "signed",
  "missing",
  "not_required",
  "not_available",
] as const satisfies readonly WalletSignatureStatus[];
const COMPLETION_STATUSES = [
  "pending",
  "completed",
  "failed",
  "manual_review",
] as const satisfies readonly CampaignDbTaskCompletionStatus[];
const EVIDENCE_SOURCES = [
  "AEFINDER",
  "AELFSCAN",
  "DAPP_API",
  "SOCIAL_API",
  "MANUAL",
] as const satisfies readonly CampaignDbTaskCompletionEvidenceSource[];
const REFERRAL_STATUSES = ["pending", "qualified", "risk_review"] as const;
const LIVE_VERIFICATION_TYPES = ["ON_CHAIN", "DAPP_API"] as const;
const SHA_256_PATTERN = /^[a-f0-9]{64}$/;
const SAFE_ATTEMPT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const SAFE_PROVIDER_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,63}$/;

interface TaskVerificationRevisionExpectation {
  readonly campaignId: string;
  readonly evidenceRuleDigest: string;
  readonly taskId: string;
  readonly taskRevision: number;
  readonly taskRevisionDigest: string;
}

type TaskVerificationFinalizationWriteResult = NonNullable<
  FinalizeTaskVerificationAttemptResult["writeResult"]
>;

const taskMatchesVerificationRevision = (
  task: CampaignDbTaskDraft,
  expected: TaskVerificationRevisionExpectation,
  traceId: string,
) => {
  if (
    task.campaignId !== expected.campaignId
    || task.id !== expected.taskId
    || (task.revision ?? 1) !== expected.taskRevision
  ) {
    return false;
  }

  try {
    const canonical = createCanonicalTaskVerificationRevision({
      campaignId: task.campaignId,
      evidenceRule: task.evidenceRule,
      points: task.points,
      required: task.required,
      revision: task.revision ?? 1,
      taskId: task.id,
      traceId,
      updatedAt: task.updatedAt,
      verificationType: task.verificationType,
      walletPolicy: task.walletCompatibility,
    });
    return canonical.taskRevisionDigest === expected.taskRevisionDigest
      && canonical.evidenceRuleDigest === expected.evidenceRuleDigest;
  } catch {
    return false;
  }
};

const taskVerificationRolloverPredicate = (
  projectionTable: "campaign_os.campaign_task_completions" | "campaign_os.campaign_task_evidence",
) => `
  EXCLUDED.verification_attempt_id IS NOT NULL
  AND ${projectionTable}.verification_attempt_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM campaign_os.verification_attempts AS previous_attempt
    JOIN campaign_os.verification_attempts AS replacement_attempt
      ON replacement_attempt.id = EXCLUDED.verification_attempt_id
      AND replacement_attempt.campaign_id = EXCLUDED.campaign_id
      AND replacement_attempt.task_id = EXCLUDED.task_id
      AND replacement_attempt.wallet_address = EXCLUDED.wallet_address
    JOIN campaign_os.campaign_tasks AS current_task
      ON current_task.campaign_id = replacement_attempt.campaign_id
      AND current_task.id = replacement_attempt.task_id
      AND current_task.revision = replacement_attempt.task_revision
    WHERE previous_attempt.id = ${projectionTable}.verification_attempt_id
      AND previous_attempt.campaign_id = replacement_attempt.campaign_id
      AND previous_attempt.task_id = replacement_attempt.task_id
      AND previous_attempt.wallet_address = replacement_attempt.wallet_address
      AND previous_attempt.status = 'completed'
      AND previous_attempt.dispatch_state = 'result_observed'
      AND replacement_attempt.status = 'completed'
      AND replacement_attempt.dispatch_state = 'result_observed'
      AND replacement_attempt.task_revision > previous_attempt.task_revision
  )
`;

const CAMPAIGN_COLUMNS = `
  id,
  project_id,
  owner_address,
  status,
  default_locale,
  supported_locales,
  wallet_policy,
  contract_mode,
  goal,
  duration,
  reward_description,
  reward_disclaimer_hash,
  metadata_uri,
  metadata_hash,
  start_time,
  end_time,
  publish_readiness,
  created_at,
  updated_at
`;

const TASK_COLUMNS = `
  id,
  campaign_id,
  template_code,
  verification_type,
  wallet_compatibility,
  points,
  required,
  evidence_rule,
  created_at,
  updated_at,
  revision
`;

const PARTICIPANT_COLUMNS = `
  id,
  campaign_id,
  wallet_address,
  account_type,
  wallet_source,
  wallet_type_verified,
  wallet_signature_status,
  wallet_verified_at,
  locale_preference,
  total_points,
  rank,
  risk_flags,
  created_at,
  updated_at
`;

const PARTICIPANT_RANK_COLUMNS = `
  campaign_id,
  created_at,
  id,
  total_points,
  wallet_address
`;

const COMPLETION_COLUMNS = `
  id,
  campaign_id,
  task_id,
  wallet_address,
  account_type,
  wallet_source,
  status,
  evidence_source,
  evidence_id,
  evidence_hash,
  points_awarded,
  completed_at,
  created_at,
  updated_at,
  verification_attempt_id
`;

const EVIDENCE_COLUMNS = `
  id,
  campaign_id,
  task_id,
  wallet_address,
  completion_id,
  account_type,
  wallet_source,
  status,
  evidence_source,
  evidence_hash,
  evidence_ref,
  diagnostic_codes,
  points_awarded,
  captured_at,
  live_contract_executed,
  live_provider_executed,
  live_reward_executed,
  live_storage_executed,
  created_at,
  updated_at,
  verification_attempt_id
`;

const REFERRAL_COLUMNS = `
  id,
  campaign_id,
  invitee_wallet_address,
  invitee_account_type,
  invitee_wallet_source,
  referrer_wallet_address,
  referrer_account_type,
  referrer_wallet_source,
  qualified_action_completed,
  qualified_action_completed_at,
  qualified_action_evidence_hash,
  status,
  risk_flags,
  created_at,
  updated_at
`;

const VERIFICATION_ATTEMPT_COLUMNS = `
  id,
  idempotency_key,
  campaign_id,
  task_id,
  task_revision,
  wallet_address,
  account_type,
  wallet_source,
  binding_id,
  binding_revision,
  provider_ref,
  verification_type,
  task_revision_digest,
  evidence_rule_digest,
  request_digest,
  status,
  dispatch_state,
  lease_token_hash,
  lease_expires_at,
  fence,
  attempt_count,
  max_attempts,
  external_dispatch_limit,
  response_digest,
  provider_code,
  retry_posture,
  diagnostic_codes,
  trace_id,
  evidence_hash,
  evidence_ref,
  evidence_source,
  finalization_digest,
  transport_started_at,
  transport_finished_at,
  completed_at,
  created_at,
  updated_at
`;

export interface PostgresCampaignStoreQueryResult {
  rows: Array<Record<string, unknown>>;
}

export interface PostgresCampaignStoreClient {
  query(
    text: string,
    values?: unknown[],
  ): Promise<PostgresCampaignStoreQueryResult>;
  release(): void;
}

export interface PostgresCampaignStorePool {
  connect?(): Promise<PostgresCampaignStoreClient>;
  end(): Promise<void>;
  query(
    text: string,
    values?: unknown[],
  ): Promise<PostgresCampaignStoreQueryResult>;
}

export type PostgresCampaignStoreOperation =
  | "close"
  | "create"
  | "createTaskDraft"
  | "getById"
  | "getParticipant"
  | "getParticipantJourneySnapshot"
  | "getReferralBinding"
  | "beginTaskVerificationAttempt"
  | "finalizeTaskVerificationAttempt"
  | "getTaskVerificationAttempt"
  | "list"
  | "listParticipantsByCampaignId"
  | "listReferralBindingsByCampaignId"
  | "listTaskCompletionsByCampaignId"
  | "listTaskDraftsByCampaignId"
  | "listTaskEvidence"
  | "manifest"
  | "markTaskVerificationTransportStarted"
  | "reset"
  | "upsertParticipant"
  | "upsertReferralBinding"
  | "upsertTaskCompletion"
  | "upsertTaskEvidence"
  | "upsertTaskVerification";

export type PostgresCampaignStoreErrorCode = Extract<
  CampaignDurableStoreDiagnosticCode,
  `POSTGRES_CAMPAIGN_STORE_${string}`
>;

const SAFE_ERROR_MESSAGES: Record<PostgresCampaignStoreErrorCode, string> = {
  POSTGRES_CAMPAIGN_STORE_ARGUMENT_INVALID: "PostgreSQL Campaign store argument is invalid.",
  POSTGRES_CAMPAIGN_STORE_CLEANUP_FAILED: "PostgreSQL Campaign store cleanup failed.",
  POSTGRES_CAMPAIGN_STORE_CLOSED: "PostgreSQL Campaign store is closed.",
  POSTGRES_CAMPAIGN_STORE_CONFLICT: "PostgreSQL Campaign store record conflicts with existing data.",
  POSTGRES_CAMPAIGN_STORE_CONSTRAINT_FAILED: "PostgreSQL Campaign store data constraint failed.",
  POSTGRES_CAMPAIGN_STORE_QUERY_FAILED: "PostgreSQL Campaign store query failed.",
  POSTGRES_CAMPAIGN_STORE_RESET_FORBIDDEN: "PostgreSQL Campaign store reset is disabled.",
  POSTGRES_CAMPAIGN_STORE_ROW_INVALID: "PostgreSQL Campaign store returned an invalid row.",
  POSTGRES_CAMPAIGN_STORE_SCHEMA_NOT_READY: "PostgreSQL Campaign store schema is not ready.",
};

export class PostgresCampaignStoreError extends Error {
  readonly code: PostgresCampaignStoreErrorCode;
  readonly field: string;
  readonly operation: PostgresCampaignStoreOperation;
  readonly traceId: string;

  constructor(options: {
    code: PostgresCampaignStoreErrorCode;
    field: string;
    operation: PostgresCampaignStoreOperation;
    traceId: string;
  }) {
    super(SAFE_ERROR_MESSAGES[options.code]);
    this.name = "PostgresCampaignStoreError";
    this.code = options.code;
    this.field = options.field;
    this.operation = options.operation;
    this.traceId = options.traceId;
  }
}

export interface CreatePostgresCampaignDurableStoreOptions {
  allowTestReset?: boolean;
  attemptId?: () => string;
  boundedListLimit?: number;
  now?: () => string;
  ownsPool?: boolean;
  ownerToken?: () => string;
  pool: PostgresCampaignStorePool;
  schemaVersion?: string;
}

class RowDecodeError extends Error {
  constructor(readonly field: string) {
    super("PostgreSQL row field is invalid.");
    this.name = "RowDecodeError";
  }
}

type DbRow = Record<string, unknown>;

const rowError = (field: string): never => {
  throw new RowDecodeError(field);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (!isRecord(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
};

const decodeRow = (value: unknown): DbRow =>
  isPlainRecord(value) ? value : rowError("row");

const readField = (row: DbRow, field: string): unknown =>
  Object.prototype.hasOwnProperty.call(row, field) ? row[field] : rowError(field);

const decodeStringValue = (value: unknown, field: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return rowError(field);
  }

  return value;
};

const decodeString = (row: DbRow, field: string): string =>
  decodeStringValue(readField(row, field), field);

const decodeOptionalString = (row: DbRow, field: string): string | undefined => {
  const value = readField(row, field);

  return value === null ? undefined : decodeStringValue(value, field);
};

const decodeBoolean = (row: DbRow, field: string): boolean => {
  const value = readField(row, field);

  return typeof value === "boolean" ? value : rowError(field);
};

const decodeFalse = (row: DbRow, field: string): false =>
  decodeBoolean(row, field) === false ? false : rowError(field);

const decodeIntegerValue = (
  value: unknown,
  field: string,
  minimum = 0,
): number => {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) {
    return rowError(field);
  }

  return value;
};

const decodeInteger = (row: DbRow, field: string, minimum = 0): number =>
  decodeIntegerValue(readField(row, field), field, minimum);

const decodeOptionalInteger = (
  row: DbRow,
  field: string,
  minimum = 0,
): number | undefined => {
  const value = readField(row, field);

  return value === null ? undefined : decodeIntegerValue(value, field, minimum);
};

const decodeCount = (row: DbRow, field: string): number => {
  const value = readField(row, field);
  const normalized = typeof value === "number"
    ? value
    : typeof value === "string" && /^(0|[1-9]\d*)$/.test(value)
      ? Number(value)
      : Number.NaN;

  if (!Number.isSafeInteger(normalized) || normalized < 0) {
    return rowError(field);
  }

  return normalized;
};

const decodeTimestampValue = (value: unknown, field: string): string => {
  if (!(value instanceof Date) && typeof value !== "string") {
    return rowError(field);
  }

  const parsed = value instanceof Date ? value : new Date(value);

  if (!Number.isFinite(parsed.getTime())) {
    return rowError(field);
  }

  return parsed.toISOString();
};

const decodeTimestamp = (row: DbRow, field: string): string =>
  decodeTimestampValue(readField(row, field), field);

const decodeOptionalTimestamp = (row: DbRow, field: string): string | undefined => {
  const value = readField(row, field);

  return value === null ? undefined : decodeTimestampValue(value, field);
};

const decodeEnum = <T extends string>(
  row: DbRow,
  field: string,
  allowed: readonly T[],
): T => {
  const value = decodeString(row, field);

  return allowed.includes(value as T) ? value as T : rowError(field);
};

const decodeStringArrayValue = <T extends string = string>(
  value: unknown,
  field: string,
  options: {
    allowed?: readonly T[];
    maximum: number;
    minimum?: number;
  },
): T[] => {
  if (
    !Array.isArray(value) ||
    value.length < (options.minimum ?? 0) ||
    value.length > options.maximum
  ) {
    return rowError(field);
  }

  const seen = new Set<string>();
  const result: T[] = [];

  for (const entry of value) {
    if (
      typeof entry !== "string" ||
      entry.trim().length === 0 ||
      seen.has(entry) ||
      (options.allowed && !options.allowed.includes(entry as T))
    ) {
      return rowError(field);
    }

    seen.add(entry);
    result.push(entry as T);
  }

  return result;
};

const decodeStringArray = <T extends string = string>(
  row: DbRow,
  field: string,
  options: {
    allowed?: readonly T[];
    maximum: number;
    minimum?: number;
  },
): T[] => decodeStringArrayValue(readField(row, field), field, options);

const hasExactKeys = (value: Record<string, unknown>, keys: readonly string[]) => {
  const actualKeys = Object.keys(value).sort();
  const expectedKeys = [...keys].sort();

  return actualKeys.length === expectedKeys.length &&
    actualKeys.every((key, index) => key === expectedKeys[index]);
};

const decodePublishReadiness = (
  row: DbRow,
): CampaignDbDraft["publishReadiness"] => {
  const value = readField(row, "publish_readiness");

  if (!isPlainRecord(value) || !hasExactKeys(value, ["blockers", "ready", "warnings"])) {
    return rowError("publish_readiness");
  }

  if (typeof value.ready !== "boolean") {
    return rowError("publish_readiness.ready");
  }

  return {
    blockers: decodeStringArrayValue(value.blockers, "publish_readiness.blockers", { maximum: 100 }),
    ready: value.ready,
    warnings: decodeStringArrayValue(value.warnings, "publish_readiness.warnings", { maximum: 100 }),
  };
};

const decodeEvidenceRule = (row: DbRow): CampaignDbTaskDraft["evidenceRule"] => {
  const value = readField(row, "evidence_rule");

  if (!isPlainRecord(value) || Object.keys(value).length > 100) {
    return rowError("evidence_rule");
  }

  const result: CampaignDbTaskDraft["evidenceRule"] = {};

  for (const [key, entry] of Object.entries(value)) {
    if (
      key.trim().length === 0 ||
      !(
        typeof entry === "string" ||
        typeof entry === "boolean" ||
        (typeof entry === "number" && Number.isFinite(entry))
      )
    ) {
      return rowError("evidence_rule");
    }

    result[key] = entry;
  }

  return result;
};

const withOptional = <K extends string, V>(
  key: K,
  value: V | undefined,
): Partial<Record<K, V>> => value === undefined ? {} : { [key]: value } as Record<K, V>;

const mapCampaignRow = (raw: unknown): CampaignDbDraft => {
  const row = decodeRow(raw);
  const defaultLocale = decodeEnum(row, "default_locale", ["en-US"] as const);
  const supported = decodeStringArray<SupportedLocale>(row, "supported_locales", {
    allowed: supportedLocales,
    maximum: supportedLocales.length,
    minimum: 1,
  });

  if (!supported.includes(defaultLocale)) {
    return rowError("supported_locales");
  }

  const metadataHash = decodeOptionalString(row, "metadata_hash");
  const metadataUri = decodeOptionalString(row, "metadata_uri");
  const rewardDisclaimerHash = decodeOptionalString(row, "reward_disclaimer_hash");

  return {
    contractMode: decodeEnum(row, "contract_mode", CONTRACT_MODES),
    createdAt: decodeTimestamp(row, "created_at"),
    defaultLocale,
    duration: decodeString(row, "duration"),
    endTime: decodeTimestamp(row, "end_time"),
    goal: decodeString(row, "goal"),
    id: decodeString(row, "id"),
    ...withOptional("metadataHash", metadataHash),
    ...withOptional("metadataUri", metadataUri),
    ownerAddress: decodeString(row, "owner_address"),
    projectId: decodeString(row, "project_id"),
    publishReadiness: decodePublishReadiness(row),
    rewardDescription: decodeString(row, "reward_description"),
    ...withOptional("rewardDisclaimerHash", rewardDisclaimerHash),
    startTime: decodeTimestamp(row, "start_time"),
    status: decodeEnum<CampaignStatus>(row, "status", campaignLifecycleStatuses),
    supportedLocales: supported,
    updatedAt: decodeTimestamp(row, "updated_at"),
    walletPolicy: decodeEnum(row, "wallet_policy", WALLET_POLICIES),
  };
};

const mapTaskRow = (raw: unknown): CampaignDbTaskDraft => {
  const row = decodeRow(raw);

  return {
    campaignId: decodeString(row, "campaign_id"),
    createdAt: decodeTimestamp(row, "created_at"),
    evidenceRule: decodeEvidenceRule(row),
    id: decodeString(row, "id"),
    points: decodeInteger(row, "points"),
    required: decodeBoolean(row, "required"),
    revision: Object.prototype.hasOwnProperty.call(row, "revision")
      ? decodeInteger(row, "revision", 1)
      : 1,
    templateCode: decodeString(row, "template_code"),
    updatedAt: decodeTimestamp(row, "updated_at"),
    verificationType: decodeEnum(row, "verification_type", VERIFICATION_TYPES),
    walletCompatibility: decodeEnum(row, "wallet_compatibility", WALLET_COMPATIBILITIES),
  };
};

const mapParticipantRow = (raw: unknown): CampaignDbParticipantRecord => {
  const row = decodeRow(raw);
  const rank = decodeOptionalInteger(row, "rank", 1);
  const walletVerifiedAt = decodeOptionalTimestamp(row, "wallet_verified_at");

  return {
    accountType: decodeEnum(row, "account_type", ACCOUNT_TYPES),
    campaignId: decodeString(row, "campaign_id"),
    createdAt: decodeTimestamp(row, "created_at"),
    id: decodeString(row, "id"),
    localePreference: decodeEnum(row, "locale_preference", supportedLocales),
    ...withOptional("rank", rank),
    riskFlags: decodeStringArray(row, "risk_flags", { maximum: 100 }),
    totalPoints: decodeInteger(row, "total_points"),
    updatedAt: decodeTimestamp(row, "updated_at"),
    walletAddress: decodeString(row, "wallet_address"),
    walletSignatureStatus: decodeEnum(row, "wallet_signature_status", WALLET_SIGNATURE_STATUSES),
    walletSource: decodeEnum(row, "wallet_source", WALLET_SOURCES),
    walletTypeVerified: decodeBoolean(row, "wallet_type_verified"),
    ...withOptional("walletVerifiedAt", walletVerifiedAt),
  };
};

const mapParticipantRankRow = (raw: unknown): ParticipantRankRow => {
  const row = decodeRow(raw);

  return {
    campaignId: decodeString(row, "campaign_id"),
    createdAt: decodeTimestamp(row, "created_at"),
    id: decodeString(row, "id"),
    totalPoints: decodeInteger(row, "total_points"),
    walletAddress: decodeString(row, "wallet_address"),
  };
};

const mapCompletionRow = (raw: unknown): CampaignDbTaskCompletion => {
  const row = decodeRow(raw);
  const completedAt = decodeOptionalTimestamp(row, "completed_at");
  const evidenceHash = decodeOptionalString(row, "evidence_hash");
  const evidenceId = decodeOptionalString(row, "evidence_id");
  const status = decodeEnum(row, "status", COMPLETION_STATUSES);
  const verificationAttemptId = Object.prototype.hasOwnProperty.call(row, "verification_attempt_id")
    ? decodeOptionalString(row, "verification_attempt_id")
    : undefined;

  if (status === "completed" && completedAt === undefined) {
    return rowError("completed_at");
  }

  return {
    accountType: decodeEnum(row, "account_type", ACCOUNT_TYPES),
    campaignId: decodeString(row, "campaign_id"),
    ...withOptional("completedAt", completedAt),
    createdAt: decodeTimestamp(row, "created_at"),
    ...withOptional("evidenceHash", evidenceHash),
    ...withOptional("evidenceId", evidenceId),
    evidenceSource: decodeEnum(row, "evidence_source", EVIDENCE_SOURCES),
    id: decodeString(row, "id"),
    pointsAwarded: decodeInteger(row, "points_awarded"),
    status,
    taskId: decodeString(row, "task_id"),
    updatedAt: decodeTimestamp(row, "updated_at"),
    ...withOptional("verificationAttemptId", verificationAttemptId),
    walletAddress: decodeString(row, "wallet_address"),
    walletSource: decodeEnum(row, "wallet_source", WALLET_SOURCES),
  };
};

const mapEvidenceRow = (raw: unknown): CampaignDbTaskEvidenceRecord => {
  const row = decodeRow(raw);
  const completionId = decodeOptionalString(row, "completion_id");
  const evidenceRef = decodeOptionalString(row, "evidence_ref");
  const verificationAttemptId = Object.prototype.hasOwnProperty.call(row, "verification_attempt_id")
    ? decodeOptionalString(row, "verification_attempt_id")
    : undefined;

  return {
    accountType: decodeEnum(row, "account_type", ACCOUNT_TYPES),
    campaignId: decodeString(row, "campaign_id"),
    capturedAt: decodeTimestamp(row, "captured_at"),
    ...withOptional("completionId", completionId),
    createdAt: decodeTimestamp(row, "created_at"),
    diagnosticCodes: decodeStringArray(row, "diagnostic_codes", { maximum: 100 }),
    evidenceHash: decodeString(row, "evidence_hash"),
    ...withOptional("evidenceRef", evidenceRef),
    evidenceSource: decodeEnum(row, "evidence_source", EVIDENCE_SOURCES),
    id: decodeString(row, "id"),
    liveContractExecuted: decodeFalse(row, "live_contract_executed"),
    liveProviderExecuted: decodeBoolean(row, "live_provider_executed"),
    liveRewardExecuted: decodeFalse(row, "live_reward_executed"),
    liveStorageExecuted: decodeFalse(row, "live_storage_executed"),
    pointsAwarded: decodeInteger(row, "points_awarded"),
    status: decodeEnum(row, "status", COMPLETION_STATUSES),
    taskId: decodeString(row, "task_id"),
    updatedAt: decodeTimestamp(row, "updated_at"),
    ...withOptional("verificationAttemptId", verificationAttemptId),
    walletAddress: decodeString(row, "wallet_address"),
    walletSource: decodeEnum(row, "wallet_source", WALLET_SOURCES),
  };
};

const mapVerificationAttemptFinalizationResultRow = (
  raw: unknown,
): TaskVerificationFinalizationWriteResult => {
  const row = decodeRow(raw);

  return {
    completion: mapCompletionRow(readField(row, "completion_snapshot")),
    evidence: mapEvidenceRow(readField(row, "evidence_snapshot")),
    participant: withoutParticipantRank(mapParticipantRow(readField(row, "participant_snapshot"))),
  };
};

const mapVerificationAttemptRow = (raw: unknown): TaskVerificationAttemptPersistenceRecord => {
  const row = decodeRow(raw);

  try {
    const record = {
      accountType: decodeString(row, "account_type"),
      attemptCount: decodeInteger(row, "attempt_count", 1),
      bindingId: decodeString(row, "binding_id"),
      bindingRevision: decodeInteger(row, "binding_revision", 1),
      campaignId: decodeString(row, "campaign_id"),
      ...withOptional("completedAt", decodeOptionalTimestamp(row, "completed_at")),
      createdAt: decodeTimestamp(row, "created_at"),
      diagnosticCodes: decodeStringArray(row, "diagnostic_codes", { maximum: 16 }),
      dispatchState: decodeString(row, "dispatch_state"),
      ...withOptional("evidenceHash", decodeOptionalString(row, "evidence_hash")),
      ...withOptional("evidenceRef", decodeOptionalString(row, "evidence_ref")),
      evidenceRuleDigest: decodeString(row, "evidence_rule_digest"),
      ...withOptional("evidenceSource", decodeOptionalString(row, "evidence_source")),
      externalDispatchLimit: decodeInteger(row, "external_dispatch_limit", 1),
      fence: decodeCount(row, "fence"),
      ...withOptional("finalizationDigest", decodeOptionalString(row, "finalization_digest")),
      id: decodeString(row, "id"),
      idempotencyKey: decodeString(row, "idempotency_key"),
      ...withOptional("leaseExpiresAt", decodeOptionalTimestamp(row, "lease_expires_at")),
      ...withOptional("leaseTokenHash", decodeOptionalString(row, "lease_token_hash")),
      maxAttempts: decodeInteger(row, "max_attempts", 1),
      ...withOptional("providerCode", decodeOptionalString(row, "provider_code")),
      providerRef: decodeString(row, "provider_ref"),
      ...withOptional("requestDigest", decodeOptionalString(row, "request_digest")),
      ...withOptional("responseDigest", decodeOptionalString(row, "response_digest")),
      retryPosture: decodeString(row, "retry_posture"),
      status: decodeString(row, "status"),
      taskId: decodeString(row, "task_id"),
      taskRevision: decodeInteger(row, "task_revision", 1),
      taskRevisionDigest: decodeString(row, "task_revision_digest"),
      traceId: decodeString(row, "trace_id"),
      ...withOptional(
        "transportFinishedAt",
        decodeOptionalTimestamp(row, "transport_finished_at"),
      ),
      ...withOptional(
        "transportStartedAt",
        decodeOptionalTimestamp(row, "transport_started_at"),
      ),
      updatedAt: decodeTimestamp(row, "updated_at"),
      verificationType: decodeString(row, "verification_type"),
      walletAddress: decodeString(row, "wallet_address"),
      walletSource: decodeString(row, "wallet_source"),
    };

    return decodeTaskVerificationAttemptRecords(JSON.stringify([record]))[0]
      ?? rowError("verification_attempt");
  } catch {
    return rowError("verification_attempt");
  }
};

const toSafeVerificationAttempt = (
  record: TaskVerificationAttemptPersistenceRecord,
): TaskVerificationAttemptSafeRecord => {
  const { finalizationDigest: _finalizationDigest, leaseTokenHash: _leaseTokenHash, ...safe } = record;
  return Object.freeze(structuredClone(safe));
};

const attemptStoreInputError = (field: string, traceId: string): never => {
  throw new TaskVerificationAttemptStoreError({
    code: "TASK_VERIFICATION_ATTEMPT_INPUT_INVALID",
    field,
    traceId,
  });
};

const assertAttemptString = (
  value: unknown,
  field: string,
  traceId: string,
  pattern: RegExp = SAFE_ATTEMPT_ID_PATTERN,
) => {
  if (
    typeof value !== "string"
    || value.length === 0
    || value !== value.trim()
    || !pattern.test(value)
  ) {
    return attemptStoreInputError(field, traceId);
  }
  return value;
};

const assertAttemptTraceId = (value: unknown) => {
  const fallback = typeof value === "string" ? value : "trace-unavailable";
  return assertAttemptString(value, "traceId", fallback, TRACE_ID_PATTERN);
};

const assertAttemptPositiveInteger = (
  value: unknown,
  field: string,
  traceId: string,
  maximum: number,
) => {
  if (!Number.isSafeInteger(value) || (value as number) < 1 || (value as number) > maximum) {
    return attemptStoreInputError(field, traceId);
  }
  return value as number;
};

const hashAttemptOwnerToken = (token: string) => createHash("sha256")
  .update("campaign-os/task-verification-owner/v1\0", "utf8")
  .update(token, "utf8")
  .digest("hex");

const mapReferralRow = (raw: unknown): CampaignDbReferralBindingRecord => {
  const row = decodeRow(raw);
  const inviteeWalletAddress = decodeString(row, "invitee_wallet_address");
  const qualifiedActionCompleted = decodeBoolean(row, "qualified_action_completed");
  const qualifiedActionCompletedAt = decodeOptionalTimestamp(row, "qualified_action_completed_at");
  const qualifiedActionEvidenceHash = decodeOptionalString(row, "qualified_action_evidence_hash");
  const referrerWalletAddress = decodeString(row, "referrer_wallet_address");
  const status = decodeEnum(row, "status", REFERRAL_STATUSES);

  if (inviteeWalletAddress === referrerWalletAddress) {
    return rowError("referrer_wallet_address");
  }

  if (qualifiedActionCompleted !== (qualifiedActionCompletedAt !== undefined)) {
    return rowError("qualified_action_completed_at");
  }

  if ((status === "qualified") !== qualifiedActionCompleted) {
    return rowError("status");
  }

  return {
    campaignId: decodeString(row, "campaign_id"),
    createdAt: decodeTimestamp(row, "created_at"),
    id: decodeString(row, "id"),
    inviteeAccountType: decodeEnum(row, "invitee_account_type", ACCOUNT_TYPES),
    inviteeWalletAddress,
    inviteeWalletSource: decodeEnum(row, "invitee_wallet_source", WALLET_SOURCES),
    qualifiedActionCompleted,
    ...withOptional("qualifiedActionCompletedAt", qualifiedActionCompletedAt),
    ...withOptional("qualifiedActionEvidenceHash", qualifiedActionEvidenceHash),
    referrerAccountType: decodeEnum(row, "referrer_account_type", ACCOUNT_TYPES),
    referrerWalletAddress,
    referrerWalletSource: decodeEnum(row, "referrer_wallet_source", WALLET_SOURCES),
    riskFlags: decodeStringArray(row, "risk_flags", { maximum: 100 }),
    status,
    updatedAt: decodeTimestamp(row, "updated_at"),
  };
};

const normalizeBoundedLimit = (value: number | undefined): number => {
  if (!Number.isFinite(value ?? DEFAULT_BOUNDED_LIST_LIMIT)) {
    return DEFAULT_BOUNDED_LIST_LIMIT;
  }

  return Math.max(1, Math.min(Math.trunc(value ?? DEFAULT_BOUNDED_LIST_LIMIT), MAX_BOUNDED_LIST_LIMIT));
};

const clampListLimit = (value: number | undefined, configuredMaximum: number): number => {
  if (!Number.isFinite(value ?? configuredMaximum)) {
    return configuredMaximum;
  }

  return Math.max(1, Math.min(Math.trunc(value ?? configuredMaximum), configuredMaximum));
};

const resolveTraceId = (
  context: CampaignDurableStoreOperationContext | undefined,
  operation: PostgresCampaignStoreOperation,
): string => {
  if (context?.traceId === undefined) {
    return randomUUID();
  }

  if (!TRACE_ID_PATTERN.test(context.traceId)) {
    throw new PostgresCampaignStoreError({
      code: "POSTGRES_CAMPAIGN_STORE_ARGUMENT_INVALID",
      field: "traceId",
      operation,
      traceId: "trace-invalid",
    });
  }

  return context.traceId;
};

const readDriverCode = (error: unknown): string | undefined =>
  isRecord(error) && typeof error.code === "string" ? error.code : undefined;

const mapDriverErrorCode = (error: unknown): PostgresCampaignStoreErrorCode => {
  const code = readDriverCode(error);

  if (code === "23505") {
    return "POSTGRES_CAMPAIGN_STORE_CONFLICT";
  }

  if (code === "42P01" || code === "3F000") {
    return "POSTGRES_CAMPAIGN_STORE_SCHEMA_NOT_READY";
  }

  if (code?.startsWith("23") || code?.startsWith("22")) {
    return "POSTGRES_CAMPAIGN_STORE_CONSTRAINT_FAILED";
  }

  return "POSTGRES_CAMPAIGN_STORE_QUERY_FAILED";
};

const mapRows = <T>(
  rows: readonly unknown[],
  mapper: (row: unknown) => T,
  operation: PostgresCampaignStoreOperation,
  traceId: string,
): T[] => {
  try {
    return rows.map(mapper);
  } catch (error) {
    if (error instanceof RowDecodeError) {
      throw new PostgresCampaignStoreError({
        code: "POSTGRES_CAMPAIGN_STORE_ROW_INVALID",
        field: error.field,
        operation,
        traceId,
      });
    }

    throw error;
  }
};

const optionalOne = <T>(
  rows: readonly unknown[],
  mapper: (row: unknown) => T,
  operation: PostgresCampaignStoreOperation,
  traceId: string,
): T | undefined => {
  if (rows.length > 1) {
    throw new PostgresCampaignStoreError({
      code: "POSTGRES_CAMPAIGN_STORE_ROW_INVALID",
      field: "rowCount",
      operation,
      traceId,
    });
  }

  return rows.length === 0 ? undefined : mapRows(rows, mapper, operation, traceId)[0];
};

const requiredOne = <T>(
  rows: readonly unknown[],
  mapper: (row: unknown) => T,
  operation: PostgresCampaignStoreOperation,
  traceId: string,
): T => {
  const result = optionalOne(rows, mapper, operation, traceId);

  if (result === undefined) {
    throw new PostgresCampaignStoreError({
      code: "POSTGRES_CAMPAIGN_STORE_ROW_INVALID",
      field: "rowCount",
      operation,
      traceId,
    });
  }

  return result;
};

const schemaDiagnostic = (): CampaignDurableStoreDiagnostic => ({
  code: "POSTGRES_CAMPAIGN_STORE_SCHEMA_NOT_READY",
  field: "schemaVersion",
  message: "The expected PostgreSQL Campaign schema migration has not been applied.",
  severity: "error",
});

const encodeJsonb = (
  value: object,
  field: string,
  operation: PostgresCampaignStoreOperation,
  context?: CampaignDurableStoreOperationContext,
): string => {
  try {
    const encoded = JSON.stringify(value);

    if (typeof encoded === "string") {
      return encoded;
    }
  } catch {
    // The safe typed error below deliberately excludes the original value/error.
  }

  throw new PostgresCampaignStoreError({
    code: "POSTGRES_CAMPAIGN_STORE_ARGUMENT_INVALID",
    field,
    operation,
    traceId: resolveTraceId(context, operation),
  });
};

export const createPostgresCampaignDurableStore = ({
  allowTestReset = false,
  attemptId = () => `verification-attempt-${randomUUID()}`,
  boundedListLimit: requestedBoundedListLimit,
  now = () => new Date().toISOString(),
  ownsPool = true,
  ownerToken = () => randomBytes(32).toString("hex"),
  pool,
  schemaVersion = DEFAULT_SCHEMA_VERSION,
}: CreatePostgresCampaignDurableStoreOptions): CampaignDurableStore => {
  const boundedListLimit = normalizeBoundedLimit(requestedBoundedListLimit);
  let closed = false;
  let closing = false;
  let closePromise: Promise<void> | undefined;
  let activeAttemptTransactions = 0;
  const attemptDrainWaiters = new Set<() => void>();
  const attemptOwnerSecrets = new WeakMap<object, {
    attemptId: string;
    fence: number;
    token: string;
  }>();

  if (
    !pool ||
    typeof pool.query !== "function" ||
    typeof pool.end !== "function"
  ) {
    throw new PostgresCampaignStoreError({
      code: "POSTGRES_CAMPAIGN_STORE_ARGUMENT_INVALID",
      field: "pool",
      operation: "manifest",
      traceId: randomUUID(),
    });
  }

  if (!MIGRATION_ID_PATTERN.test(schemaVersion)) {
    throw new PostgresCampaignStoreError({
      code: "POSTGRES_CAMPAIGN_STORE_ARGUMENT_INVALID",
      field: "schemaVersion",
      operation: "manifest",
      traceId: randomUUID(),
    });
  }

  const ensureOpen = (operation: PostgresCampaignStoreOperation, traceId: string) => {
    if (closed) {
      throw new PostgresCampaignStoreError({
        code: "POSTGRES_CAMPAIGN_STORE_CLOSED",
        field: "store",
        operation,
        traceId,
      });
    }
  };

  const ensureAccepting = (operation: PostgresCampaignStoreOperation, traceId: string) => {
    if (closing) {
      throw new PostgresCampaignStoreError({
        code: "POSTGRES_CAMPAIGN_STORE_CLOSED",
        field: "store",
        operation,
        traceId,
      });
    }
    ensureOpen(operation, traceId);
  };

  const queryWith = async (
    queryable: Pick<PostgresCampaignStorePool, "query">,
    operation: PostgresCampaignStoreOperation,
    sql: string,
    values: unknown[],
    context?: CampaignDurableStoreOperationContext,
  ): Promise<{ rows: Array<Record<string, unknown>>; traceId: string }> => {
    const traceId = resolveTraceId(context, operation);
    ensureOpen(operation, traceId);

    try {
      const result = await queryable.query(sql, values);

      if (!result || !Array.isArray(result.rows)) {
        throw new RowDecodeError("rows");
      }

      return { rows: result.rows, traceId };
    } catch (error) {
      if (error instanceof PostgresCampaignStoreError) {
        throw error;
      }

      if (error instanceof RowDecodeError) {
        throw new PostgresCampaignStoreError({
          code: "POSTGRES_CAMPAIGN_STORE_ROW_INVALID",
          field: error.field,
          operation,
          traceId,
        });
      }

      throw new PostgresCampaignStoreError({
        code: mapDriverErrorCode(error),
        field: "database",
        operation,
        traceId,
      });
    }
  };

  const query = (
    operation: PostgresCampaignStoreOperation,
    sql: string,
    values: unknown[],
    context?: CampaignDurableStoreOperationContext,
  ) => {
    const traceId = resolveTraceId(context, operation);
    ensureAccepting(operation, traceId);
    return queryWith(pool, operation, sql, values, { traceId });
  };

  const close = (): Promise<void> => {
    if (closePromise) {
      return closePromise;
    }

    closing = true;
    closePromise = (async () => {
      if (activeAttemptTransactions > 0) {
        await new Promise<void>((resolve) => attemptDrainWaiters.add(resolve));
      }
      closed = true;
      if (!ownsPool) {
        return;
      }

      try {
        await pool.end();
      } catch {
        throw new PostgresCampaignStoreError({
          code: "POSTGRES_CAMPAIGN_STORE_CLEANUP_FAILED",
          field: "pool",
          operation: "close",
          traceId: randomUUID(),
        });
      }
    })();

    return closePromise;
  };

  const upsertParticipantWith = async (
    queryable: Pick<PostgresCampaignStorePool, "query">,
    participant: CampaignDbParticipantRecord,
    context?: CampaignDurableStoreOperationContext,
    operation: PostgresCampaignStoreOperation = "upsertParticipant",
  ) => {
    const conflictAssignments = operation === "finalizeTaskVerificationAttempt"
      ? `
          total_points = EXCLUDED.total_points,
          updated_at = GREATEST(
            campaign_os.campaign_participants.updated_at,
            EXCLUDED.updated_at
          )
        `
      : operation === "upsertTaskVerification"
      ? `
          account_type = EXCLUDED.account_type,
          wallet_source = EXCLUDED.wallet_source,
          wallet_type_verified = EXCLUDED.wallet_type_verified,
          total_points = EXCLUDED.total_points,
          updated_at = EXCLUDED.updated_at
        `
      : `
          account_type = EXCLUDED.account_type,
          wallet_source = EXCLUDED.wallet_source,
          wallet_type_verified = EXCLUDED.wallet_type_verified,
          wallet_signature_status = EXCLUDED.wallet_signature_status,
          wallet_verified_at = EXCLUDED.wallet_verified_at,
          locale_preference = EXCLUDED.locale_preference,
          total_points = EXCLUDED.total_points,
          risk_flags = EXCLUDED.risk_flags,
          updated_at = EXCLUDED.updated_at
        `;
    const result = await queryWith(
      queryable,
      operation,
      `
        INSERT INTO campaign_os.campaign_participants (${PARTICIPANT_COLUMNS})
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14)
        ON CONFLICT (campaign_id, wallet_address) DO UPDATE SET
          ${conflictAssignments}
        RETURNING ${PARTICIPANT_COLUMNS}
      `,
      [
        participant.id,
        participant.campaignId,
        participant.walletAddress,
        participant.accountType,
        participant.walletSource,
        participant.walletTypeVerified,
        participant.walletSignatureStatus,
        participant.walletVerifiedAt ?? null,
        participant.localePreference,
        participant.totalPoints,
        participant.rank ?? null,
        encodeJsonb(participant.riskFlags, "riskFlags", operation, context),
        participant.createdAt,
        participant.updatedAt,
      ],
      context,
    );

    return requiredOne(result.rows, mapParticipantRow, operation, result.traceId);
  };

  const upsertTaskCompletionWith = async (
    queryable: Pick<PostgresCampaignStorePool, "query">,
    completion: CampaignDbTaskCompletion,
    context?: CampaignDurableStoreOperationContext,
    operation: PostgresCampaignStoreOperation = "upsertTaskCompletion",
  ) => {
    const rolloverPredicate = operation === "finalizeTaskVerificationAttempt"
      ? `OR (${taskVerificationRolloverPredicate("campaign_os.campaign_task_completions")})`
      : "";
    const result = await queryWith(
      queryable,
      operation,
      `
        INSERT INTO campaign_os.campaign_task_completions (${COMPLETION_COLUMNS})
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (campaign_id, task_id, wallet_address) DO UPDATE SET
          account_type = EXCLUDED.account_type,
          wallet_source = EXCLUDED.wallet_source,
          status = EXCLUDED.status,
          evidence_source = EXCLUDED.evidence_source,
          evidence_id = EXCLUDED.evidence_id,
          evidence_hash = EXCLUDED.evidence_hash,
          points_awarded = EXCLUDED.points_awarded,
          completed_at = EXCLUDED.completed_at,
          verification_attempt_id = EXCLUDED.verification_attempt_id,
          updated_at = EXCLUDED.updated_at
        WHERE campaign_os.campaign_task_completions.status <> $16
          OR (
            campaign_os.campaign_task_completions.verification_attempt_id IS NULL
            AND EXCLUDED.verification_attempt_id IS NULL
          )
          ${rolloverPredicate}
        RETURNING ${COMPLETION_COLUMNS}
      `,
      [
        completion.id,
        completion.campaignId,
        completion.taskId,
        completion.walletAddress,
        completion.accountType,
        completion.walletSource,
        completion.status,
        completion.evidenceSource,
        completion.evidenceId ?? null,
        completion.evidenceHash ?? null,
        completion.pointsAwarded,
        completion.completedAt ?? null,
        completion.createdAt,
        completion.updatedAt,
        completion.verificationAttemptId ?? null,
        "completed",
      ],
      context,
    );

    return requiredOne(result.rows, mapCompletionRow, operation, result.traceId);
  };

  const upsertTaskEvidenceWith = async (
    queryable: Pick<PostgresCampaignStorePool, "query">,
    evidence: CampaignDbTaskEvidenceRecord,
    context?: CampaignDurableStoreOperationContext,
    operation: PostgresCampaignStoreOperation = "upsertTaskEvidence",
  ) => {
    const rolloverPredicate = operation === "finalizeTaskVerificationAttempt"
      ? `OR (${taskVerificationRolloverPredicate("campaign_os.campaign_task_evidence")})`
      : "";
    const result = await queryWith(
      queryable,
      operation,
      `
        INSERT INTO campaign_os.campaign_task_evidence (${EVIDENCE_COLUMNS})
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12::jsonb, $13, $14, $15, $16, $17, $18, $19, $20, $21
        )
        ON CONFLICT (campaign_id, task_id, wallet_address) DO UPDATE SET
          completion_id = EXCLUDED.completion_id,
          account_type = EXCLUDED.account_type,
          wallet_source = EXCLUDED.wallet_source,
          status = EXCLUDED.status,
          evidence_source = EXCLUDED.evidence_source,
          evidence_hash = EXCLUDED.evidence_hash,
          evidence_ref = EXCLUDED.evidence_ref,
          diagnostic_codes = EXCLUDED.diagnostic_codes,
          points_awarded = EXCLUDED.points_awarded,
          captured_at = EXCLUDED.captured_at,
          live_contract_executed = EXCLUDED.live_contract_executed,
          live_provider_executed = EXCLUDED.live_provider_executed,
          live_reward_executed = EXCLUDED.live_reward_executed,
          live_storage_executed = EXCLUDED.live_storage_executed,
          verification_attempt_id = EXCLUDED.verification_attempt_id,
          updated_at = EXCLUDED.updated_at
        WHERE campaign_os.campaign_task_evidence.status <> $22
          OR (
            campaign_os.campaign_task_evidence.verification_attempt_id IS NULL
            AND EXCLUDED.verification_attempt_id IS NULL
          )
          ${rolloverPredicate}
        RETURNING ${EVIDENCE_COLUMNS}
      `,
      [
        evidence.id,
        evidence.campaignId,
        evidence.taskId,
        evidence.walletAddress,
        evidence.completionId ?? null,
        evidence.accountType,
        evidence.walletSource,
        evidence.status,
        evidence.evidenceSource,
        evidence.evidenceHash,
        evidence.evidenceRef ?? null,
        encodeJsonb(evidence.diagnosticCodes, "diagnosticCodes", operation, context),
        evidence.pointsAwarded,
        evidence.capturedAt,
        evidence.liveContractExecuted,
        evidence.liveProviderExecuted,
        evidence.liveRewardExecuted,
        evidence.liveStorageExecuted,
        evidence.createdAt,
        evidence.updatedAt,
        evidence.verificationAttemptId ?? null,
        "completed",
      ],
      context,
    );

    return requiredOne(result.rows, mapEvidenceRow, operation, result.traceId);
  };

  const transactionCleanupError = (
    operation: Extract<
      PostgresCampaignStoreOperation,
      | "beginTaskVerificationAttempt"
      | "finalizeTaskVerificationAttempt"
      | "getParticipantJourneySnapshot"
      | "markTaskVerificationTransportStarted"
      | "reset"
      | "upsertTaskVerification"
    >,
    traceId: string,
  ) => new PostgresCampaignStoreError({
    code: "POSTGRES_CAMPAIGN_STORE_CLEANUP_FAILED",
    field: "transaction",
    operation,
    traceId,
  });

  const withAttemptTransaction = async <TValue>(
    operation: Extract<
      PostgresCampaignStoreOperation,
      | "beginTaskVerificationAttempt"
      | "finalizeTaskVerificationAttempt"
      | "markTaskVerificationTransportStarted"
      | "reset"
    >,
    traceId: string,
    execute: (client: PostgresCampaignStoreClient) => Promise<TValue>,
  ): Promise<TValue> => {
    ensureAccepting(operation, traceId);
    if (!pool.connect) {
      throw new PostgresCampaignStoreError({
        code: "POSTGRES_CAMPAIGN_STORE_ARGUMENT_INVALID",
        field: "pool.connect",
        operation,
        traceId,
      });
    }

    activeAttemptTransactions += 1;
    let client: PostgresCampaignStoreClient | undefined;
    let began = false;

    try {
      try {
        client = await pool.connect();
      } catch {
        throw new PostgresCampaignStoreError({
          code: "POSTGRES_CAMPAIGN_STORE_QUERY_FAILED",
          field: "database",
          operation,
          traceId,
        });
      }
      await queryWith(client, operation, "BEGIN", [], { traceId });
      began = true;
      const result = await execute(client);
      await queryWith(client, operation, "COMMIT", [], { traceId });
      began = false;
      return result;
    } catch (error) {
      if (began && client) {
        try {
          await queryWith(client, operation, "ROLLBACK", [], { traceId });
        } catch {
          throw transactionCleanupError(operation, traceId);
        }
      }
      throw error;
    } finally {
      let releaseFailed = false;
      if (client) {
        try {
          client.release();
        } catch {
          releaseFailed = true;
        }
      }
      activeAttemptTransactions -= 1;
      if (activeAttemptTransactions === 0) {
        for (const waiter of attemptDrainWaiters) {
          waiter();
        }
        attemptDrainWaiters.clear();
      }
      if (releaseFailed) {
        throw transactionCleanupError(operation, traceId);
      }
    }
  };

  const currentAttemptTimestamp = (traceId: string) => {
    const value = now();
    const parsed = typeof value === "string" ? new Date(value) : new Date(Number.NaN);
    if (!Number.isFinite(parsed.getTime())) {
      return attemptStoreInputError("now", traceId);
    }
    return parsed.toISOString();
  };

  const issueAttemptOwner = (
    record: TaskVerificationAttemptPersistenceRecord,
    token: string,
  ): TaskVerificationAttemptOwner => {
    const owner = Object.freeze({ attemptId: record.id, fence: record.fence });
    attemptOwnerSecrets.set(owner, { attemptId: record.id, fence: record.fence, token });
    return owner;
  };

  const attemptOwnerMatches = (
    record: TaskVerificationAttemptPersistenceRecord,
    owner: TaskVerificationAttemptOwner,
  ) => {
    const secret = attemptOwnerSecrets.get(owner);
    return Boolean(
      secret
      && secret.attemptId === record.id
      && secret.fence === record.fence
      && owner.attemptId === record.id
      && owner.fence === record.fence
      && record.leaseTokenHash === hashAttemptOwnerToken(secret.token),
    );
  };

  const isObservedAttempt = (record: TaskVerificationAttemptPersistenceRecord) =>
    record.dispatchState === "result_observed"
    || record.status === "completed"
    || record.status === "failed"
    || record.status === "manual_review";

  const lockCurrentTaskVerificationRevision = async (
    client: PostgresCampaignStoreClient,
    expected: TaskVerificationRevisionExpectation,
    operation: "beginTaskVerificationAttempt" | "finalizeTaskVerificationAttempt",
    traceId: string,
  ) => {
    const result = await queryWith(
      client,
      operation,
      `
        SELECT ${TASK_COLUMNS}
        FROM campaign_os.campaign_tasks
        WHERE campaign_id = $1 AND id = $2
        LIMIT 1
        FOR UPDATE
      `,
      [expected.campaignId, expected.taskId],
      { traceId },
    );
    const task = optionalOne(result.rows, mapTaskRow, operation, traceId);
    return task && taskMatchesVerificationRevision(task, expected, traceId)
      ? task
      : undefined;
  };

  const validateAttemptOwner = (owner: TaskVerificationAttemptOwner, traceId: string) => {
    if (
      !isPlainRecord(owner)
      || !hasExactKeys(owner, ["attemptId", "fence"])
    ) {
      return attemptStoreInputError("owner", traceId);
    }
    assertAttemptString(owner.attemptId, "owner.attemptId", traceId);
    assertAttemptPositiveInteger(owner.fence, "owner.fence", traceId, Number.MAX_SAFE_INTEGER);
    return owner;
  };

  const beginTaskVerificationAttempt = async (
    input: BeginTaskVerificationAttemptInput,
  ): Promise<BeginTaskVerificationAttemptResult> => {
    const traceId = assertAttemptTraceId(input?.traceId);
    if (!isPlainRecord(input) || !isServerIssuedTaskVerificationIdentity(input.identity)) {
      return attemptStoreInputError("identity", traceId);
    }
    const leaseDurationMs = assertAttemptPositiveInteger(
      input.leaseDurationMs,
      "leaseDurationMs",
      traceId,
      5 * 60_000,
    );
    const maxAttempts = assertAttemptPositiveInteger(
      input.maxAttempts ?? 3,
      "maxAttempts",
      traceId,
      3,
    );
    const providerRef = assertAttemptString(input.providerRef, "providerRef", traceId);
    if (!LIVE_VERIFICATION_TYPES.includes(input.verificationType)) {
      return attemptStoreInputError("verificationType", traceId);
    }
    const identity = input.identity;

    return withAttemptTransaction("beginTaskVerificationAttempt", traceId, async (client) => {
      await queryWith(
        client,
        "beginTaskVerificationAttempt",
        "SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))",
        [identity.idempotencyKey],
        { traceId },
      );
      const existingResult = await queryWith(
        client,
        "beginTaskVerificationAttempt",
        `
          SELECT ${VERIFICATION_ATTEMPT_COLUMNS}
          FROM campaign_os.verification_attempts
          WHERE idempotency_key = $1
          FOR UPDATE
        `,
        [identity.idempotencyKey],
        { traceId },
      );
      const existing = optionalOne(
        existingResult.rows,
        mapVerificationAttemptRow,
        "beginTaskVerificationAttempt",
        traceId,
      );
      const timestamp = currentAttemptTimestamp(traceId);

      if (!existing) {
        const currentTask = await lockCurrentTaskVerificationRevision(
          client,
          identity,
          "beginTaskVerificationAttempt",
          traceId,
        );
        if (!currentTask) {
          return attemptStoreInputError("identity.taskRevisionDigest", traceId);
        }
        const id = assertAttemptString(attemptId(), "attemptId", traceId);
        const token = assertAttemptString(ownerToken(), "ownerToken", traceId);
        const leaseExpiresAt = new Date(Date.parse(timestamp) + leaseDurationMs).toISOString();
        const inserted = await queryWith(
          client,
          "beginTaskVerificationAttempt",
          `
            INSERT INTO campaign_os.verification_attempts (${VERIFICATION_ATTEMPT_COLUMNS})
            VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
              $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
              $21, $22, $23, $24, $25, $26, $27::jsonb, $28, $29, $30,
              $31, $32, $33, $34, $35, $36, $37
            )
            RETURNING ${VERIFICATION_ATTEMPT_COLUMNS}
          `,
          [
            id,
            identity.idempotencyKey,
            identity.campaignId,
            identity.taskId,
            identity.taskRevision,
            identity.issuedSubject.walletAddress,
            identity.issuedSubject.accountType,
            identity.issuedSubject.walletSource,
            identity.binding.bindingId,
            identity.binding.bindingRevision,
            providerRef,
            input.verificationType,
            identity.taskRevisionDigest,
            identity.evidenceRuleDigest,
            null,
            "running",
            "not_started",
            hashAttemptOwnerToken(token),
            leaseExpiresAt,
            1,
            1,
            maxAttempts,
            TASK_VERIFICATION_EXTERNAL_DISPATCH_LIMIT,
            null,
            null,
            "none",
            "[]",
            traceId,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            timestamp,
            timestamp,
          ],
          { traceId },
        );
        const record = requiredOne(
          inserted.rows,
          mapVerificationAttemptRow,
          "beginTaskVerificationAttempt",
          traceId,
        );
        return {
          attempt: toSafeVerificationAttempt(record),
          kind: "acquired",
          owner: issueAttemptOwner(record, token),
        };
      }

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
        || existing.verificationType !== input.verificationType
      ) {
        return { attempt: toSafeVerificationAttempt(existing), kind: "blocked" };
      }
      if (isObservedAttempt(existing)) {
        return { attempt: toSafeVerificationAttempt(existing), kind: "existing_terminal" };
      }
      if (existing.providerRef !== providerRef || existing.maxAttempts !== maxAttempts) {
        return { attempt: toSafeVerificationAttempt(existing), kind: "blocked" };
      }
      const currentTask = await lockCurrentTaskVerificationRevision(
        client,
        existing,
        "beginTaskVerificationAttempt",
        traceId,
      );
      if (!currentTask) {
        return { attempt: toSafeVerificationAttempt(existing), kind: "blocked" };
      }
      if (Date.parse(existing.leaseExpiresAt ?? "") > Date.parse(timestamp)) {
        return { attempt: toSafeVerificationAttempt(existing), kind: "in_progress" };
      }

      if (existing.dispatchState === "started") {
        const result = await queryWith(
          client,
          "beginTaskVerificationAttempt",
          `
            UPDATE campaign_os.verification_attempts
            SET
              status = 'manual_review',
              lease_token_hash = NULL,
              lease_expires_at = NULL,
              retry_posture = 'manual_review',
              diagnostic_codes = $2::jsonb,
              trace_id = $3,
              updated_at = $4
            WHERE id = $1 AND fence = $5
            RETURNING ${VERIFICATION_ATTEMPT_COLUMNS}
          `,
          [
            existing.id,
            JSON.stringify(["TASK_VERIFICATION_OUTCOME_UNKNOWN"]),
            traceId,
            timestamp,
            existing.fence,
          ],
          { traceId },
        );
        const recovered = requiredOne(
          result.rows,
          mapVerificationAttemptRow,
          "beginTaskVerificationAttempt",
          traceId,
        );
        return { attempt: toSafeVerificationAttempt(recovered), kind: "recovery_required" };
      }

      if (existing.attemptCount >= existing.maxAttempts) {
        const result = await queryWith(
          client,
          "beginTaskVerificationAttempt",
          `
            UPDATE campaign_os.verification_attempts
            SET
              status = 'manual_review',
              lease_token_hash = NULL,
              lease_expires_at = NULL,
              retry_posture = 'blocked',
              diagnostic_codes = $2::jsonb,
              trace_id = $3,
              updated_at = $4
            WHERE id = $1 AND fence = $5
            RETURNING ${VERIFICATION_ATTEMPT_COLUMNS}
          `,
          [
            existing.id,
            JSON.stringify(["TASK_VERIFICATION_ATTEMPT_BUDGET_EXHAUSTED"]),
            traceId,
            timestamp,
            existing.fence,
          ],
          { traceId },
        );
        const blocked = requiredOne(
          result.rows,
          mapVerificationAttemptRow,
          "beginTaskVerificationAttempt",
          traceId,
        );
        return { attempt: toSafeVerificationAttempt(blocked), kind: "blocked" };
      }

      const token = assertAttemptString(ownerToken(), "ownerToken", traceId);
      const leaseExpiresAt = new Date(Date.parse(timestamp) + leaseDurationMs).toISOString();
      const result = await queryWith(
        client,
        "beginTaskVerificationAttempt",
        `
          UPDATE campaign_os.verification_attempts
          SET
            status = 'running',
            lease_token_hash = $2,
            lease_expires_at = $3,
            fence = fence + 1,
            attempt_count = attempt_count + 1,
            retry_posture = 'none',
            diagnostic_codes = '[]'::jsonb,
            trace_id = $4,
            updated_at = $5
          WHERE id = $1 AND fence = $6 AND dispatch_state = 'not_started'
          RETURNING ${VERIFICATION_ATTEMPT_COLUMNS}
        `,
        [existing.id, hashAttemptOwnerToken(token), leaseExpiresAt, traceId, timestamp, existing.fence],
        { traceId },
      );
      const reclaimed = requiredOne(
        result.rows,
        mapVerificationAttemptRow,
        "beginTaskVerificationAttempt",
        traceId,
      );
      return {
        attempt: toSafeVerificationAttempt(reclaimed),
        kind: "acquired",
        owner: issueAttemptOwner(reclaimed, token),
      };
    });
  };

  const markTaskVerificationTransportStarted = async (
    input: MarkTaskVerificationTransportStartedInput,
  ): Promise<MarkTaskVerificationTransportStartedResult> => {
    const traceId = assertAttemptTraceId(input?.traceId);
    const owner = validateAttemptOwner(input.owner, traceId);
    const requestDigest = assertAttemptString(
      input.requestDigest,
      "requestDigest",
      traceId,
      SHA_256_PATTERN,
    );

    return withAttemptTransaction(
      "markTaskVerificationTransportStarted",
      traceId,
      async (client) => {
        const selected = await queryWith(
          client,
          "markTaskVerificationTransportStarted",
          `
            SELECT ${VERIFICATION_ATTEMPT_COLUMNS}
            FROM campaign_os.verification_attempts
            WHERE id = $1
            FOR UPDATE
          `,
          [owner.attemptId],
          { traceId },
        );
        const existing = requiredOne(
          selected.rows,
          mapVerificationAttemptRow,
          "markTaskVerificationTransportStarted",
          traceId,
        );

        if (isObservedAttempt(existing)) {
          return { attempt: toSafeVerificationAttempt(existing), kind: "terminal" };
        }
        if (!attemptOwnerMatches(existing, owner)) {
          return { attempt: toSafeVerificationAttempt(existing), kind: "stale_owner" };
        }
        const timestamp = currentAttemptTimestamp(traceId);
        if (Date.parse(existing.leaseExpiresAt ?? "") <= Date.parse(timestamp)) {
          return { attempt: toSafeVerificationAttempt(existing), kind: "stale_owner" };
        }
        if (existing.dispatchState === "started") {
          return {
            attempt: toSafeVerificationAttempt(existing),
            kind: existing.requestDigest === requestDigest
              ? "already_marked_same_owner"
              : "conflict",
          };
        }
        if (existing.dispatchState !== "not_started" || existing.status !== "running") {
          return { attempt: toSafeVerificationAttempt(existing), kind: "terminal" };
        }

        const updated = await queryWith(
          client,
          "markTaskVerificationTransportStarted",
          `
            UPDATE campaign_os.verification_attempts
            SET
              request_digest = $2,
              dispatch_state = 'started',
              transport_started_at = $3,
              trace_id = $4,
              updated_at = $3
            WHERE id = $1
              AND fence = $5
              AND lease_token_hash = $6
              AND lease_expires_at > $3
              AND status = 'running'
              AND dispatch_state = 'not_started'
            RETURNING ${VERIFICATION_ATTEMPT_COLUMNS}
          `,
          [
            existing.id,
            requestDigest,
            timestamp,
            traceId,
            owner.fence,
            existing.leaseTokenHash,
          ],
          { traceId },
        );
        const marked = requiredOne(
          updated.rows,
          mapVerificationAttemptRow,
          "markTaskVerificationTransportStarted",
          traceId,
        );
        return { attempt: toSafeVerificationAttempt(marked), kind: "marked" };
      },
    );
  };

  const readVerificationAttemptWriteResult = async (
    client: PostgresCampaignStoreClient,
    attempt: TaskVerificationAttemptPersistenceRecord,
    traceId: string,
  ) => {
    if (attempt.status !== "completed") {
      return undefined;
    }
    const snapshotResult = await queryWith(
      client,
      "finalizeTaskVerificationAttempt",
      `
        SELECT completion_snapshot, evidence_snapshot, participant_snapshot
        FROM campaign_os.verification_attempt_finalization_results
        WHERE attempt_id = $1
        LIMIT 1
      `,
      [attempt.id],
      { traceId },
    );
    return requiredOne(
      snapshotResult.rows,
      mapVerificationAttemptFinalizationResultRow,
      "finalizeTaskVerificationAttempt",
      traceId,
    );
  };

  const finalizeTaskVerificationAttempt = async (
    input: FinalizeTaskVerificationAttemptInput,
  ): Promise<FinalizeTaskVerificationAttemptResult> => {
    const traceId = assertAttemptTraceId(input?.traceId);
    const owner = validateAttemptOwner(input.owner, traceId);
    assertAttemptString(input.responseDigest, "responseDigest", traceId, SHA_256_PATTERN);
    assertAttemptString(input.providerCode, "providerCode", traceId, SAFE_PROVIDER_CODE_PATTERN);
    const completedAtDate = new Date(input.completedAt);
    if (
      !Number.isFinite(completedAtDate.getTime())
      || completedAtDate.toISOString() !== input.completedAt
    ) {
      return attemptStoreInputError("completedAt", traceId);
    }
    if (
      !["none", "retry_finalize", "manual_review", "blocked"].includes(input.retryPosture)
    ) {
      return attemptStoreInputError("retryPosture", traceId);
    }
    if (
      !isServerIssuedTaskVerificationTransition(input.transition)
      || input.transition.traceId !== traceId
    ) {
      return attemptStoreInputError("transition", traceId);
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
        return attemptStoreInputError("write", traceId);
      }
    } else if (input.write) {
      return attemptStoreInputError("write", traceId);
    }
    const finalizationDigest = deriveTaskVerificationFinalizationDigest(input);

    return withAttemptTransaction("finalizeTaskVerificationAttempt", traceId, async (client) => {
      const selected = await queryWith(
        client,
        "finalizeTaskVerificationAttempt",
        `
          SELECT ${VERIFICATION_ATTEMPT_COLUMNS}
          FROM campaign_os.verification_attempts
          WHERE id = $1
          FOR UPDATE
        `,
        [owner.attemptId],
        { traceId },
      );
      const existing = requiredOne(
        selected.rows,
        mapVerificationAttemptRow,
        "finalizeTaskVerificationAttempt",
        traceId,
      );

      if (isObservedAttempt(existing)) {
        if (existing.finalizationDigest !== finalizationDigest) {
          return { attempt: toSafeVerificationAttempt(existing), kind: "conflict" };
        }
        const writeResult = await readVerificationAttemptWriteResult(client, existing, traceId);
        return {
          attempt: toSafeVerificationAttempt(existing),
          kind: "terminal_replay",
          ...(writeResult ? { writeResult } : {}),
        };
      }
      const timestamp = currentAttemptTimestamp(traceId);
      if (
        !attemptOwnerMatches(existing, owner)
        || Date.parse(existing.leaseExpiresAt ?? "") <= Date.parse(timestamp)
      ) {
        return { attempt: toSafeVerificationAttempt(existing), kind: "stale_owner" };
      }
      if (existing.dispatchState !== "started" || !existing.requestDigest) {
        return { attempt: toSafeVerificationAttempt(existing), kind: "blocked" };
      }
      if (input.transition.previousStatus !== existing.status) {
        return { attempt: toSafeVerificationAttempt(existing), kind: "conflict" };
      }

      const completed = input.transition.status === "completed";
      if (completed) {
        const write = input.write!;
        const evidence = input.transition.evidence!;
        if (
          write.completion.campaignId !== existing.campaignId
          || write.completion.taskId !== existing.taskId
          || write.completion.walletAddress !== existing.walletAddress
          || write.completion.accountType !== existing.accountType
          || write.completion.walletSource !== existing.walletSource
          || write.completion.evidenceHash !== evidence.evidenceHash
          || write.completion.evidenceSource !== evidence.evidenceSource
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
          || write.evidence.evidenceHash !== evidence.evidenceHash
          || write.evidence.evidenceRef !== evidence.evidenceRef
          || write.evidence.evidenceSource !== evidence.evidenceSource
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
          return attemptStoreInputError("write.identity", traceId);
        }

        const currentTask = await lockCurrentTaskVerificationRevision(
          client,
          existing,
          "finalizeTaskVerificationAttempt",
          traceId,
        );
        if (!currentTask || currentTask.points !== write.completion.pointsAwarded) {
          return { attempt: toSafeVerificationAttempt(existing), kind: "blocked" };
        }
        await queryWith(
          client,
          "finalizeTaskVerificationAttempt",
          `
            SET CONSTRAINTS
              campaign_os.campaign_task_completion_live_provider_validation,
              campaign_os.campaign_task_evidence_live_provider_validation
            DEFERRED
          `,
          [],
          { traceId },
        );
      }

      const updatedResult = await queryWith(
        client,
        "finalizeTaskVerificationAttempt",
        `
          UPDATE campaign_os.verification_attempts
          SET
            status = $2,
            dispatch_state = 'result_observed',
            lease_token_hash = NULL,
            lease_expires_at = NULL,
            response_digest = $3,
            provider_code = $4,
            retry_posture = $5,
            diagnostic_codes = $6::jsonb,
            trace_id = $7,
            evidence_hash = $8,
            evidence_ref = $9,
            evidence_source = $10,
            finalization_digest = $11,
            transport_finished_at = $12,
            completed_at = $12,
            updated_at = $12
          WHERE id = $1
            AND fence = $13
            AND lease_token_hash = $14
            AND lease_expires_at > $15
            AND status = $16
            AND dispatch_state = 'started'
          RETURNING ${VERIFICATION_ATTEMPT_COLUMNS}
        `,
        [
          existing.id,
          input.transition.status,
          input.responseDigest,
          input.providerCode,
          input.retryPosture,
          JSON.stringify(input.transition.diagnosticCodes),
          traceId,
          completed ? input.transition.evidence?.evidenceHash : null,
          completed ? input.transition.evidence?.evidenceRef : null,
          completed ? input.transition.evidence?.evidenceSource : null,
          finalizationDigest,
          input.completedAt,
          owner.fence,
          existing.leaseTokenHash,
          timestamp,
          existing.status,
        ],
        { traceId },
      );
      const finalized = requiredOne(
        updatedResult.rows,
        mapVerificationAttemptRow,
        "finalizeTaskVerificationAttempt",
        traceId,
      );
      let writeResult: Awaited<ReturnType<typeof readVerificationAttemptWriteResult>>;

      if (completed) {
        const write = input.write!;
        await queryWith(
          client,
          "finalizeTaskVerificationAttempt",
          `
            SELECT pg_advisory_xact_lock(
              hashtextextended(jsonb_build_array($1::text, $2::text)::text, 0)
            )
          `,
          [existing.campaignId, existing.walletAddress],
          { traceId },
        );
        const existingCompletionResult = await queryWith(
          client,
          "finalizeTaskVerificationAttempt",
          `
            SELECT ${COMPLETION_COLUMNS}
            FROM campaign_os.campaign_task_completions
            WHERE campaign_id = $1
              AND task_id = $2
              AND wallet_address = $3
            LIMIT 1
            FOR UPDATE
          `,
          [existing.campaignId, existing.taskId, existing.walletAddress],
          { traceId },
        );
        const existingCompletion = optionalOne(
          existingCompletionResult.rows,
          mapCompletionRow,
          "finalizeTaskVerificationAttempt",
          traceId,
        );
        const existingEvidenceResult = await queryWith(
          client,
          "finalizeTaskVerificationAttempt",
          `
            SELECT ${EVIDENCE_COLUMNS}
            FROM campaign_os.campaign_task_evidence
            WHERE campaign_id = $1
              AND task_id = $2
              AND wallet_address = $3
            LIMIT 1
            FOR UPDATE
          `,
          [existing.campaignId, existing.taskId, existing.walletAddress],
          { traceId },
        );
        const existingEvidence = optionalOne(
          existingEvidenceResult.rows,
          mapEvidenceRow,
          "finalizeTaskVerificationAttempt",
          traceId,
        );
        const completionId = existingCompletion?.id ?? write.completion.id;
        const evidenceId = existingEvidence?.id ?? write.evidence.id;
        const completion = await upsertTaskCompletionWith(
          client,
          {
            ...write.completion,
            evidenceHash: input.transition.evidence!.evidenceHash,
            evidenceId,
            id: completionId,
            verificationAttemptId: existing.id,
          },
          { traceId },
          "finalizeTaskVerificationAttempt",
        );
        const evidence = await upsertTaskEvidenceWith(
          client,
          {
            ...write.evidence,
            completionId: completion.id,
            evidenceHash: input.transition.evidence!.evidenceHash,
            evidenceRef: input.transition.evidence!.evidenceRef,
            evidenceSource: input.transition.evidence!.evidenceSource,
            id: evidenceId,
            liveProviderExecuted: true,
            pointsAwarded: completion.pointsAwarded,
            verificationAttemptId: existing.id,
          },
          { traceId },
          "finalizeTaskVerificationAttempt",
        );
        const pointsResult = await queryWith(
          client,
          "finalizeTaskVerificationAttempt",
          `
            SELECT COALESCE(SUM(points_awarded), 0)::text AS total_points
            FROM campaign_os.campaign_task_completions
            WHERE campaign_id = $1
              AND wallet_address = $2
              AND status = 'completed'
          `,
          [existing.campaignId, existing.walletAddress],
          { traceId },
        );
        const pointsRow = requiredOne(
          pointsResult.rows,
          decodeRow,
          "finalizeTaskVerificationAttempt",
          traceId,
        );
        await upsertParticipantWith(
          client,
          {
            ...withoutParticipantRank(write.participant),
            totalPoints: decodeCount(pointsRow, "total_points"),
          },
          { traceId },
          "finalizeTaskVerificationAttempt",
        );
        const snapshotResult = await queryWith(
          client,
          "finalizeTaskVerificationAttempt",
          `
            INSERT INTO campaign_os.verification_attempt_finalization_results (
              attempt_id,
              completion_snapshot,
              evidence_snapshot,
              participant_snapshot,
              created_at
            )
            SELECT
              $1,
              to_jsonb(completion),
              to_jsonb(evidence),
              to_jsonb(participant),
              $6
            FROM campaign_os.campaign_task_completions AS completion
            JOIN campaign_os.campaign_task_evidence AS evidence
              ON evidence.id = $3
              AND evidence.campaign_id = completion.campaign_id
              AND evidence.task_id = completion.task_id
              AND evidence.wallet_address = completion.wallet_address
              AND evidence.completion_id = completion.id
              AND evidence.verification_attempt_id = $1
            JOIN campaign_os.campaign_participants AS participant
              ON participant.campaign_id = $4
              AND participant.wallet_address = $5
            WHERE completion.id = $2
              AND completion.campaign_id = $4
              AND completion.wallet_address = $5
              AND completion.verification_attempt_id = $1
            RETURNING completion_snapshot, evidence_snapshot, participant_snapshot
          `,
          [
            existing.id,
            completion.id,
            evidence.id,
            existing.campaignId,
            existing.walletAddress,
            input.completedAt,
          ],
          { traceId },
        );
        writeResult = requiredOne(
          snapshotResult.rows,
          mapVerificationAttemptFinalizationResultRow,
          "finalizeTaskVerificationAttempt",
          traceId,
        );
      }

      return {
        attempt: toSafeVerificationAttempt(finalized),
        kind: "committed",
        ...(writeResult ? { writeResult } : {}),
      };
    });
  };

  const getTaskVerificationAttempt: TaskVerificationAttemptStore["get"] = async (
    attemptIdValue,
    context,
  ) => {
    const traceId = assertAttemptTraceId(context?.traceId);
    const id = assertAttemptString(attemptIdValue, "attemptId", traceId);
    const result = await query(
      "getTaskVerificationAttempt",
      `
        SELECT ${VERIFICATION_ATTEMPT_COLUMNS}
        FROM campaign_os.verification_attempts
        WHERE id = $1
        LIMIT 1
      `,
      [id],
      { traceId },
    );
    const record = optionalOne(
      result.rows,
      mapVerificationAttemptRow,
      "getTaskVerificationAttempt",
      traceId,
    );
    return record ? toSafeVerificationAttempt(record) : undefined;
  };

  const getParticipantJourneySnapshot = async (
    input: CampaignDurableStoreParticipantJourneySnapshotInput,
    context?: CampaignDurableStoreOperationContext,
  ): Promise<CampaignDurableStoreParticipantJourneySnapshot> => {
    const operation = "getParticipantJourneySnapshot" as const;
    const traceId = resolveTraceId(context, operation);
    ensureAccepting(operation, traceId);

    if (
      typeof input.campaignId !== "string"
      || input.campaignId.trim().length === 0
      || input.campaignId !== input.campaignId.trim()
      || typeof input.walletAddress !== "string"
      || input.walletAddress.trim().length === 0
      || input.walletAddress !== input.walletAddress.trim()
    ) {
      throw new PostgresCampaignStoreError({
        code: "POSTGRES_CAMPAIGN_STORE_ARGUMENT_INVALID",
        field: "snapshot",
        operation,
        traceId,
      });
    }

    if (!pool.connect) {
      throw new PostgresCampaignStoreError({
        code: "POSTGRES_CAMPAIGN_STORE_ARGUMENT_INVALID",
        field: "pool.connect",
        operation,
        traceId,
      });
    }

    let client: PostgresCampaignStoreClient;

    try {
      client = await pool.connect();
    } catch {
      throw new PostgresCampaignStoreError({
        code: "POSTGRES_CAMPAIGN_STORE_QUERY_FAILED",
        field: "database",
        operation,
        traceId,
      });
    }

    try {
      await queryWith(
        client,
        operation,
        "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY",
        [],
        { traceId },
      );
      const campaignResult = await queryWith(
        client,
        operation,
        `SELECT ${CAMPAIGN_COLUMNS} FROM campaign_os.campaigns WHERE id = $1 LIMIT 1`,
        [input.campaignId],
        { traceId },
      );
      const campaign = optionalOne(campaignResult.rows, mapCampaignRow, operation, traceId);

      if (!campaign) {
        await queryWith(client, operation, "COMMIT", [], { traceId });

        return {
          campaign: undefined,
          completions: [],
          evidence: [],
          participant: undefined,
          rankingParticipants: [],
          tasks: [],
        };
      }

      const readSnapshotPages = async <T>(
        readPage: (offset: number) => Promise<PostgresCampaignStoreQueryResult & { traceId: string }>,
        mapper: (row: unknown) => T,
      ): Promise<T[]> => {
        const records: T[] = [];
        let offset = 0;

        while (true) {
          const pageResult = await readPage(offset);
          const page = mapRows(pageResult.rows, mapper, operation, traceId);
          records.push(...page);

          if (pageResult.rows.length < boundedListLimit) {
            return records;
          }

          offset += pageResult.rows.length;
        }
      };
      const tasks = await readSnapshotPages(
        (offset) => queryWith(
          client,
          operation,
          `
            SELECT ${TASK_COLUMNS}
            FROM campaign_os.campaign_tasks
            WHERE campaign_id = $1
            ORDER BY id COLLATE "C" ASC
            LIMIT $2 OFFSET $3
          `,
          [input.campaignId, boundedListLimit, offset],
          { traceId },
        ),
        mapTaskRow,
      );
      const participantResult = await queryWith(
        client,
        operation,
        `
          SELECT ${PARTICIPANT_COLUMNS}
          FROM campaign_os.campaign_participants
          WHERE campaign_id = $1 AND wallet_address = $2
          LIMIT 1
        `,
        [input.campaignId, input.walletAddress],
        { traceId },
      );
      const completions = await readSnapshotPages(
        (offset) => queryWith(
          client,
          operation,
          `
            SELECT ${COMPLETION_COLUMNS}
            FROM campaign_os.campaign_task_completions
            WHERE campaign_id = $1 AND wallet_address = $2
            ORDER BY task_id COLLATE "C" ASC, id COLLATE "C" ASC
            LIMIT $3 OFFSET $4
          `,
          [input.campaignId, input.walletAddress, boundedListLimit, offset],
          { traceId },
        ),
        mapCompletionRow,
      );
      const evidence = await readSnapshotPages(
        (offset) => queryWith(
          client,
          operation,
          `
            SELECT ${EVIDENCE_COLUMNS}
            FROM campaign_os.campaign_task_evidence
            WHERE campaign_id = $1 AND wallet_address = $2
            ORDER BY task_id COLLATE "C" ASC, id COLLATE "C" ASC
            LIMIT $3 OFFSET $4
          `,
          [input.campaignId, input.walletAddress, boundedListLimit, offset],
          { traceId },
        ),
        mapEvidenceRow,
      );
      const rankingParticipants = await readSnapshotPages(
        (offset) => queryWith(
          client,
          operation,
          `
            SELECT ${PARTICIPANT_RANK_COLUMNS}
            FROM campaign_os.campaign_participants
            WHERE campaign_id = $1
            ORDER BY
              total_points DESC,
              created_at ASC,
              id COLLATE "C" ASC,
              wallet_address COLLATE "C" ASC
            LIMIT $2 OFFSET $3
          `,
          [input.campaignId, boundedListLimit, offset],
          { traceId },
        ),
        mapParticipantRankRow,
      );
      const snapshot: CampaignDurableStoreParticipantJourneySnapshot = {
        campaign,
        completions,
        evidence,
        participant: optionalOne(participantResult.rows, mapParticipantRow, operation, traceId),
        rankingParticipants,
        tasks,
      };

      await queryWith(client, operation, "COMMIT", [], { traceId });

      return snapshot;
    } catch (error) {
      try {
        await queryWith(client, operation, "ROLLBACK", [], { traceId });
      } catch {
        throw transactionCleanupError(operation, traceId);
      }

      throw error;
    } finally {
      try {
        client.release();
      } catch {
        throw transactionCleanupError(operation, traceId);
      }
    }
  };

  const upsertTaskVerification = async (
    input: CampaignDurableStoreTaskVerificationWrite,
    context?: CampaignDurableStoreOperationContext,
  ): Promise<CampaignDurableStoreTaskVerificationResult> => {
    const operation = "upsertTaskVerification" as const;
    const traceId = resolveTraceId(context, operation);
    ensureAccepting(operation, traceId);

    if (!pool.connect) {
      throw new PostgresCampaignStoreError({
        code: "POSTGRES_CAMPAIGN_STORE_ARGUMENT_INVALID",
        field: "pool.connect",
        operation,
        traceId,
      });
    }

    let client: PostgresCampaignStoreClient;

    try {
      client = await pool.connect();
    } catch {
      throw new PostgresCampaignStoreError({
        code: "POSTGRES_CAMPAIGN_STORE_QUERY_FAILED",
        field: "database",
        operation,
        traceId,
      });
    }

    try {
      await queryWith(client, operation, "BEGIN", [], { traceId });
      await queryWith(
        client,
        operation,
        `
          SELECT pg_advisory_xact_lock(
            hashtextextended(jsonb_build_array($1::text, $2::text)::text, 0)
          )
        `,
        [input.completion.campaignId, input.completion.walletAddress],
        { traceId },
      );
      const initialEvidence = await upsertTaskEvidenceWith(
        client,
        { ...input.evidence, completionId: undefined },
        { traceId },
        operation,
      );
      const completion = await upsertTaskCompletionWith(
        client,
        {
          ...input.completion,
          evidenceHash: initialEvidence.evidenceHash,
          evidenceId: initialEvidence.id,
        },
        { traceId },
        operation,
      );
      const evidence = await upsertTaskEvidenceWith(
        client,
        {
          ...initialEvidence,
          completionId: completion.id,
          pointsAwarded: completion.pointsAwarded,
        },
        { traceId },
        operation,
      );
      const pointsResult = await queryWith(
        client,
        operation,
        `
          SELECT COALESCE(SUM(points_awarded), 0)::text AS total_points
          FROM campaign_os.campaign_task_completions
          WHERE campaign_id = $1
            AND wallet_address = $2
            AND status = 'completed'
        `,
        [completion.campaignId, completion.walletAddress],
        { traceId },
      );
      const pointsRow = requiredOne(pointsResult.rows, decodeRow, operation, traceId);
      const persistedParticipant = await upsertParticipantWith(
        client,
        {
          ...withoutParticipantRank(input.participant),
          totalPoints: decodeCount(pointsRow, "total_points"),
        },
        { traceId },
        operation,
      );

      await queryWith(client, operation, "COMMIT", [], { traceId });

      return {
        completion,
        evidence,
        participant: withoutParticipantRank(persistedParticipant),
      };
    } catch (error) {
      try {
        await queryWith(client, operation, "ROLLBACK", [], { traceId });
      } catch {
        throw transactionCleanupError(operation, traceId);
      }

      throw error;
    } finally {
      try {
        client.release();
      } catch {
        throw transactionCleanupError(operation, traceId);
      }
    }
  };

  return {
    close,
    taskVerificationAttempts: {
      begin: beginTaskVerificationAttempt,
      close,
      finalize: finalizeTaskVerificationAttempt,
      get: getTaskVerificationAttempt,
      markTransportStarted: markTaskVerificationTransportStarted,
    },
    create: async (draft, context) => {
      const result = await query(
        "create",
        `
          INSERT INTO campaign_os.campaigns (${CAMPAIGN_COLUMNS})
          VALUES (
            $1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17::jsonb, $18, $19
          )
          RETURNING ${CAMPAIGN_COLUMNS}
        `,
        [
          draft.id,
          draft.projectId,
          draft.ownerAddress,
          draft.status,
          draft.defaultLocale,
          encodeJsonb(draft.supportedLocales, "supportedLocales", "create", context),
          draft.walletPolicy,
          draft.contractMode,
          draft.goal,
          draft.duration,
          draft.rewardDescription,
          draft.rewardDisclaimerHash ?? null,
          draft.metadataUri ?? null,
          draft.metadataHash ?? null,
          draft.startTime,
          draft.endTime,
          encodeJsonb(draft.publishReadiness, "publishReadiness", "create", context),
          draft.createdAt,
          draft.updatedAt,
        ],
        context,
      );

      return requiredOne(result.rows, mapCampaignRow, "create", result.traceId);
    },
    createTaskDraft: async (taskDraft, context) => {
      const result = await query(
        "createTaskDraft",
        `
          INSERT INTO campaign_os.campaign_tasks (${TASK_COLUMNS})
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11)
          RETURNING ${TASK_COLUMNS}
        `,
        [
          taskDraft.id,
          taskDraft.campaignId,
          taskDraft.templateCode,
          taskDraft.verificationType,
          taskDraft.walletCompatibility,
          taskDraft.points,
          taskDraft.required,
          encodeJsonb(taskDraft.evidenceRule, "evidenceRule", "createTaskDraft", context),
          taskDraft.createdAt,
          taskDraft.updatedAt,
          taskDraft.revision ?? 1,
        ],
        context,
      );

      return requiredOne(result.rows, mapTaskRow, "createTaskDraft", result.traceId);
    },
    getById: async (campaignId, context) => {
      const result = await query(
        "getById",
        `SELECT ${CAMPAIGN_COLUMNS} FROM campaign_os.campaigns WHERE id = $1 LIMIT 1`,
        [campaignId],
        context,
      );

      return optionalOne(result.rows, mapCampaignRow, "getById", result.traceId);
    },
    getParticipant: async (campaignId, walletAddress, context) => {
      const result = await query(
        "getParticipant",
        `
          SELECT ${PARTICIPANT_COLUMNS}
          FROM campaign_os.campaign_participants
          WHERE campaign_id = $1 AND wallet_address = $2
          LIMIT 1
        `,
        [campaignId, walletAddress],
        context,
      );

      return optionalOne(result.rows, mapParticipantRow, "getParticipant", result.traceId);
    },
    getParticipantJourneySnapshot,
    getReferralBinding: async (campaignId, inviteeWalletAddress, context) => {
      const result = await query(
        "getReferralBinding",
        `
          SELECT ${REFERRAL_COLUMNS}
          FROM campaign_os.campaign_referral_bindings
          WHERE campaign_id = $1 AND invitee_wallet_address = $2
          LIMIT 1
        `,
        [campaignId, inviteeWalletAddress],
        context,
      );

      return optionalOne(result.rows, mapReferralRow, "getReferralBinding", result.traceId);
    },
    list: async (filter: CampaignDurableStoreListOptions = {}, context) => {
      const clauses: string[] = [];
      const values: unknown[] = [];

      if (filter.projectId !== undefined) {
        values.push(filter.projectId);
        clauses.push(`project_id = $${values.length}`);
      }

      if (filter.ownerAddress !== undefined) {
        values.push(filter.ownerAddress);
        clauses.push(`owner_address = $${values.length}`);
      }

      if (filter.status !== undefined) {
        values.push(filter.status);
        clauses.push(`status = $${values.length}`);
      }

      values.push(clampListLimit(filter.limit, boundedListLimit));
      const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
      const result = await query(
        "list",
        `
          SELECT ${CAMPAIGN_COLUMNS}
          FROM campaign_os.campaigns
          ${where}
          ORDER BY id ASC
          LIMIT $${values.length}
        `,
        values,
        context,
      );

      return mapRows(result.rows, mapCampaignRow, "list", result.traceId);
    },
    listParticipantsByCampaignId: async (
      campaignId,
      filter: CampaignDurableStoreParticipantListOptions = {},
      context,
    ) => {
      const values: unknown[] = [campaignId];
      const clauses = ["campaign_id = $1"];

      if (filter.walletAddress !== undefined) {
        values.push(filter.walletAddress);
        clauses.push(`wallet_address = $${values.length}`);
      }

      values.push(clampListLimit(filter.limit, boundedListLimit));
      const result = await query(
        "listParticipantsByCampaignId",
        `
          SELECT ${PARTICIPANT_COLUMNS}
          FROM campaign_os.campaign_participants
          WHERE ${clauses.join(" AND ")}
          ORDER BY wallet_address ASC, id ASC
          LIMIT $${values.length}
        `,
        values,
        context,
      );

      return mapRows(result.rows, mapParticipantRow, "listParticipantsByCampaignId", result.traceId);
    },
    listReferralBindingsByCampaignId: async (
      campaignId,
      filter: CampaignDurableStoreReferralListOptions = {},
      context,
    ) => {
      const values: unknown[] = [campaignId];
      const clauses = ["campaign_id = $1"];

      if (filter.inviteeWalletAddress !== undefined) {
        values.push(filter.inviteeWalletAddress);
        clauses.push(`invitee_wallet_address = $${values.length}`);
      }

      if (filter.referrerWalletAddress !== undefined) {
        values.push(filter.referrerWalletAddress);
        clauses.push(`referrer_wallet_address = $${values.length}`);
      }

      values.push(clampListLimit(filter.limit, boundedListLimit));
      const result = await query(
        "listReferralBindingsByCampaignId",
        `
          SELECT ${REFERRAL_COLUMNS}
          FROM campaign_os.campaign_referral_bindings
          WHERE ${clauses.join(" AND ")}
          ORDER BY invitee_wallet_address ASC, id ASC
          LIMIT $${values.length}
        `,
        values,
        context,
      );

      return mapRows(result.rows, mapReferralRow, "listReferralBindingsByCampaignId", result.traceId);
    },
    listTaskCompletionsByCampaignId: async (
      campaignId,
      filter: CampaignDurableStoreCompletionListOptions = {},
      context,
    ) => {
      const values: unknown[] = [campaignId];
      const clauses = ["campaign_id = $1"];

      if (filter.taskId !== undefined) {
        values.push(filter.taskId);
        clauses.push(`task_id = $${values.length}`);
      }

      if (filter.walletAddress !== undefined) {
        values.push(filter.walletAddress);
        clauses.push(`wallet_address = $${values.length}`);
      }

      values.push(clampListLimit(filter.limit, boundedListLimit));
      const result = await query(
        "listTaskCompletionsByCampaignId",
        `
          SELECT ${COMPLETION_COLUMNS}
          FROM campaign_os.campaign_task_completions
          WHERE ${clauses.join(" AND ")}
          ORDER BY wallet_address ASC, task_id ASC, id ASC
          LIMIT $${values.length}
        `,
        values,
        context,
      );

      return mapRows(result.rows, mapCompletionRow, "listTaskCompletionsByCampaignId", result.traceId);
    },
    listTaskDraftsByCampaignId: async (
      campaignId,
      filter: CampaignDurableStoreEntityListOptions = {},
      context,
    ) => {
      const result = await query(
        "listTaskDraftsByCampaignId",
        `
          SELECT ${TASK_COLUMNS}
          FROM campaign_os.campaign_tasks
          WHERE campaign_id = $1
          ORDER BY id ASC
          LIMIT $2
        `,
        [campaignId, clampListLimit(filter.limit, boundedListLimit)],
        context,
      );

      return mapRows(result.rows, mapTaskRow, "listTaskDraftsByCampaignId", result.traceId);
    },
    listTaskEvidence: async (filter, context) => {
      const values: unknown[] = [filter.campaignId];
      const clauses = ["campaign_id = $1"];

      if (filter.taskId !== undefined) {
        values.push(filter.taskId);
        clauses.push(`task_id = $${values.length}`);
      }

      if (filter.walletAddress !== undefined) {
        values.push(filter.walletAddress);
        clauses.push(`wallet_address = $${values.length}`);
      }

      values.push(clampListLimit(filter.limit, boundedListLimit));
      const result = await query(
        "listTaskEvidence",
        `
          SELECT ${EVIDENCE_COLUMNS}
          FROM campaign_os.campaign_task_evidence
          WHERE ${clauses.join(" AND ")}
          ORDER BY wallet_address ASC, task_id ASC, id ASC
          LIMIT $${values.length}
        `,
        values,
        context,
      );

      return mapRows(result.rows, mapEvidenceRow, "listTaskEvidence", result.traceId);
    },
    manifest: async (context) => {
      const result = await query(
        "manifest",
        `
          SELECT
            (SELECT COUNT(*) FROM campaign_os.campaigns) AS campaign_count,
            (SELECT COUNT(*) FROM campaign_os.campaign_tasks) AS task_count,
            (SELECT COUNT(*) FROM campaign_os.campaign_participants) AS participant_count,
            (SELECT COUNT(*) FROM campaign_os.campaign_task_completions) AS completion_count,
            (SELECT COUNT(*) FROM campaign_os.campaign_task_evidence) AS task_evidence_count,
            (SELECT COUNT(*) FROM campaign_os.campaign_referral_bindings) AS referral_binding_count,
            (SELECT COUNT(*) FROM campaign_os.verification_attempts) AS verification_attempt_count,
            COALESCE(
              (
                SELECT jsonb_agg(migration_id ORDER BY migration_id)
                FROM campaign_os.schema_migrations
              ),
              '[]'::jsonb
            ) AS applied_migration_ids
        `,
        [],
        context,
      );

      const row = requiredOne(result.rows, decodeRow, "manifest", result.traceId);
      let appliedMigrationIds: string[];

      try {
        appliedMigrationIds = decodeStringArrayValue(
          readField(row, "applied_migration_ids"),
          "applied_migration_ids",
          { maximum: 1_000 },
        );

        if (appliedMigrationIds.some((id) => !MIGRATION_ID_PATTERN.test(id))) {
          return rowError("applied_migration_ids");
        }
      } catch (error) {
        if (error instanceof RowDecodeError) {
          throw new PostgresCampaignStoreError({
            code: "POSTGRES_CAMPAIGN_STORE_ROW_INVALID",
            field: error.field,
            operation: "manifest",
            traceId: result.traceId,
          });
        }

        throw error;
      }

      let counts: Pick<
        CampaignDurableStoreManifest,
        | "completionRecordCount"
        | "participantRecordCount"
        | "recordCount"
        | "referralBindingRecordCount"
        | "taskEvidenceRecordCount"
        | "taskRecordCount"
        | "verificationAttemptRecordCount"
      >;

      try {
        counts = {
          completionRecordCount: decodeCount(row, "completion_count"),
          participantRecordCount: decodeCount(row, "participant_count"),
          recordCount: decodeCount(row, "campaign_count"),
          referralBindingRecordCount: decodeCount(row, "referral_binding_count"),
          taskEvidenceRecordCount: decodeCount(row, "task_evidence_count"),
          taskRecordCount: decodeCount(row, "task_count"),
          verificationAttemptRecordCount: Object.prototype.hasOwnProperty.call(
            row,
            "verification_attempt_count",
          ) ? decodeCount(row, "verification_attempt_count") : 0,
        };
      } catch (error) {
        if (error instanceof RowDecodeError) {
          throw new PostgresCampaignStoreError({
            code: "POSTGRES_CAMPAIGN_STORE_ROW_INVALID",
            field: error.field,
            operation: "manifest",
            traceId: result.traceId,
          });
        }

        throw error;
      }

      const schemaReady = appliedMigrationIds.includes(schemaVersion);
      const diagnostics = schemaReady ? [] : [schemaDiagnostic()];

      return {
        adapterId: "campaign-db-postgresql-adapter",
        appliedMigrationIds,
        boundedListLimit,
        ...counts,
        diagnosticCodes: diagnostics.map((diagnostic) => diagnostic.code),
        diagnostics,
        durable: true,
        fallbackUsed: false,
        migrationStatus: schemaReady ? "ready" : "blocked",
        mode: "postgres",
        schemaId: "campaign_os",
        schemaVersion,
        status: schemaReady ? "ready" : "blocked",
        storeId: "campaign-db",
      };
    },
    reset: async () => {
      const traceId = randomUUID();
      ensureAccepting("reset", traceId);

      if (!allowTestReset) {
        throw new PostgresCampaignStoreError({
          code: "POSTGRES_CAMPAIGN_STORE_RESET_FORBIDDEN",
          field: "allowTestReset",
          operation: "reset",
          traceId,
        });
      }

      await withAttemptTransaction("reset", traceId, async (client) => {
        await queryWith(
          client,
          "reset",
          `ALTER TABLE campaign_os.verification_attempt_finalization_results
           DISABLE TRIGGER verification_attempt_finalization_results_truncate_append_only`,
          [],
          { traceId },
        );
        await queryWith(
          client,
          "reset",
          `ALTER TABLE campaign_os.campaign_task_revisions
           DISABLE TRIGGER campaign_task_revisions_truncate_append_only`,
          [],
          { traceId },
        );
        await queryWith(
          client,
          "reset",
          `ALTER TABLE campaign_os.campaign_review_decisions
           DISABLE TRIGGER campaign_review_decisions_truncate_append_only`,
          [],
          { traceId },
        );
        await queryWith(
          client,
          "reset",
          `ALTER TABLE campaign_os.campaign_export_artifacts
           DISABLE TRIGGER campaign_export_artifacts_truncate_append_only`,
          [],
          { traceId },
        );
        await queryWith(
          client,
          "reset",
          `
            TRUNCATE TABLE
              campaign_os.verification_attempt_finalization_results,
              campaign_os.campaign_review_decisions,
              campaign_os.campaign_export_artifacts,
              campaign_os.campaign_task_evidence,
              campaign_os.campaign_task_completions,
              campaign_os.verification_attempts,
              campaign_os.campaign_referral_bindings,
              campaign_os.campaign_participants,
              campaign_os.campaign_task_revisions,
              campaign_os.campaign_tasks,
              campaign_os.campaigns
          `,
          [],
          { traceId },
        );
        await queryWith(
          client,
          "reset",
          `ALTER TABLE campaign_os.campaign_export_artifacts
           ENABLE TRIGGER campaign_export_artifacts_truncate_append_only`,
          [],
          { traceId },
        );
        await queryWith(
          client,
          "reset",
          `ALTER TABLE campaign_os.campaign_review_decisions
           ENABLE TRIGGER campaign_review_decisions_truncate_append_only`,
          [],
          { traceId },
        );
        await queryWith(
          client,
          "reset",
          `ALTER TABLE campaign_os.campaign_task_revisions
           ENABLE TRIGGER campaign_task_revisions_truncate_append_only`,
          [],
          { traceId },
        );
        await queryWith(
          client,
          "reset",
          `ALTER TABLE campaign_os.verification_attempt_finalization_results
           ENABLE TRIGGER verification_attempt_finalization_results_truncate_append_only`,
          [],
          { traceId },
        );
      });
    },
    upsertParticipant: (participant, context) =>
      upsertParticipantWith(pool, participant, context),
    upsertReferralBinding: async (binding, context) => {
      const result = await query(
        "upsertReferralBinding",
        `
          INSERT INTO campaign_os.campaign_referral_bindings (${REFERRAL_COLUMNS})
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13::jsonb, $14, $15
          )
          ON CONFLICT (campaign_id, invitee_wallet_address) DO UPDATE SET
            qualified_action_completed = EXCLUDED.qualified_action_completed,
            qualified_action_completed_at = EXCLUDED.qualified_action_completed_at,
            qualified_action_evidence_hash = EXCLUDED.qualified_action_evidence_hash,
            status = EXCLUDED.status,
            risk_flags = EXCLUDED.risk_flags,
            updated_at = EXCLUDED.updated_at
          RETURNING ${REFERRAL_COLUMNS}
        `,
        [
          binding.id,
          binding.campaignId,
          binding.inviteeWalletAddress,
          binding.inviteeAccountType,
          binding.inviteeWalletSource,
          binding.referrerWalletAddress,
          binding.referrerAccountType,
          binding.referrerWalletSource,
          binding.qualifiedActionCompleted,
          binding.qualifiedActionCompletedAt ?? null,
          binding.qualifiedActionEvidenceHash ?? null,
          binding.status,
          encodeJsonb(binding.riskFlags, "riskFlags", "upsertReferralBinding", context),
          binding.createdAt,
          binding.updatedAt,
        ],
        context,
      );

      return requiredOne(result.rows, mapReferralRow, "upsertReferralBinding", result.traceId);
    },
    upsertTaskCompletion: (completion, context) =>
      upsertTaskCompletionWith(pool, completion, context),
    upsertTaskEvidence: (evidence, context) =>
      upsertTaskEvidenceWith(pool, evidence, context),
    upsertTaskVerification,
  };
};
