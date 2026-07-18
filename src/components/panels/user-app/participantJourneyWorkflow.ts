import type {
  ParticipantCampaignFeedItem,
  ParticipantCampaignListSuccess,
  ParticipantJourneyDurableSession,
  ParticipantJourneyFailure,
  ParticipantJourneyMode,
  ParticipantJourneyProjection,
  ParticipantJourneySuccess,
  ParticipantVerifySuccess,
} from "../../../api/participantJourneyApiBridge";
import type { NormalizedWalletSession } from "../../../domain/types";
import type { RequestedWalletConnectionHint } from "../../../wallet/walletClient";

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

export type ParticipantJourneyTaskAttemptStatus =
  | "verifying"
  | "pending"
  | "completed"
  | "failed"
  | "manual_review"
  | "unavailable";

export type ParticipantJourneyTaskAction =
  | "verify"
  | "retry"
  | "await_review"
  | "none";

export type ParticipantJourneyTaskPollPhase =
  | "scheduled"
  | "in_flight"
  | "paused"
  | "exhausted";

export type ParticipantJourneyVerificationOutcome =
  | "completed"
  | "failed"
  | "manual_review"
  | "pending";

export const PARTICIPANT_JOURNEY_POLL_MIN_DELAY_MS = 1_000;
export const PARTICIPANT_JOURNEY_POLL_MAX_DELAY_MS = 30_000;
export const PARTICIPANT_JOURNEY_POLL_MAX_ATTEMPTS = 6;

export interface ParticipantJourneyRequestToken {
  campaignId: string | null;
  epoch: number;
  operation: ParticipantJourneyRequestOperation;
  sequence: number;
  sessionKey: string | null;
  taskId: string | null;
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

export interface ParticipantJourneyTaskReceipt {
  attemptId: string;
  authorityLinkageRequired: boolean;
  completionId: string | null;
  diagnosticCodes: readonly string[];
  evidenceId: string | null;
  httpStatus: number;
  outcome: ParticipantJourneyVerificationOutcome;
  pointsAwarded: number;
  providerFamily: string | null;
  retryAfterMs: number | null;
  retryable: boolean;
  traceId: string;
}

export interface ParticipantJourneyTaskPoll {
  attemptCount: number;
  attemptId: string;
  delayMs: number;
  maxAttempts: number;
  ownerId: string;
  phase: ParticipantJourneyTaskPollPhase;
}

export interface ParticipantJourneyTaskRefresh {
  requestCount: number;
  status: "required" | "in_flight" | "failed";
}

export interface ParticipantJourneyTaskAttempt {
  activeRequest: ParticipantJourneyRequestToken | null;
  diagnostic: ParticipantJourneyFailure | null;
  poll: ParticipantJourneyTaskPoll | null;
  receipt: ParticipantJourneyTaskReceipt | null;
  refresh: ParticipantJourneyTaskRefresh | null;
  status: ParticipantJourneyTaskAttemptStatus;
  taskId: string;
}

export type ParticipantJourneyTaskAttemptMap = Readonly<
  Record<string, ParticipantJourneyTaskAttempt>
>;

interface ParticipantJourneyWorkflowStateData {
  activeRequests: ParticipantJourneyActiveRequests;
  commandTraceId: string | null;
  diagnostic: ParticipantJourneyFailure | null;
  epoch: number;
  feed: readonly ParticipantCampaignFeedItem[];
  journey: ParticipantJourneyProjection | null;
  journeyTasksById: Readonly<
    Record<string, ParticipantJourneyProjection["tasks"][number]>
  >;
  lastGoodJourney: ParticipantJourneyProjection | null;
  mode: ParticipantJourneyMode;
  pendingOperation: ParticipantJourneyPendingOperation | null;
  pendingTaskId: string | null;
  reconnectRequired: boolean;
  retryOperation: ParticipantJourneyReadOperation | null;
  selectedCampaignId: string | null;
  sequences: ParticipantJourneyRequestSequences;
  sessionKey: string | null;
  taskAttempts: ParticipantJourneyTaskAttemptMap;
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
      reason: "role" | "unmount";
      type: "scope_invalidated";
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
      taskId: string;
      token: ParticipantJourneyRequestToken;
      type: "verification_poll_requested";
    }
  | {
      taskId: string;
      type: "verification_poll_paused";
    }
  | {
      taskId: string;
      type: "verification_poll_resumed";
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
    journeyTasksById: {},
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
    taskAttempts: {},
  };
};

const inferTokenTaskId = (
  state: ParticipantJourneyWorkflowState,
  operation: ParticipantJourneyRequestOperation,
): string | null => {
  if (operation === "journey") {
    let candidate: string | null = null;
    for (const attempt of Object.values(state.taskAttempts)) {
      if (attempt.refresh?.status !== "required" && attempt.refresh?.status !== "failed") {
        continue;
      }
      if (candidate !== null) {
        return null;
      }
      candidate = attempt.taskId;
    }
    return candidate;
  }

  if (operation !== "verify" || !state.journey) {
    return null;
  }

  const actionable = state.journey.tasks.filter((task) =>
    task.blockedReason === null
    && (task.action === "verify" || task.action === "retry"));
  return actionable.length === 1 ? actionable[0].taskId : null;
};

export const nextParticipantJourneyRequestToken = (
  state: ParticipantJourneyWorkflowState,
  operation: ParticipantJourneyRequestOperation,
  taskId?: string | null,
): ParticipantJourneyRequestToken => ({
  campaignId: state.selectedCampaignId,
  epoch: state.epoch,
  operation,
  sequence: nextCounter(state.sequences[operation]),
  sessionKey: state.sessionKey,
  taskId: taskId === undefined ? inferTokenTaskId(state, operation) : taskId,
});

const sameRequestToken = (
  left: ParticipantJourneyRequestToken,
  right: ParticipantJourneyRequestToken,
) => left.operation === right.operation
  && left.sessionKey === right.sessionKey
  && left.campaignId === right.campaignId
  && left.taskId === right.taskId
  && left.epoch === right.epoch
  && left.sequence === right.sequence;

const requestTokenTargetsState = (
  state: ParticipantJourneyWorkflowState,
  token: ParticipantJourneyRequestToken,
  operation: ParticipantJourneyRequestOperation,
) => token.operation === operation
  && !state.reconnectRequired
  && token.sessionKey !== null
  && token.sessionKey === state.sessionKey
  && token.campaignId === state.selectedCampaignId
  && token.epoch === state.epoch;

const canStartReadToken = (
  state: ParticipantJourneyWorkflowState,
  token: ParticipantJourneyRequestToken,
  operation: ParticipantJourneyReadOperation,
) => requestTokenTargetsState(state, token, operation)
  && state.activeRequests.feed === null
  && state.activeRequests.journey === null
  && token.sequence === nextCounter(state.sequences[operation]);

const readResponseTokenMatches = (
  state: ParticipantJourneyWorkflowState,
  token: ParticipantJourneyRequestToken,
  operation: ParticipantJourneyReadOperation,
) => {
  if (!requestTokenTargetsState(state, token, operation)) {
    return false;
  }

  const activeToken = state.activeRequests[operation];
  return activeToken !== null
    && state.sequences[operation] === token.sequence
    && sameRequestToken(activeToken, token);
};

const taskResponseTokenMatches = (
  state: ParticipantJourneyWorkflowState,
  token: ParticipantJourneyRequestToken,
) => {
  if (
    !token.taskId
    || !requestTokenTargetsState(state, token, "verify")
  ) {
    return false;
  }

  const attempt = state.taskAttempts[token.taskId];
  return attempt?.activeRequest !== null
    && attempt?.activeRequest !== undefined
    && sameRequestToken(attempt.activeRequest, token);
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
  journeyTasksById: {},
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
  taskAttempts: {},
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
  journeyTasksById: {},
  lastGoodJourney: null,
  pendingOperation: null,
  pendingTaskId: null,
  retryOperation: null,
  selectedCampaignId: campaignId,
  status: "loading_journey",
  taskAttempts: {},
});

const responseIntegrityFailureCodes = new Set([
  "BRIDGE_RESPONSE_EMPTY",
  "BRIDGE_RESPONSE_INVALID",
  "BRIDGE_RESPONSE_NON_JSON",
  "BRIDGE_RESPONSE_OVERSIZE",
]);

const isResponseIntegrityFailure = (
  failure: ParticipantJourneyFailure,
) => failure.phase === "response"
  && responseIntegrityFailureCodes.has(failure.bridgeCode ?? failure.code);

const retryOperationForFailure = (
  failure: ParticipantJourneyFailure,
  operation: ParticipantJourneyRequestOperation,
): ParticipantJourneyReadOperation | null => {
  if (
    failure.reconnectRequired
    || (!failure.retryable && !isResponseIntegrityFailure(failure))
  ) {
    return null;
  }

  return operation === "feed" ? "feed" : "journey";
};

const failureRevokesAuthority = (failure: ParticipantJourneyFailure) =>
  failure.reconnectRequired
  || failure.phase === "auth"
  || failure.phase === "config"
  || failure.phase === "identity"
  || (
    failure.status === "blocked"
    && !failure.retryable
    && !isResponseIntegrityFailure(failure)
  );

