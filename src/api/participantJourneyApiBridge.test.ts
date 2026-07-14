import { afterEach, describe, expect, it, vi } from "vitest";
import type { NormalizedWalletSession } from "../domain/types";
import {
  createParticipantJourneyApiBridge,
  sanitizeParticipantJourneyApiText,
  type ParticipantJourneyApiFetch,
  type ParticipantJourneyContext,
} from "./participantJourneyApiBridge";

const campaignId = "campaign-db-preview-CaseA";
const taskId = "task-db-social-1";
const walletAddress = "2F4xYZaB9mQCaseExact";

const session: NormalizedWalletSession = {
  accountType: "EOA",
  address: walletAddress,
  capabilities: ["SIGN_MESSAGE", "CONTRACT_VIEW"],
  chainId: "AELF",
  displayAddress: "2F4x...Exact",
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
};

const repository = {
  adapterId: "campaign-db-adapter",
  createdViaRepository: true,
  repositoryId: "campaign-db-repository-runtime",
  storeId: "campaign-db",
} as const;

const feedItem = {
  campaignId,
  goal: "Complete the durable campaign",
  projectId: "project-aelf",
  repository,
  status: "draft",
  visibility: "participant_preview",
};

const journey = () => ({
  campaign: {
    campaignId,
    endTime: "2026-08-01T00:00:00.000Z",
    goal: "Complete the durable campaign",
    projectId: "project-aelf",
    rewardDescription: "Project-owned rewards",
    startTime: "2026-07-14T00:00:00.000Z",
    status: "draft",
    taskCount: 1,
    walletPolicy: "ANY",
  },
  diagnostics: [],
  eligibility: {
    accountType: session.accountType,
    campaignId,
    eligible: false,
    localePreference: "en-US",
    missingTasks: ["follow-x"],
    riskFlags: [],
    score: 0,
    status: "not_eligible",
    walletAddress,
    walletSource: session.walletSource,
    walletTypeVerified: true,
  },
  participant: {
    accountType: session.accountType,
    campaignId,
    localePreference: "en-US",
    participantId: null,
    riskFlags: [],
    totalPoints: 0,
    walletAddress,
    walletSource: session.walletSource,
    walletTypeVerified: true,
  },
  ranking: {
    campaignId,
    participantCount: 0,
    rank: null,
    source: "repository_projection",
    totalPoints: 0,
    walletAddress,
  },
  repository,
  tasks: [{
    action: "verify",
    blockedReason: null,
    campaignId,
    completionId: null,
    evidenceId: null,
    evidenceSource: null,
    pointsAvailable: 100,
    pointsAwarded: 0,
    required: true,
    status: "not_started",
    taskId,
    templateCode: "follow-x",
    updatedAt: null,
    verificationType: "SOCIAL",
    walletCompatibility: "ANY",
  }],
});

const verification = () => ({
  completion: {
    accountType: session.accountType,
    campaignId,
    evidenceId: "evidence-db-1",
    id: "completion-db-1",
    pointsAwarded: 100,
    status: "completed",
    taskId,
    walletAddress,
    walletSource: session.walletSource,
  },
  evidence: {
    accountType: session.accountType,
    campaignId,
    completionId: "completion-db-1",
    id: "evidence-db-1",
    pointsAwarded: 100,
    status: "completed",
    taskId,
    walletAddress,
    walletSource: session.walletSource,
  },
  participant: {
    accountType: session.accountType,
    campaignId,
    id: "participant-db-1",
    totalPoints: 100,
    walletAddress,
    walletSource: session.walletSource,
  },
  repository,
});

const envelope = (payload: unknown, traceId = "trace-body") => ({
  data: { payload },
  ok: true,
  traceId,
});

