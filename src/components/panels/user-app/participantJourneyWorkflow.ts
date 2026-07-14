import type {
  ParticipantCampaignFeedItem,
  ParticipantCampaignListSuccess,
  ParticipantJourneyFailure,
  ParticipantJourneyMode,
  ParticipantJourneyProjection,
  ParticipantJourneySuccess,
  ParticipantVerifySuccess,
} from "../../../api/participantJourneyApiBridge";
import type { NormalizedWalletSession } from "../../../domain/types";

export type ParticipantJourneyWorkflowStatus =
  | "no_session"
  | "loading_feed"
  | "feed_ready"
  | "loading_journey"
  | "ready"
  | "verifying"
  | "degraded"
  | "blocked";

export type ParticipantJourneyRequestOperation = "feed" | "journey" | "verify";
export type ParticipantJourneyReadOperation = Extract<
  ParticipantJourneyRequestOperation,
  "feed" | "journey"
>;
export type ParticipantJourneyPendingOperation =
  | ParticipantJourneyRequestOperation
  | "refresh_journey";
export type ParticipantJourneyRequestReason = "refresh" | "retry" | "selection";

export interface ParticipantJourneyRequestToken {
  campaignId: string | null;
  epoch: number;
  operation: ParticipantJourneyRequestOperation;
  sequence: number;
  sessionKey: string | null;
}

export interface ParticipantJourneyRequestSequences {
  feed: number;
  journey: number;
  verify: number;
}

export interface ParticipantJourneyActiveRequests {
  feed: ParticipantJourneyRequestToken | null;
  journey: ParticipantJourneyRequestToken | null;
  verify: ParticipantJourneyRequestToken | null;
}

interface ParticipantJourneyWorkflowStateData {
  activeRequests: ParticipantJourneyActiveRequests;
  commandTraceId: string | null;
  diagnostic: ParticipantJourneyFailure | null;
  epoch: number;
  feed: readonly ParticipantCampaignFeedItem[];
  journey: ParticipantJourneyProjection | null;
  lastGoodJourney: ParticipantJourneyProjection | null;
  mode: ParticipantJourneyMode;
  pendingOperation: ParticipantJourneyPendingOperation | null;
  pendingTaskId: string | null;
  reconnectRequired: boolean;
  retryOperation: ParticipantJourneyReadOperation | null;
  selectedCampaignId: string | null;
  sequences: ParticipantJourneyRequestSequences;
  sessionKey: string | null;
}

type ParticipantJourneyWorkflowStateFor<
  Status extends ParticipantJourneyWorkflowStatus,
> = ParticipantJourneyWorkflowStateData & { status: Status };

export type ParticipantJourneyWorkflowState =
  | ParticipantJourneyWorkflowStateFor<"no_session">
  | ParticipantJourneyWorkflowStateFor<"loading_feed">
  | ParticipantJourneyWorkflowStateFor<"feed_ready">
  | ParticipantJourneyWorkflowStateFor<"loading_journey">
  | ParticipantJourneyWorkflowStateFor<"ready">
  | ParticipantJourneyWorkflowStateFor<"verifying">
  | ParticipantJourneyWorkflowStateFor<"degraded">
  | ParticipantJourneyWorkflowStateFor<"blocked">;

export type ParticipantJourneyWorkflowEvent =
  | {
      mode: ParticipantJourneyMode;
      sessionKey: string | null;
      type: "context_changed";
    }
  | {
      token: ParticipantJourneyRequestToken;
      type: "feed_requested";
    }
  | {
      result: ParticipantCampaignListSuccess;
      token: ParticipantJourneyRequestToken;
      type: "feed_succeeded";
    }
  | {
      failure: ParticipantJourneyFailure;
      token: ParticipantJourneyRequestToken;
      type: "feed_failed";
    }
  | {
      campaignId: string;
      type: "campaign_selected";
    }
  | {
      reason: ParticipantJourneyRequestReason;
      token: ParticipantJourneyRequestToken;
      type: "journey_requested";
    }
  | {
      result: ParticipantJourneySuccess;
      token: ParticipantJourneyRequestToken;
      type: "journey_succeeded";
    }
  | {
      failure: ParticipantJourneyFailure;
      token: ParticipantJourneyRequestToken;
      type: "journey_failed";
    }
  | {
      taskId: string;
      token: ParticipantJourneyRequestToken;
      type: "verify_requested";
    }
  | {
      result: ParticipantVerifySuccess;
      token: ParticipantJourneyRequestToken;
      type: "verify_succeeded";
    }
  | {
      failure: ParticipantJourneyFailure;
      token: ParticipantJourneyRequestToken;
      type: "verify_failed";
    };

