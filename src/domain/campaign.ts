import type {
  AdminOpsReadModel,
  AiContentArtifact,
  AiContentArtifactDraft,
  AiContentArtifactLifecycle,
  AiContentPackSummary,
  AiContentPackWorkbench,
  AiContentQualityGate,
  AnalyticsExportDecision,
  AnalyticsKpi,
  AdminContractReviewCenter,
  CampaignCommandCenterSummary,
  CampaignCommandItem,
  CampaignCommandPriority,
  ConversionFunnelStep,
  CampaignShellDetail,
  CampaignTask,
  ContentRevision,
  ContractImpactReviewModel,
  ContractImpactReviewOption,
  ContractReviewChecklistItem,
  ContractMode,
  ContractEvolutionStep,
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
  LocalizedText,
  ParticipationMetrics,
  ParticipationReadModel,
  ParticipantSnapshot,
  ParticipantTaskState,
  ProjectCampaignCommandCenter,
  PublishState,
  PublishReadiness,
  ReferralSummary,
  ReviewSeverity,
  TaskVerificationStatus,
  TranslationCompareField,
  TranslationComparisonRow,
  TranslationLocaleItem,
  TranslationManagerReadModel,
  TranslationReviewPanel,
  UserWinnersExportRow,
  UserWinnersExportStatus,
  UserWinnersExportStatusReadModel,
} from "./types";
import { deriveEligibilityWalletStatus, isWalletSessionVerified } from "./wallet";
import { EXPORT_CSV_COLUMNS as exportCsvColumns } from "./types";
import { createTemplateGovernanceConsole } from "./builder";

const defaultPointsThreshold = 160;
const defaultEligibleRankCutoff = 100;
const exportBatchId = "export-awaken-sprint-preview";

const defaultReferralRule: LocalizedText = {
  "en-US": "Only qualified invitees who complete valid tasks count for referral points.",
  "zh-CN": "只有完成有效任务的合格被邀请人才会计入推荐积分。",
};

const rewardBoundary: LocalizedText = {
  "en-US": "Rewards are provided by the campaign project. Export winners does not distribute rewards.",
  "zh-CN": "奖励由活动项目方提供。导出 winners 不等于发奖。",
};

const exportRiskBoundary: LocalizedText = {
  "en-US": "Risk flags and eligibility results are review inputs; Campaign OS does not distribute rewards.",
  "zh-CN": "风险标记与资格结果仅作为审核输入；Campaign OS 不执行发奖。",
};

const exportFulfillmentOwner: LocalizedText = {
  "en-US": "Final reward distribution is handled by the campaign project.",
  "zh-CN": "最终奖励发放由活动项目方处理。",
};

const userWinnersExportStatusLabels: Record<UserWinnersExportStatus, LocalizedText> = {
  ready: {
    "en-US": "Ready for export",
    "zh-CN": "导出就绪",
  },
  review_required: {
    "en-US": "Manual review required",
    "zh-CN": "需要人工审核",
  },
  blocked: {
    "en-US": "Blocked before export",
    "zh-CN": "导出前阻断",
  },
  pending: {
    "en-US": "Pending verification",
    "zh-CN": "等待验证",
  },
};

const eligibilityCheckerBoundary: LocalizedText = {
  "en-US": "Seeded/local eligibility preview only. No live wallet SDK, signature, indexer, dApp API, contract proof, export file, or reward distribution is executed.",
  "zh-CN": "仅 seeded/本地资格预览。不会执行实时钱包 SDK、签名、indexer、dApp API、合约证明、导出文件或发奖。",
};

const leaderboardBoundary: LocalizedText = {
  "en-US": "Seeded/local leaderboard preview only. Rankings are review inputs; Campaign OS does not distribute rewards and the campaign project owns fulfillment.",
  "zh-CN": "仅 seeded/本地排行榜预览。排名是审核输入；Campaign OS 不执行发奖，奖励履约由活动项目方负责。",
};

const noAutoPublishNotice: LocalizedText = {
  "en-US": "AI generated translation cannot auto-publish before human review.",
  "zh-CN": "AI 生成翻译必须经过人工审核后才能发布。",
};

const compareReviewPrompt: LocalizedText = {
  "en-US": "Compare the zh-CN draft with the English source before marking it reviewed or publishing a revision.",
  "zh-CN": "标记已审核或发布版本前，先将 zh-CN 草稿与英文源内容对照。",
};

const aiContentBoundary = {
  title: {
    "en-US": "No auto-publish boundary",
    "zh-CN": "禁止自动发布边界",
  },
  body: {
    "en-US": "Seeded/local content pack only. No live AI provider, scheduler, channel bot, webhook, or external publish action is connected.",
    "zh-CN": "仅 seeded/本地内容包。不会连接实时 AI、排期器、频道机器人、webhook 或外部发布动作。",
  },
};

const aiContentDraftBlockedReason: LocalizedText = {
  "en-US": "Human review required before copy can be scheduled or published.",
  "zh-CN": "排期或发布前必须完成人工审核。",
};

const aiContentApprovedNextAction: LocalizedText = {
  "en-US": "Copy ready; schedule/publish intent remains local until an operator confirms the external channel.",
  "zh-CN": "可复制；排期/发布意图仍为本地状态，直到运营确认外部渠道。",
};

