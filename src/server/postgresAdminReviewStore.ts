import { createHash, randomUUID } from "node:crypto";
import {
  ADMIN_ARTIFACT_SOURCE_VERSION,
  ADMIN_REVIEW_MAX_ARTIFACT_BYTES,
  ADMIN_REVIEW_MAX_ARTIFACT_ROWS,
  ADMIN_REVIEW_MAX_LIST_LIMIT,
  ADMIN_REVIEW_MAX_SOURCE_MANIFEST_BYTES,
  ADMIN_REVIEW_MIGRATION_ID,
  AdminReviewStoreError,
  deriveAdminReviewDecisionPayloadHash,
  type AdminExportArtifactContent,
  type AdminExportArtifactDetail,
  type AdminExportArtifactInput,
  type AdminExportArtifactListInput,
  type AdminExportArtifactMetadata,
  type AdminExportArtifactProjection,
  type AdminExportArtifactProjectionInput,
  type AdminExportArtifactProjector,
  type AdminExportArtifactResult,
  type AdminExportArtifactScope,
  type AdminReviewCampaignRow,
  type AdminReviewCompletionRow,
  type AdminReviewDecisionRecord,
  type AdminReviewDecisionResult,
  type AdminReviewDecisionInput,
  type AdminReviewDecisionListInput,
  type AdminReviewDecisionScope,
  type AdminReviewEvidenceRow,
  type AdminReviewJsonObject,
  type AdminReviewJsonValue,
  type AdminReviewOperationContext,
  type AdminReviewParticipantRow,
  type AdminReviewRankingRow,
  type AdminReviewSnapshotInput,
  type AdminReviewSnapshotProjector,
  type AdminReviewSnapshotRows,
  type AdminReviewStore,
  type AdminReviewStoreOperation,
  type AdminReviewTaskRow,
} from "./adminReviewStore";

const TRACE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const SAFE_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;
const SAFE_FILE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,254}$/;
const IDENTIFIER_MAX_LENGTH = 160;
const SUBJECT_MAX_LENGTH = 256;
const SNAPSHOT_PAGE_SIZE = 100;
const MAX_TRANSACTION_WRITE_ATTEMPTS = 64;

const CAMPAIGN_STATUSES = [
  "draft",
  "ai_draft",
  "human_review",
  "scheduled",
  "live",
  "paused",
  "ended",
  "exported",
  "archived",
] as const;
const ACCOUNT_TYPES = ["AA", "EOA", "UNKNOWN"] as const;
const WALLET_SOURCES = [
  "PORTKEY_AA",
  "PORTKEY_EOA_APP",
  "PORTKEY_EOA_EXTENSION",
  "NIGHTELF",
  "AGENT_SKILL",
  "OTHER",
] as const;
const WALLET_POLICIES = ["ANY", "AA_ONLY", "EOA_ONLY"] as const;
const CONTRACT_MODES = ["OFF_CHAIN_MVP", "V2_COMPANION", "CONTRACT_CLAIM"] as const;
const VERIFICATION_TYPES = ["WALLET", "ON_CHAIN", "DAPP_API", "SOCIAL", "MANUAL"] as const;
const COMPLETION_STATUSES = ["pending", "completed", "failed", "manual_review"] as const;
const EVIDENCE_SOURCES = ["AEFINDER", "AELFSCAN", "DAPP_API", "SOCIAL_API", "MANUAL"] as const;

const CAMPAIGN_SNAPSHOT_COLUMNS = `
  id,
  status,
  wallet_policy,
  contract_mode,
  start_time,
  end_time,
  updated_at
`;
const TASK_SNAPSHOT_COLUMNS = `
  id,
  campaign_id,
  verification_type,
  wallet_compatibility,
  points,
  required,
  updated_at
`;
const PARTICIPANT_SNAPSHOT_COLUMNS = `
  id,
  campaign_id,
  wallet_address,
  account_type,
  wallet_source,
  wallet_type_verified,
  total_points,
  rank,
  risk_flags,
  created_at,
  updated_at
`;
const COMPLETION_SNAPSHOT_COLUMNS = `
  id,
  campaign_id,
  task_id,
  wallet_address,
  account_type,
  wallet_source,
  status,
  points_awarded,
  completed_at,
  updated_at
`;
const EVIDENCE_SNAPSHOT_COLUMNS = `
  id,
  campaign_id,
  task_id,
  wallet_address,
  completion_id,
  status,
  evidence_source,
  evidence_hash,
  evidence_ref,
  diagnostic_codes,
  points_awarded,
  captured_at,
  updated_at
`;
const DECISION_COLUMNS = `
  id,
  campaign_id,
  participant_id,
  wallet_address,
  version,
  decision,
  snapshot_version,
  snapshot_fingerprint,
  snapshot_manifest,
  reason_code,
  note,
  operator_subject,
  operator_role,
  idempotency_key_hash,
  payload_hash,
  trace_id,
  decided_at
`;
const DECISION_READ_COLUMNS = `
  decision_record.id,
  decision_record.campaign_id,
  decision_record.participant_id,
  decision_record.wallet_address,
  decision_record.version,
  decision_record.decision,
  decision_record.snapshot_version,
  decision_record.snapshot_fingerprint,
  decision_record.snapshot_manifest,
  decision_record.reason_code,
  decision_record.note,
  decision_record.operator_subject,
  decision_record.operator_role,
  decision_record.idempotency_key_hash,
  decision_record.payload_hash,
  decision_record.trace_id,
  decision_record.decided_at,
  EXISTS (
    SELECT 1
    FROM campaign_os.campaign_participants AS decision_owner
    WHERE decision_owner.campaign_id = decision_record.campaign_id
      AND decision_owner.id = decision_record.participant_id
      AND decision_owner.wallet_address = decision_record.wallet_address
  ) AS ownership_valid
`;
const ARTIFACT_METADATA_COLUMNS = `
  id,
  campaign_id,
  source_version,
  source_fingerprint,
  format,
  row_count,
  content_hash,
  content_bytes,
  file_name,
  mime_type,
  creator_subject,
  creator_role,
  trace_id,
  created_at
`;
const ARTIFACT_DETAIL_COLUMNS = `
  ${ARTIFACT_METADATA_COLUMNS},
  source_manifest
`;
const ARTIFACT_CONTENT_COLUMNS = `
  ${ARTIFACT_DETAIL_COLUMNS},
  content
`;

export interface PostgresAdminReviewStoreQueryResult {
  rows: Array<Record<string, unknown>>;
}

export interface PostgresAdminReviewStoreClient {
  query(
    text: string,
    values?: readonly unknown[],
  ): Promise<PostgresAdminReviewStoreQueryResult>;
  release(destroy?: boolean): void;
}

export interface PostgresAdminReviewStorePool {
  connect(): Promise<PostgresAdminReviewStoreClient>;
  end(): Promise<void>;
  query(
    text: string,
    values?: readonly unknown[],
  ): Promise<PostgresAdminReviewStoreQueryResult>;
}

export interface CreatePostgresAdminReviewStoreOptions {
  boundedListLimit: number;
  expectedMigration: {
    checksum: string;
    id: string;
  };
  ownsPool: boolean;
  pool: PostgresAdminReviewStorePool;
}

const storeError = (
  code: ConstructorParameters<typeof AdminReviewStoreError>[0]["code"],
  field: string,
  operation: AdminReviewStoreOperation,
  traceId: string,
) => new AdminReviewStoreError({ code, field, operation, traceId });

class RowDecodeError extends Error {
  constructor(readonly field: string) {
    super("PostgreSQL Admin review row is invalid.");
    this.name = "RowDecodeError";
  }
}

class ContentIntegrityError extends Error {
  constructor(readonly field: string) {
    super("PostgreSQL Admin review artifact integrity is invalid.");
    this.name = "ContentIntegrityError";
  }
}

type DbRow = Record<string, unknown>;

const rowError = (field: string): never => {
  throw new RowDecodeError(field);
};

const isPlainRecord = (value: unknown): value is DbRow => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
};

const decodeRow = (value: unknown): DbRow => isPlainRecord(value) ? value : rowError("row");

const readField = (row: DbRow, field: string) =>
  Object.prototype.hasOwnProperty.call(row, field) ? row[field] : rowError(field);

const decodeStringValue = (
  value: unknown,
  field: string,
  maximum = 2_048,
): string => {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length > maximum
    || value !== value.trim()
  ) {
    return rowError(field);
  }

  return value;
};

const decodeString = (row: DbRow, field: string, maximum?: number) =>
  decodeStringValue(readField(row, field), field, maximum);

const decodeOptionalString = (row: DbRow, field: string, maximum?: number) => {
  const value = readField(row, field);

  return value === null ? undefined : decodeStringValue(value, field, maximum);
};

const decodeText = (row: DbRow, field: string, maximumBytes: number): string => {
  const value = readField(row, field);

  if (typeof value !== "string" || Buffer.byteLength(value, "utf8") > maximumBytes) {
    return rowError(field);
  }

  return value;
};

const hasValidUnicode = (value: string) => {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);

    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) {
        return false;
      }
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return false;
    }
  }

  return true;
};

const decodeEnum = <T extends string>(
  row: DbRow,
  field: string,
  allowed: readonly T[],
): T => {
  const value = decodeString(row, field, 64);

  return allowed.includes(value as T) ? value as T : rowError(field);
};

const decodeIntegerValue = (value: unknown, field: string, minimum = 0): number => {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) {
    return rowError(field);
  }

  return value;
};

const decodeInteger = (row: DbRow, field: string, minimum = 0) =>
  decodeIntegerValue(readField(row, field), field, minimum);

const decodeOptionalInteger = (row: DbRow, field: string, minimum = 0) => {
  const value = readField(row, field);

  return value === null ? undefined : decodeIntegerValue(value, field, minimum);
};

const decodeBoolean = (row: DbRow, field: string) => {
  const value = readField(row, field);

  return typeof value === "boolean" ? value : rowError(field);
};

const decodeTimestampValue = (value: unknown, field: string): string => {
  if (!(value instanceof Date) && typeof value !== "string") {
    return rowError(field);
  }

  const timestamp = value instanceof Date ? value : new Date(value);

  return Number.isFinite(timestamp.getTime()) ? timestamp.toISOString() : rowError(field);
};

