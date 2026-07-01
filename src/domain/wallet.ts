import type {
  AelfWebLoginAdapterConfig,
  AelfWebLoginAdapterFallbackMode,
  AelfWebLoginAdapterFeatureGateState,
  AelfWebLoginAdapterLiveEvidenceStatus,
  AelfWebLoginAdapterReadiness,
  AelfWebLoginAdapterReadinessEntry,
  AelfWebLoginAdapterReadinessModel,
  AelfWebLoginAdapterReleaseImpact,
  AelfWebLoginAdapterSeededCoverageStatus,
  AccountType,
  AdapterWalletInfoCandidate,
  EligibilityWalletStatus,
  LocalizedText,
  LiveWalletConnectorDependencyRisk,
  LiveWalletConnectorEntry,
  LiveWalletConnectorFeatureGateState,
  LiveWalletConnectorId,
  LiveWalletConnectorLiveEvidenceStatus,
  LiveWalletConnectorOperation,
  LiveWalletConnectorReadiness,
  LiveWalletConnectorReleaseImpact,
  LiveWalletConnectorPackageCandidate,
  LiveWalletConnectorSummary,
  LiveWalletConnectorBoundary,
  NormalizedWalletSessionCandidate,
  NormalizedWalletSession,
  WalletAdapterFixture,
  WalletCompatibility,
  WalletCapability,
  WalletDiagnosticGroup,
  WalletDiagnosticGroupId,
  WalletDiagnosticItem,
  WalletDiagnosticState,
  WalletDiagnosticSummary,
  WalletPolicy,
  WalletProviderQaLiveEvidenceStatus,
  WalletProviderQaReadinessGate,
  WalletProviderQaReleaseImpact,
  WalletProviderQaScenario,
  WalletProviderQaScenarioId,
  WalletQaChecklistId,
  WalletQaChecklistItem,
  WalletSignatureStatus,
  WalletSource,
  WalletVerificationStatus,
} from "./types";

export const walletSourceLabels: Record<WalletSource, string> = {
  PORTKEY_AA: "Portkey",
  PORTKEY_EOA_APP: "Portkey App",
  PORTKEY_EOA_EXTENSION: "Extension",
  NIGHTELF: "NightElf",
  AGENT_SKILL: "Agent Skill",
  OTHER: "Other",
};

export const accountTypeLabels: Record<AccountType, string> = {
  AA: "AA",
  EOA: "EOA",
  UNKNOWN: "Unknown",
};

export const walletCompatibilityLabels: Record<WalletCompatibility, string> = {
  ANY: "AA + EOA",
  AA_ONLY: "AA only",
  EOA_ONLY: "EOA only",
};

export const walletVerificationLabels: Record<WalletVerificationStatus, LocalizedText> = {
  account_restricted: {
    "en-US": "Account type restricted",
    "zh-CN": "钱包类型受限",
    "zh-TW": "錢包類型受限",
  },
  address_only: {
    "en-US": "Address-only, wallet type unknown",
    "zh-CN": "仅地址，钱包类型未知",
    "zh-TW": "僅地址，錢包類型未知",
  },
  internal_agent: {
    "en-US": "Internal Agent Skill wallet",
    "zh-CN": "内部 Agent Skill 钱包",
    "zh-TW": "內部 Agent Skill 錢包",
  },
  missing_signature: {
    "en-US": "Missing verification signature",
    "zh-CN": "缺少验证签名",
    "zh-TW": "缺少驗證簽名",
  },
  unsupported_wallet: {
    "en-US": "Unsupported wallet",
    "zh-CN": "不支持的钱包",
    "zh-TW": "不支援的錢包",
  },
  verified: {
    "en-US": "Wallet type verified",
    "zh-CN": "钱包类型已验证",
    "zh-TW": "錢包類型已驗證",
  },
  wrong_chain: {
    "en-US": "Wrong chain or network",
    "zh-CN": "链或网络不匹配",
    "zh-TW": "鏈或網路不匹配",
  },
};

const walletNextActions: Record<WalletVerificationStatus, LocalizedText> = {
  account_restricted: {
    "en-US": "Use a wallet type accepted by this campaign policy.",
    "zh-CN": "请使用该活动策略允许的钱包类型。",
    "zh-TW": "請使用該活動策略允許的錢包類型。",
  },
  address_only: {
    "en-US": "Connect and sign a verification message before task verification.",
    "zh-CN": "请连接钱包并签署验证消息后再进行任务验证。",
    "zh-TW": "請連接錢包並簽署驗證訊息後再進行任務驗證。",
  },
  internal_agent: {
    "en-US": "Keep Agent Skill wallets for internal automation, not normal campaign users.",
    "zh-CN": "Agent Skill 钱包仅用于内部自动化，不推荐给普通活动用户。",
    "zh-TW": "Agent Skill 錢包僅用於內部自動化，不推薦給一般活動使用者。",
  },
  missing_signature: {
    "en-US": "Sign the seeded verification message to prove address ownership.",
    "zh-CN": "请签署 seeded 验证消息以证明地址归属。",
    "zh-TW": "請簽署 seeded 驗證訊息以證明地址歸屬。",
  },
  unsupported_wallet: {
    "en-US": "Choose Portkey AA, Portkey EOA, or NightElf for this campaign.",
    "zh-CN": "请为该活动选择 Portkey AA、Portkey EOA 或 NightElf。",
    "zh-TW": "請為該活動選擇 Portkey AA、Portkey EOA 或 NightElf。",
  },
  verified: {
    "en-US": "Wallet type is verified for this seeded campaign preview.",
    "zh-CN": "该 seeded 活动预览中的钱包类型已验证。",
    "zh-TW": "該 seeded 活動預覽中的錢包類型已驗證。",
  },
  wrong_chain: {
    "en-US": "Switch to AELF mainnet to continue.",
    "zh-CN": "请切换到 AELF mainnet 后继续。",
    "zh-TW": "請切換到 AELF mainnet 後繼續。",
  },
};

const text = (enUS: string, zhCN: string, zhTW: string = zhCN): LocalizedText => ({
  "en-US": enUS,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
});

const walletDiagnosticsBoundary = text(
  "Seeded diagnostics only; no live wallet SDK connection, signature request, transaction, or contract call is executed.",
  "仅 seeded 诊断；不会执行实时钱包 SDK 连接、签名请求、交易或合约调用。",
  "僅 seeded 診斷；不會執行即時錢包 SDK 連接、簽名請求、交易或合約呼叫。",
);

export const aelfWebLoginAdapterBoundary = text(
  "aelf-web-login adapter readiness preview only; no live wallet SDK connection, private key, seed phrase, signing prompt, transaction, contract call, reward custody, or reward distribution is requested.",
  "仅 aelf-web-login adapter readiness 预览；不会连接实时钱包 SDK，不会请求私钥、助记词、签名提示、交易、合约调用、奖励托管或奖励发放。",
  "僅 aelf-web-login adapter readiness 預覽；不會連接即時錢包 SDK，不會請求私鑰、助記詞、簽名提示、交易、合約呼叫、獎勵託管或獎勵發放。",
);

const aelfWebLoginAdapterNextAction = text(
  "Attach live adapter QA evidence and approve feature gates before treating any wallet path as production-ready.",
  "在将任何钱包路径视为生产就绪前，先附上真实 adapter QA 证据并批准功能门禁。",
  "在將任何錢包路徑視為生產就緒前，先附上真實 adapter QA 證據並批准功能門禁。",
);

export const walletProviderQaBoundary = text(
  "Readiness gate only; no live wallet SDK connection, real signature, transaction, contract call, reward custody, or reward distribution is executed.",
  "仅准备度门禁；不会执行实时钱包 SDK 连接、真实签名、交易、合约调用、奖励托管或奖励发放。",
  "僅準備度門禁；不會執行即時錢包 SDK 連接、真實簽名、交易、合約呼叫、獎勵託管或獎勵發放。",
);

