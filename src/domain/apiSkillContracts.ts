import type {
  ApiSkillContract,
  ApiSkillContractCoverage,
  ApiSkillContractField,
  ApiSkillContractSurface,
  ApiSkillEvidenceSource,
  ApiSkillFieldGroup,
  ApiSkillId,
  LocalizedText,
} from "./types";
import { campaignLifecycleStatuses } from "./types";

const text = (enUS: string, zhCN: string, zhTW = enUS): LocalizedText => ({
  "en-US": enUS,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
});

const field = (
  name: string,
  group: ApiSkillFieldGroup,
  required: boolean,
  enUS: string,
  zhCN: string,
  example?: string,
): ApiSkillContractField => ({
  description: text(enUS, zhCN),
  example,
  group,
  label: text(name, name),
  name,
  required,
});

const liveApiBoundary = text(
  "Seeded/local contract only. No live API, external provider, wallet signature, secret storage, or campaign mutation is executed.",
  "仅 seeded/本地 contract。不会执行实时 API、外部 provider、钱包签名、secret 存储或活动变更。",
);

const walletSessionBoundary = text(
  "Seeded/local wallet session contract only. No live API, wallet SDK, provider call, signature execution, signature verification, secret storage, campaign mutation, reward, export file, or contract write is executed.",
  "仅 seeded/本地钱包会话 contract。不会执行实时 API、钱包 SDK、provider 调用、签名执行、签名验证、secret 存储、活动变更、发奖、导出文件或合约写入。",
);

const agentWalletActionBoundary = text(
  "Internal Agent Skill wallet action readiness only. No live API, no agent skill execution/import, no wallet SDK/provider call, no private key or secret handling, no signature execution, no transaction send, no contract send/write, no reward distribution, no export file, and no root write is executed.",
  "仅内部 Agent Skill 钱包动作 readiness。不会执行实时 API、Agent Skill 执行/导入、钱包 SDK/provider 调用、私钥或 secret 处理、签名执行、交易发送、合约发送/写入、发奖、导出文件或 root 写入。",
);

const addTaskBoundary = text(
  "Seeded/local add-task contract only. No live API, backend persistence, provider or evidence lookup, secret handling, export file, reward, or contract write is executed.",
  "仅 seeded/本地添加任务 contract。不会执行实时 API、后端持久化、provider 或 evidence 查询、secret 处理、导出文件、发奖或合约写入。",
);

const campaignDiscoveryBoundary = text(
  "Seeded/local campaign discovery contract only. No live marketplace API, App Hub backend, Portfolio sync, Forecast prediction, wallet SDK, provider call, storage write, contract view/send, claim, export file, reward custody, or reward distribution is executed.",
  "仅 seeded/本地活动发现 contract。不会执行实时 marketplace API、App Hub 后端、Portfolio 同步、Forecast 预测、钱包 SDK、provider 调用、storage 写入、合约读取/发送、claim、导出文件、奖励托管或发奖。",
);

const i18nDraftBoundary = text(
  "Seeded/local i18n draft contract only. No live API, AI provider, LLM gateway, backend persistence, publish mutation, auto-publish, secret handling, export file, reward, or contract write is executed.",
  "仅 seeded/本地 i18n 草稿 contract。不会执行实时 API、AI provider、LLM gateway、后端持久化、发布变更、自动发布、secret 处理、导出文件、发奖或合约写入。",
);

const verificationBoundary = text(
  "Verification contract only. Local seeded, AeFinder, AelfScan, dApp APIs, social APIs, wallet session, and manual review are named as evidence categories; no live provider, wallet SDK, secret, reward, export file, or contract write is executed.",
  "仅验证 contract。Local seeded、AeFinder、AelfScan、dApp API、社交 API、钱包会话与人工审核只作为 evidence category 展示；不会执行真实 provider、钱包 SDK、secret、发奖、导出文件或合约写入。",
);

const exportBoundary = text(
  "Export contract only. Campaign OS previews winner records and columns but does not distribute rewards or write contract roots.",
  "仅导出 contract。Campaign OS 预览 winners 记录和字段，不会发奖，也不会写入合约 root。",
);

const campaignStatusExample = campaignLifecycleStatuses.join(",");

export const requiredApiSkillIds = [
  "create_wallet_session",
  "agent_wallet_action",
  "create_campaign",
  "list_campaigns",
  "get_campaign_detail",
  "add_campaign_task",
  "generate_campaign_tasks",
  "verify_task",
  "check_eligibility",
  "get_campaign_analytics",
  "export_winners",
  "generate_i18n_draft",
  "generate_campaign_posts",
  "summarize_campaign",
] as const satisfies readonly ApiSkillId[];

export const requiredApiSkillFieldGroups = [
  "wallet",
  "locale",
  "contract",
  "export",
  "evidence",
] as const satisfies readonly ApiSkillFieldGroup[];

const externalEvidenceSources = new Set<ApiSkillEvidenceSource>([
  "AEFINDER",
  "AELFSCAN",
  "DAPP_API",
  "SOCIAL_API",
  "MANUAL",
  "WALLET_SESSION",
]);