export interface CreateParticipantJourneyWorkflowStateOptions {
  mode?: ParticipantJourneyMode;
  sessionKey?: string | null;
}

const initialSequences = (): ParticipantJourneyRequestSequences => ({
  feed: 0,
  journey: 0,
  verify: 0,
});

const emptyActiveRequests = (): ParticipantJourneyActiveRequests => ({
  feed: null,
  journey: null,
  verify: null,
});

const nextCounter = (value: number) =>
  value < Number.MAX_SAFE_INTEGER ? value + 1 : Number.MAX_SAFE_INTEGER;

const encodeSessionIdentityPart = (value: boolean | string | undefined) =>
  encodeURIComponent(value === undefined ? "" : String(value));

export const createParticipantSessionKey = (
  session: NormalizedWalletSession | null | undefined,
): string | null => {
  if (!session) {
    return null;
  }

  const proof = session.proof;
  const issuer = session.issuer;
  const readiness = session.productionReadiness;

  return [
    session.sessionId,
    session.id,
    session.address.trim(),
    session.accountType,
    session.walletSource,
    session.chainId,
    session.network,
    session.verificationStatus,
    session.signatureStatus,
    session.walletTypeVerified,
    proof?.proofType,
    proof?.status,
    proof?.trustLevel,
    issuer?.referenceId,
    issuer?.issuerMode,
    issuer?.valid,
    readiness?.productionRequired,
    readiness?.liveSigningReady,
    readiness?.liveVerifierReady,
    readiness?.productionSessionStoreReady,
    readiness?.secretManagerReady,
    readiness?.signingKeyReady,
  ].map(encodeSessionIdentityPart).join("|");
};

export const createParticipantJourneyWorkflowState = (
  options: CreateParticipantJourneyWorkflowStateOptions = {},
): ParticipantJourneyWorkflowState => {
  const mode = options.mode ?? "durable";
  const sessionKey = options.sessionKey ?? null;

  return {
    activeRequests: emptyActiveRequests(),
    commandTraceId: null,
    diagnostic: null,
    epoch: 0,
    feed: [],
    journey: null,
    lastGoodJourney: null,
    mode,
    pendingOperation: null,
    pendingTaskId: null,
    reconnectRequired: false,
    retryOperation: null,
    selectedCampaignId: null,
    sequences: initialSequences(),
    sessionKey,
    status: sessionKey ? "feed_ready" : "no_session",
  };
};

export const nextParticipantJourneyRequestToken = (
  state: ParticipantJourneyWorkflowState,
  operation: ParticipantJourneyRequestOperation,
): ParticipantJourneyRequestToken => ({
  campaignId: state.selectedCampaignId,
  epoch: state.epoch,
  operation,
  sequence: nextCounter(state.sequences[operation]),
  sessionKey: state.sessionKey,
});

const hasActiveRequest = (state: ParticipantJourneyWorkflowState) =>
  Object.values(state.activeRequests).some((token) => token !== null);

const sameRequestToken = (
  left: ParticipantJourneyRequestToken,
  right: ParticipantJourneyRequestToken,
) => left.operation === right.operation
  && left.sessionKey === right.sessionKey
  && left.campaignId === right.campaignId
  && left.epoch === right.epoch
  && left.sequence === right.sequence;

const requestTokenTargetsState = (
  state: ParticipantJourneyWorkflowState,
  token: ParticipantJourneyRequestToken,
  operation: ParticipantJourneyRequestOperation,
) => token.operation === operation
  && token.sessionKey !== null
  && token.sessionKey === state.sessionKey
  && token.campaignId === state.selectedCampaignId
  && token.epoch === state.epoch;

const canStartRequestToken = (
  state: ParticipantJourneyWorkflowState,
  token: ParticipantJourneyRequestToken,
  operation: ParticipantJourneyRequestOperation,
) => requestTokenTargetsState(state, token, operation)
  && !hasActiveRequest(state)
  && token.sequence === nextCounter(state.sequences[operation]);

const responseTokenMatches = (
  state: ParticipantJourneyWorkflowState,
  token: ParticipantJourneyRequestToken,
  operation: ParticipantJourneyRequestOperation,
) => {
  if (!requestTokenTargetsState(state, token, operation)) {
    return false;
  }

  const activeToken = state.activeRequests[operation];
  return activeToken !== null
    && state.sequences[operation] === token.sequence
    && sameRequestToken(activeToken, token);
};

