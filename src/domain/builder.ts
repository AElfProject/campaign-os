import type {
  ContractMode,
  AiConfidence,
  LocalizedText,
  LocaleStatus,
  OwnerRole,
  RiskLevel,
  SupportedLocale,
  TemplateGovernanceConsole,
  TemplateGovernanceRow,
  TemplateGovernanceSignal,
  TemplateGovernanceStatus,
  VerificationType,
  WalletCompatibility,
  WalletPolicy,
} from "./types";

export const builderSupportedLocales = ["en-US", "zh-CN", "zh-TW"] as const satisfies readonly SupportedLocale[];

export type BuilderStepStatus = "incomplete" | "warning" | "blocked" | "ready" | "reviewed";
export type BuilderStepId = "goal" | "tasks" | "rewards" | "i18n" | "contract" | "readiness";
export type BuilderCreationMode = "AI_ASSISTED" | "FORM_BASED";
export type CampaignObjective = "acquisition" | "activation" | "trading" | "nft" | "dao" | "launch";
export type TaskTemplateCategory =
  | "wallet"
  | "bridge"
  | "swap"
  | "liquidity"
  | "nft"
  | "schrodinger"
  | "dao"
  | "daipp"
  | "pay"
  | "forecast"
  | "social"
  | "invite";
export type RewardProvider = "campaign_project" | "partner";
export type PointsRule = "task_points" | "daily_cap" | "referral_bonus";
export type WinnerRule = "top_n" | "threshold" | "manual_review";
export type ReadinessGroup = "basics" | "wallet" | "tasks" | "rewards" | "i18n" | "contract" | "risk" | "export";
export type ReadinessStatus = "blocker" | "warning" | "passed";
export type TaskTemplateWalletFilter = "aa" | "eoa" | "any";
export type TaskTemplateVerificationFilter =
  | "on_chain"
  | "dapp_api"
  | "social"
  | "manual"
  | "wallet"
  | "referral";
export type TaskTemplateLanguageFilter =
  | "en_ready"
  | "missing_translations"
  | "zh_draft"
  | "zh_fallback"
  | "zh_reviewed";

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

export type CampaignTemplatePresetId =
  | "aelf-onboarding-campaign"
  | "awaken-liquidity-challenge"
  | "nft-holder-quest"
  | "dao-governance-campaign"
  | "ai-agent-coin-launch-campaign";
export type CampaignTemplateReadiness = "ready" | "review_required";
export type CampaignTemplateTaskCategory =
  | TaskTemplateCategory
  | "agent_page"
  | "governance_badge"
  | "leaderboard"
  | "portfolio"
  | "proposal_summary";

export interface CampaignTemplateTaskStep {
  id: string;
  label: LocalizedText;
  description: LocalizedText;
  taskCategory: CampaignTemplateTaskCategory;
  verificationIntent: LocalizedText;
  localOnly: boolean;
  reviewRequired: boolean;
}

export interface CampaignTemplatePreset {
  id: CampaignTemplatePresetId;
  title: LocalizedText;
  goal: LocalizedText;
  targetAudience: LocalizedText;
  suitableFor: LocalizedText;
  taskSequence: CampaignTemplateTaskStep[];
  defaultWalletPolicy: WalletPolicy;
  pointsAndRankingHint: LocalizedText;
  rewardBoundary: LocalizedText;
  riskGuidance: LocalizedText;
  ownerRole: OwnerRole;
  nextAction: LocalizedText;
  readiness: CampaignTemplateReadiness;
  boundary: LocalizedText;
}

export interface CampaignTemplatePackSummary {
  totalTemplates: number;
  readyTemplateCount: number;
  reviewRequiredTemplateCount: number;
  defaultLocale: "en-US";
  ecosystemCoverage: LocalizedText[];
  topNextAction: LocalizedText;
  boundary: LocalizedText;
}

export interface CampaignTemplatePack {
  templates: CampaignTemplatePreset[];
  summary: CampaignTemplatePackSummary;
  boundary: LocalizedText;
}

export interface TaskTemplateFilterState {
  wallet: TaskTemplateWalletFilter[];
  verification: TaskTemplateVerificationFilter[];
  language: TaskTemplateLanguageFilter[];
}

export interface TaskTemplateFilterOption<TValue extends string> {
  value: TValue;
  label: LocalizedText;
  description: LocalizedText;
}

