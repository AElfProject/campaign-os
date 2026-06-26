import type { CSSProperties } from "react";
import {
  campaignDetail,
  getLocalizedText,
  type CampaignShellDetail,
  type LocaleStatus,
  type SupportedLocale,
} from "../../../domain";
import {
  ContractModeBadge,
  LocaleStatusBadge,
  PublishStateBadge,
  ReviewSeverityBadge,
  WalletCompatibilityBadge,
} from "../../badges/Badges";
import { projectConsoleCopy } from "./copy";

interface ProjectConsoleProps {
  locale: SupportedLocale;
  campaign?: CampaignShellDetail;
}

const panelStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe6f4",
  borderRadius: 8,
  display: "grid",
  gap: 16,
  padding: 18,
};

const headingRowStyle: CSSProperties = {
  alignItems: "start",
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  justifyContent: "space-between",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
};

const cardStyle: CSSProperties = {
  background: "#f8fbff",
  border: "1px solid #dbe6f4",
  borderRadius: 8,
  display: "grid",
  gap: 6,
  minHeight: 104,
  padding: 14,
};

const statLabelStyle: CSSProperties = {
  color: "#64748b",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 0,
  margin: 0,
  textTransform: "uppercase",
};

const statValueStyle: CSSProperties = {
  color: "#071426",
  fontSize: 24,
  fontWeight: 900,
  lineHeight: 1.1,
  margin: 0,
};

const sectionGridStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
};

const workflowStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe6f4",
  borderRadius: 8,
  display: "grid",
  gap: 12,
  minHeight: 172,
  padding: 16,
};

const actionButtonStyle: CSSProperties = {
  alignSelf: "end",
  background: "#071426",
  border: "1px solid #071426",
  borderRadius: 8,
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 800,
  minHeight: 38,
  padding: "0 12px",
  width: "fit-content",
};

const listStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  margin: 0,
  padding: 0,
};

const listItemStyle: CSSProperties = {
  alignItems: "center",
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  justifyContent: "space-between",
  listStyle: "none",
};

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const formatNumber = (value: number) => new Intl.NumberFormat("en-US").format(value);

const contractModeLabel = (
  mode: CampaignShellDetail["contractMode"],
  labels: { contractModeOffChain: string },
) => {
  if (mode === "OFF_CHAIN_MVP") {
    return labels.contractModeOffChain;
  }

  return mode.replace(/_/g, " ");
};

const reviewStatusLabel = (
  status: string | undefined,
  labels: { approved: string; open: string },
) => {
  if (status === "approved") {
    return labels.approved;
  }

  if (status === "open") {
    return labels.open;
  }

  return status?.replace(/_/g, " ") ?? labels.open;
};

const localeStatusLabel = (
  status: LocaleStatus,
  labels: { aiDraft: string; fallback: string; published: string; reviewed: string },
) => {
  if (status === "ai_draft") {
    return labels.aiDraft;
  }

  if (status === "reviewed") {
    return labels.reviewed;
  }

  if (status === "fallback") {
    return labels.fallback;
  }

  return labels.published;
};

