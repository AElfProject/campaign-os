import type {
  ContractMode,
  LocalizedText,
  LocaleStatus,
  OwnerRole,
  RiskLevel,
  SupportedLocale,
  VerificationType,
  WalletCompatibility,
  WalletPolicy,
} from "./types";

export const builderSupportedLocales = ["en-US", "zh-CN"] as const satisfies readonly SupportedLocale[];

export type BuilderStepStatus = "incomplete" | "warning" | "blocked" | "ready" | "reviewed";
export type BuilderStepId = "goal" | "tasks" | "rewards" | "i18n" | "contract" | "readiness";
export type BuilderCreationMode = "AI_ASSISTED" | "FORM_BASED";
export type CampaignObjective = "acquisition" | "activation" | "trading" | "nft" | "dao" | "launch";
export type TaskTemplateCategory =
  | "wallet"
  | "bridge"
  | "swap"
  | "nft"
  | "dao"
  | "daipp"
  | "social"
  | "invite";
export type RewardProvider = "campaign_project" | "partner";
export type PointsRule = "task_points" | "daily_cap" | "referral_bonus";
export type WinnerRule = "top_n" | "threshold" | "manual_review";
export type ReadinessGroup = "basics" | "wallet" | "tasks" | "rewards" | "i18n" | "contract" | "risk" | "export";
export type ReadinessStatus = "blocker" | "warning" | "passed";

export interface BuilderStep {
  id: BuilderStepId;
  title: LocalizedText;
  status: BuilderStepStatus;
  summary: LocalizedText;
  ownerRole: OwnerRole;
}

export interface WalletPolicyOption {
  policy: WalletPolicy;
  label: LocalizedText;
  description: LocalizedText;
  recommended: boolean;
  defaultSelected: boolean;
}

export interface TaskTemplate {
  id: string;
  category: TaskTemplateCategory;
  title: LocalizedText;
  description: LocalizedText;
  verificationType: VerificationType | "REFERRAL";
  walletCompatibility: WalletCompatibility;
  defaultPoints: number;
  requiredByDefault: boolean;
  riskLevel: RiskLevel;
  localeReadiness: Record<SupportedLocale, LocaleStatus>;
}

export interface RewardPlan {
  provider: RewardProvider;
  description: LocalizedText;
  disclaimer: LocalizedText;
  exportDisclaimer: LocalizedText;
  pointsRule: PointsRule;
  winnerRule: WinnerRule;
  exportDisclaimerAccepted: boolean;
  estimatedRewardValueUsd: number;
}

export interface EligibilityRule {
  walletPolicy: WalletPolicy;
  targetUsers: string[];
  requiredTaskTemplateIds: string[];
  pointsThreshold?: number;
  referralValidationEnabled: boolean;
  riskFlagsEnabled: boolean;
  manualReviewRequired: boolean;
}

export interface BuilderContentRevision {
  id: string;
  locale: SupportedLocale;
  sourceLocale: "en-US";
  title: string;
  description: string;
  faq: string;
  socialPost: string;
  rewardDisclaimer: string;
  aiDraft: boolean;
  humanReviewed: boolean;
  published: boolean;
  fallbackToEnglish: boolean;
}

export interface ContractImpactSelection {
  mode: ContractMode;
  requiresVerifierRole: boolean;
  requiresMetadataHash: boolean;
  requiresManualReview: boolean;
  reviewSeverity: "info" | "warning" | "blocker";
}

export interface ReadinessCheck {
  id: string;
  group: ReadinessGroup;
  status: ReadinessStatus;
  reason: LocalizedText;
  nextAction: LocalizedText;
  ownerRole: OwnerRole;
}

export interface PublishReadinessResult {
  ready: boolean;
  blockers: ReadinessCheck[];
  warnings: ReadinessCheck[];
  passed: ReadinessCheck[];
  lastReviewedAt: string;
}

