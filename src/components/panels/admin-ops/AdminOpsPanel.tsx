import type { CSSProperties } from "react";
import {
  campaignDetail,
  computePublishReadiness,
  type CampaignShellDetail,
  type ContractMode,
  type SupportedLocale,
} from "../../../domain";
import {
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

const cardStyle: CSSProperties = {
  background: "#f8fbff",
  border: "1px solid #dbe6f4",
  borderRadius: 8,
  display: "grid",
  gap: 10,
  padding: 14,
};

const rowStyle: CSSProperties = {
  alignItems: "center",
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  justifyContent: "space-between",
};

const labelStyle: CSSProperties = {
  color: "#64748b",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 0,
  margin: 0,
  textTransform: "uppercase",
};

const tableStyle: CSSProperties = {
  borderCollapse: "collapse",
  minWidth: 720,
  width: "100%",
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

const modeLabel = (mode: ContractMode) => mode.replace(/_/g, " ");

export const AdminOpsPanel = ({
  campaign = campaignDetail,
  locale,
}: AdminOpsPanelProps) => {
  const copy = adminOpsCopy[locale];
  const contractClaimReadiness = computePublishReadiness(
    { contractMode: "CONTRACT_CLAIM" },
    campaign.contentRevisions,
  );
  const warningCount = campaign.publishReadiness.warnings.length;
  const blockerCount = contractClaimReadiness.blockers.length;

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
        <div style={gridStyle}>
          {campaign.reviewItems.map((item) => (
            <article key={item.id} style={cardStyle}>
              <div style={rowStyle}>
                <strong>{item.title}</strong>
                <ReviewSeverityBadge label={item.severity} severity={item.severity} />
              </div>
              <p style={{ color: "#475569", fontSize: 13, margin: 0 }}>
                {copy.status}: {item.status}
              </p>
              <p style={{ color: "#475569", fontSize: 13, margin: 0 }}>
                {copy.owner}: {item.ownerRole}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section style={gridStyle}>
        <article style={panelStyle}>
          <h3 style={{ fontSize: 20, margin: 0 }}>{copy.aiContent}</h3>
          <div style={cardStyle}>
            <div style={rowStyle}>
              <strong>{copy.enPublished}</strong>
              <LocaleStatusBadge label="en-US published" status="published" />
            </div>
            <p style={{ color: "#475569", fontSize: 13, margin: 0 }}>
              {campaign.contentRevisions.find((revision) => revision.locale === "en-US")?.title}
            </p>
          </div>
          <div style={cardStyle}>
            <div style={rowStyle}>
              <strong>{copy.zhDraft}</strong>
              <LocaleStatusBadge label="zh-CN AI draft" status="ai_draft" />
            </div>
            <p style={{ color: "#92400e", fontSize: 13, fontWeight: 700, margin: 0 }}>
              {copy.autoPublishBlocked}
            </p>
            <ReviewSeverityBadge label={copy.humanReviewGate} severity="warning" />
          </div>
        </article>

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
        <div style={rowStyle}>
          <h3 style={{ fontSize: 20, margin: 0 }}>{copy.exportPreview}</h3>
          <PublishStateBadge label={copy.exportReady} state="ready" />
        </div>
        <p
          style={{
            background: "#fffbeb",
            border: "1px solid #fcd34d",
            borderRadius: 8,
            color: "#92400e",
            fontWeight: 800,
            lineHeight: 1.45,
            margin: 0,
            padding: 12,
          }}
        >
          {copy.exportDisclaimer}
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{copy.wallet}</th>
                <th style={thStyle}>{copy.localePreference}</th>
                <th style={thStyle}>{copy.pointsRank}</th>
                <th style={thStyle}>{copy.status}</th>
                <th style={thStyle}>{copy.missingTasks}</th>
                <th style={thStyle}>{copy.riskFlags}</th>
              </tr>
            </thead>
            <tbody>
              {campaign.exportPreview.rows.map((row) => (
                <tr key={row.walletAddress}>
                  <td style={tdStyle}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <span>{row.walletAddress}</span>
                      <WalletBadge accountType={row.accountType} walletSource={row.walletSource} />
                    </div>
                  </td>
                  <td style={tdStyle}>{row.localePreference}</td>
                  <td style={tdStyle}>
                    {row.totalPoints} / #{row.rank ?? "-"}
                  </td>
                  <td style={tdStyle}>
                    <PublishStateBadge
                      label={row.eligible ? "eligible" : "ineligible"}
                      state={row.eligible ? "ready" : "warning"}
                    />
                  </td>
                  <td style={tdStyle}>{row.missingTasks.join(", ") || "-"}</td>
                  <td style={tdStyle}>{row.riskFlags.join(", ") || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
