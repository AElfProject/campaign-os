import type { CSSProperties } from "react";
import {
  campaignDetail,
  createParticipationReadModel,
  createWalletConnectionDiagnostics,
  getWalletBadgeLabel,
  getLocalizedText,
  walletOptions,
  type CampaignShellDetail,
  type CampaignStatus,
  type EligibilityStatus,
  type LocalizedText,
  type LocaleStatus,
  type NormalizedWalletSession,
  type ParticipantSnapshot,
  type SupportedLocale,
  type TaskVerificationStatus,
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
import { userAppCopy } from "./copy";

interface UserAppPanelProps {
  campaign?: CampaignShellDetail;
  locale: SupportedLocale;
  participant?: ParticipantSnapshot;
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
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
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

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "short" }).format(new Date(iso));

const daysUntil = (iso: string) => {
  const msPerDay = 24 * 60 * 60 * 1000;
  const now = Date.UTC(2026, 5, 27);
  const end = new Date(iso).getTime();

  return Math.max(0, Math.ceil((end - now) / msPerDay));
};

const contractModeLabel = (mode: CampaignShellDetail["contractMode"]) => mode.replace(/_/g, " ");

const formatSource = (value: string) => value.replace(/_/g, " ");

const formatTimestamp = (iso?: string) =>
  iso
    ? new Intl.DateTimeFormat("en-US", {
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
      }).format(new Date(iso))
    : "-";

const localeStatusLabel = (status: LocaleStatus, locale: SupportedLocale) => {
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
  } satisfies Record<SupportedLocale, Record<LocaleStatus, string>>;

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

const diagnosticBadgeState = (state: WalletDiagnosticState) => state;

const campaignStatusLabel = (status: CampaignStatus, copy: typeof userAppCopy["en-US"]) => {
  const labels: Record<CampaignStatus, string> = {
    draft: "Draft",
    scheduled: copy.comingSoon,
    live: copy.active,
    paused: "Paused",
    ended: copy.ended,
    exported: "Exported",
  };

  return labels[status];
};

const campaignStatusState = (status: CampaignStatus) => {
  if (status === "live") {
    return "ready";
  }

  if (status === "scheduled" || status === "paused") {
    return "warning";
  }

  return "blocker";
};

const sessionForParticipant = (
  campaign: CampaignShellDetail,
  participant: ParticipantSnapshot,
) =>
  campaign.walletSessions.find(
    (session) =>
      session.sessionId === participant.walletSessionId ||
      session.address === participant.walletAddress,
  ) ?? campaign.walletSessions[0];

interface CampaignFeedItem {
  id: string;
  title: LocalizedText;
  campaignType: string;
  status: CampaignStatus;
  points: number;
  endTime: string;
  coreTasks: LocalizedText[];
  cta: keyof Pick<typeof userAppCopy["en-US"], "checkEligibility" | "continueTasks" | "start">;
}

const createCampaignFeed = (
  campaign: CampaignShellDetail,
  participant: ParticipantSnapshot,
): CampaignFeedItem[] => [
  {
    id: campaign.id,
    title: campaign.title,
    campaignType: "Bridge / Swap / Invite",
    status: campaign.status,
    points: campaign.tasks.reduce((total, task) => total + task.points, 0),
    endTime: campaign.endTime,
    coreTasks: campaign.tasks.slice(0, 3).map((task) => task.title),
    cta: participant.missingTaskIds.length > 0 ? "continueTasks" : "checkEligibility",
  },
  {
    id: "camp-forest-nft-path",
    title: {
      "en-US": "Forest NFT Quest",
      "zh-CN": "Forest NFT 任务",
    },
    campaignType: "NFT / DAO",
    status: "scheduled",
    points: 260,
    endTime: "2026-07-12T00:00:00Z",
    coreTasks: [
      {
        "en-US": "Hold Forest NFT",
        "zh-CN": "持有 Forest NFT",
      },
      {
        "en-US": "Vote on TMRWDAO",
        "zh-CN": "参与 TMRWDAO 投票",
      },
      {
        "en-US": "Invite one qualified friend",
        "zh-CN": "邀请 1 位合格好友",
      },
    ],
    cta: "start",
  },
  {
    id: "camp-tmrwdao-streak",
    title: {
      "en-US": "TMRWDAO Governance Streak",
      "zh-CN": "TMRWDAO 治理连续任务",
    },
    campaignType: "DAO / Referral",
    status: "ended",
    points: 180,
    endTime: "2026-06-18T00:00:00Z",
    coreTasks: [
      {
        "en-US": "Vote on proposal",
        "zh-CN": "完成提案投票",
      },
      {
        "en-US": "Review points",
        "zh-CN": "查看积分",
      },
      {
        "en-US": "Check winners export",
        "zh-CN": "检查 winners 导出",
      },
    ],
    cta: "checkEligibility",
  },
];

