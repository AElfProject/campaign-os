import {
  sanitizeProjectOwnerCampaignApiText,
  type AddOwnerCampaignTaskInput,
  type CreateOwnerCampaignInput,
  type GenerateOwnerTaskPreviewInput,
  type OwnerCampaignBridgeCode,
  type OwnerCampaignCreateSuccess,
  type OwnerCampaignDetailSuccess,
  type OwnerCampaignFailure,
  type OwnerCampaignProjection,
  type OwnerTaskPreview,
  type OwnerTaskPreviewSuggestion,
  type OwnerTaskPreviewSuccess,
  type OwnerTaskSuccess,
} from "../../../api/projectOwnerCampaignApiBridge";
import type { NormalizedWalletSession } from "../../../domain/types";

export type OwnerCampaignWorkflowStatus =
  | "no_session"
  | "recovering"
  | "empty"
  | "selection_required"
  | "creating"
  | "loading_detail"
  | "ready"
  | "mutation_pending"
  | "degraded"
  | "error";

export type OwnerCampaignRequestOperation =
  | "recover"
  | "create"
  | "detail"
  | "preview"
  | "add"
  | "adopt";

export interface OwnerCampaignRequestToken {
  campaignId: string | null;
  epoch: number;
  operation: OwnerCampaignRequestOperation;
  sequence: number;
  sessionKey: string;
}

export interface OwnerCampaignWorkflowError {
  code: string;
  httpStatus?: number;
  message: string;
  operation: OwnerCampaignRequestOperation;
  reconnectRequired: boolean;
  retryable: boolean;
  traceId: string;
}

export interface OwnerCampaignWorkflowState {
  activeCampaignId: string | null;
  candidates: readonly OwnerCampaignProjection[];
  createdCampaign: OwnerCampaignProjection | null;
  detail: OwnerCampaignDetailSuccess | null;
  epoch: number;
  error: OwnerCampaignWorkflowError | null;
  expectedTaskId: string | null;
  pending: OwnerCampaignRequestToken | null;
  preview: OwnerTaskPreview | null;
  recoveryResolved: boolean;
  sequence: number;
  sessionKey: string | null;
  status: OwnerCampaignWorkflowStatus;
}

export type OwnerCampaignWorkflowEvent =
  | {
      type: "synchronize_context";
      campaignId: string | null;
      sessionKey: string | null;
    }
  | {
      type: "requests_invalidated";
    }
  | {
      type: "request_started";
      token: OwnerCampaignRequestToken;
    }
  | {
      type: "recovery_succeeded";
      campaigns: readonly OwnerCampaignProjection[];
      token: OwnerCampaignRequestToken;
    }
  | {
      type: "campaign_selected";
      campaignId: string;
    }
  | {
      type: "create_succeeded";
      result: OwnerCampaignCreateSuccess;
      token: OwnerCampaignRequestToken;
    }
  | {
      type: "detail_succeeded";
      result: OwnerCampaignDetailSuccess;
      token: OwnerCampaignRequestToken;
    }
  | {
      type: "preview_succeeded";
      result: OwnerTaskPreviewSuccess;
      token: OwnerCampaignRequestToken;
    }
  | {
      type: "mutation_succeeded";
      result: OwnerTaskSuccess;
      token: OwnerCampaignRequestToken;
    }
  | {
      type: "request_failed";
      failure: OwnerCampaignFailure;
      token: OwnerCampaignRequestToken;
    };

export interface OwnerCampaignOwnerContext {
  accountType: NormalizedWalletSession["accountType"];
  address: string;
  sessionId: string;
  sessionKey: string;
  walletSource: NormalizedWalletSession["walletSource"];
}

export interface OwnerCampaignBuilderIntentContract {
  activeCampaignId: string | null;
  createPending: boolean;
  createResult: OwnerCampaignProjection | null;
  onCreate: (input: CreateOwnerCampaignInput) => void;
  onRetryDetail: () => void;
  ownerContext: OwnerCampaignOwnerContext | null;
}

export interface OwnerCampaignTaskIntentContract {
  activeCampaignId: string | null;
  commandsDisabled: boolean;
  detail: OwnerCampaignDetailSuccess | null;
  onAdd: (input: AddOwnerCampaignTaskInput) => void;
  onAdopt: (suggestion: OwnerTaskPreviewSuggestion) => void;
  onGenerate: (input: GenerateOwnerTaskPreviewInput) => void;
  pendingCommand: OwnerCampaignRequestOperation | null;
  preview: OwnerTaskPreview | null;
  tasks: OwnerCampaignDetailSuccess["tasks"];
}

