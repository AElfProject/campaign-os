import type { CSSProperties } from "react";
import {
  createAiContentPackWorkbench,
  createApiSkillContractSurface,
  createCampaignOsLocalService,
  campaignDetail,
  createProjectCampaignCommandCenter,
  createVerificationCoverageSummary,
  getLocalizedText,
  seededCampaignDraft,
  type AiContentArtifactLifecycle,
  type AiContentQualityGateStatus,
  type AiContentReleaseActionState,
  type ApiSkillContractReadiness,
  type CampaignShellDetail,
  type LocaleStatus,
  type SupportedLocale,
} from "../../../domain";
import {
  Badge,
  ContractModeBadge,
  LocaleStatusBadge,
  PublishStateBadge,
  ReviewSeverityBadge,
  WalletCompatibilityBadge,
} from "../../badges/Badges";
import { CampaignBuilderPanel } from "./builder/CampaignBuilderPanel";
import { I18nContractReadiness } from "./builder/I18nContractReadiness";
import { PublishGateDecisionCenter } from "./builder/PublishGateDecisionCenter";
import { PublishReadinessPanel } from "./builder/PublishReadinessPanel";
import { RewardsEligibilityBuilder } from "./builder/RewardsEligibilityBuilder";
import { TaskTemplateLibrary } from "./builder/TaskTemplateLibrary";
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

const builderDetailsStyle: CSSProperties = {
  display: "grid",
  gap: 18,
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

const compactListStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  margin: 0,
  padding: 0,
};

const tableWrapStyle: CSSProperties = {
  overflowX: "auto",
  width: "100%",
};

const chipStyle: CSSProperties = {
  background: "#eef6ff",
  border: "1px solid #bfdbfe",
  borderRadius: 8,
  color: "#1e3a8a",
  fontSize: 12,
  fontWeight: 800,
  lineHeight: 1.2,
  listStyle: "none",
  padding: "6px 8px",
  wordBreak: "break-word",
};

const boundaryStyle: CSSProperties = {
  background: "#fff7ed",
  border: "1px solid #fed7aa",
  borderRadius: 8,
  color: "#9a3412",
  fontSize: 13,
  fontWeight: 800,
  lineHeight: 1.45,
  margin: 0,
  padding: 12,
};

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const formatNumber = (value: number) => new Intl.NumberFormat("en-US").format(value);

const commandStatusLabel = (
  status: CampaignShellDetail["status"],
  labels: {
    active: string;
    commandEnded: string;
    commandExported: string;
    commandScheduledDraft: string;
  },
) => {
  if (status === "live") {
    return labels.active;
  }

  if (status === "ended") {
    return labels.commandEnded;
  }

  if (status === "exported") {
    return labels.commandExported;
  }

  if (status === "scheduled" || status === "draft") {
    return labels.commandScheduledDraft;
  }

  return status.replace(/_/g, " ");
};

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

const readinessState = (readiness: ApiSkillContractReadiness) => {
  if (readiness === "blocked") {
    return "blocker";
  }

  return readiness === "ready" ? "ready" : "warning";
};

const readinessLabel = (
  readiness: ApiSkillContractReadiness,
  labels: {
    apiSkillReadinessBlocked: string;
    apiSkillReadinessLocalOnly: string;
    apiSkillReadinessReady: string;
    apiSkillReadinessReviewRequired: string;
  },
) => {
  if (readiness === "ready") {
    return labels.apiSkillReadinessReady;
  }

  if (readiness === "local_only") {
    return labels.apiSkillReadinessLocalOnly;
  }

  return readiness === "review_required"
    ? labels.apiSkillReadinessReviewRequired
    : labels.apiSkillReadinessBlocked;
};

const serviceApiGroupLabel = (group: string) => {
  if (group === "task_verification") {
    return "task verification";
  }

  if (group === "content_generation") {
    return "content";
  }

  if (group === "campaign_summary") {
    return "summary";
  }

  if (group === "wallet_session") {
    return "wallet session";
  }

  return group.replace(/_/g, " ");
};