const clearReadRequest = (
  activeRequests: ParticipantJourneyActiveRequests,
  operation: ParticipantJourneyRequestOperation,
): ParticipantJourneyActiveRequests => operation === "verify"
  ? activeRequests
  : { ...activeRequests, [operation]: null };

const failedRequestState = (
  state: ParticipantJourneyWorkflowState,
  failure: ParticipantJourneyFailure,
  operation: ParticipantJourneyRequestOperation,
): ParticipantJourneyWorkflowState => {
  const reconnectRequired = state.reconnectRequired || failure.reconnectRequired;
  const revokeAuthority = failureRevokesAuthority(failure);
  const retainLastGoodJourney = Boolean(
    state.lastGoodJourney
    && !reconnectRequired
    && !revokeAuthority
    && (failure.phase === "request" || failure.phase === "response")
    && (failure.status === "degraded" || isResponseIntegrityFailure(failure)),
  );
  const lastGoodJourney = retainLastGoodJourney ? state.lastGoodJourney : null;

  return {
    ...state,
    activeRequests: revokeAuthority
      ? emptyActiveRequests()
      : clearReadRequest(state.activeRequests, operation),
    diagnostic: failure,
    journey: lastGoodJourney,
    journeyTasksById: retainLastGoodJourney ? state.journeyTasksById : {},
    lastGoodJourney,
    pendingOperation: null,
    pendingTaskId: null,
    reconnectRequired,
    retryOperation: reconnectRequired
      ? null
      : retryOperationForFailure(failure, operation),
    status: lastGoodJourney ? "degraded" : "blocked",
    taskAttempts: revokeAuthority ? {} : state.taskAttempts,
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

const authorityConflictFailure = (
  state: ParticipantJourneyWorkflowState,
  traceId: string,
): ParticipantJourneyFailure => ({
  code: "PARTICIPANT_JOURNEY_AUTHORITY_CONFLICT",
  ok: false,
  phase: "response",
  reconnectRequired: false,
  retryable: true,
  source: state.mode,
  status: "degraded",
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const optionalString = (record: Record<string, unknown> | null, key: string) =>
  record && typeof record[key] === "string" ? record[key] : null;

const optionalNumber = (record: Record<string, unknown> | null, key: string) =>
  record && typeof record[key] === "number" && Number.isFinite(record[key])
    ? record[key]
    : null;

const isVerificationOutcome = (
  value: unknown,
): value is ParticipantJourneyVerificationOutcome =>
  value === "completed"
  || value === "failed"
  || value === "manual_review"
  || value === "pending";

const projectionIdentityMatches = (
  projection: Record<string, unknown> | null,
  campaignId: string,
  taskId: string,
) => projection === null || (
  projection.campaignId === campaignId
  && projection.taskId === taskId
);

const safeDiagnosticCodes = (value: unknown): readonly string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (typeof item === "string") {
      return [item];
    }
    return isRecord(item) && typeof item.code === "string" ? [item.code] : [];
  });
};

const verificationReceipt = (
  result: ParticipantVerifySuccess,
  campaignId: string,
  taskId: string,
): ParticipantJourneyTaskReceipt | null => {
  const resultRecord = isRecord(result) ? result : null;
  const verification = isRecord(result.verification)
    ? result.verification as unknown as Record<string, unknown>
    : null;
  if (!verification || !resultRecord) {
    return null;
  }

  const attempt = isRecord(verification.attempt) ? verification.attempt : null;
  const completion = isRecord(verification.completion) ? verification.completion : null;
  const evidence = isRecord(verification.evidence) ? verification.evidence : null;
  const participant = isRecord(verification.participant) ? verification.participant : null;
  const explicitOutcome = verification.outcome ?? resultRecord.outcome;
  const attemptOutcome = attempt?.status;
  const completionOutcome = completion?.status;
  const outcome = isVerificationOutcome(explicitOutcome)
    ? explicitOutcome
    : isVerificationOutcome(attemptOutcome)
      ? attemptOutcome
      : isVerificationOutcome(completionOutcome)
        ? completionOutcome
        : null;

  if (
    !outcome
    || (isVerificationOutcome(attemptOutcome) && attemptOutcome !== outcome)
    || (isVerificationOutcome(completionOutcome) && completionOutcome !== outcome)
    || !projectionIdentityMatches(completion, campaignId, taskId)
    || !projectionIdentityMatches(evidence, campaignId, taskId)
    || (participant !== null && participant.campaignId !== campaignId)
  ) {
    return null;
  }

  if (completion && evidence && (
    completion.evidenceId !== evidence.id
    || evidence.completionId !== completion.id
  )) {
    return null;
  }

  if (outcome === "completed" && (!completion || !evidence)) {
    return null;
  }
  if (outcome !== "completed" && evidence) {
    return null;
  }

  const pointsAwarded = optionalNumber(completion, "pointsAwarded") ?? 0;
  if (pointsAwarded < 0 || (outcome !== "completed" && pointsAwarded !== 0)) {
    return null;
  }

  const attemptId = optionalString(attempt, "id")
    ?? optionalString(completion, "id");
  if (!attemptId) {
    return null;
  }

  const retryAfterMs = optionalNumber(attempt, "retryAfterMs");
  if (retryAfterMs !== null && retryAfterMs < 0) {
    return null;
  }

  return {
    attemptId,
    authorityLinkageRequired: attempt !== null,
    completionId: optionalString(completion, "id"),
    diagnosticCodes: safeDiagnosticCodes(verification.diagnostics),
    evidenceId: optionalString(evidence, "id"),
    httpStatus: result.httpStatus,
    outcome,
    pointsAwarded,
    providerFamily: optionalString(attempt, "providerFamily"),
    retryAfterMs,
    retryable: typeof attempt?.retryable === "boolean"
      ? attempt.retryable
      : outcome === "pending",
    traceId: result.traceId,
  };
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
  journeyTasksById: {},
  lastGoodJourney: null,
  pendingOperation: null,
  pendingTaskId: null,
  retryOperation: null,
  selectedCampaignId: null,
  status: "feed_ready",
  taskAttempts: {},
});

export const selectParticipantJourneyTaskAttempt = (
  state: ParticipantJourneyWorkflowState,
  taskId: string,
): ParticipantJourneyTaskAttempt | null => state.taskAttempts[taskId] ?? null;

export const selectParticipantJourneyTaskPoll = (
  state: ParticipantJourneyWorkflowState,
  taskId: string,
): ParticipantJourneyTaskPoll | null => state.taskAttempts[taskId]?.poll ?? null;

export const selectParticipantJourneyTaskRefresh = (
  state: ParticipantJourneyWorkflowState,
  taskId: string,
): ParticipantJourneyTaskRefresh | null => state.taskAttempts[taskId]?.refresh ?? null;

const journeyTaskAction = (
  state: ParticipantJourneyWorkflowState,
  taskId: string,
): ParticipantJourneyTaskAction => {
  const task = state.journeyTasksById[taskId];
  if (!task || task.campaignId !== state.selectedCampaignId || task.blockedReason !== null) {
    return "none";
  }
  if (task.action === "verify") {
    return "verify";
  }
  if (task.action === "retry") {
    return "retry";
  }
  if (task.action === "await_review") {
    return "await_review";
  }
  return "none";
};

export const selectParticipantJourneyTaskAction = (
  state: ParticipantJourneyWorkflowState,
  taskId: string,
): ParticipantJourneyTaskAction => {
  if (!state.sessionKey || state.reconnectRequired) {
    return "none";
  }

  const attempt = state.taskAttempts[taskId];
  if (!attempt) {
    return journeyTaskAction(state, taskId);
  }
  if (attempt.activeRequest || attempt.status === "verifying" || attempt.status === "completed") {
    return "none";
  }
  if (attempt.status === "manual_review") {
    return "await_review";
  }
  if (attempt.status === "pending") {
    return attempt.receipt?.retryable
      && (attempt.poll?.phase === "paused" || attempt.poll?.phase === "exhausted")
      ? "retry"
      : "none";
  }
  if (attempt.status === "failed" || attempt.status === "unavailable") {
    return (attempt.receipt?.retryable ?? attempt.diagnostic?.retryable ?? false)
      ? "retry"
      : "none";
  }
  return "none";
};

export const canPollParticipantJourneyTask = (
  state: ParticipantJourneyWorkflowState,
  taskId: string,
) => {
  const attempt = state.taskAttempts[taskId];
  return Boolean(
    state.sessionKey
    && state.selectedCampaignId
    && !state.reconnectRequired
    && attempt
    && !attempt.activeRequest
    && attempt.status === "pending"
    && attempt.poll?.phase === "scheduled"
    && attempt.poll.attemptCount < attempt.poll.maxAttempts,
  );
};

export const canSelectParticipantCampaign = (
  state: ParticipantJourneyWorkflowState,
  campaignId: string,
) => {
  const canSupersedeInitialJourney = state.status === "loading_journey"
    && state.lastGoodJourney === null
    && state.activeRequests.feed === null;
  const canNavigateFromJourney = state.activeRequests.feed === null
    && state.journey !== null
    && ["ready", "verifying", "degraded"].includes(state.status);
  const idleFeed = state.activeRequests.feed === null
    && state.activeRequests.journey === null
    && state.pendingOperation === null
    && state.status === "feed_ready";

  return Boolean(state.sessionKey)
    && !state.reconnectRequired
    && state.selectedCampaignId !== campaignId
    && state.feed.some((campaign) => campaign.campaignId === campaignId)
    && (idleFeed || canNavigateFromJourney || canSupersedeInitialJourney);
};

