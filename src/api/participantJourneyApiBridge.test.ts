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

const postgresRepository = {
  ...repository,
  adapterId: "campaign-db-postgresql-adapter",
  mode: "postgres",
} as const;

const verificationAttemptId = "attempt-db-live-1";
const verificationEvidenceHash = "b".repeat(64);
const verificationEvidenceRef = "evidence-ref:participant-bridge-live-1";

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
  accountType: session.accountType,
  authoritative: true,
  campaignId,
  completion: {
    accountType: session.accountType,
    campaignId,
    evidenceHash: verificationEvidenceHash,
    evidenceId: "evidence-db-1",
    id: "completion-db-1",
    pointsAwarded: 100,
    status: "completed",
    taskId,
    verificationAttemptId,
    walletAddress,
    walletSource: session.walletSource,
  },
  evidence: {
    accountType: session.accountType,
    campaignId,
    completionId: "completion-db-1",
    evidenceHash: verificationEvidenceHash,
    evidenceRef: verificationEvidenceRef,
    evidenceSource: "AELFSCAN",
    id: "evidence-db-1",
    liveProviderExecuted: true,
    pointsAwarded: 100,
    status: "completed",
    taskId,
    verificationAttemptId,
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
  diagnosticCodes: ["PROVIDER_MATCH_POSITIVE"],
  evidenceHash: verificationEvidenceHash,
  evidenceId: "evidence-db-1",
  evidenceRef: verificationEvidenceRef,
  evidenceSource: "AELFSCAN",
  liveProviderExecuted: true,
  outcome: "completed",
  pointsAwarded: 100,
  providerFamily: "aefinder",
  repository: postgresRepository,
  retryAfterMs: 0,
  retryable: false,
  status: "completed",
  taskId,
  transportExecuted: true,
  verificationAttemptId,
  walletAddress,
  walletSource: session.walletSource,
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
      verificationAttemptId: payload.completion.verificationAttemptId,
    },
    campaignDbEvidence: {
      completionId: payload.evidence.completionId,
      createdViaRepository: true,
      evidenceHash: payload.evidence.evidenceHash,
      evidenceId: payload.evidence.id,
      evidenceRef: payload.evidence.evidenceRef,
      evidenceSource: payload.evidence.evidenceSource,
      liveProviderExecuted: payload.evidence.liveProviderExecuted,
      repositoryId: payload.repository.repositoryId,
      storeId: payload.repository.storeId,
      taskId: payload.evidence.taskId,
      verificationAttemptId: payload.evidence.verificationAttemptId,
    },
    payload,
  },
  ok: true,
  traceId,
});

const liveCompletedPayload = () => ({
  accountType: session.accountType,
  authoritative: true,
  campaignId,
  canonicalEvidenceSource: "AELFSCAN",
  diagnosticCodes: ["PROVIDER_MATCH_POSITIVE"],
  evidence: {
    capturedAt: "2026-07-16T04:00:00.000Z",
    evidenceHash: verificationEvidenceHash,
    evidenceId: "evidence-db-1",
    live: true,
    source: "AELFSCAN",
    sourceLabel: {
      "en-US": "Committed provider verification evidence",
      "zh-CN": "Committed provider verification evidence",
    },
  },
  evidenceHash: verificationEvidenceHash,
  evidenceId: "evidence-db-1",
  evidenceRef: verificationEvidenceRef,
  evidenceSource: "AELFSCAN",
  liveContractExecuted: false,
  liveProviderExecuted: true,
  liveRewardExecuted: false,
  liveStorageExecuted: false,
  manualReview: { queued: false, severity: "info" },
  nextAction: {
    "en-US": "Repository task completion recorded locally.",
    "zh-CN": "Repository task completion recorded locally.",
  },
  outcome: "completed",
  pointsAwarded: 100,
  pointsAvailable: 100,
  provider: {
    nextAdapterStep: {
      "en-US": "Use the committed verification result.",
      "zh-CN": "Use the committed verification result.",
    },
    providerId: "aelfscan",
    readiness: "ready",
  },
  providerFamily: "aefinder",
  retryAfterMs: 0,
  retryable: false,
  riskFlags: [],
  status: "completed",
  taskId,
  transportExecuted: true,
  verificationAttemptId,
  walletAddress,
  walletSource: session.walletSource,
});

