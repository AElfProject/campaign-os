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
  canReconnectParticipantJourney,
  canSelectParticipantCampaign,
  canVerifyParticipantJourneyTask,
  createParticipantJourneyWorkflowState,
  createParticipantSessionKey,
  nextParticipantJourneyRequestToken,
  participantJourneyWorkflowReducer,
  selectParticipantJourneyRetryOperation,
  type ParticipantJourneyRequestToken,
  type ParticipantJourneyWorkflowState,
} from "./participantJourneyWorkflow";

const campaignAId = "campaign-durable-a";
const campaignBId = "campaign-durable-b";
const taskAId = "task-durable-a";
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
  pointsAwarded = 999,
): ParticipantVerifySuccess => ({
  httpStatus: 200,
  ok: true,
  source: "durable",
  status: "success",
  traceId: "trace-verify-command",
  verification: {
    completion: {
      accountType: "EOA",
      campaignId: campaignAId,
      evidenceId: "evidence-from-command",
      id: "completion-from-command",
      pointsAwarded,
      status: "completed",
      taskId: taskAId,
      walletAddress,
      walletSource: "PORTKEY_EOA_EXTENSION",
    },
    evidence: {
      accountType: "EOA",
      campaignId: campaignAId,
      completionId: "completion-from-command",
      id: "evidence-from-command",
      pointsAwarded,
      status: "completed",
      taskId: taskAId,
      walletAddress,
      walletSource: "PORTKEY_EOA_EXTENSION",
    },
    participant: {
      accountType: "EOA",
      campaignId: campaignAId,
      id: "participant-from-command",
      totalPoints: pointsAwarded,
      walletAddress,
      walletSource: "PORTKEY_EOA_EXTENSION",
    },
    repository,
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
    [
      "degraded",
      () => {
        const verifying = verifyingState();
        return participantJourneyWorkflowReducer(verifying.state, {
          failure: failure(),
          token: verifying.token,
          type: "verify_failed",
        });
      },
    ],
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
    const retryToken = nextParticipantJourneyRequestToken(degraded, "journey");
    const retrying = participantJourneyWorkflowReducer(degraded, {
      reason: "retry",
      token: retryToken,
      type: "journey_requested",
    });
    expect(retrying.sequences).toEqual({ feed: 1, journey: 2, verify: 1 });
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
      result: verifySuccess(999),
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
      result: verifySuccess(1_000),
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
    const rejectedVerify = participantJourneyWorkflowReducer(verifying.state, {
      result: {
        ...mismatched,
        verification: {
          ...mismatched.verification,
          completion: {
            ...mismatched.verification.completion,
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
});
