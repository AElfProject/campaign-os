import type {
  AdminOpsReadModel,
  AiContentArtifact,
  AiContentArtifactDraft,
  AiContentArtifactLifecycle,
  AiContentPackSummary,
  AiContentPackWorkbench,
  AiContentQualityGate,
  AnalyticsKpi,
  AdminContractReviewCenter,
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
  ExportConfirmation,
  ExportCsvColumn,
  ExportBatchSummary,
  ExportEvidenceRow,
  EvidenceSource,
  ExportPreview,
  ExportPreviewRow,
  RiskSignal,
  TaskEvidenceSummary,
  LeaderboardRow,
  LocalizedText,
  ParticipationMetrics,
  ParticipationReadModel,
  ParticipantSnapshot,
  ParticipantTaskState,
  PublishState,
  PublishReadiness,
  ReferralSummary,
  ReviewSeverity,
  TaskVerificationStatus,
  TranslationManagerReadModel,
  TranslationReviewPanel,
} from "./types";
import { deriveEligibilityWalletStatus, isWalletSessionVerified } from "./wallet";
import { EXPORT_CSV_COLUMNS as exportCsvColumns } from "./types";

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

const noAutoPublishNotice: LocalizedText = {
  "en-US": "AI generated translation cannot auto-publish before human review.",
  "zh-CN": "AI 生成翻译必须经过人工审核后才能发布。",
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
    copy: releaseReady || edited ? "available" : "blocked",
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

  return {
    campaignId: campaign.id,
    defaultLocale: campaign.defaultLocale,
    fallbackLocale: "en-US",
    supportedLocales: [...campaign.supportedLocales],
    sourceLocale: "en-US",
    panels,
    rewardDisclaimers: panels.map((panel) => ({
      locale: panel.locale,
      disclaimer: panel.rewardDisclaimer,
      reviewed: panel.humanReviewed,
      fallbackToEnglish: panel.fallbackToEnglish,
      publishState: panel.publishState,
    })),
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
