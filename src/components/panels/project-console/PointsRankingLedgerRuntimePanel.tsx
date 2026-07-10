import type { CSSProperties } from "react";
import {
  sanitizePointsRankingLedgerRuntimeApiText,
  type PointsRankingLedgerRuntimeApiBridgeState,
  type PointsRankingLedgerRuntimeApiSource,
  type PointsRankingLedgerRuntimeApiStatus,
} from "../../../api/pointsRankingLedgerRuntimeApiBridge";
import { getLocalizedText, type SupportedLocale } from "../../../domain";
import { PublishStateBadge } from "../../badges/Badges";
import type { ProjectConsoleCopy } from "./copy";

type RuntimeBadgeState = "blocker" | "ready" | "warning";

interface PointsRankingLedgerRuntimePanelProps {
  apiConfigured: boolean;
  copy: ProjectConsoleCopy;
  locale: SupportedLocale;
  onReview: () => void;
  reviewInFlight: boolean;
  state: PointsRankingLedgerRuntimeApiBridgeState;
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
  source: PointsRankingLedgerRuntimeApiSource,
  copy: ProjectConsoleCopy,
) => {
  const labels: Record<PointsRankingLedgerRuntimeApiSource, string> = {
    api_runtime: copy.pointsRankingLedgerRuntimeApiRuntime,
    error_fallback: copy.pointsRankingLedgerRuntimeError,
    loading: copy.pointsRankingLedgerRuntimeLoading,
    seeded_fallback: copy.pointsRankingLedgerRuntimeSeededFallback,
  };

  return labels[source];
};

const statusLabel = (
  status: PointsRankingLedgerRuntimeApiStatus,
  copy: ProjectConsoleCopy,
) => {
  const labels: Record<PointsRankingLedgerRuntimeApiStatus, string> = {
    blocked: copy.pointsRankingLedgerRuntimeStatusBlocked,
    error: copy.pointsRankingLedgerRuntimeStatusError,
    fallback: copy.pointsRankingLedgerRuntimeStatusFallback,
    loading: copy.pointsRankingLedgerRuntimeStatusLoading,
    ready: copy.pointsRankingLedgerRuntimeStatusReady,
    review_required: copy.pointsRankingLedgerRuntimeReviewRequired,
  };

  return labels[status];
};

const badgeState = (status: PointsRankingLedgerRuntimeApiStatus): RuntimeBadgeState =>
  status === "ready" || status === "review_required"
    ? "ready"
    : status === "blocked" || status === "error"
      ? "blocker"
      : "warning";

