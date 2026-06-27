import type { CSSProperties } from "react";
import {
  getWalletBadgeLabel,
  getWalletCompatibilityLabel,
  walletVerificationLabels,
  type AccountType,
  type ContractMode,
  type LocaleStatus,
  type ReviewSeverity,
  type WalletCompatibility,
  type WalletSource,
  type WalletVerificationStatus,
} from "../../domain";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "ai";

interface BadgeProps {
  label: string;
  tone?: Tone;
  title?: string;
}

const toneForLocaleStatus: Record<LocaleStatus, Tone> = {
  ready: "info",
  ai_draft: "ai",
  reviewed: "success",
  published: "success",
  fallback: "warning",
  missing: "danger",
};

const toneForSeverity: Record<ReviewSeverity, Tone> = {
  info: "info",
  warning: "warning",
  blocker: "danger",
};

const toneForContractMode: Record<ContractMode, Tone> = {
  OFF_CHAIN_MVP: "success",
  V2_COMPANION: "info",
  CONTRACT_CLAIM: "danger",
};

const toneStyles: Record<Tone, CSSProperties> = {
  neutral: { background: "#f8fafc", borderColor: "#cbd5e1", color: "#334155" },
  success: { background: "#ecfdf5", borderColor: "#86efac", color: "#166534" },
  warning: { background: "#fffbeb", borderColor: "#fcd34d", color: "#92400e" },
  danger: { background: "#fef2f2", borderColor: "#fca5a5", color: "#991b1b" },
  info: { background: "#eff6ff", borderColor: "#93c5fd", color: "#1e40af" },
  ai: { background: "#f5f3ff", borderColor: "#c4b5fd", color: "#5b21b6" },
};

const badgeStyle: CSSProperties = {
  alignItems: "center",
  border: "1px solid",
  borderRadius: 999,
  display: "inline-flex",
  fontSize: 12,
  fontWeight: 700,
  gap: 6,
  lineHeight: 1,
  maxWidth: "100%",
  minHeight: 26,
  padding: "0 9px",
  whiteSpace: "nowrap",
};

export const Badge = ({ label, tone = "neutral", title }: BadgeProps) => (
  <span style={{ ...badgeStyle, ...toneStyles[tone] }} title={title}>
    {label}
  </span>
);

export const WalletBadge = ({
  accountType,
  walletSource,
}: {
  accountType: AccountType;
  walletSource: WalletSource;
}) => (
  <Badge
    label={getWalletBadgeLabel(accountType, walletSource)}
    tone={accountType === "UNKNOWN" ? "warning" : "info"}
  />
);

export const WalletVerificationBadge = ({
  label,
  status,
}: {
  label?: string;
  status: WalletVerificationStatus;
}) => {
  const tone: Tone =
    status === "verified"
      ? "success"
      : status === "internal_agent" || status === "address_only"
        ? "warning"
        : "danger";

  return <Badge label={label ?? walletVerificationLabels[status]["en-US"]} tone={tone} />;
};

export const WalletCompatibilityBadge = ({
  compatibility,
}: {
  compatibility: WalletCompatibility;
}) => (
  <Badge
    label={getWalletCompatibilityLabel(compatibility)}
    tone={compatibility === "ANY" ? "success" : "neutral"}
  />
);

export const LocaleStatusBadge = ({
  status,
  label,
}: {
  status: LocaleStatus;
  label: string;
}) => <Badge label={label} tone={toneForLocaleStatus[status]} />;

export const ContractModeBadge = ({
  mode,
  label,
}: {
  mode: ContractMode;
  label: string;
}) => <Badge label={label} tone={toneForContractMode[mode]} />;

export const ReviewSeverityBadge = ({
  severity,
  label,
}: {
  severity: ReviewSeverity;
  label: string;
}) => <Badge label={label} tone={toneForSeverity[severity]} />;

export const PublishStateBadge = ({
  state,
  label,
}: {
  state: "blocker" | "warning" | "ready";
  label: string;
}) => (
  <Badge
    label={label}
    tone={state === "blocker" ? "danger" : state === "warning" ? "warning" : "success"}
  />
);
