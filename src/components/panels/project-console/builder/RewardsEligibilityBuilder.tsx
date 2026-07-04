import type { CSSProperties } from "react";
import {
  createRewardEligibilityReview,
  getLocalizedText,
  seededCampaignDraft,
  seededBuilderReadiness,
  type CampaignDraft,
  type AiRuleAssistantState,
  type PointsRule,
  type RewardExportFormat,
  type RewardProvider,
  type RewardType,
  type RewardEligibilityRiskSeverity,
  type SupportedLocale,
  type WalletPolicy,
  type WinnerRule,
} from "../../../../domain";
import { PublishStateBadge } from "../../../badges/Badges";

type BusinessContentLocale = Exclude<SupportedLocale, "ja-JP" | "ko-KR" | "vi-VN" | "id-ID" | "tr-TR" | "es-ES">;

interface RewardsEligibilityBuilderProps {
  draft?: CampaignDraft;
  locale: BusinessContentLocale;
}

const copy = {
  "en-US": {
    accepted: "Accepted",
    aiRuleAssistant: "AI Rule Assistant",
    assistantEvidence: "Assistant evidence",
    assistantNextAction: "Assistant next action",
    disabled: "Off",
    eligibility: "Eligibility rules",
    exportDisclaimer: "Export disclaimer",
    exportFormat: "Export format",
    manualReview: "Manual review",
    pointsRule: "Points rule",
    provider: "Reward provider",
    referralValidation: "Referral validation",
    requiredTasks: "Required tasks",
    reviewBoundary: "Review boundary",
    rewardDisclaimer: "Reward responsibility",
    rewardType: "Reward type",
    risk: "Risk settings",
    riskFlags: "Risk flags",
    signedMessage: "Signed message",
    signedMessageRequired: "Required before verification",
    title: "Rewards and eligibility setup",
    walletPolicy: "Wallet policy",
    winnerRule: "Winner rule",
  },
  "zh-CN": {
    accepted: "已确认",
    aiRuleAssistant: "AI 规则助手",
    assistantEvidence: "助手证据",
    assistantNextAction: "助手下一步",
    disabled: "已关闭",
    eligibility: "资格规则",
    exportDisclaimer: "导出声明",
    exportFormat: "导出格式",
    manualReview: "人工审核",
    pointsRule: "积分规则",
    provider: "奖励提供方",
    referralValidation: "邀请验证",
    requiredTasks: "必做任务",
    reviewBoundary: "审核边界",
    rewardDisclaimer: "奖励责任",
    rewardType: "奖励类型",
    risk: "风险设置",
    riskFlags: "风险标记",
    signedMessage: "签名消息",
    signedMessageRequired: "验证前必须完成",
    title: "奖励与资格设置",
    walletPolicy: "钱包策略",
    winnerRule: "获奖规则",
  },
  "zh-TW": {
    accepted: "已確認",
    aiRuleAssistant: "AI 規則助手",
    assistantEvidence: "助手證據",
    assistantNextAction: "助手下一步",
    disabled: "已關閉",
    eligibility: "資格規則",
    exportDisclaimer: "匯出聲明",
    exportFormat: "匯出格式",
    manualReview: "人工審核",
    pointsRule: "積分規則",
    provider: "獎勵提供方",
    referralValidation: "邀請驗證",
    requiredTasks: "必做任務",
    reviewBoundary: "審核邊界",
    rewardDisclaimer: "獎勵責任",
    rewardType: "獎勵類型",
    risk: "風險設定",
    riskFlags: "風險標記",
    signedMessage: "簽名訊息",
    signedMessageRequired: "驗證前必須完成",
    title: "獎勵與資格設定",
    walletPolicy: "錢包策略",
    winnerRule: "獲獎規則",
  },
} satisfies Record<BusinessContentLocale, Record<string, string>>;

const rewardProviderLabels = {
  "en-US": {
    campaign_project: "Campaign project",
    partner: "Partner",
  },
  "zh-CN": {
    campaign_project: "活动项目方",
    partner: "合作伙伴",
  },
  "zh-TW": {
    campaign_project: "活動專案方",
    partner: "合作夥伴",
  },
} satisfies Record<BusinessContentLocale, Record<RewardProvider, string>>;

const rewardTypeLabels = {
  "en-US": {
    nft: "NFT",
    points: "Points",
    token: "Token",
    whitelist: "Whitelist",
  },
  "zh-CN": {
    nft: "NFT",
    points: "积分",
    token: "代币",
    whitelist: "白名单",
  },
  "zh-TW": {
    nft: "NFT",
    points: "積分",
    token: "代幣",
    whitelist: "白名單",
  },
} satisfies Record<BusinessContentLocale, Record<RewardType, string>>;

