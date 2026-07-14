export const ADMIN_REVIEW_MIGRATION_ID = "0002_admin_review_export";
export const ADMIN_REVIEW_SNAPSHOT_VERSION = "review-snapshot-v1";
export const ADMIN_ARTIFACT_SOURCE_VERSION = "artifact-source-v1";
export const ADMIN_REVIEW_MAX_ARTIFACT_ROWS = 5_000;
export const ADMIN_REVIEW_MAX_ARTIFACT_BYTES = 10 * 1024 * 1024;
export const ADMIN_REVIEW_MAX_LIST_LIMIT = 100;

export type AdminOperatorRole = "internal_operator" | "review_operator";
export type AdminReviewDecisionValue = "approved" | "rejected" | "needs_review";
export type AdminExportArtifactFormat = "csv" | "json";

export type AdminReviewJsonPrimitive = boolean | null | number | string;
export type AdminReviewJsonValue =
  | AdminReviewJsonPrimitive
  | readonly AdminReviewJsonValue[]
  | { readonly [key: string]: AdminReviewJsonValue };
export interface AdminReviewJsonObject {
  readonly [key: string]: AdminReviewJsonValue;
}

export interface AdminReviewOperationContext {
  traceId: string;
}

export interface AdminReviewCampaignRow {
  contractMode: "CONTRACT_CLAIM" | "OFF_CHAIN_MVP" | "V2_COMPANION";
  endTime: string;
  id: string;
  startTime: string;
  status: string;
  updatedAt: string;
  walletPolicy: "AA_ONLY" | "ANY" | "EOA_ONLY";
}

export interface AdminReviewTaskRow {
  campaignId: string;
  id: string;
  points: number;
  required: boolean;
  updatedAt: string;
  verificationType: "DAPP_API" | "MANUAL" | "ON_CHAIN" | "SOCIAL" | "WALLET";
  walletCompatibility: "AA_ONLY" | "ANY" | "EOA_ONLY";
}

export interface AdminReviewParticipantRow {
  accountType: "AA" | "EOA" | "UNKNOWN";
  campaignId: string;
  createdAt: string;
  id: string;
  rank?: number;
  riskFlags: readonly string[];
  totalPoints: number;
  updatedAt: string;
  walletAddress: string;
  walletSource:
    | "AGENT_SKILL"
    | "NIGHTELF"
    | "OTHER"
    | "PORTKEY_AA"
    | "PORTKEY_EOA_APP"
    | "PORTKEY_EOA_EXTENSION";
  walletTypeVerified: boolean;
}

export interface AdminReviewCompletionRow {
  accountType: "AA" | "EOA" | "UNKNOWN";
  campaignId: string;
  completedAt?: string;
  id: string;
  pointsAwarded: number;
  status: "completed" | "failed" | "manual_review" | "pending";
  taskId: string;
  updatedAt: string;
  walletAddress: string;
  walletSource: AdminReviewParticipantRow["walletSource"];
}

export interface AdminReviewEvidenceRow {
  campaignId: string;
  capturedAt: string;
  completionId?: string;
  diagnosticCodes: readonly string[];
  evidenceHash: string;
  evidenceRef?: string;
  evidenceSource: "AEFINDER" | "AELFSCAN" | "DAPP_API" | "MANUAL" | "SOCIAL_API";
  id: string;
  pointsAwarded: number;
  status: AdminReviewCompletionRow["status"];
  taskId: string;
  updatedAt: string;
  walletAddress: string;
}

export interface AdminReviewRankingRow {
  campaignId: string;
  createdAt: string;
  participantId: string;
  rank?: number;
  totalPoints: number;
  walletAddress: string;
}

export interface AdminReviewSnapshotRows {
  campaign?: AdminReviewCampaignRow;
  completions: readonly AdminReviewCompletionRow[];
  evidence: readonly AdminReviewEvidenceRow[];
  participants: readonly AdminReviewParticipantRow[];
  ranking: readonly AdminReviewRankingRow[];
  tasks: readonly AdminReviewTaskRow[];
}

export interface AdminReviewSnapshotInput {
  campaignId: string;
  participantId?: string;
}