export interface CampaignDraft {
  id: string;
  campaignName: LocalizedText;
  projectName: string;
  objective: CampaignObjective;
  timePeriod: {
    startTime: string;
    endTime: string;
  };
  targetUsers: string[];
  defaultLocale: "en-US";
  fallbackLocale: "en-US";
  supportedLocales: SupportedLocale[];
  walletPolicy: WalletPolicy;
  creationMode: BuilderCreationMode;
  aiPrompt: {
    prompt: string;
    generatedOutline: string[];
    reviewedByHuman: boolean;
  };
  formState: {
    objectiveConfirmed: boolean;
    timelineConfirmed: boolean;
    walletPolicyConfirmed: boolean;
    rewardPlanConfirmed: boolean;
  };
  builderSteps: BuilderStep[];
  selectedTaskTemplateIds: string[];
  rewardPlan: RewardPlan;
  eligibilityRule: EligibilityRule;
  contentRevisions: BuilderContentRevision[];
  defaultContractImpact: ContractImpactSelection;
  contractImpact: ContractImpactSelection;
}

const text = (enUS: string, zhCN: string): LocalizedText => ({
  "en-US": enUS,
  "zh-CN": zhCN,
});

export const walletPolicyOptions: WalletPolicyOption[] = [
  {
    policy: "ANY",
    label: text("Any wallet", "任意钱包"),
    description: text(
      "Recommended MVP policy. AA and EOA users can both participate.",
      "推荐的 MVP 策略。AA 与 EOA 用户都可以参与。",
    ),
    recommended: true,
    defaultSelected: true,
  },
  {
    policy: "AA_ONLY",
    label: text("AA only", "仅 AA 钱包"),
    description: text(
      "Use when the campaign specifically measures account abstraction adoption.",
      "适用于专门衡量账户抽象采用情况的活动。",
    ),
    recommended: false,
    defaultSelected: false,
  },
  {
    policy: "EOA_ONLY",
    label: text("EOA only", "仅 EOA 钱包"),
    description: text(
      "Use only when a legacy wallet or extension flow is required.",
      "仅在必须使用旧钱包或浏览器插件流程时启用。",
    ),
    recommended: false,
    defaultSelected: false,
  },
];