export type ProjectOwnerCampaignDisplayField = "code" | "message" | "traceId";

const ownerCampaignDisplayFallbacks: Record<ProjectOwnerCampaignDisplayField, string> = {
  code: "OWNER_CAMPAIGN_ERROR_REDACTED",
  message: "Owner campaign request failed. Unsafe diagnostic details were redacted.",
  traceId: "trace-redacted",
};

const ownerCampaignDisplayLimits: Record<ProjectOwnerCampaignDisplayField, number> = {
  code: 64,
  message: 240,
  traceId: 128,
};

const ownerCampaignDisplayScanLimit = 4_096;

const ownerCampaignBridgeDisplayMessages = {
  BRIDGE_BASE_URL_INVALID: "Owner campaign service is unavailable.",
  BRIDGE_BASE_URL_MISSING: "Owner campaign service is unavailable.",
  BRIDGE_INVALID_INPUT: "Owner campaign request was invalid.",
  BRIDGE_REQUEST_ABORTED: "Owner campaign request was canceled.",
  BRIDGE_REQUEST_FAILED: "Campaign data is temporarily unavailable.",
  BRIDGE_REQUEST_TIMEOUT: "Owner campaign request timed out.",
  BRIDGE_RESPONSE_INVALID: "Owner campaign service returned an invalid response.",
  BRIDGE_RESPONSE_NON_JSON: "Owner campaign service returned an invalid response.",
  BRIDGE_RESPONSE_OVERSIZE: "Owner campaign service returned an invalid response.",
} satisfies Record<OwnerCampaignBridgeCode, string>;

const ownerCampaignServerDisplayMessages = {
  AUTH_FORBIDDEN: "This wallet is not authorized to manage this campaign.",
  AUTH_OWNER_MISMATCH: "This wallet is not authorized to manage this campaign.",
  AUTH_SESSION_INVALID: "Wallet session is no longer valid. Reconnect and try again.",
  AUTH_SESSION_REQUIRED: "Wallet session is no longer valid. Reconnect and try again.",
  INVALID_CAMPAIGN: "Owner campaign was not found.",
  INVALID_REQUEST: "Owner campaign request was invalid.",
  PERSISTENCE_UNAVAILABLE: "Campaign data is temporarily unavailable.",
} as const;

const ownerCampaignDisplayMessageByCode = new Map<string, string>([
  ...Object.entries(ownerCampaignBridgeDisplayMessages),
  ...Object.entries(ownerCampaignServerDisplayMessages),
]);

const toBoundedOwnerCampaignDisplayText = (value: unknown): string => {
  try {
    if (typeof value === "string") {
      return value.slice(0, ownerCampaignDisplayScanLimit);
    }

    return "";
  } catch {
    return "";
  }
};

const controlledOwnerCampaignMessageForCode = (value: unknown): string => {
  if (typeof value !== "string" || value.length > ownerCampaignDisplayLimits.code) {
    return ownerCampaignDisplayFallbacks.message;
  }

  return ownerCampaignDisplayMessageByCode.get(value) ?? ownerCampaignDisplayFallbacks.message;
};

export const sanitizeProjectOwnerCampaignDisplayText = (
  value: unknown,
  field: ProjectOwnerCampaignDisplayField = "message",
): string => {
  const fallback = ownerCampaignDisplayFallbacks[field] ?? ownerCampaignDisplayFallbacks.message;

  try {
    const raw = toBoundedOwnerCampaignDisplayText(value);

    if (field === "message") {
      return fallback;
    }

    if (!raw || raw.length > ownerCampaignDisplayLimits[field]) {
      return fallback;
    }

    if (field === "code") {
      return /^[A-Z][A-Z0-9_]*$/.test(raw) ? raw : fallback;
    }

    if (field === "traceId") {
      return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(raw) ? raw : fallback;
    }

    return fallback;
  } catch {
    return fallback;
  }
};

const nextCounter = (value: number) =>
  value < Number.MAX_SAFE_INTEGER ? value + 1 : Number.MAX_SAFE_INTEGER;

const sameNullableText = (left: string | null, right: string | null) =>
  left === right;

