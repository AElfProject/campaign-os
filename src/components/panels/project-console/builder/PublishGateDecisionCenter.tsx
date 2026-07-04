import type { CSSProperties } from "react";
import {
  createPublishGateDecisionCenter,
  getLocalizedText,
  seededCampaignDraft,
  type CampaignDraft,
  type OwnerRole,
  type PublishGateApprovalRoute,
  type PublishGateItem,
  type ReadinessGroup,
  type SupportedLocale,
} from "../../../../domain";
import { PublishStateBadge } from "../../../badges/Badges";

type BusinessContentLocale = Exclude<SupportedLocale, "ja-JP" | "ko-KR" | "vi-VN" | "id-ID" | "tr-TR" | "es-ES">;

interface PublishGateDecisionCenterProps {
  draft?: CampaignDraft;
  locale: BusinessContentLocale;
}

const copy = {
  "en-US": {
    approvalRoutes: "Approval routes",
    approvalRouting: "Approval routing",
    blockers: "Blockers",
    boundary: "Boundary",
    gates: "Gate review",
    launchGate: "Launch gate",
    nextAction: "Next action",
    ownerRole: "Owner role",
    passed: "Passed",
    reason: "Reason",
    routeCount: "Approval routes",
    summary: "Summary",
    title: "Publish Gate Decision Center",
    warnings: "Warnings",
  },
  "zh-CN": {
    approvalRoutes: "审批路径",
    approvalRouting: "审批路由",
    blockers: "阻断项",
    boundary: "边界",
    gates: "门禁审核",
    launchGate: "发布门禁",
    nextAction: "下一步",
    ownerRole: "负责人角色",
    passed: "已通过",
    reason: "原因",
    routeCount: "审批路径",
    summary: "摘要",
    title: "发布门禁决策中心",
    warnings: "警告",
  },
  "zh-TW": {
    approvalRoutes: "審批路徑",
    approvalRouting: "審批路由",
    blockers: "阻斷項",
    boundary: "邊界",
    gates: "門禁審核",
    launchGate: "發布門禁",
    nextAction: "下一步",
    ownerRole: "負責人角色",
    passed: "已通過",
    reason: "原因",
    routeCount: "審批路徑",
    summary: "摘要",
    title: "發布門禁決策中心",
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

const groupLabels = {
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

const statusLabels = {
  "en-US": {
    blocker: "Blocker",
    passed: "Passed",
    warning: "Warning",
  },
  "zh-CN": {
    blocker: "阻断",
    passed: "已通过",
    warning: "警告",
  },
  "zh-TW": {
    blocker: "阻斷",
    passed: "已通過",
    warning: "警告",
  },
} satisfies Record<BusinessContentLocale, Record<PublishGateItem["status"], string>>;

const sectionStyle: CSSProperties = {
  display: "grid",
  gap: 14,
};

const headingRowStyle: CSSProperties = {
  alignItems: "start",
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  justifyContent: "space-between",
};

const badgeRowStyle: CSSProperties = {
  alignItems: "center",
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const gridStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
};

const routeGridStyle: CSSProperties = {
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

const summaryCardStyle: CSSProperties = {
  ...cardStyle,
  background: "#f8fbff",
};

const boundaryStyle: CSSProperties = {
  background: "#fff7ed",
  border: "1px solid #fed7aa",
  borderRadius: 8,
  color: "#7c2d12",
  display: "grid",
  gap: 6,
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
  fontSize: 24,
  fontWeight: 900,
  lineHeight: 1.1,
  margin: 0,
};

const bodyStyle: CSSProperties = {
  color: "#475569",
  lineHeight: 1.5,
  margin: 0,
};

const routeListStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  margin: 0,
  padding: 0,
};

const routeGateIdStyle: CSSProperties = {
  color: "#475569",
  fontSize: 12,
  fontWeight: 700,
  listStyle: "none",
};

const statusState = (status: PublishGateItem["status"] | PublishGateApprovalRoute["status"]) =>
  status === "blocker" ? "blocker" : status === "warning" ? "warning" : "ready";

const statusLabel = (
  status: PublishGateItem["status"] | PublishGateApprovalRoute["status"],
  locale: BusinessContentLocale,
) => {
  if (status === "ready") {
    return statusLabels[locale].passed;
  }

  return statusLabels[locale][status];
};

const GateCard = ({
  gate,
  locale,
}: {
  gate: PublishGateItem;
  locale: BusinessContentLocale;
}) => {
  const labels = copy[locale];

  return (
    <article style={cardStyle}>
      <span style={badgeRowStyle}>
        <PublishStateBadge label={statusLabel(gate.status, locale)} state={statusState(gate.status)} />
        <PublishStateBadge label={groupLabels[locale][gate.group]} state="ready" />
        <PublishStateBadge label={ownerRoleLabels[locale][gate.ownerRole]} state="ready" />
      </span>
      <div>
        <p style={labelStyle}>{labels.launchGate}</p>
        <p style={{ ...bodyStyle, color: "#071426", fontWeight: 800 }}>
          {getLocalizedText(gate.title, locale)}
        </p>
      </div>
      <div>
        <p style={labelStyle}>{labels.reason}</p>
        <p style={bodyStyle}>{getLocalizedText(gate.reason, locale)}</p>
      </div>
      <div>
        <p style={labelStyle}>{labels.nextAction}</p>
        <p style={bodyStyle}>
          {labels.nextAction}: {getLocalizedText(gate.nextAction, locale)}
        </p>
      </div>
    </article>
  );
};

const ApprovalRouteCard = ({
  locale,
  route,
}: {
  locale: BusinessContentLocale;
  route: PublishGateApprovalRoute;
}) => {
  const labels = copy[locale];

  return (
    <article style={cardStyle}>
      <span style={badgeRowStyle}>
        <PublishStateBadge label={statusLabel(route.status, locale)} state={statusState(route.status)} />
        <PublishStateBadge label={ownerRoleLabels[locale][route.ownerRole]} state="ready" />
      </span>
      <div>
        <p style={labelStyle}>{labels.ownerRole}</p>
        <p style={{ ...bodyStyle, color: "#071426", fontWeight: 800 }}>
          {getLocalizedText(route.label, locale)}
        </p>
      </div>
      <div>
        <p style={labelStyle}>{labels.summary}</p>
        <p style={bodyStyle}>{getLocalizedText(route.summary, locale)}</p>
      </div>
      <div>
        <p style={labelStyle}>{labels.nextAction}</p>
        <p style={bodyStyle}>{getLocalizedText(route.nextAction, locale)}</p>
      </div>
      <ul aria-label={`${ownerRoleLabels[locale][route.ownerRole]} gates`} style={routeListStyle}>
        {route.gateIds.map((gateId) => (
          <li key={gateId} style={routeGateIdStyle}>
            {gateId}
          </li>
        ))}
      </ul>
    </article>
  );
};

export const PublishGateDecisionCenter = ({
  draft = seededCampaignDraft,
  locale,
}: PublishGateDecisionCenterProps) => {
  const labels = copy[locale];
  const decisionCenter = createPublishGateDecisionCenter(draft);

  const stats = [
    {
      label: labels.blockers,
      state: "blocker" as const,
      value: decisionCenter.counts.blockers,
    },
    {
      label: labels.warnings,
      state: "warning" as const,
      value: decisionCenter.counts.warnings,
    },
    {
      label: labels.passed,
      state: "ready" as const,
      value: decisionCenter.counts.passed,
    },
    {
      label: labels.routeCount,
      state: "ready" as const,
      value: decisionCenter.approvalRoutes.length,
    },
  ];

  return (
    <section aria-label={labels.title} style={sectionStyle}>
      <div style={headingRowStyle}>
        <div>
          <p style={labelStyle}>{labels.launchGate}</p>
          <h3 style={{ fontSize: 20, lineHeight: 1.2, margin: "2px 0" }}>{labels.title}</h3>
          <p style={bodyStyle}>{getLocalizedText(decisionCenter.summary, locale)}</p>
        </div>
        <span style={badgeRowStyle}>
          <PublishStateBadge
            label={statusLabel(decisionCenter.launchState, locale)}
            state={decisionCenter.launchState}
          />
          <PublishStateBadge
            label={`${decisionCenter.counts.total} ${labels.launchGate}`}
            state={decisionCenter.ready ? "ready" : "warning"}
          />
        </span>
      </div>

      <div style={gridStyle}>
        {stats.map((stat) => (
          <article key={stat.label} style={summaryCardStyle}>
            <span style={badgeRowStyle}>
              <p style={labelStyle}>{stat.label}</p>
              <PublishStateBadge label={stat.label} state={stat.state} />
            </span>
            <p style={valueStyle}>{stat.value}</p>
          </article>
        ))}
      </div>

      <article aria-label={labels.boundary} style={boundaryStyle}>
        <p style={{ ...labelStyle, color: "#9a3412" }}>{labels.boundary}</p>
        <p style={{ ...bodyStyle, color: "#7c2d12" }}>
          {getLocalizedText(decisionCenter.boundary, locale)}
        </p>
      </article>

      <div>
        <div style={{ ...headingRowStyle, marginBottom: 10 }}>
          <h4 style={{ fontSize: 16, lineHeight: 1.2, margin: 0 }}>{labels.gates}</h4>
          <PublishStateBadge label={labels.launchGate} state={decisionCenter.launchState} />
        </div>
        <div style={gridStyle}>
          {decisionCenter.gates.map((gate) => (
            <GateCard key={gate.id} gate={gate} locale={locale} />
          ))}
        </div>
      </div>

      <div aria-label={labels.approvalRouting}>
        <div style={{ ...headingRowStyle, marginBottom: 10 }}>
          <h4 style={{ fontSize: 16, lineHeight: 1.2, margin: 0 }}>{labels.approvalRouting}</h4>
          <PublishStateBadge label={labels.approvalRoutes} state="ready" />
        </div>
        <div style={routeGridStyle}>
          {decisionCenter.approvalRoutes.map((route) => (
            <ApprovalRouteCard key={route.ownerRole} locale={locale} route={route} />
          ))}
        </div>
      </div>
    </section>
  );
};
