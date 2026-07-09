import {
  EXPORT_CSV_COLUMNS,
  campaignLifecycleStatuses,
  supportedLocales,
  type AccountType,
  type CampaignStatus,
  type ContractMode,
  type ExportAcknowledgementId,
  type ExportContractRootMode,
  type ExportCsvColumn,
  type ExportPreviewMode,
  type ExportReadinessState,
  type ExportRowReasonCode,
  type ExportRowStatus,
  type LocalizedText,
  type SupportedLocale,
  type VerificationType,
  type WalletCompatibility,
  type WalletPolicy,
  type WalletSignatureStatus,
  type WalletSource,
} from "../domain/types";
import {
  createCampaignDurableStore,
  type CampaignDurableStore,
  type CampaignDurableStoreManifest,
} from "./campaignDurableStore";

export type CampaignDbRepositoryMode = "deterministic_test" | "durable_test" | "production_deferred";
export type CampaignDbRepositoryStatus = "ready" | "blocked";
export type CampaignDbRepositoryEventType =
  | "transaction.begin"
  | "transaction.commit"
  | "command.planned"
  | "command.insert"
  | "command.update"
  | "query.lookup"
  | "query.list"
  | "diagnostic";
export type CampaignDbDiagnosticSeverity = "error" | "warning" | "info";
export type CampaignDbDiagnosticCode =
  | "CAMPAIGN_DURABLE_STORE_PATH_REQUIRED"
  | "CAMPAIGN_DURABLE_STORE_READ_FAILED"
  | "CAMPAIGN_DURABLE_STORE_WRITE_FAILED"
  | "CAMPAIGN_DURABLE_STORE_PRODUCTION_REQUIRED"
  | "CAMPAIGN_DB_REQUIRED_FIELD_MISSING"
  | "CAMPAIGN_DB_UNSUPPORTED_DEFAULT_LOCALE"
  | "CAMPAIGN_DB_UNSUPPORTED_LOCALE"
  | "CAMPAIGN_DB_UNSUPPORTED_WALLET_POLICY"
  | "CAMPAIGN_DB_UNSUPPORTED_CONTRACT_MODE"
  | "CAMPAIGN_DB_UNSUPPORTED_STATUS"
  | "CAMPAIGN_DB_INVALID_TIME_WINDOW"
  | "CAMPAIGN_DB_TASK_CAMPAIGN_NOT_FOUND"
  | "CAMPAIGN_DB_TASK_INVALID_EVIDENCE_RULE"
  | "CAMPAIGN_DB_TASK_INVALID_POINTS"
  | "CAMPAIGN_DB_TASK_REQUIRED_FIELD_MISSING"
  | "CAMPAIGN_DB_TASK_UNSUPPORTED_VERIFICATION_TYPE"
  | "CAMPAIGN_DB_TASK_UNSUPPORTED_WALLET_COMPATIBILITY"
  | "CAMPAIGN_DB_COMPLETION_CAMPAIGN_NOT_FOUND"
  | "CAMPAIGN_DB_COMPLETION_INVALID_EVIDENCE_HASH"
  | "CAMPAIGN_DB_COMPLETION_REQUIRED_FIELD_MISSING"
  | "CAMPAIGN_DB_COMPLETION_TASK_NOT_FOUND"
  | "CAMPAIGN_DB_COMPLETION_UNSUPPORTED_ACCOUNT_TYPE"
  | "CAMPAIGN_DB_COMPLETION_UNSUPPORTED_EVIDENCE_SOURCE"
  | "CAMPAIGN_DB_COMPLETION_UNSUPPORTED_STATUS"
  | "CAMPAIGN_DB_COMPLETION_UNSUPPORTED_WALLET_SOURCE"
  | "CAMPAIGN_DB_PARTICIPANT_CAMPAIGN_NOT_FOUND"
  | "CAMPAIGN_DB_PARTICIPANT_INVALID_POINTS"
  | "CAMPAIGN_DB_PARTICIPANT_INVALID_RANK"
  | "CAMPAIGN_DB_PARTICIPANT_INVALID_RISK_FLAGS"
  | "CAMPAIGN_DB_PARTICIPANT_INVALID_WALLET_VERIFIED_AT"
  | "CAMPAIGN_DB_PARTICIPANT_REQUIRED_FIELD_MISSING"
  | "CAMPAIGN_DB_PARTICIPANT_UNSUPPORTED_ACCOUNT_TYPE"
  | "CAMPAIGN_DB_PARTICIPANT_UNSUPPORTED_LOCALE"
  | "CAMPAIGN_DB_PARTICIPANT_UNSUPPORTED_SIGNATURE_STATUS"
  | "CAMPAIGN_DB_PARTICIPANT_UNSUPPORTED_WALLET_SOURCE"
  | "CAMPAIGN_DB_REFERRAL_BINDING_NOT_FOUND"
  | "CAMPAIGN_DB_REFERRAL_CAMPAIGN_NOT_FOUND"
  | "CAMPAIGN_DB_REFERRAL_DUPLICATE_BINDING"
  | "CAMPAIGN_DB_REFERRAL_INVALID_EVIDENCE_HASH"
  | "CAMPAIGN_DB_REFERRAL_INVALID_RISK_FLAGS"
  | "CAMPAIGN_DB_REFERRAL_REQUIRED_FIELD_MISSING"
  | "CAMPAIGN_DB_REFERRAL_SELF_REFERRAL_BLOCKED"
  | "CAMPAIGN_DB_REFERRAL_UNSUPPORTED_ACCOUNT_TYPE"
  | "CAMPAIGN_DB_REFERRAL_UNSUPPORTED_WALLET_SOURCE"
  | "CAMPAIGN_DB_EXPORT_CAMPAIGN_NOT_FOUND"
  | "CAMPAIGN_DB_EXPORT_REQUIRED_COLUMN_DISABLED"
  | "CAMPAIGN_DB_EXPORT_REQUIRED_FIELD_MISSING"
  | "CAMPAIGN_DB_EXPORT_UNSUPPORTED_CONTRACT_ROOT_MODE"
  | "CAMPAIGN_DB_EXPORT_UNSUPPORTED_FORMAT"
  | "CAMPAIGN_DB_PRODUCTION_DEFERRED";

export interface CampaignDbDiagnostic {
  code: CampaignDbDiagnosticCode;
  field: string;
  message: string;
  severity: CampaignDbDiagnosticSeverity;
}

export interface CampaignDbPublishReadiness {
  blockers: string[];
  ready: boolean;
  warnings: string[];
}

export interface CampaignDbDraft {
  contractMode: ContractMode;
  createdAt: string;
  defaultLocale: "en-US";
  duration: string;
  endTime: string;
  goal: string;
  id: string;
  metadataHash?: string;
  metadataUri?: string;
  ownerAddress: string;
  projectId: string;
  publishReadiness: CampaignDbPublishReadiness;
  rewardDescription: string;
  rewardDisclaimerHash?: string;
  startTime: string;
  status: CampaignStatus;
  supportedLocales: SupportedLocale[];
  updatedAt: string;
  walletPolicy: WalletPolicy;
}

export interface CampaignDbCreateDraftInput {
  contractMode?: ContractMode | string;
  defaultLocale?: SupportedLocale | string;
  duration: string;
  endTime: string;
  goal: string;
  metadataHash?: string;
  metadataUri?: string;
  ownerAddress: string;
  projectId: string;
  publishReadiness?: CampaignDbPublishReadiness;
  rewardDescription: string;
  rewardDisclaimerHash?: string;
  startTime: string;
  status?: CampaignStatus | string;
  supportedLocales?: readonly (SupportedLocale | string)[];
  walletPolicy?: WalletPolicy | string;
}

export interface CampaignDbTaskDraft {
  campaignId: string;
  createdAt: string;
  evidenceRule: Record<string, string | number | boolean>;
  id: string;
  points: number;
  required: boolean;
  templateCode: string;
  updatedAt: string;
  verificationType: VerificationType;
  walletCompatibility: WalletCompatibility;
}

export interface CampaignDbAddTaskDraftInput {
  campaignId: string;
  evidenceRule: Record<string, string | number | boolean>;
  points: number;
  required: boolean;
  templateCode: string;
  verificationType: VerificationType | string;
  walletCompatibility: WalletCompatibility | string;
}

export type CampaignDbTaskCompletionStatus = "pending" | "completed" | "failed" | "manual_review";
export type CampaignDbTaskCompletionEvidenceSource =
  | "AEFINDER"
  | "AELFSCAN"
  | "DAPP_API"
  | "SOCIAL_API"
  | "MANUAL";

export interface CampaignDbTaskCompletion {
  accountType: AccountType;
  campaignId: string;
  completedAt?: string;
  createdAt: string;
  evidenceHash?: string;
  evidenceSource: CampaignDbTaskCompletionEvidenceSource;
  id: string;
  pointsAwarded: number;
  status: CampaignDbTaskCompletionStatus;
  taskId: string;
  updatedAt: string;
  walletAddress: string;
  walletSource: WalletSource;
}

export interface CampaignDbParticipantRecord {
  accountType: AccountType;
  campaignId: string;
  createdAt: string;
  id: string;
  localePreference: SupportedLocale;
  rank?: number;
  riskFlags: string[];
  totalPoints: number;
  updatedAt: string;
  walletAddress: string;
  walletSignatureStatus: WalletSignatureStatus;
  walletSource: WalletSource;
  walletTypeVerified: boolean;
  walletVerifiedAt?: string;
}

export interface CampaignDbUpsertParticipantInput {
  accountType: AccountType | string;
  campaignId: string;
  localePreference?: SupportedLocale | string;
  rank?: number;
  riskFlags?: readonly string[];
  totalPoints?: number;
  walletAddress: string;
  walletSignatureStatus?: WalletSignatureStatus | string;
  walletSource: WalletSource | string;
  walletTypeVerified?: boolean;
  walletVerifiedAt?: string;
}

export type CampaignDbReferralBindingStatus = "pending" | "qualified" | "risk_review";

export interface CampaignDbReferralBindingRecord {
  campaignId: string;
  createdAt: string;
  id: string;
  inviteeAccountType: AccountType;
  inviteeWalletAddress: string;
  inviteeWalletSource: WalletSource;
  qualifiedActionCompleted: boolean;
  qualifiedActionCompletedAt?: string;
  qualifiedActionEvidenceHash?: string;
  referrerAccountType: AccountType;
  referrerWalletAddress: string;
  referrerWalletSource: WalletSource;
  riskFlags: string[];
  status: CampaignDbReferralBindingStatus;
  updatedAt: string;
}

export interface CampaignDbBindReferralInput {
  campaignId: string;
  inviteeAccountType: AccountType | string;
  inviteeWalletAddress: string;
  inviteeWalletSource: WalletSource | string;
  referrerAccountType: AccountType | string;
  referrerWalletAddress: string;
  referrerWalletSource: WalletSource | string;
  riskFlags?: readonly string[];
}

export interface CampaignDbMarkReferralQualifiedInput {
  campaignId: string;
  inviteeWalletAddress: string;
  qualifiedActionEvidenceHash: string;
  riskFlags?: readonly string[];
}

export interface CampaignDbUpsertTaskCompletionInput {
  accountType: AccountType | string;
  campaignId: string;
  evidenceHash?: string;
  evidenceSource?: CampaignDbTaskCompletionEvidenceSource | string;
  status?: CampaignDbTaskCompletionStatus | string;
  taskId: string;
  walletAddress: string;
  walletSource: WalletSource | string;
}

export interface CampaignDbOperationContext {
  traceId?: string;
}

export interface CampaignDbReadProjection extends CampaignDbDraft {
  repository: {
    adapterId: string;
    createdViaRepository: true;
    repositoryId: string;
    storeId: "campaign-db";
      transactionId?: string;
  };
  completions: CampaignDbTaskCompletion[];
  participants: CampaignDbParticipantRecord[];
  referralBindings: CampaignDbReferralBindingRecord[];
  tasks: CampaignDbTaskDraft[];
}

export interface CampaignDbEligibilityInput {
  accountType?: AccountType | string;
  campaignId: string;
  walletAddress: string;
  walletSource?: WalletSource | string;
}

export interface CampaignDbEligibilityProjection {
  accountType: AccountType;
  campaignId: string;
  eligible: boolean;
  localePreference: SupportedLocale;
  missingTasks: string[];
  repository: {
    adapterId: string;
    createdViaRepository: true;
    repositoryId: string;
    storeId: "campaign-db";
  };
  riskFlags: string[];
  score: number;
  status: "eligible" | "not_eligible" | "pending" | "risk_flagged" | "ended";
  walletAddress: string;
  walletSource: WalletSource;
  walletTypeVerified: boolean;
}

export interface CampaignDbExportProjectionInput {
  campaignId: string;
  contractRootMode?: ExportContractRootMode | string;
  format?: ExportPreviewMode | string;
  includeLocalePreference?: boolean;
  includeRiskFlags?: boolean;
  includeWalletType?: boolean;
}

export interface CampaignDbExportProjectionRequest {
  campaignId: string;
  contractRootMode: "none";
  format: ExportPreviewMode;
  includeLocalePreference: true;
  includeRiskFlags: true;
  includeWalletType: true;
}