const WalletSessionCard = ({
  copy,
  locale,
  session,
}: {
  copy: typeof userAppCopy["en-US"];
  locale: SupportedLocale;
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
  item: CampaignFeedItem;
  locale: SupportedLocale;
}) => (
  <article style={{ ...cardStyle, alignContent: "space-between" }}>
    <div style={rowStyle}>
      <div style={{ display: "grid", gap: 4 }}>
        <p style={labelStyle}>{item.campaignType}</p>
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
        <li key={getLocalizedText(task, locale)} style={{ color: "#475569", fontSize: 13 }}>
          {getLocalizedText(task, locale)}
        </li>
      ))}
    </ol>
    <button
      style={{
        ...buttonStyle,
        background: item.status === "ended" ? "#ffffff" : buttonStyle.background,
        color: item.status === "ended" ? "#1c64f2" : buttonStyle.color,
      }}
      type="button"
    >
      {copy[item.cta]}
    </button>
  </article>
);

export const UserAppPanel = ({
  campaign = campaignDetail,
  locale,
  participant = campaignDetail.participants[1],
}: UserAppPanelProps) => {
  const copy = userAppCopy[locale];
  const participation = createParticipationReadModel(campaign, participant);
  const taskStates = participation.taskStates;
  const completedCount = taskStates.filter((task) => task.completed).length;
  const title = getLocalizedText(campaign.title, locale);
  const subtitle = getLocalizedText(campaign.subtitle, locale);
  const selectedWallet = sessionForParticipant(campaign, participant);
  const walletDiagnostics = createWalletConnectionDiagnostics(campaign.walletSessions);
  const missingTasks = campaign.tasks.filter((task) =>
    participation.eligibility.missingTaskIds.includes(task.id),
  );
  const campaignFeed = createCampaignFeed(campaign, participant);
  const appHubCampaign = campaignFeed[0];
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

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section style={panelStyle}>
        <div style={rowStyle}>
          <div>
            <p style={labelStyle}>{copy.feedTitle}</p>
            <h2 style={{ fontSize: 30, lineHeight: 1.1, margin: "4px 0" }}>{copy.feedTitle}</h2>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
              {copy.feedSubtitle}
            </p>
          </div>
          <button style={buttonStyle} type="button">
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
                [copy.appHubCampaigns, `${campaignFeed.filter((item) => item.status === "live").length} ${copy.active}`],
                [copy.eligibility, eligibilityLabel(participation.eligibility.status, copy)],
                [copy.walletType, getWalletBadgeLabel(selectedWallet.accountType, selectedWallet.walletSource)],
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
                  {copy.appHubGuideText}
                </strong>
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
                  {copy.continueTasks}
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
                <p style={labelStyle}>{copy.appHubQuickActions}</p>
                <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
                  {[copy.appHubPay, copy.appHubPortfolio, copy.appHubForecast, copy.inviteLink].map(
                    (action) => (
                      <button
                        key={action}
                        style={{
                          ...buttonStyle,
                          background: "#ffffff",
                          color: "#1c64f2",
                          minHeight: 36,
                          width: "100%",
                        }}
                        type="button"
                      >
                        {action}
                      </button>
                    ),
                  )}
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

      <section style={panelStyle}>
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

      <section style={panelStyle}>
        <div style={rowStyle}>
          <div>
            <p style={labelStyle}>{copy.status}</p>
            <h3 style={{ fontSize: 20, margin: "2px 0 0" }}>{copy.eligibility}</h3>
          </div>
          <PublishStateBadge
            label={eligibilityLabel(participation.eligibility.status, copy)}
            state={eligibilityBadgeState(participation.eligibility.status)}
          />
        </div>

        <div style={metricGridStyle}>
          <div style={cardStyle}>
            <p style={labelStyle}>{copy.score}</p>
            <p style={valueStyle}>{participation.eligibility.score}</p>
            <span style={{ color: "#475569", fontSize: 13 }}>
              {copy.pointsThreshold}: {participation.eligibility.pointsThreshold}
            </span>
          </div>
          <div style={cardStyle}>
            <p style={labelStyle}>{copy.completedRequired}</p>
            <p style={valueStyle}>
              {participation.metrics.completedRequiredTasks}/{participation.metrics.totalRequiredTasks}
            </p>
            <span style={{ color: "#475569", fontSize: 13 }}>
              {copy.rank}: #{participation.metrics.participantRank}
            </span>
          </div>
          <div style={cardStyle}>
            <p style={labelStyle}>{copy.walletType}</p>
            <WalletBadge
              accountType={participant.accountType}
              walletSource={participant.walletSource}
            />
            {participation.eligibility.walletStatus ? (
              <WalletVerificationBadge
                label={getLocalizedText(participation.eligibility.walletStatus.statusMessage, locale)}
                status={participation.eligibility.walletStatus.verificationStatus}
              />
            ) : null}
            <span style={{ color: "#475569", fontSize: 13 }}>
              {copy.walletAddress}: {participant.walletAddress}
            </span>
            <span style={{ color: "#475569", fontSize: 13 }}>
              {copy.walletTypeVerified}:{" "}
              {participation.eligibility.walletStatus?.walletTypeVerified
                ? copy.eligible
                : copy.notEligible}
            </span>
          </div>
        </div>

        <div style={gridStyle}>
          <div style={cardStyle}>
            <p style={labelStyle}>{copy.missingTasks}</p>
            {missingTasks.length > 0 ? (
              <ul style={{ display: "grid", gap: 6, margin: 0, paddingInlineStart: 18 }}>
                {missingTasks.map((task) => (
                  <li key={task.id}>
                    <strong>{getLocalizedText(task.title, locale)}</strong>
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
              {participation.eligibility.riskFlags.join(", ") || copy.riskClear}
            </strong>
          </div>
          <div style={cardStyle}>
            <p style={labelStyle}>{copy.nextAction}</p>
            <strong>{getLocalizedText(participation.eligibility.nextAction, locale)}</strong>
            <span style={{ color: "#475569", fontSize: 13 }}>
              {getLocalizedText(participation.eligibility.reason, locale)}
            </span>
          </div>
        </div>
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
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <WalletCompatibilityBadge compatibility={task.walletCompatibility} />
                  <LocaleStatusBadge
                    label={`${copy.localeReadiness}: ${localeStatusLabel(task.localeStatus[locale], locale)}`}
                    status={task.localeStatus[locale]}
                  />
                  <span style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
                    {copy.verification}: {task.verificationType}
                  </span>
                  <span style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
                    {copy.evidenceSource}: {state ? formatSource(state.evidenceSource) : "-"}
                  </span>
                  <span style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
                    {copy.pointsAwarded}: {state?.pointsAwarded ?? 0}/{state?.pointsAvailable ?? task.points}
                  </span>
                  <span style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
                    Risk: {task.riskLevel}
                  </span>
                </div>
                <p style={{ color: "#475569", fontSize: 13, lineHeight: 1.45, margin: 0 }}>
                  {copy.nextAction}: {state ? getLocalizedText(state.nextAction, locale) : "-"}
                </p>
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

      <section style={panelStyle}>
        <div style={rowStyle}>
          <h3 style={{ fontSize: 20, margin: 0 }}>{copy.leaderboard}</h3>
          <span style={{ color: "#64748b", fontSize: 13, fontWeight: 800 }}>
            {participation.leaderboard.length} rows
          </span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>{copy.rank}</th>
                <th style={thStyle}>{copy.walletAddress}</th>
                <th style={thStyle}>{copy.walletType}</th>
                <th style={thStyle}>{copy.points}</th>
                <th style={thStyle}>{copy.eligibility}</th>
                <th style={thStyle}>{copy.riskFlags}</th>
              </tr>
            </thead>
            <tbody>
              {participation.leaderboard.map((row) => (
                <tr key={row.walletAddress}>
                  <td style={tdStyle}>#{row.rank}</td>
                  <td style={tdStyle}>{row.walletAddress}</td>
                  <td style={tdStyle}>{getWalletBadgeLabel(row.accountType, row.walletSource)}</td>
                  <td style={tdStyle}>{row.totalPoints}</td>
                  <td style={tdStyle}>{row.eligible ? copy.eligible : copy.notEligible}</td>
                  <td style={tdStyle}>{row.riskFlags.join(", ") || copy.riskClear}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
