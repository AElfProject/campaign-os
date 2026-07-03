import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { CheckCircle2, Languages, RotateCcw, Sparkles, Upload, type LucideIcon } from "lucide-react";
import {
  campaignDetail,
  createContractImpactReviewModel,
  createTranslationManagerReadModel,
  executeI18nReviewAction,
  getLocalizedText,
  type CampaignShellDetail,
  type ContractImpactReviewOption,
  type ContentRevision,
  type ContentRevisionStatus,
  type I18nReviewAction,
  type I18nReviewActionId,
  type I18nReviewActionResult,
  type PublishState,
  type RewardDisclaimerReviewRow,
  type ReviewSeverity,
  type SupportedLocale,
  type TranslationComparisonRow,
  type TranslationLocaleItem,
  type TranslationReviewPanel,
} from "../../../../domain";
import { ContractModeBadge, LocaleStatusBadge, PublishStateBadge, ReviewSeverityBadge } from "../../../badges/Badges";

interface I18nContractReadinessProps {
  campaign?: CampaignShellDetail;
  locale: SupportedLocale;
}

const copy = {
  "en-US": {
    actionResult: "Latest local action",
    actionWorkflow: "Local action workflow",
    aiCannotPublish: "AI generated translation cannot auto-publish before human review.",
    aiDraft: "AI draft",
    available: "Available",
    blockedHighImpact: "Blocked pending high-impact manual review",
    blocksPublish: "Blocks publish",
    boundary: "Boundary",
    completedLocally: "Completed locally",
    compareReview: "Compare with English",
    compareReviewPrompt: "Source and draft comparison",
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
    humanReview: "Human review",
    latestAction: "Latest action",
    localeList: "Locale list",
    localOnlyBoundary: "Local-only boundary",
    markReviewed: "Mark reviewed",
    missing: "Missing",
    noBackendPersistence: "No backend persistence",
    noContractWrite: "No contract write",
    noExportFile: "No export file",
    noLiveAiProvider: "No live AI provider",
    noPublishMutation: "No publish mutation",
    noRewardCustodyDistribution: "No reward custody or distribution",
    noStorageWrite: "No storage write",
    noWalletAction: "No wallet action",
    nextAction: "Next action",
    notPublished: "Not published",
    ownerNextAction: "Owner next action",
    published: "Published",
    publishRevision: "Publish revision",
    readyForPublish: "Ready for publish",
    reviewGateSummary: "Review every localized reward disclaimer before publish.",
    reviewStatus: "Review status",
    reviewed: "Reviewed",
    rewardBoundary: "Reward boundary",
    rewardDisclaimer: "Reward disclaimer review",
    reviewNote: "Review note",
    selected: "Selected",
    socialPost: "Social post",
    sourceColumn: "English source",
    sourceLocale: "Source locale",
    supportedLocales: "Supported locales",
    targetLocale: "Target locale",
    targetColumn: "Translation draft",
    title: "i18n, contract, and review gates",
    translationManager: "Translation Manager",
    translationRole: "Translation",
    useEnglishFallback: "Use English fallback",
    zhDraft: "Chinese AI draft",
  },
  "zh-CN": {
    actionResult: "最新本地动作",
    actionWorkflow: "本地动作工作流",
    aiCannotPublish: "AI 生成翻译必须经过人工审核后才能发布。",
    aiDraft: "AI 草稿",
    available: "可用",
    blockedHighImpact: "等待高影响人工审核，已阻断",
    blocksPublish: "阻断发布",
    boundary: "边界",
    completedLocally: "已在本地完成",
    compareReview: "对照英文",
    compareReviewPrompt: "源内容与草稿对照",
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
    humanReview: "人工审核",
    latestAction: "最新动作",
    localeList: "语言列表",
    localOnlyBoundary: "仅本地边界",
    markReviewed: "标记已审核",
    missing: "缺失",
    noBackendPersistence: "无后端持久化",
    noContractWrite: "无合约写入",
    noExportFile: "无导出文件",
    noLiveAiProvider: "无实时 AI provider",
    noPublishMutation: "无发布变更",
    noRewardCustodyDistribution: "无奖励托管或发奖",
    noStorageWrite: "无 storage 写入",
    noWalletAction: "无钱包动作",
    nextAction: "下一步",
    notPublished: "未发布",
    ownerNextAction: "项目方下一步",
    published: "已发布",
    publishRevision: "发布版本",
    readyForPublish: "可发布",
    reviewGateSummary: "发布前逐一审核每个语言的奖励免责声明。",
    reviewStatus: "审核状态",
    reviewed: "已审核",
    rewardBoundary: "奖励边界",
    rewardDisclaimer: "奖励声明审核",
    reviewNote: "审核说明",
    selected: "已选择",
    socialPost: "社交文案",
    sourceColumn: "英文源内容",
    sourceLocale: "源语言",
    supportedLocales: "支持语言",
    targetLocale: "目标语言",
    targetColumn: "翻译草稿",
    title: "多语言、合约与审核门禁",
    translationManager: "翻译管理",
    translationRole: "翻译",
    useEnglishFallback: "使用英文回退",
    zhDraft: "中文 AI 草稿",
  },
  "zh-TW": {
    actionResult: "最新本地動作",
    actionWorkflow: "本地動作工作流",
    aiCannotPublish: "AI 生成翻譯必須經過人工審核後才能發布。",
    aiDraft: "AI 草稿",
    available: "可用",
    blockedHighImpact: "等待高影響人工審核，已阻斷",
    blocksPublish: "阻斷發布",
    boundary: "邊界",
    completedLocally: "已在本地完成",
    compareReview: "對照英文",
    compareReviewPrompt: "源內容與草稿對照",
    contractNoExecution: "這個審核工作台不會發放獎勵、託管獎勵，也不會執行合約交易。",
    contractImpact: "合約影響",
    contractReview: "合約影響審核",
    defaultMode: "安全預設模式",
    draftPreview: "草稿預覽",
    englishSource: "英文源內容",
    fallback: "回退",
    fallbackLocale: "回退語言",
    fallbackWarning: "繁中目前為 fallback/readiness lane，專案方完成人工審核前回退展示英文或簡中草稿。",
    futurePlanned: "未來規劃",
    generateWithAi: "用 AI 生成",
    highImpactBlocker: "高影響人工審核阻斷",
    humanReview: "人工審核",
    latestAction: "最新動作",
    localeList: "語言列表",
    localOnlyBoundary: "僅本地邊界",
    markReviewed: "標記已審核",
    missing: "缺失",
    noBackendPersistence: "無後端持久化",
    noContractWrite: "無合約寫入",
    noExportFile: "無匯出檔案",
    noLiveAiProvider: "無即時 AI provider",
    noPublishMutation: "無發布變更",
    noRewardCustodyDistribution: "無獎勵託管或發獎",
    noStorageWrite: "無 storage 寫入",
    noWalletAction: "無錢包動作",
    nextAction: "下一步",
    notPublished: "未發布",
    ownerNextAction: "專案方下一步",
    published: "已發布",
    publishRevision: "發布版本",
    readyForPublish: "可發布",
    reviewGateSummary: "發布前逐一審核每個語言的獎勵免責聲明。",
    reviewStatus: "審核狀態",
    reviewed: "已審核",
    rewardBoundary: "獎勵邊界",
    rewardDisclaimer: "獎勵聲明審核",
    reviewNote: "審核說明",
    selected: "已選擇",
    socialPost: "社群文案",
    sourceColumn: "英文源內容",
    sourceLocale: "源語言",
    supportedLocales: "支援語言",
    targetLocale: "目標語言",
    targetColumn: "翻譯草稿",
    title: "多語言、合約與審核門禁",
    translationManager: "翻譯管理",
    translationRole: "翻譯",
    useEnglishFallback: "使用英文回退",
    zhDraft: "繁中 fallback 草稿",
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
  "zh-TW": {
    blocker: "阻斷",
    info: "資訊",
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

const actionStatePillStyle: CSSProperties = {
  background: "#eef6ff",
  border: "1px solid #c7ddf6",
  borderRadius: 999,
  color: "#1d4ed8",
  fontSize: 11,
  fontWeight: 800,
  lineHeight: 1,
  padding: "4px 6px",
  whiteSpace: "nowrap",
};

const disabledActionStatePillStyle: CSSProperties = {
  ...actionStatePillStyle,
  background: "#f1f5f9",
  border: "1px solid #cbd5e1",
  color: "#64748b",
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

const comparisonRowStyle: CSSProperties = {
  borderTop: "1px solid #dbe6f4",
  display: "grid",
  gap: 10,
  gridTemplateColumns: "minmax(120px, 0.8fr) minmax(180px, 1.4fr) minmax(180px, 1.4fr)",
  padding: "12px 0",
};

const localeItemStyle: CSSProperties = {
  background: "#f8fbff",
  border: "1px solid #dbe6f4",
  borderRadius: 8,
  display: "grid",
  gap: 8,
  minWidth: 0,
  padding: 10,
};

const rewardDisclaimerRowStyle: CSSProperties = {
  borderTop: "1px solid #dbe6f4",
  display: "grid",
  gap: 10,
  gridTemplateColumns: "minmax(132px, 0.55fr) minmax(220px, 1fr) minmax(220px, 1fr)",
  padding: "12px 0",
};

const mediaStyle = `
@media (max-width: 720px) {
  [data-translation-compare-row] {
    grid-template-columns: 1fr !important;
  }
  [data-reward-disclaimer-row] {
    grid-template-columns: 1fr !important;
  }
}
`;

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

const localeStatusFromItem = (item: TranslationLocaleItem) => {
  if (item.status === "published") {
    return "published";
  }

  if (item.humanReviewed) {
    return "reviewed";
  }

  if (item.fallbackToEnglish) {
    return "fallback";
  }

  return item.status === "ai_draft" ? "ai_draft" : "missing";
};

const localeStatusFromRewardDisclaimer = (
  row: RewardDisclaimerReviewRow,
) => {
  if (row.reviewState === "reviewed") {
    return "reviewed";
  }

  return row.reviewState;
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

const rewardDisclaimerReviewStateLabel = (
  row: RewardDisclaimerReviewRow,
  labels: (typeof copy)[SupportedLocale],
) => {
  if (row.reviewState === "reviewed") {
    return labels.reviewed;
  }

  if (row.reviewState === "ai_draft") {
    return labels.aiDraft;
  }

  if (row.reviewState === "fallback") {
    return labels.fallback;
  }

  return labels.missing;
};

const reviewActionIcons: Record<I18nReviewActionId, LucideIcon> = {
  compare_with_english: Languages,
  generate_with_ai: Sparkles,
  mark_reviewed: CheckCircle2,
  publish_revision: Upload,
  use_english_fallback: RotateCcw,
};

const noLiveBoundaryItems = (labels: (typeof copy)[SupportedLocale]) => [
  labels.noLiveAiProvider,
  labels.noBackendPersistence,
  labels.noPublishMutation,
  labels.noStorageWrite,
  labels.noContractWrite,
  labels.noWalletAction,
  labels.noExportFile,
  labels.noRewardCustodyDistribution,
];

const reviewActionStateLabel = (
  state: I18nReviewAction["state"],
  labels: (typeof copy)[SupportedLocale],
) => {
  if (state === "blocked") {
    return labels.blocksPublish;
  }

  if (state === "completed") {
    return labels.completedLocally;
  }

  return labels.available;
};

const cloneContentRevisions = (revisions: readonly ContentRevision[]) =>
  revisions.map((revision) => ({ ...revision }));

const WorkbenchActionButton = ({
  Icon,
  action,
  labels,
  locale,
  onRun,
}: {
  Icon: LucideIcon;
  action: I18nReviewAction;
  labels: (typeof copy)[SupportedLocale];
  locale: SupportedLocale;
  onRun: (actionId: I18nReviewActionId) => void;
}) => (
  <button
    aria-disabled={action.state === "blocked"}
    aria-label={getLocalizedText(action.label, locale)}
    disabled={action.state === "blocked"}
    onClick={() => onRun(action.id)}
    style={{
      ...actionButtonStyle,
      background: action.state === "completed" ? "#f8fbff" : actionButtonStyle.background,
      color: action.state === "blocked" ? "#64748b" : actionButtonStyle.color,
      cursor: action.state === "blocked" ? "not-allowed" : "pointer",
      opacity: action.state === "blocked" ? 0.72 : 1,
    }}
    title={getLocalizedText(action.blockedReason ?? action.nextAction, locale)}
    type="button"
  >
    <Icon aria-hidden="true" size={15} strokeWidth={2.4} />
    {getLocalizedText(action.label, locale)}
    <span
      aria-hidden="true"
      style={action.state === "blocked" ? disabledActionStatePillStyle : actionStatePillStyle}
    >
      {reviewActionStateLabel(action.state, labels)}
    </span>
  </button>
);

const ActionResultPanel = ({
  labels,
  locale,
  result,
}: {
  labels: (typeof copy)[SupportedLocale];
  locale: SupportedLocale;
  result: I18nReviewActionResult;
}) => (
  <article aria-label={labels.actionResult} style={cardStyle}>
    <span style={badgeRowStyle}>
      <PublishStateBadge
        label={result.ok ? labels.completedLocally : labels.blocksPublish}
        state={result.ok ? "ready" : "blocker"}
      />
      <PublishStateBadge label={`${labels.targetLocale}: ${result.targetLocale}`} state="ready" />
    </span>
    <div>
      <p style={labelStyle}>{labels.latestAction}</p>
      <p style={valueStyle}>{getLocalizedText(result.action.label, locale)}</p>
    </div>
    <div>
      <p style={labelStyle}>{labels.nextAction}</p>
      <p style={bodyStyle}>{getLocalizedText(result.nextAction, locale)}</p>
    </div>
    <div>
      <p style={labelStyle}>{labels.localOnlyBoundary}</p>
      <p style={bodyStyle}>{getLocalizedText(result.boundary, locale)}</p>
    </div>
  </article>
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

const TranslationLocaleList = ({
  labels,
  locale,
  localeItems,
}: {
  labels: (typeof copy)[SupportedLocale];
  locale: SupportedLocale;
  localeItems: TranslationLocaleItem[];
}) => (
  <div>
    <p style={labelStyle}>{labels.localeList}</p>
    <div style={gridStyle}>
      {localeItems.map((item) => (
        <div key={item.locale} style={localeItemStyle}>
          <span style={badgeRowStyle}>
            <PublishStateBadge label={item.locale} state={item.publishState} />
            <PublishStateBadge
              label={item.role === "source" ? labels.sourceLocale : labels.translationRole}
              state={item.role === "source" ? "ready" : item.publishState}
            />
            {item.fallbackToEnglish ? (
              <PublishStateBadge label={labels.fallback} state="warning" />
            ) : null}
            <LocaleStatusBadge
              label={revisionStatusLabel(item.status, labels)}
              status={localeStatusFromItem(item)}
            />
          </span>
          <p style={bodyStyle}>{`${item.locale} · ${getLocalizedText(item.label, locale)}`}</p>
        </div>
      ))}
    </div>
  </div>
);

const TranslationCompareConsole = ({
  labels,
  locale,
  rows,
  reviewPrompt,
}: {
  labels: (typeof copy)[SupportedLocale];
  locale: SupportedLocale;
  rows: TranslationComparisonRow[];
  reviewPrompt: string;
}) => (
  <article aria-label={labels.compareReviewPrompt} style={cardStyle}>
    <div style={statStripStyle}>
      <span>
        <p style={labelStyle}>{labels.compareReviewPrompt}</p>
        <p style={valueStyle}>{labels.compareReview}</p>
      </span>
      <PublishStateBadge label={labels.aiDraft} state="warning" />
    </div>
    <p style={bodyStyle}>{reviewPrompt}</p>
    <div style={listStyle}>
      {rows.map((row) => (
        <div data-translation-compare-row key={row.id} style={comparisonRowStyle}>
          <div>
            <p style={labelStyle}>{getLocalizedText(row.label, locale)}</p>
            <span style={badgeRowStyle}>
              <LocaleStatusBadge
                label={revisionStatusLabel(row.targetStatus, labels)}
                status={row.fallbackToEnglish ? "fallback" : row.humanReviewed ? "reviewed" : "ai_draft"}
              />
              {row.fallbackToEnglish ? (
                <PublishStateBadge label={labels.fallback} state="warning" />
              ) : null}
            </span>
          </div>
          <div>
            <p style={labelStyle}>{`${labels.sourceColumn} · ${row.sourceLocale}`}</p>
            <p style={bodyStyle}>{row.sourceValue}</p>
          </div>
          <div>
            <p style={labelStyle}>{`${labels.targetColumn} · ${row.targetLocale}`}</p>
            <p style={bodyStyle}>{row.targetValue}</p>
            <p style={labelStyle}>{labels.reviewNote}</p>
            <p style={bodyStyle}>{getLocalizedText(row.reviewNote, locale)}</p>
          </div>
        </div>
      ))}
    </div>
  </article>
);

const RewardDisclaimerReviewGate = ({
  labels,
  locale,
  rows,
}: {
  labels: (typeof copy)[SupportedLocale];
  locale: SupportedLocale;
  rows: RewardDisclaimerReviewRow[];
}) => {
  const blocksPublish = rows.some((row) => row.blocksPublish);
  const boundary = rows[0]?.boundary;

  return (
    <article aria-label={labels.rewardDisclaimer} style={cardStyle}>
      <div style={statStripStyle}>
        <span>
          <p style={labelStyle}>{labels.rewardDisclaimer}</p>
          <p style={valueStyle}>{labels.reviewGateSummary}</p>
        </span>
        <PublishStateBadge
          label={blocksPublish ? labels.blocksPublish : labels.readyForPublish}
          state={blocksPublish ? "blocker" : "ready"}
        />
      </div>
      <div style={listStyle}>
        {rows.map((row) => (
          <div data-reward-disclaimer-row key={row.locale} style={rewardDisclaimerRowStyle}>
            <div>
              <span style={badgeRowStyle}>
                <PublishStateBadge label={row.locale} state={row.publishState} />
                <LocaleStatusBadge
                  label={rewardDisclaimerReviewStateLabel(row, labels)}
                  status={localeStatusFromRewardDisclaimer(row)}
                />
                {row.fallbackToEnglish ? (
                  <PublishStateBadge label={labels.fallback} state="warning" />
                ) : null}
              </span>
            </div>
            <div>
              <p style={labelStyle}>{row.blocksPublish ? labels.blocksPublish : labels.readyForPublish}</p>
              <p style={bodyStyle}>{row.disclaimer}</p>
            </div>
            <div>
              <p style={labelStyle}>{labels.reviewStatus}</p>
              <p style={bodyStyle}>{getLocalizedText(row.blockerReason, locale)}</p>
              <p style={labelStyle}>{labels.ownerNextAction}</p>
              <p style={bodyStyle}>{getLocalizedText(row.nextAction, locale)}</p>
            </div>
          </div>
        ))}
      </div>
      {boundary ? (
        <>
          <p style={labelStyle}>{labels.rewardBoundary}</p>
          <p style={bodyStyle}>{getLocalizedText(boundary, locale)}</p>
        </>
      ) : null}
    </article>
  );
};

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
  const targetLocale: Exclude<SupportedLocale, "en-US"> = "zh-CN";
  const [contentRevisions, setContentRevisions] = useState(() => cloneContentRevisions(campaign.contentRevisions));
  const localCampaign = useMemo(
    () => ({
      ...campaign,
      contentRevisions,
    }),
    [campaign, contentRevisions],
  );
  const translationManager = createTranslationManagerReadModel(localCampaign);
  const contractReview = createContractImpactReviewModel(campaign);
  const englishPanel = translationManager.panels.find((panel) => panel.locale === "en-US");
  const chinesePanel = translationManager.panels.find((panel) => panel.locale === targetLocale);
  const [lastActionResult, setLastActionResult] = useState<I18nReviewActionResult>(() =>
    executeI18nReviewAction(localCampaign, {
      actionId: "compare_with_english",
      reviewer: "project_owner",
      targetLocale,
    }),
  );
  const actionReadiness = useMemo(
    () =>
      executeI18nReviewAction(localCampaign, {
        actionId: "compare_with_english",
        reviewer: "project_owner",
        targetLocale,
      }),
    [localCampaign],
  );

  useEffect(() => {
    setContentRevisions(cloneContentRevisions(campaign.contentRevisions));
  }, [campaign]);

  const handleRunAction = (actionId: I18nReviewActionId) => {
    const result = executeI18nReviewAction(localCampaign, {
      actionId,
      reviewer: "project_owner",
      targetLocale,
    });

    if (result.ok) {
      setContentRevisions(result.updatedRevisions);
    }

    setLastActionResult(result);
  };

  return (
    <section aria-label={labels.title} style={sectionStyle}>
      <style>{mediaStyle}</style>
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
        <TranslationLocaleList
          labels={labels}
          locale={locale}
          localeItems={translationManager.localeItems}
        />
        <p style={bodyStyle}>{getLocalizedText(translationManager.noAutoPublishNotice, locale)}</p>
        <p style={bodyStyle}>{labels.fallbackWarning}</p>
        <div>
          <p style={labelStyle}>{labels.localOnlyBoundary}</p>
          <p style={bodyStyle}>{getLocalizedText(actionReadiness.boundary, locale)}</p>
        </div>
        <span style={badgeRowStyle}>
          {noLiveBoundaryItems(labels).map((item) => (
            <PublishStateBadge key={item} label={item} state="ready" />
          ))}
        </span>
        <div style={actionRowStyle}>
          {actionReadiness.actions.map((action) => (
            <WorkbenchActionButton
              key={action.id}
              Icon={reviewActionIcons[action.id]}
              action={action}
              labels={labels}
              locale={locale}
              onRun={handleRunAction}
            />
          ))}
        </div>
      </article>

      <ActionResultPanel labels={labels} locale={locale} result={lastActionResult} />

      <div style={gridStyle}>
        {englishPanel ? (
          <TranslationPanelCard labels={labels} locale={locale} panel={englishPanel} />
        ) : null}
        {chinesePanel ? (
          <TranslationPanelCard labels={labels} locale={locale} panel={chinesePanel} />
        ) : null}
      </div>

      <TranslationCompareConsole
        labels={labels}
        locale={locale}
        reviewPrompt={getLocalizedText(translationManager.compareReviewPrompt, locale)}
        rows={translationManager.comparisonRows}
      />

      <RewardDisclaimerReviewGate
        labels={labels}
        locale={locale}
        rows={translationManager.rewardDisclaimers}
      />

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