const decodeTimestamp = (row: DbRow, field: string) =>
  decodeTimestampValue(readField(row, field), field);

const decodeOptionalTimestamp = (row: DbRow, field: string) => {
  const value = readField(row, field);

  return value === null ? undefined : decodeTimestampValue(value, field);
};

const decodeStringArray = (
  row: DbRow,
  field: string,
  maximumItems = 100,
): readonly string[] => {
  const value = readField(row, field);

  if (!Array.isArray(value) || value.length > maximumItems) {
    return rowError(field);
  }

  return value.map((item) => decodeStringValue(item, field, 256));
};

const isJsonValue = (
  value: unknown,
  seen: WeakSet<object>,
  depth = 0,
): value is AdminReviewJsonValue => {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return true;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (typeof value !== "object" || depth > 32 || seen.has(value)) {
    return false;
  }

  seen.add(value);
  const valid = Array.isArray(value)
    ? value.length <= 50_000
      && value.every((item) => isJsonValue(item, seen, depth + 1))
    : isPlainRecord(value)
      && Object.keys(value).length <= 50_000
      && Object.entries(value).every(([key, item]) =>
        key.length > 0
        && key.length <= 256
        && isJsonValue(item, seen, depth + 1));
  seen.delete(value);

  return valid;
};

const decodeJsonObject = (
  row: DbRow,
  field: string,
  maximumBytes: number,
): AdminReviewJsonObject => {
  const value = readField(row, field);

  if (!isPlainRecord(value) || !isJsonValue(value, new WeakSet())) {
    return rowError(field);
  }

  let encoded: string;
  try {
    encoded = JSON.stringify(value);
  } catch {
    return rowError(field);
  }

  if (Buffer.byteLength(encoded, "utf8") > maximumBytes) {
    return rowError(field);
  }

  return value as AdminReviewJsonObject;
};

const encodeJsonObject = (
  value: unknown,
  field: string,
  maximumBytes: number,
  operation: AdminReviewStoreOperation,
  traceId: string,
): string => {
  if (!isPlainRecord(value) || !isJsonValue(value, new WeakSet())) {
    throw storeError("ADMIN_REVIEW_STORE_ARGUMENT_INVALID", field, operation, traceId);
  }

  try {
    const encoded = JSON.stringify(value);

    if (Buffer.byteLength(encoded, "utf8") <= maximumBytes) {
      return encoded;
    }
  } catch {
    // The typed error deliberately excludes the original value and serializer error.
  }

  throw storeError("ADMIN_REVIEW_STORE_BOUND_EXCEEDED", field, operation, traceId);
};

const canonicalJson = (value: AdminReviewJsonValue): string => {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }

  const record = value as Readonly<Record<string, AdminReviewJsonValue>>;

  return `{${Object.keys(record).sort().map((key) =>
    `${JSON.stringify(key)}:${canonicalJson(record[key]!)}`).join(",")}}`;
};

const decodeCount = (row: DbRow, field: string): number => {
  const value = readField(row, field);
  const normalized = typeof value === "number"
    ? value
    : typeof value === "string" && /^(0|[1-9]\d*)$/.test(value)
      ? Number(value)
      : Number.NaN;

  return Number.isSafeInteger(normalized) && normalized >= 0
    ? normalized
    : rowError(field);
};

const mapCampaignRow = (value: unknown): AdminReviewCampaignRow => {
  const row = decodeRow(value);
  const startTime = decodeTimestamp(row, "start_time");
  const endTime = decodeTimestamp(row, "end_time");

  if (Date.parse(startTime) >= Date.parse(endTime)) {
    return rowError("end_time");
  }

  return {
    contractMode: decodeEnum(row, "contract_mode", CONTRACT_MODES),
    endTime,
    id: decodeString(row, "id", IDENTIFIER_MAX_LENGTH),
    startTime,
    status: decodeEnum(row, "status", CAMPAIGN_STATUSES),
    updatedAt: decodeTimestamp(row, "updated_at"),
    walletPolicy: decodeEnum(row, "wallet_policy", WALLET_POLICIES),
  };
};

const mapTaskRow = (value: unknown): AdminReviewTaskRow => {
  const row = decodeRow(value);

  return {
    campaignId: decodeString(row, "campaign_id", IDENTIFIER_MAX_LENGTH),
    id: decodeString(row, "id", IDENTIFIER_MAX_LENGTH),
    points: decodeInteger(row, "points"),
    required: decodeBoolean(row, "required"),
    updatedAt: decodeTimestamp(row, "updated_at"),
    verificationType: decodeEnum(row, "verification_type", VERIFICATION_TYPES),
    walletCompatibility: decodeEnum(row, "wallet_compatibility", WALLET_POLICIES),
  };
};

const mapParticipantRow = (value: unknown): AdminReviewParticipantRow => {
  const row = decodeRow(value);

  return {
    accountType: decodeEnum(row, "account_type", ACCOUNT_TYPES),
    campaignId: decodeString(row, "campaign_id", IDENTIFIER_MAX_LENGTH),
    createdAt: decodeTimestamp(row, "created_at"),
    id: decodeString(row, "id", IDENTIFIER_MAX_LENGTH),
    rank: decodeOptionalInteger(row, "rank", 1),
    riskFlags: decodeStringArray(row, "risk_flags"),
    totalPoints: decodeInteger(row, "total_points"),
    updatedAt: decodeTimestamp(row, "updated_at"),
    walletAddress: decodeString(row, "wallet_address", SUBJECT_MAX_LENGTH),
    walletSource: decodeEnum(row, "wallet_source", WALLET_SOURCES),
    walletTypeVerified: decodeBoolean(row, "wallet_type_verified"),
  };
};

const mapCompletionRow = (value: unknown): AdminReviewCompletionRow => {
  const row = decodeRow(value);
  const status = decodeEnum(row, "status", COMPLETION_STATUSES);
  const completedAt = decodeOptionalTimestamp(row, "completed_at");

  if (status === "completed" && completedAt === undefined) {
    return rowError("completed_at");
  }

  return {
    accountType: decodeEnum(row, "account_type", ACCOUNT_TYPES),
    campaignId: decodeString(row, "campaign_id", IDENTIFIER_MAX_LENGTH),
    completedAt,
    id: decodeString(row, "id", IDENTIFIER_MAX_LENGTH),
    pointsAwarded: decodeInteger(row, "points_awarded"),
    status,
    taskId: decodeString(row, "task_id", IDENTIFIER_MAX_LENGTH),
    updatedAt: decodeTimestamp(row, "updated_at"),
    walletAddress: decodeString(row, "wallet_address", SUBJECT_MAX_LENGTH),
    walletSource: decodeEnum(row, "wallet_source", WALLET_SOURCES),
  };
};

const mapEvidenceRow = (value: unknown): AdminReviewEvidenceRow => {
  const row = decodeRow(value);

  return {
    campaignId: decodeString(row, "campaign_id", IDENTIFIER_MAX_LENGTH),
    capturedAt: decodeTimestamp(row, "captured_at"),
    completionId: decodeOptionalString(row, "completion_id", IDENTIFIER_MAX_LENGTH),
    diagnosticCodes: decodeStringArray(row, "diagnostic_codes"),
    evidenceHash: decodeString(row, "evidence_hash", 512),
    evidenceRef: decodeOptionalString(row, "evidence_ref", 2_048),
    evidenceSource: decodeEnum(row, "evidence_source", EVIDENCE_SOURCES),
    id: decodeString(row, "id", IDENTIFIER_MAX_LENGTH),
    pointsAwarded: decodeInteger(row, "points_awarded"),
    status: decodeEnum(row, "status", COMPLETION_STATUSES),
    taskId: decodeString(row, "task_id", IDENTIFIER_MAX_LENGTH),
    updatedAt: decodeTimestamp(row, "updated_at"),
    walletAddress: decodeString(row, "wallet_address", SUBJECT_MAX_LENGTH),
  };
};

const mapRankingRow = (value: unknown): AdminReviewRankingRow => {
  const row = decodeRow(value);

  return {
    campaignId: decodeString(row, "campaign_id", IDENTIFIER_MAX_LENGTH),
    createdAt: decodeTimestamp(row, "created_at"),
    participantId: decodeString(row, "participant_id", IDENTIFIER_MAX_LENGTH),
    rank: decodeOptionalInteger(row, "rank", 1),
    totalPoints: decodeInteger(row, "total_points"),
    walletAddress: decodeString(row, "wallet_address", SUBJECT_MAX_LENGTH),
  };
};

const mapDecisionRow = (value: unknown): AdminReviewDecisionRecord => {
  const row = decodeRow(value);
  const snapshotFingerprint = decodeString(row, "snapshot_fingerprint", 64);
  const idempotencyKeyHash = decodeString(row, "idempotency_key_hash", 64);
  const payloadHash = decodeString(row, "payload_hash", 64);
  const traceId = decodeString(row, "trace_id", 128);

  if (
    !SHA256_PATTERN.test(snapshotFingerprint)
    || !SHA256_PATTERN.test(idempotencyKeyHash)
    || !SHA256_PATTERN.test(payloadHash)
  ) {
    return rowError("hash");
  }
  if (!TRACE_ID_PATTERN.test(traceId)) {
    return rowError("trace_id");
  }
  if (decodeString(row, "snapshot_version", 64) !== "review-snapshot-v1") {
    return rowError("snapshot_version");
  }

  const record: AdminReviewDecisionRecord = {
    campaignId: decodeString(row, "campaign_id", IDENTIFIER_MAX_LENGTH),
    decidedAt: decodeTimestamp(row, "decided_at"),
    decision: decodeEnum(row, "decision", ["approved", "rejected", "needs_review"] as const),
    id: decodeString(row, "id", IDENTIFIER_MAX_LENGTH),
    idempotencyKeyHash,
    note: decodeOptionalString(row, "note", 1_000),
    operatorRole: decodeEnum(row, "operator_role", ["internal_operator", "review_operator"] as const),
    operatorSubject: decodeString(row, "operator_subject", SUBJECT_MAX_LENGTH),
    participantId: decodeString(row, "participant_id", IDENTIFIER_MAX_LENGTH),
    payloadHash,
    reasonCode: decodeString(row, "reason_code", 64),
    snapshotFingerprint,
    snapshotManifest: decodeJsonObject(row, "snapshot_manifest", 1_048_576),
    snapshotVersion: "review-snapshot-v1",
    traceId,
    version: decodeInteger(row, "version", 1),
    walletAddress: decodeString(row, "wallet_address", SUBJECT_MAX_LENGTH),
  };

  if (record.payloadHash !== deriveAdminReviewDecisionPayloadHash({
    campaignId: record.campaignId,
    decision: record.decision,
    expectedSnapshotFingerprint: record.snapshotFingerprint,
    note: record.note,
    operatorRole: record.operatorRole,
    operatorSubject: record.operatorSubject,
    participantId: record.participantId,
    reasonCode: record.reasonCode,
  })) {
    return rowError("payload_hash");
  }

  return record;
};

