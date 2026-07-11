import type { CSSProperties } from "react";
import {
  sanitizeRewardDistributionHandoffRuntimeApiText,
  type RewardDistributionHandoffRuntimeApiBridgeState,
  type RewardDistributionHandoffRuntimeApiSource,
  type RewardDistributionHandoffRuntimeApiStatus,
} from "../../../api/rewardDistributionHandoffRuntimeApiBridge";
import { getLocalizedText, type SupportedLocale } from "../../../domain";
import { PublishStateBadge } from "../../badges/Badges";
import type { ProjectConsoleCopy } from "./copy";

type RewardHandoffBadgeState = "blocker" | "ready" | "warning";

interface RewardDistributionHandoffRuntimePanelProps {
  apiConfigured: boolean;
  copy: ProjectConsoleCopy;
  locale: SupportedLocale;
  onReview: () => void;
  reviewInFlight: boolean;
  state: RewardDistributionHandoffRuntimeApiBridgeState;
}

const panelStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe6f4",
  borderRadius: 8,
  boxSizing: "border-box",
  display: "grid",
  gap: 14,
  maxWidth: "100%",
  minWidth: 0,
  padding: 16,
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
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))",
  minWidth: 0,
};

const cardStyle: CSSProperties = {
  background: "#f8fbff",
  border: "1px solid #dbe6f4",
  borderRadius: 8,
  boxSizing: "border-box",
  display: "grid",
  gap: 6,
  minHeight: 100,
  minWidth: 0,
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
  fontSize: 22,
  fontWeight: 900,
  lineHeight: 1.12,
  margin: 0,
};

const bodyTextStyle: CSSProperties = {
  color: "#475569",
  fontSize: 13,
  lineHeight: 1.45,
  margin: 0,
};

const wrapTextStyle: CSSProperties = {
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const compactListStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  margin: 0,
  padding: 0,
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
  maxWidth: "100%",
  padding: "6px 8px",
  ...wrapTextStyle,
};

const itemRowStyle: CSSProperties = {
  alignItems: "start",
  borderTop: "1px solid #dbe6f4",
  display: "grid",
  gap: 8,
  gridTemplateColumns: "minmax(0, 1fr) auto",
  minWidth: 0,
  paddingTop: 10,
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
  ...wrapTextStyle,
};

