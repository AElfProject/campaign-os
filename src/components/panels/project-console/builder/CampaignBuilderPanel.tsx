import { useEffect, useRef, type CSSProperties, type FormEvent } from "react";
import { CircleAlert, Plus, RefreshCw, Unplug } from "lucide-react";
import type { CreateOwnerCampaignInput } from "../../../../api/projectOwnerCampaignApiBridge";
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
import type {
  OwnerCampaignBuilderIntentContract,
  OwnerCampaignWorkflowStatus,
} from "../ownerCampaignWorkflow";

type BusinessContentLocale = Exclude<SupportedLocale, "ja-JP" | "ko-KR" | "vi-VN" | "id-ID" | "tr-TR" | "es-ES">;

interface CampaignBuilderPanelProps {
  copy: ProjectConsoleCopy;
  draft?: CampaignDraft;
  locale: BusinessContentLocale;
  ownerWorkflow: OwnerCampaignBuilderIntentContract;
}

const panelStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe6f4",
  borderRadius: 8,
  display: "grid",
  gap: 16,
  minWidth: 0,
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
  minWidth: 0,
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
  maxWidth: "100%",
  minHeight: 38,
  outlineOffset: 2,
  overflowWrap: "anywhere",
  padding: "0 12px",
  whiteSpace: "normal",
};

const apiReviewPanelStyle: CSSProperties = {
  ...cardStyle,
  background: "#f8fbff",
  minHeight: 226,
};

const apiMetricGridStyle: CSSProperties = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))",
};

const apiValueStyle: CSSProperties = {
  color: "#071426",
  fontSize: 13,
  fontWeight: 800,
  lineHeight: 1.35,
  margin: 0,
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const selectedButtonStyle: CSSProperties = {
  ...ghostButtonStyle,
  background: "#071426",
  border: "1px solid #071426",
  color: "#ffffff",
};

const formatDate = (value: string, locale: BusinessContentLocale) =>
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
} satisfies Record<BusinessContentLocale, Record<OwnerRole, string>>;

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

const ownerCampaignCreateInput = (
  draft: CampaignDraft,
  locale: BusinessContentLocale,
  ownerAddress: string,
): CreateOwnerCampaignInput => ({
  contractMode: "OFF_CHAIN_MVP",
  defaultLocale: draft.defaultLocale,
  duration: `${draft.timePeriod.startTime}/${draft.timePeriod.endTime}`,
  endTime: draft.timePeriod.endTime,
  goal: `${draft.projectName}: ${getLocalizedText(draft.campaignName, locale)} (${draft.objective})`,
  ownerAddress,
  projectId: draft.projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  rewardDescription: getLocalizedText(draft.rewardPlan.description, locale),
  startTime: draft.timePeriod.startTime,
  status: "draft",
  supportedLocales: draft.supportedLocales,
  walletPolicy: draft.walletPolicy,
});

const campaignDraftIsValid = (
  draft: CampaignDraft,
  locale: BusinessContentLocale,
  missingBasics: number,
) => {
  const startTime = Date.parse(draft.timePeriod.startTime);
  const endTime = Date.parse(draft.timePeriod.endTime);

  return missingBasics === 0
    && Boolean(draft.projectName.trim())
    && Boolean(getLocalizedText(draft.campaignName, locale).trim())
    && Boolean(getLocalizedText(draft.rewardPlan.description, locale).trim())
    && draft.targetUsers.some((targetUser) => Boolean(targetUser.trim()))
    && draft.supportedLocales.length > 0
    && Number.isFinite(startTime)
    && Number.isFinite(endTime)
    && startTime < endTime;
};

const ownerCampaignStatusLabel = (
  status: OwnerCampaignWorkflowStatus,
  copy: ProjectConsoleCopy,
) => {
  if (status === "no_session") {
    return copy.ownerCampaignNoSession;
  }
  if (status === "creating") {
    return copy.ownerCampaignCreatePending;
  }
  if (status === "recovering") {
    return copy.ownerCampaignRecovering;
  }
  if (status === "selection_required") {
    return copy.ownerCampaignSelectionRequired;
  }
  if (status === "loading_detail" || status === "mutation_pending") {
    return copy.ownerCampaignWaitingDetail;
  }
  if (status === "degraded" || status === "error") {
    return copy.ownerCampaignError;
  }
  if (status === "ready") {
    return copy.ownerCampaignSessionReady;
  }

  return copy.ownerCampaignReadyToCreate;
};