const sameToken = (
  left: OwnerCampaignRequestToken,
  right: OwnerCampaignRequestToken,
) =>
  left.campaignId === right.campaignId
  && left.epoch === right.epoch
  && left.operation === right.operation
  && left.sequence === right.sequence
  && left.sessionKey === right.sessionKey;

const identityMismatchError = (
  operation: OwnerCampaignRequestOperation,
  code: string,
  message: string,
  token: OwnerCampaignRequestToken,
): OwnerCampaignWorkflowError => ({
  code,
  message,
  operation,
  reconnectRequired: false,
  retryable: operation === "detail",
  traceId: `owner-workflow-${operation}-${token.epoch}-${token.sequence}`,
});

const failedStatus = (state: OwnerCampaignWorkflowState) =>
  state.detail ? "degraded" as const : "error" as const;

const canStartRequest = (
  state: OwnerCampaignWorkflowState,
  token: OwnerCampaignRequestToken,
) => {
  if (
    !state.sessionKey
    || state.pending
    || token.sessionKey !== state.sessionKey
    || token.epoch !== state.epoch
    || token.sequence !== nextCounter(state.sequence)
    || !sameNullableText(token.campaignId, state.activeCampaignId)
  ) {
    return false;
  }

  if (token.operation === "recover") {
    return !state.activeCampaignId
      && !state.recoveryResolved
      && (state.status === "empty"
        || state.status === "error" && state.error?.operation === "recover");
  }

  if (token.operation === "create") {
    return canCreateOwnerCampaign(state);
  }

  if (token.operation === "detail") {
    return Boolean(state.activeCampaignId)
      && ["loading_detail", "ready", "degraded", "error"].includes(state.status);
  }

  return Boolean(state.activeCampaignId)
    && Boolean(state.detail)
    && state.status === "ready";
};

const requestStatus = (
  operation: OwnerCampaignRequestOperation,
): OwnerCampaignWorkflowStatus => {
  if (operation === "recover") {
    return "recovering";
  }

  if (operation === "create") {
    return "creating";
  }

  if (operation === "detail") {
    return "loading_detail";
  }

  return "mutation_pending";
};

const contextState = (
  state: OwnerCampaignWorkflowState,
  sessionKey: string | null,
  campaignId: string | null,
): OwnerCampaignWorkflowState => ({
  activeCampaignId: campaignId,
  candidates: [],
  createdCampaign: null,
  detail: null,
  epoch: nextCounter(state.epoch),
  error: null,
  expectedTaskId: null,
  pending: null,
  preview: null,
  recoveryResolved: Boolean(campaignId),
  sequence: state.sequence,
  sessionKey,
  status: !sessionKey
    ? "no_session"
    : campaignId
      ? "loading_detail"
      : "empty",
});

export const createOwnerSessionKey = (
  session: NormalizedWalletSession | null | undefined,
): string | null => {
  if (!session) {
    return null;
  }

  return [
    session.sessionId,
    session.id,
    session.address.trim().toLowerCase(),
    session.accountType,
    session.walletSource,
    session.chainId,
    session.network,
  ].map((value) => encodeURIComponent(String(value))).join("|");
};

export const createOwnerCampaignWorkflowState = (
  sessionKey: string | null = null,
  activeCampaignId: string | null = null,
): OwnerCampaignWorkflowState => ({
  activeCampaignId,
  candidates: [],
  createdCampaign: null,
  detail: null,
  epoch: 0,
  error: null,
  expectedTaskId: null,
  pending: null,
  preview: null,
  recoveryResolved: Boolean(activeCampaignId),
  sequence: 0,
  sessionKey,
  status: !sessionKey
    ? "no_session"
    : activeCampaignId
      ? "loading_detail"
      : "empty",
});

export const createOwnerCampaignRequestToken = (
  state: OwnerCampaignWorkflowState,
  operation: OwnerCampaignRequestOperation,
  campaignId: string | null = state.activeCampaignId,
): OwnerCampaignRequestToken => ({
  campaignId,
  epoch: state.epoch,
  operation,
  sequence: nextCounter(state.sequence),
  sessionKey: state.sessionKey ?? "",
});

export const ownerCampaignRequestTokenMatches = (
  state: OwnerCampaignWorkflowState,
  token: OwnerCampaignRequestToken,
) =>
  Boolean(state.pending)
  && state.activeCampaignId === token.campaignId
  && state.epoch === token.epoch
  && state.sequence === token.sequence
  && state.sessionKey === token.sessionKey
  && sameToken(state.pending as OwnerCampaignRequestToken, token);

