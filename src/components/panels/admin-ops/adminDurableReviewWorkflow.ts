import type { NormalizedWalletSession } from "../../../domain/types";

export const adminDurableReviewOperations = Object.freeze([
  "campaigns",
  "queue",
  "detail",
  "winners",
  "artifacts",
  "artifactDetail",
  "decision",
  "generate",
  "download",
] as const);

export type AdminDurableReviewOperation =
  (typeof adminDurableReviewOperations)[number];
export type AdminDurableReviewReadOperation = Extract<
  AdminDurableReviewOperation,
  "artifactDetail" | "artifacts" | "campaigns" | "detail" | "queue" | "winners"
>;
export type AdminDurableReviewRefreshOperation = Extract<
  AdminDurableReviewReadOperation,
  "artifacts" | "detail" | "queue" | "winners"
>;
export type AdminDurableReviewDecision = "approved" | "needs_review" | "rejected";
export type AdminDurableReviewArtifactFormat = "csv" | "json";
export type AdminDurableReviewQueueState =
  | "all"
  | "approved_current"
  | "needs_review_current"
  | "pending_review"
  | "rejected_current"
  | "stale";
export type AdminDurableReviewWorkflowStatus =
  | "blocked"
  | "command_pending"
  | "degraded"
  | "loading"
  | "no_session"
  | "ready"
  | "reconnect";

export interface AdminDurableReviewIdentity {
  selectedArtifactId: string | null;
  selectedCampaignId: string | null;
  selectedParticipantId: string | null;
  sessionKey: string | null;
}

export interface AdminDurableReviewRequestToken extends AdminDurableReviewIdentity {
  expectedContentHash?: string;
  epoch: number;
  operation: AdminDurableReviewOperation;
  sequence: number;
}

export interface AdminDurableReviewWorkflowFailure {
  code: string;
  httpStatus?: number;
  reconnectRequired: boolean;
  retryable: boolean;
  traceId: string;
}

export interface AdminDurableReviewReadRetryTarget extends AdminDurableReviewIdentity {
  epoch: number;
  operation: AdminDurableReviewReadOperation;
}

export interface AdminDurableReviewDownloadRetryTarget extends AdminDurableReviewIdentity {
  epoch: number;
  expectedContentHash: string;
  operation: "download";
}

export type AdminDurableReviewRetryTarget =
  | AdminDurableReviewDownloadRetryTarget
  | AdminDurableReviewReadRetryTarget;

export interface AdminDurableReviewOperationFailure
  extends AdminDurableReviewIdentity, AdminDurableReviewWorkflowFailure {
  epoch: number;
  failedOperation: AdminDurableReviewOperation;
  retryTarget: AdminDurableReviewRetryTarget | null;
  sequence: number;
}

export interface AdminDurableReviewLastGood<T = unknown> {
  data: T;
  identityKey: string;
}

export interface AdminDurableReviewReadSlot<T = unknown> {
  current: T | null;
  failure: AdminDurableReviewOperationFailure | null;
  lastGood: AdminDurableReviewLastGood<T> | null;
  status: "blocked" | "degraded" | "idle" | "loading" | "ready";
}

export type AdminDurableReviewReads = Record<
  AdminDurableReviewReadOperation,
  AdminDurableReviewReadSlot
>;

export interface AdminDurableReviewDraft {
  artifactFormat: AdminDurableReviewArtifactFormat;
  decision: AdminDurableReviewDecision;
  decisionNote: string;
  queueState: AdminDurableReviewQueueState;
  reasonCode: string;
}

export interface AdminDurableReviewRefreshCursor {
  consumed: number;
  requested: number;
}

export type AdminDurableReviewRefreshState = Record<
  AdminDurableReviewRefreshOperation,
  AdminDurableReviewRefreshCursor
>;