const serviceFieldGroupLabel = (group: string) => {
  if (group === "wallet") {
    return "wallet field";
  }

  return group;
};

const readableCode = (value: string) => value.replace(/_/g, " ");

const aiContentLifecycleState = (lifecycle: AiContentArtifactLifecycle) =>
  lifecycle === "human_approved" || lifecycle === "schedule_intent" || lifecycle === "publish_intent"
    ? "ready"
    : "warning";

const aiContentQualityGateState = (status: AiContentQualityGateStatus) => {
  if (status === "blocked") {
    return "blocker";
  }

  return status === "warning" ? "warning" : "ready";
};

const aiContentReleaseState = (state: AiContentReleaseActionState) =>
  state === "available" ? "ready" : "warning";

const aiContentLifecycleLabel = (
  lifecycle: AiContentArtifactLifecycle,
  labels: {
    aiContentLifecycleAiDraft: string;
    aiContentLifecycleEdited: string;
    aiContentLifecycleHumanApproved: string;
    aiContentLifecyclePublishIntent: string;
    aiContentLifecycleScheduleIntent: string;
  },
) => {
  if (lifecycle === "ai_draft") {
    return labels.aiContentLifecycleAiDraft;
  }

  if (lifecycle === "edited") {
    return labels.aiContentLifecycleEdited;
  }

  if (lifecycle === "human_approved") {
    return labels.aiContentLifecycleHumanApproved;
  }

  return lifecycle === "schedule_intent"
    ? labels.aiContentLifecycleScheduleIntent
    : labels.aiContentLifecyclePublishIntent;
};

const aiContentReleaseLabel = (
  state: AiContentReleaseActionState,
  readyLabel: string,
  blockedLabel: string,
) => (state === "available" ? readyLabel : blockedLabel);

