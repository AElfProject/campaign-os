import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  type CSSProperties,
} from "react";
import type {
  ParticipantJourneyApiBridge,
  ParticipantJourneyFailure,
  ParticipantJourneyMode,
  ParticipantJourneyResult,
  ParticipantVerifyResult,
} from "../../../api/participantJourneyApiBridge";
import type { NormalizedWalletSession, SupportedLocale } from "../../../domain";
import {
  canReconnectParticipantJourney,
  canSelectParticipantCampaign,
  canVerifyParticipantJourneyTask,
  createParticipantJourneyWorkflowState,
  createParticipantSessionKey,
  nextParticipantJourneyRequestToken,
  participantJourneyWorkflowReducer,
  selectParticipantJourneyRetryOperation,
  type ParticipantJourneyRequestOperation,
  type ParticipantJourneyRequestReason,
  type ParticipantJourneyRequestToken,
  type ParticipantJourneyWorkflowEvent,
  type ParticipantJourneyWorkflowState,
} from "./participantJourneyWorkflow";

type BusinessContentLocale = Exclude<
  SupportedLocale,
  "ja-JP" | "ko-KR" | "vi-VN" | "id-ID" | "tr-TR" | "es-ES"
>;

export interface DurableParticipantJourneyPanelProps {
  bridge: ParticipantJourneyApiBridge;
  locale: BusinessContentLocale;
  mode: Extract<ParticipantJourneyMode, "durable">;
  onReconnect: () => void;
  session: NormalizedWalletSession | null;
  sessionReady: boolean;
}

const durableCopy = {
  "en-US": {
    blocked: "Participant journey unavailable",
    campaignFeed: "Campaign feed",
    campaignId: "Campaign ID",
    campaignStatus: "Persisted status",
    commandTrace: "Command Trace ID",
    completed: "Task completed",
    completion: "Completion",
    diagnostic: "Request diagnostic",
    eligibility: "Eligibility",
    emptyFeed: "No Campaigns are available for this wallet.",
    evidence: "Evidence",
    feedLoading: "Loading Campaign feed",
    journey: "Participant journey",
    journeyLoading: "Loading Participant journey",
    missingTasks: "Missing Tasks",
    noCompletion: "No completion",
    noEvidence: "No evidence",
    noMissingTasks: "None",
    noRiskFlags: "None",
    notRanked: "Not ranked",
    participantCount: "Participants",
    participantPreview: "Participant preview",
    points: "Points",
    rank: "Rank",
    reconnect: "Reconnect wallet",
    refreshing: "Refreshing journey",
    retryFeed: "Retry Campaign feed",
    retryJourney: "Retry journey read",
    riskFlags: "Risk flags",
    selectCampaign: "Select",
    sessionRequired: "An API-issued wallet session is required.",
    status: "Status",
    task: "Task",
    tasks: "Tasks",
    verify: "Verify Task",
    verifying: "Verifying Task",
  },
  "zh-CN": {
    blocked: "参与旅程暂不可用",
    campaignFeed: "活动列表",
    campaignId: "活动 ID",
    campaignStatus: "持久化状态",
    commandTrace: "命令 Trace ID",
    completed: "任务已完成",
    completion: "完成记录",
    diagnostic: "请求诊断",
    eligibility: "资格",
    emptyFeed: "当前钱包暂无可参与活动。",
    evidence: "证据",
    feedLoading: "正在加载活动列表",
    journey: "参与者旅程",
    journeyLoading: "正在加载参与者旅程",
    missingTasks: "未完成任务",
    noCompletion: "暂无完成记录",
    noEvidence: "暂无证据",
    noMissingTasks: "无",
    noRiskFlags: "无",
    notRanked: "暂无排名",
    participantCount: "参与人数",
    participantPreview: "参与者预览",
    points: "积分",
    rank: "排名",
    reconnect: "重新连接钱包",
    refreshing: "正在刷新旅程",
    retryFeed: "重试活动列表",
    retryJourney: "重试读取旅程",
    riskFlags: "风险标记",
    selectCampaign: "选择",
    sessionRequired: "需要 API 签发的钱包会话。",
    status: "状态",
    task: "任务",
    tasks: "任务",
    verify: "验证任务",
    verifying: "正在验证任务",
  },
  "zh-TW": {
    blocked: "參與旅程暫不可用",
    campaignFeed: "活動列表",
    campaignId: "活動 ID",
    campaignStatus: "持久化狀態",
    commandTrace: "命令 Trace ID",
    completed: "任務已完成",
    completion: "完成記錄",
    diagnostic: "請求診斷",
    eligibility: "資格",
    emptyFeed: "目前錢包暫無可參與活動。",
    evidence: "證據",
    feedLoading: "正在載入活動列表",
    journey: "參與者旅程",
    journeyLoading: "正在載入參與者旅程",
    missingTasks: "未完成任務",
    noCompletion: "暫無完成記錄",
    noEvidence: "暫無證據",
    noMissingTasks: "無",
    noRiskFlags: "無",
    notRanked: "暫無排名",
    participantCount: "參與人數",
    participantPreview: "參與者預覽",
    points: "積分",
    rank: "排名",
    reconnect: "重新連接錢包",
    refreshing: "正在重新整理旅程",
    retryFeed: "重試活動列表",
    retryJourney: "重試讀取旅程",
    riskFlags: "風險標記",
    selectCampaign: "選擇",
    sessionRequired: "需要 API 簽發的錢包工作階段。",
    status: "狀態",
    task: "任務",
    tasks: "任務",
    verify: "驗證任務",
    verifying: "正在驗證任務",
  },
} satisfies Record<BusinessContentLocale, Record<string, string>>;