export interface AdminDurableReviewWorkflowState {
  activeRequests: Partial<Record<AdminDurableReviewOperation, AdminDurableReviewRequestToken>>;
  diagnostic: AdminDurableReviewOperationFailure | null;
  downloadFailure: AdminDurableReviewOperationFailure | null;
  draft: AdminDurableReviewDraft;
  epoch: number;
  identity: AdminDurableReviewIdentity;
  lastReceipts: {
    decision: unknown | null;
    generate: unknown | null;
  };
  reads: AdminDurableReviewReads;
  refresh: AdminDurableReviewRefreshState;
  sequences: Record<AdminDurableReviewOperation, number>;
  status: AdminDurableReviewWorkflowStatus;
}

export type AdminDurableReviewWorkflowEvent =
  | { sessionKey: string | null; type: "sessionChanged" }
  | { campaignId: string | null; type: "campaignSelected" }
  | { participantId: string | null; type: "participantSelected" }
  | { artifactId: string | null; type: "artifactSelected" }
  | { token: AdminDurableReviewRequestToken; type: "requestStarted" }
  | { data: unknown; token: AdminDurableReviewRequestToken; type: "readSucceeded" }
  | {
      failure: AdminDurableReviewWorkflowFailure;
      token: AdminDurableReviewRequestToken;
      type: "requestFailed";
    }
  | { receipt: unknown; token: AdminDurableReviewRequestToken; type: "decisionSucceeded" }
  | { receipt: unknown; token: AdminDurableReviewRequestToken; type: "generateSucceeded" }
  | { token: AdminDurableReviewRequestToken; type: "downloadSucceeded" }
  | {
      operation: AdminDurableReviewRefreshOperation;
      type: "refreshConsumed";
      version: number;
    }
  | {
      field: keyof AdminDurableReviewDraft;
      type: "draftChanged";
      value: string;
    };

const readOperations = new Set<AdminDurableReviewOperation>([
  "artifactDetail",
  "artifacts",
  "campaigns",
  "detail",
  "queue",
  "winners",
]);
const commandOperations = new Set<AdminDurableReviewOperation>([
  "decision",
  "download",
  "generate",
]);
const decisions = new Set<AdminDurableReviewDecision>([
  "approved",
  "needs_review",
  "rejected",
]);
const artifactFormats = new Set<AdminDurableReviewArtifactFormat>(["csv", "json"]);
const queueStates = new Set<AdminDurableReviewQueueState>([
  "all",
  "approved_current",
  "needs_review_current",
  "pending_review",
  "rejected_current",
  "stale",
]);

const emptyReadSlot = (): AdminDurableReviewReadSlot => ({
  current: null,
  failure: null,
  lastGood: null,
  status: "idle",
});

const emptyReads = (): AdminDurableReviewReads => ({
  artifactDetail: emptyReadSlot(),
  artifacts: emptyReadSlot(),
  campaigns: emptyReadSlot(),
  detail: emptyReadSlot(),
  queue: emptyReadSlot(),
  winners: emptyReadSlot(),
});

const emptyRefresh = (): AdminDurableReviewRefreshState => ({
  artifacts: { consumed: 0, requested: 0 },
  detail: { consumed: 0, requested: 0 },
  queue: { consumed: 0, requested: 0 },
  winners: { consumed: 0, requested: 0 },
});

const initialSequences = (): Record<AdminDurableReviewOperation, number> =>
  Object.fromEntries(adminDurableReviewOperations.map((operation) => [operation, 0])) as
    Record<AdminDurableReviewOperation, number>;

const initialDraft = (): AdminDurableReviewDraft => ({
  artifactFormat: "csv",
  decision: "approved",
  decisionNote: "",
  queueState: "all",
  reasonCode: "evidence_verified",
});

const emptyIdentity = (sessionKey: string | null): AdminDurableReviewIdentity => ({
  selectedArtifactId: null,
  selectedCampaignId: null,
  selectedParticipantId: null,
  sessionKey,
});