export const apiSkillContractRegistry: ApiSkillContract[] = [
  {
    apiGroup: "wallet_session",
    evidenceSources: ["LOCAL_SEEDED"],
    id: "create_wallet_session",
    inputFields: [
      field("address", "wallet", true, "Wallet address supplied by the local session request.", "本地会话请求提供的钱包地址。", "2F4...9aB"),
      field("adapterName", "wallet", true, "Wallet adapter name used for local source and account-type mapping.", "用于本地来源与账户类型映射的钱包 adapter 名称。", "PortkeyDiscoverWallet"),
      field("chainId", "wallet", true, "Wallet chain identifier.", "钱包链标识。", "AELF"),
      field("network", "wallet", true, "Wallet network for the local session.", "本地会话的钱包网络。", "mainnet"),
      field("signature", "wallet", false, "Optional signature presence signal; the signature value is not returned.", "可选签名存在信号；签名值不会返回。"),
    ],
    nextAction: text(
      "Keep wallet session creation local until wallet provider QA, adapter evidence, and backend persistence are approved.",
      "在钱包 provider QA、adapter 证据与后端持久化获批前，保持钱包会话创建为本地模式。",
    ),
    outputFields: [
      field("sessionId", "wallet", true, "Normalized local wallet session identifier.", "归一化本地钱包会话标识。", "sess_123"),
      field("address", "wallet", true, "Normalized wallet address.", "归一化钱包地址。", "2F4...9aB"),
      field("accountType", "wallet", true, "AA, EOA, or UNKNOWN account type.", "AA、EOA 或 UNKNOWN 账户类型。", "EOA"),
      field("walletSource", "wallet", true, "Normalized wallet source.", "归一化钱包来源。", "PORTKEY_EOA_EXTENSION"),
      field("walletName", "wallet", true, "Human-readable wallet name.", "可读钱包名称。", "Portkey EOA Extension"),
      field("chainId", "wallet", true, "Normalized chain identifier.", "归一化链标识。", "AELF"),
      field("network", "wallet", true, "Normalized wallet network.", "归一化钱包网络。", "mainnet"),
      field("accounts", "wallet", false, "Optional public account-map metadata when fixture-provided.", "fixture 提供时返回的可选公开账户映射 metadata。", "AELF:2F4...9aB"),
      field("publicKey", "wallet", false, "Optional public wallet identity metadata when fixture-provided.", "fixture 提供时返回的可选公开钱包身份 metadata。", "PUB_EOA_APP_SEEDED_001"),
      field("capabilities", "wallet", true, "Normalized wallet capability list.", "归一化钱包能力列表。", "SIGN_MESSAGE,SEND_TRANSACTION"),
      field("verificationStatus", "wallet", true, "Local wallet verification status.", "本地钱包验证状态。", "verified"),
      field("signatureStatus", "wallet", true, "Local signature presence status.", "本地签名存在状态。", "signed"),
      field("walletTypeVerified", "wallet", true, "Whether the local session has a verified wallet type.", "本地会话是否已有已验证的钱包类型。", "true"),
    ],
    purpose: text(
      "Create a local normalized wallet session with public identity metadata boundaries visible before live wallet integration.",
      "在接入真实钱包前，创建本地归一化钱包会话并明确公开身份 metadata 边界。",
    ),
    readiness: "local_only",
    riskLevel: "medium",
    securityBoundary: walletSessionBoundary,
    title: text("Create wallet session", "创建钱包会话"),
  },
  {
    apiGroup: "wallet_session",
    evidenceSources: ["LOCAL_SEEDED", "MANUAL", "WALLET_SESSION"],
    id: "agent_wallet_action",
    inputFields: [
      field("agentId", "wallet", true, "Internal Agent Skill identifier requesting wallet action readiness.", "请求钱包动作 readiness 的内部 Agent Skill 标识。", "agent_portkey_eoa_001"),
      field("operatorRole", "risk", true, "Operator or service role that owns the human approval path.", "负责人审批路径所属的运营或服务角色。", "internal_operator"),
      field("walletSource", "wallet", true, "Wallet source must stay AGENT_SKILL for this internal automation path.", "该内部自动化路径的钱包来源必须保持为 AGENT_SKILL。", "AGENT_SKILL"),
      field("actionIntent", "task", true, "Requested wallet action intent for review only.", "仅用于审核的请求钱包动作意图。", "verify_task_evidence"),
      field("chainId", "wallet", true, "Target chain identifier for the reviewed intent.", "被审核意图的目标链标识。", "AELF"),
      field("network", "wallet", true, "Target wallet network for the reviewed intent.", "被审核意图的目标钱包网络。", "mainnet"),
      field("campaignId", "campaign", true, "Campaign associated with the reviewed wallet action.", "被审核钱包动作关联的活动。", "camp_awaken_sprint"),
      field("taskId", "task", true, "Task associated with the reviewed wallet action.", "被审核钱包动作关联的任务。", "task_bridge_ebridge_1"),
      field("humanApprovalState", "risk", true, "Human approval state required before any future execution can be considered.", "未来考虑任何执行前所需的人工审批状态。", "pending_review"),
      field("evidencePurpose", "evidence", true, "Evidence purpose for audit review without fetching live evidence.", "不拉取实时 evidence 的审计审核用途。", "operator_readiness_review"),
    ],
    nextAction: text(
      "Keep Agent Skill wallet actions blocked until human approval, audited evidence, key custody design, and execution runbooks are separately approved.",
      "在人工审批、已审计 evidence、密钥托管设计与执行 runbook 单独获批前，保持 Agent Skill 钱包动作阻断。",
    ),
    outputFields: [
      field("actionState", "risk", true, "blocked or review_required readiness state for the requested intent.", "请求意图的 blocked 或 review_required readiness 状态。", "review_required"),
      field("allowedOperation", "risk", true, "Review-only operation allowed by this contract.", "该 contract 允许的仅审核操作。", "readiness_review_only"),
      field("blockedReason", "risk", true, "Reason live wallet action execution remains blocked.", "真实钱包动作执行仍被阻断的原因。"),
      field("auditTrail", "evidence", true, "Local audit trail summary for the reviewed intent.", "被审核意图的本地审计轨迹摘要。"),
      field("noPrivateKeyBoundary", "wallet", true, "Confirms private keys, mnemonics, recovery phrases, and passwords are not handled.", "确认不会处理私钥、助记词、恢复短语或密码。", "true"),
      field("noSignatureExecution", "wallet", true, "Confirms no signature execution is performed.", "确认不会执行签名。", "true"),
      field("noTransactionExecution", "wallet", true, "Confirms no transaction, transfer, or contract write is sent.", "确认不会发送交易、转账或合约写入。", "true"),
      field("nextReviewAction", "risk", true, "Next operator review action before any future execution design.", "任何未来执行设计前的下一步运营审核动作。"),
    ],
    purpose: text(
      "Expose internal automation wallet action readiness for Agent Skill EOA flows without executing wallet, signature, transaction, reward, export, or contract operations.",
      "展示 Agent Skill EOA 流程的内部自动化钱包动作 readiness，但不执行钱包、签名、交易、发奖、导出或合约操作。",
    ),
    readiness: "review_required",
    riskLevel: "high",
    securityBoundary: agentWalletActionBoundary,
    title: text("Agent Skill wallet action readiness", "Agent Skill 钱包动作 readiness"),
  },
  {
    apiGroup: "campaign_creation",
    evidenceSources: ["LOCAL_SEEDED"],
    id: "create_campaign",
    inputFields: [
      field("projectId", "campaign", true, "Project that owns the campaign draft.", "拥有活动草稿的项目。", "awaken"),
      field("ownerAddress", "wallet", true, "Wallet address that owns the campaign.", "活动 owner 钱包地址。", "2F4...9aB"),
      field("goal", "campaign", true, "Campaign growth goal.", "活动增长目标。", "activation"),
      field("duration", "campaign", true, "Start and end time window.", "开始与结束时间窗口。", "2026-07-01/2026-07-14"),
      field("startTime", "campaign", true, "Campaign start timestamp.", "活动开始时间。", "2026-07-01T00:00:00Z"),
      field("endTime", "campaign", true, "Campaign end timestamp.", "活动结束时间。", "2026-07-14T23:59:59Z"),
      field(
        "status",
        "campaign",
        true,
        "Campaign lifecycle status: draft, ai_draft, human_review, scheduled, live, paused, ended, exported, or archived.",
        "活动 lifecycle 状态：draft、ai_draft、human_review、scheduled、live、paused、ended、exported 或 archived。",
        campaignStatusExample,
      ),
      field("defaultLocale", "locale", true, "Default runtime locale. MVP default is en-US.", "默认运行语言。MVP 默认为 en-US。", "en-US"),
      field(
        "supportedLocales",
        "locale",
        true,
        "Supported runtime locales are the activated set en-US, zh-CN, zh-TW, ja-JP, ko-KR, and vi-VN.",
        "运行时支持完整已激活语言集合 en-US、zh-CN、zh-TW、ja-JP、ko-KR 与 vi-VN。",
        "en-US,zh-CN,zh-TW,ja-JP,ko-KR,vi-VN",
      ),
      field("walletPolicy", "wallet", true, "Allowed wallet policy for participants.", "参与者允许的钱包策略。", "ANY"),
      field("contractMode", "contract", true, "Campaign contract mode.", "活动合约模式。", "OFF_CHAIN_MVP"),
      field("metadataUri", "contract", false, "Optional campaign metadata URI for future contract handoff.", "面向未来合约交接的可选活动 metadata URI。"),
      field("metadataHash", "contract", false, "Optional campaign metadata hash.", "可选活动 metadata hash。"),
      field("rewardDisclaimerHash", "contract", false, "Optional hash of the reviewed reward disclaimer.", "已审核奖励声明的可选 hash。"),
      field("rewardDescription", "campaign", true, "Human-readable reward responsibility and disclaimer.", "面向用户的奖励责任与免责声明。"),
    ],
    nextAction: text(
      "Keep creating local campaign drafts until backend campaign persistence is available.",
      "在后端活动持久化可用前，保持创建本地活动草稿。",
    ),
    outputFields: [
      field("campaignDraft", "campaign", true, "Structured local campaign draft.", "结构化本地活动草稿。"),
      field("publishReadiness", "risk", true, "Initial publish gate summary.", "初始发布门禁摘要。"),
      field("contractReview", "contract", true, "Contract mode review projection.", "合约模式审核投影。"),
    ],
    purpose: text(
      "Create a campaign draft with wallet, locale, and contract boundaries visible before publish.",
      "创建活动草稿，并在发布前明确钱包、语言与合约边界。",
    ),
    readiness: "local_only",
    riskLevel: "medium",
    securityBoundary: liveApiBoundary,
    title: text("Create campaign draft", "创建活动草稿"),
  },
  {
    apiGroup: "campaign_discovery",
    evidenceSources: ["LOCAL_SEEDED"],
    id: "list_campaigns",
    inputFields: [
      field("consumerSurface", "campaign", false, "Optional consumer surface: user_app, app_hub, portfolio, or forecast.", "可选消费端：user_app、app_hub、portfolio 或 forecast。", "app_hub"),
      field("status", "campaign", false, "Optional campaign lifecycle status filter.", "可选活动 lifecycle 状态筛选。", "live"),
      field("walletAddress", "wallet", false, "Optional wallet address used only for local CTA context.", "仅用于本地 CTA 上下文的可选钱包地址。", "3E9...7cD"),
    ],
    nextAction: text(
      "Use local campaign discovery until marketplace backend ownership, pagination, ranking, and privacy controls are approved.",
      "在 marketplace 后端归属、分页、排序与隐私控制获批前，使用本地活动发现。",
    ),
    outputFields: [
      field("campaignId", "campaign", true, "Primary seeded campaign identifier.", "主要 seeded 活动标识。", "camp-awaken-sprint"),
      field("items", "campaign", true, "Seeded campaign discovery list items.", "Seeded 活动发现列表项。"),
      field("title", "locale", true, "Localized campaign title per item.", "每个活动项的本地化标题。"),
      field("status", "campaign", true, "Campaign lifecycle status per item.", "每个活动项的活动 lifecycle 状态。", campaignStatusExample),
      field("points", "task", true, "Total points shown for discovery.", "Discovery 中展示的总积分。", "270"),
      field("coreTasks", "task", true, "Core task summaries for feed cards.", "Feed 卡片中的核心任务摘要。"),
      field("walletPolicy", "wallet", true, "Allowed wallet policy for the campaign.", "活动允许的钱包策略。", "ANY"),
      field("supportedLocales", "locale", true, "Supported locale set for campaign copy.", "活动文案支持的语言集合。", "en-US,zh-CN,zh-TW,ja-JP,ko-KR,vi-VN"),
      field("consumerSurfaces", "campaign", true, "User App, App Hub, Portfolio, or Forecast surface readiness.", "User App、App Hub、Portfolio 或 Forecast 消费端 readiness。"),
      field("boundary", "risk", true, "Local-only campaign discovery boundary.", "仅本地活动发现边界。"),
    ],
    purpose: text(
      "List seeded/local campaigns for User App, App Hub, Portfolio, and Forecast discovery readiness.",
      "为 User App、App Hub、Portfolio 与 Forecast discovery readiness 列出 seeded/本地活动。",
    ),
    readiness: "local_only",
    riskLevel: "medium",
    securityBoundary: campaignDiscoveryBoundary,
    title: text("List campaigns", "列出活动"),
  },
  {
    apiGroup: "campaign_discovery",
    evidenceSources: ["LOCAL_SEEDED"],
    id: "get_campaign_detail",
    inputFields: [
      field("campaignId", "campaign", true, "Campaign identifier from the discovery list.", "来自 discovery 列表的活动标识。", "camp-awaken-sprint"),
      field("consumerSurface", "campaign", false, "Optional consumer surface: user_app, app_hub, portfolio, or forecast.", "可选消费端：user_app、app_hub、portfolio 或 forecast。", "user_app"),
      field("walletAddress", "wallet", false, "Optional wallet address used only for local CTA context.", "仅用于本地 CTA 上下文的可选钱包地址。", "3E9...7cD"),
    ],
    nextAction: text(
      "Keep detail reads local until campaign detail backend, App Hub routing, and service-level ownership are separately approved.",
      "在活动详情后端、App Hub 路由与服务级归属单独获批前，保持详情读取为本地模式。",
    ),
    outputFields: [
      field("item", "campaign", true, "Selected discovery campaign item.", "选中的 discovery 活动项。"),
      field("tasks", "task", true, "Expanded safe task summaries.", "展开后的安全任务摘要。"),
      field("eligibilityEntry", "risk", true, "Local eligibility entry guidance.", "本地资格入口指引。"),
      field("rewardBoundary", "risk", true, "Project-owned reward fulfillment boundary.", "项目方负责奖励履约的边界。"),
      field("appHubContext", "campaign", true, "App Hub local display context.", "App Hub 本地展示上下文。"),
      field("portfolioContext", "campaign", true, "Portfolio local checkpoint context.", "Portfolio 本地检查点上下文。"),
      field("forecastContext", "campaign", true, "Forecast local context without prediction execution.", "无预测执行的 Forecast 本地上下文。"),
      field("boundary", "risk", true, "Local-only campaign detail boundary.", "仅本地活动详情边界。"),
    ],
    purpose: text(
      "Read one seeded/local campaign detail for discovery consumers without live marketplace or product-service execution.",
      "为 discovery 消费端读取一个 seeded/本地活动详情，不执行实时 marketplace 或产品服务。",
    ),
    readiness: "local_only",
    riskLevel: "medium",
    securityBoundary: campaignDiscoveryBoundary,
    title: text("Get campaign detail", "获取活动详情"),
  },
  {
    apiGroup: "task_generation",
    evidenceSources: ["LOCAL_SEEDED"],
    id: "add_campaign_task",
    inputFields: [
      field("campaignId", "campaign", true, "Campaign identifier for the task draft.", "任务草稿所属活动标识。", "camp_123"),
      field("templateCode", "task", true, "Task template code to add to the campaign.", "要添加到活动的任务模板代码。", "bridge_ebridge"),
      field("walletCompatibility", "wallet", true, "Wallet compatibility for the task.", "任务的钱包兼容性。", "ANY"),
      field("verificationType", "task", true, "WALLET, ON_CHAIN, DAPP_API, SOCIAL, or MANUAL.", "WALLET、ON_CHAIN、DAPP_API、SOCIAL 或 MANUAL。", "ON_CHAIN"),
      field("points", "task", true, "Points available for the task.", "任务可获得积分。", "120"),
      field("required", "task", true, "Whether the task is required for eligibility.", "该任务是否为资格必做任务。", "true"),
      field("evidenceRule", "evidence", true, "Structured seeded/local evidence rule metadata.", "结构化 seeded/本地 evidence 规则 metadata。"),
    ],
    nextAction: text(
      "Keep task draft creation local until backend persistence, template governance, and live verification adapters are approved.",
      "在后端持久化、模板治理与实时验证 adapter 获批前，保持任务草稿创建为本地模式。",
    ),
    outputFields: [
      field("id", "task", true, "Local task draft identifier.", "本地任务草稿标识。", "task_bridge_ebridge_1"),
      field("campaignId", "campaign", true, "Campaign identifier for the task draft.", "任务草稿所属活动标识。", "camp_123"),
      field("templateCode", "task", true, "Task template code added to the campaign.", "已添加到活动的任务模板代码。", "bridge_ebridge"),
      field("walletCompatibility", "wallet", true, "Wallet compatibility for the task.", "任务的钱包兼容性。", "ANY"),
      field("verificationType", "task", true, "Task verification type.", "任务验证类型。", "ON_CHAIN"),
      field("points", "task", true, "Points available for the task.", "任务可获得积分。", "120"),
      field("required", "task", true, "Whether the task is required for eligibility.", "该任务是否为资格必做任务。", "true"),
      field("evidenceRule", "evidence", true, "Structured seeded/local evidence rule metadata.", "结构化 seeded/本地 evidence 规则 metadata。"),
    ],
    purpose: text(
      "Add one seeded/local campaign task draft with wallet compatibility, verification, points, required flag, and evidence rule boundaries visible.",
      "添加一个 seeded/本地活动任务草稿，并展示钱包兼容性、验证、积分、必做标记与 evidence 规则边界。",
    ),
    readiness: "local_only",
    riskLevel: "medium",
    securityBoundary: addTaskBoundary,
    title: text("Add campaign task", "添加活动任务"),
  },
  {
    apiGroup: "task_generation",
    evidenceSources: ["LOCAL_SEEDED"],
    id: "generate_campaign_tasks",
    inputFields: [
      field("campaignId", "campaign", true, "Campaign identifier for generated tasks.", "生成任务所属活动标识。", "camp_123"),
      field("goal", "campaign", true, "Campaign objective used to select templates.", "用于选择模板的活动目标。"),
      field("targetUsers", "campaign", true, "Audience segment for generated tasks.", "生成任务的目标用户分层。"),
      field("product", "campaign", true, "aelf ecosystem product.", "aelf 生态产品。", "Awaken"),
      field("walletPolicy", "wallet", true, "Wallet policy used for compatibility filtering.", "用于兼容性筛选的钱包策略。", "ANY"),
      field("templateCode", "task", true, "Task template code.", "任务模板代码。", "bridge_ebridge"),
      field("titleKey", "locale", true, "I18n key for the task title.", "任务标题 i18n key。", "task.bridge.title"),
      field("instructionKey", "locale", true, "I18n key for the task instruction.", "任务说明 i18n key。", "task.bridge.instruction"),
      field("verificationType", "task", true, "WALLET, ON_CHAIN, DAPP_API, SOCIAL, or MANUAL.", "WALLET、ON_CHAIN、DAPP_API、SOCIAL 或 MANUAL。", "ON_CHAIN"),
      field("points", "task", true, "Points available for the task.", "任务可获得积分。", "120"),
      field("required", "task", true, "Whether the task is required for eligibility.", "该任务是否为资格必做任务。", "true"),
      field("evidenceRule", "evidence", true, "Structured evidence rule used by future verification adapters.", "未来 verification adapter 使用的结构化 evidence 规则。"),
    ],
    nextAction: text(
      "Review generated tasks with the Task Template Library before publish.",
      "发布前结合任务模板库审核生成任务。",
    ),
    outputFields: [
      field("taskList", "task", true, "Generated campaign task list.", "生成的活动任务列表。"),
      field("pointRules", "task", true, "Default points and required/optional settings.", "默认积分与必做/可选设置。"),
      field("walletCompatibility", "wallet", true, "AA/EOA compatibility for each task.", "每个任务的 AA/EOA 兼容性。"),
    ],
    purpose: text(
      "Generate wallet-aware task suggestions from campaign goals and product context.",
      "根据活动目标与产品上下文生成钱包感知任务建议。",
    ),
    readiness: "ready",
    riskLevel: "medium",
    securityBoundary: liveApiBoundary,
    title: text("Generate campaign tasks", "生成活动任务"),
  },
  {
    apiGroup: "task_verification",
    evidenceSources: [
      "LOCAL_SEEDED",
      "AEFINDER",
      "AELFSCAN",
      "DAPP_API",
      "SOCIAL_API",
      "WALLET_SESSION",
      "MANUAL",
    ],
    id: "verify_task",
    inputFields: [
      field("campaignId", "campaign", true, "Campaign identifier.", "活动标识。"),
      field("taskId", "task", true, "Task identifier.", "任务标识。"),
      field("walletAddress", "wallet", true, "Participant wallet address.", "参与者钱包地址。"),
      field("accountType", "wallet", true, "AA, EOA, or UNKNOWN account type.", "AA、EOA 或 UNKNOWN 账户类型。", "EOA"),
      field("walletSource", "wallet", true, "Normalized wallet source.", "标准化钱包来源。", "PORTKEY_EOA_EXTENSION"),
    ],
    nextAction: text(
      "Wire provider adapters only after traceable evidence, provider QA, fallback states, and manual-review handling are defined.",
      "只有在可追踪 evidence、provider QA、fallback 状态与人工审核处理定义完成后再接 provider adapter。",
    ),
    outputFields: [
      field("status", "task", true, "completed, failed, pending, or manual_review.", "completed、failed、pending 或 manual_review。"),
      field("pointsAvailable", "task", true, "Task points available before verification.", "验证前可获得的任务积分。"),
      field("pointsAwarded", "task", true, "Points awarded after verification.", "验证后授予积分。"),
      field("evidenceSource", "evidence", true, "Legacy source label used by current UI surfaces.", "当前 UI 使用的旧 source label。", "aelfscan"),
      field("canonicalEvidenceSource", "evidence", true, "Canonical evidence category.", "标准 evidence category。", "AELFSCAN"),
      field("evidenceId", "evidence", true, "Deterministic local evidence identifier.", "确定性的本地 evidence 标识。"),
      field("evidenceHash", "evidence", false, "Optional deterministic local hash/id of verification evidence.", "可选的确定性本地验证 evidence hash/id。"),
      field("txId", "evidence", false, "Optional transaction id for on-chain evidence.", "链上 evidence 的可选交易 ID。"),
      field("completedAt", "task", false, "Optional completion timestamp.", "可选完成时间。"),
      field("providerReadiness", "evidence", true, "ready, local_only, review_required, unavailable, or blocked.", "ready、local_only、review_required、unavailable 或 blocked。"),
      field("fallbackReason", "risk", false, "Why the path cannot be treated as live verification.", "该路径为什么不能视为真实验证。"),
      field("riskFlags", "risk", true, "Participant or task risk flags affecting verification.", "影响验证的参与者或任务风险标记。"),
      field("manualReview", "risk", true, "Manual review queue projection.", "人工审核队列投影。"),
      field("nextAction", "task", true, "Localized user/operator next action.", "本地化的用户/运营下一步。"),
    ],
    purpose: text(
      "Verify one participant task while preserving wallet and evidence provenance.",
      "验证单个参与者任务，并保留钱包与 evidence 来源。",
    ),
    readiness: "review_required",
    riskLevel: "high",
    securityBoundary: verificationBoundary,
    title: text("Verify task", "验证任务"),
  },
  {
    apiGroup: "eligibility",
    evidenceSources: ["LOCAL_SEEDED", "MANUAL"],
    id: "check_eligibility",
    inputFields: [
      field("campaignId", "campaign", true, "Campaign identifier.", "活动标识。"),
      field("walletAddress", "wallet", true, "Participant wallet address.", "参与者钱包地址。"),
      field("accountType", "wallet", true, "Normalized account type.", "标准化账户类型。"),
      field("walletSource", "wallet", true, "Normalized wallet source.", "标准化钱包来源。"),
    ],
    nextAction: text(
      "Use local eligibility previews until verification adapters are connected.",
      "在 verification adapter 接入前使用本地资格预览。",
    ),
    outputFields: [
      field("walletTypeVerified", "wallet", true, "Whether wallet type has been verified.", "钱包类型是否已验证。"),
      field("eligible", "risk", true, "Eligibility decision.", "资格判断。"),
      field("score", "analytics", true, "Current participant score.", "当前参与者分数。"),
      field("missingTasks", "task", true, "Required tasks still missing.", "仍缺失的必做任务。"),
      field("localePreference", "locale", true, "Participant locale preference.", "参与者语言偏好。", "zh-CN"),
      field("riskFlags", "risk", true, "Risk flags that affect eligibility.", "影响资格的风险标记。"),
    ],
    purpose: text(
      "Check participant eligibility with wallet type, missing tasks, locale, and risk flags visible.",
      "检查参与者资格，并展示钱包类型、缺失任务、语言和风险标记。",
    ),
    readiness: "local_only",
    riskLevel: "medium",
    securityBoundary: liveApiBoundary,
    title: text("Check eligibility", "检查资格"),
  },
  {
    apiGroup: "analytics",
    evidenceSources: ["LOCAL_SEEDED"],
    id: "get_campaign_analytics",
    inputFields: [
      field("campaignId", "campaign", true, "Campaign identifier.", "活动标识。"),
    ],
    nextAction: text(
      "Keep analytics as seeded dashboard projections until event collection is wired.",
      "在事件采集接入前，将 analytics 保持为 seeded dashboard 投影。",
    ),
    outputFields: [
      field("participants", "analytics", true, "Participant count.", "参与人数。"),
      field("completion", "analytics", true, "Task completion rate.", "任务完成率。"),
      field("conversion", "analytics", true, "Campaign conversion funnel.", "活动转化漏斗。"),
      field("risk", "risk", true, "Risk queue and flags.", "风险队列与标记。"),
      field("walletTypeSplit", "wallet", true, "AA/EOA metrics split.", "AA/EOA 指标拆分。"),
      field("localeSplit", "locale", true, "Locale metrics split.", "语言指标拆分。"),
    ],
    purpose: text(
      "Summarize campaign performance by completion, conversion, risk, wallet type, and locale.",
      "按完成、转化、风险、钱包类型与语言汇总活动表现。",
    ),
    readiness: "ready",
    riskLevel: "low",
    securityBoundary: liveApiBoundary,
    title: text("Get campaign analytics", "获取活动分析"),
  },
  {
    apiGroup: "export",
    evidenceSources: ["LOCAL_SEEDED", "MANUAL"],
    id: "export_winners",
    inputFields: [
      field("campaignId", "campaign", true, "Campaign identifier.", "活动标识。"),
      field("format", "export", true, "Export format.", "导出格式。", "csv"),
      field("includeRiskFlags", "risk", true, "Include risk flags in export.", "导出中包含风险标记。", "true"),
      field("includeWalletType", "wallet", true, "Include account type and wallet source.", "包含账户类型与钱包来源。", "true"),
      field("includeLocalePreference", "locale", true, "Include participant locale preference.", "包含参与者语言偏好。", "true"),
      field("contractRootMode", "contract", true, "Whether to produce a contract root.", "是否生成合约 root。", "none"),
    ],
    nextAction: text(
      "Keep export in preview until human review confirms winners and reward owner.",
      "在人工确认 winners 与奖励负责人前保持导出预览。",
    ),
    outputFields: [
      field("csvColumns", "export", true, "campaign_id,wallet_address,account_type,wallet_source,locale_preference,total_points,rank,eligible,missing_tasks,risk_flags,referrer_address,task_records,evidence_hashes,export_batch_id", "campaign_id,wallet_address,account_type,wallet_source,locale_preference,total_points,rank,eligible,missing_tasks,risk_flags,referrer_address,task_records,evidence_hashes,export_batch_id"),
      field("winnerRows", "export", true, "Winner records ready for review.", "可供审核的 winners 记录。"),
      field("evidenceHashes", "evidence", true, "Evidence hashes included per row.", "每行包含 evidence hash。"),
      field("rewardBoundary", "risk", true, "Campaign project remains reward distributor.", "活动项目方仍是奖励发放方。"),
    ],
    purpose: text(
      "Export winners with wallet, locale, eligibility, risk, task, and evidence columns visible.",
      "导出 winners，并展示钱包、语言、资格、风险、任务与 evidence 字段。",
    ),
    readiness: "review_required",
    riskLevel: "high",
    securityBoundary: exportBoundary,
    title: text("Export winners", "导出 winners"),
  },
  {
    apiGroup: "content_generation",
    evidenceSources: ["LOCAL_SEEDED"],
    id: "generate_i18n_draft",
    inputFields: [
      field("campaignId", "campaign", true, "Campaign identifier for the translation draft.", "翻译草稿所属活动标识。", "camp_awaken_sprint"),
      field("sourceLocale", "locale", true, "Source locale. MVP source is en-US.", "源语言。MVP 源语言为 en-US。", "en-US"),
      field("targetLocale", "locale", true, "Target locale limited to zh-CN or zh-TW.", "目标语言限定为 zh-CN 或 zh-TW。", "zh-CN"),
      field(
        "contentKeys",
        "content",
        true,
        "Content keys requested for translation draft: title, description, reward disclaimer, and FAQ.",
        "请求生成翻译草稿的内容 key：标题、描述、奖励声明与 FAQ。",
        "title,description,rewardDisclaimer,faq",
      ),
    ],
    nextAction: text(
      "Route every generated translation draft through human review before any publish revision.",
      "任何生成的翻译草稿进入发布 revision 前都必须经过人工审核。",
    ),
    outputFields: [
      field("sourceLocale", "locale", true, "Source locale used for the draft.", "草稿使用的源语言。", "en-US"),
      field("targetLocale", "locale", true, "Target locale for the draft.", "草稿目标语言。", "zh-CN"),
      field("contentKeys", "content", true, "Content keys included in the draft.", "草稿包含的内容 key。", "title,description"),
      field("draft", "content", true, "Local translation draft values keyed by content key.", "按内容 key 返回的本地翻译草稿。"),
      field("fallbackToEnglish", "locale", true, "Whether missing target copy falls back to English.", "缺失目标文案是否 fallback 到英文。", "true"),
      field("humanReviewRequired", "risk", true, "Whether a human reviewer must approve the draft before publish.", "发布前是否必须由人工审核草稿。", "true"),
      field("noAutoPublishNotice", "risk", true, "Localized notice that AI generated translation cannot auto-publish.", "AI 生成翻译不得自动发布的本地化提示。"),
      field("aiDraft", "content", false, "Existing local signal that the target locale is an AI draft.", "目标语言是 AI 草稿的现有本地信号。", "true"),
    ],
    purpose: text(
      "Generate a seeded/local translation draft from English source content with fallback, human review, and no-auto-publish boundaries visible.",
      "从英文源文案生成 seeded/本地翻译草稿，并展示 fallback、人工审核与禁止自动发布边界。",
    ),
    readiness: "local_only",
    riskLevel: "medium",
    securityBoundary: i18nDraftBoundary,
    title: text("Generate i18n translation draft", "生成 i18n 翻译草稿"),
  },
  {
    apiGroup: "content_generation",
    evidenceSources: ["LOCAL_SEEDED", "MANUAL"],
    id: "generate_campaign_posts",
    inputFields: [
      field("campaignId", "campaign", true, "Campaign identifier.", "活动标识。"),
      field("channel", "content", true, "Distribution channel.", "分发渠道。", "x"),
      field("sourceLocale", "locale", true, "Source copy locale defaults to en-US.", "源文案语言默认 en-US。", "en-US"),
      field(
        "targetLocales",
        "locale",
        false,
        "Optional target locales limited to zh-CN, zh-TW, ja-JP, ko-KR, and vi-VN.",
        "可选目标语言限定 zh-CN、zh-TW、ja-JP、ko-KR 与 vi-VN。",
        "zh-CN,zh-TW,ja-JP,ko-KR,vi-VN",
      ),
      field(
        "contentKeys",
        "content",
        true,
        "Content keys requested for generation: title, description, reward disclaimer, and FAQ.",
        "请求生成的内容 key：标题、描述、奖励声明与 FAQ。",
        "title,description,rewardDisclaimer,faq",
      ),
    ],
    nextAction: text(
      "Require human review before any schedule or publish intent leaves the local UI.",
      "任何排期或发布意图离开本地 UI 前必须人工审核。",
    ),
    outputFields: [
      field("xCopy", "content", false, "X thread copy.", "X thread 文案。"),
      field("telegramCopy", "content", false, "Telegram announcement copy.", "Telegram 公告文案。"),
      field("discordCopy", "content", false, "Discord copy.", "Discord 文案。"),
      field("localeStatus", "locale", true, "Locale review status.", "语言审核状态。"),
    ],
    purpose: text(
      "Generate campaign channel copy with locale review boundaries visible.",
      "生成活动渠道文案，并展示语言审核边界。",
    ),
    readiness: "review_required",
    riskLevel: "medium",
    securityBoundary: liveApiBoundary,
    title: text("Generate campaign posts", "生成活动帖子"),
  },
  {
    apiGroup: "campaign_summary",
    evidenceSources: ["LOCAL_SEEDED"],
    id: "summarize_campaign",
    inputFields: [
      field("campaignId", "campaign", true, "Campaign identifier.", "活动标识。"),
      field("period", "analytics", true, "daily or weekly summary period.", "daily 或 weekly 汇总周期。", "daily"),
    ],
    nextAction: text(
      "Use local report cards until analytics events and AI reporting services are connected.",
      "在 analytics 事件与 AI 报告服务接入前使用本地报告卡。",
    ),
    outputFields: [
      field("report", "analytics", true, "Daily or weekly campaign report.", "每日或每周活动报告。"),
      field("walletTypeMetrics", "wallet", true, "Metrics split by wallet type.", "按钱包类型拆分的指标。"),
      field("localeMetrics", "locale", true, "Metrics split by locale.", "按语言拆分的指标。"),
      field(
        "walletLocaleMetrics",
        "wallet",
        true,
        "Metrics split by wallet type and locale.",
        "按钱包类型与语言组合拆分的指标。",
      ),
      field(
        "referralWalletRiskMetrics",
        "risk",
        true,
        "Seeded referral conversion metrics split by wallet type and review-safe risk tier.",
        "按钱包类型与审核安全风险分层拆分的 seeded 邀请转化指标。",
      ),
      field("riskSummary", "risk", true, "Risk and review summary.", "风险与审核摘要。"),
    ],
    purpose: text(
      "Summarize campaign health by wallet type, locale, conversion, and risk.",
      "按钱包类型、语言、转化与风险汇总活动健康度。",
    ),
    readiness: "ready",
    riskLevel: "low",
    securityBoundary: liveApiBoundary,
    title: text("Summarize campaign", "总结活动"),
  },
];

