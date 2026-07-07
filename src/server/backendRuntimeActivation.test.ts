import { describe, expect, it } from "vitest";
import packageJson from "../../package.json";
import {
  createBackendRuntimeActivationContract,
  productionRuntimeDependencyBlockerIds,
  runtimeActivationEnvironmentKeys,
  runtimeActivationConfigKeys,
} from "./backendRuntimeActivation";
import { resolveApiServerRuntimeContract } from "./serverRuntime";

const secretFragments = [
  "bearer sample-token",
  "https://scheduler.invalid/scheduler-pass",
  "https://queue.invalid/queue-secret",
  "https://store.invalid/token=idempotency-secret",
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

describe("backend runtime activation contract", () => {
  it("publishes stable runtime activation and package command metadata", () => {
    const runtime = resolveApiServerRuntimeContract({
      env: {},
      startedAt: "2026-07-07T05:54:00.000Z",
    });
    const activation = createBackendRuntimeActivationContract({ runtime });

    expect(activation).toMatchObject({
      id: "campaign-os-backend-runtime-activation",
      entrypointPath: "src/server/server.ts",
      healthEndpoint: "/api/health",
      contractsEndpoint: "/api/contracts",
      liveSideEffectsEnabled: false,
      packageCommands: {
        smoke: "npm run server:smoke",
        start: "npm run server:start",
      },
      productionReady: false,
      profileId: "local-review",
      runtimeTarget: "node-http-api-service",
      runtimeVersion: "0.2.0-local",
      supportMode: "local_seeded",
    });
    expect(activation.deploymentHandoff).toMatchObject({
      contractsEndpoint: "/api/contracts",
      healthEndpoint: "/api/health",
      runtimeTarget: "api_service",
      startCommand: "npm run server:start",
      smokeCommand: "npm run server:smoke",
    });
    expect(activation.tracePolicy).toEqual({
      failureEnvelopeTraceId: true,
      startupLogIncludesTracePolicy: true,
      successEnvelopeTraceId: true,
      traceHeaderName: "x-campaign-os-trace-id",
    });
  });

  it("keeps package scripts discoverable without removing server:dev", () => {
    expect(packageJson.scripts).toMatchObject({
      "server:dev": "vite-node src/server/server.ts --listen",
      "server:smoke": "vite-node src/server/backendRuntimeSmoke.ts --run",
      "server:start": "vite-node src/server/server.ts --listen",
    });
  });

  it("publishes name-only config inventory with no raw values", () => {
    const runtime = resolveApiServerRuntimeContract({
      env: {
        AUTHORIZATION: "Bearer sample-token",
        CAMPAIGN_OS_AUTH_SECRET: "super-secret",
        CAMPAIGN_OS_DATABASE_URL: "postgres://real-user:real-db-password@db.invalid/campaign-os",
        CAMPAIGN_OS_PROVIDER_REGISTRY_URL: "https://providers.invalid/object-key-sample",
      },
    });
    const activation = createBackendRuntimeActivationContract({ runtime });

    expect(runtimeActivationConfigKeys.map((item) => item.key)).toEqual(
      expect.arrayContaining([
        "CAMPAIGN_OS_API_HOST",
        "CAMPAIGN_OS_API_PORT",
        "CAMPAIGN_OS_API_CORS_ORIGINS",
        "CAMPAIGN_OS_BACKEND_PROFILE",
        "CAMPAIGN_OS_DATABASE_URL",
        "CAMPAIGN_OS_AUTH_SECRET",
        "CAMPAIGN_OS_PROVIDER_REGISTRY_URL",
        "CAMPAIGN_OS_WORKER_QUEUE_URL",
        "CAMPAIGN_OS_SCHEDULER_ENDPOINT",
        "CAMPAIGN_OS_WORKER_RETRY_POLICY",
        "CAMPAIGN_OS_IDEMPOTENCY_STORE_URL",
        "CAMPAIGN_OS_WORKER_LEASE_STORE_URL",
        "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL",
        "CAMPAIGN_OS_DEGRADATION_POLICY",
        "CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT",
      ]),
    );
    expect(runtimeActivationEnvironmentKeys.map((item) => item.key)).toEqual(
      expect.arrayContaining([
        "CAMPAIGN_OS_WORKER_QUEUE_URL",
        "CAMPAIGN_OS_SCHEDULER_ENDPOINT",
        "CAMPAIGN_OS_WORKER_RETRY_POLICY",
        "CAMPAIGN_OS_IDEMPOTENCY_STORE_URL",
        "CAMPAIGN_OS_WORKER_LEASE_STORE_URL",
        "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL",
        "CAMPAIGN_OS_DEGRADATION_POLICY",
      ]),
    );
    expect(activation.deploymentHandoff.environmentKeys).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "database",
          key: "CAMPAIGN_OS_DATABASE_URL",
          redacted: true,
          status: "blocked",
        }),
        expect.objectContaining({
          category: "auth",
          key: "CAMPAIGN_OS_AUTH_SECRET",
          redacted: true,
          status: "blocked",
        }),
        expect.objectContaining({
          category: "worker",
          key: "CAMPAIGN_OS_WORKER_QUEUE_URL",
          redacted: true,
          required: true,
          status: "deferred",
        }),
        expect.objectContaining({
          category: "scheduler",
          key: "CAMPAIGN_OS_SCHEDULER_ENDPOINT",
          redacted: true,
          required: true,
          status: "deferred",
        }),
        expect.objectContaining({
          category: "worker",
          key: "CAMPAIGN_OS_IDEMPOTENCY_STORE_URL",
          redacted: true,
          required: true,
          status: "blocked",
        }),
        expect.objectContaining({
          category: "observability",
          key: "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL",
          redacted: true,
          required: true,
          status: "deferred",
        }),
      ]),
    );
    expectNoSecretLeak(activation);
  });

  it("keeps production-required blocked across all live dependency groups", () => {
    const runtime = resolveApiServerRuntimeContract({
      env: {
        CAMPAIGN_OS_BACKEND_PROFILE: "production-required",
      },
    });
    const activation = createBackendRuntimeActivationContract({ runtime });

    expect(runtime.valid).toBe(false);
    expect(activation.profileId).toBe("production-required");
    expect(activation.productionReady).toBe(false);
    expect(activation.deploymentHandoff.requiredBeforeProduction).toEqual(
      expect.arrayContaining(productionRuntimeDependencyBlockerIds),
    );
    expect(activation.productionDependencyBlockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ area: "database", id: "live-database-driver", status: "blocked" }),
        expect.objectContaining({ area: "database", id: "migration-executor", status: "blocked" }),
        expect.objectContaining({ area: "auth", id: "wallet-proof-verifier", status: "blocked" }),
        expect.objectContaining({ area: "auth", id: "session-issuer", status: "blocked" }),
        expect.objectContaining({ area: "provider", id: "provider-adapters", status: "deferred" }),
        expect.objectContaining({ area: "worker", id: "worker-queue", status: "deferred" }),
        expect.objectContaining({ area: "scheduler", id: "scheduler-endpoint", status: "deferred" }),
        expect.objectContaining({ area: "scheduler", id: "retry-backoff-policy", status: "blocked" }),
        expect.objectContaining({ area: "worker", id: "idempotency-store", status: "blocked" }),
        expect.objectContaining({ area: "worker", id: "worker-lease", status: "blocked" }),
        expect.objectContaining({ area: "observability", id: "observability", status: "deferred" }),
        expect.objectContaining({ area: "provider", id: "provider-handoff", status: "deferred" }),
        expect.objectContaining({ area: "contract", id: "contract-writer", status: "blocked" }),
        expect.objectContaining({ area: "storage", id: "object-storage", status: "deferred" }),
        expect.objectContaining({ area: "observability", id: "observability-exporter", status: "deferred" }),
        expect.objectContaining({ area: "analytics", id: "analytics-ingestion", status: "deferred" }),
        expect.objectContaining({ area: "reward", id: "reward-custody", status: "blocked" }),
        expect.objectContaining({ area: "reward", id: "reward-distribution", status: "blocked" }),
      ]),
    );
    expectNoSecretLeak(activation);
  });
});
