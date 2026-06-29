import type {
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
  CampaignShareCardReadiness,
  CampaignCommandCenterSummary,
  CampaignCommandItem,
  CampaignCommandPriority,
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
  DeliveryChecklistGroup,
  DeliveryChecklistGroupId,
  DeliveryChecklistItem,
  DeliveryChecklistReadinessConsole,
  DeliveryChecklistStatus,
  DimensionSplit,
  EligibilityResult,
  EcosystemNextActionProduct,
  EcosystemNextActionRecommendation,
  EcosystemNextActionReadModel,
  EcosystemRecommendationPriority,
  EcosystemRecommendationStatus,
  ExportConfirmation,
  ExportCsvColumn,
  ExportBatchSummary,
  ExportEvidenceRow,
  EvidenceSource,
  ExportPreview,
  ExportPreviewRow,
  EligibilityCheckerReadModel,
  EligibilityCheckEntry,
  EligibilityCheckResult,
  EligibilityMissingTaskDetail,
  RiskSignal,
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
  ParticipationMetrics,
  ParticipationReadModel,
  ParticipantSnapshot,
  ParticipantTaskState,
  ProjectCampaignCommandCenter,
  PublishState,
  PublishReadiness,
  ReferralSummary,
  RewardDisclaimerReviewRow,
  ReviewSeverity,
  TaskVerificationStatus,
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
  createWalletProviderQaReadinessGate,
  deriveEligibilityWalletStatus,
  isWalletSessionVerified,
} from "./wallet";
import { EXPORT_CSV_COLUMNS as exportCsvColumns, supportedLocales } from "./types";
import { createTemplateGovernanceConsole } from "./builder";
import { createLocalizedCampaignPath } from "./locale";

const defaultPointsThreshold = 160;
const defaultEligibleRankCutoff = 100;
const exportBatchId = "export-awaken-sprint-preview";

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

const aiOptimizationBoundary: LocalizedText = {
  "en-US":
    "Seeded/local AI optimization workflow only. No live AI provider, analytics SDK, risk scoring, export file, wallet action, contract transaction, reward custody, or reward distribution is executed.",
  "zh-CN":
    "仅 seeded/本地 AI 优化工作流。不会执行实时 AI、分析 SDK、风险评分、导出文件、钱包动作、合约交易、奖励托管或发奖。",
  "zh-TW":
    "Seeded/local AI optimization workflow only. No live AI provider, analytics SDK, risk scoring, export file, wallet action, contract transaction, reward custody, or reward distribution is executed.",
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

  if (campaign.status === "ended" || campaign.status === "exported") {
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

const exportDecisionBoundary: LocalizedText = {
  "en-US": "Campaign OS exports verified records only and does not distribute rewards; the campaign project owns reward fulfillment.",
  "zh-CN": "Campaign OS 只导出已验证记录，不执行发奖；奖励履约由活动项目方负责。",
  "zh-TW": "Campaign OS exports verified records only and does not distribute rewards; the campaign project owns reward fulfillment.",
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

  return status === "exported" ? "watch" : "secondary";
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
  const aiOptimization = createAiOptimizationWorkflow(campaign);

  return {
    summary: createCommandSummary(campaigns, analyticsExport.readyRows),
    campaigns,
    analyticsExport,
    aiOptimization,
    boundary: commandCenterBoundary,
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
          "en-US": "Keep runtime locales limited to en-US and zh-CN until a separate locale expansion is approved.",
          "zh-CN": "运行时语言保持 en-US 与 zh-CN，除非另行批准语言扩展。",
          "zh-TW": "Keep runtime locales limited to en-US and zh-CN until a separate locale expansion is approved.",
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

const localized = (enUS: string, zhCN: string, zhTW = enUS): LocalizedText => ({
  "en-US": enUS,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
});

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
        "The global header exposes English and Simplified Chinese options.",
        "全局 Header 暴露 English 与简体中文选项。",
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
      label: localized("Additional locale expansion is deferred", "额外语言扩展已后置"),
      status: "deferred",
      ownerRole: "project_owner",
      surface: localized("Locale governance", "语言治理"),
      evidence: localized(
        "Runtime support intentionally remains English and Simplified Chinese for this MVP.",
        "当前 MVP 运行时有意仅支持 English 与简体中文。",
      ),
      nextAction: localized(
        "Open a separate locale expansion mission if more locales become required.",
        "若需要更多语言，单独开启语言扩展 mission。",
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
        "Seeded fixtures normalize address, account type, wallet source, chain, network, capabilities, and signature status.",
        "Seeded fixtures 归一化 address、account type、wallet source、chain、network、capabilities 与 signature status。",
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

export const createAdminOpsReadModel = (
  campaign: CampaignShellDetail,
): AdminOpsReadModel => {
  const exportBatch = createExportBatch(campaign);
  const aiOptimization = createAiOptimizationWorkflow(campaign);
  const walletProviderQaGate = createWalletProviderQaReadinessGate(campaign.walletSessions);

  return {
    campaignId: campaign.id,
    reviewQueue: campaign.reviewItems,
    deliveryChecklistReadiness: createDeliveryChecklistReadinessConsole(walletProviderQaGate),
    walletProviderQaGate,
    contractReviewCenter: createAdminContractReviewCenter(campaign),
    contractInterfaceMatrix: createContractInterfaceMatrixConsole(),
    aiContentPack: createAiContentPackWorkbench(campaign),
    templateGovernance: createTemplateGovernanceConsole(),
    analytics: createAnalytics(campaign, exportBatch),
    funnel: campaign.conversionFunnel,
    walletSplit: createWalletSplit(campaign.participants),
    localeSplit: createLocaleSplit(campaign.participants),
    riskSignals: campaign.riskSignals,
    aiReports: campaign.aiOpsReports,
    aiOptimization,
    ecosystemMetrics: campaign.ecosystemMetrics,
    exportBatch,
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