const contextState = (
  state: ParticipantJourneyWorkflowState,
  mode: ParticipantJourneyMode,
  sessionKey: string | null,
): ParticipantJourneyWorkflowState => ({
  activeRequests: emptyActiveRequests(),
  commandTraceId: null,
  diagnostic: null,
  epoch: nextCounter(state.epoch),
  feed: [],
  journey: null,
  lastGoodJourney: null,
  mode,
  pendingOperation: null,
  pendingTaskId: null,
  reconnectRequired: false,
  retryOperation: null,
  selectedCampaignId: null,
  sequences: state.sequences,
  sessionKey,
  status: sessionKey ? "feed_ready" : "no_session",
});

const selectedCampaignState = (
  state: ParticipantJourneyWorkflowState,
  campaignId: string,
): ParticipantJourneyWorkflowState => ({
  ...state,
  activeRequests: emptyActiveRequests(),
  commandTraceId: null,
  diagnostic: null,
  epoch: nextCounter(state.epoch),
  journey: null,
  lastGoodJourney: null,
  pendingOperation: null,
  pendingTaskId: null,
  reconnectRequired: false,
  retryOperation: null,
  selectedCampaignId: campaignId,
  status: "loading_journey",
});

const retryOperationForFailure = (
  failure: ParticipantJourneyFailure,
  operation: ParticipantJourneyRequestOperation,
): ParticipantJourneyReadOperation | null => {
  if (!failure.retryable || failure.reconnectRequired) {
    return null;
  }

  return operation === "feed" ? "feed" : "journey";
};

const failedRequestState = (
  state: ParticipantJourneyWorkflowState,
  failure: ParticipantJourneyFailure,
  operation: ParticipantJourneyRequestOperation,
): ParticipantJourneyWorkflowState => {
  const retainLastGoodJourney = Boolean(
    state.lastGoodJourney
    && failure.status === "degraded"
    && !failure.reconnectRequired
    && (failure.phase === "request" || failure.phase === "response"),
  );
  const lastGoodJourney = retainLastGoodJourney ? state.lastGoodJourney : null;

  return {
    ...state,
    activeRequests: emptyActiveRequests(),
    diagnostic: failure,
    journey: lastGoodJourney,
    lastGoodJourney,
    pendingOperation: null,
    pendingTaskId: null,
    reconnectRequired: failure.reconnectRequired,
    retryOperation: retryOperationForFailure(failure, operation),
    status: lastGoodJourney ? "degraded" : "blocked",
  };
};

const identityFailure = (
  state: ParticipantJourneyWorkflowState,
  traceId: string,
): ParticipantJourneyFailure => ({
  code: "PARTICIPANT_JOURNEY_IDENTITY_MISMATCH",
  ok: false,
  phase: "identity",
  reconnectRequired: false,
  retryable: false,
  source: state.mode,
  status: "blocked",
  traceId,
});

const journeyMatchesCampaign = (
  projection: ParticipantJourneyProjection,
  campaignId: string,
) => projection.campaign.campaignId === campaignId
  && projection.eligibility.campaignId === campaignId
  && projection.participant.campaignId === campaignId
  && projection.ranking.campaignId === campaignId
  && projection.tasks.every((task) => task.campaignId === campaignId);

const verificationMatchesCommand = (
  result: ParticipantVerifySuccess,
  campaignId: string,
  taskId: string,
) => {
  const { completion, evidence, participant } = result.verification;

  return completion.campaignId === campaignId
    && evidence.campaignId === campaignId
    && (!participant || participant.campaignId === campaignId)
    && completion.taskId === taskId
    && evidence.taskId === taskId
    && completion.evidenceId === evidence.id
    && evidence.completionId === completion.id;
};

const clearSelectedCampaignForFeed = (
  state: ParticipantJourneyWorkflowState,
  feed: readonly ParticipantCampaignFeedItem[],
): ParticipantJourneyWorkflowState => ({
  ...state,
  activeRequests: emptyActiveRequests(),
  commandTraceId: null,
  diagnostic: null,
  epoch: nextCounter(state.epoch),
  feed,
  journey: null,
  lastGoodJourney: null,
  pendingOperation: null,
  pendingTaskId: null,
  reconnectRequired: false,
  retryOperation: null,
  selectedCampaignId: null,
  status: "feed_ready",
});

