import { describe, expect, it } from "vitest";
import type {
  ParticipantCampaignFeedItem,
  ParticipantCampaignListSuccess,
  ParticipantJourneyFailure,
  ParticipantJourneyProjection,
  ParticipantJourneySuccess,
  ParticipantVerifySuccess,
} from "../../../api/participantJourneyApiBridge";
import type { NormalizedWalletSession } from "../../../domain/types";
import {
  PARTICIPANT_AUTHENTICATION_MAX_CONFLICT_RECOVERY_STEPS,
  PARTICIPANT_JOURNEY_POLL_MAX_ATTEMPTS,
  PARTICIPANT_JOURNEY_POLL_MAX_DELAY_MS,
  PARTICIPANT_JOURNEY_POLL_MIN_DELAY_MS,
  canPollParticipantJourneyTask,
  canReconnectParticipantJourney,
  canSelectParticipantCampaign,
  canVerifyParticipantJourneyTask,
  createParticipantAuthenticationWorkflowState,
  createParticipantJourneyWorkflowState,
  createParticipantSessionKey,
  nextParticipantJourneyRequestToken,
  participantAuthenticationWorkflowReducer,
  participantJourneyWorkflowReducer,
  selectParticipantAuthenticationAction,
  selectParticipantJourneyRefreshTaskId,
  selectParticipantJourneyTaskAction,
  selectParticipantJourneyTaskAttempt,
  selectParticipantJourneyTaskPoll,
  selectParticipantJourneyTaskRefresh,
  selectParticipantJourneyRetryOperation,
  type ParticipantAuthenticationFailure,
  type ParticipantAuthenticationPrivateSession,
  type ParticipantAuthenticationWalletConnection,
  type ParticipantJourneyRequestToken,
  type ParticipantJourneyWorkflowState,
} from "./participantJourneyWorkflow";

const campaignAId = "campaign-durable-a";
const campaignBId = "campaign-durable-b";
const taskAId = "task-durable-a";
const taskBId = "task-durable-b";
const walletAddress = "2F4xYZaB9mQParticipant";

const session = (
  overrides: Partial<NormalizedWalletSession> = {},
): NormalizedWalletSession => ({
  accountType: "EOA",
  address: walletAddress,
  capabilities: ["SIGN_MESSAGE", "CONTRACT_VIEW"],
  chainId: "AELF",
  displayAddress: "2F4x...pant",
  id: "wallet-session-participant",
  issuer: {
    artifactType: "local_session_reference",
    cookieIssued: false,
    diagnosticCodes: [],
    issuerMode: "local_opaque",
    jwtIssued: false,
    liveSigningExecuted: false,
    referenceId: "issuer-ref-participant",
    ttlSeconds: 900,
    valid: true,
  },
  network: "testnet",
  normalUserRecommended: true,
  productionReadiness: {
    blockedDependencyIds: [],
    liveSigningReady: true,
    liveVerifierReady: true,
    productionReady: false,
    productionRequired: false,
    productionSessionStoreReady: true,
    secretManagerReady: true,
    signingKeyReady: true,
  },
  proof: {
    diagnosticCodes: [],
    liveVerificationExecuted: false,
    proofType: "wallet_signature",
    status: "verified",
    trustLevel: "verified_local",
  },
  sessionId: "sess-participant-issued",
  signatureStatus: "signed",
  statusMessage: { "en-US": "Connected", "zh-CN": "Connected" },
  verificationStatus: "verified",
  walletName: "Portkey EOA",
  walletSource: "PORTKEY_EOA_EXTENSION",
  walletTypeVerified: true,
  ...overrides,
});

const repository = {
  adapterId: "campaign-db-adapter",
  createdViaRepository: true,
  repositoryId: "campaign-db-repository-runtime",
  storeId: "campaign-db",
} as const;

const verificationRepository = {
  ...repository,
  adapterId: "campaign-db-postgresql-adapter",
  mode: "postgres",
} as const;

const feedItem = (campaignId: string): ParticipantCampaignFeedItem => ({
  campaignId,
  goal: `Goal for ${campaignId}`,
  projectId: "project-aelf",
  repository,
  status: "draft",
  taskCount: 1,
  title: { "en-US": campaignId, "zh-CN": campaignId },
  visibility: "participant_preview",
});

interface JourneyOptions {
  action?: ParticipantJourneyProjection["tasks"][number]["action"];
  campaignId?: string;
  points?: number;
  taskId?: string;
}

const journey = ({
  action = "verify",
  campaignId = campaignAId,
  points = 0,
  taskId = taskAId,
}: JourneyOptions = {}): ParticipantJourneyProjection => ({
  campaign: {
    campaignId,
    endTime: "2026-08-01T00:00:00.000Z",
    goal: `Goal for ${campaignId}`,
    projectId: "project-aelf",
    rewardDescription: "Project-owned rewards",
    startTime: "2026-07-14T00:00:00.000Z",
    status: "draft",
    taskCount: 1,
    walletPolicy: "ANY",
  },
  diagnostics: [],
  eligibility: {
    accountType: "EOA",
    campaignId,
    eligible: points > 0,
    localePreference: "en-US",
    missingTasks: points > 0 ? [] : ["follow-x"],
    riskFlags: [],
    score: points,
    status: points > 0 ? "eligible" : "not_eligible",
    walletAddress,
    walletSource: "PORTKEY_EOA_EXTENSION",
    walletTypeVerified: true,
  },
  participant: {
    accountType: "EOA",
    campaignId,
    localePreference: "en-US",
    participantId: points > 0 ? "participant-db-1" : null,
    riskFlags: [],
    totalPoints: points,
    walletAddress,
    walletSource: "PORTKEY_EOA_EXTENSION",
    walletTypeVerified: true,
  },
  ranking: {
    campaignId,
    participantCount: points > 0 ? 1 : 0,
    rank: points > 0 ? 1 : null,
    source: "repository_projection",
    totalPoints: points,
    walletAddress,
  },
  repository,
  tasks: [{
    action,
    blockedReason: action === "blocked" ? "wallet_incompatible" : null,
    campaignId,
    completionId: points > 0 ? "completion-db-1" : null,
    evidenceId: points > 0 ? "evidence-db-1" : null,
    evidenceSource: points > 0 ? "SOCIAL_API" : null,
    pointsAvailable: 100,
    pointsAwarded: points,
    required: true,
    status: points > 0 ? "completed" : "not_started",
    taskId,
    templateCode: "follow-x",
    updatedAt: points > 0 ? "2026-07-14T12:00:00.000Z" : null,
    verificationType: "SOCIAL",
    walletCompatibility: "ANY",
  }],
});

const feedSuccess = (
  campaigns: readonly ParticipantCampaignFeedItem[],
): ParticipantCampaignListSuccess => ({
  campaigns,
  httpStatus: 200,
  ok: true,
  source: "durable",
  status: "success",
  traceId: "trace-feed-success",
});

const journeySuccess = (
  projection: ParticipantJourneyProjection,
): ParticipantJourneySuccess => ({
  httpStatus: 200,
  journey: projection,
  ok: true,
  source: "durable",
  status: "success",
  traceId: "trace-journey-success",
});

const verifySuccess = (
  pointsAwarded = 100,
): ParticipantVerifySuccess => ({
  httpStatus: 200,
  ok: true,
  outcome: "completed",
  source: "durable",
  status: "completed",
  traceId: "trace-verify-command",
  verification: {
    attempt: {
      authoritative: true,
      id: "verification-attempt-command",
      providerFamily: "social-live",
      retryable: false,
      status: "completed",
      transportExecuted: true,
    },
    completion: {
      accountType: "EOA",
      campaignId: campaignAId,
      evidenceId: "evidence-db-1",
      id: "completion-db-1",
      pointsAwarded,
      status: "completed",
      taskId: taskAId,
      verificationAttemptId: "verification-attempt-command",
      walletAddress,
      walletSource: "PORTKEY_EOA_EXTENSION",
    },
    diagnostics: [],
    evidence: {
      accountType: "EOA",
      campaignId: campaignAId,
      completionId: "completion-db-1",
      evidenceHash: "a".repeat(64),
      evidenceRef: "provider:evidence:participant",
      evidenceSource: "DAPP_API",
      id: "evidence-db-1",
      liveProviderExecuted: true,
      pointsAwarded,
      status: "completed",
      taskId: taskAId,
      verificationAttemptId: "verification-attempt-command",
      walletAddress,
      walletSource: "PORTKEY_EOA_EXTENSION",
    },
    outcome: "completed",
    participant: {
      accountType: "EOA",
      campaignId: campaignAId,
      id: "participant-from-command",
      totalPoints: pointsAwarded,
      walletAddress,
      walletSource: "PORTKEY_EOA_EXTENSION",
    },
    repository: verificationRepository,
  },
});

const failure = (
  overrides: Partial<ParticipantJourneyFailure> = {},
): ParticipantJourneyFailure => ({
  code: "PERSISTENCE_UNAVAILABLE",
  httpStatus: 503,
  ok: false,
  phase: "request",
  reconnectRequired: false,
  retryable: true,
  source: "durable",
  status: "degraded",
  traceId: "trace-read-failure",
  ...overrides,
});

const bridgeResponseIntegrityFailures = [
  { code: "BRIDGE_RESPONSE_INVALID", status: "blocked" },
  { code: "BRIDGE_RESPONSE_NON_JSON", status: "degraded" },
  { code: "BRIDGE_RESPONSE_EMPTY", status: "degraded" },
  { code: "BRIDGE_RESPONSE_OVERSIZE", status: "degraded" },
] as const;

const sessionKey = createParticipantSessionKey(session()) as string;

const stateWithSession = (): ParticipantJourneyWorkflowState =>
  createParticipantJourneyWorkflowState({ mode: "durable", sessionKey });

const stateWithFeed = (
  campaigns: readonly ParticipantCampaignFeedItem[] = [
    feedItem(campaignAId),
    feedItem(campaignBId),
  ],
): ParticipantJourneyWorkflowState => {
  const initial = stateWithSession();
  const token = nextParticipantJourneyRequestToken(initial, "feed");
  const loading = participantJourneyWorkflowReducer(initial, {
    token,
    type: "feed_requested",
  });

  return participantJourneyWorkflowReducer(loading, {
    result: feedSuccess(campaigns),
    token,
    type: "feed_succeeded",
  });
};

const stateWithSelection = (): ParticipantJourneyWorkflowState =>
  participantJourneyWorkflowReducer(stateWithFeed(), {
    campaignId: campaignAId,
    type: "campaign_selected",
  });

const stateWithJourneyRequest = (): {
  state: ParticipantJourneyWorkflowState;
  token: ParticipantJourneyRequestToken;
} => {
  const selected = stateWithSelection();
  const token = nextParticipantJourneyRequestToken(selected, "journey");

  return {
    state: participantJourneyWorkflowReducer(selected, {
      reason: "selection",
      token,
      type: "journey_requested",
    }),
    token,
  };
};

const readyState = (
  projection: ParticipantJourneyProjection = journey(),
): ParticipantJourneyWorkflowState => {
  const requested = stateWithJourneyRequest();

  return participantJourneyWorkflowReducer(requested.state, {
    result: journeySuccess(projection),
    token: requested.token,
    type: "journey_succeeded",
  });
};

const verifyingState = (): {
  state: ParticipantJourneyWorkflowState;
  token: ParticipantJourneyRequestToken;
} => {
  const ready = readyState();
  const token = nextParticipantJourneyRequestToken(ready, "verify");

  return {
    state: participantJourneyWorkflowReducer(ready, {
      taskId: taskAId,
      token,
      type: "verify_requested",
    }),
    token,
  };
};

const refreshPendingState = (): ParticipantJourneyWorkflowState => {
  const verifying = verifyingState();

  return participantJourneyWorkflowReducer(verifying.state, {
    result: verifySuccess(),
    token: verifying.token,
    type: "verify_succeeded",
  });
};

const degradedAfterRefresh = (): ParticipantJourneyWorkflowState => {
  const pending = refreshPendingState();
  const token = nextParticipantJourneyRequestToken(pending, "journey");
  const refreshing = participantJourneyWorkflowReducer(pending, {
    reason: "refresh",
    token,
    type: "journey_requested",
  });

  return participantJourneyWorkflowReducer(refreshing, {
    failure: failure({ traceId: "trace-refresh-failure" }),
    token,
    type: "journey_failed",
  });
};

type AttemptOutcome = "completed" | "failed" | "manual_review" | "pending";

const journeyWithTasks = (
  taskIds: readonly string[],
): ParticipantJourneyProjection => {
  const base = journey();
  const template = base.tasks[0];

  return {
    ...base,
    campaign: { ...base.campaign, taskCount: taskIds.length },
    tasks: taskIds.map((taskId) => ({ ...template, taskId })),
  };
};