export type CampaignDbExportTaskStatus = CampaignDbTaskCompletionStatus | "missing";

export interface CampaignDbExportTaskRecord {
  completedAt?: string;
  evidenceHash?: string;
  evidenceSource?: CampaignDbTaskCompletionEvidenceSource;
  pointsAwarded: number;
  pointsAvailable: number;
  required: boolean;
  status: CampaignDbExportTaskStatus;
  taskId: string;
  templateCode: string;
  updatedAt?: string;
  verificationType: VerificationType;
}

export interface CampaignDbExportRow {
  accountType: AccountType;
  campaignId: string;
  eligible: boolean;
  evidenceHashes: string[];
  exportBatchId: string;
  localePreference: SupportedLocale;
  missingColumnValues: ExportCsvColumn[];
  missingTasks: string[];
  rank?: number;
  referrerAddress: string;
  riskFlags: string[];
  rowStatus: ExportRowStatus;
  taskRecords: CampaignDbExportTaskRecord[];
  totalPoints: number;
  walletAddress: string;
  walletSource: WalletSource;
  walletTypeVerified: boolean;
}

export interface CampaignDbExportArtifact {
  artifactId: string;
  campaignId: string;
  checksum: string;
  checksumAlgorithm: "fnv1a32-local-review";
  columns: readonly ExportCsvColumn[];
  createdAt: string;
  format: ExportPreviewMode;
  generatedMode: "local_review_only";
  localPreviewMode: true;
  mimeType: string;
  payloadBytes: number;
  csvPreview?: string;
  jsonPreview?: Array<Record<ExportCsvColumn, string | number | boolean | string[]>>;
  safety: {
    localOnly: true;
    noContractRoot: true;
    noContractTransaction: true;
    noDownloadUrl: true;
    noRewardCustody: true;
    noRewardDistribution: true;
    noStorageWrite: true;
    verifiedRecordsOnly: true;
  };
}

export interface CampaignDbExportPreviewModeReadiness {
  boundary: LocalizedText;
  downloadAvailable: false;
  generatesFile: false;
  includedFields: readonly ExportCsvColumn[];
  label: LocalizedText;
  mode: ExportPreviewMode;
  nextAction: LocalizedText;
  readiness: ExportReadinessState;
}

export interface CampaignDbExportFieldCoverage {
  coverageReady: boolean;
  missingFields: readonly ExportCsvColumn[];
  presentFields: readonly ExportCsvColumn[];
  requiredFields: readonly ExportCsvColumn[];
}

export interface CampaignDbExportRowStatusReason {
  affectedRows: number;
  label: LocalizedText;
  nextAction: LocalizedText;
  reasonCode: ExportRowReasonCode;
  rowStatus: ExportRowStatus;
}

export interface CampaignDbExportAcknowledgement {
  acknowledged: boolean;
  description: LocalizedText;
  id: ExportAcknowledgementId;
  label: LocalizedText;
  ownerRole: "project_owner" | "internal_operator";
  required: boolean;
}

export interface CampaignDbExportContractRootReadiness {
  approvalRequired: boolean;
  boundary: LocalizedText;
  label: LocalizedText;
  mode: ExportContractRootMode;
  nextAction: LocalizedText;
  readiness: ExportReadinessState;
  safeDefault: boolean;
}

export interface CampaignDbExportReadinessProjection {
  acknowledgements: CampaignDbExportAcknowledgement[];
  batchId: string;
  boundary: LocalizedText;
  campaignId: string;
  contractRootReadiness: CampaignDbExportContractRootReadiness[];
  fieldCoverage: CampaignDbExportFieldCoverage;
  nextAction: LocalizedText;
  previewModes: CampaignDbExportPreviewModeReadiness[];
  repository: {
    adapterId: string;
    createdViaRepository: true;
    repositoryId: string;
    storeId: "campaign-db";
  };
  rowStatusCoverage: CampaignDbExportRowStatusReason[];
  summary: {
    acknowledgedItems: number;
    blockedRows: number;
    previewModeCount: number;
    readyRows: number;
    requiredAcknowledgements: number;
    reviewRequiredRows: number;
    totalRows: number;
  };
}

export interface CampaignDbExportProjection {
  artifact: CampaignDbExportArtifact;
  blockedRows: number;
  campaignId: string;
  columns: readonly ExportCsvColumn[];
  contractRootMode: "none";
  disclaimer: string;
  exportBatchId: string;
  exportReadiness: CampaignDbExportReadinessProjection;
  format: ExportPreviewMode;
  readyRows: number;
  repository: CampaignDbExportReadinessProjection["repository"];
  reviewRequiredRows: number;
  rows: CampaignDbExportRow[];
}

export interface CampaignDbListFilter {
  limit?: number;
  ownerAddress?: string;
  projectId?: string;
  status?: CampaignStatus | string;
}

export interface CampaignDbParticipantListFilter {
  campaignId: string;
  limit?: number;
  walletAddress?: string;
}

export interface CampaignDbReferralBindingListFilter {
  campaignId: string;
  inviteeWalletAddress?: string;
  limit?: number;
  referrerWalletAddress?: string;
}

export interface CampaignDbRepositoryEvent {
  entity: "Campaign" | "CampaignParticipant" | "CampaignTask" | "ReferralBinding" | "TaskCompletion";
  id: string;
  liveExecution: false;
  operation: string;
  sequence: number;
  storeId: "campaign-db";
  traceId?: string;
  transactionId?: string;
  type: CampaignDbRepositoryEventType;
}

export interface CampaignDbRepositoryHealth {
  adapterId: string;
  campaignStore?: CampaignDurableStoreManifest;
  diagnosticCodes: CampaignDbDiagnosticCode[];
  diagnostics: CampaignDbDiagnostic[];
  eventCount: number;
  fallbackUsed: false;
  completionRecordCount: number;
  id: "campaign-db-repository-runtime";
  liveConnectionAttempted: false;
  liveMigrationExecutionEnabled: false;
  liveQueryExecutionEnabled: false;
  productionReady: false;
  participantRecordCount: number;
  referralBindingRecordCount: number;
  recordCount: number;
  selectedMode: CampaignDbRepositoryMode;
  status: CampaignDbRepositoryStatus;
  storeId: "campaign-db";
  taskRecordCount: number;
  validation: {
    issues: CampaignDbDiagnostic[];
    valid: boolean;
  };
}

export interface CampaignDbRepository {
  addTaskDraft(
    input: CampaignDbAddTaskDraftInput,
    context?: CampaignDbOperationContext,
  ): Promise<CampaignDbTaskDraft>;
  checkEligibility?(
    input: CampaignDbEligibilityInput,
    context?: CampaignDbOperationContext,
  ): Promise<CampaignDbEligibilityProjection>;
  createDraft(
    input: CampaignDbCreateDraftInput,
    context?: CampaignDbOperationContext,
  ): Promise<CampaignDbDraft>;
  getById(
    campaignId: string,
    context?: CampaignDbOperationContext,
  ): Promise<CampaignDbReadProjection | undefined>;
  getEvents(): CampaignDbRepositoryEvent[];
  getParticipant?(
    campaignId: string,
    walletAddress: string,
    context?: CampaignDbOperationContext,
  ): Promise<CampaignDbParticipantRecord | undefined>;
  health(): Promise<CampaignDbRepositoryHealth>;
  list(
    filter?: CampaignDbListFilter,
    context?: CampaignDbOperationContext,
  ): Promise<CampaignDbReadProjection[]>;
  listParticipants?(
    filter: CampaignDbParticipantListFilter,
    context?: CampaignDbOperationContext,
  ): Promise<CampaignDbParticipantRecord[]>;
  getExportReadiness?(
    input: CampaignDbExportProjectionInput,
    context?: CampaignDbOperationContext,
  ): Promise<CampaignDbExportReadinessProjection>;
  getReferralBinding?(
    campaignId: string,
    inviteeWalletAddress: string,
    context?: CampaignDbOperationContext,
  ): Promise<CampaignDbReferralBindingRecord | undefined>;
  listReferralBindings?(
    filter: CampaignDbReferralBindingListFilter,
    context?: CampaignDbOperationContext,
  ): Promise<CampaignDbReferralBindingRecord[]>;
  markReferralQualified?(
    input: CampaignDbMarkReferralQualifiedInput,
    context?: CampaignDbOperationContext,
  ): Promise<CampaignDbReferralBindingRecord>;
  projectExport?(
    input: CampaignDbExportProjectionInput,
    context?: CampaignDbOperationContext,
  ): Promise<CampaignDbExportProjection>;
  reset(): Promise<void>;
  bindReferral?(
    input: CampaignDbBindReferralInput,
    context?: CampaignDbOperationContext,
  ): Promise<CampaignDbReferralBindingRecord>;
  upsertParticipant?(
    input: CampaignDbUpsertParticipantInput,
    context?: CampaignDbOperationContext,
  ): Promise<CampaignDbParticipantRecord>;
  upsertTaskCompletion?(
    input: CampaignDbUpsertTaskCompletionInput,
    context?: CampaignDbOperationContext,
  ): Promise<CampaignDbTaskCompletion>;
}

export interface CreateCampaignDbRepositoryOptions {
  boundedListLimit?: number;
  durableStore?: CampaignDurableStore;
  durableStoreFilePath?: string;
  mode?: CampaignDbRepositoryMode;
  now?: () => string;
  requestedDriverId?: string;
}

export class CampaignDbRepositoryError extends Error {
  readonly diagnostics: CampaignDbDiagnostic[];

  constructor(message: string, diagnostics: CampaignDbDiagnostic[]) {
    super(message);
    this.name = "CampaignDbRepositoryError";
    this.diagnostics = diagnostics;
  }
}

const defaultNow = () => "2026-07-06T00:00:00.000Z";
const walletPolicies = ["ANY", "AA_ONLY", "EOA_ONLY"] as const satisfies readonly WalletPolicy[];
const verificationTypes = ["WALLET", "ON_CHAIN", "DAPP_API", "SOCIAL", "MANUAL"] as const satisfies readonly VerificationType[];
const accountTypes = ["AA", "EOA", "UNKNOWN"] as const satisfies readonly AccountType[];
const walletSources = [
  "PORTKEY_AA",
  "PORTKEY_EOA_APP",
  "PORTKEY_EOA_EXTENSION",
  "NIGHTELF",
  "AGENT_SKILL",
  "OTHER",
] as const satisfies readonly WalletSource[];
const completionStatuses = [
  "pending",
  "completed",
  "failed",
  "manual_review",
] as const satisfies readonly CampaignDbTaskCompletionStatus[];
const completionEvidenceSources = [
  "AEFINDER",
  "AELFSCAN",
  "DAPP_API",
  "SOCIAL_API",
  "MANUAL",
] as const satisfies readonly CampaignDbTaskCompletionEvidenceSource[];
const walletSignatureStatuses = [
  "signed",
  "missing",
  "not_required",
  "not_available",
] as const satisfies readonly WalletSignatureStatus[];
const exportFormats = ["csv", "json"] as const satisfies readonly ExportPreviewMode[];
const exportContractRootModes = [
  "none",
  "eligibility_root",
  "winners_root",
  "contract_claim",
] as const satisfies readonly ExportContractRootMode[];
const contractModes = [
  "OFF_CHAIN_MVP",
  "V2_COMPANION",
  "CONTRACT_CLAIM",
] as const satisfies readonly ContractMode[];
const secretLikeKeyFragments = [
  "apikey",
  "bearer",
  "mnemonic",
  "objectkey",
  "password",
  "privatekey",
  "secret",
  "seedphrase",
  "signature",
  "signedurl",
  "token",
  "url",
];

const diagnostic = (
  code: CampaignDbDiagnosticCode,
  field: string,
  message: string,
  severity: CampaignDbDiagnosticSeverity = "error",
): CampaignDbDiagnostic => ({
  code,
  field,
  message,
  severity,
});

const isNonEmptyString = (value: string | undefined): value is string =>
  typeof value === "string" && value.trim().length > 0;

const normalizeSecretKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "");

const hasSecretLikeKey = (key: string) => {
  const normalizedKey = normalizeSecretKey(key);

  return secretLikeKeyFragments.some((fragment) => normalizedKey.includes(fragment));
};

const hasSecretLikeValue = (value: string) => {
  const normalizedValue = normalizeSecretKey(value);

  return value.includes("://") ||
    value.includes("@") ||
    secretLikeKeyFragments.some((fragment) => normalizedValue.includes(fragment));
};

export const sanitizeCampaignDbDiagnosticValue = (
  key: string,
  value: string | undefined,
): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return hasSecretLikeKey(key) || hasSecretLikeValue(value) ? "[redacted]" : value;
};

const isSupportedLocale = (value: string): value is SupportedLocale =>
  (supportedLocales as readonly string[]).includes(value);

const isWalletPolicy = (value: string): value is WalletPolicy =>
  (walletPolicies as readonly string[]).includes(value);

const isAccountType = (value: string): value is AccountType =>
  (accountTypes as readonly string[]).includes(value);

const isWalletSource = (value: string): value is WalletSource =>
  (walletSources as readonly string[]).includes(value);