const validateArtifactMetadataIntegrity = (artifact: AdminExportArtifactMetadata) => {
  const expectedMimeType = artifact.format === "csv"
    ? "text/csv;charset=utf-8"
    : "application/json;charset=utf-8";

  if (artifact.mimeType !== expectedMimeType) {
    throw new ContentIntegrityError("mimeType");
  }
  if (!artifact.fileName.endsWith(`.${artifact.format}`)) {
    throw new ContentIntegrityError("fileName");
  }
};

const mapArtifactMetadataRow = (value: unknown): AdminExportArtifactMetadata => {
  const row = decodeRow(value);
  const sourceVersion = decodeString(row, "source_version", 64);
  const sourceFingerprint = decodeString(row, "source_fingerprint", 64);
  const contentHash = decodeString(row, "content_hash", 64);
  const fileName = decodeString(row, "file_name", 255);
  const traceId = decodeString(row, "trace_id", 128);
  const rowCount = decodeInteger(row, "row_count");
  const contentBytes = decodeInteger(row, "content_bytes");

  if (sourceVersion !== ADMIN_ARTIFACT_SOURCE_VERSION) {
    return rowError("source_version");
  }
  if (!SHA256_PATTERN.test(sourceFingerprint) || !SHA256_PATTERN.test(contentHash)) {
    return rowError("hash");
  }
  if (!TRACE_ID_PATTERN.test(traceId)) {
    return rowError("trace_id");
  }
  if (
    !SAFE_FILE_NAME_PATTERN.test(fileName)
    || fileName === "."
    || fileName === ".."
  ) {
    return rowError("file_name");
  }
  if (rowCount > ADMIN_REVIEW_MAX_ARTIFACT_ROWS) {
    return rowError("row_count");
  }
  if (contentBytes > ADMIN_REVIEW_MAX_ARTIFACT_BYTES) {
    return rowError("content_bytes");
  }

  const artifact: AdminExportArtifactMetadata = {
    campaignId: decodeString(row, "campaign_id", IDENTIFIER_MAX_LENGTH),
    contentBytes,
    contentHash,
    createdAt: decodeTimestamp(row, "created_at"),
    creatorRole: decodeEnum(row, "creator_role", ["internal_operator", "review_operator"] as const),
    creatorSubject: decodeString(row, "creator_subject", SUBJECT_MAX_LENGTH),
    fileName,
    format: decodeEnum(row, "format", ["csv", "json"] as const),
    id: decodeString(row, "id", IDENTIFIER_MAX_LENGTH),
    mimeType: decodeEnum(
      row,
      "mime_type",
      ["text/csv;charset=utf-8", "application/json;charset=utf-8"] as const,
    ),
    rowCount,
    sourceFingerprint,
    sourceVersion: ADMIN_ARTIFACT_SOURCE_VERSION,
    traceId,
  };
  validateArtifactMetadataIntegrity(artifact);

  return artifact;
};

const mapArtifactDetailRow = (value: unknown): AdminExportArtifactDetail => {
  const row = decodeRow(value);

  return {
    artifact: mapArtifactMetadataRow(row),
    sourceManifest: decodeJsonObject(row, "source_manifest", 2_097_152),
  };
};

const mapArtifactContentRow = (value: unknown): AdminExportArtifactContent => {
  const row = decodeRow(value);
  const detail = mapArtifactDetailRow(row);
  const content = decodeText(row, "content", ADMIN_REVIEW_MAX_ARTIFACT_BYTES);
  const actualBytes = Buffer.byteLength(content, "utf8");
  const actualHash = createHash("sha256").update(content, "utf8").digest("hex");

  if (!hasValidUnicode(content)) {
    throw new ContentIntegrityError("content");
  }
  if (actualBytes !== detail.artifact.contentBytes) {
    throw new ContentIntegrityError("contentBytes");
  }
  if (actualHash !== detail.artifact.contentHash) {
    throw new ContentIntegrityError("contentHash");
  }

  return { ...detail, content };
};

const mapRows = <T>(rows: readonly unknown[], mapper: (row: unknown) => T): T[] =>
  rows.map((row) => mapper(row));

const optionalOne = <T>(rows: readonly unknown[], mapper: (row: unknown) => T): T | undefined => {
  if (rows.length > 1) {
    return rowError("rowCount");
  }

  return rows.length === 0 ? undefined : mapper(rows[0]);
};

const driverCode = (error: unknown) => {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }

  const code = (error as { code?: unknown }).code;

  return typeof code === "string" ? code : undefined;
};

const mapDriverError = (
  error: unknown,
  operation: AdminReviewStoreOperation,
  traceId: string,
) => {
  const code = driverCode(error);

  if (code === "42P01" || code === "3F000") {
    return storeError("ADMIN_REVIEW_STORE_SCHEMA_NOT_READY", "schema", operation, traceId);
  }
  if (typeof code === "string" && code.startsWith("23")) {
    return storeError("ADMIN_REVIEW_STORE_CONSTRAINT_FAILED", "database", operation, traceId);
  }

  return storeError("ADMIN_REVIEW_STORE_QUERY_FAILED", "database", operation, traceId);
};

const resolveTraceId = (
  context: AdminReviewOperationContext | undefined,
  operation: AdminReviewStoreOperation,
) => {
  if (!context || typeof context.traceId !== "string" || !TRACE_ID_PATTERN.test(context.traceId)) {
    throw storeError(
      "ADMIN_REVIEW_STORE_ARGUMENT_INVALID",
      "traceId",
      operation,
      "trace-invalid",
    );
  }

  return context.traceId;
};

const validateBoundedString = (
  value: unknown,
  field: string,
  maximum: number,
  operation: AdminReviewStoreOperation,
  traceId: string,
) => {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length > maximum
    || value !== value.trim()
  ) {
    throw storeError(
      "ADMIN_REVIEW_STORE_ARGUMENT_INVALID",
      field,
      operation,
      traceId,
    );
  }

  return value;
};

const validateSha256 = (
  value: unknown,
  field: string,
  operation: AdminReviewStoreOperation,
  traceId: string,
) => {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    throw storeError(
      "ADMIN_REVIEW_STORE_ARGUMENT_INVALID",
      field,
      operation,
      traceId,
    );
  }

  return value;
};

const validateLimit = (
  value: unknown,
  fallback: number,
  operation: AdminReviewStoreOperation,
  traceId: string,
) => {
  const limit = value === undefined ? fallback : value;

  if (
    typeof limit !== "number"
    || !Number.isSafeInteger(limit)
    || limit < 1
    || limit > ADMIN_REVIEW_MAX_LIST_LIMIT
  ) {
    throw storeError(
      "ADMIN_REVIEW_STORE_ARGUMENT_INVALID",
      "limit",
      operation,
      traceId,
    );
  }

  return limit;
};

const validateSnapshotInput = (
  input: AdminReviewSnapshotInput,
  operation: AdminReviewStoreOperation,
  traceId: string,
) => {
  validateBoundedString(input?.campaignId, "campaignId", IDENTIFIER_MAX_LENGTH, operation, traceId);
  if (input.participantId !== undefined) {
    validateBoundedString(
      input.participantId,
      "participantId",
      IDENTIFIER_MAX_LENGTH,
      operation,
      traceId,
    );
  }
};

const validateDecisionScope = (
  input: AdminReviewDecisionScope,
  operation: AdminReviewStoreOperation,
  traceId: string,
) => {
  validateBoundedString(input?.campaignId, "campaignId", IDENTIFIER_MAX_LENGTH, operation, traceId);
  validateBoundedString(
    input?.participantId,
    "participantId",
    IDENTIFIER_MAX_LENGTH,
    operation,
    traceId,
  );
};

const validateDecisionInput = (
  input: AdminReviewDecisionInput,
  operation: AdminReviewStoreOperation,
  traceId: string,
) => {
  validateDecisionScope(input, operation, traceId);
  if (!(["approved", "rejected", "needs_review"] as const).includes(input.decision)) {
    throw storeError("ADMIN_REVIEW_STORE_ARGUMENT_INVALID", "decision", operation, traceId);
  }
  validateSha256(
    input.expectedSnapshotFingerprint,
    "expectedSnapshotFingerprint",
    operation,
    traceId,
  );
  validateSha256(input.idempotencyKeyHash, "idempotencyKeyHash", operation, traceId);
  validateBoundedString(
    input.operatorSubject,
    "operatorSubject",
    SUBJECT_MAX_LENGTH,
    operation,
    traceId,
  );
  if (!(["internal_operator", "review_operator"] as const).includes(input.operatorRole)) {
    throw storeError("ADMIN_REVIEW_STORE_ARGUMENT_INVALID", "operatorRole", operation, traceId);
  }
  if (typeof input.reasonCode !== "string" || !SAFE_CODE_PATTERN.test(input.reasonCode)) {
    throw storeError("ADMIN_REVIEW_STORE_ARGUMENT_INVALID", "reasonCode", operation, traceId);
  }
  if (
    input.note !== undefined
    && (
      typeof input.note !== "string"
      || input.note.length > 1_000
      || /[\u0000-\u001f\u007f]/.test(input.note)
    )
  ) {
    throw storeError("ADMIN_REVIEW_STORE_ARGUMENT_INVALID", "note", operation, traceId);
  }
};

const validateArtifactScope = (
  input: AdminExportArtifactScope,
  operation: AdminReviewStoreOperation,
  traceId: string,
) => {
  validateBoundedString(input?.campaignId, "campaignId", IDENTIFIER_MAX_LENGTH, operation, traceId);
  validateBoundedString(input?.artifactId, "artifactId", IDENTIFIER_MAX_LENGTH, operation, traceId);
};

