export const supportedLocales = ["en-US", "zh-CN"] as const;

export type SupportedLocale = (typeof supportedLocales)[number];
export type AccountType = "AA" | "EOA" | "UNKNOWN";
export type WalletSource =
  | "PORTKEY_AA"
  | "PORTKEY_EOA_APP"
  | "PORTKEY_EOA_EXTENSION"
  | "NIGHTELF"
  | "AGENT_SKILL"
  | "OTHER";
export type WalletPolicy = "ANY" | "AA_ONLY" | "EOA_ONLY";
export type WalletVerificationStatus =
  | "verified"
  | "address_only"
  | "unsupported_wallet"
  | "wrong_chain"
  | "missing_signature"
  | "account_restricted"
  | "internal_agent";
export type WalletSignatureStatus = "signed" | "missing" | "not_required" | "not_available";
export type WalletNetwork = "mainnet" | "testnet" | "unknown";
export type WalletCapability =
  | "SIGN_MESSAGE"
  | "SEND_TRANSACTION"
  | "CONTRACT_VIEW"
  | "CONTRACT_SEND"
  | "VIEW_BALANCE"
  | "INTERNAL_AUTOMATION"
  | "ADDRESS_ONLY";
export type ContractMode = "OFF_CHAIN_MVP" | "V2_COMPANION" | "CONTRACT_CLAIM";
export type WalletCompatibility = "ANY" | "AA_ONLY" | "EOA_ONLY";
export type LocaleStatus =
  | "ready"
  | "ai_draft"
  | "reviewed"
  | "published"
  | "fallback"
  | "missing";
export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "live"
  | "paused"
  | "ended"
  | "exported";
export type VerificationType = "WALLET" | "ON_CHAIN" | "DAPP_API" | "SOCIAL" | "MANUAL";
export type RiskLevel = "low" | "medium" | "high";
export type ContentRevisionStatus =
  | "empty"
  | "ai_draft"
  | "human_reviewed"
  | "published"
  | "archived";
export type ReviewItemType = "AI_CONTENT" | "CONTRACT_IMPACT" | "RISK_FLAG" | "EXPORT_READY";
export type ReviewSeverity = "info" | "warning" | "blocker";
export type ReviewStatus = "open" | "in_review" | "approved" | "rejected";
export type OwnerRole = "project_owner" | "internal_operator" | "contract_reviewer";
export type PublishState = "ready" | "warning" | "blocker";
export type EligibilityStatus = "eligible" | "not_eligible" | "pending" | "risk_flagged" | "ended";
export type TaskVerificationStatus = "ready" | "pending" | "completed" | "failed" | "manual_review";
export type EvidenceSource = "wallet" | "aefinder" | "aelfscan" | "dapp_api" | "social_api" | "manual";
export type MetricTone = "neutral" | "good" | "warning" | "critical";
export type SignalSeverity = "low" | "medium" | "high" | "blocked";
export type AiConfidence = "low" | "medium" | "high";
export type EcosystemProduct =
  | "eBridge"
  | "Awaken"
  | "Forest"
  | "TMRWDAO"
  | "daipp"
  | "Pay"
  | "Forecast";

export type LocalizedText = Record<SupportedLocale, string>;

export const EXPORT_CSV_COLUMNS = [
  "campaign_id",
  "wallet_address",
  "account_type",
  "wallet_source",
  "locale_preference",
  "total_points",
  "rank",
  "eligible",
  "missing_tasks",
  "risk_flags",
  "referrer_address",
  "task_records",
  "evidence_hashes",
  "export_batch_id",
] as const;

export type ExportCsvColumn = (typeof EXPORT_CSV_COLUMNS)[number];
export type ExportRowStatus = "ready" | "review_required" | "blocked";

