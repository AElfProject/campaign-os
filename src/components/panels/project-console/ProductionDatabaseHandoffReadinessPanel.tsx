import type { CSSProperties } from "react";
import {
  sanitizeProductionDatabaseHandoffReadinessApiText,
  type ProductionDatabaseHandoffReadinessApiSource,
  type ProductionDatabaseHandoffReadinessApiState,
} from "../../../api/productionDatabaseHandoffReadinessApiBridge";
import { getLocalizedText, type SupportedLocale } from "../../../domain";
import type { ProductionDatabaseHandoffStatus } from "../../../domain/productionDatabaseHandoffReadiness";
import { PublishStateBadge } from "../../badges/Badges";
import type { ProjectConsoleCopy } from "./copy";

type ProductionDatabaseBadgeState = "blocker" | "ready" | "warning";

interface ProductionDatabaseHandoffReadinessPanelProps {
  apiConfigured: boolean;
  copy: ProjectConsoleCopy;
  locale: SupportedLocale;
  onReview: () => void;
  reviewInFlight: boolean;
  state: ProductionDatabaseHandoffReadinessApiState;
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

const keyValueRowStyle: CSSProperties = {
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
  source: ProductionDatabaseHandoffReadinessApiSource,
  copy: ProjectConsoleCopy,
) => {
  const labels: Record<ProductionDatabaseHandoffReadinessApiSource, string> = {
    api_runtime: copy.productionDatabaseHandoffApiRuntime,
    seeded_fallback: copy.productionDatabaseHandoffSeededFallback,
  };

  return labels[source];
};

const statusLabel = (
  status: ProductionDatabaseHandoffStatus,
  copy: ProjectConsoleCopy,
) => {
  const labels: Record<ProductionDatabaseHandoffStatus, string> = {
    blocked: copy.productionDatabaseHandoffStatusBlocked,
    local_ready: copy.productionDatabaseHandoffStatusLocalReady,
    review_required: copy.productionDatabaseHandoffStatusReviewRequired,
  };

  return labels[status];
};

const badgeState = (status: ProductionDatabaseHandoffStatus): ProductionDatabaseBadgeState =>
  status === "local_ready" ? "ready" : status === "blocked" ? "blocker" : "warning";

const sanitizePanelText = (value: unknown) =>
  sanitizeProductionDatabaseHandoffReadinessApiText(value)
    .replace(/\/Users\/[^"'\s<>]+/gi, "redacted local path")
    .replace(/\/private\/[^"'\s<>]+/gi, "redacted private path");

const safetyItems = (copy: ProjectConsoleCopy) => [
  ["dbClientConstructed", copy.productionDatabaseHandoffNoDbClient],
  ["liveConnectionAttempted", copy.productionDatabaseHandoffNoConnection],
  ["liveQueryExecutionEnabled", copy.productionDatabaseHandoffNoQuery],
  ["liveStorageWritesEnabled", copy.productionDatabaseHandoffNoStorageWrite],
  ["liveTransactionExecutionEnabled", copy.productionDatabaseHandoffNoTransaction],
  ["liveMigrationExecutionEnabled", copy.productionDatabaseHandoffNoMigrationExecution],
  ["secretValueExposed", copy.productionDatabaseHandoffNoSecretReveal],
  ["liveProviderCallsEnabled", copy.productionDatabaseHandoffNoProviderCall],
  ["liveContractWritesEnabled", copy.productionDatabaseHandoffNoContractWrite],
  ["liveProductionMutationEnabled", copy.productionDatabaseHandoffNoProductionMutation],
  ["liveRewardCustodyEnabled", copy.productionDatabaseHandoffNoRewardCustody],
  ["liveRewardDistributionEnabled", copy.productionDatabaseHandoffNoRewardDistribution],
] as const;

export function ProductionDatabaseHandoffReadinessPanel({
  apiConfigured,
  copy,
  locale,
  onReview,
  reviewInFlight,
  state,
}: ProductionDatabaseHandoffReadinessPanelProps) {
  const handoff = state.handoff;
  const migrationGate = handoff.migrationGate;
  const packageBinding = handoff.packageBinding;
  const diagnostics = [
    ...state.diagnostics.map((diagnostic) => ({
      code: diagnostic.code,
      message: getLocalizedText(diagnostic.message, locale),
      safeDetails: diagnostic.safeDetails,
      severity: diagnostic.severity,
    })),
    ...handoff.diagnostics.map((diagnostic) => ({
      code: diagnostic.code,
      message: diagnostic.message,
      safeDetails: diagnostic.safeDetails,
      severity: diagnostic.severity,
    })),
  ];

  return (
    <article aria-label={copy.productionDatabaseHandoffRegionLabel} style={panelStyle}>
      <div style={headingRowStyle}>
        <div style={{ minWidth: 0 }}>
          <p style={statLabelStyle}>{copy.productionDatabaseHandoffStatus}</p>
          <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0" }}>
            {copy.productionDatabaseHandoffRegionLabel}
          </h4>
          <p style={bodyTextStyle}>{copy.productionDatabaseHandoffSubtitle}</p>
          <p style={{ ...bodyTextStyle, marginTop: 4 }}>
            {apiConfigured
              ? copy.productionDatabaseHandoffConfigured
              : copy.productionDatabaseHandoffNotConfigured}
          </p>
        </div>
        <span style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8 }}>
          <PublishStateBadge label={sourceLabel(state.source, copy)} state={badgeState(handoff.status)} />
          <PublishStateBadge label={statusLabel(handoff.status, copy)} state={badgeState(handoff.status)} />
        </span>
      </div>

      <div style={gridStyle}>
        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.productionDatabaseHandoffTraceId}</p>
          <p style={{ ...statValueStyle, fontSize: 15, ...wrapTextStyle }}>
            {state.traceId ?? (state.source === "api_runtime" ? handoff.traceId : copy.productionDatabaseHandoffNoTrace)}
          </p>
          <p style={bodyTextStyle}>x-campaign-os-trace-id</p>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.productionDatabaseHandoffLocalMvpGate}</p>
          <p style={{ ...statValueStyle, fontSize: 18, ...wrapTextStyle }}>
            {handoff.localMvpReady
              ? copy.productionDatabaseHandoffLocalMvpReady
              : copy.productionDatabaseHandoffLocalMvpBlocked}
          </p>
          <p style={bodyTextStyle}>{copy.productionDatabaseHandoffProductionDisabled}</p>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.productionDatabaseHandoffProductionBlockers}</p>
          <p style={{ ...statValueStyle, fontSize: 18 }}>
            {handoff.summary.blockedCount} {copy.countBlockers}
          </p>
          <p style={bodyTextStyle}>
            {handoff.summary.deferredCount} {copy.productionDatabaseHandoffDeferredReferences}
          </p>
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.productionDatabaseHandoffTopBlocker}</p>
          <p style={{ ...statValueStyle, fontSize: 15, ...wrapTextStyle }}>
            {sanitizePanelText(getLocalizedText(handoff.summary.topBlocker, locale))}
          </p>
        </article>
      </div>

