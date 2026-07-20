import {
  TASK_TEMPLATE_CATALOG_SCHEMA_VERSION,
  TaskTemplateCatalogValidationError,
  createTaskTemplateCatalogVersion,
  parseTaskTemplateCatalogVersion,
  type TaskTemplateAdoptionMode,
  type TaskTemplateCatalogVersion,
  type TaskTemplateCatalogVersionSource,
  type TaskTemplateLocaleReadiness,
} from "../domain/taskTemplateCatalog";
import type { RiskLevel, VerificationType, WalletCompatibility } from "../domain/types";

interface ManifestDefinition {
  readonly adoptionMode?: TaskTemplateAdoptionMode;
  readonly category: string;
  readonly defaultPoints: number;
  readonly description: Readonly<Record<"en-US" | "zh-CN" | "zh-TW", string>>;
  readonly evidenceRule: Record<string, unknown>;
  readonly localeReadiness: Readonly<Record<"en-US" | "zh-CN" | "zh-TW", TaskTemplateLocaleReadiness>>;
  readonly maximumPoints: number;
  readonly minimumPoints: number;
  readonly requiredByDefault: boolean;
  readonly requiredOverrideAllowed: boolean;
  readonly riskLevel: RiskLevel;
  readonly templateCode: string;
  readonly title: Readonly<Record<"en-US" | "zh-CN" | "zh-TW", string>>;
  readonly verificationType: VerificationType;
  readonly walletCompatibility: WalletCompatibility;
}

