import { useRef, useState, type CSSProperties, type RefObject } from "react";
import {
  campaignDetail,
  createCampaignDiscoveryReadModel,
  createCampaignMarketplaceReadiness,
  createMobileTelegramMiniAppHubReadiness,
  createCampaignShareCardReadiness,
  createCampaignOsLocalService,
  createEcosystemNextActionReadModel,
  createEligibilityCheckerReadModel,
  createLeaderboardReadModel,
  createParticipantWorkspaceReadModel,
  createParticipationReadModel,
  createPortfolioCampaignHistoryReadModel,
  createUserWinnersExportStatusReadModel,
  createWalletConnectionDiagnostics,
  deriveTaskVerificationAction,
  getWalletCompatibilityLabel,
  getWalletBadgeLabel,
  getLocalizedText,
  walletOptions,
  type CampaignShellDetail,
  type CampaignStatus,
  type CampaignDiscoveryConsumerSurface,
  type CampaignDiscoveryCtaKind,
  type CampaignMarketplaceConsumerSurfaceState,
  type CampaignMarketplaceReadinessLane,
  type CampaignDiscoveryItem,
  type EligibilityStatus,
  type ExecuteTaskVerificationActionResponse,
  type LeaderboardModeId,
  type EcosystemRecommendationPriority,
  type EcosystemRecommendationStatus,
  type LocalizedText,
  type LocalServiceResult,
  type LocaleStatus,
  type MobileTelegramMiniAppHubReadinessLane,
  type MobileTelegramMiniAppHubReadinessState,
  type MobileTelegramMiniAppHubServiceState,
  type NormalizedWalletSession,
  type ParticipantSnapshot,
  type ParticipantWorkspaceTaskRow,
  type PublishState,
  type SupportedLocale,
  type TaskVerificationActionKind,
  type TaskVerificationProofType,
  type TaskVerificationStatus,
  type UserWinnersExportStatus,
  type WalletDiagnosticState,
} from "../../../domain";
import {
  ContractModeBadge,
  LocaleStatusBadge,
  PublishStateBadge,
  WalletBadge,
  WalletCompatibilityBadge,
  WalletVerificationBadge,
} from "../../badges/Badges";
import { WalletOptionCards } from "../../wallet/WalletOptionCards";
import { WalletConnectModal } from "../../wallet/WalletConnectModal";
import { userAppCopy } from "./copy";

type BusinessContentLocale = Exclude<SupportedLocale, "ja-JP" | "ko-KR" | "vi-VN">;

interface UserAppPanelProps {
  campaign?: CampaignShellDetail;
  locale: BusinessContentLocale;
  participant?: ParticipantSnapshot;
  shareLocale?: SupportedLocale;
  walletModalLocale?: BusinessContentLocale;
}

const panelStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe6f4",
  borderRadius: 8,
  display: "grid",
  gap: 16,
  maxWidth: "100%",
  minWidth: 0,
  padding: 18,
  width: "100%",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
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
  maxWidth: "100%",
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
  fontSize: 24,
  fontWeight: 900,
  lineHeight: 1.1,
  margin: 0,
};

const buttonStyle: CSSProperties = {
  background: "#1c64f2",
  border: "1px solid #1c64f2",
  borderRadius: 8,
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 800,
  minHeight: 40,
  padding: "0 14px",
  width: "fit-content",
};

const secondaryButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: "#ffffff",
  color: "#1c64f2",
};

const compactActionButtonStyle: CSSProperties = {
  ...buttonStyle,
  maxWidth: "100%",
  minWidth: 112,
  overflowWrap: "anywhere",
  whiteSpace: "normal",
};

const disabledActionButtonStyle: CSSProperties = {
  ...compactActionButtonStyle,
  background: "#e2e8f0",
  borderColor: "#cbd5e1",
  color: "#475569",
  cursor: "not-allowed",
};

const activeChoiceButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: "#071426",
  border: "1px solid #071426",
};

const localNavStyle: CSSProperties = {
  alignItems: "center",
  borderBottom: "1px solid #dbe6f4",
  borderTop: "1px solid #dbe6f4",
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  padding: "10px 0",
};

const localNavButtonStyle: CSSProperties = {
  ...secondaryButtonStyle,
  flex: "1 1 128px",
  justifyContent: "center",
  maxWidth: "100%",
  minWidth: 0,
  overflowWrap: "anywhere",
  whiteSpace: "normal",
};

const activeLocalNavButtonStyle: CSSProperties = {
  ...localNavButtonStyle,
  background: "#071426",
  border: "1px solid #071426",
  color: "#ffffff",
};

const listStyle: CSSProperties = {
  display: "grid",
  gap: 10,
  margin: 0,
  padding: 0,
};

const listItemStyle: CSSProperties = {
  ...cardStyle,
  listStyle: "none",
};

const metricGridStyle: CSSProperties = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(132px, 1fr))",
};

const chipListStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  minWidth: 0,
};

const chipStyle: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #cbd5e1",
  borderRadius: 999,
  color: "#334155",
  fontSize: 12,
  fontWeight: 800,
  lineHeight: 1.2,
  maxWidth: "100%",
  overflowWrap: "anywhere",
  padding: "6px 8px",
};

const urlTextStyle: CSSProperties = {
  color: "#071426",
  fontSize: 13,
  fontWeight: 800,
  lineHeight: 1.4,
  margin: 0,
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const feedGridStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))",
};

const mobileHubGridStyle: CSSProperties = {
  alignItems: "stretch",
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))",
};

const phoneShellStyle: CSSProperties = {
  background: "#071426",
  border: "1px solid #1e293b",
  borderRadius: 28,
  boxShadow: "0 18px 38px rgba(7, 20, 38, 0.18)",
  color: "#ffffff",
  display: "grid",
  gap: 12,
  justifySelf: "center",
  maxWidth: 390,
  padding: 14,
  width: "100%",
};

const phoneScreenStyle: CSSProperties = {
  background: "#f8fbff",
  borderRadius: 18,
  color: "#071426",
  display: "grid",
  gap: 12,
  minHeight: 520,
  overflow: "hidden",
  padding: 14,
};

const progressTrackStyle: CSSProperties = {
  background: "#dbe6f4",
  borderRadius: 999,
  height: 8,
  overflow: "hidden",
  width: "100%",
};

const tableStyle: CSSProperties = {
  borderCollapse: "collapse",
  minWidth: 940,
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

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "short" }).format(new Date(iso));

const daysUntil = (iso: string) => {
  const msPerDay = 24 * 60 * 60 * 1000;
  const now = Date.UTC(2026, 5, 27);
  const end = new Date(iso).getTime();

  return Math.max(0, Math.ceil((end - now) / msPerDay));
};

const contractModeLabel = (mode: CampaignShellDetail["contractMode"]) => mode.replace(/_/g, " ");

const publishStateBadgeState = (state: PublishState) =>
  state === "blocker" ? "blocker" : state === "warning" ? "warning" : "ready";

const formatSource = (value: string) => value.replace(/_/g, " ");

const localCampaignService = createCampaignOsLocalService();

type LocalTaskActionResult = LocalServiceResult<ExecuteTaskVerificationActionResponse>;

type UserAppLocalSection = "campaigns" | "points" | "referrals" | "eligibility";

const userAppLocalSectionOrder: UserAppLocalSection[] = [
  "campaigns",
  "points",
  "referrals",
  "eligibility",
];

const taskActionLabel = (
  kind: TaskVerificationActionKind,
  copy: typeof userAppCopy["en-US"],
) => {
  const labels: Record<TaskVerificationActionKind, string> = {
    completed: copy.alreadyVerifiedAction,
    retry: copy.retryVerificationAction,
    submit_proof: copy.submitProofAction,
    verify: copy.verifyTaskAction,
    view_review: copy.viewReviewAction,
  };

  return labels[kind];
};

const renderChips = (items: readonly string[], emptyLabel: string) => (
  <span style={chipListStyle}>
    {items.length > 0 ? (
      items.map((item) => (
        <span key={item} style={chipStyle}>
          {item}
        </span>
      ))
    ) : (
      <span style={{ ...chipStyle, color: "#64748b" }}>{emptyLabel}</span>
    )}
  </span>
);

const formatTimestamp = (iso?: string) =>
  iso
    ? new Intl.DateTimeFormat("en-US", {
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
      }).format(new Date(iso))
    : "-";

const localeStatusLabel = (status: LocaleStatus, locale: BusinessContentLocale) => {
  const labels = {
    "en-US": {
      ai_draft: "AI draft",
      fallback: "fallback",
      missing: "missing",
      published: "published",
      ready: "ready",
      reviewed: "reviewed",
    },
    "zh-CN": {
      ai_draft: "AI 草稿",
      fallback: "回退",
      missing: "缺失",
      published: "已发布",
      ready: "就绪",
      reviewed: "已审核",
    },
    "zh-TW": {
      ai_draft: "AI 草稿",
      fallback: "回退",
      missing: "缺失",
      published: "已發布",
      ready: "就緒",
      reviewed: "已審核",
    },
  } satisfies Record<BusinessContentLocale, Record<LocaleStatus, string>>;

  return labels[locale][status];
};

const eligibilityLabel = (
  status: EligibilityStatus,
  copy: typeof userAppCopy["en-US"],
) => {
  const labels: Record<EligibilityStatus, string> = {
    eligible: copy.eligible,
    ended: copy.ended,
    not_eligible: copy.notEligible,
    pending: copy.pending,
    risk_flagged: copy.riskFlagged,
  };

  return labels[status];
};

const eligibilityBadgeState = (status: EligibilityStatus) => {
  if (status === "eligible") {
    return "ready";
  }

  if (status === "risk_flagged" || status === "not_eligible") {
    return "warning";
  }

  return "blocker";
};

const taskStatusLabel = (
  status: TaskVerificationStatus,
  copy: typeof userAppCopy["en-US"],
) => {
  const labels: Record<TaskVerificationStatus, string> = {
    completed: copy.completed,
    failed: copy.failed,
    manual_review: copy.manualReview,
    pending: copy.pending,
    ready: copy.ready,
  };

  return labels[status];
};

const taskBadgeState = (status: TaskVerificationStatus) => {
  if (status === "completed") {
    return "ready";
  }

  if (status === "pending" || status === "manual_review") {
    return "warning";
  }

  return status === "failed" ? "blocker" : "warning";
};

const winnersExportBadgeState = (status: UserWinnersExportStatus) => {
  if (status === "ready") {
    return "ready";
  }

  if (status === "review_required" || status === "pending") {
    return "warning";
  }

  return "blocker";
};

const diagnosticBadgeState = (state: WalletDiagnosticState) => state;

const ecosystemStatusLabel = (
  status: EcosystemRecommendationStatus,
  copy: typeof userAppCopy["en-US"],
) => {
  const labels: Record<EcosystemRecommendationStatus, string> = {
    completed: copy.ecosystemCompleted,
    locked: copy.ecosystemLocked,
    ready: copy.ecosystemReady,
    review: copy.ecosystemReview,
  };

  return labels[status];
};

const ecosystemStatusState = (status: EcosystemRecommendationStatus) => {
  if (status === "locked") {
    return "blocker";
  }

  if (status === "review") {
    return "warning";
  }

  return "ready";
};

const ecosystemPriorityLabel = (
  priority: EcosystemRecommendationPriority,
  copy: typeof userAppCopy["en-US"],
) => {
  const labels: Record<EcosystemRecommendationPriority, string> = {
    primary: copy.ecosystemPrimary,
    secondary: copy.ecosystemSecondary,
    tertiary: copy.ecosystemTertiary,
  };

  return labels[priority];
};

