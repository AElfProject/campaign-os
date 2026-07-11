import { describe, expect, it, vi } from "vitest";
import {
  buildRewardDistributionHandoffRuntimeApiUrl,
  createRewardDistributionHandoffRuntimeApiLoadingState,
  createRewardDistributionHandoffRuntimeApiSeededFallbackState,
  loadRewardDistributionHandoffRuntimeApiBridgeState,
  sanitizeRewardDistributionHandoffRuntimeApiText,
  type RewardDistributionHandoffRuntimeApiFetch,
} from "./rewardDistributionHandoffRuntimeApiBridge";
import {
  createRewardDistributionHandoffReadiness,
  rewardDistributionHandoffRequiredEvidenceKeys,
  type RewardDistributionHandoffReadiness,
} from "../domain/rewardDistributionHandoffRuntime";
import { campaignDetail } from "../domain/fixtures";

const campaignId = "camp-awaken-sprint";

const response = (
  body: unknown,
  options: { ok?: boolean; status?: number; traceId?: string } = {},
): Response => ({
  headers: new Headers(options.traceId ? { "x-campaign-os-trace-id": options.traceId } : {}),
  json: vi.fn(async () => body),
  ok: options.ok ?? true,
  status: options.status ?? 200,
} as unknown as Response);

const runtimeMetadata = {
  mode: "local_seeded",
  name: "campaign-os-api-runtime",
  routeCount: 37,
  version: "0.2.0-local",
};

const validReadinessPayload = (
  overrides: Partial<RewardDistributionHandoffReadiness> = {},
): RewardDistributionHandoffReadiness => ({
  ...createRewardDistributionHandoffReadiness({
    campaign: campaignDetail,
    source: "server_runtime",
    traceId: "trace-reward-handoff-payload",
  }),
  ...overrides,
});

const envelope = (payload: unknown, traceId = "trace-reward-handoff-envelope") => ({
  data: {
    boundary: {
      "en-US": "Local reward distribution handoff readiness review route.",
      "zh-CN": "本地 reward distribution handoff readiness review route。",
      "zh-TW": "Local reward distribution handoff readiness review route.",
    },
    payload,
  },
  ok: true,
  runtime: runtimeMetadata,
  safety: {
    localOnly: true,
    noContractWrite: true,
    noLiveApi: true,
    noRewardCustody: true,
    noRewardDistribution: true,
  },
  timestamp: "2026-07-11T00:00:00.000Z",
  traceId,
});

