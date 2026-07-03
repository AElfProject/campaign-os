import { useEffect, type CSSProperties } from "react";
import { X } from "lucide-react";
import {
  createAelfWebLoginAdapterReadiness,
  createLiveWalletConnectorBoundary,
  getLocalizedText,
  walletSessions,
  type AelfWebLoginAdapterReadinessEntry,
  type AelfWebLoginAdapterReadinessModel,
  type LiveWalletConnectorBoundary,
  type LiveWalletConnectorEntry,
  type SupportedLocale,
  type WalletOption,
} from "../../domain";
import { WalletBadge } from "../badges/Badges";

interface WalletConnectModalProps {
  adapterReadiness?: AelfWebLoginAdapterReadinessModel;
  connectorBoundary?: LiveWalletConnectorBoundary;
  locale: SupportedLocale;
  onClose: () => void;
  options: WalletOption[];
}

const modalCopy = {
  "en-US": {
    accountRestriction:
      "Account type restriction: if a campaign allows only AA or only EOA, switch to a wallet type accepted by that campaign policy.",
    adapterPreview: "aelf-web-login adapter readiness",
    adapterReadiness: "Adapter readiness",
    advanced: "Internal/advanced",
    advancedGroup: "Advanced / Agent",
    capability: "Capabilities",
    close: "Close wallet connect modal",
    connectorBoundary: "Live connector boundary",
    connectorCandidates: "Connector candidates",
    connectorDisabled: "Disabled/review-required",
    connectorPackage: "Candidate package",
    degradedGroup: "Unavailable / maintenance",
    eoaGroup: "EOA Wallets",
    extensionNotInstalled: "Extension not installed: Install or open your EOA wallet extension.",
    featureGate: "Feature gate",
    liveEvidence: "Live evidence",
    missingSignature:
      "Missing signature: sign the seeded verification message only after confirming the prompt; this preview does not request a real signature.",
    nonLiveBoundary:
      "Seeded preview only: no live wallet SDK, no real signature, no transaction, and no contract read/write is executed.",
    nextAction: "Next action",
    privateKeySafety:
      "Campaign OS never asks for private keys, seed phrases, recovery phrases, or password exports.",
    privateKeyFooter: "Campaign OS never asks for your private key.",
    recommended: "Recommended",
    recommendedGroup: "Recommended",
    subtitle: "Choose how you want to join this campaign.",
    title: "Connect Wallet",
    unsupportedWallet:
      "Unsupported wallet: choose Portkey AA, Portkey EOA App, Portkey EOA Extension, or NightElf for this seeded campaign flow.",
    verificationOnlyFooter: "By connecting, you agree to sign messages only for verification.",
    wrongChain:
      "Wrong chain: switch to AELF mainnet before continuing with campaign verification.",
  },
  "zh-CN": {
    accountRestriction:
      "账户类型限制：如果活动只允许 AA 或只允许 EOA，请切换到该活动策略接受的钱包类型。",
    adapterPreview: "aelf-web-login adapter readiness",
    adapterReadiness: "Adapter readiness",
    advanced: "内部/高级",
    advancedGroup: "高级 / Agent",
    capability: "能力",
    close: "关闭钱包连接弹窗",
    connectorBoundary: "Live connector boundary",
    connectorCandidates: "Connector candidates",
    connectorDisabled: "已关闭/待审核",
    connectorPackage: "候选 package",
    degradedGroup: "不可用 / 维护中",
    eoaGroup: "EOA 钱包",
    extensionNotInstalled: "插件未安装：请安装或打开你的 EOA 钱包插件。",
    featureGate: "功能门禁",
    liveEvidence: "真实证据",
    missingSignature:
      "缺少签名：确认提示内容后只签署 seeded 验证消息；此预览不会请求真实签名。",
    nonLiveBoundary:
      "仅 seeded 预览：不会连接实时钱包 SDK，不会请求真实签名，不会发起交易，也不会读写合约。",
    nextAction: "下一步",
    privateKeySafety:
      "Campaign OS 永远不会索要私钥、助记词、恢复短语或密码导出。",
    privateKeyFooter: "Campaign OS 永远不会索要你的私钥。",
    recommended: "推荐",
    recommendedGroup: "推荐",
    subtitle: "选择你想如何加入这个活动。",
    title: "连接钱包",
    unsupportedWallet:
      "不支持的钱包：请为该 seeded 活动流程选择 Portkey AA、Portkey EOA App、Portkey EOA Extension 或 NightElf。",
    verificationOnlyFooter: "连接即表示你同意仅为验证签署消息。",
    wrongChain:
      "链不匹配：请切换到 AELF mainnet 后再继续活动验证。",
  },
  "zh-TW": {
    accountRestriction:
      "帳戶類型限制：如果活動只允許 AA 或只允許 EOA，請切換到該活動策略接受的錢包類型。",
    adapterPreview: "aelf-web-login adapter readiness",
    adapterReadiness: "Adapter readiness",
    advanced: "內部/進階",
    advancedGroup: "進階 / Agent",
    capability: "能力",
    close: "關閉錢包連接彈窗",
    connectorBoundary: "Live connector boundary",
    connectorCandidates: "Connector candidates",
    connectorDisabled: "已關閉/待審核",
    connectorPackage: "候選 package",
    degradedGroup: "不可用 / 維護中",
    eoaGroup: "EOA 錢包",
    extensionNotInstalled: "擴充套件未安裝：請安裝或開啟你的 EOA 錢包擴充套件。",
    featureGate: "功能門禁",
    liveEvidence: "真實證據",
    missingSignature:
      "缺少簽名：確認提示內容後只簽署 seeded 驗證訊息；此預覽不會請求真實簽名。",
    nonLiveBoundary:
      "僅 seeded 預覽：不會連接即時錢包 SDK，不會請求真實簽名，不會發起交易，也不會讀寫合約。",
    nextAction: "下一步",
    privateKeySafety:
      "Campaign OS 永遠不會索要私鑰、助記詞、恢復短語或密碼匯出。",
    privateKeyFooter: "Campaign OS 永遠不會索要你的私鑰。",
    recommended: "推薦",
    recommendedGroup: "推薦",
    subtitle: "選擇你想如何加入這個活動。",
    title: "連接錢包",
    unsupportedWallet:
      "不支援的錢包：請為該 seeded 活動流程選擇 Portkey AA、Portkey EOA App、Portkey EOA Extension 或 NightElf。",
    verificationOnlyFooter: "連接即表示你同意僅為驗證簽署訊息。",
    wrongChain:
      "鏈不匹配：請切換到 AELF mainnet 後再繼續活動驗證。",
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

const groupAdapterEntries = (entries: AelfWebLoginAdapterReadinessEntry[]) => ({
  degraded: entries.filter((entry) =>
    entry.audience !== "INTERNAL_AGENT" &&
    ["blocked", "maintenance", "review_required", "unavailable"].includes(entry.readiness),
  ),
  eoa: entries.filter(
    (entry) =>
      entry.accountType === "EOA" &&
      entry.audience !== "INTERNAL_AGENT" &&
      !["blocked", "maintenance", "review_required", "unavailable"].includes(entry.readiness),
  ),
  internal: entries.filter((entry) => entry.audience === "INTERNAL_AGENT"),
  recommended: entries.filter((entry) => entry.recommended && entry.audience !== "INTERNAL_AGENT"),
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

const AdapterEntryCard = ({
  copy,
  entry,
  locale,
}: {
  copy: (typeof modalCopy)["en-US"];
  entry: AelfWebLoginAdapterReadinessEntry;
  locale: SupportedLocale;
}) => (
  <article style={cardStyle}>
    <div style={{ alignItems: "start", display: "flex", gap: 8, justifyContent: "space-between" }}>
      <strong>{getLocalizedText(entry.displayName, locale)}</strong>
      <WalletBadge accountType={entry.accountType} walletSource={entry.walletSource} />
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {entry.recommended ? <span style={tagStyle}>{copy.recommended}</span> : null}
      {entry.audience === "INTERNAL_AGENT" ? <span style={advancedStyle}>{copy.advanced}</span> : null}
      <span style={advancedStyle}>{entry.readiness.replace(/_/g, " ")}</span>
    </div>
    <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.4, margin: 0 }}>
      {copy.capability}: {entry.capabilities.join(", ")}
    </p>
    <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.4, margin: 0 }}>
      {copy.featureGate}: {entry.featureGate.state.replace(/_/g, " ")}
    </p>
    <p style={{ color: "#92400e", fontSize: 13, fontWeight: 800, lineHeight: 1.4, margin: 0 }}>
      {getLocalizedText(entry.fallback.reason, locale)}
    </p>
    <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.4, margin: 0 }}>
      {copy.nextAction}: {getLocalizedText(entry.nextAction, locale)}
    </p>
  </article>
);

