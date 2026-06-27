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
export type AiContentArtifactType =
  | "x_thread"
  | "telegram_announcement"
  | "discord_message"
  | "faq"
  | "tutorial"
  | "daily_report"
  | "winner_report";
export type AiContentArtifactChannel =
  | "x"
  | "telegram"
  | "discord"
  | "support"
  | "tutorial"
  | "internal_report"
  | "winner_report";
export type AiContentArtifactLifecycle =
  | "ai_draft"
  | "edited"
  | "human_approved"
  | "schedule_intent"
  | "publish_intent";
export type AiContentReleaseActionState = "available" | "blocked";
export type AiContentRiskLevel = "low" | "medium" | "high";
export type AiContentQualityGateCategory =
  | "reward_responsibility"
  | "eligibility"
  | "winner_rules"
  | "deadline"
  | "risk_language"
  | "cta"
  | "localization";
export type AiContentQualityGateStatus = "passed" | "warning" | "blocked";
export type TemplateGovernanceStatus = "ready" | "warning" | "blocked";
export type TemplateGovernanceSignal =
  | "risk_review"
  | "localization_review"
  | "wallet_coverage"
  | "verification_strength";
export type ApiSkillId =
  | "create_campaign"
  | "generate_campaign_tasks"
  | "verify_task"
  | "check_eligibility"
  | "get_campaign_analytics"
  | "export_winners"
  | "generate_campaign_posts"
  | "summarize_campaign";
export type ApiSkillContractReadiness =
  | "ready"
  | "local_only"
  | "review_required"
  | "blocked";
export type ApiSkillRiskLevel = "low" | "medium" | "high";
export type ApiSkillApiGroup =
  | "wallet_session"
  | "campaign_creation"
  | "task_generation"
  | "task_verification"
  | "eligibility"
  | "analytics"
  | "export"
  | "content_generation"
  | "campaign_summary";
export type ApiSkillFieldGroup =
  | "campaign"
  | "task"
  | "wallet"
  | "locale"
  | "contract"
  | "evidence"
  | "analytics"
  | "export"
  | "content"
  | "risk";
export type ApiSkillEvidenceSource =
  | "AEFINDER"
  | "AELFSCAN"
  | "DAPP_API"
  | "SOCIAL_API"
  | "MANUAL"
  | "LOCAL_SEEDED";
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
  | "Forecast"
  | "Portfolio";
export type EcosystemNextActionProductId = "Pay" | "Forecast" | "Portfolio";
export type EcosystemRecommendationStatus = "ready" | "locked" | "review" | "completed";
export type EcosystemRecommendationPriority = "primary" | "secondary" | "tertiary";
export type EcosystemRecommendationSignalTone = "ready" | "warning" | "blocker";

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

export type WalletDiagnosticState = "ready" | "warning" | "blocker";
export type WalletDiagnosticGroupId =
  | "recommended-aa"
  | "supported-eoa"
  | "connection-issues"
  | "address-only"
  | "internal-agent";
export type WalletQaChecklistId =
  | "portkey-aa-connect"
  | "eoa-extension-connect"
  | "wrong-chain-error"
  | "unsupported-wallet-error"
  | "missing-signature"
  | "account-policy-restriction";

export interface WalletDiagnosticItem {
  sessionId: string;
  walletName: string;
  displayAddress: string;
  accountType: AccountType;
  walletSource: WalletSource;
  verificationStatus: WalletVerificationStatus;
  signatureStatus: WalletSignatureStatus;
  statusMessage: LocalizedText;
  nextAction: LocalizedText;
  capabilities: WalletCapability[];
  qaScenario: LocalizedText;
}

export interface WalletDiagnosticGroup {
  id: WalletDiagnosticGroupId;
  title: LocalizedText;
  description: LocalizedText;
  state: WalletDiagnosticState;
  items: WalletDiagnosticItem[];
}

export interface WalletQaChecklistItem {
  id: WalletQaChecklistId;
  label: LocalizedText;
  state: WalletDiagnosticState;
  evidence: LocalizedText;
  sessionIds: string[];
}