const verificationEnvelope = (
  payload = verification(),
  traceId = "trace-body",
) => ({
  data: {
    campaignDb: payload.repository,
    campaignDbCompletion: {
      completionId: payload.completion.id,
      createdViaRepository: true,
      evidenceId: payload.completion.evidenceId,
      repositoryId: payload.repository.repositoryId,
      storeId: payload.repository.storeId,
      taskId: payload.completion.taskId,
    },
    campaignDbEvidence: {
      completionId: payload.evidence.completionId,
      createdViaRepository: true,
      evidenceId: payload.evidence.id,
      repositoryId: payload.repository.repositoryId,
      storeId: payload.repository.storeId,
      taskId: payload.evidence.taskId,
    },
    payload,
  },
  ok: true,
  traceId,
});

const response = (
  body: unknown,
  options: { contentLength?: number; status?: number; traceId?: string } = {},
): Response => {
  const headers = new Headers({ "content-type": "application/json" });
  if (options.contentLength !== undefined) {
    headers.set("content-length", String(options.contentLength));
  }
  if (options.traceId) {
    headers.set("x-campaign-os-trace-id", options.traceId);
  }
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    headers,
    status: options.status ?? 200,
  });
};

const bodyReadFailureResponse = (traceId: string): Response => new Response(
  new ReadableStream<Uint8Array>({
    pull(controller) {
      controller.error(new Error("body read failed"));
    },
  }),
  {
    headers: {
      "content-type": "application/json",
      "x-campaign-os-trace-id": traceId,
    },
    status: 200,
  },
);

const context = (
  overrides: Partial<ParticipantJourneyContext> = {},
): ParticipantJourneyContext => ({
  mode: "durable",
  selectedCampaignId: campaignId,
  session,
  ...overrides,
});