const groupCopy: Record<WalletDiagnosticGroupId, { description: LocalizedText; title: LocalizedText }> = {
  "address-only": {
    description: text(
      "Address-only input cannot prove wallet type until the user connects and signs.",
      "仅地址输入在用户连接并签名前无法证明钱包类型。",
      "僅地址輸入在使用者連接並簽名前無法證明錢包類型。",
    ),
    title: text("Address-only review", "仅地址审核", "僅地址審核"),
  },
  "connection-issues": {
    description: text(
      "Seeded blocker and warning states that must show safe recovery actions.",
      "必须展示安全恢复动作的 seeded 阻断与警告状态。",
      "必須展示安全恢復動作的 seeded 阻斷與警告狀態。",
    ),
    title: text("Connection issue coverage", "连接问题覆盖", "連接問題覆蓋"),
  },
  "internal-agent": {
    description: text(
      "Internal automation wallets are visible for operators and not recommended to normal users.",
      "内部自动化钱包仅供运营查看，不推荐给普通用户。",
      "內部自動化錢包僅供營運查看，不推薦給一般使用者。",
    ),
    title: text("Internal agent path", "内部 Agent 路径", "內部 Agent 路徑"),
  },
  "recommended-aa": {
    description: text(
      "Recommended normal-user path for smooth onboarding; EOA remains supported.",
      "面向普通用户的推荐路径，便于顺滑入门；EOA 仍然受支持。",
      "面向一般使用者的推薦路徑，便於順利入門；EOA 仍然受支援。",
    ),
    title: text("Recommended AA path", "推荐 AA 路径", "推薦 AA 路徑"),
  },
  "supported-eoa": {
    description: text(
      "Existing aelf users can continue with EOA app, extension, or NightElf wallets.",
      "已有 aelf 用户可继续使用 EOA App、插件或 NightElf 钱包。",
      "既有 aelf 使用者可繼續使用 EOA App、擴充套件或 NightElf 錢包。",
    ),
    title: text("Supported EOA paths", "受支持的 EOA 路径", "受支援的 EOA 路徑"),
  },
};

const qaLabels: Record<WalletQaChecklistId, LocalizedText> = {
  "account-policy-restriction": text("Account policy restriction", "账户策略限制", "帳戶策略限制"),
  "eoa-extension-connect": text("EOA extension connect", "EOA 插件连接", "EOA 擴充套件連接"),
  "missing-signature": text("Missing signature recovery", "缺少签名恢复", "缺少簽名恢復"),
  "portkey-aa-connect": text("Portkey AA connect", "Portkey AA 连接", "Portkey AA 連接"),
  "unsupported-wallet-error": text("Unsupported wallet error", "不支持钱包错误", "不支援錢包錯誤"),
  "wrong-chain-error": text("Wrong-chain error", "错误链错误", "錯誤鏈錯誤"),
};

const providerQaLabels: Record<WalletProviderQaScenarioId, LocalizedText> = {
  "eoa-extension-connect": text("EOA extension connect", "EOA 插件连接", "EOA 擴充套件連接"),
  "portkey-aa-connect": text("Portkey AA connect", "Portkey AA 连接", "Portkey AA 連接"),
  "unsupported-wallet-error": text("Unsupported wallet recovery", "不支持钱包恢复", "不支援錢包恢復"),
  "wrong-chain-error": text("Wrong-chain recovery", "错误链恢复", "錯誤鏈恢復"),
};

const providerQaSeededEvidence: Record<
  WalletProviderQaScenarioId,
  { missing: LocalizedText; ready: LocalizedText }
> = {
  "eoa-extension-connect": {
    missing: text(
      "No seeded EOA extension session is available.",
      "缺少 seeded EOA 插件会话。",
      "缺少 seeded EOA 擴充套件會話。",
    ),
    ready: text(
      "Seeded EOA extension session covers the existing-user connect path.",
      "Seeded EOA 插件会话覆盖已有用户连接路径。",
      "Seeded EOA 擴充套件會話覆蓋既有使用者連接路徑。",
    ),
  },
  "portkey-aa-connect": {
    missing: text(
      "No seeded Portkey AA session is available.",
      "缺少 seeded Portkey AA 会话。",
      "缺少 seeded Portkey AA 會話。",
    ),
    ready: text(
      "Seeded Portkey AA session covers the recommended AA connect path.",
      "Seeded Portkey AA 会话覆盖推荐 AA 连接路径。",
      "Seeded Portkey AA 會話覆蓋推薦 AA 連接路徑。",
    ),
  },
  "unsupported-wallet-error": {
    missing: text(
      "No seeded unsupported-wallet recovery session is available.",
      "缺少 seeded 不支持钱包恢复会话。",
      "缺少 seeded 不支援錢包恢復會話。",
    ),
    ready: text(
      "Seeded unsupported-wallet session keeps unsupported providers out of normal participation.",
      "Seeded 不支持钱包会话阻止不支持 provider 进入普通参与流程。",
      "Seeded 不支援錢包會話阻止不支援 provider 進入一般參與流程。",
    ),
  },
  "wrong-chain-error": {
    missing: text(
      "No seeded wrong-chain recovery session is available.",
      "缺少 seeded 错误链恢复会话。",
      "缺少 seeded 錯誤鏈恢復會話。",
    ),
    ready: text(
      "Seeded wrong-chain session shows the AELF mainnet recovery message.",
      "Seeded 错误链会话展示 AELF mainnet 恢复提示。",
      "Seeded 錯誤鏈會話展示 AELF mainnet 恢復提示。",
    ),
  },
};

const providerQaLiveMissingEvidence: Record<WalletProviderQaScenarioId, LocalizedText> = {
  "eoa-extension-connect": text(
    "Live EOA browser-extension evidence is not attached yet.",
    "尚未附上真实 EOA 浏览器插件证据。",
    "尚未附上真實 EOA 瀏覽器擴充套件證據。",
  ),
  "portkey-aa-connect": text(
    "Live Portkey AA provider evidence is not attached yet.",
    "尚未附上真实 Portkey AA provider 证据。",
    "尚未附上真實 Portkey AA provider 證據。",
  ),
  "unsupported-wallet-error": text(
    "Live unsupported-wallet provider fallback evidence is not attached yet.",
    "尚未附上真实不支持钱包 provider fallback 证据。",
    "尚未附上真實不支援錢包 provider fallback 證據。",
  ),
  "wrong-chain-error": text(
    "Live wrong-chain recovery evidence is not attached yet.",
    "尚未附上真实错误链恢复证据。",
    "尚未附上真實錯誤鏈恢復證據。",
  ),
};

const providerQaLiveReadyEvidence: Record<WalletProviderQaScenarioId, LocalizedText> = {
  "eoa-extension-connect": text(
    "Live EOA browser-extension evidence has been reviewed.",
    "真实 EOA 浏览器插件证据已审核。",
    "真實 EOA 瀏覽器擴充套件證據已審核。",
  ),
  "portkey-aa-connect": text(
    "Live Portkey AA provider evidence has been reviewed.",
    "真实 Portkey AA provider 证据已审核。",
    "真實 Portkey AA provider 證據已審核。",
  ),
  "unsupported-wallet-error": text(
    "Live unsupported-wallet provider fallback evidence has been reviewed.",
    "真实不支持钱包 provider fallback 证据已审核。",
    "真實不支援錢包 provider fallback 證據已審核。",
  ),
  "wrong-chain-error": text(
    "Live wrong-chain recovery evidence has been reviewed.",
    "真实错误链恢复证据已审核。",
    "真實錯誤鏈恢復證據已審核。",
  ),
};

const providerQaNextActions: Record<WalletProviderQaScenarioId, LocalizedText> = {
  "eoa-extension-connect": text(
    "Attach Chrome extension connect and disconnect evidence before release approval.",
    "发布批准前附上 Chrome 插件连接与断开证据。",
    "發布批准前附上 Chrome 擴充套件連接與斷開證據。",
  ),
  "portkey-aa-connect": text(
    "Attach live Portkey AA connect evidence before release approval.",
    "发布批准前附上真实 Portkey AA 连接证据。",
    "發布批准前附上真實 Portkey AA 連接證據。",
  ),
  "unsupported-wallet-error": text(
    "Attach live unsupported-provider fallback evidence before release approval.",
    "发布批准前附上真实不支持 provider fallback 证据。",
    "發布批准前附上真實不支援 provider fallback 證據。",
  ),
  "wrong-chain-error": text(
    "Attach live wrong-chain switch/recovery evidence before release approval.",
    "发布批准前附上真实错误链切换/恢复证据。",
    "發布批准前附上真實錯誤鏈切換/恢復證據。",
  ),
};

const qaEvidenceText = (
  ready: boolean,
  readyText: string,
  missingText: string,
  readyTextZh: string,
  missingTextZh: string,
  readyTextZhTw: string,
  missingTextZhTw: string,
): LocalizedText =>
  text(
    ready ? readyText : missingText,
    ready ? readyTextZh : missingTextZh,
    ready ? readyTextZhTw : missingTextZhTw,
  );

export const getWalletBadgeLabel = (accountType: AccountType, walletSource: WalletSource) =>
  `${accountTypeLabels[accountType]} · ${walletSourceLabels[walletSource]}`;

export const getWalletCompatibilityLabel = (compatibility: WalletCompatibility) =>
  walletCompatibilityLabels[compatibility];

export const isWalletCompatible = (
  compatibility: WalletCompatibility,
  accountType: AccountType,
) => {
  if (compatibility === "ANY") {
    return accountType === "AA" || accountType === "EOA";
  }

  if (compatibility === "AA_ONLY") {
    return accountType === "AA";
  }

  return accountType === "EOA";
};

const expectedChainId = "AELF";
const expectedNetwork = "mainnet";

