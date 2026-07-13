import { afterEach, describe, expect, it, vi } from "vitest";
import type { NormalizedWalletSession } from "../domain/types";
import { startCampaignOsApiServer } from "./server";

const unsafeLogFragments = [
  "apikey",
  "bearer",
  "connectionstring",
  "database_url",
  "mnemonic",
  "password",
  "privatekey",
  "seedphrase",
  "secret",
  "signature",
  "signedurl",
  "token",
];

interface IssuedWalletAuthSession {
  accountType: NormalizedWalletSession["accountType"];
  address: string;
  proofStatus: "verified";
  sessionId: string;
  walletSource: NormalizedWalletSession["walletSource"];
}

const issueWalletSession = async (
  baseUrl: string,
  ownerAddress: string,
  traceId: string,
): Promise<IssuedWalletAuthSession> => {
  const response = await fetch(`${baseUrl}/api/wallet/session`, {
    body: JSON.stringify({
      address: ownerAddress,
      adapterName: "PortkeyDiscoverWallet",
      chainId: "AELF",
      network: "mainnet",
      nonce: `nonce-${traceId}`,
      proofEvaluatedAt: "2026-07-07T04:00:00.000Z",
      proofIssuedAt: "2026-07-07T03:59:00.000Z",
      signature: "test-wallet-signature",
    }),
    headers: {
      "content-type": "application/json",
      "x-campaign-os-trace-id": traceId,
    },
    method: "POST",
  });
  const envelope = await response.json() as {
    data?: { payload?: NormalizedWalletSession };
    ok?: boolean;
  };
  const session = envelope.data?.payload;

  expect(response.status).toBe(200);
  expect(response.headers.get("x-campaign-os-trace-id")).toBe(traceId);
  expect(envelope).toMatchObject({
    ok: true,
    data: {
      payload: {
        address: ownerAddress,
        issuer: { valid: true },
        proof: { status: "verified" },
      },
    },
  });

  if (!session || session.proof?.status !== "verified") {
    throw new Error("Expected the wallet session route to return a verified issued session.");
  }

  return {
    accountType: session.accountType,
    address: session.address,
    proofStatus: "verified",
    sessionId: session.sessionId,
    walletSource: session.walletSource,
  };
};

const walletAuthHeaders = (
  session: IssuedWalletAuthSession,
  roleId = "project_owner",
) => ({
  "x-campaign-os-account-type": session.accountType,
  "x-campaign-os-credential-boundary": "ordinary_user_wallet",
  "x-campaign-os-proof-status": session.proofStatus,
  "x-campaign-os-roles": roleId,
  "x-campaign-os-session-id": session.sessionId,
  "x-campaign-os-wallet-address": session.address,
  "x-campaign-os-wallet-source": session.walletSource,
});

