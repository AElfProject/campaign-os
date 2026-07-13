import { describe, expect, it, vi, afterEach } from "vitest";
import type { NormalizedWalletSession } from "../domain/types";
import {
  createProjectOwnerCampaignApiBridge,
  sanitizeProjectOwnerCampaignApiText,
  type AddOwnerCampaignTaskInput,
  type CreateOwnerCampaignInput,
  type GenerateOwnerTaskPreviewInput,
  type ProjectOwnerCampaignApiFetch,
} from "./projectOwnerCampaignApiBridge";

const session: NormalizedWalletSession = {
  accountType: "EOA",
  address: "ELF_owner_session_address",
  capabilities: ["SIGN_MESSAGE", "CONTRACT_VIEW"],
  chainId: "AELF",
  connectedAt: "2026-07-13T00:00:00.000Z",
  displayAddress: "ELF_owner...dress",
  id: "wallet-session-owner",
  issuer: {
    artifactType: "local_session_reference",
    cookieIssued: false,
    diagnosticCodes: [],
    issuerMode: "local_opaque",
    jwtIssued: false,
    liveSigningExecuted: false,
    referenceId: "issuer-ref-owner",
    ttlSeconds: 900,
    valid: true,
  },
  lastSeenAt: "2026-07-13T00:00:00.000Z",
  network: "testnet",
  normalUserRecommended: true,
  productionReadiness: {
    blockedDependencyIds: ["live_wallet_proof_verifier"],
    liveSigningReady: false,
    liveVerifierReady: false,
    productionReady: false,
    productionRequired: true,
    productionSessionStoreReady: false,
    secretManagerReady: false,
    signingKeyReady: false,
  },
  proof: {
    diagnosticCodes: [],
    liveVerificationExecuted: false,
    proofType: "wallet_signature",
    status: "verified",
    trustLevel: "verified_local",
  },
  sessionId: "sess-owner-issued",
  signatureStatus: "signed",
  statusMessage: {
    "en-US": "Connected",
    "zh-CN": "已连接",
  },
  verificationStatus: "verified",
  walletName: "Portkey EOA",
  walletSource: "PORTKEY_EOA_EXTENSION",
  walletTypeVerified: true,
};

const createInput: CreateOwnerCampaignInput = {
  contractMode: "OFF_CHAIN_MVP",
  defaultLocale: "en-US",
  duration: "14 days",
  endTime: "2026-07-30T00:00:00.000Z",
  goal: "Launch durable owner campaign",
  ownerAddress: "ELF_untrusted_component_owner",
  projectId: "Project One/Alpha",
  rewardDescription: "Rewards are provided by the project owner.",
  startTime: "2026-07-16T00:00:00.000Z",
  status: "draft",
  supportedLocales: ["en-US", "zh-CN"],
  walletPolicy: "ANY",
};

const addTaskInput: AddOwnerCampaignTaskInput = {
  evidenceRule: {
    kind: "submit_proof",
  },
  points: 120,
  required: true,
  templateCode: "join-discord",
  verificationType: "SOCIAL",
  walletCompatibility: "ANY",
};

const generateInput: GenerateOwnerTaskPreviewInput = {
  goal: "Drive first owner activation",
  product: "Campaign OS",
  targetUsers: ["project owners", "early users"],
  walletPolicy: "ANY",
};

const response = (
  body: unknown,
  options: { headerTraceId?: string; ok?: boolean; status?: number } = {},
): Response => ({
  headers: new Headers(options.headerTraceId ? { "x-campaign-os-trace-id": options.headerTraceId } : {}),
  ok: options.ok ?? true,
  status: options.status ?? 200,
  text: vi.fn(async () => typeof body === "string" ? body : JSON.stringify(body)),
} as unknown as Response);

const successEnvelope = (data: unknown, traceId = "trace-body") => ({
  data,
  ok: true,
  runtime: {
    mode: "local_api",
    name: "campaign-os-api-runtime",
  },
  timestamp: "2026-07-13T00:00:00.000Z",
  traceId,
});