const featureGateMessage = (
  adapterLabel: LocalizedText,
  state: AelfWebLoginAdapterFeatureGateState,
): LocalizedText => {
  const readableState = state.replace(/_/g, " ");

  return text(
    `${adapterLabel["en-US"]} adapter gate is ${readableState} and degrades without live wallet SDK calls.`,
    `${adapterLabel["zh-CN"]} adapter 门禁当前为 ${readableState}，会在不调用实时钱包 SDK 的情况下优雅降级。`,
    `${adapterLabel["zh-TW"]} adapter 門禁目前為 ${readableState}，會在不呼叫即時錢包 SDK 的情況下優雅降級。`,
  );
};

const createAdapterFeatureGate = (
  configKey: string,
  state: AelfWebLoginAdapterFeatureGateState,
  label: LocalizedText,
): AelfWebLoginAdapterConfig["featureGate"] => ({
  configKey,
  degradesGracefully: true,
  operatorMessage: featureGateMessage(label, state),
  state,
});

export const aelfWebLoginAdapterConfigs: AelfWebLoginAdapterConfig[] = [
  {
    accountType: "AA",
    adapterName: "PortkeyAAWallet",
    audience: "NORMAL_USER",
    capabilities: ["SIGN_MESSAGE", "VIEW_BALANCE", "CONTRACT_VIEW", "EBRIDGE"],
    chainId: expectedChainId,
    displayName: text("Portkey AA", "Portkey AA", "Portkey AA"),
    featureGate: createAdapterFeatureGate(
      "wallet.adapters.portkeyAa.enabled",
      "enabled_preview",
      text("Portkey AA", "Portkey AA", "Portkey AA"),
    ),
    id: "portkey-aa",
    integrationId: "aelf-web-login",
    network: expectedNetwork,
    recommended: true,
    walletSource: "PORTKEY_AA",
  },
  {
    accountType: "EOA",
    adapterName: "PortkeyDiscoverWallet",
    audience: "EXISTING_USER",
    capabilities: ["SIGN_MESSAGE", "SEND_TRANSACTION", "CONTRACT_VIEW", "EBRIDGE"],
    chainId: expectedChainId,
    displayName: text(
      "Portkey EOA App / Discover",
      "Portkey EOA App / Discover",
      "Portkey EOA App / Discover",
    ),
    featureGate: createAdapterFeatureGate(
      "wallet.adapters.portkeyDiscover.enabled",
      "enabled_preview",
      text("Portkey EOA App / Discover", "Portkey EOA App / Discover", "Portkey EOA App / Discover"),
    ),
    id: "portkey-eoa-app",
    integrationId: "aelf-web-login",
    network: expectedNetwork,
    recommended: false,
    walletSource: "PORTKEY_EOA_APP",
  },
  {
    accountType: "EOA",
    adapterName: "PortkeyExtensionWallet",
    audience: "EXISTING_USER",
    capabilities: ["SIGN_MESSAGE", "SEND_TRANSACTION", "CONTRACT_VIEW", "EBRIDGE"],
    chainId: expectedChainId,
    displayName: text("Portkey EOA Extension", "Portkey EOA Extension", "Portkey EOA Extension"),
    featureGate: createAdapterFeatureGate(
      "wallet.adapters.portkeyExtension.enabled",
      "enabled_preview",
      text("Portkey EOA Extension", "Portkey EOA Extension", "Portkey EOA Extension"),
    ),
    id: "portkey-eoa-extension",
    integrationId: "aelf-web-login",
    network: expectedNetwork,
    recommended: false,
    walletSource: "PORTKEY_EOA_EXTENSION",
  },
  {
    accountType: "EOA",
    adapterName: "NightElfWallet",
    audience: "EXISTING_USER",
    capabilities: ["SIGN_MESSAGE", "CONTRACT_VIEW"],
    chainId: expectedChainId,
    displayName: text("NightElf", "NightElf", "NightElf"),
    featureGate: createAdapterFeatureGate(
      "wallet.adapters.nightElf.enabled",
      "enabled_preview",
      text("NightElf", "NightElf", "NightElf"),
    ),
    id: "nightelf",
    integrationId: "aelf-web-login",
    network: expectedNetwork,
    recommended: false,
    walletSource: "NIGHTELF",
  },
  {
    accountType: "EOA",
    adapterName: "FutureEOAWallet",
    audience: "FUTURE_USER",
    capabilities: ["SIGN_MESSAGE", "VIEW_BALANCE"],
    chainId: expectedChainId,
    displayName: text("Future EOA adapter", "未来 EOA adapter", "未來 EOA adapter"),
    featureGate: createAdapterFeatureGate(
      "wallet.adapters.futureEoa.maintenance",
      "maintenance",
      text("Future EOA adapter", "未来 EOA adapter", "未來 EOA adapter"),
    ),
    id: "future-eoa-adapter",
    integrationId: "aelf-web-login",
    network: expectedNetwork,
    recommended: false,
    walletSource: "OTHER",
  },
  {
    accountType: "EOA",
    adapterName: "PortkeyAgentSkill",
    audience: "INTERNAL_AGENT",
    capabilities: ["CONTRACT_VIEW", "CONTRACT_SEND", "INTERNAL_AUTOMATION"],
    chainId: expectedChainId,
    displayName: text("Agent Skill wallet", "Agent Skill 钱包", "Agent Skill 錢包"),
    featureGate: createAdapterFeatureGate(
      "wallet.adapters.agentSkill.internalOnly",
      "disabled",
      text("Agent Skill wallet", "Agent Skill 钱包", "Agent Skill 錢包"),
    ),
    id: "agent-skill-internal",
    integrationId: "aelf-web-login",
    network: expectedNetwork,
    recommended: false,
    walletSource: "AGENT_SKILL",
  },
];

const isSessionSeededReadyForAdapter = (
  config: AelfWebLoginAdapterConfig,
  session: NormalizedWalletSession,
) =>
  session.walletSource === config.walletSource &&
  session.accountType === config.accountType &&
  session.chainId === config.chainId &&
  session.network === config.network &&
  session.verificationStatus !== "address_only" &&
  session.verificationStatus !== "unsupported_wallet" &&
  session.verificationStatus !== "wrong_chain";

const seededCoverageFor = (
  config: AelfWebLoginAdapterConfig,
  matchedSessionIds: string[],
): AelfWebLoginAdapterSeededCoverageStatus => {
  if (config.audience === "FUTURE_USER") {
    return "missing";
  }

  return matchedSessionIds.length > 0 ? "ready" : "missing";
};

const readinessFor = (
  state: AelfWebLoginAdapterFeatureGateState,
  seededCoverageStatus: AelfWebLoginAdapterSeededCoverageStatus,
  liveEvidenceStatus: AelfWebLoginAdapterLiveEvidenceStatus,
): AelfWebLoginAdapterReadiness => {
  if (liveEvidenceStatus === "blocked" || state === "blocked") {
    return "blocked";
  }

  if (state === "maintenance") {
    return "maintenance";
  }

  if (state === "unavailable") {
    return "unavailable";
  }

  if (state === "disabled") {
    return seededCoverageStatus === "ready" ? "review_required" : "unavailable";
  }

  if (liveEvidenceStatus === "ready") {
    return "ready";
  }

  return seededCoverageStatus === "ready" ? "local_only" : "review_required";
};

const releaseImpactFor = (
  readiness: AelfWebLoginAdapterReadiness,
  liveEvidenceStatus: AelfWebLoginAdapterLiveEvidenceStatus,
): AelfWebLoginAdapterReleaseImpact => {
  if (readiness === "ready" && liveEvidenceStatus === "ready") {
    return "ready";
  }

  if (readiness === "blocked") {
    return "release_blocker";
  }

  if (readiness === "maintenance") {
    return "maintenance";
  }

  if (readiness === "unavailable") {
    return "informational";
  }

  return "needs_review";
};

const fallbackModeFor = (readiness: AelfWebLoginAdapterReadiness): AelfWebLoginAdapterFallbackMode => {
  if (readiness === "ready") {
    return "none";
  }

  if (readiness === "local_only") {
    return "local_seeded";
  }

  if (readiness === "maintenance") {
    return "maintenance";
  }

  if (readiness === "review_required") {
    return "manual_review";
  }

  if (readiness === "blocked") {
    return "blocked";
  }

  return "unavailable";
};