describe("Campaign OS API server entrypoint", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("starts and stops with backend service and server runtime metadata", async () => {
    const logs: string[] = [];
    const server = await startCampaignOsApiServer({
      logger: {
        error: (message?: unknown) => logs.push(String(message)),
        log: (message?: unknown) => logs.push(String(message)),
      },
      port: 0,
    });

    try {
      expect(server.runtimeContract).toMatchObject({
        profileId: "local-review",
        requestGuard: expect.objectContaining({
          guardedFailureEnvelope: true,
        }),
        valid: true,
      });
      expect(server.serviceContract).toMatchObject({
        id: "campaign-os-api-service",
        profileId: "local-review",
        readiness: {
          deployableBoundaryReady: true,
          liveConnectionAttempted: false,
          liveSideEffectsEnabled: false,
          productionReady: false,
        },
        shutdown: {
          activeRequestCount: 0,
          shutdownTimeoutMs: 5_000,
          state: "running",
        },
        status: "ready",
        valid: true,
      });
      expect(server.getServiceContract()).toMatchObject({
        composition: {
          apiRuntime: {
            metadataRouteIds: expect.arrayContaining(["runtime.health", "runtime.contracts"]),
          },
          backendService: {
            entrypointId: "campaign-os-backend-service",
          },
        },
      });
      expect(server.getServiceReadiness()).toMatchObject({
        contractWriteEnabled: false,
        liveConnectionAttempted: false,
        liveSideEffectsEnabled: false,
        productionReady: false,
        workerExecutionEnabled: false,
      });
      expect(server.getReadiness()).toMatchObject({
        readiness: {
          backendRuntimeBootstrap: {
            shutdown: {
              activeRequestCount: 0,
              shutdownTimeoutMs: 5_000,
              state: "running",
            },
            status: "ready",
            valid: true,
          },
        },
        shutdownState: {
          activeRequestCount: 0,
          shutdownTimeoutMs: 5_000,
          state: "running",
        },
        status: "ready",
      });

      const response = await fetch(`${server.url}/api/health`, {
        headers: { "x-campaign-os-trace-id": "trace-server-entrypoint" },
      });
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload).toMatchObject({
        ok: true,
        traceId: "trace-server-entrypoint",
        data: {
          backendService: expect.objectContaining({
            authSession: expect.objectContaining({
              profileId: "local-review",
              status: "local_seeded",
              valid: true,
            }),
            entrypointId: "campaign-os-backend-service",
            profileId: "local-review",
            traceId: "trace-server-entrypoint",
          }),
          serverRuntime: expect.objectContaining({
            corsPolicy: expect.objectContaining({
              enabled: true,
              preflightHandledBeforeRuntime: true,
            }),
            profileId: "local-review",
            requestGuard: expect.objectContaining({
              guardedFailureEnvelope: true,
              traceHeaderName: "x-campaign-os-trace-id",
            }),
            readiness: expect.objectContaining({
              backendRuntimeBootstrap: expect.objectContaining({
                shutdown: expect.objectContaining({
                  activeRequestCount: 1,
                  shutdownTimeoutMs: 5_000,
                  state: "running",
                }),
                status: "ready",
                valid: true,
              }),
            }),
            status: "ready",
          }),
          status: "ok",
        },
      });
      expect(logs).toHaveLength(1);
      expect(logs[0]).toContain("[campaign-os-api-runtime] listening on");
      expect(logs[0]).toContain("entrypoint=campaign-os-backend-service");
      expect(logs[0]).toContain("profile=local-review");
      expect(logs[0]).toContain("support=local_seeded");
      expect(logs[0]).toContain("no live operations");

      const normalizedLog = logs.join("\n").toLowerCase().replace(/[^a-z0-9_]/g, "");

      for (const fragment of unsafeLogFragments) {
        expect(normalizedLog).not.toContain(fragment);
      }
    } finally {
      await server.stop();
      await server.stop();
    }

    expect(server.getReadiness()).toMatchObject({
      liveness: {
        live: false,
      },
      readiness: {
        backendRuntimeBootstrap: {
          diagnosticCodes: expect.arrayContaining(["BACKEND_RUNTIME_BOOTSTRAP_STOPPED"]),
          shutdown: {
            activeRequestCount: 0,
            shutdownTimeoutMs: 5_000,
            state: "stopped",
          },
          status: "blocked",
          valid: false,
        },
      },
      shutdownState: {
        activeRequestCount: 0,
        shutdownTimeoutMs: 5_000,
        state: "stopped",
      },
      status: "stopped",
    });
    expect(server.serviceContract).toMatchObject({
      diagnosticCodes: expect.arrayContaining(["API_SERVICE_STOPPED"]),
      shutdown: {
        activeRequestCount: 0,
        shutdownTimeoutMs: 5_000,
        state: "stopped",
      },
      status: "stopped",
      valid: false,
    });
  });

  it("exposes stopping lifecycle readiness while shutdown waits for active requests", async () => {
    const server = await startCampaignOsApiServer({
      logger: false,
      port: 0,
      shutdownTimeoutMs: 25,
    });
    const stopPromise = server.stop();
    const stoppingReadiness = server.getReadiness();
    const stoppingServiceContract = server.getServiceContract();

    expect(stoppingReadiness).toMatchObject({
      readiness: {
        backendRuntimeBootstrap: {
          diagnosticCodes: expect.arrayContaining([
            "BACKEND_RUNTIME_BOOTSTRAP_SHUTDOWN_IN_PROGRESS",
          ]),
          shutdown: {
            shutdownTimeoutMs: 25,
            state: "stopping",
          },
          status: "deferred",
          valid: true,
        },
      },
      shutdownState: {
        shutdownTimeoutMs: 25,
        state: "stopping",
      },
      status: "shutting_down",
    });
    expect(stoppingReadiness.shutdownState.activeRequestCount).toBeGreaterThanOrEqual(0);
    expect(stoppingReadiness.readiness.backendRuntimeBootstrap.shutdown.activeRequestCount)
      .toBeGreaterThanOrEqual(0);
    expect(stoppingServiceContract).toMatchObject({
      diagnosticCodes: ["API_SERVICE_SHUTDOWN_IN_PROGRESS"],
      shutdown: {
        shutdownTimeoutMs: 25,
        state: "stopping",
      },
      status: "deferred",
      valid: true,
    });

    await stopPromise;
    await server.stop();

    expect(server.getReadiness()).toMatchObject({
      readiness: {
        backendRuntimeBootstrap: {
          shutdown: {
            activeRequestCount: 0,
            shutdownTimeoutMs: 25,
            state: "stopped",
          },
        },
      },
      shutdownState: {
        activeRequestCount: 0,
        shutdownTimeoutMs: 25,
        state: "stopped",
      },
    });
    expect(server.getServiceContract()).toMatchObject({
      diagnosticCodes: ["API_SERVICE_STOPPED"],
      shutdown: {
        activeRequestCount: 0,
        shutdownTimeoutMs: 25,
        state: "stopped",
      },
      status: "stopped",
      valid: false,
    });
  });

  it("handles CORS preflight without entering the business runtime", async () => {
    const server = await startCampaignOsApiServer({ logger: false, port: 0 });

    try {
      const response = await fetch(`${server.url}/api/campaigns`, {
        headers: {
          "access-control-request-method": "POST",
          origin: "http://localhost:5173",
          "x-campaign-os-trace-id": "trace-preflight",
        },
        method: "OPTIONS",
      });

      expect(response.status).toBe(204);
      expect(response.headers.get("x-campaign-os-trace-id")).toBe("trace-preflight");
      expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
      expect(response.headers.get("access-control-allow-methods")).toContain("POST");
      expect(await response.text()).toBe("");
    } finally {
      await server.stop();
    }
  });

  it("allows Vite fallback dev origins for API-backed local review", async () => {
    const server = await startCampaignOsApiServer({ logger: false, port: 0 });

    try {
      const response = await fetch(`${server.url}/api/campaigns/camp-awaken-sprint/points-ranking-ledger-runtime`, {
        headers: {
          "access-control-request-headers": "accept, x-campaign-os-trace-id",
          "access-control-request-method": "GET",
          origin: "http://127.0.0.1:5177",
          "x-campaign-os-trace-id": "trace-vite-fallback-preflight",
        },
        method: "OPTIONS",
      });

      expect(response.status).toBe(204);
      expect(response.headers.get("access-control-allow-origin")).toBe("http://127.0.0.1:5177");
      expect(response.headers.get("access-control-allow-methods")).toContain("GET");
      expect(response.headers.get("access-control-allow-headers")).toContain("x-campaign-os-trace-id");
      expect(response.headers.get("x-campaign-os-trace-id")).toBe("trace-vite-fallback-preflight");
    } finally {
      await server.stop();
    }
  });

  it("returns traceable guarded failures before business handlers", async () => {
    const server = await startCampaignOsApiServer({
      logger: false,
      maxBodyBytes: 16,
      port: 0,
    });

    try {
      const nonJson = await fetch(`${server.url}/api/campaigns`, {
        body: "plain",
        headers: {
          "content-type": "text/plain",
          "x-campaign-os-trace-id": "trace-non-json-http",
        },
        method: "POST",
      });
      const nonJsonPayload = await nonJson.json();

      expect(nonJson.status).toBe(400);
      expect(nonJson.headers.get("content-type")).toContain("application/json");
      expect(nonJson.headers.get("x-campaign-os-trace-id")).toBe("trace-non-json-http");
      expect(nonJsonPayload).toMatchObject({
        ok: false,
        runtime: expect.objectContaining({
          name: "campaign-os-api-runtime",
          routeCount: expect.any(Number),
        }),
        safety: expect.objectContaining({
          noContractWrite: true,
          noLiveApi: true,
          noProductionDatabase: true,
          noSecretHandling: true,
        }),
        traceId: "trace-non-json-http",
        error: {
          code: "INVALID_REQUEST",
          details: {
            field: "content-type",
          },
        },
      });

      const oversize = await fetch(`${server.url}/api/campaigns`, {
        body: JSON.stringify({ payload: "x".repeat(64) }),
        headers: {
          "content-type": "application/json",
          "x-campaign-os-trace-id": "trace-oversize-http",
        },
        method: "POST",
      });
      const oversizePayload = await oversize.json();

      expect(oversize.status).toBe(400);
      expect(oversize.headers.get("x-campaign-os-trace-id")).toBe("trace-oversize-http");
      expect(oversizePayload).toMatchObject({
        ok: false,
        runtime: expect.objectContaining({
          name: "campaign-os-api-runtime",
          routeCount: expect.any(Number),
        }),
        safety: expect.objectContaining({
          noLiveApi: true,
          noSecretHandling: true,
        }),
        traceId: "trace-oversize-http",
        error: {
          code: "INVALID_REQUEST",
          details: {
            field: "body",
          },
        },
      });

      const malformed = await fetch(`${server.url}/api/campaigns`, {
        body: "{bad",
        headers: {
          "content-type": "application/json",
          "x-campaign-os-trace-id": "trace-malformed-http",
        },
        method: "POST",
      });
      const malformedPayload = await malformed.json();

      expect(malformed.status).toBe(400);
      expect(malformed.headers.get("x-campaign-os-trace-id")).toBe("trace-malformed-http");
      expect(malformedPayload).toMatchObject({
        ok: false,
        runtime: expect.objectContaining({
          name: "campaign-os-api-runtime",
          routeCount: expect.any(Number),
        }),
        safety: expect.objectContaining({
          noLiveApi: true,
          noSecretHandling: true,
        }),
        traceId: "trace-malformed-http",
        error: {
          code: "MALFORMED_JSON",
        },
      });

      const unsupportedMethod = await fetch(`${server.url}/api/health?token=raw-secret-query`, {
        headers: {
          authorization: "Bearer raw-secret-header",
          "x-campaign-os-trace-id": "trace-unsupported-method-http",
        },
        method: "DELETE",
      });
      const unsupportedMethodPayload = await unsupportedMethod.json();

      expect(unsupportedMethod.status).toBe(405);
      expect(unsupportedMethod.headers.get("x-campaign-os-trace-id")).toBe("trace-unsupported-method-http");
      expect(unsupportedMethodPayload).toMatchObject({
        ok: false,
        runtime: expect.objectContaining({
          name: "campaign-os-api-runtime",
        }),
        safety: expect.objectContaining({
          noSecretHandling: true,
        }),
        traceId: "trace-unsupported-method-http",
        error: {
          code: "METHOD_NOT_ALLOWED",
          details: {
            path: "/api/health",
          },
        },
      });

      const unknownRoute = await fetch(`${server.url}/api/missing?token=raw-secret-query`, {
        headers: {
          authorization: "Bearer raw-secret-header",
          "x-campaign-os-trace-id": "trace-unknown-route-http",
        },
      });
      const unknownRoutePayload = await unknownRoute.json();

      expect(unknownRoute.status).toBe(404);
      expect(unknownRoute.headers.get("x-campaign-os-trace-id")).toBe("trace-unknown-route-http");
      expect(unknownRoutePayload).toMatchObject({
        ok: false,
        runtime: expect.objectContaining({
          name: "campaign-os-api-runtime",
        }),
        safety: expect.objectContaining({
          noSecretHandling: true,
        }),
        traceId: "trace-unknown-route-http",
        error: {
          code: "ROUTE_NOT_FOUND",
          details: {
            path: "/api/missing",
          },
        },
      });

      const serializedFailures = JSON.stringify([
        nonJsonPayload,
        oversizePayload,
        malformedPayload,
        unsupportedMethodPayload,
        unknownRoutePayload,
      ]).toLowerCase();
      expect(serializedFailures).not.toContain("raw-secret-header");
      expect(serializedFailures).not.toContain("raw-secret-query");
    } finally {
      await server.stop();
    }
  });

  it("enforces campaign mutation auth over HTTP", async () => {
    const server = await startCampaignOsApiServer({
      logger: false,
      port: 0,
    });

    try {
      const response = await fetch(`${server.url}/api/campaigns`, {
        body: JSON.stringify({
          contractMode: "OFF_CHAIN_MVP",
          defaultLocale: "en-US",
          duration: "2026-08-01/2026-08-14",
          endTime: "2026-08-14T23:59:59Z",
          goal: "Reject missing auth over HTTP",
          ownerAddress: "http-auth-owner",
          projectId: "http-auth-project",
          rewardDescription: "Repository-backed rewards remain local-review only.",
          startTime: "2026-08-01T00:00:00Z",
          supportedLocales: ["en-US"],
          walletPolicy: "ANY",
        }),
        headers: {
          authorization: "Bearer raw-secret-header",
          "content-type": "application/json",
          "x-campaign-os-trace-id": "trace-auth-http-missing",
        },
        method: "POST",
      });
      const payload = await response.json();
      const unissued = await fetch(`${server.url}/api/campaigns`, {
        body: JSON.stringify({
          contractMode: "OFF_CHAIN_MVP",
          defaultLocale: "en-US",
          duration: "2026-08-01/2026-08-14",
          endTime: "2026-08-14T23:59:59Z",
          goal: "Reject unissued project owner auth over HTTP",
          ownerAddress: "http-auth-owner",
          projectId: "http-auth-project",
          rewardDescription: "Repository-backed rewards remain local-review only.",
          startTime: "2026-08-01T00:00:00Z",
          supportedLocales: ["en-US"],
          walletPolicy: "ANY",
        }),
        headers: {
          "content-type": "application/json",
          "x-campaign-os-trace-id": "trace-auth-http-unissued",
          ...walletAuthHeaders({
            accountType: "AA",
            address: "http-auth-owner",
            proofStatus: "verified",
            sessionId: "unissued-http-auth-owner",
            walletSource: "PORTKEY_AA",
          }),
        },
        method: "POST",
      });
      const unissuedPayload = await unissued.json();
      const issuedOwnerSession = await issueWalletSession(
        server.url,
        "http-auth-owner",
        "trace-auth-http-session",
      );
      const authorized = await fetch(`${server.url}/api/campaigns`, {
        body: JSON.stringify({
          contractMode: "OFF_CHAIN_MVP",
          defaultLocale: "en-US",
          duration: "2026-08-01/2026-08-14",
          endTime: "2026-08-14T23:59:59Z",
          goal: "Allow project owner auth over HTTP",
          ownerAddress: "http-auth-owner",
          projectId: "http-auth-project",
          rewardDescription: "Repository-backed rewards remain local-review only.",
          startTime: "2026-08-01T00:00:00Z",
          supportedLocales: ["en-US"],
          walletPolicy: "ANY",
        }),
        headers: {
          "content-type": "application/json",
          "x-campaign-os-trace-id": "trace-auth-http-authorized",
          ...walletAuthHeaders(issuedOwnerSession),
        },
        method: "POST",
      });
      const authorizedPayload = await authorized.json();

      expect(response.status).toBe(401);
      expect(response.headers.get("x-campaign-os-trace-id")).toBe("trace-auth-http-missing");
      expect(payload).toMatchObject({
        ok: false,
        traceId: "trace-auth-http-missing",
        error: {
          code: "AUTH_SESSION_REQUIRED",
          details: {
            routeId: "campaigns.create",
          },
        },
      });
      expect(unissued.status).toBe(401);
      expect(unissued.headers.get("x-campaign-os-trace-id")).toBe("trace-auth-http-unissued");
      expect(unissuedPayload).toMatchObject({
        ok: false,
        traceId: "trace-auth-http-unissued",
        error: {
          code: "AUTH_SESSION_INVALID",
          details: {
            routeId: "campaigns.create",
          },
        },
      });
      expect(authorized.status).toBe(200);
      expect(authorized.headers.get("x-campaign-os-trace-id")).toBe("trace-auth-http-authorized");
      expect(authorizedPayload).toMatchObject({
        ok: true,
        traceId: "trace-auth-http-authorized",
        data: {
          payload: {
            id: "campaign-db-draft-0001",
            ownerAddress: "http-auth-owner",
            projectId: "http-auth-project",
          },
        },
      });
      expect(JSON.stringify(payload).toLowerCase()).not.toContain("raw-secret-header");
    } finally {
      await server.stop();
    }
  });

  it("keeps production-required server runtime blocked and sanitized", async () => {
    vi.stubEnv("CAMPAIGN_OS_AUTH_SECRET", "bearer sample-bearer-token");
    vi.stubEnv("CAMPAIGN_OS_BACKEND_PROFILE", "production-required");
    vi.stubEnv("CAMPAIGN_OS_DATABASE_URL", "postgres://real-user:real-db-password@db.invalid/campaign-os");
    vi.stubEnv("CAMPAIGN_OS_PROVIDER_REGISTRY_URL", "https://providers.invalid/object-key-sample");
    vi.stubEnv("CAMPAIGN_OS_WORKER_QUEUE_URL", "https://queue.invalid/raw-signature-sample");
    vi.stubEnv("CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT", "https://writer.invalid/private-key-sample");

    const server = await startCampaignOsApiServer({ logger: false, port: 0 });

    try {
      const response = await fetch(`${server.url}/api/health`, {
        headers: {
          authorization: "Bearer sample-bearer-token",
          "x-campaign-os-trace-id": "trace-production-server",
        },
      });
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(server.serviceContract).toMatchObject({
        diagnosticCodes: expect.arrayContaining([
          "API_SERVICE_RUNTIME_INVALID",
          "API_SERVICE_BACKEND_READINESS_INVALID",
          "API_SERVICE_PRODUCTION_BLOCKED",
        ]),
        profileId: "production-required",
        readiness: {
          deployableBoundaryReady: false,
          liveConnectionAttempted: false,
          liveSideEffectsEnabled: false,
          productionReady: false,
        },
        status: "blocked",
        valid: false,
      });
      expect(payload).toMatchObject({
        ok: true,
        data: {
          serverRuntime: expect.objectContaining({
            profileId: "production-required",
            readiness: expect.objectContaining({
              backend: expect.objectContaining({
                valid: false,
              }),
              database: expect.objectContaining({
                adapterStatus: "blocked",
                migrationPlanStatus: "blocked",
                valid: false,
              }),
            }),
            status: "blocked",
          }),
        },
      });

      const serialized = JSON.stringify(payload).toLowerCase();
      expect(serialized).not.toContain("bearer sample-bearer-token");
      expect(serialized).not.toContain("real-db-password");
      expect(serialized).not.toContain("private-key-sample");
      expect(serialized).not.toContain("object-key-sample");
      expect(serialized).not.toContain("raw-signature-sample");
      const serializedServiceContract = JSON.stringify(server.serviceContract).toLowerCase();
      expect(serializedServiceContract).not.toContain("bearer sample-bearer-token");
      expect(serializedServiceContract).not.toContain("real-db-password");
      expect(serializedServiceContract).not.toContain("private-key-sample");
      expect(serializedServiceContract).not.toContain("object-key-sample");
      expect(serializedServiceContract).not.toContain("raw-signature-sample");
    } finally {
      await server.stop();
    }
  });
});
