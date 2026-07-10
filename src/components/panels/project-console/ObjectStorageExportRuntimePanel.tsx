import type { CSSProperties } from "react";
import {
  sanitizeObjectStorageExportRuntimeApiText,
  type ObjectStorageExportRuntimeApiBridgeState,
  type ObjectStorageExportRuntimeApiSource,
  type ObjectStorageExportRuntimeApiStatus,
} from "../../../api/objectStorageExportRuntimeApiBridge";
import { getLocalizedText, type SupportedLocale } from "../../../domain";
import { PublishStateBadge } from "../../badges/Badges";
import type { ProjectConsoleCopy } from "./copy";

type ObjectStorageExportBadgeState = "blocker" | "ready" | "warning";

interface ObjectStorageExportRuntimePanelProps {
  apiConfigured: boolean;
  copy: ProjectConsoleCopy;
  locale: SupportedLocale;
  onReview: () => void;
  reviewInFlight: boolean;
  state: ObjectStorageExportRuntimeApiBridgeState;
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
  source: ObjectStorageExportRuntimeApiSource,
  copy: ProjectConsoleCopy,
) => {
  const labels: Record<ObjectStorageExportRuntimeApiSource, string> = {
    api_runtime: copy.objectStorageExportRuntimeApiRuntime,
    error_fallback: copy.objectStorageExportRuntimeErrorFallback,
    loading: copy.objectStorageExportRuntimeLoading,
    seeded_fallback: copy.objectStorageExportRuntimeSeededFallback,
  };

  return labels[source];
};

const statusLabel = (
  status: ObjectStorageExportRuntimeApiStatus,
  copy: ProjectConsoleCopy,
) => {
  const labels: Record<ObjectStorageExportRuntimeApiStatus, string> = {
    blocked: copy.objectStorageExportRuntimeStatusBlocked,
    deferred: copy.objectStorageExportRuntimeStatusDeferred,
    error: copy.objectStorageExportRuntimeStatusError,
    fallback: copy.objectStorageExportRuntimeStatusFallback,
    loading: copy.objectStorageExportRuntimeStatusLoading,
    review_required: copy.objectStorageExportRuntimeReviewRequired,
  };

  return labels[status];
};

const badgeState = (
  status: ObjectStorageExportRuntimeApiStatus,
): ObjectStorageExportBadgeState =>
  status === "review_required"
    ? "ready"
    : status === "blocked" || status === "error"
      ? "blocker"
      : "warning";

