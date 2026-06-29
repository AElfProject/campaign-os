import type { CSSProperties } from "react";
import {
  computeBuilderPublishReadiness,
  createAiCampaignPlannerDecisionConsole,
  getLocalizedText,
  seededCampaignDraft,
  type AiPlannerDecisionStatus,
  type CampaignDraft,
  type OwnerRole,
  type SupportedLocale,
  walletPolicyOptions,
} from "../../../../domain";
import { PublishStateBadge } from "../../../badges/Badges";
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

export const CampaignBuilderPanel = ({
  copy,
  draft = seededCampaignDraft,
  locale,
}: CampaignBuilderPanelProps) => {
  const readiness = computeBuilderPublishReadiness(draft);
  const planner = createAiCampaignPlannerDecisionConsole(draft);
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
