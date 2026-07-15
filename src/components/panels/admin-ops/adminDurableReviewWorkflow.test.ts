import { describe, expect, it } from "vitest";
import {
  adminDurableReviewWorkflowReducer,
  createAdminDurableReviewWorkflowState,
  nextAdminDurableReviewRequestToken,
  selectAdminDurableReviewCapabilities,
  type AdminDurableReviewWorkflowState,
} from "./adminDurableReviewWorkflow";

const sessionA = "sess-a|2F4OperatorA";
const sessionB = "sess-b|2F4OperatorB";

const start = (
  state: AdminDurableReviewWorkflowState,
  operation: Parameters<typeof nextAdminDurableReviewRequestToken>[1],
  expectedContentHash?: string,
) => {
  const token = nextAdminDurableReviewRequestToken(
    state,
    operation,
    expectedContentHash ? { expectedContentHash } : undefined,
  );
  return {
    state: adminDurableReviewWorkflowReducer(state, { token, type: "requestStarted" }),
    token,
  };
};

describe("admin durable review workflow", () => {
  it("initializes no-session and clears all protected state on session changes", () => {
    const initial = createAdminDurableReviewWorkflowState(null);
    const connected = adminDurableReviewWorkflowReducer(initial, {
      sessionKey: sessionA,
      type: "sessionChanged",
    });
    const campaignSelected = adminDurableReviewWorkflowReducer(connected, {
      campaignId: "campaign-a",
      type: "campaignSelected",
    });
    const disconnected = adminDurableReviewWorkflowReducer(campaignSelected, {
      sessionKey: null,
      type: "sessionChanged",
    });
    const reconnected = adminDurableReviewWorkflowReducer(disconnected, {
      sessionKey: sessionB,
      type: "sessionChanged",
    });

    expect(initial).toMatchObject({ epoch: 0, status: "no_session" });
    expect(connected).toMatchObject({
      epoch: 1,
      identity: { sessionKey: sessionA },
      status: "loading",
    });
    expect(disconnected).toMatchObject({
      identity: {
        selectedArtifactId: null,
        selectedCampaignId: null,
        selectedParticipantId: null,
        sessionKey: null,
      },
      status: "no_session",
    });
    expect(Object.values(disconnected.reads).every((slot) => slot.current === null)).toBe(true);
    expect(reconnected.identity.sessionKey).toBe(sessionB);
    expect(reconnected.epoch).toBe(disconnected.epoch + 1);
  });

  it("accepts only the active full-identity epoch and sequence token", () => {
    let state = createAdminDurableReviewWorkflowState(sessionA);
    const first = start(state, "campaigns");
    state = first.state;
    const second = start(state, "campaigns");
    state = second.state;

    const late = adminDurableReviewWorkflowReducer(state, {
      data: { campaigns: [{ campaignId: "late" }] },
      token: first.token,
      type: "readSucceeded",
    });
    const current = adminDurableReviewWorkflowReducer(late, {
      data: { campaigns: [{ campaignId: "current" }] },
      token: second.token,
      type: "readSucceeded",
    });

    expect(late).toBe(state);
    expect(current.reads.campaigns.current).toEqual({
      campaigns: [{ campaignId: "current" }],
    });
    expect(current.reads.campaigns.lastGood).toMatchObject({
      identityKey: expect.stringContaining(sessionA),
    });
    expect(current.status).toBe("ready");
  });

  it("ignores Campaign A responses after selecting Campaign B and clears incompatible reads", () => {
    let state = createAdminDurableReviewWorkflowState(sessionA);
    state = adminDurableReviewWorkflowReducer(state, {
      campaignId: "campaign-a",
      type: "campaignSelected",
    });
    const request = start(state, "queue");
    state = adminDurableReviewWorkflowReducer(request.state, {
      campaignId: "campaign-b",
      type: "campaignSelected",
    });
    const late = adminDurableReviewWorkflowReducer(state, {
      data: { campaignId: "campaign-a", items: [] },
      token: request.token,
      type: "readSucceeded",
    });

    expect(late).toBe(state);
    expect(state.identity).toMatchObject({
      selectedCampaignId: "campaign-b",
      selectedParticipantId: null,
    });
    expect(state.reads.queue.current).toBeNull();
  });

  it("ignores Participant A detail after selecting Participant B", () => {
    let state = createAdminDurableReviewWorkflowState(sessionA);
    state = adminDurableReviewWorkflowReducer(state, {
      campaignId: "campaign-a",
      type: "campaignSelected",
    });
    state = adminDurableReviewWorkflowReducer(state, {
      participantId: "participant-a",
      type: "participantSelected",
    });
    const request = start(state, "detail");
    state = adminDurableReviewWorkflowReducer(request.state, {
      participantId: "participant-b",
      type: "participantSelected",
    });

    const late = adminDurableReviewWorkflowReducer(state, {
      data: { participantId: "participant-a" },
      token: request.token,
      type: "readSucceeded",
    });

    expect(late).toBe(state);
    expect(state.identity.selectedParticipantId).toBe("participant-b");
    expect(state.reads.detail.current).toBeNull();
  });

  it("preserves same-identity last-good reads on retryable failure and disables mutation", () => {
    let state = createAdminDurableReviewWorkflowState(sessionA);
    state = adminDurableReviewWorkflowReducer(state, {
      campaignId: "campaign-a",
      type: "campaignSelected",
    });
    state = adminDurableReviewWorkflowReducer(state, {
      participantId: "participant-a",
      type: "participantSelected",
    });
    const readyRequest = start(state, "detail");
    state = adminDurableReviewWorkflowReducer(readyRequest.state, {
      data: { participantId: "participant-a", reviewState: "pending_review" },
      token: readyRequest.token,
      type: "readSucceeded",
    });
    const failedRequest = start(state, "detail");
    state = adminDurableReviewWorkflowReducer(failedRequest.state, {
      failure: {
        code: "BRIDGE_REQUEST_TIMEOUT",
        reconnectRequired: false,
        retryable: true,
        traceId: "trace-timeout",
      },
      token: failedRequest.token,
      type: "requestFailed",
    });

    expect(state.status).toBe("degraded");
    expect(state.reads.detail.current).toEqual({
      participantId: "participant-a",
      reviewState: "pending_review",
    });
    expect(state.reads.detail.lastGood?.data).toEqual(state.reads.detail.current);
    expect(state.diagnostic).toMatchObject({
      code: "BRIDGE_REQUEST_TIMEOUT",
      epoch: state.epoch,
      failedOperation: "detail",
      retryTarget: {
        epoch: state.epoch,
        operation: "detail",
        selectedCampaignId: "campaign-a",
        selectedParticipantId: "participant-a",
        sessionKey: sessionA,
      },
      selectedCampaignId: "campaign-a",
      selectedParticipantId: "participant-a",
      sessionKey: sessionA,
    });
    expect(selectAdminDurableReviewCapabilities(state)).toEqual({
      canDecide: false,
      canDownload: false,
      canGenerate: false,
      readOnly: true,
    });
  });

  it("keeps download failure independent and retries only its identity-scoped validated hash", () => {
    const expectedContentHash = "d".repeat(64);
    let state = createAdminDurableReviewWorkflowState(sessionA);
    state = adminDurableReviewWorkflowReducer(state, {
      campaignId: "campaign-a",
      type: "campaignSelected",
    });
    state = adminDurableReviewWorkflowReducer(state, {
      artifactId: "artifact-a",
      type: "artifactSelected",
    });

    const request = start(state, "download", expectedContentHash);
    state = adminDurableReviewWorkflowReducer(request.state, {
      failure: {
        code: "BRIDGE_REQUEST_TIMEOUT",
        reconnectRequired: false,
        retryable: true,
        traceId: "trace-download-timeout",
      },
      token: request.token,
      type: "requestFailed",
    });

    expect(state.status).toBe("ready");
    expect(state.diagnostic).toBeNull();
    expect(state.downloadFailure).toMatchObject({
      code: "BRIDGE_REQUEST_TIMEOUT",
      failedOperation: "download",
      retryTarget: {
        epoch: state.epoch,
        expectedContentHash,
        operation: "download",
        selectedArtifactId: "artifact-a",
        selectedCampaignId: "campaign-a",
        sessionKey: sessionA,
      },
      traceId: "trace-download-timeout",
    });

    const retry = start(state, "download", expectedContentHash);
    expect(retry.state.downloadFailure).toBeNull();
    state = adminDurableReviewWorkflowReducer(retry.state, {
      token: retry.token,
      type: "downloadSucceeded",
    });

    expect(state.downloadFailure).toBeNull();
    expect(state.status).toBe("ready");
  });

  it("ignores superseded download responses and never exposes command retries", () => {
    const expectedContentHash = "d".repeat(64);
    let state = createAdminDurableReviewWorkflowState(sessionA);
    state = adminDurableReviewWorkflowReducer(state, {
      campaignId: "campaign-a",
      type: "campaignSelected",
    });
    state = adminDurableReviewWorkflowReducer(state, {
      artifactId: "artifact-a",
      type: "artifactSelected",
    });
    const first = start(state, "download", expectedContentHash);
    const retry = start(first.state, "download", expectedContentHash);
    state = adminDurableReviewWorkflowReducer(retry.state, {
      token: retry.token,
      type: "downloadSucceeded",
    });

    const lateFailure = adminDurableReviewWorkflowReducer(state, {
      failure: {
        code: "BRIDGE_REQUEST_TIMEOUT",
        reconnectRequired: false,
        retryable: true,
        traceId: "trace-late-download",
      },
      token: first.token,
      type: "requestFailed",
    });

    expect(lateFailure).toBe(state);
    expect(state.downloadFailure).toBeNull();

    for (const operation of ["decision", "generate"] as const) {
      const command = start(state, operation);
      state = adminDurableReviewWorkflowReducer(command.state, {
        failure: {
          code: "BRIDGE_REQUEST_TIMEOUT",
          reconnectRequired: false,
          retryable: true,
          traceId: `trace-${operation}`,
        },
        token: command.token,
        type: "requestFailed",
      });
      expect(state.diagnostic).toMatchObject({
        failedOperation: operation,
        retryTarget: null,
      });
    }
  });

  it("clears a failed download target on Artifact or session identity changes", () => {
    const expectedContentHash = "d".repeat(64);
    let state = createAdminDurableReviewWorkflowState(sessionA);
    state = adminDurableReviewWorkflowReducer(state, {
      campaignId: "campaign-a",
      type: "campaignSelected",
    });
    state = adminDurableReviewWorkflowReducer(state, {
      artifactId: "artifact-a",
      type: "artifactSelected",
    });
    const artifactARequest = start(state, "download", expectedContentHash);
    state = adminDurableReviewWorkflowReducer(artifactARequest.state, {
      failure: {
        code: "BRIDGE_REQUEST_TIMEOUT",
        reconnectRequired: false,
        retryable: true,
        traceId: "trace-artifact-a",
      },
      token: artifactARequest.token,
      type: "requestFailed",
    });
    expect(state.downloadFailure).not.toBeNull();

    const artifactB = adminDurableReviewWorkflowReducer(state, {
      artifactId: "artifact-b",
      type: "artifactSelected",
    });
    expect(artifactB.downloadFailure).toBeNull();
    expect(artifactB.identity.selectedArtifactId).toBe("artifact-b");

    const lateArtifactA = adminDurableReviewWorkflowReducer(artifactB, {
      failure: {
        code: "BRIDGE_REQUEST_TIMEOUT",
        reconnectRequired: false,
        retryable: true,
        traceId: "trace-late-artifact-a",
      },
      token: artifactARequest.token,
      type: "requestFailed",
    });
    expect(lateArtifactA).toBe(artifactB);

    const artifactBRequest = start(artifactB, "download", "e".repeat(64));
    state = adminDurableReviewWorkflowReducer(artifactBRequest.state, {
      failure: {
        code: "BRIDGE_REQUEST_TIMEOUT",
        reconnectRequired: false,
        retryable: true,
        traceId: "trace-artifact-b",
      },
      token: artifactBRequest.token,
      type: "requestFailed",
    });
    state = adminDurableReviewWorkflowReducer(state, {
      sessionKey: sessionB,
      type: "sessionChanged",
    });

    expect(state.downloadFailure).toBeNull();
    expect(state.identity).toMatchObject({
      selectedArtifactId: null,
      selectedCampaignId: null,
      sessionKey: sessionB,
    });
  });

  it("stays degraded until every failed parallel read recovers", () => {
    let state = createAdminDurableReviewWorkflowState(sessionA);
    state = adminDurableReviewWorkflowReducer(state, {
      campaignId: "campaign-a",
      type: "campaignSelected",
    });
    const winners = start(state, "winners");
    const artifacts = start(winners.state, "artifacts");
    state = adminDurableReviewWorkflowReducer(artifacts.state, {
      failure: {
        code: "BRIDGE_REQUEST_TIMEOUT",
        reconnectRequired: false,
        retryable: true,
        traceId: "trace-winners-timeout",
      },
      token: winners.token,
      type: "requestFailed",
    });
    state = adminDurableReviewWorkflowReducer(state, {
      data: { artifacts: [], campaignId: "campaign-a" },
      token: artifacts.token,
      type: "readSucceeded",
    });

    expect(state.status).toBe("degraded");
    expect(state.diagnostic?.traceId).toBe("trace-winners-timeout");
    expect(state.reads.winners.failure?.code).toBe("BRIDGE_REQUEST_TIMEOUT");

    const retry = start(state, "winners");
    state = adminDurableReviewWorkflowReducer(retry.state, {
      data: { campaignId: "campaign-a", rows: [] },
      token: retry.token,
      type: "readSucceeded",
    });

    expect(state.status).toBe("ready");
    expect(state.diagnostic).toBeNull();
    expect(state.reads.winners.failure).toBeNull();
  });

  it("keeps mutation disabled while its authoritative read is refreshing", () => {
    let state = createAdminDurableReviewWorkflowState(sessionA);
    state = adminDurableReviewWorkflowReducer(state, {
      campaignId: "campaign-a",
      type: "campaignSelected",
    });
    state = adminDurableReviewWorkflowReducer(state, {
      participantId: "participant-a",
      type: "participantSelected",
    });
    const initial = start(state, "detail");
    state = adminDurableReviewWorkflowReducer(initial.state, {
      data: { participantId: "participant-a", reviewState: "pending_review" },
      token: initial.token,
      type: "readSucceeded",
    });
    expect(selectAdminDurableReviewCapabilities(state).canDecide).toBe(true);

    state = start(state, "detail").state;

    expect(state.reads.detail.status).toBe("loading");
    expect(selectAdminDurableReviewCapabilities(state).canDecide).toBe(false);
  });

  it("keeps command-pending status while parallel reads finish", () => {
    let state = createAdminDurableReviewWorkflowState(sessionA);
    state = adminDurableReviewWorkflowReducer(state, {
      campaignId: "campaign-a",
      type: "campaignSelected",
    });
    const queue = start(state, "queue");
    const decision = start(queue.state, "decision");
    state = adminDurableReviewWorkflowReducer(decision.state, {
      data: { campaignId: "campaign-a", items: [] },
      token: queue.token,
      type: "readSucceeded",
    });

    expect(state.activeRequests.decision).toEqual(decision.token);
    expect(state.status).toBe("command_pending");
    expect(selectAdminDurableReviewCapabilities(state).canGenerate).toBe(false);
  });

  it("returns to ready when optional Campaign, Participant, or Artifact selections are cleared", () => {
    let state = createAdminDurableReviewWorkflowState(sessionA);
    state = adminDurableReviewWorkflowReducer(state, {
      campaignId: "campaign-a",
      type: "campaignSelected",
    });
    state = adminDurableReviewWorkflowReducer(state, {
      campaignId: null,
      type: "campaignSelected",
    });
    expect(state.status).toBe("ready");

    state = adminDurableReviewWorkflowReducer(state, {
      campaignId: "campaign-a",
      type: "campaignSelected",
    });
    state = adminDurableReviewWorkflowReducer(state, {
      participantId: "participant-a",
      type: "participantSelected",
    });
    state = adminDurableReviewWorkflowReducer(state, {
      participantId: null,
      type: "participantSelected",
    });
    expect(state.status).toBe("ready");

    state = adminDurableReviewWorkflowReducer(state, {
      artifactId: "artifact-a",
      type: "artifactSelected",
    });
    state = adminDurableReviewWorkflowReducer(state, {
      artifactId: null,
      type: "artifactSelected",
    });
    expect(state.status).toBe("ready");
  });

  it("clears protected reads and selections on reconnect-required failure", () => {
    let state = createAdminDurableReviewWorkflowState(sessionA);
    state = adminDurableReviewWorkflowReducer(state, {
      campaignId: "campaign-a",
      type: "campaignSelected",
    });
    const request = start(state, "queue");
    state = adminDurableReviewWorkflowReducer(request.state, {
      failure: {
        code: "AUTH_SESSION_INVALID",
        httpStatus: 401,
        reconnectRequired: true,
        retryable: false,
        traceId: "trace-auth",
      },
      token: request.token,
      type: "requestFailed",
    });

    expect(state.status).toBe("reconnect");
    expect(state.identity).toMatchObject({
      selectedArtifactId: null,
      selectedCampaignId: null,
      selectedParticipantId: null,
      sessionKey: sessionA,
    });
    expect(Object.values(state.reads).every((slot) => slot.current === null)).toBe(true);
  });

  it("turns one decision receipt into exactly one queue and detail refresh intent", () => {
    let state = createAdminDurableReviewWorkflowState(sessionA);
    state = adminDurableReviewWorkflowReducer(state, {
      campaignId: "campaign-a",
      type: "campaignSelected",
    });
    state = adminDurableReviewWorkflowReducer(state, {
      participantId: "participant-a",
      type: "participantSelected",
    });
    const request = start(state, "decision");
    expect(request.state.status).toBe("command_pending");
    const succeeded = adminDurableReviewWorkflowReducer(request.state, {
      receipt: { created: true, decisionId: "decision-a" },
      token: request.token,
      type: "decisionSucceeded",
    });
    const duplicate = adminDurableReviewWorkflowReducer(succeeded, {
      receipt: { created: true, decisionId: "decision-a" },
      token: request.token,
      type: "decisionSucceeded",
    });

    expect(succeeded.refresh).toMatchObject({
      detail: { consumed: 0, requested: 1 },
      queue: { consumed: 0, requested: 1 },
    });
    expect(duplicate).toBe(succeeded);
    expect(succeeded.reads.queue.current).toBeNull();
    expect(succeeded.reads.detail.current).toBeNull();
  });

  it("turns one generate receipt into exactly one artifacts and winners refresh intent", () => {
    let state = createAdminDurableReviewWorkflowState(sessionA);
    state = adminDurableReviewWorkflowReducer(state, {
      campaignId: "campaign-a",
      type: "campaignSelected",
    });
    const request = start(state, "generate");
    state = adminDurableReviewWorkflowReducer(request.state, {
      receipt: { artifact: { artifactId: "artifact-a" }, created: true },
      token: request.token,
      type: "generateSucceeded",
    });
    const consumed = adminDurableReviewWorkflowReducer(state, {
      operation: "artifacts",
      type: "refreshConsumed",
      version: 1,
    });
    const repeatedConsume = adminDurableReviewWorkflowReducer(consumed, {
      operation: "artifacts",
      type: "refreshConsumed",
      version: 1,
    });

    expect(state.refresh).toMatchObject({
      artifacts: { consumed: 0, requested: 1 },
      winners: { consumed: 0, requested: 1 },
    });
    expect(consumed.refresh.artifacts).toEqual({ consumed: 1, requested: 1 });
    expect(repeatedConsume).toBe(consumed);
    expect(state.reads.artifacts.current).toBeNull();
    expect(state.reads.winners.current).toBeNull();
  });

  it("resets bounded drafts when protected identity changes", () => {
    let state = createAdminDurableReviewWorkflowState(sessionA);
    state = adminDurableReviewWorkflowReducer(state, {
      field: "decisionNote",
      type: "draftChanged",
      value: "review note",
    });
    state = adminDurableReviewWorkflowReducer(state, {
      field: "artifactFormat",
      type: "draftChanged",
      value: "json",
    });
    state = adminDurableReviewWorkflowReducer(state, {
      campaignId: "campaign-a",
      type: "campaignSelected",
    });

    expect(state.draft).toEqual({
      artifactFormat: "csv",
      decision: "approved",
      decisionNote: "",
      queueState: "all",
      reasonCode: "evidence_verified",
    });
  });

  it("preserves Campaign filters while resetting only Participant decision draft", () => {
    let state = createAdminDurableReviewWorkflowState(sessionA);
    state = adminDurableReviewWorkflowReducer(state, {
      campaignId: "campaign-a",
      type: "campaignSelected",
    });
    for (const event of [
      { field: "artifactFormat", type: "draftChanged", value: "json" },
      { field: "queueState", type: "draftChanged", value: "stale" },
      { field: "decision", type: "draftChanged", value: "rejected" },
      { field: "decisionNote", type: "draftChanged", value: "participant-specific" },
      { field: "reasonCode", type: "draftChanged", value: "evidence_invalid" },
    ] as const) {
      state = adminDurableReviewWorkflowReducer(state, event);
    }

    state = adminDurableReviewWorkflowReducer(state, {
      participantId: "participant-a",
      type: "participantSelected",
    });

    expect(state.draft).toEqual({
      artifactFormat: "json",
      decision: "approved",
      decisionNote: "",
      queueState: "stale",
      reasonCode: "evidence_verified",
    });
  });

  it("rejects oversized notes and invalid enum-like draft values", () => {
    const state = createAdminDurableReviewWorkflowState(sessionA);
    const oversized = adminDurableReviewWorkflowReducer(state, {
      field: "decisionNote",
      type: "draftChanged",
      value: "x".repeat(1_001),
    });
    const invalidReason = adminDurableReviewWorkflowReducer(state, {
      field: "reasonCode",
      type: "draftChanged",
      value: "INVALID REASON",
    });
    const invalidDecision = adminDurableReviewWorkflowReducer(state, {
      field: "decision",
      type: "draftChanged",
      value: "force_approved",
    });

    expect(oversized).toBe(state);
    expect(invalidReason).toBe(state);
    expect(invalidDecision).toBe(state);
  });
});