const journeyForOutcome = (
  outcome: Exclude<AttemptOutcome, "pending">,
  taskId = taskAId,
): ParticipantJourneyProjection => {
  const base = journeyWithTasks([taskId]);
  const task = base.tasks[0];
  const completed = outcome === "completed";

  return {
    ...base,
    eligibility: {
      ...base.eligibility,
      eligible: completed,
      missingTasks: completed ? [] : ["follow-x"],
      score: completed ? 100 : 0,
      status: completed ? "eligible" : "not_eligible",
    },
    participant: {
      ...base.participant,
      participantId: "participant-db-1",
      totalPoints: completed ? 100 : 0,
    },
    ranking: {
      ...base.ranking,
      participantCount: 1,
      rank: completed ? 1 : null,
      totalPoints: completed ? 100 : 0,
    },
    tasks: [{
      ...task,
      action: completed
        ? "completed"
        : outcome === "manual_review"
          ? "await_review"
          : "retry",
      completionId: "completion-db-1",
      evidenceId: completed ? "evidence-db-1" : null,
      evidenceSource: completed ? "SOCIAL_API" : null,
      pointsAwarded: completed ? 100 : 0,
      status: outcome,
      updatedAt: "2026-07-14T12:00:00.000Z",
    }],
  };
};

interface AttemptVerifyOptions {
  attemptId?: string;
  completionId?: string;
  outcome: AttemptOutcome;
  retryAfterMs?: number;
  retryable?: boolean;
  taskId?: string;
}

const attemptVerifySuccess = ({
  attemptId = "verification-attempt-a",
  completionId,
  outcome,
  retryAfterMs,
  retryable = outcome === "pending",
  taskId = taskAId,
}: AttemptVerifyOptions): ParticipantVerifySuccess => {
  const base = verifySuccess(outcome === "completed" ? 100 : 0);
  const completed = outcome === "completed";
  const baseCompletion = base.verification.completion;
  const baseEvidence = base.verification.evidence;
  const baseParticipant = base.verification.participant;
  if (completed && (!baseCompletion || !baseEvidence || !baseParticipant)) {
    throw new Error("completed verification fixture requires terminal projections");
  }
  const verification: ParticipantVerifySuccess["verification"] = {
    attempt: {
      authoritative: true,
      id: attemptId,
      providerFamily: "social-live",
      retryable,
      ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
      status: outcome,
      transportExecuted: true,
    },
    ...(completed ? {
      completion: {
        ...baseCompletion!,
        evidenceId: "evidence-db-1",
        id: "completion-db-1",
        pointsAwarded: 100,
        taskId,
        verificationAttemptId: attemptId,
      },
      evidence: {
        ...baseEvidence!,
        completionId: "completion-db-1",
        id: "evidence-db-1",
        pointsAwarded: 100,
        taskId,
        verificationAttemptId: attemptId,
      },
      participant: {
        ...baseParticipant!,
        totalPoints: 100,
      },
    } : completionId && outcome !== "pending" ? {
      completion: {
        accountType: "EOA",
        campaignId: campaignAId,
        id: completionId,
        pointsAwarded: 0,
        status: outcome,
        taskId,
        verificationAttemptId: attemptId,
        walletAddress,
        walletSource: "PORTKEY_EOA_EXTENSION",
      },
    } : {}),
    diagnostics: [],
    outcome,
    repository: verificationRepository,
  };

  return {
    ...base,
    httpStatus: outcome === "pending" ? 202 : 200,
    outcome,
    status: outcome,
    verification,
  };
};

