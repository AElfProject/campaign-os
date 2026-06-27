import type { CSSProperties } from "react";
import { CheckCircle2, Languages, RotateCcw, Sparkles, Upload } from "lucide-react";
import {
  campaignDetail,
  createContractImpactReviewModel,
  createTranslationManagerReadModel,
  getLocalizedText,
  type CampaignShellDetail,
  type ContractImpactReviewOption,
  type ContentRevisionStatus,
  type PublishState,
  type ReviewSeverity,
  type SupportedLocale,
  type TranslationReviewPanel,
} from "../../../../domain";
import { ContractModeBadge, LocaleStatusBadge, PublishStateBadge, ReviewSeverityBadge } from "../../../badges/Badges";

interface I18nContractReadinessProps {
  campaign?: CampaignShellDetail;
  locale: SupportedLocale;
}

const copy = {
  "en-US": {
    aiCannotPublish: "AI generated translation cannot auto-publish before human review.",
    aiDraft: "AI draft",
    blockedHighImpact: "Blocked pending high-impact manual review",
    boundary: "Boundary",
    contractNoExecution: "This review workbench does not distribute rewards, take reward custody, or execute contract transactions.",
    contractImpact: "Contract impact",
    contractReview: "Contract Impact Review",
    defaultMode: "Safe default",
    draftPreview: "Draft preview",
    englishSource: "English source content",
    fallback: "Fallback",
    fallbackLocale: "Fallback locale",
    fallbackWarning: "Chinese draft falls back to English until a project owner completes human review.",
    futurePlanned: "Future / planned",
    generateWithAi: "Generate with AI",
    highImpactBlocker: "High-impact manual review blocker",
    markReviewed: "Mark reviewed",
    nextAction: "Next action",
    notPublished: "Not published",
    published: "Published",
    publishRevision: "Publish revision",
    reviewStatus: "Review status",
    reviewed: "Reviewed",
    rewardBoundary: "Reward boundary",
    rewardDisclaimer: "Reward disclaimer review",
    selected: "Selected",
    socialPost: "Social post",
    sourceLocale: "Source locale",
    supportedLocales: "Supported locales",
    title: "i18n, contract, and review gates",
    translationManager: "Translation Manager",
    useEnglishFallback: "Use English fallback",
    zhDraft: "Chinese AI draft",
  },
  "zh-CN": {
    aiCannotPublish: "AI 生成翻译必须经过人工审核后才能发布。",
    aiDraft: "AI 草稿",
    blockedHighImpact: "等待高影响人工审核，已阻断",
    boundary: "边界",
    contractNoExecution: "这个审核工作台不会发放奖励、托管奖励，也不会执行合约交易。",
    contractImpact: "合约影响",
    contractReview: "合约影响审核",
    defaultMode: "安全默认模式",
    draftPreview: "草稿预览",
    englishSource: "英文源内容",
    fallback: "回退",
    fallbackLocale: "回退语言",
    fallbackWarning: "中文草稿在项目方完成人工审核前回退展示英文。",
    futurePlanned: "未来规划",
    generateWithAi: "用 AI 生成",
    highImpactBlocker: "高影响人工审核阻断",
    markReviewed: "标记已审核",
    nextAction: "下一步",
    notPublished: "未发布",
    published: "已发布",
    publishRevision: "发布版本",
    reviewStatus: "审核状态",
    reviewed: "已审核",
    rewardBoundary: "奖励边界",
    rewardDisclaimer: "奖励声明审核",
    selected: "已选择",
    socialPost: "社交文案",
    sourceLocale: "源语言",
    supportedLocales: "支持语言",
    title: "多语言、合约与审核门禁",
    translationManager: "翻译管理",
    useEnglishFallback: "使用英文回退",
    zhDraft: "中文 AI 草稿",
  },
} satisfies Record<SupportedLocale, Record<string, string>>;

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
  gap: 16,
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
  gap: 12,
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
  alignItems: "center",
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const actionRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const actionButtonStyle: CSSProperties = {
  alignItems: "center",
  background: "#ffffff",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  color: "#0f172a",
  cursor: "pointer",
  display: "inline-flex",
  fontSize: 13,
  fontWeight: 800,
  gap: 6,
  minHeight: 34,
  padding: "0 10px",
};

const statStripStyle: CSSProperties = {
  alignItems: "center",
  background: "#f8fbff",
  border: "1px solid #dbe6f4",
  borderRadius: 8,
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  justifyContent: "space-between",
  padding: 12,
};