const isWalletSignatureStatus = (value: string): value is WalletSignatureStatus =>
  (walletSignatureStatuses as readonly string[]).includes(value);

const isVerificationType = (value: string): value is VerificationType =>
  (verificationTypes as readonly string[]).includes(value);

const isCompletionStatus = (value: string): value is CampaignDbTaskCompletionStatus =>
  (completionStatuses as readonly string[]).includes(value);

const isCompletionEvidenceSource = (value: string): value is CampaignDbTaskCompletionEvidenceSource =>
  (completionEvidenceSources as readonly string[]).includes(value);

const isExportFormat = (value: string): value is ExportPreviewMode =>
  (exportFormats as readonly string[]).includes(value);

const isExportContractRootMode = (value: string): value is ExportContractRootMode =>
  (exportContractRootModes as readonly string[]).includes(value);

const isContractMode = (value: string): value is ContractMode =>
  (contractModes as readonly string[]).includes(value);

const isCampaignStatus = (value: string): value is CampaignStatus =>
  (campaignLifecycleStatuses as readonly string[]).includes(value);

const requireString = (
  input: CampaignDbCreateDraftInput,
  field: keyof Pick<
    CampaignDbCreateDraftInput,
    "duration" | "endTime" | "goal" | "ownerAddress" | "projectId" | "rewardDescription" | "startTime"
  >,
  issues: CampaignDbDiagnostic[],
) => {
  const value = input[field];

  if (!isNonEmptyString(value)) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_REQUIRED_FIELD_MISSING",
      field,
      `Campaign DB draft field '${field}' is required.`,
    ));

    return "";
  }

  return value.trim();
};

const normalizeDefaultLocale = (
  defaultLocale: string | undefined,
  issues: CampaignDbDiagnostic[],
): "en-US" => {
  const locale = defaultLocale ?? "en-US";

  if (locale !== "en-US") {
    issues.push(diagnostic(
      "CAMPAIGN_DB_UNSUPPORTED_DEFAULT_LOCALE",
      "defaultLocale",
      "Campaign DB draft defaultLocale must be en-US.",
    ));
  }

  return "en-US";
};

const normalizeSupportedLocales = (
  requestedLocales: readonly (SupportedLocale | string)[] | undefined,
  issues: CampaignDbDiagnostic[],
): SupportedLocale[] => {
  const locales = requestedLocales ?? supportedLocales;

  if (
    locales.length === 0 ||
    locales.some((locale) => !isSupportedLocale(locale)) ||
    !locales.includes("en-US")
  ) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_UNSUPPORTED_LOCALE",
      "supportedLocales",
      "Campaign DB draft supportedLocales must contain supported locale values and include en-US.",
    ));

    return [...supportedLocales];
  }

  return Array.from(new Set(locales.filter(isSupportedLocale)));
};

const normalizeWalletPolicy = (
  walletPolicy: string | undefined,
  issues: CampaignDbDiagnostic[],
): WalletPolicy => {
  const policy = walletPolicy ?? "ANY";

  if (!isWalletPolicy(policy)) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_UNSUPPORTED_WALLET_POLICY",
      "walletPolicy",
      "Campaign DB draft walletPolicy is unsupported.",
    ));

    return "ANY";
  }

  return policy;
};

const normalizeContractMode = (
  contractMode: string | undefined,
  issues: CampaignDbDiagnostic[],
): ContractMode => {
  const mode = contractMode ?? "OFF_CHAIN_MVP";

  if (!isContractMode(mode)) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_UNSUPPORTED_CONTRACT_MODE",
      "contractMode",
      "Campaign DB draft contractMode is unsupported.",
    ));

    return "OFF_CHAIN_MVP";
  }

  return mode;
};

const normalizeStatus = (
  status: string | undefined,
  issues: CampaignDbDiagnostic[],
): CampaignStatus => {
  const draftStatus = status ?? "draft";

  if (!isCampaignStatus(draftStatus)) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_UNSUPPORTED_STATUS",
      "status",
      "Campaign DB draft status is unsupported.",
    ));

    return "draft";
  }

  return draftStatus;
};

const validateTimeWindow = (
  startTime: string,
  endTime: string,
  issues: CampaignDbDiagnostic[],
) => {
  const start = Date.parse(startTime);
  const end = Date.parse(endTime);

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_INVALID_TIME_WINDOW",
      "timeWindow",
      "Campaign DB draft startTime and endTime must be valid, and endTime must be later than startTime.",
    ));
  }
};

const validateCreateDraftInput = (
  input: CampaignDbCreateDraftInput,
): Omit<CampaignDbDraft, "createdAt" | "id" | "updatedAt"> => {
  const issues: CampaignDbDiagnostic[] = [];
  const duration = requireString(input, "duration", issues);
  const endTime = requireString(input, "endTime", issues);
  const goal = requireString(input, "goal", issues);
  const ownerAddress = requireString(input, "ownerAddress", issues);
  const projectId = requireString(input, "projectId", issues);
  const rewardDescription = requireString(input, "rewardDescription", issues);
  const startTime = requireString(input, "startTime", issues);
  const defaultLocale = normalizeDefaultLocale(input.defaultLocale, issues);
  const supportedLocaleSet = normalizeSupportedLocales(input.supportedLocales, issues);
  const walletPolicy = normalizeWalletPolicy(input.walletPolicy, issues);
  const contractMode = normalizeContractMode(input.contractMode, issues);
  const status = normalizeStatus(input.status, issues);

  validateTimeWindow(startTime, endTime, issues);

  if (issues.length > 0) {
    throw new CampaignDbRepositoryError("Invalid Campaign DB draft input.", issues);
  }

  return {
    contractMode,
    defaultLocale,
    duration,
    endTime,
    goal,
    ...(input.metadataHash ? { metadataHash: input.metadataHash } : {}),
    ...(input.metadataUri ? { metadataUri: input.metadataUri } : {}),
    ownerAddress,
    projectId,
    publishReadiness: input.publishReadiness ?? {
      blockers: [],
      ready: true,
      warnings: [],
    },
    rewardDescription,
    ...(input.rewardDisclaimerHash ? { rewardDisclaimerHash: input.rewardDisclaimerHash } : {}),
    startTime,
    status,
    supportedLocales: supportedLocaleSet,
    walletPolicy,
  };
};

const requireTaskString = (
  input: CampaignDbAddTaskDraftInput,
  field: keyof Pick<CampaignDbAddTaskDraftInput, "campaignId" | "templateCode">,
  issues: CampaignDbDiagnostic[],
) => {
  const value = input[field];

  if (!isNonEmptyString(value)) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_TASK_REQUIRED_FIELD_MISSING",
      field,
      `Campaign DB task draft field '${field}' is required.`,
    ));

    return "";
  }

  return value.trim();
};

const normalizeTaskWalletCompatibility = (
  walletCompatibility: string,
  issues: CampaignDbDiagnostic[],
): WalletCompatibility => {
  if (!isWalletPolicy(walletCompatibility)) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_TASK_UNSUPPORTED_WALLET_COMPATIBILITY",
      "walletCompatibility",
      "Campaign DB task draft walletCompatibility is unsupported.",
    ));

    return "ANY";
  }

  return walletCompatibility;
};

const normalizeTaskVerificationType = (
  verificationType: string,
  issues: CampaignDbDiagnostic[],
): VerificationType => {
  if (!isVerificationType(verificationType)) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_TASK_UNSUPPORTED_VERIFICATION_TYPE",
      "verificationType",
      "Campaign DB task draft verificationType is unsupported.",
    ));

    return "MANUAL";
  }

  return verificationType;
};

const normalizeTaskPoints = (
  points: number,
  issues: CampaignDbDiagnostic[],
) => {
  if (!Number.isFinite(points) || !Number.isInteger(points) || points <= 0) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_TASK_INVALID_POINTS",
      "points",
      "Campaign DB task draft points must be a positive integer.",
    ));

    return 0;
  }

  return points;
};

const normalizeTaskEvidenceRule = (
  evidenceRule: Record<string, string | number | boolean>,
  issues: CampaignDbDiagnostic[],
) => {
  const invalid =
    !evidenceRule ||
    typeof evidenceRule !== "object" ||
    Array.isArray(evidenceRule) ||
    Object.keys(evidenceRule).length === 0 ||
    Object.entries(evidenceRule).some(([key, value]) =>
      hasSecretLikeKey(key) ||
      (typeof value === "string" && hasSecretLikeValue(value)) ||
      (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean")
    );

  if (invalid) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_TASK_INVALID_EVIDENCE_RULE",
      "evidenceRule",
      "Campaign DB task draft evidenceRule must be a non-empty plain record with safe primitive values.",
    ));

    return {};
  }

  return { ...evidenceRule };
};

const validateAddTaskDraftInput = (
  input: CampaignDbAddTaskDraftInput,
  campaignExists: boolean,
): Omit<CampaignDbTaskDraft, "createdAt" | "id" | "updatedAt"> => {
  const issues: CampaignDbDiagnostic[] = [];
  const campaignId = requireTaskString(input, "campaignId", issues);
  const templateCode = requireTaskString(input, "templateCode", issues);
  const walletCompatibility = normalizeTaskWalletCompatibility(input.walletCompatibility, issues);
  const verificationType = normalizeTaskVerificationType(input.verificationType, issues);
  const points = normalizeTaskPoints(input.points, issues);
  const evidenceRule = normalizeTaskEvidenceRule(input.evidenceRule, issues);

  if (campaignId && !campaignExists) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_TASK_CAMPAIGN_NOT_FOUND",
      "campaignId",
      `Campaign DB draft '${sanitizeCampaignDbDiagnosticValue("campaignId", campaignId)}' was not found.`,
    ));
  }

  if (typeof input.required !== "boolean") {
    issues.push(diagnostic(
      "CAMPAIGN_DB_TASK_REQUIRED_FIELD_MISSING",
      "required",
      "Campaign DB task draft required flag must be boolean.",
    ));
  }

  if (issues.length > 0) {
    throw new CampaignDbRepositoryError("Invalid Campaign DB task draft input.", issues);
  }

  return {
    campaignId,
    evidenceRule,
    points,
    required: input.required,
    templateCode,
    verificationType,
    walletCompatibility,
  };
};

const evidenceSourceForVerificationType = (
  verificationType: VerificationType,
): CampaignDbTaskCompletionEvidenceSource => {
  switch (verificationType) {
    case "ON_CHAIN":
      return "AELFSCAN";
    case "DAPP_API":
      return "DAPP_API";
    case "SOCIAL":
      return "SOCIAL_API";
    case "MANUAL":
      return "MANUAL";
    case "WALLET":
    default:
      return "MANUAL";
  }
};

const requireCompletionString = (
  input: CampaignDbUpsertTaskCompletionInput | CampaignDbEligibilityInput,
  field: "campaignId" | "taskId" | "walletAddress",
  issues: CampaignDbDiagnostic[],
) => {
  const value = field === "taskId"
    ? ("taskId" in input ? input.taskId : undefined)
    : input[field];

  if (!isNonEmptyString(value)) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_COMPLETION_REQUIRED_FIELD_MISSING",
      field,
      `Campaign DB task completion field '${field}' is required.`,
    ));

    return "";
  }

  return value.trim();
};

const normalizeCompletionAccountType = (
  accountType: string | undefined,
  issues: CampaignDbDiagnostic[],
  allowDefault = false,
): AccountType => {
  const candidate = accountType ?? (allowDefault ? "UNKNOWN" : undefined);

  if (!candidate || !isAccountType(candidate)) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_COMPLETION_UNSUPPORTED_ACCOUNT_TYPE",
      "accountType",
      "Campaign DB task completion accountType is unsupported.",
    ));

    return "UNKNOWN";
  }

  return candidate;
};

const normalizeCompletionWalletSource = (
  walletSource: string | undefined,
  issues: CampaignDbDiagnostic[],
  allowDefault = false,
): WalletSource => {
  const candidate = walletSource ?? (allowDefault ? "OTHER" : undefined);

  if (!candidate || !isWalletSource(candidate)) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_COMPLETION_UNSUPPORTED_WALLET_SOURCE",
      "walletSource",
      "Campaign DB task completion walletSource is unsupported.",
    ));

    return "OTHER";
  }

  return candidate;
};

const normalizeCompletionStatus = (
  status: string | undefined,
  issues: CampaignDbDiagnostic[],
): CampaignDbTaskCompletionStatus => {
  const candidate = status ?? "completed";

  if (!isCompletionStatus(candidate)) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_COMPLETION_UNSUPPORTED_STATUS",
      "status",
      "Campaign DB task completion status is unsupported.",
    ));

    return "failed";
  }

  return candidate;
};

const normalizeCompletionEvidenceSource = (
  evidenceSource: string | undefined,
  fallback: VerificationType,
  issues: CampaignDbDiagnostic[],
): CampaignDbTaskCompletionEvidenceSource => {
  const candidate = evidenceSource ?? evidenceSourceForVerificationType(fallback);

  if (!isCompletionEvidenceSource(candidate)) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_COMPLETION_UNSUPPORTED_EVIDENCE_SOURCE",
      "evidenceSource",
      "Campaign DB task completion evidenceSource is unsupported.",
    ));

    return "MANUAL";
  }

  return candidate;
};

