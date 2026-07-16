import "@testing-library/jest-dom/vitest";
import { act } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
  type RenderResult,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  walletSessions,
  type NormalizedWalletSession,
} from "../../../domain";
import type {
  ParticipantCampaignFeedItem,
  ParticipantJourneyApiBridge,
  ParticipantJourneyFailure,
  ParticipantJourneyProjection,
  ParticipantJourneyResult,
  ParticipantJourneyTask,
  ParticipantVerifyResult,
  ParticipantVerifySuccess,
} from "../../../api/participantJourneyApiBridge";
import { PARTICIPANT_JOURNEY_POLL_MAX_ATTEMPTS } from "./participantJourneyWorkflow";
import {
  DurableParticipantJourneyPanel,
  type DurableParticipantJourneyPanelProps,
} from "./DurableParticipantJourneyPanel";

type PanelLocale = DurableParticipantJourneyPanelProps["locale"];

const campaignAId = "campaign-live-a";
const campaignBId = "campaign-live-b";
const taskAId = "task-live-a";
const taskBId = "task-live-b";
const taskCId = "task-live-c";

const repository = {
  adapterId: "campaign-db-adapter",
  createdViaRepository: true as const,
  repositoryId: "participant-journey-repository",
  storeId: "campaign-db" as const,
};

const verificationRepository = {
  ...repository,
  adapterId: "campaign-db-postgresql-adapter" as const,
  mode: "postgres" as const,
};

const copy = {
  "en-US": {
    awaitReview: "Awaiting manual review",
    completed: "Task completed",
    failed: "Verification failed",
    journey: "Participant journey",
    pending: "Verification pending",
    retry: "Retry verification",
    select: "Select",
    unavailable: "Verification temporarily unavailable",
    verify: "Verify Task",
    verifying: "Verifying Task",
  },
  "zh-CN": {
    awaitReview: "等待人工审核",
    completed: "任务已完成",
    failed: "验证失败",
    journey: "参与者旅程",
    pending: "验证处理中",
    retry: "重试验证",
    select: "选择",
    unavailable: "验证服务暂不可用",
    verify: "验证任务",
    verifying: "正在验证任务",
  },
  "zh-TW": {
    awaitReview: "等待人工審核",
    completed: "任務已完成",
    failed: "驗證失敗",
    journey: "參與者旅程",
    pending: "驗證處理中",
    retry: "重試驗證",
    select: "選擇",
    unavailable: "驗證服務暫不可用",
    verify: "驗證任務",
    verifying: "正在驗證任務",
  },
} satisfies Record<PanelLocale, Record<string, string>>;

const issuedSession = (
  overrides: Partial<NormalizedWalletSession> = {},
): NormalizedWalletSession => ({
  ...walletSessions[0],
  issuer: {
    artifactType: "local_session_reference",
    cookieIssued: false,
    diagnosticCodes: [],
    issuerMode: "local_opaque",
    jwtIssued: false,
    liveSigningExecuted: false,
    referenceId: "issued-participant-session",
    ttlSeconds: 900,
    valid: true,
  },
  proof: {
    diagnosticCodes: [],
    liveVerificationExecuted: false,
    proofType: "wallet_signature",
    status: "verified",
    trustLevel: "verified_local",
  },
  sessionId: "participant-session-a",
  ...overrides,
});

const feedItem = (
  campaignId: string,
  title: string,
): ParticipantCampaignFeedItem => ({
  campaignId,
  goal: `Verify ${title}`,
  projectId: "aelf-live-verification",
  repository,
  status: "draft",
  taskCount: campaignId === campaignAId ? 2 : 1,
  title: { "en-US": title, "zh-CN": title, "zh-TW": title },
  visibility: "participant_preview",
  walletPolicy: "ANY",
});

const campaignFeed = [
  feedItem(campaignAId, "Campaign Alpha"),
  feedItem(campaignBId, "Campaign Beta"),
] as const;

interface JourneyTaskState {
  action?: ParticipantJourneyTask["action"];
  status?: ParticipantJourneyTask["status"];
  taskId: string;
}

const actionForStatus = (
  status: ParticipantJourneyTask["status"],
): ParticipantJourneyTask["action"] => {
  if (status === "completed") {
    return "completed";
  }
  if (status === "manual_review") {
    return "await_review";
  }
  if (status === "failed" || status === "pending") {
    return "retry";
  }
  return "verify";
};

