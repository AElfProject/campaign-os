import type { CSSProperties } from "react";
import {
  sanitizeRepositoryCampaignWorkflowApiText,
  type RepositoryCampaignWorkflowApiSource,
  type RepositoryCampaignWorkflowApiStatus,
  type RepositoryCampaignWorkflowBridgeState,
  type RepositoryCampaignWorkflowEligibilityState,
  type RepositoryCampaignWorkflowTaskState,
  type RepositoryCampaignWorkflowVerificationState,
} from "../../../api/repositoryCampaignWorkflowApiBridge";
import { getLocalizedText, type SupportedLocale } from "../../../domain";
import { PublishStateBadge } from "../../badges/Badges";
import type { ProjectConsoleCopy } from "./copy";

type RepositoryWorkflowBadgeState = "blocker" | "ready" | "warning";

interface RepositoryCampaignWorkflowPanelProps {
  apiConfigured: boolean;
  copy: ProjectConsoleCopy;
  locale: SupportedLocale;
  onReview: () => void;
  reviewInFlight: boolean;
  state: RepositoryCampaignWorkflowBridgeState;
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

const sectionGridStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
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

const workflowStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe6f4",
  borderRadius: 8,
  boxSizing: "border-box",
  display: "grid",
  gap: 10,
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

const repositoryWorkflowSourceLabel = (
  source: RepositoryCampaignWorkflowApiSource,
  copy: ProjectConsoleCopy,
) => {
  const labels: Record<RepositoryCampaignWorkflowApiSource, string> = {
    api_runtime: copy.repositoryWorkflowApiRuntime,
    error_fallback: copy.repositoryWorkflowErrorFallback,
    loading: copy.repositoryWorkflowLoading,
    seeded_fallback: copy.repositoryWorkflowSeededFallback,
  };

  return labels[source];
};

const repositoryWorkflowStatusLabel = (
  status: RepositoryCampaignWorkflowApiStatus,
  copy: ProjectConsoleCopy,
) => {
  const labels: Record<RepositoryCampaignWorkflowApiStatus, string> = {
    blocked: copy.repositoryWorkflowStatusBlocked,
    error: copy.repositoryWorkflowStatusError,
    fallback: copy.repositoryWorkflowStatusFallback,
    loading: copy.repositoryWorkflowStatusLoading,
    partial: copy.repositoryWorkflowStatusPartial,
    ready: copy.repositoryWorkflowStatusReady,
  };

  return labels[status];
};

const repositoryWorkflowBadgeState = (
  status: RepositoryCampaignWorkflowApiStatus,
): RepositoryWorkflowBadgeState =>
  status === "ready" ? "ready" : status === "blocked" || status === "error" ? "blocker" : "warning";

const listOrFallback = (items: readonly string[] | undefined, fallback: string) =>
  items && items.length > 0 ? items : [fallback];

const safeText = (value: unknown) =>
  sanitizeRepositoryCampaignWorkflowApiText(value)
    .replace(/\bredacted signed url\b/gi, "redacted data")
    .replace(/\bredacted object key\b/gi, "redacted data")
    .replace(/\bredacted provider payload\b/gi, "redacted data")
    .replace(/\bredacted stack\b/gi, "redacted data")
    .replace(
      /\b(redacted bearer credential|redacted credential|password=redacted)\s*=\s*[^&\s"'<>]+/gi,
      "$1",
    )
    .replace(/\/Users\/[^"'\s<>]+/gi, "redacted local path");

const eligibilitySummary = (
  copy: ProjectConsoleCopy,
  label: string,
  eligibility: RepositoryCampaignWorkflowEligibilityState | undefined,
  fallback: string,
) =>
  eligibility
    ? `${label}${copy.repositoryWorkflowValueSeparator}${eligibility.eligible ? "eligible" : "ineligible"} / ${eligibility.score}`
    : `${label}${copy.repositoryWorkflowValueSeparator}${fallback}`;

const taskSummary = (
  label: string,
  task: RepositoryCampaignWorkflowTaskState | undefined,
  copy: ProjectConsoleCopy,
) => (
  <article style={workflowStyle}>
    <div style={headingRowStyle}>
      <div style={{ minWidth: 0 }}>
        <p style={statLabelStyle}>{label}</p>
        <h5 style={{ fontSize: 16, lineHeight: 1.2, margin: "4px 0", ...wrapTextStyle }}>
          {task?.taskId ?? copy.repositoryWorkflowNone}
        </h5>
      </div>
      <PublishStateBadge
        label={task?.required ? copy.repositoryWorkflowRequired : copy.repositoryWorkflowOptional}
        state={task?.required ? "warning" : "ready"}
      />
    </div>
    <div style={gridStyle}>
      {[
        [copy.repositoryWorkflowTemplateCode, task?.templateCode],
        [copy.repositoryWorkflowVerificationType, task?.verificationType],
        [copy.repositoryWorkflowWalletCompatibility, task?.walletCompatibility],
        [copy.repositoryWorkflowPoints, task?.points !== undefined ? String(task.points) : undefined],
      ].map(([metricLabel, value]) => (
        <div key={`${label}-${metricLabel}`} style={{ minWidth: 0 }}>
          <p style={statLabelStyle}>{metricLabel}</p>
          <p style={{ ...bodyTextStyle, color: "#071426", fontWeight: 800, ...wrapTextStyle }}>
            {value ?? copy.repositoryWorkflowNone}
          </p>
        </div>
      ))}
    </div>
  </article>
);

const verificationSummary = (
  label: string,
  verification: RepositoryCampaignWorkflowVerificationState | undefined,
  copy: ProjectConsoleCopy,
) => (
  <article style={workflowStyle}>
    <p style={statLabelStyle}>{label}</p>
    <p style={{ ...statValueStyle, fontSize: 18, ...wrapTextStyle }}>
      {verification?.status ?? copy.repositoryWorkflowNone}
    </p>
    <div style={gridStyle}>
      {[
        [copy.repositoryWorkflowTaskId, verification?.taskId],
        [copy.repositoryWorkflowEvidenceHash, verification?.evidenceHash],
        [copy.repositoryWorkflowEvidenceSource, verification?.evidenceSource],
        [copy.repositoryWorkflowPointsAwarded, verification?.pointsAwarded !== undefined ? String(verification.pointsAwarded) : undefined],
        [copy.repositoryWorkflowWallet, [verification?.walletAddress, verification?.walletSource].filter(Boolean).join(" / ")],
      ].map(([metricLabel, value]) => (
        <div key={`${label}-${metricLabel}`} style={{ minWidth: 0 }}>
          <p style={statLabelStyle}>{metricLabel}</p>
          <p style={{ ...bodyTextStyle, color: "#071426", fontWeight: 800, ...wrapTextStyle }}>
            {value || copy.repositoryWorkflowNone}
          </p>
        </div>
      ))}
    </div>
  </article>
);

export function RepositoryCampaignWorkflowPanel({
  apiConfigured,
  copy,
  locale,
  onReview,
  reviewInFlight,
  state,
}: RepositoryCampaignWorkflowPanelProps) {
  const campaign = state.campaign;
  const blockedRows = state.exportReview?.blockedPreview?.blockedRows ?? 0;
  const readyRows = state.exportReview?.readyPreview?.readyRows ?? 0;
  const auditRecords = state.exportReview?.audit?.recordCount ?? 0;
  const diagnostics = state.diagnostics.length > 0 ? state.diagnostics : undefined;
  const sourceBadgeState = repositoryWorkflowBadgeState(state.status);

  return (
    <article aria-label={copy.repositoryWorkflowRegionLabel} style={panelStyle}>
      <div style={headingRowStyle}>
        <div style={{ minWidth: 0 }}>
          <p style={statLabelStyle}>{copy.repositoryWorkflowStatus}</p>
          <h4 style={{ fontSize: 18, lineHeight: 1.2, margin: "4px 0" }}>
            {copy.repositoryWorkflowTitle}
          </h4>
          <p style={bodyTextStyle}>
            {apiConfigured ? copy.repositoryWorkflowConfigured : copy.repositoryWorkflowNotConfigured}
          </p>
        </div>
        <span style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8 }}>
          <PublishStateBadge
            label={repositoryWorkflowSourceLabel(state.source, copy)}
            state={sourceBadgeState}
          />
          <PublishStateBadge
            label={repositoryWorkflowStatusLabel(state.status, copy)}
            state={sourceBadgeState}
          />
        </span>
      </div>

      <div style={gridStyle}>
        {[
          {
            detail: state.health?.status ?? copy.repositoryWorkflowNone,
            label: copy.repositoryWorkflowWorkflowSteps,
            value: String(state.workflowStepCount),
          },
          {
            detail: campaign?.createdDraftId ?? copy.repositoryWorkflowNoDraft,
            label: copy.repositoryWorkflowCreatedDraft,
            value: campaign?.status ?? copy.repositoryWorkflowNone,
          },
          {
            detail: eligibilitySummary(
              copy,
              copy.repositoryWorkflowAfterRequired,
              state.eligibility?.afterRequired,
              copy.repositoryWorkflowNone,
            ),
            label: copy.repositoryWorkflowEligibility,
            value: state.eligibility?.afterRequired?.eligible ? copy.repositoryWorkflowEligible : copy.repositoryWorkflowIneligible,
          },
          {
            detail: `${blockedRows} ${copy.repositoryWorkflowBlockedRows} / ${readyRows} ${copy.repositoryWorkflowReadyRows}`,
            label: copy.repositoryWorkflowExport,
            value: String(readyRows),
          },
          {
            detail: state.traceId ?? copy.repositoryWorkflowNoTrace,
            label: copy.repositoryWorkflowTraceIds,
            value: String(state.traceIds.length),
          },
          {
            detail: copy.repositoryWorkflowNoLiveBoundary,
            label: copy.repositoryWorkflowAuditRecords,
            value: String(auditRecords),
          },
        ].map((stat) => {
          const value = String(stat.value ?? copy.repositoryWorkflowNone);

          return (
            <article key={stat.label} style={cardStyle}>
              <p style={statLabelStyle}>{stat.label}</p>
              <p style={{ ...statValueStyle, fontSize: value.length > 10 ? 16 : 22, ...wrapTextStyle }}>
                {value}
              </p>
              <p style={{ ...bodyTextStyle, ...wrapTextStyle }}>{stat.detail}</p>
            </article>
          );
        })}
      </div>

      <section style={sectionGridStyle}>
        <article style={workflowStyle}>
          <p style={statLabelStyle}>{copy.repositoryWorkflowCampaignMetadata}</p>
          <h5 style={{ fontSize: 17, lineHeight: 1.2, margin: "4px 0", ...wrapTextStyle }}>
            {campaign?.createdDraftId ?? copy.repositoryWorkflowNoDraft}
          </h5>
          <div style={gridStyle}>
            {[
              [copy.repositoryWorkflowProjectId, campaign?.projectId],
              [copy.repositoryWorkflowOwner, campaign?.ownerAddress],
              [copy.repositoryWorkflowRepository, campaign?.repository?.repositoryId],
              [copy.repositoryWorkflowStore, campaign?.repository?.storeId],
              [copy.repositoryWorkflowListRefresh, campaign?.listContainsCreatedDraft ? copy.repositoryWorkflowListConfirmed : copy.repositoryWorkflowListMissing],
              [copy.repositoryWorkflowLocales, campaign?.supportedLocales.join(" / ")],
              [copy.repositoryWorkflowWalletPolicy, campaign?.walletPolicy],
              [copy.repositoryWorkflowContractMode, campaign?.contractMode],
            ].map(([label, value]) => (
              <div key={label} style={{ minWidth: 0 }}>
                <p style={statLabelStyle}>{label}</p>
                <p style={{ ...bodyTextStyle, color: "#071426", fontWeight: 800, ...wrapTextStyle }}>
                  {value ?? copy.repositoryWorkflowNone}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article style={workflowStyle}>
          <p style={statLabelStyle}>{copy.repositoryWorkflowEligibilityTransition}</p>
          <ul style={{ ...compactListStyle, display: "grid" }}>
            {[
              eligibilitySummary(copy, copy.repositoryWorkflowBeforeRequired, state.eligibility?.beforeRequired, copy.repositoryWorkflowNone),
              eligibilitySummary(copy, copy.repositoryWorkflowAfterOptional, state.eligibility?.afterOptional, copy.repositoryWorkflowNone),
              eligibilitySummary(copy, copy.repositoryWorkflowAfterRequired, state.eligibility?.afterRequired, copy.repositoryWorkflowNone),
            ].map((item) => (
              <li key={item} style={chipStyle}>{item}</li>
            ))}
          </ul>
          <p style={{ ...bodyTextStyle, ...wrapTextStyle }}>
            {copy.repositoryWorkflowMissingTasks}:{" "}
            {listOrFallback(state.eligibility?.afterOptional?.missingTasks, copy.repositoryWorkflowNone).join(", ")}
          </p>
        </article>
      </section>

      <section aria-label={copy.repositoryWorkflowTasks} style={sectionGridStyle}>
        {taskSummary(copy.repositoryWorkflowRequiredTask, state.tasks?.required, copy)}
        {taskSummary(copy.repositoryWorkflowOptionalTask, state.tasks?.optional, copy)}
      </section>

      <section aria-label={copy.repositoryWorkflowParticipation} style={sectionGridStyle}>
        {verificationSummary(copy.repositoryWorkflowRequiredVerification, state.verification?.required, copy)}
        {verificationSummary(copy.repositoryWorkflowOptionalVerification, state.verification?.optional, copy)}
      </section>

      <section aria-label={copy.repositoryWorkflowExportReview} style={sectionGridStyle}>
        <article style={workflowStyle}>
          <p style={statLabelStyle}>{copy.repositoryWorkflowBlockedPreview}</p>
          <p style={statValueStyle}>{blockedRows}</p>
          <p style={bodyTextStyle}>
            {copy.repositoryWorkflowBlockedRows}: {blockedRows} / {copy.repositoryWorkflowReadyRows}:{" "}
            {state.exportReview?.blockedPreview?.readyRows ?? 0}
          </p>
          <ul style={compactListStyle}>
            {listOrFallback(state.exportReview?.blockedPreview?.rowStatuses, copy.repositoryWorkflowNone).map((item) => (
              <li key={item} style={chipStyle}>{item}</li>
            ))}
          </ul>
        </article>

        <article style={workflowStyle}>
          <p style={statLabelStyle}>{copy.repositoryWorkflowReadyPreview}</p>
          <p style={statValueStyle}>{readyRows}</p>
          <div style={gridStyle}>
            {[
              [copy.repositoryWorkflowArtifactId, state.exportReview?.readyPreview?.artifactId],
              [copy.repositoryWorkflowChecksum, state.exportReview?.readyPreview?.artifactChecksum],
              [copy.repositoryWorkflowReadiness, state.exportReview?.readiness ? `${state.exportReview.readiness.readyRows}/${state.exportReview.readiness.totalRows}` : undefined],
              [copy.repositoryWorkflowAuditRecords, state.exportReview?.audit ? String(state.exportReview.audit.recordCount) : undefined],
              [copy.repositoryWorkflowContractRoot, state.exportReview?.readyPreview?.contractRootMode],
            ].map(([label, value]) => (
              <div key={label} style={{ minWidth: 0 }}>
                <p style={statLabelStyle}>{label}</p>
                <p style={{ ...bodyTextStyle, color: "#071426", fontWeight: 800, ...wrapTextStyle }}>
                  {value ?? copy.repositoryWorkflowNone}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section aria-label={copy.repositoryWorkflowSteps} style={workflowStyle}>
        <p style={statLabelStyle}>{copy.repositoryWorkflowSteps}</p>
        <ul style={compactListStyle}>
          {state.workflowSteps.map((step) => (
            <li key={`${step.stepId}-${step.traceId ?? step.endpoint}`} style={chipStyle}>
              {step.stepId}: {step.method} {step.endpoint} / {step.status}
              {step.traceId ? ` / ${step.traceId}` : ""}
            </li>
          ))}
        </ul>
      </section>

      <section aria-label={copy.repositoryWorkflowTraceIds} style={workflowStyle}>
        <p style={statLabelStyle}>{copy.repositoryWorkflowTraceIds}</p>
        <ul style={compactListStyle}>
          {listOrFallback(state.traceIds, copy.repositoryWorkflowNoTrace).map((traceId) => (
            <li key={traceId} style={chipStyle}>{traceId}</li>
          ))}
        </ul>
      </section>

      <section aria-label={copy.repositoryWorkflowNoLiveSafety} style={workflowStyle}>
        <p style={statLabelStyle}>{copy.repositoryWorkflowNoLiveSafety}</p>
        <ul style={compactListStyle}>
          {[
            copy.repositoryWorkflowNoProviderCall,
            copy.repositoryWorkflowNoWalletSignature,
            copy.repositoryWorkflowNoContractWrite,
            copy.repositoryWorkflowNoStorageWrite,
            copy.repositoryWorkflowNoSignedUrl,
            copy.repositoryWorkflowNoObjectKey,
            copy.repositoryWorkflowNoRewardCustody,
            copy.repositoryWorkflowNoRewardDistribution,
            copy.repositoryWorkflowNoRawProviderPayload,
          ].map((item) => (
            <li key={item} style={chipStyle}>{item}</li>
          ))}
        </ul>
      </section>

      <section aria-label={copy.repositoryWorkflowDiagnostics} style={workflowStyle}>
        <p style={statLabelStyle}>{copy.repositoryWorkflowDiagnostics}</p>
        <ul style={{ ...compactListStyle, display: "grid" }}>
          {(diagnostics ?? [{
            code: "none",
            message: { "en-US": copy.repositoryWorkflowNoDiagnostics },
            severity: "info",
          }]).map((diagnostic) => {
            const message = isProjectConsoleDiagnostic(diagnostic)
              ? getLocalizedText(diagnostic.message, locale)
              : copy.repositoryWorkflowNoDiagnostics;

            return (
              <li key={`${diagnostic.code}-${diagnostic.severity}`} style={chipStyle}>
                {diagnostic.code}: {safeText(message)}
              </li>
            );
          })}
        </ul>
      </section>

      <p style={boundaryStyle}>{getLocalizedText(state.boundary, locale)}</p>

      <button
        disabled={reviewInFlight}
        onClick={onReview}
        style={{ ...actionButtonStyle, opacity: reviewInFlight ? 0.7 : 1 }}
        type="button"
      >
        {reviewInFlight ? copy.repositoryWorkflowReviewingAction : copy.repositoryWorkflowReviewAction}
      </button>
    </article>
  );
}

const isProjectConsoleDiagnostic = (
  diagnostic: unknown,
): diagnostic is { code: string; message: Parameters<typeof getLocalizedText>[0]; severity: string } =>
  isRecord(diagnostic) && typeof diagnostic.code === "string" && isRecord(diagnostic.message);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
