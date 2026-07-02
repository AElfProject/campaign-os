import type { CSSProperties } from "react";
import {
  computeBuilderPublishReadiness,
  createAiCampaignPlannerDecisionConsole,
  createAiPlannerLaunchDecision,
  createCampaignCreationWorkflowReadiness,
  getLocalizedText,
  seededCampaignDraft,
  type AiPlannerDecisionStatus,
  type CampaignCreationWorkflowState,
  type CampaignDraft,
  type OwnerRole,
  type ReadinessStatus,
  type SupportedLocale,
  walletPolicyOptions,
} from "../../../../domain";
import { LocaleStatusBadge, PublishStateBadge, WalletCompatibilityBadge } from "../../../badges/Badges";
import type { ProjectConsoleCopy } from "../copy";

interface CampaignBuilderPanelProps {
  copy: ProjectConsoleCopy;
  draft?: CampaignDraft;
  locale: SupportedLocale;
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

const summaryGridStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
};

const cardStyle: CSSProperties = {
  background: "#f8fbff",
  border: "1px solid #dbe6f4",
  borderRadius: 8,
  display: "grid",
  gap: 10,
  minWidth: 0,
  padding: 14,
};

const compactGridStyle: CSSProperties = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
};

const plannerGridStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
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
  fontSize: 16,
  fontWeight: 800,
  lineHeight: 1.35,
  margin: 0,
};

const bodyTextStyle: CSSProperties = {
  color: "#475569",
  lineHeight: 1.5,
  margin: 0,
};

const wrapTextStyle: CSSProperties = {
  color: "#475569",
  fontSize: 13,
  lineHeight: 1.45,
  overflowWrap: "anywhere",
  wordBreak: "break-word",
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

const plannerItemStyle: CSSProperties = {
  ...cardStyle,
  background: "#ffffff",
};

const ghostButtonStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  color: "#071426",
  cursor: "pointer",
  fontWeight: 800,
  minHeight: 38,
  padding: "0 12px",
};

const selectedButtonStyle: CSSProperties = {
  ...ghostButtonStyle,
  background: "#071426",
  borderColor: "#071426",
  color: "#ffffff",
};

const formatDate = (value: string, locale: SupportedLocale) =>
  new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value));

const formStateRows = (draft: CampaignDraft, copy: ProjectConsoleCopy) => [
  { label: copy.formObjective, ready: draft.formState.objectiveConfirmed },
  { label: copy.formTimeline, ready: draft.formState.timelineConfirmed },
  { label: copy.formWallet, ready: draft.formState.walletPolicyConfirmed },
  { label: copy.formReward, ready: draft.formState.rewardPlanConfirmed },
];

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
} satisfies Record<SupportedLocale, Record<OwnerRole, string>>;

const plannerStatusLabel = (
  status: AiPlannerDecisionStatus,
  copy: ProjectConsoleCopy,
) => {
  if (status === "ready") {
    return copy.aiPlannerReady;
  }
  if (status === "review_required") {
    return copy.aiPlannerReviewRequired;
  }
  if (status === "warning") {
    return copy.aiPlannerWarning;
  }

  return copy.aiPlannerBlocked;
};

const plannerStatusState = (status: AiPlannerDecisionStatus) =>
  status === "blocked" ? "blocker" : status === "warning" || status === "review_required" ? "warning" : "ready";

const workflowStatusLabel = (
  state: CampaignCreationWorkflowState,
  copy: ProjectConsoleCopy,
) => {
  if (state === "ready") {
    return copy.aiPlannerReady;
  }
  if (state === "review_required") {
    return copy.aiPlannerReviewRequired;
  }
  if (state === "warning") {
    return copy.aiPlannerWarning;
  }

  return copy.aiPlannerBlocked;
};

const workflowStatusState = (state: CampaignCreationWorkflowState) =>
  state === "blocked" ? "blocker" : state === "ready" ? "ready" : "warning";

const gateStatusLabel = (status: ReadinessStatus, copy: ProjectConsoleCopy) => {
  if (status === "blocker") {
    return copy.aiPlannerBlocked;
  }
  if (status === "warning") {
    return copy.aiPlannerWarning;
  }

  return copy.aiPlannerReady;
};

const gateStatusState = (status: ReadinessStatus) =>
  status === "blocker" ? "blocker" : status === "warning" ? "warning" : "ready";

const routeStatusState = (status: "ready" | "warning" | "blocked") =>
  status === "blocked" ? "blocker" : status;