const normalizeEvidenceHash = (
  evidenceHash: string | undefined,
  issues: CampaignDbDiagnostic[],
) => {
  if (evidenceHash === undefined) {
    return undefined;
  }

  const trimmed = evidenceHash.trim();

  if (!trimmed || hasSecretLikeValue(trimmed)) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_COMPLETION_INVALID_EVIDENCE_HASH",
      "evidenceHash",
      "Campaign DB task completion evidenceHash must be a safe reference, not raw evidence or a secret-like value.",
    ));

    return undefined;
  }

  return trimmed;
};

const validateUpsertTaskCompletionInput = (
  input: CampaignDbUpsertTaskCompletionInput,
  campaign: CampaignDbDraft | undefined,
  task: CampaignDbTaskDraft | undefined,
): Omit<CampaignDbTaskCompletion, "createdAt" | "id" | "updatedAt"> => {
  const issues: CampaignDbDiagnostic[] = [];
  const campaignId = requireCompletionString(input, "campaignId", issues);
  const taskId = requireCompletionString(input, "taskId", issues);
  const walletAddress = requireCompletionString(input, "walletAddress", issues);
  const accountType = normalizeCompletionAccountType(input.accountType, issues);
  const walletSource = normalizeCompletionWalletSource(input.walletSource, issues);
  const status = normalizeCompletionStatus(input.status, issues);
  const evidenceSource = normalizeCompletionEvidenceSource(input.evidenceSource, task?.verificationType ?? "MANUAL", issues);
  const evidenceHash = normalizeEvidenceHash(input.evidenceHash, issues);

  if (campaignId && !campaign) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_COMPLETION_CAMPAIGN_NOT_FOUND",
      "campaignId",
      `Campaign DB draft '${sanitizeCampaignDbDiagnosticValue("campaignId", campaignId)}' was not found.`,
    ));
  }

  if (campaign && taskId && (!task || task.campaignId !== campaignId)) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_COMPLETION_TASK_NOT_FOUND",
      "taskId",
      `Campaign DB task draft '${sanitizeCampaignDbDiagnosticValue("taskId", taskId)}' was not found for the campaign.`,
    ));
  }

  if (issues.length > 0) {
    throw new CampaignDbRepositoryError("Invalid Campaign DB task completion input.", issues);
  }

  const pointsAwarded = status === "completed" ? task?.points ?? 0 : 0;

  return {
    accountType,
    campaignId,
    ...(evidenceHash ? { evidenceHash } : {}),
    evidenceSource,
    pointsAwarded,
    status,
    taskId,
    walletAddress,
    walletSource,
  };
};

const participantKey = (campaignId: string, walletAddress: string) => `${campaignId}::${walletAddress}`;
const referralBindingKey = (campaignId: string, inviteeWalletAddress: string) =>
  `${campaignId}::${inviteeWalletAddress}`;

const requireParticipantString = (
  input: CampaignDbUpsertParticipantInput,
  field: "campaignId" | "walletAddress",
  issues: CampaignDbDiagnostic[],
) => {
  const value = input[field];

  if (!isNonEmptyString(value)) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_PARTICIPANT_REQUIRED_FIELD_MISSING",
      field,
      `Campaign DB participant field '${field}' is required.`,
    ));

    return "";
  }

  return value.trim();
};

const normalizeParticipantAccountType = (
  accountType: string,
  issues: CampaignDbDiagnostic[],
): AccountType => {
  if (!isAccountType(accountType)) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_PARTICIPANT_UNSUPPORTED_ACCOUNT_TYPE",
      "accountType",
      "Campaign DB participant accountType is unsupported.",
    ));

    return "UNKNOWN";
  }

  return accountType;
};

const normalizeParticipantWalletSource = (
  walletSource: string,
  issues: CampaignDbDiagnostic[],
): WalletSource => {
  if (!isWalletSource(walletSource)) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_PARTICIPANT_UNSUPPORTED_WALLET_SOURCE",
      "walletSource",
      "Campaign DB participant walletSource is unsupported.",
    ));

    return "OTHER";
  }

  return walletSource;
};

const normalizeParticipantLocale = (
  localePreference: string | undefined,
  campaign: CampaignDbDraft | undefined,
  issues: CampaignDbDiagnostic[],
): SupportedLocale => {
  const candidate = localePreference ?? campaign?.defaultLocale ?? "en-US";

  if (!isSupportedLocale(candidate)) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_PARTICIPANT_UNSUPPORTED_LOCALE",
      "localePreference",
      "Campaign DB participant localePreference must be supported by the campaign.",
    ));

    return campaign?.defaultLocale ?? "en-US";
  }

  return candidate;
};

const normalizeParticipantSignatureStatus = (
  walletSignatureStatus: string | undefined,
  issues: CampaignDbDiagnostic[],
): WalletSignatureStatus => {
  const candidate = walletSignatureStatus ?? "missing";

  if (!isWalletSignatureStatus(candidate)) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_PARTICIPANT_UNSUPPORTED_SIGNATURE_STATUS",
      "walletSignatureStatus",
      "Campaign DB participant walletSignatureStatus is unsupported.",
    ));

    return "missing";
  }

  return candidate;
};

const normalizeParticipantRiskFlags = (
  riskFlags: readonly string[] | undefined,
  issues: CampaignDbDiagnostic[],
) => {
  const flags = riskFlags ?? [];
  const invalid = !Array.isArray(flags) ||
    flags.some((flag) => !isNonEmptyString(flag) || hasSecretLikeValue(flag));

  if (invalid) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_PARTICIPANT_INVALID_RISK_FLAGS",
      "riskFlags",
      "Campaign DB participant riskFlags must be safe non-empty string references.",
    ));

    return [];
  }

  return Array.from(new Set(flags.map((flag) => flag.trim()))).sort();
};

const normalizeParticipantWalletVerifiedAt = (
  walletVerifiedAt: string | undefined,
  issues: CampaignDbDiagnostic[],
) => {
  if (walletVerifiedAt === undefined) {
    return undefined;
  }

  const trimmed = walletVerifiedAt.trim();

  if (!trimmed || hasSecretLikeValue(trimmed)) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_PARTICIPANT_INVALID_WALLET_VERIFIED_AT",
      "walletVerifiedAt",
      "Campaign DB participant walletVerifiedAt must be a safe timestamp reference.",
    ));

    return undefined;
  }

  return trimmed;
};

const normalizeParticipantTotalPoints = (
  totalPoints: number | undefined,
  issues: CampaignDbDiagnostic[],
) => {
  const points = totalPoints ?? 0;

  if (!Number.isFinite(points) || !Number.isInteger(points) || points < 0) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_PARTICIPANT_INVALID_POINTS",
      "totalPoints",
      "Campaign DB participant totalPoints must be a non-negative integer.",
    ));

    return 0;
  }

  return points;
};

const normalizeParticipantRank = (
  rank: number | undefined,
  issues: CampaignDbDiagnostic[],
) => {
  if (rank === undefined) {
    return undefined;
  }

  if (!Number.isFinite(rank) || !Number.isInteger(rank) || rank <= 0) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_PARTICIPANT_INVALID_RANK",
      "rank",
      "Campaign DB participant rank must be a positive integer when present.",
    ));

    return undefined;
  }

  return rank;
};

const validateUpsertParticipantInput = (
  input: CampaignDbUpsertParticipantInput,
  campaign: CampaignDbDraft | undefined,
): Omit<CampaignDbParticipantRecord, "createdAt" | "id" | "updatedAt"> => {
  const issues: CampaignDbDiagnostic[] = [];
  const campaignId = requireParticipantString(input, "campaignId", issues);
  const walletAddress = requireParticipantString(input, "walletAddress", issues);
  const accountType = normalizeParticipantAccountType(input.accountType, issues);
  const walletSource = normalizeParticipantWalletSource(input.walletSource, issues);
  const localePreference = normalizeParticipantLocale(input.localePreference, campaign, issues);
  const walletSignatureStatus = normalizeParticipantSignatureStatus(input.walletSignatureStatus, issues);
  const walletVerifiedAt = normalizeParticipantWalletVerifiedAt(input.walletVerifiedAt, issues);
  const riskFlags = normalizeParticipantRiskFlags(input.riskFlags, issues);
  const totalPoints = normalizeParticipantTotalPoints(input.totalPoints, issues);
  const rank = normalizeParticipantRank(input.rank, issues);

  if (campaignId && !campaign) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_PARTICIPANT_CAMPAIGN_NOT_FOUND",
      "campaignId",
      `Campaign DB draft '${sanitizeCampaignDbDiagnosticValue("campaignId", campaignId)}' was not found.`,
    ));
  }

  if (issues.length > 0) {
    throw new CampaignDbRepositoryError("Invalid Campaign DB participant input.", issues);
  }

  return {
    accountType,
    campaignId,
    localePreference,
    ...(rank ? { rank } : {}),
    riskFlags,
    totalPoints,
    walletAddress,
    walletSignatureStatus,
    walletSource,
    walletTypeVerified: input.walletTypeVerified === true,
    ...(walletVerifiedAt ? { walletVerifiedAt } : {}),
  };
};

const requireReferralString = (
  input: CampaignDbBindReferralInput | CampaignDbMarkReferralQualifiedInput,
  field: "campaignId" | "inviteeWalletAddress" | "referrerWalletAddress",
  issues: CampaignDbDiagnostic[],
) => {
  const value = field === "referrerWalletAddress"
    ? ("referrerWalletAddress" in input ? input.referrerWalletAddress : undefined)
    : input[field];

  if (!isNonEmptyString(value)) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_REFERRAL_REQUIRED_FIELD_MISSING",
      field,
      `Campaign DB referral field '${field}' is required.`,
    ));

    return "";
  }

  return value.trim();
};

const normalizeReferralAccountType = (
  accountType: string,
  field: "inviteeAccountType" | "referrerAccountType",
  issues: CampaignDbDiagnostic[],
): AccountType => {
  if (!isAccountType(accountType)) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_REFERRAL_UNSUPPORTED_ACCOUNT_TYPE",
      field,
      "Campaign DB referral account type is unsupported.",
    ));

    return "UNKNOWN";
  }

  return accountType;
};

const normalizeReferralWalletSource = (
  walletSource: string,
  field: "inviteeWalletSource" | "referrerWalletSource",
  issues: CampaignDbDiagnostic[],
): WalletSource => {
  if (!isWalletSource(walletSource)) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_REFERRAL_UNSUPPORTED_WALLET_SOURCE",
      field,
      "Campaign DB referral wallet source is unsupported.",
    ));

    return "OTHER";
  }

  return walletSource;
};

const normalizeReferralRiskFlags = (
  riskFlags: readonly string[] | undefined,
  issues: CampaignDbDiagnostic[],
) => {
  const flags = riskFlags ?? [];
  const invalid = !Array.isArray(flags) ||
    flags.some((flag) => !isNonEmptyString(flag) || hasSecretLikeValue(flag));

  if (invalid) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_REFERRAL_INVALID_RISK_FLAGS",
      "riskFlags",
      "Campaign DB referral riskFlags must be safe non-empty string references.",
    ));

    return [];
  }

  return Array.from(new Set(flags.map((flag) => flag.trim()))).sort();
};

const normalizeReferralEvidenceHash = (
  evidenceHash: string | undefined,
  issues: CampaignDbDiagnostic[],
) => {
  if (!isNonEmptyString(evidenceHash)) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_REFERRAL_INVALID_EVIDENCE_HASH",
      "qualifiedActionEvidenceHash",
      "Campaign DB referral qualification requires a safe evidence reference.",
    ));

    return "";
  }

  const trimmed = evidenceHash.trim();

  if (hasSecretLikeValue(trimmed)) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_REFERRAL_INVALID_EVIDENCE_HASH",
      "qualifiedActionEvidenceHash",
      "Campaign DB referral qualification evidence must be a safe reference, not raw evidence or a secret-like value.",
    ));

    return "";
  }

  return trimmed;
};

const mergeSafeFlags = (...sets: readonly string[][]) =>
  Array.from(new Set(sets.flat().map((flag) => flag.trim()).filter(Boolean))).sort();

const referralStatusForRiskFlags = (
  qualified: boolean,
  riskFlags: readonly string[],
): CampaignDbReferralBindingStatus => qualified ? "qualified" : riskFlags.length > 0 ? "risk_review" : "pending";