const aiContentDraftNextAction: LocalizedText = {
  "en-US": "Edit and mark reviewed before release intent.",
  "zh-CN": "先编辑并标记已审核，再进入发布意图。",
};

const aiContentEditedNextAction: LocalizedText = {
  "en-US": "Human approval is still required before release intent.",
  "zh-CN": "进入发布意图前仍需要人工批准。",
};

const localeLabels: Record<ContentRevision["locale"], LocalizedText> = {
  "en-US": {
    "en-US": "English source",
    "zh-CN": "英文源内容",
  },
  "zh-CN": {
    "en-US": "Chinese draft",
    "zh-CN": "中文草稿",
  },
};

const comparisonFieldLabels: Record<TranslationCompareField, LocalizedText> = {
  description: {
    "en-US": "Description",
    "zh-CN": "活动描述",
  },
  rewardDisclaimer: {
    "en-US": "Reward disclaimer",
    "zh-CN": "奖励声明",
  },
  socialPost: {
    "en-US": "Social post",
    "zh-CN": "社交文案",
  },
  title: {
    "en-US": "Campaign title",
    "zh-CN": "活动标题",
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
};

const contractModeLabels: Record<ContractMode, LocalizedText> = {
  CONTRACT_CLAIM: {
    "en-US": "Contract claim",
    "zh-CN": "合约领取",
  },
  OFF_CHAIN_MVP: {
    "en-US": "Off-chain MVP",
    "zh-CN": "Off-chain MVP",
  },
  V2_COMPANION: {
    "en-US": "V2 companion",
    "zh-CN": "V2 辅助合约",
  },
};

const contractModeDescriptions: Record<ContractMode, LocalizedText> = {
  CONTRACT_CLAIM: {
    "en-US": "Blocked until high-impact manual review approves claim-mode risk.",
    "zh-CN": "在高影响人工审核批准领取模式风险前保持阻断。",
  },
  OFF_CHAIN_MVP: {
    "en-US": "Safe default for MVP; no contract migration is required.",
    "zh-CN": "MVP 的安全默认模式；不需要合约迁移。",
  },
  V2_COMPANION: {
    "en-US": "Future companion-contract path for auditable metadata and eligibility roots.",
    "zh-CN": "未来通过辅助合约审计 metadata 与资格 root。",
  },
};

const contractBoundaryByMode: Record<ContractMode, LocalizedText> = {
  CONTRACT_CLAIM: {
    "en-US": "Contract claim is not enabled in this MVP shell and does not execute reward distribution.",
    "zh-CN": "当前 MVP shell 未启用合约领取，也不会执行奖励发放。",
  },
  OFF_CHAIN_MVP: {
    "en-US": "Campaign OS verifies, ranks, and exports; the project remains responsible for rewards.",
    "zh-CN": "Campaign OS 负责验证、排名与导出；奖励仍由项目方负责。",
  },
  V2_COMPANION: {
    "en-US": "Companion contracts may record hashes later; full campaign copy and risk detail stay off-chain.",
    "zh-CN": "辅助合约后续可记录 hash；活动全文与风控细节仍留在链下。",
  },
};

const contractNextActionByMode: Record<ContractMode, LocalizedText> = {
  CONTRACT_CLAIM: {
    "en-US": "Keep blocked until a contract reviewer approves high-impact claim mode.",
    "zh-CN": "保持阻断，直到合约审核人批准高影响领取模式。",
  },
  OFF_CHAIN_MVP: {
    "en-US": "Use off-chain verification and winner export for MVP publish.",
    "zh-CN": "MVP 发布使用链下验证与 winners 导出。",
  },
  V2_COMPANION: {
    "en-US": "Plan verifier roles and metadata hashes before enabling this mode.",
    "zh-CN": "启用前先规划 verifier role 与 metadata hash。",
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
    };
  }

  if (revision.status === "human_reviewed") {
    return {
      "en-US": "Human-reviewed translation can be published when the owner confirms.",
      "zh-CN": "人工审核后的翻译可在项目方确认后发布。",
    };
  }

  if (revision.status === "ai_draft") {
    return noAutoPublishNotice;
  }

  return {
    "en-US": "Use English fallback until localized content is reviewed.",
    "zh-CN": "本地化内容审核前使用英文回退。",
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
};

const fallbackReviewNote: LocalizedText = {
  "en-US": "AI draft or missing translation falls back to English until human review is complete.",
  "zh-CN": "AI 草稿或缺失翻译在人工审核完成前回退展示英文。",
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
          }
        : {
            "en-US": "Approved content can be copied or prepared for local schedule/publish intent.",
            "zh-CN": "已批准内容可以复制，或准备本地排期/发布意图。",
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

const taskNextAction = (
  task: CampaignTask,
  status: TaskVerificationStatus,
): LocalizedText => {
  if (status === "completed") {
    return {
      "en-US": `${task.title["en-US"]} is verified and points are counted.`,
      "zh-CN": `${task.title["zh-CN"]} 已验证，积分已计入。`,
    };
  }

  if (status === "pending") {
    return {
      "en-US": `${task.title["en-US"]} is waiting for seeded verification.`,
      "zh-CN": `${task.title["zh-CN"]} 正在等待 seeded 验证。`,
    };
  }

  if (status === "failed") {
    return {
      "en-US": `${task.title["en-US"]} needs a fresh valid completion.`,
      "zh-CN": `${task.title["zh-CN"]} 需要重新完成一次有效操作。`,
    };
  }

  if (status === "manual_review") {
    return {
      "en-US": `${task.title["en-US"]} is queued for manual review.`,
      "zh-CN": `${task.title["zh-CN"]} 已进入人工审核队列。`,
    };
  }

  return {
    "en-US": `Complete ${task.title["en-US"]} to recover eligibility.`,
    "zh-CN": `完成${task.title["zh-CN"]}以恢复资格。`,
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

    return {
      taskId: task.id,
      templateCode: task.templateCode,
      status,
      evidenceSource:
        participant.taskEvidenceSources?.[task.id] ?? evidenceSourceByVerificationType[task.verificationType],
      pointsAwarded: status === "completed" ? task.points : 0,
      pointsAvailable: task.points,
      completed,
      missingRequired: task.required && !completed,
      walletCompatibility: task.walletCompatibility,
      nextAction: taskNextAction(task, status),
    };
  });

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
      },
      nextAction: {
        "en-US": "Review final results without assuming reward distribution.",
        "zh-CN": "查看最终结果，但不要将其理解为自动发奖。",
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
      },
      nextAction: {
        "en-US": "Complete the missing required tasks before export eligibility.",
        "zh-CN": "完成缺失的必做任务后再进入导出资格。",
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
      },
      nextAction: {
        "en-US": "Wait for seeded verification to complete.",
        "zh-CN": "等待 seeded 验证完成。",
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
      },
      nextAction: {
        "en-US": "Wait for manual review before winner export.",
        "zh-CN": "等待人工审核后再进入获奖名单导出。",
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
    },
    nextAction: {
      "en-US": "Stay active until the campaign export window closes.",
      "zh-CN": "在活动导出窗口关闭前保持活跃。",
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
    },
    riskFlags: [],
    score: 0,
    status: "pending",
    totalRequiredTasks: requiredTaskCount,
    nextAction: {
      "en-US": "Connect or verify a supported wallet before export eligibility can be trusted.",
      "zh-CN": "请连接或验证受支持的钱包后，再判断导出资格。",
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
      },
      status: result.status,
      title: {
        "en-US": "Eligibility checker",
        "zh-CN": "资格检查器",
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
    },
    description: {
      "en-US": "Ranks users by total campaign points.",
      "zh-CN": "按活动总积分排序用户。",
    },
    qualityPolicy: {
      "en-US": "Total points remain a review signal and do not distribute rewards.",
      "zh-CN": "总积分仍是审核信号，不会触发发奖。",
    },
  },
  {
    id: "on_chain",
    label: {
      "en-US": "On-chain",
      "zh-CN": "链上贡献",
    },
    description: {
      "en-US": "Prioritizes verified wallet, on-chain, and dApp API actions.",
      "zh-CN": "优先展示已验证的钱包、链上和 dApp API 行为。",
    },
    qualityPolicy: {
      "en-US": "On-chain and dApp actions carry more quality weight than low-cost social tasks.",
      "zh-CN": "链上和 dApp 行为比低成本社交任务具有更高质量权重。",
    },
  },
  {
    id: "referral",
    label: {
      "en-US": "Referral",
      "zh-CN": "邀请",
    },
    description: {
      "en-US": "Ranks qualified referral value, not raw signup counts.",
      "zh-CN": "按合格邀请价值排序，而不是原始注册数量。",
    },
    qualityPolicy: defaultReferralRule,
  },
  {
    id: "low_risk_verified",
    label: {
      "en-US": "Low-risk verified",
      "zh-CN": "低风险已验证",
    },
    description: {
      "en-US": "Prioritizes eligible users with verified actions and no risk flags.",
      "zh-CN": "优先展示有已验证行为且无风险标记的合格用户。",
    },
    qualityPolicy: {
      "en-US": "Risk flags are review inputs, not automatic exclusions or aelf reward decisions.",
      "zh-CN": "风险标记是审核输入，不是自动排除或 aelf 发奖决定。",
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
    },
  };
};

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

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
      },
      value: totalParticipants.toLocaleString("en-US"),
      trend: {
        "en-US": "Seeded wallets in review sample.",
        "zh-CN": "审核样本中的 seeded 钱包。",
      },
      tone: "neutral",
      dimension: "audience",
    },
    {
      id: "verified-actions",
      label: {
        "en-US": "Verified actions",
        "zh-CN": "有效行为",
      },
      value: verifiedActions.toLocaleString("en-US"),
      trend: {
        "en-US": "Derived from local task completion fixtures.",
        "zh-CN": "来自本地任务完成 fixtures。",
      },
      tone: "good",
      dimension: "quality",
    },
    {
      id: "eligible-winners",
      label: {
        "en-US": "Eligible winners",
        "zh-CN": "合格 winners",
      },
      value: String(exportBatch.readyCount),
      trend: {
        "en-US": "Preview only; project distributes rewards.",
        "zh-CN": "仅预览；由项目方发奖。",
      },
      tone: "good",
      dimension: "export",
    },
    {
      id: "risk-rate",
      label: {
        "en-US": "Risk rate",
        "zh-CN": "风险比例",
      },
      value: formatPercent(riskRate),
      trend: {
        "en-US": "Risk flags are review signals.",
        "zh-CN": "风险标记是审核信号。",
      },
      tone: riskRate > 0.2 ? "warning" : "neutral",
      dimension: "risk",
    },
    {
      id: "referral-conversion",
      label: {
        "en-US": "Referral conversion",
        "zh-CN": "邀请转化",
      },
      value: formatPercent(referralConversion),
      trend: {
        "en-US": "Only qualified invitees count.",
        "zh-CN": "仅合格被邀请人计入。",
      },
      tone: "warning",
      dimension: "referral",
    },
    {
      id: "retention",
      label: {
        "en-US": "Retention signal",
        "zh-CN": "留存信号",
      },
      value: "31%",
      trend: {
        "en-US": "Seeded Day 7 repeat action signal.",
        "zh-CN": "Seeded Day 7 重复行为信号。",
      },
      tone: "neutral",
      dimension: "retention",
    },
    {
      id: "export-readiness",
      label: {
        "en-US": "Export readiness",
        "zh-CN": "导出准备度",
      },
      value: `${exportBatch.readyCount}/${campaign.participants.length}`,
      trend: {
        "en-US": `${exportBatch.blockedCount} rows need review before export approval.`,
        "zh-CN": `${exportBatch.blockedCount} 行需要审核后再批准导出。`,
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

  return [
    {
      id: "locale-en-us",
      label: "en-US",
      count: participants.filter((participant) => participant.localePreference === "en-US").length,
      percentage: Math.round(
        (participants.filter((participant) => participant.localePreference === "en-US").length / total) * 100,
      ),
    },
    {
      id: "locale-zh-cn",
      label: "zh-CN",
      count: participants.filter((participant) => participant.localePreference === "zh-CN").length,
      percentage: Math.round(
        (participants.filter((participant) => participant.localePreference === "zh-CN").length / total) * 100,
      ),
    },
  ];
};

const evidenceHashFor = (taskId: string, walletAddress: string) =>
  `demo-${taskId}-${walletAddress.slice(0, 3)}`;

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
};