const compactLocalizedText = (value: string) => value.replace(/_/g, " ");

const launchDecisionLocales = ["en-US", "zh-CN", "zh-TW"] as const satisfies readonly SupportedLocale[];

export const CampaignBuilderPanel = ({
  copy,
  draft = seededCampaignDraft,
  locale,
}: CampaignBuilderPanelProps) => {
  const readiness = computeBuilderPublishReadiness(draft);
  const planner = createAiCampaignPlannerDecisionConsole(draft);
  const launchDecision = createAiPlannerLaunchDecision(draft);
  const creationWorkflow = createCampaignCreationWorkflowReadiness(draft);
  const missingBasics = readiness.blockers.filter((check) => check.group === "basics");
  const campaignName = getLocalizedText(draft.campaignName, locale);
  const activePolicy = draft.walletPolicy;

  return (
    <section aria-label={copy.builderEntryTitle} style={panelStyle}>
      <div style={headingRowStyle}>
        <div>
          <p style={labelStyle}>{copy.builderEntryTitle}</p>
          <h3 style={{ fontSize: 24, lineHeight: 1.15, margin: "4px 0" }}>{copy.builderOverview}</h3>
          <p style={bodyTextStyle}>{copy.builderEntryState}</p>
        </div>
        <button style={selectedButtonStyle} type="button">
          {copy.builderEntryAction}
        </button>
      </div>

      <div style={summaryGridStyle}>
        <article style={cardStyle}>
          <div style={headingRowStyle}>
            <div>
              <p style={labelStyle}>{copy.builderOverview}</p>
              <p style={{ ...valueStyle, fontSize: 20 }}>{campaignName}</p>
            </div>
            <PublishStateBadge
              label={missingBasics.length > 0 ? copy.builderMissingBasics : copy.builderNoMissingBasics}
              state={missingBasics.length > 0 ? "blocker" : "ready"}
            />
          </div>
          <div style={compactGridStyle}>
            <span>
              <p style={labelStyle}>{copy.builderProject}</p>
              <p style={valueStyle}>{draft.projectName}</p>
            </span>
            <span>
              <p style={labelStyle}>{copy.builderObjective}</p>
              <p style={valueStyle}>{draft.objective}</p>
            </span>
            <span>
              <p style={labelStyle}>{copy.builderTimePeriod}</p>
              <p style={valueStyle}>
                {formatDate(draft.timePeriod.startTime, locale)} -{" "}
                {formatDate(draft.timePeriod.endTime, locale)}
              </p>
            </span>
            <span>
              <p style={labelStyle}>{copy.builderTargetUsers}</p>
              <p style={valueStyle}>{draft.targetUsers.join(" / ")}</p>
            </span>
          </div>
          <p style={bodyTextStyle}>{copy.builderCompletenessSummary}</p>
        </article>

        <article style={cardStyle}>
          <p style={labelStyle}>{copy.builderLocaleScope}</p>
          <p style={valueStyle}>{copy.builderLocaleScopeDetail}</p>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {draft.supportedLocales.map((supportedLocale) => (
              <PublishStateBadge key={supportedLocale} label={supportedLocale} state="ready" />
            ))}
          </span>
          <p style={bodyTextStyle}>
            {copy.builderCompleteness}: {readiness.passed.length} {copy.countPassed} /{" "}
            {readiness.warnings.length} {copy.countWarnings} / {readiness.blockers.length}{" "}
            {copy.countBlockers}
          </p>
        </article>
      </div>

      <section aria-label={copy.aiPlanner} style={{ display: "grid", gap: 12 }}>
        <div style={headingRowStyle}>
          <div>
            <p style={labelStyle}>{copy.aiPlanner}</p>
            <h3 style={{ fontSize: 20, lineHeight: 1.2, margin: "4px 0" }}>
              {copy.aiPlannerRecommendation}
            </h3>
            <p style={bodyTextStyle}>{getLocalizedText(planner.nextAction, locale)}</p>
          </div>
          <PublishStateBadge
            label={`${planner.counts.blocked} ${copy.countBlockers}`}
            state={planner.counts.blocked > 0 ? "blocker" : "ready"}
          />
        </div>

        <div style={summaryGridStyle}>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.builderAiPrompt}</p>
            <p style={bodyTextStyle}>{planner.summary.prompt}</p>
            <p style={labelStyle}>{copy.builderAiOutline}</p>
            <ul style={listStyle}>
              {planner.summary.generatedOutline.map((item) => (
                <li key={item} style={{ ...listItemStyle, alignItems: "start", justifyContent: "start" }}>
                  <span aria-hidden="true">-</span>
                  <span style={{ color: "#475569", fontSize: 13, lineHeight: 1.45 }}>{item}</span>
                </li>
              ))}
            </ul>
          </article>

          <article style={cardStyle}>
            <p style={labelStyle}>{copy.aiPlannerDecisionCounts}</p>
            <div style={compactGridStyle}>
              <span>
                <p style={labelStyle}>{copy.aiPlannerReady}</p>
                <p style={valueStyle}>{planner.counts.ready}</p>
              </span>
              <span>
                <p style={labelStyle}>{copy.aiPlannerReviewRequired}</p>
                <p style={valueStyle}>{planner.counts.reviewRequired}</p>
              </span>
              <span>
                <p style={labelStyle}>{copy.aiPlannerWarning}</p>
                <p style={valueStyle}>{planner.counts.warning}</p>
              </span>
              <span>
                <p style={labelStyle}>{copy.aiPlannerBlocked}</p>
                <p style={valueStyle}>{planner.counts.blocked}</p>
              </span>
            </div>
            <p style={labelStyle}>{copy.aiPlannerDefaultLocale}</p>
            <p style={valueStyle}>{planner.summary.defaultLocale}</p>
            <p style={labelStyle}>{copy.aiPlannerSupportedLocales}</p>
            <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {planner.summary.supportedLocales.map((supportedLocale) => (
                <PublishStateBadge key={supportedLocale} label={supportedLocale} state="ready" />
              ))}
            </span>
            <p style={labelStyle}>{copy.builderWalletPolicy}</p>
            <p style={bodyTextStyle}>
              {planner.summary.walletPolicy} · {getLocalizedText(planner.summary.recommendedWallet, locale)}
            </p>
          </article>
        </div>

        <div aria-label={copy.aiPlannerGroupList} style={plannerGridStyle}>
          {planner.groups.map((group) => (
            <article key={group.id} style={cardStyle}>
              <div>
                <p style={labelStyle}>{copy.aiPlannerRecommendation}</p>
                <h4 style={{ fontSize: 18, lineHeight: 1.25, margin: "4px 0" }}>
                  {getLocalizedText(group.title, locale)}
                </h4>
                <p style={bodyTextStyle}>{getLocalizedText(group.summary, locale)}</p>
              </div>
              <ul style={listStyle}>
                {group.items.map((item) => (
                  <li key={item.id} style={plannerItemStyle}>
                    <div style={headingRowStyle}>
                      <p style={valueStyle}>{getLocalizedText(item.label, locale)}</p>
                      <PublishStateBadge
                        label={plannerStatusLabel(item.status, copy)}
                        state={plannerStatusState(item.status)}
                      />
                    </div>
                    <p style={bodyTextStyle}>{getLocalizedText(item.rationale, locale)}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <PublishStateBadge label={ownerRoleLabels[locale][item.ownerRole]} state="ready" />
                      <PublishStateBadge
                        label={`${copy.aiPlannerConfidence}: ${item.confidence}`}
                        state="ready"
                      />
                    </div>
                    <p style={bodyTextStyle}>
                      <strong>{copy.aiPlannerNextAction}: </strong>
                      {getLocalizedText(item.nextAction, locale)}
                    </p>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <p style={{ ...bodyTextStyle, background: "#eef6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: 12 }}>
          <strong>{copy.aiPlannerBoundary}: </strong>
          {getLocalizedText(planner.boundary, locale)}
        </p>

        <section aria-label={copy.campaignCreationWorkflowReadiness} style={{ display: "grid", gap: 12 }}>
          <div style={headingRowStyle}>
            <div>
              <p style={labelStyle}>{copy.campaignCreationWorkflowReadiness}</p>
              <h3 style={{ fontSize: 20, lineHeight: 1.2, margin: "4px 0" }}>
                {copy.campaignCreationWorkflowReadiness}
              </h3>
              <p style={bodyTextStyle}>{copy.campaignCreationWorkflowSubtitle}</p>
            </div>
            <PublishStateBadge
              label={`${creationWorkflow.summary.blockedSteps} ${copy.countBlockers}`}
              state={creationWorkflow.summary.blockedSteps > 0 ? "blocker" : "ready"}
            />
          </div>

          <div style={summaryGridStyle}>
            {[
              [copy.campaignCreationWorkflowReadySteps, creationWorkflow.summary.readySteps],
              [copy.campaignCreationWorkflowReviewSteps, creationWorkflow.summary.reviewRequiredSteps],
              [copy.campaignCreationWorkflowWarningSteps, creationWorkflow.summary.warningSteps],
              [copy.campaignCreationWorkflowBlockedSteps, creationWorkflow.summary.blockedSteps],
              [copy.campaignCreationWorkflowInheritedGates, creationWorkflow.summary.inheritedGateCount],
            ].map(([label, value]) => (
              <article key={label} style={cardStyle}>
                <p style={labelStyle}>{label}</p>
                <p style={{ ...valueStyle, fontSize: 22 }}>{value}</p>
              </article>
            ))}
          </div>

          <div aria-label={copy.campaignCreationWorkflowStepList} style={plannerGridStyle}>
            {creationWorkflow.steps.map((step) => {
              const issueIds = [...step.blockerIds, ...step.warningIds];

              return (
                <article key={step.id} style={cardStyle}>
                  <div style={headingRowStyle}>
                    <div>
                      <p style={labelStyle}>
                        {copy.createStepPrefix} {step.order}
                      </p>
                      <h4 style={{ fontSize: 18, lineHeight: 1.25, margin: "4px 0" }}>
                        {getLocalizedText(step.title, locale)}
                      </h4>
                    </div>
                    <PublishStateBadge
                      label={workflowStatusLabel(step.state, copy)}
                      state={workflowStatusState(step.state)}
                    />
                  </div>
                  <p style={bodyTextStyle}>{getLocalizedText(step.summary, locale)}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <PublishStateBadge label={ownerRoleLabels[locale][step.ownerRole]} state="ready" />
                    {step.blockerIds.map((blockerId) => (
                      <PublishStateBadge key={`${step.id}-${blockerId}`} label={blockerId} state="blocker" />
                    ))}
                    {step.warningIds.map((warningId) => (
                      <PublishStateBadge key={`${step.id}-${warningId}`} label={warningId} state="warning" />
                    ))}
                    {issueIds.length === 0 ? (
                      <PublishStateBadge label={copy.campaignCreationWorkflowNoIssues} state="ready" />
                    ) : null}
                  </div>
                  <div style={compactGridStyle}>
                    <span>
                      <p style={labelStyle}>{copy.campaignCreationWorkflowEvidence}</p>
                      <ul style={listStyle}>
                        {step.evidenceLabels.map((evidence) => (
                          <li
                            key={getLocalizedText(evidence, "en-US")}
                            style={{ ...listItemStyle, alignItems: "start", justifyContent: "start" }}
                          >
                            <span aria-hidden="true">-</span>
                            <span style={wrapTextStyle}>{getLocalizedText(evidence, locale)}</span>
                          </li>
                        ))}
                      </ul>
                    </span>
                    <span>
                      <p style={labelStyle}>{copy.aiPlannerNextAction}</p>
                      <p style={bodyTextStyle}>{getLocalizedText(step.nextAction, locale)}</p>
                    </span>
                  </div>
                </article>
              );
            })}
          </div>

          <div style={summaryGridStyle}>
            <article style={cardStyle}>
              <p style={labelStyle}>{copy.campaignCreationWorkflowBoundary}</p>
              <p style={bodyTextStyle}>{getLocalizedText(creationWorkflow.boundary, locale)}</p>
              <p style={labelStyle}>{copy.aiPlannerNextAction}</p>
              <p style={bodyTextStyle}>{getLocalizedText(creationWorkflow.nextAction, locale)}</p>
            </article>

            <article style={cardStyle}>
              <p style={labelStyle}>{copy.campaignCreationWorkflowSourceChecklist}</p>
              <ul style={listStyle}>
                {creationWorkflow.sourceChecklist.map((source) => (
                  <li
                    key={source}
                    style={{ ...listItemStyle, alignItems: "start", justifyContent: "start" }}
                  >
                    <span aria-hidden="true">-</span>
                    <span style={wrapTextStyle}>{source}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section aria-label={copy.aiPlannerLaunchDecision} style={{ display: "grid", gap: 12 }}>
          <div style={headingRowStyle}>
            <div>
              <p style={labelStyle}>{copy.aiPlannerLaunchDecision}</p>
              <h3 style={{ fontSize: 20, lineHeight: 1.2, margin: "4px 0" }}>
                {copy.aiPlannerLaunchDecision}
              </h3>
              <p style={bodyTextStyle}>{copy.aiPlannerLaunchDecisionSubtitle}</p>
            </div>
            <PublishStateBadge
              label={`${launchDecision.summary.blockedCount} ${copy.countBlockers}`}
              state={launchDecision.summary.blockedCount > 0 ? "blocker" : "ready"}
            />
          </div>

          <div style={summaryGridStyle}>
            {[
              [copy.aiPlannerLaunchSelectedTaskCount, launchDecision.summary.selectedTaskCount],
              [copy.aiPlannerLaunchSelectedTemplateCount, launchDecision.summary.selectedTemplateCount],
              [copy.aiPlannerLaunchInheritedGateCount, launchDecision.summary.inheritedGateCount],
              [copy.aiPlannerReviewRequired, launchDecision.summary.reviewRequiredCount],
              [copy.aiPlannerWarning, launchDecision.summary.warningCount],
              [copy.aiPlannerBlocked, launchDecision.summary.blockedCount],
            ].map(([label, value]) => (
              <article key={label} style={cardStyle}>
                <p style={labelStyle}>{label}</p>
                <p style={{ ...valueStyle, fontSize: 22 }}>{value}</p>
              </article>
            ))}
          </div>

          <div style={summaryGridStyle}>
            <article style={cardStyle}>
              <div style={headingRowStyle}>
                <div>
                  <p style={labelStyle}>{copy.aiPlannerLaunchSelectedTemplate}</p>
                  <p style={valueStyle}>{getLocalizedText(launchDecision.selectedTemplate.title, locale)}</p>
                </div>
                <PublishStateBadge
                  label={
                    launchDecision.selectedTemplate.readiness === "ready"
                      ? copy.campaignTemplatePackReady
                      : copy.campaignTemplatePackReviewRequired
                  }
                  state={launchDecision.selectedTemplate.readiness === "ready" ? "ready" : "warning"}
                />
              </div>
              <p style={bodyTextStyle}>{getLocalizedText(launchDecision.selectedTemplate.nextAction, locale)}</p>
              <p style={bodyTextStyle}>{getLocalizedText(launchDecision.selectedTemplate.rewardBoundary, locale)}</p>
            </article>

            <article style={cardStyle}>
              <p style={labelStyle}>{copy.aiPlannerLaunchBoundary}</p>
              <p style={bodyTextStyle}>{getLocalizedText(launchDecision.boundary, locale)}</p>
              <p style={labelStyle}>{copy.aiPlannerNextAction}</p>
              <p style={bodyTextStyle}>{getLocalizedText(launchDecision.nextAction, locale)}</p>
            </article>
          </div>

          <article style={cardStyle}>
            <div style={headingRowStyle}>
              <div>
                <p style={labelStyle}>{copy.aiPlannerLaunchSelectedTasks}</p>
                <p style={bodyTextStyle}>{copy.templatesWorkspaceBoundary}</p>
              </div>
              <PublishStateBadge
                label={`${launchDecision.selectedTasks.length} ${copy.aiPlannerLaunchSelectedTaskCount}`}
                state="ready"
              />
            </div>
            <ul style={listStyle}>
              {launchDecision.selectedTasks.map((task) => (
                <li key={task.taskId} style={plannerItemStyle}>
                  <div style={headingRowStyle}>
                    <div>
                      <p style={valueStyle}>{getLocalizedText(task.title, locale)}</p>
                      <p style={bodyTextStyle}>{task.taskId}</p>
                    </div>
                    <PublishStateBadge
                      label={task.reviewRequired ? copy.aiPlannerReviewRequired : copy.aiPlannerReady}
                      state={task.reviewRequired ? "warning" : "ready"}
                    />
                  </div>
                  <div style={compactGridStyle}>
                    <span>
                      <p style={labelStyle}>{copy.aiPlannerLaunchVerification}</p>
                      <p style={bodyTextStyle}>{compactLocalizedText(task.verificationType)}</p>
                    </span>
                    <span>
                      <p style={labelStyle}>{copy.aiPlannerLaunchPoints}</p>
                      <p style={bodyTextStyle}>{task.defaultPoints}</p>
                    </span>
                    <span>
                      <p style={labelStyle}>{copy.aiPlannerLaunchWalletCompatibility}</p>
                      <WalletCompatibilityBadge compatibility={task.walletCompatibility} />
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {launchDecisionLocales.map((statusLocale) => (
                      <LocaleStatusBadge
                        key={`${task.taskId}-${statusLocale}`}
                        label={`${statusLocale} ${compactLocalizedText(task.localeReadiness[statusLocale])}`}
                        status={task.localeReadiness[statusLocale]}
                      />
                    ))}
                  </div>
                  <p style={bodyTextStyle}>
                    <strong>{copy.aiPlannerNextAction}: </strong>
                    {getLocalizedText(task.nextAction, locale)}
                  </p>
                </li>
              ))}
            </ul>
          </article>

          <div style={summaryGridStyle}>
            <article style={cardStyle}>
              <div style={headingRowStyle}>
                <p style={labelStyle}>{copy.aiPlannerLaunchInheritedGates}</p>
                <PublishStateBadge
                  label={`${launchDecision.inheritedGates.length} ${copy.aiPlannerLaunchInheritedGateCount}`}
                  state={launchDecision.inheritedGates.some((gate) => gate.blocksPublish) ? "blocker" : "ready"}
                />
              </div>
              <ul style={listStyle}>
                {launchDecision.inheritedGates.slice(0, 6).map((gate) => (
                  <li key={gate.gateId} style={plannerItemStyle}>
                    <div style={headingRowStyle}>
                      <p style={valueStyle}>{gate.gateId}</p>
                      <PublishStateBadge
                        label={gateStatusLabel(gate.status, copy)}
                        state={gateStatusState(gate.status)}
                      />
                    </div>
                    <p style={bodyTextStyle}>{getLocalizedText(gate.reason, locale)}</p>
                    {gate.blocksPublish ? (
                      <PublishStateBadge label={copy.aiPlannerLaunchBlocksPublish} state="blocker" />
                    ) : null}
                  </li>
                ))}
              </ul>
            </article>

            <article style={cardStyle}>
              <div style={headingRowStyle}>
                <p style={labelStyle}>{copy.aiPlannerLaunchApprovalRoutes}</p>
                <PublishStateBadge
                  label={`${launchDecision.approvalRoutes.length} ${copy.aiPlannerLaunchApprovalRoutes}`}
                  state={launchDecision.approvalRoutes.some((route) => route.status === "blocked") ? "blocker" : "ready"}
                />
              </div>
              <ul style={listStyle}>
                {launchDecision.approvalRoutes.map((route) => (
                  <li key={route.ownerRole} style={plannerItemStyle}>
                    <div style={headingRowStyle}>
                      <p style={valueStyle}>{ownerRoleLabels[locale][route.ownerRole]}</p>
                      <PublishStateBadge
                        label={route.status === "blocked" ? copy.aiPlannerBlocked : route.status === "warning" ? copy.aiPlannerWarning : copy.aiPlannerReady}
                        state={routeStatusState(route.status)}
                      />
                    </div>
                    <p style={bodyTextStyle}>{getLocalizedText(route.summary, locale)}</p>
                    <p style={bodyTextStyle}>
                      <strong>{copy.aiPlannerNextAction}: </strong>
                      {getLocalizedText(route.nextAction, locale)}
                    </p>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>
      </section>

      <div style={compactGridStyle}>
        <article style={cardStyle}>
          <p style={labelStyle}>{copy.builderFormState}</p>
          <ul style={listStyle}>
            {formStateRows(draft, copy).map((row) => (
              <li key={row.label} style={listItemStyle}>
                <span style={{ color: "#334155", fontWeight: 700 }}>{row.label}</span>
                <PublishStateBadge
                  label={row.ready ? copy.approved : copy.open}
                  state={row.ready ? "ready" : "warning"}
                />
              </li>
            ))}
          </ul>
        </article>

        <article style={cardStyle}>
          <p style={labelStyle}>{copy.builderWalletPolicy}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {walletPolicyOptions.map((option) => (
              <button
                key={option.policy}
                aria-pressed={option.policy === activePolicy}
                style={option.policy === activePolicy ? selectedButtonStyle : ghostButtonStyle}
                type="button"
              >
                {getLocalizedText(option.label, locale)}
              </button>
            ))}
          </div>
          <p style={bodyTextStyle}>
            {copy.builderAnyWalletDefault}:{" "}
            {getLocalizedText(
              walletPolicyOptions.find((option) => option.policy === "ANY")?.label ??
                walletPolicyOptions[0].label,
              locale,
            )}
          </p>
        </article>
      </div>
    </section>
  );
};