export interface WalletAdapterFixture {
  id: string;
  adapterName: string;
  walletName: string;
  address?: string;
  accountType: AccountType;
  walletSource: WalletSource;
  chainId: "AELF" | "tDVV" | "tDVW" | string;
  network: WalletNetwork;
  capabilities: WalletCapability[];
  connectedAt?: string;
  lastSeenAt?: string;
  signatureRequired: boolean;
  signaturePresent: boolean;
  supported: boolean;
  allowedByCampaignPolicy: boolean;
  addressOnly?: boolean;
  recommended: boolean;
  audience: "NORMAL_USER" | "EXISTING_USER" | "INTERNAL_AGENT";
}

export interface NormalizedWalletSession {
  id: string;
  sessionId: string;
  address: string;
  displayAddress: string;
  accountType: AccountType;
  walletSource: WalletSource;
  walletName: string;
  chainId: "AELF" | "tDVV" | "tDVW" | string;
  network: WalletNetwork;
  capabilities: WalletCapability[];
  connectedAt?: string;
  lastSeenAt?: string;
  verificationStatus: WalletVerificationStatus;
  signatureStatus: WalletSignatureStatus;
  walletTypeVerified: boolean;
  normalUserRecommended: boolean;
  errorReason?: string;
  userAction?: LocalizedText;
  statusMessage: LocalizedText;
}

export interface WalletOption {
  id: string;
  name: string;
  accountType: AccountType;
  walletSource: WalletSource;
  recommended: boolean;
  audience: "NORMAL_USER" | "EXISTING_USER" | "INTERNAL_AGENT";
  capabilities: WalletCapability[];
}

export interface CampaignMetrics {
  connectedWallets: number;
  aaWallets: number;
  eoaWallets: number;
  completionRate: number;
  localeCoverage: number;
  riskReviewQueue: number;
  exportReadyWinners: number;
}

export interface CampaignShellSummary {
  id: string;
  slug: string;
  projectName: string;
  title: LocalizedText;
  subtitle: LocalizedText;
  status: CampaignStatus;
  defaultLocale: "en-US";
  supportedLocales: SupportedLocale[];
  walletPolicy: WalletPolicy;
  contractMode: ContractMode;
  startTime: string;
  endTime: string;
  metrics: CampaignMetrics;
}

export interface CampaignTask {
  id: string;
  templateCode: string;
  title: LocalizedText;
  instruction: LocalizedText;
  verificationType: VerificationType;
  walletCompatibility: WalletCompatibility;
  points: number;
  required: boolean;
  riskLevel: RiskLevel;
  localeStatus: Record<SupportedLocale, LocaleStatus>;
}

export interface ParticipantSnapshot {
  id: string;
  campaignId: string;
  walletAddress: string;
  accountType: AccountType;
  walletSource: WalletSource;
  walletSessionId?: string;
  walletVerifiedAt?: string;
  walletSignatureStatus?: WalletSignatureStatus;
  localePreference: SupportedLocale;
  totalPoints: number;
  rank?: number;
  completedTaskIds: string[];
  eligible: boolean;
  missingTaskIds: string[];
  riskFlags: string[];
  referrerAddress: string;
  taskVerificationOverrides?: Partial<Record<string, TaskVerificationStatus>>;
  taskEvidenceSources?: Partial<Record<string, EvidenceSource>>;
  referralSummary?: ReferralSummary;
}

export interface ContentRevision {
  id: string;
  campaignId: string;
  locale: SupportedLocale;
  sourceLocale: "en-US";
  title: string;
  description: string;
  socialPost: string;
  rewardDisclaimer: string;
  status: ContentRevisionStatus;
  reviewer?: string;
  updatedAt: string;
}

export interface ReviewItem {
  id: string;
  campaignId: string;
  type: ReviewItemType;
  severity: ReviewSeverity;
  status: ReviewStatus;
  title: string;
  ownerRole: OwnerRole;
}

export interface PublishReadiness {
  ready: boolean;
  blockers: string[];
  warnings: string[];
}

export interface TranslationReviewPanel {
  locale: SupportedLocale;
  label: LocalizedText;
  sourceLocale: "en-US";
  title: string;
  description: string;
  socialPost: string;
  rewardDisclaimer: string;
  status: ContentRevisionStatus;
  aiDraft: boolean;
  humanReviewed: boolean;
  fallbackToEnglish: boolean;
  published: boolean;
  publishState: PublishState;
  reviewer?: string;
  updatedAt: string;
  nextAction: LocalizedText;
}

