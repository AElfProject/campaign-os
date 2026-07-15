import { createHash } from "node:crypto";
import {
  AdminReviewDomainError,
  canonicalizeAdminReviewJson,
  projectAdminReviewWinnerSourceFromStoreSnapshot,
  type AdminReviewWinnerRow,
  type AdminReviewWinnerSource,
  type TrustedAdminReviewOperatorContext,
} from "./adminReview";
import {
  ADMIN_ARTIFACT_SOURCE_VERSION,
  ADMIN_REVIEW_MAX_ARTIFACT_BYTES,
  ADMIN_REVIEW_MAX_ARTIFACT_ROWS,
  ADMIN_REVIEW_MAX_SOURCE_MANIFEST_BYTES,
  AdminReviewStoreError,
  type AdminExportArtifactFormat,
  type AdminExportArtifactInput,
  type AdminExportArtifactMetadata,
  type AdminExportArtifactProjection,
  type AdminExportArtifactResult,
  type AdminReviewJsonObject,
  type AdminReviewStore,
} from "./adminReviewStore";

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const SAFE_CONTEXT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9:._-]*$/;
const SAFE_FILE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const FORMULA_PREFIX_PATTERN = /^[=+\-@\t\r\n]/;
const MAX_IDENTIFIER_LENGTH = 160;
const MAX_OPERATOR_SUBJECT_LENGTH = 256;
const MAX_TRACE_ID_LENGTH = 128;
const MAX_FILE_NAME_LENGTH = 180;
const MAX_EVIDENCE_HASHES = 1_000;
const MAX_EVIDENCE_HASH_LENGTH = 4_096;

export const ADMIN_EXPORT_ARTIFACT_CSV_HEADERS = Object.freeze([
  "campaignId",
  "participantId",
  "walletAddress",
  "totalPoints",
  "rank",
  "decisionId",
  "decisionVersion",
  "snapshotFingerprint",
  "evidenceHashes",
] as const);

export type AdminExportArtifactErrorCode =
  | "ADMIN_EXPORT_ARTIFACT_BOUND_EXCEEDED"
  | "ADMIN_EXPORT_ARTIFACT_CONFLICT"
  | "ADMIN_EXPORT_ARTIFACT_INTEGRITY_FAILED"
  | "ADMIN_EXPORT_ARTIFACT_INVALID_INPUT"
  | "ADMIN_EXPORT_ARTIFACT_INVALID_SOURCE"
  | "ADMIN_EXPORT_ARTIFACT_NOT_FOUND"
  | "ADMIN_EXPORT_ARTIFACT_SERIALIZATION_FAILED"
  | "ADMIN_EXPORT_ARTIFACT_STALE"
  | "ADMIN_EXPORT_ARTIFACT_UNAVAILABLE";

const SAFE_ERROR_MESSAGES: Record<AdminExportArtifactErrorCode, string> = {
  ADMIN_EXPORT_ARTIFACT_BOUND_EXCEEDED: "Admin export artifact bound was exceeded.",
  ADMIN_EXPORT_ARTIFACT_CONFLICT: "Admin export artifact conflicts with stored content.",
  ADMIN_EXPORT_ARTIFACT_INTEGRITY_FAILED: "Admin export artifact integrity check failed.",
  ADMIN_EXPORT_ARTIFACT_INVALID_INPUT: "Admin export artifact input is invalid.",
  ADMIN_EXPORT_ARTIFACT_INVALID_SOURCE: "Admin export artifact source is invalid.",
  ADMIN_EXPORT_ARTIFACT_NOT_FOUND: "Admin export artifact source was not found.",
  ADMIN_EXPORT_ARTIFACT_SERIALIZATION_FAILED: "Admin export artifact serialization failed.",
  ADMIN_EXPORT_ARTIFACT_STALE: "Admin export artifact source precondition is stale.",
  ADMIN_EXPORT_ARTIFACT_UNAVAILABLE: "Admin export artifact service is unavailable.",
};

const safeContextValue = (
  value: unknown,
  fallback: string,
  maximum: number,
): string => typeof value === "string"
  && value.length > 0
  && value.length <= maximum
  && SAFE_CONTEXT_PATTERN.test(value)
  ? value
  : fallback;

export class AdminExportArtifactError extends Error {
  readonly code: AdminExportArtifactErrorCode;
  readonly field: string;
  readonly limit?: number;
  readonly traceId: string;