export const canSelectParticipantCampaign = (
  state: ParticipantJourneyWorkflowState,
  campaignId: string,
) => {
  const canSupersedeInitialJourney = state.status === "loading_journey"
    && state.lastGoodJourney === null
    && state.activeRequests.feed === null
    && state.activeRequests.verify === null
    && (state.pendingOperation === null || state.pendingOperation === "journey");
  const idleSelectionState = !hasActiveRequest(state)
    && state.pendingOperation === null
    && ["feed_ready", "ready", "degraded", "blocked"].includes(state.status);

  return Boolean(state.sessionKey)
    && state.selectedCampaignId !== campaignId
    && state.feed.some((campaign) => campaign.campaignId === campaignId)
    && (idleSelectionState || canSupersedeInitialJourney);
};

export const canVerifyParticipantJourneyTask = (
  state: ParticipantJourneyWorkflowState,
  taskId: string,
) => Boolean(state.sessionKey)
  && Boolean(state.selectedCampaignId)
  && state.status === "ready"
  && state.pendingOperation === null
  && !hasActiveRequest(state)
  && Boolean(state.journey?.tasks.some((task) =>
    task.taskId === taskId
    && task.campaignId === state.selectedCampaignId
    && task.blockedReason === null
    && (task.action === "verify" || task.action === "retry")));

export const selectParticipantJourneyRetryOperation = (
  state: ParticipantJourneyWorkflowState,
): ParticipantJourneyReadOperation | null => {
  if (
    !state.sessionKey
    || state.reconnectRequired
    || !["degraded", "blocked"].includes(state.status)
    || state.pendingOperation !== null
    || hasActiveRequest(state)
  ) {
    return null;
  }

  if (state.retryOperation === "journey" && !state.selectedCampaignId) {
    return null;
  }

  return state.retryOperation;
};

export const canReconnectParticipantJourney = (
  state: ParticipantJourneyWorkflowState,
) => state.reconnectRequired
  && state.pendingOperation === null
  && !hasActiveRequest(state);

const canStartFeed = (
  state: ParticipantJourneyWorkflowState,
  token: ParticipantJourneyRequestToken,
) => canStartRequestToken(state, token, "feed")
  && state.pendingOperation === null
  && ["feed_ready", "ready", "degraded", "blocked"].includes(state.status);

const canStartJourney = (
  state: ParticipantJourneyWorkflowState,
  token: ParticipantJourneyRequestToken,
  reason: ParticipantJourneyRequestReason,
) => {
  if (
    !state.selectedCampaignId
    || !canStartRequestToken(state, token, "journey")
  ) {
    return false;
  }

  if (reason === "selection") {
    return state.status === "loading_journey"
      && state.pendingOperation === null
      && state.lastGoodJourney === null;
  }

  if (reason === "refresh") {
    return state.status === "verifying"
      && state.pendingOperation === "refresh_journey"
      && state.commandTraceId !== null;
  }

  return (state.status === "degraded" || state.status === "blocked")
    && state.pendingOperation === null
    && selectParticipantJourneyRetryOperation(state) === "journey";
};

const startFeed = (
  state: ParticipantJourneyWorkflowState,
  token: ParticipantJourneyRequestToken,
): ParticipantJourneyWorkflowState => ({
  ...state,
  activeRequests: { ...state.activeRequests, feed: token },
  diagnostic: null,
  pendingOperation: "feed",
  pendingTaskId: null,
  reconnectRequired: false,
  retryOperation: null,
  sequences: { ...state.sequences, feed: token.sequence },
  status: "loading_feed",
});

const startJourney = (
  state: ParticipantJourneyWorkflowState,
  token: ParticipantJourneyRequestToken,
  reason: ParticipantJourneyRequestReason,
): ParticipantJourneyWorkflowState => ({
  ...state,
  activeRequests: { ...state.activeRequests, journey: token },
  diagnostic: null,
  pendingOperation: reason === "refresh" ? "refresh_journey" : "journey",
  reconnectRequired: false,
  retryOperation: null,
  sequences: { ...state.sequences, journey: token.sequence },
  status: reason === "refresh" ? "verifying" : "loading_journey",
});