const ownerCampaignStatusState = (status: OwnerCampaignWorkflowStatus) =>
  status === "empty" || status === "ready" ? "ready" as const : "warning" as const;

export const CampaignBuilderPanel = ({
  copy,
  draft = seededCampaignDraft,
  locale,
  ownerWorkflow,
}: CampaignBuilderPanelProps) => {
  const readiness = computeBuilderPublishReadiness(draft);
  const planner = createAiCampaignPlannerDecisionConsole(draft);
  const launchDecision = createAiPlannerLaunchDecision(draft);
  const creationWorkflow = createCampaignCreationWorkflowReadiness(draft);
  const missingBasics = readiness.blockers.filter((check) => check.group === "basics");
  const campaignName = getLocalizedText(draft.campaignName, locale);
  const activePolicy = draft.walletPolicy;
  const formValid = campaignDraftIsValid(draft, locale, missingBasics.length);
  const createAllowedByStatus = ownerWorkflow.status === "empty"
    || ownerWorkflow.status === "error" && ownerWorkflow.error?.operation === "create";
  const createDisabled = !ownerWorkflow.issuedSessionReady
    || !ownerWorkflow.ownerContext
    || Boolean(ownerWorkflow.activeCampaignId)
    || ownerWorkflow.createPending
    || !formValid
    || !createAllowedByStatus;
  const createDisabledReason = !ownerWorkflow.issuedSessionReady || !ownerWorkflow.ownerContext
    ? copy.ownerCampaignNoSession
    : ownerWorkflow.activeCampaignId
      ? copy.ownerCampaignCreateDisabledActive
      : !formValid
        ? copy.ownerCampaignCreateDisabledFields
        : ownerCampaignStatusLabel(ownerWorkflow.status, copy);
  const canonicalCampaignId = ownerWorkflow.activeCampaignId ?? ownerWorkflow.createResult?.id ?? null;
  const showRetryDetail = Boolean(ownerWorkflow.activeCampaignId)
    && Boolean(ownerWorkflow.error?.retryable);
  const showReconnect = !ownerWorkflow.issuedSessionReady
    || Boolean(ownerWorkflow.error?.reconnectRequired);
  const createDispatchGuardRef = useRef(ownerWorkflow.createPending);
  const controlledCreatePendingObservedRef = useRef(ownerWorkflow.createPending);

  useEffect(() => {
    if (ownerWorkflow.createPending) {
      createDispatchGuardRef.current = true;
      controlledCreatePendingObservedRef.current = true;
      return;
    }

    if (controlledCreatePendingObservedRef.current) {
      createDispatchGuardRef.current = false;
      controlledCreatePendingObservedRef.current = false;
    }
  }, [ownerWorkflow.createPending]);

  const submitCreateIntent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (createDisabled || !ownerWorkflow.ownerContext || createDispatchGuardRef.current) {
      return;
    }

    createDispatchGuardRef.current = true;

    try {
      ownerWorkflow.onCreate(ownerCampaignCreateInput(
        draft,
        locale,
        ownerWorkflow.ownerContext.address,
      ));
    } catch (error) {
      createDispatchGuardRef.current = false;
      throw error;
    }
  };

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

        <aside aria-label={copy.ownerCampaignWorkflowRegion} style={apiReviewPanelStyle}>
          <form
            aria-label={copy.ownerCampaignWorkflowRegion}
            onSubmit={submitCreateIntent}
            style={{ display: "grid", gap: 12, minWidth: 0 }}
          >
            <div style={headingRowStyle}>
              <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                <p style={labelStyle}>{copy.ownerCampaignWorkflowRegion}</p>
                <p style={{ ...valueStyle, fontSize: 18 }}>
                  {ownerCampaignStatusLabel(ownerWorkflow.status, copy)}
                </p>
              </div>
              <PublishStateBadge
                label={ownerCampaignStatusLabel(ownerWorkflow.status, copy)}
                state={ownerCampaignStatusState(ownerWorkflow.status)}
              />
            </div>

            <div
              aria-atomic="true"
              aria-live="polite"
              role="status"
              style={{ ...bodyTextStyle, fontWeight: 800, minHeight: 22 }}
            >
              {ownerCampaignStatusLabel(ownerWorkflow.status, copy)}
            </div>

            <dl style={apiMetricGridStyle}>
              {[
                [copy.ownerCampaignOwner, ownerWorkflow.ownerContext?.address ?? "-"],
                [copy.ownerCampaignStatus, ownerWorkflow.status],
                [copy.ownerCampaignCreatedCampaign, canonicalCampaignId ?? copy.ownerCampaignNoActive],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "grid", gap: 3, minWidth: 0 }}>
                  <dt style={labelStyle}>{label}</dt>
                  <dd style={apiValueStyle} title={value}>{value}</dd>
                </div>
              ))}
            </dl>

            <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8, minWidth: 0 }}>
              <button
                aria-describedby={createDisabled ? "owner-campaign-create-disabled-reason" : undefined}
                aria-label={copy.ownerCampaignCreate}
                disabled={createDisabled}
                style={{
                  ...selectedButtonStyle,
                  alignItems: "center",
                  cursor: createDisabled ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  gap: 7,
                  justifyContent: "center",
                  minHeight: 40,
                  minWidth: 148,
                  opacity: createDisabled ? 0.62 : 1,
                }}
                title={createDisabled ? createDisabledReason : copy.ownerCampaignCreate}
                type="submit"
              >
                <Plus aria-hidden="true" size={16} strokeWidth={2.4} />
                {ownerWorkflow.createPending ? copy.ownerCampaignCreatePending : copy.ownerCampaignCreate}
              </button>

              {showRetryDetail ? (
                <button
                  aria-label={copy.ownerCampaignRetryDetail}
                  disabled={ownerWorkflow.createPending}
                  onClick={ownerWorkflow.onRetryDetail}
                  style={{ ...ghostButtonStyle, alignItems: "center", display: "inline-flex", gap: 7, minHeight: 40 }}
                  title={copy.ownerCampaignRetryDetail}
                  type="button"
                >
                  <RefreshCw aria-hidden="true" size={16} strokeWidth={2.4} />
                  {copy.ownerCampaignRetryDetail}
                </button>
              ) : null}

              {showReconnect ? (
                <button
                  aria-label={copy.ownerCampaignReconnect}
                  disabled={!ownerWorkflow.onReconnect}
                  onClick={() => ownerWorkflow.onReconnect?.()}
                  style={{ ...ghostButtonStyle, alignItems: "center", display: "inline-flex", gap: 7, minHeight: 40 }}
                  title={copy.ownerCampaignReconnect}
                  type="button"
                >
                  <Unplug aria-hidden="true" size={16} strokeWidth={2.4} />
                  {copy.ownerCampaignReconnect}
                </button>
              ) : null}
            </div>

            {createDisabled ? (
              <p id="owner-campaign-create-disabled-reason" style={{ ...wrapTextStyle, margin: 0 }}>
                {createDisabledReason}
              </p>
            ) : null}

            {ownerWorkflow.error ? (
              <div
                role="alert"
                style={{
                  background: "#fff7ed",
                  border: "1px solid #fdba74",
                  borderRadius: 6,
                  color: "#7c2d12",
                  display: "grid",
                  gap: 4,
                  minWidth: 0,
                  padding: 10,
                }}
              >
                <strong style={{ alignItems: "center", display: "flex", gap: 7 }}>
                  <CircleAlert aria-hidden="true" size={16} strokeWidth={2.4} />
                  {ownerWorkflow.error.message}
                </strong>
                <span style={{ fontSize: 13, overflowWrap: "anywhere" }}>
                  {ownerWorkflow.error.code}
                  {ownerWorkflow.error.httpStatus ? ` · HTTP ${ownerWorkflow.error.httpStatus}` : ""}
                  {` · ${copy.ownerCampaignTraceId}: ${ownerWorkflow.error.traceId}`}
                </span>
              </div>
            ) : null}
          </form>
        </aside>

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
                    {launchDecisionLocales.map((statusLocale) => {
                      const status = task.localeReadiness[statusLocale] ?? task.localeReadiness["en-US"];

                      return (
                        <LocaleStatusBadge
                          key={`${task.taskId}-${statusLocale}`}
                          label={`${statusLocale} ${compactLocalizedText(status)}`}
                          status={status}
                        />
                      );
                    })}
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