export interface RewardDisclaimerReviewRow {
  locale: SupportedLocale;
  disclaimer: string;
  reviewed: boolean;
  fallbackToEnglish: boolean;
  publishState: PublishState;
}

export interface TranslationManagerReadModel {
  campaignId: string;
  defaultLocale: "en-US";
  fallbackLocale: "en-US";
  supportedLocales: SupportedLocale[];
  sourceLocale: "en-US";
  panels: TranslationReviewPanel[];
  rewardDisclaimers: RewardDisclaimerReviewRow[];
  noAutoPublishNotice: LocalizedText;
}

export interface ContractImpactReviewOption {
  mode: ContractMode;
  label: LocalizedText;
  description: LocalizedText;
  reviewSeverity: ReviewSeverity;
  publishState: PublishState;
  requiresVerifierRole: boolean;
  requiresMetadataHash: boolean;
  requiresHighImpactReview: boolean;
  boundary: LocalizedText;
  nextAction: LocalizedText;
}

export interface ContractImpactReviewModel {
  campaignId: string;
  selectedMode: ContractMode;
  safeDefaultMode: "OFF_CHAIN_MVP";
  options: ContractImpactReviewOption[];
  rewardBoundary: LocalizedText;
}

export interface ExportPreviewRow {
  campaignId: string;
  walletAddress: string;
  accountType: AccountType;
  walletSource: WalletSource;
  localePreference: SupportedLocale;
  totalPoints: number;
  rank?: number;
  eligible: boolean;
  missingTasks: string[];
  riskFlags: string[];
  referrerAddress: string;
  taskRecords: string[];
  evidenceHashes: string[];
  exportBatchId: string;
  walletTypeVerified: boolean;
  rowStatus: ExportRowStatus;
  missingColumnValues: ExportCsvColumn[];
}

export interface AnalyticsKpi {
  id: string;
  label: LocalizedText;
  value: string;
  trend: LocalizedText;
  tone: MetricTone;
  dimension?: string;
}

export interface ConversionFunnelStep {
  id: string;
  label: LocalizedText;
  count: number;
  conversionRate: number;
  dropOffNote: LocalizedText;
}

export interface DimensionSplit {
  id: string;
  label: "AA" | "EOA" | SupportedLocale;
  count: number;
  percentage: number;
}

export interface RiskSignal {
  id: string;
  label: LocalizedText;
  value: string;
  severity: SignalSeverity;
  evidence: LocalizedText;
  nextAction: LocalizedText;
}

export interface AiOpsRecommendation {
  id: string;
  title: LocalizedText;
  expectedImpact: LocalizedText;
  confidence: AiConfidence;
  riskLevel: Exclude<SignalSeverity, "blocked">;
  requiresHumanReview: boolean;
}

export interface AiOpsReportCard {
  id: string;
  title: LocalizedText;
  summary: LocalizedText;
  generatedAt: string;
  recommendations: AiOpsRecommendation[];
}

export interface EcosystemMetricRow {
  product: EcosystemProduct;
  verifiedActions: number;
  conversionImpact: LocalizedText;
  qualitySignal: LocalizedText;
  recommendedNextAction: LocalizedText;
}

export interface TaskEvidenceSummary {
  taskId: string;
  label: LocalizedText;
  status: Exclude<TaskVerificationStatus, "ready">;
  source: EvidenceSource;
  evidenceHash: string;
}

export interface ExportEvidenceRow {
  campaignId: string;
  walletAddress: string;
  accountType: AccountType;
  walletSource: WalletSource;
  localePreference: SupportedLocale;
  totalPoints: number;
  rank: number;
  eligible: boolean;
  missingTasks: string[];
  riskFlags: string[];
  referrerAddress: string;
  taskEvidence: TaskEvidenceSummary[];
  taskRecords: string[];
  evidenceHashes: string[];
  exportBatchId: string;
  walletTypeVerified: boolean;
  rowStatus: ExportRowStatus;
  missingColumnValues: ExportCsvColumn[];
}