const startVerify = (
  state: ParticipantJourneyWorkflowState,
  token: ParticipantJourneyRequestToken,
  taskId: string,
): ParticipantJourneyWorkflowState => ({
  ...state,
  activeRequests: { ...state.activeRequests, verify: token },
  commandTraceId: null,
  diagnostic: null,
  pendingOperation: "verify",
  pendingTaskId: taskId,
  reconnectRequired: false,
  retryOperation: null,
  sequences: { ...state.sequences, verify: token.sequence },
  status: "verifying",
});

export const participantJourneyWorkflowReducer = (
  state: ParticipantJourneyWorkflowState,
  event: ParticipantJourneyWorkflowEvent,
): ParticipantJourneyWorkflowState => {
  if (event.type === "context_changed") {
    if (state.mode === event.mode && state.sessionKey === event.sessionKey) {
      return state;
    }

    return contextState(state, event.mode, event.sessionKey);
  }

  if (event.type === "campaign_selected") {
    return canSelectParticipantCampaign(state, event.campaignId)
      ? selectedCampaignState(state, event.campaignId)
      : state;
  }

  if (event.type === "feed_requested") {
    return canStartFeed(state, event.token)
      ? startFeed(state, event.token)
      : state;
  }

  if (event.type === "journey_requested") {
    return canStartJourney(state, event.token, event.reason)
      ? startJourney(state, event.token, event.reason)
      : state;
  }

  if (event.type === "verify_requested") {
    if (
      !canStartRequestToken(state, event.token, "verify")
      || !canVerifyParticipantJourneyTask(state, event.taskId)
    ) {
      return state;
    }

    return startVerify(state, event.token, event.taskId);
  }

  if (event.type === "feed_succeeded") {
    if (!responseTokenMatches(state, event.token, "feed")) {
      return state;
    }

    if (event.result.source !== state.mode) {
      return failedRequestState(
        state,
        identityFailure(state, event.result.traceId),
        "feed",
      );
    }

    const feed = [...event.result.campaigns];
    if (
      state.selectedCampaignId
      && !feed.some((campaign) => campaign.campaignId === state.selectedCampaignId)
    ) {
      return clearSelectedCampaignForFeed(state, feed);
    }

    return {
      ...state,
      activeRequests: emptyActiveRequests(),
      diagnostic: null,
      feed,
      pendingOperation: null,
      pendingTaskId: null,
      reconnectRequired: false,
      retryOperation: null,
      status: state.journey
        ? "ready"
        : state.selectedCampaignId
          ? "loading_journey"
          : "feed_ready",
    };
  }

  if (event.type === "feed_failed") {
    return responseTokenMatches(state, event.token, "feed")
      ? failedRequestState(state, event.failure, "feed")
      : state;
  }

  if (event.type === "journey_succeeded") {
    if (!responseTokenMatches(state, event.token, "journey")) {
      return state;
    }

    const campaignId = state.selectedCampaignId;
    if (
      !campaignId
      || event.result.source !== state.mode
      || !journeyMatchesCampaign(event.result.journey, campaignId)
    ) {
      return failedRequestState(
        state,
        identityFailure(state, event.result.traceId),
        "journey",
      );
    }

    return {
      ...state,
      activeRequests: emptyActiveRequests(),
      diagnostic: null,
      journey: event.result.journey,
      lastGoodJourney: event.result.journey,
      pendingOperation: null,
      pendingTaskId: null,
      reconnectRequired: false,
      retryOperation: null,
      status: "ready",
    };
  }

  if (event.type === "journey_failed") {
    return responseTokenMatches(state, event.token, "journey")
      ? failedRequestState(state, event.failure, "journey")
      : state;
  }

  if (event.type === "verify_succeeded") {
    if (!responseTokenMatches(state, event.token, "verify")) {
      return state;
    }

    if (
      !state.selectedCampaignId
      || !state.pendingTaskId
      || event.result.source !== state.mode
      || !verificationMatchesCommand(
        event.result,
        state.selectedCampaignId,
        state.pendingTaskId,
      )
    ) {
      return failedRequestState(
        state,
        identityFailure(state, event.result.traceId),
        "verify",
      );
    }

    return {
      ...state,
      activeRequests: emptyActiveRequests(),
      commandTraceId: event.result.traceId,
      diagnostic: null,
      pendingOperation: "refresh_journey",
      reconnectRequired: false,
      retryOperation: null,
      status: "verifying",
    };
  }

  if (event.type === "verify_failed") {
    return responseTokenMatches(state, event.token, "verify")
      ? failedRequestState(state, event.failure, "verify")
      : state;
  }

  return state;
};
