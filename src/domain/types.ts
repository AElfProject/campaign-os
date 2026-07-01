export const supportedLocales = ["en-US", "zh-CN", "zh-TW"] as const;

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
  | "EBRIDGE"
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
export const campaignLifecycleStatuses = [
  "draft",
  "scheduled",
  "live",
  "paused",
  "ended",
  "exported",
  "archived",
] as const;

export type CampaignStatus = (typeof campaignLifecycleStatuses)[number];
export type CampaignLifecycleStatus = (typeof campaignLifecycleStatuses)[number];
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
  | "create_wallet_session"
  | "agent_wallet_action"
  | "create_campaign"
  | "add_campaign_task"
  | "generate_campaign_tasks"
  | "verify_task"
  | "check_eligibility"
  | "get_campaign_analytics"
  | "export_winners"
  | "generate_i18n_draft"
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
  | "WALLET_SESSION"
  | "LOCAL_SEEDED";
export type ReviewItemType = "AI_CONTENT" | "CONTRACT_IMPACT" | "RISK_FLAG" | "EXPORT_READY";
export type ReviewSeverity = "info" | "warning" | "blocker";
export type ReviewStatus = "open" | "in_review" | "approved" | "rejected";
export type OwnerRole = "project_owner" | "internal_operator" | "contract_reviewer";
export type PublishState = "ready" | "warning" | "blocker";
export type EligibilityStatus = "eligible" | "not_eligible" | "pending" | "risk_flagged" | "ended";
export type TaskVerificationStatus = "ready" | "pending" | "completed" | "failed" | "manual_review";
export type TaskVerificationActionKind =
  | "verify"
  | "retry"
  | "submit_proof"
  | "view_review"
  | "completed";
export type TaskVerificationProofType = "screenshot" | "url" | "manual_note";
export type EvidenceSource = "wallet" | "aefinder" | "aelfscan" | "dapp_api" | "social_api" | "manual";
export type VerificationEvidenceSource =
  | "LOCAL_SEEDED"
  | "AEFINDER"
  | "AELFSCAN"
  | "DAPP_API"
  | "SOCIAL_API"
  | "WALLET_SESSION"
  | "MANUAL_REVIEW";
export type VerificationProviderId =
  | "local_seeded"
  | "aefinder"
  | "aelfscan"
  | "dapp_api"
  | "social_api"
  | "wallet_session"
  | "manual_review";
export type VerificationProviderReadiness =
  | "ready"
  | "local_only"
  | "review_required"
  | "unavailable"
  | "blocked";
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
export type ExportPreviewMode = "csv" | "json";
export type ExportReadinessState = "ready" | "review_required" | "blocked";
export type ExportRowStatus = "ready" | "review_required" | "blocked";
export type ExportArtifactGeneratedMode = "local_review_only";
export type ExportContractRootMode =
  | "none"
  | "eligibility_root"
  | "winners_root"
  | "contract_claim";
export type ExportRowReasonCode =
  | "eligible_verified"
  | "risk_review_required"
  | "missing_required_tasks"
  | "wallet_metadata_unverified"
  | "missing_export_fields";
export type ExportAcknowledgementId =
  | "verified-records-only"
  | "project-owned-reward-distribution"
  | "no-reward-custody"
  | "no-reward-distribution"
  | "no-real-export-file";
export type UserWinnersExportStatus = ExportRowStatus | "pending";