const exportFormatLabels = {
  "en-US": {
    csv: "CSV",
    json: "JSON",
    risk_flags: "Risk flags export",
    task_records: "Task records",
  },
  "zh-CN": {
    csv: "CSV",
    json: "JSON",
    risk_flags: "风险标记导出",
    task_records: "任务记录",
  },
  "zh-TW": {
    csv: "CSV",
    json: "JSON",
    risk_flags: "風險標記匯出",
    task_records: "任務記錄",
  },
} satisfies Record<BusinessContentLocale, Record<RewardExportFormat, string>>;

const walletPolicyLabels = {
  "en-US": {
    ANY: "Any wallet",
    AA_ONLY: "AA only",
    EOA_ONLY: "EOA only",
  },
  "zh-CN": {
    ANY: "任意钱包",
    AA_ONLY: "仅 AA 钱包",
    EOA_ONLY: "仅 EOA 钱包",
  },
  "zh-TW": {
    ANY: "任意錢包",
    AA_ONLY: "僅 AA 錢包",
    EOA_ONLY: "僅 EOA 錢包",
  },
} satisfies Record<BusinessContentLocale, Record<WalletPolicy, string>>;

const pointsRuleLabels = {
  "en-US": {
    task_points: "Task points",
    daily_cap: "Daily cap",
    referral_bonus: "Referral bonus",
  },
  "zh-CN": {
    task_points: "任务积分",
    daily_cap: "每日上限",
    referral_bonus: "邀请奖励",
  },
  "zh-TW": {
    task_points: "任務積分",
    daily_cap: "每日上限",
    referral_bonus: "邀請獎勵",
  },
} satisfies Record<BusinessContentLocale, Record<PointsRule, string>>;

const winnerRuleLabels = {
  "en-US": {
    top_n: "Top N",
    threshold: "Threshold",
    manual_review: "Manual review",
  },
  "zh-CN": {
    top_n: "前 N 名",
    threshold: "门槛达标",
    manual_review: "人工审核",
  },
  "zh-TW": {
    top_n: "前 N 名",
    threshold: "門檻達標",
    manual_review: "人工審核",
  },
} satisfies Record<BusinessContentLocale, Record<WinnerRule, string>>;

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

const chipListStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const chipStyle: CSSProperties = {
  background: "#f8fbff",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  color: "#334155",
  fontSize: 12,
  fontWeight: 800,
  lineHeight: 1.2,
  maxWidth: "100%",
  overflowWrap: "anywhere",
  padding: "6px 8px",
};

const detailListItemStyle: CSSProperties = {
  ...listItemStyle,
  alignItems: "flex-start",
  borderTop: "1px solid #eef2f7",
  paddingTop: 8,
};

const readinessConcernLabels = (draft: CampaignDraft, locale: BusinessContentLocale) => {
  const readiness = draft.id === seededCampaignDraft.id ? seededBuilderReadiness : null;
  const warnings = readiness?.warnings ?? [];
  const blockers = readiness?.blockers ?? [];

  return [...blockers, ...warnings].map((check) => getLocalizedText(check.reason, locale));
};

const assistantStateToBadgeState = (state: AiRuleAssistantState) =>
  state === "blocked" ? "blocker" : state === "warning" ? "warning" : "ready";

const riskSeverityToBadgeState = (severity: RewardEligibilityRiskSeverity) =>
  severity === "blocked" ? "blocker" : severity === "warning" ? "warning" : "ready";

const renderChips = (items: readonly string[]) => (
  <span style={chipListStyle}>
    {items.map((item) => (
      <span key={item} style={chipStyle}>
        {item}
      </span>
    ))}
  </span>
);