export const getApiSkillContractCoverage = (
  contracts: ApiSkillContract[] = apiSkillContractRegistry,
): ApiSkillContractCoverage => {
  const covered = new Set<ApiSkillFieldGroup>();

  for (const contract of contracts) {
    for (const fieldDef of [...contract.inputFields, ...contract.outputFields]) {
      covered.add(fieldDef.group);
    }
  }

  const coveredFieldGroups = Array.from(covered).sort();

  return {
    coveredFieldGroups,
    missingFieldGroups: requiredApiSkillFieldGroups.filter((group) => !covered.has(group)),
    requiredFieldGroups: requiredApiSkillFieldGroups,
  };
};

export const createApiSkillContractSurface = (
  contracts: ApiSkillContract[] = apiSkillContractRegistry,
): ApiSkillContractSurface => {
  const contractIds = new Set(contracts.map((contract) => contract.id));
  const missingSkillIds = requiredApiSkillIds.filter((id) => !contractIds.has(id));
  const summary = contracts.reduce<ApiSkillContractSurface["summary"]>(
    (current, contract) => {
      current.totalContracts += 1;
      if (contract.readiness === "ready") {
        current.readyCount += 1;
      } else if (contract.readiness === "local_only") {
        current.localOnlyCount += 1;
      } else if (contract.readiness === "review_required") {
        current.reviewRequiredCount += 1;
      } else {
        current.blockedCount += 1;
      }
      if (contract.riskLevel === "high") {
        current.highRiskCount += 1;
      }
      if (contract.evidenceSources.some((source) => externalEvidenceSources.has(source))) {
        current.externalEvidenceCount += 1;
      }

      return current;
    },
    {
      blockedCount: 0,
      externalEvidenceCount: 0,
      highRiskCount: 0,
      localOnlyCount: 0,
      missingSkillIds,
      readyCount: 0,
      requiredSkillIds: requiredApiSkillIds,
      reviewRequiredCount: 0,
      totalContracts: 0,
    },
  );

  return {
    boundary: text(
      "API / Skill Contracts are seeded/local and read-only in this MVP. The surface does not call live APIs, store secrets, execute wallet signatures, publish posts, verify tasks externally, export files, or write contract roots.",
      "API / Skill Contracts 在当前 MVP 中是 seeded/本地且只读。本界面不会调用实时 API、存储 secret、执行钱包签名、发布帖子、外部验证任务、导出文件或写入合约 root。",
    ),
    contracts,
    coverage: getApiSkillContractCoverage(contracts),
    summary,
  };
};
