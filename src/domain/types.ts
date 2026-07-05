export const supportedLocales = ["en-US", "zh-CN", "zh-TW", "ja-JP", "ko-KR", "vi-VN", "id-ID", "tr-TR", "es-ES"] as const;

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
  | "extension_not_installed"
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
  "ai_draft",
  "human_review",
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
export type I18nReviewActionId =
  | "generate_with_ai"
  | "compare_with_english"
  | "mark_reviewed"
  | "publish_revision"
  | "use_english_fallback";
export type I18nReviewActionState = "available" | "blocked" | "completed";
export type I18nReviewActionErrorCode =
  | "UNSUPPORTED_LOCALE"
  | "UNSUPPORTED_ACTION"
  | "ACTION_BLOCKED";
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
  | "list_campaigns"
  | "get_campaign_detail"
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
  | "campaign_discovery"
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
export type AgentWalletActionIntent =
  | "balance_query"
  | "contract_view_review"
  | "batch_data_check"
  | "qa_smoke_test"
  | "private_key_handling"
  | "user_delegated_signing"
  | "transfer"
  | "contract_send"
  | "reward_distribution"
  | "export_generation"
  | "root_write";
export type AgentWalletActionReadinessState = "review_required" | "blocked";
export type AgentWalletActionAllowedOperation = "readiness_review_only" | "blocked_no_execution";
export type AgentWalletActionHumanApprovalState =
  | "not_requested"
  | "pending_review"
  | "approved"
  | "rejected";
export interface AgentWalletActionReadinessRequest {
  actionIntent: AgentWalletActionIntent | (string & {});
  agentId: string;
  campaignId: string;
  chainId: string;
  evidencePurpose: string;
  humanApprovalState?: AgentWalletActionHumanApprovalState;
  network: WalletNetwork;
  operatorRole: OwnerRole;
  taskId: string;
  walletSource: WalletSource;
}
export interface AgentWalletActionAuditTrail {
  actionIntent: AgentWalletActionIntent;
  agentId: string;
  campaignId: string;
  chainId: string;
  evidencePurpose: string;
  executionAttempted: false;
  humanApprovalState: Exclude<AgentWalletActionHumanApprovalState, "not_requested">;
  network: Exclude<WalletNetwork, "unknown">;
  operatorRole: OwnerRole;
  sensitiveMaterialHandled: false;
  taskId: string;
  walletSource: "AGENT_SKILL";
}
export interface AgentWalletActionReadinessResponse {
  actionIntent: AgentWalletActionIntent;
  actionState: AgentWalletActionReadinessState;
  allowedOperation: AgentWalletActionAllowedOperation;
  auditTrail: AgentWalletActionAuditTrail;
  blockedReason: LocalizedText;
  campaignId: string;
  nextReviewAction: LocalizedText;
  noContractWrite: true;
  noExportFile: true;
  noPrivateKeyBoundary: true;
  noRewardDistribution: true;
  noSignatureExecution: true;
  noTransactionExecution: true;
  taskId: string;
  walletSource: "AGENT_SKILL";
}
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
export type DaippAgentCoinTaskIntentId =
  | "daipp-agent-page-visit-readiness"
  | "daipp-agent-interaction-evidence"
  | "daipp-agent-coin-buy-hold-review"
  | "daipp-ai-intro-share-review"
  | "daipp-launch-leaderboard-review";
export type DaippAgentCoinTaskProviderState =
  | "not_connected"
  | "seeded_preview"
  | "review_required"
  | "blocked";
export type DaippAgentCoinTaskReadinessState =
  | "ready"
  | "review_required"
  | "blocked";
export type DaippAgentCoinTaskOwnerRole =
  | "project_owner"
  | "operator"
  | "content_reviewer"
  | "daipp_provider_reviewer";
export type DaippAgentCoinTaskEvidenceSource =
  | "seeded_local"
  | "daipp_api"
  | "daipp_contract_event"
  | "agent_interaction_log"
  | "ai_intro_share_review"
  | "launch_leaderboard";
export type ForestNftTaskIntentId =
  | "forest-nft-mint-readiness"
  | "forest-nft-holder-evidence"
  | "forest-nft-trade-listing-review"
  | "forest-holder-leaderboard-review";
export type ForestNftTaskProviderState =
  | "not_connected"
  | "seeded_preview"
  | "review_required"
  | "blocked";
export type ForestNftTaskReadinessState =
  | "ready"
  | "review_required"
  | "blocked";
export type ForestNftTaskOwnerRole =
  | "project_owner"
  | "operator"
  | "forest_provider_reviewer";
export type ForestNftTaskEvidenceSource =
  | "forest_nft_contract_event"
  | "forest_marketplace_event"
  | "holder_snapshot"
  | "seeded_local";
export type SchrodingerNftTaskIntentId =
  | "schrodinger-nft-adopt-readiness"
  | "schrodinger-nft-holder-evidence"
  | "schrodinger-nft-trade-listing-review"
  | "schrodinger-holder-leaderboard-review";
export type SchrodingerNftTaskProviderState =
  | "not_connected"
  | "seeded_preview"
  | "review_required"
  | "blocked";
export type SchrodingerNftTaskReadinessState =
  | "ready"
  | "review_required"
  | "blocked";
export type SchrodingerNftTaskOwnerRole =
  | "project_owner"
  | "operator"
  | "schrodinger_provider_reviewer";
export type SchrodingerNftTaskEvidenceSource =
  | "holder_leaderboard"
  | "holder_snapshot"
  | "project_api"
  | "schrodinger_nft_contract_event"
  | "schrodinger_trade_listing_event"
  | "seeded_local";
export type EbridgeTaskIntentId =
  | "bridge-intent-readiness"
  | "bridge-amount-threshold-review"
  | "bridge-on-chain-evidence"
  | "bridge-awaken-unlock-dependency"
  | "bridge-eligibility-impact";
export type EbridgeTaskProviderState =
  | "not_connected"
  | "seeded_preview"
  | "review_required"
  | "blocked";
export type EbridgeTaskReadinessState =
  | "ready"
  | "review_required"
  | "blocked";
export type EbridgeTaskOwnerRole =
  | "project_owner"
  | "operator"
  | "bridge_provider_reviewer"
  | "risk_reviewer";
export type EbridgeTaskEvidenceSource =
  | "seeded_local"
  | "ebridge_api"
  | "aefinder_on_chain"
  | "aelfscan_transaction"
  | "awaken_unlock_rule"
  | "eligibility_engine";
export type AwakenSwapLiquidityTaskIntentId =
  | "awaken-swap-readiness"
  | "awaken-liquidity-add-review"
  | "awaken-lp-hold-evidence"
  | "awaken-bridge-unlock-dependency"
  | "awaken-ranking-eligibility-impact";
export type AwakenSwapLiquidityTaskProviderState =
  | "not_connected"
  | "seeded_preview"
  | "review_required"
  | "blocked";
export type AwakenSwapLiquidityTaskReadinessState =
  | "ready"
  | "review_required"
  | "blocked";
export type AwakenSwapLiquidityTaskOwnerRole =
  | "project_owner"
  | "operator"
  | "awaken_provider_reviewer"
  | "risk_reviewer";
export type AwakenSwapLiquidityTaskEvidenceSource =
  | "seeded_local"
  | "awaken_api"
  | "awaken_swap_event"
  | "awaken_liquidity_event"
  | "lp_position_snapshot"
  | "bridge_unlock_rule"
  | "ranking_engine";
export type ForecastCampaignTaskIntentId =
  | "prediction-participation"
  | "win-streak"
  | "forecast-leaderboard";
export type ForecastCampaignTaskProviderState =
  | "not_connected"
  | "seeded_preview"
  | "review_required"
  | "ready";
export type ForecastCampaignTaskReadinessState =
  | "ready"
  | "review_required"
  | "blocked";
export type ForecastCampaignTaskOwnerRole =
  | "project_owner"
  | "operator"
  | "forecast_provider_reviewer";
export type ForecastCampaignTaskEvidenceSource =
  | "forecast_app_data"
  | "seeded_local";
export type PayCampaignTaskIntentId =
  | "invoice-completion"
  | "payment-link-completion"
  | "pay-follow-up-handoff";
export type PayCampaignTaskProviderState =
  | "not_connected"
  | "seeded_preview"
  | "review_required"
  | "blocked";
export type PayCampaignTaskReadinessState =
  | "ready"
  | "review_required"
  | "blocked";
export type PayCampaignTaskOwnerRole =
  | "project_owner"
  | "operator"
  | "pay_provider_reviewer";
export type PayCampaignTaskEvidenceSource =
  | "aelf_pay_status"
  | "seeded_local";
export type TmrwdaoGovernanceTaskIntentId =
  | "dao-join-readiness"
  | "proposal-summary-review"
  | "proposal-vote-evidence"
  | "governance-result-review";
export type TmrwdaoGovernanceTaskProviderState =
  | "not_connected"
  | "seeded_preview"
  | "review_required"
  | "blocked";
export type TmrwdaoGovernanceTaskReadinessState =
  | "ready"
  | "review_required"
  | "blocked";
export type TmrwdaoGovernanceTaskOwnerRole =
  | "project_owner"
  | "operator"
  | "dao_provider_reviewer";
export type TmrwdaoGovernanceTaskEvidenceSource =
  | "dao_contract_event"
  | "proposal_metadata"
  | "seeded_local";

export type LocaleFallbackMap<T> = Record<"en-US", T> & Partial<Record<SupportedLocale, T>>;
export type LocalizedText = LocaleFallbackMap<string>;
export type LocaleStatusMap = LocaleFallbackMap<LocaleStatus>;

export type ExternalServiceId =
  | "wallet-connector"
  | "wallet-signing"
  | "ebridge"
  | "awaken"
  | "aefinder"
  | "aelfscan"
  | "social-api"
  | "ai-provider"
  | "analytics-collector"
  | "export-storage"
  | "contract-root-writer"
  | "telegram-app-hub"
  | "pay"
  | "forecast"
  | "portfolio"
  | (string & {});
export type ExternalServiceCategory =
  | "wallet"
  | "verification"
  | "dapp"
  | "ai"
  | "analytics"
  | "export"
  | "contract"
  | "app_hub"
  | "payment"
  | "forecast"
  | "portfolio"
  | "social"
  | "unknown";
export type ExternalServiceState =
  | "enabled_preview"
  | "disabled"
  | "maintenance"
  | "review_required"
  | "offline";
export type ExternalServiceOwnerRole =
  | "integration_owner"
  | "wallet_ops"
  | "growth_ops"
  | "risk_reviewer"
  | "contract_reviewer"
  | "data_ops"
  | "product_owner";
export type ExternalServiceLiveEvidenceStatus =
  | "missing"
  | "ready"
  | "blocked"
  | "not_applicable";
export type ExternalServiceReleaseImpact =
  | "ready"
  | "needs_review"
  | "release_blocker"
  | "informational";

export interface ExternalServiceFeatureGate {
  enabled: boolean;
  key: string;
  label: LocalizedText;
  reviewRequired: boolean;
  state: ExternalServiceState;
}

export interface ExternalServiceFallback {
  blocksLaunch: boolean;
  label: LocalizedText;
  reason: LocalizedText;
}

export interface ExternalServiceRegistryEntry {
  id: ExternalServiceId;
  name: LocalizedText;
  category: ExternalServiceCategory;
  state: ExternalServiceState;
  featureGate: ExternalServiceFeatureGate;
  ownerRole: ExternalServiceOwnerRole;
  riskLevel: RiskLevel;
  highImpact: boolean;
  liveEvidenceStatus: ExternalServiceLiveEvidenceStatus;
  releaseImpact: ExternalServiceReleaseImpact;
  fallback: ExternalServiceFallback;
  userNotice: LocalizedText;
  operatorNextAction: LocalizedText;
  boundary: LocalizedText;
}

export interface ServiceRegistry {
  entries: ExternalServiceRegistryEntry[];
  entriesById: Record<string, ExternalServiceRegistryEntry>;
  unknownFallback: ExternalServiceRegistryEntry;
}

export interface ServiceDegradationGovernanceSummary {
  totalServices: number;
  enabledPreviewServices: number;
  disabledServices: number;
  maintenanceServices: number;
  reviewRequiredServices: number;
  offlineServices: number;
  releaseBlockers: number;
  highImpactBlockers: number;
  topServiceId: ExternalServiceId;
}

export interface ServiceDegradationGovernanceGroup {
  category: ExternalServiceCategory;
  label: LocalizedText;
  entries: ExternalServiceRegistryEntry[];
}

export interface ServiceDegradationGovernance {
  summary: ServiceDegradationGovernanceSummary;
  entries: ExternalServiceRegistryEntry[];
  groups: ServiceDegradationGovernanceGroup[];
  blockers: ExternalServiceRegistryEntry[];
  needsReview: ExternalServiceRegistryEntry[];
  maintenanceOrOffline: ExternalServiceRegistryEntry[];
  topOwnerAction: LocalizedText;
  boundary: LocalizedText;
}

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
  extensionAvailable?: boolean;
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
  | "extension-not-installed-error"
  | "wrong-chain-error"
  | "unsupported-wallet-error"
  | "missing-signature"
  | "account-policy-restriction";
export type WalletProviderQaScenarioId =
  | "portkey-aa-connect"
  | "eoa-extension-connect"
  | "extension-not-installed-error"
  | "wrong-chain-error"
  | "unsupported-wallet-error";
export type WalletProviderQaSeededStatus = "ready" | "missing";
export type WalletProviderQaLiveEvidenceStatus = "missing" | "ready" | "blocked" | "not_applicable";
export type WalletProviderQaReleaseImpact =
  | "release_blocker"
  | "needs_review"
  | "ready"
  | "informational";
export type WalletProviderEvidenceArtifactType =
  | "screenshot"
  | "qa_run"
  | "review_note"
  | "runbook"
  | "config_snapshot";
export type WalletProviderEvidenceStatus =
  | "missing"
  | "submitted"
  | "approved"
  | "rejected"
  | "expired"
  | "not_applicable";
export type WalletProviderEvidenceReviewState =
  | "not_started"
  | "in_review"
  | "approved"
  | "rejected"
  | "expired"
  | "not_applicable";
export type WalletProviderEvidenceReleaseImpact =
  | "ready"
  | "review_required"
  | "blocked"
  | "not_applicable";
export type WalletProviderEvidenceApprovalState =
  | "approved"
  | "review_required"
  | "blocked"
  | "not_applicable";
export type WalletProviderEvidenceApprovalRuleState =
  | "passed"
  | "needs_review"
  | "blocked"
  | "not_applicable";
export type WalletProviderEvidenceApprovalRuleId =
  | "required-artifacts"
  | "reviewer-approval"
  | "live-evidence-status"
  | "service-gate"
  | "non-live-boundary";