const fallbackReasonFor = (
  config: AelfWebLoginAdapterConfig,
  mode: AelfWebLoginAdapterFallbackMode,
): LocalizedText => {
  const name = config.displayName;
  const reasons: Record<AelfWebLoginAdapterFallbackMode, LocalizedText> = {
    blocked: text(
      `${name["en-US"]} is blocked until live adapter QA and launch approval are attached.`,
      `${name["zh-CN"]} 在附上真实 adapter QA 与上线批准前保持阻断。`,
      `${name["zh-TW"]} 在附上真實 adapter QA 與上線批准前保持阻斷。`,
    ),
    disabled: text(
      `${name["en-US"]} is disabled by feature gate.`,
      `${name["zh-CN"]} 已被功能门禁关闭。`,
      `${name["zh-TW"]} 已被功能門禁關閉。`,
    ),
    local_seeded: text(
      `${name["en-US"]} has seeded coverage but no live adapter evidence yet.`,
      `${name["zh-CN"]} 已有 seeded 覆盖，但尚无真实 adapter 证据。`,
      `${name["zh-TW"]} 已有 seeded 覆蓋，但尚無真實 adapter 證據。`,
    ),
    maintenance: text(
      `${name["en-US"]} is maintenance-only in this readiness preview.`,
      `${name["zh-CN"]} 在本 readiness 预览中处于维护状态。`,
      `${name["zh-TW"]} 在本 readiness 預覽中處於維護狀態。`,
    ),
    manual_review: text(
      `${name["en-US"]} requires live evidence or operator review before release.`,
      `${name["zh-CN"]} 发布前需要真实证据或运营审核。`,
      `${name["zh-TW"]} 發布前需要真實證據或營運審核。`,
    ),
    none: text(
      `${name["en-US"]} has live evidence attached for this readiness preview.`,
      `${name["zh-CN"]} 在本 readiness 预览中已有真实证据。`,
      `${name["zh-TW"]} 在本 readiness 預覽中已有真實證據。`,
    ),
    unavailable: text(
      `${name["en-US"]} is unavailable to normal users until the adapter is configured and approved.`,
      `${name["zh-CN"]} 在 adapter 配置并批准前，普通用户不可用。`,
      `${name["zh-TW"]} 在 adapter 配置並批准前，一般使用者不可用。`,
    ),
  };

  return reasons[mode];
};

const nextActionForAdapter = (
  config: AelfWebLoginAdapterConfig,
  readiness: AelfWebLoginAdapterReadiness,
): LocalizedText => {
  const name = config.displayName;

  if (config.audience === "INTERNAL_AGENT") {
    return text(
      "Keep Agent Skill wallets for internal automation and out of normal Web wallet recommendations.",
      "Agent Skill 钱包仅保留给内部自动化，不进入普通 Web 钱包推荐。",
      "Agent Skill 錢包僅保留給內部自動化，不進入一般 Web 錢包推薦。",
    );
  }

  if (readiness === "ready") {
    return text(
      `Keep ${name["en-US"]} available and continue monitoring live adapter evidence.`,
      `保持 ${name["zh-CN"]} 可用，并继续监控真实 adapter 证据。`,
      `保持 ${name["zh-TW"]} 可用，並繼續監控真實 adapter 證據。`,
    );
  }

  if (readiness === "maintenance") {
    return text(
      `Show ${name["en-US"]} as maintenance and route users to available AA or EOA options.`,
      `将 ${name["zh-CN"]} 显示为维护中，并引导用户选择可用的 AA 或 EOA 选项。`,
      `將 ${name["zh-TW"]} 顯示為維護中，並引導使用者選擇可用的 AA 或 EOA 選項。`,
    );
  }

  if (readiness === "blocked") {
    return text(
      `Resolve blocker and attach live QA before enabling ${name["en-US"]}.`,
      `解决阻断并附上真实 QA 后再启用 ${name["zh-CN"]}。`,
      `解決阻斷並附上真實 QA 後再啟用 ${name["zh-TW"]}。`,
    );
  }

  return text(
    `Attach live adapter evidence before treating ${name["en-US"]} as production-ready.`,
    `在将 ${name["zh-CN"]} 视为生产就绪前，先附上真实 adapter 证据。`,
    `在將 ${name["zh-TW"]} 視為生產就緒前，先附上真實 adapter 證據。`,
  );
};

const evidenceRequiredFor = (config: AelfWebLoginAdapterConfig): LocalizedText => {
  const name = config.displayName;

  return text(
    `Chrome live adapter connect, disconnect, wrong-chain, and fallback evidence required for ${name["en-US"]}.`,
    `${name["zh-CN"]} 需要 Chrome 真实 adapter 连接、断开、错误链与 fallback 证据。`,
    `${name["zh-TW"]} 需要 Chrome 真實 adapter 連接、斷開、錯誤鏈與 fallback 證據。`,
  );
};

const createAdapterEntry = (
  config: AelfWebLoginAdapterConfig,
  sessions: NormalizedWalletSession[],
  liveEvidenceStatus: AelfWebLoginAdapterLiveEvidenceStatus,
): AelfWebLoginAdapterReadinessEntry => {
  const matchedSessionIds = sessions
    .filter((session) => isSessionSeededReadyForAdapter(config, session))
    .map((session) => session.sessionId);
  const seededCoverageStatus = seededCoverageFor(config, matchedSessionIds);
  const readiness = readinessFor(config.featureGate.state, seededCoverageStatus, liveEvidenceStatus);
  const fallbackMode = fallbackModeFor(readiness);
  const nextAction = nextActionForAdapter(config, readiness);

  return {
    ...config,
    adapterId: config.id,
    evidenceRequired: evidenceRequiredFor(config),
    fallback: {
      blocksLaunch: readiness === "blocked",
      mode: fallbackMode,
      nextAction,
      reason: fallbackReasonFor(config, fallbackMode),
    },
    liveEvidenceStatus,
    matchedSessionIds,
    nextAction,
    readiness,
    releaseImpact: releaseImpactFor(readiness, liveEvidenceStatus),
    securityBoundary: aelfWebLoginAdapterBoundary,
    seededCoverageStatus,
  };
};

const summarizeAdapterReadiness = (
  entries: AelfWebLoginAdapterReadinessEntry[],
): AelfWebLoginAdapterReadinessModel["summary"] => ({
  blockedAdapters: entries.filter((entry) => entry.readiness === "blocked").length,
  configuredAdapters: entries.length,
  disabledAdapters: entries.filter((entry) => entry.featureGate.state === "disabled").length,
  enabledPreviewAdapters: entries.filter((entry) => entry.featureGate.state === "enabled_preview").length,
  internalOnlyAdapters: entries.filter((entry) => entry.audience === "INTERNAL_AGENT").length,
  liveEvidenceReadyAdapters: entries.filter((entry) => entry.liveEvidenceStatus === "ready").length,
  maintenanceAdapters: entries.filter((entry) => entry.featureGate.state === "maintenance").length,
  missingLiveEvidenceAdapters: entries.filter((entry) => entry.liveEvidenceStatus === "missing").length,
  publicUserAdapters: entries.filter((entry) => entry.audience !== "INTERNAL_AGENT").length,
  recommendedAdapterId:
    entries.find((entry) => entry.recommended && entry.audience !== "INTERNAL_AGENT")?.adapterId ?? "",
  releaseBlockers: entries.filter((entry) => entry.fallback.blocksLaunch).length,
  seededReadyAdapters: entries.filter((entry) => entry.seededCoverageStatus === "ready").length,
  totalAdapters: entries.length,
  unavailableAdapters: entries.filter((entry) => entry.readiness === "unavailable").length,
});

export const createAelfWebLoginAdapterReadiness = (
  sessions: NormalizedWalletSession[],
  liveEvidence: Partial<Record<string, AelfWebLoginAdapterLiveEvidenceStatus>> = {},
): AelfWebLoginAdapterReadinessModel => {
  const entries = aelfWebLoginAdapterConfigs.map((config) =>
    createAdapterEntry(
      config,
      sessions,
      liveEvidence[config.id] ?? (config.audience === "INTERNAL_AGENT" ? "not_applicable" : "missing"),
    ),
  );

  return {
    boundary: aelfWebLoginAdapterBoundary,
    entries,
    integrationId: "aelf-web-login",
    internalEntries: entries.filter((entry) => entry.audience === "INTERNAL_AGENT"),
    nextAction: aelfWebLoginAdapterNextAction,
    normalUserEntries: entries.filter((entry) => entry.audience !== "INTERNAL_AGENT"),
    summary: summarizeAdapterReadiness(entries),
  };
};

const liveWalletConnectorBoundary = text(
  "Live wallet connector execution is disabled by default; no live wallet SDK connection, signature prompt, transaction, contract call, reward custody, reward distribution, backend persistence, export generation, analytics ingestion, or AI provider call is executed.",
  "Live wallet connector 默认关闭；不会执行实时钱包 SDK 连接、签名提示、交易、合约调用、奖励托管、奖励发放、后端持久化、导出生成、analytics ingestion 或 AI provider 调用。",
  "Live wallet connector 預設關閉；不會執行即時錢包 SDK 連接、簽名提示、交易、合約呼叫、獎勵託管、獎勵發放、後端持久化、匯出生成、analytics ingestion 或 AI provider 呼叫。",
);