export const createAdminDurableReviewWorkflowState = (
  sessionKey: string | null,
): AdminDurableReviewWorkflowState => ({
  activeRequests: {},
  diagnostic: null,
  downloadFailure: null,
  draft: initialDraft(),
  epoch: 0,
  identity: emptyIdentity(sessionKey),
  lastReceipts: { decision: null, generate: null },
  reads: emptyReads(),
  refresh: emptyRefresh(),
  sequences: initialSequences(),
  status: sessionKey ? "loading" : "no_session",
});

const boundedIdentityPart = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0
    && normalized.length <= 256
    && !/[\u0000-\u001f\u007f-\u009f]/u.test(normalized)
    ? normalized
    : undefined;
};

export const createAdminDurableReviewSessionKey = (
  session: NormalizedWalletSession | null,
): string | null => {
  try {
    if (!session?.issuer?.valid) {
      return null;
    }
    const sessionId = boundedIdentityPart(session.sessionId);
    const address = boundedIdentityPart(session.address);
    const issuerReference = boundedIdentityPart(session.issuer.referenceId);

    return sessionId && address && issuerReference
      ? [sessionId, address, issuerReference]
        .map((part) => `${part.length}:${part}`)
        .join("|")
      : null;
  } catch {
    return null;
  }
};

const identityKey = (identity: AdminDurableReviewIdentity): string => [
  identity.sessionKey,
  identity.selectedCampaignId,
  identity.selectedParticipantId,
  identity.selectedArtifactId,
].map((part) => part === null ? "-" : `${part.length}:${part}`).join("|");

const identityMatches = (
  token: AdminDurableReviewRequestToken,
  state: AdminDurableReviewWorkflowState,
): boolean => token.epoch === state.epoch
  && token.sessionKey === state.identity.sessionKey
  && token.selectedCampaignId === state.identity.selectedCampaignId
  && token.selectedParticipantId === state.identity.selectedParticipantId
  && token.selectedArtifactId === state.identity.selectedArtifactId;

const tokenMatches = (
  token: AdminDurableReviewRequestToken,
  active: AdminDurableReviewRequestToken | undefined,
): boolean => Boolean(active)
  && token.operation === active?.operation
  && token.sequence === active.sequence
  && token.epoch === active.epoch
  && token.sessionKey === active.sessionKey
  && token.selectedCampaignId === active.selectedCampaignId
  && token.selectedParticipantId === active.selectedParticipantId
  && token.selectedArtifactId === active.selectedArtifactId
  && token.expectedContentHash === active.expectedContentHash;

export const selectAdminDurableReviewRequestActive = (
  state: AdminDurableReviewWorkflowState,
  token: AdminDurableReviewRequestToken,
): boolean => identityMatches(token, state)
  && tokenMatches(token, state.activeRequests[token.operation]);

const sha256Pattern = /^[a-f0-9]{64}$/u;

interface AdminDurableReviewRequestOptions {
  expectedContentHash: string;
}

export const nextAdminDurableReviewRequestToken = (
  state: AdminDurableReviewWorkflowState,
  operation: AdminDurableReviewOperation,
  options?: AdminDurableReviewRequestOptions,
): AdminDurableReviewRequestToken => ({
  ...state.identity,
  ...(operation === "download" && sha256Pattern.test(options?.expectedContentHash ?? "")
    ? { expectedContentHash: options?.expectedContentHash }
    : {}),
  epoch: state.epoch,
  operation,
  sequence: state.sequences[operation] + 1,
});

const withoutActive = (
  state: AdminDurableReviewWorkflowState,
  operation: AdminDurableReviewOperation,
) => {
  const activeRequests = { ...state.activeRequests };
  delete activeRequests[operation];
  return activeRequests;
};