describe("Participant journey workflow", () => {
  it("creates a stable Participant session key from issued identity and readiness", () => {
    const issued = session();
    const sameSubjectCaseVariant = session({ address: issued.address.toLowerCase() });
    const changedProof = session({
      proof: issued.proof ? { ...issued.proof, status: "stale" } : undefined,
    });

    expect(createParticipantSessionKey(null)).toBeNull();
    expect(createParticipantSessionKey(undefined)).toBeNull();
    expect(createParticipantSessionKey(sameSubjectCaseVariant)).not.toBe(
      createParticipantSessionKey(issued),
    );
    expect(createParticipantSessionKey(session({ sessionId: "session-b" }))).not.toBe(
      createParticipantSessionKey(issued),
    );
    expect(createParticipantSessionKey(changedProof)).not.toBe(
      createParticipantSessionKey(issued),
    );
  });

  it.each([
    ["no_session", () => createParticipantJourneyWorkflowState()],
    [
      "loading_feed",
      () => {
        const state = stateWithSession();
        return participantJourneyWorkflowReducer(state, {
          token: nextParticipantJourneyRequestToken(state, "feed"),
          type: "feed_requested",
        });
      },
    ],
    ["feed_ready", () => stateWithFeed()],
    ["loading_journey", () => stateWithSelection()],
    ["ready", () => readyState()],
    ["verifying", () => verifyingState().state],
    ["degraded", () => degradedAfterRefresh()],
    [
      "blocked",
      () => {
        const requested = stateWithJourneyRequest();
        return participantJourneyWorkflowReducer(requested.state, {
          failure: failure(),
          token: requested.token,
          type: "journey_failed",
        });
      },
    ],
  ] as const)("reaches the legal %s state", (status, buildState) => {
    expect(buildState().status).toBe(status);
  });

  it.each([
    {
      name: "feed without a session",
      run: () => {
        const state = createParticipantJourneyWorkflowState();
        return {
          result: participantJourneyWorkflowReducer(state, {
            token: nextParticipantJourneyRequestToken(state, "feed"),
            type: "feed_requested",
          }),
          state,
        };
      },
    },
    {
      name: "verify without a session",
      run: () => {
        const state = createParticipantJourneyWorkflowState();
        return {
          result: participantJourneyWorkflowReducer(state, {
            taskId: taskAId,
            token: nextParticipantJourneyRequestToken(state, "verify"),
            type: "verify_requested",
          }),
          state,
        };
      },
    },
    {
      name: "unknown Campaign selection",
      run: () => {
        const state = stateWithFeed();
        return {
          result: participantJourneyWorkflowReducer(state, {
            campaignId: "campaign-not-in-feed",
            type: "campaign_selected",
          }),
          state,
        };
      },
    },
    {
      name: "verify before a journey is ready",
      run: () => {
        const state = stateWithSelection();
        return {
          result: participantJourneyWorkflowReducer(state, {
            taskId: taskAId,
            token: nextParticipantJourneyRequestToken(state, "verify"),
            type: "verify_requested",
          }),
          state,
        };
      },
    },
    {
      name: "verify an unknown Task",
      run: () => {
        const state = readyState();
        return {
          result: participantJourneyWorkflowReducer(state, {
            taskId: "task-not-in-journey",
            token: nextParticipantJourneyRequestToken(state, "verify"),
            type: "verify_requested",
          }),
          state,
        };
      },
    },
    {
      name: "refresh without a verify acknowledgement",
      run: () => {
        const state = readyState();
        return {
          result: participantJourneyWorkflowReducer(state, {
            reason: "refresh",
            token: nextParticipantJourneyRequestToken(state, "journey"),
            type: "journey_requested",
          }),
          state,
        };
      },
    },
    {
      name: "response without an active request",
      run: () => {
        const state = stateWithFeed();
        return {
          result: participantJourneyWorkflowReducer(state, {
            result: feedSuccess([feedItem(campaignAId)]),
            token: nextParticipantJourneyRequestToken(state, "feed"),
            type: "feed_succeeded",
          }),
          state,
        };
      },
    },
  ])("keeps the same reference for invalid transition: $name", ({ run }) => {
    const { result, state } = run();
    expect(result).toBe(state);
  });

  it("increments feed, journey, and verify sequences independently", () => {
    const feedReady = stateWithFeed();
    expect(feedReady.sequences).toEqual({ feed: 1, journey: 0, verify: 0 });

    const selected = participantJourneyWorkflowReducer(feedReady, {
      campaignId: campaignAId,
      type: "campaign_selected",
    });
    const journeyToken = nextParticipantJourneyRequestToken(selected, "journey");
    const loading = participantJourneyWorkflowReducer(selected, {
      reason: "selection",
      token: journeyToken,
      type: "journey_requested",
    });
    expect(loading.sequences).toEqual({ feed: 1, journey: 1, verify: 0 });

    const ready = participantJourneyWorkflowReducer(loading, {
      result: journeySuccess(journey()),
      token: journeyToken,
      type: "journey_succeeded",
    });
    const verifyToken = nextParticipantJourneyRequestToken(ready, "verify");
    const verifying = participantJourneyWorkflowReducer(ready, {
      taskId: taskAId,
      token: verifyToken,
      type: "verify_requested",
    });
    expect(verifying.sequences).toEqual({ feed: 1, journey: 1, verify: 1 });

    const degraded = participantJourneyWorkflowReducer(verifying, {
      failure: failure(),
      token: verifyToken,
      type: "verify_failed",
    });
    const retryToken = nextParticipantJourneyRequestToken(
      degraded,
      "verify",
      taskAId,
    );
    const retrying = participantJourneyWorkflowReducer(degraded, {
      taskId: taskAId,
      token: retryToken,
      type: "verify_requested",
    });
    expect(retrying.sequences).toEqual({ feed: 1, journey: 1, verify: 2 });
  });

  it.each([
    ["operation", (token: ParticipantJourneyRequestToken) => ({ ...token, operation: "feed" as const })],
    ["sessionKey", (token: ParticipantJourneyRequestToken) => ({ ...token, sessionKey: "session-stale" })],
    ["campaignId", (token: ParticipantJourneyRequestToken) => ({ ...token, campaignId: campaignBId })],
    ["epoch", (token: ParticipantJourneyRequestToken) => ({ ...token, epoch: token.epoch + 1 })],
    ["sequence", (token: ParticipantJourneyRequestToken) => ({ ...token, sequence: token.sequence + 1 })],
  ] as const)("drops a response with stale token %s identity", (_field, mutate) => {
    const requested = stateWithJourneyRequest();
    const result = participantJourneyWorkflowReducer(requested.state, {
      result: journeySuccess(journey()),
      token: mutate(requested.token),
      type: "journey_succeeded",
    });

    expect(result).toBe(requested.state);
  });

  it("drops duplicate and late responses using the same state reference", () => {
    const requested = stateWithJourneyRequest();
    const ready = participantJourneyWorkflowReducer(requested.state, {
      result: journeySuccess(journey()),
      token: requested.token,
      type: "journey_succeeded",
    });

    expect(participantJourneyWorkflowReducer(ready, {
      result: journeySuccess(journey({ points: 100 })),
      token: requested.token,
      type: "journey_succeeded",
    })).toBe(ready);

    const changedIdentity = participantJourneyWorkflowReducer(requested.state, {
      mode: "durable",
      sessionKey: "participant-session-b",
      type: "context_changed",
    });
    expect(participantJourneyWorkflowReducer(changedIdentity, {
      result: journeySuccess(journey()),
      token: requested.token,
      type: "journey_succeeded",
    })).toBe(changedIdentity);
  });

  it.each([
    {
      expectedFeedLength: 0,
      expectedMode: "seeded_preview" as const,
      expectedSelectedId: null,
      initialState: degradedAfterRefresh,
      name: "mode",
      transition: (state: ParticipantJourneyWorkflowState) =>
        participantJourneyWorkflowReducer(state, {
          mode: "seeded_preview",
          sessionKey,
          type: "context_changed",
        }),
    },
    {
      expectedFeedLength: 0,
      expectedMode: "durable" as const,
      expectedSelectedId: null,
      initialState: degradedAfterRefresh,
      name: "session",
      transition: (state: ParticipantJourneyWorkflowState) =>
        participantJourneyWorkflowReducer(state, {
          mode: "durable",
          sessionKey: "participant-session-b",
          type: "context_changed",
        }),
    },
    {
      expectedFeedLength: 2,
      expectedMode: "durable" as const,
      expectedSelectedId: campaignBId,
      initialState: readyState,
      name: "Campaign",
      transition: (state: ParticipantJourneyWorkflowState) =>
        participantJourneyWorkflowReducer(state, {
          campaignId: campaignBId,
          type: "campaign_selected",
        }),
    },
  ])("resets identity-owned state when $name changes", ({
    expectedFeedLength,
    expectedMode,
    expectedSelectedId,
    initialState,
    transition,
  }) => {
    const before = initialState();
    const after = transition(before);

    expect(after).not.toBe(before);
    expect(after.epoch).toBe(before.epoch + 1);
    expect(after.mode).toBe(expectedMode);
    expect(after.selectedCampaignId).toBe(expectedSelectedId);
    expect(after.feed).toHaveLength(expectedFeedLength);
    expect(after.journey).toBeNull();
    expect(after.lastGoodJourney).toBeNull();
    expect(after.activeRequests).toEqual({ feed: null, journey: null, verify: null });
    expect(after.pendingOperation).toBeNull();
    expect(after.pendingTaskId).toBeNull();
    expect(after.diagnostic).toBeNull();
    expect(after.commandTraceId).toBeNull();
    expect(after.reconnectRequired).toBe(false);
  });

  it("returns the same reference when context identity does not change", () => {
    const state = readyState();
    expect(participantJourneyWorkflowReducer(state, {
      mode: state.mode,
      sessionKey: state.sessionKey,
      type: "context_changed",
    })).toBe(state);
  });

  it("resets identity-owned state for an exact Base58 case variant", () => {
    const before = degradedAfterRefresh();
    const exactSessionKey = createParticipantSessionKey(session()) as string;
    const caseVariantSessionKey = createParticipantSessionKey(session({
      address: walletAddress.toLowerCase(),
    })) as string;

    expect(caseVariantSessionKey).not.toBe(exactSessionKey);

    const after = participantJourneyWorkflowReducer(before, {
      mode: "durable",
      sessionKey: caseVariantSessionKey,
      type: "context_changed",
    });

    expect(after.epoch).toBe(before.epoch + 1);
    expect(after.sessionKey).toBe(caseVariantSessionKey);
    expect(after.selectedCampaignId).toBeNull();
    expect(after.journey).toBeNull();
    expect(after.lastGoodJourney).toBeNull();
    expect(after.pendingOperation).toBeNull();
    expect(after.diagnostic).toBeNull();
  });

  it("removes a selected Campaign that disappears from a refreshed feed", () => {
    const ready = readyState();
    const epoch = ready.epoch;
    const token = nextParticipantJourneyRequestToken(ready, "feed");
    const loading = participantJourneyWorkflowReducer(ready, {
      token,
      type: "feed_requested",
    });
    const refreshed = participantJourneyWorkflowReducer(loading, {
      result: feedSuccess([feedItem(campaignBId)]),
      token,
      type: "feed_succeeded",
    });

    expect(refreshed.epoch).toBe(epoch + 1);
    expect(refreshed.selectedCampaignId).toBeNull();
    expect(refreshed.journey).toBeNull();
    expect(refreshed.lastGoodJourney).toBeNull();
    expect(refreshed.feed.map((item) => item.campaignId)).toEqual([campaignBId]);
    expect(refreshed.status).toBe("feed_ready");
  });

  it("lets a new Campaign selection supersede a pending initial journey read", () => {
    const selected = stateWithSelection();
    const token = nextParticipantJourneyRequestToken(selected, "journey");
    const loading = participantJourneyWorkflowReducer(selected, {
      reason: "selection",
      token,
      type: "journey_requested",
    });

    expect(canSelectParticipantCampaign(loading, campaignBId)).toBe(true);
    const switched = participantJourneyWorkflowReducer(loading, {
      campaignId: campaignBId,
      type: "campaign_selected",
    });

    expect(switched.epoch).toBe(loading.epoch + 1);
    expect(switched.selectedCampaignId).toBe(campaignBId);
    expect(switched.activeRequests.journey).toBeNull();
    expect(switched.pendingOperation).toBeNull();
    expect(switched.journey).toBeNull();
    expect(participantJourneyWorkflowReducer(switched, {
      result: journeySuccess(journey({ campaignId: campaignAId })),
      token,
      type: "journey_succeeded",
    })).toBe(switched);
  });

  it("treats verify success only as command acknowledgement before one refresh", () => {
    const verifying = verifyingState();
    const beforeJourney = verifying.state.journey;
    const acknowledged = participantJourneyWorkflowReducer(verifying.state, {
      result: verifySuccess(100),
      token: verifying.token,
      type: "verify_succeeded",
    });

    expect(acknowledged.status).toBe("verifying");
    expect(acknowledged.pendingOperation).toBe("refresh_journey");
    expect(acknowledged.pendingTaskId).toBe(taskAId);
    expect(acknowledged.commandTraceId).toBe("trace-verify-command");
    expect(acknowledged.journey).toBe(beforeJourney);
    expect(acknowledged.journey?.participant.totalPoints).toBe(0);
    expect(acknowledged.lastGoodJourney).toBe(beforeJourney);
    expect(acknowledged.activeRequests.verify).toBeNull();

    expect(participantJourneyWorkflowReducer(acknowledged, {
      result: verifySuccess(100),
      token: verifying.token,
      type: "verify_succeeded",
    })).toBe(acknowledged);

    const refreshToken = nextParticipantJourneyRequestToken(acknowledged, "journey");
    const refreshing = participantJourneyWorkflowReducer(acknowledged, {
      reason: "refresh",
      token: refreshToken,
      type: "journey_requested",
    });
    expect(refreshing.status).toBe("verifying");
    expect(refreshing.pendingOperation).toBe("refresh_journey");
    expect(refreshing.activeRequests.journey).toBe(refreshToken);
    expect(participantJourneyWorkflowReducer(refreshing, {
      reason: "refresh",
      token: nextParticipantJourneyRequestToken(refreshing, "journey"),
      type: "journey_requested",
    })).toBe(refreshing);

    const refreshedJourney = journey({ points: 100 });
    const ready = participantJourneyWorkflowReducer(refreshing, {
      result: journeySuccess(refreshedJourney),
      token: refreshToken,
      type: "journey_succeeded",
    });
    expect(ready.status).toBe("ready");
    expect(ready.journey).toBe(refreshedJourney);
    expect(ready.lastGoodJourney).toBe(refreshedJourney);
    expect(ready.journey?.participant.totalPoints).toBe(100);
    expect(ready.commandTraceId).toBe("trace-verify-command");
    expect(ready.pendingOperation).toBeNull();
    expect(ready.pendingTaskId).toBeNull();
  });

  it("rejects seeded feed data and mismatched verify acknowledgements in durable mode", () => {
    const initial = stateWithSession();
    const feedToken = nextParticipantJourneyRequestToken(initial, "feed");
    const loadingFeed = participantJourneyWorkflowReducer(initial, {
      token: feedToken,
      type: "feed_requested",
    });
    const seededFeed = participantJourneyWorkflowReducer(loadingFeed, {
      result: { ...feedSuccess([feedItem(campaignAId)]), source: "seeded_preview" },
      token: feedToken,
      type: "feed_succeeded",
    });

    expect(seededFeed.status).toBe("blocked");
    expect(seededFeed.feed).toEqual([]);
    expect(seededFeed.diagnostic?.code).toBe("PARTICIPANT_JOURNEY_IDENTITY_MISMATCH");

    const verifying = verifyingState();
    const mismatched = verifySuccess();
    const completion = mismatched.verification.completion;
    if (!completion) {
      throw new Error("completed verification fixture requires Completion");
    }
    const rejectedVerify = participantJourneyWorkflowReducer(verifying.state, {
      result: {
        ...mismatched,
        verification: {
          ...mismatched.verification,
          completion: {
            ...completion,
            campaignId: campaignBId,
          },
        },
      },
      token: verifying.token,
      type: "verify_succeeded",
    });

    expect(rejectedVerify.status).toBe("blocked");
    expect(rejectedVerify.journey).toBeNull();
    expect(rejectedVerify.lastGoodJourney).toBeNull();
    expect(rejectedVerify.pendingOperation).toBeNull();
    expect(rejectedVerify.commandTraceId).toBeNull();
    expect(rejectedVerify.diagnostic?.code).toBe("PARTICIPANT_JOURNEY_IDENTITY_MISMATCH");
  });

  it("keeps same-identity last-good data degraded when refresh fails", () => {
    const pending = refreshPendingState();
    const lastGood = pending.lastGoodJourney;
    const token = nextParticipantJourneyRequestToken(pending, "journey");
    const refreshing = participantJourneyWorkflowReducer(pending, {
      reason: "refresh",
      token,
      type: "journey_requested",
    });
    const refreshFailure = failure({ traceId: "trace-refresh-503" });
    const degraded = participantJourneyWorkflowReducer(refreshing, {
      failure: refreshFailure,
      token,
      type: "journey_failed",
    });

    expect(degraded.status).toBe("degraded");
    expect(degraded.journey).toBe(lastGood);
    expect(degraded.lastGoodJourney).toBe(lastGood);
    expect(degraded.commandTraceId).toBe("trace-verify-command");
    expect(degraded.diagnostic).toBe(refreshFailure);
    expect(degraded.pendingOperation).toBeNull();
    expect(degraded.pendingTaskId).toBeNull();
    expect(selectParticipantJourneyRetryOperation(degraded)).toBe("journey");
    expect(canVerifyParticipantJourneyTask(degraded, taskAId)).toBe(false);

    const retryToken = nextParticipantJourneyRequestToken(degraded, "journey");
    const retrying = participantJourneyWorkflowReducer(degraded, {
      reason: "retry",
      token: retryToken,
      type: "journey_requested",
    });
    expect(retrying.pendingOperation).toBe("journey");
    expect(retrying.activeRequests.verify).toBeNull();
  });

  it.each(bridgeResponseIntegrityFailures)(
    "keeps last-good read-only and allows only a journey retry after $code",
    ({ code, status }) => {
      const pending = refreshPendingState();
      const lastGood = pending.lastGoodJourney;
      const token = nextParticipantJourneyRequestToken(pending, "journey");
      const refreshing = participantJourneyWorkflowReducer(pending, {
        reason: "refresh",
        token,
        type: "journey_requested",
      });
      const invalidResponse = failure({
        bridgeCode: code,
        code,
        httpStatus: 200,
        phase: "response",
        retryable: false,
        status,
        traceId: `trace-${code.toLowerCase()}`,
      });
      const degraded = participantJourneyWorkflowReducer(refreshing, {
        failure: invalidResponse,
        token,
        type: "journey_failed",
      });

      expect(degraded.status).toBe("degraded");
      expect(degraded.journey).toBe(lastGood);
      expect(degraded.lastGoodJourney).toBe(lastGood);
      expect(degraded.commandTraceId).toBe("trace-verify-command");
      expect(degraded.diagnostic).toBe(invalidResponse);
      expect(degraded.pendingOperation).toBeNull();
      expect(degraded.pendingTaskId).toBeNull();
      expect(degraded.reconnectRequired).toBe(false);
      expect(selectParticipantJourneyRetryOperation(degraded)).toBe("journey");
      expect(canVerifyParticipantJourneyTask(degraded, taskAId)).toBe(false);

      const retryToken = nextParticipantJourneyRequestToken(degraded, "journey");
      const retrying = participantJourneyWorkflowReducer(degraded, {
        reason: "retry",
        token: retryToken,
        type: "journey_requested",
      });

      expect(retrying.activeRequests.journey).toBe(retryToken);
      expect(retrying.activeRequests.verify).toBeNull();
      expect(retrying.pendingOperation).toBe("journey");
    },
  );

  it("clears last-good data when Campaign authority is revoked", () => {
    const pending = refreshPendingState();
    const token = nextParticipantJourneyRequestToken(pending, "journey");
    const refreshing = participantJourneyWorkflowReducer(pending, {
      reason: "refresh",
      token,
      type: "journey_requested",
    });
    const accessRevoked = failure({
      code: "CAMPAIGN_ACCESS_DENIED",
      httpStatus: 403,
      phase: "identity",
      retryable: false,
      status: "blocked",
      traceId: "trace-access-revoked",
    });
    const blocked = participantJourneyWorkflowReducer(refreshing, {
      failure: accessRevoked,
      token,
      type: "journey_failed",
    });

    expect(blocked.status).toBe("blocked");
    expect(blocked.journey).toBeNull();
    expect(blocked.lastGoodJourney).toBeNull();
    expect(blocked.retryOperation).toBeNull();
    expect(blocked.diagnostic).toBe(accessRevoked);
  });

  it.each([
    failure({
      code: "AUTH_SESSION_INVALID",
      phase: "auth",
      reconnectRequired: true,
      retryable: false,
      status: "blocked",
      traceId: "trace-auth-blocked",
    }),
    failure({
      code: "CAMPAIGN_ACCESS_DENIED",
      httpStatus: 403,
      phase: "identity",
      retryable: false,
      status: "blocked",
      traceId: "trace-access-blocked",
    }),
    failure({
      bridgeCode: "BRIDGE_BASE_URL_MISSING",
      code: "BRIDGE_BASE_URL_MISSING",
      httpStatus: undefined,
      phase: "config",
      retryable: false,
      status: "blocked",
      traceId: "trace-config-blocked",
    }),
  ])("blocks a journey failure with no last-good snapshot: $code", (blockedFailure) => {
    const requested = stateWithJourneyRequest();
    const blocked = participantJourneyWorkflowReducer(requested.state, {
      failure: blockedFailure,
      token: requested.token,
      type: "journey_failed",
    });

    expect(blocked.status).toBe("blocked");
    expect(blocked.journey).toBeNull();
    expect(blocked.lastGoodJourney).toBeNull();
    expect(blocked.diagnostic).toBe(blockedFailure);
    expect(blocked.reconnectRequired).toBe(blockedFailure.reconnectRequired);
    expect(canReconnectParticipantJourney(blocked)).toBe(
      blockedFailure.reconnectRequired,
    );
  });

  it("fails closed on a mismatched journey projection and clears incompatible last-good", () => {
    const pending = refreshPendingState();
    const token = nextParticipantJourneyRequestToken(pending, "journey");
    const refreshing = participantJourneyWorkflowReducer(pending, {
      reason: "refresh",
      token,
      type: "journey_requested",
    });
    const result = participantJourneyWorkflowReducer(refreshing, {
      result: journeySuccess(journey({ campaignId: campaignBId, points: 100 })),
      token,
      type: "journey_succeeded",
    });

    expect(result.status).toBe("blocked");
    expect(result.journey).toBeNull();
    expect(result.lastGoodJourney).toBeNull();
    expect(result.retryOperation).toBeNull();
    expect(result.diagnostic?.code).toBe("PARTICIPANT_JOURNEY_IDENTITY_MISMATCH");
    expect(result.diagnostic?.traceId).toBe("trace-journey-success");
  });

  it.each([
    ["verify", true],
    ["retry", true],
    ["await_review", false],
    ["blocked", false],
    ["completed", false],
  ] as const)("selects Task action %s as verify-enabled=%s", (action, expected) => {
    const state = readyState(journey({ action }));
    expect(canVerifyParticipantJourneyTask(state, taskAId)).toBe(expected);
  });

  it("keeps Campaign select, retry, and reconnect selectors coherent", () => {
    const feed = stateWithFeed();
    expect(canSelectParticipantCampaign(feed, campaignAId)).toBe(true);
    expect(canSelectParticipantCampaign(feed, "campaign-unknown")).toBe(false);
    expect(selectParticipantJourneyRetryOperation(feed)).toBeNull();
    expect(canReconnectParticipantJourney(feed)).toBe(false);

    const token = nextParticipantJourneyRequestToken(feed, "feed");
    const loading = participantJourneyWorkflowReducer(feed, {
      token,
      type: "feed_requested",
    });
    const blocked = participantJourneyWorkflowReducer(loading, {
      failure: failure({ traceId: "trace-feed-failure" }),
      token,
      type: "feed_failed",
    });
    expect(selectParticipantJourneyRetryOperation(blocked)).toBe("feed");
    expect(canSelectParticipantCampaign(blocked, campaignAId)).toBe(false);

    const reconnectToken = nextParticipantJourneyRequestToken(blocked, "feed");
    const retrying = participantJourneyWorkflowReducer(blocked, {
      token: reconnectToken,
      type: "feed_requested",
    });
    const reconnectBlocked = participantJourneyWorkflowReducer(retrying, {
      failure: failure({ reconnectRequired: true, retryable: false }),
      token: reconnectToken,
      type: "feed_failed",
    });
    expect(selectParticipantJourneyRetryOperation(reconnectBlocked)).toBeNull();
    expect(canReconnectParticipantJourney(reconnectBlocked)).toBe(true);
  });

  it("keeps reconnect required and rejects every old-feed Campaign selection", () => {
    const feed = stateWithFeed();
    const token = nextParticipantJourneyRequestToken(feed, "feed");
    const loading = participantJourneyWorkflowReducer(feed, {
      token,
      type: "feed_requested",
    });
    const reconnectFailure = failure({
      code: "AUTH_SESSION_INVALID",
      httpStatus: 401,
      phase: "auth",
      reconnectRequired: true,
      retryable: false,
      status: "blocked",
      traceId: "trace-reconnect-required",
    });
    const blocked = participantJourneyWorkflowReducer(loading, {
      failure: reconnectFailure,
      token,
      type: "feed_failed",
    });

    expect(blocked.feed.map((campaign) => campaign.campaignId)).toEqual([
      campaignAId,
      campaignBId,
    ]);
    expect(blocked.reconnectRequired).toBe(true);
    expect(canSelectParticipantCampaign(blocked, campaignAId)).toBe(false);
    expect(canSelectParticipantCampaign(blocked, campaignBId)).toBe(false);

    for (const campaignId of [campaignAId, campaignBId]) {
      const selected = participantJourneyWorkflowReducer(blocked, {
        campaignId,
        type: "campaign_selected",
      });

      expect(selected).toBe(blocked);
      expect(selected.reconnectRequired).toBe(true);
      expect(selected.diagnostic).toBe(reconnectFailure);
      expect(selected.selectedCampaignId).toBeNull();
    }
  });

  it("keeps reconnect sticky against matching late journey success until the session context changes", () => {
    const requested = stateWithJourneyRequest();
    const reconnectFailure = failure({
      code: "AUTH_SESSION_INVALID",
      httpStatus: 401,
      phase: "auth",
      reconnectRequired: true,
      retryable: false,
      status: "blocked",
      traceId: "trace-journey-reconnect-required",
    });
    const blocked = participantJourneyWorkflowReducer(requested.state, {
      failure: reconnectFailure,
      token: requested.token,
      type: "journey_failed",
    });

    const lateSuccess = participantJourneyWorkflowReducer(blocked, {
      result: journeySuccess(journey({ points: 100 })),
      token: requested.token,
      type: "journey_succeeded",
    });
    const retryToken = nextParticipantJourneyRequestToken(blocked, "journey");
    const retry = participantJourneyWorkflowReducer(blocked, {
      reason: "retry",
      token: retryToken,
      type: "journey_requested",
    });

    expect(lateSuccess).toBe(blocked);
    expect(retry).toBe(blocked);
    expect(blocked.reconnectRequired).toBe(true);
    expect(blocked.journey).toBeNull();
    expect(blocked.lastGoodJourney).toBeNull();

    const sessionBKey = createParticipantSessionKey(session({ sessionId: "session-b" }));
    const switched = participantJourneyWorkflowReducer(blocked, {
      mode: "durable",
      sessionKey: sessionBKey,
      type: "context_changed",
    });

    expect(switched).toMatchObject({
      commandTraceId: null,
      diagnostic: null,
      journey: null,
      lastGoodJourney: null,
      pendingOperation: null,
      reconnectRequired: false,
      selectedCampaignId: null,
      sessionKey: sessionBKey,
      status: "feed_ready",
    });
    expect(participantJourneyWorkflowReducer(switched, {
      result: journeySuccess(journey({ points: 100 })),
      token: requested.token,
      type: "journey_succeeded",
    })).toBe(switched);
  });

  it("keeps reconnect sticky against matching late verify success and new verify requests", () => {
    const verifying = verifyingState();
    const blocked = participantJourneyWorkflowReducer(verifying.state, {
      failure: failure({
        code: "AUTH_SESSION_INVALID",
        httpStatus: 401,
        phase: "auth",
        reconnectRequired: true,
        retryable: false,
        status: "blocked",
      }),
      token: verifying.token,
      type: "verify_failed",
    });
    const lateSuccess = participantJourneyWorkflowReducer(blocked, {
      result: verifySuccess(),
      token: verifying.token,
      type: "verify_succeeded",
    });
    const nextVerifyToken = nextParticipantJourneyRequestToken(blocked, "verify");
    const nextVerify = participantJourneyWorkflowReducer(blocked, {
      taskId: taskAId,
      token: nextVerifyToken,
      type: "verify_requested",
    });

    expect(lateSuccess).toBe(blocked);
    expect(nextVerify).toBe(blocked);
    expect(blocked).toMatchObject({
      commandTraceId: null,
      journey: null,
      lastGoodJourney: null,
      pendingOperation: null,
      reconnectRequired: true,
      status: "blocked",
    });
  });

  it("keeps reconnect sticky against late refresh and prior verify responses", () => {
    const verifying = verifyingState();
    const refreshPending = participantJourneyWorkflowReducer(verifying.state, {
      result: verifySuccess(),
      token: verifying.token,
      type: "verify_succeeded",
    });
    const refreshToken = nextParticipantJourneyRequestToken(refreshPending, "journey");
    const refreshing = participantJourneyWorkflowReducer(refreshPending, {
      reason: "refresh",
      token: refreshToken,
      type: "journey_requested",
    });
    const blocked = participantJourneyWorkflowReducer(refreshing, {
      failure: failure({
        code: "AUTH_SESSION_INVALID",
        httpStatus: 401,
        phase: "auth",
        reconnectRequired: true,
        retryable: false,
        status: "blocked",
      }),
      token: refreshToken,
      type: "journey_failed",
    });

    expect(participantJourneyWorkflowReducer(blocked, {
      result: journeySuccess(journey({ points: 100 })),
      token: refreshToken,
      type: "journey_succeeded",
    })).toBe(blocked);
    expect(participantJourneyWorkflowReducer(blocked, {
      result: verifySuccess(),
      token: verifying.token,
      type: "verify_succeeded",
    })).toBe(blocked);
    expect(participantJourneyWorkflowReducer(blocked, {
      reason: "refresh",
      token: nextParticipantJourneyRequestToken(blocked, "journey"),
      type: "journey_requested",
    })).toBe(blocked);
    expect(blocked).toMatchObject({
      diagnostic: expect.objectContaining({ code: "AUTH_SESSION_INVALID" }),
      journey: null,
      lastGoodJourney: null,
      pendingOperation: null,
      reconnectRequired: true,
      retryOperation: null,
      status: "blocked",
    });
  });

  it("stores active verification independently by taskId and keeps Campaign navigation available", () => {
    const ready = readyState(journeyWithTasks([taskAId, taskBId]));
    const taskAToken = nextParticipantJourneyRequestToken(ready, "verify", taskAId);
    const taskAVerifying = participantJourneyWorkflowReducer(ready, {
      taskId: taskAId,
      token: taskAToken,
      type: "verify_requested",
    });

    expect(taskAToken.taskId).toBe(taskAId);
    expect(selectParticipantJourneyTaskAttempt(taskAVerifying, taskAId)).toMatchObject({
      activeRequest: taskAToken,
      status: "verifying",
      taskId: taskAId,
    });
    expect(canVerifyParticipantJourneyTask(taskAVerifying, taskAId)).toBe(false);
    expect(canVerifyParticipantJourneyTask(taskAVerifying, taskBId)).toBe(true);
    expect(canSelectParticipantCampaign(taskAVerifying, campaignBId)).toBe(true);

    const duplicateToken = nextParticipantJourneyRequestToken(
      taskAVerifying,
      "verify",
      taskAId,
    );
    expect(participantJourneyWorkflowReducer(taskAVerifying, {
      taskId: taskAId,
      token: duplicateToken,
      type: "verify_requested",
    })).toBe(taskAVerifying);

    const taskBToken = nextParticipantJourneyRequestToken(
      taskAVerifying,
      "verify",
      taskBId,
    );
    const bothVerifying = participantJourneyWorkflowReducer(taskAVerifying, {
      taskId: taskBId,
      token: taskBToken,
      type: "verify_requested",
    });

    expect(selectParticipantJourneyTaskAttempt(bothVerifying, taskAId)?.activeRequest)
      .toBe(taskAToken);
    expect(selectParticipantJourneyTaskAttempt(bothVerifying, taskBId)?.activeRequest)
      .toBe(taskBToken);
    expect(bothVerifying.taskAttempts).not.toBe(taskAVerifying.taskAttempts);
    expect(bothVerifying.taskAttempts[taskAId])
      .toBe(taskAVerifying.taskAttempts[taskAId]);
    expect(bothVerifying.journeyTasksById).toBe(taskAVerifying.journeyTasksById);
  });

  it("rejects a verification token whose task identity differs from the event", () => {
    const ready = readyState(journeyWithTasks([taskAId, taskBId]));
    const taskAToken = nextParticipantJourneyRequestToken(ready, "verify", taskAId);

    expect(participantJourneyWorkflowReducer(ready, {
      taskId: taskBId,
      token: taskAToken,
      type: "verify_requested",
    })).toBe(ready);
  });

  it.each([
    ["completed", "completed", "none"],
    ["failed", "failed", "retry"],
    ["manual_review", "manual_review", "await_review"],
  ] as const)(
    "keeps a terminal %s receipt pending until one authoritative refresh",
    (outcome, expectedStatus, expectedAction) => {
      const ready = readyState();
      const verifyToken = nextParticipantJourneyRequestToken(ready, "verify", taskAId);
      const verifying = participantJourneyWorkflowReducer(ready, {
        taskId: taskAId,
        token: verifyToken,
        type: "verify_requested",
      });
      const receipt = attemptVerifySuccess({
        outcome,
        retryable: outcome === "failed",
      });
      const acknowledged = participantJourneyWorkflowReducer(verifying, {
        result: receipt,
        token: verifyToken,
        type: "verify_succeeded",
      });
      const pendingAuthority = selectParticipantJourneyTaskAttempt(
        acknowledged,
        taskAId,
      );

      expect(pendingAuthority).toMatchObject({
        activeRequest: null,
        receipt: {
          attemptId: "verification-attempt-a",
          outcome,
        },
        refresh: { requestCount: 0, status: "required" },
        status: "verifying",
      });
      expect(selectParticipantJourneyRefreshTaskId(acknowledged)).toBe(taskAId);
      expect(selectParticipantJourneyTaskRefresh(acknowledged, taskAId))
        .toEqual({ requestCount: 0, status: "required" });
      expect(selectParticipantJourneyTaskAction(acknowledged, taskAId)).toBe("none");

      const refreshToken = nextParticipantJourneyRequestToken(
        acknowledged,
        "journey",
      );
      expect(refreshToken.taskId).toBe(taskAId);
      const refreshing = participantJourneyWorkflowReducer(acknowledged, {
        reason: "refresh",
        token: refreshToken,
        type: "journey_requested",
      });
      expect(selectParticipantJourneyTaskAttempt(refreshing, taskAId)?.refresh)
        .toEqual({ requestCount: 1, status: "in_flight" });
      expect(participantJourneyWorkflowReducer(refreshing, {
        reason: "refresh",
        token: nextParticipantJourneyRequestToken(refreshing, "journey"),
        type: "journey_requested",
      })).toBe(refreshing);

      const authoritative = participantJourneyWorkflowReducer(refreshing, {
        result: journeySuccess(journeyForOutcome(outcome)),
        token: refreshToken,
        type: "journey_succeeded",
      });
      const terminal = selectParticipantJourneyTaskAttempt(authoritative, taskAId);

      expect(terminal).toMatchObject({
        activeRequest: null,
        poll: null,
        receipt: { outcome },
        refresh: null,
        status: expectedStatus,
      });
      expect(selectParticipantJourneyTaskAction(authoritative, taskAId))
        .toBe(expectedAction);
      expect(selectParticipantJourneyRefreshTaskId(authoritative)).toBeNull();
      expect(participantJourneyWorkflowReducer(authoritative, {
        result: receipt,
        token: verifyToken,
        type: "verify_succeeded",
      })).toBe(authoritative);
    },
  );

  it("schedules one bounded poll owner for a pending receipt and clamps backoff", () => {
    const ready = readyState();
    const verifyToken = nextParticipantJourneyRequestToken(ready, "verify", taskAId);
    const verifying = participantJourneyWorkflowReducer(ready, {
      taskId: taskAId,
      token: verifyToken,
      type: "verify_requested",
    });
    const pendingReceipt = attemptVerifySuccess({
      outcome: "pending",
      retryAfterMs: 0,
    });
    const pending = participantJourneyWorkflowReducer(verifying, {
      result: pendingReceipt,
      token: verifyToken,
      type: "verify_succeeded",
    });
    const firstPoll = selectParticipantJourneyTaskPoll(pending, taskAId);

    expect(selectParticipantJourneyTaskAttempt(pending, taskAId)?.status).toBe("pending");
    expect(firstPoll).toMatchObject({
      attemptCount: 0,
      delayMs: PARTICIPANT_JOURNEY_POLL_MIN_DELAY_MS,
      maxAttempts: PARTICIPANT_JOURNEY_POLL_MAX_ATTEMPTS,
      phase: "scheduled",
    });
    expect(canPollParticipantJourneyTask(pending, taskAId)).toBe(true);
    expect(participantJourneyWorkflowReducer(pending, {
      result: pendingReceipt,
      token: verifyToken,
      type: "verify_succeeded",
    })).toBe(pending);

    const pollToken = nextParticipantJourneyRequestToken(pending, "verify", taskAId);
    const polling = participantJourneyWorkflowReducer(pending, {
      taskId: taskAId,
      token: pollToken,
      type: "verification_poll_requested",
    });
    expect(selectParticipantJourneyTaskPoll(polling, taskAId)).toMatchObject({
      attemptCount: 1,
      phase: "in_flight",
    });

    const repeatedReceipt = attemptVerifySuccess({
      outcome: "pending",
      retryAfterMs: Number.MAX_SAFE_INTEGER,
    });
    const rescheduled = participantJourneyWorkflowReducer(polling, {
      result: repeatedReceipt,
      token: pollToken,
      type: "verify_succeeded",
    });
    const nextPoll = selectParticipantJourneyTaskPoll(rescheduled, taskAId);

    expect(nextPoll).toMatchObject({
      attemptCount: 1,
      delayMs: PARTICIPANT_JOURNEY_POLL_MAX_DELAY_MS,
      ownerId: firstPoll?.ownerId,
      phase: "scheduled",
    });
  });

  it("exhausts bounded polling without creating another timer owner", () => {
    const ready = readyState();
    const verifyToken = nextParticipantJourneyRequestToken(ready, "verify", taskAId);
    let state = participantJourneyWorkflowReducer(ready, {
      taskId: taskAId,
      token: verifyToken,
      type: "verify_requested",
    });
    state = participantJourneyWorkflowReducer(state, {
      result: attemptVerifySuccess({ outcome: "pending" }),
      token: verifyToken,
      type: "verify_succeeded",
    });

    for (let attempt = 0; attempt < PARTICIPANT_JOURNEY_POLL_MAX_ATTEMPTS; attempt += 1) {
      const pollToken = nextParticipantJourneyRequestToken(state, "verify", taskAId);
      state = participantJourneyWorkflowReducer(state, {
        taskId: taskAId,
        token: pollToken,
        type: "verification_poll_requested",
      });
      state = participantJourneyWorkflowReducer(state, {
        result: attemptVerifySuccess({ outcome: "pending" }),
        token: pollToken,
        type: "verify_succeeded",
      });
    }

    expect(selectParticipantJourneyTaskAttempt(state, taskAId)?.status)
      .toBe("unavailable");
    expect(selectParticipantJourneyTaskPoll(state, taskAId)?.phase).toBe("exhausted");
    expect(canPollParticipantJourneyTask(state, taskAId)).toBe(false);
    expect(selectParticipantJourneyTaskAction(state, taskAId)).toBe("retry");
  });

  it("pauses a pending poll deterministically without creating timers in the reducer", () => {
    const ready = readyState();
    const verifyToken = nextParticipantJourneyRequestToken(ready, "verify", taskAId);
    const verifying = participantJourneyWorkflowReducer(ready, {
      taskId: taskAId,
      token: verifyToken,
      type: "verify_requested",
    });
    const pending = participantJourneyWorkflowReducer(verifying, {
      result: attemptVerifySuccess({ outcome: "pending" }),
      token: verifyToken,
      type: "verify_succeeded",
    });
    const paused = participantJourneyWorkflowReducer(pending, {
      taskId: taskAId,
      type: "verification_poll_paused",
    });

    expect(selectParticipantJourneyTaskPoll(paused, taskAId)?.phase).toBe("paused");
    expect(canPollParticipantJourneyTask(paused, taskAId)).toBe(false);
    expect(selectParticipantJourneyTaskAction(paused, taskAId)).toBe("retry");
  });

  it("counts every dispatched poll before a visibility pause can abort its response", () => {
    const ready = readyState();
    const verifyToken = nextParticipantJourneyRequestToken(ready, "verify", taskAId);
    let state = participantJourneyWorkflowReducer(ready, {
      taskId: taskAId,
      token: verifyToken,
      type: "verify_requested",
    });
    state = participantJourneyWorkflowReducer(state, {
      result: attemptVerifySuccess({ outcome: "pending" }),
      token: verifyToken,
      type: "verify_succeeded",
    });

    for (let attempt = 1; attempt <= PARTICIPANT_JOURNEY_POLL_MAX_ATTEMPTS; attempt += 1) {
      const pollToken = nextParticipantJourneyRequestToken(state, "verify", taskAId);
      state = participantJourneyWorkflowReducer(state, {
        taskId: taskAId,
        token: pollToken,
        type: "verification_poll_requested",
      });
      expect(selectParticipantJourneyTaskPoll(state, taskAId)?.attemptCount).toBe(attempt);

      state = participantJourneyWorkflowReducer(state, {
        taskId: taskAId,
        type: "verification_poll_paused",
      });
      if (attempt < PARTICIPANT_JOURNEY_POLL_MAX_ATTEMPTS) {
        expect(selectParticipantJourneyTaskPoll(state, taskAId)?.phase).toBe("paused");
        state = participantJourneyWorkflowReducer(state, {
          taskId: taskAId,
          type: "verification_poll_resumed",
        });
        expect(selectParticipantJourneyTaskPoll(state, taskAId)?.phase).toBe("scheduled");
      }
    }

    expect(selectParticipantJourneyTaskAttempt(state, taskAId)?.status).toBe("unavailable");
    expect(selectParticipantJourneyTaskPoll(state, taskAId)?.phase).toBe("exhausted");
    expect(canPollParticipantJourneyTask(state, taskAId)).toBe(false);
    expect(selectParticipantJourneyTaskAction(state, taskAId)).toBe("retry");
  });

  it("fails closed on command-versus-Journey conflict while retaining last-good authority", () => {
    const ready = readyState();
    const lastGood = ready.lastGoodJourney;
    const verifyToken = nextParticipantJourneyRequestToken(ready, "verify", taskAId);
    const verifying = participantJourneyWorkflowReducer(ready, {
      taskId: taskAId,
      token: verifyToken,
      type: "verify_requested",
    });
    const acknowledged = participantJourneyWorkflowReducer(verifying, {
      result: attemptVerifySuccess({ outcome: "completed" }),
      token: verifyToken,
      type: "verify_succeeded",
    });
    const refreshToken = nextParticipantJourneyRequestToken(acknowledged, "journey");
    const refreshing = participantJourneyWorkflowReducer(acknowledged, {
      reason: "refresh",
      token: refreshToken,
      type: "journey_requested",
    });
    const conflicted = participantJourneyWorkflowReducer(refreshing, {
      result: journeySuccess(journey()),
      token: refreshToken,
      type: "journey_succeeded",
    });

    expect(conflicted.status).toBe("degraded");
    expect(conflicted.journey).toBe(lastGood);
    expect(conflicted.lastGoodJourney).toBe(lastGood);
    expect(conflicted.diagnostic?.code).toBe("PARTICIPANT_JOURNEY_AUTHORITY_CONFLICT");
    expect(selectParticipantJourneyTaskAttempt(conflicted, taskAId)).toMatchObject({
      activeRequest: null,
      poll: null,
      receipt: { outcome: "completed" },
      refresh: { requestCount: 1, status: "failed" },
      status: "unavailable",
    });
    expect(selectParticipantJourneyTaskAction(conflicted, taskAId)).toBe("none");
  });

  it("validates every concurrent terminal receipt before a shared Journey refresh reconciles it", () => {
    const ready = readyState(journeyWithTasks([taskAId, taskBId]));
    const lastGood = ready.lastGoodJourney;
    const taskAToken = nextParticipantJourneyRequestToken(ready, "verify", taskAId);
    let state = participantJourneyWorkflowReducer(ready, {
      taskId: taskAId,
      token: taskAToken,
      type: "verify_requested",
    });
    const taskBToken = nextParticipantJourneyRequestToken(state, "verify", taskBId);
    state = participantJourneyWorkflowReducer(state, {
      taskId: taskBId,
      token: taskBToken,
      type: "verify_requested",
    });
    state = participantJourneyWorkflowReducer(state, {
      result: attemptVerifySuccess({ outcome: "completed", taskId: taskAId }),
      token: taskAToken,
      type: "verify_succeeded",
    });
    state = participantJourneyWorkflowReducer(state, {
      result: attemptVerifySuccess({
        attemptId: "verification-attempt-b",
        outcome: "completed",
        taskId: taskBId,
      }),
      token: taskBToken,
      type: "verify_succeeded",
    });

    const refreshToken = nextParticipantJourneyRequestToken(state, "journey", taskAId);
    state = participantJourneyWorkflowReducer(state, {
      reason: "refresh",
      token: refreshToken,
      type: "journey_requested",
    });
    const terminalProjection = journeyWithTasks([taskAId, taskBId]);
    const mismatchedProjection: ParticipantJourneyProjection = {
      ...terminalProjection,
      tasks: terminalProjection.tasks.map((task) => ({
        ...task,
        action: "completed",
        completionId: task.taskId === taskBId
          ? "completion-db-mismatch"
          : "completion-db-1",
        evidenceId: task.taskId === taskBId
          ? "evidence-db-mismatch"
          : "evidence-db-1",
        evidenceSource: "SOCIAL_API",
        pointsAwarded: 100,
        status: "completed",
        updatedAt: "2026-07-16T08:00:00.000Z",
      })),
    };

    const conflicted = participantJourneyWorkflowReducer(state, {
      result: journeySuccess(mismatchedProjection),
      token: refreshToken,
      type: "journey_succeeded",
    });

    expect(conflicted.status).toBe("degraded");
    expect(conflicted.journey).toBe(lastGood);
    expect(conflicted.diagnostic?.code).toBe("PARTICIPANT_JOURNEY_AUTHORITY_CONFLICT");
    expect(selectParticipantJourneyTaskAttempt(conflicted, taskBId)).toMatchObject({
      receipt: { outcome: "completed" },
      refresh: { status: "failed" },
      status: "unavailable",
    });
    expect(selectParticipantJourneyTaskAttempt(conflicted, taskAId)?.refresh?.status)
      .toBe("failed");
  });

  it("keeps a shared retry degraded while any terminal receipt remains non-terminal in Journey authority", () => {
    const ready = readyState(journeyWithTasks([taskAId, taskBId]));
    const lastGood = ready.lastGoodJourney;
    const taskAToken = nextParticipantJourneyRequestToken(ready, "verify", taskAId);
    let state = participantJourneyWorkflowReducer(ready, {
      taskId: taskAId,
      token: taskAToken,
      type: "verify_requested",
    });
    const taskBToken = nextParticipantJourneyRequestToken(state, "verify", taskBId);
    state = participantJourneyWorkflowReducer(state, {
      taskId: taskBId,
      token: taskBToken,
      type: "verify_requested",
    });
    state = participantJourneyWorkflowReducer(state, {
      result: attemptVerifySuccess({ outcome: "completed", taskId: taskAId }),
      token: taskAToken,
      type: "verify_succeeded",
    });
    state = participantJourneyWorkflowReducer(state, {
      result: attemptVerifySuccess({
        attemptId: "verification-attempt-b",
        outcome: "completed",
        taskId: taskBId,
      }),
      token: taskBToken,
      type: "verify_succeeded",
    });

    const initialRefreshToken = nextParticipantJourneyRequestToken(state, "journey", taskAId);
    state = participantJourneyWorkflowReducer(state, {
      reason: "refresh",
      token: initialRefreshToken,
      type: "journey_requested",
    });
    const initialProjection = journeyWithTasks([taskAId, taskBId]);
    const initialConflictProjection: ParticipantJourneyProjection = {
      ...initialProjection,
      tasks: initialProjection.tasks.map((task) => ({
        ...task,
        action: "completed",
        completionId: task.taskId === taskBId ? "completion-db-mismatch" : "completion-db-1",
        evidenceId: task.taskId === taskBId ? "evidence-db-mismatch" : "evidence-db-1",
        evidenceSource: "SOCIAL_API",
        pointsAwarded: 100,
        status: "completed",
        updatedAt: "2026-07-16T08:00:00.000Z",
      })),
    };
    state = participantJourneyWorkflowReducer(state, {
      result: journeySuccess(initialConflictProjection),
      token: initialRefreshToken,
      type: "journey_succeeded",
    });

    expect(state.status).toBe("degraded");
    expect(selectParticipantJourneyTaskAttempt(state, taskAId)?.refresh?.status).toBe("failed");
    expect(selectParticipantJourneyTaskAttempt(state, taskBId)?.refresh?.status).toBe("failed");
    const sharedRetryToken = nextParticipantJourneyRequestToken(state, "journey");
    expect(sharedRetryToken.taskId).toBeNull();

    state = participantJourneyWorkflowReducer(state, {
      reason: "retry",
      token: sharedRetryToken,
      type: "journey_requested",
    });
    const terminalTaskA = journeyForOutcome("completed", taskAId);
    const nonTerminalTaskB = journeyWithTasks([taskBId]).tasks[0];
    const retryProjection: ParticipantJourneyProjection = {
      ...terminalTaskA,
      campaign: { ...terminalTaskA.campaign, taskCount: 2 },
      tasks: [terminalTaskA.tasks[0], nonTerminalTaskB],
    };
    const stillConflicted = participantJourneyWorkflowReducer(state, {
      result: journeySuccess(retryProjection),
      token: sharedRetryToken,
      type: "journey_succeeded",
    });

    expect(stillConflicted.status).toBe("degraded");
    expect(stillConflicted.journey).toBe(lastGood);
    expect(stillConflicted.lastGoodJourney).toBe(lastGood);
    expect(stillConflicted.diagnostic?.code).toBe("PARTICIPANT_JOURNEY_AUTHORITY_CONFLICT");
    expect(stillConflicted.activeRequests.journey).toBeNull();
    expect(selectParticipantJourneyRetryOperation(stillConflicted)).toBe("journey");
    expect(selectParticipantJourneyTaskAttempt(stillConflicted, taskBId)).toMatchObject({
      receipt: { outcome: "completed" },
      refresh: { status: "failed" },
      status: "unavailable",
    });
    expect(nextParticipantJourneyRequestToken(stillConflicted, "journey").taskId).toBeNull();
  });

  it.each(["failed", "manual_review"] as const)(
    "fails closed when %s optional Completion linkage conflicts with Journey authority",
    (outcome) => {
      const ready = readyState();
      const verifyToken = nextParticipantJourneyRequestToken(ready, "verify", taskAId);
      let state = participantJourneyWorkflowReducer(ready, {
        taskId: taskAId,
        token: verifyToken,
        type: "verify_requested",
      });
      state = participantJourneyWorkflowReducer(state, {
        result: attemptVerifySuccess({
          completionId: `completion-command-${outcome}`,
          outcome,
        }),
        token: verifyToken,
        type: "verify_succeeded",
      });
      const refreshToken = nextParticipantJourneyRequestToken(state, "journey", taskAId);
      state = participantJourneyWorkflowReducer(state, {
        reason: "refresh",
        token: refreshToken,
        type: "journey_requested",
      });

      const conflicted = participantJourneyWorkflowReducer(state, {
        result: journeySuccess(journeyForOutcome(outcome)),
        token: refreshToken,
        type: "journey_succeeded",
      });

      expect(conflicted.status).toBe("degraded");
      expect(conflicted.journey).toBe(ready.lastGoodJourney);
      expect(conflicted.diagnostic?.code).toBe("PARTICIPANT_JOURNEY_AUTHORITY_CONFLICT");
      expect(selectParticipantJourneyTaskAttempt(conflicted, taskAId)).toMatchObject({
        receipt: { completionId: `completion-command-${outcome}`, outcome },
        refresh: { status: "failed" },
        status: "unavailable",
      });
    },
  );

  it("accepts authoritative removal of the terminal refresh owner Task", () => {
    const ready = readyState();
    const verifyToken = nextParticipantJourneyRequestToken(ready, "verify", taskAId);
    let state = participantJourneyWorkflowReducer(ready, {
      taskId: taskAId,
      token: verifyToken,
      type: "verify_requested",
    });
    state = participantJourneyWorkflowReducer(state, {
      result: attemptVerifySuccess({ outcome: "completed" }),
      token: verifyToken,
      type: "verify_succeeded",
    });
    const refreshToken = nextParticipantJourneyRequestToken(state, "journey", taskAId);
    state = participantJourneyWorkflowReducer(state, {
      reason: "refresh",
      token: refreshToken,
      type: "journey_requested",
    });
    const taskRemovedProjection = journeyWithTasks([]);

    const reconciled = participantJourneyWorkflowReducer(state, {
      result: journeySuccess(taskRemovedProjection),
      token: refreshToken,
      type: "journey_succeeded",
    });

    expect(reconciled.status).toBe("ready");
    expect(reconciled.journey).toBe(taskRemovedProjection);
    expect(reconciled.lastGoodJourney).toBe(taskRemovedProjection);
    expect(reconciled.diagnostic).toBeNull();
    expect(selectParticipantJourneyTaskAttempt(reconciled, taskAId)).toBeNull();
    expect(reconciled.activeRequests.verify).toBeNull();
  });

  it("removes Task-owned poll state when authoritative Journey removes that Task", () => {
    const ready = readyState(journeyWithTasks([taskAId, taskBId]));
    const taskAToken = nextParticipantJourneyRequestToken(ready, "verify", taskAId);
    let state = participantJourneyWorkflowReducer(ready, {
      taskId: taskAId,
      token: taskAToken,
      type: "verify_requested",
    });
    state = participantJourneyWorkflowReducer(state, {
      result: attemptVerifySuccess({ outcome: "pending", taskId: taskAId }),
      token: taskAToken,
      type: "verify_succeeded",
    });
    const taskAPollToken = nextParticipantJourneyRequestToken(state, "verify", taskAId);
    state = participantJourneyWorkflowReducer(state, {
      taskId: taskAId,
      token: taskAPollToken,
      type: "verification_poll_requested",
    });

    const taskBToken = nextParticipantJourneyRequestToken(state, "verify", taskBId);
    state = participantJourneyWorkflowReducer(state, {
      taskId: taskBId,
      token: taskBToken,
      type: "verify_requested",
    });
    state = participantJourneyWorkflowReducer(state, {
      result: attemptVerifySuccess({
        attemptId: "verification-attempt-b",
        outcome: "completed",
        taskId: taskBId,
      }),
      token: taskBToken,
      type: "verify_succeeded",
    });
    const refreshToken = nextParticipantJourneyRequestToken(state, "journey", taskBId);
    state = participantJourneyWorkflowReducer(state, {
      reason: "refresh",
      token: refreshToken,
      type: "journey_requested",
    });
    state = participantJourneyWorkflowReducer(state, {
      result: journeySuccess(journeyForOutcome("completed", taskBId)),
      token: refreshToken,
      type: "journey_succeeded",
    });

    expect(selectParticipantJourneyTaskAttempt(state, taskAId)).toBeNull();
    expect(selectParticipantJourneyTaskAttempt(state, taskBId)?.status).toBe("completed");
    expect(participantJourneyWorkflowReducer(state, {
      result: attemptVerifySuccess({ outcome: "completed", taskId: taskAId }),
      token: taskAPollToken,
      type: "verify_succeeded",
    })).toBe(state);
  });

  it.each(["role", "unmount"] as const)(
    "invalidates active Task effects on %s lifecycle exit",
    (reason) => {
      const ready = readyState();
      const token = nextParticipantJourneyRequestToken(ready, "verify", taskAId);
      const verifying = participantJourneyWorkflowReducer(ready, {
        taskId: taskAId,
        token,
        type: "verify_requested",
      });
      const invalidated = participantJourneyWorkflowReducer(verifying, {
        reason,
        type: "scope_invalidated",
      });

      expect(invalidated.epoch).toBe(verifying.epoch + 1);
      expect(invalidated.taskAttempts).toEqual({});
      expect(invalidated.activeRequests).toEqual({
        feed: null,
        journey: null,
        verify: null,
      });
      expect(participantJourneyWorkflowReducer(invalidated, {
        result: attemptVerifySuccess({ outcome: "completed" }),
        token,
        type: "verify_succeeded",
      })).toBe(invalidated);
    },
  );

  it("silently releases an aborted Task request without a generic diagnostic", () => {
    const ready = readyState();
    const token = nextParticipantJourneyRequestToken(ready, "verify", taskAId);
    const verifying = participantJourneyWorkflowReducer(ready, {
      taskId: taskAId,
      token,
      type: "verify_requested",
    });
    const aborted = participantJourneyWorkflowReducer(verifying, {
      failure: failure({
        bridgeCode: "BRIDGE_REQUEST_ABORTED",
        code: "BRIDGE_REQUEST_ABORTED",
        traceId: "trace-aborted-task-request",
      }),
      token,
      type: "verify_failed",
    });

    expect(aborted.journey).toBe(ready.journey);
    expect(aborted.lastGoodJourney).toBe(ready.lastGoodJourney);
    expect(aborted.diagnostic).toBeNull();
    expect(selectParticipantJourneyTaskAttempt(aborted, taskAId)).toBeNull();
    expect(canVerifyParticipantJourneyTask(aborted, taskAId)).toBe(true);
  });

  it("contains provider outage to one Task while preserving last-good navigation", () => {
    const ready = readyState(journeyWithTasks([taskAId, taskBId]));
    const token = nextParticipantJourneyRequestToken(ready, "verify", taskAId);
    const verifying = participantJourneyWorkflowReducer(ready, {
      taskId: taskAId,
      token,
      type: "verify_requested",
    });
    const unavailable = participantJourneyWorkflowReducer(verifying, {
      failure: failure({ traceId: "trace-task-a-provider-outage" }),
      token,
      type: "verify_failed",
    });

    expect(unavailable.journey).toBe(ready.journey);
    expect(unavailable.lastGoodJourney).toBe(ready.lastGoodJourney);
    expect(unavailable.status).toBe("ready");
    expect(unavailable.diagnostic).toBeNull();
    expect(selectParticipantJourneyRetryOperation(unavailable)).toBeNull();
    expect(selectParticipantJourneyTaskAttempt(unavailable, taskAId)?.status)
      .toBe("unavailable");
    expect(selectParticipantJourneyTaskAction(unavailable, taskAId)).toBe("retry");
    expect(canVerifyParticipantJourneyTask(unavailable, taskBId)).toBe(true);
    expect(canSelectParticipantCampaign(unavailable, campaignBId)).toBe(true);
  });

  it("revokes active Task ownership for a non-retryable blocked verify failure", () => {
    const ready = readyState();
    const token = nextParticipantJourneyRequestToken(ready, "verify", taskAId);
    const verifying = participantJourneyWorkflowReducer(ready, {
      taskId: taskAId,
      token,
      type: "verify_requested",
    });
    const blocked = participantJourneyWorkflowReducer(verifying, {
      failure: failure({
        code: "TASK_VERIFICATION_SCOPE_INVALID",
        httpStatus: 403,
        phase: "request",
        retryable: false,
        status: "blocked",
      }),
      token,
      type: "verify_failed",
    });

    expect(blocked.status).toBe("blocked");
    expect(blocked.journey).toBeNull();
    expect(blocked.lastGoodJourney).toBeNull();
    expect(blocked.taskAttempts).toEqual({});
    expect(blocked.activeRequests.verify).toBeNull();
  });

  it("clears every Task effect on Campaign switch before accepting late results", () => {
    const ready = readyState(journeyWithTasks([taskAId, taskBId]));
    const token = nextParticipantJourneyRequestToken(ready, "verify", taskAId);
    const verifying = participantJourneyWorkflowReducer(ready, {
      taskId: taskAId,
      token,
      type: "verify_requested",
    });
    const switched = participantJourneyWorkflowReducer(verifying, {
      campaignId: campaignBId,
      type: "campaign_selected",
    });

    expect(switched.epoch).toBe(verifying.epoch + 1);
    expect(switched.taskAttempts).toEqual({});
    expect(switched.activeRequests.verify).toBeNull();
    expect(participantJourneyWorkflowReducer(switched, {
      result: attemptVerifySuccess({ outcome: "completed" }),
      token,
      type: "verify_succeeded",
    })).toBe(switched);
  });
});