const journeyTask = ({
  action,
  campaignId,
  status = "not_started",
  taskId,
}: JourneyTaskState & { campaignId: string }): ParticipantJourneyTask => {
  const completed = status === "completed";

  return {
    action: action ?? actionForStatus(status),
    blockedReason: null,
    campaignId,
    completionId: completed ? `completion-${taskId}` : null,
    evidenceId: completed ? `evidence-${taskId}` : null,
    evidenceSource: completed ? "DAPP_API" : null,
    pointsAvailable: 25,
    pointsAwarded: completed ? 25 : 0,
    required: true,
    status,
    taskId,
    templateCode: `template-${taskId}`,
    updatedAt: status === "not_started" ? null : "2026-07-16T08:00:00.000Z",
    verificationType: "DAPP_API",
    walletCompatibility: "ANY",
  };
};

const defaultTaskStates = (campaignId: string): readonly JourneyTaskState[] =>
  campaignId === campaignAId
    ? [{ taskId: taskAId }, { taskId: taskBId }]
    : [{ taskId: taskCId }];

const journeyProjection = (
  campaignId: string,
  taskStates: readonly JourneyTaskState[] = defaultTaskStates(campaignId),
): ParticipantJourneyProjection => {
  const session = issuedSession();
  const tasks = taskStates.map((task) => journeyTask({ ...task, campaignId }));
  const totalPoints = tasks.reduce((sum, task) => sum + task.pointsAwarded, 0);
  const allCompleted = tasks.every((task) => task.status === "completed");

  return {
    campaign: {
      campaignId,
      endTime: "2026-08-31T00:00:00.000Z",
      goal: "Verify the durable participant path",
      projectId: "aelf-live-verification",
      rewardDescription: "Live verification points",
      startTime: "2026-07-01T00:00:00.000Z",
      status: "draft",
      taskCount: tasks.length,
      walletPolicy: "ANY",
    },
    diagnostics: [],
    eligibility: {
      accountType: session.accountType,
      campaignId,
      eligible: allCompleted,
      localePreference: "en-US",
      missingTasks: tasks
        .filter((task) => task.status !== "completed")
        .map((task) => task.taskId),
      riskFlags: [],
      score: totalPoints,
      status: allCompleted ? "eligible" : "pending",
      walletAddress: session.address,
      walletSource: session.walletSource,
      walletTypeVerified: true,
    },
    participant: {
      accountType: session.accountType,
      campaignId,
      localePreference: "en-US",
      participantId: `participant-${campaignId}`,
      riskFlags: [],
      totalPoints,
      walletAddress: session.address,
      walletSource: session.walletSource,
      walletTypeVerified: true,
    },
    ranking: {
      campaignId,
      participantCount: 3,
      rank: totalPoints > 0 ? 1 : null,
      source: "repository_projection",
      totalPoints,
      walletAddress: session.address,
    },
    repository,
    tasks,
  };
};

const journeySuccess = (
  journey: ParticipantJourneyProjection,
  traceId = "trace-participant-journey",
): ParticipantJourneyResult => ({
  httpStatus: 200,
  journey,
  ok: true,
  source: "durable",
  status: "success",
  traceId,
});

interface VerificationResultOptions {
  attemptId?: string;
  campaignId?: string;
  diagnosticCode?: string;
  outcome: "completed" | "failed" | "manual_review" | "pending";
  providerFamily?: string;
  retryAfterMs?: number;
  retryable?: boolean;
  taskId?: string;
  traceId?: string;
}