export interface TaskTemplateFilterSummary {
  totalTemplates: number;
  visibleTemplates: number;
  selectedFilters: number;
  hasActiveFilters: boolean;
  isEmpty: boolean;
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

export type AiPlannerGroupId =
  | "campaign_structure"
  | "wallet_policy"
  | "language_plan"
  | "task_strategy"
  | "risk_hints"
  | "contract_recommendation";
export type AiPlannerDecisionStatus =
  | "ready"
  | "review_required"
  | "warning"
  | "blocked";

export interface AiPlannerDecisionItem {
  id: string;
  status: AiPlannerDecisionStatus;
  ownerRole: OwnerRole;
  confidence: AiConfidence;
  label: LocalizedText;
  rationale: LocalizedText;
  nextAction: LocalizedText;
}

export interface AiPlannerRecommendationGroup {
  id: AiPlannerGroupId;
  title: LocalizedText;
  summary: LocalizedText;
  items: AiPlannerDecisionItem[];
}

export interface AiPlannerSummary {
  prompt: string;
  generatedOutline: string[];
  reviewedByHuman: boolean;
  defaultLocale: "en-US";
  supportedLocales: SupportedLocale[];
  walletPolicy: WalletPolicy;
  recommendedWallet: LocalizedText;
  contractMode: ContractMode;
  campaignTemplatePack: CampaignTemplatePackSummary;
}

export interface AiPlannerDecisionCounts {
  blocked: number;
  ready: number;
  reviewRequired: number;
  total: number;
  warning: number;
}

export interface AiCampaignPlannerDecisionConsole {
  draftId: string;
  summary: AiPlannerSummary;
  groups: AiPlannerRecommendationGroup[];
  counts: AiPlannerDecisionCounts;
  boundary: LocalizedText;
  nextAction: LocalizedText;
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

const text = (enUS: string, zhCN: string, zhTW = zhCN): LocalizedText => ({
  "en-US": enUS,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
});

const chineseLocales = builderSupportedLocales.filter((locale) => locale.startsWith("zh-"));

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

export const defaultTaskTemplateFilters: TaskTemplateFilterState = {
  language: [],
  verification: [],
  wallet: [],
};

export const taskTemplateWalletFilterOptions: TaskTemplateFilterOption<TaskTemplateWalletFilter>[] = [
  {
    value: "aa",
    label: text("AA", "AA"),
    description: text(
      "Show templates compatible with account abstraction wallets.",
      "展示兼容账户抽象钱包的模板。",
    ),
  },
  {
    value: "eoa",
    label: text("EOA", "EOA"),
    description: text(
      "Show templates compatible with externally owned accounts.",
      "展示兼容外部拥有账户的钱包模板。",
    ),
  },
  {
    value: "any",
    label: text("Any", "任意"),
    description: text(
      "Show templates explicitly marked for any wallet type.",
      "展示明确标记为任意钱包类型的模板。",
    ),
  },
];

export const taskTemplateVerificationFilterOptions: TaskTemplateFilterOption<TaskTemplateVerificationFilter>[] = [
  {
    value: "on_chain",
    label: text("On-chain", "链上"),
    description: text("Verified from on-chain activity.", "通过链上活动验证。"),
  },
  {
    value: "dapp_api",
    label: text("DApp API", "DApp API"),
    description: text("Verified from a dApp API integration.", "通过 DApp API 集成验证。"),
  },
  {
    value: "social",
    label: text("Social", "社交"),
    description: text("Verified from a social action or review.", "通过社交行为或审核验证。"),
  },
  {
    value: "manual",
    label: text("Manual", "人工"),
    description: text("Requires manual operator verification.", "需要运营人工验证。"),
  },
  {
    value: "wallet",
    label: text("Wallet", "钱包"),
    description: text("Verified from wallet connection state.", "通过钱包连接状态验证。"),
  },
  {
    value: "referral",
    label: text("Referral", "推荐"),
    description: text("Verified from qualified invite completion.", "通过合格邀请完成情况验证。"),
  },
];

export const taskTemplateLanguageFilterOptions: TaskTemplateFilterOption<TaskTemplateLanguageFilter>[] = [
  {
    value: "en_ready",
    label: text("English ready", "英文已就绪"),
    description: text("English copy is ready for campaign use.", "英文文案已可用于活动。"),
  },
  {
    value: "missing_translations",
    label: text("Missing translations", "缺少翻译"),
    description: text(
      "At least one supported locale still needs review or fallback work.",
      "至少一个受支持语言仍需要审核或回退处理。",
    ),
  },
  {
    value: "zh_draft",
    label: text("Chinese draft", "中文草稿"),
    description: text("At least one Chinese locale is still an AI draft.", "至少一个中文语言仍是 AI 草稿。"),
  },
  {
    value: "zh_fallback",
    label: text("Chinese fallback", "中文回退"),
    description: text("At least one Chinese locale falls back to English.", "至少一个中文语言仍回退到英文。"),
  },
  {
    value: "zh_reviewed",
    label: text("Chinese reviewed", "中文已审核"),
    description: text("All Chinese locales have completed human review.", "所有中文语言已完成人工审核。"),
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
    localeReadiness: { "en-US": "ready", "zh-CN": "reviewed", "zh-TW": "fallback" },
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
    localeReadiness: { "en-US": "ready", "zh-CN": "ai_draft", "zh-TW": "missing" },
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
    localeReadiness: { "en-US": "ready", "zh-CN": "ai_draft", "zh-TW": "missing" },
  },
  {
    id: "tpl-liquidity-awaken",
    category: "liquidity",
    title: text("Add liquidity on Awaken", "在 Awaken 添加流动性"),
    description: text(
      "Verify seeded/local LP position or liquidity event evidence without connecting a live Awaken provider.",
      "验证 seeded/本地 LP 仓位或流动性事件证据，不连接实时 Awaken provider。",
    ),
    verificationType: "ON_CHAIN",
    walletCompatibility: "ANY",
    defaultPoints: 130,
    requiredByDefault: false,
    riskLevel: "medium",
    localeReadiness: { "en-US": "ready", "zh-CN": "ai_draft", "zh-TW": "missing" },
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
    localeReadiness: { "en-US": "ready", "zh-CN": "ai_draft", "zh-TW": "missing" },
  },
  {
    id: "tpl-schrodinger-hold",
    category: "schrodinger",
    title: text("Hold Schrödinger NFT", "持有 Schrödinger NFT"),
    description: text(
      "Verify seeded adopt, hold, or trade participation for Schrödinger NFTs.",
      "验证 Schrödinger NFT 的 seeded 领养、持有或交易参与。",
    ),
    verificationType: "ON_CHAIN",
    walletCompatibility: "ANY",
    defaultPoints: 95,
    requiredByDefault: false,
    riskLevel: "medium",
    localeReadiness: { "en-US": "ready", "zh-CN": "ai_draft", "zh-TW": "missing" },
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
    localeReadiness: { "en-US": "ready", "zh-CN": "fallback", "zh-TW": "fallback" },
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
    localeReadiness: { "en-US": "ready", "zh-CN": "ai_draft", "zh-TW": "missing" },
  },
  {
    id: "tpl-pay-complete",
    category: "pay",
    title: text("Complete aelf Pay payment", "完成 aelf Pay 支付"),
    description: text(
      "Complete a seeded invoice or payment link task through aelf Pay metadata.",
      "通过 aelf Pay metadata 完成 seeded 发票或支付链接任务。",
    ),
    verificationType: "DAPP_API",
    walletCompatibility: "ANY",
    defaultPoints: 85,
    requiredByDefault: false,
    riskLevel: "medium",
    localeReadiness: { "en-US": "ready", "zh-CN": "ai_draft", "zh-TW": "missing" },
  },
  {
    id: "tpl-forecast-participate",
    category: "forecast",
    title: text("Participate in Forecast", "参与 Forecast 预测"),
    description: text(
      "Join a seeded prediction or win-streak activity from Forecast metadata.",
      "基于 Forecast metadata 参与 seeded 预测或连胜任务。",
    ),
    verificationType: "DAPP_API",
    walletCompatibility: "ANY",
    defaultPoints: 90,
    requiredByDefault: false,
    riskLevel: "medium",
    localeReadiness: { "en-US": "ready", "zh-CN": "ai_draft", "zh-TW": "missing" },
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
    localeReadiness: { "en-US": "ready", "zh-CN": "ai_draft", "zh-TW": "missing" },
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
    localeReadiness: { "en-US": "ready", "zh-CN": "fallback", "zh-TW": "fallback" },
  },
];

const campaignTemplateBoundary = text(
  "Seeded/local campaign template guidance only. No live provider verification, automatic campaign creation, automatic publish, wallet signing, contract write, export file, reward custody, or reward distribution is executed.",
  "仅 seeded/本地活动模板指引。不会执行实时 provider 验证、自动创建活动、自动发布、钱包签名、合约写入、导出文件、奖励托管或发奖。",
  "Seeded/local campaign template guidance only. No live provider verification, automatic campaign creation, automatic publish, wallet signing, contract write, export file, reward custody, or reward distribution is executed.",
);

const campaignRewardBoundary = text(
  "Rewards are provided and fulfilled by the campaign project or partner. Campaign OS provides preset guidance, review, verification intent, points, analytics, and export support only.",
  "奖励由活动项目方或合作伙伴提供并履约。Campaign OS 只提供模板指引、审核、验证意图、积分、分析与导出支持。",
  "Rewards are provided and fulfilled by the campaign project or partner. Campaign OS provides preset guidance, review, verification intent, points, analytics, and export support only.",
);

const campaignStep = (
  id: string,
  taskCategory: CampaignTemplateTaskCategory,
  label: LocalizedText,
  description: LocalizedText,
  verificationIntent: LocalizedText,
  localOnly = false,
  reviewRequired = false,
): CampaignTemplateTaskStep => ({
  description,
  id,
  label,
  localOnly,
  reviewRequired,
  taskCategory,
  verificationIntent,
});

export const campaignTemplatePresets: CampaignTemplatePreset[] = [
  {
    boundary: campaignTemplateBoundary,
    defaultWalletPolicy: "ANY",
    goal: text("Bring new users into the aelf ecosystem.", "将新用户带入 aelf 生态。"),
    id: "aelf-onboarding-campaign",
    nextAction: text("Review wallet, bridge, swap, Portfolio, and invite steps before campaign drafting.", "创建活动草稿前审核钱包、bridge、swap、Portfolio 与邀请步骤。"),
    ownerRole: "project_owner",
    pointsAndRankingHint: text("Rank by verified onboarding actions and qualified invite completion.", "按已验证引导行为与合格邀请完成情况排名。"),
    readiness: "ready",
    rewardBoundary: campaignRewardBoundary,
    riskGuidance: text("Keep qualified invite validation and manual review enabled before winner export.", "Winner 导出前保持合格邀请验证与人工审核开启。"),
    suitableFor: text("New-user growth, exchange campaigns, and ecosystem promotion.", "新用户增长、交易所活动与生态推广。"),
    targetAudience: text("New aelf users and wallet-ready ecosystem explorers.", "aelf 新用户与钱包就绪的生态探索者。"),
    taskSequence: [
      campaignStep(
        "onboarding-wallet",
        "wallet",
        text("Connect wallet or Portkey", "连接钱包或 Portkey"),
        text("Start with a supported AA or EOA wallet entry.", "从受支持的 AA 或 EOA 钱包入口开始。"),
        text("Wallet connection state is local seeded readiness.", "钱包连接状态是本地 seeded readiness。"),
      ),
      campaignStep(
        "onboarding-bridge",
        "bridge",
        text("Bridge assets via eBridge", "通过 eBridge 跨链资产"),
        text("Use bridge completion as the first ecosystem action.", "将跨链完成作为第一个生态行为。"),
        text("Bridge verification remains provider-review gated.", "Bridge 验证仍需 provider review 门禁。"),
      ),
      campaignStep(
        "onboarding-swap",
        "swap",
        text("Complete one swap on Awaken", "在 Awaken 完成一次 Swap"),
        text("Ask users to complete a seeded swap task.", "要求用户完成 seeded swap 任务。"),
        text("Swap verification remains local/dApp API intent.", "Swap 验证仍为本地/dApp API 意图。"),
      ),
      campaignStep(
        "onboarding-portfolio",
        "portfolio",
        text("Check Portfolio", "查看 Portfolio"),
        text("Guide users to inspect portfolio context after core tasks.", "引导用户在核心任务后查看 Portfolio 上下文。"),
        text("Portfolio check is local-only intent until a provider contract exists.", "在 provider contract 存在前，Portfolio 检查是仅本地意图。"),
        true,
      ),
      campaignStep(
        "onboarding-invite",
        "invite",
        text("Invite one qualified friend", "邀请一名合格好友"),
        text("Count invites only after the invitee completes required actions.", "仅在被邀请人完成必做行为后计入邀请。"),
        text("Referral validation and risk review are required.", "需要邀请验证与风险审核。"),
        false,
        true,
      ),
    ],
    title: text("aelf Onboarding Campaign", "aelf 新手引导活动"),
  },
  {
    boundary: campaignTemplateBoundary,
    defaultWalletPolicy: "ANY",
    goal: text("Increase Awaken swap and liquidity participation.", "提升 Awaken swap 与流动性参与。"),
    id: "awaken-liquidity-challenge",
    nextAction: text("Review LP effort, volume ranking, and reward cost before using this preset.", "使用该模板前审核 LP 门槛、交易量排名与奖励成本。"),
    ownerRole: "project_owner",
    pointsAndRankingHint: text("Rank by verified volume or valid swap and liquidity actions.", "按已验证交易量或有效 swap 与流动性行为排名。"),
    readiness: "review_required",
    rewardBoundary: campaignRewardBoundary,
    riskGuidance: text("Volume and LP tasks need cost, wash-trade, and referral review before launch.", "交易量与 LP 任务上线前需要成本、刷量与邀请风险审核。"),
    suitableFor: text("DEX growth and liquidity activation.", "DEX 增长与流动性激活。"),
    targetAudience: text("Active traders, LP candidates, and qualified invited users.", "活跃交易者、LP 候选用户与合格被邀请用户。"),
    taskSequence: [
      campaignStep(
        "liquidity-swap",
        "swap",
        text("Swap ELF or stable asset", "Swap ELF 或稳定资产"),
        text("Start with a seeded swap action.", "从 seeded swap 行为开始。"),
        text("Swap verification remains local/dApp API intent.", "Swap 验证仍为本地/dApp API 意图。"),
      ),
      campaignStep(
        "liquidity-add",
        "liquidity",
        text("Add liquidity", "添加流动性"),
        text("Represent LP position or liquidity event participation.", "表达 LP 仓位或流动性事件参与。"),
        text("LP evidence is seeded/local until live provider review.", "在实时 provider review 前，LP evidence 保持 seeded/本地。"),
        true,
        true,
      ),
      campaignStep(
        "liquidity-hold",
        "liquidity",
        text("Hold LP for a period", "持有 LP 一段时间"),
        text("Use hold duration as local campaign intent.", "将持有周期作为本地活动意图。"),
        text("Hold-duration proof is local-only intent.", "持有周期证明是仅本地意图。"),
        true,
        true,
      ),
      campaignStep(
        "liquidity-invite",
        "invite",
        text("Invite users who complete swap", "邀请完成 Swap 的用户"),
        text("Only qualified swap completion should count.", "只有完成合格 swap 的邀请才计入。"),
        text("Referral validation and risk review are required.", "需要邀请验证与风险审核。"),
        false,
        true,
      ),
      campaignStep(
        "liquidity-rank",
        "leaderboard",
        text("Rank by verified volume or valid actions", "按验证交易量或有效行为排名"),
        text("Use ranking as review input rather than automatic payout.", "将排名作为审核输入，而不是自动发奖。"),
        text("Leaderboard remains seeded/local review input.", "排行榜保持 seeded/本地审核输入。"),
        true,
        true,
      ),
    ],
    title: text("Awaken Liquidity Challenge", "Awaken 流动性挑战"),
  },
  {
    boundary: campaignTemplateBoundary,
    defaultWalletPolicy: "ANY",
    goal: text("Activate Forest and Schrödinger NFT holders.", "激活 Forest 与 Schrödinger NFT 用户。"),
    id: "nft-holder-quest",
    nextAction: text("Review collection eligibility, holder rules, and share copy before launch.", "上线前审核合集资格、持有规则与分享文案。"),
    ownerRole: "project_owner",
    pointsAndRankingHint: text("Rank by verified NFT ownership, hold intent, and reviewed collection activity.", "按已验证 NFT 持有、持有意图与已审核合集行为排名。"),
    readiness: "review_required",
    rewardBoundary: campaignRewardBoundary,
    riskGuidance: text("NFT mint, trade, and list actions need collection eligibility and wash-trade review.", "NFT mint、交易与挂单行为需要合集资格与刷量审核。"),
    suitableFor: text("NFT collections, Schrödinger, and Forest campaigns.", "NFT 合集、Schrödinger 与 Forest 活动。"),
    targetAudience: text("NFT minters, holders, traders, and collection community members.", "NFT mint 用户、持有人、交易者与合集社区成员。"),
    taskSequence: [
      campaignStep(
        "nft-mint",
        "nft",
        text("Mint NFT", "Mint NFT"),
        text("Represent a collection mint action.", "表达合集 mint 行为。"),
        text("NFT proof remains on-chain/local evidence intent.", "NFT 证明保持链上/本地 evidence 意图。"),
      ),
      campaignStep(
        "nft-hold",
        "schrodinger",
        text("Hold NFT for a duration", "持有 NFT 一段时间"),
        text("Represent Forest or Schrödinger holding intent.", "表达 Forest 或 Schrödinger 持有意图。"),
        text("Hold duration remains seeded/local review input.", "持有周期保持 seeded/本地审核输入。"),
        true,
        true,
      ),
      campaignStep(
        "nft-trade-list",
        "nft",
        text("Trade or list NFT", "交易或挂单 NFT"),
        text("Represent market activity without connecting a live marketplace.", "表达市场行为，但不连接真实 marketplace。"),
        text("Marketplace evidence is local-only intent.", "Marketplace evidence 是仅本地意图。"),
        true,
        true,
      ),
      campaignStep(
        "nft-share",
        "social",
        text("Share collection", "分享合集"),
        text("Share approved collection copy.", "分享已审核的合集文案。"),
        text("Social proof requires review.", "社交证明需要审核。"),
        false,
        true,
      ),
      campaignStep(
        "nft-leaderboard",
        "leaderboard",
        text("Join holder leaderboard", "加入持有人排行榜"),
        text("Show holder ranking as review input.", "将持有人排名作为审核输入。"),
        text("Leaderboard remains seeded/local.", "排行榜保持 seeded/本地。"),
        true,
      ),
    ],
    title: text("NFT Holder Quest", "NFT 持有人任务"),
  },
  {
    boundary: campaignTemplateBoundary,
    defaultWalletPolicy: "ANY",
    goal: text("Activate TMRWDAO governance participation.", "激活 TMRWDAO 治理参与。"),
    id: "dao-governance-campaign",
    nextAction: text("Review proposal context, voter eligibility, and badge rules before drafting.", "创建草稿前审核提案上下文、投票者资格与 badge 规则。"),
    ownerRole: "internal_operator",
    pointsAndRankingHint: text("Award governance points or badge eligibility after reviewed voting activity.", "在审核投票行为后给予治理积分或 badge 资格。"),
    readiness: "review_required",
    rewardBoundary: campaignRewardBoundary,
    riskGuidance: text("DAO tasks need proposal clarity, voter eligibility, and qualified-voter invite review.", "DAO 任务需要提案清晰度、投票者资格与合格投票邀请审核。"),
    suitableFor: text("DAO and community governance activation.", "DAO 与社区治理激活。"),
    targetAudience: text("DAO members, proposal readers, voters, and governance contributors.", "DAO 成员、提案阅读者、投票者与治理贡献者。"),
    taskSequence: [
      campaignStep(
        "dao-join",
        "dao",
        text("Join DAO or confirm readiness", "加入 DAO 或确认治理 readiness"),
        text("Start from DAO participation readiness.", "从 DAO 参与 readiness 开始。"),
        text("DAO readiness remains on-chain/local intent.", "DAO readiness 保持链上/本地意图。"),
      ),
      campaignStep(
        "dao-read",
        "proposal_summary",
        text("Read proposal summary", "阅读提案摘要"),
        text("Ask users to review proposal context before voting.", "要求用户投票前阅读提案上下文。"),
        text("Proposal summary reading is local-only intent.", "阅读提案摘要是仅本地意图。"),
        true,
        true,
      ),
      campaignStep(
        "dao-vote",
        "dao",
        text("Vote on proposal", "参与提案投票"),
        text("Use proposal voting as the verified governance anchor.", "将提案投票作为已验证治理锚点。"),
        text("Vote evidence remains provider-review gated.", "投票 evidence 仍需 provider review 门禁。"),
      ),
      campaignStep(
        "dao-invite",
        "invite",
        text("Invite qualified voter", "邀请合格投票者"),
        text("Count invites only when voter actions are qualified.", "仅在投票行为合格时计入邀请。"),
        text("Referral validation and governance review are required.", "需要邀请验证与治理审核。"),
        false,
        true,
      ),
      campaignStep(
        "dao-badge",
        "governance_badge",
        text("Earn governance badge or points", "获得治理 badge 或积分"),
        text("Use badge or points as reviewed eligibility output.", "将 badge 或积分作为审核后的资格输出。"),
        text("Badge eligibility remains local review output.", "Badge 资格保持本地审核输出。"),
        true,
        true,
      ),
    ],
    title: text("DAO Governance Campaign", "DAO 治理活动"),
  },
  {
    boundary: campaignTemplateBoundary,
    defaultWalletPolicy: "ANY",
    goal: text("Support daipp.ai and AI agent coin launch campaigns.", "支持 daipp.ai 与 AI agent coin 发行活动。"),
    id: "ai-agent-coin-launch-campaign",
    nextAction: text("Review agent interaction, asset language, and launch leaderboard risk before use.", "使用前审核 agent 互动、资产表述与发行排行榜风险。"),
    ownerRole: "internal_operator",
    pointsAndRankingHint: text("Rank by reviewed agent interaction, share quality, and launch participation intent.", "按已审核 agent 互动、分享质量与发行参与意图排名。"),
    readiness: "review_required",
    rewardBoundary: campaignRewardBoundary,
    riskGuidance: text("Buy or hold intent and launch sharing require legal, risk, and manual review before rewards.", "购买或持有意图与发行分享在奖励前需要法务、风险与人工审核。"),
    suitableFor: text("daipp projects and AI agent coin launch operations.", "daipp 项目与 AI agent coin 发行运营。"),
    targetAudience: text("AI agent users, launch participants, and reviewed community sharers.", "AI agent 用户、发行参与者与已审核社区分享者。"),
    taskSequence: [
      campaignStep(
        "agent-visit",
        "agent_page",
        text("Visit agent page", "访问 agent 页面"),
        text("Represent discovery of the agent campaign page.", "表达用户访问 agent 活动页。"),
        text("Agent page visit is local-only intent.", "Agent 页面访问是仅本地意图。"),
        true,
      ),
      campaignStep(
        "agent-interact",
        "daipp",
        text("Interact with agent", "与 agent 互动"),
        text("Use structured agent interaction as the participation anchor.", "将结构化 agent 互动作为参与锚点。"),
        text("daipp interaction remains DApp API intent.", "daipp 互动保持 DApp API 意图。"),
      ),
      campaignStep(
        "agent-hold",
        "daipp",
        text("Buy or hold agent asset intent", "购买或持有 agent 资产意图"),
        text("Represent reviewed launch participation without executing asset activity.", "表达已审核发行参与，但不执行资产行为。"),
        text("Asset participation is local-only review intent.", "资产参与是仅本地审核意图。"),
        true,
        true,
      ),
      campaignStep(
        "agent-share",
        "social",
        text("Share AI-generated intro", "分享 AI 生成简介"),
        text("Share approved intro copy after human review.", "人工审核后分享已批准简介文案。"),
        text("Social proof requires review.", "社交证明需要审核。"),
        false,
        true,
      ),
      campaignStep(
        "agent-leaderboard",
        "leaderboard",
        text("Join launch leaderboard", "加入发行排行榜"),
        text("Use launch leaderboard as review input.", "将发行排行榜作为审核输入。"),
        text("Leaderboard remains seeded/local.", "排行榜保持 seeded/本地。"),
        true,
        true,
      ),
    ],
    title: text("AI Agent Coin Launch Campaign", "AI Agent Coin 发行活动"),
  },
];

export const createCampaignTemplatePack = (
  templates: CampaignTemplatePreset[] = campaignTemplatePresets,
): CampaignTemplatePack => ({
  boundary: campaignTemplateBoundary,
  summary: {
    boundary: campaignTemplateBoundary,
    defaultLocale: "en-US",
    ecosystemCoverage: [
      text("Onboarding", "新手引导"),
      text("Awaken liquidity", "Awaken 流动性"),
      text("NFT holder", "NFT 持有人"),
      text("DAO governance", "DAO 治理"),
      text("AI agent launch", "AI agent 发行"),
    ],
    readyTemplateCount: templates.filter((template) => template.readiness === "ready").length,
    reviewRequiredTemplateCount: templates.filter((template) => template.readiness === "review_required").length,
    topNextAction: text(
      "Choose a preset, then run human review before creating or publishing a campaign draft.",
      "先选择模板，再完成人工审核，之后才能创建或发布活动草稿。",
    ),
    totalTemplates: templates.length,
  },
  templates,
});

const verificationFilterValues = {
  dapp_api: "DAPP_API",
  manual: "MANUAL",
  on_chain: "ON_CHAIN",
  referral: "REFERRAL",
  social: "SOCIAL",
  wallet: "WALLET",
} as const satisfies Record<TaskTemplateVerificationFilter, TaskTemplate["verificationType"]>;

const isLocaleReady = (status: LocaleStatus) => status === "ready" || status === "reviewed";

const selectedGroupMatches = <TValue extends string>(
  selectedValues: readonly TValue[],
  predicate: (selectedValue: TValue) => boolean,
) => selectedValues.length === 0 || selectedValues.some(predicate);

const matchesWalletFilter = (
  template: TaskTemplate,
  selectedWallets: readonly TaskTemplateWalletFilter[],
) =>
  selectedGroupMatches(selectedWallets, (selectedWallet) => {
    if (selectedWallet === "aa") {
      return template.walletCompatibility === "ANY" || template.walletCompatibility === "AA_ONLY";
    }
    if (selectedWallet === "eoa") {
      return template.walletCompatibility === "ANY" || template.walletCompatibility === "EOA_ONLY";
    }

    return template.walletCompatibility === "ANY";
  });

const matchesVerificationFilter = (
  template: TaskTemplate,
  selectedVerifications: readonly TaskTemplateVerificationFilter[],
) =>
  selectedGroupMatches(
    selectedVerifications,
    (selectedVerification) => template.verificationType === verificationFilterValues[selectedVerification],
  );

const matchesLanguageFilter = (
  template: TaskTemplate,
  selectedLanguages: readonly TaskTemplateLanguageFilter[],
) =>
  selectedGroupMatches(selectedLanguages, (selectedLanguage) => {
    if (selectedLanguage === "en_ready") {
      return template.localeReadiness["en-US"] === "ready";
    }
    if (selectedLanguage === "missing_translations") {
      return builderSupportedLocales.some((locale) => !isLocaleReady(template.localeReadiness[locale]));
    }
    if (selectedLanguage === "zh_draft") {
      return chineseLocales.some((locale) => template.localeReadiness[locale] === "ai_draft");
    }
    if (selectedLanguage === "zh_fallback") {
      return chineseLocales.some((locale) => template.localeReadiness[locale] === "fallback");
    }

    return chineseLocales.every((locale) => template.localeReadiness[locale] === "reviewed");
  });

export const filterTaskTemplates = (
  templates: readonly TaskTemplate[],
  filters: TaskTemplateFilterState = defaultTaskTemplateFilters,
) =>
  templates.filter(
    (template) =>
      matchesWalletFilter(template, filters.wallet) &&
      matchesVerificationFilter(template, filters.verification) &&
      matchesLanguageFilter(template, filters.language),
  );

export const createTaskTemplateFilterSummary = (
  templates: readonly TaskTemplate[],
  filteredTemplates: readonly TaskTemplate[],
  filters: TaskTemplateFilterState,
): TaskTemplateFilterSummary => {
  const selectedFilters = filters.wallet.length + filters.verification.length + filters.language.length;

  return {
    hasActiveFilters: selectedFilters > 0,
    isEmpty: filteredTemplates.length === 0,
    selectedFilters,
    totalTemplates: templates.length,
    visibleTemplates: filteredTemplates.length,
  };
};

const templateGovernanceBoundary = text(
  "Seeded/local Template Manager governance only. No live template registry, backend Template Service, external provider, or enable/disable mutation is connected.",
  "仅 seeded/本地模板管理治理。不会连接实时模板 registry、后端 Template Service、外部 provider，也不会执行启停变更。",
);

const strongVerificationTypes = new Set<TaskTemplate["verificationType"]>([
  "DAPP_API",
  "ON_CHAIN",
  "REFERRAL",
  "WALLET",
]);

const needsLocalizationReview = (template: TaskTemplate) =>
  chineseLocales.some((locale) => !isLocaleReady(template.localeReadiness[locale]));

const needsRiskReview = (template: TaskTemplate) =>
  template.riskLevel === "high" && (template.category === "social" || template.category === "invite");

const createTemplateGovernanceSignals = (template: TaskTemplate): TemplateGovernanceSignal[] => {
  const signals: TemplateGovernanceSignal[] = [];

  if (needsRiskReview(template)) {
    signals.push("risk_review");
  }
  if (needsLocalizationReview(template)) {
    signals.push("localization_review");
  }
  if (template.walletCompatibility !== "ANY") {
    signals.push("wallet_coverage");
  }
  if (!strongVerificationTypes.has(template.verificationType)) {
    signals.push("verification_strength");
  }

  return signals;
};

const createTemplateGovernanceStatus = (
  signals: TemplateGovernanceSignal[],
): TemplateGovernanceStatus => {
  if (signals.includes("verification_strength")) {
    return "warning";
  }
  if (signals.includes("risk_review") || signals.includes("localization_review") || signals.includes("wallet_coverage")) {
    return "warning";
  }

  return "ready";
};

const createTemplateGovernanceReason = (
  template: TaskTemplate,
  signals: TemplateGovernanceSignal[],
): LocalizedText => {
  if (signals.includes("risk_review")) {
    return text(
      "High-risk social/referral template requires human risk review before launch.",
      "高风险社交/推荐模板上线前需要人工风险审核。",
    );
  }
  if (signals.includes("localization_review")) {
    return text(
      "Chinese locale content is AI draft, fallback, or missing and needs localization review.",
      "中文语言内容仍是 AI 草稿、英文回退或缺失，需要本地化审核。",
    );
  }
  if (signals.includes("wallet_coverage")) {
    return text(
      `${template.walletCompatibility.replace(/_/g, " ")} wallet coverage must be visible before campaign selection.`,
      `${template.walletCompatibility.replace(/_/g, " ")} 钱包覆盖边界需要在选模板前明确展示。`,
    );
  }
  if (signals.includes("verification_strength")) {
    return text(
      "Semi-manual verification needs operator review before high-value use.",
      "半自动验证在高价值活动中需要运营复核。",
    );
  }

  return text(
    "Template is ready for seeded governance review.",
    "模板已可用于 seeded 治理审核。",
  );
};

const createTemplateGovernanceNextAction = (
  signals: TemplateGovernanceSignal[],
): LocalizedText => {
  if (signals.includes("risk_review")) {
    return text(
      "Run human risk review and keep social/referral rewards bounded.",
      "执行人工风险审核，并控制社交/推荐奖励边界。",
    );
  }
  if (signals.includes("localization_review")) {
    return text(
      "Complete zh-CN and zh-TW localization review before publishing campaigns with this template.",
      "使用该模板发布活动前完成 zh-CN 与 zh-TW 本地化审核。",
    );
  }
  if (signals.includes("wallet_coverage")) {
    return text(
      "Confirm selected campaign wallet policy matches this template coverage.",
      "确认活动钱包策略与该模板覆盖范围一致。",
    );
  }
  if (signals.includes("verification_strength")) {
    return text(
      "Pair this template with on-chain or dApp API verification for high-value campaigns.",
      "高价值活动中将该模板与链上或 dApp API 验证搭配使用。",
    );
  }

  return text(
    "Keep template available in the seeded library.",
    "保持模板在 seeded 模板库中可用。",
  );
};

const createTemplateGovernanceRow = (template: TaskTemplate): TemplateGovernanceRow => {
  const reviewSignals = createTemplateGovernanceSignals(template);

  return {
    category: template.category,
    defaultPoints: template.defaultPoints,
    description: template.description,
    localeReadiness: template.localeReadiness,
    nextAction: createTemplateGovernanceNextAction(reviewSignals),
    requiredByDefault: template.requiredByDefault,
    reviewSignals,
    riskLevel: template.riskLevel,
    status: createTemplateGovernanceStatus(reviewSignals),
    statusReason: createTemplateGovernanceReason(template, reviewSignals),
    templateId: template.id,
    title: template.title,
    verificationType: template.verificationType,
    walletCompatibility: template.walletCompatibility,
  };
};

export const createTemplateGovernanceConsole = (
  templates: TaskTemplate[] = taskTemplateLibrary,
): TemplateGovernanceConsole => {
  const rows = templates.map(createTemplateGovernanceRow);

  return {
    boundary: templateGovernanceBoundary,
    rows,
    summary: rows.reduce<TemplateGovernanceConsole["summary"]>(
      (summary, row) => {
        summary.totalTemplates += 1;
        if (row.status === "ready") {
          summary.readyCount += 1;
        } else if (row.status === "warning") {
          summary.warningCount += 1;
        } else {
          summary.blockedCount += 1;
        }
        if (row.riskLevel === "high") {
          summary.highRiskCount += 1;
        }
        if (row.reviewSignals.includes("localization_review")) {
          summary.localizationReviewCount += 1;
        }
        if (row.walletCompatibility === "ANY") {
          summary.anyWalletCount += 1;
        } else if (row.walletCompatibility === "AA_ONLY") {
          summary.aaOnlyCount += 1;
        } else {
          summary.eoaOnlyCount += 1;
        }
        if (strongVerificationTypes.has(row.verificationType)) {
          summary.strongVerificationCount += 1;
        }

        return summary;
      },
      {
        aaOnlyCount: 0,
        anyWalletCount: 0,
        blockedCount: 0,
        eoaOnlyCount: 0,
        highRiskCount: 0,
        localizationReviewCount: 0,
        readyCount: 0,
        strongVerificationCount: 0,
        totalTemplates: 0,
        warningCount: 0,
      },
    ),
  };
};

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
      "Require human review before zh-CN drafts or zh-TW fallback content can publish.",
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
      summary: text(
        "zh-CN draft and zh-TW fallback content need human review before publish.",
        "zh-CN 草稿与 zh-TW 回退内容发布前需要人工审核。",
      ),
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
      "獎勵由活動專案方提供。Campaign OS 不負責自動發獎。",
    ),
    exportDisclaimer: text(
      "Exporting winners does not distribute rewards.",
      "导出获奖名单不等于发放奖励。",
      "匯出獲獎名單不等於發放獎勵。",
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
    {
      id: "builder-content-zh-tw",
      locale: "zh-TW",
      sourceLocale: "en-US",
      title: "Awaken Summer Sprint",
      description: "Complete wallet-aware activation tasks across the aelf ecosystem.",
      faq: "Rewards are project-provided after winner export and project review.",
      socialPost: "Join Awaken Summer Sprint and complete verified aelf ecosystem tasks.",
      rewardDisclaimer: "Rewards are provided by the campaign project. Campaign OS does not distribute rewards.",
      aiDraft: false,
      humanReviewed: false,
      published: false,
      fallbackToEnglish: true,
    },
  ],
  defaultContractImpact,
  contractImpact: contractClaimBlockedSample,
};

