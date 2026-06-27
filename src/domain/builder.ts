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

export interface PublishGateCounts {
  blockers: number;
  warnings: number;
  passed: number;
  total: number;
}

export interface PublishGateItem {
  id: string;
  group: ReadinessGroup;
  status: ReadinessStatus;
  title: LocalizedText;
  reason: LocalizedText;
  nextAction: LocalizedText;
  ownerRole: OwnerRole;
  blocksPublish: boolean;
}

export interface PublishGateApprovalRoute {
  ownerRole: OwnerRole;
  label: LocalizedText;
  status: "ready" | "warning" | "blocker";
  gateIds: string[];
  summary: LocalizedText;
  nextAction: LocalizedText;
}

export interface PublishGateDecisionCenter {
  campaignDraftId: string;
  launchState: "ready" | "warning" | "blocker";
  ready: boolean;
  summary: LocalizedText;
  boundary: LocalizedText;
  lastReviewedAt: string;
  counts: PublishGateCounts;
  gates: PublishGateItem[];
  approvalRoutes: PublishGateApprovalRoute[];
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

const gateTitles: Record<string, LocalizedText> = {
  "basics-complete": text("Campaign basics", "活动基础信息"),
  "contract-impact": text("Contract impact", "合约影响"),
  "export-disclaimer": text("Export boundary", "导出边界"),
  "i18n-human-review": text("i18n human review", "多语言人工审核"),
  "reward-disclaimer": text("Reward disclaimer", "奖励声明"),
  "risk-referral-controls": text("Referral and risk controls", "推荐与风险控制"),
  "risk-social-reward": text("Social reward risk", "社交奖励风险"),
  "task-verifiability": text("Task verifiability", "任务可验证性"),
  "wallet-policy": text("Wallet policy", "钱包策略"),
};

const ownerRoleLabels: Record<OwnerRole, LocalizedText> = {
  contract_reviewer: text("Contract reviewer", "合约审核人"),
  internal_operator: text("Internal operator", "内部运营"),
  project_owner: text("Project owner", "项目方"),
};

const publishBoundary = text(
  "Seeded review only: no real publish, backend write, wallet signature, contract transaction, reward custody, reward distribution, export download, or live AI generation is executed.",
  "仅 seeded 审核：不执行真实发布、后端写入、钱包签名、合约交易、奖励托管、奖励发放、导出下载或实时 AI 生成。",
);

const toGateItem = (check: ReadinessCheck): PublishGateItem => ({
  ...check,
  blocksPublish: check.status === "blocker",
  title: gateTitles[check.id] ?? check.reason,
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

const selectedTaskTemplates = (draft: CampaignDraft) =>
  taskTemplateLibrary.filter((template) => draft.selectedTaskTemplateIds.includes(template.id));

const createWalletGate = (draft: CampaignDraft): PublishGateItem => {
  if (draft.walletPolicy === "ANY") {
    return toGateItem(
      makeCheck(
        "wallet-policy",
        "wallet",
        "passed",
        text("Any wallet allows AA and EOA users to participate.", "任意钱包允许 AA 与 EOA 用户参与。"),
        text("Keep Portkey AA recommended for new users without excluding EOA users.", "继续推荐新用户使用 Portkey AA，但不要排除 EOA 用户。"),
        "project_owner",
      ),
    );
  }

  return toGateItem(
    makeCheck(
      "wallet-policy",
      "wallet",
      draft.formState.walletPolicyConfirmed ? "passed" : "warning",
      draft.walletPolicy === "AA_ONLY"
        ? text("Campaign is restricted to AA wallets.", "活动限制为 AA 钱包。")
        : text("Campaign is restricted to EOA wallets.", "活动限制为 EOA 钱包。"),
      text("Confirm the restriction is intentional before publishing.", "发布前确认该钱包限制是有意配置。"),
      "project_owner",
    ),
  );
};

const createTaskGate = (draft: CampaignDraft): PublishGateItem => {
  const templates = selectedTaskTemplates(draft);
  const verifiableTemplates = templates.filter((template) =>
    ["DAPP_API", "ON_CHAIN", "REFERRAL", "WALLET"].includes(template.verificationType),
  );
  const onChainOrDappTemplates = templates.filter((template) =>
    ["DAPP_API", "ON_CHAIN"].includes(template.verificationType),
  );

  if (templates.length === 0) {
    return toGateItem(
      makeCheck(
        "task-verifiability",
        "tasks",
        "blocker",
        text("At least one campaign task is required before publish.", "发布前至少需要一个活动任务。"),
        text("Add wallet, on-chain, dApp API, or referral templates.", "添加钱包、链上、dApp API 或推荐任务模板。"),
        "project_owner",
      ),
    );
  }

  if (verifiableTemplates.length === 0 || onChainOrDappTemplates.length === 0) {
    return toGateItem(
      makeCheck(
        "task-verifiability",
        "tasks",
        "warning",
        text("Task mix needs at least one on-chain or dApp API verification anchor.", "任务组合需要至少一个链上或 dApp API 验证锚点。"),
        text("Add bridge, swap, NFT, DAO, or dApp API task before high-value publish.", "高价值活动发布前加入 bridge、swap、NFT、DAO 或 dApp API 任务。"),
        "internal_operator",
      ),
    );
  }

  return toGateItem(
    makeCheck(
      "task-verifiability",
      "tasks",
      "passed",
      text("Selected tasks include wallet, bridge, and swap verification anchors.", "已选任务包含钱包、bridge 与 swap 验证锚点。"),
      text("Keep on-chain or dApp API evidence visible in task review.", "在任务审核中保留链上或 dApp API 证据。"),
      "internal_operator",
    ),
  );
};

const createRiskReferralGate = (draft: CampaignDraft): PublishGateItem => {
  if (
    draft.eligibilityRule.referralValidationEnabled &&
    draft.eligibilityRule.riskFlagsEnabled &&
    draft.eligibilityRule.manualReviewRequired
  ) {
    return toGateItem(
      makeCheck(
        "risk-referral-controls",
        "risk",
        "passed",
        text("Referral validation, risk flags, and manual review are enabled.", "推荐验证、风险标记与人工审核已启用。"),
        text("Keep internal operator review before winner export.", "在 winners 导出前保留内部运营审核。"),
        "internal_operator",
      ),
    );
  }

  return toGateItem(
    makeCheck(
      "risk-referral-controls",
      "risk",
      "warning",
      text("Referral validation, risk flags, or manual review is incomplete.", "推荐验证、风险标记或人工审核尚未完整配置。"),
      text("Enable referral validation, risk flags, and manual review before publishing high-reward campaigns.", "发布高奖励活动前启用推荐验证、风险标记与人工审核。"),
      "internal_operator",
    ),
  );
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
          text(
            "Exporting winners does not distribute rewards disclaimer is accepted.",
            "导出 winners 不等于发奖的声明已确认。",
          ),
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

const routeStatus = (gates: PublishGateItem[]): "ready" | "warning" | "blocker" => {
  if (gates.some((gate) => gate.status === "blocker")) {
    return "blocker";
  }

  if (gates.some((gate) => gate.status === "warning")) {
    return "warning";
  }

  return "ready";
};

const routeNextAction = (ownerRole: OwnerRole): LocalizedText => {
  if (ownerRole === "contract_reviewer") {
    return text("Approve Off-chain MVP or keep contract claim blocked.", "批准 Off-chain MVP，或保持合约领取阻断。");
  }

  if (ownerRole === "internal_operator") {
    return text("Review task risk, referral controls, and export boundaries.", "审核任务风险、推荐控制与导出边界。");
  }

  return text("Confirm reward disclaimer, wallet policy, and localized content before publish.", "发布前确认奖励声明、钱包策略与本地化内容。");
};

const routeSummary = (ownerRole: OwnerRole, gates: PublishGateItem[]): LocalizedText => {
  const unresolvedCount = gates.filter((gate) => gate.status !== "passed").length;

  if (unresolvedCount > 0) {
    return text(
      `${unresolvedCount} gate${unresolvedCount === 1 ? "" : "s"} need owner attention.`,
      `${unresolvedCount} 个门禁需要负责人处理。`,
    );
  }

  if (ownerRole === "internal_operator") {
    return text("Risk/referral and export boundaries remain visible.", "风险/推荐与导出边界保持可见。");
  }

  return text("Owner checks are visible for final review.", "负责人检查项已展示，等待最终审核。");
};

const createApprovalRoutes = (gates: PublishGateItem[]): PublishGateApprovalRoute[] => {
  const routeGateIds = new Set([
    "contract-impact",
    "export-disclaimer",
    "i18n-human-review",
    "reward-disclaimer",
    "risk-referral-controls",
    "risk-social-reward",
    "wallet-policy",
  ]);

  return (["project_owner", "internal_operator", "contract_reviewer"] as const)
    .map((ownerRole) => {
      const routeGates = gates.filter(
        (gate) =>
          gate.ownerRole === ownerRole &&
          (gate.status !== "passed" || routeGateIds.has(gate.id)),
      );

      return {
        gateIds: routeGates.map((gate) => gate.id),
        label: ownerRoleLabels[ownerRole],
        nextAction: routeNextAction(ownerRole),
        ownerRole,
        status: routeStatus(routeGates),
        summary: routeSummary(ownerRole, routeGates),
      };
    })
    .filter((route) => route.gateIds.length > 0);
};

export const createPublishGateDecisionCenter = (
  draft: CampaignDraft,
): PublishGateDecisionCenter => {
  const readiness = computeBuilderPublishReadiness(draft);
  const gates = [
    ...readiness.blockers.map(toGateItem),
    ...readiness.warnings.map(toGateItem),
    ...readiness.passed.map(toGateItem),
    createWalletGate(draft),
    createTaskGate(draft),
    createRiskReferralGate(draft),
  ];
  const blockers = gates.filter((gate) => gate.status === "blocker");
  const warnings = gates.filter((gate) => gate.status === "warning");
  const passed = gates.filter((gate) => gate.status === "passed");
  const launchState =
    blockers.length > 0 ? "blocker" : warnings.length > 0 ? "warning" : "ready";

  return {
    approvalRoutes: createApprovalRoutes(gates),
    boundary: publishBoundary,
    campaignDraftId: draft.id,
    counts: {
      blockers: blockers.length,
      passed: passed.length,
      total: gates.length,
      warnings: warnings.length,
    },
    gates,
    lastReviewedAt: readiness.lastReviewedAt,
    launchState,
    ready: launchState === "ready",
    summary:
      launchState === "blocker"
        ? text("Publish is blocked until high-impact gates are resolved.", "高影响门禁解决前不能发布。")
        : launchState === "warning"
          ? text("Publish has warnings that need owner review.", "发布前仍有警告需要负责人审核。")
          : text("All seeded publish gates are ready.", "所有 seeded 发布门禁已就绪。"),
  };
};
