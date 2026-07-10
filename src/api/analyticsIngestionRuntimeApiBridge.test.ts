import { describe, expect, it, vi } from "vitest";
import {
  buildAnalyticsIngestionRuntimeApiUrl,
  createAnalyticsIngestionRuntimeApiLoadingState,
  createAnalyticsIngestionRuntimeApiSeededFallbackState,
  loadAnalyticsIngestionRuntimeApiBridgeState,
  sanitizeAnalyticsIngestionRuntimeApiText,
  type AnalyticsIngestionRuntimeApiFetch,
} from "./analyticsIngestionRuntimeApiBridge";
import {
  createAnalyticsIngestionRuntimeReadiness,
  type AnalyticsIngestionRuntimeReadiness,
} from "../domain/analyticsIngestionRuntime";
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
  routeCount: 35,
  version: "0.2.0-local",
};

const validReadinessPayload = (
  overrides: Partial<AnalyticsIngestionRuntimeReadiness> = {},
): AnalyticsIngestionRuntimeReadiness => ({
  ...createAnalyticsIngestionRuntimeReadiness({
    campaign: campaignDetail,
    source: "server_runtime",
    traceId: "trace-analytics-payload",
  }),
  ...overrides,
});

const envelope = (payload: unknown, traceId = "trace-analytics-envelope") => ({
  data: {
    boundary: {
      "en-US": "Local analytics ingestion readiness review route.",
      "zh-CN": "本地 analytics ingestion readiness review route。",
      "zh-TW": "Local analytics ingestion readiness review route.",
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
  timestamp: "2026-07-10T00:00:00.000Z",
  traceId,
});

describe("analytics ingestion runtime API bridge", () => {
  it("creates a loading state without touching the network", () => {
    const state = createAnalyticsIngestionRuntimeApiLoadingState(campaignId);

    expect(state).toMatchObject({
      campaignId,
      configured: true,
      loading: true,
      source: "loading",
      status: "loading",
    });
    expect(state.boundary["en-US"]).toContain("Local analytics ingestion runtime API bridge");
    expect(state.readiness.noLiveSideEffects.liveAnalyticsSdkExecuted).toBe(false);
    expect(state.readiness.noLiveSideEffects.liveEventWarehouseWrite).toBe(false);
  });

  it("returns seeded fallback when the API base URL is missing", async () => {
    const fetchImpl = vi.fn() as unknown as AnalyticsIngestionRuntimeApiFetch;

    const state = await loadAnalyticsIngestionRuntimeApiBridgeState({
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
    expect(state.readiness.warehouseHandoff.liveWarehouseWriteEnabled).toBe(false);
  });

  it("returns sanitized error fallback when the API base URL is invalid", async () => {
    const state = await loadAnalyticsIngestionRuntimeApiBridgeState({
      campaignId,
      config: {
        baseUrl: "ftp://api.invalid/path?token=sample-token&api_key=private-key-sample",
      },
      fetchImpl: vi.fn() as unknown as AnalyticsIngestionRuntimeApiFetch,
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
    )) as unknown as AnalyticsIngestionRuntimeApiFetch;

    const state = await loadAnalyticsIngestionRuntimeApiBridgeState({
      campaignId,
      config: {
        baseUrl: "http://127.0.0.1:5174/",
        headers: { "x-campaign-os-roles": "project_owner" },
        tracePrefix: "analytics-runtime",
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
      routeCount: 35,
      source: "api_runtime",
      status: "blocked",
      traceId: "trace-envelope",
    });
    expect(state.readiness.noLiveSideEffects).toMatchObject({
      liveAnalyticsSdkExecuted: false,
      liveBrowserTrackingEnabled: false,
      liveEventIngestionEnabled: false,
      liveEventWarehouseWrite: false,
      liveFingerprintingEnabled: false,
      liveProfilingEnabled: false,
      liveRewardCustody: false,
      liveRewardDistribution: false,
    });
    expect(state.readiness.eventCatalog).toHaveLength(9);
    expect(state.readiness.metricLineage).toHaveLength(9);
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://127.0.0.1:5174/api/campaigns/camp-awaken-sprint/analytics/ingestion-readiness",
      expect.objectContaining({
        headers: expect.objectContaining({
          accept: "application/json",
          "x-campaign-os-roles": "project_owner",
          "x-campaign-os-trace-id": expect.stringMatching(/^analytics-runtime-analytics-ingestion-runtime-/),
        }),
        method: "GET",
      }),
    );
  });

  it("builds the request URL without leaking query strings", () => {
    expect(
      buildAnalyticsIngestionRuntimeApiUrl(
        new URL("http://127.0.0.1:5174/base/?token=unsafe#frag"),
        "campaign/with space",
      ),
    ).toBe("http://127.0.0.1:5174/base/api/campaigns/campaign%2Fwith%20space/analytics/ingestion-readiness");
  });

  it("returns error fallback when the request fails", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error(
        "Request failed with bearer token sample-token, provider payload, stack trace, /Users/aelf/workspace/vibecoding/AElf/campaign-os-kitty/secret.md",
      );
    }) as unknown as AnalyticsIngestionRuntimeApiFetch;

    const state = await loadAnalyticsIngestionRuntimeApiBridgeState({
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
    }) as unknown as AnalyticsIngestionRuntimeApiFetch;

    const state = await loadAnalyticsIngestionRuntimeApiBridgeState({
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

  it("returns error fallback for malformed envelopes", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(response({
      data: { payload: validReadinessPayload() },
      runtime: runtimeMetadata,
      traceId: "trace-malformed",
    })) as unknown as AnalyticsIngestionRuntimeApiFetch;

    const state = await loadAnalyticsIngestionRuntimeApiBridgeState({
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
    )) as unknown as AnalyticsIngestionRuntimeApiFetch;

    const state = await loadAnalyticsIngestionRuntimeApiBridgeState({
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
        liveEventWarehouseWrite: true as false,
      },
    });
    const fetchImpl = vi.fn().mockResolvedValueOnce(response(
      envelope(invalidPayload, "trace-live-flag-invalid"),
    )) as unknown as AnalyticsIngestionRuntimeApiFetch;

    const state = await loadAnalyticsIngestionRuntimeApiBridgeState({
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
          "private key, seed phrase, bearer abc.123, signed URL, download URL, object key, storage key, warehouse key, provider call, wallet signature, raw signature at handler (/private/path.ts:1)",
      },
      ok: false,
      traceId: "trace-unsafe-envelope",
    }, {
      ok: false,
      status: 500,
      traceId: "trace-unsafe-header",
    })) as unknown as AnalyticsIngestionRuntimeApiFetch;

    const state = await loadAnalyticsIngestionRuntimeApiBridgeState({
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
      "download url",
      "object key",
      "storage key",
      "warehouse key",
      "provider call",
      "wallet signature",
      "raw signature",
      "/private/path",
    ]) {
      expect(serialized).not.toContain(unsafe);
    }
  });

  it("sanitizes standalone diagnostic text", () => {
    expect(
      sanitizeAnalyticsIngestionRuntimeApiText("provider payload token=abc123 private key signed url object key"),
    ).toBe("redacted provider data redacted query credential redacted key redacted signed link redacted object reference");
  });

  it("creates an explicit seeded fallback state for disabled Project Console reviews", () => {
    const state = createAnalyticsIngestionRuntimeApiSeededFallbackState(campaignId, "trace-seeded");

    expect(state).toMatchObject({
      configured: false,
      source: "seeded_fallback",
      status: "fallback",
      traceId: "trace-seeded",
    });
    expect(state.readiness.eventCatalog).toHaveLength(9);
    expect(state.readiness.metricLineage).toHaveLength(9);
  });
});