export interface WalletAdapterFixture {
  id: string;
  adapterName: string;
  walletName: string;
  address?: string;
  accountType: AccountType;
  walletSource: WalletSource;
  chainId: "AELF" | "tDVV" | "tDVW" | string;
  network: WalletNetwork;
  accounts?: Record<string, string>;
  publicKey?: string;
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
  accounts?: Record<string, string>;
  publicKey?: string;
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
export type WalletProviderQaScenarioId =
  | "portkey-aa-connect"
  | "eoa-extension-connect"
  | "wrong-chain-error"
  | "unsupported-wallet-error";
export type WalletProviderQaSeededStatus = "ready" | "missing";
export type WalletProviderQaLiveEvidenceStatus = "missing" | "ready" | "blocked" | "not_applicable";
export type WalletProviderQaReleaseImpact =
  | "release_blocker"
  | "needs_review"
  | "ready"
  | "informational";
export type AelfWebLoginIntegrationId = "aelf-web-login";
export type AelfWebLoginAdapterAudience =
  | "NORMAL_USER"
  | "EXISTING_USER"
  | "FUTURE_USER"
  | "INTERNAL_AGENT";
export type AelfWebLoginAdapterFeatureGateState =
  | "enabled_preview"
  | "disabled"
  | "maintenance"
  | "unavailable"
  | "blocked";
export type AelfWebLoginAdapterReadiness =
  | "ready"
  | "local_only"
  | "review_required"
  | "maintenance"
  | "unavailable"
  | "blocked";
export type AelfWebLoginAdapterSeededCoverageStatus = "ready" | "missing" | "not_applicable";
export type AelfWebLoginAdapterLiveEvidenceStatus = "ready" | "missing" | "blocked" | "not_applicable";
export type AelfWebLoginAdapterReleaseImpact =
  | "ready"
  | "needs_review"
  | "maintenance"
  | "release_blocker"
  | "informational";
export type AelfWebLoginAdapterFallbackMode =
  | "none"
  | "local_seeded"
  | "maintenance"
  | "manual_review"
  | "disabled"
  | "unavailable"
  | "blocked";

export interface AelfWebLoginAdapterFeatureGate {
  state: AelfWebLoginAdapterFeatureGateState;
  configKey: string;
  degradesGracefully: true;
  operatorMessage: LocalizedText;
}

export interface AelfWebLoginAdapterFallback {
  mode: AelfWebLoginAdapterFallbackMode;
  reason: LocalizedText;
  nextAction: LocalizedText;
  blocksLaunch: boolean;
}

export interface AelfWebLoginAdapterConfig {
  id: string;
  integrationId: AelfWebLoginIntegrationId;
  adapterName: string;
  displayName: LocalizedText;
  accountType: AccountType;
  walletSource: WalletSource;
  chainId: "AELF" | "tDVV" | "tDVW" | string;
  network: WalletNetwork;
  capabilities: WalletCapability[];
  audience: AelfWebLoginAdapterAudience;
  recommended: boolean;
  featureGate: AelfWebLoginAdapterFeatureGate;
}

export interface AelfWebLoginAdapterReadinessEntry extends AelfWebLoginAdapterConfig {
  adapterId: string;
  readiness: AelfWebLoginAdapterReadiness;
  seededCoverageStatus: AelfWebLoginAdapterSeededCoverageStatus;
  liveEvidenceStatus: AelfWebLoginAdapterLiveEvidenceStatus;
  releaseImpact: AelfWebLoginAdapterReleaseImpact;
  matchedSessionIds: string[];
  fallback: AelfWebLoginAdapterFallback;
  evidenceRequired: LocalizedText;
  nextAction: LocalizedText;
  securityBoundary: LocalizedText;
}

export interface AelfWebLoginAdapterReadinessSummary {
  totalAdapters: number;
  configuredAdapters: number;
  enabledPreviewAdapters: number;
  disabledAdapters: number;
  maintenanceAdapters: number;
  unavailableAdapters: number;
  blockedAdapters: number;
  publicUserAdapters: number;
  internalOnlyAdapters: number;
  seededReadyAdapters: number;
  liveEvidenceReadyAdapters: number;
  missingLiveEvidenceAdapters: number;
  releaseBlockers: number;
  recommendedAdapterId: string;
}

export interface AelfWebLoginAdapterReadinessModel {
  integrationId: AelfWebLoginIntegrationId;
  boundary: LocalizedText;
  nextAction: LocalizedText;
  summary: AelfWebLoginAdapterReadinessSummary;
  entries: AelfWebLoginAdapterReadinessEntry[];
  normalUserEntries: AelfWebLoginAdapterReadinessEntry[];
  internalEntries: AelfWebLoginAdapterReadinessEntry[];
}

export type LiveWalletConnectorId =
  | "portkey-aa-live"
  | "portkey-discover-eoa-live"
  | "portkey-eoa-extension-live"
  | "nightelf-live";
export type LiveWalletConnectorFeatureGateState =
  | "disabled"
  | "preview"
  | "review_required"
  | "blocked"
  | "approved";
export type LiveWalletConnectorReadiness =
  | "disabled"
  | "review_required"
  | "blocked"
  | "approved";
export type LiveWalletConnectorReleaseImpact =
  | "informational"
  | "needs_review"
  | "release_blocker"
  | "future_ready";
export type LiveWalletConnectorDependencyRisk = "low" | "medium" | "high";
export type LiveWalletConnectorLiveEvidenceStatus = "missing" | "ready" | "blocked";
export type LiveWalletConnectorOperationName =
  | "connectWallet"
  | "getSignature"
  | "callSendMethod"
  | "callViewMethod"
  | "sendMultiTransaction"
  | "requestAccounts"
  | "switchChain"
  | "sendTransaction"
  | "contractView"
  | "contractSend";
export type LiveWalletConnectorOperationState = "blocked" | "review_only";

export interface LiveWalletConnectorPackageCandidate {
  packageName: string;
  packageVersionSource: string;
  dependencyRisk: LiveWalletConnectorDependencyRisk;
  role: LocalizedText;
}

export interface LiveWalletConnectorOperation {
  name: LiveWalletConnectorOperationName;
  state: LiveWalletConnectorOperationState;
  reason: LocalizedText;
}

export interface LiveWalletConnectorFallback {
  reason: LocalizedText;
  nextAction: LocalizedText;
  blocksLaunch: boolean;
}

export interface LiveWalletConnectorEntry {
  connectorId: LiveWalletConnectorId;
  adapterId: string;
  displayName: LocalizedText;
  packageName: string;
  packageVersionSource: string;
  accountType: AccountType;
  walletSource: WalletSource;
  supportedChains: string[];
  network: WalletNetwork;
  capabilities: WalletCapability[];
  featureGateState: LiveWalletConnectorFeatureGateState;
  liveEvidenceStatus: LiveWalletConnectorLiveEvidenceStatus;
  readiness: LiveWalletConnectorReadiness;
  releaseImpact: LiveWalletConnectorReleaseImpact;
  dependencyRisk: LiveWalletConnectorDependencyRisk;
  fallback: LiveWalletConnectorFallback;
  nextAction: LocalizedText;
  securityBoundary: LocalizedText;
}

export interface LiveWalletConnectorSummary {
  totalConnectors: number;
  disabledConnectors: number;
  reviewRequiredConnectors: number;
  approvedConnectors: number;
  blockedConnectors: number;
  missingLiveEvidenceConnectors: number;
  releaseBlockers: number;
}

export interface LiveWalletConnectorBoundary {
  integrationId: AelfWebLoginIntegrationId;
  packageVersionSource: LocalizedText;
  packageCandidates: LiveWalletConnectorPackageCandidate[];
  forbiddenOperations: LiveWalletConnectorOperation[];
  entries: LiveWalletConnectorEntry[];
  summary: LiveWalletConnectorSummary;
  boundary: LocalizedText;
  nextAction: LocalizedText;
}

export interface AdapterWalletInfoCandidate {
  adapterName: string;
  walletName?: string;
  address?: string;
  chainId?: "AELF" | "tDVV" | "tDVW" | string;
  network?: WalletNetwork;
  accountTypeHint?: AccountType;
  walletSourceHint?: WalletSource;
  signaturePresent?: boolean;
  extraInfoKeys?: string[];
  internalAgent?: boolean;
}

export interface NormalizedWalletSessionCandidate {
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
  verificationStatus: WalletVerificationStatus;
  signatureStatus: WalletSignatureStatus;
  walletTypeVerified: boolean;
  errorReason?: string;
  statusMessage: LocalizedText;
  nextAction: LocalizedText;
  boundary: LocalizedText;
}

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

export interface WalletProviderQaScenario {
  id: WalletProviderQaScenarioId;
  label: LocalizedText;
  seededStatus: WalletProviderQaSeededStatus;
  liveEvidenceStatus: WalletProviderQaLiveEvidenceStatus;
  releaseImpact: WalletProviderQaReleaseImpact;
  evidence: LocalizedText;
  nextAction: LocalizedText;
  matchedSessionIds: string[];
}

export interface WalletProviderQaSummary {
  totalScenarios: number;
  seededReadyScenarios: number;
  liveEvidenceReadyScenarios: number;
  missingLiveEvidenceScenarios: number;
  releaseBlockers: number;
}

export interface WalletProviderQaReadinessGate {
  boundary: LocalizedText;
  summary: WalletProviderQaSummary;
  scenarios: WalletProviderQaScenario[];
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

export interface CampaignRouteContext {
  path: string;
  campaignId: string;
  urlLocale: SupportedLocale | null;
  localeSource: "url" | "fallback";
  matched: boolean;
  unsupportedLocale: string | null;
  canonicalPath: string;
}

export type CampaignMetadataFieldKind = "document-title" | "meta-name" | "meta-property";

export interface CampaignMetadataField {
  name: string;
  content: string;
  kind: CampaignMetadataFieldKind;
}

export interface CampaignShareCardReadiness {
  campaignId: string;
  locale: SupportedLocale;
  canonicalUrl: string;
  alternateUrls: Record<SupportedLocale, string>;
  title: string;
  description: string;
  image: string;
  fallbackToEnglish: boolean;
  contentStatus: ContentRevisionStatus;
  readiness: PublishState;
  fallbackNotice: LocalizedText;
  metadataFields: CampaignMetadataField[];
}

export type LocaleAnalyticsMetric =
  | "campaign_views"
  | "wallet_connect_conversion"
  | "task_completion"
  | "referral_conversion"
  | "translation_fallback_rate"
  | "ai_draft_accepted_rate"
  | "manual_edit_time";

export interface LocaleAnalyticsReadinessRow {
  id: string;
  locale: SupportedLocale;
  metric: LocaleAnalyticsMetric;
  label: LocalizedText;
  value: string;
  readiness: PublishState;
  boundary: LocalizedText;
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
  sourceLocale: "en-US";
  disclaimer: string;
  reviewed: boolean;
  fallbackToEnglish: boolean;
  reviewState: "reviewed" | "ai_draft" | "fallback" | "missing";
  blocksPublish: boolean;
  blockerReason: LocalizedText;
  nextAction: LocalizedText;
  boundary: LocalizedText;
  ownerRole: OwnerRole;
  publishState: PublishState;
}

export type TranslationLocaleRole = "source" | "translation";
export type TranslationCompareField = "title" | "description" | "socialPost" | "rewardDisclaimer";

export interface TranslationLocaleItem {
  locale: SupportedLocale;
  label: LocalizedText;
  role: TranslationLocaleRole;
  isDefault: boolean;
  isFallback: boolean;
  status: ContentRevisionStatus;
  publishState: PublishState;
  fallbackToEnglish: boolean;
  humanReviewed: boolean;
}

export interface TranslationComparisonRow {
  id: TranslationCompareField;
  label: LocalizedText;
  sourceLocale: "en-US";
  targetLocale: SupportedLocale;
  sourceValue: string;
  targetValue: string;
  targetStatus: ContentRevisionStatus;
  targetPublishState: PublishState;
  fallbackToEnglish: boolean;
  humanReviewed: boolean;
  reviewNote: LocalizedText;
}

export interface TranslationManagerReadModel {
  campaignId: string;
  defaultLocale: "en-US";
  fallbackLocale: "en-US";
  supportedLocales: SupportedLocale[];
  sourceLocale: "en-US";
  panels: TranslationReviewPanel[];
  localeItems: TranslationLocaleItem[];
  comparisonRows: TranslationComparisonRow[];
  rewardDisclaimers: RewardDisclaimerReviewRow[];
  compareReviewPrompt: LocalizedText;
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

export type ContractInterfaceReadiness = "ready" | "warning" | "blocker" | "info";
export type ContractInterfacePhase = "MVP" | "P1" | "P2" | "N/A";
export type DeliveryChecklistStatus = "covered" | "needs_review" | "blocked" | "deferred";
export type DeliveryChecklistGroupId = "product" | "architecture" | "ui" | "contract" | "qa";
export type P1LocaleCode = "ko-KR" | "ja-JP" | "vi-VN" | "id-ID" | "tr-TR" | "es-ES";
export type P1LocaleExpansionReadinessStatus = "deferred";

export interface ContractInterfaceMethod {
  name: string;
  signature: string;
  purpose: LocalizedText;
  ownerRole: OwnerRole;
  readiness: ContractInterfaceReadiness;
  phase: ContractInterfacePhase;
  boundary: LocalizedText;
  nextAction: LocalizedText;
}

export interface ContractInterfaceGroup {
  contractName: string;
  phase: ContractInterfacePhase;
  readiness: ContractInterfaceReadiness;
  purpose: LocalizedText;
  ownerRole: OwnerRole;
  boundary: LocalizedText;
  nextAction: LocalizedText;
  methods: ContractInterfaceMethod[];
}

export interface ContractChangeMatrixRow {
  area: LocalizedText;
  currentMvp: LocalizedText;
  recommendedV2: LocalizedText;
  priority: ContractInterfacePhase;
  ownerRole: OwnerRole;
  readiness: ContractInterfaceReadiness;
  notes: LocalizedText;
  nextAction: LocalizedText;
  boundary: LocalizedText;
}

export interface ContractInterfaceMatrixSummary {
  totalContracts: number;
  totalMethods: number;
  p1Rows: number;
  blockedRows: number;
  warningMethods: number;
  boundary: LocalizedText;
}

export interface ContractInterfaceMatrixConsole {
  summary: ContractInterfaceMatrixSummary;
  groups: ContractInterfaceGroup[];
  changeMatrix: ContractChangeMatrixRow[];
}

export interface DeliveryChecklistItem {
  id: string;
  groupId: DeliveryChecklistGroupId;
  label: LocalizedText;
  status: DeliveryChecklistStatus;
  ownerRole: OwnerRole;
  surface: LocalizedText;
  evidence: LocalizedText;
  nextAction: LocalizedText;
  sourceRequirement: string;
  blocksDelivery: boolean;
}

export interface DeliveryChecklistCounts {
  covered: number;
  needsReview: number;
  blocked: number;
  deferred: number;
}

export interface DeliveryChecklistGroup {
  id: DeliveryChecklistGroupId;
  title: LocalizedText;
  sourceReference: string;
  summary: LocalizedText;
  counts: DeliveryChecklistCounts;
  items: DeliveryChecklistItem[];
}

export interface DeliveryChecklistReadinessSummary {
  totalItems: number;
  coveredItems: number;
  needsReviewItems: number;
  blockedItems: number;
  deferredItems: number;
  groupCount: number;
  nextAction: LocalizedText;
}

export interface P1LocaleExpansionReadinessRow {
  code: P1LocaleCode;
  displayName: LocalizedText;
  status: P1LocaleExpansionReadinessStatus;
  ownerRole: OwnerRole;
  reason: LocalizedText;
  prerequisites: LocalizedText[];
  nextAction: LocalizedText;
  runtimeSupported: false;
}

export interface P1LocaleExpansionReadinessSummary {
  title: LocalizedText;
  subtitle: LocalizedText;
  totalLocales: number;
  deferredLocales: number;
  runtimeSupportedLocales: number;
  boundary: LocalizedText;
  nextAction: LocalizedText;
}

export interface P1LocaleExpansionReadiness {
  summary: P1LocaleExpansionReadinessSummary;
  rows: P1LocaleExpansionReadinessRow[];
}

export interface DeliveryChecklistReadinessConsole {
  summary: DeliveryChecklistReadinessSummary;
  boundary: LocalizedText;
  p1LocaleExpansion: P1LocaleExpansionReadiness;
  groups: DeliveryChecklistGroup[];
  blockers: DeliveryChecklistItem[];
  needsReview: DeliveryChecklistItem[];
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

export interface UserWinnersExportRow {
  rowStatus: ExportRowStatus;
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
  missingColumnValues: ExportCsvColumn[];
}

export interface UserWinnersExportStatusReadModel {
  campaignId: string;
  walletAddress: string;
  participantId?: string;
  status: UserWinnersExportStatus;
  statusLabel: LocalizedText;
  summary: LocalizedText;
  reason: LocalizedText;
  nextAction: LocalizedText;
  rewardBoundary: LocalizedText;
  fulfillmentOwner: LocalizedText;
  exportBatchId?: string;
  row?: UserWinnersExportRow;
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

export type CampaignCommandPriority = "primary" | "secondary" | "watch";

export interface CampaignCommandItem {
  id: string;
  projectName: string;
  title: LocalizedText;
  status: CampaignStatus;
  priority: CampaignCommandPriority;
  timeWindow: LocalizedText;
  walletSplitLabel: LocalizedText;
  localeState: LocalizedText;
  riskState: PublishState;
  riskReason: LocalizedText;
  exportState: PublishState;
  exportSummary: LocalizedText;
  nextActionLabel: LocalizedText;
  nextActionDetail: LocalizedText;
  boundary: LocalizedText;
}

export interface CampaignCommandCenterSummary {
  totalCampaigns: number;
  liveCount: number;
  scheduledOrDraftCount: number;
  endedCount: number;
  exportedCount: number;
  warningCount: number;
  blockerCount: number;
  exportReadyRows: number;
  nextPrimaryAction: LocalizedText;
}

export type CampaignLifecycleOperationState =
  | "allowed"
  | "blocked"
  | "review_required"
  | "not_applicable";
export type CampaignLifecycleCheckState =
  | "passed"
  | "warning"
  | "blocked"
  | "not_applicable";
export type CampaignLifecycleGateGroupId =
  | "campaign-basics"
  | "time-window"
  | "task-verification"
  | "reward-eligibility"
  | "risk-i18n-contract"
  | "internal-provider-review"
  | "pause-resume"
  | "end"
  | "export"
  | "archive"
  | "safety-boundary";
export type CampaignLifecycleAffectedOutcome =
  | "launch"
  | "schedule"
  | "pause"
  | "resume"
  | "end"
  | "export"
  | "archive"
  | "reward_boundary"
  | "contract_boundary";
export type CampaignLifecycleCheckSource =
  | "publish_readiness"
  | "provider_evidence"
  | "export_confirmation"
  | "contract_review"
  | "local_boundary";
export type CampaignLifecycleOwnerRole =
  | OwnerRole
  | "risk_reviewer"
  | "export_reviewer";

export interface CampaignLifecycleBlockingCheck {
  id: string;
  label: LocalizedText;
  state: CampaignLifecycleCheckState;
  source: CampaignLifecycleCheckSource;
  reason: LocalizedText;
  nextAction: LocalizedText;
}

export interface CampaignLifecycleGateGroup {
  id: CampaignLifecycleGateGroupId;
  label: LocalizedText;
  state: CampaignLifecycleCheckState;
  checks: CampaignLifecycleBlockingCheck[];
}

export interface CampaignLifecycleOperation {
  id: string;
  label: LocalizedText;
  fromStatus: CampaignLifecycleStatus;
  targetStatus: CampaignLifecycleStatus;
  operationState: CampaignLifecycleOperationState;
  ownerRole: CampaignLifecycleOwnerRole;
  reason: LocalizedText;
  gateGroup: CampaignLifecycleGateGroupId;
  blockingChecks: CampaignLifecycleBlockingCheck[];
  affectedOutcome: CampaignLifecycleAffectedOutcome;
  nextAction: LocalizedText;
  requiresReview: boolean;
  localOnly: true;
}

export interface CampaignLifecycleOperationSummary {
  totalOperations: number;
  allowedCount: number;
  blockedCount: number;
  reviewRequiredCount: number;
  notApplicableCount: number;
  launchBlockingCount: number;
  exportSensitiveCount: number;
  topOperationId: string;
}

export interface CampaignLifecycleOperations {
  campaignId: string;
  currentStatus: CampaignStatus;
  supportedStatuses: CampaignLifecycleStatus[];
  summary: CampaignLifecycleOperationSummary;
  operations: CampaignLifecycleOperation[];
  launchGateGroups: CampaignLifecycleGateGroup[];
  boundary: LocalizedText;
  nextAction: LocalizedText;
}

export interface AnalyticsExportDecision {
  kpis: AnalyticsKpi[];
  funnel: ConversionFunnelStep[];
  walletSplit: DimensionSplit[];
  localeSplit: DimensionSplit[];
  dropOffPoint: LocalizedText;
  exportBatchId: string;
  exportColumns: readonly ExportCsvColumn[];
  readyRows: number;
  reviewRequiredRows: number;
  blockedRows: number;
  evidenceCoverage: LocalizedText;
  boundary: LocalizedText;
}

export type AdvancedAnalyticsReadinessState =
  | "ready"
  | "review_required"
  | "blocked"
  | "local_only";
export type AdvancedAnalyticsRetentionWindowId = "day7" | "day30";
export type AdvancedAnalyticsPremiumReportId =
  | "cohort_report"
  | "retention_report"
  | "real_user_quality"
  | "conversion_report"
  | "risk_report";

export interface AdvancedAnalyticsSummary {
  totalCohorts: number;
  readyCohorts: number;
  reviewRequiredCohorts: number;
  day7RetentionRate: number;
  day30RetentionRate: number;
  averageRealUserScore: number;
  costPerVerifiedAction: string;
  productConversionCoverage: number;
  premiumReadyReports: number;
  nextAction: LocalizedText;
}

export interface AdvancedAnalyticsCohortSegment {
  id: string;
  label: LocalizedText;
  audienceSummary: LocalizedText;
  walletMix: LocalizedText;
  participantCount: number;
  qualityState: AdvancedAnalyticsReadinessState;
  retentionSignal: LocalizedText;
  conversionSignal: LocalizedText;
  riskReviewState: LocalizedText;
  nextAction: LocalizedText;
  boundary: LocalizedText;
}

export interface AdvancedAnalyticsRetentionWindow {
  id: AdvancedAnalyticsRetentionWindowId;
  label: LocalizedText;
  rate: number;
  repeatActionCount: number;
  sampleBasis: LocalizedText;
  qualityNote: LocalizedText;
  evidenceGap: LocalizedText;
}

export interface AdvancedAnalyticsQualitySignal {
  score: number;
  state: AdvancedAnalyticsReadinessState;
  label: LocalizedText;
  explanation: LocalizedText;
  boundary: LocalizedText;
  nextAction: LocalizedText;
}

export interface AdvancedAnalyticsCostEfficiency {
  rewardBudget: string;
  verifiedActionCount: number;
  costPerVerifiedAction: string;
  qualityNote: LocalizedText;
  boundary: LocalizedText;
}

export interface AdvancedAnalyticsProductConversion {
  id: string;
  productName: LocalizedText;
  actionFamily: LocalizedText;
  convertedCount: number;
  conversionRate: number;
  readiness: AdvancedAnalyticsReadinessState;
  evidenceGap: LocalizedText;
  nextAction: LocalizedText;
}

export interface AdvancedAnalyticsPremiumReport {
  id: AdvancedAnalyticsPremiumReportId;
  label: LocalizedText;
  readiness: AdvancedAnalyticsReadinessState;
  coverage: LocalizedText;
  gap: LocalizedText;
  ownerRole: LocalizedText;
  nextAction: LocalizedText;
}

export interface AdvancedAnalyticsReadinessSurface {
  campaignId: string;
  summary: AdvancedAnalyticsSummary;
  cohorts: AdvancedAnalyticsCohortSegment[];
  retentionWindows: AdvancedAnalyticsRetentionWindow[];
  realUserQuality: AdvancedAnalyticsQualitySignal;
  costEfficiency: AdvancedAnalyticsCostEfficiency;
  productConversions: AdvancedAnalyticsProductConversion[];
  premiumReports: AdvancedAnalyticsPremiumReport[];
  boundary: LocalizedText;
}

export interface ProjectCampaignCommandCenter {
  summary: CampaignCommandCenterSummary;
  campaigns: CampaignCommandItem[];
  analyticsExport: AnalyticsExportDecision;
  advancedAnalytics: AdvancedAnalyticsReadinessSurface;
  aiOptimization: AiOptimizationWorkflow;
  aelfWebLoginAdapterReadiness: AelfWebLoginAdapterReadinessModel;
  providerEvidenceRegistry: ProviderEvidenceRegistry;
  lifecycleOperations: CampaignLifecycleOperations;
  launchConsoleCampaignBundles: LaunchConsoleCampaignBundleSurface;
  boundary: LocalizedText;
}

export interface RiskSignal {
  id: string;
  label: LocalizedText;
  value: string;
  severity: SignalSeverity;
  evidence: LocalizedText;
  nextAction: LocalizedText;
}

export type RiskIntelligenceCategory =
  | "wallet_age"
  | "funding_cluster"
  | "invite_tree"
  | "device_session"
  | "task_pattern"
  | "meaningful_action"
  | "manual_review_queue";
export type RiskIntelligenceReviewState =
  | "clear"
  | "monitor"
  | "review_required"
  | "blocked";
export type RiskIntelligenceOwnerRole =
  | "internal_operator"
  | "risk_reviewer"
  | "project_owner"
  | "growth_lead";

export interface RiskMeaningfulActionCoverage {
  requiredActionCount: number;
  completedActionCount: number;
  coverageLabel: LocalizedText;
  qualityPolicy: LocalizedText;
  nextAction: LocalizedText;
}

export interface RiskIntelligenceDimension {
  id: string;
  category: RiskIntelligenceCategory;
  label: LocalizedText;
  severity: SignalSeverity;
  reviewState: RiskIntelligenceReviewState;
  affectedCohort: LocalizedText;
  evidenceCoverage: LocalizedText;
  sourceSignal: LocalizedText;
  exportImpact: LocalizedText;
  ownerRole: RiskIntelligenceOwnerRole;
  rationale: LocalizedText;
  nextAction: LocalizedText;
  boundary: LocalizedText;
}

export interface RiskIntelligenceSummary {
  totalDimensions: number;
  reviewRequiredCount: number;
  blockedCount: number;
  highSeverityCount: number;
  manualReviewQueueSize: number;
  meaningfulActionCoverage: string;
  exportHoldCount: number;
}

export interface RiskIntelligenceReviewSurface {
  campaignId: string;
  summary: RiskIntelligenceSummary;
  dimensions: RiskIntelligenceDimension[];
  meaningfulAction: RiskMeaningfulActionCoverage;
  boundary: LocalizedText;
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

export type AiOptimizationReportCategory =
  | "analytics_summary"
  | "user_quality"
  | "bot_pattern"
  | "winner_report"
  | "boss_report"
  | "optimization";
export type AiOptimizationActionStatus =
  | "ready_to_review"
  | "review_required"
  | "blocked"
  | "adopted_preview";
export type AiOptimizationOwnerRole =
  | "project_owner"
  | "internal_operator"
  | "risk_reviewer"
  | "content_reviewer"
  | "growth_lead";
export type AiOptimizationMetricTone = "good" | "warning" | "risk";

export interface AiOptimizationSourceMetric {
  id: string;
  label: LocalizedText;
  value: string;
  tone: AiOptimizationMetricTone;
}

export interface AiOptimizationAction {
  id: string;
  title: LocalizedText;
  status: AiOptimizationActionStatus;
  ownerRole: AiOptimizationOwnerRole;
  evidence: LocalizedText;
  sourceMetrics: AiOptimizationSourceMetric[];
  expectedImpact: LocalizedText;
  confidence: AiConfidence;
  riskLevel: Exclude<SignalSeverity, "blocked">;
  guardrail: LocalizedText;
  nextAction: LocalizedText;
  requiresHumanReview: boolean;
}

export interface AiOptimizationReportGroup {
  id: string;
  category: AiOptimizationReportCategory;
  title: LocalizedText;
  summary: LocalizedText;
  generatedAt: string;
  actions: AiOptimizationAction[];
}

export interface AiOptimizationSummary {
  totalActions: number;
  readyCount: number;
  reviewRequiredCount: number;
  blockedCount: number;
  topActionId: string;
  bossSummary: LocalizedText;
  nextAction: LocalizedText;
}

export interface ProjectOwnerAiOptimizationSummary {
  title: LocalizedText;
  summary: LocalizedText;
  recommendedAction: LocalizedText;
  nextAction: LocalizedText;
  boundary: LocalizedText;
  hiddenInternalRiskDetail: boolean;
}

export interface AiOptimizationWorkflow {
  campaignId: string;
  summary: AiOptimizationSummary;
  reports: AiOptimizationReportGroup[];
  projectOwnerSummary: ProjectOwnerAiOptimizationSummary;
  boundary: LocalizedText;
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

export interface ExportArtifactMetadata {
  columns: readonly ExportCsvColumn[];
  totalRows: number;
  readyRows: number;
  reviewRequiredRows: number;
  blockedRows: number;
  checksum: string;
  checksumAlgorithm: string;
  generatedMode: ExportArtifactGeneratedMode;
  payloadBytes: number;
}

export interface ExportArtifactSafety {
  localOnly: true;
  verifiedRecordsOnly: boolean;
  rewardDistributionOwner: "campaign_project";
  noDownloadUrl: true;
  noStorageWrite: true;
  noContractRoot: true;
  noContractTransaction: true;
  noRewardCustody: true;
  noRewardDistribution: true;
  boundary: LocalizedText;
}

export interface ExportArtifact {
  campaignId: string;
  batchId: string;
  format: ExportPreviewMode;
  fileName: string;
  mimeType: string;
  extension: ExportPreviewMode;
  payload: string;
  metadata: ExportArtifactMetadata;
  safety: ExportArtifactSafety;
}

export interface ExportPreviewModeReadiness {
  mode: ExportPreviewMode;
  label: LocalizedText;
  readiness: ExportReadinessState;
  generatesFile: false;
  downloadAvailable: false;
  includedFields: readonly ExportCsvColumn[];
  boundary: LocalizedText;
  nextAction: LocalizedText;
}

export interface ExportFieldCoverage {
  requiredFields: readonly ExportCsvColumn[];
  presentFields: readonly ExportCsvColumn[];
  missingFields: readonly ExportCsvColumn[];
  coverageReady: boolean;
}

export interface ExportRowStatusReason {
  rowStatus: ExportRowStatus;
  reasonCode: ExportRowReasonCode;
  label: LocalizedText;
  affectedRows: number;
  nextAction: LocalizedText;
}

export interface ExportAcknowledgement {
  id: ExportAcknowledgementId;
  label: LocalizedText;
  description: LocalizedText;
  required: boolean;
  acknowledged: boolean;
  ownerRole: OwnerRole;
}

export interface ExportContractRootReadiness {
  mode: ExportContractRootMode;
  label: LocalizedText;
  readiness: ExportReadinessState;
  safeDefault: boolean;
  approvalRequired: boolean;
  boundary: LocalizedText;
  nextAction: LocalizedText;
}

export interface ExportConfirmationReadinessSummary {
  totalRows: number;
  readyRows: number;
  reviewRequiredRows: number;
  blockedRows: number;
  requiredAcknowledgements: number;
  acknowledgedItems: number;
  previewModeCount: number;
}

export interface ExportConfirmationReadinessGate {
  campaignId: string;
  batchId: string;
  summary: ExportConfirmationReadinessSummary;
  previewModes: ExportPreviewModeReadiness[];
  fieldCoverage: ExportFieldCoverage;
  rowStatusCoverage: ExportRowStatusReason[];
  acknowledgements: ExportAcknowledgement[];
  contractRootReadiness: ExportContractRootReadiness[];
  boundary: LocalizedText;
  nextAction: LocalizedText;
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

export type LaunchConsoleBundleStage = "pre_launch" | "launch" | "post_launch";
export type LaunchConsoleBundleStatus =
  | "ready"
  | "review_required"
  | "blocked"
  | "local_only";
export type LaunchConsoleBundleOwnerRole =
  | "project_owner"
  | "growth_lead"
  | "internal_operator"
  | "risk_reviewer"
  | "export_reviewer";
export type LaunchConsoleTaskCategory =
  | "wallet"
  | "on_chain_api"
  | "social_manual"
  | "content_analytics";
export type LaunchConsoleGateSource =
  | "publish_readiness"
  | "lifecycle_gate"
  | "provider_evidence"
  | "risk_review"
  | "reward_disclaimer"
  | "export_readiness"
  | "ai_content_review";
export type LaunchConsoleGateState =
  | "passed"
  | "warning"
  | "blocked"
  | "review_required"
  | "local_only";
export type LaunchConsoleHandoffReviewState =
  | "ready"
  | "review_required"
  | "blocked"
  | "local_only";

export interface LaunchConsoleTaskBuildingBlock {
  id: string;
  category: LaunchConsoleTaskCategory;
  label: LocalizedText;
  description: LocalizedText;
  source: LocalizedText;
}

export interface LaunchConsoleGateEvidence {
  id: string;
  source: LaunchConsoleGateSource;
  state: LaunchConsoleGateState;
  label: LocalizedText;
  reason: LocalizedText;
  nextAction: LocalizedText;
  blocksLaunch: boolean;
}

export interface LaunchConsoleHandoffContract {
  id: ApiSkillId;
  title: LocalizedText;
  inputIntent: LocalizedText;
  outputPreview: LocalizedText;
  readiness: ApiSkillContractReadiness;
  riskLevel: ApiSkillRiskLevel;
  reviewState: LaunchConsoleHandoffReviewState;
  boundary: LocalizedText;
  nextAction: LocalizedText;
}

export interface LaunchConsoleBundleSummary {
  totalBundles: number;
  readyCount: number;
  reviewRequiredCount: number;
  blockedCount: number;
  localOnlyCount: number;
  launchBlockingCount: number;
  handoffRequiredCount: number;
}

export interface LaunchConsoleCampaignBundle {
  id: string;
  stage: LaunchConsoleBundleStage;
  title: LocalizedText;
  objective: LocalizedText;
  campaignIntent: LocalizedText;
  targetAudience: LocalizedText;
  recommendedTiming: LocalizedText;
  ownerRole: LaunchConsoleBundleOwnerRole;
  status: LaunchConsoleBundleStatus;
  tasks: LaunchConsoleTaskBuildingBlock[];
  gateEvidence: LaunchConsoleGateEvidence[];
  handoffIds: ApiSkillId[];
  nextAction: LocalizedText;
  publicBoundary: LocalizedText;
}

export interface LaunchConsoleCampaignBundleSurface {
  campaignId: string;
  summary: LaunchConsoleBundleSummary;
  bundles: LaunchConsoleCampaignBundle[];
  handoffs: LaunchConsoleHandoffContract[];
  boundary: LocalizedText;
  nextAction: LocalizedText;
}

export interface AdminOpsReadModel {
  campaignId: string;
  reviewQueue: ReviewItem[];
  deliveryChecklistReadiness: DeliveryChecklistReadinessConsole;
  walletProviderQaGate: WalletProviderQaReadinessGate;
  aelfWebLoginAdapterReadiness: AelfWebLoginAdapterReadinessModel;
  providerEvidenceRegistry: ProviderEvidenceRegistry;
  contractReviewCenter: AdminContractReviewCenter;
  contractInterfaceMatrix: ContractInterfaceMatrixConsole;
  aiContentPack: AiContentPackWorkbench;
  templateGovernance: TemplateGovernanceConsole;
  analytics: AnalyticsKpi[];
  funnel: ConversionFunnelStep[];
  walletSplit: DimensionSplit[];
  localeSplit: DimensionSplit[];
  advancedAnalytics: AdvancedAnalyticsReadinessSurface;
  riskSignals: RiskSignal[];
  riskIntelligence: RiskIntelligenceReviewSurface;
  launchConsoleCampaignBundles: LaunchConsoleCampaignBundleSurface;
  aiReports: AiOpsReportCard[];
  aiOptimization: AiOptimizationWorkflow;
  ecosystemMetrics: EcosystemMetricRow[];
  exportBatch: ExportBatchSummary;
  lifecycleOperations: CampaignLifecycleOperations;
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

export interface EligibilityCheckEntry {
  id: string;
  label: LocalizedText;
  walletAddress: string;
  accountType: AccountType;
  walletSource: WalletSource;
  localePreference: SupportedLocale;
  status: EligibilityStatus;
  score: number;
  riskFlags: string[];
  walletTypeVerified: boolean;
}

export interface EligibilityMissingTaskDetail {
  taskId: string;
  templateCode: string;
  title: LocalizedText;
  points: number;
  verificationType: VerificationType;
  walletCompatibility: WalletCompatibility;
  status: TaskVerificationStatus;
  evidenceSource?: EvidenceSource;
  nextAction: LocalizedText;
}

export interface EligibilityCheckResult {
  walletAddress: string;
  knownParticipant: boolean;
  participantId?: string;
  status: EligibilityStatus;
  score: number;
  pointsThreshold: number;
  progressPercent: number;
  completedRequiredTasks: number;
  totalRequiredTasks: number;
  walletStatus?: EligibilityWalletStatus;
  accountType: AccountType;
  walletSource: WalletSource;
  walletTypeVerified: boolean;
  missingTasks: EligibilityMissingTaskDetail[];
  riskFlags: string[];
  reason: LocalizedText;
  nextAction: LocalizedText;
  boundary: LocalizedText;
}

export interface EligibilityCheckerReadModel {
  campaignId: string;
  selectedAddress: string;
  entries: EligibilityCheckEntry[];
  result: EligibilityCheckResult;
  summary: {
    title: LocalizedText;
    description: LocalizedText;
    status: EligibilityStatus;
  };
  boundary: LocalizedText;
}

export interface VerificationEvidence {
  source: VerificationEvidenceSource;
  sourceLabel: LocalizedText;
  evidenceId: string;
  evidenceHash: string;
  live: boolean;
  capturedAt?: string;
}

export interface VerificationProviderState {
  providerId: VerificationProviderId;
  readiness: VerificationProviderReadiness;
  fallbackReason?: LocalizedText;
  nextAdapterStep: LocalizedText;
}

export interface VerificationManualReviewState {
  queued: boolean;
  reason?: LocalizedText;
  severity: ReviewSeverity;
  queueId?: string;
}

export interface VerificationResult {
  campaignId: string;
  taskId: string;
  walletAddress: string;
  accountType: AccountType;
  walletSource: WalletSource;
  status: Exclude<TaskVerificationStatus, "ready">;
  pointsAvailable: number;
  pointsAwarded: number;
  evidence: VerificationEvidence;
  provider: VerificationProviderState;
  riskFlags: string[];
  manualReview: VerificationManualReviewState;
  nextAction: LocalizedText;
  boundary: LocalizedText;
}

export interface VerificationCoverageSummary {
  totalTasks: number;
  totalTaskStates: number;
  completedCount: number;
  pendingCount: number;
  failedCount: number;
  manualReviewCount: number;
  providerReadinessCounts: Record<VerificationProviderReadiness, number>;
  evidenceSources: VerificationEvidenceSource[];
  riskFlags: string[];
  boundary: LocalizedText;
}

export type VerificationPipelinePathId =
  | "aefinder-on-chain"
  | "aelfscan-on-chain"
  | "dapp-api"
  | "social-api"
  | "wallet-session"
  | "manual-review"
  | "referral-qualification";
export type VerificationSeededCoverageStatus = "ready" | "missing";
export type VerificationLiveEvidenceStatus =
  | "ready"
  | "missing"
  | "blocked"
  | "not_applicable";
export type VerificationReleaseImpact = "blocker" | "needs_review" | "informational";
export type VerificationAffectedOutcome =
  | "points"
  | "eligibility"
  | "referral"
  | "export"
  | "release"
  | "user_next_action";
export type ReferralQualificationStatus =
  | "qualified"
  | "needs_verified_invitee"
  | "blocked"
  | "not_applicable";

export interface VerificationPipelinePath {
  id: VerificationPipelinePathId;
  label: LocalizedText;
  evidenceSource: VerificationEvidenceSource;
  seededCoverageStatus: VerificationSeededCoverageStatus;
  liveEvidenceStatus: VerificationLiveEvidenceStatus;
  providerReadiness: VerificationProviderReadiness;
  releaseImpact: VerificationReleaseImpact;
  affectedOutcomes: VerificationAffectedOutcome[];
  eligibilityImpact: LocalizedText;
  fallbackReason: LocalizedText;
  nextAction: LocalizedText;
  owner: OwnerRole;
  boundary: LocalizedText;
}

export interface VerificationPipelineSummary {
  totalPaths: number;
  seededReadyPaths: number;
  liveEvidenceReadyPaths: number;
  missingLiveEvidencePaths: number;
  blockedPaths: number;
  manualReviewPaths: number;
}

export interface VerificationTaskOutcomeCoverage {
  completedCount: number;
  pendingCount: number;
  failedCount: number;
  manualReviewCount: number;
}

export interface VerificationPipelineEligibilityImpact {
  missingRequiredTasks: string[];
  referralQualificationStatus: ReferralQualificationStatus;
  riskFlags: string[];
  summary: LocalizedText;
}

export interface VerificationPipelineReadinessGate {
  summary: VerificationPipelineSummary;
  taskOutcomeCoverage: VerificationTaskOutcomeCoverage;
  eligibilityImpact: VerificationPipelineEligibilityImpact;
  paths: VerificationPipelinePath[];
  boundary: LocalizedText;
  nextAction: LocalizedText;
}

export type ProviderEvidenceCategory =
  | "verification"
  | "wallet"
  | "analytics_export"
  | "ai_content"
  | "manual_review"
  | "contract_export";
export type ProviderSeededCoverageStatus = "ready" | "missing" | "not_applicable";
export type ProviderLiveEvidenceStatus = VerificationLiveEvidenceStatus;
export type ProviderFeatureGateState = "disabled" | "planned" | "enabled_preview";
export type ProviderFallbackMode =
  | "local_seeded"
  | "manual_review"
  | "blocked"
  | "unavailable"
  | "not_applicable";
export type ProviderAffectedOutcome =
  | "points"
  | "eligibility"
  | "export"
  | "release"
  | "user_next_action"
  | "analytics"
  | "content"
  | "contract";

export interface ProviderFeatureGateIntent {
  state: ProviderFeatureGateState;
  configKey: string;
  degradesGracefully: boolean;
  operatorMessage: LocalizedText;
}

export interface ProviderFallbackSemantics {
  mode: ProviderFallbackMode;
  label: LocalizedText;
  description: LocalizedText;
  blocksLaunch: boolean;
}

export interface ProviderEvidenceRegistryEntry {
  id: string;
  category: ProviderEvidenceCategory;
  providerId: string;
  label: LocalizedText;
  seededCoverageStatus: ProviderSeededCoverageStatus;
  liveEvidenceStatus: ProviderLiveEvidenceStatus;
  adapterReadiness: VerificationProviderReadiness;
  featureGate: ProviderFeatureGateIntent;
  fallback: ProviderFallbackSemantics;
  ownerRole: OwnerRole;
  affectedOutcomes: ProviderAffectedOutcome[];
  evidenceRequired: LocalizedText;
  nextAction: LocalizedText;
  boundary: LocalizedText;
}

export interface ProviderAdapterReadinessContract {
  adapterId: string;
  providerId: string;
  category: ProviderEvidenceCategory;
  expectedEvidence: LocalizedText;
  featureGate: ProviderFeatureGateIntent;
  acceptancePrerequisites: LocalizedText[];
  fallback: ProviderFallbackSemantics;
  readyForProduction: boolean;
}

export interface ProviderEvidenceRegistrySummary {
  totalEntries: number;
  seededReadyEntries: number;
  liveEvidenceReadyEntries: number;
  missingLiveEvidenceEntries: number;
  localOnlyEntries: number;
  reviewRequiredEntries: number;
  unavailableEntries: number;
  blockedEntries: number;
  notApplicableEntries: number;
  launchBlockers: number;
}

export interface ProviderEvidenceRegistry {
  campaignId: string;
  summary: ProviderEvidenceRegistrySummary;
  entries: ProviderEvidenceRegistryEntry[];
  adapterContracts: ProviderAdapterReadinessContract[];
  boundary: LocalizedText;
  nextAction: LocalizedText;
}

export interface TaskVerificationState {
  taskId: string;
  templateCode: string;
  status: TaskVerificationStatus;
  evidenceSource: EvidenceSource;
  canonicalEvidenceSource: VerificationEvidenceSource;
  evidence: VerificationEvidence;
  provider: VerificationProviderState;
  manualReview: VerificationManualReviewState;
  riskFlags: string[];
  pointsAwarded: number;
  pointsAvailable: number;
  completed: boolean;
  missingRequired: boolean;
  walletCompatibility: WalletCompatibility;
  nextAction: LocalizedText;
}

export type ParticipantTaskState = TaskVerificationState;

export interface TaskVerificationAction {
  taskId: string;
  kind: TaskVerificationActionKind;
  enabled: boolean;
  requiresWalletProvenance: boolean;
  proofRequired: boolean;
  status: TaskVerificationStatus;
  providerReadiness: VerificationProviderReadiness;
  canonicalEvidenceSource: VerificationEvidenceSource;
  label: LocalizedText;
  nextAction: LocalizedText;
  boundary: LocalizedText;
}

export interface TaskVerificationActionProof {
  proofType: TaskVerificationProofType;
  localOnly: true;
  uploadExecuted: false;
}

export interface TaskVerificationActionRequest {
  taskId: string;
  kind: TaskVerificationActionKind;
  proofType?: TaskVerificationProofType;
}

export interface TaskVerificationActionResult {
  taskId: string;
  kind: TaskVerificationActionKind;
  status: Exclude<TaskVerificationStatus, "ready">;
  attemptLabel: string;
  evidence: VerificationEvidence;
  provider: VerificationProviderState;
  manualReview: VerificationManualReviewState;
  pointsAwarded: number;
  pointsAvailable: number;
  riskFlags: string[];
  proof?: TaskVerificationActionProof;
  nextAction: LocalizedText;
  boundary: LocalizedText;
}

export interface ReferralSummary {
  inviteLink: string;
  invitedCount: number;
  qualifiedInvitees: number;
  referralPoints: number;
  antiFarmRule: LocalizedText;
  riskFlags: string[];
}

export type ReferralRiskTier = "low_risk" | "needs_review";

export interface ReferralWalletRiskMetric {
  id: string;
  label: string;
  walletType: AccountType;
  riskTier: ReferralRiskTier;
  participantCount: number;
  invitedCount: number;
  qualifiedInvitees: number;
  conversionRate: number;
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

export type LeaderboardModeId =
  | "total_points"
  | "on_chain"
  | "referral"
  | "low_risk_verified";

export interface LeaderboardMode {
  id: LeaderboardModeId;
  label: LocalizedText;
  description: LocalizedText;
  qualityPolicy: LocalizedText;
}

export interface LeaderboardModeRow {
  rank: number;
  walletAddress: string;
  accountType: AccountType;
  walletSource: WalletSource;
  totalPoints: number;
  verifiedActionCount: number;
  onChainActionCount: number;
  referralPoints: number;
  qualifiedInvitees: number;
  eligible: boolean;
  riskFlags: string[];
  riskLevel: RiskLevel;
  modeScore: number;
  localePreference: SupportedLocale;
}

export interface LeaderboardReadModel {
  campaignId: string;
  selectedMode: LeaderboardModeId;
  modes: LeaderboardMode[];
  rows: LeaderboardModeRow[];
  summary: LocalizedText;
  qualityPolicy: LocalizedText;
  boundary: LocalizedText;
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
