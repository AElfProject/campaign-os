import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { NormalizedWalletSession } from "../domain/types";
import {
  createAdminDurableReviewApiBridge,
  type AdminDurableReviewApiFetch,
  type AdminDurableReviewRequestContext,
} from "./adminDurableReviewApiBridge";

const campaignId = "Campaign One/?#";
const participantId = "Participant/A?#";
const artifactId = "Artifact/A?#";
const fingerprint = "a".repeat(64);
const sourceFingerprint = "b".repeat(64);
const payloadHash = "c".repeat(64);

const session: NormalizedWalletSession = {
  accountType: "EOA",
  address: "2F4xYZaB9mQCaseExact",
  capabilities: ["SIGN_MESSAGE", "CONTRACT_VIEW"],
  chainId: "AELF",
  connectedAt: "2026-07-15T00:00:00.000Z",
  displayAddress: "2F4x...Exact",
  id: "wallet-session-review-operator",
  issuer: {
    artifactType: "local_session_reference",
    cookieIssued: false,
    diagnosticCodes: [],
    issuerMode: "local_opaque",
    jwtIssued: false,
    liveSigningExecuted: false,
    referenceId: "issuer-ref-review-operator",
    ttlSeconds: 900,
    valid: true,
  },
  lastSeenAt: "2026-07-15T00:00:00.000Z",
  network: "testnet",
  normalUserRecommended: true,
  proof: {
    diagnosticCodes: [],
    liveVerificationExecuted: false,
    proofType: "wallet_signature",
    status: "verified",
    trustLevel: "verified_local",
  },
  sessionId: "sess-review-operator-issued",
  signatureStatus: "signed",
  statusMessage: { "en-US": "Connected", "zh-CN": "Connected" },
  verificationStatus: "verified",
  walletName: "Portkey EOA",
  walletSource: "PORTKEY_EOA_EXTENSION",
  walletTypeVerified: true,
};

const repository = {
  adapterId: "campaign-db-postgresql-adapter",
  durable: true,
  repositoryId: "campaign-db-postgresql-runtime",
  storeId: "campaign-db",
} as const;

const campaign = {
  campaignId,
  ownerAddress: "2F4CampaignOwnerCaseExact",
  participantCount: 1,
  projectId: "project-admin-review",
  status: "draft",
  taskCount: 1,
};

const queueItem = {
  campaignId,
  coverage: {
    completedTasks: 1,
    evidenceCount: 1,
    requiredTasks: 1,
    totalTasks: 1,
  },
  currentDecision: null,
  currentFingerprint: fingerprint,
  eligible: true,
  participantId,
  rank: 1,
  reviewState: "pending_review",
  riskFlags: [],
  totalPoints: 100,
  walletAddress: "2F4ParticipantCaseExact",
};

const decisionRecord = {
  decision: "approved",
  decisionId: "decision-review-0001",
  decidedAt: "2026-07-15T01:00:00.000Z",
  note: "Evidence verified.",
  operatorRole: "review_operator",
  operatorSubject: session.address,
  payloadHash,
  reasonCode: "evidence_verified",
  snapshotFingerprint: fingerprint,
  traceId: "trace-decision-record",
  version: 1,
};

const reviewDetail = {
  campaignId,
  currentDecision: decisionRecord,
  history: [decisionRecord],
  participantId,
  reviewState: "approved_current",
  snapshot: {
    campaignId,
    completions: [{ campaignId, completionId: "completion-review-1", participantId }],
    evidence: [{
      campaignId,
      evidenceId: "evidence-review-1",
      evidenceRef: "https://scan.aelf.io/tx/safe-reference",
      participantId,
    }],
    fingerprint,
    fingerprintVersion: "review-snapshot-v1",
    participantId,
    tasks: [{ campaignId, taskId: "task-review-1" }],
  },
};

const winner = {
  campaignId,
  decisionId: decisionRecord.decisionId,
  decisionVersion: 1,
  evidenceHashes: ["evidence-hash:task-review-1"],
  participantId,
  rank: 1,
  snapshotFingerprint: fingerprint,
  totalPoints: 100,
  walletAddress: "2F4ParticipantCaseExact",
};

const artifact = {
  artifactId,
  campaignId,
  contentBytes: 10,
  contentHash: payloadHash,
  createdAt: "2026-07-15T02:00:00.000Z",
  creatorRole: "review_operator",
  creatorSubject: session.address,
  fileName: "campaign-review.csv",
  format: "csv",
  mimeType: "text/csv;charset=utf-8",
  rowCount: 1,
  sourceFingerprint,
  sourceVersion: "artifact-source-v1",
  traceId: "trace-artifact-record",
};

const artifactSourceCampaign = {
  contractMode: "OFF_CHAIN_MVP",
  endTime: "2026-07-31T23:59:59.000Z",
  id: campaignId,
  startTime: "2026-07-01T00:00:00.000Z",
  status: "draft",
  updatedAt: "2026-07-15T02:00:00.000Z",
  walletPolicy: "ANY",
} as const;

const sourceManifest = {
  campaign: artifactSourceCampaign,
  rows: [winner],
  version: "artifact-source-v1",
} as const;

const successEnvelope = (data: unknown, traceId = "trace-server-response") => ({
  data,
  ok: true,
  traceId,
});