export const ProjectConsole = ({
  campaign = campaignDetail,
  locale,
}: ProjectConsoleProps) => {
  const copy = projectConsoleCopy[locale];
  const title = getLocalizedText(campaign.title, locale);
  const subtitle = getLocalizedText(campaign.subtitle, locale);
  const firstParticipant = campaign.participants[0];
  const secondParticipant = campaign.participants[1];
  const contractReview = campaign.reviewItems.find((item) => item.type === "CONTRACT_IMPACT");
  const exportReview = campaign.reviewItems.find((item) => item.type === "EXPORT_READY");
  const warningCount = campaign.publishReadiness.warnings.length;
  const blockerCount = campaign.publishReadiness.blockers.length;

  const stats = [
    {
      label: copy.connectedWallets,
      value: formatNumber(campaign.metrics.connectedWallets),
      detail: `${campaign.metrics.aaWallets} AA / ${campaign.metrics.eoaWallets} EOA`,
    },
    {
      label: copy.walletSplit,
      value: `${campaign.metrics.aaWallets}/${campaign.metrics.eoaWallets}`,
      detail: "Portkey AA + EOA extension",
    },
    {
      label: copy.completionRate,
      value: formatPercent(campaign.metrics.completionRate),
      detail: `${campaign.tasks.length} ${copy.taskCount}`,
    },
    {
      label: copy.localeCoverage,
      value: formatPercent(campaign.metrics.localeCoverage),
      detail: "en-US / zh-CN",
    },
    {
      label: copy.riskQueue,
      value: String(campaign.metrics.riskReviewQueue),
      detail: secondParticipant?.riskFlags[0] ?? "No active flag",
    },
    {
      label: copy.exportReady,
      value: formatNumber(campaign.metrics.exportReadyWinners),
      detail: copy.exportDisclaimer,
    },
  ];

  const workflows = [
    {
      title: copy.aiPlanner,
      state: copy.aiPlannerState,
      action: copy.aiPlannerAction,
      extra: <ReviewSeverityBadge label={copy.warning} severity="warning" />,
    },
    {
      title: copy.taskBuilder,
      state: copy.taskBuilderState,
      action: copy.taskBuilderAction,
      extra: <WalletCompatibilityBadge compatibility={campaign.tasks[0]?.walletCompatibility ?? "ANY"} />,
    },
    {
      title: copy.rewardsEligibility,
      state: copy.rewardsEligibilityState,
      action: copy.rewardsEligibilityAction,
      extra: (
        <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <PublishStateBadge
            label={firstParticipant?.eligible ? copy.eligible : copy.ineligible}
            state={firstParticipant?.eligible ? "ready" : "warning"}
          />
          <PublishStateBadge
            label={secondParticipant?.eligible ? copy.eligible : copy.missingTask}
            state={secondParticipant?.eligible ? "ready" : "warning"}
          />
        </span>
      ),
    },
    {
      title: copy.translationReview,
      state: copy.translationReviewState,
      action: copy.translationReviewAction,
      extra: (
        <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <LocaleStatusBadge label={`en-US ${copy.published}`} status="published" />
          <LocaleStatusBadge label={`zh-CN ${copy.aiDraft}`} status="ai_draft" />
        </span>
      ),
    },
    {
      title: copy.contractImpact,
      state: copy.contractImpactState,
      action: copy.contractImpactAction,
      extra: (
        <ReviewSeverityBadge
          label={reviewStatusLabel(contractReview?.status, copy)}
          severity={contractReview?.severity ?? "info"}
        />
      ),
    },
    {
      title: copy.analyticsExport,
      state: copy.analyticsExportState,
      action: copy.analyticsExportAction,
      extra: (
        <ReviewSeverityBadge
          label={reviewStatusLabel(exportReview?.status, copy)}
          severity={exportReview?.severity ?? "info"}
        />
      ),
    },
  ];

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section style={panelStyle}>
        <div style={headingRowStyle}>
          <div>
            <p style={statLabelStyle}>{copy.dashboardTitle}</p>
            <h2 style={{ fontSize: 30, lineHeight: 1.1, margin: "4px 0" }}>{title}</h2>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>{subtitle}</p>
          </div>
          <span style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8 }}>
            <PublishStateBadge label={copy.active} state="ready" />
            <ContractModeBadge
              label={contractModeLabel(campaign.contractMode, copy)}
              mode={campaign.contractMode}
            />
          </span>
        </div>

        <div aria-label="Project Console dashboard metrics" style={gridStyle}>
          {stats.map((stat) => (
            <article key={stat.label} style={cardStyle}>
              <p style={statLabelStyle}>{stat.label}</p>
              <p style={statValueStyle}>{stat.value}</p>
              <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.4, margin: 0 }}>
                {stat.detail}
              </p>
            </article>
          ))}
          <article style={cardStyle}>
            <p style={statLabelStyle}>{copy.contractMode}</p>
            <p style={{ ...statValueStyle, fontSize: 19 }}>
              {contractModeLabel(campaign.contractMode, copy)}
            </p>
            <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.4, margin: 0 }}>
              {copy.contractImpactState}
            </p>
          </article>
          <article style={cardStyle}>
            <p style={statLabelStyle}>{copy.readiness}</p>
            <p style={{ ...statValueStyle, fontSize: 19 }}>
              {blockerCount} {copy.blocker} / {warningCount} {copy.warning}
            </p>
            <ul style={listStyle}>
              {campaign.publishReadiness.warnings.slice(0, 1).map((warning) => (
                <li key={warning} style={listItemStyle}>
                  <span style={{ color: "#475569", fontSize: 13 }}>
                    {locale === "zh-CN" ? copy.zhFallbackWarning : warning}
                  </span>
                  <PublishStateBadge label={copy.warning} state="warning" />
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section aria-label="Project Console workflow sections" style={sectionGridStyle}>
        {workflows.map((workflow) => (
          <article key={workflow.title} style={workflowStyle}>
            <div style={headingRowStyle}>
              <h3 style={{ fontSize: 18, lineHeight: 1.2, margin: 0 }}>{workflow.title}</h3>
              {workflow.extra}
            </div>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>{workflow.state}</p>
            <button style={actionButtonStyle} type="button">
              {workflow.action}
            </button>
          </article>
        ))}
      </section>

      <section aria-label="Task readiness preview" style={panelStyle}>
        <div style={headingRowStyle}>
          <h3 style={{ fontSize: 20, margin: 0 }}>{copy.taskBuilder}</h3>
          <span style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
            {campaign.tasks.length} tasks
          </span>
        </div>
        <ul style={listStyle}>
          {campaign.tasks.map((task) => (
            <li key={task.id} style={listItemStyle}>
              <span style={{ display: "grid", gap: 3 }}>
                <strong>{getLocalizedText(task.title, locale)}</strong>
                <span style={{ color: "#64748b", fontSize: 13 }}>
                  {task.verificationType} · {task.points} pts · {task.riskLevel}
                </span>
              </span>
              <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <WalletCompatibilityBadge compatibility={task.walletCompatibility} />
                <LocaleStatusBadge
                  label={`zh-CN ${localeStatusLabel(task.localeStatus["zh-CN"], copy)}`}
                  status={task.localeStatus["zh-CN"]}
                />
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};