export interface WalletDiagnosticSummary {
  totalSessions: number;
  verifiedSessions: number;
  issueSessions: number;
  recommendedPathReady: boolean;
  eoaPathsReady: number;
  boundary: LocalizedText;
  groups: WalletDiagnosticGroup[];
  qaChecklist: WalletQaChecklistItem[];
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

export interface AiContentActionPolicy {
  copy: AiContentReleaseActionState;
  edit: AiContentReleaseActionState;
  markReviewed: AiContentReleaseActionState;
  schedule: AiContentReleaseActionState;
  publish: AiContentReleaseActionState;
  blockedReason?: LocalizedText;
  nextAction: LocalizedText;
}

export interface AiContentArtifactDraft {
  id: string;
  campaignId: string;
  type: AiContentArtifactType;
  channel: AiContentArtifactChannel;
  purpose: LocalizedText;
  title: LocalizedText;
  body: LocalizedText;
  localeStatus: Record<SupportedLocale, LocaleStatus>;
  lifecycle: AiContentArtifactLifecycle;
  reviewer?: string;
  updatedAt: string;
  riskLevel: AiContentRiskLevel;
  qualityGateRefs: string[];
}

export interface AiContentArtifact extends AiContentArtifactDraft {
  actionPolicy: AiContentActionPolicy;
}

export interface AiContentQualityGate {
  id: string;
  category: AiContentQualityGateCategory;
  label: LocalizedText;
  status: AiContentQualityGateStatus;
  evidence: LocalizedText;
  affectedArtifactTypes: AiContentArtifactType[];
}

export interface AiContentPackSummary {
  totalArtifacts: number;
  aiDrafts: number;
  humanApproved: number;
  blockedReleaseActions: number;
  availableCopyActions: number;
  qualityGateBlockers: number;
  nextAction: LocalizedText;
}

export interface AiContentPackWorkbench {
  campaignId: string;
  defaultLocale: "en-US";
  supportedLocales: SupportedLocale[];
  summary: AiContentPackSummary;
  artifacts: AiContentArtifact[];
  qualityGates: AiContentQualityGate[];
  boundary: {
    title: LocalizedText;
    body: LocalizedText;
  };
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

export type ContractReviewChecklistStatus = "passed" | "warning" | "blocked";
export type ContractReviewRequiredFor = "MVP" | "P1" | "P2" | "CONTRACT_CLAIM";

export interface ContractReviewChecklistItem {
  id: string;
  label: LocalizedText;
  value: LocalizedText;
  status: ContractReviewChecklistStatus;
  ownerRole: OwnerRole;
  requiredFor: ContractReviewRequiredFor;
  detail: LocalizedText;
  nextAction: LocalizedText;
}

export interface ContractEvolutionStep {
  id: string;
  phase: LocalizedText;
  title: LocalizedText;
  description: LocalizedText;
  status: PublishState;
  contractSurface: LocalizedText;
}

export interface AdminContractReviewCenter {
  campaignId: string;
  selectedMode: ContractMode;
  v2CompanionNeeded: LocalizedText;
  metadataHash: LocalizedText;
  verifierRole: LocalizedText;
  rewardCustody: LocalizedText;
  publishState: PublishState;
  highImpactMode: boolean;
  summary: LocalizedText;
  boundary: LocalizedText;
  nextAction: LocalizedText;
  checklist: ContractReviewChecklistItem[];
  evolution: ContractEvolutionStep[];
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

export interface EcosystemNextActionProduct {
  id: EcosystemNextActionProductId;
  label: LocalizedText;
  description: LocalizedText;
  serviceState: "seeded_preview" | "not_connected";
}

export interface EcosystemRecommendationSignal {
  id: string;
  label: LocalizedText;
  value: LocalizedText;
  tone: EcosystemRecommendationSignalTone;
}

export interface EcosystemNextActionRecommendation {
  id: string;
  product: EcosystemNextActionProduct;
  status: EcosystemRecommendationStatus;
  priority: EcosystemRecommendationPriority;
  title: LocalizedText;
  reason: LocalizedText;
  ctaLabel: LocalizedText;
  gatingReason?: LocalizedText;
  relatedSignals: EcosystemRecommendationSignal[];
  boundary: LocalizedText;
}

export interface EcosystemNextActionSummary {
  totalRecommendations: number;
  readyCount: number;
  lockedCount: number;
  reviewCount: number;
  topRecommendationId: string;
  loopProgressPercent: number;
  headline: LocalizedText;
  boundary: LocalizedText;
}

export interface EcosystemNextActionReadModel {
  campaignId: string;
  participantWalletAddress: string;
  summary: EcosystemNextActionSummary;
  recommendations: EcosystemNextActionRecommendation[];
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

export interface TemplateGovernanceSummary {
  totalTemplates: number;
  readyCount: number;
  warningCount: number;
  blockedCount: number;
  highRiskCount: number;
  localizationReviewCount: number;
  anyWalletCount: number;
  aaOnlyCount: number;
  eoaOnlyCount: number;
  strongVerificationCount: number;
}

export interface TemplateGovernanceRow {
  templateId: string;
  category: string;
  title: LocalizedText;
  description: LocalizedText;
  verificationType: VerificationType | "REFERRAL";
  walletCompatibility: WalletCompatibility;
  defaultPoints: number;
  requiredByDefault: boolean;
  riskLevel: RiskLevel;
  localeReadiness: Record<SupportedLocale, LocaleStatus>;
  status: TemplateGovernanceStatus;
  statusReason: LocalizedText;
  nextAction: LocalizedText;
  reviewSignals: TemplateGovernanceSignal[];
}

export interface TemplateGovernanceConsole {
  summary: TemplateGovernanceSummary;
  rows: TemplateGovernanceRow[];
  boundary: LocalizedText;
}

export interface ApiSkillContractField {
  name: string;
  group: ApiSkillFieldGroup;
  required: boolean;
  label: LocalizedText;
  description: LocalizedText;
  example?: string;
}

export interface ApiSkillContract {
  id: ApiSkillId;
  title: LocalizedText;
  purpose: LocalizedText;
  apiGroup: ApiSkillApiGroup;
  readiness: ApiSkillContractReadiness;
  riskLevel: ApiSkillRiskLevel;
  inputFields: ApiSkillContractField[];
  outputFields: ApiSkillContractField[];
  evidenceSources: ApiSkillEvidenceSource[];
  securityBoundary: LocalizedText;
  nextAction: LocalizedText;
}

export interface ApiSkillContractSummary {
  totalContracts: number;
  readyCount: number;
  localOnlyCount: number;
  reviewRequiredCount: number;
  blockedCount: number;
  highRiskCount: number;
  externalEvidenceCount: number;
  requiredSkillIds: readonly ApiSkillId[];
  missingSkillIds: ApiSkillId[];
}

export interface ApiSkillContractCoverage {
  requiredFieldGroups: readonly ApiSkillFieldGroup[];
  coveredFieldGroups: ApiSkillFieldGroup[];
  missingFieldGroups: ApiSkillFieldGroup[];
}

export interface ApiSkillContractSurface {
  summary: ApiSkillContractSummary;
  coverage: ApiSkillContractCoverage;
  contracts: ApiSkillContract[];
  boundary: LocalizedText;
}

export interface AdminOpsReadModel {
  campaignId: string;
  reviewQueue: ReviewItem[];
  contractReviewCenter: AdminContractReviewCenter;
  aiContentPack: AiContentPackWorkbench;
  templateGovernance: TemplateGovernanceConsole;
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
  aiContentArtifacts: AiContentArtifactDraft[];
  aiContentQualityGates: AiContentQualityGate[];
  reviewItems: ReviewItem[];
  publishReadiness: PublishReadiness;
  exportPreview: ExportPreview;
  conversionFunnel: ConversionFunnelStep[];
  riskSignals: RiskSignal[];
  aiOpsReports: AiOpsReportCard[];
  ecosystemMetrics: EcosystemMetricRow[];
}