export const RewardsEligibilityBuilder = ({
  draft = seededCampaignDraft,
  locale,
}: RewardsEligibilityBuilderProps) => {
  const labels = copy[locale];
  const concerns = readinessConcernLabels(draft, locale);
  const review = createRewardEligibilityReview(draft);

  return (
    <section aria-label={labels.title} style={sectionStyle}>
      <h3 style={{ fontSize: 20, lineHeight: 1.2, margin: 0 }}>{labels.title}</h3>
      <div style={gridStyle}>
        <article style={cardStyle}>
          <span style={listItemStyle}>
            <p style={labelStyle}>{labels.aiRuleAssistant}</p>
            <PublishStateBadge
              label={review.aiRuleAssistant.state}
              state={assistantStateToBadgeState(review.aiRuleAssistant.state)}
            />
          </span>
          <p style={valueStyle}>{getLocalizedText(review.aiRuleAssistant.recommendation, locale)}</p>
          <p style={labelStyle}>{labels.assistantEvidence}</p>
          <ul style={listStyle}>
            {review.aiRuleAssistant.evidence.map((item) => (
              <li key={getLocalizedText(item, locale)} style={listItemStyle}>
                <span style={bodyStyle}>{getLocalizedText(item, locale)}</span>
              </li>
            ))}
          </ul>
          <p style={labelStyle}>{labels.assistantNextAction}</p>
          <p style={bodyStyle}>{getLocalizedText(review.aiRuleAssistant.nextAction, locale)}</p>
          <p style={labelStyle}>{labels.reviewBoundary}</p>
          <p style={bodyStyle}>{getLocalizedText(review.aiRuleAssistant.boundary, locale)}</p>
        </article>

        <article style={cardStyle}>
          <p style={labelStyle}>{labels.provider}</p>
          <p style={valueStyle}>{rewardProviderLabels[locale][draft.rewardPlan.provider]}</p>
          <p style={bodyStyle}>{getLocalizedText(draft.rewardPlan.description, locale)}</p>
          <p style={labelStyle}>{labels.rewardType}</p>
          {renderChips(review.summary.rewardTypes.map((type) => rewardTypeLabels[locale][type]))}
          <p style={labelStyle}>{labels.rewardDisclaimer}</p>
          <p style={bodyStyle}>{getLocalizedText(draft.rewardPlan.disclaimer, locale)}</p>
        </article>

        <article style={cardStyle}>
          <p style={labelStyle}>{labels.eligibility}</p>
          <ul style={listStyle}>
            <li style={listItemStyle}>
              <span>{labels.walletPolicy}</span>
              <strong>{walletPolicyLabels[locale][draft.eligibilityRule.walletPolicy]}</strong>
            </li>
            <li style={listItemStyle}>
              <span>{labels.pointsRule}</span>
              <strong>{pointsRuleLabels[locale][draft.rewardPlan.pointsRule]}</strong>
            </li>
            <li style={listItemStyle}>
              <span>{labels.winnerRule}</span>
              <strong>{winnerRuleLabels[locale][draft.rewardPlan.winnerRule]}</strong>
            </li>
            <li style={listItemStyle}>
              <span>{labels.signedMessage}</span>
              <strong>{review.summary.signedMessageRequired ? labels.signedMessageRequired : labels.disabled}</strong>
            </li>
            <li style={listItemStyle}>
              <span>{labels.referralValidation}</span>
              <PublishStateBadge
                label={draft.eligibilityRule.referralValidationEnabled ? labels.accepted : labels.disabled}
                state={draft.eligibilityRule.referralValidationEnabled ? "ready" : "warning"}
              />
            </li>
            <li style={listItemStyle}>
              <span>{labels.manualReview}</span>
              <PublishStateBadge
                label={draft.eligibilityRule.manualReviewRequired ? labels.accepted : labels.disabled}
                state={draft.eligibilityRule.manualReviewRequired ? "ready" : "warning"}
              />
            </li>
          </ul>
        </article>

        <article style={cardStyle}>
          <p style={labelStyle}>{labels.exportDisclaimer}</p>
          <p style={bodyStyle}>{getLocalizedText(draft.rewardPlan.exportDisclaimer, locale)}</p>
          <p style={labelStyle}>{labels.exportFormat}</p>
          {renderChips(review.summary.exportFormats.map((format) => exportFormatLabels[locale][format]))}
          <PublishStateBadge
            label={draft.rewardPlan.exportDisclaimerAccepted ? labels.accepted : labels.exportDisclaimer}
            state={draft.rewardPlan.exportDisclaimerAccepted ? "ready" : "blocker"}
          />
        </article>

        <article style={cardStyle}>
          <p style={labelStyle}>{labels.requiredTasks}</p>
          <ul style={listStyle}>
            {review.requiredTasks.map((task) => (
              <li key={task.id} style={detailListItemStyle}>
                <span>
                  <strong style={{ color: "#071426" }}>{getLocalizedText(task.label, locale)}</strong>
                  <p style={bodyStyle}>
                    {task.verificationType} · {task.points} pts · {getLocalizedText(task.nextAction, locale)}
                  </p>
                </span>
                <PublishStateBadge
                  label={task.required ? labels.accepted : labels.disabled}
                  state={task.required ? "ready" : "warning"}
                />
              </li>
            ))}
          </ul>
        </article>

        <article style={cardStyle}>
          <p style={labelStyle}>{labels.riskFlags}</p>
          <ul style={listStyle}>
            {review.riskFlags.map((flag) => (
              <li key={flag.id} style={detailListItemStyle}>
                <span>
                  <strong style={{ color: "#071426" }}>{getLocalizedText(flag.label, locale)}</strong>
                  <p style={bodyStyle}>{getLocalizedText(flag.evidence, locale)}</p>
                  <p style={bodyStyle}>{getLocalizedText(flag.nextAction, locale)}</p>
                </span>
                <PublishStateBadge
                  label={flag.enabled ? labels.accepted : labels.disabled}
                  state={riskSeverityToBadgeState(flag.severity)}
                />
              </li>
            ))}
          </ul>
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
          <p style={labelStyle}>{labels.reviewBoundary}</p>
          <p style={bodyStyle}>{getLocalizedText(review.boundary, locale)}</p>
        </article>
      </div>
    </section>
  );
};