export const canVerifyParticipantJourneyTask = (
  state: ParticipantJourneyWorkflowState,
  taskId: string,
) => {
  const task = state.journeyTasksById[taskId];
  const action = selectParticipantJourneyTaskAction(state, taskId);
  return Boolean(
    state.sessionKey
    && state.selectedCampaignId
    && !state.reconnectRequired
    && task?.campaignId === state.selectedCampaignId
    && (action === "verify" || action === "retry"),
  );
};

const hasActiveReadRequest = (state: ParticipantJourneyWorkflowState) =>
  state.activeRequests.feed !== null || state.activeRequests.journey !== null;

export const selectParticipantJourneyRetryOperation = (
  state: ParticipantJourneyWorkflowState,
): ParticipantJourneyReadOperation | null => {
  if (
    !state.sessionKey
    || state.reconnectRequired
    || !["degraded", "blocked"].includes(state.status)
    || hasActiveReadRequest(state)
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
) => state.reconnectRequired && !hasActiveReadRequest(state);

const canStartFeed = (
  state: ParticipantJourneyWorkflowState,
  token: ParticipantJourneyRequestToken,
) => canStartReadToken(state, token, "feed")
  && ["feed_ready", "ready", "verifying", "degraded", "blocked"].includes(state.status);

const refreshAttemptForToken = (
  state: ParticipantJourneyWorkflowState,
  token: ParticipantJourneyRequestToken,
) => token.taskId ? state.taskAttempts[token.taskId] ?? null : null;

const canStartJourney = (
  state: ParticipantJourneyWorkflowState,
  token: ParticipantJourneyRequestToken,
  reason: ParticipantJourneyRequestReason,
) => {
  if (
    !state.selectedCampaignId
    || !canStartReadToken(state, token, "journey")
  ) {
    return false;
  }

  if (reason === "selection") {
    return token.taskId === null
      && state.status === "loading_journey"
      && state.lastGoodJourney === null;
  }

  const refreshAttempt = refreshAttemptForToken(state, token);
  if (reason === "refresh") {
    return Boolean(
      refreshAttempt
      && refreshAttempt.refresh?.status === "required"
      && refreshAttempt.receipt?.outcome !== "pending",
    );
  }

  if (
    refreshAttempt?.refresh?.status === "failed"
    && selectParticipantJourneyRetryOperation(state) === "journey"
  ) {
    return true;
  }

  return (state.status === "degraded" || state.status === "blocked")
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
  retryOperation: null,
  sequences: { ...state.sequences, feed: token.sequence },
  status: "loading_feed",
});

const updateTaskAttempt = (
  attempts: ParticipantJourneyTaskAttemptMap,
  attempt: ParticipantJourneyTaskAttempt,
): ParticipantJourneyTaskAttemptMap => ({
  ...attempts,
  [attempt.taskId]: attempt,
});

const removeTaskAttempt = (
  attempts: ParticipantJourneyTaskAttemptMap,
  taskId: string,
): ParticipantJourneyTaskAttemptMap => {
  if (!(taskId in attempts)) {
    return attempts;
  }
  const { [taskId]: _removed, ...remaining } = attempts;
  return remaining;
};

const startJourney = (
  state: ParticipantJourneyWorkflowState,
  token: ParticipantJourneyRequestToken,
  reason: ParticipantJourneyRequestReason,
): ParticipantJourneyWorkflowState => {
  const refreshAttempt = refreshAttemptForToken(state, token);
  const taskAttempts = refreshAttempt?.refresh
    ? updateTaskAttempt(state.taskAttempts, {
        ...refreshAttempt,
        refresh: {
          requestCount: nextCounter(refreshAttempt.refresh.requestCount),
          status: "in_flight",
        },
      })
    : state.taskAttempts;
  const refreshPending = refreshAttempt !== null;
  const automaticRefresh = refreshPending && reason === "refresh";

  return {
    ...state,
    activeRequests: { ...state.activeRequests, journey: token },
    diagnostic: null,
    pendingOperation: automaticRefresh ? "refresh_journey" : "journey",
    pendingTaskId: refreshPending ? token.taskId : null,
    retryOperation: null,
    sequences: { ...state.sequences, journey: token.sequence },
    status: automaticRefresh ? "verifying" : "loading_journey",
    taskAttempts,
  };
};

const startVerify = (
  state: ParticipantJourneyWorkflowState,
  token: ParticipantJourneyRequestToken,
  taskId: string,
): ParticipantJourneyWorkflowState => {
  const previous = state.taskAttempts[taskId];
  const attempt: ParticipantJourneyTaskAttempt = {
    activeRequest: token,
    diagnostic: null,
    poll: null,
    receipt: previous?.receipt ?? null,
    refresh: null,
    status: "verifying",
    taskId,
  };

  return {
    ...state,
    activeRequests: { ...state.activeRequests, verify: token },
    commandTraceId: null,
    pendingOperation: "verify",
    pendingTaskId: taskId,
    sequences: { ...state.sequences, verify: token.sequence },
    status: "verifying",
    taskAttempts: updateTaskAttempt(state.taskAttempts, attempt),
  };
};

const canStartVerify = (
  state: ParticipantJourneyWorkflowState,
  token: ParticipantJourneyRequestToken,
  taskId: string,
) => token.taskId === taskId
  && requestTokenTargetsState(state, token, "verify")
  && token.sequence === nextCounter(state.sequences.verify)
  && state.taskAttempts[taskId]?.activeRequest == null
  && canVerifyParticipantJourneyTask(state, taskId);

const clearLegacyVerify = (
  state: ParticipantJourneyWorkflowState,
  token: ParticipantJourneyRequestToken,
) => {
  const matches = state.activeRequests.verify !== null
    && sameRequestToken(state.activeRequests.verify, token);
  return {
    activeRequests: matches
      ? { ...state.activeRequests, verify: null }
      : state.activeRequests,
    pendingOperation: matches && state.pendingOperation === "verify"
      ? null
      : state.pendingOperation,
    pendingTaskId: matches && state.pendingTaskId === token.taskId
      ? null
      : state.pendingTaskId,
  };
};

const hasActiveTaskRequest = (attempts: ParticipantJourneyTaskAttemptMap) =>
  Object.values(attempts).some((attempt) => attempt.activeRequest !== null);

const firstRequiredRefreshTaskId = (
  attempts: ParticipantJourneyTaskAttemptMap,
): string | null => Object.values(attempts).find((attempt) =>
  attempt.refresh?.status === "required")?.taskId ?? null;

export const selectParticipantJourneyRefreshTaskId = (
  state: ParticipantJourneyWorkflowState,
): string | null => firstRequiredRefreshTaskId(state.taskAttempts);

const taskAwareReadyStatus = (
  attempts: ParticipantJourneyTaskAttemptMap,
): ParticipantJourneyWorkflowStatus => hasActiveTaskRequest(attempts)
  || firstRequiredRefreshTaskId(attempts) !== null
  ? "verifying"
  : "ready";

const clampPollDelay = (retryAfterMs: number | null, priorDelayMs?: number) => {
  const requested = retryAfterMs
    ?? (priorDelayMs === undefined
      ? PARTICIPANT_JOURNEY_POLL_MIN_DELAY_MS
      : priorDelayMs * 2);
  return Math.min(
    PARTICIPANT_JOURNEY_POLL_MAX_DELAY_MS,
    Math.max(PARTICIPANT_JOURNEY_POLL_MIN_DELAY_MS, Math.round(requested)),
  );
};

const pollOwnerId = (
  token: ParticipantJourneyRequestToken,
  receipt: ParticipantJourneyTaskReceipt,
) => [
  token.epoch,
  token.campaignId,
  token.taskId,
  receipt.attemptId,
].map((part) => encodeURIComponent(String(part))).join(":");

const applyVerificationReceipt = (
  state: ParticipantJourneyWorkflowState,
  token: ParticipantJourneyRequestToken,
  receipt: ParticipantJourneyTaskReceipt,
): ParticipantJourneyWorkflowState => {
  const taskId = token.taskId as string;
  const current = state.taskAttempts[taskId];
  const legacy = clearLegacyVerify(state, token);

  if (receipt.outcome === "pending") {
    const previousPoll = current.poll;
    const attemptCount = previousPoll?.attemptCount ?? 0;
    const exhausted = attemptCount >= PARTICIPANT_JOURNEY_POLL_MAX_ATTEMPTS;
    const poll: ParticipantJourneyTaskPoll = {
      attemptCount,
      attemptId: receipt.attemptId,
      delayMs: clampPollDelay(receipt.retryAfterMs, previousPoll?.delayMs),
      maxAttempts: PARTICIPANT_JOURNEY_POLL_MAX_ATTEMPTS,
      ownerId: previousPoll?.attemptId === receipt.attemptId
        ? previousPoll.ownerId
        : pollOwnerId(token, receipt),
      phase: exhausted ? "exhausted" : "scheduled",
    };
    const taskAttempts = updateTaskAttempt(state.taskAttempts, {
      ...current,
      activeRequest: null,
      diagnostic: null,
      poll,
      receipt,
      refresh: null,
      status: exhausted ? "unavailable" : "pending",
      taskId,
    });

    return {
      ...state,
      ...legacy,
      commandTraceId: receipt.traceId,
      diagnostic: null,
      retryOperation: null,
      status: taskAwareReadyStatus(taskAttempts),
      taskAttempts,
    };
  }

  const taskAttempts = updateTaskAttempt(state.taskAttempts, {
    ...current,
    activeRequest: null,
    diagnostic: null,
    poll: null,
    receipt,
    refresh: { requestCount: 0, status: "required" },
    status: "verifying",
    taskId,
  });

  return {
    ...state,
    ...legacy,
    commandTraceId: receipt.traceId,
    diagnostic: null,
    pendingOperation: legacy.pendingOperation ?? "refresh_journey",
    pendingTaskId: legacy.pendingTaskId ?? taskId,
    retryOperation: null,
    status: "verifying",
    taskAttempts,
  };
};