const listStyle: CSSProperties = {
  display: "grid",
  gap: 0,
  margin: 0,
  padding: 0,
};

const contractModeState = (option: ContractImpactReviewOption): PublishState =>
  option.publishState;

const revisionStatusLabel = (
  status: ContentRevisionStatus,
  labels: (typeof copy)[SupportedLocale],
) => {
  if (status === "published") {
    return labels.published;
  }

  if (status === "human_reviewed") {
    return labels.reviewed;
  }

  if (status === "ai_draft") {
    return labels.aiDraft;
  }

  return labels.notPublished;
};

const localeStatusFromRevision = (panel: TranslationReviewPanel) => {
  if (panel.published) {
    return "published";
  }

  if (panel.humanReviewed) {
    return "reviewed";
  }

  if (panel.fallbackToEnglish) {
    return "fallback";
  }

  return panel.aiDraft ? "ai_draft" : "missing";
};

const modeGateLabel = (
  option: ContractImpactReviewOption,
  selectedMode: CampaignShellDetail["contractMode"],
  labels: (typeof copy)[SupportedLocale],
) => {
  if (option.mode === "OFF_CHAIN_MVP") {
    return labels.defaultMode;
  }

  if (option.mode === "V2_COMPANION") {
    return labels.futurePlanned;
  }

  if (option.mode === selectedMode) {
    return labels.blockedHighImpact;
  }

  return labels.highImpactBlocker;
};

const reviewActions = (labels: (typeof copy)[SupportedLocale]) => [
  { Icon: Sparkles, label: labels.generateWithAi },
  { Icon: CheckCircle2, label: labels.markReviewed },
  { Icon: Upload, label: labels.publishRevision },
  { Icon: RotateCcw, label: labels.useEnglishFallback },
];

const WorkbenchActionButton = ({
  Icon,
  label,
}: {
  Icon: typeof Sparkles;
  label: string;
}) => (
  <button style={actionButtonStyle} type="button">
    <Icon aria-hidden="true" size={15} strokeWidth={2.4} />
    {label}
  </button>
);

const TranslationPanelCard = ({
  labels,
  locale,
  panel,
}: {
  labels: (typeof copy)[SupportedLocale];
  locale: SupportedLocale;
  panel: TranslationReviewPanel;
}) => (
  <article style={cardStyle}>
    <span style={badgeRowStyle}>
      <PublishStateBadge
        label={`${panel.locale} ${getLocalizedText(panel.label, locale)}`}
        state={panel.publishState}
      />
      <LocaleStatusBadge
        label={`${panel.locale} ${revisionStatusLabel(panel.status, labels)}`}
        status={localeStatusFromRevision(panel)}
      />
      {panel.fallbackToEnglish ? (
        <PublishStateBadge label={labels.fallback} state="warning" />
      ) : null}
    </span>
    <div>
      <p style={labelStyle}>
        {panel.locale === "en-US" ? labels.englishSource : labels.zhDraft}
      </p>
      <p style={valueStyle}>{panel.title}</p>
    </div>
    <p style={bodyStyle}>{panel.description}</p>
    <p style={labelStyle}>{labels.socialPost}</p>
    <p style={bodyStyle}>{panel.socialPost}</p>
    <p style={labelStyle}>{labels.nextAction}</p>
    <p style={bodyStyle}>{getLocalizedText(panel.nextAction, locale)}</p>
  </article>
);

const ContractModeRow = ({
  labels,
  locale,
  option,
  selectedMode,
}: {
  labels: (typeof copy)[SupportedLocale];
  locale: SupportedLocale;
  option: ContractImpactReviewOption;
  selectedMode: CampaignShellDetail["contractMode"];
}) => (
  <li
    style={{
      borderTop: "1px solid #dbe6f4",
      display: "grid",
      gap: 8,
      listStyle: "none",
      padding: "12px 0",
    }}
  >
    <span style={badgeRowStyle}>
      <ContractModeBadge mode={option.mode} label={getLocalizedText(option.label, locale)} />
      {option.mode === selectedMode ? (
        <PublishStateBadge label={labels.selected} state={option.publishState} />
      ) : null}
      <ReviewSeverityBadge
        severity={option.reviewSeverity}
        label={reviewSeverityLabels[locale][option.reviewSeverity]}
      />
      <PublishStateBadge
        label={modeGateLabel(option, selectedMode, labels)}
        state={contractModeState(option)}
      />
    </span>
    <p style={bodyStyle}>{getLocalizedText(option.description, locale)}</p>
    <p style={labelStyle}>{labels.boundary}</p>
    <p style={bodyStyle}>{getLocalizedText(option.boundary, locale)}</p>
    <p style={labelStyle}>{labels.nextAction}</p>
    <p style={bodyStyle}>{getLocalizedText(option.nextAction, locale)}</p>
  </li>
);