const aiPlannerBoundary = text(
  "Seeded/local planner only. No live AI provider, no automatic publish, no backend mutation, no wallet signature, and no contract transaction is executed.",
  "仅 seeded/本地 planner。不会执行实时 AI provider、自动发布、后端变更、钱包签名或合约交易。",
);

const aiPlannerNextAction = text(
  "Review planner decisions, then confirm wallet policy, language review, task mix, risk controls, and contract mode before publish readiness.",
  "先审核 planner 决策，再确认钱包策略、语言审核、任务组合、风险控制与合约模式，之后进入发布准备度。",
);

const plannerGroup = (
  id: AiPlannerGroupId,
  title: LocalizedText,
  summary: LocalizedText,
  items: AiPlannerDecisionItem[],
): AiPlannerRecommendationGroup => ({
  id,
  items,
  summary,
  title,
});

const plannerItem = (
  id: string,
  status: AiPlannerDecisionStatus,
  ownerRole: OwnerRole,
  confidence: AiConfidence,
  label: LocalizedText,
  rationale: LocalizedText,
  nextAction: LocalizedText,
): AiPlannerDecisionItem => ({
  confidence,
  id,
  label,
  nextAction,
  ownerRole,
  rationale,
  status,
});

const selectedPlannerTemplates = (draft: CampaignDraft) =>
  taskTemplateLibrary.filter((template) => draft.selectedTaskTemplateIds.includes(template.id));