const authorityMatchesReceipt = (
  task: ParticipantJourneyProjection["tasks"][number] | undefined,
  receipt: ParticipantJourneyTaskReceipt,
) => {
  if (!task || task.status !== receipt.outcome) {
    return false;
  }
  if (receipt.outcome !== "completed") {
    return task.pointsAwarded === 0
      && task.evidenceId === null
      && (receipt.completionId === null || task.completionId === receipt.completionId);
  }
  if (task.pointsAwarded < 0 || !task.completionId || !task.evidenceId) {
    return false;
  }
  if (!receipt.authorityLinkageRequired) {
    return true;
  }
  return task.completionId === receipt.completionId
    && task.evidenceId === receipt.evidenceId
    && task.pointsAwarded === receipt.pointsAwarded;
};

const terminalAttemptStatus = (
  status: ParticipantJourneyProjection["tasks"][number]["status"],
): ParticipantJourneyTaskAttemptStatus | null => {
  if (status === "completed" || status === "failed" || status === "manual_review") {
    return status;
  }
  return null;
};

const conflictingTerminalReceiptTaskId = (
  state: ParticipantJourneyWorkflowState,
  projection: ParticipantJourneyProjection,
): string | null => {
  const tasksById = new Map(projection.tasks.map((task) => [task.taskId, task]));

  for (const [taskId, attempt] of Object.entries(state.taskAttempts)) {
    const receipt = attempt.receipt;
    if (!receipt || receipt.outcome === "pending" || !attempt.refresh) {
      continue;
    }

    const task = tasksById.get(taskId);
    if (!task) {
      continue;
    }
    if (!authorityMatchesReceipt(task, receipt)) {
      return taskId;
    }
  }

  return null;
};

const reconcileTaskAttempts = (
  attempts: ParticipantJourneyTaskAttemptMap,
  projection: ParticipantJourneyProjection,
): ParticipantJourneyTaskAttemptMap => {
  const tasksById = new Map(projection.tasks.map((task) => [task.taskId, task]));
  const reconciled: Record<string, ParticipantJourneyTaskAttempt> = {};

  for (const [taskId, attempt] of Object.entries(attempts)) {
    const task = tasksById.get(taskId);
    if (!task) {
      continue;
    }

    const terminalStatus = terminalAttemptStatus(task.status);
    if (terminalStatus) {
      reconciled[taskId] = {
        ...attempt,
        activeRequest: null,
        diagnostic: null,
        poll: null,
        refresh: null,
        status: terminalStatus,
      };
      continue;
    }

    if (task.status === "pending" && attempt.receipt?.outcome === "pending") {
      reconciled[taskId] = { ...attempt, status: "pending" };
      continue;
    }

    reconciled[taskId] = attempt;
  }

  return reconciled;
};

const legacyVerifyForAttempts = (
  activeToken: ParticipantJourneyRequestToken | null,
  attempts: ParticipantJourneyTaskAttemptMap,
) => activeToken?.taskId && attempts[activeToken.taskId]?.activeRequest
  && sameRequestToken(attempts[activeToken.taskId].activeRequest as ParticipantJourneyRequestToken, activeToken)
  ? activeToken
  : null;

const authorityConflictState = (
  state: ParticipantJourneyWorkflowState,
  taskId: string,
  traceId: string,
): ParticipantJourneyWorkflowState => {
  const taskAttempts = Object.fromEntries(
    Object.entries(state.taskAttempts).map(([ownedTaskId, attempt]) => {
      const refresh = attempt.refresh
        && (attempt.refresh.status === "in_flight" || attempt.refresh.status === "required")
        ? { ...attempt.refresh, status: "failed" as const }
        : attempt.refresh;
      if (ownedTaskId !== taskId) {
        return [ownedTaskId, { ...attempt, refresh }];
      }
      return [ownedTaskId, {
        ...attempt,
        activeRequest: null,
        poll: null,
        refresh: refresh ?? { requestCount: 1, status: "failed" as const },
        status: "unavailable" as const,
      }];
    }),
  );

  return {
    ...state,
    activeRequests: { ...state.activeRequests, journey: null },
    diagnostic: authorityConflictFailure(state, traceId),
    journey: state.lastGoodJourney,
    pendingOperation: null,
    pendingTaskId: null,
    retryOperation: "journey",
    status: "degraded",
    taskAttempts,
  };
};

const pausePoll = (
  state: ParticipantJourneyWorkflowState,
  taskId: string,
): ParticipantJourneyWorkflowState => {
  const attempt = state.taskAttempts[taskId];
  if (
    !attempt?.poll
    || attempt.poll.phase === "exhausted"
    || attempt.status !== "pending"
  ) {
    return state;
  }

  const token = attempt.activeRequest;
  const legacy = token ? clearLegacyVerify(state, token) : {
    activeRequests: state.activeRequests,
    pendingOperation: state.pendingOperation,
    pendingTaskId: state.pendingTaskId,
  };
  const exhausted = attempt.poll.attemptCount >= attempt.poll.maxAttempts;
  const taskAttempts = updateTaskAttempt(state.taskAttempts, {
    ...attempt,
    activeRequest: null,
    poll: { ...attempt.poll, phase: exhausted ? "exhausted" : "paused" },
    status: exhausted ? "unavailable" : attempt.status,
  });

  return {
    ...state,
    ...legacy,
    status: taskAwareReadyStatus(taskAttempts),
    taskAttempts,
  };
};