      <div style={gridStyle}>
        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.productionDatabaseHandoffPackageBinding}</p>
          {[
            [copy.productionDatabaseHandoffPackageName, `${packageBinding.packageName} (${packageBinding.packageRef})`],
            [copy.productionDatabaseHandoffProvider, `${packageBinding.providerId} / ${packageBinding.providerKind}`],
            [copy.productionDatabaseHandoffDriver, packageBinding.driverId],
            [copy.productionDatabaseHandoffMode, packageBinding.mode],
            [copy.productionDatabaseHandoffImportPosture, packageBinding.importPosture],
            [copy.productionDatabaseHandoffPackageBlockers, String(packageBinding.blockerCount)],
          ].map(([label, value]) => (
            <div key={label} style={keyValueRowStyle}>
              <p style={statLabelStyle}>{label}</p>
              <p style={{ ...bodyTextStyle, color: "#071426", fontWeight: 900, ...wrapTextStyle }}>
                {sanitizePanelText(value)}
              </p>
            </div>
          ))}
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.productionDatabaseHandoffMigrationGate}</p>
          {[
            [copy.productionDatabaseHandoffMigrationApproval, migrationGate.approvalStatus],
            [copy.productionDatabaseHandoffPendingMigrations, migrationGate.pendingMigrationIds.join(", ")],
            [copy.productionDatabaseHandoffBlockedMigrations, migrationGate.blockedMigrationIds.join(", ")],
            [copy.productionDatabaseHandoffRollbackStatus, migrationGate.rollbackPlanStatus],
            [
              copy.productionDatabaseHandoffRollbackReadiness,
              migrationGate.rollbackReady
                ? copy.productionDatabaseHandoffRollbackReady
                : copy.productionDatabaseHandoffRollbackNotReady,
            ],
          ].map(([label, value]) => (
            <div key={label} style={keyValueRowStyle}>
              <p style={statLabelStyle}>{label}</p>
              <p style={{ ...bodyTextStyle, color: "#071426", fontWeight: 900, ...wrapTextStyle }}>
                {sanitizePanelText(value || copy.productionDatabaseHandoffNone)}
              </p>
            </div>
          ))}
        </article>

        <article style={cardStyle}>
          <p style={statLabelStyle}>{copy.productionDatabaseHandoffSafety}</p>
          <ul style={compactListStyle}>
            {safetyItems(copy).map(([key, label]) => (
              <li key={key} style={chipStyle}>
                {handoff.safety[key] === false ? label : copy.productionDatabaseHandoffUnsafeFlag}
              </li>
            ))}
          </ul>
        </article>
      </div>

      <section aria-label={copy.productionDatabaseHandoffRequiredReferences} style={cardStyle}>
        <p style={statLabelStyle}>{copy.productionDatabaseHandoffRequiredReferences}</p>
        <div style={{ display: "grid", gap: 10 }}>
          {handoff.requiredReferences.map((reference) => (
            <div key={reference.key} style={itemRowStyle}>
              <div style={{ minWidth: 0 }}>
                <p style={{ ...bodyTextStyle, color: "#071426", fontWeight: 900, ...wrapTextStyle }}>
                  {reference.key}
                </p>
                <p style={{ ...bodyTextStyle, ...wrapTextStyle }}>
                  {reference.area} / {sanitizePanelText(reference.message)}
                </p>
              </div>
              <PublishStateBadge
                label={reference.status}
                state={reference.status === "ready" ? "ready" : reference.status === "blocked" ? "blocker" : "warning"}
              />
            </div>
          ))}
        </div>
      </section>

      <section aria-label={copy.productionDatabaseHandoffStoreCoverage} style={cardStyle}>
        <p style={statLabelStyle}>{copy.productionDatabaseHandoffStoreCoverage}</p>
        <div style={{ display: "grid", gap: 10 }}>
          {handoff.storeCoverage.map((store) => (
            <div key={store.storeId} style={itemRowStyle}>
              <div style={{ minWidth: 0 }}>
                <p style={{ ...bodyTextStyle, color: "#071426", fontWeight: 900, ...wrapTextStyle }}>
                  {store.label} / {store.storeId}
                </p>
                <p style={{ ...bodyTextStyle, ...wrapTextStyle }}>
                  {copy.productionDatabaseHandoffOwnerService}: {store.ownerServiceId} / {" "}
                  {copy.productionDatabaseHandoffSchemaVersion}: {store.schemaVersion}
                </p>
                <p style={{ ...bodyTextStyle, ...wrapTextStyle }}>
                  {store.migrationRequired
                    ? copy.productionDatabaseHandoffMigrationRequired
                    : copy.productionDatabaseHandoffMigrationNotRequired}
                </p>
              </div>
              <PublishStateBadge
                label={store.coverageStatus}
                state={store.coverageStatus === "mapped" ? "ready" : store.coverageStatus === "blocked" ? "blocker" : "warning"}
              />
            </div>
          ))}
        </div>
      </section>

      <section aria-label={copy.productionDatabaseHandoffNextAction} style={cardStyle}>
        <p style={statLabelStyle}>{copy.productionDatabaseHandoffNextAction}</p>
        <p style={{ ...bodyTextStyle, ...wrapTextStyle }}>
          {sanitizePanelText(getLocalizedText(handoff.summary.topNextAction, locale))}
        </p>
      </section>

      <section aria-label={copy.productionDatabaseHandoffSanitizedDiagnostics} style={cardStyle}>
        <p style={statLabelStyle}>{copy.productionDatabaseHandoffDiagnostics}</p>
        {diagnostics.length > 0 ? (
          <ul style={{ display: "grid", gap: 8, margin: 0, padding: 0 }}>
            {diagnostics.slice(0, 6).map((diagnostic, index) => (
              <li key={`${diagnostic.code}-${index}`} style={{ ...bodyTextStyle, listStyle: "none", ...wrapTextStyle }}>
                {diagnostic.code}: {sanitizePanelText(diagnostic.message)}
                {diagnostic.safeDetails
                  ? ` / ${sanitizePanelText(diagnostic.safeDetails)}`
                  : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p style={bodyTextStyle}>{copy.productionDatabaseHandoffNoDiagnostics}</p>
        )}
      </section>

      <p style={boundaryStyle}>{getLocalizedText(handoff.boundary, locale)}</p>

      <button
        disabled={reviewInFlight}
        onClick={onReview}
        style={{
          ...actionButtonStyle,
          cursor: reviewInFlight ? "not-allowed" : "pointer",
          opacity: reviewInFlight ? 0.72 : 1,
        }}
        type="button"
      >
        {reviewInFlight
          ? copy.productionDatabaseHandoffReviewingAction
          : copy.productionDatabaseHandoffReviewAction}
      </button>
    </article>
  );
}