const serviceCoverageLabels = [
  "wallet coverage",
  "task verification",
  "eligibility",
  "i18n",
  "analytics",
  "export",
  "content",
  "summary",
];

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
  const builderDraft = seededCampaignDraft;
  const apiSkillSurface = createApiSkillContractSurface();
  const localService = createCampaignOsLocalService();
  const serviceCoverageResult = localService.getCoverageSummary();
  const serviceCoverage = serviceCoverageResult.ok ? serviceCoverageResult.payload : undefined;
  const verificationCoverage = createVerificationCoverageSummary(
    campaign.tasks,
    campaign.participants,
  );
  const commandCenter = createProjectCampaignCommandCenter(campaign);
  const exportDecision = commandCenter.analyticsExport;
  const aiContentPack = createAiContentPackWorkbench(campaign);

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
      detail: campaign.supportedLocales.join(" / "),
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
      title: copy.builderEntryTitle,
      state: copy.builderEntryState,
      action: copy.builderEntryAction,
      extra: <PublishStateBadge label={copy.builderNoMissingBasics} state="ready" />,
    },
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
          <LocaleStatusBadge label={`zh-TW ${copy.fallback}`} status="fallback" />
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
                  {locale === "zh-CN" || locale === "zh-TW" ? copy.zhFallbackWarning : warning}
                  </span>
                  <PublishStateBadge label={copy.warning} state="warning" />
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section aria-label={copy.commandCenter} style={panelStyle}>
        <div style={headingRowStyle}>
          <div>
            <p style={statLabelStyle}>{copy.commandCenterSummary}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
              {copy.commandCenter}
            </h3>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
              {copy.commandCenterSubtitle}
            </p>
          </div>
          <PublishStateBadge
            label={`${commandCenter.summary.totalCampaigns} ${copy.commandCampaigns}`}
            state={commandCenter.summary.blockerCount > 0 ? "blocker" : "ready"}
          />
        </div>

        <div aria-label="Campaign Command Center summary" style={gridStyle}>
          {[
            [copy.commandLive, String(commandCenter.summary.liveCount)],
            [copy.commandScheduledDraft, String(commandCenter.summary.scheduledOrDraftCount)],
            [copy.commandEnded, String(commandCenter.summary.endedCount)],
            [copy.commandExported, String(commandCenter.summary.exportedCount)],
            [copy.commandWarnings, String(commandCenter.summary.warningCount)],
            [copy.commandBlockers, String(commandCenter.summary.blockerCount)],
          ].map(([label, value]) => (
            <article key={label} style={cardStyle}>
              <p style={statLabelStyle}>{label}</p>
              <p style={statValueStyle}>{value}</p>
            </article>
          ))}
        </div>

        <div style={sectionGridStyle}>
          {commandCenter.campaigns.map((item) => (
            <article key={item.id} style={workflowStyle}>
              <div style={headingRowStyle}>
                <div style={{ minWidth: 0 }}>
                  <p style={statLabelStyle}>{item.projectName}</p>
                  <strong style={{ color: "#071426", display: "block", fontSize: 18, lineHeight: 1.2, margin: "4px 0" }}>
                    {getLocalizedText(item.title, locale)}
                  </strong>
                </div>
                <PublishStateBadge
                  label={commandStatusLabel(item.status, copy)}
                  state={item.status === "live" || item.status === "exported" ? "ready" : "warning"}
                />
              </div>
              <div style={gridStyle}>
                {[
                  [copy.commandTimeWindow, getLocalizedText(item.timeWindow, locale)],
                  [copy.commandWallet, getLocalizedText(item.walletSplitLabel, locale)],
                  [copy.commandLocale, getLocalizedText(item.localeState, locale)],
                  [copy.commandRisk, getLocalizedText(item.riskReason, locale)],
                  [copy.commandExport, getLocalizedText(item.exportSummary, locale)],
                  [copy.commandPriority, item.priority],
                ].map(([label, value]) => (
                  <div key={`${item.id}-${label}`} style={{ minWidth: 0 }}>
                    <p style={statLabelStyle}>{label}</p>
                    <p style={{ color: "#071426", fontSize: 13, fontWeight: 800, lineHeight: 1.35, margin: 0 }}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>
              <div>
                <p style={statLabelStyle}>{copy.commandNextAction}</p>
                <strong style={{ display: "block", fontSize: 16, lineHeight: 1.35 }}>
                  {getLocalizedText(item.nextActionLabel, locale)}
                </strong>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: "4px 0 0" }}>
                  {getLocalizedText(item.nextActionDetail, locale)}
                </p>
              </div>
            </article>
          ))}
        </div>

        <p style={boundaryStyle}>{getLocalizedText(commandCenter.boundary, locale)}</p>
      </section>

      <section aria-label={copy.analyticsExportDecision} style={panelStyle}>
        <div style={headingRowStyle}>
          <div>
            <p style={statLabelStyle}>{copy.analyticsExport}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
              {copy.analyticsExportDecision}
            </h3>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
              {copy.analyticsExportDecisionSubtitle}
            </p>
          </div>
          <PublishStateBadge label={copy.analyticsExportAction} state="warning" />
        </div>

        <div style={gridStyle}>
          {exportDecision.kpis.map((kpi) => (
            <article key={kpi.id} style={cardStyle}>
              <p style={statLabelStyle}>{getLocalizedText(kpi.label, locale)}</p>
              <p style={statValueStyle}>{kpi.value}</p>
              <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.4, margin: 0 }}>
                {getLocalizedText(kpi.trend, locale)}
              </p>
            </article>
          ))}
        </div>

        <div style={sectionGridStyle}>
          <article style={workflowStyle}>
            <h4 style={{ fontSize: 18, margin: 0 }}>{copy.dropOffPoint}</h4>
            <p style={{ color: "#475569", lineHeight: 1.45, margin: 0 }}>
              {getLocalizedText(exportDecision.dropOffPoint, locale)}
            </p>
            <ol style={{ display: "grid", gap: 8, margin: 0, paddingInlineStart: 18 }}>
              {exportDecision.funnel.map((step) => (
                <li key={step.id} style={{ color: "#475569", fontSize: 13 }}>
                  <strong>{getLocalizedText(step.label, locale)}</strong>:{" "}
                  {formatNumber(step.count)} / {step.conversionRate}%
                </li>
              ))}
            </ol>
          </article>

          <article style={workflowStyle}>
            <h4 style={{ fontSize: 18, margin: 0 }}>{copy.rowStatusCounts}</h4>
            <p style={{ ...statValueStyle, fontSize: 22 }}>
              {exportDecision.readyRows} / {exportDecision.reviewRequiredRows} / {exportDecision.blockedRows}
            </p>
            <div style={gridStyle}>
              <div>
                <p style={statLabelStyle}>{copy.readyRows}</p>
                <PublishStateBadge label={String(exportDecision.readyRows)} state="ready" />
              </div>
              <div>
                <p style={statLabelStyle}>{copy.reviewRequiredRows}</p>
                <PublishStateBadge label={String(exportDecision.reviewRequiredRows)} state="warning" />
              </div>
              <div>
                <p style={statLabelStyle}>{copy.blockedRows}</p>
                <PublishStateBadge
                  label={String(exportDecision.blockedRows)}
                  state={exportDecision.blockedRows > 0 ? "blocker" : "ready"}
                />
              </div>
            </div>
            <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
              {copy.exportBatch}: {exportDecision.exportBatchId}
            </p>
          </article>

          <article style={workflowStyle}>
            <h4 style={{ fontSize: 18, margin: 0 }}>{copy.walletSplit}</h4>
            {exportDecision.walletSplit.map((split) => (
              <div key={split.id} style={listItemStyle}>
                <span>{split.label}</span>
                <strong>{split.count} / {split.percentage}%</strong>
              </div>
            ))}
            <h4 style={{ fontSize: 18, margin: "8px 0 0" }}>{copy.localeCoverage}</h4>
            {exportDecision.localeSplit.map((split) => (
              <div key={split.id} style={listItemStyle}>
                <span>{split.label}</span>
                <strong>{split.count} / {split.percentage}%</strong>
              </div>
            ))}
          </article>
        </div>

        <div style={{ ...cardStyle, minHeight: 0 }}>
          <p style={statLabelStyle}>{copy.evidenceCoverage}</p>
          <p style={{ color: "#475569", lineHeight: 1.45, margin: 0 }}>
            {getLocalizedText(exportDecision.evidenceCoverage, locale)}
          </p>
        </div>

        <div style={{ ...cardStyle, minHeight: 0 }}>
          <p style={statLabelStyle}>{copy.csvColumns}</p>
          <div style={tableWrapStyle}>
            <p style={{ color: "#071426", fontSize: 12, fontWeight: 800, lineHeight: 1.45, margin: 0, minWidth: 680 }}>
              {exportDecision.exportColumns.join(",")}
            </p>
          </div>
        </div>

        <p style={boundaryStyle}>{getLocalizedText(exportDecision.boundary, locale)}</p>
      </section>

      <section aria-label={copy.aiContentPack} style={panelStyle}>
        <div style={headingRowStyle}>
          <div>
            <p style={statLabelStyle}>{copy.aiContent}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
              {copy.aiContentPack}
            </h3>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
              {copy.aiContentPackSubtitle}
            </p>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Badge label={`${aiContentPack.summary.totalArtifacts} ${copy.aiContentArtifacts}`} tone="ai" />
            <PublishStateBadge
              label={`${aiContentPack.summary.blockedReleaseActions} ${copy.aiContentPublishBlocked}`}
              state={aiContentPack.summary.blockedReleaseActions > 0 ? "warning" : "ready"}
            />
          </span>
        </div>

        <p style={boundaryStyle}>{getLocalizedText(aiContentPack.boundary.body, locale)}</p>

        <div aria-label={copy.aiContentSummary} style={gridStyle}>
          {[
            [copy.aiContentTotalArtifacts, String(aiContentPack.summary.totalArtifacts)],
            [copy.aiContentHumanApproved, String(aiContentPack.summary.humanApproved)],
            [copy.aiContentAiDrafts, String(aiContentPack.summary.aiDrafts)],
            [copy.aiContentCopyReady, String(aiContentPack.summary.availableCopyActions)],
            [copy.aiContentPublishBlocked, String(aiContentPack.summary.blockedReleaseActions)],
            [copy.aiContentQualityBlockers, String(aiContentPack.summary.qualityGateBlockers)],
          ].map(([label, value]) => (
            <article key={label} style={cardStyle}>
              <p style={statLabelStyle}>{label}</p>
              <p style={statValueStyle}>{value}</p>
            </article>
          ))}
        </div>

        <div style={{ ...cardStyle, minHeight: 0 }}>
          <p style={statLabelStyle}>{copy.aiContentNextAction}</p>
          <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
            {getLocalizedText(aiContentPack.summary.nextAction, locale)}
          </p>
        </div>

        <div style={sectionGridStyle}>
          {aiContentPack.artifacts.map((artifact) => (
            <article key={artifact.id} style={workflowStyle}>
              <div style={headingRowStyle}>
                <div style={{ minWidth: 0 }}>
                  <p style={statLabelStyle}>{readableCode(artifact.type)}</p>
                  <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0" }}>
                    {getLocalizedText(artifact.title, locale)}
                  </h4>
                </div>
                <PublishStateBadge
                  label={aiContentLifecycleLabel(artifact.lifecycle, copy)}
                  state={aiContentLifecycleState(artifact.lifecycle)}
                />
              </div>

              <p style={{ color: "#475569", lineHeight: 1.45, margin: 0 }}>
                {getLocalizedText(artifact.purpose, locale)}
              </p>
              <p style={{ color: "#0f172a", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                {getLocalizedText(artifact.body, locale)}
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <Badge label={`${copy.aiContentChannel}: ${readableCode(artifact.channel)}`} tone="info" />
                <Badge
                  label={`${copy.aiContentRiskLevel}: ${artifact.riskLevel}`}
                  tone={artifact.riskLevel === "high" ? "warning" : "neutral"}
                />
                {Object.entries(artifact.localeStatus).map(([statusLocale, status]) => (
                  <LocaleStatusBadge
                    key={statusLocale}
                    label={`${statusLocale} ${localeStatusLabel(status, copy)}`}
                    status={status}
                  />
                ))}
                <ReviewSeverityBadge
                  label={artifact.reviewer ? `${copy.aiContentReviewer}: ${artifact.reviewer}` : copy.aiContentHumanReviewRequired}
                  severity={artifact.reviewer ? "info" : "warning"}
                />
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <PublishStateBadge
                  label={aiContentReleaseLabel(
                    artifact.actionPolicy.copy,
                    copy.aiContentCopyReady,
                    copy.aiContentHumanReviewRequired,
                  )}
                  state={aiContentReleaseState(artifact.actionPolicy.copy)}
                />
                <PublishStateBadge
                  label={aiContentReleaseLabel(
                    artifact.actionPolicy.schedule,
                    copy.aiContentScheduleReady,
                    copy.aiContentPublishBlocked,
                  )}
                  state={aiContentReleaseState(artifact.actionPolicy.schedule)}
                />
                <PublishStateBadge
                  label={aiContentReleaseLabel(
                    artifact.actionPolicy.publish,
                    copy.aiContentPublishReady,
                    copy.aiContentPublishBlocked,
                  )}
                  state={aiContentReleaseState(artifact.actionPolicy.publish)}
                />
              </div>

              <p style={{ color: "#0f172a", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                {copy.aiContentNextAction}: {getLocalizedText(artifact.actionPolicy.nextAction, locale)}
              </p>
              {artifact.actionPolicy.blockedReason ? (
                <p style={{ color: "#92400e", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                  {getLocalizedText(artifact.actionPolicy.blockedReason, locale)}
                </p>
              ) : null}
            </article>
          ))}
        </div>

        <div style={headingRowStyle}>
          <h3 style={{ fontSize: 20, margin: 0 }}>{copy.aiContentQualityGates}</h3>
          <PublishStateBadge
            label={`${aiContentPack.summary.qualityGateBlockers} ${copy.blocker}`}
            state={aiContentPack.summary.qualityGateBlockers > 0 ? "blocker" : "ready"}
          />
        </div>

        <div style={sectionGridStyle}>
          {aiContentPack.qualityGates.map((gate) => (
            <article key={gate.id} style={{ ...cardStyle, minHeight: 0 }}>
              <div style={headingRowStyle}>
                <strong>{getLocalizedText(gate.label, locale)}</strong>
                <PublishStateBadge
                  label={readableCode(gate.status)}
                  state={aiContentQualityGateState(gate.status)}
                />
              </div>
              <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                {getLocalizedText(gate.evidence, locale)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <CampaignBuilderPanel copy={copy} draft={builderDraft} locale={locale} />

      <div
        aria-label={
          locale === "en-US" ? "Campaign Builder detail sections" : "活动构建器详情区块"
        }
        style={builderDetailsStyle}
      >
        <TaskTemplateLibrary locale={locale} />
        <RewardsEligibilityBuilder draft={builderDraft} locale={locale} />
        <I18nContractReadiness campaign={campaign} locale={locale} />
        <PublishReadinessPanel draft={builderDraft} locale={locale} />
        <PublishGateDecisionCenter draft={builderDraft} locale={locale} />
      </div>

      {serviceCoverage && (
        <section aria-label={copy.serviceFacade} style={panelStyle}>
          <div style={headingRowStyle}>
            <div>
              <p style={statLabelStyle}>{copy.serviceCoverage}</p>
              <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
                {copy.serviceFacade}
              </h3>
              <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
                {copy.serviceFacadeSubtitle}
              </p>
            </div>
            <PublishStateBadge
              label={serviceCoverage.blockedCount > 0 ? copy.serviceReadinessBlocked : copy.serviceReadinessReady}
              state={serviceCoverage.blockedCount > 0 ? "blocker" : "ready"}
            />
          </div>

          <div aria-label={copy.serviceCoverage} style={gridStyle}>
            {[
              {
                detail: serviceCoverage.serviceNames.slice(0, 3).join(", "),
                label: copy.serviceTotalServices,
                value: String(serviceCoverage.totalServices),
              },
              {
                detail: `${serviceCoverage.localOnlyCount} ${copy.serviceReadinessLocalOnly}`,
                label: copy.serviceReadinessReady,
                value: String(serviceCoverage.readyCount),
              },
              {
                detail: `${serviceCoverage.blockedCount} ${copy.serviceReadinessBlocked}`,
                label: copy.serviceReadinessReviewRequired,
                value: String(serviceCoverage.reviewRequiredCount),
              },
              {
                detail: copy.serviceBoundaryTitle,
                label: copy.serviceReadinessBlocked,
                value: String(serviceCoverage.blockedCount),
              },
            ].map((stat) => (
              <article key={stat.label} style={cardStyle}>
                <p style={statLabelStyle}>{stat.label}</p>
                <p style={statValueStyle}>{stat.value}</p>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.4, margin: 0 }}>
                  {stat.detail}
                </p>
              </article>
            ))}
          </div>

          <div style={sectionGridStyle}>
            <article style={{ ...workflowStyle, minHeight: 0 }}>
              <h4 style={{ fontSize: 18, margin: 0 }}>{copy.verificationCoverage}</h4>
              <div style={gridStyle}>
                <div>
                  <p style={statLabelStyle}>{copy.verificationManualReview}</p>
                  <p style={{ ...statValueStyle, fontSize: 18 }}>
                    {verificationCoverage.manualReviewCount}
                  </p>
                </div>
                <div>
                  <p style={statLabelStyle}>{copy.verificationRiskStates}</p>
                  <p style={{ ...statValueStyle, fontSize: 18 }}>
                    {verificationCoverage.riskFlags.length}
                  </p>
                </div>
              </div>
              <p style={statLabelStyle}>{copy.verificationProviderReadiness}</p>
              <ul style={compactListStyle}>
                {Object.entries(verificationCoverage.providerReadinessCounts)
                  .filter(([, count]) => count > 0)
                  .map(([readiness, count]) => (
                    <li key={readiness} style={chipStyle}>
                      {count} {readableCode(readiness)}
                    </li>
                  ))}
              </ul>
              <p style={statLabelStyle}>{copy.verificationEvidenceCategories}</p>
              <ul style={compactListStyle}>
                {verificationCoverage.evidenceSources.map((source) => (
                  <li key={source} style={chipStyle}>
                    {source}
                  </li>
                ))}
              </ul>
              <p style={{ color: "#92400e", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                {getLocalizedText(verificationCoverage.boundary, locale)}
              </p>
            </article>

            <article style={{ ...workflowStyle, minHeight: 0 }}>
              <h4 style={{ fontSize: 18, margin: 0 }}>{copy.serviceCoveredApiGroups}</h4>
              <ul style={compactListStyle}>
                {serviceCoverage.coveredApiGroups.map((group) => (
                  <li key={group} style={chipStyle}>
                    {serviceApiGroupLabel(group)}
                  </li>
                ))}
                {serviceCoverageLabels.map((label) => (
                  <li key={`coverage-${label}`} style={chipStyle}>
                    {label}
                  </li>
                ))}
              </ul>
            </article>

            <article style={{ ...workflowStyle, minHeight: 0 }}>
              <h4 style={{ fontSize: 18, margin: 0 }}>{copy.serviceCoveredFieldGroups}</h4>
              <ul style={compactListStyle}>
                {serviceCoverage.coveredFieldGroups.map((group) => (
                  <li key={group} style={chipStyle}>
                    {serviceFieldGroupLabel(group)}
                  </li>
                ))}
              </ul>
            </article>

            <article style={{ ...workflowStyle, minHeight: 0 }}>
              <h4 style={{ fontSize: 18, margin: 0 }}>{copy.serviceSampleResponses}</h4>
              <ul style={compactListStyle}>
                {[
                  ...serviceCoverage.sampleResponseIds,
                  "generateI18nDraft",
                  "getCampaignAnalytics",
                  "generateCampaignPosts",
                  "summarizeCampaign",
                ].map((sampleId) => (
                  <li key={sampleId} style={chipStyle}>
                    {sampleId}
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <div style={{ ...cardStyle, minHeight: 0 }}>
            <p style={statLabelStyle}>{copy.serviceBoundaryTitle}</p>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
              {copy.serviceBoundaryDetail}
            </p>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: "8px 0 0" }}>
              {getLocalizedText(serviceCoverage.boundary, locale)}
            </p>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: "8px 0 0" }}>
              {getLocalizedText(serviceCoverage.verificationBoundary, locale)}
            </p>
          </div>
        </section>
      )}

      <section aria-label={copy.apiSkillContracts} style={panelStyle}>
        <div style={headingRowStyle}>
          <div>
            <p style={statLabelStyle}>{copy.apiSkillReadiness}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: "4px 0" }}>
              {copy.apiSkillContracts}
            </h3>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
              {copy.apiSkillContractsSubtitle}
            </p>
          </div>
          <PublishStateBadge
            label={
              apiSkillSurface.summary.missingSkillIds.length === 0
                ? copy.apiSkillReadinessReady
                : copy.apiSkillReadinessBlocked
            }
            state={apiSkillSurface.summary.missingSkillIds.length === 0 ? "ready" : "blocker"}
          />
        </div>

        <div aria-label="API skill contract summary" style={gridStyle}>
          {[
            {
              detail: `${apiSkillSurface.summary.localOnlyCount} ${copy.apiSkillLocalOnly} / ${apiSkillSurface.summary.reviewRequiredCount} ${copy.apiSkillReview}`,
              label: copy.apiSkillTotal,
              value: String(apiSkillSurface.summary.totalContracts),
            },
            {
              detail: `${apiSkillSurface.summary.externalEvidenceCount} ${copy.apiSkillExternalEvidence}`,
              label: copy.apiSkillHighRisk,
              value: String(apiSkillSurface.summary.highRiskCount),
            },
            {
              detail: apiSkillSurface.coverage.coveredFieldGroups.join(", "),
              label: copy.apiSkillCoveredGroups,
              value: String(apiSkillSurface.coverage.coveredFieldGroups.length),
            },
            {
              detail:
                apiSkillSurface.summary.missingSkillIds.length === 0
                  ? copy.apiSkillReadinessReady
                  : apiSkillSurface.summary.missingSkillIds.join(", "),
              label: copy.apiSkillMissing,
              value: String(apiSkillSurface.summary.missingSkillIds.length),
            },
          ].map((stat) => (
            <article key={stat.label} style={cardStyle}>
              <p style={statLabelStyle}>{stat.label}</p>
              <p style={statValueStyle}>{stat.value}</p>
              <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.4, margin: 0 }}>
                {stat.detail}
              </p>
            </article>
          ))}
        </div>

        <div style={{ ...cardStyle, minHeight: 0 }}>
          <p style={statLabelStyle}>{copy.apiSkillBoundary}</p>
          <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
            {getLocalizedText(apiSkillSurface.boundary, locale)}
          </p>
        </div>

        <div style={sectionGridStyle}>
          {apiSkillSurface.contracts.map((contract) => (
            <article key={contract.id} style={workflowStyle}>
              <div style={headingRowStyle}>
                <div style={{ minWidth: 0 }}>
                  <p style={statLabelStyle}>{contract.id}</p>
                  <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0" }}>
                    {getLocalizedText(contract.title, locale)}
                  </h4>
                </div>
                <PublishStateBadge
                  label={readinessLabel(contract.readiness, copy)}
                  state={readinessState(contract.readiness)}
                />
              </div>
              <p style={{ color: "#475569", lineHeight: 1.45, margin: 0 }}>
                {getLocalizedText(contract.purpose, locale)}
              </p>
              <div style={{ display: "grid", gap: 8 }}>
                <div>
                  <p style={statLabelStyle}>{copy.apiSkillApiGroup}</p>
                  <p style={{ ...statValueStyle, fontSize: 15 }}>
                    {contract.apiGroup.replace(/_/g, " ")}
                  </p>
                </div>
                <div>
                  <p style={statLabelStyle}>{copy.apiSkillRisk}</p>
                  <p style={{ ...statValueStyle, fontSize: 15 }}>{contract.riskLevel}</p>
                </div>
              </div>
              <div>
                <p style={statLabelStyle}>{copy.apiSkillInputFields}</p>
                <ul style={compactListStyle}>
                  {contract.inputFields.map((fieldDef) => (
                    <li key={`${contract.id}-input-${fieldDef.name}`} style={chipStyle}>
                      {fieldDef.name}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p style={statLabelStyle}>{copy.apiSkillOutputFields}</p>
                <ul style={compactListStyle}>
                  {contract.outputFields.map((fieldDef) => (
                    <li key={`${contract.id}-output-${fieldDef.name}`} style={chipStyle}>
                      {fieldDef.name}
                    </li>
                  ))}
                </ul>
              </div>
              <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                <strong>{copy.apiSkillEvidence}: </strong>
                {contract.evidenceSources.join(", ")}
              </p>
              <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                <strong>{copy.apiSkillBoundary}: </strong>
                {getLocalizedText(contract.securityBoundary, locale)}
              </p>
              <p style={{ color: "#0f172a", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                {copy.apiSkillNextAction}: {getLocalizedText(contract.nextAction, locale)}
              </p>
            </article>
          ))}
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
                {Object.entries(task.localeStatus).map(([statusLocale, status]) => (
                  <LocaleStatusBadge
                    key={statusLocale}
                    label={`${statusLocale} ${localeStatusLabel(status, copy)}`}
                    status={status}
                  />
                ))}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};
