import { createServer as createHttpServer } from "node:http";
import { connect, type AddressInfo } from "node:net";
import { describe, expect, it, vi } from "vitest";
import type { ApiRuntimeResponse, CampaignOsApiRuntime } from "./apiRuntime";
import { createSuccessEnvelope } from "./envelope";
import { startCampaignOsApiServer } from "./server";
import {
  createServerStartupDiagnostics,
  formatServerStartupLog,
  resolveApiServerRuntimeContract,
} from "./serverRuntime";

const secretFragments = [
  "bearer sample-token",
  "mnemonic sample",
  "object-key-sample",
  "postgres://real-user:real-db-password@db.invalid/campaign-os",
  "private-key-sample",
  "raw-signature-sample",
  "seed phrase sample",
  "signed-url",
  "super-secret",
];

const expectNoSecretLeak = (value: unknown) => {
  const serialized = JSON.stringify(value).toLowerCase();

  for (const fragment of secretFragments) {
    expect(serialized).not.toContain(fragment);
  }
};

describe("API server runtime contract", () => {
  it("resolves deterministic local-review defaults", () => {
    const contract = resolveApiServerRuntimeContract({
      env: {},
      startedAt: "2026-07-06T18:00:00.000Z",
    });

    expect(contract).toMatchObject({
      host: "127.0.0.1",
      port: 5174,
      profileId: "local-review",
      runtimeVersion: "0.2.0-local",
      startedAt: "2026-07-06T18:00:00.000Z",
      supportMode: "local_seeded",
      valid: true,
    });
    expect(contract.requestGuard).toMatchObject({
      guardedFailureEnvelope: true,
      maxBodyBytes: 1_048_576,
      traceHeaderName: "x-campaign-os-trace-id",
    });
    expect(contract.corsPolicy).toMatchObject({
      enabled: true,
      exposedHeaders: [
        "content-disposition",
        "x-campaign-os-content-sha256",
        "x-campaign-os-trace-id",
      ],
      preflightHandledBeforeRuntime: true,
    });
    expect(contract.corsPolicy.allowedOrigins).toEqual(
      expect.arrayContaining([
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5177",
        "http://127.0.0.1:5177",
        "http://localhost:5184",
        "http://127.0.0.1:5184",
      ]),
    );
    expect(contract.shutdown.shutdownTimeoutMs).toBe(5_000);
    expect(contract.environmentKeys).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "CAMPAIGN_OS_API_HOST", redacted: true }),
        expect.objectContaining({ key: "CAMPAIGN_OS_DATABASE_URL", status: "blocked" }),
      ]),
    );
    expect(contract.attachMap.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        "framework-decision",
        "deployment-config",
        "production-database-driver",
        "auth-middleware",
        "worker-ingress",
        "observability-exporter",
      ]),
    );
  });

  it("lets explicit options override environment values", () => {
    const contract = resolveApiServerRuntimeContract({
      env: {
        CAMPAIGN_OS_API_HOST: "0.0.0.0",
        CAMPAIGN_OS_API_MAX_BODY_BYTES: "64",
        CAMPAIGN_OS_API_PORT: "6000",
        CAMPAIGN_OS_API_SHUTDOWN_TIMEOUT_MS: "9000",
        CAMPAIGN_OS_BACKEND_PROFILE: "production-required",
      },
      host: "127.0.0.2",
      maxBodyBytes: 2048,
      port: 0,
      profileId: "staging-scaffold",
      shutdownTimeoutMs: 1234,
      version: "0.2.0-test",
    });

    expect(contract).toMatchObject({
      host: "127.0.0.2",
      port: 0,
      profileId: "staging-scaffold",
      runtimeVersion: "0.2.0-test",
      valid: true,
    });
    expect(contract.requestGuard.maxBodyBytes).toBe(2048);
    expect(contract.shutdown.shutdownTimeoutMs).toBe(1234);
  });

  it("uses valid environment overrides", () => {
    const contract = resolveApiServerRuntimeContract({
      env: {
        CAMPAIGN_OS_API_CORS_ENABLED: "false",
        CAMPAIGN_OS_API_CORS_ORIGINS: "https://review.invalid, http://localhost:5173",
        CAMPAIGN_OS_API_HOST: "0.0.0.0",
        CAMPAIGN_OS_API_MAX_BODY_BYTES: "4096",
        CAMPAIGN_OS_API_PORT: "4188",
        CAMPAIGN_OS_API_SHUTDOWN_TIMEOUT_MS: "7000",
        CAMPAIGN_OS_API_VERSION: "0.2.1-runtime-test",
        CAMPAIGN_OS_BACKEND_PROFILE: "staging-scaffold",
      },
    });

    expect(contract).toMatchObject({
      host: "0.0.0.0",
      port: 4188,
      profileId: "staging-scaffold",
      runtimeVersion: "0.2.1-runtime-test",
      valid: true,
    });
    expect(contract.corsPolicy.enabled).toBe(false);
    expect(contract.corsPolicy.allowedOrigins).toEqual([
      "https://review.invalid",
      "http://localhost:5173",
    ]);
    expect(contract.corsPolicy.allowedHeaders).toEqual(expect.arrayContaining([
      "authorization",
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
    expect(contract.corsPolicy.allowedHeaders).not.toContain("*");
    expect(contract.corsPolicy.exposedHeaders).not.toContain("*");
    expect(contract.corsPolicy.allowedOrigins).not.toContain("*");
    expect(contract.requestGuard.maxBodyBytes).toBe(4096);
    expect(contract.shutdown.shutdownTimeoutMs).toBe(7000);
  });

  it("fails closed for invalid numeric configuration", () => {
    const contract = resolveApiServerRuntimeContract({
      env: {
        CAMPAIGN_OS_API_MAX_BODY_BYTES: "huge",
        CAMPAIGN_OS_API_PORT: "-1",
        CAMPAIGN_OS_API_SHUTDOWN_TIMEOUT_MS: "0",
      },
    });

    expect(contract.valid).toBe(false);
    expect(contract.port).toBe(5174);
    expect(contract.requestGuard.maxBodyBytes).toBe(1_048_576);
    expect(contract.shutdown.shutdownTimeoutMs).toBe(5_000);
    expect(contract.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "SERVER_RUNTIME_INVALID_PORT" }),
        expect.objectContaining({ code: "SERVER_RUNTIME_INVALID_BODY_LIMIT" }),
        expect.objectContaining({ code: "SERVER_RUNTIME_INVALID_SHUTDOWN_TIMEOUT" }),
      ]),
    );
  });

  it("represents production-required profile as blocked without live side effects", () => {
    const contract = resolveApiServerRuntimeContract({
      env: {
        CAMPAIGN_OS_AUTH_SECRET: "super-secret",
        CAMPAIGN_OS_BACKEND_PROFILE: "production-required",
        CAMPAIGN_OS_DATABASE_URL: "postgres://real-user:real-db-password@db.invalid/campaign-os",
      },
    });

    expect(contract.valid).toBe(false);
    expect(contract.profileId).toBe("production-required");
    expect(contract.profile.requiresSecrets).toBe(true);
    expect(contract.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "SERVER_RUNTIME_PRODUCTION_BLOCKED",
          severity: "error",
        }),
      ]),
    );
    expect(contract.attachMap).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "production-database-driver", status: "blocked" }),
        expect.objectContaining({ id: "auth-middleware", status: "blocked" }),
        expect.objectContaining({ id: "contract-writer", status: "blocked" }),
      ]),
    );
    expectNoSecretLeak(contract);
  });

  it("keeps startup diagnostics and logs secret-safe", () => {
    const contract = resolveApiServerRuntimeContract({
      env: {
        AUTHORIZATION: "Bearer sample-token",
        CAMPAIGN_OS_AUTH_SECRET: "super-secret",
        CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT: "https://writer.invalid/private-key-sample",
        CAMPAIGN_OS_DATABASE_URL: "postgres://real-user:real-db-password@db.invalid/campaign-os",
        CAMPAIGN_OS_PROVIDER_REGISTRY_URL: "https://providers.invalid/object-key-sample",
        CAMPAIGN_OS_WORKER_QUEUE_URL: "https://queue.invalid/raw-signature-sample",
      },
      startedAt: "2026-07-06T18:00:00.000Z",
    });
    const diagnostics = createServerStartupDiagnostics(contract);
    const log = formatServerStartupLog(contract);

    expect(diagnostics).toMatchObject({
      attachPointCount: expect.any(Number),
      corsEnabled: true,
      host: "127.0.0.1",
      port: 5174,
      profileId: "local-review",
      startedAt: "2026-07-06T18:00:00.000Z",
    });
    expect(log).toContain("[campaign-os-api-runtime] server-runtime");
    expect(log).toContain("no live operations");
    expectNoSecretLeak(diagnostics);
    expectNoSecretLeak(log);
  });
});