export const taskTemplateLibrary: TaskTemplate[] = [
  {
    id: "tpl-wallet-connect",
    category: "wallet",
    title: text("Connect wallet", "连接钱包"),
    description: text("Connect any supported aelf AA or EOA wallet.", "连接任意受支持的 aelf AA 或 EOA 钱包。"),
    verificationType: "WALLET",
    walletCompatibility: "ANY",
    defaultPoints: 40,
    requiredByDefault: true,
    riskLevel: "low",
    localeReadiness: { "en-US": "ready", "zh-CN": "reviewed" },
  },
  {
    id: "tpl-bridge-ebridge",
    category: "bridge",
    title: text("Bridge with eBridge", "使用 eBridge 跨链"),
    description: text("Complete one bridge action with the connected wallet.", "使用已连接钱包完成一次跨链操作。"),
    verificationType: "ON_CHAIN",
    walletCompatibility: "ANY",
    defaultPoints: 120,
    requiredByDefault: true,
    riskLevel: "low",
    localeReadiness: { "en-US": "ready", "zh-CN": "ai_draft" },
  },
  {
    id: "tpl-swap-awaken",
    category: "swap",
    title: text("Swap on Awaken", "在 Awaken Swap"),
    description: text("Complete a seeded swap task for the campaign token pair.", "完成活动指定交易对的一次 Swap。"),
    verificationType: "DAPP_API",
    walletCompatibility: "ANY",
    defaultPoints: 100,
    requiredByDefault: false,
    riskLevel: "medium",
    localeReadiness: { "en-US": "ready", "zh-CN": "ai_draft" },
  },
  {
    id: "tpl-nft-hold",
    category: "nft",
    title: text("Hold campaign NFT", "持有活动 NFT"),
    description: text("Verify ownership of an eligible NFT collection.", "验证指定 NFT 合集的持有状态。"),
    verificationType: "ON_CHAIN",
    walletCompatibility: "ANY",
    defaultPoints: 90,
    requiredByDefault: false,
    riskLevel: "medium",
    localeReadiness: { "en-US": "ready", "zh-CN": "ai_draft" },
  },
  {
    id: "tpl-dao-vote",
    category: "dao",
    title: text("Vote in DAO proposal", "参与 DAO 提案投票"),
    description: text("Verify participation in a governance proposal.", "验证治理提案参与记录。"),
    verificationType: "ON_CHAIN",
    walletCompatibility: "EOA_ONLY",
    defaultPoints: 110,
    requiredByDefault: false,
    riskLevel: "medium",
    localeReadiness: { "en-US": "ready", "zh-CN": "fallback" },
  },
  {
    id: "tpl-daipp-submit",
    category: "daipp",
    title: text("Submit dAIPP feedback", "提交 dAIPP 反馈"),
    description: text("Submit structured feedback for a dAIPP initiative.", "为 dAIPP 计划提交结构化反馈。"),
    verificationType: "DAPP_API",
    walletCompatibility: "ANY",
    defaultPoints: 80,
    requiredByDefault: false,
    riskLevel: "low",
    localeReadiness: { "en-US": "ready", "zh-CN": "ai_draft" },
  },
  {
    id: "tpl-social-share",
    category: "social",
    title: text("Share campaign post", "分享活动动态"),
    description: text("Share an approved social post without making it the only high-value action.", "分享已审核动态，但不能作为唯一高价值任务。"),
    verificationType: "SOCIAL",
    walletCompatibility: "ANY",
    defaultPoints: 180,
    requiredByDefault: false,
    riskLevel: "high",
    localeReadiness: { "en-US": "ready", "zh-CN": "ai_draft" },
  },
  {
    id: "tpl-invite-friend",
    category: "invite",
    title: text("Invite a qualified friend", "邀请合格好友"),
    description: text("Invite a friend who completes required wallet and campaign tasks.", "邀请完成钱包与活动必做任务的好友。"),
    verificationType: "REFERRAL",
    walletCompatibility: "ANY",
    defaultPoints: 70,
    requiredByDefault: false,
    riskLevel: "high",
    localeReadiness: { "en-US": "ready", "zh-CN": "fallback" },
  },
];

export const contractImpactOptions: ContractImpactSelection[] = [
  {
    mode: "OFF_CHAIN_MVP",
    requiresVerifierRole: false,
    requiresMetadataHash: false,
    requiresManualReview: false,
    reviewSeverity: "info",
  },
  {
    mode: "V2_COMPANION",
    requiresVerifierRole: true,
    requiresMetadataHash: true,
    requiresManualReview: true,
    reviewSeverity: "warning",
  },
  {
    mode: "CONTRACT_CLAIM",
    requiresVerifierRole: true,
    requiresMetadataHash: true,
    requiresManualReview: true,
    reviewSeverity: "blocker",
  },
];

export const defaultContractImpact = contractImpactOptions[0];
export const contractClaimBlockedSample = contractImpactOptions[2];

