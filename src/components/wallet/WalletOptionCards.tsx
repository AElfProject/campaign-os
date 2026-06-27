import type { CSSProperties } from "react";
import type { WalletOption } from "../../domain";
import { WalletBadge } from "../badges/Badges";

interface WalletOptionCardsProps {
  copy: {
    advanced: string;
    capability: string;
    messageBoundary: string;
    privateKeySafety: string;
    recommended: string;
    walletGroupAdvanced: string;
    walletGroupEoa: string;
    walletGroupRecommended: string;
    walletOptions: string;
  };
  options: WalletOption[];
}

const panelStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe6f4",
  borderRadius: 8,
  display: "grid",
  gap: 14,
  padding: 16,
};

const gridStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
};

const cardStyle: CSSProperties = {
  background: "#f8fbff",
  border: "1px solid #dbe6f4",
  borderRadius: 8,
  display: "grid",
  gap: 10,
  padding: 14,
};

const groupStyle: CSSProperties = {
  display: "grid",
  gap: 10,
};

const groupHeaderStyle: CSSProperties = {
  alignItems: "center",
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  justifyContent: "space-between",
};

const groupLabelStyle: CSSProperties = {
  color: "#071426",
  fontSize: 16,
  fontWeight: 900,
  margin: 0,
};

const groupCountStyle: CSSProperties = {
  color: "#64748b",
  fontSize: 12,
  fontWeight: 800,
  margin: 0,
  textTransform: "uppercase",
};

const safetyStyle: CSSProperties = {
  background: "#fffbeb",
  border: "1px solid #fcd34d",
  borderRadius: 8,
  color: "#92400e",
  fontSize: 13,
  fontWeight: 700,
  lineHeight: 1.45,
  margin: 0,
  padding: 12,
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

const groupWalletOptions = (options: WalletOption[]) => ({
  advanced: options.filter((option) => option.audience === "INTERNAL_AGENT"),
  eoa: options.filter((option) => option.accountType === "EOA" && option.audience !== "INTERNAL_AGENT"),
  recommended: options.filter((option) => option.recommended),
});

const WalletCard = ({
  copy,
  option,
}: {
  copy: WalletOptionCardsProps["copy"];
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
    <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.4, margin: 0 }}>
      {copy.capability}: {option.capabilities.join(", ")}
    </p>
  </article>
);

const WalletGroup = ({
  copy,
  options,
  testId,
  title,
}: {
  copy: WalletOptionCardsProps["copy"];
  options: WalletOption[];
  testId: string;
  title: string;
}) => (
  <section aria-label={title} data-testid={testId} style={groupStyle}>
    <div style={groupHeaderStyle}>
      <h4 style={groupLabelStyle}>{title}</h4>
      <p style={groupCountStyle}>{options.length}</p>
    </div>
    <div style={gridStyle}>
      {options.map((option) => (
        <WalletCard key={option.id} copy={copy} option={option} />
      ))}
    </div>
  </section>
);

export const WalletOptionCards = ({ copy, options }: WalletOptionCardsProps) => {
  const groupedOptions = groupWalletOptions(options);

  return (
    <section aria-label={copy.walletOptions} style={panelStyle}>
      <div>
        <h3 style={{ fontSize: 20, margin: 0 }}>{copy.walletOptions}</h3>
        <p style={{ color: "#475569", lineHeight: 1.5, margin: "6px 0 0" }}>
          {copy.messageBoundary}
        </p>
      </div>
      <p style={safetyStyle}>{copy.privateKeySafety}</p>
      <WalletGroup
        copy={copy}
        options={groupedOptions.recommended}
        testId="wallet-group-recommended"
        title={copy.walletGroupRecommended}
      />
      <WalletGroup
        copy={copy}
        options={groupedOptions.eoa}
        testId="wallet-group-eoa"
        title={copy.walletGroupEoa}
      />
      <WalletGroup
        copy={copy}
        options={groupedOptions.advanced}
        testId="wallet-group-advanced"
        title={copy.walletGroupAdvanced}
      />
    </section>
  );
};