const liveWalletConnectorNextAction = text(
  "Enable a connector only after configuration, Chrome live QA evidence, dependency review, and release approval are attached in a later live integration mission.",
  "只有在后续 live integration mission 中附上配置、Chrome 真实 QA 证据、依赖审核与发布批准后，才启用 connector。",
  "只有在後續 live integration mission 中附上配置、Chrome 真實 QA 證據、依賴審核與發布批准後，才啟用 connector。",
);

const liveConnectorPackageVersionSource = text(
  "Candidate package metadata only: aelf-web-login@2.1.9 and @aelf-web-login/wallet-adapter-* @0.4.0-alpha.21 were reviewed on 2026-07-01, but are not mandatory runtime dependencies in this mission.",
  "仅候选 package metadata：2026-07-01 已审阅 aelf-web-login@2.1.9 与 @aelf-web-login/wallet-adapter-* @0.4.0-alpha.21，但本 mission 不把它们作为强制 runtime dependency。",
  "僅候選 package metadata：2026-07-01 已審閱 aelf-web-login@2.1.9 與 @aelf-web-login/wallet-adapter-* @0.4.0-alpha.21，但本 mission 不把它們作為強制 runtime dependency。",
);

const liveConnectorPackageCandidates: LiveWalletConnectorPackageCandidate[] = [
  {
    dependencyRisk: "high",
    packageName: "aelf-web-login",
    packageVersionSource: "candidate:2.1.9",
    role: text(
      "Legacy broad wallet login package; candidate metadata only.",
      "旧版宽口径 wallet login package；仅作为候选 metadata。",
      "舊版寬口徑 wallet login package；僅作為候選 metadata。",
    ),
  },
  {
    dependencyRisk: "medium",
    packageName: "@aelf-web-login/wallet-adapter-base",
    packageVersionSource: "candidate:0.4.0-alpha.21",
    role: text(
      "Base adapter type surface for future wallet-info mapping.",
      "未来 wallet-info mapping 的 base adapter 类型面。",
      "未來 wallet-info mapping 的 base adapter 類型面。",
    ),
  },
  {
    dependencyRisk: "high",
    packageName: "@aelf-web-login/wallet-adapter-react",
    packageVersionSource: "candidate:0.4.0-alpha.21",
    role: text(
      "React modal/hook candidate that exposes connect, signature, transaction, and contract operations; blocked in this mission.",
      "React modal/hook 候选包会暴露 connect、signature、transaction 与 contract 操作；本 mission 阻断。",
      "React modal/hook 候選包會暴露 connect、signature、transaction 與 contract 操作；本 mission 阻斷。",
    ),
  },
];

const liveConnectorForbiddenOperationNames = [
  "connectWallet",
  "getSignature",
  "callSendMethod",
  "callViewMethod",
  "sendMultiTransaction",
  "requestAccounts",
  "switchChain",
  "sendTransaction",
  "contractView",
  "contractSend",
] as const;

const liveConnectorForbiddenOperations: LiveWalletConnectorOperation[] = liveConnectorForbiddenOperationNames.map((name) => ({
  name,
  reason: text(
    `${name} is blocked until a later live wallet integration mission adds QA evidence and review approval.`,
    `${name} 在后续 live wallet integration mission 附上 QA 证据与审核批准前保持阻断。`,
    `${name} 在後續 live wallet integration mission 附上 QA 證據與審核批准前保持阻斷。`,
  ),
  state: "blocked",
}));

interface LiveConnectorConfig {
  adapterId: string;
  capabilities: WalletCapability[];
  connectorId: LiveWalletConnectorId;
  dependencyRisk: LiveWalletConnectorDependencyRisk;
  displayName: LocalizedText;
  packageName: string;
  packageVersionSource: string;
  accountType: AccountType;
  walletSource: WalletSource;
}

const liveConnectorConfigs: LiveConnectorConfig[] = [
  {
    accountType: "AA",
    adapterId: "portkey-aa",
    capabilities: ["SIGN_MESSAGE", "VIEW_BALANCE", "CONTRACT_VIEW", "EBRIDGE"],
    connectorId: "portkey-aa-live",
    dependencyRisk: "high",
    displayName: text("Portkey AA live connector", "Portkey AA live connector", "Portkey AA live connector"),
    packageName: "@aelf-web-login/wallet-adapter-portkey-aa",
    packageVersionSource: "candidate:0.4.0-alpha.21",
    walletSource: "PORTKEY_AA",
  },
  {
    accountType: "EOA",
    adapterId: "portkey-eoa-app",
    capabilities: ["SIGN_MESSAGE", "SEND_TRANSACTION", "CONTRACT_VIEW", "EBRIDGE"],
    connectorId: "portkey-discover-eoa-live",
    dependencyRisk: "high",
    displayName: text(
      "Portkey Discover EOA live connector",
      "Portkey Discover EOA live connector",
      "Portkey Discover EOA live connector",
    ),
    packageName: "@aelf-web-login/wallet-adapter-portkey-discover",
    packageVersionSource: "candidate:0.4.0-alpha.21",
    walletSource: "PORTKEY_EOA_APP",
  },
  {
    accountType: "EOA",
    adapterId: "portkey-eoa-extension",
    capabilities: ["SIGN_MESSAGE", "SEND_TRANSACTION", "CONTRACT_VIEW", "EBRIDGE"],
    connectorId: "portkey-eoa-extension-live",
    dependencyRisk: "high",
    displayName: text(
      "Portkey EOA extension live connector",
      "Portkey EOA extension live connector",
      "Portkey EOA extension live connector",
    ),
    packageName: "@aelf-web-login/wallet-adapter-portkey-extension",
    packageVersionSource: "candidate:0.4.0-alpha.21",
    walletSource: "PORTKEY_EOA_EXTENSION",
  },
  {
    accountType: "EOA",
    adapterId: "nightelf",
    capabilities: ["SIGN_MESSAGE", "CONTRACT_VIEW"],
    connectorId: "nightelf-live",
    dependencyRisk: "medium",
    displayName: text("NightElf live connector", "NightElf live connector", "NightElf live connector"),
    packageName: "@aelf-web-login/wallet-adapter-night-elf",
    packageVersionSource: "candidate:0.4.0-alpha.21",
    walletSource: "NIGHTELF",
  },
];

const liveConnectorReadinessFor = (
  featureGateState: LiveWalletConnectorFeatureGateState,
  liveEvidenceStatus: LiveWalletConnectorLiveEvidenceStatus,
  reviewApproved: boolean,
): LiveWalletConnectorReadiness => {
  if (featureGateState === "blocked" || liveEvidenceStatus === "blocked") {
    return "blocked";
  }

  if (
    featureGateState === "approved" &&
    liveEvidenceStatus === "ready" &&
    reviewApproved
  ) {
    return "approved";
  }

  if (featureGateState === "disabled") {
    return "disabled";
  }

  return "review_required";
};

const liveConnectorReleaseImpactFor = (
  readiness: LiveWalletConnectorReadiness,
): LiveWalletConnectorReleaseImpact => {
  if (readiness === "approved") {
    return "future_ready";
  }

  if (readiness === "blocked") {
    return "release_blocker";
  }

  return readiness === "disabled" ? "needs_review" : "needs_review";
};

const liveConnectorFallbackFor = (
  displayName: LocalizedText,
  readiness: LiveWalletConnectorReadiness,
  liveEvidenceStatus: LiveWalletConnectorLiveEvidenceStatus,
) => {
  if (readiness === "blocked") {
    return {
      blocksLaunch: true,
      nextAction: text(
        `Resolve live QA or feature-gate blocker before enabling ${displayName["en-US"]}.`,
        `解决 live QA 或 feature-gate 阻断后再启用 ${displayName["zh-CN"]}。`,
        `解決 live QA 或 feature-gate 阻斷後再啟用 ${displayName["zh-TW"]}。`,
      ),
      reason: text(
        `${displayName["en-US"]} is blocked for release review.`,
        `${displayName["zh-CN"]} 当前被 release review 阻断。`,
        `${displayName["zh-TW"]} 目前被 release review 阻斷。`,
      ),
    };
  }

  if (readiness === "approved") {
    return {
      blocksLaunch: false,
      nextAction: text(
        `Keep ${displayName["en-US"]} staged for a later live execution mission.`,
        `保持 ${displayName["zh-CN"]} 等待后续 live execution mission。`,
        `保持 ${displayName["zh-TW"]} 等待後續 live execution mission。`,
      ),
      reason: text(
        `${displayName["en-US"]} has gate approval and live evidence metadata, but execution remains out of scope here.`,
        `${displayName["zh-CN"]} 已有 gate approval 与 live evidence metadata，但本 mission 仍不执行连接。`,
        `${displayName["zh-TW"]} 已有 gate approval 與 live evidence metadata，但本 mission 仍不執行連接。`,
      ),
    };
  }

  return {
    blocksLaunch: false,
    nextAction: liveWalletConnectorNextAction,
    reason: liveEvidenceStatus === "missing"
      ? text(
          `${displayName["en-US"]} is disabled or review-required because live QA evidence is missing.`,
          `${displayName["zh-CN"]} 因缺少 live QA 证据保持 disabled 或 review-required。`,
          `${displayName["zh-TW"]} 因缺少 live QA 證據保持 disabled 或 review-required。`,
        )
      : text(
          `${displayName["en-US"]} still requires feature-gate and review approval before production enablement.`,
          `${displayName["zh-CN"]} 在生产启用前仍需要 feature-gate 与审核批准。`,
          `${displayName["zh-TW"]} 在生產啟用前仍需要 feature-gate 與審核批准。`,
        ),
  };
};