export const seededCampaignDraft: CampaignDraft = {
  id: "draft-awaken-builder-foundation",
  campaignName: text("Awaken Summer Sprint", "Awaken 夏季冲刺活动"),
  projectName: "Awaken",
  objective: "activation",
  timePeriod: {
    startTime: "2026-07-01T00:00:00Z",
    endTime: "2026-07-21T00:00:00Z",
  },
  targetUsers: ["new aelf users", "active traders", "ecosystem explorers"],
  defaultLocale: "en-US",
  fallbackLocale: "en-US",
  supportedLocales: [...builderSupportedLocales],
  walletPolicy: "ANY",
  creationMode: "AI_ASSISTED",
  aiPrompt: {
    prompt: "Create an activation campaign for Awaken that rewards wallet connection, bridge, swap, and social sharing.",
    generatedOutline: [
      "Start from Any wallet so AA and EOA users can participate.",
      "Use bridge and swap tasks as verified activity anchors.",
      "Keep social sharing behind risk review because rewards are high.",
      "Require human review before Chinese AI draft content can publish.",
    ],
    reviewedByHuman: true,
  },
  formState: {
    objectiveConfirmed: true,
    timelineConfirmed: true,
    walletPolicyConfirmed: true,
    rewardPlanConfirmed: true,
  },
  builderSteps: [
    {
      id: "goal",
      title: text("Campaign goal", "活动目标"),
      status: "ready",
      summary: text("Activation campaign details are complete.", "激活活动基础信息已完成。"),
      ownerRole: "project_owner",
    },
    {
      id: "tasks",
      title: text("Task templates", "任务模板"),
      status: "warning",
      summary: text("Social task needs risk review before launch.", "社交任务上线前需要风险审核。"),
      ownerRole: "internal_operator",
    },
    {
      id: "rewards",
      title: text("Rewards and eligibility", "奖励与资格"),
      status: "ready",
      summary: text("Reward responsibility and export boundary are visible.", "奖励责任与导出边界已展示。"),
      ownerRole: "project_owner",
    },
    {
      id: "i18n",
      title: text("i18n review", "多语言审核"),
      status: "warning",
      summary: text("Chinese AI draft falls back to English until reviewed.", "中文 AI 草稿审核前回退到英文。"),
      ownerRole: "project_owner",
    },
    {
      id: "contract",
      title: text("Contract impact", "合约影响"),
      status: "blocked",
      summary: text("Contract claim sample is blocked pending manual review.", "合约领取样例需人工审核后才能继续。"),
      ownerRole: "contract_reviewer",
    },
    {
      id: "readiness",
      title: text("Publish readiness", "发布准备度"),
      status: "blocked",
      summary: text("Readiness separates blockers, warnings, and passed checks.", "准备度区分阻断项、警告与通过项。"),
      ownerRole: "project_owner",
    },
  ],
  selectedTaskTemplateIds: [
    "tpl-wallet-connect",
    "tpl-bridge-ebridge",
    "tpl-swap-awaken",
    "tpl-social-share",
  ],
  rewardPlan: {
    provider: "campaign_project",
    description: text("Project-funded points and token reward pool.", "项目方提供积分与代币奖励池。"),
    disclaimer: text(
      "Rewards are provided by the campaign project. Campaign OS does not distribute rewards.",
      "奖励由活动项目方提供。Campaign OS 不负责自动发奖。",
    ),
    exportDisclaimer: text(
      "Exporting winners does not distribute rewards.",
      "导出获奖名单不等于发放奖励。",
    ),
    pointsRule: "task_points",
    winnerRule: "top_n",
    exportDisclaimerAccepted: true,
    estimatedRewardValueUsd: 2500,
  },
  eligibilityRule: {
    walletPolicy: "ANY",
    targetUsers: ["new aelf users", "active traders"],
    requiredTaskTemplateIds: ["tpl-wallet-connect", "tpl-bridge-ebridge"],
    pointsThreshold: 160,
    referralValidationEnabled: true,
    riskFlagsEnabled: true,
    manualReviewRequired: true,
  },
  contentRevisions: [
    {
      id: "builder-content-en",
      locale: "en-US",
      sourceLocale: "en-US",
      title: "Awaken Summer Sprint",
      description: "Complete wallet-aware activation tasks across the aelf ecosystem.",
      faq: "Rewards are project-provided after winner export and project review.",
      socialPost: "Join Awaken Summer Sprint and complete verified aelf ecosystem tasks.",
      rewardDisclaimer: "Rewards are provided by the campaign project. Campaign OS does not distribute rewards.",
      aiDraft: false,
      humanReviewed: true,
      published: true,
      fallbackToEnglish: false,
    },
    {
      id: "builder-content-zh",
      locale: "zh-CN",
      sourceLocale: "en-US",
      title: "Awaken 夏季冲刺活动",
      description: "完成 aelf 生态中的钱包感知激活任务。",
      faq: "奖励将在导出获奖名单并经项目方审核后处理。",
      socialPost: "参与 Awaken 夏季冲刺活动，完成 aelf 生态验证任务。",
      rewardDisclaimer: "奖励由活动项目方提供。Campaign OS 不负责自动发奖。",
      aiDraft: true,
      humanReviewed: false,
      published: false,
      fallbackToEnglish: true,
    },
  ],
  defaultContractImpact,
  contractImpact: contractClaimBlockedSample,
};