export interface AdminReviewSnapshotProjection {
  fingerprint: string;
  manifest: AdminReviewJsonObject;
  walletAddress: string;
}

export type AdminReviewSnapshotProjector = (
  rows: AdminReviewSnapshotRows,
) => AdminReviewSnapshotProjection | Promise<AdminReviewSnapshotProjection>;

export interface AdminReviewDecisionInput {
  campaignId: string;
  decision: AdminReviewDecisionValue;
  expectedSnapshotFingerprint: string;
  idempotencyKeyHash: string;
  note?: string;
  operatorRole: AdminOperatorRole;
  operatorSubject: string;
  participantId: string;
  payloadHash: string;
  reasonCode: string;
}

export interface AdminReviewDecisionRecord {
  campaignId: string;
  decidedAt: string;
  decision: AdminReviewDecisionValue;
  id: string;
  idempotencyKeyHash: string;
  note?: string;
  operatorRole: AdminOperatorRole;
  operatorSubject: string;
  participantId: string;
  payloadHash: string;
  reasonCode: string;
  snapshotFingerprint: string;
  snapshotManifest: AdminReviewJsonObject;
  snapshotVersion: typeof ADMIN_REVIEW_SNAPSHOT_VERSION;
  traceId: string;
  version: number;
  walletAddress: string;
}

export interface AdminReviewDecisionResult {
  created: boolean;
  record: AdminReviewDecisionRecord;
}

export interface AdminReviewDecisionScope {
  campaignId: string;
  participantId: string;
}

export interface AdminReviewDecisionListInput extends AdminReviewDecisionScope {
  limit?: number;
}

export interface AdminExportArtifactInput {
  campaignId: string;
  content: string;
  contentHash: string;
  creatorRole: AdminOperatorRole;
  creatorSubject: string;
  fileName: string;
  format: AdminExportArtifactFormat;
  mimeType: "application/json;charset=utf-8" | "text/csv;charset=utf-8";
  rowCount: number;
  sourceFingerprint: string;
  sourceManifest: AdminReviewJsonObject;
  sourceVersion: typeof ADMIN_ARTIFACT_SOURCE_VERSION;
}

export interface AdminExportArtifactMetadata {
  campaignId: string;
  contentBytes: number;
  contentHash: string;
  createdAt: string;
  creatorRole: AdminOperatorRole;
  creatorSubject: string;
  fileName: string;
  format: AdminExportArtifactFormat;
  id: string;
  mimeType: AdminExportArtifactInput["mimeType"];
  rowCount: number;
  sourceFingerprint: string;
  sourceVersion: typeof ADMIN_ARTIFACT_SOURCE_VERSION;
  traceId: string;
}

export interface AdminExportArtifactDetail {
  artifact: AdminExportArtifactMetadata;
  sourceManifest: AdminReviewJsonObject;
}

export interface AdminExportArtifactContent extends AdminExportArtifactDetail {
  content: string;
}

export interface AdminExportArtifactResult {
  artifact: AdminExportArtifactMetadata;
  created: boolean;
}

export interface AdminExportArtifactScope {
  artifactId: string;
  campaignId: string;
}

export interface AdminExportArtifactListInput {
  campaignId: string;
  limit?: number;
}

export type AdminReviewStoreOperation =
  | "appendDecision"
  | "close"
  | "getArtifact"
  | "getCurrentDecision"
  | "listArtifacts"
  | "listDecisions"
  | "putArtifact"
  | "readArtifactContent"
  | "readSnapshot";

export type AdminReviewStoreErrorCode =
  | "ADMIN_REVIEW_STORE_ARGUMENT_INVALID"
  | "ADMIN_REVIEW_STORE_BOUND_EXCEEDED"
  | "ADMIN_REVIEW_STORE_CLEANUP_FAILED"
  | "ADMIN_REVIEW_STORE_CLOSED"
  | "ADMIN_REVIEW_STORE_CONSTRAINT_FAILED"
  | "ADMIN_REVIEW_STORE_CONTENT_INTEGRITY_FAILED"
  | "ADMIN_REVIEW_STORE_IDEMPOTENCY_CONFLICT"
  | "ADMIN_REVIEW_STORE_MIGRATION_CHECKSUM_MISMATCH"
  | "ADMIN_REVIEW_STORE_NOT_FOUND"
  | "ADMIN_REVIEW_STORE_QUERY_FAILED"
  | "ADMIN_REVIEW_STORE_ROW_CORRUPTION"
  | "ADMIN_REVIEW_STORE_SCHEMA_NOT_READY"
  | "ADMIN_REVIEW_STORE_STALE";

