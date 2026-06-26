import type { CSSProperties } from "react";
import {
  getLocalizedText,
  taskTemplateLibrary,
  type SupportedLocale,
  type TaskTemplate,
} from "../../../../domain";
import { LocaleStatusBadge, WalletCompatibilityBadge } from "../../../badges/Badges";

interface TaskTemplateLibraryProps {
  locale: SupportedLocale;
  templates?: TaskTemplate[];
}

const copy = {
  "en-US": {
    defaultPoints: "Default points",
    optional: "Optional",
    required: "Required",
    risk: "Risk",
    title: "Task template library",
    verification: "Verification",
  },
  "zh-CN": {
    defaultPoints: "默认积分",
    optional: "可选",
    required: "必做",
    risk: "风险",
    title: "任务模板库",
    verification: "验证方式",
  },
} satisfies Record<SupportedLocale, Record<string, string>>;

const sectionStyle: CSSProperties = {
  display: "grid",
  gap: 14,
};

const gridStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
};

const cardStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe6f4",
  borderRadius: 8,
  display: "grid",
  gap: 10,
  minWidth: 0,
  padding: 14,
};

const labelStyle: CSSProperties = {
  color: "#64748b",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 0,
  margin: 0,
  textTransform: "uppercase",
};

const valueStyle: CSSProperties = {
  color: "#071426",
  fontSize: 15,
  fontWeight: 800,
  lineHeight: 1.35,
  margin: 0,
};

const metaGridStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
};

const badgeRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
};

export const TaskTemplateLibrary = ({
  locale,
  templates = taskTemplateLibrary,
}: TaskTemplateLibraryProps) => {
  const labels = copy[locale];

  return (
    <section aria-label={labels.title} style={sectionStyle}>
      <h3 style={{ fontSize: 20, lineHeight: 1.2, margin: 0 }}>{labels.title}</h3>
      <div style={gridStyle}>
        {templates.map((template) => (
          <article key={template.id} style={cardStyle}>
            <div>
              <p style={labelStyle}>{template.category}</p>
              <h4 style={{ fontSize: 17, lineHeight: 1.25, margin: "4px 0" }}>
                {getLocalizedText(template.title, locale)}
              </h4>
              <p style={{ color: "#475569", lineHeight: 1.45, margin: 0 }}>
                {getLocalizedText(template.description, locale)}
              </p>
            </div>
            <div style={metaGridStyle}>
              <div>
                <p style={labelStyle}>{labels.verification}</p>
                <p style={valueStyle}>{template.verificationType}</p>
              </div>
              <div>
                <p style={labelStyle}>{labels.defaultPoints}</p>
                <p style={valueStyle}>{template.defaultPoints}</p>
              </div>
              <div>
                <p style={labelStyle}>{labels.risk}</p>
                <p style={valueStyle}>{template.riskLevel}</p>
              </div>
              <div>
                <p style={labelStyle}>{template.requiredByDefault ? labels.required : labels.optional}</p>
                <p style={valueStyle}>{template.requiredByDefault ? labels.required : labels.optional}</p>
              </div>
            </div>
            <span style={badgeRowStyle}>
              <WalletCompatibilityBadge compatibility={template.walletCompatibility} />
              <LocaleStatusBadge
                label={`en-US ${template.localeReadiness["en-US"]}`}
                status={template.localeReadiness["en-US"]}
              />
              <LocaleStatusBadge
                label={`zh-CN ${template.localeReadiness["zh-CN"]}`}
                status={template.localeReadiness["zh-CN"]}
              />
            </span>
          </article>
        ))}
      </div>
    </section>
  );
};
