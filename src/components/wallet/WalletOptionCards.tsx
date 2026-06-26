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

export const WalletOptionCards = ({ copy, options }: WalletOptionCardsProps) => (
  <section aria-label={copy.walletOptions} style={panelStyle}>
    <div>
      <h3 style={{ fontSize: 20, margin: 0 }}>{copy.walletOptions}</h3>
      <p style={{ color: "#475569", lineHeight: 1.5, margin: "6px 0 0" }}>
        {copy.messageBoundary}
      </p>
    </div>
    <p style={safetyStyle}>{copy.privateKeySafety}</p>
    <div style={gridStyle}>
      {options.map((option) => (
        <article key={option.id} style={cardStyle}>
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
      ))}
    </div>
  </section>
);
