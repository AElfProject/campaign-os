import type { CSSProperties, ReactNode } from "react";
import { getLocalizedText, type NormalizedWalletSession, type SupportedLocale } from "../../domain";
import { WalletBadge, WalletVerificationBadge } from "../badges/Badges";

export type SurfaceKey = "project" | "user" | "admin";
export type ProductDestinationKey = "campaigns" | "create" | "analytics" | "export";

interface SurfaceOption {
  key: SurfaceKey;
  label: string;
}

interface ProductNavigationOption {
  key: ProductDestinationKey;
  label: string;
}

interface BrowserLocalePrompt {
  dismissLabel: string;
  message: string;
  onDismiss: () => void;
  onSwitch: () => void;
  switchLabel: string;
}

interface AppLayoutProps {
  brand: string;
  activeSurface: SurfaceKey;
  activeProductDestination: ProductDestinationKey;
  browserLocalePrompt?: BrowserLocalePrompt;
  children: ReactNode;
  locale: SupportedLocale;
  localeLabel: string;
  onProductDestinationChange: (destination: ProductDestinationKey) => void;
  shellTitle: string;
  onLocaleChange: (locale: SupportedLocale) => void;
  onSurfaceChange: (surface: SurfaceKey) => void;
  productNavigation: ProductNavigationOption[];
  surfaces: SurfaceOption[];
  walletSession: NormalizedWalletSession;
}

const pageStyle: CSSProperties = {
  background: "#f5f7fb",
  boxSizing: "border-box",
  color: "#071426",
  minHeight: "100vh",
  padding: "18px",
};

const shellStyle: CSSProperties = {
  display: "grid",
  gap: 18,
  margin: "0 auto",
  maxWidth: 1280,
};

const headerStyle: CSSProperties = {
  alignItems: "center",
  background: "#ffffff",
  border: "1px solid #dbe6f4",
  borderRadius: 8,
  display: "grid",
  gap: 14,
  gridTemplateColumns: "minmax(180px, 1fr) auto",
  padding: 16,
};

const brandStyle: CSSProperties = {
  display: "grid",
  gap: 3,
};

const eyebrowStyle: CSSProperties = {
  color: "#1c64f2",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 0,
  margin: 0,
  textTransform: "uppercase",
};

const titleStyle: CSSProperties = {
  fontSize: 22,
  lineHeight: 1.15,
  margin: 0,
};

const controlsStyle: CSSProperties = {
  alignItems: "center",
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  justifyContent: "flex-end",
};

const selectStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  color: "#0f172a",
  fontWeight: 700,
  minHeight: 38,
  padding: "0 10px",
};

const visuallyHiddenStyle: CSSProperties = {
  border: 0,
  clip: "rect(0 0 0 0)",
  height: 1,
  margin: -1,
  overflow: "hidden",
  padding: 0,
  position: "absolute",
  whiteSpace: "nowrap",
  width: 1,
};

const navStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe6f4",
  borderRadius: 8,
  display: "grid",
  gap: 8,
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  padding: 8,
};

const productNavStyle: CSSProperties = {
  ...navStyle,
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 170px), 1fr))",
};

const surfaceNavStyle: CSSProperties = {
  ...navStyle,
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
};

const buttonBaseStyle: CSSProperties = {
  border: "1px solid transparent",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 800,
  minHeight: 42,
  padding: "0 12px",
  wordBreak: "break-word",
};

const productButtonBaseStyle: CSSProperties = {
  ...buttonBaseStyle,
  fontSize: 15,
  minHeight: 48,
};

const promptStyle: CSSProperties = {
  alignItems: "center",
  background: "#eef5ff",
  border: "1px solid #bfd5ff",
  borderRadius: 8,
  color: "#0f172a",
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  justifyContent: "space-between",
  padding: "12px 14px",
};

const promptTextStyle: CSSProperties = {
  flex: "1 1 260px",
  fontSize: 14,
  fontWeight: 800,
  lineHeight: 1.35,
  margin: 0,
  minWidth: 0,
};

const promptActionsStyle: CSSProperties = {
  display: "flex",
  flex: "0 1 auto",
  flexWrap: "wrap",
  gap: 8,
};

const promptSwitchButtonStyle: CSSProperties = {
  ...buttonBaseStyle,
  background: "#1c64f2",
  color: "#ffffff",
  minHeight: 36,
};

const promptDismissButtonStyle: CSSProperties = {
  ...buttonBaseStyle,
  background: "#ffffff",
  borderColor: "#bfd5ff",
  color: "#1e3a8a",
  minHeight: 36,
};

const contentStyle: CSSProperties = {
  display: "grid",
  gap: 18,
};

const placeholderStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe6f4",
  borderRadius: 8,
  display: "grid",
  gap: 10,
  minHeight: 220,
  padding: 24,
};