const authenticationWallet: ParticipantAuthenticationWalletConnection = {
  adapterId: "portkey-eoa-extension",
  caHashHint: "ca-hash-participant",
  chainId: "AELF",
  network: "testnet",
  walletAddressHint: walletAddress,
};

const authenticationSession = (
  overrides: Partial<ParticipantAuthenticationPrivateSession> = {},
): ParticipantAuthenticationPrivateSession => ({
  absoluteExpiresAt: "2026-07-18T14:00:00.000Z",
  accountType: "EOA",
  capabilities: ["CAMPAIGN_READ", "TASK_VERIFY"],
  chainId: "AELF",
  idleExpiresAt: "2026-07-18T13:15:00.000Z",
  issuedAt: "2026-07-18T13:00:00.000Z",
  network: "testnet",
  roles: ["participant"],
  sessionId: "durable-session-participant",
  status: "active",
  walletAddress,
  walletSource: "PORTKEY_EOA_EXTENSION",
  ...overrides,
});

const authenticationFailure = (
  overrides: Partial<ParticipantAuthenticationFailure> = {},
): ParticipantAuthenticationFailure => ({
  code: "AUTH_DEPENDENCY_UNAVAILABLE",
  httpStatus: 503,
  retryAfterMs: null,
  traceId: "trace-participant-auth-failure",
  ...overrides,
});

