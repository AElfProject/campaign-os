import type { CSSProperties } from "react";
import {
  sanitizeBackendRuntimeReadinessApiText,
  type BackendRuntimeReadinessApiBridgeState,
  type BackendRuntimeReadinessApiSource,
  type BackendRuntimeReadinessApiStatus,
} from "../../../api/backendRuntimeReadinessApiBridge";
import { getLocalizedText, type SupportedLocale } from "../../../domain";
import { PublishStateBadge } from "../../badges/Badges";
import type { ProjectConsoleCopy } from "./copy";

type BackendRuntimeReadinessBadgeState = "blocker" | "ready" | "warning";

interface BackendRuntimeReadinessPanelProps {
  apiConfigured: boolean;
  copy: ProjectConsoleCopy;
  locale: SupportedLocale;
  onReview: () => void;
  reviewInFlight: boolean;
  state: BackendRuntimeReadinessApiBridgeState;
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

const backendReadinessApiSourceLabel = (
  source: BackendRuntimeReadinessApiSource,
  copy: ProjectConsoleCopy,
) => {
  const labels: Record<BackendRuntimeReadinessApiSource, string> = {
    api_runtime: copy.backendReadinessApiRuntime,
    error_fallback: copy.backendReadinessErrorFallback,
    loading: copy.backendReadinessLoading,
    seeded_fallback: copy.backendReadinessSeededFallback,
  };

  return labels[source];
};

const backendReadinessStatusLabel = (
  status: BackendRuntimeReadinessApiStatus,
  copy: ProjectConsoleCopy,
) => {
  const labels: Record<BackendRuntimeReadinessApiStatus, string> = {
    blocked: copy.backendReadinessStatusBlocked,
    error: copy.backendReadinessStatusError,
    fallback: copy.backendReadinessStatusFallback,
    loading: copy.backendReadinessStatusLoading,
    ready: copy.backendReadinessStatusReady,
    scaffold: copy.backendReadinessStatusScaffold,
  };

  return labels[status];
};

const backendReadinessBadgeState = (
  status: BackendRuntimeReadinessApiStatus,
): BackendRuntimeReadinessBadgeState =>
  status === "ready" ? "ready" : status === "blocked" || status === "error" ? "blocker" : "warning";

const listOrFallback = (items: readonly string[], fallback: string) => (items.length > 0 ? items : [fallback]);

const uniqueStrings = (items: readonly string[]) => [...new Set(items)];

const sanitizePanelDiagnosticText = (value: unknown) =>
  sanitizeBackendRuntimeReadinessApiText(value)
    .replace(
      /\b(redacted bearer credential|redacted credential|password=redacted)\s*=\s*[^&\s"'<>]+/gi,
      "$1",
    )
    .replace(/\/Users\/[^"'\s<>]+/gi, "redacted local path");

export function BackendRuntimeReadinessPanel({
  apiConfigured,
  copy,
  locale,
  onReview,
  reviewInFlight,
  state,
}: BackendRuntimeReadinessPanelProps) {
  const {
    deployHandoff,
    futureProductionBlockerIds,
    mvpReleaseBlockerIds,
    mvpReleaseReady,
    noLiveSideEffects,
    productionDependencyBlockers,
    profile,
    routeCoverage,
  } = state.summary;
  const noLiveDisabledCount = Object.values(noLiveSideEffects).filter((value) => value === false).length;
  const blockedDependencyLabels = uniqueStrings(
    productionDependencyBlockers.flatMap((blocker) => [blocker.area, ...blocker.blockedBy]),
  );

  return (
    <article aria-label={copy.backendReadinessRegionLabel} style={panelStyle}>
      <div style={headingRowStyle}>
        <div style={{ minWidth: 0 }}>
          <p style={statLabelStyle}>{copy.backendReadinessStatus}</p>
          <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0" }}>
            {copy.backendReadinessRegionLabel}
          </h4>
          <p style={bodyTextStyle}>
            {apiConfigured ? copy.backendReadinessConfigured : copy.backendReadinessNotConfigured}
          </p>
        </div>
        <span style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8 }}>
          <PublishStateBadge
            label={backendReadinessApiSourceLabel(state.source, copy)}
            state={backendReadinessBadgeState(state.status)}
          />
          <PublishStateBadge
            label={backendReadinessStatusLabel(state.status, copy)}
            state={backendReadinessBadgeState(state.status)}
          />
        </span>
      </div>

      <div style={gridStyle}>
        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.backendReadinessTraceId}</p>
          <p style={{ ...statValueStyle, fontSize: 15, ...wrapTextStyle }}>
            {state.traceId ?? copy.backendReadinessNoTrace}
          </p>
          <p style={bodyTextStyle}>{deployHandoff.traceHeaderName}</p>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.backendReadinessProfile}</p>
          <p style={{ ...statValueStyle, fontSize: 16, ...wrapTextStyle }}>{profile.id}</p>
          <p style={bodyTextStyle}>
            {profile.status} / {profile.supportMode}
          </p>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.backendReadinessRouteCoverage}</p>
          <p style={statValueStyle}>
            {routeCoverage.runtimeRouteCount} / {routeCoverage.routeCount}
          </p>
          <p style={bodyTextStyle}>
            {routeCoverage.coveredApiSkillCount} / {routeCoverage.requiredApiSkillCount} {copy.backendReadinessApiSkills}
          </p>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.backendReadinessMvpReleaseGate}</p>
          <p style={{ ...statValueStyle, fontSize: 18 }}>
            {mvpReleaseReady ? copy.backendReadinessMvpReleaseReady : copy.backendReadinessMvpReleaseBlocked}
          </p>
          <p style={bodyTextStyle}>
            {mvpReleaseBlockerIds.length} {copy.backendReadinessMvpReleaseBlockersSuffix}
          </p>
          <ul style={compactListStyle}>
            {listOrFallback(mvpReleaseBlockerIds, copy.backendReadinessNone).map((blockerId) => (
              <li key={blockerId} style={chipStyle}>
                {blockerId}
              </li>
            ))}
          </ul>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.backendReadinessFutureProductionBlockers}</p>
          <p style={statValueStyle}>{futureProductionBlockerIds.length}</p>
          <p style={bodyTextStyle}>
            {futureProductionBlockerIds.length} {copy.backendReadinessFutureProductionSuffix}
          </p>
          <p style={bodyTextStyle}>{copy.backendReadinessFutureProductionNote}</p>
          <ul style={compactListStyle}>
            {listOrFallback(futureProductionBlockerIds, copy.backendReadinessNone).map((blockerId) => (
              <li key={blockerId} style={chipStyle}>
                {blockerId}
              </li>
            ))}
          </ul>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.backendReadinessMissingApiSkills}</p>
          <p style={statValueStyle}>{routeCoverage.missingApiSkillIds.length}</p>
          <p style={bodyTextStyle}>
            {routeCoverage.readyCount} {copy.backendReadinessStatusReady} / {routeCoverage.reviewRequiredCount} {copy.backendReadinessStatusScaffold}
          </p>
          <ul style={compactListStyle}>
            {listOrFallback(routeCoverage.missingApiSkillIds, copy.backendReadinessNone).map((skillId) => (
              <li key={skillId} style={chipStyle}>
                {skillId}
              </li>
            ))}
          </ul>
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
        {reviewInFlight ? copy.backendReadinessLoading : copy.backendReadinessReviewAction}
      </button>

      <div style={gridStyle}>
        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.backendReadinessDeployHandoff}</p>
          <ul style={compactListStyle}>
            <li style={chipStyle}>{deployHandoff.startCommand}</li>
            <li style={chipStyle}>{deployHandoff.smokeCommand}</li>
            <li style={chipStyle}>
              {copy.backendReadinessShutdown}: {deployHandoff.shutdownTimeoutMs}ms
            </li>
          </ul>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.backendReadinessEndpoints}</p>
          <ul style={compactListStyle}>
            <li style={chipStyle}>{deployHandoff.healthEndpoint}</li>
            <li style={chipStyle}>{deployHandoff.contractsEndpoint}</li>
            <li style={chipStyle}>{deployHandoff.runtimeTarget}</li>
          </ul>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.backendReadinessRouteIds}</p>
          <ul style={compactListStyle}>
            {listOrFallback(routeCoverage.routeIds, copy.backendReadinessNone).map((routeId) => (
              <li key={routeId} style={chipStyle}>
                {routeId}
              </li>
            ))}
          </ul>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.backendReadinessRequiredConfigKeys}</p>
          <ul style={compactListStyle}>
            {listOrFallback(profile.requiredConfigKeys, copy.backendReadinessNone).map((key) => (
              <li key={key} style={chipStyle}>
                {key}
              </li>
            ))}
          </ul>
        </article>
      </div>

      <div style={gridStyle}>
        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.backendReadinessMissingConfigKeys}</p>
          <ul style={compactListStyle}>
            {listOrFallback(profile.missingRequiredConfigKeys, copy.backendReadinessNone).map((key) => (
              <li key={key} style={chipStyle}>
                {key}
              </li>
            ))}
          </ul>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.backendReadinessBlockedDependencies}</p>
          <ul style={compactListStyle}>
            {listOrFallback(
              blockedDependencyLabels,
              copy.backendReadinessNone,
            ).map((blocker) => (
              <li key={blocker} style={chipStyle}>
                {blocker}
              </li>
            ))}
          </ul>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.backendReadinessNoLiveBoundary}</p>
          <p style={statValueStyle}>{noLiveDisabledCount}</p>
          <p style={bodyTextStyle}>{copy.backendReadinessNoLiveDisabled}</p>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.backendReadinessDiagnostics}</p>
          <p style={statValueStyle}>{state.diagnostics.length + state.summary.diagnostics.length}</p>
          <p style={bodyTextStyle}>{copy.backendReadinessSanitizedDiagnostics}</p>
        </article>
      </div>

      <ul style={compactListStyle}>
        {[
          copy.backendReadinessNoProviderNetwork,
          copy.backendReadinessNoProductionDatabase,
          copy.backendReadinessNoWalletSdk,
          copy.backendReadinessNoContractWrite,
          copy.backendReadinessNoScheduler,
          copy.backendReadinessNoRewardCustody,
          copy.backendReadinessNoRewardDistribution,
        ].map((label) => (
          <li key={label} style={chipStyle}>
            {label}
          </li>
        ))}
      </ul>

      {(state.diagnostics.length > 0 || state.summary.diagnostics.length > 0) && (
        <div aria-label={copy.backendReadinessDiagnostics} style={{ display: "grid", gap: 8 }}>
          <p style={statLabelStyle}>{copy.backendReadinessDiagnostics}</p>
          {state.diagnostics.map((diagnostic) => (
            <p
              key={`${diagnostic.code}-${diagnostic.severity}`}
              style={{
                ...boundaryStyle,
                color: diagnostic.severity === "error" ? "#991b1b" : "#9a3412",
              }}
            >
              {diagnostic.code}: {sanitizePanelDiagnosticText(getLocalizedText(diagnostic.message, locale))}
            </p>
          ))}
          {state.summary.diagnostics.map((diagnostic) => (
            <p
              key={`${diagnostic.code}-${diagnostic.severity}`}
              style={{
                ...boundaryStyle,
                color: diagnostic.severity === "error" ? "#991b1b" : "#9a3412",
              }}
            >
              {diagnostic.code}: {sanitizePanelDiagnosticText(diagnostic.message)}
            </p>
          ))}
        </div>
      )}

      <p style={boundaryStyle}>
        {copy.backendReadinessBoundary}: {getLocalizedText(state.boundary, locale)}
      </p>
    </article>
  );
}