const countPlannerDecisions = (
  groups: readonly AiPlannerRecommendationGroup[],
): AiPlannerDecisionCounts => {
  const items = groups.flatMap((group) => group.items);

  return {
    blocked: items.filter((item) => item.status === "blocked").length,
    ready: items.filter((item) => item.status === "ready").length,
    reviewRequired: items.filter((item) => item.status === "review_required").length,
    total: items.length,
    warning: items.filter((item) => item.status === "warning").length,
  };
};

export const createAiCampaignPlannerDecisionConsole = (
  draft: CampaignDraft = seededCampaignDraft,
): AiCampaignPlannerDecisionConsole => {
  const templates = selectedPlannerTemplates(draft);
  const campaignTemplatePack = createCampaignTemplatePack();
  const hasOnChainOrDappAnchor = templates.some((template) =>
    template.verificationType === "ON_CHAIN" || template.verificationType === "DAPP_API",
  );
  const hasHighRiskTemplate = templates.some((template) => template.riskLevel === "high");
  const hasUnreviewedLocalizedContent = hasUnreviewedChineseAiDraft(draft);
  const contractMode = draft.defaultContractImpact.mode;
  const groups = [
    plannerGroup(
      "campaign_structure",
      text("Campaign structure", "活动结构"),
      text(
        "AI planner starts from the confirmed campaign goal, audience, and time window.",
        "AI planner 基于已确认的活动目标、用户分层与周期生成结构。",
      ),
      [
        plannerItem(
          "structure-activation-goal",
          "ready",
          "project_owner",
          "high",
          text("Activation campaign structure", "激活活动结构"),
          text(
            "Awaken activation focuses on wallet connection, bridge, swap, and approved social amplification.",
            "Awaken 激活活动聚焦钱包连接、bridge、swap 与已审核社交扩散。",
          ),
          text("Keep the goal and target users visible before task selection.", "在选择任务前保持目标与用户分层可见。"),
        ),
        plannerItem(
          "structure-human-reviewed-outline",
          draft.aiPrompt.reviewedByHuman ? "ready" : "review_required",
          "project_owner",
          "medium",
          text("Human-reviewed planner outline", "人工审核 planner 大纲"),
          draft.aiPrompt.reviewedByHuman
            ? text("The seeded AI outline is already marked as human reviewed.", "seeded AI 大纲已标记为人工审核。")
            : text("The seeded AI outline still needs human review.", "seeded AI 大纲仍需要人工审核。"),
          text("Use the outline as review input, not automatic publish approval.", "将大纲作为审核输入，而不是自动发布批准。"),
        ),
      ],
    ),
    plannerGroup(
      "wallet_policy",
      text("Wallet policy", "钱包策略"),
      text(
        "Any wallet maximizes conversion while Portkey AA remains the recommended onboarding path.",
        "任意钱包最大化转化，同时 Portkey AA 仍是推荐的新手引导路径。",
      ),
      [
        plannerItem(
          "wallet-any-conversion",
          draft.walletPolicy === "ANY" ? "ready" : "warning",
          "project_owner",
          "high",
          text("Use Any wallet for conversion", "使用任意钱包提升转化"),
          text(
            "Any wallet lets AA and EOA users participate without forcing a single wallet source.",
            "任意钱包允许 AA 与 EOA 用户参与，不强制单一钱包来源。",
          ),
          text("Keep Any wallet selected unless the campaign intentionally measures AA or EOA only.", "除非活动有意衡量 AA 或 EOA，否则保持任意钱包。"),
        ),
        plannerItem(
          "wallet-portkey-aa-onboarding",
          "ready",
          "project_owner",
          "high",
          text("Recommend Portkey AA for onboarding", "推荐 Portkey AA 新手引导"),
          text(
            "Portkey AA is recommended for new users, while EOA app, extension, and NightElf users remain eligible.",
            "Portkey AA 推荐给新用户，同时 EOA App、插件和 NightElf 用户仍可参与。",
          ),
          text("Present Portkey AA as recommended, not mandatory.", "将 Portkey AA 展示为推荐，而不是强制。"),
        ),
      ],
    ),
    plannerGroup(
      "language_plan",
      text("Language plan", "语言计划"),
      text(
        "English is the default source; Chinese locale content remains reviewed or safely falls back.",
        "英文是默认源语言；中文语言内容需审核或安全回退。",
      ),
      [
        plannerItem(
          "language-default-en",
          "ready",
          "project_owner",
          "high",
          text("Default language is English", "默认语言为英文"),
          text(
            "Default language is English (en-US), with zh-CN and zh-TW as MVP runtime locales.",
            "默认语言是英文 (en-US)，zh-CN 与 zh-TW 是 MVP 运行时语言。",
          ),
          text("Keep en-US as source and fallback locale.", "保持 en-US 作为源语言与回退语言。"),
        ),
        plannerItem(
          "language-zh-review",
          hasUnreviewedLocalizedContent ? "review_required" : "ready",
          "project_owner",
          "medium",
          text("Review Chinese AI draft", "审核中文 AI 草稿"),
          hasUnreviewedLocalizedContent
            ? text(
                "Chinese locale draft or fallback content falls back to English until human review is complete.",
                "中文语言草稿或回退内容在人工审核前回退英文。",
              )
            : text("Chinese locale content is reviewed or safely published.", "中文语言内容已审核或安全发布。"),
          text(
            "Complete human review before publishing localized Chinese content.",
            "发布中文本地化内容前完成人工审核。",
          ),
        ),
      ],
    ),
    plannerGroup(
      "task_strategy",
      text("Task strategy", "任务策略"),
      text(
        "Task recommendations combine wallet onboarding with verified ecosystem actions.",
        "任务推荐将钱包引导与可验证生态行为组合。",
      ),
      [
        plannerItem(
          "task-verified-anchors",
          hasOnChainOrDappAnchor ? "ready" : "warning",
          "internal_operator",
          "high",
          text("Use bridge and swap verification anchors", "使用 bridge 与 swap 验证锚点"),
          text(
            "Selected tasks include bridge and swap anchors so the campaign is not social-only.",
            "已选任务包含 bridge 与 swap 锚点，因此活动不是纯社交任务。",
          ),
          text("Keep at least one on-chain or dApp API task before high-value publish.", "高价值发布前保留至少一个链上或 dApp API 任务。"),
        ),
        plannerItem(
          "task-wallet-aware-mix",
          "ready",
          "internal_operator",
          "medium",
          text("Keep wallet-aware task mix", "保持钱包感知任务组合"),
          text(
            "The selected task mix covers wallet connection, bridge, swap, and social sharing with wallet compatibility visible.",
            "已选任务组合覆盖钱包连接、bridge、swap 与社交分享，并展示钱包兼容性。",
          ),
          text("Review task wallet compatibility before publish readiness.", "发布准备度前审核任务钱包兼容性。"),
        ),
        plannerItem(
          "task-campaign-template-pack",
          campaignTemplatePack.summary.totalTemplates === 5 ? "ready" : "review_required",
          "project_owner",
          "medium",
          text("Campaign template pack available", "活动模板包可用"),
          text(
            "The planner can reference five seeded campaign presets without creating, publishing, or mutating a campaign draft.",
            "Planner 可引用五个 seeded 活动模板，但不会创建、发布或变更活动草稿。",
          ),
          text(
            "Choose a preset as review input, then create the draft only after human approval.",
            "将模板作为审核输入；人工批准后再创建活动草稿。",
          ),
        ),
      ],
    ),
    plannerGroup(
      "risk_hints",
      text("Risk hints", "风险提示"),
      text(
        "Risk hints stay human-reviewed and do not become automatic reward decisions.",
        "风险提示保持人工审核，不成为自动发奖决策。",
      ),
      [
        plannerItem(
          "risk-social-review",
          hasHighRiskTemplate ? "warning" : "ready",
          "internal_operator",
          "medium",
          text("Review high-reward social actions", "审核高奖励社交行为"),
          hasHighRiskTemplate
            ? text("High-reward social sharing needs risk review before launch.", "高奖励社交分享上线前需要风险审核。")
            : text("No high-risk social template is selected.", "未选择高风险社交模板。"),
          text("Keep referral validation, risk flags, and manual review enabled.", "保持推荐验证、风险标记与人工审核开启。"),
        ),
        plannerItem(
          "risk-reward-boundary",
          "review_required",
          "internal_operator",
          "medium",
          text("Keep reward responsibility explicit", "明确奖励责任"),
          text(
            "Rewards are project-provided; Campaign OS previews, verifies, and exports but does not distribute rewards.",
            "奖励由项目方提供；Campaign OS 负责预览、验证与导出，但不发奖。",
          ),
          text("Keep the reward disclaimer visible in planner and publish review.", "在 planner 与发布审核中保留奖励声明。"),
        ),
      ],
    ),
    plannerGroup(
      "contract_recommendation",
      text("Contract recommendation", "合约建议"),
      text(
        "Use Off-chain MVP now; keep V2 companion and contract claim behind review.",
        "当前使用 Off-chain MVP；V2 companion 与合约领取保持审核路径。",
      ),
      [
        plannerItem(
          "contract-off-chain-mvp",
          contractMode === "OFF_CHAIN_MVP" ? "ready" : "warning",
          "contract_reviewer",
          "high",
          text("Recommend Off-chain MVP", "推荐 Off-chain MVP"),
          text(
            "Off-chain MVP requires no contract migration for this campaign shell.",
            "当前活动 shell 使用 Off-chain MVP 不需要合约迁移。",
          ),
          text("Use off-chain verification and winner export for MVP publish.", "MVP 发布使用链下验证与 winners 导出。"),
        ),
        plannerItem(
          "contract-claim-blocker",
          "blocked",
          "contract_reviewer",
          "high",
          text("Keep contract claim blocked", "保持合约领取阻断"),
          text(
            "Contract claim is not enabled in this MVP planner and requires high-impact manual approval.",
            "当前 MVP planner 未启用合约领取，需要高影响人工批准。",
          ),
          text("Do not enable claim mode until audit, pause role, signer, and legal disclaimer are reviewed.", "在审计、暂停角色、签名方与法律声明审核前不要启用领取模式。"),
        ),
      ],
    ),
  ];

  return {
    boundary: aiPlannerBoundary,
    counts: countPlannerDecisions(groups),
    draftId: draft.id,
    groups,
    nextAction: aiPlannerNextAction,
    summary: {
      campaignTemplatePack: campaignTemplatePack.summary,
      contractMode,
      defaultLocale: draft.defaultLocale,
      generatedOutline: draft.aiPrompt.generatedOutline,
      prompt: draft.aiPrompt.prompt,
      recommendedWallet: text(
        "Portkey AA for new-user onboarding; Any wallet remains the campaign policy.",
        "新用户引导推荐 Portkey AA；活动策略仍为任意钱包。",
      ),
      reviewedByHuman: draft.aiPrompt.reviewedByHuman,
      supportedLocales: [...draft.supportedLocales],
      walletPolicy: draft.walletPolicy,
    },
  };
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
  "campaign-quality": text("Campaign quality", "活动质量", "活動品質"),
  "contract-impact": text("Contract impact", "合约影响"),
  "export-disclaimer": text("Export boundary", "导出边界"),
  "i18n-human-review": text("i18n human review", "多语言人工审核"),
  "localized-reward-disclaimer": text("Localized reward disclaimer", "本地化奖励声明"),
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
    (revision) =>
      chineseLocales.includes(revision.locale) &&
      !revision.humanReviewed &&
      (revision.aiDraft || revision.fallbackToEnglish),
  );

