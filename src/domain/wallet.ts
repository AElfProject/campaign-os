import type {
  AccountType,
  EligibilityWalletStatus,
  LocalizedText,
  NormalizedWalletSession,
  WalletAdapterFixture,
  WalletCompatibility,
  WalletDiagnosticGroup,
  WalletDiagnosticGroupId,
  WalletDiagnosticItem,
  WalletDiagnosticState,
  WalletDiagnosticSummary,
  WalletPolicy,
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

const shortenAddress = (address: string) => {
  if (address.includes("...") || address.length <= 10) {
    return address;
  }

  return `${address.slice(0, 3)}...${address.slice(-3)}`;
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