const verificationSuccess = ({
  attemptId = "attempt-live-provider-a",
  campaignId = campaignAId,
  diagnosticCode,
  outcome,
  providerFamily = "aefinder",
  retryAfterMs = outcome === "pending" ? 1_000 : 0,
  retryable = outcome === "pending" || outcome === "failed",
  taskId = taskAId,
  traceId = `trace-verify-${outcome}`,
}: VerificationResultOptions): ParticipantVerifySuccess => {
  const session = issuedSession();
  const completed = outcome === "completed";
  const code = diagnosticCode ?? (
    outcome === "pending"
      ? "TASK_VERIFICATION_ATTEMPT_IN_PROGRESS"
      : outcome === "completed"
        ? "PROVIDER_MATCH_POSITIVE"
        : `PROVIDER_${outcome.toUpperCase()}`
  );

  return {
    httpStatus: outcome === "pending" ? 202 : 200,
    ok: true,
    outcome,
    source: "durable",
    status: outcome,
    traceId,
    verification: {
      attempt: {
        authoritative: outcome !== "pending",
        id: attemptId,
        providerFamily,
        retryAfterMs,
        retryable,
        status: outcome,
        transportExecuted: outcome !== "pending",
      },
      ...(completed ? {
        completion: {
          accountType: session.accountType,
          campaignId,
          evidenceId: `evidence-${taskId}`,
          id: `completion-${taskId}`,
          pointsAwarded: 25,
          status: "completed" as const,
          taskId,
          verificationAttemptId: attemptId,
          walletAddress: session.address,
          walletSource: session.walletSource,
        },
        evidence: {
          accountType: session.accountType,
          campaignId,
          completionId: `completion-${taskId}`,
          evidenceHash: "a".repeat(64),
          evidenceRef: `provider:evidence:${taskId}`,
          evidenceSource: "DAPP_API" as const,
          id: `evidence-${taskId}`,
          liveProviderExecuted: true as const,
          pointsAwarded: 25,
          status: "completed" as const,
          taskId,
          verificationAttemptId: attemptId,
          walletAddress: session.address,
          walletSource: session.walletSource,
        },
        participant: {
          accountType: session.accountType,
          campaignId,
          id: `participant-${campaignId}`,
          totalPoints: 25,
          walletAddress: session.address,
          walletSource: session.walletSource,
        },
      } : {}),
      diagnostics: [{
        code,
        ...(retryAfterMs > 0 ? { retryAfterMs } : {}),
        retryable,
        severity: outcome === "completed"
          ? "info" as const
          : outcome === "failed"
            ? "error" as const
            : "warning" as const,
      }],
      outcome,
      repository: verificationRepository,
    },
  };
};

const verificationFailure = (
  overrides: Partial<ParticipantJourneyFailure> = {},
): ParticipantJourneyFailure => ({
  code: "PROVIDER_UNAVAILABLE",
  httpStatus: 503,
  ok: false,
  phase: "request",
  reconnectRequired: false,
  retryable: true,
  source: "durable",
  status: "degraded",
  traceId: "trace-provider-unavailable",
  ...overrides,
});

const createBridge = (
  overrides: Partial<ParticipantJourneyApiBridge> = {},
): ParticipantJourneyApiBridge => ({
  getJourney: vi.fn<ParticipantJourneyApiBridge["getJourney"]>(async (context) =>
    journeySuccess(journeyProjection(context.selectedCampaignId ?? campaignAId))),
  listCampaigns: vi.fn<ParticipantJourneyApiBridge["listCampaigns"]>(async () => ({
    campaigns: campaignFeed,
    httpStatus: 200,
    ok: true,
    source: "durable",
    status: "success",
    traceId: "trace-participant-feed",
  })),
  verifyTask: vi.fn<ParticipantJourneyApiBridge["verifyTask"]>(async (taskId, context) =>
    verificationSuccess({
      campaignId: context.selectedCampaignId ?? campaignAId,
      outcome: "completed",
      taskId,
    })),
  ...overrides,
});

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
};

const panel = (
  bridge: ParticipantJourneyApiBridge,
  locale: PanelLocale = "en-US",
  session: NormalizedWalletSession | null = issuedSession(),
) => (
  <DurableParticipantJourneyPanel
    bridge={bridge}
    locale={locale}
    mode="durable"
    onReconnect={vi.fn()}
    session={session}
    sessionReady={session !== null}
  />
);

const renderPanel = (
  bridge: ParticipantJourneyApiBridge,
  locale: PanelLocale = "en-US",
  session: NormalizedWalletSession | null = issuedSession(),
): RenderResult => render(panel(bridge, locale, session));

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const taskActionName = (label: string, taskId: string) =>
  new RegExp(`${escapeRegExp(label)}.*${escapeRegExp(taskId)}`, "i");

const campaignActionName = (
  locale: PanelLocale,
  campaignId: string,
  title: string,
) => new RegExp(
  `${escapeRegExp(copy[locale].select)}.*${escapeRegExp(title)}.*${escapeRegExp(campaignId)}`,
  "i",
);

const openCampaign = async (
  locale: PanelLocale = "en-US",
  campaignId = campaignAId,
) => {
  const title = campaignId === campaignAId ? "Campaign Alpha" : "Campaign Beta";
  const campaign = await screen.findByRole("button", {
    name: campaignActionName(locale, campaignId, title),
  });

  fireEvent.click(campaign);

  const firstTaskId = campaignId === campaignAId ? taskAId : taskCId;
  const firstTaskAction = await screen.findByRole("button", {
    name: taskActionName(copy[locale].verify, firstTaskId),
  });
  const journey = screen.getByRole("region", { name: copy[locale].journey });

  expect(journey).toContainElement(firstTaskAction);

  return journey;
};