const resumePoll = (
  state: ParticipantJourneyWorkflowState,
  taskId: string,
): ParticipantJourneyWorkflowState => {
  const attempt = state.taskAttempts[taskId];
  if (attempt?.poll?.phase !== "paused" || attempt.status !== "pending") {
    return state;
  }
  return {
    ...state,
    taskAttempts: updateTaskAttempt(state.taskAttempts, {
      ...attempt,
      poll: { ...attempt.poll, phase: "scheduled" },
    }),
  };
};

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

  if (event.type === "scope_invalidated") {
    return contextState(state, state.mode, null);
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
    return canStartVerify(state, event.token, event.taskId)
      ? startVerify(state, event.token, event.taskId)
      : state;
  }

  if (event.type === "verification_poll_requested") {
    const attempt = state.taskAttempts[event.taskId];
    if (
      event.token.taskId !== event.taskId
      || !canPollParticipantJourneyTask(state, event.taskId)
      || !requestTokenTargetsState(state, event.token, "verify")
      || event.token.sequence !== nextCounter(state.sequences.verify)
      || !attempt?.poll
    ) {
      return state;
    }

    return {
      ...state,
      activeRequests: { ...state.activeRequests, verify: event.token },
      pendingOperation: "verify",
      pendingTaskId: event.taskId,
      sequences: { ...state.sequences, verify: event.token.sequence },
      status: "verifying",
      taskAttempts: updateTaskAttempt(state.taskAttempts, {
        ...attempt,
        activeRequest: event.token,
        poll: {
          ...attempt.poll,
          attemptCount: nextCounter(attempt.poll.attemptCount),
          phase: "in_flight",
        },
      }),
    };
  }

  if (event.type === "verification_poll_paused") {
    return pausePoll(state, event.taskId);
  }

  if (event.type === "verification_poll_resumed") {
    return resumePoll(state, event.taskId);
  }

  if (event.type === "feed_succeeded") {
    if (!readResponseTokenMatches(state, event.token, "feed")) {
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
      activeRequests: { ...state.activeRequests, feed: null },
      diagnostic: null,
      feed,
      pendingOperation: state.pendingOperation === "feed" ? null : state.pendingOperation,
      pendingTaskId: state.pendingOperation === "feed" ? null : state.pendingTaskId,
      retryOperation: null,
      status: state.journey
        ? taskAwareReadyStatus(state.taskAttempts)
        : state.selectedCampaignId
          ? "loading_journey"
          : "feed_ready",
    };
  }

  if (event.type === "feed_failed") {
    return readResponseTokenMatches(state, event.token, "feed")
      ? failedRequestState(state, event.failure, "feed")
      : state;
  }

  if (event.type === "journey_succeeded") {
    if (!readResponseTokenMatches(state, event.token, "journey")) {
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

    const conflictTaskId = conflictingTerminalReceiptTaskId(
      state,
      event.result.journey,
    );
    if (conflictTaskId) {
      return authorityConflictState(state, conflictTaskId, event.result.traceId);
    }

    const taskAttempts = reconcileTaskAttempts(state.taskAttempts, event.result.journey);
    const legacyVerify = legacyVerifyForAttempts(
      state.activeRequests.verify,
      taskAttempts,
    );
    const refreshTaskId = firstRequiredRefreshTaskId(taskAttempts);
    const journeyTasksById = Object.fromEntries(
      event.result.journey.tasks.map((task) => [task.taskId, task]),
    );

    return {
      ...state,
      activeRequests: {
        ...state.activeRequests,
        journey: null,
        verify: legacyVerify,
      },
      diagnostic: null,
      journey: event.result.journey,
      journeyTasksById,
      lastGoodJourney: event.result.journey,
      pendingOperation: legacyVerify
        ? "verify"
        : refreshTaskId
          ? "refresh_journey"
          : null,
      pendingTaskId: legacyVerify?.taskId ?? refreshTaskId,
      retryOperation: null,
      status: taskAwareReadyStatus(taskAttempts),
      taskAttempts,
    };
  }

  if (event.type === "journey_failed") {
    if (!readResponseTokenMatches(state, event.token, "journey")) {
      return state;
    }

    const taskId = event.token.taskId;
    const attempt = taskId ? state.taskAttempts[taskId] : null;
    const taskAttempts = attempt?.refresh?.status === "in_flight"
      ? updateTaskAttempt(state.taskAttempts, {
          ...attempt,
          activeRequest: null,
          poll: null,
          refresh: {
            requestCount: attempt.refresh.requestCount,
            status: "failed",
          },
          status: "unavailable",
        })
      : state.taskAttempts;
    return failedRequestState(
      { ...state, taskAttempts },
      event.failure,
      "journey",
    );
  }

  if (event.type === "verify_succeeded") {
    if (!taskResponseTokenMatches(state, event.token)) {
      return state;
    }

    const taskId = event.token.taskId as string;
    const receipt = state.selectedCampaignId && event.result.source === state.mode
      ? verificationReceipt(event.result, state.selectedCampaignId, taskId)
      : null;
    if (!receipt) {
      return failedRequestState(
        state,
        identityFailure(state, event.result.traceId),
        "verify",
      );
    }
    return applyVerificationReceipt(state, event.token, receipt);
  }

  if (event.type === "verify_failed") {
    if (!taskResponseTokenMatches(state, event.token)) {
      return state;
    }

    const taskId = event.token.taskId as string;
    const current = state.taskAttempts[taskId];
    const legacy = clearLegacyVerify(state, event.token);
    if (
      event.failure.bridgeCode === "BRIDGE_REQUEST_ABORTED"
      || event.failure.code === "BRIDGE_REQUEST_ABORTED"
    ) {
      const taskAttempts = current.receipt?.outcome === "pending" && current.poll
        ? updateTaskAttempt(state.taskAttempts, {
            ...current,
            activeRequest: null,
            poll: { ...current.poll, phase: "paused" },
            status: "pending",
          })
        : removeTaskAttempt(state.taskAttempts, taskId);
      return {
        ...state,
        ...legacy,
        diagnostic: null,
        status: taskAwareReadyStatus(taskAttempts),
        taskAttempts,
      };
    }

    if (failureRevokesAuthority(event.failure)) {
      return failedRequestState(state, event.failure, "verify");
    }

    const taskAttempts = updateTaskAttempt(state.taskAttempts, {
      ...current,
      activeRequest: null,
      diagnostic: event.failure,
      poll: null,
      refresh: null,
      status: "unavailable",
    });
    return {
      ...state,
      ...legacy,
      journey: state.journey ?? state.lastGoodJourney,
      status: state.diagnostic && state.retryOperation
        ? "degraded"
        : taskAwareReadyStatus(taskAttempts),
      taskAttempts,
    };
  }

  return state;
};

export const PARTICIPANT_AUTHENTICATION_MAX_CONFLICT_RECOVERY_STEPS = 2;

export type ParticipantAuthenticationWorkflowStatus =
  | "disconnected"
  | "connecting"
  | "challengeReady"
  | "signing"
  | "authenticating"
  | "restoring"
  | "rotating"
  | "loggingOut"
  | "ready"
  | "expired"
  | "revoked"
  | "unavailable"
  | "failed"
  | "rateLimited";

export type ParticipantAuthenticationOperation =
  | "connect"
  | "challenge"
  | "sign"
  | "authenticate"
  | "restore"
  | "rotate"
  | "logout";

export type ParticipantAuthenticationAction =
  | "connect"
  | "sign"
  | "restore"
  | "retry"
  | "none";

export type ParticipantAuthenticationWalletContextChange =
  | "account_changed"
  | "chain_changed"
  | "network_changed"
  | "provider_disconnected";

export interface ParticipantAuthenticationFailure {
  readonly code: string;
  readonly httpStatus: number | null;
  readonly retryAfterMs: number | null;
  readonly traceId: string | null;
}

export type ParticipantAuthenticationWalletConnection = RequestedWalletConnectionHint;

export interface ParticipantAuthenticationChallengeReference {
  readonly challengeId: string;
  readonly expiresAt: string;
}

export type ParticipantAuthenticationPrivateSession = ParticipantJourneyDurableSession;

export interface ParticipantAuthenticationPublicCampaignState {
  readonly lastGood: ParticipantCampaignFeedItem | null;
}

export interface ParticipantAuthenticationPrivateState {
  readonly challenge: ParticipantAuthenticationChallengeReference | null;
  readonly session: ParticipantAuthenticationPrivateSession | null;
  readonly wallet: ParticipantAuthenticationWalletConnection | null;
}

export interface ParticipantAuthenticationWorkflowState {
  readonly conflictRecoveryStep: number;
  readonly failure: ParticipantAuthenticationFailure | null;
  readonly pendingOperation: ParticipantAuthenticationOperation | null;
  readonly privateParticipant: ParticipantAuthenticationPrivateState;
  readonly publicCampaign: ParticipantAuthenticationPublicCampaignState;
  readonly retryOperation: ParticipantAuthenticationOperation | null;
  readonly sessionEpoch: number;
  readonly status: ParticipantAuthenticationWorkflowStatus;
  readonly walletEpoch: number;
}

export interface CreateParticipantAuthenticationWorkflowStateOptions {
  readonly publicCampaignLastGood?: ParticipantCampaignFeedItem | null;
}

interface ParticipantAuthenticationCompletionEpochs {
  readonly sessionEpoch: number;
  readonly walletEpoch: number;
}

export type ParticipantAuthenticationRestoreOutcome =
  | "ready"
  | "disconnected"
  | "expired"
  | "revoked"
  | "unavailable"
  | "failed"
  | "rateLimited";

export type ParticipantAuthenticationWorkflowEvent =
  | Readonly<{ type: "connect_requested" }>
  | Readonly<{ type: "restore_requested" }>
  | Readonly<{ type: "sign_requested" }>
  | Readonly<{ type: "rotation_requested" }>
  | Readonly<{ type: "logout_requested" }>
  | Readonly<{ type: "retry_requested" }>
  | Readonly<{
      campaign: ParticipantCampaignFeedItem | null;
      type: "public_campaign_last_good_changed";
    }>
  | Readonly<{
      reason: ParticipantAuthenticationWalletContextChange;
      type: "wallet_context_changed";
    }>
  | Readonly<{
      reason: "role_changed" | "unmount";
      type: "scope_invalidated";
    }>
  | (ParticipantAuthenticationCompletionEpochs & Readonly<{
      type: "wallet_connected";
      wallet: ParticipantAuthenticationWalletConnection;
    }>)
  | (ParticipantAuthenticationCompletionEpochs & Readonly<{
      challenge: ParticipantAuthenticationChallengeReference;
      type: "challenge_succeeded";
    }>)
  | (ParticipantAuthenticationCompletionEpochs & Readonly<{
      type: "sign_succeeded";
    }>)
  | (ParticipantAuthenticationCompletionEpochs & Readonly<{
      participant: ParticipantAuthenticationPrivateSession;
      type: "authenticate_succeeded";
    }>)
  | (ParticipantAuthenticationCompletionEpochs & Readonly<{
      failure?: ParticipantAuthenticationFailure | null;
      outcome: ParticipantAuthenticationRestoreOutcome;
      participant?: ParticipantAuthenticationPrivateSession;
      type: "restore_completed";
    }>)
  | (ParticipantAuthenticationCompletionEpochs & Readonly<{
      participant: ParticipantAuthenticationPrivateSession;
      type: "rotation_succeeded";
    }>)
  | (ParticipantAuthenticationCompletionEpochs & Readonly<{
      failure: ParticipantAuthenticationFailure | null;
      ok: boolean;
      type: "logout_completed";
    }>)
  | (ParticipantAuthenticationCompletionEpochs & Readonly<{
      failure: ParticipantAuthenticationFailure;
      operation: ParticipantAuthenticationOperation;
      type: "operation_failed";
    }>)
  | (ParticipantAuthenticationCompletionEpochs & Readonly<{
      failure: ParticipantAuthenticationFailure;
      type: "private_request_failed";
    }>);

