import type { CSSProperties } from "react";
import {
  campaignDetail,
  computePublishReadiness,
  createAdminOpsReadModel,
  createExportConfirmationReadinessGate,
  createParticipationReadModel,
  getLocalizedText,
  type AiOptimizationActionStatus,
  type AiOptimizationMetricTone,
  type CampaignShellDetail,
  type ContractInterfaceReadiness,
  type ContractMode,
  type ContractReviewChecklistStatus,
  type DeliveryChecklistStatus,
  type ExportReadinessState,
  type AiContentArtifactLifecycle,
  type AiContentQualityGateStatus,
  type MetricTone,
  type ProviderFeatureGateState,
  type ProviderLiveEvidenceStatus,
  type SignalSeverity,
  type SupportedLocale,
  type TemplateGovernanceSignal,
  type TemplateGovernanceStatus,
  type WalletProviderQaLiveEvidenceStatus,
  type WalletProviderQaReleaseImpact,
  type WalletProviderQaSeededStatus,
} from "../../../domain";
import {
  Badge,
  ContractModeBadge,
  LocaleStatusBadge,
  PublishStateBadge,
  ReviewSeverityBadge,
  WalletBadge,
} from "../../badges/Badges";
import { adminOpsCopy } from "./copy";

interface AdminOpsPanelProps {
  campaign?: CampaignShellDetail;
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

const gridStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
};

const compactGridStyle: CSSProperties = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
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

const rowStyle: CSSProperties = {
  alignItems: "center",
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  justifyContent: "space-between",
};

const stackStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  minWidth: 0,
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
  fontSize: 28,
  fontWeight: 900,
  lineHeight: 1,
  margin: 0,
};

const mutedTextStyle: CSSProperties = {
  color: "#475569",
  fontSize: 13,
  lineHeight: 1.45,
  margin: 0,
};

const tableStyle: CSSProperties = {
  borderCollapse: "collapse",
  minWidth: 980,
  width: "100%",
};

const exportTableStyle: CSSProperties = {
  ...tableStyle,
  minWidth: 1580,
};

const scrollContainerStyle: CSSProperties = {
  maxWidth: "100%",
  minWidth: 0,
  overflowX: "auto",
};

const contractCodeStyle: CSSProperties = {
  background: "#f8fbff",
  border: "1px solid #dbe6f4",
  borderRadius: 8,
  color: "#071426",
  display: "block",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: 12,
  fontWeight: 800,
  lineHeight: 1.45,
  margin: 0,
  minWidth: 980,
  padding: 12,
  whiteSpace: "nowrap",
};

const codeListStyle: CSSProperties = {
  color: "#071426",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: 12,
  lineHeight: 1.45,
  wordBreak: "break-word",
};

const thStyle: CSSProperties = {
  borderBottom: "1px solid #dbe6f4",
  color: "#64748b",
  fontSize: 12,
  padding: "10px 8px",
  textAlign: "left",
  textTransform: "uppercase",
};

const tdStyle: CSSProperties = {
  borderBottom: "1px solid #eef2f7",
  color: "#071426",
  fontSize: 13,
  padding: "10px 8px",
  verticalAlign: "top",
};

const boundaryStyle: CSSProperties = {
  background: "#fffbeb",
  border: "1px solid #fcd34d",
  borderRadius: 8,
  color: "#92400e",
  fontWeight: 800,
  lineHeight: 1.45,
  margin: 0,
  padding: 12,
};

const sourceMetricListStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  minWidth: 0,
};

const sourceMetricChipStyle: CSSProperties = {
  alignItems: "flex-start",
  border: "1px solid",
  borderRadius: 8,
  boxSizing: "border-box",
  display: "inline-flex",
  fontSize: 12,
  fontWeight: 700,
  lineHeight: 1.35,
  maxWidth: "100%",
  minWidth: 0,
  overflowWrap: "anywhere",
  padding: "6px 9px",
  whiteSpace: "normal",
  wordBreak: "break-word",
};

const sourceMetricToneStyles: Record<AiOptimizationMetricTone, CSSProperties> = {
  good: { background: "#ecfdf5", borderColor: "#86efac", color: "#166534" },
  warning: { background: "#fffbeb", borderColor: "#fcd34d", color: "#92400e" },
  risk: { background: "#fef2f2", borderColor: "#fca5a5", color: "#991b1b" },
};

const modeLabel = (mode: ContractMode) => mode.replace(/_/g, " ");

const metricToneState = (tone: MetricTone) =>
  tone === "critical" ? "blocker" : tone === "warning" ? "warning" : "ready";

const signalState = (severity: SignalSeverity) =>
  severity === "high" || severity === "blocked"
    ? "blocker"
    : severity === "medium"
      ? "warning"
      : "ready";

const checklistStatusState = (status: ContractReviewChecklistStatus) =>
  status === "blocked" ? "blocker" : status === "warning" ? "warning" : "ready";

const contractInterfaceReadinessState = (readiness: ContractInterfaceReadiness) =>
  readiness === "blocker" ? "blocker" : readiness === "warning" ? "warning" : "ready";

const deliveryChecklistStatusState = (status: DeliveryChecklistStatus) =>
  status === "blocked"
    ? "blocker"
    : status === "needs_review" || status === "deferred"
      ? "warning"
      : "ready";

const aiContentLifecycleState = (lifecycle: AiContentArtifactLifecycle) =>
  lifecycle === "ai_draft" || lifecycle === "edited" ? "warning" : "ready";

const aiContentGateState = (status: AiContentQualityGateStatus) =>
  status === "blocked" ? "blocker" : status === "warning" ? "warning" : "ready";

const readableCode = (value: string) => value.replace(/_/g, " ");

const exportReadinessState = (readiness: ExportReadinessState) =>
  readiness === "blocked" ? "blocker" : readiness === "review_required" ? "warning" : "ready";

const aiOptimizationStatusState = (status: AiOptimizationActionStatus) =>
  status === "blocked"
    ? "blocker"
    : status === "review_required"
      ? "warning"
      : "ready";

const aiOptimizationStatusLabel = (
  status: AiOptimizationActionStatus,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<AiOptimizationActionStatus, string> = {
    adopted_preview: copy.adoptedPreview,
    blocked: copy.blocked,
    ready_to_review: copy.readyToReview,
    review_required: copy.reviewRequired,
  };

  return labels[status];
};

const providerReadinessState = (readiness: string) =>
  readiness === "blocked"
    ? "blocker"
    : readiness === "review_required" || readiness === "unavailable"
      ? "warning"
      : "ready";

const templateGovernanceState = (status: TemplateGovernanceStatus) =>
  status === "blocked" ? "blocker" : status === "warning" ? "warning" : "ready";

const templateSignalLabel = (
  signal: TemplateGovernanceSignal,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<TemplateGovernanceSignal, string> = {
    localization_review: copy.localizationReview,
    risk_review: copy.riskReview,
    verification_strength: copy.strongVerification,
    wallet_coverage: copy.walletCoverage,
  };

  return labels[signal];
};

const templateStatusLabel = (
  status: TemplateGovernanceStatus,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<TemplateGovernanceStatus, string> = {
    blocked: copy.templateStatusBlocked,
    ready: copy.templateStatusReady,
    warning: copy.templateStatusWarning,
  };

  return labels[status];
};

const deliveryChecklistStatusLabel = (
  status: DeliveryChecklistStatus,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<DeliveryChecklistStatus, string> = {
    blocked: copy.blocker,
    covered: copy.covered,
    deferred: copy.deferred,
    needs_review: copy.needsReview,
  };

  return labels[status];
};

const walletProviderQaSeededState = (status: WalletProviderQaSeededStatus) =>
  status === "ready" ? "ready" : "warning";

const walletProviderQaLiveState = (status: WalletProviderQaLiveEvidenceStatus) =>
  status === "ready" ? "ready" : status === "blocked" ? "blocker" : "warning";

const walletProviderQaImpactState = (impact: WalletProviderQaReleaseImpact) =>
  impact === "release_blocker" ? "blocker" : impact === "ready" ? "ready" : "warning";

const providerLiveEvidenceState = (status: ProviderLiveEvidenceStatus) =>
  status === "blocked" ? "blocker" : status === "ready" ? "ready" : "warning";

const providerFeatureGateState = (state: ProviderFeatureGateState) =>
  state === "disabled" ? "blocker" : "warning";

const providerPathPriority = (entry: {
  adapterReadiness: string;
  liveEvidenceStatus: string;
  fallback: { blocksLaunch: boolean };
}) => {
  if (entry.adapterReadiness === "blocked" || entry.fallback.blocksLaunch) {
    return 0;
  }

  if (entry.adapterReadiness === "unavailable") {
    return 1;
  }

  if (entry.adapterReadiness === "review_required") {
    return 2;
  }

  if (entry.liveEvidenceStatus === "missing") {
    return 3;
  }

  return 4;
};

const walletProviderQaSeededLabel = (
  status: WalletProviderQaSeededStatus,
  copy: typeof adminOpsCopy["en-US"],
) => (status === "ready" ? copy.seededReady : copy.missing);