const taskRowFromAction = (action: HTMLElement) => {
  const row = action.closest("article");

  expect(row).not.toBeNull();

  return row as HTMLElement;
};

const taskAction = (
  row: HTMLElement,
  label: string,
  taskId: string,
) => within(row).getByRole("button", { name: taskActionName(label, taskId) });

const liveStatus = (row: HTMLElement, label: string) => {
  const status = Array.from(row.querySelectorAll<HTMLElement>("[aria-live]"))
    .find((candidate) => candidate.textContent?.includes(label));

  expect(status, `missing aria-live status: ${label}`).toBeDefined();
  expect(status).toHaveAttribute("aria-live", "polite");

  return status as HTMLElement;
};

const actionDimensions = (action: HTMLElement) => {
  const style = window.getComputedStyle(action);

  expect(style.minHeight).not.toBe("");
  expect(style.minWidth).not.toBe("");

  return {
    minHeight: style.minHeight,
    minWidth: style.minWidth,
  };
};

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

const flushUi = async () => {
  await act(async () => {
    await flushPromises();
    if (vi.isFakeTimers()) {
      await vi.advanceTimersByTimeAsync(0);
    }
  });
};

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("DurableParticipantJourneyPanel live verification behavior", () => {
  it("keeps pending and verifying state owned by Task while other Tasks and Campaign selection stay operable", async () => {
    const taskBResult = deferred<ParticipantVerifyResult>();
    const verifyTask = vi.fn<ParticipantJourneyApiBridge["verifyTask"]>((taskId) => {
      if (taskId === taskAId) {
        return Promise.resolve(verificationSuccess({
          attemptId: "attempt-task-a-pending",
          outcome: "pending",
          taskId,
        }));
      }
      return taskBResult.promise;
    });
    const bridge = createBridge({ verifyTask });
    const rendered = renderPanel(bridge);
    const journey = await openCampaign();
    const taskAInitialAction = within(journey).getByRole("button", {
      name: taskActionName(copy["en-US"].verify, taskAId),
    });
    const taskA = taskRowFromAction(taskAInitialAction);

    vi.useFakeTimers();
    fireEvent.click(taskAInitialAction);
    await flushUi();

    expect(taskAction(taskA, copy["en-US"].pending, taskAId)).toBeDisabled();
    const taskBAction = within(journey).getByRole("button", {
      name: taskActionName(copy["en-US"].verify, taskBId),
    });
    expect(taskBAction).toBeEnabled();
    expect(screen.getByRole("button", {
      name: campaignActionName("en-US", campaignBId, "Campaign Beta"),
    })).toBeEnabled();

    fireEvent.click(taskBAction);
    await flushUi();

    expect(verifyTask).toHaveBeenCalledTimes(2);
    expect(verifyTask.mock.calls.map(([taskId]) => taskId)).toEqual([taskAId, taskBId]);
    expect(taskAction(taskRowFromAction(taskBAction), copy["en-US"].verifying, taskBId))
      .toBeDisabled();
    expect(taskAction(taskA, copy["en-US"].pending, taskAId)).toBeDisabled();

    const taskBSignal = verifyTask.mock.calls[1][1].signal;
    rendered.unmount();

    expect(taskBSignal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("announces attempt-only 202 as pending, polls within a fixed bound, and never invents completion", async () => {
    const attemptId = "attempt-id-must-not-render";
    const providerFamily = "provider-family-must-not-render";
    const verifyTask = vi.fn<ParticipantJourneyApiBridge["verifyTask"]>(async () =>
      verificationSuccess({
        attemptId,
        outcome: "pending",
        providerFamily,
        retryAfterMs: 1_000,
      }));
    const getJourney = vi.fn<ParticipantJourneyApiBridge["getJourney"]>(async (context) =>
      journeySuccess(journeyProjection(context.selectedCampaignId ?? campaignAId)));
    const bridge = createBridge({ getJourney, verifyTask });
    const rendered = renderPanel(bridge);
    const journey = await openCampaign();
    const initialAction = within(journey).getByRole("button", {
      name: taskActionName(copy["en-US"].verify, taskAId),
    });
    const row = taskRowFromAction(initialAction);
    const stableDimensions = actionDimensions(initialAction);

    vi.useFakeTimers();
    fireEvent.click(initialAction);
    await flushUi();

    const pendingStatus = liveStatus(row, copy["en-US"].pending);
    const pendingAction = taskAction(row, copy["en-US"].pending, taskAId);
    expect(pendingStatus.querySelector("svg")).not.toBeNull();
    expect(pendingAction).toBeDisabled();
    expect(pendingAction).toHaveAttribute("aria-busy", "true");
    expect(actionDimensions(pendingAction)).toEqual(stableDimensions);
    expect(row).not.toHaveTextContent(copy["en-US"].completed);
    expect(document.body).not.toHaveTextContent(attemptId);
    expect(document.body).not.toHaveTextContent(providerFamily);
    expect(getJourney).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(1);

    for (let poll = 0; poll <= PARTICIPANT_JOURNEY_POLL_MAX_ATTEMPTS; poll += 1) {
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
        await flushPromises();
      });
    }

    expect(verifyTask).toHaveBeenCalledTimes(PARTICIPANT_JOURNEY_POLL_MAX_ATTEMPTS + 1);
    expect(vi.getTimerCount()).toBe(0);
    expect(getJourney).toHaveBeenCalledTimes(1);
    expect(row).not.toHaveTextContent(copy["en-US"].completed);
    expect(row).toHaveTextContent(copy["en-US"].unavailable);
    expect(taskAction(row, copy["en-US"].retry, taskAId)).toBeEnabled();

    rendered.unmount();
  });

  it("counts hidden-aborted poll dispatches toward the fixed bound", async () => {
    const visibilityState = vi
      .spyOn(document, "visibilityState", "get")
      .mockReturnValue("visible");
    const pendingPolls: Array<ReturnType<typeof deferred<ParticipantVerifyResult>>> = [];
    const verifyTask = vi
      .fn<ParticipantJourneyApiBridge["verifyTask"]>()
      .mockResolvedValueOnce(verificationSuccess({
        outcome: "pending",
        retryAfterMs: 1_000,
      }))
      .mockImplementation(() => {
        const poll = deferred<ParticipantVerifyResult>();
        pendingPolls.push(poll);
        return poll.promise;
      });
    const bridge = createBridge({ verifyTask });
    const rendered = renderPanel(bridge);
    const journey = await openCampaign();
    const initialAction = within(journey).getByRole("button", {
      name: taskActionName(copy["en-US"].verify, taskAId),
    });
    const row = taskRowFromAction(initialAction);

    vi.useFakeTimers();
    fireEvent.click(initialAction);
    await flushUi();

    for (let poll = 1; poll <= PARTICIPANT_JOURNEY_POLL_MAX_ATTEMPTS; poll += 1) {
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
        await flushPromises();
      });
      expect(verifyTask).toHaveBeenCalledTimes(poll + 1);
      const pollSignal = verifyTask.mock.calls[poll][1].signal;
      expect(pollSignal?.aborted).toBe(false);

      visibilityState.mockReturnValue("hidden");
      fireEvent(document, new Event("visibilitychange"));
      await flushUi();
      expect(pollSignal?.aborted).toBe(true);

      visibilityState.mockReturnValue("visible");
      fireEvent(document, new Event("visibilitychange"));
      await flushUi();
      expect(vi.getTimerCount()).toBe(
        poll < PARTICIPANT_JOURNEY_POLL_MAX_ATTEMPTS ? 1 : 0,
      );
    }

    expect(pendingPolls).toHaveLength(PARTICIPANT_JOURNEY_POLL_MAX_ATTEMPTS);
    expect(row).toHaveTextContent(copy["en-US"].unavailable);
    expect(taskAction(row, copy["en-US"].retry, taskAId)).toBeEnabled();
    rendered.unmount();
  });

  it("waits for exactly one authoritative journey refresh before rendering a terminal result", async () => {
    const refresh = deferred<ParticipantJourneyResult>();
    const getJourney = vi
      .fn<ParticipantJourneyApiBridge["getJourney"]>()
      .mockResolvedValueOnce(journeySuccess(journeyProjection(campaignAId), "trace-initial"))
      .mockImplementationOnce(() => refresh.promise);
    const verifyTask = vi.fn<ParticipantJourneyApiBridge["verifyTask"]>(async () =>
      verificationSuccess({ outcome: "completed" }));
    const bridge = createBridge({ getJourney, verifyTask });
    renderPanel(bridge);
    const journey = await openCampaign();
    const initialAction = within(journey).getByRole("button", {
      name: taskActionName(copy["en-US"].verify, taskAId),
    });
    const row = taskRowFromAction(initialAction);

    fireEvent.click(initialAction);

    await waitFor(() => expect(getJourney).toHaveBeenCalledTimes(2));
    expect(row).not.toHaveTextContent(copy["en-US"].completed);
    expect(journey).toHaveTextContent("Points0");

    await act(async () => {
      refresh.resolve(journeySuccess(journeyProjection(campaignAId, [
        { status: "completed", taskId: taskAId },
        { taskId: taskBId },
      ]), "trace-authoritative-refresh"));
      await refresh.promise;
    });

    await waitFor(() => {
      expect(taskAction(row, copy["en-US"].completed, taskAId)).toBeDisabled();
    });
    expect(row).toHaveTextContent(copy["en-US"].completed);
    expect(journey).toHaveTextContent("Points25");
    await flushUi();
    expect(getJourney).toHaveBeenCalledTimes(2);
    expect(verifyTask).toHaveBeenCalledTimes(1);
  });

  it("aborts a superseded Task controller before Retry can replace its registry owner", async () => {
    const taskACommand = deferred<ParticipantVerifyResult>();
    const taskBOldPoll = deferred<ParticipantVerifyResult>();
    const taskBRetry = deferred<ParticipantVerifyResult>();
    let taskBCalls = 0;
    const getJourney = vi
      .fn<ParticipantJourneyApiBridge["getJourney"]>()
      .mockResolvedValueOnce(journeySuccess(journeyProjection(campaignAId)))
      .mockResolvedValueOnce(journeySuccess(journeyProjection(campaignAId, [
        { status: "completed", taskId: taskAId },
        { status: "failed", taskId: taskBId },
      ]), "trace-shared-terminal-refresh"));
    const verifyTask = vi.fn<ParticipantJourneyApiBridge["verifyTask"]>((taskId) => {
      if (taskId === taskAId) {
        return taskACommand.promise;
      }
      taskBCalls += 1;
      if (taskBCalls === 1) {
        return Promise.resolve(verificationSuccess({
          attemptId: "attempt-task-b-pending",
          outcome: "pending",
          taskId,
        }));
      }
      return taskBCalls === 2 ? taskBOldPoll.promise : taskBRetry.promise;
    });
    const bridge = createBridge({ getJourney, verifyTask });
    const rendered = renderPanel(bridge);
    const journey = await openCampaign();
    const taskAAction = within(journey).getByRole("button", {
      name: taskActionName(copy["en-US"].verify, taskAId),
    });
    const taskBAction = within(journey).getByRole("button", {
      name: taskActionName(copy["en-US"].verify, taskBId),
    });

    vi.useFakeTimers();
    fireEvent.click(taskAAction);
    fireEvent.click(taskBAction);
    await flushUi();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
      await flushPromises();
    });
    expect(verifyTask).toHaveBeenCalledTimes(3);
    const oldPollSignal = verifyTask.mock.calls[2][1].signal;
    expect(oldPollSignal?.aborted).toBe(false);

    await act(async () => {
      taskACommand.resolve(verificationSuccess({ outcome: "completed", taskId: taskAId }));
      await taskACommand.promise;
      await flushPromises();
    });
    await flushUi();
    expect(getJourney).toHaveBeenCalledTimes(2);
    expect(oldPollSignal?.aborted).toBe(true);

    const retryTaskB = within(journey).getByRole("button", {
      name: taskActionName(copy["en-US"].retry, taskBId),
    });
    fireEvent.click(retryTaskB);
    await flushUi();
    expect(verifyTask).toHaveBeenCalledTimes(4);
    const retrySignal = verifyTask.mock.calls[3][1].signal;
    expect(retrySignal?.aborted).toBe(false);

    rendered.unmount();
    expect(retrySignal?.aborted).toBe(true);
    expect(oldPollSignal?.aborted).toBe(true);
  });

  it.each([
    {
      actionLabel: copy["en-US"].retry,
      disabled: false,
      kind: "failed",
      statusLabel: copy["en-US"].failed,
    },
    {
      actionLabel: copy["en-US"].awaitReview,
      disabled: true,
      kind: "manual_review",
      statusLabel: copy["en-US"].awaitReview,
    },
    {
      actionLabel: copy["en-US"].retry,
      disabled: false,
      kind: "unavailable",
      statusLabel: copy["en-US"].unavailable,
    },
  ] as const)(
    "renders $kind in a stable action slot with the contracted next action",
    async ({ actionLabel, disabled, kind, statusLabel }) => {
      let journeyRead = 0;
      const terminalStatus = kind === "unavailable" ? null : kind;
      const getJourney = vi.fn<ParticipantJourneyApiBridge["getJourney"]>(async () => {
        journeyRead += 1;
        return journeySuccess(journeyProjection(campaignAId, journeyRead === 1
          ? [{ taskId: taskAId }, { taskId: taskBId }]
          : [
              { status: terminalStatus ?? "not_started", taskId: taskAId },
              { taskId: taskBId },
            ]));
      });
      const verifyTask = vi.fn<ParticipantJourneyApiBridge["verifyTask"]>(async () =>
        kind === "unavailable"
          ? verificationFailure()
          : verificationSuccess({
              outcome: kind,
              retryable: kind === "failed",
            }));
      const bridge = createBridge({ getJourney, verifyTask });
      renderPanel(bridge);
      const journey = await openCampaign();
      const initialAction = within(journey).getByRole("button", {
        name: taskActionName(copy["en-US"].verify, taskAId),
      });
      const row = taskRowFromAction(initialAction);
      const stableDimensions = actionDimensions(initialAction);

      fireEvent.click(initialAction);

      await waitFor(() => {
        expect(taskAction(row, actionLabel, taskAId)).toBeInTheDocument();
      });
      const nextAction = taskAction(row, actionLabel, taskAId);
      expect(row).toHaveTextContent(statusLabel);
      expect(nextAction.querySelector("svg")).not.toBeNull();
      expect(actionDimensions(nextAction)).toEqual(stableDimensions);
      if (disabled) {
        expect(nextAction).toBeDisabled();
      } else {
        expect(nextAction).toBeEnabled();
      }

      expect(getJourney).toHaveBeenCalledTimes(kind === "unavailable" ? 1 : 2);
      expect(journey).toHaveTextContent("Points0");
      if (kind === "manual_review") {
        expect(within(row).queryByRole("button", {
          name: taskActionName(copy["en-US"].retry, taskAId),
        })).not.toBeInTheDocument();
      }
      if (kind === "unavailable") {
        expect(within(journey).getByRole("button", {
          name: taskActionName(copy["en-US"].verify, taskBId),
        })).toBeEnabled();
        expect(screen.getByRole("button", {
          name: campaignActionName("en-US", campaignBId, "Campaign Beta"),
        })).toBeEnabled();
      }
    },
  );

  it("cancels the Task poll owner when a different Campaign is selected", async () => {
    const verifyTask = vi.fn<ParticipantJourneyApiBridge["verifyTask"]>(async () =>
      verificationSuccess({ outcome: "pending", retryAfterMs: 1_000 }));
    const bridge = createBridge({ verifyTask });
    const rendered = renderPanel(bridge);
    const journey = await openCampaign();
    const verify = within(journey).getByRole("button", {
      name: taskActionName(copy["en-US"].verify, taskAId),
    });

    vi.useFakeTimers();
    fireEvent.click(verify);
    await flushUi();
    expect(vi.getTimerCount()).toBe(1);

    fireEvent.click(screen.getByRole("button", {
      name: campaignActionName("en-US", campaignBId, "Campaign Beta"),
    }));
    await flushUi();
    await flushUi();

    expect(verifyTask).toHaveBeenCalledTimes(1);
    const campaignBJourney = screen.getByRole("region", { name: copy["en-US"].journey });
    expect(journey).not.toBeInTheDocument();
    expect(campaignBJourney).toHaveTextContent(campaignBId);
    expect(campaignBJourney).not.toHaveTextContent(copy["en-US"].pending);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
      await flushPromises();
    });
    expect(verifyTask).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);

    rendered.unmount();
  });

  it("aborts an in-flight poll and ignores its late terminal response after session context changes", async () => {
    const oldPoll = deferred<ParticipantVerifyResult>();
    const sessionB = issuedSession({
      address: "ELF_PARTICIPANT_SESSION_B",
      displayAddress: "ELF_...ON_B",
      sessionId: "participant-session-b",
    });
    const listCampaigns = vi.fn<ParticipantJourneyApiBridge["listCampaigns"]>(async (context) => ({
      campaigns: context.session?.sessionId === sessionB.sessionId
        ? [feedItem(campaignBId, "Campaign Beta")]
        : [feedItem(campaignAId, "Campaign Alpha")],
      httpStatus: 200,
      ok: true,
      source: "durable",
      status: "success",
      traceId: `trace-feed-${context.session?.sessionId}`,
    }));
    const verifyTask = vi
      .fn<ParticipantJourneyApiBridge["verifyTask"]>()
      .mockResolvedValueOnce(verificationSuccess({
        attemptId: "attempt-old-epoch",
        outcome: "pending",
        retryAfterMs: 1_000,
      }))
      .mockImplementationOnce(() => oldPoll.promise);
    const bridge = createBridge({ listCampaigns, verifyTask });
    const rendered = renderPanel(bridge);
    const journey = await openCampaign();

    vi.useFakeTimers();
    fireEvent.click(within(journey).getByRole("button", {
      name: taskActionName(copy["en-US"].verify, taskAId),
    }));
    await flushUi();
    expect(vi.getTimerCount()).toBe(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
      await flushPromises();
    });
    expect(verifyTask).toHaveBeenCalledTimes(2);
    const staleSignal = verifyTask.mock.calls[1][1].signal;

    rendered.rerender(panel(bridge, "en-US", sessionB));
    await flushUi();

    expect(staleSignal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    expect(listCampaigns).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", {
      name: campaignActionName("en-US", campaignBId, "Campaign Beta"),
    })).toBeInTheDocument();

    await act(async () => {
      oldPoll.resolve(verificationSuccess({
        attemptId: "attempt-old-epoch",
        outcome: "completed",
      }));
      await oldPoll.promise;
      await flushPromises();
    });

    expect(bridge.getJourney).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("region", { name: copy["en-US"].journey }))
      .not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("completion-task-live-a");
    expect(document.body).not.toHaveTextContent("attempt-old-epoch");

    rendered.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("moves disabled action focus to its Task status without stealing later navigation focus", async () => {
    const command = deferred<ParticipantVerifyResult>();
    let journeyRead = 0;
    const getJourney = vi.fn<ParticipantJourneyApiBridge["getJourney"]>(async () => {
      journeyRead += 1;
      return journeySuccess(journeyProjection(campaignAId, journeyRead === 1
        ? [{ taskId: taskAId }, { taskId: taskBId }]
        : [{ status: "completed", taskId: taskAId }, { taskId: taskBId }]));
    });
    const verifyTask = vi.fn<ParticipantJourneyApiBridge["verifyTask"]>(() => command.promise);
    const bridge = createBridge({ getJourney, verifyTask });
    renderPanel(bridge);
    const journey = await openCampaign();
    const heading = within(journey).getByRole("heading", { name: "Campaign Alpha" });
    const verify = within(journey).getByRole("button", {
      name: taskActionName(copy["en-US"].verify, taskAId),
    });
    const campaignB = screen.getByRole("button", {
      name: campaignActionName("en-US", campaignBId, "Campaign Beta"),
    });

    verify.focus();
    fireEvent.click(verify);
    await waitFor(() => expect(verifyTask).toHaveBeenCalledTimes(1));

    expect(liveStatus(taskRowFromAction(verify), copy["en-US"].verifying)).toHaveFocus();
    expect(heading).not.toHaveFocus();
    campaignB.focus();
    expect(campaignB).toHaveFocus();

    await act(async () => {
      command.resolve(verificationSuccess({ outcome: "completed" }));
      await command.promise;
    });
    await waitFor(() => expect(getJourney).toHaveBeenCalledTimes(2));
    await waitFor(() => {
      expect(within(journey).getByRole("button", {
        name: taskActionName(copy["en-US"].completed, taskAId),
      })).toBeDisabled();
    });

    expect(campaignB).toHaveFocus();
    expect(heading).not.toHaveFocus();
  });

  it.each([
    ["en-US", copy["en-US"]],
    ["zh-CN", copy["zh-CN"]],
    ["zh-TW", copy["zh-TW"]],
  ] as const)(
    "localizes verifying and pending status for %s",
    async (locale, localized) => {
      const command = deferred<ParticipantVerifyResult>();
      const verifyTask = vi.fn<ParticipantJourneyApiBridge["verifyTask"]>(() => command.promise);
      const bridge = createBridge({ verifyTask });
      const rendered = renderPanel(bridge, locale);
      const journey = await openCampaign(locale);
      const verify = within(journey).getByRole("button", {
        name: taskActionName(localized.verify, taskAId),
      });
      const row = taskRowFromAction(verify);

      fireEvent.click(verify);
      await waitFor(() => expect(verifyTask).toHaveBeenCalledTimes(1));

      expect(liveStatus(row, localized.verifying)).toBeInTheDocument();
      expect(taskAction(row, localized.verifying, taskAId)).toBeDisabled();

      await act(async () => {
        command.resolve(verificationSuccess({
          outcome: "pending",
          retryAfterMs: 30_000,
        }));
        await command.promise;
      });
      await waitFor(() => {
        expect(liveStatus(row, localized.pending)).toBeInTheDocument();
      });
      expect(taskAction(row, localized.pending, taskAId)).toBeDisabled();
      expect(row).not.toHaveTextContent(localized.completed);
      if (locale !== "en-US") {
        expect(row).not.toHaveTextContent(copy["en-US"].pending);
      }

      rendered.unmount();
    },
  );
});