type ParticipantAuthenticationEffectEpochs = Readonly<{
  sessionEpoch: number;
  walletEpoch: number;
}>;

type ParticipantAuthenticationChallengeCommand =
  ParticipantAuthenticationEffectEpochs
  & ParticipantAuthenticationWalletConnection
  & Readonly<{ type: "request_challenge" }>;

/** The effect owner maps these serializable epochs to controllers and subscriptions. */
export type ParticipantAuthenticationEffectCommand =
  | (ParticipantAuthenticationEffectEpochs & Readonly<{
      type: "connect_wallet";
    }>)
  | ParticipantAuthenticationChallengeCommand
  | (ParticipantAuthenticationEffectEpochs & Readonly<{
      challengeId: string;
      type: "sign_challenge";
    }>)
  | (ParticipantAuthenticationEffectEpochs & Readonly<{
      challengeId: string;
      type: "authenticate_session";
    }>)
  | (ParticipantAuthenticationEffectEpochs & Readonly<{
      type: "restore_session";
    }>)
  | (ParticipantAuthenticationEffectEpochs & Readonly<{
      type: "rotate_session";
    }>)
  | (ParticipantAuthenticationEffectEpochs & Readonly<{
      type: "logout_session";
    }>);

export interface ParticipantAuthenticationWorkflowReduction {
  readonly commands: readonly ParticipantAuthenticationEffectCommand[];
  readonly state: ParticipantAuthenticationWorkflowState;
  readonly writeCount: 0 | 1;
}

const emptyParticipantAuthenticationPrivateState = (
): ParticipantAuthenticationPrivateState => ({
  challenge: null,
  session: null,
  wallet: null,
});

const authenticationNoop = (
  state: ParticipantAuthenticationWorkflowState,
): ParticipantAuthenticationWorkflowReduction => ({
  commands: [],
  state,
  writeCount: 0,
});

const authenticationWrite = (
  state: ParticipantAuthenticationWorkflowState,
  commands: readonly ParticipantAuthenticationEffectCommand[] = [],
): ParticipantAuthenticationWorkflowReduction => ({
  commands,
  state,
  writeCount: 1,
});

const safeAuthenticationText = (
  value: unknown,
  maximumLength = 256,
): value is string => typeof value === "string"
  && value.length > 0
  && value.length <= maximumLength
  && !/[\u0000-\u001f\u007f-\u009f]/u.test(value);

const safeAuthenticationIdentifier = (
  value: unknown,
  maximumLength: number,
): value is string => safeAuthenticationText(value, maximumLength)
  && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value);

const copyAuthenticationStringArray = (
  value: unknown,
): readonly string[] | null => {
  if (
    !Array.isArray(value)
    || value.length === 0
    || value.length > 64
    || value.some((item) => !safeAuthenticationIdentifier(item, 128))
    || new Set(value).size !== value.length
  ) {
    return null;
  }
  return [...value];
};

const copyAuthenticationWallet = (
  wallet: ParticipantAuthenticationWalletConnection,
): ParticipantAuthenticationWalletConnection | null => {
  if (
    !safeAuthenticationIdentifier(wallet.adapterId, 128)
    || !safeAuthenticationText(wallet.chainId, 32)
    || (wallet.network !== "mainnet" && wallet.network !== "testnet")
    || !safeAuthenticationText(wallet.walletAddressHint, 256)
    || (
      wallet.caHashHint !== undefined
      && !safeAuthenticationText(wallet.caHashHint, 256)
    )
  ) {
    return null;
  }
  return {
    adapterId: wallet.adapterId,
    ...(wallet.caHashHint === undefined ? {} : { caHashHint: wallet.caHashHint }),
    chainId: wallet.chainId,
    network: wallet.network,
    walletAddressHint: wallet.walletAddressHint,
  };
};

const copyAuthenticationChallenge = (
  challenge: ParticipantAuthenticationChallengeReference,
): ParticipantAuthenticationChallengeReference | null => {
  if (
    !safeAuthenticationIdentifier(challenge.challengeId, 160)
    || !safeAuthenticationText(challenge.expiresAt, 64)
    || !Number.isFinite(Date.parse(challenge.expiresAt))
  ) {
    return null;
  }
  return {
    challengeId: challenge.challengeId,
    expiresAt: challenge.expiresAt,
  };
};

const copyAuthenticationSession = (
  session: ParticipantAuthenticationPrivateSession,
): ParticipantAuthenticationPrivateSession | null => {
  const capabilities = copyAuthenticationStringArray(session.capabilities);
  const roles = copyAuthenticationStringArray(session.roles);
  if (
    (session.accountType !== "AA" && session.accountType !== "EOA")
    || !capabilities
    || !safeAuthenticationText(session.chainId, 32)
    || !safeAuthenticationIdentifier(session.sessionId, 160)
    || (session.network !== "mainnet" && session.network !== "testnet")
    || !roles
    || session.status !== "active"
    || !safeAuthenticationText(session.walletAddress, 256)
    || !safeAuthenticationIdentifier(session.walletSource, 80)
    || !safeAuthenticationText(session.issuedAt, 64)
    || !safeAuthenticationText(session.idleExpiresAt, 64)
    || !safeAuthenticationText(session.absoluteExpiresAt, 64)
    || !Number.isFinite(Date.parse(session.issuedAt))
    || !Number.isFinite(Date.parse(session.idleExpiresAt))
    || !Number.isFinite(Date.parse(session.absoluteExpiresAt))
  ) {
    return null;
  }
  return {
    absoluteExpiresAt: session.absoluteExpiresAt,
    accountType: session.accountType,
    capabilities,
    chainId: session.chainId,
    idleExpiresAt: session.idleExpiresAt,
    issuedAt: session.issuedAt,
    network: session.network,
    roles,
    sessionId: session.sessionId,
    status: "active",
    walletAddress: session.walletAddress,
    walletSource: session.walletSource,
  };
};

const copyAuthenticationFailure = (
  failure: ParticipantAuthenticationFailure,
): ParticipantAuthenticationFailure => ({
  code: safeAuthenticationIdentifier(failure.code, 128)
    ? failure.code
    : "AUTH_WORKFLOW_FAILED",
  httpStatus: Number.isInteger(failure.httpStatus)
    && (failure.httpStatus as number) >= 100
    && (failure.httpStatus as number) <= 599
    ? failure.httpStatus
    : null,
  retryAfterMs: typeof failure.retryAfterMs === "number"
    && Number.isFinite(failure.retryAfterMs)
    && failure.retryAfterMs >= 0
    ? Math.round(failure.retryAfterMs)
    : null,
  traceId: failure.traceId === null
    || safeAuthenticationIdentifier(failure.traceId, 128)
    ? failure.traceId
    : null,
});

const invalidAuthenticationCompletionFailure = (
): ParticipantAuthenticationFailure => ({
  code: "AUTH_WORKFLOW_RESPONSE_INVALID",
  httpStatus: null,
  retryAfterMs: null,
  traceId: null,
});

const authenticationEpochs = (
  state: ParticipantAuthenticationWorkflowState,
): ParticipantAuthenticationEffectEpochs => ({
  sessionEpoch: state.sessionEpoch,
  walletEpoch: state.walletEpoch,
});

const authenticationCompletionMatches = (
  state: ParticipantAuthenticationWorkflowState,
  completion: ParticipantAuthenticationCompletionEpochs,
) => completion.sessionEpoch === state.sessionEpoch
  && completion.walletEpoch === state.walletEpoch;

const authenticationOperationCompletionMatches = (
  state: ParticipantAuthenticationWorkflowState,
  completion: ParticipantAuthenticationCompletionEpochs,
  operation: ParticipantAuthenticationOperation,
) => state.pendingOperation === operation
  && authenticationCompletionMatches(state, completion);

export const createParticipantAuthenticationWorkflowState = (
  options: CreateParticipantAuthenticationWorkflowStateOptions = {},
): ParticipantAuthenticationWorkflowState => ({
  conflictRecoveryStep: 0,
  failure: null,
  pendingOperation: null,
  privateParticipant: emptyParticipantAuthenticationPrivateState(),
  publicCampaign: {
    lastGood: options.publicCampaignLastGood ?? null,
  },
  retryOperation: null,
  sessionEpoch: 0,
  status: "disconnected",
  walletEpoch: 0,
});

export const selectParticipantAuthenticationAction = (
  state: ParticipantAuthenticationWorkflowState,
): ParticipantAuthenticationAction => {
  if (state.status === "disconnected" || state.status === "revoked") {
    return "connect";
  }
  if (state.status === "expired") {
    return "restore";
  }
  if (state.status === "challengeReady") {
    return "sign";
  }
  if (
    state.status === "unavailable"
    || state.status === "failed"
    || state.status === "rateLimited"
  ) {
    return state.retryOperation ? "retry" : "connect";
  }
  return "none";
};

const authenticationFailureStatus = (
  failure: ParticipantAuthenticationFailure,
): ParticipantAuthenticationWorkflowStatus => {
  if (failure.httpStatus === 429) {
    return "rateLimited";
  }
  if (failure.httpStatus === 503) {
    return "unavailable";
  }
  return "failed";
};