const exportDecisionBoundary: LocalizedText = {
  "en-US": "Campaign OS exports verified records only and does not distribute rewards; the campaign project owns reward fulfillment.",
  "zh-CN": "Campaign OS 只导出已验证记录，不执行发奖；奖励履约由活动项目方负责。",
};

const formatTimeWindow = (startTime: string, endTime: string): LocalizedText => {
  const dateFormatter = new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "short" });

  return {
    "en-US": `${dateFormatter.format(new Date(startTime))} - ${dateFormatter.format(new Date(endTime))}`,
    "zh-CN": `${dateFormatter.format(new Date(startTime))} - ${dateFormatter.format(new Date(endTime))}`,
  };
};

const createWalletSplitLabel = (aaWallets: number, eoaWallets: number): LocalizedText => ({
  "en-US": `${aaWallets} AA / ${eoaWallets} EOA`,
  "zh-CN": `${aaWallets} AA / ${eoaWallets} EOA`,
});

const createLocaleState = (localeCoverage: number): LocalizedText =>
  localeCoverage >= 1
    ? {
        "en-US": "All supported locales reviewed",
        "zh-CN": "所有支持语言已审核",
      }
    : {
        "en-US": "zh-CN uses English fallback until review",
        "zh-CN": "中文在审核前使用英文回退",
      };

