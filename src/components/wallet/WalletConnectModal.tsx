import { useEffect, type CSSProperties } from "react";
import { X } from "lucide-react";
import type { SupportedLocale, WalletOption } from "../../domain";
import { WalletBadge } from "../badges/Badges";

interface WalletConnectModalProps {
  locale: SupportedLocale;
  onClose: () => void;
  options: WalletOption[];
}

const modalCopy = {
  "en-US": {
    accountRestriction:
      "Account type restriction: if a campaign allows only AA or only EOA, switch to a wallet type accepted by that campaign policy.",
    advanced: "Internal/advanced",
    advancedGroup: "Advanced / Agent",
    capability: "Capabilities",
    close: "Close wallet connect modal",
    eoaGroup: "EOA Wallets",
    missingSignature:
      "Missing signature: sign the seeded verification message only after confirming the prompt; this preview does not request a real signature.",
    nonLiveBoundary:
      "Seeded preview only: no live wallet SDK, no real signature, no transaction, and no contract read/write is executed.",
    privateKeySafety:
      "Campaign OS never asks for private keys, seed phrases, recovery phrases, or password exports.",
    recommended: "Recommended",
    recommendedGroup: "Recommended",
    title: "Connect Wallet",
    unsupportedWallet:
      "Unsupported wallet: choose Portkey AA, Portkey EOA App, Portkey EOA Extension, or NightElf for this seeded campaign flow.",
    wrongChain:
      "Wrong chain: switch to AELF mainnet before continuing with campaign verification.",
  },
  "zh-CN": {
    accountRestriction:
      "账户类型限制：如果活动只允许 AA 或只允许 EOA，请切换到该活动策略接受的钱包类型。",
    advanced: "内部/高级",
    advancedGroup: "高级 / Agent",
    capability: "能力",
    close: "关闭钱包连接弹窗",
    eoaGroup: "EOA 钱包",
    missingSignature:
      "缺少签名：确认提示内容后只签署 seeded 验证消息；此预览不会请求真实签名。",
    nonLiveBoundary:
      "仅 seeded 预览：不会连接实时钱包 SDK，不会请求真实签名，不会发起交易，也不会读写合约。",
    privateKeySafety:
      "Campaign OS 永远不会索要私钥、助记词、恢复短语或密码导出。",
    recommended: "推荐",
    recommendedGroup: "推荐",
    title: "连接钱包",
    unsupportedWallet:
      "不支持的钱包：请为该 seeded 活动流程选择 Portkey AA、Portkey EOA App、Portkey EOA Extension 或 NightElf。",
    wrongChain:
      "链不匹配：请切换到 AELF mainnet 后再继续活动验证。",
  },
} satisfies Record<SupportedLocale, Record<string, string>>;

const backdropStyle: CSSProperties = {
  alignItems: "center",
  background: "rgba(7, 20, 38, 0.52)",
  display: "flex",
  inset: 0,
  justifyContent: "center",
  padding: 16,
  position: "fixed",
  zIndex: 50,
};

const dialogStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe6f4",
  borderRadius: 8,
  boxShadow: "0 24px 60px rgba(7, 20, 38, 0.28)",
  display: "grid",
  gap: 14,
  maxHeight: "min(820px, calc(100vh - 32px))",
  maxWidth: 860,
  overflowY: "auto",
  padding: 18,
  width: "min(100%, 860px)",
};

const rowStyle: CSSProperties = {
  alignItems: "center",
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  justifyContent: "space-between",
};

const closeButtonStyle: CSSProperties = {
  alignItems: "center",
  background: "#ffffff",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  color: "#071426",
  cursor: "pointer",
  display: "inline-flex",
  fontSize: 18,
  fontWeight: 900,
  justifyContent: "center",
  minHeight: 40,
  minWidth: 40,
};

const alertStyle: CSSProperties = {
  background: "#fffbeb",
  border: "1px solid #fcd34d",
  borderRadius: 8,
  color: "#92400e",
  display: "grid",
  gap: 8,
  fontSize: 13,
  fontWeight: 700,
  lineHeight: 1.45,
  margin: 0,
  padding: 12,
};

const groupStyle: CSSProperties = {
  display: "grid",
  gap: 10,
};

const gridStyle: CSSProperties = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(min(210px, 100%), 1fr))",
};

const cardStyle: CSSProperties = {
  background: "#f8fbff",
  border: "1px solid #dbe6f4",
  borderRadius: 8,
  display: "grid",
  gap: 10,
  padding: 14,
};

