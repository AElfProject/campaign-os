import { describe, expect, it } from "vitest";
import type {
  OwnerCampaignCreateSuccess,
  OwnerCampaignDetailSuccess,
  OwnerCampaignFailure,
  OwnerCampaignId,
  OwnerCampaignProjection,
  OwnerTaskId,
  OwnerTaskPreviewSuccess,
  OwnerTaskSuccess,
} from "../../../api/projectOwnerCampaignApiBridge";
import {
  canCreateOwnerCampaign,
  createOwnerCampaignRequestToken,
  createOwnerCampaignWorkflowState,
  ownerCampaignCommandsDisabled,
  ownerCampaignRequestTokenMatches,
  ownerCampaignWorkflowReducer,
  projectOwnerCampaignErrorFromFailure,
  sanitizeProjectOwnerCampaignDisplayText,
  type OwnerCampaignRequestOperation,
  type OwnerCampaignWorkflowState,
} from "./ownerCampaignWorkflow";

const campaign = (id: string): OwnerCampaignProjection => ({
  id: id as OwnerCampaignId,
  ownerAddress: "ELF_OWNER",
  projectId: "awaken",
  status: "draft",
});

const detail = (
  campaignId: string,
  taskIds: readonly string[] = [],
): OwnerCampaignDetailSuccess => ({
  campaign: campaign(campaignId),
  httpStatus: 200,
  ok: true,
  tasks: taskIds.map((taskId) => ({
    campaignId: campaignId as OwnerCampaignId,
    id: taskId as OwnerTaskId,
    points: 40,
    required: true,
    templateCode: "connect_wallet",
    verificationType: "WALLET",
    walletCompatibility: "ANY",
  })),
  traceId: `trace-detail-${campaignId}`,
});

const failure = (
  code = "PERSISTENCE_UNAVAILABLE",
  overrides: Partial<OwnerCampaignFailure> = {},
): OwnerCampaignFailure => ({
  code,
  diagnostic: {
    code,
    message: "Campaign data is temporarily unavailable.",
  },
  httpStatus: 503,
  ok: false,
  reconnectRequired: false,
  retryable: true,
  traceId: "trace-owner-failure",
  ...overrides,
});

const begin = (
  state: OwnerCampaignWorkflowState,
  operation: OwnerCampaignRequestOperation,
  campaignId: string | null = state.activeCampaignId,
) => {
  const token = createOwnerCampaignRequestToken(state, operation, campaignId);
  const next = ownerCampaignWorkflowReducer(state, {
    type: "request_started",
    token,
  });

  return { state: next, token };
};

const unsafeDisplayMessageCases = [
  {
    fragments: ["alice:secret", "internal-data"],
    name: "credentialed URL",
    value: "Request failed at https://alice:secret@internal.example/internal-data.",
  },
  {
    fragments: ["query-secret", "fragment-secret"],
    name: "query and hash secrets",
    value: "Request failed with ?token=query-secret#access_token=fragment-secret.",
  },
  {
    fragments: ["authorization-secret"],
    name: "Authorization bearer value",
    value: "Authorization: Bearer authorization-secret",
  },
  {
    fragments: ["token-secret"],
    name: "colon-delimited token",
    value: "token: token-secret",
  },
  {
    fragments: ["api-secret"],
    name: "API key assignment",
    value: "api-key=api-secret",
  },
  {
    fragments: ["private-secret"],
    name: "private key assignment",
    value: "private_key: private-secret",
  },
  {
    fragments: ["begin private key", "mii-synthetic-secret", "end private key"],
    name: "PEM block",
    value: "-----BEGIN PRIVATE KEY-----\nMII-SYNTHETIC-SECRET\n-----END PRIVATE KEY-----",
  },
  {
    fragments: ["hidden-workspace", "runtime.log"],
    name: "private filesystem path",
    value: "Read failed at /home/example/hidden-workspace/runtime.log",
  },
  {
    fragments: ["hidden-workspace", "runtime.log"],
    name: "Windows private filesystem path",
    value: "Read failed at C:\\Users\\example\\hidden-workspace\\runtime.log",
  },
  {
    fragments: ["internal-host", "private-share", "runtime.log"],
    name: "UNC private filesystem path",
    value: "Read failed at \\\\internal-host\\private-share\\runtime.log",
  },
  {
    fragments: ["runowner", "stack-secret.ts"],
    name: "stack trace",
    value: "TypeError: failed\n    at runOwner (/opt/service/stack-secret.ts:12:4)",
  },
] as const;