export interface ExportConfirmation {
  includedFields: readonly ExportCsvColumn[];
  verifiedRecordsOnly: boolean;
  rewardDistributionOwner: "campaign_project";
  noDistributionBoundary: LocalizedText;
  riskBoundary: LocalizedText;
}

export interface ExportBatchSummary {
  batchId: string;
  columns: readonly ExportCsvColumn[];
  readyCount: number;
  blockedCount: number;
  disclaimer: LocalizedText;
  confirmation: ExportConfirmation;
  rows: ExportEvidenceRow[];
}

export interface AdminOpsReadModel {
  campaignId: string;
  reviewQueue: ReviewItem[];
  analytics: AnalyticsKpi[];
  funnel: ConversionFunnelStep[];
  walletSplit: DimensionSplit[];
  localeSplit: DimensionSplit[];
  riskSignals: RiskSignal[];
  aiReports: AiOpsReportCard[];
  ecosystemMetrics: EcosystemMetricRow[];
  exportBatch: ExportBatchSummary;
}

export interface EligibilityResult {
  status: EligibilityStatus;
  score: number;
  pointsThreshold: number;
  missingTaskIds: string[];
  riskFlags: string[];
  reason: LocalizedText;
  nextAction: LocalizedText;
  walletStatus?: EligibilityWalletStatus;
}

export interface EligibilityWalletStatus {
  walletAddress: string;
  accountType: AccountType;
  walletSource: WalletSource;
  walletTypeVerified: boolean;
  campaignWalletPolicy: WalletPolicy;
  eligible: boolean;
  missingTasks: string[];
  riskFlags: string[];
  statusMessage: LocalizedText;
  nextAction?: LocalizedText;
  verificationStatus: WalletVerificationStatus;
}

export interface TaskVerificationState {
  taskId: string;
  templateCode: string;
  status: TaskVerificationStatus;
  evidenceSource: EvidenceSource;
  pointsAwarded: number;
  pointsAvailable: number;
  completed: boolean;
  missingRequired: boolean;
  walletCompatibility: WalletCompatibility;
  nextAction: LocalizedText;
}

export type ParticipantTaskState = TaskVerificationState;

export interface ReferralSummary {
  inviteLink: string;
  invitedCount: number;
  qualifiedInvitees: number;
  referralPoints: number;
  antiFarmRule: LocalizedText;
  riskFlags: string[];
}

export interface LeaderboardRow {
  rank: number;
  walletAddress: string;
  accountType: AccountType;
  walletSource: WalletSource;
  totalPoints: number;
  eligible: boolean;
  riskFlags: string[];
  localePreference: SupportedLocale;
}

export interface ParticipationMetrics {
  completedRequiredTasks: number;
  totalRequiredTasks: number;
  completedTasks: number;
  totalTasks: number;
  eligibleRankCutoff: number;
  participantRank: number;
  pointsThreshold: number;
}

export interface ParticipationReadModel {
  campaignId: string;
  participant: ParticipantSnapshot;
  eligibility: EligibilityResult;
  taskStates: TaskVerificationState[];
  referral: ReferralSummary;
  leaderboard: LeaderboardRow[];
  metrics: ParticipationMetrics;
  rewardBoundary: LocalizedText;
}

export interface ExportPreview {
  campaignId: string;
  columns: readonly ExportCsvColumn[];
  disclaimer: string;
  confirmation: ExportConfirmation;
  rows: ExportPreviewRow[];
}

export interface CampaignShellDetail extends CampaignShellSummary {
  tasks: CampaignTask[];
  participants: ParticipantSnapshot[];
  walletSessions: NormalizedWalletSession[];
  contentRevisions: ContentRevision[];
  reviewItems: ReviewItem[];
  publishReadiness: PublishReadiness;
  exportPreview: ExportPreview;
  conversionFunnel: ConversionFunnelStep[];
  riskSignals: RiskSignal[];
  aiOpsReports: AiOpsReportCard[];
  ecosystemMetrics: EcosystemMetricRow[];
}