const tagStyle: CSSProperties = {
  background: "#ecfdf5",
  border: "1px solid #86efac",
  borderRadius: 999,
  color: "#166534",
  display: "inline-flex",
  fontSize: 12,
  fontWeight: 800,
  minHeight: 24,
  padding: "4px 8px",
  width: "fit-content",
};

const advancedStyle: CSSProperties = {
  ...tagStyle,
  background: "#f8fafc",
  borderColor: "#cbd5e1",
  color: "#334155",
};

const issueListStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  margin: 0,
  paddingInlineStart: 18,
};

const groupWalletOptions = (options: WalletOption[]) => ({
  advanced: options.filter((option) => option.audience === "INTERNAL_AGENT"),
  eoa: options.filter((option) => option.accountType === "EOA" && option.audience !== "INTERNAL_AGENT"),
  recommended: options.filter((option) => option.recommended),
});

const WalletOptionCard = ({
  copy,
  option,
}: {
  copy: (typeof modalCopy)["en-US"];
  option: WalletOption;
}) => (
  <article style={cardStyle}>
    <div style={{ alignItems: "start", display: "flex", gap: 8, justifyContent: "space-between" }}>
      <strong>{option.name}</strong>
      <WalletBadge accountType={option.accountType} walletSource={option.walletSource} />
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {option.recommended ? <span style={tagStyle}>{copy.recommended}</span> : null}
      {option.audience === "INTERNAL_AGENT" ? (
        <span style={advancedStyle}>{copy.advanced}</span>
      ) : null}
    </div>
    <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.4, margin: 0 }}>
      {copy.capability}: {option.capabilities.join(", ")}
    </p>
  </article>
);

const WalletOptionGroup = ({
  copy,
  options,
  testId,
  title,
}: {
  copy: (typeof modalCopy)["en-US"];
  options: WalletOption[];
  testId: string;
  title: string;
}) => (
  <section aria-label={title} data-testid={testId} style={groupStyle}>
    <div style={rowStyle}>
      <h3 style={{ color: "#071426", fontSize: 18, margin: 0 }}>{title}</h3>
      <span style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>{options.length}</span>
    </div>
    <div style={gridStyle}>
      {options.map((option) => (
        <WalletOptionCard copy={copy} key={option.id} option={option} />
      ))}
    </div>
  </section>
);

export const WalletConnectModal = ({ locale, onClose, options }: WalletConnectModalProps) => {
  const copy = modalCopy[locale];
  const groupedOptions = groupWalletOptions(options);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div onClick={onClose} style={backdropStyle}>
      <section
        aria-labelledby="wallet-connect-modal-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        style={dialogStyle}
      >
        <div style={rowStyle}>
          <div>
            <p style={{ color: "#64748b", fontSize: 12, fontWeight: 800, margin: 0 }}>
              {copy.recommendedGroup}
            </p>
            <h2 id="wallet-connect-modal-title" style={{ fontSize: 26, lineHeight: 1.1, margin: "4px 0 0" }}>
              {copy.title}
            </h2>
          </div>
          <button
            aria-label={copy.close}
            onClick={onClose}
            style={closeButtonStyle}
            title={copy.close}
            type="button"
          >
            <X aria-hidden="true" size={18} strokeWidth={2.5} />
          </button>
        </div>

        <div role="note" style={alertStyle}>
          <span>{copy.privateKeySafety}</span>
          <span>{copy.nonLiveBoundary}</span>
        </div>

        <WalletOptionGroup
          copy={copy}
          options={groupedOptions.recommended}
          testId="wallet-modal-group-recommended"
          title={copy.recommendedGroup}
        />
        <WalletOptionGroup
          copy={copy}
          options={groupedOptions.eoa}
          testId="wallet-modal-group-eoa"
          title={copy.eoaGroup}
        />
        <WalletOptionGroup
          copy={copy}
          options={groupedOptions.advanced}
          testId="wallet-modal-group-advanced"
          title={copy.advancedGroup}
        />

        <section aria-label="Seeded wallet recovery guidance" style={cardStyle}>
          <h3 style={{ fontSize: 18, margin: 0 }}>{copy.nonLiveBoundary}</h3>
          <ul style={issueListStyle}>
            <li>{copy.wrongChain}</li>
            <li>{copy.unsupportedWallet}</li>
            <li>{copy.missingSignature}</li>
            <li>{copy.accountRestriction}</li>
          </ul>
        </section>
      </section>
    </div>
  );
};