const createLiveConnectorEntry = (
  config: LiveConnectorConfig,
  featureGateState: LiveWalletConnectorFeatureGateState,
  liveEvidenceStatus: LiveWalletConnectorLiveEvidenceStatus,
  reviewApproved: boolean,
): LiveWalletConnectorEntry => {
  const readiness = liveConnectorReadinessFor(featureGateState, liveEvidenceStatus, reviewApproved);
  const fallback = liveConnectorFallbackFor(config.displayName, readiness, liveEvidenceStatus);

  return {
    accountType: config.accountType,
    adapterId: config.adapterId,
    capabilities: config.capabilities,
    connectorId: config.connectorId,
    dependencyRisk: config.dependencyRisk,
    displayName: config.displayName,
    fallback,
    featureGateState,
    liveEvidenceStatus,
    network: expectedNetwork,
    nextAction: fallback.nextAction,
    packageName: config.packageName,
    packageVersionSource: config.packageVersionSource,
    readiness,
    releaseImpact: liveConnectorReleaseImpactFor(readiness),
    securityBoundary: liveWalletConnectorBoundary,
    supportedChains: [expectedChainId, "tDVV", "tDVW"],
    walletSource: config.walletSource,
  };
};

const summarizeLiveConnectorBoundary = (
  entries: LiveWalletConnectorEntry[],
): LiveWalletConnectorSummary => ({
  approvedConnectors: entries.filter((entry) => entry.readiness === "approved").length,
  blockedConnectors: entries.filter((entry) => entry.readiness === "blocked").length,
  disabledConnectors: entries.filter((entry) => entry.readiness === "disabled").length,
  missingLiveEvidenceConnectors: entries.filter((entry) => entry.liveEvidenceStatus === "missing").length,
  releaseBlockers: entries.filter((entry) => entry.releaseImpact === "release_blocker").length,
  reviewRequiredConnectors: entries.filter((entry) => entry.readiness === "review_required").length,
  totalConnectors: entries.length,
});

export const createLiveWalletConnectorBoundary = (
  options: {
    featureGates?: Partial<Record<LiveWalletConnectorId, LiveWalletConnectorFeatureGateState>>;
    liveEvidence?: Partial<Record<LiveWalletConnectorId, LiveWalletConnectorLiveEvidenceStatus>>;
    reviewApprovals?: Partial<Record<LiveWalletConnectorId, boolean>>;
  } = {},
): LiveWalletConnectorBoundary => {
  const entries = liveConnectorConfigs.map((config) =>
    createLiveConnectorEntry(
      config,
      options.featureGates?.[config.connectorId] ?? "disabled",
      options.liveEvidence?.[config.connectorId] ?? "missing",
      options.reviewApprovals?.[config.connectorId] ?? false,
    ),
  );

  return {
    boundary: liveWalletConnectorBoundary,
    entries,
    forbiddenOperations: liveConnectorForbiddenOperations,
    integrationId: "aelf-web-login",
    nextAction: liveWalletConnectorNextAction,
    packageCandidates: liveConnectorPackageCandidates,
    packageVersionSource: liveConnectorPackageVersionSource,
    summary: summarizeLiveConnectorBoundary(entries),
  };
};

const shortenAddress = (address: string) => {
  if (address.includes("...") || address.length <= 10) {
    return address;
  }

  return `${address.slice(0, 3)}...${address.slice(-3)}`;
};

interface LiveWalletAdapterMapping {
  accountType: AccountType;
  capabilities: WalletCapability[];
  walletSource: WalletSource;
  walletName: string;
}

const liveWalletAdapterMappings: Record<string, LiveWalletAdapterMapping> = {
  NightElfWallet: {
    accountType: "EOA",
    capabilities: ["SIGN_MESSAGE", "CONTRACT_VIEW"],
    walletName: "NightElf",
    walletSource: "NIGHTELF",
  },
  PortkeyAAWallet: {
    accountType: "AA",
    capabilities: ["SIGN_MESSAGE", "VIEW_BALANCE", "CONTRACT_VIEW", "EBRIDGE"],
    walletName: "Portkey AA",
    walletSource: "PORTKEY_AA",
  },
  PortkeyAgentSkill: {
    accountType: "EOA",
    capabilities: ["CONTRACT_VIEW", "CONTRACT_SEND", "INTERNAL_AUTOMATION"],
    walletName: "Agent Skill wallet",
    walletSource: "AGENT_SKILL",
  },
  PortkeyDiscoverWallet: {
    accountType: "EOA",
    capabilities: ["SIGN_MESSAGE", "SEND_TRANSACTION", "CONTRACT_VIEW", "EBRIDGE"],
    walletName: "Portkey EOA App / Discover",
    walletSource: "PORTKEY_EOA_APP",
  },
  PortkeyExtensionWallet: {
    accountType: "EOA",
    capabilities: ["SIGN_MESSAGE", "SEND_TRANSACTION", "CONTRACT_VIEW", "EBRIDGE"],
    walletName: "Portkey EOA Extension",
    walletSource: "PORTKEY_EOA_EXTENSION",
  },
};