const errorEnvelope = (
  code: string,
  status: number,
  traceId = "trace-body-error",
  details: Record<string, unknown> = {},
) => response({
  error: {
    code,
    details,
    message: `${code} failed with private key and stack trace`,
  },
  ok: false,
  timestamp: "2026-07-13T00:00:00.000Z",
  traceId,
}, { headerTraceId: "trace-header-error", ok: false, status });

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("project owner campaign API bridge", () => {
  it("sends exact Owner endpoint requests with session-derived authority headers and safe bodies", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response(successEnvelope({
        payload: {
          id: "campaign-db-1",
          ownerAddress: session.address,
          projectId: createInput.projectId,
          status: "draft",
        },
      }, "trace-create-body"), { headerTraceId: "trace-create-header" }))
      .mockResolvedValueOnce(response(successEnvelope({
        items: [
          {
            id: "campaign-db-2",
            ownerAddress: session.address,
            projectId: createInput.projectId,
            status: "live",
            updatedAt: "2026-07-14T00:00:00.000Z",
          },
          {
            id: "campaign-db-1",
            ownerAddress: session.address,
            projectId: createInput.projectId,
            status: "draft",
          },
        ],
      }, "trace-recover-body")))
      .mockResolvedValueOnce(response(successEnvelope({
        payload: {
          item: {
            id: "campaign-db-1",
            ownerAddress: session.address,
            projectId: createInput.projectId,
            status: "draft",
            tasks: [{
              campaignId: "campaign-db-1",
              evidenceRule: { kind: "submit_proof" },
              id: "task-db-1",
              points: 50,
              required: true,
              templateCode: "follow-x",
              verificationType: "SOCIAL",
              walletCompatibility: "ANY",
            }],
          },
        },
      }, "trace-detail-body")))
      .mockResolvedValueOnce(response(successEnvelope({
        payload: {
          campaignId: "campaign-db-1",
          evidenceRule: { kind: "submit_proof" },
          id: "task-db-2",
          points: addTaskInput.points,
          required: true,
          templateCode: addTaskInput.templateCode,
          verificationType: addTaskInput.verificationType,
          walletCompatibility: addTaskInput.walletCompatibility,
        },
      }, "trace-add-body")))
      .mockResolvedValueOnce(response(successEnvelope({
        payload: {
          campaignId: "campaign-db-1",
          humanReviewRequired: true,
          taskList: [
            {
              adoptable: true,
              campaignId: "campaign-db-1",
              evidenceRule: { kind: "submit_proof" },
              id: "suggestion-social-1",
              points: 80,
              required: true,
              templateCode: "share-x",
              verificationType: "SOCIAL",
              walletCompatibility: "ANY",
            },
            {
              adoptable: true,
              campaignId: "campaign-db-1",
              evidenceRule: { kind: "referral" },
              id: "suggestion-referral-1",
              points: 200,
              required: false,
              templateCode: "invite-friends",
              verificationType: "REFERRAL",
              walletCompatibility: "ANY",
            },
          ],
        },
      }, "trace-generate-body"))) as unknown as ProjectOwnerCampaignApiFetch;
    const traceIdGenerator = vi
      .fn()
      .mockReturnValueOnce("trace-create-request")
      .mockReturnValueOnce("trace-recover-request")
      .mockReturnValueOnce("trace-detail-request")
      .mockReturnValueOnce("trace-add-request")
      .mockReturnValueOnce("trace-generate-request");
    const bridge = createProjectOwnerCampaignApiBridge({
      config: { baseUrl: "http://127.0.0.1:5184/root", timeoutMs: 500, tracePrefix: "owner-test" },
      fetchImpl,
      traceIdGenerator,
    });

    const createResult = await bridge.createCampaign(
      { ...createInput, sessionId: "forged-session", roles: "admin" } as CreateOwnerCampaignInput,
      { session },
    );
    const recoverResult = await bridge.recoverCampaigns(
      "Project One/Alpha",
      { session },
      { limit: 999, ownerAddress: "ELF_wrong_owner", status: "live" } as never,
    );
    const detailResult = await bridge.getCampaignDetail("campaign-db-1", { session });
    const addResult = await bridge.addTask(
      "campaign-db-1",
      { ...addTaskInput, ownerAddress: "ELF_wrong_owner", suggestionId: "suggestion-social-1" } as never,
      { session },
    );
    const previewResult = await bridge.generateTaskPreview("campaign-db-1", generateInput, { session });

    expect(createResult).toMatchObject({
      campaign: { id: "campaign-db-1", ownerAddress: session.address },
      ok: true,
      traceId: "trace-create-body",
    });
    expect(recoverResult).toMatchObject({
      campaigns: [{ id: "campaign-db-2" }, { id: "campaign-db-1" }],
      ok: true,
    });
    expect(detailResult).toMatchObject({
      campaign: { id: "campaign-db-1" },
      ok: true,
      tasks: [{ id: "task-db-1" }],
    });
    expect(addResult).toMatchObject({
      ok: true,
      task: { id: "task-db-2" },
    });
    expect(previewResult).toMatchObject({
      ok: true,
      preview: {
        campaignId: "campaign-db-1",
        humanReviewRequired: true,
        suggestions: [
          { adoptable: true, id: "suggestion-social-1" },
          {
            adoptable: false,
            id: "suggestion-referral-1",
            rejectionCode: "UNSUPPORTED_VERIFICATION_TYPE",
            verificationType: "REFERRAL",
          },
        ],
      },
    });

    expect(fetchImpl).toHaveBeenCalledTimes(5);
    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "http://127.0.0.1:5184/api/campaigns",
      expect.objectContaining({
        body: expect.any(String),
        headers: expect.objectContaining({
          accept: "application/json",
          "content-type": "application/json",
          "x-campaign-os-account-type": "EOA",
          "x-campaign-os-credential-boundary": "ordinary_user_wallet",
          "x-campaign-os-proof-status": "verified",
          "x-campaign-os-roles": "project_owner",
          "x-campaign-os-session-id": session.sessionId,
          "x-campaign-os-trace-id": "trace-create-request",
          "x-campaign-os-wallet-address": session.address,
          "x-campaign-os-wallet-source": "PORTKEY_EOA_EXTENSION",
        }),
        method: "POST",
        signal: expect.any(AbortSignal),
      }),
    );
    expect(JSON.parse(String((fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0][1]?.body))).toMatchObject({
      duration: createInput.duration,
      ownerAddress: session.address,
      projectId: createInput.projectId,
    });
    expect(JSON.parse(String((fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0][1]?.body))).not.toMatchObject({
      roles: expect.anything(),
      sessionId: expect.anything(),
      walletAddress: expect.anything(),
    });
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "http://127.0.0.1:5184/api/projects/Project%20One%2FAlpha/campaigns?status=live&limit=100",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      3,
      "http://127.0.0.1:5184/api/campaigns/campaign-db-1",
      expect.objectContaining({
        headers: expect.not.objectContaining({
          "content-type": expect.any(String),
          "x-campaign-os-session-id": expect.any(String),
        }),
        method: "GET",
      }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      4,
      "http://127.0.0.1:5184/api/campaigns/campaign-db-1/tasks",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      5,
      "http://127.0.0.1:5184/api/campaigns/campaign-db-1/tasks/generate",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it.each([
    [400, "INVALID_REQUEST", false, false],
    [401, "AUTH_SESSION_INVALID", false, true],
    [403, "AUTH_OWNER_MISMATCH", false, false],
    [404, "INVALID_CAMPAIGN", false, false],
    [503, "PERSISTENCE_UNAVAILABLE", true, false],
  ])("maps HTTP %s errors into safe typed failures", async (status, code, retryable, reconnectRequired) => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(errorEnvelope(code, status, "trace-body-wins", {
      field: "ownerAddress",
      message: "token=secret and /Users/local/review/campaign-os-kitty/private",
      stack: "stack trace should not leak",
    })) as unknown as ProjectOwnerCampaignApiFetch;
    const bridge = createProjectOwnerCampaignApiBridge({
      config: { baseUrl: "http://127.0.0.1:5184" },
      fetchImpl,
      traceIdGenerator: () => "trace-request",
    });

    const result = await bridge.addTask("campaign-db-1", addTaskInput, { session });

    expect(result).toMatchObject({
      code,
      httpStatus: status,
      ok: false,
      reconnectRequired,
      retryable,
      traceId: "trace-body-wins",
    });
    const serialized = JSON.stringify(result).toLowerCase();
    expect(serialized).toContain("owneraddress");
    expect(serialized).not.toMatch(/token=secret|campaign-os-kitty|stack trace|private key/);
  });

  it.each([
    ["wrong ok discriminant", { data: { payload: { id: "campaign-db-1" } }, ok: "true", traceId: "trace-bad-ok" }],
    ["missing payload", { data: {}, ok: true, traceId: "trace-missing-payload" }],
    ["wrong persisted task ID shape", successEnvelope({
      payload: {
        campaignId: "campaign-db-1",
        evidenceRule: {},
        id: "suggestion-local-1",
        points: 1,
        required: false,
        templateCode: "x",
        verificationType: "SOCIAL",
        walletCompatibility: "ANY",
      },
    }, "trace-wrong-id")],
  ])("fails explicitly for malformed envelopes: %s", async (_name, body) => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(response(body)) as unknown as ProjectOwnerCampaignApiFetch;
    const bridge = createProjectOwnerCampaignApiBridge({
      config: { baseUrl: "http://127.0.0.1:5184" },
      fetchImpl,
      traceIdGenerator: () => "trace-request",
    });

    const result = await bridge.addTask("campaign-db-1", addTaskInput, { session });

    expect(result).toMatchObject({
      code: "BRIDGE_RESPONSE_INVALID",
      ok: false,
      retryable: false,
    });
  });

  it("fails explicitly for non-JSON and oversize responses", async () => {
    const bridgeForNonJson = createProjectOwnerCampaignApiBridge({
      config: { baseUrl: "http://127.0.0.1:5184" },
      fetchImpl: vi.fn().mockResolvedValueOnce(response("<html>not json</html>")) as unknown as ProjectOwnerCampaignApiFetch,
      traceIdGenerator: () => "trace-non-json",
    });
    const nonJson = await bridgeForNonJson.getCampaignDetail("campaign-db-1", { session });

    const bridgeForOversize = createProjectOwnerCampaignApiBridge({
      config: { baseUrl: "http://127.0.0.1:5184", maxResponseBytes: 10 },
      fetchImpl: vi.fn().mockResolvedValueOnce(response(successEnvelope({
        payload: {
          item: {
            id: "campaign-db-1",
            ownerAddress: session.address,
            projectId: createInput.projectId,
            status: "draft",
            tasks: [],
          },
        },
      }))) as unknown as ProjectOwnerCampaignApiFetch,
      traceIdGenerator: () => "trace-oversize",
    });
    const oversize = await bridgeForOversize.getCampaignDetail("campaign-db-1", { session });

    expect(nonJson).toMatchObject({ code: "BRIDGE_RESPONSE_NON_JSON", ok: false });
    expect(oversize).toMatchObject({ code: "BRIDGE_RESPONSE_OVERSIZE", ok: false });
  });

  it("returns retryable unavailable state for fetch failures without throwing unsafe diagnostics", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error(
        "PostgreSQL unavailable at postgres://user:pass@localhost/db?token=secret with bearer abc.def private key stack trace /private/tmp/raw",
      );
    }) as unknown as ProjectOwnerCampaignApiFetch;
    const bridge = createProjectOwnerCampaignApiBridge({
      config: { baseUrl: "http://127.0.0.1:5184" },
      fetchImpl,
      traceIdGenerator: () => "trace-fetch-failed",
    });

    const result = await bridge.recoverCampaigns(createInput.projectId, { session });

    expect(result).toMatchObject({
      code: "PERSISTENCE_UNAVAILABLE",
      ok: false,
      retryable: true,
      traceId: "trace-fetch-failed",
    });
    expect(JSON.stringify(result).toLowerCase()).not.toMatch(
      /postgres:\/\/|token=secret|bearer abc|private key|stack trace|\/private\/tmp/,
    );
  });

  it("bounds timeout and caller abort cleanup without retrying mutations", async () => {
    vi.useFakeTimers();
    const callerAbort = new AbortController();
    const removeListenerSpy = vi.spyOn(callerAbort.signal, "removeEventListener");
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    const fetchImpl = vi.fn((_url: RequestInfo | URL, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        }, { once: true });
      }),
    ) as unknown as ProjectOwnerCampaignApiFetch;
    const bridge = createProjectOwnerCampaignApiBridge({
      config: { baseUrl: "http://127.0.0.1:5184", timeoutMs: 250 },
      fetchImpl,
      traceIdGenerator: () => "trace-timeout",
    });

    const timeoutResultPromise = bridge.addTask("campaign-db-1", addTaskInput, {
      session,
      signal: callerAbort.signal,
    });
    await vi.advanceTimersByTimeAsync(250);
    const timeoutResult = await timeoutResultPromise;

    expect(timeoutResult).toMatchObject({
      code: "BRIDGE_REQUEST_TIMEOUT",
      ok: false,
      retryable: true,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(removeListenerSpy).toHaveBeenCalledWith("abort", expect.any(Function));

    const callerAbortForSecondRequest = new AbortController();
    const bridgeForCallerAbort = createProjectOwnerCampaignApiBridge({
      config: { baseUrl: "http://127.0.0.1:5184", timeoutMs: 1_000 },
      fetchImpl,
      traceIdGenerator: () => "trace-caller-abort",
    });
    const callerAbortResultPromise = bridgeForCallerAbort.addTask("campaign-db-1", addTaskInput, {
      session,
      signal: callerAbortForSecondRequest.signal,
    });
    callerAbortForSecondRequest.abort();
    const callerAbortResult = await callerAbortResultPromise;

    expect(callerAbortResult).toMatchObject({
      code: "BRIDGE_REQUEST_ABORTED",
      ok: false,
      retryable: false,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("redacts unsafe standalone text fragments", () => {
    expect(
      sanitizeProjectOwnerCampaignApiText(
        "Bearer abc.def raw signature private key token=secret stack trace /Users/local/review/campaign-os-kitty/evidence /private/tmp/raw",
      ).toLowerCase(),
    ).not.toMatch(/bearer abc|raw signature|private key|token=secret|stack trace|campaign-os-kitty|\/private\/tmp/);
  });
});