describe("API server resource shutdown", () => {
  const response = {
    body: createSuccessEnvelope({
      data: { status: "ok" },
      routeCount: 0,
      traceId: "trace-server-runtime-test",
      version: "test",
    }),
    headers: { "content-type": "application/json" },
    status: 200,
  } satisfies ApiRuntimeResponse;

  it("closes the runtime when HTTP listen fails", async () => {
    const blocker = createHttpServer();
    await new Promise<void>((resolve, reject) => {
      blocker.once("error", reject);
      blocker.listen(0, "127.0.0.1", () => {
        blocker.off("error", reject);
        resolve();
      });
    });
    const port = (blocker.address() as AddressInfo).port;
    const close = vi.fn(async () => undefined);
    const runtime: CampaignOsApiRuntime = {
      close,
      handle: async () => response,
    };

    try {
      await expect(startCampaignOsApiServer({
        logger: false,
        port,
        runtimeFactory: () => runtime,
      })).rejects.toMatchObject({ code: "EADDRINUSE" });
      expect(close).toHaveBeenCalledTimes(1);
    } finally {
      await new Promise<void>((resolve, reject) => {
        blocker.close((error) => error ? reject(error) : resolve());
      });
    }
  });

  it("consumes delayed runtime cleanup rejection after HTTP listen failure timeout", async () => {
    const blocker = createHttpServer();
    await new Promise<void>((resolve, reject) => {
      blocker.once("error", reject);
      blocker.listen(0, "127.0.0.1", () => {
        blocker.off("error", reject);
        resolve();
      });
    });
    const port = (blocker.address() as AddressInfo).port;
    const logs: string[] = [];
    const unhandledRejections: unknown[] = [];
    const onUnhandledRejection = (error: unknown) => unhandledRejections.push(error);
    const runtime: CampaignOsApiRuntime = {
      close: vi.fn(() => new Promise<void>((_resolve, reject) => {
        setTimeout(() => reject(new Error("postgres://unsafe-cleanup-value")), 20);
      })),
      handle: async () => response,
    };

    process.on("unhandledRejection", onUnhandledRejection);
    try {
      await expect(startCampaignOsApiServer({
        logger: {
          error: (message?: unknown) => logs.push(String(message)),
          log: () => undefined,
        },
        port,
        runtimeFactory: () => runtime,
        shutdownTimeoutMs: 5,
      })).rejects.toMatchObject({ code: "EADDRINUSE" });
      await new Promise((resolve) => setTimeout(resolve, 30));

      expect(unhandledRejections).toEqual([]);
      expect(logs.join("\n")).toContain("startup_cleanup_failed");
      expect(logs.join("\n")).not.toContain("unsafe-cleanup-value");
    } finally {
      process.off("unhandledRejection", onUnhandledRejection);
      await new Promise<void>((resolve, reject) => {
        blocker.close((error) => error ? reject(error) : resolve());
      });
    }
  });

  it("starts runtime shutdown before an active HTTP request drains", async () => {
    const order: string[] = [];
    let releaseRequest: (() => void) | undefined;
    let markEntered: (() => void) | undefined;
    const requestEntered = new Promise<void>((resolve) => {
      markEntered = resolve;
    });
    const requestReleased = new Promise<void>((resolve) => {
      releaseRequest = resolve;
    });
    const close = vi.fn(async () => {
      order.push("runtime.close.start");
      await requestReleased;
      order.push("runtime.close.end");
    });
    const runtime: CampaignOsApiRuntime = {
      close,
      handle: async () => {
        order.push("request.start");
        markEntered?.();
        await requestReleased;
        order.push("request.end");
        return response;
      },
    };
    const server = await startCampaignOsApiServer({
      logger: false,
      port: 0,
      runtimeFactory: () => runtime,
      shutdownTimeoutMs: 1_000,
    });
    server.server.once("close", () => order.push("http.close"));
    const request = fetch(`${server.url}/api/health`);
    await requestEntered;

    const firstStop = server.stop();
    const secondStop = server.stop();
    expect(firstStop).toBe(secondStop);
    expect(close).toHaveBeenCalledTimes(1);
    expect(order).toEqual(["request.start", "runtime.close.start"]);

    releaseRequest?.();
    await request;
    await firstStop;

    expect(close).toHaveBeenCalledTimes(1);
    expect(order[0]).toBe("request.start");
    expect(order[1]).toBe("runtime.close.start");
    expect(order).toEqual(expect.arrayContaining([
      "request.end",
      "runtime.close.end",
      "http.close",
    ]));
    expect(order.indexOf("runtime.close.start")).toBeLessThan(order.indexOf("request.end"));
    expect(order.indexOf("runtime.close.start")).toBeLessThan(order.indexOf("http.close"));
  });

  it("releases HTTP connections and runtime resources within the acceptance budget", async () => {
    const close = vi.fn(async () => undefined);
    const handle = vi.fn(async () => response);
    const runtime: CampaignOsApiRuntime = { close, handle };
    const server = await startCampaignOsApiServer({
      logger: false,
      port: 0,
      runtimeFactory: () => runtime,
      shutdownTimeoutMs: 10_000,
    });

    const responses = await Promise.all(
      Array.from({ length: 32 }, () => fetch(`${server.url}/api/health`)),
    );
    await Promise.all(responses.map((result) => result.json()));
    const startedAt = performance.now();

    await server.stop();

    const shutdownDurationMs = performance.now() - startedAt;
    const openConnectionCount = await new Promise<number>((resolve, reject) => {
      server.server.getConnections((error, count) => error ? reject(error) : resolve(count));
    });

    expect(shutdownDurationMs).toBeLessThanOrEqual(10_000);
    expect(handle).toHaveBeenCalledTimes(32);
    expect(close).toHaveBeenCalledTimes(1);
    expect(openConnectionCount).toBe(0);
    expect(server.server.address()).toBeNull();
    expect(server.server.listening).toBe(false);
    expect(server.getReadiness()).toMatchObject({
      liveness: { live: false },
      shutdownState: {
        activeRequestCount: 0,
        closedAt: expect.any(String),
        state: "stopped",
      },
      status: "stopped",
    });
  });

  it("rejects pipelined requests after stop starts without dispatching runtime work", async () => {
    let releaseRequest: (() => void) | undefined;
    let markEntered: (() => void) | undefined;
    const requestEntered = new Promise<void>((resolve) => {
      markEntered = resolve;
    });
    const requestReleased = new Promise<void>((resolve) => {
      releaseRequest = resolve;
    });
    const handle = vi.fn(async () => {
      markEntered?.();
      await requestReleased;
      return response;
    });
    const runtime: CampaignOsApiRuntime = {
      close: vi.fn(async () => undefined),
      handle,
    };
    const server = await startCampaignOsApiServer({
      logger: false,
      port: 0,
      runtimeFactory: () => runtime,
      shutdownTimeoutMs: 1_000,
    });
    const address = server.server.address() as AddressInfo;
    const socket = connect(address.port, "127.0.0.1");
    const socketErrors: string[] = [];
    const socketClosed = new Promise<void>((resolve) => socket.once("close", resolve));
    let markFirstResponseReceived: (() => void) | undefined;
    const firstResponseReceived = new Promise<void>((resolve) => {
      markFirstResponseReceived = resolve;
    });
    let received = "";

    socket.setEncoding("utf8");
    socket.on("data", (chunk: string) => {
      received += chunk;
      if (received.includes("HTTP/1.1 200")) {
        markFirstResponseReceived?.();
      }
    });
    socket.on("error", (error) => socketErrors.push(error.message));
    await new Promise<void>((resolve) => socket.once("connect", resolve));
    const waitForSignal = async (signal: Promise<void>, label: string, timeoutMs: number) => {
      let timeout: ReturnType<typeof setTimeout> | undefined;

      try {
        await Promise.race([
          signal,
          new Promise<never>((_, reject) => {
            timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${label}`)), timeoutMs);
          }),
        ]);
      } finally {
        clearTimeout(timeout);
      }
    };
    const writeRequestOrClose = (lines: readonly string[]) => new Promise<void>((resolve, reject) => {
      let settled = false;
      const settle = (error?: Error | null) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        socket.off("close", onClose);
        error ? reject(error) : resolve();
      };
      const onClose = () => settle();
      const timeout = setTimeout(
        () => settle(new Error("Timed out waiting for the pipelined request to flush or close")),
        2_000,
      );

      socket.once("close", onClose);
      socket.write(lines.join("\r\n"), (error) => settle(error));
    });
    socket.write([
      "GET /api/health HTTP/1.1",
      `Host: 127.0.0.1:${address.port}`,
      "Connection: keep-alive",
      "",
      "",
    ].join("\r\n"));
    await waitForSignal(requestEntered, "the initial request to enter the runtime", 2_000);

    const stopping = server.stop();
    const pipelinedWriteSettled = (() => {
      try {
        return writeRequestOrClose([
          "GET /api/contracts HTTP/1.1",
          `Host: 127.0.0.1:${address.port}`,
          "Connection: close",
          "",
          "",
        ]);
      } finally {
        releaseRequest?.();
      }
    })();

    await waitForSignal(stopping, "the server to stop", 2_000);
    await waitForSignal(pipelinedWriteSettled, "the pipelined write to settle", 2_000);
    await waitForSignal(firstResponseReceived, "the initial response", 2_000);
    socket.destroy();
    await waitForSignal(socketClosed, "the pipelined socket to close", 1_000);

    const responseStatuses = Array.from(
      received.matchAll(/(?:^|\r\n)HTTP\/1\.1 (\d{3}) [^\r\n]*\r\n/g),
      ([, status]) => Number(status),
    );

    expect(handle).toHaveBeenCalledTimes(1);
    expect([[200], [200, 503]]).toContainEqual(responseStatuses);
    if (responseStatuses.includes(503)) {
      expect(received).toContain("PERSISTENCE_UNAVAILABLE");
    }
    expect(socketErrors).toEqual([]);
  }, 15_000);

  it("returns a safe 500 when runtime response serialization fails", async () => {
    const runtime: CampaignOsApiRuntime = {
      close: vi.fn(async () => undefined),
      handle: async () => ({
        ...response,
        body: { value: 1n } as unknown as ApiRuntimeResponse["body"],
      }),
    };
    const server = await startCampaignOsApiServer({
      logger: false,
      port: 0,
      runtimeFactory: () => runtime,
    });

    try {
      const result = await fetch(`${server.url}/api/campaigns`);
      const body = await result.json() as { error?: { code?: string }; ok?: boolean };

      expect(result.status).toBe(500);
      expect(body).toMatchObject({
        error: { code: "INTERNAL_RUNTIME_ERROR" },
        ok: false,
      });
    } finally {
      await server.stop();
    }
  });

  it("handles an aborted partial request during shutdown without an unhandled rejection", async () => {
    const errors: string[] = [];
    const runtime: CampaignOsApiRuntime = {
      close: vi.fn(async () => undefined),
      handle: async () => response,
    };
    const server = await startCampaignOsApiServer({
      logger: {
        error: (message?: unknown) => errors.push(String(message)),
        log: () => undefined,
      },
      port: 0,
      runtimeFactory: () => runtime,
      shutdownTimeoutMs: 25,
    });
    const address = server.server.address() as AddressInfo;
    const socket = connect(address.port, "127.0.0.1");
    await new Promise<void>((resolve, reject) => {
      socket.once("connect", resolve);
      socket.once("error", reject);
    });
    socket.write([
      "POST /api/campaigns HTTP/1.1",
      `Host: 127.0.0.1:${address.port}`,
      "Content-Type: application/json",
      "Content-Length: 100",
      "Connection: keep-alive",
      "",
      "{",
    ].join("\r\n"));

    for (let attempt = 0; attempt < 20 && server.getReadiness().shutdownState.activeRequestCount === 0; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    expect(server.getReadiness().shutdownState.activeRequestCount).toBe(1);
    await expect(server.stop()).rejects.toMatchObject({ code: "API_SERVER_SHUTDOWN_TIMEOUT" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(errors.join("\n")).toContain("code=API_SERVER_REQUEST_FAILED");
    expect(errors.join("\n")).not.toContain("Content-Length");
    socket.destroy();
  });

  it("returns and logs a safe deterministic shutdown error", async () => {
    const logs: string[] = [];
    const runtime: CampaignOsApiRuntime = {
      close: vi.fn(async () => {
        throw new Error("postgres://runtime-user:runtime-password@db.internal/campaign_os");
      }),
      handle: async () => response,
    };
    const server = await startCampaignOsApiServer({
      logger: {
        error: (message?: unknown) => logs.push(String(message)),
        log: () => undefined,
      },
      port: 0,
      runtimeFactory: () => runtime,
    });

    const firstStop = server.stop();
    const secondStop = server.stop();

    expect(firstStop).toBe(secondStop);
    await expect(firstStop).rejects.toMatchObject({
      code: "API_SERVER_RUNTIME_CLOSE_FAILED",
      traceId: expect.any(String),
    });
    expect(logs.join("\n")).toContain("API_SERVER_RUNTIME_CLOSE_FAILED");
    expect(logs.join("\n")).not.toContain("runtime-password");
    expect(logs.join("\n")).not.toContain("db.internal");
  });
});