const localizedRewardDisclaimerBlockerLocales = (draft: CampaignDraft) =>
  draft.supportedLocales.filter((locale) => {
    const revision = draft.contentRevisions.find((candidate) => candidate.locale === locale);

    if (!revision?.rewardDisclaimer.trim()) {
      return true;
    }

    return locale !== "en-US" && (!revision.humanReviewed || revision.fallbackToEnglish);
  });

const highRewardCampaignValueUsd = 2000;

const meaningfulEcosystemTaskCategories = new Set<TaskTemplateCategory>([
  "bridge",
  "dao",
  "daipp",
  "forecast",
  "liquidity",
  "nft",
  "pay",
  "schrodinger",
  "swap",
]);

const isMeaningfulEcosystemTask = (template: TaskTemplate) =>
  template.verificationType === "ON_CHAIN" ||
  template.verificationType === "DAPP_API" ||
  meaningfulEcosystemTaskCategories.has(template.category);

const selectedTaskTemplates = (draft: CampaignDraft) =>
  taskTemplateLibrary.filter((template) => draft.selectedTaskTemplateIds.includes(template.id));

const isHighRewardSocialOnly = (draft: CampaignDraft) => {
  const selectedTemplates = selectedTaskTemplates(draft);
  const hasOnlySocialVerification = selectedTemplates.length > 0 && selectedTemplates.every(
    (template) => template.verificationType === "SOCIAL" || template.verificationType === "REFERRAL",
  );
  const hasHighRewardSocialTask = selectedTemplates.some(
    (template) => template.category === "social" && template.riskLevel === "high" && template.defaultPoints >= 150,
  );

  return hasHighRewardSocialTask && (hasOnlySocialVerification || draft.rewardPlan.estimatedRewardValueUsd >= highRewardCampaignValueUsd);
};

