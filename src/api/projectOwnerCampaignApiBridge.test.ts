import { afterEach, describe, expect, it, vi } from "vitest";
import type { NormalizedWalletSession } from "../domain/types";
import {
  createProjectOwnerCampaignApiBridge,
  sanitizeProjectOwnerCampaignApiText,
  type AddOwnerCampaignTaskInput,
  type CreateOwnerCampaignInput,
  type GenerateOwnerTaskPreviewInput,
  type ProjectOwnerCampaignApiBridge,
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
    "zh-CN": "Connected",
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

interface ResponseOptions {
  contentLength?: number;
  headerTraceId?: string;
  status?: number;
}

const response = (body: unknown, options: ResponseOptions = {}): Response => {
  const headers = new Headers();

  if (options.headerTraceId) {
    headers.set("x-campaign-os-trace-id", options.headerTraceId);
  }
  if (options.contentLength !== undefined) {
    headers.set("content-length", String(options.contentLength));
  }

  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    headers,
    status: options.status ?? 200,
  });
};

const streamResponse = (
  chunks: readonly string[],
  options: ResponseOptions = {},
): { cancel: ReturnType<typeof vi.fn>; response: Response } => {
  const cancel = vi.fn();
  const encoder = new TextEncoder();
  let index = 0;
  const body = new ReadableStream<Uint8Array>({
    cancel,
    pull: (controller) => {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index]));
        index += 1;
        return;
      }

      controller.close();
    },
  });
  const headers = new Headers();

  if (options.headerTraceId) {
    headers.set("x-campaign-os-trace-id", options.headerTraceId);
  }
  if (options.contentLength !== undefined) {
    headers.set("content-length", String(options.contentLength));
  }

  return {
    cancel,
    response: new Response(body, { headers, status: options.status ?? 200 }),
  };
};

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
}, { headerTraceId: "trace-header-error", status });

const createBridge = (fetchImpl: ReturnType<typeof vi.fn>, maxResponseBytes?: number) =>
  createProjectOwnerCampaignApiBridge({
    config: {
      baseUrl: "http://127.0.0.1:5184/root",
      ...(maxResponseBytes === undefined ? {} : { maxResponseBytes }),
      timeoutMs: 500,
      tracePrefix: "owner-test",
    },
    fetchImpl: fetchImpl as unknown as ProjectOwnerCampaignApiFetch,
    traceIdGenerator: () => "trace-request",
  });

const approvedCampaign = (id: string, status = "draft") => ({
  id,
  ownerAddress: session.address,
  projectId: createInput.projectId,
  status,
});

