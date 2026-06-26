import type { CSSProperties } from "react";
import {
  campaignDetail,
  deriveParticipantTaskStates,
  getLocalizedText,
  walletOptions,
  walletSessions,
  type CampaignShellDetail,
  type LocaleStatus,
  type ParticipantSnapshot,
  type SupportedLocale,
} from "../../../domain";
import {
  ContractModeBadge,
  LocaleStatusBadge,
  PublishStateBadge,
  WalletBadge,
  WalletCompatibilityBadge,
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

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "short" }).format(new Date(iso));

const contractModeLabel = (mode: CampaignShellDetail["contractMode"]) => mode.replace(/_/g, " ");

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

export const UserAppPanel = ({
  campaign = campaignDetail,
  locale,
  participant = campaignDetail.participants[1],
}: UserAppPanelProps) => {
  const copy = userAppCopy[locale];
  const disconnectedWallet = walletSessions.find((session) => session.accountType === "UNKNOWN");
  const taskStates = deriveParticipantTaskStates(campaign.tasks, participant);
  const completedCount = taskStates.filter((task) => task.completed).length;
  const title = getLocalizedText(campaign.title, locale);
  const subtitle = getLocalizedText(campaign.subtitle, locale);
  const selectedWallet = disconnectedWallet ?? walletSessions[2];

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

      <WalletOptionCards copy={copy} options={walletOptions} />

      <section style={panelStyle}>
        <div style={rowStyle}>
          <h3 style={{ fontSize: 20, margin: 0 }}>{copy.taskList}</h3>
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
                    label={state?.completed ? copy.completed : copy.missingTasks}
                    state={state?.missingRequired ? "warning" : "ready"}
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
                    {copy.points}: {task.points}
                  </span>
                  <span style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
                    Risk: {task.riskLevel}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section style={gridStyle}>
        <article style={panelStyle}>
          <h3 style={{ fontSize: 20, margin: 0 }}>{copy.rewards}</h3>
          <div style={gridStyle}>
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
              <p style={valueStyle}>{completedCount}</p>
            </div>
          </div>
          <p style={{ color: "#475569", lineHeight: 1.5, margin: 0 }}>
            {copy.referral}: {copy.referralValue}
          </p>
          <p style={{ color: "#92400e", fontSize: 13, fontWeight: 700, margin: 0 }}>
            {copy.noLiveLedger}
          </p>
        </article>

        <article style={panelStyle}>
          <div style={rowStyle}>
            <h3 style={{ fontSize: 20, margin: 0 }}>{copy.eligibility}</h3>
            <PublishStateBadge
              label={participant.eligible ? copy.eligible : copy.ineligible}
              state={participant.eligible ? "ready" : "warning"}
            />
          </div>
          <dl style={{ display: "grid", gap: 10, margin: 0 }}>
            {[
              [copy.walletAddress, participant.walletAddress],
              [copy.walletType, participant.accountType],
              [copy.walletSource, participant.walletSource],
              [copy.localePreference, participant.localePreference],
              [copy.missingTasks, participant.missingTaskIds.join(", ") || "-"],
              [copy.riskFlags, participant.riskFlags.join(", ") || "-"],
              [copy.nextAction, participant.eligible ? copy.eligible : copy.recoverMissing],
            ].map(([label, value]) => (
              <div key={label} style={rowStyle}>
                <dt style={{ color: "#64748b", fontSize: 13, fontWeight: 800 }}>{label}</dt>
                <dd style={{ color: "#071426", fontSize: 13, fontWeight: 700, margin: 0 }}>
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </article>
      </section>
    </div>
  );
};