const walletProviderQaLiveLabel = (
  status: WalletProviderQaLiveEvidenceStatus,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<WalletProviderQaLiveEvidenceStatus, string> = {
    blocked: copy.blocked,
    missing: copy.missing,
    not_applicable: copy.notApplicable,
    ready: copy.liveEvidenceReady,
  };

  return labels[status];
};

const walletProviderQaImpactLabel = (
  impact: WalletProviderQaReleaseImpact,
  copy: typeof adminOpsCopy["en-US"],
) => {
  const labels: Record<WalletProviderQaReleaseImpact, string> = {
    informational: copy.informational,
    needs_review: copy.needsReview,
    ready: copy.readyToReview,
    release_blocker: copy.releaseBlocker,
  };

  return labels[impact];
};

const walletCompatibilityLabel = (
  value: string,
  copy: typeof adminOpsCopy["en-US"],
) => {
  if (value === "ANY") {
    return copy.walletAny;
  }
  if (value === "AA_ONLY") {
    return copy.walletAaOnly;
  }

  return copy.walletEoaOnly;
};

export const AdminOpsPanel = ({
  campaign = campaignDetail,
  locale,
}: AdminOpsPanelProps) => {
  const copy = adminOpsCopy[locale];
  const adminOps = createAdminOpsReadModel(campaign);
  const exportReadiness = createExportConfirmationReadinessGate(campaign);
  const aiOptimization = adminOps.aiOptimization;
  const aiContentPack = adminOps.aiContentPack;
  const templateGovernance = adminOps.templateGovernance;
  const deliveryChecklist = adminOps.deliveryChecklistReadiness;
  const providerEvidenceRegistry = adminOps.providerEvidenceRegistry;
  const providerEvidenceRegistryEntries = [...providerEvidenceRegistry.entries].sort(
    (left, right) => providerPathPriority(left) - providerPathPriority(right),
  );
  const contractClaimReadiness = computePublishReadiness(
    { contractMode: "CONTRACT_CLAIM" },
    campaign.contentRevisions,
  );
  const contractReviewCenter = adminOps.contractReviewCenter;
  const contractInterfaceMatrix = adminOps.contractInterfaceMatrix;
  const columnContract = adminOps.exportBatch.columns.join(",");
  const verificationRows = campaign.participants.flatMap((participant) =>
    createParticipationReadModel(campaign, participant).taskStates.map((state) => ({
      participant,
      state,
    })),
  );
  const verificationProviderReadinessCounts = verificationRows.reduce<Record<string, number>>(
    (counts, row) => {
      counts[row.state.provider.readiness] = (counts[row.state.provider.readiness] ?? 0) + 1;
      return counts;
    },
    {},
  );
  const verificationManualReviewRows = verificationRows.filter((row) => row.state.manualReview.queued);
  const verificationRiskRows = verificationRows.filter((row) => row.state.riskFlags.length > 0);
  const verificationActionRows = verificationRows.filter(
    (row) =>
      row.state.status !== "completed" ||
      row.state.manualReview.queued ||
      row.state.riskFlags.length > 0 ||
      row.state.provider.readiness !== "local_only",
  );
  const warningCount = campaign.publishReadiness.warnings.length;
  const blockerCount = contractClaimReadiness.blockers.length;
  const contractReviewSummary = [
    {
      id: "contract-mode",
      label: copy.contractMode,
      value: modeLabel(contractReviewCenter.selectedMode),
      badge: (
        <ContractModeBadge
          label={modeLabel(contractReviewCenter.selectedMode)}
          mode={contractReviewCenter.selectedMode}
        />
      ),
    },
    {
      id: "v2-companion",
      label: copy.v2CompanionNeeded,
      value: getLocalizedText(contractReviewCenter.v2CompanionNeeded, locale),
    },
    {
      id: "metadata-hash",
      label: copy.metadataHash,
      value: getLocalizedText(contractReviewCenter.metadataHash, locale),
    },
    {
      id: "verifier-role",
      label: copy.verifierRole,
      value: getLocalizedText(contractReviewCenter.verifierRole, locale),
    },
    {
      id: "reward-custody",
      label: copy.rewardCustody,
      value: getLocalizedText(contractReviewCenter.rewardCustody, locale),
    },
  ];

  const contractModes = [
    {
      badge: <ContractModeBadge label={copy.offChain} mode="OFF_CHAIN_MVP" />,
      description: copy.defaultSafe,
      key: "OFF_CHAIN_MVP",
    },
    {
      badge: <ContractModeBadge label={copy.v2Companion} mode="V2_COMPANION" />,
      description: copy.futurePlanned,
      key: "V2_COMPANION",
    },
    {
      badge: <ContractModeBadge label={copy.contractClaim} mode="CONTRACT_CLAIM" />,
      description: copy.contractClaimBlocked,
      key: "CONTRACT_CLAIM",
    },
  ];

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section style={panelStyle}>
        <div style={rowStyle}>
          <div>
            <p style={labelStyle}>{copy.title}</p>
            <h2 style={{ fontSize: 30, lineHeight: 1.1, margin: "4px 0" }}>
              {copy.reviewQueue}
            </h2>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <PublishStateBadge label={`${blockerCount} ${copy.blocker}`} state="blocker" />
            <PublishStateBadge label={`${warningCount} ${copy.warning}`} state="warning" />
          </span>
        </div>
        <p style={boundaryStyle}>{copy.seededBoundary}</p>
        <div style={gridStyle}>
          {adminOps.reviewQueue.map((item) => (
            <article key={item.id} style={cardStyle}>
              <div style={rowStyle}>
                <strong>{item.title}</strong>
                <ReviewSeverityBadge label={item.severity} severity={item.severity} />
              </div>
              <p style={mutedTextStyle}>
                {copy.status}: {item.status}
              </p>
              <p style={mutedTextStyle}>
                {copy.owner}: {item.ownerRole}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-label={`${copy.taskEvidence} ${copy.reviewQueue}`} style={panelStyle}>
        <div style={rowStyle}>
          <div style={stackStyle}>
            <p style={labelStyle}>{copy.taskEvidence}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: 0 }}>
              {copy.humanReviewGate}
            </h3>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <PublishStateBadge
              label={`${verificationManualReviewRows.length} ${copy.humanReviewRequired}`}
              state={verificationManualReviewRows.length > 0 ? "warning" : "ready"}
            />
            <PublishStateBadge
              label={`${verificationRiskRows.length} ${copy.riskFlags}`}
              state={verificationRiskRows.length > 0 ? "warning" : "ready"}
            />
          </span>
        </div>
        <p style={boundaryStyle}>{copy.seededLocalReadinessBoundary}</p>
        <div style={compactGridStyle}>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.humanReviewRequired}</p>
            <p style={valueStyle}>{verificationManualReviewRows.length}</p>
            <p style={mutedTextStyle}>{copy.needsReview}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.riskFlags}</p>
            <p style={valueStyle}>{verificationRiskRows.length}</p>
            <p style={mutedTextStyle}>{copy.riskEligibilityBoundary}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.evidenceStatus}</p>
            <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {Object.entries(verificationProviderReadinessCounts).map(([readiness, count]) => (
                <PublishStateBadge
                  key={readiness}
                  label={`${count} ${readableCode(readiness)}`}
                  state={providerReadinessState(readiness)}
                />
              ))}
            </span>
          </article>
        </div>
        <div style={gridStyle}>
          {verificationActionRows.slice(0, 6).map(({ participant, state }) => (
            <article key={`${participant.walletAddress}-${state.taskId}`} style={cardStyle}>
              <div style={rowStyle}>
                <strong>{state.templateCode}</strong>
                <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <PublishStateBadge
                    label={readableCode(state.status)}
                    state={state.status === "failed" ? "blocker" : state.status === "completed" ? "ready" : "warning"}
                  />
                  <PublishStateBadge
                    label={readableCode(state.provider.readiness)}
                    state={providerReadinessState(state.provider.readiness)}
                  />
                </span>
              </div>
              <p style={mutedTextStyle}>
                {copy.wallet}: {participant.walletAddress}
              </p>
              <p style={mutedTextStyle}>
                {copy.evidenceSource}: {getLocalizedText(state.evidence.sourceLabel, locale)} · {state.evidence.evidenceHash}
              </p>
              {state.provider.fallbackReason ? (
                <p style={mutedTextStyle}>
                  {copy.detail}: {getLocalizedText(state.provider.fallbackReason, locale)}
                </p>
              ) : null}
              {state.manualReview.queued ? (
                <p style={mutedTextStyle}>
                  {copy.humanReviewRequired}: {state.manualReview.queueId} ·{" "}
                  {state.manualReview.reason ? getLocalizedText(state.manualReview.reason, locale) : copy.needsReview}
                </p>
              ) : null}
              <p style={mutedTextStyle}>
                {copy.riskFlags}: {state.riskFlags.join(", ") || "-"}
              </p>
              <p style={mutedTextStyle}>
                {copy.nextAction}: {getLocalizedText(state.nextAction, locale)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section style={panelStyle}>
        <div style={rowStyle}>
          <div style={stackStyle}>
            <p style={labelStyle}>{copy.deliveryChecklistSubtitle}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: 0 }}>
              {copy.deliveryChecklistReadiness}
            </h3>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Badge
              label={`${deliveryChecklist.summary.totalItems} ${copy.totalItems}`}
              tone="info"
            />
            <PublishStateBadge
              label={`${deliveryChecklist.summary.blockedItems} ${copy.blocker}`}
              state={deliveryChecklist.summary.blockedItems > 0 ? "blocker" : "ready"}
            />
            <PublishStateBadge
              label={`${deliveryChecklist.summary.needsReviewItems} ${copy.needsReview}`}
              state={deliveryChecklist.summary.needsReviewItems > 0 ? "warning" : "ready"}
            />
          </span>
        </div>
        <div style={boundaryStyle}>
          <p style={{ margin: 0 }}>{copy.seededLocalReadinessBoundary}</p>
          <p style={{ margin: "8px 0 0" }}>
            {getLocalizedText(deliveryChecklist.boundary, locale)}
          </p>
        </div>
        <div style={compactGridStyle}>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.totalItems}</p>
            <p style={valueStyle}>{deliveryChecklist.summary.totalItems}</p>
            <p style={mutedTextStyle}>{getLocalizedText(deliveryChecklist.summary.nextAction, locale)}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.covered}</p>
            <p style={valueStyle}>{deliveryChecklist.summary.coveredItems}</p>
            <p style={mutedTextStyle}>{copy.seededBoundary}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.needsReview}</p>
            <p style={valueStyle}>{deliveryChecklist.summary.needsReviewItems}</p>
            <p style={mutedTextStyle}>{copy.humanReviewRequired}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.blocker}</p>
            <p style={valueStyle}>{deliveryChecklist.summary.blockedItems}</p>
            <p style={mutedTextStyle}>{copy.noRewardCustodyDistribution}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.deferred}</p>
            <p style={valueStyle}>{deliveryChecklist.summary.deferredItems}</p>
            <p style={mutedTextStyle}>{copy.futurePlanned}</p>
          </article>
        </div>
        <div style={gridStyle}>
          <article style={cardStyle}>
            <div style={rowStyle}>
              <strong>{copy.blocker}</strong>
              <PublishStateBadge label={`${deliveryChecklist.blockers.length} ${copy.blocker}`} state="blocker" />
            </div>
            {deliveryChecklist.blockers.map((item) => (
              <div key={item.id} style={{ borderTop: "1px solid #dbe6f4", display: "grid", gap: 6, paddingTop: 10 }}>
                <strong>{getLocalizedText(item.label, locale)}</strong>
                <p style={mutedTextStyle}>{getLocalizedText(item.evidence, locale)}</p>
                <p style={mutedTextStyle}>{copy.nextAction}: {getLocalizedText(item.nextAction, locale)}</p>
              </div>
            ))}
          </article>
          <article style={cardStyle}>
            <div style={rowStyle}>
              <strong>{copy.needsReview}</strong>
              <PublishStateBadge label={`${deliveryChecklist.needsReview.length} ${copy.needsReview}`} state="warning" />
            </div>
            {deliveryChecklist.needsReview.slice(0, 6).map((item) => (
              <div key={item.id} style={{ borderTop: "1px solid #dbe6f4", display: "grid", gap: 6, paddingTop: 10 }}>
                <strong>{getLocalizedText(item.label, locale)}</strong>
                <p style={mutedTextStyle}>{getLocalizedText(item.surface, locale)}</p>
                <p style={mutedTextStyle}>{copy.nextAction}: {getLocalizedText(item.nextAction, locale)}</p>
              </div>
            ))}
          </article>
        </div>
        <div style={gridStyle}>
          {deliveryChecklist.groups.map((group) => (
            <article key={group.id} style={cardStyle}>
              <div style={rowStyle}>
                <div style={stackStyle}>
                  <p style={labelStyle}>{group.sourceReference}</p>
                  <strong>{getLocalizedText(group.title, locale)}</strong>
                </div>
                <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <PublishStateBadge label={`${group.counts.covered} ${copy.covered}`} state="ready" />
                  <PublishStateBadge
                    label={`${group.counts.needsReview} ${copy.needsReview}`}
                    state={group.counts.needsReview > 0 ? "warning" : "ready"}
                  />
                  <PublishStateBadge
                    label={`${group.counts.blocked} ${copy.blocker}`}
                    state={group.counts.blocked > 0 ? "blocker" : "ready"}
                  />
                  <Badge label={`${group.counts.deferred} ${copy.deferred}`} tone="info" />
                </span>
              </div>
              <p style={mutedTextStyle}>{getLocalizedText(group.summary, locale)}</p>
              <div style={stackStyle}>
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      borderTop: "1px solid #dbe6f4",
                      display: "grid",
                      gap: 8,
                      paddingTop: 10,
                    }}
                  >
                    <div style={rowStyle}>
                      <strong>{getLocalizedText(item.label, locale)}</strong>
                      <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        <PublishStateBadge
                          label={deliveryChecklistStatusLabel(item.status, copy)}
                          state={deliveryChecklistStatusState(item.status)}
                        />
                        {item.blocksDelivery ? (
                          <PublishStateBadge label={copy.publishBlocked} state="blocker" />
                        ) : null}
                      </span>
                    </div>
                    <div style={compactGridStyle}>
                      <div>
                        <p style={labelStyle}>{copy.linkedSurface}</p>
                        <p style={mutedTextStyle}>{getLocalizedText(item.surface, locale)}</p>
                      </div>
                      <div>
                        <p style={labelStyle}>{copy.ownerRole}</p>
                        <p style={mutedTextStyle}>{readableCode(item.ownerRole)}</p>
                      </div>
                      <div>
                        <p style={labelStyle}>{copy.sourceRequirement}</p>
                        <p style={mutedTextStyle}>{item.sourceRequirement}</p>
                      </div>
                    </div>
                    <p style={mutedTextStyle}>
                      {copy.evidence}: {getLocalizedText(item.evidence, locale)}
                    </p>
                    <p style={mutedTextStyle}>
                      {copy.nextAction}: {getLocalizedText(item.nextAction, locale)}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        aria-label={copy.walletProviderQaReadiness}
        style={panelStyle}
      >
        <div style={rowStyle}>
          <div style={stackStyle}>
            <p style={labelStyle}>{copy.walletProviderQaSubtitle}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: 0 }}>
              {copy.walletProviderQaReadiness}
            </h3>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Badge
              label={`${adminOps.walletProviderQaGate.summary.totalScenarios} ${copy.totalScenarios}`}
              tone="info"
            />
            <PublishStateBadge
              label={`${adminOps.walletProviderQaGate.summary.missingLiveEvidenceScenarios} ${copy.missingLiveEvidence}`}
              state={
                adminOps.walletProviderQaGate.summary.missingLiveEvidenceScenarios > 0
                  ? "warning"
                  : "ready"
              }
            />
            <PublishStateBadge
              label={`${adminOps.walletProviderQaGate.summary.releaseBlockers} ${copy.releaseBlockers}`}
              state={
                adminOps.walletProviderQaGate.summary.releaseBlockers > 0 ? "blocker" : "ready"
              }
            />
          </span>
        </div>
        <p style={boundaryStyle}>{getLocalizedText(adminOps.walletProviderQaGate.boundary, locale)}</p>
        <div style={compactGridStyle}>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.totalScenarios}</p>
            <p style={valueStyle}>{adminOps.walletProviderQaGate.summary.totalScenarios}</p>
            <p style={mutedTextStyle}>{copy.walletProviderQaSubtitle}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.seededReady}</p>
            <p style={valueStyle}>{adminOps.walletProviderQaGate.summary.seededReadyScenarios}</p>
            <p style={mutedTextStyle}>{copy.seededEvidence}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.liveEvidenceReady}</p>
            <p style={valueStyle}>{adminOps.walletProviderQaGate.summary.liveEvidenceReadyScenarios}</p>
            <p style={mutedTextStyle}>{copy.liveEvidence}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.missingLiveEvidence}</p>
            <p style={valueStyle}>{adminOps.walletProviderQaGate.summary.missingLiveEvidenceScenarios}</p>
            <p style={mutedTextStyle}>{copy.humanReviewRequired}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.releaseBlockers}</p>
            <p style={valueStyle}>{adminOps.walletProviderQaGate.summary.releaseBlockers}</p>
            <p style={mutedTextStyle}>{copy.noRewardCustodyDistribution}</p>
          </article>
        </div>
        <div style={gridStyle}>
          {adminOps.walletProviderQaGate.scenarios.map((scenario) => (
            <article key={scenario.id} style={cardStyle}>
              <div style={rowStyle}>
                <div style={stackStyle}>
                  <p style={labelStyle}>{copy.walletProviderQaSubtitle}</p>
                  <strong>{getLocalizedText(scenario.label, locale)}</strong>
                </div>
                <PublishStateBadge
                  label={walletProviderQaImpactLabel(scenario.releaseImpact, copy)}
                  state={walletProviderQaImpactState(scenario.releaseImpact)}
                />
              </div>
              <div style={compactGridStyle}>
                <div>
                  <p style={labelStyle}>{copy.seededEvidence}</p>
                  <PublishStateBadge
                    label={walletProviderQaSeededLabel(scenario.seededStatus, copy)}
                    state={walletProviderQaSeededState(scenario.seededStatus)}
                  />
                </div>
                <div>
                  <p style={labelStyle}>{copy.liveEvidence}</p>
                  <PublishStateBadge
                    label={walletProviderQaLiveLabel(scenario.liveEvidenceStatus, copy)}
                    state={walletProviderQaLiveState(scenario.liveEvidenceStatus)}
                  />
                </div>
                <div>
                  <p style={labelStyle}>{copy.releaseImpact}</p>
                  <PublishStateBadge
                    label={walletProviderQaImpactLabel(scenario.releaseImpact, copy)}
                    state={walletProviderQaImpactState(scenario.releaseImpact)}
                  />
                </div>
              </div>
              <p style={mutedTextStyle}>
                {copy.evidence}: {getLocalizedText(scenario.evidence, locale)}
              </p>
              <p style={mutedTextStyle}>
                {copy.nextAction}: {getLocalizedText(scenario.nextAction, locale)}
              </p>
              <p style={mutedTextStyle}>
                {copy.matchedSessions}: {scenario.matchedSessionIds.join(", ") || "-"}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-label={copy.providerEvidenceRegistry} style={panelStyle}>
        <div style={rowStyle}>
          <div style={stackStyle}>
            <p style={labelStyle}>{copy.providerEvidenceRegistrySubtitle}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: 0 }}>
              {copy.providerEvidenceRegistry}
            </h3>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Badge
              label={`${providerEvidenceRegistry.summary.totalEntries} ${copy.totalItems}`}
              tone="info"
            />
            <PublishStateBadge
              label={`${providerEvidenceRegistry.summary.missingLiveEvidenceEntries} ${copy.liveEvidenceMissing}`}
              state={providerEvidenceRegistry.summary.missingLiveEvidenceEntries > 0 ? "warning" : "ready"}
            />
            <PublishStateBadge
              label={`${providerEvidenceRegistry.summary.launchBlockers} ${copy.releaseBlockers}`}
              state={providerEvidenceRegistry.summary.launchBlockers > 0 ? "blocker" : "ready"}
            />
          </span>
        </div>
        <div style={boundaryStyle}>
          <p style={{ margin: 0 }}>{getLocalizedText(providerEvidenceRegistry.boundary, locale)}</p>
          <p style={{ margin: "8px 0 0" }}>
            {copy.nextAction}: {getLocalizedText(providerEvidenceRegistry.nextAction, locale)}
          </p>
        </div>
        <div style={compactGridStyle}>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.totalItems}</p>
            <p style={valueStyle}>{providerEvidenceRegistry.summary.totalEntries}</p>
            <p style={mutedTextStyle}>{copy.providerEvidenceRegistrySubtitle}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.liveEvidenceMissing}</p>
            <p style={valueStyle}>{providerEvidenceRegistry.summary.missingLiveEvidenceEntries}</p>
            <p style={mutedTextStyle}>{copy.liveEvidence}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.localOnlyReadiness}</p>
            <p style={valueStyle}>{providerEvidenceRegistry.summary.localOnlyEntries}</p>
            <p style={mutedTextStyle}>{copy.seededEvidence}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.reviewRequired}</p>
            <p style={valueStyle}>{providerEvidenceRegistry.summary.reviewRequiredEntries}</p>
            <p style={mutedTextStyle}>{copy.humanReviewRequired}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.unavailableReadiness}</p>
            <p style={valueStyle}>{providerEvidenceRegistry.summary.unavailableEntries}</p>
            <p style={mutedTextStyle}>{copy.configGate}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.blocker}</p>
            <p style={valueStyle}>{providerEvidenceRegistry.summary.blockedEntries}</p>
            <p style={mutedTextStyle}>{copy.releaseBlockers}</p>
          </article>
        </div>
        <div style={gridStyle}>
          {providerEvidenceRegistryEntries.map((entry) => (
            <article key={entry.id} style={cardStyle}>
              <div style={rowStyle}>
                <div style={stackStyle}>
                  <p style={labelStyle}>{entry.providerId}</p>
                  <strong>{getLocalizedText(entry.label, locale)}</strong>
                </div>
                <PublishStateBadge
                  label={readableCode(entry.adapterReadiness)}
                  state={providerReadinessState(entry.adapterReadiness)}
                />
              </div>
              <div style={compactGridStyle}>
                <div>
                  <p style={labelStyle}>{copy.category}</p>
                  <p style={mutedTextStyle}>{readableCode(entry.category)}</p>
                </div>
                <div>
                  <p style={labelStyle}>{copy.liveEvidence}</p>
                  <PublishStateBadge
                    label={readableCode(entry.liveEvidenceStatus)}
                    state={providerLiveEvidenceState(entry.liveEvidenceStatus)}
                  />
                </div>
                <div>
                  <p style={labelStyle}>{copy.adapterReadiness}</p>
                  <PublishStateBadge
                    label={readableCode(entry.adapterReadiness)}
                    state={providerReadinessState(entry.adapterReadiness)}
                  />
                </div>
                <div>
                  <p style={labelStyle}>{copy.featureGate}</p>
                  <PublishStateBadge
                    label={readableCode(entry.featureGate.state)}
                    state={providerFeatureGateState(entry.featureGate.state)}
                  />
                </div>
                <div>
                  <p style={labelStyle}>{copy.fallback}</p>
                  <PublishStateBadge
                    label={getLocalizedText(entry.fallback.label, locale)}
                    state={entry.fallback.blocksLaunch ? "blocker" : "warning"}
                  />
                </div>
                <div>
                  <p style={labelStyle}>{copy.ownerRole}</p>
                  <p style={mutedTextStyle}>{readableCode(entry.ownerRole)}</p>
                </div>
              </div>
              <div>
                <p style={labelStyle}>{copy.affectedOutcomes}</p>
                <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {entry.affectedOutcomes.map((outcome, index) => (
                    <Badge key={`${entry.id}-${outcome}-${index}`} label={readableCode(outcome)} tone="info" />
                  ))}
                </span>
              </div>
              <p style={mutedTextStyle}>
                {copy.configGate}: {entry.featureGate.configKey} · {getLocalizedText(entry.featureGate.operatorMessage, locale)}
              </p>
              <p style={mutedTextStyle}>
                {copy.evidence}: {getLocalizedText(entry.evidenceRequired, locale)}
              </p>
              <p style={mutedTextStyle}>
                {copy.fallback}: {getLocalizedText(entry.fallback.description, locale)}
              </p>
              <p style={mutedTextStyle}>
                {copy.nextAction}: {getLocalizedText(entry.nextAction, locale)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section style={panelStyle}>
        <div style={rowStyle}>
          <div style={stackStyle}>
            <p style={labelStyle}>{copy.templateGovernanceSubtitle}</p>
            <h3 style={{ fontSize: 20, margin: 0 }}>{copy.templateGovernance}</h3>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Badge
              label={`${templateGovernance.summary.totalTemplates} ${copy.templates}`}
              tone="info"
            />
            <PublishStateBadge
              label={`${templateGovernance.summary.warningCount} ${copy.warning}`}
              state={templateGovernance.summary.warningCount > 0 ? "warning" : "ready"}
            />
          </span>
        </div>
        <p style={boundaryStyle}>{getLocalizedText(templateGovernance.boundary, locale)}</p>
        <div style={compactGridStyle}>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.templateStatusReady}</p>
            <p style={valueStyle}>{templateGovernance.summary.readyCount}</p>
            <p style={mutedTextStyle}>{copy.templateGovernanceBoundary}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.localizationReview}</p>
            <p style={valueStyle}>{templateGovernance.summary.localizationReviewCount}</p>
            <p style={mutedTextStyle}>zh-CN / zh-TW AI draft/fallback</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.riskReview}</p>
            <p style={valueStyle}>{templateGovernance.summary.highRiskCount}</p>
            <p style={mutedTextStyle}>social/referral</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.walletCoverage}</p>
            <p style={valueStyle}>
              {templateGovernance.summary.anyWalletCount}/{templateGovernance.summary.eoaOnlyCount}
            </p>
            <p style={mutedTextStyle}>
              {copy.walletAny} / {copy.walletEoaOnly}
            </p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.strongVerification}</p>
            <p style={valueStyle}>{templateGovernance.summary.strongVerificationCount}</p>
            <p style={mutedTextStyle}>ON_CHAIN / DAPP_API / WALLET / REFERRAL</p>
          </article>
        </div>
        <div style={gridStyle}>
          {templateGovernance.rows.map((row) => (
            <article key={row.templateId} style={cardStyle}>
              <div style={rowStyle}>
                <div style={stackStyle}>
                  <p style={labelStyle}>{row.category}</p>
                  <strong>{getLocalizedText(row.title, locale)}</strong>
                </div>
                <PublishStateBadge
                  label={templateStatusLabel(row.status, copy)}
                  state={templateGovernanceState(row.status)}
                />
              </div>
              <p style={mutedTextStyle}>{getLocalizedText(row.description, locale)}</p>
              <div style={compactGridStyle}>
                <div>
                  <p style={labelStyle}>{copy.verification}</p>
                  <p style={mutedTextStyle}>{row.verificationType}</p>
                </div>
                <div>
                  <p style={labelStyle}>{copy.defaultPoints}</p>
                  <p style={mutedTextStyle}>{row.defaultPoints}</p>
                </div>
                <div>
                  <p style={labelStyle}>{copy.riskLevel}</p>
                  <p style={mutedTextStyle}>{row.riskLevel}</p>
                </div>
                <div>
                  <p style={labelStyle}>{row.requiredByDefault ? copy.required : copy.optional}</p>
                  <p style={mutedTextStyle}>{row.requiredByDefault ? copy.required : copy.optional}</p>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <Badge label={walletCompatibilityLabel(row.walletCompatibility, copy)} tone="info" />
                {Object.entries(row.localeReadiness).map(([readinessLocale, status]) => (
                  <LocaleStatusBadge
                    key={readinessLocale}
                    label={`${readinessLocale} ${status}`}
                    status={status}
                  />
                ))}
                {row.reviewSignals.map((signal) => (
                  <ReviewSeverityBadge
                    key={`${row.templateId}-${signal}`}
                    label={templateSignalLabel(signal, copy)}
                    severity={signal === "risk_review" ? "warning" : "info"}
                  />
                ))}
              </div>
              <p style={mutedTextStyle}>{getLocalizedText(row.statusReason, locale)}</p>
              <p style={mutedTextStyle}>
                {copy.nextAction}: {getLocalizedText(row.nextAction, locale)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section style={panelStyle}>
        <div style={rowStyle}>
          <div style={stackStyle}>
            <p style={labelStyle}>{copy.adminContractReviewCenter}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: 0 }}>
              {getLocalizedText(contractReviewCenter.summary, locale)}
            </h3>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <PublishStateBadge
              label={contractReviewCenter.publishState}
              state={contractReviewCenter.publishState}
            />
            {contractReviewCenter.highImpactMode ? (
              <PublishStateBadge label={copy.contractClaim} state="blocker" />
            ) : (
              <ContractModeBadge label={copy.offChain} mode="OFF_CHAIN_MVP" />
            )}
          </span>
        </div>
        <p style={boundaryStyle}>{getLocalizedText(contractReviewCenter.boundary, locale)}</p>
        <div style={gridStyle}>
          {contractReviewSummary.map((item) => (
            <article key={item.id} style={cardStyle}>
              <div style={rowStyle}>
                <p style={labelStyle}>{item.label}</p>
                {item.badge}
              </div>
              <p style={mutedTextStyle}>{item.value}</p>
            </article>
          ))}
        </div>
        <div style={rowStyle}>
          <h3 style={{ fontSize: 20, margin: 0 }}>{copy.highImpactChecklist}</h3>
          <PublishStateBadge label={contractReviewCenter.publishState} state={contractReviewCenter.publishState} />
        </div>
        <p style={mutedTextStyle}>{getLocalizedText(contractReviewCenter.nextAction, locale)}</p>
        <div style={scrollContainerStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{copy.status}</th>
                <th style={thStyle}>{copy.contractMode}</th>
                <th style={thStyle}>{copy.currentValue}</th>
                <th style={thStyle}>{copy.requiredFor}</th>
                <th style={thStyle}>{copy.ownerRole}</th>
                <th style={thStyle}>{copy.detail}</th>
                <th style={thStyle}>{copy.nextAction}</th>
              </tr>
            </thead>
            <tbody>
              {contractReviewCenter.checklist.map((item) => (
                <tr key={item.id}>
                  <td style={tdStyle}>
                    <PublishStateBadge
                      label={item.status}
                      state={checklistStatusState(item.status)}
                    />
                  </td>
                  <td style={tdStyle}>
                    <strong>{getLocalizedText(item.label, locale)}</strong>
                  </td>
                  <td style={tdStyle}>{getLocalizedText(item.value, locale)}</td>
                  <td style={tdStyle}>{item.requiredFor}</td>
                  <td style={tdStyle}>{readableCode(item.ownerRole)}</td>
                  <td style={tdStyle}>{getLocalizedText(item.detail, locale)}</td>
                  <td style={tdStyle}>{getLocalizedText(item.nextAction, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={rowStyle}>
          <h3 style={{ fontSize: 20, margin: 0 }}>{copy.contractEvolution}</h3>
        </div>
        <div style={gridStyle}>
          {contractReviewCenter.evolution.map((step) => (
            <article key={step.id} style={cardStyle}>
              <div style={rowStyle}>
                <Badge label={getLocalizedText(step.phase, locale)} tone="info" />
                <PublishStateBadge label={step.status} state={step.status} />
              </div>
              <strong>{getLocalizedText(step.title, locale)}</strong>
              <p style={mutedTextStyle}>{getLocalizedText(step.description, locale)}</p>
              <p style={mutedTextStyle}>
                {copy.contractSurface}: {getLocalizedText(step.contractSurface, locale)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section style={panelStyle}>
        <div style={rowStyle}>
          <div style={stackStyle}>
            <p style={labelStyle}>{copy.companionContracts}</p>
            <h3 style={{ fontSize: 22, lineHeight: 1.2, margin: 0 }}>
              {copy.contractInterfaceMatrixConsole}
            </h3>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Badge
              label={`${contractInterfaceMatrix.summary.totalContracts} ${copy.totalContracts}`}
              tone="info"
            />
            <Badge
              label={`${contractInterfaceMatrix.summary.totalMethods} ${copy.totalMethods}`}
              tone="info"
            />
            <PublishStateBadge
              label={`${contractInterfaceMatrix.summary.blockedRows} ${copy.blocker}`}
              state={contractInterfaceMatrix.summary.blockedRows > 0 ? "blocker" : "ready"}
            />
          </span>
        </div>
        <div style={boundaryStyle}>
          <p style={{ margin: 0 }}>{getLocalizedText(contractInterfaceMatrix.summary.boundary, locale)}</p>
          <p style={{ margin: "8px 0 0" }}>
            {copy.noAbiGeneration} · {copy.noLiveContractTransaction} ·{" "}
            {copy.noRewardCustodyDistribution}
          </p>
        </div>
        <div style={compactGridStyle}>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.companionContracts}</p>
            <p style={valueStyle}>{contractInterfaceMatrix.summary.totalContracts}</p>
            <p style={mutedTextStyle}>CampaignRegistryV2 / Points / Referral / Eligibility</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.contractMethods}</p>
            <p style={valueStyle}>{contractInterfaceMatrix.summary.totalMethods}</p>
            <p style={mutedTextStyle}>{copy.noLiveContractTransaction}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.priorityPhase}</p>
            <p style={valueStyle}>{contractInterfaceMatrix.summary.p1Rows}</p>
            <p style={mutedTextStyle}>P1 {copy.changeMatrix}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.blocker}</p>
            <p style={valueStyle}>{contractInterfaceMatrix.summary.blockedRows}</p>
            <p style={mutedTextStyle}>{copy.noRewardCustodyDistribution}</p>
          </article>
        </div>
        <div style={gridStyle}>
          {contractInterfaceMatrix.groups.map((group) => (
            <article key={group.contractName} style={cardStyle}>
              <div style={rowStyle}>
                <div style={stackStyle}>
                  <p style={labelStyle}>{copy.companionContracts}</p>
                  <strong>{group.contractName}</strong>
                </div>
                <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <Badge label={group.phase} tone="info" />
                  <PublishStateBadge
                    label={group.readiness}
                    state={contractInterfaceReadinessState(group.readiness)}
                  />
                </span>
              </div>
              <p style={mutedTextStyle}>{getLocalizedText(group.purpose, locale)}</p>
              <p style={mutedTextStyle}>
                {copy.onChainBoundary}: {getLocalizedText(group.boundary, locale)}
              </p>
              <p style={mutedTextStyle}>
                {copy.nextAction}: {getLocalizedText(group.nextAction, locale)}
              </p>
              <div style={stackStyle}>
                <p style={labelStyle}>{copy.contractMethods}</p>
                {group.methods.map((method) => (
                  <div
                    key={`${group.contractName}-${method.name}`}
                    style={{
                      borderTop: "1px solid #dbe6f4",
                      display: "grid",
                      gap: 8,
                      paddingTop: 10,
                    }}
                  >
                    <div style={rowStyle}>
                      <strong>{method.name}</strong>
                      <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        <Badge label={method.phase} tone="info" />
                        <PublishStateBadge
                          label={method.readiness}
                          state={contractInterfaceReadinessState(method.readiness)}
                        />
                      </span>
                    </div>
                    <code style={codeListStyle}>{method.signature}</code>
                    <p style={mutedTextStyle}>{getLocalizedText(method.purpose, locale)}</p>
                    <p style={mutedTextStyle}>
                      {copy.onChainBoundary}: {getLocalizedText(method.boundary, locale)}
                    </p>
                    <p style={mutedTextStyle}>
                      {copy.nextAction}: {getLocalizedText(method.nextAction, locale)}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
        <div style={rowStyle}>
          <h3 style={{ fontSize: 20, margin: 0 }}>{copy.changeMatrix}</h3>
          <Badge
            label={`${contractInterfaceMatrix.summary.p1Rows} P1 / ${contractInterfaceMatrix.summary.blockedRows} ${copy.blocker}`}
            tone="warning"
          />
        </div>
        <div style={scrollContainerStyle}>
          <table style={{ ...tableStyle, minWidth: 1280 }}>
            <thead>
              <tr>
                <th style={thStyle}>{copy.category}</th>
                <th style={thStyle}>{copy.currentMvp}</th>
                <th style={thStyle}>{copy.recommendedV2}</th>
                <th style={thStyle}>{copy.priorityPhase}</th>
                <th style={thStyle}>{copy.ownerRole}</th>
                <th style={thStyle}>{copy.status}</th>
                <th style={thStyle}>{copy.detail}</th>
                <th style={thStyle}>{copy.nextAction}</th>
                <th style={thStyle}>{copy.onChainBoundary}</th>
              </tr>
            </thead>
            <tbody>
              {contractInterfaceMatrix.changeMatrix.map((row) => (
                <tr key={row.area["en-US"]}>
                  <td style={tdStyle}>
                    <strong>{getLocalizedText(row.area, locale)}</strong>
                  </td>
                  <td style={tdStyle}>{getLocalizedText(row.currentMvp, locale)}</td>
                  <td style={tdStyle}>{getLocalizedText(row.recommendedV2, locale)}</td>
                  <td style={tdStyle}>{row.priority}</td>
                  <td style={tdStyle}>{readableCode(row.ownerRole)}</td>
                  <td style={tdStyle}>
                    <PublishStateBadge
                      label={row.readiness}
                      state={contractInterfaceReadinessState(row.readiness)}
                    />
                  </td>
                  <td style={tdStyle}>{getLocalizedText(row.notes, locale)}</td>
                  <td style={tdStyle}>{getLocalizedText(row.nextAction, locale)}</td>
                  <td style={tdStyle}>{getLocalizedText(row.boundary, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={panelStyle}>
        <div style={rowStyle}>
          <h3 style={{ fontSize: 20, margin: 0 }}>{copy.analyticsOverview}</h3>
          <PublishStateBadge
            label={`${adminOps.exportBatch.readyCount}/${adminOps.exportBatch.rows.length} ${copy.exportReady}`}
            state={adminOps.exportBatch.blockedCount > 0 ? "warning" : "ready"}
          />
        </div>
        <div style={gridStyle}>
          {adminOps.analytics.map((metric) => (
            <article key={metric.id} style={cardStyle}>
              <div style={rowStyle}>
                <p style={labelStyle}>{getLocalizedText(metric.label, locale)}</p>
                <PublishStateBadge
                  label={metric.tone}
                  state={metricToneState(metric.tone)}
                />
              </div>
              <p style={valueStyle}>{metric.value}</p>
              <p style={mutedTextStyle}>{getLocalizedText(metric.trend, locale)}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={gridStyle}>
        <article style={panelStyle}>
          <h3 style={{ fontSize: 20, margin: 0 }}>{copy.conversionFunnel}</h3>
          <div style={stackStyle}>
            {adminOps.funnel.map((step) => (
              <div key={step.id} style={cardStyle}>
                <div style={rowStyle}>
                  <strong>{getLocalizedText(step.label, locale)}</strong>
                  <Badge label={`${step.conversionRate}% ${copy.conversion}`} tone="info" />
                </div>
                <p style={mutedTextStyle}>
                  {copy.count}: {step.count.toLocaleString("en-US")}
                </p>
                <p style={mutedTextStyle}>{getLocalizedText(step.dropOffNote, locale)}</p>
              </div>
            ))}
          </div>
        </article>

        <article style={panelStyle}>
          <h3 style={{ fontSize: 20, margin: 0 }}>{copy.walletSplit}</h3>
          <div style={compactGridStyle}>
            {adminOps.walletSplit.map((row) => (
              <div key={row.id} style={cardStyle}>
                <p style={labelStyle}>{row.label}</p>
                <p style={valueStyle}>{row.percentage}%</p>
                <p style={mutedTextStyle}>{row.count} wallets</p>
              </div>
            ))}
          </div>
          <h3 style={{ fontSize: 20, margin: "4px 0 0" }}>{copy.localeSplit}</h3>
          <div style={compactGridStyle}>
            {adminOps.localeSplit.map((row) => (
              <div key={row.id} style={cardStyle}>
                <p style={labelStyle}>{row.label}</p>
                <p style={valueStyle}>{row.percentage}%</p>
                <p style={mutedTextStyle}>{row.count} wallets</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section style={gridStyle}>
        <section style={panelStyle}>
          <div style={rowStyle}>
            <div style={stackStyle}>
              <p style={labelStyle}>{copy.aiContent}</p>
              <h3 style={{ fontSize: 20, margin: 0 }}>{copy.aiContentPackWorkbench}</h3>
            </div>
            <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <Badge label={`${aiContentPack.summary.totalArtifacts} ${copy.artifacts}`} tone="ai" />
              <PublishStateBadge
                label={`${aiContentPack.summary.blockedReleaseActions} ${copy.publishBlocked}`}
                state={aiContentPack.summary.blockedReleaseActions > 0 ? "warning" : "ready"}
              />
            </span>
          </div>
          <p style={boundaryStyle}>{getLocalizedText(aiContentPack.boundary.body, locale)}</p>
          <div style={compactGridStyle}>
            <article style={cardStyle}>
              <p style={labelStyle}>{copy.enPublished}</p>
              <p style={mutedTextStyle}>
                {campaign.contentRevisions.find((revision) => revision.locale === "en-US")?.title}
              </p>
              <LocaleStatusBadge label="en-US published" status="published" />
            </article>
            <article style={cardStyle}>
              <p style={labelStyle}>{copy.zhDraft}</p>
              <p style={{ ...mutedTextStyle, color: "#92400e", fontWeight: 800 }}>
                {copy.autoPublishBlocked}
              </p>
              <ReviewSeverityBadge label={copy.humanReviewGate} severity="warning" />
            </article>
            <article style={cardStyle}>
              <p style={labelStyle}>{copy.humanApproved}</p>
              <p style={valueStyle}>{aiContentPack.summary.humanApproved}</p>
              <p style={mutedTextStyle}>{getLocalizedText(aiContentPack.summary.nextAction, locale)}</p>
            </article>
            <article style={cardStyle}>
              <p style={labelStyle}>{copy.humanReviewGate}</p>
              <p style={valueStyle}>{aiContentPack.summary.aiDrafts}</p>
              <p style={mutedTextStyle}>{copy.autoPublishBlocked}</p>
            </article>
            <article style={cardStyle}>
              <p style={labelStyle}>{copy.copyReady}</p>
              <p style={valueStyle}>{aiContentPack.summary.availableCopyActions}</p>
              <p style={mutedTextStyle}>{getLocalizedText(aiContentPack.boundary.title, locale)}</p>
            </article>
          </div>
          <div style={gridStyle}>
            {aiContentPack.artifacts.map((artifact) => (
              <article key={artifact.id} style={cardStyle}>
                <div style={rowStyle}>
                  <strong>{getLocalizedText(artifact.title, locale)}</strong>
                  <PublishStateBadge
                    label={readableCode(artifact.lifecycle)}
                    state={aiContentLifecycleState(artifact.lifecycle)}
                  />
                </div>
                <p style={mutedTextStyle}>{getLocalizedText(artifact.purpose, locale)}</p>
                <p style={mutedTextStyle}>{getLocalizedText(artifact.body, locale)}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <Badge label={artifact.channel} tone="info" />
                  <Badge label={`${copy.riskLevel}: ${artifact.riskLevel}`} tone={artifact.riskLevel === "high" ? "warning" : "neutral"} />
                  {Object.entries(artifact.localeStatus).map(([statusLocale, status]) => (
                    <LocaleStatusBadge
                      key={statusLocale}
                      label={`${statusLocale} ${status}`}
                      status={status}
                    />
                  ))}
                  <ReviewSeverityBadge
                    label={artifact.reviewer ? `${copy.reviewer}: ${artifact.reviewer}` : copy.humanReviewRequired}
                    severity={artifact.reviewer ? "info" : "warning"}
                  />
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <PublishStateBadge
                    label={artifact.actionPolicy.copy === "available" ? copy.copyReady : copy.humanReviewRequired}
                    state={artifact.actionPolicy.copy === "available" ? "ready" : "warning"}
                  />
                  <PublishStateBadge
                    label={artifact.actionPolicy.schedule === "available" ? copy.scheduleReady : copy.publishBlocked}
                    state={artifact.actionPolicy.schedule === "available" ? "ready" : "warning"}
                  />
                  <PublishStateBadge
                    label={artifact.actionPolicy.publish === "available" ? copy.readiness : copy.publishBlocked}
                    state={artifact.actionPolicy.publish === "available" ? "ready" : "warning"}
                  />
                </div>
                <p style={mutedTextStyle}>{getLocalizedText(artifact.actionPolicy.nextAction, locale)}</p>
                {artifact.actionPolicy.blockedReason ? (
                  <p style={{ ...mutedTextStyle, color: "#92400e", fontWeight: 800 }}>
                    {getLocalizedText(artifact.actionPolicy.blockedReason, locale)}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
          <div style={rowStyle}>
            <h3 style={{ fontSize: 20, margin: 0 }}>{copy.qualityGates}</h3>
            <PublishStateBadge
              label={`${aiContentPack.summary.qualityGateBlockers} ${copy.blocker}`}
              state={aiContentPack.summary.qualityGateBlockers > 0 ? "blocker" : "ready"}
            />
          </div>
          <div style={gridStyle}>
            {aiContentPack.qualityGates.map((gate) => (
              <article key={gate.id} style={cardStyle}>
                <div style={rowStyle}>
                  <strong>{getLocalizedText(gate.label, locale)}</strong>
                  <PublishStateBadge label={gate.status} state={aiContentGateState(gate.status)} />
                </div>
                <p style={mutedTextStyle}>{getLocalizedText(gate.evidence, locale)}</p>
              </article>
            ))}
          </div>
        </section>

        <article style={panelStyle}>
          <h3 style={{ fontSize: 20, margin: 0 }}>{copy.contractImpact}</h3>
          {contractModes.map((mode) => (
            <div key={mode.key} style={cardStyle}>
              <div style={rowStyle}>
                {mode.badge}
                <strong>{mode.description}</strong>
              </div>
              <span style={{ color: "#475569", fontSize: 13 }}>
                {mode.key === "CONTRACT_CLAIM"
                  ? contractClaimReadiness.blockers[0]
                  : modeLabel(mode.key as ContractMode)}
              </span>
            </div>
          ))}
        </article>
      </section>

      <section style={panelStyle}>
        <h3 style={{ fontSize: 20, margin: 0 }}>{copy.riskDashboard}</h3>
        <div style={gridStyle}>
          {adminOps.riskSignals.map((signal) => (
            <article key={signal.id} style={cardStyle}>
              <div style={rowStyle}>
                <strong>{getLocalizedText(signal.label, locale)}</strong>
                <PublishStateBadge
                  label={signal.severity}
                  state={signalState(signal.severity)}
                />
              </div>
              <p style={valueStyle}>{signal.value}</p>
              <p style={mutedTextStyle}>
                {copy.evidence}: {getLocalizedText(signal.evidence, locale)}
              </p>
              <p style={mutedTextStyle}>
                {copy.nextAction}: {getLocalizedText(signal.nextAction, locale)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section style={panelStyle}>
        <div style={rowStyle}>
          <div style={stackStyle}>
            <h3 style={{ fontSize: 20, margin: 0 }}>{copy.aiOptimizationActionQueue}</h3>
          </div>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Badge
              label={`${aiOptimization.summary.totalActions} ${copy.totalActions}`}
              tone="info"
            />
            <PublishStateBadge
              label={`${aiOptimization.summary.readyCount} ${copy.readyActions}`}
              state="ready"
            />
            <PublishStateBadge
              label={`${aiOptimization.summary.reviewRequiredCount} ${copy.reviewRequiredActions}`}
              state={aiOptimization.summary.reviewRequiredCount > 0 ? "warning" : "ready"}
            />
            <PublishStateBadge
              label={`${aiOptimization.summary.blockedCount} ${copy.blockedActions}`}
              state={aiOptimization.summary.blockedCount > 0 ? "blocker" : "ready"}
            />
          </span>
        </div>
        <div style={boundaryStyle}>
          <p style={{ margin: 0 }}>{copy.localOnlyBoundary}</p>
          <p style={{ margin: "8px 0 0" }}>
            {getLocalizedText(aiOptimization.boundary, locale)}
          </p>
        </div>
        <div style={gridStyle}>
          {aiOptimization.reports.map((report) => (
            <article key={report.id} style={cardStyle}>
              <div style={rowStyle}>
                <div style={stackStyle}>
                  <p style={labelStyle}>{copy.category}: {readableCode(report.category)}</p>
                  <strong>{getLocalizedText(report.title, locale)}</strong>
                </div>
                <Badge label={`${copy.generatedAt}: ${report.generatedAt}`} tone="ai" />
              </div>
              <p style={mutedTextStyle}>{getLocalizedText(report.summary, locale)}</p>
              {report.actions.map((action) => (
                <div
                  key={action.id}
                  style={{
                    borderTop: "1px solid #dbe6f4",
                    display: "grid",
                    gap: 10,
                    minWidth: 0,
                    paddingTop: 10,
                  }}
                >
                  <div style={rowStyle}>
                    <strong>{getLocalizedText(action.title, locale)}</strong>
                    <PublishStateBadge
                      label={aiOptimizationStatusLabel(action.status, copy)}
                      state={aiOptimizationStatusState(action.status)}
                    />
                  </div>
                  <div style={compactGridStyle}>
                    <div>
                      <p style={labelStyle}>{copy.actionStatus}</p>
                      <p style={mutedTextStyle}>{aiOptimizationStatusLabel(action.status, copy)}</p>
                    </div>
                    <div>
                      <p style={labelStyle}>{copy.ownerRole}</p>
                      <p style={mutedTextStyle}>{readableCode(action.ownerRole)}</p>
                    </div>
                    <div>
                      <p style={labelStyle}>{copy.confidence}</p>
                      <p style={mutedTextStyle}>
                        {action.confidence} · {copy.riskLevel}: {action.riskLevel}
                      </p>
                    </div>
                  </div>
                  <p style={mutedTextStyle}>
                    {copy.evidence}: {getLocalizedText(action.evidence, locale)}
                  </p>
                  <p style={mutedTextStyle}>
                    {copy.expectedImpact}: {getLocalizedText(action.expectedImpact, locale)}
                  </p>
                  <div style={stackStyle}>
                    <p style={labelStyle}>{copy.sourceMetrics}</p>
                    <span style={sourceMetricListStyle}>
                      {action.sourceMetrics.map((metric) => (
                        <span
                          key={metric.id}
                          style={{
                            ...sourceMetricChipStyle,
                            ...sourceMetricToneStyles[metric.tone],
                          }}
                          title={`${getLocalizedText(metric.label, locale)}: ${metric.value}`}
                        >
                          {getLocalizedText(metric.label, locale)}: {metric.value}
                        </span>
                      ))}
                    </span>
                  </div>
                  <p style={mutedTextStyle}>
                    {copy.guardrail}: {getLocalizedText(action.guardrail, locale)}
                  </p>
                  <p style={mutedTextStyle}>
                    {copy.nextAction}: {getLocalizedText(action.nextAction, locale)}
                  </p>
                </div>
              ))}
            </article>
          ))}
        </div>
      </section>

      <section style={panelStyle}>
        <h3 style={{ fontSize: 20, margin: 0 }}>{copy.aiOpsReports}</h3>
        <div style={gridStyle}>
          {adminOps.aiReports.map((report) => (
            <article key={report.id} style={cardStyle}>
              <div style={rowStyle}>
                <strong>{getLocalizedText(report.title, locale)}</strong>
                <Badge label={`${copy.generatedAt}: ${report.generatedAt}`} tone="ai" />
              </div>
              <p style={mutedTextStyle}>{getLocalizedText(report.summary, locale)}</p>
              {report.recommendations.map((recommendation) => (
                <div
                  key={recommendation.id}
                  style={{
                    borderTop: "1px solid #dbe6f4",
                    display: "grid",
                    gap: 8,
                    paddingTop: 10,
                  }}
                >
                  <div style={rowStyle}>
                    <strong>{getLocalizedText(recommendation.title, locale)}</strong>
                    <PublishStateBadge
                      label={
                        recommendation.requiresHumanReview
                          ? copy.humanReviewRequired
                          : copy.noHumanReviewRequired
                      }
                      state={recommendation.requiresHumanReview ? "warning" : "ready"}
                    />
                  </div>
                  <p style={mutedTextStyle}>
                    {copy.expectedImpact}: {getLocalizedText(recommendation.expectedImpact, locale)}
                  </p>
                  <p style={mutedTextStyle}>
                    {copy.confidence}: {recommendation.confidence} · {copy.riskLevel}:{" "}
                    {recommendation.riskLevel}
                  </p>
                </div>
              ))}
            </article>
          ))}
        </div>
      </section>

      <section style={panelStyle}>
        <h3 style={{ fontSize: 20, margin: 0 }}>{copy.ecosystemMetrics}</h3>
        <div style={scrollContainerStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{copy.product}</th>
                <th style={thStyle}>{copy.count}</th>
                <th style={thStyle}>{copy.conversion}</th>
                <th style={thStyle}>{copy.qualitySignal}</th>
                <th style={thStyle}>{copy.nextAction}</th>
              </tr>
            </thead>
            <tbody>
              {adminOps.ecosystemMetrics.map((row) => (
                <tr key={row.product}>
                  <td style={tdStyle}>
                    <strong>{row.product}</strong>
                  </td>
                  <td style={tdStyle}>{row.verifiedActions.toLocaleString("en-US")}</td>
                  <td style={tdStyle}>{getLocalizedText(row.conversionImpact, locale)}</td>
                  <td style={tdStyle}>{getLocalizedText(row.qualitySignal, locale)}</td>
                  <td style={tdStyle}>{getLocalizedText(row.recommendedNextAction, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={panelStyle}>
        <div style={rowStyle}>
          <h3 style={{ fontSize: 20, margin: 0 }}>{copy.exportPreview}</h3>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <PublishStateBadge label={copy.exportReady} state="ready" />
            <Badge label={`${copy.exportBatch}: ${adminOps.exportBatch.batchId}`} tone="info" />
          </span>
        </div>
        <div style={boundaryStyle}>
          <p style={{ margin: 0 }}>{copy.exportDisclaimer}</p>
          <p style={{ margin: "6px 0 0" }}>
            {getLocalizedText(adminOps.exportBatch.disclaimer, locale)}
          </p>
        </div>
        <div style={gridStyle}>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.exportConfirmation}</p>
            <p style={mutedTextStyle}>{copy.verifiedRecordsOnly}</p>
            <p style={mutedTextStyle}>{copy.finalRewardOwner}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.blockersWarnings}</p>
            <p style={mutedTextStyle}>
              {getLocalizedText(adminOps.exportBatch.confirmation.noDistributionBoundary, locale)}
            </p>
            <p style={mutedTextStyle}>
              {getLocalizedText(adminOps.exportBatch.confirmation.riskBoundary, locale)}
            </p>
          </article>
        </div>
        <div aria-label={copy.exportConfirmationReadiness} style={cardStyle}>
          <div style={rowStyle}>
            <div>
              <p style={labelStyle}>{copy.exportConfirmationReadiness}</p>
              <h4 style={{ fontSize: 18, margin: "2px 0 0" }}>{copy.exportConfirmationReadiness}</h4>
            </div>
            <PublishStateBadge
              label={`${exportReadiness.summary.requiredAcknowledgements}/${exportReadiness.summary.acknowledgedItems} ${copy.exportAcknowledgements}`}
              state={
                exportReadiness.summary.requiredAcknowledgements === exportReadiness.summary.acknowledgedItems
                  ? "ready"
                  : "warning"
              }
            />
          </div>
          <div style={compactGridStyle}>
            {[
              { label: copy.readyRows, state: "ready" as const, value: exportReadiness.summary.readyRows },
              { label: copy.reviewRequired, state: "warning" as const, value: exportReadiness.summary.reviewRequiredRows },
              {
                label: copy.blocked,
                state: exportReadiness.summary.blockedRows > 0 ? "blocker" as const : "ready" as const,
                value: exportReadiness.summary.blockedRows,
              },
              { label: copy.exportPreviewModes, state: "ready" as const, value: exportReadiness.summary.previewModeCount },
            ].map(({ label, value, state }) => (
              <article key={label} style={{ ...cardStyle, minHeight: 0 }}>
                <p style={labelStyle}>{label}</p>
                <p style={{ ...valueStyle, fontSize: 20 }}>{value}</p>
                <PublishStateBadge label={String(value)} state={state} />
              </article>
            ))}
          </div>
          <div style={gridStyle}>
            <article style={{ ...cardStyle, minHeight: 0 }}>
              <p style={labelStyle}>{copy.exportPreviewModes}</p>
              <div style={sourceMetricListStyle}>
                {exportReadiness.previewModes.map((mode) => (
                  <div key={mode.mode} style={rowStyle}>
                    <span style={mutedTextStyle}>{getLocalizedText(mode.label, locale)}</span>
                    <PublishStateBadge
                      label={mode.generatesFile ? copy.exportRealFile : copy.exportLocalPreviewOnly}
                      state={mode.generatesFile ? "blocker" : "ready"}
                    />
                  </div>
                ))}
              </div>
            </article>
            <article style={{ ...cardStyle, minHeight: 0 }}>
              <p style={labelStyle}>{copy.exportProjectAcknowledgements}</p>
              <div style={sourceMetricListStyle}>
                {exportReadiness.acknowledgements.map((acknowledgement) => (
                  <div key={acknowledgement.id} style={rowStyle}>
                    <span style={mutedTextStyle}>{getLocalizedText(acknowledgement.label, locale)}</span>
                    <PublishStateBadge
                      label={acknowledgement.acknowledged ? copy.humanApproved : copy.reviewRequired}
                      state={acknowledgement.acknowledged ? "ready" : "warning"}
                    />
                  </div>
                ))}
              </div>
            </article>
          </div>
          <div style={gridStyle}>
            <article style={{ ...cardStyle, minHeight: 0 }}>
              <p style={labelStyle}>{copy.exportRequiredFields}</p>
              <code style={codeListStyle}>
                {exportReadiness.fieldCoverage.requiredFields.join(",")}
              </code>
            </article>
            <article style={{ ...cardStyle, minHeight: 0 }}>
              <p style={labelStyle}>{copy.exportRowReasonCoverage}</p>
              <div style={sourceMetricListStyle}>
                {exportReadiness.rowStatusCoverage.map((reason) => (
                  <div key={reason.reasonCode} style={rowStyle}>
                    <span style={mutedTextStyle}>{getLocalizedText(reason.label, locale)}</span>
                    <PublishStateBadge
                      label={`${reason.affectedRows} ${readableCode(reason.rowStatus)}`}
                      state={reason.rowStatus === "blocked" ? "blocker" : reason.rowStatus === "review_required" ? "warning" : "ready"}
                    />
                  </div>
                ))}
              </div>
            </article>
          </div>
          <div style={gridStyle}>
            {exportReadiness.contractRootReadiness.map((rootMode) => (
              <article key={rootMode.mode} style={{ ...cardStyle, minHeight: 0 }}>
                <div style={rowStyle}>
                  <strong>{getLocalizedText(rootMode.label, locale)}</strong>
                  <PublishStateBadge
                    label={readableCode(rootMode.readiness)}
                    state={exportReadinessState(rootMode.readiness)}
                  />
                </div>
                <p style={mutedTextStyle}>
                  {rootMode.safeDefault ? copy.exportSafeDefault : getLocalizedText(rootMode.nextAction, locale)}
                </p>
              </article>
            ))}
          </div>
          <p style={boundaryStyle}>{getLocalizedText(exportReadiness.boundary, locale)}</p>
        </div>
        <div style={stackStyle}>
          <p style={labelStyle}>{copy.exactColumnOrder}</p>
          <div style={scrollContainerStyle}>
            <code style={contractCodeStyle}>{columnContract}</code>
          </div>
        </div>
        <div style={scrollContainerStyle}>
          <table style={exportTableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{copy.wallet}</th>
                <th style={thStyle}>{copy.accountType}</th>
                <th style={thStyle}>{copy.walletSource}</th>
                <th style={thStyle}>{copy.localePreference}</th>
                <th style={thStyle}>{copy.pointsRank}</th>
                <th style={thStyle}>{copy.walletTypeVerified}</th>
                <th style={thStyle}>{copy.status}</th>
                <th style={thStyle}>{copy.rowCompleteness}</th>
                <th style={thStyle}>{copy.missingTasks}</th>
                <th style={thStyle}>{copy.riskFlags}</th>
                <th style={thStyle}>{copy.referrerAddress}</th>
                <th style={thStyle}>{copy.taskRecords}</th>
                <th style={thStyle}>{copy.evidenceHashes}</th>
                <th style={thStyle}>{copy.exportBatch}</th>
              </tr>
            </thead>
            <tbody>
              {adminOps.exportBatch.rows.map((row) => (
                <tr key={row.walletAddress}>
                  <td style={tdStyle}>
                    <div style={stackStyle}>
                      <span>{row.walletAddress}</span>
                      <WalletBadge accountType={row.accountType} walletSource={row.walletSource} />
                    </div>
                  </td>
                  <td style={tdStyle}>{row.accountType}</td>
                  <td style={tdStyle}>{row.walletSource}</td>
                  <td style={tdStyle}>{row.localePreference}</td>
                  <td style={tdStyle}>
                    {row.totalPoints} / #{row.rank ?? "-"}
                  </td>
                  <td style={tdStyle}>{row.walletTypeVerified ? "true" : "false"}</td>
                  <td style={tdStyle}>
                    <PublishStateBadge
                      label={row.eligible ? "eligible" : "ineligible"}
                      state={row.eligible ? "ready" : "warning"}
                    />
                  </td>
                  <td style={tdStyle}>
                    <div style={stackStyle}>
                      <PublishStateBadge
                        label={row.rowStatus}
                        state={row.rowStatus === "ready" ? "ready" : "warning"}
                      />
                      <span style={mutedTextStyle}>
                        {row.missingColumnValues.join(", ") || "-"}
                      </span>
                    </div>
                  </td>
                  <td style={tdStyle}>{row.missingTasks.join(", ") || "-"}</td>
                  <td style={tdStyle}>{row.riskFlags.join(", ") || "-"}</td>
                  <td style={tdStyle}>{row.referrerAddress}</td>
                  <td style={tdStyle}>
                    <div style={stackStyle}>
                      {row.taskRecords.map((record) => (
                        <span key={record} style={codeListStyle}>
                          {record}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={stackStyle}>
                      {row.evidenceHashes.map((hash) => (
                        <span key={hash} style={codeListStyle}>
                          {hash}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={tdStyle}>{row.exportBatchId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
