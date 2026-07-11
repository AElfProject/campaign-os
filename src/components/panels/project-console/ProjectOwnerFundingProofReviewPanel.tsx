import type { CSSProperties } from "react";
import {
  sanitizeProjectOwnerFundingProofReviewBridgeApiText,
  type ProjectOwnerFundingProofReviewBridgeApiSource,
  type ProjectOwnerFundingProofReviewBridgeApiState,
  type ProjectOwnerFundingProofReviewBridgeApiStatus,
} from "../../../api/projectOwnerFundingProofReviewBridgeApiBridge";
import { getLocalizedText, type SupportedLocale } from "../../../domain";
import { PublishStateBadge } from "../../badges/Badges";
import type { ProjectConsoleCopy } from "./copy";

type FundingProofBadgeState = "blocker" | "ready" | "warning";

interface ProjectOwnerFundingProofReviewPanelProps {
  apiConfigured: boolean;
  copy: ProjectConsoleCopy;
  locale: SupportedLocale;
  onReview: () => void;
  reviewInFlight: boolean;
  state: ProjectOwnerFundingProofReviewBridgeApiState;
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

const packageRowStyle: CSSProperties = {
  borderTop: "1px solid #dbe6f4",
  display: "grid",
  gap: 4,
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
  source: ProjectOwnerFundingProofReviewBridgeApiSource,
  copy: ProjectConsoleCopy,
) => {
  const labels: Record<ProjectOwnerFundingProofReviewBridgeApiSource, string> = {
    api_runtime: copy.projectOwnerFundingProofReviewApiRuntime,
    error_fallback: copy.projectOwnerFundingProofReviewErrorFallback,
    loading: copy.projectOwnerFundingProofReviewLoading,
    seeded_fallback: copy.projectOwnerFundingProofReviewSeededFallback,
  };

  return labels[source];
};

const statusLabel = (
  status: ProjectOwnerFundingProofReviewBridgeApiStatus,
  copy: ProjectConsoleCopy,
) => {
  const labels: Record<ProjectOwnerFundingProofReviewBridgeApiStatus, string> = {
    blocked: copy.projectOwnerFundingProofReviewStatusBlocked,
    error: copy.projectOwnerFundingProofReviewStatusError,
    fallback: copy.projectOwnerFundingProofReviewStatusFallback,
    loading: copy.projectOwnerFundingProofReviewStatusLoading,
    review_required: copy.projectOwnerFundingProofReviewReviewRequired,
  };

  return labels[status];
};

const badgeState = (
  status: ProjectOwnerFundingProofReviewBridgeApiStatus,
): FundingProofBadgeState =>
  status === "review_required"
    ? "ready"
    : status === "blocked" || status === "error"
      ? "blocker"
      : "warning";

const sanitizePanelText = (value: unknown) =>
  sanitizeProjectOwnerFundingProofReviewBridgeApiText(value)
    .replace(/\/Users\/[^"'\s<>]+/gi, "redacted local path")
    .replace(/\/private\/[^"'\s<>]+/gi, "redacted private path");

const listOrFallback = (items: readonly string[], fallback: string) => (items.length > 0 ? items : [fallback]);

const safetyItems = (copy: ProjectConsoleCopy) => [
  ["liveFundingTransfer", copy.projectOwnerFundingProofReviewNoFundingTransfer],
  ["liveObjectStorageWrite", copy.projectOwnerFundingProofReviewNoObjectStorageWrite],
  ["liveProviderCall", copy.projectOwnerFundingProofReviewNoProviderCall],
  ["liveWalletSignature", copy.projectOwnerFundingProofReviewNoWalletSignature],
  ["liveContractWrite", copy.projectOwnerFundingProofReviewNoContractWrite],
  ["liveQueuePublishing", copy.projectOwnerFundingProofReviewNoQueuePublishing],
  ["liveSchedulerExecution", copy.projectOwnerFundingProofReviewNoSchedulerExecution],
  ["liveWorkerExecution", copy.projectOwnerFundingProofReviewNoWorkerExecution],
  ["liveRewardCustody", copy.projectOwnerFundingProofReviewNoRewardCustody],
  ["liveRewardDistribution", copy.projectOwnerFundingProofReviewNoRewardDistribution],
] as const;

const proofPackageRows = (
  proofPackage: ProjectOwnerFundingProofReviewBridgeApiState["review"]["proofPackage"],
  copy: ProjectConsoleCopy,
) => [
  [copy.projectOwnerFundingProofReviewProofReference, proofPackage.proofReference],
  [copy.projectOwnerFundingProofReviewRewardProviderStatement, proofPackage.rewardProviderStatementRef],
  [copy.projectOwnerFundingProofReviewAmountSummary, proofPackage.amountSummaryRef],
  [copy.projectOwnerFundingProofReviewExportBatch, proofPackage.exportBatchId],
  [copy.projectOwnerFundingProofReviewRecipientListHash, proofPackage.recipientListHashRef],
  [copy.projectOwnerFundingProofReviewDisclaimerSignoff, proofPackage.disclaimerSignoffRef],
  [copy.projectOwnerFundingProofReviewFinanceReview, proofPackage.financeReviewRef],
  [copy.projectOwnerFundingProofReviewOperatorReview, proofPackage.operatorReviewRef],
  [copy.projectOwnerFundingProofReviewReviewState, proofPackage.reviewState],
  [copy.projectOwnerFundingProofReviewSubmittedBy, proofPackage.submittedByRole],
] as const;

export function ProjectOwnerFundingProofReviewPanel({
  apiConfigured,
  copy,
  locale,
  onReview,
  reviewInFlight,
  state,
}: ProjectOwnerFundingProofReviewPanelProps) {
  const review = state.review;
  const proofPackage = review.proofPackage;
  const topBlocker = review.diagnosticCodes[0] ?? copy.projectOwnerFundingProofReviewNoDiagnostics;
  const diagnostics = [
    ...state.diagnostics.map((diagnostic) => ({
      code: diagnostic.code,
      message: getLocalizedText(diagnostic.message, locale),
      safeDetails: diagnostic.safeDetails,
      severity: diagnostic.severity,
    })),
    ...review.diagnostics.map((diagnostic) => ({
      code: diagnostic.code,
      message: diagnostic.message,
      safeDetails: diagnostic.safeDetails,
      severity: diagnostic.severity,
    })),
  ];

  return (
    <article aria-label={copy.projectOwnerFundingProofReviewRegionLabel} style={panelStyle}>
      <div style={headingRowStyle}>
        <div style={{ minWidth: 0 }}>
          <p style={statLabelStyle}>{copy.projectOwnerFundingProofReviewStatus}</p>
          <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0" }}>
            {copy.projectOwnerFundingProofReviewRegionLabel}
          </h4>
          <p style={bodyTextStyle}>{copy.projectOwnerFundingProofReviewSubtitle}</p>
          <p style={{ ...bodyTextStyle, marginTop: 4 }}>
            {apiConfigured
              ? copy.projectOwnerFundingProofReviewConfigured
              : copy.projectOwnerFundingProofReviewNotConfigured}
          </p>
        </div>
        <span style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8 }}>
          <PublishStateBadge label={sourceLabel(state.source, copy)} state={badgeState(state.status)} />
          <PublishStateBadge label={statusLabel(state.status, copy)} state={badgeState(state.status)} />
        </span>
      </div>

      <div style={gridStyle}>
        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.projectOwnerFundingProofReviewTraceId}</p>
          <p style={{ ...statValueStyle, fontSize: 15, ...wrapTextStyle }}>
            {state.traceId ?? (state.source === "api_runtime" ? review.traceId : copy.projectOwnerFundingProofReviewNoTrace)}
          </p>
          <p style={bodyTextStyle}>x-campaign-os-trace-id</p>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.projectOwnerFundingProofReviewProofPackage}</p>
          <p style={{ ...statValueStyle, fontSize: 18, ...wrapTextStyle }}>
            {proofPackage.status}
          </p>
          <p style={bodyTextStyle}>
            {proofPackage.missingEvidenceKeys.length} {copy.projectOwnerFundingProofReviewMissingEvidence}
          </p>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.projectOwnerFundingProofReviewTopBlocker}</p>
          <p style={{ ...statValueStyle, fontSize: 15, ...wrapTextStyle }}>{topBlocker}</p>
          <p style={bodyTextStyle}>
            {review.summary.blockedItemCount} {copy.countBlockers} / {review.summary.reviewRequiredItemCount} {copy.projectOwnerFundingProofReviewReviewItems}
          </p>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.projectOwnerFundingProofReviewExportBatch}</p>
          <p style={{ ...statValueStyle, fontSize: 15, ...wrapTextStyle }}>
            {proofPackage.exportBatchId ?? copy.projectOwnerFundingProofReviewNone}
          </p>
          <p style={bodyTextStyle}>
            {copy.projectOwnerFundingProofReviewSubmittedBy}: {proofPackage.submittedByRole}
          </p>
        </article>
      </div>