const approvedTask = (id: string, campaignId = "campaign-db-draft-0001") => ({
  campaignId,
  evidenceRule: { kind: "submit_proof" },
  id,
  points: 50,
  required: true,
  templateCode: "follow-x",
  verificationType: "SOCIAL",
  walletCompatibility: "ANY",
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("project owner campaign API bridge", () => {
  it("normalizes all five approved OpenAPI envelopes and sends exact Owner requests", async () => {
    const campaignId = "campaign-11111111-1111-4111-8111-111111111111";
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response(successEnvelope({
        payload: approvedCampaign(campaignId),
      }, "trace-create-body"), { headerTraceId: "trace-create-header" }))
      .mockResolvedValueOnce(response(successEnvelope({
        items: [approvedCampaign(campaignId, "live")],
      }, "trace-recover-body")))
      .mockResolvedValueOnce(response(successEnvelope({
        payload: {
          item: {
            ...approvedCampaign(campaignId),
            tasks: [approvedTask("campaign-task-11111111-1111-4111-8111-111111111111", campaignId)],
          },
        },
      }, "trace-detail-body")))
      .mockResolvedValueOnce(response(successEnvelope({
        payload: approvedTask("campaign-task-22222222-2222-4222-8222-222222222222", campaignId),
      }, "trace-add-body")))
      .mockResolvedValueOnce(response(successEnvelope({
        payload: {
          campaignId,
          humanReviewRequired: true,
          taskList: [
            {
              ...approvedTask("suggestion-social-1", campaignId),
              adoptable: true,
            },
            {
              ...approvedTask("suggestion-referral-1", campaignId),
              adoptable: false,
              rejectionCode: "REFERRAL_TASK_ADD_UNSUPPORTED",
              verificationType: "REFERRAL",
            },
          ],
        },
      }, "trace-generate-body")));
    const traceIdGenerator = vi
      .fn()
      .mockReturnValueOnce("trace-create-request")
      .mockReturnValueOnce("trace-recover-request")
      .mockReturnValueOnce("trace-detail-request")
      .mockReturnValueOnce("trace-add-request")
      .mockReturnValueOnce("trace-generate-request");
    const bridge = createProjectOwnerCampaignApiBridge({
      config: { baseUrl: "http://127.0.0.1:5184/root", timeoutMs: 500, tracePrefix: "owner-test" },
      fetchImpl: fetchImpl as unknown as ProjectOwnerCampaignApiFetch,
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
    const detailResult = await bridge.getCampaignDetail(campaignId, { session });
    const addResult = await bridge.addTask(
      campaignId,
      {
        ...addTaskInput,
        id: "request-task-local-1",
        ownerAddress: "ELF_wrong_owner",
        suggestionId: "suggestion-social-1",
      } as never,
      { session },
    );
    const previewResult = await bridge.generateTaskPreview(campaignId, generateInput, { session });

    expect(createResult).toMatchObject({
      campaign: { id: campaignId, ownerAddress: session.address },
      ok: true,
      traceId: "trace-create-body",
    });
    expect(recoverResult).toMatchObject({ campaigns: [{ id: campaignId }], ok: true });
    expect(detailResult).toMatchObject({
      campaign: { id: campaignId },
      ok: true,
      tasks: [{ id: "campaign-task-11111111-1111-4111-8111-111111111111" }],
    });
    expect(addResult).toMatchObject({
      ok: true,
      task: { id: "campaign-task-22222222-2222-4222-8222-222222222222" },
    });
    expect(previewResult).toMatchObject({
      ok: true,
      preview: {
        campaignId,
        humanReviewRequired: true,
        suggestions: [
          { adoptable: true, id: "suggestion-social-1" },
          {
            adoptable: false,
            id: "suggestion-referral-1",
            rejectionCode: "REFERRAL_TASK_ADD_UNSUPPORTED",
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
    const createBody = JSON.parse(String(fetchImpl.mock.calls[0][1]?.body));
    expect(createBody).toMatchObject({
      duration: createInput.duration,
      ownerAddress: session.address,
      projectId: createInput.projectId,
    });
    expect(createBody).not.toMatchObject({
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
      `http://127.0.0.1:5184/api/owner/campaigns/${campaignId}`,
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-campaign-os-account-type": session.accountType,
          "x-campaign-os-credential-boundary": "ordinary_user_wallet",
          "x-campaign-os-proof-status": "verified",
          "x-campaign-os-roles": "project_owner",
          "x-campaign-os-session-id": session.sessionId,
          "x-campaign-os-wallet-address": session.address,
          "x-campaign-os-wallet-source": session.walletSource,
        }),
        method: "GET",
      }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      4,
      `http://127.0.0.1:5184/api/campaigns/${campaignId}/tasks`,
      expect.objectContaining({ method: "POST" }),
    );
    expect(JSON.parse(String(fetchImpl.mock.calls[3][1]?.body))).not.toMatchObject({
      id: expect.anything(),
      ownerAddress: expect.anything(),
      suggestionId: expect.anything(),
    });
    expect(fetchImpl).toHaveBeenNthCalledWith(
      5,
      `http://127.0.0.1:5184/api/campaigns/${campaignId}/tasks/generate`,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("normalizes exact current additive runtime envelopes without inventing absent fields", async () => {
    const campaignId = "campaign-db-draft-0001";
    const secondCampaignId = "campaign-db-draft-0002";
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response(successEnvelope({
        boundary: { "en-US": "Repository boundary" },
        campaignDb: { draftId: campaignId, storeId: "campaign-db" },
        payload: approvedCampaign(campaignId),
      }, "trace-runtime-create")))
      .mockResolvedValueOnce(response(successEnvelope({
        boundary: { "en-US": "Repository boundary" },
        payload: {
          campaignDb: { draftCount: 2 },
          campaignId: "campaign-db-owner-recovery",
          details: [],
          items: [
            { coreTasks: [], id: secondCampaignId, status: "live" },
            { coreTasks: [], id: campaignId, status: "draft" },
          ],
          summary: { totalCampaigns: 2 },
        },
      }, "trace-runtime-recover")))
      .mockResolvedValueOnce(response(successEnvelope({
        boundary: { "en-US": "Repository boundary" },
        campaignDb: { createdViaRepository: true },
        payload: {
          item: {
            coreTasks: [],
            id: campaignId,
            ownerAddress: session.address,
            projectId: createInput.projectId,
            status: "draft",
          },
          tasks: [{
            points: 50,
            required: true,
            taskId: "campaign-db-task-draft-0001",
            title: { "en-US": "follow-x" },
            verificationType: "SOCIAL",
          }],
        },
      }, "trace-runtime-detail")))
      .mockResolvedValueOnce(response(successEnvelope({
        boundary: { "en-US": "Repository boundary" },
        campaignDbTask: { taskId: "campaign-db-task-draft-0002" },
        payload: {
          ...addTaskInput,
          campaignId,
          id: "campaign-db-task-draft-0002",
        },
      }, "trace-runtime-add")))
      .mockResolvedValueOnce(response(successEnvelope({
        boundary: { "en-US": "Local preview boundary" },
        payload: {
          campaignId,
          humanReviewRequired: true,
          pointRules: [],
          taskList: [
            {
              adoptability: "adoptable",
              campaignId,
              evidenceRule: { source: "LOCAL_PREVIEW" },
              id: "local-task-share-x",
              points: 80,
              required: true,
              templateCode: "share-x",
              verificationType: "SOCIAL",
              walletCompatibility: "ANY",
            },
            {
              adoptability: "unsupported",
              campaignId,
              evidenceRule: { source: "LOCAL_PREVIEW" },
              id: "local-task-invite-friends",
              points: 200,
              required: false,
              templateCode: "invite-friends",
              unsupportedReason: "REFERRAL_TASK_ADD_UNSUPPORTED",
              verificationType: "REFERRAL",
              walletCompatibility: "ANY",
            },
          ],
          walletCompatibility: [],
        },
      }, "trace-runtime-generate")));
    const bridge = createBridge(fetchImpl);

    const createResult = await bridge.createCampaign(createInput, { session });
    const recoverResult = await bridge.recoverCampaigns(createInput.projectId, { session });
    const detailResult = await bridge.getCampaignDetail(campaignId, { session });
    const addResult = await bridge.addTask(campaignId, addTaskInput, { session });
    const previewResult = await bridge.generateTaskPreview(campaignId, generateInput, { session });

    expect(createResult).toMatchObject({ campaignId, ok: true, traceId: "trace-runtime-create" });
    expect(recoverResult).toEqual({
      campaigns: [
        { id: secondCampaignId, status: "live" },
        { id: campaignId, status: "draft" },
      ],
      httpStatus: 200,
      ok: true,
      traceId: "trace-runtime-recover",
    });
    expect(detailResult).toEqual({
      campaign: {
        id: campaignId,
        ownerAddress: session.address,
        projectId: createInput.projectId,
        status: "draft",
      },
      httpStatus: 200,
      ok: true,
      tasks: [{
        id: "campaign-db-task-draft-0001",
        points: 50,
        required: true,
        verificationType: "SOCIAL",
      }],
      traceId: "trace-runtime-detail",
    });
    expect(addResult).toMatchObject({
      ok: true,
      taskId: "campaign-db-task-draft-0002",
    });
    expect(previewResult).toMatchObject({
      ok: true,
      preview: {
        suggestions: [
          { adoptable: true, id: "local-task-share-x", verificationType: "SOCIAL" },
          {
            adoptable: false,
            id: "local-task-invite-friends",
            rejectionCode: "REFERRAL_TASK_ADD_UNSUPPORTED",
            verificationType: "REFERRAL",
          },
        ],
      },
    });
    expect(fetchImpl).toHaveBeenCalledTimes(5);
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
      message: "token=secret and /Users/example/Documents/internal-review/evidence.json",
      stack: "stack trace should not leak",
    }));
    const bridge = createBridge(fetchImpl);

    const result = await bridge.addTask("campaign-db-draft-0001", addTaskInput, { session });

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
    expect(serialized).not.toMatch(/token=secret|internal-review|stack trace|private key/);
  });

  it.each([
    ["wrong ok discriminant", { data: { payload: { id: "campaign-db-draft-0001" } }, ok: "true" }],
    ["missing payload", { data: {}, ok: true }],
    ["empty persisted ID", successEnvelope({
      payload: { ...approvedTask(" "), campaignId: "campaign-db-draft-0001" },
    })],
  ])("fails explicitly for malformed envelopes: %s", async (_name, body) => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(response(body));
    const bridge = createBridge(fetchImpl);

    const result = await bridge.addTask("campaign-db-draft-0001", addTaskInput, { session });

    expect(result).toMatchObject({
      code: "BRIDGE_RESPONSE_INVALID",
      ok: false,
      retryable: false,
    });
  });

  it.each([
    "campaign-11111111-1111-4111-8111-111111111111",
    "campaign-db-draft-0001",
    "request-campaign-edge",
    "x",
  ])("accepts non-empty Campaign IDs from the persisted response slot: %s", async (campaignId) => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(response(successEnvelope({
      payload: approvedCampaign(campaignId),
    })));
    const result = await createBridge(fetchImpl).createCampaign(createInput, { session });

    expect(result).toMatchObject({ campaignId, ok: true });
  });

  it.each([
    "campaign-task-11111111-1111-4111-8111-111111111111",
    "campaign-db-task-draft-0001",
    "request-task-edge",
    "suggestion-task-edge",
    "preview-task-edge",
    "x",
  ])("accepts non-empty Task IDs from the persisted response slot: %s", async (taskId) => {
    const campaignId = "campaign-db-draft-0001";
    const fetchImpl = vi.fn().mockResolvedValueOnce(response(successEnvelope({
      payload: approvedTask(taskId, campaignId),
    })));
    const result = await createBridge(fetchImpl).addTask(campaignId, addTaskInput, { session });

    expect(result).toMatchObject({ ok: true, taskId });
  });

  type InvalidRuntimeCase = {
    invoke: (bridge: ProjectOwnerCampaignApiBridge, context: unknown) => Promise<unknown>;
    invokeWithInvalidInputs: (
      bridge: ProjectOwnerCampaignApiBridge,
      context: unknown,
    ) => Array<() => Promise<unknown>>;
    name: string;
  };

  const invalidRuntimeCases: InvalidRuntimeCase[] = [
    {
      invoke: (bridge, context) => bridge.createCampaign(createInput, context as never),
      invokeWithInvalidInputs: (bridge, context) => [
        () => bridge.createCampaign(null as never, context as never),
        () => bridge.createCampaign(undefined as never, context as never),
        () => bridge.createCampaign({ projectId: createInput.projectId } as never, context as never),
        () => bridge.createCampaign({ ...createInput, supportedLocales: 42 } as never, context as never),
      ],
      name: "createCampaign",
    },
    {
      invoke: (bridge, context) => bridge.recoverCampaigns(createInput.projectId, context as never),
      invokeWithInvalidInputs: (bridge, context) => [
        () => bridge.recoverCampaigns(null as never, context as never),
        () => bridge.recoverCampaigns(undefined as never, context as never),
        () => bridge.recoverCampaigns({} as never, context as never),
        () => bridge.recoverCampaigns(createInput.projectId, context as never, null as never),
        () => bridge.recoverCampaigns(createInput.projectId, context as never, { limit: "many" } as never),
      ],
      name: "recoverCampaigns",
    },
    {
      invoke: (bridge, context) => bridge.getCampaignDetail("campaign-db-draft-0001", context as never),
      invokeWithInvalidInputs: (bridge, context) => [
        () => bridge.getCampaignDetail(null as never, context as never),
        () => bridge.getCampaignDetail(undefined as never, context as never),
        () => bridge.getCampaignDetail({} as never, context as never),
        () => bridge.getCampaignDetail(" ", context as never),
      ],
      name: "getCampaignDetail",
    },
    {
      invoke: (bridge, context) => bridge.addTask("campaign-db-draft-0001", addTaskInput, context as never),
      invokeWithInvalidInputs: (bridge, context) => [
        () => bridge.addTask(null as never, addTaskInput, context as never),
        () => bridge.addTask("campaign-db-draft-0001", null as never, context as never),
        () => bridge.addTask("campaign-db-draft-0001", undefined as never, context as never),
        () => bridge.addTask("campaign-db-draft-0001", { templateCode: "x" } as never, context as never),
        () => bridge.addTask("campaign-db-draft-0001", { ...addTaskInput, points: "many" } as never, context as never),
      ],
      name: "addTask",
    },
    {
      invoke: (bridge, context) => bridge.generateTaskPreview(
        "campaign-db-draft-0001",
        generateInput,
        context as never,
      ),
      invokeWithInvalidInputs: (bridge, context) => [
        () => bridge.generateTaskPreview(null as never, generateInput, context as never),
        () => bridge.generateTaskPreview("campaign-db-draft-0001", null as never, context as never),
        () => bridge.generateTaskPreview("campaign-db-draft-0001", undefined as never, context as never),
        () => bridge.generateTaskPreview("campaign-db-draft-0001", { goal: "x" } as never, context as never),
        () => bridge.generateTaskPreview(
          "campaign-db-draft-0001",
          { ...generateInput, targetUsers: 42 } as never,
          context as never,
        ),
      ],
      name: "generateTaskPreview",
    },
  ];

  it.each(invalidRuntimeCases)(
    "$name resolves typed failures for malformed context, session, signal, and input without side effects",
    async ({ invoke, invokeWithInvalidInputs }) => {
      const fetchImpl = vi.fn();
      const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
      const bridge = createBridge(fetchImpl);
      const malformedContexts: unknown[] = [
        null,
        undefined,
        {},
        "invalid-context",
        { session: null },
        { session: undefined },
        { session: {} },
        { session: "invalid-session" },
        { session: { ...session, capabilities: null } },
        { session: { ...session, sessionId: 42 } },
        { session, signal: {} },
        { session, traceId: Symbol("trace") },
      ];

      for (const context of malformedContexts) {
        await expect(invoke(bridge, context)).resolves.toMatchObject({
          bridgeCode: "BRIDGE_INVALID_INPUT",
          code: "INVALID_REQUEST",
          ok: false,
          retryable: false,
        });
      }

      const callerAbort = new AbortController();
      const addEventListenerSpy = vi.spyOn(callerAbort.signal, "addEventListener");
      const validContext = { session, signal: callerAbort.signal };
      for (const invalidInvocation of invokeWithInvalidInputs(bridge, validContext)) {
        await expect(invalidInvocation()).resolves.toMatchObject({
          bridgeCode: "BRIDGE_INVALID_INPUT",
          code: "INVALID_REQUEST",
          ok: false,
          retryable: false,
        });
      }

      expect(fetchImpl).not.toHaveBeenCalled();
      expect(setTimeoutSpy).not.toHaveBeenCalled();
      expect(addEventListenerSpy).not.toHaveBeenCalled();
    },
  );

  const circularThrownValue: Record<string, unknown> = {};
  circularThrownValue.self = circularThrownValue;
  const hostileThrownValue = new Proxy({}, {
    get: () => {
      throw new Error("hostile diagnostic getter");
    },
  });

  it.each([
    ["circular", circularThrownValue],
    ["symbol", Symbol("fetch-failure")],
    ["bigint", 42n],
    ["hostile unknown", hostileThrownValue],
  ])("returns a safe typed failure when fetch rejects with %s", async (_name, thrownValue) => {
    vi.useFakeTimers();
    const callerAbort = new AbortController();
    const removeEventListenerSpy = vi.spyOn(callerAbort.signal, "removeEventListener");
    const fetchImpl = vi.fn().mockRejectedValue(thrownValue);
    const bridge = createBridge(fetchImpl);

    await expect(bridge.recoverCampaigns(createInput.projectId, {
      session,
      signal: callerAbort.signal,
    })).resolves.toMatchObject({
      bridgeCode: "BRIDGE_REQUEST_FAILED",
      code: "PERSISTENCE_UNAVAILABLE",
      ok: false,
      retryable: true,
      traceId: "trace-request",
    });

    expect(removeEventListenerSpy).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });

  it("uses response header Trace ID for malformed JSON", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(response("<html>not json</html>", {
      headerTraceId: "trace-header-non-json",
    }));
    const result = await createBridge(fetchImpl).getCampaignDetail("campaign-db-draft-0001", { session });

    expect(result).toMatchObject({
      code: "BRIDGE_RESPONSE_NON_JSON",
      ok: false,
      traceId: "trace-header-non-json",
    });
  });

  it("preflights Content-Length, cancels the body, and keeps the response Trace ID", async () => {
    const streamed = streamResponse(["not-read", "still-not-read"], {
      contentLength: 1_000,
      headerTraceId: "trace-header-content-length",
    });
    const fetchImpl = vi.fn().mockResolvedValueOnce(streamed.response);
    const result = await createBridge(fetchImpl, 64).getCampaignDetail("campaign-db-draft-0001", { session });

    expect(result).toMatchObject({
      code: "BRIDGE_RESPONSE_OVERSIZE",
      ok: false,
      traceId: "trace-header-content-length",
    });
    expect(streamed.cancel).toHaveBeenCalledTimes(1);
    expect(streamed.response.body?.locked).toBe(false);
  });

  it("enforces the response cap in UTF-8 bytes without Content-Length", async () => {
    const body = JSON.stringify(successEnvelope({
      padding: "wide-character".repeat(10),
      payload: {
        item: { id: "campaign-db-draft-0001", status: "draft" },
        tasks: [],
      },
      utf8: "\u754c".repeat(80),
    }, "trace-body-multibyte"));
    const maxResponseBytes = body.length;
    const fetchImpl = vi.fn().mockResolvedValueOnce(response(body, {
      headerTraceId: "trace-header-multibyte",
    }));
    const result = await createBridge(fetchImpl, maxResponseBytes)
      .getCampaignDetail("campaign-db-draft-0001", { session });

    expect(new TextEncoder().encode(body).byteLength).toBeGreaterThan(maxResponseBytes);
    expect(result).toMatchObject({
      code: "BRIDGE_RESPONSE_OVERSIZE",
      ok: false,
      traceId: "trace-header-multibyte",
    });
  });

  it("caps chunked bodies incrementally, cancels unread chunks, and releases the reader", async () => {
    const streamed = streamResponse([
      "{\"padding\":\"1234567890",
      "12345678901234567890",
      "this-chunk-must-not-be-read\"}",
    ], { headerTraceId: "trace-header-chunked" });
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    const fetchImpl = vi.fn().mockResolvedValueOnce(streamed.response);
    const result = await createBridge(fetchImpl, 30)
      .getCampaignDetail("campaign-db-draft-0001", { session });

    expect(result).toMatchObject({
      code: "BRIDGE_RESPONSE_OVERSIZE",
      ok: false,
      traceId: "trace-header-chunked",
    });
    expect(streamed.cancel).toHaveBeenCalledTimes(1);
    expect(streamed.response.body?.locked).toBe(false);
    expect(clearTimeoutSpy).toHaveBeenCalled();
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
      }));
    const bridge = createProjectOwnerCampaignApiBridge({
      config: { baseUrl: "http://127.0.0.1:5184", timeoutMs: 250 },
      fetchImpl: fetchImpl as unknown as ProjectOwnerCampaignApiFetch,
      traceIdGenerator: () => "trace-timeout",
    });

    const timeoutResultPromise = bridge.addTask("campaign-db-draft-0001", addTaskInput, {
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
      fetchImpl: fetchImpl as unknown as ProjectOwnerCampaignApiFetch,
      traceIdGenerator: () => "trace-caller-abort",
    });
    const callerAbortResultPromise = bridgeForCallerAbort.addTask("campaign-db-draft-0001", addTaskInput, {
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
    expect(vi.getTimerCount()).toBe(0);
  });

  it("settles at timeout when fetch ignores AbortSignal", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn(() => new Promise<Response>(() => undefined));
    const bridge = createProjectOwnerCampaignApiBridge({
      config: { baseUrl: "http://127.0.0.1:5184", timeoutMs: 250 },
      fetchImpl: fetchImpl as unknown as ProjectOwnerCampaignApiFetch,
      traceIdGenerator: () => "trace-ignored-abort",
    });

    const resultPromise = bridge.getCampaignDetail("campaign-db-draft-0001", { session });
    await vi.advanceTimersByTimeAsync(250);

    await expect(resultPromise).resolves.toMatchObject({
      code: "BRIDGE_REQUEST_TIMEOUT",
      ok: false,
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("preserves stale proof claims and rejects wrong or case-variant response owners", async () => {
    const staleSession: NormalizedWalletSession = {
      ...session,
      proof: { ...session.proof!, status: "stale", trustLevel: "untrusted" },
    };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response(successEnvelope({
        payload: {
          item: { ...approvedCampaign("campaign-db-draft-0001"), ownerAddress: session.address.toLowerCase() },
          tasks: [],
        },
      })))
      .mockResolvedValueOnce(response(successEnvelope({
        payload: {
          item: { ...approvedCampaign("campaign-db-draft-0001"), ownerAddress: "ELF_different_owner" },
          tasks: [],
        },
      })));
    const bridge = createBridge(fetchImpl);

    const caseVariant = await bridge.getCampaignDetail("campaign-db-draft-0001", { session: staleSession });
    const wrongOwner = await bridge.getCampaignDetail("campaign-db-draft-0001", { session });

    expect(fetchImpl.mock.calls[0][1]?.headers).toEqual(expect.objectContaining({
      "x-campaign-os-proof-status": "stale",
    }));
    expect(caseVariant).toMatchObject({ code: "BRIDGE_RESPONSE_INVALID", ok: false });
    expect(wrongOwner).toMatchObject({ code: "BRIDGE_RESPONSE_INVALID", ok: false });
  });

  it("sanitizes arbitrary unknown values and generic private filesystem paths without throwing", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const throwingJson = {
      toJSON: () => {
        throw new Error("serialization failed");
      },
    };

    for (const value of [circular, Symbol("diagnostic"), 99n, throwingJson, hostileThrownValue]) {
      expect(() => sanitizeProjectOwnerCampaignApiText(value)).not.toThrow();
      expect(typeof sanitizeProjectOwnerCampaignApiText(value)).toBe("string");
    }

    const sanitized = sanitizeProjectOwnerCampaignApiText([
      "Bearer abc.def raw signature private key token=secret stack trace",
      "/home/example/work/internal-review/report.json",
      "/Users/example/Documents/internal-review/evidence.json",
      "/tmp/internal-review/raw.json",
      "/var/folders/ab/cd/T/internal-review/raw.json",
      "C:\\Users\\example\\AppData\\Local\\Temp\\internal-review\\raw.json",
    ].join(" ")).toLowerCase();

    expect(sanitized).not.toMatch(
      /bearer abc|raw signature|private key|token=secret|stack trace|internal-review|\/home\/|\/users\/|\/tmp\/|\/var\/folders|c:\\users\\/,
    );
  });
});