const makeCheck = (
  id: string,
  group: ReadinessGroup,
  status: ReadinessStatus,
  reason: LocalizedText,
  nextAction: LocalizedText,
  ownerRole: OwnerRole,
): ReadinessCheck => ({
  id,
  group,
  status,
  reason,
  nextAction,
  ownerRole,
});

const hasRequiredBasics = (draft: CampaignDraft) =>
  Boolean(
    draft.campaignName["en-US"].trim() &&
      draft.projectName.trim() &&
      draft.objective &&
      draft.timePeriod.startTime &&
      draft.timePeriod.endTime &&
      draft.targetUsers.length > 0,
  );

const hasEnglishRewardDisclaimer = (draft: CampaignDraft) =>
  draft.rewardPlan.disclaimer["en-US"].includes("Campaign OS does not distribute rewards");

const hasExportDisclaimer = (draft: CampaignDraft) =>
  draft.rewardPlan.exportDisclaimerAccepted &&
  draft.rewardPlan.exportDisclaimer["en-US"].includes("Exporting winners does not distribute rewards");

const hasUnreviewedChineseAiDraft = (draft: CampaignDraft) =>
  draft.contentRevisions.some(
    (revision) => revision.locale === "zh-CN" && revision.aiDraft && !revision.humanReviewed,
  );

const isHighRewardSocialOnly = (draft: CampaignDraft) => {
  const selectedTemplates = taskTemplateLibrary.filter((template) =>
    draft.selectedTaskTemplateIds.includes(template.id),
  );
  const hasOnlySocialVerification = selectedTemplates.length > 0 && selectedTemplates.every(
    (template) => template.verificationType === "SOCIAL" || template.verificationType === "REFERRAL",
  );
  const hasHighRewardSocialTask = selectedTemplates.some(
    (template) => template.category === "social" && template.riskLevel === "high" && template.defaultPoints >= 150,
  );

  return hasHighRewardSocialTask && (hasOnlySocialVerification || draft.rewardPlan.estimatedRewardValueUsd >= 2000);
};

