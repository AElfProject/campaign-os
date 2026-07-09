import { describe, expect, it, vi } from "vitest";
import {
  createCampaignDiscoveryApiLoadingState,
  loadCampaignDiscoveryApiBridgeState,
  sanitizeCampaignDiscoveryApiText,
  type CampaignDiscoveryApiFetch,
} from "./campaignDiscoveryApiBridge";

interface TestCampaign {
  id: string;
}

const seededCampaigns: TestCampaign[] = [
  { id: "seeded-awaken" },
  { id: "seeded-forest" },
];

const runtime = {
  mode: "local_seeded",
  name: "campaign-os-api-runtime",
  routeCount: 18,
  version: "0.1.0-local",
};

const response = (
  body: unknown,
  options: { ok?: boolean; status?: number; traceId?: string } = {},
): Response => ({
  headers: new Headers(options.traceId ? { "x-campaign-os-trace-id": options.traceId } : {}),
  json: vi.fn(async () => body),
  ok: options.ok ?? true,
  status: options.status ?? 200,
} as unknown as Response);

describe("campaign discovery API bridge", () => {
  it("creates a loading state for UI review without touching the network", () => {
    const state = createCampaignDiscoveryApiLoadingState({ campaignCount: seededCampaigns.length });

    expect(state).toMatchObject({
      campaignCount: 2,
      configured: true,
      loading: true,
      source: "loading",
    });
    expect(state.boundary["en-US"]).toContain("Local Campaign OS API runtime review only");
  });

  it("treats an empty base URL as disabled seeded fallback and does not fetch", async () => {
    const fetchImpl = vi.fn() as unknown as CampaignDiscoveryApiFetch;

    const state = await loadCampaignDiscoveryApiBridgeState({
      config: { baseUrl: "   " },
      fetchImpl,
      seededCampaigns,
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(state).toMatchObject({
      campaignCount: 2,
      campaigns: seededCampaigns,
      configured: false,
      diagnostic: { code: "API_BASE_URL_MISSING" },
      loading: false,
      source: "disabled",
    });
  });

  it("loads health and campaign list envelopes into API source state with trace metadata", async () => {
    const apiCampaigns = [{ id: "api-campaign-1" }, { id: "api-campaign-2" }];
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response({
        data: {
          status: "ready",
        },
        ok: true,
        runtime,
        safety: { localOnly: true, noLiveApi: true },
        timestamp: "2026-07-09T09:00:00.000Z",
        traceId: "trace-health",
      }, { traceId: "trace-health" }))
      .mockResolvedValueOnce(response({
        data: {
          payload: {
            items: apiCampaigns,
            summary: { totalCampaigns: 2 },
          },
        },
        ok: true,
        runtime,
        safety: { localOnly: true, noLiveApi: true },
        timestamp: "2026-07-09T09:00:01.000Z",
        traceId: "trace-campaigns",
      }, { traceId: "trace-campaigns" })) as unknown as CampaignDiscoveryApiFetch;

    const state = await loadCampaignDiscoveryApiBridgeState({
      config: { baseUrl: "http://127.0.0.1:5174/", tracePrefix: "review-trace" },
      fetchImpl,
      seededCampaigns,
    });

    expect(state).toMatchObject({
      campaignCount: 2,
      campaigns: apiCampaigns,
      configured: true,
      healthStatus: "ready",
      loading: false,
      readinessSummary: "ready; 18 routes",
      routeCount: 18,
      source: "api",
      traceId: "trace-campaigns",
    });
    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "http://127.0.0.1:5174/api/health",
      expect.objectContaining({
        headers: expect.objectContaining({
          accept: "application/json",
          "x-campaign-os-trace-id": expect.stringMatching(/^review-trace-/),
        }),
        method: "GET",
      }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "http://127.0.0.1:5174/api/campaigns",
      expect.objectContaining({
        headers: expect.objectContaining({
          accept: "application/json",
          "x-campaign-os-trace-id": expect.stringMatching(/^review-trace-/),
        }),
        method: "GET",
      }),
    );
  });

  it("keeps seeded campaigns when health succeeds but campaigns fetch fails", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response({
        data: { status: "ready" },
        ok: true,
        runtime,
        traceId: "trace-health",
      }))
      .mockResolvedValueOnce(response({
        error: {
          code: "INVALID_REQUEST",
          message: "raw signature and private key were rejected",
        },
        ok: false,
        runtime,
        traceId: "trace-campaign-failure",
      }, { ok: false, status: 500, traceId: "trace-campaign-failure" })) as unknown as CampaignDiscoveryApiFetch;

    const state = await loadCampaignDiscoveryApiBridgeState({
      config: { baseUrl: "http://127.0.0.1:5174" },
      fetchImpl,
      seededCampaigns,
    });

    expect(state).toMatchObject({
      campaignCount: 2,
      campaigns: seededCampaigns,
      diagnostic: {
        code: "API_CAMPAIGNS_FAILED",
        safeDetails: {
          endpoint: "/api/campaigns",
          status: 500,
        },
      },
      routeCount: 18,
      source: "error_fallback",
      traceId: "trace-campaign-failure",
    });
    expect(JSON.stringify(state.diagnostic).toLowerCase()).not.toContain("raw signature");
    expect(JSON.stringify(state.diagnostic).toLowerCase()).not.toContain("private key");
  });

  it("falls back safely when the campaign payload shape is malformed", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response({
        data: { status: "ready" },
        ok: true,
        runtime,
        traceId: "trace-health",
      }))
      .mockResolvedValueOnce(response({
        data: {
          payload: {
            items: "not-an-array",
          },
        },
        ok: true,
        runtime,
        traceId: "trace-invalid-campaigns",
      })) as unknown as CampaignDiscoveryApiFetch;

    const state = await loadCampaignDiscoveryApiBridgeState({
      config: { baseUrl: "http://127.0.0.1:5174" },
      fetchImpl,
      seededCampaigns,
    });

    expect(state).toMatchObject({
      campaignCount: 2,
      campaigns: seededCampaigns,
      diagnostic: { code: "API_RESPONSE_INVALID" },
      source: "error_fallback",
      traceId: "trace-invalid-campaigns",
    });
  });

  it("returns a sanitized timeout diagnostic when the request is aborted", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new DOMException(
        "Request aborted with bearer token sample-token, password=secret, seed phrase sample, and raw-signature payload.",
        "AbortError",
      );
    }) as unknown as CampaignDiscoveryApiFetch;

    const state = await loadCampaignDiscoveryApiBridgeState({
      config: { baseUrl: "http://127.0.0.1:5174" },
      fetchImpl,
      seededCampaigns,
    });

    const serialized = JSON.stringify(state.diagnostic).toLowerCase();

    expect(state).toMatchObject({
      campaignCount: 2,
      campaigns: seededCampaigns,
      diagnostic: { code: "API_REQUEST_TIMEOUT" },
      source: "error_fallback",
    });
    for (const unsafe of ["bearer token", "password", "seed phrase", "raw-signature", "sample-token"]) {
      expect(serialized).not.toContain(unsafe);
    }
  });

  it("redacts malformed config and token query fragments from diagnostics", async () => {
    const state = await loadCampaignDiscoveryApiBridgeState({
      config: {
        baseUrl: "ftp://api.invalid/path?token=sample-token&api_key=private-key-sample",
      },
      fetchImpl: vi.fn() as unknown as CampaignDiscoveryApiFetch,
      seededCampaigns,
    });
    const serialized = JSON.stringify(state.diagnostic).toLowerCase();

    expect(state).toMatchObject({
      campaignCount: 2,
      campaigns: seededCampaigns,
      configured: true,
      diagnostic: { code: "API_BASE_URL_INVALID" },
      source: "seeded_fallback",
    });
    for (const unsafe of ["token=sample-token", "api_key", "private-key", "private key"]) {
      expect(serialized).not.toContain(unsafe);
    }
    expect(sanitizeCampaignDiscoveryApiText("api key and token=abc123 were removed")).toBe(
      "redacted credential and redacted query credential were removed",
    );
  });
});