const statusNextAction: Record<
  CampaignCommandItem["status"],
  Pick<CampaignCommandItem, "nextActionLabel" | "nextActionDetail">
> = {
  draft: {
    nextActionLabel: {
      "en-US": "Finish publish blockers",
      "zh-CN": "完成发布阻断项",
    },
    nextActionDetail: {
      "en-US": "Complete basics, reward disclaimers, and launch gates before scheduling.",
      "zh-CN": "排期前完成基础信息、奖励声明和发布门禁。",
    },
  },
  scheduled: {
    nextActionLabel: {
      "en-US": "Review launch readiness",
      "zh-CN": "审核发布准备度",
    },
    nextActionDetail: {
      "en-US": "Confirm locale fallback, wallet policy, and risk settings before go-live.",
      "zh-CN": "上线前确认语言回退、钱包策略和风险设置。",
    },
  },
  live: {
    nextActionLabel: {
      "en-US": "Review live analytics",
      "zh-CN": "查看实时活动数据",
    },
    nextActionDetail: {
      "en-US": "Monitor funnel drop-off, risk flags, and export readiness.",
      "zh-CN": "监控漏斗流失、风险标记和导出准备度。",
    },
  },
  paused: {
    nextActionLabel: {
      "en-US": "Resolve pause blocker",
      "zh-CN": "处理暂停阻断项",
    },
    nextActionDetail: {
      "en-US": "Clear the blocking review before resuming the campaign.",
      "zh-CN": "恢复活动前先完成阻断审核。",
    },
  },
  ended: {
    nextActionLabel: {
      "en-US": "Approve export preview",
      "zh-CN": "批准导出预览",
    },
    nextActionDetail: {
      "en-US": "Review ready, review-required, and blocked rows before winner export.",
      "zh-CN": "导出 winners 前审核就绪、需复核和阻断行。",
    },
  },
  exported: {
    nextActionLabel: {
      "en-US": "Archive final report",
      "zh-CN": "归档最终报告",
    },
    nextActionDetail: {
      "en-US": "Keep final evidence and remind the project that rewards remain project-owned.",
      "zh-CN": "保留最终证据，并提醒项目方奖励仍由项目方负责。",
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
    },
    id: campaign.id,
    localeCoverage: campaign.metrics.localeCoverage,
    projectName: campaign.projectName,
    riskReason: {
      "en-US": `${campaign.metrics.riskReviewQueue} risk reviews queued`,
      "zh-CN": `${campaign.metrics.riskReviewQueue} 条风险审核排队`,
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
    },
    id: "camp-forest-nft-path",
    localeCoverage: 0.5,
    projectName: "Forest",
    riskReason: {
      "en-US": "Launch risk settings need owner review",
      "zh-CN": "上线风险设置需要项目方审核",
    },
    riskState: "warning",
    startTime: "2026-07-05T00:00:00Z",
    status: "scheduled",
    title: {
      "en-US": "Forest NFT Quest",
      "zh-CN": "Forest NFT 任务",
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
    },
    id: "camp-tmrwdao-streak",
    localeCoverage: 1,
    projectName: "TMRWDAO",
    riskReason: {
      "en-US": "Referral velocity review remains open",
      "zh-CN": "推荐速度审核仍未关闭",
    },
    riskState: "warning",
    startTime: "2026-06-04T00:00:00Z",
    status: "ended",
    title: {
      "en-US": "TMRWDAO Governance Streak",
      "zh-CN": "TMRWDAO 治理连续任务",
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
    },
    id: "camp-ebridge-onboarding",
    localeCoverage: 1,
    projectName: "eBridge",
    riskReason: {
      "en-US": "No active risk review",
      "zh-CN": "无进行中的风险审核",
    },
    riskState: "ready",
    startTime: "2026-05-27T00:00:00Z",
    status: "exported",
    title: {
      "en-US": "eBridge Onboarding Wave",
      "zh-CN": "eBridge 新手活动",
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
  };

  return {
    "en-US": `Largest drop-off: ${label["en-US"]} (${largestDropOff.dropOff.toLocaleString("en-US")} users).`,
    "zh-CN": `最大流失点：${label["zh-CN"]}（${largestDropOff.dropOff.toLocaleString("en-US")} 位用户）。`,
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
    },
    boundary: exportDecisionBoundary,
  };
};