const challengeReadyAuthenticationState = () => {
  let state = createParticipantAuthenticationWorkflowState({
    publicCampaignLastGood: feedItem(campaignAId),
  });
  let reduction = participantAuthenticationWorkflowReducer(state, {
    type: "connect_requested",
  });
  state = reduction.state;
  reduction = participantAuthenticationWorkflowReducer(state, {
    sessionEpoch: state.sessionEpoch,
    type: "wallet_connected",
    wallet: authenticationWallet,
    walletEpoch: state.walletEpoch,
  });
  state = reduction.state;
  reduction = participantAuthenticationWorkflowReducer(state, {
    challenge: {
      challengeId: "challenge-participant-auth",
      expiresAt: "2026-07-18T13:05:00.000Z",
    },
    sessionEpoch: state.sessionEpoch,
    type: "challenge_succeeded",
    walletEpoch: state.walletEpoch,
  });
  return reduction.state;
};

const readyAuthenticationState = () => {
  let state = challengeReadyAuthenticationState();
  state = participantAuthenticationWorkflowReducer(state, {
    type: "sign_requested",
  }).state;
  let reduction = participantAuthenticationWorkflowReducer(state, {
    sessionEpoch: state.sessionEpoch,
    type: "sign_succeeded",
    walletEpoch: state.walletEpoch,
  });
  state = reduction.state;
  return participantAuthenticationWorkflowReducer(state, {
    participant: authenticationSession(),
    sessionEpoch: state.sessionEpoch,
    type: "authenticate_succeeded",
    walletEpoch: state.walletEpoch,
  }).state;
};