      <div style={gridStyle}>
        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.projectOwnerFundingProofReviewReadyItems}</p>
          <p style={{ ...statValueStyle, fontSize: 18 }}>
            {review.summary.readyItemCount}/{review.summary.requiredItemCount}
          </p>
          <p style={bodyTextStyle}>
            {copy.projectOwnerFundingProofReviewReviewState}: {proofPackage.reviewState}
          </p>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.projectOwnerFundingProofReviewRequiredEvidenceKeys}</p>
          <ul style={compactListStyle}>
            {listOrFallback(review.requiredEvidenceKeys, copy.projectOwnerFundingProofReviewNone).map((key) => (
              <li key={key} style={chipStyle}>
                {key}
              </li>
            ))}
          </ul>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.projectOwnerFundingProofReviewSafety}</p>
          <ul style={compactListStyle}>
            {safetyItems(copy).map(([key, label]) => (
              <li key={key} style={chipStyle}>
                {review.safety[key] === false ? label : copy.projectOwnerFundingProofReviewUnsafeFlag}
              </li>
            ))}
          </ul>
        </article>
      </div>

      <section aria-label={copy.projectOwnerFundingProofReviewProofPackage} style={cardStyle}>
        <p style={statLabelStyle}>{copy.projectOwnerFundingProofReviewProofPackage}</p>
        <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
          {proofPackageRows(proofPackage, copy).map(([label, value]) => (
            <div key={label} style={packageRowStyle}>
              <p style={{ ...bodyTextStyle, color: "#071426", fontWeight: 900, ...wrapTextStyle }}>{label}</p>
              <p style={{ ...bodyTextStyle, ...wrapTextStyle }}>
                {sanitizePanelText(value ?? copy.projectOwnerFundingProofReviewNone)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section aria-label={copy.projectOwnerFundingProofReviewItems} style={cardStyle}>
        <p style={statLabelStyle}>{copy.projectOwnerFundingProofReviewItems}</p>
        <div style={{ display: "grid", gap: 10 }}>
          {review.items.map((item) => (
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

      <section aria-label={copy.projectOwnerFundingProofReviewNextAction} style={cardStyle}>
        <p style={statLabelStyle}>{copy.projectOwnerFundingProofReviewNextAction}</p>
        <p style={{ ...bodyTextStyle, ...wrapTextStyle }}>
          {sanitizePanelText(getLocalizedText(review.summary.topNextAction, locale))}
        </p>
      </section>

      <section aria-label={copy.projectOwnerFundingProofReviewSanitizedDiagnostics} style={cardStyle}>
        <p style={statLabelStyle}>{copy.projectOwnerFundingProofReviewDiagnostics}</p>
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
          <p style={bodyTextStyle}>{copy.projectOwnerFundingProofReviewNoDiagnostics}</p>
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
          ? copy.projectOwnerFundingProofReviewReviewingAction
          : copy.projectOwnerFundingProofReviewReviewAction}
      </button>
    </article>
  );
}
