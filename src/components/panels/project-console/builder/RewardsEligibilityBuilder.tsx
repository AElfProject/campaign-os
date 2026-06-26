import type { CSSProperties } from "react";
import {
  getLocalizedText,
  seededCampaignDraft,
  seededBuilderReadiness,
  type CampaignDraft,
  type SupportedLocale,
} from "../../../../domain";
import { PublishStateBadge } from "../../../badges/Badges";

interface RewardsEligibilityBuilderProps {
  draft?: CampaignDraft;
  locale: SupportedLocale;
}

const copy = {
  "en-US": {
    accepted: "Accepted",
    eligibility: "Eligibility rules",
    exportDisclaimer: "Export disclaimer",
    manualReview: "Manual review",
    pointsRule: "Points rule",
    provider: "Reward provider",
    referralValidation: "Referral validation",
    rewardDisclaimer: "Reward responsibility",
    risk: "Risk settings",
    title: "Rewards and eligibility setup",
    walletPolicy: "Wallet policy",
    winnerRule: "Winner rule",
  },
  "zh-CN": {
    accepted: "已确认",
    eligibility: "资格规则",
    exportDisclaimer: "导出声明",
    manualReview: "人工审核",
    pointsRule: "积分规则",
    provider: "奖励提供方",
    referralValidation: "邀请验证",
    rewardDisclaimer: "奖励责任",
    risk: "风险设置",
    title: "奖励与资格设置",
    walletPolicy: "钱包策略",
    winnerRule: "获奖规则",
  },
} satisfies Record<SupportedLocale, Record<string, string>>;

const sectionStyle: CSSProperties = {
  display: "grid",
  gap: 14,
};

const gridStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
};

const cardStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe6f4",
  borderRadius: 8,
  display: "grid",
  gap: 10,
  minWidth: 0,
  padding: 14,
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
  fontSize: 15,
  fontWeight: 800,
  lineHeight: 1.35,
  margin: 0,
};

const bodyStyle: CSSProperties = {
  color: "#475569",
  lineHeight: 1.5,
  margin: 0,
};

const listStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  margin: 0,
  padding: 0,
};

const listItemStyle: CSSProperties = {
  alignItems: "center",
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  justifyContent: "space-between",
  listStyle: "none",
};

const readinessConcernLabels = (draft: CampaignDraft, locale: SupportedLocale) => {
  const readiness = draft.id === seededCampaignDraft.id ? seededBuilderReadiness : null;
  const warnings = readiness?.warnings ?? [];
  const blockers = readiness?.blockers ?? [];

  return [...blockers, ...warnings].map((check) => getLocalizedText(check.reason, locale));
};

export const RewardsEligibilityBuilder = ({
  draft = seededCampaignDraft,
  locale,
}: RewardsEligibilityBuilderProps) => {
  const labels = copy[locale];
  const concerns = readinessConcernLabels(draft, locale);

  return (
    <section aria-label={labels.title} style={sectionStyle}>
      <h3 style={{ fontSize: 20, lineHeight: 1.2, margin: 0 }}>{labels.title}</h3>
      <div style={gridStyle}>
        <article style={cardStyle}>
          <p style={labelStyle}>{labels.provider}</p>
          <p style={valueStyle}>{draft.rewardPlan.provider}</p>
          <p style={bodyStyle}>{getLocalizedText(draft.rewardPlan.description, locale)}</p>
          <p style={labelStyle}>{labels.rewardDisclaimer}</p>
          <p style={bodyStyle}>{getLocalizedText(draft.rewardPlan.disclaimer, locale)}</p>
        </article>

        <article style={cardStyle}>
          <p style={labelStyle}>{labels.eligibility}</p>
          <ul style={listStyle}>
            <li style={listItemStyle}>
              <span>{labels.walletPolicy}</span>
              <strong>{draft.eligibilityRule.walletPolicy}</strong>
            </li>
            <li style={listItemStyle}>
              <span>{labels.pointsRule}</span>
              <strong>{draft.rewardPlan.pointsRule}</strong>
            </li>
            <li style={listItemStyle}>
              <span>{labels.winnerRule}</span>
              <strong>{draft.rewardPlan.winnerRule}</strong>
            </li>
            <li style={listItemStyle}>
              <span>{labels.referralValidation}</span>
              <PublishStateBadge
                label={draft.eligibilityRule.referralValidationEnabled ? labels.accepted : "Off"}
                state={draft.eligibilityRule.referralValidationEnabled ? "ready" : "warning"}
              />
            </li>
            <li style={listItemStyle}>
              <span>{labels.manualReview}</span>
              <PublishStateBadge
                label={draft.eligibilityRule.manualReviewRequired ? labels.accepted : "Off"}
                state={draft.eligibilityRule.manualReviewRequired ? "ready" : "warning"}
              />
            </li>
          </ul>
        </article>

        <article style={cardStyle}>
          <p style={labelStyle}>{labels.exportDisclaimer}</p>
          <p style={bodyStyle}>{getLocalizedText(draft.rewardPlan.exportDisclaimer, locale)}</p>
          <PublishStateBadge
            label={draft.rewardPlan.exportDisclaimerAccepted ? labels.accepted : labels.exportDisclaimer}
            state={draft.rewardPlan.exportDisclaimerAccepted ? "ready" : "blocker"}
          />
        </article>

        <article style={cardStyle}>
          <p style={labelStyle}>{labels.risk}</p>
          <ul style={listStyle}>
            {concerns.map((concern) => (
              <li key={concern} style={listItemStyle}>
                <span style={{ color: "#475569", lineHeight: 1.45 }}>{concern}</span>
                <PublishStateBadge label={labels.risk} state="warning" />
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
};