interface JsonResponseOptions {
  contentLength?: number | string;
  contentType?: string;
  headerTraceId?: string;
  status?: number;
}

const jsonResponse = (body: unknown, options: JsonResponseOptions = {}): Response => {
  const encoded = typeof body === "string" ? body : JSON.stringify(body);
  const headers = new Headers({
    "content-type": options.contentType ?? "application/json;charset=utf-8",
  });
  if (options.contentLength !== undefined) {
    headers.set("content-length", String(options.contentLength));
  }
  if (options.headerTraceId) {
    headers.set("x-campaign-os-trace-id", options.headerTraceId);
  }

  return new Response(encoded, { headers, status: options.status ?? 200 });
};

interface DownloadResponseOptions {
  contentHash?: string;
  contentLength?: number | string;
  contentType?: string;
  disposition?: string;
  status?: number;
}

const downloadResponse = (
  bytes: Uint8Array,
  options: DownloadResponseOptions = {},
): Response => {
  const headers = new Headers({
    "content-disposition": options.disposition ?? "attachment; filename=\"campaign-review.csv\"",
    "content-length": String(options.contentLength ?? bytes.byteLength),
    "content-type": options.contentType ?? "text/csv;charset=utf-8",
    "x-campaign-os-content-sha256": options.contentHash ?? sha256(bytes),
    "x-campaign-os-trace-id": "trace-server-download",
  });

  return new Response(Uint8Array.from(bytes).buffer, {
    headers,
    status: options.status ?? 200,
  });
};

const sha256 = (value: Uint8Array | string): string => createHash("sha256")
  .update(value)
  .digest("hex");

const context = (
  overrides: Partial<AdminDurableReviewRequestContext> = {},
): AdminDurableReviewRequestContext => ({
  session,
  signal: new AbortController().signal,
  traceId: "trace-client-request",
  ...overrides,
});