export type WalletProviderEvidenceReleaseState =
  | "ready"
  | "review_required"
  | "blocked"
  | "not_applicable";
export type WalletProviderEvidenceCloseoutSignoffState =
  | "ready"
  | "review_required"
  | "blocked"
  | "not_applicable";
export type WalletProviderEvidenceRequestStatus =
  | "ready"
  | "review_required"
  | "blocked"
  | "not_applicable";
export type WalletProviderEvidenceActivationState =
  | "ready"
  | "review_required"
  | "blocked";
export type WalletProviderEvidenceActivationFeatureGateState =
  | "disabled"
  | "review_required"
  | "approved"
  | "blocked";
export type WalletProviderEvidenceActivationReviewerState =
  | "pending"
  | "approved"
  | "rejected";
export type WalletProviderEvidenceActivationBlockerId =
  | "missing-artifacts"
  | "live-evidence-not-ready"
  | "feature-gate-not-approved"
  | "reviewer-approval-required"
  | "release-readiness-not-ready";
export type WalletProviderEvidenceReviewActionId =
  | "submit_evidence"
  | "approve_evidence"
  | "reject_evidence"
  | "reopen_evidence";
export type WalletProviderEvidenceReviewActionState = "available" | "blocked" | "completed";
export type WalletProviderEvidenceReviewActionErrorCode =
  | "UNSUPPORTED_ACTION"
  | "UNSUPPORTED_SCENARIO"
  | "ACTION_BLOCKED";
export type WalletProviderEvidenceRecoverySource =
  | "seeded_default"
  | "local_sample"
  | "local_storage"
  | "in_memory_action";
export type WalletProviderEvidenceRecoveryStorageState =
  | "not_requested"
  | "available"
  | "unavailable"
  | "read_failed"
  | "write_failed";
export type WalletProviderEvidenceRecoveryStatus =
  | "seeded_default"
  | "restored"
  | "fallback_invalid_snapshot";
export type WalletProviderEvidenceRecoverySnapshotVersion = 1;
export type WalletProviderEvidenceRecoveryValidationErrorCode =
  | "UNSUPPORTED_VERSION"
  | "UNKNOWN_SCENARIO"
  | "DUPLICATE_SCENARIO"
  | "MISSING_REQUIRED_SCENARIO"
  | "INVALID_STATUS"
  | "APPROVED_ARTIFACTS_INCOMPLETE";
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
  extensionAvailable?: boolean;
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

export interface WalletProviderEvidenceArtifact {
  id: string;
  label: LocalizedText;
  artifactType: WalletProviderEvidenceArtifactType;
  required: boolean;
  reference?: string;
  capturedAt?: string;
  reviewedAt?: string;
}

export interface WalletProviderEvidenceScenario {
  id: WalletProviderQaScenarioId;
  label: LocalizedText;
  provider: LocalizedText;
  expectedArtifacts: WalletProviderEvidenceArtifact[];
  submittedArtifacts: WalletProviderEvidenceArtifact[];
  evidenceStatus: WalletProviderEvidenceStatus;
  reviewState: WalletProviderEvidenceReviewState;
  releaseImpact: WalletProviderEvidenceReleaseImpact;
  reviewerRole: OwnerRole;
  serviceGate: LocalizedText;
  degradationPath: LocalizedText;
  nextAction: LocalizedText;
  boundary: LocalizedText;
}

export interface WalletProviderEvidenceSummary {
  totalScenarios: number;
  approvedScenarios: number;
  submittedScenarios: number;
  missingScenarios: number;
  rejectedScenarios: number;
  expiredScenarios: number;
  releaseBlockers: number;
  reviewRequiredScenarios: number;
  topScenarioId: WalletProviderQaScenarioId;
  topNextAction: LocalizedText;
}

export interface WalletProviderEvidenceIntake {
  summary: WalletProviderEvidenceSummary;
  scenarios: WalletProviderEvidenceScenario[];
  boundary: LocalizedText;
  nextAction: LocalizedText;
}

export interface WalletProviderArtifactCoverage {
  requiredArtifactIds: string[];
  submittedArtifactIds: string[];
  submittedArtifactReferences: string[];
  missingRequiredArtifactIds: string[];
  requiredCount: number;
  submittedRequiredCount: number;
  optionalCount: number;
  complete: boolean;
}

export interface WalletProviderEvidenceApprovalRule {
  id: WalletProviderEvidenceApprovalRuleId;
  label: LocalizedText;
  state: WalletProviderEvidenceApprovalRuleState;
  evidence: LocalizedText;
  nextAction: LocalizedText;
}

export interface WalletProviderReviewerDecision {
  state: WalletProviderEvidenceReviewState;
  label: LocalizedText;
  reason: LocalizedText;
  nextAction: LocalizedText;
}

export interface WalletProviderEvidenceApprovalScenario {
  id: WalletProviderQaScenarioId;
  label: LocalizedText;
  provider: LocalizedText;
  approvalState: WalletProviderEvidenceApprovalState;
  artifactCoverage: WalletProviderArtifactCoverage;
  rules: WalletProviderEvidenceApprovalRule[];
  failedRuleIds: WalletProviderEvidenceApprovalRuleId[];
  reviewerDecision: WalletProviderReviewerDecision;
  releaseImpact: WalletProviderEvidenceReleaseImpact;
  nextAction: LocalizedText;
  boundary: LocalizedText;
}

export interface WalletProviderEvidenceApprovalSummary {
  totalScenarios: number;
  approvedScenarios: number;
  reviewRequiredScenarios: number;
  blockedScenarios: number;
  notApplicableScenarios: number;
  completeArtifactScenarios: number;
  incompleteArtifactScenarios: number;
  releaseBlockers: number;
  topScenarioId: WalletProviderQaScenarioId;
  topFailedRuleId: WalletProviderEvidenceApprovalRuleId | null;
  topFailedRuleState: WalletProviderEvidenceApprovalRuleState | null;
  topNextAction: LocalizedText;
}

export interface WalletProviderEvidenceApprovalAudit {
  summary: WalletProviderEvidenceApprovalSummary;
  scenarios: WalletProviderEvidenceApprovalScenario[];
  boundary: LocalizedText;
  nextAction: LocalizedText;
}

export interface WalletProviderEvidenceReleaseScenario {
  id: WalletProviderQaScenarioId;
  label: LocalizedText;
  provider: LocalizedText;
  requiredForRelease: boolean;
  releaseState: WalletProviderEvidenceReleaseState;
  approvalState: WalletProviderEvidenceApprovalState;
  artifactCoverage: WalletProviderArtifactCoverage;
  failedRuleIds: WalletProviderEvidenceApprovalRuleId[];
  blockingRuleIds: WalletProviderEvidenceApprovalRuleId[];
  reviewRequiredRuleIds: WalletProviderEvidenceApprovalRuleId[];
  nextAction: LocalizedText;
  boundary: LocalizedText;
}

export interface WalletProviderEvidenceReleaseSummary {
  totalScenarios: number;
  requiredScenarios: number;
  approvedRequiredScenarios: number;
  reviewRequiredScenarios: number;
  blockedScenarios: number;
  notApplicableScenarios: number;
  releaseBlockers: number;
  ready: boolean;
  topScenarioId: WalletProviderQaScenarioId;
  topFailedRuleId: WalletProviderEvidenceApprovalRuleId | null;
  topNextAction: LocalizedText;
}

export interface WalletProviderEvidenceReleaseReadiness {
  summary: WalletProviderEvidenceReleaseSummary;
  scenarios: WalletProviderEvidenceReleaseScenario[];
  boundary: LocalizedText;
  nextAction: LocalizedText;
}

export interface WalletProviderEvidenceCloseoutScenario {
  id: WalletProviderQaScenarioId;
  label: LocalizedText;
  provider: LocalizedText;
  releaseState: WalletProviderEvidenceReleaseState;
  approvalState: WalletProviderEvidenceApprovalState;
  signoffState: WalletProviderEvidenceCloseoutSignoffState;
  requiredForRelease: boolean;
  requiredArtifactCount: number;
  submittedRequiredArtifactCount: number;
  missingRequiredArtifactIds: string[];
  attachedEvidenceReferences: string[];
  failedRuleIds: WalletProviderEvidenceApprovalRuleId[];
  blockingRuleIds: WalletProviderEvidenceApprovalRuleId[];
  reviewRequiredRuleIds: WalletProviderEvidenceApprovalRuleId[];
  nextAction: LocalizedText;
  boundary: LocalizedText;
}

export interface WalletProviderEvidenceCloseoutSummary {
  totalScenarios: number;
  requiredScenarios: number;
  approvedRequiredScenarios: number;
  readyForReviewScenarios: number;
  reviewRequiredScenarios: number;
  blockedScenarios: number;
  missingRequiredArtifacts: number;
  attachedEvidenceReferences: number;
  closeoutBlockers: number;
  ready: boolean;
  topScenarioId: WalletProviderQaScenarioId;
  topFailedRuleId: WalletProviderEvidenceApprovalRuleId | null;
  topNextAction: LocalizedText;
}

export interface WalletProviderEvidenceCloseoutPackage {
  summary: WalletProviderEvidenceCloseoutSummary;
  scenarios: WalletProviderEvidenceCloseoutScenario[];
  boundary: LocalizedText;
  nextAction: LocalizedText;
}

export interface WalletProviderEvidenceRequestScenario {
  id: WalletProviderQaScenarioId;
  label: LocalizedText;
  provider: LocalizedText;
  priority: number;
  requestStatus: WalletProviderEvidenceRequestStatus;
  requiredForRelease: boolean;
  requiredArtifactIds: string[];
  missingRequiredArtifactIds: string[];
  attachedEvidenceReferences: string[];
  acceptanceCriteria: LocalizedText;
  qaCaptureInstructions: LocalizedText;
  targetEvidencePath: string;
  ownerRole: OwnerRole;
  reviewerRole: OwnerRole;
  failedRuleIds: WalletProviderEvidenceApprovalRuleId[];
  blockingRuleIds: WalletProviderEvidenceApprovalRuleId[];
  reviewRequiredRuleIds: WalletProviderEvidenceApprovalRuleId[];
  nextAction: LocalizedText;
  boundary: LocalizedText;
}

export interface WalletProviderEvidenceRequestPacketSummary {
  totalRequests: number;
  readyRequests: number;
  reviewRequiredRequests: number;
  blockedRequests: number;
  notApplicableRequests: number;
  missingRequiredArtifacts: number;
  attachedEvidenceReferences: number;
  launchBlockingRequests: number;
  ready: boolean;
  topScenarioId: WalletProviderQaScenarioId;
  topFailedRuleId: WalletProviderEvidenceApprovalRuleId | null;
  topNextAction: LocalizedText;
}

export interface WalletProviderEvidenceRequestPacket {
  summary: WalletProviderEvidenceRequestPacketSummary;
  scenarios: WalletProviderEvidenceRequestScenario[];
  boundary: LocalizedText;
  nextAction: LocalizedText;
}

export interface WalletProviderEvidenceActivationArtifactRow {
  artifactType: WalletProviderEvidenceArtifactType;
  reference: string;
  status: WalletProviderEvidenceStatus;
}

export interface WalletProviderEvidenceActivationScenario {
  id: WalletProviderQaScenarioId;
  title: LocalizedText;
  ownerRole: OwnerRole;
  requiredArtifactTypes: WalletProviderEvidenceArtifactType[];
  submittedArtifacts: WalletProviderEvidenceActivationArtifactRow[];
  missingArtifactTypes: WalletProviderEvidenceArtifactType[];
  liveEvidenceStatus: WalletProviderQaLiveEvidenceStatus;
  featureGateState: WalletProviderEvidenceActivationFeatureGateState;
  reviewerState: WalletProviderEvidenceActivationReviewerState;
  releaseState: WalletProviderEvidenceReleaseState;
  activationState: WalletProviderEvidenceActivationState;
  blockerIds: WalletProviderEvidenceActivationBlockerId[];
  dependency: LocalizedText;
  evidenceNeeded: LocalizedText;
  boundary: LocalizedText;
  nextAction: LocalizedText;
}

export interface WalletProviderEvidenceActivationSummary {
  totalScenarios: number;
  readyScenarios: number;
  blockedScenarios: number;
  reviewRequiredScenarios: number;
  missingArtifactTypeCount: number;
  approvedFeatureGates: number;
  reviewerApprovedScenarios: number;
  topScenarioId: WalletProviderQaScenarioId;
  topBlockerId: WalletProviderEvidenceActivationBlockerId | null;
  ready: boolean;
}

export interface WalletProviderEvidenceActivation {
  summary: WalletProviderEvidenceActivationSummary;
  scenarios: WalletProviderEvidenceActivationScenario[];
  boundary: LocalizedText;
  nextAction: LocalizedText;
}

export interface WalletProviderEvidenceActivationScenarioOverride {
  liveEvidenceStatus?: WalletProviderQaLiveEvidenceStatus;
  featureGateState?: WalletProviderEvidenceActivationFeatureGateState;
  reviewerState?: WalletProviderEvidenceActivationReviewerState;
  releaseState?: WalletProviderEvidenceReleaseState;
  submittedArtifacts?: WalletProviderEvidenceActivationArtifactRow[];
  missingArtifactTypes?: WalletProviderEvidenceArtifactType[];
}

export type WalletProviderEvidenceActivationOverrides = Partial<
  Record<WalletProviderQaScenarioId, WalletProviderEvidenceActivationScenarioOverride>
>;

export interface WalletProviderEvidenceReviewAction {
  id: WalletProviderEvidenceReviewActionId;
  label: LocalizedText;
  state: WalletProviderEvidenceReviewActionState;
  scenarioId: WalletProviderQaScenarioId;
  mutatesEvidence: boolean;
  blockedReason?: LocalizedText;
  boundary: LocalizedText;
  nextAction: LocalizedText;
}

export interface WalletProviderEvidenceReviewActionAuditTrail {
  actionId: WalletProviderEvidenceReviewActionId;
  scenarioId: string;
  campaignId: string;
  reviewer: OwnerRole;
  executedAt: string;
  mutatedEvidence: boolean;
  externalProviderCalled: false;
  walletSdkExecuted: false;
  signatureRequested: false;
  fileUploaded: false;
  storageWriteExecuted: false;
  contractWriteExecuted: false;
  exportFileGenerated: false;
  rewardDistributed: false;
}

export interface WalletProviderEvidenceReviewActionError {
  code: WalletProviderEvidenceReviewActionErrorCode;
  field: "actionId" | "scenarioId";
  message: LocalizedText;
}

export interface WalletProviderEvidenceReviewArtifactReference {
  artifactType: WalletProviderEvidenceArtifactType;
  reference: string;
  label?: LocalizedText;
  capturedAt?: string;
}