const definitions: readonly ManifestDefinition[] = [
  {
    category: "wallet",
    defaultPoints: 40,
    description: {
      "en-US": "Connect any supported aelf AA or EOA wallet.",
      "zh-CN": "连接任意受支持的 aelf AA 或 EOA 钱包。",
      "zh-TW": "连接任意受支持的 aelf AA 或 EOA 钱包。",
    },
    evidenceRule: { kind: "wallet_session", source: "WALLET_SESSION" },
    localeReadiness: { "en-US": "ready", "zh-CN": "reviewed", "zh-TW": "fallback" },
    maximumPoints: 80,
    minimumPoints: 20,
    requiredByDefault: true,
    requiredOverrideAllowed: false,
    riskLevel: "low",
    templateCode: "wallet-connect",
    title: { "en-US": "Connect wallet", "zh-CN": "连接钱包", "zh-TW": "连接钱包" },
    verificationType: "WALLET",
    walletCompatibility: "ANY",
  },
  {
    category: "bridge",
    defaultPoints: 120,
    description: {
      "en-US": "Complete one bridge action with the connected wallet.",
      "zh-CN": "使用已连接钱包完成一次跨链操作。",
      "zh-TW": "使用已连接钱包完成一次跨链操作。",
    },
    evidenceRule: { kind: "provider_event", source: "AEFINDER" },
    localeReadiness: { "en-US": "ready", "zh-CN": "ai_draft", "zh-TW": "missing" },
    maximumPoints: 240,
    minimumPoints: 60,
    requiredByDefault: true,
    requiredOverrideAllowed: false,
    riskLevel: "low",
    templateCode: "bridge-ebridge",
    title: { "en-US": "Bridge with eBridge", "zh-CN": "使用 eBridge 跨链", "zh-TW": "使用 eBridge 跨链" },
    verificationType: "ON_CHAIN",
    walletCompatibility: "ANY",
  },
  {
    category: "swap",
    defaultPoints: 100,
    description: {
      "en-US": "Complete a seeded swap task for the campaign token pair.",
      "zh-CN": "完成活动指定交易对的一次 Swap。",
      "zh-TW": "完成活动指定交易对的一次 Swap。",
    },
    evidenceRule: { kind: "provider_api", source: "DAPP_API" },
    localeReadiness: { "en-US": "ready", "zh-CN": "ai_draft", "zh-TW": "missing" },
    maximumPoints: 200,
    minimumPoints: 50,
    requiredByDefault: false,
    requiredOverrideAllowed: true,
    riskLevel: "medium",
    templateCode: "swap-awaken",
    title: { "en-US": "Swap on Awaken", "zh-CN": "在 Awaken Swap", "zh-TW": "在 Awaken Swap" },
    verificationType: "DAPP_API",
    walletCompatibility: "ANY",
  },
  {
    category: "liquidity",
    defaultPoints: 130,
    description: {
      "en-US": "Verify seeded/local LP position or liquidity event evidence without connecting a live Awaken provider.",
      "zh-CN": "验证 seeded/本地 LP 仓位或流动性事件证据，不连接实时 Awaken provider。",
      "zh-TW": "验证 seeded/本地 LP 仓位或流动性事件证据，不连接实时 Awaken provider。",
    },
    evidenceRule: { kind: "provider_event", source: "AEFINDER" },
    localeReadiness: { "en-US": "ready", "zh-CN": "ai_draft", "zh-TW": "missing" },
    maximumPoints: 260,
    minimumPoints: 65,
    requiredByDefault: false,
    requiredOverrideAllowed: true,
    riskLevel: "medium",
    templateCode: "liquidity-awaken",
    title: { "en-US": "Add liquidity on Awaken", "zh-CN": "在 Awaken 添加流动性", "zh-TW": "在 Awaken 添加流动性" },
    verificationType: "ON_CHAIN",
    walletCompatibility: "ANY",
  },
  {
    category: "nft",
    defaultPoints: 90,
    description: {
      "en-US": "Verify ownership of an eligible NFT collection.",
      "zh-CN": "验证指定 NFT 合集的持有状态。",
      "zh-TW": "验证指定 NFT 合集的持有状态。",
    },
    evidenceRule: { kind: "provider_event", source: "AELFSCAN" },
    localeReadiness: { "en-US": "ready", "zh-CN": "ai_draft", "zh-TW": "missing" },
    maximumPoints: 180,
    minimumPoints: 45,
    requiredByDefault: false,
    requiredOverrideAllowed: true,
    riskLevel: "medium",
    templateCode: "nft-hold",
    title: { "en-US": "Hold campaign NFT", "zh-CN": "持有活动 NFT", "zh-TW": "持有活动 NFT" },
    verificationType: "ON_CHAIN",
    walletCompatibility: "ANY",
  },
  {
    category: "schrodinger",
    defaultPoints: 95,
    description: {
      "en-US": "Verify seeded adopt, hold, or trade participation for Schrödinger NFTs.",
      "zh-CN": "验证 Schrödinger NFT 的 seeded 领养、持有或交易参与。",
      "zh-TW": "验证 Schrödinger NFT 的 seeded 领养、持有或交易参与。",
    },
    evidenceRule: { kind: "provider_event", source: "AELFSCAN" },
    localeReadiness: { "en-US": "ready", "zh-CN": "ai_draft", "zh-TW": "missing" },
    maximumPoints: 190,
    minimumPoints: 45,
    requiredByDefault: false,
    requiredOverrideAllowed: true,
    riskLevel: "medium",
    templateCode: "schrodinger-hold",
    title: { "en-US": "Hold Schrödinger NFT", "zh-CN": "持有 Schrödinger NFT", "zh-TW": "持有 Schrödinger NFT" },
    verificationType: "ON_CHAIN",
    walletCompatibility: "ANY",
  },
  {
    category: "dao",
    defaultPoints: 110,
    description: {
      "en-US": "Verify participation in a governance proposal.",
      "zh-CN": "验证治理提案参与记录。",
      "zh-TW": "验证治理提案参与记录。",
    },
    evidenceRule: { kind: "provider_event", source: "AEFINDER" },
    localeReadiness: { "en-US": "ready", "zh-CN": "fallback", "zh-TW": "fallback" },
    maximumPoints: 220,
    minimumPoints: 55,
    requiredByDefault: false,
    requiredOverrideAllowed: true,
    riskLevel: "medium",
    templateCode: "dao-vote",
    title: { "en-US": "Vote in DAO proposal", "zh-CN": "参与 DAO 提案投票", "zh-TW": "参与 DAO 提案投票" },
    verificationType: "ON_CHAIN",
    walletCompatibility: "EOA_ONLY",
  },
  {
    category: "daipp",
    defaultPoints: 80,
    description: {
      "en-US": "Submit structured feedback for a dAIPP initiative.",
      "zh-CN": "为 dAIPP 计划提交结构化反馈。",
      "zh-TW": "为 dAIPP 计划提交结构化反馈。",
    },
    evidenceRule: { kind: "provider_api", source: "DAPP_API" },
    localeReadiness: { "en-US": "ready", "zh-CN": "ai_draft", "zh-TW": "missing" },
    maximumPoints: 160,
    minimumPoints: 40,
    requiredByDefault: false,
    requiredOverrideAllowed: true,
    riskLevel: "low",
    templateCode: "daipp-submit",
    title: { "en-US": "Submit dAIPP feedback", "zh-CN": "提交 dAIPP 反馈", "zh-TW": "提交 dAIPP 反馈" },
    verificationType: "DAPP_API",
    walletCompatibility: "ANY",
  },
  {
    category: "pay",
    defaultPoints: 85,
    description: {
      "en-US": "Complete a seeded invoice or payment link task through aelf Pay metadata.",
      "zh-CN": "通过 aelf Pay metadata 完成 seeded 发票或支付链接任务。",
      "zh-TW": "通过 aelf Pay metadata 完成 seeded 发票或支付链接任务。",
    },
    evidenceRule: { kind: "provider_api", source: "DAPP_API" },
    localeReadiness: { "en-US": "ready", "zh-CN": "ai_draft", "zh-TW": "missing" },
    maximumPoints: 170,
    minimumPoints: 40,
    requiredByDefault: false,
    requiredOverrideAllowed: true,
    riskLevel: "medium",
    templateCode: "pay-complete",
    title: { "en-US": "Complete aelf Pay payment", "zh-CN": "完成 aelf Pay 支付", "zh-TW": "完成 aelf Pay 支付" },
    verificationType: "DAPP_API",
    walletCompatibility: "ANY",
  },
  {
    category: "forecast",
    defaultPoints: 90,
    description: {
      "en-US": "Join a seeded prediction or win-streak activity from Forecast metadata.",
      "zh-CN": "基于 Forecast metadata 参与 seeded 预测或连胜任务。",
      "zh-TW": "基于 Forecast metadata 参与 seeded 预测或连胜任务。",
    },
    evidenceRule: { kind: "provider_api", source: "DAPP_API" },
    localeReadiness: { "en-US": "ready", "zh-CN": "ai_draft", "zh-TW": "missing" },
    maximumPoints: 180,
    minimumPoints: 45,
    requiredByDefault: false,
    requiredOverrideAllowed: true,
    riskLevel: "medium",
    templateCode: "forecast-participate",
    title: { "en-US": "Participate in Forecast", "zh-CN": "参与 Forecast 预测", "zh-TW": "参与 Forecast 预测" },
    verificationType: "DAPP_API",
    walletCompatibility: "ANY",
  },
  {
    adoptionMode: "manual_review",
    category: "social",
    defaultPoints: 180,
    description: {
      "en-US": "Share an approved social post without making it the only high-value action.",
      "zh-CN": "分享已审核动态，但不能作为唯一高价值任务。",
      "zh-TW": "分享已审核动态，但不能作为唯一高价值任务。",
    },
    evidenceRule: { kind: "manual_social_review", source: "MANUAL" },
    localeReadiness: { "en-US": "ready", "zh-CN": "ai_draft", "zh-TW": "missing" },
    maximumPoints: 180,
    minimumPoints: 0,
    requiredByDefault: false,
    requiredOverrideAllowed: true,
    riskLevel: "high",
    templateCode: "social-share",
    title: { "en-US": "Share campaign post", "zh-CN": "分享活动动态", "zh-TW": "分享活动动态" },
    verificationType: "SOCIAL",
    walletCompatibility: "ANY",
  },
  {
    adoptionMode: "deferred",
    category: "invite",
    defaultPoints: 70,
    description: {
      "en-US": "Invite a friend who completes required wallet and campaign tasks.",
      "zh-CN": "邀请完成钱包与活动必做任务的好友。",
      "zh-TW": "邀请完成钱包与活动必做任务的好友。",
    },
    evidenceRule: {
      kind: "deferred_referral",
      reasonCode: "REFERRAL_RUNTIME_NOT_AVAILABLE",
      source: "MANUAL",
    },
    localeReadiness: { "en-US": "ready", "zh-CN": "fallback", "zh-TW": "fallback" },
    maximumPoints: 70,
    minimumPoints: 0,
    requiredByDefault: false,
    requiredOverrideAllowed: false,
    riskLevel: "high",
    templateCode: "invite-friend",
    title: { "en-US": "Invite a qualified friend", "zh-CN": "邀请合格好友", "zh-TW": "邀请合格好友" },
    verificationType: "MANUAL",
    walletCompatibility: "ANY",
  },
];

