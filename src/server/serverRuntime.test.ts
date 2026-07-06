import { describe, expect, it } from "vitest";
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
      preflightHandledBeforeRuntime: true,
    });
    expect(contract.corsPolicy.allowedOrigins).toEqual(
      expect.arrayContaining(["http://localhost:5173", "http://127.0.0.1:5173"]),
    );
    expect(contract.shutdown.shutdownTimeoutMs).toBe(5_000);
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