const rootStyle: CSSProperties = {
  display: "grid",
  gap: 18,
  maxWidth: "100%",
  minWidth: 0,
  width: "100%",
};

const bandStyle: CSSProperties = {
  background: "#ffffff",
  borderBottom: "1px solid #dbe6f4",
  borderTop: "1px solid #dbe6f4",
  display: "grid",
  gap: 14,
  minWidth: 0,
  padding: "18px 4px",
};

const feedGridStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
  minWidth: 0,
};

const feedItemStyle: CSSProperties = {
  background: "#f8fbff",
  border: "1px solid #dbe6f4",
  borderRadius: 8,
  display: "grid",
  gap: 10,
  minWidth: 0,
  padding: 14,
};

const metricsStyle: CSSProperties = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
  margin: 0,
  minWidth: 0,
};

const metricStyle: CSSProperties = {
  borderLeft: "3px solid #1c64f2",
  display: "grid",
  gap: 4,
  minWidth: 0,
  padding: "4px 10px",
};

const buttonStyle: CSSProperties = {
  alignItems: "center",
  background: "#1c64f2",
  borderColor: "#1c64f2",
  borderRadius: 8,
  borderStyle: "solid",
  borderWidth: 1,
  color: "#ffffff",
  cursor: "pointer",
  display: "inline-flex",
  fontWeight: 800,
  justifyContent: "center",
  lineHeight: 1.25,
  minHeight: 42,
  minWidth: 148,
  overflowWrap: "anywhere",
  padding: "8px 12px",
  textAlign: "center",
  whiteSpace: "normal",
};

const secondaryButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: "#ffffff",
  borderColor: "#94a3b8",
  color: "#071426",
};

const selectedButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: "#071426",
  borderColor: "#071426",
};

const disabledButtonStyle: CSSProperties = {
  ...secondaryButtonStyle,
  background: "#e2e8f0",
  color: "#475569",
  cursor: "not-allowed",
};

const badgeStyle = (tone: "neutral" | "preview" | "status"): CSSProperties => ({
  background: tone === "preview" ? "#fff7ed" : tone === "status" ? "#ecfdf5" : "#eef2ff",
  border: `1px solid ${tone === "preview" ? "#fdba74" : tone === "status" ? "#86efac" : "#c7d2fe"}`,
  borderRadius: 999,
  color: tone === "preview" ? "#9a3412" : tone === "status" ? "#166534" : "#3730a3",
  display: "inline-flex",
  fontSize: 12,
  fontWeight: 800,
  maxWidth: "100%",
  overflowWrap: "anywhere",
  padding: "4px 8px",
});