const authenticationInvalidCompletion = (
  state: ParticipantAuthenticationWorkflowState,
  retryOperation: ParticipantAuthenticationOperation,
): ParticipantAuthenticationWorkflowReduction => authenticationWrite({
  ...state,
  failure: invalidAuthenticationCompletionFailure(),
  pendingOperation: null,
  privateParticipant: emptyParticipantAuthenticationPrivateState(),
  retryOperation,
  status: "failed",
});

const requestChallengeCommand = (
  state: ParticipantAuthenticationWorkflowState,
  wallet: ParticipantAuthenticationWalletConnection,
): ParticipantAuthenticationChallengeCommand => ({
  ...authenticationEpochs(state),
  adapterId: wallet.adapterId,
  ...(wallet.caHashHint === undefined ? {} : { caHashHint: wallet.caHashHint }),
  chainId: wallet.chainId,
  network: wallet.network,
  type: "request_challenge",
  walletAddressHint: wallet.walletAddressHint,
});

const startParticipantAuthenticationConnect = (
  state: ParticipantAuthenticationWorkflowState,
  resetConflictRecovery = true,
): ParticipantAuthenticationWorkflowReduction => {
  const nextState: ParticipantAuthenticationWorkflowState = {
    ...state,
    conflictRecoveryStep: resetConflictRecovery ? 0 : state.conflictRecoveryStep,
    failure: null,
    pendingOperation: "connect",
    privateParticipant: emptyParticipantAuthenticationPrivateState(),
    retryOperation: null,
    sessionEpoch: nextCounter(state.sessionEpoch),
    status: "connecting",
    walletEpoch: nextCounter(state.walletEpoch),
  };
  return authenticationWrite(nextState, [{
    ...authenticationEpochs(nextState),
    type: "connect_wallet",
  }]);
};

const startParticipantAuthenticationRestore = (
  state: ParticipantAuthenticationWorkflowState,
  resetConflictRecovery: boolean,
): ParticipantAuthenticationWorkflowReduction => {
  const nextState: ParticipantAuthenticationWorkflowState = {
    ...state,
    conflictRecoveryStep: resetConflictRecovery ? 0 : state.conflictRecoveryStep,
    failure: null,
    pendingOperation: "restore",
    privateParticipant: {
      ...state.privateParticipant,
      challenge: null,
      session: null,
    },
    retryOperation: null,
    sessionEpoch: nextCounter(state.sessionEpoch),
    status: "restoring",
  };
  return authenticationWrite(nextState, [{
    ...authenticationEpochs(nextState),
    type: "restore_session",
  }]);
};

const recoverParticipantAuthenticationConflict = (
  state: ParticipantAuthenticationWorkflowState,
  failure: ParticipantAuthenticationFailure,
): ParticipantAuthenticationWorkflowReduction => {
  const safeFailure = copyAuthenticationFailure(failure);
  if (state.conflictRecoveryStep === 0) {
    const nextState: ParticipantAuthenticationWorkflowState = {
      ...state,
      conflictRecoveryStep: 1,
      failure: safeFailure,
      pendingOperation: "restore",
      privateParticipant: emptyParticipantAuthenticationPrivateState(),
      retryOperation: null,
      sessionEpoch: nextCounter(state.sessionEpoch),
      status: "restoring",
    };
    return authenticationWrite(nextState, [{
      ...authenticationEpochs(nextState),
      type: "restore_session",
    }]);
  }

  if (
    state.conflictRecoveryStep
    < PARTICIPANT_AUTHENTICATION_MAX_CONFLICT_RECOVERY_STEPS
  ) {
    const nextState: ParticipantAuthenticationWorkflowState = {
      ...state,
      conflictRecoveryStep: PARTICIPANT_AUTHENTICATION_MAX_CONFLICT_RECOVERY_STEPS,
      failure: safeFailure,
      pendingOperation: "connect",
      privateParticipant: emptyParticipantAuthenticationPrivateState(),
      retryOperation: null,
      sessionEpoch: nextCounter(state.sessionEpoch),
      status: "connecting",
      walletEpoch: nextCounter(state.walletEpoch),
    };
    return authenticationWrite(nextState, [{
      ...authenticationEpochs(nextState),
      type: "connect_wallet",
    }]);
  }

  return authenticationWrite({
    ...state,
    failure: safeFailure,
    pendingOperation: null,
    privateParticipant: emptyParticipantAuthenticationPrivateState(),
    retryOperation: null,
    status: "failed",
  });
};

const applyParticipantAuthenticationFailure = (
  state: ParticipantAuthenticationWorkflowState,
  failure: ParticipantAuthenticationFailure,
  retryOperation: ParticipantAuthenticationOperation,
): ParticipantAuthenticationWorkflowReduction => {
  const safeFailure = copyAuthenticationFailure(failure);
  if (safeFailure.httpStatus === 401 || safeFailure.httpStatus === 403) {
    return authenticationWrite({
      ...state,
      failure: safeFailure,
      pendingOperation: null,
      privateParticipant: emptyParticipantAuthenticationPrivateState(),
      retryOperation: null,
      sessionEpoch: nextCounter(state.sessionEpoch),
      status: safeFailure.httpStatus === 401 ? "expired" : "revoked",
      walletEpoch: nextCounter(state.walletEpoch),
    });
  }
  if (safeFailure.httpStatus === 409) {
    return recoverParticipantAuthenticationConflict(state, safeFailure);
  }
  return authenticationWrite({
    ...state,
    failure: safeFailure,
    pendingOperation: null,
    retryOperation,
    status: authenticationFailureStatus(safeFailure),
  });
};

const retryParticipantAuthenticationOperation = (
  state: ParticipantAuthenticationWorkflowState,
): ParticipantAuthenticationWorkflowReduction => {
  const operation = state.retryOperation;
  if (!operation || state.pendingOperation) {
    return authenticationNoop(state);
  }
  if (operation === "connect") {
    return startParticipantAuthenticationConnect(state);
  }
  if (operation === "restore") {
    return startParticipantAuthenticationRestore(state, true);
  }

  const challenge = state.privateParticipant.challenge;
  const wallet = state.privateParticipant.wallet;
  const session = state.privateParticipant.session;
  if (
    (operation === "challenge" && !wallet)
    || ((operation === "sign" || operation === "authenticate") && !challenge)
    || (operation === "rotate" && !session)
    || operation === "logout"
  ) {
    return authenticationNoop(state);
  }

  const nextState: ParticipantAuthenticationWorkflowState = {
    ...state,
    failure: null,
    pendingOperation: operation,
    retryOperation: null,
    sessionEpoch: nextCounter(state.sessionEpoch),
    status: operation === "challenge"
      ? "connecting"
      : operation === "sign"
        ? "signing"
        : operation === "authenticate"
          ? "authenticating"
          : "rotating",
  };
  const epochs = authenticationEpochs(nextState);
  const command: ParticipantAuthenticationEffectCommand = operation === "challenge"
    ? requestChallengeCommand(nextState, wallet!)
    : operation === "sign"
      ? { ...epochs, challengeId: challenge!.challengeId, type: "sign_challenge" }
      : operation === "authenticate"
        ? { ...epochs, challengeId: challenge!.challengeId, type: "authenticate_session" }
        : { ...epochs, type: "rotate_session" };
  return authenticationWrite(nextState, [command]);
};

