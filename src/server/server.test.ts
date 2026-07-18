import { createHash } from "node:crypto";
import { createServer as createHttpServer } from "node:http";
import { connect } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { NormalizedWalletSession } from "../domain/types";
import {
  createDeprecatedNonLivePreviewAuthorityOption,
  type ApiRuntimeResponse,
  type CampaignOsApiRuntime,
  type CreateCampaignOsApiRuntimeOptions,
} from "./apiRuntime";
import { createFailureEnvelope, createSuccessEnvelope } from "./envelope";
import { internalRuntimeError } from "./errors";
import { apiRuntimeContractRoutes } from "./routes";
import {
  startCampaignOsApiServer,
  type WalletAuthenticationLiveAuthorityRuntime,
  type WalletAuthenticationServerCompositionFactory,
} from "./server";

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

const sha256 = (value: string) =>
  createHash("sha256").update(value, "utf8").digest("hex");

const stageWalletAuthenticationEnv = (
  origin: string,
  overrides: Readonly<Record<string, string | undefined>> = {},
) => ({
  CAMPAIGN_OS_CAMPAIGN_DB_MODE: "postgres",
  CAMPAIGN_OS_DATABASE_URL: "postgresql://127.0.0.1:5432/campaign_os",
  CAMPAIGN_OS_WALLET_AUTH_ALLOWED_ORIGINS: origin,
  CAMPAIGN_OS_WALLET_AUTH_ALLOW_INSECURE_LOOPBACK_COOKIE: "1",
  CAMPAIGN_OS_WALLET_AUTH_BINDINGS_JSON: JSON.stringify([{
    accountType: "EOA",
    adapterId: "portkey-discover-eoa",
    chainIds: ["AELF"],
    enabled: true,
    hashStrategyId: "aelf-web-login-discover-v1",
    network: "testnet",
    productionApproved: false,
    proofMethod: "AELF_EOA_RECOVERABLE",
    signatureEncoding: "AELF_RECOVERABLE_HEX",
    walletSource: "PORTKEY_EOA_APP",
  }]),
  CAMPAIGN_OS_WALLET_AUTH_CSRF_SECRET: "s".repeat(32),
  CAMPAIGN_OS_WALLET_AUTH_ENABLED: "1",
  CAMPAIGN_OS_WALLET_AUTH_ENVIRONMENT: "stage",
  ...overrides,
});