const resetForSession = (
  state: AdminDurableReviewWorkflowState,
  sessionKey: string | null,
): AdminDurableReviewWorkflowState => ({
  ...state,
  activeRequests: {},
  diagnostic: null,
  downloadFailure: null,
  draft: initialDraft(),
  epoch: state.epoch + 1,
  identity: emptyIdentity(sessionKey),
  lastReceipts: { decision: null, generate: null },
  reads: emptyReads(),
  refresh: emptyRefresh(),
  status: sessionKey ? "loading" : "no_session",
});

const resetForCampaign = (
  state: AdminDurableReviewWorkflowState,
  campaignId: string | null,
): AdminDurableReviewWorkflowState => ({
  ...state,
  activeRequests: {},
  diagnostic: null,
  downloadFailure: null,
  draft: initialDraft(),
  epoch: state.epoch + 1,
  identity: {
    ...state.identity,
    selectedArtifactId: null,
    selectedCampaignId: campaignId,
    selectedParticipantId: null,
  },
  lastReceipts: { decision: null, generate: null },
  reads: {
    ...emptyReads(),
    campaigns: state.reads.campaigns,
  },
  refresh: emptyRefresh(),
  status: state.identity.sessionKey
    ? campaignId ? "loading" : "ready"
    : "no_session",
});

const resetForParticipant = (
  state: AdminDurableReviewWorkflowState,
  participantId: string | null,
): AdminDurableReviewWorkflowState => ({
  ...state,
  activeRequests: {},
  diagnostic: null,
  downloadFailure: null,
  draft: {
    ...state.draft,
    decision: "approved",
    decisionNote: "",
    reasonCode: "evidence_verified",
  },
  epoch: state.epoch + 1,
  identity: { ...state.identity, selectedParticipantId: participantId },
  lastReceipts: { ...state.lastReceipts, decision: null },
  reads: { ...state.reads, detail: emptyReadSlot() },
  refresh: {
    ...state.refresh,
    detail: { consumed: 0, requested: 0 },
  },
  status: state.identity.sessionKey
    ? participantId ? "loading" : "ready"
    : "no_session",
});

const resetForArtifact = (
  state: AdminDurableReviewWorkflowState,
  artifactId: string | null,
): AdminDurableReviewWorkflowState => ({
  ...state,
  activeRequests: {},
  diagnostic: null,
  downloadFailure: null,
  epoch: state.epoch + 1,
  identity: { ...state.identity, selectedArtifactId: artifactId },
  reads: { ...state.reads, artifactDetail: emptyReadSlot() },
  status: state.identity.sessionKey
    ? artifactId ? "loading" : "ready"
    : "no_session",
});

const blockedByIdentityFailure = (failure: AdminDurableReviewWorkflowFailure): boolean =>
  failure.reconnectRequired
  || failure.httpStatus === 401
  || failure.httpStatus === 403
  || /(?:AUTH|IDENTITY|SESSION)/u.test(failure.code);

const aggregateReadFailure = (reads: AdminDurableReviewReads) => {
  let degraded: AdminDurableReviewOperationFailure | null = null;
  for (const operation of Object.keys(reads) as AdminDurableReviewReadOperation[]) {
    const slot = reads[operation];
    if (!slot.failure) {
      continue;
    }
    if (slot.status === "blocked") {
      return { diagnostic: slot.failure, status: "blocked" as const };
    }
    degraded ??= slot.failure;
  }
  return degraded
    ? { diagnostic: degraded, status: "degraded" as const }
    : { diagnostic: null, status: "ready" as const };
};

const retryTargetFor = (
  token: AdminDurableReviewRequestToken,
  failure: AdminDurableReviewWorkflowFailure,
): AdminDurableReviewRetryTarget | null => {
  if (!failure.retryable) {
    return null;
  }
  const identity = {
    epoch: token.epoch,
    selectedArtifactId: token.selectedArtifactId,
    selectedCampaignId: token.selectedCampaignId,
    selectedParticipantId: token.selectedParticipantId,
    sessionKey: token.sessionKey,
  };
  if (readOperations.has(token.operation)) {
    return {
      ...identity,
      operation: token.operation as AdminDurableReviewReadOperation,
    };
  }
  if (token.operation === "download" && sha256Pattern.test(token.expectedContentHash ?? "")) {
    return {
      ...identity,
      expectedContentHash: token.expectedContentHash as string,
      operation: "download",
    };
  }
  return null;
};