export const participantAuthenticationWorkflowReducer = (
  state: ParticipantAuthenticationWorkflowState,
  event: ParticipantAuthenticationWorkflowEvent,
): ParticipantAuthenticationWorkflowReduction => {
  if (event.type === "public_campaign_last_good_changed") {
    if (state.publicCampaign.lastGood === event.campaign) {
      return authenticationNoop(state);
    }
    return authenticationWrite({
      ...state,
      publicCampaign: { lastGood: event.campaign },
    });
  }

  if (event.type === "wallet_context_changed" || event.type === "scope_invalidated") {
    return authenticationWrite({
      ...state,
      conflictRecoveryStep: 0,
      failure: null,
      pendingOperation: null,
      privateParticipant: emptyParticipantAuthenticationPrivateState(),
      retryOperation: null,
      sessionEpoch: nextCounter(state.sessionEpoch),
      status: "disconnected",
      walletEpoch: nextCounter(state.walletEpoch),
    });
  }

  if (event.type === "connect_requested") {
    return state.pendingOperation
      ? authenticationNoop(state)
      : startParticipantAuthenticationConnect(state);
  }

  if (event.type === "restore_requested") {
    return state.pendingOperation
      ? authenticationNoop(state)
      : startParticipantAuthenticationRestore(state, true);
  }

  if (event.type === "sign_requested") {
    const challenge = state.privateParticipant.challenge;
    if (
      state.status !== "challengeReady"
      || state.pendingOperation
      || !challenge
    ) {
      return authenticationNoop(state);
    }
    const nextState: ParticipantAuthenticationWorkflowState = {
      ...state,
      failure: null,
      pendingOperation: "sign",
      retryOperation: null,
      status: "signing",
    };
    return authenticationWrite(nextState, [{
      ...authenticationEpochs(nextState),
      challengeId: challenge.challengeId,
      type: "sign_challenge",
    }]);
  }

  if (event.type === "rotation_requested") {
    if (
      state.status !== "ready"
      || state.pendingOperation
      || !state.privateParticipant.session
    ) {
      return authenticationNoop(state);
    }
    const nextState: ParticipantAuthenticationWorkflowState = {
      ...state,
      failure: null,
      pendingOperation: "rotate",
      retryOperation: null,
      sessionEpoch: nextCounter(state.sessionEpoch),
      status: "rotating",
    };
    return authenticationWrite(nextState, [{
      ...authenticationEpochs(nextState),
      type: "rotate_session",
    }]);
  }

  if (event.type === "logout_requested") {
    if (
      state.status === "loggingOut"
      || !state.privateParticipant.session
    ) {
      return authenticationNoop(state);
    }
    const nextState: ParticipantAuthenticationWorkflowState = {
      ...state,
      conflictRecoveryStep: 0,
      failure: null,
      pendingOperation: "logout",
      privateParticipant: emptyParticipantAuthenticationPrivateState(),
      retryOperation: null,
      sessionEpoch: nextCounter(state.sessionEpoch),
      status: "loggingOut",
      walletEpoch: nextCounter(state.walletEpoch),
    };
    return authenticationWrite(nextState, [{
      ...authenticationEpochs(nextState),
      type: "logout_session",
    }]);
  }

  if (event.type === "retry_requested") {
    return retryParticipantAuthenticationOperation(state);
  }

  if (event.type === "wallet_connected") {
    if (!authenticationOperationCompletionMatches(state, event, "connect")) {
      return authenticationNoop(state);
    }
    const wallet = copyAuthenticationWallet(event.wallet);
    if (!wallet) {
      return authenticationInvalidCompletion(state, "connect");
    }
    const nextState: ParticipantAuthenticationWorkflowState = {
      ...state,
      failure: null,
      pendingOperation: "challenge",
      privateParticipant: {
        challenge: null,
        session: null,
        wallet,
      },
      retryOperation: null,
      status: "connecting",
    };
    return authenticationWrite(nextState, [requestChallengeCommand(nextState, wallet)]);
  }

  if (event.type === "challenge_succeeded") {
    if (!authenticationOperationCompletionMatches(state, event, "challenge")) {
      return authenticationNoop(state);
    }
    const challenge = copyAuthenticationChallenge(event.challenge);
    if (!challenge || !state.privateParticipant.wallet) {
      return authenticationInvalidCompletion(state, "challenge");
    }
    return authenticationWrite({
      ...state,
      conflictRecoveryStep: 0,
      failure: null,
      pendingOperation: null,
      privateParticipant: {
        ...state.privateParticipant,
        challenge,
        session: null,
      },
      retryOperation: null,
      status: "challengeReady",
    });
  }

  if (event.type === "sign_succeeded") {
    if (!authenticationOperationCompletionMatches(state, event, "sign")) {
      return authenticationNoop(state);
    }
    const challenge = state.privateParticipant.challenge;
    if (!challenge) {
      return authenticationInvalidCompletion(state, "sign");
    }
    const nextState: ParticipantAuthenticationWorkflowState = {
      ...state,
      failure: null,
      pendingOperation: "authenticate",
      retryOperation: null,
      status: "authenticating",
    };
    return authenticationWrite(nextState, [{
      ...authenticationEpochs(nextState),
      challengeId: challenge.challengeId,
      type: "authenticate_session",
    }]);
  }

  if (event.type === "authenticate_succeeded") {
    if (!authenticationOperationCompletionMatches(state, event, "authenticate")) {
      return authenticationNoop(state);
    }
    const participant = copyAuthenticationSession(event.participant);
    const wallet = state.privateParticipant.wallet;
    if (
      !participant
      || (wallet !== null && (
        wallet.chainId !== participant.chainId
        || wallet.network !== participant.network
      ))
    ) {
      return authenticationInvalidCompletion(state, "authenticate");
    }
    return authenticationWrite({
      ...state,
      conflictRecoveryStep: 0,
      failure: null,
      pendingOperation: null,
      privateParticipant: {
        challenge: null,
        session: participant,
        wallet,
      },
      retryOperation: null,
      status: "ready",
    });
  }

  if (event.type === "restore_completed") {
    if (!authenticationOperationCompletionMatches(state, event, "restore")) {
      return authenticationNoop(state);
    }
    if (event.outcome === "ready") {
      const participant = event.participant
        ? copyAuthenticationSession(event.participant)
        : null;
      if (!participant) {
        return authenticationInvalidCompletion(state, "restore");
      }
      return authenticationWrite({
        ...state,
        conflictRecoveryStep: 0,
        failure: null,
        pendingOperation: null,
        privateParticipant: {
          challenge: null,
          session: participant,
          wallet: state.privateParticipant.wallet,
        },
        retryOperation: null,
        status: "ready",
      });
    }

    const failure = event.failure
      ? copyAuthenticationFailure(event.failure)
      : event.outcome === "disconnected"
        ? null
        : {
            code: `AUTH_RESTORE_${event.outcome.toUpperCase()}`,
            httpStatus: null,
            retryAfterMs: null,
            traceId: null,
          };
    if (
      event.outcome === "disconnected"
      || event.outcome === "expired"
      || event.outcome === "revoked"
    ) {
      return authenticationWrite({
        ...state,
        conflictRecoveryStep: 0,
        failure,
        pendingOperation: null,
        privateParticipant: emptyParticipantAuthenticationPrivateState(),
        retryOperation: null,
        status: event.outcome,
      });
    }
    return authenticationWrite({
      ...state,
      conflictRecoveryStep: 0,
      failure,
      pendingOperation: null,
      privateParticipant: emptyParticipantAuthenticationPrivateState(),
      retryOperation: "restore",
      status: event.outcome,
    });
  }

  if (event.type === "rotation_succeeded") {
    if (!authenticationOperationCompletionMatches(state, event, "rotate")) {
      return authenticationNoop(state);
    }
    const participant = copyAuthenticationSession(event.participant);
    const wallet = state.privateParticipant.wallet;
    if (
      !participant
      || (wallet !== null && (
        wallet.chainId !== participant.chainId
        || wallet.network !== participant.network
      ))
    ) {
      return authenticationInvalidCompletion(state, "rotate");
    }
    return authenticationWrite({
      ...state,
      conflictRecoveryStep: 0,
      failure: null,
      pendingOperation: null,
      privateParticipant: {
        challenge: null,
        session: participant,
        wallet,
      },
      retryOperation: null,
      status: "ready",
    });
  }

  if (event.type === "logout_completed") {
    if (!authenticationOperationCompletionMatches(state, event, "logout")) {
      return authenticationNoop(state);
    }
    return authenticationWrite({
      ...state,
      conflictRecoveryStep: 0,
      failure: event.failure ? copyAuthenticationFailure(event.failure) : null,
      pendingOperation: null,
      privateParticipant: emptyParticipantAuthenticationPrivateState(),
      retryOperation: null,
      status: "disconnected",
    });
  }

  if (event.type === "operation_failed") {
    if (!authenticationOperationCompletionMatches(state, event, event.operation)) {
      return authenticationNoop(state);
    }
    if (event.operation === "logout") {
      return authenticationWrite({
        ...state,
        conflictRecoveryStep: 0,
        failure: copyAuthenticationFailure(event.failure),
        pendingOperation: null,
        privateParticipant: emptyParticipantAuthenticationPrivateState(),
        retryOperation: null,
        status: "disconnected",
      });
    }
    const challengeCannotBeReused = event.operation === "authenticate"
      || (
        event.operation === "sign"
        && [
          "AUTH_CHALLENGE_EXPIRED",
          "AUTH_CHALLENGE_INVALID",
          "AUTH_CHALLENGE_REPLAYED",
          "AUTH_CHALLENGE_REVOKED",
          "CHALLENGE_EXPIRED",
        ].includes(event.failure.code)
      );
    const retryOperation = challengeCannotBeReused
      ? "challenge"
      : event.operation;
    const failureState = retryOperation === "challenge"
      ? {
          ...state,
          privateParticipant: {
            ...state.privateParticipant,
            challenge: null,
            session: null,
          },
        }
      : state;
    if (challengeCannotBeReused) {
      const failure = copyAuthenticationFailure(event.failure);
      return authenticationWrite({
        ...failureState,
        failure,
        pendingOperation: null,
        retryOperation,
        status: authenticationFailureStatus(failure),
      });
    }
    return applyParticipantAuthenticationFailure(
      failureState,
      event.failure,
      retryOperation,
    );
  }

  if (event.type === "private_request_failed") {
    if (!authenticationCompletionMatches(state, event)) {
      return authenticationNoop(state);
    }
    return applyParticipantAuthenticationFailure(state, event.failure, "restore");
  }

  return authenticationNoop(state);
};

export type ParticipantLiveWalletAuthenticationWorkflowState =
  ParticipantAuthenticationWorkflowState;
export type ParticipantLiveWalletAuthenticationWorkflowEvent =
  ParticipantAuthenticationWorkflowEvent;
export type ParticipantLiveWalletAuthenticationEffectCommand =
  ParticipantAuthenticationEffectCommand;
export const createParticipantLiveWalletAuthenticationWorkflowState =
  createParticipantAuthenticationWorkflowState;
export const participantLiveWalletAuthenticationWorkflowReducer =
  participantAuthenticationWorkflowReducer;
export const selectParticipantLiveWalletAuthenticationAction =
  selectParticipantAuthenticationAction;
