import type { CSSProperties } from "react";
import {
  contractImpactOptions,
  getLocalizedText,
  seededCampaignDraft,
  type BuilderContentRevision,
  type CampaignDraft,
  type ContractImpactSelection,
  type ContractMode,
  type ReviewSeverity,
  type SupportedLocale,
} from "../../../../domain";
import { ContractModeBadge, PublishStateBadge, ReviewSeverityBadge } from "../../../badges/Badges";

interface I18nContractReadinessProps {
  draft?: CampaignDraft;
  locale: SupportedLocale;
}

const copy = {
  "en-US": {
    aiDraft: "AI draft",
    contractImpact: "Contract impact",
    contractReview: "Contract review",
    defaultMode: "Safe default",
    englishSource: "English source content",
    fallback: "Falls back to English",
    highImpactBlocker: "High-impact manual review blocker",
    humanReview: "Human review gate",
    notPublished: "Not published",
    published: "Published",
    rewardDisclaimer: "Reward disclaimer by locale",
    title: "i18n, contract, and review gates",
    zhDraft: "Chinese AI draft",
  },
  "zh-CN": {
    aiDraft: "AI 草稿",
    contractImpact: "合约影响",
    contractReview: "合约审核",
    defaultMode: "安全默认模式",
    englishSource: "英文源内容",
    fallback: "回退英文",
    highImpactBlocker: "高影响人工审核阻断",
    humanReview: "人工审核门禁",
    notPublished: "未发布",
    published: "已发布",
    rewardDisclaimer: "按语言展示奖励声明",
    title: "多语言、合约与审核门禁",
    zhDraft: "中文 AI 草稿",
  },
} satisfies Record<SupportedLocale, Record<string, string>>;

const contractModeLabels = {
  "en-US": {
    CONTRACT_CLAIM: "Contract claim",
    OFF_CHAIN_MVP: "Off-chain MVP",
    V2_COMPANION: "V2 companion",
  },
  "zh-CN": {
    CONTRACT_CLAIM: "合约领取",
    OFF_CHAIN_MVP: "Off-chain MVP",
    V2_COMPANION: "V2 辅助合约",
  },
} satisfies Record<SupportedLocale, Record<ContractMode, string>>;

const reviewSeverityLabels = {
  "en-US": {
    blocker: "Blocker",
    info: "Info",
    warning: "Warning",
  },
  "zh-CN": {
    blocker: "阻断",
    info: "信息",
    warning: "警告",
  },
} satisfies Record<SupportedLocale, Record<ReviewSeverity, string>>;

const sectionStyle: CSSProperties = {
  display: "grid",
  gap: 14,
};

const gridStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
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
  fontSize: 16,
  fontWeight: 800,
  lineHeight: 1.35,
  margin: 0,
};

const bodyStyle: CSSProperties = {
  color: "#475569",
  lineHeight: 1.5,
  margin: 0,
};

const badgeRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const listStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  margin: 0,
  padding: 0,
};

const getRevision = (
  draft: CampaignDraft,
  locale: SupportedLocale,
): BuilderContentRevision | undefined =>
  draft.contentRevisions.find((revision) => revision.locale === locale);

const contractModeState = (option: ContractImpactSelection) =>
  option.reviewSeverity === "blocker" ? "blocker" : option.reviewSeverity === "warning" ? "warning" : "ready";

export const I18nContractReadiness = ({
  draft = seededCampaignDraft,
  locale,
}: I18nContractReadinessProps) => {
  const labels = copy[locale];
  const englishRevision = getRevision(draft, "en-US");
  const chineseRevision = getRevision(draft, "zh-CN");

  return (
    <section aria-label={labels.title} style={sectionStyle}>
      <h3 style={{ fontSize: 20, lineHeight: 1.2, margin: 0 }}>{labels.title}</h3>
      <div style={gridStyle}>
        <article style={cardStyle}>
          <p style={labelStyle}>{labels.englishSource}</p>
          <p style={valueStyle}>{englishRevision?.title ?? getLocalizedText(draft.campaignName, "en-US")}</p>
          <p style={bodyStyle}>{englishRevision?.description}</p>
          <p style={bodyStyle}>{englishRevision?.socialPost}</p>
          <span style={badgeRowStyle}>
            <PublishStateBadge
              label={englishRevision?.published ? labels.published : labels.notPublished}
              state={englishRevision?.published ? "ready" : "warning"}
            />
            <PublishStateBadge
              label={englishRevision?.humanReviewed ? labels.humanReview : labels.aiDraft}
              state={englishRevision?.humanReviewed ? "ready" : "warning"}
            />
          </span>
        </article>

        <article style={cardStyle}>
          <p style={labelStyle}>{labels.zhDraft}</p>
          <p style={valueStyle}>{chineseRevision?.title ?? getLocalizedText(draft.campaignName, "zh-CN")}</p>
          <p style={bodyStyle}>{chineseRevision?.description}</p>
          <span style={badgeRowStyle}>
            <PublishStateBadge
              label={chineseRevision?.aiDraft ? labels.aiDraft : labels.humanReview}
              state={chineseRevision?.humanReviewed ? "ready" : "warning"}
            />
            <PublishStateBadge
              label={chineseRevision?.fallbackToEnglish ? labels.fallback : labels.published}
              state={chineseRevision?.fallbackToEnglish ? "warning" : "ready"}
            />
            <PublishStateBadge
              label={chineseRevision?.published ? labels.published : labels.notPublished}
              state={chineseRevision?.published ? "ready" : "warning"}
            />
          </span>
        </article>

        <article style={cardStyle}>
          <p style={labelStyle}>{labels.rewardDisclaimer}</p>
          <p style={valueStyle}>en-US</p>
          <p style={bodyStyle}>{englishRevision?.rewardDisclaimer ?? draft.rewardPlan.disclaimer["en-US"]}</p>
          <p style={valueStyle}>zh-CN</p>
          <p style={bodyStyle}>{chineseRevision?.rewardDisclaimer ?? draft.rewardPlan.disclaimer["zh-CN"]}</p>
        </article>
      </div>

      <article style={cardStyle}>
        <p style={labelStyle}>{labels.contractImpact}</p>
        <ul style={listStyle}>
          {contractImpactOptions.map((option) => (
            <li key={option.mode} style={{ display: "grid", gap: 8, listStyle: "none" }}>
              <span style={badgeRowStyle}>
                <ContractModeBadge mode={option.mode} label={contractModeLabels[locale][option.mode]} />
                <ReviewSeverityBadge
                  severity={option.reviewSeverity}
                  label={reviewSeverityLabels[locale][option.reviewSeverity]}
                />
                <PublishStateBadge
                  label={option.mode === "OFF_CHAIN_MVP" ? labels.defaultMode : labels.contractReview}
                  state={contractModeState(option)}
                />
                {option.mode === "CONTRACT_CLAIM" ? (
                  <PublishStateBadge label={labels.highImpactBlocker} state="blocker" />
                ) : null}
              </span>
              <p style={bodyStyle}>
                {option.requiresVerifierRole
                  ? labels.contractReview
                  : labels.defaultMode}
              </p>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
};
