import type { CSSProperties } from "react";
import {
  campaignDetail,
  createParticipationReadModel,
  getWalletBadgeLabel,
  getLocalizedText,
  walletOptions,
  type CampaignShellDetail,
  type EligibilityStatus,
  type LocaleStatus,
  type NormalizedWalletSession,
  type ParticipantSnapshot,
  type SupportedLocale,
  type TaskVerificationStatus,
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

const sessionForParticipant = (
  campaign: CampaignShellDetail,
  participant: ParticipantSnapshot,
) =>
  campaign.walletSessions.find(
    (session) =>
      session.sessionId === participant.walletSessionId ||
      session.address === participant.walletAddress,
  ) ?? campaign.walletSessions[0];

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
  const missingTasks = campaign.tasks.filter((task) =>
    participation.eligibility.missingTaskIds.includes(task.id),
  );

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section style={panelStyle}>
        <div style={rowStyle}>
          <div>
            <p style={labelStyle}>{copy.feedTitle}</p>
            <h2 style={{ fontSize: 30, lineHeight: 1.1, margin: "4px 0" }}>{title}</h2>
            <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>{subtitle}</p>
          </div>
          <button style={buttonStyle} type="button">
            {copy.connectWallet}
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