const validateArtifactListInput = (
  input: AdminExportArtifactListInput,
  fallbackLimit: number,
  operation: AdminReviewStoreOperation,
  traceId: string,
) => {
  validateBoundedString(input?.campaignId, "campaignId", IDENTIFIER_MAX_LENGTH, operation, traceId);
  validateLimit(input.limit, fallbackLimit, operation, traceId);
};

const validateArtifactInput = (
  input: AdminExportArtifactInput,
  operation: AdminReviewStoreOperation,
  traceId: string,
) => {
  validateBoundedString(input?.campaignId, "campaignId", IDENTIFIER_MAX_LENGTH, operation, traceId);
  validateSha256(input.sourceFingerprint, "sourceFingerprint", operation, traceId);
  validateSha256(input.contentHash, "contentHash", operation, traceId);
  validateBoundedString(
    input.creatorSubject,
    "creatorSubject",
    SUBJECT_MAX_LENGTH,
    operation,
    traceId,
  );
  if (input.sourceVersion !== ADMIN_ARTIFACT_SOURCE_VERSION) {
    throw storeError("ADMIN_REVIEW_STORE_ARGUMENT_INVALID", "sourceVersion", operation, traceId);
  }
  if (!(["csv", "json"] as const).includes(input.format)) {
    throw storeError("ADMIN_REVIEW_STORE_ARGUMENT_INVALID", "format", operation, traceId);
  }
  if (!(["internal_operator", "review_operator"] as const).includes(input.creatorRole)) {
    throw storeError("ADMIN_REVIEW_STORE_ARGUMENT_INVALID", "creatorRole", operation, traceId);
  }
  if (
    typeof input.rowCount !== "number"
    || !Number.isSafeInteger(input.rowCount)
    || input.rowCount < 0
    || input.rowCount > ADMIN_REVIEW_MAX_ARTIFACT_ROWS
  ) {
    throw storeError("ADMIN_REVIEW_STORE_BOUND_EXCEEDED", "rowCount", operation, traceId);
  }
  if (
    typeof input.content !== "string"
    || Buffer.byteLength(input.content, "utf8") > ADMIN_REVIEW_MAX_ARTIFACT_BYTES
  ) {
    throw storeError("ADMIN_REVIEW_STORE_BOUND_EXCEEDED", "content", operation, traceId);
  }
  if (!hasValidUnicode(input.content)) {
    throw storeError("ADMIN_REVIEW_STORE_ARGUMENT_INVALID", "content", operation, traceId);
  }
  const calculatedContentHash = createHash("sha256")
    .update(input.content, "utf8")
    .digest("hex");
  if (calculatedContentHash !== input.contentHash) {
    throw storeError(
      "ADMIN_REVIEW_STORE_CONTENT_INTEGRITY_FAILED",
      "contentHash",
      operation,
      traceId,
    );
  }
  if (
    typeof input.fileName !== "string"
    || !SAFE_FILE_NAME_PATTERN.test(input.fileName)
    || input.fileName === "."
    || input.fileName === ".."
  ) {
    throw storeError("ADMIN_REVIEW_STORE_ARGUMENT_INVALID", "fileName", operation, traceId);
  }
  const expectedMime = input.format === "csv"
    ? "text/csv;charset=utf-8"
    : "application/json;charset=utf-8";
  if (
    input.mimeType !== expectedMime
    || !input.fileName.endsWith(`.${input.format}`)
  ) {
    throw storeError("ADMIN_REVIEW_STORE_ARGUMENT_INVALID", "mimeType", operation, traceId);
  }
};

const validateArtifactProjectionInput = (
  input: AdminExportArtifactProjectionInput,
  operation: AdminReviewStoreOperation,
  traceId: string,
) => {
  validateBoundedString(input?.campaignId, "campaignId", IDENTIFIER_MAX_LENGTH, operation, traceId);
  validateBoundedString(
    input?.creatorSubject,
    "creatorSubject",
    SUBJECT_MAX_LENGTH,
    operation,
    traceId,
  );
  if (!(["csv", "json"] as const).includes(input.format)) {
    throw storeError("ADMIN_REVIEW_STORE_ARGUMENT_INVALID", "format", operation, traceId);
  }
  if (!(["internal_operator", "review_operator"] as const).includes(input.creatorRole)) {
    throw storeError("ADMIN_REVIEW_STORE_ARGUMENT_INVALID", "creatorRole", operation, traceId);
  }
  if (input.expectedSourceFingerprint !== undefined) {
    validateSha256(
      input.expectedSourceFingerprint,
      "expectedSourceFingerprint",
      operation,
      traceId,
    );
  }
};

