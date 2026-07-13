import { randomUUID } from "node:crypto";
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
  CampaignDurableStoreParticipantListOptions,
  CampaignDurableStoreReferralListOptions,
  CampaignDurableStoreTaskVerificationResult,
  CampaignDurableStoreTaskVerificationWrite,
} from "./campaignDurableStore";

const DEFAULT_BOUNDED_LIST_LIMIT = 100;
const MAX_BOUNDED_LIST_LIMIT = 100;
const DEFAULT_SCHEMA_VERSION = "0001_campaign_runtime";
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
  updated_at
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
  updated_at
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
  updated_at
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
  | "getReferralBinding"
  | "list"
  | "listParticipantsByCampaignId"
  | "listReferralBindingsByCampaignId"
  | "listTaskCompletionsByCampaignId"
  | "listTaskDraftsByCampaignId"
  | "listTaskEvidence"
  | "manifest"
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
  boundedListLimit?: number;
  ownsPool?: boolean;
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

const mapCompletionRow = (raw: unknown): CampaignDbTaskCompletion => {
  const row = decodeRow(raw);
  const completedAt = decodeOptionalTimestamp(row, "completed_at");
  const evidenceHash = decodeOptionalString(row, "evidence_hash");
  const evidenceId = decodeOptionalString(row, "evidence_id");
  const status = decodeEnum(row, "status", COMPLETION_STATUSES);

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
    walletAddress: decodeString(row, "wallet_address"),
    walletSource: decodeEnum(row, "wallet_source", WALLET_SOURCES),
  };
};

const mapEvidenceRow = (raw: unknown): CampaignDbTaskEvidenceRecord => {
  const row = decodeRow(raw);
  const completionId = decodeOptionalString(row, "completion_id");
  const evidenceRef = decodeOptionalString(row, "evidence_ref");

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
    liveProviderExecuted: decodeFalse(row, "live_provider_executed"),
    liveRewardExecuted: decodeFalse(row, "live_reward_executed"),
    liveStorageExecuted: decodeFalse(row, "live_storage_executed"),
    pointsAwarded: decodeInteger(row, "points_awarded"),
    status: decodeEnum(row, "status", COMPLETION_STATUSES),
    taskId: decodeString(row, "task_id"),
    updatedAt: decodeTimestamp(row, "updated_at"),
    walletAddress: decodeString(row, "wallet_address"),
    walletSource: decodeEnum(row, "wallet_source", WALLET_SOURCES),
  };
};

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
  boundedListLimit: requestedBoundedListLimit,
  ownsPool = true,
  pool,
  schemaVersion = DEFAULT_SCHEMA_VERSION,
}: CreatePostgresCampaignDurableStoreOptions): CampaignDurableStore => {
  const boundedListLimit = normalizeBoundedLimit(requestedBoundedListLimit);
  let closed = false;
  let closePromise: Promise<void> | undefined;

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
  ) => queryWith(pool, operation, sql, values, context);

  const close = (): Promise<void> => {
    if (closePromise) {
      return closePromise;
    }

    closed = true;
    closePromise = (async () => {
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
    const result = await queryWith(
      queryable,
      operation,
      `
        INSERT INTO campaign_os.campaign_participants (${PARTICIPANT_COLUMNS})
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14)
        ON CONFLICT (campaign_id, wallet_address) DO UPDATE SET
          account_type = EXCLUDED.account_type,
          wallet_source = EXCLUDED.wallet_source,
          wallet_type_verified = EXCLUDED.wallet_type_verified,
          wallet_signature_status = EXCLUDED.wallet_signature_status,
          wallet_verified_at = EXCLUDED.wallet_verified_at,
          locale_preference = EXCLUDED.locale_preference,
          total_points = EXCLUDED.total_points,
          rank = EXCLUDED.rank,
          risk_flags = EXCLUDED.risk_flags,
          updated_at = EXCLUDED.updated_at
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
    const result = await queryWith(
      queryable,
      operation,
      `
        INSERT INTO campaign_os.campaign_task_completions (${COMPLETION_COLUMNS})
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (campaign_id, task_id, wallet_address) DO UPDATE SET
          account_type = EXCLUDED.account_type,
          wallet_source = EXCLUDED.wallet_source,
          status = EXCLUDED.status,
          evidence_source = EXCLUDED.evidence_source,
          evidence_id = EXCLUDED.evidence_id,
          evidence_hash = EXCLUDED.evidence_hash,
          points_awarded = EXCLUDED.points_awarded,
          completed_at = EXCLUDED.completed_at,
          updated_at = EXCLUDED.updated_at
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
    const result = await queryWith(
      queryable,
      operation,
      `
        INSERT INTO campaign_os.campaign_task_evidence (${EVIDENCE_COLUMNS})
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12::jsonb, $13, $14, $15, $16, $17, $18, $19, $20
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
          updated_at = EXCLUDED.updated_at
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
      ],
      context,
    );

    return requiredOne(result.rows, mapEvidenceRow, operation, result.traceId);
  };

  const cleanupError = (
    traceId: string,
  ) => new PostgresCampaignStoreError({
    code: "POSTGRES_CAMPAIGN_STORE_CLEANUP_FAILED",
    field: "transaction",
    operation: "upsertTaskVerification",
    traceId,
  });

  const upsertTaskVerification = async (
    input: CampaignDurableStoreTaskVerificationWrite,
    context?: CampaignDurableStoreOperationContext,
  ): Promise<CampaignDurableStoreTaskVerificationResult> => {
    const operation = "upsertTaskVerification" as const;
    const traceId = resolveTraceId(context, operation);
    ensureOpen(operation, traceId);

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
      const participant = await upsertParticipantWith(
        client,
        {
          ...input.participant,
          totalPoints: decodeCount(pointsRow, "total_points"),
        },
        { traceId },
        operation,
      );

      await queryWith(client, operation, "COMMIT", [], { traceId });

      return { completion, evidence, participant };
    } catch (error) {
      try {
        await queryWith(client, operation, "ROLLBACK", [], { traceId });
      } catch {
        throw cleanupError(traceId);
      }

      throw error;
    } finally {
      try {
        client.release();
      } catch {
        throw cleanupError(traceId);
      }
    }
  };

  return {
    close,
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
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10)
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
      >;

      try {
        counts = {
          completionRecordCount: decodeCount(row, "completion_count"),
          participantRecordCount: decodeCount(row, "participant_count"),
          recordCount: decodeCount(row, "campaign_count"),
          referralBindingRecordCount: decodeCount(row, "referral_binding_count"),
          taskEvidenceRecordCount: decodeCount(row, "task_evidence_count"),
          taskRecordCount: decodeCount(row, "task_count"),
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
      ensureOpen("reset", traceId);

      if (!allowTestReset) {
        throw new PostgresCampaignStoreError({
          code: "POSTGRES_CAMPAIGN_STORE_RESET_FORBIDDEN",
          field: "allowTestReset",
          operation: "reset",
          traceId,
        });
      }

      await query(
        "reset",
        `
          TRUNCATE TABLE
            campaign_os.campaign_task_evidence,
            campaign_os.campaign_task_completions,
            campaign_os.campaign_referral_bindings,
            campaign_os.campaign_participants,
            campaign_os.campaign_tasks,
            campaign_os.campaigns
        `,
        [],
        { traceId },
      );
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