const validateBindReferralInput = (
  input: CampaignDbBindReferralInput,
  campaign: CampaignDbDraft | undefined,
  existing: CampaignDbReferralBindingRecord | undefined,
): Omit<CampaignDbReferralBindingRecord, "createdAt" | "id" | "qualifiedActionCompleted" | "updatedAt"> => {
  const issues: CampaignDbDiagnostic[] = [];
  const campaignId = requireReferralString(input, "campaignId", issues);
  const inviteeWalletAddress = requireReferralString(input, "inviteeWalletAddress", issues);
  const referrerWalletAddress = requireReferralString(input, "referrerWalletAddress", issues);
  const inviteeAccountType = normalizeReferralAccountType(input.inviteeAccountType, "inviteeAccountType", issues);
  const referrerAccountType = normalizeReferralAccountType(input.referrerAccountType, "referrerAccountType", issues);
  const inviteeWalletSource = normalizeReferralWalletSource(input.inviteeWalletSource, "inviteeWalletSource", issues);
  const referrerWalletSource = normalizeReferralWalletSource(input.referrerWalletSource, "referrerWalletSource", issues);
  const riskFlags = normalizeReferralRiskFlags(input.riskFlags, issues);

  if (campaignId && !campaign) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_REFERRAL_CAMPAIGN_NOT_FOUND",
      "campaignId",
      `Campaign DB draft '${sanitizeCampaignDbDiagnosticValue("campaignId", campaignId)}' was not found.`,
    ));
  }

  if (inviteeWalletAddress && referrerWalletAddress && inviteeWalletAddress === referrerWalletAddress) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_REFERRAL_SELF_REFERRAL_BLOCKED",
      "inviteeWalletAddress",
      "Campaign DB referral binding rejects self-referral.",
    ));
  }

  if (existing) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_REFERRAL_DUPLICATE_BINDING",
      "inviteeWalletAddress",
      "Campaign DB referral binding already exists for this campaign and invitee.",
    ));
  }

  if (issues.length > 0) {
    throw new CampaignDbRepositoryError("Invalid Campaign DB referral binding input.", issues);
  }

  return {
    campaignId,
    inviteeAccountType,
    inviteeWalletAddress,
    inviteeWalletSource,
    referrerAccountType,
    referrerWalletAddress,
    referrerWalletSource,
    riskFlags,
    status: referralStatusForRiskFlags(false, riskFlags),
  };
};

const validateMarkReferralQualifiedInput = (
  input: CampaignDbMarkReferralQualifiedInput,
  campaign: CampaignDbDraft | undefined,
  existing: CampaignDbReferralBindingRecord | undefined,
): {
  campaignId: string;
  evidenceHash: string;
  inviteeWalletAddress: string;
  riskFlags: string[];
} => {
  const issues: CampaignDbDiagnostic[] = [];
  const campaignId = requireReferralString(input, "campaignId", issues);
  const inviteeWalletAddress = requireReferralString(input, "inviteeWalletAddress", issues);
  const evidenceHash = normalizeReferralEvidenceHash(input.qualifiedActionEvidenceHash, issues);
  const riskFlags = normalizeReferralRiskFlags(input.riskFlags, issues);

  if (campaignId && !campaign) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_REFERRAL_CAMPAIGN_NOT_FOUND",
      "campaignId",
      `Campaign DB draft '${sanitizeCampaignDbDiagnosticValue("campaignId", campaignId)}' was not found.`,
    ));
  }

  if (campaign && !existing) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_REFERRAL_BINDING_NOT_FOUND",
      "inviteeWalletAddress",
      "Campaign DB referral binding was not found for this campaign and invitee.",
    ));
  }

  if (issues.length > 0) {
    throw new CampaignDbRepositoryError("Invalid Campaign DB referral qualification input.", issues);
  }

  return {
    campaignId,
    evidenceHash,
    inviteeWalletAddress,
    riskFlags,
  };
};

const localized = (enUS: string, zhCN = enUS, zhTW = enUS): LocalizedText => ({
  "en-US": enUS,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
});

const exportProjectionBoundary = localized(
  "Campaign DB repository export projection is local-review only. No export file, storage write, signed URL, contract root, contract transaction, reward custody, or reward distribution is executed.",
  "Campaign DB repository 导出投影仅用于本地审核。不会生成导出文件、写入存储、生成 signed URL、写入合约 root、执行合约交易、托管奖励或发奖。",
);

const exportProjectionNextAction = localized(
  "Review local rows and keep production export storage, contract roots, and reward fulfillment in later approval missions.",
  "审核本地行数据；生产导出存储、合约 root 与奖励履约留给后续审批任务。",
);

const exportPreviewModeBoundary = localized(
  "Preview mode renders local review payloads only and does not generate files or downloads.",
  "预览模式仅生成本地审核 payload，不生成文件或下载链接。",
);

const exportContractRootBoundary = localized(
  "Contract root generation is disabled in the repository export projection.",
  "Repository 导出投影禁用合约 root 生成。",
);

const requireExportString = (
  input: CampaignDbExportProjectionInput,
  field: "campaignId",
  issues: CampaignDbDiagnostic[],
) => {
  const value = input[field];

  if (!isNonEmptyString(value)) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_EXPORT_REQUIRED_FIELD_MISSING",
      field,
      `Campaign DB export field '${field}' is required.`,
    ));

    return "";
  }

  return value.trim();
};

const validateExportProjectionInput = (
  input: CampaignDbExportProjectionInput,
  campaignExists: boolean,
): CampaignDbExportProjectionRequest => {
  const issues: CampaignDbDiagnostic[] = [];
  const campaignId = requireExportString(input, "campaignId", issues);
  const format = input.format ?? "csv";
  const contractRootMode = input.contractRootMode ?? "none";

  if (format && !isExportFormat(format)) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_EXPORT_UNSUPPORTED_FORMAT",
      "format",
      "Campaign DB export projection supports only csv or json local preview modes.",
    ));
  }

  if (contractRootMode && !isExportContractRootMode(contractRootMode)) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_EXPORT_UNSUPPORTED_CONTRACT_ROOT_MODE",
      "contractRootMode",
      "Campaign DB export projection contractRootMode is unsupported.",
    ));
  } else if (contractRootMode !== "none") {
    issues.push(diagnostic(
      "CAMPAIGN_DB_EXPORT_UNSUPPORTED_CONTRACT_ROOT_MODE",
      "contractRootMode",
      "Campaign DB export projection keeps contractRootMode limited to none.",
    ));
  }

  if (campaignId && !campaignExists) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_EXPORT_CAMPAIGN_NOT_FOUND",
      "campaignId",
      `Campaign DB draft '${sanitizeCampaignDbDiagnosticValue("campaignId", campaignId)}' was not found for export projection.`,
    ));
  }

  if (input.includeWalletType === false) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_EXPORT_REQUIRED_COLUMN_DISABLED",
      "includeWalletType",
      "Campaign DB export projection requires wallet type and wallet source columns.",
    ));
  }

  if (input.includeLocalePreference === false) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_EXPORT_REQUIRED_COLUMN_DISABLED",
      "includeLocalePreference",
      "Campaign DB export projection requires locale preference column.",
    ));
  }

  if (input.includeRiskFlags === false) {
    issues.push(diagnostic(
      "CAMPAIGN_DB_EXPORT_REQUIRED_COLUMN_DISABLED",
      "includeRiskFlags",
      "Campaign DB export projection requires risk flag columns.",
    ));
  }

  if (issues.length > 0) {
    throw new CampaignDbRepositoryError("Invalid Campaign DB export projection input.", issues);
  }

  return {
    campaignId,
    contractRootMode: "none",
    format: format as ExportPreviewMode,
    includeLocalePreference: true,
    includeRiskFlags: true,
    includeWalletType: true,
  };
};

const latestCompletion = (
  left: CampaignDbTaskCompletion | undefined,
  right: CampaignDbTaskCompletion,
) => {
  if (!left) {
    return right;
  }

  const updatedComparison = left.updatedAt.localeCompare(right.updatedAt);

  return updatedComparison < 0 || (updatedComparison === 0 && left.id.localeCompare(right.id) < 0)
    ? right
    : left;
};

const latestTimestampForRow = (row: CampaignDbExportRow) =>
  [...row.taskRecords
    .map((record) => record.completedAt ?? record.updatedAt ?? "")
    .filter(Boolean)
    .sort()]
    .pop() ?? "";

const exportBatchIdFor = (campaignId: string) => `campaign-db-export-${campaignId}`;

const exportTaskRecordToken = (record: CampaignDbExportTaskRecord) =>
  [
    record.taskId,
    record.templateCode,
    record.status,
    record.pointsAwarded,
    record.evidenceHash ?? "no-evidence",
  ].join(":");

const createMissingTaskRecord = (task: CampaignDbTaskDraft): CampaignDbExportTaskRecord => ({
  pointsAwarded: 0,
  pointsAvailable: task.points,
  required: task.required,
  status: "missing",
  taskId: task.id,
  templateCode: task.templateCode,
  verificationType: task.verificationType,
});

const createCompletedTaskRecord = (
  task: CampaignDbTaskDraft,
  completion: CampaignDbTaskCompletion,
): CampaignDbExportTaskRecord => ({
  ...(completion.completedAt ? { completedAt: completion.completedAt } : {}),
  ...(completion.evidenceHash ? { evidenceHash: completion.evidenceHash } : {}),
  evidenceSource: completion.evidenceSource,
  pointsAwarded: completion.status === "completed" ? completion.pointsAwarded : 0,
  pointsAvailable: task.points,
  required: task.required,
  status: completion.status,
  taskId: task.id,
  templateCode: task.templateCode,
  updatedAt: completion.updatedAt,
  verificationType: task.verificationType,
});

const rowStatusPriority = (status: ExportRowStatus) =>
  status === "ready" ? 0 : status === "review_required" ? 1 : 2;

const sortExportRows = (rows: CampaignDbExportRow[]) =>
  [...rows].sort((left, right) => {
    const statusComparison = rowStatusPriority(left.rowStatus) - rowStatusPriority(right.rowStatus);

    if (statusComparison !== 0) {
      return statusComparison;
    }

    const pointsComparison = right.totalPoints - left.totalPoints;

    if (pointsComparison !== 0) {
      return pointsComparison;
    }

    const leftTimestamp = latestTimestampForRow(left);
    const rightTimestamp = latestTimestampForRow(right);
    const timestampComparison = leftTimestamp.localeCompare(rightTimestamp);

    if (timestampComparison !== 0) {
      return timestampComparison;
    }

    return left.walletAddress.localeCompare(right.walletAddress);
  });

const assignExportRanks = (rows: CampaignDbExportRow[]) => {
  let rank = 0;

  return rows.map((row) => {
    if (row.rowStatus === "blocked") {
      const { rank: _rank, ...unrankedRow } = row;

      return unrankedRow;
    }

    rank += 1;

    return {
      ...row,
      rank,
    };
  });
};

const createExportRows = (
  campaign: CampaignDbDraft,
  tasks: CampaignDbTaskDraft[],
  completions: CampaignDbTaskCompletion[],
  participants: CampaignDbParticipantRecord[],
  referralBindings: CampaignDbReferralBindingRecord[],
  exportBatchId: string,
): CampaignDbExportRow[] => {
  const tasksById = new Map(tasks.map((task) => [task.id, task]));
  const completionsByWallet = new Map<string, Map<string, CampaignDbTaskCompletion>>();
  const participantsByWallet = new Map(participants.map((participant) => [participant.walletAddress, participant]));
  const referralBindingsByInvitee = new Map(
    referralBindings.map((binding) => [binding.inviteeWalletAddress, binding]),
  );

  for (const completion of completions) {
    if (!tasksById.has(completion.taskId)) {
      continue;
    }

    const walletCompletions = completionsByWallet.get(completion.walletAddress) ?? new Map<string, CampaignDbTaskCompletion>();
    walletCompletions.set(completion.taskId, latestCompletion(walletCompletions.get(completion.taskId), completion));
    completionsByWallet.set(completion.walletAddress, walletCompletions);
  }

  const walletAddresses = Array.from(new Set([
    ...participants.map((participant) => participant.walletAddress),
    ...completionsByWallet.keys(),
  ])).sort();
  const rows = walletAddresses.map((walletAddress) => {
    const walletCompletions = completionsByWallet.get(walletAddress) ?? new Map<string, CampaignDbTaskCompletion>();
    const participant = participantsByWallet.get(walletAddress);
    const referralBinding = referralBindingsByInvitee.get(walletAddress);
    const completionValues = Array.from(walletCompletions.values())
      .sort((left, right) => left.taskId.localeCompare(right.taskId));
    const firstCompletion = completionValues[0];
    const taskRecords = tasks
      .map((task) => {
        const completion = walletCompletions.get(task.id);

        return completion ? createCompletedTaskRecord(task, completion) : createMissingTaskRecord(task);
      })
      .sort((left, right) => left.taskId.localeCompare(right.taskId));
    const completedTaskIds = new Set(
      taskRecords
        .filter((record) => record.status === "completed")
        .map((record) => record.taskId),
    );
    const reviewRequiredTaskIds = new Set(
      taskRecords
        .filter((record) => record.status === "pending" || record.status === "manual_review")
        .map((record) => record.taskId),
    );
    const failedTaskIds = new Set(
      taskRecords
        .filter((record) => record.status === "failed")
        .map((record) => record.taskId),
    );
    const missingTasks = tasks
      .filter((task) => task.required && (!completedTaskIds.has(task.id) || failedTaskIds.has(task.id)))
      .map((task) => task.templateCode || task.id);
    const hasReviewRequiredTask = tasks
      .some((task) => task.required && !completedTaskIds.has(task.id) && reviewRequiredTaskIds.has(task.id));
    const riskFlags = mergeSafeFlags(participant?.riskFlags ?? [], referralBinding?.riskFlags ?? []);
    const rowStatus: ExportRowStatus =
      riskFlags.length > 0
        ? "review_required"
        : missingTasks.length === 0
          ? "ready"
          : hasReviewRequiredTask
            ? "review_required"
            : "blocked";
    const totalPoints = taskRecords
      .filter((record) => record.status === "completed")
      .reduce((total, record) => total + record.pointsAwarded, 0);
    const evidenceHashes = taskRecords
      .map((record) => record.evidenceHash)
      .filter((value): value is string => Boolean(value))
      .sort();

    return {
      accountType: participant?.accountType ?? firstCompletion?.accountType ?? "UNKNOWN",
      campaignId: campaign.id,
      eligible: rowStatus === "ready",
      evidenceHashes,
      exportBatchId,
      localePreference: participant?.localePreference ?? campaign.defaultLocale,
      missingColumnValues: [],
      missingTasks,
      referrerAddress: referralBinding?.referrerWalletAddress ?? "",
      riskFlags,
      rowStatus,
      taskRecords,
      totalPoints,
      walletAddress,
      walletSource: participant?.walletSource ?? firstCompletion?.walletSource ?? "OTHER",
      walletTypeVerified: participant?.walletTypeVerified ??
        (firstCompletion?.accountType !== undefined && firstCompletion?.walletSource !== undefined),
    };
  });

  return assignExportRanks(sortExportRows(rows));
};