export const projectOwnerCampaignErrorFromFailure = (
  failure: OwnerCampaignFailure,
  operation: OwnerCampaignRequestOperation,
): OwnerCampaignWorkflowError => ({
  code: sanitizeProjectOwnerCampaignDisplayText(failure.code, "code"),
  ...(failure.httpStatus !== undefined ? { httpStatus: failure.httpStatus } : {}),
  message: controlledOwnerCampaignMessageForCode(failure.code),
  operation,
  reconnectRequired: failure.reconnectRequired,
  retryable: failure.retryable,
  traceId: sanitizeProjectOwnerCampaignDisplayText(failure.traceId, "traceId"),
});

export const createUnexpectedOwnerCampaignFailure = (
  operation: OwnerCampaignRequestOperation,
  token: OwnerCampaignRequestToken,
  reason: unknown,
): OwnerCampaignFailure => ({
  bridgeCode: "BRIDGE_REQUEST_FAILED",
  code: "PERSISTENCE_UNAVAILABLE",
  diagnostic: {
    code: "PERSISTENCE_UNAVAILABLE",
    message: "Owner Campaign request failed before a valid response was received.",
    safeDetails: {
      reason: sanitizeProjectOwnerCampaignApiText(reason),
    },
  },
  ok: false,
  reconnectRequired: false,
  retryable: true,
  traceId: `owner-workflow-${operation}-${token.epoch}-${token.sequence}`,
});

export const canCreateOwnerCampaign = (state: OwnerCampaignWorkflowState) =>
  Boolean(state.sessionKey)
  && !state.activeCampaignId
  && !state.pending
  && state.recoveryResolved
  && state.candidates.length === 0
  && (state.status === "empty"
    || state.status === "error" && state.error?.operation === "create");

export const ownerCampaignCommandsDisabled = (state: OwnerCampaignWorkflowState) =>
  !state.sessionKey
  || !state.activeCampaignId
  || Boolean(state.pending)
  || state.status !== "ready";