const operationFailure = (
  token: AdminDurableReviewRequestToken,
  failure: AdminDurableReviewWorkflowFailure,
): AdminDurableReviewOperationFailure => ({
  ...failure,
  epoch: token.epoch,
  failedOperation: token.operation,
  retryTarget: retryTargetFor(token, failure),
  selectedArtifactId: token.selectedArtifactId,
  selectedCampaignId: token.selectedCampaignId,
  selectedParticipantId: token.selectedParticipantId,
  sequence: token.sequence,
  sessionKey: token.sessionKey,
});

const readOutcome = (
  reads: AdminDurableReviewReads,
  activeRequests: AdminDurableReviewWorkflowState["activeRequests"],
) => {
  const aggregate = aggregateReadFailure(reads);
  if (aggregate.diagnostic) {
    return aggregate;
  }
  const commandPending = Array.from(commandOperations).some(
    (operation) => Boolean(activeRequests[operation]),
  );
  if (commandPending) {
    return { diagnostic: null, status: "command_pending" as const };
  }
  const loading = Array.from(readOperations).some(
    (operation) => Boolean(activeRequests[operation]),
  );
  return {
    diagnostic: null,
    status: loading ? "loading" as const : "ready" as const,
  };
};

const failRequest = (
  state: AdminDurableReviewWorkflowState,
  token: AdminDurableReviewRequestToken,
  failure: AdminDurableReviewWorkflowFailure,
): AdminDurableReviewWorkflowState => {
  if (!tokenMatches(token, state.activeRequests[token.operation])) {
    return state;
  }

  const scopedFailure = operationFailure(token, failure);

  if (blockedByIdentityFailure(failure)) {
    return {
      ...resetForSession(state, state.identity.sessionKey),
      diagnostic: { ...scopedFailure, retryTarget: null },
      status: "reconnect",
    };
  }

  if (token.operation === "download") {
    const activeRequests = withoutActive(state, token.operation);
    const outcome = readOutcome(state.reads, activeRequests);
    return {
      ...state,
      activeRequests,
      diagnostic: outcome.diagnostic,
      downloadFailure: scopedFailure,
      status: outcome.status,
    };
  }

  const reads = { ...state.reads };
  if (readOperations.has(token.operation)) {
    const operation = token.operation as AdminDurableReviewReadOperation;
    reads[operation] = {
      ...reads[operation],
      failure: scopedFailure,
      status: failure.retryable ? "degraded" : "blocked",
    };
  }

  return {
    ...state,
    activeRequests: withoutActive(state, token.operation),
    diagnostic: scopedFailure,
    reads,
    status: failure.retryable ? "degraded" : "blocked",
  };
};

const updateDraft = (
  state: AdminDurableReviewWorkflowState,
  field: keyof AdminDurableReviewDraft,
  value: string,
): AdminDurableReviewWorkflowState => {
  if (field === "artifactFormat" && artifactFormats.has(value as AdminDurableReviewArtifactFormat)) {
    return { ...state, draft: { ...state.draft, artifactFormat: value as AdminDurableReviewArtifactFormat } };
  }
  if (field === "decision" && decisions.has(value as AdminDurableReviewDecision)) {
    return { ...state, draft: { ...state.draft, decision: value as AdminDurableReviewDecision } };
  }
  if (field === "queueState" && queueStates.has(value as AdminDurableReviewQueueState)) {
    return { ...state, draft: { ...state.draft, queueState: value as AdminDurableReviewQueueState } };
  }
  if (field === "decisionNote" && value.length <= 1_000) {
    return { ...state, draft: { ...state.draft, decisionNote: value } };
  }
  if (
    field === "reasonCode"
    && value.length > 0
    && value.length <= 64
    && /^[a-z0-9_:-]+$/u.test(value)
  ) {
    return { ...state, draft: { ...state.draft, reasonCode: value } };
  }
  return state;
};