describe("Owner campaign display sanitizer", () => {
  it.each(unsafeDisplayMessageCases)("redacts $name without leaking adjacent material", ({ fragments, value }) => {
    const sanitized = sanitizeProjectOwnerCampaignDisplayText(value, "message");
    const normalized = sanitized.toLowerCase();

    expect(sanitized).toBe("Owner campaign request failed. Unsafe diagnostic details were redacted.");
    for (const fragment of fragments) {
      expect(normalized).not.toContain(fragment);
    }
  });

  it("preserves safe diagnostics, applies field formats, and bounds display length", () => {
    expect(sanitizeProjectOwnerCampaignDisplayText(
      "Campaign data is temporarily unavailable.",
      "message",
    )).toBe("Campaign data is temporarily unavailable.");
    expect(sanitizeProjectOwnerCampaignDisplayText(
      "PERSISTENCE_UNAVAILABLE",
      "code",
    )).toBe("PERSISTENCE_UNAVAILABLE");
    expect(sanitizeProjectOwnerCampaignDisplayText(
      "trace-owner-503",
      "traceId",
    )).toBe("trace-owner-503");

    const bounded = sanitizeProjectOwnerCampaignDisplayText("A".repeat(1_000), "message");
    expect(bounded.length).toBeLessThanOrEqual(240);
    expect(bounded).not.toBe("");
  });

  it("is total and returns stable non-empty fallbacks", () => {
    const hostileValue = {
      toJSON: () => {
        throw new Error("serialization failed");
      },
      toString: () => {
        throw new Error("string conversion failed");
      },
    };

    expect(() => sanitizeProjectOwnerCampaignDisplayText(hostileValue, "message")).not.toThrow();
    expect(sanitizeProjectOwnerCampaignDisplayText(undefined, "message")).not.toBe("");
    expect(sanitizeProjectOwnerCampaignDisplayText(undefined, "code"))
      .toBe("OWNER_CAMPAIGN_ERROR_REDACTED");
    expect(sanitizeProjectOwnerCampaignDisplayText(undefined, "traceId")).toBe("trace-redacted");
  });

  it("projects message, code, and trace ID through field-specific guards", () => {
    const projected = projectOwnerCampaignErrorFromFailure(failure(
      "PERSISTENCE_UNAVAILABLE token: token-secret",
      {
        diagnostic: {
          code: "PERSISTENCE_UNAVAILABLE",
          message: "request https://alice:secret@internal.example/internal-data?token=query-secret",
        },
        traceId: "-----BEGIN PRIVATE KEY-----\nMII-SYNTHETIC-SECRET\n-----END PRIVATE KEY-----",
      },
    ), "recover");
    const serialized = JSON.stringify(projected).toLowerCase();

    expect(projected).toMatchObject({
      code: "OWNER_CAMPAIGN_ERROR_REDACTED",
      message: "Owner campaign request failed. Unsafe diagnostic details were redacted.",
      traceId: "trace-redacted",
    });
    for (const fragment of [
      "alice:secret",
      "internal-data",
      "query-secret",
      "token-secret",
      "mii-synthetic-secret",
    ]) {
      expect(serialized).not.toContain(fragment);
    }
  });
});