const ecosystemSignalState = (tone: "ready" | "warning" | "blocker") =>
  tone === "blocker" ? "blocker" : tone === "warning" ? "warning" : "ready";

const ecosystemServiceStateLabel = (
  state: "seeded_preview" | "not_connected",
  copy: typeof userAppCopy["en-US"],
) => (state === "seeded_preview" ? copy.ecosystemSeededPreview : copy.ecosystemNotConnected);

const mobileHubReadinessStateLabel = (
  state: MobileTelegramMiniAppHubReadinessState,
  copy: typeof userAppCopy["en-US"],
) => {
  const labels: Record<MobileTelegramMiniAppHubReadinessState, string> = {
    blocked: copy.mobileHubStateBlocked,
    not_connected: copy.mobileHubStateNotConnected,
    ready: copy.mobileHubStateReady,
    review_required: copy.mobileHubStateReviewRequired,
  };

  return labels[state];
};

const mobileHubReadinessBadgeState = (
  state: MobileTelegramMiniAppHubReadinessState,
) => {
  if (state === "blocked" || state === "not_connected") {
    return "blocker";
  }

  if (state === "review_required") {
    return "warning";
  }

  return "ready";
};

const mobileHubServiceStateLabel = (
  state: MobileTelegramMiniAppHubServiceState,
  copy: typeof userAppCopy["en-US"],
) => {
  const labels: Record<MobileTelegramMiniAppHubServiceState, string> = {
    local_only: copy.mobileHubServiceLocalOnly,
    not_connected: copy.mobileHubServiceNotConnected,
    review_required: copy.mobileHubServiceReviewRequired,
    seeded_preview: copy.mobileHubServiceSeededPreview,
  };

  return labels[state];
};

const mobileHubServiceBadgeState = (
  state: MobileTelegramMiniAppHubServiceState,
) => state === "not_connected"
  ? "blocker"
  : state === "review_required"
    ? "warning"
    : "ready";

const mobileHubAiGuideHeadline = (
  urgency: Exclude<MobileTelegramMiniAppHubReadinessState, "not_connected">,
  copy: typeof userAppCopy["en-US"],
) => {
  if (urgency === "blocked") {
    return copy.mobileHubGuideBlocked;
  }

  if (urgency === "review_required") {
    return copy.mobileHubGuideReview;
  }

  return copy.mobileHubGuideReady;
};

const portfolioHistoryStateLabel = (
  state: ReturnType<typeof createPortfolioCampaignHistoryReadModel>["rows"][number]["portfolioState"],
  copy: typeof userAppCopy["en-US"],
) => {
  const labels = {
    archived: copy.ended,
    blocked: copy.ecosystemLocked,
    in_progress: copy.pending,
    ready: copy.ready,
    review_required: copy.reviewRequired,
    scheduled: copy.comingSoon,
  };

  return labels[state];
};

const portfolioHistoryBadgeState = (
  state: ReturnType<typeof createPortfolioCampaignHistoryReadModel>["rows"][number]["portfolioState"],
) => {
  if (state === "ready") {
    return "ready";
  }

  if (state === "blocked") {
    return "blocker";
  }

  return "warning";
};

const marketplaceLaneState = (lane: CampaignMarketplaceReadinessLane) => {
  if (lane === "blocked") {
    return "blocker";
  }

  if (lane === "review_required" || lane === "local_preview") {
    return "warning";
  }

  return "ready";
};

const marketplaceSurfaceStateLabel = (
  state: CampaignMarketplaceConsumerSurfaceState,
  copy: typeof userAppCopy["en-US"],
) => {
  const labels: Record<CampaignMarketplaceConsumerSurfaceState, string> = {
    not_configured: copy.marketplaceSurfaceNotConfigured,
    ready: copy.marketplaceSurfaceReady,
    review_required: copy.marketplaceSurfaceReview,
  };

  return labels[state];
};

const marketplaceSurfaceBadgeState = (state: CampaignMarketplaceConsumerSurfaceState) =>
  state === "not_configured"
    ? "blocker"
    : state === "review_required"
      ? "warning"
      : "ready";

const marketplaceSurfaceLabel = (
  surface: CampaignDiscoveryConsumerSurface,
  copy: typeof userAppCopy["en-US"],
) => {
  const labels: Record<CampaignDiscoveryConsumerSurface, string> = {
    app_hub: copy.marketplaceSurfaceAppHub,
    forecast: copy.marketplaceSurfaceForecast,
    portfolio: copy.marketplaceSurfacePortfolio,
    user_app: copy.marketplaceSurfaceUserApp,
  };

  return labels[surface];
};

const campaignStatusLabel = (status: CampaignStatus, copy: typeof userAppCopy["en-US"]) => {
  const labels: Record<CampaignStatus, string> = {
    ai_draft: "AI Draft",
    human_review: "Human Review",
    draft: "Draft",
    scheduled: copy.comingSoon,
    live: copy.active,
    paused: "Paused",
    ended: copy.ended,
    exported: "Exported",
    archived: "Archived",
  };

  return labels[status];
};

const campaignStatusState = (status: CampaignStatus) => {
  if (status === "live") {
    return "ready";
  }

  if (status === "scheduled" || status === "paused" || status === "ai_draft" || status === "human_review") {
    return "warning";
  }

  return "blocker";
};

const campaignStatusIsPreLaunchReview = (status: CampaignStatus) =>
  status === "ai_draft" || status === "human_review";

const sessionForParticipant = (
  campaign: CampaignShellDetail,
  participant: ParticipantSnapshot,
) =>
  campaign.walletSessions.find(
    (session) =>
      session.sessionId === participant.walletSessionId ||
      session.address === participant.walletAddress,
  ) ?? campaign.walletSessions[0];

const campaignDiscoveryCtaKey = (
  kind: CampaignDiscoveryCtaKind,
): keyof Pick<typeof userAppCopy["en-US"], "checkEligibility" | "continueTasks" | "start"> =>
  kind === "continue_tasks" ? "continueTasks" : kind === "start" ? "start" : "checkEligibility";

const WalletSessionCard = ({
  copy,
  locale,
  session,
}: {
  copy: typeof userAppCopy["en-US"];
  locale: BusinessContentLocale;
  session: NormalizedWalletSession;
}) => (
  <article style={cardStyle}>
    <div style={rowStyle}>
      <div style={{ display: "grid", gap: 4 }}>
        <strong>
          {copy.walletSession}: {session.walletName}
        </strong>
        <span style={{ color: "#475569", fontSize: 13 }}>
          {copy.walletAddress}: {session.displayAddress}
        </span>
      </div>
      <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <WalletBadge accountType={session.accountType} walletSource={session.walletSource} />
        <WalletVerificationBadge
          label={getLocalizedText(session.statusMessage, locale)}
          status={session.verificationStatus}
        />
      </span>
    </div>
    <dl style={{ display: "grid", gap: 6, margin: 0 }}>
      {[
        [copy.walletSource, formatSource(session.walletSource)],
        [copy.walletChain, `${session.chainId} / ${session.network}`],
        [copy.walletSignature, formatSource(session.signatureStatus)],
        [copy.walletLastSeen, formatTimestamp(session.lastSeenAt)],
      ].map(([label, value]) => (
        <div key={label} style={rowStyle}>
          <dt style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>{label}</dt>
          <dd style={{ color: "#071426", fontSize: 13, fontWeight: 700, margin: 0 }}>
            {value}
          </dd>
        </div>
      ))}
    </dl>
    <p style={{ color: session.walletTypeVerified ? "#166534" : "#92400e", fontSize: 13, fontWeight: 800, margin: 0 }}>
      {getLocalizedText(session.statusMessage, locale)}
    </p>
    <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
      {session.userAction ? getLocalizedText(session.userAction, locale) : copy.seededWalletBoundary}
    </p>
  </article>
);

const CampaignFeedCard = ({
  copy,
  item,
  locale,
}: {
  copy: typeof userAppCopy["en-US"];
  item: CampaignDiscoveryItem;
  locale: BusinessContentLocale;
}) => (
  <article style={{ ...cardStyle, alignContent: "space-between" }}>
    <div style={rowStyle}>
      <div style={{ display: "grid", gap: 4 }}>
        <p style={labelStyle}>{getLocalizedText(item.campaignType, locale)}</p>
        <strong style={{ color: "#071426", fontSize: 19 }}>
          {getLocalizedText(item.title, locale)}
        </strong>
      </div>
      <PublishStateBadge
        label={campaignStatusLabel(item.status, copy)}
        state={campaignStatusState(item.status)}
      />
    </div>
    <div style={metricGridStyle}>
      <div>
        <p style={labelStyle}>{copy.pointsAvailable}</p>
        <strong style={{ color: "#071426", fontSize: 20 }}>{item.points}</strong>
      </div>
      <div>
        <p style={labelStyle}>{copy.timeWindow}</p>
        <strong style={{ color: "#071426", fontSize: 20 }}>
          {daysUntil(item.endTime)} {copy.daysLeft}
        </strong>
      </div>
    </div>
    <ol style={{ display: "grid", gap: 6, margin: 0, paddingInlineStart: 18 }}>
      {item.coreTasks.map((task) => (
        <li key={task.taskId} style={{ color: "#475569", fontSize: 13 }}>
          {getLocalizedText(task.title, locale)}
        </li>
      ))}
    </ol>
    {campaignStatusIsPreLaunchReview(item.status) ? (
      <button disabled style={disabledActionButtonStyle} type="button">
        {copy.reviewRequired}
      </button>
    ) : (
      <button
        style={{
          ...buttonStyle,
          background:
            item.status === "ended" || item.status === "archived"
              ? "#ffffff"
              : buttonStyle.background,
          color:
            item.status === "ended" || item.status === "archived"
              ? "#1c64f2"
              : buttonStyle.color,
        }}
        type="button"
      >
        {copy[campaignDiscoveryCtaKey(item.cta.kind)]}
      </button>
    )}
  </article>
);

const WorkspaceTaskList = ({
  copy,
  emptyLabel,
  locale,
  tasks,
}: {
  copy: typeof userAppCopy["en-US"];
  emptyLabel: string;
  locale: BusinessContentLocale;
  tasks: ParticipantWorkspaceTaskRow[];
}) => (
  <ul style={listStyle}>
    {tasks.length > 0 ? (
      tasks.map((task) => (
        <li key={task.taskId} style={listItemStyle}>
          <div style={rowStyle}>
            <strong>{getLocalizedText(task.title, locale)}</strong>
            <PublishStateBadge
              label={taskStatusLabel(task.status, copy)}
              state={taskBadgeState(task.status)}
            />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <span style={chipStyle}>
              {copy.pointsAwarded}: {task.pointsAwarded}/{task.pointsAvailable}
            </span>
            <span style={chipStyle}>
              {copy.evidenceSource}: {formatSource(task.evidenceSource)}
            </span>
            {task.missingRequired ? <span style={chipStyle}>{copy.missingTasks}</span> : null}
            {task.riskFlags.length > 0 ? (
              <span style={chipStyle}>
                {copy.riskFlags}: {task.riskFlags.join(", ")}
              </span>
            ) : null}
          </div>
          <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
            {copy.nextAction}: {getLocalizedText(task.nextAction, locale)}
          </p>
        </li>
      ))
    ) : (
      <li style={listItemStyle}>
        <strong>{emptyLabel}</strong>
      </li>
    )}
  </ul>
);