export const adminDurableReviewWorkflowReducer = (
  state: AdminDurableReviewWorkflowState,
  event: AdminDurableReviewWorkflowEvent,
): AdminDurableReviewWorkflowState => {
  switch (event.type) {
    case "sessionChanged":
      return event.sessionKey === state.identity.sessionKey
        ? state
        : resetForSession(state, event.sessionKey);
    case "campaignSelected":
      return event.campaignId === state.identity.selectedCampaignId
        ? state
        : resetForCampaign(state, event.campaignId);
    case "participantSelected":
      return event.participantId === state.identity.selectedParticipantId
        ? state
        : resetForParticipant(state, event.participantId);
    case "artifactSelected":
      return event.artifactId === state.identity.selectedArtifactId
        ? state
        : resetForArtifact(state, event.artifactId);
    case "requestStarted": { // A new sequence supersedes an older request for the same operation.
      if (
        !state.identity.sessionKey
        || !identityMatches(event.token, state)
        || event.token.sequence !== state.sequences[event.token.operation] + 1
        || (event.token.operation === "download"
          && !sha256Pattern.test(event.token.expectedContentHash ?? ""))
        || (event.token.operation !== "download"
          && event.token.expectedContentHash !== undefined)
      ) {
        return state;
      }
      const reads = { ...state.reads };
      if (readOperations.has(event.token.operation)) {
        const operation = event.token.operation as AdminDurableReviewReadOperation;
        reads[operation] = { ...reads[operation], status: "loading" };
      }
      const activeRequests = {
        ...state.activeRequests,
        [event.token.operation]: event.token,
      };
      const outcome = readOperations.has(event.token.operation)
        ? readOutcome(reads, activeRequests)
        : { diagnostic: null, status: "command_pending" as const };
      return {
        ...state,
        activeRequests,
        diagnostic: outcome.diagnostic,
        downloadFailure: event.token.operation === "download"
          ? null
          : state.downloadFailure,
        reads,
        sequences: {
          ...state.sequences,
          [event.token.operation]: event.token.sequence,
        },
        status: outcome.status,
      };
    }
    case "readSucceeded": { // Bridge normalization is the authority for payload shape.
      if (
        !readOperations.has(event.token.operation)
        || !tokenMatches(event.token, state.activeRequests[event.token.operation])
      ) {
        return state;
      }
      const operation = event.token.operation as AdminDurableReviewReadOperation;
      const lastGood = {
        data: event.data,
        identityKey: identityKey(event.token),
      };
      const reads = {
        ...state.reads,
        [operation]: {
          current: event.data,
          failure: null,
          lastGood,
          status: "ready" as const,
        },
      };
      const activeRequests = withoutActive(state, operation);
      const outcome = readOutcome(reads, activeRequests);
      return {
        ...state,
        activeRequests,
        diagnostic: outcome.diagnostic,
        reads,
        status: outcome.status,
      };
    }
    case "requestFailed":
      return failRequest(state, event.token, event.failure);
    case "decisionSucceeded": {
      if (!tokenMatches(event.token, state.activeRequests.decision)) {
        return state;
      }
      const activeRequests = withoutActive(state, "decision");
      const outcome = readOutcome(state.reads, activeRequests);
      return {
        ...state,
        activeRequests,
        diagnostic: outcome.diagnostic,
        lastReceipts: { ...state.lastReceipts, decision: event.receipt },
        refresh: {
          ...state.refresh,
          detail: {
            ...state.refresh.detail,
            requested: state.refresh.detail.requested + 1,
          },
          queue: {
            ...state.refresh.queue,
            requested: state.refresh.queue.requested + 1,
          },
          winners: {
            ...state.refresh.winners,
            requested: state.refresh.winners.requested + 1,
          },
        },
        status: outcome.status,
      };
    }
    case "generateSucceeded": {
      if (!tokenMatches(event.token, state.activeRequests.generate)) {
        return state;
      }
      const activeRequests = withoutActive(state, "generate");
      const outcome = readOutcome(state.reads, activeRequests);
      return {
        ...state,
        activeRequests,
        diagnostic: outcome.diagnostic,
        lastReceipts: { ...state.lastReceipts, generate: event.receipt },
        refresh: {
          ...state.refresh,
          artifacts: {
            ...state.refresh.artifacts,
            requested: state.refresh.artifacts.requested + 1,
          },
          winners: {
            ...state.refresh.winners,
            requested: state.refresh.winners.requested + 1,
          },
        },
        status: outcome.status,
      };
    }
    case "downloadSucceeded": {
      if (!tokenMatches(event.token, state.activeRequests.download)) {
        return state;
      }
      const activeRequests = withoutActive(state, "download");
      const outcome = readOutcome(state.reads, activeRequests);
      return {
        ...state,
        activeRequests,
        diagnostic: outcome.diagnostic,
        downloadFailure: null,
        status: outcome.status,
      };
    }
    case "refreshConsumed": {
      const cursor = state.refresh[event.operation];
      if (
        event.version !== cursor.requested
        || cursor.consumed >= cursor.requested
      ) {
        return state;
      }
      return {
        ...state,
        refresh: {
          ...state.refresh,
          [event.operation]: { ...cursor, consumed: event.version },
        },
      };
    }
    case "draftChanged":
      return updateDraft(state, event.field, event.value);
  }
};