const AdapterEntryGroup = ({
  copy,
  entries,
  locale,
  testId,
  title,
}: {
  copy: (typeof modalCopy)["en-US"];
  entries: AelfWebLoginAdapterReadinessEntry[];
  locale: SupportedLocale;
  testId: string;
  title: string;
}) => (
  <section aria-label={title} data-testid={testId} style={groupStyle}>
    <div style={rowStyle}>
      <h3 style={{ color: "#071426", fontSize: 18, margin: 0 }}>{title}</h3>
      <span style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>{entries.length}</span>
    </div>
    <div style={gridStyle}>
      {entries.map((entry) => (
        <AdapterEntryCard copy={copy} entry={entry} key={entry.adapterId} locale={locale} />
      ))}
    </div>
  </section>
);

const ConnectorEntryCard = ({
  copy,
  entry,
  locale,
}: {
  copy: (typeof modalCopy)["en-US"];
  entry: LiveWalletConnectorEntry;
  locale: SupportedLocale;
}) => (
  <article style={cardStyle}>
    <div style={{ alignItems: "start", display: "flex", gap: 8, justifyContent: "space-between" }}>
      <strong>{getLocalizedText(entry.displayName, locale)}</strong>
      <WalletBadge accountType={entry.accountType} walletSource={entry.walletSource} />
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      <span style={advancedStyle}>{entry.readiness.replace(/_/g, " ")}</span>
      <span style={advancedStyle}>{entry.featureGateState.replace(/_/g, " ")}</span>
      <span style={advancedStyle}>{entry.liveEvidenceStatus.replace(/_/g, " ")}</span>
    </div>
    <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.4, margin: 0, overflowWrap: "anywhere" }}>
      {copy.connectorPackage}: {entry.packageName} ({entry.packageVersionSource})
    </p>
    <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.4, margin: 0 }}>
      {copy.capability}: {entry.capabilities.join(", ")}
    </p>
    <p style={{ color: "#92400e", fontSize: 13, fontWeight: 800, lineHeight: 1.4, margin: 0 }}>
      {getLocalizedText(entry.fallback.reason, locale)}
    </p>
    <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.4, margin: 0 }}>
      {copy.nextAction}: {getLocalizedText(entry.nextAction, locale)}
    </p>
  </article>
);