const mediaStyle = `
@media (max-width: 760px) {
  [data-app-header] {
    grid-template-columns: 1fr !important;
  }

  [data-app-controls] {
    justify-content: flex-start !important;
  }
}
`;

export const AppLayout = ({
  activeSurface,
  activeProductDestination,
  brand,
  browserLocalePrompt,
  children,
  locale,
  localeLabel,
  onLocaleChange,
  onProductDestinationChange,
  onSurfaceChange,
  productNavigation,
  shellTitle,
  surfaces,
  walletSession,
}: AppLayoutProps) => (
  <main aria-label={brand} style={pageStyle}>
    <style>{mediaStyle}</style>
    <div style={shellStyle}>
      <header data-app-header style={headerStyle}>
        <div style={brandStyle}>
          <p style={eyebrowStyle}>{brand}</p>
          <h1 style={titleStyle}>{shellTitle}</h1>
        </div>
        <div data-app-controls style={controlsStyle}>
          <WalletBadge
            accountType={walletSession.accountType}
            walletSource={walletSession.walletSource}
          />
          <WalletVerificationBadge
            label={getLocalizedText(walletSession.statusMessage, locale)}
            status={walletSession.verificationStatus}
          />
          <span style={{ color: "#475569", fontSize: 12, fontWeight: 800 }}>
            {walletSession.displayAddress}
          </span>
          <span style={{ color: "#475569", fontSize: 12, fontWeight: 700 }}>
            {getLocalizedText(walletSession.statusMessage, locale)}
          </span>
          <label>
            <span style={visuallyHiddenStyle}>{localeLabel}</span>
            <select
              aria-label={localeLabel}
              onChange={(event) => onLocaleChange(event.target.value as SupportedLocale)}
              style={selectStyle}
              value={locale}
            >
              <option value="en-US">English</option>
              <option value="zh-CN">简体中文</option>
              <option value="zh-TW">繁體中文</option>
              <option value="ja-JP">日本語</option>
              <option value="ko-KR">한국어</option>
              <option value="vi-VN">Tiếng Việt</option>
              <option value="id-ID">Bahasa Indonesia</option>
              <option value="tr-TR">Turkish</option>
              <option value="es-ES">Spanish</option>
            </select>
          </label>
        </div>
      </header>

      {browserLocalePrompt ? (
        <aside aria-label={browserLocalePrompt.message} style={promptStyle}>
          <p style={promptTextStyle}>{browserLocalePrompt.message}</p>
          <div style={promptActionsStyle}>
            <button
              onClick={browserLocalePrompt.onSwitch}
              style={promptSwitchButtonStyle}
              type="button"
            >
              {browserLocalePrompt.switchLabel}
            </button>
            <button
              onClick={browserLocalePrompt.onDismiss}
              style={promptDismissButtonStyle}
              type="button"
            >
              {browserLocalePrompt.dismissLabel}
            </button>
          </div>
        </aside>
      ) : null}

      <nav aria-label="Campaign OS product navigation" style={productNavStyle}>
        {productNavigation.map((destination) => {
          const active = destination.key === activeProductDestination;

          return (
            <button
              aria-pressed={active}
              key={destination.key}
              onClick={() => onProductDestinationChange(destination.key)}
              style={{
                ...productButtonBaseStyle,
                background: active ? "#071426" : "#ffffff",
                borderColor: active ? "#071426" : "#b8c7da",
                color: active ? "#ffffff" : "#071426",
              }}
              type="button"
            >
              {destination.label}
            </button>
          );
        })}
      </nav>

      <nav aria-label="Campaign OS surfaces" style={surfaceNavStyle}>
        {surfaces.map((surface) => {
          const active = surface.key === activeSurface;

          return (
            <button
              aria-pressed={active}
              key={surface.key}
              onClick={() => onSurfaceChange(surface.key)}
              style={{
                ...buttonBaseStyle,
                background: active ? "#1c64f2" : "#f8fbff",
                borderColor: active ? "#1c64f2" : "#dbe6f4",
                color: active ? "#ffffff" : "#0f172a",
              }}
              type="button"
            >
              {surface.label}
            </button>
          );
        })}
      </nav>

      <section style={contentStyle}>{children}</section>
    </div>
  </main>
);

export const SurfacePlaceholder = ({
  action,
  description,
  title,
}: {
  action: string;
  description: string;
  title: string;
}) => (
  <article style={placeholderStyle}>
    <div>
      <p style={eyebrowStyle}>{action}</p>
      <h2 style={{ fontSize: 24, margin: "4px 0 0" }}>{title}</h2>
    </div>
    <p style={{ color: "#475569", lineHeight: 1.6, margin: 0 }}>{description}</p>
  </article>
);