const EcosystemRecommendationCard = ({
  copy,
  locale,
  recommendation,
}: {
  copy: typeof userAppCopy["en-US"];
  locale: BusinessContentLocale;
  recommendation: ReturnType<typeof createEcosystemNextActionReadModel>["recommendations"][number];
}) => (
  <article style={{ ...cardStyle, alignContent: "space-between" }}>
    <div style={rowStyle}>
      <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
        <p style={labelStyle}>{getLocalizedText(recommendation.product.label, locale)}</p>
        <strong style={{ color: "#071426", fontSize: 18, lineHeight: 1.2 }}>
          {getLocalizedText(recommendation.title, locale)}
        </strong>
      </div>
      <span style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end" }}>
        <PublishStateBadge
          label={ecosystemPriorityLabel(recommendation.priority, copy)}
          state="ready"
        />
        <PublishStateBadge
          label={ecosystemStatusLabel(recommendation.status, copy)}
          state={ecosystemStatusState(recommendation.status)}
        />
      </span>
    </div>
    <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
      {getLocalizedText(recommendation.reason, locale)}
    </p>
    {recommendation.gatingReason ? (
      <p style={{ color: "#92400e", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
        {getLocalizedText(recommendation.gatingReason, locale)}
      </p>
    ) : null}
    <div style={{ display: "grid", gap: 8 }}>
      {recommendation.relatedSignals.map((signal) => (
        <div key={signal.id} style={rowStyle}>
          <span style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>
            {getLocalizedText(signal.label, locale)}
          </span>
          <PublishStateBadge
            label={getLocalizedText(signal.value, locale)}
            state={ecosystemSignalState(signal.tone)}
          />
        </div>
      ))}
    </div>
    <div style={rowStyle}>
      <span style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>
        {copy.ecosystemServiceState}: {ecosystemServiceStateLabel(recommendation.product.serviceState, copy)}
      </span>
      <button style={buttonStyle} type="button">
        {getLocalizedText(recommendation.ctaLabel, locale)}
      </button>
    </div>
    <p style={{ color: "#92400e", fontSize: 12, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
      {getLocalizedText(recommendation.boundary, locale)}
    </p>
  </article>
);

const MobileHubLaneCard = ({
  copy,
  compact = false,
  lane,
  locale,
}: {
  copy: typeof userAppCopy["en-US"];
  compact?: boolean;
  lane: MobileTelegramMiniAppHubReadinessLane;
  locale: BusinessContentLocale;
}) => (
  <article
    style={{
      ...cardStyle,
      background: compact ? "#ffffff" : cardStyle.background,
      gap: compact ? 8 : 10,
      minWidth: 0,
      overflowWrap: "anywhere",
      padding: compact ? 10 : cardStyle.padding,
    }}
  >
    <div style={{ ...rowStyle, alignItems: "flex-start" }}>
      <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
        <p style={labelStyle}>{mobileHubServiceStateLabel(lane.serviceState, copy)}</p>
        <strong style={{ color: "#071426", fontSize: compact ? 14 : 18, lineHeight: 1.2 }}>
          {getLocalizedText(lane.label, locale)}
        </strong>
      </div>
      <span style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end", minWidth: 0 }}>
        <PublishStateBadge
          label={mobileHubReadinessStateLabel(lane.readiness, copy)}
          state={mobileHubReadinessBadgeState(lane.readiness)}
        />
        {!compact ? (
          <PublishStateBadge
            label={mobileHubServiceStateLabel(lane.serviceState, copy)}
            state={mobileHubServiceBadgeState(lane.serviceState)}
          />
        ) : null}
      </span>
    </div>
    <dl style={{ display: "grid", gap: compact ? 5 : 8, margin: 0, minWidth: 0 }}>
      {[
        [copy.mobileHubEvidenceBasis, getLocalizedText(lane.evidenceBasis, locale)],
        [copy.mobileHubRelatedSignal, getLocalizedText(lane.relatedSignal, locale)],
        [copy.mobileHubCta, getLocalizedText(lane.ctaLabel, locale)],
        [copy.nextAction, getLocalizedText(lane.nextAction, locale)],
      ].map(([label, value]) => (
        <div key={label} style={{ display: "grid", gap: 2, minWidth: 0 }}>
          <dt style={{ color: "#64748b", fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>
            {label}
          </dt>
          <dd
            style={{
              color: "#071426",
              fontSize: compact ? 12 : 13,
              fontWeight: 700,
              lineHeight: 1.35,
              margin: 0,
              minWidth: 0,
              overflowWrap: "anywhere",
            }}
          >
            {value}
          </dd>
        </div>
      ))}
    </dl>
    <p
      style={{
        color: "#92400e",
        fontSize: compact ? 11 : 12,
        fontWeight: 800,
        lineHeight: 1.4,
        margin: 0,
        minWidth: 0,
        overflowWrap: "anywhere",
      }}
    >
      {copy.mobileHubBoundaryHeading}: {getLocalizedText(lane.boundary, locale)}
    </p>
  </article>
);

const MarketplaceReadinessCard = ({
  copy,
  locale,
  row,
}: {
  copy: typeof userAppCopy["en-US"];
  locale: BusinessContentLocale;
  row: ReturnType<typeof createCampaignMarketplaceReadiness>["rows"][number];
}) => (
  <article style={{ ...cardStyle, alignContent: "space-between" }}>
    <div style={rowStyle}>
      <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
        <p style={labelStyle}>{campaignStatusLabel(row.status, copy)}</p>
        <strong style={{ color: "#071426", fontSize: 18, lineHeight: 1.2 }}>
          {getLocalizedText(row.title, locale)}
        </strong>
      </div>
      <PublishStateBadge
        label={getLocalizedText(row.readinessLabel, locale)}
        state={marketplaceLaneState(row.readinessLane)}
      />
    </div>
    <dl style={{ display: "grid", gap: 8, margin: 0 }}>
      {[
        [copy.marketplaceCtaPolicy, `${row.ctaKind} · ${getLocalizedText(row.ctaLabel, locale)}`],
        [copy.points, String(row.points)],
        [copy.timeWindow, getLocalizedText(row.timeWindow, locale)],
      ].map(([label, value]) => (
        <div key={label} style={rowStyle}>
          <dt style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>{label}</dt>
          <dd style={{ color: "#071426", fontSize: 13, fontWeight: 700, margin: 0, overflowWrap: "anywhere" }}>
            {value}
          </dd>
        </div>
      ))}
    </dl>
    <div style={{ display: "grid", gap: 8 }}>
      <div style={rowStyle}>
        <span style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>
          {copy.marketplaceConsumerSurfaces}
        </span>
        <span style={chipListStyle}>
          {row.consumerSurfaces.map((surface) => (
            <span key={surface} style={chipStyle}>
              {marketplaceSurfaceLabel(surface, copy)}
            </span>
          ))}
        </span>
      </div>
      {[
        [copy.marketplaceAppHubReady, row.appHubState, row.appHubNote],
        [copy.marketplacePortfolioReady, row.portfolioState, row.portfolioNote],
        [copy.marketplaceForecastReady, row.forecastState, row.forecastNote],
      ].map(([label, state, note]) => (
        <div key={label as string} style={rowStyle}>
          <span style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>
            {label as string}
          </span>
          <PublishStateBadge
            label={marketplaceSurfaceStateLabel(state as CampaignMarketplaceConsumerSurfaceState, copy)}
            state={marketplaceSurfaceBadgeState(state as CampaignMarketplaceConsumerSurfaceState)}
          />
          <p style={{ color: "#64748b", flexBasis: "100%", fontSize: 12, lineHeight: 1.35, margin: 0 }}>
            {getLocalizedText(note as typeof row.appHubNote, locale)}
          </p>
        </div>
      ))}
    </div>
    <p style={{ color: "#475569", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
      {getLocalizedText(row.readinessReason, locale)}
    </p>
    <p style={{ color: "#071426", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
      {copy.nextAction}: {getLocalizedText(row.nextAction, locale)}
    </p>
    <p style={{ color: "#92400e", fontSize: 12, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
      {getLocalizedText(row.boundary, locale)}
    </p>
  </article>
);

const PortfolioHistoryCard = ({
  copy,
  locale,
  row,
}: {
  copy: typeof userAppCopy["en-US"];
  locale: BusinessContentLocale;
  row: ReturnType<typeof createPortfolioCampaignHistoryReadModel>["rows"][number];
}) => (
  <article style={{ ...cardStyle, alignContent: "space-between" }}>
    <div style={rowStyle}>
      <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
        <p style={labelStyle}>{campaignStatusLabel(row.campaignStatus, copy)}</p>
        <strong style={{ color: "#071426", fontSize: 18, lineHeight: 1.2 }}>
          {getLocalizedText(row.title, locale)}
        </strong>
      </div>
      <span style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end" }}>
        <PublishStateBadge
          label={portfolioHistoryStateLabel(row.portfolioState, copy)}
          state={portfolioHistoryBadgeState(row.portfolioState)}
        />
        <PublishStateBadge
          label={getLocalizedText(row.winnerExportStatusLabel, locale)}
          state={winnersExportBadgeState(row.winnerExportStatus)}
        />
      </span>
    </div>
    <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
      {getLocalizedText(row.subtitle, locale)}
    </p>
    <dl style={{ display: "grid", gap: 8, margin: 0 }}>
      {[
        [copy.points, String(row.points)],
        [copy.portfolioWallet, `${row.walletType} · ${formatSource(row.walletSource)}`],
        [copy.portfolioLocale, row.localePreference],
        [copy.portfolioEligibility, getLocalizedText(row.eligibilityLabel, locale)],
        [copy.portfolioWinnerExport, getLocalizedText(row.winnerExportStatusLabel, locale)],
        [copy.rank, row.rank ? `#${row.rank}` : "-"],
        [copy.timeWindow, getLocalizedText(row.timeWindow, locale)],
      ].map(([label, value]) => (
        <div key={label} style={rowStyle}>
          <dt style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>{label}</dt>
          <dd style={{ color: "#071426", fontSize: 13, fontWeight: 700, margin: 0, overflowWrap: "anywhere" }}>
            {value}
          </dd>
        </div>
      ))}
    </dl>
    <div style={{ display: "grid", gap: 8 }}>
      <div style={rowStyle}>
        <span style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>
          {copy.missingTasks}
        </span>
        {renderChips(row.missingTaskIds, copy.noMissingTasks)}
      </div>
      <div style={rowStyle}>
        <span style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>
          {copy.riskFlags}
        </span>
        {renderChips(row.riskFlags, copy.riskClear)}
      </div>
    </div>
    <p style={{ color: "#475569", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
      {copy.nextAction}: {getLocalizedText(row.nextAction, locale)}
    </p>
    <p style={{ color: "#92400e", fontSize: 12, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
      {getLocalizedText(row.boundary, locale)}
    </p>
  </article>
);

export const UserAppPanel = ({
  campaign = campaignDetail,
  locale,
  participant = campaignDetail.participants[1],
  shareLocale = locale,
  walletModalLocale = locale,
}: UserAppPanelProps) => {
  const [isWalletModalOpen, setWalletModalOpen] = useState(false);
  const [eligibilityAddressInput, setEligibilityAddressInput] = useState(participant.walletAddress);
  const [checkedEligibilityAddress, setCheckedEligibilityAddress] = useState(participant.walletAddress);
  const [leaderboardMode, setLeaderboardMode] = useState<LeaderboardModeId>("total_points");
  const [latestTaskActions, setLatestTaskActions] = useState<Record<string, LocalTaskActionResult>>({});
  const [activeLocalSection, setActiveLocalSection] = useState<UserAppLocalSection>("campaigns");
  const localSectionRefs = {
    campaigns: useRef<HTMLElement>(null),
    eligibility: useRef<HTMLElement>(null),
    points: useRef<HTMLElement>(null),
    referrals: useRef<HTMLElement>(null),
  } satisfies Record<UserAppLocalSection, RefObject<HTMLElement>>;
  const copy = userAppCopy[locale];
  const participation = createParticipationReadModel(campaign, participant);
  const participantWorkspace = createParticipantWorkspaceReadModel(campaign, participant);
  const winnersExportStatus = createUserWinnersExportStatusReadModel(campaign, participant);
  const eligibilityChecker = createEligibilityCheckerReadModel(campaign, checkedEligibilityAddress);
  const eligibilityResult = eligibilityChecker.result;
  const leaderboard = createLeaderboardReadModel(campaign, leaderboardMode);
  const ecosystemNextActions = createEcosystemNextActionReadModel(campaign, participant);
  const portfolioCampaignHistory = createPortfolioCampaignHistoryReadModel(campaign, participant);
  const marketplaceReadiness = createCampaignMarketplaceReadiness(campaign, participant);
  const mobileHubReadiness = createMobileTelegramMiniAppHubReadiness(campaign, participant);
  const taskStates = participation.taskStates;
  const completedCount = taskStates.filter((task) => task.completed).length;
  const title = getLocalizedText(campaign.title, locale);
  const subtitle = getLocalizedText(campaign.subtitle, locale);
  const shareCardReadiness = createCampaignShareCardReadiness(campaign, shareLocale);
  const selectedWallet = sessionForParticipant(campaign, participant);
  const walletDiagnostics = createWalletConnectionDiagnostics(campaign.walletSessions);
  const missingTasks = campaign.tasks.filter((task) =>
    participation.eligibility.missingTaskIds.includes(task.id),
  );
  const campaignDiscovery = createCampaignDiscoveryReadModel(campaign, participant);
  const campaignFeed = campaignDiscovery.items;
  const appHubCampaign = campaignDiscovery.details[0]?.item ?? campaignFeed[0];
  const diagnosticMetrics: Array<[string, string, WalletDiagnosticState]> = [
    [copy.diagnosticsTotal, String(walletDiagnostics.totalSessions), "ready"],
    [copy.diagnosticsVerified, String(walletDiagnostics.verifiedSessions), "ready"],
    [
      copy.diagnosticsIssues,
      String(walletDiagnostics.issueSessions),
      walletDiagnostics.issueSessions > 0 ? "warning" : "ready",
    ],
    [
      copy.diagnosticsEoaReady,
      String(walletDiagnostics.eoaPathsReady),
      walletDiagnostics.eoaPathsReady > 0 ? "ready" : "warning",
    ],
  ];
  const requiredProgress = Math.round(
    (participation.metrics.completedRequiredTasks /
      Math.max(1, participation.metrics.totalRequiredTasks)) *
      100,
  );
  const ecosystemSummaryMetrics: Array<[string, string, "ready" | "warning" | "blocker"]> = [
    [copy.ready, String(ecosystemNextActions.summary.readyCount), "ready"],
    [
      copy.ecosystemLocked,
      String(ecosystemNextActions.summary.lockedCount),
      ecosystemNextActions.summary.lockedCount > 0 ? "warning" : "ready",
    ],
    [
      copy.ecosystemReview,
      String(ecosystemNextActions.summary.reviewCount),
      ecosystemNextActions.summary.reviewCount > 0 ? "warning" : "ready",
    ],
  ];
  const marketplaceSummaryMetrics: Array<[string, string, "ready" | "warning" | "blocker"]> = [
    [copy.appHubCampaigns, String(marketplaceReadiness.summary.totalCampaigns), "ready"],
    [copy.marketplaceAppHubReady, String(marketplaceReadiness.summary.appHubReadyCount), "ready"],
    [copy.marketplacePortfolioReady, String(marketplaceReadiness.summary.portfolioReadyCount), "ready"],
    [copy.marketplaceForecastReady, String(marketplaceReadiness.summary.forecastReadyCount), "ready"],
    [
      copy.marketplaceBlockedCount,
      String(marketplaceReadiness.summary.blockedCount),
      marketplaceReadiness.summary.blockedCount > 0 ? "blocker" : "ready",
    ],
    [
      copy.marketplaceReviewCount,
      String(marketplaceReadiness.summary.reviewCount),
      marketplaceReadiness.summary.reviewCount > 0 ? "warning" : "ready",
    ],
    [
      copy.marketplaceLocalPreviewCount,
      String(marketplaceReadiness.summary.localPreviewCount),
      marketplaceReadiness.summary.localPreviewCount > 0 ? "warning" : "ready",
    ],
  ];
  const portfolioSummaryMetrics: Array<[string, string, "ready" | "warning" | "blocker"]> = [
    [copy.portfolioActiveCampaigns, String(portfolioCampaignHistory.summary.activeCount), "ready"],
    [copy.portfolioHistoricalCampaigns, String(portfolioCampaignHistory.summary.historicalCount), "ready"],
    [
      copy.portfolioReviewRows,
      String(portfolioCampaignHistory.summary.reviewRequiredCount),
      portfolioCampaignHistory.summary.reviewRequiredCount > 0 ? "warning" : "ready",
    ],
    [
      copy.portfolioBlockedRows,
      String(portfolioCampaignHistory.summary.blockerCount),
      portfolioCampaignHistory.summary.blockerCount > 0 ? "blocker" : "ready",
    ],
    [copy.portfolioExportReady, String(portfolioCampaignHistory.summary.exportReadyCount), "ready"],
    [copy.portfolioTotalPoints, String(portfolioCampaignHistory.summary.totalPoints), "ready"],
  ];
  const mobileHubSummaryMetrics: Array<[string, string, "ready" | "warning" | "blocker"]> = [
    [copy.mobileHubTotalLanes, String(mobileHubReadiness.summary.totalLanes), "ready"],
    [copy.mobileHubReadyLanes, String(mobileHubReadiness.summary.readyCount), "ready"],
    [
      copy.mobileHubReviewLanes,
      String(mobileHubReadiness.summary.reviewCount),
      mobileHubReadiness.summary.reviewCount > 0 ? "warning" : "ready",
    ],
    [
      copy.mobileHubBlockedLanes,
      String(mobileHubReadiness.summary.blockedCount),
      mobileHubReadiness.summary.blockedCount > 0 ? "blocker" : "ready",
    ],
    [
      copy.mobileHubNotConnectedLanes,
      String(mobileHubReadiness.summary.notConnectedCount),
      mobileHubReadiness.summary.notConnectedCount > 0 ? "blocker" : "ready",
    ],
  ];
  const appHubCampaignSummary =
    campaignDiscovery.summary.liveCount > 0
      ? `${campaignDiscovery.summary.liveCount} ${copy.active}`
      : `${campaignDiscovery.summary.scheduledCount} ${copy.comingSoon}`;
  const submitEligibilityCheck = () => {
    setCheckedEligibilityAddress(eligibilityAddressInput.trim());
  };

  const localNavItems = userAppLocalSectionOrder.map((id) => {
    const labels: Record<UserAppLocalSection, string> = {
      campaigns: copy.localNavCampaigns,
      eligibility: copy.localNavEligibility,
      points: copy.localNavPoints,
      referrals: copy.localNavReferrals,
    };

    return { id, label: labels[id] };
  });

  const focusLocalSection = (section: UserAppLocalSection) => {
    setActiveLocalSection(section);
    const target = localSectionRefs[section].current;

    if (!target) {
      return;
    }

    target.focus({ preventScroll: true });
    target.scrollIntoView?.({ block: "start", behavior: "smooth" });
  };

  const runLocalTaskAction = (
    taskId: string,
    kind: TaskVerificationActionKind,
    proofType?: TaskVerificationProofType,
  ) => {
    const result = localCampaignService.executeTaskVerificationAction({
      accountType: participant.accountType,
      campaignId: campaign.id,
      kind,
      proofType,
      taskId,
      walletAddress: participant.walletAddress,
      walletSource: participant.walletSource,
    });

    setLatestTaskActions((current) => ({
      ...current,
      [taskId]: result,
    }));
  };

  return (
    <div style={{ display: "grid", gap: 18, minWidth: 0 }}>
      <section style={panelStyle}>
        <div style={rowStyle}>
          <div>
            <p style={labelStyle}>{copy.feedTitle}</p>
            <h2 style={{ fontSize: 30, lineHeight: 1.1, margin: "4px 0" }}>{copy.feedTitle}</h2>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
              {copy.feedSubtitle}
            </p>
          </div>
          <button onClick={() => setWalletModalOpen(true)} style={buttonStyle} type="button">
            {copy.connectWallet}
          </button>
        </div>
        <div style={feedGridStyle}>
          {campaignFeed.map((item) => (
            <CampaignFeedCard copy={copy} item={item} key={item.id} locale={locale} />
          ))}
        </div>
        <p style={{ color: "#92400e", fontSize: 13, fontWeight: 700, margin: 0 }}>
          {copy.feedBoundary}
        </p>
      </section>

      <nav aria-label={copy.localNavLabel} style={localNavStyle}>
        {localNavItems.map((item) => {
          const isSelected = item.id === activeLocalSection;

          return (
            <button
              aria-pressed={isSelected}
              key={item.id}
              onClick={() => focusLocalSection(item.id)}
              style={isSelected ? activeLocalNavButtonStyle : localNavButtonStyle}
              type="button"
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {isWalletModalOpen ? (
        <WalletConnectModal
          locale={walletModalLocale}
          onClose={() => setWalletModalOpen(false)}
          options={walletOptions}
        />
      ) : null}

      <section style={panelStyle}>
        <div style={mobileHubGridStyle}>
          <div style={{ alignContent: "center", display: "grid", gap: 14 }}>
            <div>
              <p style={labelStyle}>{copy.appHubTitle}</p>
              <h2 style={{ fontSize: 28, lineHeight: 1.1, margin: "4px 0" }}>
                {copy.appHubSubtitle}
              </h2>
              <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
                {copy.appHubBoundary}
              </p>
            </div>
            <div style={gridStyle}>
              {[
                [copy.appHubCampaigns, appHubCampaignSummary],
                [copy.eligibility, eligibilityLabel(participation.eligibility.status, copy)],
                [copy.walletType, getWalletBadgeLabel(selectedWallet.accountType, selectedWallet.walletSource)],
                [copy.ecosystemLoopProgress, `${ecosystemNextActions.summary.loopProgressPercent}%`],
              ].map(([label, value]) => (
                <article key={label} style={cardStyle}>
                  <p style={labelStyle}>{label}</p>
                  <strong style={{ color: "#071426", fontSize: 17 }}>{value}</strong>
                </article>
              ))}
            </div>
          </div>
          <aside aria-label={copy.appHubTitle} style={phoneShellStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span>9:41</span>
              <span>5G 100%</span>
            </div>
            <div style={phoneScreenStyle}>
              <div style={rowStyle}>
                <strong style={{ fontSize: 18 }}>{copy.appHubTitle}</strong>
                <WalletBadge
                  accountType={selectedWallet.accountType}
                  walletSource={selectedWallet.walletSource}
                />
              </div>
              <article
                style={{
                  ...cardStyle,
                  background: "#071426",
                  borderColor: "#1c64f2",
                  color: "#ffffff",
                }}
              >
                <p style={{ ...labelStyle, color: "#93c5fd" }}>{copy.appHubGuide}</p>
                <strong style={{ color: "#ffffff", fontSize: 20 }}>
                  {mobileHubAiGuideHeadline(mobileHubReadiness.aiGuide.urgency, copy)}
                </strong>
                <p style={{ color: "#dbeafe", fontSize: 12, fontWeight: 700, lineHeight: 1.4, margin: 0 }}>
                  {getLocalizedText(mobileHubReadiness.aiGuide.body, locale)}
                </p>
              </article>
              <article style={cardStyle}>
                <p style={labelStyle}>{copy.appHubToday}</p>
                <div style={rowStyle}>
                  <strong>{getLocalizedText(appHubCampaign.title, locale)}</strong>
                  <PublishStateBadge
                    label={campaignStatusLabel(appHubCampaign.status, copy)}
                    state={campaignStatusState(appHubCampaign.status)}
                  />
                </div>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                  {subtitle}
                </p>
                <div aria-label={copy.completedRequired} style={progressTrackStyle}>
                  <span
                    style={{
                      background: "#16a34a",
                      display: "block",
                      height: "100%",
                      width: `${requiredProgress}%`,
                    }}
                  />
                </div>
                <button style={{ ...buttonStyle, justifyContent: "center", width: "100%" }} type="button">
                  {campaignStatusIsPreLaunchReview(appHubCampaign.status)
                    ? copy.reviewRequired
                    : copy.continueTasks}
                </button>
              </article>
              <article style={cardStyle}>
                <div style={rowStyle}>
                  <strong>{copy.eligibility}</strong>
                  <PublishStateBadge
                    label={eligibilityLabel(participation.eligibility.status, copy)}
                    state={eligibilityBadgeState(participation.eligibility.status)}
                  />
                </div>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                  {missingTasks.length > 0
                    ? `${copy.missingTasks}: ${missingTasks
                        .map((task) => getLocalizedText(task.title, locale))
                        .join(", ")}`
                    : copy.noMissingTasks}
                </p>
              </article>
              <article style={cardStyle}>
                <p style={labelStyle}>{copy.mobileHubLaneList}</p>
                <div style={{ display: "grid", gap: 8 }}>
                  {mobileHubReadiness.lanes.map((lane) => (
                    <MobileHubLaneCard
                      compact
                      copy={copy}
                      key={lane.id}
                      lane={lane}
                      locale={locale}
                    />
                  ))}
                </div>
              </article>
              <nav
                aria-label={copy.appHubTitle}
                style={{
                  display: "grid",
                  gap: 6,
                  gridTemplateColumns: "repeat(4, 1fr)",
                  marginTop: "auto",
                }}
              >
                {[copy.appHubHome, copy.appHubCampaigns, copy.appHubPay, copy.appHubMe].map((item) => (
                  <span key={item} style={{ color: "#64748b", fontSize: 12, fontWeight: 800, textAlign: "center" }}>
                    {item}
                  </span>
                ))}
              </nav>
            </div>
          </aside>
        </div>
      </section>

      <section aria-label={copy.mobileHubReadiness} style={panelStyle}>
        <div style={rowStyle}>
          <div>
            <p style={labelStyle}>{copy.appHubTitle}</p>
            <h2 style={{ fontSize: 28, lineHeight: 1.1, margin: "4px 0" }}>
              {copy.mobileHubReadiness}
            </h2>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
              {copy.mobileHubSubtitle}
            </p>
          </div>
          <PublishStateBadge
            label={`${copy.status}: ${mobileHubReadinessStateLabel(mobileHubReadiness.summary.topLaneState, copy)}`}
            state={mobileHubReadinessBadgeState(mobileHubReadiness.summary.topLaneState)}
          />
        </div>
        <div style={metricGridStyle}>
          {mobileHubSummaryMetrics.map(([label, value, state]) => (
            <article key={label} style={cardStyle}>
              <p style={labelStyle}>{label}</p>
              <p style={valueStyle}>{value}</p>
              <PublishStateBadge label={String(state)} state={state} />
            </article>
          ))}
        </div>
        <article style={{ ...cardStyle, background: "#ffffff" }}>
          <div style={rowStyle}>
            <p style={labelStyle}>{copy.mobileHubAiGuide}</p>
            <PublishStateBadge
              label={mobileHubReadinessStateLabel(mobileHubReadiness.aiGuide.urgency, copy)}
              state={mobileHubReadinessBadgeState(mobileHubReadiness.aiGuide.urgency)}
            />
          </div>
          <strong style={{ color: "#071426", fontSize: 18, lineHeight: 1.25 }}>
            {mobileHubAiGuideHeadline(mobileHubReadiness.aiGuide.urgency, copy)}
          </strong>
          <p style={{ color: "#475569", fontSize: 13, fontWeight: 700, lineHeight: 1.45, margin: 0 }}>
            {getLocalizedText(mobileHubReadiness.aiGuide.body, locale)}
          </p>
          <p style={{ color: "#64748b", fontSize: 12, fontWeight: 800, lineHeight: 1.4, margin: 0 }}>
            {copy.mobileHubEvidenceBasis}: {getLocalizedText(mobileHubReadiness.aiGuide.evidenceBasis, locale)}
          </p>
        </article>
        <p style={{ color: "#071426", fontSize: 15, fontWeight: 900, lineHeight: 1.45, margin: 0 }}>
          {copy.mobileHubOwnerNextAction}: {getLocalizedText(mobileHubReadiness.ownerNextAction, locale)}
        </p>
        <div style={feedGridStyle}>
          {mobileHubReadiness.lanes.map((lane) => (
            <MobileHubLaneCard copy={copy} key={lane.id} lane={lane} locale={locale} />
          ))}
        </div>
        <p style={{ color: "#92400e", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
          {copy.mobileHubBoundaryHeading}: {getLocalizedText(mobileHubReadiness.boundary, locale)}{" "}
          {copy.mobileHubNoLiveHelper}
        </p>
      </section>

      <section aria-label={copy.marketplaceReadiness} style={panelStyle}>
        <div style={rowStyle}>
          <div>
            <p style={labelStyle}>{copy.marketplaceReadiness}</p>
            <h2 style={{ fontSize: 28, lineHeight: 1.1, margin: "4px 0" }}>
              {copy.marketplaceReadiness}
            </h2>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
              {copy.marketplaceSubtitle}
            </p>
          </div>
          <PublishStateBadge
            label={`${copy.status}: ${getLocalizedText(
              marketplaceReadiness.rows[0]?.readinessLabel ?? marketplaceReadiness.summary.ownerNextAction,
              locale,
            )}`}
            state={marketplaceLaneState(marketplaceReadiness.summary.topReadinessLane)}
          />
        </div>
        <div style={metricGridStyle}>
          {marketplaceSummaryMetrics.map(([label, value, state]) => (
            <article key={label} style={cardStyle}>
              <p style={labelStyle}>{label}</p>
              <p style={valueStyle}>{value}</p>
              <PublishStateBadge label={String(state)} state={state} />
            </article>
          ))}
        </div>
        <p style={{ color: "#071426", fontSize: 15, fontWeight: 900, lineHeight: 1.45, margin: 0 }}>
          {copy.marketplaceOwnerNextAction}: {getLocalizedText(marketplaceReadiness.ownerNextAction, locale)}
        </p>
        <div style={feedGridStyle}>
          {marketplaceReadiness.rows.map((row) => (
            <MarketplaceReadinessCard
              copy={copy}
              key={row.campaignId}
              locale={locale}
              row={row}
            />
          ))}
        </div>
        <p style={{ color: "#92400e", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
          {copy.marketplaceBoundary}
        </p>
      </section>

      <section aria-label={copy.ecosystemNextActions} style={panelStyle}>
        <div style={rowStyle}>
          <div>
            <p style={labelStyle}>{copy.ecosystemNextActions}</p>
            <h2 style={{ fontSize: 28, lineHeight: 1.1, margin: "4px 0" }}>
              {copy.ecosystemNextActions}
            </h2>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
              {copy.ecosystemSubtitle}
            </p>
          </div>
          <PublishStateBadge
            label={`${copy.ecosystemLoopProgress}: ${ecosystemNextActions.summary.loopProgressPercent}%`}
            state={ecosystemNextActions.summary.lockedCount > 0 ? "warning" : "ready"}
          />
        </div>
        <div style={metricGridStyle}>
          {ecosystemSummaryMetrics.map(([label, value, state]) => (
            <article key={label} style={cardStyle}>
              <p style={labelStyle}>{label}</p>
              <p style={valueStyle}>{value}</p>
              <PublishStateBadge label={String(state)} state={state} />
            </article>
          ))}
        </div>
        <p style={{ color: "#071426", fontSize: 15, fontWeight: 900, lineHeight: 1.45, margin: 0 }}>
          {getLocalizedText(ecosystemNextActions.summary.headline, locale)}
        </p>
        <div style={feedGridStyle}>
          {ecosystemNextActions.recommendations.map((recommendation) => (
            <EcosystemRecommendationCard
              copy={copy}
              key={recommendation.id}
              locale={locale}
              recommendation={recommendation}
            />
          ))}
        </div>
        <p style={{ color: "#92400e", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
          {copy.ecosystemBoundary}
        </p>
      </section>

      <section aria-label={copy.portfolioCampaignHistory} style={panelStyle}>
        <div style={rowStyle}>
          <div>
            <p style={labelStyle}>{copy.appHubPortfolio}</p>
            <h2 style={{ fontSize: 28, lineHeight: 1.1, margin: "4px 0" }}>
              {copy.portfolioCampaignHistory}
            </h2>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
              {copy.portfolioCampaignHistorySubtitle}
            </p>
          </div>
          <PublishStateBadge
            label={`${copy.portfolioState}: ${portfolioHistoryStateLabel(portfolioCampaignHistory.rows[0]?.portfolioState ?? "in_progress", copy)}`}
            state={portfolioHistoryBadgeState(portfolioCampaignHistory.rows[0]?.portfolioState ?? "in_progress")}
          />
        </div>
        <div style={metricGridStyle}>
          {portfolioSummaryMetrics.map(([label, value, state]) => (
            <article key={label} style={cardStyle}>
              <p style={labelStyle}>{label}</p>
              <p style={valueStyle}>{value}</p>
              <PublishStateBadge label={String(state)} state={state} />
            </article>
          ))}
        </div>
        <p style={{ color: "#071426", fontSize: 15, fontWeight: 900, lineHeight: 1.45, margin: 0 }}>
          {getLocalizedText(portfolioCampaignHistory.nextAction, locale)}
        </p>
        <div style={feedGridStyle}>
          {portfolioCampaignHistory.rows.map((row) => (
            <PortfolioHistoryCard
              copy={copy}
              key={row.campaignId}
              locale={locale}
              row={row}
            />
          ))}
        </div>
        <p style={{ color: "#92400e", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
          {copy.portfolioBoundary}
        </p>
      </section>

      <section aria-label={copy.participantWorkspace} style={panelStyle}>
        <div style={rowStyle}>
          <div>
            <p style={labelStyle}>{copy.participantSummary}</p>
            <h2 style={{ fontSize: 28, lineHeight: 1.1, margin: "4px 0" }}>
              {copy.participantWorkspace}
            </h2>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
              {copy.participantWorkspaceSubtitle}
            </p>
          </div>
          <PublishStateBadge
            label={participantWorkspace.summary.reviewRequired ? copy.reviewRequired : copy.ready}
            state={participantWorkspace.summary.reviewRequired ? "warning" : "ready"}
          />
        </div>

        <div style={metricGridStyle}>
          {[
            [copy.completedRequired, `${participantWorkspace.summary.completedRequiredTasks}/${participantWorkspace.summary.totalRequiredTasks}`],
            [copy.progressPercent, `${participantWorkspace.summary.requiredProgressPercent}%`],
            [copy.myPoints, `${participantWorkspace.points.currentPoints}/${participantWorkspace.points.pointsThreshold}`],
            [copy.rank, participantWorkspace.points.participantRank ? `#${participantWorkspace.points.participantRank}` : "-"],
            [copy.eligibleCutoff, `#${participantWorkspace.points.eligibleRankCutoff}`],
            [copy.workspaceQualifiedInvitees, String(participantWorkspace.referral.qualifiedInvitees)],
            [copy.referralPoints, String(participantWorkspace.referral.referralPoints)],
            [copy.riskFlags, String(participantWorkspace.summary.riskFlagCount)],
          ].map(([label, value]) => (
            <article key={label} style={cardStyle}>
              <p style={labelStyle}>{label}</p>
              <p style={valueStyle}>{value}</p>
            </article>
          ))}
        </div>

        <div style={gridStyle}>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.myTasks}</p>
            <h3 style={{ fontSize: 18, margin: 0 }}>{copy.missingTasks}</h3>
            <WorkspaceTaskList
              copy={copy}
              emptyLabel={copy.noMissingTasks}
              locale={locale}
              tasks={participantWorkspace.taskBuckets.missingRequired}
            />
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.pendingTasks}</p>
            <WorkspaceTaskList
              copy={copy}
              emptyLabel={copy.noMissingTasks}
              locale={locale}
              tasks={participantWorkspace.taskBuckets.pending}
            />
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.reviewRequired}</p>
            <WorkspaceTaskList
              copy={copy}
              emptyLabel={copy.riskClear}
              locale={locale}
              tasks={participantWorkspace.taskBuckets.review}
            />
          </article>
        </div>

        <div style={gridStyle}>
          <article
            aria-label={copy.localNavPointsSection}
            ref={localSectionRefs.points}
            style={cardStyle}
            tabIndex={-1}
          >
            <p style={labelStyle}>{copy.myPoints}</p>
            <div style={rowStyle}>
              <strong style={{ color: "#071426", fontSize: 22 }}>
                {participantWorkspace.points.currentPoints}
              </strong>
              <PublishStateBadge
                label={participantWorkspace.points.ledgerState}
                state="warning"
              />
            </div>
            <div aria-label={copy.completedRequired} style={progressTrackStyle}>
              <span
                style={{
                  background: "#1c64f2",
                  display: "block",
                  height: "100%",
                  width: `${participantWorkspace.points.progressPercent}%`,
                }}
              />
            </div>
            <p style={{ color: "#92400e", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
              {getLocalizedText(participantWorkspace.points.boundary, locale)}
            </p>
          </article>

          <article
            aria-label={copy.localNavReferralsSection}
            ref={localSectionRefs.referrals}
            style={cardStyle}
            tabIndex={-1}
          >
            <p style={labelStyle}>{copy.referralSummary}</p>
            <dl style={{ display: "grid", gap: 10, margin: 0 }}>
              {[
                [copy.inviteLink, participantWorkspace.referral.inviteLink],
                [copy.invitedCount, String(participantWorkspace.referral.rawInvites)],
                [copy.workspaceQualifiedInvitees, String(participantWorkspace.referral.qualifiedInvitees)],
                [copy.referralPoints, String(participantWorkspace.referral.referralPoints)],
                [copy.riskFlags, participantWorkspace.referral.riskFlags.join(", ") || copy.riskClear],
              ].map(([label, value]) => (
                <div key={label} style={rowStyle}>
                  <dt style={{ color: "#64748b", fontSize: 13, fontWeight: 800 }}>{label}</dt>
                  <dd style={{ color: "#071426", fontSize: 13, fontWeight: 700, margin: 0, overflowWrap: "anywhere" }}>
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
              {getLocalizedText(participantWorkspace.referral.antiFarmRule, locale)}
            </p>
            <p style={{ color: "#92400e", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
              {getLocalizedText(participantWorkspace.referral.boundary, locale)}
            </p>
          </article>

          <article style={cardStyle}>
            <p style={labelStyle}>{copy.nextAction}</p>
            <ul style={listStyle}>
              {participantWorkspace.nextActions.map((action) => (
                <li key={action.id} style={listItemStyle}>
                  <div style={rowStyle}>
                    <strong>{getLocalizedText(action.label, locale)}</strong>
                    <PublishStateBadge
                      label={action.priority}
                      state={action.priority === "review" ? "warning" : "ready"}
                    />
                  </div>
                  <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                    {getLocalizedText(action.reason, locale)}
                  </p>
                </li>
              ))}
            </ul>
          </article>
        </div>

        <p style={{ color: "#92400e", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
          {getLocalizedText(participantWorkspace.boundary, locale)} {getLocalizedText(participantWorkspace.rewardBoundary, locale)}
        </p>
      </section>

      <section
        aria-label={copy.localNavCampaignsSection}
        ref={localSectionRefs.campaigns}
        style={panelStyle}
        tabIndex={-1}
      >
        <div style={rowStyle}>
          <div>
            <p style={labelStyle}>{copy.campaignDetail}</p>
            <h2 style={{ fontSize: 30, lineHeight: 1.1, margin: "4px 0" }}>{title}</h2>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>{subtitle}</p>
          </div>
          <button style={buttonStyle} type="button">
            {copy.checkEligibility}
          </button>
        </div>

        <div style={gridStyle}>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.active}</p>
            <p style={valueStyle}>{campaign.status}</p>
            <p style={{ color: "#475569", fontSize: 13, margin: 0 }}>
              {copy.timeWindow}: {formatDate(campaign.startTime)} - {formatDate(campaign.endTime)}
            </p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.walletPolicy}</p>
            <p style={valueStyle}>{campaign.walletPolicy}</p>
            <WalletBadge
              accountType={selectedWallet.accountType}
              walletSource={selectedWallet.walletSource}
            />
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.contractMode}</p>
            <ContractModeBadge
              label={contractModeLabel(campaign.contractMode)}
              mode={campaign.contractMode}
            />
            <p style={{ color: "#475569", fontSize: 13, margin: 0 }}>
              {campaign.exportPreview.disclaimer}
            </p>
          </article>
        </div>
      </section>

      <section aria-label={copy.shareCardReadiness} style={panelStyle}>
        <div style={rowStyle}>
          <div>
            <p style={labelStyle}>{copy.shareCardReadiness}</p>
            <h3 style={{ fontSize: 20, margin: "2px 0 0" }}>{copy.shareCardReadiness}</h3>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: "6px 0 0" }}>
              {copy.shareCardReadinessSubtitle}
            </p>
          </div>
          <PublishStateBadge
            label={
              shareCardReadiness.fallbackToEnglish
                ? copy.shareFallbackActive
                : copy.shareReadyLocal
            }
            state={publishStateBadgeState(shareCardReadiness.readiness)}
          />
        </div>

        <div style={gridStyle}>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.shareCanonicalUrl}</p>
            <p style={urlTextStyle}>{shareCardReadiness.canonicalUrl}</p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.sharePreviewTitle}</p>
            <strong>{shareCardReadiness.title}</strong>
            <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
              {shareCardReadiness.description}
            </p>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.shareFallbackNotice}</p>
            <p style={{ color: "#92400e", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
              {getLocalizedText(shareCardReadiness.fallbackNotice, locale)}
            </p>
          </article>
        </div>

        <div style={cardStyle}>
          <p style={labelStyle}>{copy.shareAlternateUrls}</p>
          <div style={{ display: "grid", gap: 8 }}>
            {Object.entries(shareCardReadiness.alternateUrls).map(([alternateLocale, url]) => (
              <div key={alternateLocale} style={{ display: "grid", gap: 4, minWidth: 0 }}>
                <strong style={{ color: "#64748b", fontSize: 12 }}>{alternateLocale}</strong>
                <p style={urlTextStyle}>{url}</p>
              </div>
            ))}
          </div>
        </div>

        <p style={{ color: "#92400e", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
          {copy.shareBoundary}
        </p>
      </section>

      <section style={panelStyle}>
        <div style={rowStyle}>
          <div>
            <p style={labelStyle}>{copy.walletTypeVerified}</p>
            <h3 style={{ fontSize: 20, margin: "2px 0 0" }}>{copy.walletSessionStatus}</h3>
          </div>
          <WalletVerificationBadge
            label={getLocalizedText(selectedWallet.statusMessage, locale)}
            status={selectedWallet.verificationStatus}
          />
        </div>
        <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
          {copy.seededWalletBoundary}
        </p>
        <div style={gridStyle}>
          {campaign.walletSessions.map((session) => (
            <WalletSessionCard
              copy={copy}
              key={session.sessionId}
              locale={locale}
              session={session}
            />
          ))}
        </div>
      </section>

      <section aria-label={copy.diagnostics} style={panelStyle}>
        <div style={rowStyle}>
          <div>
            <p style={labelStyle}>{copy.walletSessionStatus}</p>
            <h3 style={{ fontSize: 20, margin: "2px 0 0" }}>{copy.diagnostics}</h3>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: "6px 0 0" }}>
              {copy.diagnosticsSubtitle}
            </p>
          </div>
          <PublishStateBadge
            label={walletDiagnostics.recommendedPathReady ? copy.diagnosticsRecommendedReady : copy.diagnosticsIssues}
            state={walletDiagnostics.recommendedPathReady ? "ready" : "warning"}
          />
        </div>
        <p style={{ color: "#92400e", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
          {getLocalizedText(walletDiagnostics.boundary, locale)} {copy.diagnosticsNotLive}
        </p>
        <div style={metricGridStyle}>
          {diagnosticMetrics.map(([label, value, state]) => (
            <article key={label} style={cardStyle}>
              <p style={labelStyle}>{label}</p>
              <p style={valueStyle}>{value}</p>
              <PublishStateBadge label={String(state)} state={state} />
            </article>
          ))}
        </div>
        <div style={gridStyle}>
          {walletDiagnostics.groups.map((group) => (
            <article key={group.id} style={cardStyle}>
              <div style={rowStyle}>
                <strong>{getLocalizedText(group.title, locale)}</strong>
                <PublishStateBadge
                  label={group.state}
                  state={diagnosticBadgeState(group.state)}
                />
              </div>
              <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                {getLocalizedText(group.description, locale)}
              </p>
              <ul style={{ display: "grid", gap: 8, margin: 0, padding: 0 }}>
                {group.items.map((item) => (
                  <li key={item.sessionId} style={{ display: "grid", gap: 6, listStyle: "none" }}>
                    <div style={rowStyle}>
                      <strong style={{ fontSize: 14 }}>{item.walletName}</strong>
                      <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        <WalletBadge accountType={item.accountType} walletSource={item.walletSource} />
                        <WalletVerificationBadge
                          label={getLocalizedText(item.statusMessage, locale)}
                          status={item.verificationStatus}
                        />
                      </span>
                    </div>
                    <span style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
                      {copy.walletAddress}: {item.displayAddress}
                    </span>
                    <span style={{ color: "#475569", fontSize: 13, lineHeight: 1.45 }}>
                      {copy.diagnosticsScenario}: {getLocalizedText(item.qaScenario, locale)}
                    </span>
                    <span style={{ color: "#475569", fontSize: 13, lineHeight: 1.45 }}>
                      {copy.nextAction}: {getLocalizedText(item.nextAction, locale)}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <div style={cardStyle}>
          <div style={rowStyle}>
            <strong>{copy.diagnosticsQa}</strong>
            <span style={{ color: "#64748b", fontSize: 13, fontWeight: 800 }}>
              {copy.diagnosticsSupported}
            </span>
          </div>
          <ul style={listStyle}>
            {walletDiagnostics.qaChecklist.map((item) => (
              <li key={item.id} style={listItemStyle}>
                <div style={rowStyle}>
                  <strong>{getLocalizedText(item.label, locale)}</strong>
                  <PublishStateBadge label={item.state} state={item.state} />
                </div>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                  {getLocalizedText(item.evidence, locale)}
                </p>
                <span style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>
                  {item.sessionIds.join(", ")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <WalletOptionCards copy={copy} options={walletOptions} />

      <section
        aria-label={copy.eligibility}
        ref={localSectionRefs.eligibility}
        style={panelStyle}
        tabIndex={-1}
      >
        <div style={rowStyle}>
          <div>
            <p style={labelStyle}>{copy.status}</p>
            <h3 style={{ fontSize: 20, margin: "2px 0 0" }}>{copy.eligibility}</h3>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: "6px 0 0" }}>
              {getLocalizedText(eligibilityChecker.summary.description, locale)}
            </p>
          </div>
          <PublishStateBadge
            label={eligibilityLabel(eligibilityResult.status, copy)}
            state={eligibilityBadgeState(eligibilityResult.status)}
          />
        </div>

        <div style={{ ...cardStyle, background: "#ffffff" }}>
          <label
            htmlFor="eligibility-address"
            style={{ ...labelStyle, color: "#334155" }}
          >
            {copy.eligibilityAddress}
          </label>
          <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 10 }}>
            <input
              id="eligibility-address"
              onChange={(event) => setEligibilityAddressInput(event.target.value)}
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: 8,
                color: "#071426",
                flex: "1 1 220px",
                fontSize: 15,
                minHeight: 40,
                minWidth: 0,
                padding: "0 12px",
              }}
              type="text"
              value={eligibilityAddressInput}
            />
            <button onClick={submitEligibilityCheck} style={buttonStyle} type="button">
              {copy.checkAddressEligibility}
            </button>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <p style={labelStyle}>{copy.seededParticipants}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {eligibilityChecker.entries.map((entry) => {
                const isSelected = entry.walletAddress === eligibilityResult.walletAddress;

                return (
                  <button
                    aria-pressed={isSelected}
                    key={entry.id}
                    onClick={() => {
                      setEligibilityAddressInput(entry.walletAddress);
                      setCheckedEligibilityAddress(entry.walletAddress);
                    }}
                    style={isSelected ? activeChoiceButtonStyle : secondaryButtonStyle}
                    type="button"
                  >
                    {entry.walletAddress} · {eligibilityLabel(entry.status, copy)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div style={metricGridStyle}>
          <div style={cardStyle}>
            <p style={labelStyle}>{copy.score}</p>
            <p style={valueStyle}>{eligibilityResult.score}</p>
            <span style={{ color: "#475569", fontSize: 13 }}>
              {copy.pointsThreshold}: {eligibilityResult.pointsThreshold}
            </span>
          </div>
          <div style={cardStyle}>
            <p style={labelStyle}>{copy.completedRequired}</p>
            <p style={valueStyle}>
              {eligibilityResult.completedRequiredTasks}/{eligibilityResult.totalRequiredTasks}
            </p>
            <span style={{ color: "#475569", fontSize: 13 }}>
              {eligibilityResult.progressPercent}%
            </span>
          </div>
          <div style={cardStyle}>
            <p style={labelStyle}>{copy.walletType}</p>
            <WalletBadge
              accountType={eligibilityResult.accountType}
              walletSource={eligibilityResult.walletSource}
            />
            {eligibilityResult.walletStatus ? (
              <WalletVerificationBadge
                label={getLocalizedText(eligibilityResult.walletStatus.statusMessage, locale)}
                status={eligibilityResult.walletStatus.verificationStatus}
              />
            ) : null}
            <span style={{ color: "#475569", fontSize: 13 }}>
              {copy.checkedAddress}: {eligibilityResult.walletAddress}
            </span>
            <span style={{ color: "#475569", fontSize: 13 }}>
              {copy.walletTypeVerified}:{" "}
              {eligibilityResult.walletTypeVerified
                ? copy.eligible
                : copy.notEligible}
            </span>
            {!eligibilityResult.knownParticipant ? (
              <span style={{ color: "#92400e", fontSize: 13, fontWeight: 800 }}>
                {copy.unknownWalletType}
              </span>
            ) : null}
          </div>
        </div>

        <div style={gridStyle}>
          <div style={cardStyle}>
            <p style={labelStyle}>{copy.missingTasks}</p>
            {eligibilityResult.missingTasks.length > 0 ? (
              <ul style={listStyle}>
                {eligibilityResult.missingTasks.map((task) => (
                  <li key={task.taskId} style={listItemStyle}>
                    <div style={rowStyle}>
                      <strong>{getLocalizedText(task.title, locale)}</strong>
                      <PublishStateBadge
                        label={taskStatusLabel(task.status, copy)}
                        state={taskBadgeState(task.status)}
                      />
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <span style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
                        {copy.points}: {task.points}
                      </span>
                      <span style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
                        {copy.verification}: {task.verificationType}
                      </span>
                      <span style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
                        {copy.compatibility}: {getWalletCompatibilityLabel(task.walletCompatibility)}
                      </span>
                      {task.evidenceSource ? (
                        <span style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
                          {copy.evidenceSource}: {formatSource(task.evidenceSource)}
                        </span>
                      ) : null}
                    </div>
                    <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                      {copy.nextAction}: {getLocalizedText(task.nextAction, locale)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <strong>{copy.noMissingTasks}</strong>
            )}
          </div>
          <div style={cardStyle}>
            <p style={labelStyle}>{copy.riskFlags}</p>
            <strong>
              {eligibilityResult.riskFlags.join(", ") || copy.riskClear}
            </strong>
            {eligibilityResult.riskFlags.length > 0 ? (
              <span style={{ color: "#92400e", fontSize: 13, fontWeight: 800 }}>
                {copy.manualReview}
              </span>
            ) : null}
          </div>
          <div style={cardStyle}>
            <p style={labelStyle}>{copy.nextAction}</p>
            <strong>{getLocalizedText(eligibilityResult.nextAction, locale)}</strong>
            <span style={{ color: "#475569", fontSize: 13 }}>
              {getLocalizedText(eligibilityResult.reason, locale)}
            </span>
          </div>
        </div>

        <p style={{ color: "#92400e", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
          {getLocalizedText(eligibilityResult.boundary, locale)} {copy.rewardBoundary}
        </p>
      </section>

      <section aria-label={copy.winnersExportStatus} style={panelStyle}>
        <div style={rowStyle}>
          <div>
            <p style={labelStyle}>{copy.exportRowStatus}</p>
            <h3 style={{ fontSize: 20, margin: "2px 0 0" }}>{copy.winnersExportStatus}</h3>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: "6px 0 0" }}>
              {copy.winnersExportSubtitle}
            </p>
          </div>
          <PublishStateBadge
            label={getLocalizedText(winnersExportStatus.statusLabel, locale)}
            state={winnersExportBadgeState(winnersExportStatus.status)}
          />
        </div>

        <p style={{ color: "#071426", fontSize: 15, fontWeight: 900, lineHeight: 1.45, margin: 0 }}>
          {getLocalizedText(winnersExportStatus.summary, locale)}
        </p>
        <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
          {getLocalizedText(winnersExportStatus.reason, locale)}
        </p>

        <div style={metricGridStyle}>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.status}</p>
            <strong>{getLocalizedText(winnersExportStatus.statusLabel, locale)}</strong>
            <span style={{ color: "#475569", fontSize: 13 }}>
              {copy.exportBatch}: {winnersExportStatus.exportBatchId ?? "-"}
            </span>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.walletType}</p>
            {winnersExportStatus.row ? (
              <WalletBadge
                accountType={winnersExportStatus.row.accountType}
                walletSource={winnersExportStatus.row.walletSource}
              />
            ) : (
              <strong>{copy.unknownWalletType}</strong>
            )}
            <span style={{ color: "#475569", fontSize: 13 }}>
              {copy.walletTypeVerified}:{" "}
              {winnersExportStatus.row?.walletTypeVerified ? copy.eligible : copy.notEligible}
            </span>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.localePreference}</p>
            <strong>{winnersExportStatus.row?.localePreference ?? "-"}</strong>
            <span style={{ color: "#475569", fontSize: 13 }}>
              {copy.walletAddress}: {winnersExportStatus.walletAddress}
            </span>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.points}</p>
            <strong>{winnersExportStatus.row?.totalPoints ?? 0}</strong>
            <span style={{ color: "#475569", fontSize: 13 }}>
              {copy.rank}: #{winnersExportStatus.row?.rank ?? "-"}
            </span>
          </article>
        </div>

        <div style={gridStyle}>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.missingTasks}</p>
            {renderChips(winnersExportStatus.row?.missingTasks ?? [], copy.noMissingTasks)}
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.riskFlags}</p>
            {renderChips(winnersExportStatus.row?.riskFlags ?? [], copy.riskClear)}
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.missingColumns}</p>
            {renderChips(winnersExportStatus.row?.missingColumnValues ?? [], "-")}
          </article>
        </div>

        <div style={gridStyle}>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.taskRecords}</p>
            {renderChips(winnersExportStatus.row?.taskRecords ?? [], copy.noTaskRecords)}
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.evidenceHashes}</p>
            {renderChips(winnersExportStatus.row?.evidenceHashes ?? [], copy.noEvidenceHashes)}
          </article>
        </div>

        <div style={gridStyle}>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.nextAction}</p>
            <strong>{getLocalizedText(winnersExportStatus.nextAction, locale)}</strong>
          </article>
          <article style={cardStyle}>
            <p style={labelStyle}>{copy.fulfillmentOwner}</p>
            <strong>{getLocalizedText(winnersExportStatus.fulfillmentOwner, locale)}</strong>
          </article>
        </div>

        <p style={{ color: "#92400e", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
          {getLocalizedText(winnersExportStatus.rewardBoundary, locale)}
        </p>
      </section>

      <section style={panelStyle}>
        <div style={rowStyle}>
          <h3 style={{ fontSize: 20, margin: 0 }}>{copy.taskVerification}</h3>
          <span style={{ color: "#64748b", fontSize: 13, fontWeight: 800 }}>
            {completedCount}/{campaign.tasks.length} {copy.completed}
          </span>
        </div>
        <ul style={listStyle}>
          {campaign.tasks.map((task) => {
            const state = taskStates.find((taskState) => taskState.taskId === task.id);
            const action = state ? deriveTaskVerificationAction(task, state) : undefined;
            const actionKind = action?.kind ?? "verify";
            const actionProofType: TaskVerificationProofType | undefined =
              actionKind === "submit_proof" ? "screenshot" : undefined;
            const latestAction = latestTaskActions[task.id];

            return (
              <li key={task.id} style={listItemStyle}>
                <div style={rowStyle}>
                  <div style={{ display: "grid", gap: 4 }}>
                    <strong>{getLocalizedText(task.title, locale)}</strong>
                    <span style={{ color: "#475569", fontSize: 13, lineHeight: 1.4 }}>
                      {getLocalizedText(task.instruction, locale)}
                    </span>
                  </div>
                  <PublishStateBadge
                    label={state ? taskStatusLabel(state.status, copy) : copy.ready}
                    state={taskBadgeState(state?.status ?? "ready")}
                  />
                </div>
                <div style={rowStyle}>
                  <button
                    disabled={!action?.enabled}
                    onClick={() => runLocalTaskAction(task.id, actionKind, actionProofType)}
                    style={action?.enabled ? compactActionButtonStyle : disabledActionButtonStyle}
                    type="button"
                  >
                    {taskActionLabel(actionKind, copy)}
                  </button>
                  <span style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>
                    {copy.localOnlyActionBoundary}
                  </span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <WalletCompatibilityBadge compatibility={task.walletCompatibility} />
                  {(() => {
                    const localeStatus = task.localeStatus[locale] ?? task.localeStatus["en-US"];

                    return (
                      <LocaleStatusBadge
                        label={`${copy.localeReadiness}: ${localeStatusLabel(localeStatus, locale)}`}
                        status={localeStatus}
                      />
                    );
                  })()}
                  <span style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
                    {copy.verification}: {task.verificationType}
                  </span>
                  <span style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
                    {copy.evidenceSource}: {state ? formatSource(state.evidenceSource) : "-"}
                  </span>
                  <span style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
                    {copy.evidenceCategory}: {state?.canonicalEvidenceSource ?? "-"}
                  </span>
                  <span style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
                    {copy.evidenceHashes}: {state?.evidence.evidenceHash ?? "-"}
                  </span>
                  <span style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
                    {copy.pointsAwarded}: {state?.pointsAwarded ?? 0}/{state?.pointsAvailable ?? task.points}
                  </span>
                  <span style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
                    {copy.providerReadiness}: {state ? formatSource(state.provider.readiness) : "-"}
                  </span>
                  <span style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
                    {copy.riskFlags}: {state?.riskFlags.join(", ") || copy.riskClear}
                  </span>
                </div>
                <p style={{ color: state?.provider.fallbackReason ? "#92400e" : "#475569", fontSize: 13, fontWeight: state?.provider.fallbackReason ? 800 : 700, lineHeight: 1.45, margin: 0 }}>
                  {copy.fallbackReason}:{" "}
                  {state?.provider.fallbackReason
                    ? getLocalizedText(state.provider.fallbackReason, locale)
                    : copy.noProviderFallback}
                </p>
                <p style={{ color: state?.manualReview.queued ? "#92400e" : "#475569", fontSize: 13, fontWeight: state?.manualReview.queued ? 800 : 700, lineHeight: 1.45, margin: 0 }}>
                  {copy.manualReview}:{" "}
                  {state?.manualReview.queued
                    ? `${state.manualReview.queueId ?? copy.manualReview} · ${
                        state.manualReview.reason
                          ? getLocalizedText(state.manualReview.reason, locale)
                          : copy.manualReview
                      }`
                    : copy.noManualReview}
                </p>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                  {copy.nextAction}: {state ? getLocalizedText(state.nextAction, locale) : "-"}
                </p>
                {latestAction ? (
                  <article
                    aria-label={`${copy.latestLocalAction}: ${getLocalizedText(task.title, locale)}`}
                    style={{ ...cardStyle, background: latestAction.ok ? "#ffffff" : "#fff7ed" }}
                  >
                    <div style={rowStyle}>
                      <strong>{copy.latestLocalAction}</strong>
                      <PublishStateBadge
                        label={
                          latestAction.ok
                            ? taskStatusLabel(latestAction.payload.status, copy)
                            : copy.localValidationFailure
                        }
                        state={latestAction.ok ? taskBadgeState(latestAction.payload.status) : "blocker"}
                      />
                    </div>
                    {latestAction.ok ? (
                      <>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          <span style={chipStyle}>
                            {copy.actionKind}: {taskActionLabel(latestAction.payload.kind, copy)}
                          </span>
                          <span style={chipStyle}>
                            {copy.localAttempt}: {latestAction.payload.attemptLabel}
                          </span>
                          <span style={chipStyle}>
                            {copy.providerReadiness}: {formatSource(latestAction.payload.provider.readiness)}
                          </span>
                          <span style={chipStyle}>
                            {copy.pointsAwarded}: {latestAction.payload.pointsAwarded}/
                            {latestAction.payload.pointsAvailable}
                          </span>
                          <span style={chipStyle}>
                            {copy.evidenceHashes}: {latestAction.payload.evidenceHash}
                          </span>
                          {latestAction.payload.proof ? (
                            <>
                              <span style={chipStyle}>
                                {copy.proofType}: {formatSource(latestAction.payload.proof.proofType)}
                              </span>
                              <span style={chipStyle}>{copy.noUploadExecuted}</span>
                            </>
                          ) : null}
                          {latestAction.payload.manualReview.queueId ? (
                            <span style={chipStyle}>
                              {copy.manualQueue}: {latestAction.payload.manualReview.queueId}
                            </span>
                          ) : null}
                        </div>
                        {latestAction.payload.provider.fallbackReason ? (
                          <p style={{ color: "#92400e", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                            {copy.fallbackReason}:{" "}
                            {getLocalizedText(latestAction.payload.provider.fallbackReason, locale)}
                          </p>
                        ) : null}
                        {latestAction.payload.manualReview.reason ? (
                          <p style={{ color: "#92400e", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                            {copy.manualReview}:{" "}
                            {getLocalizedText(latestAction.payload.manualReview.reason, locale)}
                          </p>
                        ) : null}
                        <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                          {copy.nextAction}: {getLocalizedText(latestAction.payload.nextAction, locale)}
                        </p>
                        <p style={{ color: "#92400e", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                          {getLocalizedText(latestAction.payload.boundary, locale)}{" "}
                          {copy.noLiveProviderBoundary} {copy.noRewardDistributionBoundary}
                        </p>
                      </>
                    ) : (
                      <p style={{ color: "#92400e", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
                        {getLocalizedText(latestAction.error.message, locale)}
                      </p>
                    )}
                  </article>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section style={gridStyle}>
        <article style={panelStyle}>
          <h3 style={{ fontSize: 20, margin: 0 }}>{copy.rewards}</h3>
          <div style={metricGridStyle}>
            <div style={cardStyle}>
              <p style={labelStyle}>{copy.points}</p>
              <p style={valueStyle}>{participant.totalPoints}</p>
            </div>
            <div style={cardStyle}>
              <p style={labelStyle}>{copy.rank}</p>
              <p style={valueStyle}>#{participant.rank}</p>
            </div>
            <div style={cardStyle}>
              <p style={labelStyle}>{copy.completed}</p>
              <p style={valueStyle}>
                {participation.metrics.completedTasks}/{participation.metrics.totalTasks}
              </p>
            </div>
            <div style={cardStyle}>
              <p style={labelStyle}>{copy.eligibleCutoff}</p>
              <p style={valueStyle}>#{participation.metrics.eligibleRankCutoff}</p>
            </div>
          </div>
          <p style={{ color: "#92400e", fontSize: 13, fontWeight: 700, margin: 0 }}>
            {copy.noLiveLedger}
          </p>
          <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
            {getLocalizedText(participation.rewardBoundary, locale)}
          </p>
        </article>

        <article style={panelStyle}>
          <div style={rowStyle}>
            <h3 style={{ fontSize: 20, margin: 0 }}>{copy.referral}</h3>
            <PublishStateBadge label={copy.referralValue} state="warning" />
          </div>
          <dl style={{ display: "grid", gap: 10, margin: 0 }}>
            {[
              [copy.inviteLink, participation.referral.inviteLink],
              [copy.invitedCount, String(participation.referral.invitedCount)],
              [copy.qualifiedInvitees, String(participation.referral.qualifiedInvitees)],
              [copy.referralPoints, String(participation.referral.referralPoints)],
              [copy.riskFlags, participation.referral.riskFlags.join(", ") || copy.riskClear],
            ].map(([label, value]) => (
              <div key={label} style={rowStyle}>
                <dt style={{ color: "#64748b", fontSize: 13, fontWeight: 800 }}>{label}</dt>
                <dd style={{ color: "#071426", fontSize: 13, fontWeight: 700, margin: 0 }}>
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
            {getLocalizedText(participation.referral.antiFarmRule, locale)}
          </p>
        </article>
      </section>

      <section aria-label={copy.leaderboard} style={panelStyle}>
        <div style={rowStyle}>
          <div>
            <p style={labelStyle}>{copy.leaderboardMode}</p>
            <h3 style={{ fontSize: 20, margin: "2px 0 0" }}>{copy.leaderboard}</h3>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: "6px 0 0" }}>
              {getLocalizedText(leaderboard.summary, locale)}
            </p>
          </div>
          <span style={{ color: "#64748b", fontSize: 13, fontWeight: 800 }}>
            {copy.rowCount}: {leaderboard.rows.length}
          </span>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {leaderboard.modes.map((mode) => {
              const isSelected = mode.id === leaderboard.selectedMode;

              return (
                <button
                  aria-pressed={isSelected}
                  key={mode.id}
                  onClick={() => setLeaderboardMode(mode.id)}
                  style={isSelected ? activeChoiceButtonStyle : secondaryButtonStyle}
                  type="button"
                >
                  {getLocalizedText(mode.label, locale)}
                </button>
              );
            })}
          </div>
          <div style={cardStyle}>
            <p style={labelStyle}>{copy.activeMode}</p>
            <strong>
              {getLocalizedText(
                leaderboard.modes.find((mode) => mode.id === leaderboard.selectedMode)?.label ??
                  leaderboard.modes[0].label,
                locale,
              )}
            </strong>
            <span style={{ color: "#475569", fontSize: 13, lineHeight: 1.45 }}>
              {getLocalizedText(
                leaderboard.modes.find((mode) => mode.id === leaderboard.selectedMode)?.description ??
                  leaderboard.modes[0].description,
                locale,
              )}
            </span>
            <span style={{ color: "#92400e", fontSize: 13, fontWeight: 800, lineHeight: 1.45 }}>
              {copy.qualityPolicy}: {getLocalizedText(leaderboard.qualityPolicy, locale)}
            </span>
          </div>
        </div>

        <div style={{ maxWidth: "100%", minWidth: 0, overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{copy.rank}</th>
                <th style={thStyle}>{copy.walletAddress}</th>
                <th style={thStyle}>{copy.walletType}</th>
                <th style={thStyle}>{copy.points}</th>
                <th style={thStyle}>{copy.verifiedActions}</th>
                <th style={thStyle}>{copy.onChainActions}</th>
                <th style={thStyle}>
                  {copy.referralPoints} / {copy.qualifiedInvitees}
                </th>
                <th style={thStyle}>{copy.eligibility}</th>
                <th style={thStyle}>{copy.riskLevel}</th>
                <th style={thStyle}>{copy.modeScore}</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.rows.map((row) => (
                <tr key={row.walletAddress}>
                  <td style={tdStyle}>#{row.rank}</td>
                  <td style={tdStyle}>{row.walletAddress}</td>
                  <td style={tdStyle}>{getWalletBadgeLabel(row.accountType, row.walletSource)}</td>
                  <td style={tdStyle}>{row.totalPoints}</td>
                  <td style={tdStyle}>{row.verifiedActionCount}</td>
                  <td style={tdStyle}>{row.onChainActionCount}</td>
                  <td style={tdStyle}>
                    {row.referralPoints} / {row.qualifiedInvitees}
                  </td>
                  <td style={tdStyle}>{row.eligible ? copy.eligible : copy.notEligible}</td>
                  <td style={tdStyle}>
                    {row.riskLevel}
                    <br />
                    <span style={{ color: "#64748b" }}>
                      {row.riskFlags.join(", ") || copy.riskClear}
                    </span>
                  </td>
                  <td style={tdStyle}>{row.modeScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ color: "#92400e", fontSize: 13, fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
          {getLocalizedText(leaderboard.boundary, locale)}
        </p>
      </section>
    </div>
  );
};