const safeUnexpectedFailure = (
  operation: ParticipantJourneyRequestOperation,
  token: ParticipantJourneyRequestToken,
): ParticipantJourneyFailure => ({
  code: "PARTICIPANT_BRIDGE_UNEXPECTED_FAILURE",
  ok: false,
  phase: "request",
  reconnectRequired: false,
  retryable: true,
  source: "durable",
  status: "degraded",
  traceId: `participant-ui-${operation}-${token.epoch}-${token.sequence}`,
});

const localizedCampaignTitle = (
  title: Record<string, string> | undefined,
  locale: BusinessContentLocale,
  fallback: string,
) => title?.[locale] ?? title?.["en-US"] ?? fallback;

export const DurableParticipantJourneyPanel = ({
  bridge,
  locale,
  mode,
  onReconnect,
  session,
  sessionReady,
}: DurableParticipantJourneyPanelProps) => {
  const copy = durableCopy[locale];
  const authoritySession = sessionReady ? session : null;
  const sessionKey = createParticipantSessionKey(authoritySession);
  const [state, dispatch] = useReducer(
    participantJourneyWorkflowReducer,
    { mode, sessionKey },
    createParticipantJourneyWorkflowState,
  );
  const stateRef = useRef<ParticipantJourneyWorkflowState>(state);
  const mountedRef = useRef(true);
  const controllersRef = useRef<Partial<Record<ParticipantJourneyRequestOperation, AbortController>>>({});

  stateRef.current = state;

  const commit = useCallback((event: ParticipantJourneyWorkflowEvent) => {
    const current = stateRef.current;
    const next = participantJourneyWorkflowReducer(current, event);

    if (next !== current) {
      stateRef.current = next;
      dispatch(event);
    }

    return next;
  }, []);

  const abortRequests = useCallback(() => {
    for (const controller of Object.values(controllersRef.current)) {
      controller?.abort();
    }
    controllersRef.current = {};
  }, []);

  const requestContext = useCallback((
    token: ParticipantJourneyRequestToken,
    signal: AbortSignal,
  ) => ({
    mode,
    selectedCampaignId: token.campaignId,
    session: authoritySession,
    signal,
  }), [authoritySession, mode]);

  const finishRequest = useCallback((
    operation: ParticipantJourneyRequestOperation,
    controller: AbortController,
  ) => {
    if (controllersRef.current[operation] === controller) {
      delete controllersRef.current[operation];
    }
  }, []);

  const runFeed = useCallback(async (baseState = stateRef.current) => {
    if (!authoritySession || !sessionKey) {
      return;
    }

    const token = nextParticipantJourneyRequestToken(baseState, "feed");
    const requested = commit({ token, type: "feed_requested" });
    if (requested.activeRequests.feed !== token) {
      return;
    }

    const controller = new AbortController();
    controllersRef.current.feed = controller;

    try {
      const result = await bridge.listCampaigns(requestContext(token, controller.signal));
      finishRequest("feed", controller);
      if (!mountedRef.current || controller.signal.aborted) {
        return;
      }
      commit(result.ok
        ? { result, token, type: "feed_succeeded" }
        : { failure: result, token, type: "feed_failed" });
    } catch {
      finishRequest("feed", controller);
      if (mountedRef.current && !controller.signal.aborted) {
        commit({
          failure: safeUnexpectedFailure("feed", token),
          token,
          type: "feed_failed",
        });
      }
    }
  }, [authoritySession, bridge, commit, finishRequest, requestContext, sessionKey]);

  const runJourney = useCallback(async (
    reason: ParticipantJourneyRequestReason,
    baseState = stateRef.current,
  ) => {
    if (!authoritySession || !sessionKey || !baseState.selectedCampaignId) {
      return;
    }

    const token = nextParticipantJourneyRequestToken(baseState, "journey");
    const requested = commit({ reason, token, type: "journey_requested" });
    if (requested.activeRequests.journey !== token) {
      return;
    }

    const controller = new AbortController();
    controllersRef.current.journey = controller;

    try {
      const result: ParticipantJourneyResult = await bridge.getJourney(
        requestContext(token, controller.signal),
      );
      finishRequest("journey", controller);
      if (!mountedRef.current || controller.signal.aborted) {
        return;
      }
      commit(result.ok
        ? { result, token, type: "journey_succeeded" }
        : { failure: result, token, type: "journey_failed" });
    } catch {
      finishRequest("journey", controller);
      if (mountedRef.current && !controller.signal.aborted) {
        commit({
          failure: safeUnexpectedFailure("journey", token),
          token,
          type: "journey_failed",
        });
      }
    }
  }, [authoritySession, bridge, commit, finishRequest, requestContext, sessionKey]);

  const runVerify = useCallback(async (taskId: string) => {
    const baseState = stateRef.current;
    if (
      !authoritySession
      || !sessionKey
      || !canVerifyParticipantJourneyTask(baseState, taskId)
    ) {
      return;
    }

    const token = nextParticipantJourneyRequestToken(baseState, "verify");
    const requested = commit({ taskId, token, type: "verify_requested" });
    if (requested.activeRequests.verify !== token) {
      return;
    }

    const controller = new AbortController();
    controllersRef.current.verify = controller;

    try {
      const result: ParticipantVerifyResult = await bridge.verifyTask(
        taskId,
        requestContext(token, controller.signal),
      );
      finishRequest("verify", controller);
      if (!mountedRef.current || controller.signal.aborted) {
        return;
      }

      if (!result.ok) {
        commit({ failure: result, token, type: "verify_failed" });
        return;
      }

      const acknowledged = commit({ result, token, type: "verify_succeeded" });
      await runJourney("refresh", acknowledged);
    } catch {
      finishRequest("verify", controller);
      if (mountedRef.current && !controller.signal.aborted) {
        commit({
          failure: safeUnexpectedFailure("verify", token),
          token,
          type: "verify_failed",
        });
      }
    }
  }, [authoritySession, bridge, commit, finishRequest, requestContext, runJourney, sessionKey]);

  useEffect(() => {
    let active = true;
    mountedRef.current = true;
    if (authoritySession && sessionKey) {
      void Promise.resolve().then(() => {
        if (active && mountedRef.current) {
          void runFeed();
        }
      });
    }

    return () => {
      active = false;
      mountedRef.current = false;
      abortRequests();
    };
  }, [abortRequests, authoritySession, bridge, runFeed, sessionKey]);

  const selectCampaign = (campaignId: string) => {
    if (canSelectParticipantCampaign(stateRef.current, campaignId)) {
      controllersRef.current.journey?.abort();
      delete controllersRef.current.journey;
    }
    const selected = commit({ campaignId, type: "campaign_selected" });
    if (selected.selectedCampaignId === campaignId) {
      void runJourney("selection", selected);
    }
  };

  const retryRead = () => {
    const operation = selectParticipantJourneyRetryOperation(stateRef.current);
    if (operation === "feed") {
      void runFeed();
    } else if (operation === "journey") {
      void runJourney("retry");
    }
  };

  const selectedFeedItem = state.feed.find(
    (campaign) => campaign.campaignId === state.selectedCampaignId,
  );
  const retryOperation = selectParticipantJourneyRetryOperation(state);
  const sessionMissing = !sessionKey;
  const journey = state.journey;

  return (
    <div data-participant-mode="durable" style={rootStyle}>
      <section aria-label={copy.campaignFeed} style={bandStyle}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between" }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: 20, margin: 0 }}>{copy.campaignFeed}</h2>
            <p style={{ color: "#64748b", margin: "6px 0 0", overflowWrap: "anywhere" }}>
              {authoritySession ? authoritySession.displayAddress : copy.sessionRequired}
            </p>
          </div>
          <span style={badgeStyle("neutral")}>{state.status}</span>
        </div>

        {sessionMissing ? (
          <button onClick={onReconnect} style={secondaryButtonStyle} type="button">
            {copy.reconnect}
          </button>
        ) : null}

        {state.status === "loading_feed" ? (
          <p aria-live="polite" style={{ color: "#475569", margin: 0 }}>{copy.feedLoading}</p>
        ) : null}

        {sessionKey && state.status !== "loading_feed" && state.feed.length === 0 && !state.diagnostic ? (
          <p style={{ color: "#475569", margin: 0 }}>{copy.emptyFeed}</p>
        ) : null}

        {state.feed.length > 0 ? (
          <div style={feedGridStyle}>
            {state.feed.map((campaign) => {
              const selected = campaign.campaignId === state.selectedCampaignId;
              const selectable = canSelectParticipantCampaign(state, campaign.campaignId);
              const title = localizedCampaignTitle(campaign.title, locale, campaign.campaignId);

              return (
                <article key={campaign.campaignId} style={feedItemStyle}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <span style={badgeStyle("status")}>{campaign.status}</span>
                    {campaign.visibility === "participant_preview" ? (
                      <span style={badgeStyle("preview")}>{copy.participantPreview}</span>
                    ) : null}
                  </div>
                  <h3 style={{ fontSize: 17, margin: 0, overflowWrap: "anywhere" }}>{title}</h3>
                  <code style={{ color: "#475569", overflowWrap: "anywhere" }}>{campaign.campaignId}</code>
                  <button
                    aria-current={selected ? "true" : undefined}
                    aria-pressed={selected}
                    disabled={!selectable && !selected}
                    onClick={() => selectCampaign(campaign.campaignId)}
                    style={selected ? selectedButtonStyle : selectable ? buttonStyle : disabledButtonStyle}
                    type="button"
                  >
                    {copy.selectCampaign} {title}
                  </button>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>

      {state.diagnostic ? (
        <section aria-label={copy.diagnostic} style={bandStyle}>
          <h2 style={{ fontSize: 18, margin: 0 }}>{copy.blocked}</h2>
          <dl style={metricsStyle}>
            <div style={metricStyle}><dt>Code</dt><dd style={{ margin: 0 }}>{state.diagnostic.code}</dd></div>
            <div style={metricStyle}><dt>HTTP</dt><dd style={{ margin: 0 }}>{state.diagnostic.httpStatus ?? "-"}</dd></div>
            <div style={metricStyle}><dt>Trace ID</dt><dd style={{ margin: 0, overflowWrap: "anywhere" }}>{state.diagnostic.traceId}</dd></div>
          </dl>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {retryOperation ? (
              <button onClick={retryRead} style={buttonStyle} type="button">
                {retryOperation === "feed" ? copy.retryFeed : copy.retryJourney}
              </button>
            ) : null}
            {canReconnectParticipantJourney(state) ? (
              <button onClick={onReconnect} style={secondaryButtonStyle} type="button">
                {copy.reconnect}
              </button>
            ) : null}
          </div>
          {state.commandTraceId ? (
            <p style={{ color: "#475569", margin: 0, overflowWrap: "anywhere" }}>
              {copy.commandTrace}: <code>{state.commandTraceId}</code>
            </p>
          ) : null}
        </section>
      ) : null}

      {state.selectedCampaignId && !journey ? (
        <section aria-label={copy.journey} aria-live="polite" style={bandStyle}>
          <h2 style={{ fontSize: 20, margin: 0 }}>{copy.journey}</h2>
          <p style={{ color: "#475569", margin: 0 }}>
            {state.status === "loading_journey" ? copy.journeyLoading : copy.blocked}
          </p>
        </section>
      ) : null}

      {journey ? (
        <section aria-label={copy.journey} style={bandStyle}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between" }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ color: "#64748b", fontSize: 12, fontWeight: 800, margin: 0 }}>
                {copy.campaignId}
              </p>
              <h2 style={{ fontSize: 20, margin: "4px 0 0", overflowWrap: "anywhere" }}>
                {selectedFeedItem
                  ? localizedCampaignTitle(selectedFeedItem.title, locale, journey.campaign.campaignId)
                  : journey.campaign.campaignId}
              </h2>
              <code style={{ display: "block", marginTop: 5, overflowWrap: "anywhere" }}>
                {journey.campaign.campaignId}
              </code>
            </div>
            <span style={badgeStyle("status")}>
              {copy.campaignStatus}: {journey.campaign.status}
            </span>
          </div>

          <dl style={metricsStyle}>
            <div style={metricStyle}>
              <dt>{copy.points}</dt>
              <dd style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{journey.participant.totalPoints}</dd>
            </div>
            <div style={metricStyle}>
              <dt>{copy.rank}</dt>
              <dd style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
                {journey.ranking.rank === null ? copy.notRanked : `#${journey.ranking.rank}`}
              </dd>
            </div>
            <div style={metricStyle}>
              <dt>{copy.eligibility}</dt>
              <dd style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{journey.eligibility.status}</dd>
            </div>
            <div style={metricStyle}>
              <dt>{copy.participantCount}</dt>
              <dd style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{journey.ranking.participantCount}</dd>
            </div>
          </dl>

          <dl style={metricsStyle}>
            <div style={metricStyle}>
              <dt>{copy.missingTasks}</dt>
              <dd style={{ margin: 0, overflowWrap: "anywhere" }}>
                {journey.eligibility.missingTasks.join(", ") || copy.noMissingTasks}
              </dd>
            </div>
            <div style={metricStyle}>
              <dt>{copy.riskFlags}</dt>
              <dd style={{ margin: 0, overflowWrap: "anywhere" }}>
                {journey.eligibility.riskFlags.join(", ") || copy.noRiskFlags}
              </dd>
            </div>
          </dl>

          <div aria-label={copy.tasks} style={{ display: "grid", gap: 12 }}>
            {journey.tasks.map((task) => {
              const pending = state.pendingTaskId === task.taskId;
              const refreshPending = pending && state.pendingOperation === "refresh_journey";
              const verifyPending = pending && state.pendingOperation === "verify";
              const verifyEnabled = canVerifyParticipantJourneyTask(state, task.taskId);
              const commandLabel = refreshPending
                ? copy.refreshing
                : verifyPending
                  ? `${copy.verifying} ${task.taskId}`
                  : task.action === "completed"
                    ? copy.completed
                    : `${copy.verify} ${task.taskId}`;

              return (
                <article key={task.taskId} style={{ ...feedItemStyle, background: "#ffffff" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "space-between" }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: "#64748b", fontSize: 12, fontWeight: 800, margin: 0 }}>{copy.task}</p>
                      <code style={{ overflowWrap: "anywhere" }}>{task.taskId}</code>
                    </div>
                    <span style={badgeStyle("neutral")}>{task.status}</span>
                  </div>
                  <dl style={metricsStyle}>
                    <div style={metricStyle}>
                      <dt>{copy.completion}</dt>
                      <dd style={{ margin: 0, overflowWrap: "anywhere" }}>{task.completionId ?? copy.noCompletion}</dd>
                    </div>
                    <div style={metricStyle}>
                      <dt>{copy.evidence}</dt>
                      <dd style={{ margin: 0, overflowWrap: "anywhere" }}>{task.evidenceId ?? copy.noEvidence}</dd>
                    </div>
                  </dl>
                  <button
                    aria-busy={pending || undefined}
                    disabled={!verifyEnabled}
                    onClick={() => void runVerify(task.taskId)}
                    style={verifyEnabled ? buttonStyle : disabledButtonStyle}
                    type="button"
                  >
                    {commandLabel}
                  </button>
                </article>
              );
            })}
          </div>

          {state.commandTraceId && !state.diagnostic ? (
            <p style={{ color: "#475569", margin: 0, overflowWrap: "anywhere" }}>
              {copy.commandTrace}: <code>{state.commandTraceId}</code>
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
};
