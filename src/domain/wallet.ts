import type { AccountType, WalletCompatibility, WalletSource } from "./types";

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
