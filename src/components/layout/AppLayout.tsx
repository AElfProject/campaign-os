import type { CSSProperties, ReactNode } from "react";
import type { NormalizedWalletSession, SupportedLocale } from "../../domain";
import { WalletBadge } from "../badges/Badges";

export type SurfaceKey = "project" | "user" | "admin";

interface SurfaceOption {
  key: SurfaceKey;
  label: string;
}

interface AppLayoutProps {
  brand: string;
  activeSurface: SurfaceKey;
  children: ReactNode;
  locale: SupportedLocale;
  localeLabel: string;
  shellTitle: string;
  onLocaleChange: (locale: SupportedLocale) => void;
  onSurfaceChange: (surface: SurfaceKey) => void;
  surfaces: SurfaceOption[];
  walletSession: NormalizedWalletSession;
}

const pageStyle: CSSProperties = {
  background: "#f5f7fb",
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

const buttonBaseStyle: CSSProperties = {
  border: "1px solid transparent",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 800,
  minHeight: 42,
  padding: "0 12px",
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
  brand,
  children,
  locale,
  localeLabel,
  onLocaleChange,
  onSurfaceChange,
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
            </select>
          </label>
        </div>
      </header>

      <nav aria-label="Campaign OS surfaces" style={navStyle}>
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