const actionButtonStyle: CSSProperties = {
  alignSelf: "start",
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

const sourceLabel = (
  source: RewardDistributionHandoffRuntimeApiSource,
  copy: ProjectConsoleCopy,
) => {
  const labels: Record<RewardDistributionHandoffRuntimeApiSource, string> = {
    api_runtime: copy.rewardDistributionHandoffRuntimeApiRuntime,
    error_fallback: copy.rewardDistributionHandoffRuntimeErrorFallback,
    loading: copy.rewardDistributionHandoffRuntimeLoading,
    seeded_fallback: copy.rewardDistributionHandoffRuntimeSeededFallback,
  };

  return labels[source];
};

const statusLabel = (
  status: RewardDistributionHandoffRuntimeApiStatus,
  copy: ProjectConsoleCopy,
) => {
  const labels: Record<RewardDistributionHandoffRuntimeApiStatus, string> = {
    blocked: copy.rewardDistributionHandoffRuntimeStatusBlocked,
    error: copy.rewardDistributionHandoffRuntimeStatusError,
    fallback: copy.rewardDistributionHandoffRuntimeStatusFallback,
    loading: copy.rewardDistributionHandoffRuntimeStatusLoading,
    review_required: copy.rewardDistributionHandoffRuntimeReviewRequired,
  };

  return labels[status];
};

const badgeState = (
  status: RewardDistributionHandoffRuntimeApiStatus,
): RewardHandoffBadgeState =>
  status === "review_required"
    ? "ready"
    : status === "blocked" || status === "error"
      ? "blocker"
      : "warning";

const sanitizePanelText = (value: unknown) =>
  sanitizeRewardDistributionHandoffRuntimeApiText(value)
    .replace(/\/Users\/[^"'\s<>]+/gi, "redacted local path")
    .replace(/\/private\/[^"'\s<>]+/gi, "redacted private path");

const listOrFallback = (items: readonly string[], fallback: string) => (items.length > 0 ? items : [fallback]);

const safetyItems = (copy: ProjectConsoleCopy) => [
  ["livePayout", copy.rewardDistributionHandoffRuntimeNoPayout],
  ["liveClaim", copy.rewardDistributionHandoffRuntimeNoClaim],
  ["liveProviderCall", copy.rewardDistributionHandoffRuntimeNoProviderCall],
  ["liveWalletSignature", copy.rewardDistributionHandoffRuntimeNoWalletSignature],
  ["liveContractWrite", copy.rewardDistributionHandoffRuntimeNoContractWrite],
  ["liveQueuePublishing", copy.rewardDistributionHandoffRuntimeNoQueuePublishing],
  ["liveSchedulerExecution", copy.rewardDistributionHandoffRuntimeNoSchedulerExecution],
  ["liveWorkerExecution", copy.rewardDistributionHandoffRuntimeNoWorkerExecution],
  ["liveRewardCustody", copy.rewardDistributionHandoffRuntimeNoRewardCustody],
  ["liveRewardDistribution", copy.rewardDistributionHandoffRuntimeNoRewardDistribution],
] as const;

export function RewardDistributionHandoffRuntimePanel({
  apiConfigured,
  copy,
  locale,
  onReview,
  reviewInFlight,
  state,
}: RewardDistributionHandoffRuntimePanelProps) {
  const readiness = state.readiness;
  const handoff = readiness.evidenceHandoff;
  const exportLinkage = readiness.exportLinkage;
  const topBlocker = readiness.diagnosticCodes[0] ?? copy.rewardDistributionHandoffRuntimeNoDiagnostics;
  const diagnostics = [
    ...state.diagnostics.map((diagnostic) => ({
      code: diagnostic.code,
      message: getLocalizedText(diagnostic.message, locale),
      safeDetails: diagnostic.safeDetails,
      severity: diagnostic.severity,
    })),
    ...readiness.diagnostics.map((diagnostic) => ({
      code: diagnostic.code,
      message: diagnostic.message,
      safeDetails: diagnostic.safeDetails,
      severity: diagnostic.severity,
    })),
  ];

  return (
    <article aria-label={copy.rewardDistributionHandoffRuntimeRegionLabel} style={panelStyle}>
      <div style={headingRowStyle}>
        <div style={{ minWidth: 0 }}>
          <p style={statLabelStyle}>{copy.rewardDistributionHandoffRuntimeStatus}</p>
          <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0" }}>
            {copy.rewardDistributionHandoffRuntimeRegionLabel}
          </h4>
          <p style={bodyTextStyle}>{copy.rewardDistributionHandoffRuntimeSubtitle}</p>
          <p style={{ ...bodyTextStyle, marginTop: 4 }}>
            {apiConfigured
              ? copy.rewardDistributionHandoffRuntimeConfigured
              : copy.rewardDistributionHandoffRuntimeNotConfigured}
          </p>
        </div>
        <span style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8 }}>
          <PublishStateBadge label={sourceLabel(state.source, copy)} state={badgeState(state.status)} />
          <PublishStateBadge label={statusLabel(state.status, copy)} state={badgeState(state.status)} />
        </span>
      </div>

      <div style={gridStyle}>
        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.rewardDistributionHandoffRuntimeTraceId}</p>
          <p style={{ ...statValueStyle, fontSize: 15, ...wrapTextStyle }}>
            {state.traceId ?? (state.source === "api_runtime" ? readiness.traceId : copy.rewardDistributionHandoffRuntimeNoTrace)}
          </p>
          <p style={bodyTextStyle}>x-campaign-os-trace-id</p>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.rewardDistributionHandoffRuntimeEvidence}</p>
          <p style={{ ...statValueStyle, fontSize: 18, ...wrapTextStyle }}>
            {handoff.status}
          </p>
          <p style={bodyTextStyle}>
            {handoff.missingEvidenceKeys.length} {copy.rewardDistributionHandoffRuntimeMissingEvidence}
          </p>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.rewardDistributionHandoffRuntimeTopBlocker}</p>
          <p style={{ ...statValueStyle, fontSize: 15, ...wrapTextStyle }}>{topBlocker}</p>
          <p style={bodyTextStyle}>
            {readiness.summary.blockedItemCount} {copy.countBlockers} / {readiness.summary.reviewRequiredItemCount} {copy.rewardDistributionHandoffRuntimeReviewItems}
          </p>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.rewardDistributionHandoffRuntimeExportLinkage}</p>
          <p style={{ ...statValueStyle, fontSize: 15, ...wrapTextStyle }}>
            {exportLinkage.exportBatchIds[0] ?? copy.rewardDistributionHandoffRuntimeNone}
          </p>
          <p style={bodyTextStyle}>
            {exportLinkage.recipientCount} {copy.rewardDistributionHandoffRuntimeRecipients}
          </p>
        </article>
      </div>

      <div style={gridStyle}>
        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.rewardDistributionHandoffRuntimeReadyItems}</p>
          <p style={{ ...statValueStyle, fontSize: 18 }}>
            {readiness.summary.readyItemCount}/{readiness.summary.itemCount}
          </p>
          <p style={bodyTextStyle}>
            {exportLinkage.exportReadyRecipientCount} {copy.readyRows} / {exportLinkage.evidenceHashCount} {copy.rewardDistributionHandoffRuntimeEvidenceHashes}
          </p>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.rewardDistributionHandoffRuntimeRequiredEvidenceKeys}</p>
          <ul style={compactListStyle}>
            {listOrFallback(readiness.requiredEvidenceKeys.slice(0, 4), copy.rewardDistributionHandoffRuntimeNone).map((key) => (
              <li key={key} style={chipStyle}>
                {key}
              </li>
            ))}
          </ul>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.rewardDistributionHandoffRuntimeSafety}</p>
          <ul style={compactListStyle}>
            {safetyItems(copy).map(([key, label]) => (
              <li key={key} style={chipStyle}>
                {readiness.noLiveSideEffects[key] === false ? label : copy.rewardDistributionHandoffRuntimeUnsafeFlag}
              </li>
            ))}
          </ul>
        </article>
      </div>

      <section aria-label={copy.rewardDistributionHandoffRuntimeHandoffItems} style={cardStyle}>
        <p style={statLabelStyle}>{copy.rewardDistributionHandoffRuntimeHandoffItems}</p>
        <div style={{ display: "grid", gap: 10 }}>
          {readiness.items.map((item) => (
            <div key={item.id} style={itemRowStyle}>
              <div style={{ minWidth: 0 }}>
                <p style={{ ...bodyTextStyle, color: "#071426", fontWeight: 900, ...wrapTextStyle }}>
                  {getLocalizedText(item.label, locale)}
                </p>
                <p style={{ ...bodyTextStyle, ...wrapTextStyle }}>
                  {sanitizePanelText(getLocalizedText(item.nextAction, locale))}
                </p>
              </div>
              <PublishStateBadge
                label={item.state}
                state={item.state === "ready" ? "ready" : item.state === "blocked" ? "blocker" : "warning"}
              />
            </div>
          ))}
        </div>
      </section>

      <section aria-label={copy.rewardDistributionHandoffRuntimeNextAction} style={cardStyle}>
        <p style={statLabelStyle}>{copy.rewardDistributionHandoffRuntimeNextAction}</p>
        <p style={{ ...bodyTextStyle, ...wrapTextStyle }}>
          {sanitizePanelText(getLocalizedText(readiness.summary.topNextAction, locale))}
        </p>
      </section>

      <section aria-label={copy.rewardDistributionHandoffRuntimeSanitizedDiagnostics} style={cardStyle}>
        <p style={statLabelStyle}>{copy.rewardDistributionHandoffRuntimeDiagnostics}</p>
        {diagnostics.length > 0 ? (
          <ul style={{ display: "grid", gap: 8, margin: 0, padding: 0 }}>
            {diagnostics.slice(0, 5).map((diagnostic, index) => (
              <li key={`${diagnostic.code}-${index}`} style={{ ...bodyTextStyle, listStyle: "none", ...wrapTextStyle }}>
                {diagnostic.code}: {sanitizePanelText(diagnostic.message)}
                {diagnostic.safeDetails
                  ? ` / ${sanitizePanelText(diagnostic.safeDetails)}`
                  : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p style={bodyTextStyle}>{copy.rewardDistributionHandoffRuntimeNoDiagnostics}</p>
        )}
      </section>

      <p style={boundaryStyle}>{getLocalizedText(state.boundary, locale)}</p>

      <button
        disabled={reviewInFlight || state.loading}
        onClick={onReview}
        style={{
          ...actionButtonStyle,
          cursor: reviewInFlight || state.loading ? "not-allowed" : "pointer",
          opacity: reviewInFlight || state.loading ? 0.72 : 1,
        }}
        type="button"
      >
        {reviewInFlight
          ? copy.rewardDistributionHandoffRuntimeReviewingAction
          : copy.rewardDistributionHandoffRuntimeReviewAction}
      </button>
    </article>
  );
}