const ConnectorBoundarySection = ({
  boundary,
  copy,
  locale,
}: {
  boundary: LiveWalletConnectorBoundary;
  copy: (typeof modalCopy)["en-US"];
  locale: SupportedLocale;
}) => {
  const disabledOrReviewRequired =
    boundary.summary.disabledConnectors + boundary.summary.reviewRequiredConnectors;

  return (
    <section
      aria-label={copy.connectorBoundary}
      data-testid="wallet-modal-live-connector-boundary"
      style={groupStyle}
    >
      <div style={rowStyle}>
        <h3 style={{ color: "#071426", fontSize: 18, margin: 0 }}>{copy.connectorBoundary}</h3>
        <span style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>
          {copy.connectorCandidates}: {boundary.summary.totalConnectors}
        </span>
      </div>
      <div role="note" style={alertStyle}>
        <span>{getLocalizedText(boundary.boundary, locale)}</span>
        <span>{copy.connectorDisabled}: {disabledOrReviewRequired}</span>
        <span>{copy.nextAction}: {getLocalizedText(boundary.nextAction, locale)}</span>
      </div>
      <div style={gridStyle}>
        {boundary.entries.map((entry) => (
          <ConnectorEntryCard copy={copy} entry={entry} key={entry.connectorId} locale={locale} />
        ))}
      </div>
    </section>
  );
};

export const WalletConnectModal = ({
  adapterReadiness = createAelfWebLoginAdapterReadiness(walletSessions),
  connectorBoundary = createLiveWalletConnectorBoundary(),
  locale,
  onClose,
  options,
}: WalletConnectModalProps) => {
  const copy = modalCopy[locale];
  const groupedOptions = groupWalletOptions(options);
  const groupedAdapters = groupAdapterEntries(adapterReadiness.entries);

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
              {copy.adapterPreview}
            </p>
            <h2 id="wallet-connect-modal-title" style={{ fontSize: 26, lineHeight: 1.1, margin: "4px 0 0" }}>
              {copy.title}
            </h2>
            <p style={{ color: "#475569", fontSize: 14, fontWeight: 700, lineHeight: 1.45, margin: "8px 0 0" }}>
              {copy.subtitle}
            </p>
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
          <span>{getLocalizedText(adapterReadiness.boundary, locale)}</span>
          <span>{getLocalizedText(connectorBoundary.boundary, locale)}</span>
        </div>

        <ConnectorBoundarySection boundary={connectorBoundary} copy={copy} locale={locale} />

        <AdapterEntryGroup
          copy={copy}
          entries={groupedAdapters.recommended}
          locale={locale}
          testId="wallet-modal-adapter-recommended"
          title={copy.recommendedGroup}
        />
        <AdapterEntryGroup
          copy={copy}
          entries={groupedAdapters.eoa}
          locale={locale}
          testId="wallet-modal-adapter-eoa"
          title={copy.eoaGroup}
        />
        <AdapterEntryGroup
          copy={copy}
          entries={groupedAdapters.degraded}
          locale={locale}
          testId="wallet-modal-adapter-degraded"
          title={copy.degradedGroup}
        />
        <AdapterEntryGroup
          copy={copy}
          entries={groupedAdapters.internal}
          locale={locale}
          testId="wallet-modal-adapter-internal"
          title={copy.advancedGroup}
        />

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
            <li>{copy.extensionNotInstalled}</li>
            <li>{copy.missingSignature}</li>
            <li>{copy.accountRestriction}</li>
          </ul>
        </section>

        <footer aria-label="Wallet connection safety agreement" role="note" style={alertStyle}>
          <span>{copy.verificationOnlyFooter}</span>
          <span>{copy.privateKeyFooter}</span>
        </footer>
      </section>
    </div>
  );
};