export const createProjectCampaignCommandCenter = (
  campaign: CampaignShellDetail,
): ProjectCampaignCommandCenter => {
  const exportBatch = createExportBatch(campaign);
  const campaigns = createSeededCampaignCommandItems(campaign, exportBatch);
  const analyticsExport = createAnalyticsExportDecision(campaign, exportBatch);

  return {
    summary: createCommandSummary(campaigns, analyticsExport.readyRows),
    campaigns,
    analyticsExport,
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
      },
      value: {
        "en-US": claimModeSelected ? "Required before claim review" : "Not required for Off-chain MVP",
        "zh-CN": claimModeSelected ? "领取审核前必须提供" : "Off-chain MVP 不需要",
      },
      status: claimModeSelected ? "blocked" : "passed",
      ownerRole: "contract_reviewer",
      requiredFor: "CONTRACT_CLAIM",
      detail: {
        "en-US": "MVP uses off-chain verification and winner export without contract migration.",
        "zh-CN": "MVP 使用链下验证和 winners 导出，不需要合约迁移。",
      },
      nextAction: {
        "en-US": "Keep contract address empty until a claim-mode review is opened.",
        "zh-CN": "在领取模式审核开启前保持合约地址为空。",
      },
    },
    {
      id: "audit-status",
      label: {
        "en-US": "Audit status",
        "zh-CN": "审计状态",
      },
      value: {
        "en-US": claimModeSelected ? "Audit required before claim" : "Not required for MVP shell",
        "zh-CN": claimModeSelected ? "领取前必须审计" : "MVP shell 不需要",
      },
      status: claimModeSelected ? "blocked" : "passed",
      ownerRole: "contract_reviewer",
      requiredFor: "CONTRACT_CLAIM",
      detail: {
        "en-US": "Claim mode is high impact because it can affect reward distribution.",
        "zh-CN": "领取模式可能影响奖励发放，因此属于高影响模式。",
      },
      nextAction: {
        "en-US": "Require audit evidence before any contract claim approval.",
        "zh-CN": "任何合约领取批准前必须提供审计证据。",
      },
    },
    {
      id: "metadata-hash",
      label: {
        "en-US": "Metadata hash",
        "zh-CN": "Metadata hash",
      },
      value: {
        "en-US": "Optional for MVP; planned for CampaignRegistryV2",
        "zh-CN": "MVP 可选；计划用于 CampaignRegistryV2",
      },
      status: "warning",
      ownerRole: "internal_operator",
      requiredFor: "P1",
      detail: {
        "en-US": "Store only metadata URI/hash later; full campaign copy stays off-chain.",
        "zh-CN": "后续只记录 metadata URI/hash；活动全文仍留在链下。",
      },
      nextAction: {
        "en-US": "Prepare metadata hash when moving to the P1 registry path.",
        "zh-CN": "进入 P1 registry 路径时准备 metadata hash。",
      },
    },
    {
      id: "verifier-role",
      label: {
        "en-US": "Verifier role",
        "zh-CN": "Verifier role",
      },
      value: {
        "en-US": "Backend verifier only",
        "zh-CN": "仅 backend verifier",
      },
      status: "passed",
      ownerRole: "internal_operator",
      requiredFor: "MVP",
      detail: {
        "en-US": "The MVP verifier records seeded verification inputs without contract write authority.",
        "zh-CN": "MVP verifier 只记录 seeded 验证输入，不具备合约写权限。",
      },
      nextAction: {
        "en-US": "Keep verifier role off-chain until V2 role design is approved.",
        "zh-CN": "在 V2 role 设计批准前保持 verifier role 链下执行。",
      },
    },
    {
      id: "reward-custody",
      label: {
        "en-US": "Reward custody",
        "zh-CN": "奖励托管",
      },
      value: {
        "en-US": "Project-owned; None in Campaign OS",
        "zh-CN": "项目方持有；Campaign OS 不托管",
      },
      status: "passed",
      ownerRole: "project_owner",
      requiredFor: "MVP",
      detail: {
        "en-US": "Campaign OS exports verified records only and never holds rewards.",
        "zh-CN": "Campaign OS 只导出已验证记录，绝不托管奖励。",
      },
      nextAction: {
        "en-US": "Confirm project reward responsibility before winner export.",
        "zh-CN": "导出 winners 前确认项目方奖励责任。",
      },
    },
    {
      id: "contract-claim-gate",
      label: {
        "en-US": "Contract claim gate",
        "zh-CN": "合约领取门禁",
      },
      value: {
        "en-US": "Blocked until high-impact manual review",
        "zh-CN": "高影响人工审核前保持阻断",
      },
      status: "blocked",
      ownerRole: "contract_reviewer",
      requiredFor: "CONTRACT_CLAIM",
      detail: {
        "en-US": "Claim mode needs contract address, audit status, verifier role, metadata hash, and reward custody review.",
        "zh-CN": "领取模式需要合约地址、审计状态、verifier role、metadata hash 与奖励托管审核。",
      },
      nextAction: {
        "en-US": "Do not enable claim mode in the MVP shell.",
        "zh-CN": "不要在 MVP shell 启用领取模式。",
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
    },
    title: {
      "en-US": "Off-chain verification + winner export",
      "zh-CN": "链下验证 + winners 导出",
    },
    description: {
      "en-US": "No contract migration; existing Pixiepoints/backend ledger remains usable.",
      "zh-CN": "不做合约迁移；继续使用现有 Pixiepoints/backend ledger。",
    },
    status: "ready",
    contractSurface: {
      "en-US": "No new contract surface",
      "zh-CN": "无新增合约面",
    },
  },
  {
    id: "p1-campaign-registry",
    phase: {
      "en-US": "P1",
      "zh-CN": "P1",
    },
    title: {
      "en-US": "CampaignRegistryV2 metadata hash",
      "zh-CN": "CampaignRegistryV2 metadata hash",
    },
    description: {
      "en-US": "Record owner, status, wallet policy, supported locales, metadata URI, and metadata hash.",
      "zh-CN": "记录 owner、status、wallet policy、supported locales、metadata URI 与 metadata hash。",
    },
    status: "warning",
    contractSurface: {
      "en-US": "CampaignRegistryV2",
      "zh-CN": "CampaignRegistryV2",
    },
  },
  {
    id: "p1-points-referral-roots",
    phase: {
      "en-US": "P1",
      "zh-CN": "P1",
    },
    title: {
      "en-US": "Points and referral roots",
      "zh-CN": "Points 与 referral roots",
    },
    description: {
      "en-US": "Commit points batch roots and referral qualification roots without exposing risk strategy.",
      "zh-CN": "提交积分批次 root 与推荐资格 root，但不暴露风控策略。",
    },
    status: "warning",
    contractSurface: {
      "en-US": "CampaignPointsLedgerV2 + ReferralRegistryV2",
      "zh-CN": "CampaignPointsLedgerV2 + ReferralRegistryV2",
    },
  },
  {
    id: "p2-optional-claim",
    phase: {
      "en-US": "P2",
      "zh-CN": "P2",
    },
    title: {
      "en-US": "Optional contract claim",
      "zh-CN": "可选合约领取",
    },
    description: {
      "en-US": "Only after separate approval for claim contract, audit status, custody, and eligibility proof.",
      "zh-CN": "仅在领取合约、审计状态、托管与资格证明单独批准后进入。",
    },
    status: "blocker",
    contractSurface: {
      "en-US": "EligibilityRootRegistryV2 + optional claim contract",
      "zh-CN": "EligibilityRootRegistryV2 + 可选 claim contract",
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
    },
    metadataHash: {
      "en-US": "Optional for MVP; planned for CampaignRegistryV2 metadata URI/hash.",
      "zh-CN": "MVP 可选；计划用于 CampaignRegistryV2 metadata URI/hash。",
    },
    verifierRole: {
      "en-US": "Backend verifier only; no contract write authority in MVP.",
      "zh-CN": "仅 backend verifier；MVP 没有合约写权限。",
    },
    rewardCustody: {
      "en-US": "Project-owned; None in Campaign OS.",
      "zh-CN": "项目方持有；Campaign OS 不托管。",
    },
    publishState: claimModeSelected ? "blocker" : "ready",
    highImpactMode: claimModeSelected,
    summary: {
      "en-US": "MVP stays off-chain: verification, ranking, and export are reviewed without contract migration.",
      "zh-CN": "MVP 保持链下：审核验证、排名与导出，不进行合约迁移。",
    },
    boundary: {
      "en-US": "Seeded review only. No live contract transaction, no backend call, no reward custody, and no reward distribution is executed.",
      "zh-CN": "仅 seeded 审核。不执行真实合约交易、不调用后端、不托管奖励，也不发奖。",
    },
    nextAction: claimModeSelected
      ? {
          "en-US": "Block publish until contract reviewer approves high-impact claim mode.",
          "zh-CN": "阻断发布，直到合约审核人批准高影响领取模式。",
        }
      : {
          "en-US": "Approve Off-chain MVP and keep V2 companion planning in P1 backlog.",
          "zh-CN": "批准 Off-chain MVP，并把 V2 companion 规划保留在 P1 backlog。",
        },
    checklist: createContractReviewChecklist(campaign.contractMode),
    evolution: createContractEvolution(),
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
      },
      reason: {
        "en-US": "Campaign OS cannot show export evidence until a supported wallet session or participant row is verified.",
        "zh-CN": "在验证受支持的钱包会话或参与者记录前，Campaign OS 无法展示导出证据。",
      },
      nextAction: {
        "en-US": "Connect or verify a supported wallet before checking winners export status.",
        "zh-CN": "请先连接或验证受支持的钱包，再检查 winners 导出状态。",
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
      },
      nextAction: {
        "en-US": "Complete missing required tasks or verify wallet metadata before winners export can be trusted.",
        "zh-CN": "请先完成缺失的必做任务或验证钱包元数据，再进入可信 winners 导出。",
      },
    };
  }

  if (status === "review_required") {
    return {
      summary: {
        "en-US": "This row is present, but export approval needs manual review.",
        "zh-CN": "该记录已存在，但导出批准需要人工审核。",
      },
      reason: {
        "en-US": "Risk flags and eligibility gaps are review inputs, not automatic reward rejection.",
        "zh-CN": "风险标记和资格缺口仅作为审核输入，不代表自动拒绝奖励。",
      },
      nextAction: {
        "en-US": "Wait for manual review before winners export; Campaign OS does not distribute rewards.",
        "zh-CN": "请等待人工审核后再进入 winners 导出；Campaign OS 不执行发奖。",
      },
    };
  }

  return {
    summary: {
      "en-US": "This row is ready for winners export review.",
      "zh-CN": "该记录已准备进入 winners 导出审核。",
    },
    reason: {
      "en-US": "Wallet metadata, eligibility, task records, and evidence hashes are present in the seeded export preview.",
      "zh-CN": "seeded 导出预览中已包含钱包元数据、资格、任务记录与证据哈希。",
    },
    nextAction: {
      "en-US": "Wait for the campaign project to handle final reward fulfillment after export.",
      "zh-CN": "导出后等待活动项目方处理最终奖励履约。",
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
    },
    description: {
      "en-US": "Use aelf Pay after campaign eligibility work is understood.",
      "zh-CN": "在理解活动资格后使用 aelf Pay。",
    },
    serviceState: "not_connected",
  },
  Forecast: {
    id: "Forecast",
    label: {
      "en-US": "Forecast",
      "zh-CN": "Forecast",
    },
    description: {
      "en-US": "Explore Forecast only after campaign risk and eligibility are clear.",
      "zh-CN": "在活动风险与资格清楚后再探索 Forecast。",
    },
    serviceState: "not_connected",
  },
  Portfolio: {
    id: "Portfolio",
    label: {
      "en-US": "Portfolio",
      "zh-CN": "Portfolio",
    },
    description: {
      "en-US": "Review the seeded portfolio checkpoint before the next campaign.",
      "zh-CN": "在进入下一个活动前查看 seeded Portfolio 检查点。",
    },
    serviceState: "not_connected",
  },
} satisfies Record<EcosystemNextActionProduct["id"], EcosystemNextActionProduct>;

