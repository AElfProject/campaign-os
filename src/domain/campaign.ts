import type {
  AdvancedAnalyticsCohortSegment,
  AdvancedAnalyticsCostEfficiency,
  AdvancedAnalyticsPremiumReport,
  AdvancedAnalyticsProductConversion,
  AdvancedAnalyticsQualitySignal,
  AdvancedAnalyticsReadinessState,
  AdvancedAnalyticsReadinessSurface,
  AdvancedAnalyticsRetentionWindow,
  AdminOpsReadModel,
  AiOptimizationAction,
  AiOptimizationActionStatus,
  AiOptimizationMetricTone,
  AiOptimizationOwnerRole,
  AiOptimizationReportCategory,
  AiOptimizationReportGroup,
  AiOptimizationSourceMetric,
  AiOptimizationWorkflow,
  AiContentArtifact,
  AiContentArtifactDraft,
  AiContentArtifactLifecycle,
  AiContentPackSummary,
  AiContentPackWorkbench,
  AiContentQualityGate,
  AnalyticsExportDecision,
  AnalyticsKpi,
  AdminContractReviewCenter,
  CampaignMetadataField,
  CampaignSettingsGroup,
  CampaignSettingsReadiness,
  CampaignSettingsReadinessState,
  CampaignShareCardReadiness,
  CampaignCommandCenterSummary,
  CampaignCommandItem,
  CampaignCommandPriority,
  CampaignLifecycleBlockingCheck,
  CampaignLifecycleCheckSource,
  CampaignLifecycleCheckState,
  CampaignLifecycleGateGroup,
  CampaignLifecycleGateGroupId,
  CampaignLifecycleOperation,
  CampaignLifecycleOperations,
  CampaignLifecycleStatus,
  CampaignStatus,
  CampaignDiscoveryConsumerSurface,
  CampaignDiscoveryCta,
  CampaignDiscoveryCtaKind,
  CampaignDiscoveryDetail,
  CampaignDiscoveryItem,
  CampaignDiscoveryReadModel,
  CampaignDiscoveryTaskSummary,
  ConversionFunnelStep,
  CampaignShellDetail,
  CampaignTask,
  ContentRevision,
  ContractImpactReviewModel,
  ContractImpactReviewOption,
  ContractChangeMatrixRow,
  ContractReviewChecklistItem,
  ContractMode,
  ContractEvolutionStep,
  ContractInterfaceGroup,
  ContractInterfaceMatrixConsole,
  ContractInterfaceMethod,
  ContractInterfacePhase,
  ContractInterfaceReadiness,
  ContractTransparencyCloseoutContext,
  ContractTransparencyLane,
  ContractTransparencyLaneId,
  ContractTransparencyMonitor,
  ContractTransparencyReadiness,
  DeliveryChecklistGroup,
  DeliveryChecklistGroupId,
  DeliveryChecklistItem,
  DeliveryChecklistReadinessConsole,
  DeliveryChecklistStatus,
  DimensionSplit,
  EligibilityResult,
  EcosystemProduct,
  EcosystemNextActionProduct,
  EcosystemNextActionRecommendation,
  EcosystemNextActionReadModel,
  EcosystemRecommendationPriority,
  EcosystemRecommendationStatus,
  ExportAcknowledgement,
  ExportArtifact,
  ExportConfirmation,
  ExportConfirmationReadinessGate,
  ExportContractRootReadiness,
  ExportContractRootMode,
  ExportCsvColumn,
  ExportBatchSummary,
  ExportEvidenceRow,
  ExportFieldCoverage,
  EvidenceSource,
  ExportPreviewMode,
  ExportPreviewModeReadiness,
  ExportPreview,
  ExportPreviewRow,
  ExportReadinessState,
  ExportRowReasonCode,
  ExportRowStatusReason,
  EligibilityCheckerReadModel,
  EligibilityCheckEntry,
  EligibilityCheckResult,
  EligibilityMissingTaskDetail,
  ApiSkillContract,
  ApiSkillId,
  LaunchConsoleBundleOwnerRole,
  LaunchConsoleBundleStatus,
  LaunchConsoleCampaignBundle,
  LaunchConsoleCampaignBundleSurface,
  LaunchConsoleGateEvidence,
  LaunchConsoleGateSource,
  LaunchConsoleGateState,
  LaunchConsoleHandoffContract,
  LaunchConsoleHandoffReviewState,
  LaunchConsoleTaskBuildingBlock,
  RiskIntelligenceCategory,
  RiskIntelligenceDimension,
  RiskIntelligenceOwnerRole,
  RiskIntelligenceReviewState,
  RiskIntelligenceReviewSurface,
  RiskSignal,
  TaskVerificationAction,
  TaskVerificationActionKind,
  TaskVerificationActionProof,
  TaskVerificationActionResult,
  TaskVerificationProofType,
  TaskEvidenceSummary,
  LeaderboardMode,
  LeaderboardModeId,
  LeaderboardModeRow,
  LeaderboardReadModel,
  LeaderboardRow,
  LocaleAnalyticsMetric,
  LocaleAnalyticsReadinessRow,
  LocalizedText,
  OwnerRole,
  P1LocaleCode,
  P1LocaleExpansionReadiness,
  P1LocaleExpansionReadinessRow,
  ParticipationMetrics,
  ParticipantWorkspaceNextAction,
  ParticipantWorkspaceReadModel,
  ParticipantWorkspaceTaskRow,
  ParticipantOperationsExportStatus,
  ParticipantOperationsReadModel,
  ParticipantOperationsRow,
  ParticipationReadModel,
  ParticipantSnapshot,
  ParticipantTaskState,
  PostCampaignCloseout,
  PostCampaignCloseoutGate,
  PostCampaignCloseoutOwnerRole,
  PostCampaignCloseoutStatus,
  PostCampaignRetrospective,
  ProviderAdapterReadinessContract,
  ProviderAffectedOutcome,
  ProviderEvidenceCategory,
  ProviderEvidenceRegistry,
  ProviderEvidenceRegistryEntry,
  ProviderFallbackMode,
  ProviderFallbackSemantics,
  ProviderFeatureGateIntent,
  ProviderFeatureGateState,
  ProviderSeededCoverageStatus,
  ProjectCampaignCommandCenter,
  ProjectPortfolioCommercialOwnerRole,
  ProjectPortfolioCommercialReadiness,
  ProjectPortfolioMetricId,
  PublishState,
  PublishReadiness,
  ReferralSummary,
  RewardDisclaimerReviewRow,
  ReviewSeverity,
  TaskVerificationStatus,
  SupportedLocale,
  VerificationCoverageSummary,
  VerificationAffectedOutcome,
  VerificationEvidence,
  VerificationEvidenceSource,
  VerificationLiveEvidenceStatus,
  VerificationPipelinePath,
  VerificationPipelinePathId,
  VerificationPipelineReadinessGate,
  VerificationProviderId,
  VerificationProviderReadiness,
  VerificationProviderState,
  VerificationReleaseImpact,
  VerificationSeededCoverageStatus,
  TranslationCompareField,
  TranslationComparisonRow,
  TranslationLocaleItem,
  TranslationManagerReadModel,
  TranslationReviewPanel,
  UserWinnersExportRow,
  UserWinnersExportStatus,
  UserWinnersExportStatusReadModel,
  WalletProviderQaReadinessGate,
  WalletProviderQaScenarioId,
} from "./types";
import {
  createAelfWebLoginAdapterReadiness,
  createWalletProviderQaReadinessGate,
  deriveEligibilityWalletStatus,
  isWalletSessionVerified,
} from "./wallet";
import {
  EXPORT_CSV_COLUMNS as exportCsvColumns,
  campaignLifecycleStatuses,
  supportedLocales,
} from "./types";
import { createApiSkillContractSurface } from "./apiSkillContracts";
import { createTemplateGovernanceConsole } from "./builder";
import { createLocalizedCampaignPath } from "./locale";

const defaultPointsThreshold = 160;
const defaultEligibleRankCutoff = 100;
const exportBatchId = "export-awaken-sprint-preview";

const localized = (enUS: string, zhCN: string, zhTW = enUS): LocalizedText => ({
  "en-US": enUS,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
});

const defaultReferralRule: LocalizedText = {
  "en-US": "Only qualified invitees who complete valid tasks count for referral points.",
  "zh-CN": "只有完成有效任务的合格被邀请人才会计入推荐积分。",
  "zh-TW": "Only qualified invitees who complete valid tasks count for referral points.",
};

const rewardBoundary: LocalizedText = {
  "en-US": "Rewards are provided by the campaign project. Export winners does not distribute rewards.",
  "zh-CN": "奖励由活动项目方提供。导出 winners 不等于发奖。",
  "zh-TW": "Rewards are provided by the campaign project. Export winners does not distribute rewards.",
};

const exportRiskBoundary: LocalizedText = {
  "en-US": "Risk flags and eligibility results are review inputs; Campaign OS does not distribute rewards.",
  "zh-CN": "风险标记与资格结果仅作为审核输入；Campaign OS 不执行发奖。",
  "zh-TW": "Risk flags and eligibility results are review inputs; Campaign OS does not distribute rewards.",
};

export const exportArtifactBoundary: LocalizedText = {
  "en-US":
    "Local export artifact only. Campaign OS creates an in-memory review payload with no download URL, storage write, contract root, contract transaction, reward custody, or reward distribution.",
  "zh-CN":
    "仅本地导出 artifact。Campaign OS 只生成内存中的审核 payload，不生成下载链接、存储写入、合约 root、合约交易、奖励托管或发奖。",
  "zh-TW":
    "Local export artifact only. Campaign OS creates an in-memory review payload with no download URL, storage write, contract root, contract transaction, reward custody, or reward distribution.",
};

const exportFulfillmentOwner: LocalizedText = {
  "en-US": "Final reward distribution is handled by the campaign project.",
  "zh-CN": "最终奖励发放由活动项目方处理。",
  "zh-TW": "Final reward distribution is handled by the campaign project.",
};

const userWinnersExportStatusLabels: Record<UserWinnersExportStatus, LocalizedText> = {
  ready: {
    "en-US": "Ready for export",
    "zh-CN": "导出就绪",
    "zh-TW": "Ready for export",
  },
  review_required: {
    "en-US": "Manual review required",
    "zh-CN": "需要人工审核",
    "zh-TW": "Manual review required",
  },
  blocked: {
    "en-US": "Blocked before export",
    "zh-CN": "导出前阻断",
    "zh-TW": "Blocked before export",
  },
  pending: {
    "en-US": "Pending verification",
    "zh-CN": "等待验证",
    "zh-TW": "Pending verification",
  },
};

const eligibilityCheckerBoundary: LocalizedText = {
  "en-US": "Seeded/local eligibility preview only. No live wallet SDK, signature, indexer, dApp API, contract proof, export file, or reward distribution is executed.",
  "zh-CN": "仅 seeded/本地资格预览。不会执行实时钱包 SDK、签名、indexer、dApp API、合约证明、导出文件或发奖。",
  "zh-TW": "Seeded/local eligibility preview only. No live wallet SDK, signature, indexer, dApp API, contract proof, export file, or reward distribution is executed.",
};

export const verificationBoundary: LocalizedText = {
  "en-US":
    "Seeded/local verification boundary only. No live AeFinder, AelfScan, dApp API, social API, wallet SDK, reward distribution, export file, secret storage, or contract write is executed.",
  "zh-CN":
    "仅 seeded/本地验证边界。不会执行实时 AeFinder、AelfScan、dApp API、社交 API、钱包 SDK、发奖、导出文件、secret 存储或合约写入。",
  "zh-TW":
    "Seeded/local verification boundary only. No live AeFinder, AelfScan, dApp API, social API, wallet SDK, reward distribution, export file, secret storage, or contract write is executed.",
};

const leaderboardBoundary: LocalizedText = {
  "en-US": "Seeded/local leaderboard preview only. Rankings are review inputs; Campaign OS does not distribute rewards and the campaign project owns fulfillment.",
  "zh-CN": "仅 seeded/本地排行榜预览。排名是审核输入；Campaign OS 不执行发奖，奖励履约由活动项目方负责。",
  "zh-TW": "Seeded/local leaderboard preview only. Rankings are review inputs; Campaign OS does not distribute rewards and the campaign project owns fulfillment.",
};

const noAutoPublishNotice: LocalizedText = {
  "en-US": "AI generated translation cannot auto-publish before human review.",
  "zh-CN": "AI 生成翻译必须经过人工审核后才能发布。",
  "zh-TW": "AI generated translation cannot auto-publish before human review.",
};

const verificationActionText = (
  enUS: string,
  zhCN: string,
  zhTW: string = enUS,
): LocalizedText => ({
  "en-US": enUS,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
});

const aiOptimizationBoundary: LocalizedText = {
  "en-US":
    "Seeded/local AI optimization workflow only. No live AI provider, analytics SDK, risk scoring, export file, wallet action, contract transaction, reward custody, or reward distribution is executed.",
  "zh-CN":
    "仅 seeded/本地 AI 优化工作流。不会执行实时 AI、分析 SDK、风险评分、导出文件、钱包动作、合约交易、奖励托管或发奖。",
  "zh-TW":
    "Seeded/local AI optimization workflow only. No live AI provider, analytics SDK, risk scoring, export file, wallet action, contract transaction, reward custody, or reward distribution is executed.",
};

const advancedAnalyticsBoundary: LocalizedText = {
  "en-US":
    "Seeded/local advanced analytics readiness only. No live analytics SDK, event warehouse, billing, wallet action, contract transaction, export file, reward custody, reward distribution, raw PII, IP/device fingerprint, or automatic enforcement is executed.",
  "zh-CN":
    "仅 seeded/本地高级分析准备度。不会执行实时 analytics SDK、事件仓库、billing、钱包动作、合约交易、导出文件、奖励托管、发奖、原始 PII、IP/设备指纹或自动处罚。",
  "zh-TW":
    "Seeded/local advanced analytics readiness only. No live analytics SDK, event warehouse, billing, wallet action, contract transaction, export file, reward custody, reward distribution, raw PII, IP/device fingerprint, or automatic enforcement is executed.",
};

const riskIntelligenceBoundary: LocalizedText = {
  "en-US":
    "Risk flags are review inputs only. Campaign OS does not automatically ban wallets, exclude winners, approve exports, distribute rewards, reveal private thresholds, or expose raw IP/device/session data.",
  "zh-CN":
    "风险标记仅作为审核输入。Campaign OS 不会自动封禁钱包、剔除 winners、批准导出、发奖、暴露私有阈值或展示原始 IP/设备/会话数据。",
  "zh-TW":
    "Risk flags are review inputs only. Campaign OS does not automatically ban wallets, exclude winners, approve exports, distribute rewards, reveal private thresholds, or expose raw IP/device/session data.",
};

const launchConsoleBundleBoundary: LocalizedText = {
  "en-US":
    "Seeded/local Launch Console campaign bundle preview only. No live Launch Console, backend, scheduler, external API, wallet signing, contract write, export file, reward custody, or reward distribution is executed.",
  "zh-CN":
    "仅 seeded/本地 Launch Console 活动包预览。不会执行实时 Launch Console、后端、排期器、外部 API、钱包签名、合约写入、导出文件、奖励托管或发奖。",
  "zh-TW":
    "Seeded/local Launch Console campaign bundle preview only. No live Launch Console, backend, scheduler, external API, wallet signing, contract write, export file, reward custody, or reward distribution is executed.",
};

const compareReviewPrompt: LocalizedText = {
  "en-US": "Compare Chinese locale drafts with the English source before marking them reviewed or publishing a revision.",
  "zh-CN": "标记已审核或发布版本前，先将中文语言草稿与英文源内容对照。",
  "zh-TW": "Compare Chinese locale drafts with the English source before marking them reviewed or publishing a revision.",
};

const aiContentBoundary = {
  title: {
    "en-US": "No auto-publish boundary",
    "zh-CN": "禁止自动发布边界",
    "zh-TW": "No auto-publish boundary",
  },
  body: {
    "en-US": "Seeded/local content pack only. No live AI provider, scheduler, channel bot, webhook, or external publish action is connected.",
    "zh-CN": "仅 seeded/本地内容包。不会连接实时 AI、排期器、频道机器人、webhook 或外部发布动作。",
    "zh-TW": "Seeded/local content pack only. No live AI provider, scheduler, channel bot, webhook, or external publish action is connected.",
  },
};

const aiContentDraftBlockedReason: LocalizedText = {
  "en-US": "Human review required before copy can be scheduled or published.",
  "zh-CN": "排期或发布前必须完成人工审核。",
  "zh-TW": "Human review required before copy can be scheduled or published.",
};

const aiContentApprovedNextAction: LocalizedText = {
  "en-US": "Copy ready; schedule/publish intent remains local until an operator confirms the external channel.",
  "zh-CN": "可复制；排期/发布意图仍为本地状态，直到运营确认外部渠道。",
  "zh-TW": "Copy ready; schedule/publish intent remains local until an operator confirms the external channel.",
};

const aiContentDraftNextAction: LocalizedText = {
  "en-US": "Edit and mark reviewed before release intent.",
  "zh-CN": "先编辑并标记已审核，再进入发布意图。",
  "zh-TW": "Edit and mark reviewed before release intent.",
};

const aiContentEditedNextAction: LocalizedText = {
  "en-US": "Human approval is still required before release intent.",
  "zh-CN": "进入发布意图前仍需要人工批准。",
  "zh-TW": "Human approval is still required before release intent.",
};

const localeLabels: Record<ContentRevision["locale"], LocalizedText> = {
  "en-US": {
    "en-US": "English source",
    "zh-CN": "英文源内容",
    "zh-TW": "English source",
  },
  "zh-CN": {
    "en-US": "Chinese draft",
    "zh-CN": "中文草稿",
    "zh-TW": "Chinese draft",
  },
  "zh-TW": {
    "en-US": "Traditional Chinese fallback",
    "zh-CN": "繁体中文回退",
    "zh-TW": "Traditional Chinese fallback",
  },
};

const comparisonFieldLabels: Record<TranslationCompareField, LocalizedText> = {
  description: {
    "en-US": "Description",
    "zh-CN": "活动描述",
    "zh-TW": "Description",
  },
  rewardDisclaimer: {
    "en-US": "Reward disclaimer",
    "zh-CN": "奖励声明",
    "zh-TW": "Reward disclaimer",
  },
  socialPost: {
    "en-US": "Social post",
    "zh-CN": "社交文案",
    "zh-TW": "Social post",
  },
  title: {
    "en-US": "Campaign title",
    "zh-CN": "活动标题",
    "zh-TW": "Campaign title",
  },
};

const comparisonFields: TranslationCompareField[] = [
  "title",
  "description",
  "socialPost",
  "rewardDisclaimer",
];

const missingTargetDraft: LocalizedText = {
  "en-US": "Missing target draft; English fallback is active until translation review is complete.",
  "zh-CN": "缺少目标语言草稿；翻译审核完成前使用英文回退。",
  "zh-TW": "Missing target draft; English fallback is active until translation review is complete.",
};

const contractModeLabels: Record<ContractMode, LocalizedText> = {
  CONTRACT_CLAIM: {
    "en-US": "Contract claim",
    "zh-CN": "合约领取",
    "zh-TW": "Contract claim",
  },
  OFF_CHAIN_MVP: {
    "en-US": "Off-chain MVP",
    "zh-CN": "Off-chain MVP",
    "zh-TW": "Off-chain MVP",
  },
  V2_COMPANION: {
    "en-US": "V2 companion",
    "zh-CN": "V2 辅助合约",
    "zh-TW": "V2 companion",
  },
};

const contractModeDescriptions: Record<ContractMode, LocalizedText> = {
  CONTRACT_CLAIM: {
    "en-US": "Blocked until high-impact manual review approves claim-mode risk.",
    "zh-CN": "在高影响人工审核批准领取模式风险前保持阻断。",
    "zh-TW": "Blocked until high-impact manual review approves claim-mode risk.",
  },
  OFF_CHAIN_MVP: {
    "en-US": "Safe default for MVP; no contract migration is required.",
    "zh-CN": "MVP 的安全默认模式；不需要合约迁移。",
    "zh-TW": "Safe default for MVP; no contract migration is required.",
  },
  V2_COMPANION: {
    "en-US": "Future companion-contract path for auditable metadata and eligibility roots.",
    "zh-CN": "未来通过辅助合约审计 metadata 与资格 root。",
    "zh-TW": "Future companion-contract path for auditable metadata and eligibility roots.",
  },
};

const contractBoundaryByMode: Record<ContractMode, LocalizedText> = {
  CONTRACT_CLAIM: {
    "en-US": "Contract claim is not enabled in this MVP shell and does not execute reward distribution.",
    "zh-CN": "当前 MVP shell 未启用合约领取，也不会执行奖励发放。",
    "zh-TW": "Contract claim is not enabled in this MVP shell and does not execute reward distribution.",
  },
  OFF_CHAIN_MVP: {
    "en-US": "Campaign OS verifies, ranks, and exports; the project remains responsible for rewards.",
    "zh-CN": "Campaign OS 负责验证、排名与导出；奖励仍由项目方负责。",
    "zh-TW": "Campaign OS verifies, ranks, and exports; the project remains responsible for rewards.",
  },
  V2_COMPANION: {
    "en-US": "Companion contracts may record hashes later; full campaign copy and risk detail stay off-chain.",
    "zh-CN": "辅助合约后续可记录 hash；活动全文与风控细节仍留在链下。",
    "zh-TW": "Companion contracts may record hashes later; full campaign copy and risk detail stay off-chain.",
  },
};

const contractNextActionByMode: Record<ContractMode, LocalizedText> = {
  CONTRACT_CLAIM: {
    "en-US": "Keep blocked until a contract reviewer approves high-impact claim mode.",
    "zh-CN": "保持阻断，直到合约审核人批准高影响领取模式。",
    "zh-TW": "Keep blocked until a contract reviewer approves high-impact claim mode.",
  },
  OFF_CHAIN_MVP: {
    "en-US": "Use off-chain verification and winner export for MVP publish.",
    "zh-CN": "MVP 发布使用链下验证与 winners 导出。",
    "zh-TW": "Use off-chain verification and winner export for MVP publish.",
  },
  V2_COMPANION: {
    "en-US": "Plan verifier roles and metadata hashes before enabling this mode.",
    "zh-CN": "启用前先规划 verifier role 与 metadata hash。",
    "zh-TW": "Plan verifier roles and metadata hashes before enabling this mode.",
  },
};

const defaultReferralSummary: ReferralSummary = {
  inviteLink: "https://campaign.local/awaken-sprint?ref=preview",
  invitedCount: 0,
  qualifiedInvitees: 0,
  referralPoints: 0,
  antiFarmRule: defaultReferralRule,
  riskFlags: [],
};

const publishStateFromSeverity = (severity: ReviewSeverity): PublishState => {
  if (severity === "blocker") {
    return "blocker";
  }

  return severity === "warning" ? "warning" : "ready";
};

const revisionPublishState = (revision: ContentRevision): PublishState => {
  if (revision.status === "published" || revision.status === "human_reviewed") {
    return "ready";
  }

  return revision.locale === "en-US" ? "blocker" : "warning";
};

const nextActionForRevision = (revision: ContentRevision): LocalizedText => {
  if (revision.status === "published") {
    return {
      "en-US": "Published source is ready for campaign pages.",
      "zh-CN": "已发布源内容可用于活动页面。",
      "zh-TW": "Published source is ready for campaign pages.",
    };
  }

  if (revision.status === "human_reviewed") {
    return {
      "en-US": "Human-reviewed translation can be published when the owner confirms.",
      "zh-CN": "人工审核后的翻译可在项目方确认后发布。",
      "zh-TW": "Human-reviewed translation can be published when the owner confirms.",
    };
  }

  if (revision.status === "ai_draft") {
    return noAutoPublishNotice;
  }

  return {
    "en-US": "Use English fallback until localized content is reviewed.",
    "zh-CN": "本地化内容审核前使用英文回退。",
    "zh-TW": "Use English fallback until localized content is reviewed.",
  };
};

const createTranslationPanel = (
  revision: ContentRevision,
): TranslationReviewPanel => {
  const humanReviewed = revision.status === "human_reviewed" || revision.status === "published";
  const published = revision.status === "published";
  const fallbackToEnglish = revision.locale !== "en-US" && !humanReviewed;

  return {
    locale: revision.locale,
    label: localeLabels[revision.locale],
    sourceLocale: revision.sourceLocale,
    title: revision.title,
    description: revision.description,
    socialPost: revision.socialPost,
    rewardDisclaimer: revision.rewardDisclaimer,
    status: revision.status,
    aiDraft: revision.status === "ai_draft",
    humanReviewed,
    fallbackToEnglish,
    published,
    publishState: revisionPublishState(revision),
    reviewer: revision.reviewer,
    updatedAt: revision.updatedAt,
    nextAction: nextActionForRevision(revision),
  };
};

const humanReviewedNote: LocalizedText = {
  "en-US": "Human review is complete; this translation can move toward publish revision.",
  "zh-CN": "人工审核已完成；该翻译可进入发布版本流程。",
  "zh-TW": "Human review is complete; this translation can move toward publish revision.",
};

const fallbackReviewNote: LocalizedText = {
  "en-US": "AI draft or missing translation falls back to English until human review is complete.",
  "zh-CN": "AI 草稿或缺失翻译在人工审核完成前回退展示英文。",
  "zh-TW": "AI draft or missing translation falls back to English until human review is complete.",
};

const rewardDisclaimerReadyReason: LocalizedText = {
  "en-US": "Reward responsibility disclaimer is reviewed for this locale.",
  "zh-CN": "该语言的奖励责任免责声明已审核。",
  "zh-TW": "Reward responsibility disclaimer is reviewed for this locale.",
};

const rewardDisclaimerDraftReason: LocalizedText = {
  "en-US": "AI draft reward disclaimer requires project owner review before publish.",
  "zh-CN": "AI 草稿奖励免责声明发布前需要项目方审核。",
  "zh-TW": "AI draft reward disclaimer requires project owner review before publish.",
};

const rewardDisclaimerFallbackReason: LocalizedText = {
  "en-US": "Fallback reward disclaimer is visible but is not approved localized copy.",
  "zh-CN": "回退奖励免责声明可见，但不能视为已审核本地化文案。",
  "zh-TW": "Fallback reward disclaimer is visible but is not approved localized copy.",
};

const rewardDisclaimerMissingReason: LocalizedText = {
  "en-US": "Localized reward disclaimer is missing and blocks publish.",
  "zh-CN": "本地化奖励免责声明缺失，会阻断发布。",
  "zh-TW": "Localized reward disclaimer is missing and blocks publish.",
};

const rewardDisclaimerReadyAction: LocalizedText = {
  "en-US": "Keep reward responsibility copy visible in publish review.",
  "zh-CN": "在发布审核中继续展示奖励责任文案。",
  "zh-TW": "Keep reward responsibility copy visible in publish review.",
};

const rewardDisclaimerReviewAction: LocalizedText = {
  "en-US": "Project owner must review localized reward disclaimer before publish.",
  "zh-CN": "项目方必须在发布前审核本地化奖励免责声明。",
  "zh-TW": "Project owner must review localized reward disclaimer before publish.",
};

const rewardDisclaimerFallbackAction: LocalizedText = {
  "en-US": "Provide or approve localized reward disclaimer instead of relying on English fallback.",
  "zh-CN": "提供或批准本地化奖励免责声明，不要只依赖英文回退。",
  "zh-TW": "Provide or approve localized reward disclaimer instead of relying on English fallback.",
};

const createTranslationLocaleItems = (
  supportedLocales: readonly ContentRevision["locale"][],
  panels: readonly TranslationReviewPanel[],
): TranslationLocaleItem[] =>
  supportedLocales.map((locale) => {
    const panel = panels.find((candidate) => candidate.locale === locale);
    const fallbackToEnglish = locale !== "en-US" && (panel?.fallbackToEnglish ?? true);
    const humanReviewed = panel?.humanReviewed ?? false;

    return {
      locale,
      label: localeLabels[locale],
      role: locale === "en-US" ? "source" : "translation",
      isDefault: locale === "en-US",
      isFallback: locale === "en-US",
      status: panel?.status ?? "empty",
      publishState: panel?.publishState ?? (locale === "en-US" ? "blocker" : "warning"),
      fallbackToEnglish,
      humanReviewed,
    };
  });

const valueForComparisonField = (
  panel: TranslationReviewPanel | undefined,
  field: TranslationCompareField,
) => panel?.[field]?.trim() ?? "";

const createTranslationComparisonRows = (
  sourcePanel: TranslationReviewPanel | undefined,
  targetPanel: TranslationReviewPanel | undefined,
): TranslationComparisonRow[] =>
  comparisonFields.map((field) => {
    const sourceValue = valueForComparisonField(sourcePanel, field);
    const targetValue = valueForComparisonField(targetPanel, field);
    const fallbackToEnglish = targetPanel?.fallbackToEnglish ?? true;
    const humanReviewed = targetPanel?.humanReviewed ?? false;

    return {
      id: field,
      label: comparisonFieldLabels[field],
      sourceLocale: "en-US",
      targetLocale: targetPanel?.locale ?? "zh-CN",
      sourceValue: sourceValue || missingTargetDraft["en-US"],
      targetValue: targetValue || sourceValue || missingTargetDraft["en-US"],
      targetStatus: targetPanel?.status ?? "empty",
      targetPublishState: targetPanel?.publishState ?? "warning",
      fallbackToEnglish,
      humanReviewed,
      reviewNote: humanReviewed ? humanReviewedNote : fallbackReviewNote,
    };
  });

const rewardDisclaimerReviewState = (
  panel: TranslationReviewPanel | undefined,
): RewardDisclaimerReviewRow["reviewState"] => {
  if (!panel || !panel.rewardDisclaimer.trim()) {
    return "missing";
  }

  if (panel.humanReviewed && panel.published) {
    return "reviewed";
  }

  if (panel.aiDraft) {
    return "ai_draft";
  }

  return panel.fallbackToEnglish ? "fallback" : "missing";
};

const rewardDisclaimerBlockerReason = (
  reviewState: RewardDisclaimerReviewRow["reviewState"],
): LocalizedText => {
  if (reviewState === "reviewed") {
    return rewardDisclaimerReadyReason;
  }

  if (reviewState === "ai_draft") {
    return rewardDisclaimerDraftReason;
  }

  return reviewState === "fallback" ? rewardDisclaimerFallbackReason : rewardDisclaimerMissingReason;
};

const rewardDisclaimerNextAction = (
  reviewState: RewardDisclaimerReviewRow["reviewState"],
): LocalizedText => {
  if (reviewState === "reviewed") {
    return rewardDisclaimerReadyAction;
  }

  return reviewState === "fallback" ? rewardDisclaimerFallbackAction : rewardDisclaimerReviewAction;
};

const createRewardDisclaimerRows = (
  supportedLocaleList: readonly ContentRevision["locale"][],
  panels: readonly TranslationReviewPanel[],
  englishPanel: TranslationReviewPanel | undefined,
): RewardDisclaimerReviewRow[] =>
  supportedLocaleList.map((locale) => {
    const panel = panels.find((candidate) => candidate.locale === locale);
    const reviewState = rewardDisclaimerReviewState(panel);
    const disclaimer = panel?.rewardDisclaimer.trim() || englishPanel?.rewardDisclaimer.trim() || missingTargetDraft["en-US"];

    return {
      locale,
      sourceLocale: panel?.sourceLocale ?? "en-US",
      disclaimer,
      reviewed: reviewState === "reviewed",
      fallbackToEnglish: locale !== "en-US" && (panel?.fallbackToEnglish ?? true),
      reviewState,
      blocksPublish: reviewState !== "reviewed",
      blockerReason: rewardDisclaimerBlockerReason(reviewState),
      nextAction: rewardDisclaimerNextAction(reviewState),
      boundary: rewardBoundary,
      ownerRole: "project_owner",
      publishState: reviewState === "reviewed" ? "ready" : "blocker",
    };
  });

const releaseReadyLifecycles: AiContentArtifactLifecycle[] = [
  "human_approved",
  "schedule_intent",
  "publish_intent",
];

const createAiContentActionPolicy = (
  artifact: Pick<AiContentArtifactDraft, "lifecycle">,
) => {
  const releaseReady = releaseReadyLifecycles.includes(artifact.lifecycle);
  const edited = artifact.lifecycle === "edited";

  return {
    copy: releaseReady ? "available" : "blocked",
    edit: artifact.lifecycle === "publish_intent" ? "blocked" : "available",
    markReviewed: releaseReady ? "blocked" : "available",
    schedule: releaseReady ? "available" : "blocked",
    publish: releaseReady ? "available" : "blocked",
    blockedReason: releaseReady ? undefined : aiContentDraftBlockedReason,
    nextAction: releaseReady
      ? aiContentApprovedNextAction
      : edited
        ? aiContentEditedNextAction
        : aiContentDraftNextAction,
  } satisfies AiContentArtifact["actionPolicy"];
};

const createAiContentPackSummary = (
  artifacts: AiContentArtifact[],
  qualityGates: AiContentQualityGate[],
): AiContentPackSummary => {
  const aiDrafts = artifacts.filter((artifact) => artifact.lifecycle === "ai_draft").length;
  const humanApproved = artifacts.filter((artifact) =>
    releaseReadyLifecycles.includes(artifact.lifecycle),
  ).length;
  const blockedReleaseActions = artifacts.filter(
    (artifact) => artifact.actionPolicy.schedule === "blocked" || artifact.actionPolicy.publish === "blocked",
  ).length;
  const availableCopyActions = artifacts.filter((artifact) => artifact.actionPolicy.copy === "available").length;
  const qualityGateBlockers = qualityGates.filter((gate) => gate.status === "blocked").length;

  return {
    totalArtifacts: artifacts.length,
    aiDrafts,
    humanApproved,
    blockedReleaseActions,
    availableCopyActions,
    qualityGateBlockers,
    nextAction:
      blockedReleaseActions > 0 || qualityGateBlockers > 0
        ? {
            "en-US": "Finish human review before release intent.",
            "zh-CN": "完成所有人工审核后再进入发布意图。",
            "zh-TW": "Finish human review before release intent.",
          }
        : {
            "en-US": "Approved content can be copied or prepared for local schedule/publish intent.",
            "zh-CN": "已批准内容可以复制，或准备本地排期/发布意图。",
            "zh-TW": "Approved content can be copied or prepared for local schedule/publish intent.",
          },
  };
};

export const createAiContentPackWorkbench = (
  campaign: Pick<
    CampaignShellDetail,
    "id" | "defaultLocale" | "supportedLocales" | "aiContentArtifacts" | "aiContentQualityGates"
  >,
): AiContentPackWorkbench => {
  const artifacts = campaign.aiContentArtifacts.map<AiContentArtifact>((artifact) => ({
    ...artifact,
    actionPolicy: createAiContentActionPolicy(artifact),
  }));
  const qualityGates = [...campaign.aiContentQualityGates];

  return {
    campaignId: campaign.id,
    defaultLocale: campaign.defaultLocale,
    supportedLocales: [...campaign.supportedLocales],
    summary: createAiContentPackSummary(artifacts, qualityGates),
    artifacts,
    qualityGates,
    boundary: aiContentBoundary,
  };
};

const evidenceSourceByVerificationType: Record<CampaignTask["verificationType"], EvidenceSource> = {
  DAPP_API: "dapp_api",
  MANUAL: "manual",
  ON_CHAIN: "aelfscan",
  SOCIAL: "social_api",
  WALLET: "wallet",
};

const canonicalEvidenceBySource: Record<EvidenceSource, VerificationEvidenceSource> = {
  aefinder: "AEFINDER",
  aelfscan: "AELFSCAN",
  dapp_api: "DAPP_API",
  manual: "MANUAL_REVIEW",
  social_api: "SOCIAL_API",
  wallet: "WALLET_SESSION",
};

const providerByEvidenceSource: Record<EvidenceSource, VerificationProviderId> = {
  aefinder: "aefinder",
  aelfscan: "aelfscan",
  dapp_api: "dapp_api",
  manual: "manual_review",
  social_api: "social_api",
  wallet: "wallet_session",
};

const verificationEvidenceLabels: Record<VerificationEvidenceSource, LocalizedText> = {
  AEFINDER: {
    "en-US": "AeFinder evidence",
    "zh-CN": "AeFinder 证据",
    "zh-TW": "AeFinder evidence",
  },
  AELFSCAN: {
    "en-US": "AelfScan evidence",
    "zh-CN": "AelfScan 证据",
    "zh-TW": "AelfScan evidence",
  },
  DAPP_API: {
    "en-US": "dApp API evidence",
    "zh-CN": "dApp API 证据",
    "zh-TW": "dApp API evidence",
  },
  LOCAL_SEEDED: {
    "en-US": "Local seeded evidence",
    "zh-CN": "本地 seeded 证据",
    "zh-TW": "Local seeded evidence",
  },
  MANUAL_REVIEW: {
    "en-US": "Manual review evidence",
    "zh-CN": "人工审核证据",
    "zh-TW": "Manual review evidence",
  },
  SOCIAL_API: {
    "en-US": "Social API evidence",
    "zh-CN": "社交 API 证据",
    "zh-TW": "Social API evidence",
  },
  WALLET_SESSION: {
    "en-US": "Wallet session evidence",
    "zh-CN": "钱包会话证据",
    "zh-TW": "Wallet session evidence",
  },
};

const unavailableProviderFallback = (task: CampaignTask): LocalizedText => ({
  "en-US": `${task.title["en-US"]} depends on a provider path that is named for evidence only in this seeded runtime.`,
  "zh-CN": `${task.title["zh-CN"]} 依赖的 provider 路径在当前 seeded 运行时仅作为 evidence 名称展示。`,
  "zh-TW": `${task.title["en-US"]} depends on a provider path that is named for evidence only in this seeded runtime.`,
});

const nextAdapterStep = (
  source: EvidenceSource,
  readiness: VerificationProviderReadiness,
): LocalizedText => {
  if (readiness === "local_only") {
    return {
      "en-US": "Keep the seeded result as local proof until live provider QA is added.",
      "zh-CN": "在接入真实 provider QA 前，将 seeded 结果作为本地证明。",
      "zh-TW": "Keep the seeded result as local proof until live provider QA is added.",
    };
  }

  if (readiness === "review_required") {
    return {
      "en-US": "Review this outcome manually before any completion or reward decision.",
      "zh-CN": "在完成或奖励判断前，先人工审核该结果。",
      "zh-TW": "Review this outcome manually before any completion or reward decision.",
    };
  }

  return {
    "en-US": `Connect and QA the ${providerByEvidenceSource[source]} adapter before treating this path as live verification.`,
    "zh-CN": `接入并 QA ${providerByEvidenceSource[source]} adapter 后，才能将该路径视为真实验证。`,
    "zh-TW": `Connect and QA the ${providerByEvidenceSource[source]} adapter before treating this path as live verification.`,
  };
};

const providerReadinessFor = (
  source: EvidenceSource,
  status: TaskVerificationStatus,
  completed: boolean,
): VerificationProviderReadiness => {
  if (source === "manual" || status === "manual_review") {
    return "review_required";
  }

  if (source === "wallet" || completed) {
    return "local_only";
  }

  if (status === "failed") {
    return "blocked";
  }

  return "unavailable";
};

const evidenceHashFor = (taskId: string, walletAddress: string) =>
  `demo-${taskId}-${walletAddress.slice(0, 3)}`;

export const createVerificationEvidence = (
  taskId: string,
  walletAddress: string,
  source: EvidenceSource,
): VerificationEvidence => {
  const canonicalSource = canonicalEvidenceBySource[source] ?? "LOCAL_SEEDED";
  const evidenceHash = evidenceHashFor(taskId, walletAddress);

  return {
    source: canonicalSource,
    sourceLabel: verificationEvidenceLabels[canonicalSource],
    evidenceId: evidenceHash,
    evidenceHash,
    live: false,
  };
};

export const createVerificationProviderState = (
  task: CampaignTask,
  source: EvidenceSource,
  status: TaskVerificationStatus,
  completed: boolean,
): VerificationProviderState => {
  const readiness = providerReadinessFor(source, status, completed);

  return {
    providerId: providerByEvidenceSource[source],
    readiness,
    fallbackReason:
      readiness === "ready" || readiness === "local_only"
        ? undefined
        : unavailableProviderFallback(task),
    nextAdapterStep: nextAdapterStep(source, readiness),
  };
};

const createManualReviewState = (
  task: CampaignTask,
  participant: ParticipantSnapshot,
  status: TaskVerificationStatus,
) => {
  const queued =
    status === "manual_review" ||
    participant.riskFlags.includes("manual_review_queue") ||
    task.riskLevel === "high";

  return {
    queued,
    reason: queued
      ? {
          "en-US": `${task.title["en-US"]} requires human review before completion is accepted.`,
          "zh-CN": `${task.title["zh-CN"]} 需要人工审核后才能接受完成状态。`,
          "zh-TW": `${task.title["en-US"]} requires human review before completion is accepted.`,
        }
      : undefined,
    severity: queued ? ("warning" as ReviewSeverity) : ("info" as ReviewSeverity),
    queueId: queued ? `review-${task.id}-${participant.walletAddress.slice(0, 3)}` : undefined,
  };
};

const taskNextAction = (
  task: CampaignTask,
  status: TaskVerificationStatus,
): LocalizedText => {
  if (status === "completed") {
    return {
      "en-US": `${task.title["en-US"]} is verified and points are counted.`,
      "zh-CN": `${task.title["zh-CN"]} 已验证，积分已计入。`,
      "zh-TW": `${task.title["en-US"]} is verified and points are counted.`,
    };
  }

  if (status === "pending") {
    return {
      "en-US": `${task.title["en-US"]} is waiting for seeded verification.`,
      "zh-CN": `${task.title["zh-CN"]} 正在等待 seeded 验证。`,
      "zh-TW": `${task.title["en-US"]} is waiting for seeded verification.`,
    };
  }

  if (status === "failed") {
    return {
      "en-US": `${task.title["en-US"]} needs a fresh valid completion.`,
      "zh-CN": `${task.title["zh-CN"]} 需要重新完成一次有效操作。`,
      "zh-TW": `${task.title["en-US"]} needs a fresh valid completion.`,
    };
  }

  if (status === "manual_review") {
    return {
      "en-US": `${task.title["en-US"]} is queued for manual review.`,
      "zh-CN": `${task.title["zh-CN"]} 已进入人工审核队列。`,
      "zh-TW": `${task.title["en-US"]} is queued for manual review.`,
    };
  }

  return {
    "en-US": `Complete ${task.title["en-US"]} to recover eligibility.`,
    "zh-CN": `完成${task.title["zh-CN"]}以恢复资格。`,
    "zh-TW": `Complete ${task.title["en-US"]} to recover eligibility.`,
  };
};

export const taskVerificationActionBoundary: LocalizedText = verificationActionText(
  "Local verification action only. No live wallet SDK, provider API, upload, backend mutation, export file, reward distribution, contract call, or contract root write is executed.",
  "仅本地验证动作。不会执行实时钱包 SDK、provider API、上传、后端变更、导出文件、奖励发放、合约调用或合约 root 写入。",
);

const taskVerificationActionLabels: Record<TaskVerificationActionKind, LocalizedText> = {
  completed: verificationActionText("Already verified", "已验证"),
  retry: verificationActionText("Retry verification", "重试验证"),
  submit_proof: verificationActionText("Submit proof", "提交证明"),
  verify: verificationActionText("Verify task", "验证任务"),
  view_review: verificationActionText("View review queue", "查看审核队列"),
};

const taskVerificationActionNextAction = (
  task: CampaignTask,
  kind: TaskVerificationActionKind,
): LocalizedText => {
  if (kind === "completed") {
    return verificationActionText(
      `${task.title["en-US"]} is already verified. Keep the evidence for export review.`,
      `${task.title["zh-CN"]} 已验证。保留 evidence 供导出审核使用。`,
    );
  }

  if (kind === "retry") {
    return verificationActionText(
      `Retry ${task.title["en-US"]} in the local preview; provider status remains pending until live QA is attached.`,
      `在本地预览中重试${task.title["zh-CN"]}；在接入真实 QA 前 provider 状态仍保持待验证。`,
    );
  }

  if (kind === "submit_proof") {
    return verificationActionText(
      `Submit local proof metadata for ${task.title["en-US"]}; no file upload or automatic reward approval occurs.`,
      `提交${task.title["zh-CN"]}的本地证明 metadata；不会上传文件，也不会自动批准奖励。`,
    );
  }

  if (kind === "view_review") {
    return verificationActionText(
      `${task.title["en-US"]} is held in the manual review queue before any completion or reward decision.`,
      `${task.title["zh-CN"]} 需先进入人工审核队列，之后才可判断完成或奖励。`,
    );
  }

  return verificationActionText(
    `Run local verification for ${task.title["en-US"]}; this does not call a live provider.`,
    `对${task.title["zh-CN"]}执行本地验证；不会调用真实 provider。`,
  );
};

const taskVerificationActionKindFor = (
  state: ParticipantTaskState,
): TaskVerificationActionKind => {
  if (state.status === "completed") {
    return "completed";
  }

  if (state.status === "manual_review") {
    return "view_review";
  }

  if (state.status === "failed") {
    return "submit_proof";
  }

  if (state.status === "pending") {
    return "retry";
  }

  return "verify";
};

export const deriveTaskVerificationAction = (
  task: CampaignTask,
  state: ParticipantTaskState,
): TaskVerificationAction => {
  const kind = taskVerificationActionKindFor(state);

  return {
    taskId: task.id,
    kind,
    enabled: kind !== "completed",
    requiresWalletProvenance: true,
    proofRequired: kind === "submit_proof",
    status: state.status,
    providerReadiness: state.provider.readiness,
    canonicalEvidenceSource: state.canonicalEvidenceSource,
    label: taskVerificationActionLabels[kind],
    nextAction: taskVerificationActionNextAction(task, kind),
    boundary: taskVerificationActionBoundary,
  };
};

export const deriveParticipantTaskActions = (
  tasks: CampaignTask[],
  participant: ParticipantSnapshot,
): TaskVerificationAction[] => {
  const states = deriveParticipantTaskStates(tasks, participant);

  return tasks.flatMap((task) => {
    const state = states.find((candidate) => candidate.taskId === task.id);

    return state ? [deriveTaskVerificationAction(task, state)] : [];
  });
};

const taskVerificationActionProof = (
  proofType?: TaskVerificationProofType,
): TaskVerificationActionProof | undefined =>
  proofType
    ? {
        proofType,
        localOnly: true,
        uploadExecuted: false,
      }
    : undefined;

export const createTaskVerificationActionResult = (
  task: CampaignTask,
  state: ParticipantTaskState,
  kind: TaskVerificationActionKind,
  proofType?: TaskVerificationProofType,
): TaskVerificationActionResult => {
  const normalizedStatus: Exclude<TaskVerificationStatus, "ready"> =
    state.status === "ready" ? "pending" : state.status;
  const proof = kind === "submit_proof"
    ? taskVerificationActionProof(proofType)
    : undefined;

  return {
    taskId: task.id,
    kind,
    status: normalizedStatus,
    attemptLabel: `local-${kind}-${task.id}`,
    evidence: state.evidence,
    provider: state.provider,
    manualReview: state.manualReview,
    pointsAwarded: kind === "completed" || state.status === "completed" ? state.pointsAwarded : 0,
    pointsAvailable: state.pointsAvailable,
    riskFlags: [...state.riskFlags],
    proof,
    nextAction: taskVerificationActionNextAction(task, kind),
    boundary: taskVerificationActionBoundary,
  };
};

export const computeMissingTasks = (
  tasks: CampaignTask[],
  participant: ParticipantSnapshot,
) => tasks.filter((task) => task.required && !participant.completedTaskIds.includes(task.id));

export const deriveParticipantTaskStates = (
  tasks: CampaignTask[],
  participant: ParticipantSnapshot,
): ParticipantTaskState[] =>
  tasks.map((task) => {
    const completed = participant.completedTaskIds.includes(task.id);
    const overrideStatus = participant.taskVerificationOverrides?.[task.id];
    const status: TaskVerificationStatus = completed ? "completed" : overrideStatus ?? "ready";
    const evidenceSource =
      participant.taskEvidenceSources?.[task.id] ?? evidenceSourceByVerificationType[task.verificationType];
    const evidence = createVerificationEvidence(task.id, participant.walletAddress, evidenceSource);
    const provider = createVerificationProviderState(task, evidenceSource, status, completed);

    return {
      taskId: task.id,
      templateCode: task.templateCode,
      status,
      evidenceSource,
      canonicalEvidenceSource: evidence.source,
      evidence,
      provider,
      manualReview: createManualReviewState(task, participant, status),
      riskFlags: [...participant.riskFlags],
      pointsAwarded: status === "completed" ? task.points : 0,
      pointsAvailable: task.points,
      completed,
      missingRequired: task.required && !completed,
      walletCompatibility: task.walletCompatibility,
      nextAction: taskNextAction(task, status),
    };
  });

const emptyProviderReadinessCounts = (): Record<VerificationProviderReadiness, number> => ({
  blocked: 0,
  local_only: 0,
  ready: 0,
  review_required: 0,
  unavailable: 0,
});

export const createVerificationCoverageSummary = (
  tasks: CampaignTask[],
  participants: ParticipantSnapshot[],
): VerificationCoverageSummary => {
  const states = participants.flatMap((participant) =>
    deriveParticipantTaskStates(tasks, participant),
  );
  const providerReadinessCounts = emptyProviderReadinessCounts();

  for (const state of states) {
    providerReadinessCounts[state.provider.readiness] += 1;
  }

  return {
    totalTasks: tasks.length,
    totalTaskStates: states.length,
    completedCount: states.filter((state) => state.status === "completed").length,
    pendingCount: states.filter((state) => state.status === "ready" || state.status === "pending").length,
    failedCount: states.filter((state) => state.status === "failed").length,
    manualReviewCount: states.filter((state) => state.status === "manual_review").length,
    providerReadinessCounts,
    evidenceSources: [...new Set(states.map((state) => state.canonicalEvidenceSource))],
    riskFlags: [...new Set(participants.flatMap((participant) => participant.riskFlags))],
    boundary: verificationBoundary,
  };
};

const verificationPipelineLabels: Record<VerificationPipelinePathId, LocalizedText> = {
  "aefinder-on-chain": {
    "en-US": "AeFinder on-chain verification",
    "zh-CN": "AeFinder 链上验证",
    "zh-TW": "AeFinder on-chain verification",
  },
  "aelfscan-on-chain": {
    "en-US": "AelfScan on-chain verification",
    "zh-CN": "AelfScan 链上验证",
    "zh-TW": "AelfScan on-chain verification",
  },
  "dapp-api": {
    "en-US": "dApp API verification",
    "zh-CN": "dApp API 验证",
    "zh-TW": "dApp API verification",
  },
  "social-api": {
    "en-US": "Social API verification",
    "zh-CN": "社交 API 验证",
    "zh-TW": "Social API verification",
  },
  "wallet-session": {
    "en-US": "Wallet session verification",
    "zh-CN": "钱包会话验证",
    "zh-TW": "Wallet session verification",
  },
  "manual-review": {
    "en-US": "Manual review",
    "zh-CN": "人工审核",
    "zh-TW": "Manual review",
  },
  "referral-qualification": {
    "en-US": "Referral qualification",
    "zh-CN": "邀请资格",
    "zh-TW": "Referral qualification",
  },
};

const verificationPipelineFallbacks: Record<VerificationPipelinePathId, LocalizedText> = {
  "aefinder-on-chain": {
    "en-US": "AeFinder is represented as a readiness path only; no live indexer query is executed.",
    "zh-CN": "AeFinder 仅作为 readiness 路径展示；不会执行真实 indexer 查询。",
    "zh-TW": "AeFinder is represented as a readiness path only; no live indexer query is executed.",
  },
  "aelfscan-on-chain": {
    "en-US": "AelfScan evidence is seeded/local and cannot be treated as a live explorer lookup.",
    "zh-CN": "AelfScan 证据为 seeded/本地数据，不能视为真实 explorer 查询。",
    "zh-TW": "AelfScan evidence is seeded/local and cannot be treated as a live explorer lookup.",
  },
  "dapp-api": {
    "en-US": "dApp API evidence is named for adapter planning; no external dApp endpoint is called.",
    "zh-CN": "dApp API 证据仅用于 adapter 规划；不会调用外部 dApp endpoint。",
    "zh-TW": "dApp API evidence is named for adapter planning; no external dApp endpoint is called.",
  },
  "social-api": {
    "en-US": "Social API verification is blocked until platform API policy and review fallback are approved.",
    "zh-CN": "社交 API 验证在平台 API 策略与审核 fallback 批准前保持阻断。",
    "zh-TW": "Social API verification is blocked until platform API policy and review fallback are approved.",
  },
  "wallet-session": {
    "en-US": "Wallet session evidence is seeded/local and does not request a live wallet signature.",
    "zh-CN": "钱包会话证据为 seeded/本地数据，不会请求真实钱包签名。",
    "zh-TW": "Wallet session evidence is seeded/local and does not request a live wallet signature.",
  },
  "manual-review": {
    "en-US": "Manual review is a human queue boundary; it does not auto-complete verification or rewards.",
    "zh-CN": "人工审核是人工队列边界；不会自动完成验证或发奖。",
    "zh-TW": "Manual review is a human queue boundary; it does not auto-complete verification or rewards.",
  },
  "referral-qualification": {
    "en-US": "Referral qualification is based on seeded invitee task completion, not raw signup counts.",
    "zh-CN": "邀请资格基于 seeded 被邀请人任务完成情况，不按原始注册数计入。",
    "zh-TW": "Referral qualification is based on seeded invitee task completion, not raw signup counts.",
  },
};

const verificationPipelineNextActions: Record<VerificationPipelinePathId, LocalizedText> = {
  "aefinder-on-chain": {
    "en-US": "Attach live AeFinder QA evidence before treating bridge or contract events as production verified.",
    "zh-CN": "在将跨链或合约事件视为生产验证前，先附上真实 AeFinder QA 证据。",
    "zh-TW": "Attach live AeFinder QA evidence before treating bridge or contract events as production verified.",
  },
  "aelfscan-on-chain": {
    "en-US": "Attach live AelfScan lookup evidence before release approval.",
    "zh-CN": "发布批准前附上真实 AelfScan 查询证据。",
    "zh-TW": "Attach live AelfScan lookup evidence before release approval.",
  },
  "dapp-api": {
    "en-US": "Define dApp API adapter QA, timeout fallback, and manual-review handling before launch.",
    "zh-CN": "上线前定义 dApp API adapter QA、超时 fallback 与人工审核处理。",
    "zh-TW": "Define dApp API adapter QA, timeout fallback, and manual-review handling before launch.",
  },
  "social-api": {
    "en-US": "Keep blocked until social API policy, review fallback, and low-reward weighting are approved.",
    "zh-CN": "在社交 API 策略、审核 fallback 与低奖励权重批准前保持阻断。",
    "zh-TW": "Keep blocked until social API policy, review fallback, and low-reward weighting are approved.",
  },
  "wallet-session": {
    "en-US": "Review wallet provider QA evidence before trusting wallet session verification in production.",
    "zh-CN": "在生产中信任钱包会话验证前，先审核钱包 provider QA 证据。",
    "zh-TW": "Review wallet provider QA evidence before trusting wallet session verification in production.",
  },
  "manual-review": {
    "en-US": "Keep queued items human-reviewed before awarding points or export eligibility.",
    "zh-CN": "发放积分或导出资格前，保持队列项目由人工审核。",
    "zh-TW": "Keep queued items human-reviewed before awarding points or export eligibility.",
  },
  "referral-qualification": {
    "en-US": "Confirm qualified invitees completed required verified actions before counting referral points.",
    "zh-CN": "确认合格被邀请人完成必需验证行为后，再计算邀请积分。",
    "zh-TW": "Confirm qualified invitees completed required verified actions before counting referral points.",
  },
};

const verificationPipelineEligibilityImpact: Record<VerificationPipelinePathId, LocalizedText> = {
  "aefinder-on-chain": {
    "en-US": "Bridge and contract-event checks affect required task eligibility and points.",
    "zh-CN": "跨链与合约事件检查会影响必做任务资格和积分。",
    "zh-TW": "Bridge and contract-event checks affect required task eligibility and points.",
  },
  "aelfscan-on-chain": {
    "en-US": "Explorer evidence affects on-chain task completion, export review, and release approval.",
    "zh-CN": "Explorer 证据会影响链上任务完成、导出审核与发布批准。",
    "zh-TW": "Explorer evidence affects on-chain task completion, export review, and release approval.",
  },
  "dapp-api": {
    "en-US": "dApp API checks affect swap task points and pending eligibility states.",
    "zh-CN": "dApp API 检查会影响 Swap 任务积分和待验证资格状态。",
    "zh-TW": "dApp API checks affect swap task points and pending eligibility states.",
  },
  "social-api": {
    "en-US": "Social tasks stay low weight and blocked from high-reward eligibility until reviewed.",
    "zh-CN": "社交任务保持低权重，审核前不能支撑高奖励资格。",
    "zh-TW": "Social tasks stay low weight and blocked from high-reward eligibility until reviewed.",
  },
  "wallet-session": {
    "en-US": "Wallet session readiness affects AA/EOA verification and export trust.",
    "zh-CN": "钱包会话 readiness 会影响 AA/EOA 验证与导出可信度。",
    "zh-TW": "Wallet session readiness affects AA/EOA verification and export trust.",
  },
  "manual-review": {
    "en-US": "Manual review holds risk-flagged and queued tasks before winner export.",
    "zh-CN": "人工审核会在 winners 导出前暂缓风险标记与队列任务。",
    "zh-TW": "Manual review holds risk-flagged and queued tasks before winner export.",
  },
  "referral-qualification": {
    "en-US": "Referral points require qualified invitees to complete verified required actions.",
    "zh-CN": "邀请积分要求合格被邀请人完成已验证的必需行为。",
    "zh-TW": "Referral points require qualified invitees to complete verified required actions.",
  },
};

const verificationPipelineDefinitions: Array<{
  id: VerificationPipelinePathId;
  evidenceSource: VerificationEvidenceSource;
  providerReadiness: VerificationProviderReadiness;
  liveEvidenceStatus: VerificationLiveEvidenceStatus;
  releaseImpact: VerificationReleaseImpact;
  affectedOutcomes: VerificationAffectedOutcome[];
  owner: OwnerRole;
}> = [
  {
    id: "aefinder-on-chain",
    evidenceSource: "AEFINDER",
    providerReadiness: "unavailable",
    liveEvidenceStatus: "missing",
    releaseImpact: "needs_review",
    affectedOutcomes: ["points", "eligibility", "release"],
    owner: "internal_operator",
  },
  {
    id: "aelfscan-on-chain",
    evidenceSource: "AELFSCAN",
    providerReadiness: "local_only",
    liveEvidenceStatus: "missing",
    releaseImpact: "needs_review",
    affectedOutcomes: ["points", "eligibility", "export", "release"],
    owner: "internal_operator",
  },
  {
    id: "dapp-api",
    evidenceSource: "DAPP_API",
    providerReadiness: "unavailable",
    liveEvidenceStatus: "missing",
    releaseImpact: "needs_review",
    affectedOutcomes: ["points", "eligibility", "user_next_action"],
    owner: "project_owner",
  },
  {
    id: "social-api",
    evidenceSource: "SOCIAL_API",
    providerReadiness: "blocked",
    liveEvidenceStatus: "blocked",
    releaseImpact: "blocker",
    affectedOutcomes: ["points", "release", "user_next_action"],
    owner: "internal_operator",
  },
  {
    id: "wallet-session",
    evidenceSource: "WALLET_SESSION",
    providerReadiness: "local_only",
    liveEvidenceStatus: "missing",
    releaseImpact: "needs_review",
    affectedOutcomes: ["eligibility", "export", "release"],
    owner: "internal_operator",
  },
  {
    id: "manual-review",
    evidenceSource: "MANUAL_REVIEW",
    providerReadiness: "review_required",
    liveEvidenceStatus: "not_applicable",
    releaseImpact: "needs_review",
    affectedOutcomes: ["eligibility", "export", "user_next_action"],
    owner: "internal_operator",
  },
  {
    id: "referral-qualification",
    evidenceSource: "LOCAL_SEEDED",
    providerReadiness: "local_only",
    liveEvidenceStatus: "missing",
    releaseImpact: "needs_review",
    affectedOutcomes: ["referral", "points", "eligibility"],
    owner: "project_owner",
  },
];

const createVerificationPipelinePath = (
  definition: (typeof verificationPipelineDefinitions)[number],
): VerificationPipelinePath => ({
  ...definition,
  boundary: verificationBoundary,
  eligibilityImpact: verificationPipelineEligibilityImpact[definition.id],
  fallbackReason: verificationPipelineFallbacks[definition.id],
  label: verificationPipelineLabels[definition.id],
  nextAction: verificationPipelineNextActions[definition.id],
  seededCoverageStatus: "ready" satisfies VerificationSeededCoverageStatus,
});

const summarizeVerificationPipeline = (
  paths: VerificationPipelinePath[],
): VerificationPipelineReadinessGate["summary"] => ({
  totalPaths: paths.length,
  seededReadyPaths: paths.filter((path) => path.seededCoverageStatus === "ready").length,
  liveEvidenceReadyPaths: paths.filter((path) => path.liveEvidenceStatus === "ready").length,
  missingLiveEvidencePaths: paths.filter((path) => path.liveEvidenceStatus === "missing").length,
  blockedPaths: paths.filter(
    (path) => path.liveEvidenceStatus === "blocked" || path.providerReadiness === "blocked",
  ).length,
  manualReviewPaths: paths.filter((path) => path.providerReadiness === "review_required").length,
});

const referralQualificationStatusFor = (
  participants: readonly ParticipantSnapshot[],
): VerificationPipelineReadinessGate["eligibilityImpact"]["referralQualificationStatus"] => {
  const referrals = participants.flatMap((participant) =>
    participant.referralSummary ? [participant.referralSummary] : [],
  );

  if (referrals.length === 0) {
    return "not_applicable";
  }

  if (referrals.some((referral) => referral.riskFlags.length > 0)) {
    return "needs_verified_invitee";
  }

  return referrals.some(
    (referral) => referral.invitedCount > referral.qualifiedInvitees,
  )
    ? "needs_verified_invitee"
    : "qualified";
};

const createVerificationEligibilityImpact = (
  tasks: readonly CampaignTask[],
  participants: readonly ParticipantSnapshot[],
): VerificationPipelineReadinessGate["eligibilityImpact"] => {
  const missingRequiredTasks = [
    ...new Set(
      participants.flatMap((participant) =>
        computeMissingTasks([...tasks], participant).map((task) => task.templateCode),
      ),
    ),
  ];
  const riskFlags = [...new Set(participants.flatMap((participant) => participant.riskFlags))];
  const referralQualificationStatus = referralQualificationStatusFor(participants);

  return {
    missingRequiredTasks,
    referralQualificationStatus,
    riskFlags,
    summary: {
      "en-US": "Eligibility depends on required task verification, qualified invitees, risk review, and manual-review outcomes.",
      "zh-CN": "资格取决于必做任务验证、合格被邀请人、风险审核与人工审核结果。",
      "zh-TW": "Eligibility depends on required task verification, qualified invitees, risk review, and manual-review outcomes.",
    },
  };
};

export const createVerificationPipelineReadinessGate = (
  campaign: Pick<CampaignShellDetail, "tasks" | "participants">,
): VerificationPipelineReadinessGate => {
  const paths = verificationPipelineDefinitions.map(createVerificationPipelinePath);
  const coverage = createVerificationCoverageSummary(
    [...campaign.tasks],
    [...campaign.participants],
  );

  return {
    summary: summarizeVerificationPipeline(paths),
    taskOutcomeCoverage: {
      completedCount: coverage.completedCount,
      pendingCount: coverage.pendingCount,
      failedCount: coverage.failedCount,
      manualReviewCount: coverage.manualReviewCount,
    },
    eligibilityImpact: createVerificationEligibilityImpact(
      campaign.tasks,
      campaign.participants,
    ),
    paths,
    boundary: verificationBoundary,
    nextAction: {
      "en-US": "Attach live provider evidence before treating seeded verification as production-ready.",
      "zh-CN": "在将 seeded 验证视为生产就绪前，先附上真实 provider 证据。",
      "zh-TW": "Attach live provider evidence before treating seeded verification as production-ready.",
    },
  };
};

const providerEvidenceRegistryBoundary: LocalizedText = {
  "en-US":
    "Seeded/local provider evidence registry only. No live API, wallet SDK, provider credential, export file, reward distribution, contract call, or contract root write is executed.",
  "zh-CN":
    "仅 seeded/本地 provider 证据登记表。不会调用实时 API、钱包 SDK、provider 凭证、导出文件、奖励发放、合约调用或合约 root 写入。",
  "zh-TW":
    "Seeded/local provider evidence registry only. No live API, wallet SDK, provider credential, export file, reward distribution, contract call, or contract root write is executed.",
};

const providerEvidenceRegistryNextAction: LocalizedText = {
  "en-US": "Attach live provider QA evidence and config-gate approval before treating any path as production-ready.",
  "zh-CN": "在将任何路径视为生产就绪前，先附上真实 provider QA 证据与配置门禁批准。",
  "zh-TW": "Attach live provider QA evidence and config-gate approval before treating any path as production-ready.",
};

const featureGateMessage = (
  providerId: string,
  state: ProviderFeatureGateState,
): LocalizedText => ({
  "en-US": `${providerId} live integration is ${state.replace(/_/g, " ")} and degrades to seeded/local readiness.`,
  "zh-CN": `${providerId} 真实集成当前为 ${state.replace(/_/g, " ")}，会降级到 seeded/本地 readiness。`,
  "zh-TW": `${providerId} live integration is ${state.replace(/_/g, " ")} and degrades to seeded/local readiness.`,
});

const createFeatureGate = (
  providerId: string,
  state: ProviderFeatureGateState,
): ProviderFeatureGateIntent => ({
  state,
  configKey: `providers.${providerId}.enabled`,
  degradesGracefully: true,
  operatorMessage: featureGateMessage(providerId, state),
});

const fallbackLabel = (mode: ProviderFallbackMode): LocalizedText => {
  const labels: Record<ProviderFallbackMode, LocalizedText> = {
    blocked: {
      "en-US": "Blocked",
      "zh-CN": "已阻断",
      "zh-TW": "Blocked",
    },
    local_seeded: {
      "en-US": "Local seeded fallback",
      "zh-CN": "本地 seeded fallback",
      "zh-TW": "Local seeded fallback",
    },
    manual_review: {
      "en-US": "Manual review fallback",
      "zh-CN": "人工审核 fallback",
      "zh-TW": "Manual review fallback",
    },
    not_applicable: {
      "en-US": "Not applicable",
      "zh-CN": "不适用",
      "zh-TW": "Not applicable",
    },
    unavailable: {
      "en-US": "Unavailable",
      "zh-CN": "不可用",
      "zh-TW": "Unavailable",
    },
  };

  return labels[mode];
};

const createFallback = (
  mode: ProviderFallbackMode,
  description: LocalizedText,
  blocksLaunch: boolean,
): ProviderFallbackSemantics => ({
  mode,
  label: fallbackLabel(mode),
  description,
  blocksLaunch,
});

const providerCategoryForPipeline = (
  path: VerificationPipelinePath,
): ProviderEvidenceCategory => path.id === "manual-review" ? "manual_review" : "verification";

const providerAffectedOutcomesForPipeline = (
  outcomes: VerificationAffectedOutcome[],
): ProviderAffectedOutcome[] =>
  outcomes.map((outcome) => outcome === "referral" ? "points" : outcome);

const fallbackModeForPipeline = (
  path: VerificationPipelinePath,
): ProviderFallbackMode => {
  if (path.providerReadiness === "blocked") {
    return "blocked";
  }

  if (path.providerReadiness === "review_required") {
    return "manual_review";
  }

  if (path.providerReadiness === "local_only") {
    return "local_seeded";
  }

  return "unavailable";
};

const createRegistryEntry = (
  entry: Omit<ProviderEvidenceRegistryEntry, "boundary">,
): ProviderEvidenceRegistryEntry => ({
  ...entry,
  boundary: providerEvidenceRegistryBoundary,
});

const createProviderEvidenceEntryFromPipeline = (
  path: VerificationPipelinePath,
): ProviderEvidenceRegistryEntry => {
  const providerId = path.id.replace(/-/g, "_");
  const fallbackMode = fallbackModeForPipeline(path);

  return createRegistryEntry({
    id: `verification-${providerId}`,
    category: providerCategoryForPipeline(path),
    providerId,
    label: path.label,
    seededCoverageStatus: path.seededCoverageStatus,
    liveEvidenceStatus: path.liveEvidenceStatus,
    adapterReadiness: path.providerReadiness,
    featureGate: createFeatureGate(providerId, path.providerReadiness === "local_only" ? "enabled_preview" : "planned"),
    fallback: createFallback(
      fallbackMode,
      path.fallbackReason,
      path.releaseImpact === "blocker" || path.providerReadiness === "blocked",
    ),
    ownerRole: path.owner,
    affectedOutcomes: providerAffectedOutcomesForPipeline(path.affectedOutcomes),
    evidenceRequired: path.nextAction,
    nextAction: path.nextAction,
  });
};

const createWalletProviderEvidenceEntry = (
  gate: WalletProviderQaReadinessGate,
): ProviderEvidenceRegistryEntry => createRegistryEntry({
  id: "wallet-provider-qa",
  category: "wallet",
  providerId: "wallet_session",
  label: {
    "en-US": "Wallet provider QA",
    "zh-CN": "钱包 provider QA",
    "zh-TW": "Wallet provider QA",
  },
  seededCoverageStatus: gate.summary.seededReadyScenarios > 0 ? "ready" : "missing",
  liveEvidenceStatus: gate.summary.liveEvidenceReadyScenarios > 0 ? "ready" : "missing",
  adapterReadiness: gate.summary.missingLiveEvidenceScenarios > 0 ? "local_only" : "ready",
  featureGate: createFeatureGate("wallet_session", "enabled_preview"),
  fallback: createFallback(
    "local_seeded",
    {
      "en-US": "Wallet QA uses seeded sessions until live provider evidence is attached.",
      "zh-CN": "钱包 QA 在附上真实 provider 证据前使用 seeded 会话。",
      "zh-TW": "Wallet QA uses seeded sessions until live provider evidence is attached.",
    },
    gate.summary.releaseBlockers > 0,
  ),
  ownerRole: "internal_operator",
  affectedOutcomes: ["eligibility", "export", "release"],
  evidenceRequired: {
    "en-US": "Attach live wallet provider QA evidence for AA and EOA sessions.",
    "zh-CN": "为 AA 与 EOA 会话附上真实钱包 provider QA 证据。",
    "zh-TW": "Attach live wallet provider QA evidence for AA and EOA sessions.",
  },
  nextAction: {
    "en-US": "Review wallet provider QA before trusting wallet sessions in production.",
    "zh-CN": "生产中信任钱包会话前先审核钱包 provider QA。",
    "zh-TW": "Review wallet provider QA before trusting wallet sessions in production.",
  },
});

const createAnalyticsExportProviderEvidenceEntry = (
  exportReadiness: ExportConfirmationReadinessGate,
): ProviderEvidenceRegistryEntry => createRegistryEntry({
  id: "analytics-export-readiness",
  category: "analytics_export",
  providerId: "analytics_export",
  label: {
    "en-US": "Analytics and export readiness",
    "zh-CN": "分析与导出 readiness",
    "zh-TW": "Analytics and export readiness",
  },
  seededCoverageStatus: "ready",
  liveEvidenceStatus: "missing",
  adapterReadiness: exportReadiness.summary.blockedRows > 0 ? "review_required" : "local_only",
  featureGate: createFeatureGate("analytics_export", "enabled_preview"),
  fallback: createFallback(
    "local_seeded",
    exportReadiness.boundary,
    exportReadiness.summary.blockedRows > 0,
  ),
  ownerRole: "project_owner",
  affectedOutcomes: ["analytics", "export", "release"],
  evidenceRequired: {
    "en-US": "Attach live analytics/export service evidence before enabling real files or dashboards.",
    "zh-CN": "启用真实文件或 dashboard 前，先附上真实 analytics/export service 证据。",
    "zh-TW": "Attach live analytics/export service evidence before enabling real files or dashboards.",
  },
  nextAction: exportReadiness.nextAction,
});

const createAiContentProviderEvidenceEntry = (
  workbench: AiContentPackWorkbench,
): ProviderEvidenceRegistryEntry => createRegistryEntry({
  id: "ai-content-provider-readiness",
  category: "ai_content",
  providerId: "ai_content",
  label: {
    "en-US": "AI/content provider readiness",
    "zh-CN": "AI/content provider readiness",
    "zh-TW": "AI/content provider readiness",
  },
  seededCoverageStatus: workbench.summary.totalArtifacts > 0 ? "ready" : "missing",
  liveEvidenceStatus: "missing",
  adapterReadiness: workbench.summary.qualityGateBlockers > 0 ? "review_required" : "local_only",
  featureGate: createFeatureGate("ai_content", "planned"),
  fallback: createFallback(
    "manual_review",
    workbench.boundary.body,
    workbench.summary.qualityGateBlockers > 0,
  ),
  ownerRole: "internal_operator",
  affectedOutcomes: ["content", "release"],
  evidenceRequired: {
    "en-US": "Attach live AI/content provider QA and human-review evidence before publish automation.",
    "zh-CN": "发布自动化前附上真实 AI/content provider QA 与人工审核证据。",
    "zh-TW": "Attach live AI/content provider QA and human-review evidence before publish automation.",
  },
  nextAction: workbench.summary.nextAction,
});

const createContractExportProviderEvidenceEntry = (
  exportReadiness: ExportConfirmationReadinessGate,
): ProviderEvidenceRegistryEntry => {
  const blockedModes = exportReadiness.contractRootReadiness.filter((mode) => mode.readiness === "blocked").length;

  return createRegistryEntry({
    id: "contract-export-root-readiness",
    category: "contract_export",
    providerId: "contract_export",
    label: {
      "en-US": "Contract/export root readiness",
      "zh-CN": "合约/导出 root readiness",
      "zh-TW": "Contract/export root readiness",
    },
    seededCoverageStatus: "ready",
    liveEvidenceStatus: "not_applicable",
    adapterReadiness: blockedModes > 0 ? "blocked" : "review_required",
    featureGate: createFeatureGate("contract_export", "disabled"),
    fallback: createFallback(
      blockedModes > 0 ? "blocked" : "manual_review",
      exportReadiness.contractRootReadiness.find((mode) => mode.mode === "contract_claim")?.boundary ?? exportReadiness.boundary,
      blockedModes > 0,
    ),
    ownerRole: "contract_reviewer",
    affectedOutcomes: ["contract", "export", "release"],
    evidenceRequired: {
      "en-US": "Attach security, legal, audit, and contract approval before root or claim paths become executable.",
      "zh-CN": "root 或 claim 路径可执行前，必须附上安全、法务、审计与合约批准。",
      "zh-TW": "Attach security, legal, audit, and contract approval before root or claim paths become executable.",
    },
    nextAction: exportReadiness.contractRootReadiness.find((mode) => mode.mode === "contract_claim")?.nextAction ?? exportReadiness.nextAction,
  });
};

const providerAcceptancePrerequisites = (
  entry: ProviderEvidenceRegistryEntry,
): LocalizedText[] => [
  entry.evidenceRequired,
  {
    "en-US": "Provider timeout, manual-review fallback, and operator rollback path are documented.",
    "zh-CN": "已记录 provider 超时、人工审核 fallback 与运营回滚路径。",
    "zh-TW": "Provider timeout, manual-review fallback, and operator rollback path are documented.",
  },
  {
    "en-US": "Feature gate is approved before production launch.",
    "zh-CN": "生产上线前配置门禁已获批准。",
    "zh-TW": "Feature gate is approved before production launch.",
  },
];

const createAdapterContract = (
  entry: ProviderEvidenceRegistryEntry,
): ProviderAdapterReadinessContract => ({
  adapterId: `${entry.providerId}_adapter`,
  providerId: entry.providerId,
  category: entry.category,
  expectedEvidence: entry.evidenceRequired,
  featureGate: entry.featureGate,
  acceptancePrerequisites: providerAcceptancePrerequisites(entry),
  fallback: entry.fallback,
  readyForProduction: false,
});

const summarizeProviderEvidenceRegistry = (
  entries: ProviderEvidenceRegistryEntry[],
): ProviderEvidenceRegistry["summary"] => ({
  totalEntries: entries.length,
  seededReadyEntries: entries.filter((entry) => entry.seededCoverageStatus === "ready").length,
  liveEvidenceReadyEntries: entries.filter((entry) => entry.liveEvidenceStatus === "ready").length,
  missingLiveEvidenceEntries: entries.filter((entry) => entry.liveEvidenceStatus === "missing").length,
  localOnlyEntries: entries.filter((entry) => entry.adapterReadiness === "local_only").length,
  reviewRequiredEntries: entries.filter((entry) => entry.adapterReadiness === "review_required").length,
  unavailableEntries: entries.filter((entry) => entry.adapterReadiness === "unavailable").length,
  blockedEntries: entries.filter((entry) => entry.adapterReadiness === "blocked").length,
  notApplicableEntries: entries.filter((entry) => entry.liveEvidenceStatus === "not_applicable").length,
  launchBlockers: entries.filter(
    (entry) => entry.fallback.blocksLaunch || entry.adapterReadiness === "blocked",
  ).length,
});

export const createProviderEvidenceRegistry = (
  campaign: CampaignShellDetail,
): ProviderEvidenceRegistry => {
  const verificationPipeline = createVerificationPipelineReadinessGate(campaign);
  const walletProviderQaGate = createWalletProviderQaReadinessGate(campaign.walletSessions);
  const exportReadiness = createExportConfirmationReadinessGate(campaign);
  const aiContentPack = createAiContentPackWorkbench(campaign);
  const entries = [
    ...verificationPipeline.paths.map(createProviderEvidenceEntryFromPipeline),
    createWalletProviderEvidenceEntry(walletProviderQaGate),
    createAnalyticsExportProviderEvidenceEntry(exportReadiness),
    createAiContentProviderEvidenceEntry(aiContentPack),
    createContractExportProviderEvidenceEntry(exportReadiness),
  ];

  return {
    campaignId: campaign.id,
    summary: summarizeProviderEvidenceRegistry(entries),
    entries,
    adapterContracts: entries.map(createAdapterContract),
    boundary: providerEvidenceRegistryBoundary,
    nextAction: providerEvidenceRegistryNextAction,
  };
};

const createEligibilityResult = (
  campaign: CampaignShellDetail,
  participant: ParticipantSnapshot,
  taskStates: ParticipantTaskState[],
  pointsThreshold = defaultPointsThreshold,
): EligibilityResult => {
  const missingTasks = computeMissingTasks(campaign.tasks, participant);
  const pendingTasks = taskStates.filter((task) => task.status === "pending");
  const riskReviewTasks = taskStates.filter(
    (task) => task.status === "failed" || task.status === "manual_review",
  );
  const missingThreshold = participant.totalPoints < pointsThreshold;
  const walletSession = campaign.walletSessions.find(
    (session) => session.sessionId === participant.walletSessionId || session.address === participant.walletAddress,
  );
  const walletStatus = walletSession
    ? deriveEligibilityWalletStatus(
        walletSession,
        campaign.walletPolicy,
        missingTasks.map((task) => task.templateCode),
        participant.riskFlags,
      )
    : undefined;

  if (
    campaign.status === "ended" ||
    campaign.status === "exported" ||
    campaign.status === "archived"
  ) {
    return {
      status: "ended",
      score: participant.totalPoints,
      pointsThreshold,
      missingTaskIds: missingTasks.map((task) => task.id),
      riskFlags: participant.riskFlags,
      reason: {
        "en-US": "Campaign has ended; winner export review is closed for this seeded view.",
        "zh-CN": "活动已结束；当前 seeded 视图的获奖名单审核已关闭。",
        "zh-TW": "Campaign has ended; winner export review is closed for this seeded view.",
      },
      nextAction: {
        "en-US": "Review final results without assuming reward distribution.",
        "zh-CN": "查看最终结果，但不要将其理解为自动发奖。",
        "zh-TW": "Review final results without assuming reward distribution.",
      },
      walletStatus,
    };
  }

  if (walletStatus && !walletStatus.walletTypeVerified) {
    return {
      status: "not_eligible",
      score: participant.totalPoints,
      pointsThreshold,
      missingTaskIds: missingTasks.map((task) => task.id),
      riskFlags: participant.riskFlags,
      reason: walletStatus.statusMessage,
      nextAction:
        walletStatus.nextAction ?? {
          "en-US": "Verify wallet ownership before export eligibility.",
          "zh-CN": "请先验证钱包归属，再进入导出资格。",
          "zh-TW": "Verify wallet ownership before export eligibility.",
        },
      walletStatus,
    };
  }

  if (missingTasks.length > 0 || missingThreshold) {
    return {
      status: "not_eligible",
      score: participant.totalPoints,
      pointsThreshold,
      missingTaskIds: missingTasks.map((task) => task.id),
      riskFlags: participant.riskFlags,
      reason: {
        "en-US": "Required tasks or minimum points are still missing.",
        "zh-CN": "仍缺少必做任务或最低积分。",
        "zh-TW": "Required tasks or minimum points are still missing.",
      },
      nextAction: {
        "en-US": "Complete the missing required tasks before export eligibility.",
        "zh-CN": "完成缺失的必做任务后再进入导出资格。",
        "zh-TW": "Complete the missing required tasks before export eligibility.",
      },
      walletStatus,
    };
  }

  if (pendingTasks.length > 0) {
    return {
      status: "pending",
      score: participant.totalPoints,
      pointsThreshold,
      missingTaskIds: [],
      riskFlags: participant.riskFlags,
      reason: {
        "en-US": "All required work is present, but verification is still pending.",
        "zh-CN": "必做任务已满足，但验证仍在等待中。",
        "zh-TW": "All required work is present, but verification is still pending.",
      },
      nextAction: {
        "en-US": "Wait for seeded verification to complete.",
        "zh-CN": "等待 seeded 验证完成。",
        "zh-TW": "Wait for seeded verification to complete.",
      },
      walletStatus,
    };
  }

  if (participant.riskFlags.length > 0 || riskReviewTasks.length > 0) {
    return {
      status: "risk_flagged",
      score: participant.totalPoints,
      pointsThreshold,
      missingTaskIds: [],
      riskFlags: participant.riskFlags,
      reason: {
        "en-US": "Eligibility is held for manual risk review.",
        "zh-CN": "资格因风险审核暂缓。",
        "zh-TW": "Eligibility is held for manual risk review.",
      },
      nextAction: {
        "en-US": "Wait for manual review before winner export.",
        "zh-CN": "等待人工审核后再进入获奖名单导出。",
        "zh-TW": "Wait for manual review before winner export.",
      },
      walletStatus,
    };
  }

  return {
    status: "eligible",
    score: participant.totalPoints,
    pointsThreshold,
    missingTaskIds: [],
    riskFlags: [],
    reason: {
      "en-US": "Required tasks and minimum points are satisfied.",
      "zh-CN": "必做任务和最低积分均已满足。",
      "zh-TW": "Required tasks and minimum points are satisfied.",
    },
    nextAction: {
      "en-US": "Stay active until the campaign export window closes.",
      "zh-CN": "在活动导出窗口关闭前保持活跃。",
      "zh-TW": "Stay active until the campaign export window closes.",
    },
    walletStatus,
  };
};

const createParticipationMetrics = (
  tasks: CampaignTask[],
  participant: ParticipantSnapshot,
  taskStates: ParticipantTaskState[],
  pointsThreshold = defaultPointsThreshold,
  eligibleRankCutoff = defaultEligibleRankCutoff,
): ParticipationMetrics => {
  const requiredTasks = tasks.filter((task) => task.required);

  return {
    completedRequiredTasks: requiredTasks.filter((task) =>
      participant.completedTaskIds.includes(task.id),
    ).length,
    totalRequiredTasks: requiredTasks.length,
    completedTasks: taskStates.filter((task) => task.completed).length,
    totalTasks: tasks.length,
    eligibleRankCutoff,
    participantRank: participant.rank ?? 0,
    pointsThreshold,
  };
};

const createLeaderboard = (participants: ParticipantSnapshot[]): LeaderboardRow[] =>
  [...participants]
    .sort((left, right) => (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER))
    .map((participant) => ({
      rank: participant.rank ?? 0,
      walletAddress: participant.walletAddress,
      accountType: participant.accountType,
      walletSource: participant.walletSource,
      totalPoints: participant.totalPoints,
      eligible: participant.eligible,
      riskFlags: participant.riskFlags,
      localePreference: participant.localePreference,
    }));

const requiredProgressPercent = (metrics: ParticipationMetrics) =>
  Math.round((metrics.completedRequiredTasks / Math.max(1, metrics.totalRequiredTasks)) * 100);

const missingTaskDetails = (
  tasks: CampaignTask[],
  taskStates: ParticipantTaskState[],
  missingTaskIds: string[],
): EligibilityMissingTaskDetail[] =>
  missingTaskIds.flatMap((taskId) => {
    const task = tasks.find((candidate) => candidate.id === taskId);

    if (!task) {
      return [];
    }

    const state = taskStates.find((candidate) => candidate.taskId === task.id);

    return {
      evidenceSource: state?.evidenceSource,
      nextAction: state?.nextAction ?? taskNextAction(task, "ready"),
      points: task.points,
      status: state?.status ?? "ready",
      taskId: task.id,
      templateCode: task.templateCode,
      title: task.title,
      verificationType: task.verificationType,
      walletCompatibility: task.walletCompatibility,
    };
  });

const createEligibilityEntry = (
  campaign: CampaignShellDetail,
  participant: ParticipantSnapshot,
): EligibilityCheckEntry => {
  const participation = createParticipationReadModel(campaign, participant);

  return {
    accountType: participant.accountType,
    id: participant.id,
    label: {
      "en-US": `${participant.walletAddress} · ${participation.eligibility.status.replace(/_/g, " ")}`,
      "zh-CN": `${participant.walletAddress} · ${participation.eligibility.status.replace(/_/g, " ")}`,
      "zh-TW": `${participant.walletAddress} · ${participation.eligibility.status.replace(/_/g, " ")}`,
    },
    localePreference: participant.localePreference,
    riskFlags: participant.riskFlags,
    score: participant.totalPoints,
    status: participation.eligibility.status,
    walletAddress: participant.walletAddress,
    walletSource: participant.walletSource,
    walletTypeVerified: participation.eligibility.walletStatus?.walletTypeVerified ?? false,
  };
};

const addressOnlyEligibilityResult = (
  campaign: CampaignShellDetail,
  walletAddress: string,
): EligibilityCheckResult => {
  const requiredTaskCount = campaign.tasks.filter((task) => task.required).length;

  return {
    accountType: "UNKNOWN",
    boundary: eligibilityCheckerBoundary,
    completedRequiredTasks: 0,
    knownParticipant: false,
    missingTasks: [],
    pointsThreshold: defaultPointsThreshold,
    progressPercent: 0,
    reason: {
      "en-US": "Address-only checks cannot infer AA or EOA wallet type until a supported wallet verifies ownership.",
      "zh-CN": "仅地址检查无法判断 AA 或 EOA 钱包类型，必须通过受支持的钱包验证归属。",
      "zh-TW": "Address-only checks cannot infer AA or EOA wallet type until a supported wallet verifies ownership.",
    },
    riskFlags: [],
    score: 0,
    status: "pending",
    totalRequiredTasks: requiredTaskCount,
    nextAction: {
      "en-US": "Connect or verify a supported wallet before export eligibility can be trusted.",
      "zh-CN": "请连接或验证受支持的钱包后，再判断导出资格。",
      "zh-TW": "Connect or verify a supported wallet before export eligibility can be trusted.",
    },
    walletAddress,
    walletSource: "OTHER",
    walletTypeVerified: false,
  };
};

const createKnownEligibilityResult = (
  campaign: CampaignShellDetail,
  participant: ParticipantSnapshot,
): EligibilityCheckResult => {
  const participation = createParticipationReadModel(campaign, participant);
  const metrics = participation.metrics;
  const walletStatus = participation.eligibility.walletStatus;

  return {
    accountType: participant.accountType,
    boundary: eligibilityCheckerBoundary,
    completedRequiredTasks: metrics.completedRequiredTasks,
    knownParticipant: true,
    missingTasks: missingTaskDetails(
      campaign.tasks,
      participation.taskStates,
      participation.eligibility.missingTaskIds,
    ),
    participantId: participant.id,
    pointsThreshold: participation.eligibility.pointsThreshold,
    progressPercent: requiredProgressPercent(metrics),
    reason: participation.eligibility.reason,
    riskFlags: participation.eligibility.riskFlags,
    score: participation.eligibility.score,
    status: participation.eligibility.status,
    totalRequiredTasks: metrics.totalRequiredTasks,
    nextAction: participation.eligibility.nextAction,
    walletAddress: participant.walletAddress,
    walletSource: participant.walletSource,
    walletStatus,
    walletTypeVerified: walletStatus?.walletTypeVerified ?? false,
  };
};

export const createEligibilityCheckerReadModel = (
  campaign: CampaignShellDetail,
  selectedAddress?: string,
): EligibilityCheckerReadModel => {
  const defaultParticipant = campaign.participants[1] ?? campaign.participants[0];
  const normalizedSelectedAddress = selectedAddress?.trim() || defaultParticipant?.walletAddress || "";
  const participant = campaign.participants.find(
    (candidate) => candidate.walletAddress.toLowerCase() === normalizedSelectedAddress.toLowerCase(),
  );
  const result = participant
    ? createKnownEligibilityResult(campaign, participant)
    : addressOnlyEligibilityResult(campaign, normalizedSelectedAddress);

  return {
    boundary: eligibilityCheckerBoundary,
    campaignId: campaign.id,
    entries: campaign.participants.map((entry) => createEligibilityEntry(campaign, entry)),
    result,
    selectedAddress: normalizedSelectedAddress,
    summary: {
      description: {
        "en-US": "Check wallet-aware eligibility, missing tasks, risk review state, and next action before winners export.",
        "zh-CN": "在导出 winners 前检查钱包感知资格、缺失任务、风险审核状态和下一步。",
        "zh-TW": "Check wallet-aware eligibility, missing tasks, risk review state, and next action before winners export.",
      },
      status: result.status,
      title: {
        "en-US": "Eligibility checker",
        "zh-CN": "资格检查器",
        "zh-TW": "Eligibility checker",
      },
    },
  };
};

export const leaderboardModes: LeaderboardMode[] = [
  {
    id: "total_points",
    label: {
      "en-US": "Total Points",
      "zh-CN": "总积分",
      "zh-TW": "Total Points",
    },
    description: {
      "en-US": "Ranks users by total campaign points.",
      "zh-CN": "按活动总积分排序用户。",
      "zh-TW": "Ranks users by total campaign points.",
    },
    qualityPolicy: {
      "en-US": "Total points remain a review signal and do not distribute rewards.",
      "zh-CN": "总积分仍是审核信号，不会触发发奖。",
      "zh-TW": "Total points remain a review signal and do not distribute rewards.",
    },
  },
  {
    id: "on_chain",
    label: {
      "en-US": "On-chain",
      "zh-CN": "链上贡献",
      "zh-TW": "On-chain",
    },
    description: {
      "en-US": "Prioritizes verified wallet, on-chain, and dApp API actions.",
      "zh-CN": "优先展示已验证的钱包、链上和 dApp API 行为。",
      "zh-TW": "Prioritizes verified wallet, on-chain, and dApp API actions.",
    },
    qualityPolicy: {
      "en-US": "On-chain and dApp actions carry more quality weight than low-cost social tasks.",
      "zh-CN": "链上和 dApp 行为比低成本社交任务具有更高质量权重。",
      "zh-TW": "On-chain and dApp actions carry more quality weight than low-cost social tasks.",
    },
  },
  {
    id: "referral",
    label: {
      "en-US": "Referral",
      "zh-CN": "邀请",
      "zh-TW": "Referral",
    },
    description: {
      "en-US": "Ranks qualified referral value, not raw signup counts.",
      "zh-CN": "按合格邀请价值排序，而不是原始注册数量。",
      "zh-TW": "Ranks qualified referral value, not raw signup counts.",
    },
    qualityPolicy: defaultReferralRule,
  },
  {
    id: "low_risk_verified",
    label: {
      "en-US": "Low-risk verified",
      "zh-CN": "低风险已验证",
      "zh-TW": "Low-risk verified",
    },
    description: {
      "en-US": "Prioritizes eligible users with verified actions and no risk flags.",
      "zh-CN": "优先展示有已验证行为且无风险标记的合格用户。",
      "zh-TW": "Prioritizes eligible users with verified actions and no risk flags.",
    },
    qualityPolicy: {
      "en-US": "Risk flags are review inputs, not automatic exclusions or aelf reward decisions.",
      "zh-CN": "风险标记是审核输入，不是自动排除或 aelf 发奖决定。",
      "zh-TW": "Risk flags are review inputs, not automatic exclusions or aelf reward decisions.",
    },
  },
];

const onChainVerificationTypes = new Set<CampaignTask["verificationType"]>([
  "WALLET",
  "ON_CHAIN",
  "DAPP_API",
]);

const riskLevelFor = (participant: ParticipantSnapshot) =>
  participant.riskFlags.length === 0 ? "low" : participant.riskFlags.length > 1 ? "high" : "medium";

const createLeaderboardRow = (
  campaign: CampaignShellDetail,
  participant: ParticipantSnapshot,
): Omit<LeaderboardModeRow, "modeScore" | "rank"> & {
  sourceRank: number;
} => {
  const taskStates = deriveParticipantTaskStates(campaign.tasks, participant);
  const completedStates = taskStates.filter((state) => state.completed);
  const onChainActionCount = completedStates.filter((state) => {
    const task = campaign.tasks.find((candidate) => candidate.id === state.taskId);

    return task ? onChainVerificationTypes.has(task.verificationType) : false;
  }).length;
  const referral = participant.referralSummary ?? defaultReferralSummary;

  return {
    accountType: participant.accountType,
    eligible: participant.eligible,
    localePreference: participant.localePreference,
    onChainActionCount,
    qualifiedInvitees: referral.qualifiedInvitees,
    referralPoints: referral.referralPoints,
    riskFlags: participant.riskFlags,
    riskLevel: riskLevelFor(participant),
    sourceRank: participant.rank ?? Number.MAX_SAFE_INTEGER,
    totalPoints: participant.totalPoints,
    verifiedActionCount: completedStates.length,
    walletAddress: participant.walletAddress,
    walletSource: participant.walletSource,
  };
};

const modeScore = (
  row: Omit<LeaderboardModeRow, "modeScore" | "rank"> & { sourceRank: number },
  mode: LeaderboardModeId,
) => {
  if (mode === "on_chain") {
    return row.onChainActionCount;
  }

  if (mode === "referral") {
    return row.referralPoints;
  }

  if (mode === "low_risk_verified") {
    return (row.eligible && row.riskFlags.length === 0 ? 1000 : 0) + row.verifiedActionCount;
  }

  return row.totalPoints;
};

const compareLeaderboardRows =
  (mode: LeaderboardModeId) =>
  (
    left: Omit<LeaderboardModeRow, "modeScore" | "rank"> & { sourceRank: number },
    right: Omit<LeaderboardModeRow, "modeScore" | "rank"> & { sourceRank: number },
  ) => {
    if (mode === "low_risk_verified") {
      const leftLowRisk = left.eligible && left.riskFlags.length === 0 ? 1 : 0;
      const rightLowRisk = right.eligible && right.riskFlags.length === 0 ? 1 : 0;

      return (
        rightLowRisk - leftLowRisk ||
        right.verifiedActionCount - left.verifiedActionCount ||
        right.totalPoints - left.totalPoints ||
        left.sourceRank - right.sourceRank
      );
    }

    if (mode === "on_chain") {
      return (
        right.onChainActionCount - left.onChainActionCount ||
        right.verifiedActionCount - left.verifiedActionCount ||
        right.totalPoints - left.totalPoints ||
        left.sourceRank - right.sourceRank
      );
    }

    if (mode === "referral") {
      return (
        right.referralPoints - left.referralPoints ||
        right.qualifiedInvitees - left.qualifiedInvitees ||
        right.totalPoints - left.totalPoints ||
        left.sourceRank - right.sourceRank
      );
    }

    return right.totalPoints - left.totalPoints || left.sourceRank - right.sourceRank;
  };

export const createLeaderboardReadModel = (
  campaign: CampaignShellDetail,
  mode: LeaderboardModeId = "total_points",
): LeaderboardReadModel => {
  const selectedMode = leaderboardModes.some((candidate) => candidate.id === mode)
    ? mode
    : "total_points";
  const modeMetadata = leaderboardModes.find((candidate) => candidate.id === selectedMode) ?? leaderboardModes[0];
  const rows = campaign.participants
    .map((participant) => createLeaderboardRow(campaign, participant))
    .sort(compareLeaderboardRows(selectedMode))
    .map<LeaderboardModeRow>((row, index) => ({
      ...row,
      modeScore: modeScore(row, selectedMode),
      rank: index + 1,
    }));

  return {
    boundary: leaderboardBoundary,
    campaignId: campaign.id,
    modes: leaderboardModes,
    qualityPolicy: modeMetadata.qualityPolicy,
    rows,
    selectedMode,
    summary: {
      "en-US": `${modeMetadata.label["en-US"]} ranks ${rows.length} seeded participants.`,
      "zh-CN": `${modeMetadata.label["zh-CN"]}展示 ${rows.length} 个 seeded 参与者。`,
      "zh-TW": `${modeMetadata.label["en-US"]} ranks ${rows.length} seeded participants.`,
    },
  };
};

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const campaignRouteBaseUrl = "https://campaign.local";

const localeAnalyticsBoundary: LocalizedText = {
  "en-US": "Seeded/local locale analytics readiness only. No live analytics SDK, event ingestion, crawler service, or external dashboard is connected.",
  "zh-CN": "仅 seeded/本地语言分析准备度。不会连接实时 analytics SDK、事件采集、crawler 服务或外部 dashboard。",
  "zh-TW": "Seeded/local locale analytics readiness only. No live analytics SDK, event ingestion, crawler service, or external dashboard is connected.",
};

const shareCardFallbackNotice: LocalizedText = {
  "en-US": "This locale uses English fallback until localized campaign content is reviewed.",
  "zh-CN": "该语言在本地化活动内容审核完成前使用英文回退。",
  "zh-TW": "This locale uses English fallback until localized campaign content is reviewed.",
};

const shareCardReadyNotice: LocalizedText = {
  "en-US": "Localized campaign share copy is ready for local preview.",
  "zh-CN": "本地化活动分享文案可用于本地预览。",
  "zh-TW": "Localized campaign share copy is ready for local preview.",
};

const routeUrlFor = (
  locale: (typeof supportedLocales)[number],
  campaignSlug: string,
  baseUrl = campaignRouteBaseUrl,
) => `${baseUrl}${createLocalizedCampaignPath(locale, campaignSlug)}`;

const revisionReadyForShare = (revision: ContentRevision | undefined) =>
  revision?.status === "published" || revision?.status === "human_reviewed";

const metadataField = (
  name: string,
  content: string,
  kind: CampaignMetadataField["kind"],
): CampaignMetadataField => ({ name, content, kind });

export const createCampaignShareCardReadiness = (
  campaign: Pick<CampaignShellDetail, "id" | "slug" | "title" | "subtitle" | "contentRevisions">,
  locale: (typeof supportedLocales)[number],
  baseUrl = campaignRouteBaseUrl,
): CampaignShareCardReadiness => {
  const englishRevision = campaign.contentRevisions.find((revision) => revision.locale === "en-US");
  const requestedRevision = campaign.contentRevisions.find((revision) => revision.locale === locale);
  const shouldUseRequestedRevision = locale === "en-US" || revisionReadyForShare(requestedRevision);
  const sourceRevision = shouldUseRequestedRevision ? requestedRevision : englishRevision;
  const fallbackToEnglish = locale !== "en-US" && sourceRevision?.locale !== locale;
  const title = sourceRevision?.title?.trim() || campaign.title["en-US"];
  const description = sourceRevision?.description?.trim() || campaign.subtitle["en-US"];
  const canonicalUrl = routeUrlFor(locale, campaign.slug, baseUrl);
  const alternateUrls = Object.fromEntries(
    supportedLocales.map((supportedLocale) => [
      supportedLocale,
      routeUrlFor(supportedLocale, campaign.slug, baseUrl),
    ]),
  ) as Record<(typeof supportedLocales)[number], string>;
  const image = `${baseUrl}/share-cards/${campaign.slug}-${locale}.png`;
  const readiness: PublishState = fallbackToEnglish ? "warning" : "ready";
  const fallbackNotice = fallbackToEnglish ? shareCardFallbackNotice : shareCardReadyNotice;
  const metadataTitle = `${title} | aelf Campaign OS`;

  return {
    campaignId: campaign.id,
    locale,
    canonicalUrl,
    alternateUrls,
    title,
    description,
    image,
    fallbackToEnglish,
    contentStatus: requestedRevision?.status ?? "empty",
    readiness,
    fallbackNotice,
    metadataFields: [
      metadataField("title", metadataTitle, "document-title"),
      metadataField("description", description, "meta-name"),
      metadataField("og:title", metadataTitle, "meta-property"),
      metadataField("og:description", description, "meta-property"),
      metadataField("og:image", image, "meta-property"),
      metadataField("og:url", canonicalUrl, "meta-property"),
      metadataField("twitter:card", "summary_large_image", "meta-name"),
      metadataField("twitter:title", metadataTitle, "meta-name"),
      metadataField("twitter:description", description, "meta-name"),
      metadataField("twitter:image", image, "meta-name"),
    ],
  };
};

const localeMetricLabel = (metric: LocaleAnalyticsMetric): LocalizedText => {
  const labels: Record<LocaleAnalyticsMetric, LocalizedText> = {
    campaign_views: {
      "en-US": "Campaign views",
      "zh-CN": "活动浏览",
      "zh-TW": "Campaign views",
    },
    wallet_connect_conversion: {
      "en-US": "Wallet connect conversion",
      "zh-CN": "钱包连接转化",
      "zh-TW": "Wallet connect conversion",
    },
    task_completion: {
      "en-US": "Task completion",
      "zh-CN": "任务完成",
      "zh-TW": "Task completion",
    },
    referral_conversion: {
      "en-US": "Referral conversion",
      "zh-CN": "邀请转化",
      "zh-TW": "Referral conversion",
    },
    translation_fallback_rate: {
      "en-US": "Translation fallback rate",
      "zh-CN": "翻译回退率",
      "zh-TW": "Translation fallback rate",
    },
    ai_draft_accepted_rate: {
      "en-US": "AI draft accepted rate",
      "zh-CN": "AI 草稿采用率",
      "zh-TW": "AI 草稿採用率",
    },
    manual_edit_time: {
      "en-US": "Manual edit time",
      "zh-CN": "人工编辑耗时",
      "zh-TW": "人工編輯耗時",
    },
  };

  return labels[metric];
};

const localeReadinessRow = (
  locale: (typeof supportedLocales)[number],
  metric: LocaleAnalyticsMetric,
  value: string,
  readiness: PublishState,
): LocaleAnalyticsReadinessRow => ({
  id: `${metric}-${locale.toLowerCase()}`,
  locale,
  metric,
  label: localeMetricLabel(metric),
  value,
  readiness,
  boundary: localeAnalyticsBoundary,
});

const aiDraftAcceptedReadiness = (
  locale: (typeof supportedLocales)[number],
  revision: ContentRevision | undefined,
): Pick<LocaleAnalyticsReadinessRow, "value" | "readiness"> => {
  if (locale === "en-US") {
    return { readiness: "ready", value: "N/A" };
  }

  return revisionReadyForShare(revision)
    ? { readiness: "ready", value: "100%" }
    : { readiness: "warning", value: "0%" };
};

const manualEditTimeReadiness = (
  locale: (typeof supportedLocales)[number],
  revision: ContentRevision | undefined,
  fallbackActive: boolean,
): Pick<LocaleAnalyticsReadinessRow, "value" | "readiness"> => {
  if (locale === "en-US") {
    return { readiness: "ready", value: "Source locale" };
  }

  if (revision?.status === "ai_draft") {
    return { readiness: "warning", value: "15 min pending review" };
  }

  if (fallbackActive) {
    return { readiness: "warning", value: "30 min fallback review" };
  }

  return { readiness: "ready", value: "10 min reviewed" };
};

export const createLocaleAnalyticsReadiness = (
  campaign: Pick<CampaignShellDetail, "participants" | "contentRevisions" | "metrics">,
): LocaleAnalyticsReadinessRow[] => {
  const totalParticipants = campaign.participants.length || 1;
  const completedTasks = campaign.participants.reduce(
    (count, participant) => count + participant.completedTaskIds.length,
    0,
  );
  const totalTaskSlots = totalParticipants * 3;
  const invitedCount = campaign.participants.reduce(
    (count, participant) => count + (participant.referralSummary?.invitedCount ?? 0),
    0,
  );
  const qualifiedInvitees = campaign.participants.reduce(
    (count, participant) => count + (participant.referralSummary?.qualifiedInvitees ?? 0),
    0,
  );

  return supportedLocales.flatMap((locale) => {
    const localeParticipants = campaign.participants.filter(
      (participant) => participant.localePreference === locale,
    );
    const localeShare = localeParticipants.length / totalParticipants;
    const localeRevision = campaign.contentRevisions.find((revision) => revision.locale === locale);
    const fallbackActive = locale !== "en-US" && !revisionReadyForShare(localeRevision);
    const aiDraftAccepted = aiDraftAcceptedReadiness(locale, localeRevision);
    const manualEditTime = manualEditTimeReadiness(locale, localeRevision, fallbackActive);

    return [
      localeReadinessRow(
        locale,
        "campaign_views",
        String(Math.max(1, Math.round(campaign.metrics.connectedWallets * localeShare))),
        "ready",
      ),
      localeReadinessRow(
        locale,
        "wallet_connect_conversion",
        formatPercent(localeParticipants.length / totalParticipants),
        localeParticipants.length > 0 ? "ready" : "warning",
      ),
      localeReadinessRow(
        locale,
        "task_completion",
        formatPercent(completedTasks / Math.max(1, totalTaskSlots)),
        "ready",
      ),
      localeReadinessRow(
        locale,
        "referral_conversion",
        formatPercent(invitedCount === 0 ? 0 : qualifiedInvitees / invitedCount),
        "warning",
      ),
      localeReadinessRow(
        locale,
        "translation_fallback_rate",
        fallbackActive ? "100%" : "0%",
        fallbackActive ? "warning" : "ready",
      ),
      localeReadinessRow(
        locale,
        "ai_draft_accepted_rate",
        aiDraftAccepted.value,
        aiDraftAccepted.readiness,
      ),
      localeReadinessRow(
        locale,
        "manual_edit_time",
        manualEditTime.value,
        manualEditTime.readiness,
      ),
    ];
  });
};

const createAnalytics = (
  campaign: CampaignShellDetail,
  exportBatch: ExportBatchSummary,
): AnalyticsKpi[] => {
  const totalParticipants = campaign.participants.length;
  const verifiedActions = campaign.participants.reduce(
    (count, participant) => count + participant.completedTaskIds.length,
    0,
  );
  const riskFlaggedParticipants = campaign.participants.filter(
    (participant) => participant.riskFlags.length > 0,
  ).length;
  const invitedCount = campaign.participants.reduce(
    (count, participant) => count + (participant.referralSummary?.invitedCount ?? 0),
    0,
  );
  const qualifiedInvitees = campaign.participants.reduce(
    (count, participant) => count + (participant.referralSummary?.qualifiedInvitees ?? 0),
    0,
  );
  const referralConversion = invitedCount === 0 ? 0 : qualifiedInvitees / invitedCount;
  const riskRate = totalParticipants === 0 ? 0 : riskFlaggedParticipants / totalParticipants;

  return [
    {
      id: "participants",
      label: {
        "en-US": "Participants",
        "zh-CN": "参与者",
        "zh-TW": "Participants",
      },
      value: totalParticipants.toLocaleString("en-US"),
      trend: {
        "en-US": "Seeded wallets in review sample.",
        "zh-CN": "审核样本中的 seeded 钱包。",
        "zh-TW": "Seeded wallets in review sample.",
      },
      tone: "neutral",
      dimension: "audience",
    },
    {
      id: "verified-actions",
      label: {
        "en-US": "Verified actions",
        "zh-CN": "有效行为",
        "zh-TW": "Verified actions",
      },
      value: verifiedActions.toLocaleString("en-US"),
      trend: {
        "en-US": "Derived from local task completion fixtures.",
        "zh-CN": "来自本地任务完成 fixtures。",
        "zh-TW": "Derived from local task completion fixtures.",
      },
      tone: "good",
      dimension: "quality",
    },
    {
      id: "eligible-winners",
      label: {
        "en-US": "Eligible winners",
        "zh-CN": "合格 winners",
        "zh-TW": "Eligible winners",
      },
      value: String(exportBatch.readyCount),
      trend: {
        "en-US": "Preview only; project distributes rewards.",
        "zh-CN": "仅预览；由项目方发奖。",
        "zh-TW": "Preview only; project distributes rewards.",
      },
      tone: "good",
      dimension: "export",
    },
    {
      id: "risk-rate",
      label: {
        "en-US": "Risk rate",
        "zh-CN": "风险比例",
        "zh-TW": "Risk rate",
      },
      value: formatPercent(riskRate),
      trend: {
        "en-US": "Risk flags are review signals.",
        "zh-CN": "风险标记是审核信号。",
        "zh-TW": "Risk flags are review signals.",
      },
      tone: riskRate > 0.2 ? "warning" : "neutral",
      dimension: "risk",
    },
    {
      id: "referral-conversion",
      label: {
        "en-US": "Referral conversion",
        "zh-CN": "邀请转化",
        "zh-TW": "Referral conversion",
      },
      value: formatPercent(referralConversion),
      trend: {
        "en-US": "Only qualified invitees count.",
        "zh-CN": "仅合格被邀请人计入。",
        "zh-TW": "Only qualified invitees count.",
      },
      tone: "warning",
      dimension: "referral",
    },
    {
      id: "retention",
      label: {
        "en-US": "Retention signal",
        "zh-CN": "留存信号",
        "zh-TW": "Retention signal",
      },
      value: "31%",
      trend: {
        "en-US": "Seeded Day 7 repeat action signal.",
        "zh-CN": "Seeded Day 7 重复行为信号。",
        "zh-TW": "Seeded Day 7 repeat action signal.",
      },
      tone: "neutral",
      dimension: "retention",
    },
    {
      id: "export-readiness",
      label: {
        "en-US": "Export readiness",
        "zh-CN": "导出准备度",
        "zh-TW": "Export readiness",
      },
      value: `${exportBatch.readyCount}/${campaign.participants.length}`,
      trend: {
        "en-US": `${exportBatch.blockedCount} rows need review before export approval.`,
        "zh-CN": `${exportBatch.blockedCount} 行需要审核后再批准导出。`,
        "zh-TW": `${exportBatch.blockedCount} rows need review before export approval.`,
      },
      tone: exportBatch.blockedCount > 0 ? "warning" : "good",
      dimension: "export",
    },
  ];
};

const createWalletSplit = (participants: ParticipantSnapshot[]): DimensionSplit[] => {
  const aaCount = participants.filter((participant) => participant.accountType === "AA").length;
  const eoaCount = participants.filter((participant) => participant.accountType === "EOA").length;
  const total = participants.length || 1;

  return [
    {
      id: "wallet-aa",
      label: "AA",
      count: aaCount,
      percentage: Math.round((aaCount / total) * 100),
    },
    {
      id: "wallet-eoa",
      label: "EOA",
      count: eoaCount,
      percentage: Math.round((eoaCount / total) * 100),
    },
  ];
};

const createLocaleSplit = (participants: ParticipantSnapshot[]): DimensionSplit[] => {
  const total = participants.length || 1;

  return supportedLocales.map((locale) => {
    const count = participants.filter((participant) => participant.localePreference === locale).length;

    return {
      id: `locale-${locale.toLowerCase()}`,
      label: locale,
      count,
      percentage: Math.round((count / total) * 100),
    };
  });
};

const createTaskEvidence = (
  tasks: CampaignTask[],
  participant: ParticipantSnapshot,
): TaskEvidenceSummary[] =>
  deriveParticipantTaskStates(tasks, participant)
    .map((taskState) => {
      const task = tasks.find((candidate) => candidate.id === taskState.taskId);

      return {
        taskId: taskState.taskId,
        label: task?.title ?? {
          "en-US": taskState.templateCode,
          "zh-CN": taskState.templateCode,
          "zh-TW": taskState.templateCode,
        },
        status: taskState.status === "ready" ? "pending" : taskState.status,
        source: taskState.evidenceSource,
        evidenceHash: evidenceHashFor(taskState.taskId, participant.walletAddress),
      };
    });

const createTaskRecords = (taskEvidence: TaskEvidenceSummary[]) =>
  taskEvidence.map((evidence) => `${evidence.taskId}:${evidence.status}:${evidence.source}`);

const createExportConfirmation = (): ExportConfirmation => ({
  includedFields: exportCsvColumns,
  verifiedRecordsOnly: true,
  rewardDistributionOwner: "campaign_project",
  noDistributionBoundary: rewardBoundary,
  riskBoundary: exportRiskBoundary,
});

const exportRowValueByColumn = (
  row: ExportPreviewRow,
  column: ExportCsvColumn,
): string | number | boolean | string[] | undefined => {
  const values = {
    campaign_id: row.campaignId,
    wallet_address: row.walletAddress,
    account_type: row.accountType,
    wallet_source: row.walletSource,
    locale_preference: row.localePreference,
    total_points: row.totalPoints,
    rank: row.rank ?? 0,
    eligible: row.eligible,
    missing_tasks: row.missingTasks,
    risk_flags: row.riskFlags,
    referrer_address: row.referrerAddress,
    task_records: row.taskRecords,
    evidence_hashes: row.evidenceHashes,
    export_batch_id: row.exportBatchId,
  } satisfies Record<ExportCsvColumn, string | number | boolean | string[]>;

  return values[column];
};

const serializeExportScalar = (value: string | number | boolean | string[] | undefined): string => {
  if (Array.isArray(value)) {
    return value.join("|");
  }

  return value === undefined ? "" : String(value);
};

const escapeCsvValue = (value: string | number | boolean | string[] | undefined): string => {
  const serialized = serializeExportScalar(value);

  return /[",\n\r]/.test(serialized) ? `"${serialized.replace(/"/g, "\"\"")}"` : serialized;
};

const serializeExportRowsToCsv = (rows: ExportPreviewRow[]): string =>
  [
    exportCsvColumns.join(","),
    ...rows.map((row) =>
      exportCsvColumns.map((column) => escapeCsvValue(exportRowValueByColumn(row, column))).join(",")
    ),
  ].join("\n");

const projectExportRowForArtifact = (row: ExportPreviewRow) =>
  Object.fromEntries(
    exportCsvColumns.map((column) => [column, exportRowValueByColumn(row, column)]),
  ) as Record<ExportCsvColumn, string | number | boolean | string[] | undefined>;

const serializeExportRowsToJson = (preview: ExportPreview): string =>
  JSON.stringify(
    {
      campaignId: preview.campaignId,
      columns: exportCsvColumns,
      rows: preview.rows.map(projectExportRowForArtifact),
    },
    null,
    2,
  );

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

const serializeExportArtifactPayload = (preview: ExportPreview, format: ExportPreviewMode): string =>
  format === "csv" ? serializeExportRowsToCsv(preview.rows) : serializeExportRowsToJson(preview);

export const createExportArtifact = (
  preview: ExportPreview,
  format: ExportPreviewMode,
): ExportArtifact => {
  const payload = serializeExportArtifactPayload(preview, format);
  const readyRows = preview.rows.filter((row) => row.rowStatus === "ready").length;
  const reviewRequiredRows = preview.rows.filter((row) => row.rowStatus === "review_required").length;
  const blockedRows = preview.rows.filter((row) => row.rowStatus === "blocked").length;
  const batchId = preview.rows[0]?.exportBatchId ?? exportBatchId;

  return {
    campaignId: preview.campaignId,
    batchId,
    format,
    fileName: `${preview.campaignId}-${batchId}-local-review.${format}`,
    mimeType: exportArtifactMimeTypes[format],
    extension: format,
    payload,
    metadata: {
      columns: exportCsvColumns,
      totalRows: preview.rows.length,
      readyRows,
      reviewRequiredRows,
      blockedRows,
      checksum: createLocalReviewChecksum(payload),
      checksumAlgorithm: "fnv1a32-local-review",
      generatedMode: "local_review_only",
      payloadBytes: new TextEncoder().encode(payload).length,
    },
    safety: {
      localOnly: true,
      verifiedRecordsOnly: preview.confirmation.verifiedRecordsOnly,
      rewardDistributionOwner: preview.confirmation.rewardDistributionOwner,
      noDownloadUrl: true,
      noStorageWrite: true,
      noContractRoot: true,
      noContractTransaction: true,
      noRewardCustody: true,
      noRewardDistribution: true,
      boundary: exportArtifactBoundary,
    },
  };
};

const findMissingColumnValues = (
  row: Record<ExportCsvColumn, string | number | boolean | string[] | undefined>,
): ExportCsvColumn[] =>
  exportCsvColumns.filter((column) => {
    const value = row[column];

    return value === undefined || value === "";
  });

const createExportEvidenceRows = (
  campaignId: string,
  participants: ParticipantSnapshot[],
  tasks: CampaignTask[],
  sessions: CampaignShellDetail["walletSessions"],
): ExportEvidenceRow[] =>
  participants.map((participant) => {
    const taskEvidence = createTaskEvidence(tasks, participant);
    const taskRecords = createTaskRecords(taskEvidence);
    const evidenceHashes = taskEvidence.map((evidence) => evidence.evidenceHash);
    const walletSession = sessions.find(
      (session) => session.sessionId === participant.walletSessionId || session.address === participant.walletAddress,
    );
    const walletTypeVerified = walletSession ? isWalletSessionVerified(walletSession) : false;
    const baseRow = {
      campaign_id: campaignId,
      wallet_address: participant.walletAddress,
      account_type: participant.accountType,
      wallet_source: participant.walletSource,
      locale_preference: participant.localePreference,
      total_points: participant.totalPoints,
      rank: participant.rank ?? 0,
      eligible: participant.eligible,
      missing_tasks: computeMissingTasks(tasks, participant).map((task) => task.templateCode),
      risk_flags: participant.riskFlags,
      referrer_address: participant.referrerAddress,
      task_records: taskRecords,
      evidence_hashes: evidenceHashes,
      export_batch_id: exportBatchId,
    };
    const missingColumnValues = findMissingColumnValues(baseRow);
    const rowStatus =
      !walletTypeVerified || missingColumnValues.length > 0
        ? "blocked"
        : participant.eligible && participant.riskFlags.length === 0
          ? "ready"
          : "review_required";

    return {
      campaignId,
      walletAddress: participant.walletAddress,
      accountType: participant.accountType,
      walletSource: participant.walletSource,
      localePreference: participant.localePreference,
      totalPoints: participant.totalPoints,
      rank: participant.rank ?? 0,
      eligible: participant.eligible,
      missingTasks: baseRow.missing_tasks,
      riskFlags: participant.riskFlags,
      referrerAddress: participant.referrerAddress,
      taskEvidence,
      taskRecords,
      evidenceHashes,
      exportBatchId,
      walletTypeVerified,
      rowStatus,
      missingColumnValues,
    };
  });

const createExportBatch = (campaign: CampaignShellDetail): ExportBatchSummary => {
  const rows = createExportEvidenceRows(
    campaign.id,
    campaign.participants,
    campaign.tasks,
    campaign.walletSessions,
  );

  return {
    batchId: exportBatchId,
    columns: exportCsvColumns,
    readyCount: rows.filter((row) => row.rowStatus === "ready").length,
    blockedCount: rows.filter((row) => row.rowStatus !== "ready").length,
    disclaimer: rewardBoundary,
    confirmation: createExportConfirmation(),
    rows,
  };
};

const commandCenterBoundary: LocalizedText = {
  "en-US": "Seeded/local preview only. No live analytics, no real export file, no wallet SDK, no contract call, and export winners does not distribute rewards.",
  "zh-CN": "仅 seeded/本地预览。不会连接实时数据，不生成真实导出文件，不调用钱包 SDK 或合约，导出 winners 不等于发奖。",
  "zh-TW": "Seeded/local preview only. No live analytics, no real export file, no wallet SDK, no contract call, and export winners does not distribute rewards.",
};

const portfolioCommercialBoundary: LocalizedText = {
  "en-US":
    "Seeded/local portfolio and commercial readiness only. No live billing, payment, invoice, CRM, reward custody, reward distribution, wallet transaction, contract write, or backend mutation is executed; no aelf reward subsidy is executed.",
  "zh-CN":
    "仅 seeded/本地项目组合与商业化 readiness。不会执行实时 billing、支付、发票、CRM、奖励托管、发奖、钱包交易、合约写入、后端变更或 aelf 奖励补贴。",
  "zh-TW":
    "Seeded/local portfolio and commercial readiness only. No live billing, payment, invoice, CRM, reward custody, reward distribution, wallet transaction, contract write, backend mutation, or aelf reward subsidy is executed.",
};

const portfolioRewardBoundary: LocalizedText = {
  "en-US":
    "Reward budget is project or partner committed only; Campaign OS does not custody rewards, distribute rewards, or use aelf-funded subsidies.",
  "zh-CN":
    "奖励预算仅表示项目方或合作方承诺；Campaign OS 不托管奖励、不发奖，也不使用 aelf 补贴。",
  "zh-TW":
    "Reward budget is project or partner committed only; Campaign OS does not custody rewards, distribute rewards, or use aelf-funded subsidies.",
};

const exportDecisionBoundary: LocalizedText = {
  "en-US": "Campaign OS exports verified records only and does not distribute rewards; the campaign project owns reward fulfillment.",
  "zh-CN": "Campaign OS 只导出已验证记录，不执行发奖；奖励履约由活动项目方负责。",
  "zh-TW": "Campaign OS exports verified records only and does not distribute rewards; the campaign project owns reward fulfillment.",
};

export const exportConfirmationReadinessBoundary: LocalizedText = {
  "en-US":
    "Seeded/local export confirmation only. No real CSV or JSON file, download URL, storage write, contract root, contract transaction, reward custody, or reward distribution is executed.",
  "zh-CN":
    "仅 seeded/本地导出确认。不会生成真实 CSV 或 JSON 文件、下载链接、存储写入、合约 root、合约交易、奖励托管或发奖。",
  "zh-TW":
    "Seeded/local export confirmation only. No real CSV or JSON file, download URL, storage write, contract root, contract transaction, reward custody, or reward distribution is executed.",
};

const exportReadinessNextAction: LocalizedText = {
  "en-US": "Review row reasons, required acknowledgements, and root blockers before approving export readiness.",
  "zh-CN": "批准导出准备度前，请审核行原因、必需确认项与 root 阻断项。",
  "zh-TW": "Review row reasons, required acknowledgements, and root blockers before approving export readiness.",
};

const exportPreviewModeLabel: Record<ExportPreviewMode, LocalizedText> = {
  csv: {
    "en-US": "CSV preview",
    "zh-CN": "CSV 预览",
    "zh-TW": "CSV preview",
  },
  json: {
    "en-US": "JSON preview",
    "zh-CN": "JSON 预览",
    "zh-TW": "JSON preview",
  },
};

const createPreviewModeReadiness = (
  mode: ExportPreviewMode,
  includedFields: readonly ExportCsvColumn[],
): ExportPreviewModeReadiness => ({
  mode,
  label: exportPreviewModeLabel[mode],
  readiness: "ready",
  generatesFile: false,
  downloadAvailable: false,
  includedFields,
  boundary: {
    "en-US": `${mode.toUpperCase()} is a local preview only; no file or download URL is generated.`,
    "zh-CN": `${mode.toUpperCase()} 仅为本地预览；不会生成文件或下载链接。`,
    "zh-TW": `${mode.toUpperCase()} is a local preview only; no file or download URL is generated.`,
  },
  nextAction: {
    "en-US": "Use the preview for review; connect a backend export job in a later production workflow.",
    "zh-CN": "仅用于审核预览；后续生产流程再接入后端导出任务。",
    "zh-TW": "Use the preview for review; connect a backend export job in a later production workflow.",
  },
});

const requiredExportConfirmationFields: readonly ExportCsvColumn[] = [
  "wallet_address",
  "account_type",
  "wallet_source",
  "task_records",
  "total_points",
  "referrer_address",
  "risk_flags",
  "locale_preference",
  "export_batch_id",
];

const createExportFieldCoverage = (
  columns: readonly ExportCsvColumn[],
): ExportFieldCoverage => {
  const presentFields = requiredExportConfirmationFields.filter((field) => columns.includes(field));
  const missingFields = requiredExportConfirmationFields.filter((field) => !columns.includes(field));

  return {
    requiredFields: requiredExportConfirmationFields,
    presentFields,
    missingFields,
    coverageReady: missingFields.length === 0,
  };
};

const rowReasonCopy: Record<ExportRowReasonCode, { label: LocalizedText; nextAction: LocalizedText }> = {
  eligible_verified: {
    label: {
      "en-US": "Eligible verified row",
      "zh-CN": "合格且已验证行",
      "zh-TW": "Eligible verified row",
    },
    nextAction: {
      "en-US": "Keep row ready for project-owner export approval.",
      "zh-CN": "保持该行可进入项目方导出批准。",
      "zh-TW": "Keep row ready for project-owner export approval.",
    },
  },
  risk_review_required: {
    label: {
      "en-US": "Risk review required",
      "zh-CN": "需要风险审核",
      "zh-TW": "Risk review required",
    },
    nextAction: {
      "en-US": "Review risk flags as decision inputs; do not treat them as automatic reward rejection.",
      "zh-CN": "将风险标记作为决策输入审核；不要自动视为拒绝发奖。",
      "zh-TW": "Review risk flags as decision inputs; do not treat them as automatic reward rejection.",
    },
  },
  missing_required_tasks: {
    label: {
      "en-US": "Missing required tasks",
      "zh-CN": "缺少必做任务",
      "zh-TW": "Missing required tasks",
    },
    nextAction: {
      "en-US": "Keep row under review until required task evidence is complete.",
      "zh-CN": "必做任务证据完成前保持该行待审核。",
      "zh-TW": "Keep row under review until required task evidence is complete.",
    },
  },
  wallet_metadata_unverified: {
    label: {
      "en-US": "Wallet metadata unverified",
      "zh-CN": "钱包元数据未验证",
      "zh-TW": "Wallet metadata unverified",
    },
    nextAction: {
      "en-US": "Verify wallet type metadata before export approval.",
      "zh-CN": "导出批准前先验证钱包类型元数据。",
      "zh-TW": "Verify wallet type metadata before export approval.",
    },
  },
  missing_export_fields: {
    label: {
      "en-US": "Missing export field values",
      "zh-CN": "缺少导出字段值",
      "zh-TW": "Missing export field values",
    },
    nextAction: {
      "en-US": "Fill required export field values before approving the row.",
      "zh-CN": "批准该行前先补齐必需导出字段值。",
      "zh-TW": "Fill required export field values before approving the row.",
    },
  },
};

const createRowReason = (
  rowStatus: ExportRowStatusReason["rowStatus"],
  reasonCode: ExportRowReasonCode,
  affectedRows: number,
): ExportRowStatusReason => ({
  rowStatus,
  reasonCode,
  affectedRows,
  label: rowReasonCopy[reasonCode].label,
  nextAction: rowReasonCopy[reasonCode].nextAction,
});

const createRowStatusCoverage = (
  rows: readonly ExportPreviewRow[],
): ExportRowStatusReason[] => {
  const readyRows = rows.filter((row) => row.rowStatus === "ready").length;
  const riskReviewRows = rows.filter((row) => row.rowStatus === "review_required" && row.riskFlags.length > 0).length;
  const missingTaskRows = rows.filter((row) => row.rowStatus === "review_required" && row.missingTasks.length > 0).length;
  const unverifiedWalletRows = rows.filter((row) => row.rowStatus === "blocked" && !row.walletTypeVerified).length;
  const missingFieldRows = rows.filter((row) => row.rowStatus === "blocked" && row.missingColumnValues.length > 0).length;

  return [
    createRowReason("ready", "eligible_verified", readyRows),
    createRowReason("review_required", "risk_review_required", riskReviewRows),
    createRowReason("review_required", "missing_required_tasks", missingTaskRows),
    createRowReason("blocked", "wallet_metadata_unverified", unverifiedWalletRows),
    createRowReason("blocked", "missing_export_fields", missingFieldRows),
  ];
};

const createExportAcknowledgements = (): ExportAcknowledgement[] => [
  {
    id: "verified-records-only",
    label: {
      "en-US": "Verified records only",
      "zh-CN": "仅导出已验证记录",
      "zh-TW": "Verified records only",
    },
    description: {
      "en-US": "Campaign OS export readiness covers verified seeded records and review states.",
      "zh-CN": "Campaign OS 导出准备度只覆盖已验证 seeded 记录与审核状态。",
      "zh-TW": "Campaign OS export readiness covers verified seeded records and review states.",
    },
    required: true,
    acknowledged: true,
    ownerRole: "project_owner",
  },
  {
    id: "project-owned-reward-distribution",
    label: {
      "en-US": "Project owns final reward distribution",
      "zh-CN": "项目方负责最终发奖",
      "zh-TW": "Project owns final reward distribution",
    },
    description: exportFulfillmentOwner,
    required: true,
    acknowledged: true,
    ownerRole: "project_owner",
  },
  {
    id: "no-reward-custody",
    label: {
      "en-US": "No reward custody",
      "zh-CN": "不托管奖励",
      "zh-TW": "No reward custody",
    },
    description: noRewardCustodyBoundary,
    required: true,
    acknowledged: true,
    ownerRole: "internal_operator",
  },
  {
    id: "no-reward-distribution",
    label: {
      "en-US": "No reward distribution",
      "zh-CN": "不执行发奖",
      "zh-TW": "No reward distribution",
    },
    description: rewardBoundary,
    required: true,
    acknowledged: true,
    ownerRole: "project_owner",
  },
  {
    id: "no-real-export-file",
    label: {
      "en-US": "No real export file",
      "zh-CN": "不生成真实导出文件",
      "zh-TW": "No real export file",
    },
    description: {
      "en-US": "CSV and JSON are seeded/local previews only; no file, storage key, or download URL is created.",
      "zh-CN": "CSV 和 JSON 仅为 seeded/本地预览；不会创建文件、存储 key 或下载链接。",
      "zh-TW": "CSV and JSON are seeded/local previews only; no file, storage key, or download URL is created.",
    },
    required: true,
    acknowledged: true,
    ownerRole: "internal_operator",
  },
];

const contractRootLabels: Record<ExportContractRootMode, LocalizedText> = {
  none: {
    "en-US": "No contract root",
    "zh-CN": "无合约 root",
    "zh-TW": "No contract root",
  },
  eligibility_root: {
    "en-US": "Eligibility root",
    "zh-CN": "资格 root",
    "zh-TW": "Eligibility root",
  },
  winners_root: {
    "en-US": "Winners root",
    "zh-CN": "Winners root",
    "zh-TW": "Winners root",
  },
  contract_claim: {
    "en-US": "Contract claim",
    "zh-CN": "合约 claim",
    "zh-TW": "Contract claim",
  },
};

const createContractRootReadiness = (
  mode: ExportContractRootMode,
): ExportContractRootReadiness => {
  const safeDefault = mode === "none";
  const contractClaim = mode === "contract_claim";
  const readiness: ExportReadinessState = safeDefault ? "ready" : contractClaim ? "blocked" : "review_required";

  return {
    mode,
    label: contractRootLabels[mode],
    readiness,
    safeDefault,
    approvalRequired: !safeDefault,
    boundary: noRewardCustodyBoundary,
    nextAction: safeDefault
      ? {
          "en-US": "Use off-chain MVP export preview without root generation.",
          "zh-CN": "使用链下 MVP 导出预览，不生成 root。",
          "zh-TW": "Use off-chain MVP export preview without root generation.",
        }
      : contractClaim
        ? {
            "en-US": "Keep claim mode blocked until security, custody, legal, audit, and contract approvals exist.",
            "zh-CN": "在安全、托管、法律、审计与合约批准前继续阻断 claim mode。",
            "zh-TW": "Keep claim mode blocked until security, custody, legal, audit, and contract approvals exist.",
          }
        : {
            "en-US": "Define root format, reproducibility checks, reviewer role, and rollback policy before P1 contract work.",
            "zh-CN": "P1 合约工作前先定义 root 格式、可复现检查、审核角色与回滚策略。",
            "zh-TW": "Define root format, reproducibility checks, reviewer role, and rollback policy before P1 contract work.",
          },
  };
};

const formatTimeWindow = (startTime: string, endTime: string): LocalizedText => {
  const dateFormatter = new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "short" });

  return {
    "en-US": `${dateFormatter.format(new Date(startTime))} - ${dateFormatter.format(new Date(endTime))}`,
    "zh-CN": `${dateFormatter.format(new Date(startTime))} - ${dateFormatter.format(new Date(endTime))}`,
    "zh-TW": `${dateFormatter.format(new Date(startTime))} - ${dateFormatter.format(new Date(endTime))}`,
  };
};

const createWalletSplitLabel = (aaWallets: number, eoaWallets: number): LocalizedText => ({
  "en-US": `${aaWallets} AA / ${eoaWallets} EOA`,
  "zh-CN": `${aaWallets} AA / ${eoaWallets} EOA`,
  "zh-TW": `${aaWallets} AA / ${eoaWallets} EOA`,
});

const createLocaleState = (localeCoverage: number): LocalizedText =>
  localeCoverage >= 1
    ? {
        "en-US": "All supported locales reviewed",
        "zh-CN": "所有支持语言已审核",
        "zh-TW": "All supported locales reviewed",
      }
    : {
        "en-US": "zh-CN uses English fallback until review",
        "zh-CN": "中文在审核前使用英文回退",
        "zh-TW": "zh-CN uses English fallback until review",
      };

const statusNextAction: Record<
  CampaignCommandItem["status"],
  Pick<CampaignCommandItem, "nextActionLabel" | "nextActionDetail">
> = {
  draft: {
    nextActionLabel: {
      "en-US": "Finish publish blockers",
      "zh-CN": "完成发布阻断项",
      "zh-TW": "Finish publish blockers",
    },
    nextActionDetail: {
      "en-US": "Complete basics, reward disclaimers, and launch gates before scheduling.",
      "zh-CN": "排期前完成基础信息、奖励声明和发布门禁。",
      "zh-TW": "Complete basics, reward disclaimers, and launch gates before scheduling.",
    },
  },
  scheduled: {
    nextActionLabel: {
      "en-US": "Review launch readiness",
      "zh-CN": "审核发布准备度",
      "zh-TW": "Review launch readiness",
    },
    nextActionDetail: {
      "en-US": "Confirm locale fallback, wallet policy, and risk settings before go-live.",
      "zh-CN": "上线前确认语言回退、钱包策略和风险设置。",
      "zh-TW": "Confirm locale fallback, wallet policy, and risk settings before go-live.",
    },
  },
  live: {
    nextActionLabel: {
      "en-US": "Review live analytics",
      "zh-CN": "查看实时活动数据",
      "zh-TW": "Review live analytics",
    },
    nextActionDetail: {
      "en-US": "Monitor funnel drop-off, risk flags, and export readiness.",
      "zh-CN": "监控漏斗流失、风险标记和导出准备度。",
      "zh-TW": "Monitor funnel drop-off, risk flags, and export readiness.",
    },
  },
  paused: {
    nextActionLabel: {
      "en-US": "Resolve pause blocker",
      "zh-CN": "处理暂停阻断项",
      "zh-TW": "Resolve pause blocker",
    },
    nextActionDetail: {
      "en-US": "Clear the blocking review before resuming the campaign.",
      "zh-CN": "恢复活动前先完成阻断审核。",
      "zh-TW": "Clear the blocking review before resuming the campaign.",
    },
  },
  ended: {
    nextActionLabel: {
      "en-US": "Approve export preview",
      "zh-CN": "批准导出预览",
      "zh-TW": "Approve export preview",
    },
    nextActionDetail: {
      "en-US": "Review ready, review-required, and blocked rows before winner export.",
      "zh-CN": "导出 winners 前审核就绪、需复核和阻断行。",
      "zh-TW": "Review ready, review-required, and blocked rows before winner export.",
    },
  },
  exported: {
    nextActionLabel: {
      "en-US": "Archive final report",
      "zh-CN": "归档最终报告",
      "zh-TW": "Archive final report",
    },
    nextActionDetail: {
      "en-US": "Keep final evidence and remind the project that rewards remain project-owned.",
      "zh-CN": "保留最终证据，并提醒项目方奖励仍由项目方负责。",
      "zh-TW": "Keep final evidence and remind the project that rewards remain project-owned.",
    },
  },
  archived: {
    nextActionLabel: {
      "en-US": "Review archived evidence",
      "zh-CN": "复核归档证据",
      "zh-TW": "Review archived evidence",
    },
    nextActionDetail: {
      "en-US": "Keep archived evidence visible for audit without reopening eligibility or rewards.",
      "zh-CN": "保持归档证据对审计可见，不重新开启资格或奖励流程。",
      "zh-TW": "Keep archived evidence visible for audit without reopening eligibility or rewards.",
    },
  },
};

const priorityForCampaign = (
  status: CampaignCommandItem["status"],
  riskState: PublishState,
  exportState: PublishState,
): CampaignCommandPriority => {
  if (riskState === "blocker" || exportState === "blocker") {
    return "primary";
  }

  if (status === "live" || status === "ended") {
    return "primary";
  }

  return status === "exported" || status === "archived" ? "watch" : "secondary";
};

const createCampaignCommandItem = ({
  aaWallets,
  endTime,
  eoaWallets,
  exportState,
  exportSummary,
  id,
  localeCoverage,
  projectName,
  riskReason,
  riskState,
  startTime,
  status,
  title,
}: {
  aaWallets: number;
  endTime: string;
  eoaWallets: number;
  exportState: PublishState;
  exportSummary: LocalizedText;
  id: string;
  localeCoverage: number;
  projectName: string;
  riskReason: LocalizedText;
  riskState: PublishState;
  startTime: string;
  status: CampaignCommandItem["status"];
  title: LocalizedText;
}): CampaignCommandItem => {
  const nextAction = statusNextAction[status];

  return {
    id,
    projectName,
    title,
    status,
    priority: priorityForCampaign(status, riskState, exportState),
    timeWindow: formatTimeWindow(startTime, endTime),
    walletSplitLabel: createWalletSplitLabel(aaWallets, eoaWallets),
    localeState: createLocaleState(localeCoverage),
    riskState,
    riskReason,
    exportState,
    exportSummary,
    ...nextAction,
    boundary: commandCenterBoundary,
  };
};

const createSeededCampaignCommandItems = (
  campaign: CampaignShellDetail,
  exportBatch: ExportBatchSummary,
): CampaignCommandItem[] => [
  createCampaignCommandItem({
    aaWallets: campaign.metrics.aaWallets,
    endTime: campaign.endTime,
    eoaWallets: campaign.metrics.eoaWallets,
    exportState: exportBatch.blockedCount > 0 ? "warning" : "ready",
    exportSummary: {
      "en-US": `${exportBatch.readyCount} ready / ${exportBatch.blockedCount} review rows`,
      "zh-CN": `${exportBatch.readyCount} 行就绪 / ${exportBatch.blockedCount} 行需审核`,
      "zh-TW": `${exportBatch.readyCount} ready / ${exportBatch.blockedCount} review rows`,
    },
    id: campaign.id,
    localeCoverage: campaign.metrics.localeCoverage,
    projectName: campaign.projectName,
    riskReason: {
      "en-US": `${campaign.metrics.riskReviewQueue} risk reviews queued`,
      "zh-CN": `${campaign.metrics.riskReviewQueue} 条风险审核排队`,
      "zh-TW": `${campaign.metrics.riskReviewQueue} risk reviews queued`,
    },
    riskState: campaign.metrics.riskReviewQueue > 0 ? "warning" : "ready",
    startTime: campaign.startTime,
    status: campaign.status,
    title: campaign.title,
  }),
  createCampaignCommandItem({
    aaWallets: 420,
    endTime: "2026-07-18T00:00:00Z",
    eoaWallets: 260,
    exportState: "warning",
    exportSummary: {
      "en-US": "Export disabled until campaign is live",
      "zh-CN": "活动上线前不可导出",
      "zh-TW": "Export disabled until campaign is live",
    },
    id: "camp-forest-nft-path",
    localeCoverage: 0.5,
    projectName: "Forest",
    riskReason: {
      "en-US": "Launch risk settings need owner review",
      "zh-CN": "上线风险设置需要项目方审核",
      "zh-TW": "Launch risk settings need owner review",
    },
    riskState: "warning",
    startTime: "2026-07-05T00:00:00Z",
    status: "scheduled",
    title: {
      "en-US": "Forest NFT Quest",
      "zh-CN": "Forest NFT 任务",
      "zh-TW": "Forest NFT Quest",
    },
  }),
  createCampaignCommandItem({
    aaWallets: 610,
    endTime: "2026-06-18T00:00:00Z",
    eoaWallets: 510,
    exportState: "warning",
    exportSummary: {
      "en-US": "184 ready / 26 review rows",
      "zh-CN": "184 行就绪 / 26 行需审核",
      "zh-TW": "184 ready / 26 review rows",
    },
    id: "camp-tmrwdao-streak",
    localeCoverage: 1,
    projectName: "TMRWDAO",
    riskReason: {
      "en-US": "Referral velocity review remains open",
      "zh-CN": "推荐速度审核仍未关闭",
      "zh-TW": "Referral velocity review remains open",
    },
    riskState: "warning",
    startTime: "2026-06-04T00:00:00Z",
    status: "ended",
    title: {
      "en-US": "TMRWDAO Governance Streak",
      "zh-CN": "TMRWDAO 治理连续任务",
      "zh-TW": "TMRWDAO Governance Streak",
    },
  }),
  createCampaignCommandItem({
    aaWallets: 300,
    endTime: "2026-06-10T00:00:00Z",
    eoaWallets: 180,
    exportState: "ready",
    exportSummary: {
      "en-US": "Final export evidence archived",
      "zh-CN": "最终导出证据已归档",
      "zh-TW": "Final export evidence archived",
    },
    id: "camp-ebridge-onboarding",
    localeCoverage: 1,
    projectName: "eBridge",
    riskReason: {
      "en-US": "No active risk review",
      "zh-CN": "无进行中的风险审核",
      "zh-TW": "No active risk review",
    },
    riskState: "ready",
    startTime: "2026-05-27T00:00:00Z",
    status: "exported",
    title: {
      "en-US": "eBridge Onboarding Wave",
      "zh-CN": "eBridge 新手活动",
      "zh-TW": "eBridge Onboarding Wave",
    },
  }),
];

const createCommandSummary = (
  campaigns: CampaignCommandItem[],
  exportReadyRows: number,
): CampaignCommandCenterSummary => {
  const primaryAction = campaigns.find((campaign) => campaign.priority === "primary") ?? campaigns[0];

  return {
    totalCampaigns: campaigns.length,
    liveCount: campaigns.filter((campaign) => campaign.status === "live").length,
    scheduledOrDraftCount: campaigns.filter(
      (campaign) => campaign.status === "scheduled" || campaign.status === "draft",
    ).length,
    endedCount: campaigns.filter((campaign) => campaign.status === "ended").length,
    exportedCount: campaigns.filter((campaign) => campaign.status === "exported").length,
    warningCount: campaigns.filter(
      (campaign) => campaign.riskState === "warning" || campaign.exportState === "warning",
    ).length,
    blockerCount: campaigns.filter(
      (campaign) => campaign.riskState === "blocker" || campaign.exportState === "blocker",
    ).length,
    exportReadyRows,
    nextPrimaryAction: primaryAction?.nextActionLabel ?? {
      "en-US": "Review campaigns",
      "zh-CN": "审核活动",
      "zh-TW": "Review campaigns",
    },
  };
};

const portfolioText = (enUS: string, zhCN: string, zhTW = enUS): LocalizedText => ({
  "en-US": enUS,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
});

const portfolioMetric = ({
  detail,
  id,
  label,
  nextAction,
  ownerRole,
  state = "ready",
  value,
}: {
  detail: LocalizedText;
  id: ProjectPortfolioMetricId;
  label: LocalizedText;
  nextAction: LocalizedText;
  ownerRole: ProjectPortfolioCommercialOwnerRole;
  state?: PublishState;
  value: string;
}) => ({
  detail,
  id,
  label,
  nextAction,
  ownerRole,
  state,
  value,
});

const createPortfolioMetrics = (
  campaigns: CampaignCommandItem[],
  exportReadyRows: number,
) => {
  const activeProjects = new Set(
    campaigns
      .filter((campaign) => campaign.status === "live" || campaign.status === "scheduled")
      .map((campaign) => campaign.projectName),
  ).size;
  const repeatProjectCount = Array.from(
    campaigns.reduce<Map<string, number>>(
      (counts, campaign) => counts.set(campaign.projectName, (counts.get(campaign.projectName) ?? 0) + 1),
      new Map(),
    ).values(),
  ).filter((count) => count > 1).length;

  return [
    portfolioMetric({
      detail: portfolioText(
        "Seeded command center rows across live, scheduled, ended, and exported states.",
        "Seeded 指挥中心覆盖进行中、排期、已结束与已导出活动。",
      ),
      id: "campaigns_created",
      label: portfolioText("Campaigns created", "已创建活动"),
      nextAction: portfolioText("Keep portfolio status reviewed before adding live backend data.", "接入实时后端数据前持续复核活动组合状态。"),
      ownerRole: "project_owner",
      value: String(campaigns.length),
    }),
    portfolioMetric({
      detail: portfolioText(
        "Projects with live or scheduled seeded campaigns.",
        "拥有进行中或已排期 seeded 活动的项目。",
      ),
      id: "active_projects",
      label: portfolioText("Active projects", "活跃项目"),
      nextAction: portfolioText("Review project coverage before opening partner onboarding.", "开放合作伙伴接入前复核项目覆盖。"),
      ownerRole: "growth_lead",
      value: String(activeProjects),
    }),
    portfolioMetric({
      detail: portfolioText(
        "Seeded idea-to-launch estimate from AI draft, template selection, review gates, and publish checks.",
        "基于 AI 草稿、模板选择、审核门禁与发布检查的 seeded 从想法到上线估算。",
      ),
      id: "campaign_setup_time",
      label: portfolioText("Campaign setup time", "活动配置耗时"),
      nextAction: portfolioText("Measure this with live workflow timestamps before using it as an SLA.", "作为 SLA 使用前需接入真实流程时间戳。"),
      ownerRole: "internal_operator",
      state: "warning",
      value: "42 min",
    }),
    portfolioMetric({
      detail: portfolioRewardBoundary,
      id: "reward_budget_committed",
      label: portfolioText("Reward budget committed", "已承诺奖励预算"),
      nextAction: portfolioText("Confirm project-owned budget terms before winner export.", "导出 winners 前确认项目方自有预算条款。"),
      ownerRole: "finance_reviewer",
      state: "warning",
      value: "18,000 ELF",
    }),
    portfolioMetric({
      detail: portfolioText(
        "Winner exports remain local previews until project owner approval and private evidence are complete.",
        "在项目方批准和私有 evidence 完成前，winner exports 仍为本地预览。",
      ),
      id: "winner_exports",
      label: portfolioText("Winner exports", "Winners 导出"),
      nextAction: portfolioText("Keep export approvals tied to no-reward-distribution acknowledgements.", "保持导出批准与不发奖确认绑定。"),
      ownerRole: "project_owner",
      value: String(exportReadyRows),
    }),
    portfolioMetric({
      detail: portfolioText(
        "Repeat usage counts seeded projects with more than one campaign in the portfolio.",
        "重复使用统计活动组合中拥有多个活动的 seeded 项目。",
      ),
      id: "repeat_project_usage",
      label: portfolioText("Repeat project usage", "项目重复使用"),
      nextAction: portfolioText("Track repeat project usage with live project identity before commercial reporting.", "商业化报表前需用真实项目身份追踪重复使用。"),
      ownerRole: "growth_lead",
      state: repeatProjectCount > 0 ? "ready" : "warning",
      value: `${repeatProjectCount}/${new Set(campaigns.map((campaign) => campaign.projectName)).size}`,
    }),
  ];
};

const commercialModel = ({
  evidence,
  id,
  label,
  nextAction,
  ownerRole,
  state,
}: {
  evidence: LocalizedText;
  id: ProjectPortfolioCommercialReadiness["commercialModels"][number]["id"];
  label: LocalizedText;
  nextAction: LocalizedText;
  ownerRole: ProjectPortfolioCommercialOwnerRole;
  state: PublishState;
}) => ({
  boundary: portfolioCommercialBoundary,
  evidence,
  id,
  label,
  nextAction,
  ownerRole,
  state,
});

const createCommercialModelReadiness = (
  advancedAnalytics: AdvancedAnalyticsReadinessSurface,
  launchConsoleCampaignBundles: LaunchConsoleCampaignBundleSurface,
) => [
  commercialModel({
    evidence: portfolioText(
      "Ecosystem mode can stay free while seeded readiness validates core campaign operations.",
      "Seeded readiness 验证核心活动运营时，生态模式可保持免费。",
    ),
    id: "free_ecosystem_mode",
    label: portfolioText("Free ecosystem mode", "生态免费模式"),
    nextAction: portfolioText("Keep free ecosystem access until partner charging rules are approved.", "合作伙伴收费规则批准前保持生态免费访问。"),
    ownerRole: "growth_lead",
    state: "ready",
  }),
  commercialModel({
    evidence: portfolioText(
      "Partner campaign fee needs billing, contract, and finance review before production.",
      "合作伙伴活动服务费进入生产前需要 billing、合约与财务审核。",
    ),
    id: "partner_campaign_fee",
    label: portfolioText("Partner campaign fee", "合作伙伴活动服务费"),
    nextAction: portfolioText("Define fee approval and invoice boundaries before live billing.", "实时 billing 前定义服务费批准与发票边界。"),
    ownerRole: "finance_reviewer",
    state: "warning",
  }),
  commercialModel({
    evidence: portfolioText(
      `${advancedAnalytics.summary.premiumReadyReports}/${advancedAnalytics.premiumReports.length} premium reports are seeded-ready for review.`,
      `${advancedAnalytics.summary.premiumReadyReports}/${advancedAnalytics.premiumReports.length} 个 premium reports 已 seeded 就绪待审核。`,
    ),
    id: "premium_analytics",
    label: portfolioText("Premium analytics", "Premium analytics"),
    nextAction: portfolioText("Connect event warehouse and billing only after premium report review.", "Premium report 审核后再接入事件仓库与 billing。"),
    ownerRole: "growth_lead",
    state: "warning",
  }),
  commercialModel({
    evidence: portfolioText(
      "AI planner, content pack, and optimization workflows are review-gated seeded surfaces.",
      "AI planner、content pack 与 optimization workflow 均为审核门禁下的 seeded 表面。",
    ),
    id: "ai_ops_package",
    label: portfolioText("AI Ops package", "AI Ops 套餐"),
    nextAction: portfolioText("Price AI Ops only after human-review and no-auto-publish gates stay green.", "人工审核与不自动发布门禁保持通过后再为 AI Ops 定价。"),
    ownerRole: "internal_operator",
    state: "warning",
  }),
  commercialModel({
    evidence: portfolioText(
      `${launchConsoleCampaignBundles.summary.totalBundles} Launch Console bundles are available as local handoff packages.`,
      `${launchConsoleCampaignBundles.summary.totalBundles} 个 Launch Console 活动包可作为本地 handoff package。`,
    ),
    id: "launch_package",
    label: portfolioText("Launch package", "Launch package"),
    nextAction: portfolioText("Review live Launch Console handoff contracts before packaging.", "打包前先审核真实 Launch Console handoff contracts。"),
    ownerRole: "growth_lead",
    state: "warning",
  }),
  commercialModel({
    evidence: portfolioText(
      "API and skill contracts are local-only and can inform future usage pricing.",
      "API 与 skill contracts 仍为本地-only，可用于未来 API usage 定价口径。",
    ),
    id: "api_usage",
    label: portfolioText("API usage", "API usage"),
    nextAction: portfolioText("Define usage metering after live API authentication and quotas exist.", "实时 API 认证与配额存在后再定义 usage metering。"),
    ownerRole: "api_reviewer",
    state: "warning",
  }),
];

const createProjectPortfolioCommercialReadiness = ({
  advancedAnalytics,
  campaigns,
  exportReadyRows,
  launchConsoleCampaignBundles,
}: {
  advancedAnalytics: AdvancedAnalyticsReadinessSurface;
  campaigns: CampaignCommandItem[];
  exportReadyRows: number;
  launchConsoleCampaignBundles: LaunchConsoleCampaignBundleSurface;
}): ProjectPortfolioCommercialReadiness => {
  const metrics = createPortfolioMetrics(campaigns, exportReadyRows);
  const commercialModels = createCommercialModelReadiness(advancedAnalytics, launchConsoleCampaignBundles);
  const readyMetricCount = metrics.filter((metric) => metric.state === "ready").length;
  const reviewRequiredMetricCount = metrics.filter((metric) => metric.state === "warning").length;

  return {
    boundary: portfolioCommercialBoundary,
    commercialModels,
    metrics,
    summary: {
      commercialModelCount: commercialModels.length,
      productionReadyModelCount: 0,
      readyMetricCount,
      reviewRequiredMetricCount,
      rewardBoundary: portfolioRewardBoundary,
      topNextAction: portfolioText(
        "Review partner fee, premium analytics, and API usage boundaries before any billing work.",
        "任何 billing 工作前先审核合作伙伴收费、premium analytics 与 API usage 边界。",
      ),
      totalMetrics: metrics.length,
    },
  };
};

const lifecycleBoundary: LocalizedText = {
  "en-US":
    "Seeded/local lifecycle operation intent only. No live backend, scheduler, wallet signing, contract write, export file generation, reward custody, or reward distribution is executed.",
  "zh-CN":
    "仅 seeded/本地 lifecycle operation 意图。不会执行实时后端、排期器、钱包签名、合约写入、导出文件生成、奖励托管或发奖。",
  "zh-TW":
    "Seeded/local lifecycle operation intent only. No live backend, scheduler, wallet signing, contract write, export file generation, reward custody, or reward distribution is executed.",
};

const lifecycleText = (enUS: string, zhCN: string, zhTW = enUS): LocalizedText => ({
  "en-US": enUS,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
});

const lifecycleGateLabels: Record<CampaignLifecycleGateGroupId, LocalizedText> = {
  archive: lifecycleText("Archive gate", "归档门禁"),
  "campaign-basics": lifecycleText("Campaign basics", "活动基础信息"),
  end: lifecycleText("End gate", "结束门禁"),
  export: lifecycleText("Export gate", "导出门禁"),
  "internal-provider-review": lifecycleText("Internal/provider review", "内部与 provider 审核"),
  "pause-resume": lifecycleText("Pause/resume authority", "暂停/恢复权限"),
  "reward-eligibility": lifecycleText("Rewards and eligibility", "奖励与资格"),
  "risk-i18n-contract": lifecycleText("Risk, i18n, and contract", "风险、i18n 与合约"),
  "safety-boundary": lifecycleText("Safety boundary", "安全边界"),
  "task-verification": lifecycleText("Task verification", "任务验证"),
  "time-window": lifecycleText("Time window", "活动时间窗口"),
};

const lifecycleCheck = ({
  id,
  label,
  nextAction,
  reason,
  source,
  state,
}: {
  id: string;
  label: LocalizedText;
  nextAction: LocalizedText;
  reason: LocalizedText;
  source: CampaignLifecycleCheckSource;
  state: CampaignLifecycleCheckState;
}): CampaignLifecycleBlockingCheck => ({
  id,
  label,
  state,
  source,
  reason,
  nextAction,
});

const lifecycleGroupState = (
  checks: readonly CampaignLifecycleBlockingCheck[],
): CampaignLifecycleCheckState => {
  if (checks.some((check) => check.state === "blocked")) {
    return "blocked";
  }

  if (checks.some((check) => check.state === "warning")) {
    return "warning";
  }

  return checks.every((check) => check.state === "not_applicable") ? "not_applicable" : "passed";
};

const lifecycleGateGroup = (
  id: CampaignLifecycleGateGroupId,
  checks: CampaignLifecycleBlockingCheck[],
): CampaignLifecycleGateGroup => ({
  id,
  label: lifecycleGateLabels[id],
  state: lifecycleGroupState(checks),
  checks,
});

const launchOperationState = (
  currentStatus: CampaignLifecycleStatus,
  applicableStatuses: readonly CampaignLifecycleStatus[],
  checks: readonly CampaignLifecycleBlockingCheck[],
): CampaignLifecycleOperation["operationState"] => {
  if (!applicableStatuses.includes(currentStatus)) {
    return "not_applicable";
  }

  if (checks.some((check) => check.state === "blocked")) {
    return "blocked";
  }

  return checks.some((check) => check.state === "warning") ? "review_required" : "allowed";
};

const lifecycleStatusOperationState = (
  currentStatus: CampaignLifecycleStatus,
  applicableStatuses: readonly CampaignLifecycleStatus[],
  fallbackState: CampaignLifecycleOperation["operationState"],
): CampaignLifecycleOperation["operationState"] =>
  applicableStatuses.includes(currentStatus) ? fallbackState : "not_applicable";

const flattenLifecycleChecks = (
  groups: readonly CampaignLifecycleGateGroup[],
) => groups.flatMap((group) => group.checks);

const createLaunchGateGroups = (
  campaign: CampaignShellDetail,
): CampaignLifecycleGateGroup[] => {
  const publishReadiness = computePublishReadiness(campaign, campaign.contentRevisions);
  const translationManager = createTranslationManagerReadModel(campaign);
  const providerRegistry = createProviderEvidenceRegistry(campaign);
  const verificationPipeline = createVerificationPipelineReadinessGate(campaign);
  const contractReview = createContractImpactReviewModel(campaign);
  const requiredTasks = campaign.tasks.filter((task) => task.required);
  const hasVerifiableTask = campaign.tasks.some((task) =>
    task.verificationType === "ON_CHAIN" || task.verificationType === "DAPP_API",
  );
  const rewardDisclaimerBlockers = translationManager.rewardDisclaimers.filter(
    (row) => row.blocksPublish,
  );
  const claimModeBlocked = contractReview.options.some(
    (option) => option.mode === "CONTRACT_CLAIM" && option.publishState === "blocker",
  );
  const openReviewItems = campaign.reviewItems.filter((item) => item.status !== "approved");

  return [
    lifecycleGateGroup("campaign-basics", [
      lifecycleCheck({
        id: "campaign-title",
        label: lifecycleText("Campaign title", "活动标题"),
        state: campaign.title["en-US"].trim() ? "passed" : "blocked",
        source: "publish_readiness",
        reason: lifecycleText("Campaign title is available in the seeded shell.", "Seeded shell 中已有活动标题。"),
        nextAction: lifecycleText("Keep campaign basics visible before lifecycle review.", "Lifecycle 审核前保持活动基础信息可见。"),
      }),
      lifecycleCheck({
        id: "campaign-wallet-policy",
        label: lifecycleText("Wallet policy", "钱包策略"),
        state: campaign.walletPolicy ? "passed" : "blocked",
        source: "publish_readiness",
        reason: lifecycleText("Wallet policy is explicit for launch review.", "上线审核已有明确钱包策略。"),
        nextAction: lifecycleText("Review wallet compatibility before publish intent.", "发布意图前审核钱包兼容性。"),
      }),
    ]),
    lifecycleGateGroup("time-window", [
      lifecycleCheck({
        id: "campaign-time-window",
        label: lifecycleText("Start and end time", "开始与结束时间"),
        state: new Date(campaign.startTime).getTime() < new Date(campaign.endTime).getTime() ? "passed" : "blocked",
        source: "publish_readiness",
        reason: formatTimeWindow(campaign.startTime, campaign.endTime),
        nextAction: lifecycleText("Keep time window reviewed before schedule or live intent.", "排期或上线意图前保持时间窗口已审核。"),
      }),
    ]),
    lifecycleGateGroup("task-verification", [
      lifecycleCheck({
        id: "valid-required-tasks",
        label: lifecycleText("Valid required tasks", "有效必做任务"),
        state: requiredTasks.length > 0 && requiredTasks.every((task) => task.points >= 0) ? "passed" : "blocked",
        source: "publish_readiness",
        reason: lifecycleText(
          `${requiredTasks.length} required tasks are configured.`,
          `已配置 ${requiredTasks.length} 个必做任务。`,
        ),
        nextAction: lifecycleText("Keep required tasks and points reviewed before launch.", "上线前保持必做任务和积分已审核。"),
      }),
      lifecycleCheck({
        id: "on-chain-or-api-verifiable-task",
        label: lifecycleText("On-chain or API-verifiable task", "链上或 API 可验证任务"),
        state: hasVerifiableTask ? "passed" : "blocked",
        source: "provider_evidence",
        reason: hasVerifiableTask
          ? lifecycleText("At least one task can be checked through on-chain or dApp API evidence.", "至少一个任务可通过链上或 dApp API 证据检查。")
          : lifecycleText("Launch requires at least one on-chain or API-verifiable task.", "上线需要至少一个链上或 API 可验证任务。"),
        nextAction: lifecycleText("Attach live provider evidence before production launch.", "生产上线前附上真实 provider 证据。"),
      }),
    ]),
    lifecycleGateGroup("reward-eligibility", [
      lifecycleCheck({
        id: "reward-disclaimer-review",
        label: lifecycleText("Reward disclaimer review", "奖励声明审核"),
        state: rewardDisclaimerBlockers.length > 0 ? "blocked" : "passed",
        source: "publish_readiness",
        reason: rewardDisclaimerBlockers.length > 0
          ? lifecycleText(
              `${rewardDisclaimerBlockers.length} reward disclaimer locale rows block publish.`,
              `${rewardDisclaimerBlockers.length} 个奖励声明语言行阻断发布。`,
            )
          : lifecycleText("Reward responsibility disclaimer is reviewed.", "奖励责任声明已审核。"),
        nextAction: rewardDisclaimerBlockers[0]?.nextAction ?? rewardDisclaimerReadyAction,
      }),
      lifecycleCheck({
        id: "eligibility-rule-review",
        label: lifecycleText("Eligibility and winner rules", "资格与 winner 规则"),
        state: verificationPipeline.eligibilityImpact.missingRequiredTasks.length > 0 ? "warning" : "passed",
        source: "provider_evidence",
        reason: verificationPipeline.eligibilityImpact.summary,
        nextAction: lifecycleText("Review eligibility and winner export rules before launch.", "上线前审核资格与 winner 导出规则。"),
      }),
    ]),
    lifecycleGateGroup("risk-i18n-contract", [
      lifecycleCheck({
        id: "risk-settings-review",
        label: lifecycleText("Risk settings", "风险设置"),
        state: campaign.metrics.riskReviewQueue > 0 ? "warning" : "passed",
        source: "publish_readiness",
        reason: lifecycleText(
          `${campaign.metrics.riskReviewQueue} risk reviews are queued.`,
          `${campaign.metrics.riskReviewQueue} 条风险审核排队。`,
        ),
        nextAction: lifecycleText("Resolve risk queue before treating lifecycle intent as launch-ready.", "将 lifecycle 意图视为可上线前先处理风险队列。"),
      }),
      lifecycleCheck({
        id: "i18n-review",
        label: lifecycleText("i18n review", "i18n 审核"),
        state: translationManager.rewardDisclaimers.some((row) => row.publishState === "blocker") ? "blocked" : "passed",
        source: "publish_readiness",
        reason: translationManager.noAutoPublishNotice,
        nextAction: lifecycleText("Complete localized copy review before publish intent.", "发布意图前完成本地化文案审核。"),
      }),
      lifecycleCheck({
        id: "contract-impact-review",
        label: lifecycleText("Contract impact", "合约影响"),
        state: claimModeBlocked || publishReadiness.blockers.length > 0 ? "blocked" : "passed",
        source: "contract_review",
        reason: claimModeBlocked
          ? lifecycleText("Contract claim remains blocked until high-impact review.", "Contract claim 在高影响审核前保持阻断。")
          : contractReview.rewardBoundary,
        nextAction: lifecycleText("Keep Off-chain MVP as the safe lifecycle path.", "保持 Off-chain MVP 作为安全 lifecycle 路径。"),
      }),
    ]),
    lifecycleGateGroup("internal-provider-review", [
      lifecycleCheck({
        id: "provider-launch-evidence",
        label: lifecycleText("Provider launch evidence", "Provider 上线证据"),
        state: providerRegistry.summary.launchBlockers > 0
          ? "blocked"
          : providerRegistry.summary.reviewRequiredEntries > 0
            ? "warning"
            : "passed",
        source: "provider_evidence",
        reason: providerRegistry.boundary,
        nextAction: providerRegistry.nextAction,
      }),
      lifecycleCheck({
        id: "internal-review",
        label: lifecycleText("Internal review", "内部审核"),
        state: openReviewItems.length > 0 ? "warning" : "passed",
        source: "local_boundary",
        reason: lifecycleText(
          `${openReviewItems.length} internal review items remain open.`,
          `${openReviewItems.length} 个内部审核项仍未关闭。`,
        ),
        nextAction: lifecycleText("Route open review items before production lifecycle execution.", "生产 lifecycle 执行前先处理开放审核项。"),
      }),
    ]),
  ];
};

const lifecycleOperation = ({
  affectedOutcome,
  blockingChecks,
  fromStatus,
  gateGroup,
  id,
  label,
  nextAction,
  operationState,
  ownerRole,
  reason,
  requiresReview,
  targetStatus,
}: Omit<CampaignLifecycleOperation, "localOnly">): CampaignLifecycleOperation => ({
  id,
  label,
  fromStatus,
  targetStatus,
  operationState,
  ownerRole,
  reason,
  gateGroup,
  blockingChecks,
  affectedOutcome,
  nextAction,
  requiresReview,
  localOnly: true,
});

const summarizeLifecycleOperations = (
  operations: readonly CampaignLifecycleOperation[],
): CampaignLifecycleOperations["summary"] => {
  const launchBlockingCheckIds = new Set(
    operations
      .filter((operation) => operation.affectedOutcome === "launch" || operation.affectedOutcome === "schedule")
      .flatMap((operation) => operation.blockingChecks)
      .filter((check) => check.state === "blocked")
      .map((check) => check.id),
  );
  const topOperation =
    operations.find((operation) =>
      (operation.id === "schedule-campaign" || operation.id === "publish-campaign") &&
      operation.operationState === "blocked",
    ) ??
    operations.find((operation) =>
      (operation.id === "schedule-campaign" || operation.id === "publish-campaign") &&
      operation.operationState === "review_required",
    ) ??
    operations.find((operation) =>
      (operation.gateGroup === "export" || operation.gateGroup === "archive") &&
      operation.operationState !== "not_applicable",
    ) ??
    operations.find((operation) => operation.operationState !== "not_applicable") ??
    operations[0];

  return {
    totalOperations: operations.length,
    allowedCount: operations.filter((operation) => operation.operationState === "allowed").length,
    blockedCount: operations.filter((operation) => operation.operationState === "blocked").length,
    reviewRequiredCount: operations.filter((operation) => operation.operationState === "review_required").length,
    notApplicableCount: operations.filter((operation) => operation.operationState === "not_applicable").length,
    launchBlockingCount: launchBlockingCheckIds.size,
    exportSensitiveCount: operations.filter(
      (operation) =>
        (operation.gateGroup === "export" || operation.gateGroup === "archive") &&
        operation.operationState !== "allowed",
    ).length,
    topOperationId: topOperation?.id ?? "",
  };
};

export const createCampaignLifecycleOperations = (
  campaign: CampaignShellDetail,
): CampaignLifecycleOperations => {
  const launchGateGroups = createLaunchGateGroups(campaign);
  const launchChecks = flattenLifecycleChecks(launchGateGroups);
  const exportReadiness = createExportConfirmationReadinessGate(campaign);
  const pauseReviewCheck = lifecycleCheck({
    id: "incident-admin-review",
    label: lifecycleText("Incident/admin review", "事故/管理员审核"),
    state: "warning",
    source: "local_boundary",
    reason: lifecycleText(
      "Pause and resume are incident-sensitive operations that require internal authority.",
      "暂停与恢复是事故敏感操作，需要内部权限审核。",
    ),
    nextAction: lifecycleText("Route pause or resume intent to an internal operator.", "将暂停或恢复意图交给内部运营处理。"),
  });
  const endReviewCheck = lifecycleCheck({
    id: "end-export-reward-review",
    label: lifecycleText("End/export/reward review", "结束/导出/奖励审核"),
    state: "warning",
    source: "export_confirmation",
    reason: exportReadiness.boundary,
    nextAction: lifecycleText("Confirm export and reward responsibility before ending lifecycle.", "结束 lifecycle 前确认导出与奖励责任。"),
  });
  const exportChecks = [
    lifecycleCheck({
      id: "export-confirmation-readiness",
      label: lifecycleText("Export confirmation readiness", "导出确认 readiness"),
      state: exportReadiness.summary.blockedRows > 0
        ? "blocked"
        : exportReadiness.summary.reviewRequiredRows > 0
          ? "warning"
          : "passed",
      source: "export_confirmation",
      reason: exportReadiness.boundary,
      nextAction: exportReadiness.nextAction,
    }),
    lifecycleCheck({
      id: "no-real-export-file",
      label: lifecycleText("No real export file", "不生成真实导出文件"),
      state: "passed",
      source: "local_boundary",
      reason: exportConfirmationReadinessBoundary,
      nextAction: lifecycleText("Keep export as local preview until production export is approved.", "生产导出获批前保持本地预览。"),
    }),
  ];
  const archiveCheck = lifecycleCheck({
    id: "archive-audit-visibility",
    label: lifecycleText("Archive audit visibility", "归档审计可见性"),
    state: "warning",
    source: "local_boundary",
    reason: lifecycleText(
      "Archive intent must preserve final evidence and cannot hide reward responsibility.",
      "归档意图必须保留最终证据，且不能隐藏奖励责任。",
    ),
    nextAction: lifecycleText("Keep final evidence visible before archive intent.", "归档意图前保持最终证据可见。"),
  });
  const scheduleState = launchOperationState(campaign.status, ["draft"], launchChecks);
  const publishState = launchOperationState(campaign.status, ["draft", "scheduled"], launchChecks);
  const exportState = lifecycleStatusOperationState(
    campaign.status,
    ["ended"],
    exportChecks.some((check) => check.state === "blocked")
      ? "blocked"
      : exportChecks.some((check) => check.state === "warning")
        ? "review_required"
        : "allowed",
  );
  const archiveState = lifecycleStatusOperationState(campaign.status, ["exported"], "review_required");
  const operations: CampaignLifecycleOperation[] = [
    lifecycleOperation({
      id: "schedule-campaign",
      label: lifecycleText("Schedule campaign", "排期活动"),
      fromStatus: "draft",
      targetStatus: "scheduled",
      operationState: scheduleState,
      ownerRole: "project_owner",
      reason: lifecycleText("Schedule intent depends on launch gates and remains local-only.", "排期意图取决于上线门禁，并保持本地状态。"),
      gateGroup: "campaign-basics",
      blockingChecks: launchChecks.filter((check) => check.state !== "passed"),
      affectedOutcome: "schedule",
      nextAction: lifecycleText("Resolve launch gates before scheduling.", "排期前处理上线门禁。"),
      requiresReview: scheduleState === "review_required" || scheduleState === "blocked",
    }),
    lifecycleOperation({
      id: "publish-campaign",
      label: lifecycleText("Publish campaign", "发布活动"),
      fromStatus: "scheduled",
      targetStatus: "live",
      operationState: publishState,
      ownerRole: "project_owner",
      reason: lifecycleText("Publish/go-live intent is evaluated locally and never executes scheduler or backend mutation.", "发布/上线意图仅本地评估，不执行排期器或后端变更。"),
      gateGroup: "internal-provider-review",
      blockingChecks: launchChecks.filter((check) => check.state !== "passed"),
      affectedOutcome: "launch",
      nextAction: lifecycleText("Complete launch-blocking checks before go-live.", "上线前完成阻断项。"),
      requiresReview: publishState === "review_required" || publishState === "blocked",
    }),
    lifecycleOperation({
      id: "pause-campaign",
      label: lifecycleText("Pause campaign", "暂停活动"),
      fromStatus: "live",
      targetStatus: "paused",
      operationState: lifecycleStatusOperationState(campaign.status, ["live"], "review_required"),
      ownerRole: "internal_operator",
      reason: pauseReviewCheck.reason,
      gateGroup: "pause-resume",
      blockingChecks: [pauseReviewCheck],
      affectedOutcome: "pause",
      nextAction: pauseReviewCheck.nextAction,
      requiresReview: true,
    }),
    lifecycleOperation({
      id: "resume-campaign",
      label: lifecycleText("Resume campaign", "恢复活动"),
      fromStatus: "paused",
      targetStatus: "live",
      operationState: lifecycleStatusOperationState(campaign.status, ["paused"], "review_required"),
      ownerRole: "internal_operator",
      reason: lifecycleText("Resume intent requires internal review after a pause condition is cleared.", "暂停条件解除后，恢复意图需要内部审核。"),
      gateGroup: "pause-resume",
      blockingChecks: [pauseReviewCheck],
      affectedOutcome: "resume",
      nextAction: lifecycleText("Confirm incident resolution before resume intent.", "恢复意图前确认事故已解决。"),
      requiresReview: true,
    }),
    lifecycleOperation({
      id: "end-campaign",
      label: lifecycleText("End campaign", "结束活动"),
      fromStatus: "live",
      targetStatus: "ended",
      operationState: lifecycleStatusOperationState(campaign.status, ["live", "scheduled", "paused"], "review_required"),
      ownerRole: "internal_operator",
      reason: lifecycleText("Ending preserves export, risk, and reward responsibility review boundaries.", "结束活动会保留导出、风险与奖励责任审核边界。"),
      gateGroup: "end",
      blockingChecks: [endReviewCheck],
      affectedOutcome: "end",
      nextAction: endReviewCheck.nextAction,
      requiresReview: true,
    }),
    lifecycleOperation({
      id: "export-campaign",
      label: lifecycleText("Mark export readiness", "标记导出 readiness"),
      fromStatus: "ended",
      targetStatus: "exported",
      operationState: exportState,
      ownerRole: "export_reviewer",
      reason: lifecycleText("Export readiness uses local preview rows and does not create a real file.", "导出 readiness 使用本地预览行，不生成真实文件。"),
      gateGroup: "export",
      blockingChecks: exportChecks.filter((check) => check.state !== "passed"),
      affectedOutcome: "export",
      nextAction: exportReadiness.nextAction,
      requiresReview: exportState !== "allowed",
    }),
    lifecycleOperation({
      id: "archive-campaign",
      label: lifecycleText("Archive campaign", "归档活动"),
      fromStatus: "exported",
      targetStatus: "archived",
      operationState: archiveState,
      ownerRole: "internal_operator",
      reason: lifecycleText("Archive intent can only follow exported evidence and must preserve audit visibility.", "归档意图只能在已导出证据之后，并必须保留审计可见性。"),
      gateGroup: "archive",
      blockingChecks: [archiveCheck],
      affectedOutcome: "archive",
      nextAction: archiveCheck.nextAction,
      requiresReview: true,
    }),
  ];
  const summary = summarizeLifecycleOperations(operations);
  const topOperation = operations.find((operation) => operation.id === summary.topOperationId);

  return {
    campaignId: campaign.id,
    currentStatus: campaign.status,
    supportedStatuses: [...campaignLifecycleStatuses],
    summary,
    operations,
    launchGateGroups,
    boundary: lifecycleBoundary,
    nextAction: topOperation?.nextAction ?? lifecycleText("Review lifecycle operations.", "审核 lifecycle operations。"),
  };
};

const createDropOffPoint = (funnel: ConversionFunnelStep[]): LocalizedText => {
  const largestDropOff = funnel.slice(1).reduce(
    (largest, step) => {
      const previous = largest.previousCount;
      const dropOff = previous - step.count;

      return dropOff > largest.dropOff
        ? { dropOff, previousCount: step.count, step }
        : { ...largest, previousCount: step.count };
    },
    {
      dropOff: 0,
      previousCount: funnel[0]?.count ?? 0,
      step: funnel[0],
    },
  );

  const label = largestDropOff.step?.label ?? {
    "en-US": "Campaign funnel",
    "zh-CN": "活动漏斗",
    "zh-TW": "Campaign funnel",
  };

  return {
    "en-US": `Largest drop-off: ${label["en-US"]} (${largestDropOff.dropOff.toLocaleString("en-US")} users).`,
    "zh-CN": `最大流失点：${label["zh-CN"]}（${largestDropOff.dropOff.toLocaleString("en-US")} 位用户）。`,
    "zh-TW": `Largest drop-off: ${label["en-US"]} (${largestDropOff.dropOff.toLocaleString("en-US")} users).`,
  };
};

const meaningfulVerificationTypes = new Set<CampaignTask["verificationType"]>([
  "WALLET",
  "ON_CHAIN",
  "DAPP_API",
]);

const createAnalyticsExportDecision = (
  campaign: CampaignShellDetail,
  exportBatch: ExportBatchSummary,
): AnalyticsExportDecision => {
  const readyRows = exportBatch.rows.filter((row) => row.rowStatus === "ready").length;
  const reviewRequiredRows = exportBatch.rows.filter(
    (row) => row.rowStatus === "review_required",
  ).length;
  const blockedRows = exportBatch.rows.filter((row) => row.rowStatus === "blocked").length;
  const evidenceCount = exportBatch.rows.reduce(
    (count, row) => count + row.taskEvidence.length,
    0,
  );

  return {
    kpis: createAnalytics(campaign, exportBatch),
    funnel: campaign.conversionFunnel,
    walletSplit: createWalletSplit(campaign.participants),
    localeSplit: createLocaleSplit(campaign.participants),
    dropOffPoint: createDropOffPoint(campaign.conversionFunnel),
    exportBatchId: exportBatch.batchId,
    exportColumns: exportBatch.columns,
    readyRows,
    reviewRequiredRows,
    blockedRows,
    evidenceCoverage: {
      "en-US": `${evidenceCount} task evidence records across ${exportBatch.rows.length} seeded export rows.`,
      "zh-CN": `${exportBatch.rows.length} 行 seeded 导出记录包含 ${evidenceCount} 条任务证据。`,
      "zh-TW": `${evidenceCount} task evidence records across ${exportBatch.rows.length} seeded export rows.`,
    },
    boundary: exportDecisionBoundary,
  };
};

const advancedAnalyticsText = (enUS: string, zhCN: string, zhTW = enUS): LocalizedText => ({
  "en-US": enUS,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
});

const advancedAnalyticsProducts: EcosystemProduct[] = [
  "eBridge",
  "Awaken",
  "Forest",
  "TMRWDAO",
  "daipp",
  "Pay",
  "Forecast",
  "Portfolio",
];

const advancedAnalyticsActionFamily: Record<EcosystemProduct, LocalizedText> = {
  eBridge: advancedAnalyticsText("Bridge", "跨链"),
  Awaken: advancedAnalyticsText("Swap", "Swap"),
  Forest: advancedAnalyticsText("NFT and holder actions", "NFT 与 holder 行为"),
  TMRWDAO: advancedAnalyticsText("Governance", "治理"),
  daipp: advancedAnalyticsText("AI agent coin", "AI agent coin"),
  Pay: advancedAnalyticsText("Payment", "支付"),
  Forecast: advancedAnalyticsText("Prediction and streaks", "预测与连续参与"),
  Portfolio: advancedAnalyticsText("Portfolio tracking", "资产组合跟踪"),
};

const advancedAnalyticsProductId = (product: EcosystemProduct) => product.toLowerCase();

const roundAdvancedAnalyticsRate = (value: number) =>
  Math.max(0, Math.min(1, Number(value.toFixed(3))));

const clampAdvancedAnalyticsScore = (value: number) =>
  Math.max(0, Math.min(100, Math.round(value)));

const advancedAnalyticsWalletMix = (participants: ParticipantSnapshot[]): LocalizedText => {
  const aaCount = participants.filter((participant) => participant.accountType === "AA").length;
  const eoaCount = participants.length - aaCount;

  return advancedAnalyticsText(
    `${aaCount} AA / ${eoaCount} EOA wallets.`,
    `${aaCount} 个 AA / ${eoaCount} 个 EOA 钱包。`,
  );
};

const advancedAnalyticsCohort = (input: {
  id: string;
  label: LocalizedText;
  participants: ParticipantSnapshot[];
  qualityState: AdvancedAnalyticsReadinessState;
  audienceSummary: LocalizedText;
  retentionSignal: LocalizedText;
  conversionSignal: LocalizedText;
  riskReviewState: LocalizedText;
  nextAction: LocalizedText;
}): AdvancedAnalyticsCohortSegment => ({
  id: input.id,
  label: input.label,
  audienceSummary: input.audienceSummary,
  walletMix: advancedAnalyticsWalletMix(input.participants),
  participantCount: input.participants.length,
  qualityState: input.qualityState,
  retentionSignal: input.retentionSignal,
  conversionSignal: input.conversionSignal,
  riskReviewState: input.riskReviewState,
  nextAction: input.nextAction,
  boundary: advancedAnalyticsBoundary,
});

const createAdvancedAnalyticsCohorts = (
  participants: ParticipantSnapshot[],
): AdvancedAnalyticsCohortSegment[] => {
  const aaParticipants = participants.filter((participant) => participant.accountType === "AA");
  const eoaPowerUsers = participants.filter(
    (participant) => participant.accountType === "EOA" && participant.completedTaskIds.length >= 3,
  );
  const referralDrivenUsers = participants.filter(
    (participant) => (participant.referralSummary?.qualifiedInvitees ?? 0) > 0,
  );
  const riskReviewUsers = participants.filter(
    (participant) => participant.riskFlags.length > 0 || !participant.eligible,
  );

  return [
    advancedAnalyticsCohort({
      id: "new-aa-users",
      label: advancedAnalyticsText("New AA users", "新 AA 用户"),
      participants: aaParticipants,
      qualityState: aaParticipants.some((participant) => participant.riskFlags.length > 0)
        ? "review_required"
        : "ready",
      audienceSummary: advancedAnalyticsText(
        "AA wallets that completed wallet-aware onboarding tasks in the seeded sample.",
        "Seeded 样本中完成钱包感知 onboarding 任务的 AA 钱包。",
      ),
      retentionSignal: advancedAnalyticsText(
        "Use Day 7 repeat actions to confirm AA onboarding quality.",
        "使用 Day 7 重复行为确认 AA onboarding 质量。",
      ),
      conversionSignal: advancedAnalyticsText(
        "Bridge and swap actions indicate ecosystem activation beyond wallet connect.",
        "跨链与 Swap 行为说明用户已从钱包连接进入生态激活。",
      ),
      riskReviewState: advancedAnalyticsText(
        "Aggregate cohort only; no personal score or raw wallet graph is exposed.",
        "仅聚合 cohort；不暴露个人分或原始钱包图谱。",
      ),
      nextAction: advancedAnalyticsText(
        "Keep AA onboarding as a premium cohort candidate before live analytics is connected.",
        "在接入实时 analytics 前，将 AA onboarding 保持为 premium cohort 候选。",
      ),
    }),
    advancedAnalyticsCohort({
      id: "eoa-power-users",
      label: advancedAnalyticsText("EOA power users", "EOA 高活跃用户"),
      participants: eoaPowerUsers,
      qualityState: eoaPowerUsers.some((participant) => participant.riskFlags.length > 0)
        ? "review_required"
        : "ready",
      audienceSummary: advancedAnalyticsText(
        "EOA wallets with three or more completed seeded actions.",
        "完成三个及以上 seeded 行为的 EOA 钱包。",
      ),
      retentionSignal: advancedAnalyticsText(
        "High task depth is a proxy for Day 30 retention readiness.",
        "较深任务完成度可作为 Day 30 留存准备度代理。",
      ),
      conversionSignal: advancedAnalyticsText(
        "Power users show post-bridge product conversion potential.",
        "高活跃用户显示跨链后的产品转化潜力。",
      ),
      riskReviewState: advancedAnalyticsText(
        "Manual review remains required for any risk-flagged EOA rows.",
        "任何带风险标记的 EOA 记录仍需人工审核。",
      ),
      nextAction: advancedAnalyticsText(
        "Review EOA power users before turning this cohort into a leaderboard or export rule.",
        "将该 cohort 用于排行榜或导出规则前，先审核 EOA 高活跃用户。",
      ),
    }),
    advancedAnalyticsCohort({
      id: "referral-driven-users",
      label: advancedAnalyticsText("Referral-driven users", "邀请驱动用户"),
      participants: referralDrivenUsers,
      qualityState: "review_required",
      audienceSummary: advancedAnalyticsText(
        "Participants with qualified invitees in the local referral summary.",
        "本地 referral summary 中拥有合格被邀请人的参与者。",
      ),
      retentionSignal: advancedAnalyticsText(
        "Repeat action must stay attached to qualified invitee quality, not raw signup volume.",
        "重复行为必须锚定合格被邀请人质量，而不是原始注册量。",
      ),
      conversionSignal: advancedAnalyticsText(
        "Referral growth needs product conversion confirmation before premium reporting.",
        "邀请增长进入 premium reporting 前，需要产品转化确认。",
      ),
      riskReviewState: advancedAnalyticsText(
        "Referral-heavy rows stay review-required until live anti-farm evidence exists.",
        "在实时反作弊证据存在前，邀请占比较高的记录保持需审核。",
      ),
      nextAction: advancedAnalyticsText(
        "Pair referral cohorts with meaningful wallet/on-chain/dApp actions.",
        "将邀请 cohort 与 meaningful wallet/on-chain/dApp 行为组合审核。",
      ),
    }),
    advancedAnalyticsCohort({
      id: "risk-review-cohort",
      label: advancedAnalyticsText("Risk review cohort", "风险审核 cohort"),
      participants: riskReviewUsers,
      qualityState: riskReviewUsers.length > 0 ? "review_required" : "ready",
      audienceSummary: advancedAnalyticsText(
        "Rows with risk flags or incomplete eligibility in the seeded export sample.",
        "Seeded 导出样本中带风险标记或资格未完成的记录。",
      ),
      retentionSignal: advancedAnalyticsText(
        "Retention cannot override risk or eligibility review.",
        "留存信号不能覆盖风险或资格审核。",
      ),
      conversionSignal: advancedAnalyticsText(
        "Conversion remains an input for review, not an automatic allow-list.",
        "转化只是审核输入，不会自动进入 allow-list。",
      ),
      riskReviewState: advancedAnalyticsText(
        "Operator review required; no automated exclusion or punishment is executed.",
        "需要运营审核；不会执行自动剔除或处罚。",
      ),
      nextAction: advancedAnalyticsText(
        "Resolve risk and eligibility evidence before using this cohort in premium reports.",
        "在 premium reports 使用该 cohort 前，先处理风险和资格证据。",
      ),
    }),
  ];
};

const createAdvancedAnalyticsRetentionWindows = (
  participants: ParticipantSnapshot[],
): AdvancedAnalyticsRetentionWindow[] => {
  const totalParticipants = Math.max(1, participants.length);
  const day7RepeatCount = participants.filter(
    (participant) => participant.completedTaskIds.length >= 2,
  ).length;
  const day30RepeatCount = participants.filter(
    (participant) => participant.completedTaskIds.length >= 3 || participant.eligible,
  ).length;

  return [
    {
      id: "day7",
      label: advancedAnalyticsText("Day 7 retention", "Day 7 留存"),
      rate: roundAdvancedAnalyticsRate(day7RepeatCount / totalParticipants),
      repeatActionCount: day7RepeatCount,
      sampleBasis: advancedAnalyticsText(
        `${day7RepeatCount}/${participants.length} seeded participants completed two or more actions.`,
        `${participants.length} 个 seeded 参与者中 ${day7RepeatCount} 个完成两个及以上行为。`,
      ),
      qualityNote: advancedAnalyticsText(
        "Day 7 uses local repeat-action depth until production event windows are connected.",
        "Day 7 在生产事件窗口接入前使用本地重复行为深度。",
      ),
      evidenceGap: advancedAnalyticsText(
        "Needs live analytics event windows before it can become production retention.",
        "成为生产留存前，需要接入实时 analytics 事件窗口。",
      ),
    },
    {
      id: "day30",
      label: advancedAnalyticsText("Day 30 retention", "Day 30 留存"),
      rate: roundAdvancedAnalyticsRate(day30RepeatCount / totalParticipants),
      repeatActionCount: day30RepeatCount,
      sampleBasis: advancedAnalyticsText(
        `${day30RepeatCount}/${participants.length} seeded participants reached deeper action depth or eligibility.`,
        `${participants.length} 个 seeded 参与者中 ${day30RepeatCount} 个达到更深行为深度或资格完成。`,
      ),
      qualityNote: advancedAnalyticsText(
        "Day 30 is modeled separately so it is not hidden behind the Day 7 signal.",
        "Day 30 单独建模，避免被 Day 7 单点信号替代。",
      ),
      evidenceGap: advancedAnalyticsText(
        "Needs production cohort calendar data before premium reporting.",
        "进入 premium reporting 前，需要生产 cohort 日历数据。",
      ),
    },
  ];
};

const createAdvancedAnalyticsQualitySignal = (input: {
  participants: ParticipantSnapshot[];
  exportBatch: ExportBatchSummary;
  day30RetentionRate: number;
  meaningfulCoverageRate: number;
}): AdvancedAnalyticsQualitySignal => {
  const totalParticipants = Math.max(1, input.participants.length);
  const riskFlaggedParticipants = input.participants.filter(
    (participant) => participant.riskFlags.length > 0,
  ).length;
  const noRiskRate = (totalParticipants - riskFlaggedParticipants) / totalParticipants;
  const eligibilityRate = input.exportBatch.readyCount / totalParticipants;
  const score = clampAdvancedAnalyticsScore(
    45 +
      noRiskRate * 20 +
      eligibilityRate * 15 +
      input.meaningfulCoverageRate * 15 +
      input.day30RetentionRate * 5,
  );
  const state: AdvancedAnalyticsReadinessState =
    score >= 70 ? "local_only" : score >= 55 ? "review_required" : "blocked";

  return {
    score,
    state,
    label: advancedAnalyticsText("Aggregate real user quality", "聚合真实用户质量"),
    explanation: advancedAnalyticsText(
      "Score combines aggregate risk-free share, export-ready eligibility, meaningful action coverage, and Day 30 readiness.",
      "分数聚合无风险占比、导出就绪资格、meaningful action 覆盖与 Day 30 准备度。",
    ),
    boundary: advancedAnalyticsBoundary,
    nextAction: advancedAnalyticsText(
      "Review aggregate quality before wiring production scoring or enforcement.",
      "接入生产评分或处置前，先审核聚合质量。",
    ),
  };
};

const createAdvancedAnalyticsCostEfficiency = (
  participants: ParticipantSnapshot[],
): AdvancedAnalyticsCostEfficiency => {
  const verifiedActionCount = participants.reduce(
    (count, participant) => count + participant.completedTaskIds.length,
    0,
  );
  const seededRewardBudget = 12000;
  const costPerAction = Math.round(seededRewardBudget / Math.max(1, verifiedActionCount));

  return {
    rewardBudget: `${seededRewardBudget.toLocaleString("en-US")} ELF seeded reward budget`,
    verifiedActionCount,
    costPerVerifiedAction: `${costPerAction.toLocaleString("en-US")} ELF / verified action`,
    qualityNote: advancedAnalyticsText(
      "Cost efficiency is a seeded planning metric; export winners still does not distribute rewards.",
      "成本效率是 seeded 规划指标；导出 winners 仍不等于发奖。",
    ),
    boundary: advancedAnalyticsBoundary,
  };
};

const createAdvancedAnalyticsProductConversions = (
  campaign: CampaignShellDetail,
  exportBatch: ExportBatchSummary,
): AdvancedAnalyticsProductConversion[] => {
  const topOfFunnelCount = Math.max(1, campaign.conversionFunnel[0]?.count ?? campaign.participants.length);
  const metricsByProduct = new Map(
    campaign.ecosystemMetrics.map((metric) => [metric.product, metric]),
  );
  const eligibleParticipants = campaign.participants.filter((participant) => participant.eligible).length;
  const portfolioConvertedCount = Math.max(1, exportBatch.readyCount, eligibleParticipants) * 120;

  return advancedAnalyticsProducts.map((product) => {
    const metric = metricsByProduct.get(product);
    const convertedCount = metric?.verifiedActions ?? portfolioConvertedCount;

    return {
      id: advancedAnalyticsProductId(product),
      productName: advancedAnalyticsText(product, product),
      actionFamily: advancedAnalyticsActionFamily[product],
      convertedCount,
      conversionRate: roundAdvancedAnalyticsRate(convertedCount / topOfFunnelCount),
      readiness: metric ? "local_only" : "review_required",
      evidenceGap: metric
        ? advancedAnalyticsText(
            "Seeded product conversion is available; live analytics event attribution is still missing.",
            "已具备 seeded 产品转化；仍缺少实时 analytics 事件归因。",
          )
        : advancedAnalyticsText(
            "Portfolio conversion is synthesized from export-ready eligibility until product telemetry exists.",
            "Portfolio 转化在产品遥测存在前，由导出就绪资格合成。",
          ),
      nextAction: metric?.recommendedNextAction ?? advancedAnalyticsText(
        "Define Portfolio tracking events before treating this as production conversion.",
        "将其视为生产转化前，先定义 Portfolio tracking events。",
      ),
    };
  });
};

const createAdvancedAnalyticsPremiumReports = (input: {
  cohorts: AdvancedAnalyticsCohortSegment[];
  retentionWindows: AdvancedAnalyticsRetentionWindow[];
  realUserQuality: AdvancedAnalyticsQualitySignal;
  productConversions: AdvancedAnalyticsProductConversion[];
}): AdvancedAnalyticsPremiumReport[] => [
  {
    id: "cohort_report",
    label: advancedAnalyticsText("Cohort report", "Cohort 报告"),
    readiness: "local_only",
    coverage: advancedAnalyticsText(
      `${input.cohorts.length} seeded cohorts include wallet mix, quality state, retention and conversion signals.`,
      `${input.cohorts.length} 个 seeded cohort 已包含钱包组合、质量状态、留存与转化信号。`,
    ),
    gap: advancedAnalyticsText(
      "Needs production cohort storage before paid report delivery.",
      "付费报告交付前需要生产 cohort 存储。",
    ),
    ownerRole: advancedAnalyticsText("Growth reviewer", "增长审核人"),
    nextAction: advancedAnalyticsText(
      "Review cohort definitions with project owners before live cohort ingestion.",
      "接入实时 cohort ingestion 前，与项目方审核 cohort 定义。",
    ),
  },
  {
    id: "retention_report",
    label: advancedAnalyticsText("Retention report", "留存报告"),
    readiness: "review_required",
    coverage: advancedAnalyticsText(
      `${input.retentionWindows.length} retention windows cover Day 7 and Day 30 in the seeded surface.`,
      `${input.retentionWindows.length} 个留存窗口在 seeded surface 中覆盖 Day 7 与 Day 30。`,
    ),
    gap: advancedAnalyticsText(
      "Needs production event windows and cohort calendar evidence.",
      "需要生产事件窗口与 cohort 日历证据。",
    ),
    ownerRole: advancedAnalyticsText("Analytics operator", "分析运营"),
    nextAction: advancedAnalyticsText(
      "Keep Day 30 visible while preparing live retention instrumentation.",
      "准备实时留存埋点时，继续保持 Day 30 可见。",
    ),
  },
  {
    id: "real_user_quality",
    label: advancedAnalyticsText("Real user quality", "真实用户质量"),
    readiness: input.realUserQuality.state,
    coverage: advancedAnalyticsText(
      `Aggregate score ${input.realUserQuality.score}/100 uses public-safe seeded quality inputs.`,
      `聚合分 ${input.realUserQuality.score}/100 使用 public-safe seeded 质量输入。`,
    ),
    gap: advancedAnalyticsText(
      "No raw personal score, IP/device signal, private rule, or automated enforcement is exposed.",
      "不暴露原始个人分、IP/设备信号、私密规则或自动处罚。",
    ),
    ownerRole: advancedAnalyticsText("Risk reviewer", "风险审核人"),
    nextAction: advancedAnalyticsText(
      "Approve quality definitions before wiring any production scorer.",
      "接入任何生产评分器前，先批准质量定义。",
    ),
  },
  {
    id: "conversion_report",
    label: advancedAnalyticsText("Conversion report", "转化报告"),
    readiness: "local_only",
    coverage: advancedAnalyticsText(
      `${input.productConversions.length} ecosystem product directions are covered.`,
      `已覆盖 ${input.productConversions.length} 个生态产品方向。`,
    ),
    gap: advancedAnalyticsText(
      "Needs live product event attribution before premium conversion reporting.",
      "Premium conversion reporting 前需要实时产品事件归因。",
    ),
    ownerRole: advancedAnalyticsText("Project owner", "项目方"),
    nextAction: advancedAnalyticsText(
      "Confirm product event names before enabling premium report generation.",
      "启用 premium report 生成前，先确认产品事件名称。",
    ),
  },
  {
    id: "risk_report",
    label: advancedAnalyticsText("Risk report", "风险报告"),
    readiness: "review_required",
    coverage: advancedAnalyticsText(
      "Risk flags are included as aggregate review inputs only.",
      "风险标记仅作为聚合审核输入。",
    ),
    gap: advancedAnalyticsText(
      "Needs reviewer approval before any export, reward, or premium distribution decision.",
      "任何导出、奖励或 premium 分发决策前都需要审核人批准。",
    ),
    ownerRole: advancedAnalyticsText("Internal operator", "内部运营"),
    nextAction: advancedAnalyticsText(
      "Keep risk reporting separate from automated punishment or reward distribution.",
      "保持风险报告与自动处罚或发奖分离。",
    ),
  },
];

export const createAdvancedAnalyticsReadiness = (
  campaign: CampaignShellDetail,
  exportBatch: ExportBatchSummary = createExportBatch(campaign),
): AdvancedAnalyticsReadinessSurface => {
  const totalParticipants = Math.max(1, campaign.participants.length);
  const requiredMeaningfulTaskIds = new Set(
    campaign.tasks
      .filter((task) => task.required && meaningfulVerificationTypes.has(task.verificationType))
      .map((task) => task.id),
  );
  const completedMeaningfulActions = campaign.participants.reduce((count, participant) => {
    const participantCompleted = participant.completedTaskIds.filter((taskId) =>
      requiredMeaningfulTaskIds.has(taskId)
    ).length;

    return count + participantCompleted;
  }, 0);
  const requiredMeaningfulActions = requiredMeaningfulTaskIds.size * totalParticipants;
  const meaningfulCoverageRate = requiredMeaningfulActions === 0
    ? 0
    : completedMeaningfulActions / requiredMeaningfulActions;
  const cohorts = createAdvancedAnalyticsCohorts(campaign.participants);
  const retentionWindows = createAdvancedAnalyticsRetentionWindows(campaign.participants);
  const day30Retention = retentionWindows.find((window) => window.id === "day30");
  const realUserQuality = createAdvancedAnalyticsQualitySignal({
    participants: campaign.participants,
    exportBatch,
    day30RetentionRate: day30Retention?.rate ?? 0,
    meaningfulCoverageRate,
  });
  const costEfficiency = createAdvancedAnalyticsCostEfficiency(campaign.participants);
  const productConversions = createAdvancedAnalyticsProductConversions(campaign, exportBatch);
  const premiumReports = createAdvancedAnalyticsPremiumReports({
    cohorts,
    retentionWindows,
    realUserQuality,
    productConversions,
  });
  const readyCohorts = cohorts.filter((cohort) => cohort.qualityState === "ready").length;
  const reviewRequiredCohorts = cohorts.filter(
    (cohort) => cohort.qualityState === "review_required" || cohort.qualityState === "blocked",
  ).length;

  return {
    campaignId: campaign.id,
    summary: {
      totalCohorts: cohorts.length,
      readyCohorts,
      reviewRequiredCohorts,
      day7RetentionRate: retentionWindows[0]?.rate ?? 0,
      day30RetentionRate: retentionWindows[1]?.rate ?? 0,
      averageRealUserScore: realUserQuality.score,
      costPerVerifiedAction: costEfficiency.costPerVerifiedAction,
      productConversionCoverage: productConversions.length,
      premiumReadyReports: premiumReports.filter((report) =>
        report.readiness === "ready" || report.readiness === "local_only"
      ).length,
      nextAction: advancedAnalyticsText(
        "Review seeded advanced analytics readiness before connecting live analytics, billing, or premium reports.",
        "连接实时 analytics、billing 或 premium reports 前，先审核 seeded 高级分析准备度。",
      ),
    },
    cohorts,
    retentionWindows,
    realUserQuality,
    costEfficiency,
    productConversions,
    premiumReports,
    boundary: advancedAnalyticsBoundary,
  };
};

const riskReviewStatePriority: Record<RiskIntelligenceReviewState, number> = {
  blocked: 0,
  review_required: 1,
  monitor: 2,
  clear: 3,
};

const riskSeverityPriority: Record<RiskSignal["severity"], number> = {
  blocked: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const riskSignalById = (signals: RiskSignal[], id: string) =>
  signals.find((signal) => signal.id === id);

const reviewStateFromSeverity = (severity: RiskSignal["severity"]): RiskIntelligenceReviewState => {
  if (severity === "blocked" || severity === "high") {
    return "blocked";
  }

  if (severity === "medium") {
    return "review_required";
  }

  return "monitor";
};

const createRiskMeaningfulActionCoverage = (
  campaign: CampaignShellDetail,
): RiskIntelligenceReviewSurface["meaningfulAction"] => {
  const meaningfulRequiredTasks = campaign.tasks.filter(
    (task) => task.required && meaningfulVerificationTypes.has(task.verificationType),
  );
  const completedActionCount = campaign.participants.reduce((count, participant) => {
    const completedMeaningfulActions = meaningfulRequiredTasks.filter((task) =>
      participant.completedTaskIds.includes(task.id),
    ).length;

    return count + completedMeaningfulActions;
  }, 0);
  const requiredActionCount = meaningfulRequiredTasks.length * campaign.participants.length;
  const coveragePercent = Math.round((completedActionCount / Math.max(1, requiredActionCount)) * 100);

  return {
    requiredActionCount,
    completedActionCount,
    coverageLabel: {
      "en-US": `${completedActionCount}/${requiredActionCount} meaningful actions covered (${coveragePercent}%).`,
      "zh-CN": `${requiredActionCount} 个 meaningful action 中已覆盖 ${completedActionCount} 个（${coveragePercent}%）。`,
      "zh-TW": `${completedActionCount}/${requiredActionCount} meaningful actions covered (${coveragePercent}%).`,
    },
    qualityPolicy: {
      "en-US": "Referral and leaderboard quality stays anchored to wallet, on-chain, and dApp API evidence instead of raw social volume.",
      "zh-CN": "邀请与排行榜质量继续以钱包、链上和 dApp API 证据为锚点，而不是原始社交量。",
      "zh-TW": "Referral and leaderboard quality stays anchored to wallet, on-chain, and dApp API evidence instead of raw social volume.",
    },
    nextAction: {
      "en-US": coveragePercent < 80
        ? "Review referral-heavy rows before export because meaningful action coverage is incomplete."
        : "Keep meaningful action evidence attached before approving export.",
      "zh-CN": coveragePercent < 80
        ? "Meaningful action 覆盖不完整，导出前先审核邀请占比较高的记录。"
        : "批准导出前继续保留 meaningful action 证据。",
      "zh-TW": coveragePercent < 80
        ? "Review referral-heavy rows before export because meaningful action coverage is incomplete."
        : "Keep meaningful action evidence attached before approving export.",
    },
  };
};

const riskDimension = (input: {
  id: string;
  category: RiskIntelligenceCategory;
  label: LocalizedText;
  severity: RiskSignal["severity"];
  reviewState?: RiskIntelligenceReviewState;
  affectedCohort: LocalizedText;
  evidenceCoverage: LocalizedText;
  sourceSignal: LocalizedText;
  exportImpact: LocalizedText;
  ownerRole: RiskIntelligenceOwnerRole;
  rationale: LocalizedText;
  nextAction: LocalizedText;
}): RiskIntelligenceDimension => ({
  ...input,
  reviewState: input.reviewState ?? reviewStateFromSeverity(input.severity),
  boundary: riskIntelligenceBoundary,
});

const countParticipantsWithRisk = (participants: ParticipantSnapshot[]) =>
  participants.filter((participant) => participant.riskFlags.length > 0).length;

const countManualReviewRows = (exportBatch: ExportBatchSummary) =>
  exportBatch.rows.filter(
    (row) => row.rowStatus !== "ready" || row.riskFlags.length > 0 ||
      row.taskEvidence.some((evidence) => evidence.status === "manual_review" || evidence.status === "failed"),
  ).length;

export const createRiskIntelligenceReviewSurface = (
  campaign: CampaignShellDetail,
): RiskIntelligenceReviewSurface => {
  const exportBatch = createExportBatch(campaign);
  const meaningfulAction = createRiskMeaningfulActionCoverage(campaign);
  const riskFlaggedParticipants = countParticipantsWithRisk(campaign.participants);
  const manualReviewQueueSize = countManualReviewRows(exportBatch);
  const fundingSource = riskSignalById(campaign.riskSignals, "funding-source");
  const referralTree = riskSignalById(campaign.riskSignals, "referral-tree");
  const deviceSession = riskSignalById(campaign.riskSignals, "device-session");
  const taskTiming = riskSignalById(campaign.riskSignals, "task-timing");
  const manualReview = riskSignalById(campaign.riskSignals, "manual-review");
  const walletAgeReviewCount = campaign.participants.filter((participant) =>
    participant.walletSource !== "PORTKEY_AA" || participant.totalPoints < defaultPointsThreshold,
  ).length;

  const dimensions: RiskIntelligenceDimension[] = [
    riskDimension({
      id: "wallet-age",
      category: "wallet_age",
      label: {
        "en-US": "Wallet age review",
        "zh-CN": "钱包年龄审核",
        "zh-TW": "Wallet age review",
      },
      severity: walletAgeReviewCount > 0 ? "medium" : "low",
      affectedCohort: {
        "en-US": `${walletAgeReviewCount} seeded wallets need age or history review.`,
        "zh-CN": `${walletAgeReviewCount} 个 seeded 钱包需要钱包年龄或历史审核。`,
        "zh-TW": `${walletAgeReviewCount} seeded wallets need age or history review.`,
      },
      evidenceCoverage: {
        "en-US": "Wallet source, account type, verification time, and points progress are present; no raw wallet graph is exposed.",
        "zh-CN": "已提供钱包来源、账户类型、验证时间与积分进度；不暴露原始钱包图谱。",
        "zh-TW": "Wallet source, account type, verification time, and points progress are present; no raw wallet graph is exposed.",
      },
      sourceSignal: {
        "en-US": "Seeded wallet sessions and participant progress.",
        "zh-CN": "Seeded 钱包会话与参与进度。",
        "zh-TW": "Seeded wallet sessions and participant progress.",
      },
      exportImpact: {
        "en-US": "Review before treating low-history wallets as export-ready winners.",
        "zh-CN": "将低历史钱包视为可导出 winners 前需要审核。",
        "zh-TW": "Review before treating low-history wallets as export-ready winners.",
      },
      ownerRole: "risk_reviewer",
      rationale: {
        "en-US": "New or low-history wallets can be legitimate users, so this remains a review signal rather than an exclusion rule.",
        "zh-CN": "新钱包或低历史钱包也可能是真实用户，因此这里只作为审核信号，不作为剔除规则。",
        "zh-TW": "New or low-history wallets can be legitimate users, so this remains a review signal rather than an exclusion rule.",
      },
      nextAction: {
        "en-US": "Sample wallet history before export approval.",
        "zh-CN": "导出批准前抽样检查钱包历史。",
        "zh-TW": "Sample wallet history before export approval.",
      },
    }),
    riskDimension({
      id: "funding-cluster",
      category: "funding_cluster",
      label: {
        "en-US": "Funding source clustering",
        "zh-CN": "资金来源聚类",
        "zh-TW": "Funding source clustering",
      },
      severity: fundingSource?.severity ?? "medium",
      affectedCohort: {
        "en-US": fundingSource?.value
          ? `${fundingSource.value} shared funding-source review cohort.`
          : "Shared funding-source review cohort.",
        "zh-CN": fundingSource?.value
          ? `${fundingSource.value} 共享资金来源审核队列。`
          : "共享资金来源审核队列。",
        "zh-TW": fundingSource?.value
          ? `${fundingSource.value} shared funding-source review cohort.`
          : "Shared funding-source review cohort.",
      },
      evidenceCoverage: fundingSource?.evidence ?? {
        "en-US": "Funding-source review evidence is seeded only.",
        "zh-CN": "资金来源审核证据仅为 seeded 数据。",
        "zh-TW": "Funding-source review evidence is seeded only.",
      },
      sourceSignal: fundingSource?.label ?? {
        "en-US": "Funding source review",
        "zh-CN": "资金来源审核",
        "zh-TW": "Funding source review",
      },
      exportImpact: {
        "en-US": "Shared funding is an export review input, not an automatic winner exclusion.",
        "zh-CN": "共享资金来源是导出审核输入，不是自动剔除 winner 的依据。",
        "zh-TW": "Shared funding is an export review input, not an automatic winner exclusion.",
      },
      ownerRole: "risk_reviewer",
      rationale: {
        "en-US": "Common funding can indicate coordination but may also be exchange, campaign, or onboarding behavior.",
        "zh-CN": "共同资金来源可能表示协同，也可能来自交易所、活动或 onboarding 行为。",
        "zh-TW": "Common funding can indicate coordination but may also be exchange, campaign, or onboarding behavior.",
      },
      nextAction: fundingSource?.nextAction ?? {
        "en-US": "Review sample wallets before export approval.",
        "zh-CN": "导出批准前抽样审核钱包。",
        "zh-TW": "Review sample wallets before export approval.",
      },
    }),
    riskDimension({
      id: "invite-tree",
      category: "invite_tree",
      label: {
        "en-US": "Referral tree concentration",
        "zh-CN": "邀请树集中度",
        "zh-TW": "Referral tree concentration",
      },
      severity: referralTree?.severity ?? "high",
      affectedCohort: {
        "en-US": referralTree?.value
          ? `${referralTree.value} qualified invite cluster needs owner review.`
          : "Qualified invite cluster needs owner review.",
        "zh-CN": referralTree?.value
          ? `${referralTree.value} 合格邀请聚类需要项目方审核。`
          : "合格邀请聚类需要项目方审核。",
        "zh-TW": referralTree?.value
          ? `${referralTree.value} qualified invite cluster needs owner review.`
          : "Qualified invite cluster needs owner review.",
      },
      evidenceCoverage: referralTree?.evidence ?? {
        "en-US": "Referral tree review evidence is seeded only.",
        "zh-CN": "邀请树审核证据仅为 seeded 数据。",
        "zh-TW": "Referral tree review evidence is seeded only.",
      },
      sourceSignal: referralTree?.label ?? {
        "en-US": "Referral tree review",
        "zh-CN": "邀请树审核",
        "zh-TW": "Referral tree review",
      },
      exportImpact: {
        "en-US": "Hold referral-weighted export decisions until manual review is complete.",
        "zh-CN": "人工审核完成前暂缓基于邀请权重的导出决定。",
        "zh-TW": "Hold referral-weighted export decisions until manual review is complete.",
      },
      ownerRole: "project_owner",
      rationale: {
        "en-US": "Referral rewards require qualified invitees and should not count raw signups alone.",
        "zh-CN": "邀请奖励必须依赖合格被邀请人，不能只计算原始注册。",
        "zh-TW": "Referral rewards require qualified invitees and should not count raw signups alone.",
      },
      nextAction: referralTree?.nextAction ?? {
        "en-US": "Keep referral points advisory until project owner approval.",
        "zh-CN": "项目方批准前将邀请积分保持为建议状态。",
        "zh-TW": "Keep referral points advisory until project owner approval.",
      },
    }),
    riskDimension({
      id: "device-session",
      category: "device_session",
      label: {
        "en-US": "Device/session similarity",
        "zh-CN": "设备/会话相似度",
        "zh-TW": "Device/session similarity",
      },
      severity: deviceSession?.severity ?? "medium",
      affectedCohort: {
        "en-US": deviceSession?.value
          ? `${deviceSession.value} similar-session review cohort.`
          : "Similar-session review cohort.",
        "zh-CN": deviceSession?.value
          ? `${deviceSession.value} 相似会话审核队列。`
          : "相似会话审核队列。",
        "zh-TW": deviceSession?.value
          ? `${deviceSession.value} similar-session review cohort.`
          : "Similar-session review cohort.",
      },
      evidenceCoverage: deviceSession?.evidence ?? {
        "en-US": "Device/session evidence is aggregate-only.",
        "zh-CN": "设备/会话证据仅为聚合信息。",
        "zh-TW": "Device/session evidence is aggregate-only.",
      },
      sourceSignal: deviceSession?.label ?? {
        "en-US": "Device/session review",
        "zh-CN": "设备/会话审核",
        "zh-TW": "Device/session review",
      },
      exportImpact: {
        "en-US": "Compare with verified on-chain actions before changing eligibility or export readiness.",
        "zh-CN": "变更资格或导出准备度前，先与已验证链上行为交叉检查。",
        "zh-TW": "Compare with verified on-chain actions before changing eligibility or export readiness.",
      },
      ownerRole: "internal_operator",
      rationale: {
        "en-US": "Aggregate session similarity can prioritize review without exposing raw identifiers.",
        "zh-CN": "聚合会话相似度可用于排序审核，但不暴露原始标识符。",
        "zh-TW": "Aggregate session similarity can prioritize review without exposing raw identifiers.",
      },
      nextAction: deviceSession?.nextAction ?? {
        "en-US": "Compare with verified on-chain actions.",
        "zh-CN": "与已验证链上行为交叉检查。",
        "zh-TW": "Compare with verified on-chain actions.",
      },
    }),
    riskDimension({
      id: "task-pattern",
      category: "task_pattern",
      label: {
        "en-US": "Task pattern similarity",
        "zh-CN": "任务模式相似度",
        "zh-TW": "Task pattern similarity",
      },
      severity: taskTiming?.severity ?? "low",
      affectedCohort: {
        "en-US": taskTiming?.value
          ? `${taskTiming.value} repeated task-order review cohort.`
          : "Repeated task-order review cohort.",
        "zh-CN": taskTiming?.value
          ? `${taskTiming.value} 重复任务顺序审核队列。`
          : "重复任务顺序审核队列。",
        "zh-TW": taskTiming?.value
          ? `${taskTiming.value} repeated task-order review cohort.`
          : "Repeated task-order review cohort.",
      },
      evidenceCoverage: taskTiming?.evidence ?? {
        "en-US": "Task pattern evidence is seeded only.",
        "zh-CN": "任务模式证据仅为 seeded 数据。",
        "zh-TW": "Task pattern evidence is seeded only.",
      },
      sourceSignal: taskTiming?.label ?? {
        "en-US": "Task timing review",
        "zh-CN": "任务时序审核",
        "zh-TW": "Task timing review",
      },
      exportImpact: {
        "en-US": "Use task evidence before changing eligibility.",
        "zh-CN": "变更资格前先查看任务证据。",
        "zh-TW": "Use task evidence before changing eligibility.",
      },
      ownerRole: "internal_operator",
      rationale: {
        "en-US": "Repeated order and timing are weak signals until matched with wallet and task evidence.",
        "zh-CN": "重复顺序和时序在结合钱包与任务证据前只是弱信号。",
        "zh-TW": "Repeated order and timing are weak signals until matched with wallet and task evidence.",
      },
      nextAction: taskTiming?.nextAction ?? {
        "en-US": "Use task evidence before changing eligibility.",
        "zh-CN": "变更资格前先查看任务证据。",
        "zh-TW": "Use task evidence before changing eligibility.",
      },
    }),
    riskDimension({
      id: "meaningful-action",
      category: "meaningful_action",
      label: {
        "en-US": "Minimum meaningful action",
        "zh-CN": "最低有效行为",
        "zh-TW": "Minimum meaningful action",
      },
      severity: meaningfulAction.completedActionCount < meaningfulAction.requiredActionCount ? "medium" : "low",
      affectedCohort: meaningfulAction.coverageLabel,
      evidenceCoverage: {
        "en-US": "Wallet, on-chain, and dApp API required tasks are counted as meaningful action evidence.",
        "zh-CN": "钱包、链上与 dApp API 必做任务被计为 meaningful action 证据。",
        "zh-TW": "Wallet, on-chain, and dApp API required tasks are counted as meaningful action evidence.",
      },
      sourceSignal: {
        "en-US": "Required task evidence coverage",
        "zh-CN": "必做任务证据覆盖",
        "zh-TW": "Required task evidence coverage",
      },
      exportImpact: {
        "en-US": "Referral-heavy winners stay review-required until meaningful action evidence is attached.",
        "zh-CN": "邀请占比较高的 winners 在 meaningful action 证据补齐前保持需审核。",
        "zh-TW": "Referral-heavy winners stay review-required until meaningful action evidence is attached.",
      },
      ownerRole: "growth_lead",
      rationale: meaningfulAction.qualityPolicy,
      nextAction: meaningfulAction.nextAction,
    }),
    riskDimension({
      id: "manual-review-queue",
      category: "manual_review_queue",
      label: {
        "en-US": "Manual review queue",
        "zh-CN": "人工审核队列",
        "zh-TW": "Manual review queue",
      },
      severity: manualReview?.severity ?? "high",
      affectedCohort: {
        "en-US": `${manualReviewQueueSize} export rows or wallets need manual review.`,
        "zh-CN": `${manualReviewQueueSize} 条导出记录或钱包需要人工审核。`,
        "zh-TW": `${manualReviewQueueSize} export rows or wallets need manual review.`,
      },
      evidenceCoverage: manualReview?.evidence ?? {
        "en-US": "Manual review evidence is seeded only.",
        "zh-CN": "人工审核证据仅为 seeded 数据。",
        "zh-TW": "Manual review evidence is seeded only.",
      },
      sourceSignal: manualReview?.label ?? {
        "en-US": "Manual review queue",
        "zh-CN": "人工审核队列",
        "zh-TW": "Manual review queue",
      },
      exportImpact: {
        "en-US": "Hold export approval until review is complete.",
        "zh-CN": "审核完成前暂缓导出批准。",
        "zh-TW": "Hold export approval until review is complete.",
      },
      ownerRole: "risk_reviewer",
      rationale: {
        "en-US": `${riskFlaggedParticipants} seeded participants carry risk flags or manual-review evidence.`,
        "zh-CN": `${riskFlaggedParticipants} 个 seeded 参与者带有风险标记或人工审核证据。`,
        "zh-TW": `${riskFlaggedParticipants} seeded participants carry risk flags or manual-review evidence.`,
      },
      nextAction: manualReview?.nextAction ?? {
        "en-US": "Hold export approval until review is complete.",
        "zh-CN": "审核完成前暂缓导出批准。",
        "zh-TW": "Hold export approval until review is complete.",
      },
    }),
  ].sort((left, right) =>
    riskReviewStatePriority[left.reviewState] - riskReviewStatePriority[right.reviewState] ||
    riskSeverityPriority[left.severity] - riskSeverityPriority[right.severity] ||
    left.id.localeCompare(right.id),
  );
  const reviewRequiredCount = dimensions.filter((dimension) =>
    dimension.reviewState === "review_required" || dimension.reviewState === "blocked",
  ).length;
  const blockedCount = dimensions.filter((dimension) => dimension.reviewState === "blocked").length;
  const highSeverityCount = dimensions.filter((dimension) =>
    dimension.severity === "high" || dimension.severity === "blocked",
  ).length;
  const exportHoldCount = dimensions.filter((dimension) =>
    dimension.reviewState === "blocked" ||
      dimension.exportImpact["en-US"].toLowerCase().includes("hold"),
  ).length;

  return {
    campaignId: campaign.id,
    summary: {
      totalDimensions: dimensions.length,
      reviewRequiredCount,
      blockedCount,
      highSeverityCount,
      manualReviewQueueSize,
      meaningfulActionCoverage: meaningfulAction.coverageLabel["en-US"],
      exportHoldCount,
    },
    dimensions,
    meaningfulAction,
    boundary: riskIntelligenceBoundary,
  };
};

const launchBundleText = (enUS: string, zhCN: string, zhTW = enUS): LocalizedText => ({
  "en-US": enUS,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
});

const launchConsoleRequiredHandoffIds: ApiSkillId[] = [
  "create_campaign",
  "generate_campaign_tasks",
  "verify_task",
  "check_eligibility",
  "export_winners",
  "generate_campaign_posts",
  "summarize_campaign",
];

const launchTask = (
  id: string,
  category: LaunchConsoleTaskBuildingBlock["category"],
  label: LocalizedText,
  description: LocalizedText,
  source: LocalizedText,
): LaunchConsoleTaskBuildingBlock => ({
  category,
  description,
  id,
  label,
  source,
});

const launchGateStateFromLifecycle = (
  state: CampaignLifecycleCheckState,
): LaunchConsoleGateState => {
  if (state === "passed") {
    return "passed";
  }

  if (state === "blocked") {
    return "blocked";
  }

  if (state === "warning") {
    return "review_required";
  }

  return "local_only";
};

const launchGateStateFromOperation = (
  state: CampaignLifecycleOperation["operationState"],
): LaunchConsoleGateState => {
  if (state === "allowed") {
    return "passed";
  }

  if (state === "blocked") {
    return "blocked";
  }

  if (state === "review_required") {
    return "review_required";
  }

  return "local_only";
};

const launchGateStateFromReadiness = (
  readiness: ApiSkillContract["readiness"],
): LaunchConsoleGateState => {
  if (readiness === "ready") {
    return "passed";
  }

  if (readiness === "blocked") {
    return "blocked";
  }

  if (readiness === "review_required") {
    return "review_required";
  }

  return "local_only";
};

const launchGate = ({
  blocksLaunch,
  id,
  label,
  nextAction,
  reason,
  source,
  state,
}: {
  blocksLaunch?: boolean;
  id: string;
  label: LocalizedText;
  nextAction: LocalizedText;
  reason: LocalizedText;
  source: LaunchConsoleGateSource;
  state: LaunchConsoleGateState;
}): LaunchConsoleGateEvidence => ({
  blocksLaunch: blocksLaunch ?? (state === "blocked" || state === "review_required"),
  id,
  label,
  nextAction,
  reason,
  source,
  state,
});

const launchHandoffReviewState = (
  readiness: ApiSkillContract["readiness"],
): LaunchConsoleHandoffReviewState => {
  if (readiness === "ready") {
    return "ready";
  }

  if (readiness === "blocked") {
    return "blocked";
  }

  if (readiness === "review_required") {
    return "review_required";
  }

  return "local_only";
};

const createLaunchConsoleHandoff = (
  contract: ApiSkillContract,
): LaunchConsoleHandoffContract => ({
  boundary: contract.securityBoundary,
  id: contract.id,
  inputIntent: {
    "en-US": contract.inputFields
      .slice(0, 3)
      .map((field) => field.label["en-US"])
      .join(", "),
    "zh-CN": contract.inputFields
      .slice(0, 3)
      .map((field) => field.label["zh-CN"])
      .join("、"),
    "zh-TW": contract.inputFields
      .slice(0, 3)
      .map((field) => field.label["zh-TW"])
      .join(", "),
  },
  nextAction: contract.nextAction,
  outputPreview: {
    "en-US": contract.outputFields
      .slice(0, 3)
      .map((field) => field.label["en-US"])
      .join(", "),
    "zh-CN": contract.outputFields
      .slice(0, 3)
      .map((field) => field.label["zh-CN"])
      .join("、"),
    "zh-TW": contract.outputFields
      .slice(0, 3)
      .map((field) => field.label["zh-TW"])
      .join(", "),
  },
  readiness: contract.readiness,
  reviewState: launchHandoffReviewState(contract.readiness),
  riskLevel: contract.riskLevel,
  title: contract.title,
});

const launchBundleStatus = (
  gateEvidence: readonly LaunchConsoleGateEvidence[],
  handoffs: readonly LaunchConsoleHandoffContract[],
): LaunchConsoleBundleStatus => {
  if (gateEvidence.some((gate) => gate.state === "blocked" && gate.blocksLaunch) ||
    handoffs.some((handoff) => handoff.reviewState === "blocked")) {
    return "blocked";
  }

  if (gateEvidence.some((gate) => gate.state === "review_required" && gate.blocksLaunch) ||
    handoffs.some((handoff) => handoff.reviewState === "review_required")) {
    return "review_required";
  }

  if (gateEvidence.some((gate) => gate.state === "local_only") ||
    handoffs.some((handoff) => handoff.reviewState === "local_only")) {
    return "local_only";
  }

  return "ready";
};

const launchBundle = ({
  campaignIntent,
  gateEvidence,
  handoffIds,
  handoffs,
  id,
  nextAction,
  objective,
  ownerRole,
  recommendedTiming,
  stage,
  targetAudience,
  tasks,
  title,
}: Omit<LaunchConsoleCampaignBundle, "publicBoundary" | "status"> & {
  handoffs: readonly LaunchConsoleHandoffContract[];
}): LaunchConsoleCampaignBundle => ({
  campaignIntent,
  gateEvidence,
  handoffIds,
  id,
  nextAction,
  objective,
  ownerRole,
  publicBoundary: launchConsoleBundleBoundary,
  recommendedTiming,
  stage,
  status: launchBundleStatus(
    gateEvidence,
    handoffs.filter((handoff) => handoffIds.includes(handoff.id)),
  ),
  targetAudience,
  tasks,
  title,
});

const topLaunchBundleAction = (
  bundles: readonly LaunchConsoleCampaignBundle[],
): LocalizedText => {
  const blocked = bundles.find((bundle) => bundle.status === "blocked");
  if (blocked) {
    return blocked.nextAction;
  }

  const review = bundles.find((bundle) => bundle.status === "review_required");
  if (review) {
    return review.nextAction;
  }

  const localOnly = bundles.find((bundle) => bundle.status === "local_only");
  return localOnly?.nextAction ?? launchBundleText(
    "Keep bundle preview available for Launch Console handoff review.",
    "保持活动包预览可用于 Launch Console handoff 审核。",
  );
};

export const createLaunchConsoleCampaignBundles = (
  campaign: CampaignShellDetail,
): LaunchConsoleCampaignBundleSurface => {
  const lifecycle = createCampaignLifecycleOperations(campaign);
  const providerRegistry = createProviderEvidenceRegistry(campaign);
  const riskIntelligence = createRiskIntelligenceReviewSurface(campaign);
  const exportReadiness = createExportConfirmationReadinessGate(campaign);
  const aiContentPack = createAiContentPackWorkbench(campaign);
  const apiSkillSurface = createApiSkillContractSurface();
  const contractsById = new Map(apiSkillSurface.contracts.map((contract) => [contract.id, contract]));
  const handoffs = launchConsoleRequiredHandoffIds.flatMap((id) => {
    const contract = contractsById.get(id);
    return contract ? [createLaunchConsoleHandoff(contract)] : [];
  });
  const handoffById = new Map(handoffs.map((handoff) => [handoff.id, handoff]));
  const publishOperation = lifecycle.operations.find((operation) => operation.id === "publish-campaign");
  const scheduleOperation = lifecycle.operations.find((operation) => operation.id === "schedule-campaign");
  const exportOperation = lifecycle.operations.find((operation) => operation.id === "export-campaign");
  const providerGate = providerRegistry.entries.find((entry) =>
    entry.fallback.blocksLaunch || entry.adapterReadiness === "blocked",
  ) ?? providerRegistry.entries[0];
  const riskGate = riskIntelligence.dimensions.find((dimension) => dimension.reviewState === "blocked") ??
    riskIntelligence.dimensions.find((dimension) => dimension.reviewState === "review_required") ??
    riskIntelligence.dimensions[0];
  const aiGateBlocked =
    aiContentPack.summary.blockedReleaseActions > 0 ||
    aiContentPack.summary.qualityGateBlockers > 0;

  const preLaunchGates = [
    launchGate({
      id: "pre-launch-lifecycle-schedule",
      label: scheduleOperation?.label ?? launchBundleText("Schedule readiness", "排期 readiness"),
      reason: scheduleOperation?.reason ?? lifecycle.boundary,
      nextAction: scheduleOperation?.nextAction ?? lifecycle.nextAction,
      source: "lifecycle_gate",
      state: scheduleOperation ? launchGateStateFromOperation(scheduleOperation.operationState) : "local_only",
    }),
    launchGate({
      id: "pre-launch-provider-evidence",
      label: providerGate?.label ?? launchBundleText("Provider evidence", "Provider 证据"),
      reason: providerRegistry.boundary,
      nextAction: providerRegistry.nextAction,
      source: "provider_evidence",
      state: providerRegistry.summary.launchBlockers > 0
        ? "blocked"
        : providerRegistry.summary.reviewRequiredEntries > 0
          ? "review_required"
          : "local_only",
    }),
    launchGate({
      id: "pre-launch-api-contracts",
      label: launchBundleText("Launch handoff contracts", "Launch handoff contracts"),
      reason: apiSkillSurface.boundary,
      nextAction: launchBundleText(
        "Review local handoff contracts before Launch Console consumes them.",
        "Launch Console 消费前先审核本地 handoff contracts。",
      ),
      source: "publish_readiness",
      state: handoffs.some((handoff) => handoff.reviewState === "blocked")
        ? "blocked"
        : handoffs.some((handoff) => handoff.reviewState === "review_required")
          ? "review_required"
          : "local_only",
    }),
  ];
  const launchGates = [
    ...(publishOperation?.blockingChecks.slice(0, 2).map((check) =>
      launchGate({
        blocksLaunch: check.state !== "passed",
        id: `launch-${check.id}`,
        label: check.label,
        nextAction: check.nextAction,
        reason: check.reason,
        source: check.source === "provider_evidence" ? "provider_evidence" : "lifecycle_gate",
        state: launchGateStateFromLifecycle(check.state),
      })
    ) ?? []),
    launchGate({
      id: "launch-risk-review",
      label: riskGate?.label ?? launchBundleText("Risk review", "风险审核"),
      reason: riskGate?.rationale ?? riskIntelligence.boundary,
      nextAction: riskGate?.nextAction ?? riskIntelligence.boundary,
      source: "risk_review",
      state: riskGate?.reviewState === "blocked"
        ? "blocked"
        : riskGate?.reviewState === "review_required"
          ? "review_required"
          : "warning",
    }),
    launchGate({
      id: "launch-ai-content-review",
      label: launchBundleText("AI content review", "AI 内容审核"),
      reason: aiContentPack.boundary.body,
      nextAction: aiContentPack.summary.nextAction,
      source: "ai_content_review",
      state: aiGateBlocked ? "review_required" : "passed",
      blocksLaunch: aiGateBlocked,
    }),
  ];
  const postLaunchGates = [
    launchGate({
      id: "post-launch-export-readiness",
      label: launchBundleText("Export readiness", "导出 readiness"),
      reason: exportReadiness.boundary,
      nextAction: exportReadiness.nextAction,
      source: "export_readiness",
      state: exportOperation ? launchGateStateFromOperation(exportOperation.operationState) : "local_only",
    }),
    launchGate({
      id: "post-launch-reward-boundary",
      label: launchBundleText("Reward non-distribution", "不执行发奖"),
      reason: rewardBoundary,
      nextAction: launchBundleText(
        "Confirm the project owns final reward fulfillment after winner review.",
        "Winner 审核后确认项目方负责最终奖励履约。",
      ),
      source: "reward_disclaimer",
      state: "local_only",
      blocksLaunch: false,
    }),
    launchGate({
      id: "post-launch-summary-handoff",
      label: handoffById.get("summarize_campaign")?.title ?? launchBundleText("Campaign summary", "活动总结"),
      reason: handoffById.get("summarize_campaign")?.boundary ?? apiSkillSurface.boundary,
      nextAction: handoffById.get("summarize_campaign")?.nextAction ?? launchBundleText(
        "Keep summary as local report-card output until analytics services are connected.",
        "Analytics 服务接入前保持本地报告卡输出。",
      ),
      source: "publish_readiness",
      state: launchGateStateFromReadiness(handoffById.get("summarize_campaign")?.readiness ?? "local_only"),
      blocksLaunch: false,
    }),
  ];
  const bundles = [
    launchBundle({
      id: "bundle-pre-launch",
      stage: "pre_launch",
      title: launchBundleText("Pre-launch bundle", "预热活动包"),
      objective: launchBundleText(
        "Prepare launch audience, wallet readiness, and project-owned reward boundaries before go-live.",
        "上线前准备发行受众、钱包 readiness 与项目方奖励责任边界。",
      ),
      campaignIntent: launchBundleText("Warm up qualified users before token or product launch.", "在 token 或产品上线前预热合格用户。"),
      targetAudience: launchBundleText("Allowlist, early community, partner users, and wallet-ready prospects.", "白名单、早期社区、合作伙伴用户与钱包就绪潜客。"),
      recommendedTiming: launchBundleText("T-14 to T-3 days before launch.", "上线前 T-14 到 T-3 天。"),
      ownerRole: "growth_lead",
      tasks: [
        launchTask("pre-wallet-connect", "wallet", launchBundleText("Wallet connect readiness", "钱包连接 readiness"), launchBundleText("Confirm supported AA/EOA wallet entry before Launch Console handoff.", "Launch Console handoff 前确认支持的 AA/EOA 钱包入口。"), launchBundleText("Wallet adapter readiness", "钱包适配器 readiness")),
        launchTask("pre-onchain-interest", "on_chain_api", launchBundleText("On-chain interest signal", "链上兴趣信号"), launchBundleText("Use local on-chain/API task templates as preview evidence only.", "仅将本地链上/API 任务模板作为预览证据。"), launchBundleText("Task template library", "任务模板库")),
        launchTask("pre-social-waitlist", "social_manual", launchBundleText("Social waitlist review", "社交 waitlist 审核"), launchBundleText("Route social/manual tasks through human review before any reward impact.", "任何奖励影响前将社交/人工任务交给人工审核。"), launchBundleText("Risk and publish readiness", "风险与发布 readiness")),
      ],
      gateEvidence: preLaunchGates,
      handoffIds: ["create_campaign", "generate_campaign_tasks", "verify_task"],
      handoffs,
      nextAction: launchBundleText(
        "Review Launch Console handoff contracts and provider evidence before creating a live launch package.",
        "创建真实 launch package 前先审核 Launch Console handoff contracts 与 provider 证据。",
      ),
    }),
    launchBundle({
      id: "bundle-launch",
      stage: "launch",
      title: launchBundleText("Launch bundle", "上线活动包"),
      objective: launchBundleText(
        "Coordinate launch-week tasks, eligibility checks, content review, and risk gates.",
        "协调上线周任务、资格检查、内容审核与风险门禁。",
      ),
      campaignIntent: launchBundleText("Drive verified launch-week actions without automatic publishing.", "驱动上线周有效行为，但不自动发布。"),
      targetAudience: launchBundleText("Launch-week participants, referral cohorts, and verified ecosystem users.", "上线周参与者、邀请队列与已验证生态用户。"),
      recommendedTiming: launchBundleText("Launch day through the first launch week.", "上线日到上线首周。"),
      ownerRole: "internal_operator",
      tasks: [
        launchTask("launch-onchain-action", "on_chain_api", launchBundleText("Verified ecosystem action", "已验证生态行为"), launchBundleText("Bridge, swap, mint, vote, or dApp API actions stay provider-review gated.", "Bridge、swap、mint、vote 或 dApp API 行为保持 provider 审核门禁。"), launchBundleText("Verification pipeline", "验证 pipeline")),
        launchTask("launch-content-posts", "content_analytics", launchBundleText("Launch content posts", "上线内容帖"), launchBundleText("AI-generated posts require human review before any channel publish intent.", "AI 生成帖子在任何渠道发布意图前必须人工审核。"), launchBundleText("AI content pack", "AI 内容包")),
        launchTask("launch-social-referral", "social_manual", launchBundleText("Referral and social task review", "邀请与社交任务审核"), launchBundleText("Social/referral activity remains review input and cannot auto-award rewards.", "社交/邀请活动只作为审核输入，不能自动发奖。"), launchBundleText("Risk intelligence", "风险智能")),
      ],
      gateEvidence: launchGates,
      handoffIds: ["verify_task", "check_eligibility", "generate_campaign_posts"],
      handoffs,
      nextAction: publishOperation?.nextAction ?? lifecycle.nextAction,
    }),
    launchBundle({
      id: "bundle-post-launch",
      stage: "post_launch",
      title: launchBundleText("Post-launch bundle", "上线后活动包"),
      objective: launchBundleText(
        "Review winners, export readiness, analytics summary, and reward responsibility after launch.",
        "上线后审核 winners、导出 readiness、分析总结与奖励责任。",
      ),
      campaignIntent: launchBundleText("Turn launch activity into reviewed winners and summary insights.", "将上线活动转化为已审核 winners 与总结洞察。"),
      targetAudience: launchBundleText("Qualified participants, winners candidates, and retained ecosystem users.", "合格参与者、候选 winners 与留存生态用户。"),
      recommendedTiming: launchBundleText("After the launch window closes.", "Launch 窗口结束后。"),
      ownerRole: "export_reviewer",
      tasks: [
        launchTask("post-eligibility-check", "on_chain_api", launchBundleText("Eligibility review", "资格审核"), launchBundleText("Eligibility and winner checks stay local preview until export is approved.", "资格与 winner 检查在导出获批前保持本地预览。"), launchBundleText("Eligibility and export readiness", "资格与导出 readiness")),
        launchTask("post-winner-export", "content_analytics", launchBundleText("Winner export preview", "Winner 导出预览"), launchBundleText("Preview rows are reviewed without creating a real file, URL, or contract root.", "审核预览行，但不生成真实文件、URL 或合约 root。"), launchBundleText("Export confirmation", "导出确认")),
        launchTask("post-summary-report", "content_analytics", launchBundleText("Campaign summary report", "活动总结报告"), launchBundleText("Summary remains a local report-card output until analytics services are connected.", "Analytics 服务接入前总结保持为本地报告卡输出。"), launchBundleText("AI optimization and analytics", "AI 优化与分析")),
      ],
      gateEvidence: postLaunchGates,
      handoffIds: ["check_eligibility", "export_winners", "summarize_campaign"],
      handoffs,
      nextAction: exportReadiness.nextAction,
    }),
  ];

  return {
    boundary: launchConsoleBundleBoundary,
    bundles,
    campaignId: campaign.id,
    handoffs,
    nextAction: topLaunchBundleAction(bundles),
    summary: {
      blockedCount: bundles.filter((bundle) => bundle.status === "blocked").length,
      handoffRequiredCount: handoffs.filter((handoff) => handoff.reviewState !== "ready").length,
      launchBlockingCount: bundles.flatMap((bundle) => bundle.gateEvidence)
        .filter((gate) => gate.blocksLaunch).length,
      localOnlyCount: bundles.filter((bundle) => bundle.status === "local_only").length,
      readyCount: bundles.filter((bundle) => bundle.status === "ready").length,
      reviewRequiredCount: bundles.filter((bundle) => bundle.status === "review_required").length,
      totalBundles: bundles.length,
    },
  };
};

const aiOptimizationCategoryByReportId: Record<string, AiOptimizationReportCategory> = {
  "boss-report": "boss_report",
  "bot-pattern": "bot_pattern",
  "daily-summary": "analytics_summary",
  optimization: "optimization",
  "user-quality": "user_quality",
  "winner-report": "winner_report",
};

const aiOptimizationOwnerByCategory: Record<AiOptimizationReportCategory, AiOptimizationOwnerRole> = {
  analytics_summary: "internal_operator",
  boss_report: "growth_lead",
  bot_pattern: "risk_reviewer",
  optimization: "project_owner",
  user_quality: "growth_lead",
  winner_report: "risk_reviewer",
};

const aiOptimizationCategoryFallbackTitle: Record<AiOptimizationReportCategory, LocalizedText> = {
  analytics_summary: {
    "en-US": "AI analytics summary",
    "zh-CN": "AI 分析摘要",
    "zh-TW": "AI analytics summary",
  },
  boss_report: {
    "en-US": "AI boss report",
    "zh-CN": "AI Boss 报告",
    "zh-TW": "AI boss report",
  },
  bot_pattern: {
    "en-US": "AI bot pattern summary",
    "zh-CN": "AI 机器人模式摘要",
    "zh-TW": "AI bot pattern summary",
  },
  optimization: {
    "en-US": "AI optimization",
    "zh-CN": "AI 优化建议",
    "zh-TW": "AI optimization",
  },
  user_quality: {
    "en-US": "AI user quality summary",
    "zh-CN": "AI 用户质量摘要",
    "zh-TW": "AI user quality summary",
  },
  winner_report: {
    "en-US": "AI winner report",
    "zh-CN": "AI winner 报告",
    "zh-TW": "AI winner report",
  },
};

const createAiOptimizationStatus = (
  recommendation: Pick<AiOptimizationAction, "requiresHumanReview" | "riskLevel">,
  category: AiOptimizationReportCategory,
): AiOptimizationActionStatus => {
  if (recommendation.riskLevel === "high" || category === "bot_pattern") {
    return "blocked";
  }

  if (recommendation.requiresHumanReview || category === "winner_report") {
    return "review_required";
  }

  return "ready_to_review";
};

const createAiOptimizationGuardrail = (category: AiOptimizationReportCategory): LocalizedText => {
  if (category === "winner_report") {
    return exportRiskBoundary;
  }

  if (category === "bot_pattern") {
    return {
      "en-US": "Risk signals are review inputs; Campaign OS does not automatically ban, exclude, export, or distribute rewards.",
      "zh-CN": "风险信号仅作为审核输入；Campaign OS 不会自动封禁、剔除、导出或发奖。",
      "zh-TW": "Risk signals are review inputs; Campaign OS does not automatically ban, exclude, export, or distribute rewards.",
    };
  }

  if (category === "optimization") {
    return {
      "en-US": "Optimization suggestions require operator/project review before any campaign rule changes.",
      "zh-CN": "优化建议在修改活动规则前需要运营/项目方审核。",
      "zh-TW": "Optimization suggestions require operator/project review before any campaign rule changes.",
    };
  }

  return aiOptimizationBoundary;
};

const metricText = (enUS: string, zhCN: string): LocalizedText => ({
  "en-US": enUS,
  "zh-CN": zhCN,
  "zh-TW": enUS,
});

const sourceMetric = (
  id: string,
  label: LocalizedText,
  value: string,
  tone: AiOptimizationMetricTone,
): AiOptimizationSourceMetric => ({
  id,
  label,
  value,
  tone,
});

const createAiOptimizationSourceMetrics = (
  category: AiOptimizationReportCategory,
  campaign: CampaignShellDetail,
  exportBatch: ExportBatchSummary,
  analytics: AnalyticsKpi[],
): AiOptimizationSourceMetric[] => {
  const analyticsById = Object.fromEntries(analytics.map((kpi) => [kpi.id, kpi]));
  const riskSignal = campaign.riskSignals.find((signal) => signal.severity === "high") ??
    campaign.riskSignals[0];
  const walletSplit = createWalletSplit(campaign.participants);
  const aaWallets = String(walletSplit.find((split) => split.label === "AA")?.count ?? 0);
  const eoaWallets = String(walletSplit.find((split) => split.label === "EOA")?.count ?? 0);
  const reviewRows = exportBatch.rows.filter((row) => row.rowStatus !== "ready").length;

  switch (category) {
    case "analytics_summary":
      return [
        sourceMetric(
          "drop-off",
          metricText("Main drop-off", "主要流失点"),
          createDropOffPoint(campaign.conversionFunnel)["en-US"],
          "warning",
        ),
        sourceMetric(
          "verified-actions",
          analyticsById["verified-actions"]?.label ?? metricText("Verified actions", "有效行为"),
          analyticsById["verified-actions"]?.value ?? "0",
          "good",
        ),
      ];
    case "user_quality":
      return [
        sourceMetric("aa-wallets", metricText("AA wallets", "AA 钱包"), aaWallets, "good"),
        sourceMetric("eoa-wallets", metricText("EOA wallets", "EOA 钱包"), eoaWallets, "good"),
      ];
    case "bot_pattern":
      return [
        sourceMetric(
          "risk-signal",
          riskSignal?.label ?? metricText("Risk signal", "风险信号"),
          riskSignal?.value ?? "0",
          "risk",
        ),
      ];
    case "winner_report":
      return [
        sourceMetric(
          "export-ready",
          metricText("Export ready rows", "导出就绪行"),
          `${exportBatch.readyCount}/${exportBatch.rows.length}`,
          reviewRows > 0 ? "warning" : "good",
        ),
        sourceMetric(
          "review-rows",
          metricText("Rows needing review", "需审核行"),
          String(reviewRows),
          reviewRows > 0 ? "warning" : "good",
        ),
      ];
    case "boss_report":
      return [
        sourceMetric(
          "participants",
          analyticsById.participants?.label ?? metricText("Participants", "参与者"),
          analyticsById.participants?.value ?? String(campaign.participants.length),
          "good",
        ),
        sourceMetric(
          "risk-rate",
          analyticsById["risk-rate"]?.label ?? metricText("Risk rate", "风险比例"),
          analyticsById["risk-rate"]?.value ?? "0%",
          "warning",
        ),
      ];
    case "optimization":
      return [
        sourceMetric(
          "referral-conversion",
          analyticsById["referral-conversion"]?.label ?? metricText("Referral conversion", "邀请转化"),
          analyticsById["referral-conversion"]?.value ?? "0%",
          "warning",
        ),
      ];
  }
};

const createAiOptimizationEvidence = (
  reportSummary: LocalizedText,
  metrics: AiOptimizationSourceMetric[],
): LocalizedText => {
  const firstMetric = metrics[0];

  return {
    "en-US": `${reportSummary["en-US"]} Evidence: ${firstMetric.label["en-US"]} = ${firstMetric.value}.`,
    "zh-CN": `${reportSummary["zh-CN"]} 证据：${firstMetric.label["zh-CN"]} = ${firstMetric.value}。`,
    "zh-TW": `${reportSummary["zh-TW"]} Evidence: ${firstMetric.label["en-US"]} = ${firstMetric.value}.`,
  };
};

const createAiOptimizationNextAction = (
  category: AiOptimizationReportCategory,
  status: AiOptimizationActionStatus,
): LocalizedText => {
  if (status === "blocked") {
    return {
      "en-US": "Complete human risk/export review before this recommendation can move forward.",
      "zh-CN": "先完成人工风险/导出审核，再推进该建议。",
      "zh-TW": "Complete human risk/export review before this recommendation can move forward.",
    };
  }

  if (status === "review_required") {
    return {
      "en-US": "Route to the accountable reviewer before changing campaign rules or export decisions.",
      "zh-CN": "修改活动规则或导出决定前，先交由对应审核人处理。",
      "zh-TW": "Route to the accountable reviewer before changing campaign rules or export decisions.",
    };
  }

  if (category === "optimization") {
    return {
      "en-US": "Review with the project owner and keep qualified on-chain actions as the quality anchor.",
      "zh-CN": "与项目方审核，并继续把合格链上行为作为质量锚点。",
      "zh-TW": "Review with the project owner and keep qualified on-chain actions as the quality anchor.",
    };
  }

  return {
    "en-US": "Operator can review this recommendation as a local optimization input.",
    "zh-CN": "运营可将该建议作为本地优化输入进行审核。",
    "zh-TW": "Operator can review this recommendation as a local optimization input.",
  };
};

export const createAiOptimizationWorkflow = (
  campaign: CampaignShellDetail,
): AiOptimizationWorkflow => {
  const exportBatch = createExportBatch(campaign);
  const analytics = createAnalytics(campaign, exportBatch);
  const reports = campaign.aiOpsReports.map<AiOptimizationReportGroup>((report) => {
    const category = aiOptimizationCategoryByReportId[report.id] ?? "optimization";

    return {
      id: report.id,
      category,
      title: report.title ?? aiOptimizationCategoryFallbackTitle[category],
      summary: report.summary,
      generatedAt: report.generatedAt,
      actions: report.recommendations.map<AiOptimizationAction>((recommendation) => {
        const status = createAiOptimizationStatus(recommendation, category);
        const sourceMetrics = createAiOptimizationSourceMetrics(category, campaign, exportBatch, analytics);

        return {
          id: recommendation.id,
          title: recommendation.title,
          status,
          ownerRole:
            status === "blocked" || category === "winner_report"
              ? "risk_reviewer"
              : aiOptimizationOwnerByCategory[category],
          evidence: createAiOptimizationEvidence(report.summary, sourceMetrics),
          sourceMetrics,
          expectedImpact: recommendation.expectedImpact,
          confidence: recommendation.confidence,
          riskLevel: recommendation.riskLevel,
          guardrail: createAiOptimizationGuardrail(category),
          nextAction: createAiOptimizationNextAction(category, status),
          requiresHumanReview: recommendation.requiresHumanReview,
        };
      }),
    };
  });
  const actions = reports.flatMap((report) => report.actions);
  const readyCount = actions.filter((action) => action.status === "ready_to_review").length;
  const reviewRequiredCount = actions.filter((action) => action.status === "review_required").length;
  const blockedCount = actions.filter((action) => action.status === "blocked").length;
  const topAction =
    actions.find((action) => action.status === "ready_to_review" && action.ownerRole === "project_owner") ??
    actions.find((action) => action.status === "ready_to_review") ??
    actions[0];
  const bossReport = reports.find((report) => report.category === "boss_report");
  const summaryNextAction = blockedCount > 0
    ? createAiOptimizationNextAction("bot_pattern", "blocked")
    : topAction?.nextAction ?? {
        "en-US": "Review seeded AI optimization actions.",
        "zh-CN": "审核 seeded AI 优化动作。",
        "zh-TW": "Review seeded AI optimization actions.",
      };

  return {
    campaignId: campaign.id,
    summary: {
      totalActions: actions.length,
      readyCount,
      reviewRequiredCount,
      blockedCount,
      topActionId: topAction?.id ?? "",
      bossSummary: bossReport?.summary ?? {
        "en-US": "AI boss report is not available in the seeded workflow.",
        "zh-CN": "Seeded 工作流中暂无 AI Boss 报告。",
        "zh-TW": "AI boss report is not available in the seeded workflow.",
      },
      nextAction: summaryNextAction,
    },
    reports,
    projectOwnerSummary: {
      title: {
        "en-US": "AI Optimization summary",
        "zh-CN": "AI 优化摘要",
        "zh-TW": "AI Optimization summary",
      },
      summary: {
        "en-US":
          "AI optimization highlights project-owner actions while hiding internal risk mechanics.",
        "zh-CN": "AI 优化聚焦项目方可处理动作，并隐藏内部风险细节。",
        "zh-TW":
          "AI optimization highlights project-owner actions while hiding internal risk mechanics.",
      },
      recommendedAction: topAction?.title ?? aiOptimizationCategoryFallbackTitle.optimization,
      nextAction: topAction?.nextAction ?? summaryNextAction,
      boundary: aiOptimizationBoundary,
      hiddenInternalRiskDetail: true,
    },
    boundary: aiOptimizationBoundary,
  };
};

export const createProjectCampaignCommandCenter = (
  campaign: CampaignShellDetail,
): ProjectCampaignCommandCenter => {
  const exportBatch = createExportBatch(campaign);
  const campaigns = createSeededCampaignCommandItems(campaign, exportBatch);
  const analyticsExport = createAnalyticsExportDecision(campaign, exportBatch);
  const advancedAnalytics = createAdvancedAnalyticsReadiness(campaign, exportBatch);
  const aiOptimization = createAiOptimizationWorkflow(campaign);
  const aelfWebLoginAdapterReadiness = createAelfWebLoginAdapterReadiness(campaign.walletSessions);
  const providerEvidenceRegistry = createProviderEvidenceRegistry(campaign);
  const lifecycleOperations = createCampaignLifecycleOperations(campaign);
  const launchConsoleCampaignBundles = createLaunchConsoleCampaignBundles(campaign);
  const portfolioCommercialReadiness = createProjectPortfolioCommercialReadiness({
    advancedAnalytics,
    campaigns,
    exportReadyRows: analyticsExport.readyRows,
    launchConsoleCampaignBundles,
  });

  return {
    summary: createCommandSummary(campaigns, analyticsExport.readyRows),
    campaigns,
    analyticsExport,
    advancedAnalytics,
    aiOptimization,
    aelfWebLoginAdapterReadiness,
    providerEvidenceRegistry,
    lifecycleOperations,
    launchConsoleCampaignBundles,
    portfolioCommercialReadiness,
    boundary: commandCenterBoundary,
  };
};

const postCampaignCloseoutBoundary: LocalizedText = localized(
  "Seeded/local retrospective only. No live analytics, no live AI provider, no real export file, no contract root or claim, no backend archive mutation, and no reward custody or distribution is executed.",
  "仅 seeded/本地复盘。不接入实时 analytics 或真实 AI provider，不生成真实导出文件，不写入合约 root 或 claim，不执行后端归档变更，也不托管或发放奖励。",
);

const postCampaignAiRetrospectiveBoundary: LocalizedText = localized(
  "AI retrospective is local report-card input for human review; it cannot change rules, approve winners, export files, or distribute rewards automatically.",
  "AI 复盘仅是本地报告卡输入，必须人工审核；不会自动修改规则、批准 winners、导出文件或发奖。",
);

const closeoutStatusPriority: Record<PostCampaignCloseoutStatus, number> = {
  blocked: 0,
  review_required: 1,
  local_only: 2,
  ready: 3,
};

const statusFromPublishState = (state: PublishState): PostCampaignCloseoutStatus =>
  state === "blocker" ? "blocked" : state === "warning" ? "review_required" : "ready";

const statusFromAdvancedReadiness = (state: AdvancedAnalyticsReadinessState): PostCampaignCloseoutStatus =>
  state === "blocked"
    ? "blocked"
    : state === "review_required"
      ? "review_required"
      : state === "local_only"
        ? "local_only"
        : "ready";

const statusFromAiOptimizationAction = (state: AiOptimizationActionStatus): PostCampaignCloseoutStatus =>
  state === "blocked" ? "blocked" : state === "review_required" ? "review_required" : "ready";

const statusFromLifecycleOperation = (
  state: CampaignLifecycleOperation["operationState"],
): PostCampaignCloseoutStatus => {
  if (state === "blocked") {
    return "blocked";
  }

  if (state === "review_required") {
    return "review_required";
  }

  return state === "not_applicable" ? "local_only" : "ready";
};

const createPostCampaignCloseoutGate = (gate: PostCampaignCloseoutGate): PostCampaignCloseoutGate => gate;

const sortPostCampaignCloseoutGatesByPriority = (
  gates: readonly PostCampaignCloseoutGate[],
): PostCampaignCloseoutGate[] =>
  [...gates].sort(
    (left, right) => closeoutStatusPriority[left.status] - closeoutStatusPriority[right.status],
  );

const aggregateCloseoutStatus = (
  gates: readonly PostCampaignCloseoutGate[],
): PostCampaignCloseoutStatus =>
  sortPostCampaignCloseoutGatesByPriority(gates)[0]?.status ?? "local_only";

const createPostCampaignCloseoutSummary = (
  gates: readonly PostCampaignCloseoutGate[],
): PostCampaignCloseout["summary"] => {
  const topGate = sortPostCampaignCloseoutGatesByPriority(gates)[0];

  return {
    totalGates: gates.length,
    readyCount: gates.filter((gate) => gate.status === "ready").length,
    reviewRequiredCount: gates.filter((gate) => gate.status === "review_required").length,
    blockedCount: gates.filter((gate) => gate.status === "blocked").length,
    localOnlyCount: gates.filter((gate) => gate.status === "local_only").length,
    topGateId: topGate?.id ?? "",
    topAction: topGate?.nextAction ?? localized("Review closeout evidence.", "审核 closeout 证据。"),
  };
};

const ownerFromLifecycleOwner = (
  ownerRole: CampaignLifecycleOperation["ownerRole"],
): PostCampaignCloseoutOwnerRole =>
  ownerRole === "contract_reviewer" ? "internal_operator" : ownerRole;

const createPostCampaignRetrospective = ({
  advancedAnalytics,
  analyticsExport,
  aiOptimization,
  riskIntelligence,
  status,
}: {
  advancedAnalytics: AdvancedAnalyticsReadinessSurface;
  analyticsExport: AnalyticsExportDecision;
  aiOptimization: AiOptimizationWorkflow;
  riskIntelligence: RiskIntelligenceReviewSurface;
  status: PostCampaignCloseoutStatus;
}): PostCampaignRetrospective => {
  const analyticsById = Object.fromEntries(analyticsExport.kpis.map((kpi) => [kpi.id, kpi]));
  const winnerReport = aiOptimization.reports.find((report) => report.category === "winner_report");
  const bossReport = aiOptimization.reports.find((report) => report.category === "boss_report");
  const verifiedActions = analyticsById["verified-actions"];
  const eligibleWinners = analyticsById["eligible-winners"];
  const topRisk = riskIntelligence.dimensions.find((dimension) => dimension.reviewState === "blocked") ??
    riskIntelligence.dimensions.find((dimension) => dimension.reviewState === "review_required");

  return {
    title: localized("Post-campaign AI retrospective", "活动后 AI 复盘"),
    status,
    generatedAt: winnerReport?.generatedAt ?? bossReport?.generatedAt ?? "seeded-local",
    healthSummary: bossReport?.summary ?? aiOptimization.summary.bossSummary,
    verifiedActionEvidence: localized(
      `${verifiedActions?.label["en-US"] ?? "Verified actions"}: ${verifiedActions?.value ?? "0"}; main drop-off: ${analyticsExport.dropOffPoint["en-US"]}.`,
      `${verifiedActions?.label["zh-CN"] ?? "有效行为"}：${verifiedActions?.value ?? "0"}；主要流失点：${analyticsExport.dropOffPoint["zh-CN"]}。`,
    ),
    winnerReportSummary: winnerReport
      ? localized(
          `Winner report: ${winnerReport.summary["en-US"]}`,
          `Winner 报告：${winnerReport.summary["zh-CN"]}`,
        )
      : localized(
          `Winner report: ${eligibleWinners?.value ?? analyticsExport.readyRows} eligible/export-ready winners remain a local review input.`,
          `Winner 报告：${eligibleWinners?.value ?? analyticsExport.readyRows} 个合格/导出就绪 winners 仍是本地审核输入。`,
        ),
    riskPosture: topRisk
      ? localized(
          `${topRisk.label["en-US"]}: ${topRisk.rationale["en-US"]}`,
          `${topRisk.label["zh-CN"]}：${topRisk.rationale["zh-CN"]}`,
        )
      : riskIntelligence.boundary,
    nextIterationActions: [
      aiOptimization.projectOwnerSummary.recommendedAction,
      advancedAnalytics.summary.nextAction,
      riskIntelligence.meaningfulAction.nextAction,
    ],
    humanReviewRequired: true,
    boundary: postCampaignAiRetrospectiveBoundary,
  };
};

export const createPostCampaignCloseout = (
  campaign: CampaignShellDetail,
): PostCampaignCloseout => {
  const commandCenter = createProjectCampaignCommandCenter(campaign);
  const riskIntelligence = createRiskIntelligenceReviewSurface(campaign);
  const archiveOperation = commandCenter.lifecycleOperations.operations.find(
    (operation) => operation.id === "archive-campaign",
  );
  const winnerReport = commandCenter.aiOptimization.reports.find(
    (report) => report.category === "winner_report",
  );
  const winnerReportStatus = winnerReport?.actions
    .map((action) => statusFromAiOptimizationAction(action.status))
    .sort((left, right) => closeoutStatusPriority[left] - closeoutStatusPriority[right])[0] ??
    "review_required";
  const exportStatus: PostCampaignCloseoutStatus = commandCenter.analyticsExport.blockedRows > 0
    ? "blocked"
    : commandCenter.analyticsExport.reviewRequiredRows > 0
      ? "review_required"
      : "local_only";
  const riskStatus: PostCampaignCloseoutStatus = riskIntelligence.summary.blockedCount > 0
    ? "blocked"
    : riskIntelligence.summary.reviewRequiredCount > 0 || riskIntelligence.summary.highSeverityCount > 0
      ? "review_required"
      : "ready";
  const premiumReportStatuses = commandCenter.advancedAnalytics.premiumReports.map((report) =>
    statusFromAdvancedReadiness(report.readiness)
  );
  const analyticsStatus = premiumReportStatuses.sort(
    (left, right) => closeoutStatusPriority[left] - closeoutStatusPriority[right],
  )[0] ?? "local_only";
  const nextOptimizationStatus: PostCampaignCloseoutStatus =
    commandCenter.aiOptimization.summary.blockedCount > 0
      ? "blocked"
      : commandCenter.aiOptimization.summary.reviewRequiredCount > 0
        ? "review_required"
        : "local_only";
  const gates: PostCampaignCloseoutGate[] = [
    createPostCampaignCloseoutGate({
      id: "analytics-summary",
      label: localized("Analytics summary", "数据复盘摘要"),
      status: analyticsStatus,
      ownerRole: "growth_lead",
      evidence: localized(
        `${commandCenter.advancedAnalytics.summary.premiumReadyReports}/${commandCenter.advancedAnalytics.premiumReports.length} premium reports are seeded-ready; ${commandCenter.analyticsExport.dropOffPoint["en-US"]} remains the main drop-off.`,
        `${commandCenter.advancedAnalytics.summary.premiumReadyReports}/${commandCenter.advancedAnalytics.premiumReports.length} 个 premium reports 已 seeded 就绪；${commandCenter.analyticsExport.dropOffPoint["zh-CN"]} 仍是主要流失点。`,
      ),
      reason: commandCenter.advancedAnalytics.boundary,
      nextAction: commandCenter.advancedAnalytics.summary.nextAction,
      source: "analytics",
    }),
    createPostCampaignCloseoutGate({
      id: "ai-winner-report",
      label: localized("AI winner report review", "AI winner 报告审核"),
      status: winnerReportStatus,
      ownerRole: "risk_reviewer",
      evidence: winnerReport?.summary ?? localized("Winner report is not available in the seeded workflow.", "Seeded 工作流中暂无 winner report。"),
      reason: postCampaignAiRetrospectiveBoundary,
      nextAction: winnerReport?.actions[0]?.nextAction ?? commandCenter.aiOptimization.summary.nextAction,
      source: "ai_report",
    }),
    createPostCampaignCloseoutGate({
      id: "export-readiness",
      label: localized("Export readiness", "导出 readiness"),
      status: exportStatus,
      ownerRole: "export_reviewer",
      evidence: localized(
        `${commandCenter.analyticsExport.readyRows} ready / ${commandCenter.analyticsExport.reviewRequiredRows} review / ${commandCenter.analyticsExport.blockedRows} blocked rows in ${commandCenter.analyticsExport.exportBatchId}.`,
        `${commandCenter.analyticsExport.exportBatchId} 中有 ${commandCenter.analyticsExport.readyRows} 个就绪 / ${commandCenter.analyticsExport.reviewRequiredRows} 个需审核 / ${commandCenter.analyticsExport.blockedRows} 个阻断行。`,
      ),
      reason: commandCenter.analyticsExport.boundary,
      nextAction: commandCenter.campaigns.find((item) => item.status === "ended")?.nextActionDetail ??
        localized("Review export rows before closeout.", "Closeout 前审核导出行。"),
      source: "export",
    }),
    createPostCampaignCloseoutGate({
      id: "risk-review",
      label: localized("Risk review", "风险审核"),
      status: riskStatus,
      ownerRole: "risk_reviewer",
      evidence: localized(
        `${riskIntelligence.summary.blockedCount} blocked / ${riskIntelligence.summary.reviewRequiredCount} review-required risk dimensions.`,
        `${riskIntelligence.summary.blockedCount} 个阻断 / ${riskIntelligence.summary.reviewRequiredCount} 个需审核风险维度。`,
      ),
      reason: riskIntelligence.boundary,
      nextAction: riskIntelligence.meaningfulAction.nextAction,
      source: "risk",
    }),
    createPostCampaignCloseoutGate({
      id: "reward-responsibility",
      label: localized("Reward responsibility acknowledgement", "奖励责任确认"),
      status: "ready",
      ownerRole: "project_owner",
      evidence: rewardBoundary,
      reason: localized(
        "Closeout keeps final reward fulfillment with the campaign project.",
        "Closeout 仍保持最终奖励履约由活动项目方负责。",
      ),
      nextAction: localized(
        "Confirm project-owned reward fulfillment after winner review.",
        "Winner 审核后确认项目方负责奖励履约。",
      ),
      source: "reward",
    }),
    createPostCampaignCloseoutGate({
      id: "final-report-archive",
      label: localized("Final report archive", "最终报告归档"),
      status: archiveOperation ? statusFromLifecycleOperation(archiveOperation.operationState) : "local_only",
      ownerRole: archiveOperation ? ownerFromLifecycleOwner(archiveOperation.ownerRole) : "internal_operator",
      evidence: archiveOperation?.reason ?? commandCenter.lifecycleOperations.boundary,
      reason: commandCenter.lifecycleOperations.boundary,
      nextAction: archiveOperation?.nextAction ?? commandCenter.lifecycleOperations.nextAction,
      source: "lifecycle",
    }),
    createPostCampaignCloseoutGate({
      id: "next-campaign-recommendation",
      label: localized("Next-campaign recommendation", "下一轮活动建议"),
      status: nextOptimizationStatus,
      ownerRole: "growth_lead",
      evidence: commandCenter.aiOptimization.projectOwnerSummary.summary,
      reason: commandCenter.aiOptimization.boundary,
      nextAction: commandCenter.aiOptimization.projectOwnerSummary.nextAction,
      source: "optimization",
    }),
  ];
  const status = aggregateCloseoutStatus(gates);
  const summary = createPostCampaignCloseoutSummary(gates);
  const aiRetrospective = createPostCampaignRetrospective({
    advancedAnalytics: commandCenter.advancedAnalytics,
    aiOptimization: commandCenter.aiOptimization,
    analyticsExport: commandCenter.analyticsExport,
    riskIntelligence,
    status,
  });

  return {
    campaignId: campaign.id,
    status,
    summary,
    gates,
    aiRetrospective,
    rewardBoundary,
    nextAction: summary.topAction,
    boundary: postCampaignCloseoutBoundary,
  };
};

const createContractReviewChecklist = (
  mode: ContractMode,
): ContractReviewChecklistItem[] => {
  const claimModeSelected = mode === "CONTRACT_CLAIM";

  return [
    {
      id: "contract-address",
      label: {
        "en-US": "Contract address",
        "zh-CN": "合约地址",
        "zh-TW": "Contract address",
      },
      value: {
        "en-US": claimModeSelected ? "Required before claim review" : "Not required for Off-chain MVP",
        "zh-CN": claimModeSelected ? "领取审核前必须提供" : "Off-chain MVP 不需要",
        "zh-TW": claimModeSelected ? "Required before claim review" : "Not required for Off-chain MVP",
      },
      status: claimModeSelected ? "blocked" : "passed",
      ownerRole: "contract_reviewer",
      requiredFor: "CONTRACT_CLAIM",
      detail: {
        "en-US": "MVP uses off-chain verification and winner export without contract migration.",
        "zh-CN": "MVP 使用链下验证和 winners 导出，不需要合约迁移。",
        "zh-TW": "MVP uses off-chain verification and winner export without contract migration.",
      },
      nextAction: {
        "en-US": "Keep contract address empty until a claim-mode review is opened.",
        "zh-CN": "在领取模式审核开启前保持合约地址为空。",
        "zh-TW": "Keep contract address empty until a claim-mode review is opened.",
      },
    },
    {
      id: "audit-status",
      label: {
        "en-US": "Audit status",
        "zh-CN": "审计状态",
        "zh-TW": "Audit status",
      },
      value: {
        "en-US": claimModeSelected ? "Audit required before claim" : "Not required for MVP shell",
        "zh-CN": claimModeSelected ? "领取前必须审计" : "MVP shell 不需要",
        "zh-TW": claimModeSelected ? "Audit required before claim" : "Not required for MVP shell",
      },
      status: claimModeSelected ? "blocked" : "passed",
      ownerRole: "contract_reviewer",
      requiredFor: "CONTRACT_CLAIM",
      detail: {
        "en-US": "Claim mode is high impact because it can affect reward distribution.",
        "zh-CN": "领取模式可能影响奖励发放，因此属于高影响模式。",
        "zh-TW": "Claim mode is high impact because it can affect reward distribution.",
      },
      nextAction: {
        "en-US": "Require audit evidence before any contract claim approval.",
        "zh-CN": "任何合约领取批准前必须提供审计证据。",
        "zh-TW": "Require audit evidence before any contract claim approval.",
      },
    },
    {
      id: "metadata-hash",
      label: {
        "en-US": "Metadata hash",
        "zh-CN": "Metadata hash",
        "zh-TW": "Metadata hash",
      },
      value: {
        "en-US": "Optional for MVP; planned for CampaignRegistryV2",
        "zh-CN": "MVP 可选；计划用于 CampaignRegistryV2",
        "zh-TW": "Optional for MVP; planned for CampaignRegistryV2",
      },
      status: "warning",
      ownerRole: "internal_operator",
      requiredFor: "P1",
      detail: {
        "en-US": "Store only metadata URI/hash later; full campaign copy stays off-chain.",
        "zh-CN": "后续只记录 metadata URI/hash；活动全文仍留在链下。",
        "zh-TW": "Store only metadata URI/hash later; full campaign copy stays off-chain.",
      },
      nextAction: {
        "en-US": "Prepare metadata hash when moving to the P1 registry path.",
        "zh-CN": "进入 P1 registry 路径时准备 metadata hash。",
        "zh-TW": "Prepare metadata hash when moving to the P1 registry path.",
      },
    },
    {
      id: "verifier-role",
      label: {
        "en-US": "Verifier role",
        "zh-CN": "Verifier role",
        "zh-TW": "Verifier role",
      },
      value: {
        "en-US": "Backend verifier only",
        "zh-CN": "仅 backend verifier",
        "zh-TW": "Backend verifier only",
      },
      status: "passed",
      ownerRole: "internal_operator",
      requiredFor: "MVP",
      detail: {
        "en-US": "The MVP verifier records seeded verification inputs without contract write authority.",
        "zh-CN": "MVP verifier 只记录 seeded 验证输入，不具备合约写权限。",
        "zh-TW": "The MVP verifier records seeded verification inputs without contract write authority.",
      },
      nextAction: {
        "en-US": "Keep verifier role off-chain until V2 role design is approved.",
        "zh-CN": "在 V2 role 设计批准前保持 verifier role 链下执行。",
        "zh-TW": "Keep verifier role off-chain until V2 role design is approved.",
      },
    },
    {
      id: "reward-custody",
      label: {
        "en-US": "Reward custody",
        "zh-CN": "奖励托管",
        "zh-TW": "Reward custody",
      },
      value: {
        "en-US": "Project-owned; None in Campaign OS",
        "zh-CN": "项目方持有；Campaign OS 不托管",
        "zh-TW": "Project-owned; None in Campaign OS",
      },
      status: "passed",
      ownerRole: "project_owner",
      requiredFor: "MVP",
      detail: {
        "en-US": "Campaign OS exports verified records only and never holds rewards.",
        "zh-CN": "Campaign OS 只导出已验证记录，绝不托管奖励。",
        "zh-TW": "Campaign OS exports verified records only and never holds rewards.",
      },
      nextAction: {
        "en-US": "Confirm project reward responsibility before winner export.",
        "zh-CN": "导出 winners 前确认项目方奖励责任。",
        "zh-TW": "Confirm project reward responsibility before winner export.",
      },
    },
    {
      id: "contract-claim-gate",
      label: {
        "en-US": "Contract claim gate",
        "zh-CN": "合约领取门禁",
        "zh-TW": "Contract claim gate",
      },
      value: {
        "en-US": "Blocked until high-impact manual review",
        "zh-CN": "高影响人工审核前保持阻断",
        "zh-TW": "Blocked until high-impact manual review",
      },
      status: "blocked",
      ownerRole: "contract_reviewer",
      requiredFor: "CONTRACT_CLAIM",
      detail: {
        "en-US": "Claim mode needs contract address, audit status, verifier role, metadata hash, and reward custody review.",
        "zh-CN": "领取模式需要合约地址、审计状态、verifier role、metadata hash 与奖励托管审核。",
        "zh-TW": "Claim mode needs contract address, audit status, verifier role, metadata hash, and reward custody review.",
      },
      nextAction: {
        "en-US": "Do not enable claim mode in the MVP shell.",
        "zh-CN": "不要在 MVP shell 启用领取模式。",
        "zh-TW": "Do not enable claim mode in the MVP shell.",
      },
    },
  ];
};

const createContractEvolution = (): ContractEvolutionStep[] => [
  {
    id: "mvp-off-chain",
    phase: {
      "en-US": "MVP",
      "zh-CN": "MVP",
      "zh-TW": "MVP",
    },
    title: {
      "en-US": "Off-chain verification + winner export",
      "zh-CN": "链下验证 + winners 导出",
      "zh-TW": "Off-chain verification + winner export",
    },
    description: {
      "en-US": "No contract migration; existing Pixiepoints/backend ledger remains usable.",
      "zh-CN": "不做合约迁移；继续使用现有 Pixiepoints/backend ledger。",
      "zh-TW": "No contract migration; existing Pixiepoints/backend ledger remains usable.",
    },
    status: "ready",
    contractSurface: {
      "en-US": "No new contract surface",
      "zh-CN": "无新增合约面",
      "zh-TW": "No new contract surface",
    },
  },
  {
    id: "p1-campaign-registry",
    phase: {
      "en-US": "P1",
      "zh-CN": "P1",
      "zh-TW": "P1",
    },
    title: {
      "en-US": "CampaignRegistryV2 metadata hash",
      "zh-CN": "CampaignRegistryV2 metadata hash",
      "zh-TW": "CampaignRegistryV2 metadata hash",
    },
    description: {
      "en-US": "Record owner, status, wallet policy, supported locales, metadata URI, and metadata hash.",
      "zh-CN": "记录 owner、status、wallet policy、supported locales、metadata URI 与 metadata hash。",
      "zh-TW": "Record owner, status, wallet policy, supported locales, metadata URI, and metadata hash.",
    },
    status: "warning",
    contractSurface: {
      "en-US": "CampaignRegistryV2",
      "zh-CN": "CampaignRegistryV2",
      "zh-TW": "CampaignRegistryV2",
    },
  },
  {
    id: "p1-points-referral-roots",
    phase: {
      "en-US": "P1",
      "zh-CN": "P1",
      "zh-TW": "P1",
    },
    title: {
      "en-US": "Points and referral roots",
      "zh-CN": "Points 与 referral roots",
      "zh-TW": "Points and referral roots",
    },
    description: {
      "en-US": "Commit points batch roots and referral qualification roots without exposing risk strategy.",
      "zh-CN": "提交积分批次 root 与推荐资格 root，但不暴露风控策略。",
      "zh-TW": "Commit points batch roots and referral qualification roots without exposing risk strategy.",
    },
    status: "warning",
    contractSurface: {
      "en-US": "CampaignPointsLedgerV2 + ReferralRegistryV2",
      "zh-CN": "CampaignPointsLedgerV2 + ReferralRegistryV2",
      "zh-TW": "CampaignPointsLedgerV2 + ReferralRegistryV2",
    },
  },
  {
    id: "p2-optional-claim",
    phase: {
      "en-US": "P2",
      "zh-CN": "P2",
      "zh-TW": "P2",
    },
    title: {
      "en-US": "Optional contract claim",
      "zh-CN": "可选合约领取",
      "zh-TW": "Optional contract claim",
    },
    description: {
      "en-US": "Only after separate approval for claim contract, audit status, custody, and eligibility proof.",
      "zh-CN": "仅在领取合约、审计状态、托管与资格证明单独批准后进入。",
      "zh-TW": "Only after separate approval for claim contract, audit status, custody, and eligibility proof.",
    },
    status: "blocker",
    contractSurface: {
      "en-US": "EligibilityRootRegistryV2 + optional claim contract",
      "zh-CN": "EligibilityRootRegistryV2 + 可选 claim contract",
      "zh-TW": "EligibilityRootRegistryV2 + optional claim contract",
    },
  },
];

const createAdminContractReviewCenter = (
  campaign: Pick<CampaignShellDetail, "id" | "contractMode">,
): AdminContractReviewCenter => {
  const claimModeSelected = campaign.contractMode === "CONTRACT_CLAIM";

  return {
    campaignId: campaign.id,
    selectedMode: campaign.contractMode,
    v2CompanionNeeded: {
      "en-US": "No for MVP; recommended for P1 transparency.",
      "zh-CN": "MVP 不需要；建议 P1 用于透明度增强。",
      "zh-TW": "No for MVP; recommended for P1 transparency.",
    },
    metadataHash: {
      "en-US": "Optional for MVP; planned for CampaignRegistryV2 metadata URI/hash.",
      "zh-CN": "MVP 可选；计划用于 CampaignRegistryV2 metadata URI/hash。",
      "zh-TW": "Optional for MVP; planned for CampaignRegistryV2 metadata URI/hash.",
    },
    verifierRole: {
      "en-US": "Backend verifier only; no contract write authority in MVP.",
      "zh-CN": "仅 backend verifier；MVP 没有合约写权限。",
      "zh-TW": "Backend verifier only; no contract write authority in MVP.",
    },
    rewardCustody: {
      "en-US": "Project-owned; None in Campaign OS.",
      "zh-CN": "项目方持有；Campaign OS 不托管。",
      "zh-TW": "Project-owned; None in Campaign OS.",
    },
    publishState: claimModeSelected ? "blocker" : "ready",
    highImpactMode: claimModeSelected,
    summary: {
      "en-US": "MVP stays off-chain: verification, ranking, and export are reviewed without contract migration.",
      "zh-CN": "MVP 保持链下：审核验证、排名与导出，不进行合约迁移。",
      "zh-TW": "MVP stays off-chain: verification, ranking, and export are reviewed without contract migration.",
    },
    boundary: {
      "en-US": "Seeded review only. No live contract transaction, no backend call, no reward custody, and no reward distribution is executed.",
      "zh-CN": "仅 seeded 审核。不执行真实合约交易、不调用后端、不托管奖励，也不发奖。",
      "zh-TW": "Seeded review only. No live contract transaction, no backend call, no reward custody, and no reward distribution is executed.",
    },
    nextAction: claimModeSelected
      ? {
          "en-US": "Block publish until contract reviewer approves high-impact claim mode.",
          "zh-CN": "阻断发布，直到合约审核人批准高影响领取模式。",
          "zh-TW": "Block publish until contract reviewer approves high-impact claim mode.",
        }
      : {
          "en-US": "Approve Off-chain MVP and keep V2 companion planning in P1 backlog.",
          "zh-CN": "批准 Off-chain MVP，并把 V2 companion 规划保留在 P1 backlog。",
          "zh-TW": "Approve Off-chain MVP and keep V2 companion planning in P1 backlog.",
        },
    checklist: createContractReviewChecklist(campaign.contractMode),
    evolution: createContractEvolution(),
  };
};

const contractInterfaceBoundary: LocalizedText = {
  "en-US": "Seeded/local contract interface matrix only. No ABI generation, live contract transaction, backend call, wallet signing, reward custody, or reward distribution is executed.",
  "zh-CN": "仅 seeded/本地合约接口矩阵。不会生成 ABI、执行真实合约交易、调用后端、钱包签名、托管奖励或发奖。",
  "zh-TW": "Seeded/local contract interface matrix only. No ABI generation, live contract transaction, backend call, wallet signing, reward custody, or reward distribution is executed.",
};

const companionContractBoundary: LocalizedText = {
  "en-US": "Companion contracts are planning surfaces for auditability; Campaign OS remains off-chain for MVP operations.",
  "zh-CN": "Companion contracts 仅作为透明度规划面；Campaign OS 的 MVP 操作仍保持链下。",
  "zh-TW": "Companion contracts are planning surfaces for auditability; Campaign OS remains off-chain for MVP operations.",
};

const noRewardCustodyBoundary: LocalizedText = {
  "en-US": "Campaign OS does not custody or distribute rewards; the campaign project owns reward fulfillment.",
  "zh-CN": "Campaign OS 不托管也不发放奖励；奖励履约由活动项目方负责。",
  "zh-TW": "Campaign OS does not custody or distribute rewards; the campaign project owns reward fulfillment.",
};

const deliveryChecklistBoundary: LocalizedText = {
  "en-US": "Seeded/local delivery readiness evidence only. No live wallet SDK, API call, contract transaction, export file, reward custody, or reward distribution is executed.",
  "zh-CN": "仅 seeded/本地交付 readiness 证据。不会执行实时钱包 SDK、API 调用、合约交易、导出文件、奖励托管或发奖。",
  "zh-TW": "Seeded/local delivery readiness evidence only. No live wallet SDK, API call, contract transaction, export file, reward custody, or reward distribution is executed.",
};

const createContractMethod = ({
  boundary = companionContractBoundary,
  name,
  nextAction,
  ownerRole,
  phase,
  purpose,
  readiness,
  signature,
}: {
  boundary?: LocalizedText;
  name: string;
  nextAction: LocalizedText;
  ownerRole: ContractInterfaceMethod["ownerRole"];
  phase: ContractInterfacePhase;
  purpose: LocalizedText;
  readiness: ContractInterfaceReadiness;
  signature: string;
}): ContractInterfaceMethod => ({
  boundary,
  name,
  nextAction,
  ownerRole,
  phase,
  purpose,
  readiness,
  signature,
});

const createContractInterfaceGroups = (): ContractInterfaceGroup[] => [
  {
    contractName: "CampaignRegistryV2",
    phase: "P1",
    readiness: "warning",
    purpose: {
      "en-US": "Records campaign owner, status, wallet policy, metadata URI/hash, and task config hash for later transparency.",
      "zh-CN": "记录活动 owner、状态、钱包策略、metadata URI/hash 与任务配置 hash，用于后续透明度增强。",
      "zh-TW": "Records campaign owner, status, wallet policy, metadata URI/hash, and task config hash for later transparency.",
    },
    ownerRole: "contract_reviewer",
    boundary: {
      "en-US": "Full campaign copy, AI drafts, and risk details stay off-chain; this console does not create a registry contract.",
      "zh-CN": "活动全文、AI 草稿与风控明细保持链下；当前控制台不会创建 registry 合约。",
      "zh-TW": "Full campaign copy, AI drafts, and risk details stay off-chain; this console does not create a registry contract.",
    },
    nextAction: {
      "en-US": "Keep MVP off-chain and prepare metadata hash review before P1 companion-contract work.",
      "zh-CN": "MVP 先保持链下，并在 P1 companion contract 前准备 metadata hash 审核。",
      "zh-TW": "Keep MVP off-chain and prepare metadata hash review before P1 companion-contract work.",
    },
    methods: [
      createContractMethod({
        name: "CreateCampaign",
        signature: "CreateCampaign(CampaignInfo input) returns (CampaignId)",
        purpose: {
          "en-US": "Create an auditable campaign record with owner, status, wallet policy, locales, and metadata hash.",
          "zh-CN": "创建可审计的活动记录，包含 owner、状态、钱包策略、语言与 metadata hash。",
          "zh-TW": "Create an auditable campaign record with owner, status, wallet policy, locales, and metadata hash.",
        },
        ownerRole: "contract_reviewer",
        phase: "P1",
        readiness: "warning",
        nextAction: {
          "en-US": "Define CampaignInfo schema and authorization before implementation.",
          "zh-CN": "实现前先定义 CampaignInfo schema 与授权边界。",
          "zh-TW": "Define CampaignInfo schema and authorization before implementation.",
        },
      }),
      createContractMethod({
        name: "UpdateCampaignMetadata",
        signature: "UpdateCampaignMetadata(UpdateCampaignMetadataInput input)",
        purpose: {
          "en-US": "Update metadata URI/hash while keeping translated copy off-chain.",
          "zh-CN": "更新 metadata URI/hash，同时保持多语言全文链下。",
          "zh-TW": "Update metadata URI/hash while keeping translated copy off-chain.",
        },
        ownerRole: "contract_reviewer",
        phase: "P1",
        readiness: "warning",
        nextAction: {
          "en-US": "Review immutable hash semantics and owner-only update policy.",
          "zh-CN": "审核 hash 语义与仅 owner 可更新策略。",
          "zh-TW": "Review immutable hash semantics and owner-only update policy.",
        },
      }),
      createContractMethod({
        name: "UpdateTaskConfigHash",
        signature: "UpdateTaskConfigHash(UpdateTaskConfigHashInput input)",
        purpose: {
          "en-US": "Record a task config hash without storing full task text on-chain.",
          "zh-CN": "记录任务配置 hash，不把完整任务文案上链。",
          "zh-TW": "Record a task config hash without storing full task text on-chain.",
        },
        ownerRole: "contract_reviewer",
        phase: "P1",
        readiness: "warning",
        nextAction: {
          "en-US": "Define task hash canonicalization before contract design.",
          "zh-CN": "合约设计前先定义任务 hash 规范化方式。",
          "zh-TW": "Define task hash canonicalization before contract design.",
        },
      }),
      createContractMethod({
        name: "SetCampaignStatus",
        signature: "SetCampaignStatus(SetCampaignStatusInput input)",
        purpose: {
          "en-US": "Move campaign lifecycle through draft, scheduled, live, paused, ended, and archived states.",
          "zh-CN": "管理 draft、scheduled、live、paused、ended、archived 等活动生命周期。",
          "zh-TW": "Move campaign lifecycle through draft, scheduled, live, paused, ended, and archived states.",
        },
        ownerRole: "contract_reviewer",
        phase: "P1",
        readiness: "warning",
        nextAction: {
          "en-US": "Align lifecycle transitions with Admin/Ops publish gates.",
          "zh-CN": "将生命周期流转与 Admin/Ops 发布门禁对齐。",
          "zh-TW": "Align lifecycle transitions with Admin/Ops publish gates.",
        },
      }),
      createContractMethod({
        name: "SetWalletPolicy",
        signature: "SetWalletPolicy(SetWalletPolicyInput input)",
        purpose: {
          "en-US": "Set ANY, AA_ONLY, or EOA_ONLY policy for campaign eligibility context.",
          "zh-CN": "设置 ANY、AA_ONLY 或 EOA_ONLY，用于活动资格上下文。",
          "zh-TW": "Set ANY, AA_ONLY, or EOA_ONLY policy for campaign eligibility context.",
        },
        ownerRole: "contract_reviewer",
        phase: "P1",
        readiness: "warning",
        nextAction: {
          "en-US": "Keep wallet type verification off-chain and store policy only.",
          "zh-CN": "钱包类型验证保持链下，仅存储策略。",
          "zh-TW": "Keep wallet type verification off-chain and store policy only.",
        },
      }),
      createContractMethod({
        name: "SetSupportedLocales",
        signature: "SetSupportedLocales(SetSupportedLocalesInput input)",
        purpose: {
          "en-US": "Record supported locale codes without storing localized campaign content.",
          "zh-CN": "记录支持的语言代码，不存储本地化活动全文。",
          "zh-TW": "Record supported locale codes without storing localized campaign content.",
        },
        ownerRole: "contract_reviewer",
        phase: "P1",
        readiness: "warning",
        nextAction: {
          "en-US": "Keep runtime locale scope aligned to the MVP set en-US, zh-CN, and zh-TW before any P1 locale expansion is approved.",
          "zh-CN": "运行时语言范围保持与 MVP 集合 en-US、zh-CN 与 zh-TW 对齐；后续 P1 语言扩展需另行批准。",
          "zh-TW": "執行時語言範圍保持與 MVP 集合 en-US、zh-CN 與 zh-TW 對齊；後續 P1 語言擴展需另行批准。",
        },
      }),
      createContractMethod({
        name: "TransferCampaignOwner",
        signature: "TransferCampaignOwner(TransferCampaignOwnerInput input)",
        purpose: {
          "en-US": "Transfer project-owner authority for a campaign registry record.",
          "zh-CN": "转移活动 registry 记录的项目方 owner 权限。",
          "zh-TW": "Transfer project-owner authority for a campaign registry record.",
        },
        ownerRole: "contract_reviewer",
        phase: "P1",
        readiness: "warning",
        nextAction: {
          "en-US": "Require explicit owner transfer review and audit trail.",
          "zh-CN": "需要明确的 owner 转移审核与审计记录。",
          "zh-TW": "Require explicit owner transfer review and audit trail.",
        },
      }),
      createContractMethod({
        name: "PauseCampaign",
        signature: "PauseCampaign(CampaignId input)",
        purpose: {
          "en-US": "Pause campaign registry state for operational incidents or review holds.",
          "zh-CN": "在运营事件或审核暂停时暂停活动 registry 状态。",
          "zh-TW": "Pause campaign registry state for operational incidents or review holds.",
        },
        ownerRole: "internal_operator",
        phase: "P1",
        readiness: "warning",
        nextAction: {
          "en-US": "Map pause authority to Admin/Ops incident procedures before enabling.",
          "zh-CN": "启用前将暂停权限映射到 Admin/Ops 事件流程。",
          "zh-TW": "Map pause authority to Admin/Ops incident procedures before enabling.",
        },
      }),
      createContractMethod({
        name: "GetCampaign",
        signature: "GetCampaign(CampaignId input) returns (CampaignInfo)",
        purpose: {
          "en-US": "Read the companion campaign registry record for audit review.",
          "zh-CN": "读取 companion campaign registry 记录用于审计复核。",
          "zh-TW": "Read the companion campaign registry record for audit review.",
        },
        ownerRole: "internal_operator",
        phase: "P1",
        readiness: "warning",
        nextAction: {
          "en-US": "Treat as future read-only contract view, not a live MVP dependency.",
          "zh-CN": "作为未来只读合约视图，不作为 MVP 实时依赖。",
          "zh-TW": "Treat as future read-only contract view, not a live MVP dependency.",
        },
      }),
    ],
  },
  {
    contractName: "CampaignPointsLedgerV2",
    phase: "P1",
    readiness: "warning",
    purpose: {
      "en-US": "Commits points batch roots for auditability while high-frequency point events remain off-chain by default.",
      "zh-CN": "提交积分批次 root 用于审计；高频积分事件默认保持链下。",
      "zh-TW": "Commits points batch roots for auditability while high-frequency point events remain off-chain by default.",
    },
    ownerRole: "contract_reviewer",
    boundary: {
      "en-US": "Single-write points are high-transparency optional rows and are not MVP-ready execution paths.",
      "zh-CN": "单条积分写链属于高透明度可选项，不是 MVP-ready 执行路径。",
      "zh-TW": "Single-write points are high-transparency optional rows and are not MVP-ready execution paths.",
    },
    nextAction: {
      "en-US": "Prefer batch root commits; review throughput and dispute handling before single-write points.",
      "zh-CN": "优先批次 root；单条积分写链前先评审吞吐与争议处理。",
      "zh-TW": "Prefer batch root commits; review throughput and dispute handling before single-write points.",
    },
    methods: [
      createContractMethod({
        name: "CommitPointsBatch",
        signature: "CommitPointsBatch(CommitPointsBatchInput input)",
        purpose: {
          "en-US": "Commit a periodic points root and task records hash for later audit.",
          "zh-CN": "提交周期性 points root 与 task records hash 供后续审计。",
          "zh-TW": "Commit a periodic points root and task records hash for later audit.",
        },
        ownerRole: "internal_operator",
        phase: "P1",
        readiness: "warning",
        nextAction: {
          "en-US": "Define batch cadence, root format, and rollback semantics.",
          "zh-CN": "定义批次周期、root 格式与回滚语义。",
          "zh-TW": "Define batch cadence, root format, and rollback semantics.",
        },
      }),
      createContractMethod({
        name: "RevokePointsBatch",
        signature: "RevokePointsBatch(RevokePointsBatchInput input)",
        purpose: {
          "en-US": "Revoke a committed points batch using a reason hash.",
          "zh-CN": "通过 reason hash 撤销已提交的积分批次。",
          "zh-TW": "Revoke a committed points batch using a reason hash.",
        },
        ownerRole: "contract_reviewer",
        phase: "P1",
        readiness: "warning",
        nextAction: {
          "en-US": "Require reviewer approval and dispute notes before revocation.",
          "zh-CN": "撤销前需要审核人批准与争议说明。",
          "zh-TW": "Require reviewer approval and dispute notes before revocation.",
        },
      }),
      createContractMethod({
        name: "GetPointsBatch",
        signature: "GetPointsBatch(GetPointsBatchInput input) returns (PointsBatchInfo)",
        purpose: {
          "en-US": "Read a committed points batch root for audit and reconciliation.",
          "zh-CN": "读取已提交 points batch root 用于审计与对账。",
          "zh-TW": "Read a committed points batch root for audit and reconciliation.",
        },
        ownerRole: "internal_operator",
        phase: "P1",
        readiness: "warning",
        nextAction: {
          "en-US": "Keep as future read-only reconciliation view.",
          "zh-CN": "作为未来只读对账视图保留。",
          "zh-TW": "Keep as future read-only reconciliation view.",
        },
      }),
      createContractMethod({
        name: "AwardTaskPoints",
        signature: "AwardTaskPoints(AwardTaskPointsInput input)",
        purpose: {
          "en-US": "Optional high-transparency single-write points award for each task event.",
          "zh-CN": "可选高透明度模式：每个任务事件单条写入积分。",
          "zh-TW": "Optional high-transparency single-write points award for each task event.",
        },
        ownerRole: "contract_reviewer",
        phase: "P1",
        readiness: "warning",
        boundary: {
          "en-US": "Not MVP-ready; high-frequency O(n) writes can raise cost and dispute risk.",
          "zh-CN": "非 MVP-ready；高频 O(n) 写入会增加成本与争议风险。",
          "zh-TW": "Not MVP-ready; high-frequency O(n) writes can raise cost and dispute risk.",
        },
        nextAction: {
          "en-US": "Use only after throughput, audit, and dispute procedures are approved.",
          "zh-CN": "仅在吞吐、审计与争议流程批准后使用。",
          "zh-TW": "Use only after throughput, audit, and dispute procedures are approved.",
        },
      }),
      createContractMethod({
        name: "RevokeTaskPoints",
        signature: "RevokeTaskPoints(RevokeTaskPointsInput input)",
        purpose: {
          "en-US": "Optional high-transparency single-write point revocation for task events.",
          "zh-CN": "可选高透明度模式：对任务事件单条撤销积分。",
          "zh-TW": "Optional high-transparency single-write point revocation for task events.",
        },
        ownerRole: "contract_reviewer",
        phase: "P1",
        readiness: "warning",
        boundary: {
          "en-US": "Not MVP-ready; use batch revocation unless single-write mode is separately approved.",
          "zh-CN": "非 MVP-ready；除非单条写链模式单独批准，否则使用批次撤销。",
          "zh-TW": "Not MVP-ready; use batch revocation unless single-write mode is separately approved.",
        },
        nextAction: {
          "en-US": "Keep behind separate high-transparency approval.",
          "zh-CN": "保留在单独的高透明度审批之后。",
          "zh-TW": "Keep behind separate high-transparency approval.",
        },
      }),
    ],
  },
  {
    contractName: "ReferralRegistryV2",
    phase: "P1",
    readiness: "warning",
    purpose: {
      "en-US": "Records referral bindings and qualification hashes to prevent duplicate or self-referral abuse.",
      "zh-CN": "记录邀请绑定与资格 hash，防止重复邀请或 self-referral 滥用。",
      "zh-TW": "Records referral bindings and qualification hashes to prevent duplicate or self-referral abuse.",
    },
    ownerRole: "contract_reviewer",
    boundary: {
      "en-US": "Referral evidence and anti-farm details stay off-chain; the contract surface stores binding/hash context only.",
      "zh-CN": "邀请证据与反刷细节保持链下；合约面仅存绑定/hash 上下文。",
      "zh-TW": "Referral evidence and anti-farm details stay off-chain; the contract surface stores binding/hash context only.",
    },
    nextAction: {
      "en-US": "Review binding rules for duplicate, self, and circular referrals before P1.",
      "zh-CN": "P1 前审核重复、自邀请与循环邀请绑定规则。",
      "zh-TW": "Review binding rules for duplicate, self, and circular referrals before P1.",
    },
    methods: [
      createContractMethod({
        name: "BindReferral",
        signature: "BindReferral(BindReferralInput input)",
        purpose: {
          "en-US": "Bind invitee and inviter for an auditable campaign referral relation.",
          "zh-CN": "绑定 invitee 与 inviter，形成可审计的活动邀请关系。",
          "zh-TW": "Bind invitee and inviter for an auditable campaign referral relation.",
        },
        ownerRole: "internal_operator",
        phase: "P1",
        readiness: "warning",
        nextAction: {
          "en-US": "Validate duplicate, self, and circular referral constraints.",
          "zh-CN": "验证重复、自邀请与循环邀请约束。",
          "zh-TW": "Validate duplicate, self, and circular referral constraints.",
        },
      }),
      createContractMethod({
        name: "MarkReferralQualified",
        signature: "MarkReferralQualified(MarkReferralQualifiedInput input)",
        purpose: {
          "en-US": "Mark referral qualification using an evidence hash without exposing review detail.",
          "zh-CN": "通过 evidence hash 标记邀请资格，不暴露审核细节。",
          "zh-TW": "Mark referral qualification using an evidence hash without exposing review detail.",
        },
        ownerRole: "internal_operator",
        phase: "P1",
        readiness: "warning",
        nextAction: {
          "en-US": "Keep qualification evidence canonicalization off-chain.",
          "zh-CN": "资格证据规范化保持链下。",
          "zh-TW": "Keep qualification evidence canonicalization off-chain.",
        },
      }),
      createContractMethod({
        name: "RemoveReferral",
        signature: "RemoveReferral(RemoveReferralInput input)",
        purpose: {
          "en-US": "Remove a referral binding with a reason hash after review.",
          "zh-CN": "审核后通过 reason hash 移除邀请绑定。",
          "zh-TW": "Remove a referral binding with a reason hash after review.",
        },
        ownerRole: "contract_reviewer",
        phase: "P1",
        readiness: "warning",
        nextAction: {
          "en-US": "Require manual review before removal is reflected in companion state.",
          "zh-CN": "移除写入 companion 状态前需要人工审核。",
          "zh-TW": "Require manual review before removal is reflected in companion state.",
        },
      }),
      createContractMethod({
        name: "GetReferral",
        signature: "GetReferral(GetReferralInput input) returns (ReferralInfo)",
        purpose: {
          "en-US": "Read referral binding and qualification context for audit review.",
          "zh-CN": "读取邀请绑定与资格上下文用于审计复核。",
          "zh-TW": "Read referral binding and qualification context for audit review.",
        },
        ownerRole: "internal_operator",
        phase: "P1",
        readiness: "warning",
        nextAction: {
          "en-US": "Treat as future read-only referral review view.",
          "zh-CN": "作为未来只读邀请审核视图。",
          "zh-TW": "Treat as future read-only referral review view.",
        },
      }),
    ],
  },
  {
    contractName: "EligibilityRootRegistryV2",
    phase: "P1",
    readiness: "warning",
    purpose: {
      "en-US": "Stores eligibility or winners roots for list-integrity review without distributing rewards.",
      "zh-CN": "存储资格或 winners root，用于名单完整性审核，不执行发奖。",
      "zh-TW": "Stores eligibility or winners roots for list-integrity review without distributing rewards.",
    },
    ownerRole: "contract_reviewer",
    boundary: {
      "en-US": "Eligibility roots prove exported-list integrity only; reward custody and distribution remain outside Campaign OS.",
      "zh-CN": "资格 root 仅证明导出名单完整性；奖励托管与发放不属于 Campaign OS。",
      "zh-TW": "Eligibility roots prove exported-list integrity only; reward custody and distribution remain outside Campaign OS.",
    },
    nextAction: {
      "en-US": "Define root format, proof inputs, and manual review policy before P1.",
      "zh-CN": "P1 前定义 root 格式、proof 输入与人工审核策略。",
      "zh-TW": "Define root format, proof inputs, and manual review policy before P1.",
    },
    methods: [
      createContractMethod({
        name: "SetEligibilityRoot",
        signature: "SetEligibilityRoot(SetEligibilityRootInput input)",
        purpose: {
          "en-US": "Set an eligibility or winners root after export review.",
          "zh-CN": "在导出审核后设置资格或 winners root。",
          "zh-TW": "Set an eligibility or winners root after export review.",
        },
        ownerRole: "internal_operator",
        phase: "P1",
        readiness: "warning",
        boundary: noRewardCustodyBoundary,
        nextAction: {
          "en-US": "Require export approval and root reproducibility before setting.",
          "zh-CN": "设置前需要导出批准与 root 可复现性。",
          "zh-TW": "Require export approval and root reproducibility before setting.",
        },
      }),
      createContractMethod({
        name: "UpdateEligibilityRoot",
        signature: "UpdateEligibilityRoot(UpdateEligibilityRootInput input)",
        purpose: {
          "en-US": "Update an eligibility root when review finds corrections.",
          "zh-CN": "审核发现修正时更新资格 root。",
          "zh-TW": "Update an eligibility root when review finds corrections.",
        },
        ownerRole: "contract_reviewer",
        phase: "P1",
        readiness: "warning",
        boundary: noRewardCustodyBoundary,
        nextAction: {
          "en-US": "Require explicit correction reason and reviewer approval.",
          "zh-CN": "需要明确修正原因与审核人批准。",
          "zh-TW": "Require explicit correction reason and reviewer approval.",
        },
      }),
      createContractMethod({
        name: "GetEligibilityRoot",
        signature: "GetEligibilityRoot(CampaignId input) returns (EligibilityRootInfo)",
        purpose: {
          "en-US": "Read the eligibility root for audit and export reconciliation.",
          "zh-CN": "读取资格 root 用于审计与导出对账。",
          "zh-TW": "Read the eligibility root for audit and export reconciliation.",
        },
        ownerRole: "internal_operator",
        phase: "P1",
        readiness: "warning",
        boundary: noRewardCustodyBoundary,
        nextAction: {
          "en-US": "Keep as future read-only proof review view.",
          "zh-CN": "作为未来只读 proof 审核视图。",
          "zh-TW": "Keep as future read-only proof review view.",
        },
      }),
      createContractMethod({
        name: "VerifyEligibilityProof",
        signature: "VerifyEligibilityProof(VerifyEligibilityProofInput input) returns (BoolValue)",
        purpose: {
          "en-US": "Verify an eligibility proof against the stored root without running reward distribution.",
          "zh-CN": "根据已存 root 验证资格 proof，但不执行发奖。",
          "zh-TW": "Verify an eligibility proof against the stored root without running reward distribution.",
        },
        ownerRole: "internal_operator",
        phase: "P1",
        readiness: "warning",
        boundary: noRewardCustodyBoundary,
        nextAction: {
          "en-US": "Review privacy and proof UX before exposing to users.",
          "zh-CN": "对用户开放前先审核隐私与 proof 体验。",
          "zh-TW": "Review privacy and proof UX before exposing to users.",
        },
      }),
    ],
  },
];

const createContractChangeMatrix = (): ContractChangeMatrixRow[] => [
  {
    area: {
      "en-US": "Campaign config",
      "zh-CN": "活动配置",
      "zh-TW": "Campaign config",
    },
    currentMvp: {
      "en-US": "Off-chain DB",
      "zh-CN": "链下 DB",
      "zh-TW": "Off-chain DB",
    },
    recommendedV2: {
      "en-US": "CampaignRegistryV2",
      "zh-CN": "CampaignRegistryV2",
      "zh-TW": "CampaignRegistryV2",
    },
    priority: "P1",
    ownerRole: "contract_reviewer",
    readiness: "warning",
    notes: {
      "en-US": "Store owner, status, wallet policy, and metadata hash for auditability.",
      "zh-CN": "存储 owner、状态、钱包策略与 metadata hash 用于审计。",
      "zh-TW": "Store owner, status, wallet policy, and metadata hash for auditability.",
    },
    nextAction: {
      "en-US": "Keep MVP off-chain; prepare registry schema and owner permissions for P1.",
      "zh-CN": "MVP 保持链下；为 P1 准备 registry schema 与 owner 权限。",
      "zh-TW": "Keep MVP off-chain; prepare registry schema and owner permissions for P1.",
    },
    boundary: {
      "en-US": "Only hash/registry metadata is planned on-chain; campaign copy stays off-chain.",
      "zh-CN": "仅规划 hash/registry metadata 上链；活动文案保持链下。",
      "zh-TW": "Only hash/registry metadata is planned on-chain; campaign copy stays off-chain.",
    },
  },
  {
    area: {
      "en-US": "Task config",
      "zh-CN": "任务配置",
      "zh-TW": "Task config",
    },
    currentMvp: {
      "en-US": "Off-chain DB",
      "zh-CN": "链下 DB",
      "zh-TW": "Off-chain DB",
    },
    recommendedV2: {
      "en-US": "Task config hash on CampaignRegistryV2",
      "zh-CN": "CampaignRegistryV2 上的 task config hash",
      "zh-TW": "Task config hash on CampaignRegistryV2",
    },
    priority: "P1",
    ownerRole: "contract_reviewer",
    readiness: "warning",
    notes: {
      "en-US": "Full task text remains off-chain while the hash can prove rule integrity.",
      "zh-CN": "完整任务文本保持链下，hash 可证明规则完整性。",
      "zh-TW": "Full task text remains off-chain while the hash can prove rule integrity.",
    },
    nextAction: {
      "en-US": "Define canonical task-config hashing before contract work.",
      "zh-CN": "合约工作前定义任务配置 canonical hash。",
      "zh-TW": "Define canonical task-config hashing before contract work.",
    },
    boundary: {
      "en-US": "Task body, social copy, and verifier evidence stay off-chain.",
      "zh-CN": "任务正文、社交文案与 verifier evidence 保持链下。",
      "zh-TW": "Task body, social copy, and verifier evidence stay off-chain.",
    },
  },
  {
    area: {
      "en-US": "Points ledger",
      "zh-CN": "积分账本",
      "zh-TW": "Points ledger",
    },
    currentMvp: {
      "en-US": "Pixiepoints/backend ledger",
      "zh-CN": "Pixiepoints/backend ledger",
      "zh-TW": "Pixiepoints/backend ledger",
    },
    recommendedV2: {
      "en-US": "Commit points batch root",
      "zh-CN": "提交 points batch root",
      "zh-TW": "Commit points batch root",
    },
    priority: "P1",
    ownerRole: "internal_operator",
    readiness: "warning",
    notes: {
      "en-US": "Single-write points are optional only and require separate throughput and dispute review.",
      "zh-CN": "单条积分写链只是可选项，需要单独评估吞吐与争议处理。",
      "zh-TW": "Single-write points are optional only and require separate throughput and dispute review.",
    },
    nextAction: {
      "en-US": "Use batch-root transparency first; do not add live points writes in MVP.",
      "zh-CN": "先使用 batch-root 透明度；MVP 不增加实时积分写链。",
      "zh-TW": "Use batch-root transparency first; do not add live points writes in MVP.",
    },
    boundary: {
      "en-US": "Points calculation and task evidence remain off-chain; only a future root is planned.",
      "zh-CN": "积分计算与任务证据保持链下；仅规划未来 root。",
      "zh-TW": "Points calculation and task evidence remain off-chain; only a future root is planned.",
    },
  },
  {
    area: {
      "en-US": "Referral",
      "zh-CN": "邀请",
      "zh-TW": "Referral",
    },
    currentMvp: {
      "en-US": "Backend referral table",
      "zh-CN": "Backend referral table",
      "zh-TW": "Backend referral table",
    },
    recommendedV2: {
      "en-US": "ReferralRegistryV2",
      "zh-CN": "ReferralRegistryV2",
      "zh-TW": "ReferralRegistryV2",
    },
    priority: "P1",
    ownerRole: "contract_reviewer",
    readiness: "warning",
    notes: {
      "en-US": "Prevents self or duplicate referral on-chain while qualification evidence stays private.",
      "zh-CN": "链上防止自邀请或重复邀请，资格证据保持私有。",
      "zh-TW": "Prevents self or duplicate referral on-chain while qualification evidence stays private.",
    },
    nextAction: {
      "en-US": "Review duplicate, self, and circular referral rules.",
      "zh-CN": "审核重复、自邀请与循环邀请规则。",
      "zh-TW": "Review duplicate, self, and circular referral rules.",
    },
    boundary: {
      "en-US": "Anti-farm evidence and social account details stay off-chain.",
      "zh-CN": "反刷证据与社交账号明细保持链下。",
      "zh-TW": "Anti-farm evidence and social account details stay off-chain.",
    },
  },
  {
    area: {
      "en-US": "Eligibility/winners",
      "zh-CN": "资格/winners",
      "zh-TW": "Eligibility/winners",
    },
    currentMvp: {
      "en-US": "CSV export",
      "zh-CN": "CSV 导出",
      "zh-TW": "CSV export",
    },
    recommendedV2: {
      "en-US": "EligibilityRootRegistryV2",
      "zh-CN": "EligibilityRootRegistryV2",
      "zh-TW": "EligibilityRootRegistryV2",
    },
    priority: "P1",
    ownerRole: "contract_reviewer",
    readiness: "warning",
    notes: {
      "en-US": "Root proves exported-list integrity without distributing rewards.",
      "zh-CN": "Root 证明导出名单完整性，但不发奖。",
      "zh-TW": "Root proves exported-list integrity without distributing rewards.",
    },
    nextAction: {
      "en-US": "Define eligibility root format and review workflow before P1.",
      "zh-CN": "P1 前定义资格 root 格式与审核流程。",
      "zh-TW": "Define eligibility root format and review workflow before P1.",
    },
    boundary: noRewardCustodyBoundary,
  },
  {
    area: {
      "en-US": "Rewards",
      "zh-CN": "奖励",
      "zh-TW": "Rewards",
    },
    currentMvp: {
      "en-US": "Project handles off-chain",
      "zh-CN": "项目方链下处理",
      "zh-TW": "Project handles off-chain",
    },
    recommendedV2: {
      "en-US": "Contract claim only after separate approval",
      "zh-CN": "单独批准后才考虑合约领取",
      "zh-TW": "Contract claim only after separate approval",
    },
    priority: "P2",
    ownerRole: "contract_reviewer",
    readiness: "blocker",
    notes: {
      "en-US": "Not MVP. Claim mode needs separate security, custody, legal, and audit approval.",
      "zh-CN": "不是 MVP。Claim mode 需要单独的安全、托管、法律与审计批准。",
      "zh-TW": "Not MVP. Claim mode needs separate security, custody, legal, and audit approval.",
    },
    nextAction: {
      "en-US": "Keep reward custody outside Campaign OS and block claim-mode execution.",
      "zh-CN": "奖励托管保持在 Campaign OS 外部，并阻断 claim-mode 执行。",
      "zh-TW": "Keep reward custody outside Campaign OS and block claim-mode execution.",
    },
    boundary: noRewardCustodyBoundary,
  },
  {
    area: {
      "en-US": "Multilingual content",
      "zh-CN": "多语言内容",
      "zh-TW": "Multilingual content",
    },
    currentMvp: {
      "en-US": "DB/i18n service",
      "zh-CN": "DB/i18n 服务",
      "zh-TW": "DB/i18n service",
    },
    recommendedV2: {
      "en-US": "metadataUri + metadataHash",
      "zh-CN": "metadataUri + metadataHash",
      "zh-TW": "metadataUri + metadataHash",
    },
    priority: "P1",
    ownerRole: "project_owner",
    readiness: "warning",
    notes: {
      "en-US": "Do not store full text on-chain; hashes can support later review.",
      "zh-CN": "不要把全文上链；hash 可支持后续审核。",
      "zh-TW": "Do not store full text on-chain; hashes can support later review.",
    },
    nextAction: {
      "en-US": "Keep content review in en-US and zh-CN and hash reviewed artifacts only.",
      "zh-CN": "内容审核保持 en-US 与 zh-CN，仅 hash 已审核产物。",
      "zh-TW": "Keep content review in en-US and zh-CN and hash reviewed artifacts only.",
    },
    boundary: {
      "en-US": "Full translated copy stays off-chain; no additional runtime locale is introduced.",
      "zh-CN": "完整翻译文案保持链下；不引入额外运行时语言。",
      "zh-TW": "Full translated copy stays off-chain; no additional runtime locale is introduced.",
    },
  },
  {
    area: {
      "en-US": "Wallet type",
      "zh-CN": "钱包类型",
      "zh-TW": "Wallet type",
    },
    currentMvp: {
      "en-US": "Session metadata",
      "zh-CN": "Session metadata",
      "zh-TW": "Session metadata",
    },
    recommendedV2: {
      "en-US": "WalletPolicy enum only",
      "zh-CN": "仅 WalletPolicy enum",
      "zh-TW": "WalletPolicy enum only",
    },
    priority: "P1",
    ownerRole: "contract_reviewer",
    readiness: "warning",
    notes: {
      "en-US": "AA/EOA verification remains off-chain while policy can be auditable.",
      "zh-CN": "AA/EOA 验证保持链下，策略可审计。",
      "zh-TW": "AA/EOA verification remains off-chain while policy can be auditable.",
    },
    nextAction: {
      "en-US": "Store policy only; keep wallet proof and session data in local/backend review.",
      "zh-CN": "仅存储策略；钱包 proof 与 session 数据保留在本地/backend 审核。",
      "zh-TW": "Store policy only; keep wallet proof and session data in local/backend review.",
    },
    boundary: {
      "en-US": "Wallet SDK connection, signature checks, and session metadata stay off-chain.",
      "zh-CN": "钱包 SDK 连接、签名检查与 session metadata 保持链下。",
      "zh-TW": "Wallet SDK connection, signature checks, and session metadata stay off-chain.",
    },
  },
  {
    area: {
      "en-US": "Risk flags",
      "zh-CN": "风险标记",
      "zh-TW": "Risk flags",
    },
    currentMvp: {
      "en-US": "Backend risk service",
      "zh-CN": "Backend risk service",
      "zh-TW": "Backend risk service",
    },
    recommendedV2: {
      "en-US": "Do not store full risk details",
      "zh-CN": "不存储完整风险细节",
      "zh-TW": "Do not store full risk details",
    },
    priority: "N/A",
    ownerRole: "internal_operator",
    readiness: "info",
    notes: {
      "en-US": "Avoid leaking anti-sybil strategy; use risk output as review input only.",
      "zh-CN": "避免泄露反女巫策略；风险输出仅作为审核输入。",
      "zh-TW": "Avoid leaking anti-sybil strategy; use risk output as review input only.",
    },
    nextAction: {
      "en-US": "Keep full risk detail off-chain and expose only reviewed outcomes.",
      "zh-CN": "完整风险明细保持链下，仅展示已审核结果。",
      "zh-TW": "Keep full risk detail off-chain and expose only reviewed outcomes.",
    },
    boundary: {
      "en-US": "Risk detail stays off-chain to protect anti-sybil strategy.",
      "zh-CN": "风险明细保持链下，以保护反女巫策略。",
      "zh-TW": "Risk detail stays off-chain to protect anti-sybil strategy.",
    },
  },
];

export const createContractInterfaceMatrixConsole = (): ContractInterfaceMatrixConsole => {
  const groups = createContractInterfaceGroups();
  const changeMatrix = createContractChangeMatrix();
  const methods = groups.flatMap((group) => group.methods);

  return {
    summary: {
      totalContracts: groups.length,
      totalMethods: methods.length,
      p1Rows: changeMatrix.filter((row) => row.priority === "P1").length,
      blockedRows: changeMatrix.filter((row) => row.readiness === "blocker").length,
      warningMethods: methods.filter((method) => method.readiness === "warning").length,
      boundary: contractInterfaceBoundary,
    },
    groups,
    changeMatrix,
  };
};

const contractTransparencyBoundary: LocalizedText = localized(
  "Seeded/local contract transparency monitor only. No live contract transaction, root generation, reward custody, or reward distribution is executed.",
  "仅 seeded/本地合约透明度监控。不会执行真实合约交易、生成 root、托管奖励或发奖。",
  "僅 seeded/本地合約透明度監控。不會執行真實合約交易、生成 root、託管獎勵或發獎。",
);

const contractTransparencySource = (
  enUS: string,
  zhCN: string,
  zhTW = enUS,
): LocalizedText => localized(enUS, zhCN, zhTW);

const contractTransparencyReadinessPriority: Record<ContractTransparencyReadiness, number> = {
  blocked: 0,
  review_required: 1,
  local_only: 2,
  ready: 3,
};

const contractTransparencyLaneLabels: Record<ContractTransparencyLaneId, LocalizedText> = {
  "off-chain-mvp": localized("Off-chain MVP", "链下 MVP", "鏈下 MVP"),
  "export-root-readiness": localized("Export root readiness", "导出 root readiness", "匯出 root readiness"),
  "points-batch-root": localized("Points batch root", "积分批次 root", "積分批次 root"),
  "referral-binding-root": localized("Referral binding root", "邀请绑定 root", "邀請綁定 root"),
  "eligibility-root": localized("Eligibility root", "资格 root", "資格 root"),
  "verifier-role": localized("Verifier role", "Verifier role", "Verifier role"),
  "reward-custody-claim": localized("Reward custody / claim", "奖励托管 / claim", "獎勵託管 / claim"),
};

const contractTransparencyLane = ({
  blocksExecution = false,
  boundary = contractTransparencyBoundary,
  id,
  nextAction,
  ownerRole,
  phase,
  readiness,
  sourceEvidence,
  sourceSurface,
}: Omit<ContractTransparencyLane, "blocksExecution" | "label"> & {
  blocksExecution?: boolean;
}): ContractTransparencyLane => ({
  id,
  label: contractTransparencyLaneLabels[id],
  phase,
  readiness,
  ownerRole,
  sourceEvidence,
  sourceSurface,
  boundary,
  nextAction,
  blocksExecution,
});

const contractTransparencySummary = (
  lanes: readonly ContractTransparencyLane[],
): ContractTransparencyMonitor["summary"] => {
  const topLane = [...lanes].sort((left, right) => {
    const priorityDelta = contractTransparencyReadinessPriority[left.readiness] -
      contractTransparencyReadinessPriority[right.readiness];

    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return lanes.findIndex((lane) => lane.id === left.id) - lanes.findIndex((lane) => lane.id === right.id);
  })[0] ?? lanes[0];

  return {
    totalLanes: lanes.length,
    readyLanes: lanes.filter((lane) => lane.readiness === "ready").length,
    reviewRequiredLanes: lanes.filter((lane) => lane.readiness === "review_required").length,
    blockedLanes: lanes.filter((lane) => lane.readiness === "blocked").length,
    localOnlyLanes: lanes.filter((lane) => lane.readiness === "local_only").length,
    topLaneId: topLane.id,
    topNextAction: topLane.nextAction,
  };
};

const contractTransparencyCloseoutContext = (
  closeout: PostCampaignCloseout,
): ContractTransparencyCloseoutContext => {
  const topGate = closeout.gates.find((gate) => gate.id === closeout.summary.topGateId);

  return {
    status: closeout.status,
    topGateId: closeout.summary.topGateId,
    topAction: closeout.summary.topAction,
    evidence: topGate?.evidence ?? closeout.boundary,
  };
};

const findContractGroup = (
  matrix: ContractInterfaceMatrixConsole,
  contractName: string,
): ContractInterfaceGroup | undefined => matrix.groups.find((group) => group.contractName === contractName);

const findContractMethod = (
  group: ContractInterfaceGroup | undefined,
  methodName: string,
): ContractInterfaceMethod | undefined => group?.methods.find((method) => method.name === methodName);

export const createContractTransparencyMonitor = (
  campaign: CampaignShellDetail,
): ContractTransparencyMonitor => {
  const exportReadiness = createExportConfirmationReadinessGate(campaign);
  const closeout = createPostCampaignCloseout(campaign);
  const matrix = createContractInterfaceMatrixConsole();
  const registry = findContractGroup(matrix, "CampaignRegistryV2");
  const pointsLedger = findContractGroup(matrix, "CampaignPointsLedgerV2");
  const referralRegistry = findContractGroup(matrix, "ReferralRegistryV2");
  const eligibilityRegistry = findContractGroup(matrix, "EligibilityRootRegistryV2");
  const pointsRoot = findContractMethod(pointsLedger, "CommitPointsBatch");
  const referralBinding = findContractMethod(referralRegistry, "BindReferral");
  const eligibilityRoot = findContractMethod(eligibilityRegistry, "SetEligibilityRoot");
  const verifierMethod = findContractMethod(eligibilityRegistry, "VerifyEligibilityProof");
  const noRootMode = exportReadiness.contractRootReadiness.find((item) => item.mode === "none");
  const eligibilityRootMode = exportReadiness.contractRootReadiness.find(
    (item) => item.mode === "eligibility_root",
  );
  const contractClaimMode = exportReadiness.contractRootReadiness.find(
    (item) => item.mode === "contract_claim",
  );
  const lanes: ContractTransparencyLane[] = [
    contractTransparencyLane({
      id: "off-chain-mvp",
      phase: "MVP",
      readiness: "ready",
      ownerRole: "project_owner",
      sourceEvidence: localized(
        `${campaign.contractMode.replace(/_/g, " ")} keeps campaign execution off-chain with ${exportReadiness.summary.totalRows} seeded export rows.`,
        `${campaign.contractMode.replace(/_/g, " ")} 保持活动执行链下，并提供 ${exportReadiness.summary.totalRows} 条 seeded 导出行。`,
        `${campaign.contractMode.replace(/_/g, " ")} 保持活動執行鏈下，並提供 ${exportReadiness.summary.totalRows} 條 seeded 匯出行。`,
      ),
      sourceSurface: contractTransparencySource(
        "Admin Contract Review Center",
        "管理员合约审核中心",
        "管理員合約審核中心",
      ),
      boundary: localized(
        "MVP remains off-chain; Campaign OS does not submit contract transactions, generate roots, custody rewards, or distribute rewards.",
        "MVP 保持链下；Campaign OS 不提交合约交易、不生成 root、不托管奖励、不发奖。",
        "MVP 保持鏈下；Campaign OS 不提交合約交易、不生成 root、不託管獎勵、不發獎。",
      ),
      nextAction: localized(
        "Keep current campaign operations off-chain while reviewing P1 companion-contract evidence.",
        "当前活动操作保持链下，同时审核 P1 companion-contract 证据。",
        "目前活動操作保持鏈下，同時審核 P1 companion-contract 證據。",
      ),
    }),
    contractTransparencyLane({
      id: "export-root-readiness",
      phase: "MVP",
      readiness: exportReadiness.summary.blockedRows > 0 ? "blocked" : "ready",
      ownerRole: "internal_operator",
      sourceEvidence: localized(
        `${exportReadiness.batchId}: ${exportReadiness.summary.readyRows} ready / ${exportReadiness.summary.reviewRequiredRows} review / ${exportReadiness.summary.blockedRows} blocked rows; safe default is ${noRootMode?.label["en-US"] ?? "No contract root"}.`,
        `${exportReadiness.batchId}：${exportReadiness.summary.readyRows} 个就绪 / ${exportReadiness.summary.reviewRequiredRows} 个需审核 / ${exportReadiness.summary.blockedRows} 个阻断行；安全默认是 ${noRootMode?.label["zh-CN"] ?? "无合约 root"}。`,
        `${exportReadiness.batchId}：${exportReadiness.summary.readyRows} 個就緒 / ${exportReadiness.summary.reviewRequiredRows} 個需審核 / ${exportReadiness.summary.blockedRows} 個阻斷行；安全預設是 ${noRootMode?.label["zh-TW"] ?? "No contract root"}。`,
      ),
      sourceSurface: contractTransparencySource(
        "Export confirmation readiness",
        "导出确认 readiness",
        "匯出確認 readiness",
      ),
      boundary: exportReadiness.boundary,
      nextAction: exportReadiness.nextAction,
      blocksExecution: exportReadiness.summary.blockedRows > 0,
    }),
    contractTransparencyLane({
      id: "points-batch-root",
      phase: "P1",
      readiness: "review_required",
      ownerRole: pointsRoot?.ownerRole ?? "internal_operator",
      sourceEvidence: pointsRoot?.purpose ?? localized(
        "Points batch root is planned through CampaignPointsLedgerV2.",
        "积分批次 root 通过 CampaignPointsLedgerV2 规划。",
        "積分批次 root 透過 CampaignPointsLedgerV2 規劃。",
      ),
      sourceSurface: contractTransparencySource(
        "Contract Interface Matrix Console: CampaignPointsLedgerV2.CommitPointsBatch",
        "合约接口矩阵控制台：CampaignPointsLedgerV2.CommitPointsBatch",
        "合約接口矩陣控制台：CampaignPointsLedgerV2.CommitPointsBatch",
      ),
      boundary: pointsRoot?.boundary ?? contractTransparencyBoundary,
      nextAction: pointsRoot?.nextAction ?? localized(
        "Define batch cadence, root format, and rollback semantics.",
        "定义批次周期、root 格式与回滚语义。",
        "定義批次週期、root 格式與回滾語義。",
      ),
    }),
    contractTransparencyLane({
      id: "referral-binding-root",
      phase: "P1",
      readiness: "review_required",
      ownerRole: referralBinding?.ownerRole ?? "internal_operator",
      sourceEvidence: referralBinding?.purpose ?? localized(
        "Referral binding root is planned through ReferralRegistryV2.",
        "邀请绑定 root 通过 ReferralRegistryV2 规划。",
        "邀請綁定 root 透過 ReferralRegistryV2 規劃。",
      ),
      sourceSurface: contractTransparencySource(
        "Contract Interface Matrix Console: ReferralRegistryV2.BindReferral",
        "合约接口矩阵控制台：ReferralRegistryV2.BindReferral",
        "合約接口矩陣控制台：ReferralRegistryV2.BindReferral",
      ),
      boundary: referralBinding?.boundary ?? referralRegistry?.boundary ?? contractTransparencyBoundary,
      nextAction: referralBinding?.nextAction ?? referralRegistry?.nextAction ?? localized(
        "Review duplicate, self, and circular referral rules.",
        "审核重复、自邀请与循环邀请规则。",
        "審核重複、自邀請與循環邀請規則。",
      ),
    }),
    contractTransparencyLane({
      id: "eligibility-root",
      phase: "P1",
      readiness: eligibilityRootMode?.readiness === "blocked" ? "blocked" : "review_required",
      ownerRole: eligibilityRoot?.ownerRole ?? "contract_reviewer",
      sourceEvidence: localized(
        `${eligibilityRoot?.purpose["en-US"] ?? "Eligibility root is planned"}; export root mode is ${eligibilityRootMode?.readiness ?? "review_required"}.`,
        `${eligibilityRoot?.purpose["zh-CN"] ?? "资格 root 已规划"}；导出 root 模式为 ${eligibilityRootMode?.readiness ?? "review_required"}。`,
        `${eligibilityRoot?.purpose["zh-TW"] ?? "資格 root 已規劃"}；匯出 root 模式為 ${eligibilityRootMode?.readiness ?? "review_required"}。`,
      ),
      sourceSurface: contractTransparencySource(
        "Export confirmation readiness + EligibilityRootRegistryV2.SetEligibilityRoot",
        "导出确认 readiness + EligibilityRootRegistryV2.SetEligibilityRoot",
        "匯出確認 readiness + EligibilityRootRegistryV2.SetEligibilityRoot",
      ),
      boundary: eligibilityRoot?.boundary ?? eligibilityRootMode?.boundary ?? noRewardCustodyBoundary,
      nextAction: eligibilityRoot?.nextAction ?? eligibilityRootMode?.nextAction ?? exportReadiness.nextAction,
      blocksExecution: eligibilityRootMode?.readiness === "blocked",
    }),
    contractTransparencyLane({
      id: "verifier-role",
      phase: "P1",
      readiness: "local_only",
      ownerRole: verifierMethod?.ownerRole ?? "internal_operator",
      sourceEvidence: verifierMethod?.purpose ?? localized(
        "Verifier role is local/backend review only before any proof surface is exposed.",
        "任何 proof 界面开放前，verifier role 仅用于本地/backend 审核。",
        "任何 proof 介面開放前，verifier role 僅用於本地/backend 審核。",
      ),
      sourceSurface: contractTransparencySource(
        "Contract Interface Matrix Console: EligibilityRootRegistryV2.VerifyEligibilityProof",
        "合约接口矩阵控制台：EligibilityRootRegistryV2.VerifyEligibilityProof",
        "合約接口矩陣控制台：EligibilityRootRegistryV2.VerifyEligibilityProof",
      ),
      boundary: localized(
        "Verifier is a read/review boundary only; Campaign OS does not grant live contract write authority from this monitor.",
        "Verifier 仅是读取/审核边界；Campaign OS 不会通过此 monitor 授予真实合约写权限。",
        "Verifier 僅是讀取/審核邊界；Campaign OS 不會透過此 monitor 授予真實合約寫權限。",
      ),
      nextAction: verifierMethod?.nextAction ?? localized(
        "Review privacy and proof UX before exposing verifier evidence to users.",
        "向用户展示 verifier evidence 前先审核隐私与 proof 体验。",
        "向使用者展示 verifier evidence 前先審核隱私與 proof 體驗。",
      ),
    }),
    contractTransparencyLane({
      id: "reward-custody-claim",
      phase: "P2",
      readiness: "blocked",
      ownerRole: "contract_reviewer",
      sourceEvidence: localized(
        `Contract claim remains ${contractClaimMode?.readiness ?? "blocked"} and closeout status is ${closeout.status}; reward fulfillment stays project-owned.`,
        `合约 claim 仍为 ${contractClaimMode?.readiness ?? "blocked"}，closeout 状态为 ${closeout.status}；奖励履约仍由项目方负责。`,
        `合約 claim 仍為 ${contractClaimMode?.readiness ?? "blocked"}，closeout 狀態為 ${closeout.status}；獎勵履約仍由專案方負責。`,
      ),
      sourceSurface: contractTransparencySource(
        "Export confirmation readiness + Post-campaign closeout",
        "导出确认 readiness + 活动后 closeout",
        "匯出確認 readiness + 活動後 closeout",
      ),
      boundary: localized(
        "Reward custody and contract claim execution are blocked. Campaign OS does not custody rewards, distribute rewards, or enable claim-mode execution.",
        "奖励托管与合约 claim 执行已阻断。Campaign OS 不托管奖励、不发奖，也不启用 claim-mode 执行。",
        "獎勵託管與合約 claim 執行已阻斷。Campaign OS 不託管獎勵、不發獎，也不啟用 claim-mode 執行。",
      ),
      nextAction: contractClaimMode?.nextAction ?? localized(
        "Keep claim mode blocked until security, custody, legal, audit, and contract approvals exist.",
        "在安全、托管、法律、审计与合约批准前继续阻断 claim mode。",
        "在安全、託管、法律、審計與合約批准前繼續阻斷 claim mode。",
      ),
      blocksExecution: true,
    }),
  ];
  const summary = contractTransparencySummary(lanes);
  const closeoutContext = contractTransparencyCloseoutContext(closeout);

  return {
    campaignId: campaign.id,
    summary,
    lanes,
    closeoutContext,
    boundary: contractTransparencyBoundary,
    nextAction: summary.topNextAction,
  };
};

const p1LocaleExpansionRegistry: Array<{
  code: P1LocaleCode;
  displayName: LocalizedText;
  marketSignal: LocalizedText;
}> = [
  {
    code: "ko-KR",
    displayName: localized("Korean", "韩语", "韓語"),
    marketSignal: localized("Korea growth campaign coverage", "韩国增长活动覆盖", "韓國增長活動覆蓋"),
  },
  {
    code: "ja-JP",
    displayName: localized("Japanese", "日语", "日語"),
    marketSignal: localized("Japan ecosystem partner readiness", "日本生态合作方 readiness", "日本生態合作方 readiness"),
  },
  {
    code: "vi-VN",
    displayName: localized("Vietnamese", "越南语", "越南語"),
    marketSignal: localized("Vietnam community campaign coverage", "越南社区活动覆盖", "越南社群活動覆蓋"),
  },
  {
    code: "id-ID",
    displayName: localized("Indonesian", "印尼语", "印尼語"),
    marketSignal: localized("Indonesia community campaign coverage", "印尼社区活动覆盖", "印尼社群活動覆蓋"),
  },
  {
    code: "tr-TR",
    displayName: localized("Turkish", "土耳其语", "土耳其語"),
    marketSignal: localized("Turkey community campaign coverage", "土耳其社区活动覆盖", "土耳其社群活動覆蓋"),
  },
  {
    code: "es-ES",
    displayName: localized("Spanish", "西班牙语", "西班牙語"),
    marketSignal: localized("Spanish-language campaign coverage", "西语活动覆盖", "西語活動覆蓋"),
  },
];

const p1LocalePrerequisites = (code: P1LocaleCode): LocalizedText[] => [
  localized(
    `Create reviewed campaign content source for ${code}.`,
    `为 ${code} 创建已审核活动内容源。`,
    `為 ${code} 建立已審核活動內容源。`,
  ),
  localized(
    `Complete human translation and reward disclaimer review for ${code}.`,
    `完成 ${code} 的人工翻译与奖励免责声明审核。`,
    `完成 ${code} 的人工翻譯與獎勵免責聲明審核。`,
  ),
  localized(
    `Run locale QA and fallback checks before enabling ${code}.`,
    `启用 ${code} 前完成语言 QA 与 fallback 检查。`,
    `啟用 ${code} 前完成語言 QA 與 fallback 檢查。`,
  ),
  localized(
    `Approve runtime selector, URL, analytics, and publish-gate expansion for ${code}.`,
    `批准 ${code} 的运行时选择器、URL、analytics 与发布门禁扩展。`,
    `批准 ${code} 的執行時選擇器、URL、analytics 與發布門禁擴展。`,
  ),
];

const p1LocaleExpansionBoundary = localized(
  "P1 locale rows are backlog planning only. Runtime support remains limited to en-US, zh-CN, and zh-TW.",
  "P1 语言行仅用于 backlog 规划。运行时支持仍限定为 en-US、zh-CN 与 zh-TW。",
  "P1 語言行僅用於 backlog 規劃。執行時支援仍限定為 en-US、zh-CN 與 zh-TW。",
);

const createP1LocaleExpansionReadiness = (): P1LocaleExpansionReadiness => {
  const rows: P1LocaleExpansionReadinessRow[] = p1LocaleExpansionRegistry.map((locale) => ({
    code: locale.code,
    displayName: locale.displayName,
    nextAction: localized(
      `Open a dedicated ${locale.code} activation mission after content, QA, and runtime expansion gates are approved.`,
      `内容、QA 与运行时扩展门禁批准后，单独开启 ${locale.code} 激活 mission。`,
      `內容、QA 與執行時擴展門禁批准後，單獨開啟 ${locale.code} 啟用 mission。`,
    ),
    ownerRole: "project_owner",
    prerequisites: p1LocalePrerequisites(locale.code),
    reason: localized(
      `${locale.code} is a documented P1 locale for ${locale.marketSignal["en-US"]}, but translation, review, QA, routing, and publish gates are not active in this MVP runtime.`,
      `${locale.code} 是已记录的 P1 语言，用于${locale.marketSignal["zh-CN"]}；但翻译、审核、QA、路由与发布门禁尚未在当前 MVP runtime 启用。`,
      `${locale.code} 是已記錄的 P1 語言，用於${locale.marketSignal["zh-TW"]}；但翻譯、審核、QA、路由與發布門禁尚未在目前 MVP runtime 啟用。`,
    ),
    runtimeSupported: false,
    status: "deferred",
  }));

  return {
    rows,
    summary: {
      boundary: p1LocaleExpansionBoundary,
      deferredLocales: rows.filter((row) => row.status === "deferred").length,
      nextAction: localized(
        "Keep P1 locale expansion in backlog until a dedicated activation mission approves runtime, content, QA, analytics, and publish-gate changes.",
        "在专门激活 mission 批准运行时、内容、QA、analytics 与发布门禁变更前，P1 语言扩展继续保留在 backlog。",
        "在專門啟用 mission 批准執行時、內容、QA、analytics 與發布門禁變更前，P1 語言擴展繼續保留在 backlog。",
      ),
      runtimeSupportedLocales: rows.filter((row) => row.runtimeSupported).length,
      subtitle: localized("Backlog matrix", "Backlog 矩阵", "Backlog 矩陣"),
      title: localized("P1 locale expansion readiness", "P1 语言扩展 readiness", "P1 語言擴展 readiness"),
      totalLocales: rows.length,
    },
  };
};

const deliveryChecklistStatusCount = (
  items: DeliveryChecklistItem[],
  status: DeliveryChecklistStatus,
) => items.filter((item) => item.status === status).length;

const deliveryChecklistCounts = (items: DeliveryChecklistItem[]) => ({
  blocked: deliveryChecklistStatusCount(items, "blocked"),
  covered: deliveryChecklistStatusCount(items, "covered"),
  deferred: deliveryChecklistStatusCount(items, "deferred"),
  needsReview: deliveryChecklistStatusCount(items, "needs_review"),
});

const deliveryChecklistItem = ({
  blocksDelivery = false,
  evidence,
  groupId,
  id,
  label,
  nextAction,
  ownerRole = "internal_operator",
  sourceRequirement,
  status,
  surface,
}: {
  blocksDelivery?: boolean;
  evidence: LocalizedText;
  groupId: DeliveryChecklistGroupId;
  id: string;
  label: LocalizedText;
  nextAction: LocalizedText;
  ownerRole?: DeliveryChecklistItem["ownerRole"];
  sourceRequirement: string;
  status: DeliveryChecklistStatus;
  surface: LocalizedText;
}): DeliveryChecklistItem => ({
  blocksDelivery,
  evidence,
  groupId,
  id,
  label,
  nextAction,
  ownerRole,
  sourceRequirement,
  status,
  surface,
});

const deliveryChecklistGroup = ({
  id,
  items,
  sourceReference,
  summary,
  title,
}: {
  id: DeliveryChecklistGroupId;
  items: DeliveryChecklistItem[];
  sourceReference: string;
  summary: LocalizedText;
  title: LocalizedText;
}): DeliveryChecklistGroup => ({
  counts: deliveryChecklistCounts(items),
  id,
  items,
  sourceReference,
  summary,
  title,
});

const createProductDeliveryChecklistItems = (): DeliveryChecklistItem[] => {
  const groupId = "product" as const;

  return [
    deliveryChecklistItem({
      groupId,
      id: "product-aa-eoa-support",
      label: localized("AA + EOA wallet support", "AA + EOA 钱包支持"),
      status: "covered",
      ownerRole: "project_owner",
      surface: localized("Wallet modal, header badge, task eligibility", "钱包弹窗、Header badge、任务资格"),
      evidence: localized(
        "Wallet sessions normalize Portkey AA, Portkey EOA App, Portkey EOA Extension, NightElf, and agent/internal sources.",
        "钱包 session 已归一化 Portkey AA、Portkey EOA App、Portkey EOA Extension、NightElf 与 agent/internal 来源。",
      ),
      nextAction: localized(
        "Keep live provider QA separated from seeded readiness evidence.",
        "将真实 provider QA 与 seeded readiness 证据分开。",
      ),
      sourceRequirement: "Product checklist: AA and EOA support",
    }),
    deliveryChecklistItem({
      groupId,
      id: "product-portkey-aa-recommended",
      label: localized("Portkey AA recommended, not mandatory", "Portkey AA 是推荐路径而非强制要求"),
      status: "covered",
      ownerRole: "project_owner",
      surface: localized("Wallet Connect Modal", "钱包连接弹窗"),
      evidence: localized(
        "Recommended AA and existing-user EOA paths are rendered as separate wallet sections.",
        "推荐 AA 与已有用户 EOA 路径以独立钱包分区展示。",
      ),
      nextAction: localized("Retain Any wallet as the default campaign policy.", "继续将任意钱包作为默认活动策略。"),
      sourceRequirement: "Product checklist: Portkey AA recommended",
    }),
    deliveryChecklistItem({
      groupId,
      id: "product-wallet-flow-options",
      label: localized("EOA app, extension, and NightElf wallet flow", "EOA App、Extension 与 NightElf 钱包流程"),
      status: "covered",
      surface: localized("Wallet modal sections", "钱包弹窗分区"),
      evidence: localized(
        "Recommended, EOA, and Advanced/Agent sections include unsupported and wrong-chain states.",
        "Recommended、EOA、Advanced/Agent 分区包含 unsupported 与 wrong-chain 状态。",
      ),
      nextAction: localized("Use live wallet QA before production onboarding.", "生产 onboarding 前补真实钱包 QA。"),
      sourceRequirement: "Product checklist: EOA App / Extension / NightElf represented",
    }),
    deliveryChecklistItem({
      groupId,
      id: "product-default-language",
      label: localized("Default UI language is English", "默认 UI 语言为英文"),
      status: "covered",
      surface: localized("Global header and locale hook", "全局 Header 与 locale hook"),
      evidence: localized(
        "Default locale and fallback locale are en-US; language switching is manual.",
        "默认语言和回退语言均为 en-US；语言切换为手动操作。",
      ),
      nextAction: localized(
        "Keep browser language as a prompt only, not automatic override.",
        "浏览器语言只作为提示，不自动覆盖。",
      ),
      sourceRequirement: "Product checklist: default en-US",
    }),
    deliveryChecklistItem({
      groupId,
      id: "product-language-selector",
      label: localized("Language selector visible in global header", "语言选择器在全局 Header 可见"),
      status: "covered",
      surface: localized("App shell header", "App shell Header"),
      evidence: localized(
        "The global header exposes English, Simplified Chinese, and Traditional Chinese options.",
        "全局 Header 暴露 English、简体中文与繁體中文选项。",
      ),
      nextAction: localized(
        "Keep only the approved runtime locales until a separate expansion is approved.",
        "在单独批准扩展前仅保留已批准的运行时语言。",
      ),
      sourceRequirement: "Product checklist: language selector visible",
    }),
    deliveryChecklistItem({
      groupId,
      id: "product-campaign-builder-locales",
      label: localized("Campaign builder default and supported locales", "Campaign Builder 默认与支持语言"),
      status: "covered",
      ownerRole: "project_owner",
      surface: localized("Campaign Builder", "活动构建器"),
      evidence: localized(
        "Builder draft uses default/fallback en-US and supported en-US plus zh-CN.",
        "Builder 草稿使用默认/回退 en-US，并支持 en-US 与 zh-CN。",
      ),
      nextAction: localized(
        "Continue blocking publish when required locale review is incomplete.",
        "在必要语言审核未完成时继续阻断发布。",
      ),
      sourceRequirement: "Product checklist: builder locale fields",
    }),
    deliveryChecklistItem({
      groupId,
      id: "product-mvp-locale-coverage",
      label: localized("MVP locale coverage", "MVP 语言覆盖"),
      status: "covered",
      ownerRole: "project_owner",
      surface: localized("Locale governance", "语言治理"),
      evidence: localized(
        "Runtime support covers the v0.2 MVP locales: en-US, zh-CN, and zh-TW.",
        "运行时已覆盖 v0.2 MVP 语言：en-US、zh-CN 与 zh-TW。",
      ),
      nextAction: localized(
        "Keep P1 locales such as ko-KR, ja-JP, vi-VN, id-ID, tr-TR, and es-ES deferred to a separate expansion mission.",
        "将 ko-KR、ja-JP、vi-VN、id-ID、tr-TR、es-ES 等 P1 语言继续后置到单独扩展 mission。",
      ),
      sourceRequirement: "Product checklist: MVP locale coverage",
    }),
    deliveryChecklistItem({
      groupId,
      id: "product-task-wallet-compatibility",
      label: localized("Task builder wallet compatibility", "Task Builder 钱包兼容性"),
      status: "covered",
      ownerRole: "project_owner",
      surface: localized("Task Template Library", "任务模板库"),
      evidence: localized(
        "Task templates expose Any, AA-only, and EOA-only compatibility plus filters.",
        "任务模板暴露 Any、AA-only、EOA-only 兼容性与过滤器。",
      ),
      nextAction: localized("Keep template governance review for wallet coverage drift.", "继续用模板治理审核钱包覆盖漂移。"),
      sourceRequirement: "Product checklist: task builder wallet compatibility",
    }),
    deliveryChecklistItem({
      groupId,
      id: "product-reward-disclaimer-locales",
      label: localized("Reward disclaimer per locale", "每个语言的奖励免责声明"),
      status: "covered",
      ownerRole: "project_owner",
      surface: localized("Rewards & Eligibility, Translation Manager", "奖励与资格、翻译管理"),
      evidence: localized(
        "The localized reward disclaimer gate lists reviewed, AI draft, fallback, missing, blocker, and next-action state per locale.",
        "本地化奖励免责声明门禁按语言列出已审核、AI 草稿、回退、缺失、阻断与下一步状态。",
      ),
      nextAction: localized(
        "Keep project-owner review required for any locale row that is not reviewed.",
        "所有未审核语言行继续要求项目方审核。",
      ),
      sourceRequirement: "Product checklist: reward disclaimer per locale",
    }),
    deliveryChecklistItem({
      groupId,
      id: "product-contract-impact-review",
      label: localized("Contract impact review before publish", "发布前合约影响审核"),
      status: "covered",
      ownerRole: "contract_reviewer",
      surface: localized(
        "Contract Impact Review and Admin Contract Review Center",
        "合约影响审核与管理员合约审核中心",
      ),
      evidence: localized(
        "Off-chain MVP, V2 companion, and contract claim modes are visible with claim-mode blockers.",
        "Off-chain MVP、V2 companion 与 contract claim 模式可见，claim mode 有阻断。",
      ),
      nextAction: localized(
        "Keep claim mode blocked until contract reviewer approval.",
        "合约审核人批准前继续阻断 claim mode。",
      ),
      sourceRequirement: "Product checklist: contract impact review",
    }),
    deliveryChecklistItem({
      groupId,
      id: "product-future-locale-expansion",
      label: localized("Additional P1 locale expansion is deferred", "额外 P1 语言扩展已后置"),
      status: "deferred",
      ownerRole: "project_owner",
      surface: localized("Locale governance", "语言治理"),
      evidence: localized(
        "The v0.2 MVP locales are covered; P1 locales such as ko-KR, ja-JP, vi-VN, id-ID, tr-TR, and es-ES remain future scope.",
        "v0.2 MVP 语言已覆盖；ko-KR、ja-JP、vi-VN、id-ID、tr-TR、es-ES 等 P1 语言仍为未来范围。",
      ),
      nextAction: localized(
        "Use the P1 locale expansion readiness matrix before opening any activation mission.",
        "开启任何激活 mission 前先使用 P1 语言扩展 readiness 矩阵。",
        "開啟任何啟用 mission 前先使用 P1 語言擴展 readiness 矩陣。",
      ),
      sourceRequirement: "Product checklist: future locale expansion",
    }),
  ];
};

const createArchitectureDeliveryChecklistItems = (): DeliveryChecklistItem[] => {
  const groupId = "architecture" as const;

  return [
    deliveryChecklistItem({
      groupId,
      id: "architecture-wallet-normalization",
      label: localized("Normalized wallet session schema", "归一化钱包 session schema"),
      status: "covered",
      surface: localized("NormalizedWalletSession", "NormalizedWalletSession"),
      evidence: localized(
        "Seeded fixtures normalize address, account type, wallet source, chain, network, capabilities, signature status, and optional public accounts/publicKey metadata.",
        "Seeded fixtures 归一化 address、account type、wallet source、chain、network、capabilities、signature status，以及可选公开 accounts/publicKey metadata。",
      ),
      nextAction: localized(
        "Bind the same shape to live adapters only after provider QA.",
        "完成 provider QA 后再绑定真实 adapter。",
      ),
      sourceRequirement: "Architecture checklist: wallet adapter normalization",
    }),
    deliveryChecklistItem({
      groupId,
      id: "architecture-wallet-enums",
      label: localized("WalletSource and AccountType enums", "WalletSource 与 AccountType 枚举"),
      status: "covered",
      surface: localized("Domain types", "Domain types"),
      evidence: localized(
        "Domain types include AA, EOA, UNKNOWN and Portkey AA, Portkey EOA App, extension, NightElf, agent, and other sources.",
        "Domain types 包含 AA、EOA、UNKNOWN，以及 Portkey AA、Portkey EOA App、Extension、NightElf、Agent、Other 来源。",
      ),
      nextAction: localized("Keep enum expansion behind adapter review.", "枚举扩展必须经过 adapter review。"),
      sourceRequirement: "Architecture checklist: wallet source/account type enums",
    }),
    deliveryChecklistItem({
      groupId,
      id: "architecture-i18n-content-service",
      label: localized("i18n content service shape", "i18n 内容服务形态"),
      status: "covered",
      ownerRole: "project_owner",
      surface: localized("Translation Manager read model", "翻译管理 read model"),
      evidence: localized(
        "English source, Chinese draft, fallback, reward disclaimer rows, and compare-review prompts are modeled.",
        "英文源、中文草稿、fallback、奖励免责声明行与 compare-review prompt 已建模。",
      ),
      nextAction: localized(
        "Replace seeded revisions with persistence only after content review workflow approval.",
        "内容审核流程批准后再用持久化替换 seeded revisions。",
      ),
      sourceRequirement: "Architecture checklist: i18n content service",
    }),
    deliveryChecklistItem({
      groupId,
      id: "architecture-verification-aa-eoa",
      label: localized("Verification accepts AA and EOA", "验证接受 AA 与 EOA"),
      status: "covered",
      surface: localized("Participation and eligibility read models", "参与与资格 read model"),
      evidence: localized(
        "Task and eligibility states carry account type, wallet source, wallet verification, missing tasks, and evidence source.",
        "任务与资格状态携带 account type、wallet source、wallet verification、missing tasks 与 evidence source。",
      ),
      nextAction: localized(
        "Connect live verifier services only behind service registry/config gates.",
        "仅在 service registry/config gate 后接入真实 verifier 服务。",
      ),
      sourceRequirement: "Architecture checklist: verification service accepts AA and EOA",
    }),
    deliveryChecklistItem({
      groupId,
      id: "architecture-export-wallet-locale",
      label: localized("Export includes wallet type and locale", "导出包含钱包类型与语言"),
      status: "covered",
      ownerRole: "project_owner",
      surface: localized("Export preview", "导出预览"),
      evidence: localized(
        "Export columns include account type, wallet source, locale preference, risk flags, task records, and evidence hashes.",
        "导出字段包含 account type、wallet source、locale preference、risk flags、task records 与 evidence hashes。",
      ),
      nextAction: localized(
        "Keep export preview local until project owner confirms real file generation.",
        "项目方确认真实文件生成前保持本地导出预览。",
      ),
      sourceRequirement: "Architecture checklist: export service wallet and locale columns",
    }),
    deliveryChecklistItem({
      groupId,
      id: "architecture-contract-modes",
      label: localized(
        "Contract mode supports off-chain MVP, V2 companion, and contract claim",
        "合约模式支持 Off-chain MVP、V2 companion 与 contract claim",
      ),
      status: "covered",
      ownerRole: "contract_reviewer",
      surface: localized("Contract Impact Review", "合约影响审核"),
      evidence: localized(
        "Mode options are visible and contract claim is treated as a high-impact blocker.",
        "模式选项可见，contract claim 被视为高影响阻断。",
      ),
      nextAction: localized("Keep Off-chain MVP as safe default.", "继续将 Off-chain MVP 作为安全默认值。"),
      sourceRequirement: "Architecture checklist: contract modes",
    }),
  ];
};

const createUiDeliveryChecklistItems = (): DeliveryChecklistItem[] => {
  const groupId = "ui" as const;

  return [
    deliveryChecklistItem({
      groupId,
      id: "ui-wallet-modal-sections",
      label: localized(
        "Wallet modal has Recommended, EOA, and Advanced sections",
        "钱包弹窗包含 Recommended、EOA 与 Advanced 分区",
      ),
      status: "covered",
      surface: localized("Wallet Connect Modal", "钱包连接弹窗"),
      evidence: localized(
        "The modal groups Portkey AA, EOA wallets, and agent/internal options with safety copy.",
        "弹窗将 Portkey AA、EOA wallets 与 agent/internal options 分组，并展示安全文案。",
      ),
      nextAction: localized(
        "Keep agent skill wallets away from normal user recommendations.",
        "避免把 agent skill 钱包推荐给普通用户。",
      ),
      sourceRequirement: "UI checklist: wallet modal sections",
    }),
    deliveryChecklistItem({
      groupId,
      id: "ui-header-wallet-badge",
      label: localized("Header shows wallet type badge", "Header 显示钱包类型 badge"),
      status: "covered",
      surface: localized("App shell header", "App shell Header"),
      evidence: localized(
        "Connected wallet state shows AA/EOA source badge and verification status.",
        "已连接钱包状态展示 AA/EOA 来源 badge 与验证状态。",
      ),
      nextAction: localized(
        "Preserve compact header behavior during future shell changes.",
        "未来 shell 变更时保留紧凑 Header 行为。",
      ),
      sourceRequirement: "UI checklist: header wallet badge",
    }),
    deliveryChecklistItem({
      groupId,
      id: "ui-task-compatibility-badge",
      label: localized("Task cards show wallet compatibility", "任务卡显示钱包兼容性"),
      status: "covered",
      ownerRole: "project_owner",
      surface: localized("Task Template Library and User App task list", "任务模板库与用户任务列表"),
      evidence: localized(
        "Task cards render Any wallet, AA-only, and EOA-only compatibility badges.",
        "任务卡渲染 Any wallet、AA-only 与 EOA-only 兼容性 badge。",
      ),
      nextAction: localized("Keep compatibility visible in all future task layouts.", "后续任务布局继续显示兼容性。"),
      sourceRequirement: "UI checklist: task card wallet compatibility badge",
    }),
    deliveryChecklistItem({
      groupId,
      id: "ui-eligibility-wallet-status",
      label: localized("Eligibility checker shows wallet type status", "资格检查器显示钱包类型状态"),
      status: "covered",
      surface: localized("Eligibility checker", "资格检查器"),
      evidence: localized(
        "Eligibility read model differentiates verified AA/EOA sessions from address-only input.",
        "资格 read model 区分已验证 AA/EOA session 与仅地址输入。",
      ),
      nextAction: localized(
        "Keep address-only checks pending until connect or signature.",
        "仅地址检查在连接或签名前保持 pending。",
      ),
      sourceRequirement: "UI checklist: eligibility wallet type status",
    }),
    deliveryChecklistItem({
      groupId,
      id: "ui-translation-manager-states",
      label: localized(
        "Translation manager has AI draft and human review states",
        "翻译管理包含 AI 草稿与人工审核状态",
      ),
      status: "covered",
      ownerRole: "project_owner",
      surface: localized("Translation Manager", "翻译管理"),
      evidence: localized(
        "The manager shows English source, Chinese AI draft, fallback, compare rows, and reward disclaimer review.",
        "管理器展示英文源、中文 AI 草稿、fallback、对照行与奖励免责声明审核。",
      ),
      nextAction: localized(
        "Complete human review before publishing localized content.",
        "发布本地化内容前完成人工审核。",
      ),
      sourceRequirement: "UI checklist: translation manager states",
    }),
    deliveryChecklistItem({
      groupId,
      id: "ui-admin-contract-impact",
      label: localized("Admin review includes contract impact panel", "Admin 审核包含合约影响面板"),
      status: "covered",
      ownerRole: "contract_reviewer",
      surface: localized("Admin Contract Review Center", "管理员合约审核中心"),
      evidence: localized(
        "Admin/Ops renders contract mode, metadata hash, verifier role, reward custody, checklist, and evolution.",
        "Admin/Ops 渲染合约模式、metadata hash、verifier role、reward custody、清单与演进路线。",
      ),
      nextAction: localized(
        "Keep claim-mode rows blocker until separate approval.",
        "单独批准前保持 claim-mode 行为 blocker。",
      ),
      sourceRequirement: "UI checklist: admin contract impact panel",
    }),
    deliveryChecklistItem({
      groupId,
      id: "ui-english-default-screens",
      label: localized("Screens default to English", "页面默认英文"),
      status: "covered",
      surface: localized("App shell and tests", "App shell 与测试"),
      evidence: localized(
        "Default render shows English shell, Project Console, User App, and Admin/Ops copy.",
        "默认渲染展示英文 shell、Project Console、User App 与 Admin/Ops 文案。",
      ),
      nextAction: localized("Continue reviewing screenshots with English as default.", "继续以英文默认态做截图审核。"),
      sourceRequirement: "UI checklist: English default screenshots",
    }),
  ];
};

const createContractDeliveryChecklistItems = (): DeliveryChecklistItem[] => {
  const groupId = "contract" as const;

  return [
    deliveryChecklistItem({
      groupId,
      id: "contract-mvp-no-migration",
      label: localized("MVP does not require contract migration", "MVP 不需要合约迁移"),
      status: "covered",
      ownerRole: "contract_reviewer",
      surface: localized("Contract Impact Review", "合约影响审核"),
      evidence: localized(
        "Off-chain MVP is the safe default and V2 companion is planned, not required.",
        "Off-chain MVP 是安全默认；V2 companion 是规划项而非必需项。",
      ),
      nextAction: localized("Keep MVP publish path off-chain.", "保持 MVP 发布路径链下。"),
      sourceRequirement: "Contract checklist: MVP no migration",
    }),
    deliveryChecklistItem({
      groupId,
      id: "contract-v2-plan",
      label: localized("V2 companion contract plan exists", "V2 companion 合约计划存在"),
      status: "covered",
      ownerRole: "contract_reviewer",
      surface: localized("Contract Interface Matrix Console", "合约接口矩阵控制台"),
      evidence: localized(
        "CampaignRegistryV2, points ledger, referral registry, and eligibility root registry are modeled.",
        "CampaignRegistryV2、points ledger、referral registry 与 eligibility root registry 已建模。",
      ),
      nextAction: localized("Use the matrix as planning evidence, not an executable ABI.", "将矩阵作为规划证据，而非可执行 ABI。"),
      sourceRequirement: "Contract checklist: V2 companion plan",
    }),
    deliveryChecklistItem({
      groupId,
      id: "contract-registry-methods",
      label: localized("CampaignRegistryV2 methods defined", "CampaignRegistryV2 方法已定义"),
      status: "covered",
      ownerRole: "contract_reviewer",
      surface: localized("Contract Interface Matrix Console", "合约接口矩阵控制台"),
      evidence: localized(
        "Create, metadata update, task config hash, status, wallet policy, locale, owner transfer, pause, and read methods are listed.",
        "已列出创建、metadata 更新、task config hash、状态、钱包策略、语言、owner 转移、暂停与读取方法。",
      ),
      nextAction: localized("Review schema and authorization before implementation.", "实现前审核 schema 与授权。"),
      sourceRequirement: "Contract checklist: CampaignRegistryV2 methods",
    }),
    deliveryChecklistItem({
      groupId,
      id: "contract-points-eligibility-root-plan",
      label: localized("Points batch and eligibility root plan", "积分批次与资格 root 计划"),
      status: "covered",
      ownerRole: "contract_reviewer",
      surface: localized("Contract Interface Matrix Console", "合约接口矩阵控制台"),
      evidence: localized(
        "Points batch commit/revoke/read and eligibility root set/update/read/verify methods are listed.",
        "已列出 points batch commit/revoke/read 与 eligibility root set/update/read/verify 方法。",
      ),
      nextAction: localized("Define root formats before P1 contract work.", "P1 合约工作前定义 root 格式。"),
      sourceRequirement: "Contract checklist: points batch / eligibility root plan",
    }),
    deliveryChecklistItem({
      groupId,
      id: "contract-referral-plan",
      label: localized("Referral registry plan", "Referral registry 计划"),
      status: "covered",
      ownerRole: "contract_reviewer",
      surface: localized("Contract Interface Matrix Console", "合约接口矩阵控制台"),
      evidence: localized(
        "Referral bind, qualify, remove, and read methods are modeled with off-chain anti-farm evidence.",
        "Referral bind、qualify、remove、read 方法已建模，反刷证据保持链下。",
      ),
      nextAction: localized("Review duplicate, self, and circular referral policy.", "审核重复、自邀请与循环邀请策略。"),
      sourceRequirement: "Contract checklist: referral registry plan",
    }),
    deliveryChecklistItem({
      groupId,
      id: "contract-i18n-off-chain",
      label: localized("i18n text stays off-chain", "i18n 文本保持链下"),
      status: "covered",
      ownerRole: "project_owner",
      surface: localized("Translation Manager and Contract Matrix", "翻译管理与合约矩阵"),
      evidence: localized(
        "Contract matrix keeps full translated copy off-chain and plans metadata hash only.",
        "合约矩阵保持完整翻译文案链下，仅规划 metadata hash。",
      ),
      nextAction: localized("Hash reviewed artifacts only after human review.", "人工审核后仅 hash 已审核产物。"),
      sourceRequirement: "Contract checklist: i18n off-chain",
    }),
    deliveryChecklistItem({
      groupId,
      id: "contract-reward-custody-excluded",
      label: localized("Reward custody excluded from MVP", "奖励托管排除在 MVP 外"),
      status: "blocked",
      blocksDelivery: true,
      ownerRole: "contract_reviewer",
      surface: localized("Contract Impact Review and Export Confirmation", "合约影响审核与导出确认"),
      evidence: localized(
        "Campaign OS exports winners only; final reward distribution is handled by the campaign project.",
        "Campaign OS 只导出 winners；最终奖励发放由活动项目方处理。",
      ),
      nextAction: localized(
        "Block any reward custody or contract claim scope until separate security, legal, and audit approval.",
        "在安全、法律与审计单独批准前，阻断任何奖励托管或合约领取范围。",
      ),
      sourceRequirement: "Contract checklist: reward custody excluded",
    }),
  ];
};

const liveWalletQaChecklistItemIds: Record<WalletProviderQaScenarioId, string> = {
  "eoa-extension-connect": "qa-eoa-extension-connect",
  "portkey-aa-connect": "qa-portkey-aa-connect",
  "unsupported-wallet-error": "qa-unsupported-wallet-error",
  "wrong-chain-error": "qa-wrong-chain-error",
};

const liveWalletQaSourceRequirements: Record<WalletProviderQaScenarioId, string> = {
  "eoa-extension-connect": "QA checklist: EOA extension connect",
  "portkey-aa-connect": "QA checklist: Portkey AA connect",
  "unsupported-wallet-error": "QA checklist: unsupported wallet error",
  "wrong-chain-error": "QA checklist: wrong chain error",
};

const liveWalletQaSurfaces: Record<WalletProviderQaScenarioId, LocalizedText> = {
  "eoa-extension-connect": localized("Wallet Provider QA Gate", "钱包 Provider QA 门禁"),
  "portkey-aa-connect": localized("Wallet Provider QA Gate", "钱包 Provider QA 门禁"),
  "unsupported-wallet-error": localized(
    "Wallet Provider QA Gate error recovery",
    "钱包 Provider QA 门禁错误恢复",
  ),
  "wrong-chain-error": localized(
    "Wallet Provider QA Gate error recovery",
    "钱包 Provider QA 门禁错误恢复",
  ),
};

const liveWalletQaLabels: Record<WalletProviderQaScenarioId, LocalizedText> = {
  "eoa-extension-connect": localized("EOA extension connect tested", "EOA extension 连接测试"),
  "portkey-aa-connect": localized("Portkey AA connect tested", "Portkey AA 连接测试"),
  "unsupported-wallet-error": localized("Unsupported wallet error tested", "不支持钱包错误状态测试"),
  "wrong-chain-error": localized("Wrong chain error tested", "错误链错误状态测试"),
};

const createLiveWalletQaDeliveryChecklistItems = (
  walletProviderQaGate: WalletProviderQaReadinessGate,
): DeliveryChecklistItem[] =>
  walletProviderQaGate.scenarios.map((scenario) =>
    deliveryChecklistItem({
      groupId: "qa",
      id: liveWalletQaChecklistItemIds[scenario.id],
      label: liveWalletQaLabels[scenario.id],
      status: scenario.liveEvidenceStatus === "ready" ? "covered" : "needs_review",
      surface: liveWalletQaSurfaces[scenario.id],
      evidence: scenario.evidence,
      nextAction:
        scenario.liveEvidenceStatus === "ready"
          ? localized(
              "Keep reviewed live-provider evidence attached for release audit.",
              "保留已审核的真实 provider 证据用于发布审计。",
            )
          : scenario.nextAction,
      sourceRequirement: liveWalletQaSourceRequirements[scenario.id],
    }),
  );

const createQaDeliveryChecklistItems = (
  walletProviderQaGate: WalletProviderQaReadinessGate = createWalletProviderQaReadinessGate([]),
): DeliveryChecklistItem[] => {
  const groupId = "qa" as const;

  return [
    ...createLiveWalletQaDeliveryChecklistItems(walletProviderQaGate),
    deliveryChecklistItem({
      groupId,
      id: "qa-en-default",
      label: localized("en-US default tested", "en-US 默认态测试"),
      status: "covered",
      surface: localized("App shell tests", "App shell 测试"),
      evidence: localized(
        "Default app render asserts English shell and product surfaces.",
        "默认 app render 断言英文 shell 与产品 surface。",
      ),
      nextAction: localized("Keep default English screenshot review in each mission.", "每个 mission 继续做默认英文截图审核。"),
      sourceRequirement: "QA checklist: en-US default",
    }),
    deliveryChecklistItem({
      groupId,
      id: "qa-zh-switch",
      label: localized("Simplified Chinese switch tested", "简体中文切换测试"),
      status: "covered",
      surface: localized("Locale selector tests", "语言选择器测试"),
      evidence: localized(
        "App and panel tests switch to zh-CN and assert localized copy.",
        "App 与 panel 测试切换到 zh-CN 并断言本地化文案。",
      ),
      nextAction: localized("Keep locale switch tests alongside new UI sections.", "新 UI section 继续补语言切换测试。"),
      sourceRequirement: "QA checklist: zh-CN switch",
    }),
    deliveryChecklistItem({
      groupId,
      id: "qa-missing-translation-fallback",
      label: localized("Missing translation fallback tested", "缺失翻译 fallback 测试"),
      status: "covered",
      ownerRole: "project_owner",
      surface: localized("Translation Manager", "翻译管理"),
      evidence: localized(
        "Chinese AI draft falls back to English until reviewed.",
        "中文 AI 草稿在审核前回退英文。",
      ),
      nextAction: localized("Keep fallback visible until human review is complete.", "人工审核完成前保持 fallback 可见。"),
      sourceRequirement: "QA checklist: missing translation fallback",
    }),
    deliveryChecklistItem({
      groupId,
      id: "qa-export-csv-columns",
      label: localized("Export CSV columns tested", "导出 CSV 字段测试"),
      status: "covered",
      ownerRole: "project_owner",
      surface: localized("Export preview and API skill contracts", "导出预览与 API skill contracts"),
      evidence: localized(
        "Export column order includes wallet, locale, risk, task, evidence, and batch fields.",
        "导出字段顺序包含 wallet、locale、risk、task、evidence 与 batch 字段。",
      ),
      nextAction: localized(
        "Keep real file generation behind project-owner confirmation.",
        "真实文件生成继续放在项目方确认之后。",
      ),
      sourceRequirement: "QA checklist: export CSV columns",
    }),
    deliveryChecklistItem({
      groupId,
      id: "qa-reward-disclaimer-blocker",
      label: localized("Publish blocker for missing reward disclaimer", "缺失奖励免责声明发布阻断"),
      status: "covered",
      ownerRole: "project_owner",
      surface: localized("Publish gate decision center", "发布门禁决策中心"),
      evidence: localized(
        "Publish readiness exposes localized reward disclaimer blocker behavior for AI draft, fallback, and missing locale rows.",
        "发布准备度已暴露 AI 草稿、回退与缺失语言行的本地化奖励免责声明阻断行为。",
      ),
      nextAction: localized(
        "Keep blocking publish until localized reward disclaimer rows are reviewed.",
        "本地化奖励免责声明行完成审核前继续阻断发布。",
      ),
      sourceRequirement: "QA checklist: publish blocker for missing reward disclaimer",
    }),
    deliveryChecklistItem({
      groupId,
      id: "qa-contract-claim-admin-approval",
      label: localized("Contract claim mode requires admin approval", "Contract claim 模式需要管理员批准"),
      status: "blocked",
      blocksDelivery: true,
      ownerRole: "contract_reviewer",
      surface: localized("Contract Impact Review", "合约影响审核"),
      evidence: localized(
        "Contract claim mode remains blocked until high-impact security, custody, legal, and audit approval.",
        "Contract claim mode 在安全、托管、法律与审计批准前保持阻断。",
      ),
      nextAction: localized("Do not enable claim mode in MVP.", "MVP 不启用 claim mode。"),
      sourceRequirement: "QA checklist: contract claim admin approval",
    }),
  ];
};

export const createDeliveryChecklistReadinessConsole = (
  walletProviderQaGate: WalletProviderQaReadinessGate = createWalletProviderQaReadinessGate([]),
): DeliveryChecklistReadinessConsole => {
  const groups = [
    deliveryChecklistGroup({
      id: "product",
      title: localized("Product Checklist", "产品清单"),
      sourceReference: "09_delivery_checklist_v0.2.md#product-checklist",
      summary: localized(
        "Product-facing wallet, locale, builder, task, reward, and contract review requirements.",
        "面向产品的钱包、语言、构建器、任务、奖励与合约审核要求。",
      ),
      items: createProductDeliveryChecklistItems(),
    }),
    deliveryChecklistGroup({
      id: "architecture",
      title: localized("Architecture Checklist", "架构清单"),
      sourceReference: "09_delivery_checklist_v0.2.md#architecture-checklist",
      summary: localized(
        "Normalized wallet, i18n, verification, export, and contract-mode architecture surfaces.",
        "归一化钱包、i18n、验证、导出与合约模式架构面。",
      ),
      items: createArchitectureDeliveryChecklistItems(),
    }),
    deliveryChecklistGroup({
      id: "ui",
      title: localized("UI Checklist", "UI 清单"),
      sourceReference: "09_delivery_checklist_v0.2.md#ui-checklist",
      summary: localized(
        "Visible wallet, language, task, eligibility, translation, and contract review UI requirements.",
        "可见的钱包、语言、任务、资格、翻译与合约审核 UI 要求。",
      ),
      items: createUiDeliveryChecklistItems(),
    }),
    deliveryChecklistGroup({
      id: "contract",
      title: localized("Contract Checklist", "合约清单"),
      sourceReference: "09_delivery_checklist_v0.2.md#contract-checklist",
      summary: localized(
        "Off-chain MVP, V2 companion, root, referral, i18n, and reward custody contract boundaries.",
        "Off-chain MVP、V2 companion、root、referral、i18n 与奖励托管合约边界。",
      ),
      items: createContractDeliveryChecklistItems(),
    }),
    deliveryChecklistGroup({
      id: "qa",
      title: localized("QA Checklist", "QA 清单"),
      sourceReference: "09_delivery_checklist_v0.2.md#qa-checklist",
      summary: localized(
        "Seeded QA evidence and live-provider review gaps for wallet, locale, export, and contract claim flows.",
        "钱包、语言、导出与 contract claim 流程的 seeded QA 证据与真实 provider 审核缺口。",
      ),
      items: createQaDeliveryChecklistItems(walletProviderQaGate),
    }),
  ];
  const items = groups.flatMap((group) => group.items);

  return {
    boundary: deliveryChecklistBoundary,
    blockers: items.filter((item) => item.status === "blocked"),
    groups,
    needsReview: items.filter((item) => item.status === "needs_review"),
    p1LocaleExpansion: createP1LocaleExpansionReadiness(),
    summary: {
      blockedItems: deliveryChecklistStatusCount(items, "blocked"),
      coveredItems: deliveryChecklistStatusCount(items, "covered"),
      deferredItems: deliveryChecklistStatusCount(items, "deferred"),
      groupCount: groups.length,
      needsReviewItems: deliveryChecklistStatusCount(items, "needs_review"),
      nextAction: localized(
        "Resolve blocker and live-QA review rows before treating v0.2 delivery as complete.",
        "在把 v0.2 交付视为完成前，先解决阻断与真实 QA review 行。",
      ),
      totalItems: items.length,
    },
  };
};

export const createParticipationReadModel = (
  campaign: CampaignShellDetail,
  participant: ParticipantSnapshot,
): ParticipationReadModel => {
  const taskStates = deriveParticipantTaskStates(campaign.tasks, participant);

  return {
    campaignId: campaign.id,
    participant,
    eligibility: createEligibilityResult(campaign, participant, taskStates),
    taskStates,
    referral: participant.referralSummary ?? defaultReferralSummary,
    leaderboard: createLeaderboard(campaign.participants),
    metrics: createParticipationMetrics(campaign.tasks, participant, taskStates),
    rewardBoundary,
  };
};

const participantWorkspaceBoundary: LocalizedText = localized(
  "Seeded/local participant workspace only. Points, rank, tasks, and referral status are not a live ledger; no Referral backend, wallet SDK action, contract write, claim, winners export approval, reward custody, or reward distribution is executed.",
  "仅 seeded/本地参与者工作台。积分、排名、任务与推荐状态不是实时账本；不会执行 Referral 后端、钱包 SDK 动作、合约写入、claim、winners 导出批准、奖励托管或发奖。",
  "Seeded/local participant workspace only. Points, rank, tasks, and referral status are not a live ledger; no Referral backend, wallet SDK action, contract write, claim, winners export approval, reward custody, or reward distribution is executed.",
);

const participantWorkspacePointsBoundary: LocalizedText = localized(
  "Seeded preview values only; points and rank are not settled by a live points ledger.",
  "仅 seeded 预览值；积分和排名不是由实时 points ledger 结算。",
  "Seeded preview values only; points and rank are not settled by a live points ledger.",
);

const participantWorkspaceReferralBoundary: LocalizedText = localized(
  "Referral attribution preview only. Raw invites do not count until invitees complete valid tasks, and no live Referral registry write is executed.",
  "仅推荐归因预览。原始邀请不会直接计分，只有被邀请人完成有效任务后才计入，且不会执行实时 Referral registry 写入。",
  "Referral attribution preview only. Raw invites do not count until invitees complete valid tasks, and no live Referral registry write is executed.",
);

const participantWorkspaceTaskRow = (
  task: CampaignTask,
  state: ParticipantTaskState,
): ParticipantWorkspaceTaskRow => ({
  taskId: task.id,
  title: task.title,
  status: state.status,
  pointsAwarded: state.pointsAwarded,
  pointsAvailable: state.pointsAvailable,
  evidenceSource: state.evidenceSource,
  missingRequired: state.missingRequired,
  nextAction: state.nextAction,
  riskFlags: [...state.riskFlags],
});

const participantWorkspaceNextActions = (
  participation: ParticipationReadModel,
  taskRows: ParticipantWorkspaceTaskRow[],
): ParticipantWorkspaceNextAction[] => {
  const missingRequired = taskRows.find((task) => task.missingRequired);
  const reviewTask = taskRows.find((task) => task.status === "failed" || task.status === "manual_review");
  const actions: ParticipantWorkspaceNextAction[] = [];

  if (missingRequired) {
    actions.push({
      id: "complete-missing-required-task",
      priority: "primary",
      label: localized("Complete missing required task", "完成缺失的必做任务", "完成缺失的必做任務"),
      reason: missingRequired.nextAction,
      relatedTaskId: missingRequired.taskId,
    });
  }

  if (reviewTask) {
    actions.push({
      id: "review-task-status",
      priority: "review",
      label: localized("Review task status", "审核任务状态", "審核任務狀態"),
      reason: reviewTask.nextAction,
      relatedTaskId: reviewTask.taskId,
    });
  }

  if (participation.participant.riskFlags.length > 0) {
    actions.push({
      id: "wait-for-risk-review",
      priority: "review",
      label: localized("Wait for manual review", "等待人工审核", "等待人工審核"),
      reason: localized(
        "Risk flags are review inputs, not automatic reward rejection.",
        "风险标记是审核输入，不代表自动拒绝奖励。",
        "Risk flags are review inputs, not automatic reward rejection.",
      ),
    });
  }

  if (actions.length === 0) {
    actions.push({
      id: "stay-active-until-export-review",
      priority: "secondary",
      label: localized("Stay active until export review", "在导出审核前保持活跃", "在匯出審核前保持活躍"),
      reason: participation.eligibility.nextAction,
    });
  }

  return actions;
};

export const createParticipantWorkspaceReadModel = (
  campaign: CampaignShellDetail,
  participant: ParticipantSnapshot,
): ParticipantWorkspaceReadModel => {
  const participation = createParticipationReadModel(campaign, participant);
  const taskRows = campaign.tasks.flatMap((task) => {
    const state = participation.taskStates.find((candidate) => candidate.taskId === task.id);

    return state ? [participantWorkspaceTaskRow(task, state)] : [];
  });
  const completed = taskRows.filter((task) => task.status === "completed");
  const pending = taskRows.filter((task) => task.status === "ready" || task.status === "pending");
  const review = taskRows.filter((task) => task.status === "failed" || task.status === "manual_review");
  const missingRequired = taskRows.filter((task) => task.missingRequired);
  const totalProgressPercent = Math.round(
    (participation.metrics.completedTasks / Math.max(1, participation.metrics.totalTasks)) * 100,
  );
  const requiredProgress = requiredProgressPercent(participation.metrics);
  const participantRank = participant.rank ?? null;
  const referral = participation.referral;
  const riskFlagCount = new Set([
    ...participant.riskFlags,
    ...taskRows.flatMap((task) => task.riskFlags),
    ...referral.riskFlags,
  ]).size;

  return {
    campaignId: campaign.id,
    participantId: participant.id,
    walletAddress: participant.walletAddress,
    summary: {
      requiredProgressPercent: requiredProgress,
      totalProgressPercent,
      completedRequiredTasks: participation.metrics.completedRequiredTasks,
      totalRequiredTasks: participation.metrics.totalRequiredTasks,
      completedTasks: participation.metrics.completedTasks,
      totalTasks: participation.metrics.totalTasks,
      currentPoints: participant.totalPoints,
      pointsThreshold: participation.metrics.pointsThreshold,
      participantRank,
      eligibleRankCutoff: participation.metrics.eligibleRankCutoff,
      qualifiedInvitees: referral.qualifiedInvitees,
      referralPoints: referral.referralPoints,
      riskFlagCount,
      reviewRequired:
        riskFlagCount > 0 ||
        review.length > 0 ||
        participation.eligibility.status === "risk_flagged",
    },
    taskBuckets: {
      completed,
      pending,
      review,
      missingRequired,
    },
    points: {
      currentPoints: participant.totalPoints,
      pointsThreshold: participation.metrics.pointsThreshold,
      participantRank,
      eligibleRankCutoff: participation.metrics.eligibleRankCutoff,
      progressPercent: requiredProgress,
      ledgerState: "seeded_preview",
      boundary: participantWorkspacePointsBoundary,
    },
    referral: {
      inviteLink: referral.inviteLink,
      rawInvites: referral.invitedCount,
      qualifiedInvitees: referral.qualifiedInvitees,
      referralPoints: referral.referralPoints,
      antiFarmRule: referral.antiFarmRule,
      riskFlags: [...referral.riskFlags],
      boundary: participantWorkspaceReferralBoundary,
    },
    nextActions: participantWorkspaceNextActions(participation, taskRows),
    boundary: participantWorkspaceBoundary,
    rewardBoundary,
  };
};

const projectUserWinnersExportRow = (row: ExportPreviewRow): UserWinnersExportRow => ({
  rowStatus: row.rowStatus,
  walletAddress: row.walletAddress,
  accountType: row.accountType,
  walletSource: row.walletSource,
  localePreference: row.localePreference,
  totalPoints: row.totalPoints,
  rank: row.rank,
  eligible: row.eligible,
  missingTasks: row.missingTasks,
  riskFlags: row.riskFlags,
  referrerAddress: row.referrerAddress,
  taskRecords: row.taskRecords,
  evidenceHashes: row.evidenceHashes,
  exportBatchId: row.exportBatchId,
  walletTypeVerified: row.walletTypeVerified,
  missingColumnValues: row.missingColumnValues,
});

const deriveUserWinnersExportStatus = (row: ExportPreviewRow): UserWinnersExportStatus => {
  if (!row.walletTypeVerified || row.missingColumnValues.length > 0 || row.missingTasks.length > 0) {
    return "blocked";
  }

  if (row.riskFlags.length > 0 || row.rowStatus === "review_required") {
    return "review_required";
  }

  return row.rowStatus;
};

const describeUserWinnersExportStatus = (
  status: UserWinnersExportStatus,
  row?: ExportPreviewRow,
): Pick<UserWinnersExportStatusReadModel, "reason" | "nextAction" | "summary"> => {
  if (!row) {
    return {
      summary: {
        "en-US": "This wallet is not in the seeded winners export preview yet.",
        "zh-CN": "该钱包尚未进入 seeded winners 导出预览。",
        "zh-TW": "This wallet is not in the seeded winners export preview yet.",
      },
      reason: {
        "en-US": "Campaign OS cannot show export evidence until a supported wallet session or participant row is verified.",
        "zh-CN": "在验证受支持的钱包会话或参与者记录前，Campaign OS 无法展示导出证据。",
        "zh-TW": "Campaign OS cannot show export evidence until a supported wallet session or participant row is verified.",
      },
      nextAction: {
        "en-US": "Connect or verify a supported wallet before checking winners export status.",
        "zh-CN": "请先连接或验证受支持的钱包，再检查 winners 导出状态。",
        "zh-TW": "Connect or verify a supported wallet before checking winners export status.",
      },
    };
  }

  if (status === "blocked") {
    const missingTasks = row.missingTasks.join(", ");
    const missingColumns = row.missingColumnValues.join(", ");

    return {
      summary: {
        "en-US": "This row is blocked before winners export.",
        "zh-CN": "该记录在 winners 导出前已被阻断。",
        "zh-TW": "This row is blocked before winners export.",
      },
      reason: {
        "en-US":
          missingTasks.length > 0
            ? `Missing required export tasks: ${missingTasks}.`
            : `Wallet type or export columns still need verification: ${missingColumns || "wallet_type"}.`,
        "zh-CN":
          missingTasks.length > 0
            ? `仍缺少必做导出任务：${missingTasks}。`
            : `钱包类型或导出字段仍需验证：${missingColumns || "wallet_type"}。`,
        "zh-TW":
          missingTasks.length > 0
            ? `Missing required export tasks: ${missingTasks}.`
            : `Wallet type or export columns still need verification: ${missingColumns || "wallet_type"}.`,
      },
      nextAction: {
        "en-US": "Complete missing required tasks or verify wallet metadata before winners export can be trusted.",
        "zh-CN": "请先完成缺失的必做任务或验证钱包元数据，再进入可信 winners 导出。",
        "zh-TW": "Complete missing required tasks or verify wallet metadata before winners export can be trusted.",
      },
    };
  }

  if (status === "review_required") {
    return {
      summary: {
        "en-US": "This row is present, but export approval needs manual review.",
        "zh-CN": "该记录已存在，但导出批准需要人工审核。",
        "zh-TW": "This row is present, but export approval needs manual review.",
      },
      reason: {
        "en-US": "Risk flags and eligibility gaps are review inputs, not automatic reward rejection.",
        "zh-CN": "风险标记和资格缺口仅作为审核输入，不代表自动拒绝奖励。",
        "zh-TW": "Risk flags and eligibility gaps are review inputs, not automatic reward rejection.",
      },
      nextAction: {
        "en-US": "Wait for manual review before winners export; Campaign OS does not distribute rewards.",
        "zh-CN": "请等待人工审核后再进入 winners 导出；Campaign OS 不执行发奖。",
        "zh-TW": "Wait for manual review before winners export; Campaign OS does not distribute rewards.",
      },
    };
  }

  return {
    summary: {
      "en-US": "This row is ready for winners export review.",
      "zh-CN": "该记录已准备进入 winners 导出审核。",
      "zh-TW": "This row is ready for winners export review.",
    },
    reason: {
      "en-US": "Wallet metadata, eligibility, task records, and evidence hashes are present in the seeded export preview.",
      "zh-CN": "seeded 导出预览中已包含钱包元数据、资格、任务记录与证据哈希。",
      "zh-TW": "Wallet metadata, eligibility, task records, and evidence hashes are present in the seeded export preview.",
    },
    nextAction: {
      "en-US": "Wait for the campaign project to handle final reward fulfillment after export.",
      "zh-CN": "导出后等待活动项目方处理最终奖励履约。",
      "zh-TW": "Wait for the campaign project to handle final reward fulfillment after export.",
    },
  };
};

export const createUserWinnersExportStatusReadModel = (
  campaign: CampaignShellDetail,
  participant: ParticipantSnapshot,
): UserWinnersExportStatusReadModel => {
  const row = campaign.exportPreview.rows.find(
    (candidate) => candidate.walletAddress === participant.walletAddress,
  );
  const status = row ? deriveUserWinnersExportStatus(row) : "pending";
  const statusDescription = describeUserWinnersExportStatus(status, row);

  return {
    campaignId: campaign.id,
    walletAddress: participant.walletAddress,
    participantId: participant.id,
    status,
    statusLabel: userWinnersExportStatusLabels[status],
    ...statusDescription,
    rewardBoundary,
    fulfillmentOwner: exportFulfillmentOwner,
    exportBatchId: row?.exportBatchId,
    row: row ? projectUserWinnersExportRow(row) : undefined,
  };
};

const ecosystemProducts = {
  Pay: {
    id: "Pay",
    label: {
      "en-US": "Pay",
      "zh-CN": "Pay",
      "zh-TW": "Pay",
    },
    description: {
      "en-US": "Use aelf Pay after campaign eligibility work is understood.",
      "zh-CN": "在理解活动资格后使用 aelf Pay。",
      "zh-TW": "Use aelf Pay after campaign eligibility work is understood.",
    },
    serviceState: "not_connected",
  },
  Forecast: {
    id: "Forecast",
    label: {
      "en-US": "Forecast",
      "zh-CN": "Forecast",
      "zh-TW": "Forecast",
    },
    description: {
      "en-US": "Explore Forecast only after campaign risk and eligibility are clear.",
      "zh-CN": "在活动风险与资格清楚后再探索 Forecast。",
      "zh-TW": "Explore Forecast only after campaign risk and eligibility are clear.",
    },
    serviceState: "not_connected",
  },
  Portfolio: {
    id: "Portfolio",
    label: {
      "en-US": "Portfolio",
      "zh-CN": "Portfolio",
      "zh-TW": "Portfolio",
    },
    description: {
      "en-US": "Review the seeded portfolio checkpoint before the next campaign.",
      "zh-CN": "在进入下一个活动前查看 seeded Portfolio 检查点。",
      "zh-TW": "Review the seeded portfolio checkpoint before the next campaign.",
    },
    serviceState: "not_connected",
  },
} satisfies Record<EcosystemNextActionProduct["id"], EcosystemNextActionProduct>;

const ecosystemBoundary: LocalizedText = {
  "en-US": "No live Pay, Forecast, or Portfolio service is connected; no wallet SDK, payment, prediction, portfolio sync, contract view, or contract send is executed.",
  "zh-CN": "不会连接真实 Pay、Forecast 或 Portfolio 服务；不会执行钱包 SDK、支付、预测、Portfolio 同步、合约读取或合约发送。",
  "zh-TW": "No live Pay, Forecast, or Portfolio service is connected; no wallet SDK, payment, prediction, portfolio sync, contract view, or contract send is executed.",
};

const productBoundary: Record<EcosystemNextActionProduct["id"], LocalizedText> = {
  Pay: {
    "en-US": "No live Pay service, wallet SDK, payment transaction, contract view, or contract send is executed.",
    "zh-CN": "不会连接真实 Pay 服务、钱包 SDK、支付交易、合约读取或合约发送。",
    "zh-TW": "No live Pay service, wallet SDK, payment transaction, contract view, or contract send is executed.",
  },
  Forecast: {
    "en-US": "No live Forecast service, prediction transaction, wallet SDK, contract view, or contract send is executed.",
    "zh-CN": "不会连接真实 Forecast 服务、预测交易、钱包 SDK、合约读取或合约发送。",
    "zh-TW": "No live Forecast service, prediction transaction, wallet SDK, contract view, or contract send is executed.",
  },
  Portfolio: {
    "en-US": "No live Portfolio service, wallet SDK, portfolio sync, contract view, or contract send is executed.",
    "zh-CN": "不会连接真实 Portfolio 服务、钱包 SDK、Portfolio 同步、合约读取或合约发送。",
    "zh-TW": "No live Portfolio service, wallet SDK, portfolio sync, contract view, or contract send is executed.",
  },
};

const priorityByIndex = (index: number): EcosystemRecommendationPriority =>
  index === 0 ? "primary" : index === 1 ? "secondary" : "tertiary";

const createProgressSignal = (
  participation: ParticipationReadModel,
) => ({
  id: "required-progress",
  label: {
    "en-US": "Required progress",
    "zh-CN": "必做进度",
    "zh-TW": "Required progress",
  },
  value: {
    "en-US": `${participation.metrics.completedRequiredTasks}/${participation.metrics.totalRequiredTasks}`,
    "zh-CN": `${participation.metrics.completedRequiredTasks}/${participation.metrics.totalRequiredTasks}`,
    "zh-TW": `${participation.metrics.completedRequiredTasks}/${participation.metrics.totalRequiredTasks}`,
  },
  tone: participation.eligibility.missingTaskIds.length > 0 ? "blocker" : "ready",
} as const);

const createEligibilitySignal = (
  participation: ParticipationReadModel,
) => ({
  id: "eligibility",
  label: {
    "en-US": "Eligibility",
    "zh-CN": "资格",
    "zh-TW": "Eligibility",
  },
  value: participation.eligibility.reason,
  tone:
    participation.eligibility.status === "eligible"
      ? "ready"
      : participation.eligibility.status === "risk_flagged"
        ? "warning"
        : "blocker",
} as const);

const createRiskSignal = (
  participation: ParticipationReadModel,
) => ({
  id: "risk-context",
  label: {
    "en-US": "Risk context",
    "zh-CN": "风险上下文",
    "zh-TW": "Risk context",
  },
  value: {
    "en-US": participation.eligibility.riskFlags.length > 0
      ? participation.eligibility.riskFlags.join(", ")
      : "No risk flags",
    "zh-CN": participation.eligibility.riskFlags.length > 0
      ? participation.eligibility.riskFlags.join(", ")
      : "无风险标记",
    "zh-TW": participation.eligibility.riskFlags.length > 0
      ? participation.eligibility.riskFlags.join(", ")
      : "No risk flags",
  },
  tone: participation.eligibility.riskFlags.length > 0 ? "warning" : "ready",
} as const);

const createRankSignal = (
  participation: ParticipationReadModel,
) => ({
  id: "rank-context",
  label: {
    "en-US": "Rank and points",
    "zh-CN": "排名与积分",
    "zh-TW": "Rank and points",
  },
  value: {
    "en-US": `#${participation.metrics.participantRank} · ${participation.participant.totalPoints} pts`,
    "zh-CN": `#${participation.metrics.participantRank} · ${participation.participant.totalPoints} 积分`,
    "zh-TW": `#${participation.metrics.participantRank} · ${participation.participant.totalPoints} pts`,
  },
  tone: "ready",
} as const);

const missingTaskGate = (
  campaign: CampaignShellDetail,
  participation: ParticipationReadModel,
): LocalizedText | undefined => {
  const missingTaskId = participation.eligibility.missingTaskIds[0];
  const missingTask = campaign.tasks.find((task) => task.id === missingTaskId);

  if (!missingTask) {
    return undefined;
  }

  return {
    "en-US": `Complete ${missingTask.title["en-US"]} before this ecosystem action.`,
    "zh-CN": `先完成${missingTask.title["zh-CN"]}，再进入这个生态行动。`,
    "zh-TW": `Complete ${missingTask.title["en-US"]} before this ecosystem action.`,
  };
};

const createEcosystemRecommendationDrafts = (
  campaign: CampaignShellDetail,
  participation: ParticipationReadModel,
): EcosystemNextActionRecommendation[] => {
  const hasMissingRequiredTasks = participation.eligibility.missingTaskIds.length > 0;
  const hasRiskContext = participation.eligibility.riskFlags.length > 0;
  const fullyEligible = participation.eligibility.status === "eligible";
  const gate = missingTaskGate(campaign, participation);
  const progressSignal = createProgressSignal(participation);
  const eligibilitySignal = createEligibilitySignal(participation);
  const riskSignal = createRiskSignal(participation);
  const rankSignal = createRankSignal(participation);

  return [
    {
      id: "ecosystem-pay",
      product: ecosystemProducts.Pay,
      status: hasMissingRequiredTasks ? "locked" : "ready",
      priority: "primary",
      title: {
        "en-US": "Use Pay after the campaign step is clear",
        "zh-CN": "明确活动步骤后再使用 Pay",
        "zh-TW": "Use Pay after the campaign step is clear",
      },
      reason: hasMissingRequiredTasks
        ? {
            "en-US": "Pay is recommended after the missing required campaign task is complete.",
            "zh-CN": "完成缺失的必做活动任务后，再推荐进入 Pay。",
            "zh-TW": "Pay is recommended after the missing required campaign task is complete.",
          }
        : {
            "en-US": "Required campaign work is complete enough to explore a Pay follow-up.",
            "zh-CN": "必做活动进度已足够，可以探索 Pay 后续行动。",
            "zh-TW": "Required campaign work is complete enough to explore a Pay follow-up.",
          },
      ctaLabel: hasMissingRequiredTasks
        ? {
            "en-US": "Finish campaign task",
            "zh-CN": "完成活动任务",
            "zh-TW": "Finish campaign task",
          }
        : {
            "en-US": "Preview Pay action",
            "zh-CN": "预览 Pay 行动",
            "zh-TW": "Preview Pay action",
          },
      gatingReason: hasMissingRequiredTasks ? gate : undefined,
      relatedSignals: [progressSignal, eligibilitySignal],
      boundary: productBoundary.Pay,
    },
    {
      id: "ecosystem-forecast",
      product: ecosystemProducts.Forecast,
      status: hasRiskContext ? "review" : "ready",
      priority: "secondary",
      title: {
        "en-US": "Try Forecast with eligibility context",
        "zh-CN": "结合资格上下文探索 Forecast",
        "zh-TW": "Try Forecast with eligibility context",
      },
      reason: hasRiskContext
        ? {
            "en-US": "Forecast stays in review because this wallet has risk context in the campaign.",
            "zh-CN": "由于该钱包在活动中存在风险上下文，Forecast 保持审核状态。",
            "zh-TW": "Forecast stays in review because this wallet has risk context in the campaign.",
          }
        : {
            "en-US": "Campaign progress can lead into a Forecast follow-up without a live prediction transaction.",
            "zh-CN": "活动进度可以衔接 Forecast 后续行动，但不会发起真实预测交易。",
            "zh-TW": "Campaign progress can lead into a Forecast follow-up without a live prediction transaction.",
          },
      ctaLabel: hasRiskContext
        ? {
            "en-US": "Review risk first",
            "zh-CN": "先审核风险",
            "zh-TW": "Review risk first",
          }
        : {
            "en-US": "Preview Forecast action",
            "zh-CN": "预览 Forecast 行动",
            "zh-TW": "Preview Forecast action",
          },
      gatingReason: hasRiskContext
        ? {
            "en-US": "Manual risk review is required before treating Forecast as a ready follow-up.",
            "zh-CN": "在把 Forecast 视为就绪后续行动前，需要先完成人工风险审核。",
            "zh-TW": "Manual risk review is required before treating Forecast as a ready follow-up.",
          }
        : undefined,
      relatedSignals: [riskSignal, eligibilitySignal],
      boundary: productBoundary.Forecast,
    },
    {
      id: "ecosystem-portfolio",
      product: ecosystemProducts.Portfolio,
      status: fullyEligible ? "completed" : "ready",
      priority: "tertiary",
      title: {
        "en-US": "Check Portfolio before the next campaign",
        "zh-CN": "进入下一个活动前查看 Portfolio",
        "zh-TW": "Check Portfolio before the next campaign",
      },
      reason: fullyEligible
        ? {
            "en-US": "This wallet is eligible, so Portfolio becomes the primary post-campaign checkpoint.",
            "zh-CN": "该钱包已符合资格，因此 Portfolio 成为活动后的主要检查点。",
            "zh-TW": "This wallet is eligible, so Portfolio becomes the primary post-campaign checkpoint.",
          }
        : {
            "en-US": "Portfolio is available as a local checkpoint while campaign eligibility is still progressing.",
            "zh-CN": "活动资格仍在推进时，Portfolio 可作为本地检查点。",
            "zh-TW": "Portfolio is available as a local checkpoint while campaign eligibility is still progressing.",
          },
      ctaLabel: {
        "en-US": "Preview Portfolio checkpoint",
        "zh-CN": "预览 Portfolio 检查点",
        "zh-TW": "Preview Portfolio checkpoint",
      },
      relatedSignals: [rankSignal, progressSignal],
      boundary: productBoundary.Portfolio,
    },
  ];
};

const scoreRecommendation = (
  recommendation: EcosystemNextActionRecommendation,
) => {
  const statusScore: Record<EcosystemRecommendationStatus, number> = {
    completed: 4,
    ready: 3,
    review: 2,
    locked: 1,
  };
  const productTieBreak: Record<EcosystemNextActionProduct["id"], number> = {
    Portfolio: 3,
    Pay: 2,
    Forecast: 1,
  };

  return statusScore[recommendation.status] * 10 + productTieBreak[recommendation.product.id];
};

const prioritizeRecommendations = (
  recommendations: EcosystemNextActionRecommendation[],
) => {
  const hasLockedGate = recommendations.some((recommendation) => recommendation.status === "locked");
  const orderedRecommendations = hasLockedGate
    ? [...recommendations]
    : [...recommendations].sort(
        (left, right) => scoreRecommendation(right) - scoreRecommendation(left),
      );

  return orderedRecommendations.map((recommendation, index) => ({
    ...recommendation,
    priority: priorityByIndex(index),
  }));
};

const createEcosystemSummary = (
  recommendations: EcosystemNextActionRecommendation[],
  participation: ParticipationReadModel,
) => {
  const readyCount = recommendations.filter((recommendation) => recommendation.status === "ready").length;
  const lockedCount = recommendations.filter((recommendation) => recommendation.status === "locked").length;
  const reviewCount = recommendations.filter((recommendation) => recommendation.status === "review").length;
  const totalRequired = Math.max(1, participation.metrics.totalRequiredTasks);
  const loopProgressPercent = Math.round(
    (participation.metrics.completedRequiredTasks / totalRequired) * 100,
  );

  return {
    totalRecommendations: recommendations.length,
    readyCount,
    lockedCount,
    reviewCount,
    topRecommendationId: recommendations[0]?.id ?? "",
    loopProgressPercent,
    headline: lockedCount > 0
      ? {
          "en-US": "Finish the campaign gate before the next ecosystem action.",
          "zh-CN": "先完成活动门槛，再进入下一个生态行动。",
          "zh-TW": "Finish the campaign gate before the next ecosystem action.",
        }
      : {
          "en-US": "Campaign progress is ready to continue across the aelf ecosystem.",
          "zh-CN": "活动进度已可延展到 aelf 生态的下一步。",
          "zh-TW": "Campaign progress is ready to continue across the aelf ecosystem.",
        },
    boundary: ecosystemBoundary,
  };
};

export const createEcosystemNextActionReadModel = (
  campaign: CampaignShellDetail,
  participant: ParticipantSnapshot,
): EcosystemNextActionReadModel => {
  const participation = createParticipationReadModel(campaign, participant);
  const prioritizedRecommendations = prioritizeRecommendations(
    createEcosystemRecommendationDrafts(campaign, participation),
  );

  return {
    campaignId: campaign.id,
    participantWalletAddress: participant.walletAddress,
    summary: createEcosystemSummary(prioritizedRecommendations, participation),
    recommendations: prioritizedRecommendations,
  };
};

export const campaignDiscoveryBoundary: LocalizedText = localized(
  "Seeded/local Campaign Discovery API readiness only. No live marketplace API, App Hub backend, Portfolio sync, Forecast prediction, wallet SDK, contract view/send, claim, export file, reward custody, or reward distribution is connected.",
  "仅 seeded/本地 Campaign Discovery API readiness。不会连接实时 marketplace API、App Hub 后端、Portfolio 同步、Forecast 预测、钱包 SDK、合约读取/发送、claim、导出文件、奖励托管或发奖。",
);

const campaignDiscoveryNextAction: LocalizedText = localized(
  "Use this local discovery surface for User App, App Hub, Portfolio, and Forecast previews until a reviewed marketplace backend exists.",
  "在已审核的 marketplace 后端存在前，使用这个本地 discovery surface 支撑 User App、App Hub、Portfolio 与 Forecast 预览。",
);

const discoveryCtaCopy: Record<CampaignDiscoveryCtaKind, { label: LocalizedText; reason: LocalizedText }> = {
  start: {
    label: localized("Start", "开始"),
    reason: localized(
      "Scheduled campaign can be previewed from discovery before live participation opens.",
      "活动开始前可先从 discovery 预览 scheduled 活动。",
    ),
  },
  continue_tasks: {
    label: localized("Continue tasks", "继续任务"),
    reason: localized(
      "Participant still has required campaign tasks to finish before eligibility review.",
      "参与者仍有必做活动任务需要完成，然后才能进入资格审核。",
    ),
  },
  check_eligibility: {
    label: localized("Check eligibility", "检查资格"),
    reason: localized(
      "Campaign discovery can route the participant to local eligibility review.",
      "Campaign discovery 可以将参与者引导到本地资格审核。",
    ),
  },
  view_results: {
    label: localized("View results", "查看结果"),
    reason: localized(
      "Ended campaign remains discoverable for points, eligibility, and export review.",
      "已结束活动仍可被发现，用于积分、资格与导出审核。",
    ),
  },
};

const createDiscoveryCta = (kind: CampaignDiscoveryCtaKind): CampaignDiscoveryCta => ({
  kind,
  ...discoveryCtaCopy[kind],
});

const discoveryStatusRank: Record<CampaignLifecycleStatus, number> = {
  live: 0,
  paused: 1,
  scheduled: 2,
  draft: 3,
  ended: 4,
  exported: 5,
  archived: 6,
};

const createDiscoveryTaskSummary = (task: CampaignTask): CampaignDiscoveryTaskSummary => ({
  taskId: task.id,
  title: task.title,
  verificationType: task.verificationType,
  points: task.points,
  required: task.required,
});

const createTimeWindowText = (startTime: string, endTime: string): LocalizedText => ({
  "en-US": `${startTime.slice(0, 10)} to ${endTime.slice(0, 10)}`,
  "zh-CN": `${startTime.slice(0, 10)} 至 ${endTime.slice(0, 10)}`,
  "zh-TW": `${startTime.slice(0, 10)} to ${endTime.slice(0, 10)}`,
});

const discoveryConsumerSurfaces = (
  surfaces: CampaignDiscoveryConsumerSurface[],
): CampaignDiscoveryConsumerSurface[] => surfaces;

interface SeededDiscoveryCampaign {
  campaignType: LocalizedText;
  consumerSurfaces: CampaignDiscoveryConsumerSurface[];
  cta: CampaignDiscoveryCtaKind;
  endTime: string;
  id: string;
  points: number;
  slug: string;
  startTime: string;
  status: CampaignStatus;
  subtitle: LocalizedText;
  supportedLocales: SupportedLocale[];
  tags: LocalizedText[];
  tasks: CampaignDiscoveryTaskSummary[];
  title: LocalizedText;
  walletPolicy: CampaignShellDetail["walletPolicy"];
}

const createSeededTask = (
  taskId: string,
  title: LocalizedText,
  verificationType: CampaignTask["verificationType"],
  points: number,
  required: boolean,
): CampaignDiscoveryTaskSummary => ({
  taskId,
  title,
  verificationType,
  points,
  required,
});

const seededDiscoveryCampaigns: SeededDiscoveryCampaign[] = [
  {
    id: "camp-forest-nft-path",
    slug: "forest-nft-quest",
    title: localized("Forest NFT Quest", "Forest NFT 任务", "Forest NFT 任務"),
    subtitle: localized(
      "Preview the NFT and governance path before Forest campaign launch.",
      "在 Forest 活动上线前预览 NFT 与治理路径。",
      "Preview the NFT and governance path before Forest campaign launch.",
    ),
    campaignType: localized("NFT / DAO", "NFT / DAO"),
    status: "scheduled",
    points: 260,
    startTime: "2026-07-05T00:00:00Z",
    endTime: "2026-07-12T00:00:00Z",
    walletPolicy: "ANY",
    supportedLocales: [...supportedLocales],
    consumerSurfaces: discoveryConsumerSurfaces(["user_app", "app_hub", "portfolio"]),
    tags: [
      localized("Forest", "Forest"),
      localized("NFT", "NFT"),
      localized("Governance path", "治理路径"),
    ],
    cta: "start",
    tasks: [
      createSeededTask(
        "forest-hold-nft",
        localized("Hold Forest NFT", "持有 Forest NFT", "持有 Forest NFT"),
        "ON_CHAIN",
        120,
        true,
      ),
      createSeededTask(
        "forest-vote-tmrwdao",
        localized("Vote on TMRWDAO", "参与 TMRWDAO 投票", "參與 TMRWDAO 投票"),
        "DAPP_API",
        90,
        true,
      ),
      createSeededTask(
        "forest-qualified-invite",
        localized("Invite one qualified friend", "邀请 1 位合格好友", "邀請 1 位合格好友"),
        "SOCIAL",
        50,
        false,
      ),
    ],
  },
  {
    id: "camp-tmrwdao-streak",
    slug: "tmrwdao-governance-streak",
    title: localized(
      "TMRWDAO Governance Streak",
      "TMRWDAO 治理连续任务",
      "TMRWDAO 治理連續任務",
    ),
    subtitle: localized(
      "Review the ended governance streak and keep results discoverable.",
      "查看已结束的治理连续任务，并保持结果可被发现。",
      "Review the ended governance streak and keep results discoverable.",
    ),
    campaignType: localized("DAO / Referral", "DAO / Referral"),
    status: "ended",
    points: 180,
    startTime: "2026-06-10T00:00:00Z",
    endTime: "2026-06-18T00:00:00Z",
    walletPolicy: "ANY",
    supportedLocales: [...supportedLocales],
    consumerSurfaces: discoveryConsumerSurfaces(["user_app", "app_hub", "forecast", "portfolio"]),
    tags: [
      localized("TMRWDAO", "TMRWDAO"),
      localized("Governance", "治理"),
      localized("Results review", "结果审核"),
    ],
    cta: "check_eligibility",
    tasks: [
      createSeededTask(
        "tmrwdao-vote",
        localized("Vote on proposal", "完成提案投票", "完成提案投票"),
        "DAPP_API",
        100,
        true,
      ),
      createSeededTask(
        "tmrwdao-review-points",
        localized("Review points", "查看积分", "查看積分"),
        "MANUAL",
        40,
        false,
      ),
      createSeededTask(
        "tmrwdao-check-winners-export",
        localized("Check winners export", "检查 winners 导出", "檢查 winners 匯出"),
        "MANUAL",
        40,
        false,
      ),
    ],
  },
];

const ctaKindForCampaign = (
  status: CampaignStatus,
  participant?: ParticipantSnapshot,
): CampaignDiscoveryCtaKind => {
  if (status === "scheduled" || status === "draft") {
    return "start";
  }

  if (status === "ended" || status === "exported" || status === "archived") {
    return "check_eligibility";
  }

  return participant && participant.missingTaskIds.length > 0
    ? "continue_tasks"
    : "check_eligibility";
};

const createPrimaryDiscoveryItem = (
  campaign: CampaignShellDetail,
  participant?: ParticipantSnapshot,
): CampaignDiscoveryItem => ({
  id: campaign.id,
  slug: campaign.slug,
  title: campaign.title,
  subtitle: campaign.subtitle,
  campaignType: localized("Bridge / Swap / Invite", "Bridge / Swap / Invite"),
  status: campaign.status,
  points: campaign.tasks.reduce((total, task) => total + task.points, 0),
  startTime: campaign.startTime,
  endTime: campaign.endTime,
  timeWindow: createTimeWindowText(campaign.startTime, campaign.endTime),
  coreTasks: campaign.tasks.slice(0, 3).map(createDiscoveryTaskSummary),
  cta: createDiscoveryCta(ctaKindForCampaign(campaign.status, participant)),
  walletPolicy: campaign.walletPolicy,
  supportedLocales: [...campaign.supportedLocales],
  consumerSurfaces: discoveryConsumerSurfaces(["user_app", "app_hub", "portfolio", "forecast"]),
  tags: [
    localized(campaign.projectName, campaign.projectName),
    localized("Bridge", "跨链"),
    localized("Swap", "Swap"),
  ],
  boundary: campaignDiscoveryBoundary,
});

const createSeededDiscoveryItem = (seeded: SeededDiscoveryCampaign): CampaignDiscoveryItem => ({
  id: seeded.id,
  slug: seeded.slug,
  title: seeded.title,
  subtitle: seeded.subtitle,
  campaignType: seeded.campaignType,
  status: seeded.status,
  points: seeded.points,
  startTime: seeded.startTime,
  endTime: seeded.endTime,
  timeWindow: createTimeWindowText(seeded.startTime, seeded.endTime),
  coreTasks: seeded.tasks.slice(0, 3),
  cta: createDiscoveryCta(seeded.cta),
  walletPolicy: seeded.walletPolicy,
  supportedLocales: [...seeded.supportedLocales],
  consumerSurfaces: [...seeded.consumerSurfaces],
  tags: [...seeded.tags],
  boundary: campaignDiscoveryBoundary,
});

const createDiscoveryDetail = (
  item: CampaignDiscoveryItem,
  tasks: CampaignDiscoveryTaskSummary[],
): CampaignDiscoveryDetail => ({
  item,
  tasks,
  eligibilityEntry: localized(
    "Route users to the local eligibility checker before any reward or export decision.",
    "在任何奖励或导出决策前，将用户引导到本地资格检查器。",
  ),
  rewardBoundary,
  appHubContext: localized(
    "App Hub may display this campaign as seeded/local discovery content only.",
    "App Hub 只能将该活动展示为 seeded/本地 discovery 内容。",
  ),
  portfolioContext: localized(
    "Portfolio may use this campaign as a local checkpoint without portfolio sync.",
    "Portfolio 可以将该活动用作本地检查点，但不会执行 Portfolio 同步。",
  ),
  forecastContext: localized(
    "Forecast may read campaign context without prediction transactions or live Forecast service calls.",
    "Forecast 可以读取活动上下文，但不会执行预测交易或调用真实 Forecast 服务。",
  ),
  boundary: campaignDiscoveryBoundary,
});

const createDiscoverySummary = (
  items: CampaignDiscoveryItem[],
): CampaignDiscoveryReadModel["summary"] => ({
  totalCampaigns: items.length,
  liveCount: items.filter((item) => item.status === "live").length,
  scheduledCount: items.filter((item) => item.status === "scheduled" || item.status === "draft").length,
  endedCount: items.filter((item) =>
    item.status === "ended" || item.status === "exported" || item.status === "archived"
  ).length,
  appHubReadyCount: items.filter((item) => item.consumerSurfaces.includes("app_hub")).length,
  portfolioReadyCount: items.filter((item) => item.consumerSurfaces.includes("portfolio")).length,
  forecastReadyCount: items.filter((item) => item.consumerSurfaces.includes("forecast")).length,
  topCampaignId: items[0]?.id ?? "",
});

export const createCampaignDiscoveryReadModel = (
  campaign: CampaignShellDetail,
  participant?: ParticipantSnapshot,
): CampaignDiscoveryReadModel => {
  const primaryItem = createPrimaryDiscoveryItem(campaign, participant);
  const seededItems = seededDiscoveryCampaigns.map(createSeededDiscoveryItem);
  const items = [primaryItem, ...seededItems].sort((left, right) => {
    const statusDelta = discoveryStatusRank[left.status] - discoveryStatusRank[right.status];

    if (statusDelta !== 0) {
      return statusDelta;
    }

    return left.id.localeCompare(right.id);
  });
  const taskMap = new Map<string, CampaignDiscoveryTaskSummary[]>([
    [campaign.id, campaign.tasks.map(createDiscoveryTaskSummary)],
    ...seededDiscoveryCampaigns.map((seeded) => [seeded.id, seeded.tasks] as const),
  ]);

  return {
    campaignId: campaign.id,
    items,
    details: items.map((item) => createDiscoveryDetail(item, taskMap.get(item.id) ?? item.coreTasks)),
    summary: createDiscoverySummary(items),
    boundary: campaignDiscoveryBoundary,
    nextAction: campaignDiscoveryNextAction,
  };
};

export const createExportPreview = (
  campaignId: string,
  participants: ParticipantSnapshot[],
  tasks: CampaignTask[],
  sessions: CampaignShellDetail["walletSessions"] = [],
): ExportPreview => ({
  campaignId,
  columns: exportCsvColumns,
  disclaimer: "Export winners does not distribute rewards.",
  confirmation: createExportConfirmation(),
  rows: createExportEvidenceRows(campaignId, participants, tasks, sessions).map<ExportPreviewRow>((row) => ({
    campaignId: row.campaignId,
    walletAddress: row.walletAddress,
    accountType: row.accountType,
    walletSource: row.walletSource,
    localePreference: row.localePreference,
    totalPoints: row.totalPoints,
    rank: row.rank,
    eligible: row.eligible,
    missingTasks: row.missingTasks,
    riskFlags: row.riskFlags,
    referrerAddress: row.referrerAddress,
    taskRecords: row.taskRecords,
    evidenceHashes: row.evidenceHashes,
    exportBatchId: row.exportBatchId,
    walletTypeVerified: row.walletTypeVerified,
    rowStatus: row.rowStatus,
    missingColumnValues: row.missingColumnValues,
  })),
});

export const createExportConfirmationReadinessGate = (
  campaign: CampaignShellDetail,
): ExportConfirmationReadinessGate => {
  const preview = createExportPreview(
    campaign.id,
    campaign.participants,
    campaign.tasks,
    campaign.walletSessions,
  );
  const rows = preview.rows;
  const acknowledgements = createExportAcknowledgements();

  return {
    campaignId: campaign.id,
    batchId: rows[0]?.exportBatchId ?? exportBatchId,
    summary: {
      totalRows: rows.length,
      readyRows: rows.filter((row) => row.rowStatus === "ready").length,
      reviewRequiredRows: rows.filter((row) => row.rowStatus === "review_required").length,
      blockedRows: rows.filter((row) => row.rowStatus === "blocked").length,
      requiredAcknowledgements: acknowledgements.filter((item) => item.required).length,
      acknowledgedItems: acknowledgements.filter((item) => item.acknowledged).length,
      previewModeCount: 2,
    },
    previewModes: [
      createPreviewModeReadiness("csv", preview.columns),
      createPreviewModeReadiness("json", preview.columns),
    ],
    fieldCoverage: createExportFieldCoverage(preview.columns),
    rowStatusCoverage: createRowStatusCoverage(rows),
    acknowledgements,
    contractRootReadiness: [
      createContractRootReadiness("none"),
      createContractRootReadiness("eligibility_root"),
      createContractRootReadiness("winners_root"),
      createContractRootReadiness("contract_claim"),
    ],
    boundary: exportConfirmationReadinessBoundary,
    nextAction: exportReadinessNextAction,
  };
};

const participantOperationsBoundary: LocalizedText = {
  "en-US":
    "Seeded/local participant operations only. Risk flags and eligibility are review inputs; Campaign OS does not distribute rewards and the campaign project owns fulfillment.",
  "zh-CN":
    "仅 seeded/本地参与者运营视图。风险标记与资格结果仅作为审核输入；Campaign OS 不执行发奖，奖励履约由活动项目方负责。",
  "zh-TW":
    "Seeded/local participant operations only. Risk flags and eligibility are review inputs; Campaign OS does not distribute rewards and the campaign project owns fulfillment.",
};

const settingsReadinessBoundary: LocalizedText = {
  "en-US":
    "Read-only seeded/local campaign settings readiness. No live settings save, backend mutation, wallet action, contract transaction, export file, reward custody, or reward distribution is executed.",
  "zh-CN":
    "只读 seeded/本地活动设置 readiness。不会保存真实设置、写入后端、执行钱包动作、合约交易、导出文件、奖励托管或发奖。",
  "zh-TW":
    "Read-only seeded/local campaign settings readiness. No live settings save, backend mutation, wallet action, contract transaction, export file, reward custody, or reward distribution is executed.",
};

const participantExportStatusLabels: Record<ParticipantOperationsExportStatus, LocalizedText> = {
  blocked: localized("Blocked", "阻断"),
  pending: localized("Pending", "待处理"),
  ready: localized("Export ready", "导出就绪"),
  review_required: localized("Review required", "需要审核"),
};

const participantExportNextAction = (
  status: ParticipantOperationsExportStatus,
  row?: ExportPreviewRow,
): LocalizedText => {
  if (status === "ready") {
    return localized(
      "Keep the participant in the export preview until project-owned fulfillment review.",
      "在项目方履约审核前保持该参与者位于导出预览中。",
    );
  }

  if (status === "blocked") {
    const missingTasks = row?.missingTasks.join(", ");

    return localized(
      missingTasks
        ? `Resolve missing required tasks before export review: ${missingTasks}.`
        : "Resolve missing wallet or export metadata before export review.",
      missingTasks
        ? `导出审核前先处理缺失必做任务：${missingTasks}。`
        : "导出审核前先处理缺失的钱包或导出元数据。",
    );
  }

  if (status === "review_required") {
    const riskFlags = row?.riskFlags.join(", ");

    return localized(
      riskFlags
        ? `Route risk flags to manual review before winner export: ${riskFlags}.`
        : "Review eligibility and export evidence before approving this participant.",
      riskFlags
        ? `导出 winners 前将风险标记交给人工审核：${riskFlags}。`
        : "批准该参与者前先审核资格与导出证据。",
    );
  }

  return localized(
    "Wait for pending task verification before export eligibility is trusted.",
    "等待任务验证完成后再信任导出资格。",
  );
};

const participantOperationsExportStatus = (
  participant: ParticipantSnapshot,
  missingRequiredTasks: CampaignTask[],
  row?: ExportPreviewRow,
): ParticipantOperationsExportStatus => {
  if (missingRequiredTasks.length > 0 || row?.rowStatus === "blocked" || (row?.missingColumnValues.length ?? 0) > 0) {
    return "blocked";
  }

  if (participant.riskFlags.length > 0 || (row?.riskFlags.length ?? 0) > 0) {
    return "review_required";
  }

  if (participant.eligible && row?.rowStatus === "ready") {
    return "ready";
  }

  return "pending";
};

const createParticipantOperationsRow = (
  campaign: CampaignShellDetail,
  participant: ParticipantSnapshot,
  exportRowsByWallet: Map<string, ExportPreviewRow>,
): ParticipantOperationsRow => {
  const taskStates = deriveParticipantTaskStates(campaign.tasks, participant);
  const completedTasks = taskStates.filter((state) => state.completed).length;
  const row = exportRowsByWallet.get(participant.walletAddress);
  const missingRequiredTasks = computeMissingTasks(campaign.tasks, participant);
  const exportStatus = participantOperationsExportStatus(participant, missingRequiredTasks, row);

  return {
    participantId: participant.id,
    walletAddress: participant.walletAddress,
    accountType: participant.accountType,
    walletSource: participant.walletSource,
    localePreference: participant.localePreference,
    completedTasks,
    totalTasks: campaign.tasks.length,
    taskProgressLabel: localized(
      `${completedTasks}/${campaign.tasks.length} tasks`,
      `${completedTasks}/${campaign.tasks.length} 个任务`,
    ),
    eligible: participant.eligible,
    riskFlags: [...participant.riskFlags],
    exportStatus,
    exportStatusLabel: participantExportStatusLabels[exportStatus],
    nextAction: participantExportNextAction(exportStatus, row),
    rewardBoundary,
  };
};

const emptyLocaleCounts = (): Record<SupportedLocale, number> => ({
  "en-US": 0,
  "zh-CN": 0,
  "zh-TW": 0,
});

export const createParticipantOperationsReadModel = (
  campaign: CampaignShellDetail,
): ParticipantOperationsReadModel => {
  const exportPreview = createExportPreview(
    campaign.id,
    campaign.participants,
    campaign.tasks,
    campaign.walletSessions,
  );
  const exportRowsByWallet = new Map(
    exportPreview.rows.map((row) => [row.walletAddress, row]),
  );
  const rows = campaign.participants.map((participant) =>
    createParticipantOperationsRow(campaign, participant, exportRowsByWallet),
  );
  const localeCounts = emptyLocaleCounts();

  for (const row of rows) {
    localeCounts[row.localePreference] += 1;
  }

  return {
    campaignId: campaign.id,
    summary: {
      totalParticipants: rows.length,
      eligibleParticipants: rows.filter((row) => row.eligible).length,
      exportReadyParticipants: rows.filter((row) => row.exportStatus === "ready").length,
      reviewRequiredParticipants: rows.filter((row) => row.exportStatus === "review_required").length,
      blockedParticipants: rows.filter((row) => row.exportStatus === "blocked").length,
      pendingParticipants: rows.filter((row) => row.exportStatus === "pending").length,
      aaWalletParticipants: rows.filter((row) => row.accountType === "AA").length,
      eoaWalletParticipants: rows.filter((row) => row.accountType === "EOA").length,
      riskFlaggedParticipants: rows.filter((row) => row.riskFlags.length > 0).length,
      localeCounts,
    },
    rows,
    boundary: participantOperationsBoundary,
  };
};

const settingsStateFromCounts = (
  blockedCount: number,
  reviewRequiredCount: number,
): CampaignSettingsReadinessState =>
  blockedCount > 0 ? "blocked" : reviewRequiredCount > 0 ? "review_required" : "ready";

const settingsValueFromState = (state: CampaignSettingsReadinessState): LocalizedText => {
  if (state === "ready") {
    return localized("Ready", "就绪");
  }

  return state === "blocked" ? localized("Blocked", "阻断") : localized("Review required", "需要审核");
};

const createSettingsGroup = ({
  currentValue,
  evidence,
  id,
  label,
  nextAction,
  ownerRole,
  readiness,
}: CampaignSettingsGroup): CampaignSettingsGroup => ({
  currentValue,
  evidence,
  id,
  label,
  nextAction,
  ownerRole,
  readiness,
});

const settingsGroupPriority = (state: CampaignSettingsReadinessState) =>
  state === "blocked" ? 0 : state === "review_required" ? 1 : 2;

export const createCampaignSettingsReadiness = (
  campaign: CampaignShellDetail,
): CampaignSettingsReadiness => {
  const exportReadiness = createExportConfirmationReadinessGate(campaign);
  const translationManager = createTranslationManagerReadModel(campaign);
  const riskIntelligence = createRiskIntelligenceReviewSurface(campaign);
  const i18nReviewCount = translationManager.localeItems.filter((item) => item.publishState !== "ready").length;
  const riskReviewCount = riskIntelligence.summary.reviewRequiredCount + riskIntelligence.summary.highSeverityCount;
  const publishState: CampaignSettingsReadinessState = campaign.publishReadiness.blockers.length > 0
    ? "blocked"
    : campaign.publishReadiness.warnings.length > 0
      ? "review_required"
      : "ready";
  const exportState = settingsStateFromCounts(
    exportReadiness.summary.blockedRows,
    exportReadiness.summary.reviewRequiredRows,
  );
  const riskState = settingsStateFromCounts(riskIntelligence.summary.blockedCount, riskReviewCount);
  const i18nState = settingsStateFromCounts(0, i18nReviewCount);
  const groups: CampaignSettingsGroup[] = [
    createSettingsGroup({
      id: "wallet-policy",
      label: localized("Wallet policy", "钱包策略"),
      currentValue: localized(`${campaign.walletPolicy} · AA and EOA supported`, `${campaign.walletPolicy} · 支持 AA 与 EOA`),
      readiness: "ready",
      ownerRole: "project_owner",
      evidence: localized(
        `${campaign.metrics.aaWallets} AA / ${campaign.metrics.eoaWallets} EOA wallets in the seeded campaign.`,
        `Seeded 活动中有 ${campaign.metrics.aaWallets} 个 AA / ${campaign.metrics.eoaWallets} 个 EOA 钱包。`,
      ),
      nextAction: localized(
        "Keep Any wallet policy unless a future campaign intentionally restricts wallet type.",
        "保持 Any 钱包策略，除非后续活动明确限制钱包类型。",
      ),
    }),
    createSettingsGroup({
      id: "contract-mode",
      label: localized("Contract mode", "合约模式"),
      currentValue: contractModeLabels[campaign.contractMode],
      readiness: campaign.contractMode === "CONTRACT_CLAIM" ? "blocked" : "ready",
      ownerRole: "contract_reviewer",
      evidence: contractBoundaryByMode[campaign.contractMode],
      nextAction: contractNextActionByMode[campaign.contractMode],
    }),
    createSettingsGroup({
      id: "reward-responsibility",
      label: localized("Reward responsibility", "奖励责任"),
      currentValue: localized("Campaign project owns reward fulfillment", "活动项目方负责奖励履约"),
      readiness: "ready",
      ownerRole: "project_owner",
      evidence: rewardBoundary,
      nextAction: localized(
        "Keep reward copy and export confirmations clear before publish.",
        "发布前保持奖励文案与导出确认清晰。",
      ),
    }),
    createSettingsGroup({
      id: "i18n-fallback",
      label: localized("i18n fallback", "i18n 回退"),
      currentValue: localized(`${i18nReviewCount} locales need review`, `${i18nReviewCount} 个语言需要审核`),
      readiness: i18nState,
      ownerRole: "project_owner",
      evidence: noAutoPublishNotice,
      nextAction: localized(
        "Review fallback and AI draft locale rows before final publish.",
        "最终发布前审核回退与 AI 草稿语言行。",
      ),
    }),
    createSettingsGroup({
      id: "verification-risk",
      label: localized("Verification and risk posture", "验证与风险姿态"),
      currentValue: settingsValueFromState(riskState),
      readiness: riskState,
      ownerRole: "internal_operator",
      evidence: riskIntelligence.boundary,
      nextAction: localized(
        "Review risk dimensions and manual-review rows before export approval.",
        "导出批准前审核风险维度与人工审核行。",
      ),
    }),
    createSettingsGroup({
      id: "export-policy",
      label: localized("Export policy", "导出策略"),
      currentValue: localized(
        `${exportReadiness.summary.readyRows} ready / ${exportReadiness.summary.reviewRequiredRows} review / ${exportReadiness.summary.blockedRows} blocked`,
        `${exportReadiness.summary.readyRows} 就绪 / ${exportReadiness.summary.reviewRequiredRows} 需审核 / ${exportReadiness.summary.blockedRows} 阻断`,
      ),
      readiness: exportState,
      ownerRole: "project_owner",
      evidence: exportReadiness.boundary,
      nextAction: exportReadiness.nextAction,
    }),
    createSettingsGroup({
      id: "publish-prerequisites",
      label: localized("Publish prerequisites", "发布前置条件"),
      currentValue: settingsValueFromState(publishState),
      readiness: publishState,
      ownerRole: publishState === "blocked" ? "contract_reviewer" : "project_owner",
      evidence: localized(
        `${campaign.publishReadiness.blockers.length} blockers / ${campaign.publishReadiness.warnings.length} warnings.`,
        `${campaign.publishReadiness.blockers.length} 个阻断 / ${campaign.publishReadiness.warnings.length} 个警告。`,
      ),
      nextAction: localized(
        "Resolve publish blockers and warnings before treating settings as final.",
        "将设置视为最终态前先处理发布阻断与警告。",
      ),
    }),
  ];
  const sortedGroups = [...groups].sort((left, right) =>
    settingsGroupPriority(left.readiness) - settingsGroupPriority(right.readiness),
  );

  return {
    campaignId: campaign.id,
    summary: {
      totalGroups: groups.length,
      readyGroups: groups.filter((group) => group.readiness === "ready").length,
      reviewRequiredGroups: groups.filter((group) => group.readiness === "review_required").length,
      blockedGroups: groups.filter((group) => group.readiness === "blocked").length,
      topNextAction: sortedGroups[0]?.nextAction ?? localized("Keep settings under review.", "继续审核设置。"),
    },
    groups,
    boundary: settingsReadinessBoundary,
  };
};

export const createAdminOpsReadModel = (
  campaign: CampaignShellDetail,
): AdminOpsReadModel => {
  const exportBatch = createExportBatch(campaign);
  const advancedAnalytics = createAdvancedAnalyticsReadiness(campaign, exportBatch);
  const aiOptimization = createAiOptimizationWorkflow(campaign);
  const walletProviderQaGate = createWalletProviderQaReadinessGate(campaign.walletSessions);
  const aelfWebLoginAdapterReadiness = createAelfWebLoginAdapterReadiness(campaign.walletSessions);
  const providerEvidenceRegistry = createProviderEvidenceRegistry(campaign);
  const lifecycleOperations = createCampaignLifecycleOperations(campaign);
  const riskIntelligence = createRiskIntelligenceReviewSurface(campaign);
  const launchConsoleCampaignBundles = createLaunchConsoleCampaignBundles(campaign);

  return {
    campaignId: campaign.id,
    reviewQueue: campaign.reviewItems,
    deliveryChecklistReadiness: createDeliveryChecklistReadinessConsole(walletProviderQaGate),
    walletProviderQaGate,
    aelfWebLoginAdapterReadiness,
    providerEvidenceRegistry,
    contractReviewCenter: createAdminContractReviewCenter(campaign),
    contractInterfaceMatrix: createContractInterfaceMatrixConsole(),
    contractTransparencyMonitor: createContractTransparencyMonitor(campaign),
    aiContentPack: createAiContentPackWorkbench(campaign),
    templateGovernance: createTemplateGovernanceConsole(),
    analytics: createAnalytics(campaign, exportBatch),
    funnel: campaign.conversionFunnel,
    walletSplit: createWalletSplit(campaign.participants),
    localeSplit: createLocaleSplit(campaign.participants),
    advancedAnalytics,
    riskSignals: campaign.riskSignals,
    riskIntelligence,
    launchConsoleCampaignBundles,
    aiReports: campaign.aiOpsReports,
    aiOptimization,
    ecosystemMetrics: campaign.ecosystemMetrics,
    exportBatch,
    lifecycleOperations,
  };
};

export const createTranslationManagerReadModel = (
  campaign: Pick<CampaignShellDetail, "id" | "defaultLocale" | "supportedLocales" | "contentRevisions">,
): TranslationManagerReadModel => {
  const panels = campaign.contentRevisions
    .filter((revision) => campaign.supportedLocales.includes(revision.locale))
    .map(createTranslationPanel);
  const englishPanel = panels.find((panel) => panel.locale === "en-US");
  const targetPanel = panels.find((panel) => panel.locale === "zh-CN") ??
    panels.find((panel) => panel.locale !== "en-US");

  return {
    campaignId: campaign.id,
    defaultLocale: campaign.defaultLocale,
    fallbackLocale: "en-US",
    supportedLocales: [...campaign.supportedLocales],
    sourceLocale: "en-US",
    panels,
    localeItems: createTranslationLocaleItems(campaign.supportedLocales, panels),
    comparisonRows: createTranslationComparisonRows(englishPanel, targetPanel),
    rewardDisclaimers: createRewardDisclaimerRows(campaign.supportedLocales, panels, englishPanel),
    compareReviewPrompt,
    noAutoPublishNotice,
  };
};

const createContractImpactOption = (
  mode: ContractMode,
  selectedMode: ContractMode,
): ContractImpactReviewOption => {
  const reviewSeverity: ReviewSeverity =
    mode === "CONTRACT_CLAIM" ? "blocker" : mode === "V2_COMPANION" ? "warning" : "info";

  return {
    mode,
    label: contractModeLabels[mode],
    description: contractModeDescriptions[mode],
    reviewSeverity,
    publishState: publishStateFromSeverity(reviewSeverity),
    requiresVerifierRole: mode !== "OFF_CHAIN_MVP",
    requiresMetadataHash: mode !== "OFF_CHAIN_MVP",
    requiresHighImpactReview: mode === "CONTRACT_CLAIM",
    boundary:
      mode === selectedMode && mode === "CONTRACT_CLAIM"
        ? {
            "en-US": "Selected contract claim remains blocked; no contract transaction is executed.",
            "zh-CN": "已选择的合约领取仍被阻断；不会执行合约交易。",
            "zh-TW": "Selected contract claim remains blocked; no contract transaction is executed.",
          }
        : contractBoundaryByMode[mode],
    nextAction: contractNextActionByMode[mode],
  };
};

export const createContractImpactReviewModel = (
  campaign: Pick<CampaignShellDetail, "id" | "contractMode">,
): ContractImpactReviewModel => ({
  campaignId: campaign.id,
  selectedMode: campaign.contractMode,
  safeDefaultMode: "OFF_CHAIN_MVP",
  options: (["OFF_CHAIN_MVP", "V2_COMPANION", "CONTRACT_CLAIM"] as const).map((mode) =>
    createContractImpactOption(mode, campaign.contractMode),
  ),
  rewardBoundary,
});

export const computePublishReadiness = (
  campaign: Pick<CampaignShellDetail, "contractMode">,
  contentRevisions: ContentRevision[],
): PublishReadiness => {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const englishContent = contentRevisions.find((revision) => revision.locale === "en-US");
  const chineseContent = contentRevisions.filter((revision) => revision.locale.startsWith("zh-"));

  if (campaign.contractMode === "CONTRACT_CLAIM") {
    blockers.push("Contract claim mode requires high-impact manual review.");
  }

  if (!englishContent?.rewardDisclaimer?.trim()) {
    blockers.push("English reward disclaimer is required before publish.");
  }

  if (chineseContent.some((revision) => revision.status !== "human_reviewed" && revision.status !== "published")) {
    warnings.push("Chinese locale content falls back to English until reviewed.");
  }

  return {
    ready: blockers.length === 0,
    blockers,
    warnings,
  };
};