export const I18nContractReadiness = ({
  campaign = campaignDetail,
  locale,
}: I18nContractReadinessProps) => {
  const labels = copy[locale];
  const translationManager = createTranslationManagerReadModel(campaign);
  const contractReview = createContractImpactReviewModel(campaign);
  const englishPanel = translationManager.panels.find((panel) => panel.locale === "en-US");
  const chinesePanel = translationManager.panels.find((panel) => panel.locale === "zh-CN");

  return (
    <section aria-label={labels.title} style={sectionStyle}>
      <div style={badgeRowStyle}>
        <h3 style={{ fontSize: 20, lineHeight: 1.2, margin: 0 }}>{labels.title}</h3>
        <PublishStateBadge label={labels.aiDraft} state="warning" />
        <PublishStateBadge label={labels.defaultMode} state="ready" />
      </div>

      <article aria-label={labels.translationManager} style={cardStyle}>
        <div style={statStripStyle}>
          <span style={{ alignItems: "center", display: "inline-flex", gap: 8 }}>
            <Languages aria-hidden="true" size={18} />
            <strong>{labels.translationManager}</strong>
          </span>
          <span style={badgeRowStyle}>
            <PublishStateBadge label={`${labels.sourceLocale}: ${translationManager.sourceLocale}`} state="ready" />
            <PublishStateBadge label={`${labels.fallbackLocale}: ${translationManager.fallbackLocale}`} state="warning" />
          </span>
        </div>
        <div>
          <p style={labelStyle}>{labels.supportedLocales}</p>
          <span style={badgeRowStyle}>
            {translationManager.supportedLocales.map((supportedLocale) => (
              <PublishStateBadge key={supportedLocale} label={supportedLocale} state="ready" />
            ))}
          </span>
        </div>
        <p style={bodyStyle}>{getLocalizedText(translationManager.noAutoPublishNotice, locale)}</p>
        <p style={bodyStyle}>{labels.fallbackWarning}</p>
        <div style={actionRowStyle}>
          {reviewActions(labels).map((action) => (
            <WorkbenchActionButton key={action.label} Icon={action.Icon} label={action.label} />
          ))}
        </div>
      </article>

      <div style={gridStyle}>
        {englishPanel ? (
          <TranslationPanelCard labels={labels} locale={locale} panel={englishPanel} />
        ) : null}
        {chinesePanel ? (
          <TranslationPanelCard labels={labels} locale={locale} panel={chinesePanel} />
        ) : null}
      </div>

      <article aria-label={labels.rewardDisclaimer} style={cardStyle}>
        <p style={labelStyle}>{labels.rewardDisclaimer}</p>
        <div style={gridStyle}>
          {translationManager.rewardDisclaimers.map((row) => (
            <div key={row.locale} style={{ display: "grid", gap: 8 }}>
              <span style={badgeRowStyle}>
                <PublishStateBadge label={row.locale} state={row.publishState} />
                <PublishStateBadge
                  label={row.reviewed ? labels.reviewed : labels.aiDraft}
                  state={row.publishState}
                />
                {row.fallbackToEnglish ? (
                  <PublishStateBadge label={labels.fallback} state="warning" />
                ) : null}
              </span>
              <p style={bodyStyle}>{row.disclaimer}</p>
            </div>
          ))}
        </div>
      </article>

      <article aria-label={labels.contractReview} style={cardStyle}>
        <div style={statStripStyle}>
          <span>
            <p style={labelStyle}>{labels.contractImpact}</p>
            <p style={valueStyle}>{labels.contractReview}</p>
          </span>
          <PublishStateBadge label={labels.defaultMode} state="ready" />
        </div>
        <p style={bodyStyle}>{labels.contractNoExecution}</p>
        <ul style={listStyle}>
          {contractReview.options.map((option) => (
            <ContractModeRow
              key={option.mode}
              labels={labels}
              locale={locale}
              option={option}
              selectedMode={contractReview.selectedMode}
            />
          ))}
        </ul>
        <p style={labelStyle}>{labels.rewardBoundary}</p>
        <p style={bodyStyle}>{getLocalizedText(contractReview.rewardBoundary, locale)}</p>
      </article>
    </section>
  );
};
