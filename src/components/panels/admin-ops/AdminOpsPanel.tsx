import type { CSSProperties } from "react";
import {
  campaignDetail,
  computePublishReadiness,
  createAdminOpsReadModel,
  getLocalizedText,
  type CampaignShellDetail,
  type ContractMode,
  type ContractReviewChecklistStatus,
  type AiContentArtifactLifecycle,
  type AiContentQualityGateStatus,
  type MetricTone,
  type SignalSeverity,
  type SupportedLocale,
  type TemplateGovernanceSignal,
  type TemplateGovernanceStatus,
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

const aiContentLifecycleState = (lifecycle: AiContentArtifactLifecycle) =>
  lifecycle === "ai_draft" || lifecycle === "edited" ? "warning" : "ready";

const aiContentGateState = (status: AiContentQualityGateStatus) =>
  status === "blocked" ? "blocker" : status === "warning" ? "warning" : "ready";

const readableCode = (value: string) => value.replace(/_/g, " ");

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
  const aiContentPack = adminOps.aiContentPack;
  const templateGovernance = adminOps.templateGovernance;
  const contractClaimReadiness = computePublishReadiness(
    { contractMode: "CONTRACT_CLAIM" },
    campaign.contentRevisions,
  );
  const contractReviewCenter = adminOps.contractReviewCenter;
  const columnContract = adminOps.exportBatch.columns.join(",");
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
            <p style={mutedTextStyle}>zh-CN AI draft/fallback</p>
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
                <LocaleStatusBadge
                  label={`en-US ${row.localeReadiness["en-US"]}`}
                  status={row.localeReadiness["en-US"]}
                />
                <LocaleStatusBadge
                  label={`zh-CN ${row.localeReadiness["zh-CN"]}`}
                  status={row.localeReadiness["zh-CN"]}
                />
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
                  <LocaleStatusBadge
                    label={`en-US ${artifact.localeStatus["en-US"]}`}
                    status={artifact.localeStatus["en-US"]}
                  />
                  <LocaleStatusBadge
                    label={`zh-CN ${artifact.localeStatus["zh-CN"]}`}
                    status={artifact.localeStatus["zh-CN"]}
                  />
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
        <div style={{ overflowX: "auto" }}>
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