export const computeBuilderPublishReadiness = (draft: CampaignDraft): PublishReadinessResult => {
  const checks: ReadinessCheck[] = [];

  checks.push(
    hasRequiredBasics(draft)
      ? makeCheck(
          "basics-complete",
          "basics",
          "passed",
          text("Campaign basics are complete.", "活动基础信息已完成。"),
          text("Continue to publish review.", "继续发布审核。"),
          "project_owner",
        )
      : makeCheck(
          "basics-complete",
          "basics",
          "blocker",
          text("Campaign name, project, objective, period, and target users are required.", "必须填写活动名称、项目、目标、周期与目标用户。"),
          text("Complete required campaign basics.", "补全活动基础信息。"),
          "project_owner",
        ),
  );

  checks.push(
    hasEnglishRewardDisclaimer(draft)
      ? makeCheck(
          "reward-disclaimer",
          "rewards",
          "passed",
          text("English reward responsibility disclaimer is present.", "英文奖励责任声明已提供。"),
          text("Keep disclaimer visible in reward review.", "在奖励审核中保留该声明。"),
          "project_owner",
        )
      : makeCheck(
          "reward-disclaimer",
          "rewards",
          "blocker",
          text("English reward responsibility disclaimer is required.", "必须提供英文奖励责任声明。"),
          text("State that rewards are project-provided and Campaign OS does not distribute rewards.", "说明奖励由项目方提供，Campaign OS 不负责自动发奖。"),
          "project_owner",
        ),
  );

  checks.push(
    draft.contractImpact.mode === "CONTRACT_CLAIM"
      ? makeCheck(
          "contract-impact",
          "contract",
          "blocker",
          text("Contract claim mode requires high-impact manual review.", "合约领取模式需要高影响人工审核。"),
          text("Switch to Off-chain MVP or complete contract reviewer approval.", "切换到 Off-chain MVP，或完成合约审核人批准。"),
          "contract_reviewer",
        )
      : makeCheck(
          "contract-impact",
          "contract",
          "passed",
          text("Off-chain MVP mode does not require contract migration.", "Off-chain MVP 模式不需要合约迁移。"),
          text("Keep contract impact visible before publish.", "发布前继续展示合约影响。"),
          "contract_reviewer",
        ),
  );

  checks.push(
    hasExportDisclaimer(draft)
      ? makeCheck(
          "export-disclaimer",
          "export",
          "passed",
          text("Export disclaimer is accepted.", "导出声明已确认。"),
          text("Keep export boundary visible in publish readiness.", "在发布准备度中保留导出边界。"),
          "internal_operator",
        )
      : makeCheck(
          "export-disclaimer",
          "export",
          "blocker",
          text("Export disclaimer is required before publish.", "发布前必须确认导出声明。"),
          text("Confirm that exporting winners does not distribute rewards.", "确认导出获奖名单不等于发奖。"),
          "internal_operator",
        ),
  );

  if (hasUnreviewedChineseAiDraft(draft)) {
    checks.push(
      makeCheck(
        "i18n-human-review",
        "i18n",
        "warning",
        text("Chinese AI draft falls back to English until reviewed.", "中文 AI 草稿审核前回退到英文。"),
        text("Review Chinese draft before presenting it as published content.", "中文草稿经人工审核后才可作为已发布内容展示。"),
        "project_owner",
      ),
    );
  } else {
    checks.push(
      makeCheck(
        "i18n-human-review",
        "i18n",
        "passed",
        text("All localized content is reviewed or safely falling back.", "所有本地化内容已审核或安全回退。"),
        text("Keep locale status visible.", "继续展示语言状态。"),
        "project_owner",
      ),
    );
  }

  if (isHighRewardSocialOnly(draft)) {
    checks.push(
      makeCheck(
        "risk-social-reward",
        "risk",
        "warning",
        text("High-reward social-heavy campaigns need risk review.", "高奖励且偏社交任务的活动需要风险审核。"),
        text("Add verified on-chain or dApp tasks, or keep manual risk review enabled.", "增加链上或 dApp 验证任务，或保持人工风险审核开启。"),
        "internal_operator",
      ),
    );
  } else {
    checks.push(
      makeCheck(
        "risk-social-reward",
        "risk",
        "passed",
        text("Task mix does not rely only on high-reward social actions.", "任务组合不只依赖高奖励社交行为。"),
        text("Keep risk flags enabled.", "保持风险标记开启。"),
        "internal_operator",
      ),
    );
  }

  const blockers = checks.filter((check) => check.status === "blocker");

  return {
    ready: blockers.length === 0,
    blockers,
    warnings: checks.filter((check) => check.status === "warning"),
    passed: checks.filter((check) => check.status === "passed"),
    lastReviewedAt: "2026-06-26T15:00:00Z",
  };
};

export const seededBuilderReadiness = computeBuilderPublishReadiness(seededCampaignDraft);
