import { describe, expect, it, vi } from "vitest";
import {
  buildProjectOwnerFundingProofReviewBridgeApiUrl,
  createProjectOwnerFundingProofReviewBridgeApiLoadingState,
  createProjectOwnerFundingProofReviewBridgeApiSeededFallbackState,
  loadProjectOwnerFundingProofReviewBridgeApiState,
  sanitizeProjectOwnerFundingProofReviewBridgeApiText,
  submitProjectOwnerFundingProofReviewBridgeApiState,
  type ProjectOwnerFundingProofReviewBridgeApiFetch,
} from "./projectOwnerFundingProofReviewBridgeApiBridge";
import {
  createProjectOwnerFundingProofReviewBridge,
  projectOwnerFundingProofRequiredEvidenceKeys,
  type ProjectOwnerFundingProofReviewBridge,
} from "../domain/projectOwnerFundingProofReviewBridge";
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
  routeCount: 39,
  version: "0.2.0-local",
};

const completeProofPackage = {
  amountSummaryRef: "amount-summary-ref:awaken-sprint-budget",
  disclaimerSignoffRef: "disclaimer-signoff-ref:en-us-reviewed",
  exportBatchId: "export-batch-awaken-sprint-preview",
  financeReviewRef: "finance-review-ref:pending",
  operatorReviewRef: "operator-review-ref:pending",
  proofReference: "proof-ref:project-owner-budget-ticket",
  recipientListHashRef: "recipient-list-hash-ref:preview",
  rewardProviderStatementRef: "provider-statement-ref:project-owned",
  submittedByRole: "project_owner" as const,
};

const validReviewPayload = (
  overrides: Partial<ProjectOwnerFundingProofReviewBridge> = {},
): ProjectOwnerFundingProofReviewBridge => ({
  ...createProjectOwnerFundingProofReviewBridge({
    campaign: campaignDetail,
    source: "server_runtime",
    traceId: "trace-funding-proof-payload",
  }),
  ...overrides,
});

const envelope = (payload: unknown, traceId = "trace-funding-proof-envelope") => ({
  data: {
    boundary: {
      "en-US": "Local review-only project owner funding proof bridge.",
      "zh-CN": "本地、仅审核的项目方资金证明 bridge。",
      "zh-TW": "本地、僅審核的專案方資金證明 bridge。",
    },
    payload,
  },
  ok: true,
  runtime: runtimeMetadata,
  safety: {
    localOnly: true,
    noContractWrite: true,
    noRewardCustody: true,
    noRewardDistribution: true,
    noStorageWrite: true,
    noWalletSignature: true,
  },
  timestamp: "2026-07-11T00:00:00.000Z",
  traceId,
});

