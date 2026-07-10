import type { CSSProperties } from "react";
import {
  sanitizeAnalyticsIngestionRuntimeApiText,
  type AnalyticsIngestionRuntimeApiBridgeState,
  type AnalyticsIngestionRuntimeApiSource,
  type AnalyticsIngestionRuntimeApiStatus,
} from "../../../api/analyticsIngestionRuntimeApiBridge";
import { getLocalizedText, type SupportedLocale } from "../../../domain";
import { PublishStateBadge } from "../../badges/Badges";
import type { ProjectConsoleCopy } from "./copy";

type AnalyticsIngestionBadgeState = "blocker" | "ready" | "warning";

interface AnalyticsIngestionRuntimePanelProps {
  apiConfigured: boolean;
  copy: ProjectConsoleCopy;
  locale: SupportedLocale;
  onReview: () => void;
  reviewInFlight: boolean;
  state: AnalyticsIngestionRuntimeApiBridgeState;
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
  source: AnalyticsIngestionRuntimeApiSource,
  copy: ProjectConsoleCopy,
) => {
  const labels: Record<AnalyticsIngestionRuntimeApiSource, string> = {
    api_runtime: copy.analyticsIngestionRuntimeApiRuntime,
    error_fallback: copy.analyticsIngestionRuntimeErrorFallback,
    loading: copy.analyticsIngestionRuntimeLoading,
    seeded_fallback: copy.analyticsIngestionRuntimeSeededFallback,
  };

  return labels[source];
};

const statusLabel = (
  status: AnalyticsIngestionRuntimeApiStatus,
  copy: ProjectConsoleCopy,
) => {
  const labels: Record<AnalyticsIngestionRuntimeApiStatus, string> = {
    blocked: copy.analyticsIngestionRuntimeStatusBlocked,
    error: copy.analyticsIngestionRuntimeStatusError,
    fallback: copy.analyticsIngestionRuntimeStatusFallback,
    loading: copy.analyticsIngestionRuntimeStatusLoading,
    local_ready: copy.analyticsIngestionRuntimeStatusLocalReady,
    review_required: copy.analyticsIngestionRuntimeReviewRequired,
  };

  return labels[status];
};

const badgeState = (
  status: AnalyticsIngestionRuntimeApiStatus,
): AnalyticsIngestionBadgeState =>
  status === "review_required" || status === "local_ready"
    ? "ready"
    : status === "blocked" || status === "error"
      ? "blocker"
      : "warning";