const SAFE_ERROR_MESSAGES: Record<AdminReviewStoreErrorCode, string> = {
  ADMIN_REVIEW_STORE_ARGUMENT_INVALID: "Admin review store argument is invalid.",
  ADMIN_REVIEW_STORE_BOUND_EXCEEDED: "Admin review store bound was exceeded.",
  ADMIN_REVIEW_STORE_CLEANUP_FAILED: "Admin review store cleanup failed.",
  ADMIN_REVIEW_STORE_CLOSED: "Admin review store is closed.",
  ADMIN_REVIEW_STORE_CONSTRAINT_FAILED: "Admin review store constraint failed.",
  ADMIN_REVIEW_STORE_CONTENT_INTEGRITY_FAILED: "Admin review artifact integrity check failed.",
  ADMIN_REVIEW_STORE_IDEMPOTENCY_CONFLICT: "Admin review idempotency key conflicts with an existing command.",
  ADMIN_REVIEW_STORE_MIGRATION_CHECKSUM_MISMATCH: "Admin review store migration checksum does not match.",
  ADMIN_REVIEW_STORE_NOT_FOUND: "Admin review store record was not found.",
  ADMIN_REVIEW_STORE_QUERY_FAILED: "Admin review store query failed.",
  ADMIN_REVIEW_STORE_ROW_CORRUPTION: "Admin review store returned a corrupt row.",
  ADMIN_REVIEW_STORE_SCHEMA_NOT_READY: "Admin review store schema is not ready.",
  ADMIN_REVIEW_STORE_STALE: "Admin review snapshot precondition is stale.",
};

export class AdminReviewStoreError extends Error {
  readonly code: AdminReviewStoreErrorCode;
  readonly field: string;
  readonly operation: AdminReviewStoreOperation;
  readonly traceId: string;

  constructor(options: {
    code: AdminReviewStoreErrorCode;
    field: string;
    operation: AdminReviewStoreOperation;
    traceId: string;
  }) {
    super(SAFE_ERROR_MESSAGES[options.code]);
    this.name = "AdminReviewStoreError";
    this.code = options.code;
    this.field = options.field;
    this.operation = options.operation;
    this.traceId = options.traceId;
  }
}

export interface AdminReviewStore {
  appendDecision(
    input: AdminReviewDecisionInput,
    projectSnapshot: AdminReviewSnapshotProjector,
    context: AdminReviewOperationContext,
  ): Promise<AdminReviewDecisionResult>;
  close(context?: AdminReviewOperationContext): Promise<void>;
  getArtifact(
    input: AdminExportArtifactScope,
    context: AdminReviewOperationContext,
  ): Promise<AdminExportArtifactDetail | undefined>;
  getCurrentDecision(
    input: AdminReviewDecisionScope,
    context: AdminReviewOperationContext,
  ): Promise<AdminReviewDecisionRecord | undefined>;
  listArtifacts(
    input: AdminExportArtifactListInput,
    context: AdminReviewOperationContext,
  ): Promise<readonly AdminExportArtifactMetadata[]>;
  listDecisions(
    input: AdminReviewDecisionListInput,
    context: AdminReviewOperationContext,
  ): Promise<readonly AdminReviewDecisionRecord[]>;
  putArtifact(
    input: AdminExportArtifactInput,
    context: AdminReviewOperationContext,
  ): Promise<AdminExportArtifactResult>;
  readArtifactContent(
    input: AdminExportArtifactScope,
    context: AdminReviewOperationContext,
  ): Promise<AdminExportArtifactContent>;
  readSnapshot(
    input: AdminReviewSnapshotInput,
    context: AdminReviewOperationContext,
  ): Promise<AdminReviewSnapshotRows>;
}