const candidateSessionIdFor = (adapterName: string, address: string) =>
  `live-${adapterName}-${address}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const verificationStatusForLiveInfo = (
  input: AdapterWalletInfoCandidate,
  mapping: LiveWalletAdapterMapping | undefined,
): WalletVerificationStatus => {
  if (!input.address) {
    return "address_only";
  }

  if (!mapping) {
    return "unsupported_wallet";
  }

  if (input.internalAgent || mapping.walletSource === "AGENT_SKILL") {
    return "internal_agent";
  }

  if ((input.chainId ?? "unknown") !== expectedChainId || (input.network ?? "unknown") !== expectedNetwork) {
    return "wrong_chain";
  }

  if (!input.signaturePresent) {
    return "missing_signature";
  }

  return "verified";
};

const signatureStatusForLiveInfo = (
  input: AdapterWalletInfoCandidate,
  verificationStatus: WalletVerificationStatus,
): WalletSignatureStatus => {
  if (verificationStatus === "address_only" || verificationStatus === "unsupported_wallet") {
    return "not_available";
  }

  return input.signaturePresent ? "signed" : "missing";
};

export const mapLiveWalletInfoToSessionCandidate = (
  input: AdapterWalletInfoCandidate,
): NormalizedWalletSessionCandidate => {
  const mapping = liveWalletAdapterMappings[input.adapterName];
  const verificationStatus = verificationStatusForLiveInfo(input, mapping);
  const address = input.address ?? "Address only";
  const accountType = verificationStatus === "address_only"
    ? "UNKNOWN"
    : mapping?.accountType ?? input.accountTypeHint ?? "UNKNOWN";
  const walletSource = verificationStatus === "address_only"
    ? "OTHER"
    : mapping?.walletSource ?? input.walletSourceHint ?? "OTHER";

  return {
    accountType,
    address,
    boundary: liveWalletConnectorBoundary,
    capabilities:
      verificationStatus === "address_only"
        ? ["ADDRESS_ONLY"]
        : mapping?.capabilities ?? ["ADDRESS_ONLY"],
    chainId: input.chainId ?? "unknown",
    displayAddress: shortenAddress(address),
    errorReason: verificationStatus === "verified" ? undefined : verificationStatus,
    id: candidateSessionIdFor(input.adapterName, address),
    network: input.network ?? "unknown",
    nextAction: walletNextActions[verificationStatus],
    sessionId: candidateSessionIdFor(input.adapterName, address),
    signatureStatus: signatureStatusForLiveInfo(input, verificationStatus),
    statusMessage: walletVerificationLabels[verificationStatus],
    verificationStatus,
    walletName: input.walletName ?? mapping?.walletName ?? "Unknown wallet",
    walletSource,
    walletTypeVerified: verificationStatus === "verified",
  };
};

const signatureStatusFor = (fixture: WalletAdapterFixture): WalletSignatureStatus => {
  if (fixture.addressOnly) {
    return "not_available";
  }

  if (!fixture.signatureRequired) {
    return "not_required";
  }

  return fixture.signaturePresent ? "signed" : "missing";
};

const verificationStatusFor = (
  fixture: WalletAdapterFixture,
  campaignPolicy: WalletPolicy,
): WalletVerificationStatus => {
  if (fixture.addressOnly) {
    return "address_only";
  }

  if (!fixture.supported) {
    return "unsupported_wallet";
  }

  if (fixture.chainId !== expectedChainId || fixture.network !== expectedNetwork) {
    return "wrong_chain";
  }

  if (fixture.audience === "INTERNAL_AGENT" || fixture.walletSource === "AGENT_SKILL") {
    return "internal_agent";
  }

  if (fixture.signatureRequired && !fixture.signaturePresent) {
    return "missing_signature";
  }

  if (!fixture.allowedByCampaignPolicy || !isWalletCompatible(campaignPolicy, fixture.accountType)) {
    return "account_restricted";
  }

  return "verified";
};

export const normalizeWalletSession = (
  fixture: WalletAdapterFixture,
  campaignPolicy: WalletPolicy = "ANY",
): NormalizedWalletSession => {
  const verificationStatus = verificationStatusFor(fixture, campaignPolicy);
  const signatureStatus = signatureStatusFor(fixture);
  const address = fixture.address ?? "Address only";

  return {
    id: fixture.id,
    sessionId: fixture.id,
    address,
    displayAddress: shortenAddress(address),
    accountType: fixture.accountType,
    walletSource: fixture.walletSource,
    walletName: fixture.walletName,
    chainId: fixture.chainId,
    network: fixture.network,
    ...(fixture.accounts ? { accounts: { ...fixture.accounts } } : {}),
    ...(fixture.publicKey ? { publicKey: fixture.publicKey } : {}),
    capabilities: fixture.capabilities,
    connectedAt: fixture.connectedAt,
    lastSeenAt: fixture.lastSeenAt,
    verificationStatus,
    signatureStatus,
    walletTypeVerified: verificationStatus === "verified",
    normalUserRecommended:
      fixture.audience === "NORMAL_USER" && fixture.recommended && verificationStatus === "verified",
    errorReason: verificationStatus === "verified" ? undefined : verificationStatus,
    userAction: walletNextActions[verificationStatus],
    statusMessage: walletVerificationLabels[verificationStatus],
  };
};

export const normalizeWalletSessions = (
  fixtures: WalletAdapterFixture[],
  campaignPolicy: WalletPolicy = "ANY",
) => fixtures.map((fixture) => normalizeWalletSession(fixture, campaignPolicy));

export const isWalletSessionVerified = (session: NormalizedWalletSession) =>
  session.verificationStatus === "verified" && session.walletTypeVerified;

const providerQaScenarioOrder: WalletProviderQaScenarioId[] = [
  "portkey-aa-connect",
  "eoa-extension-connect",
  "wrong-chain-error",
  "unsupported-wallet-error",
];

const isAuditableProviderQaSession = (session: NormalizedWalletSession) =>
  session.verificationStatus !== "address_only" &&
  session.verificationStatus !== "internal_agent" &&
  session.walletSource !== "AGENT_SKILL";

const providerQaSessionMatches = (
  scenarioId: WalletProviderQaScenarioId,
  session: NormalizedWalletSession,
) => {
  if (!isAuditableProviderQaSession(session)) {
    return false;
  }

  if (scenarioId === "portkey-aa-connect") {
    return session.walletSource === "PORTKEY_AA" && session.verificationStatus === "verified";
  }

  if (scenarioId === "eoa-extension-connect") {
    return session.walletSource === "PORTKEY_EOA_EXTENSION" && session.verificationStatus === "verified";
  }

  if (scenarioId === "wrong-chain-error") {
    return session.verificationStatus === "wrong_chain";
  }

  return session.verificationStatus === "unsupported_wallet";
};

const providerQaReleaseImpact = (
  liveEvidenceStatus: WalletProviderQaLiveEvidenceStatus,
): WalletProviderQaReleaseImpact => {
  if (liveEvidenceStatus === "ready") {
    return "ready";
  }

  if (liveEvidenceStatus === "not_applicable") {
    return "informational";
  }

  return liveEvidenceStatus === "blocked" ? "release_blocker" : "needs_review";
};

const providerQaEvidence = (
  scenarioId: WalletProviderQaScenarioId,
  seededReady: boolean,
  liveEvidenceStatus: WalletProviderQaLiveEvidenceStatus,
) => {
  if (liveEvidenceStatus === "ready") {
    return providerQaLiveReadyEvidence[scenarioId];
  }

  if (liveEvidenceStatus === "blocked") {
    return text(
      `${providerQaLiveMissingEvidence[scenarioId]["en-US"]} Provider QA is currently blocked.`,
      `${providerQaLiveMissingEvidence[scenarioId]["zh-CN"]} Provider QA 当前被阻断。`,
      `${providerQaLiveMissingEvidence[scenarioId]["zh-TW"]} Provider QA 目前被阻斷。`,
    );
  }

  if (liveEvidenceStatus === "not_applicable") {
    return text(
      "Live provider evidence is not applicable for this scenario.",
      "该场景不适用真实 provider 证据。",
      "該場景不適用真實 provider 證據。",
    );
  }

  const seededEvidence = seededReady
    ? providerQaSeededEvidence[scenarioId].ready
    : providerQaSeededEvidence[scenarioId].missing;

  return text(
    `${seededEvidence["en-US"]} ${providerQaLiveMissingEvidence[scenarioId]["en-US"]}`,
    `${seededEvidence["zh-CN"]} ${providerQaLiveMissingEvidence[scenarioId]["zh-CN"]}`,
    `${seededEvidence["zh-TW"]} ${providerQaLiveMissingEvidence[scenarioId]["zh-TW"]}`,
  );
};

export const createWalletProviderQaReadinessGate = (
  sessions: NormalizedWalletSession[],
  liveEvidence: Partial<Record<WalletProviderQaScenarioId, WalletProviderQaLiveEvidenceStatus>> = {},
): WalletProviderQaReadinessGate => {
  const scenarios: WalletProviderQaScenario[] = providerQaScenarioOrder.map((id) => {
    const matchedSessionIds = sessions
      .filter((session) => providerQaSessionMatches(id, session))
      .map((session) => session.sessionId);
    const seededReady = matchedSessionIds.length > 0;
    const liveEvidenceStatus = liveEvidence[id] ?? "missing";

    return {
      evidence: providerQaEvidence(id, seededReady, liveEvidenceStatus),
      id,
      label: providerQaLabels[id],
      liveEvidenceStatus,
      matchedSessionIds,
      nextAction: providerQaNextActions[id],
      releaseImpact: providerQaReleaseImpact(liveEvidenceStatus),
      seededStatus: seededReady ? "ready" : "missing",
    };
  });

  return {
    boundary: walletProviderQaBoundary,
    scenarios,
    summary: {
      liveEvidenceReadyScenarios: scenarios.filter(
        (scenario) => scenario.liveEvidenceStatus === "ready",
      ).length,
      missingLiveEvidenceScenarios: scenarios.filter(
        (scenario) => scenario.liveEvidenceStatus === "missing",
      ).length,
      releaseBlockers: scenarios.filter((scenario) => scenario.releaseImpact === "release_blocker")
        .length,
      seededReadyScenarios: scenarios.filter((scenario) => scenario.seededStatus === "ready").length,
      totalScenarios: scenarios.length,
    },
  };
};

const groupIdForSession = (session: NormalizedWalletSession): WalletDiagnosticGroupId => {
  if (session.verificationStatus === "address_only") {
    return "address-only";
  }

  if (session.verificationStatus === "internal_agent") {
    return "internal-agent";
  }

  if (session.verificationStatus !== "verified") {
    return "connection-issues";
  }

  if (session.normalUserRecommended && session.accountType === "AA") {
    return "recommended-aa";
  }

  return "supported-eoa";
};

const diagnosticStateForGroup = (
  groupId: WalletDiagnosticGroupId,
  items: WalletDiagnosticItem[],
): WalletDiagnosticState => {
  if (items.length === 0) {
    return "warning";
  }

  if (groupId === "connection-issues") {
    return "blocker";
  }

  if (groupId === "address-only" || groupId === "internal-agent") {
    return "warning";
  }

  return items.every((item) => item.verificationStatus === "verified") ? "ready" : "warning";
};

const qaScenarioForSession = (session: NormalizedWalletSession): LocalizedText => {
  if (session.walletSource === "PORTKEY_AA" && session.verificationStatus === "verified") {
    return text(
      "Portkey AA seeded connect path verified.",
      "Portkey AA seeded 连接路径已验证。",
      "Portkey AA seeded 連接路徑已驗證。",
    );
  }

  if (session.walletSource === "PORTKEY_EOA_EXTENSION" && session.verificationStatus === "verified") {
    return text(
      "EOA extension seeded connect path verified.",
      "EOA 插件 seeded 连接路径已验证。",
      "EOA 擴充套件 seeded 連接路徑已驗證。",
    );
  }

  if (session.verificationStatus === "wrong_chain") {
    return text(
      "Wrong-chain recovery message is visible.",
      "错误链恢复提示可见。",
      "錯誤鏈恢復提示可見。",
    );
  }

  if (session.verificationStatus === "unsupported_wallet") {
    return text(
      "Unsupported-wallet recovery message is visible.",
      "不支持钱包恢复提示可见。",
      "不支援錢包恢復提示可見。",
    );
  }

  if (session.verificationStatus === "missing_signature") {
    return text(
      "Missing-signature recovery message is visible.",
      "缺少签名恢复提示可见。",
      "缺少簽名恢復提示可見。",
    );
  }

  if (session.verificationStatus === "account_restricted") {
    return text(
      "Account policy restriction message is visible.",
      "账户策略限制提示可见。",
      "帳戶策略限制提示可見。",
    );
  }

  if (session.verificationStatus === "address_only") {
    return text(
      "Address-only state is visible and not treated as verified.",
      "仅地址状态可见，且不会被视为已验证。",
      "僅地址狀態可見，且不會被視為已驗證。",
    );
  }

  if (session.verificationStatus === "internal_agent") {
    return text(
      "Internal automation path is visible but not recommended.",
      "内部自动化路径可见，但不推荐给普通用户。",
      "內部自動化路徑可見，但不推薦給一般使用者。",
    );
  }

  return text("Seeded EOA path is visible.", "Seeded EOA 路径可见。", "Seeded EOA 路徑可見。");
};

const createDiagnosticItem = (session: NormalizedWalletSession): WalletDiagnosticItem => ({
  accountType: session.accountType,
  capabilities: session.capabilities,
  displayAddress: session.displayAddress,
  nextAction: session.userAction ?? walletNextActions[session.verificationStatus],
  qaScenario: qaScenarioForSession(session),
  sessionId: session.sessionId,
  signatureStatus: session.signatureStatus,
  statusMessage: session.statusMessage,
  verificationStatus: session.verificationStatus,
  walletName: session.walletName,
  walletSource: session.walletSource,
});

const createQaChecklist = (sessions: NormalizedWalletSession[]): WalletQaChecklistItem[] => {
  const idsBy = (predicate: (session: NormalizedWalletSession) => boolean) =>
    sessions.filter(predicate).map((session) => session.sessionId);
  const portkeyAaIds = idsBy(
    (session) => session.walletSource === "PORTKEY_AA" && session.verificationStatus === "verified",
  );
  const extensionIds = idsBy(
    (session) =>
      session.walletSource === "PORTKEY_EOA_EXTENSION" &&
      session.verificationStatus === "verified",
  );
  const wrongChainIds = idsBy((session) => session.verificationStatus === "wrong_chain");
  const unsupportedIds = idsBy((session) => session.verificationStatus === "unsupported_wallet");
  const missingSignatureIds = idsBy((session) => session.verificationStatus === "missing_signature");
  const restrictedIds = idsBy((session) => session.verificationStatus === "account_restricted");

  const checklist: Array<[WalletQaChecklistId, string[], LocalizedText]> = [
    [
      "portkey-aa-connect",
      portkeyAaIds,
      qaEvidenceText(
        portkeyAaIds.length > 0,
        "Seeded Portkey AA session verifies the recommended path.",
        "No seeded Portkey AA verified session is available.",
        "Seeded Portkey AA 会话验证了推荐路径。",
        "缺少已验证的 seeded Portkey AA 会话。",
        "Seeded Portkey AA 會話驗證了推薦路徑。",
        "缺少已驗證的 seeded Portkey AA 會話。",
      ),
    ],
    [
      "eoa-extension-connect",
      extensionIds,
      qaEvidenceText(
        extensionIds.length > 0,
        "Seeded EOA extension session verifies the existing-user path.",
        "No seeded EOA extension verified session is available.",
        "Seeded EOA 插件会话验证了已有用户路径。",
        "缺少已验证的 seeded EOA 插件会话。",
        "Seeded EOA 擴充套件會話驗證了既有使用者路徑。",
        "缺少已驗證的 seeded EOA 擴充套件會話。",
      ),
    ],
    [
      "wrong-chain-error",
      wrongChainIds,
      qaEvidenceText(
        wrongChainIds.length > 0,
        "Wrong-chain seeded session shows AELF mainnet recovery.",
        "No wrong-chain seeded session is available.",
        "错误链 seeded 会话展示 AELF mainnet 恢复提示。",
        "缺少错误链 seeded 会话。",
        "錯誤鏈 seeded 會話展示 AELF mainnet 恢復提示。",
        "缺少錯誤鏈 seeded 會話。",
      ),
    ],
    [
      "unsupported-wallet-error",
      unsupportedIds,
      qaEvidenceText(
        unsupportedIds.length > 0,
        "Unsupported-wallet seeded session shows safe wallet choices.",
        "No unsupported-wallet seeded session is available.",
        "不支持钱包 seeded 会话展示安全钱包选择。",
        "缺少不支持钱包 seeded 会话。",
        "不支援錢包 seeded 會話展示安全錢包選擇。",
        "缺少不支援錢包 seeded 會話。",
      ),
    ],
    [
      "missing-signature",
      missingSignatureIds,
      qaEvidenceText(
        missingSignatureIds.length > 0,
        "Missing-signature seeded session asks only for verification signing.",
        "No missing-signature seeded session is available.",
        "缺少签名 seeded 会话只提示验证签名。",
        "缺少缺签 seeded 会话。",
        "缺少簽名 seeded 會話只提示驗證簽名。",
        "缺少缺簽 seeded 會話。",
      ),
    ],
    [
      "account-policy-restriction",
      restrictedIds,
      qaEvidenceText(
        restrictedIds.length > 0,
        "Restricted-account seeded session shows campaign wallet policy recovery.",
        "No restricted-account seeded session is available.",
        "受限账户 seeded 会话展示活动钱包策略恢复提示。",
        "缺少受限账户 seeded 会话。",
        "受限帳戶 seeded 會話展示活動錢包策略恢復提示。",
        "缺少受限帳戶 seeded 會話。",
      ),
    ],
  ];

  return checklist.map(([id, sessionIds, evidence]) => ({
    evidence,
    id,
    label: qaLabels[id],
    sessionIds,
    state: sessionIds.length > 0 ? "ready" : "blocker",
  }));
};

export const createWalletConnectionDiagnostics = (
  sessions: NormalizedWalletSession[],
): WalletDiagnosticSummary => {
  const itemsByGroup = sessions.reduce<Record<WalletDiagnosticGroupId, WalletDiagnosticItem[]>>(
    (groups, session) => {
      groups[groupIdForSession(session)].push(createDiagnosticItem(session));

      return groups;
    },
    {
      "address-only": [],
      "connection-issues": [],
      "internal-agent": [],
      "recommended-aa": [],
      "supported-eoa": [],
    },
  );
  const groupOrder: WalletDiagnosticGroupId[] = [
    "recommended-aa",
    "supported-eoa",
    "connection-issues",
    "address-only",
    "internal-agent",
  ];
  const groups: WalletDiagnosticGroup[] = groupOrder.map((id) => ({
    description: groupCopy[id].description,
    id,
    items: itemsByGroup[id],
    state: diagnosticStateForGroup(id, itemsByGroup[id]),
    title: groupCopy[id].title,
  }));
  const verifiedSessions = sessions.filter(isWalletSessionVerified).length;

  return {
    boundary: walletDiagnosticsBoundary,
    eoaPathsReady: sessions.filter(
      (session) => session.accountType === "EOA" && session.verificationStatus === "verified",
    ).length,
    groups,
    issueSessions: sessions.length - verifiedSessions,
    qaChecklist: createQaChecklist(sessions),
    recommendedPathReady: sessions.some(
      (session) => session.normalUserRecommended && session.verificationStatus === "verified",
    ),
    totalSessions: sessions.length,
    verifiedSessions,
  };
};

export const deriveEligibilityWalletStatus = (
  session: NormalizedWalletSession,
  campaignWalletPolicy: WalletPolicy,
  missingTasks: string[] = [],
  riskFlags: string[] = [],
): EligibilityWalletStatus => {
  const policyCompatible = isWalletCompatible(campaignWalletPolicy, session.accountType);
  const verificationStatus: WalletVerificationStatus =
    isWalletSessionVerified(session) && !policyCompatible
      ? "account_restricted"
      : session.verificationStatus;
  const walletTypeVerified = verificationStatus === "verified";

  return {
    walletAddress: session.address,
    accountType: session.accountType,
    walletSource: session.walletSource,
    walletTypeVerified,
    campaignWalletPolicy,
    eligible: walletTypeVerified && policyCompatible && missingTasks.length === 0 && riskFlags.length === 0,
    missingTasks,
    riskFlags,
    statusMessage: walletVerificationLabels[verificationStatus],
    nextAction: walletNextActions[verificationStatus],
    verificationStatus,
  };
};