const sanitizePanelText = (value: unknown) =>
  sanitizeAnalyticsIngestionRuntimeApiText(value)
    .replace(
      /\b(redacted bearer credential|redacted credential|password=redacted)\s*=\s*[^&\s"'<>]+/gi,
      "$1",
    )
    .replace(/\/Users\/[^"'\s<>]+/gi, "redacted local path");

const listOrFallback = (items: readonly string[], fallback: string) => (items.length > 0 ? items : [fallback]);

const safetyItems = (copy: ProjectConsoleCopy) => [
  ["liveAnalyticsSdkExecuted", copy.analyticsIngestionRuntimeNoAnalyticsSdk],
  ["liveEventIngestionEnabled", copy.analyticsIngestionRuntimeNoEventIngestion],
  ["liveEventWarehouseWrite", copy.analyticsIngestionRuntimeNoWarehouseWrite],
  ["liveBrowserTrackingEnabled", copy.analyticsIngestionRuntimeNoBrowserTracking],
  ["liveProfilingEnabled", copy.analyticsIngestionRuntimeNoProfiling],
  ["liveFingerprintingEnabled", copy.analyticsIngestionRuntimeNoFingerprinting],
  ["liveExportFileWrite", copy.analyticsIngestionRuntimeNoExportWrite],
  ["liveContractWrite", copy.analyticsIngestionRuntimeNoContractWrite],
  ["liveRewardCustody", copy.analyticsIngestionRuntimeNoRewardCustody],
  ["liveRewardDistribution", copy.analyticsIngestionRuntimeNoRewardDistribution],
] as const;

export function AnalyticsIngestionRuntimePanel({
  apiConfigured,
  copy,
  locale,
  onReview,
  reviewInFlight,
  state,
}: AnalyticsIngestionRuntimePanelProps) {
  const readiness = state.readiness;
  const warehouse = readiness.warehouseHandoff;
  const topBlocker = getLocalizedText(warehouse.topBlocker, locale);
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
    <article aria-label={copy.analyticsIngestionRuntimeRegionLabel} style={panelStyle}>
      <div style={headingRowStyle}>
        <div style={{ minWidth: 0 }}>
          <p style={statLabelStyle}>{copy.analyticsIngestionRuntimeStatus}</p>
          <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0" }}>
            {copy.analyticsIngestionRuntimeRegionLabel}
          </h4>
          <p style={bodyTextStyle}>{copy.analyticsIngestionRuntimeSubtitle}</p>
          <p style={{ ...bodyTextStyle, marginTop: 4 }}>
            {apiConfigured
              ? copy.analyticsIngestionRuntimeConfigured
              : copy.analyticsIngestionRuntimeNotConfigured}
          </p>
        </div>
        <span style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8 }}>
          <PublishStateBadge label={sourceLabel(state.source, copy)} state={badgeState(state.status)} />
          <PublishStateBadge label={statusLabel(state.status, copy)} state={badgeState(state.status)} />
        </span>
      </div>

      <div style={gridStyle}>
        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.analyticsIngestionRuntimeTraceId}</p>
          <p style={{ ...statValueStyle, fontSize: 15, ...wrapTextStyle }}>
            {state.traceId ?? (state.source === "api_runtime" ? readiness.traceId : copy.analyticsIngestionRuntimeNoTrace)}
          </p>
          <p style={bodyTextStyle}>x-campaign-os-trace-id</p>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.analyticsIngestionRuntimeEventCatalog}</p>
          <p style={statValueStyle}>{readiness.summary.eventGroupCount}</p>
          <p style={bodyTextStyle}>{readiness.summary.totalEvents} {copy.analyticsIngestionRuntimeEvents}</p>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.analyticsIngestionRuntimeMetricLineage}</p>
          <p style={statValueStyle}>{readiness.summary.metricLineageCount}</p>
          <p style={bodyTextStyle}>{copy.analyticsIngestionRuntimeWarehouseStatus}: {warehouse.status}</p>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.analyticsIngestionRuntimeTopBlocker}</p>
          <p style={{ ...statValueStyle, fontSize: 15, ...wrapTextStyle }}>{topBlocker}</p>
          <p style={bodyTextStyle}>{warehouse.missingConfigKeys.length} {copy.analyticsIngestionRuntimeMissingConfig}</p>
        </article>
      </div>

      <div style={gridStyle}>
        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.analyticsIngestionRuntimeEventCatalog}</p>
          <ul style={compactListStyle}>
            {readiness.eventCatalog.slice(0, 6).map((eventGroup) => (
              <li key={eventGroup.id} style={chipStyle}>
                {getLocalizedText(eventGroup.label, locale)}: {eventGroup.eventCount}
              </li>
            ))}
          </ul>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.analyticsIngestionRuntimeMetricLineage}</p>
          <ul style={compactListStyle}>
            {readiness.metricLineage.slice(0, 6).map((row) => (
              <li key={row.id} style={chipStyle}>
                {getLocalizedText(row.label, locale)}: {row.outputMetric}
              </li>
            ))}
          </ul>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.analyticsIngestionRuntimeRequiredConfigKeys}</p>
          <ul style={compactListStyle}>
            {listOrFallback(warehouse.requiredConfigKeys.slice(0, 4), copy.analyticsIngestionRuntimeNone).map((key) => (
              <li key={key} style={chipStyle}>
                {key}
              </li>
            ))}
          </ul>
        </article>
      </div>

      <article style={cardStyle}>
        <p style={statLabelStyle}>{copy.analyticsIngestionRuntimeSafety}</p>
        <ul style={compactListStyle}>
          {safetyItems(copy).map(([key, label]) => (
            <li key={key} style={chipStyle}>
              {readiness.noLiveSideEffects[key] === false ? label : copy.analyticsIngestionRuntimeUnsafeFlag}
            </li>
          ))}
        </ul>
      </article>

      <section aria-label={copy.analyticsIngestionRuntimeNextAction} style={cardStyle}>
        <p style={statLabelStyle}>{copy.analyticsIngestionRuntimeNextAction}</p>
        <p style={{ ...bodyTextStyle, ...wrapTextStyle }}>
          {sanitizePanelText(getLocalizedText(readiness.summary.topNextAction, locale))}
        </p>
      </section>

      <section aria-label={copy.analyticsIngestionRuntimeSanitizedDiagnostics} style={cardStyle}>
        <p style={statLabelStyle}>{copy.analyticsIngestionRuntimeDiagnostics}</p>
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
          <p style={bodyTextStyle}>{copy.analyticsIngestionRuntimeNoDiagnostics}</p>
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
          ? copy.analyticsIngestionRuntimeReviewingAction
          : copy.analyticsIngestionRuntimeReviewAction}
      </button>
    </article>
  );
}
