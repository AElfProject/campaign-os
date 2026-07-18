import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  type CSSProperties,
} from "react";
import type {
  ParticipantJourneyApiBridge,
  ParticipantJourneyDurableSession,
  ParticipantJourneyFailure,
  ParticipantJourneyMode,
  ParticipantJourneyResult,
  ParticipantVerifyResult,
} from "../../../api/participantJourneyApiBridge";
import {
  campaignDetail,
  type CampaignShellDetail,
  type NormalizedWalletSession,
  type SupportedLocale,
} from "../../../domain";
import { truncateLiveWalletAddress } from "../../wallet/LiveWalletAuthenticationStatus";
import {
  canPollParticipantJourneyTask,
  canReconnectParticipantJourney,
  canSelectParticipantCampaign,
  canVerifyParticipantJourneyTask,
  createParticipantJourneyWorkflowState,
  createParticipantSessionKey,
  nextParticipantJourneyRequestToken,
  participantJourneyWorkflowReducer,
  selectParticipantJourneyRetryOperation,
  selectParticipantJourneyRefreshTaskId,
  selectParticipantJourneyTaskAction,
  selectParticipantJourneyTaskAttempt,
  selectParticipantJourneyTaskPoll,
  selectParticipantJourneyTaskRefresh,
  type ParticipantJourneyRequestOperation,
  type ParticipantJourneyRequestReason,
  type ParticipantJourneyRequestToken,
  type ParticipantJourneyTaskAttemptStatus,
  type ParticipantJourneyWorkflowEvent,
  type ParticipantJourneyWorkflowState,
} from "./participantJourneyWorkflow";

type BusinessContentLocale = Exclude<
  SupportedLocale,
  "ja-JP" | "ko-KR" | "vi-VN" | "id-ID" | "tr-TR" | "es-ES"
>;

export interface DurableParticipantJourneyPanelProps {
  bridge: ParticipantJourneyApiBridge;
  campaign?: CampaignShellDetail;
  liveSession?: ParticipantJourneyDurableSession | null;
  locale: BusinessContentLocale;
  mode: Extract<ParticipantJourneyMode, "durable">;
  onAuthenticationFailure?: (failure: ParticipantJourneyFailure) => void;
  onReconnect: () => void;
  session: NormalizedWalletSession | null;
  sessionReady: boolean;
}