export interface WalletProviderEvidenceReviewActionRequest {
  actionId: WalletProviderEvidenceReviewActionId | string;
  scenarioId: WalletProviderQaScenarioId | string;
  reviewer?: OwnerRole;
  executedAt?: string;
  artifactReferences?: WalletProviderEvidenceReviewArtifactReference[];
  replaceEvidence?: boolean;
  reason?: LocalizedText | string;
}

export interface WalletProviderEvidenceReviewActionResult {
  ok: boolean;
  campaignId: string;
  scenarioId: string;
  action: WalletProviderEvidenceReviewAction;
  actions: WalletProviderEvidenceReviewAction[];
  auditTrail: WalletProviderEvidenceReviewActionAuditTrail;
  updatedIntake: WalletProviderEvidenceIntake;
  approvalAudit: WalletProviderEvidenceApprovalAudit;
  releaseReadiness: WalletProviderEvidenceReleaseReadiness;
  closeoutPackage: WalletProviderEvidenceCloseoutPackage;
  requestPacket: WalletProviderEvidenceRequestPacket;
  deliveryAcceptance: DeliveryAcceptanceConsole;
  boundary: LocalizedText;
  nextAction: LocalizedText;
  error?: WalletProviderEvidenceReviewActionError;
}

export interface WalletProviderEvidenceRecoveryScenarioState {
  scenarioId: WalletProviderQaScenarioId | string;
  evidenceStatus: WalletProviderEvidenceStatus | string;
  artifactReferences: WalletProviderEvidenceReviewArtifactReference[];
  reviewedAt?: string;
}

export interface WalletProviderEvidenceRecoverySnapshot {
  version: WalletProviderEvidenceRecoverySnapshotVersion | number;
  capturedAt: string;
  source: WalletProviderEvidenceRecoverySource;
  scenarios: WalletProviderEvidenceRecoveryScenarioState[];
}

export interface WalletProviderEvidenceRecoveryValidationError {
  code: WalletProviderEvidenceRecoveryValidationErrorCode;
  field: string;
  scenarioId?: string;
  message: LocalizedText;
}

export interface WalletProviderEvidenceRecoveryStorageStatus {
  state: WalletProviderEvidenceRecoveryStorageState;
  storageKey?: string;
  message: LocalizedText;
}

export interface WalletProviderEvidenceRecoveryStartupRead {
  snapshot: WalletProviderEvidenceRecoverySnapshot | null;
  storageState: WalletProviderEvidenceRecoveryStorageState;
}

export interface WalletProviderEvidenceRecoveryInitialUiState extends WalletProviderEvidenceRecoveryStartupRead {
  lastRecoveredAt: string;
  source: WalletProviderEvidenceRecoverySource;
}

export interface WalletProviderEvidenceRecoveryOptions {
  source?: WalletProviderEvidenceRecoverySource;
  storageState?: WalletProviderEvidenceRecoveryStorageState;
  storageKey?: string;
  recoveredAt?: string;
}

export interface WalletProviderEvidenceRecoveryResult {
  campaignId: string;
  source: WalletProviderEvidenceRecoverySource;
  status: WalletProviderEvidenceRecoveryStatus;
  storage: WalletProviderEvidenceRecoveryStorageStatus;
  snapshot: WalletProviderEvidenceRecoverySnapshot | null;
  validationErrors: WalletProviderEvidenceRecoveryValidationError[];
  intake: WalletProviderEvidenceIntake;
  approvalAudit: WalletProviderEvidenceApprovalAudit;
  releaseReadiness: WalletProviderEvidenceReleaseReadiness;
  closeoutPackage: WalletProviderEvidenceCloseoutPackage;
  requestPacket: WalletProviderEvidenceRequestPacket;
  deliveryAcceptance: DeliveryAcceptanceConsole;
  boundary: LocalizedText;
  nextAction: LocalizedText;
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
  localeStatus: Partial<Record<SupportedLocale, LocaleStatus>> & Record<"en-US", LocaleStatus>;
}

export type CampaignDiscoveryConsumerSurface =
  | "user_app"
  | "app_hub"
  | "portfolio"
  | "forecast";

export type CampaignDiscoveryCtaKind =
  | "start"
  | "continue_tasks"
  | "check_eligibility"
  | "view_results";

export interface CampaignDiscoveryCta {
  kind: CampaignDiscoveryCtaKind;
  label: LocalizedText;
  reason: LocalizedText;
}

export interface CampaignDiscoveryTaskSummary {
  taskId: string;
  title: LocalizedText;
  verificationType: VerificationType;
  points: number;
  required: boolean;
}

export interface CampaignDiscoveryItem {
  id: string;
  slug: string;
  title: LocalizedText;
  subtitle: LocalizedText;
  campaignType: LocalizedText;
  status: CampaignStatus;
  points: number;
  startTime: string;
  endTime: string;
  timeWindow: LocalizedText;
  coreTasks: CampaignDiscoveryTaskSummary[];
  cta: CampaignDiscoveryCta;
  walletPolicy: WalletPolicy;
  supportedLocales: SupportedLocale[];
  consumerSurfaces: CampaignDiscoveryConsumerSurface[];
  tags: LocalizedText[];
  boundary: LocalizedText;
}

export interface CampaignDiscoveryDetail {
  item: CampaignDiscoveryItem;
  tasks: CampaignDiscoveryTaskSummary[];
  eligibilityEntry: LocalizedText;
  rewardBoundary: LocalizedText;
  appHubContext: LocalizedText;
  portfolioContext: LocalizedText;
  forecastContext: LocalizedText;
  boundary: LocalizedText;
}

export interface CampaignDiscoverySummary {
  totalCampaigns: number;
  liveCount: number;
  scheduledCount: number;
  endedCount: number;
  appHubReadyCount: number;
  portfolioReadyCount: number;
  forecastReadyCount: number;
  topCampaignId: string;
}