const liveCompletedEnvelope = (
  traceId = "trace-live-completed",
) => ({
  data: {
    boundary: { "en-US": "Campaign DB repository boundary." },
    campaignDb: { ...postgresRepository },
    campaignDbCompletion: {
      completionId: "completion-db-1",
      createdViaRepository: true,
      evidenceId: "evidence-db-1",
      repositoryId: postgresRepository.repositoryId,
      storeId: postgresRepository.storeId,
      taskId,
    },
    campaignDbEvidence: {
      completionId: "completion-db-1",
      createdViaRepository: true,
      evidenceHash: verificationEvidenceHash,
      evidenceId: "evidence-db-1",
      evidenceRef: verificationEvidenceRef,
      evidenceSource: "AELFSCAN",
      liveContractExecuted: false,
      liveProviderExecuted: true,
      liveRewardExecuted: false,
      liveStorageExecuted: false,
      repositoryId: postgresRepository.repositoryId,
      status: "completed",
      storeId: postgresRepository.storeId,
      taskId,
    },
    payload: liveCompletedPayload(),
    persistence: {
      kind: "verification_attempt",
      recordId: "audit-verification-attempt-1",
    },
  },
  ok: true,
  traceId,
});

const attemptOnlyEnvelope = (
  outcome: "failed" | "manual_review" | "pending" = "pending",
  traceId = `trace-live-${outcome}`,
) => ({
  data: {
    boundary: { "en-US": "Campaign DB repository boundary." },
    campaignDb: { ...postgresRepository },
    payload: {
      authoritative: outcome !== "pending",
      campaignId,
      diagnosticCodes: [
        outcome === "pending"
          ? "TASK_VERIFICATION_ATTEMPT_IN_PROGRESS"
          : `PROVIDER_${outcome.toUpperCase()}`,
      ],
      outcome,
      pointsAwarded: 0,
      providerFamily: "aefinder",
      retryAfterMs: outcome === "pending" ? 1_000 : 0,
      retryable: outcome === "pending",
      status: outcome,
      taskId,
      transportExecuted: outcome !== "pending",
      verificationAttemptId: `attempt-db-${outcome}`,
      walletAddress,
      walletSource: session.walletSource,
    },
    persistence: {
      kind: "verification_attempt",
      recordId: `audit-verification-attempt-${outcome}`,
    },
  },
  ok: true,
  traceId,
});

