import { describe, expect, it } from "vitest";
import type {
  AddOwnerCampaignTaskInput,
  OwnerCampaignCreateSuccess,
  OwnerCampaignDetailSuccess,
  OwnerCampaignFailure,
  OwnerCampaignId,
  OwnerCampaignProjection,
  OwnerTaskId,
  OwnerTaskPreviewSuggestion,
  OwnerTaskPreviewSuccess,
  OwnerTaskSuccess,
} from "../../../api/projectOwnerCampaignApiBridge";
import {
  canCreateOwnerCampaign,
  createOwnerCampaignAddPendingTargetKey,
  createOwnerCampaignAdoptPendingTargetKey,
  createOwnerCampaignRequestToken,
  createOwnerCampaignWorkflowState,
  ownerCampaignGeneratePendingTargetKey,
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

const ownerDisplayFields = ["message", "code", "traceId"] as const;
type OwnerDisplayField = (typeof ownerDisplayFields)[number];

const quotedSecretAssignmentKeys = [
  "token",
  "access_token",
  "refresh_token",
  "api-key",
  "password",
  "secret",
  "credential",
  "private-key",
] as const;

const cycle3UnsafeDisplayValues: ReadonlyArray<{
  fragments: readonly string[];
  name: string;
  value: string;
}> = [
  ...quotedSecretAssignmentKeys.flatMap((key) => ([":", "="] as const).map((separator) => {
    const marker = `display-boundary-marker-${key.replace(/[_-]/g, "-")}-${separator === ":" ? "colon" : "equals"}`;

    return {
      fragments: [marker],
      name: `quoted ${key} ${separator === ":" ? "colon" : "equals"} assignment`,
      value: separator === ":"
        ? `{"${key}":"${marker}"}`
        : `"${key}"="${marker}"`,
    };
  })),
  {
    fragments: ["/data", "display-boundary-data-path", "runtime.log"],
    name: "POSIX data path",
    value: "Read failed at /data/display-boundary-data-path/runtime.log",
  },
  {
    fragments: ["/volumes", "display-boundary-volume-path", "runtime.log"],
    name: "POSIX mounted-volume path",
    value: "Read failed at /Volumes/display-boundary-volume-path/runtime.log",
  },
  {
    fragments: ["runowner", "src/display-boundary-stack-source.ts"],
    name: "Firefox or Safari stack frame",
    value: "TypeError: failed\nrunOwner@src/display-boundary-stack-source.ts:12:4",
  },
  {
    fragments: ["<anonymous>", "assets/display-boundary-anonymous-source.js"],
    name: "anonymous browser stack frame",
    value: "TypeError: failed\n<anonymous>@assets/display-boundary-anonymous-source.js:8:2",
  },
  {
    fragments: ["display-boundary-residual-marker"],
    name: "upstream partially redacted assignment",
    value: "{\"redacted credential\":\"display-boundary-residual-marker\"}",
  },
  {
    fragments: ["display-boundary-residual-key-marker"],
    name: "upstream partially redacted key assignment",
    value: "{\"redacted key\":\"display-boundary-residual-key-marker\"}",
  },
  {
    fragments: ["display-boundary-residual-pem-marker"],
    name: "upstream partially redacted PEM block",
    value: "-----BEGIN redacted key-----\nDISPLAY-BOUNDARY-RESIDUAL-PEM-MARKER\n-----END redacted key-----",
  },
];

const cycle4OpaqueDisplayValues: ReadonlyArray<{
  fragments: readonly string[];
  name: string;
  value: string;
}> = [
  {
    fragments: ["cycle4-json-escaped-token-marker"],
    name: "JSON-escaped token assignment",
    value: String.raw`{\"token\":\"cycle4-json-escaped-token-marker\"}`,
  },
  {
    fragments: ["cycle4-unicode-token-marker"],
    name: "Unicode-escaped token key",
    value: String.raw`{\"\u0074oken\":\"cycle4-unicode-token-marker\"}`,
  },
  {
    fragments: ["cycle4-url-password", "cycle4-url-private"],
    name: "JSON-escaped URL credentials",
    value: String.raw`{\"endpoint\":\"https:\/\/alice:cycle4-url-password@internal.example\/cycle4-url-private\"}`,
  },
  {
    fragments: ["cycle4-query-secret-marker"],
    name: "escaped query credential key",
    value: String.raw`{\"endpoint\":\"https:\/\/internal.example\/owner?access\u005ftoken=cycle4-query-secret-marker\"}`,
  },
  {
    fragments: ["cycle4-hash-secret-marker"],
    name: "escaped hash credential key",
    value: String.raw`{\"endpoint\":\"https:\/\/internal.example\/owner#refresh\u005ftoken=cycle4-hash-secret-marker\"}`,
  },
  {
    fragments: ["vault-cycle4", "runtime.log"],
    name: "JSON-escaped POSIX path",
    value: String.raw`Read failed at \/vault-cycle4\/private\/runtime.log`,
  },
  {
    fragments: ["cycle4-owner", "runtime.log"],
    name: "backtick Windows path",
    value: "Read failed at `C:\\Users\\cycle4-owner\\private\\runtime.log`",
  },
  {
    fragments: ["cycle4-owner", "runtime.log"],
    name: "JSON-escaped Windows path",
    value: String.raw`{\"path\":\"C:\\Users\\cycle4-owner\\private\\runtime.log\"}`,
  },
  {
    fragments: ["cycle4-host", "private-share", "runtime.log"],
    name: "JSON-escaped UNC path",
    value: String.raw`{\"path\":\"\\\\cycle4-host\\private-share\\runtime.log\"}`,
  },
  {
    fragments: ["runowner", "cycle4-v8-stack.ts"],
    name: "flattened V8 stack frame",
    value: "TypeError: failed | at runOwner (src/cycle4-v8-stack.ts:12:4)",
  },
  {
    fragments: ["runowner", "cycle4-firefox-line-only.ts"],
    name: "escaped Firefox line-only frame",
    value: String.raw`TypeError: failed\nrunOwner@src/cycle4-firefox-line-only.ts:12`,
  },
  {
    fragments: ["cycle4-safari-optional-frame.ts"],
    name: "Safari frame without function or column",
    value: "TypeError: failed\n@src/cycle4-safari-optional-frame.ts:12",
  },
  {
    fragments: ["begin private key", "cycle4-pem-partial-marker"],
    name: "partial PEM delimiter",
    value: String.raw`-----BEGIN PRIVATE KEY----\nCYCLE4-PEM-PARTIAL-MARKER`,
  },
  {
    fragments: ["cycle4-redaction-residual-marker"],
    name: "underscore redaction residual",
    value: "{\"redacted_private_path\":\"cycle4-redaction-residual-marker\"}",
  },
  {
    fragments: ["cycle4-client-secret-marker"],
    name: "client secret assignment",
    value: "client_secret=cycle4-client-secret-marker",
  },
];

const opaqueUpstreamDisplayValues = [
  ...unsafeDisplayMessageCases,
  ...cycle3UnsafeDisplayValues,
  ...cycle4OpaqueDisplayValues,
  {
    fragments: ["safe-upstream-message-marker"],
    name: "safe arbitrary upstream message",
    value: "A safe upstream message with safe-upstream-message-marker.",
  },
];

const opaqueUpstreamDisplayCases = opaqueUpstreamDisplayValues.flatMap((displayValue) =>
  ownerDisplayFields.map((field) => ({ ...displayValue, field })));

const failureWithDisplayField = (
  field: OwnerDisplayField,
  value: string,
): OwnerCampaignFailure => {
  if (field === "message") {
    return failure("PERSISTENCE_UNAVAILABLE", {
      diagnostic: {
        code: "PERSISTENCE_UNAVAILABLE",
        message: value,
      },
    });
  }

  return failure("PERSISTENCE_UNAVAILABLE", { [field]: value });
};

describe("Owner campaign display sanitizer", () => {
  it.each(unsafeDisplayMessageCases)("redacts $name without leaking adjacent material", ({ fragments, value }) => {
    const sanitized = sanitizeProjectOwnerCampaignDisplayText(value, "message");
    const normalized = sanitized.toLowerCase();

    expect(sanitized).toBe("Owner campaign request failed. Unsafe diagnostic details were redacted.");
    for (const fragment of fragments) {
      expect(normalized).not.toContain(fragment);
    }
  });

  it("never passes arbitrary messages through and applies narrow code and Trace ID formats", () => {
    expect(sanitizeProjectOwnerCampaignDisplayText(
      "Campaign data is temporarily unavailable.",
      "message",
    )).toBe("Owner campaign request failed. Unsafe diagnostic details were redacted.");
    expect(sanitizeProjectOwnerCampaignDisplayText(
      "PERSISTENCE_UNAVAILABLE",
      "code",
    )).toBe("PERSISTENCE_UNAVAILABLE");
    expect(sanitizeProjectOwnerCampaignDisplayText(
      "trace-owner-503",
      "traceId",
    )).toBe("trace-owner-503");
    expect(sanitizeProjectOwnerCampaignDisplayText(
      " PERSISTENCE_UNAVAILABLE ",
      "code",
    )).toBe("OWNER_CAMPAIGN_ERROR_REDACTED");
    expect(sanitizeProjectOwnerCampaignDisplayText(
      " trace-owner-503 ",
      "traceId",
    )).toBe("trace-redacted");
    expect(sanitizeProjectOwnerCampaignDisplayText("A".repeat(64), "code"))
      .toBe("A".repeat(64));
    expect(sanitizeProjectOwnerCampaignDisplayText("A".repeat(65), "code"))
      .toBe("OWNER_CAMPAIGN_ERROR_REDACTED");
    expect(sanitizeProjectOwnerCampaignDisplayText(`t${"a".repeat(127)}`, "traceId"))
      .toBe(`t${"a".repeat(127)}`);
    expect(sanitizeProjectOwnerCampaignDisplayText(`t${"a".repeat(128)}`, "traceId"))
      .toBe("trace-redacted");

    const bounded = sanitizeProjectOwnerCampaignDisplayText("A".repeat(1_000_000), "message");
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

    const hostileProxy = new Proxy({}, {
      get: () => {
        throw new Error("property access failed");
      },
      getPrototypeOf: () => {
        throw new Error("prototype access failed");
      },
      ownKeys: () => {
        throw new Error("key enumeration failed");
      },
    });
    const circularValue: { self?: unknown } = {};
    circularValue.self = circularValue;
    const fieldLimits: Record<OwnerDisplayField, number> = {
      code: 64,
      message: 240,
      traceId: 128,
    };

    for (const value of [hostileValue, hostileProxy, circularValue, 1n, Symbol("marker"), new Error("safe failure")]) {
      for (const field of ownerDisplayFields) {
        expect(() => sanitizeProjectOwnerCampaignDisplayText(value, field)).not.toThrow();
        const sanitized = sanitizeProjectOwnerCampaignDisplayText(value, field);
        expect(sanitized).not.toBe("");
        expect(sanitized.length).toBeLessThanOrEqual(fieldLimits[field]);
      }
    }

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

  it.each([
    ["BRIDGE_BASE_URL_INVALID", "Owner campaign service is unavailable."],
    ["BRIDGE_BASE_URL_MISSING", "Owner campaign service is unavailable."],
    ["BRIDGE_INVALID_INPUT", "Owner campaign request was invalid."],
    ["BRIDGE_REQUEST_ABORTED", "Owner campaign request was canceled."],
    ["BRIDGE_REQUEST_FAILED", "Campaign data is temporarily unavailable."],
    ["BRIDGE_REQUEST_TIMEOUT", "Owner campaign request timed out."],
    ["BRIDGE_RESPONSE_INVALID", "Owner campaign service returned an invalid response."],
    ["BRIDGE_RESPONSE_NON_JSON", "Owner campaign service returned an invalid response."],
    ["BRIDGE_RESPONSE_OVERSIZE", "Owner campaign service returned an invalid response."],
    ["AUTH_FORBIDDEN", "This wallet is not authorized to manage this campaign."],
    ["AUTH_OWNER_MISMATCH", "This wallet is not authorized to manage this campaign."],
    ["AUTH_SESSION_INVALID", "Wallet session is no longer valid. Reconnect and try again."],
    ["AUTH_SESSION_REQUIRED", "Wallet session is no longer valid. Reconnect and try again."],
    ["INVALID_CAMPAIGN", "Owner campaign was not found."],
    ["INVALID_REQUEST", "Owner campaign request was invalid."],
    ["PERSISTENCE_UNAVAILABLE", "Campaign data is temporarily unavailable."],
  ])("maps exact allowlisted code %s to controlled copy", (code, expectedMessage) => {
    const rawMessageMarker = `raw-message-for-${code.toLowerCase()}`;
    const projected = projectOwnerCampaignErrorFromFailure(failure(code, {
      diagnostic: {
        code,
        message: `Safe-looking upstream text ${rawMessageMarker}`,
      },
      reconnectRequired: true,
      retryable: false,
    }), "recover");

    expect(projected).toMatchObject({
      code,
      message: expectedMessage,
      reconnectRequired: true,
      retryable: false,
    });
    expect(JSON.stringify(projected)).not.toContain(rawMessageMarker);
  });

  it("does not inspect an upstream diagnostic while projecting controlled copy", () => {
    const hostileDiagnostic = new Proxy({} as OwnerCampaignFailure["diagnostic"], {
      get: () => {
        throw new Error("raw diagnostic must not be read");
      },
      ownKeys: () => {
        throw new Error("raw diagnostic must not be enumerated");
      },
    });

    expect(() => projectOwnerCampaignErrorFromFailure(failure("PERSISTENCE_UNAVAILABLE", {
      diagnostic: hostileDiagnostic,
    }), "recover")).not.toThrow();
    expect(projectOwnerCampaignErrorFromFailure(failure("PERSISTENCE_UNAVAILABLE", {
      diagnostic: hostileDiagnostic,
    }), "recover").message).toBe("Campaign data is temporarily unavailable.");
  });

  it.each([
    ["NOVEL_OWNER_FAILURE", "NOVEL_OWNER_FAILURE"],
    [" PERSISTENCE_UNAVAILABLE ", "OWNER_CAMPAIGN_ERROR_REDACTED"],
    ["invalid-owner-code", "OWNER_CAMPAIGN_ERROR_REDACTED"],
  ])("uses generic copy for unknown or malformed code %j", (code, expectedCode) => {
    const projected = projectOwnerCampaignErrorFromFailure(failure(code, {
      diagnostic: {
        code: "PERSISTENCE_UNAVAILABLE",
        message: "Safe-looking upstream message safe-unknown-code-marker.",
      },
    }), "recover");

    expect(projected).toMatchObject({
      code: expectedCode,
      message: "Owner campaign request failed. Unsafe diagnostic details were redacted.",
    });
    expect(JSON.stringify(projected)).not.toContain("safe-unknown-code-marker");
  });

  it.each(opaqueUpstreamDisplayCases)(
    "treats $name as opaque when supplied through $field",
    ({ field, fragments, value }) => {
      const projected = projectOwnerCampaignErrorFromFailure(
        failureWithDisplayField(field, value),
        "recover",
      );
      const serialized = JSON.stringify(projected).toLowerCase();

      expect(projected).toMatchObject({
        code: field === "code" ? "OWNER_CAMPAIGN_ERROR_REDACTED" : "PERSISTENCE_UNAVAILABLE",
        message: field === "code"
          ? "Owner campaign request failed. Unsafe diagnostic details were redacted."
          : "Campaign data is temporarily unavailable.",
        traceId: field === "traceId" ? "trace-redacted" : "trace-owner-failure",
      });
      for (const fragment of fragments) {
        expect(serialized).not.toContain(fragment.toLowerCase());
      }
    },
  );
});

describe("owner campaign workflow", () => {
  it("carries command-input target keys through pending Add, Generate, and Adopt tokens", () => {
    const initial = createOwnerCampaignWorkflowState("session-a", "campaign-a");
    const detailRequest = begin(initial, "detail", "campaign-a");
    const ready = ownerCampaignWorkflowReducer(detailRequest.state, {
      type: "detail_succeeded",
      result: detail("campaign-a"),
      token: detailRequest.token,
    });
    const addInput: AddOwnerCampaignTaskInput = {
      evidenceRule: {},
      points: 40,
      required: true,
      templateCode: "connect_wallet",
      verificationType: "WALLET",
      walletCompatibility: "ANY",
    };
    const suggestion: OwnerTaskPreviewSuggestion = {
      adoptable: true,
      campaignId: "campaign-a" as OwnerCampaignId,
      evidenceRule: {},
      id: "suggestion-social" as OwnerTaskPreviewSuggestion["id"],
      points: 25,
      required: false,
      templateCode: "share_campaign",
      verificationType: "SOCIAL",
      walletCompatibility: "ANY",
    };

    const addTargetKey = createOwnerCampaignAddPendingTargetKey(addInput);
    const addToken = createOwnerCampaignRequestToken(
      ready,
      "add",
      "campaign-a",
      addTargetKey,
    );
    const addPending = ownerCampaignWorkflowReducer(ready, {
      type: "request_started",
      token: addToken,
    });

    expect(addTargetKey).toBe("add:connect_wallet");
    expect(addPending.pending?.targetKey).toBe("add:connect_wallet");

    const generateTargetKey = ownerCampaignGeneratePendingTargetKey;
    const generateToken = createOwnerCampaignRequestToken(
      ready,
      "preview",
      "campaign-a",
      generateTargetKey,
    );
    const generatePending = ownerCampaignWorkflowReducer(ready, {
      type: "request_started",
      token: generateToken,
    });

    expect(generatePending.pending?.targetKey).toBe("generate");

    const adoptTargetKey = createOwnerCampaignAdoptPendingTargetKey(suggestion);
    const adoptToken = createOwnerCampaignRequestToken(
      ready,
      "adopt",
      "campaign-a",
      adoptTargetKey,
    );
    const adoptPending = ownerCampaignWorkflowReducer(ready, {
      type: "request_started",
      token: adoptToken,
    });

    expect(adoptTargetKey).toBe("adopt:suggestion-social");
    expect(adoptPending.pending?.targetKey).toBe("adopt:suggestion-social");
  });

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