export interface CampaignDiscoveryReadModel {
  campaignId: string;
  items: CampaignDiscoveryItem[];
  details: CampaignDiscoveryDetail[];
  summary: CampaignDiscoverySummary;
  boundary: LocalizedText;
  nextAction: LocalizedText;
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

export interface I18nReviewAction {
  id: I18nReviewActionId;
  label: LocalizedText;
  state: I18nReviewActionState;
  targetLocale: Exclude<SupportedLocale, "en-US">;
  mutatesContent: boolean;
  boundary: LocalizedText;
  blockedReason?: LocalizedText;
  nextAction: LocalizedText;
}

export interface I18nReviewActionAuditTrail {
  actionId: I18nReviewActionId | (string & {});
  campaignId: string;
  targetLocale: SupportedLocale | (string & {});
  reviewer: string;
  mutatedContent: boolean;
  externalProviderCalled: false;
  publishMutationExecuted: false;
  storageWriteExecuted: false;
  contractWriteExecuted: false;
  walletActionExecuted: false;
  exportFileGenerated: false;
  rewardDistributed: false;
  executedAt: string;
}

export interface I18nReviewActionError {
  code: I18nReviewActionErrorCode;
  field: "actionId" | "targetLocale";
  message: LocalizedText;
}

export interface I18nReviewActionRequest {
  actionId: I18nReviewActionId | (string & {});
  targetLocale: SupportedLocale | (string & {});
  reviewer?: string;
  executedAt?: string;
}

export interface I18nReviewActionResult {
  ok: boolean;
  campaignId: string;
  targetLocale: SupportedLocale | (string & {});
  action: I18nReviewAction;
  actions: I18nReviewAction[];
  updatedRevisions: ContentRevision[];
  translationManager: TranslationManagerReadModel;
  auditTrail: I18nReviewActionAuditTrail;
  boundary: LocalizedText;
  nextAction: LocalizedText;
  error?: I18nReviewActionError;
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
  localeStatus: Partial<Record<SupportedLocale, LocaleStatus>> & Record<"en-US", LocaleStatus>;
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

export interface ContractReviewMvpBoundary {
  status: LocalizedText;
  custody: LocalizedText;
  ownerRole: OwnerRole;
  approvalGates: LocalizedText[];
  rewardDistribution: LocalizedText;
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
  mvpBoundary: ContractReviewMvpBoundary;
  checklist: ContractReviewChecklistItem[];
  evolution: ContractEvolutionStep[];
}

export type ContractInterfaceReadiness = "ready" | "warning" | "blocker" | "info";
export type ContractInterfacePhase = "MVP" | "P1" | "P2" | "N/A";
export type DeliveryChecklistStatus = "covered" | "needs_review" | "blocked" | "deferred";
export type DeliveryChecklistGroupId = "product" | "architecture" | "ui" | "contract" | "qa";
export type DeliveryChecklistTraceabilityProofLevel =
  | "seeded_readiness"
  | "focused_test"
  | "browser_reviewed"
  | "private_evidence"
  | "live_evidence_required"
  | "future_scope";
export type DeliveryChecklistCloseoutQueueId =
  | "blocked"
  | "needs_review"
  | "missing_verification"
  | "missing_evidence"
  | "deferred"
  | "covered";
export type DeliveryChecklistCloseoutHandoffTarget =
  | "live_wallet_qa"
  | "project_owner_review"
  | "contract_reviewer"
  | "i18n_reviewer"
  | "evidence_traceability"
  | "future_scope"
  | "none";
export type DeliveryAcceptanceStatus =
  | "proven"
  | "partial"
  | "needs_live_evidence"
  | "blocked"
  | "deferred";
export type DeliveryAcceptanceSeverity = "critical" | "high" | "medium" | "low";
export type DeliveryAcceptanceSolutionSetId = "v0_1_product_ui" | "v0_2_wallet_i18n_contract";
export type P1LocaleCode = "ko-KR" | "ja-JP" | "vi-VN" | "id-ID" | "tr-TR" | "es-ES";
export type P1LocaleExpansionReadinessStatus = "deferred" | "ready";
export type P1LocaleActivationStatus = "blocked" | "review_required" | "ready" | "deferred";
export type P1LocaleActivationEvidenceState = "missing" | "partial" | "ready";

export interface P1LocaleActivationCandidate {
  locale: P1LocaleCode;
  label: LocalizedText;
  targetMarket: LocalizedText;
  priority: number;
  status: P1LocaleActivationStatus;
  ownerRole: OwnerRole;
  recommendedFirst: boolean;
  contentScope: LocalizedText;
  qaScope: LocalizedText;
  routingReadiness: P1LocaleActivationEvidenceState;
  analyticsReadiness: P1LocaleActivationEvidenceState;
  publishGateReadiness: P1LocaleActivationEvidenceState;
  contentOwnershipReadiness: P1LocaleActivationEvidenceState;
  qaReadiness: P1LocaleActivationEvidenceState;
  blockerIds: string[];
  evidenceReferences: string[];
  nextAction: LocalizedText;
  boundary: LocalizedText;
}

export interface P1LocaleActivationReadinessSummary {
  totalCandidates: number;
  blockedCandidates: number;
  reviewRequiredCandidates: number;
  readyCandidates: number;
  deferredCandidates: number;
  requiredEvidenceItems: number;
  completedEvidenceItems: number;
  recommendedFirstLocale: P1LocaleCode;
  topBlockerId: string | null;
  ready: boolean;
  nextAction: LocalizedText;
}

export interface P1LocaleActivationReadiness {
  summary: P1LocaleActivationReadinessSummary;
  candidates: P1LocaleActivationCandidate[];
  boundary: LocalizedText;
  nextAction: LocalizedText;
}

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

export type ContractTransparencyReadiness =
  | "ready"
  | "review_required"
  | "blocked"
  | "local_only";
export type ContractTransparencyLaneId =
  | "off-chain-mvp"
  | "export-root-readiness"
  | "points-batch-root"
  | "referral-binding-root"
  | "eligibility-root"
  | "verifier-role"
  | "reward-custody-claim";

export interface ContractTransparencyLane {
  id: ContractTransparencyLaneId;
  label: LocalizedText;
  phase: ContractInterfacePhase;
  readiness: ContractTransparencyReadiness;
  ownerRole: OwnerRole;
  sourceEvidence: LocalizedText;
  sourceSurface: LocalizedText;
  boundary: LocalizedText;
  nextAction: LocalizedText;
  blocksExecution: boolean;
}

export interface ContractTransparencySummary {
  totalLanes: number;
  readyLanes: number;
  reviewRequiredLanes: number;
  blockedLanes: number;
  localOnlyLanes: number;
  topLaneId: ContractTransparencyLaneId;
  topNextAction: LocalizedText;
}

export interface ContractTransparencyCloseoutContext {
  status: PostCampaignCloseoutStatus;
  topGateId: string;
  topAction: LocalizedText;
  evidence: LocalizedText;
}

export interface ContractTransparencyMonitor {
  campaignId: string;
  summary: ContractTransparencySummary;
  lanes: ContractTransparencyLane[];
  closeoutContext: ContractTransparencyCloseoutContext;
  boundary: LocalizedText;
  nextAction: LocalizedText;
}

export type ContractClaimPreapprovalGateState =
  | "ready"
  | "review_required"
  | "blocked";

export type ContractClaimPreapprovalGateId =
  | "security-review"
  | "custody-legal-approval"
  | "external-audit"
  | "admin-approval"
  | "contract-reviewer-approval"
  | "project-owner-reward-funding"
  | "pause-dispute-runbook"
  | "no-custody-no-distribution-boundary";

export interface ContractClaimPreapprovalGate {
  id: ContractClaimPreapprovalGateId;
  label: LocalizedText;
  state: ContractClaimPreapprovalGateState;
  ownerRole: OwnerRole;
  dependency: LocalizedText;
  evidenceNeeded: LocalizedText;
  nextAction: LocalizedText;
  sourceSurface: LocalizedText;
  blocksClaimExecution: boolean;
}

export type ContractClaimSecurityReviewItemId =
  | "claim-threat-model"
  | "eligibility-proof-handling"
  | "pause-dispute-semantics"
  | "rollback-behavior"
  | "double-claim-replay-prevention"
  | "role-access-review"
  | "external-audit-handoff"
  | "no-custody-no-distribution-boundary";

export interface ContractClaimSecurityReviewItem {
  id: ContractClaimSecurityReviewItemId;
  label: LocalizedText;
  state: ContractClaimPreapprovalGateState;
  ownerRole: OwnerRole;
  dependency: LocalizedText;
  evidenceNeeded: LocalizedText;
  nextAction: LocalizedText;
  sourceSurface: LocalizedText;
  boundary: LocalizedText;
  blocksApproval: boolean;
}

export interface ContractClaimSecurityReviewSummary {
  totalItems: number;
  readyItems: number;
  reviewRequiredItems: number;
  blockedItems: number;
  approvalBlocked: boolean;
  topItemId: ContractClaimSecurityReviewItemId;
  topNextAction: LocalizedText;
}

export interface ContractClaimSecurityReviewReadiness {
  campaignId: string;
  summary: ContractClaimSecurityReviewSummary;
  items: ContractClaimSecurityReviewItem[];
  sourceContext: {
    contractReview: LocalizedText;
    contractTransparency: LocalizedText;
    deliveryAcceptance: LocalizedText;
    exportCloseout: LocalizedText;
  };
  boundary: LocalizedText;
  nextAction: LocalizedText;
}

export type ContractClaimThreatModelSectionId =
  | "claim-actors"
  | "protected-assets"
  | "claim-entry-points"
  | "trust-boundaries"
  | "eligibility-proof-abuse"
  | "duplicate-claim-abuse"
  | "pause-dispute-abuse"
  | "rollback-failure-abuse"
  | "mitigation-coverage"
  | "residual-risk-acceptance"
  | "approval-evidence"
  | "no-custody-no-distribution-boundary";

export interface ContractClaimThreatModelSection {
  id: ContractClaimThreatModelSectionId;
  label: LocalizedText;
  state: ContractClaimPreapprovalGateState;
  ownerRole: OwnerRole;
  sourceSurface: LocalizedText;
  riskLevel: RiskLevel;
  dependency: LocalizedText;
  evidenceRequired: LocalizedText;
  reviewQuestion: LocalizedText;
  mitigation: LocalizedText;
  residualRisk: LocalizedText;
  nextAction: LocalizedText;
  boundary: LocalizedText;
  blocksThreatModelApproval: boolean;
}

export interface ContractClaimThreatModelApprovalSummary {
  totalSections: number;
  readySections: number;
  reviewRequiredSections: number;
  blockedSections: number;
  approvalBlocked: boolean;
  threatModelApproved: false;
  claimExecutionEnabled: false;
  residualRiskLevel: RiskLevel;
  topSectionId: ContractClaimThreatModelSectionId;
  topNextAction: LocalizedText;
}

export interface ContractClaimThreatModelApprovalReadiness {
  campaignId: string;
  summary: ContractClaimThreatModelApprovalSummary;
  sections: ContractClaimThreatModelSection[];
  sourceContext: {
    preapproval: LocalizedText;
    securityReview: LocalizedText;
    adminApproval: LocalizedText;
    custodyLegal: LocalizedText;
    executionApproval: LocalizedText;
    deliveryAcceptance: LocalizedText;
    contractTransparency: LocalizedText;
  };
  boundary: LocalizedText;
  nextAction: LocalizedText;
  threatModelApproved: false;
  claimExecutionEnabled: false;
  noContractWrite: true;
  noClaimExecution: true;
  noWalletSigning: true;
  noProviderCall: true;
  noStorageWrite: true;
  noExportGeneration: true;
  noRewardCustody: true;
  noRewardDistribution: true;
  noBranchAutomation: true;
  noIssueAutomation: true;
  noPrAutomation: true;
  noMissionAutomation: true;
}

export type ContractClaimActorApprovalRowId =
  | "participant"
  | "project-owner"
  | "admin"
  | "contract-reviewer"
  | "verifier"
  | "exporter"
  | "pauser"
  | "external-auditor"
  | "no-custody-no-distribution-boundary";

export interface ContractClaimActorApprovalRow {
  id: ContractClaimActorApprovalRowId;
  label: LocalizedText;
  state: ContractClaimPreapprovalGateState;
  ownerRole: OwnerRole;
  riskLevel: RiskLevel;
  responsibility: LocalizedText;
  authorityBoundary: LocalizedText;
  abusePath: LocalizedText;
  evidenceRequired: LocalizedText;
  residualRisk: LocalizedText;
  nextAction: LocalizedText;
  sourceSurface: LocalizedText;
  blocksActorApproval: boolean;
}

export interface ContractClaimActorApprovalSummary {
  totalActors: number;
  readyActors: number;
  reviewRequiredActors: number;
  blockedActors: number;
  approvalBlocked: boolean;
  actorApprovalGranted: false;
  claimExecutionEnabled: false;
  topActorId: ContractClaimActorApprovalRowId;
  topNextAction: LocalizedText;
  highestRiskLevel: RiskLevel;
}

export type ContractClaimEligibilityLineageRowId =
  | "participant-eligibility-source"
  | "exported-list-lineage"
  | "task-evidence-linkage"
  | "wallet-account-lineage"
  | "risk-review-lineage"
  | "claim-proof-source"
  | "stale-export-prevention"
  | "no-custody-no-distribution-boundary";

export interface ContractClaimEligibilityLineageRow {
  id: ContractClaimEligibilityLineageRowId;
  label: LocalizedText;
  state: ContractClaimPreapprovalGateState;
  ownerRole: OwnerRole;
  riskLevel: RiskLevel;
  dependency: LocalizedText;
  evidenceRequired: LocalizedText;
  lineageGap: LocalizedText;
  residualRisk: LocalizedText;
  nextAction: LocalizedText;
  sourceSurface: LocalizedText;
  blocksEligibilityLineageApproval: boolean;
}

export interface ContractClaimEligibilityLineageApprovalSummary {
  totalRows: number;
  readyRows: number;
  reviewRequiredRows: number;
  blockedRows: number;
  approvalBlocked: boolean;
  eligibilityLineageApproved: false;
  participantApprovalGranted: false;
  claimExecutionEnabled: false;
  topRowId: ContractClaimEligibilityLineageRowId;
  topNextAction: LocalizedText;
  highestRiskLevel: RiskLevel;
}

export interface ContractClaimEligibilityLineageApprovalReadiness {
  campaignId: string;
  summary: ContractClaimEligibilityLineageApprovalSummary;
  rows: ContractClaimEligibilityLineageRow[];
  sourceContext: {
    participantApproval: LocalizedText;
    participantOperations: LocalizedText;
    exportReadiness: LocalizedText;
    deliveryAcceptance: LocalizedText;
    securityReview: LocalizedText;
    threatModelApproval: LocalizedText;
    contractTransparency: LocalizedText;
  };
  boundary: LocalizedText;
  nextAction: LocalizedText;
  eligibilityLineageApproved: false;
  participantApprovalGranted: false;
  claimExecutionEnabled: false;
  noContractWrite: true;
  noClaimExecution: true;
  noWalletSigning: true;
  noProviderCall: true;
  noStorageWrite: true;
  noExportGeneration: true;
  noRewardCustody: true;
  noRewardDistribution: true;
  noBranchAutomation: true;
  noIssueAutomation: true;
  noPrAutomation: true;
  noMissionAutomation: true;
}

export type ContractClaimParticipantApprovalCheckId =
  | "eligibility-lineage"
  | "wallet-account-binding"
  | "proof-replay-prevention"
  | "duplicate-claim-prevention"
  | "dispute-manual-review"
  | "payout-pressure-boundary"
  | "claimant-communication"
  | "no-custody-no-distribution-boundary";

export interface ContractClaimParticipantApprovalCheck {
  id: ContractClaimParticipantApprovalCheckId;
  label: LocalizedText;
  state: ContractClaimPreapprovalGateState;
  ownerRole: OwnerRole;
  riskLevel: RiskLevel;
  dependency: LocalizedText;
  evidenceRequired: LocalizedText;
  abusePath: LocalizedText;
  residualRisk: LocalizedText;
  nextAction: LocalizedText;
  sourceSurface: LocalizedText;
  blocksParticipantApproval: boolean;
}

export interface ContractClaimParticipantApprovalSummary {
  totalChecks: number;
  readyChecks: number;
  reviewRequiredChecks: number;
  blockedChecks: number;
  approvalBlocked: boolean;
  participantApprovalGranted: false;
  claimExecutionEnabled: false;
  topCheckId: ContractClaimParticipantApprovalCheckId;
  topNextAction: LocalizedText;
  highestRiskLevel: RiskLevel;
}

export interface ContractClaimParticipantApprovalReadiness {
  campaignId: string;
  summary: ContractClaimParticipantApprovalSummary;
  checks: ContractClaimParticipantApprovalCheck[];
  eligibilityLineageApprovalReadiness: ContractClaimEligibilityLineageApprovalReadiness;
  sourceContext: {
    actorApproval: LocalizedText;
    threatModelApproval: LocalizedText;
    securityReview: LocalizedText;
    executionApproval: LocalizedText;
    participantOperations: LocalizedText;
    deliveryAcceptance: LocalizedText;
    contractTransparency: LocalizedText;
  };
  boundary: LocalizedText;
  nextAction: LocalizedText;
  participantApprovalGranted: false;
  claimExecutionEnabled: false;
  noContractWrite: true;
  noClaimExecution: true;
  noWalletSigning: true;
  noProviderCall: true;
  noStorageWrite: true;
  noExportGeneration: true;
  noRewardCustody: true;
  noRewardDistribution: true;
  noBranchAutomation: true;
  noIssueAutomation: true;
  noPrAutomation: true;
  noMissionAutomation: true;
}

export interface ContractClaimActorApprovalReadiness {
  campaignId: string;
  summary: ContractClaimActorApprovalSummary;
  actors: ContractClaimActorApprovalRow[];
  participantApprovalReadiness: ContractClaimParticipantApprovalReadiness;
  sourceContext: {
    preapproval: LocalizedText;
    securityReview: LocalizedText;
    threatModelApproval: LocalizedText;
    adminApproval: LocalizedText;
    custodyLegal: LocalizedText;
    executionApproval: LocalizedText;
    deliveryAcceptance: LocalizedText;
    contractTransparency: LocalizedText;
    closeout: LocalizedText;
  };
  boundary: LocalizedText;
  nextAction: LocalizedText;
  actorApprovalGranted: false;
  claimExecutionEnabled: false;
  noContractWrite: true;
  noClaimExecution: true;
  noWalletSigning: true;
  noProviderCall: true;
  noStorageWrite: true;
  noExportGeneration: true;
  noRewardCustody: true;
  noRewardDistribution: true;
  noBranchAutomation: true;
  noIssueAutomation: true;
  noPrAutomation: true;
  noMissionAutomation: true;
}

export type ContractClaimAdminApprovalItemId =
  | "security-readiness-approval"
  | "admin-approval"
  | "contract-reviewer-approval"
  | "custody-legal-approval"
  | "external-audit-approval"
  | "project-owner-funding-approval"
  | "pause-dispute-runbook-approval"
  | "no-custody-no-distribution-boundary";

export interface ContractClaimAdminApprovalItem {
  id: ContractClaimAdminApprovalItemId;
  label: LocalizedText;
  state: ContractClaimPreapprovalGateState;
  approverRole: OwnerRole;
  sourceGateId: ContractClaimPreapprovalGateId;
  dependency: LocalizedText;
  evidenceRequired: LocalizedText;
  blockingReason: LocalizedText;
  nextAction: LocalizedText;
  sourceSurface: LocalizedText;
  boundary: LocalizedText;
  blocksClaimMode: boolean;
}

export interface ContractClaimAdminApprovalSummary {
  totalItems: number;
  readyItems: number;
  reviewRequiredItems: number;
  blockedItems: number;
  claimModeApprovalBlocked: boolean;
  topItemId: ContractClaimAdminApprovalItemId;
  topNextAction: LocalizedText;
}

export interface ContractClaimAdminApprovalReadiness {
  campaignId: string;
  summary: ContractClaimAdminApprovalSummary;
  items: ContractClaimAdminApprovalItem[];
  sourceContext: {
    preapproval: LocalizedText;
    securityReview: LocalizedText;
    deliveryAcceptance: LocalizedText;
    contractTransparency: LocalizedText;
  };
  boundary: LocalizedText;
  nextAction: LocalizedText;
  claimModeApproved: false;
  claimExecutionEnabled: false;
  noContractWrite: true;
  noClaimExecution: true;
  noRewardCustody: true;
  noRewardDistribution: true;
  noStorageWrite: true;
  noBranchAutomation: true;
}

export type ContractClaimCustodyLegalItemId =
  | "custody-model"
  | "legal-terms"
  | "project-owner-funding"
  | "payout-responsibility"
  | "escrow-exclusion"
  | "dispute-ownership"
  | "jurisdiction-compliance"
  | "no-custody-no-distribution-boundary";

export interface ContractClaimCustodyLegalItem {
  id: ContractClaimCustodyLegalItemId;
  label: LocalizedText;
  state: ContractClaimPreapprovalGateState;
  ownerRole: OwnerRole;
  sourceGateId: ContractClaimPreapprovalGateId;
  dependency: LocalizedText;
  evidenceRequired: LocalizedText;
  blockingReason: LocalizedText;
  nextAction: LocalizedText;
  sourceSurface: LocalizedText;
  boundary: LocalizedText;
  blocksCustodyLegalApproval: boolean;
}

export interface ContractClaimCustodyLegalSummary {
  totalItems: number;
  readyItems: number;
  reviewRequiredItems: number;
  blockedItems: number;
  custodyLegalApprovalBlocked: boolean;
  topItemId: ContractClaimCustodyLegalItemId;
  topNextAction: LocalizedText;
}

export interface ContractClaimCustodyLegalReadiness {
  campaignId: string;
  summary: ContractClaimCustodyLegalSummary;
  items: ContractClaimCustodyLegalItem[];
  sourceContext: {
    preapproval: LocalizedText;
    securityReview: LocalizedText;
    adminApproval: LocalizedText;
    deliveryAcceptance: LocalizedText;
    contractTransparency: LocalizedText;
    postCampaignCloseout: LocalizedText;
  };
  boundary: LocalizedText;
  nextAction: LocalizedText;
  custodyLegalApproved: false;
  claimExecutionEnabled: false;
  noContractWrite: true;
  noClaimExecution: true;
  noRewardCustody: true;
  noRewardDistribution: true;
  noStorageWrite: true;
  noBranchAutomation: true;
}

export type ContractClaimExecutionApprovalItemId =
  | "security-approval"
  | "admin-approval"
  | "contract-reviewer-approval"
  | "custody-legal-approval"
  | "external-audit-acceptance"
  | "project-owner-funding"
  | "pause-dispute-rollback-runbook"
  | "claim-proof-duplicate-safeguards"
  | "no-custody-no-distribution-boundary";

export interface ContractClaimExecutionApprovalItem {
  id: ContractClaimExecutionApprovalItemId;
  label: LocalizedText;
  state: ContractClaimPreapprovalGateState;
  ownerRole: OwnerRole;
  sourceGateId: ContractClaimPreapprovalGateId;
  sourceSurface: LocalizedText;
  dependency: LocalizedText;
  evidenceRequired: LocalizedText;
  blockingReason: LocalizedText;
  launchImpact: LocalizedText;
  nextAction: LocalizedText;
  boundary: LocalizedText;
  blocksExecutionApproval: boolean;
}

export interface ContractClaimExecutionApprovalSummary {
  totalItems: number;
  readyItems: number;
  reviewRequiredItems: number;
  blockedItems: number;
  launchBlockingItems: number;
  executionApprovalBlocked: boolean;
  claimExecutionEnabled: false;
  topItemId: ContractClaimExecutionApprovalItemId;
  topNextAction: LocalizedText;
}

export interface ContractClaimExecutionApprovalReadiness {
  campaignId: string;
  summary: ContractClaimExecutionApprovalSummary;
  items: ContractClaimExecutionApprovalItem[];
  sourceContext: {
    preapproval: LocalizedText;
    securityReview: LocalizedText;
    adminApproval: LocalizedText;
    custodyLegal: LocalizedText;
    deliveryAcceptance: LocalizedText;
    contractTransparency: LocalizedText;
  };
  boundary: LocalizedText;
  nextAction: LocalizedText;
  executionApproved: false;
  claimExecutionEnabled: false;
  noContractWrite: true;
  noClaimExecution: true;
  noWalletSigning: true;
  noProviderCall: true;
  noStorageWrite: true;
  noExportGeneration: true;
  noRewardCustody: true;
  noRewardDistribution: true;
  noBranchAutomation: true;
}

export interface ContractClaimPreapprovalSummary {
  totalGates: number;
  readyGates: number;
  reviewRequiredGates: number;
  blockedGates: number;
  topGateId: ContractClaimPreapprovalGateId;
  topNextAction: LocalizedText;
}

export interface ContractClaimPreapprovalPackage {
  campaignId: string;
  overallState: "blocked";
  claimExecutionEnabled: false;
  suggestedFutureBranch: string;
  summary: ContractClaimPreapprovalSummary;
  gates: ContractClaimPreapprovalGate[];
  securityReviewReadiness: ContractClaimSecurityReviewReadiness;
  threatModelApprovalReadiness: ContractClaimThreatModelApprovalReadiness;
  actorApprovalReadiness: ContractClaimActorApprovalReadiness;
  adminApprovalReadiness: ContractClaimAdminApprovalReadiness;
  custodyLegalReadiness: ContractClaimCustodyLegalReadiness;
  executionApprovalReadiness: ContractClaimExecutionApprovalReadiness;
  sourceContext: {
    contractReview: LocalizedText;
    contractTransparency: LocalizedText;
    deliveryAcceptance: LocalizedText;
    exportCloseout: LocalizedText;
  };
  boundary: LocalizedText;
  nextAction: LocalizedText;
  noContractWrite: true;
  noClaimExecution: true;
  noRewardCustody: true;
  noRewardDistribution: true;
  noWalletSigning: true;
  noProviderCall: true;
  noStorageWrite: true;
  noExportGeneration: true;
  noBranchAutomation: true;
  noIssueAutomation: true;
  noPrAutomation: true;
  noMissionAutomation: true;
}

export type ContractCampaignStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "LIVE"
  | "PAUSED"
  | "ENDED"
  | "ARCHIVED";
export type ContractStatusMappingClassification =
  | "contract_safe"
  | "off_chain_review"
  | "export_evidence"
  | "blocked_non_goal";

export interface ContractStatusMappingRow {
  localStatus: CampaignStatus;
  label: LocalizedText;
  targetContractStatus: ContractCampaignStatus | null;
  classification: ContractStatusMappingClassification;
  contractWriteAllowed: boolean;
  ownerRole: OwnerRole;
  evidenceSurface: LocalizedText;
  boundary: LocalizedText;
  nextAction: LocalizedText;
}

export interface ContractStatusMappingSummary {
  totalStatuses: number;
  contractSafeCount: number;
  offChainOnlyCount: number;
  blockedWriteCount: number;
  topStatus: CampaignStatus;
  topNextAction: LocalizedText;
}

export interface ContractStatusMappingReadiness {
  summary: ContractStatusMappingSummary;
  rows: ContractStatusMappingRow[];
  boundary: LocalizedText;
  nextAction: LocalizedText;
}

export type CompanionContractReadinessStatus =
  | "proven"
  | "review_required"
  | "deferred_non_goal"
  | "blocked_non_goal";
export type CompanionContractEvidenceItemKind =
  | "schema_field"
  | "method"
  | "event"
  | "role"
  | "test"
  | "boundary"
  | "root_hash"
  | "non_goal";
export type CompanionContractEvidenceCategoryId =
  | "campaign-registry-schema"
  | "campaign-registry-methods-events"
  | "campaign-registry-status-mapping"
  | "points-batch-root"
  | "referral-registry-rules"
  | "eligibility-root-proof"
  | "verifier-roles-permissions"
  | "i18n-off-chain-hash"
  | "contract-test-checklist"
  | "reward-custody-claim-exclusion";

export interface CompanionContractEvidenceItem {
  id: string;
  label: LocalizedText;
  kind: CompanionContractEvidenceItemKind;
  status: CompanionContractReadinessStatus;
  source: LocalizedText;
  detail: LocalizedText;
}

export interface CompanionContractEvidenceCategory {
  id: CompanionContractEvidenceCategoryId;
  title: LocalizedText;
  contractName?: string;
  phase: ContractInterfacePhase;
  status: CompanionContractReadinessStatus;
  requiredForPlan: boolean;
  ownerRole: OwnerRole;
  evidenceSurface: LocalizedText;
  evidenceSummary: LocalizedText;
  evidenceItems: CompanionContractEvidenceItem[];
  boundary: LocalizedText;
  nextAction: LocalizedText;
}

export interface CompanionContractReadinessSummary {
  totalCategories: number;
  requiredCategories: number;
  provenCategories: number;
  reviewRequiredCategories: number;
  deferredNonGoalCategories: number;
  blockedExecutionCategories: number;
  ready: boolean;
  topCategoryId: CompanionContractEvidenceCategoryId;
  topNextAction: LocalizedText;
}

export interface CompanionContractReadiness {
  summary: CompanionContractReadinessSummary;
  categories: CompanionContractEvidenceCategory[];
  boundary: LocalizedText;
  nextAction: LocalizedText;
}

export interface DeliveryChecklistTraceabilityRef {
  label: LocalizedText;
  path: string;
  detail: LocalizedText;
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
  sourceDocs: DeliveryChecklistTraceabilityRef[];
  implementationRefs: DeliveryChecklistTraceabilityRef[];
  verificationCommands: DeliveryChecklistTraceabilityRef[];
  evidenceArtifacts: DeliveryChecklistTraceabilityRef[];
  proofLevel: DeliveryChecklistTraceabilityProofLevel;
  riskNote: LocalizedText;
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

export interface DeliveryChecklistTraceabilityRow {
  id: string;
  groupId: DeliveryChecklistGroupId;
  itemId: string;
  label: LocalizedText;
  status: DeliveryChecklistStatus;
  sourceRequirement: string;
  sourceDocs: DeliveryChecklistTraceabilityRef[];
  implementationRefs: DeliveryChecklistTraceabilityRef[];
  verificationCommands: DeliveryChecklistTraceabilityRef[];
  evidenceArtifacts: DeliveryChecklistTraceabilityRef[];
  proofLevel: DeliveryChecklistTraceabilityProofLevel;
  riskNote: LocalizedText;
  nextAction: LocalizedText;
}

export interface DeliveryChecklistTraceabilitySummary {
  totalRows: number;
  verifiedRows: number;
  reviewRequiredRows: number;
  deferredRows: number;
  missingVerificationRows: number;
  missingEvidenceRows: number;
  proofLevelCounts: Record<DeliveryChecklistTraceabilityProofLevel, number>;
  nextAction: LocalizedText;
}

export interface DeliveryChecklistTraceabilityMatrix {
  summary: DeliveryChecklistTraceabilitySummary;
  boundary: LocalizedText;
  rows: DeliveryChecklistTraceabilityRow[];
}

export interface DeliveryChecklistCloseoutRow {
  id: string;
  itemId: string;
  groupId: DeliveryChecklistGroupId;
  label: LocalizedText;
  status: DeliveryChecklistStatus;
  queueId: DeliveryChecklistCloseoutQueueId;
  priority: number;
  ownerRole: OwnerRole;
  proofLevel: DeliveryChecklistTraceabilityProofLevel;
  sourceRequirement: string;
  handoffTarget: DeliveryChecklistCloseoutHandoffTarget;
  handoffLabel: LocalizedText;
  surface: LocalizedText;
  evidence: LocalizedText;
  nextAction: LocalizedText;
  boundary: LocalizedText;
  riskNote: LocalizedText;
  blocksDelivery: boolean;
  missingVerification: boolean;
  missingEvidence: boolean;
}

export interface DeliveryChecklistCloseoutQueue {
  id: DeliveryChecklistCloseoutQueueId;
  label: LocalizedText;
  description: LocalizedText;
  count: number;
  unresolved: boolean;
  rows: DeliveryChecklistCloseoutRow[];
}

export interface DeliveryChecklistCloseoutSummary {
  totalRows: number;
  unresolvedRows: number;
  coveredRows: number;
  blockedRows: number;
  needsReviewRows: number;
  missingVerificationRows: number;
  missingEvidenceRows: number;
  deferredRows: number;
  topQueueId: DeliveryChecklistCloseoutQueueId;
  topRowId: string | null;
  topHandoffTarget: DeliveryChecklistCloseoutHandoffTarget;
  topNextAction: LocalizedText;
  ready: boolean;
}

export interface DeliveryChecklistCloseoutWorkflow {
  summary: DeliveryChecklistCloseoutSummary;
  queues: DeliveryChecklistCloseoutQueue[];
  rows: DeliveryChecklistCloseoutRow[];
  boundary: LocalizedText;
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
  runtimeSupported: boolean;
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
  traceability: DeliveryChecklistTraceabilityMatrix;
  closeout: DeliveryChecklistCloseoutWorkflow;
  p1LocaleExpansion: P1LocaleExpansionReadiness;
  groups: DeliveryChecklistGroup[];
  blockers: DeliveryChecklistItem[];
  needsReview: DeliveryChecklistItem[];
}

export interface DeliveryAcceptanceRow {
  id: string;
  solutionSetId: DeliveryAcceptanceSolutionSetId;
  sourceArea: LocalizedText;
  title: LocalizedText;
  status: DeliveryAcceptanceStatus;
  severity: DeliveryAcceptanceSeverity;
  ownerRole: OwnerRole;
  evidenceSurface: LocalizedText;
  evidenceSummary: LocalizedText;
  nextMissionAction: LocalizedText;
  boundary?: LocalizedText;
  launchBlocking: boolean;
}

export interface DeliveryAcceptanceCounts {
  proven: number;
  partial: number;
  needsLiveEvidence: number;
  blocked: number;
  deferred: number;
}

export interface DeliveryAcceptanceSolutionSet {
  id: DeliveryAcceptanceSolutionSetId;
  title: LocalizedText;
  sourceReference: string;
  summary: LocalizedText;
  counts: DeliveryAcceptanceCounts;
  rows: DeliveryAcceptanceRow[];
}

export interface DeliveryAcceptanceSummary extends DeliveryAcceptanceCounts {
  totalRows: number;
  solutionSetCount: number;
  topSeverity: DeliveryAcceptanceSeverity;
  nextAction: LocalizedText;
}

export interface DeliveryAcceptanceConsole {
  summary: DeliveryAcceptanceSummary;
  boundary: LocalizedText;
  solutionSets: DeliveryAcceptanceSolutionSet[];
  topResidualGaps: DeliveryAcceptanceRow[];
}

export type ResidualGapMissionQueueStatus =
  | "needs_live_evidence"
  | "launch_blocking"
  | "review_required"
  | "backlog";

export interface ResidualGapMissionQueueItem {
  id: string;
  sourceRowId: string;
  sourceSolutionSetId: DeliveryAcceptanceSolutionSetId;
  priority: number;
  suggestedMissionTitle: LocalizedText;
  suggestedBranch: string;
  status: ResidualGapMissionQueueStatus;
  severity: DeliveryAcceptanceSeverity;
  ownerRole: OwnerRole;
  launchBlocking: boolean;
  dependency: LocalizedText;
  evidenceNeeded: LocalizedText;
  sourceGap: LocalizedText;
  launchImpact: LocalizedText;
  nextAction: LocalizedText;
  boundary: LocalizedText;
}

export interface ResidualGapMissionQueueContext {
  contractClaimPreapprovalPackage?: ContractClaimPreapprovalPackage;
}

export interface ResidualGapMissionQueueSummary {
  totalItems: number;
  launchBlockingItems: number;
  backlogItems: number;
  reviewRequiredItems: number;
  topItemId: string | null;
  topSeverity: DeliveryAcceptanceSeverity;
  nextAction: LocalizedText;
}

export interface ResidualGapMissionQueue {
  summary: ResidualGapMissionQueueSummary;
  items: ResidualGapMissionQueueItem[];
  boundary: LocalizedText;
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

export type ProjectPortfolioMetricId =
  | "campaigns_created"
  | "active_projects"
  | "campaign_setup_time"
  | "reward_budget_committed"
  | "winner_exports"
  | "repeat_project_usage";
export type CommercialModelReadinessId =
  | "free_ecosystem_mode"
  | "partner_campaign_fee"
  | "premium_analytics"
  | "ai_ops_package"
  | "launch_package"
  | "api_usage";
export type ProjectPortfolioCommercialOwnerRole =
  | OwnerRole
  | "growth_lead"
  | "finance_reviewer"
  | "api_reviewer";

export interface ProjectPortfolioMetric {
  id: ProjectPortfolioMetricId;
  label: LocalizedText;
  value: string;
  detail: LocalizedText;
  state: PublishState;
  ownerRole: ProjectPortfolioCommercialOwnerRole;
  nextAction: LocalizedText;
}

export interface CommercialModelReadiness {
  id: CommercialModelReadinessId;
  label: LocalizedText;
  state: PublishState;
  evidence: LocalizedText;
  boundary: LocalizedText;
  ownerRole: ProjectPortfolioCommercialOwnerRole;
  nextAction: LocalizedText;
}

export interface PortfolioCommercialSummary {
  totalMetrics: number;
  readyMetricCount: number;
  reviewRequiredMetricCount: number;
  commercialModelCount: number;
  productionReadyModelCount: number;
  topNextAction: LocalizedText;
  rewardBoundary: LocalizedText;
}

export interface ProjectPortfolioCommercialReadiness {
  summary: PortfolioCommercialSummary;
  metrics: ProjectPortfolioMetric[];
  commercialModels: CommercialModelReadiness[];
  boundary: LocalizedText;
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
  exportFulfillmentReadiness: ExportFulfillmentReadiness;
  advancedAnalytics: AdvancedAnalyticsReadinessSurface;
  aiOptimization: AiOptimizationWorkflow;
  aiOpsKpiAdoption: AiOpsKpiAdoptionConsole;
  pointsRankingReferralReadiness: PointsRankingReferralServiceReadiness;
  aelfWebLoginAdapterReadiness: AelfWebLoginAdapterReadinessModel;
  providerEvidenceRegistry: ProviderEvidenceRegistry;
  lifecycleOperations: CampaignLifecycleOperations;
  launchConsoleCampaignBundles: LaunchConsoleCampaignBundleSurface;
  portfolioCommercialReadiness: ProjectPortfolioCommercialReadiness;
  apiUsageCommercializationReadiness: ApiUsageCommercializationReadinessSurface;
  boundary: LocalizedText;
}

export type ParticipantOperationsExportStatus =
  | "ready"
  | "review_required"
  | "blocked"
  | "pending";

export interface ParticipantOperationsSummary {
  totalParticipants: number;
  eligibleParticipants: number;
  exportReadyParticipants: number;
  reviewRequiredParticipants: number;
  blockedParticipants: number;
  pendingParticipants: number;
  aaWalletParticipants: number;
  eoaWalletParticipants: number;
  riskFlaggedParticipants: number;
  localeCounts: LocaleFallbackMap<number>;
}

export interface ParticipantOperationsRow {
  participantId: string;
  walletAddress: string;
  accountType: AccountType;
  walletSource: WalletSource;
  localePreference: SupportedLocale;
  completedTasks: number;
  totalTasks: number;
  taskProgressLabel: LocalizedText;
  eligible: boolean;
  riskFlags: string[];
  exportStatus: ParticipantOperationsExportStatus;
  exportStatusLabel: LocalizedText;
  nextAction: LocalizedText;
  rewardBoundary: LocalizedText;
}

export interface ParticipantOperationsReadModel {
  campaignId: string;
  summary: ParticipantOperationsSummary;
  rows: ParticipantOperationsRow[];
  boundary: LocalizedText;
}

export type CampaignSettingsReadinessState = "ready" | "review_required" | "blocked";
export type CampaignSettingsGroupId =
  | "wallet-policy"
  | "contract-mode"
  | "reward-responsibility"
  | "i18n-fallback"
  | "verification-risk"
  | "export-policy"
  | "publish-prerequisites";

export interface CampaignSettingsSummary {
  totalGroups: number;
  readyGroups: number;
  reviewRequiredGroups: number;
  blockedGroups: number;
  topNextAction: LocalizedText;
}

export interface CampaignSettingsGroup {
  id: CampaignSettingsGroupId;
  label: LocalizedText;
  currentValue: LocalizedText;
  readiness: CampaignSettingsReadinessState;
  ownerRole: OwnerRole;
  evidence: LocalizedText;
  nextAction: LocalizedText;
}

export interface CampaignSettingsReadiness {
  campaignId: string;
  summary: CampaignSettingsSummary;
  groups: CampaignSettingsGroup[];
  boundary: LocalizedText;
}

export type PostCampaignCloseoutStatus =
  | "ready"
  | "review_required"
  | "blocked"
  | "local_only";
export type PostCampaignCloseoutGateSource =
  | "analytics"
  | "ai_report"
  | "export"
  | "risk"
  | "reward"
  | "lifecycle"
  | "optimization";
export type PostCampaignCloseoutOwnerRole =
  | "project_owner"
  | "internal_operator"
  | "risk_reviewer"
  | "export_reviewer"
  | "growth_lead";

export interface PostCampaignCloseoutGate {
  id: string;
  label: LocalizedText;
  status: PostCampaignCloseoutStatus;
  ownerRole: PostCampaignCloseoutOwnerRole;
  evidence: LocalizedText;
  reason: LocalizedText;
  nextAction: LocalizedText;
  source: PostCampaignCloseoutGateSource;
}

export interface PostCampaignCloseoutSummary {
  totalGates: number;
  readyCount: number;
  reviewRequiredCount: number;
  blockedCount: number;
  localOnlyCount: number;
  topGateId: string;
  topAction: LocalizedText;
}

export interface PostCampaignRetrospective {
  title: LocalizedText;
  status: PostCampaignCloseoutStatus;
  generatedAt: string;
  healthSummary: LocalizedText;
  verifiedActionEvidence: LocalizedText;
  winnerReportSummary: LocalizedText;
  riskPosture: LocalizedText;
  nextIterationActions: LocalizedText[];
  humanReviewRequired: boolean;
  boundary: LocalizedText;
}

export interface PostCampaignCloseout {
  campaignId: string;
  status: PostCampaignCloseoutStatus;
  summary: PostCampaignCloseoutSummary;
  gates: PostCampaignCloseoutGate[];
  aiRetrospective: PostCampaignRetrospective;
  rewardBoundary: LocalizedText;
  nextAction: LocalizedText;
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

export type AntiSybilV2SignalFamilyId =
  | "funding_graph"
  | "invite_tree"
  | "behavior_cluster";
export type AntiSybilV2ReadinessState =
  | "ready"
  | "review_required"
  | "blocked";
export type AntiSybilV2OwnerRole = RiskIntelligenceOwnerRole;
export type AntiSybilV2AffectedOutcomeId =
  | "referral_scoring"
  | "leaderboard_trust"
  | "winner_export_review"
  | "ai_optimization";

export interface AntiSybilV2SignalFamily {
  id: AntiSybilV2SignalFamilyId;
  label: LocalizedText;
  readiness: AntiSybilV2ReadinessState;
  severity: Exclude<SignalSeverity, "blocked">;
  sourceSignals: LocalizedText;
  evidenceBasis: LocalizedText;
  affectedCohort: LocalizedText;
  ownerRole: AntiSybilV2OwnerRole;
  reviewGuidance: LocalizedText;
  nextAction: LocalizedText;
  boundary: LocalizedText;
}

export interface AntiSybilV2AffectedOutcome {
  id: AntiSybilV2AffectedOutcomeId;
  label: LocalizedText;
  state: AntiSybilV2ReadinessState;
  impact: LocalizedText;
  ownerRole: AntiSybilV2OwnerRole;
  nextAction: LocalizedText;
}

export interface AntiSybilV2Summary {
  totalFamilies: number;
  readyCount: number;
  reviewRequiredCount: number;
  blockedCount: number;
  topFamilyId: AntiSybilV2SignalFamilyId;
  overallReadiness: AntiSybilV2ReadinessState;
  topOutcomeId: AntiSybilV2AffectedOutcomeId;
  topNextAction: LocalizedText;
}

export interface AntiSybilV2GraphReadiness {
  campaignId: string;
  summary: AntiSybilV2Summary;
  signalFamilies: AntiSybilV2SignalFamily[];
  affectedOutcomes: AntiSybilV2AffectedOutcome[];
  ownerNextAction: LocalizedText;
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

export type AiOpsReportHandoffStatus =
  | "ready_to_review"
  | "review_required"
  | "blocked";

export interface AiOpsReportHandoff {
  id: string;
  reportId: string;
  actionId: string;
  category: AiOptimizationReportCategory;
  title: LocalizedText;
  summary: LocalizedText;
  generatedAt: string;
  ownerRole: AiOptimizationOwnerRole;
  reviewState: AiOpsReportHandoffStatus;
  sourceEvidence: LocalizedText;
  sourceMetrics: AiOptimizationSourceMetric[];
  guardrail: LocalizedText;
  nextAction: LocalizedText;
  requiresHumanReview: boolean;
}

export interface AiOpsReportHandoffSummary {
  totalHandoffs: number;
  readyToReviewCount: number;
  reviewRequiredCount: number;
  blockedCount: number;
  topNextAction: LocalizedText;
}

export interface AiOpsReportHandoffSurface {
  campaignId: string;
  summary: AiOpsReportHandoffSummary;
  handoffs: AiOpsReportHandoff[];
  boundary: LocalizedText;
}

export type AiOpsKpiCategory =
  | "ai_generated_campaign_drafts"
  | "ai_content_accepted_rate"
  | "manual_edit_time_saved"
  | "ai_reports_generated"
  | "optimization_suggestions_adopted";
export type AiOpsKpiReadiness = "ready" | "review_required" | "blocked";
export type AiOpsKpiOwnerRole =
  | "growth_lead"
  | "internal_operator"
  | "project_owner"
  | "content_reviewer";

export interface AiOpsKpiMetric {
  id: string;
  category: AiOpsKpiCategory;
  label: LocalizedText;
  description: LocalizedText;
  value: string;
  target: LocalizedText;
  readiness: AiOpsKpiReadiness;
  trend: LocalizedText;
  ownerRole: AiOpsKpiOwnerRole;
  evidenceBasis: LocalizedText;
  sourceSurface: LocalizedText;
  nextAction: LocalizedText;
  boundary: LocalizedText;
}

export interface AiOpsKpiSummary {
  totalMetrics: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  strongestSignalMetricId: string;
  topNextAction: LocalizedText;
}

export interface AiOpsKpiAdoptionConsole {
  campaignId: string;
  summary: AiOpsKpiSummary;
  metrics: AiOpsKpiMetric[];
  boundary: LocalizedText;
  topNextAction: LocalizedText;
}

export type PointsRankingReferralLaneId =
  | "points-ledger"
  | "ranking"
  | "referral"
  | "pixiepoints-backend-handoff";
export type PointsRankingReferralReadinessState =
  | "ready"
  | "review_required"
  | "blocked"
  | "local_only";

export interface PointsRankingReferralReadinessLane {
  id: PointsRankingReferralLaneId;
  label: LocalizedText;
  description: LocalizedText;
  readiness: PointsRankingReferralReadinessState;
  ownerRole: OwnerRole;
  metricLabel: LocalizedText;
  metricValue: string;
  sourceSurface: LocalizedText;
  evidence: LocalizedText;
  nextAction: LocalizedText;
  boundary: LocalizedText;
}

export interface PointsRankingReferralReadinessSummary {
  totalLanes: number;
  readyLanes: number;
  reviewRequiredLanes: number;
  blockedLanes: number;
  localOnlyLanes: number;
  topLaneId: PointsRankingReferralLaneId;
  totalRawInvites: number;
  totalQualifiedInvitees: number;
  totalReferralPoints: number;
  topNextAction: LocalizedText;
}

export interface PointsRankingReferralServiceReadiness {
  campaignId: string;
  summary: PointsRankingReferralReadinessSummary;
  lanes: PointsRankingReferralReadinessLane[];
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

export type MobileTelegramMiniAppHubReadinessLaneId =
  | "campaign-feed"
  | "assets-overview"
  | "forecast-feed"
  | "pay-shortcut"
  | "invite-referral"
  | "telegram-shell";

export type MobileTelegramMiniAppHubReadinessState =
  | "ready"
  | "review_required"
  | "blocked"
  | "not_connected";

export type MobileTelegramMiniAppHubServiceState =
  | "seeded_preview"
  | "local_only"
  | "not_connected"
  | "review_required";

export type MobileTelegramMiniAppHubOwnerRole =
  | "project_owner"
  | "growth_lead"
  | "internal_operator"
  | "risk_reviewer"
  | "wallet_ops"
  | "product_owner";

export interface MobileTelegramMiniAppHubReadinessLane {
  id: MobileTelegramMiniAppHubReadinessLaneId;
  label: LocalizedText;
  readiness: MobileTelegramMiniAppHubReadinessState;
  ownerRole: MobileTelegramMiniAppHubOwnerRole;
  serviceState: MobileTelegramMiniAppHubServiceState;
  evidenceBasis: LocalizedText;
  relatedSignal: LocalizedText;
  ctaLabel: LocalizedText;
  nextAction: LocalizedText;
  boundary: LocalizedText;
}

export interface MobileHubAiGuide {
  headline: LocalizedText;
  body: LocalizedText;
  primaryLaneId: MobileTelegramMiniAppHubReadinessLaneId;
  urgency: Exclude<MobileTelegramMiniAppHubReadinessState, "not_connected">;
  evidenceBasis: LocalizedText;
}

export interface MobileTelegramMiniAppHubReadinessSummary {
  totalLanes: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  notConnectedCount: number;
  topLaneId: MobileTelegramMiniAppHubReadinessLaneId;
  topLaneState: MobileTelegramMiniAppHubReadinessState;
  aiGuideHeadline: LocalizedText;
  ownerNextAction: LocalizedText;
  boundary: LocalizedText;
}

export interface MobileTelegramMiniAppHubReadiness {
  campaignId: string;
  participantWalletAddress: string;
  summary: MobileTelegramMiniAppHubReadinessSummary;
  lanes: MobileTelegramMiniAppHubReadinessLane[];
  aiGuide: MobileHubAiGuide;
  boundary: LocalizedText;
  ownerNextAction: LocalizedText;
}

export interface DaippAgentCoinTaskReadinessRow {
  id: string;
  intentId: DaippAgentCoinTaskIntentId;
  label: LocalizedText;
  description: LocalizedText;
  verificationType: "DAPP_API";
  evidenceSource: DaippAgentCoinTaskEvidenceSource;
  providerState: DaippAgentCoinTaskProviderState;
  readinessState: DaippAgentCoinTaskReadinessState;
  riskState: LocalizedText;
  ownerRole: DaippAgentCoinTaskOwnerRole;
  nextAction: LocalizedText;
  boundary: LocalizedText;
}

export interface DaippAgentCoinTaskReadinessSummary {
  totalTasks: number;
  readyCount: number;
  reviewRequiredCount: number;
  blockedCount: number;
  topState: DaippAgentCoinTaskReadinessState;
  topIntentId: DaippAgentCoinTaskIntentId;
  primaryOwnerRole: DaippAgentCoinTaskOwnerRole;
  boundary: LocalizedText;
}

export interface DaippAgentCoinTaskReadiness {
  campaignId: string;
  summary: DaippAgentCoinTaskReadinessSummary;
  rows: DaippAgentCoinTaskReadinessRow[];
  ownerNextAction: LocalizedText;
  boundary: LocalizedText;
}

export interface ForestNftTaskReadinessRow {
  id: string;
  intentId: ForestNftTaskIntentId;
  label: LocalizedText;
  description: LocalizedText;
  verificationType: "DAPP_API";
  evidenceSource: ForestNftTaskEvidenceSource;
  providerState: ForestNftTaskProviderState;
  readinessState: ForestNftTaskReadinessState;
  riskState: LocalizedText;
  ownerRole: ForestNftTaskOwnerRole;
  nextAction: LocalizedText;
  boundary: LocalizedText;
}

export interface ForestNftTaskReadinessSummary {
  totalTasks: number;
  readyCount: number;
  reviewRequiredCount: number;
  blockedCount: number;
  topState: ForestNftTaskReadinessState;
  topIntentId: ForestNftTaskIntentId;
  primaryOwnerRole: ForestNftTaskOwnerRole;
  boundary: LocalizedText;
}

export interface ForestNftTaskReadiness {
  campaignId: string;
  summary: ForestNftTaskReadinessSummary;
  rows: ForestNftTaskReadinessRow[];
  ownerNextAction: LocalizedText;
  boundary: LocalizedText;
}

export interface SchrodingerNftTaskReadinessRow {
  id: string;
  intentId: SchrodingerNftTaskIntentId;
  label: LocalizedText;
  description: LocalizedText;
  verificationType: "DAPP_API";
  evidenceSource: SchrodingerNftTaskEvidenceSource;
  providerState: SchrodingerNftTaskProviderState;
  readinessState: SchrodingerNftTaskReadinessState;
  riskState: LocalizedText;
  ownerRole: SchrodingerNftTaskOwnerRole;
  nextAction: LocalizedText;
  boundary: LocalizedText;
}

export interface SchrodingerNftTaskReadinessSummary {
  totalTasks: number;
  readyCount: number;
  reviewRequiredCount: number;
  blockedCount: number;
  topState: SchrodingerNftTaskReadinessState;
  topIntentId: SchrodingerNftTaskIntentId;
  primaryOwnerRole: SchrodingerNftTaskOwnerRole;
  boundary: LocalizedText;
}

export interface SchrodingerNftTaskReadiness {
  campaignId: string;
  summary: SchrodingerNftTaskReadinessSummary;
  rows: SchrodingerNftTaskReadinessRow[];
  ownerNextAction: LocalizedText;
  boundary: LocalizedText;
}

export interface EbridgeTaskReadinessRow {
  id: string;
  intentId: EbridgeTaskIntentId;
  label: LocalizedText;
  description: LocalizedText;
  verificationType: "ON_CHAIN" | "DAPP_API";
  evidenceSource: EbridgeTaskEvidenceSource;
  providerState: EbridgeTaskProviderState;
  readinessState: EbridgeTaskReadinessState;
  riskState: LocalizedText;
  ownerRole: EbridgeTaskOwnerRole;
  nextAction: LocalizedText;
  boundary: LocalizedText;
}

export interface EbridgeTaskReadinessSummary {
  totalTasks: number;
  readyCount: number;
  reviewRequiredCount: number;
  blockedCount: number;
  topState: EbridgeTaskReadinessState;
  topIntentId: EbridgeTaskIntentId;
  primaryOwnerRole: EbridgeTaskOwnerRole;
  boundary: LocalizedText;
}

export interface EbridgeTaskReadiness {
  campaignId: string;
  summary: EbridgeTaskReadinessSummary;
  rows: EbridgeTaskReadinessRow[];
  ownerNextAction: LocalizedText;
  boundary: LocalizedText;
}

export interface AwakenSwapLiquidityTaskReadinessRow {
  id: string;
  intentId: AwakenSwapLiquidityTaskIntentId;
  label: LocalizedText;
  description: LocalizedText;
  verificationType: "ON_CHAIN" | "DAPP_API";
  evidenceSource: AwakenSwapLiquidityTaskEvidenceSource;
  providerState: AwakenSwapLiquidityTaskProviderState;
  readinessState: AwakenSwapLiquidityTaskReadinessState;
  riskState: LocalizedText;
  ownerRole: AwakenSwapLiquidityTaskOwnerRole;
  nextAction: LocalizedText;
  boundary: LocalizedText;
}

export interface AwakenSwapLiquidityTaskReadinessSummary {
  totalTasks: number;
  readyCount: number;
  reviewRequiredCount: number;
  blockedCount: number;
  topState: AwakenSwapLiquidityTaskReadinessState;
  topIntentId: AwakenSwapLiquidityTaskIntentId;
  primaryOwnerRole: AwakenSwapLiquidityTaskOwnerRole;
  boundary: LocalizedText;
}

export interface AwakenSwapLiquidityTaskReadiness {
  campaignId: string;
  summary: AwakenSwapLiquidityTaskReadinessSummary;
  rows: AwakenSwapLiquidityTaskReadinessRow[];
  ownerNextAction: LocalizedText;
  boundary: LocalizedText;
}

export interface ForecastCampaignTaskReadinessRow {
  id: string;
  intentId: ForecastCampaignTaskIntentId;
  label: LocalizedText;
  description: LocalizedText;
  verificationType: "DAPP_API";
  evidenceSource: ForecastCampaignTaskEvidenceSource;
  providerState: ForecastCampaignTaskProviderState;
  readinessState: ForecastCampaignTaskReadinessState;
  riskState: LocalizedText;
  ownerRole: ForecastCampaignTaskOwnerRole;
  nextAction: LocalizedText;
  boundary: LocalizedText;
}

export interface ForecastCampaignTaskReadinessSummary {
  totalTasks: number;
  readyCount: number;
  reviewRequiredCount: number;
  blockedCount: number;
  topState: ForecastCampaignTaskReadinessState;
  topIntentId: ForecastCampaignTaskIntentId;
  primaryOwnerRole: ForecastCampaignTaskOwnerRole;
  boundary: LocalizedText;
}

export interface ForecastCampaignTaskReadiness {
  campaignId: string;
  summary: ForecastCampaignTaskReadinessSummary;
  rows: ForecastCampaignTaskReadinessRow[];
  ownerNextAction: LocalizedText;
  boundary: LocalizedText;
}

export interface PayCampaignTaskReadinessRow {
  id: string;
  intentId: PayCampaignTaskIntentId;
  label: LocalizedText;
  description: LocalizedText;
  verificationType: "DAPP_API";
  evidenceSource: PayCampaignTaskEvidenceSource;
  providerState: PayCampaignTaskProviderState;
  readinessState: PayCampaignTaskReadinessState;
  riskState: LocalizedText;
  ownerRole: PayCampaignTaskOwnerRole;
  nextAction: LocalizedText;
  boundary: LocalizedText;
}

export interface PayCampaignTaskReadinessSummary {
  totalTasks: number;
  readyCount: number;
  reviewRequiredCount: number;
  blockedCount: number;
  topState: PayCampaignTaskReadinessState;
  topIntentId: PayCampaignTaskIntentId;
  primaryOwnerRole: PayCampaignTaskOwnerRole;
  boundary: LocalizedText;
}

export interface PayCampaignTaskReadiness {
  campaignId: string;
  summary: PayCampaignTaskReadinessSummary;
  rows: PayCampaignTaskReadinessRow[];
  ownerNextAction: LocalizedText;
  boundary: LocalizedText;
}

export interface TmrwdaoGovernanceTaskReadinessRow {
  id: string;
  intentId: TmrwdaoGovernanceTaskIntentId;
  label: LocalizedText;
  description: LocalizedText;
  verificationType: "DAPP_API";
  evidenceSource: TmrwdaoGovernanceTaskEvidenceSource;
  providerState: TmrwdaoGovernanceTaskProviderState;
  readinessState: TmrwdaoGovernanceTaskReadinessState;
  riskState: LocalizedText;
  ownerRole: TmrwdaoGovernanceTaskOwnerRole;
  nextAction: LocalizedText;
  boundary: LocalizedText;
}

export interface TmrwdaoGovernanceTaskReadinessSummary {
  totalTasks: number;
  readyCount: number;
  reviewRequiredCount: number;
  blockedCount: number;
  topState: TmrwdaoGovernanceTaskReadinessState;
  topIntentId: TmrwdaoGovernanceTaskIntentId;
  primaryOwnerRole: TmrwdaoGovernanceTaskOwnerRole;
  boundary: LocalizedText;
}

export interface TmrwdaoGovernanceTaskReadiness {
  campaignId: string;
  summary: TmrwdaoGovernanceTaskReadinessSummary;
  rows: TmrwdaoGovernanceTaskReadinessRow[];
  ownerNextAction: LocalizedText;
  boundary: LocalizedText;
}

export type CampaignMarketplaceReadinessLane =
  | "ready"
  | "review_required"
  | "blocked"
  | "local_preview";

export type CampaignMarketplaceConsumerSurfaceState =
  | "ready"
  | "review_required"
  | "not_configured";

export interface CampaignMarketplaceReadinessSummary {
  totalCampaigns: number;
  appHubReadyCount: number;
  portfolioReadyCount: number;
  forecastReadyCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  localPreviewCount: number;
  topCampaignId: string;
  topReadinessLane: CampaignMarketplaceReadinessLane;
  ownerNextAction: LocalizedText;
  boundary: LocalizedText;
}

export interface CampaignMarketplaceReadinessRow {
  campaignId: string;
  slug: string;
  title: LocalizedText;
  status: CampaignStatus;
  ctaKind: CampaignDiscoveryCtaKind;
  ctaLabel: LocalizedText;
  consumerSurfaces: CampaignDiscoveryConsumerSurface[];
  readinessLane: CampaignMarketplaceReadinessLane;
  readinessLabel: LocalizedText;
  readinessReason: LocalizedText;
  nextAction: LocalizedText;
  appHubState: CampaignMarketplaceConsumerSurfaceState;
  appHubNote: LocalizedText;
  portfolioState: CampaignMarketplaceConsumerSurfaceState;
  portfolioNote: LocalizedText;
  forecastState: CampaignMarketplaceConsumerSurfaceState;
  forecastNote: LocalizedText;
  points: number;
  timeWindow: LocalizedText;
  boundary: LocalizedText;
}

export interface CampaignMarketplaceReadiness {
  campaignId: string;
  participantWalletAddress: string;
  summary: CampaignMarketplaceReadinessSummary;
  rows: CampaignMarketplaceReadinessRow[];
  boundary: LocalizedText;
  ownerNextAction: LocalizedText;
}

export type PortfolioCampaignHistoryState =
  | "ready"
  | "in_progress"
  | "review_required"
  | "blocked"
  | "scheduled"
  | "archived";

export interface PortfolioCampaignHistorySummary {
  totalCampaigns: number;
  activeCount: number;
  historicalCount: number;
  reviewRequiredCount: number;
  blockerCount: number;
  exportReadyCount: number;
  totalPoints: number;
  topCampaignId: string;
  boundary: LocalizedText;
}

export interface PortfolioCampaignHistoryRow {
  campaignId: string;
  slug: string;
  title: LocalizedText;
  subtitle: LocalizedText;
  campaignStatus: CampaignStatus;
  portfolioState: PortfolioCampaignHistoryState;
  points: number;
  walletAddress: string;
  walletType: AccountType;
  walletSource: WalletSource;
  localePreference: SupportedLocale;
  eligibilityStatus: EligibilityStatus;
  eligibilityLabel: LocalizedText;
  missingTaskIds: string[];
  riskFlags: string[];
  rank: number | null;
  winnerExportStatus: UserWinnersExportStatus;
  winnerExportStatusLabel: LocalizedText;
  exportBatchId?: string;
  nextAction: LocalizedText;
  boundary: LocalizedText;
  timeWindow: LocalizedText;
}

export interface PortfolioCampaignHistoryReadModel {
  campaignId: string;
  participantId: string;
  participantWalletAddress: string;
  summary: PortfolioCampaignHistorySummary;
  rows: PortfolioCampaignHistoryRow[];
  boundary: LocalizedText;
  nextAction: LocalizedText;
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

export interface ExportFulfillmentSummary {
  status: ExportReadinessState;
  packageCount: number;
  readyPackages: number;
  readyRows: number;
  reviewRequiredRows: number;
  blockedRows: number;
  requiredAcknowledgements: number;
  acknowledgedItems: number;
  ownerApproved: boolean;
  operatorReviewed: boolean;
}

export interface ExportFulfillmentPackage {
  id: string;
  format: ExportPreviewMode;
  fileName: string;
  mimeType: string;
  checksum: string;
  checksumAlgorithm: string;
  payloadBytes: number;
  totalRows: number;
  readyRows: number;
  reviewRequiredRows: number;
  blockedRows: number;
  includedColumns: readonly ExportCsvColumn[];
  handoffReady: boolean;
  downloadAvailable: false;
  storageBacked: false;
}

export interface ExportFulfillmentApproval {
  ownerRole: "project_owner";
  ownerApproved: boolean;
  operatorReviewed: boolean;
  acknowledgements: ExportAcknowledgement[];
  requiredAcknowledgements: number;
  acknowledgedItems: number;
  nextAction: LocalizedText;
}

export interface ExportFulfillmentSafety {
  localOnly: true;
  noDownloadUrl: true;
  noStorageWrite: true;
  noContractRoot: true;
  noContractTransaction: true;
  noRewardCustody: true;
  noRewardDistribution: true;
  forbiddenFieldsAbsent: boolean;
  boundary: LocalizedText;
}

export interface ExportFulfillmentReadiness {
  campaignId: string;
  batchId: string;
  summary: ExportFulfillmentSummary;
  packages: ExportFulfillmentPackage[];
  approval: ExportFulfillmentApproval;
  safety: ExportFulfillmentSafety;
  boundary: LocalizedText;
  nextAction: LocalizedText;
}

export type ExportStorageApprovalCheckId =
  | "storage-provider-approval"
  | "csv-column-contract"
  | "wallet-locale-coverage"
  | "access-control"
  | "retention-privacy"
  | "audit-logging"
  | "rollback-plan"
  | "owner-signoff"
  | "operator-approval";

export interface ExportStorageApprovalCheck {
  id: ExportStorageApprovalCheckId;
  label: LocalizedText;
  state: ExportReadinessState;
  riskLevel: RiskLevel;
  ownerRole: OwnerRole;
  dependency: LocalizedText;
  evidenceRequired: LocalizedText;
  residualRisk: LocalizedText;
  nextAction: LocalizedText;
  sourceSurface: LocalizedText;
}

export interface ExportStorageFulfillmentApprovalSummary {
  totalChecks: number;
  readyChecks: number;
  reviewRequiredChecks: number;
  blockedChecks: number;
  approvalBlocked: boolean;
  storageWriteEnabled: false;
  downloadUrlEnabled: false;
  topCheckId: ExportStorageApprovalCheckId | null;
  topNextAction: LocalizedText;
  highestRiskLevel: RiskLevel;
}

export interface ExportStorageColumnCoverage {
  columns: readonly ExportCsvColumn[];
  expectedColumns: readonly ExportCsvColumn[];
  exactOrder: boolean;
  walletTypeIncluded: boolean;
  walletSourceIncluded: boolean;
  localePreferenceIncluded: boolean;
  riskFlagsIncluded: boolean;
  taskEvidenceIncluded: boolean;
  missingColumns: readonly ExportCsvColumn[];
  extraColumns: readonly string[];
  boundary: LocalizedText;
}

export interface ExportStorageSafetyBoundary {
  noStorageWrite: true;
  noDownloadUrl: true;
  noRealExportFile: true;
  noObjectKey: true;
  noSignedUrl: true;
  noContractRootWrite: true;
  noWalletSigning: true;
  noRewardCustody: true;
  noRewardDistribution: true;
  forbiddenFieldsAbsent: boolean;
  boundary: LocalizedText;
}

export interface ExportStorageFulfillmentApprovalReadiness {
  campaignId: string;
  batchId: string;
  sourceFulfillmentStatus: ExportReadinessState;
  summary: ExportStorageFulfillmentApprovalSummary;
  checks: ExportStorageApprovalCheck[];
  columnCoverage: ExportStorageColumnCoverage;
  safety: ExportStorageSafetyBoundary;
  boundary: LocalizedText;
  nextAction: LocalizedText;
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
  localeReadiness: LocaleStatusMap;
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

export interface ApiSkillInvocationSafety {
  localOnly: true;
  seededDataOnly: true;
  noLiveApi: true;
  noWalletSignature: true;
  noSecretHandling: true;
  noContractWrite: true;
  noExportFile: true;
  noStorageWrite: true;
  noRewardCustody: true;
  noRewardDistribution: true;
}

export interface ApiSkillInvocationContractMetadata {
  id: ApiSkillId;
  apiGroup: ApiSkillApiGroup;
  readiness: ApiSkillContractReadiness;
  riskLevel: ApiSkillRiskLevel;
  title: LocalizedText;
  purpose: LocalizedText;
  securityBoundary: LocalizedText;
  nextAction: LocalizedText;
}

export type ApiSkillInvocationErrorCode =
  | "INVALID_SKILL"
  | "SKILL_NOT_AVAILABLE"
  | string;

export interface ApiSkillInvocationError {
  code: ApiSkillInvocationErrorCode;
  field?: string;
  message: LocalizedText;
}

export interface ApiSkillInvocationRequest {
  skillId: ApiSkillId | (string & {});
  payload?: unknown;
  requestSource?: "agent" | "project_console" | "test_fixture" | (string & {});
}

interface ApiSkillInvocationEnvelopeBase {
  skillId: ApiSkillId | (string & {});
  traceId: string;
  readiness: ApiSkillContractReadiness;
  riskLevel: ApiSkillRiskLevel;
  apiGroup?: ApiSkillApiGroup;
  contract?: ApiSkillInvocationContractMetadata;
  boundary: LocalizedText;
  safety: ApiSkillInvocationSafety;
}

export interface ApiSkillInvocationSuccess<TPayload = unknown> extends ApiSkillInvocationEnvelopeBase {
  ok: true;
  payload: TPayload;
  error?: never;
}

export interface ApiSkillInvocationFailure extends ApiSkillInvocationEnvelopeBase {
  ok: false;
  error: ApiSkillInvocationError;
  payload?: never;
}

export type ApiSkillInvocationEnvelope<TPayload = unknown> =
  | ApiSkillInvocationSuccess<TPayload>
  | ApiSkillInvocationFailure;

export interface ApiSkillInvocationCoverage {
  requiredSkillIds: readonly ApiSkillId[];
  registeredSkillIds: ApiSkillId[];
  routedSkillIds: ApiSkillId[];
  missingContractSkillIds: ApiSkillId[];
  missingRouterSkillIds: ApiSkillId[];
  readyCount: number;
  localOnlyCount: number;
  reviewRequiredCount: number;
  blockedCount: number;
  highRiskCount: number;
  sampleInvocationIds: ApiSkillId[];
  boundary: LocalizedText;
  safety: ApiSkillInvocationSafety;
}

export type ApiUsageConsumerTier =
  | "internal_ops"
  | "ecosystem_partner"
  | "external_partner"
  | "public_api_future";
export type ApiUsageCommercialModel =
  | "free_ecosystem_mode"
  | "partner_campaign_fee"
  | "premium_analytics"
  | "api_usage";
export type ApiUsageReadinessState = "local_ready" | "review_required" | "blocked";
export type ApiUsagePrerequisiteState =
  | "not_started"
  | "review_required"
  | "blocked"
  | "local_ready";
export type ApiUsageOwnerRole =
  | "project_owner"
  | "internal_operator"
  | "commercial_reviewer"
  | "security_reviewer"
  | "billing_reviewer";
export type ApiUsageReviewState =
  | "not_started"
  | "in_review"
  | "blocked"
  | "ready_for_future_approval";
export type ApiUsagePrerequisiteId =
  | "auth_key_readiness"
  | "quota_policy"
  | "metering_status"
  | "rate_limit_policy"
  | "billing_handoff";

export interface ApiUsagePrerequisite {
  id: ApiUsagePrerequisiteId;
  label: LocalizedText;
  state: ApiUsagePrerequisiteState;
  evidence: LocalizedText;
  nextAction: LocalizedText;
}

export interface ApiUsageCommercializationCandidate {
  skillId: ApiSkillId;
  label: LocalizedText;
  description: LocalizedText;
  consumerTier: ApiUsageConsumerTier;
  commercialModel: ApiUsageCommercialModel;
  readiness: ApiUsageReadinessState;
  riskLevel: ApiSkillRiskLevel;
  authKeyReadiness: ApiUsagePrerequisite;
  quotaPolicy: ApiUsagePrerequisite;
  meteringStatus: ApiUsagePrerequisite;
  rateLimitPolicy: ApiUsagePrerequisite;
  billingHandoff: ApiUsagePrerequisite;
  ownerRole: ApiUsageOwnerRole;
  reviewState: ApiUsageReviewState;
  evidence: LocalizedText;
  nextAction: LocalizedText;
  boundary: LocalizedText;
}

export interface ApiUsageCommercializationSummary {
  totalCandidates: number;
  productionReadyCount: number;
  reviewRequiredCount: number;
  blockedCount: number;
  highRiskCount: number;
  billingHandoffCount: number;
  missingCandidateCount: number;
  topNextAction: LocalizedText;
  rewardBoundary: LocalizedText;
}

export interface ApiUsageCommercializationReadinessSurface {
  summary: ApiUsageCommercializationSummary;
  candidates: ApiUsageCommercializationCandidate[];
  missingCandidateIds: ApiSkillId[];
  boundary: LocalizedText;
  rewardBoundary: LocalizedText;
  nextAction: LocalizedText;
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

export type CompetitorWatchSignalCategory =
  | "generic_quest_platform"
  | "onchain_activation"
  | "community_intelligence"
  | "growth_infrastructure";
export type CompetitorWatchDifferentiator =
  | "wallet_support"
  | "ecosystem_conversion"
  | "verified_actions"
  | "user_quality"
  | "project_owned_rewards";
export type CompetitorWatchOwnerRole =
  | "growth_lead"
  | "internal_operator"
  | "project_owner"
  | "risk_reviewer";
export type CompetitorWatchReviewState = "ready" | "review_required" | "blocked";

export interface CompetitorWatchSignal {
  id: string;
  category: CompetitorWatchSignalCategory;
  platformLabel: LocalizedText;
  observedPattern: LocalizedText;
  aelfImplication: LocalizedText;
  differentiators: CompetitorWatchDifferentiator[];
  evidenceBasis: LocalizedText;
  ownerRole: CompetitorWatchOwnerRole;
  reviewState: CompetitorWatchReviewState;
  guardrail: LocalizedText;
  nextAction: LocalizedText;
}

export interface CompetitorWatchSummary {
  totalSignals: number;
  readyCount: number;
  reviewRequiredCount: number;
  blockedCount: number;
  differentiatorCount: number;
  topSignalId: string;
  topNextAction: LocalizedText;
}

export interface CompetitorWatchSurface {
  campaignId: string;
  summary: CompetitorWatchSummary;
  signals: CompetitorWatchSignal[];
  boundary: LocalizedText;
  nextAction: LocalizedText;
}

export type StateComponentFamilyId =
  | "campaign"
  | "task_verification"
  | "eligibility"
  | "i18n_content"
  | "wallet_qa"
  | "export_modal"
  | "toast_notification"
  | "blocked_publish";
export type StateComponentReadiness = "covered" | "review_required" | "blocked";

export interface StateComponentExample {
  id: string;
  label: LocalizedText;
  meaning: LocalizedText;
  userMessage: LocalizedText;
  nextAction: LocalizedText;
  ownerRole: OwnerRole;
  readiness: StateComponentReadiness;
  sourceReference: string;
}

export interface StateComponentFamily {
  id: StateComponentFamilyId;
  label: LocalizedText;
  description: LocalizedText;
  ownerRole: OwnerRole;
  sourceReference: string;
  examples: StateComponentExample[];
}

export interface StateComponentsDeliveryGallerySummary {
  totalFamilies: number;
  totalExamples: number;
  coveredCount: number;
  reviewRequiredCount: number;
  blockedCount: number;
  topNextAction: LocalizedText;
}

export interface StateComponentsDeliveryGallery {
  generatedAt: string;
  summary: StateComponentsDeliveryGallerySummary;
  families: StateComponentFamily[];
  boundary: LocalizedText;
  sourceReferences: string[];
}

export interface AdminOpsReadModel {
  campaignId: string;
  reviewQueue: ReviewItem[];
  deliveryAcceptance: DeliveryAcceptanceConsole;
  residualGapMissionQueue: ResidualGapMissionQueue;
  p1LocaleActivationReadiness: P1LocaleActivationReadiness;
  deliveryChecklistReadiness: DeliveryChecklistReadinessConsole;
  walletProviderQaGate: WalletProviderQaReadinessGate;
  walletProviderEvidenceIntake: WalletProviderEvidenceIntake;
  walletProviderEvidenceApprovalAudit: WalletProviderEvidenceApprovalAudit;
  walletProviderEvidenceReleaseReadiness: WalletProviderEvidenceReleaseReadiness;
  walletProviderEvidenceCloseoutPackage: WalletProviderEvidenceCloseoutPackage;
  walletProviderEvidenceRequestPacket: WalletProviderEvidenceRequestPacket;
  walletProviderEvidenceActivation: WalletProviderEvidenceActivation;
  aelfWebLoginAdapterReadiness: AelfWebLoginAdapterReadinessModel;
  providerEvidenceRegistry: ProviderEvidenceRegistry;
  contractReviewCenter: AdminContractReviewCenter;
  contractInterfaceMatrix: ContractInterfaceMatrixConsole;
  contractTransparencyMonitor: ContractTransparencyMonitor;
  contractClaimPreapprovalPackage: ContractClaimPreapprovalPackage;
  companionContractReadiness: CompanionContractReadiness;
  pointsRankingReferralReadiness: PointsRankingReferralServiceReadiness;
  aiContentPack: AiContentPackWorkbench;
  templateGovernance: TemplateGovernanceConsole;
  analytics: AnalyticsKpi[];
  funnel: ConversionFunnelStep[];
  walletSplit: DimensionSplit[];
  localeSplit: DimensionSplit[];
  advancedAnalytics: AdvancedAnalyticsReadinessSurface;
  riskSignals: RiskSignal[];
  riskIntelligence: RiskIntelligenceReviewSurface;
  antiSybilV2GraphReadiness: AntiSybilV2GraphReadiness;
  launchConsoleCampaignBundles: LaunchConsoleCampaignBundleSurface;
  aiReports: AiOpsReportCard[];
  aiOptimization: AiOptimizationWorkflow;
  aiReportHandoff: AiOpsReportHandoffSurface;
  competitorWatch: CompetitorWatchSurface;
  apiUsageCommercializationReadiness: ApiUsageCommercializationReadinessSurface;
  ecosystemMetrics: EcosystemMetricRow[];
  exportBatch: ExportBatchSummary;
  exportFulfillmentReadiness: ExportFulfillmentReadiness;
  exportStorageFulfillmentApprovalReadiness: ExportStorageFulfillmentApprovalReadiness;
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

export type EligibilityCheckerInspectionMode = "address_only" | "verified_session";

export interface EligibilityCheckResult {
  walletAddress: string;
  knownParticipant: boolean;
  participantId?: string;
  inspectionMode: EligibilityCheckerInspectionMode;
  localePreference?: SupportedLocale;
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

export interface VerificationRulesProviderEvidenceSummary {
  totalEntries: number;
  localOnlyEntries: number;
  reviewRequiredEntries: number;
  blockedEntries: number;
  unavailableEntries: number;
  launchBlockers: number;
}

export interface VerificationRulesWorkspaceSummary {
  totalRulePaths: number;
  seededReadyPaths: number;
  missingLiveEvidencePaths: number;
  blockedPaths: number;
  manualReviewPaths: number;
  affectedOutcomeCount: number;
  providerEvidenceEntries: number;
  providerLaunchBlockers: number;
}

export interface VerificationRulesWorkspace {
  campaignId: string;
  summary: VerificationRulesWorkspaceSummary;
  pipeline: VerificationPipelineReadinessGate;
  providerEvidenceEntries: ProviderEvidenceRegistryEntry[];
  providerEvidenceSummary: VerificationRulesProviderEvidenceSummary;
  eligibilityImpact: VerificationPipelineEligibilityImpact;
  topRulePathId: VerificationPipelinePathId;
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

export type ParticipantWorkspaceNextActionPriority = "primary" | "secondary" | "review";

export interface ParticipantWorkspaceTaskRow {
  taskId: string;
  title: LocalizedText;
  status: TaskVerificationStatus;
  pointsAwarded: number;
  pointsAvailable: number;
  evidenceSource: EvidenceSource;
  missingRequired: boolean;
  nextAction: LocalizedText;
  riskFlags: string[];
}

export interface ParticipantWorkspaceTaskBuckets {
  completed: ParticipantWorkspaceTaskRow[];
  pending: ParticipantWorkspaceTaskRow[];
  review: ParticipantWorkspaceTaskRow[];
  missingRequired: ParticipantWorkspaceTaskRow[];
}

export interface ParticipantWorkspaceSummary {
  requiredProgressPercent: number;
  totalProgressPercent: number;
  completedRequiredTasks: number;
  totalRequiredTasks: number;
  completedTasks: number;
  totalTasks: number;
  currentPoints: number;
  pointsThreshold: number;
  participantRank: number | null;
  eligibleRankCutoff: number;
  qualifiedInvitees: number;
  referralPoints: number;
  riskFlagCount: number;
  reviewRequired: boolean;
}

export interface ParticipantWorkspacePoints {
  currentPoints: number;
  pointsThreshold: number;
  participantRank: number | null;
  eligibleRankCutoff: number;
  progressPercent: number;
  ledgerState: "seeded_preview";
  boundary: LocalizedText;
}

export interface ParticipantWorkspaceReferral {
  inviteLink: string;
  rawInvites: number;
  qualifiedInvitees: number;
  referralPoints: number;
  antiFarmRule: LocalizedText;
  riskFlags: string[];
  boundary: LocalizedText;
}

export interface ParticipantWorkspaceNextAction {
  id: string;
  priority: ParticipantWorkspaceNextActionPriority;
  label: LocalizedText;
  reason: LocalizedText;
  relatedTaskId?: string;
}

export interface ParticipantWorkspaceReadModel {
  campaignId: string;
  participantId: string;
  walletAddress: string;
  summary: ParticipantWorkspaceSummary;
  taskBuckets: ParticipantWorkspaceTaskBuckets;
  points: ParticipantWorkspacePoints;
  referral: ParticipantWorkspaceReferral;
  nextActions: ParticipantWorkspaceNextAction[];
  boundary: LocalizedText;
  rewardBoundary: LocalizedText;
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