const sourceFromDefinition = (definition: ManifestDefinition): TaskTemplateCatalogVersionSource => ({
  adoptionMode: definition.adoptionMode ?? "direct",
  catalogSchemaVersion: TASK_TEMPLATE_CATALOG_SCHEMA_VERSION,
  category: definition.category,
  evidenceRule: definition.evidenceRule,
  localeReadiness: { ...definition.localeReadiness },
  localizedContent: Object.fromEntries(
    (["en-US", "zh-CN", "zh-TW"] as const).map((locale) => [locale, {
      description: definition.description[locale],
      title: definition.title[locale],
    }]),
  ),
  points: {
    default: definition.defaultPoints,
    maximum: definition.maximumPoints,
    minimum: definition.minimumPoints,
  },
  requiredPolicy: {
    default: definition.requiredByDefault,
    overrideAllowed: definition.requiredOverrideAllowed,
  },
  riskLevel: definition.riskLevel,
  status: "active",
  supportedLocales: ["en-US", "zh-CN", "zh-TW"],
  templateCode: definition.templateCode,
  verificationType: definition.verificationType,
  version: 1,
  walletCompatibility: definition.walletCompatibility,
});

export const validateTaskTemplateCatalogManifest = (
  templates: readonly TaskTemplateCatalogVersion[],
): readonly TaskTemplateCatalogVersion[] => {
  if (!Array.isArray(templates) || templates.length === 0 || templates.length > 1_000) {
    throw new TaskTemplateCatalogValidationError("TASK_TEMPLATE_MANIFEST_INVALID", "templates", 1_000);
  }

  const identities = new Set<string>();
  const activeCodes = new Set<string>();
  const validated = templates.map((template, index) => {
    const parsed = parseTaskTemplateCatalogVersion(template);
    const identity = `${parsed.templateCode}@${parsed.version}`;
    if (identities.has(identity)) {
      throw new TaskTemplateCatalogValidationError(
        "TASK_TEMPLATE_MANIFEST_INVALID",
        `templates[${index}].templateCode`,
      );
    }
    identities.add(identity);

    if (parsed.status === "active") {
      if (activeCodes.has(parsed.templateCode)) {
        throw new TaskTemplateCatalogValidationError(
          "TASK_TEMPLATE_MANIFEST_INVALID",
          `templates[${index}].status`,
        );
      }
      activeCodes.add(parsed.templateCode);
    }

    if (
      parsed.adoptionMode === "direct"
      && (parsed.verificationType === "SOCIAL" || parsed.verificationType === "MANUAL")
    ) {
      throw new TaskTemplateCatalogValidationError(
        "TASK_TEMPLATE_MANIFEST_INVALID",
        `templates[${index}].adoptionMode`,
      );
    }

    return parsed;
  });

  return Object.freeze(validated);
};

export const taskTemplateCatalogManifestV1 = validateTaskTemplateCatalogManifest(
  definitions.map((definition) => createTaskTemplateCatalogVersion(sourceFromDefinition(definition))),
);