export const selectAdminDurableReviewCapabilities = (
  state: AdminDurableReviewWorkflowState,
) => {
  const ready = state.status === "ready";
  const readOnly = state.status === "degraded";

  return {
    canDecide: Boolean(
      ready
      && state.identity.sessionKey
      && state.identity.selectedCampaignId
      && state.identity.selectedParticipantId
      && state.reads.detail.current
      && state.reads.detail.status === "ready"
      && !state.activeRequests.decision
      && !state.activeRequests.detail,
    ),
    canDownload: Boolean(
      ready
      && state.identity.sessionKey
      && state.identity.selectedCampaignId
      && state.identity.selectedArtifactId
      && state.reads.artifactDetail.current
      && state.reads.artifactDetail.status === "ready"
      && !state.activeRequests.download
      && !state.activeRequests.artifactDetail,
    ),
    canGenerate: Boolean(
      ready
      && state.identity.sessionKey
      && state.identity.selectedCampaignId
      && state.reads.winners.current
      && state.reads.winners.status === "ready"
      && !state.activeRequests.generate
      && !state.activeRequests.winners,
    ),
    readOnly,
  };
};

const retryTargetMatchesIdentity = (
  target: AdminDurableReviewRetryTarget,
  state: AdminDurableReviewWorkflowState,
): boolean => target.epoch === state.epoch
  && target.sessionKey === state.identity.sessionKey
  && target.selectedCampaignId === state.identity.selectedCampaignId
  && target.selectedParticipantId === state.identity.selectedParticipantId
  && target.selectedArtifactId === state.identity.selectedArtifactId;

export const selectAdminDurableReviewRetryTarget = (
  state: AdminDurableReviewWorkflowState,
  operation: AdminDurableReviewOperation,
): AdminDurableReviewRetryTarget | null => {
  const target = operation === "download"
    ? state.downloadFailure?.retryTarget ?? null
    : state.diagnostic?.retryTarget ?? null;
  return target
    && target.operation === operation
    && retryTargetMatchesIdentity(target, state)
    ? target
    : null;
};