describe("reward distribution handoff runtime API bridge", () => {
  it("creates a loading state without touching the network", () => {
    const state = createRewardDistributionHandoffRuntimeApiLoadingState(campaignId);

    expect(state).toMatchObject({
      campaignId,
      configured: true,
      loading: true,
      source: "loading",
      status: "loading",
    });
    expect(state.boundary["en-US"]).toContain("Local reward distribution handoff readiness API bridge");
    expect(state.readiness.noLiveSideEffects.livePayout).toBe(false);
    expect(state.readiness.noLiveSideEffects.liveRewardDistribution).toBe(false);
  });

  it("returns seeded fallback when the API base URL is missing", async () => {
    const fetchImpl = vi.fn() as unknown as RewardDistributionHandoffRuntimeApiFetch;

    const state = await loadRewardDistributionHandoffRuntimeApiBridgeState({
      campaignId,
      config: { baseUrl: "   " },
      fetchImpl,
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(state).toMatchObject({
      campaignId,
      configured: false,
      diagnostics: [{ code: "API_BASE_URL_MISSING", severity: "info" }],
      loading: false,
      source: "seeded_fallback",
      status: "fallback",
    });
    expect(state.readiness.productionReady).toBe(false);
    expect(state.readiness.evidenceHandoff.productionReady).toBe(false);
  });

  it("returns sanitized error fallback when the API base URL is invalid", async () => {
    const state = await loadRewardDistributionHandoffRuntimeApiBridgeState({
      campaignId,
      config: {
        baseUrl: "ftp://api.invalid/path?token=sample-token&api_key=private-key-sample",
      },
      fetchImpl: vi.fn() as unknown as RewardDistributionHandoffRuntimeApiFetch,
    });
    const serialized = JSON.stringify(state.diagnostics).toLowerCase();

    expect(state).toMatchObject({
      configured: true,
      diagnostics: [{ code: "API_BASE_URL_INVALID", severity: "warning" }],
      source: "error_fallback",
      status: "error",
    });
    for (const unsafe of ["token=sample-token", "api_key", "private-key", "private key"]) {
      expect(serialized).not.toContain(unsafe);
    }
  });

  it("loads readiness payload from a configured API with trace id and route count", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(response(
      envelope(validReadinessPayload({ status: "blocked" }), "trace-envelope"),
      { traceId: "trace-header" },
    )) as unknown as RewardDistributionHandoffRuntimeApiFetch;

    const state = await loadRewardDistributionHandoffRuntimeApiBridgeState({
      campaignId,
      config: {
        baseUrl: "http://127.0.0.1:5174/",
        headers: { "x-campaign-os-roles": "project_owner" },
        tracePrefix: "reward-handoff",
      },
      fetchImpl,
    });

    expect(state).toMatchObject({
      campaignId,
      configured: true,
      diagnostics: [],
      loading: false,
      readiness: expect.objectContaining({
        campaignId,
        productionReady: false,
        source: "server_runtime",
        status: "blocked",
      }),
      routeCount: 37,
      source: "api_runtime",
      status: "blocked",
      traceId: "trace-envelope",
    });
    expect(state.readiness.noLiveSideEffects).toMatchObject({
      liveClaim: false,
      liveContractWrite: false,
      livePayout: false,
      liveProviderCall: false,
      liveQueuePublishing: false,
      liveRewardCustody: false,
      liveRewardDistribution: false,
      liveSchedulerExecution: false,
      liveWalletSignature: false,
      liveWorkerExecution: false,
    });
    expect(state.readiness.requiredEvidenceKeys).toEqual(expect.arrayContaining([
      ...rewardDistributionHandoffRequiredEvidenceKeys,
    ]));
    expect(state.readiness.items).toHaveLength(11);
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://127.0.0.1:5174/api/campaigns/camp-awaken-sprint/reward-distribution/handoff-readiness",
      expect.objectContaining({
        headers: expect.objectContaining({
          accept: "application/json",
          "x-campaign-os-roles": "project_owner",
          "x-campaign-os-trace-id": expect.stringMatching(/^reward-handoff-reward-distribution-handoff-runtime-/),
        }),
        method: "GET",
      }),
    );
  });

  it("maps local-ready payloads to review-required UI state", async () => {
    const readyPayload = validReadinessPayload({
      evidenceHandoff: {
        ...validReadinessPayload().evidenceHandoff,
        missingEvidenceKeys: [],
        status: "ready_disabled",
      },
      status: "local_ready",
    });
    const fetchImpl = vi.fn().mockResolvedValueOnce(response(
      envelope(readyPayload, "trace-local-ready"),
    )) as unknown as RewardDistributionHandoffRuntimeApiFetch;

    const state = await loadRewardDistributionHandoffRuntimeApiBridgeState({
      campaignId,
      config: { baseUrl: "http://127.0.0.1:5174" },
      fetchImpl,
    });

    expect(state.status).toBe("review_required");
    expect(state.readiness.productionReady).toBe(false);
    expect(state.readiness.noLiveSideEffects.liveRewardDistribution).toBe(false);
  });

  it("builds the request URL without leaking query strings", () => {
    expect(
      buildRewardDistributionHandoffRuntimeApiUrl(
        new URL("http://127.0.0.1:5174/base/?token=unsafe#frag"),
        "campaign/with space",
      ),
    ).toBe("http://127.0.0.1:5174/base/api/campaigns/campaign%2Fwith%20space/reward-distribution/handoff-readiness");
  });

  it("returns error fallback when the request fails", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error(
        "Request failed with bearer token sample-token, providerPayload, stack trace, /private/reward-handoff/secret.md",
      );
    }) as unknown as RewardDistributionHandoffRuntimeApiFetch;

    const state = await loadRewardDistributionHandoffRuntimeApiBridgeState({
      campaignId,
      config: { baseUrl: "http://127.0.0.1:5174" },
      fetchImpl,
    });
    const serialized = JSON.stringify(state.diagnostics).toLowerCase();

    expect(state).toMatchObject({
      diagnostics: [{ code: "API_REQUEST_FAILED", severity: "error" }],
      source: "error_fallback",
      status: "error",
    });
    for (const unsafe of ["bearer token", "sample-token", "providerpayload", "stack trace", "/private/reward-handoff"]) {
      expect(serialized).not.toContain(unsafe);
    }
  });

  it("returns timeout fallback when the runtime request aborts", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new DOMException("seed phrase sample and walletSignature payload", "AbortError");
    }) as unknown as RewardDistributionHandoffRuntimeApiFetch;

    const state = await loadRewardDistributionHandoffRuntimeApiBridgeState({
      campaignId,
      config: { baseUrl: "http://127.0.0.1:5174", timeoutMs: 10 },
      fetchImpl,
    });
    const serialized = JSON.stringify(state.diagnostics).toLowerCase();

    expect(state).toMatchObject({
      diagnostics: [{ code: "API_REQUEST_TIMEOUT", severity: "error" }],
      source: "error_fallback",
      status: "error",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(serialized).not.toContain("seed phrase");
    expect(serialized).not.toContain("walletsignature");
  });

  it("returns error fallback for malformed envelopes", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(response({
      data: { payload: validReadinessPayload() },
      runtime: runtimeMetadata,
      traceId: "trace-malformed",
    })) as unknown as RewardDistributionHandoffRuntimeApiFetch;

    const state = await loadRewardDistributionHandoffRuntimeApiBridgeState({
      campaignId,
      config: { baseUrl: "http://127.0.0.1:5174" },
      fetchImpl,
    });

    expect(state).toMatchObject({
      diagnostics: [{ code: "API_RESPONSE_MALFORMED", severity: "error" }],
      source: "error_fallback",
      status: "error",
      traceId: "trace-malformed",
    });
  });

  it("returns error fallback when required payload sections are missing", async () => {
    const { noLiveSideEffects: _noLiveSideEffects, ...invalidPayload } = validReadinessPayload();
    const fetchImpl = vi.fn().mockResolvedValueOnce(response(
      envelope(invalidPayload, "trace-payload-invalid"),
    )) as unknown as RewardDistributionHandoffRuntimeApiFetch;

    const state = await loadRewardDistributionHandoffRuntimeApiBridgeState({
      campaignId,
      config: { baseUrl: "http://127.0.0.1:5174" },
      fetchImpl,
    });

    expect(state).toMatchObject({
      diagnostics: [{ code: "API_PAYLOAD_INVALID", severity: "error" }],
      source: "error_fallback",
      status: "error",
      traceId: "trace-payload-invalid",
    });
  });

  it("rejects payloads where no-live flags are enabled", async () => {
    const invalidPayload = validReadinessPayload({
      noLiveSideEffects: {
        ...validReadinessPayload().noLiveSideEffects,
        livePayout: true as false,
      },
    });
    const fetchImpl = vi.fn().mockResolvedValueOnce(response(
      envelope(invalidPayload, "trace-live-flag-invalid"),
    )) as unknown as RewardDistributionHandoffRuntimeApiFetch;

    const state = await loadRewardDistributionHandoffRuntimeApiBridgeState({
      campaignId,
      config: { baseUrl: "http://127.0.0.1:5174" },
      fetchImpl,
    });

    expect(state).toMatchObject({
      diagnostics: [{ code: "API_PAYLOAD_INVALID", severity: "error" }],
      source: "error_fallback",
      status: "error",
      traceId: "trace-live-flag-invalid",
    });
  });

  it("redacts unsafe diagnostic text from failed envelopes", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(response({
      error: {
        message:
          "privateKey, seedPhrase, bearer abc.123, signature, transactionId tx-1, payoutId pay-1, custodyId cust-1, distributionTx dist-1, providerPayload, walletSignature, contractWrite, claimTransaction at handler (/private/path.ts:1)",
      },
      ok: false,
      traceId: "trace-unsafe-envelope",
    }, {
      ok: false,
      status: 500,
      traceId: "trace-unsafe-header",
    })) as unknown as RewardDistributionHandoffRuntimeApiFetch;

    const state = await loadRewardDistributionHandoffRuntimeApiBridgeState({
      campaignId,
      config: { baseUrl: "http://127.0.0.1:5174" },
      fetchImpl,
    });
    const serialized = JSON.stringify(state.diagnostics).toLowerCase();

    expect(state).toMatchObject({
      diagnostics: [{ code: "API_REQUEST_FAILED", severity: "error" }],
      traceId: "trace-unsafe-envelope",
    });
    for (const unsafe of [
      "privatekey",
      "seedphrase",
      "bearer abc",
      "transactionid",
      "payoutid",
      "custodyid",
      "distributiontx",
      "providerpayload",
      "walletsignature",
      "contractwrite",
      "claimtransaction",
      "/private/path",
    ]) {
      expect(serialized).not.toContain(unsafe);
    }
  });

  it("sanitizes standalone diagnostic text", () => {
    const sanitized = sanitizeRewardDistributionHandoffRuntimeApiText(
      "providerPayload token=abc123 privateKey signed URL transactionId payoutId custodyId distributionTx claimTransaction contractWrite walletSignature",
    ).toLowerCase();

    for (const unsafe of [
      "providerpayload",
      "token=abc123",
      "privatekey",
      "transactionid",
      "payoutid",
      "custodyid",
      "distributiontx",
      "claimtransaction",
      "contractwrite",
      "walletsignature",
    ]) {
      expect(sanitized).not.toContain(unsafe);
    }
  });

  it("creates an explicit seeded fallback state for disabled Project Console reviews", () => {
    const state = createRewardDistributionHandoffRuntimeApiSeededFallbackState(campaignId, "trace-seeded");

    expect(state).toMatchObject({
      configured: false,
      source: "seeded_fallback",
      status: "fallback",
      traceId: "trace-seeded",
    });
    expect(state.readiness.requiredEvidenceKeys).toEqual(expect.arrayContaining([
      ...rewardDistributionHandoffRequiredEvidenceKeys,
    ]));
    expect(state.readiness.summary.itemCount).toBe(11);
  });
});