  constructor(options: {
    code: AdminExportArtifactErrorCode;
    field: string;
    limit?: number;
    traceId?: string;
  }) {
    super(SAFE_ERROR_MESSAGES[options.code]);
    this.name = "AdminExportArtifactError";
    this.code = options.code;
    this.field = safeContextValue(options.field, "input", 128);
    this.traceId = safeContextValue(options.traceId, "trace-unavailable", MAX_TRACE_ID_LENGTH);
    if (options.limit !== undefined) {
      this.limit = options.limit;
    }

    delete this.stack;
  }
}

interface ArtifactErrorContext {
  field: string;
  limit?: number;
  traceId: string;
}

const fail = (
  code: AdminExportArtifactErrorCode,
  context: ArtifactErrorContext,
): never => {
  throw new AdminExportArtifactError({ code, ...context });
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const hasValidUnicode = (value: string): boolean => {
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

const assertKnownKeys = (
  value: unknown,
  keys: readonly string[],
  field: string,
  traceId: string,
): Record<string, unknown> => {
  if (!isPlainRecord(value)) {
    return fail("ADMIN_EXPORT_ARTIFACT_INVALID_SOURCE", { field, traceId });
  }
  const actualKeys = Object.keys(value).sort();
  const expectedKeys = [...keys].sort();
  if (
    actualKeys.length !== expectedKeys.length
    || actualKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    return fail("ADMIN_EXPORT_ARTIFACT_INVALID_SOURCE", { field, traceId });
  }
  return value;
};

const assertBoundedString = (
  value: unknown,
  field: string,
  maximum: number,
  traceId: string,
): string => {
  if (typeof value !== "string" || value.length === 0 || !hasValidUnicode(value)) {
    return fail("ADMIN_EXPORT_ARTIFACT_INVALID_SOURCE", { field, traceId });
  }
  if (value.length > maximum) {
    return fail("ADMIN_EXPORT_ARTIFACT_BOUND_EXCEEDED", {
      field,
      limit: maximum,
      traceId,
    });
  }
  return value;
};

const assertSha256 = (
  value: unknown,
  field: string,
  traceId: string,
): string => {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    return fail("ADMIN_EXPORT_ARTIFACT_INVALID_SOURCE", { field, traceId });
  }
  return value;
};

const assertSafeInteger = (
  value: unknown,
  field: string,
  minimum: number,
  traceId: string,
): number => {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) {
    return fail("ADMIN_EXPORT_ARTIFACT_INVALID_SOURCE", { field, traceId });
  }
  return value;
};