describe("owner campaign workflow", () => {
  it("models no-session and session-ready contexts without enabling commands", () => {
    const initial = createOwnerCampaignWorkflowState();

    expect(initial).toMatchObject({
      activeCampaignId: null,
      sessionKey: null,
      status: "no_session",
    });
    expect(ownerCampaignCommandsDisabled(initial)).toBe(true);

    const ready = ownerCampaignWorkflowReducer(initial, {
      type: "synchronize_context",
      campaignId: null,
      sessionKey: "session-a",
    });

    expect(ready.status).toBe("empty");
    expect(ready.epoch).toBe(initial.epoch + 1);
    expect(canCreateOwnerCampaign(ready)).toBe(false);
  });

  it("resolves zero recovery candidates into an explicit create state", () => {
    const initial = createOwnerCampaignWorkflowState("session-a");
    const recovery = begin(initial, "recover", null);

    expect(recovery.state.status).toBe("recovering");
    expect(recovery.state.sequence).toBe(1);
    expect(ownerCampaignRequestTokenMatches(recovery.state, recovery.token)).toBe(true);

    const recovered = ownerCampaignWorkflowReducer(recovery.state, {
      type: "recovery_succeeded",
      campaigns: [],
      token: recovery.token,
    });

    expect(recovered).toMatchObject({
      activeCampaignId: null,
      candidates: [],
      recoveryResolved: true,
      status: "empty",
    });
    expect(canCreateOwnerCampaign(recovered)).toBe(true);
  });

  it("activates exactly one recovery candidate and waits for canonical detail", () => {
    const recovery = begin(createOwnerCampaignWorkflowState("session-a"), "recover", null);
    const recovered = ownerCampaignWorkflowReducer(recovery.state, {
      type: "recovery_succeeded",
      campaigns: [campaign("campaign-a")],
      token: recovery.token,
    });

    expect(recovered).toMatchObject({
      activeCampaignId: "campaign-a",
      status: "loading_detail",
    });
    expect(recovered.epoch).toBe(recovery.state.epoch + 1);
    expect(recovered.detail).toBeNull();
  });

  it("requires explicit valid selection when recovery returns multiple candidates", () => {
    const recovery = begin(createOwnerCampaignWorkflowState("session-a"), "recover", null);
    const candidates = [campaign("campaign-a"), campaign("campaign-b")];
    const recovered = ownerCampaignWorkflowReducer(recovery.state, {
      type: "recovery_succeeded",
      campaigns: candidates,
      token: recovery.token,
    });

    expect(recovered).toMatchObject({
      activeCampaignId: null,
      candidates,
      status: "selection_required",
    });
    expect(canCreateOwnerCampaign(recovered)).toBe(false);

    const impossible = ownerCampaignWorkflowReducer(recovered, {
      type: "campaign_selected",
      campaignId: "campaign-unknown",
    });

    expect(impossible).toBe(recovered);

    const selected = ownerCampaignWorkflowReducer(recovered, {
      type: "campaign_selected",
      campaignId: "campaign-b",
    });

    expect(selected).toMatchObject({
      activeCampaignId: "campaign-b",
      status: "loading_detail",
    });
  });

  it("stores a create canonical ID before accepting its detail", () => {
    const recovery = begin(createOwnerCampaignWorkflowState("session-a"), "recover", null);
    const empty = ownerCampaignWorkflowReducer(recovery.state, {
      type: "recovery_succeeded",
      campaigns: [],
      token: recovery.token,
    });
    const creating = begin(empty, "create", null);
    const createResult: OwnerCampaignCreateSuccess = {
      campaign: campaign("campaign-created"),
      campaignId: "campaign-created" as OwnerCampaignId,
      httpStatus: 201,
      ok: true,
      traceId: "trace-create",
    };

    expect(creating.state.status).toBe("creating");

    const created = ownerCampaignWorkflowReducer(creating.state, {
      type: "create_succeeded",
      result: createResult,
      token: creating.token,
    });

    expect(created).toMatchObject({
      activeCampaignId: "campaign-created",
      createdCampaign: createResult.campaign,
      detail: null,
      status: "loading_detail",
    });

    const loadingDetail = begin(created, "detail", "campaign-created");
    const ready = ownerCampaignWorkflowReducer(loadingDetail.state, {
      type: "detail_succeeded",
      result: detail("campaign-created", ["task-canonical"]),
      token: loadingDetail.token,
    });

    expect(ready.status).toBe("ready");
    expect(ready.detail?.tasks.map((task) => task.id)).toEqual(["task-canonical"]);
  });

  it("preserves canonical ID and last-good detail when a refresh fails", () => {
    const initial = createOwnerCampaignWorkflowState("session-a", "campaign-a");
    const firstLoad = begin(initial, "detail", "campaign-a");
    const ready = ownerCampaignWorkflowReducer(firstLoad.state, {
      type: "detail_succeeded",
      result: detail("campaign-a", ["task-good"]),
      token: firstLoad.token,
    });
    const refresh = begin(ready, "detail", "campaign-a");
    const degraded = ownerCampaignWorkflowReducer(refresh.state, {
      type: "request_failed",
      failure: failure(),
      token: refresh.token,
    });

    expect(degraded).toMatchObject({
      activeCampaignId: "campaign-a",
      status: "degraded",
    });
    expect(degraded.detail).toBe(ready.detail);
    expect(degraded.error).toMatchObject({
      operation: "detail",
      traceId: "trace-owner-failure",
    });
  });

  it("keeps preview and mutation responses out of the authoritative task list", () => {
    const initial = createOwnerCampaignWorkflowState("session-a", "campaign-a");
    const firstLoad = begin(initial, "detail", "campaign-a");
    const ready = ownerCampaignWorkflowReducer(firstLoad.state, {
      type: "detail_succeeded",
      result: detail("campaign-a", ["task-existing"]),
      token: firstLoad.token,
    });
    const previewRequest = begin(ready, "preview", "campaign-a");
    const previewResult: OwnerTaskPreviewSuccess = {
      httpStatus: 200,
      ok: true,
      preview: {
        campaignId: "campaign-a" as OwnerCampaignId,
        humanReviewRequired: true,
        suggestions: [],
      },
      traceId: "trace-preview",
    };
    const previewed = ownerCampaignWorkflowReducer(previewRequest.state, {
      type: "preview_succeeded",
      result: previewResult,
      token: previewRequest.token,
    });

    expect(previewed.detail?.tasks.map((task) => task.id)).toEqual(["task-existing"]);

    const mutationRequest = begin(previewed, "add", "campaign-a");
    const mutationResult: OwnerTaskSuccess = {
      httpStatus: 201,
      ok: true,
      task: {
        campaignId: "campaign-a" as OwnerCampaignId,
        evidenceRule: {},
        id: "task-created" as OwnerTaskId,
        points: 10,
        required: false,
        templateCode: "share_campaign",
        verificationType: "SOCIAL",
        walletCompatibility: "ANY",
      },
      taskId: "task-created" as OwnerTaskId,
      traceId: "trace-add",
    };
    const mutated = ownerCampaignWorkflowReducer(mutationRequest.state, {
      type: "mutation_succeeded",
      result: mutationResult,
      token: mutationRequest.token,
    });

    expect(mutated.status).toBe("loading_detail");
    expect(mutated.detail?.tasks.map((task) => task.id)).toEqual(["task-existing"]);

    const detailRequest = begin(mutated, "detail", "campaign-a");
    const mismatch = ownerCampaignWorkflowReducer(detailRequest.state, {
      type: "detail_succeeded",
      result: detail("campaign-a", ["task-existing"]),
      token: detailRequest.token,
    });

    expect(mismatch.status).toBe("degraded");
    expect(mismatch.error?.code).toBe("OWNER_TASK_IDENTITY_MISMATCH");
    expect(mismatch.detail?.tasks.map((task) => task.id)).toEqual(["task-existing"]);
  });

  it("degrades instead of committing conflicting mutation identities", () => {
    const initial = createOwnerCampaignWorkflowState("session-a", "campaign-a");
    const detailRequest = begin(initial, "detail", "campaign-a");
    const ready = ownerCampaignWorkflowReducer(detailRequest.state, {
      type: "detail_succeeded",
      result: detail("campaign-a", ["task-existing"]),
      token: detailRequest.token,
    });
    const mutationRequest = begin(ready, "add", "campaign-a");
    const conflictingResult: OwnerTaskSuccess = {
      httpStatus: 201,
      ok: true,
      task: {
        campaignId: "campaign-a" as OwnerCampaignId,
        evidenceRule: {},
        id: "task-response" as OwnerTaskId,
        points: 10,
        required: false,
        templateCode: "share_campaign",
        verificationType: "SOCIAL",
        walletCompatibility: "ANY",
      },
      taskId: "task-payload" as OwnerTaskId,
      traceId: "trace-conflicting-add",
    };
    const degraded = ownerCampaignWorkflowReducer(mutationRequest.state, {
      type: "mutation_succeeded",
      result: conflictingResult,
      token: mutationRequest.token,
    });

    expect(degraded.status).toBe("degraded");
    expect(degraded.pending).toBeNull();
    expect(degraded.error?.code).toBe("OWNER_TASK_IDENTITY_MISMATCH");
    expect(degraded.detail).toBe(ready.detail);
  });

  it("rejects responses from an earlier session epoch", () => {
    const recovery = begin(createOwnerCampaignWorkflowState("session-a"), "recover", null);
    const sessionB = ownerCampaignWorkflowReducer(recovery.state, {
      type: "synchronize_context",
      campaignId: null,
      sessionKey: "session-b",
    });
    const late = ownerCampaignWorkflowReducer(sessionB, {
      type: "recovery_succeeded",
      campaigns: [campaign("campaign-a")],
      token: recovery.token,
    });

    expect(late).toBe(sessionB);
    expect(late.activeCampaignId).toBeNull();
  });

  it("rejects detail from a previously active Campaign", () => {
    const campaignX = createOwnerCampaignWorkflowState("session-a", "campaign-x");
    const detailX = begin(campaignX, "detail", "campaign-x");
    const campaignY = ownerCampaignWorkflowReducer(detailX.state, {
      type: "synchronize_context",
      campaignId: "campaign-y",
      sessionKey: "session-a",
    });
    const lateX = ownerCampaignWorkflowReducer(campaignY, {
      type: "detail_succeeded",
      result: detail("campaign-x", ["task-x"]),
      token: detailX.token,
    });

    expect(lateX).toBe(campaignY);
    expect(lateX.activeCampaignId).toBe("campaign-y");
    expect(lateX.detail).toBeNull();
  });

  it("keeps epoch and sequence monotonic and ignores impossible events", () => {
    const initial = createOwnerCampaignWorkflowState("session-a");
    const recovery = begin(initial, "recover", null);
    const duplicateBeginToken = createOwnerCampaignRequestToken(
      recovery.state,
      "recover",
      null,
    );
    const duplicateBegin = ownerCampaignWorkflowReducer(recovery.state, {
      type: "request_started",
      token: duplicateBeginToken,
    });

    expect(duplicateBegin).toBe(recovery.state);

    const switched = ownerCampaignWorkflowReducer(recovery.state, {
      type: "synchronize_context",
      campaignId: null,
      sessionKey: "session-b",
    });
    const nextRecovery = begin(switched, "recover", null);

    expect(switched.epoch).toBeGreaterThan(initial.epoch);
    expect(nextRecovery.token.sequence).toBeGreaterThan(recovery.token.sequence);
  });
});