export const ownerCampaignWorkflowReducer = (
  state: OwnerCampaignWorkflowState,
  event: OwnerCampaignWorkflowEvent,
): OwnerCampaignWorkflowState => {
  if (event.type === "synchronize_context") {
    if (
      state.sessionKey === event.sessionKey
      && state.activeCampaignId === event.campaignId
    ) {
      return state;
    }

    return contextState(state, event.sessionKey, event.campaignId);
  }

  if (event.type === "campaign_selected") {
    if (
      state.status !== "selection_required"
      || state.pending
      || !state.candidates.some((candidate) => candidate.id === event.campaignId)
    ) {
      return state;
    }

    return {
      ...state,
      activeCampaignId: event.campaignId,
      detail: null,
      epoch: nextCounter(state.epoch),
      error: null,
      expectedTaskId: null,
      pending: null,
      preview: null,
      recoveryResolved: true,
      status: "loading_detail",
    };
  }

  if (event.type === "requests_invalidated") {
    if (!state.pending) {
      return state;
    }

    return {
      ...state,
      epoch: nextCounter(state.epoch),
      error: null,
      pending: null,
      recoveryResolved: state.pending.operation === "recover"
        ? false
        : state.recoveryResolved,
      status: !state.sessionKey
        ? "no_session"
        : state.activeCampaignId
          ? "loading_detail"
          : "empty",
    };
  }

  if (event.type === "request_started") {
    if (!canStartRequest(state, event.token)) {
      return state;
    }

    return {
      ...state,
      error: null,
      pending: event.token,
      sequence: event.token.sequence,
      status: requestStatus(event.token.operation),
    };
  }

  if (!ownerCampaignRequestTokenMatches(state, event.token)) {
    return state;
  }

  if (event.type === "request_failed") {
    return {
      ...state,
      error: projectOwnerCampaignErrorFromFailure(
        event.failure,
        event.token.operation,
      ),
      expectedTaskId: ["add", "adopt"].includes(event.token.operation)
        ? null
        : state.expectedTaskId,
      pending: null,
      recoveryResolved: event.token.operation === "recover"
        ? false
        : state.recoveryResolved,
      status: failedStatus(state),
    };
  }

  if (event.type === "recovery_succeeded") {
    if (event.token.operation !== "recover") {
      return state;
    }

    const campaigns = [...event.campaigns];

    if (campaigns.length === 0) {
      return {
        ...state,
        candidates: campaigns,
        error: null,
        pending: null,
        recoveryResolved: true,
        status: "empty",
      };
    }

    if (campaigns.length === 1) {
      return {
        ...state,
        activeCampaignId: campaigns[0].id,
        candidates: campaigns,
        detail: null,
        epoch: nextCounter(state.epoch),
        error: null,
        pending: null,
        preview: null,
        recoveryResolved: true,
        status: "loading_detail",
      };
    }

    return {
      ...state,
      candidates: campaigns,
      error: null,
      pending: null,
      recoveryResolved: true,
      status: "selection_required",
    };
  }

  if (event.type === "create_succeeded") {
    if (event.token.operation !== "create") {
      return state;
    }

    if (
      !event.result.campaignId
      || event.result.campaign.id !== event.result.campaignId
    ) {
      return {
        ...state,
        error: identityMismatchError(
          "create",
          "OWNER_CAMPAIGN_IDENTITY_MISMATCH",
          "Campaign create returned conflicting canonical identities.",
          event.token,
        ),
        pending: null,
        status: failedStatus(state),
      };
    }

    return {
      ...state,
      activeCampaignId: event.result.campaignId,
      createdCampaign: event.result.campaign,
      detail: null,
      epoch: nextCounter(state.epoch),
      error: null,
      expectedTaskId: null,
      pending: null,
      preview: null,
      recoveryResolved: true,
      status: "loading_detail",
    };
  }

  if (event.type === "detail_succeeded") {
    if (event.token.operation !== "detail") {
      return state;
    }

    const campaignIdMatches = event.result.campaign.id === event.token.campaignId;
    const taskCampaignIdsMatch = event.result.tasks.every(
      (task) => !task.campaignId || task.campaignId === event.token.campaignId,
    );

    if (!campaignIdMatches || !taskCampaignIdsMatch) {
      return {
        ...state,
        error: identityMismatchError(
          "detail",
          "OWNER_CAMPAIGN_IDENTITY_MISMATCH",
          "Campaign detail identity did not match the active Campaign.",
          event.token,
        ),
        pending: null,
        status: failedStatus(state),
      };
    }

    const expectedTaskPresent = !state.expectedTaskId
      || event.result.tasks.some((task) => task.id === state.expectedTaskId);

    if (!expectedTaskPresent) {
      return {
        ...state,
        detail: event.result,
        error: identityMismatchError(
          "detail",
          "OWNER_TASK_IDENTITY_MISMATCH",
          "Campaign detail did not contain the canonical Task returned by mutation.",
          event.token,
        ),
        expectedTaskId: null,
        pending: null,
        status: "degraded",
      };
    }

    return {
      ...state,
      detail: event.result,
      error: null,
      expectedTaskId: null,
      pending: null,
      status: "ready",
    };
  }

  if (event.type === "preview_succeeded") {
    if (
      event.token.operation !== "preview"
      || event.result.preview.campaignId !== event.token.campaignId
    ) {
      return event.token.operation !== "preview"
        ? state
        : {
            ...state,
            error: identityMismatchError(
              "preview",
              "OWNER_CAMPAIGN_IDENTITY_MISMATCH",
              "Task preview identity did not match the active Campaign.",
              event.token,
            ),
            pending: null,
            status: failedStatus(state),
          };
    }

    return {
      ...state,
      error: null,
      pending: null,
      preview: event.result.preview,
      status: "ready",
    };
  }

  if (event.type === "mutation_succeeded") {
    if (!["add", "adopt"].includes(event.token.operation)) {
      return state;
    }

    if (event.result.taskId !== event.result.task.id) {
      return {
        ...state,
        error: identityMismatchError(
          event.token.operation,
          "OWNER_TASK_IDENTITY_MISMATCH",
          "Task mutation returned conflicting canonical identities.",
          event.token,
        ),
        pending: null,
        status: failedStatus(state),
      };
    }

    if (
      event.result.task.campaignId
      && event.result.task.campaignId !== event.token.campaignId
    ) {
      return {
        ...state,
        error: identityMismatchError(
          event.token.operation,
          "OWNER_CAMPAIGN_IDENTITY_MISMATCH",
          "Task mutation identity did not match the active Campaign.",
          event.token,
        ),
        pending: null,
        status: failedStatus(state),
      };
    }

    return {
      ...state,
      error: null,
      expectedTaskId: event.result.taskId,
      pending: null,
      status: "loading_detail",
    };
  }

  return state;
};
