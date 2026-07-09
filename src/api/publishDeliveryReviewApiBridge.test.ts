import { describe, expect, it, vi } from "vitest";
import type { PublishDeliveryReview } from "../domain/types";
import {
  createPublishDeliveryReviewApiLoadingState,
  createPublishDeliveryReviewApiSeededFallbackState,
  loadPublishDeliveryReviewApiBridgeState,
  sanitizePublishDeliveryReviewApiText,
  type PublishDeliveryReviewApiFetch,
} from "./publishDeliveryReviewApiBridge";

const response = (
  body: unknown,
  options: { ok?: boolean; status?: number; traceId?: string } = {},
): Response => ({
  headers: new Headers(options.traceId ? { "x-campaign-os-trace-id": options.traceId } : {}),
  json: vi.fn(async () => body),
  ok: options.ok ?? true,
  status: options.status ?? 200,
} as unknown as Response);

const runtime = {
  mode: "local_seeded",
  name: "campaign-os-api-runtime",
  routeCount: 32,
  version: "0.2.0-local",
};

const campaignId = "camp-awaken-sprint";

const validReviewPayload = (
  overrides: Partial<PublishDeliveryReview> = {},
): PublishDeliveryReview => ({
  ...createPublishDeliveryReviewApiSeededFallbackState(campaignId).review,
  source: "api_runtime",
  traceId: "trace-runtime-payload",
  ...overrides,
});

const envelope = (payload: unknown, traceId = "trace-runtime-envelope") => ({
  data: {
    boundary: {
      "en-US": "Local front-end/back-end publish delivery review bridge only.",
      "zh-CN": "仅用于本地前后端发布交付 review bridge。",
      "zh-TW": "Local front-end/back-end publish delivery review bridge only.",
    },
    payload,
  },
  ok: true,
  runtime,
  safety: {
    localOnly: true,
    noLiveApi: true,
    noContractWrite: true,
    noRewardCustody: true,
    noRewardDistribution: true,
  },
  timestamp: "2026-07-10T00:00:00.000Z",
  traceId,
});

describe("publish delivery review API bridge", () => {
  it("creates a loading state without touching the network", () => {
    const state = createPublishDeliveryReviewApiLoadingState(campaignId);

    expect(state).toMatchObject({
      campaignId,
      configured: true,
      loading: true,
      source: "loading",
      status: "loading",
    });
    expect(state.boundary["en-US"]).toContain("Local front-end/back-end publish delivery review bridge");
  });

  it("returns seeded fallback when the API base URL is missing", async () => {
    const fetchImpl = vi.fn() as unknown as PublishDeliveryReviewApiFetch;

    const state = await loadPublishDeliveryReviewApiBridgeState({
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
    expect(state.review.source).toBe("seeded_fallback");
    expect(state.review.backendRuntime.productionReady).toBe(false);
  });

  it("returns sanitized error fallback when the API base URL is invalid", async () => {
    const state = await loadPublishDeliveryReviewApiBridgeState({
      campaignId,
      config: {
        baseUrl: "ftp://api.invalid/path?token=sample-token&api_key=private-key-sample",
      },
      fetchImpl: vi.fn() as unknown as PublishDeliveryReviewApiFetch,
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

  it("loads publish delivery review from runtime envelope", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(response(
      envelope(validReviewPayload({ status: "blocked" }), "trace-envelope"),
      { traceId: "trace-header" },
    )) as unknown as PublishDeliveryReviewApiFetch;

    const state = await loadPublishDeliveryReviewApiBridgeState({
      campaignId,
      config: { baseUrl: "http://127.0.0.1:5174/", tracePrefix: "publish-review" },
      fetchImpl,
    });

    expect(state).toMatchObject({
      campaignId,
      configured: true,
      diagnostics: [],
      loading: false,
      review: expect.objectContaining({
        campaignId,
        source: "api_runtime",
        status: "blocked",
      }),
      routeCount: 32,
      source: "api_runtime",
      status: "blocked",
      traceId: "trace-envelope",
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://127.0.0.1:5174/api/campaigns/camp-awaken-sprint/publish-delivery-review",
      expect.objectContaining({
        headers: expect.objectContaining({
          accept: "application/json",
          "x-campaign-os-trace-id": expect.stringMatching(/^publish-review-publish-delivery-review-/),
        }),
        method: "GET",
      }),
    );
  });

  it("returns error fallback when the request fails", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error(
        "Request failed with bearer token sample-token, provider payload, stack trace, /Users/aelf/workspace/vibecoding/AElf/campaign-os-kitty/secret.md",
      );
    }) as unknown as PublishDeliveryReviewApiFetch;

    const state = await loadPublishDeliveryReviewApiBridgeState({
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
    for (const unsafe of ["bearer token", "sample-token", "provider payload", "stack trace", "campaign-os-kitty"]) {
      expect(serialized).not.toContain(unsafe);
    }
  });

  it("returns timeout fallback when the runtime request aborts", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new DOMException("seed phrase sample and raw-signature payload", "AbortError");
    }) as unknown as PublishDeliveryReviewApiFetch;

    const state = await loadPublishDeliveryReviewApiBridgeState({
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
    expect(serialized).not.toContain("raw-signature");
  });

  it("returns error fallback for malformed JSON or envelope", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(response({
      data: { payload: validReviewPayload() },
      runtime,
      traceId: "trace-malformed",
    })) as unknown as PublishDeliveryReviewApiFetch;

    const state = await loadPublishDeliveryReviewApiBridgeState({
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
    const { publishGate: _publishGate, ...invalidPayload } = validReviewPayload();
    const fetchImpl = vi.fn().mockResolvedValueOnce(response(
      envelope(invalidPayload, "trace-payload-invalid"),
    )) as unknown as PublishDeliveryReviewApiFetch;

    const state = await loadPublishDeliveryReviewApiBridgeState({
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

  it("redacts unsafe diagnostic text", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(response({
      error: {
        message:
          "private key, seed phrase, bearer abc.123, signed URL, object key, storage key, provider call, raw signature",
      },
      ok: false,
      traceId: "trace-unsafe-envelope",
    }, {
      ok: false,
      status: 500,
      traceId: "trace-unsafe-header",
    })) as unknown as PublishDeliveryReviewApiFetch;

    const state = await loadPublishDeliveryReviewApiBridgeState({
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
      "private key",
      "seed phrase",
      "bearer abc",
      "signed url",
      "object key",
      "storage key",
      "provider call",
      "raw signature",
    ]) {
      expect(serialized).not.toContain(unsafe);
    }
  });

  it("preserves trace ID from the response header when the envelope omits it", async () => {
    const body = envelope(validReviewPayload({ traceId: undefined }));
    delete (body as { traceId?: string }).traceId;
    const fetchImpl = vi.fn().mockResolvedValueOnce(response(body, {
      traceId: "trace-header-only",
    })) as unknown as PublishDeliveryReviewApiFetch;

    const state = await loadPublishDeliveryReviewApiBridgeState({
      campaignId,
      config: { baseUrl: "http://127.0.0.1:5174" },
      fetchImpl,
    });

    expect(state.traceId).toBe("trace-header-only");
    expect(state.review.traceId).toBeUndefined();
  });

  it("sanitizes standalone diagnostic text", () => {
    expect(
      sanitizePublishDeliveryReviewApiText("provider payload token=abc123 private key signed url"),
    ).toBe("redacted provider data redacted query credential redacted key redacted signed link");
  });
});