describe("project owner funding proof review bridge API", () => {
  it("creates a loading state without touching the network", () => {
    const state = createProjectOwnerFundingProofReviewBridgeApiLoadingState(campaignId);

    expect(state).toMatchObject({
      campaignId,
      configured: true,
      loading: true,
      source: "loading",
      status: "loading",
    });
    expect(state.boundary["en-US"]).toContain("funding proof review API bridge");
    expect(state.review.safety.liveFundingTransfer).toBe(false);
    expect(state.review.safety.liveObjectStorageWrite).toBe(false);
    expect(state.review.safety.liveRewardDistribution).toBe(false);
  });

  it("returns seeded fallback when the API base URL is missing", async () => {
    const fetchImpl = vi.fn() as unknown as ProjectOwnerFundingProofReviewBridgeApiFetch;

    const state = await loadProjectOwnerFundingProofReviewBridgeApiState({
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
    expect(state.review.productionReady).toBe(false);
    expect(state.review.proofPackage.productionReady).toBe(false);
  });

  it("loads review payload from a configured API with trace id and route count", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(response(
      envelope(validReviewPayload({ status: "blocked" }), "trace-envelope"),
      { traceId: "trace-header" },
    )) as unknown as ProjectOwnerFundingProofReviewBridgeApiFetch;

    const state = await loadProjectOwnerFundingProofReviewBridgeApiState({
      campaignId,
      config: {
        baseUrl: "http://127.0.0.1:5174/",
        headers: { "x-campaign-os-roles": "project_owner" },
        tracePrefix: "funding-proof",
      },
      fetchImpl,
    });

    expect(state).toMatchObject({
      campaignId,
      configured: true,
      diagnostics: [],
      loading: false,
      review: expect.objectContaining({
        campaignId,
        productionReady: false,
        source: "server_runtime",
        status: "blocked",
      }),
      routeCount: 39,
      source: "api_runtime",
      status: "blocked",
      traceId: "trace-envelope",
    });
    expect(state.review.requiredEvidenceKeys).toEqual(expect.arrayContaining([
      ...projectOwnerFundingProofRequiredEvidenceKeys,
    ]));
    expect(state.review.items).toHaveLength(8);
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://127.0.0.1:5174/api/campaigns/camp-awaken-sprint/reward-distribution/funding-proof-review",
      expect.objectContaining({
        headers: expect.objectContaining({
          accept: "application/json",
          "x-campaign-os-roles": "project_owner",
          "x-campaign-os-trace-id": expect.stringMatching(/^funding-proof-project-owner-funding-proof-review-/),
        }),
        method: "GET",
      }),
    );
  });

  it("maps local-ready payloads to review-required UI state", async () => {
    const readyPayload = createProjectOwnerFundingProofReviewBridge({
      campaign: campaignDetail,
      proofPackage: completeProofPackage,
      source: "server_runtime",
      traceId: "trace-funding-proof-ready",
    });
    const fetchImpl = vi.fn().mockResolvedValueOnce(response(
      envelope(readyPayload, "trace-local-ready"),
    )) as unknown as ProjectOwnerFundingProofReviewBridgeApiFetch;

    const state = await loadProjectOwnerFundingProofReviewBridgeApiState({
      campaignId,
      config: { baseUrl: "http://127.0.0.1:5174" },
      fetchImpl,
    });

    expect(state.status).toBe("review_required");
    expect(state.review.proofPackage.status).toBe("ready_disabled");
    expect(state.review.safety.liveFundingTransfer).toBe(false);
  });

  it("builds the request URL without leaking query strings", () => {
    expect(
      buildProjectOwnerFundingProofReviewBridgeApiUrl(
        new URL("http://127.0.0.1:5174/base/?token=unsafe#frag"),
        "campaign/with space",
      ),
    ).toBe("http://127.0.0.1:5174/base/api/campaigns/campaign%2Fwith%20space/reward-distribution/funding-proof-review");
  });

  it("submits only safe local metadata to the POST normalization route", async () => {
    const readyPayload = createProjectOwnerFundingProofReviewBridge({
      campaign: campaignDetail,
      proofPackage: completeProofPackage,
      source: "server_runtime",
      traceId: "trace-funding-proof-submit",
    });
    const fetchImpl = vi.fn().mockResolvedValueOnce(response(
      envelope(readyPayload, "trace-submit-envelope"),
    )) as unknown as ProjectOwnerFundingProofReviewBridgeApiFetch;

    const state = await submitProjectOwnerFundingProofReviewBridgeApiState({
      campaignId,
      config: { baseUrl: "http://127.0.0.1:5174" },
      fetchImpl,
      proofPackage: {
        ...completeProofPackage,
        signedUrl: "https://proof.invalid/file?signedUrl=unsafe",
        transactionId: "funding-transfer-transaction-123",
        walletSignature: "raw-signature-sample",
      },
    });
    const body = String((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body);

    expect(state.status).toBe("review_required");
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://127.0.0.1:5174/api/campaigns/camp-awaken-sprint/reward-distribution/funding-proof-review",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(body).toContain("proof-ref:project-owner-budget-ticket");
    for (const unsafe of ["proof.invalid", "signedUrl", "transaction-123", "raw-signature-sample"]) {
      expect(body).not.toContain(unsafe);
    }
  });

  it("sanitizes unsafe API text before diagnostics can render", () => {
    const sanitized = sanitizeProjectOwnerFundingProofReviewBridgeApiText(
      "Request failed with bearer token, providerPayload, walletSignature, transactionId, signed URL https://proof.invalid/raw, stack trace, and /private/campaign-os-kitty/secret.md",
    ).toLowerCase();

    for (const unsafe of [
      "bearer token",
      "providerpayload",
      "walletsignature",
      "transactionid",
      "proof.invalid",
      "stack trace",
      "/private/campaign-os-kitty",
    ]) {
      expect(sanitized).not.toContain(unsafe);
    }
    expect(sanitized).toContain("redacted");
  });
});