const ecosystemBoundary: LocalizedText = {
  "en-US": "No live Pay, Forecast, or Portfolio service is connected; no wallet SDK, payment, prediction, portfolio sync, contract view, or contract send is executed.",
  "zh-CN": "不会连接真实 Pay、Forecast 或 Portfolio 服务；不会执行钱包 SDK、支付、预测、Portfolio 同步、合约读取或合约发送。",
};

const productBoundary: Record<EcosystemNextActionProduct["id"], LocalizedText> = {
  Pay: {
    "en-US": "No live Pay service, wallet SDK, payment transaction, contract view, or contract send is executed.",
    "zh-CN": "不会连接真实 Pay 服务、钱包 SDK、支付交易、合约读取或合约发送。",
  },
  Forecast: {
    "en-US": "No live Forecast service, prediction transaction, wallet SDK, contract view, or contract send is executed.",
    "zh-CN": "不会连接真实 Forecast 服务、预测交易、钱包 SDK、合约读取或合约发送。",
  },
  Portfolio: {
    "en-US": "No live Portfolio service, wallet SDK, portfolio sync, contract view, or contract send is executed.",
    "zh-CN": "不会连接真实 Portfolio 服务、钱包 SDK、Portfolio 同步、合约读取或合约发送。",
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
  },
  value: {
    "en-US": `${participation.metrics.completedRequiredTasks}/${participation.metrics.totalRequiredTasks}`,
    "zh-CN": `${participation.metrics.completedRequiredTasks}/${participation.metrics.totalRequiredTasks}`,
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
  },
  value: {
    "en-US": participation.eligibility.riskFlags.length > 0
      ? participation.eligibility.riskFlags.join(", ")
      : "No risk flags",
    "zh-CN": participation.eligibility.riskFlags.length > 0
      ? participation.eligibility.riskFlags.join(", ")
      : "无风险标记",
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
  },
  value: {
    "en-US": `#${participation.metrics.participantRank} · ${participation.participant.totalPoints} pts`,
    "zh-CN": `#${participation.metrics.participantRank} · ${participation.participant.totalPoints} 积分`,
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
      },
      reason: hasMissingRequiredTasks
        ? {
            "en-US": "Pay is recommended after the missing required campaign task is complete.",
            "zh-CN": "完成缺失的必做活动任务后，再推荐进入 Pay。",
          }
        : {
            "en-US": "Required campaign work is complete enough to explore a Pay follow-up.",
            "zh-CN": "必做活动进度已足够，可以探索 Pay 后续行动。",
          },
      ctaLabel: hasMissingRequiredTasks
        ? {
            "en-US": "Finish campaign task",
            "zh-CN": "完成活动任务",
          }
        : {
            "en-US": "Preview Pay action",
            "zh-CN": "预览 Pay 行动",
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
      },
      reason: hasRiskContext
        ? {
            "en-US": "Forecast stays in review because this wallet has risk context in the campaign.",
            "zh-CN": "由于该钱包在活动中存在风险上下文，Forecast 保持审核状态。",
          }
        : {
            "en-US": "Campaign progress can lead into a Forecast follow-up without a live prediction transaction.",
            "zh-CN": "活动进度可以衔接 Forecast 后续行动，但不会发起真实预测交易。",
          },
      ctaLabel: hasRiskContext
        ? {
            "en-US": "Review risk first",
            "zh-CN": "先审核风险",
          }
        : {
            "en-US": "Preview Forecast action",
            "zh-CN": "预览 Forecast 行动",
          },
      gatingReason: hasRiskContext
        ? {
            "en-US": "Manual risk review is required before treating Forecast as a ready follow-up.",
            "zh-CN": "在把 Forecast 视为就绪后续行动前，需要先完成人工风险审核。",
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
      },
      reason: fullyEligible
        ? {
            "en-US": "This wallet is eligible, so Portfolio becomes the primary post-campaign checkpoint.",
            "zh-CN": "该钱包已符合资格，因此 Portfolio 成为活动后的主要检查点。",
          }
        : {
            "en-US": "Portfolio is available as a local checkpoint while campaign eligibility is still progressing.",
            "zh-CN": "活动资格仍在推进时，Portfolio 可作为本地检查点。",
          },
      ctaLabel: {
        "en-US": "Preview Portfolio checkpoint",
        "zh-CN": "预览 Portfolio 检查点",
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
        }
      : {
          "en-US": "Campaign progress is ready to continue across the aelf ecosystem.",
          "zh-CN": "活动进度已可延展到 aelf 生态的下一步。",
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

  return {
    campaignId: campaign.id,
    reviewQueue: campaign.reviewItems,
    contractReviewCenter: createAdminContractReviewCenter(campaign),
    aiContentPack: createAiContentPackWorkbench(campaign),
    templateGovernance: createTemplateGovernanceConsole(),
    analytics: createAnalytics(campaign, exportBatch),
    funnel: campaign.conversionFunnel,
    walletSplit: createWalletSplit(campaign.participants),
    localeSplit: createLocaleSplit(campaign.participants),
    riskSignals: campaign.riskSignals,
    aiReports: campaign.aiOpsReports,
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
  const targetPanel = panels.find((panel) => panel.locale === "zh-CN");

  return {
    campaignId: campaign.id,
    defaultLocale: campaign.defaultLocale,
    fallbackLocale: "en-US",
    supportedLocales: [...campaign.supportedLocales],
    sourceLocale: "en-US",
    panels,
    localeItems: createTranslationLocaleItems(campaign.supportedLocales, panels),
    comparisonRows: createTranslationComparisonRows(englishPanel, targetPanel),
    rewardDisclaimers: panels.map((panel) => ({
      locale: panel.locale,
      disclaimer: panel.rewardDisclaimer,
      reviewed: panel.humanReviewed,
      fallbackToEnglish: panel.fallbackToEnglish,
      publishState: panel.publishState,
    })),
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
  const chineseContent = contentRevisions.find((revision) => revision.locale === "zh-CN");

  if (campaign.contractMode === "CONTRACT_CLAIM") {
    blockers.push("Contract claim mode requires high-impact manual review.");
  }

  if (!englishContent?.rewardDisclaimer?.trim()) {
    blockers.push("English reward disclaimer is required before publish.");
  }

  if (chineseContent && chineseContent.status !== "human_reviewed" && chineseContent.status !== "published") {
    warnings.push("Chinese content falls back to English until reviewed.");
  }

  return {
    ready: blockers.length === 0,
    blockers,
    warnings,
  };
};