const sanitizePanelText = (value: unknown) =>
  sanitizeObjectStorageExportRuntimeApiText(value)
    .replace(
      /\b(redacted bearer credential|redacted credential|password=redacted)\s*=\s*[^&\s"'<>]+/gi,
      "$1",
    )
    .replace(/\/Users\/[^"'\s<>]+/gi, "redacted local path");

const listOrFallback = (items: readonly string[], fallback: string) => (items.length > 0 ? items : [fallback]);

const safetyItems = (copy: ProjectConsoleCopy) => [
  ["liveUploadEnabled", copy.objectStorageExportRuntimeNoUpload],
  ["downloadEnabled", copy.objectStorageExportRuntimeNoDownload],
  ["signedUrlCreated", copy.objectStorageExportRuntimeNoSignedUrl],
  ["objectKeyCreated", copy.objectStorageExportRuntimeNoObjectKey],
  ["providerCallAttempted", copy.objectStorageExportRuntimeNoProviderCall],
  ["contractWriteExecuted", copy.objectStorageExportRuntimeNoContractWrite],
  ["walletSignatureExecuted", copy.objectStorageExportRuntimeNoWalletSignature],
  ["rewardCustodyExecuted", copy.objectStorageExportRuntimeNoRewardCustody],
  ["rewardDistributionExecuted", copy.objectStorageExportRuntimeNoRewardDistribution],
] as const;

export function ObjectStorageExportRuntimePanel({
  apiConfigured,
  copy,
  locale,
  onReview,
  reviewInFlight,
  state,
}: ObjectStorageExportRuntimePanelProps) {
  const readiness = state.readiness;
  const manifest = readiness.manifestSummary;
  const topBlocker = readiness.diagnosticCodes[0] ?? copy.objectStorageExportRuntimeNoDiagnostics;
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
    <article aria-label={copy.objectStorageExportRuntimeRegionLabel} style={panelStyle}>
      <div style={headingRowStyle}>
        <div style={{ minWidth: 0 }}>
          <p style={statLabelStyle}>{copy.objectStorageExportRuntimeStatus}</p>
          <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0" }}>
            {copy.objectStorageExportRuntimeRegionLabel}
          </h4>
          <p style={bodyTextStyle}>{copy.objectStorageExportRuntimeSubtitle}</p>
          <p style={{ ...bodyTextStyle, marginTop: 4 }}>
            {apiConfigured
              ? copy.objectStorageExportRuntimeConfigured
              : copy.objectStorageExportRuntimeNotConfigured}
          </p>
        </div>
        <span style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8 }}>
          <PublishStateBadge label={sourceLabel(state.source, copy)} state={badgeState(state.status)} />
          <PublishStateBadge label={statusLabel(state.status, copy)} state={badgeState(state.status)} />
        </span>
      </div>

      <div style={gridStyle}>
        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.objectStorageExportRuntimeTraceId}</p>
          <p style={{ ...statValueStyle, fontSize: 15, ...wrapTextStyle }}>
            {state.traceId ?? (state.source === "api_runtime" ? readiness.traceId : copy.objectStorageExportRuntimeNoTrace)}
          </p>
          <p style={bodyTextStyle}>x-campaign-os-trace-id</p>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.objectStorageExportRuntimeReadiness}</p>
          <p style={{ ...statValueStyle, fontSize: 18, ...wrapTextStyle }}>
            {readiness.status}
          </p>
          <p style={bodyTextStyle}>
            {copy.objectStorageExportRuntimeProviderStatus}: {readiness.providerStatus}
          </p>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.objectStorageExportRuntimeTopBlocker}</p>
          <p style={{ ...statValueStyle, fontSize: 15, ...wrapTextStyle }}>
            {topBlocker}
          </p>
          <p style={bodyTextStyle}>
            {readiness.blockerCount} {copy.countBlockers}
          </p>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.objectStorageExportRuntimeManifest}</p>
          <p style={{ ...statValueStyle, fontSize: 15, ...wrapTextStyle }}>
            {manifest.exportBatchId}
          </p>
          <p style={bodyTextStyle}>
            {manifest.artifactCount} {copy.objectStorageExportRuntimeArtifacts} / {manifest.retentionClass}
          </p>
        </article>
      </div>

      <div style={gridStyle}>
        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.objectStorageExportRuntimeFormats}</p>
          <ul style={compactListStyle}>
            {listOrFallback(manifest.formats, copy.objectStorageExportRuntimeNone).map((format) => (
              <li key={format} style={chipStyle}>
                {format}
              </li>
            ))}
          </ul>
          <p style={bodyTextStyle}>{manifest.classification}</p>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.objectStorageExportRuntimeRequiredConfigKeys}</p>
          <ul style={compactListStyle}>
            {listOrFallback(readiness.requiredConfigKeys.slice(0, 4), copy.objectStorageExportRuntimeNone).map((key) => (
              <li key={key} style={chipStyle}>
                {key}
              </li>
            ))}
          </ul>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.objectStorageExportRuntimeSafety}</p>
          <ul style={compactListStyle}>
            {safetyItems(copy).map(([key, label]) => (
              <li key={key} style={chipStyle}>
                {readiness.safety[key] === false ? label : copy.objectStorageExportRuntimeUnsafeFlag}
              </li>
            ))}
          </ul>
        </article>
      </div>

      <section aria-label={copy.objectStorageExportRuntimeNextAction} style={cardStyle}>
        <p style={statLabelStyle}>{copy.objectStorageExportRuntimeNextAction}</p>
        <p style={{ ...bodyTextStyle, ...wrapTextStyle }}>{sanitizePanelText(readiness.nextAction)}</p>
      </section>

      <section aria-label={copy.objectStorageExportRuntimeSanitizedDiagnostics} style={cardStyle}>
        <p style={statLabelStyle}>{copy.objectStorageExportRuntimeDiagnostics}</p>
        {diagnostics.length > 0 ? (
          <ul style={{ display: "grid", gap: 8, margin: 0, padding: 0 }}>
            {diagnostics.slice(0, 4).map((diagnostic, index) => (
              <li key={`${diagnostic.code}-${index}`} style={{ ...bodyTextStyle, listStyle: "none", ...wrapTextStyle }}>
                {diagnostic.code}: {sanitizePanelText(diagnostic.message)}
                {diagnostic.safeDetails
                  ? ` / ${sanitizePanelText(diagnostic.safeDetails)}`
                  : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p style={bodyTextStyle}>{copy.objectStorageExportRuntimeNoDiagnostics}</p>
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
          ? copy.objectStorageExportRuntimeReviewingAction
          : copy.objectStorageExportRuntimeReviewAction}
      </button>
    </article>
  );
}