const sanitizePanelText = (value: unknown) =>
  sanitizePointsRankingLedgerRuntimeApiText(value)
    .replace(
      /\b(redacted bearer credential|redacted credential|password=redacted)\s*=\s*[^&\s"'<>]+/gi,
      "$1",
    )
    .replace(/\/Users\/[^"'\s<>]+/gi, "redacted local path");

const riskLabel = (riskFlags: readonly string[], copy: ProjectConsoleCopy) =>
  riskFlags.length > 0 ? riskFlags.join(" / ") : copy.pointsRankingLedgerRuntimeNoRiskFlags;

export function PointsRankingLedgerRuntimePanel({
  apiConfigured,
  copy,
  locale,
  onReview,
  reviewInFlight,
  state,
}: PointsRankingLedgerRuntimePanelProps) {
  const runtime = state.runtime;
  const summary = runtime.summary;
  const ledgerEvents = runtime.ledger.events.slice(0, 4);
  const rankingRows = runtime.ranking.rows.slice(0, 4);
  const root = runtime.eligibilityRoot;
  const diagnostics = [
    ...state.diagnostics.map((diagnostic) => ({
      code: diagnostic.code,
      message: getLocalizedText(diagnostic.message, locale),
      safeDetails: diagnostic.safeDetails,
      severity: diagnostic.severity,
    })),
    ...runtime.diagnostics.map((diagnostic) => ({
      code: diagnostic.code,
      message: getLocalizedText(diagnostic.message, locale),
      safeDetails: diagnostic.field ? { field: diagnostic.field, source: diagnostic.source } : { source: diagnostic.source },
      severity: diagnostic.severity,
    })),
  ];
  const disabledSideEffects = Object.entries(runtime.noLiveSideEffects)
    .filter(([, value]) => value === false)
    .map(([key]) => key);

  return (
    <article aria-label={copy.pointsRankingLedgerRuntimeRegionLabel} style={panelStyle}>
      <div style={headingRowStyle}>
        <div style={{ minWidth: 0 }}>
          <p style={statLabelStyle}>{copy.pointsRankingLedgerRuntimeStatus}</p>
          <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0" }}>
            {copy.pointsRankingLedgerRuntimeRegionLabel}
          </h4>
          <p style={bodyTextStyle}>{copy.pointsRankingLedgerRuntimeSubtitle}</p>
          <p style={{ ...bodyTextStyle, marginTop: 4 }}>
            {apiConfigured
              ? copy.pointsRankingLedgerRuntimeConfigured
              : copy.pointsRankingLedgerRuntimeNotConfigured}
          </p>
        </div>
        <span style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8 }}>
          <PublishStateBadge label={sourceLabel(state.source, copy)} state={badgeState(state.status)} />
          <PublishStateBadge label={statusLabel(state.status, copy)} state={badgeState(state.status)} />
        </span>
      </div>

      <div style={gridStyle}>
        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.pointsRankingLedgerRuntimeTraceId}</p>
          <p style={{ ...statValueStyle, fontSize: 15, ...wrapTextStyle }}>
            {state.traceId ?? runtime.traceId ?? copy.pointsRankingLedgerRuntimeNoTrace}
          </p>
          <p style={bodyTextStyle}>x-campaign-os-trace-id</p>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.pointsRankingLedgerRuntimeTotalLedgerEvents}</p>
          <p style={statValueStyle}>{summary.totalLedgerEvents}</p>
          <p style={bodyTextStyle}>
            {summary.completedEvents} {copy.pointsRankingLedgerRuntimeCompletedEvents} / {summary.pendingEvents} {copy.pointsRankingLedgerRuntimePendingEvents}
          </p>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.pointsRankingLedgerRuntimeTotalPoints}</p>
          <p style={statValueStyle}>{summary.totalPoints}</p>
          <p style={bodyTextStyle}>
            {summary.manualReviewEvents} {copy.pointsRankingLedgerRuntimeManualReviewEvents}
          </p>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.pointsRankingLedgerRuntimeRankingSnapshot}</p>
          <p style={statValueStyle}>{summary.rankedWallets}</p>
          <p style={bodyTextStyle}>
            {summary.eligibleWallets} {copy.pointsRankingLedgerRuntimeEligibleWallets} / {summary.riskFlaggedWallets} {copy.pointsRankingLedgerRuntimeRiskFlaggedWallets}
          </p>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.pointsRankingLedgerRuntimeEligibilityRoot}</p>
          <p style={{ ...statValueStyle, fontSize: 16, ...wrapTextStyle }}>{root.rootHash}</p>
          <p style={bodyTextStyle}>
            {root.eligibleWalletCount} / {root.totalRows} {copy.pointsRankingLedgerRuntimeEligibleWallets}
          </p>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.pointsRankingLedgerRuntimeDiagnostics}</p>
          <p style={statValueStyle}>{diagnostics.length}</p>
          <p style={bodyTextStyle}>
            {diagnostics.length ? copy.pointsRankingLedgerRuntimeDiagnostics : copy.pointsRankingLedgerRuntimeNoDiagnostics}
          </p>
        </article>
      </div>

      <button
        disabled={reviewInFlight}
        onClick={onReview}
        style={{
          ...actionButtonStyle,
          cursor: reviewInFlight ? "wait" : "pointer",
          opacity: reviewInFlight ? 0.72 : 1,
        }}
        type="button"
      >
        {reviewInFlight
          ? copy.pointsRankingLedgerRuntimeReviewing
          : copy.pointsRankingLedgerRuntimeReviewAction}
      </button>

      <section aria-label={copy.pointsRankingLedgerRuntimeLedgerEvents} style={cardStyle}>
        <p style={statLabelStyle}>{copy.pointsRankingLedgerRuntimeLedgerEvents}</p>
        <div style={gridStyle}>
          {ledgerEvents.map((event) => (
            <article key={event.eventId} style={{ display: "grid", gap: 6, minWidth: 0 }}>
              <p style={{ ...bodyTextStyle, color: "#0f172a", fontWeight: 900, ...wrapTextStyle }}>
                {event.templateCode} / {event.status}
              </p>
              <p style={{ ...bodyTextStyle, ...wrapTextStyle }}>
                {copy.pointsRankingLedgerRuntimeWallet}: {event.walletAddress} / {event.accountType} / {event.walletSource}
              </p>
              <p style={bodyTextStyle}>
                {copy.pointsRankingLedgerRuntimePointsAwarded}: {event.pointsAwarded} / {event.pointsAvailable}
              </p>
              <p style={{ ...bodyTextStyle, ...wrapTextStyle }}>
                {copy.pointsRankingLedgerRuntimeEvidenceHash}: {event.evidenceHash}
              </p>
              <p style={{ ...bodyTextStyle, ...wrapTextStyle }}>
                {copy.pointsRankingLedgerRuntimeRiskFlags}: {riskLabel(event.riskFlags, copy)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-label={copy.pointsRankingLedgerRuntimeRankingSnapshot} style={cardStyle}>
        <p style={statLabelStyle}>{copy.pointsRankingLedgerRuntimeRankingSnapshot}</p>
        <div style={gridStyle}>
          {rankingRows.map((row) => (
            <article key={row.walletAddress} style={{ display: "grid", gap: 6, minWidth: 0 }}>
              <p style={{ ...bodyTextStyle, color: "#0f172a", fontWeight: 900 }}>
                #{row.rank} / {row.totalPoints} / {row.eligible ? copy.participantEligible : copy.participantReviewRequired}
              </p>
              <p style={{ ...bodyTextStyle, ...wrapTextStyle }}>
                {row.walletAddress} / {row.accountType} / {row.walletSource} / {row.localePreference}
              </p>
              <p style={{ ...bodyTextStyle, ...wrapTextStyle }}>
                {copy.pointsRankingLedgerRuntimeMissingTasks}: {row.missingTasks.length ? row.missingTasks.join(" / ") : copy.pointsRankingLedgerRuntimeNoDiagnostics}
              </p>
              <p style={{ ...bodyTextStyle, ...wrapTextStyle }}>
                {copy.pointsRankingLedgerRuntimeRiskFlags}: {riskLabel(row.riskFlags, copy)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-label={copy.pointsRankingLedgerRuntimeEligibilityRoot} style={cardStyle}>
        <p style={statLabelStyle}>{copy.pointsRankingLedgerRuntimeEligibilityRoot}</p>
        <div style={gridStyle}>
          <article style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <p style={statLabelStyle}>{copy.pointsRankingLedgerRuntimeRootId}</p>
            <p style={{ ...bodyTextStyle, ...wrapTextStyle }}>{root.rootId}</p>
          </article>
          <article style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <p style={statLabelStyle}>{copy.pointsRankingLedgerRuntimeGenerationMode}</p>
            <p style={{ ...bodyTextStyle, ...wrapTextStyle }}>{root.generationMode}</p>
          </article>
          <article style={{ display: "grid", gap: 6, minWidth: 0 }}>
            <p style={statLabelStyle}>{copy.pointsRankingLedgerRuntimeContractRootMode}</p>
            <p style={{ ...bodyTextStyle, ...wrapTextStyle }}>{root.contractRootMode}</p>
          </article>
        </div>
        <p style={bodyTextStyle}>{getLocalizedText(root.nextAction, locale)}</p>
      </section>

      <section aria-label={copy.pointsRankingLedgerRuntimeNoLiveSideEffects} style={cardStyle}>
        <p style={statLabelStyle}>{copy.pointsRankingLedgerRuntimeNoLiveSideEffects}</p>
        <ul style={compactListStyle}>
          {[
            copy.pointsRankingLedgerRuntimeNoPixiepointsLedgerWrite,
            copy.pointsRankingLedgerRuntimeNoBackendLedgerWrite,
            copy.pointsRankingLedgerRuntimeNoProviderIndexer,
            copy.pointsRankingLedgerRuntimeNoWalletSignature,
            copy.pointsRankingLedgerRuntimeNoContractRootWrite,
            copy.pointsRankingLedgerRuntimeNoExportFileWrite,
            copy.pointsRankingLedgerRuntimeNoRewardCustody,
            copy.pointsRankingLedgerRuntimeNoRewardDistribution,
          ].map((label) => (
            <li key={label} style={chipStyle}>
              {label}
            </li>
          ))}
          <li style={chipStyle}>
            {disabledSideEffects.length} {copy.pointsRankingLedgerRuntimeNoLiveSideEffects}
          </li>
        </ul>
      </section>

      {diagnostics.length > 0 && (
        <section aria-label={copy.pointsRankingLedgerRuntimeDiagnostics} style={{ display: "grid", gap: 8 }}>
          <p style={statLabelStyle}>{copy.pointsRankingLedgerRuntimeDiagnostics}</p>
          {diagnostics.slice(0, 5).map((diagnostic) => (
            <p
              key={`${diagnostic.code}-${diagnostic.severity}-${diagnostic.message}`}
              style={{
                ...boundaryStyle,
                color: diagnostic.severity === "error" ? "#991b1b" : "#9a3412",
              }}
            >
              {diagnostic.code}: {sanitizePanelText(diagnostic.message)}
              {diagnostic.safeDetails
                ? ` (${sanitizePanelText(diagnostic.safeDetails)})`
                : ""}
            </p>
          ))}
        </section>
      )}

      <p style={boundaryStyle}>
        {copy.pointsRankingLedgerRuntimeBoundary}: {getLocalizedText(state.boundary, locale)}
      </p>
    </article>
  );
}