const createCampaignQualityCheck = (draft: CampaignDraft): ReadinessCheck => {
  const templates = selectedTaskTemplates(draft);
  const meaningfulActionCount = templates.filter(isMeaningfulEcosystemTask).length;

  if (meaningfulActionCount > 0) {
    return makeCheck(
      "campaign-quality",
      "risk",
      "passed",
      text(
        "Selected tasks include a meaningful ecosystem action before publish.",
        "已选任务包含发布前所需的有效生态行为。",
        "已選任務包含發布前所需的有效生態行為。",
      ),
      text(
        "Keep the ecosystem action visible alongside reward, risk, and export review.",
        "在奖励、风险与导出审核中继续展示该生态行为。",
        "在獎勵、風險與匯出審核中繼續展示該生態行為。",
      ),
      "internal_operator",
    );
  }

  if (draft.rewardPlan.estimatedRewardValueUsd >= highRewardCampaignValueUsd || templates.length === 0) {
    return makeCheck(
      "campaign-quality",
      "risk",
      "blocker",
      text(
        "High-reward campaigns need at least one meaningful ecosystem action before publish.",
        "高奖励活动发布前至少需要一个有效生态行为。",
        "高獎勵活動發布前至少需要一個有效生態行為。",
      ),
      text(
        "Add bridge, swap, NFT, DAO, dApp API, Pay, Forecast, or another ecosystem task before publish.",
        "发布前添加 bridge、swap、NFT、DAO、dApp API、Pay、Forecast 或其他生态任务。",
        "發布前加入 bridge、swap、NFT、DAO、dApp API、Pay、Forecast 或其他生態任務。",
      ),
      "internal_operator",
    );
  }

  return makeCheck(
    "campaign-quality",
    "risk",
    "warning",
    text(
      "This campaign lacks a meaningful ecosystem action and needs quality review.",
      "该活动缺少有效生态行为，需要质量审核。",
      "該活動缺少有效生態行為，需要品質審核。",
    ),
    text(
      "Add a real ecosystem action or keep the reward posture low with manual review.",
      "添加真实生态行为，或保持低奖励并进入人工审核。",
      "加入真實生態行為，或保持低獎勵並進入人工審核。",
    ),
    "internal_operator",
  );
};

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

  const localizedDisclaimerBlockers = localizedRewardDisclaimerBlockerLocales(draft);
  checks.push(
    localizedDisclaimerBlockers.length === 0
      ? makeCheck(
          "localized-reward-disclaimer",
          "rewards",
          "passed",
          text("Localized reward disclaimers are reviewed for every supported locale.", "所有支持语言的奖励声明均已审核。"),
          text("Keep per-locale reward responsibility copy visible in publish review.", "在发布审核中继续展示每个语言的奖励责任文案。"),
          "project_owner",
        )
      : makeCheck(
          "localized-reward-disclaimer",
          "rewards",
          "blocker",
          text(
            `Reward disclaimer review is required for ${localizedDisclaimerBlockers.join(", ")}.`,
            `${localizedDisclaimerBlockers.join(", ")} 需要完成奖励免责声明审核。`,
          ),
          text(
            "Review AI draft, fallback, or missing localized reward disclaimers before publish.",
            "发布前审核 AI 草稿、回退或缺失的本地化奖励免责声明。",
          ),
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
        text(
          "Chinese locale draft or fallback content falls back to English until reviewed.",
          "中文语言草稿或回退内容审核前回退到英文。",
        ),
        text(
          "Review zh-CN and zh-TW content before presenting it as published content.",
          "zh-CN 与 zh-TW 内容经人工审核后才可作为已发布内容展示。",
        ),
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

  checks.push(createCampaignQualityCheck(draft));

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
    "campaign-quality",
    "export-disclaimer",
    "i18n-human-review",
    "localized-reward-disclaimer",
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
