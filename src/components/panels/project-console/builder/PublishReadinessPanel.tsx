import type { CSSProperties } from "react";
import {
  computeBuilderPublishReadiness,
  getLocalizedText,
  seededCampaignDraft,
  type CampaignDraft,
  type OwnerRole,
  type ReadinessCheck,
  type ReadinessGroup,
  type SupportedLocale,
} from "../../../../domain";
import { PublishStateBadge } from "../../../badges/Badges";

type BusinessContentLocale = Exclude<SupportedLocale, "ja-JP" | "ko-KR" | "vi-VN">;

interface PublishReadinessPanelProps {
  draft?: CampaignDraft;
  locale: BusinessContentLocale;
}

const copy = {
  "en-US": {
    blockers: "Blockers",
    nextAction: "Next action",
    passed: "Passed checks",
    ready: "Ready for publish",
    reason: "Reason",
    title: "Publish readiness",
    warnings: "Warnings",
  },
  "zh-CN": {
    blockers: "阻断项",
    nextAction: "下一步",
    passed: "已通过检查",
    ready: "可发布",
    reason: "原因",
    title: "发布准备度",
    warnings: "警告",
  },
  "zh-TW": {
    blockers: "阻斷項",
    nextAction: "下一步",
    passed: "已通過檢查",
    ready: "可發布",
    reason: "原因",
    title: "發布準備度",
    warnings: "警告",
  },
} satisfies Record<BusinessContentLocale, Record<string, string>>;

const ownerRoleLabels = {
  "en-US": {
    contract_reviewer: "Contract reviewer",
    internal_operator: "Internal operator",
    project_owner: "Project owner",
  },
  "zh-CN": {
    contract_reviewer: "合约审核人",
    internal_operator: "内部运营",
    project_owner: "项目方",
  },
  "zh-TW": {
    contract_reviewer: "合約審核人",
    internal_operator: "內部營運",
    project_owner: "專案方",
  },
} satisfies Record<BusinessContentLocale, Record<OwnerRole, string>>;

const readinessGroupLabels = {
  "en-US": {
    basics: "Basics",
    contract: "Contract",
    export: "Export",
    i18n: "i18n",
    rewards: "Rewards",
    risk: "Risk",
    tasks: "Tasks",
    wallet: "Wallet",
  },
  "zh-CN": {
    basics: "基础信息",
    contract: "合约",
    export: "导出",
    i18n: "多语言",
    rewards: "奖励",
    risk: "风险",
    tasks: "任务",
    wallet: "钱包",
  },
  "zh-TW": {
    basics: "基礎資訊",
    contract: "合約",
    export: "匯出",
    i18n: "多語言",
    rewards: "獎勵",
    risk: "風險",
    tasks: "任務",
    wallet: "錢包",
  },
} satisfies Record<BusinessContentLocale, Record<ReadinessGroup, string>>;

const sectionStyle: CSSProperties = {
  display: "grid",
  gap: 14,
};

const gridStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
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

const bodyStyle: CSSProperties = {
  color: "#475569",
  lineHeight: 1.5,
  margin: 0,
};

const listStyle: CSSProperties = {
  display: "grid",
  gap: 10,
  margin: 0,
  padding: 0,
};

const checkCardStyle: CSSProperties = {
  border: "1px solid #dbe6f4",
  borderRadius: 8,
  display: "grid",
  gap: 8,
  listStyle: "none",
  minWidth: 0,
  padding: 12,
};

const badgeRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const statusLabel = (check: ReadinessCheck, locale: BusinessContentLocale) => {
  if (check.status === "blocker") {
    return copy[locale].blockers;
  }

  if (check.status === "warning") {
    return copy[locale].warnings;
  }

  return copy[locale].passed;
};

const statusState = (check: ReadinessCheck) =>
  check.status === "blocker" ? "blocker" : check.status === "warning" ? "warning" : "ready";

const CheckList = ({
  checks,
  locale,
}: {
  checks: ReadinessCheck[];
  locale: BusinessContentLocale;
}) => {
  const labels = copy[locale];

  return (
    <ul style={listStyle}>
      {checks.map((check) => (
        <li key={check.id} style={checkCardStyle}>
          <span style={badgeRowStyle}>
            <PublishStateBadge label={statusLabel(check, locale)} state={statusState(check)} />
            <PublishStateBadge label={readinessGroupLabels[locale][check.group]} state="ready" />
            <PublishStateBadge label={ownerRoleLabels[locale][check.ownerRole]} state="ready" />
          </span>
          <p style={labelStyle}>{labels.reason}</p>
          <p style={bodyStyle}>{getLocalizedText(check.reason, locale)}</p>
          <p style={labelStyle}>{labels.nextAction}</p>
          <p style={bodyStyle}>{getLocalizedText(check.nextAction, locale)}</p>
        </li>
      ))}
    </ul>
  );
};

export const PublishReadinessPanel = ({
  draft = seededCampaignDraft,
  locale,
}: PublishReadinessPanelProps) => {
  const labels = copy[locale];
  const readiness = computeBuilderPublishReadiness(draft);

  return (
    <section aria-label={labels.title} style={sectionStyle}>
      <div style={badgeRowStyle}>
        <h3 style={{ fontSize: 20, lineHeight: 1.2, margin: 0 }}>{labels.title}</h3>
        <PublishStateBadge
          label={readiness.ready ? labels.ready : labels.blockers}
          state={readiness.ready ? "ready" : "blocker"}
        />
      </div>
      <div style={gridStyle}>
        <article style={cardStyle}>
          <p style={labelStyle}>{labels.blockers}</p>
          <CheckList checks={readiness.blockers} locale={locale} />
        </article>
        <article style={cardStyle}>
          <p style={labelStyle}>{labels.warnings}</p>
          <CheckList checks={readiness.warnings} locale={locale} />
        </article>
        <article style={cardStyle}>
          <p style={labelStyle}>{labels.passed}</p>
          <CheckList checks={readiness.passed} locale={locale} />
        </article>
      </div>
    </section>
  );
};