describe("participantAuthenticationWorkflow", () => {
  it("drives connect, challenge, signing, authentication, and ready through serializable commands", () => {
    let state = createParticipantAuthenticationWorkflowState({
      publicCampaignLastGood: feedItem(campaignAId),
    });
    expect(state.status).toBe("disconnected");

    let reduction = participantAuthenticationWorkflowReducer(state, {
      type: "connect_requested",
    });
    expect(reduction.state.status).toBe("connecting");
    expect(reduction.commands).toEqual([{
      sessionEpoch: 1,
      type: "connect_wallet",
      walletEpoch: 1,
    }]);
    state = reduction.state;

    reduction = participantAuthenticationWorkflowReducer(state, {
      sessionEpoch: state.sessionEpoch,
      type: "wallet_connected",
      wallet: authenticationWallet,
      walletEpoch: state.walletEpoch,
    });
    expect(reduction.state.status).toBe("connecting");
    expect(reduction.commands).toEqual([{
      adapterId: authenticationWallet.adapterId,
      caHashHint: authenticationWallet.caHashHint,
      chainId: authenticationWallet.chainId,
      network: authenticationWallet.network,
      sessionEpoch: state.sessionEpoch,
      type: "request_challenge",
      walletAddressHint: authenticationWallet.walletAddressHint,
      walletEpoch: state.walletEpoch,
    }]);
    state = reduction.state;

    reduction = participantAuthenticationWorkflowReducer(state, {
      challenge: {
        challengeId: "challenge-participant-auth",
        expiresAt: "2026-07-18T13:05:00.000Z",
      },
      sessionEpoch: state.sessionEpoch,
      type: "challenge_succeeded",
      walletEpoch: state.walletEpoch,
    });
    expect(reduction.state.status).toBe("challengeReady");
    expect(reduction.state.privateParticipant.challenge).toEqual({
      challengeId: "challenge-participant-auth",
      expiresAt: "2026-07-18T13:05:00.000Z",
    });
    expect(reduction.commands).toEqual([]);
    state = reduction.state;

    reduction = participantAuthenticationWorkflowReducer(state, {
      type: "sign_requested",
    });
    expect(reduction.state.status).toBe("signing");
    expect(reduction.commands[0]).toMatchObject({
      challengeId: "challenge-participant-auth",
      type: "sign_challenge",
    });
    state = reduction.state;

    reduction = participantAuthenticationWorkflowReducer(state, {
      sessionEpoch: state.sessionEpoch,
      type: "sign_succeeded",
      walletEpoch: state.walletEpoch,
    });
    expect(reduction.state.status).toBe("authenticating");
    expect(reduction.commands[0]).toMatchObject({
      challengeId: "challenge-participant-auth",
      type: "authenticate_session",
    });
    state = reduction.state;

    reduction = participantAuthenticationWorkflowReducer(state, {
      participant: authenticationSession(),
      sessionEpoch: state.sessionEpoch,
      type: "authenticate_succeeded",
      walletEpoch: state.walletEpoch,
    });
    expect(reduction.state.status).toBe("ready");
    expect(reduction.state.privateParticipant).toMatchObject({
      challenge: null,
      session: { sessionId: "durable-session-participant" },
      wallet: authenticationWallet,
    });
    expect(reduction.writeCount).toBe(1);

    const serialized = JSON.stringify(reduction);
    expect(serialized).not.toMatch(
      /abortcontroller|subscription|csrf|cookie|nonce|privatekey|proof|rawsignature|signature/i,
    );
    expect(JSON.parse(serialized)).toEqual(reduction);
  });

  it("fails closed on an oversized WalletClient connection projection", () => {
    const connecting = participantAuthenticationWorkflowReducer(
      createParticipantAuthenticationWorkflowState(),
      { type: "connect_requested" },
    ).state;
    const reduction = participantAuthenticationWorkflowReducer(connecting, {
      sessionEpoch: connecting.sessionEpoch,
      type: "wallet_connected",
      wallet: {
        ...authenticationWallet,
        walletAddressHint: "x".repeat(257),
      },
      walletEpoch: connecting.walletEpoch,
    });

    expect(reduction.state.status).toBe("failed");
    expect(reduction.state.failure?.code).toBe("AUTH_WORKFLOW_RESPONSE_INVALID");
    expect(reduction.state.privateParticipant.wallet).toBeNull();
    expect(reduction.commands).toEqual([]);
    expect(reduction.writeCount).toBe(1);
  });

  it.each([
    ["disconnected", "disconnected", "connect"],
    ["expired", "expired", "restore"],
    ["revoked", "revoked", "connect"],
    ["unavailable", "unavailable", "retry"],
    ["failed", "failed", "retry"],
    ["rateLimited", "rateLimited", "retry"],
  ] as const)(
    "maps the %s restore outcome to an actionable state",
    (outcome, expectedStatus, expectedAction) => {
      let state = createParticipantAuthenticationWorkflowState();
      let reduction = participantAuthenticationWorkflowReducer(state, {
        type: "restore_requested",
      });
      expect(reduction.state.status).toBe("restoring");
      expect(reduction.commands[0]?.type).toBe("restore_session");
      state = reduction.state;

      reduction = participantAuthenticationWorkflowReducer(state, {
        failure: outcome === "disconnected"
          ? null
          : authenticationFailure({
              code: `AUTH_RESTORE_${outcome.toUpperCase()}`,
              httpStatus: outcome === "rateLimited" ? 429 : 503,
              retryAfterMs: outcome === "rateLimited" ? 2_000 : null,
            }),
        outcome,
        sessionEpoch: state.sessionEpoch,
        type: "restore_completed",
        walletEpoch: state.walletEpoch,
      });

      expect(reduction.state.status).toBe(expectedStatus);
      expect(reduction.state.privateParticipant.session).toBeNull();
      expect(selectParticipantAuthenticationAction(reduction.state))
        .toBe(expectedAction);
      expect(reduction.state.failure?.retryAfterMs ?? null)
        .toBe(outcome === "rateLimited" ? 2_000 : null);
    },
  );

  it("restores an active durable session without retaining transport credentials", () => {
    const restoring = participantAuthenticationWorkflowReducer(
      createParticipantAuthenticationWorkflowState(),
      { type: "restore_requested" },
    ).state;
    const reduction = participantAuthenticationWorkflowReducer(restoring, {
      outcome: "ready",
      participant: authenticationSession(),
      sessionEpoch: restoring.sessionEpoch,
      type: "restore_completed",
      walletEpoch: restoring.walletEpoch,
    });

    expect(reduction.state.status).toBe("ready");
    expect(reduction.state.privateParticipant.session).toEqual(authenticationSession());
    expect(reduction.state.privateParticipant.challenge).toBeNull();
    expect(JSON.stringify(reduction.state)).not.toMatch(/csrf|cookie|proof|signature/i);
  });

  it("requests a fresh challenge after challenge expiry instead of signing stale bytes", () => {
    const signing = participantAuthenticationWorkflowReducer(
      challengeReadyAuthenticationState(),
      { type: "sign_requested" },
    ).state;
    const failed = participantAuthenticationWorkflowReducer(signing, {
      failure: authenticationFailure({
        code: "AUTH_CHALLENGE_EXPIRED",
        httpStatus: 400,
      }),
      operation: "sign",
      sessionEpoch: signing.sessionEpoch,
      type: "operation_failed",
      walletEpoch: signing.walletEpoch,
    });

    expect(failed.state.status).toBe("failed");
    expect(failed.state.privateParticipant.challenge).toBeNull();
    expect(selectParticipantAuthenticationAction(failed.state)).toBe("retry");

    const retried = participantAuthenticationWorkflowReducer(failed.state, {
      type: "retry_requested",
    });
    expect(retried.state.status).toBe("connecting");
    expect(retried.commands[0]?.type).toBe("request_challenge");
  });

  it("starts a fresh challenge after proof rejection", () => {
    const signing = participantAuthenticationWorkflowReducer(
      challengeReadyAuthenticationState(),
      { type: "sign_requested" },
    ).state;
    const authenticating = participantAuthenticationWorkflowReducer(signing, {
      sessionEpoch: signing.sessionEpoch,
      type: "sign_succeeded",
      walletEpoch: signing.walletEpoch,
    }).state;
    const failed = participantAuthenticationWorkflowReducer(authenticating, {
      failure: authenticationFailure({
        code: "AUTH_PROOF_INVALID",
        httpStatus: 401,
      }),
      operation: "authenticate",
      sessionEpoch: authenticating.sessionEpoch,
      type: "operation_failed",
      walletEpoch: authenticating.walletEpoch,
    });

    expect(failed.state.privateParticipant.challenge).toBeNull();
    const retried = participantAuthenticationWorkflowReducer(failed.state, {
      type: "retry_requested",
    });
    expect(retried.state.status).toBe("connecting");
    expect(retried.commands[0]?.type).toBe("request_challenge");
  });

  it("retains a valid challenge for a retryable provider outage", () => {
    const signing = participantAuthenticationWorkflowReducer(
      challengeReadyAuthenticationState(),
      { type: "sign_requested" },
    ).state;
    const failed = participantAuthenticationWorkflowReducer(signing, {
      failure: authenticationFailure({
        code: "AUTH_PROVIDER_UNAVAILABLE",
        httpStatus: 503,
      }),
      operation: "sign",
      sessionEpoch: signing.sessionEpoch,
      type: "operation_failed",
      walletEpoch: signing.walletEpoch,
    });

    expect(failed.state.status).toBe("unavailable");
    expect(failed.state.privateParticipant.challenge).not.toBeNull();
    const retried = participantAuthenticationWorkflowReducer(failed.state, {
      type: "retry_requested",
    });
    expect(retried.state.status).toBe("signing");
    expect(retried.commands[0]?.type).toBe("sign_challenge");
  });

  it("rotates the durable session under a new session epoch", () => {
    const ready = readyAuthenticationState();
    const rotation = participantAuthenticationWorkflowReducer(ready, {
      type: "rotation_requested",
    });

    expect(rotation.state.status).toBe("rotating");
    expect(rotation.state.sessionEpoch).toBe(ready.sessionEpoch + 1);
    expect(rotation.commands).toEqual([{
      sessionEpoch: rotation.state.sessionEpoch,
      type: "rotate_session",
      walletEpoch: rotation.state.walletEpoch,
    }]);

    const rotatedSession = authenticationSession({
      sessionId: "durable-session-participant-rotated",
    });
    const rotated = participantAuthenticationWorkflowReducer(rotation.state, {
      participant: rotatedSession,
      sessionEpoch: rotation.state.sessionEpoch,
      type: "rotation_succeeded",
      walletEpoch: rotation.state.walletEpoch,
    });
    expect(rotated.state.status).toBe("ready");
    expect(rotated.state.privateParticipant.session).toEqual(rotatedSession);
    expect(rotated.state.sessionEpoch).toBe(rotation.state.sessionEpoch);
  });

  it.each([true, false])(
    "clears private Participant state before logout completion (ok=%s)",
    (ok) => {
      const ready = readyAuthenticationState();
      const publicCampaign = ready.publicCampaign;
      const logout = participantAuthenticationWorkflowReducer(ready, {
        type: "logout_requested",
      });

      expect(logout.state.status).toBe("loggingOut");
      expect(logout.state.privateParticipant).toEqual({
        challenge: null,
        session: null,
        wallet: null,
      });
      expect(logout.state.publicCampaign).toBe(publicCampaign);
      expect(logout.commands[0]?.type).toBe("logout_session");

      const completed = participantAuthenticationWorkflowReducer(logout.state, {
        failure: ok ? null : authenticationFailure({ code: "AUTH_LOGOUT_FAILED" }),
        ok,
        sessionEpoch: logout.state.sessionEpoch,
        type: "logout_completed",
        walletEpoch: logout.state.walletEpoch,
      });
      expect(completed.state.status).toBe("disconnected");
      expect(completed.state.privateParticipant).toEqual({
        challenge: null,
        session: null,
        wallet: null,
      });
      expect(completed.commands).toEqual([]);
    },
  );

  it.each([
    [401, "expired"],
    [403, "revoked"],
  ] as const)(
    "clears only private Participant authority on HTTP %s",
    (httpStatus, expectedStatus) => {
      const ready = readyAuthenticationState();
      const publicCampaign = ready.publicCampaign;
      const rejected = participantAuthenticationWorkflowReducer(ready, {
        failure: authenticationFailure({
          code: httpStatus === 401 ? "AUTH_SESSION_INVALID" : "AUTH_FORBIDDEN",
          httpStatus,
        }),
        sessionEpoch: ready.sessionEpoch,
        type: "private_request_failed",
        walletEpoch: ready.walletEpoch,
      });

      expect(rejected.state.status).toBe(expectedStatus);
      expect(rejected.state.privateParticipant).toEqual({
        challenge: null,
        session: null,
        wallet: null,
      });
      expect(rejected.state.publicCampaign).toBe(publicCampaign);
      expect(rejected.state.publicCampaign.lastGood).toEqual(feedItem(campaignAId));
    },
  );

  it.each([
    [429, "rateLimited", "retry"],
    [503, "unavailable", "retry"],
    [500, "failed", "retry"],
  ] as const)(
    "keeps non-authority HTTP %s failures actionable",
    (httpStatus, expectedStatus, expectedAction) => {
      const ready = readyAuthenticationState();
      const failed = participantAuthenticationWorkflowReducer(ready, {
        failure: authenticationFailure({
          code: `AUTH_HTTP_${httpStatus}`,
          httpStatus,
          retryAfterMs: httpStatus === 429 ? 3_000 : null,
        }),
        sessionEpoch: ready.sessionEpoch,
        type: "private_request_failed",
        walletEpoch: ready.walletEpoch,
      });

      expect(failed.state.status).toBe(expectedStatus);
      expect(failed.state.privateParticipant.session).toBe(
        ready.privateParticipant.session,
      );
      expect(selectParticipantAuthenticationAction(failed.state))
        .toBe(expectedAction);

      const retried = participantAuthenticationWorkflowReducer(failed.state, {
        type: "retry_requested",
      });
      expect(retried.state.status).toBe("restoring");
      expect(retried.commands[0]?.type).toBe("restore_session");
    },
  );

  it("keeps logout cleanup final when the generic effect failure path is used", () => {
    const ready = readyAuthenticationState();
    const logout = participantAuthenticationWorkflowReducer(ready, {
      type: "logout_requested",
    });
    const failed = participantAuthenticationWorkflowReducer(logout.state, {
      failure: authenticationFailure({ code: "AUTH_LOGOUT_TRANSPORT_FAILED" }),
      operation: "logout",
      sessionEpoch: logout.state.sessionEpoch,
      type: "operation_failed",
      walletEpoch: logout.state.walletEpoch,
    });

    expect(failed.state.status).toBe("disconnected");
    expect(failed.state.privateParticipant).toEqual({
      challenge: null,
      session: null,
      wallet: null,
    });
    expect(failed.commands).toEqual([]);
  });

  it("bounds HTTP 409 recovery to one restore and one reconnect command", () => {
    const ready = readyAuthenticationState();
    let reduction = participantAuthenticationWorkflowReducer(ready, {
      failure: authenticationFailure({
        code: "AUTH_CONFLICT",
        httpStatus: 409,
      }),
      sessionEpoch: ready.sessionEpoch,
      type: "private_request_failed",
      walletEpoch: ready.walletEpoch,
    });

    expect(reduction.state.status).toBe("restoring");
    expect(reduction.state.conflictRecoveryStep).toBe(1);
    expect(reduction.commands[0]?.type).toBe("restore_session");

    let state = reduction.state;
    reduction = participantAuthenticationWorkflowReducer(state, {
      failure: authenticationFailure({ code: "AUTH_CONFLICT", httpStatus: 409 }),
      operation: "restore",
      sessionEpoch: state.sessionEpoch,
      type: "operation_failed",
      walletEpoch: state.walletEpoch,
    });
    expect(reduction.state.status).toBe("connecting");
    expect(reduction.state.conflictRecoveryStep).toBe(2);
    expect(reduction.commands[0]?.type).toBe("connect_wallet");

    state = reduction.state;
    reduction = participantAuthenticationWorkflowReducer(state, {
      failure: authenticationFailure({ code: "AUTH_CONFLICT", httpStatus: 409 }),
      operation: "connect",
      sessionEpoch: state.sessionEpoch,
      type: "operation_failed",
      walletEpoch: state.walletEpoch,
    });
    expect(reduction.state.status).toBe("failed");
    expect(reduction.state.conflictRecoveryStep)
      .toBe(PARTICIPANT_AUTHENTICATION_MAX_CONFLICT_RECOVERY_STEPS);
    expect(reduction.commands).toEqual([]);
    expect(selectParticipantAuthenticationAction(reduction.state)).toBe("connect");
  });

  it.each([
    "account_changed",
    "chain_changed",
    "network_changed",
    "provider_disconnected",
  ] as const)(
    "increments both epochs and rejects late completions after %s",
    (reason) => {
      const ready = readyAuthenticationState();
      const rotation = participantAuthenticationWorkflowReducer(ready, {
        type: "rotation_requested",
      });
      const invalidated = participantAuthenticationWorkflowReducer(rotation.state, {
        reason,
        type: "wallet_context_changed",
      });

      expect(invalidated.state.walletEpoch).toBe(rotation.state.walletEpoch + 1);
      expect(invalidated.state.sessionEpoch).toBe(rotation.state.sessionEpoch + 1);
      expect(invalidated.state.status).toBe("disconnected");
      expect(invalidated.state.privateParticipant.session).toBeNull();

      const late = participantAuthenticationWorkflowReducer(invalidated.state, {
        participant: authenticationSession({ sessionId: `late-${reason}` }),
        sessionEpoch: rotation.state.sessionEpoch,
        type: "rotation_succeeded",
        walletEpoch: rotation.state.walletEpoch,
      });
      expect(late.state).toBe(invalidated.state);
      expect(late.writeCount).toBe(0);
      expect(late.commands).toEqual([]);
    },
  );

  it("treats an epoch mismatch on every async completion as an exact no-op", () => {
    const connecting = participantAuthenticationWorkflowReducer(
      createParticipantAuthenticationWorkflowState(),
      { type: "connect_requested" },
    ).state;
    const completions = [
      { type: "wallet_connected", wallet: authenticationWallet },
      {
        challenge: {
          challengeId: "stale-challenge",
          expiresAt: "2026-07-18T13:05:00.000Z",
        },
        type: "challenge_succeeded",
      },
      { type: "sign_succeeded" },
      { participant: authenticationSession(), type: "authenticate_succeeded" },
      { outcome: "ready", participant: authenticationSession(), type: "restore_completed" },
      { participant: authenticationSession(), type: "rotation_succeeded" },
      { failure: null, ok: true, type: "logout_completed" },
      {
        failure: authenticationFailure(),
        operation: "connect",
        type: "operation_failed",
      },
      { failure: authenticationFailure(), type: "private_request_failed" },
    ] as const;

    for (const completion of completions) {
      const stale = participantAuthenticationWorkflowReducer(connecting, {
        ...completion,
        sessionEpoch: connecting.sessionEpoch,
        walletEpoch: connecting.walletEpoch + 1,
      });
      expect(stale.state).toBe(connecting);
      expect(stale.writeCount).toBe(0);
      expect(stale.commands).toEqual([]);
    }
  });
});