const durableCopy = {
  "en-US": {
    awardedPoints: "Awarded points",
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
    notStarted: "Not started",
    noFurtherAction: "No further action",
    participantCount: "Participants",
    participantPreview: "Participant preview",
    publicCampaign: "Public Campaign",
    publicTasks: "Public Tasks",
    pendingDetail: "The provider result is still pending.",
    pendingStatus: "Verification pending",
    points: "Points",
    rank: "Rank",
    reconnect: "Reconnect wallet",
    retryVerification: "Retry verification",
    refreshing: "Refreshing journey",
    retryFeed: "Retry Campaign feed",
    retryJourney: "Retry journey read",
    riskFlags: "Risk flags",
    selectCampaign: "Select",
    sessionRequired: "An API-issued wallet session is required.",
    status: "Status",
    task: "Task",
    tasks: "Tasks",
    verificationCompleted: "Verification completed",
    verificationFailed: "Verification failed",
    verificationManualReview: "Awaiting manual review",
    verificationManualReviewDetail: "No action is needed while review is in progress.",
    verificationStatus: "Verification status",
    verificationUnavailable: "Verification temporarily unavailable",
    verify: "Verify Task",
    verifying: "Verifying Task",
  },
  "zh-CN": {
    awardedPoints: "已获积分",
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
    notStarted: "尚未开始",
    noFurtherAction: "无需进一步操作",
    participantCount: "参与人数",
    participantPreview: "参与者预览",
    publicCampaign: "公开活动",
    publicTasks: "公开任务",
    pendingDetail: "服务商结果仍在处理中。",
    pendingStatus: "验证处理中",
    points: "积分",
    rank: "排名",
    reconnect: "重新连接钱包",
    retryVerification: "重试验证",
    refreshing: "正在刷新旅程",
    retryFeed: "重试活动列表",
    retryJourney: "重试读取旅程",
    riskFlags: "风险标记",
    selectCampaign: "选择",
    sessionRequired: "需要 API 签发的钱包会话。",
    status: "状态",
    task: "任务",
    tasks: "任务",
    verificationCompleted: "验证已完成",
    verificationFailed: "验证失败",
    verificationManualReview: "等待人工审核",
    verificationManualReviewDetail: "审核进行中，无需重复操作。",
    verificationStatus: "验证状态",
    verificationUnavailable: "验证服务暂不可用",
    verify: "验证任务",
    verifying: "正在验证任务",
  },
  "zh-TW": {
    awardedPoints: "已獲積分",
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
    notStarted: "尚未開始",
    noFurtherAction: "無需進一步操作",
    participantCount: "參與人數",
    participantPreview: "參與者預覽",
    publicCampaign: "公開活動",
    publicTasks: "公開任務",
    pendingDetail: "服務商結果仍在處理中。",
    pendingStatus: "驗證處理中",
    points: "積分",
    rank: "排名",
    reconnect: "重新連接錢包",
    retryVerification: "重試驗證",
    refreshing: "正在重新整理旅程",
    retryFeed: "重試活動列表",
    retryJourney: "重試讀取旅程",
    riskFlags: "風險標記",
    selectCampaign: "選擇",
    sessionRequired: "需要 API 簽發的錢包工作階段。",
    status: "狀態",
    task: "任務",
    tasks: "任務",
    verificationCompleted: "驗證已完成",
    verificationFailed: "驗證失敗",
    verificationManualReview: "等待人工審核",
    verificationManualReviewDetail: "審核進行中，無需重複操作。",
    verificationStatus: "驗證狀態",
    verificationUnavailable: "驗證服務暫不可用",
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

const disabledButtonStyle: CSSProperties = {
  ...secondaryButtonStyle,
  background: "#e2e8f0",
  color: "#475569",
  cursor: "not-allowed",
};

const selectedDisabledButtonStyle: CSSProperties = {
  ...disabledButtonStyle,
  background: "#dbeafe",
  borderColor: "#1c64f2",
  color: "#1e3a8a",
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

type ParticipantJourneyReadOperation = Exclude<ParticipantJourneyRequestOperation, "verify">;
type ParticipantJourneyTaskRequestKind = "command" | "poll";

interface ParticipantJourneyTaskRequestResource {
  controller: AbortController;
  kind: ParticipantJourneyTaskRequestKind;
  token: ParticipantJourneyRequestToken;
}

interface ParticipantJourneyPollTimerResource {
  ownerId: string;
  timer: ReturnType<typeof setTimeout>;
}

interface ParticipantJourneyTaskStatusPresentation {
  detail: string | null;
  Icon: LucideIcon;
  label: string;
}

type ParticipantJourneyTaskDisplayStatus = ParticipantJourneyTaskAttemptStatus | "not_started";

export const DurableParticipantJourneyPanel = ({
  bridge,
  campaign = campaignDetail,
  liveSession = null,
  locale,
  mode,
  onAuthenticationFailure,
  onReconnect,
  session,
  sessionReady,
}: DurableParticipantJourneyPanelProps) => {
  const copy = durableCopy[locale];
  const activeLiveSession = sessionReady ? liveSession : null;
  const legacySession = sessionReady ? session : null;
  const authoritySession = activeLiveSession ?? legacySession;
  const liveSessionKey = activeLiveSession
    ? [
        activeLiveSession.sessionId,
        activeLiveSession.walletAddress,
        activeLiveSession.accountType,
        activeLiveSession.walletSource,
        activeLiveSession.chainId,
        activeLiveSession.network,
        activeLiveSession.issuedAt,
      ].map(encodeURIComponent).join(":")
    : null;
  const sessionKey = liveSessionKey ?? createParticipantSessionKey(legacySession);
  const displayedAuthority = activeLiveSession
    ? `Verified ${activeLiveSession.accountType} · ${truncateLiveWalletAddress(activeLiveSession.walletAddress)}`
    : legacySession?.displayAddress ?? copy.sessionRequired;
  const [state, dispatch] = useReducer(
    participantJourneyWorkflowReducer,
    { mode, sessionKey },
    createParticipantJourneyWorkflowState,
  );
  const stateRef = useRef<ParticipantJourneyWorkflowState>(state);
  const mountedRef = useRef(true);
  const readControllersRef = useRef<Partial<Record<ParticipantJourneyReadOperation, AbortController>>>({});
  const taskControllersRef = useRef(new Map<string, ParticipantJourneyTaskRequestResource>());
  const pollTimersRef = useRef(new Map<string, ParticipantJourneyPollTimerResource>());
  const journeyHeadingRef = useRef<HTMLHeadingElement>(null);
  const journeyFocusPendingRef = useRef(false);
  const taskStatusFocusPendingRef = useRef<string | null>(null);
  const taskStatusRefs = useRef(new Map<string, HTMLDivElement>());
  const reportedAuthenticationFailureRef = useRef<string | null>(null);

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

  const abortReadRequests = useCallback(() => {
    for (const controller of Object.values(readControllersRef.current)) {
      controller?.abort();
    }
    readControllersRef.current = {};
  }, []);

  const clearPollTimer = useCallback((taskId: string) => {
    const resource = pollTimersRef.current.get(taskId);
    if (resource) {
      clearTimeout(resource.timer);
      pollTimersRef.current.delete(taskId);
    }
  }, []);

  const stopTaskResources = useCallback((taskId?: string) => {
    const taskIds = taskId === undefined
      ? new Set([...taskControllersRef.current.keys(), ...pollTimersRef.current.keys()])
      : new Set([taskId]);

    for (const ownedTaskId of taskIds) {
      clearPollTimer(ownedTaskId);
      taskControllersRef.current.get(ownedTaskId)?.controller.abort();
      taskControllersRef.current.delete(ownedTaskId);
    }
  }, [clearPollTimer]);

  const disposeRuntime = useCallback(() => {
    abortReadRequests();
    stopTaskResources();
  }, [abortReadRequests, stopTaskResources]);

  const requestContext = useCallback((
    token: ParticipantJourneyRequestToken,
    signal: AbortSignal,
  ) => ({
    mode,
    selectedCampaignId: token.campaignId,
    session: legacySession,
    signal,
  }), [legacySession, mode]);

  const finishRequest = useCallback((
    operation: ParticipantJourneyReadOperation,
    controller: AbortController,
  ) => {
    if (readControllersRef.current[operation] === controller) {
      delete readControllersRef.current[operation];
    }
  }, []);

  const finishTaskRequest = useCallback((taskId: string, controller: AbortController) => {
    if (taskControllersRef.current.get(taskId)?.controller === controller) {
      taskControllersRef.current.delete(taskId);
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
    readControllersRef.current.feed = controller;

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
    taskId?: string | null,
  ) => {
    if (!authoritySession || !sessionKey || !baseState.selectedCampaignId) {
      return;
    }

    const token = nextParticipantJourneyRequestToken(baseState, "journey", taskId);
    const requested = commit({ reason, token, type: "journey_requested" });
    if (requested.activeRequests.journey !== token) {
      return;
    }

    const controller = new AbortController();
    readControllersRef.current.journey = controller;

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

  const runVerify = useCallback(async (
    taskId: string,
    kind: ParticipantJourneyTaskRequestKind = "command",
  ) => {
    const baseState = stateRef.current;
    if (
      !authoritySession
      || !sessionKey
      || (kind === "command"
        ? !canVerifyParticipantJourneyTask(baseState, taskId)
        : !canPollParticipantJourneyTask(baseState, taskId))
    ) {
      return;
    }

    clearPollTimer(taskId);
    const token = nextParticipantJourneyRequestToken(baseState, "verify", taskId);
    if (kind === "command") {
      taskStatusFocusPendingRef.current = taskId;
    }
    const requested = commit(kind === "command"
      ? { taskId, token, type: "verify_requested" }
      : { taskId, token, type: "verification_poll_requested" });
    if (selectParticipantJourneyTaskAttempt(requested, taskId)?.activeRequest !== token) {
      if (taskStatusFocusPendingRef.current === taskId) {
        taskStatusFocusPendingRef.current = null;
      }
      return;
    }

    const controller = new AbortController();
    const previousResource = taskControllersRef.current.get(taskId);
    if (previousResource && previousResource.token !== token) {
      previousResource.controller.abort();
    }
    taskControllersRef.current.set(taskId, { controller, kind, token });

    try {
      const result: ParticipantVerifyResult = await bridge.verifyTask(
        taskId,
        requestContext(token, controller.signal),
      );
      finishTaskRequest(taskId, controller);
      if (!mountedRef.current || controller.signal.aborted) {
        return;
      }

      if (!result.ok) {
        commit({ failure: result, token, type: "verify_failed" });
        return;
      }

      commit({ result, token, type: "verify_succeeded" });
    } catch {
      finishTaskRequest(taskId, controller);
      if (mountedRef.current && !controller.signal.aborted) {
        commit({
          failure: safeUnexpectedFailure("verify", token),
          token,
          type: "verify_failed",
        });
      }
    }
  }, [
    authoritySession,
    bridge,
    clearPollTimer,
    commit,
    finishTaskRequest,
    requestContext,
    sessionKey,
  ]);

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
      disposeRuntime();
    };
  }, [authoritySession, bridge, disposeRuntime, runFeed, sessionKey]);

  useEffect(() => {
    const refreshTaskId = selectParticipantJourneyRefreshTaskId(state);
    if (refreshTaskId && state.activeRequests.journey === null) {
      void runJourney("refresh", state, refreshTaskId);
    }
  }, [runJourney, state]);

  useEffect(() => {
    const scheduledTaskIds = new Set<string>();
    const pageHidden = document.visibilityState === "hidden";

    for (const taskId of Object.keys(state.taskAttempts)) {
      const poll = selectParticipantJourneyTaskPoll(state, taskId);
      if (poll?.phase === "scheduled" && pageHidden) {
        commit({ taskId, type: "verification_poll_paused" });
        continue;
      }
      if (!poll || poll.phase !== "scheduled") {
        continue;
      }

      scheduledTaskIds.add(taskId);
      const existing = pollTimersRef.current.get(taskId);
      if (existing?.ownerId === poll.ownerId) {
        continue;
      }
      clearPollTimer(taskId);

      const ownerId = poll.ownerId;
      const timer = setTimeout(() => {
        const activeResource = pollTimersRef.current.get(taskId);
        if (activeResource?.ownerId !== ownerId) {
          return;
        }
        pollTimersRef.current.delete(taskId);
        const currentPoll = selectParticipantJourneyTaskPoll(stateRef.current, taskId);
        if (currentPoll?.ownerId === ownerId && currentPoll.phase === "scheduled") {
          void runVerify(taskId, "poll");
        }
      }, poll.delayMs);
      pollTimersRef.current.set(taskId, { ownerId, timer });
    }

    for (const taskId of pollTimersRef.current.keys()) {
      if (!scheduledTaskIds.has(taskId)) {
        clearPollTimer(taskId);
      }
    }

    for (const [taskId, resource] of taskControllersRef.current) {
      if (state.taskAttempts[taskId]?.activeRequest !== resource.token) {
        resource.controller.abort();
        taskControllersRef.current.delete(taskId);
      }
    }
  }, [clearPollTimer, commit, runVerify, state.taskAttempts]);

  useEffect(() => {
    const taskId = taskStatusFocusPendingRef.current;
    if (!taskId) {
      return;
    }

    const status = taskStatusRefs.current.get(taskId);
    if (status) {
      status.focus({ preventScroll: true });
      taskStatusFocusPendingRef.current = null;
    } else if (!state.taskAttempts[taskId]) {
      taskStatusFocusPendingRef.current = null;
    }
  }, [state.taskAttempts]);

  useEffect(() => {
    const updatePollVisibility = () => {
      const current = stateRef.current;
      for (const taskId of Object.keys(current.taskAttempts)) {
        const poll = selectParticipantJourneyTaskPoll(current, taskId);
        if (!poll) {
          continue;
        }

        if (document.visibilityState === "hidden" && poll.phase !== "paused") {
          clearPollTimer(taskId);
          const resource = taskControllersRef.current.get(taskId);
          if (resource?.kind === "poll") {
            resource.controller.abort();
            taskControllersRef.current.delete(taskId);
          }
          commit({ taskId, type: "verification_poll_paused" });
        } else if (document.visibilityState !== "hidden" && poll.phase === "paused") {
          commit({ taskId, type: "verification_poll_resumed" });
        }
      }
    };

    document.addEventListener("visibilitychange", updatePollVisibility);
    return () => document.removeEventListener("visibilitychange", updatePollVisibility);
  }, [clearPollTimer, commit]);

  useEffect(() => {
    if (!journeyFocusPendingRef.current || !state.selectedCampaignId) {
      return;
    }

    journeyHeadingRef.current?.focus();
    if (state.journey || state.diagnostic) {
      journeyFocusPendingRef.current = false;
    }
  }, [state.diagnostic, state.journey, state.pendingOperation, state.selectedCampaignId]);

  useEffect(() => {
    const failure = state.diagnostic;
    if (
      !failure
      || (!failure.reconnectRequired && failure.httpStatus !== 401 && failure.httpStatus !== 403)
    ) {
      if (!failure) {
        reportedAuthenticationFailureRef.current = null;
      }
      return;
    }

    const failureKey = [failure.code, failure.httpStatus ?? "-", failure.traceId].join(":");
    if (reportedAuthenticationFailureRef.current === failureKey) {
      return;
    }
    reportedAuthenticationFailureRef.current = failureKey;
    onAuthenticationFailure?.(failure);
  }, [onAuthenticationFailure, state.diagnostic]);

  const selectCampaign = (campaignId: string) => {
    const current = stateRef.current;
    if (!canSelectParticipantCampaign(current, campaignId)) {
      return;
    }

    readControllersRef.current.journey?.abort();
    delete readControllersRef.current.journey;
    stopTaskResources();
    journeyFocusPendingRef.current = true;
    const selected = commit({ campaignId, type: "campaign_selected" });
    if (selected !== current && selected.selectedCampaignId === campaignId) {
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

  const taskStatusPresentation = (
    status: ParticipantJourneyTaskDisplayStatus,
    diagnosticCode: string | null,
  ): ParticipantJourneyTaskStatusPresentation => {
    if (status === "not_started") {
      return { detail: null, Icon: Clock3, label: copy.notStarted };
    }
    if (status === "verifying") {
      return { detail: null, Icon: LoaderCircle, label: copy.verifying };
    }
    if (status === "pending") {
      return { detail: copy.pendingDetail, Icon: Clock3, label: copy.pendingStatus };
    }
    if (status === "completed") {
      return { detail: copy.noFurtherAction, Icon: CheckCircle2, label: copy.verificationCompleted };
    }
    if (status === "manual_review") {
      return {
        detail: copy.verificationManualReviewDetail,
        Icon: ShieldCheck,
        label: copy.verificationManualReview,
      };
    }
    if (status === "failed") {
      return { detail: diagnosticCode, Icon: CircleAlert, label: copy.verificationFailed };
    }
    return { detail: diagnosticCode, Icon: WifiOff, label: copy.verificationUnavailable };
  };

  return (
    <div data-participant-mode="durable" style={rootStyle}>
      <section aria-label={copy.publicCampaign} style={bandStyle}>
        <div style={{ alignItems: "start", display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between" }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ color: "#64748b", fontSize: 12, fontWeight: 800, margin: 0 }}>
              {copy.publicCampaign}
            </p>
            <h2 style={{ fontSize: 20, margin: "4px 0 0", overflowWrap: "anywhere" }}>
              {campaign.title[locale] ?? campaign.title["en-US"]}
            </h2>
            <p style={{ color: "#475569", margin: "6px 0 0", overflowWrap: "anywhere" }}>
              {campaign.subtitle[locale] ?? campaign.subtitle["en-US"]}
            </p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <span style={badgeStyle("status")}>{campaign.status}</span>
            <span style={badgeStyle("neutral")}>{copy.publicTasks}: {campaign.tasks.length}</span>
          </div>
        </div>
      </section>

      <section aria-label={copy.campaignFeed} style={bandStyle}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between" }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: 20, margin: 0 }}>{copy.campaignFeed}</h2>
            <p style={{ color: "#64748b", margin: "6px 0 0", overflowWrap: "anywhere" }}>
              {displayedAuthority}
            </p>
          </div>
          <span style={badgeStyle("neutral")}>{state.status}</span>
        </div>

        {sessionMissing ? (
          <button
            onClick={onReconnect}
            style={secondaryButtonStyle}
            type="button"
          >
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
              const commandDisabled = !selectable;
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
                    aria-label={`${copy.selectCampaign} ${title} (${campaign.campaignId})`}
                    aria-pressed={selected}
                    disabled={commandDisabled}
                    onClick={() => selectCampaign(campaign.campaignId)}
                    style={commandDisabled
                      ? selected
                        ? selectedDisabledButtonStyle
                        : disabledButtonStyle
                      : buttonStyle}
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
            <div style={metricStyle}>
              <dt>Code</dt>
              <dd style={{ margin: 0, minWidth: 0, overflowWrap: "anywhere" }}>
                {state.diagnostic.code}
              </dd>
            </div>
            <div style={metricStyle}><dt>HTTP</dt><dd style={{ margin: 0 }}>{state.diagnostic.httpStatus ?? "-"}</dd></div>
            <div style={metricStyle}><dt>Trace ID</dt><dd style={{ margin: 0, overflowWrap: "anywhere" }}>{state.diagnostic.traceId}</dd></div>
          </dl>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {retryOperation ? (
              <button
                onClick={retryRead}
                style={buttonStyle}
                type="button"
              >
                {retryOperation === "feed" ? copy.retryFeed : copy.retryJourney}
              </button>
            ) : null}
            {canReconnectParticipantJourney(state) ? (
              <button
                onClick={onReconnect}
                style={secondaryButtonStyle}
                type="button"
              >
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
          <h2 ref={journeyHeadingRef} style={{ fontSize: 20, margin: 0 }} tabIndex={-1}>
            {copy.journey}
          </h2>
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
              <h2
                ref={journeyHeadingRef}
                style={{ fontSize: 20, margin: "4px 0 0", overflowWrap: "anywhere" }}
                tabIndex={-1}
              >
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
              const attempt = selectParticipantJourneyTaskAttempt(state, task.taskId);
              const refresh = selectParticipantJourneyTaskRefresh(state, task.taskId);
              const action = selectParticipantJourneyTaskAction(state, task.taskId);
              const attemptStatus = attempt?.status ?? task.status;
              const diagnosticCode = attempt?.diagnostic?.code
                ?? attempt?.receipt?.diagnosticCodes[0]
                ?? null;
              const diagnosticTraceId = attempt?.diagnostic?.traceId ?? null;
              const statusPresentation = taskStatusPresentation(attemptStatus, diagnosticCode);
              const StatusIcon = statusPresentation.Icon;
              const refreshing = refresh?.status === "in_flight" || refresh?.status === "required";
              const requestActive = attempt?.activeRequest !== null && attempt?.activeRequest !== undefined;
              const verifyEnabled = canVerifyParticipantJourneyTask(state, task.taskId);
              const commandLabel = refreshing
                ? copy.refreshing
                : requestActive
                  ? copy.verifying
                  : action === "verify"
                    ? copy.verify
                    : action === "retry"
                      ? copy.retryVerification
                      : attemptStatus === "completed"
                        ? copy.completed
                        : statusPresentation.label;
              const commandAccessibleLabel = action === "verify" || action === "retry"
                ? `${commandLabel} ${task.taskId}`
                : `${commandLabel} (${task.taskId})`;
              const CommandIcon = action === "retry"
                ? RefreshCw
                : action === "verify"
                  ? ShieldCheck
                  : statusPresentation.Icon;

              return (
                <article
                  className="participant-verification-task"
                  data-verification-task={task.taskId}
                  key={task.taskId}
                  style={{ ...feedItemStyle, background: "#ffffff" }}
                >
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "space-between" }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: "#64748b", fontSize: 12, fontWeight: 800, margin: 0 }}>{copy.task}</p>
                      <code style={{ overflowWrap: "anywhere" }}>{task.taskId}</code>
                    </div>
                    <div
                      aria-atomic="true"
                      aria-label={`${copy.verificationStatus} ${task.taskId}: ${statusPresentation.label}`}
                      aria-live="polite"
                      className="participant-verification-status"
                      data-verification-status={attemptStatus}
                      ref={(node) => {
                        if (node) {
                          taskStatusRefs.current.set(task.taskId, node);
                        } else {
                          taskStatusRefs.current.delete(task.taskId);
                        }
                      }}
                      role="status"
                      tabIndex={-1}
                    >
                      <StatusIcon
                        aria-hidden="true"
                        className={attemptStatus === "verifying" ? "participant-verification-spin" : undefined}
                        size={16}
                        strokeWidth={2}
                      />
                      <span>{statusPresentation.label}</span>
                    </div>
                  </div>
                  <p
                    aria-hidden={statusPresentation.detail || diagnosticTraceId ? undefined : "true"}
                    className="participant-verification-detail"
                  >
                    {statusPresentation.detail ? <span>{statusPresentation.detail}</span> : null}
                    {diagnosticTraceId ? (
                      <span className="participant-verification-trace">
                        {copy.commandTrace}: <code>{diagnosticTraceId}</code>
                      </span>
                    ) : null}
                  </p>
                  <dl style={metricsStyle}>
                    <div style={metricStyle}>
                      <dt>{copy.completion}</dt>
                      <dd style={{ margin: 0, overflowWrap: "anywhere" }}>{task.completionId ?? copy.noCompletion}</dd>
                    </div>
                    <div style={metricStyle}>
                      <dt>{copy.evidence}</dt>
                      <dd style={{ margin: 0, overflowWrap: "anywhere" }}>{task.evidenceId ?? copy.noEvidence}</dd>
                    </div>
                    <div style={metricStyle}>
                      <dt>{copy.awardedPoints}</dt>
                      <dd style={{ margin: 0 }}>{task.pointsAwarded}</dd>
                    </div>
                  </dl>
                  <div className="participant-verification-action-slot">
                    <button
                      aria-busy={requestActive || refreshing || attemptStatus === "pending" || undefined}
                      aria-label={commandAccessibleLabel}
                      className="participant-verification-action"
                      disabled={!verifyEnabled}
                      onClick={() => void runVerify(task.taskId)}
                      style={verifyEnabled ? buttonStyle : disabledButtonStyle}
                      title={commandAccessibleLabel}
                      type="button"
                    >
                      <CommandIcon
                        aria-hidden="true"
                        className={requestActive || refreshing ? "participant-verification-spin" : undefined}
                        size={17}
                        strokeWidth={2}
                      />
                      <span>{commandLabel}</span>
                    </button>
                  </div>
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
