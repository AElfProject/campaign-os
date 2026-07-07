import { describe, expect, it } from "vitest";
import packageJson from "../../package.json";
import {
  createBackendRuntimeActivationContract,
  productionRuntimeDependencyBlockerIds,
  runtimeActivationEnvironmentKeys,
  runtimeActivationConfigKeys,
} from "./backendRuntimeActivation";
import { queueProviderAdapterProductionPreconditions } from "./queueProviderAdapter";
import { schedulerRuntimeProductionPreconditions } from "./schedulerRuntime";
import { resolveApiServerRuntimeContract } from "./serverRuntime";
import { workerLeaseStoreProductionPreconditions } from "./workerLeaseStore";

const secretFragments = [
  "bearer sample-token",
  "https://scheduler.invalid/scheduler-pass",
  "https://lease.invalid/lease-secret",
  "metadata-provider-secret",
  "operator-policy-secret",
  "https://queue.invalid/queue-secret",
  "https://queue.invalid/dead-letter?token=queue-secret",
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
        CAMPAIGN_OS_SCHEDULER_LEASE_STORE_URL: "https://lease.invalid/lease-secret",
        CAMPAIGN_OS_SCHEDULER_PROVIDER: "metadata-provider-secret",
        CAMPAIGN_OS_OPERATOR_AUTHORIZATION_POLICY: "operator-policy-secret",
      },
    });
    const activation = createBackendRuntimeActivationContract({ runtime });
    const schedulerRuntimeConfigKeys = [
      ...new Set(schedulerRuntimeProductionPreconditions.flatMap((precondition) => precondition.requiredConfigKeys)),
    ];
    const workerLeaseStoreConfigKeys = [
      ...new Set(workerLeaseStoreProductionPreconditions.flatMap((precondition) => precondition.requiredConfigKeys)),
    ];
    const queueProviderAdapterConfigKeys = [
      ...new Set(queueProviderAdapterProductionPreconditions.flatMap((precondition) => precondition.requiredConfigKeys)),
    ];

    expect(runtimeActivationConfigKeys.map((item) => item.key)).toEqual(
      expect.arrayContaining([
        "CAMPAIGN_OS_API_HOST",
        "CAMPAIGN_OS_API_PORT",
        "CAMPAIGN_OS_API_CORS_ORIGINS",
        "CAMPAIGN_OS_BACKEND_PROFILE",
        "CAMPAIGN_OS_DATABASE_URL",
        "CAMPAIGN_OS_AUTH_SECRET",
        "CAMPAIGN_OS_QUEUE_PROVIDER",
        "CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT",
        "CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS",
        "CAMPAIGN_OS_PROVIDER_REGISTRY_URL",
        "CAMPAIGN_OS_SCHEDULER_PROVIDER",
        "CAMPAIGN_OS_WORKER_QUEUE_URL",
        "CAMPAIGN_OS_SCHEDULER_ENDPOINT",
        "CAMPAIGN_OS_SCHEDULER_LEASE_STORE_URL",
        "CAMPAIGN_OS_WORKER_RETRY_POLICY",
        "CAMPAIGN_OS_IDEMPOTENCY_STORE_URL",
        "CAMPAIGN_OS_WORKER_LEASE_STORE",
        "CAMPAIGN_OS_WORKER_LEASE_STORE_URL",
        "CAMPAIGN_OS_WORKER_LEASE_CREDENTIALS",
        "CAMPAIGN_OS_CLOCK_SOURCE",
        "CAMPAIGN_OS_WORKER_LEASE_HEARTBEAT_SECONDS",
        "CAMPAIGN_OS_WORKER_LEASE_TTL_SECONDS",
        "CAMPAIGN_OS_WORKER_LEASE_RELEASE_POLICY",
        "CAMPAIGN_OS_WORKER_LEASE_STALE_RECOVERY_POLICY",
        "CAMPAIGN_OS_WORKER_LEASE_FENCING_POLICY",
        "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL",
        "CAMPAIGN_OS_OPERATOR_AUTHORIZATION_POLICY",
        "CAMPAIGN_OS_DEGRADATION_POLICY",
        "CAMPAIGN_OS_DEAD_LETTER_QUEUE",
        "CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT",
      ]),
    );
    expect(runtimeActivationEnvironmentKeys.map((item) => item.key)).toEqual(
      expect.arrayContaining([
        "CAMPAIGN_OS_WORKER_QUEUE_URL",
        "CAMPAIGN_OS_SCHEDULER_PROVIDER",
        "CAMPAIGN_OS_SCHEDULER_ENDPOINT",
        "CAMPAIGN_OS_SCHEDULER_LEASE_STORE_URL",
        "CAMPAIGN_OS_QUEUE_PROVIDER",
        "CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT",
        "CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS",
        "CAMPAIGN_OS_WORKER_RETRY_POLICY",
        "CAMPAIGN_OS_IDEMPOTENCY_STORE_URL",
        "CAMPAIGN_OS_WORKER_LEASE_STORE",
        "CAMPAIGN_OS_WORKER_LEASE_STORE_URL",
        "CAMPAIGN_OS_WORKER_LEASE_CREDENTIALS",
        "CAMPAIGN_OS_CLOCK_SOURCE",
        "CAMPAIGN_OS_WORKER_LEASE_HEARTBEAT_SECONDS",
        "CAMPAIGN_OS_WORKER_LEASE_TTL_SECONDS",
        "CAMPAIGN_OS_WORKER_LEASE_RELEASE_POLICY",
        "CAMPAIGN_OS_WORKER_LEASE_STALE_RECOVERY_POLICY",
        "CAMPAIGN_OS_WORKER_LEASE_FENCING_POLICY",
        "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL",
        "CAMPAIGN_OS_OPERATOR_AUTHORIZATION_POLICY",
        "CAMPAIGN_OS_DEGRADATION_POLICY",
        "CAMPAIGN_OS_DEAD_LETTER_QUEUE",
      ]),
    );
    for (const schedulerRuntimeConfigKey of schedulerRuntimeConfigKeys) {
      expect(activation.deploymentHandoff.environmentKeys).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: schedulerRuntimeConfigKey,
            redacted: true,
            required: true,
            requiredFor: "production-required",
          }),
        ]),
      );
    }
    for (const workerLeaseStoreConfigKey of workerLeaseStoreConfigKeys) {
      expect(activation.deploymentHandoff.environmentKeys).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: workerLeaseStoreConfigKey,
            redacted: true,
            required: true,
            requiredFor: "production-required",
          }),
        ]),
      );
    }
    for (const queueProviderAdapterConfigKey of queueProviderAdapterConfigKeys) {
      expect(activation.deploymentHandoff.environmentKeys).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: queueProviderAdapterConfigKey,
            redacted: true,
            required: true,
            requiredFor: "production-required",
          }),
        ]),
      );
    }
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
          category: "provider",
          key: "CAMPAIGN_OS_QUEUE_PROVIDER",
          redacted: true,
          required: true,
          status: "blocked",
        }),
        expect.objectContaining({
          category: "provider",
          key: "CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT",
          redacted: true,
          required: true,
          status: "blocked",
        }),
        expect.objectContaining({
          category: "provider",
          key: "CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS",
          redacted: true,
          required: true,
          status: "blocked",
        }),
        expect.objectContaining({
          category: "queue",
          key: "CAMPAIGN_OS_WORKER_QUEUE_URL",
          redacted: true,
          required: true,
          status: "blocked",
        }),
        expect.objectContaining({
          category: "scheduler",
          key: "CAMPAIGN_OS_SCHEDULER_ENDPOINT",
          redacted: true,
          required: true,
          status: "blocked",
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
        expect.objectContaining({
          category: "queue",
          key: "CAMPAIGN_OS_DEAD_LETTER_QUEUE",
          redacted: true,
          required: true,
          status: "blocked",
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
        expect.objectContaining({ area: "scheduler", id: "scheduler-runtime-scheduler-provider", status: "blocked" }),
        expect.objectContaining({ area: "scheduler", id: "scheduler-runtime-scheduler-endpoint", status: "blocked" }),
        expect.objectContaining({ area: "scheduler", id: "scheduler-runtime-scheduler-clock-lease", status: "blocked" }),
        expect.objectContaining({ area: "scheduler", id: "scheduler-runtime-scheduler-idempotency-store", status: "blocked" }),
        expect.objectContaining({ area: "queue", id: "scheduler-runtime-scheduler-queue-handoff", status: "blocked" }),
        expect.objectContaining({ area: "observability", id: "scheduler-runtime-scheduler-observability", status: "deferred" }),
        expect.objectContaining({ area: "auth", id: "scheduler-runtime-scheduler-operator-authorization", status: "blocked" }),
        expect.objectContaining({ area: "queue", id: "scheduler-runtime-scheduler-dead-letter", status: "blocked" }),
        expect.objectContaining({ area: "queue", id: "queue-provider", status: "blocked" }),
        expect.objectContaining({ area: "worker", id: "worker-queue", status: "deferred" }),
        expect.objectContaining({ area: "queue", id: "worker-queue-url", status: "blocked" }),
        expect.objectContaining({ area: "scheduler", id: "scheduler-endpoint", status: "deferred" }),
        expect.objectContaining({ area: "scheduler", id: "retry-backoff-policy", status: "blocked" }),
        expect.objectContaining({ area: "scheduler", id: "queue-retry-policy", status: "blocked" }),
        expect.objectContaining({ area: "worker", id: "idempotency-store", status: "blocked" }),
        expect.objectContaining({ area: "worker", id: "queue-idempotency-store", status: "blocked" }),
        expect.objectContaining({ area: "worker", id: "worker-lease", status: "blocked" }),
        expect.objectContaining({ area: "worker", id: "worker-lease-store-worker-lease-store-selection", status: "blocked" }),
        expect.objectContaining({ area: "worker", id: "worker-lease-store-worker-lease-store-endpoint", status: "blocked" }),
        expect.objectContaining({ area: "worker", id: "worker-lease-store-worker-lease-store-credentials", status: "blocked" }),
        expect.objectContaining({ area: "scheduler", id: "worker-lease-store-worker-lease-clock-source", status: "blocked" }),
        expect.objectContaining({ area: "worker", id: "worker-lease-store-worker-lease-heartbeat-policy", status: "blocked" }),
        expect.objectContaining({ area: "worker", id: "worker-lease-store-worker-lease-ttl-policy", status: "blocked" }),
        expect.objectContaining({ area: "worker", id: "worker-lease-store-worker-lease-release-policy", status: "blocked" }),
        expect.objectContaining({ area: "worker", id: "worker-lease-store-worker-lease-stale-recovery", status: "blocked" }),
        expect.objectContaining({ area: "worker", id: "worker-lease-store-worker-lease-fencing-policy", status: "blocked" }),
        expect.objectContaining({ area: "worker", id: "worker-lease-store-worker-lease-idempotency-coordination", status: "blocked" }),
        expect.objectContaining({ area: "observability", id: "worker-lease-store-worker-lease-observability", status: "deferred" }),
        expect.objectContaining({ area: "worker", id: "queue-worker-lease", status: "blocked" }),
        expect.objectContaining({ area: "observability", id: "observability", status: "deferred" }),
        expect.objectContaining({ area: "observability", id: "queue-observability", status: "deferred" }),
        expect.objectContaining({ area: "provider", id: "provider-handoff", status: "deferred" }),
        expect.objectContaining({ area: "provider", id: "queue-provider-handoff", status: "deferred" }),
        expect.objectContaining({ area: "queue", id: "queue-dead-letter", status: "blocked" }),
        expect.objectContaining({ area: "provider", id: "queue-provider-adapter-queue-provider-selection", status: "blocked" }),
        expect.objectContaining({ area: "provider", id: "queue-provider-adapter-queue-provider-endpoint", status: "blocked" }),
        expect.objectContaining({ area: "provider", id: "queue-provider-adapter-queue-provider-credentials", status: "blocked" }),
        expect.objectContaining({ area: "queue", id: "queue-provider-adapter-queue-provider-worker-queue-url", status: "blocked" }),
        expect.objectContaining({ area: "contract", id: "contract-writer", status: "blocked" }),
        expect.objectContaining({ area: "storage", id: "object-storage", status: "deferred" }),
        expect.objectContaining({ area: "observability", id: "observability-exporter", status: "deferred" }),
        expect.objectContaining({ area: "analytics", id: "analytics-ingestion", status: "deferred" }),
        expect.objectContaining({ area: "reward", id: "reward-custody", status: "blocked" }),
        expect.objectContaining({ area: "reward", id: "reward-distribution", status: "blocked" }),
      ]),
    );
    expect(activation.productionDependencyBlockers).toEqual(
      expect.arrayContaining(
        schedulerRuntimeProductionPreconditions.map((precondition) =>
          expect.objectContaining({
            attachPoint: "src/server/schedulerRuntime.ts",
            id: `scheduler-runtime-${precondition.id}`,
            requiredBeforeProduction: true,
            status: precondition.status,
          }),
        ),
      ),
    );
    expect(activation.productionDependencyBlockers).toEqual(
      expect.arrayContaining(
        workerLeaseStoreProductionPreconditions.map((precondition) =>
          expect.objectContaining({
            attachPoint: "src/server/workerLeaseStore.ts",
            id: `worker-lease-store-${precondition.id}`,
            requiredBeforeProduction: true,
            status: precondition.status,
          }),
        ),
      ),
    );
    expect(activation.productionDependencyBlockers).toEqual(
      expect.arrayContaining(
        queueProviderAdapterProductionPreconditions.map((precondition) =>
          expect.objectContaining({
            attachPoint: "src/server/queueProviderAdapter.ts",
            id: `queue-provider-adapter-${precondition.id}`,
            requiredBeforeProduction: true,
            status: precondition.status,
          }),
        ),
      ),
    );
    expectNoSecretLeak(activation);
  });
});