const bridge = (
  fetchImpl: ReturnType<typeof vi.fn>,
  config: Record<string, unknown> = {},
) => createParticipantJourneyApiBridge({
  config: {
    baseUrl: "http://127.0.0.1:5184/root?token=ignored#fragment",
    maxResponseBytes: 64_000,
    timeoutMs: 500,
    ...config,
  },
  fetchImpl: fetchImpl as unknown as ParticipantJourneyApiFetch,
  traceIdGenerator: (operation) => `trace-${operation}`,
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Participant journey API bridge", () => {
  it("builds exact feed, journey, and verify requests from the issued session", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response(envelope({ items: [feedItem] }), { traceId: "trace-feed-header" }))
      .mockResolvedValueOnce(response(envelope(journey(), "trace-journey-body")))
      .mockResolvedValueOnce(response(verificationEnvelope(verification(), "trace-verify-body")));
    const api = bridge(fetchImpl);

    const feed = await api.listCampaigns(context({ selectedCampaignId: null }));
    const detail = await api.getJourney(context());
    const verified = await api.verifyTask(`  ${taskId}  `, context());

    expect(feed).toMatchObject({
      campaigns: [{ campaignId, status: "draft", visibility: "participant_preview" }],
      ok: true,
      source: "durable",
      status: "success",
      traceId: "trace-feed-header",
    });
    expect(detail).toMatchObject({ journey: { campaign: { campaignId } }, ok: true });
    expect(verified).toMatchObject({
      ok: true,
      verification: {
        completion: { id: "completion-db-1" },
        evidence: { id: "evidence-db-1" },
      },
    });
    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "http://127.0.0.1:5184/api/participant/campaigns",
      expect.objectContaining({
        headers: expect.objectContaining({
          accept: "application/json",
          "x-campaign-os-roles": "participant",
          "x-campaign-os-session-id": session.sessionId,
          "x-campaign-os-trace-id": "trace-listCampaigns",
          "x-campaign-os-wallet-address": walletAddress,
        }),
        method: "GET",
        signal: expect.any(AbortSignal),
      }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      `http://127.0.0.1:5184/api/participant/campaigns/${campaignId}/journey`,
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      3,
      `http://127.0.0.1:5184/api/tasks/${taskId}/verify`,
      expect.objectContaining({
        body: JSON.stringify({ campaignId }),
        headers: expect.objectContaining({ "content-type": "application/json" }),
        method: "POST",
      }),
    );
    expect(JSON.parse(String(fetchImpl.mock.calls[2][1]?.body))).not.toMatchObject({
      accountType: expect.anything(),
      walletAddress: expect.anything(),
      walletSource: expect.anything(),
    });
  });

  it("normalizes the runtime feed id and flattened verify metadata with repository provenance", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response(envelope({
        items: [{
          endTime: "2026-08-01T00:00:00.000Z",
          id: campaignId,
          repository,
          startTime: "2026-07-14T00:00:00.000Z",
          status: "draft",
          subtitle: { "en-US": "Project-owned rewards" },
          title: { "en-US": "Runtime participant campaign" },
          visibility: "participant_preview",
          walletPolicy: "ANY",
        }],
      })))
      .mockResolvedValueOnce(response({
        data: {
          campaignDbCompletion: {
            completionId: "completion-db-1",
            createdViaRepository: true,
            evidenceId: "evidence-db-1",
            repositoryId: "campaign-db-repository-runtime",
            storeId: "campaign-db",
            taskId,
          },
          campaignDbEvidence: {
            completionId: "completion-db-1",
            createdViaRepository: true,
            evidenceId: "evidence-db-1",
            repositoryId: "campaign-db-repository-runtime",
            storeId: "campaign-db",
            taskId,
          },
          campaignDb: repository,
          payload: {
            accountType: session.accountType,
            campaignId,
            evidence: { evidenceId: "evidence-db-1" },
            evidenceId: "evidence-db-1",
            pointsAwarded: 100,
            status: "completed",
            taskId,
            walletAddress,
            walletSource: session.walletSource,
          },
        },
        ok: true,
        traceId: "trace-runtime-verify",
      }));
    const api = bridge(fetchImpl);

    const feed = await api.listCampaigns(context({ selectedCampaignId: null }));
    const verify = await api.verifyTask(taskId, context());

    expect(feed).toMatchObject({
      campaigns: [{
        campaignId,
        repository,
        subtitle: { "en-US": "Project-owned rewards" },
        title: { "en-US": "Runtime participant campaign" },
      }],
      ok: true,
    });
    expect(verify).toMatchObject({
      ok: true,
      verification: {
        completion: { id: "completion-db-1" },
        evidence: { id: "evidence-db-1" },
      },
    });
    expect(verify.ok && verify.verification.repository).toEqual(repository);
  });

  it("trims, bounds, and encodes canonical IDs without sharing caller identity", async () => {
    const encodedCampaign = "campaign A/B";
    const encodedTask = "task A/B";
    const payload = {
      ...verification(),
      completion: { ...verification().completion, campaignId: encodedCampaign, taskId: encodedTask },
      evidence: { ...verification().evidence, campaignId: encodedCampaign, taskId: encodedTask },
      participant: { ...verification().participant, campaignId: encodedCampaign },
    };
    const fetchImpl = vi.fn().mockResolvedValue(response(verificationEnvelope(payload)));

    const result = await bridge(fetchImpl).verifyTask(` ${encodedTask} `, context({
      selectedCampaignId: ` ${encodedCampaign} `,
    }));

    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://127.0.0.1:5184/api/tasks/task%20A%2FB/verify",
      expect.objectContaining({ body: JSON.stringify({ campaignId: encodedCampaign }) }),
    );
  });

  it.each([
    ["participant wallet", (value: ReturnType<typeof journey>) => {
      value.participant.walletAddress = walletAddress.toLowerCase();
    }],
    ["ranking wallet", (value: ReturnType<typeof journey>) => {
      value.ranking.walletAddress = walletAddress.toLowerCase();
    }],
    ["eligibility source", (value: ReturnType<typeof journey>) => {
      value.eligibility.walletSource = "PORTKEY_AA";
    }],
    ["task Campaign", (value: ReturnType<typeof journey>) => {
      value.tasks[0].campaignId = "campaign-other";
    }],
  ])("fails closed on exact %s identity mismatch", async (_name, mutate) => {
    const payload = journey();
    mutate(payload);
    const fetchImpl = vi.fn().mockResolvedValue(response(envelope(payload)));

    const result = await bridge(fetchImpl).getJourney(context());

    expect(result).toMatchObject({
      code: "BRIDGE_RESPONSE_IDENTITY_MISMATCH",
      ok: false,
      phase: "identity",
      source: "durable",
      status: "blocked",
    });
    expect(JSON.stringify(result)).not.toContain(walletAddress.toLowerCase());
  });

  it.each([
    ["completion wallet", (value: ReturnType<typeof verification>) => {
      value.completion.walletAddress = walletAddress.toLowerCase();
    }],
    ["evidence Campaign", (value: ReturnType<typeof verification>) => {
      value.evidence.campaignId = "campaign-other";
    }],
    ["evidence Task", (value: ReturnType<typeof verification>) => {
      value.evidence.taskId = "task-other";
    }],
  ])("fails closed on verify %s identity mismatch", async (_name, mutate) => {
    const payload = verification();
    mutate(payload);

    const result = await bridge(vi.fn().mockResolvedValue(response(verificationEnvelope(payload))))
      .verifyTask(taskId, context());

    expect(result).toMatchObject({
      code: "BRIDGE_RESPONSE_IDENTITY_MISMATCH",
      ok: false,
      phase: "identity",
      source: "durable",
      status: "blocked",
    });
  });

  it.each([
    ["negative points", (value: ReturnType<typeof journey>) => {
      value.tasks[0].pointsAwarded = -1;
    }],
    ["non-finite points", (value: ReturnType<typeof journey>) => {
      value.participant.totalPoints = Number.NaN;
    }],
    ["invalid rank", (value: ReturnType<typeof journey>) => {
      (value.ranking as { rank: number | null }).rank = -1;
    }],
    ["duplicate Task IDs", (value: ReturnType<typeof journey>) => {
      value.tasks.push({ ...value.tasks[0] });
      value.campaign.taskCount = 2;
    }],
    ["missing repository metadata", (value: ReturnType<typeof journey>) => {
      delete (value as Partial<ReturnType<typeof journey>>).repository;
    }],
  ])("rejects unsafe response shape: %s", async (_name, mutate) => {
    const payload = journey();
    mutate(payload);

    const result = await bridge(vi.fn().mockResolvedValue(response(envelope(payload))))
      .getJourney(context());

    expect(result).toMatchObject({ code: "BRIDGE_RESPONSE_INVALID", ok: false, phase: "response" });
  });

  it.each([
    ["repository", (value: ReturnType<typeof verificationEnvelope>) => {
      delete (value.data as Partial<typeof value.data>).campaignDb;
    }],
    ["completion provenance", (value: ReturnType<typeof verificationEnvelope>) => {
      delete (value.data as Partial<typeof value.data>).campaignDbCompletion;
    }],
    ["evidence provenance", (value: ReturnType<typeof verificationEnvelope>) => {
      delete (value.data as Partial<typeof value.data>).campaignDbEvidence;
    }],
    ["matching Task provenance", (value: ReturnType<typeof verificationEnvelope>) => {
      value.data.campaignDbEvidence.taskId = "other-task";
    }],
  ])("rejects verify success without %s", async (_name, mutate) => {
    const payload = verificationEnvelope();
    mutate(payload);

    const result = await bridge(vi.fn().mockResolvedValue(response(payload)))
      .verifyTask(taskId, context());

    expect(result).toMatchObject({ code: "BRIDGE_RESPONSE_INVALID", ok: false, phase: "response" });
  });

  it("rejects unknown feed visibility without returning the private row", async () => {
    const result = await bridge(vi.fn().mockResolvedValue(response(envelope({
      items: [{ ...feedItem, visibility: "private" }],
    })))).listCampaigns(context({ selectedCampaignId: null }));

    expect(result).toMatchObject({
      code: "BRIDGE_RESPONSE_INVALID",
      ok: false,
      phase: "response",
    });
    expect(JSON.stringify(result)).not.toContain("private");
  });

  it("rejects feed items missing repository metadata", async () => {
    const { repository: _repository, ...feedItemWithoutRepository } = feedItem;

    const result = await bridge(vi.fn().mockResolvedValue(response(envelope({
      items: [feedItemWithoutRepository],
    })))).listCampaigns(context({ selectedCampaignId: null }));

    expect(result).toMatchObject({
      code: "BRIDGE_RESPONSE_INVALID",
      ok: false,
      phase: "response",
    });
  });

  it.each([400, 401, 403, 404, 422, 503])("maps HTTP %s into a typed fail-closed result", async (status) => {
    const fetchImpl = vi.fn().mockResolvedValue(response({
      error: {
        code: status === 503 ? "PERSISTENCE_UNAVAILABLE" : "INVALID_REQUEST",
        details: { field: "campaignId", stack: "/Users/aelf/private stack token=secret" },
      },
      ok: false,
      traceId: "trace-error-body",
    }, { status, traceId: "trace-error-header" }));

    const result = await bridge(fetchImpl).listCampaigns(context({ selectedCampaignId: null }));

    expect(result).toMatchObject({
      httpStatus: status,
      ok: false,
      reconnectRequired: status === 401,
      source: "durable",
      status: status === 503 ? "degraded" : "blocked",
      traceId: "trace-error-header",
    });
    expect(JSON.stringify(result).toLowerCase()).not.toMatch(/token=secret|\/users\/aelf|stack/);
  });

  it("replaces an unsafe server error code instead of reflecting it", async () => {
    const result = await bridge(vi.fn().mockResolvedValue(response({
      error: { code: "RAW_SIGNATURE_PRIVATE_KEY_STACK_TOKEN_SECRET" },
      ok: false,
      traceId: "trace-unsafe-code",
    }, { status: 500 }))).listCampaigns(context({ selectedCampaignId: null }));
    const serialized = JSON.stringify(result).toLowerCase();

    expect(result).toMatchObject({
      code: "HTTP_500",
      httpStatus: 500,
      ok: false,
      retryable: true,
      status: "degraded",
    });
    expect(serialized).not.toMatch(/raw_signature|private_key|stack|token|secret/);
  });

  it("uses a safe response header trace for body parsing failures", async () => {
    const cases: Array<[Response, string, string]> = [
      [response("not-json", { traceId: "trace-non-json-header" }), "BRIDGE_RESPONSE_NON_JSON", "trace-non-json-header"],
      [response("", { traceId: "trace-empty-header" }), "BRIDGE_RESPONSE_EMPTY", "trace-empty-header"],
      [
        response(envelope({ items: [] }), { contentLength: 10_000, traceId: "trace-declared-oversize-header" }),
        "BRIDGE_RESPONSE_OVERSIZE",
        "trace-declared-oversize-header",
      ],
      [
        response(envelope({ items: [{ ...feedItem, goal: "x".repeat(1_000) }] }), {
          traceId: "trace-actual-oversize-header",
        }),
        "BRIDGE_RESPONSE_OVERSIZE",
        "trace-actual-oversize-header",
      ],
      [
        bodyReadFailureResponse("trace-read-failure-header"),
        "BRIDGE_RESPONSE_NON_JSON",
        "trace-read-failure-header",
      ],
    ];

    for (const [fetchResponse, code, traceId] of cases) {
      const result = await bridge(vi.fn().mockResolvedValue(fetchResponse), { maxResponseBytes: 128 })
        .listCampaigns(context({ selectedCampaignId: null }));
      expect(result).toMatchObject({ code, ok: false, traceId });
    }
  });

  it("cancels a declared oversize response body exactly once", async () => {
    const fetchResponse = response(envelope({ items: [feedItem] }), { contentLength: 10_000 });
    const cancel = vi.spyOn(fetchResponse.body!, "cancel");

    const result = await bridge(vi.fn().mockResolvedValue(fetchResponse), { maxResponseBytes: 128 })
      .listCampaigns(context({ selectedCampaignId: null }));

    expect(result).toMatchObject({ code: "BRIDGE_RESPONSE_OVERSIZE", ok: false });
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("cleans timer and caller abort listener after success", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const add = vi.spyOn(controller.signal, "addEventListener");
    const remove = vi.spyOn(controller.signal, "removeEventListener");
    const api = bridge(vi.fn().mockResolvedValue(response(envelope({ items: [feedItem] }))));

    const result = await api.listCampaigns(context({ selectedCampaignId: null, signal: controller.signal }));

    expect(result.ok).toBe(true);
    expect(add).toHaveBeenCalledWith("abort", expect.any(Function), expect.objectContaining({ once: true }));
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });

  it("distinguishes timeout, external abort, and a pre-aborted signal", async () => {
    vi.useFakeTimers();
    const pendingFetch = vi.fn((_url: RequestInfo | URL, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      }));
    const timeoutPromise = bridge(pendingFetch, { timeoutMs: 250 })
      .listCampaigns(context({ selectedCampaignId: null }));
    await vi.advanceTimersByTimeAsync(250);

    await expect(timeoutPromise).resolves.toMatchObject({ code: "BRIDGE_REQUEST_TIMEOUT", ok: false });

    const externalController = new AbortController();
    const externalPromise = bridge(pendingFetch, { timeoutMs: 1_000 }).listCampaigns(context({
      selectedCampaignId: null,
      signal: externalController.signal,
    }));
    externalController.abort();
    await expect(externalPromise).resolves.toMatchObject({ code: "BRIDGE_REQUEST_ABORTED", ok: false });

    const preAborted = new AbortController();
    preAborted.abort();
    const preFetch = vi.fn();
    const preResult = await bridge(preFetch).listCampaigns(context({
      selectedCampaignId: null,
      signal: preAborted.signal,
    }));
    expect(preResult).toMatchObject({ code: "BRIDGE_REQUEST_ABORTED", ok: false });
    expect(preFetch).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rejects malformed or opaque signals without fetch, timers, or listeners", async () => {
    vi.useFakeTimers();
    const addEventListener = vi.fn();
    const malformedSignals = [
      { aborted: false },
      { aborted: false, addEventListener },
      new Proxy({}, {
        get() {
          throw new Error("opaque signal");
        },
      }),
    ];
    const fetchImpl = vi.fn();
    const api = bridge(fetchImpl);

    for (const signal of malformedSignals) {
      const result = await api.listCampaigns(context({
        selectedCampaignId: null,
        signal: signal as unknown as AbortSignal,
      }));

      expect(result).toMatchObject({
        code: "BRIDGE_INVALID_INPUT",
        ok: false,
      });
    }
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(addEventListener).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("uses the response header trace when response body reading times out", async () => {
    vi.useFakeTimers();
    const fetchResponse = new Response(new ReadableStream<Uint8Array>(), {
      headers: {
        "content-type": "application/json",
        "x-campaign-os-trace-id": "trace-body-timeout-header",
      },
      status: 200,
    });
    const resultPromise = bridge(vi.fn().mockResolvedValue(fetchResponse), { timeoutMs: 250 })
      .listCampaigns(context({ selectedCampaignId: null }));

    await vi.advanceTimersByTimeAsync(250);

    await expect(resultPromise).resolves.toMatchObject({
      code: "BRIDGE_REQUEST_TIMEOUT",
      ok: false,
      traceId: "trace-body-timeout-header",
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("settles at the timeout boundary even when fetch ignores AbortSignal", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn(() => new Promise<Response>((resolve) => {
      setTimeout(() => resolve(response(envelope({ items: [feedItem] }))), 10_000);
    }));
    let settled = false;
    const resultPromise = bridge(fetchImpl, { timeoutMs: 250 })
      .listCampaigns(context({ selectedCampaignId: null }))
      .then((result) => {
        settled = true;
        return result;
      });

    await vi.advanceTimersByTimeAsync(250);

    expect(settled).toBe(true);
    await expect(resultPromise).resolves.toMatchObject({ code: "BRIDGE_REQUEST_TIMEOUT", ok: false });
  });

  it("isolates concurrent session requests so aborting one cannot affect another", async () => {
    const walletB = "2F4xYZaB9mQCaseOther";
    const sessionB: NormalizedWalletSession = {
      ...session,
      address: walletB,
      displayAddress: "2F4x...Other",
      id: "wallet-session-participant-b",
      issuer: {
        ...session.issuer!,
        referenceId: "issuer-ref-participant-b",
      },
      sessionId: "sess-participant-issued-b",
    };
    const fetchImpl = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
      const headers = init?.headers as Record<string, string>;

      if (headers["x-campaign-os-wallet-address"] === walletAddress) {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          );
        });
      }

      return Promise.resolve(response(envelope({ items: [feedItem] })));
    });
    const api = bridge(fetchImpl);
    const controllerA = new AbortController();
    const requestA = api.listCampaigns(context({
      selectedCampaignId: null,
      signal: controllerA.signal,
    }));
    const requestB = api.listCampaigns(context({
      selectedCampaignId: null,
      session: sessionB,
    }));

    controllerA.abort();
    const [resultA, resultB] = await Promise.all([requestA, requestB]);
    const signalA = fetchImpl.mock.calls[0][1]?.signal;
    const signalB = fetchImpl.mock.calls[1][1]?.signal;

    expect(resultA).toMatchObject({ code: "BRIDGE_REQUEST_ABORTED", ok: false });
    expect(resultB).toMatchObject({ ok: true, source: "durable" });
    expect(signalA).not.toBe(signalB);
    expect(signalA?.aborted).toBe(true);
    expect(signalB?.aborted).toBe(false);
    expect(fetchImpl.mock.calls[1][1]?.headers).toMatchObject({
      "x-campaign-os-session-id": sessionB.sessionId,
      "x-campaign-os-wallet-address": walletB,
    });
  });

  it("blocks missing durable config/session and protected custom header collisions without network", async () => {
    const fetchImpl = vi.fn();
    const missingBase = await bridge(fetchImpl, { baseUrl: " " }).listCampaigns(context({
      selectedCampaignId: null,
    }));
    const missingSession = await bridge(fetchImpl).listCampaigns(context({
      selectedCampaignId: null,
      session: null,
    }));
    const conflict = await bridge(fetchImpl, {
      headers: { "X-Campaign-OS-Wallet-Address": "forged" },
    }).listCampaigns(context({ selectedCampaignId: null }));

    expect(missingBase).toMatchObject({ code: "BRIDGE_BASE_URL_MISSING", ok: false, status: "blocked" });
    expect(missingSession).toMatchObject({ code: "BRIDGE_SESSION_INVALID", ok: false, status: "blocked" });
    expect(conflict).toMatchObject({ code: "BRIDGE_AUTH_HEADER_CONFLICT", ok: false, status: "blocked" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each([
    ["invalid issuer", { issuer: { ...session.issuer!, valid: false } }],
    ["unverified proof", {
      proof: { ...session.proof!, status: "signature_unverified", trustLevel: "untrusted" },
    }],
    ["internal credential", { capabilities: ["SIGN_MESSAGE", "INTERNAL_AUTOMATION"] }],
  ])("blocks an unusable issued session before fetch: %s", async (_name, overrides) => {
    const fetchImpl = vi.fn().mockResolvedValue(response(envelope({ items: [feedItem] })));

    const result = await bridge(fetchImpl).listCampaigns(context({
      selectedCampaignId: null,
      session: { ...session, ...overrides } as NormalizedWalletSession,
    }));

    expect(result).toMatchObject({ code: "BRIDGE_SESSION_INVALID", ok: false, phase: "auth" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("normalizes opaque/cyclic failures without unsafe diagnostics or seeded success", async () => {
    const cyclic: Record<string, unknown> = {
      message: "raw signature token=secret /Users/aelf/private stack trace",
    };
    cyclic.self = cyclic;
    const result = await bridge(vi.fn().mockRejectedValue(cyclic))
      .getJourney(context());
    const serialized = JSON.stringify(result).toLowerCase();

    expect(result).toMatchObject({
      code: "BRIDGE_REQUEST_FAILED",
      ok: false,
      source: "durable",
      status: "degraded",
    });
    expect(serialized).not.toMatch(/raw signature|token=secret|\/users\/aelf|stack trace|seeded|synthetic/);
    expect(sanitizeParticipantJourneyApiText(cyclic).toLowerCase())
      .not.toMatch(/raw signature|token=secret|\/users\/aelf|stack trace/);
  });
});
