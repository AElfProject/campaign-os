import type {
  AccountType,
  EligibilityWalletStatus,
  LocalizedText,
  NormalizedWalletSession,
  WalletAdapterFixture,
  WalletCompatibility,
  WalletPolicy,
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
  },
  address_only: {
    "en-US": "Address-only, wallet type unknown",
    "zh-CN": "仅地址，钱包类型未知",
  },
  internal_agent: {
    "en-US": "Internal Agent Skill wallet",
    "zh-CN": "内部 Agent Skill 钱包",
  },
  missing_signature: {
    "en-US": "Missing verification signature",
    "zh-CN": "缺少验证签名",
  },
  unsupported_wallet: {
    "en-US": "Unsupported wallet",
    "zh-CN": "不支持的钱包",
  },
  verified: {
    "en-US": "Wallet type verified",
    "zh-CN": "钱包类型已验证",
  },
  wrong_chain: {
    "en-US": "Wrong chain or network",
    "zh-CN": "链或网络不匹配",
  },
};

const walletNextActions: Record<WalletVerificationStatus, LocalizedText> = {
  account_restricted: {
    "en-US": "Use a wallet type accepted by this campaign policy.",
    "zh-CN": "请使用该活动策略允许的钱包类型。",
  },
  address_only: {
    "en-US": "Connect and sign a verification message before task verification.",
    "zh-CN": "请连接钱包并签署验证消息后再进行任务验证。",
  },
  internal_agent: {
    "en-US": "Keep Agent Skill wallets for internal automation, not normal campaign users.",
    "zh-CN": "Agent Skill 钱包仅用于内部自动化，不推荐给普通活动用户。",
  },
  missing_signature: {
    "en-US": "Sign the seeded verification message to prove address ownership.",
    "zh-CN": "请签署 seeded 验证消息以证明地址归属。",
  },
  unsupported_wallet: {
    "en-US": "Choose Portkey AA, Portkey EOA, or NightElf for this campaign.",
    "zh-CN": "请为该活动选择 Portkey AA、Portkey EOA 或 NightElf。",
  },
  verified: {
    "en-US": "Wallet type is verified for this seeded campaign preview.",
    "zh-CN": "该 seeded 活动预览中的钱包类型已验证。",
  },
  wrong_chain: {
    "en-US": "Switch to AELF mainnet to continue.",
    "zh-CN": "请切换到 AELF mainnet 后继续。",
  },
};

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