const createBridge = (
  fetchImpl: ReturnType<typeof vi.fn>,
  config: Record<string, unknown> = {},
) => createAdminDurableReviewApiBridge({
  config: {
    baseUrl: "http://127.0.0.1:5174/root?credential=ignored#fragment",
    timeoutMs: 500,
    tracePrefix: "admin-review-test",
    ...config,
  },
  fetchImpl: fetchImpl as unknown as AdminDurableReviewApiFetch,
  traceIdGenerator: () => "trace-generated-request",
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Admin durable review API bridge", () => {
  it("maps all nine operations to their exact encoded OpenAPI routes and review_operator authority", async () => {
    const downloadBytes = new TextEncoder().encode("wallet,points\nA,100\n");
    const downloadHash = sha256(downloadBytes);
    const responses = [
      jsonResponse(successEnvelope({ campaigns: [campaign], repository })),
      jsonResponse(successEnvelope({
        campaignId,
        items: [queueItem],
        summary: {
          approvedCurrent: 0,
          needsReviewCurrent: 0,
          pendingReview: 1,
          rejectedCurrent: 0,
          stale: 0,
          total: 1,
        },
      })),
      jsonResponse(successEnvelope(reviewDetail)),
      jsonResponse(successEnvelope({
        campaignId,
        created: true,
        decisionId: decisionRecord.decisionId,
        participantId,
        snapshotFingerprint: fingerprint,
        version: 1,
      }), { status: 201 }),
      jsonResponse(successEnvelope({
        campaignId,
        rows: [winner],
        sourceFingerprint,
        sourceVersion: "artifact-source-v1",
      })),
      jsonResponse(successEnvelope({ artifact, created: true }), { status: 201 }),
      jsonResponse(successEnvelope({ artifacts: [artifact], campaignId })),
      jsonResponse(successEnvelope({
        artifact,
        sourceManifest,
      })),
      downloadResponse(downloadBytes, { contentHash: downloadHash }),
    ];
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => responses.shift()!);
    const bridge = createBridge(fetchImpl);

    const campaignResult = await bridge.listCampaigns(context(), { limit: 10 });
    const queueResult = await bridge.listReviews(campaignId, context(), {
      limit: 25,
      state: "pending_review",
    });
    const detailResult = await bridge.getReviewDetail(campaignId, participantId, context());
    const decisionResult = await bridge.submitDecision(campaignId, participantId, {
        decision: "approved",
        idempotencyKey: "decision-review-0001",
        note: "Evidence verified.",
        reasonCode: "evidence_verified",
        snapshotFingerprint: fingerprint,
      }, context());
    const winnersResult = await bridge.listWinners(campaignId, context(), { limit: 100 });
    const generateResult = await bridge.generateArtifact(campaignId, {
      expectedSourceFingerprint: sourceFingerprint,
      format: "csv",
    }, context());
    const artifactsResult = await bridge.listArtifacts(campaignId, context(), {
      format: "csv",
      limit: 10,
    });
    const artifactResult = await bridge.getArtifactDetail(campaignId, artifactId, context());
    const downloadResult = await bridge.downloadArtifact(campaignId, artifactId, context(), {
      expectedContentHash: downloadHash,
    });
    const results = [
      campaignResult,
      queueResult,
      detailResult,
      decisionResult,
      winnersResult,
      generateResult,
      artifactsResult,
      artifactResult,
      downloadResult,
    ];

    expect(results.every((result) => result.ok)).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(9);
    expect(fetchImpl.mock.calls.map(([url, init]) => [
      url,
      init?.method,
    ])).toEqual([
      ["http://127.0.0.1:5174/api/admin/campaigns?limit=10", "GET"],
      ["http://127.0.0.1:5174/api/admin/campaigns/Campaign%20One%2F%3F%23/reviews?limit=25&state=pending_review", "GET"],
      ["http://127.0.0.1:5174/api/admin/campaigns/Campaign%20One%2F%3F%23/reviews/Participant%2FA%3F%23", "GET"],
      ["http://127.0.0.1:5174/api/admin/campaigns/Campaign%20One%2F%3F%23/reviews/Participant%2FA%3F%23/decisions", "POST"],
      ["http://127.0.0.1:5174/api/admin/campaigns/Campaign%20One%2F%3F%23/winners?limit=100", "GET"],
      ["http://127.0.0.1:5174/api/admin/campaigns/Campaign%20One%2F%3F%23/artifacts", "POST"],
      ["http://127.0.0.1:5174/api/admin/campaigns/Campaign%20One%2F%3F%23/artifacts?limit=10&format=csv", "GET"],
      ["http://127.0.0.1:5174/api/admin/campaigns/Campaign%20One%2F%3F%23/artifacts/Artifact%2FA%3F%23", "GET"],
      ["http://127.0.0.1:5174/api/admin/campaigns/Campaign%20One%2F%3F%23/artifacts/Artifact%2FA%3F%23/download", "GET"],
    ]);

    for (const [, init] of fetchImpl.mock.calls) {
      const headers = new Headers(init?.headers);
      expect(headers.get("x-campaign-os-roles")).toBe("review_operator");
      expect(headers.get("x-campaign-os-session-id")).toBe(session.sessionId);
      expect(headers.get("x-campaign-os-wallet-address")).toBe(session.address);
      expect(headers.get("x-campaign-os-trace-id")).toBe("trace-client-request");
      expect(init?.signal).toBeInstanceOf(AbortSignal);
    }

    expect(new Headers(fetchImpl.mock.calls[3][1]?.headers).get("idempotency-key"))
      .toBe("decision-review-0001");
    expect(JSON.parse(String(fetchImpl.mock.calls[3][1]?.body))).toEqual({
      decision: "approved",
      note: "Evidence verified.",
      reasonCode: "evidence_verified",
      snapshotFingerprint: fingerprint,
    });
    expect(JSON.parse(String(fetchImpl.mock.calls[5][1]?.body))).toEqual({
      expectedSourceFingerprint: sourceFingerprint,
      format: "csv",
    });
    expect(downloadResult).toMatchObject({
      data: {
        contentBytes: downloadBytes.byteLength,
        contentHash: downloadHash,
        fileName: "campaign-review.csv",
        mimeType: "text/csv;charset=utf-8",
      },
      ok: true,
      traceId: "trace-server-download",
    });
    expect(downloadResult.ok && Array.from(downloadResult.data.bytes)).toEqual(Array.from(downloadBytes));
  });

  it.each([
    ["missing config", undefined, {}, "BRIDGE_BASE_URL_MISSING"],
    ["invalid config", session, { baseUrl: "file:///private/runtime" }, "BRIDGE_BASE_URL_INVALID"],
    ["missing session", null, {}, "BRIDGE_SESSION_INVALID"],
    ["invalid issued session", { ...session, issuer: undefined }, {}, "BRIDGE_SESSION_INVALID"],
    ["invalid issuer mode", {
      ...session,
      issuer: { ...session.issuer!, issuerMode: "production_blocked" },
    }, {}, "BRIDGE_SESSION_INVALID"],
    ["invalid issuer signing boundary", {
      ...session,
      issuer: { ...session.issuer!, liveSigningExecuted: true },
    }, {}, "BRIDGE_SESSION_INVALID"],
    ["invalid proof type", {
      ...session,
      proof: { ...session.proof!, proofType: "address_only" },
    }, {}, "BRIDGE_SESSION_INVALID"],
    ["invalid proof trust", {
      ...session,
      proof: { ...session.proof!, trustLevel: "untrusted" },
    }, {}, "BRIDGE_SESSION_INVALID"],
    ["stale proof", { ...session, proof: { ...session.proof!, status: "stale" } }, {}, "BRIDGE_SESSION_INVALID"],
    ["missing signature", { ...session, signatureStatus: "missing" }, {}, "BRIDGE_SESSION_INVALID"],
    ["unverified session", {
      ...session,
      verificationStatus: "missing_signature",
    }, {}, "BRIDGE_SESSION_INVALID"],
    ["unverified wallet type", { ...session, walletTypeVerified: false }, {}, "BRIDGE_SESSION_INVALID"],
    ["missing signing capability", {
      ...session,
      capabilities: ["CONTRACT_VIEW"],
    }, {}, "BRIDGE_SESSION_INVALID"],
    ["internal credential", { ...session, walletSource: "AGENT_SKILL" }, {}, "BRIDGE_SESSION_INVALID"],
  ])("fails closed without fetch for %s", async (_name, activeSession, configOverrides, code) => {
    const fetchImpl = vi.fn();
    const bridge = activeSession === undefined
      ? createAdminDurableReviewApiBridge({ fetchImpl: fetchImpl as never })
      : createBridge(fetchImpl, configOverrides as Record<string, unknown>);
    const result = await bridge.listCampaigns(context({ session: activeSession as never }));

    expect(result).toMatchObject({ bridgeCode: code, code, ok: false });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("turns hostile config and context getters into typed fail-closed results", async () => {
    const fetchImpl = vi.fn();
    const hostileConfig = Object.defineProperty({}, "baseUrl", {
      get: () => {
        throw new Error("postgres://private.example/config");
      },
    });
    const configBridge = createAdminDurableReviewApiBridge({
      config: hostileConfig as never,
      fetchImpl: fetchImpl as never,
    });
    const hostileContext = Object.defineProperty({ session }, "signal", {
      get: () => {
        throw new Error("token=private-context");
      },
    }) as AdminDurableReviewRequestContext;
    const contextBridge = createBridge(fetchImpl);

    const configResult = await configBridge.listCampaigns(context());
    const contextResult = await contextBridge.listCampaigns(hostileContext);

    expect(configResult).toMatchObject({
      bridgeCode: "BRIDGE_BASE_URL_INVALID",
      ok: false,
      phase: "config",
    });
    expect(contextResult).toMatchObject({
      bridgeCode: "BRIDGE_INVALID_INPUT",
      details: { field: "context" },
      ok: false,
      phase: "input",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(JSON.stringify([configResult, contextResult])).not.toMatch(/postgres|token|private/i);
  });

  it("rejects bounded path, query, command, and hash input before fetch", async () => {
    const fetchImpl = vi.fn();
    const bridge = createBridge(fetchImpl);
    const results = await Promise.all([
      bridge.listReviews("..", context()),
      bridge.listCampaigns(context(), { limit: 0 }),
      bridge.listReviews(campaignId, context(), { state: "approved" as never }),
      bridge.submitDecision(campaignId, participantId, {
        decision: "approved",
        idempotencyKey: "short",
        reasonCode: "evidence_verified",
        snapshotFingerprint: fingerprint,
      }, context()),
      bridge.submitDecision(campaignId, participantId, {
        decision: "approved",
        idempotencyKey: "decision-review-0002",
        note: "x".repeat(1_001),
        reasonCode: "evidence_verified",
        snapshotFingerprint: fingerprint,
      }, context()),
      bridge.generateArtifact(campaignId, { format: "xml" as never }, context()),
      bridge.downloadArtifact(campaignId, artifactId, context(), {
        expectedContentHash: "A".repeat(64),
      }),
    ]);

    expect(results).toHaveLength(7);
    expect(results.every((result) => !result.ok && result.bridgeCode === "BRIDGE_INVALID_INPUT"))
      .toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("never invokes an opaque seeded delegate when configured transport is unavailable", async () => {
    const fetchImpl = vi.fn();
    const seededFallback = vi.fn();
    const bridge = createAdminDurableReviewApiBridge({
      fetchImpl: fetchImpl as never,
      seededPreviewBridge: { listCampaigns: seededFallback },
    } as never);

    const result = await bridge.listCampaigns(context());

    expect(result).toMatchObject({ bridgeCode: "BRIDGE_BASE_URL_MISSING", ok: false });
    expect(result).not.toHaveProperty("data");
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(seededFallback).not.toHaveBeenCalled();
  });

  it.each([
    ["X-Campaign-OS-Trace-ID", "custom-trace"],
    ["Idempotency-Key", "custom-command-key"],
    ["X-Campaign-OS-Idempotency-Key", "custom-command-key"],
    ["Authorization", "Bearer private-token"],
    ["Cookie", "session=private-token"],
    ["X-Campaign-OS-Roles", "internal_operator"],
  ])("rejects configured %s authority overrides before fetch", async (name, value) => {
    const fetchImpl = vi.fn();
    const bridge = createBridge(fetchImpl, { headers: { [name]: value } });

    const result = await bridge.listCampaigns(context());

    expect(result).toMatchObject({
      bridgeCode: "BRIDGE_AUTH_HEADER_CONFLICT",
      code: "BRIDGE_AUTH_HEADER_CONFLICT",
      ok: false,
      phase: "auth",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("uses generated safe Trace IDs and returns the validated server envelope Trace ID", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => jsonResponse(
      successEnvelope({ campaigns: [], repository }, "trace-server-safe"),
      { headerTraceId: "trace-server-safe" },
    ));
    const bridge = createBridge(fetchImpl);

    const result = await bridge.listCampaigns(context({ traceId: "unsafe trace\nsecret" }));

    expect(new Headers(fetchImpl.mock.calls[0][1]?.headers).get("x-campaign-os-trace-id"))
      .toBe("trace-generated-request");
    expect(result).toMatchObject({ ok: true, traceId: "trace-server-safe" });
  });

  it("keeps fallback Trace IDs safe when custom prefix and generator are hostile", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => jsonResponse(
      successEnvelope({ campaigns: [], repository }, "trace-server-fallback"),
    ));
    const bridge = createAdminDurableReviewApiBridge({
      config: {
        baseUrl: "http://127.0.0.1:5174",
        tracePrefix: " ### ",
      },
      fetchImpl: fetchImpl as unknown as AdminDurableReviewApiFetch,
      traceIdGenerator: () => {
        throw new Error("token=private-generator");
      },
    });

    const result = await bridge.listCampaigns(context({ traceId: undefined }));
    const requestTraceId = new Headers(fetchImpl.mock.calls[0][1]?.headers)
      .get("x-campaign-os-trace-id");

    expect(requestTraceId).toMatch(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/);
    expect(requestTraceId).toMatch(/^admin-durable-review-listCampaigns-/);
    expect(result).toMatchObject({ ok: true, traceId: "trace-server-fallback" });
    expect(JSON.stringify(result)).not.toContain("private-generator");
  });

  it.each([
    ["queue Campaign", () => ({
      campaignId,
      items: [{ ...queueItem, campaignId: "other-campaign" }],
      summary: { approvedCurrent: 0, needsReviewCurrent: 0, pendingReview: 1, rejectedCurrent: 0, stale: 0, total: 1 },
    }), "listReviews"],
    ["detail Participant", () => ({ ...reviewDetail, participantId: "other-participant" }), "getReviewDetail"],
    ["nested snapshot Campaign", () => ({
      ...reviewDetail,
      snapshot: { ...reviewDetail.snapshot, tasks: [{ campaignId: "other-campaign", taskId: "task-1" }] },
    }), "getReviewDetail"],
    ["artifact detail identity", () => ({
      artifact: { ...artifact, artifactId: "other-artifact" },
      sourceManifest,
    }), "getArtifactDetail"],
  ])("rejects %s identity mismatch", async (_name, data, operation) => {
    const fetchImpl = vi.fn(async () => jsonResponse(successEnvelope(data())));
    const bridge = createBridge(fetchImpl);
    const result = operation === "listReviews"
      ? await bridge.listReviews(campaignId, context())
      : operation === "getReviewDetail"
        ? await bridge.getReviewDetail(campaignId, participantId, context())
        : await bridge.getArtifactDetail(campaignId, artifactId, context());

    expect(result).toMatchObject({
      bridgeCode: "BRIDGE_RESPONSE_IDENTITY_MISMATCH",
      code: "BRIDGE_RESPONSE_IDENTITY_MISMATCH",
      ok: false,
      phase: "identity",
    });
  });

  it.each([
    ["empty", ""],
    ["control character", "evidence-hash:task-review-1\nunsafe"],
    ["token value", "token=secret-value"],
    ["proof value", "proof=raw-private-payload"],
    ["signature value", "signature:raw-private-payload"],
    ["private key value", "private_key=raw-private-payload"],
    ["oversize", "x".repeat(4_097)],
  ])("rejects %s winner evidence identifiers", async (_case, evidenceHash) => {
    const fetchImpl = vi.fn(async () => jsonResponse(successEnvelope({
      campaignId,
      rows: [{ ...winner, evidenceHashes: [evidenceHash] }],
      sourceFingerprint,
      sourceVersion: "artifact-source-v1",
    })));
    const bridge = createBridge(fetchImpl);

    const result = await bridge.listWinners(campaignId, context());

    expect(result).toMatchObject({
      bridgeCode: "BRIDGE_RESPONSE_INVALID",
      code: "BRIDGE_RESPONSE_INVALID",
      ok: false,
      phase: "response",
    });
    if (evidenceHash) {
      expect(JSON.stringify(result)).not.toContain(evidenceHash);
    }
  });

  it("rejects command receipt and artifact manifest identities that disagree with the request", async () => {
    const responses = [
      jsonResponse(successEnvelope({
        campaignId,
        created: true,
        decisionId: decisionRecord.decisionId,
        participantId,
        snapshotFingerprint: "d".repeat(64),
        version: 1,
      }), { status: 201 }),
      jsonResponse(successEnvelope({
        artifact: {
          ...artifact,
          fileName: "campaign-review.json",
          format: "json",
          mimeType: "application/json;charset=utf-8",
        },
        created: true,
      }), { status: 201 }),
      jsonResponse(successEnvelope({
        artifact,
        sourceManifest: {
          ...sourceManifest,
          rows: [{ ...winner, campaignId: "other-campaign" }],
        },
      })),
    ];
    const fetchImpl = vi.fn(async () => responses.shift()!);
    const bridge = createBridge(fetchImpl);

    const decisionResult = await bridge.submitDecision(campaignId, participantId, {
      decision: "approved",
      idempotencyKey: "decision-review-0003",
      reasonCode: "evidence_verified",
      snapshotFingerprint: fingerprint,
    }, context());
    const generateResult = await bridge.generateArtifact(campaignId, {
      expectedSourceFingerprint: sourceFingerprint,
      format: "csv",
    }, context());
    const detailResult = await bridge.getArtifactDetail(campaignId, artifactId, context());

    expect([decisionResult, generateResult, detailResult]).toEqual([
      expect.objectContaining({ bridgeCode: "BRIDGE_RESPONSE_IDENTITY_MISMATCH", ok: false }),
      expect.objectContaining({ bridgeCode: "BRIDGE_RESPONSE_IDENTITY_MISMATCH", ok: false }),
      expect.objectContaining({ bridgeCode: "BRIDGE_RESPONSE_IDENTITY_MISMATCH", ok: false }),
    ]);
  });

  it("rejects an empty artifact manifest whose campaign.id crosses the request boundary", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(successEnvelope({
      artifact: { ...artifact, rowCount: 0 },
      sourceManifest: {
        ...sourceManifest,
        campaign: { ...artifactSourceCampaign, id: "other-campaign" },
        rows: [],
      },
    })));
    const bridge = createBridge(fetchImpl);

    const result = await bridge.getArtifactDetail(campaignId, artifactId, context());

    expect(result).toMatchObject({
      bridgeCode: "BRIDGE_RESPONSE_IDENTITY_MISMATCH",
      code: "BRIDGE_RESPONSE_IDENTITY_MISMATCH",
      ok: false,
      phase: "identity",
    });
  });

  it.each([
    ["manifest", { ...sourceManifest, unexpectedField: "safe-value" }],
    ["campaign", {
      ...sourceManifest,
      campaign: { ...artifactSourceCampaign, unexpectedField: "safe-value" },
    }],
    ["winner row", {
      ...sourceManifest,
      rows: [{ ...winner, unexpectedField: "safe-value" }],
    }],
  ])("rejects an unknown artifact source %s field", async (_name, hostileManifest) => {
    const fetchImpl = vi.fn(async () => jsonResponse(successEnvelope({
      artifact,
      sourceManifest: hostileManifest,
    })));
    const bridge = createBridge(fetchImpl);

    const result = await bridge.getArtifactDetail(campaignId, artifactId, context());

    expect(result).toMatchObject({
      bridgeCode: "BRIDGE_RESPONSE_INVALID",
      code: "BRIDGE_RESPONSE_INVALID",
      ok: false,
      phase: "response",
    });
    expect(JSON.stringify(result)).not.toContain("safe-value");
  });

  it.each([
    ["wrong content type", jsonResponse(successEnvelope({ campaigns: [], repository }), { contentType: "text/html" }), "BRIDGE_RESPONSE_NON_JSON"],
    ["empty body", jsonResponse(""), "BRIDGE_RESPONSE_EMPTY"],
    ["malformed JSON", jsonResponse("{not-json"), "BRIDGE_RESPONSE_NON_JSON"],
    ["unknown envelope field", jsonResponse({ ...successEnvelope({ campaigns: [], repository }), privateToken: "secret" }), "BRIDGE_RESPONSE_INVALID"],
    ["invalid success status", jsonResponse(successEnvelope({ campaigns: [], repository }), { status: 201 }), "BRIDGE_RESPONSE_INVALID"],
    ["declared oversize", jsonResponse(successEnvelope({ campaigns: [], repository }), { contentLength: 1_000 }), "BRIDGE_RESPONSE_OVERSIZE"],
    ["invalid content length", jsonResponse(successEnvelope({ campaigns: [], repository }), { contentLength: "not-a-number" }), "BRIDGE_RESPONSE_INVALID"],
  ])("fails closed for %s JSON responses", async (_name, response, code) => {
    const fetchImpl = vi.fn(async () => response);
    const bridge = createBridge(fetchImpl, { maxResponseBytes: 256 });

    const result = await bridge.listCampaigns(context());

    expect(result).toMatchObject({ bridgeCode: code, code, ok: false });
  });

  it("bounds actual JSON bytes even without Content-Length", async () => {
    const response = jsonResponse(successEnvelope({ campaigns: [], repository }));
    response.headers.delete("content-length");
    const fetchImpl = vi.fn(async () => response);
    const bridge = createBridge(fetchImpl, { maxResponseBytes: 32 });

    const result = await bridge.listCampaigns(context());

    expect(result).toMatchObject({
      bridgeCode: "BRIDGE_RESPONSE_OVERSIZE",
      ok: false,
    });
  });

  it.each([400, 401, 403, 404, 409, 413, 422, 503])(
    "normalizes HTTP %i safe error envelopes without leaking private diagnostics",
    async (status) => {
      const fetchImpl = vi.fn(async () => jsonResponse({
        error: {
          code: status === 401 ? "AUTH_SESSION_INVALID" : `SAFE_${status}`,
          details: {
            diagnosticCode: "SAFE_DIAGNOSTIC",
            field: "format",
            operation: "admin.artifacts.generate",
            reconnectRequired: status === 401,
            retryable: status === 503,
            routeId: "admin.artifacts.generate",
          },
          message: "postgres://private.example/db token=secret /Users/private/runtime.ts",
        },
        ok: false,
        traceId: `trace-server-${status}`,
      }, { status }));
      const bridge = createBridge(fetchImpl);

      const result = await bridge.generateArtifact(campaignId, { format: "json" }, context());
      const serialized = JSON.stringify(result);

      expect(result).toMatchObject({
        code: status === 401 ? "AUTH_SESSION_INVALID" : `SAFE_${status}`,
        httpStatus: status,
        ok: false,
        reconnectRequired: status === 401,
        retryable: status === 503,
        traceId: `trace-server-${status}`,
      });
      expect(result.ok || result.details).toEqual({
        diagnosticCode: "SAFE_DIAGNOSTIC",
        field: "format",
        operation: "admin.artifacts.generate",
        reconnectRequired: status === 401,
        retryable: status === 503,
        routeId: "admin.artifacts.generate",
      });
      expect(serialized).not.toMatch(/postgres|private\.example|token|\/Users\/|stack/i);
    },
  );

  it.each([
    ["error", {
      code: "SAFE_FAILURE",
      message: "Safe failure.",
      privateToken: "secret-error-field",
    }],
    ["details", {
      code: "SAFE_FAILURE",
      details: {
        field: "format",
        privateToken: "secret-detail-field",
      },
      message: "Safe failure.",
    }],
  ])("rejects an unknown %s envelope field instead of filtering it", async (_name, error) => {
    const fetchImpl = vi.fn(async () => jsonResponse({
      error,
      ok: false,
      traceId: "trace-closed-error-envelope",
    }, { status: 503 }));
    const bridge = createBridge(fetchImpl);

    const result = await bridge.listCampaigns(context());

    expect(result).toMatchObject({
      bridgeCode: "BRIDGE_RESPONSE_INVALID",
      code: "BRIDGE_RESPONSE_INVALID",
      ok: false,
      phase: "response",
      traceId: "trace-closed-error-envelope",
    });
    expect(JSON.stringify(result)).not.toMatch(/secret-(?:error|detail)-field/);
  });

  it("drops unsafe values even when they use allowlisted server detail keys", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({
      error: {
        code: "SAFE_FAILURE",
        details: {
          diagnosticCode: "TOKEN_SECRET",
          field: "/Users/private/source.ts",
          operation: "https://private.example/operation",
          reconnectRequired: false,
          retryable: true,
          routeId: "postgres://private.example/db",
        },
        message: "Safe failure.",
      },
      ok: false,
      traceId: "trace-safe-detail-filter",
    }, { status: 503 }));
    const bridge = createBridge(fetchImpl);

    const result = await bridge.listCampaigns(context());

    expect(result).toMatchObject({
      code: "SAFE_FAILURE",
      details: { reconnectRequired: false, retryable: true },
      ok: false,
    });
    expect(JSON.stringify(result)).not.toMatch(/token|\/Users\/|https:\/\/|postgres:\/\/|private\.example/i);
  });

  it("distinguishes caller abort, removes its listener, clears timeout, and ignores late success", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const removeListener = vi.spyOn(controller.signal, "removeEventListener");
    let resolveFetch!: (response: Response) => void;
    const fetchImpl = vi.fn(() => new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    }));
    const bridge = createBridge(fetchImpl, { timeoutMs: 1_000 });

    const resultPromise = bridge.listCampaigns(context({ signal: controller.signal }));
    controller.abort();
    const result = await resultPromise;

    expect(result).toMatchObject({
      bridgeCode: "BRIDGE_REQUEST_ABORTED",
      code: "BRIDGE_REQUEST_ABORTED",
      ok: false,
    });
    expect(removeListener).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);

    resolveFetch(jsonResponse(successEnvelope({ campaigns: [campaign], repository })));
    await Promise.resolve();
    expect(result.ok).toBe(false);
  });

  it("settles at the typed timeout boundary and cleans up when fetch ignores AbortSignal", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn(() => new Promise<Response>(() => undefined));
    const bridge = createBridge(fetchImpl, { timeoutMs: 250 });

    const resultPromise = bridge.listCampaigns(context());
    await vi.advanceTimersByTimeAsync(250);
    const result = await resultPromise;

    expect(result).toMatchObject({
      bridgeCode: "BRIDGE_REQUEST_TIMEOUT",
      code: "BRIDGE_REQUEST_TIMEOUT",
      ok: false,
      retryable: true,
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("bounds timeout cleanup when Response.body.cancel never settles", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const callerRemove = vi.spyOn(controller.signal, "removeEventListener");
    const cancel = vi.fn(() => new Promise<void>(() => undefined));
    const response = new Response(new ReadableStream<Uint8Array>({
      cancel,
      start(streamController) {
        streamController.enqueue(new TextEncoder().encode("not-json"));
      },
    }), {
      headers: { "content-type": "text/plain" },
      status: 200,
    });
    let requestRemove: ReturnType<typeof vi.spyOn> | undefined;
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      requestRemove = vi.spyOn(init!.signal as AbortSignal, "removeEventListener");
      return response;
    });
    const bridge = createBridge(fetchImpl, { timeoutMs: 250 });
    let result: Awaited<ReturnType<typeof bridge.listCampaigns>> | undefined;

    void bridge.listCampaigns(context({ signal: controller.signal })).then((value) => {
      result = value;
    });
    await vi.advanceTimersByTimeAsync(250);
    await Promise.resolve();

    expect(cancel).toHaveBeenCalled();
    expect(result).toMatchObject({
      bridgeCode: "BRIDGE_REQUEST_TIMEOUT",
      code: "BRIDGE_REQUEST_TIMEOUT",
      ok: false,
    });
    expect(callerRemove).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(requestRemove).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });

  it("bounds caller abort cleanup when body reader.cancel never settles", async () => {
    const controller = new AbortController();
    const callerRemove = vi.spyOn(controller.signal, "removeEventListener");
    const cancel = vi.fn(() => new Promise<void>(() => undefined));
    const response = new Response(new ReadableStream<Uint8Array>({
      cancel,
      start(streamController) {
        streamController.enqueue(new Uint8Array(64));
      },
    }), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
    let requestRemove: ReturnType<typeof vi.spyOn> | undefined;
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      requestRemove = vi.spyOn(init!.signal as AbortSignal, "removeEventListener");
      return response;
    });
    const bridge = createBridge(fetchImpl, { maxResponseBytes: 32, timeoutMs: 1_000 });
    const resultPromise = bridge.listCampaigns(context({ signal: controller.signal }));
    for (let index = 0; index < 8 && cancel.mock.calls.length === 0; index += 1) {
      await Promise.resolve();
    }
    expect(cancel).toHaveBeenCalled();
    controller.abort();
    let guardTimer: ReturnType<typeof setTimeout> | undefined;
    const result = await Promise.race([
      resultPromise,
      new Promise<undefined>((resolve) => {
        guardTimer = setTimeout(() => resolve(undefined), 50);
      }),
    ]);
    if (guardTimer !== undefined) {
      clearTimeout(guardTimer);
    }

    expect(result).toMatchObject({
      bridgeCode: "BRIDGE_REQUEST_ABORTED",
      code: "BRIDGE_REQUEST_ABORTED",
      ok: false,
    });
    expect(callerRemove).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(requestRemove).toHaveBeenCalledWith("abort", expect.any(Function));
  });

  it("normalizes network rejection without exposing the thrown value", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("postgres://private.example/db token=secret /Users/private/source.ts");
    });
    const bridge = createBridge(fetchImpl);

    const result = await bridge.listCampaigns(context());

    expect(result).toMatchObject({
      bridgeCode: "BRIDGE_REQUEST_FAILED",
      code: "BRIDGE_REQUEST_FAILED",
      ok: false,
      retryable: true,
    });
    expect(JSON.stringify(result)).not.toMatch(/postgres|private\.example|token|\/Users\//i);
  });

  it("clears timer and caller listener after both fetch resolution and rejection", async () => {
    vi.useFakeTimers();
    const resolvedController = new AbortController();
    const rejectedController = new AbortController();
    const resolvedRemove = vi.spyOn(resolvedController.signal, "removeEventListener");
    const rejectedRemove = vi.spyOn(rejectedController.signal, "removeEventListener");
    const resolvedBridge = createBridge(vi.fn(async () => jsonResponse(
      successEnvelope({ campaigns: [], repository }),
    )));
    const rejectedBridge = createBridge(vi.fn(async () => {
      throw new Error("network unavailable");
    }));

    const resolved = await resolvedBridge.listCampaigns(context({ signal: resolvedController.signal }));
    const rejected = await rejectedBridge.listCampaigns(context({ signal: rejectedController.signal }));

    expect(resolved.ok).toBe(true);
    expect(rejected).toMatchObject({ bridgeCode: "BRIDGE_REQUEST_FAILED", ok: false });
    expect(resolvedRemove).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(rejectedRemove).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    ["MIME", { contentType: "application/octet-stream" }, undefined, "BRIDGE_DOWNLOAD_MIME_INVALID"],
    ["filename", { disposition: "attachment; filename=\"../private.csv\"" }, undefined, "BRIDGE_DOWNLOAD_FILENAME_INVALID"],
    ["declared bytes", { contentLength: 999 }, undefined, "BRIDGE_DOWNLOAD_BYTES_MISMATCH"],
    ["missing hash", { contentHash: "" }, undefined, "BRIDGE_DOWNLOAD_INTEGRITY_MISMATCH"],
    ["header hash", { contentHash: "d".repeat(64) }, undefined, "BRIDGE_DOWNLOAD_INTEGRITY_MISMATCH"],
    ["expected hash", {}, "e".repeat(64), "BRIDGE_DOWNLOAD_INTEGRITY_MISMATCH"],
  ])("rejects download %s integrity failures before exposing bytes", async (
    _name,
    responseOverrides,
    expectedContentHash,
    code,
  ) => {
    const bytes = new TextEncoder().encode("wallet,points\nA,100\n");
    const response = downloadResponse(bytes, responseOverrides);
    if ("contentHash" in responseOverrides && responseOverrides.contentHash === "") {
      response.headers.delete("x-campaign-os-content-sha256");
    }
    const fetchImpl = vi.fn(async () => response);
    const bridge = createBridge(fetchImpl);

    const result = await bridge.downloadArtifact(campaignId, artifactId, context(), {
      ...(expectedContentHash ? { expectedContentHash } : {}),
    });

    expect(result).toMatchObject({ bridgeCode: code, code, ok: false });
    expect(result).not.toHaveProperty("data.bytes");
  });

  it("accepts exact JSON UTF-8 download bytes after SHA-256 verification", async () => {
    const bytes = new TextEncoder().encode(JSON.stringify({ campaignId, rows: [] }));
    const hash = sha256(bytes);
    const fetchImpl = vi.fn(async () => downloadResponse(bytes, {
      contentHash: hash,
      contentType: "application/json;charset=utf-8",
      disposition: "attachment; filename=\"campaign-review.json\"",
    }));
    const bridge = createBridge(fetchImpl);

    const result = await bridge.downloadArtifact(campaignId, artifactId, context(), {
      expectedContentHash: hash,
    });

    expect(result).toMatchObject({
      data: {
        contentBytes: bytes.byteLength,
        contentHash: hash,
        fileName: "campaign-review.json",
        mimeType: "application/json;charset=utf-8",
      },
      ok: true,
    });
  });
});