const WINNER_ROW_KEYS = [
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
const CAMPAIGN_KEYS = [
  "contractMode",
  "endTime",
  "id",
  "startTime",
  "status",
  "updatedAt",
  "walletPolicy",
] as const;
const SOURCE_MANIFEST_KEYS = ["campaign", "rows", "version"] as const;

const normalizedWinnerRow = (
  value: unknown,
  campaignId: string,
  participantIds: Set<string>,
  traceId: string,
): AdminReviewWinnerRow => {
  const row = assertKnownKeys(value, WINNER_ROW_KEYS, "rows", traceId);
  const rowCampaignId = assertBoundedString(
    row.campaignId,
    "campaignId",
    MAX_IDENTIFIER_LENGTH,
    traceId,
  );
  if (rowCampaignId !== campaignId) {
    return fail("ADMIN_EXPORT_ARTIFACT_INVALID_SOURCE", { field: "campaignId", traceId });
  }
  const participantId = assertBoundedString(
    row.participantId,
    "participantId",
    MAX_IDENTIFIER_LENGTH,
    traceId,
  );
  if (participantIds.has(participantId)) {
    return fail("ADMIN_EXPORT_ARTIFACT_INVALID_SOURCE", { field: "participantId", traceId });
  }
  participantIds.add(participantId);
  if (!Array.isArray(row.evidenceHashes)) {
    return fail("ADMIN_EXPORT_ARTIFACT_INVALID_SOURCE", { field: "evidenceHashes", traceId });
  }
  if (row.evidenceHashes.length > MAX_EVIDENCE_HASHES) {
    return fail("ADMIN_EXPORT_ARTIFACT_BOUND_EXCEEDED", {
      field: "evidenceHashes",
      limit: MAX_EVIDENCE_HASHES,
      traceId,
    });
  }
  const evidenceHashes = row.evidenceHashes.map((hash) => assertBoundedString(
    hash,
    "evidenceHashes",
    MAX_EVIDENCE_HASH_LENGTH,
    traceId,
  ));
  if (new Set(evidenceHashes).size !== evidenceHashes.length) {
    return fail("ADMIN_EXPORT_ARTIFACT_INVALID_SOURCE", {
      field: "evidenceHashes",
      traceId,
    });
  }
  const rank = row.rank === null
    ? null
    : assertSafeInteger(row.rank, "rank", 1, traceId);

  return {
    campaignId: rowCampaignId,
    decisionId: assertBoundedString(
      row.decisionId,
      "decisionId",
      MAX_IDENTIFIER_LENGTH,
      traceId,
    ),
    decisionVersion: assertSafeInteger(row.decisionVersion, "decisionVersion", 1, traceId),
    evidenceHashes,
    participantId,
    rank,
    snapshotFingerprint: assertSha256(
      row.snapshotFingerprint,
      "snapshotFingerprint",
      traceId,
    ),
    totalPoints: assertSafeInteger(row.totalPoints, "totalPoints", 0, traceId),
    walletAddress: assertBoundedString(
      row.walletAddress,
      "walletAddress",
      MAX_IDENTIFIER_LENGTH,
      traceId,
    ),
  };
};

interface ValidatedWinnerSource {
  campaignId: string;
  rows: readonly AdminReviewWinnerRow[];
}

const validateWinnerSource = (
  source: AdminReviewWinnerSource,
  traceId: string,
): ValidatedWinnerSource => {
  if (!isPlainRecord(source)) {
    return fail("ADMIN_EXPORT_ARTIFACT_INVALID_SOURCE", { field: "source", traceId });
  }
  if (!Array.isArray(source.rows)) {
    return fail("ADMIN_EXPORT_ARTIFACT_INVALID_SOURCE", { field: "rows", traceId });
  }
  if (source.rows.length > ADMIN_REVIEW_MAX_ARTIFACT_ROWS) {
    return fail("ADMIN_EXPORT_ARTIFACT_BOUND_EXCEEDED", {
      field: "rows",
      limit: ADMIN_REVIEW_MAX_ARTIFACT_ROWS,
      traceId,
    });
  }
  if (
    !Number.isSafeInteger(source.rowCount)
    || source.rowCount !== source.rows.length
  ) {
    return fail("ADMIN_EXPORT_ARTIFACT_INVALID_SOURCE", { field: "rowCount", traceId });
  }
  if (source.sourceVersion !== ADMIN_ARTIFACT_SOURCE_VERSION) {
    return fail("ADMIN_EXPORT_ARTIFACT_INVALID_SOURCE", {
      field: "sourceVersion",
      traceId,
    });
  }
  const fingerprint = assertSha256(source.fingerprint, "sourceFingerprint", traceId);
  if (typeof source.canonicalJson !== "string" || !hasValidUnicode(source.canonicalJson)) {
    return fail("ADMIN_EXPORT_ARTIFACT_INVALID_SOURCE", { field: "canonicalJson", traceId });
  }
  if (Buffer.byteLength(source.canonicalJson, "utf8") > ADMIN_REVIEW_MAX_SOURCE_MANIFEST_BYTES) {
    return fail("ADMIN_EXPORT_ARTIFACT_BOUND_EXCEEDED", {
      field: "sourceManifest",
      limit: ADMIN_REVIEW_MAX_SOURCE_MANIFEST_BYTES,
      traceId,
    });
  }
  if (createHash("sha256").update(source.canonicalJson, "utf8").digest("hex") !== fingerprint) {
    return fail("ADMIN_EXPORT_ARTIFACT_INVALID_SOURCE", {
      field: "sourceFingerprint",
      traceId,
    });
  }
  const manifest = assertKnownKeys(
    source.manifest,
    SOURCE_MANIFEST_KEYS,
    "sourceManifest",
    traceId,
  );
  if (manifest.version !== ADMIN_ARTIFACT_SOURCE_VERSION || !Array.isArray(manifest.rows)) {
    return fail("ADMIN_EXPORT_ARTIFACT_INVALID_SOURCE", {
      field: "sourceManifest",
      traceId,
    });
  }
  const manifestCampaign = assertKnownKeys(
    manifest.campaign,
    CAMPAIGN_KEYS,
    "campaign",
    traceId,
  );
  const campaignId = assertBoundedString(
    manifestCampaign.id,
    "campaignId",
    MAX_IDENTIFIER_LENGTH,
    traceId,
  );
  for (const field of ["endTime", "startTime", "status", "updatedAt"] as const) {
    assertBoundedString(manifestCampaign[field], field, 128, traceId);
  }
  if (
    !(["CONTRACT_CLAIM", "OFF_CHAIN_MVP", "V2_COMPANION"] as const)
      .includes(manifestCampaign.contractMode as never)
    || !(["AA_ONLY", "ANY", "EOA_ONLY"] as const)
      .includes(manifestCampaign.walletPolicy as never)
  ) {
    return fail("ADMIN_EXPORT_ARTIFACT_INVALID_SOURCE", { field: "campaign", traceId });
  }
  if (manifest.rows.length !== source.rows.length) {
    return fail("ADMIN_EXPORT_ARTIFACT_INVALID_SOURCE", { field: "rows", traceId });
  }

  const participantIds = new Set<string>();
  const rows = source.rows.map((row) =>
    normalizedWinnerRow(row, campaignId, participantIds, traceId));
  const manifestParticipantIds = new Set<string>();
  const manifestRows = manifest.rows.map((row) =>
    normalizedWinnerRow(row, campaignId, manifestParticipantIds, traceId));
  if (JSON.stringify(rows) !== JSON.stringify(manifestRows)) {
    return fail("ADMIN_EXPORT_ARTIFACT_INVALID_SOURCE", { field: "rows", traceId });
  }

  let canonicalManifest: string;
  try {
    canonicalManifest = canonicalizeAdminReviewJson(
      source.manifest as unknown as AdminReviewJsonObject,
      { field: "sourceManifest", traceId },
    );
  } catch {
    return fail("ADMIN_EXPORT_ARTIFACT_INVALID_SOURCE", {
      field: "sourceManifest",
      traceId,
    });
  }
  if (canonicalManifest !== source.canonicalJson) {
    return fail("ADMIN_EXPORT_ARTIFACT_INVALID_SOURCE", {
      field: "sourceManifest",
      traceId,
    });
  }

  return { campaignId, rows };
};

export interface ArtifactSerializer {
  readonly format: AdminExportArtifactFormat;
  readonly mimeType: AdminExportArtifactInput["mimeType"];
  serialize(source: AdminReviewWinnerSource): string;
}

const spreadsheetSafeCell = (value: string): string =>
  FORMULA_PREFIX_PATTERN.test(value) ? `'${value}` : value;

const csvCell = (value: string): string => {
  const safeValue = spreadsheetSafeCell(value);
  return /[",\r\n]/.test(safeValue)
    ? `"${safeValue.replace(/"/g, '""')}"`
    : safeValue;
};

const serializeCsv = (source: AdminReviewWinnerSource): string => {
  const records = source.rows.map((row) => [
    row.campaignId,
    row.participantId,
    row.walletAddress,
    String(row.totalPoints),
    row.rank === null ? "" : String(row.rank),
    row.decisionId,
    String(row.decisionVersion),
    row.snapshotFingerprint,
    row.evidenceHashes.join("|"),
  ].map(csvCell).join(","));

  return [ADMIN_EXPORT_ARTIFACT_CSV_HEADERS.join(","), ...records, ""].join("\r\n");
};

const serializeJson = (source: AdminReviewWinnerSource): string => JSON.stringify({
  version: source.sourceVersion,
  source: {
    campaignId: source.manifest.campaign.id,
    fingerprint: source.fingerprint,
  },
  rows: source.rows.map((row) => ({
    campaignId: row.campaignId,
    decisionId: row.decisionId,
    decisionVersion: row.decisionVersion,
    evidenceHashes: [...row.evidenceHashes],
    participantId: row.participantId,
    rank: row.rank,
    snapshotFingerprint: row.snapshotFingerprint,
    totalPoints: row.totalPoints,
    walletAddress: row.walletAddress,
  })),
});

export const csvAdminExportArtifactSerializer: ArtifactSerializer = Object.freeze({
  format: "csv",
  mimeType: "text/csv;charset=utf-8",
  serialize: serializeCsv,
});

export const jsonAdminExportArtifactSerializer: ArtifactSerializer = Object.freeze({
  format: "json",
  mimeType: "application/json;charset=utf-8",
  serialize: serializeJson,
});

const STRATEGIES: Readonly<Record<AdminExportArtifactFormat, ArtifactSerializer>> = Object.freeze({
  csv: csvAdminExportArtifactSerializer,
  json: jsonAdminExportArtifactSerializer,
});

const safeArtifactFileName = (
  campaignId: string,
  sourceFingerprint: string,
  format: AdminExportArtifactFormat,
): string => {
  const normalizedCampaign = campaignId
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^[-._]+|[-._]+$/g, "") || "export";
  const prefix = "campaign-";
  const suffix = `-${sourceFingerprint.slice(0, 12)}.${format}`;
  const availableCampaignLength = MAX_FILE_NAME_LENGTH - prefix.length - suffix.length;
  const campaignStem = normalizedCampaign.slice(0, availableCampaignLength)
    .replace(/[-._]+$/g, "") || "export";
  const fileName = `${prefix}${campaignStem}${suffix}`;

  if (
    fileName.length > MAX_FILE_NAME_LENGTH
    || !SAFE_FILE_NAME_PATTERN.test(fileName)
    || !fileName.endsWith(`.${format}`)
  ) {
    return fail("ADMIN_EXPORT_ARTIFACT_SERIALIZATION_FAILED", {
      field: "fileName",
      traceId: "trace-unavailable",
    });
  }
  return fileName;
};

export interface SerializedAdminExportArtifact extends AdminExportArtifactProjection {
  contentBytes: number;
}

export interface SerializeAdminExportArtifactOptions {
  traceId?: string;
}

export const serializeAdminExportArtifactWithStrategy = (
  source: AdminReviewWinnerSource,
  strategy: ArtifactSerializer,
  options: SerializeAdminExportArtifactOptions = {},
): SerializedAdminExportArtifact => {
  const traceId = safeContextValue(options.traceId, "trace-unavailable", MAX_TRACE_ID_LENGTH);
  const validated = validateWinnerSource(source, traceId);
  if (!strategy || typeof strategy !== "object" || typeof strategy.serialize !== "function") {
    return fail("ADMIN_EXPORT_ARTIFACT_INVALID_INPUT", { field: "serializer", traceId });
  }
  if (!(strategy.format === "csv" || strategy.format === "json")) {
    return fail("ADMIN_EXPORT_ARTIFACT_INVALID_INPUT", { field: "format", traceId });
  }
  const expectedMimeType = strategy.format === "csv"
    ? "text/csv;charset=utf-8"
    : "application/json;charset=utf-8";
  if (strategy.mimeType !== expectedMimeType) {
    return fail("ADMIN_EXPORT_ARTIFACT_INVALID_INPUT", { field: "mimeType", traceId });
  }

  let content: string;
  try {
    content = strategy.serialize(source);
  } catch (error) {
    if (error instanceof AdminExportArtifactError) {
      throw error;
    }
    return fail("ADMIN_EXPORT_ARTIFACT_SERIALIZATION_FAILED", { field: "content", traceId });
  }
  if (typeof content !== "string" || !hasValidUnicode(content)) {
    return fail("ADMIN_EXPORT_ARTIFACT_SERIALIZATION_FAILED", { field: "content", traceId });
  }
  const contentBytes = Buffer.byteLength(content, "utf8");
  if (contentBytes > ADMIN_REVIEW_MAX_ARTIFACT_BYTES) {
    return fail("ADMIN_EXPORT_ARTIFACT_BOUND_EXCEEDED", {
      field: "content",
      limit: ADMIN_REVIEW_MAX_ARTIFACT_BYTES,
      traceId,
    });
  }
  const contentHash = createHash("sha256").update(content, "utf8").digest("hex");

  return Object.freeze({
    content,
    contentBytes,
    contentHash,
    fileName: safeArtifactFileName(
      validated.campaignId,
      source.fingerprint,
      strategy.format,
    ),
    mimeType: strategy.mimeType,
    rowCount: validated.rows.length,
    sourceFingerprint: source.fingerprint,
    sourceManifest: source.manifest as unknown as AdminReviewJsonObject,
    sourceVersion: ADMIN_ARTIFACT_SOURCE_VERSION,
  });
};

export const serializeAdminExportArtifact = (
  source: AdminReviewWinnerSource,
  format: AdminExportArtifactFormat,
  options: SerializeAdminExportArtifactOptions = {},
): SerializedAdminExportArtifact => {
  if (!(format === "csv" || format === "json")) {
    const traceId = safeContextValue(options.traceId, "trace-unavailable", MAX_TRACE_ID_LENGTH);
    return fail("ADMIN_EXPORT_ARTIFACT_INVALID_INPUT", { field: "format", traceId });
  }
  return serializeAdminExportArtifactWithStrategy(source, STRATEGIES[format], options);
};

export interface GenerateAdminExportArtifactInput {
  campaignId: string;
  expectedSourceFingerprint?: string;
  format: AdminExportArtifactFormat;
}

export interface GenerateAdminExportArtifactOptions {
  clock?: () => string;
}

const GENERATE_INPUT_KEYS = ["campaignId", "expectedSourceFingerprint", "format"] as const;

const assertGenerateInput = (
  input: GenerateAdminExportArtifactInput,
  trustedContext: TrustedAdminReviewOperatorContext,
): {
  campaignId: string;
  expectedSourceFingerprint?: string;
  format: AdminExportArtifactFormat;
  operatorRole: TrustedAdminReviewOperatorContext["operatorRole"];
  operatorSubject: string;
  traceId: string;
} => {
  const traceId = safeContextValue(
    trustedContext?.traceId,
    "trace-unavailable",
    MAX_TRACE_ID_LENGTH,
  );
  if (!isPlainRecord(input)) {
    return fail("ADMIN_EXPORT_ARTIFACT_INVALID_INPUT", { field: "command", traceId });
  }
  const inputKeys = Object.keys(input);
  if (inputKeys.some((key) => !GENERATE_INPUT_KEYS.includes(key as never))) {
    return fail("ADMIN_EXPORT_ARTIFACT_INVALID_INPUT", { field: "command", traceId });
  }
  if (
    typeof input.campaignId !== "string"
    || input.campaignId.length === 0
    || input.campaignId.length > MAX_IDENTIFIER_LENGTH
    || !SAFE_CONTEXT_PATTERN.test(input.campaignId)
  ) {
    return fail("ADMIN_EXPORT_ARTIFACT_INVALID_INPUT", { field: "campaignId", traceId });
  }
  if (!(input.format === "csv" || input.format === "json")) {
    return fail("ADMIN_EXPORT_ARTIFACT_INVALID_INPUT", { field: "format", traceId });
  }
  if (
    input.expectedSourceFingerprint !== undefined
    && !SHA256_PATTERN.test(input.expectedSourceFingerprint)
  ) {
    return fail("ADMIN_EXPORT_ARTIFACT_INVALID_INPUT", {
      field: "expectedSourceFingerprint",
      traceId,
    });
  }
  if (!(trustedContext?.operatorRole === "internal_operator"
    || trustedContext?.operatorRole === "review_operator")) {
    return fail("ADMIN_EXPORT_ARTIFACT_INVALID_INPUT", { field: "operatorRole", traceId });
  }
  if (
    typeof trustedContext.operatorSubject !== "string"
    || trustedContext.operatorSubject.length === 0
    || trustedContext.operatorSubject.length > MAX_OPERATOR_SUBJECT_LENGTH
    || !SAFE_CONTEXT_PATTERN.test(trustedContext.operatorSubject)
  ) {
    return fail("ADMIN_EXPORT_ARTIFACT_INVALID_INPUT", { field: "operatorSubject", traceId });
  }
  if (traceId === "trace-unavailable" && trustedContext.traceId !== traceId) {
    return fail("ADMIN_EXPORT_ARTIFACT_INVALID_INPUT", { field: "traceId", traceId });
  }

  return {
    campaignId: input.campaignId,
    ...(input.expectedSourceFingerprint === undefined
      ? {}
      : { expectedSourceFingerprint: input.expectedSourceFingerprint }),
    format: input.format,
    operatorRole: trustedContext.operatorRole,
    operatorSubject: trustedContext.operatorSubject,
    traceId,
  };
};

const normalizeDomainFailure = (
  error: AdminReviewDomainError,
  traceId: string,
): AdminExportArtifactError => {
  const code: AdminExportArtifactErrorCode = error.code === "ADMIN_REVIEW_DOMAIN_BOUND_EXCEEDED"
    ? "ADMIN_EXPORT_ARTIFACT_BOUND_EXCEEDED"
    : error.code === "ADMIN_REVIEW_DOMAIN_NOT_FOUND"
      ? "ADMIN_EXPORT_ARTIFACT_NOT_FOUND"
      : error.code === "ADMIN_REVIEW_DOMAIN_STALE"
        ? "ADMIN_EXPORT_ARTIFACT_STALE"
        : error.code === "ADMIN_REVIEW_DOMAIN_CONFLICT"
          ? "ADMIN_EXPORT_ARTIFACT_CONFLICT"
          : error.code === "ADMIN_REVIEW_DOMAIN_INVALID_FACTS"
            ? "ADMIN_EXPORT_ARTIFACT_INVALID_SOURCE"
            : "ADMIN_EXPORT_ARTIFACT_UNAVAILABLE";
  return new AdminExportArtifactError({ code, field: error.field, traceId });
};

const normalizeStoreFailure = (
  error: unknown,
  traceId: string,
): AdminExportArtifactError => {
  if (error instanceof AdminExportArtifactError) {
    return error;
  }
  if (error instanceof AdminReviewDomainError) {
    return normalizeDomainFailure(error, traceId);
  }
  if (!(error instanceof AdminReviewStoreError)) {
    return new AdminExportArtifactError({
      code: "ADMIN_EXPORT_ARTIFACT_UNAVAILABLE",
      field: "store",
      traceId,
    });
  }

  const code: AdminExportArtifactErrorCode = error.code === "ADMIN_REVIEW_STORE_STALE"
    ? "ADMIN_EXPORT_ARTIFACT_STALE"
    : error.code === "ADMIN_REVIEW_STORE_NOT_FOUND"
      ? "ADMIN_EXPORT_ARTIFACT_NOT_FOUND"
      : error.code === "ADMIN_REVIEW_STORE_BOUND_EXCEEDED"
        ? "ADMIN_EXPORT_ARTIFACT_BOUND_EXCEEDED"
        : error.code === "ADMIN_REVIEW_STORE_CONTENT_INTEGRITY_FAILED"
          || error.code === "ADMIN_REVIEW_STORE_ROW_CORRUPTION"
          ? "ADMIN_EXPORT_ARTIFACT_INTEGRITY_FAILED"
          : error.code === "ADMIN_REVIEW_STORE_IDEMPOTENCY_CONFLICT"
            || error.code === "ADMIN_REVIEW_STORE_CONSTRAINT_FAILED"
            ? "ADMIN_EXPORT_ARTIFACT_CONFLICT"
            : error.code === "ADMIN_REVIEW_STORE_ARGUMENT_INVALID"
              ? "ADMIN_EXPORT_ARTIFACT_INVALID_INPUT"
              : "ADMIN_EXPORT_ARTIFACT_UNAVAILABLE";
  return new AdminExportArtifactError({ code, field: error.field, traceId });
};

const assertIsoTimestamp = (value: unknown, field: string, traceId: string): string => {
  if (typeof value !== "string" || value.length > 64) {
    return fail("ADMIN_EXPORT_ARTIFACT_INVALID_INPUT", { field, traceId });
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString() !== value) {
    return fail("ADMIN_EXPORT_ARTIFACT_INVALID_INPUT", { field, traceId });
  }
  return value;
};

const isIsoTimestamp = (value: unknown): value is string => {
  if (typeof value !== "string" || value.length > 64) {
    return false;
  }
  const parsed = new Date(value);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString() === value;
};

const assertMetadataIntegrity = (
  result: AdminExportArtifactResult,
  projection: SerializedAdminExportArtifact,
  input: ReturnType<typeof assertGenerateInput>,
): AdminExportArtifactResult => {
  const { traceId } = input;
  if (!isPlainRecord(result) || typeof result.created !== "boolean" || !isPlainRecord(result.artifact)) {
    return fail("ADMIN_EXPORT_ARTIFACT_INTEGRITY_FAILED", { field: "artifact", traceId });
  }
  const artifact = result.artifact as unknown as AdminExportArtifactMetadata;
  const integrityChecks: ReadonlyArray<[boolean, string]> = [
    [artifact.campaignId === input.campaignId, "campaignId"],
    [artifact.contentBytes === projection.contentBytes, "contentBytes"],
    [artifact.contentHash === projection.contentHash, "contentHash"],
    [artifact.fileName === projection.fileName, "fileName"],
    [artifact.format === input.format, "format"],
    [artifact.mimeType === projection.mimeType, "mimeType"],
    [artifact.rowCount === projection.rowCount, "rowCount"],
    [artifact.sourceFingerprint === projection.sourceFingerprint, "sourceFingerprint"],
    [artifact.sourceVersion === ADMIN_ARTIFACT_SOURCE_VERSION, "sourceVersion"],
  ];
  const failed = integrityChecks.find(([matches]) => !matches);
  if (failed) {
    return fail("ADMIN_EXPORT_ARTIFACT_INTEGRITY_FAILED", {
      field: failed[1],
      traceId,
    });
  }
  if (
    typeof artifact.id !== "string"
    || artifact.id.length === 0
    || artifact.id.length > MAX_IDENTIFIER_LENGTH
    || !SAFE_CONTEXT_PATTERN.test(artifact.id)
  ) {
    return fail("ADMIN_EXPORT_ARTIFACT_INTEGRITY_FAILED", { field: "artifactId", traceId });
  }
  if (!isIsoTimestamp(artifact.createdAt)) {
    return fail("ADMIN_EXPORT_ARTIFACT_INTEGRITY_FAILED", { field: "createdAt", traceId });
  }
  if (
    !(artifact.creatorRole === "internal_operator" || artifact.creatorRole === "review_operator")
    || typeof artifact.creatorSubject !== "string"
    || artifact.creatorSubject.length === 0
    || artifact.creatorSubject.length > MAX_OPERATOR_SUBJECT_LENGTH
    || !SAFE_CONTEXT_PATTERN.test(artifact.creatorSubject)
    || safeContextValue(artifact.traceId, "trace-unavailable", MAX_TRACE_ID_LENGTH)
      === "trace-unavailable"
  ) {
    return fail("ADMIN_EXPORT_ARTIFACT_INTEGRITY_FAILED", { field: "creator", traceId });
  }
  if (result.created && (
    artifact.creatorRole !== input.operatorRole
    || artifact.creatorSubject !== input.operatorSubject
    || artifact.traceId !== traceId
  )) {
    return fail("ADMIN_EXPORT_ARTIFACT_INTEGRITY_FAILED", { field: "creator", traceId });
  }

  const safeArtifact: AdminExportArtifactMetadata = {
    campaignId: artifact.campaignId,
    contentBytes: artifact.contentBytes,
    contentHash: artifact.contentHash,
    createdAt: artifact.createdAt,
    creatorRole: artifact.creatorRole,
    creatorSubject: artifact.creatorSubject,
    fileName: artifact.fileName,
    format: artifact.format,
    id: artifact.id,
    mimeType: artifact.mimeType,
    rowCount: artifact.rowCount,
    sourceFingerprint: artifact.sourceFingerprint,
    sourceVersion: artifact.sourceVersion,
    traceId: artifact.traceId,
  };

  return Object.freeze({
    artifact: Object.freeze(safeArtifact),
    created: result.created,
  });
};

export const generateAdminExportArtifact = async (
  store: AdminReviewStore,
  input: GenerateAdminExportArtifactInput,
  trustedContext: TrustedAdminReviewOperatorContext,
  options: GenerateAdminExportArtifactOptions = {},
): Promise<AdminExportArtifactResult> => {
  const command = assertGenerateInput(input, trustedContext);
  const { traceId } = command;
  if (!store || typeof store !== "object" || typeof store.putArtifactFromSnapshot !== "function") {
    return fail("ADMIN_EXPORT_ARTIFACT_UNAVAILABLE", { field: "store", traceId });
  }
  const clock = options.clock ?? (() => new Date().toISOString());
  if (typeof clock !== "function") {
    return fail("ADMIN_EXPORT_ARTIFACT_INVALID_INPUT", { field: "clock", traceId });
  }
  let generatedAt: string;
  try {
    generatedAt = assertIsoTimestamp(clock(), "clock", traceId);
  } catch (error) {
    if (error instanceof AdminExportArtifactError) {
      throw error;
    }
    return fail("ADMIN_EXPORT_ARTIFACT_INVALID_INPUT", { field: "clock", traceId });
  }

  let projection: SerializedAdminExportArtifact | undefined;
  let projectionFailure: AdminExportArtifactError | undefined;
  let result: AdminExportArtifactResult;
  try {
    result = await store.putArtifactFromSnapshot({
      campaignId: command.campaignId,
      creatorRole: command.operatorRole,
      creatorSubject: command.operatorSubject,
      ...(command.expectedSourceFingerprint === undefined
        ? {}
        : { expectedSourceFingerprint: command.expectedSourceFingerprint }),
      format: command.format,
    }, async (transactionSource) => {
      try {
        const winnerSource = projectAdminReviewWinnerSourceFromStoreSnapshot(
          transactionSource,
          { generatedAt, traceId },
        );
        projection = serializeAdminExportArtifact(winnerSource, command.format, { traceId });
        return projection;
      } catch (error) {
        projectionFailure = error instanceof AdminExportArtifactError
          ? error
          : error instanceof AdminReviewDomainError
            ? normalizeDomainFailure(error, traceId)
            : new AdminExportArtifactError({
              code: "ADMIN_EXPORT_ARTIFACT_SERIALIZATION_FAILED",
              field: "source",
              traceId,
            });
        throw projectionFailure;
      }
    }, { traceId });
  } catch (error) {
    throw projectionFailure ?? normalizeStoreFailure(error, traceId);
  }
  if (!projection) {
    return fail("ADMIN_EXPORT_ARTIFACT_INTEGRITY_FAILED", {
      field: "projection",
      traceId,
    });
  }

  return assertMetadataIntegrity(result, projection, command);
};