const response = (
  body: unknown,
  options: {
    contentLength?: number;
    contentType?: string;
    status?: number;
    traceId?: string;
  } = {},
): Response => {
  const headers = new Headers({ "content-type": options.contentType ?? "application/json" });
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
      .mockResolvedValueOnce(response(liveCompletedEnvelope("trace-runtime-verify")));
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
    expect(verify.ok && verify.verification.repository).toEqual({
      ...postgresRepository,
      mode: "postgres",
    });
  });

  it("trims, bounds, and encodes canonical IDs without sharing caller identity", async () => {
    const encodedCampaign = "campaign A/B";
    const encodedTask = "task A/B";
    const payload = {
      ...verification(),
      campaignId: encodedCampaign,
      completion: { ...verification().completion, campaignId: encodedCampaign, taskId: encodedTask },
      evidence: { ...verification().evidence, campaignId: encodedCampaign, taskId: encodedTask },
      participant: { ...verification().participant, campaignId: encodedCampaign },
      taskId: encodedTask,
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
    ["repository", "BRIDGE_RESPONSE_INVALID", "response", (value: ReturnType<typeof verificationEnvelope>) => {
      delete (value.data as Partial<typeof value.data>).campaignDb;
      delete (value.data.payload as Partial<typeof value.data.payload>).repository;
    }],
    ["completion provenance", "BRIDGE_RESPONSE_INVALID", "response", (value: ReturnType<typeof verificationEnvelope>) => {
      delete (value.data as Partial<typeof value.data>).campaignDbCompletion;
    }],
    ["evidence provenance", "BRIDGE_RESPONSE_INVALID", "response", (value: ReturnType<typeof verificationEnvelope>) => {
      delete (value.data as Partial<typeof value.data>).campaignDbEvidence;
    }],
    ["matching Task provenance", "BRIDGE_RESPONSE_IDENTITY_MISMATCH", "identity", (value: ReturnType<typeof verificationEnvelope>) => {
      value.data.campaignDbEvidence.taskId = "other-task";
    }],
  ] as const)("rejects verify success without %s", async (_name, code, phase, mutate) => {
    const payload = verificationEnvelope();
    mutate(payload);

    const result = await bridge(vi.fn().mockResolvedValue(response(payload)))
      .verifyTask(taskId, context());

    expect(result).toMatchObject({ code, ok: false, phase });
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

describe("Participant live verification bridge contract", () => {
  it("projects a WP04 completed wire response into canonical attempt, records, diagnostics, and PostgreSQL provenance", async () => {
    const payload = liveCompletedEnvelope("trace-live-completed");
    Object.assign(payload.data.payload, {
      participant: {
        accountType: session.accountType,
        campaignId,
        id: "participant-db-1",
        totalPoints: 100,
        walletAddress,
        walletSource: session.walletSource,
      },
    });

    const result = await bridge(vi.fn().mockResolvedValue(response(payload, {
      status: 200,
      traceId: "trace-live-completed",
    }))).verifyTask(taskId, context());

    expect(result).toEqual({
      httpStatus: 200,
      ok: true,
      outcome: "completed",
      source: "durable",
      status: "completed",
      traceId: "trace-live-completed",
      verification: {
        attempt: {
          authoritative: true,
          id: verificationAttemptId,
          providerFamily: "aefinder",
          retryAfterMs: 0,
          retryable: false,
          status: "completed",
          transportExecuted: true,
        },
        completion: {
          accountType: session.accountType,
          campaignId,
          evidenceHash: verificationEvidenceHash,
          evidenceId: "evidence-db-1",
          id: "completion-db-1",
          pointsAwarded: 100,
          status: "completed",
          taskId,
          verificationAttemptId,
          walletAddress,
          walletSource: session.walletSource,
        },
        diagnostics: [{
          code: "PROVIDER_MATCH_POSITIVE",
          retryable: false,
          severity: "info",
        }],
        evidence: {
          accountType: session.accountType,
          campaignId,
          completionId: "completion-db-1",
          evidenceHash: verificationEvidenceHash,
          evidenceRef: verificationEvidenceRef,
          evidenceSource: "AELFSCAN",
          id: "evidence-db-1",
          liveProviderExecuted: true,
          pointsAwarded: 100,
          status: "completed",
          taskId,
          verificationAttemptId,
          walletAddress,
          walletSource: session.walletSource,
        },
        outcome: "completed",
        participant: {
          accountType: session.accountType,
          campaignId,
          id: "participant-db-1",
          totalPoints: 100,
          walletAddress,
          walletSource: session.walletSource,
        },
        repository: {
          ...postgresRepository,
          mode: "postgres",
        },
      },
    });
  });

  it.each(["failed", "manual_review"] as const)(
    "accepts a zero-point 200 %s attempt without fabricating provider Evidence",
    async (outcome) => {
      const wire = attemptOnlyEnvelope(outcome);

      const result = await bridge(vi.fn().mockResolvedValue(response(wire, { status: 200 })))
        .verifyTask(taskId, context());

      expect(result).toMatchObject({
        httpStatus: 200,
        ok: true,
        outcome,
        status: outcome,
        verification: {
          attempt: {
            id: `attempt-db-${outcome}`,
            retryable: false,
            status: outcome,
          },
          diagnostics: [{
            code: `PROVIDER_${outcome.toUpperCase()}`,
            retryable: false,
          }],
          outcome,
          repository: {
            adapterId: "campaign-db-postgresql-adapter",
            mode: "postgres",
          },
        },
      });
      expect(result.ok && result.verification).not.toHaveProperty("evidence");
      expect(result.ok && result.verification).not.toHaveProperty("completion");
    },
  );

  it("accepts a linked optional zero-point Completion for a failed result", async () => {
    const wire = attemptOnlyEnvelope("failed");
    Object.assign(wire.data, {
      campaignDb: postgresRepository,
      completion: {
        accountType: session.accountType,
        campaignId,
        id: "completion-db-failed",
        pointsAwarded: 0,
        status: "failed",
        taskId,
        verificationAttemptId: "attempt-db-failed",
        walletAddress,
        walletSource: session.walletSource,
      },
    });

    const result = await bridge(vi.fn().mockResolvedValue(response(wire)))
      .verifyTask(taskId, context());

    expect(result).toMatchObject({
      ok: true,
      outcome: "failed",
      verification: {
        completion: {
          id: "completion-db-failed",
          pointsAwarded: 0,
          status: "failed",
          verificationAttemptId: "attempt-db-failed",
        },
      },
    });
    expect(result.ok && result.verification).not.toHaveProperty("evidence");
  });

  it("projects a real attempt-only 202 busy receipt with stable retry posture and no canonical rows", async () => {
    const wire = attemptOnlyEnvelope("pending", "trace-live-busy");

    const result = await bridge(vi.fn().mockResolvedValue(response(wire, {
      status: 202,
      traceId: "trace-live-busy",
    }))).verifyTask(taskId, context());

    expect(result).toEqual({
      httpStatus: 202,
      ok: true,
      outcome: "pending",
      source: "durable",
      status: "pending",
      traceId: "trace-live-busy",
      verification: {
        attempt: {
          authoritative: false,
          id: "attempt-db-pending",
          providerFamily: "aefinder",
          retryAfterMs: 1_000,
          retryable: true,
          status: "pending",
          transportExecuted: false,
        },
        diagnostics: [{
          code: "TASK_VERIFICATION_ATTEMPT_IN_PROGRESS",
          retryAfterMs: 1_000,
          retryable: true,
          severity: "warning",
        }],
        outcome: "pending",
        repository: {
          ...postgresRepository,
          mode: "postgres",
        },
      },
    });
  });

  it.each([
    ["repository metadata is missing", (wire: ReturnType<typeof attemptOnlyEnvelope>) => {
      Reflect.deleteProperty(wire.data, "campaignDb");
    }],
    ["repository mode is missing", (wire: ReturnType<typeof attemptOnlyEnvelope>) => {
      Reflect.deleteProperty(wire.data.campaignDb, "mode");
    }],
  ] as const)("fails closed when attempt-only %s", async (_name, mutate) => {
    const wire = attemptOnlyEnvelope("pending");
    mutate(wire);

    const result = await bridge(vi.fn().mockResolvedValue(response(wire, { status: 202 })))
      .verifyTask(taskId, context());

    expect(result).toMatchObject({
      code: "BRIDGE_RESPONSE_INVALID",
      ok: false,
      phase: "response",
    });
  });

  it("returns the same canonical attempt projection for first completion and terminal replay", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response(liveCompletedEnvelope("trace-first")))
      .mockResolvedValueOnce(response(liveCompletedEnvelope("trace-replay")));
    const api = bridge(fetchImpl);

    const first = await api.verifyTask(taskId, context());
    const replay = await api.verifyTask(taskId, context());

    expect(first.ok && first.verification).toEqual(replay.ok && replay.verification);
    expect(first).toMatchObject({ ok: true, traceId: "trace-first" });
    expect(replay).toMatchObject({ ok: true, traceId: "trace-replay" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    for (const [, init] of fetchImpl.mock.calls) {
      expect(JSON.parse(String(init?.body))).toEqual({ campaignId });
      expect(JSON.parse(String(init?.body))).not.toHaveProperty("idempotencyKey");
    }
  });

  it.each([
    ["Campaign", (value: ReturnType<typeof liveCompletedEnvelope>) => {
      value.data.payload.campaignId = "campaign-other";
    }],
    ["Task", (value: ReturnType<typeof liveCompletedEnvelope>) => {
      value.data.payload.taskId = "task-other";
    }],
    ["wallet", (value: ReturnType<typeof liveCompletedEnvelope>) => {
      value.data.payload.walletAddress = walletAddress.toLowerCase();
    }],
    ["account", (value: ReturnType<typeof liveCompletedEnvelope>) => {
      value.data.payload.accountType = session.accountType === "EOA" ? "AA" : "EOA";
    }],
    ["source", (value: ReturnType<typeof liveCompletedEnvelope>) => {
      value.data.payload.walletSource = "PORTKEY_AA";
    }],
    ["Completion/Evidence", (value: ReturnType<typeof liveCompletedEnvelope>) => {
      value.data.campaignDbEvidence.completionId = "completion-other";
    }],
    ["attempt", (value: ReturnType<typeof liveCompletedEnvelope>) => {
      Object.assign(value.data.campaignDbEvidence, { verificationAttemptId: "attempt-other" });
    }],
    ["Evidence hash", (value: ReturnType<typeof liveCompletedEnvelope>) => {
      value.data.campaignDbEvidence.evidenceHash = "c".repeat(64);
    }],
    ["Evidence source", (value: ReturnType<typeof liveCompletedEnvelope>) => {
      value.data.campaignDbEvidence.evidenceSource = "DAPP_API";
    }],
    ["Participant", (value: ReturnType<typeof liveCompletedEnvelope>) => {
      Object.assign(value.data.payload, {
        participant: {
          accountType: "AA",
          campaignId,
          id: "participant-db-mismatch",
          totalPoints: 100,
          walletAddress,
          walletSource: session.walletSource,
        },
      });
    }],
    ["repository", (value: ReturnType<typeof liveCompletedEnvelope>) => {
      (value.data.campaignDbEvidence as { repositoryId: string }).repositoryId = "repository-other";
    }],
  ] as const)("fails closed on completed %s identity/linkage mismatch", async (_name, mutate) => {
    const wire = liveCompletedEnvelope();
    mutate(wire);

    const result = await bridge(vi.fn().mockResolvedValue(response(wire)))
      .verifyTask(taskId, context());

    expect(result).toMatchObject({
      code: "BRIDGE_RESPONSE_IDENTITY_MISMATCH",
      ok: false,
      phase: "identity",
      status: "blocked",
    });
  });

  it.each([
    ["missing status", (value: ReturnType<typeof liveCompletedEnvelope>) => {
      delete (value.data.payload as Partial<typeof value.data.payload>).status;
    }],
    ["unknown outcome", (value: ReturnType<typeof liveCompletedEnvelope>) => {
      (value.data.payload as { outcome: string }).outcome = "success";
    }],
    ["negative points", (value: ReturnType<typeof liveCompletedEnvelope>) => {
      value.data.payload.pointsAwarded = -1;
    }],
    ["unsafe evidence hash", (value: ReturnType<typeof liveCompletedEnvelope>) => {
      value.data.payload.evidenceHash = "evidence-hash:not-a-sha256";
    }],
    ["unsafe evidence ref", (value: ReturnType<typeof liveCompletedEnvelope>) => {
      value.data.payload.evidenceRef = "https://provider.example/verify?token=secret";
    }],
    ["credential evidence ref", (value: ReturnType<typeof liveCompletedEnvelope>) => {
      value.data.payload.evidenceRef = "credential-ref:provider-secret";
    }],
    ["non-live provider Evidence", (value: ReturnType<typeof liveCompletedEnvelope>) => {
      value.data.campaignDbEvidence.liveProviderExecuted = false;
    }],
    ["non-PostgreSQL repository", (value: ReturnType<typeof liveCompletedEnvelope>) => {
      (value.data.campaignDb as { adapterId: string }).adapterId = "campaign-db-deterministic-adapter";
    }],
    ["oversize diagnostics", (value: ReturnType<typeof liveCompletedEnvelope>) => {
      value.data.payload.diagnosticCodes = Array.from({ length: 33 }, (_item, index) => `SAFE_${index}`);
    }],
  ] as const)("rejects an invalid verification response: %s", async (_name, mutate) => {
    const wire = liveCompletedEnvelope();
    mutate(wire);

    const result = await bridge(vi.fn().mockResolvedValue(response(wire)))
      .verifyTask(taskId, context());

    expect(result).toMatchObject({
      code: "BRIDGE_RESPONSE_INVALID",
      ok: false,
      phase: "response",
    });
  });

  it("rejects invalid or conflicting response Trace IDs", async () => {
    const invalidBodyTrace = liveCompletedEnvelope("trace contains spaces");
    const conflictingTrace = liveCompletedEnvelope("trace-body-safe");
    const api = bridge(vi
      .fn()
      .mockResolvedValueOnce(response(invalidBodyTrace))
      .mockResolvedValueOnce(response(conflictingTrace, { traceId: "trace-header-other" })));

    await expect(api.verifyTask(taskId, context())).resolves.toMatchObject({
      code: "BRIDGE_RESPONSE_INVALID",
      ok: false,
    });
    await expect(api.verifyTask(taskId, context())).resolves.toMatchObject({
      code: "BRIDGE_RESPONSE_INVALID",
      ok: false,
    });
  });

  it.each([
    ["endpoint", (value: ReturnType<typeof liveCompletedEnvelope>) => {
      Object.assign(value, { endpoint: "https://private-provider.example" });
    }],
    ["credentialRef", (value: ReturnType<typeof liveCompletedEnvelope>) => {
      Object.assign(value.data, { credentialRef: "credential-ref:private" });
    }],
    ["authorization", (value: ReturnType<typeof liveCompletedEnvelope>) => {
      Object.assign(value.data.payload, { authorization: "Bearer private" });
    }],
    ["responseBody", (value: ReturnType<typeof liveCompletedEnvelope>) => {
      Object.assign(value.data.payload.evidence, { responseBody: { matched: true } });
    }],
    ["leaseToken", (value: ReturnType<typeof liveCompletedEnvelope>) => {
      Object.assign(value.data.campaignDbEvidence, { leaseToken: "private-lease" });
    }],
    ["sql", (value: ReturnType<typeof liveCompletedEnvelope>) => {
      Object.assign(value.data.persistence, { sql: "select secret" });
    }],
    ["stackTrace", (value: ReturnType<typeof liveCompletedEnvelope>) => {
      Object.assign(value.data.payload.provider, { stackTrace: "/Users/private/provider.ts" });
    }],
    ["idempotencyKey", (value: ReturnType<typeof liveCompletedEnvelope>) => {
      Object.assign(value.data.payload, { idempotencyKey: "client-controlled" });
    }],
  ] as const)("fails closed when a forbidden nested response key is present: %s", async (_key, mutate) => {
    const wire = liveCompletedEnvelope();
    mutate(wire);

    const result = await bridge(vi.fn().mockResolvedValue(response(wire)))
      .verifyTask(taskId, context());

    expect(result).toMatchObject({
      code: "BRIDGE_RESPONSE_INVALID",
      ok: false,
      phase: "response",
    });
    expect(JSON.stringify(result)).not.toContain("private-provider");
    expect(JSON.stringify(result)).not.toContain("private-lease");
  });

  it("rejects provider Evidence and positive points for every non-completed outcome", async () => {
    for (const outcome of ["failed", "manual_review", "pending"] as const) {
      const withEvidence = liveCompletedEnvelope();
      withEvidence.data.payload.outcome = outcome;
      withEvidence.data.payload.status = outcome;
      withEvidence.data.payload.pointsAwarded = 0;
      withEvidence.data.payload.retryable = outcome === "pending";
      withEvidence.data.payload.retryAfterMs = outcome === "pending" ? 1_000 : 0;

      const evidenceResult = await bridge(vi.fn().mockResolvedValue(response(withEvidence, {
        status: outcome === "pending" ? 202 : 200,
      }))).verifyTask(taskId, context());
      expect(evidenceResult).toMatchObject({ code: "BRIDGE_RESPONSE_INVALID", ok: false });

      const withPoints = attemptOnlyEnvelope(outcome);
      withPoints.data.payload.pointsAwarded = 1;
      const pointsResult = await bridge(vi.fn().mockResolvedValue(response(withPoints, {
        status: outcome === "pending" ? 202 : 200,
      }))).verifyTask(taskId, context());
      expect(pointsResult).toMatchObject({ code: "BRIDGE_RESPONSE_INVALID", ok: false });
    }
  });

  it("rejects Evidence linkage hidden inside an optional non-completed Completion", async () => {
    const wire = attemptOnlyEnvelope("failed");
    Object.assign(wire.data, {
      completion: {
        accountType: session.accountType,
        campaignId,
        evidenceId: "evidence-must-not-exist",
        id: "completion-db-failed",
        pointsAwarded: 0,
        status: "failed",
        taskId,
        verificationAttemptId: "attempt-db-failed",
        walletAddress,
        walletSource: session.walletSource,
      },
    });

    const result = await bridge(vi.fn().mockResolvedValue(response(wire)))
      .verifyTask(taskId, context());

    expect(result).toMatchObject({ code: "BRIDGE_RESPONSE_INVALID", ok: false });
  });

  it.each([
    [200, attemptOnlyEnvelope("pending")],
    [202, liveCompletedEnvelope()],
  ] as const)("rejects HTTP %s when it contradicts the business outcome", async (status, wire) => {
    const result = await bridge(vi.fn().mockResolvedValue(response(wire, { status })))
      .verifyTask(taskId, context());

    expect(result).toMatchObject({ code: "BRIDGE_RESPONSE_INVALID", ok: false });
  });

  it.each([
    ["wrong content type", () => response(liveCompletedEnvelope(), { contentType: "text/html" }), "BRIDGE_RESPONSE_NON_JSON"],
    ["non-JSON", () => response("not-json"), "BRIDGE_RESPONSE_NON_JSON"],
    ["empty", () => response(""), "BRIDGE_RESPONSE_EMPTY"],
    [
      "oversize",
      () => response(liveCompletedEnvelope(), { contentLength: 100_000 }),
      "BRIDGE_RESPONSE_OVERSIZE",
    ],
  ] as const)("maps %s verification responses to %s", async (_name, createResponse, code) => {
    const result = await bridge(
      vi.fn().mockResolvedValue(createResponse()),
      { maxResponseBytes: 1_024 },
    ).verifyTask(taskId, context());

    expect(result).toMatchObject({ code, ok: false, phase: "response" });
  });

  it.each([
    [401, "SESSION_INVALID", "SESSION_STALE", true, false, undefined],
    [403, "PARTICIPANT_FORBIDDEN", "ROLE_SCOPE_FORBIDDEN", false, false, undefined],
    [404, "TASK_NOT_FOUND", "TASK_SCOPE_NOT_FOUND", false, false, undefined],
    [409, "ATTEMPT_CONFLICT", "ATTEMPT_VERSION_CONFLICT", false, true, 250],
    [413, "RESPONSE_TOO_LARGE", "RESPONSE_BOUND_EXCEEDED", false, false, undefined],
    [422, "EVIDENCE_INVALID", "EVIDENCE_LINKAGE_INVALID", false, false, undefined],
    [503, "PERSISTENCE_UNAVAILABLE", "POSTGRES_UNAVAILABLE", false, true, 1_000],
  ] as const)(
    "maps HTTP %s without conflating transport status and a business success",
    async (status, code, diagnosticCode, reconnectRequired, retryable, retryAfterMs) => {
      const errorResponse = response({
        error: {
          code,
          details: {
            diagnosticCode,
            field: status === 404 ? "taskId" : "verification",
            retryable,
            ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
          },
          message: "Safe public error.",
        },
        ok: false,
        traceId: `trace-http-${status}`,
      }, { status, traceId: `trace-http-${status}` });

      const result = await bridge(vi.fn().mockResolvedValue(errorResponse))
        .verifyTask(taskId, context());

      expect(result).toMatchObject({
        code,
        httpStatus: status,
        ok: false,
        reconnectRequired,
        retryable,
        safeDetails: {
          diagnosticCode,
          field: status === 404 ? "taskId" : "verification",
          retryable,
          ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
        },
        source: "durable",
        status: status === 503 ? "degraded" : "blocked",
        traceId: `trace-http-${status}`,
      });
      expect(result).not.toHaveProperty("outcome");
      expect(JSON.stringify(result)).not.toContain("Safe public error");
    },
  );

  it("fails closed on forbidden material keys in a typed HTTP error envelope", async () => {
    const result = await bridge(vi.fn().mockResolvedValue(response({
      error: {
        code: "PERSISTENCE_UNAVAILABLE",
        details: {
          field: "verification",
          retryable: true,
          stackTrace: "/Users/private/provider.ts",
        },
        message: "Safe public error.",
      },
      ok: false,
      traceId: "trace-http-forbidden-error",
    }, { status: 503 }))).verifyTask(taskId, context());

    expect(result).toMatchObject({
      code: "BRIDGE_RESPONSE_INVALID",
      ok: false,
      phase: "response",
    });
    expect(JSON.stringify(result)).not.toContain("provider.ts");
  });

  it("uses existing request failure categories for network, caller abort, and timeout and cleans resources", async () => {
    vi.useFakeTimers();

    const networkController = new AbortController();
    const networkRemove = vi.spyOn(networkController.signal, "removeEventListener");
    const network = await bridge(vi.fn().mockRejectedValue(new Error("network private detail")))
      .verifyTask(taskId, context({ signal: networkController.signal }));
    expect(network).toMatchObject({ code: "BRIDGE_REQUEST_FAILED", ok: false });
    expect(networkRemove).toHaveBeenCalledWith("abort", expect.any(Function));

    const callerController = new AbortController();
    const callerRemove = vi.spyOn(callerController.signal, "removeEventListener");
    const callerPromise = bridge(vi.fn((_url: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      })), { timeoutMs: 1_000 }).verifyTask(taskId, context({ signal: callerController.signal }));
    callerController.abort();
    await expect(callerPromise).resolves.toMatchObject({ code: "BRIDGE_REQUEST_ABORTED", ok: false });
    expect(callerRemove).toHaveBeenCalledWith("abort", expect.any(Function));

    const timeoutController = new AbortController();
    const timeoutRemove = vi.spyOn(timeoutController.signal, "removeEventListener");
    const timeoutPromise = bridge(vi.fn(() => new Promise<Response>(() => undefined)), { timeoutMs: 250 })
      .verifyTask(taskId, context({ signal: timeoutController.signal }));
    await vi.advanceTimersByTimeAsync(250);
    await expect(timeoutPromise).resolves.toMatchObject({ code: "BRIDGE_REQUEST_TIMEOUT", ok: false });
    expect(timeoutRemove).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });
});