const exportRowValueByColumn = (
  row: CampaignDbExportRow,
  column: ExportCsvColumn,
): string | number | boolean | string[] => {
  switch (column) {
    case "campaign_id":
      return row.campaignId;
    case "wallet_address":
      return row.walletAddress;
    case "account_type":
      return row.accountType;
    case "wallet_source":
      return row.walletSource;
    case "locale_preference":
      return row.localePreference;
    case "total_points":
      return row.totalPoints;
    case "rank":
      return row.rank ?? "";
    case "eligible":
      return row.eligible;
    case "missing_tasks":
      return row.missingTasks;
    case "risk_flags":
      return row.riskFlags;
    case "referrer_address":
      return row.referrerAddress;
    case "task_records":
      return row.taskRecords.map(exportTaskRecordToken);
    case "evidence_hashes":
      return row.evidenceHashes;
    case "export_batch_id":
      return row.exportBatchId;
  }
};

const serializeExportScalar = (value: string | number | boolean | string[]) =>
  Array.isArray(value) ? value.join("|") : String(value);

const escapeCsvValue = (value: string | number | boolean | string[]) => {
  const serialized = serializeExportScalar(value);

  return /[",\n\r]/.test(serialized) ? `"${serialized.replace(/"/g, "\"\"")}"` : serialized;
};

const projectExportRowForArtifact = (row: CampaignDbExportRow) =>
  Object.fromEntries(
    EXPORT_CSV_COLUMNS.map((column) => [column, exportRowValueByColumn(row, column)]),
  ) as Record<ExportCsvColumn, string | number | boolean | string[]>;

const serializeExportRowsToCsv = (rows: CampaignDbExportRow[]) =>
  [
    EXPORT_CSV_COLUMNS.join(","),
    ...rows.map((row) =>
      EXPORT_CSV_COLUMNS.map((column) => escapeCsvValue(exportRowValueByColumn(row, column))).join(",")
    ),
  ].join("\n");

const createLocalReviewChecksum = (payload: string): string => {
  let hash = 0x811c9dc5;

  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return `local-${(hash >>> 0).toString(16).padStart(8, "0")}`;
};

const exportArtifactMimeTypes: Record<ExportPreviewMode, string> = {
  csv: "text/csv;charset=utf-8",
  json: "application/json;charset=utf-8",
};

const createExportArtifact = (
  campaignId: string,
  exportBatchId: string,
  rows: CampaignDbExportRow[],
  format: ExportPreviewMode,
  createdAt: string,
): CampaignDbExportArtifact => {
  const jsonRows = rows.map(projectExportRowForArtifact);
  const payload = format === "csv"
    ? serializeExportRowsToCsv(rows)
    : JSON.stringify({
      campaignId,
      columns: EXPORT_CSV_COLUMNS,
      rows: jsonRows,
    }, null, 2);

  return {
    artifactId: `${campaignId}-${exportBatchId}-${format}-local-preview`,
    campaignId,
    checksum: createLocalReviewChecksum(payload),
    checksumAlgorithm: "fnv1a32-local-review",
    columns: EXPORT_CSV_COLUMNS,
    createdAt,
    format,
    generatedMode: "local_review_only",
    localPreviewMode: true,
    mimeType: exportArtifactMimeTypes[format],
    payloadBytes: new TextEncoder().encode(payload).length,
    ...(format === "csv" ? { csvPreview: payload } : { jsonPreview: jsonRows }),
    safety: {
      localOnly: true,
      noContractRoot: true,
      noContractTransaction: true,
      noDownloadUrl: true,
      noRewardCustody: true,
      noRewardDistribution: true,
      noStorageWrite: true,
      verifiedRecordsOnly: true,
    },
  };
};

const createPreviewModeReadiness = (
  mode: ExportPreviewMode,
): CampaignDbExportPreviewModeReadiness => ({
  boundary: exportPreviewModeBoundary,
  downloadAvailable: false,
  generatesFile: false,
  includedFields: EXPORT_CSV_COLUMNS,
  label: localized(`${mode.toUpperCase()} local preview`),
  mode,
  nextAction: localized("Use this mode for local review only before production export storage exists."),
  readiness: "ready",
});

const createExportFieldCoverage = (): CampaignDbExportFieldCoverage => ({
  coverageReady: true,
  missingFields: [],
  presentFields: EXPORT_CSV_COLUMNS,
  requiredFields: EXPORT_CSV_COLUMNS,
});

const rowStatusReasonCode = (status: ExportRowStatus): ExportRowReasonCode => {
  switch (status) {
    case "ready":
      return "eligible_verified";
    case "review_required":
      return "risk_review_required";
    case "blocked":
    default:
      return "missing_required_tasks";
  }
};

const rowStatusLabel = (status: ExportRowStatus): LocalizedText => {
  switch (status) {
    case "ready":
      return localized("Ready rows", "就绪行");
    case "review_required":
      return localized("Review-required rows", "需审核行");
    case "blocked":
    default:
      return localized("Blocked rows", "阻断行");
  }
};

const createRowStatusCoverage = (
  rows: readonly CampaignDbExportRow[],
): CampaignDbExportRowStatusReason[] =>
  (["ready", "review_required", "blocked"] as const).map((status) => ({
    affectedRows: rows.filter((row) => row.rowStatus === status).length,
    label: rowStatusLabel(status),
    nextAction: status === "ready"
      ? localized("Keep rows available for local export review.")
      : status === "review_required"
        ? localized("Resolve pending or manual-review required tasks before approval.")
        : localized("Complete missing required tasks before export approval."),
    reasonCode: rowStatusReasonCode(status),
    rowStatus: status,
  }));

const createExportAcknowledgements = (): CampaignDbExportAcknowledgement[] => [
  {
    acknowledged: false,
    description: localized("Only local completion records are included in this preview."),
    id: "verified-records-only",
    label: localized("Verified records only"),
    ownerRole: "internal_operator",
    required: true,
  },
  {
    acknowledged: false,
    description: localized("The campaign project owns any future reward fulfillment."),
    id: "project-owned-reward-distribution",
    label: localized("Project-owned reward distribution"),
    ownerRole: "project_owner",
    required: true,
  },
  {
    acknowledged: false,
    description: localized("Campaign OS does not custody rewards in this local projection."),
    id: "no-reward-custody",
    label: localized("No reward custody"),
    ownerRole: "project_owner",
    required: true,
  },
  {
    acknowledged: false,
    description: localized("Campaign OS does not distribute rewards in this local projection."),
    id: "no-reward-distribution",
    label: localized("No reward distribution"),
    ownerRole: "project_owner",
    required: true,
  },
  {
    acknowledged: false,
    description: localized("The preview does not create a real export file or download."),
    id: "no-real-export-file",
    label: localized("No real export file"),
    ownerRole: "internal_operator",
    required: true,
  },
];

const createContractRootReadiness = (
  mode: ExportContractRootMode,
): CampaignDbExportContractRootReadiness => ({
  approvalRequired: mode !== "none",
  boundary: exportContractRootBoundary,
  label: localized(mode === "none" ? "No contract root" : `${mode} disabled`),
  mode,
  nextAction: mode === "none"
    ? localized("Keep no-root mode for local export review.")
    : localized("Plan a later contract-root approval mission before enabling this mode."),
  readiness: mode === "none" ? "ready" : "blocked",
  safeDefault: mode === "none",
});

const createExportReadinessProjection = (
  campaignId: string,
  exportBatchId: string,
  rows: readonly CampaignDbExportRow[],
  repository: CampaignDbExportReadinessProjection["repository"],
): CampaignDbExportReadinessProjection => {
  const acknowledgements = createExportAcknowledgements();

  return {
    acknowledgements,
    batchId: exportBatchId,
    boundary: exportProjectionBoundary,
    campaignId,
    contractRootReadiness: exportContractRootModes.map(createContractRootReadiness),
    fieldCoverage: createExportFieldCoverage(),
    nextAction: exportProjectionNextAction,
    previewModes: exportFormats.map(createPreviewModeReadiness),
    repository,
    rowStatusCoverage: createRowStatusCoverage(rows),
    summary: {
      acknowledgedItems: acknowledgements.filter((item) => item.acknowledged).length,
      blockedRows: rows.filter((row) => row.rowStatus === "blocked").length,
      previewModeCount: exportFormats.length,
      readyRows: rows.filter((row) => row.rowStatus === "ready").length,
      requiredAcknowledgements: acknowledgements.filter((item) => item.required).length,
      reviewRequiredRows: rows.filter((row) => row.rowStatus === "review_required").length,
      totalRows: rows.length,
    },
  };
};

const createProductionDeferredDiagnostic = (
  requestedDriverId: string | undefined,
): CampaignDbDiagnostic => diagnostic(
  "CAMPAIGN_DB_PRODUCTION_DEFERRED",
  "requestedDriverId",
  `Campaign DB production driver '${sanitizeCampaignDbDiagnosticValue(
    "requestedDriverId",
    requestedDriverId,
  ) ?? "not_configured"}' is deferred and cannot fallback to local repositories.`,
);

export const createCampaignDbRepository = ({
  boundedListLimit,
  durableStore,
  durableStoreFilePath,
  mode = "deterministic_test",
  now = defaultNow,
  requestedDriverId,
}: CreateCampaignDbRepositoryOptions = {}): CampaignDbRepository => {
  const recordsById = new Map<string, CampaignDbDraft>();
  const participantRecordsById = new Map<string, CampaignDbParticipantRecord>();
  const referralBindingRecordsById = new Map<string, CampaignDbReferralBindingRecord>();
  const taskCompletionsById = new Map<string, CampaignDbTaskCompletion>();
  const taskRecordsById = new Map<string, CampaignDbTaskDraft>();
  const events: CampaignDbRepositoryEvent[] = [];
  const adapterId =
    mode === "production_deferred"
      ? "campaign-db-production-adapter-deferred"
      : mode === "durable_test"
        ? "campaign-db-durable-test-adapter"
      : "campaign-db-deterministic-adapter";
  const activeDurableStore =
    mode === "durable_test"
      ? durableStore ??
        createCampaignDurableStore({
          boundedListLimit,
          filePath: durableStoreFilePath,
          mode: "durable_test",
        })
      : undefined;
  let idSequence = 0;
  let completionIdSequence = 0;
  let participantIdSequence = 0;
  let referralBindingIdSequence = 0;
  let taskIdSequence = 0;
  let eventSequence = 0;
  let transactionSequence = 0;

  const productionDiagnostics =
    mode === "production_deferred" ? [createProductionDeferredDiagnostic(requestedDriverId)] : [];

  const assertWritable = () => {
    if (mode === "production_deferred") {
      throw new CampaignDbRepositoryError(
        "Campaign DB production repository is deferred.",
        productionDiagnostics,
      );
    }
  };

  const nextCampaignId = () => {
    idSequence += 1;

    return `campaign-db-draft-${idSequence.toString().padStart(4, "0")}`;
  };

  const nextTaskId = () => {
    taskIdSequence += 1;

    return `campaign-db-task-draft-${taskIdSequence.toString().padStart(4, "0")}`;
  };

  const nextCompletionId = () => {
    completionIdSequence += 1;

    return `campaign-db-task-completion-${completionIdSequence.toString().padStart(4, "0")}`;
  };

  const nextParticipantId = () => {
    participantIdSequence += 1;

    return `campaign-db-participant-${participantIdSequence.toString().padStart(4, "0")}`;
  };

  const nextReferralBindingId = () => {
    referralBindingIdSequence += 1;

    return `campaign-db-referral-binding-${referralBindingIdSequence.toString().padStart(4, "0")}`;
  };

  const nextCompletionIdForStore = async () => {
    if (!activeDurableStore) {
      return nextCompletionId();
    }

    const manifest = await activeDurableStore.manifest();

    return `campaign-db-task-completion-${(manifest.completionRecordCount + 1).toString().padStart(4, "0")}`;
  };

  const nextParticipantIdForStore = async () => {
    if (!activeDurableStore) {
      return nextParticipantId();
    }

    const manifest = await activeDurableStore.manifest();

    return `campaign-db-participant-${(manifest.participantRecordCount + 1).toString().padStart(4, "0")}`;
  };

  const nextReferralBindingIdForStore = async () => {
    if (!activeDurableStore) {
      return nextReferralBindingId();
    }

    const manifest = await activeDurableStore.manifest();

    return `campaign-db-referral-binding-${(manifest.referralBindingRecordCount + 1).toString().padStart(4, "0")}`;
  };

  const nextTransactionId = () => {
    transactionSequence += 1;

    return `campaign-db-uow-${transactionSequence.toString().padStart(4, "0")}`;
  };

  const appendEvent = ({
    entity = "Campaign",
    operation,
    traceId,
    transactionId,
    type,
  }: {
    entity?: CampaignDbRepositoryEvent["entity"];
    operation: string;
    traceId?: string;
    transactionId?: string;
    type: CampaignDbRepositoryEventType;
  }) => {
    eventSequence += 1;
    events.push({
      entity,
      id: `campaign-db-event-${eventSequence.toString().padStart(4, "0")}`,
      liveExecution: false,
      operation,
      sequence: eventSequence,
      storeId: "campaign-db",
      ...(traceId ? { traceId } : {}),
      ...(transactionId ? { transactionId } : {}),
      type,
    });
  };

  const listTaskDraftsByCampaignId = async (campaignId: string) =>
    activeDurableStore
      ? await activeDurableStore.listTaskDraftsByCampaignId(campaignId)
      : Array.from(taskRecordsById.values())
        .filter((task) => task.campaignId === campaignId)
        .sort((left, right) => left.id.localeCompare(right.id));

  const listTaskCompletionsByCampaignId = async (campaignId: string) =>
    activeDurableStore
      ? await activeDurableStore.listTaskCompletionsByCampaignId(campaignId)
      : Array.from(taskCompletionsById.values())
        .filter((completion) => completion.campaignId === campaignId)
        .sort((left, right) => {
          const walletComparison = left.walletAddress.localeCompare(right.walletAddress);

          return walletComparison === 0 ? left.taskId.localeCompare(right.taskId) : walletComparison;
        });

  const listParticipantsByCampaignId = async (campaignId: string) =>
    activeDurableStore
      ? await activeDurableStore.listParticipantsByCampaignId(campaignId)
      : Array.from(participantRecordsById.values())
        .filter((participant) => participant.campaignId === campaignId)
        .sort((left, right) => left.walletAddress.localeCompare(right.walletAddress));

  const listReferralBindingsByCampaignId = async (campaignId: string) =>
    activeDurableStore
      ? await activeDurableStore.listReferralBindingsByCampaignId(campaignId)
      : Array.from(referralBindingRecordsById.values())
        .filter((binding) => binding.campaignId === campaignId)
        .sort((left, right) => left.inviteeWalletAddress.localeCompare(right.inviteeWalletAddress));

  const getParticipantRecord = async (campaignId: string, walletAddress: string) =>
    activeDurableStore
      ? await activeDurableStore.getParticipant(campaignId, walletAddress)
      : participantRecordsById.get(participantKey(campaignId, walletAddress));

  const getReferralBindingRecord = async (campaignId: string, inviteeWalletAddress: string) =>
    activeDurableStore
      ? await activeDurableStore.getReferralBinding(campaignId, inviteeWalletAddress)
      : referralBindingRecordsById.get(referralBindingKey(campaignId, inviteeWalletAddress));

  const listTaskCompletionsByWallet = async (campaignId: string, walletAddress: string) =>
    (await listTaskCompletionsByCampaignId(campaignId))
      .filter((completion) => completion.walletAddress === walletAddress);

  const findTaskCompletion = async (campaignId: string, taskId: string, walletAddress: string) =>
    (await listTaskCompletionsByCampaignId(campaignId))
      .find((completion) => completion.taskId === taskId && completion.walletAddress === walletAddress);

  const repositoryMetadata = () => ({
    adapterId,
    createdViaRepository: true as const,
    repositoryId: "campaign-db-repository-runtime",
    storeId: "campaign-db" as const,
  });

  const toProjection = async (draft: CampaignDbDraft): Promise<CampaignDbReadProjection> => ({
    ...draft,
    repository: repositoryMetadata(),
    completions: await listTaskCompletionsByCampaignId(draft.id),
    participants: await listParticipantsByCampaignId(draft.id),
    referralBindings: await listReferralBindingsByCampaignId(draft.id),
    tasks: await listTaskDraftsByCampaignId(draft.id),
  });

  const createExportState = async (
    input: CampaignDbExportProjectionInput,
    context: CampaignDbOperationContext,
  ) => {
    assertWritable();
    appendEvent({
      operation: "lookup_campaign_export_projection",
      traceId: context.traceId,
      type: "query.lookup",
    });

    const campaign = activeDurableStore
      ? await activeDurableStore.getById(input.campaignId)
      : recordsById.get(input.campaignId);
    const normalized = validateExportProjectionInput(input, Boolean(campaign));

    if (!campaign) {
      throw new CampaignDbRepositoryError("Invalid Campaign DB export projection input.", [
        diagnostic(
          "CAMPAIGN_DB_EXPORT_CAMPAIGN_NOT_FOUND",
          "campaignId",
          `Campaign DB draft '${sanitizeCampaignDbDiagnosticValue("campaignId", normalized.campaignId)}' was not found for export projection.`,
        ),
      ]);
    }

    const tasks = await listTaskDraftsByCampaignId(normalized.campaignId);
    const completions = await listTaskCompletionsByCampaignId(normalized.campaignId);
    const participants = await listParticipantsByCampaignId(normalized.campaignId);
    const referralBindings = await listReferralBindingsByCampaignId(normalized.campaignId);
    const exportBatchId = exportBatchIdFor(normalized.campaignId);
    const rows = createExportRows(campaign, tasks, completions, participants, referralBindings, exportBatchId);
    const repository = repositoryMetadata();
    const exportReadiness = createExportReadinessProjection(
      normalized.campaignId,
      exportBatchId,
      rows,
      repository,
    );

    return {
      exportBatchId,
      exportReadiness,
      normalized,
      repository,
      rows,
    };
  };

  const resolveRecordCount = async () =>
    activeDurableStore ? (await activeDurableStore.manifest()).recordCount : recordsById.size;

  const resolveTaskRecordCount = async () =>
    activeDurableStore ? (await activeDurableStore.manifest()).taskRecordCount : taskRecordsById.size;

  const resolveCompletionRecordCount = async () =>
    activeDurableStore ? (await activeDurableStore.manifest()).completionRecordCount : taskCompletionsById.size;

  const resolveParticipantRecordCount = async () =>
    activeDurableStore ? (await activeDurableStore.manifest()).participantRecordCount : participantRecordsById.size;

  const resolveReferralBindingRecordCount = async () =>
    activeDurableStore
      ? (await activeDurableStore.manifest()).referralBindingRecordCount
      : referralBindingRecordsById.size;

  const durableDiagnostics = async () =>
    activeDurableStore
      ? (await activeDurableStore.manifest()).diagnostics.map((issue) => ({
        code: issue.code as CampaignDbDiagnosticCode,
        field: issue.field,
        message: issue.message,
        severity: issue.severity,
      }))
      : [];

  const health = async (): Promise<CampaignDbRepositoryHealth> => {
    const campaignStore = activeDurableStore ? await activeDurableStore.manifest() : undefined;
    const storeDiagnostics = await durableDiagnostics();
    const diagnostics = [...productionDiagnostics, ...storeDiagnostics];

    return {
      adapterId,
      ...(campaignStore ? { campaignStore } : {}),
      diagnosticCodes: diagnostics.map((issue) => issue.code),
      diagnostics,
      eventCount: events.length,
      fallbackUsed: false,
      completionRecordCount: await resolveCompletionRecordCount(),
      id: "campaign-db-repository-runtime",
      liveConnectionAttempted: false,
      liveMigrationExecutionEnabled: false,
      liveQueryExecutionEnabled: false,
      participantRecordCount: await resolveParticipantRecordCount(),
      productionReady: false,
      referralBindingRecordCount: await resolveReferralBindingRecordCount(),
      recordCount: await resolveRecordCount(),
      selectedMode: mode,
      status: mode === "production_deferred" || diagnostics.some((issue) => issue.severity === "error")
        ? "blocked"
        : "ready",
      storeId: "campaign-db",
      taskRecordCount: await resolveTaskRecordCount(),
      validation: {
        issues: diagnostics,
        valid: diagnostics.length === 0,
      },
    };
  };

  const normalizeEligibilityInput = async (
    input: CampaignDbEligibilityInput,
    campaignExists: boolean,
  ) => {
    const issues: CampaignDbDiagnostic[] = [];
    const campaignId = requireCompletionString(input, "campaignId", issues);
    const walletAddress = requireCompletionString(input, "walletAddress", issues);
    const accountType = normalizeCompletionAccountType(input.accountType, issues, true);
    const walletSource = normalizeCompletionWalletSource(input.walletSource, issues, true);
    const participant = campaignExists
      ? await getParticipantRecord(campaignId, walletAddress)
      : undefined;

    if (campaignId && !campaignExists) {
      issues.push(diagnostic(
        "CAMPAIGN_DB_COMPLETION_CAMPAIGN_NOT_FOUND",
        "campaignId",
        `Campaign DB draft '${sanitizeCampaignDbDiagnosticValue("campaignId", campaignId)}' was not found.`,
      ));
    }

    if (issues.length > 0) {
      throw new CampaignDbRepositoryError("Invalid Campaign DB eligibility input.", issues);
    }

    return {
      accountType: participant?.accountType ?? accountType,
      campaignId,
      localePreference: participant?.localePreference ?? "en-US",
      participant,
      riskFlags: participant?.riskFlags ?? [],
      walletAddress,
      walletSource: participant?.walletSource ?? walletSource,
      walletTypeVerified: participant?.walletTypeVerified ??
        (input.accountType !== undefined && input.walletSource !== undefined),
    };
  };

  return {
    addTaskDraft: async (input, context = {}) => {
      assertWritable();

      const campaign = activeDurableStore
        ? await activeDurableStore.getById(input.campaignId)
        : recordsById.get(input.campaignId);
      const validated = validateAddTaskDraftInput(input, Boolean(campaign));
      const transactionId = nextTransactionId();
      appendEvent({
        entity: "CampaignTask",
        operation: "begin_add_task_draft",
        traceId: context.traceId,
        transactionId,
        type: "transaction.begin",
      });
      appendEvent({
        entity: "CampaignTask",
        operation: "plan_insert_campaign_task_draft",
        traceId: context.traceId,
        transactionId,
        type: "command.planned",
      });

      const createdAt = now();
      const task: CampaignDbTaskDraft = {
        ...validated,
        createdAt,
        id: nextTaskId(),
        updatedAt: createdAt,
      };

      if (activeDurableStore) {
        await activeDurableStore.createTaskDraft(task);
      } else {
        taskRecordsById.set(task.id, task);
      }

      appendEvent({
        entity: "CampaignTask",
        operation: "insert_campaign_task_draft",
        traceId: context.traceId,
        transactionId,
        type: "command.insert",
      });
      appendEvent({
        entity: "CampaignTask",
        operation: "commit_add_task_draft",
        traceId: context.traceId,
        transactionId,
        type: "transaction.commit",
      });

      return task;
    },
    bindReferral: async (input, context = {}) => {
      assertWritable();

      const campaign = activeDurableStore
        ? await activeDurableStore.getById(input.campaignId)
        : recordsById.get(input.campaignId);
      const existing = await getReferralBindingRecord(input.campaignId, input.inviteeWalletAddress);
      const validated = validateBindReferralInput(input, campaign, existing);
      const transactionId = nextTransactionId();
      appendEvent({
        entity: "ReferralBinding",
        operation: "begin_bind_referral",
        traceId: context.traceId,
        transactionId,
        type: "transaction.begin",
      });
      appendEvent({
        entity: "ReferralBinding",
        operation: "plan_insert_referral_binding",
        traceId: context.traceId,
        transactionId,
        type: "command.planned",
      });

      const timestamp = now();
      const binding: CampaignDbReferralBindingRecord = {
        ...validated,
        createdAt: timestamp,
        id: await nextReferralBindingIdForStore(),
        qualifiedActionCompleted: false,
        updatedAt: timestamp,
      };

      if (activeDurableStore) {
        await activeDurableStore.upsertReferralBinding(binding);
      } else {
        referralBindingRecordsById.set(referralBindingKey(binding.campaignId, binding.inviteeWalletAddress), binding);
      }

      appendEvent({
        entity: "ReferralBinding",
        operation: "insert_referral_binding",
        traceId: context.traceId,
        transactionId,
        type: "command.insert",
      });
      appendEvent({
        entity: "ReferralBinding",
        operation: "commit_bind_referral",
        traceId: context.traceId,
        transactionId,
        type: "transaction.commit",
      });

      return binding;
    },
    checkEligibility: async (input, context = {}) => {
      assertWritable();
      appendEvent({
        operation: "lookup_campaign_eligibility",
        traceId: context.traceId,
        type: "query.lookup",
      });

      const campaign = activeDurableStore
        ? await activeDurableStore.getById(input.campaignId)
        : recordsById.get(input.campaignId);
      const normalized = await normalizeEligibilityInput(input, Boolean(campaign));
      const tasks = await listTaskDraftsByCampaignId(normalized.campaignId);
      const completions = await listTaskCompletionsByWallet(normalized.campaignId, normalized.walletAddress);
      const completedTaskIds = new Set(
        completions
          .filter((completion) => completion.status === "completed")
          .map((completion) => completion.taskId),
      );
      const pendingTaskIds = new Set(
        completions
          .filter((completion) => completion.status === "pending" || completion.status === "manual_review")
          .map((completion) => completion.taskId),
      );
      const missingTasks = tasks
        .filter((task) => task.required && !completedTaskIds.has(task.id))
        .map((task) => task.templateCode || task.id);
      const hasPendingRequiredTask = tasks
        .some((task) => task.required && !completedTaskIds.has(task.id) && pendingTaskIds.has(task.id));
      const riskFlags = normalized.riskFlags;
      const score = completions
        .filter((completion) => completion.status === "completed")
        .reduce((total, completion) => total + completion.pointsAwarded, 0);
      const status: CampaignDbEligibilityProjection["status"] =
        riskFlags.length > 0
          ? "risk_flagged"
          : missingTasks.length === 0
            ? "eligible"
            : hasPendingRequiredTask
              ? "pending"
              : "not_eligible";

      return {
        accountType: normalized.accountType,
        campaignId: normalized.campaignId,
        eligible: status === "eligible",
        localePreference: normalized.localePreference,
        missingTasks,
        repository: {
          adapterId,
          createdViaRepository: true,
          repositoryId: "campaign-db-repository-runtime",
          storeId: "campaign-db",
        },
        riskFlags,
        score,
        status,
        walletAddress: normalized.walletAddress,
        walletSource: normalized.walletSource,
        walletTypeVerified: normalized.walletTypeVerified,
      };
    },
    createDraft: async (input, context = {}) => {
      assertWritable();

      const transactionId = nextTransactionId();
      appendEvent({
        operation: "begin_create_draft",
        traceId: context.traceId,
        transactionId,
        type: "transaction.begin",
      });
      appendEvent({
        operation: "plan_insert_campaign_draft",
        traceId: context.traceId,
        transactionId,
        type: "command.planned",
      });

      const validated = validateCreateDraftInput(input);
      const createdAt = now();
      const draft: CampaignDbDraft = {
        ...validated,
        createdAt,
        id: nextCampaignId(),
        updatedAt: createdAt,
      };

      if (activeDurableStore) {
        await activeDurableStore.create(draft);
      } else {
        recordsById.set(draft.id, draft);
      }

      appendEvent({
        operation: "insert_campaign_draft",
        traceId: context.traceId,
        transactionId,
        type: "command.insert",
      });
      appendEvent({
        operation: "commit_create_draft",
        traceId: context.traceId,
        transactionId,
        type: "transaction.commit",
      });

      return draft;
    },
    getById: async (campaignId, context = {}) => {
      appendEvent({
        operation: "lookup_campaign_by_id",
        traceId: context.traceId,
        type: "query.lookup",
      });

      const draft = activeDurableStore
        ? await activeDurableStore.getById(campaignId)
        : recordsById.get(campaignId);

      return draft ? await toProjection(draft) : undefined;
    },
    getEvents: () => [...events],
    getParticipant: async (campaignId, walletAddress, context = {}) => {
      appendEvent({
        entity: "CampaignParticipant",
        operation: "lookup_campaign_participant",
        traceId: context.traceId,
        type: "query.lookup",
      });

      return await getParticipantRecord(campaignId, walletAddress);
    },
    getReferralBinding: async (campaignId, inviteeWalletAddress, context = {}) => {
      appendEvent({
        entity: "ReferralBinding",
        operation: "lookup_referral_binding",
        traceId: context.traceId,
        type: "query.lookup",
      });

      return await getReferralBindingRecord(campaignId, inviteeWalletAddress);
    },
    health,
    list: async (filter = {}, context = {}) => {
      appendEvent({
        operation: "list_campaign_drafts",
        traceId: context.traceId,
        type: "query.list",
      });

      const records = activeDurableStore
        ? await activeDurableStore.list(filter)
        : Array.from(recordsById.values());

      const filteredRecords = records
        .filter((draft) => {
          if (filter.projectId && draft.projectId !== filter.projectId) {
            return false;
          }

          if (filter.ownerAddress && draft.ownerAddress !== filter.ownerAddress) {
            return false;
          }

          if (filter.status && draft.status !== filter.status) {
            return false;
          }

          return true;
        })
        .sort((left, right) => left.id.localeCompare(right.id));

      return Promise.all(filteredRecords.map(toProjection));
    },
    listParticipants: async (filter, context = {}) => {
      appendEvent({
        entity: "CampaignParticipant",
        operation: "list_campaign_participants",
        traceId: context.traceId,
        type: "query.list",
      });
      const participants = await listParticipantsByCampaignId(filter.campaignId);
      const maxLimit = participants.length || 1;
      const limit = Math.max(1, Math.min(Math.trunc(filter.limit ?? maxLimit), maxLimit));

      return participants
        .filter((participant) => !filter.walletAddress || participant.walletAddress === filter.walletAddress)
        .slice(0, limit);
    },
    listReferralBindings: async (filter, context = {}) => {
      appendEvent({
        entity: "ReferralBinding",
        operation: "list_referral_bindings",
        traceId: context.traceId,
        type: "query.list",
      });
      const bindings = await listReferralBindingsByCampaignId(filter.campaignId);
      const maxLimit = bindings.length || 1;
      const limit = Math.max(1, Math.min(Math.trunc(filter.limit ?? maxLimit), maxLimit));

      return bindings
        .filter((binding) => !filter.inviteeWalletAddress || binding.inviteeWalletAddress === filter.inviteeWalletAddress)
        .filter((binding) => !filter.referrerWalletAddress || binding.referrerWalletAddress === filter.referrerWalletAddress)
        .slice(0, limit);
    },
    getExportReadiness: async (input, context = {}) => {
      const { exportReadiness } = await createExportState(input, context);

      return exportReadiness;
    },
    markReferralQualified: async (input, context = {}) => {
      assertWritable();

      const campaign = activeDurableStore
        ? await activeDurableStore.getById(input.campaignId)
        : recordsById.get(input.campaignId);
      const existing = await getReferralBindingRecord(input.campaignId, input.inviteeWalletAddress);
      const validated = validateMarkReferralQualifiedInput(input, campaign, existing);
      const transactionId = nextTransactionId();
      appendEvent({
        entity: "ReferralBinding",
        operation: "begin_mark_referral_qualified",
        traceId: context.traceId,
        transactionId,
        type: "transaction.begin",
      });
      appendEvent({
        entity: "ReferralBinding",
        operation: "plan_update_referral_qualification",
        traceId: context.traceId,
        transactionId,
        type: "command.planned",
      });

      const timestamp = now();
      const binding: CampaignDbReferralBindingRecord = {
        ...existing!,
        qualifiedActionCompleted: true,
        qualifiedActionCompletedAt: timestamp,
        qualifiedActionEvidenceHash: validated.evidenceHash,
        riskFlags: mergeSafeFlags(existing!.riskFlags, validated.riskFlags),
        status: "qualified",
        updatedAt: timestamp,
      };

      if (activeDurableStore) {
        await activeDurableStore.upsertReferralBinding(binding);
      } else {
        referralBindingRecordsById.set(referralBindingKey(binding.campaignId, binding.inviteeWalletAddress), binding);
      }

      appendEvent({
        entity: "ReferralBinding",
        operation: "update_referral_qualification",
        traceId: context.traceId,
        transactionId,
        type: "command.update",
      });
      appendEvent({
        entity: "ReferralBinding",
        operation: "commit_mark_referral_qualified",
        traceId: context.traceId,
        transactionId,
        type: "transaction.commit",
      });

      return binding;
    },
    projectExport: async (input, context = {}) => {
      const {
        exportBatchId,
        exportReadiness,
        normalized,
        repository,
        rows,
      } = await createExportState(input, context);
      const artifact = createExportArtifact(
        normalized.campaignId,
        exportBatchId,
        rows,
        normalized.format,
        now(),
      );

      return {
        artifact,
        blockedRows: exportReadiness.summary.blockedRows,
        campaignId: normalized.campaignId,
        columns: EXPORT_CSV_COLUMNS,
        contractRootMode: normalized.contractRootMode,
        disclaimer: "Repository export preview is local-review only and does not distribute rewards.",
        exportBatchId,
        exportReadiness,
        format: normalized.format,
        readyRows: exportReadiness.summary.readyRows,
        repository,
        reviewRequiredRows: exportReadiness.summary.reviewRequiredRows,
        rows,
      };
    },
    reset: async () => {
      recordsById.clear();
      taskCompletionsById.clear();
      taskRecordsById.clear();
      participantRecordsById.clear();
      referralBindingRecordsById.clear();
      await activeDurableStore?.reset();
      events.length = 0;
      idSequence = 0;
      completionIdSequence = 0;
      participantIdSequence = 0;
      referralBindingIdSequence = 0;
      taskIdSequence = 0;
      eventSequence = 0;
      transactionSequence = 0;
    },
    upsertParticipant: async (input, context = {}) => {
      assertWritable();

      const campaign = activeDurableStore
        ? await activeDurableStore.getById(input.campaignId)
        : recordsById.get(input.campaignId);
      const validated = validateUpsertParticipantInput(input, campaign);
      const existing = await getParticipantRecord(validated.campaignId, validated.walletAddress);
      const transactionId = nextTransactionId();
      appendEvent({
        entity: "CampaignParticipant",
        operation: "begin_upsert_campaign_participant",
        traceId: context.traceId,
        transactionId,
        type: "transaction.begin",
      });
      appendEvent({
        entity: "CampaignParticipant",
        operation: "plan_upsert_campaign_participant",
        traceId: context.traceId,
        transactionId,
        type: "command.planned",
      });

      const timestamp = now();
      const participant: CampaignDbParticipantRecord = {
        ...validated,
        createdAt: existing?.createdAt ?? timestamp,
        id: existing?.id ?? await nextParticipantIdForStore(),
        updatedAt: timestamp,
      };

      if (activeDurableStore) {
        await activeDurableStore.upsertParticipant(participant);
      } else {
        participantRecordsById.set(participantKey(participant.campaignId, participant.walletAddress), participant);
      }

      appendEvent({
        entity: "CampaignParticipant",
        operation: existing ? "update_campaign_participant" : "insert_campaign_participant",
        traceId: context.traceId,
        transactionId,
        type: existing ? "command.update" : "command.insert",
      });
      appendEvent({
        entity: "CampaignParticipant",
        operation: "commit_upsert_campaign_participant",
        traceId: context.traceId,
        transactionId,
        type: "transaction.commit",
      });

      return participant;
    },
    upsertTaskCompletion: async (input, context = {}) => {
      assertWritable();

      const campaign = activeDurableStore
        ? await activeDurableStore.getById(input.campaignId)
        : recordsById.get(input.campaignId);
      const task = (await listTaskDraftsByCampaignId(input.campaignId))
        .find((candidate) => candidate.id === input.taskId);
      const validated = validateUpsertTaskCompletionInput(input, campaign, task);
      const existing = await findTaskCompletion(validated.campaignId, validated.taskId, validated.walletAddress);
      const transactionId = nextTransactionId();
      appendEvent({
        entity: "TaskCompletion",
        operation: "begin_upsert_task_completion",
        traceId: context.traceId,
        transactionId,
        type: "transaction.begin",
      });
      appendEvent({
        entity: "TaskCompletion",
        operation: "plan_upsert_task_completion",
        traceId: context.traceId,
        transactionId,
        type: "command.planned",
      });

      const timestamp = now();
      const completion: CampaignDbTaskCompletion = {
        ...validated,
        ...(validated.status === "completed" ? { completedAt: timestamp } : {}),
        createdAt: existing?.createdAt ?? timestamp,
        id: existing?.id ?? await nextCompletionIdForStore(),
        updatedAt: timestamp,
      };

      if (activeDurableStore) {
        await activeDurableStore.upsertTaskCompletion(completion);
      } else {
        taskCompletionsById.set(completion.id, completion);
      }

      appendEvent({
        entity: "TaskCompletion",
        operation: existing ? "update_task_completion" : "insert_task_completion",
        traceId: context.traceId,
        transactionId,
        type: existing ? "command.update" : "command.insert",
      });
      appendEvent({
        entity: "TaskCompletion",
        operation: "commit_upsert_task_completion",
        traceId: context.traceId,
        transactionId,
        type: "transaction.commit",
      });

      return completion;
    },
  };
};
