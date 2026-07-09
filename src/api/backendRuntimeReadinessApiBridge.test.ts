import { describe, expect, it, vi } from "vitest";
import {
  createBackendRuntimeReadinessApiLoadingState,
  loadBackendRuntimeReadinessApiBridgeState,
  sanitizeBackendRuntimeReadinessApiText,
  seededBackendRuntimeReadinessSummary,
  type BackendRuntimeReadinessApiFetch,
} from "./backendRuntimeReadinessApiBridge";

const runtime = {
  mode: "local_seeded",
  name: "campaign-os-api-runtime",
  routeCount: 26,
  version: "0.2.0-local",
};

const readinessSummary = {
  deployHandoff: {
    contractsEndpoint: "/api/contracts",
    healthEndpoint: "/api/health",
    runtimeTarget: "api_service",
    shutdownTimeoutMs: 5000,
    smokeCommand: "npm run server:smoke",
    startCommand: "npm run server:start",
    traceHeaderName: "x-campaign-os-trace-id",
  },
  diagnostics: [
    {
      code: "PRODUCTION_BACKEND_NO_LIVE_SIDE_EFFECTS",
      message: "Review-only metadata.",
      severity: "info",
    },
  ],
  generatedAt: "2026-07-09T18:53:49.000Z",
  id: "production-backend-runtime-readiness",
  noLiveSideEffects: {
    analyticsWarehouseWriteExecuted: false,
    authProviderConnected: false,
    contractWriteExecuted: false,
    objectStorageWriteExecuted: false,
    productionDatabaseConnected: false,
    providerNetworkExecuted: false,
    queueWorkerExecuted: false,
    rewardCustodyExecuted: false,
    rewardDistributionExecuted: false,
    schedulerExecuted: false,
    walletSdkExecuted: false,
  },
  productionDependencyBlockers: [
    {
      area: "database",
      attachPoint: "src/server/productionDatabase.ts",
      blockedBy: ["production DB adapter"],
      id: "live-database-driver",
      requiredBeforeProduction: true,
      status: "blocked",
    },
  ],
  productionReady: false,
  profile: {
    configuredRequiredConfigKeys: [],
    externalNetworkAllowed: false,
    id: "local-review",
    label: "Local review backend scaffold",
    missingRequiredConfigKeys: [],
    requiredConfigKeys: [],
    requiresSecrets: false,
    secretValuesExposed: false,
    status: "ready",
    supportMode: "local_seeded",
  },
  routeCoverage: {
    blockedCount: 0,
    coveredApiSkillCount: 18,
    localOnlyCount: 9,
    missingApiSkillIds: [],
    readyCount: 5,
    requiredApiSkillCount: 18,
    reviewRequiredCount: 12,
    routeCount: 26,
    routeIds: ["runtime.health", "runtime.contracts", "campaigns.list"],
    runtimeRouteCount: 2,
  },
  status: "ready",
  tracePolicy: {
    failureEnvelopeTraceId: true,
    startupLogIncludesTracePolicy: true,
    successEnvelopeTraceId: true,
    traceHeaderName: "x-campaign-os-trace-id",
  },
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

const envelope = (summary: unknown, traceId: string) => ({
  data: {
    productionBackendReadiness: summary,
  },
  ok: true,
  runtime,
  safety: { localOnly: true, noLiveApi: true },
  timestamp: "2026-07-09T19:00:00.000Z",
  traceId,
});

describe("backend runtime readiness API bridge", () => {
  it("creates a loading state without touching the network", () => {
    const state = createBackendRuntimeReadinessApiLoadingState();

    expect(state).toMatchObject({
      configured: true,
      loading: true,
      source: "loading",
      status: "loading",
    });
    expect(state.boundary["en-US"]).toContain("No live provider");
  });

  it("returns seeded fallback when the API base URL is missing", async () => {
    const fetchImpl = vi.fn() as unknown as BackendRuntimeReadinessApiFetch;

    const state = await loadBackendRuntimeReadinessApiBridgeState({
      config: { baseUrl: "   " },
      fetchImpl,
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(state).toMatchObject({
      configured: false,
      diagnostics: [{ code: "API_BASE_URL_MISSING", severity: "info" }],
      loading: false,
      source: "seeded_fallback",
      status: "fallback",
      summary: seededBackendRuntimeReadinessSummary,
    });
    expect(state.summary.noLiveSideEffects.contractWriteExecuted).toBe(false);
  });

  it("returns sanitized seeded fallback when the API base URL is invalid", async () => {
    const state = await loadBackendRuntimeReadinessApiBridgeState({
      config: {
        baseUrl: "ftp://api.invalid/path?token=sample-token&api_key=private-key-sample",
      },
      fetchImpl: vi.fn() as unknown as BackendRuntimeReadinessApiFetch,
    });
    const serialized = JSON.stringify(state.diagnostics).toLowerCase();

    expect(state).toMatchObject({
      configured: true,
      diagnostics: [{ code: "API_BASE_URL_INVALID", severity: "warning" }],
      source: "seeded_fallback",
      status: "fallback",
    });
    for (const unsafe of ["token=sample-token", "api_key", "private-key", "private key"]) {
      expect(serialized).not.toContain(unsafe);
    }
  });

  it("loads health and contracts readiness from API runtime and keeps contract trace metadata", async () => {
    const contractsSummary = {
      ...readinessSummary,
      routeCoverage: {
        ...readinessSummary.routeCoverage,
        routeIds: [...readinessSummary.routeCoverage.routeIds, "campaigns.export.preview"],
      },
    };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response(envelope(readinessSummary, "trace-health-envelope"), {
        traceId: "trace-health-header",
      }))
      .mockResolvedValueOnce(response(envelope(contractsSummary, "trace-contracts-envelope"), {
        traceId: "trace-contracts-header",
      })) as unknown as BackendRuntimeReadinessApiFetch;

    const state = await loadBackendRuntimeReadinessApiBridgeState({
      config: { baseUrl: "http://127.0.0.1:5174/", tracePrefix: "backend-review" },
      fetchImpl,
    });

    expect(state).toMatchObject({
      configured: true,
      diagnostics: [],
      loading: false,
      source: "api_runtime",
      status: "ready",
      summary: expect.objectContaining({
        routeCoverage: expect.objectContaining({
          routeIds: expect.arrayContaining(["campaigns.export.preview"]),
        }),
      }),
      traceId: "trace-contracts-envelope",
    });
    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "http://127.0.0.1:5174/api/health",
      expect.objectContaining({
        headers: expect.objectContaining({
          accept: "application/json",
          "x-campaign-os-trace-id": expect.stringMatching(/^backend-review-/),
        }),
        method: "GET",
      }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "http://127.0.0.1:5174/api/contracts",
      expect.objectContaining({
        headers: expect.objectContaining({
          accept: "application/json",
          "x-campaign-os-trace-id": expect.stringMatching(/^backend-review-/),
        }),
        method: "GET",
      }),
    );
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("falls back when health is unreachable and redacts unsafe diagnostics", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error(
        "Request failed with bearer token sample-token, password=secret, provider payload, stack trace, /Users/aelf/workspace/vibecoding/AElf/campaign-os-kitty/secret.md",
      );
    }) as unknown as BackendRuntimeReadinessApiFetch;

    const state = await loadBackendRuntimeReadinessApiBridgeState({
      config: { baseUrl: "http://127.0.0.1:5174" },
      fetchImpl,
    });
    const serialized = JSON.stringify(state.diagnostics).toLowerCase();

    expect(state).toMatchObject({
      diagnostics: [{ code: "API_REQUEST_FAILED", severity: "error" }],
      source: "error_fallback",
      status: "error",
      summary: seededBackendRuntimeReadinessSummary,
    });
    for (const unsafe of [
      "bearer token",
      "sample-token",
      "password=secret",
      "provider payload",
      "stack trace",
      "campaign-os-kitty",
    ]) {
      expect(serialized).not.toContain(unsafe);
    }
  });

  it("falls back when contracts route fails after health succeeds", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response(envelope(readinessSummary, "trace-health"), {
        traceId: "trace-health",
      }))
      .mockResolvedValueOnce(response({
        error: { message: "contracts failed with private key sample" },
        ok: false,
        traceId: "trace-contracts-failed",
      }, {
        ok: false,
        status: 500,
        traceId: "trace-contracts-failed",
      })) as unknown as BackendRuntimeReadinessApiFetch;

    const state = await loadBackendRuntimeReadinessApiBridgeState({
      config: { baseUrl: "http://127.0.0.1:5174" },
      fetchImpl,
    });

    expect(state).toMatchObject({
      diagnostics: [{ code: "API_CONTRACTS_FAILED", severity: "error" }],
      source: "error_fallback",
      status: "error",
      traceId: "trace-contracts-failed",
    });
    expect(JSON.stringify(state.diagnostics).toLowerCase()).not.toContain("private key");
  });

  it("falls back when readiness response shape is malformed", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response(envelope({ ...readinessSummary, id: "wrong" }, "trace-health")))
      .mockResolvedValueOnce(response(envelope(readinessSummary, "trace-contracts"))) as unknown as BackendRuntimeReadinessApiFetch;

    const state = await loadBackendRuntimeReadinessApiBridgeState({
      config: { baseUrl: "http://127.0.0.1:5174" },
      fetchImpl,
    });

    expect(state).toMatchObject({
      diagnostics: [{ code: "API_RESPONSE_INVALID", severity: "error" }],
      source: "error_fallback",
      status: "error",
      traceId: "trace-health",
    });
  });

  it("returns timeout diagnostics and avoids repeated unsafe live calls", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new DOMException("seed phrase sample and raw-signature payload", "AbortError");
    }) as unknown as BackendRuntimeReadinessApiFetch;

    const state = await loadBackendRuntimeReadinessApiBridgeState({
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
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://127.0.0.1:5174/api/health",
      expect.objectContaining({ method: "GET" }),
    );
    for (const unsafe of ["seed phrase", "raw-signature"]) {
      expect(serialized).not.toContain(unsafe);
    }
  });

  it("sanitizes standalone diagnostic text", () => {
    expect(sanitizeBackendRuntimeReadinessApiText("provider payload token=abc123 private key")).toBe(
      "redacted provider data redacted query credential redacted key",
    );
  });
});