export const createPostgresAdminReviewStore = (
  options: CreatePostgresAdminReviewStoreOptions,
): AdminReviewStore => {
  const {
    boundedListLimit,
    expectedMigration,
    ownsPool,
    pool,
  } = options ?? {} as CreatePostgresAdminReviewStoreOptions;
  const factoryOperation = "readSnapshot" as const;
  const factoryTraceId = "admin-review-store-factory";

  if (
    !pool
    || typeof pool.query !== "function"
    || typeof pool.connect !== "function"
    || typeof pool.end !== "function"
  ) {
    throw storeError(
      "ADMIN_REVIEW_STORE_ARGUMENT_INVALID",
      "pool",
      factoryOperation,
      factoryTraceId,
    );
  }
  if (typeof ownsPool !== "boolean") {
    throw storeError(
      "ADMIN_REVIEW_STORE_ARGUMENT_INVALID",
      "ownsPool",
      factoryOperation,
      factoryTraceId,
    );
  }
  if (
    !Number.isSafeInteger(boundedListLimit)
    || boundedListLimit < 1
    || boundedListLimit > ADMIN_REVIEW_MAX_LIST_LIMIT
  ) {
    throw storeError(
      "ADMIN_REVIEW_STORE_ARGUMENT_INVALID",
      "boundedListLimit",
      factoryOperation,
      factoryTraceId,
    );
  }
  if (
    !expectedMigration
    || expectedMigration.id !== ADMIN_REVIEW_MIGRATION_ID
    || !SHA256_PATTERN.test(expectedMigration.checksum)
  ) {
    throw storeError(
      "ADMIN_REVIEW_STORE_ARGUMENT_INVALID",
      "expectedMigration",
      factoryOperation,
      factoryTraceId,
    );
  }

  let closed = false;
  let closePromise: Promise<void> | undefined;

  const prepare = (
    operation: AdminReviewStoreOperation,
    context: AdminReviewOperationContext,
  ) => {
    const traceId = resolveTraceId(context, operation);

    if (closed) {
      throw storeError("ADMIN_REVIEW_STORE_CLOSED", "store", operation, traceId);
    }

    return traceId;
  };

  const normalizeFailure = (
    error: unknown,
    operation: AdminReviewStoreOperation,
    traceId: string,
  ): AdminReviewStoreError => {
    if (error instanceof AdminReviewStoreError) {
      return error;
    }
    if (error instanceof RowDecodeError) {
      return storeError(
        "ADMIN_REVIEW_STORE_ROW_CORRUPTION",
        error.field,
        operation,
        traceId,
      );
    }
    if (error instanceof ContentIntegrityError) {
      return storeError(
        "ADMIN_REVIEW_STORE_CONTENT_INTEGRITY_FAILED",
        error.field,
        operation,
        traceId,
      );
    }

    return mapDriverError(error, operation, traceId);
  };

  const queryWith = async (
    queryable: Pick<PostgresAdminReviewStorePool, "query">,
    operation: AdminReviewStoreOperation,
    traceId: string,
    sql: string,
    values: readonly unknown[] = [],
  ): Promise<PostgresAdminReviewStoreQueryResult> => {
    try {
      const result = await queryable.query(sql, values);

      if (!result || !Array.isArray(result.rows)) {
        throw new RowDecodeError("rows");
      }

      return result;
    } catch (error) {
      throw normalizeFailure(error, operation, traceId);
    }
  };

  const querySerializableInsert = async (
    client: PostgresAdminReviewStoreClient,
    operation: AdminReviewStoreOperation,
    traceId: string,
    sql: string,
    values: readonly unknown[],
  ): Promise<PostgresAdminReviewStoreQueryResult | undefined> => {
    try {
      const result = await client.query(sql, values);

      if (!result || !Array.isArray(result.rows)) {
        throw new RowDecodeError("rows");
      }

      return result;
    } catch (error) {
      if (driverCode(error) === "40001") {
        return undefined;
      }

      throw normalizeFailure(error, operation, traceId);
    }
  };

  const assertSchemaReady = async (
    queryable: Pick<PostgresAdminReviewStorePool, "query">,
    operation: AdminReviewStoreOperation,
    traceId: string,
  ) => {
    const result = await queryWith(
      queryable,
      operation,
      traceId,
      `
        SELECT migration_id, checksum
        FROM campaign_os.schema_migrations
        WHERE migration_id = $1
        LIMIT 1
      `,
      [expectedMigration.id],
    );

    if (result.rows.length === 0) {
      throw storeError(
        "ADMIN_REVIEW_STORE_SCHEMA_NOT_READY",
        "migrationId",
        operation,
        traceId,
      );
    }
    if (result.rows.length !== 1) {
      throw storeError(
        "ADMIN_REVIEW_STORE_ROW_CORRUPTION",
        "migrationCount",
        operation,
        traceId,
      );
    }

    try {
      const row = decodeRow(result.rows[0]);
      const migrationId = decodeString(row, "migration_id", IDENTIFIER_MAX_LENGTH);
      const checksum = decodeString(row, "checksum", 64);

      if (migrationId !== expectedMigration.id) {
        throw storeError(
          "ADMIN_REVIEW_STORE_SCHEMA_NOT_READY",
          "migrationId",
          operation,
          traceId,
        );
      }
      if (!SHA256_PATTERN.test(checksum) || checksum !== expectedMigration.checksum) {
        throw storeError(
          "ADMIN_REVIEW_STORE_MIGRATION_CHECKSUM_MISMATCH",
          "migrationChecksum",
          operation,
          traceId,
        );
      }
    } catch (error) {
      throw normalizeFailure(error, operation, traceId);
    }
  };

  const connect = async (
    operation: AdminReviewStoreOperation,
    traceId: string,
  ): Promise<PostgresAdminReviewStoreClient> => {
    try {
      const client = await pool.connect();

      if (!client || typeof client.query !== "function" || typeof client.release !== "function") {
        throw new RowDecodeError("client");
      }

      return client;
    } catch (error) {
      throw normalizeFailure(error, operation, traceId);
    }
  };

  const readPages = async <T>(
    readPage: (limit: number, offset: number) => Promise<PostgresAdminReviewStoreQueryResult>,
    mapper: (row: unknown) => T,
  ): Promise<T[]> => {
    const records: T[] = [];
    let offset = 0;

    while (true) {
      const result = await readPage(SNAPSHOT_PAGE_SIZE, offset);
      const page = mapRows(result.rows, mapper);
      records.push(...page);

      if (result.rows.length < SNAPSHOT_PAGE_SIZE) {
        return records;
      }

      offset += result.rows.length;
    }
  };

  const validateSnapshotLinkage = (
    rows: AdminReviewSnapshotRows,
    input: AdminReviewSnapshotInput,
  ) => {
    if (rows.campaign && rows.campaign.id !== input.campaignId) {
      throw new RowDecodeError("campaign_id");
    }

    const tasksById = new Map<string, AdminReviewTaskRow>();
    for (const task of rows.tasks) {
      if (task.campaignId !== input.campaignId) {
        throw new RowDecodeError("campaign_id");
      }
      if (tasksById.has(task.id)) {
        throw new RowDecodeError("task_id");
      }
      tasksById.set(task.id, task);
    }

    const participantsById = new Map<string, AdminReviewParticipantRow>();
    const participantsByWallet = new Map<string, AdminReviewParticipantRow>();
    for (const participant of rows.participants) {
      if (participant.campaignId !== input.campaignId) {
        throw new RowDecodeError("campaign_id");
      }
      if (
        participantsById.has(participant.id)
        || participantsByWallet.has(participant.walletAddress)
      ) {
        throw new RowDecodeError("participant_id");
      }
      participantsById.set(participant.id, participant);
      participantsByWallet.set(participant.walletAddress, participant);
    }
    if (
      input.participantId !== undefined
      && rows.participants.some((participant) => participant.id !== input.participantId)
    ) {
      throw new RowDecodeError("participant_id");
    }

    const completionsById = new Map<string, AdminReviewCompletionRow>();
    for (const completion of rows.completions) {
      if (completion.campaignId !== input.campaignId) {
        throw new RowDecodeError("campaign_id");
      }
      if (!tasksById.has(completion.taskId)) {
        throw new RowDecodeError("task_id");
      }
      const participant = participantsByWallet.get(completion.walletAddress);
      if (!participant) {
        throw new RowDecodeError("wallet_address");
      }
      if (
        participant.accountType !== completion.accountType
        || participant.walletSource !== completion.walletSource
      ) {
        throw new RowDecodeError("wallet_address");
      }
      if (completionsById.has(completion.id)) {
        throw new RowDecodeError("completion_id");
      }
      completionsById.set(completion.id, completion);
    }

    const evidenceIds = new Set<string>();
    for (const evidence of rows.evidence) {
      if (evidence.campaignId !== input.campaignId) {
        throw new RowDecodeError("campaign_id");
      }
      if (!tasksById.has(evidence.taskId)) {
        throw new RowDecodeError("task_id");
      }
      if (!participantsByWallet.has(evidence.walletAddress)) {
        throw new RowDecodeError("wallet_address");
      }
      if (evidence.completionId !== undefined) {
        const completion = completionsById.get(evidence.completionId);
        if (
          !completion
          || completion.taskId !== evidence.taskId
          || completion.walletAddress !== evidence.walletAddress
        ) {
          throw new RowDecodeError("completion_id");
        }
      }
      if (evidenceIds.has(evidence.id)) {
        throw new RowDecodeError("evidence_id");
      }
      evidenceIds.add(evidence.id);
    }

    const rankingIds = new Set<string>();
    for (const ranking of rows.ranking) {
      if (ranking.campaignId !== input.campaignId) {
        throw new RowDecodeError("campaign_id");
      }
      if (rankingIds.has(ranking.participantId)) {
        throw new RowDecodeError("participant_id");
      }
      rankingIds.add(ranking.participantId);
      const participant = participantsById.get(ranking.participantId);
      if (
        participant
        && (
          participant.walletAddress !== ranking.walletAddress
          || participant.totalPoints !== ranking.totalPoints
          || participant.rank !== ranking.rank
        )
      ) {
        throw new RowDecodeError("participant_id");
      }
      if (input.participantId === undefined && !participant) {
        throw new RowDecodeError("participant_id");
      }
    }
  };

  const readSnapshotWithClient = async (
    client: PostgresAdminReviewStoreClient,
    input: AdminReviewSnapshotInput,
    operation: AdminReviewStoreOperation,
    traceId: string,
  ): Promise<AdminReviewSnapshotRows> => {
    const campaignResult = await queryWith(
      client,
      operation,
      traceId,
      `SELECT ${CAMPAIGN_SNAPSHOT_COLUMNS}
       FROM campaign_os.campaigns
       WHERE id = $1
       LIMIT 1`,
      [input.campaignId],
    );
    const campaign = optionalOne(campaignResult.rows, mapCampaignRow);

    if (!campaign) {
      return {
        campaign: undefined,
        completions: [],
        evidence: [],
        participants: [],
        ranking: [],
        tasks: [],
      };
    }

    const tasks = await readPages(
      (limit, offset) => queryWith(
        client,
        operation,
        traceId,
        `SELECT ${TASK_SNAPSHOT_COLUMNS}
         FROM campaign_os.campaign_tasks
         WHERE campaign_id = $1
         ORDER BY id COLLATE "C" ASC
         LIMIT $2 OFFSET $3`,
        [input.campaignId, limit, offset],
      ),
      mapTaskRow,
    );
    const participants = input.participantId === undefined
      ? await readPages(
        (limit, offset) => queryWith(
          client,
          operation,
          traceId,
          `SELECT ${PARTICIPANT_SNAPSHOT_COLUMNS}
           FROM campaign_os.campaign_participants
           WHERE campaign_id = $1
           ORDER BY id COLLATE "C" ASC
           LIMIT $2 OFFSET $3`,
          [input.campaignId, limit, offset],
        ),
        mapParticipantRow,
      )
      : await queryWith(
        client,
        operation,
        traceId,
        `SELECT ${PARTICIPANT_SNAPSHOT_COLUMNS}
         FROM campaign_os.campaign_participants
         WHERE campaign_id = $1 AND id = $2
         LIMIT 1`,
        [input.campaignId, input.participantId],
      ).then((result) => mapRows(result.rows, mapParticipantRow));
    const scopedWallet = input.participantId === undefined
      ? undefined
      : participants[0]?.walletAddress;
    const completions = input.participantId !== undefined && scopedWallet === undefined
      ? []
      : await readPages(
        (limit, offset) => {
          const values: readonly unknown[] = scopedWallet === undefined
            ? [input.campaignId, limit, offset]
            : [input.campaignId, scopedWallet, limit, offset];
          const walletClause = scopedWallet === undefined ? "" : "AND wallet_address = $2";
          const limitPosition = scopedWallet === undefined ? 2 : 3;
          const offsetPosition = scopedWallet === undefined ? 3 : 4;

          return queryWith(
            client,
            operation,
            traceId,
            `SELECT ${COMPLETION_SNAPSHOT_COLUMNS}
             FROM campaign_os.campaign_task_completions
             WHERE campaign_id = $1 ${walletClause}
             ORDER BY task_id COLLATE "C" ASC, id COLLATE "C" ASC
             LIMIT $${limitPosition} OFFSET $${offsetPosition}`,
            values,
          );
        },
        mapCompletionRow,
      );
    const evidence = input.participantId !== undefined && scopedWallet === undefined
      ? []
      : await readPages(
        (limit, offset) => {
          const values: readonly unknown[] = scopedWallet === undefined
            ? [input.campaignId, limit, offset]
            : [input.campaignId, scopedWallet, limit, offset];
          const walletClause = scopedWallet === undefined ? "" : "AND wallet_address = $2";
          const limitPosition = scopedWallet === undefined ? 2 : 3;
          const offsetPosition = scopedWallet === undefined ? 3 : 4;

          return queryWith(
            client,
            operation,
            traceId,
            `SELECT ${EVIDENCE_SNAPSHOT_COLUMNS}
             FROM campaign_os.campaign_task_evidence
             WHERE campaign_id = $1 ${walletClause}
             ORDER BY task_id COLLATE "C" ASC, id COLLATE "C" ASC
             LIMIT $${limitPosition} OFFSET $${offsetPosition}`,
            values,
          );
        },
        mapEvidenceRow,
      );
    const ranking = await readPages(
      (limit, offset) => queryWith(
        client,
        operation,
        traceId,
        `SELECT
           campaign_id,
           id AS participant_id,
           wallet_address,
           total_points,
           rank,
           created_at
         FROM campaign_os.campaign_participants
         WHERE campaign_id = $1
         ORDER BY
           total_points DESC,
           rank ASC NULLS LAST,
           created_at ASC,
           wallet_address COLLATE "C" ASC,
           id COLLATE "C" ASC
         LIMIT $2 OFFSET $3`,
        [input.campaignId, limit, offset],
      ),
      mapRankingRow,
    );
    const rows: AdminReviewSnapshotRows = {
      campaign,
      completions,
      evidence,
      participants,
      ranking,
      tasks,
    };

    validateSnapshotLinkage(rows, input);

    return rows;
  };

  const cleanupError = (
    operation: AdminReviewStoreOperation,
    traceId: string,
    field = "transaction",
  ) => storeError("ADMIN_REVIEW_STORE_CLEANUP_FAILED", field, operation, traceId);

  const readSnapshot = async (
    input: AdminReviewSnapshotInput,
    context: AdminReviewOperationContext,
  ): Promise<AdminReviewSnapshotRows> => {
    const operation = "readSnapshot" as const;
    const traceId = prepare(operation, context);
    validateSnapshotInput(input, operation, traceId);
    const client = await connect(operation, traceId);
    let transactionStarted = false;

    try {
      await queryWith(
        client,
        operation,
        traceId,
        "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY",
      );
      transactionStarted = true;
      await assertSchemaReady(client, operation, traceId);
      const rows = await readSnapshotWithClient(client, input, operation, traceId);
      await queryWith(client, operation, traceId, "COMMIT");
      transactionStarted = false;

      return rows;
    } catch (error) {
      const failure = normalizeFailure(error, operation, traceId);

      if (transactionStarted) {
        try {
          await queryWith(client, operation, traceId, "ROLLBACK");
          transactionStarted = false;
        } catch {
          throw cleanupError(operation, traceId);
        }
      }

      throw failure;
    } finally {
      try {
        client.release();
      } catch {
        throw cleanupError(operation, traceId, "client");
      }
    }
  };

  const decodeDecisionForScope = (
    value: unknown,
    scope: AdminReviewDecisionScope,
  ) => {
    const record = mapDecisionRow(value);

    if (record.campaignId !== scope.campaignId) {
      throw new RowDecodeError("campaign_id");
    }
    if (record.participantId !== scope.participantId) {
      throw new RowDecodeError("participant_id");
    }

    return record;
  };

  const decodePersistedDecisionForScope = (
    value: unknown,
    scope: AdminReviewDecisionScope,
  ) => {
    const row = decodeRow(value);

    if (!decodeBoolean(row, "ownership_valid")) {
      throw new RowDecodeError("wallet_address");
    }

    return decodeDecisionForScope(row, scope);
  };

  const readLatestDecisionsWithClient = async (
    client: PostgresAdminReviewStoreClient,
    campaignId: string,
    operation: AdminReviewStoreOperation,
    traceId: string,
  ): Promise<AdminReviewDecisionRecord[]> => {
    const result = await queryWith(
      client,
      operation,
      traceId,
      `SELECT DISTINCT ON (decision_record.participant_id COLLATE "C")
         ${DECISION_READ_COLUMNS}
       FROM campaign_os.campaign_review_decisions AS decision_record
       WHERE decision_record.campaign_id = $1
       ORDER BY decision_record.participant_id COLLATE "C" ASC,
         decision_record.version DESC,
         decision_record.decided_at DESC,
         decision_record.id COLLATE "C" ASC`,
      [campaignId],
    );

    try {
      const participantIds = new Set<string>();
      return mapRows(result.rows, (value) => {
        const row = decodeRow(value);
        if (!decodeBoolean(row, "ownership_valid")) {
          throw new RowDecodeError("wallet_address");
        }
        const record = mapDecisionRow(row);
        if (record.campaignId !== campaignId) {
          throw new RowDecodeError("campaign_id");
        }
        if (participantIds.has(record.participantId)) {
          throw new RowDecodeError("participant_id");
        }
        participantIds.add(record.participantId);
        return record;
      });
    } catch (error) {
      throw normalizeFailure(error, operation, traceId);
    }
  };

  const assertReplayMatchesInput = (
    record: AdminReviewDecisionRecord,
    input: AdminReviewDecisionInput,
    operation: AdminReviewStoreOperation,
    traceId: string,
  ) => {
    if (
      record.campaignId !== input.campaignId
      || record.participantId !== input.participantId
      || record.idempotencyKeyHash !== input.idempotencyKeyHash
      || record.decision !== input.decision
      || record.snapshotFingerprint !== input.expectedSnapshotFingerprint
      || record.reasonCode !== input.reasonCode
      || record.note !== input.note
      || record.operatorSubject !== input.operatorSubject
      || record.operatorRole !== input.operatorRole
    ) {
      throw storeError(
        "ADMIN_REVIEW_STORE_IDEMPOTENCY_CONFLICT",
        "idempotencyKeyHash",
        operation,
        traceId,
      );
    }
  };

  const readDecisionByIdempotency = async (
    queryable: Pick<PostgresAdminReviewStorePool, "query">,
    input: AdminReviewDecisionInput,
    operation: AdminReviewStoreOperation,
    traceId: string,
  ) => {
    const result = await queryWith(
      queryable,
      operation,
      traceId,
      `SELECT ${DECISION_READ_COLUMNS}
       FROM campaign_os.campaign_review_decisions AS decision_record
       WHERE decision_record.campaign_id = $1
         AND decision_record.participant_id = $2
         AND decision_record.idempotency_key_hash = $3
       LIMIT 1`,
      [input.campaignId, input.participantId, input.idempotencyKeyHash],
    );

    try {
      return optionalOne(
        result.rows,
        (row) => decodePersistedDecisionForScope(row, input),
      );
    } catch (error) {
      throw normalizeFailure(error, operation, traceId);
    }
  };

  const appendDecision = async (
    input: AdminReviewDecisionInput,
    projectSnapshot: AdminReviewSnapshotProjector,
    context: AdminReviewOperationContext,
  ): Promise<AdminReviewDecisionResult> => {
    const operation = "appendDecision" as const;
    const traceId = prepare(operation, context);
    validateDecisionInput(input, operation, traceId);
    const payloadHash = deriveAdminReviewDecisionPayloadHash(input);
    if (typeof projectSnapshot !== "function") {
      throw storeError(
        "ADMIN_REVIEW_STORE_ARGUMENT_INVALID",
        "projectSnapshot",
        operation,
        traceId,
      );
    }

    const client = await connect(operation, traceId);
    let transactionStarted = false;

    try {
      await queryWith(
        client,
        operation,
        traceId,
        "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ",
      );
      transactionStarted = true;
      await assertSchemaReady(client, operation, traceId);
      await queryWith(
        client,
        operation,
        traceId,
        `SELECT pg_advisory_xact_lock(
           hashtextextended(jsonb_build_array($1::text, $2::text)::text, 0)
        )`,
        [input.campaignId, input.participantId],
      );
      for (
        let writeAttempt = 0;
        writeAttempt < MAX_TRANSACTION_WRITE_ATTEMPTS;
        writeAttempt += 1
      ) {
        const existing = await readDecisionByIdempotency(client, input, operation, traceId);
      if (existing) {
        assertReplayMatchesInput(existing, input, operation, traceId);
        await queryWith(client, operation, traceId, "COMMIT");
        transactionStarted = false;

        return { created: false, record: existing };
      }

      const campaignOwnershipResult = await queryWith(
        client,
        operation,
        traceId,
        `SELECT id
         FROM campaign_os.campaigns
         WHERE id = $1
         FOR NO KEY UPDATE`,
        [input.campaignId],
      );
      if (campaignOwnershipResult.rows.length === 0) {
        throw storeError(
          "ADMIN_REVIEW_STORE_NOT_FOUND",
          "campaignId",
          operation,
          traceId,
        );
      }
      if (
        campaignOwnershipResult.rows.length !== 1
        || decodeString(
          decodeRow(campaignOwnershipResult.rows[0]),
          "id",
          IDENTIFIER_MAX_LENGTH,
        ) !== input.campaignId
      ) {
        throw new RowDecodeError("campaign_id");
      }

      const participantOwnershipResult = await queryWith(
        client,
        operation,
        traceId,
        `SELECT id, campaign_id, wallet_address
         FROM campaign_os.campaign_participants
         WHERE campaign_id = $1 AND id = $2
         FOR NO KEY UPDATE`,
        [input.campaignId, input.participantId],
      );
      if (participantOwnershipResult.rows.length === 0) {
        throw storeError(
          "ADMIN_REVIEW_STORE_NOT_FOUND",
          "participantId",
          operation,
          traceId,
        );
      }
      if (participantOwnershipResult.rows.length !== 1) {
        throw new RowDecodeError("participant_id");
      }
      const participantOwnershipRow = decodeRow(participantOwnershipResult.rows[0]);
      if (
        decodeString(participantOwnershipRow, "campaign_id", IDENTIFIER_MAX_LENGTH)
          !== input.campaignId
        || decodeString(participantOwnershipRow, "id", IDENTIFIER_MAX_LENGTH)
          !== input.participantId
      ) {
        throw new RowDecodeError("participant_id");
      }
      const lockedWalletAddress = decodeString(
        participantOwnershipRow,
        "wallet_address",
        SUBJECT_MAX_LENGTH,
      );
      const snapshot = await readSnapshotWithClient(
        client,
        { campaignId: input.campaignId, participantId: input.participantId },
        operation,
        traceId,
      );
      const participant = snapshot.participants[0];

      if (!snapshot.campaign) {
        throw storeError(
          "ADMIN_REVIEW_STORE_NOT_FOUND",
          "campaignId",
          operation,
          traceId,
        );
      }
      if (!participant || participant.id !== input.participantId) {
        throw storeError(
          "ADMIN_REVIEW_STORE_NOT_FOUND",
          "participantId",
          operation,
          traceId,
        );
      }

      let projection: Awaited<ReturnType<AdminReviewSnapshotProjector>>;
      try {
        projection = await projectSnapshot(snapshot);
      } catch {
        throw storeError(
          "ADMIN_REVIEW_STORE_ARGUMENT_INVALID",
          "projectSnapshot",
          operation,
          traceId,
        );
      }
      if (!projection || typeof projection !== "object") {
        throw storeError(
          "ADMIN_REVIEW_STORE_ARGUMENT_INVALID",
          "projectSnapshot",
          operation,
          traceId,
        );
      }
      validateSha256(projection.fingerprint, "snapshotFingerprint", operation, traceId);
      validateBoundedString(
        projection.walletAddress,
        "walletAddress",
        SUBJECT_MAX_LENGTH,
        operation,
        traceId,
      );
      const encodedManifest = encodeJsonObject(
        projection.manifest,
        "snapshotManifest",
        1_048_576,
        operation,
        traceId,
      );
      if (
        projection.walletAddress !== participant.walletAddress
        || participant.walletAddress !== lockedWalletAddress
      ) {
        throw storeError(
          "ADMIN_REVIEW_STORE_ARGUMENT_INVALID",
          "walletAddress",
          operation,
          traceId,
        );
      }
      if (projection.fingerprint !== input.expectedSnapshotFingerprint) {
        throw storeError(
          "ADMIN_REVIEW_STORE_STALE",
          "expectedSnapshotFingerprint",
          operation,
          traceId,
        );
      }

      const versionResult = await queryWith(
        client,
        operation,
        traceId,
        `SELECT COALESCE(MAX(version), 0)::text AS current_version
         FROM campaign_os.campaign_review_decisions
         WHERE campaign_id = $1 AND participant_id = $2`,
        [input.campaignId, input.participantId],
      );
      let currentVersion: number;
      try {
        if (versionResult.rows.length !== 1) {
          throw new RowDecodeError("current_version");
        }
        currentVersion = decodeCount(decodeRow(versionResult.rows[0]), "current_version");
      } catch (error) {
        throw normalizeFailure(error, operation, traceId);
      }
      if (currentVersion >= Number.MAX_SAFE_INTEGER) {
        throw storeError(
          "ADMIN_REVIEW_STORE_BOUND_EXCEEDED",
          "version",
          operation,
          traceId,
        );
      }

      const insertResult = await querySerializableInsert(
        client,
        operation,
        traceId,
        `INSERT INTO campaign_os.campaign_review_decisions (
             id,
             campaign_id,
             participant_id,
             wallet_address,
             version,
             decision,
             snapshot_version,
             snapshot_fingerprint,
             snapshot_manifest,
             reason_code,
             note,
             operator_subject,
             operator_role,
             idempotency_key_hash,
             payload_hash,
             trace_id,
             decided_at
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb,
             $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP
           )
           ON CONFLICT DO NOTHING
           RETURNING ${DECISION_COLUMNS}`,
        [
          randomUUID(),
          input.campaignId,
          input.participantId,
          participant.walletAddress,
          currentVersion + 1,
          input.decision,
          "review-snapshot-v1",
          projection.fingerprint,
          encodedManifest,
          input.reasonCode,
          input.note ?? null,
          input.operatorSubject,
          input.operatorRole,
          input.idempotencyKeyHash,
          payloadHash,
          traceId,
        ],
      );

      if (insertResult === undefined || insertResult.rows.length === 0) {
        await queryWith(client, operation, traceId, "ROLLBACK");
        transactionStarted = false;
        if (writeAttempt === MAX_TRANSACTION_WRITE_ATTEMPTS - 1) {
          throw storeError(
            "ADMIN_REVIEW_STORE_CONSTRAINT_FAILED",
            "version",
            operation,
            traceId,
          );
        }
        await queryWith(
          client,
          operation,
          traceId,
          "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ",
        );
        transactionStarted = true;
        await assertSchemaReady(client, operation, traceId);
        await queryWith(
          client,
          operation,
          traceId,
          `SELECT pg_advisory_xact_lock(
             hashtextextended(jsonb_build_array($1::text, $2::text)::text, 0)
          )`,
          [input.campaignId, input.participantId],
        );
        continue;
      }
      if (insertResult.rows.length !== 1) {
        throw new RowDecodeError("decisionInsert");
      }
      const record = decodeDecisionForScope(insertResult.rows[0], input);

      if (
        record.walletAddress !== participant.walletAddress
        || record.version !== currentVersion + 1
        || record.snapshotFingerprint !== projection.fingerprint
        || record.idempotencyKeyHash !== input.idempotencyKeyHash
        || record.payloadHash !== payloadHash
        || record.traceId !== traceId
        || record.decision !== input.decision
        || record.reasonCode !== input.reasonCode
        || record.note !== input.note
        || record.operatorSubject !== input.operatorSubject
        || record.operatorRole !== input.operatorRole
      ) {
        throw storeError(
          "ADMIN_REVIEW_STORE_ROW_CORRUPTION",
          "decision",
          operation,
          traceId,
        );
      }

      await queryWith(client, operation, traceId, "COMMIT");
      transactionStarted = false;

      return { created: true, record };
      }

      throw storeError(
        "ADMIN_REVIEW_STORE_CONSTRAINT_FAILED",
        "version",
        operation,
        traceId,
      );
    } catch (error) {
      const failure = normalizeFailure(error, operation, traceId);

      if (transactionStarted) {
        try {
          await queryWith(client, operation, traceId, "ROLLBACK");
          transactionStarted = false;
        } catch {
          throw cleanupError(operation, traceId);
        }
      }

      throw failure;
    } finally {
      try {
        client.release();
      } catch {
        throw cleanupError(operation, traceId, "client");
      }
    }
  };

  const getCurrentDecision = async (
    input: AdminReviewDecisionScope,
    context: AdminReviewOperationContext,
  ) => {
    const operation = "getCurrentDecision" as const;
    const traceId = prepare(operation, context);
    validateDecisionScope(input, operation, traceId);
    await assertSchemaReady(pool, operation, traceId);
    const result = await queryWith(
      pool,
      operation,
      traceId,
      `SELECT ${DECISION_READ_COLUMNS}
       FROM campaign_os.campaign_review_decisions AS decision_record
       WHERE decision_record.campaign_id = $1 AND decision_record.participant_id = $2
       ORDER BY decision_record.version DESC
       LIMIT 1`,
      [input.campaignId, input.participantId],
    );

    try {
      return optionalOne(result.rows, (row) => decodePersistedDecisionForScope(row, input));
    } catch (error) {
      throw normalizeFailure(error, operation, traceId);
    }
  };

  const listDecisions = async (
    input: AdminReviewDecisionListInput,
    context: AdminReviewOperationContext,
  ) => {
    const operation = "listDecisions" as const;
    const traceId = prepare(operation, context);
    validateDecisionScope(input, operation, traceId);
    const limit = validateLimit(input.limit, boundedListLimit, operation, traceId);
    await assertSchemaReady(pool, operation, traceId);
    const result = await queryWith(
      pool,
      operation,
      traceId,
      `SELECT ${DECISION_READ_COLUMNS}
       FROM campaign_os.campaign_review_decisions AS decision_record
       WHERE decision_record.campaign_id = $1 AND decision_record.participant_id = $2
       ORDER BY decision_record.version DESC,
         decision_record.decided_at DESC,
         decision_record.id COLLATE "C" ASC
       LIMIT $3`,
      [input.campaignId, input.participantId, limit],
    );

    try {
      return mapRows(result.rows, (row) => decodePersistedDecisionForScope(row, input));
    } catch (error) {
      throw normalizeFailure(error, operation, traceId);
    }
  };

  const validateArtifactScopeRow = (
    artifact: AdminExportArtifactMetadata,
    campaignId: string,
    artifactId?: string,
  ) => {
    if (artifact.campaignId !== campaignId) {
      throw new RowDecodeError("campaign_id");
    }
    if (artifactId !== undefined && artifact.id !== artifactId) {
      throw new RowDecodeError("artifact_id");
    }
  };

  interface PreparedArtifactPersistence {
    contentBytes: number;
    encodedManifest: string;
    lockScope: string;
  }

  const prepareArtifactPersistence = (
    input: AdminExportArtifactInput,
    operation: AdminReviewStoreOperation,
    traceId: string,
  ): PreparedArtifactPersistence => {
    validateArtifactInput(input, operation, traceId);
    const encodedManifest = encodeJsonObject(
      input.sourceManifest,
      "sourceManifest",
      ADMIN_REVIEW_MAX_SOURCE_MANIFEST_BYTES,
      operation,
      traceId,
    );

    return {
      contentBytes: Buffer.byteLength(input.content, "utf8"),
      encodedManifest,
      lockScope: JSON.stringify([input.sourceFingerprint, input.format]),
    };
  };

  const persistArtifactWithClient = async (
    client: PostgresAdminReviewStoreClient,
    input: AdminExportArtifactInput,
    prepared: PreparedArtifactPersistence,
    operation: AdminReviewStoreOperation,
    traceId: string,
  ): Promise<AdminExportArtifactResult | undefined> => {
    await queryWith(
      client,
      operation,
      traceId,
      `SELECT pg_advisory_xact_lock(
           hashtextextended(jsonb_build_array($1::text, $2::text)::text, 0)
         )`,
      [input.campaignId, prepared.lockScope],
    );
    const insertResult = await querySerializableInsert(
      client,
      operation,
      traceId,
      `INSERT INTO campaign_os.campaign_export_artifacts (
         id,
         campaign_id,
         source_version,
         source_fingerprint,
         source_manifest,
         format,
         row_count,
         content_hash,
         content,
         content_bytes,
         file_name,
         mime_type,
         creator_subject,
         creator_role,
         trace_id,
         created_at
       ) VALUES (
         $1, $2, $3, $4, $5::jsonb, $6, $7, $8,
         $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP
       )
       ON CONFLICT (campaign_id, source_fingerprint, format) DO NOTHING
       RETURNING ${ARTIFACT_CONTENT_COLUMNS}`,
      [
        randomUUID(),
        input.campaignId,
        input.sourceVersion,
        input.sourceFingerprint,
        prepared.encodedManifest,
        input.format,
        input.rowCount,
        input.contentHash,
        input.content,
        prepared.contentBytes,
        input.fileName,
        input.mimeType,
        input.creatorSubject,
        input.creatorRole,
        traceId,
      ],
    );
    if (insertResult === undefined) {
      return undefined;
    }
    const created = insertResult.rows.length === 1;
    let row: unknown;

    if (insertResult.rows.length > 1) {
      throw new RowDecodeError("artifactInsert");
    }
    if (created) {
      row = insertResult.rows[0];
    } else {
      const existingResult = await queryWith(
        client,
        operation,
        traceId,
        `SELECT ${ARTIFACT_CONTENT_COLUMNS}
         FROM campaign_os.campaign_export_artifacts
         WHERE campaign_id = $1
           AND source_fingerprint = $2
           AND format = $3
         LIMIT 1`,
        [input.campaignId, input.sourceFingerprint, input.format],
      );
      if (existingResult.rows.length !== 1) {
        throw new RowDecodeError("artifactConflict");
      }
      row = existingResult.rows[0];
    }

    let stored: AdminExportArtifactContent;
    try {
      stored = mapArtifactContentRow(row);
      validateArtifactScopeRow(stored.artifact, input.campaignId);
    } catch (error) {
      throw normalizeFailure(error, operation, traceId);
    }
    const immutableInputMatches =
      stored.artifact.sourceVersion === input.sourceVersion
      && stored.artifact.sourceFingerprint === input.sourceFingerprint
      && stored.artifact.format === input.format
      && stored.artifact.rowCount === input.rowCount
      && stored.artifact.contentHash === input.contentHash
      && stored.artifact.contentBytes === prepared.contentBytes
      && stored.artifact.fileName === input.fileName
      && stored.artifact.mimeType === input.mimeType
      && stored.content === input.content
      && canonicalJson(stored.sourceManifest) === canonicalJson(input.sourceManifest);
    if (!immutableInputMatches) {
      throw storeError(
        "ADMIN_REVIEW_STORE_IDEMPOTENCY_CONFLICT",
        "sourceFingerprint",
        operation,
        traceId,
      );
    }
    if (
      created
      && (
        stored.artifact.creatorSubject !== input.creatorSubject
        || stored.artifact.creatorRole !== input.creatorRole
        || stored.artifact.traceId !== traceId
      )
    ) {
      throw storeError(
        "ADMIN_REVIEW_STORE_ROW_CORRUPTION",
        "artifact",
        operation,
        traceId,
      );
    }

    return { artifact: stored.artifact, created };
  };

  const putArtifact = async (
    input: AdminExportArtifactInput,
    context: AdminReviewOperationContext,
  ): Promise<AdminExportArtifactResult> => {
    const operation = "putArtifact" as const;
    const traceId = prepare(operation, context);
    const prepared = prepareArtifactPersistence(input, operation, traceId);
    const client = await connect(operation, traceId);
    let transactionStarted = false;

    try {
      await queryWith(client, operation, traceId, "BEGIN");
      transactionStarted = true;
      await assertSchemaReady(client, operation, traceId);
      const result = await persistArtifactWithClient(
        client,
        input,
        prepared,
        operation,
        traceId,
      );
      if (result === undefined) {
        throw storeError(
          "ADMIN_REVIEW_STORE_CONSTRAINT_FAILED",
          "sourceFingerprint",
          operation,
          traceId,
        );
      }

      await queryWith(client, operation, traceId, "COMMIT");
      transactionStarted = false;

      return result;
    } catch (error) {
      const failure = normalizeFailure(error, operation, traceId);

      if (transactionStarted) {
        try {
          await queryWith(client, operation, traceId, "ROLLBACK");
          transactionStarted = false;
        } catch {
          throw cleanupError(operation, traceId);
        }
      }

      throw failure;
    } finally {
      try {
        client.release();
      } catch {
        throw cleanupError(operation, traceId, "client");
      }
    }
  };

  const putArtifactFromSnapshot = async (
    input: AdminExportArtifactProjectionInput,
    projectArtifact: AdminExportArtifactProjector,
    context: AdminReviewOperationContext,
  ): Promise<AdminExportArtifactResult> => {
    const operation = "putArtifactFromSnapshot" as const;
    const traceId = prepare(operation, context);
    validateArtifactProjectionInput(input, operation, traceId);
    if (typeof projectArtifact !== "function") {
      throw storeError(
        "ADMIN_REVIEW_STORE_ARGUMENT_INVALID",
        "projectArtifact",
        operation,
        traceId,
      );
    }
    const client = await connect(operation, traceId);
    let transactionStarted = false;

    try {
      for (
        let writeAttempt = 0;
        writeAttempt < MAX_TRANSACTION_WRITE_ATTEMPTS;
        writeAttempt += 1
      ) {
        await queryWith(
          client,
          operation,
          traceId,
          "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ",
        );
        transactionStarted = true;
        await assertSchemaReady(client, operation, traceId);
        const rows = await readSnapshotWithClient(
          client,
          { campaignId: input.campaignId },
          operation,
          traceId,
        );
        if (!rows.campaign) {
          throw storeError(
            "ADMIN_REVIEW_STORE_NOT_FOUND",
            "campaignId",
            operation,
            traceId,
          );
        }
        const latestDecisions = await readLatestDecisionsWithClient(
          client,
          input.campaignId,
          operation,
          traceId,
        );

        let projection: AdminExportArtifactProjection;
        try {
          projection = await projectArtifact({ latestDecisions, rows });
          if (!projection || typeof projection !== "object") {
            throw new Error("invalid projection");
          }
        } catch {
          throw storeError(
            "ADMIN_REVIEW_STORE_ARGUMENT_INVALID",
            "projectArtifact",
            operation,
            traceId,
          );
        }
        const artifactInput: AdminExportArtifactInput = {
          campaignId: input.campaignId,
          content: projection.content,
          contentHash: projection.contentHash,
          creatorRole: input.creatorRole,
          creatorSubject: input.creatorSubject,
          fileName: projection.fileName,
          format: input.format,
          mimeType: projection.mimeType,
          rowCount: projection.rowCount,
          sourceFingerprint: projection.sourceFingerprint,
          sourceManifest: projection.sourceManifest,
          sourceVersion: projection.sourceVersion,
        };
        const prepared = prepareArtifactPersistence(artifactInput, operation, traceId);
        if (
          input.expectedSourceFingerprint !== undefined
          && input.expectedSourceFingerprint !== artifactInput.sourceFingerprint
        ) {
          throw storeError(
            "ADMIN_REVIEW_STORE_STALE",
            "expectedSourceFingerprint",
            operation,
            traceId,
          );
        }
        const result = await persistArtifactWithClient(
          client,
          artifactInput,
          prepared,
          operation,
          traceId,
        );
        if (result === undefined) {
          await queryWith(client, operation, traceId, "ROLLBACK");
          transactionStarted = false;
          if (writeAttempt === MAX_TRANSACTION_WRITE_ATTEMPTS - 1) {
            throw storeError(
              "ADMIN_REVIEW_STORE_CONSTRAINT_FAILED",
              "sourceFingerprint",
              operation,
              traceId,
            );
          }
          continue;
        }

        await queryWith(client, operation, traceId, "COMMIT");
        transactionStarted = false;

        return result;
      }

      throw storeError(
        "ADMIN_REVIEW_STORE_CONSTRAINT_FAILED",
        "sourceFingerprint",
        operation,
        traceId,
      );
    } catch (error) {
      const failure = normalizeFailure(error, operation, traceId);

      if (transactionStarted) {
        try {
          await queryWith(client, operation, traceId, "ROLLBACK");
          transactionStarted = false;
        } catch {
          throw cleanupError(operation, traceId);
        }
      }

      throw failure;
    } finally {
      try {
        client.release();
      } catch {
        throw cleanupError(operation, traceId, "client");
      }
    }
  };

  const listArtifacts = async (
    input: AdminExportArtifactListInput,
    context: AdminReviewOperationContext,
  ) => {
    const operation = "listArtifacts" as const;
    const traceId = prepare(operation, context);
    validateArtifactListInput(input, boundedListLimit, operation, traceId);
    const limit = validateLimit(input.limit, boundedListLimit, operation, traceId);
    await assertSchemaReady(pool, operation, traceId);
    const result = await queryWith(
      pool,
      operation,
      traceId,
      `SELECT ${ARTIFACT_METADATA_COLUMNS}
       FROM campaign_os.campaign_export_artifacts
       WHERE campaign_id = $1
       ORDER BY created_at DESC, id COLLATE "C" ASC
       LIMIT $2`,
      [input.campaignId, limit],
    );

    try {
      return mapRows(result.rows, (row) => {
        const artifact = mapArtifactMetadataRow(row);
        validateArtifactScopeRow(artifact, input.campaignId);

        return artifact;
      });
    } catch (error) {
      throw normalizeFailure(error, operation, traceId);
    }
  };

  const getArtifact = async (
    input: AdminExportArtifactScope,
    context: AdminReviewOperationContext,
  ) => {
    const operation = "getArtifact" as const;
    const traceId = prepare(operation, context);
    validateArtifactScope(input, operation, traceId);
    await assertSchemaReady(pool, operation, traceId);
    const result = await queryWith(
      pool,
      operation,
      traceId,
      `SELECT ${ARTIFACT_DETAIL_COLUMNS}
       FROM campaign_os.campaign_export_artifacts
       WHERE campaign_id = $1 AND id = $2
       LIMIT 1`,
      [input.campaignId, input.artifactId],
    );

    try {
      const detail = optionalOne(result.rows, mapArtifactDetailRow);
      if (detail) {
        validateArtifactScopeRow(detail.artifact, input.campaignId, input.artifactId);
      }

      return detail;
    } catch (error) {
      throw normalizeFailure(error, operation, traceId);
    }
  };

  const readArtifactContent = async (
    input: AdminExportArtifactScope,
    context: AdminReviewOperationContext,
  ) => {
    const operation = "readArtifactContent" as const;
    const traceId = prepare(operation, context);
    validateArtifactScope(input, operation, traceId);
    await assertSchemaReady(pool, operation, traceId);
    const result = await queryWith(
      pool,
      operation,
      traceId,
      `SELECT ${ARTIFACT_CONTENT_COLUMNS}
       FROM campaign_os.campaign_export_artifacts
       WHERE campaign_id = $1 AND id = $2
       LIMIT 1`,
      [input.campaignId, input.artifactId],
    );

    if (result.rows.length === 0) {
      throw storeError(
        "ADMIN_REVIEW_STORE_NOT_FOUND",
        "artifactId",
        operation,
        traceId,
      );
    }
    if (result.rows.length !== 1) {
      throw storeError(
        "ADMIN_REVIEW_STORE_ROW_CORRUPTION",
        "rowCount",
        operation,
        traceId,
      );
    }

    try {
      const content = mapArtifactContentRow(result.rows[0]);
      validateArtifactScopeRow(content.artifact, input.campaignId, input.artifactId);

      return content;
    } catch (error) {
      throw normalizeFailure(error, operation, traceId);
    }
  };

  return {
    appendDecision,
    close: (context = { traceId: randomUUID() }) => {
      if (closePromise) {
        return closePromise;
      }

      const traceId = resolveTraceId(context, "close");
      closed = true;
      closePromise = (async () => {
        if (!ownsPool) {
          return;
        }

        try {
          await pool.end();
        } catch {
          throw storeError(
            "ADMIN_REVIEW_STORE_CLEANUP_FAILED",
            "pool",
            "close",
            traceId,
          );
        }
      })();

      return closePromise;
    },
    getArtifact,
    getCurrentDecision,
    listArtifacts,
    listDecisions,
    putArtifact,
    putArtifactFromSnapshot,
    readArtifactContent,
    readSnapshot,
  };
};