const startServerWithRuntimeResponse = async (
  runtimeResponse: ApiRuntimeResponse,
  allowedCorsOrigins?: string[],
) => {
  const runtime: CampaignOsApiRuntime = {
    close: vi.fn(async () => undefined),
    handle: vi.fn(async () => runtimeResponse),
  };
  const server = await startCampaignOsApiServer({
    allowedCorsOrigins,
    logger: false,
    port: 0,
    runtimeFactory: () => runtime,
  });

  return { runtime, server };
};

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
            routeCount: apiRuntimeContractRoutes.length,
            routeIds: apiRuntimeContractRoutes.map((route) => route.id),
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

  it("passes explicit verification and wallet-auth transport dependencies to runtime composition", async () => {
    const env = {
      CAMPAIGN_OS_PROVIDER_HTTP_TRANSPORT_SEAM: "config-ref:metadata-only-seam",
      CAMPAIGN_OS_TASK_VERIFICATION_ENABLEMENT: "disabled",
    };
    const walletAuthenticationHttpController = {
      handle: vi.fn(async () => undefined),
    };
    const stopWalletAuthenticationRuntime = vi.fn(async () => ({
      diagnosticCodes: [],
      diagnostics: [],
      status: "drained" as const,
    }));
    const walletAuthenticationRuntime = {
      resolveAuthorization: vi.fn(),
      revalidateFenceBeforeWrite: vi.fn(),
      state: vi.fn(() => ({
        accepting: true,
        activeOperationCount: 0,
        controllerCount: 0,
      })),
      stop: stopWalletAuthenticationRuntime,
    } as unknown as WalletAuthenticationLiveAuthorityRuntime;
    const deprecatedNonLivePreviewAuthority = createDeprecatedNonLivePreviewAuthorityOption();
    let runtimeOptions: (CreateCampaignOsApiRuntimeOptions & {
      walletAuthenticationRuntime?: typeof walletAuthenticationRuntime;
    }) | undefined;
    const runtime: CampaignOsApiRuntime = {
      close: vi.fn(async () => undefined),
      handle: vi.fn(async () => ({
        body: createSuccessEnvelope({
          data: { status: "ok" },
          routeCount: apiRuntimeContractRoutes.length,
          traceId: "trace-server-task-verification-options",
          version: "test",
        }),
        headers: { "content-type": "application/json" },
        status: 200,
      })),
    };
    const server = await startCampaignOsApiServer({
      env,
      deprecatedNonLivePreviewAuthority,
      logger: false,
      port: 0,
      profileId: "staging-scaffold",
      walletAuthenticationAllowedOrigins: ["https://wallet.campaign-os.test"],
      walletAuthenticationHttpController,
      walletAuthenticationRuntime,
      runtimeFactory: (options) => {
        runtimeOptions = options;
        return runtime;
      },
    });

    try {
      expect(runtimeOptions?.taskVerificationConfigOptions).toEqual({
        env,
        environment: "stage",
        providerHttpTransportProvided: false,
      });
      expect(runtimeOptions?.backendServiceReadiness?.().providerClientReadiness.providerHttpRuntime)
        .toMatchObject({ transportProvided: false });
      expect(runtimeOptions?.walletAuthenticationHttpController)
        .toBe(walletAuthenticationHttpController);
      expect(runtimeOptions?.walletAuthenticationRuntime)
        .toBe(walletAuthenticationRuntime);
      expect(runtimeOptions?.deprecatedNonLivePreviewAuthority).toBeUndefined();
    } finally {
      await server.stop();
    }

    expect(stopWalletAuthenticationRuntime).not.toHaveBeenCalled();
  });

  it("keeps disabled wallet auth in preview mode without exposing live auth preflight", async () => {
    const compositionFactory = vi.fn<WalletAuthenticationServerCompositionFactory>();
    const deprecatedNonLivePreviewAuthority = createDeprecatedNonLivePreviewAuthorityOption();
    let runtimeOptions: CreateCampaignOsApiRuntimeOptions | undefined;
    const runtime: CampaignOsApiRuntime = {
      close: vi.fn(async () => undefined),
      handle: vi.fn(async () => ({
        body: createSuccessEnvelope({
          data: { status: "ok" },
          routeCount: apiRuntimeContractRoutes.length,
          traceId: "trace-preview-runtime",
          version: "test",
        }),
        headers: { "content-type": "application/json" },
        status: 200,
      })),
    };
    const server = await startCampaignOsApiServer({
      deprecatedNonLivePreviewAuthority,
      env: {},
      logger: false,
      port: 0,
      runtimeFactory: (options) => {
        runtimeOptions = options;
        return runtime;
      },
      walletAuthenticationCompositionFactory: compositionFactory,
    });

    try {
      const preflight = await fetch(`${server.url}/api/wallet/auth/challenges`, {
        headers: {
          "access-control-request-headers": "content-type,x-campaign-os-trace-id",
          "access-control-request-method": "POST",
          origin: "http://127.0.0.1:5173",
        },
        method: "OPTIONS",
      });
      const health = await fetch(`${server.url}/api/health`);

      expect(preflight.status).toBe(404);
      expect(preflight.headers.get("access-control-allow-origin")).toBeNull();
      expect(health.status).toBe(200);
      expect(runtime.handle).toHaveBeenCalledTimes(1);
      expect(compositionFactory).not.toHaveBeenCalled();
      expect(runtimeOptions?.walletAuthenticationHttpController).toBeUndefined();
      expect(runtimeOptions?.walletAuthenticationRuntime).toBeUndefined();
      expect(runtimeOptions?.deprecatedNonLivePreviewAuthority)
        .toBe(deprecatedNonLivePreviewAuthority);
    } finally {
      await server.stop();
    }
  });

  it("uses the default wallet-auth composition when no full factory is provided", async () => {
    const origin = "http://127.0.0.1:5193";
    const client = {
      query: vi.fn(async () => ({ rows: [] })),
      release: vi.fn(),
    };
    const pool = {
      connect: vi.fn(async () => client),
      end: vi.fn(async () => undefined),
      query: vi.fn(async () => ({ rows: [] })),
    };
    const poolFactory = vi.fn(() => pool);
    let runtimeOptions: CreateCampaignOsApiRuntimeOptions | undefined;
    const runtime: CampaignOsApiRuntime = {
      close: vi.fn(async () => undefined),
      handle: vi.fn(async () => ({
        body: createSuccessEnvelope({
          data: { status: "ok" },
          routeCount: apiRuntimeContractRoutes.length,
          traceId: "trace-default-composition-runtime",
          version: "test",
        }),
        headers: { "content-type": "application/json" },
        status: 200,
      })),
    };
    const server = await startCampaignOsApiServer({
      env: stageWalletAuthenticationEnv(origin),
      logger: false,
      port: 0,
      runtimeFactory: (options) => {
        runtimeOptions = options;
        return runtime;
      },
      walletAuthenticationCompositionDependencies: { poolFactory },
    });

    expect(poolFactory).toHaveBeenCalledWith(
      "postgresql://127.0.0.1:5432/campaign_os",
    );
    expect(runtimeOptions?.walletAuthenticationHttpController).toEqual(expect.objectContaining({
      handle: expect.any(Function),
    }));
    expect(runtimeOptions?.walletAuthenticationRuntime).toEqual(expect.objectContaining({
      resolveAuthorization: expect.any(Function),
      revalidateFenceBeforeWrite: expect.any(Function),
      stop: expect.any(Function),
    }));
    expect(runtimeOptions?.walletAuthenticationRuntimeOwnership).toBe("external");

    await server.stop();

    expect(pool.end).toHaveBeenCalledTimes(1);
    expect(runtime.close).toHaveBeenCalledTimes(1);
  });

  it("keeps public reads available while ready live auth without composition dependencies denies all", async () => {
    const origin = "http://127.0.0.1:5193";
    const compositionFactory = vi.fn<WalletAuthenticationServerCompositionFactory>(async () => {
      throw new Error("memory composition must not start");
    });
    const server = await startCampaignOsApiServer({
      env: stageWalletAuthenticationEnv(origin, {
        CAMPAIGN_OS_CAMPAIGN_DB_MODE: "local",
        CAMPAIGN_OS_DATABASE_URL: undefined,
      }),
      logger: false,
      port: 0,
      walletAuthenticationCompositionFactory: compositionFactory,
    });

    try {
      const challenge = await fetch(`${server.url}/api/wallet/auth/challenges`, {
        body: JSON.stringify({
          adapterId: "portkey-discover-eoa",
          chainId: "AELF",
          network: "testnet",
          walletAddress: "wallet-stage-participant",
        }),
        headers: {
          "content-type": "application/json",
          origin,
          "x-campaign-os-trace-id": "trace-missing-composition-challenge",
        },
        method: "POST",
      });
      const challengeBody = await challenge.json() as {
        error?: { code?: string };
        ok?: boolean;
      };
      const verify = await fetch(`${server.url}/api/tasks/task-missing-composition/verify`, {
        body: JSON.stringify({ campaignId: "campaign-missing-composition" }),
        headers: {
          "content-type": "application/json",
          cookie: `campaign_os_session=${"a".repeat(43)}`,
          origin,
          "x-campaign-os-csrf": "c".repeat(43),
          "x-campaign-os-trace-id": "trace-missing-composition-verify",
        },
        method: "POST",
      });
      const verifyBody = await verify.json() as {
        error?: { code?: string };
        ok?: boolean;
      };
      const health = await fetch(`${server.url}/api/health`);

      expect(challenge.status).toBe(503);
      expect(challengeBody).toMatchObject({
        error: { code: "AUTH_DEPENDENCY_UNAVAILABLE" },
        ok: false,
      });
      expect(verify.status).toBe(503);
      expect(verifyBody).toMatchObject({
        error: { code: "PERSISTENCE_UNAVAILABLE" },
        ok: false,
      });
      expect(health.status).toBe(200);
      expect(compositionFactory).not.toHaveBeenCalled();
    } finally {
      await server.stop();
    }
  });

  it("owns a factory-composed live runtime exactly once and stops auth before API resources", async () => {
    const origin = "http://127.0.0.1:5193";
    const closeOrder: string[] = [];
    const stopWalletAuthenticationRuntime = vi.fn(async () => {
      closeOrder.push("wallet.stop");
      return {
        diagnosticCodes: [],
        diagnostics: [],
        status: "drained" as const,
      };
    });
    const walletAuthenticationRuntime = {
      resolveAuthorization: vi.fn(),
      revalidateFenceBeforeWrite: vi.fn(),
      state: vi.fn(() => ({
        accepting: true,
        activeOperationCount: 0,
        controllerCount: 0,
      })),
      stop: stopWalletAuthenticationRuntime,
    } as unknown as WalletAuthenticationLiveAuthorityRuntime;
    const walletAuthenticationHttpController = {
      handle: vi.fn(async () => undefined),
    };
    const compositionFactory = vi.fn<WalletAuthenticationServerCompositionFactory>(async () => ({
      httpController: walletAuthenticationHttpController,
      runtime: walletAuthenticationRuntime,
    }));
    let runtimeOptions: CreateCampaignOsApiRuntimeOptions | undefined;
    const runtime: CampaignOsApiRuntime = {
      close: vi.fn(async () => {
        closeOrder.push("api.close");
      }),
      handle: vi.fn(async () => ({
        body: createSuccessEnvelope({
          data: { status: "ok" },
          routeCount: apiRuntimeContractRoutes.length,
          traceId: "trace-owned-composition",
          version: "test",
        }),
        headers: { "content-type": "application/json" },
        status: 200,
      })),
    };
    const server = await startCampaignOsApiServer({
      env: stageWalletAuthenticationEnv(origin),
      logger: false,
      port: 0,
      runtimeFactory: (options) => {
        runtimeOptions = options;
        return runtime;
      },
      walletAuthenticationCompositionFactory: compositionFactory,
    });

    expect(compositionFactory).toHaveBeenCalledWith(expect.objectContaining({
      config: expect.objectContaining({
        allowedOrigins: [origin],
        environment: "stage",
        status: "ready",
      }),
      env: expect.objectContaining({
        CAMPAIGN_OS_WALLET_AUTH_ENABLED: "1",
      }),
      traceId: expect.any(String),
    }));
    const factoryConfig = compositionFactory.mock.calls[0]?.[0].config;
    expect(factoryConfig?.bindings[0]?.productionApproved).toBe(false);
    expect(runtimeOptions?.walletAuthenticationHttpController)
      .toBe(walletAuthenticationHttpController);
    expect(runtimeOptions?.walletAuthenticationRuntime).toBe(walletAuthenticationRuntime);
    expect(runtimeOptions?.walletAuthenticationRuntimeOwnership).toBe("external");

    await server.stop();

    expect(stopWalletAuthenticationRuntime).toHaveBeenCalledTimes(1);
    expect(runtime.close).toHaveBeenCalledTimes(1);
    expect(closeOrder).toEqual(["wallet.stop", "api.close"]);
  });

  it("does not start API runtime close while the owned auth drain is pending", async () => {
    const origin = "http://127.0.0.1:5193";
    let releaseAuthStop!: () => void;
    const authStopPending = new Promise<void>((resolve) => {
      releaseAuthStop = resolve;
    });
    const stopWalletAuthenticationRuntime = vi.fn(async () => {
      await authStopPending;
      return {
        diagnosticCodes: [],
        diagnostics: [],
        status: "drained" as const,
      };
    });
    const walletAuthenticationRuntime = {
      resolveAuthorization: vi.fn(),
      revalidateFenceBeforeWrite: vi.fn(),
      state: vi.fn(() => ({
        accepting: true,
        activeOperationCount: 0,
        controllerCount: 0,
      })),
      stop: stopWalletAuthenticationRuntime,
    } as unknown as WalletAuthenticationLiveAuthorityRuntime;
    const compositionFactory = vi.fn<WalletAuthenticationServerCompositionFactory>(async () => ({
      httpController: { handle: vi.fn(async () => undefined) },
      runtime: walletAuthenticationRuntime,
    }));
    const runtime: CampaignOsApiRuntime = {
      close: vi.fn(async () => undefined),
      handle: vi.fn(),
    };
    const server = await startCampaignOsApiServer({
      env: stageWalletAuthenticationEnv(origin),
      logger: false,
      port: 0,
      runtimeFactory: () => runtime,
      shutdownTimeoutMs: 2_000,
      walletAuthenticationCompositionFactory: compositionFactory,
    });

    const stopPromise = server.stop();
    await Promise.resolve();
    await Promise.resolve();

    expect(stopWalletAuthenticationRuntime).toHaveBeenCalledTimes(1);
    expect(runtime.close).not.toHaveBeenCalled();

    releaseAuthStop();
    await stopPromise;

    expect(runtime.close).toHaveBeenCalledTimes(1);
  });

  it("still closes API resources after an owned auth drain failure", async () => {
    const origin = "http://127.0.0.1:5193";
    const walletAuthenticationRuntime = {
      resolveAuthorization: vi.fn(),
      revalidateFenceBeforeWrite: vi.fn(),
      state: vi.fn(() => ({
        accepting: true,
        activeOperationCount: 0,
        controllerCount: 0,
      })),
      stop: vi.fn(async () => ({
        diagnosticCodes: ["WALLET_AUTH_RUNTIME_CLEANUP_FAILED"],
        diagnostics: [],
        status: "cleanup_failed" as const,
      })),
    } as unknown as WalletAuthenticationLiveAuthorityRuntime;
    const compositionFactory = vi.fn<WalletAuthenticationServerCompositionFactory>(async () => ({
      httpController: { handle: vi.fn(async () => undefined) },
      runtime: walletAuthenticationRuntime,
    }));
    const runtime: CampaignOsApiRuntime = {
      close: vi.fn(async () => undefined),
      handle: vi.fn(),
    };
    const server = await startCampaignOsApiServer({
      env: stageWalletAuthenticationEnv(origin),
      logger: false,
      port: 0,
      runtimeFactory: () => runtime,
      walletAuthenticationCompositionFactory: compositionFactory,
    });

    await expect(server.stop()).rejects.toMatchObject({
      code: "API_SERVER_RUNTIME_CLOSE_FAILED",
    });

    expect(walletAuthenticationRuntime.stop).toHaveBeenCalledTimes(1);
    expect(runtime.close).toHaveBeenCalledTimes(1);
  });

  it("rolls a factory runtime back when the returned composition cannot expose its controller", async () => {
    const origin = "http://127.0.0.1:5193";
    const stopWalletAuthenticationRuntime = vi.fn(async () => ({
      diagnosticCodes: [],
      diagnostics: [],
      status: "drained" as const,
    }));
    const walletAuthenticationRuntime = {
      resolveAuthorization: vi.fn(),
      revalidateFenceBeforeWrite: vi.fn(),
      state: vi.fn(() => ({
        accepting: true,
        activeOperationCount: 0,
        controllerCount: 0,
      })),
      stop: stopWalletAuthenticationRuntime,
    } as unknown as WalletAuthenticationLiveAuthorityRuntime;
    const invalidComposition = {
      get httpController(): never {
        throw new Error("synthetic controller getter failure");
      },
      runtime: walletAuthenticationRuntime,
    };
    const compositionFactory = vi.fn<WalletAuthenticationServerCompositionFactory>(
      async () => invalidComposition,
    );
    const server = await startCampaignOsApiServer({
      env: stageWalletAuthenticationEnv(origin),
      logger: false,
      port: 0,
      walletAuthenticationCompositionFactory: compositionFactory,
    });

    try {
      const challenge = await fetch(`${server.url}/api/wallet/auth/challenges`, {
        body: JSON.stringify({
          adapterId: "portkey-discover-eoa",
          chainId: "AELF",
          network: "testnet",
          walletAddress: "wallet-invalid-composition",
        }),
        headers: {
          "content-type": "application/json",
          origin,
          "x-campaign-os-trace-id": "trace-invalid-composition",
        },
        method: "POST",
      });

      expect(challenge.status).toBe(503);
      expect(stopWalletAuthenticationRuntime).toHaveBeenCalledTimes(1);
    } finally {
      await server.stop();
    }

    expect(stopWalletAuthenticationRuntime).toHaveBeenCalledTimes(1);
  });

  it("rolls a server-owned live composition back when API runtime construction fails", async () => {
    const origin = "http://127.0.0.1:5193";
    const stopWalletAuthenticationRuntime = vi.fn(async () => ({
      diagnosticCodes: [],
      diagnostics: [],
      status: "drained" as const,
    }));
    const walletAuthenticationRuntime = {
      resolveAuthorization: vi.fn(),
      revalidateFenceBeforeWrite: vi.fn(),
      state: vi.fn(() => ({
        accepting: true,
        activeOperationCount: 0,
        controllerCount: 0,
      })),
      stop: stopWalletAuthenticationRuntime,
    } as unknown as WalletAuthenticationLiveAuthorityRuntime;
    const compositionFactory = vi.fn<WalletAuthenticationServerCompositionFactory>(async () => ({
      httpController: { handle: vi.fn(async () => undefined) },
      runtime: walletAuthenticationRuntime,
    }));

    await expect(startCampaignOsApiServer({
      env: stageWalletAuthenticationEnv(origin),
      logger: false,
      port: 0,
      runtimeFactory: () => {
        throw new Error("synthetic API runtime construction failure");
      },
      walletAuthenticationCompositionFactory: compositionFactory,
    })).rejects.toThrow("synthetic API runtime construction failure");

    expect(stopWalletAuthenticationRuntime).toHaveBeenCalledTimes(1);
  });

  it("rolls the owned runtime graph back when HTTP listen fails", async () => {
    const origin = "http://127.0.0.1:5193";
    const closeOrder: string[] = [];
    const occupiedServer = createHttpServer();
    await new Promise<void>((resolve, reject) => {
      occupiedServer.once("error", reject);
      occupiedServer.listen(0, "127.0.0.1", () => {
        occupiedServer.off("error", reject);
        resolve();
      });
    });
    const occupiedAddress = occupiedServer.address();
    if (!occupiedAddress || typeof occupiedAddress === "string") {
      occupiedServer.close();
      throw new Error("Expected an occupied TCP port for the listen rollback test.");
    }
    const stopWalletAuthenticationRuntime = vi.fn(async () => {
      closeOrder.push("wallet.stop");
      return {
        diagnosticCodes: [],
        diagnostics: [],
        status: "drained" as const,
      };
    });
    const walletAuthenticationRuntime = {
      resolveAuthorization: vi.fn(),
      revalidateFenceBeforeWrite: vi.fn(),
      state: vi.fn(() => ({
        accepting: true,
        activeOperationCount: 0,
        controllerCount: 0,
      })),
      stop: stopWalletAuthenticationRuntime,
    } as unknown as WalletAuthenticationLiveAuthorityRuntime;
    const compositionFactory = vi.fn<WalletAuthenticationServerCompositionFactory>(async () => ({
      httpController: { handle: vi.fn(async () => undefined) },
      runtime: walletAuthenticationRuntime,
    }));
    const runtime: CampaignOsApiRuntime = {
      close: vi.fn(async () => {
        closeOrder.push("api.close");
      }),
      handle: vi.fn(),
    };

    try {
      await expect(startCampaignOsApiServer({
        env: stageWalletAuthenticationEnv(origin),
        host: "127.0.0.1",
        logger: false,
        port: occupiedAddress.port,
        runtimeFactory: () => runtime,
        walletAuthenticationCompositionFactory: compositionFactory,
      })).rejects.toMatchObject({ code: "EADDRINUSE" });
    } finally {
      await new Promise<void>((resolve, reject) => {
        occupiedServer.close((error) => error ? reject(error) : resolve());
      });
    }

    expect(stopWalletAuthenticationRuntime).toHaveBeenCalledTimes(1);
    expect(runtime.close).toHaveBeenCalledTimes(1);
    expect(closeOrder).toEqual(["wallet.stop", "api.close"]);
  });

  it("uses only explicit exact wallet-auth origins for credentialed task verification", async () => {
    const trustedOrigin = "https://wallet.campaign-os.test";
    const runtime: CampaignOsApiRuntime = {
      close: vi.fn(async () => undefined),
      handle: vi.fn(async () => ({
        body: {
          data: { status: "verified" },
          ok: true as const,
          traceId: "trace-wallet-auth-runtime",
        },
        headers: { "content-type": "application/json; charset=utf-8" },
        status: 200,
      })),
    };
    const server = await startCampaignOsApiServer({
      allowedCorsOrigins: ["*"],
      logger: false,
      port: 0,
      runtimeFactory: () => runtime,
      walletAuthenticationAllowedOrigins: [trustedOrigin, "*"],
    });
    const verify = (origin: string, traceId: string) => fetch(
      `${server.url}/api/tasks/task-wallet-auth-1/verify`,
      {
        body: JSON.stringify({ campaignId: "campaign-wallet-auth-1" }),
        headers: {
          "content-type": "application/json",
          cookie: `campaign_os_session=${"a".repeat(43)}`,
          origin,
          "x-campaign-os-csrf": "c".repeat(43),
          "x-campaign-os-trace-id": traceId,
        },
        method: "POST",
      },
    );

    try {
      const accepted = await verify(trustedOrigin, "trace-wallet-auth-accepted");

      expect(accepted.status).toBe(200);
      expect(accepted.headers.get("access-control-allow-origin")).toBe(trustedOrigin);
      expect(accepted.headers.get("access-control-allow-credentials")).toBe("true");
      expect(accepted.headers.get("access-control-allow-origin")).not.toBe("*");

      for (const [origin, traceId] of [
        ["https://unknown.invalid", "trace-wallet-auth-unknown"],
        ["*", "trace-wallet-auth-wildcard"],
      ] as const) {
        const rejected = await verify(origin, traceId);

        expect(rejected.status).toBe(403);
        expect(rejected.headers.get("access-control-allow-origin")).toBeNull();
        expect(rejected.headers.get("access-control-allow-credentials")).toBeNull();
      }

      expect(runtime.handle).toHaveBeenCalledTimes(1);
    } finally {
      await server.stop();
    }
  });

  it("rejects duplicate raw protected headers before runtime dispatch", async () => {
    const trustedOrigin = "https://wallet-duplicate-header.campaign-os.test";
    const runtime: CampaignOsApiRuntime = {
      close: vi.fn(async () => undefined),
      handle: vi.fn(async () => ({
        body: {
          data: { status: "verified" },
          ok: true as const,
          traceId: "trace-duplicate-header-runtime",
        },
        headers: { "content-type": "application/json; charset=utf-8" },
        status: 200,
      })),
    };
    const server = await startCampaignOsApiServer({
      allowedCorsOrigins: [trustedOrigin],
      logger: false,
      port: 0,
      runtimeFactory: () => runtime,
    });
    const body = JSON.stringify({ campaignId: "campaign-duplicate-header" });
    const address = server.server.address();

    if (!address || typeof address === "string") {
      throw new Error("Expected the API server to expose a TCP address.");
    }

    try {
      const rawResponse = await new Promise<string>((resolve, reject) => {
        const socket = connect({ host: "127.0.0.1", port: address.port });
        socket.setEncoding("utf8");
        let response = "";

        socket.on("data", (chunk) => {
          response += chunk;
        });
        socket.once("error", reject);
        socket.once("end", () => resolve(response));
        socket.once("connect", () => {
          socket.end([
            "POST /api/tasks/task-duplicate-header/verify HTTP/1.1",
            `Host: 127.0.0.1:${address.port}`,
            `Origin: ${trustedOrigin}`,
            "Content-Type: application/json",
            `Cookie: campaign_os_session=${"a".repeat(43)}`,
            `X-Campaign-OS-CSRF: ${"c".repeat(43)}`,
            `x-campaign-os-csrf: ${"d".repeat(43)}`,
            `Content-Length: ${Buffer.byteLength(body, "utf8")}`,
            "Connection: close",
            "",
            body,
          ].join("\r\n"));
        });
      });

      expect(rawResponse.split("\r\n", 1)[0]).toBe("HTTP/1.1 400 Bad Request");
      expect(runtime.handle).not.toHaveBeenCalled();
    } finally {
      await server.stop();
    }
  });

  it("keeps server CORS origins as the credentialed-route fallback", async () => {
    const trustedOrigin = "https://wallet-fallback.campaign-os.test";
    const runtime: CampaignOsApiRuntime = {
      close: vi.fn(async () => undefined),
      handle: vi.fn(async () => ({
        body: {
          data: { status: "verified" },
          ok: true as const,
          traceId: "trace-fallback-runtime",
        },
        headers: { "content-type": "application/json; charset=utf-8" },
        status: 200,
      })),
    };
    const server = await startCampaignOsApiServer({
      allowedCorsOrigins: [trustedOrigin],
      logger: false,
      port: 0,
      runtimeFactory: () => runtime,
    });

    try {
      const response = await fetch(`${server.url}/api/tasks/task-wallet-auth-fallback/verify`, {
        body: JSON.stringify({ campaignId: "campaign-wallet-auth-fallback" }),
        headers: {
          "content-type": "application/json",
          cookie: `campaign_os_session=${"a".repeat(43)}`,
          origin: trustedOrigin,
          "x-campaign-os-csrf": "c".repeat(43),
        },
        method: "POST",
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("access-control-allow-origin")).toBe(trustedOrigin);
      expect(response.headers.get("access-control-allow-credentials")).toBe("true");
    } finally {
      await server.stop();
    }
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

  it("preserves the Admin request context while rejecting pipelined work during shutdown", async () => {
    const trustedOrigin = "https://admin.campaign-os.test";
    let enterRuntime!: () => void;
    let releaseRuntime!: (response: ApiRuntimeResponse) => void;
    const enteredRuntime = new Promise<void>((resolve) => {
      enterRuntime = resolve;
    });
    const heldResponse = new Promise<ApiRuntimeResponse>((resolve) => {
      releaseRuntime = resolve;
    });
    const runtime: CampaignOsApiRuntime = {
      close: vi.fn(async () => undefined),
      handle: vi.fn(async () => {
        enterRuntime();
        return heldResponse;
      }),
    };
    const server = await startCampaignOsApiServer({
      allowedCorsOrigins: [trustedOrigin],
      logger: false,
      port: 0,
      runtimeFactory: () => runtime,
      shutdownTimeoutMs: 2_000,
    });
    const address = server.server.address();

    if (!address || typeof address === "string") {
      throw new Error("Expected the API server to expose a TCP address.");
    }

    const socket = connect({ host: "127.0.0.1", port: address.port });
    socket.setEncoding("utf8");
    let rawResponses = "";
    socket.on("data", (chunk) => {
      rawResponses += chunk;
    });
    const socketEnded = new Promise<void>((resolve, reject) => {
      socket.once("end", resolve);
      socket.once("error", reject);
    });

    await new Promise<void>((resolve) => socket.once("connect", resolve));
    socket.write([
      "GET /api/admin/campaigns HTTP/1.1",
      `Host: 127.0.0.1:${address.port}`,
      `Origin: ${trustedOrigin}`,
      "X-Campaign-OS-Trace-ID: trace-admin-active-request",
      "Connection: keep-alive",
      "",
      "",
    ].join("\r\n"));
    await enteredRuntime;

    const stopPromise = server.stop();
    expect(runtime.close).toHaveBeenCalledTimes(1);
    socket.write([
      "GET /api/admin/campaigns HTTP/1.1",
      `Host: 127.0.0.1:${address.port}`,
      `Origin: ${trustedOrigin}`,
      "X-Campaign-OS-Trace-ID: trace-admin-shutdown-request",
      "Connection: close",
      "",
      "",
    ].join("\r\n"));
    releaseRuntime({
      body: {
        data: { status: "held-request-released" },
        ok: true,
        traceId: "trace-admin-active-request",
      },
      headers: {
        "content-type": "application/json; charset=utf-8",
        "x-campaign-os-trace-id": "trace-admin-active-request",
      },
      status: 200,
    });

    await Promise.all([stopPromise, socketEnded]);
    const responses = rawResponses.split("HTTP/1.1 ").slice(1);
    expect(responses).toHaveLength(2);
    const shutdownResponse = responses[1] ?? "";
    const [rawHeaders = "", chunkedBody = ""] = shutdownResponse.split("\r\n\r\n", 2);
    const chunkSizeEnd = chunkedBody.indexOf("\r\n");
    const chunkSize = Number.parseInt(chunkedBody.slice(0, chunkSizeEnd), 16);
    const rawBody = chunkedBody.slice(chunkSizeEnd + 2, chunkSizeEnd + 2 + chunkSize);
    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    const normalizedHeaders = rawHeaders.toLowerCase();

    expect(rawHeaders.split("\r\n")[0]).toBe("503 Service Unavailable");
    expect(normalizedHeaders).toContain(
      `access-control-allow-origin: ${trustedOrigin}`.toLowerCase(),
    );
    expect(normalizedHeaders).toContain(
      "x-campaign-os-trace-id: trace-admin-shutdown-request",
    );
    expect(payload).toEqual({
      error: {
        code: "PERSISTENCE_UNAVAILABLE",
        details: {
          operation: "server.shutdown",
        },
        message: expect.any(String),
      },
      ok: false,
      traceId: "trace-admin-shutdown-request",
    });
    expect(runtime.handle).toHaveBeenCalledTimes(1);
  });

  it("handles the complete Admin workflow CORS preflight without widening authority", async () => {
    const runtimeResponse = {
      body: createSuccessEnvelope({
        data: { status: "unexpected" },
        routeCount: apiRuntimeContractRoutes.length,
        timestamp: "2026-07-15T04:00:00.000Z",
        traceId: "trace-unexpected-runtime",
        version: "test",
      }),
      headers: { "content-type": "application/json; charset=utf-8" },
      status: 200,
    } satisfies ApiRuntimeResponse;
    const trustedOrigin = "https://admin.campaign-os.test";
    const { runtime, server } = await startServerWithRuntimeResponse(
      runtimeResponse,
      [trustedOrigin],
    );
    const decisionPath = "/api/admin/campaigns/campaign-transport/reviews/participant-1/decisions";

    try {
      const response = await fetch(`${server.url}${decisionPath}`, {
        headers: {
          "access-control-request-headers": [
            "content-type",
            "Idempotency-Key",
            "x-campaign-os-account-type",
            "x-campaign-os-credential-boundary",
            "x-campaign-os-proof-status",
            "x-campaign-os-roles",
            "x-campaign-os-session-id",
            "x-campaign-os-trace-id",
            "x-campaign-os-wallet-address",
            "x-campaign-os-wallet-source",
          ].join(", "),
          "access-control-request-method": "POST",
          origin: trustedOrigin,
          "x-campaign-os-trace-id": "trace-preflight",
        },
        method: "OPTIONS",
      });
      const allowedHeaders = response.headers
        .get("access-control-allow-headers")
        ?.split(",")
        .map((header) => header.trim().toLowerCase());

      expect(response.status).toBe(204);
      expect(response.headers.get("x-campaign-os-trace-id")).toBe("trace-preflight");
      expect(response.headers.get("access-control-allow-origin")).toBe(trustedOrigin);
      expect(response.headers.get("access-control-allow-methods")).toContain("POST");
      expect(allowedHeaders).toEqual(expect.arrayContaining([
        "content-type",
        "idempotency-key",
        "x-campaign-os-account-type",
        "x-campaign-os-credential-boundary",
        "x-campaign-os-proof-status",
        "x-campaign-os-roles",
        "x-campaign-os-session-id",
        "x-campaign-os-trace-id",
        "x-campaign-os-wallet-address",
        "x-campaign-os-wallet-source",
      ]));
      expect(allowedHeaders).not.toContain("*");
      expect(await response.text()).toBe("");
      expect(runtime.handle).not.toHaveBeenCalled();

      const denied = await fetch(`${server.url}${decisionPath}`, {
        headers: {
          "access-control-request-headers": "Idempotency-Key, x-campaign-os-roles",
          "access-control-request-method": "POST",
          origin: "https://untrusted.campaign-os.test",
          "x-campaign-os-trace-id": "trace-preflight-denied",
        },
        method: "OPTIONS",
      });

      expect(denied.status).toBe(400);
      expect(denied.headers.get("access-control-allow-origin"))
        .not.toBe("https://untrusted.campaign-os.test");
      expect(runtime.handle).not.toHaveBeenCalled();
    } finally {
      await server.stop();
    }
  });

  it.each([
    {
      body: "{\"decision\":",
      contentType: "application/json",
      expectedCode: "MALFORMED_JSON",
      expectedDiagnosticCode: undefined,
      expectedField: undefined,
      expectedStatus: 400,
      name: "malformed JSON",
      traceId: "trace-admin-malformed-review",
    },
    {
      body: "plain",
      contentType: "text/plain",
      expectedCode: "INVALID_REQUEST",
      expectedDiagnosticCode: "INVALID_REQUEST",
      expectedField: "content-type",
      expectedStatus: 400,
      name: "unsupported content type",
      traceId: "trace-admin-content-type-review",
    },
    {
      body: JSON.stringify({ decision: "approved", note: "x".repeat(96) }),
      contentType: "application/json",
      expectedCode: "INVALID_REQUEST",
      expectedDiagnosticCode: "REQUEST_TOO_LARGE",
      expectedField: "body",
      expectedStatus: 413,
      name: "body limit",
      traceId: "trace-admin-body-limit-review",
    },
  ])("returns the strict Admin envelope for pre-runtime $name rejection", async ({
    body,
    contentType,
    expectedCode,
    expectedDiagnosticCode,
    expectedField,
    expectedStatus,
    traceId,
  }) => {
    const runtimeResponse = {
      body: createSuccessEnvelope({
        data: { status: "unexpected" },
        routeCount: apiRuntimeContractRoutes.length,
        timestamp: "2026-07-15T04:00:00.000Z",
        traceId: "trace-unexpected-runtime",
        version: "test",
      }),
      headers: { "content-type": "application/json; charset=utf-8" },
      status: 200,
    } satisfies ApiRuntimeResponse;
    const trustedOrigin = "https://admin.campaign-os.test";
    const runtime: CampaignOsApiRuntime = {
      close: vi.fn(async () => undefined),
      handle: vi.fn(async () => runtimeResponse),
    };
    const server = await startCampaignOsApiServer({
      allowedCorsOrigins: [trustedOrigin],
      logger: false,
      maxBodyBytes: 48,
      port: 0,
      runtimeFactory: () => runtime,
    });
    const path = "/api/admin/campaigns/campaign-a/reviews/participant-a/decisions";

    try {
      const response = await fetch(`${server.url}${path}`, {
        body,
        headers: {
          "content-type": contentType,
          origin: trustedOrigin,
          "x-campaign-os-trace-id": traceId,
        },
        method: "POST",
      });
      const payload = await response.json() as Record<string, unknown>;
      const error = payload.error as Record<string, unknown>;

      expect(response.status).toBe(expectedStatus);
      expect(response.headers.get("content-type")).toContain("application/json");
      expect(response.headers.get("x-campaign-os-trace-id")).toBe(traceId);
      expect(response.headers.get("access-control-allow-origin")).toBe(trustedOrigin);
      expect(Object.keys(payload).sort()).toEqual(["error", "ok", "traceId"]);
      expect(error).toEqual({
        code: expectedCode,
        ...(expectedField
          ? { details: { diagnosticCode: expectedDiagnosticCode, field: expectedField } }
          : {}),
        message: expect.any(String),
      });
      expect(typeof error.message).toBe("string");
      expect(runtime.handle).not.toHaveBeenCalled();

      const serialized = JSON.stringify(payload);
      for (const forbidden of [
        "local_seeded",
        "routeCount",
        "runtime",
        "safety",
        "seededDataOnly",
        "timestamp",
        "version",
      ]) {
        expect(serialized).not.toContain(forbidden);
      }
    } finally {
      await server.stop();
    }
  });

  it("preserves Admin Trace ID and trusted CORS when the runtime transport fails", async () => {
    const trustedOrigin = "https://admin.campaign-os.test";
    const runtime: CampaignOsApiRuntime = {
      close: vi.fn(async () => undefined),
      handle: vi.fn(async () => {
        throw new Error("Bearer secret-token postgres://user:password@db.invalid/private");
      }),
    };
    const server = await startCampaignOsApiServer({
      allowedCorsOrigins: [trustedOrigin],
      logger: false,
      port: 0,
      runtimeFactory: () => runtime,
    });

    try {
      const response = await fetch(`${server.url}/api/admin/campaigns`, {
        headers: {
          origin: trustedOrigin,
          "x-campaign-os-trace-id": "trace-admin-transport-failure",
        },
      });
      const payload = await response.json() as Record<string, unknown>;
      const error = payload.error as Record<string, unknown>;

      expect(response.status).toBe(500);
      expect(response.headers.get("access-control-allow-origin")).toBe(trustedOrigin);
      expect(response.headers.get("x-campaign-os-trace-id"))
        .toBe("trace-admin-transport-failure");
      expect(Object.keys(payload).sort()).toEqual(["error", "ok", "traceId"]);
      expect(Object.keys(error).sort()).toEqual(["code", "message"]);
      expect(payload).toEqual({
        error: {
          code: "INTERNAL_RUNTIME_ERROR",
          message: expect.any(String),
        },
        ok: false,
        traceId: "trace-admin-transport-failure",
      });
      const serialized = JSON.stringify(payload);
      expect(serialized).not.toMatch(/bearer|local_seeded|password|postgres:\/\/|seededDataOnly/i);
      expect(runtime.handle).toHaveBeenCalledTimes(1);
    } finally {
      await server.stop();
    }
  });

  it.each([
    {
      body: undefined,
      contentType: undefined,
      method: "DELETE",
      name: "unsupported method",
      path: "/api/health",
      status: 405,
    },
    {
      body: "{\"broken\":",
      contentType: "application/json",
      method: "POST",
      name: "malformed JSON",
      path: "/api/campaigns",
      status: 400,
    },
  ])("keeps legacy non-Admin headers for $name guard rejection", async ({
    body,
    contentType,
    method,
    path,
    status,
  }) => {
    const trustedOrigin = "https://admin.campaign-os.test";
    const runtime: CampaignOsApiRuntime = {
      close: vi.fn(async () => undefined),
      handle: vi.fn(),
    };
    const server = await startCampaignOsApiServer({
      allowedCorsOrigins: [trustedOrigin],
      logger: false,
      port: 0,
      runtimeFactory: () => runtime,
    });
    const traceId = `trace-legacy-${method.toLowerCase()}`;

    try {
      const response = await fetch(`${server.url}${path}`, {
        ...(body === undefined ? {} : { body }),
        headers: {
          ...(contentType === undefined ? {} : { "content-type": contentType }),
          origin: trustedOrigin,
          "x-campaign-os-trace-id": traceId,
        },
        method,
      });
      const payload = await response.json() as Record<string, unknown>;

      expect(response.status).toBe(status);
      expect(response.headers.get("content-type")).toContain("application/json");
      expect(response.headers.get("x-campaign-os-trace-id")).toBe(traceId);
      expect(response.headers.get("access-control-allow-origin")).toBeNull();
      expect(response.headers.get("access-control-allow-methods")).toBeNull();
      expect(response.headers.get("access-control-expose-headers")).toBeNull();
      expect(payload).toMatchObject({
        ok: false,
        runtime: expect.any(Object),
        safety: expect.any(Object),
        timestamp: expect.any(String),
        traceId,
      });
      expect(runtime.handle).not.toHaveBeenCalled();
    } finally {
      await server.stop();
    }
  });

  it.each([
    {
      content: "campaignId,participantId,note\r\ncampaign-transport,p-1,caf\u00e9\r\n",
      fileName: "campaign-transport-winners.csv",
      format: "csv",
      mimeType: "text/csv;charset=utf-8",
    },
    {
      content: "{\n  \"campaignId\": \"campaign-transport\",\n  \"rows\": [\n    {\"participantId\": \"p-1\", \"note\": \"caf\u00e9\"}\n  ]\n}\n",
      fileName: "campaign-transport-winners.json",
      format: "json",
      mimeType: "application/json;charset=utf-8",
    },
  ])("sends $format artifact bytes and validated download headers unchanged", async ({
    content,
    fileName,
    format,
    mimeType,
  }) => {
    const traceId = `trace-http-download-${format}`;
    const trustedOrigin = "https://admin.campaign-os.test";
    const expectedBytes = Buffer.from(content, "utf8");
    const runtimeResponse = {
      body: createSuccessEnvelope({
        data: {
          artifactId: `artifact-transport-${format}`,
          format,
        },
        routeCount: apiRuntimeContractRoutes.length,
        timestamp: "2026-07-15T04:00:00.000Z",
        traceId,
        version: "test",
      }),
      headers: {
        "content-disposition": `attachment; filename="${fileName}"`,
        "content-length": String(expectedBytes.byteLength),
        "content-type": mimeType,
        "x-campaign-os-content-sha256": sha256(content),
        "x-campaign-os-trace-id": traceId,
      },
      rawBody: content,
      status: 200,
    } satisfies ApiRuntimeResponse;
    const { runtime, server } = await startServerWithRuntimeResponse(runtimeResponse, [trustedOrigin]);
    const path = `/api/admin/campaigns/campaign-transport/artifacts/artifact-transport-${format}/download`;

    try {
      const response = await fetch(`${server.url}${path}`, {
        headers: { origin: trustedOrigin },
      });
      const actualBytes = Buffer.from(await response.arrayBuffer());
      const exposedHeaders = response.headers
        .get("access-control-expose-headers")
        ?.split(",")
        .map((header) => header.trim().toLowerCase());

      expect(response.status).toBe(200);
      expect(Buffer.compare(actualBytes, expectedBytes)).toBe(0);
      expect(response.headers.get("content-type")).toBe(mimeType);
      expect(response.headers.get("content-disposition"))
        .toBe(`attachment; filename="${fileName}"`);
      expect(response.headers.get("x-campaign-os-content-sha256")).toBe(sha256(content));
      expect(response.headers.get("content-length")).toBe(String(expectedBytes.byteLength));
      expect(response.headers.get("x-campaign-os-trace-id")).toBe(traceId);
      expect(response.headers.get("access-control-allow-origin")).toBe(trustedOrigin);
      expect(exposedHeaders).toEqual(expect.arrayContaining([
        "content-disposition",
        "x-campaign-os-content-sha256",
        "x-campaign-os-trace-id",
      ]));
      expect(exposedHeaders).not.toContain("*");
      expect(runtime.handle).toHaveBeenCalledWith(expect.objectContaining({
        method: "GET",
        path,
      }));
    } finally {
      await server.stop();
    }
  });

  it("does not emit a raw payload attached to a failed runtime response", async () => {
    const traceId = "trace-http-download-corrupt";
    const corruptPayload = "corrupt-export-payload-that-must-not-cross-http";
    const failureBody = createFailureEnvelope({
      error: internalRuntimeError().body,
      routeCount: apiRuntimeContractRoutes.length,
      timestamp: "2026-07-15T04:00:00.000Z",
      traceId,
      version: "test",
    });
    const runtimeResponse = {
      body: failureBody,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "x-campaign-os-trace-id": traceId,
      },
      rawBody: corruptPayload,
      status: 500,
    } satisfies ApiRuntimeResponse;
    const { server } = await startServerWithRuntimeResponse(runtimeResponse);

    try {
      const response = await fetch(
        `${server.url}/api/admin/campaigns/campaign-transport/artifacts/artifact-corrupt/download`,
      );
      const body = await response.text();

      expect(response.status).toBe(500);
      expect(response.headers.get("content-type")).toContain("application/json");
      expect(body).toBe(JSON.stringify(failureBody));
      expect(body).not.toContain(corruptPayload);
    } finally {
      await server.stop();
    }
  });

  it("continues to JSON serialize ordinary runtime responses", async () => {
    const traceId = "trace-http-json-regression";
    const responseBody = {
      data: {
        campaignId: "campaign-json-regression",
        status: "DRAFT",
      },
      ok: true,
      traceId,
    } as const;
    const runtimeResponse = {
      body: responseBody,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "x-campaign-os-trace-id": traceId,
      },
      status: 200,
    } satisfies ApiRuntimeResponse;
    const { server } = await startServerWithRuntimeResponse(runtimeResponse);

    try {
      const response = await fetch(`${server.url}/api/campaigns/campaign-json-regression`);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");
      expect(await response.text()).toBe(JSON.stringify(responseBody));
    } finally {
      await server.stop();
    }
  });

  it("allows Vite fallback dev origins for API-backed local review", async () => {
    const server = await startCampaignOsApiServer({ logger: false, port: 0 });

    try {
      const response = await fetch(`${server.url}/api/campaigns/camp-awaken-sprint/points-ranking-ledger-runtime`, {
        headers: {
          "access-control-request-headers": "x-campaign-os-trace-id",
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
          routeCount: apiRuntimeContractRoutes.length,
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

      expect(oversize.status).toBe(413);
      expect(oversize.headers.get("x-campaign-os-trace-id")).toBe("trace-oversize-http");
      expect(oversizePayload).toMatchObject({
        ok: false,
        runtime: expect.objectContaining({
          name: "campaign-os-api-runtime",
          routeCount: apiRuntimeContractRoutes.length,
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
          routeCount: apiRuntimeContractRoutes.length,
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

      const unsafeTraceId = "/Users/example/private?token=secret raw_signature";
      const unsafeTrace = await fetch(`${server.url}/api/campaigns`, {
        body: "{bad",
        headers: {
          "content-type": "application/json",
          "x-campaign-os-trace-id": unsafeTraceId,
        },
        method: "POST",
      });
      const unsafeTracePayload = await unsafeTrace.json();
      const normalizedTraceId = unsafeTrace.headers.get("x-campaign-os-trace-id");

      expect(unsafeTrace.status).toBe(400);
      expect(normalizedTraceId).toMatch(/^campaign-os-server-trace-/);
      expect(unsafeTracePayload.traceId).toBe(normalizedTraceId);
      expect(JSON.stringify(unsafeTracePayload)).not.toContain(unsafeTraceId);

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
            diagnosticCode: "DURABLE_WALLET_AUTHORITY_REQUIRED",
            field: "authorization",
          },
        },
      });
      expect(unissued.status).toBe(401);
      expect(unissued.headers.get("x-campaign-os-trace-id")).toBe("trace-auth-http-unissued");
      expect(unissuedPayload).toMatchObject({
        ok: false,
        traceId: "trace-auth-http-unissued",
        error: {
          code: "AUTH_SESSION_REQUIRED",
          details: {
            diagnosticCode: "DURABLE_WALLET_AUTHORITY_REQUIRED",
            field: "authorization",
          },
        },
      });
      expect(authorized.status).toBe(401);
      expect(authorized.headers.get("x-campaign-os-trace-id")).toBe("trace-auth-http-authorized");
      expect(authorizedPayload).toMatchObject({
        ok: false,
        traceId: "trace-auth-http-authorized",
        error: {
          code: "AUTH_SESSION_REQUIRED",
          details: {
            diagnosticCode: "DURABLE_WALLET_AUTHORITY_REQUIRED",
            field: "authorization",
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
